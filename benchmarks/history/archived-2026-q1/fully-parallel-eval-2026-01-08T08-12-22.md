# Fully Parallel Evaluation Results

Generated: 2026-01-08T08:12:22.325Z
Total Time: 3.8s
Suite: core
Models: 2
Scenarios: 2
Total evaluations: 4

## Summary by Model

| Model | Total | Passed | Failed | Avg Time (s) |
|-------|-------|--------|--------|--------------|
| deepseek-v3.2 | 2 | 0 | 2 | 3.5 |
| qwen-2.5-72b | 2 | 0 | 2 | 3.7 |

## Summary by Scenario

| Scenario | Total | Passed | Failed |
|----------|-------|--------|--------|
| Banker vague outreach debrief | 2 | 0 | 2 |
| VC wedge from OSS signal | 2 | 0 | 2 |

## Detailed Results

### deepseek-v3.2

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ❌ FAIL | 3.5 | Missing [DEBRIEF_V1_JSON] block |
| VC wedge from OSS signal | ❌ FAIL | 3.5 | Missing [DEBRIEF_V1_JSON] block |

### qwen-2.5-72b

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ❌ FAIL | 3.8 | Missing [DEBRIEF_V1_JSON] block |
| VC wedge from OSS signal | ❌ FAIL | 3.5 | Missing [DEBRIEF_V1_JSON] block |

## Disclosure Metrics (P0 Instrumentation)

### Disclosure Level by Model

| Model | Full | Partial | None |
|-------|------|---------|------|
| deepseek-v3.2 | 0 | 0 | 2 |
| qwen-2.5-72b | 0 | 0 | 2 |

### Disclosure Warnings (Non-Scored)

> **Note:** These warnings are informational and do not affect pass/fail.
> They track progressive disclosure usage for Week 1-2 observability.

⚠️ [deepseek-v3.2/vc_vague_openautoglm] No skill search for EARLY_STAGE_VC scenario
⚠️ [qwen-2.5-72b/vc_vague_openautoglm] No skill search for EARLY_STAGE_VC scenario
