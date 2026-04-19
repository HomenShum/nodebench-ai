# Fully Parallel Evaluation Results

Generated: 2026-01-08T22:55:06.750Z
Total Time: 205.8s
Suite: core
Models: 7
Scenarios: 10
Total evaluations: 70

## Summary by Model

| Model | Total | Passed | Failed | Avg Time (s) |
|-------|-------|--------|--------|--------------|
| claude-haiku-4.5 | 10 | 8 | 2 | 48.8 |
| gpt-5-mini | 10 | 10 | 0 | 49.8 |
| gemini-3-flash | 10 | 10 | 0 | 17.2 |
| deepseek-r1 | 10 | 8 | 2 | 63.1 |
| deepseek-v3.2 | 10 | 8 | 2 | 73.1 |
| qwen3-235b | 10 | 8 | 2 | 35.8 |
| minimax-m2.1 | 10 | 10 | 0 | 28.6 |

## Summary by Scenario

| Scenario | Total | Passed | Failed |
|----------|-------|--------|--------|
| Banker vague outreach debrief | 7 | 6 | 1 |
| VC wedge from OSS signal | 7 | 7 | 0 |
| CTO risk exposure + patch plan | 7 | 6 | 1 |
| Exec vendor evaluation | 7 | 7 | 0 |
| Ecosystem second-order effects | 7 | 5 | 2 |
| Founder positioning vs incumbent | 7 | 6 | 1 |
| Academic literature anchor | 7 | 7 | 0 |
| Quant signal extraction | 7 | 5 | 2 |
| Product designer schema card | 7 | 6 | 1 |
| Sales engineer one-screen summary | 7 | 7 | 0 |

## Detailed Results

### claude-haiku-4.5

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 64.7 | - |
| VC wedge from OSS signal | ✅ PASS | 52.9 | - |
| CTO risk exposure + patch plan | ✅ PASS | 71.5 | - |
| Exec vendor evaluation | ✅ PASS | 63.1 | - |
| Ecosystem second-order effects | ❌ FAIL | 20.0 | Missing [DEBRIEF_V1_JSON] block |
| Founder positioning vs incumbent | ✅ PASS | 43.1 | - |
| Academic literature anchor | ✅ PASS | 68.5 | - |
| Quant signal extraction | ❌ FAIL | 58.3 | Missing [DEBRIEF_V1_JSON] block |
| Product designer schema card | ✅ PASS | 23.7 | - |
| Sales engineer one-screen summary | ✅ PASS | 21.8 | - |

### gpt-5-mini

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 59.7 | - |
| VC wedge from OSS signal | ✅ PASS | 44.7 | - |
| CTO risk exposure + patch plan | ✅ PASS | 56.4 | - |
| Exec vendor evaluation | ✅ PASS | 33.9 | - |
| Ecosystem second-order effects | ✅ PASS | 43.5 | - |
| Founder positioning vs incumbent | ✅ PASS | 66.8 | - |
| Academic literature anchor | ✅ PASS | 64.7 | - |
| Quant signal extraction | ✅ PASS | 38.3 | - |
| Product designer schema card | ✅ PASS | 42.9 | - |
| Sales engineer one-screen summary | ✅ PASS | 47.3 | - |

### gemini-3-flash

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 17.7 | - |
| VC wedge from OSS signal | ✅ PASS | 15.6 | - |
| CTO risk exposure + patch plan | ✅ PASS | 15.0 | - |
| Exec vendor evaluation | ✅ PASS | 16.6 | - |
| Ecosystem second-order effects | ✅ PASS | 15.3 | - |
| Founder positioning vs incumbent | ✅ PASS | 20.3 | - |
| Academic literature anchor | ✅ PASS | 16.6 | - |
| Quant signal extraction | ✅ PASS | 16.4 | - |
| Product designer schema card | ✅ PASS | 20.3 | - |
| Sales engineer one-screen summary | ✅ PASS | 18.7 | - |

### deepseek-r1

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ❌ FAIL | 24.4 | Missing [DEBRIEF_V1_JSON] block |
| VC wedge from OSS signal | ✅ PASS | 28.3 | - |
| CTO risk exposure + patch plan | ❌ FAIL | 34.6 | Missing [DEBRIEF_V1_JSON] block |
| Exec vendor evaluation | ✅ PASS | 25.4 | - |
| Ecosystem second-order effects | ✅ PASS | 47.3 | - |
| Founder positioning vs incumbent | ✅ PASS | 205.8 | - |
| Academic literature anchor | ✅ PASS | 24.0 | - |
| Quant signal extraction | ✅ PASS | 117.0 | - |
| Product designer schema card | ✅ PASS | 97.5 | - |
| Sales engineer one-screen summary | ✅ PASS | 26.9 | - |

