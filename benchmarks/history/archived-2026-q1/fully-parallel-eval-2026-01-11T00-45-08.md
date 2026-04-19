# Fully Parallel Evaluation Results

Generated: 2026-01-11T00:45:08.735Z
Total Time: 300.7s
Suite: pack
Models: 8
Scenarios: 24 of 24 (limit=0)
Total evaluations: 192

## Summary by Model

| Model | Total | Passed | Failed | Avg Time (s) |
|-------|-------|--------|--------|--------------|
| claude-haiku-4.5 | 24 | 1 | 23 | 65.6 |
| gpt-5-mini | 24 | 16 | 8 | 80.7 |
| gemini-3-flash | 24 | 0 | 24 | 13.6 |
| deepseek-r1 | 24 | 11 | 12 | 91.7 |
| deepseek-v3.2 | 24 | 12 | 12 | 77.5 |
| qwen3-235b | 24 | 1 | 23 | 24.3 |
| minimax-m2.1 | 24 | 16 | 8 | 81.1 |
| mimo-v2-flash-free | 24 | 14 | 10 | 58.4 |

## Summary by Scenario

| Scenario | Total | Passed | Failed |
|----------|-------|--------|--------|
| Next: academic tool-driven literature debrief | 8 | 3 | 5 |
| Next: academic vague anchor | 8 | 3 | 5 |
| Next: banker tool-driven outbound pack | 8 | 2 | 6 |
| Next: banker vague (fast debrief) | 8 | 6 | 2 |
| Next: CTO tool-driven CVE plan | 8 | 3 | 5 |
| Next: CTO vague exposure | 8 | 3 | 5 |
| Next: ecosystem tool-driven second-order brief | 8 | 4 | 4 |
| Next: ecosystem vague incident | 8 | 2 | 6 |
| Next: exec tool-driven cost model | 8 | 4 | 4 |
| Next: exec vague standardize | 8 | 0 | 8 |
| Next: founder tool-driven memo | 8 | 0 | 8 |
| Next: founder vague positioning | 8 | 2 | 6 |
| Next: product tool-driven expandable card schema | 8 | 4 | 4 |
| Next: product vague UI usable | 8 | 2 | 6 |
| Next: quant tool-driven signal set JSON | 8 | 5 | 3 |
| Next: quant vague what to track | 8 | 1 | 7 |
| Next: sales tool-driven one-screen + objections | 8 | 5 | 3 |
| Next: sales vague shareable | 8 | 4 | 4 |
| Next: VC tool-driven comps + diligence | 8 | 4 | 4 |
| Next: VC vague wedge | 8 | 4 | 4 |
| offset:22 | 1 | 0 | 1 |
| Pack: exec cross-provider pricing comparison | 7 | 0 | 7 |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | 8 | 1 | 7 |
| Stress: ambiguous persona (wedge + outreach) | 8 | 5 | 3 |
| Stress: contradiction handling (Seed vs Series A) | 8 | 4 | 4 |

## Detailed Results

### claude-haiku-4.5

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 18.1 | - |
| Next: banker tool-driven outbound pack | ❌ FAIL | 119.0 | persona mismatch: got SALES_ENGINEER expected JPM_STARTUP_BANKER |
| Next: VC vague wedge | ❌ FAIL | 64.7 | Missing [DEBRIEF_V1_JSON] block |
| Next: VC tool-driven comps + diligence | ❌ FAIL | 178.8 | contact.email missing or mismatched |
| Next: CTO vague exposure | ❌ FAIL | 64.4 | Missing [DEBRIEF_V1_JSON] block |
| Next: CTO tool-driven CVE plan | ❌ FAIL | 65.4 | Missing [DEBRIEF_V1_JSON] block |
| Next: founder vague positioning | ❌ FAIL | 64.8 | Missing [DEBRIEF_V1_JSON] block |
| Next: founder tool-driven memo | ❌ FAIL | 59.3 | Missing [DEBRIEF_V1_JSON] block |
| Next: academic vague anchor | ❌ FAIL | 53.0 | Missing [DEBRIEF_V1_JSON] block |
| Next: academic tool-driven literature debrief | ❌ FAIL | 64.9 | Missing [DEBRIEF_V1_JSON] block |
| Next: exec vague standardize | ❌ FAIL | 53.3 | Missing [DEBRIEF_V1_JSON] block |
| Next: exec tool-driven cost model | ❌ FAIL | 62.1 | Missing [DEBRIEF_V1_JSON] block |
| Next: ecosystem vague incident | ❌ FAIL | 55.0 | Missing [DEBRIEF_V1_JSON] block |
| Next: ecosystem tool-driven second-order brief | ❌ FAIL | 53.0 | Missing [DEBRIEF_V1_JSON] block |
| Next: quant vague what to track | ❌ FAIL | 55.9 | Missing [DEBRIEF_V1_JSON] block |
| Next: quant tool-driven signal set JSON | ❌ FAIL | 59.2 | Missing [DEBRIEF_V1_JSON] block |
| Next: product vague UI usable | ❌ FAIL | 64.6 | Missing [DEBRIEF_V1_JSON] block |
| Next: product tool-driven expandable card schema | ❌ FAIL | 55.0 | Missing [DEBRIEF_V1_JSON] block |
| Next: sales vague shareable | ❌ FAIL | 55.9 | Missing [DEBRIEF_V1_JSON] block |
| Next: sales tool-driven one-screen + objections | ❌ FAIL | 56.0 | Missing [DEBRIEF_V1_JSON] block |
| Stress: ambiguous persona (wedge + outreach) | ❌ FAIL | 64.5 | Missing [DEBRIEF_V1_JSON] block |
| Stress: contradiction handling (Seed vs Series A) | ❌ FAIL | 64.9 | Missing [DEBRIEF_V1_JSON] block |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 59.1 | Missing [DEBRIEF_V1_JSON] block |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ❌ FAIL | 64.4 | Missing [DEBRIEF_V1_JSON] block |

