# Comprehensive Evaluation Results

Generated: 2026-04-21T08:02:55.808Z
Total Time: 231.9s
Suite: core
Models: 3
Scenarios: 3
Total evaluations: 9
LLM Judge: enabled

## Success Metrics

| Metric | Value |
|--------|-------|
| Overall Pass Rate | 55.6% |
| Memory-First Compliance | 55.6% |
| Tool Ordering Accuracy | 55.6% |
| Skill-First Rate | 55.6% |
| Avg Latency | 56.8s |
| p50 Latency | 62.6s |
| p95 Latency | 138.5s |

## LLM Judge Metrics

Average Score: 6.0/10

| Model | Judge Score |
|-------|-------------|
| claude-haiku-4.5 | 6.0/10 |
| gpt-5-mini | 6.0/10 |
| gemini-3-flash | 0.0/10 |

### Criteria Pass Rates

| Criterion | Pass Rate |
|-----------|-----------|
| appropriateFormat | 100% |
| citesGroundTruth | 100% |
| entityCorrect | 80% |
| factuallyAccurate | 0% |
| hasDebrief | 0% |
| isActionable | 20% |
| isCoherent | 100% |
| noContradictions | 100% |
| noHallucinations | 0% |
| personaMatch | 100% |

## Pass Rate by Model

| Model | Pass Rate | Memory-First | Tool Ordering | Avg Latency |
|-------|-----------|--------------|---------------|-------------|
| claude-haiku-4.5 | 67% | 67% | 67% | 96.4s |
| gpt-5-mini | 100% | 100% | 100% | 64.4s |
| gemini-3-flash | 0% | 0% | 0% | 9.6s |

## Pass Rate by Scenario

| Scenario | Pass Rate |
|----------|-----------|
| ⚠️ banker_vague_disco | 67% |
| ❌ vc_vague_openautoglm | 33% |
| ⚠️ cto_vague_quickjs | 67% |
