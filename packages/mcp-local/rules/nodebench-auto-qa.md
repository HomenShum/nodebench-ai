# NodeBench: Auto-QA After Code Changes

After ANY implementation change (new feature, bug fix, refactor, style change), automatically run QA checks.

## Auto-trigger conditions

This rule activates after:
- Creating or modifying source files (.ts, .tsx, .css, .html)
- Completing a todo item or multi-step plan
- Before any git commit touching 3+ files

## Quick QA sequence

1. **Build check**: `npx tsc --noEmit` — must be 0 errors
2. **Test check**: `npx vitest run` — must be 0 failures
3. **Quality gate**: Call `run_quality_gate()` if available
4. **Visual check**: Call `capture_responsive_suite({ url: 'http://localhost:5191' })` for UI changes

## When to use NodeBench MCP tools

If NodeBench MCP is connected, use these tools for deeper QA:
- `site_map({ url: '<dev-server>' })` — crawl all pages, check for errors
- `diff_crawl({ url: '<dev-server>' })` — compare against baseline
- `suggest_tests({ session_id: '<from site_map>' })` — generate test cases
- `compare_savings()` — track improvement metrics

## Never skip QA because

- "It's a small change" — small changes cause regressions
- "I'll test it later" — later never comes
- "It compiled" — compilation != correctness
