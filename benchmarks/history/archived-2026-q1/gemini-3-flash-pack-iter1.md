# Persona Episode Eval (Raw Live Agent)

Generated: 2026-01-06T05:23:01.263Z
Git SHA: 48f80b32fb12f7fed3732e6edc41a0bbf9e6ec1b
Convex: https://formal-shepherd-851.convex.cloud
Model: gemini-3-flash
Elapsed: 31613ms

## Summary
- ok=false total=24 passed=0 failed=24

## Pricing (API)
- provider=google model=Gemini 3 Flash Preview input=$0.5/1M output=$3/1M (over200k: in=$? out=$?)
- estTokens: input=0 output=0 estCostUsd=$0.0000

## Totals (Execution)
- steps=0 toolCalls=0 toolResults=0 estInputTokens=0 estOutputTokens=0

## Runs
| Scenario | Persona | Entity | Status | Notes |
|---|---|---|---:|---|
| Next: banker vague (fast debrief) | JPM_STARTUP_BANKER | DISCO | FAIL | Missing [DEBRIEF_V1_JSON] block |
| Next: banker tool-driven outbound pack | JPM_STARTUP_BANKER | AMBROS | FAIL | Missing [DEBRIEF_V1_JSON] block |
| Next: VC vague wedge | EARLY_STAGE_VC | DISCO | FAIL | Missing [DEBRIEF_V1_JSON] block |
| Next: VC tool-driven comps + diligence | EARLY_STAGE_VC | DISCO | FAIL | Missing [DEBRIEF_V1_JSON] block |
| Next: CTO vague exposure | CTO_TECH_LEAD | MQUICKJS | FAIL | Missing [DEBRIEF_V1_JSON] block |
| Next: CTO tool-driven CVE plan | CTO_TECH_LEAD | MQUICKJS | FAIL | Missing [DEBRIEF_V1_JSON] block |
| Next: founder vague positioning | FOUNDER_STRATEGY | SALESFORCE | FAIL | Missing [DEBRIEF_V1_JSON] block |
| Next: founder tool-driven memo | FOUNDER_STRATEGY | SALESFORCE | FAIL | Missing [DEBRIEF_V1_JSON] block |
| Next: academic vague anchor | ACADEMIC_RD | ALZHEIMERS | FAIL | Missing [DEBRIEF_V1_JSON] block |
| Next: academic tool-driven literature debrief | ACADEMIC_RD | ALZHEIMERS | FAIL | Missing [DEBRIEF_V1_JSON] block |
| Next: exec vague standardize | ENTERPRISE_EXEC | GEMINI_3 | FAIL | Missing [DEBRIEF_V1_JSON] block |
| Next: exec tool-driven cost model | ENTERPRISE_EXEC | GEMINI_3 | FAIL | Missing [DEBRIEF_V1_JSON] block |
| Next: ecosystem vague incident | ECOSYSTEM_PARTNER | SOUNDCLOUD | FAIL | Missing [DEBRIEF_V1_JSON] block |
| Next: ecosystem tool-driven second-order brief | ECOSYSTEM_PARTNER | SOUNDCLOUD | FAIL | Missing [DEBRIEF_V1_JSON] block |
| Next: quant vague what to track | QUANT_ANALYST | DISCO | FAIL | Missing [DEBRIEF_V1_JSON] block |
| Next: quant tool-driven signal set JSON | QUANT_ANALYST | DISCO | FAIL | Missing [DEBRIEF_V1_JSON] block |
| Next: product vague UI usable | PRODUCT_DESIGNER | DISCO | FAIL | Missing [DEBRIEF_V1_JSON] block |
| Next: product tool-driven expandable card schema | PRODUCT_DESIGNER | DISCO | FAIL | Missing [DEBRIEF_V1_JSON] block |
| Next: sales vague shareable | SALES_ENGINEER | DISCO | FAIL | Missing [DEBRIEF_V1_JSON] block |
| Next: sales tool-driven one-screen + objections | SALES_ENGINEER | DISCO | FAIL | Missing [DEBRIEF_V1_JSON] block |
| Stress: ambiguous persona (wedge + outreach) | JPM_STARTUP_BANKER | DISCO | FAIL | Missing [DEBRIEF_V1_JSON] block |
| Stress: contradiction handling (Seed vs Series A) | JPM_STARTUP_BANKER | DISCO | FAIL | Missing [DEBRIEF_V1_JSON] block |
| Pack: exec cross-provider pricing comparison | ENTERPRISE_EXEC | GEMINI_3 | FAIL | Missing [DEBRIEF_V1_JSON] block |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | EARLY_STAGE_VC | DISCO | FAIL | Missing [DEBRIEF_V1_JSON] block |
