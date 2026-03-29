Test a specific bug: $ARGUMENTS

If a BUG-XXX number is given, read that bug from CLAUDE.md under "Known Bugs".
If a description is given instead, search the codebase for the described issue.

## For the bug, do ALL of the following:

### 1. Find the relevant source code
Read the files mentioned in the bug report (or search for them based on the description).

### 2. Trace the code path
Follow the exact steps to reproduce described in the bug. Read each function, hook, component, and RLS policy involved.

### 3. Determine current status
- Read the current code and check if the fix has been applied
- Check if the RLS policies support the expected behavior
- Check if the status transitions are correct
- Verify error handling exists

### 4. Report
- ✅ **FIXED** — The code now handles this correctly. Explain what was changed and why it works.
- ❌ **STILL BROKEN** — The bug still exists. Show the exact code that's wrong and suggest the fix.
- ⚠️ **PARTIALLY FIXED** — Some aspects are fixed but others remain. Detail what works and what doesn't.

### 5. Update CLAUDE.md
If the bug status has changed, update it in the Known Bugs section.
