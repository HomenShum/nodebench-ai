# Fully Parallel Evaluation Results

Generated: 2026-01-11T06:39:42.798Z
Total Time: 300.5s
Suite: pack
Models: 8
Scenarios: 24 of 24 (limit=0)
Total evaluations: 192

## Summary by Model

| Model | Total | Passed | Failed | Avg Time (s) |
|-------|-------|--------|--------|--------------|
| claude-haiku-4.5 | 24 | 17 | 7 | 67.5 |
| gpt-5-mini | 24 | 23 | 0 | 84.5 |
| gemini-3-flash | 24 | 23 | 1 | 14.2 |
| deepseek-r1 | 24 | 22 | 1 | 94.2 |
| deepseek-v3.2 | 24 | 23 | 0 | 97.4 |
| qwen3-235b | 24 | 24 | 0 | 101.2 |
| minimax-m2.1 | 24 | 24 | 0 | 71.3 |
| mimo-v2-flash-free | 24 | 24 | 0 | 52.2 |

## Summary by Scenario

| Scenario | Total | Passed | Failed |
|----------|-------|--------|--------|
| Next: academic tool-driven literature debrief | 8 | 7 | 1 |
| Next: academic vague anchor | 8 | 8 | 0 |
| Next: banker tool-driven outbound pack | 8 | 8 | 0 |
| Next: banker vague (fast debrief) | 8 | 8 | 0 |
| Next: CTO tool-driven CVE plan | 8 | 8 | 0 |
| Next: CTO vague exposure | 8 | 8 | 0 |
| Next: ecosystem tool-driven second-order brief | 8 | 7 | 1 |
| Next: ecosystem vague incident | 7 | 7 | 0 |
| Next: exec tool-driven cost model | 8 | 8 | 0 |
| Next: exec vague standardize | 8 | 7 | 1 |
| Next: founder tool-driven memo | 8 | 8 | 0 |
| Next: founder vague positioning | 7 | 6 | 1 |
| Next: product tool-driven expandable card schema | 8 | 8 | 0 |
| Next: product vague UI usable | 8 | 8 | 0 |
| Next: quant tool-driven signal set JSON | 8 | 7 | 1 |
| Next: quant vague what to track | 8 | 8 | 0 |
| Next: sales tool-driven one-screen + objections | 8 | 7 | 1 |
| Next: sales vague shareable | 8 | 8 | 0 |
| Next: VC tool-driven comps + diligence | 7 | 7 | 0 |
| Next: VC vague wedge | 8 | 7 | 1 |
| offset:12 | 1 | 0 | 1 |
| offset:3 | 1 | 0 | 1 |
| offset:6 | 1 | 0 | 1 |
| Pack: exec cross-provider pricing comparison | 8 | 7 | 1 |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | 8 | 7 | 1 |
| Stress: ambiguous persona (wedge + outreach) | 8 | 8 | 0 |
| Stress: contradiction handling (Seed vs Series A) | 8 | 8 | 0 |

## Detailed Results

