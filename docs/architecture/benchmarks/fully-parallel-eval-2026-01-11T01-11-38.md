# Fully Parallel Evaluation Results

Generated: 2026-01-11T01:11:38.649Z
Total Time: 300.5s
Suite: pack
Models: 8
Scenarios: 24 of 24 (limit=0)
Total evaluations: 192

## Summary by Model

| Model | Total | Passed | Failed | Avg Time (s) |
|-------|-------|--------|--------|--------------|
| claude-haiku-4.5 | 24 | 0 | 24 | 47.7 |
| gpt-5-mini | 24 | 0 | 23 | 100.3 |
| gemini-3-flash | 24 | 0 | 24 | 14.0 |
| deepseek-r1 | 24 | 4 | 18 | 130.9 |
| deepseek-v3.2 | 24 | 1 | 23 | 83.4 |
| qwen3-235b | 24 | 0 | 24 | 105.5 |
| minimax-m2.1 | 24 | 0 | 24 | 69.0 |
| mimo-v2-flash-free | 24 | 3 | 21 | 43.3 |

## Summary by Scenario

| Scenario | Total | Passed | Failed |
|----------|-------|--------|--------|
| Next: academic tool-driven literature debrief | 8 | 1 | 7 |
| Next: academic vague anchor | 8 | 1 | 7 |
| Next: banker tool-driven outbound pack | 8 | 1 | 7 |
| Next: banker vague (fast debrief) | 8 | 0 | 8 |
| Next: CTO tool-driven CVE plan | 8 | 0 | 8 |
| Next: CTO vague exposure | 8 | 0 | 8 |
| Next: ecosystem tool-driven second-order brief | 8 | 1 | 7 |
| Next: ecosystem vague incident | 8 | 1 | 7 |
| Next: exec tool-driven cost model | 7 | 0 | 7 |
| Next: exec vague standardize | 8 | 0 | 8 |
| Next: founder tool-driven memo | 8 | 0 | 8 |
| Next: founder vague positioning | 7 | 2 | 5 |
| Next: product tool-driven expandable card schema | 8 | 0 | 8 |
| Next: product vague UI usable | 8 | 1 | 7 |
| Next: quant tool-driven signal set JSON | 8 | 0 | 8 |
| Next: quant vague what to track | 8 | 0 | 8 |
| Next: sales tool-driven one-screen + objections | 8 | 0 | 8 |
| Next: sales vague shareable | 8 | 0 | 8 |
| Next: VC tool-driven comps + diligence | 8 | 0 | 8 |
| Next: VC vague wedge | 8 | 0 | 8 |
| offset:11 | 1 | 0 | 1 |
| offset:22 | 1 | 0 | 1 |
| offset:6 | 1 | 0 | 1 |
| Pack: exec cross-provider pricing comparison | 7 | 0 | 7 |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | 8 | 0 | 8 |
| Stress: ambiguous persona (wedge + outreach) | 8 | 0 | 8 |
| Stress: contradiction handling (Seed vs Series A) | 8 | 0 | 8 |

## Detailed Results

