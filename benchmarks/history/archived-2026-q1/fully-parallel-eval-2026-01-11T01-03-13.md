# Fully Parallel Evaluation Results

Generated: 2026-01-11T01:03:13.543Z
Total Time: 300.5s
Suite: pack
Models: 8
Scenarios: 24 of 24 (limit=0)
Total evaluations: 192

## Summary by Model

| Model | Total | Passed | Failed | Avg Time (s) |
|-------|-------|--------|--------|--------------|
| claude-haiku-4.5 | 24 | 2 | 22 | 72.2 |
| gpt-5-mini | 24 | 20 | 3 | 78.5 |
| gemini-3-flash | 24 | 17 | 7 | 24.4 |
| deepseek-r1 | 24 | 3 | 20 | 62.1 |
| deepseek-v3.2 | 24 | 18 | 4 | 103.7 |
| qwen3-235b | 24 | 16 | 8 | 91.8 |
| minimax-m2.1 | 24 | 18 | 6 | 57.3 |
| mimo-v2-flash-free | 24 | 15 | 9 | 47.6 |

## Summary by Scenario

| Scenario | Total | Passed | Failed |
|----------|-------|--------|--------|
| Next: academic tool-driven literature debrief | 8 | 6 | 2 |
| Next: academic vague anchor | 8 | 5 | 3 |
| Next: banker tool-driven outbound pack | 8 | 4 | 4 |
| Next: banker vague (fast debrief) | 8 | 6 | 2 |
| Next: CTO tool-driven CVE plan | 8 | 6 | 2 |
| Next: CTO vague exposure | 8 | 3 | 5 |
| Next: ecosystem tool-driven second-order brief | 8 | 6 | 2 |
| Next: ecosystem vague incident | 8 | 5 | 3 |
| Next: exec tool-driven cost model | 8 | 4 | 4 |
| Next: exec vague standardize | 8 | 4 | 4 |
| Next: founder tool-driven memo | 7 | 3 | 4 |
| Next: founder vague positioning | 8 | 6 | 2 |
| Next: product tool-driven expandable card schema | 8 | 5 | 3 |
| Next: product vague UI usable | 8 | 3 | 5 |
| Next: quant tool-driven signal set JSON | 8 | 4 | 4 |
| Next: quant vague what to track | 8 | 6 | 2 |
| Next: sales tool-driven one-screen + objections | 8 | 4 | 4 |
| Next: sales vague shareable | 8 | 6 | 2 |
| Next: VC tool-driven comps + diligence | 6 | 3 | 3 |
| Next: VC vague wedge | 8 | 5 | 3 |
| offset:22 | 1 | 0 | 1 |
| offset:3 | 2 | 0 | 2 |
| offset:7 | 1 | 0 | 1 |
| Pack: exec cross-provider pricing comparison | 7 | 1 | 6 |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | 8 | 4 | 4 |
| Stress: ambiguous persona (wedge + outreach) | 8 | 4 | 4 |
| Stress: contradiction handling (Seed vs Series A) | 8 | 6 | 2 |

## Detailed Results

