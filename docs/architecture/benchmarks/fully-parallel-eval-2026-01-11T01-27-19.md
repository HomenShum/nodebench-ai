# Fully Parallel Evaluation Results

Generated: 2026-01-11T01:27:19.792Z
Total Time: 271.3s
Suite: pack
Models: 8
Scenarios: 24 of 24 (limit=0)
Total evaluations: 192

## Summary by Model

| Model | Total | Passed | Failed | Avg Time (s) |
|-------|-------|--------|--------|--------------|
| claude-haiku-4.5 | 24 | 8 | 16 | 69.4 |
| gpt-5-mini | 24 | 20 | 4 | 83.3 |
| gemini-3-flash | 24 | 6 | 18 | 13.8 |
| deepseek-r1 | 24 | 10 | 14 | 103.5 |
| deepseek-v3.2 | 24 | 18 | 6 | 100.1 |
| qwen3-235b | 24 | 17 | 7 | 94.8 |
| minimax-m2.1 | 24 | 18 | 6 | 60.8 |
| mimo-v2-flash-free | 24 | 17 | 7 | 53.4 |

## Summary by Scenario

| Scenario | Total | Passed | Failed |
|----------|-------|--------|--------|
| Next: academic tool-driven literature debrief | 8 | 6 | 2 |
| Next: academic vague anchor | 8 | 4 | 4 |
| Next: banker tool-driven outbound pack | 8 | 3 | 5 |
| Next: banker vague (fast debrief) | 8 | 6 | 2 |
| Next: CTO tool-driven CVE plan | 8 | 5 | 3 |
| Next: CTO vague exposure | 8 | 5 | 3 |
| Next: ecosystem tool-driven second-order brief | 8 | 6 | 2 |
| Next: ecosystem vague incident | 8 | 3 | 5 |
| Next: exec tool-driven cost model | 8 | 3 | 5 |
| Next: exec vague standardize | 8 | 2 | 6 |
| Next: founder tool-driven memo | 8 | 2 | 6 |
| Next: founder vague positioning | 8 | 5 | 3 |
| Next: product tool-driven expandable card schema | 8 | 6 | 2 |
| Next: product vague UI usable | 8 | 6 | 2 |
| Next: quant tool-driven signal set JSON | 8 | 7 | 1 |
| Next: quant vague what to track | 8 | 6 | 2 |
| Next: sales tool-driven one-screen + objections | 8 | 6 | 2 |
| Next: sales vague shareable | 8 | 5 | 3 |
| Next: VC tool-driven comps + diligence | 8 | 4 | 4 |
| Next: VC vague wedge | 8 | 7 | 1 |
| Pack: exec cross-provider pricing comparison | 8 | 0 | 8 |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | 8 | 4 | 4 |
| Stress: ambiguous persona (wedge + outreach) | 8 | 5 | 3 |
| Stress: contradiction handling (Seed vs Series A) | 8 | 8 | 0 |

## Detailed Results

