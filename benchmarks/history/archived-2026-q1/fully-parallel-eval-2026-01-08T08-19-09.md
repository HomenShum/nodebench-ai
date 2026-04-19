# Fully Parallel Evaluation Results

Generated: 2026-01-08T08:19:09.123Z
Total Time: 129.0s
Suite: core
Models: 5
Scenarios: 10
Total evaluations: 50

## Summary by Model

| Model | Total | Passed | Failed | Avg Time (s) |
|-------|-------|--------|--------|--------------|
| gpt-5-mini | 10 | 10 | 0 | 51.8 |
| gemini-3-flash | 10 | 10 | 0 | 18.6 |
| deepseek-v3.2 | 10 | 10 | 0 | 77.6 |
| qwen-2.5-72b | 10 | 0 | 10 | 4.1 |
| minimax-m2.1 | 10 | 10 | 0 | 27.5 |

## Summary by Scenario

| Scenario | Total | Passed | Failed |
|----------|-------|--------|--------|
| Banker vague outreach debrief | 5 | 4 | 1 |
| VC wedge from OSS signal | 5 | 4 | 1 |
| CTO risk exposure + patch plan | 5 | 4 | 1 |
| Exec vendor evaluation | 5 | 4 | 1 |
| Ecosystem second-order effects | 5 | 4 | 1 |
| Founder positioning vs incumbent | 5 | 4 | 1 |
| Academic literature anchor | 5 | 4 | 1 |
| Quant signal extraction | 5 | 4 | 1 |
| Product designer schema card | 5 | 4 | 1 |
| Sales engineer one-screen summary | 5 | 4 | 1 |

## Detailed Results

### gpt-5-mini

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 66.0 | - |
| VC wedge from OSS signal | ✅ PASS | 49.3 | - |
| CTO risk exposure + patch plan | ✅ PASS | 55.6 | - |
| Exec vendor evaluation | ✅ PASS | 46.7 | - |
| Ecosystem second-order effects | ✅ PASS | 44.1 | - |
| Founder positioning vs incumbent | ✅ PASS | 53.7 | - |
| Academic literature anchor | ✅ PASS | 36.4 | - |
| Quant signal extraction | ✅ PASS | 64.2 | - |
| Product designer schema card | ✅ PASS | 59.4 | - |
| Sales engineer one-screen summary | ✅ PASS | 42.9 | - |

### gemini-3-flash

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 15.6 | - |
| VC wedge from OSS signal | ✅ PASS | 19.4 | - |
| CTO risk exposure + patch plan | ✅ PASS | 17.4 | - |
| Exec vendor evaluation | ✅ PASS | 16.5 | - |
| Ecosystem second-order effects | ✅ PASS | 21.1 | - |
| Founder positioning vs incumbent | ✅ PASS | 21.5 | - |
| Academic literature anchor | ✅ PASS | 14.7 | - |
| Quant signal extraction | ✅ PASS | 19.4 | - |
| Product designer schema card | ✅ PASS | 17.4 | - |
| Sales engineer one-screen summary | ✅ PASS | 23.0 | - |

### deepseek-v3.2

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 50.4 | - |
| VC wedge from OSS signal | ✅ PASS | 38.9 | - |
| CTO risk exposure + patch plan | ✅ PASS | 82.4 | - |
| Exec vendor evaluation | ✅ PASS | 82.4 | - |
| Ecosystem second-order effects | ✅ PASS | 77.6 | - |
| Founder positioning vs incumbent | ✅ PASS | 129.0 | - |
| Academic literature anchor | ✅ PASS | 55.3 | - |
| Quant signal extraction | ✅ PASS | 47.4 | - |
| Product designer schema card | ✅ PASS | 128.6 | - |
| Sales engineer one-screen summary | ✅ PASS | 84.5 | - |

