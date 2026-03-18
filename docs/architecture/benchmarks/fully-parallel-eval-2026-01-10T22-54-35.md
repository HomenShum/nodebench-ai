# Fully Parallel Evaluation Results

Generated: 2026-01-10T22:54:35.576Z
Total Time: 300.7s
Suite: pack
Models: 8
Scenarios: 24 of 24 (limit=0)
Total evaluations: 192

## Summary by Model

| Model | Total | Passed | Failed | Avg Time (s) |
|-------|-------|--------|--------|--------------|
| claude-haiku-4.5 | 24 | 2 | 22 | 61.1 |
| gpt-5-mini | 24 | 16 | 8 | 57.7 |
| gemini-3-flash | 24 | 11 | 13 | 19.4 |
| deepseek-r1 | 24 | 11 | 13 | 93.0 |
| deepseek-v3.2 | 24 | 12 | 11 | 106.1 |
| qwen3-235b | 24 | 8 | 16 | 66.6 |
| minimax-m2.1 | 24 | 17 | 7 | 49.0 |
| mimo-v2-flash-free | 24 | 14 | 10 | 45.3 |

## Summary by Scenario

| Scenario | Total | Passed | Failed |
|----------|-------|--------|--------|
| Next: academic tool-driven literature debrief | 8 | 1 | 7 |
| Next: academic vague anchor | 8 | 4 | 4 |
| Next: banker tool-driven outbound pack | 8 | 6 | 2 |
| Next: banker vague (fast debrief) | 8 | 6 | 2 |
| Next: CTO tool-driven CVE plan | 8 | 6 | 2 |
| Next: CTO vague exposure | 8 | 6 | 2 |
| Next: ecosystem tool-driven second-order brief | 8 | 1 | 7 |
| Next: ecosystem vague incident | 8 | 2 | 6 |
| Next: exec tool-driven cost model | 8 | 3 | 5 |
| Next: exec vague standardize | 8 | 4 | 4 |
| Next: founder tool-driven memo | 8 | 4 | 4 |
| Next: founder vague positioning | 8 | 2 | 6 |
| Next: product tool-driven expandable card schema | 8 | 6 | 2 |
| Next: product vague UI usable | 8 | 3 | 5 |
| Next: quant tool-driven signal set JSON | 8 | 6 | 2 |
| Next: quant vague what to track | 8 | 4 | 4 |
| Next: sales tool-driven one-screen + objections | 8 | 0 | 8 |
| Next: sales vague shareable | 8 | 4 | 4 |
| Next: VC tool-driven comps + diligence | 8 | 5 | 3 |
| Next: VC vague wedge | 8 | 6 | 2 |
| offset:22 | 1 | 0 | 1 |
| Pack: exec cross-provider pricing comparison | 7 | 0 | 7 |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | 8 | 3 | 5 |
| Stress: ambiguous persona (wedge + outreach) | 8 | 5 | 3 |
| Stress: contradiction handling (Seed vs Series A) | 8 | 4 | 4 |

## Detailed Results