### claude-haiku-4.5

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 60.8 | - |
| Next: banker tool-driven outbound pack | ❌ FAIL | 61.5 | Missing [DEBRIEF_V1_JSON] block |
| Next: VC vague wedge | ✅ PASS | 107.5 | - |
| Next: VC tool-driven comps + diligence | ✅ PASS | 64.8 | - |
| Next: CTO vague exposure | ❌ FAIL | 70.1 | persona mismatch: got PRODUCT_DESIGNER expected CTO_TECH_LEAD |
| Next: CTO tool-driven CVE plan | ❌ FAIL | 61.5 | Missing [DEBRIEF_V1_JSON] block |
| Next: founder vague positioning | ❌ FAIL | 70.1 | missing ground truth citation anchor in grounding[] |
| Next: founder tool-driven memo | ❌ FAIL | 70.8 | missing ground truth citation anchor in grounding[] |
| Next: academic vague anchor | ✅ PASS | 86.8 | - |
| Next: academic tool-driven literature debrief | ❌ FAIL | 65.2 | missing ground truth citation anchor in grounding[] |
| Next: exec vague standardize | ✅ PASS | 65.3 | - |
| Next: exec tool-driven cost model | ❌ FAIL | 65.4 | persona mismatch: got PRODUCT_DESIGNER expected ENTERPRISE_EXEC |
| Next: ecosystem vague incident | ❌ FAIL | 70.9 | persona mismatch: got JPM_STARTUP_BANKER expected ECOSYSTEM_PARTNER |
| Next: ecosystem tool-driven second-order brief | ❌ FAIL | 58.7 | hqLocation does not match ground truth |
| Next: quant vague what to track | ❌ FAIL | 70.0 | hqLocation does not match ground truth |
| Next: quant tool-driven signal set JSON | ✅ PASS | 70.4 | - |
| Next: product vague UI usable | ✅ PASS | 71.0 | - |
| Next: product tool-driven expandable card schema | ❌ FAIL | 70.8 | hqLocation does not match ground truth |
| Next: sales vague shareable | ❌ FAIL | 70.4 | persona mismatch: got JPM_STARTUP_BANKER expected SALES_ENGINEER |
| Next: sales tool-driven one-screen + objections | ❌ FAIL | 60.7 | Missing [DEBRIEF_V1_JSON] block |
| Stress: ambiguous persona (wedge + outreach) | ❌ FAIL | 61.6 | Missing [DEBRIEF_V1_JSON] block |
| Stress: contradiction handling (Seed vs Series A) | ✅ PASS | 75.3 | - |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 70.9 | missing ground truth citation anchor in grounding[] |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ❌ FAIL | 64.8 | hqLocation does not match ground truth |

