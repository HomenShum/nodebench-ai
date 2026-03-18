# Fully Parallel Evaluation Results

Generated: 2026-01-07T20:13:28.528Z
Total Time: 67.7s
Suite: core
Models: 3
Scenarios: 10
Total evaluations: 30

## Summary by Model

| Model | Total | Passed | Failed | Avg Time (s) |
|-------|-------|--------|--------|--------------|
| gpt-5-mini | 10 | 9 | 1 | 47.9 |
| claude-haiku-4.5 | 10 | 9 | 1 | 24.4 |
| gemini-3-flash | 10 | 10 | 0 | 17.8 |

## Summary by Scenario

| Scenario | Total | Passed | Failed |
|----------|-------|--------|--------|
| Banker vague outreach debrief | 3 | 3 | 0 |
| VC wedge from OSS signal | 3 | 3 | 0 |
| CTO risk exposure + patch plan | 3 | 3 | 0 |
| Exec vendor evaluation | 3 | 3 | 0 |
| Ecosystem second-order effects | 3 | 3 | 0 |
| Founder positioning vs incumbent | 3 | 1 | 2 |
| Academic literature anchor | 3 | 3 | 0 |
| Quant signal extraction | 3 | 3 | 0 |
| Product designer schema card | 3 | 3 | 0 |
| Sales engineer one-screen summary | 3 | 3 | 0 |

## Detailed Results

### gpt-5-mini

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 65.0 | - |
| VC wedge from OSS signal | ✅ PASS | 62.5 | - |
| CTO risk exposure + patch plan | ✅ PASS | 39.0 | - |
| Exec vendor evaluation | ✅ PASS | 30.7 | - |
| Ecosystem second-order effects | ✅ PASS | 41.9 | - |
| Founder positioning vs incumbent | ❌ FAIL | 67.7 | hqLocation does not match ground truth |
| Academic literature anchor | ✅ PASS | 33.2 | - |
| Quant signal extraction | ✅ PASS | 50.5 | - |
| Product designer schema card | ✅ PASS | 53.2 | - |
| Sales engineer one-screen summary | ✅ PASS | 34.8 | - |

### claude-haiku-4.5

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 22.8 | - |
| VC wedge from OSS signal | ✅ PASS | 20.2 | - |
| CTO risk exposure + patch plan | ✅ PASS | 18.0 | - |
| Exec vendor evaluation | ✅ PASS | 15.6 | - |
| Ecosystem second-order effects | ✅ PASS | 43.6 | - |
| Founder positioning vs incumbent | ❌ FAIL | 44.0 | hqLocation does not match ground truth |
| Academic literature anchor | ✅ PASS | 22.1 | - |
| Quant signal extraction | ✅ PASS | 26.6 | - |
| Product designer schema card | ✅ PASS | 16.0 | - |
| Sales engineer one-screen summary | ✅ PASS | 15.1 | - |

### gemini-3-flash

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 17.5 | - |
| VC wedge from OSS signal | ✅ PASS | 17.0 | - |
| CTO risk exposure + patch plan | ✅ PASS | 21.6 | - |
| Exec vendor evaluation | ✅ PASS | 15.8 | - |
| Ecosystem second-order effects | ✅ PASS | 18.7 | - |
| Founder positioning vs incumbent | ✅ PASS | 24.9 | - |
| Academic literature anchor | ✅ PASS | 13.7 | - |
| Quant signal extraction | ✅ PASS | 16.0 | - |
| Product designer schema card | ✅ PASS | 16.0 | - |
| Sales engineer one-screen summary | ✅ PASS | 16.4 | - |
