# Fully Parallel Evaluation Results

Generated: 2026-01-07T09:18:35.974Z
Total Time: 56.3s
Suite: core
Models: 3
Scenarios: 3
Total evaluations: 9

## Summary by Model

| Model | Total | Passed | Failed | Avg Time (s) |
|-------|-------|--------|--------|--------------|
| gpt-5-mini | 3 | 2 | 1 | 52.7 |
| claude-haiku-4.5 | 3 | 1 | 2 | 49.4 |
| gemini-3-flash | 3 | 2 | 1 | 15.2 |

## Summary by Scenario

| Scenario | Total | Passed | Failed |
|----------|-------|--------|--------|
| Banker vague outreach debrief | 3 | 1 | 2 |
| CTO risk exposure + patch plan | 3 | 3 | 0 |
| Exec vendor evaluation | 3 | 1 | 2 |

## Detailed Results

### gpt-5-mini

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 51.7 | - |
| CTO risk exposure + patch plan | ✅ PASS | 56.3 | - |
| Exec vendor evaluation | ❌ FAIL | 50.2 | persona mismatch: got JPM_STARTUP_BANKER expected ENTERPRISE_EXEC |

### claude-haiku-4.5

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ❌ FAIL | 49.0 | Invalid JSON: Expected ',' or ']' after array element in JSON at position 1112 |
| CTO risk exposure + patch plan | ✅ PASS | 54.5 | - |
| Exec vendor evaluation | ❌ FAIL | 44.8 | persona mismatch: got JPM_STARTUP_BANKER expected ENTERPRISE_EXEC |

### gemini-3-flash

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ❌ FAIL | 16.3 | contact.email missing or mismatched |
| CTO risk exposure + patch plan | ✅ PASS | 15.7 | - |
| Exec vendor evaluation | ✅ PASS | 13.5 | - |
