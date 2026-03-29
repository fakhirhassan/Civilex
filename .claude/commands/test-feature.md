Test a specific feature area of the Civilex project: $ARGUMENTS

If no feature is specified, list all testable features and ask the user to pick one:
- authentication (login, signup, role verification, middleware)
- case-creation (filing civil/criminal/family cases, validation, documents)
- lawyer-flow (accept/decline, fee setting, case review)
- payments (fee payments, installments, status transitions)
- scrutiny (admin court review, checklist, registration)
- criminal (FIR, bail, investigation, challan)
- trial (evidence, witnesses, judgment, signing)
- notifications (creation, realtime, read/delete)
- documents (upload, view, sign, RLS access)
- dashboard (stats, role-specific sections, navigation)

## For the specified feature, do ALL of the following:

### 1. Find all related code
Search src/hooks/, src/app/, src/components/, src/lib/, src/types/ for everything related to this feature. Read every relevant file completely.

### 2. Trace the full data flow
- What triggers this feature? (UI action, route, API call)
- What database tables are involved?
- What RLS policies gate access?
- What validation runs?
- What state updates happen?
- What notifications are sent?

### 3. Identify every possible failure point
- Can RLS silently block an operation?
- Can a status transition be skipped or fail?
- Are there missing error handlers?
- Can two users trigger a race condition?
- Does it work for ALL relevant roles?
- What happens with empty/null/invalid data?

### 4. Check against known bugs
Read CLAUDE.md "Known Bugs" section and check if any relate to this feature.

### 5. Report findings
For each issue found:
- **What:** Clear description
- **Where:** File:line
- **Severity:** Critical / High / Medium / Low
- **Status:** Bug (broken) / Warning (risky) / OK (works correctly)

Add any new bugs found to CLAUDE.md under "Known Bugs".
