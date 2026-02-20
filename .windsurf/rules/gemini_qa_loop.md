---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.css"
related_: [dogfood_verification, product_design_dogfood, flywheel_continuous, analyst_diagnostic, completion_traceability]
---

# Gemini QA Loop — Automated UI/UX Quality Gate

Continuous dogfood loop using Gemini 3 Flash vision to score and fix UI/UX issues automatically.

## Pipeline Steps (in order)

```bash
# 1. Build production bundle
npx vite build

# 2. Ensure preview server is running (port 4173)
npx vite preview --host 127.0.0.1 --port 4173 &

# 3. Capture screenshots via e2e test
BASE_URL=http://127.0.0.1:4173 npx playwright test tests/e2e/full-ui-dogfood.spec.ts --project=chromium --workers=1

# 4. Publish screenshots to public/dogfood/
npm run dogfood:publish

# 5. Record walkthrough video
node scripts/ui/recordDogfoodWalkthrough.mjs --baseURL http://127.0.0.1:4173 --publish static

# 6. Run Gemini QA (sends screenshots + video to Gemini 3 Flash for scoring)
BASE_URL=http://127.0.0.1:4173 node scripts/ui/runDogfoodGeminiQa.mjs

# 7. Read results
# Score + summary printed to stdout
# Full JSON: .tmp/dogfood-gemini-qa/screens-qa.json and video-qa.json
# History: public/dogfood/qa-results.json
```

## Scoring Formula

```
Score = 100 - (P1_count × 6) - (P2_count × 2) - (P3_count × 1)
```

- **P1**: Major polish (low contrast, missing focus state, misleading UI) — 6 pts each
- **P2**: Minor polish (spacing, inconsistent styling, empty state copy) — 2 pts each
- **P3**: Nit (alignment, minor label wording) — 1 pt each

## Fix Strategy Per Severity

### P1 Fixes (highest ROI — each fix recovers 6 points)
- **Low contrast text**: Check dark mode. Use `dark:text-gray-300` minimum.
- **Missing focus styling**: Add `focus-visible:ring-2 focus-visible:ring-blue-500`.
- **Missing visual hierarchy**: Add left border accent, font weight differentiation, size stepping.
- **Poor empty states**: Add icon + descriptive copy + CTA button.
- **Misleading labels**: Show exact price/data, add tooltips.

### P2 Fixes (each recovers 2 points)
- **Spacing**: Standardize gaps. **Date formats**: Use `month: 'short'`. **Icon contrast**: `dark:bg-indigo-500/25` min.

## Loop Protocol

```
while score < target:
    1. Read .tmp/dogfood-gemini-qa/screens-qa.json and video-qa.json
    2. Fix all P1s first (highest ROI), then easy P2s
    3. npx vite build && run e2e + publish + record + Gemini QA
    4. Read new score
    5. If 3 consecutive rounds without improvement → change strategy
```

## Gemini Noise

Expect ±8 point variance between identical builds. Track P1 count (more stable than total score). Cross-check before fixing — Gemini sometimes hallucinates issues.

## Key Files

| File | Purpose |
|------|---------|
| `convex/domains/dogfood/screenshotQa.ts` | Screenshot QA (Gemini 3 Flash + fallback chain) |
| `convex/domains/dogfood/videoQa.ts` | Video QA (Gemini 3 Flash + fallback chain) |
| `scripts/ui/runDogfoodGeminiQa.mjs` | QA pipeline orchestrator |
| `.tmp/dogfood-gemini-qa/*.json` | Latest QA results |
| `shared/llm/modelCatalog.ts` | Model catalog with Gemini 3 defaults |
