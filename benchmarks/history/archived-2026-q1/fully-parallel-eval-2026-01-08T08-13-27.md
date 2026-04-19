# Fully Parallel Evaluation Results

Generated: 2026-01-08T08:13:27.262Z
Total Time: 1.8s
Suite: core
Models: 2
Scenarios: 1
Total evaluations: 2

## Summary by Model

| Model | Total | Passed | Failed | Avg Time (s) |
|-------|-------|--------|--------|--------------|
| deepseek-v3.2 | 1 | 0 | 1 | 1.7 |
| qwen-2.5-72b | 1 | 0 | 1 | 1.8 |

## Summary by Scenario

| Scenario | Total | Passed | Failed |
|----------|-------|--------|--------|
| Banker vague outreach debrief | 2 | 0 | 2 |

## Detailed Results

### deepseek-v3.2

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ❌ FAIL | 1.7 | Missing [DEBRIEF_V1_JSON] block |

### qwen-2.5-72b

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ❌ FAIL | 1.8 | Missing [DEBRIEF_V1_JSON] block |

## Disclosure Metrics (P0 Instrumentation)

### Disclosure Level by Model

| Model | Full | Partial | None |
|-------|------|---------|------|
| deepseek-v3.2 | 0 | 0 | 1 |
| qwen-2.5-72b | 0 | 0 | 1 |

### Disclosure Warnings (Non-Scored)

✅ No disclosure warnings generated.
