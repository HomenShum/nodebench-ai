# Comprehensive Evaluation Results

Generated: 2026-04-21T20:54:13.507Z
Total Time: 1774.7s
Suite: full
Models: 3
Scenarios: 32
Total evaluations: 96
LLM Judge: enabled

## Success Metrics

| Metric | Value |
|--------|-------|
| Overall Pass Rate | 57.3% |
| Memory-First Compliance | 64.6% |
| Tool Ordering Accuracy | 64.6% |
| Skill-First Rate | 64.6% |
| Avg Latency | 36.1s |
| p50 Latency | 35.7s |
| p95 Latency | 81.8s |

## LLM Judge Metrics

Average Score: 5.3/10

| Model | Judge Score |
|-------|-------------|
| claude-haiku-4.5 | 5.1/10 |
| gpt-5-mini | 5.5/10 |
| gemini-3-flash | 0.0/10 |

### Criteria Pass Rates

| Criterion | Pass Rate |
|-----------|-----------|
| appropriateFormat | 79% |
| citesGroundTruth | 74% |
| entityCorrect | 66% |
| factuallyAccurate | 10% |
| hasDebrief | 2% |
| isActionable | 21% |
| isCoherent | 79% |
| noContradictions | 100% |
| noHallucinations | 16% |
| personaMatch | 82% |

## Pass Rate by Model

| Model | Pass Rate | Memory-First | Tool Ordering | Avg Latency |
|-------|-----------|--------------|---------------|-------------|
| claude-haiku-4.5 | 84% | 94% | 94% | 57.9s |
| gpt-5-mini | 88% | 100% | 100% | 40.3s |
| gemini-3-flash | 0% | 0% | 0% | 10.1s |

## Pass Rate by Scenario

| Scenario | Pass Rate |
|----------|-----------|
| ⚠️ banker_vague_disco | 67% |
| ⚠️ vc_vague_openautoglm | 67% |
| ⚠️ cto_vague_quickjs | 67% |
| ⚠️ exec_vague_gemini | 67% |
| ⚠️ ecosystem_vague_soundcloud | 67% |
| ⚠️ founder_salesforce_positioning | 67% |
| ⚠️ academic_ryr2_anchor | 67% |
| ⚠️ quant_disco_signal | 67% |
| ⚠️ product_disco_card | 67% |
| ⚠️ sales_disco_onepager | 67% |
| ⚠️ next_banker_vague_disco_cover_this_week | 67% |
| ⚠️ next_banker_tool_ambros_outbound_pack | 67% |
| ⚠️ next_vc_vague_disco_wedge | 67% |
| ❌ next_vc_tool_disco_comps | 33% |
| ⚠️ next_cto_vague_quickjs_exposure | 67% |
| ⚠️ next_cto_tool_cve_plan | 67% |
| ⚠️ next_founder_vague_salesforce_agentforce | 67% |
| ⚠️ next_founder_tool_salesforce_memo | 67% |
| ⚠️ next_academic_vague_ryr2_alz | 67% |
| ❌ next_academic_tool_lit_debrief | 0% |
| ⚠️ next_exec_vague_gemini_standardize | 67% |
| ❌ next_exec_tool_cost_model | 0% |
| ⚠️ next_ecosystem_vague_soundcloud_vpn | 67% |
| ❌ next_ecosystem_tool_second_order_brief | 0% |
| ⚠️ next_quant_vague_disco_track | 67% |
| ⚠️ next_quant_tool_signal_json | 67% |
| ⚠️ next_product_vague_make_usable_ui | 67% |
| ⚠️ next_product_tool_expandable_card | 67% |
| ⚠️ next_sales_vague_shareable | 67% |
| ❌ next_sales_tool_one_screen_objections | 0% |
| ⚠️ stress_ambiguous_persona_disco_wedge_outreach | 67% |
| ⚠️ stress_contradiction_disco_series_a_claim | 67% |
