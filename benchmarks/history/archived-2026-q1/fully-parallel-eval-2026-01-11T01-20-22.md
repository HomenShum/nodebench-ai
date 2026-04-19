# Fully Parallel Evaluation Results

Generated: 2026-01-11T01:20:22.402Z
Total Time: 300.5s
Suite: pack
Models: 8
Scenarios: 24 of 24 (limit=0)
Total evaluations: 192

## Summary by Model

| Model | Total | Passed | Failed | Avg Time (s) |
|-------|-------|--------|--------|--------------|
| claude-haiku-4.5 | 24 | 0 | 24 | 63.3 |
| gpt-5-mini | 24 | 0 | 24 | 81.0 |
| gemini-3-flash | 24 | 0 | 24 | 13.9 |
| deepseek-r1 | 24 | 4 | 19 | 96.6 |
| deepseek-v3.2 | 24 | 1 | 23 | 60.2 |
| qwen3-235b | 24 | 3 | 21 | 85.7 |
| minimax-m2.1 | 24 | 0 | 24 | 78.2 |
| mimo-v2-flash-free | 24 | 2 | 22 | 32.1 |

## Summary by Scenario

| Scenario | Total | Passed | Failed |
|----------|-------|--------|--------|
| Next: academic tool-driven literature debrief | 8 | 1 | 7 |
| Next: academic vague anchor | 8 | 1 | 7 |
| Next: banker tool-driven outbound pack | 8 | 0 | 8 |
| Next: banker vague (fast debrief) | 8 | 0 | 8 |
| Next: CTO tool-driven CVE plan | 8 | 0 | 8 |
| Next: CTO vague exposure | 8 | 0 | 8 |
| Next: ecosystem tool-driven second-order brief | 8 | 1 | 7 |
| Next: ecosystem vague incident | 8 | 1 | 7 |
| Next: exec tool-driven cost model | 8 | 2 | 6 |
| Next: exec vague standardize | 8 | 1 | 7 |
| Next: founder tool-driven memo | 8 | 0 | 8 |
| Next: founder vague positioning | 7 | 1 | 6 |
| Next: product tool-driven expandable card schema | 8 | 0 | 8 |
| Next: product vague UI usable | 8 | 0 | 8 |
| Next: quant tool-driven signal set JSON | 8 | 1 | 7 |
| Next: quant vague what to track | 8 | 0 | 8 |
| Next: sales tool-driven one-screen + objections | 8 | 0 | 8 |
| Next: sales vague shareable | 8 | 0 | 8 |
| Next: VC tool-driven comps + diligence | 8 | 0 | 8 |
| Next: VC vague wedge | 8 | 0 | 8 |
| offset:6 | 1 | 0 | 1 |
| Pack: exec cross-provider pricing comparison | 8 | 0 | 8 |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | 8 | 1 | 7 |
| Stress: ambiguous persona (wedge + outreach) | 8 | 0 | 8 |
| Stress: contradiction handling (Seed vs Series A) | 8 | 0 | 8 |

## Detailed Results

