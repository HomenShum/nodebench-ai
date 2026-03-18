# Fully Parallel Evaluation Results

Generated: 2026-01-11T06:05:29.119Z
Total Time: 300.5s
Suite: pack
Models: 8
Scenarios: 24 of 24 (limit=0)
Total evaluations: 192

## Summary by Model

| Model | Total | Passed | Failed | Avg Time (s) |
|-------|-------|--------|--------|--------------|
| claude-haiku-4.5 | 24 | 6 | 18 | 48.6 |
| gpt-5-mini | 24 | 16 | 8 | 80.8 |
| gemini-3-flash | 24 | 8 | 16 | 15.8 |
| deepseek-r1 | 24 | 9 | 14 | 86.5 |
| deepseek-v3.2 | 24 | 11 | 12 | 93.8 |
| qwen3-235b | 24 | 15 | 9 | 120.0 |
| minimax-m2.1 | 24 | 7 | 17 | 39.9 |
| mimo-v2-flash-free | 24 | 3 | 21 | 25.8 |

## Summary by Scenario

| Scenario | Total | Passed | Failed |
|----------|-------|--------|--------|
| Next: academic tool-driven literature debrief | 6 | 3 | 3 |
| Next: academic vague anchor | 7 | 0 | 7 |
| Next: banker tool-driven outbound pack | 7 | 0 | 7 |
| Next: banker vague (fast debrief) | 7 | 6 | 1 |
| Next: CTO tool-driven CVE plan | 7 | 6 | 1 |
| Next: CTO vague exposure | 8 | 0 | 8 |
| Next: ecosystem tool-driven second-order brief | 7 | 0 | 7 |
| Next: ecosystem vague incident | 6 | 0 | 6 |
| Next: exec tool-driven cost model | 7 | 0 | 7 |
| Next: exec vague standardize | 7 | 6 | 1 |
| Next: founder tool-driven memo | 5 | 0 | 5 |
| Next: founder vague positioning | 7 | 3 | 4 |
| Next: product tool-driven expandable card schema | 7 | 5 | 2 |
| Next: product vague UI usable | 7 | 5 | 2 |
| Next: quant tool-driven signal set JSON | 7 | 7 | 0 |
| Next: quant vague what to track | 5 | 4 | 1 |
| Next: sales tool-driven one-screen + objections | 6 | 5 | 1 |
| Next: sales vague shareable | 7 | 0 | 7 |
| Next: VC tool-driven comps + diligence | 6 | 4 | 2 |
| Next: VC vague wedge | 8 | 6 | 2 |
| offset:0 | 1 | 0 | 1 |
| offset:1 | 1 | 0 | 1 |
| offset:10 | 1 | 0 | 1 |
| offset:11 | 1 | 0 | 1 |
| offset:12 | 2 | 0 | 2 |
| offset:13 | 1 | 0 | 1 |
| offset:14 | 3 | 0 | 3 |
| offset:15 | 1 | 0 | 1 |
| offset:16 | 1 | 0 | 1 |
| offset:17 | 1 | 0 | 1 |
| offset:18 | 1 | 0 | 1 |
| offset:19 | 2 | 0 | 2 |
| offset:20 | 1 | 0 | 1 |
| offset:21 | 2 | 0 | 2 |
| offset:22 | 2 | 0 | 2 |
| offset:23 | 1 | 0 | 1 |
| offset:3 | 2 | 0 | 2 |
| offset:5 | 1 | 0 | 1 |
| offset:6 | 1 | 0 | 1 |
| offset:7 | 3 | 0 | 3 |
| offset:8 | 1 | 0 | 1 |
| offset:9 | 2 | 0 | 2 |
| Pack: exec cross-provider pricing comparison | 6 | 2 | 4 |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | 7 | 3 | 4 |
| Stress: ambiguous persona (wedge + outreach) | 7 | 4 | 3 |
| Stress: contradiction handling (Seed vs Series A) | 6 | 6 | 0 |

## Detailed Results