### claude-haiku-4.5

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ❌ FAIL | 39.5 | hqLocation does not match ground truth |
| Next: banker tool-driven outbound pack | ❌ FAIL | 44.1 | persona mismatch: got PRODUCT_DESIGNER expected JPM_STARTUP_BANKER |
| Next: VC vague wedge | ❌ FAIL | 40.5 | Missing [DEBRIEF_V1_JSON] block |
| Next: VC tool-driven comps + diligence | ❌ FAIL | 44.6 | hqLocation does not match ground truth |
| Next: CTO vague exposure | ❌ FAIL | 44.2 | Missing [DEBRIEF_V1_JSON] block |
| Next: CTO tool-driven CVE plan | ❌ FAIL | 131.6 | missing ground truth citation anchor in grounding[] |
| Next: founder vague positioning | ❌ FAIL | 38.4 | Missing [DEBRIEF_V1_JSON] block |
| Next: founder tool-driven memo | ❌ FAIL | 44.7 | missing ground truth citation anchor in grounding[] |
| Next: academic vague anchor | ❌ FAIL | 38.6 | Missing [DEBRIEF_V1_JSON] block |
| Next: academic tool-driven literature debrief | ❌ FAIL | 44.9 | missing ground truth citation anchor in grounding[] |
| Next: exec vague standardize | ❌ FAIL | 38.6 | Missing [DEBRIEF_V1_JSON] block |
| Next: exec tool-driven cost model | ❌ FAIL | 39.3 | Missing [DEBRIEF_V1_JSON] block |
| Next: ecosystem vague incident | ❌ FAIL | 50.1 | persona mismatch: got JPM_STARTUP_BANKER expected ECOSYSTEM_PARTNER |
| Next: ecosystem tool-driven second-order brief | ❌ FAIL | 44.0 | hqLocation does not match ground truth |
| Next: quant vague what to track | ❌ FAIL | 38.3 | Missing [DEBRIEF_V1_JSON] block |
| Next: quant tool-driven signal set JSON | ❌ FAIL | 44.1 | Missing [DEBRIEF_V1_JSON] block |
| Next: product vague UI usable | ❌ FAIL | 84.7 | contact.email missing or mismatched |
| Next: product tool-driven expandable card schema | ❌ FAIL | 38.5 | Missing [DEBRIEF_V1_JSON] block |
| Next: sales vague shareable | ❌ FAIL | 44.3 | persona mismatch: got JPM_STARTUP_BANKER expected SALES_ENGINEER |
| Next: sales tool-driven one-screen + objections | ❌ FAIL | 44.8 | hqLocation does not match ground truth |
| Stress: ambiguous persona (wedge + outreach) | ❌ FAIL | 40.3 | Missing [DEBRIEF_V1_JSON] block |
| Stress: contradiction handling (Seed vs Series A) | ❌ FAIL | 38.5 | Missing [DEBRIEF_V1_JSON] block |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 44.1 | Missing [DEBRIEF_V1_JSON] block |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ❌ FAIL | 44.4 | hqLocation does not match ground truth |

### gpt-5-mini

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ❌ FAIL | 76.5 | contact.email missing or mismatched |
| Next: banker tool-driven outbound pack | ❌ FAIL | 91.5 | contact.email missing or mismatched |
| Next: VC vague wedge | ❌ FAIL | 79.8 | contact.email missing or mismatched |
| Next: VC tool-driven comps + diligence | ❌ FAIL | 77.1 | contact.email missing or mismatched |
| Next: CTO vague exposure | ❌ FAIL | 102.5 | missing ground truth citation anchor in grounding[] |
| Next: CTO tool-driven CVE plan | ❌ FAIL | 116.4 | missing ground truth citation anchor in grounding[] |
| Next: founder vague positioning | ❌ FAIL | 67.6 | missing ground truth citation anchor in grounding[] |
| Next: founder tool-driven memo | ❌ FAIL | 95.4 | missing ground truth citation anchor in grounding[] |
| Next: academic vague anchor | ❌ FAIL | 93.6 | missing ground truth citation anchor in grounding[] |
| Next: academic tool-driven literature debrief | ❌ FAIL | 142.7 | missing ground truth citation anchor in grounding[] |
| Next: exec vague standardize | ❌ FAIL | 71.7 | persona mismatch: got CTO_TECH_LEAD expected ENTERPRISE_EXEC |
| offset:11 | ❌ FAIL | 300.4 | - |
| Next: ecosystem vague incident | ❌ FAIL | 100.2 | persona mismatch: got CTO_TECH_LEAD expected ECOSYSTEM_PARTNER |
| Next: ecosystem tool-driven second-order brief | ❌ FAIL | 100.1 | missing ground truth citation anchor in grounding[] |
| Next: quant vague what to track | ❌ FAIL | 73.5 | contact.email missing or mismatched |
| Next: quant tool-driven signal set JSON | ❌ FAIL | 112.0 | contact.email missing or mismatched |
| Next: product vague UI usable | ❌ FAIL | 96.1 | contact.email missing or mismatched |
| Next: product tool-driven expandable card schema | ❌ FAIL | 89.9 | contact.email missing or mismatched |
| Next: sales vague shareable | ❌ FAIL | 81.3 | persona mismatch: got JPM_STARTUP_BANKER expected SALES_ENGINEER |
| Next: sales tool-driven one-screen + objections | ❌ FAIL | 69.1 | persona mismatch: got JPM_STARTUP_BANKER expected SALES_ENGINEER |
| Stress: ambiguous persona (wedge + outreach) | ❌ FAIL | 98.2 | contact.email missing or mismatched |
| Stress: contradiction handling (Seed vs Series A) | ❌ FAIL | 80.6 | funding.stage mismatch: got 'claimed series a (unverified)' expected 'Seed' |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 99.2 | missing ground truth citation anchor in grounding[] |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ❌ FAIL | 92.9 | contact.email missing or mismatched |