### claude-haiku-4.5

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 14.8 | - |
| Next: banker tool-driven outbound pack | ❌ FAIL | 61.6 | Missing [DEBRIEF_V1_JSON] block |
| Next: VC vague wedge | ❌ FAIL | 67.1 | Missing [DEBRIEF_V1_JSON] block |
| Next: VC tool-driven comps + diligence | ❌ FAIL | 69.9 | Missing [DEBRIEF_V1_JSON] block |
| Next: CTO vague exposure | ❌ FAIL | 67.1 | Missing [DEBRIEF_V1_JSON] block |
| Next: CTO tool-driven CVE plan | ❌ FAIL | 64.2 | Missing [DEBRIEF_V1_JSON] block |
| Next: founder vague positioning | ❌ FAIL | 67.1 | Missing [DEBRIEF_V1_JSON] block |
| Next: founder tool-driven memo | ❌ FAIL | 64.2 | Missing [DEBRIEF_V1_JSON] block |
| Next: academic vague anchor | ❌ FAIL | 65.1 | missing required tools: expected lookupGroundTruthEntity got [lookupGroundTruth] |
| Next: academic tool-driven literature debrief | ❌ FAIL | 58.3 | Missing [DEBRIEF_V1_JSON] block |
| Next: exec vague standardize | ❌ FAIL | 64.3 | Missing [DEBRIEF_V1_JSON] block |
| Next: exec tool-driven cost model | ❌ FAIL | 58.8 | Missing [DEBRIEF_V1_JSON] block |
| Next: ecosystem vague incident | ❌ FAIL | 73.5 | missing required tools: expected lookupGroundTruthEntity got [lookupGroundTruth] |
| Next: ecosystem tool-driven second-order brief | ❌ FAIL | 59.3 | Missing [DEBRIEF_V1_JSON] block |
| Next: quant vague what to track | ❌ FAIL | 69.8 | Missing [DEBRIEF_V1_JSON] block |
| Next: quant tool-driven signal set JSON | ✅ PASS | 102.8 | - |
| Next: product vague UI usable | ❌ FAIL | 64.0 | Missing [DEBRIEF_V1_JSON] block |
| Next: product tool-driven expandable card schema | ❌ FAIL | 59.3 | Missing [DEBRIEF_V1_JSON] block |
| Next: sales vague shareable | ❌ FAIL | 58.2 | Missing [DEBRIEF_V1_JSON] block |
| Next: sales tool-driven one-screen + objections | ❌ FAIL | 7.0 | Missing [DEBRIEF_V1_JSON] block |
| Stress: ambiguous persona (wedge + outreach) | ❌ FAIL | 70.4 | Missing [DEBRIEF_V1_JSON] block |
| Stress: contradiction handling (Seed vs Series A) | ❌ FAIL | 58.7 | Missing [DEBRIEF_V1_JSON] block |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 61.5 | Missing [DEBRIEF_V1_JSON] block |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ❌ FAIL | 60.3 | Missing [DEBRIEF_V1_JSON] block |

### gpt-5-mini

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 31.0 | - |
| Next: banker tool-driven outbound pack | ✅ PASS | 77.0 | - |
| Next: VC vague wedge | ✅ PASS | 46.3 | - |
| Next: VC tool-driven comps + diligence | ✅ PASS | 72.8 | - |
| Next: CTO vague exposure | ✅ PASS | 42.7 | - |
| Next: CTO tool-driven CVE plan | ✅ PASS | 83.2 | - |
| Next: founder vague positioning | ❌ FAIL | 61.5 | missing ground truth citation anchor in grounding[] |
| Next: founder tool-driven memo | ❌ FAIL | 80.2 | missing ground truth citation anchor in grounding[] |
| Next: academic vague anchor | ✅ PASS | 47.3 | - |
| Next: academic tool-driven literature debrief | ❌ FAIL | 42.6 | missing ground truth citation anchor in grounding[] |
| Next: exec vague standardize | ✅ PASS | 46.3 | - |
| Next: exec tool-driven cost model | ❌ FAIL | 63.9 | missing ground truth citation anchor in grounding[] |
| Next: ecosystem vague incident | ✅ PASS | 39.2 | - |
| Next: ecosystem tool-driven second-order brief | ❌ FAIL | 49.3 | hqLocation does not match ground truth |
| Next: quant vague what to track | ✅ PASS | 41.2 | - |
| Next: quant tool-driven signal set JSON | ✅ PASS | 54.7 | - |
| Next: product vague UI usable | ✅ PASS | 44.2 | - |
| Next: product tool-driven expandable card schema | ✅ PASS | 66.9 | - |
| Next: sales vague shareable | ❌ FAIL | 32.1 | persona mismatch: got JPM_STARTUP_BANKER expected SALES_ENGINEER |
| Next: sales tool-driven one-screen + objections | ❌ FAIL | 48.3 | persona mismatch: got JPM_STARTUP_BANKER expected SALES_ENGINEER |
| Stress: ambiguous persona (wedge + outreach) | ✅ PASS | 49.2 | - |
| Stress: contradiction handling (Seed vs Series A) | ✅ PASS | 42.6 | - |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 155.9 | missing verification loop (no planSteps entry includes 'verify' or 'validate') |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ✅ PASS | 66.6 | - |

