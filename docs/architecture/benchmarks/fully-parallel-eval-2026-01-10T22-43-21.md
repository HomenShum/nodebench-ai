# Fully Parallel Evaluation Results

Generated: 2026-01-10T22:43:21.628Z
Total Time: 175.2s
Suite: pack
Models: 1
Scenarios: 1 of 100 (limit=1)
Total evaluations: 1

## Summary by Model

| Model | Total | Passed | Failed | Avg Time (s) |
|-------|-------|--------|--------|--------------|
| gpt-5-mini | 1 | 0 | 1 | 175.2 |

## Summary by Scenario

| Scenario | Total | Passed | Failed |
|----------|-------|--------|--------|
| Financial: Tesla 2024 Revenue | 1 | 0 | 1 |

## Detailed Results

### gpt-5-mini

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Financial: Tesla 2024 Revenue | ❌ FAIL | 175.2 | persona mismatch: got QUANT_ANALYST expected JPM_STARTUP_BANKER |

## Disclosure Metrics (P0 Instrumentation)

### Disclosure Level by Model

| Model | Full | Partial | None |
|-------|------|---------|------|
| gpt-5-mini | 0 | 0 | 1 |

### Disclosure Warnings (Non-Scored)

> **Note:** These warnings are informational and do not affect pass/fail.
> They track progressive disclosure usage for Week 1-2 observability.

⚠️ [gpt-5-mini/fin_revenue_tesla_2024] No skill search before tool invoke
⚠️ [gpt-5-mini/fin_revenue_tesla_2024] No progressive disclosure meta-tools used