### gemini-3-flash

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ❌ FAIL | 14.3 | hqLocation does not match ground truth |
| Next: banker tool-driven outbound pack | ❌ FAIL | 14.3 | persona mismatch: got PRODUCT_DESIGNER expected JPM_STARTUP_BANKER |
| Next: VC vague wedge | ❌ FAIL | 14.3 | Missing [DEBRIEF_V1_JSON] block |
| Next: VC tool-driven comps + diligence | ❌ FAIL | 13.2 | hqLocation does not match ground truth |
| Next: CTO vague exposure | ❌ FAIL | 14.2 | persona mismatch: got PRODUCT_DESIGNER expected CTO_TECH_LEAD |
| Next: CTO tool-driven CVE plan | ❌ FAIL | 14.4 | Missing [DEBRIEF_V1_JSON] block |
| Next: founder vague positioning | ❌ FAIL | 14.3 | Missing [DEBRIEF_V1_JSON] block |
| Next: founder tool-driven memo | ❌ FAIL | 14.2 | missing ground truth citation anchor in grounding[] |
| Next: academic vague anchor | ❌ FAIL | 13.7 | persona mismatch: got JPM_STARTUP_BANKER expected ACADEMIC_RD |
| Next: academic tool-driven literature debrief | ❌ FAIL | 12.9 | missing ground truth citation anchor in grounding[] |
| Next: exec vague standardize | ❌ FAIL | 14.1 | missing ground truth citation anchor in grounding[] |
| Next: exec tool-driven cost model | ❌ FAIL | 13.2 | persona mismatch: got PRODUCT_DESIGNER expected ENTERPRISE_EXEC |
| Next: ecosystem vague incident | ❌ FAIL | 14.0 | persona mismatch: got JPM_STARTUP_BANKER expected ECOSYSTEM_PARTNER |
| Next: ecosystem tool-driven second-order brief | ❌ FAIL | 14.3 | Missing [DEBRIEF_V1_JSON] block |
| Next: quant vague what to track | ❌ FAIL | 13.6 | hqLocation does not match ground truth |
| Next: quant tool-driven signal set JSON | ❌ FAIL | 13.9 | hqLocation does not match ground truth |
| Next: product vague UI usable | ❌ FAIL | 14.5 | hqLocation does not match ground truth |
| Next: product tool-driven expandable card schema | ❌ FAIL | 14.9 | hqLocation does not match ground truth |
| Next: sales vague shareable | ❌ FAIL | 13.6 | persona mismatch: got JPM_STARTUP_BANKER expected SALES_ENGINEER |
| Next: sales tool-driven one-screen + objections | ❌ FAIL | 13.1 | hqLocation does not match ground truth |
| Stress: ambiguous persona (wedge + outreach) | ❌ FAIL | 14.4 | hqLocation does not match ground truth |
| Stress: contradiction handling (Seed vs Series A) | ❌ FAIL | 15.0 | hqLocation does not match ground truth |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 13.3 | missing ground truth citation anchor in grounding[] |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ❌ FAIL | 14.8 | hqLocation does not match ground truth |

