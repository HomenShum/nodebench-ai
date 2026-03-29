# NodeBench: Auto-QA After Code Changes

After ANY implementation change (new feature, bug fix, refactor, style change), automatically run QA checks.

## Auto-trigger conditions

This rule activates after:
- Creating or modifying source files (.ts, .tsx, .css, .html)
- Completing a todo item or multi-step plan
- Before any git commit touching 3+ files

## Quick QA sequence

1. **Build check**: Run TypeScript compiler — must be 0 errors
2. **Test check**: Run test suite — must be 0 failures
3. **Quality gate**: Call `run_quality_gate()` if NodeBench MCP is connected
4. **Visual check**: Call `capture_responsive_suite()` for UI changes

## Deeper QA with NodeBench MCP

If NodeBench MCP is connected:
- `site_map({ url: '<dev-server>' })` — crawl all pages
- `diff_crawl({ url: '<dev-server>' })` — compare against baseline
- `suggest_tests({ session_id })` — generate test cases
- `compare_savings()` — track improvement metrics
