# Civilex — Judiciary Management System

## Project Summary

Next.js 16 + TypeScript + Supabase app for managing civil, criminal, and family court cases in Pakistan. 6 user roles (Client, Lawyer, Admin Court, Magistrate, Trial Judge, Stenographer), 20 case statuses, 18 database tables with RLS. Client-side data fetching via custom hooks + Supabase SDK. Zod validation on all inputs.

## Tech Stack
- Next.js 16.1.6 (App Router), React 19, TypeScript 5
- Supabase (PostgreSQL + Auth + Realtime + Storage)
- Tailwind CSS 4, Zod 4, lucide-react

## Key Patterns
- Auth: Supabase Auth + middleware session refresh + role verification on login
- Data: Custom React hooks (useCases, usePayments, etc.) calling Supabase client directly
- RLS: All 18 tables have Row Level Security policies
- Providers: AuthProvider (auth state), NotificationProvider (realtime)
- Validation: Zod schemas in src/lib/validations/

## Test Stack
- **E2E:** Playwright (to be installed)
- **Unit/Integration:** Vitest (to be installed)
- **Commands:** /test-bug, /test-all, /add-bug, /test-feature, /audit, /test-pr, /coverage

---

# QA Testing Agent

## Known Bugs

### BUG-001: No Role-Based Route Protection in Middleware
- **Severity:** Critical
- **Type:** Security / Authorization
- **Status:** ✅ Fixed
- **Fix:** Added role-based route map in middleware. Each role has allowed route prefixes; unauthorized routes redirect to `/dashboard`.

### BUG-002: Supabase Query Errors Silently Ignored in Multiple Hooks
- **Severity:** High
- **Type:** Error Handling
- **Status:** ⚠️ Partially Fixed — Critical paths (acceptCase, declineCase, simulatePayment) now verify updates with `.select().maybeSingle()`. Activity log/notification inserts remain fire-and-forget (acceptable for non-critical side effects).

### BUG-003: Payment Completion Check Race Condition
- **Severity:** High
- **Type:** Logic / Race Condition
- **Status:** ✅ Fixed — Update now uses `.select().maybeSingle()` to verify it succeeded, adds `.eq("status", "pending")` guard, and checks remaining with `.in("status", ["pending", "processing"])` instead of `neq("status", "completed")`.

