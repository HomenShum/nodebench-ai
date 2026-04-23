# Comprehensive Evaluation Results

Generated: 2026-04-23T01:33:33.338Z
Total Time: 912.5s
Suite: full
Models: 1
Scenarios: 32
Total evaluations: 32
LLM Judge: enabled

## Success Metrics

| Metric | Value |
|--------|-------|
| Overall Pass Rate | 34.4% |
| Memory-First Compliance | 100.0% |
| Tool Ordering Accuracy | 100.0% |
| Skill-First Rate | 100.0% |
| Avg Latency | 48.1s |
| p50 Latency | 0.1s |
| p95 Latency | 160.6s |

## LLM Judge Metrics

Average Score: 9.7/10

| Model | Judge Score |
|-------|-------------|
| kimi-k2.6 | 9.7/10 |

### Criteria Pass Rates

| Criterion | Pass Rate |
|-----------|-----------|
| appropriateFormat | 100% |
| citesGroundTruth | 100% |
| entityCorrect | 100% |
| factuallyAccurate | 91% |
| hasDebrief | 100% |
| isActionable | 100% |
| isCoherent | 100% |
| noContradictions | 91% |
| noHallucinations | 91% |
| personaMatch | 100% |

## Pass Rate by Model

| Model | Pass Rate | Memory-First | Tool Ordering | Avg Latency |
|-------|-----------|--------------|---------------|-------------|
| kimi-k2.6 | 34% | 100% | 100% | 48.1s |

## Pass Rate by Scenario

| Scenario | Pass Rate |
|----------|-----------|
| ✅ banker_vague_disco | 100% |
| ✅ vc_vague_openautoglm | 100% |
| ✅ cto_vague_quickjs | 100% |
| ✅ exec_vague_gemini | 100% |
| ✅ ecosystem_vague_soundcloud | 100% |
| ✅ founder_salesforce_positioning | 100% |
| ✅ academic_ryr2_anchor | 100% |
| ✅ quant_disco_signal | 100% |
| ✅ product_disco_card | 100% |
| ✅ sales_disco_onepager | 100% |
| ✅ next_banker_vague_disco_cover_this_week | 100% |
| ❌ next_banker_tool_ambros_outbound_pack | 0% |
| ❌ next_vc_vague_disco_wedge | 0% |
| ❌ next_vc_tool_disco_comps | 0% |
| ❌ next_cto_vague_quickjs_exposure | 0% |
| ❌ next_cto_tool_cve_plan | 0% |
| ❌ next_founder_vague_salesforce_agentforce | 0% |
| ❌ next_founder_tool_salesforce_memo | 0% |
| ❌ next_academic_vague_ryr2_alz | 0% |
| ❌ next_academic_tool_lit_debrief | 0% |
| ❌ next_exec_vague_gemini_standardize | 0% |
| ❌ next_exec_tool_cost_model | 0% |
| ❌ next_ecosystem_vague_soundcloud_vpn | 0% |
| ❌ next_ecosystem_tool_second_order_brief | 0% |
| ❌ next_quant_vague_disco_track | 0% |
| ❌ next_quant_tool_signal_json | 0% |
| ❌ next_product_vague_make_usable_ui | 0% |
| ❌ next_product_tool_expandable_card | 0% |
| ❌ next_sales_vague_shareable | 0% |
| ❌ next_sales_tool_one_screen_objections | 0% |
| ❌ stress_ambiguous_persona_disco_wedge_outreach | 0% |
| ❌ stress_contradiction_disco_series_a_claim | 0% |