### deepseek-v3.2

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 90.7 | - |
| VC wedge from OSS signal | ✅ PASS | 83.9 | - |
| CTO risk exposure + patch plan | ✅ PASS | 51.0 | - |
| Exec vendor evaluation | ✅ PASS | 90.0 | - |
| Ecosystem second-order effects | ❌ FAIL | 18.4 | Missing [DEBRIEF_V1_JSON] block |
| Founder positioning vs incumbent | ✅ PASS | 157.7 | - |
| Academic literature anchor | ✅ PASS | 36.2 | - |
| Quant signal extraction | ❌ FAIL | 34.1 | Missing [DEBRIEF_V1_JSON] block |
| Product designer schema card | ✅ PASS | 131.5 | - |
| Sales engineer one-screen summary | ✅ PASS | 37.1 | - |

### qwen3-235b

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 31.4 | - |
| VC wedge from OSS signal | ✅ PASS | 39.4 | - |
| CTO risk exposure + patch plan | ✅ PASS | 29.0 | - |
| Exec vendor evaluation | ✅ PASS | 35.9 | - |
| Ecosystem second-order effects | ✅ PASS | 30.7 | - |
| Founder positioning vs incumbent | ❌ FAIL | 31.3 | missing ground truth citation anchor in grounding[] |
| Academic literature anchor | ✅ PASS | 43.9 | - |
| Quant signal extraction | ✅ PASS | 40.8 | - |
| Product designer schema card | ❌ FAIL | 29.6 | Missing [DEBRIEF_V1_JSON] block |
| Sales engineer one-screen summary | ✅ PASS | 45.9 | - |

### minimax-m2.1

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 21.4 | - |
| VC wedge from OSS signal | ✅ PASS | 22.2 | - |
| CTO risk exposure + patch plan | ✅ PASS | 31.0 | - |
| Exec vendor evaluation | ✅ PASS | 26.3 | - |
| Ecosystem second-order effects | ✅ PASS | 31.5 | - |
| Founder positioning vs incumbent | ✅ PASS | 31.9 | - |
| Academic literature anchor | ✅ PASS | 29.2 | - |
| Quant signal extraction | ✅ PASS | 34.5 | - |
| Product designer schema card | ✅ PASS | 31.9 | - |
| Sales engineer one-screen summary | ✅ PASS | 25.6 | - |

## Disclosure Metrics (P0 Instrumentation)

### Disclosure Level by Model

| Model | Full | Partial | None |
|-------|------|---------|------|
| claude-haiku-4.5 | 0 | 0 | 10 |
| gpt-5-mini | 0 | 0 | 10 |
| gemini-3-flash | 0 | 0 | 10 |
| deepseek-r1 | 0 | 0 | 10 |
| deepseek-v3.2 | 0 | 0 | 10 |
| qwen3-235b | 0 | 0 | 10 |
| minimax-m2.1 | 0 | 0 | 10 |

### Disclosure Warnings (Non-Scored)

> **Note:** These warnings are informational and do not affect pass/fail.
> They track progressive disclosure usage for Week 1-2 observability.

⚠️ [claude-haiku-4.5/vc_vague_openautoglm] No skill search for EARLY_STAGE_VC scenario
⚠️ [claude-haiku-4.5/cto_vague_quickjs] No skill search for CTO_TECH_LEAD scenario
⚠️ [claude-haiku-4.5/exec_vague_gemini] No skill search for ENTERPRISE_EXEC scenario
⚠️ [claude-haiku-4.5/ecosystem_vague_soundcloud] No skill search before tool invoke
⚠️ [claude-haiku-4.5/ecosystem_vague_soundcloud] No skill search for ECOSYSTEM_PARTNER scenario
⚠️ [claude-haiku-4.5/ecosystem_vague_soundcloud] No progressive disclosure meta-tools used
⚠️ [claude-haiku-4.5/founder_salesforce_positioning] No skill search before tool invoke
⚠️ [claude-haiku-4.5/founder_salesforce_positioning] No skill search for FOUNDER_STRATEGY scenario
⚠️ [claude-haiku-4.5/founder_salesforce_positioning] No progressive disclosure meta-tools used
⚠️ [claude-haiku-4.5/academic_ryr2_anchor] No skill search for ACADEMIC_RD scenario
⚠️ [claude-haiku-4.5/quant_disco_signal] No skill search for QUANT_ANALYST scenario
⚠️ [claude-haiku-4.5/product_disco_card] No skill search before tool invoke
⚠️ [claude-haiku-4.5/product_disco_card] No skill search for PRODUCT_DESIGNER scenario
⚠️ [claude-haiku-4.5/product_disco_card] No progressive disclosure meta-tools used
⚠️ [claude-haiku-4.5/sales_disco_onepager] No skill search before tool invoke
⚠️ [claude-haiku-4.5/sales_disco_onepager] No skill search for SALES_ENGINEER scenario
⚠️ [claude-haiku-4.5/sales_disco_onepager] No progressive disclosure meta-tools used
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
... and 112 more warnings
