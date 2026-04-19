# Fully Parallel Evaluation Results

Generated: 2026-01-07T09:21:45.746Z
Total Time: 168.2s
Suite: core
Models: 3
Scenarios: 3
Total evaluations: 9

## Summary by Model

| Model | Total | Passed | Failed | Avg Time (s) |
|-------|-------|--------|--------|--------------|
| gpt-5-mini | 3 | 2 | 1 | 45.4 |
| claude-haiku-4.5 | 3 | 0 | 3 | 105.9 |
| gemini-3-flash | 3 | 2 | 1 | 14.9 |

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
| Banker vague outreach debrief | ✅ PASS | 38.9 | - |
| CTO risk exposure + patch plan | ✅ PASS | 60.6 | - |
| Exec vendor evaluation | ❌ FAIL | 36.8 | persona mismatch: got JPM_STARTUP_BANKER expected ENTERPRISE_EXEC |

### claude-haiku-4.5

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ❌ FAIL | 89.6 | Missing [DEBRIEF_V1_JSON] block |
| CTO risk exposure + patch plan | ❌ FAIL | 168.2 | entity mismatch: got resolvedId='N/A' canonical='MQUICKJS' expected 'MQUICKJS' |
| Exec vendor evaluation | ❌ FAIL | 59.8 | Missing [DEBRIEF_V1_JSON] block |

### gemini-3-flash

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ❌ FAIL | 15.8 | contact.email missing or mismatched |
| CTO risk exposure + patch plan | ✅ PASS | 15.4 | - |
| Exec vendor evaluation | ✅ PASS | 13.4 | - |