### claude-haiku-4.5

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ❌ FAIL | 42.4 | hqLocation does not match ground truth |
| Next: banker tool-driven outbound pack | ❌ FAIL | 41.4 | persona mismatch: got QUANT_ANALYST expected JPM_STARTUP_BANKER |
| Next: VC vague wedge | ❌ FAIL | 53.7 | hqLocation does not match ground truth |
| Next: VC tool-driven comps + diligence | ❌ FAIL | 48.2 | hqLocation does not match ground truth |
| Next: CTO vague exposure | ❌ FAIL | 42.6 | persona mismatch: got PRODUCT_DESIGNER expected CTO_TECH_LEAD |
| Next: CTO tool-driven CVE plan | ✅ PASS | 41.9 | - |
| Next: founder vague positioning | ❌ FAIL | 42.4 | Missing [DEBRIEF_V1_JSON] block |
| Next: founder tool-driven memo | ❌ FAIL | 48.0 | persona mismatch: got QUANT_ANALYST expected FOUNDER_STRATEGY |
| Next: academic vague anchor | ❌ FAIL | 41.8 | persona mismatch: got JPM_STARTUP_BANKER expected ACADEMIC_RD |
| Next: academic tool-driven literature debrief | ❌ FAIL | 47.7 | missing ground truth citation anchor in grounding[] |
| Next: exec vague standardize | ✅ PASS | 59.7 | - |
| Next: exec tool-driven cost model | ❌ FAIL | 41.8 | Missing [DEBRIEF_V1_JSON] block |
| Next: ecosystem vague incident | ❌ FAIL | 41.4 | Missing [DEBRIEF_V1_JSON] block |
| Next: ecosystem tool-driven second-order brief | ❌ FAIL | 41.3 | Missing [DEBRIEF_V1_JSON] block |
| Next: quant vague what to track | ✅ PASS | 65.3 | - |
| Next: quant tool-driven signal set JSON | ✅ PASS | 53.2 | - |
| Next: product vague UI usable | ❌ FAIL | 52.9 | hqLocation does not match ground truth |
| Next: product tool-driven expandable card schema | ❌ FAIL | 42.4 | Missing [DEBRIEF_V1_JSON] block |
| Next: sales vague shareable | ❌ FAIL | 43.4 | Missing [DEBRIEF_V1_JSON] block |
| Next: sales tool-driven one-screen + objections | ✅ PASS | 64.7 | - |
| Stress: ambiguous persona (wedge + outreach) | ❌ FAIL | 53.7 | hqLocation does not match ground truth |
| Stress: contradiction handling (Seed vs Series A) | ✅ PASS | 60.2 | - |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 52.9 | missing ground truth citation anchor in grounding[] |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ❌ FAIL | 43.3 | Missing [DEBRIEF_V1_JSON] block |

### gpt-5-mini

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 69.8 | - |
| Next: banker tool-driven outbound pack | ❌ FAIL | 89.7 | persona mismatch: got QUANT_ANALYST expected JPM_STARTUP_BANKER |
| Next: VC vague wedge | ✅ PASS | 62.5 | - |
| Next: VC tool-driven comps + diligence | ✅ PASS | 98.3 | - |
| Next: CTO vague exposure | ❌ FAIL | 57.6 | persona mismatch: got PRODUCT_DESIGNER expected CTO_TECH_LEAD |
| Next: CTO tool-driven CVE plan | ✅ PASS | 85.6 | - |
| Next: founder vague positioning | ✅ PASS | 118.9 | - |
| Next: founder tool-driven memo | ❌ FAIL | 73.9 | persona mismatch: got QUANT_ANALYST expected FOUNDER_STRATEGY |
| Next: academic vague anchor | ❌ FAIL | 117.8 | persona mismatch: got JPM_STARTUP_BANKER expected ACADEMIC_RD |
| Next: academic tool-driven literature debrief | ✅ PASS | 187.3 | - |
| Next: exec vague standardize | ✅ PASS | 81.3 | - |
| Next: exec tool-driven cost model | ❌ FAIL | 68.9 | persona mismatch: got PRODUCT_DESIGNER expected ENTERPRISE_EXEC |
| Next: ecosystem vague incident | ❌ FAIL | 52.6 | persona mismatch: got JPM_STARTUP_BANKER expected ECOSYSTEM_PARTNER |
| Next: ecosystem tool-driven second-order brief | ❌ FAIL | 79.6 | persona mismatch: got QUANT_ANALYST expected ECOSYSTEM_PARTNER |
| Next: quant vague what to track | ✅ PASS | 59.6 | - |
| Next: quant tool-driven signal set JSON | ✅ PASS | 74.5 | - |
| Next: product vague UI usable | ✅ PASS | 79.5 | - |
| Next: product tool-driven expandable card schema | ✅ PASS | 96.8 | - |
| Next: sales vague shareable | ❌ FAIL | 56.9 | persona mismatch: got JPM_STARTUP_BANKER expected SALES_ENGINEER |
| Next: sales tool-driven one-screen + objections | ✅ PASS | 38.9 | - |
| Stress: ambiguous persona (wedge + outreach) | ✅ PASS | 58.1 | - |
| Stress: contradiction handling (Seed vs Series A) | ✅ PASS | 76.2 | - |
| Pack: exec cross-provider pricing comparison | ✅ PASS | 84.2 | - |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ✅ PASS | 71.4 | - |