### gemini-3-flash

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ❌ FAIL | 14.6 | Missing [DEBRIEF_V1_JSON] block |
| Next: banker tool-driven outbound pack | ✅ PASS | 17.1 | - |
| Next: VC vague wedge | ✅ PASS | 19.4 | - |
| Next: VC tool-driven comps + diligence | ✅ PASS | 61.2 | - |
| Next: CTO vague exposure | ✅ PASS | 13.9 | - |
| Next: CTO tool-driven CVE plan | ✅ PASS | 20.0 | - |
| Next: founder vague positioning | ❌ FAIL | 15.1 | Missing [DEBRIEF_V1_JSON] block |
| Next: founder tool-driven memo | ✅ PASS | 46.3 | - |
| Next: academic vague anchor | ❌ FAIL | 15.1 | Missing [DEBRIEF_V1_JSON] block |
| Next: academic tool-driven literature debrief | ❌ FAIL | 17.0 | Missing [DEBRIEF_V1_JSON] block |
| Next: exec vague standardize | ❌ FAIL | 16.4 | Missing [DEBRIEF_V1_JSON] block |
| Next: exec tool-driven cost model | ❌ FAIL | 15.1 | Missing [DEBRIEF_V1_JSON] block |
| Next: ecosystem vague incident | ❌ FAIL | 15.3 | Missing [DEBRIEF_V1_JSON] block |
| Next: ecosystem tool-driven second-order brief | ❌ FAIL | 15.5 | Missing [DEBRIEF_V1_JSON] block |
| Next: quant vague what to track | ❌ FAIL | 14.5 | Missing [DEBRIEF_V1_JSON] block |
| Next: quant tool-driven signal set JSON | ✅ PASS | 18.1 | - |
| Next: product vague UI usable | ✅ PASS | 15.5 | - |
| Next: product tool-driven expandable card schema | ✅ PASS | 17.3 | - |
| Next: sales vague shareable | ✅ PASS | 12.1 | - |
| Next: sales tool-driven one-screen + objections | ❌ FAIL | 19.4 | Missing [DEBRIEF_V1_JSON] block |
| Stress: ambiguous persona (wedge + outreach) | ❌ FAIL | 14.6 | Missing [DEBRIEF_V1_JSON] block |
| Stress: contradiction handling (Seed vs Series A) | ✅ PASS | 15.4 | - |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 19.8 | Missing [DEBRIEF_V1_JSON] block |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ❌ FAIL | 17.5 | Missing [DEBRIEF_V1_JSON] block |

