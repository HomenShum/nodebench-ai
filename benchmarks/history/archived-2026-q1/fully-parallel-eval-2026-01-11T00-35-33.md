# Fully Parallel Evaluation Results

Generated: 2026-01-11T00:35:33.010Z
Total Time: 300.8s
Suite: pack
Models: 8
Scenarios: 24 of 24 (limit=0)
Total evaluations: 192

## Summary by Model

| Model | Total | Passed | Failed | Avg Time (s) |
|-------|-------|--------|--------|--------------|
| claude-haiku-4.5 | 24 | 3 | 21 | 62.3 |
| gpt-5-mini | 24 | 19 | 5 | 85.4 |
| gemini-3-flash | 24 | 1 | 23 | 16.3 |
| deepseek-r1 | 24 | 5 | 18 | 94.0 |
| deepseek-v3.2 | 24 | 16 | 8 | 98.1 |
| qwen3-235b | 24 | 1 | 23 | 17.4 |
| minimax-m2.1 | 24 | 16 | 8 | 52.7 |
| mimo-v2-flash-free | 24 | 17 | 7 | 47.4 |

## Summary by Scenario

| Scenario | Total | Passed | Failed |
|----------|-------|--------|--------|
| Next: academic tool-driven literature debrief | 8 | 4 | 4 |
| Next: academic vague anchor | 8 | 4 | 4 |
| Next: banker tool-driven outbound pack | 8 | 1 | 7 |
| Next: banker vague (fast debrief) | 8 | 4 | 4 |
| Next: CTO tool-driven CVE plan | 8 | 3 | 5 |
| Next: CTO vague exposure | 8 | 4 | 4 |
| Next: ecosystem tool-driven second-order brief | 8 | 4 | 4 |
| Next: ecosystem vague incident | 8 | 3 | 5 |
| Next: exec tool-driven cost model | 8 | 3 | 5 |
| Next: exec vague standardize | 8 | 0 | 8 |
| Next: founder tool-driven memo | 8 | 0 | 8 |
| Next: founder vague positioning | 8 | 4 | 4 |
| Next: product tool-driven expandable card schema | 8 | 4 | 4 |
| Next: product vague UI usable | 8 | 4 | 4 |
| Next: quant tool-driven signal set JSON | 8 | 5 | 3 |
| Next: quant vague what to track | 8 | 4 | 4 |
| Next: sales tool-driven one-screen + objections | 8 | 5 | 3 |
| Next: sales vague shareable | 8 | 3 | 5 |
| Next: VC tool-driven comps + diligence | 8 | 3 | 5 |
| Next: VC vague wedge | 8 | 6 | 2 |
| offset:22 | 1 | 0 | 1 |
| Pack: exec cross-provider pricing comparison | 7 | 1 | 6 |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | 8 | 2 | 6 |
| Stress: ambiguous persona (wedge + outreach) | 8 | 4 | 4 |
| Stress: contradiction handling (Seed vs Series A) | 8 | 3 | 5 |

## Detailed Results

