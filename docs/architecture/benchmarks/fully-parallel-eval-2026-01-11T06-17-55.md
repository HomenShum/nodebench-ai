# Fully Parallel Evaluation Results

Generated: 2026-01-11T06:17:55.141Z
Total Time: 300.5s
Suite: pack
Models: 8
Scenarios: 24 of 24 (limit=0)
Total evaluations: 192

## Summary by Model

| Model | Total | Passed | Failed | Avg Time (s) |
|-------|-------|--------|--------|--------------|
| claude-haiku-4.5 | 24 | 9 | 15 | 45.4 |
| gpt-5-mini | 24 | 15 | 9 | 79.3 |
| gemini-3-flash | 24 | 15 | 9 | 14.3 |
| deepseek-r1 | 24 | 15 | 8 | 104.4 |
| deepseek-v3.2 | 24 | 14 | 9 | 84.6 |
| qwen3-235b | 24 | 15 | 9 | 99.7 |
| minimax-m2.1 | 24 | 15 | 9 | 51.2 |
| mimo-v2-flash-free | 24 | 15 | 9 | 56.4 |

## Summary by Scenario

| Scenario | Total | Passed | Failed |
|----------|-------|--------|--------|
| Next: academic tool-driven literature debrief | 8 | 7 | 1 |
| Next: academic vague anchor | 8 | 0 | 8 |
| Next: banker tool-driven outbound pack | 8 | 0 | 8 |
| Next: banker vague (fast debrief) | 8 | 8 | 0 |
| Next: CTO tool-driven CVE plan | 8 | 7 | 1 |
| Next: CTO vague exposure | 7 | 0 | 7 |
| Next: ecosystem tool-driven second-order brief | 8 | 7 | 1 |
| Next: ecosystem vague incident | 8 | 0 | 8 |
| Next: exec tool-driven cost model | 8 | 7 | 1 |
| Next: exec vague standardize | 8 | 0 | 8 |
| Next: founder tool-driven memo | 8 | 0 | 8 |
| Next: founder vague positioning | 8 | 0 | 8 |
| Next: product tool-driven expandable card schema | 8 | 7 | 1 |
| Next: product vague UI usable | 8 | 8 | 0 |
| Next: quant tool-driven signal set JSON | 8 | 8 | 0 |
| Next: quant vague what to track | 8 | 8 | 0 |
| Next: sales tool-driven one-screen + objections | 8 | 7 | 1 |
| Next: sales vague shareable | 8 | 0 | 8 |
| Next: VC tool-driven comps + diligence | 8 | 8 | 0 |
| Next: VC vague wedge | 8 | 8 | 0 |
| offset:22 | 1 | 0 | 1 |
| offset:4 | 1 | 0 | 1 |
| Pack: exec cross-provider pricing comparison | 7 | 0 | 7 |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | 8 | 7 | 1 |
| Stress: ambiguous persona (wedge + outreach) | 8 | 8 | 0 |
| Stress: contradiction handling (Seed vs Series A) | 8 | 8 | 0 |

## Detailed Results

