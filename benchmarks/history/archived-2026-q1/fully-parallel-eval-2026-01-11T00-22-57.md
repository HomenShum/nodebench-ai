# Fully Parallel Evaluation Results

Generated: 2026-01-11T00:22:57.834Z
Total Time: 127.2s
Suite: pack
Models: 8
Scenarios: 24 of 24 (limit=0)
Total evaluations: 192

## Summary by Model

| Model | Total | Passed | Failed | Avg Time (s) |
|-------|-------|--------|--------|--------------|
| claude-haiku-4.5 | 24 | 2 | 22 | 56.8 |
| gpt-5-mini | 24 | 21 | 3 | 74.1 |
| gemini-3-flash | 24 | 8 | 16 | 14.7 |
| deepseek-r1 | 24 | 1 | 23 | 16.2 |
| deepseek-v3.2 | 24 | 0 | 24 | 10.6 |
| qwen3-235b | 24 | 0 | 24 | 10.6 |
| minimax-m2.1 | 24 | 0 | 24 | 10.6 |
| mimo-v2-flash-free | 24 | 2 | 22 | 14.0 |

## Summary by Scenario

| Scenario | Total | Passed | Failed |
|----------|-------|--------|--------|
| Next: academic tool-driven literature debrief | 3 | 3 | 0 |
| Next: academic vague anchor | 3 | 2 | 1 |
| Next: banker tool-driven outbound pack | 2 | 1 | 1 |
| Next: banker vague (fast debrief) | 3 | 3 | 0 |
| Next: CTO tool-driven CVE plan | 3 | 2 | 1 |
| Next: CTO vague exposure | 4 | 2 | 2 |
| Next: ecosystem tool-driven second-order brief | 2 | 1 | 1 |
| Next: ecosystem vague incident | 2 | 1 | 1 |
| Next: exec tool-driven cost model | 2 | 1 | 1 |
| Next: exec vague standardize | 2 | 0 | 2 |
| Next: founder tool-driven memo | 2 | 0 | 2 |
| Next: founder vague positioning | 3 | 2 | 1 |
| Next: product tool-driven expandable card schema | 2 | 1 | 1 |
| Next: product vague UI usable | 2 | 1 | 1 |
| Next: quant tool-driven signal set JSON | 3 | 2 | 1 |
| Next: quant vague what to track | 2 | 1 | 1 |
| Next: sales tool-driven one-screen + objections | 2 | 1 | 1 |
| Next: sales vague shareable | 2 | 1 | 1 |
| Next: VC tool-driven comps + diligence | 2 | 1 | 1 |
| Next: VC vague wedge | 4 | 3 | 1 |
| offset:0 | 5 | 0 | 5 |
| offset:1 | 6 | 0 | 6 |
| offset:10 | 6 | 0 | 6 |
| offset:11 | 6 | 0 | 6 |
| offset:12 | 6 | 0 | 6 |
| offset:13 | 6 | 0 | 6 |
| offset:14 | 6 | 0 | 6 |
| offset:15 | 5 | 0 | 5 |
| offset:16 | 6 | 0 | 6 |
| offset:17 | 6 | 0 | 6 |
| offset:18 | 6 | 0 | 6 |
| offset:19 | 6 | 0 | 6 |
| offset:2 | 4 | 0 | 4 |
| offset:20 | 5 | 0 | 5 |
| offset:21 | 5 | 0 | 5 |
| offset:22 | 6 | 0 | 6 |
| offset:23 | 6 | 0 | 6 |
| offset:3 | 6 | 0 | 6 |
| offset:4 | 4 | 0 | 4 |
| offset:5 | 5 | 0 | 5 |
| offset:6 | 5 | 0 | 5 |
| offset:7 | 6 | 0 | 6 |
| offset:8 | 5 | 0 | 5 |
| offset:9 | 5 | 0 | 5 |
| Pack: exec cross-provider pricing comparison | 2 | 0 | 2 |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | 2 | 1 | 1 |
| Stress: ambiguous persona (wedge + outreach) | 3 | 2 | 1 |
| Stress: contradiction handling (Seed vs Series A) | 3 | 2 | 1 |

