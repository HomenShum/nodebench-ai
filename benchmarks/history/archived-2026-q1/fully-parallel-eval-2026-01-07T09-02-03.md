# Fully Parallel Evaluation Results

Generated: 2026-01-07T09:02:03.899Z
Total Time: 65.6s
Suite: core
Models: 3
Scenarios: 3
Total evaluations: 9

## Summary by Model

| Model | Total | Passed | Failed | Avg Time (s) |
|-------|-------|--------|--------|--------------|
| gpt-5-mini | 3 | 1 | 2 | 43.7 |
| claude-haiku-4.5 | 3 | 1 | 2 | 47.3 |
| gemini-3-flash | 3 | 2 | 1 | 13.8 |

## Summary by Scenario

| Scenario | Total | Passed | Failed |
|----------|-------|--------|--------|
| Banker vague outreach debrief | 3 | 1 | 2 |
| CTO risk exposure + patch plan | 3 | 2 | 1 |
| Exec vendor evaluation | 3 | 1 | 2 |

## Detailed Results

### gpt-5-mini

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ❌ FAIL | 30.7 | contact.email missing or mismatched |
| CTO risk exposure + patch plan | ✅ PASS | 58.7 | - |
| Exec vendor evaluation | ❌ FAIL | 41.7 | persona mismatch: got JPM_STARTUP_BANKER expected ENTERPRISE_EXEC |

### claude-haiku-4.5

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 64.0 | - |
| CTO risk exposure + patch plan | ❌ FAIL | 65.5 | Invalid JSON: Expected ',' or ']' after array element in JSON at position 1189 |
| Exec vendor evaluation | ❌ FAIL | 12.5 | Missing [DEBRIEF_V1_JSON] block |

### gemini-3-flash

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ❌ FAIL | 15.1 | contact.email missing or mismatched |
| CTO risk exposure + patch plan | ✅ PASS | 12.3 | - |
| Exec vendor evaluation | ✅ PASS | 14.0 | - |
