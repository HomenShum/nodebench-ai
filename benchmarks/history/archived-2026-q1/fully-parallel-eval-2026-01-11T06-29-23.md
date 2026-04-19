# Fully Parallel Evaluation Results

Generated: 2026-01-11T06:29:23.082Z
Total Time: 300.6s
Suite: pack
Models: 8
Scenarios: 24 of 24 (limit=0)
Total evaluations: 192

## Summary by Model

| Model | Total | Passed | Failed | Avg Time (s) |
|-------|-------|--------|--------|--------------|
| claude-haiku-4.5 | 24 | 15 | 9 | 55.5 |
| gpt-5-mini | 24 | 20 | 4 | 65.0 |
| gemini-3-flash | 24 | 20 | 4 | 14.6 |
| deepseek-r1 | 24 | 15 | 4 | 142.2 |
| deepseek-v3.2 | 24 | 19 | 4 | 103.9 |
| qwen3-235b | 24 | 20 | 3 | 114.9 |
| minimax-m2.1 | 24 | 16 | 4 | 111.6 |
| mimo-v2-flash-free | 24 | 17 | 3 | 88.1 |

## Summary by Scenario

| Scenario | Total | Passed | Failed |
|----------|-------|--------|--------|
| Next: academic tool-driven literature debrief | 7 | 6 | 1 |
| Next: academic vague anchor | 8 | 0 | 8 |
| Next: banker tool-driven outbound pack | 7 | 0 | 7 |
| Next: banker vague (fast debrief) | 8 | 8 | 0 |
| Next: CTO tool-driven CVE plan | 7 | 7 | 0 |
| Next: CTO vague exposure | 7 | 6 | 1 |
| Next: ecosystem tool-driven second-order brief | 7 | 6 | 1 |
| Next: ecosystem vague incident | 7 | 0 | 7 |
| Next: exec tool-driven cost model | 8 | 8 | 0 |
| Next: exec vague standardize | 8 | 8 | 0 |
| Next: founder tool-driven memo | 8 | 8 | 0 |
| Next: founder vague positioning | 7 | 7 | 0 |
| Next: product tool-driven expandable card schema | 8 | 8 | 0 |
| Next: product vague UI usable | 8 | 8 | 0 |
| Next: quant tool-driven signal set JSON | 8 | 8 | 0 |
| Next: quant vague what to track | 7 | 7 | 0 |
| Next: sales tool-driven one-screen + objections | 7 | 7 | 0 |
| Next: sales vague shareable | 8 | 0 | 8 |
| Next: VC tool-driven comps + diligence | 7 | 7 | 0 |
| Next: VC vague wedge | 6 | 6 | 0 |
| offset:1 | 1 | 0 | 1 |
| offset:12 | 1 | 0 | 1 |
| offset:13 | 1 | 0 | 1 |
| offset:14 | 1 | 0 | 1 |
| offset:19 | 1 | 0 | 1 |
| offset:2 | 2 | 0 | 2 |
| offset:20 | 1 | 0 | 1 |
| offset:23 | 2 | 0 | 2 |
| offset:3 | 1 | 0 | 1 |
| offset:4 | 1 | 0 | 1 |
| offset:5 | 1 | 0 | 1 |
| offset:6 | 1 | 0 | 1 |
| offset:9 | 1 | 0 | 1 |
| Pack: exec cross-provider pricing comparison | 8 | 8 | 0 |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | 6 | 5 | 1 |
| Stress: ambiguous persona (wedge + outreach) | 7 | 6 | 1 |
| Stress: contradiction handling (Seed vs Series A) | 8 | 8 | 0 |

## Detailed Results