### deepseek-r1

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 93.2 | - |
| Next: banker tool-driven outbound pack | ❌ FAIL | 10.6 | Missing [DEBRIEF_V1_JSON] block |
| Next: VC vague wedge | ✅ PASS | 69.2 | - |
| Next: VC tool-driven comps + diligence | ✅ PASS | 278.8 | - |
| Next: CTO vague exposure | ✅ PASS | 134.9 | - |
| Next: CTO tool-driven CVE plan | ✅ PASS | 75.5 | - |
| Next: founder vague positioning | ❌ FAIL | 17.3 | Missing [DEBRIEF_V1_JSON] block |
| Next: founder tool-driven memo | ❌ FAIL | 288.2 | missing required tools: expected lookupGroundTruthEntity got [initScratchpad, de |
| Next: academic vague anchor | ✅ PASS | 48.6 | - |
| Next: academic tool-driven literature debrief | ❌ FAIL | 86.2 | missing ground truth citation anchor in grounding[] |
| Next: exec vague standardize | ❌ FAIL | 60.1 | persona mismatch: got CTO_TECH_LEAD expected ENTERPRISE_EXEC |
| Next: exec tool-driven cost model | ❌ FAIL | 33.5 | Missing [DEBRIEF_V1_JSON] block |
| Next: ecosystem vague incident | ❌ FAIL | 13.5 | Missing [DEBRIEF_V1_JSON] block |
| Next: ecosystem tool-driven second-order brief | ❌ FAIL | 55.3 | Missing [DEBRIEF_V1_JSON] block |
| Next: quant vague what to track | ❌ FAIL | 55.4 | minToolCalls not met: got 0 expected >= 1 |
| Next: quant tool-driven signal set JSON | ✅ PASS | 65.2 | - |
| Next: product vague UI usable | ✅ PASS | 209.6 | - |
| Next: product tool-driven expandable card schema | ✅ PASS | 110.0 | - |
| Next: sales vague shareable | ✅ PASS | 55.8 | - |
| Next: sales tool-driven one-screen + objections | ❌ FAIL | 99.7 | Missing [DEBRIEF_V1_JSON] block |
| Stress: ambiguous persona (wedge + outreach) | ❌ FAIL | 28.7 | Missing [DEBRIEF_V1_JSON] block |
| Stress: contradiction handling (Seed vs Series A) | ❌ FAIL | 14.5 | Missing [DEBRIEF_V1_JSON] block |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 168.3 | Missing [DEBRIEF_V1_JSON] block |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ✅ PASS | 159.2 | - |

### deepseek-v3.2

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 46.1 | - |
| Next: banker tool-driven outbound pack | ✅ PASS | 251.6 | - |
| Next: VC vague wedge | ✅ PASS | 74.3 | - |
| Next: VC tool-driven comps + diligence | ❌ FAIL | 80.2 | Missing [DEBRIEF_V1_JSON] block |
| Next: CTO vague exposure | ✅ PASS | 52.7 | - |
| Next: CTO tool-driven CVE plan | ✅ PASS | 199.0 | - |
| Next: founder vague positioning | ❌ FAIL | 112.3 | Missing [DEBRIEF_V1_JSON] block |
| Next: founder tool-driven memo | ✅ PASS | 156.9 | - |
| Next: academic vague anchor | ❌ FAIL | 21.6 | Missing [DEBRIEF_V1_JSON] block |
| Next: academic tool-driven literature debrief | ❌ FAIL | 39.5 | Missing [DEBRIEF_V1_JSON] block |
| Next: exec vague standardize | ❌ FAIL | 80.5 | Missing [DEBRIEF_V1_JSON] block |
| Next: exec tool-driven cost model | ✅ PASS | 99.4 | - |
| Next: ecosystem vague incident | ❌ FAIL | 122.7 | Missing [DEBRIEF_V1_JSON] block |
| Next: ecosystem tool-driven second-order brief | ✅ PASS | 236.0 | - |
| Next: quant vague what to track | ✅ PASS | 69.6 | - |
| Next: quant tool-driven signal set JSON | ❌ FAIL | 16.2 | Missing [DEBRIEF_V1_JSON] block |
| Next: product vague UI usable | ❌ FAIL | 19.1 | Missing [DEBRIEF_V1_JSON] block |
| Next: product tool-driven expandable card schema | ✅ PASS | 173.6 | - |
| Next: sales vague shareable | ✅ PASS | 82.8 | - |
| Next: sales tool-driven one-screen + objections | ❌ FAIL | 50.6 | hqLocation does not match ground truth |
| Stress: ambiguous persona (wedge + outreach) | ✅ PASS | 79.7 | - |
| Stress: contradiction handling (Seed vs Series A) | ❌ FAIL | 32.9 | Missing [DEBRIEF_V1_JSON] block |
| offset:22 | ❌ FAIL | 300.7 | - |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ❌ FAIL | 148.1 | maxToolCalls exceeded: got 5 expected <= 3 |

### qwen3-235b

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 91.6 | - |
| Next: banker tool-driven outbound pack | ✅ PASS | 100.6 | - |
| Next: VC vague wedge | ❌ FAIL | 76.0 | Missing [DEBRIEF_V1_JSON] block |
| Next: VC tool-driven comps + diligence | ❌ FAIL | 52.7 | Missing [DEBRIEF_V1_JSON] block |
| Next: CTO vague exposure | ❌ FAIL | 52.7 | Missing [DEBRIEF_V1_JSON] block |
| Next: CTO tool-driven CVE plan | ✅ PASS | 81.7 | - |
| Next: founder vague positioning | ❌ FAIL | 15.7 | Missing [DEBRIEF_V1_JSON] block |
| Next: founder tool-driven memo | ❌ FAIL | 143.7 | Invalid JSON: Expected ',' or ']' after array element in JSON at position 244 |
| Next: academic vague anchor | ✅ PASS | 81.0 | - |
| Next: academic tool-driven literature debrief | ✅ PASS | 104.1 | - |
| Next: exec vague standardize | ✅ PASS | 96.0 | - |
| Next: exec tool-driven cost model | ❌ FAIL | 115.2 | entity mismatch: got resolvedId='google-gemini-3' canonical='Gemini3' expected ' |
| Next: ecosystem vague incident | ❌ FAIL | 56.7 | Missing [DEBRIEF_V1_JSON] block |
| Next: ecosystem tool-driven second-order brief | ❌ FAIL | 15.3 | Missing [DEBRIEF_V1_JSON] block |
| Next: quant vague what to track | ❌ FAIL | 45.1 | Missing [DEBRIEF_V1_JSON] block |
| Next: quant tool-driven signal set JSON | ✅ PASS | 77.0 | - |
| Next: product vague UI usable | ❌ FAIL | 63.5 | persona mismatch: got JPM_STARTUP_BANKER expected PRODUCT_DESIGNER |
| Next: product tool-driven expandable card schema | ❌ FAIL | 16.1 | Missing [DEBRIEF_V1_JSON] block |
| Next: sales vague shareable | ❌ FAIL | 43.3 | persona mismatch: got JPM_STARTUP_BANKER expected SALES_ENGINEER |
| Next: sales tool-driven one-screen + objections | ❌ FAIL | 76.5 | Missing [DEBRIEF_V1_JSON] block |
| Stress: ambiguous persona (wedge + outreach) | ✅ PASS | 67.0 | - |
| Stress: contradiction handling (Seed vs Series A) | ❌ FAIL | 52.2 | Invalid JSON: Unexpected non-whitespace character after JSON at position 1376 |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 14.6 | Missing [DEBRIEF_V1_JSON] block |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ❌ FAIL | 60.7 | Missing [DEBRIEF_V1_JSON] block |

### minimax-m2.1

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 32.4 | - |
| Next: banker tool-driven outbound pack | ✅ PASS | 39.8 | - |
| Next: VC vague wedge | ✅ PASS | 39.8 | - |
| Next: VC tool-driven comps + diligence | ✅ PASS | 71.0 | - |
| Next: CTO vague exposure | ✅ PASS | 20.6 | - |
| Next: CTO tool-driven CVE plan | ✅ PASS | 66.1 | - |
| Next: founder vague positioning | ✅ PASS | 70.5 | - |
| Next: founder tool-driven memo | ✅ PASS | 111.9 | - |
| Next: academic vague anchor | ❌ FAIL | 47.3 | Missing [DEBRIEF_V1_JSON] block |
| Next: academic tool-driven literature debrief | ❌ FAIL | 12.9 | Missing [DEBRIEF_V1_JSON] block |
| Next: exec vague standardize | ✅ PASS | 27.7 | - |
| Next: exec tool-driven cost model | ✅ PASS | 74.5 | - |
| Next: ecosystem vague incident | ✅ PASS | 23.8 | - |
| Next: ecosystem tool-driven second-order brief | ❌ FAIL | 63.3 | Missing [DEBRIEF_V1_JSON] block |
| Next: quant vague what to track | ✅ PASS | 30.0 | - |
| Next: quant tool-driven signal set JSON | ✅ PASS | 32.7 | - |
| Next: product vague UI usable | ❌ FAIL | 20.8 | persona mismatch: got JPM_STARTUP_BANKER expected PRODUCT_DESIGNER |
| Next: product tool-driven expandable card schema | ✅ PASS | 22.3 | - |
| Next: sales vague shareable | ✅ PASS | 22.8 | - |
| Next: sales tool-driven one-screen + objections | ❌ FAIL | 92.3 | persona mismatch: got JPM_STARTUP_BANKER expected SALES_ENGINEER |
| Stress: ambiguous persona (wedge + outreach) | ✅ PASS | 18.3 | - |
| Stress: contradiction handling (Seed vs Series A) | ✅ PASS | 31.1 | - |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 113.1 | persona mismatch: got EARLY_STAGE_VC expected ENTERPRISE_EXEC |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ❌ FAIL | 91.2 | missing verification loop (no planSteps entry includes 'verify' or 'validate') |

### mimo-v2-flash-free

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ❌ FAIL | 16.6 | Missing [DEBRIEF_V1_JSON] block |
| Next: banker tool-driven outbound pack | ✅ PASS | 54.7 | - |
| Next: VC vague wedge | ✅ PASS | 59.9 | - |
| Next: VC tool-driven comps + diligence | ✅ PASS | 85.2 | - |
| Next: CTO vague exposure | ✅ PASS | 23.6 | - |
| Next: CTO tool-driven CVE plan | ❌ FAIL | 177.2 | missing ground truth citation anchor in grounding[] |
| Next: founder vague positioning | ✅ PASS | 31.2 | - |
| Next: founder tool-driven memo | ✅ PASS | 76.4 | - |
| Next: academic vague anchor | ✅ PASS | 36.1 | - |
| Next: academic tool-driven literature debrief | ❌ FAIL | 9.1 | Missing [DEBRIEF_V1_JSON] block |
| Next: exec vague standardize | ✅ PASS | 31.4 | - |
| Next: exec tool-driven cost model | ✅ PASS | 54.9 | - |
| Next: ecosystem vague incident | ❌ FAIL | 71.2 | persona mismatch: got EARLY_STAGE_VC expected ECOSYSTEM_PARTNER |
| Next: ecosystem tool-driven second-order brief | ❌ FAIL | 11.0 | Missing [DEBRIEF_V1_JSON] block |
| Next: quant vague what to track | ✅ PASS | 38.7 | - |
| Next: quant tool-driven signal set JSON | ❌ FAIL | 61.5 | Missing [DEBRIEF_V1_JSON] block |
| Next: product vague UI usable | ❌ FAIL | 17.7 | persona mismatch: got EARLY_STAGE_VC expected PRODUCT_DESIGNER |
| Next: product tool-driven expandable card schema | ✅ PASS | 28.9 | - |
| Next: sales vague shareable | ❌ FAIL | 16.4 | persona mismatch: got JPM_STARTUP_BANKER expected SALES_ENGINEER |
| Next: sales tool-driven one-screen + objections | ❌ FAIL | 15.0 | persona mismatch: got JPM_STARTUP_BANKER expected SALES_ENGINEER |
| Stress: ambiguous persona (wedge + outreach) | ✅ PASS | 16.4 | - |
| Stress: contradiction handling (Seed vs Series A) | ✅ PASS | 15.5 | - |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 103.6 | persona mismatch: got EARLY_STAGE_VC expected ENTERPRISE_EXEC |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ✅ PASS | 34.9 | - |

## Disclosure Metrics (P0 Instrumentation)

### Disclosure Level by Model

| Model | Full | Partial | None |
|-------|------|---------|------|
| claude-haiku-4.5 | 0 | 0 | 24 |
| gpt-5-mini | 0 | 0 | 24 |
| gemini-3-flash | 0 | 0 | 24 |
| deepseek-r1 | 0 | 0 | 24 |
| deepseek-v3.2 | 0 | 2 | 21 |
| qwen3-235b | 0 | 0 | 24 |
| minimax-m2.1 | 0 | 0 | 24 |
| mimo-v2-flash-free | 0 | 1 | 23 |

### Disclosure Warnings (Non-Scored)

> **Note:** These warnings are informational and do not affect pass/fail.
> They track progressive disclosure usage for Week 1-2 observability.

⚠️ [claude-haiku-4.5/next_banker_vague_disco_cover_this_week] No skill search before tool invoke
⚠️ [claude-haiku-4.5/next_banker_vague_disco_cover_this_week] No progressive disclosure meta-tools used
⚠️ [claude-haiku-4.5/next_banker_tool_ambros_outbound_pack] No skill search before tool invoke
⚠️ [claude-haiku-4.5/next_banker_tool_ambros_outbound_pack] No progressive disclosure meta-tools used
⚠️ [claude-haiku-4.5/next_vc_vague_disco_wedge] No skill search before tool invoke
⚠️ [claude-haiku-4.5/next_vc_vague_disco_wedge] No skill search for EARLY_STAGE_VC scenario
⚠️ [claude-haiku-4.5/next_vc_vague_disco_wedge] No progressive disclosure meta-tools used
⚠️ [claude-haiku-4.5/next_vc_tool_disco_comps] No skill search before tool invoke
⚠️ [claude-haiku-4.5/next_vc_tool_disco_comps] No skill search for EARLY_STAGE_VC scenario
⚠️ [claude-haiku-4.5/next_vc_tool_disco_comps] No progressive disclosure meta-tools used
⚠️ [claude-haiku-4.5/next_cto_vague_quickjs_exposure] No skill search before tool invoke
⚠️ [claude-haiku-4.5/next_cto_vague_quickjs_exposure] No skill search for CTO_TECH_LEAD scenario
⚠️ [claude-haiku-4.5/next_cto_vague_quickjs_exposure] No progressive disclosure meta-tools used
⚠️ [claude-haiku-4.5/next_cto_tool_cve_plan] No skill search before tool invoke
⚠️ [claude-haiku-4.5/next_cto_tool_cve_plan] No skill search for CTO_TECH_LEAD scenario
⚠️ [claude-haiku-4.5/next_cto_tool_cve_plan] No progressive disclosure meta-tools used
⚠️ [claude-haiku-4.5/next_founder_vague_salesforce_agentforce] No skill search before tool invoke
⚠️ [claude-haiku-4.5/next_founder_vague_salesforce_agentforce] No skill search for FOUNDER_STRATEGY scenario
⚠️ [claude-haiku-4.5/next_founder_vague_salesforce_agentforce] No progressive disclosure meta-tools used
⚠️ [claude-haiku-4.5/next_founder_tool_salesforce_memo] No skill search before tool invoke
⚠️ [claude-haiku-4.5/next_founder_tool_salesforce_memo] No skill search for FOUNDER_STRATEGY scenario
⚠️ [claude-haiku-4.5/next_founder_tool_salesforce_memo] No progressive disclosure meta-tools used
⚠️ [claude-haiku-4.5/next_academic_vague_ryr2_alz] No skill search before tool invoke
⚠️ [claude-haiku-4.5/next_academic_vague_ryr2_alz] No skill search for ACADEMIC_RD scenario
⚠️ [claude-haiku-4.5/next_academic_vague_ryr2_alz] No progressive disclosure meta-tools used
⚠️ [claude-haiku-4.5/next_academic_tool_lit_debrief] No skill search for ACADEMIC_RD scenario
⚠️ [claude-haiku-4.5/next_exec_vague_gemini_standardize] No skill search before tool invoke
⚠️ [claude-haiku-4.5/next_exec_vague_gemini_standardize] No skill search for ENTERPRISE_EXEC scenario
⚠️ [claude-haiku-4.5/next_exec_vague_gemini_standardize] No progressive disclosure meta-tools used
⚠️ [claude-haiku-4.5/next_exec_tool_cost_model] No skill search for ENTERPRISE_EXEC scenario
⚠️ [claude-haiku-4.5/next_ecosystem_vague_soundcloud_vpn] No skill search before tool invoke
⚠️ [claude-haiku-4.5/next_ecosystem_vague_soundcloud_vpn] No skill search for ECOSYSTEM_PARTNER scenario
⚠️ [claude-haiku-4.5/next_ecosystem_vague_soundcloud_vpn] No progressive disclosure meta-tools used
⚠️ [claude-haiku-4.5/next_ecosystem_tool_second_order_brief] No skill search for ECOSYSTEM_PARTNER scenario
⚠️ [claude-haiku-4.5/next_quant_vague_disco_track] No skill search before tool invoke
⚠️ [claude-haiku-4.5/next_quant_vague_disco_track] No skill search for QUANT_ANALYST scenario
⚠️ [claude-haiku-4.5/next_quant_vague_disco_track] No progressive disclosure meta-tools used
⚠️ [claude-haiku-4.5/next_quant_tool_signal_json] No skill search before tool invoke
⚠️ [claude-haiku-4.5/next_quant_tool_signal_json] No skill search for QUANT_ANALYST scenario
⚠️ [claude-haiku-4.5/next_quant_tool_signal_json] No progressive disclosure meta-tools used
⚠️ [claude-haiku-4.5/next_product_vague_make_usable_ui] No skill search before tool invoke
⚠️ [claude-haiku-4.5/next_product_vague_make_usable_ui] No skill search for PRODUCT_DESIGNER scenario
⚠️ [claude-haiku-4.5/next_product_vague_make_usable_ui] No progressive disclosure meta-tools used
⚠️ [claude-haiku-4.5/next_product_tool_expandable_card] No skill search for PRODUCT_DESIGNER scenario
⚠️ [claude-haiku-4.5/next_sales_vague_shareable] No skill search before tool invoke
⚠️ [claude-haiku-4.5/next_sales_vague_shareable] No skill search for SALES_ENGINEER scenario
⚠️ [claude-haiku-4.5/next_sales_vague_shareable] No progressive disclosure meta-tools used
⚠️ [claude-haiku-4.5/next_sales_tool_one_screen_objections] No skill search for SALES_ENGINEER scenario
⚠️ [claude-haiku-4.5/stress_ambiguous_persona_disco_wedge_outreach] No skill search before tool invoke
⚠️ [claude-haiku-4.5/stress_ambiguous_persona_disco_wedge_outreach] No progressive disclosure meta-tools used
... and 428 more warnings