### claude-haiku-4.5

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ❌ FAIL | 59.8 | hqLocation does not match ground truth |
| Next: banker tool-driven outbound pack | ❌ FAIL | 58.5 | persona mismatch: got PRODUCT_DESIGNER expected JPM_STARTUP_BANKER |
| Next: VC vague wedge | ❌ FAIL | 58.0 | hqLocation does not match ground truth |
| Next: VC tool-driven comps + diligence | ❌ FAIL | 57.9 | Missing [DEBRIEF_V1_JSON] block |
| Next: CTO vague exposure | ❌ FAIL | 59.4 | Missing [DEBRIEF_V1_JSON] block |
| Next: CTO tool-driven CVE plan | ❌ FAIL | 131.3 | missing ground truth citation anchor in grounding[] |
| Next: founder vague positioning | ❌ FAIL | 58.2 | missing ground truth citation anchor in grounding[] |
| Next: founder tool-driven memo | ❌ FAIL | 58.3 | missing ground truth citation anchor in grounding[] |
| Next: academic vague anchor | ❌ FAIL | 58.4 | persona mismatch: got JPM_STARTUP_BANKER expected ACADEMIC_RD |
| Next: academic tool-driven literature debrief | ❌ FAIL | 58.6 | missing ground truth citation anchor in grounding[] |
| Next: exec vague standardize | ❌ FAIL | 59.0 | missing ground truth citation anchor in grounding[] |
| Next: exec tool-driven cost model | ❌ FAIL | 58.1 | persona mismatch: got PRODUCT_DESIGNER expected ENTERPRISE_EXEC |
| Next: ecosystem vague incident | ❌ FAIL | 57.9 | persona mismatch: got JPM_STARTUP_BANKER expected ECOSYSTEM_PARTNER |
| Next: ecosystem tool-driven second-order brief | ❌ FAIL | 61.4 | hqLocation does not match ground truth |
| Next: quant vague what to track | ❌ FAIL | 58.6 | hqLocation does not match ground truth |
| Next: quant tool-driven signal set JSON | ❌ FAIL | 58.3 | hqLocation does not match ground truth |
| Next: product vague UI usable | ❌ FAIL | 59.0 | hqLocation does not match ground truth |
| Next: product tool-driven expandable card schema | ❌ FAIL | 58.0 | hqLocation does not match ground truth |
| Next: sales vague shareable | ❌ FAIL | 64.0 | persona mismatch: got JPM_STARTUP_BANKER expected SALES_ENGINEER |
| Next: sales tool-driven one-screen + objections | ❌ FAIL | 58.7 | hqLocation does not match ground truth |
| Stress: ambiguous persona (wedge + outreach) | ❌ FAIL | 55.8 | Missing [DEBRIEF_V1_JSON] block |
| Stress: contradiction handling (Seed vs Series A) | ❌ FAIL | 96.6 | funding.stage mismatch: got 'series a' expected 'Seed' |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 56.8 | Missing [DEBRIEF_V1_JSON] block |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ❌ FAIL | 57.7 | Missing [DEBRIEF_V1_JSON] block |