### deepseek-r1

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ❌ FAIL | 27.1 | hqLocation does not match ground truth |
| Next: banker tool-driven outbound pack | ✅ PASS | 202.0 | - |
| Next: VC vague wedge | ❌ FAIL | 112.1 | contact.email missing or mismatched |
| Next: VC tool-driven comps + diligence | ❌ FAIL | 188.6 | contact.email missing or mismatched |
| Next: CTO vague exposure | ❌ FAIL | 44.0 | persona mismatch: got PRODUCT_DESIGNER expected CTO_TECH_LEAD |
| Next: CTO tool-driven CVE plan | ❌ FAIL | 226.8 | missing ground truth citation anchor in grounding[] |
| offset:6 | ❌ FAIL | 300.5 | - |
| Next: founder tool-driven memo | ❌ FAIL | 15.2 | missing ground truth citation anchor in grounding[] |
| Next: academic vague anchor | ✅ PASS | 206.5 | - |
| Next: academic tool-driven literature debrief | ❌ FAIL | 45.2 | missing ground truth citation anchor in grounding[] |
| Next: exec vague standardize | ❌ FAIL | 13.6 | missing ground truth citation anchor in grounding[] |
| Next: exec tool-driven cost model | ❌ FAIL | 110.2 | persona mismatch: got PRODUCT_DESIGNER expected ENTERPRISE_EXEC |
| Next: ecosystem vague incident | ✅ PASS | 131.7 | - |
| Next: ecosystem tool-driven second-order brief | ❌ FAIL | 86.6 | hqLocation does not match ground truth |
| Next: quant vague what to track | ❌ FAIL | 113.3 | contact.email missing or mismatched |
| Next: quant tool-driven signal set JSON | ❌ FAIL | 13.6 | hqLocation does not match ground truth |
| Next: product vague UI usable | ✅ PASS | 163.1 | - |
| Next: product tool-driven expandable card schema | ❌ FAIL | 259.6 | contact.email missing or mismatched |
| Next: sales vague shareable | ❌ FAIL | 34.1 | persona mismatch: got JPM_STARTUP_BANKER expected SALES_ENGINEER |
| Next: sales tool-driven one-screen + objections | ❌ FAIL | 113.9 | persona mismatch: got JPM_STARTUP_BANKER expected SALES_ENGINEER |
| Stress: ambiguous persona (wedge + outreach) | ❌ FAIL | 53.1 | hqLocation does not match ground truth |
| Stress: contradiction handling (Seed vs Series A) | ❌ FAIL | 147.2 | contact.email missing or mismatched |
| offset:22 | ❌ FAIL | 300.4 | - |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ❌ FAIL | 233.8 | contact.email missing or mismatched |

### deepseek-v3.2

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ❌ FAIL | 29.0 | hqLocation does not match ground truth |
| Next: banker tool-driven outbound pack | ❌ FAIL | 176.5 | contact.email missing or mismatched |
| Next: VC vague wedge | ❌ FAIL | 62.8 | hqLocation does not match ground truth |
| Next: VC tool-driven comps + diligence | ❌ FAIL | 125.7 | hqLocation does not match ground truth |
| Next: CTO vague exposure | ❌ FAIL | 112.7 | persona mismatch: got PRODUCT_DESIGNER expected CTO_TECH_LEAD |
| Next: CTO tool-driven CVE plan | ❌ FAIL | 179.1 | entity mismatch: got resolvedId='N/A' canonical='CVE-2025-62495' expected 'MQUIC |
| Next: founder vague positioning | ✅ PASS | 103.2 | - |
| Next: founder tool-driven memo | ❌ FAIL | 90.0 | missing ground truth citation anchor in grounding[] |
| Next: academic vague anchor | ❌ FAIL | 67.5 | persona mismatch: got JPM_STARTUP_BANKER expected ACADEMIC_RD |
| Next: academic tool-driven literature debrief | ❌ FAIL | 82.1 | missing ground truth citation anchor in grounding[] |
| Next: exec vague standardize | ❌ FAIL | 81.0 | missing ground truth citation anchor in grounding[] |
| Next: exec tool-driven cost model | ❌ FAIL | 25.8 | persona mismatch: got PRODUCT_DESIGNER expected ENTERPRISE_EXEC |
| Next: ecosystem vague incident | ❌ FAIL | 30.3 | persona mismatch: got JPM_STARTUP_BANKER expected ECOSYSTEM_PARTNER |
| Next: ecosystem tool-driven second-order brief | ❌ FAIL | 74.7 | hqLocation does not match ground truth |
| Next: quant vague what to track | ❌ FAIL | 105.7 | contact.email missing or mismatched |
| Next: quant tool-driven signal set JSON | ❌ FAIL | 82.3 | hqLocation does not match ground truth |
| Next: product vague UI usable | ❌ FAIL | 77.5 | contact.email missing or mismatched |
| Next: product tool-driven expandable card schema | ❌ FAIL | 47.6 | hqLocation does not match ground truth |
| Next: sales vague shareable | ❌ FAIL | 127.9 | contact.email missing or mismatched |
| Next: sales tool-driven one-screen + objections | ❌ FAIL | 55.4 | hqLocation does not match ground truth |
| Stress: ambiguous persona (wedge + outreach) | ❌ FAIL | 66.4 | hqLocation does not match ground truth |
| Stress: contradiction handling (Seed vs Series A) | ❌ FAIL | 120.7 | contact.email missing or mismatched |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 62.3 | missing ground truth citation anchor in grounding[] |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ❌ FAIL | 15.2 | hqLocation does not match ground truth |

