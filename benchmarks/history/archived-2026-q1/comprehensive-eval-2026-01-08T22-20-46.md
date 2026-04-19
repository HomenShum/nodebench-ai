# Comprehensive Evaluation Results

Generated: 2026-01-08T22:20:46.364Z
Total Time: 26.2s
Suite: core
Models: 2
Scenarios: 3
Total evaluations: 6
LLM Judge: enabled

## Success Metrics

| Metric | Value |
|--------|-------|
| Overall Pass Rate | 100.0% |
| Memory-First Compliance | 0.0% |
| Tool Ordering Accuracy | 0.0% |
| Skill-First Rate | 0.0% |
| Avg Latency | 17.9s |
| p50 Latency | 18.5s |
| p95 Latency | 20.2s |

## LLM Judge Metrics

Average Score: 6.0/10

| Model | Judge Score |
|-------|-------------|
| claude-haiku-4.5 | 6.0/10 |
| gemini-3-flash | 6.0/10 |

### Criteria Pass Rates

| Criterion | Pass Rate |
|-----------|-----------|
| appropriateFormat | 83% |
| citesGroundTruth | 100% |
| entityCorrect | 83% |
| factuallyAccurate | 0% |
| hasDebrief | 0% |
| isActionable | 67% |
| isCoherent | 33% |
| noContradictions | 50% |
| noHallucinations | 100% |
| personaMatch | 83% |

## Pass Rate by Model

| Model | Pass Rate | Memory-First | Tool Ordering | Avg Latency |
|-------|-----------|--------------|---------------|-------------|
| claude-haiku-4.5 | 100% | 0% | 0% | 19.4s |
| gemini-3-flash | 100% | 0% | 0% | 16.4s |

## Pass Rate by Scenario

| Scenario | Pass Rate |
|----------|-----------|
| ✅ banker_vague_disco | 100% |
| ✅ vc_vague_openautoglm | 100% |
| ✅ cto_vague_quickjs | 100% |