### claude-haiku-4.5

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 19.8 | - |
| Next: banker tool-driven outbound pack | ✅ PASS | 112.8 | - |
| Next: VC vague wedge | ❌ FAIL | 58.6 | Missing [DEBRIEF_V1_JSON] block |
| Next: VC tool-driven comps + diligence | ✅ PASS | 65.2 | - |
| Next: CTO vague exposure | ✅ PASS | 71.3 | - |
| Next: CTO tool-driven CVE plan | ✅ PASS | 70.6 | - |
| Next: founder vague positioning | ❌ FAIL | 58.6 | Missing [DEBRIEF_V1_JSON] block |
| Next: founder tool-driven memo | ✅ PASS | 70.6 | - |
| Next: academic vague anchor | ✅ PASS | 68.2 | - |
| Next: academic tool-driven literature debrief | ✅ PASS | 70.6 | - |
| Next: exec vague standardize | ❌ FAIL | 61.9 | Missing [DEBRIEF_V1_JSON] block |
| Next: exec tool-driven cost model | ✅ PASS | 71.0 | - |
| Next: ecosystem vague incident | ✅ PASS | 70.6 | - |
| Next: ecosystem tool-driven second-order brief | ❌ FAIL | 59.8 | Missing [DEBRIEF_V1_JSON] block |
| Next: quant vague what to track | ✅ PASS | 70.5 | - |
| Next: quant tool-driven signal set JSON | ❌ FAIL | 60.8 | Missing [DEBRIEF_V1_JSON] block |
| Next: product vague UI usable | ✅ PASS | 70.8 | - |
| Next: product tool-driven expandable card schema | ✅ PASS | 70.9 | - |
| Next: sales vague shareable | ✅ PASS | 70.9 | - |
| Next: sales tool-driven one-screen + objections | ✅ PASS | 73.3 | - |
| Stress: ambiguous persona (wedge + outreach) | ✅ PASS | 70.8 | - |
| Stress: contradiction handling (Seed vs Series A) | ✅ PASS | 70.7 | - |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 61.7 | Missing [DEBRIEF_V1_JSON] block |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ❌ FAIL | 70.6 | maxToolCalls exceeded: got 5 expected <= 3 |

### gpt-5-mini

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 66.2 | - |
| Next: banker tool-driven outbound pack | ✅ PASS | 66.1 | - |
| Next: VC vague wedge | ✅ PASS | 62.5 | - |
| Next: VC tool-driven comps + diligence | ✅ PASS | 79.2 | - |
| Next: CTO vague exposure | ✅ PASS | 61.2 | - |
| Next: CTO tool-driven CVE plan | ✅ PASS | 90.6 | - |
| offset:6 | ❌ FAIL | 300.3 | - |
| Next: founder tool-driven memo | ✅ PASS | 85.5 | - |
| Next: academic vague anchor | ✅ PASS | 67.9 | - |
| Next: academic tool-driven literature debrief | ✅ PASS | 90.5 | - |
| Next: exec vague standardize | ✅ PASS | 57.8 | - |
| Next: exec tool-driven cost model | ✅ PASS | 96.4 | - |
| Next: ecosystem vague incident | ✅ PASS | 56.4 | - |
| Next: ecosystem tool-driven second-order brief | ✅ PASS | 81.5 | - |
| Next: quant vague what to track | ✅ PASS | 57.4 | - |
| Next: quant tool-driven signal set JSON | ✅ PASS | 72.2 | - |
| Next: product vague UI usable | ✅ PASS | 58.1 | - |
| Next: product tool-driven expandable card schema | ✅ PASS | 74.4 | - |
| Next: sales vague shareable | ✅ PASS | 61.0 | - |
| Next: sales tool-driven one-screen + objections | ✅ PASS | 64.7 | - |
| Stress: ambiguous persona (wedge + outreach) | ✅ PASS | 50.3 | - |
| Stress: contradiction handling (Seed vs Series A) | ✅ PASS | 72.1 | - |
| Pack: exec cross-provider pricing comparison | ✅ PASS | 182.9 | - |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ✅ PASS | 73.2 | - |

