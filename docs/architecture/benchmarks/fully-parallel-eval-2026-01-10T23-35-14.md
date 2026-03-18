# Fully Parallel Evaluation Results

Generated: 2026-01-10T23:35:14.266Z
Total Time: 249.8s
Suite: pack
Models: 8
Scenarios: 24 of 24 (limit=0)
Total evaluations: 192

## Summary by Model

| Model | Total | Passed | Failed | Avg Time (s) |
|-------|-------|--------|--------|--------------|
| claude-haiku-4.5 | 24 | 4 | 20 | 65.7 |
| gpt-5-mini | 24 | 18 | 6 | 64.1 |
| gemini-3-flash | 24 | 8 | 16 | 14.2 |
| deepseek-r1 | 24 | 10 | 14 | 88.0 |
| deepseek-v3.2 | 24 | 17 | 7 | 84.4 |
| qwen3-235b | 24 | 13 | 11 | 88.9 |
| minimax-m2.1 | 24 | 14 | 10 | 42.5 |
| mimo-v2-flash-free | 24 | 19 | 5 | 43.1 |

## Summary by Scenario

| Scenario | Total | Passed | Failed |
|----------|-------|--------|--------|
| Next: academic tool-driven literature debrief | 8 | 6 | 2 |
| Next: academic vague anchor | 8 | 5 | 3 |
| Next: banker tool-driven outbound pack | 8 | 6 | 2 |
| Next: banker vague (fast debrief) | 8 | 8 | 0 |
| Next: CTO tool-driven CVE plan | 8 | 5 | 3 |
| Next: CTO vague exposure | 8 | 6 | 2 |
| Next: ecosystem tool-driven second-order brief | 8 | 4 | 4 |
| Next: ecosystem vague incident | 8 | 3 | 5 |
| Next: exec tool-driven cost model | 8 | 6 | 2 |
| Next: exec vague standardize | 8 | 4 | 4 |
| Next: founder tool-driven memo | 8 | 2 | 6 |
| Next: founder vague positioning | 8 | 4 | 4 |
| Next: product tool-driven expandable card schema | 8 | 5 | 3 |
| Next: product vague UI usable | 8 | 4 | 4 |
| Next: quant tool-driven signal set JSON | 8 | 5 | 3 |
| Next: quant vague what to track | 8 | 2 | 6 |
| Next: sales tool-driven one-screen + objections | 8 | 3 | 5 |
| Next: sales vague shareable | 8 | 3 | 5 |
| Next: VC tool-driven comps + diligence | 8 | 3 | 5 |
| Next: VC vague wedge | 8 | 5 | 3 |
| Pack: exec cross-provider pricing comparison | 8 | 0 | 8 |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | 8 | 4 | 4 |
| Stress: ambiguous persona (wedge + outreach) | 8 | 5 | 3 |
| Stress: contradiction handling (Seed vs Series A) | 8 | 5 | 3 |

## Detailed Results

