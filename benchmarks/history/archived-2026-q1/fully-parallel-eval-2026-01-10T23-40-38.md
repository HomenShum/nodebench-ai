# Fully Parallel Evaluation Results

Generated: 2026-01-10T23:40:38.670Z
Total Time: 166.0s
Suite: pack
Models: 1
Scenarios: 24 of 24 (limit=0)
Total evaluations: 24

## Summary by Model

| Model | Total | Passed | Failed | Avg Time (s) |
|-------|-------|--------|--------|--------------|
| mimo-v2-flash-free | 24 | 18 | 6 | 48.0 |

## Summary by Scenario

| Scenario | Total | Passed | Failed |
|----------|-------|--------|--------|
| Next: academic tool-driven literature debrief | 1 | 1 | 0 |
| Next: academic vague anchor | 1 | 1 | 0 |
| Next: banker tool-driven outbound pack | 1 | 1 | 0 |
| Next: banker vague (fast debrief) | 1 | 1 | 0 |
| Next: CTO tool-driven CVE plan | 1 | 1 | 0 |
| Next: CTO vague exposure | 1 | 1 | 0 |
| Next: ecosystem tool-driven second-order brief | 1 | 0 | 1 |
| Next: ecosystem vague incident | 1 | 0 | 1 |
| Next: exec tool-driven cost model | 1 | 1 | 0 |
| Next: exec vague standardize | 1 | 0 | 1 |
| Next: founder tool-driven memo | 1 | 1 | 0 |
| Next: founder vague positioning | 1 | 1 | 0 |
| Next: product tool-driven expandable card schema | 1 | 1 | 0 |
| Next: product vague UI usable | 1 | 0 | 1 |
| Next: quant tool-driven signal set JSON | 1 | 1 | 0 |
| Next: quant vague what to track | 1 | 1 | 0 |
| Next: sales tool-driven one-screen + objections | 1 | 1 | 0 |
| Next: sales vague shareable | 1 | 1 | 0 |
| Next: VC tool-driven comps + diligence | 1 | 1 | 0 |
| Next: VC vague wedge | 1 | 1 | 0 |
| Pack: exec cross-provider pricing comparison | 1 | 0 | 1 |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | 1 | 0 | 1 |
| Stress: ambiguous persona (wedge + outreach) | 1 | 1 | 0 |
| Stress: contradiction handling (Seed vs Series A) | 1 | 1 | 0 |

## Detailed Results

