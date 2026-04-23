# Comprehensive Evaluation Results

Generated: 2026-04-21T07:13:30.059Z
Total Time: 198.4s
Suite: core
Models: 3
Scenarios: 3
Total evaluations: 9
LLM Judge: enabled

## Success Metrics

| Metric | Value |
|--------|-------|
| Overall Pass Rate | 66.7% |
| Memory-First Compliance | 66.7% |
| Tool Ordering Accuracy | 66.7% |
| Skill-First Rate | 66.7% |
| Avg Latency | 46.2s |
| p50 Latency | 59.2s |
| p95 Latency | 78.0s |

## LLM Judge Metrics

Average Score: 5.3/10

| Model | Judge Score |
|-------|-------------|
| claude-haiku-4.5 | 5.0/10 |
| gpt-5-mini | 5.7/10 |
| gemini-3-flash | 0.0/10 |

### Criteria Pass Rates

| Criterion | Pass Rate |
|-----------|-----------|
| appropriateFormat | 83% |
| citesGroundTruth | 100% |
| entityCorrect | 67% |
| factuallyAccurate | 0% |
| hasDebrief | 0% |
| isActionable | 17% |
| isCoherent | 67% |
| noContradictions | 100% |
| noHallucinations | 0% |
| personaMatch | 100% |

## Pass Rate by Model

| Model | Pass Rate | Memory-First | Tool Ordering | Avg Latency |
|-------|-----------|--------------|---------------|-------------|
| claude-haiku-4.5 | 100% | 100% | 100% | 62.2s |
| gpt-5-mini | 100% | 100% | 100% | 66.7s |
| gemini-3-flash | 0% | 0% | 0% | 9.7s |

## Pass Rate by Scenario

| Scenario | Pass Rate |
|----------|-----------|
| ⚠️ banker_vague_disco | 67% |
| ⚠️ vc_vague_openautoglm | 67% |
| ⚠️ cto_vague_quickjs | 67% |
