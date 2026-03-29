The user will describe a bug in any language or format: $ARGUMENTS

## Steps:
1. Translate to clear English if needed
2. Read CLAUDE.md to find the last BUG-XXX number and assign the next one
3. Search the codebase to find the relevant files — read them to understand the root cause
4. Categorize severity: Critical / High / Medium / Low
5. Categorize type: UI / API / Auth / Data / Logic / Performance
6. Write clear documentation including:
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - Root cause (what's wrong in the code)
   - Affected files with line numbers
7. Add to CLAUDE.md under "Known Bugs" in this format:

```
### BUG-XXX: [Title]
- **Severity:** Critical/High/Medium/Low
- **Type:** UI/API/Auth/Data/Logic/Performance
- **Status:** Open
- **Steps to reproduce:**
  1. ...
  2. ...
- **Expected:** ...
- **Actual:** ...
- **Root cause:** ...
- **Affected files:** ...
```

8. Confirm: "Added BUG-XXX: [title]. Run /test-bug XXX to verify after fixing."