### gpt-5-mini

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 77.5 | - |
| Next: banker tool-driven outbound pack | ✅ PASS | 49.0 | - |
| Next: VC vague wedge | ✅ PASS | 58.3 | - |
| Next: VC tool-driven comps + diligence | ✅ PASS | 84.9 | - |
| Next: CTO vague exposure | ✅ PASS | 58.7 | - |
| Next: CTO tool-driven CVE plan | ✅ PASS | 93.5 | - |
| Next: founder vague positioning | ✅ PASS | 66.2 | - |
| Next: founder tool-driven memo | ❌ FAIL | 140.9 | missing required tools: expected lookupGroundTruthEntity got [searchAvailableSki |
| Next: academic vague anchor | ✅ PASS | 53.6 | - |
| Next: academic tool-driven literature debrief | ❌ FAIL | 177.3 | missing required tools: expected lookupGroundTruthEntity got [searchAvailableSki |
| Next: exec vague standardize | ❌ FAIL | 71.9 | persona mismatch: got CTO_TECH_LEAD expected ENTERPRISE_EXEC |
| Next: exec tool-driven cost model | ✅ PASS | 92.8 | - |
| Next: ecosystem vague incident | ❌ FAIL | 59.0 | persona mismatch: got CTO_TECH_LEAD expected ECOSYSTEM_PARTNER |
| Next: ecosystem tool-driven second-order brief | ✅ PASS | 72.5 | - |
| Next: quant vague what to track | ✅ PASS | 64.5 | - |
| Next: quant tool-driven signal set JSON | ✅ PASS | 66.3 | - |
| Next: product vague UI usable | ❌ FAIL | 48.3 | persona mismatch: got JPM_STARTUP_BANKER expected PRODUCT_DESIGNER |
| Next: product tool-driven expandable card schema | ✅ PASS | 91.2 | - |
| Next: sales vague shareable | ❌ FAIL | 51.1 | persona mismatch: got JPM_STARTUP_BANKER expected SALES_ENGINEER |
| Next: sales tool-driven one-screen + objections | ✅ PASS | 51.4 | - |
| Stress: ambiguous persona (wedge + outreach) | ✅ PASS | 71.8 | - |
| Stress: contradiction handling (Seed vs Series A) | ✅ PASS | 71.6 | - |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 183.5 | persona mismatch: got CTO_TECH_LEAD expected ENTERPRISE_EXEC |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ❌ FAIL | 80.5 | missing verification loop (no planSteps entry includes verify/validate/confirm/c |

### gemini-3-flash

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ❌ FAIL | 13.7 | Missing [DEBRIEF_V1_JSON] block |
| Next: banker tool-driven outbound pack | ❌ FAIL | 14.3 | Missing [DEBRIEF_V1_JSON] block |
| Next: VC vague wedge | ❌ FAIL | 13.1 | Missing [DEBRIEF_V1_JSON] block |
| Next: VC tool-driven comps + diligence | ❌ FAIL | 14.0 | Missing [DEBRIEF_V1_JSON] block |
| Next: CTO vague exposure | ❌ FAIL | 12.8 | Missing [DEBRIEF_V1_JSON] block |
| Next: CTO tool-driven CVE plan | ❌ FAIL | 12.7 | Missing [DEBRIEF_V1_JSON] block |
| Next: founder vague positioning | ❌ FAIL | 13.0 | Missing [DEBRIEF_V1_JSON] block |
| Next: founder tool-driven memo | ❌ FAIL | 12.9 | Missing [DEBRIEF_V1_JSON] block |
| Next: academic vague anchor | ❌ FAIL | 13.5 | Missing [DEBRIEF_V1_JSON] block |
| Next: academic tool-driven literature debrief | ❌ FAIL | 12.9 | Missing [DEBRIEF_V1_JSON] block |
| Next: exec vague standardize | ❌ FAIL | 13.4 | Missing [DEBRIEF_V1_JSON] block |
| Next: exec tool-driven cost model | ❌ FAIL | 13.4 | Missing [DEBRIEF_V1_JSON] block |
| Next: ecosystem vague incident | ❌ FAIL | 14.0 | Missing [DEBRIEF_V1_JSON] block |
| Next: ecosystem tool-driven second-order brief | ❌ FAIL | 13.7 | Missing [DEBRIEF_V1_JSON] block |
| Next: quant vague what to track | ❌ FAIL | 13.7 | Missing [DEBRIEF_V1_JSON] block |
| Next: quant tool-driven signal set JSON | ❌ FAIL | 13.0 | Missing [DEBRIEF_V1_JSON] block |
| Next: product vague UI usable | ❌ FAIL | 13.4 | Missing [DEBRIEF_V1_JSON] block |
| Next: product tool-driven expandable card schema | ❌ FAIL | 13.9 | Missing [DEBRIEF_V1_JSON] block |
| Next: sales vague shareable | ❌ FAIL | 13.3 | Missing [DEBRIEF_V1_JSON] block |
| Next: sales tool-driven one-screen + objections | ❌ FAIL | 12.8 | Missing [DEBRIEF_V1_JSON] block |
| Stress: ambiguous persona (wedge + outreach) | ❌ FAIL | 15.8 | Missing [DEBRIEF_V1_JSON] block |
| Stress: contradiction handling (Seed vs Series A) | ❌ FAIL | 14.3 | Missing [DEBRIEF_V1_JSON] block |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 13.7 | Missing [DEBRIEF_V1_JSON] block |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ❌ FAIL | 14.6 | Missing [DEBRIEF_V1_JSON] block |

### deepseek-r1

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 96.4 | - |
| Next: banker tool-driven outbound pack | ❌ FAIL | 18.8 | Missing [DEBRIEF_V1_JSON] block |
| Next: VC vague wedge | ❌ FAIL | 13.1 | Missing [DEBRIEF_V1_JSON] block |
| Next: VC tool-driven comps + diligence | ❌ FAIL | 256.9 | Missing [DEBRIEF_V1_JSON] block |
| Next: CTO vague exposure | ❌ FAIL | 56.4 | Missing [DEBRIEF_V1_JSON] block |
| Next: CTO tool-driven CVE plan | ❌ FAIL | 33.5 | Missing [DEBRIEF_V1_JSON] block |
| Next: founder vague positioning | ❌ FAIL | 90.0 | Missing [DEBRIEF_V1_JSON] block |
| Next: founder tool-driven memo | ❌ FAIL | 98.5 | Missing [DEBRIEF_V1_JSON] block |
| Next: academic vague anchor | ✅ PASS | 101.4 | - |
| Next: academic tool-driven literature debrief | ❌ FAIL | 117.0 | Missing [DEBRIEF_V1_JSON] block |
| Next: exec vague standardize | ❌ FAIL | 10.0 | Missing [DEBRIEF_V1_JSON] block |
| Next: exec tool-driven cost model | ✅ PASS | 87.6 | - |
| Next: ecosystem vague incident | ✅ PASS | 85.0 | - |
| Next: ecosystem tool-driven second-order brief | ❌ FAIL | 59.4 | Missing [DEBRIEF_V1_JSON] block |
| Next: quant vague what to track | ❌ FAIL | 17.3 | Missing [DEBRIEF_V1_JSON] block |
| Next: quant tool-driven signal set JSON | ✅ PASS | 151.7 | - |
| Next: product vague UI usable | ❌ FAIL | 14.3 | Missing [DEBRIEF_V1_JSON] block |
| Next: product tool-driven expandable card schema | ✅ PASS | 125.8 | - |
| Next: sales vague shareable | ✅ PASS | 62.7 | - |
| Next: sales tool-driven one-screen + objections | ✅ PASS | 56.1 | - |
| Stress: ambiguous persona (wedge + outreach) | ✅ PASS | 73.9 | - |
| Stress: contradiction handling (Seed vs Series A) | ✅ PASS | 77.6 | - |
| offset:22 | ❌ FAIL | 300.6 | - |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ✅ PASS | 196.4 | - |

### deepseek-v3.2

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 74.9 | - |
| Next: banker tool-driven outbound pack | ❌ FAIL | 57.2 | Missing [DEBRIEF_V1_JSON] block |
| Next: VC vague wedge | ✅ PASS | 61.2 | - |
| Next: VC tool-driven comps + diligence | ❌ FAIL | 167.7 | Missing [DEBRIEF_V1_JSON] block |
| Next: CTO vague exposure | ❌ FAIL | 28.4 | Missing [DEBRIEF_V1_JSON] block |
| Next: CTO tool-driven CVE plan | ✅ PASS | 170.7 | - |
| Next: founder vague positioning | ❌ FAIL | 21.4 | Missing [DEBRIEF_V1_JSON] block |
| Next: founder tool-driven memo | ❌ FAIL | 270.9 | missing ground truth citation anchor in grounding[] |
| Next: academic vague anchor | ✅ PASS | 71.8 | - |
| Next: academic tool-driven literature debrief | ✅ PASS | 103.7 | - |
| Next: exec vague standardize | ❌ FAIL | 11.1 | Missing [DEBRIEF_V1_JSON] block |
| Next: exec tool-driven cost model | ✅ PASS | 113.0 | - |
| Next: ecosystem vague incident | ❌ FAIL | 29.5 | Missing [DEBRIEF_V1_JSON] block |
| Next: ecosystem tool-driven second-order brief | ✅ PASS | 112.9 | - |
| Next: quant vague what to track | ❌ FAIL | 29.6 | Missing [DEBRIEF_V1_JSON] block |
| Next: quant tool-driven signal set JSON | ✅ PASS | 94.7 | - |
| Next: product vague UI usable | ✅ PASS | 63.1 | - |
| Next: product tool-driven expandable card schema | ❌ FAIL | 21.7 | Missing [DEBRIEF_V1_JSON] block |
| Next: sales vague shareable | ✅ PASS | 61.4 | - |
| Next: sales tool-driven one-screen + objections | ✅ PASS | 82.1 | - |
| Stress: ambiguous persona (wedge + outreach) | ✅ PASS | 47.8 | - |
| Stress: contradiction handling (Seed vs Series A) | ❌ FAIL | 23.8 | Missing [DEBRIEF_V1_JSON] block |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 48.6 | Missing [DEBRIEF_V1_JSON] block |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ❌ FAIL | 93.7 | missing verification loop (no planSteps entry includes verify/validate/confirm/c |

### qwen3-235b

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ❌ FAIL | 15.9 | Missing [DEBRIEF_V1_JSON] block |
| Next: banker tool-driven outbound pack | ❌ FAIL | 15.9 | Missing [DEBRIEF_V1_JSON] block |
| Next: VC vague wedge | ❌ FAIL | 14.5 | Missing [DEBRIEF_V1_JSON] block |
| Next: VC tool-driven comps + diligence | ✅ PASS | 80.7 | - |
| Next: CTO vague exposure | ❌ FAIL | 14.1 | Missing [DEBRIEF_V1_JSON] block |
| Next: CTO tool-driven CVE plan | ❌ FAIL | 14.3 | Missing [DEBRIEF_V1_JSON] block |
| Next: founder vague positioning | ❌ FAIL | 70.7 | Missing [DEBRIEF_V1_JSON] block |
| Next: founder tool-driven memo | ❌ FAIL | 14.4 | Missing [DEBRIEF_V1_JSON] block |
| Next: academic vague anchor | ❌ FAIL | 14.0 | Missing [DEBRIEF_V1_JSON] block |
| Next: academic tool-driven literature debrief | ❌ FAIL | 14.5 | Missing [DEBRIEF_V1_JSON] block |
| Next: exec vague standardize | ❌ FAIL | 13.9 | Missing [DEBRIEF_V1_JSON] block |
| Next: exec tool-driven cost model | ❌ FAIL | 16.6 | Missing [DEBRIEF_V1_JSON] block |
| Next: ecosystem vague incident | ❌ FAIL | 14.4 | Missing [DEBRIEF_V1_JSON] block |
| Next: ecosystem tool-driven second-order brief | ❌ FAIL | 14.1 | Missing [DEBRIEF_V1_JSON] block |
| Next: quant vague what to track | ❌ FAIL | 14.5 | Missing [DEBRIEF_V1_JSON] block |
| Next: quant tool-driven signal set JSON | ❌ FAIL | 14.3 | Missing [DEBRIEF_V1_JSON] block |
| Next: product vague UI usable | ❌ FAIL | 13.9 | Missing [DEBRIEF_V1_JSON] block |
| Next: product tool-driven expandable card schema | ❌ FAIL | 15.9 | Missing [DEBRIEF_V1_JSON] block |
| Next: sales vague shareable | ❌ FAIL | 14.0 | Missing [DEBRIEF_V1_JSON] block |
| Next: sales tool-driven one-screen + objections | ❌ FAIL | 30.8 | Missing [DEBRIEF_V1_JSON] block |
| Stress: ambiguous persona (wedge + outreach) | ❌ FAIL | 14.1 | Missing [DEBRIEF_V1_JSON] block |
| Stress: contradiction handling (Seed vs Series A) | ❌ FAIL | 31.2 | Missing [DEBRIEF_V1_JSON] block |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 93.6 | persona mismatch: got QUANT_ANALYST expected ENTERPRISE_EXEC |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ❌ FAIL | 14.3 | Missing [DEBRIEF_V1_JSON] block |

### minimax-m2.1

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 36.6 | - |
| Next: banker tool-driven outbound pack | ✅ PASS | 81.0 | - |
| Next: VC vague wedge | ✅ PASS | 45.5 | - |
| Next: VC tool-driven comps + diligence | ✅ PASS | 128.9 | - |
| Next: CTO vague exposure | ✅ PASS | 83.3 | - |
| Next: CTO tool-driven CVE plan | ✅ PASS | 69.8 | - |
| Next: founder vague positioning | ❌ FAIL | 138.7 | Missing [DEBRIEF_V1_JSON] block |
| Next: founder tool-driven memo | ❌ FAIL | 172.7 | persona mismatch: got EARLY_STAGE_VC expected FOUNDER_STRATEGY |
| Next: academic vague anchor | ❌ FAIL | 96.6 | missing ground truth citation anchor in grounding[] |
| Next: academic tool-driven literature debrief | ✅ PASS | 204.7 | - |
| Next: exec vague standardize | ❌ FAIL | 29.2 | persona mismatch: got CTO_TECH_LEAD expected ENTERPRISE_EXEC |
| Next: exec tool-driven cost model | ✅ PASS | 109.4 | - |
| Next: ecosystem vague incident | ✅ PASS | 113.3 | - |
| Next: ecosystem tool-driven second-order brief | ✅ PASS | 119.7 | - |
| Next: quant vague what to track | ❌ FAIL | 22.5 | Missing [DEBRIEF_V1_JSON] block |
| Next: quant tool-driven signal set JSON | ✅ PASS | 76.1 | - |
| Next: product vague UI usable | ❌ FAIL | 40.3 | persona mismatch: got JPM_STARTUP_BANKER expected PRODUCT_DESIGNER |
| Next: product tool-driven expandable card schema | ✅ PASS | 53.4 | - |
| Next: sales vague shareable | ✅ PASS | 20.0 | - |
| Next: sales tool-driven one-screen + objections | ✅ PASS | 25.4 | - |
| Stress: ambiguous persona (wedge + outreach) | ✅ PASS | 65.6 | - |
| Stress: contradiction handling (Seed vs Series A) | ✅ PASS | 76.5 | - |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 92.6 | missing ground truth citation anchor in grounding[] |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ❌ FAIL | 44.5 | contact.email missing or mismatched |

### mimo-v2-flash-free

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 23.8 | - |
| Next: banker tool-driven outbound pack | ❌ FAIL | 52.5 | persona mismatch: got SALES_ENGINEER expected JPM_STARTUP_BANKER |
| Next: VC vague wedge | ✅ PASS | 31.2 | - |
| Next: VC tool-driven comps + diligence | ✅ PASS | 117.3 | - |
| Next: CTO vague exposure | ✅ PASS | 24.1 | - |
| Next: CTO tool-driven CVE plan | ❌ FAIL | 84.5 | entity mismatch: got resolvedId='N/A' canonical='CVE-2025-62495' expected 'MQUIC |
| Next: founder vague positioning | ✅ PASS | 55.8 | - |
| Next: founder tool-driven memo | ❌ FAIL | 107.5 | missing ground truth citation anchor in grounding[] |
| Next: academic vague anchor | ❌ FAIL | 35.0 | persona.inferred must be a known persona |
| Next: academic tool-driven literature debrief | ✅ PASS | 90.2 | - |
| Next: exec vague standardize | ❌ FAIL | 49.9 | persona mismatch: got CTO_TECH_LEAD expected ENTERPRISE_EXEC |
| Next: exec tool-driven cost model | ❌ FAIL | 48.6 | missing ground truth citation anchor in grounding[] |
| Next: ecosystem vague incident | ❌ FAIL | 155.6 | persona mismatch: got CTO_TECH_LEAD expected ECOSYSTEM_PARTNER |
| Next: ecosystem tool-driven second-order brief | ✅ PASS | 57.1 | - |
| Next: quant vague what to track | ❌ FAIL | 23.3 | persona mismatch: got EARLY_STAGE_VC expected QUANT_ANALYST |
| Next: quant tool-driven signal set JSON | ✅ PASS | 41.7 | - |
| Next: product vague UI usable | ✅ PASS | 27.6 | - |
| Next: product tool-driven expandable card schema | ✅ PASS | 31.7 | - |
| Next: sales vague shareable | ✅ PASS | 21.8 | - |
| Next: sales tool-driven one-screen + objections | ✅ PASS | 23.1 | - |
| Stress: ambiguous persona (wedge + outreach) | ✅ PASS | 24.6 | - |
| Stress: contradiction handling (Seed vs Series A) | ✅ PASS | 18.5 | - |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 87.5 | Invalid JSON: Unexpected token '`', "```json
{
"... is not valid JSON |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ❌ FAIL | 168.7 | maxToolCalls exceeded: got 12 expected <= 3 |

## Disclosure Metrics (P0 Instrumentation)

### Disclosure Level by Model

| Model | Full | Partial | None |
|-------|------|---------|------|
| claude-haiku-4.5 | 0 | 17 | 7 |
| gpt-5-mini | 0 | 24 | 0 |
| gemini-3-flash | 0 | 24 | 0 |
| deepseek-r1 | 0 | 15 | 8 |
| deepseek-v3.2 | 0 | 20 | 4 |
| qwen3-235b | 0 | 3 | 21 |
| minimax-m2.1 | 0 | 22 | 2 |
| mimo-v2-flash-free | 1 | 23 | 0 |

### Disclosure Warnings (Non-Scored)

> **Note:** These warnings are informational and do not affect pass/fail.
> They track progressive disclosure usage for Week 1-2 observability.

⚠️ [deepseek-r1/next_exec_tool_cost_model] No skill search before tool invoke
⚠️ [deepseek-r1/next_exec_tool_cost_model] No skill search for ENTERPRISE_EXEC scenario
⚠️ [deepseek-r1/next_exec_tool_cost_model] No progressive disclosure meta-tools used
⚠️ [deepseek-r1/next_sales_tool_one_screen_objections] No skill search before tool invoke
⚠️ [deepseek-r1/next_sales_tool_one_screen_objections] No skill search for SALES_ENGINEER scenario
⚠️ [deepseek-r1/next_sales_tool_one_screen_objections] No progressive disclosure meta-tools used
⚠️ [deepseek-v3.2/next_vc_tool_disco_comps] Excessive direct tool calls: 12 (>10)
⚠️ [qwen3-235b/next_sales_tool_one_screen_objections] No skill search before tool invoke
⚠️ [qwen3-235b/next_sales_tool_one_screen_objections] No skill search for SALES_ENGINEER scenario
⚠️ [qwen3-235b/next_sales_tool_one_screen_objections] No progressive disclosure meta-tools used
⚠️ [qwen3-235b/stress_contradiction_disco_series_a_claim] No skill search before tool invoke
⚠️ [qwen3-235b/stress_contradiction_disco_series_a_claim] No progressive disclosure meta-tools used
⚠️ [minimax-m2.1/next_founder_tool_salesforce_memo] No skill search before tool invoke
⚠️ [minimax-m2.1/next_founder_tool_salesforce_memo] No skill search for FOUNDER_STRATEGY scenario
⚠️ [minimax-m2.1/next_founder_tool_salesforce_memo] No progressive disclosure meta-tools used
⚠️ [minimax-m2.1/next_ecosystem_vague_soundcloud_vpn] No skill search before tool invoke