### claude-haiku-4.5

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 15.4 | - |
| Next: banker tool-driven outbound pack | ❌ FAIL | 36.4 | contact.email missing or mismatched |
| Next: VC vague wedge | ✅ PASS | 48.5 | - |
| Next: VC tool-driven comps + diligence | ✅ PASS | 140.5 | - |
| Next: CTO vague exposure | ❌ FAIL | 37.8 | Missing [DEBRIEF_V1_JSON] block |
| Next: CTO tool-driven CVE plan | ❌ FAIL | 36.8 | Missing [DEBRIEF_V1_JSON] block |
| Next: founder vague positioning | ❌ FAIL | 47.5 | entity mismatch: got resolvedId='OPEN-AUTOGLM' canonical='OpenAutoGLM' expected  |
| Next: founder tool-driven memo | ❌ FAIL | 36.4 | entity mismatch: got resolvedId='OPEN-AUTOGLM' canonical='OpenAutoGLM' expected  |
| Next: academic vague anchor | ❌ FAIL | 37.1 | Missing [DEBRIEF_V1_JSON] block |
| Next: academic tool-driven literature debrief | ❌ FAIL | 37.0 | Missing [DEBRIEF_V1_JSON] block |
| Next: exec vague standardize | ❌ FAIL | 37.2 | Missing [DEBRIEF_V1_JSON] block |
| Next: exec tool-driven cost model | ❌ FAIL | 35.9 | Missing [DEBRIEF_V1_JSON] block |
| Next: ecosystem vague incident | ❌ FAIL | 36.3 | persona mismatch: got JPM_STARTUP_BANKER expected ECOSYSTEM_PARTNER |
| Next: ecosystem tool-driven second-order brief | ❌ FAIL | 36.8 | Missing [DEBRIEF_V1_JSON] block |
| Next: quant vague what to track | ✅ PASS | 47.5 | - |
| Next: quant tool-driven signal set JSON | ✅ PASS | 47.8 | - |
| Next: product vague UI usable | ✅ PASS | 47.9 | - |
| Next: product tool-driven expandable card schema | ✅ PASS | 42.5 | - |
| Next: sales vague shareable | ❌ FAIL | 65.3 | persona mismatch: got JPM_STARTUP_BANKER expected SALES_ENGINEER |
| Next: sales tool-driven one-screen + objections | ❌ FAIL | 37.9 | Missing [DEBRIEF_V1_JSON] block |
| Stress: ambiguous persona (wedge + outreach) | ✅ PASS | 48.2 | - |
| Stress: contradiction handling (Seed vs Series A) | ✅ PASS | 56.7 | - |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 38.2 | Missing [DEBRIEF_V1_JSON] block |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ❌ FAIL | 37.5 | Missing [DEBRIEF_V1_JSON] block |

### gpt-5-mini

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 62.4 | - |
| Next: banker tool-driven outbound pack | ❌ FAIL | 81.4 | contact.email missing or mismatched |
| Next: VC vague wedge | ✅ PASS | 83.6 | - |
| Next: VC tool-driven comps + diligence | ✅ PASS | 107.8 | - |
| Next: CTO vague exposure | ❌ FAIL | 72.6 | persona mismatch: got PRODUCT_DESIGNER expected CTO_TECH_LEAD |
| Next: CTO tool-driven CVE plan | ✅ PASS | 127.4 | - |
| Next: founder vague positioning | ❌ FAIL | 65.2 | entity mismatch: got resolvedId='OPEN-AUTOGLM' canonical='OpenAutoGLM' expected  |
| Next: founder tool-driven memo | ❌ FAIL | 58.0 | entity mismatch: got resolvedId='OPEN-AUTOGLM' canonical='OpenAutoGLM' expected  |
| Next: academic vague anchor | ❌ FAIL | 71.0 | persona mismatch: got JPM_STARTUP_BANKER expected ACADEMIC_RD |
| Next: academic tool-driven literature debrief | ✅ PASS | 172.0 | - |
| Next: exec vague standardize | ❌ FAIL | 52.6 | entity mismatch: got resolvedId='OPEN-AUTOGLM' canonical='OpenAutoGLM' expected  |
| Next: exec tool-driven cost model | ✅ PASS | 84.3 | - |
| Next: ecosystem vague incident | ❌ FAIL | 65.2 | persona mismatch: got JPM_STARTUP_BANKER expected ECOSYSTEM_PARTNER |
| Next: ecosystem tool-driven second-order brief | ✅ PASS | 99.7 | - |
| Next: quant vague what to track | ✅ PASS | 48.4 | - |
| Next: quant tool-driven signal set JSON | ✅ PASS | 70.5 | - |
| Next: product vague UI usable | ✅ PASS | 67.6 | - |
| Next: product tool-driven expandable card schema | ✅ PASS | 69.7 | - |
| Next: sales vague shareable | ❌ FAIL | 46.9 | persona mismatch: got JPM_STARTUP_BANKER expected SALES_ENGINEER |
| Next: sales tool-driven one-screen + objections | ✅ PASS | 57.5 | - |
| Stress: ambiguous persona (wedge + outreach) | ✅ PASS | 68.9 | - |
| Stress: contradiction handling (Seed vs Series A) | ✅ PASS | 68.3 | - |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 129.0 | entity mismatch: got resolvedId='OPEN-AUTOGLM' canonical='OpenAutoGLM' expected  |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ✅ PASS | 73.6 | - |