### gpt-5-mini

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 62.4 | - |
| Next: banker tool-driven outbound pack | ✅ PASS | 75.3 | - |
| Next: VC vague wedge | ✅ PASS | 58.1 | - |
| Next: VC tool-driven comps + diligence | ✅ PASS | 75.4 | - |
| Next: CTO vague exposure | ✅ PASS | 72.3 | - |
| Next: CTO tool-driven CVE plan | ✅ PASS | 91.7 | - |
| Next: founder vague positioning | ✅ PASS | 92.6 | - |
| Next: founder tool-driven memo | ❌ FAIL | 137.8 | missing ground truth citation anchor in grounding[] |
| Next: academic vague anchor | ✅ PASS | 71.1 | - |
| Next: academic tool-driven literature debrief | ✅ PASS | 94.0 | - |
| Next: exec vague standardize | ❌ FAIL | 69.9 | persona mismatch: got CTO_TECH_LEAD expected ENTERPRISE_EXEC |
| Next: exec tool-driven cost model | ✅ PASS | 94.2 | - |
| Next: ecosystem vague incident | ✅ PASS | 67.4 | - |
| Next: ecosystem tool-driven second-order brief | ✅ PASS | 82.0 | - |
| Next: quant vague what to track | ✅ PASS | 64.1 | - |
| Next: quant tool-driven signal set JSON | ❌ FAIL | 73.4 | persona mismatch: got EARLY_STAGE_VC expected QUANT_ANALYST |
| Next: product vague UI usable | ✅ PASS | 69.1 | - |
| Next: product tool-driven expandable card schema | ✅ PASS | 107.2 | - |
| Next: sales vague shareable | ✅ PASS | 54.6 | - |
| Next: sales tool-driven one-screen + objections | ✅ PASS | 62.0 | - |
| Stress: ambiguous persona (wedge + outreach) | ✅ PASS | 66.4 | - |
| Stress: contradiction handling (Seed vs Series A) | ✅ PASS | 54.8 | - |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 217.9 | missing verification loop (no planSteps entry includes verify/validate/confirm/c |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ✅ PASS | 85.6 | - |

### gemini-3-flash

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ❌ FAIL | 15.6 | hqLocation does not match ground truth |
| Next: banker tool-driven outbound pack | ❌ FAIL | 14.1 | persona mismatch: got PRODUCT_DESIGNER expected JPM_STARTUP_BANKER |
| Next: VC vague wedge | ❌ FAIL | 13.3 | hqLocation does not match ground truth |
| Next: VC tool-driven comps + diligence | ❌ FAIL | 14.7 | hqLocation does not match ground truth |
| Next: CTO vague exposure | ❌ FAIL | 14.6 | persona mismatch: got PRODUCT_DESIGNER expected CTO_TECH_LEAD |
| Next: CTO tool-driven CVE plan | ❌ FAIL | 13.7 | missing ground truth citation anchor in grounding[] |
| Next: founder vague positioning | ❌ FAIL | 13.1 | missing ground truth citation anchor in grounding[] |
| Next: founder tool-driven memo | ❌ FAIL | 13.8 | missing ground truth citation anchor in grounding[] |
| Next: academic vague anchor | ❌ FAIL | 13.4 | persona mismatch: got JPM_STARTUP_BANKER expected ACADEMIC_RD |
| Next: academic tool-driven literature debrief | ✅ PASS | 13.2 | - |
| Next: exec vague standardize | ❌ FAIL | 13.7 | missing ground truth citation anchor in grounding[] |
| Next: exec tool-driven cost model | ❌ FAIL | 14.3 | persona mismatch: got PRODUCT_DESIGNER expected ENTERPRISE_EXEC |
| Next: ecosystem vague incident | ❌ FAIL | 13.2 | persona mismatch: got JPM_STARTUP_BANKER expected ECOSYSTEM_PARTNER |
| Next: ecosystem tool-driven second-order brief | ✅ PASS | 13.9 | - |
| Next: quant vague what to track | ✅ PASS | 13.2 | - |
| Next: quant tool-driven signal set JSON | ✅ PASS | 13.9 | - |
| Next: product vague UI usable | ✅ PASS | 13.1 | - |
| Next: product tool-driven expandable card schema | ❌ FAIL | 13.5 | hqLocation does not match ground truth |
| Next: sales vague shareable | ❌ FAIL | 13.1 | persona mismatch: got JPM_STARTUP_BANKER expected SALES_ENGINEER |
| Next: sales tool-driven one-screen + objections | ❌ FAIL | 13.4 | hqLocation does not match ground truth |
| Stress: ambiguous persona (wedge + outreach) | ❌ FAIL | 14.4 | hqLocation does not match ground truth |
| Stress: contradiction handling (Seed vs Series A) | ✅ PASS | 13.3 | - |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 13.6 | missing ground truth citation anchor in grounding[] |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ❌ FAIL | 14.7 | hqLocation does not match ground truth |

### deepseek-r1

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ❌ FAIL | 76.6 | Invalid JSON: Unexpected token 'D', ..."lName":

[DEBRIEF_V1"... is not valid JS |
| Next: banker tool-driven outbound pack | ❌ FAIL | 20.6 | persona mismatch: got PRODUCT_DESIGNER expected JPM_STARTUP_BANKER |
| Next: VC vague wedge | ✅ PASS | 101.4 | - |
| Next: VC tool-driven comps + diligence | ❌ FAIL | 127.0 | hqLocation does not match ground truth |
| Next: CTO vague exposure | ✅ PASS | 60.6 | - |
| Next: CTO tool-driven CVE plan | ✅ PASS | 180.7 | - |
| Next: founder vague positioning | ❌ FAIL | 149.7 | missing ground truth citation anchor in grounding[] |
| Next: founder tool-driven memo | ❌ FAIL | 140.2 | missing ground truth citation anchor in grounding[] |
| Next: academic vague anchor | ❌ FAIL | 31.1 | persona mismatch: got JPM_STARTUP_BANKER expected ACADEMIC_RD |
| Next: academic tool-driven literature debrief | ❌ FAIL | 17.5 | missing ground truth citation anchor in grounding[] |
| Next: exec vague standardize | ❌ FAIL | 13.0 | missing ground truth citation anchor in grounding[] |
| Next: exec tool-driven cost model | ❌ FAIL | 107.8 | persona mismatch: got PRODUCT_DESIGNER expected ENTERPRISE_EXEC |
| Next: ecosystem vague incident | ✅ PASS | 200.6 | - |
| Next: ecosystem tool-driven second-order brief | ✅ PASS | 238.2 | - |
| Next: quant vague what to track | ❌ FAIL | 23.2 | hqLocation does not match ground truth |
| Next: quant tool-driven signal set JSON | ✅ PASS | 89.8 | - |
| Next: product vague UI usable | ❌ FAIL | 20.8 | hqLocation does not match ground truth |
| Next: product tool-driven expandable card schema | ✅ PASS | 228.2 | - |
| Next: sales vague shareable | ❌ FAIL | 58.8 | persona mismatch: got JPM_STARTUP_BANKER expected SALES_ENGINEER |
| Next: sales tool-driven one-screen + objections | ✅ PASS | 75.8 | - |
| Stress: ambiguous persona (wedge + outreach) | ❌ FAIL | 39.9 | hqLocation does not match ground truth |
| Stress: contradiction handling (Seed vs Series A) | ✅ PASS | 75.1 | - |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 271.3 | persona mismatch: got QUANT_ANALYST expected ENTERPRISE_EXEC |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ✅ PASS | 136.3 | - |

### deepseek-v3.2

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 75.5 | - |
| Next: banker tool-driven outbound pack | ❌ FAIL | 111.5 | persona mismatch: got SALES_ENGINEER expected JPM_STARTUP_BANKER |
| Next: VC vague wedge | ✅ PASS | 149.3 | - |
| Next: VC tool-driven comps + diligence | ❌ FAIL | 153.6 | hqLocation does not match ground truth |
| Next: CTO vague exposure | ✅ PASS | 62.1 | - |
| Next: CTO tool-driven CVE plan | ✅ PASS | 71.1 | - |
| Next: founder vague positioning | ✅ PASS | 45.0 | - |
| Next: founder tool-driven memo | ❌ FAIL | 188.0 | missing required tools: expected lookupGroundTruthEntity got [searchAvailableSki |
| Next: academic vague anchor | ✅ PASS | 73.4 | - |
| Next: academic tool-driven literature debrief | ✅ PASS | 109.2 | - |
| Next: exec vague standardize | ✅ PASS | 39.8 | - |
| Next: exec tool-driven cost model | ✅ PASS | 139.3 | - |
| Next: ecosystem vague incident | ❌ FAIL | 36.8 | persona mismatch: got JPM_STARTUP_BANKER expected ECOSYSTEM_PARTNER |
| Next: ecosystem tool-driven second-order brief | ✅ PASS | 108.2 | - |
| Next: quant vague what to track | ✅ PASS | 83.1 | - |
| Next: quant tool-driven signal set JSON | ✅ PASS | 33.5 | - |
| Next: product vague UI usable | ✅ PASS | 119.2 | - |
| Next: product tool-driven expandable card schema | ✅ PASS | 171.0 | - |
| Next: sales vague shareable | ✅ PASS | 86.9 | - |
| Next: sales tool-driven one-screen + objections | ✅ PASS | 87.2 | - |
| Stress: ambiguous persona (wedge + outreach) | ✅ PASS | 48.8 | - |
| Stress: contradiction handling (Seed vs Series A) | ✅ PASS | 63.2 | - |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 248.8 | persona mismatch: got CTO_TECH_LEAD expected ENTERPRISE_EXEC |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ❌ FAIL | 98.1 | maxToolCalls exceeded: got 4 expected <= 3 |

### qwen3-235b

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 82.9 | - |
| Next: banker tool-driven outbound pack | ✅ PASS | 96.4 | - |
| Next: VC vague wedge | ✅ PASS | 54.0 | - |
| Next: VC tool-driven comps + diligence | ❌ FAIL | 98.0 | persona mismatch: got JPM_STARTUP_BANKER expected EARLY_STAGE_VC |
| Next: CTO vague exposure | ❌ FAIL | 22.5 | persona mismatch: got PRODUCT_DESIGNER expected CTO_TECH_LEAD |
| Next: CTO tool-driven CVE plan | ✅ PASS | 123.1 | - |
| Next: founder vague positioning | ✅ PASS | 92.6 | - |
| Next: founder tool-driven memo | ✅ PASS | 132.0 | - |
| Next: academic vague anchor | ❌ FAIL | 70.6 | persona mismatch: got JPM_STARTUP_BANKER expected ACADEMIC_RD |
| Next: academic tool-driven literature debrief | ✅ PASS | 87.7 | - |
| Next: exec vague standardize | ❌ FAIL | 98.5 | persona mismatch: got PRODUCT_DESIGNER expected ENTERPRISE_EXEC |
| Next: exec tool-driven cost model | ❌ FAIL | 98.4 | persona mismatch: got PRODUCT_DESIGNER expected ENTERPRISE_EXEC |
| Next: ecosystem vague incident | ❌ FAIL | 57.0 | persona mismatch: got JPM_STARTUP_BANKER expected ECOSYSTEM_PARTNER |
| Next: ecosystem tool-driven second-order brief | ✅ PASS | 80.5 | - |
| Next: quant vague what to track | ✅ PASS | 60.4 | - |
| Next: quant tool-driven signal set JSON | ✅ PASS | 106.8 | - |
| Next: product vague UI usable | ✅ PASS | 111.3 | - |
| Next: product tool-driven expandable card schema | ✅ PASS | 171.9 | - |
| Next: sales vague shareable | ✅ PASS | 108.3 | - |
| Next: sales tool-driven one-screen + objections | ✅ PASS | 109.3 | - |
| Stress: ambiguous persona (wedge + outreach) | ✅ PASS | 76.4 | - |
| Stress: contradiction handling (Seed vs Series A) | ✅ PASS | 57.6 | - |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 177.4 | persona mismatch: got QUANT_ANALYST expected ENTERPRISE_EXEC |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ✅ PASS | 102.7 | - |

### minimax-m2.1

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 45.4 | - |
| Next: banker tool-driven outbound pack | ✅ PASS | 32.8 | - |
| Next: VC vague wedge | ✅ PASS | 42.0 | - |
| Next: VC tool-driven comps + diligence | ✅ PASS | 122.1 | - |
| Next: CTO vague exposure | ✅ PASS | 32.1 | - |
| Next: CTO tool-driven CVE plan | ✅ PASS | 166.4 | - |
| Next: founder vague positioning | ✅ PASS | 74.8 | - |
| Next: founder tool-driven memo | ✅ PASS | 130.4 | - |
| Next: academic vague anchor | ✅ PASS | 36.3 | - |
| Next: academic tool-driven literature debrief | ✅ PASS | 91.7 | - |
| Next: exec vague standardize | ❌ FAIL | 59.0 | persona mismatch: got CTO_TECH_LEAD expected ENTERPRISE_EXEC |
| Next: exec tool-driven cost model | ❌ FAIL | 75.5 | missing required tools: expected lookupGroundTruthEntity got [searchAvailableSki |
| Next: ecosystem vague incident | ✅ PASS | 33.6 | - |
| Next: ecosystem tool-driven second-order brief | ❌ FAIL | 70.8 | hqLocation does not match ground truth |
| Next: quant vague what to track | ✅ PASS | 39.4 | - |
| Next: quant tool-driven signal set JSON | ✅ PASS | 39.4 | - |
| Next: product vague UI usable | ❌ FAIL | 29.7 | persona mismatch: got JPM_STARTUP_BANKER expected PRODUCT_DESIGNER |
| Next: product tool-driven expandable card schema | ✅ PASS | 41.6 | - |
| Next: sales vague shareable | ✅ PASS | 25.0 | - |
| Next: sales tool-driven one-screen + objections | ✅ PASS | 23.6 | - |
| Stress: ambiguous persona (wedge + outreach) | ✅ PASS | 44.4 | - |
| Stress: contradiction handling (Seed vs Series A) | ✅ PASS | 29.2 | - |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 129.5 | persona mismatch: got QUANT_ANALYST expected ENTERPRISE_EXEC |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ❌ FAIL | 45.5 | missing verification loop (no planSteps entry includes verify/validate/confirm/c |

### mimo-v2-flash-free

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 22.3 | - |
| Next: banker tool-driven outbound pack | ❌ FAIL | 35.3 | persona mismatch: got SALES_ENGINEER expected JPM_STARTUP_BANKER |
| Next: VC vague wedge | ✅ PASS | 28.1 | - |
| Next: VC tool-driven comps + diligence | ✅ PASS | 88.1 | - |
| Next: CTO vague exposure | ✅ PASS | 31.0 | - |
| Next: CTO tool-driven CVE plan | ❌ FAIL | 65.2 | entity mismatch: got resolvedId='N/A' canonical='CVE-2025-62495' expected 'MQUIC |
| Next: founder vague positioning | ✅ PASS | 36.6 | - |
| Next: founder tool-driven memo | ❌ FAIL | 129.5 | missing required tools: expected lookupGroundTruthEntity got [searchAvailableSki |
| Next: academic vague anchor | ❌ FAIL | 52.3 | missing required tools: expected lookupGroundTruthEntity got [searchAvailableSki |
| Next: academic tool-driven literature debrief | ✅ PASS | 30.6 | - |
| Next: exec vague standardize | ❌ FAIL | 21.6 | persona mismatch: got CTO_TECH_LEAD expected ENTERPRISE_EXEC |
| Next: exec tool-driven cost model | ✅ PASS | 96.1 | - |
| Next: ecosystem vague incident | ❌ FAIL | 44.7 | persona.inferred must be a known persona |
| Next: ecosystem tool-driven second-order brief | ✅ PASS | 65.0 | - |
| Next: quant vague what to track | ✅ PASS | 28.3 | - |
| Next: quant tool-driven signal set JSON | ✅ PASS | 49.7 | - |
| Next: product vague UI usable | ✅ PASS | 37.1 | - |
| Next: product tool-driven expandable card schema | ✅ PASS | 29.7 | - |
| Next: sales vague shareable | ✅ PASS | 18.2 | - |
| Next: sales tool-driven one-screen + objections | ✅ PASS | 146.1 | - |
| Stress: ambiguous persona (wedge + outreach) | ✅ PASS | 18.8 | - |
| Stress: contradiction handling (Seed vs Series A) | ✅ PASS | 25.5 | - |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 74.7 | missing ground truth citation anchor in grounding[] |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ✅ PASS | 106.1 | - |

## Disclosure Metrics (P0 Instrumentation)

### Disclosure Level by Model

| Model | Full | Partial | None |
|-------|------|---------|------|
| claude-haiku-4.5 | 0 | 20 | 4 |
| gpt-5-mini | 0 | 24 | 0 |
| gemini-3-flash | 0 | 24 | 0 |
| deepseek-r1 | 1 | 17 | 6 |
| deepseek-v3.2 | 0 | 24 | 0 |
| qwen3-235b | 0 | 20 | 4 |
| minimax-m2.1 | 0 | 22 | 2 |
| mimo-v2-flash-free | 0 | 24 | 0 |

### Disclosure Warnings (Non-Scored)

> **Note:** These warnings are informational and do not affect pass/fail.
> They track progressive disclosure usage for Week 1-2 observability.

⚠️ [deepseek-r1/next_ecosystem_tool_second_order_brief] Excessive direct tool calls: 112 (>10)
⚠️ [qwen3-235b/next_banker_tool_ambros_outbound_pack] No skill search before tool invoke
⚠️ [qwen3-235b/next_banker_tool_ambros_outbound_pack] No progressive disclosure meta-tools used
⚠️ [qwen3-235b/next_vc_vague_disco_wedge] No skill search before tool invoke
⚠️ [qwen3-235b/next_vc_vague_disco_wedge] No skill search for EARLY_STAGE_VC scenario
⚠️ [qwen3-235b/next_vc_vague_disco_wedge] No progressive disclosure meta-tools used
⚠️ [qwen3-235b/next_cto_vague_quickjs_exposure] No skill search before tool invoke
⚠️ [qwen3-235b/next_cto_vague_quickjs_exposure] No skill search for CTO_TECH_LEAD scenario
⚠️ [qwen3-235b/next_cto_vague_quickjs_exposure] No progressive disclosure meta-tools used
⚠️ [qwen3-235b/pack_meta_budgeted_deep_dive] No skill search before tool invoke
⚠️ [qwen3-235b/pack_meta_budgeted_deep_dive] No skill search for EARLY_STAGE_VC scenario
⚠️ [qwen3-235b/pack_meta_budgeted_deep_dive] No progressive disclosure meta-tools used
⚠️ [minimax-m2.1/next_exec_vague_gemini_standardize] No skill search before tool invoke
⚠️ [minimax-m2.1/next_exec_vague_gemini_standardize] No skill search for ENTERPRISE_EXEC scenario
⚠️ [minimax-m2.1/next_exec_vague_gemini_standardize] No progressive disclosure meta-tools used
⚠️ [minimax-m2.1/pack_exec_cross_provider_pricing] No skill search before tool invoke
⚠️ [minimax-m2.1/pack_exec_cross_provider_pricing] No skill search for ENTERPRISE_EXEC scenario
⚠️ [minimax-m2.1/pack_exec_cross_provider_pricing] No progressive disclosure meta-tools used
