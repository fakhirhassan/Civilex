Analyze test coverage for the entire Civilex project by scanning all source code.

## Step 1: Identify all features and flows
Read the codebase and list every major feature:
- Authentication (login, signup, logout, role verification)
- Case creation (civil, criminal, family)
- Lawyer assignment (accept, decline, fee setting)
- Payment flow (single, installments, completion)
- Document management (upload, view, sign)
- Scrutiny (checklist, approve, return, register)
- Criminal features (FIR, bail, investigation, challan)
- Hearings (schedule, conduct, orders)
- Trial (evidence, witnesses, judgment)
- Notifications (create, realtime, read, delete)
- Dashboard (stats, role-specific views)
- Settings (profile update)
- AI assistant

## Step 2: Check what's tested
Search for any test files (*.test.*, *.spec.*, __tests__/). Check if Playwright or Vitest configs exist. Check package.json for test scripts.

## Step 3: Analyze code-level coverage
For each feature, check:
- Are inputs validated? (Zod schemas exist?)
- Are errors handled? (try/catch, error states in UI?)
- Are permissions checked? (RLS + client-side role checks?)
- Are edge cases handled? (null checks, empty arrays, missing data?)

## Step 4: Output coverage matrix

| Feature | Validation | Error Handling | Auth/RLS | Edge Cases | Test Files | Overall |
|---------|-----------|---------------|----------|-----------|-----------|---------|

Use these ratings:
- ✅ Good — Properly covered
- ⚠️ Partial — Some coverage but gaps exist
- ❌ None — Not covered at all

## Step 5: Prioritized recommendations
List the top 10 areas that need testing most urgently, ordered by risk:
1. What could cause data loss or corruption?
2. What could allow unauthorized access?
3. What could break the core workflow?
4. What gives users a broken experience?

## Step 6: Effort estimate
Estimate the work needed to reach reasonable coverage:
- How many unit tests needed?
- How many E2E flows needed?
- What testing tools should be set up?
