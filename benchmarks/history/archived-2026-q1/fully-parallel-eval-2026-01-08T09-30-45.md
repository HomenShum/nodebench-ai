# Fully Parallel Evaluation Results

Generated: 2026-01-08T09:30:45.421Z
Total Time: 199.6s
Suite: core
Models: 7
Scenarios: 10
Total evaluations: 70

## Summary by Model

| Model | Total | Passed | Failed | Avg Time (s) |
|-------|-------|--------|--------|--------------|
| claude-haiku-4.5 | 10 | 0 | 10 | 2.2 |
| gpt-5-mini | 10 | 9 | 1 | 46.2 |
| gemini-3-flash | 10 | 10 | 0 | 14.9 |
| deepseek-v3.2 | 10 | 8 | 2 | 90.9 |
| minimax-m2.1 | 10 | 10 | 0 | 24.8 |
| qwen3-235b | 10 | 8 | 2 | 17.2 |
| deepseek-r1 | 10 | 9 | 1 | 55.1 |

## Summary by Scenario

| Scenario | Total | Passed | Failed |
|----------|-------|--------|--------|
| Banker vague outreach debrief | 7 | 6 | 1 |
| VC wedge from OSS signal | 7 | 5 | 2 |
| CTO risk exposure + patch plan | 7 | 6 | 1 |
| Exec vendor evaluation | 7 | 6 | 1 |
| Ecosystem second-order effects | 7 | 5 | 2 |
| Founder positioning vs incumbent | 7 | 5 | 2 |
| Academic literature anchor | 7 | 6 | 1 |
| Quant signal extraction | 7 | 5 | 2 |
| Product designer schema card | 7 | 4 | 3 |
| Sales engineer one-screen summary | 7 | 6 | 1 |

## Detailed Results

### claude-haiku-4.5

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ❌ FAIL | 2.1 | Missing [DEBRIEF_V1_JSON] block |
| VC wedge from OSS signal | ❌ FAIL | 2.3 | Missing [DEBRIEF_V1_JSON] block |
| CTO risk exposure + patch plan | ❌ FAIL | 2.3 | Missing [DEBRIEF_V1_JSON] block |
| Exec vendor evaluation | ❌ FAIL | 2.3 | Missing [DEBRIEF_V1_JSON] block |
| Ecosystem second-order effects | ❌ FAIL | 2.3 | Missing [DEBRIEF_V1_JSON] block |
| Founder positioning vs incumbent | ❌ FAIL | 2.1 | Missing [DEBRIEF_V1_JSON] block |
| Academic literature anchor | ❌ FAIL | 2.6 | Missing [DEBRIEF_V1_JSON] block |
| Quant signal extraction | ❌ FAIL | 2.0 | Missing [DEBRIEF_V1_JSON] block |
| Product designer schema card | ❌ FAIL | 2.1 | Missing [DEBRIEF_V1_JSON] block |
| Sales engineer one-screen summary | ❌ FAIL | 1.9 | Missing [DEBRIEF_V1_JSON] block |

### gpt-5-mini

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 50.0 | - |
| VC wedge from OSS signal | ✅ PASS | 46.0 | - |
| CTO risk exposure + patch plan | ✅ PASS | 47.3 | - |
| Exec vendor evaluation | ✅ PASS | 26.5 | - |
| Ecosystem second-order effects | ✅ PASS | 47.1 | - |
| Founder positioning vs incumbent | ✅ PASS | 51.5 | - |
| Academic literature anchor | ✅ PASS | 51.1 | - |
| Quant signal extraction | ✅ PASS | 54.6 | - |
| Product designer schema card | ❌ FAIL | 54.7 | Missing [DEBRIEF_V1_JSON] block |
| Sales engineer one-screen summary | ✅ PASS | 33.2 | - |

### gemini-3-flash

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 20.0 | - |
| VC wedge from OSS signal | ✅ PASS | 11.2 | - |
| CTO risk exposure + patch plan | ✅ PASS | 12.5 | - |
| Exec vendor evaluation | ✅ PASS | 14.2 | - |
| Ecosystem second-order effects | ✅ PASS | 15.6 | - |
| Founder positioning vs incumbent | ✅ PASS | 14.9 | - |
| Academic literature anchor | ✅ PASS | 16.1 | - |
| Quant signal extraction | ✅ PASS | 13.5 | - |
| Product designer schema card | ✅ PASS | 15.5 | - |
| Sales engineer one-screen summary | ✅ PASS | 16.0 | - |