### gemini-3-flash

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 15.9 | - |
| Next: banker tool-driven outbound pack | ❌ FAIL | 17.1 | persona mismatch: got QUANT_ANALYST expected JPM_STARTUP_BANKER |
| Next: VC vague wedge | ✅ PASS | 15.0 | - |
| Next: VC tool-driven comps + diligence | ❌ FAIL | 14.6 | hqLocation does not match ground truth |
| Next: CTO vague exposure | ❌ FAIL | 14.8 | Missing [DEBRIEF_V1_JSON] block |
| Next: CTO tool-driven CVE plan | ❌ FAIL | 16.7 | missing ground truth citation anchor in grounding[] |
| Next: founder vague positioning | ❌ FAIL | 14.8 | Missing [DEBRIEF_V1_JSON] block |
| Next: founder tool-driven memo | ❌ FAIL | 27.8 | persona mismatch: got QUANT_ANALYST expected FOUNDER_STRATEGY |
| Next: academic vague anchor | ❌ FAIL | 14.7 | persona mismatch: got JPM_STARTUP_BANKER expected ACADEMIC_RD |
| Next: academic tool-driven literature debrief | ❌ FAIL | 14.3 | missing ground truth citation anchor in grounding[] |
| Next: exec vague standardize | ❌ FAIL | 14.8 | Missing [DEBRIEF_V1_JSON] block |
| Next: exec tool-driven cost model | ❌ FAIL | 14.8 | Missing [DEBRIEF_V1_JSON] block |
| Next: ecosystem vague incident | ❌ FAIL | 15.3 | persona mismatch: got JPM_STARTUP_BANKER expected ECOSYSTEM_PARTNER |
| Next: ecosystem tool-driven second-order brief | ❌ FAIL | 15.0 | persona mismatch: got QUANT_ANALYST expected ECOSYSTEM_PARTNER |
| Next: quant vague what to track | ✅ PASS | 14.8 | - |
| Next: quant tool-driven signal set JSON | ✅ PASS | 15.4 | - |
| Next: product vague UI usable | ✅ PASS | 14.4 | - |
| Next: product tool-driven expandable card schema | ✅ PASS | 14.6 | - |
| Next: sales vague shareable | ❌ FAIL | 16.4 | persona mismatch: got JPM_STARTUP_BANKER expected SALES_ENGINEER |
| Next: sales tool-driven one-screen + objections | ❌ FAIL | 14.8 | hqLocation does not match ground truth |
| Stress: ambiguous persona (wedge + outreach) | ✅ PASS | 16.6 | - |
| Stress: contradiction handling (Seed vs Series A) | ✅ PASS | 16.3 | - |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 14.8 | Missing [DEBRIEF_V1_JSON] block |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ❌ FAIL | 15.1 | hqLocation does not match ground truth |