### gemini-3-flash

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 13.9 | - |
| Next: banker tool-driven outbound pack | ❌ FAIL | 14.8 | contact.email missing or mismatched |
| Next: VC vague wedge | ✅ PASS | 14.9 | - |
| Next: VC tool-driven comps + diligence | ✅ PASS | 15.4 | - |
| Next: CTO vague exposure | ❌ FAIL | 13.6 | persona mismatch: got PRODUCT_DESIGNER expected CTO_TECH_LEAD |
| Next: CTO tool-driven CVE plan | ✅ PASS | 13.7 | - |
| Next: founder vague positioning | ❌ FAIL | 13.5 | entity mismatch: got resolvedId='OPEN-AUTOGLM' canonical='OpenAutoGLM' expected  |
| Next: founder tool-driven memo | ❌ FAIL | 15.0 | entity mismatch: got resolvedId='OPEN-AUTOGLM' canonical='OpenAutoGLM' expected  |
| Next: academic vague anchor | ❌ FAIL | 13.9 | persona mismatch: got JPM_STARTUP_BANKER expected ACADEMIC_RD |
| Next: academic tool-driven literature debrief | ✅ PASS | 15.1 | - |
| Next: exec vague standardize | ❌ FAIL | 14.2 | entity mismatch: got resolvedId='OPEN-AUTOGLM' canonical='OpenAutoGLM' expected  |
| Next: exec tool-driven cost model | ✅ PASS | 13.7 | - |
| Next: ecosystem vague incident | ❌ FAIL | 13.6 | persona mismatch: got JPM_STARTUP_BANKER expected ECOSYSTEM_PARTNER |
| Next: ecosystem tool-driven second-order brief | ✅ PASS | 14.2 | - |
| Next: quant vague what to track | ✅ PASS | 13.7 | - |
| Next: quant tool-driven signal set JSON | ✅ PASS | 13.8 | - |
| Next: product vague UI usable | ✅ PASS | 13.9 | - |
| Next: product tool-driven expandable card schema | ✅ PASS | 14.3 | - |
| Next: sales vague shareable | ❌ FAIL | 14.5 | persona mismatch: got JPM_STARTUP_BANKER expected SALES_ENGINEER |
| Next: sales tool-driven one-screen + objections | ✅ PASS | 13.6 | - |
| Stress: ambiguous persona (wedge + outreach) | ✅ PASS | 15.5 | - |
| Stress: contradiction handling (Seed vs Series A) | ✅ PASS | 14.6 | - |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 13.6 | entity mismatch: got resolvedId='OPEN-AUTOGLM' canonical='OpenAutoGLM' expected  |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ✅ PASS | 15.2 | - |

### deepseek-r1

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 62.8 | - |
| Next: banker tool-driven outbound pack | ❌ FAIL | 10.8 | contact.email missing or mismatched |
| Next: VC vague wedge | ✅ PASS | 71.2 | - |
| Next: VC tool-driven comps + diligence | ✅ PASS | 33.2 | - |
| offset:4 | ❌ FAIL | 300.5 | - |
| Next: CTO tool-driven CVE plan | ✅ PASS | 166.3 | - |
| Next: founder vague positioning | ❌ FAIL | 130.0 | entity mismatch: got resolvedId='OPEN-AUTOGLM' canonical='OpenAutoGLM' expected  |
| Next: founder tool-driven memo | ❌ FAIL | 243.7 | entity mismatch: got resolvedId='OPEN-AUTOGLM' canonical='OpenAutoGLM' expected  |
| Next: academic vague anchor | ❌ FAIL | 65.5 | persona mismatch: got JPM_STARTUP_BANKER expected ACADEMIC_RD |
| Next: academic tool-driven literature debrief | ✅ PASS | 50.7 | - |
| Next: exec vague standardize | ❌ FAIL | 50.8 | entity mismatch: got resolvedId='OPEN-AUTOGLM' canonical='OpenAutoGLM' expected  |
| Next: exec tool-driven cost model | ✅ PASS | 174.7 | - |
| Next: ecosystem vague incident | ❌ FAIL | 10.6 | persona mismatch: got JPM_STARTUP_BANKER expected ECOSYSTEM_PARTNER |
| Next: ecosystem tool-driven second-order brief | ✅ PASS | 45.7 | - |
| Next: quant vague what to track | ✅ PASS | 69.1 | - |
| Next: quant tool-driven signal set JSON | ✅ PASS | 213.9 | - |
| Next: product vague UI usable | ✅ PASS | 50.9 | - |
| Next: product tool-driven expandable card schema | ✅ PASS | 150.2 | - |
| Next: sales vague shareable | ❌ FAIL | 38.3 | persona mismatch: got JPM_STARTUP_BANKER expected SALES_ENGINEER |
| Next: sales tool-driven one-screen + objections | ✅ PASS | 92.6 | - |
| Stress: ambiguous persona (wedge + outreach) | ✅ PASS | 82.2 | - |
| Stress: contradiction handling (Seed vs Series A) | ✅ PASS | 60.9 | - |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 285.2 | entity mismatch: got resolvedId='OPEN-AUTOGLM' canonical='OpenAutoGLM' expected  |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ✅ PASS | 46.9 | - |

