# Comprehensive Evaluation Results

Generated: 2026-04-23T11:10:35.647Z
Total Time: 410.3s
Suite: full
Models: 1
Scenarios: 2
Total evaluations: 2
LLM Judge: enabled

## Success Metrics

| Metric | Value |
|--------|-------|
| Overall Pass Rate | 50.0% |
| Memory-First Compliance | 50.0% |
| Tool Ordering Accuracy | 50.0% |
| Skill-First Rate | 50.0% |
| Avg Latency | 52.8s |
| p50 Latency | 92.9s |
| p95 Latency | 92.9s |

## LLM Judge Metrics

Average Score: 9.0/10

| Model | Judge Score |
|-------|-------------|
| kimi-k2.6 | 9.0/10 |

### Criteria Pass Rates

| Criterion | Pass Rate |
|-----------|-----------|
| appropriateFormat | 100% |
| citesGroundTruth | 100% |
| entityCorrect | 100% |
| factuallyAccurate | 100% |
| hasDebrief | 100% |
| isActionable | 100% |
| isCoherent | 100% |
| noContradictions | 100% |
| noHallucinations | 0% |
| personaMatch | 100% |

## Pass Rate by Model

| Model | Pass Rate | Memory-First | Tool Ordering | Avg Latency |
|-------|-----------|--------------|---------------|-------------|
| kimi-k2.6 | 50% | 50% | 50% | 52.8s |

## Pass Rate by Scenario

| Scenario | Pass Rate |
|----------|-----------|
| ✅ next_vc_tool_disco_comps | 100% |
| ❌ next_cto_vague_quickjs_exposure | 0% |
