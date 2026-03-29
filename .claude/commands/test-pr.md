Analyze recent changes and test for regressions: $ARGUMENTS

## Step 1: Identify changes
If a PR number or description is given, use that. Otherwise, run `git diff` and `git log` to find recent changes.

Read every changed file completely.

## Step 2: Understand impact
For each changed file:
- What feature does it affect?
- What other files depend on it? (imports, hooks, types)
- What RLS policies are involved?
- What user roles are affected?

## Step 3: Check for regressions
- Did the change break any existing functionality?
- Did it introduce new unhandled error paths?
- Did it change a type that other files depend on?
- Did it change a status transition that other code expects?
- Did it change RLS behavior that affects other queries?

## Step 4: Verify the fix/feature
- Does the change actually solve the intended problem?
- Does it handle edge cases?
- Does it work for all affected roles?

## Step 5: Report

| File Changed | Feature Affected | Regression Risk | Status |
|---|---|---|---|

Then detail:
- **Changes summary:** What was modified and why
- **Regressions found:** Any broken functionality
- **Edge cases to watch:** Potential issues not yet triggered
- **Verdict:** Safe to merge / Needs fixes / Needs more testing