### deepseek-v3.2

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 92.1 | - |
| Next: banker tool-driven outbound pack | ❌ FAIL | 156.7 | contact.email missing or mismatched |
| Next: VC vague wedge | ✅ PASS | 55.6 | - |
| Next: VC tool-driven comps + diligence | ✅ PASS | 86.2 | - |
| Next: CTO vague exposure | ❌ FAIL | 87.3 | persona mismatch: got PRODUCT_DESIGNER expected CTO_TECH_LEAD |
| Next: CTO tool-driven CVE plan | ✅ PASS | 107.3 | - |
| Next: founder vague positioning | ❌ FAIL | 31.6 | entity mismatch: got resolvedId='OPEN-AUTOGLM' canonical='OpenAutoGLM' expected  |
| Next: founder tool-driven memo | ❌ FAIL | 36.5 | entity mismatch: got resolvedId='OPEN-AUTOGLM' canonical='OpenAutoGLM' expected  |
| Next: academic vague anchor | ❌ FAIL | 73.4 | persona mismatch: got JPM_STARTUP_BANKER expected ACADEMIC_RD |
| Next: academic tool-driven literature debrief | ✅ PASS | 86.2 | - |
| Next: exec vague standardize | ❌ FAIL | 70.9 | entity mismatch: got resolvedId='OPEN-AUTOGLM' canonical='OpenAutoGLM' expected  |
| Next: exec tool-driven cost model | ✅ PASS | 67.2 | - |
| Next: ecosystem vague incident | ❌ FAIL | 17.9 | persona mismatch: got JPM_STARTUP_BANKER expected ECOSYSTEM_PARTNER |
| Next: ecosystem tool-driven second-order brief | ✅ PASS | 13.9 | - |
| Next: quant vague what to track | ✅ PASS | 41.4 | - |
| Next: quant tool-driven signal set JSON | ✅ PASS | 70.4 | - |
| Next: product vague UI usable | ✅ PASS | 126.0 | - |
| Next: product tool-driven expandable card schema | ❌ FAIL | 132.1 | Invalid JSON: Bad control character in string literal in JSON at position 248 |
| Next: sales vague shareable | ❌ FAIL | 18.9 | persona mismatch: got JPM_STARTUP_BANKER expected SALES_ENGINEER |
| Next: sales tool-driven one-screen + objections | ✅ PASS | 106.0 | - |
| Stress: ambiguous persona (wedge + outreach) | ✅ PASS | 81.7 | - |
| Stress: contradiction handling (Seed vs Series A) | ✅ PASS | 87.1 | - |
| offset:22 | ❌ FAIL | 300.5 | - |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ✅ PASS | 83.0 | - |

