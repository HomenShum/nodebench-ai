# Fully Parallel Evaluation Results

Generated: 2026-01-08T09:56:37.903Z
Total Time: 192.6s
Suite: core
Models: 7
Scenarios: 10
Total evaluations: 70

## Summary by Model

| Model | Total | Passed | Failed | Avg Time (s) |
|-------|-------|--------|--------|--------------|
| claude-haiku-4.5 | 10 | 9 | 1 | 38.9 |
| gpt-5-mini | 10 | 10 | 0 | 46.2 |
| gemini-3-flash | 10 | 10 | 0 | 16.4 |
| deepseek-r1 | 10 | 8 | 2 | 53.2 |
| deepseek-v3.2 | 10 | 10 | 0 | 80.7 |
| qwen3-235b | 10 | 7 | 3 | 33.9 |
| minimax-m2.1 | 10 | 9 | 1 | 27.3 |

## Summary by Scenario

| Scenario | Total | Passed | Failed |
|----------|-------|--------|--------|
| Banker vague outreach debrief | 7 | 7 | 0 |
| VC wedge from OSS signal | 7 | 7 | 0 |
| CTO risk exposure + patch plan | 7 | 7 | 0 |
| Exec vendor evaluation | 7 | 6 | 1 |
| Ecosystem second-order effects | 7 | 5 | 2 |
| Founder positioning vs incumbent | 7 | 5 | 2 |
| Academic literature anchor | 7 | 7 | 0 |
| Quant signal extraction | 7 | 7 | 0 |
| Product designer schema card | 7 | 6 | 1 |
| Sales engineer one-screen summary | 7 | 6 | 1 |

## Detailed Results

### claude-haiku-4.5

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 54.3 | - |
| VC wedge from OSS signal | ✅ PASS | 37.6 | - |
| CTO risk exposure + patch plan | ✅ PASS | 43.6 | - |
| Exec vendor evaluation | ✅ PASS | 19.6 | - |
| Ecosystem second-order effects | ✅ PASS | 46.2 | - |
| Founder positioning vs incumbent | ✅ PASS | 62.5 | - |
| Academic literature anchor | ✅ PASS | 16.3 | - |
| Quant signal extraction | ✅ PASS | 29.4 | - |
| Product designer schema card | ✅ PASS | 37.0 | - |
| Sales engineer one-screen summary | ❌ FAIL | 42.1 | Missing [DEBRIEF_V1_JSON] block |

### gpt-5-mini

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 39.2 | - |
| VC wedge from OSS signal | ✅ PASS | 44.4 | - |
| CTO risk exposure + patch plan | ✅ PASS | 52.7 | - |
| Exec vendor evaluation | ✅ PASS | 31.0 | - |
| Ecosystem second-order effects | ✅ PASS | 52.7 | - |
| Founder positioning vs incumbent | ✅ PASS | 54.7 | - |
| Academic literature anchor | ✅ PASS | 42.6 | - |
| Quant signal extraction | ✅ PASS | 51.6 | - |
| Product designer schema card | ✅ PASS | 55.7 | - |
| Sales engineer one-screen summary | ✅ PASS | 36.9 | - |

### gemini-3-flash

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 15.7 | - |
| VC wedge from OSS signal | ✅ PASS | 13.2 | - |
| CTO risk exposure + patch plan | ✅ PASS | 13.1 | - |
| Exec vendor evaluation | ✅ PASS | 14.6 | - |
| Ecosystem second-order effects | ✅ PASS | 15.7 | - |
| Founder positioning vs incumbent | ✅ PASS | 33.0 | - |
| Academic literature anchor | ✅ PASS | 13.1 | - |
| Quant signal extraction | ✅ PASS | 14.8 | - |
| Product designer schema card | ✅ PASS | 14.4 | - |
| Sales engineer one-screen summary | ✅ PASS | 16.4 | - |

