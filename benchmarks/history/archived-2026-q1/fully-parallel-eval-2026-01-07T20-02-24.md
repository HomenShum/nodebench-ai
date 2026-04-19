# Fully Parallel Evaluation Results

Generated: 2026-01-07T20:02:24.402Z
Total Time: 90.8s
Suite: core
Models: 3
Scenarios: 10
Total evaluations: 30

## Summary by Model

| Model | Total | Passed | Failed | Avg Time (s) |
|-------|-------|--------|--------|--------------|
| gpt-5-mini | 10 | 10 | 0 | 47.3 |
| claude-haiku-4.5 | 10 | 7 | 3 | 31.0 |
| gemini-3-flash | 10 | 10 | 0 | 18.8 |

## Summary by Scenario

| Scenario | Total | Passed | Failed |
|----------|-------|--------|--------|
| Banker vague outreach debrief | 3 | 2 | 1 |
| VC wedge from OSS signal | 3 | 3 | 0 |
| CTO risk exposure + patch plan | 3 | 3 | 0 |
| Exec vendor evaluation | 3 | 3 | 0 |
| Ecosystem second-order effects | 3 | 3 | 0 |
| Founder positioning vs incumbent | 3 | 2 | 1 |
| Academic literature anchor | 3 | 3 | 0 |
| Quant signal extraction | 3 | 2 | 1 |
| Product designer schema card | 3 | 3 | 0 |
| Sales engineer one-screen summary | 3 | 3 | 0 |

## Detailed Results

### gpt-5-mini

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 39.4 | - |
| VC wedge from OSS signal | ✅ PASS | 35.8 | - |
| CTO risk exposure + patch plan | ✅ PASS | 44.6 | - |
| Exec vendor evaluation | ✅ PASS | 30.7 | - |
| Ecosystem second-order effects | ✅ PASS | 42.3 | - |
| Founder positioning vs incumbent | ✅ PASS | 90.7 | - |
| Academic literature anchor | ✅ PASS | 50.8 | - |
| Quant signal extraction | ✅ PASS | 59.7 | - |
| Product designer schema card | ✅ PASS | 44.5 | - |
| Sales engineer one-screen summary | ✅ PASS | 34.5 | - |

### claude-haiku-4.5

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ❌ FAIL | 20.1 | funding.stage mismatch: got 'N/A' expected 'Seed' |
| VC wedge from OSS signal | ✅ PASS | 22.8 | - |
| CTO risk exposure + patch plan | ✅ PASS | 23.3 | - |
| Exec vendor evaluation | ✅ PASS | 24.1 | - |
| Ecosystem second-order effects | ✅ PASS | 81.8 | - |
| Founder positioning vs incumbent | ❌ FAIL | 55.7 | hqLocation does not match ground truth |
| Academic literature anchor | ✅ PASS | 18.4 | - |
| Quant signal extraction | ❌ FAIL | 21.5 | funding.stage mismatch: got 'N/A' expected 'Seed' |
| Product designer schema card | ✅ PASS | 23.6 | - |
| Sales engineer one-screen summary | ✅ PASS | 18.9 | - |

### gemini-3-flash

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 15.0 | - |
| VC wedge from OSS signal | ✅ PASS | 17.7 | - |
| CTO risk exposure + patch plan | ✅ PASS | 14.1 | - |
| Exec vendor evaluation | ✅ PASS | 14.0 | - |
| Ecosystem second-order effects | ✅ PASS | 15.5 | - |
| Founder positioning vs incumbent | ✅ PASS | 35.9 | - |
| Academic literature anchor | ✅ PASS | 14.7 | - |
| Quant signal extraction | ✅ PASS | 15.4 | - |
| Product designer schema card | ✅ PASS | 22.1 | - |
| Sales engineer one-screen summary | ✅ PASS | 23.6 | - |