### qwen3-235b

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ❌ FAIL | 132.2 | contact.email missing or mismatched |
| Next: banker tool-driven outbound pack | ❌ FAIL | 43.1 | persona mismatch: got PRODUCT_DESIGNER expected JPM_STARTUP_BANKER |
| Next: VC vague wedge | ❌ FAIL | 183.3 | contact.email missing or mismatched |
| Next: VC tool-driven comps + diligence | ❌ FAIL | 44.0 | hqLocation does not match ground truth |
| Next: CTO vague exposure | ❌ FAIL | 134.5 | missing ground truth citation anchor in grounding[] |
| Next: CTO tool-driven CVE plan | ❌ FAIL | 170.9 | entity mismatch: got resolvedId='CVE-2025-62495' canonical='CVE-2025-62495' expe |
| Next: founder vague positioning | ❌ FAIL | 27.9 | missing ground truth citation anchor in grounding[] |
| Next: founder tool-driven memo | ❌ FAIL | 43.1 | missing ground truth citation anchor in grounding[] |
| Next: academic vague anchor | ❌ FAIL | 104.2 | missing ground truth citation anchor in grounding[] |
| Next: academic tool-driven literature debrief | ❌ FAIL | 39.6 | missing ground truth citation anchor in grounding[] |
| Next: exec vague standardize | ❌ FAIL | 94.3 | missing ground truth citation anchor in grounding[] |
| Next: exec tool-driven cost model | ❌ FAIL | 150.7 | persona mismatch: got PRODUCT_DESIGNER expected ENTERPRISE_EXEC |
| Next: ecosystem vague incident | ❌ FAIL | 90.7 | hqLocation does not match ground truth |
| Next: ecosystem tool-driven second-order brief | ❌ FAIL | 110.7 | hqLocation does not match ground truth |
| Next: quant vague what to track | ❌ FAIL | 140.1 | persona mismatch: got EARLY_STAGE_VC expected QUANT_ANALYST |
| Next: quant tool-driven signal set JSON | ❌ FAIL | 196.4 | hqLocation does not match ground truth |
| Next: product vague UI usable | ❌ FAIL | 80.6 | hqLocation does not match ground truth |
| Next: product tool-driven expandable card schema | ❌ FAIL | 152.3 | contact.email missing or mismatched |
| Next: sales vague shareable | ❌ FAIL | 95.4 | contact.email missing or mismatched |
| Next: sales tool-driven one-screen + objections | ❌ FAIL | 46.7 | hqLocation does not match ground truth |
| Stress: ambiguous persona (wedge + outreach) | ❌ FAIL | 86.8 | hqLocation does not match ground truth |
| Stress: contradiction handling (Seed vs Series A) | ❌ FAIL | 111.2 | contact.email missing or mismatched |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 155.0 | missing ground truth citation anchor in grounding[] |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ❌ FAIL | 98.7 | contact.email missing or mismatched |