### claude-haiku-4.5

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 48.7 | - |
| Next: banker tool-driven outbound pack | ❌ FAIL | 47.7 | contact.email missing or mismatched |
| Next: VC vague wedge | ✅ PASS | 96.5 | - |
| Next: VC tool-driven comps + diligence | ✅ PASS | 54.0 | - |
| Next: CTO vague exposure | ❌ FAIL | 48.5 | Missing [DEBRIEF_V1_JSON] block |
| Next: CTO tool-driven CVE plan | ✅ PASS | 53.1 | - |
| Next: founder vague positioning | ✅ PASS | 53.1 | - |
| Next: founder tool-driven memo | ✅ PASS | 47.6 | - |
| Next: academic vague anchor | ❌ FAIL | 53.3 | persona mismatch: got JPM_STARTUP_BANKER expected ACADEMIC_RD |
| Next: academic tool-driven literature debrief | ❌ FAIL | 47.7 | Missing [DEBRIEF_V1_JSON] block |
| Next: exec vague standardize | ✅ PASS | 59.0 | - |
| Next: exec tool-driven cost model | ✅ PASS | 53.7 | - |
| Next: ecosystem vague incident | ❌ FAIL | 49.8 | Missing [DEBRIEF_V1_JSON] block |
| Next: ecosystem tool-driven second-order brief | ❌ FAIL | 47.6 | Missing [DEBRIEF_V1_JSON] block |
| Next: quant vague what to track | ✅ PASS | 53.6 | - |
| Next: quant tool-driven signal set JSON | ✅ PASS | 59.0 | - |
| Next: product vague UI usable | ✅ PASS | 47.5 | - |
| Next: product tool-driven expandable card schema | ✅ PASS | 50.9 | - |
| Next: sales vague shareable | ❌ FAIL | 53.2 | persona mismatch: got JPM_STARTUP_BANKER expected SALES_ENGINEER |
| Next: sales tool-driven one-screen + objections | ✅ PASS | 59.1 | - |
| Stress: ambiguous persona (wedge + outreach) | ❌ FAIL | 47.1 | Missing [DEBRIEF_V1_JSON] block |
| Stress: contradiction handling (Seed vs Series A) | ✅ PASS | 47.8 | - |
| Pack: exec cross-provider pricing comparison | ✅ PASS | 102.6 | - |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ❌ FAIL | 50.5 | Missing [DEBRIEF_V1_JSON] block |

### gpt-5-mini

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 55.2 | - |
| Next: banker tool-driven outbound pack | ❌ FAIL | 44.4 | contact.email missing or mismatched |
| Next: VC vague wedge | ✅ PASS | 66.8 | - |
| Next: VC tool-driven comps + diligence | ✅ PASS | 71.3 | - |
| Next: CTO vague exposure | ✅ PASS | 52.2 | - |
| Next: CTO tool-driven CVE plan | ✅ PASS | 60.1 | - |
| Next: founder vague positioning | ✅ PASS | 53.2 | - |
| Next: founder tool-driven memo | ✅ PASS | 78.1 | - |
| Next: academic vague anchor | ❌ FAIL | 50.9 | persona mismatch: got JPM_STARTUP_BANKER expected ACADEMIC_RD |
| Next: academic tool-driven literature debrief | ✅ PASS | 125.9 | - |
| Next: exec vague standardize | ✅ PASS | 65.6 | - |
| Next: exec tool-driven cost model | ✅ PASS | 92.1 | - |
| Next: ecosystem vague incident | ❌ FAIL | 57.6 | persona mismatch: got JPM_STARTUP_BANKER expected ECOSYSTEM_PARTNER |
| Next: ecosystem tool-driven second-order brief | ✅ PASS | 73.8 | - |
| Next: quant vague what to track | ✅ PASS | 51.4 | - |
| Next: quant tool-driven signal set JSON | ✅ PASS | 64.7 | - |
| Next: product vague UI usable | ✅ PASS | 49.8 | - |
| Next: product tool-driven expandable card schema | ✅ PASS | 54.7 | - |
| Next: sales vague shareable | ❌ FAIL | 52.1 | persona mismatch: got JPM_STARTUP_BANKER expected SALES_ENGINEER |
| Next: sales tool-driven one-screen + objections | ✅ PASS | 79.7 | - |
| Stress: ambiguous persona (wedge + outreach) | ✅ PASS | 62.7 | - |
| Stress: contradiction handling (Seed vs Series A) | ✅ PASS | 72.3 | - |
| Pack: exec cross-provider pricing comparison | ✅ PASS | 68.9 | - |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ✅ PASS | 56.7 | - |