### deepseek-r1

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 51.6 | - |
| Next: banker tool-driven outbound pack | ❌ FAIL | 26.8 | persona mismatch: got QUANT_ANALYST expected JPM_STARTUP_BANKER |
| Next: VC vague wedge | ❌ FAIL | 41.0 | hqLocation does not match ground truth |
| offset:3 | ❌ FAIL | 300.5 | - |
| Next: CTO vague exposure | ❌ FAIL | 77.5 | persona mismatch: got PRODUCT_DESIGNER expected CTO_TECH_LEAD |
| Next: CTO tool-driven CVE plan | ✅ PASS | 171.0 | - |
| Next: founder vague positioning | ❌ FAIL | 34.4 | missing ground truth citation anchor in grounding[] |
| Next: founder tool-driven memo | ❌ FAIL | 18.7 | persona mismatch: got QUANT_ANALYST expected FOUNDER_STRATEGY |
| Next: academic vague anchor | ❌ FAIL | 82.9 | persona mismatch: got JPM_STARTUP_BANKER expected ACADEMIC_RD |
| Next: academic tool-driven literature debrief | ✅ PASS | 90.9 | - |
| Next: exec vague standardize | ✅ PASS | 74.2 | - |
| Next: exec tool-driven cost model | ❌ FAIL | 90.8 | persona mismatch: got PRODUCT_DESIGNER expected ENTERPRISE_EXEC |
| Next: ecosystem vague incident | ❌ FAIL | 141.8 | persona mismatch: got JPM_STARTUP_BANKER expected ECOSYSTEM_PARTNER |
| Next: ecosystem tool-driven second-order brief | ❌ FAIL | 15.6 | persona mismatch: got QUANT_ANALYST expected ECOSYSTEM_PARTNER |
| Next: quant vague what to track | ❌ FAIL | 22.1 | hqLocation does not match ground truth |
| Next: quant tool-driven signal set JSON | ✅ PASS | 135.8 | - |
| Next: product vague UI usable | ❌ FAIL | 11.6 | hqLocation does not match ground truth |
| Next: product tool-driven expandable card schema | ✅ PASS | 159.4 | - |
| Next: sales vague shareable | ❌ FAIL | 95.5 | persona mismatch: got JPM_STARTUP_BANKER expected SALES_ENGINEER |
| Next: sales tool-driven one-screen + objections | ✅ PASS | 45.9 | - |
| Stress: ambiguous persona (wedge + outreach) | ❌ FAIL | 56.1 | hqLocation does not match ground truth |
| Stress: contradiction handling (Seed vs Series A) | ✅ PASS | 59.0 | - |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 177.4 | missing ground truth citation anchor in grounding[] |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ✅ PASS | 94.6 | - |

### deepseek-v3.2

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 93.3 | - |
| Next: banker tool-driven outbound pack | ❌ FAIL | 69.9 | persona mismatch: got QUANT_ANALYST expected JPM_STARTUP_BANKER |
| Next: VC vague wedge | ✅ PASS | 112.4 | - |
| Next: VC tool-driven comps + diligence | ✅ PASS | 133.0 | - |
| Next: CTO vague exposure | ❌ FAIL | 62.4 | persona mismatch: got PRODUCT_DESIGNER expected CTO_TECH_LEAD |
| Next: CTO tool-driven CVE plan | ✅ PASS | 128.4 | - |
| Next: founder vague positioning | ✅ PASS | 104.4 | - |
| offset:7 | ❌ FAIL | 300.5 | - |
| Next: academic vague anchor | ❌ FAIL | 36.0 | persona mismatch: got JPM_STARTUP_BANKER expected ACADEMIC_RD |
| Next: academic tool-driven literature debrief | ✅ PASS | 135.5 | - |
| Next: exec vague standardize | ✅ PASS | 61.8 | - |
| Next: exec tool-driven cost model | ❌ FAIL | 60.0 | persona mismatch: got PRODUCT_DESIGNER expected ENTERPRISE_EXEC |
| Next: ecosystem vague incident | ❌ FAIL | 181.8 | persona mismatch: got JPM_STARTUP_BANKER expected ECOSYSTEM_PARTNER |
| Next: ecosystem tool-driven second-order brief | ❌ FAIL | 99.6 | persona mismatch: got QUANT_ANALYST expected ECOSYSTEM_PARTNER |
| offset:14 | ❌ ERROR | 10.7 | fetch failed |
| Next: quant tool-driven signal set JSON | ✅ PASS | 99.0 | - |
| Next: product vague UI usable | ✅ PASS | 97.5 | - |
| Next: product tool-driven expandable card schema | ❌ FAIL | 21.3 | hqLocation does not match ground truth |
| Next: sales vague shareable | ❌ FAIL | 113.3 | persona mismatch: got JPM_STARTUP_BANKER expected SALES_ENGINEER |
| Next: sales tool-driven one-screen + objections | ✅ PASS | 102.6 | - |
| Stress: ambiguous persona (wedge + outreach) | ❌ FAIL | 22.9 | hqLocation does not match ground truth |
| Stress: contradiction handling (Seed vs Series A) | ✅ PASS | 110.8 | - |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 43.7 | missing ground truth citation anchor in grounding[] |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ❌ FAIL | 50.6 | hqLocation does not match ground truth |