### claude-haiku-4.5

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 15.2 | - |
| Next: banker tool-driven outbound pack | ❌ FAIL | 58.6 | Missing [DEBRIEF_V1_JSON] block |
| Next: VC vague wedge | ❌ FAIL | 71.7 | Missing [DEBRIEF_V1_JSON] block |
| Next: VC tool-driven comps + diligence | ❌ FAIL | 58.5 | Missing [DEBRIEF_V1_JSON] block |
| Next: CTO vague exposure | ❌ FAIL | 70.4 | Missing [DEBRIEF_V1_JSON] block |
| Next: CTO tool-driven CVE plan | ❌ FAIL | 70.8 | Missing [DEBRIEF_V1_JSON] block |
| Next: founder vague positioning | ❌ FAIL | 59.4 | Missing [DEBRIEF_V1_JSON] block |
| Next: founder tool-driven memo | ❌ FAIL | 70.6 | Missing [DEBRIEF_V1_JSON] block |
| Next: academic vague anchor | ❌ FAIL | 76.8 | Missing [DEBRIEF_V1_JSON] block |
| Next: academic tool-driven literature debrief | ❌ FAIL | 70.0 | Missing [DEBRIEF_V1_JSON] block |
| Next: exec vague standardize | ✅ PASS | 81.7 | - |
| Next: exec tool-driven cost model | ❌ FAIL | 64.9 | Missing [DEBRIEF_V1_JSON] block |
| Next: ecosystem vague incident | ❌ FAIL | 61.2 | Missing [DEBRIEF_V1_JSON] block |
| Next: ecosystem tool-driven second-order brief | ❌ FAIL | 70.0 | Missing [DEBRIEF_V1_JSON] block |
| Next: quant vague what to track | ❌ FAIL | 59.4 | Missing [DEBRIEF_V1_JSON] block |
| Next: quant tool-driven signal set JSON | ✅ PASS | 27.6 | - |
| Next: product vague UI usable | ❌ FAIL | 58.5 | Missing [DEBRIEF_V1_JSON] block |
| Next: product tool-driven expandable card schema | ❌ FAIL | 76.3 | Missing [DEBRIEF_V1_JSON] block |
| Next: sales vague shareable | ❌ FAIL | 70.7 | Missing [DEBRIEF_V1_JSON] block |
| Next: sales tool-driven one-screen + objections | ❌ FAIL | 62.6 | Missing [DEBRIEF_V1_JSON] block |
| Stress: ambiguous persona (wedge + outreach) | ❌ FAIL | 70.2 | Missing [DEBRIEF_V1_JSON] block |
| Stress: contradiction handling (Seed vs Series A) | ❌ FAIL | 65.5 | Missing [DEBRIEF_V1_JSON] block |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 70.2 | Missing [DEBRIEF_V1_JSON] block |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ✅ PASS | 115.7 | - |

### gpt-5-mini

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 42.1 | - |
| Next: banker tool-driven outbound pack | ✅ PASS | 52.2 | - |
| Next: VC vague wedge | ✅ PASS | 49.7 | - |
| Next: VC tool-driven comps + diligence | ✅ PASS | 64.9 | - |
| Next: CTO vague exposure | ✅ PASS | 42.1 | - |
| Next: CTO tool-driven CVE plan | ✅ PASS | 52.8 | - |
| Next: founder vague positioning | ✅ PASS | 58.0 | - |
| Next: founder tool-driven memo | ✅ PASS | 87.1 | - |
| Next: academic vague anchor | ✅ PASS | 42.0 | - |
| Next: academic tool-driven literature debrief | ✅ PASS | 147.4 | - |
| Next: exec vague standardize | ❌ FAIL | 43.7 | persona mismatch: got CTO_TECH_LEAD expected ENTERPRISE_EXEC |
| Next: exec tool-driven cost model | ✅ PASS | 70.4 | - |
| Next: ecosystem vague incident | ✅ PASS | 48.5 | - |
| Next: ecosystem tool-driven second-order brief | ✅ PASS | 54.3 | - |
| Next: quant vague what to track | ✅ PASS | 47.2 | - |
| Next: quant tool-driven signal set JSON | ❌ FAIL | 62.7 | persona mismatch: got EARLY_STAGE_VC expected QUANT_ANALYST |
| Next: product vague UI usable | ✅ PASS | 49.1 | - |
| Next: product tool-driven expandable card schema | ✅ PASS | 88.1 | - |
| Next: sales vague shareable | ❌ FAIL | 35.1 | persona mismatch: got JPM_STARTUP_BANKER expected SALES_ENGINEER |
| Next: sales tool-driven one-screen + objections | ❌ FAIL | 51.4 | persona mismatch: got JPM_STARTUP_BANKER expected SALES_ENGINEER |
| Stress: ambiguous persona (wedge + outreach) | ❌ FAIL | 47.0 | persona.inferred must be a known persona |
| Stress: contradiction handling (Seed vs Series A) | ✅ PASS | 68.3 | - |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 164.1 | persona mismatch: got CTO_TECH_LEAD expected ENTERPRISE_EXEC |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ✅ PASS | 69.2 | - |

