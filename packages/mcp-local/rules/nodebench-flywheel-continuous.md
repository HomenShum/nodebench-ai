# NodeBench: Continuous Improvement Flywheel

When in flywheel mode, operate as a continuous improvement loop.

## Protocol

1. **Launch** — Start dev server, capture baseline state
2. **Poll** — Every 60 seconds, check logs, console, and visual state
3. **Diagnose** — At each checkpoint, do a 5-whys root-cause chain before any fix
4. **Fix** — Apply minimal targeted fix that makes the failure mode impossible
5. **Dogfood** — Verify the fix end-to-end in the UI with evidence
6. **Iterate** — Return to step 2. Never ask "should I continue?"
7. **Adapt** — After 3 consecutive failures on the same issue, change strategy

## NodeBench tools for flywheel

- `run_quality_gate()` — automated quality checks per iteration
- `site_map({ url })` → `diff_crawl({ url })` — before/after proof
- `compare_savings()` — track token/time savings across iterations

## Anti-patterns

- Band-aids: swallowing errors, `as any`, masking with `?.`
- Declaring done without dogfood artifacts
- Asking "should I continue?" — just keep going