### deepseek-v3.2

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 77.3 | - |
| VC wedge from OSS signal | ✅ PASS | 87.9 | - |
| CTO risk exposure + patch plan | ✅ PASS | 111.3 | - |
| Exec vendor evaluation | ✅ PASS | 79.7 | - |
| Ecosystem second-order effects | ✅ PASS | 148.7 | - |
| Founder positioning vs incumbent | ❌ FAIL | 20.2 | Missing [DEBRIEF_V1_JSON] block |
| Academic literature anchor | ✅ PASS | 30.1 | - |
| Quant signal extraction | ✅ PASS | 50.4 | - |
| Product designer schema card | ❌ FAIL | 199.6 | Missing [DEBRIEF_V1_JSON] block |
| Sales engineer one-screen summary | ✅ PASS | 103.3 | - |

### minimax-m2.1

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 32.7 | - |
| VC wedge from OSS signal | ✅ PASS | 19.4 | - |
| CTO risk exposure + patch plan | ✅ PASS | 21.7 | - |
| Exec vendor evaluation | ✅ PASS | 24.1 | - |
| Ecosystem second-order effects | ✅ PASS | 24.4 | - |
| Founder positioning vs incumbent | ✅ PASS | 30.7 | - |
| Academic literature anchor | ✅ PASS | 20.3 | - |
| Quant signal extraction | ✅ PASS | 29.8 | - |
| Product designer schema card | ✅ PASS | 26.0 | - |
| Sales engineer one-screen summary | ✅ PASS | 18.8 | - |

### qwen3-235b

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 16.4 | - |
| VC wedge from OSS signal | ❌ FAIL | 4.9 | Missing [DEBRIEF_V1_JSON] block |
| CTO risk exposure + patch plan | ✅ PASS | 20.6 | - |
| Exec vendor evaluation | ✅ PASS | 25.4 | - |
| Ecosystem second-order effects | ✅ PASS | 19.7 | - |
| Founder positioning vs incumbent | ✅ PASS | 16.9 | - |
| Academic literature anchor | ✅ PASS | 14.9 | - |
| Quant signal extraction | ❌ FAIL | 20.4 | persona mismatch: got JPM_STARTUP_BANKER expected QUANT_ANALYST |
| Product designer schema card | ✅ PASS | 19.2 | - |
| Sales engineer one-screen summary | ✅ PASS | 13.2 | - |

### deepseek-r1

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 45.8 | - |
| VC wedge from OSS signal | ✅ PASS | 20.5 | - |
| CTO risk exposure + patch plan | ✅ PASS | 17.8 | - |
| Exec vendor evaluation | ✅ PASS | 19.6 | - |
| Ecosystem second-order effects | ❌ FAIL | 47.8 | Missing [DEBRIEF_V1_JSON] block |
| Founder positioning vs incumbent | ✅ PASS | 77.7 | - |
| Academic literature anchor | ✅ PASS | 140.6 | - |
| Quant signal extraction | ✅ PASS | 68.6 | - |
| Product designer schema card | ✅ PASS | 51.0 | - |
| Sales engineer one-screen summary | ✅ PASS | 61.9 | - |

## Disclosure Metrics (P0 Instrumentation)

### Disclosure Level by Model

| Model | Full | Partial | None |
|-------|------|---------|------|
| claude-haiku-4.5 | 0 | 0 | 10 |
| gpt-5-mini | 0 | 0 | 10 |
| gemini-3-flash | 0 | 0 | 10 |
| deepseek-v3.2 | 0 | 0 | 10 |
| minimax-m2.1 | 0 | 0 | 10 |
| qwen3-235b | 0 | 0 | 10 |
| deepseek-r1 | 0 | 0 | 10 |

### Disclosure Warnings (Non-Scored)

> **Note:** These warnings are informational and do not affect pass/fail.
> They track progressive disclosure usage for Week 1-2 observability.

⚠️ [claude-haiku-4.5/vc_vague_openautoglm] No skill search for EARLY_STAGE_VC scenario
⚠️ [claude-haiku-4.5/cto_vague_quickjs] No skill search for CTO_TECH_LEAD scenario
⚠️ [claude-haiku-4.5/exec_vague_gemini] No skill search for ENTERPRISE_EXEC scenario
⚠️ [claude-haiku-4.5/ecosystem_vague_soundcloud] No skill search for ECOSYSTEM_PARTNER scenario
⚠️ [claude-haiku-4.5/founder_salesforce_positioning] No skill search for FOUNDER_STRATEGY scenario
⚠️ [claude-haiku-4.5/academic_ryr2_anchor] No skill search for ACADEMIC_RD scenario
⚠️ [claude-haiku-4.5/quant_disco_signal] No skill search for QUANT_ANALYST scenario
⚠️ [claude-haiku-4.5/product_disco_card] No skill search for PRODUCT_DESIGNER scenario
⚠️ [claude-haiku-4.5/sales_disco_onepager] No skill search for SALES_ENGINEER scenario
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
... and 109 more warnings
