# Comprehensive Evaluation Results

Generated: 2026-04-23T11:02:58.331Z
Total Time: 658.1s
Suite: full
Models: 1
Scenarios: 7
Total evaluations: 7
LLM Judge: enabled

## Success Metrics

| Metric | Value |
|--------|-------|
| Overall Pass Rate | 71.4% |
| Memory-First Compliance | 71.4% |
| Tool Ordering Accuracy | 71.4% |
| Skill-First Rate | 71.4% |
| Avg Latency | 83.3s |
| p50 Latency | 82.1s |
| p95 Latency | 92.1s |

## LLM Judge Metrics

Average Score: 9.0/10

| Model | Judge Score |
|-------|-------------|
| kimi-k2.6 | 9.0/10 |

### Criteria Pass Rates

| Criterion | Pass Rate |
|-----------|-----------|
| appropriateFormat | 80% |
| citesGroundTruth | 100% |
| entityCorrect | 100% |
| factuallyAccurate | 80% |
| hasDebrief | 100% |
| isActionable | 80% |
| isCoherent | 100% |
| noContradictions | 100% |
| noHallucinations | 80% |
| personaMatch | 80% |

## Pass Rate by Model

| Model | Pass Rate | Memory-First | Tool Ordering | Avg Latency |
|-------|-----------|--------------|---------------|-------------|
| kimi-k2.6 | 71% | 71% | 71% | 83.3s |

## Pass Rate by Scenario

| Scenario | Pass Rate |
|----------|-----------|
| ✅ cto_vague_quickjs | 100% |
| ✅ next_banker_tool_ambros_outbound_pack | 100% |
| ❌ next_vc_tool_disco_comps | 0% |
| ❌ next_cto_vague_quickjs_exposure | 0% |
| ✅ next_cto_tool_cve_plan | 100% |
| ✅ next_founder_tool_salesforce_memo | 100% |
| ✅ next_academic_tool_lit_debrief | 100% |
