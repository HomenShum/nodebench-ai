# Fully Parallel Evaluation Results

Generated: 2026-01-10T22:29:45.816Z
Total Time: 23.3s
Suite: pack
Models: 1
Scenarios: 1 of 100 (limit=1)
Total evaluations: 1

## Summary by Model

| Model | Total | Passed | Failed | Avg Time (s) |
|-------|-------|--------|--------|--------------|
| mimo-v2-flash-free | 1 | 0 | 1 | 23.3 |

## Summary by Scenario

| Scenario | Total | Passed | Failed |
|----------|-------|--------|--------|
| Financial: Tesla 2024 Revenue | 1 | 0 | 1 |

## Detailed Results

### mimo-v2-flash-free

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Financial: Tesla 2024 Revenue | ❌ FAIL | 23.3 | persona mismatch: got QUANT_ANALYST expected JPM_STARTUP_BANKER |

## Disclosure Metrics (P0 Instrumentation)

### Disclosure Level by Model

| Model | Full | Partial | None |
|-------|------|---------|------|
| mimo-v2-flash-free | 0 | 0 | 1 |

### Disclosure Warnings (Non-Scored)

> **Note:** These warnings are informational and do not affect pass/fail.
> They track progressive disclosure usage for Week 1-2 observability.

⚠️ [mimo-v2-flash-free/fin_revenue_tesla_2024] No skill search before tool invoke
⚠️ [mimo-v2-flash-free/fin_revenue_tesla_2024] No progressive disclosure meta-tools used