### claude-haiku-4.5

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ❌ FAIL | 53.6 | Missing [DEBRIEF_V1_JSON] block |
| Next: banker tool-driven outbound pack | ❌ FAIL | 58.6 | Missing [DEBRIEF_V1_JSON] block |
| Next: VC vague wedge | ✅ PASS | 68.8 | - |
| Next: VC tool-driven comps + diligence | ❌ FAIL | 54.3 | Missing [DEBRIEF_V1_JSON] block |
| Next: CTO vague exposure | ❌ FAIL | 58.6 | Missing [DEBRIEF_V1_JSON] block |
| Next: CTO tool-driven CVE plan | ❌ FAIL | 55.3 | Missing [DEBRIEF_V1_JSON] block |
| Next: founder vague positioning | ❌ FAIL | 65.1 | Missing [DEBRIEF_V1_JSON] block |
| Next: founder tool-driven memo | ❌ FAIL | 58.5 | Missing [DEBRIEF_V1_JSON] block |
| Next: academic vague anchor | ❌ FAIL | 58.5 | Missing [DEBRIEF_V1_JSON] block |
| Next: academic tool-driven literature debrief | ❌ FAIL | 61.8 | Missing [DEBRIEF_V1_JSON] block |
| Next: exec vague standardize | ❌ FAIL | 64.9 | Missing [DEBRIEF_V1_JSON] block |
| Next: exec tool-driven cost model | ❌ FAIL | 53.8 | Missing [DEBRIEF_V1_JSON] block |
| Next: ecosystem vague incident | ❌ FAIL | 62.0 | Missing [DEBRIEF_V1_JSON] block |
| Next: ecosystem tool-driven second-order brief | ✅ PASS | 135.9 | - |
| Next: quant vague what to track | ❌ FAIL | 52.3 | Missing [DEBRIEF_V1_JSON] block |
| Next: quant tool-driven signal set JSON | ❌ FAIL | 62.3 | Missing [DEBRIEF_V1_JSON] block |
| Next: product vague UI usable | ❌ FAIL | 54.3 | Missing [DEBRIEF_V1_JSON] block |
| Next: product tool-driven expandable card schema | ❌ FAIL | 58.7 | Missing [DEBRIEF_V1_JSON] block |
| Next: sales vague shareable | ❌ FAIL | 53.5 | Missing [DEBRIEF_V1_JSON] block |
| Next: sales tool-driven one-screen + objections | ✅ PASS | 72.4 | - |
| Stress: ambiguous persona (wedge + outreach) | ❌ FAIL | 58.5 | Missing [DEBRIEF_V1_JSON] block |
| Stress: contradiction handling (Seed vs Series A) | ❌ FAIL | 58.8 | Missing [DEBRIEF_V1_JSON] block |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 55.7 | Missing [DEBRIEF_V1_JSON] block |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ❌ FAIL | 58.6 | Missing [DEBRIEF_V1_JSON] block |

