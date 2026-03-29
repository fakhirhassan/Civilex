Perform a full security and code quality audit on the Civilex project. Read ALL source files and actively search for problems.

## 1. Security Audit

### Authentication
- Read src/components/providers/AuthProvider.tsx — is role verification bulletproof?
- Read middleware.ts and src/lib/supabase/middleware.ts — can protected routes be bypassed?
- Read all API routes in src/app/api/ — do they validate auth? Can they be called without a session?
- Check: are there any routes or API endpoints accessible without authentication?

### Authorization (RLS)
- Read ALL migration files in supabase/migrations/ — check every RLS policy
- For each policy, verify: can a user of role X access data they shouldn't?
- Check for policies that use nested subqueries through RLS-protected tables (these can silently fail)
- Check: can a client see another client's cases? Can a lawyer see unassigned cases?

### Data Exposure
- Check .env.local — are secrets committed to git? Check .gitignore
- Search for hardcoded keys, tokens, or credentials in source code
- Check API responses — do they leak sensitive data (passwords, internal IDs, other users' data)?
- Check console.log/console.error statements — do they log sensitive data?

### Input Validation
- Read all Zod schemas in src/lib/validations/ — are they comprehensive?
- Check every form submission — does it validate before sending to Supabase?
- Check API routes — do they validate request bodies?
- Look for SQL injection vectors (raw queries, string interpolation in queries)
- Look for XSS vectors (dangerouslySetInnerHTML, unescaped user content)

## 2. Data Integrity Audit

### Status Transitions
- Read useCases.ts — map every status transition. Are there any that skip validation?
- Can a case jump from "draft" to "registered" by calling the right function?
- Are status transitions enforced server-side (RLS/DB) or only client-side?

### Payment Integrity
- Can payments be marked as completed without actual payment?
- Are installment calculations correct? (rounding, remainder handling)
- Can a user create duplicate payments?

### Race Conditions
- Are there sequential Supabase calls that should be atomic?
- Can two users modify the same case simultaneously?
- Can a lawyer accept a case that's already been accepted by another lawyer?

## 3. Error Handling Audit

- Search for Supabase queries that ignore the error response
- Search for try/catch blocks with empty catch or just console.error
- Check: do failed operations leave data in an inconsistent state?
- Check: are users shown meaningful error messages or just silent failures?

## 4. Code Quality Audit

- Dead code: unused imports, unreachable code, commented-out blocks
- Duplicated logic: same pattern repeated in multiple places
- Type safety: usage of `any`, unsafe type assertions, missing null checks
- Performance: unnecessary re-renders, missing memoization, N+1 queries

## 5. Output

Create QA_AUDIT.md in the project root with:

### Priority levels:
- 🔴 **Critical** — Fix immediately (security holes, data corruption, auth bypass)
- 🟡 **Warning** — Fix soon (silent failures, missing validation, race conditions)
- 🟢 **Suggestion** — Nice to have (code quality, performance, consistency)

For each finding include: description, file:line, impact, and suggested fix.

Also add any critical or high-severity bugs found to CLAUDE.md under "Known Bugs".
