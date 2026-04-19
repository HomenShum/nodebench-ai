# Fully Parallel Evaluation Results

Generated: 2026-01-08T09:12:48.191Z
Total Time: 153.3s
Suite: core
Models: 6
Scenarios: 10
Total evaluations: 60

## Summary by Model

| Model | Total | Passed | Failed | Avg Time (s) |
|-------|-------|--------|--------|--------------|
| gpt-5-mini | 10 | 9 | 1 | 52.4 |
| gemini-3-flash | 10 | 10 | 0 | 15.0 |
| deepseek-v3.2 | 10 | 10 | 0 | 52.4 |
| minimax-m2.1 | 10 | 8 | 2 | 21.5 |
| qwen3-235b | 10 | 9 | 1 | 37.2 |
| deepseek-r1 | 10 | 10 | 0 | 70.2 |

## Summary by Scenario

| Scenario | Total | Passed | Failed |
|----------|-------|--------|--------|
| Banker vague outreach debrief | 6 | 6 | 0 |
| VC wedge from OSS signal | 6 | 6 | 0 |
| CTO risk exposure + patch plan | 6 | 6 | 0 |
| Exec vendor evaluation | 6 | 5 | 1 |
| Ecosystem second-order effects | 6 | 5 | 1 |
| Founder positioning vs incumbent | 6 | 5 | 1 |
| Academic literature anchor | 6 | 6 | 0 |
| Quant signal extraction | 6 | 5 | 1 |
| Product designer schema card | 6 | 6 | 0 |
| Sales engineer one-screen summary | 6 | 6 | 0 |

## Detailed Results

### gpt-5-mini

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 63.7 | - |
| VC wedge from OSS signal | ✅ PASS | 60.3 | - |
| CTO risk exposure + patch plan | ✅ PASS | 47.1 | - |
| Exec vendor evaluation | ✅ PASS | 43.1 | - |
| Ecosystem second-order effects | ✅ PASS | 49.8 | - |
| Founder positioning vs incumbent | ✅ PASS | 66.8 | - |
| Academic literature anchor | ✅ PASS | 52.3 | - |
| Quant signal extraction | ❌ FAIL | 20.9 | Missing [DEBRIEF_V1_JSON] block |
| Product designer schema card | ✅ PASS | 63.7 | - |
| Sales engineer one-screen summary | ✅ PASS | 56.7 | - |

### gemini-3-flash

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 18.4 | - |
| VC wedge from OSS signal | ✅ PASS | 13.1 | - |
| CTO risk exposure + patch plan | ✅ PASS | 12.6 | - |
| Exec vendor evaluation | ✅ PASS | 16.3 | - |
| Ecosystem second-order effects | ✅ PASS | 16.6 | - |
| Founder positioning vs incumbent | ✅ PASS | 14.9 | - |
| Academic literature anchor | ✅ PASS | 12.1 | - |
| Quant signal extraction | ✅ PASS | 15.9 | - |
| Product designer schema card | ✅ PASS | 13.3 | - |
| Sales engineer one-screen summary | ✅ PASS | 16.3 | - |

### deepseek-v3.2

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 36.7 | - |
| VC wedge from OSS signal | ✅ PASS | 66.5 | - |
| CTO risk exposure + patch plan | ✅ PASS | 42.5 | - |
| Exec vendor evaluation | ✅ PASS | 27.0 | - |
| Ecosystem second-order effects | ✅ PASS | 67.0 | - |
| Founder positioning vs incumbent | ✅ PASS | 127.4 | - |
| Academic literature anchor | ✅ PASS | 31.2 | - |
| Quant signal extraction | ✅ PASS | 37.7 | - |
| Product designer schema card | ✅ PASS | 46.2 | - |
| Sales engineer one-screen summary | ✅ PASS | 41.8 | - |

### minimax-m2.1

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 11.4 | - |
| VC wedge from OSS signal | ✅ PASS | 22.7 | - |
| CTO risk exposure + patch plan | ✅ PASS | 22.3 | - |
| Exec vendor evaluation | ❌ FAIL | 30.6 | Missing [DEBRIEF_V1_JSON] block |
| Ecosystem second-order effects | ❌ FAIL | 7.2 | Missing [DEBRIEF_V1_JSON] block |
| Founder positioning vs incumbent | ✅ PASS | 20.6 | - |
| Academic literature anchor | ✅ PASS | 28.3 | - |
| Quant signal extraction | ✅ PASS | 14.8 | - |
| Product designer schema card | ✅ PASS | 34.8 | - |
| Sales engineer one-screen summary | ✅ PASS | 22.6 | - |

### qwen3-235b

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 38.7 | - |
| VC wedge from OSS signal | ✅ PASS | 17.8 | - |
| CTO risk exposure + patch plan | ✅ PASS | 48.8 | - |
| Exec vendor evaluation | ✅ PASS | 20.6 | - |
| Ecosystem second-order effects | ✅ PASS | 52.3 | - |
| Founder positioning vs incumbent | ❌ FAIL | 30.8 | missing ground truth citation anchor in grounding[] |
| Academic literature anchor | ✅ PASS | 22.8 | - |
| Quant signal extraction | ✅ PASS | 44.8 | - |
| Product designer schema card | ✅ PASS | 47.9 | - |
| Sales engineer one-screen summary | ✅ PASS | 47.8 | - |

### deepseek-r1

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 62.8 | - |
| VC wedge from OSS signal | ✅ PASS | 97.1 | - |
| CTO risk exposure + patch plan | ✅ PASS | 108.6 | - |
| Exec vendor evaluation | ✅ PASS | 72.1 | - |
| Ecosystem second-order effects | ✅ PASS | 51.3 | - |
| Founder positioning vs incumbent | ✅ PASS | 153.3 | - |
| Academic literature anchor | ✅ PASS | 40.2 | - |
| Quant signal extraction | ✅ PASS | 63.3 | - |
| Product designer schema card | ✅ PASS | 27.9 | - |
| Sales engineer one-screen summary | ✅ PASS | 25.0 | - |

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
⚠️ [gpt-5-mini/quant_disco_signal] No skill search for QUANT_ANALYST scenario
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
⚠️ [gemini-3-flash/quant_disco_signal] No skill search for QUANT_ANALYST scenario
⚠️ [gemini-3-flash/quant_disco_signal] No progressive disclosure meta-tools used
... and 106 more warnings