## Detailed Results

### claude-haiku-4.5

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 16.0 | - |
| Next: banker tool-driven outbound pack | ❌ FAIL | 70.1 | Missing [DEBRIEF_V1_JSON] block |
| Next: VC vague wedge | ❌ FAIL | 65.3 | Missing [DEBRIEF_V1_JSON] block |
| Next: VC tool-driven comps + diligence | ❌ FAIL | 65.9 | Missing [DEBRIEF_V1_JSON] block |
| Next: CTO vague exposure | ❌ FAIL | 11.7 | Missing [DEBRIEF_V1_JSON] block |
| Next: CTO tool-driven CVE plan | ❌ FAIL | 65.3 | Missing [DEBRIEF_V1_JSON] block |
| Next: founder vague positioning | ❌ FAIL | 64.0 | Missing [DEBRIEF_V1_JSON] block |
| Next: founder tool-driven memo | ❌ FAIL | 65.3 | Missing [DEBRIEF_V1_JSON] block |
| Next: academic vague anchor | ❌ FAIL | 66.6 | Missing [DEBRIEF_V1_JSON] block |
| Next: academic tool-driven literature debrief | ✅ PASS | 73.8 | - |
| Next: exec vague standardize | ❌ FAIL | 65.9 | Missing [DEBRIEF_V1_JSON] block |
| Next: exec tool-driven cost model | ❌ FAIL | 70.1 | Missing [DEBRIEF_V1_JSON] block |
| Next: ecosystem vague incident | ❌ FAIL | 70.3 | Missing [DEBRIEF_V1_JSON] block |
| Next: ecosystem tool-driven second-order brief | ❌ FAIL | 69.9 | Missing [DEBRIEF_V1_JSON] block |
| Next: quant vague what to track | ❌ FAIL | 12.6 | Missing [DEBRIEF_V1_JSON] block |
| Next: quant tool-driven signal set JSON | ❌ FAIL | 65.1 | Missing [DEBRIEF_V1_JSON] block |
| Next: product vague UI usable | ❌ FAIL | 11.6 | Missing [DEBRIEF_V1_JSON] block |
| Next: product tool-driven expandable card schema | ❌ FAIL | 68.5 | Missing [DEBRIEF_V1_JSON] block |
| Next: sales vague shareable | ❌ FAIL | 66.2 | Missing [DEBRIEF_V1_JSON] block |
| Next: sales tool-driven one-screen + objections | ❌ FAIL | 66.1 | Missing [DEBRIEF_V1_JSON] block |
| Stress: ambiguous persona (wedge + outreach) | ❌ FAIL | 65.7 | Missing [DEBRIEF_V1_JSON] block |
| Stress: contradiction handling (Seed vs Series A) | ❌ FAIL | 12.1 | Missing [DEBRIEF_V1_JSON] block |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 66.8 | Missing [DEBRIEF_V1_JSON] block |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ❌ FAIL | 88.3 | persona.inferred must be a known persona |

### gpt-5-mini

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 43.7 | - |
| Next: banker tool-driven outbound pack | ✅ PASS | 72.1 | - |
| Next: VC vague wedge | ✅ PASS | 54.1 | - |
| Next: VC tool-driven comps + diligence | ✅ PASS | 74.9 | - |
| Next: CTO vague exposure | ✅ PASS | 59.7 | - |
| Next: CTO tool-driven CVE plan | ✅ PASS | 86.1 | - |
| Next: founder vague positioning | ✅ PASS | 96.5 | - |
| Next: founder tool-driven memo | ❌ FAIL | 127.2 | missing ground truth citation anchor in grounding[] |
| Next: academic vague anchor | ✅ PASS | 55.4 | - |
| Next: academic tool-driven literature debrief | ✅ PASS | 84.8 | - |
| Next: exec vague standardize | ❌ FAIL | 64.2 | persona mismatch: got CTO_TECH_LEAD expected ENTERPRISE_EXEC |
| Next: exec tool-driven cost model | ✅ PASS | 96.5 | - |
| Next: ecosystem vague incident | ✅ PASS | 56.9 | - |
| Next: ecosystem tool-driven second-order brief | ✅ PASS | 86.4 | - |
| Next: quant vague what to track | ✅ PASS | 57.5 | - |
| Next: quant tool-driven signal set JSON | ✅ PASS | 72.1 | - |
| Next: product vague UI usable | ✅ PASS | 73.9 | - |
| Next: product tool-driven expandable card schema | ✅ PASS | 79.3 | - |
| Next: sales vague shareable | ✅ PASS | 67.1 | - |
| Next: sales tool-driven one-screen + objections | ✅ PASS | 50.4 | - |
| Stress: ambiguous persona (wedge + outreach) | ✅ PASS | 50.8 | - |
| Stress: contradiction handling (Seed vs Series A) | ✅ PASS | 61.4 | - |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 127.2 | missing ground truth citation anchor in grounding[] |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ✅ PASS | 79.5 | - |

