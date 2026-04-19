# Persona Episode Eval (Raw Live Agent)

Generated: 2026-01-06T05:49:59.784Z
Git SHA: 48f80b32fb12f7fed3732e6edc41a0bbf9e6ec1b
Convex: https://formal-shepherd-851.convex.cloud
Model: claude-haiku-4.5
Elapsed: 3317771ms

## Summary
- ok=false total=24 passed=4 failed=20

## Pricing (API)
- provider=anthropic model=Claude Haiku 4.5 baseInput=$1/MTok output=$5/MTok cacheHit=$0.1/MTok
- providerTokens: input=1496945 output=82092 cachedInputTokens=780544 estCostUsd=$1.9074

## Totals (Execution)
- steps=45 toolCalls=44 toolResults=29 estInputTokens=37799 estOutputTokens=24532
- providerTokens: input=1496945 output=82092 cachedInput=780544

## Runs
| Scenario | Persona | Entity | Status | Notes |
|---|---|---|---:|---|
| Next: banker vague (fast debrief) | JPM_STARTUP_BANKER | DISCO | PASS |  |
| Next: banker tool-driven outbound pack | JPM_STARTUP_BANKER | AMBROS | FAIL | Missing [DEBRIEF_V1_JSON] block |
| Next: VC vague wedge | EARLY_STAGE_VC | DISCO | FAIL | Missing [DEBRIEF_V1_JSON] block |
| Next: VC tool-driven comps + diligence | EARLY_STAGE_VC | DISCO | FAIL | persona mismatch: got JPM_STARTUP_BANKER expected EARLY_STAGE_VC |
| Next: CTO vague exposure | CTO_TECH_LEAD | MQUICKJS | FAIL | persona mismatch: got JPM_STARTUP_BANKER expected CTO_TECH_LEAD |
| Next: CTO tool-driven CVE plan | CTO_TECH_LEAD | MQUICKJS | FAIL | Missing [DEBRIEF_V1_JSON] block |
| Next: founder vague positioning | FOUNDER_STRATEGY | SALESFORCE | FAIL | hqLocation does not match ground truth |
| Next: founder tool-driven memo | FOUNDER_STRATEGY | SALESFORCE | FAIL | Missing [DEBRIEF_V1_JSON] block |
| Next: academic vague anchor | ACADEMIC_RD | ALZHEIMERS | FAIL | Missing [DEBRIEF_V1_JSON] block |
| Next: academic tool-driven literature debrief | ACADEMIC_RD | ALZHEIMERS | FAIL | missing ground truth citation anchor in grounding[] |
| Next: exec vague standardize | ENTERPRISE_EXEC | GEMINI_3 | FAIL | persona mismatch: got CTO_TECH_LEAD expected ENTERPRISE_EXEC |
| Next: exec tool-driven cost model | ENTERPRISE_EXEC | GEMINI_3 | FAIL | missing ground truth citation anchor in grounding[] |
| Next: ecosystem vague incident | ECOSYSTEM_PARTNER | SOUNDCLOUD | FAIL | persona mismatch: got EARLY_STAGE_VC expected ECOSYSTEM_PARTNER |
| Next: ecosystem tool-driven second-order brief | ECOSYSTEM_PARTNER | SOUNDCLOUD | FAIL | hqLocation does not match ground truth |
| Next: quant vague what to track | QUANT_ANALYST | DISCO | FAIL | Missing [DEBRIEF_V1_JSON] block |
| Next: quant tool-driven signal set JSON | QUANT_ANALYST | DISCO | PASS |  |
| Next: product vague UI usable | PRODUCT_DESIGNER | DISCO | FAIL | persona mismatch: got JPM_STARTUP_BANKER expected PRODUCT_DESIGNER |
| Next: product tool-driven expandable card schema | PRODUCT_DESIGNER | DISCO | FAIL | minToolCalls not met: got 0 expected >= 1 |
| Next: sales vague shareable | SALES_ENGINEER | DISCO | PASS |  |
| Next: sales tool-driven one-screen + objections | SALES_ENGINEER | DISCO | FAIL | persona mismatch: got JPM_STARTUP_BANKER expected SALES_ENGINEER |
| Stress: ambiguous persona (wedge + outreach) | JPM_STARTUP_BANKER | DISCO | PASS |  |
| Stress: contradiction handling (Seed vs Series A) | JPM_STARTUP_BANKER | DISCO | FAIL | minToolCalls not met: got 0 expected >= 1 |
| Pack: exec cross-provider pricing comparison | ENTERPRISE_EXEC | GEMINI_3 | FAIL | Missing [DEBRIEF_V1_JSON] block |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | EARLY_STAGE_VC | DISCO | FAIL | Missing [DEBRIEF_V1_JSON] block |