### gemini-3-flash

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 13.3 | - |
| Next: banker tool-driven outbound pack | ❌ FAIL | 14.1 | contact.email missing or mismatched |
| Next: VC vague wedge | ✅ PASS | 13.3 | - |
| Next: VC tool-driven comps + diligence | ✅ PASS | 14.2 | - |
| Next: CTO vague exposure | ✅ PASS | 13.4 | - |
| Next: CTO tool-driven CVE plan | ✅ PASS | 13.4 | - |
| Next: founder vague positioning | ✅ PASS | 14.2 | - |
| Next: founder tool-driven memo | ✅ PASS | 26.5 | - |
| Next: academic vague anchor | ❌ FAIL | 13.7 | persona mismatch: got JPM_STARTUP_BANKER expected ACADEMIC_RD |
| Next: academic tool-driven literature debrief | ✅ PASS | 14.4 | - |
| Next: exec vague standardize | ✅ PASS | 15.1 | - |
| Next: exec tool-driven cost model | ✅ PASS | 13.8 | - |
| Next: ecosystem vague incident | ❌ FAIL | 14.4 | persona mismatch: got JPM_STARTUP_BANKER expected ECOSYSTEM_PARTNER |
| Next: ecosystem tool-driven second-order brief | ✅ PASS | 14.2 | - |
| Next: quant vague what to track | ✅ PASS | 13.8 | - |
| Next: quant tool-driven signal set JSON | ✅ PASS | 13.7 | - |
| Next: product vague UI usable | ✅ PASS | 14.4 | - |
| Next: product tool-driven expandable card schema | ✅ PASS | 13.7 | - |
| Next: sales vague shareable | ❌ FAIL | 14.8 | persona mismatch: got JPM_STARTUP_BANKER expected SALES_ENGINEER |
| Next: sales tool-driven one-screen + objections | ✅ PASS | 13.8 | - |
| Stress: ambiguous persona (wedge + outreach) | ✅ PASS | 15.2 | - |
| Stress: contradiction handling (Seed vs Series A) | ✅ PASS | 14.7 | - |
| Pack: exec cross-provider pricing comparison | ✅ PASS | 13.2 | - |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ✅ PASS | 14.4 | - |

### deepseek-r1

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 74.9 | - |
| Next: banker tool-driven outbound pack | ❌ FAIL | 167.8 | contact.email missing or mismatched |
| offset:2 | ❌ FAIL | 300.4 | - |
| offset:3 | ❌ FAIL | 300.4 | - |
| offset:4 | ❌ FAIL | 300.4 | - |
| offset:5 | ❌ FAIL | 300.4 | - |
| Next: founder vague positioning | ✅ PASS | 143.5 | - |
| Next: founder tool-driven memo | ✅ PASS | 127.8 | - |
| Next: academic vague anchor | ❌ FAIL | 95.2 | persona mismatch: got JPM_STARTUP_BANKER expected ACADEMIC_RD |
| Next: academic tool-driven literature debrief | ✅ PASS | 171.9 | - |
| Next: exec vague standardize | ✅ PASS | 22.2 | - |
| Next: exec tool-driven cost model | ✅ PASS | 34.6 | - |
| Next: ecosystem vague incident | ❌ FAIL | 111.0 | persona mismatch: got JPM_STARTUP_BANKER expected ECOSYSTEM_PARTNER |
| Next: ecosystem tool-driven second-order brief | ✅ PASS | 148.8 | - |
| Next: quant vague what to track | ✅ PASS | 101.4 | - |
| Next: quant tool-driven signal set JSON | ✅ PASS | 106.2 | - |
| Next: product vague UI usable | ✅ PASS | 138.1 | - |
| Next: product tool-driven expandable card schema | ✅ PASS | 155.0 | - |
| Next: sales vague shareable | ❌ FAIL | 51.9 | persona mismatch: got JPM_STARTUP_BANKER expected SALES_ENGINEER |
| offset:19 | ❌ FAIL | 300.4 | - |
| Stress: ambiguous persona (wedge + outreach) | ✅ PASS | 66.5 | - |
| Stress: contradiction handling (Seed vs Series A) | ✅ PASS | 90.2 | - |
| Pack: exec cross-provider pricing comparison | ✅ PASS | 35.4 | - |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ✅ PASS | 68.7 | - |

