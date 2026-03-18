# Fully Parallel Evaluation Results

Generated: 2026-01-11T00:56:22.149Z
Total Time: 300.5s
Suite: pack
Models: 8
Scenarios: 24 of 24 (limit=0)
Total evaluations: 192

## Summary by Model

| Model | Total | Passed | Failed | Avg Time (s) |
|-------|-------|--------|--------|--------------|
| claude-haiku-4.5 | 24 | 2 | 22 | 51.3 |
| gpt-5-mini | 24 | 15 | 8 | 76.2 |
| gemini-3-flash | 24 | 4 | 20 | 14.2 |
| deepseek-r1 | 24 | 12 | 11 | 106.7 |
| deepseek-v3.2 | 24 | 16 | 8 | 85.9 |
| qwen3-235b | 24 | 13 | 11 | 91.7 |
| minimax-m2.1 | 24 | 17 | 7 | 63.8 |
| mimo-v2-flash-free | 24 | 15 | 9 | 51.3 |

## Summary by Scenario

| Scenario | Total | Passed | Failed |
|----------|-------|--------|--------|
| Next: academic tool-driven literature debrief | 8 | 5 | 3 |
| Next: academic vague anchor | 8 | 2 | 6 |
| Next: banker tool-driven outbound pack | 8 | 2 | 6 |
| Next: banker vague (fast debrief) | 8 | 4 | 4 |
| Next: CTO tool-driven CVE plan | 7 | 3 | 4 |
| Next: CTO vague exposure | 8 | 6 | 2 |
| Next: ecosystem tool-driven second-order brief | 8 | 6 | 2 |
| Next: ecosystem vague incident | 8 | 2 | 6 |
| Next: exec tool-driven cost model | 8 | 4 | 4 |
| Next: exec vague standardize | 8 | 3 | 5 |
| Next: founder tool-driven memo | 8 | 2 | 6 |
| Next: founder vague positioning | 8 | 3 | 5 |
| Next: product tool-driven expandable card schema | 8 | 5 | 3 |
| Next: product vague UI usable | 8 | 3 | 5 |
| Next: quant tool-driven signal set JSON | 8 | 5 | 3 |
| Next: quant vague what to track | 8 | 8 | 0 |
| Next: sales tool-driven one-screen + objections | 8 | 5 | 3 |
| Next: sales vague shareable | 7 | 3 | 4 |
| Next: VC tool-driven comps + diligence | 8 | 4 | 4 |
| Next: VC vague wedge | 8 | 7 | 1 |
| offset:18 | 1 | 0 | 1 |
| offset:5 | 1 | 0 | 1 |
| Pack: exec cross-provider pricing comparison | 8 | 0 | 8 |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | 8 | 1 | 7 |
| Stress: ambiguous persona (wedge + outreach) | 8 | 6 | 2 |
| Stress: contradiction handling (Seed vs Series A) | 8 | 5 | 3 |

## Detailed Results