### qwen-2.5-72b

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ❌ FAIL | 4.0 | Missing [DEBRIEF_V1_JSON] block |
| VC wedge from OSS signal | ❌ FAIL | 4.0 | Missing [DEBRIEF_V1_JSON] block |
| CTO risk exposure + patch plan | ❌ FAIL | 4.0 | Missing [DEBRIEF_V1_JSON] block |
| Exec vendor evaluation | ❌ FAIL | 4.1 | Missing [DEBRIEF_V1_JSON] block |
| Ecosystem second-order effects | ❌ FAIL | 4.2 | Missing [DEBRIEF_V1_JSON] block |
| Founder positioning vs incumbent | ❌ FAIL | 4.1 | Missing [DEBRIEF_V1_JSON] block |
| Academic literature anchor | ❌ FAIL | 4.3 | Missing [DEBRIEF_V1_JSON] block |
| Quant signal extraction | ❌ FAIL | 4.2 | Missing [DEBRIEF_V1_JSON] block |
| Product designer schema card | ❌ FAIL | 4.0 | Missing [DEBRIEF_V1_JSON] block |
| Sales engineer one-screen summary | ❌ FAIL | 4.2 | Missing [DEBRIEF_V1_JSON] block |

### minimax-m2.1

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 18.7 | - |
| VC wedge from OSS signal | ✅ PASS | 23.6 | - |
| CTO risk exposure + patch plan | ✅ PASS | 16.6 | - |
| Exec vendor evaluation | ✅ PASS | 25.4 | - |
| Ecosystem second-order effects | ✅ PASS | 28.0 | - |
| Founder positioning vs incumbent | ✅ PASS | 74.2 | - |
| Academic literature anchor | ✅ PASS | 19.8 | - |
| Quant signal extraction | ✅ PASS | 22.9 | - |
| Product designer schema card | ✅ PASS | 24.4 | - |
| Sales engineer one-screen summary | ✅ PASS | 21.7 | - |

## Disclosure Metrics (P0 Instrumentation)

### Disclosure Level by Model

| Model | Full | Partial | None |
|-------|------|---------|------|
| gpt-5-mini | 0 | 0 | 10 |
| gemini-3-flash | 0 | 0 | 10 |
| deepseek-v3.2 | 0 | 0 | 10 |
| qwen-2.5-72b | 0 | 0 | 10 |
| minimax-m2.1 | 0 | 0 | 10 |

### Disclosure Warnings (Non-Scored)

> **Note:** These warnings are informational and do not affect pass/fail.
> They track progressive disclosure usage for Week 1-2 observability.