### qwen3-235b

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 118.2 | - |
| offset:1 | ❌ ERROR | 10.7 | fetch failed |
| Next: VC vague wedge | ✅ PASS | 161.2 | - |
| Next: VC tool-driven comps + diligence | ✅ PASS | 244.0 | - |
| Next: CTO vague exposure | ❌ FAIL | 105.1 | persona mismatch: got PRODUCT_DESIGNER expected CTO_TECH_LEAD |
| Next: CTO tool-driven CVE plan | ✅ PASS | 127.0 | - |
| Next: founder vague positioning | ✅ PASS | 110.9 | - |
| Next: founder tool-driven memo | ❌ FAIL | 102.0 | persona mismatch: got QUANT_ANALYST expected FOUNDER_STRATEGY |
| Next: academic vague anchor | ❌ FAIL | 111.7 | persona mismatch: got JPM_STARTUP_BANKER expected ACADEMIC_RD |
| Next: academic tool-driven literature debrief | ❌ FAIL | 118.9 | missing ground truth citation anchor in grounding[] |
| Next: exec vague standardize | ✅ PASS | 116.4 | - |
| Next: exec tool-driven cost model | ❌ FAIL | 101.9 | persona mismatch: got PRODUCT_DESIGNER expected ENTERPRISE_EXEC |
| Next: ecosystem vague incident | ❌ FAIL | 112.5 | persona mismatch: got JPM_STARTUP_BANKER expected ECOSYSTEM_PARTNER |
| Next: ecosystem tool-driven second-order brief | ❌ FAIL | 109.4 | persona mismatch: got QUANT_ANALYST expected ECOSYSTEM_PARTNER |
| Next: quant vague what to track | ✅ PASS | 110.1 | - |
| Next: quant tool-driven signal set JSON | ✅ PASS | 110.7 | - |
| Next: product vague UI usable | ✅ PASS | 119.3 | - |
| Next: product tool-driven expandable card schema | ✅ PASS | 113.6 | - |
| Next: sales vague shareable | ❌ FAIL | 128.6 | persona mismatch: got JPM_STARTUP_BANKER expected SALES_ENGINEER |
| Next: sales tool-driven one-screen + objections | ✅ PASS | 115.3 | - |
| Stress: ambiguous persona (wedge + outreach) | ✅ PASS | 169.9 | - |
| Stress: contradiction handling (Seed vs Series A) | ✅ PASS | 130.2 | - |
| Pack: exec cross-provider pricing comparison | ✅ PASS | 123.2 | - |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ✅ PASS | 110.3 | - |

### minimax-m2.1

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| offset:0 | ❌ ERROR | 10.7 | fetch failed |
| Next: banker tool-driven outbound pack | ❌ FAIL | 56.0 | persona mismatch: got QUANT_ANALYST expected JPM_STARTUP_BANKER |
| Next: VC vague wedge | ✅ PASS | 39.1 | - |
| Next: VC tool-driven comps + diligence | ✅ PASS | 98.1 | - |
| Next: CTO vague exposure | ❌ FAIL | 42.4 | persona mismatch: got PRODUCT_DESIGNER expected CTO_TECH_LEAD |
| offset:5 | ❌ ERROR | 10.7 | fetch failed |
| Next: founder vague positioning | ❌ FAIL | 70.4 | Invalid JSON: Unexpected non-whitespace character after JSON at position 1131 |
| offset:7 | ❌ ERROR | 10.7 | fetch failed |
| Next: academic vague anchor | ❌ FAIL | 44.7 | persona mismatch: got JPM_STARTUP_BANKER expected ACADEMIC_RD |
| offset:9 | ❌ ERROR | 10.7 | fetch failed |
| Next: exec vague standardize | ✅ PASS | 35.0 | - |
| Next: exec tool-driven cost model | ❌ FAIL | 62.0 | persona mismatch: got PRODUCT_DESIGNER expected ENTERPRISE_EXEC |
| offset:12 | ❌ ERROR | 10.7 | fetch failed |
| Next: ecosystem tool-driven second-order brief | ❌ FAIL | 66.1 | persona mismatch: got QUANT_ANALYST expected ECOSYSTEM_PARTNER |
| offset:14 | ❌ ERROR | 10.7 | fetch failed |
| Next: quant tool-driven signal set JSON | ✅ PASS | 85.7 | - |
| Next: product vague UI usable | ✅ PASS | 57.6 | - |
| Next: product tool-driven expandable card schema | ✅ PASS | 46.3 | - |
| Next: sales vague shareable | ❌ FAIL | 27.4 | persona mismatch: got JPM_STARTUP_BANKER expected SALES_ENGINEER |
| offset:19 | ❌ ERROR | 10.7 | fetch failed |
| Stress: ambiguous persona (wedge + outreach) | ✅ PASS | 51.9 | - |
| offset:21 | ❌ ERROR | 10.7 | fetch failed |
| offset:22 | ❌ ERROR | 10.7 | fetch failed |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ❌ FAIL | 77.9 | maxToolCalls exceeded: got 4 expected <= 3 |