### deepseek-v3.2

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 73.3 | - |
| Next: banker tool-driven outbound pack | ❌ FAIL | 120.8 | contact.email missing or mismatched |
| Next: VC vague wedge | ✅ PASS | 55.5 | - |
| Next: VC tool-driven comps + diligence | ✅ PASS | 167.0 | - |
| Next: CTO vague exposure | ✅ PASS | 79.5 | - |
| Next: CTO tool-driven CVE plan | ✅ PASS | 157.6 | - |
| Next: founder vague positioning | ✅ PASS | 125.0 | - |
| Next: founder tool-driven memo | ✅ PASS | 68.2 | - |
| Next: academic vague anchor | ❌ FAIL | 50.3 | persona mismatch: got JPM_STARTUP_BANKER expected ACADEMIC_RD |
| Next: academic tool-driven literature debrief | ✅ PASS | 198.9 | - |
| Next: exec vague standardize | ✅ PASS | 104.3 | - |
| Next: exec tool-driven cost model | ✅ PASS | 111.8 | - |
| Next: ecosystem vague incident | ❌ FAIL | 16.6 | persona mismatch: got JPM_STARTUP_BANKER expected ECOSYSTEM_PARTNER |
| Next: ecosystem tool-driven second-order brief | ✅ PASS | 90.1 | - |
| Next: quant vague what to track | ✅ PASS | 54.2 | - |
| Next: quant tool-driven signal set JSON | ✅ PASS | 178.0 | - |
| Next: product vague UI usable | ✅ PASS | 51.8 | - |
| Next: product tool-driven expandable card schema | ✅ PASS | 144.4 | - |
| Next: sales vague shareable | ❌ FAIL | 86.0 | persona mismatch: got JPM_STARTUP_BANKER expected SALES_ENGINEER |
| Next: sales tool-driven one-screen + objections | ✅ PASS | 42.4 | - |
| Stress: ambiguous persona (wedge + outreach) | ✅ PASS | 68.9 | - |
| Stress: contradiction handling (Seed vs Series A) | ✅ PASS | 91.4 | - |
| Pack: exec cross-provider pricing comparison | ✅ PASS | 57.8 | - |
| offset:23 | ❌ FAIL | 300.5 | - |

### qwen3-235b

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 135.1 | - |
| offset:1 | ❌ FAIL | 300.5 | - |
| Next: VC vague wedge | ✅ PASS | 141.0 | - |
| Next: VC tool-driven comps + diligence | ✅ PASS | 51.3 | - |
| Next: CTO vague exposure | ✅ PASS | 52.6 | - |
| Next: CTO tool-driven CVE plan | ✅ PASS | 126.6 | - |
| Next: founder vague positioning | ✅ PASS | 88.3 | - |
| Next: founder tool-driven memo | ✅ PASS | 159.1 | - |
| Next: academic vague anchor | ❌ FAIL | 97.4 | persona mismatch: got JPM_STARTUP_BANKER expected ACADEMIC_RD |
| Next: academic tool-driven literature debrief | ✅ PASS | 118.6 | - |
| Next: exec vague standardize | ✅ PASS | 32.1 | - |
| Next: exec tool-driven cost model | ✅ PASS | 148.6 | - |
| Next: ecosystem vague incident | ❌ FAIL | 46.7 | persona mismatch: got JPM_STARTUP_BANKER expected ECOSYSTEM_PARTNER |
| Next: ecosystem tool-driven second-order brief | ✅ PASS | 161.8 | - |
| Next: quant vague what to track | ✅ PASS | 131.0 | - |
| Next: quant tool-driven signal set JSON | ✅ PASS | 124.2 | - |
| Next: product vague UI usable | ✅ PASS | 145.7 | - |
| Next: product tool-driven expandable card schema | ✅ PASS | 83.5 | - |
| Next: sales vague shareable | ❌ FAIL | 124.7 | persona mismatch: got JPM_STARTUP_BANKER expected SALES_ENGINEER |
| Next: sales tool-driven one-screen + objections | ✅ PASS | 29.7 | - |
| Stress: ambiguous persona (wedge + outreach) | ✅ PASS | 159.4 | - |
| Stress: contradiction handling (Seed vs Series A) | ✅ PASS | 119.9 | - |
| Pack: exec cross-provider pricing comparison | ✅ PASS | 46.5 | - |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ✅ PASS | 132.4 | - |