### mimo-v2-flash-free

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Next: banker vague (fast debrief) | ✅ PASS | 15.5 | - |
| Next: banker tool-driven outbound pack | ✅ PASS | 51.8 | - |
| Next: VC vague wedge | ✅ PASS | 17.7 | - |
| Next: VC tool-driven comps + diligence | ✅ PASS | 166.0 | - |
| Next: CTO vague exposure | ✅ PASS | 25.5 | - |
| Next: CTO tool-driven CVE plan | ✅ PASS | 108.3 | - |
| Next: founder vague positioning | ✅ PASS | 116.3 | - |
| Next: founder tool-driven memo | ✅ PASS | 84.0 | - |
| Next: academic vague anchor | ✅ PASS | 24.3 | - |
| Next: academic tool-driven literature debrief | ✅ PASS | 110.2 | - |
| Next: exec vague standardize | ❌ FAIL | 13.2 | Invalid JSON: Unexpected token '*', "**
```json"... is not valid JSON |
| Next: exec tool-driven cost model | ✅ PASS | 85.4 | - |
| Next: ecosystem vague incident | ❌ FAIL | 37.2 | persona mismatch: got CTO_TECH_LEAD expected ECOSYSTEM_PARTNER |
| Next: ecosystem tool-driven second-order brief | ❌ FAIL | 47.2 | Missing [DEBRIEF_V1_JSON] block |
| Next: quant vague what to track | ✅ PASS | 17.6 | - |
| Next: quant tool-driven signal set JSON | ✅ PASS | 37.8 | - |
| Next: product vague UI usable | ❌ FAIL | 16.1 | persona mismatch: got SALES_ENGINEER expected PRODUCT_DESIGNER |
| Next: product tool-driven expandable card schema | ✅ PASS | 23.9 | - |
| Next: sales vague shareable | ✅ PASS | 15.9 | - |
| Next: sales tool-driven one-screen + objections | ✅ PASS | 17.6 | - |
| Stress: ambiguous persona (wedge + outreach) | ✅ PASS | 19.5 | - |
| Stress: contradiction handling (Seed vs Series A) | ✅ PASS | 16.7 | - |
| Pack: exec cross-provider pricing comparison | ❌ FAIL | 49.4 | persona mismatch: got QUANT_ANALYST expected ENTERPRISE_EXEC |
| Pack: meta budgeted deep dive (<=3 tools, <=$0.25) | ❌ FAIL | 34.2 | Missing [DEBRIEF_V1_JSON] block |

## Disclosure Metrics (P0 Instrumentation)

### Disclosure Level by Model

| Model | Full | Partial | None |
|-------|------|---------|------|
| mimo-v2-flash-free | 0 | 0 | 24 |

### Disclosure Warnings (Non-Scored)

> **Note:** These warnings are informational and do not affect pass/fail.
> They track progressive disclosure usage for Week 1-2 observability.

⚠️ [mimo-v2-flash-free/next_banker_vague_disco_cover_this_week] No skill search before tool invoke
⚠️ [mimo-v2-flash-free/next_banker_vague_disco_cover_this_week] No progressive disclosure meta-tools used
⚠️ [mimo-v2-flash-free/next_banker_tool_ambros_outbound_pack] No skill search before tool invoke
⚠️ [mimo-v2-flash-free/next_banker_tool_ambros_outbound_pack] No progressive disclosure meta-tools used
⚠️ [mimo-v2-flash-free/next_vc_vague_disco_wedge] No skill search before tool invoke
⚠️ [mimo-v2-flash-free/next_vc_vague_disco_wedge] No skill search for EARLY_STAGE_VC scenario
⚠️ [mimo-v2-flash-free/next_vc_vague_disco_wedge] No progressive disclosure meta-tools used
⚠️ [mimo-v2-flash-free/next_vc_tool_disco_comps] No skill search before tool invoke
⚠️ [mimo-v2-flash-free/next_vc_tool_disco_comps] No skill search for EARLY_STAGE_VC scenario
⚠️ [mimo-v2-flash-free/next_vc_tool_disco_comps] No progressive disclosure meta-tools used
⚠️ [mimo-v2-flash-free/next_cto_vague_quickjs_exposure] No skill search before tool invoke
⚠️ [mimo-v2-flash-free/next_cto_vague_quickjs_exposure] No skill search for CTO_TECH_LEAD scenario
⚠️ [mimo-v2-flash-free/next_cto_vague_quickjs_exposure] No progressive disclosure meta-tools used
⚠️ [mimo-v2-flash-free/next_cto_tool_cve_plan] No skill search before tool invoke
⚠️ [mimo-v2-flash-free/next_cto_tool_cve_plan] No skill search for CTO_TECH_LEAD scenario
⚠️ [mimo-v2-flash-free/next_cto_tool_cve_plan] No progressive disclosure meta-tools used
⚠️ [mimo-v2-flash-free/next_founder_vague_salesforce_agentforce] No skill search before tool invoke
⚠️ [mimo-v2-flash-free/next_founder_vague_salesforce_agentforce] No skill search for FOUNDER_STRATEGY scenario
⚠️ [mimo-v2-flash-free/next_founder_vague_salesforce_agentforce] No progressive disclosure meta-tools used
⚠️ [mimo-v2-flash-free/next_founder_tool_salesforce_memo] No skill search before tool invoke
⚠️ [mimo-v2-flash-free/next_founder_tool_salesforce_memo] No skill search for FOUNDER_STRATEGY scenario
⚠️ [mimo-v2-flash-free/next_founder_tool_salesforce_memo] No progressive disclosure meta-tools used
⚠️ [mimo-v2-flash-free/next_academic_vague_ryr2_alz] No skill search before tool invoke
⚠️ [mimo-v2-flash-free/next_academic_vague_ryr2_alz] No skill search for ACADEMIC_RD scenario
⚠️ [mimo-v2-flash-free/next_academic_vague_ryr2_alz] No progressive disclosure meta-tools used
⚠️ [mimo-v2-flash-free/next_academic_tool_lit_debrief] No skill search before tool invoke
⚠️ [mimo-v2-flash-free/next_academic_tool_lit_debrief] No skill search for ACADEMIC_RD scenario
⚠️ [mimo-v2-flash-free/next_academic_tool_lit_debrief] No progressive disclosure meta-tools used
⚠️ [mimo-v2-flash-free/next_exec_vague_gemini_standardize] No skill search for ENTERPRISE_EXEC scenario
⚠️ [mimo-v2-flash-free/next_exec_tool_cost_model] No skill search before tool invoke
⚠️ [mimo-v2-flash-free/next_exec_tool_cost_model] No skill search for ENTERPRISE_EXEC scenario
⚠️ [mimo-v2-flash-free/next_exec_tool_cost_model] No progressive disclosure meta-tools used
⚠️ [mimo-v2-flash-free/next_ecosystem_vague_soundcloud_vpn] No skill search before tool invoke
⚠️ [mimo-v2-flash-free/next_ecosystem_vague_soundcloud_vpn] No skill search for ECOSYSTEM_PARTNER scenario
⚠️ [mimo-v2-flash-free/next_ecosystem_vague_soundcloud_vpn] No progressive disclosure meta-tools used
⚠️ [mimo-v2-flash-free/next_ecosystem_tool_second_order_brief] No skill search before tool invoke
⚠️ [mimo-v2-flash-free/next_ecosystem_tool_second_order_brief] No skill search for ECOSYSTEM_PARTNER scenario
⚠️ [mimo-v2-flash-free/next_ecosystem_tool_second_order_brief] No progressive disclosure meta-tools used
⚠️ [mimo-v2-flash-free/next_quant_vague_disco_track] No skill search before tool invoke
⚠️ [mimo-v2-flash-free/next_quant_vague_disco_track] No skill search for QUANT_ANALYST scenario
⚠️ [mimo-v2-flash-free/next_quant_vague_disco_track] No progressive disclosure meta-tools used
⚠️ [mimo-v2-flash-free/next_quant_tool_signal_json] No skill search before tool invoke
⚠️ [mimo-v2-flash-free/next_quant_tool_signal_json] No skill search for QUANT_ANALYST scenario
⚠️ [mimo-v2-flash-free/next_quant_tool_signal_json] No progressive disclosure meta-tools used
⚠️ [mimo-v2-flash-free/next_product_vague_make_usable_ui] No skill search before tool invoke
⚠️ [mimo-v2-flash-free/next_product_vague_make_usable_ui] No skill search for PRODUCT_DESIGNER scenario
⚠️ [mimo-v2-flash-free/next_product_vague_make_usable_ui] No progressive disclosure meta-tools used
⚠️ [mimo-v2-flash-free/next_product_tool_expandable_card] No skill search before tool invoke
⚠️ [mimo-v2-flash-free/next_product_tool_expandable_card] No skill search for PRODUCT_DESIGNER scenario
⚠️ [mimo-v2-flash-free/next_product_tool_expandable_card] No progressive disclosure meta-tools used
... and 16 more warnings