### mimo-v2-flash-free

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 31.3 | - |
| Next: banker tool-driven outbound pack | ❌ FAIL | 47.2 | persona mismatch: got QUANT_ANALYST expected JPM_STARTUP_BANKER |
| Next: VC vague wedge | ✅ PASS | 38.3 | - |
| offset:3 | ❌ ERROR | 10.7 | fetch failed |
| Next: CTO vague exposure | ❌ FAIL | 118.5 | persona mismatch: got PRODUCT_DESIGNER expected CTO_TECH_LEAD |
| Next: CTO tool-driven CVE plan | ✅ PASS | 181.7 | - |
| offset:6 | ❌ ERROR | 10.7 | fetch failed |
| offset:7 | ❌ ERROR | 10.7 | fetch failed |
| offset:8 | ❌ ERROR | 10.7 | fetch failed |
| offset:9 | ❌ ERROR | 10.7 | fetch failed |
| offset:10 | ❌ ERROR | 10.7 | fetch failed |
| offset:11 | ❌ ERROR | 10.7 | fetch failed |
| offset:12 | ❌ ERROR | 10.7 | fetch failed |
| offset:13 | ❌ ERROR | 10.7 | fetch failed |
| offset:14 | ❌ ERROR | 10.7 | fetch failed |
| offset:15 | ❌ ERROR | 10.7 | fetch failed |
| offset:16 | ❌ ERROR | 10.7 | fetch failed |
| offset:17 | ❌ ERROR | 10.7 | fetch failed |
| offset:18 | ❌ ERROR | 10.7 | fetch failed |
| offset:19 | ❌ ERROR | 10.7 | fetch failed |
| offset:20 | ❌ ERROR | 10.7 | fetch failed |
| offset:21 | ❌ ERROR | 10.7 | fetch failed |
| offset:22 | ❌ ERROR | 10.7 | fetch failed |
| offset:23 | ❌ ERROR | 10.7 | fetch failed |

## Disclosure Metrics (P0 Instrumentation)

### Disclosure Level by Model

| Model | Full | Partial | None |
|-------|------|---------|------|
| claude-haiku-4.5 | 0 | 17 | 7 |
| gpt-5-mini | 0 | 24 | 0 |
| gemini-3-flash | 0 | 19 | 5 |
| deepseek-r1 | 1 | 22 | 0 |
| deepseek-v3.2 | 0 | 22 | 0 |
| qwen3-235b | 0 | 23 | 0 |
| minimax-m2.1 | 0 | 15 | 0 |
| mimo-v2-flash-free | 0 | 5 | 0 |

### Disclosure Warnings (Non-Scored)

> **Note:** These warnings are informational and do not affect pass/fail.
> They track progressive disclosure usage for Week 1-2 observability.

⚠️ [deepseek-r1/next_quant_tool_signal_json] Excessive direct tool calls: 79 (>10)
⚠️ [qwen3-235b/next_vc_tool_disco_comps] Excessive direct tool calls: 11 (>10)
⚠️ [mimo-v2-flash-free/next_cto_tool_cve_plan] Excessive direct tool calls: 11 (>10)
