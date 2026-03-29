# NodeBench: Pre-Release Review

Run before any deploy, PR, or demo.

## 7-Layer Review Stack

1. **Build gate** — `npx tsc --noEmit` + `npx vite build` (0 errors)
2. **Test gate** — `npm run test:run` (0 failures)
3. **Visual sweep** — Visit every surface, check for console errors, layout shift, contrast
4. **Agent panel** — Open agent panel, run demo conversation, close cleanly
5. **Content freshness** — No stale dates, TODOs, "Coming soon", developer jargon in UI
6. **A11y spot-check** — Tab through page, check focus rings, contrast, reduced motion
7. **Bundle sanity** — No chunks >500KB, route chunks separate

## Failure protocol

- Layer 1-2 failures: BLOCK. Fix before any review.
- Layer 3-7 failures: FIX INLINE with before/after evidence.

## NodeBench tools

- `run_quality_gate()` — automated checks
- `capture_responsive_suite({ url })` — visual proof at all breakpoints
- `site_map({ url })` — full surface coverage
