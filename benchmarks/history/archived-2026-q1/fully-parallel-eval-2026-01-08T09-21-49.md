# Fully Parallel Evaluation Results

Generated: 2026-01-08T09:21:49.228Z
Total Time: 186.3s
Suite: core
Models: 6
Scenarios: 10
Total evaluations: 60

## Summary by Model

| Model | Total | Passed | Failed | Avg Time (s) |
|-------|-------|--------|--------|--------------|
| gpt-5-mini | 10 | 10 | 0 | 40.8 |
| gemini-3-flash | 10 | 10 | 0 | 14.6 |
| deepseek-v3.2 | 10 | 9 | 1 | 74.5 |
| minimax-m2.1 | 10 | 9 | 1 | 31.4 |
| qwen3-235b | 10 | 6 | 4 | 23.1 |
| deepseek-r1 | 10 | 9 | 1 | 50.1 |

## Summary by Scenario

| Scenario | Total | Passed | Failed |
|----------|-------|--------|--------|
| Banker vague outreach debrief | 6 | 6 | 0 |
| VC wedge from OSS signal | 6 | 6 | 0 |
| CTO risk exposure + patch plan | 6 | 5 | 1 |
| Exec vendor evaluation | 6 | 6 | 0 |
| Ecosystem second-order effects | 6 | 4 | 2 |
| Founder positioning vs incumbent | 6 | 3 | 3 |
| Academic literature anchor | 6 | 6 | 0 |
| Quant signal extraction | 6 | 6 | 0 |
| Product designer schema card | 6 | 5 | 1 |
| Sales engineer one-screen summary | 6 | 6 | 0 |

## Detailed Results

### gpt-5-mini

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 45.2 | - |
| VC wedge from OSS signal | ✅ PASS | 35.0 | - |
| CTO risk exposure + patch plan | ✅ PASS | 38.0 | - |
| Exec vendor evaluation | ✅ PASS | 35.0 | - |
| Ecosystem second-order effects | ✅ PASS | 30.8 | - |
| Founder positioning vs incumbent | ✅ PASS | 40.6 | - |
| Academic literature anchor | ✅ PASS | 47.4 | - |
| Quant signal extraction | ✅ PASS | 51.6 | - |
| Product designer schema card | ✅ PASS | 49.2 | - |
| Sales engineer one-screen summary | ✅ PASS | 35.5 | - |

### gemini-3-flash

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 18.1 | - |
| VC wedge from OSS signal | ✅ PASS | 12.4 | - |
| CTO risk exposure + patch plan | ✅ PASS | 15.4 | - |
| Exec vendor evaluation | ✅ PASS | 13.7 | - |
| Ecosystem second-order effects | ✅ PASS | 14.4 | - |
| Founder positioning vs incumbent | ✅ PASS | 20.1 | - |
| Academic literature anchor | ✅ PASS | 12.9 | - |
| Quant signal extraction | ✅ PASS | 12.4 | - |
| Product designer schema card | ✅ PASS | 13.4 | - |
| Sales engineer one-screen summary | ✅ PASS | 13.7 | - |

### deepseek-v3.2

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 40.6 | - |
| VC wedge from OSS signal | ✅ PASS | 48.1 | - |
| CTO risk exposure + patch plan | ✅ PASS | 37.0 | - |
| Exec vendor evaluation | ✅ PASS | 52.2 | - |
| Ecosystem second-order effects | ✅ PASS | 136.9 | - |
| Founder positioning vs incumbent | ❌ FAIL | 48.7 | Missing [DEBRIEF_V1_JSON] block |
| Academic literature anchor | ✅ PASS | 58.8 | - |
| Quant signal extraction | ✅ PASS | 58.0 | - |
| Product designer schema card | ✅ PASS | 186.2 | - |
| Sales engineer one-screen summary | ✅ PASS | 78.5 | - |

### minimax-m2.1

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 27.1 | - |
| VC wedge from OSS signal | ✅ PASS | 26.2 | - |
| CTO risk exposure + patch plan | ✅ PASS | 27.6 | - |
| Exec vendor evaluation | ✅ PASS | 35.9 | - |
| Ecosystem second-order effects | ❌ FAIL | 8.9 | Missing [DEBRIEF_V1_JSON] block |
| Founder positioning vs incumbent | ✅ PASS | 79.9 | - |
| Academic literature anchor | ✅ PASS | 30.0 | - |
| Quant signal extraction | ✅ PASS | 25.2 | - |
| Product designer schema card | ✅ PASS | 24.9 | - |
| Sales engineer one-screen summary | ✅ PASS | 27.7 | - |

### qwen3-235b

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 12.6 | - |
| VC wedge from OSS signal | ✅ PASS | 13.4 | - |
| CTO risk exposure + patch plan | ❌ FAIL | 4.2 | Missing [DEBRIEF_V1_JSON] block |
| Exec vendor evaluation | ✅ PASS | 30.4 | - |
| Ecosystem second-order effects | ❌ FAIL | 4.1 | Missing [DEBRIEF_V1_JSON] block |
| Founder positioning vs incumbent | ❌ FAIL | 65.7 | missing ground truth citation anchor in grounding[] |
| Academic literature anchor | ✅ PASS | 36.0 | - |
| Quant signal extraction | ✅ PASS | 35.1 | - |
| Product designer schema card | ❌ FAIL | 3.4 | Missing [DEBRIEF_V1_JSON] block |
| Sales engineer one-screen summary | ✅ PASS | 26.4 | - |

### deepseek-r1

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 27.2 | - |
| VC wedge from OSS signal | ✅ PASS | 73.4 | - |
| CTO risk exposure + patch plan | ✅ PASS | 50.1 | - |
| Exec vendor evaluation | ✅ PASS | 39.8 | - |
| Ecosystem second-order effects | ✅ PASS | 71.2 | - |
| Founder positioning vs incumbent | ❌ FAIL | 72.3 | Missing [DEBRIEF_V1_JSON] block |
| Academic literature anchor | ✅ PASS | 38.4 | - |
| Quant signal extraction | ✅ PASS | 23.5 | - |
| Product designer schema card | ✅ PASS | 34.2 | - |
| Sales engineer one-screen summary | ✅ PASS | 70.4 | - |

## Disclosure Metrics (P0 Instrumentation)

### Disclosure Level by Model

| Model | Full | Partial | None |
|-------|------|---------|------|
| gpt-5-mini | 0 | 0 | 10 |
| gemini-3-flash | 0 | 0 | 10 |
| deepseek-v3.2 | 0 | 0 | 10 |
| minimax-m2.1 | 0 | 0 | 10 |
| qwen3-235b | 0 | 0 | 10 |
| deepseek-r1 | 0 | 0 | 10 |

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
... and 98 more warnings
