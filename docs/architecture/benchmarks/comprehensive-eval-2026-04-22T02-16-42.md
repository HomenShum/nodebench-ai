# Comprehensive Evaluation Results

Generated: 2026-04-22T02:16:42.750Z
Total Time: 261.0s
Suite: full
Models: 1
Scenarios: 32
Total evaluations: 32
LLM Judge: enabled

## Success Metrics

| Metric | Value |
|--------|-------|
| Overall Pass Rate | 87.5% |
| Memory-First Compliance | 100.0% |
| Tool Ordering Accuracy | 100.0% |
| Skill-First Rate | 100.0% |
| Avg Latency | 16.3s |
| p50 Latency | 14.3s |
| p95 Latency | 30.0s |

## LLM Judge Metrics

Average Score: 5.9/10

| Model | Judge Score |
|-------|-------------|
| gpt-5.4-mini | 5.9/10 |

### Criteria Pass Rates

| Criterion | Pass Rate |
|-----------|-----------|
| appropriateFormat | 66% |
| citesGroundTruth | 59% |
| entityCorrect | 78% |
| factuallyAccurate | 41% |
| hasDebrief | 13% |
| isActionable | 69% |
| isCoherent | 81% |
| noContradictions | 78% |
| noHallucinations | 28% |
| personaMatch | 75% |

## Pass Rate by Model

| Model | Pass Rate | Memory-First | Tool Ordering | Avg Latency |
|-------|-----------|--------------|---------------|-------------|
| gpt-5.4-mini | 88% | 100% | 100% | 16.3s |

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
| ✅ next_banker_tool_ambros_outbound_pack | 100% |
| ✅ next_vc_vague_disco_wedge | 100% |
| ✅ next_vc_tool_disco_comps | 100% |
| ✅ next_cto_vague_quickjs_exposure | 100% |
| ✅ next_cto_tool_cve_plan | 100% |
| ✅ next_founder_vague_salesforce_agentforce | 100% |
| ✅ next_founder_tool_salesforce_memo | 100% |
| ✅ next_academic_vague_ryr2_alz | 100% |
| ❌ next_academic_tool_lit_debrief | 0% |
| ✅ next_exec_vague_gemini_standardize | 100% |
| ❌ next_exec_tool_cost_model | 0% |
| ✅ next_ecosystem_vague_soundcloud_vpn | 100% |
| ❌ next_ecosystem_tool_second_order_brief | 0% |
| ✅ next_quant_vague_disco_track | 100% |
| ✅ next_quant_tool_signal_json | 100% |
| ✅ next_product_vague_make_usable_ui | 100% |
| ✅ next_product_tool_expandable_card | 100% |
| ✅ next_sales_vague_shareable | 100% |
| ❌ next_sales_tool_one_screen_objections | 0% |
| ✅ stress_ambiguous_persona_disco_wedge_outreach | 100% |
| ✅ stress_contradiction_disco_series_a_claim | 100% |