### qwen3-235b

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 39.7 | - |
| Next: banker tool-driven outbound pack | ❌ FAIL | 117.9 | contact.email missing or mismatched |
| Next: VC vague wedge | ✅ PASS | 151.1 | - |
| Next: VC tool-driven comps + diligence | ✅ PASS | 156.8 | - |
| Next: CTO vague exposure | ❌ FAIL | 128.6 | persona mismatch: got PRODUCT_DESIGNER expected CTO_TECH_LEAD |
| Next: CTO tool-driven CVE plan | ✅ PASS | 75.3 | - |
| Next: founder vague positioning | ❌ FAIL | 88.1 | entity mismatch: got resolvedId='OPEN-AUTOGLM' canonical='OpenAutoGLM' expected  |
| Next: founder tool-driven memo | ❌ FAIL | 124.2 | entity mismatch: got resolvedId='OPEN-AUTOGLM' canonical='OpenAutoGLM' expected  |
| Next: academic vague anchor | ❌ FAIL | 104.4 | persona mismatch: got JPM_STARTUP_BANKER expected ACADEMIC_RD |
| Next: academic tool-driven literature debrief | ✅ PASS | 35.6 | - |
| Next: exec vague standardize | ❌ FAIL | 73.0 | entity mismatch: got resolvedId='OPEN-AUTOGLM' canonical='OpenAutoGLM' expected  |
| Next: exec tool-driven cost model | ✅ PASS | 120.1 | - |
| Next: ecosystem vague incident | ❌ FAIL | 131.2 | persona mismatch: got JPM_STARTUP_BANKER expected ECOSYSTEM_PARTNER |
| Next: ecosystem tool-driven second-order brief | ✅ PASS | 100.0 | - |
| Next: quant vague what to track | ✅ PASS | 36.3 | - |
| Next: quant tool-driven signal set JSON | ✅ PASS | 127.6 | - |
| Next: product vague UI usable | ✅ PASS | 152.3 | - |
| Next: product tool-driven expandable card schema | ✅ PASS | 35.4 | - |
| Next: sales vague shareable | ❌ FAIL | 106.0 | persona mismatch: got JPM_STARTUP_BANKER expected SALES_ENGINEER |
| Next: sales tool-driven one-screen + objections | ✅ PASS | 35.3 | - |
| Stress: ambiguous persona (wedge + outreach) | ✅ PASS | 164.0 | - |
| Stress: contradiction handling (Seed vs Series A) | ✅ PASS | 125.8 | - |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 40.2 | entity mismatch: got resolvedId='OPEN-AUTOGLM' canonical='OpenAutoGLM' expected  |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ✅ PASS | 125.1 | - |

### minimax-m2.1

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 29.5 | - |
| Next: banker tool-driven outbound pack | ❌ FAIL | 51.0 | contact.email missing or mismatched |
| Next: VC vague wedge | ✅ PASS | 47.7 | - |
| Next: VC tool-driven comps + diligence | ✅ PASS | 100.8 | - |
| Next: CTO vague exposure | ❌ FAIL | 41.8 | persona mismatch: got PRODUCT_DESIGNER expected CTO_TECH_LEAD |
| Next: CTO tool-driven CVE plan | ✅ PASS | 83.9 | - |
| Next: founder vague positioning | ❌ FAIL | 29.4 | entity mismatch: got resolvedId='OPEN-AUTOGLM' canonical='OpenAutoGLM' expected  |
| Next: founder tool-driven memo | ❌ FAIL | 63.7 | entity mismatch: got resolvedId='OPEN-AUTOGLM' canonical='OpenAutoGLM' expected  |
| Next: academic vague anchor | ❌ FAIL | 60.3 | persona mismatch: got JPM_STARTUP_BANKER expected ACADEMIC_RD |
| Next: academic tool-driven literature debrief | ✅ PASS | 78.5 | - |
| Next: exec vague standardize | ❌ FAIL | 34.9 | entity mismatch: got resolvedId='OPEN-AUTOGLM' canonical='OpenAutoGLM' expected  |
| Next: exec tool-driven cost model | ✅ PASS | 85.2 | - |
| Next: ecosystem vague incident | ❌ FAIL | 56.7 | persona mismatch: got JPM_STARTUP_BANKER expected ECOSYSTEM_PARTNER |
| Next: ecosystem tool-driven second-order brief | ✅ PASS | 55.8 | - |
| Next: quant vague what to track | ✅ PASS | 30.0 | - |
| Next: quant tool-driven signal set JSON | ✅ PASS | 35.7 | - |
| Next: product vague UI usable | ✅ PASS | 22.8 | - |
| Next: product tool-driven expandable card schema | ✅ PASS | 78.9 | - |
| Next: sales vague shareable | ❌ FAIL | 29.1 | persona mismatch: got JPM_STARTUP_BANKER expected SALES_ENGINEER |
| Next: sales tool-driven one-screen + objections | ✅ PASS | 29.4 | - |
| Stress: ambiguous persona (wedge + outreach) | ✅ PASS | 43.5 | - |
| Stress: contradiction handling (Seed vs Series A) | ✅ PASS | 33.7 | - |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 69.7 | entity mismatch: got resolvedId='OPEN-AUTOGLM' canonical='OpenAutoGLM' expected  |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ✅ PASS | 37.6 | - |