### gemini-3-flash

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 14.2 | - |
| Next: banker tool-driven outbound pack | ✅ PASS | 13.9 | - |
| Next: VC vague wedge | ✅ PASS | 15.3 | - |
| Next: VC tool-driven comps + diligence | ✅ PASS | 12.8 | - |
| Next: CTO vague exposure | ✅ PASS | 19.6 | - |
| Next: CTO tool-driven CVE plan | ✅ PASS | 13.0 | - |
| Next: founder vague positioning | ✅ PASS | 13.2 | - |
| Next: founder tool-driven memo | ✅ PASS | 13.2 | - |
| Next: academic vague anchor | ✅ PASS | 13.0 | - |
| Next: academic tool-driven literature debrief | ❌ FAIL | 14.4 | Missing [DEBRIEF_V1_JSON] block |
| Next: exec vague standardize | ✅ PASS | 13.8 | - |
| Next: exec tool-driven cost model | ✅ PASS | 14.5 | - |
| Next: ecosystem vague incident | ✅ PASS | 13.2 | - |
| Next: ecosystem tool-driven second-order brief | ✅ PASS | 12.8 | - |
| Next: quant vague what to track | ✅ PASS | 13.0 | - |
| Next: quant tool-driven signal set JSON | ✅ PASS | 15.5 | - |
| Next: product vague UI usable | ✅ PASS | 13.9 | - |
| Next: product tool-driven expandable card schema | ✅ PASS | 13.9 | - |
| Next: sales vague shareable | ✅ PASS | 13.0 | - |
| Next: sales tool-driven one-screen + objections | ✅ PASS | 15.0 | - |
| Stress: ambiguous persona (wedge + outreach) | ✅ PASS | 14.3 | - |
| Stress: contradiction handling (Seed vs Series A) | ✅ PASS | 14.2 | - |
| Pack: exec cross-provider pricing comparison | ✅ PASS | 15.7 | - |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ✅ PASS | 14.4 | - |

### deepseek-r1

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 125.8 | - |
| Next: banker tool-driven outbound pack | ✅ PASS | 68.7 | - |
| Next: VC vague wedge | ✅ PASS | 10.3 | - |
| Next: VC tool-driven comps + diligence | ✅ PASS | 213.5 | - |
| Next: CTO vague exposure | ✅ PASS | 109.5 | - |
| Next: CTO tool-driven CVE plan | ✅ PASS | 149.9 | - |
| Next: founder vague positioning | ✅ PASS | 27.8 | - |
| Next: founder tool-driven memo | ✅ PASS | 52.9 | - |
| Next: academic vague anchor | ✅ PASS | 9.9 | - |
| Next: academic tool-driven literature debrief | ✅ PASS | 111.4 | - |
| Next: exec vague standardize | ✅ PASS | 36.4 | - |
| Next: exec tool-driven cost model | ✅ PASS | 60.7 | - |
| offset:12 | ❌ FAIL | 300.4 | - |
| Next: ecosystem tool-driven second-order brief | ✅ PASS | 80.6 | - |
| Next: quant vague what to track | ✅ PASS | 68.4 | - |
| Next: quant tool-driven signal set JSON | ✅ PASS | 101.3 | - |
| Next: product vague UI usable | ✅ PASS | 11.9 | - |
| Next: product tool-driven expandable card schema | ✅ PASS | 139.7 | - |
| Next: sales vague shareable | ✅ PASS | 64.3 | - |
| Next: sales tool-driven one-screen + objections | ❌ FAIL | 52.1 | Invalid JSON: Expected ',' or '}' after property value in JSON at position 1288 |
| Stress: ambiguous persona (wedge + outreach) | ✅ PASS | 62.4 | - |
| Stress: contradiction handling (Seed vs Series A) | ✅ PASS | 56.6 | - |
| Pack: exec cross-provider pricing comparison | ✅ PASS | 260.2 | - |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ✅ PASS | 86.8 | - |