### gpt-5-mini

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ❌ FAIL | 72.3 | contact.email missing or mismatched |
| Next: banker tool-driven outbound pack | ❌ FAIL | 79.0 | contact.email missing or mismatched |
| Next: VC vague wedge | ❌ FAIL | 72.2 | contact.email missing or mismatched |
| Next: VC tool-driven comps + diligence | ❌ FAIL | 81.5 | contact.email missing or mismatched |
| Next: CTO vague exposure | ❌ FAIL | 79.5 | missing ground truth citation anchor in grounding[] |
| Next: CTO tool-driven CVE plan | ❌ FAIL | 95.7 | missing ground truth citation anchor in grounding[] |
| Next: founder vague positioning | ❌ FAIL | 62.7 | missing ground truth citation anchor in grounding[] |
| Next: founder tool-driven memo | ❌ FAIL | 79.8 | missing ground truth citation anchor in grounding[] |
| Next: academic vague anchor | ❌ FAIL | 70.7 | entity mismatch: got resolvedId='N/A' canonical='RyR2 (ryanodine receptor 2)' ex |
| Next: academic tool-driven literature debrief | ❌ FAIL | 134.9 | missing required tools: expected lookupGroundTruthEntity got [searchAvailableSki |
| Next: exec vague standardize | ❌ FAIL | 100.1 | persona mismatch: got CTO_TECH_LEAD expected ENTERPRISE_EXEC |
| Next: exec tool-driven cost model | ❌ FAIL | 88.0 | missing ground truth citation anchor in grounding[] |
| Next: ecosystem vague incident | ❌ FAIL | 59.3 | missing ground truth citation anchor in grounding[] |
| Next: ecosystem tool-driven second-order brief | ❌ FAIL | 83.4 | missing ground truth citation anchor in grounding[] |
| Next: quant vague what to track | ❌ FAIL | 84.6 | contact.email missing or mismatched |
| Next: quant tool-driven signal set JSON | ❌ FAIL | 75.3 | persona mismatch: got EARLY_STAGE_VC expected QUANT_ANALYST |
| Next: product vague UI usable | ❌ FAIL | 65.7 | hqLocation does not match ground truth |
| Next: product tool-driven expandable card schema | ❌ FAIL | 91.0 | hqLocation does not match ground truth |
| Next: sales vague shareable | ❌ FAIL | 56.8 | persona mismatch: got JPM_STARTUP_BANKER expected SALES_ENGINEER |
| Next: sales tool-driven one-screen + objections | ❌ FAIL | 65.1 | contact.email missing or mismatched |
| Stress: ambiguous persona (wedge + outreach) | ❌ FAIL | 74.7 | hqLocation does not match ground truth |
| Stress: contradiction handling (Seed vs Series A) | ❌ FAIL | 76.5 | funding.stage mismatch: got 'series a (claimed)' expected 'Seed' |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 120.2 | missing ground truth citation anchor in grounding[] |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ❌ FAIL | 73.8 | hqLocation does not match ground truth |

### gemini-3-flash

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ❌ FAIL | 13.9 | hqLocation does not match ground truth |
| Next: banker tool-driven outbound pack | ❌ FAIL | 14.3 | persona mismatch: got PRODUCT_DESIGNER expected JPM_STARTUP_BANKER |
| Next: VC vague wedge | ❌ FAIL | 14.7 | hqLocation does not match ground truth |
| Next: VC tool-driven comps + diligence | ❌ FAIL | 14.8 | hqLocation does not match ground truth |
| Next: CTO vague exposure | ❌ FAIL | 15.3 | persona mismatch: got PRODUCT_DESIGNER expected CTO_TECH_LEAD |
| Next: CTO tool-driven CVE plan | ❌ FAIL | 13.3 | missing ground truth citation anchor in grounding[] |
| Next: founder vague positioning | ❌ FAIL | 13.1 | missing ground truth citation anchor in grounding[] |
| Next: founder tool-driven memo | ❌ FAIL | 14.5 | missing ground truth citation anchor in grounding[] |
| Next: academic vague anchor | ❌ FAIL | 13.0 | persona mismatch: got JPM_STARTUP_BANKER expected ACADEMIC_RD |
| Next: academic tool-driven literature debrief | ❌ FAIL | 16.2 | missing ground truth citation anchor in grounding[] |
| Next: exec vague standardize | ❌ FAIL | 13.0 | missing ground truth citation anchor in grounding[] |
| Next: exec tool-driven cost model | ❌ FAIL | 14.1 | persona mismatch: got PRODUCT_DESIGNER expected ENTERPRISE_EXEC |
| Next: ecosystem vague incident | ❌ FAIL | 15.5 | persona mismatch: got JPM_STARTUP_BANKER expected ECOSYSTEM_PARTNER |
| Next: ecosystem tool-driven second-order brief | ❌ FAIL | 13.0 | hqLocation does not match ground truth |
| Next: quant vague what to track | ❌ FAIL | 14.3 | hqLocation does not match ground truth |
| Next: quant tool-driven signal set JSON | ❌ FAIL | 13.6 | hqLocation does not match ground truth |
| Next: product vague UI usable | ❌ FAIL | 13.1 | hqLocation does not match ground truth |
| Next: product tool-driven expandable card schema | ❌ FAIL | 12.9 | hqLocation does not match ground truth |
| Next: sales vague shareable | ❌ FAIL | 12.9 | persona mismatch: got JPM_STARTUP_BANKER expected SALES_ENGINEER |
| Next: sales tool-driven one-screen + objections | ❌ FAIL | 12.9 | hqLocation does not match ground truth |
| Stress: ambiguous persona (wedge + outreach) | ❌ FAIL | 14.1 | hqLocation does not match ground truth |
| Stress: contradiction handling (Seed vs Series A) | ❌ FAIL | 14.2 | hqLocation does not match ground truth |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 13.7 | missing ground truth citation anchor in grounding[] |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ❌ FAIL | 14.3 | hqLocation does not match ground truth |

### deepseek-r1

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ❌ FAIL | 35.0 | hqLocation does not match ground truth |
| Next: banker tool-driven outbound pack | ❌ FAIL | 55.4 | contact.email missing or mismatched |
| Next: VC vague wedge | ❌ FAIL | 64.3 | hqLocation does not match ground truth |
| Next: VC tool-driven comps + diligence | ❌ FAIL | 241.6 | hqLocation does not match ground truth |
| Next: CTO vague exposure | ❌ FAIL | 81.3 | persona mismatch: got PRODUCT_DESIGNER expected CTO_TECH_LEAD |
| Next: CTO tool-driven CVE plan | ❌ FAIL | 205.1 | entity mismatch: got resolvedId='CVE-2025-62495' canonical='CVE-2025-62495' expe |
| offset:6 | ❌ FAIL | 300.5 | - |
| Next: founder tool-driven memo | ❌ FAIL | 100.8 | missing ground truth citation anchor in grounding[] |
| Next: academic vague anchor | ❌ FAIL | 109.9 | missing ground truth citation anchor in grounding[] |
| Next: academic tool-driven literature debrief | ❌ FAIL | 151.9 | missing ground truth citation anchor in grounding[] |
| Next: exec vague standardize | ❌ FAIL | 56.8 | missing ground truth citation anchor in grounding[] |
| Next: exec tool-driven cost model | ❌ FAIL | 77.5 | missing ground truth citation anchor in grounding[] |
| Next: ecosystem vague incident | ✅ PASS | 46.8 | - |
| Next: ecosystem tool-driven second-order brief | ✅ PASS | 58.7 | - |
| Next: quant vague what to track | ❌ FAIL | 43.9 | contact.email missing or mismatched |
| Next: quant tool-driven signal set JSON | ✅ PASS | 76.7 | - |
| Next: product vague UI usable | ❌ FAIL | 42.4 | contact.email missing or mismatched |
| Next: product tool-driven expandable card schema | ❌ FAIL | 145.8 | hqLocation does not match ground truth |
| Next: sales vague shareable | ❌ FAIL | 15.5 | persona mismatch: got JPM_STARTUP_BANKER expected SALES_ENGINEER |
| Next: sales tool-driven one-screen + objections | ❌ FAIL | 21.6 | hqLocation does not match ground truth |
| Stress: ambiguous persona (wedge + outreach) | ❌ FAIL | 52.3 | hqLocation does not match ground truth |
| Stress: contradiction handling (Seed vs Series A) | ❌ FAIL | 24.6 | hqLocation does not match ground truth |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 201.8 | persona mismatch: got CTO_TECH_LEAD expected ENTERPRISE_EXEC |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ✅ PASS | 107.3 | - |

### deepseek-v3.2

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ❌ FAIL | 95.9 | contact.email missing or mismatched |
| Next: banker tool-driven outbound pack | ❌ FAIL | 50.9 | persona mismatch: got PRODUCT_DESIGNER expected JPM_STARTUP_BANKER |
| Next: VC vague wedge | ❌ FAIL | 24.1 | hqLocation does not match ground truth |
| Next: VC tool-driven comps + diligence | ❌ FAIL | 71.0 | contact.email missing or mismatched |
| Next: CTO vague exposure | ❌ FAIL | 43.4 | persona mismatch: got PRODUCT_DESIGNER expected CTO_TECH_LEAD |
| Next: CTO tool-driven CVE plan | ❌ FAIL | 29.2 | missing ground truth citation anchor in grounding[] |
| Next: founder vague positioning | ❌ FAIL | 30.2 | missing ground truth citation anchor in grounding[] |
| Next: founder tool-driven memo | ❌ FAIL | 49.6 | missing ground truth citation anchor in grounding[] |
| Next: academic vague anchor | ❌ FAIL | 129.1 | missing ground truth citation anchor in grounding[] |
| Next: academic tool-driven literature debrief | ❌ FAIL | 81.5 | missing ground truth citation anchor in grounding[] |
| Next: exec vague standardize | ✅ PASS | 66.8 | - |
| Next: exec tool-driven cost model | ❌ FAIL | 21.9 | persona mismatch: got PRODUCT_DESIGNER expected ENTERPRISE_EXEC |
| Next: ecosystem vague incident | ❌ FAIL | 46.8 | persona mismatch: got JPM_STARTUP_BANKER expected ECOSYSTEM_PARTNER |
| Next: ecosystem tool-driven second-order brief | ❌ FAIL | 48.5 | hqLocation does not match ground truth |
| Next: quant vague what to track | ❌ FAIL | 61.1 | contact.email missing or mismatched |
| Next: quant tool-driven signal set JSON | ❌ FAIL | 84.2 | hqLocation does not match ground truth |
| Next: product vague UI usable | ❌ FAIL | 34.2 | hqLocation does not match ground truth |
| Next: product tool-driven expandable card schema | ❌ FAIL | 39.7 | hqLocation does not match ground truth |
| Next: sales vague shareable | ❌ FAIL | 49.9 | persona mismatch: got JPM_STARTUP_BANKER expected SALES_ENGINEER |
| Next: sales tool-driven one-screen + objections | ❌ FAIL | 42.1 | hqLocation does not match ground truth |
| Stress: ambiguous persona (wedge + outreach) | ❌ FAIL | 86.7 | contact.email missing or mismatched |
| Stress: contradiction handling (Seed vs Series A) | ❌ FAIL | 97.9 | funding.stage mismatch: got 'series a' expected 'Seed' |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 35.2 | missing ground truth citation anchor in grounding[] |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ❌ FAIL | 125.1 | contact.email missing or mismatched |

### qwen3-235b

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ❌ FAIL | 79.3 | hqLocation does not match ground truth |
| Next: banker tool-driven outbound pack | ❌ FAIL | 45.9 | persona mismatch: got PRODUCT_DESIGNER expected JPM_STARTUP_BANKER |
| Next: VC vague wedge | ❌ FAIL | 39.0 | hqLocation does not match ground truth |
| Next: VC tool-driven comps + diligence | ❌ FAIL | 47.0 | hqLocation does not match ground truth |
| Next: CTO vague exposure | ❌ FAIL | 88.6 | missing ground truth citation anchor in grounding[] |
| Next: CTO tool-driven CVE plan | ❌ FAIL | 105.0 | entity mismatch: got resolvedId='cve-2025-62495' canonical='CVE-2025-62495' expe |
| Next: founder vague positioning | ✅ PASS | 100.7 | - |
| Next: founder tool-driven memo | ❌ FAIL | 40.5 | missing ground truth citation anchor in grounding[] |
| Next: academic vague anchor | ❌ FAIL | 47.4 | persona mismatch: got JPM_STARTUP_BANKER expected ACADEMIC_RD |
| Next: academic tool-driven literature debrief | ✅ PASS | 112.2 | - |
| Next: exec vague standardize | ❌ FAIL | 96.4 | missing ground truth citation anchor in grounding[] |
| Next: exec tool-driven cost model | ✅ PASS | 100.3 | - |
| Next: ecosystem vague incident | ❌ FAIL | 104.6 | hqLocation does not match ground truth |
| Next: ecosystem tool-driven second-order brief | ❌ FAIL | 105.6 | hqLocation does not match ground truth |
| Next: quant vague what to track | ❌ FAIL | 93.5 | persona mismatch: got JPM_STARTUP_BANKER expected QUANT_ANALYST |
| Next: quant tool-driven signal set JSON | ❌ FAIL | 46.5 | hqLocation does not match ground truth |
| Next: product vague UI usable | ❌ FAIL | 96.2 | persona mismatch: got SALES_ENGINEER expected PRODUCT_DESIGNER |
| Next: product tool-driven expandable card schema | ❌ FAIL | 99.5 | contact.email missing or mismatched |
| Next: sales vague shareable | ❌ FAIL | 99.2 | hqLocation does not match ground truth |
| Next: sales tool-driven one-screen + objections | ❌ FAIL | 110.7 | contact.email missing or mismatched |
| Stress: ambiguous persona (wedge + outreach) | ❌ FAIL | 97.7 | contact.email missing or mismatched |
| Stress: contradiction handling (Seed vs Series A) | ❌ FAIL | 45.3 | hqLocation does not match ground truth |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 159.4 | missing ground truth citation anchor in grounding[] |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ❌ FAIL | 95.9 | contact.email missing or mismatched |

### minimax-m2.1

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ❌ FAIL | 98.6 | contact.email missing or mismatched |
| Next: banker tool-driven outbound pack | ❌ FAIL | 63.2 | contact.email missing or mismatched |
| Next: VC vague wedge | ❌ FAIL | 101.5 | Invalid JSON: Unexpected non-whitespace character after JSON at position 1011 |
| Next: VC tool-driven comps + diligence | ❌ FAIL | 94.7 | contact.email missing or mismatched |
| Next: CTO vague exposure | ❌ FAIL | 40.8 | persona mismatch: got PRODUCT_DESIGNER expected CTO_TECH_LEAD |
| Next: CTO tool-driven CVE plan | ❌ FAIL | 61.6 | missing ground truth citation anchor in grounding[] |
| Next: founder vague positioning | ❌ FAIL | 75.5 | missing ground truth citation anchor in grounding[] |
| Next: founder tool-driven memo | ❌ FAIL | 138.0 | missing ground truth citation anchor in grounding[] |
| Next: academic vague anchor | ❌ FAIL | 77.6 | missing ground truth citation anchor in grounding[] |
| Next: academic tool-driven literature debrief | ❌ FAIL | 124.4 | missing ground truth citation anchor in grounding[] |
| Next: exec vague standardize | ❌ FAIL | 44.3 | persona mismatch: got CTO_TECH_LEAD expected ENTERPRISE_EXEC |
| Next: exec tool-driven cost model | ❌ FAIL | 140.1 | missing ground truth citation anchor in grounding[] |
| Next: ecosystem vague incident | ❌ FAIL | 51.9 | hqLocation does not match ground truth |
| Next: ecosystem tool-driven second-order brief | ❌ FAIL | 125.7 | hqLocation does not match ground truth |
| Next: quant vague what to track | ❌ FAIL | 32.4 | hqLocation does not match ground truth |
| Next: quant tool-driven signal set JSON | ❌ FAIL | 48.9 | contact.email missing or mismatched |
| Next: product vague UI usable | ❌ FAIL | 58.6 | persona mismatch: got EARLY_STAGE_VC expected PRODUCT_DESIGNER |
| Next: product tool-driven expandable card schema | ❌ FAIL | 91.7 | contact.email missing or mismatched |
| Next: sales vague shareable | ❌ FAIL | 89.3 | contact.email missing or mismatched |
| Next: sales tool-driven one-screen + objections | ❌ FAIL | 100.7 | Invalid JSON: Unexpected non-whitespace character after JSON at position 775 |
| Stress: ambiguous persona (wedge + outreach) | ❌ FAIL | 37.9 | contact.email missing or mismatched |
| Stress: contradiction handling (Seed vs Series A) | ❌ FAIL | 65.6 | contact.email missing or mismatched |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 39.2 | entity mismatch: got resolvedId='N/A' canonical='AI Model API Pricing Analysis'  |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ❌ FAIL | 75.5 | contact.email missing or mismatched |

### mimo-v2-flash-free

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ❌ FAIL | 25.7 | contact.email missing or mismatched |
| Next: banker tool-driven outbound pack | ❌ FAIL | 34.6 | contact.email missing or mismatched |
| Next: VC vague wedge | ❌ FAIL | 22.7 | contact.email missing or mismatched |
| Next: VC tool-driven comps + diligence | ❌ FAIL | 56.9 | contact.email missing or mismatched |
| Next: CTO vague exposure | ❌ FAIL | 28.1 | missing ground truth citation anchor in grounding[] |
| Next: CTO tool-driven CVE plan | ❌ FAIL | 38.4 | entity mismatch: got resolvedId='N/A' canonical='CVE-2025-62495' expected 'MQUIC |
| Next: founder vague positioning | ❌ FAIL | 24.9 | missing ground truth citation anchor in grounding[] |
| Next: founder tool-driven memo | ❌ FAIL | 44.8 | missing ground truth citation anchor in grounding[] |
| Next: academic vague anchor | ✅ PASS | 32.5 | - |
| Next: academic tool-driven literature debrief | ❌ FAIL | 24.5 | Invalid JSON: Unexpected token '*', "**
{
  "sc"... is not valid JSON |
| Next: exec vague standardize | ❌ FAIL | 40.5 | persona mismatch: got EARLY_STAGE_VC expected ENTERPRISE_EXEC |
| Next: exec tool-driven cost model | ✅ PASS | 46.1 | - |
| Next: ecosystem vague incident | ❌ FAIL | 25.9 | persona.inferred must be a known persona |
| Next: ecosystem tool-driven second-order brief | ❌ FAIL | 36.9 | missing required tools: expected lookupGroundTruthEntity got [searchAvailableSki |
| Next: quant vague what to track | ❌ FAIL | 25.6 | contact.email missing or mismatched |
| Next: quant tool-driven signal set JSON | ❌ FAIL | 25.9 | contact.email missing or mismatched |
| Next: product vague UI usable | ❌ FAIL | 22.2 | contact.email missing or mismatched |
| Next: product tool-driven expandable card schema | ❌ FAIL | 42.4 | hqLocation does not match ground truth |
| Next: sales vague shareable | ❌ FAIL | 22.9 | persona mismatch: got JPM_STARTUP_BANKER expected SALES_ENGINEER |
| Next: sales tool-driven one-screen + objections | ❌ FAIL | 28.9 | hqLocation does not match ground truth |
| Stress: ambiguous persona (wedge + outreach) | ❌ FAIL | 19.8 | contact.email missing or mismatched |
| Stress: contradiction handling (Seed vs Series A) | ❌ FAIL | 28.2 | funding.stage mismatch: got 'series a' expected 'Seed' |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 45.3 | missing verification loop (no planSteps entry includes verify/validate/confirm/c |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ❌ FAIL | 27.5 | contact.email missing or mismatched |

## Disclosure Metrics (P0 Instrumentation)

### Disclosure Level by Model

| Model | Full | Partial | None |
|-------|------|---------|------|
| claude-haiku-4.5 | 0 | 19 | 5 |
| gpt-5-mini | 0 | 24 | 0 |
| gemini-3-flash | 0 | 24 | 0 |
| deepseek-r1 | 1 | 21 | 1 |
| deepseek-v3.2 | 0 | 24 | 0 |
| qwen3-235b | 0 | 23 | 1 |
| minimax-m2.1 | 1 | 23 | 0 |
| mimo-v2-flash-free | 1 | 23 | 0 |

### Disclosure Warnings (Non-Scored)

> **Note:** These warnings are informational and do not affect pass/fail.
> They track progressive disclosure usage for Week 1-2 observability.

⚠️ [deepseek-r1/next_cto_tool_cve_plan] Excessive direct tool calls: 205 (>10)
⚠️ [deepseek-r1/next_quant_vague_disco_track] Excessive direct tool calls: 11 (>10)
⚠️ [qwen3-235b/next_banker_vague_disco_cover_this_week] No skill search before tool invoke
⚠️ [qwen3-235b/next_cto_tool_cve_plan] No skill search before tool invoke
⚠️ [qwen3-235b/next_cto_tool_cve_plan] No skill search for CTO_TECH_LEAD scenario
⚠️ [qwen3-235b/next_cto_tool_cve_plan] No progressive disclosure meta-tools used
⚠️ [qwen3-235b/next_ecosystem_vague_soundcloud_vpn] No skill search before tool invoke
⚠️ [qwen3-235b/pack_exec_cross_provider_pricing] Excessive direct tool calls: 17 (>10)
