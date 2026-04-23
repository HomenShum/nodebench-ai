# Comprehensive Evaluation Results

Generated: 2026-04-23T10:47:54.427Z
Total Time: 2926.6s
Suite: full
Models: 1
Scenarios: 32
Total evaluations: 32
LLM Judge: enabled

## Success Metrics

| Metric | Value |
|--------|-------|
| Overall Pass Rate | 78.1% |
| Memory-First Compliance | 78.1% |
| Tool Ordering Accuracy | 78.1% |
| Skill-First Rate | 78.1% |
| Avg Latency | 55.4s |
| p50 Latency | 56.5s |
| p95 Latency | 92.1s |

## LLM Judge Metrics

Average Score: 9.6/10

| Model | Judge Score |
|-------|-------------|
| kimi-k2.6 | 9.6/10 |

### Criteria Pass Rates

| Criterion | Pass Rate |
|-----------|-----------|
| appropriateFormat | 100% |
| citesGroundTruth | 100% |
| entityCorrect | 100% |
| factuallyAccurate | 88% |
| hasDebrief | 100% |
| isActionable | 100% |
| isCoherent | 100% |
| noContradictions | 92% |
| noHallucinations | 84% |
| personaMatch | 100% |

## Pass Rate by Model

| Model | Pass Rate | Memory-First | Tool Ordering | Avg Latency |
|-------|-----------|--------------|---------------|-------------|
| kimi-k2.6 | 78% | 78% | 78% | 55.4s |

## Pass Rate by Scenario

| Scenario | Pass Rate |
|----------|-----------|
| ✅ banker_vague_disco | 100% |
| ✅ vc_vague_openautoglm | 100% |
| ❌ cto_vague_quickjs | 0% |
| ✅ exec_vague_gemini | 100% |
| ✅ ecosystem_vague_soundcloud | 100% |
| ✅ founder_salesforce_positioning | 100% |
| ✅ academic_ryr2_anchor | 100% |
| ✅ quant_disco_signal | 100% |
| ✅ product_disco_card | 100% |
| ✅ sales_disco_onepager | 100% |
| ✅ next_banker_vague_disco_cover_this_week | 100% |
| ❌ next_banker_tool_ambros_outbound_pack | 0% |
| ✅ next_vc_vague_disco_wedge | 100% |
| ❌ next_vc_tool_disco_comps | 0% |
| ❌ next_cto_vague_quickjs_exposure | 0% |
| ❌ next_cto_tool_cve_plan | 0% |
| ✅ next_founder_vague_salesforce_agentforce | 100% |
| ❌ next_founder_tool_salesforce_memo | 0% |
| ✅ next_academic_vague_ryr2_alz | 100% |
| ❌ next_academic_tool_lit_debrief | 0% |
| ✅ next_exec_vague_gemini_standardize | 100% |
| ✅ next_exec_tool_cost_model | 100% |
| ✅ next_ecosystem_vague_soundcloud_vpn | 100% |
| ✅ next_ecosystem_tool_second_order_brief | 100% |
| ✅ next_quant_vague_disco_track | 100% |
| ✅ next_quant_tool_signal_json | 100% |
| ✅ next_product_vague_make_usable_ui | 100% |
| ✅ next_product_tool_expandable_card | 100% |
| ✅ next_sales_vague_shareable | 100% |
| ✅ next_sales_tool_one_screen_objections | 100% |
| ✅ stress_ambiguous_persona_disco_wedge_outreach | 100% |
| ✅ stress_contradiction_disco_series_a_claim | 100% |