### gemini-3-flash

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 17.9 | - |
| offset:1 | ❌ ERROR | 10.7 | fetch failed |
| Next: VC vague wedge | ✅ PASS | 14.6 | - |
| offset:3 | ❌ ERROR | 10.7 | fetch failed |
| Next: CTO vague exposure | ✅ PASS | 14.8 | - |
| Next: CTO tool-driven CVE plan | ✅ PASS | 19.6 | - |
| Next: founder vague positioning | ✅ PASS | 23.9 | - |
| offset:7 | ❌ ERROR | 10.7 | fetch failed |
| Next: academic vague anchor | ✅ PASS | 31.4 | - |
| Next: academic tool-driven literature debrief | ✅ PASS | 35.8 | - |
| offset:10 | ❌ ERROR | 10.7 | fetch failed |
| offset:11 | ❌ ERROR | 10.7 | fetch failed |
| offset:12 | ❌ ERROR | 10.7 | fetch failed |
| offset:13 | ❌ ERROR | 10.7 | fetch failed |
| offset:14 | ❌ ERROR | 10.7 | fetch failed |
| Next: quant tool-driven signal set JSON | ✅ PASS | 24.6 | - |
| offset:16 | ❌ ERROR | 10.7 | fetch failed |
| offset:17 | ❌ ERROR | 10.7 | fetch failed |
| offset:18 | ❌ ERROR | 10.7 | fetch failed |
| offset:19 | ❌ ERROR | 10.7 | fetch failed |
| offset:20 | ❌ ERROR | 10.7 | fetch failed |
| offset:21 | ❌ ERROR | 10.7 | fetch failed |
| offset:22 | ❌ ERROR | 10.7 | fetch failed |
| offset:23 | ❌ ERROR | 10.7 | fetch failed |

### deepseek-r1

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| offset:0 | ❌ ERROR | 10.7 | fetch failed |
| offset:1 | ❌ ERROR | 10.7 | fetch failed |
| Next: VC vague wedge | ✅ PASS | 73.3 | - |
| offset:3 | ❌ ERROR | 10.7 | fetch failed |
| Next: CTO vague exposure | ❌ FAIL | 81.4 | Missing [DEBRIEF_V1_JSON] block |
| offset:5 | ❌ ERROR | 10.7 | fetch failed |
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

