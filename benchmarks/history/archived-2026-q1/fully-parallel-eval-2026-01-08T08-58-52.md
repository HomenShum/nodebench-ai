# Fully Parallel Evaluation Results

Generated: 2026-01-08T08:58:52.023Z
Total Time: 117.8s
Suite: core
Models: 6
Scenarios: 10
Total evaluations: 60

## Summary by Model

| Model | Total | Passed | Failed | Avg Time (s) |
|-------|-------|--------|--------|--------------|
| gpt-5-mini | 10 | 10 | 0 | 55.9 |
| gemini-3-flash | 10 | 10 | 0 | 16.5 |
| deepseek-v3.2 | 10 | 10 | 0 | 78.5 |
| minimax-m2.1 | 10 | 10 | 0 | 27.8 |
| qwen3-235b | 10 | 8 | 2 | 34.4 |
| deepseek-r1 | 10 | 8 | 2 | 65.0 |

## Summary by Scenario

| Scenario | Total | Passed | Failed |
|----------|-------|--------|--------|
| Banker vague outreach debrief | 6 | 6 | 0 |
| VC wedge from OSS signal | 6 | 6 | 0 |
| CTO risk exposure + patch plan | 6 | 6 | 0 |
| Exec vendor evaluation | 6 | 6 | 0 |
| Ecosystem second-order effects | 6 | 6 | 0 |
| Founder positioning vs incumbent | 6 | 5 | 1 |
| Academic literature anchor | 6 | 4 | 2 |
| Quant signal extraction | 6 | 5 | 1 |
| Product designer schema card | 6 | 6 | 0 |
| Sales engineer one-screen summary | 6 | 6 | 0 |

## Detailed Results

### gpt-5-mini

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 69.4 | - |
| VC wedge from OSS signal | ✅ PASS | 34.5 | - |
| CTO risk exposure + patch plan | ✅ PASS | 61.0 | - |
| Exec vendor evaluation | ✅ PASS | 36.9 | - |
| Ecosystem second-order effects | ✅ PASS | 56.7 | - |
| Founder positioning vs incumbent | ✅ PASS | 51.0 | - |
| Academic literature anchor | ✅ PASS | 59.8 | - |
| Quant signal extraction | ✅ PASS | 67.7 | - |
| Product designer schema card | ✅ PASS | 68.7 | - |
| Sales engineer one-screen summary | ✅ PASS | 53.3 | - |

### gemini-3-flash

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 14.6 | - |
| VC wedge from OSS signal | ✅ PASS | 16.3 | - |
| CTO risk exposure + patch plan | ✅ PASS | 18.6 | - |
| Exec vendor evaluation | ✅ PASS | 13.8 | - |
| Ecosystem second-order effects | ✅ PASS | 15.0 | - |
| Founder positioning vs incumbent | ✅ PASS | 24.0 | - |
| Academic literature anchor | ✅ PASS | 14.6 | - |
| Quant signal extraction | ✅ PASS | 14.5 | - |
| Product designer schema card | ✅ PASS | 18.1 | - |
| Sales engineer one-screen summary | ✅ PASS | 15.1 | - |

### deepseek-v3.2

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 73.3 | - |
| VC wedge from OSS signal | ✅ PASS | 75.5 | - |
| CTO risk exposure + patch plan | ✅ PASS | 63.8 | - |
| Exec vendor evaluation | ✅ PASS | 34.2 | - |
| Ecosystem second-order effects | ✅ PASS | 93.9 | - |
| Founder positioning vs incumbent | ✅ PASS | 106.8 | - |
| Academic literature anchor | ✅ PASS | 62.5 | - |
| Quant signal extraction | ✅ PASS | 71.9 | - |
| Product designer schema card | ✅ PASS | 104.6 | - |
| Sales engineer one-screen summary | ✅ PASS | 98.8 | - |

### minimax-m2.1

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 20.5 | - |
| VC wedge from OSS signal | ✅ PASS | 29.4 | - |
| CTO risk exposure + patch plan | ✅ PASS | 13.5 | - |
| Exec vendor evaluation | ✅ PASS | 29.7 | - |
| Ecosystem second-order effects | ✅ PASS | 46.2 | - |
| Founder positioning vs incumbent | ✅ PASS | 59.6 | - |
| Academic literature anchor | ✅ PASS | 18.0 | - |
| Quant signal extraction | ✅ PASS | 23.2 | - |
| Product designer schema card | ✅ PASS | 19.6 | - |
| Sales engineer one-screen summary | ✅ PASS | 18.6 | - |

### qwen3-235b

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 32.5 | - |
| VC wedge from OSS signal | ✅ PASS | 45.7 | - |
| CTO risk exposure + patch plan | ✅ PASS | 35.2 | - |
| Exec vendor evaluation | ✅ PASS | 32.6 | - |
| Ecosystem second-order effects | ✅ PASS | 37.8 | - |
| Founder positioning vs incumbent | ✅ PASS | 54.7 | - |
| Academic literature anchor | ❌ FAIL | 6.4 | Missing [DEBRIEF_V1_JSON] block |
| Quant signal extraction | ❌ FAIL | 32.8 | persona mismatch: got EARLY_STAGE_VC expected QUANT_ANALYST |
| Product designer schema card | ✅ PASS | 38.4 | - |
| Sales engineer one-screen summary | ✅ PASS | 27.8 | - |

### deepseek-r1

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 48.6 | - |
| VC wedge from OSS signal | ✅ PASS | 94.9 | - |
| CTO risk exposure + patch plan | ✅ PASS | 45.9 | - |
| Exec vendor evaluation | ✅ PASS | 53.7 | - |
| Ecosystem second-order effects | ✅ PASS | 44.8 | - |
| Founder positioning vs incumbent | ❌ FAIL | 117.8 | missing ground truth citation anchor in grounding[] |
| Academic literature anchor | ❌ FAIL | 22.1 | Missing [DEBRIEF_V1_JSON] block |
| Quant signal extraction | ✅ PASS | 74.1 | - |
| Product designer schema card | ✅ PASS | 53.6 | - |
| Sales engineer one-screen summary | ✅ PASS | 94.8 | - |

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
... and 104 more warnings