### claude-haiku-4.5

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ❌ FAIL | 71.4 | hqLocation does not match ground truth |
| Next: banker tool-driven outbound pack | ✅ PASS | 137.6 | - |
| Next: VC vague wedge | ❌ FAIL | 77.4 | funding.stage mismatch: got 'N/A' expected 'Seed' |
| Next: VC tool-driven comps + diligence | ❌ FAIL | 71.1 | hqLocation does not match ground truth |
| Next: CTO vague exposure | ❌ FAIL | 70.9 | persona mismatch: got PRODUCT_DESIGNER expected CTO_TECH_LEAD |
| Next: CTO tool-driven CVE plan | ❌ FAIL | 59.8 | Missing [DEBRIEF_V1_JSON] block |
| Next: founder vague positioning | ❌ FAIL | 60.8 | Missing [DEBRIEF_V1_JSON] block |
| Next: founder tool-driven memo | ❌ FAIL | 70.8 | missing ground truth citation anchor in grounding[] |
| Next: academic vague anchor | ❌ FAIL | 62.5 | Missing [DEBRIEF_V1_JSON] block |
| Next: academic tool-driven literature debrief | ❌ FAIL | 71.1 | missing ground truth citation anchor in grounding[] |
| Next: exec vague standardize | ❌ FAIL | 71.0 | missing ground truth citation anchor in grounding[] |
| Next: exec tool-driven cost model | ❌ FAIL | 62.5 | Missing [DEBRIEF_V1_JSON] block |
| Next: ecosystem vague incident | ❌ FAIL | 70.9 | persona mismatch: got JPM_STARTUP_BANKER expected ECOSYSTEM_PARTNER |
| Next: ecosystem tool-driven second-order brief | ❌ FAIL | 77.3 | hqLocation does not match ground truth |
| Next: quant vague what to track | ❌ FAIL | 59.4 | hqLocation does not match ground truth |
| Next: quant tool-driven signal set JSON | ❌ FAIL | 71.4 | funding.stage mismatch: got 'N/A' expected 'Seed' |
| Next: product vague UI usable | ❌ FAIL | 71.1 | funding.stage mismatch: got 'N/A' expected 'Seed' |
| Next: product tool-driven expandable card schema | ❌ FAIL | 70.8 | funding.stage mismatch: got 'N/A' expected 'Seed' |
| Next: sales vague shareable | ❌ FAIL | 65.0 | persona mismatch: got JPM_STARTUP_BANKER expected SALES_ENGINEER |
| Next: sales tool-driven one-screen + objections | ❌ FAIL | 60.4 | Missing [DEBRIEF_V1_JSON] block |
| Stress: ambiguous persona (wedge + outreach) | ✅ PASS | 84.4 | - |
| Stress: contradiction handling (Seed vs Series A) | ❌ FAIL | 71.5 | hqLocation does not match ground truth |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 71.1 | missing ground truth citation anchor in grounding[] |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ❌ FAIL | 71.3 | funding.stage mismatch: got 'N/A' expected 'Seed' |

### gpt-5-mini

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 49.0 | - |
| Next: banker tool-driven outbound pack | ✅ PASS | 43.3 | - |
| Next: VC vague wedge | ✅ PASS | 54.4 | - |
| Next: VC tool-driven comps + diligence | ✅ PASS | 86.0 | - |
| Next: CTO vague exposure | ✅ PASS | 70.3 | - |
| Next: CTO tool-driven CVE plan | ✅ PASS | 76.1 | - |
| Next: founder vague positioning | ✅ PASS | 71.0 | - |
| offset:7 | ❌ FAIL | 300.4 | - |
| Next: academic vague anchor | ✅ PASS | 61.7 | - |
| Next: academic tool-driven literature debrief | ✅ PASS | 100.1 | - |
| Next: exec vague standardize | ❌ FAIL | 54.8 | persona mismatch: got CTO_TECH_LEAD expected ENTERPRISE_EXEC |
| Next: exec tool-driven cost model | ✅ PASS | 90.4 | - |
| Next: ecosystem vague incident | ✅ PASS | 48.7 | - |
| Next: ecosystem tool-driven second-order brief | ✅ PASS | 97.2 | - |
| Next: quant vague what to track | ✅ PASS | 57.6 | - |
| Next: quant tool-driven signal set JSON | ✅ PASS | 52.8 | - |
| Next: product vague UI usable | ❌ FAIL | 54.8 | persona mismatch: got JPM_STARTUP_BANKER expected PRODUCT_DESIGNER |
| Next: product tool-driven expandable card schema | ✅ PASS | 63.6 | - |
| Next: sales vague shareable | ✅ PASS | 40.8 | - |
| Next: sales tool-driven one-screen + objections | ✅ PASS | 54.0 | - |
| Stress: ambiguous persona (wedge + outreach) | ✅ PASS | 55.6 | - |
| Stress: contradiction handling (Seed vs Series A) | ✅ PASS | 52.3 | - |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 172.8 | persona mismatch: got CTO_TECH_LEAD expected ENTERPRISE_EXEC |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ✅ PASS | 77.3 | - |