### deepseek-v3.2

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| offset:0 | ❌ ERROR | 10.7 | fetch failed |
| offset:1 | ❌ ERROR | 10.7 | fetch failed |
| offset:2 | ❌ ERROR | 10.7 | fetch failed |
| offset:3 | ❌ ERROR | 10.7 | fetch failed |
| offset:4 | ❌ ERROR | 10.6 | fetch failed |
| offset:5 | ❌ ERROR | 10.6 | fetch failed |
| offset:6 | ❌ ERROR | 10.6 | fetch failed |
| offset:7 | ❌ ERROR | 10.6 | fetch failed |
| offset:8 | ❌ ERROR | 10.6 | fetch failed |
| offset:9 | ❌ ERROR | 10.6 | fetch failed |
| offset:10 | ❌ ERROR | 10.6 | fetch failed |
| offset:11 | ❌ ERROR | 10.6 | fetch failed |
| offset:12 | ❌ ERROR | 10.6 | fetch failed |
| offset:13 | ❌ ERROR | 10.6 | fetch failed |
| offset:14 | ❌ ERROR | 10.6 | fetch failed |
| offset:15 | ❌ ERROR | 10.6 | fetch failed |
| offset:16 | ❌ ERROR | 10.6 | fetch failed |
| offset:17 | ❌ ERROR | 10.6 | fetch failed |
| offset:18 | ❌ ERROR | 10.6 | fetch failed |
| offset:19 | ❌ ERROR | 10.6 | fetch failed |
| offset:20 | ❌ ERROR | 10.6 | fetch failed |
| offset:21 | ❌ ERROR | 10.6 | fetch failed |
| offset:22 | ❌ ERROR | 10.6 | fetch failed |
| offset:23 | ❌ ERROR | 10.6 | fetch failed |

### qwen3-235b

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| offset:0 | ❌ ERROR | 10.6 | fetch failed |
| offset:1 | ❌ ERROR | 10.6 | fetch failed |
| offset:2 | ❌ ERROR | 10.6 | fetch failed |
| offset:3 | ❌ ERROR | 10.6 | fetch failed |
| offset:4 | ❌ ERROR | 10.6 | fetch failed |
| offset:5 | ❌ ERROR | 10.6 | fetch failed |
| offset:6 | ❌ ERROR | 10.6 | fetch failed |
| offset:7 | ❌ ERROR | 10.6 | fetch failed |
| offset:8 | ❌ ERROR | 10.6 | fetch failed |
| offset:9 | ❌ ERROR | 10.6 | fetch failed |
| offset:10 | ❌ ERROR | 10.6 | fetch failed |
| offset:11 | ❌ ERROR | 10.6 | fetch failed |
| offset:12 | ❌ ERROR | 10.6 | fetch failed |
| offset:13 | ❌ ERROR | 10.6 | fetch failed |
| offset:14 | ❌ ERROR | 10.6 | fetch failed |
| offset:15 | ❌ ERROR | 10.6 | fetch failed |
| offset:16 | ❌ ERROR | 10.6 | fetch failed |
| offset:17 | ❌ ERROR | 10.6 | fetch failed |
| offset:18 | ❌ ERROR | 10.6 | fetch failed |
| offset:19 | ❌ ERROR | 10.6 | fetch failed |
| offset:20 | ❌ ERROR | 10.6 | fetch failed |
| offset:21 | ❌ ERROR | 10.6 | fetch failed |
| offset:22 | ❌ ERROR | 10.6 | fetch failed |
| offset:23 | ❌ ERROR | 10.6 | fetch failed |

### minimax-m2.1

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| offset:0 | ❌ ERROR | 10.6 | fetch failed |
| offset:1 | ❌ ERROR | 10.6 | fetch failed |
| offset:2 | ❌ ERROR | 10.6 | fetch failed |
| offset:3 | ❌ ERROR | 10.6 | fetch failed |
| offset:4 | ❌ ERROR | 10.6 | fetch failed |
| offset:5 | ❌ ERROR | 10.6 | fetch failed |
| offset:6 | ❌ ERROR | 10.6 | fetch failed |
| offset:7 | ❌ ERROR | 10.6 | fetch failed |
| offset:8 | ❌ ERROR | 10.6 | fetch failed |
| offset:9 | ❌ ERROR | 10.6 | fetch failed |
| offset:10 | ❌ ERROR | 10.6 | fetch failed |
| offset:11 | ❌ ERROR | 10.6 | fetch failed |
| offset:12 | ❌ ERROR | 10.6 | fetch failed |
| offset:13 | ❌ ERROR | 10.6 | fetch failed |
| offset:14 | ❌ ERROR | 10.6 | fetch failed |
| offset:15 | ❌ ERROR | 10.6 | fetch failed |
| offset:16 | ❌ ERROR | 10.6 | fetch failed |
| offset:17 | ❌ ERROR | 10.6 | fetch failed |
| offset:18 | ❌ ERROR | 10.6 | fetch failed |
| offset:19 | ❌ ERROR | 10.6 | fetch failed |
| offset:20 | ❌ ERROR | 10.6 | fetch failed |
| offset:21 | ❌ ERROR | 10.6 | fetch failed |
| offset:22 | ❌ ERROR | 10.6 | fetch failed |
| offset:23 | ❌ ERROR | 10.6 | fetch failed |

