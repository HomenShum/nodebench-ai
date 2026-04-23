# Comprehensive Evaluation Results

Generated: 2026-04-21T07:00:26.826Z
Total Time: 231.5s
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
| Avg Latency | 49.4s |
| p50 Latency | 58.0s |
| p95 Latency | 122.1s |

## LLM Judge Metrics

Average Score: 5.2/10

| Model | Judge Score |
|-------|-------------|
| claude-haiku-4.5 | 5.0/10 |
| gpt-5-mini | 5.3/10 |
| gemini-3-flash | 0.0/10 |

### Criteria Pass Rates

| Criterion | Pass Rate |
|-----------|-----------|
| appropriateFormat | 100% |
| citesGroundTruth | 83% |
| entityCorrect | 67% |
| factuallyAccurate | 0% |
| hasDebrief | 0% |
| isActionable | 17% |
| isCoherent | 50% |
| noContradictions | 100% |
| noHallucinations | 0% |
| personaMatch | 100% |

## Pass Rate by Model

| Model | Pass Rate | Memory-First | Tool Ordering | Avg Latency |
|-------|-----------|--------------|---------------|-------------|
| claude-haiku-4.5 | 100% | 100% | 100% | 72.9s |
| gpt-5-mini | 100% | 100% | 100% | 64.5s |
| gemini-3-flash | 0% | 0% | 0% | 10.7s |

## Pass Rate by Scenario

| Scenario | Pass Rate |
|----------|-----------|
| ⚠️ banker_vague_disco | 67% |
| ⚠️ vc_vague_openautoglm | 67% |
| ⚠️ cto_vague_quickjs | 67% |
