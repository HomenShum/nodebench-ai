# Comprehensive Evaluation Results

Generated: 2026-04-22T02:31:34.389Z
Total Time: 165.1s
Suite: next
Models: 1
Scenarios: 20
Total evaluations: 20
LLM Judge: enabled

## Success Metrics

| Metric | Value |
|--------|-------|
| Overall Pass Rate | 80.0% |
| Memory-First Compliance | 100.0% |
| Tool Ordering Accuracy | 100.0% |
| Skill-First Rate | 100.0% |
| Avg Latency | 17.5s |
| p50 Latency | 12.6s |
| p95 Latency | 48.9s |

## LLM Judge Metrics

Average Score: 5.7/10

| Model | Judge Score |
|-------|-------------|
| gpt-5.4-mini | 5.7/10 |

### Criteria Pass Rates

| Criterion | Pass Rate |
|-----------|-----------|
| appropriateFormat | 78% |
| citesGroundTruth | 44% |
| entityCorrect | 94% |
| factuallyAccurate | 39% |
| hasDebrief | 6% |
| isActionable | 44% |
| isCoherent | 67% |
| noContradictions | 78% |
| noHallucinations | 28% |
| personaMatch | 89% |

## Pass Rate by Model

| Model | Pass Rate | Memory-First | Tool Ordering | Avg Latency |
|-------|-----------|--------------|---------------|-------------|
| gpt-5.4-mini | 80% | 100% | 100% | 17.5s |

## Pass Rate by Scenario

| Scenario | Pass Rate |
|----------|-----------|
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