### mimo-v2-flash-free

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| offset:0 | ❌ ERROR | 10.6 | fetch failed |
| offset:1 | ❌ ERROR | 10.6 | fetch failed |
| offset:2 | ❌ ERROR | 10.6 | fetch failed |
| offset:3 | ❌ ERROR | 10.6 | fetch failed |
| offset:4 | ❌ ERROR | 10.6 | fetch failed |
| offset:5 | ❌ ERROR | 10.6 | fetch failed |
| offset:6 | ❌ ERROR | 10.6 | fetch failed |
| offset:7 | ❌ ERROR | 10.6 | fetch failed |
| offset:8 | ❌ ERROR | 10.6 | fetch failed |
| offset:9 | ❌ ERROR | 10.6 | fetch failed |
| offset:10 | ❌ ERROR | 10.6 | fetch failed |
| offset:11 | ❌ ERROR | 10.6 | fetch failed |
| offset:12 | ❌ ERROR | 10.6 | fetch failed |
| offset:13 | ❌ ERROR | 10.6 | fetch failed |
| offset:14 | ❌ ERROR | 10.6 | fetch failed |
| offset:15 | ❌ ERROR | 10.6 | fetch failed |
| offset:16 | ❌ ERROR | 10.6 | fetch failed |
| offset:17 | ❌ ERROR | 10.6 | fetch failed |
| offset:18 | ❌ ERROR | 10.6 | fetch failed |
| offset:19 | ❌ ERROR | 10.6 | fetch failed |
| Stress: ambiguous persona (wedge + outreach) | ✅ PASS | 84.6 | - |
| Stress: contradiction handling (Seed vs Series A) | ✅ PASS | 17.9 | - |
| offset:22 | ❌ ERROR | 10.6 | fetch failed |
| offset:23 | ❌ ERROR | 10.6 | fetch failed |

## Disclosure Metrics (P0 Instrumentation)

### Disclosure Level by Model