### minimax-m2.1

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ❌ FAIL | 50.2 | contact.email missing or mismatched |
| Next: banker tool-driven outbound pack | ❌ FAIL | 55.2 | contact.email missing or mismatched |
| Next: VC vague wedge | ❌ FAIL | 84.9 | contact.email missing or mismatched |
| Next: VC tool-driven comps + diligence | ❌ FAIL | 117.7 | contact.email missing or mismatched |
| Next: CTO vague exposure | ❌ FAIL | 78.5 | missing ground truth citation anchor in grounding[] |
| Next: CTO tool-driven CVE plan | ❌ FAIL | 76.7 | entity mismatch: got resolvedId='N/A' canonical='CVE-2025-62495' expected 'MQUIC |
| Next: founder vague positioning | ❌ FAIL | 89.4 | missing ground truth citation anchor in grounding[] |
| Next: founder tool-driven memo | ❌ FAIL | 44.1 | missing ground truth citation anchor in grounding[] |
| Next: academic vague anchor | ❌ FAIL | 52.0 | persona mismatch: got JPM_STARTUP_BANKER expected ACADEMIC_RD |
| Next: academic tool-driven literature debrief | ❌ FAIL | 83.4 | missing ground truth citation anchor in grounding[] |
| Next: exec vague standardize | ❌ FAIL | 54.6 | persona mismatch: got CTO_TECH_LEAD expected ENTERPRISE_EXEC |
| Next: exec tool-driven cost model | ❌ FAIL | 91.6 | missing ground truth citation anchor in grounding[] |
| Next: ecosystem vague incident | ❌ FAIL | 23.0 | persona mismatch: got JPM_STARTUP_BANKER expected ECOSYSTEM_PARTNER |
| Next: ecosystem tool-driven second-order brief | ❌ FAIL | 78.7 | hqLocation does not match ground truth |
| Next: quant vague what to track | ❌ FAIL | 80.1 | persona mismatch: got JPM_STARTUP_BANKER expected QUANT_ANALYST |
| Next: quant tool-driven signal set JSON | ❌ FAIL | 71.5 | persona mismatch: got EARLY_STAGE_VC expected QUANT_ANALYST |
| Next: product vague UI usable | ❌ FAIL | 38.1 | persona mismatch: got JPM_STARTUP_BANKER expected PRODUCT_DESIGNER |
| Next: product tool-driven expandable card schema | ❌ FAIL | 90.6 | hqLocation does not match ground truth |
| Next: sales vague shareable | ❌ FAIL | 75.5 | contact.email missing or mismatched |
| Next: sales tool-driven one-screen + objections | ❌ FAIL | 41.2 | persona mismatch: got JPM_STARTUP_BANKER expected SALES_ENGINEER |
| Stress: ambiguous persona (wedge + outreach) | ❌ FAIL | 58.4 | contact.email missing or mismatched |
| Stress: contradiction handling (Seed vs Series A) | ❌ FAIL | 63.1 | contact.email missing or mismatched |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 111.9 | entity mismatch: got resolvedId='N/A' canonical='AI API Pricing Comparison' expe |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ❌ FAIL | 46.5 | hqLocation does not match ground truth |