### gpt-5-mini

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 73.3 | - |
| Next: banker tool-driven outbound pack | ❌ FAIL | 63.5 | persona mismatch: got SALES_ENGINEER expected JPM_STARTUP_BANKER |
| Next: VC vague wedge | ✅ PASS | 85.3 | - |
| Next: VC tool-driven comps + diligence | ✅ PASS | 86.5 | - |
| Next: CTO vague exposure | ✅ PASS | 66.5 | - |
| Next: CTO tool-driven CVE plan | ✅ PASS | 90.5 | - |
| Next: founder vague positioning | ✅ PASS | 77.6 | - |
| Next: founder tool-driven memo | ❌ FAIL | 141.6 | missing required tools: expected lookupGroundTruthEntity got [searchAvailableSki |
| Next: academic vague anchor | ❌ FAIL | 103.1 | entity mismatch: got resolvedId='N/A' canonical='Ryanodine receptor 2 (RyR2)' ex |
| Next: academic tool-driven literature debrief | ✅ PASS | 163.3 | - |
| Next: exec vague standardize | ❌ FAIL | 62.9 | persona mismatch: got CTO_TECH_LEAD expected ENTERPRISE_EXEC |
| Next: exec tool-driven cost model | ✅ PASS | 110.4 | - |
| Next: ecosystem vague incident | ✅ PASS | 65.1 | - |
| Next: ecosystem tool-driven second-order brief | ✅ PASS | 86.0 | - |
| Next: quant vague what to track | ✅ PASS | 75.4 | - |
| Next: quant tool-driven signal set JSON | ✅ PASS | 79.9 | - |
| Next: product vague UI usable | ✅ PASS | 66.1 | - |
| Next: product tool-driven expandable card schema | ✅ PASS | 92.3 | - |
| Next: sales vague shareable | ✅ PASS | 72.0 | - |
| Next: sales tool-driven one-screen + objections | ✅ PASS | 70.5 | - |
| Stress: ambiguous persona (wedge + outreach) | ✅ PASS | 80.1 | - |
| Stress: contradiction handling (Seed vs Series A) | ✅ PASS | 71.1 | - |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 88.0 | missing required tools: expected linkupSearch got [searchAvailableSkills, lookup |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ✅ PASS | 79.7 | - |

### gemini-3-flash

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ❌ FAIL | 14.2 | Missing [DEBRIEF_V1_JSON] block |
| Next: banker tool-driven outbound pack | ❌ FAIL | 14.2 | Missing [DEBRIEF_V1_JSON] block |
| Next: VC vague wedge | ❌ FAIL | 14.0 | Missing [DEBRIEF_V1_JSON] block |
| Next: VC tool-driven comps + diligence | ❌ FAIL | 14.8 | Missing [DEBRIEF_V1_JSON] block |
| Next: CTO vague exposure | ❌ FAIL | 14.4 | Missing [DEBRIEF_V1_JSON] block |
| Next: CTO tool-driven CVE plan | ❌ FAIL | 14.4 | Missing [DEBRIEF_V1_JSON] block |
| Next: founder vague positioning | ❌ FAIL | 14.6 | Missing [DEBRIEF_V1_JSON] block |
| Next: founder tool-driven memo | ❌ FAIL | 15.3 | Missing [DEBRIEF_V1_JSON] block |
| Next: academic vague anchor | ✅ PASS | 32.9 | - |
| Next: academic tool-driven literature debrief | ❌ FAIL | 15.2 | Missing [DEBRIEF_V1_JSON] block |
| Next: exec vague standardize | ❌ FAIL | 14.1 | Missing [DEBRIEF_V1_JSON] block |
| Next: exec tool-driven cost model | ❌ FAIL | 15.2 | Missing [DEBRIEF_V1_JSON] block |
| Next: ecosystem vague incident | ❌ FAIL | 14.2 | Missing [DEBRIEF_V1_JSON] block |
| Next: ecosystem tool-driven second-order brief | ❌ FAIL | 14.8 | Missing [DEBRIEF_V1_JSON] block |
| Next: quant vague what to track | ❌ FAIL | 14.5 | Missing [DEBRIEF_V1_JSON] block |
| Next: quant tool-driven signal set JSON | ❌ FAIL | 14.4 | Missing [DEBRIEF_V1_JSON] block |
| Next: product vague UI usable | ❌ FAIL | 14.0 | Missing [DEBRIEF_V1_JSON] block |
| Next: product tool-driven expandable card schema | ❌ FAIL | 15.5 | Missing [DEBRIEF_V1_JSON] block |
| Next: sales vague shareable | ❌ FAIL | 15.2 | Missing [DEBRIEF_V1_JSON] block |
| Next: sales tool-driven one-screen + objections | ❌ FAIL | 15.1 | Missing [DEBRIEF_V1_JSON] block |
| Stress: ambiguous persona (wedge + outreach) | ❌ FAIL | 15.2 | Missing [DEBRIEF_V1_JSON] block |
| Stress: contradiction handling (Seed vs Series A) | ❌ FAIL | 14.9 | Missing [DEBRIEF_V1_JSON] block |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 35.7 | missing verification loop (no planSteps entry includes verify/validate/confirm/c |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ❌ FAIL | 14.4 | Missing [DEBRIEF_V1_JSON] block |

### deepseek-r1

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ❌ FAIL | 68.4 | Missing [DEBRIEF_V1_JSON] block |
| Next: banker tool-driven outbound pack | ❌ FAIL | 30.6 | Missing [DEBRIEF_V1_JSON] block |
| Next: VC vague wedge | ❌ FAIL | 64.8 | Missing [DEBRIEF_V1_JSON] block |
| Next: VC tool-driven comps + diligence | ❌ FAIL | 244.8 | Missing [DEBRIEF_V1_JSON] block |
| Next: CTO vague exposure | ✅ PASS | 89.7 | - |
| Next: CTO tool-driven CVE plan | ❌ FAIL | 20.4 | Missing [DEBRIEF_V1_JSON] block |
| Next: founder vague positioning | ❌ FAIL | 19.1 | Missing [DEBRIEF_V1_JSON] block |
| Next: founder tool-driven memo | ❌ FAIL | 214.3 | Missing [DEBRIEF_V1_JSON] block |
| Next: academic vague anchor | ✅ PASS | 127.1 | - |
| Next: academic tool-driven literature debrief | ✅ PASS | 105.4 | - |
| Next: exec vague standardize | ❌ FAIL | 20.7 | Missing [DEBRIEF_V1_JSON] block |
| Next: exec tool-driven cost model | ✅ PASS | 97.5 | - |
| Next: ecosystem vague incident | ❌ FAIL | 23.6 | Missing [DEBRIEF_V1_JSON] block |
| Next: ecosystem tool-driven second-order brief | ❌ FAIL | 61.6 | Missing [DEBRIEF_V1_JSON] block |
| Next: quant vague what to track | ❌ FAIL | 88.0 | Missing [DEBRIEF_V1_JSON] block |
| Next: quant tool-driven signal set JSON | ✅ PASS | 100.3 | - |
| Next: product vague UI usable | ❌ FAIL | 99.8 | Missing [DEBRIEF_V1_JSON] block |
| Next: product tool-driven expandable card schema | ❌ FAIL | 182.2 | Missing [DEBRIEF_V1_JSON] block |
| Next: sales vague shareable | ❌ FAIL | 97.0 | Missing [DEBRIEF_V1_JSON] block |
| Next: sales tool-driven one-screen + objections | ❌ FAIL | 36.7 | Missing [DEBRIEF_V1_JSON] block |
| Stress: ambiguous persona (wedge + outreach) | ❌ FAIL | 37.0 | Missing [DEBRIEF_V1_JSON] block |
| Stress: contradiction handling (Seed vs Series A) | ❌ FAIL | 38.0 | Missing [DEBRIEF_V1_JSON] block |
| offset:22 | ❌ FAIL | 300.7 | - |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ❌ FAIL | 87.2 | Missing [DEBRIEF_V1_JSON] block |

### deepseek-v3.2

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 65.5 | - |
| Next: banker tool-driven outbound pack | ❌ FAIL | 39.7 | Missing [DEBRIEF_V1_JSON] block |
| Next: VC vague wedge | ✅ PASS | 59.1 | - |
| Next: VC tool-driven comps + diligence | ❌ FAIL | 48.0 | Missing [DEBRIEF_V1_JSON] block |
| Next: CTO vague exposure | ✅ PASS | 97.0 | - |
| Next: CTO tool-driven CVE plan | ✅ PASS | 226.4 | - |
| Next: founder vague positioning | ✅ PASS | 133.9 | - |
| Next: founder tool-driven memo | ❌ FAIL | 14.2 | Missing [DEBRIEF_V1_JSON] block |
| Next: academic vague anchor | ✅ PASS | 100.1 | - |
| Next: academic tool-driven literature debrief | ✅ PASS | 81.1 | - |
| Next: exec vague standardize | ❌ FAIL | 120.1 | persona mismatch: got CTO_TECH_LEAD expected ENTERPRISE_EXEC |
| Next: exec tool-driven cost model | ✅ PASS | 69.6 | - |
| Next: ecosystem vague incident | ✅ PASS | 217.1 | - |
| Next: ecosystem tool-driven second-order brief | ❌ FAIL | 63.7 | Missing [DEBRIEF_V1_JSON] block |
| Next: quant vague what to track | ✅ PASS | 59.0 | - |
| Next: quant tool-driven signal set JSON | ✅ PASS | 59.1 | - |
| Next: product vague UI usable | ✅ PASS | 165.9 | - |
| Next: product tool-driven expandable card schema | ✅ PASS | 113.4 | - |
| Next: sales vague shareable | ❌ FAIL | 36.7 | Missing [DEBRIEF_V1_JSON] block |
| Next: sales tool-driven one-screen + objections | ✅ PASS | 145.6 | - |
| Stress: ambiguous persona (wedge + outreach) | ✅ PASS | 77.8 | - |
| Stress: contradiction handling (Seed vs Series A) | ❌ FAIL | 54.3 | Missing [DEBRIEF_V1_JSON] block |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 224.6 | persona mismatch: got CTO_TECH_LEAD expected ENTERPRISE_EXEC |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ✅ PASS | 82.9 | - |

### qwen3-235b

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ❌ FAIL | 14.8 | Missing [DEBRIEF_V1_JSON] block |
| Next: banker tool-driven outbound pack | ❌ FAIL | 14.6 | Missing [DEBRIEF_V1_JSON] block |
| Next: VC vague wedge | ✅ PASS | 42.9 | - |
| Next: VC tool-driven comps + diligence | ❌ FAIL | 14.8 | Missing [DEBRIEF_V1_JSON] block |
| Next: CTO vague exposure | ❌ FAIL | 30.9 | Missing [DEBRIEF_V1_JSON] block |
| Next: CTO tool-driven CVE plan | ❌ FAIL | 14.6 | Missing [DEBRIEF_V1_JSON] block |
| Next: founder vague positioning | ❌ FAIL | 14.8 | Missing [DEBRIEF_V1_JSON] block |
| Next: founder tool-driven memo | ❌ FAIL | 14.6 | Missing [DEBRIEF_V1_JSON] block |
| Next: academic vague anchor | ❌ FAIL | 14.6 | Missing [DEBRIEF_V1_JSON] block |
| Next: academic tool-driven literature debrief | ❌ FAIL | 14.9 | Missing [DEBRIEF_V1_JSON] block |
| Next: exec vague standardize | ❌ FAIL | 14.6 | Missing [DEBRIEF_V1_JSON] block |
| Next: exec tool-driven cost model | ❌ FAIL | 14.9 | Missing [DEBRIEF_V1_JSON] block |
| Next: ecosystem vague incident | ❌ FAIL | 14.9 | Missing [DEBRIEF_V1_JSON] block |
| Next: ecosystem tool-driven second-order brief | ❌ FAIL | 14.9 | Missing [DEBRIEF_V1_JSON] block |
| Next: quant vague what to track | ❌ FAIL | 14.9 | Missing [DEBRIEF_V1_JSON] block |
| Next: quant tool-driven signal set JSON | ❌ FAIL | 14.6 | Missing [DEBRIEF_V1_JSON] block |
| Next: product vague UI usable | ❌ FAIL | 14.9 | Missing [DEBRIEF_V1_JSON] block |
| Next: product tool-driven expandable card schema | ❌ FAIL | 14.6 | Missing [DEBRIEF_V1_JSON] block |
| Next: sales vague shareable | ❌ FAIL | 34.2 | Missing [DEBRIEF_V1_JSON] block |
| Next: sales tool-driven one-screen + objections | ❌ FAIL | 14.6 | Missing [DEBRIEF_V1_JSON] block |
| Stress: ambiguous persona (wedge + outreach) | ❌ FAIL | 14.6 | Missing [DEBRIEF_V1_JSON] block |
| Stress: contradiction handling (Seed vs Series A) | ❌ FAIL | 14.8 | Missing [DEBRIEF_V1_JSON] block |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 14.8 | Missing [DEBRIEF_V1_JSON] block |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ❌ FAIL | 14.7 | Missing [DEBRIEF_V1_JSON] block |

### minimax-m2.1

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 35.4 | - |
| Next: banker tool-driven outbound pack | ✅ PASS | 19.8 | - |
| Next: VC vague wedge | ✅ PASS | 39.3 | - |
| Next: VC tool-driven comps + diligence | ✅ PASS | 73.0 | - |
| Next: CTO vague exposure | ✅ PASS | 23.2 | - |
| Next: CTO tool-driven CVE plan | ❌ FAIL | 133.4 | missing ground truth citation anchor in grounding[] |
| Next: founder vague positioning | ✅ PASS | 82.8 | - |
| Next: founder tool-driven memo | ❌ FAIL | 115.2 | missing ground truth citation anchor in grounding[] |
| Next: academic vague anchor | ❌ FAIL | 39.7 | missing ground truth citation anchor in grounding[] |
| Next: academic tool-driven literature debrief | ✅ PASS | 115.0 | - |
| Next: exec vague standardize | ❌ FAIL | 37.7 | persona mismatch: got CTO_TECH_LEAD expected ENTERPRISE_EXEC |
| Next: exec tool-driven cost model | ❌ FAIL | 91.5 | missing ground truth citation anchor in grounding[] |
| Next: ecosystem vague incident | ❌ FAIL | 19.0 | Missing [DEBRIEF_V1_JSON] block |
| Next: ecosystem tool-driven second-order brief | ✅ PASS | 68.2 | - |
| Next: quant vague what to track | ✅ PASS | 35.0 | - |
| Next: quant tool-driven signal set JSON | ✅ PASS | 38.0 | - |
| Next: product vague UI usable | ✅ PASS | 22.0 | - |
| Next: product tool-driven expandable card schema | ✅ PASS | 47.1 | - |
| Next: sales vague shareable | ✅ PASS | 28.5 | - |
| Next: sales tool-driven one-screen + objections | ✅ PASS | 21.2 | - |
| Stress: ambiguous persona (wedge + outreach) | ✅ PASS | 22.4 | - |
| Stress: contradiction handling (Seed vs Series A) | ✅ PASS | 41.5 | - |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 58.1 | entity mismatch: got resolvedId='N/A' canonical='AI LLM API Pricing Comparison'  |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ❌ FAIL | 56.5 | missing verification loop (no planSteps entry includes verify/validate/confirm/c |

### mimo-v2-flash-free

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 25.9 | - |
| Next: banker tool-driven outbound pack | ❌ FAIL | 26.4 | persona mismatch: got SALES_ENGINEER expected JPM_STARTUP_BANKER |
| Next: VC vague wedge | ✅ PASS | 21.6 | - |
| Next: VC tool-driven comps + diligence | ✅ PASS | 103.7 | - |
| Next: CTO vague exposure | ❌ FAIL | 18.1 | Missing [DEBRIEF_V1_JSON] block |
| Next: CTO tool-driven CVE plan | ✅ PASS | 70.2 | - |
| Next: founder vague positioning | ✅ PASS | 35.5 | - |
| Next: founder tool-driven memo | ❌ FAIL | 88.1 | missing ground truth citation anchor in grounding[] |
| Next: academic vague anchor | ✅ PASS | 42.5 | - |
| Next: academic tool-driven literature debrief | ❌ FAIL | 100.4 | missing required tools: expected lookupGroundTruthEntity got [searchAvailableSki |
| Next: exec vague standardize | ❌ FAIL | 49.7 | persona mismatch: got EARLY_STAGE_VC expected ENTERPRISE_EXEC |
| Next: exec tool-driven cost model | ❌ FAIL | 82.9 | missing ground truth citation anchor in grounding[] |
| Next: ecosystem vague incident | ✅ PASS | 51.8 | - |
| Next: ecosystem tool-driven second-order brief | ✅ PASS | 54.8 | - |
| Next: quant vague what to track | ✅ PASS | 31.9 | - |
| Next: quant tool-driven signal set JSON | ✅ PASS | 49.1 | - |
| Next: product vague UI usable | ✅ PASS | 20.7 | - |
| Next: product tool-driven expandable card schema | ✅ PASS | 39.6 | - |
| Next: sales vague shareable | ✅ PASS | 18.9 | - |
| Next: sales tool-driven one-screen + objections | ✅ PASS | 18.9 | - |
| Stress: ambiguous persona (wedge + outreach) | ✅ PASS | 34.6 | - |
| Stress: contradiction handling (Seed vs Series A) | ✅ PASS | 19.9 | - |
| Pack: exec cross-provider pricing comparison | ✅ PASS | 89.4 | - |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ❌ FAIL | 42.3 | Missing [DEBRIEF_V1_JSON] block |

## Disclosure Metrics (P0 Instrumentation)

### Disclosure Level by Model

| Model | Full | Partial | None |
|-------|------|---------|------|
| claude-haiku-4.5 | 0 | 15 | 9 |
| gpt-5-mini | 0 | 24 | 0 |
| gemini-3-flash | 0 | 24 | 0 |
| deepseek-r1 | 0 | 16 | 7 |
| deepseek-v3.2 | 0 | 23 | 1 |
| qwen3-235b | 0 | 0 | 24 |
| minimax-m2.1 | 0 | 23 | 1 |
| mimo-v2-flash-free | 0 | 24 | 0 |

### Disclosure Warnings (Non-Scored)

> **Note:** These warnings are informational and do not affect pass/fail.
> They track progressive disclosure usage for Week 1-2 observability.

⚠️ [claude-haiku-4.5/next_vc_vague_disco_wedge] No skill search before tool invoke
⚠️ [claude-haiku-4.5/next_vc_vague_disco_wedge] No skill search for EARLY_STAGE_VC scenario
⚠️ [claude-haiku-4.5/next_vc_vague_disco_wedge] No progressive disclosure meta-tools used
⚠️ [claude-haiku-4.5/next_vc_tool_disco_comps] No skill search for EARLY_STAGE_VC scenario
⚠️ [claude-haiku-4.5/next_cto_tool_cve_plan] No skill search for CTO_TECH_LEAD scenario
⚠️ [claude-haiku-4.5/next_exec_tool_cost_model] No skill search for ENTERPRISE_EXEC scenario
⚠️ [claude-haiku-4.5/next_quant_vague_disco_track] No skill search for QUANT_ANALYST scenario
⚠️ [claude-haiku-4.5/next_product_vague_make_usable_ui] No skill search for PRODUCT_DESIGNER scenario
⚠️ [claude-haiku-4.5/next_sales_vague_shareable] No skill search for SALES_ENGINEER scenario
⚠️ [claude-haiku-4.5/next_sales_tool_one_screen_objections] No skill search before tool invoke
⚠️ [claude-haiku-4.5/next_sales_tool_one_screen_objections] No skill search for SALES_ENGINEER scenario
⚠️ [claude-haiku-4.5/next_sales_tool_one_screen_objections] No progressive disclosure meta-tools used
⚠️ [claude-haiku-4.5/pack_exec_cross_provider_pricing] No skill search for ENTERPRISE_EXEC scenario
⚠️ [deepseek-r1/next_cto_tool_cve_plan] No skill search for CTO_TECH_LEAD scenario
⚠️ [deepseek-r1/next_founder_vague_salesforce_agentforce] No skill search for FOUNDER_STRATEGY scenario
⚠️ [deepseek-r1/next_exec_vague_gemini_standardize] No skill search for ENTERPRISE_EXEC scenario
⚠️ [deepseek-r1/next_ecosystem_vague_soundcloud_vpn] No skill search for ECOSYSTEM_PARTNER scenario
⚠️ [deepseek-r1/next_ecosystem_tool_second_order_brief] No skill search for ECOSYSTEM_PARTNER scenario
⚠️ [deepseek-r1/next_product_tool_expandable_card] No skill search before tool invoke
⚠️ [deepseek-r1/next_product_tool_expandable_card] No skill search for PRODUCT_DESIGNER scenario
⚠️ [deepseek-r1/next_product_tool_expandable_card] No progressive disclosure meta-tools used
⚠️ [deepseek-v3.2/next_founder_tool_salesforce_memo] No skill search for FOUNDER_STRATEGY scenario
⚠️ [qwen3-235b/next_vc_vague_disco_wedge] No skill search before tool invoke
⚠️ [qwen3-235b/next_vc_vague_disco_wedge] No skill search for EARLY_STAGE_VC scenario
⚠️ [qwen3-235b/next_vc_vague_disco_wedge] No progressive disclosure meta-tools used
⚠️ [qwen3-235b/next_vc_tool_disco_comps] No skill search for EARLY_STAGE_VC scenario
⚠️ [qwen3-235b/next_cto_vague_quickjs_exposure] No skill search before tool invoke
⚠️ [qwen3-235b/next_cto_vague_quickjs_exposure] No skill search for CTO_TECH_LEAD scenario
⚠️ [qwen3-235b/next_cto_vague_quickjs_exposure] No progressive disclosure meta-tools used
⚠️ [qwen3-235b/next_cto_tool_cve_plan] No skill search for CTO_TECH_LEAD scenario
⚠️ [qwen3-235b/next_founder_vague_salesforce_agentforce] No skill search for FOUNDER_STRATEGY scenario
⚠️ [qwen3-235b/next_founder_tool_salesforce_memo] No skill search for FOUNDER_STRATEGY scenario
⚠️ [qwen3-235b/next_academic_vague_ryr2_alz] No skill search for ACADEMIC_RD scenario
⚠️ [qwen3-235b/next_academic_tool_lit_debrief] No skill search for ACADEMIC_RD scenario
⚠️ [qwen3-235b/next_exec_vague_gemini_standardize] No skill search for ENTERPRISE_EXEC scenario
⚠️ [qwen3-235b/next_exec_tool_cost_model] No skill search for ENTERPRISE_EXEC scenario
⚠️ [qwen3-235b/next_ecosystem_vague_soundcloud_vpn] No skill search for ECOSYSTEM_PARTNER scenario
⚠️ [qwen3-235b/next_ecosystem_tool_second_order_brief] No skill search for ECOSYSTEM_PARTNER scenario
⚠️ [qwen3-235b/next_quant_vague_disco_track] No skill search for QUANT_ANALYST scenario
⚠️ [qwen3-235b/next_quant_tool_signal_json] No skill search for QUANT_ANALYST scenario
⚠️ [qwen3-235b/next_product_vague_make_usable_ui] No skill search for PRODUCT_DESIGNER scenario
⚠️ [qwen3-235b/next_product_tool_expandable_card] No skill search for PRODUCT_DESIGNER scenario
⚠️ [qwen3-235b/next_sales_vague_shareable] No skill search before tool invoke
⚠️ [qwen3-235b/next_sales_vague_shareable] No skill search for SALES_ENGINEER scenario
⚠️ [qwen3-235b/next_sales_vague_shareable] No progressive disclosure meta-tools used
⚠️ [qwen3-235b/next_sales_tool_one_screen_objections] No skill search for SALES_ENGINEER scenario
⚠️ [qwen3-235b/pack_exec_cross_provider_pricing] No skill search for ENTERPRISE_EXEC scenario
⚠️ [qwen3-235b/pack_meta_budgeted_deep_dive] No skill search for EARLY_STAGE_VC scenario
⚠️ [minimax-m2.1/pack_meta_budgeted_deep_dive] No skill search before tool invoke
⚠️ [minimax-m2.1/pack_meta_budgeted_deep_dive] No skill search for EARLY_STAGE_VC scenario
... and 1 more warnings