### deepseek-v3.2

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 79.1 | - |
| Next: banker tool-driven outbound pack | ✅ PASS | 80.4 | - |
| Next: VC vague wedge | ✅ PASS | 84.0 | - |
| offset:3 | ❌ FAIL | 300.5 | - |
| Next: CTO vague exposure | ✅ PASS | 90.2 | - |
| Next: CTO tool-driven CVE plan | ✅ PASS | 133.1 | - |
| Next: founder vague positioning | ✅ PASS | 15.8 | - |
| Next: founder tool-driven memo | ✅ PASS | 54.5 | - |
| Next: academic vague anchor | ✅ PASS | 71.5 | - |
| Next: academic tool-driven literature debrief | ✅ PASS | 15.8 | - |
| Next: exec vague standardize | ✅ PASS | 61.5 | - |
| Next: exec tool-driven cost model | ✅ PASS | 96.9 | - |
| Next: ecosystem vague incident | ✅ PASS | 76.9 | - |
| Next: ecosystem tool-driven second-order brief | ✅ PASS | 15.8 | - |
| Next: quant vague what to track | ✅ PASS | 102.3 | - |
| Next: quant tool-driven signal set JSON | ✅ PASS | 94.0 | - |
| Next: product vague UI usable | ✅ PASS | 92.8 | - |
| Next: product tool-driven expandable card schema | ✅ PASS | 174.8 | - |
| Next: sales vague shareable | ✅ PASS | 90.4 | - |
| Next: sales tool-driven one-screen + objections | ✅ PASS | 74.3 | - |
| Stress: ambiguous persona (wedge + outreach) | ✅ PASS | 93.6 | - |
| Stress: contradiction handling (Seed vs Series A) | ✅ PASS | 85.1 | - |
| Pack: exec cross-provider pricing comparison | ✅ PASS | 252.9 | - |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ✅ PASS | 102.6 | - |

### qwen3-235b

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 55.6 | - |
| Next: banker tool-driven outbound pack | ✅ PASS | 101.2 | - |
| Next: VC vague wedge | ✅ PASS | 35.7 | - |
| Next: VC tool-driven comps + diligence | ✅ PASS | 226.9 | - |
| Next: CTO vague exposure | ✅ PASS | 121.9 | - |
| Next: CTO tool-driven CVE plan | ✅ PASS | 125.9 | - |
| Next: founder vague positioning | ✅ PASS | 111.0 | - |
| Next: founder tool-driven memo | ✅ PASS | 32.0 | - |
| Next: academic vague anchor | ✅ PASS | 123.2 | - |
| Next: academic tool-driven literature debrief | ✅ PASS | 57.8 | - |
| Next: exec vague standardize | ✅ PASS | 109.3 | - |
| Next: exec tool-driven cost model | ✅ PASS | 135.0 | - |
| Next: ecosystem vague incident | ✅ PASS | 56.1 | - |
| Next: ecosystem tool-driven second-order brief | ✅ PASS | 69.8 | - |
| Next: quant vague what to track | ✅ PASS | 114.4 | - |
| Next: quant tool-driven signal set JSON | ✅ PASS | 127.8 | - |
| Next: product vague UI usable | ✅ PASS | 31.0 | - |
| Next: product tool-driven expandable card schema | ✅ PASS | 134.7 | - |
| Next: sales vague shareable | ✅ PASS | 121.6 | - |
| Next: sales tool-driven one-screen + objections | ✅ PASS | 128.6 | - |
| Stress: ambiguous persona (wedge + outreach) | ✅ PASS | 128.6 | - |
| Stress: contradiction handling (Seed vs Series A) | ✅ PASS | 139.2 | - |
| Pack: exec cross-provider pricing comparison | ✅ PASS | 31.0 | - |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ✅ PASS | 110.6 | - |