⚠️ [gpt-5-mini/banker_vague_disco] No skill search before tool invoke
⚠️ [gpt-5-mini/banker_vague_disco] No progressive disclosure meta-tools used
⚠️ [gpt-5-mini/vc_vague_openautoglm] No skill search before tool invoke
⚠️ [gpt-5-mini/vc_vague_openautoglm] No skill search for EARLY_STAGE_VC scenario
⚠️ [gpt-5-mini/vc_vague_openautoglm] No progressive disclosure meta-tools used
⚠️ [gpt-5-mini/cto_vague_quickjs] No skill search before tool invoke
⚠️ [gpt-5-mini/cto_vague_quickjs] No skill search for CTO_TECH_LEAD scenario
⚠️ [gpt-5-mini/cto_vague_quickjs] No progressive disclosure meta-tools used
⚠️ [gpt-5-mini/exec_vague_gemini] No skill search before tool invoke
⚠️ [gpt-5-mini/exec_vague_gemini] No skill search for ENTERPRISE_EXEC scenario
⚠️ [gpt-5-mini/exec_vague_gemini] No progressive disclosure meta-tools used
⚠️ [gpt-5-mini/ecosystem_vague_soundcloud] No skill search before tool invoke
⚠️ [gpt-5-mini/ecosystem_vague_soundcloud] No skill search for ECOSYSTEM_PARTNER scenario
⚠️ [gpt-5-mini/ecosystem_vague_soundcloud] No progressive disclosure meta-tools used
⚠️ [gpt-5-mini/founder_salesforce_positioning] No skill search before tool invoke
⚠️ [gpt-5-mini/founder_salesforce_positioning] No skill search for FOUNDER_STRATEGY scenario
⚠️ [gpt-5-mini/founder_salesforce_positioning] No progressive disclosure meta-tools used
⚠️ [gpt-5-mini/academic_ryr2_anchor] No skill search before tool invoke
⚠️ [gpt-5-mini/academic_ryr2_anchor] No skill search for ACADEMIC_RD scenario
⚠️ [gpt-5-mini/academic_ryr2_anchor] No progressive disclosure meta-tools used
⚠️ [gpt-5-mini/quant_disco_signal] No skill search before tool invoke
⚠️ [gpt-5-mini/quant_disco_signal] No skill search for QUANT_ANALYST scenario
⚠️ [gpt-5-mini/quant_disco_signal] No progressive disclosure meta-tools used
⚠️ [gpt-5-mini/product_disco_card] No skill search before tool invoke
⚠️ [gpt-5-mini/product_disco_card] No skill search for PRODUCT_DESIGNER scenario
⚠️ [gpt-5-mini/product_disco_card] No progressive disclosure meta-tools used
⚠️ [gpt-5-mini/sales_disco_onepager] No skill search before tool invoke
⚠️ [gpt-5-mini/sales_disco_onepager] No skill search for SALES_ENGINEER scenario
⚠️ [gpt-5-mini/sales_disco_onepager] No progressive disclosure meta-tools used
⚠️ [gemini-3-flash/banker_vague_disco] No skill search before tool invoke
⚠️ [gemini-3-flash/banker_vague_disco] No progressive disclosure meta-tools used
⚠️ [gemini-3-flash/vc_vague_openautoglm] No skill search before tool invoke
⚠️ [gemini-3-flash/vc_vague_openautoglm] No skill search for EARLY_STAGE_VC scenario
⚠️ [gemini-3-flash/vc_vague_openautoglm] No progressive disclosure meta-tools used
⚠️ [gemini-3-flash/cto_vague_quickjs] No skill search before tool invoke
⚠️ [gemini-3-flash/cto_vague_quickjs] No skill search for CTO_TECH_LEAD scenario
⚠️ [gemini-3-flash/cto_vague_quickjs] No progressive disclosure meta-tools used
⚠️ [gemini-3-flash/exec_vague_gemini] No skill search before tool invoke
⚠️ [gemini-3-flash/exec_vague_gemini] No skill search for ENTERPRISE_EXEC scenario
⚠️ [gemini-3-flash/exec_vague_gemini] No progressive disclosure meta-tools used
⚠️ [gemini-3-flash/ecosystem_vague_soundcloud] No skill search before tool invoke
⚠️ [gemini-3-flash/ecosystem_vague_soundcloud] No skill search for ECOSYSTEM_PARTNER scenario
⚠️ [gemini-3-flash/ecosystem_vague_soundcloud] No progressive disclosure meta-tools used
⚠️ [gemini-3-flash/founder_salesforce_positioning] No skill search before tool invoke
⚠️ [gemini-3-flash/founder_salesforce_positioning] No skill search for FOUNDER_STRATEGY scenario
⚠️ [gemini-3-flash/founder_salesforce_positioning] No progressive disclosure meta-tools used
⚠️ [gemini-3-flash/academic_ryr2_anchor] No skill search before tool invoke
⚠️ [gemini-3-flash/academic_ryr2_anchor] No skill search for ACADEMIC_RD scenario
⚠️ [gemini-3-flash/academic_ryr2_anchor] No progressive disclosure meta-tools used
⚠️ [gemini-3-flash/quant_disco_signal] No skill search before tool invoke
... and 73 more warnings