### gemini-3-flash

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 15.0 | - |
| Next: banker tool-driven outbound pack | ✅ PASS | 15.5 | - |
| Next: VC vague wedge | ❌ FAIL | 14.9 | Missing [DEBRIEF_V1_JSON] block |
| Next: VC tool-driven comps + diligence | ❌ FAIL | 14.0 | Missing [DEBRIEF_V1_JSON] block |
| Next: CTO vague exposure | ❌ FAIL | 13.0 | Missing [DEBRIEF_V1_JSON] block |
| Next: CTO tool-driven CVE plan | ❌ FAIL | 13.1 | Missing [DEBRIEF_V1_JSON] block |
| Next: founder vague positioning | ❌ FAIL | 14.4 | Missing [DEBRIEF_V1_JSON] block |
| Next: founder tool-driven memo | ❌ FAIL | 13.0 | Missing [DEBRIEF_V1_JSON] block |
| Next: academic vague anchor | ❌ FAIL | 13.1 | Missing [DEBRIEF_V1_JSON] block |
| Next: academic tool-driven literature debrief | ❌ FAIL | 13.0 | Missing [DEBRIEF_V1_JSON] block |
| Next: exec vague standardize | ❌ FAIL | 13.9 | Missing [DEBRIEF_V1_JSON] block |
| Next: exec tool-driven cost model | ✅ PASS | 15.2 | - |
| Next: ecosystem vague incident | ❌ FAIL | 13.7 | Missing [DEBRIEF_V1_JSON] block |
| Next: ecosystem tool-driven second-order brief | ❌ FAIL | 19.4 | Missing [DEBRIEF_V1_JSON] block |
| Next: quant vague what to track | ❌ FAIL | 14.8 | Missing [DEBRIEF_V1_JSON] block |
| Next: quant tool-driven signal set JSON | ✅ PASS | 15.1 | - |
| Next: product vague UI usable | ✅ PASS | 11.9 | - |
| Next: product tool-driven expandable card schema | ❌ FAIL | 13.0 | Missing [DEBRIEF_V1_JSON] block |
| Next: sales vague shareable | ✅ PASS | 13.1 | - |
| Next: sales tool-driven one-screen + objections | ❌ FAIL | 13.5 | Missing [DEBRIEF_V1_JSON] block |
| Stress: ambiguous persona (wedge + outreach) | ✅ PASS | 14.4 | - |
| Stress: contradiction handling (Seed vs Series A) | ✅ PASS | 15.3 | - |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 13.4 | Missing [DEBRIEF_V1_JSON] block |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ❌ FAIL | 14.1 | Missing [DEBRIEF_V1_JSON] block |