### minimax-m2.1

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 43.0 | - |
| Next: banker tool-driven outbound pack | ✅ PASS | 32.1 | - |
| Next: VC vague wedge | ✅ PASS | 38.2 | - |
| Next: VC tool-driven comps + diligence | ✅ PASS | 88.9 | - |
| Next: CTO vague exposure | ✅ PASS | 30.4 | - |
| Next: CTO tool-driven CVE plan | ✅ PASS | 166.6 | - |
| Next: founder vague positioning | ✅ PASS | 131.6 | - |
| Next: founder tool-driven memo | ✅ PASS | 132.9 | - |
| Next: academic vague anchor | ✅ PASS | 39.1 | - |
| Next: academic tool-driven literature debrief | ✅ PASS | 152.7 | - |
| Next: exec vague standardize | ✅ PASS | 54.4 | - |
| Next: exec tool-driven cost model | ✅ PASS | 129.2 | - |
| Next: ecosystem vague incident | ✅ PASS | 24.6 | - |
| Next: ecosystem tool-driven second-order brief | ✅ PASS | 52.5 | - |
| Next: quant vague what to track | ✅ PASS | 40.4 | - |
| Next: quant tool-driven signal set JSON | ✅ PASS | 46.6 | - |
| Next: product vague UI usable | ✅ PASS | 34.5 | - |
| Next: product tool-driven expandable card schema | ✅ PASS | 96.3 | - |
| Next: sales vague shareable | ✅ PASS | 38.8 | - |
| Next: sales tool-driven one-screen + objections | ✅ PASS | 37.6 | - |
| Stress: ambiguous persona (wedge + outreach) | ✅ PASS | 62.8 | - |
| Stress: contradiction handling (Seed vs Series A) | ✅ PASS | 71.4 | - |
| Pack: exec cross-provider pricing comparison | ✅ PASS | 71.6 | - |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ✅ PASS | 96.2 | - |

### mimo-v2-flash-free

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 27.1 | - |
| Next: banker tool-driven outbound pack | ✅ PASS | 62.1 | - |
| Next: VC vague wedge | ✅ PASS | 31.5 | - |
| Next: VC tool-driven comps + diligence | ✅ PASS | 68.6 | - |
| Next: CTO vague exposure | ✅ PASS | 27.3 | - |
| Next: CTO tool-driven CVE plan | ✅ PASS | 177.6 | - |
| Next: founder vague positioning | ✅ PASS | 38.4 | - |
| Next: founder tool-driven memo | ✅ PASS | 85.5 | - |
| Next: academic vague anchor | ✅ PASS | 101.7 | - |
| Next: academic tool-driven literature debrief | ✅ PASS | 32.0 | - |
| Next: exec vague standardize | ✅ PASS | 45.2 | - |
| Next: exec tool-driven cost model | ✅ PASS | 52.4 | - |
| Next: ecosystem vague incident | ✅ PASS | 41.0 | - |
| Next: ecosystem tool-driven second-order brief | ✅ PASS | 102.2 | - |
| Next: quant vague what to track | ✅ PASS | 25.8 | - |
| Next: quant tool-driven signal set JSON | ✅ PASS | 21.7 | - |
| Next: product vague UI usable | ✅ PASS | 21.5 | - |
| Next: product tool-driven expandable card schema | ✅ PASS | 30.5 | - |
| Next: sales vague shareable | ✅ PASS | 21.9 | - |
| Next: sales tool-driven one-screen + objections | ✅ PASS | 32.0 | - |
| Stress: ambiguous persona (wedge + outreach) | ✅ PASS | 33.3 | - |
| Stress: contradiction handling (Seed vs Series A) | ✅ PASS | 30.9 | - |
| Pack: exec cross-provider pricing comparison | ✅ PASS | 112.3 | - |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ✅ PASS | 29.4 | - |

## Disclosure Metrics (P0 Instrumentation)

### Disclosure Level by Model

| Model | Full | Partial | None |
|-------|------|---------|------|
| claude-haiku-4.5 | 0 | 18 | 6 |
| gpt-5-mini | 0 | 23 | 0 |
| gemini-3-flash | 0 | 23 | 1 |
| deepseek-r1 | 0 | 23 | 0 |
| deepseek-v3.2 | 0 | 23 | 0 |
| qwen3-235b | 0 | 24 | 0 |
| minimax-m2.1 | 0 | 24 | 0 |
| mimo-v2-flash-free | 0 | 24 | 0 |

### Disclosure Warnings (Non-Scored)

> **Note:** These warnings are informational and do not affect pass/fail.
> They track progressive disclosure usage for Week 1-2 observability.

⚠️ [mimo-v2-flash-free/next_cto_tool_cve_plan] Excessive direct tool calls: 11 (>10)
