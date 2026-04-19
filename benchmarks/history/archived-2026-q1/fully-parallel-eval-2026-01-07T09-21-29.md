# Fully Parallel Evaluation Results

Generated: 2026-01-07T09:21:29.509Z
Total Time: 83.9s
Suite: core
Models: 3
Scenarios: 10
Total evaluations: 30

## Summary by Model

| Model | Total | Passed | Failed | Avg Time (s) |
|-------|-------|--------|--------|--------------|
| gpt-5-mini | 10 | 2 | 8 | 46.7 |
| claude-haiku-4.5 | 10 | 8 | 2 | 52.5 |
| gemini-3-flash | 10 | 7 | 3 | 21.5 |

## Summary by Scenario

| Scenario | Total | Passed | Failed |
|----------|-------|--------|--------|
| Banker vague outreach debrief | 3 | 2 | 1 |
| VC wedge from OSS signal | 3 | 2 | 1 |
| CTO risk exposure + patch plan | 3 | 3 | 0 |
| Exec vendor evaluation | 3 | 1 | 2 |
| Ecosystem second-order effects | 3 | 2 | 1 |
| Founder positioning vs incumbent | 3 | 1 | 2 |
| Academic literature anchor | 3 | 2 | 1 |
| Quant signal extraction | 3 | 1 | 2 |
| Product designer schema card | 3 | 2 | 1 |
| Sales engineer one-screen summary | 3 | 1 | 2 |

## Detailed Results

### gpt-5-mini

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 34.5 | - |
| VC wedge from OSS signal | ❌ FAIL | 38.5 | persona mismatch: got JPM_STARTUP_BANKER expected EARLY_STAGE_VC |
| CTO risk exposure + patch plan | ✅ PASS | 46.4 | - |
| Exec vendor evaluation | ❌ FAIL | 41.2 | persona mismatch: got JPM_STARTUP_BANKER expected ENTERPRISE_EXEC |
| Ecosystem second-order effects | ❌ FAIL | 51.0 | persona mismatch: got JPM_STARTUP_BANKER expected ECOSYSTEM_PARTNER |
| Founder positioning vs incumbent | ❌ FAIL | 83.9 | persona mismatch: got JPM_STARTUP_BANKER expected FOUNDER_STRATEGY |
| Academic literature anchor | ❌ FAIL | 49.9 | persona mismatch: got JPM_STARTUP_BANKER expected ACADEMIC_RD |
| Quant signal extraction | ❌ FAIL | 35.2 | persona mismatch: got JPM_STARTUP_BANKER expected QUANT_ANALYST |
| Product designer schema card | ❌ FAIL | 51.4 | persona mismatch: got JPM_STARTUP_BANKER expected PRODUCT_DESIGNER |
| Sales engineer one-screen summary | ❌ FAIL | 35.2 | persona mismatch: got JPM_STARTUP_BANKER expected SALES_ENGINEER |

### claude-haiku-4.5

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 57.9 | - |
| VC wedge from OSS signal | ✅ PASS | 57.7 | - |
| CTO risk exposure + patch plan | ✅ PASS | 61.2 | - |
| Exec vendor evaluation | ❌ FAIL | 57.6 | persona mismatch: got JPM_STARTUP_BANKER expected ENTERPRISE_EXEC |
| Ecosystem second-order effects | ✅ PASS | 52.3 | - |
| Founder positioning vs incumbent | ❌ FAIL | 10.3 | Missing [DEBRIEF_V1_JSON] block |
| Academic literature anchor | ✅ PASS | 60.3 | - |
| Quant signal extraction | ✅ PASS | 65.6 | - |
| Product designer schema card | ✅ PASS | 39.0 | - |
| Sales engineer one-screen summary | ✅ PASS | 63.5 | - |

### gemini-3-flash

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ❌ FAIL | 15.8 | contact.email missing or mismatched |
| VC wedge from OSS signal | ✅ PASS | 15.8 | - |
| CTO risk exposure + patch plan | ✅ PASS | 15.5 | - |
| Exec vendor evaluation | ✅ PASS | 14.3 | - |
| Ecosystem second-order effects | ✅ PASS | 16.3 | - |
| Founder positioning vs incumbent | ✅ PASS | 77.7 | - |
| Academic literature anchor | ✅ PASS | 13.8 | - |
| Quant signal extraction | ❌ FAIL | 16.4 | contact.email missing or mismatched |
| Product designer schema card | ✅ PASS | 12.9 | - |
| Sales engineer one-screen summary | ❌ FAIL | 16.8 | contact.email missing or mismatched |
