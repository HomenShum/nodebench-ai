# NodeBench: QA Dogfood Protocol

After ANY implementation change, run this checklist before declaring done.

## Automated checks

1. `npx tsc --noEmit` — must be 0 errors
2. `npx vitest run` — must be 0 failures
3. Start dev server and verify all surfaces render
4. Check console for errors on every surface
5. Test navigation: rail switches, CTA buttons, demo cards

## NodeBench tool-assisted QA

- `run_quality_gate()` — automated quality checks
- `capture_responsive_suite({ url })` — screenshots at mobile/tablet/desktop
- `run_visual_qa_suite()` — Gemini vision scoring against design principles
- `site_map({ url })` — crawl and inspect all pages interactively
- `diff_crawl({ url })` — before/after comparison

## Never declare work complete without

- Running the build (0 errors)
- Running tests (0 failures)
- Visual verification (screenshot or preview)
- Console check (0 errors on all surfaces)