### gemini-3-flash

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 22.5 | - |
| Next: banker tool-driven outbound pack | ❌ FAIL | 23.2 | persona mismatch: got PRODUCT_DESIGNER expected JPM_STARTUP_BANKER |
| Next: VC vague wedge | ❌ FAIL | 13.5 | funding.stage mismatch: got 'N/A' expected 'Seed' |
| Next: VC tool-driven comps + diligence | ❌ FAIL | 20.6 | hqLocation does not match ground truth |
| Next: CTO vague exposure | ❌ FAIL | 28.0 | persona mismatch: got PRODUCT_DESIGNER expected CTO_TECH_LEAD |
| Next: CTO tool-driven CVE plan | ✅ PASS | 25.8 | - |
| Next: founder vague positioning | ✅ PASS | 36.4 | - |
| Next: founder tool-driven memo | ✅ PASS | 22.4 | - |
| Next: academic vague anchor | ✅ PASS | 24.3 | - |
| Next: academic tool-driven literature debrief | ✅ PASS | 34.0 | - |
| Next: exec vague standardize | ✅ PASS | 34.9 | - |
| Next: exec tool-driven cost model | ✅ PASS | 26.7 | - |
| Next: ecosystem vague incident | ✅ PASS | 28.5 | - |
| Next: ecosystem tool-driven second-order brief | ✅ PASS | 31.0 | - |
| Next: quant vague what to track | ✅ PASS | 14.2 | - |
| Next: quant tool-driven signal set JSON | ❌ FAIL | 22.6 | funding.stage mismatch: got 'N/A' expected 'Seed' |
| Next: product vague UI usable | ✅ PASS | 20.8 | - |
| Next: product tool-driven expandable card schema | ✅ PASS | 22.0 | - |
| Next: sales vague shareable | ✅ PASS | 22.2 | - |
| Next: sales tool-driven one-screen + objections | ❌ FAIL | 14.4 | funding.stage mismatch: got 'N/A' expected 'Seed' |
| Stress: ambiguous persona (wedge + outreach) | ❌ FAIL | 14.3 | hqLocation does not match ground truth |
| Stress: contradiction handling (Seed vs Series A) | ✅ PASS | 25.2 | - |
| Pack: exec cross-provider pricing comparison | ✅ PASS | 33.9 | - |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ✅ PASS | 24.0 | - |

### deepseek-r1

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ❌ FAIL | 55.6 | funding.stage mismatch: got 'N/A' expected 'Seed' |
| Next: banker tool-driven outbound pack | ❌ FAIL | 87.1 | persona mismatch: got SALES_ENGINEER expected JPM_STARTUP_BANKER |
| Next: VC vague wedge | ❌ FAIL | 25.1 | hqLocation does not match ground truth |
| offset:3 | ❌ FAIL | 300.5 | - |
| Next: CTO vague exposure | ❌ FAIL | 13.7 | persona mismatch: got PRODUCT_DESIGNER expected CTO_TECH_LEAD |
| Next: CTO tool-driven CVE plan | ❌ FAIL | 30.4 | missing ground truth citation anchor in grounding[] |
| Next: founder vague positioning | ❌ FAIL | 209.8 | missing ground truth citation anchor in grounding[] |
| Next: founder tool-driven memo | ❌ FAIL | 39.4 | missing ground truth citation anchor in grounding[] |
| Next: academic vague anchor | ❌ FAIL | 37.2 | persona mismatch: got JPM_STARTUP_BANKER expected ACADEMIC_RD |
| Next: academic tool-driven literature debrief | ❌ FAIL | 38.2 | missing ground truth citation anchor in grounding[] |
| Next: exec vague standardize | ❌ FAIL | 14.9 | missing ground truth citation anchor in grounding[] |
| Next: exec tool-driven cost model | ❌ FAIL | 32.5 | persona mismatch: got PRODUCT_DESIGNER expected ENTERPRISE_EXEC |
| Next: ecosystem vague incident | ❌ FAIL | 116.3 | missing ground truth citation anchor in grounding[] |
| Next: ecosystem tool-driven second-order brief | ❌ FAIL | 15.8 | hqLocation does not match ground truth |
| Next: quant vague what to track | ✅ PASS | 55.6 | - |
| Next: quant tool-driven signal set JSON | ❌ FAIL | 22.0 | hqLocation does not match ground truth |
| Next: product vague UI usable | ❌ FAIL | 17.3 | hqLocation does not match ground truth |
| Next: product tool-driven expandable card schema | ❌ FAIL | 73.2 | hqLocation does not match ground truth |
| Next: sales vague shareable | ❌ FAIL | 10.9 | persona mismatch: got JPM_STARTUP_BANKER expected SALES_ENGINEER |
| Next: sales tool-driven one-screen + objections | ❌ FAIL | 88.4 | persona mismatch: got JPM_STARTUP_BANKER expected SALES_ENGINEER |
| Stress: ambiguous persona (wedge + outreach) | ❌ FAIL | 21.1 | hqLocation does not match ground truth |
| Stress: contradiction handling (Seed vs Series A) | ✅ PASS | 78.8 | - |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 27.2 | missing ground truth citation anchor in grounding[] |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ✅ PASS | 80.0 | - |