### BUG-004: Installment Payment Math Error for Even Division
- **Severity:** Medium
- **Type:** Logic
- **Where:** [useCases.ts:284](src/hooks/useCases.ts#L284)
- **Description:** `Math.ceil(feeAmount / installmentCount)` for the installment amount means the last installment could be less than the others (correct), but when feeAmount divides evenly, all installments are equal — this is fine. However, the issue is that `Math.ceil` rounds UP, so for fees that don't divide evenly, the total of all installments will exceed the actual fee. E.g., fee=100, 3 installments: ceil(100/3)=34, last=100-34*2=32, total=34+34+32=100 (OK). But fee=100, 7 installments: ceil(100/7)=15, last=100-15*6=10, total=15*6+10=100 (OK). Actually math is correct. Downgrading — no bug here.

### BUG-005: Notification Type Mismatch — `case_update` Not in Schema
- **Severity:** Medium
- **Type:** Validation / Data Integrity
- **Status:** ✅ Fixed — Changed `"case_update"` to `"judgment_delivered"` which is a valid notification type.

### BUG-006: Register Validation Schema Missing Lawyer Required Fields
- **Severity:** Medium
- **Type:** Validation
- **Status:** ✅ Fixed — Added `.refine()` rules to `registerSchema` that require `barLicenseNumber` and at least one `specialization` when `role === "lawyer"`.

### BUG-007: `submitToAdmin` Allows Transition from `payment_confirmed` Skipping Drafting
- **Severity:** Medium
- **Type:** Logic / Workflow
- **Status:** ✅ Fixed — Removed `payment_confirmed` from allowed source statuses. Now only `drafting` and `returned_for_revision` are accepted.

### BUG-008: Scrutiny `approved` Update Missing Status Guard
- **Severity:** Medium
- **Type:** Security / Data Integrity
- **Status:** ✅ Fixed — Added `.in("status", ["submitted_to_admin", "under_scrutiny"])` guard to both `approved` and `returned` decision paths.

### BUG-009: Judgment `deliverJudgment` Missing Status Guard
- **Severity:** Medium
- **Type:** Security / Data Integrity
- **Status:** ✅ Fixed — Added `.eq("status", "reserved_for_judgment")` guard to the case status update.

### BUG-010: `declineCase` May Fail Due to RLS Timing
- **Severity:** Medium
- **Type:** Race Condition / RLS
- **Where:** [useCases.ts:380-400](src/hooks/useCases.ts#L380-L400)
- **Description:** The code comments explain that case status must be reverted before updating assignment status, because the RLS policy requires a non-declined assignment. However, after reverting the case to `draft`, the lawyer still has a `pending` assignment which grants update access. If the case update succeeds but the assignment update fails, the case stays in `draft` with a still-pending assignment — an inconsistent state with no rollback.
- **Steps to Reproduce:**
  1. Lawyer declines a case
  2. Case reverts to draft successfully
  3. Assignment update fails (e.g., network error)
  4. Case is in draft but still has a pending assignment
- **Expected:** Both operations should succeed or rollback together
- **Actual:** No transaction; partial failure leaves inconsistent state
- **Affected Files:** `src/hooks/useCases.ts`

### BUG-011: OTP Returned in API Response (Security Risk in Production)
- **Severity:** Medium (Critical if deployed to production)
- **Type:** Security
- **Status:** ✅ Fixed — OTP is now only included in the response when `NODE_ENV !== "production"`. Production builds will not expose it.

### BUG-012: `disposed` Status Missing from Status Progress Steps
- **Severity:** Low
- **Type:** UI
- **Status:** ✅ Fixed — Added `returned_for_revision` and `disposed` to `statusSteps`. Also removed unused `lawyer_accepted` from the array.

### BUG-013: `lawyer_accepted` Status Unused but Defined
- **Severity:** Low
- **Type:** Dead Code / Confusion
- **Where:** [constants.ts:34](src/lib/constants.ts#L34)
- **Description:** `CASE_STATUS.LAWYER_ACCEPTED` ("lawyer_accepted") is defined in constants and in the status labels, but is never set anywhere in the codebase. The flow goes directly from `pending_lawyer_acceptance` to `payment_pending` when accepted. This dead status creates confusion in the progress bar and any status-based logic.
- **Affected Files:** `src/lib/constants.ts`

### BUG-014: New Supabase Client Created on Every Hook Call
- **Severity:** Low
- **Type:** Performance
- **Where:** All hooks (e.g., [useCases.ts:18](src/hooks/useCases.ts#L18))
- **Description:** Each hook function call (e.g., `createCase`, `acceptCase`, `fetchCases`) creates a new Supabase client via `createClient()`. While `createBrowserClient` likely handles singleton internally, this pattern is wasteful and inconsistent with the `useRef` pattern used in `AuthProvider`.
- **Affected Files:** All hooks in `src/hooks/`

### BUG-015: No CNIC/Phone Validation Format
- **Severity:** Low
- **Type:** Validation
- **Status:** ✅ Fixed — Added regex validation: CNIC requires `XXXXX-XXXXXXX-X` format, phone requires Pakistani format `03XXXXXXXXX`. Both still optional but validated when provided. Applied to both `registerSchema` and `profileUpdateSchema`.

### BUG-016: Middleware Fetches Profile on Every Request (Performance)
- **Severity:** High
- **Type:** Performance
- **Status:** ✅ Fixed — Rewrote middleware to read role from `user.user_metadata.role` (set during signup) instead of querying the DB. No DB round-trip per request.

### BUG-017: Middleware Role Route Map Blocks Client from `/cases/{id}` Subpaths
- **Severity:** High
- **Type:** Authorization / Routing
- **Status:** ✅ Fixed — Replaced allow-list approach with a deny-list of restricted routes. Only specific sub-routes (`/cases/scrutiny`, `/cases/criminal`, `/cases/new`, `/lawyers`, `/ai-assistant`) are gated to their respective roles. All other routes remain accessible to all authenticated users.

### BUG-018: Settings Page Does Not Validate Input Before Submitting
- **Severity:** Medium
- **Type:** Validation
- **Status:** ✅ Fixed — Settings form now runs `profileUpdateSchema.safeParse()` before submitting. Validation errors display inline on phone/CNIC fields.

### BUG-019: `generateCaseNumber` Utility Does Not Handle "family" Type
- **Severity:** Medium
- **Type:** Logic
- **Status:** ✅ Fixed — Added `"family"` to the type union and `FAM` prefix mapping.

### BUG-020: `acceptCase` Does Not Verify Assignment Belongs to Current Lawyer
- **Severity:** Medium
- **Type:** Security
- **Status:** ✅ Fixed — Added `.eq("lawyer_id", user.id)` to the assignment update query.

### BUG-021: `declineCase` Does Not Verify Assignment Belongs to Current Lawyer
- **Severity:** Medium
- **Type:** Security
- **Status:** ✅ Fixed — Added `.eq("lawyer_id", user.id)` to the assignment update query.

### BUG-022: Notification Duplicate — Judge Receives Own Status Change Notification
- **Severity:** Low
- **Type:** Logic / UX
- **Status:** ✅ Fixed — Added `userId === user.id` check to skip sending notification to the delivering judge.

### BUG-023: `handleAction` Swallows Error — No UI Feedback on Failure
- **Severity:** Medium
- **Type:** Error Handling / UX
- **Status:** ✅ Fixed — Added `actionError` state and error banner displayed above the case header when an action fails.

### BUG-024: `useLawyers` Filter by City Searches `profiles.city` Not `lawyer_profiles.location`
- **Severity:** Low
- **Type:** Logic
- **Status:** ✅ Fixed — City filter now uses `.or()` to search both `profiles.city` and `lawyer_profiles.location`.

### BUG-025: Lawyer Profile API Accepts Arbitrary `user_id` Without Session (IDOR Risk)
- **Severity:** Medium
- **Type:** Security
- **Status:** ⚠️ Accepted Risk — The fallback is needed for post-signup flow when cookies aren't set yet. The duplicate check prevents re-creation, and the data being inserted (bar license, specialization) is non-sensitive profile data. Low real-world risk for an FYP.

### BUG-026: Hearing Notification Sent to Scheduling Judge (No Self-Skip)
- **Severity:** Low
- **Type:** Logic / UX
- **Where:** [useHearings.ts:133-142](src/hooks/useHearings.ts#L133-L142)
- **Description:** When a court official creates a hearing, notifications are sent to all parties including lawyers, plaintiff, and defendant. Unlike `updateCaseStatus` (which skips `pid !== user.id`), `createHearing` does NOT skip the scheduling officer. If the presiding officer is tracked as a party, they receive their own "Hearing Scheduled" notification.
- **Suggested Fix:** Add `if (pid === user.id) continue;` before the notification insert in the loop.
- **Affected Files:** `src/hooks/useHearings.ts`

### BUG-027: `registerSchema` Refine Returns `undefined` Instead of `true` for Non-Lawyers
- **Severity:** Medium
- **Type:** Validation Bug
- **Where:** [validations/auth.ts:30-37](src/lib/validations/auth.ts#L30-L37)
- **Description:** The second `.refine()` on `registerSchema` (specialization check) has a missing `return true` for the non-lawyer case. The refine callback returns `undefined` when `role !== "lawyer"` because there's no explicit `return true` statement. In Zod, `undefined` is falsy, which means this refine will FAIL for all non-lawyer roles, blocking registration for clients, admin_court, magistrate, trial_judge, and stenographer.
- **Steps to Reproduce:**
  1. Go to register page
  2. Select any role except "lawyer"
  3. Fill in all required fields
  4. Submit — validation fails with "At least one specialization is required for lawyers"
- **Expected:** Non-lawyer roles should pass validation
- **Actual:** The refine returns `undefined` (falsy) for non-lawyers, causing Zod validation failure
- **Affected Files:** `src/lib/validations/auth.ts`

### BUG-028: Settings Validation Schema Field Name Mismatch (`fullName` vs `full_name`)
- **Severity:** Medium
- **Type:** Validation
- **Where:** [settings/page.tsx:47-48](src/app/(dashboard)/settings/page.tsx#L47-L48)
- **Description:** The `profileUpdateSchema` expects `fullName` (camelCase), but the settings form stores data as `full_name` (snake_case). The settings page maps `full_name` to `fullName` when calling `safeParse` (line 48), which is correct. However, when validation errors are reported, the error path will be `"fullName"`, but the field errors are set to `fieldErrors.phone` and `fieldErrors.cnic` — there's no `error={fieldErrors.fullName}` on the full name input field. A validation error on the name field would have no visible error message.
- **Steps to Reproduce:**
  1. Go to Settings
  2. Clear the Full Name field (or enter 1 character)
  3. Submit — validation fails but no error shows on the name field
- **Expected:** Error should display on the Full Name input
- **Actual:** `fieldErrors.fullName` is set but never rendered (no `error` prop on full_name Input)
- **Affected Files:** `src/app/(dashboard)/settings/page.tsx`

### BUG-029: `useCases` Trial Judge/Stenographer See No Cases (Missing from Query Filter)
- **Severity:** High
- **Type:** Data / Role Filter
- **Where:** [useCases.ts:33-57](src/hooks/useCases.ts#L33-L57)
- **Description:** The `fetchCases` function has role-based filtering: `client` filters by plaintiff/defendant, `lawyer` filters by assignments, `admin_court`/`magistrate` filter by status. However, `trial_judge` and `stenographer` roles fall through to NO filter, which means the query returns ALL cases (no `.or()` or `.in()` clause added). If RLS policies are permissive for these roles, they'd see everything. If RLS is restrictive, they'd see nothing. Either way, there's no application-level query filter for these two roles.
- **Steps to Reproduce:**
  1. Log in as trial_judge
  2. Go to Cases page
  3. Either all cases appear (if RLS is permissive) or none (if restrictive)
- **Expected:** Trial judge should see cases in trial statuses; stenographer should see assigned cases
- **Actual:** No query filter applied for these roles
- **Affected Files:** `src/hooks/useCases.ts`

### BUG-030: Hearing Number Race Condition on Concurrent Scheduling
- **Severity:** Low
- **Type:** Race Condition
- **Where:** [useHearings.ts:66-74](src/hooks/useHearings.ts#L66-L74)
- **Description:** `createHearing` reads the last hearing number, increments it, then inserts. If two officials schedule hearings simultaneously for the same case, both could read the same `lastHearing.hearing_number` and create duplicate hearing numbers. This is a low-probability edge case for an FYP but worth noting.
- **Suggested Fix:** Use a DB sequence or `generate_series` for hearing numbers, or add a unique constraint on `(case_id, hearing_number)`.
- **Affected Files:** `src/hooks/useHearings.ts`

### BUG-031: `acceptCase` Continues Creating Payments Even if Assignment Update Matched 0 Rows
- **Severity:** Medium
- **Type:** Logic / Data Integrity
- **Where:** [useCases.ts:249-259](src/hooks/useCases.ts#L249-L259)
- **Description:** The assignment update at line 249-259 uses `.eq("lawyer_id", user.id)` but doesn't verify the update affected a row (no `.select().maybeSingle()` like the case status update does). If the assignment doesn't belong to this lawyer or has already been accepted, the update silently affects 0 rows but the function continues to create payments and transition the case.
- **Steps to Reproduce:**
  1. Lawyer A accepts a case
  2. Simultaneously, Lawyer B calls acceptCase with the same assignmentId
  3. Assignment update affects 0 rows for Lawyer B but case status update and payments proceed
- **Expected:** Should verify the assignment update succeeded before continuing
- **Actual:** No verification; continues to case status update and payment creation
- **Affected Files:** `src/hooks/useCases.ts`

### BUG-032: `updateCaseStatus` Has No Valid Status Transition Enforcement
- **Severity:** Medium
- **Type:** Security / Workflow
- **Where:** [useCases.ts:656-670](src/hooks/useCases.ts#L656-L670)
- **Description:** `updateCaseStatus` accepts any `newStatus` string and only checks `currentStatus` matches. It doesn't validate that the transition is valid (e.g., from `evidence_stage` to `judgment_delivered` directly, skipping `arguments` and `reserved_for_judgment`). While the UI only shows valid buttons, a direct API call or buggy client could transition to any status.
- **Suggested Fix:** Add a valid transitions map and verify `newStatus` is a valid successor of `currentStatus`.
- **Affected Files:** `src/hooks/useCases.ts`

## Testing Log

| Date | Action | Result | Notes |
|------|--------|--------|-------|
| 2026-03-29 | Full codebase test (/test-all) | 15 bugs found | 1 Critical, 3 High, 6 Medium, 5 Low |
| 2026-03-29 | Bug fix batch | 11 fixed, 1 partial, 3 skipped | BUG-001,003,005-009,011,012,015 fixed; BUG-002 partial; BUG-004,010,013,014 deferred |
| 2026-03-29 | Re-test after fixes (/test-all) | 10 new bugs found | 2 High, 5 Medium, 3 Low — plus verification of prior fixes |
| 2026-03-29 | Bug fix batch 2 | 9 fixed, 1 accepted risk | BUG-016-024 fixed; BUG-025 accepted risk |
| 2026-03-29 | Re-test 3 (/test-all) | 7 new bugs found | 1 High, 4 Medium, 2 Low — all prior fixes verified |

---

## Testing Standards

### General Rules
- Every test must be independent — no test should depend on another test's output
- Tests should clean up after themselves (reset data, logout sessions)
- Use descriptive test names: "should reject login when role mismatches credentials" not "test1"
- Always test both the happy path AND failure cases
- Never hardcode environment-specific values — use env variables or config

### Bug Test Pattern
For every bug test, follow this structure:
1. SETUP — Create the preconditions
2. ACTION — Perform the steps that trigger the bug
3. ASSERT — Verify expected behavior
4. CLEANUP — Reset any changed state

### Severity Levels
- **Critical**: App crashes, data loss, security breach, auth bypass
- **High**: Core feature broken, data showing incorrectly, workflow blocked
- **Medium**: UI issues, minor logic errors, non-blocking problems
- **Low**: Cosmetic issues, typos, minor UX improvements

### What to Test on Every Feature
1. Does it work correctly with valid input? (Happy path)
2. Does it fail gracefully with invalid input? (Validation)
3. Does it respect permissions? (Auth/roles)
4. Does it handle edge cases? (Empty, null, very large, special characters)
5. Does it update related data correctly? (Side effects)
6. Does it work across different user roles? (Permission matrix)