### claude-haiku-4.5

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ❌ FAIL | 46.5 | funding.stage mismatch: got 'N/A' expected 'Seed' |
| Next: banker tool-driven outbound pack | ❌ FAIL | 52.4 | persona mismatch: got PRODUCT_DESIGNER expected JPM_STARTUP_BANKER |
| Next: VC vague wedge | ✅ PASS | 57.7 | - |
| Next: VC tool-driven comps + diligence | ❌ FAIL | 49.2 | hqLocation does not match ground truth |
| Next: CTO vague exposure | ❌ FAIL | 52.7 | persona mismatch: got PRODUCT_DESIGNER expected CTO_TECH_LEAD |
| Next: CTO tool-driven CVE plan | ❌ FAIL | 46.7 | missing ground truth citation anchor in grounding[] |
| Next: founder vague positioning | ❌ FAIL | 52.6 | missing ground truth citation anchor in grounding[] |
| Next: founder tool-driven memo | ❌ FAIL | 52.7 | missing ground truth citation anchor in grounding[] |
| Next: academic vague anchor | ❌ FAIL | 46.8 | Missing [DEBRIEF_V1_JSON] block |
| Next: academic tool-driven literature debrief | ❌ FAIL | 46.3 | missing ground truth citation anchor in grounding[] |
| Next: exec vague standardize | ❌ FAIL | 52.0 | Missing [DEBRIEF_V1_JSON] block |
| Next: exec tool-driven cost model | ❌ FAIL | 50.1 | persona mismatch: got PRODUCT_DESIGNER expected ENTERPRISE_EXEC |
| Next: ecosystem vague incident | ❌ FAIL | 52.9 | persona mismatch: got JPM_STARTUP_BANKER expected ECOSYSTEM_PARTNER |
| Next: ecosystem tool-driven second-order brief | ❌ FAIL | 49.3 | hqLocation does not match ground truth |
| Next: quant vague what to track | ✅ PASS | 70.8 | - |
| Next: quant tool-driven signal set JSON | ❌ FAIL | 52.8 | hqLocation does not match ground truth |
| Next: product vague UI usable | ❌ FAIL | 57.0 | persona mismatch: got JPM_STARTUP_BANKER expected PRODUCT_DESIGNER |
| Next: product tool-driven expandable card schema | ❌ FAIL | 46.1 | hqLocation does not match ground truth |
| Next: sales vague shareable | ❌ FAIL | 47.9 | Missing [DEBRIEF_V1_JSON] block |
| Next: sales tool-driven one-screen + objections | ❌ FAIL | 49.0 | Missing [DEBRIEF_V1_JSON] block |
| Stress: ambiguous persona (wedge + outreach) | ❌ FAIL | 49.6 | Missing [DEBRIEF_V1_JSON] block |
| Stress: contradiction handling (Seed vs Series A) | ❌ FAIL | 52.3 | hqLocation does not match ground truth |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 48.7 | Missing [DEBRIEF_V1_JSON] block |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ❌ FAIL | 48.8 | Missing [DEBRIEF_V1_JSON] block |