### minimax-m2.1

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 49.3 | - |
| Next: banker tool-driven outbound pack | ❌ FAIL | 48.6 | contact.email missing or mismatched |
| offset:2 | ❌ FAIL | 300.5 | - |
| Next: VC tool-driven comps + diligence | ✅ PASS | 75.6 | - |
| Next: CTO vague exposure | ✅ PASS | 23.7 | - |
| Next: CTO tool-driven CVE plan | ✅ PASS | 108.7 | - |
| offset:6 | ❌ FAIL | 300.5 | - |
| Next: founder tool-driven memo | ✅ PASS | 158.9 | - |
| Next: academic vague anchor | ❌ FAIL | 108.9 | persona mismatch: got JPM_STARTUP_BANKER expected ACADEMIC_RD |
| Next: academic tool-driven literature debrief | ✅ PASS | 137.2 | - |
| Next: exec vague standardize | ✅ PASS | 63.5 | - |
| Next: exec tool-driven cost model | ✅ PASS | 128.1 | - |
| Next: ecosystem vague incident | ❌ FAIL | 34.6 | persona mismatch: got JPM_STARTUP_BANKER expected ECOSYSTEM_PARTNER |
| Next: ecosystem tool-driven second-order brief | ✅ PASS | 94.0 | - |
| offset:14 | ❌ FAIL | 300.6 | - |
| Next: quant tool-driven signal set JSON | ✅ PASS | 71.2 | - |
| Next: product vague UI usable | ✅ PASS | 33.3 | - |
| Next: product tool-driven expandable card schema | ✅ PASS | 77.3 | - |
| Next: sales vague shareable | ❌ FAIL | 82.7 | persona mismatch: got JPM_STARTUP_BANKER expected SALES_ENGINEER |
| Next: sales tool-driven one-screen + objections | ✅ PASS | 36.4 | - |
| Stress: ambiguous persona (wedge + outreach) | ✅ PASS | 22.9 | - |
| Stress: contradiction handling (Seed vs Series A) | ✅ PASS | 27.7 | - |
| Pack: exec cross-provider pricing comparison | ✅ PASS | 93.6 | - |
| offset:23 | ❌ FAIL | 300.6 | - |

### mimo-v2-flash-free

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 40.8 | - |
| Next: banker tool-driven outbound pack | ❌ FAIL | 40.8 | contact.email missing or mismatched |
| Next: VC vague wedge | ✅ PASS | 21.5 | - |
| Next: VC tool-driven comps + diligence | ✅ PASS | 101.3 | - |
| Next: CTO vague exposure | ✅ PASS | 18.8 | - |
| Next: CTO tool-driven CVE plan | ✅ PASS | 54.3 | - |
| Next: founder vague positioning | ✅ PASS | 30.3 | - |
| Next: founder tool-driven memo | ✅ PASS | 84.6 | - |
| Next: academic vague anchor | ❌ FAIL | 20.4 | persona mismatch: got JPM_STARTUP_BANKER expected ACADEMIC_RD |
| offset:9 | ❌ FAIL | 300.6 | - |
| Next: exec vague standardize | ✅ PASS | 42.8 | - |
| Next: exec tool-driven cost model | ✅ PASS | 60.9 | - |
| offset:12 | ❌ FAIL | 300.5 | - |
| offset:13 | ❌ FAIL | 300.6 | - |
| Next: quant vague what to track | ✅ PASS | 20.0 | - |
| Next: quant tool-driven signal set JSON | ✅ PASS | 28.3 | - |
| Next: product vague UI usable | ✅ PASS | 26.6 | - |
| Next: product tool-driven expandable card schema | ✅ PASS | 33.6 | - |
| Next: sales vague shareable | ❌ FAIL | 23.2 | persona mismatch: got JPM_STARTUP_BANKER expected SALES_ENGINEER |
| Next: sales tool-driven one-screen + objections | ✅ PASS | 27.3 | - |
| offset:20 | ❌ FAIL | 300.6 | - |
| Stress: contradiction handling (Seed vs Series A) | ✅ PASS | 37.0 | - |
| Pack: exec cross-provider pricing comparison | ✅ PASS | 84.2 | - |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ✅ PASS | 116.5 | - |

## Disclosure Metrics (P0 Instrumentation)

### Disclosure Level by Model

| Model | Full | Partial | None |
|-------|------|---------|------|
| claude-haiku-4.5 | 0 | 18 | 6 |
| gpt-5-mini | 0 | 24 | 0 |
| gemini-3-flash | 0 | 24 | 0 |
| deepseek-r1 | 1 | 18 | 0 |
| deepseek-v3.2 | 0 | 23 | 0 |
| qwen3-235b | 1 | 22 | 0 |
| minimax-m2.1 | 0 | 20 | 0 |
| mimo-v2-flash-free | 0 | 20 | 0 |

### Disclosure Warnings (Non-Scored)

> **Note:** These warnings are informational and do not affect pass/fail.
> They track progressive disclosure usage for Week 1-2 observability.

⚠️ [deepseek-r1/next_ecosystem_tool_second_order_brief] Excessive direct tool calls: 93 (>10)
⚠️ [qwen3-235b/next_founder_tool_salesforce_memo] Excessive direct tool calls: 12 (>10)