### deepseek-r1

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 54.2 | - |
| Next: banker tool-driven outbound pack | ❌ FAIL | 240.1 | Missing [DEBRIEF_V1_JSON] block |
| Next: VC vague wedge | ✅ PASS | 80.1 | - |
| Next: VC tool-driven comps + diligence | ❌ FAIL | 112.2 | Missing [DEBRIEF_V1_JSON] block |
| Next: CTO vague exposure | ✅ PASS | 48.2 | - |
| Next: CTO tool-driven CVE plan | ✅ PASS | 172.6 | - |
| Next: founder vague positioning | ❌ FAIL | 159.6 | missing ground truth citation anchor in grounding[] |
| Next: founder tool-driven memo | ❌ FAIL | 249.7 | missing required tools: expected lookupGroundTruthEntity got [initScratchpad, de |
| Next: academic vague anchor | ✅ PASS | 95.7 | - |
| Next: academic tool-driven literature debrief | ✅ PASS | 52.8 | - |
| Next: exec vague standardize | ❌ FAIL | 77.8 | persona mismatch: got CTO_TECH_LEAD expected ENTERPRISE_EXEC |
| Next: exec tool-driven cost model | ✅ PASS | 73.0 | - |
| Next: ecosystem vague incident | ✅ PASS | 63.7 | - |
| Next: ecosystem tool-driven second-order brief | ❌ FAIL | 14.8 | Missing [DEBRIEF_V1_JSON] block |
| Next: quant vague what to track | ❌ FAIL | 11.5 | Missing [DEBRIEF_V1_JSON] block |
| Next: quant tool-driven signal set JSON | ❌ FAIL | 13.4 | Missing [DEBRIEF_V1_JSON] block |
| Next: product vague UI usable | ❌ FAIL | 69.5 | Missing [DEBRIEF_V1_JSON] block |
| Next: product tool-driven expandable card schema | ❌ FAIL | 87.4 | Missing [DEBRIEF_V1_JSON] block |
| Next: sales vague shareable | ❌ FAIL | 11.9 | Missing [DEBRIEF_V1_JSON] block |
| Next: sales tool-driven one-screen + objections | ✅ PASS | 69.7 | - |
| Stress: ambiguous persona (wedge + outreach) | ❌ FAIL | 13.9 | Missing [DEBRIEF_V1_JSON] block |
| Stress: contradiction handling (Seed vs Series A) | ✅ PASS | 63.4 | - |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 194.1 | Missing [DEBRIEF_V1_JSON] block |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ❌ FAIL | 83.7 | missing verification loop (no planSteps entry includes verify/validate/confirm/c |

### deepseek-v3.2

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 55.7 | - |
| Next: banker tool-driven outbound pack | ✅ PASS | 119.3 | - |
| Next: VC vague wedge | ✅ PASS | 63.6 | - |
| Next: VC tool-driven comps + diligence | ❌ FAIL | 98.1 | Missing [DEBRIEF_V1_JSON] block |
| Next: CTO vague exposure | ✅ PASS | 100.8 | - |
| Next: CTO tool-driven CVE plan | ❌ FAIL | 114.6 | Missing [DEBRIEF_V1_JSON] block |
| Next: founder vague positioning | ✅ PASS | 184.2 | - |
| Next: founder tool-driven memo | ❌ FAIL | 33.7 | Missing [DEBRIEF_V1_JSON] block |
| Next: academic vague anchor | ❌ FAIL | 54.2 | Missing [DEBRIEF_V1_JSON] block |
| Next: academic tool-driven literature debrief | ✅ PASS | 58.6 | - |
| Next: exec vague standardize | ✅ PASS | 53.5 | - |
| Next: exec tool-driven cost model | ✅ PASS | 75.3 | - |
| Next: ecosystem vague incident | ❌ FAIL | 45.7 | Missing [DEBRIEF_V1_JSON] block |
| Next: ecosystem tool-driven second-order brief | ✅ PASS | 107.8 | - |
| Next: quant vague what to track | ✅ PASS | 68.0 | - |
| Next: quant tool-driven signal set JSON | ✅ PASS | 44.7 | - |
| Next: product vague UI usable | ✅ PASS | 61.7 | - |
| Next: product tool-driven expandable card schema | ✅ PASS | 61.6 | - |
| Next: sales vague shareable | ✅ PASS | 67.3 | - |
| Next: sales tool-driven one-screen + objections | ✅ PASS | 114.6 | - |
| Stress: ambiguous persona (wedge + outreach) | ✅ PASS | 94.6 | - |
| Stress: contradiction handling (Seed vs Series A) | ❌ FAIL | 59.1 | Missing [DEBRIEF_V1_JSON] block |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 233.0 | persona mismatch: got CTO_TECH_LEAD expected ENTERPRISE_EXEC |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ✅ PASS | 55.6 | - |

### qwen3-235b

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 85.7 | - |
| Next: banker tool-driven outbound pack | ✅ PASS | 102.6 | - |
| Next: VC vague wedge | ❌ FAIL | 87.0 | Missing [DEBRIEF_V1_JSON] block |
| Next: VC tool-driven comps + diligence | ❌ FAIL | 174.9 | Missing [DEBRIEF_V1_JSON] block |
| Next: CTO vague exposure | ✅ PASS | 82.1 | - |
| Next: CTO tool-driven CVE plan | ✅ PASS | 87.3 | - |
| Next: founder vague positioning | ❌ FAIL | 93.1 | missing ground truth citation anchor in grounding[] |
| Next: founder tool-driven memo | ❌ FAIL | 97.5 | Missing [DEBRIEF_V1_JSON] block |
| Next: academic vague anchor | ✅ PASS | 86.7 | - |
| Next: academic tool-driven literature debrief | ✅ PASS | 100.9 | - |
| Next: exec vague standardize | ✅ PASS | 86.7 | - |
| Next: exec tool-driven cost model | ✅ PASS | 87.6 | - |
| Next: ecosystem vague incident | ❌ FAIL | 92.8 | Missing [DEBRIEF_V1_JSON] block |
| Next: ecosystem tool-driven second-order brief | ✅ PASS | 74.0 | - |
| Next: quant vague what to track | ❌ FAIL | 69.0 | persona mismatch: got JPM_STARTUP_BANKER expected QUANT_ANALYST |
| Next: quant tool-driven signal set JSON | ✅ PASS | 89.3 | - |
| Next: product vague UI usable | ❌ FAIL | 93.4 | persona mismatch: got JPM_STARTUP_BANKER expected PRODUCT_DESIGNER |
| Next: product tool-driven expandable card schema | ✅ PASS | 98.8 | - |
| Next: sales vague shareable | ❌ FAIL | 48.9 | Missing [DEBRIEF_V1_JSON] block |
| Next: sales tool-driven one-screen + objections | ✅ PASS | 79.3 | - |
| Stress: ambiguous persona (wedge + outreach) | ✅ PASS | 86.4 | - |
| Stress: contradiction handling (Seed vs Series A) | ❌ FAIL | 64.5 | Missing [DEBRIEF_V1_JSON] block |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 112.4 | persona mismatch: got QUANT_ANALYST expected ENTERPRISE_EXEC |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ❌ FAIL | 53.0 | Missing [DEBRIEF_V1_JSON] block |

### minimax-m2.1

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 24.4 | - |
| Next: banker tool-driven outbound pack | ✅ PASS | 25.1 | - |
| Next: VC vague wedge | ✅ PASS | 27.0 | - |
| Next: VC tool-driven comps + diligence | ✅ PASS | 104.0 | - |
| Next: CTO vague exposure | ✅ PASS | 24.2 | - |
| Next: CTO tool-driven CVE plan | ✅ PASS | 81.2 | - |
| Next: founder vague positioning | ✅ PASS | 39.9 | - |
| Next: founder tool-driven memo | ❌ FAIL | 142.0 | missing required tools: expected lookupGroundTruthEntity got [queryMemory, paral |
| Next: academic vague anchor | ✅ PASS | 28.4 | - |
| Next: academic tool-driven literature debrief | ✅ PASS | 62.7 | - |
| Next: exec vague standardize | ❌ FAIL | 22.9 | Missing [DEBRIEF_V1_JSON] block |
| Next: exec tool-driven cost model | ❌ FAIL | 61.8 | missing required tools: expected lookupGroundTruthEntity got [linkupSearch] |
| Next: ecosystem vague incident | ✅ PASS | 33.1 | - |
| Next: ecosystem tool-driven second-order brief | ❌ FAIL | 46.9 | Missing [DEBRIEF_V1_JSON] block |
| Next: quant vague what to track | ❌ FAIL | 26.5 | persona mismatch: got EARLY_STAGE_VC expected QUANT_ANALYST |
| Next: quant tool-driven signal set JSON | ✅ PASS | 28.7 | - |
| Next: product vague UI usable | ❌ FAIL | 19.7 | persona mismatch: got JPM_STARTUP_BANKER expected PRODUCT_DESIGNER |
| Next: product tool-driven expandable card schema | ✅ PASS | 55.6 | - |
| Next: sales vague shareable | ❌ FAIL | 20.9 | persona mismatch: got JPM_STARTUP_BANKER expected SALES_ENGINEER |
| Next: sales tool-driven one-screen + objections | ❌ FAIL | 27.7 | persona mismatch: got JPM_STARTUP_BANKER expected SALES_ENGINEER |
| Stress: ambiguous persona (wedge + outreach) | ✅ PASS | 25.5 | - |
| Stress: contradiction handling (Seed vs Series A) | ✅ PASS | 27.5 | - |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 43.2 | persona mismatch: got QUANT_ANALYST expected ENTERPRISE_EXEC |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ❌ FAIL | 20.6 | missing verification loop (no planSteps entry includes verify/validate/confirm/c |

### mimo-v2-flash-free

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 18.7 | - |
| Next: banker tool-driven outbound pack | ✅ PASS | 40.5 | - |
| Next: VC vague wedge | ✅ PASS | 26.8 | - |
| Next: VC tool-driven comps + diligence | ✅ PASS | 101.3 | - |
| Next: CTO vague exposure | ✅ PASS | 17.4 | - |
| Next: CTO tool-driven CVE plan | ✅ PASS | 43.0 | - |
| Next: founder vague positioning | ✅ PASS | 36.5 | - |
| Next: founder tool-driven memo | ✅ PASS | 103.7 | - |
| Next: academic vague anchor | ✅ PASS | 46.7 | - |
| Next: academic tool-driven literature debrief | ✅ PASS | 44.7 | - |
| Next: exec vague standardize | ✅ PASS | 18.3 | - |
| Next: exec tool-driven cost model | ✅ PASS | 38.5 | - |
| Next: ecosystem vague incident | ❌ FAIL | 41.7 | Missing [DEBRIEF_V1_JSON] block |
| Next: ecosystem tool-driven second-order brief | ✅ PASS | 91.2 | - |
| Next: quant vague what to track | ❌ FAIL | 21.8 | persona mismatch: got EARLY_STAGE_VC expected QUANT_ANALYST |
| Next: quant tool-driven signal set JSON | ❌ FAIL | 65.6 | persona mismatch: got EARLY_STAGE_VC expected QUANT_ANALYST |
| Next: product vague UI usable | ✅ PASS | 15.2 | - |
| Next: product tool-driven expandable card schema | ✅ PASS | 26.3 | - |
| Next: sales vague shareable | ✅ PASS | 18.1 | - |
| Next: sales tool-driven one-screen + objections | ❌ FAIL | 18.2 | persona mismatch: got JPM_STARTUP_BANKER expected SALES_ENGINEER |
| Stress: ambiguous persona (wedge + outreach) | ✅ PASS | 20.2 | - |
| Stress: contradiction handling (Seed vs Series A) | ✅ PASS | 25.0 | - |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 101.0 | persona mismatch: got EARLY_STAGE_VC expected ENTERPRISE_EXEC |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ✅ PASS | 53.2 | - |

## Disclosure Metrics (P0 Instrumentation)

### Disclosure Level by Model

| Model | Full | Partial | None |
|-------|------|---------|------|
| claude-haiku-4.5 | 0 | 0 | 24 |
| gpt-5-mini | 0 | 0 | 24 |
| gemini-3-flash | 0 | 0 | 24 |
| deepseek-r1 | 0 | 0 | 24 |
| deepseek-v3.2 | 0 | 0 | 24 |
| qwen3-235b | 0 | 0 | 24 |
| minimax-m2.1 | 0 | 1 | 23 |
| mimo-v2-flash-free | 0 | 0 | 24 |

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
⚠️ [claude-haiku-4.5/next_cto_vague_quickjs_exposure] No skill search for CTO_TECH_LEAD scenario
⚠️ [claude-haiku-4.5/next_cto_tool_cve_plan] No skill search before tool invoke
⚠️ [claude-haiku-4.5/next_cto_tool_cve_plan] No skill search for CTO_TECH_LEAD scenario
⚠️ [claude-haiku-4.5/next_cto_tool_cve_plan] No progressive disclosure meta-tools used
⚠️ [claude-haiku-4.5/next_founder_vague_salesforce_agentforce] No skill search for FOUNDER_STRATEGY scenario
⚠️ [claude-haiku-4.5/next_founder_tool_salesforce_memo] No skill search before tool invoke
⚠️ [claude-haiku-4.5/next_founder_tool_salesforce_memo] No skill search for FOUNDER_STRATEGY scenario
⚠️ [claude-haiku-4.5/next_founder_tool_salesforce_memo] No progressive disclosure meta-tools used
⚠️ [claude-haiku-4.5/next_academic_vague_ryr2_alz] No skill search before tool invoke
⚠️ [claude-haiku-4.5/next_academic_vague_ryr2_alz] No skill search for ACADEMIC_RD scenario
⚠️ [claude-haiku-4.5/next_academic_vague_ryr2_alz] No progressive disclosure meta-tools used
⚠️ [claude-haiku-4.5/next_academic_tool_lit_debrief] No skill search before tool invoke
⚠️ [claude-haiku-4.5/next_academic_tool_lit_debrief] No skill search for ACADEMIC_RD scenario
⚠️ [claude-haiku-4.5/next_academic_tool_lit_debrief] No progressive disclosure meta-tools used
⚠️ [claude-haiku-4.5/next_exec_vague_gemini_standardize] No skill search before tool invoke
⚠️ [claude-haiku-4.5/next_exec_vague_gemini_standardize] No skill search for ENTERPRISE_EXEC scenario
⚠️ [claude-haiku-4.5/next_exec_vague_gemini_standardize] No progressive disclosure meta-tools used
⚠️ [claude-haiku-4.5/next_exec_tool_cost_model] No skill search before tool invoke
⚠️ [claude-haiku-4.5/next_exec_tool_cost_model] No skill search for ENTERPRISE_EXEC scenario
⚠️ [claude-haiku-4.5/next_exec_tool_cost_model] No progressive disclosure meta-tools used
⚠️ [claude-haiku-4.5/next_ecosystem_vague_soundcloud_vpn] No skill search for ECOSYSTEM_PARTNER scenario
⚠️ [claude-haiku-4.5/next_ecosystem_tool_second_order_brief] No skill search before tool invoke
⚠️ [claude-haiku-4.5/next_ecosystem_tool_second_order_brief] No skill search for ECOSYSTEM_PARTNER scenario
⚠️ [claude-haiku-4.5/next_ecosystem_tool_second_order_brief] No progressive disclosure meta-tools used
⚠️ [claude-haiku-4.5/next_quant_vague_disco_track] No skill search for QUANT_ANALYST scenario
⚠️ [claude-haiku-4.5/next_quant_tool_signal_json] No skill search before tool invoke
⚠️ [claude-haiku-4.5/next_quant_tool_signal_json] No skill search for QUANT_ANALYST scenario
⚠️ [claude-haiku-4.5/next_quant_tool_signal_json] No progressive disclosure meta-tools used
⚠️ [claude-haiku-4.5/next_product_vague_make_usable_ui] No skill search before tool invoke
⚠️ [claude-haiku-4.5/next_product_vague_make_usable_ui] No skill search for PRODUCT_DESIGNER scenario
⚠️ [claude-haiku-4.5/next_product_vague_make_usable_ui] No progressive disclosure meta-tools used
⚠️ [claude-haiku-4.5/next_product_tool_expandable_card] No skill search before tool invoke
⚠️ [claude-haiku-4.5/next_product_tool_expandable_card] No skill search for PRODUCT_DESIGNER scenario
⚠️ [claude-haiku-4.5/next_product_tool_expandable_card] No progressive disclosure meta-tools used
⚠️ [claude-haiku-4.5/next_sales_vague_shareable] No skill search before tool invoke
⚠️ [claude-haiku-4.5/next_sales_vague_shareable] No skill search for SALES_ENGINEER scenario
⚠️ [claude-haiku-4.5/next_sales_vague_shareable] No progressive disclosure meta-tools used
⚠️ [claude-haiku-4.5/next_sales_tool_one_screen_objections] No skill search for SALES_ENGINEER scenario
⚠️ [claude-haiku-4.5/stress_ambiguous_persona_disco_wedge_outreach] No skill search before tool invoke
⚠️ [claude-haiku-4.5/stress_ambiguous_persona_disco_wedge_outreach] No progressive disclosure meta-tools used
... and 466 more warnings