### deepseek-v3.2

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 64.3 | - |
| Next: banker tool-driven outbound pack | ✅ PASS | 74.9 | - |
| Next: VC vague wedge | ✅ PASS | 87.1 | - |
| offset:3 | ❌ FAIL | 300.5 | - |
| Next: CTO vague exposure | ✅ PASS | 92.1 | - |
| Next: CTO tool-driven CVE plan | ✅ PASS | 102.4 | - |
| Next: founder vague positioning | ✅ PASS | 66.2 | - |
| Next: founder tool-driven memo | ✅ PASS | 152.2 | - |
| Next: academic vague anchor | ✅ PASS | 53.2 | - |
| Next: academic tool-driven literature debrief | ✅ PASS | 69.2 | - |
| Next: exec vague standardize | ✅ PASS | 78.0 | - |
| Next: exec tool-driven cost model | ❌ FAIL | 24.7 | persona mismatch: got PRODUCT_DESIGNER expected ENTERPRISE_EXEC |
| Next: ecosystem vague incident | ✅ PASS | 76.3 | - |
| Next: ecosystem tool-driven second-order brief | ✅ PASS | 137.7 | - |
| Next: quant vague what to track | ❌ FAIL | 43.5 | funding.stage mismatch: got 'N/A' expected 'Seed' |
| Next: quant tool-driven signal set JSON | ✅ PASS | 77.7 | - |
| Next: product vague UI usable | ✅ PASS | 91.9 | - |
| Next: product tool-driven expandable card schema | ✅ PASS | 135.6 | - |
| Next: sales vague shareable | ✅ PASS | 64.3 | - |
| Next: sales tool-driven one-screen + objections | ✅ PASS | 65.8 | - |
| Stress: ambiguous persona (wedge + outreach) | ❌ FAIL | 132.6 | funding.stage mismatch: got 'N/A' expected 'Seed' |
| Stress: contradiction handling (Seed vs Series A) | ✅ PASS | 75.9 | - |
| offset:22 | ❌ FAIL | 300.5 | - |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ❌ FAIL | 121.6 | maxToolCalls exceeded: got 6 expected <= 3 |