| Model | Full | Partial | None |
|-------|------|---------|------|
| claude-haiku-4.5 | 0 | 0 | 24 |
| gpt-5-mini | 0 | 0 | 24 |
| gemini-3-flash | 0 | 0 | 8 |
| deepseek-r1 | 0 | 0 | 2 |
| deepseek-v3.2 | 0 | 0 | 0 |
| qwen3-235b | 0 | 0 | 0 |
| minimax-m2.1 | 0 | 0 | 0 |
| mimo-v2-flash-free | 0 | 0 | 2 |

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
⚠️ [claude-haiku-4.5/next_vc_tool_disco_comps] No skill search for EARLY_STAGE_VC scenario
⚠️ [claude-haiku-4.5/next_cto_vague_quickjs_exposure] No skill search before tool invoke
⚠️ [claude-haiku-4.5/next_cto_vague_quickjs_exposure] No skill search for CTO_TECH_LEAD scenario
⚠️ [claude-haiku-4.5/next_cto_vague_quickjs_exposure] No progressive disclosure meta-tools used
⚠️ [claude-haiku-4.5/next_cto_tool_cve_plan] No skill search before tool invoke
⚠️ [claude-haiku-4.5/next_cto_tool_cve_plan] No skill search for CTO_TECH_LEAD scenario
⚠️ [claude-haiku-4.5/next_cto_tool_cve_plan] No progressive disclosure meta-tools used
⚠️ [claude-haiku-4.5/next_founder_vague_salesforce_agentforce] No skill search before tool invoke
⚠️ [claude-haiku-4.5/next_founder_vague_salesforce_agentforce] No skill search for FOUNDER_STRATEGY scenario
⚠️ [claude-haiku-4.5/next_founder_vague_salesforce_agentforce] No progressive disclosure meta-tools used
⚠️ [claude-haiku-4.5/next_founder_tool_salesforce_memo] No skill search before tool invoke
⚠️ [claude-haiku-4.5/next_founder_tool_salesforce_memo] No skill search for FOUNDER_STRATEGY scenario
⚠️ [claude-haiku-4.5/next_founder_tool_salesforce_memo] No progressive disclosure meta-tools used
⚠️ [claude-haiku-4.5/next_academic_vague_ryr2_alz] No skill search for ACADEMIC_RD scenario
⚠️ [claude-haiku-4.5/next_academic_tool_lit_debrief] No skill search before tool invoke
⚠️ [claude-haiku-4.5/next_academic_tool_lit_debrief] No skill search for ACADEMIC_RD scenario
⚠️ [claude-haiku-4.5/next_academic_tool_lit_debrief] No progressive disclosure meta-tools used
⚠️ [claude-haiku-4.5/next_exec_vague_gemini_standardize] No skill search before tool invoke
⚠️ [claude-haiku-4.5/next_exec_vague_gemini_standardize] No skill search for ENTERPRISE_EXEC scenario
⚠️ [claude-haiku-4.5/next_exec_vague_gemini_standardize] No progressive disclosure meta-tools used
⚠️ [claude-haiku-4.5/next_exec_tool_cost_model] No skill search before tool invoke
⚠️ [claude-haiku-4.5/next_exec_tool_cost_model] No skill search for ENTERPRISE_EXEC scenario
⚠️ [claude-haiku-4.5/next_exec_tool_cost_model] No progressive disclosure meta-tools used
⚠️ [claude-haiku-4.5/next_ecosystem_vague_soundcloud_vpn] No skill search before tool invoke
⚠️ [claude-haiku-4.5/next_ecosystem_vague_soundcloud_vpn] No skill search for ECOSYSTEM_PARTNER scenario
⚠️ [claude-haiku-4.5/next_ecosystem_vague_soundcloud_vpn] No progressive disclosure meta-tools used
⚠️ [claude-haiku-4.5/next_ecosystem_tool_second_order_brief] No skill search before tool invoke
⚠️ [claude-haiku-4.5/next_ecosystem_tool_second_order_brief] No skill search for ECOSYSTEM_PARTNER scenario
⚠️ [claude-haiku-4.5/next_ecosystem_tool_second_order_brief] No progressive disclosure meta-tools used
⚠️ [claude-haiku-4.5/next_quant_vague_disco_track] No skill search before tool invoke
⚠️ [claude-haiku-4.5/next_quant_vague_disco_track] No skill search for QUANT_ANALYST scenario
⚠️ [claude-haiku-4.5/next_quant_vague_disco_track] No progressive disclosure meta-tools used
⚠️ [claude-haiku-4.5/next_quant_tool_signal_json] No skill search before tool invoke
⚠️ [claude-haiku-4.5/next_quant_tool_signal_json] No skill search for QUANT_ANALYST scenario
⚠️ [claude-haiku-4.5/next_quant_tool_signal_json] No progressive disclosure meta-tools used
⚠️ [claude-haiku-4.5/next_product_vague_make_usable_ui] No skill search before tool invoke
⚠️ [claude-haiku-4.5/next_product_vague_make_usable_ui] No skill search for PRODUCT_DESIGNER scenario
⚠️ [claude-haiku-4.5/next_product_vague_make_usable_ui] No progressive disclosure meta-tools used
⚠️ [claude-haiku-4.5/next_product_tool_expandable_card] No skill search for PRODUCT_DESIGNER scenario
⚠️ [claude-haiku-4.5/next_sales_vague_shareable] No skill search before tool invoke
⚠️ [claude-haiku-4.5/next_sales_vague_shareable] No skill search for SALES_ENGINEER scenario
⚠️ [claude-haiku-4.5/next_sales_vague_shareable] No progressive disclosure meta-tools used
⚠️ [claude-haiku-4.5/next_sales_tool_one_screen_objections] No skill search before tool invoke
... and 109 more warnings