### mimo-v2-flash-free

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 23.7 | - |
| Next: banker tool-driven outbound pack | ❌ FAIL | 22.0 | contact.email missing or mismatched |
| Next: VC vague wedge | ✅ PASS | 52.7 | - |
| Next: VC tool-driven comps + diligence | ✅ PASS | 285.2 | - |
| Next: CTO vague exposure | ❌ FAIL | 22.7 | persona mismatch: got PRODUCT_DESIGNER expected CTO_TECH_LEAD |
| Next: CTO tool-driven CVE plan | ✅ PASS | 91.8 | - |
| Next: founder vague positioning | ❌ FAIL | 30.6 | entity mismatch: got resolvedId='OPEN-AUTOGLM' canonical='OpenAutoGLM' expected  |
| Next: founder tool-driven memo | ❌ FAIL | 123.2 | entity mismatch: got resolvedId='OPEN-AUTOGLM' canonical='OpenAutoGLM' expected  |
| Next: academic vague anchor | ❌ FAIL | 72.5 | persona mismatch: got JPM_STARTUP_BANKER expected ACADEMIC_RD |
| Next: academic tool-driven literature debrief | ✅ PASS | 60.7 | - |
| Next: exec vague standardize | ❌ FAIL | 25.1 | entity mismatch: got resolvedId='OPEN-AUTOGLM' canonical='OpenAutoGLM' expected  |
| Next: exec tool-driven cost model | ✅ PASS | 56.0 | - |
| Next: ecosystem vague incident | ❌ FAIL | 42.0 | persona mismatch: got JPM_STARTUP_BANKER expected ECOSYSTEM_PARTNER |
| Next: ecosystem tool-driven second-order brief | ✅ PASS | 77.0 | - |
| Next: quant vague what to track | ✅ PASS | 20.8 | - |
| Next: quant tool-driven signal set JSON | ✅ PASS | 27.5 | - |
| Next: product vague UI usable | ✅ PASS | 26.1 | - |
| Next: product tool-driven expandable card schema | ✅ PASS | 75.8 | - |
| Next: sales vague shareable | ❌ FAIL | 20.2 | persona mismatch: got JPM_STARTUP_BANKER expected SALES_ENGINEER |
| Next: sales tool-driven one-screen + objections | ✅ PASS | 33.6 | - |
| Stress: ambiguous persona (wedge + outreach) | ✅ PASS | 23.9 | - |
| Stress: contradiction handling (Seed vs Series A) | ✅ PASS | 22.1 | - |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 79.3 | entity mismatch: got resolvedId='OPEN-AUTOGLM' canonical='OpenAutoGLM' expected  |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ✅ PASS | 38.3 | - |

## Disclosure Metrics (P0 Instrumentation)

### Disclosure Level by Model

| Model | Full | Partial | None |
|-------|------|---------|------|
| claude-haiku-4.5 | 0 | 14 | 10 |
| gpt-5-mini | 0 | 24 | 0 |
| gemini-3-flash | 0 | 24 | 0 |
| deepseek-r1 | 0 | 23 | 0 |
| deepseek-v3.2 | 0 | 23 | 0 |
| qwen3-235b | 1 | 23 | 0 |
| minimax-m2.1 | 0 | 24 | 0 |
| mimo-v2-flash-free | 1 | 23 | 0 |

### Disclosure Warnings (Non-Scored)

> **Note:** These warnings are informational and do not affect pass/fail.
> They track progressive disclosure usage for Week 1-2 observability.

⚠️ [deepseek-r1/next_banker_vague_disco_cover_this_week] Excessive direct tool calls: 11 (>10)
⚠️ [deepseek-r1/stress_contradiction_disco_series_a_claim] Excessive direct tool calls: 15 (>10)
