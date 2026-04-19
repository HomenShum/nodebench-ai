# Fully Parallel Evaluation Results

Generated: 2026-01-08T09:06:46.729Z
Total Time: 148.7s
Suite: core
Models: 6
Scenarios: 10
Total evaluations: 60

## Summary by Model

| Model | Total | Passed | Failed | Avg Time (s) |
|-------|-------|--------|--------|--------------|
| gpt-5-mini | 10 | 10 | 0 | 49.2 |
| gemini-3-flash | 10 | 10 | 0 | 16.2 |
| deepseek-v3.2 | 10 | 8 | 2 | 49.2 |
| minimax-m2.1 | 10 | 10 | 0 | 25.6 |
| qwen3-235b | 10 | 8 | 2 | 30.0 |
| deepseek-r1 | 10 | 9 | 1 | 81.0 |

## Summary by Scenario

| Scenario | Total | Passed | Failed |
|----------|-------|--------|--------|
| Banker vague outreach debrief | 6 | 6 | 0 |
| VC wedge from OSS signal | 6 | 6 | 0 |
| CTO risk exposure + patch plan | 6 | 5 | 1 |
| Exec vendor evaluation | 6 | 6 | 0 |
| Ecosystem second-order effects | 6 | 6 | 0 |
| Founder positioning vs incumbent | 6 | 3 | 3 |
| Academic literature anchor | 6 | 5 | 1 |
| Quant signal extraction | 6 | 6 | 0 |
| Product designer schema card | 6 | 6 | 0 |
| Sales engineer one-screen summary | 6 | 6 | 0 |

## Detailed Results

### gpt-5-mini

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 56.1 | - |
| VC wedge from OSS signal | ✅ PASS | 47.6 | - |
| CTO risk exposure + patch plan | ✅ PASS | 39.4 | - |
| Exec vendor evaluation | ✅ PASS | 33.2 | - |
| Ecosystem second-order effects | ✅ PASS | 56.5 | - |
| Founder positioning vs incumbent | ✅ PASS | 59.1 | - |
| Academic literature anchor | ✅ PASS | 59.7 | - |
| Quant signal extraction | ✅ PASS | 51.1 | - |
| Product designer schema card | ✅ PASS | 47.6 | - |
| Sales engineer one-screen summary | ✅ PASS | 42.0 | - |

### gemini-3-flash

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 16.3 | - |
| VC wedge from OSS signal | ✅ PASS | 19.5 | - |
| CTO risk exposure + patch plan | ✅ PASS | 12.9 | - |
| Exec vendor evaluation | ✅ PASS | 12.1 | - |
| Ecosystem second-order effects | ✅ PASS | 18.1 | - |
| Founder positioning vs incumbent | ✅ PASS | 20.5 | - |
| Academic literature anchor | ✅ PASS | 13.7 | - |
| Quant signal extraction | ✅ PASS | 15.9 | - |
| Product designer schema card | ✅ PASS | 16.5 | - |
| Sales engineer one-screen summary | ✅ PASS | 16.2 | - |

### deepseek-v3.2

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 39.4 | - |
| VC wedge from OSS signal | ✅ PASS | 53.4 | - |
| CTO risk exposure + patch plan | ❌ FAIL | 29.4 | Missing [DEBRIEF_V1_JSON] block |
| Exec vendor evaluation | ✅ PASS | 62.4 | - |
| Ecosystem second-order effects | ✅ PASS | 64.1 | - |
| Founder positioning vs incumbent | ❌ FAIL | 43.4 | Missing [DEBRIEF_V1_JSON] block |
| Academic literature anchor | ✅ PASS | 47.2 | - |
| Quant signal extraction | ✅ PASS | 62.0 | - |
| Product designer schema card | ✅ PASS | 59.3 | - |
| Sales engineer one-screen summary | ✅ PASS | 31.8 | - |

### minimax-m2.1

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 27.0 | - |
| VC wedge from OSS signal | ✅ PASS | 30.2 | - |
| CTO risk exposure + patch plan | ✅ PASS | 22.4 | - |
| Exec vendor evaluation | ✅ PASS | 19.8 | - |
| Ecosystem second-order effects | ✅ PASS | 27.9 | - |
| Founder positioning vs incumbent | ✅ PASS | 20.0 | - |
| Academic literature anchor | ✅ PASS | 28.5 | - |
| Quant signal extraction | ✅ PASS | 26.4 | - |
| Product designer schema card | ✅ PASS | 33.1 | - |
| Sales engineer one-screen summary | ✅ PASS | 21.2 | - |

### qwen3-235b

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 15.9 | - |
| VC wedge from OSS signal | ✅ PASS | 53.2 | - |
| CTO risk exposure + patch plan | ✅ PASS | 25.2 | - |
| Exec vendor evaluation | ✅ PASS | 15.3 | - |
| Ecosystem second-order effects | ✅ PASS | 16.3 | - |
| Founder positioning vs incumbent | ❌ FAIL | 94.3 | entity mismatch: got resolvedId='N/A' canonical='OpenAutoGLM' expected 'SALESFOR |
| Academic literature anchor | ❌ FAIL | 17.3 | entity mismatch: got resolvedId='N/A' canonical='RyR2-ALZHEIMERS' expected 'ALZH |
| Quant signal extraction | ✅ PASS | 21.4 | - |
| Product designer schema card | ✅ PASS | 12.1 | - |
| Sales engineer one-screen summary | ✅ PASS | 29.6 | - |

### deepseek-r1

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 21.6 | - |
| VC wedge from OSS signal | ✅ PASS | 67.0 | - |
| CTO risk exposure + patch plan | ✅ PASS | 108.7 | - |
| Exec vendor evaluation | ✅ PASS | 106.0 | - |
| Ecosystem second-order effects | ✅ PASS | 148.6 | - |
| Founder positioning vs incumbent | ❌ FAIL | 138.8 | missing ground truth citation anchor in grounding[] |
| Academic literature anchor | ✅ PASS | 51.7 | - |
| Quant signal extraction | ✅ PASS | 44.7 | - |
| Product designer schema card | ✅ PASS | 59.7 | - |
| Sales engineer one-screen summary | ✅ PASS | 63.1 | - |

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