### gpt-5-mini

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 51.0 | - |
| Next: banker tool-driven outbound pack | ❌ FAIL | 65.8 | persona mismatch: got SALES_ENGINEER expected JPM_STARTUP_BANKER |
| Next: VC vague wedge | ✅ PASS | 56.6 | - |
| Next: VC tool-driven comps + diligence | ✅ PASS | 80.6 | - |
| Next: CTO vague exposure | ✅ PASS | 44.2 | - |
| Next: CTO tool-driven CVE plan | ❌ FAIL | 79.4 | entity mismatch: got resolvedId='N/A' canonical='CVE-2025-62495' expected 'MQUIC |
| Next: founder vague positioning | ❌ FAIL | 102.2 | missing ground truth citation anchor in grounding[] |
| Next: founder tool-driven memo | ✅ PASS | 74.9 | - |
| Next: academic vague anchor | ✅ PASS | 48.3 | - |
| Next: academic tool-driven literature debrief | ❌ FAIL | 120.4 | missing required tools: expected lookupGroundTruthEntity got [searchAvailableSki |
| Next: exec vague standardize | ❌ FAIL | 44.9 | persona mismatch: got CTO_TECH_LEAD expected ENTERPRISE_EXEC |
| Next: exec tool-driven cost model | ✅ PASS | 63.0 | - |
| Next: ecosystem vague incident | ✅ PASS | 50.9 | - |
| Next: ecosystem tool-driven second-order brief | ✅ PASS | 81.1 | - |
| Next: quant vague what to track | ✅ PASS | 56.5 | - |
| Next: quant tool-driven signal set JSON | ❌ FAIL | 60.8 | persona mismatch: got EARLY_STAGE_VC expected QUANT_ANALYST |
| Next: product vague UI usable | ✅ PASS | 49.0 | - |
| Next: product tool-driven expandable card schema | ✅ PASS | 67.6 | - |
| offset:18 | ❌ FAIL | 300.5 | - |
| Next: sales tool-driven one-screen + objections | ❌ FAIL | 63.6 | persona mismatch: got JPM_STARTUP_BANKER expected SALES_ENGINEER |
| Stress: ambiguous persona (wedge + outreach) | ✅ PASS | 46.5 | - |
| Stress: contradiction handling (Seed vs Series A) | ✅ PASS | 58.6 | - |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 89.9 | persona.inferred must be a known persona |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ✅ PASS | 72.5 | - |

### gemini-3-flash

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ❌ FAIL | 13.0 | hqLocation does not match ground truth |
| Next: banker tool-driven outbound pack | ❌ FAIL | 16.1 | persona mismatch: got PRODUCT_DESIGNER expected JPM_STARTUP_BANKER |
| Next: VC vague wedge | ❌ FAIL | 13.8 | funding.stage mismatch: got 'N/A' expected 'Seed' |
| Next: VC tool-driven comps + diligence | ❌ FAIL | 13.2 | hqLocation does not match ground truth |
| Next: CTO vague exposure | ❌ FAIL | 13.7 | persona mismatch: got PRODUCT_DESIGNER expected CTO_TECH_LEAD |
| Next: CTO tool-driven CVE plan | ❌ FAIL | 13.4 | missing ground truth citation anchor in grounding[] |
| Next: founder vague positioning | ❌ FAIL | 13.4 | missing ground truth citation anchor in grounding[] |
| Next: founder tool-driven memo | ✅ PASS | 23.0 | - |
| Next: academic vague anchor | ❌ FAIL | 14.4 | persona mismatch: got JPM_STARTUP_BANKER expected ACADEMIC_RD |
| Next: academic tool-driven literature debrief | ❌ FAIL | 13.2 | missing ground truth citation anchor in grounding[] |
| Next: exec vague standardize | ✅ PASS | 14.1 | - |
| Next: exec tool-driven cost model | ❌ FAIL | 13.5 | persona mismatch: got PRODUCT_DESIGNER expected ENTERPRISE_EXEC |
| Next: ecosystem vague incident | ❌ FAIL | 13.6 | persona mismatch: got JPM_STARTUP_BANKER expected ECOSYSTEM_PARTNER |
| Next: ecosystem tool-driven second-order brief | ✅ PASS | 14.7 | - |
| Next: quant vague what to track | ✅ PASS | 13.7 | - |
| Next: quant tool-driven signal set JSON | ❌ FAIL | 13.1 | hqLocation does not match ground truth |
| Next: product vague UI usable | ❌ FAIL | 14.5 | funding.stage mismatch: got 'N/A' expected 'Seed' |
| Next: product tool-driven expandable card schema | ❌ FAIL | 13.1 | hqLocation does not match ground truth |
| Next: sales vague shareable | ❌ FAIL | 13.6 | persona mismatch: got JPM_STARTUP_BANKER expected SALES_ENGINEER |
| Next: sales tool-driven one-screen + objections | ❌ FAIL | 13.4 | funding.stage mismatch: got 'N/A' expected 'Seed' |
| Stress: ambiguous persona (wedge + outreach) | ❌ FAIL | 14.9 | hqLocation does not match ground truth |
| Stress: contradiction handling (Seed vs Series A) | ❌ FAIL | 13.5 | hqLocation does not match ground truth |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 13.8 | missing ground truth citation anchor in grounding[] |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ❌ FAIL | 14.2 | hqLocation does not match ground truth |

### deepseek-r1

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ❌ FAIL | 13.8 | hqLocation does not match ground truth |
| Next: banker tool-driven outbound pack | ❌ FAIL | 15.9 | persona mismatch: got PRODUCT_DESIGNER expected JPM_STARTUP_BANKER |
| Next: VC vague wedge | ✅ PASS | 89.5 | - |
| Next: VC tool-driven comps + diligence | ❌ FAIL | 268.3 | hqLocation does not match ground truth |
| Next: CTO vague exposure | ✅ PASS | 102.5 | - |
| offset:5 | ❌ FAIL | 300.4 | - |
| Next: founder vague positioning | ✅ PASS | 149.1 | - |
| Next: founder tool-driven memo | ❌ FAIL | 212.0 | missing required tools: expected lookupGroundTruthEntity got [searchAvailableSki |
| Next: academic vague anchor | ❌ FAIL | 103.8 | persona mismatch: got JPM_STARTUP_BANKER expected ACADEMIC_RD |
| Next: academic tool-driven literature debrief | ✅ PASS | 223.7 | - |
| Next: exec vague standardize | ✅ PASS | 79.2 | - |
| Next: exec tool-driven cost model | ✅ PASS | 112.0 | - |
| Next: ecosystem vague incident | ❌ FAIL | 19.1 | persona mismatch: got JPM_STARTUP_BANKER expected ECOSYSTEM_PARTNER |
| Next: ecosystem tool-driven second-order brief | ❌ FAIL | 14.6 | hqLocation does not match ground truth |
| Next: quant vague what to track | ✅ PASS | 83.3 | - |
| Next: quant tool-driven signal set JSON | ✅ PASS | 151.8 | - |
| Next: product vague UI usable | ✅ PASS | 65.6 | - |
| Next: product tool-driven expandable card schema | ❌ FAIL | 20.6 | hqLocation does not match ground truth |
| Next: sales vague shareable | ❌ FAIL | 133.9 | persona mismatch: got JPM_STARTUP_BANKER expected SALES_ENGINEER |
| Next: sales tool-driven one-screen + objections | ✅ PASS | 100.5 | - |
| Stress: ambiguous persona (wedge + outreach) | ✅ PASS | 83.9 | - |
| Stress: contradiction handling (Seed vs Series A) | ✅ PASS | 98.9 | - |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 23.3 | missing ground truth citation anchor in grounding[] |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ❌ FAIL | 94.3 | hqLocation does not match ground truth |

### deepseek-v3.2

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 93.0 | - |
| Next: banker tool-driven outbound pack | ❌ FAIL | 124.4 | persona mismatch: got PRODUCT_DESIGNER expected JPM_STARTUP_BANKER |
| Next: VC vague wedge | ✅ PASS | 76.9 | - |
| Next: VC tool-driven comps + diligence | ✅ PASS | 162.1 | - |
| Next: CTO vague exposure | ✅ PASS | 57.4 | - |
| Next: CTO tool-driven CVE plan | ✅ PASS | 129.3 | - |
| Next: founder vague positioning | ✅ PASS | 74.6 | - |
| Next: founder tool-driven memo | ❌ FAIL | 40.6 | missing ground truth citation anchor in grounding[] |
| Next: academic vague anchor | ✅ PASS | 71.7 | - |
| Next: academic tool-driven literature debrief | ✅ PASS | 29.2 | - |
| Next: exec vague standardize | ❌ FAIL | 72.8 | persona mismatch: got CTO_TECH_LEAD expected ENTERPRISE_EXEC |
| Next: exec tool-driven cost model | ❌ FAIL | 36.5 | persona mismatch: got PRODUCT_DESIGNER expected ENTERPRISE_EXEC |
| Next: ecosystem vague incident | ❌ FAIL | 28.0 | persona mismatch: got JPM_STARTUP_BANKER expected ECOSYSTEM_PARTNER |
| Next: ecosystem tool-driven second-order brief | ✅ PASS | 233.7 | - |
| Next: quant vague what to track | ✅ PASS | 59.7 | - |
| Next: quant tool-driven signal set JSON | ✅ PASS | 123.9 | - |
| Next: product vague UI usable | ✅ PASS | 63.2 | - |
| Next: product tool-driven expandable card schema | ✅ PASS | 68.6 | - |
| Next: sales vague shareable | ✅ PASS | 71.2 | - |
| Next: sales tool-driven one-screen + objections | ✅ PASS | 82.7 | - |
| Stress: ambiguous persona (wedge + outreach) | ✅ PASS | 82.6 | - |
| Stress: contradiction handling (Seed vs Series A) | ❌ FAIL | 76.4 | funding.stage mismatch: got 'N/A' expected 'Seed' |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 95.0 | missing ground truth citation anchor in grounding[] |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ❌ FAIL | 108.2 | maxToolCalls exceeded: got 5 expected <= 3 |

### qwen3-235b

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ❌ FAIL | 73.8 | funding.stage mismatch: got 'N/A' expected 'Seed' |
| Next: banker tool-driven outbound pack | ❌ FAIL | 75.8 | persona mismatch: got PRODUCT_DESIGNER expected JPM_STARTUP_BANKER |
| Next: VC vague wedge | ✅ PASS | 82.1 | - |
| Next: VC tool-driven comps + diligence | ❌ FAIL | 192.6 | Invalid JSON: Unexpected non-whitespace character after JSON at position 1852 |
| Next: CTO vague exposure | ✅ PASS | 101.1 | - |
| Next: CTO tool-driven CVE plan | ✅ PASS | 34.8 | - |
| Next: founder vague positioning | ❌ FAIL | 100.3 | missing ground truth citation anchor in grounding[] |
| Next: founder tool-driven memo | ❌ FAIL | 97.8 | missing ground truth citation anchor in grounding[] |
| Next: academic vague anchor | ❌ FAIL | 134.9 | missing ground truth citation anchor in grounding[] |
| Next: academic tool-driven literature debrief | ✅ PASS | 46.1 | - |
| Next: exec vague standardize | ✅ PASS | 49.1 | - |
| Next: exec tool-driven cost model | ✅ PASS | 71.7 | - |
| Next: ecosystem vague incident | ❌ FAIL | 79.5 | persona mismatch: got CTO_TECH_LEAD expected ECOSYSTEM_PARTNER |
| Next: ecosystem tool-driven second-order brief | ✅ PASS | 72.3 | - |
| Next: quant vague what to track | ✅ PASS | 105.2 | - |
| Next: quant tool-driven signal set JSON | ✅ PASS | 203.4 | - |
| Next: product vague UI usable | ❌ FAIL | 83.0 | persona mismatch: got JPM_STARTUP_BANKER expected PRODUCT_DESIGNER |
| Next: product tool-driven expandable card schema | ✅ PASS | 75.5 | - |
| Next: sales vague shareable | ❌ FAIL | 57.5 | persona mismatch: got JPM_STARTUP_BANKER expected SALES_ENGINEER |
| Next: sales tool-driven one-screen + objections | ✅ PASS | 73.0 | - |
| Stress: ambiguous persona (wedge + outreach) | ✅ PASS | 119.3 | - |
| Stress: contradiction handling (Seed vs Series A) | ✅ PASS | 56.7 | - |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 134.0 | persona mismatch: got QUANT_ANALYST expected ENTERPRISE_EXEC |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ❌ FAIL | 81.5 | funding.stage mismatch: got 'N/A' expected 'Seed' |

### minimax-m2.1

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 35.2 | - |
| Next: banker tool-driven outbound pack | ✅ PASS | 107.0 | - |
| Next: VC vague wedge | ✅ PASS | 30.3 | - |
| Next: VC tool-driven comps + diligence | ✅ PASS | 148.1 | - |
| Next: CTO vague exposure | ✅ PASS | 32.5 | - |
| Next: CTO tool-driven CVE plan | ✅ PASS | 141.6 | - |
| Next: founder vague positioning | ✅ PASS | 40.4 | - |
| Next: founder tool-driven memo | ❌ FAIL | 91.0 | missing required tools: expected lookupGroundTruthEntity got [searchAvailableSki |
| Next: academic vague anchor | ❌ FAIL | 59.9 | missing ground truth citation anchor in grounding[] |
| Next: academic tool-driven literature debrief | ✅ PASS | 126.4 | - |
| Next: exec vague standardize | ❌ FAIL | 54.9 | persona mismatch: got CTO_TECH_LEAD expected ENTERPRISE_EXEC |
| Next: exec tool-driven cost model | ❌ FAIL | 80.7 | missing required tools: expected lookupGroundTruthEntity got [searchAvailableSki |
| Next: ecosystem vague incident | ✅ PASS | 44.6 | - |
| Next: ecosystem tool-driven second-order brief | ✅ PASS | 88.3 | - |
| Next: quant vague what to track | ✅ PASS | 28.5 | - |
| Next: quant tool-driven signal set JSON | ✅ PASS | 45.1 | - |
| Next: product vague UI usable | ❌ FAIL | 26.5 | persona mismatch: got JPM_STARTUP_BANKER expected PRODUCT_DESIGNER |
| Next: product tool-driven expandable card schema | ✅ PASS | 51.7 | - |
| Next: sales vague shareable | ✅ PASS | 49.3 | - |
| Next: sales tool-driven one-screen + objections | ✅ PASS | 28.6 | - |
| Stress: ambiguous persona (wedge + outreach) | ✅ PASS | 55.4 | - |
| Stress: contradiction handling (Seed vs Series A) | ✅ PASS | 28.0 | - |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 90.6 | persona mismatch: got QUANT_ANALYST expected ENTERPRISE_EXEC |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ❌ FAIL | 47.5 | missing verification loop (no planSteps entry includes verify/validate/confirm/c |

### mimo-v2-flash-free

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 63.1 | - |
| Next: banker tool-driven outbound pack | ✅ PASS | 93.5 | - |
| Next: VC vague wedge | ✅ PASS | 37.0 | - |
| Next: VC tool-driven comps + diligence | ✅ PASS | 122.5 | - |
| Next: CTO vague exposure | ✅ PASS | 47.3 | - |
| Next: CTO tool-driven CVE plan | ❌ FAIL | 65.1 | entity mismatch: got resolvedId='N/A' canonical='CVE-2025-62495 Security Vulnera |
| Next: founder vague positioning | ❌ FAIL | 34.4 | persona.inferred must be a known persona |
| Next: founder tool-driven memo | ❌ FAIL | 92.5 | missing required tools: expected lookupGroundTruthEntity got [searchAvailableSki |
| Next: academic vague anchor | ❌ FAIL | 32.2 | missing required tools: expected lookupGroundTruthEntity got [searchAvailableSki |
| Next: academic tool-driven literature debrief | ✅ PASS | 101.3 | - |
| Next: exec vague standardize | ❌ FAIL | 47.1 | persona mismatch: got CTO_TECH_LEAD expected ENTERPRISE_EXEC |
| Next: exec tool-driven cost model | ✅ PASS | 55.3 | - |
| Next: ecosystem vague incident | ❌ FAIL | 35.5 | persona mismatch: got CTO_TECH_LEAD expected ECOSYSTEM_PARTNER |
| Next: ecosystem tool-driven second-order brief | ✅ PASS | 84.9 | - |
| Next: quant vague what to track | ✅ PASS | 25.0 | - |
| Next: quant tool-driven signal set JSON | ✅ PASS | 23.3 | - |
| Next: product vague UI usable | ❌ FAIL | 23.6 | funding.stage mismatch: got 'N/A' expected 'Seed' |
| Next: product tool-driven expandable card schema | ✅ PASS | 31.0 | - |
| Next: sales vague shareable | ✅ PASS | 19.6 | - |
| Next: sales tool-driven one-screen + objections | ✅ PASS | 20.0 | - |
| Stress: ambiguous persona (wedge + outreach) | ✅ PASS | 19.4 | - |
| Stress: contradiction handling (Seed vs Series A) | ✅ PASS | 21.3 | - |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 82.7 | persona mismatch: got EARLY_STAGE_VC expected ENTERPRISE_EXEC |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ❌ FAIL | 52.5 | maxToolCalls exceeded: got 4 expected <= 3 |

## Disclosure Metrics (P0 Instrumentation)

### Disclosure Level by Model

| Model | Full | Partial | None |
|-------|------|---------|------|
| claude-haiku-4.5 | 0 | 15 | 9 |
| gpt-5-mini | 0 | 22 | 1 |
| gemini-3-flash | 0 | 24 | 0 |
| deepseek-r1 | 0 | 16 | 7 |
| deepseek-v3.2 | 0 | 24 | 0 |
| qwen3-235b | 0 | 21 | 3 |
| minimax-m2.1 | 0 | 21 | 3 |
| mimo-v2-flash-free | 0 | 24 | 0 |

### Disclosure Warnings (Non-Scored)

> **Note:** These warnings are informational and do not affect pass/fail.
> They track progressive disclosure usage for Week 1-2 observability.

⚠️ [claude-haiku-4.5/next_banker_vague_disco_cover_this_week] No skill search before tool invoke
⚠️ [claude-haiku-4.5/next_banker_vague_disco_cover_this_week] No progressive disclosure meta-tools used
⚠️ [claude-haiku-4.5/next_vc_vague_disco_wedge] No skill search before tool invoke
⚠️ [claude-haiku-4.5/next_vc_vague_disco_wedge] No skill search for EARLY_STAGE_VC scenario
⚠️ [claude-haiku-4.5/next_vc_vague_disco_wedge] No progressive disclosure meta-tools used
⚠️ [deepseek-r1/next_quant_vague_disco_track] No skill search before tool invoke
⚠️ [deepseek-r1/next_quant_vague_disco_track] No skill search for QUANT_ANALYST scenario
⚠️ [deepseek-r1/next_quant_vague_disco_track] No progressive disclosure meta-tools used
⚠️ [deepseek-r1/next_sales_vague_shareable] Excessive direct tool calls: 35 (>10)
⚠️ [qwen3-235b/next_cto_tool_cve_plan] No skill search before tool invoke
⚠️ [qwen3-235b/next_cto_tool_cve_plan] No skill search for CTO_TECH_LEAD scenario
⚠️ [qwen3-235b/next_cto_tool_cve_plan] No progressive disclosure meta-tools used
⚠️ [qwen3-235b/next_product_vague_make_usable_ui] No skill search before tool invoke
⚠️ [qwen3-235b/next_product_vague_make_usable_ui] No skill search for PRODUCT_DESIGNER scenario
⚠️ [qwen3-235b/next_product_vague_make_usable_ui] No progressive disclosure meta-tools used
⚠️ [qwen3-235b/next_sales_vague_shareable] No skill search before tool invoke
⚠️ [qwen3-235b/next_sales_vague_shareable] No skill search for SALES_ENGINEER scenario
⚠️ [qwen3-235b/next_sales_vague_shareable] No progressive disclosure meta-tools used
⚠️ [minimax-m2.1/next_academic_tool_lit_debrief] No skill search before tool invoke
⚠️ [minimax-m2.1/next_quant_vague_disco_track] No skill search before tool invoke
⚠️ [minimax-m2.1/next_quant_vague_disco_track] No skill search for QUANT_ANALYST scenario
⚠️ [minimax-m2.1/next_quant_vague_disco_track] No progressive disclosure meta-tools used
⚠️ [minimax-m2.1/pack_exec_cross_provider_pricing] No skill search before tool invoke
⚠️ [minimax-m2.1/pack_exec_cross_provider_pricing] No skill search for ENTERPRISE_EXEC scenario
⚠️ [minimax-m2.1/pack_exec_cross_provider_pricing] No progressive disclosure meta-tools used
⚠️ [minimax-m2.1/pack_meta_budgeted_deep_dive] No skill search before tool invoke
⚠️ [minimax-m2.1/pack_meta_budgeted_deep_dive] No skill search for EARLY_STAGE_VC scenario
⚠️ [minimax-m2.1/pack_meta_budgeted_deep_dive] No progressive disclosure meta-tools used
