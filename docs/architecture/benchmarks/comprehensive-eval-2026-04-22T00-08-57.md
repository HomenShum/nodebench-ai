# Comprehensive Evaluation Results

Generated: 2026-04-22T00:08:57.440Z
Total Time: 339.6s
Suite: full
Models: 3
Scenarios: 32
Total evaluations: 96
LLM Judge: enabled

## Success Metrics

| Metric | Value |
|--------|-------|
| Overall Pass Rate | 29.2% |
| Memory-First Compliance | 33.3% |
| Tool Ordering Accuracy | 33.3% |
| Skill-First Rate | 33.3% |
| Avg Latency | 6.9s |
| p50 Latency | 2.0s |
| p95 Latency | 20.4s |

## LLM Judge Metrics

Average Score: 5.6/10

| Model | Judge Score |
|-------|-------------|
| claude-haiku-3.5 | 0.0/10 |
| gpt-5.4-mini | 5.6/10 |
| gemini-3-flash-preview | 0.0/10 |

### Criteria Pass Rates

| Criterion | Pass Rate |
|-----------|-----------|
| appropriateFormat | 81% |
| citesGroundTruth | 50% |
| entityCorrect | 78% |
| factuallyAccurate | 19% |
| hasDebrief | 9% |
| isActionable | 75% |
| isCoherent | 75% |
| noContradictions | 69% |
| noHallucinations | 22% |
| personaMatch | 84% |

## Pass Rate by Model

| Model | Pass Rate | Memory-First | Tool Ordering | Avg Latency |
|-------|-----------|--------------|---------------|-------------|
| claude-haiku-3.5 | 0% | 0% | 0% | 2.9s |
| gpt-5.4-mini | 88% | 100% | 100% | 16.8s |
| gemini-3-flash-preview | 0% | 0% | 0% | 1.2s |

## Pass Rate by Scenario

| Scenario | Pass Rate |
|----------|-----------|
| ❌ banker_vague_disco | 33% |
| ❌ vc_vague_openautoglm | 33% |
| ❌ cto_vague_quickjs | 33% |
| ❌ exec_vague_gemini | 33% |
| ❌ ecosystem_vague_soundcloud | 33% |
| ❌ founder_salesforce_positioning | 33% |
| ❌ academic_ryr2_anchor | 33% |
| ❌ quant_disco_signal | 33% |
| ❌ product_disco_card | 33% |
| ❌ sales_disco_onepager | 33% |
| ❌ next_banker_vague_disco_cover_this_week | 33% |
| ❌ next_banker_tool_ambros_outbound_pack | 33% |
| ❌ next_vc_vague_disco_wedge | 33% |
| ❌ next_vc_tool_disco_comps | 33% |
| ❌ next_cto_vague_quickjs_exposure | 33% |
| ❌ next_cto_tool_cve_plan | 33% |
| ❌ next_founder_vague_salesforce_agentforce | 33% |
| ❌ next_founder_tool_salesforce_memo | 33% |
| ❌ next_academic_vague_ryr2_alz | 33% |
| ❌ next_academic_tool_lit_debrief | 0% |
| ❌ next_exec_vague_gemini_standardize | 33% |
| ❌ next_exec_tool_cost_model | 0% |
| ❌ next_ecosystem_vague_soundcloud_vpn | 33% |
| ❌ next_ecosystem_tool_second_order_brief | 0% |
| ❌ next_quant_vague_disco_track | 33% |
| ❌ next_quant_tool_signal_json | 33% |
| ❌ next_product_vague_make_usable_ui | 33% |
| ❌ next_product_tool_expandable_card | 33% |
| ❌ next_sales_vague_shareable | 33% |
| ❌ next_sales_tool_one_screen_objections | 0% |
| ❌ stress_ambiguous_persona_disco_wedge_outreach | 33% |
| ❌ stress_contradiction_disco_series_a_claim | 33% |