### mimo-v2-flash-free

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ❌ FAIL | 30.6 | hqLocation does not match ground truth |
| Next: banker tool-driven outbound pack | ❌ FAIL | 40.9 | contact.email missing or mismatched |
| Next: VC vague wedge | ❌ FAIL | 67.2 | contact.email missing or mismatched |
| Next: VC tool-driven comps + diligence | ❌ FAIL | 105.5 | contact.email missing or mismatched |
| Next: CTO vague exposure | ❌ FAIL | 38.6 | missing ground truth citation anchor in grounding[] |
| Next: CTO tool-driven CVE plan | ❌ FAIL | 48.2 | entity mismatch: got resolvedId='N/A' canonical='CVE-2025-62495' expected 'MQUIC |
| Next: founder vague positioning | ✅ PASS | 28.9 | - |
| Next: founder tool-driven memo | ❌ FAIL | 46.5 | missing required tools: expected lookupGroundTruthEntity got [searchAvailableSki |
| Next: academic vague anchor | ❌ FAIL | 26.2 | missing ground truth citation anchor in grounding[] |
| Next: academic tool-driven literature debrief | ✅ PASS | 41.1 | - |
| Next: exec vague standardize | ❌ FAIL | 32.2 | persona mismatch: got CTO_TECH_LEAD expected ENTERPRISE_EXEC |
| Next: exec tool-driven cost model | ❌ FAIL | 113.9 | persona mismatch: got PRODUCT_DESIGNER expected ENTERPRISE_EXEC |
| Next: ecosystem vague incident | ❌ FAIL | 29.4 | persona.inferred must be a known persona |
| Next: ecosystem tool-driven second-order brief | ✅ PASS | 38.4 | - |
| Next: quant vague what to track | ❌ FAIL | 25.9 | hqLocation does not match ground truth |
| Next: quant tool-driven signal set JSON | ❌ FAIL | 29.0 | persona mismatch: got EARLY_STAGE_VC expected QUANT_ANALYST |
| Next: product vague UI usable | ❌ FAIL | 44.9 | persona mismatch: got JPM_STARTUP_BANKER expected PRODUCT_DESIGNER |
| Next: product tool-driven expandable card schema | ❌ FAIL | 51.3 | contact.email missing or mismatched |
| Next: sales vague shareable | ❌ FAIL | 32.4 | persona mismatch: got JPM_STARTUP_BANKER expected SALES_ENGINEER |
| Next: sales tool-driven one-screen + objections | ❌ FAIL | 24.7 | persona mismatch: got JPM_STARTUP_BANKER expected SALES_ENGINEER |
| Stress: ambiguous persona (wedge + outreach) | ❌ FAIL | 31.8 | contact.email missing or mismatched |
| Stress: contradiction handling (Seed vs Series A) | ❌ FAIL | 36.7 | funding.stage mismatch: got 'series a' expected 'Seed' |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 46.4 | missing ground truth citation anchor in grounding[] |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ❌ FAIL | 29.7 | hqLocation does not match ground truth |

## Disclosure Metrics (P0 Instrumentation)

### Disclosure Level by Model

| Model | Full | Partial | None |
|-------|------|---------|------|
| claude-haiku-4.5 | 1 | 11 | 12 |
| gpt-5-mini | 0 | 23 | 0 |
| gemini-3-flash | 0 | 20 | 4 |
| deepseek-r1 | 1 | 18 | 3 |
| deepseek-v3.2 | 0 | 23 | 1 |
| qwen3-235b | 0 | 21 | 3 |
| minimax-m2.1 | 0 | 24 | 0 |
| mimo-v2-flash-free | 0 | 24 | 0 |

### Disclosure Warnings (Non-Scored)

> **Note:** These warnings are informational and do not affect pass/fail.
> They track progressive disclosure usage for Week 1-2 observability.

⚠️ [deepseek-r1/next_academic_vague_ryr2_alz] Excessive direct tool calls: 118 (>10)
⚠️ [deepseek-r1/next_quant_vague_disco_track] Excessive direct tool calls: 28 (>10)
⚠️ [qwen3-235b/next_banker_vague_disco_cover_this_week] No skill search before tool invoke
⚠️ [qwen3-235b/next_cto_vague_quickjs_exposure] No skill search before tool invoke
⚠️ [qwen3-235b/next_academic_tool_lit_debrief] No skill search before tool invoke
⚠️ [qwen3-235b/next_academic_tool_lit_debrief] No skill search for ACADEMIC_RD scenario
⚠️ [qwen3-235b/next_academic_tool_lit_debrief] No progressive disclosure meta-tools used
⚠️ [qwen3-235b/next_quant_tool_signal_json] Excessive direct tool calls: 12 (>10)
⚠️ [minimax-m2.1/pack_exec_cross_provider_pricing] Excessive direct tool calls: 11 (>10)
⚠️ [mimo-v2-flash-free/next_vc_tool_disco_comps] Excessive direct tool calls: 12 (>10)
⚠️ [mimo-v2-flash-free/next_exec_tool_cost_model] Excessive direct tool calls: 14 (>10)