### deepseek-r1

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 58.1 | - |
| VC wedge from OSS signal | ✅ PASS | 49.0 | - |
| CTO risk exposure + patch plan | ✅ PASS | 49.4 | - |
| Exec vendor evaluation | ✅ PASS | 86.9 | - |
| Ecosystem second-order effects | ✅ PASS | 62.8 | - |
| Founder positioning vs incumbent | ❌ FAIL | 75.8 | Missing [DEBRIEF_V1_JSON] block |
| Academic literature anchor | ✅ PASS | 17.1 | - |
| Quant signal extraction | ✅ PASS | 54.3 | - |
| Product designer schema card | ❌ FAIL | 9.2 | Missing [DEBRIEF_V1_JSON] block |
| Sales engineer one-screen summary | ✅ PASS | 69.8 | - |

### deepseek-v3.2

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 34.8 | - |
| VC wedge from OSS signal | ✅ PASS | 91.4 | - |
| CTO risk exposure + patch plan | ✅ PASS | 73.9 | - |
| Exec vendor evaluation | ✅ PASS | 192.6 | - |
| Ecosystem second-order effects | ✅ PASS | 34.5 | - |
| Founder positioning vs incumbent | ✅ PASS | 89.5 | - |
| Academic literature anchor | ✅ PASS | 81.8 | - |
| Quant signal extraction | ✅ PASS | 100.4 | - |
| Product designer schema card | ✅ PASS | 67.6 | - |
| Sales engineer one-screen summary | ✅ PASS | 40.6 | - |

### qwen3-235b

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 27.7 | - |
| VC wedge from OSS signal | ✅ PASS | 37.4 | - |
| CTO risk exposure + patch plan | ✅ PASS | 29.0 | - |
| Exec vendor evaluation | ❌ FAIL | 15.3 | Missing [DEBRIEF_V1_JSON] block |
| Ecosystem second-order effects | ❌ FAIL | 8.1 | Missing [DEBRIEF_V1_JSON] block |
| Founder positioning vs incumbent | ❌ FAIL | 69.2 | missing ground truth citation anchor in grounding[] |
| Academic literature anchor | ✅ PASS | 35.3 | - |
| Quant signal extraction | ✅ PASS | 41.5 | - |
| Product designer schema card | ✅ PASS | 42.8 | - |
| Sales engineer one-screen summary | ✅ PASS | 32.9 | - |

### minimax-m2.1

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 23.8 | - |
| VC wedge from OSS signal | ✅ PASS | 30.2 | - |
| CTO risk exposure + patch plan | ✅ PASS | 31.0 | - |
| Exec vendor evaluation | ✅ PASS | 26.7 | - |
| Ecosystem second-order effects | ❌ FAIL | 41.2 | Invalid JSON: Expected double-quoted property name in JSON at position 37 |
| Founder positioning vs incumbent | ✅ PASS | 29.3 | - |
| Academic literature anchor | ✅ PASS | 23.1 | - |
| Quant signal extraction | ✅ PASS | 24.0 | - |
| Product designer schema card | ✅ PASS | 25.5 | - |
| Sales engineer one-screen summary | ✅ PASS | 18.6 | - |

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
⚠️ [claude-haiku-4.5/exec_vague_gemini] No skill search before tool invoke
⚠️ [claude-haiku-4.5/exec_vague_gemini] No skill search for ENTERPRISE_EXEC scenario
⚠️ [claude-haiku-4.5/exec_vague_gemini] No progressive disclosure meta-tools used
⚠️ [claude-haiku-4.5/ecosystem_vague_soundcloud] No skill search for ECOSYSTEM_PARTNER scenario
⚠️ [claude-haiku-4.5/founder_salesforce_positioning] No skill search before tool invoke
⚠️ [claude-haiku-4.5/founder_salesforce_positioning] No skill search for FOUNDER_STRATEGY scenario
⚠️ [claude-haiku-4.5/founder_salesforce_positioning] No progressive disclosure meta-tools used
⚠️ [claude-haiku-4.5/academic_ryr2_anchor] No skill search before tool invoke
⚠️ [claude-haiku-4.5/academic_ryr2_anchor] No skill search for ACADEMIC_RD scenario
⚠️ [claude-haiku-4.5/academic_ryr2_anchor] No progressive disclosure meta-tools used
⚠️ [claude-haiku-4.5/quant_disco_signal] No skill search before tool invoke
⚠️ [claude-haiku-4.5/quant_disco_signal] No skill search for QUANT_ANALYST scenario
⚠️ [claude-haiku-4.5/quant_disco_signal] No progressive disclosure meta-tools used
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
... and 121 more warnings
