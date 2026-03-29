Perform a comprehensive test of the ENTIRE Civilex project. Do not wait for bugs to be registered — actively find them.

## Step 1: Read the codebase
Read all hooks in src/hooks/, all pages in src/app/, all providers in src/components/providers/, all validations in src/lib/validations/, all API routes in src/app/api/, and the middleware.

## Step 2: Test each area systematically

### Authentication & Authorization
- Does login verify the selected role against the user's actual role in the database?
- Can a user access routes they shouldn't? Check middleware route protection.
- Does signup properly create profiles? Does the lawyer profile flow work?
- Are auth pages redirected for logged-in users?

### Case Management
- Can a client create all 3 case types (civil, criminal, family)?
- Is the case status transition logic correct? Check every status change in useCases.ts.
- Are there any status updates that could silently fail due to RLS policies?
- Do all role-based filters work? (client sees own cases, lawyer sees assigned, admin sees submitted+)
- Does the case number generation work for all types?

### Lawyer Acceptance/Decline Flow
- When a lawyer accepts: does status change to payment_pending? Is the fee stored? Are payments created?
- When a lawyer declines: does status revert to draft? Is the assignment marked declined? Does the case disappear from the lawyer's list?
- Can the RLS policies actually allow these updates? Check the update policies vs assignment status at time of update.

### Payment System
- Are installment payments split correctly? Does the last installment get the remainder?
- When all payments complete, does the case status change to payment_confirmed?
- Can only the payer and receiver see their payments?

### Document Management
- Can clients upload documents during case creation?
- Can lawyers see documents uploaded by the client? (Check RLS)
- Does the document signing OTP flow work?

### Notifications
- Are notifications created for all key events (accept, decline, payment, status change)?
- Does realtime subscription work?
- Can users only see their own notifications?

### Scrutiny & Court Flow
- Can admin court only see cases with status submitted_to_admin or later?
- Does the scrutiny checklist save and load correctly?
- Can admin register a case and issue summons?

### Criminal Case Features
- Are criminal details (FIR, police station, etc.) saved correctly?
- Does bail application flow work?
- Does investigation report submission work?

### Trial Features
- Evidence submission and admission flow
- Witness records management
- Judgment creation and signing

### Validation
- Do all Zod schemas catch invalid input?
- Are there any forms that skip validation?
- Can empty or malicious data get through?

## Step 3: Check for common code issues
- Unhandled promise rejections or missing error checks
- Supabase queries that ignore errors (const { data } without checking error)
- Race conditions in sequential Supabase calls
- Missing loading states or error states in UI
- Hardcoded values that should be dynamic
- TypeScript any types or unsafe casts

## Step 4: Output results

Create a summary table:

| Area | Status | Issues Found | Severity |
|------|--------|-------------|----------|

Then list each issue found with:
- **What:** Description of the problem
- **Where:** File path and line number
- **Why it matters:** Impact on users
- **Suggested fix:** How to resolve it

Finally, add any newly discovered bugs to CLAUDE.md under "Known Bugs" using the BUG-XXX format with severity, type, steps to reproduce, expected vs actual behavior, and affected files.