### qwen3-235b

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 95.8 | - |
| Next: banker tool-driven outbound pack | ❌ FAIL | 87.8 | persona mismatch: got SALES_ENGINEER expected JPM_STARTUP_BANKER |
| Next: VC vague wedge | ✅ PASS | 82.2 | - |
| Next: VC tool-driven comps + diligence | ❌ FAIL | 126.6 | funding.stage mismatch: got 'N/A' expected 'Seed' |
| Next: CTO vague exposure | ❌ FAIL | 99.1 | persona mismatch: got PRODUCT_DESIGNER expected CTO_TECH_LEAD |
| Next: CTO tool-driven CVE plan | ✅ PASS | 83.7 | - |
| Next: founder vague positioning | ✅ PASS | 104.4 | - |
| Next: founder tool-driven memo | ✅ PASS | 148.5 | - |
| Next: academic vague anchor | ✅ PASS | 74.4 | - |
| Next: academic tool-driven literature debrief | ✅ PASS | 46.0 | - |
| Next: exec vague standardize | ✅ PASS | 81.7 | - |
| Next: exec tool-driven cost model | ✅ PASS | 141.5 | - |
| Next: ecosystem vague incident | ✅ PASS | 81.6 | - |
| Next: ecosystem tool-driven second-order brief | ✅ PASS | 114.7 | - |
| Next: quant vague what to track | ✅ PASS | 86.6 | - |
| Next: quant tool-driven signal set JSON | ❌ FAIL | 68.4 | funding.stage mismatch: got 'N/A' expected 'Seed' |
| Next: product vague UI usable | ❌ FAIL | 73.4 | persona mismatch: got JPM_STARTUP_BANKER expected PRODUCT_DESIGNER |
| Next: product tool-driven expandable card schema | ❌ FAIL | 96.2 | funding.stage mismatch: got 'N/A' expected 'Seed' |
| Next: sales vague shareable | ✅ PASS | 81.6 | - |
| Next: sales tool-driven one-screen + objections | ✅ PASS | 84.6 | - |
| Stress: ambiguous persona (wedge + outreach) | ✅ PASS | 90.3 | - |
| Stress: contradiction handling (Seed vs Series A) | ✅ PASS | 83.2 | - |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 93.0 | missing required tools: expected linkupSearch got [searchAvailableSkills, descri |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ❌ FAIL | 78.1 | missing verification loop (no planSteps entry includes verify/validate/confirm/c |

### minimax-m2.1

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 40.8 | - |
| Next: banker tool-driven outbound pack | ✅ PASS | 39.7 | - |
| Next: VC vague wedge | ✅ PASS | 33.7 | - |
| Next: VC tool-driven comps + diligence | ✅ PASS | 92.2 | - |
| Next: CTO vague exposure | ❌ FAIL | 25.3 | Invalid JSON: Unexpected non-whitespace character after JSON at position 827 |
| Next: CTO tool-driven CVE plan | ✅ PASS | 87.0 | - |
| Next: founder vague positioning | ✅ PASS | 50.6 | - |
| Next: founder tool-driven memo | ❌ FAIL | 113.3 | missing ground truth citation anchor in grounding[] |
| Next: academic vague anchor | ✅ PASS | 32.9 | - |
| Next: academic tool-driven literature debrief | ✅ PASS | 81.4 | - |
| Next: exec vague standardize | ✅ PASS | 31.7 | - |
| Next: exec tool-driven cost model | ❌ FAIL | 122.0 | Invalid JSON: Unexpected non-whitespace character after JSON at position 1023 |
| Next: ecosystem vague incident | ✅ PASS | 54.9 | - |
| Next: ecosystem tool-driven second-order brief | ✅ PASS | 99.5 | - |
| Next: quant vague what to track | ✅ PASS | 29.7 | - |
| Next: quant tool-driven signal set JSON | ✅ PASS | 43.6 | - |
| Next: product vague UI usable | ❌ FAIL | 30.7 | persona mismatch: got JPM_STARTUP_BANKER expected PRODUCT_DESIGNER |
| Next: product tool-driven expandable card schema | ✅ PASS | 54.8 | - |
| Next: sales vague shareable | ✅ PASS | 21.7 | - |
| Next: sales tool-driven one-screen + objections | ✅ PASS | 34.1 | - |
| Stress: ambiguous persona (wedge + outreach) | ✅ PASS | 35.4 | - |
| Stress: contradiction handling (Seed vs Series A) | ✅ PASS | 26.7 | - |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 117.7 | missing ground truth citation anchor in grounding[] |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ❌ FAIL | 77.2 | missing verification loop (no planSteps entry includes verify/validate/confirm/c |

### mimo-v2-flash-free

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 28.2 | - |
| Next: banker tool-driven outbound pack | ❌ FAIL | 50.1 | persona mismatch: got SALES_ENGINEER expected JPM_STARTUP_BANKER |
| Next: VC vague wedge | ✅ PASS | 23.0 | - |
| Next: VC tool-driven comps + diligence | ✅ PASS | 134.4 | - |
| Next: CTO vague exposure | ✅ PASS | 31.2 | - |
| Next: CTO tool-driven CVE plan | ✅ PASS | 87.2 | - |
| Next: founder vague positioning | ✅ PASS | 42.3 | - |
| Next: founder tool-driven memo | ❌ FAIL | 87.2 | missing required tools: expected lookupGroundTruthEntity got [searchAvailableSki |
| Next: academic vague anchor | ❌ FAIL | 40.8 | missing ground truth citation anchor in grounding[] |
| Next: academic tool-driven literature debrief | ✅ PASS | 65.0 | - |
| Next: exec vague standardize | ❌ FAIL | 34.1 | persona mismatch: got EARLY_STAGE_VC expected ENTERPRISE_EXEC |
| Next: exec tool-driven cost model | ✅ PASS | 80.4 | - |
| Next: ecosystem vague incident | ❌ FAIL | 27.5 | persona.inferred must be a known persona |
| Next: ecosystem tool-driven second-order brief | ✅ PASS | 61.6 | - |
| Next: quant vague what to track | ✅ PASS | 34.2 | - |
| Next: quant tool-driven signal set JSON | ✅ PASS | 54.4 | - |
| Next: product vague UI usable | ✅ PASS | 20.2 | - |
| Next: product tool-driven expandable card schema | ✅ PASS | 36.6 | - |
| Next: sales vague shareable | ✅ PASS | 19.2 | - |
| Next: sales tool-driven one-screen + objections | ❌ FAIL | 29.2 | funding.stage mismatch: got 'N/A' expected 'Seed' |
| Stress: ambiguous persona (wedge + outreach) | ❌ FAIL | 29.2 | funding.stage mismatch: got 'N/A' expected 'Seed' |
| Stress: contradiction handling (Seed vs Series A) | ❌ FAIL | 23.2 | persona.inferred must be a known persona |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 72.8 | persona mismatch: got CTO_TECH_LEAD expected ENTERPRISE_EXEC |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ✅ PASS | 29.7 | - |

## Disclosure Metrics (P0 Instrumentation)

### Disclosure Level by Model

| Model | Full | Partial | None |
|-------|------|---------|------|
| claude-haiku-4.5 | 0 | 19 | 5 |
| gpt-5-mini | 0 | 23 | 0 |
| gemini-3-flash | 0 | 24 | 0 |
| deepseek-r1 | 0 | 15 | 8 |
| deepseek-v3.2 | 0 | 22 | 0 |
| qwen3-235b | 1 | 19 | 4 |
| minimax-m2.1 | 0 | 23 | 1 |
| mimo-v2-flash-free | 0 | 24 | 0 |

### Disclosure Warnings (Non-Scored)

> **Note:** These warnings are informational and do not affect pass/fail.
> They track progressive disclosure usage for Week 1-2 observability.

⚠️ [qwen3-235b/next_vc_vague_disco_wedge] No skill search before tool invoke
⚠️ [qwen3-235b/next_vc_vague_disco_wedge] No skill search for EARLY_STAGE_VC scenario
⚠️ [qwen3-235b/next_vc_vague_disco_wedge] No progressive disclosure meta-tools used
⚠️ [qwen3-235b/next_cto_tool_cve_plan] No skill search before tool invoke
⚠️ [qwen3-235b/next_cto_tool_cve_plan] No skill search for CTO_TECH_LEAD scenario
⚠️ [qwen3-235b/next_cto_tool_cve_plan] No progressive disclosure meta-tools used
⚠️ [qwen3-235b/next_academic_vague_ryr2_alz] No skill search before tool invoke
⚠️ [qwen3-235b/next_academic_vague_ryr2_alz] No skill search for ACADEMIC_RD scenario
⚠️ [qwen3-235b/next_academic_vague_ryr2_alz] No progressive disclosure meta-tools used
⚠️ [qwen3-235b/next_academic_tool_lit_debrief] No skill search before tool invoke
⚠️ [qwen3-235b/next_academic_tool_lit_debrief] No skill search for ACADEMIC_RD scenario
⚠️ [qwen3-235b/next_academic_tool_lit_debrief] No progressive disclosure meta-tools used
⚠️ [minimax-m2.1/pack_meta_budgeted_deep_dive] No skill search before tool invoke
⚠️ [minimax-m2.1/pack_meta_budgeted_deep_dive] No skill search for EARLY_STAGE_VC scenario
⚠️ [minimax-m2.1/pack_meta_budgeted_deep_dive] No progressive disclosure meta-tools used
