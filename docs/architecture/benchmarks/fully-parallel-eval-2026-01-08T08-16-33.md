# Fully Parallel Evaluation Results

Generated: 2026-01-08T08:16:33.473Z
Total Time: 133.9s
Suite: core
Models: 1
Scenarios: 1
Total evaluations: 1

## Summary by Model

| Model | Total | Passed | Failed | Avg Time (s) |
|-------|-------|--------|--------|--------------|
| deepseek-v3.2 | 1 | 1 | 0 | 133.9 |

## Summary by Scenario

| Scenario | Total | Passed | Failed |
|----------|-------|--------|--------|
| Banker vague outreach debrief | 1 | 1 | 0 |

## Detailed Results

### deepseek-v3.2

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 133.9 | - |

## Disclosure Metrics (P0 Instrumentation)

### Disclosure Level by Model

| Model | Full | Partial | None |
|-------|------|---------|------|
| deepseek-v3.2 | 0 | 0 | 1 |

### Disclosure Warnings (Non-Scored)

> **Note:** These warnings are informational and do not affect pass/fail.
> They track progressive disclosure usage for Week 1-2 observability.

⚠️ [deepseek-v3.2/banker_vague_disco] No skill search before tool invoke
⚠️ [deepseek-v3.2/banker_vague_disco] No progressive disclosure meta-tools used
