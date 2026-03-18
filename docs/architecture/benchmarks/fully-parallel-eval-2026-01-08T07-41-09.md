# Fully Parallel Evaluation Results

Generated: 2026-01-08T07:41:09.061Z
Total Time: 68.3s
Suite: core
Models: 3
Scenarios: 10
Total evaluations: 30

## Summary by Model

| Model | Total | Passed | Failed | Avg Time (s) |
|-------|-------|--------|--------|--------------|
| gpt-5-mini | 10 | 10 | 0 | 46.2 |
| claude-haiku-4.5 | 10 | 9 | 1 | 45.1 |
| gemini-3-flash | 10 | 10 | 0 | 16.8 |

## Summary by Scenario

| Scenario | Total | Passed | Failed |
|----------|-------|--------|--------|
| Banker vague outreach debrief | 3 | 3 | 0 |
| VC wedge from OSS signal | 3 | 3 | 0 |
| CTO risk exposure + patch plan | 3 | 3 | 0 |
| Exec vendor evaluation | 3 | 3 | 0 |
| Ecosystem second-order effects | 3 | 2 | 1 |
| Founder positioning vs incumbent | 3 | 3 | 0 |
| Academic literature anchor | 3 | 3 | 0 |
| Quant signal extraction | 3 | 3 | 0 |
| Product designer schema card | 3 | 3 | 0 |
| Sales engineer one-screen summary | 3 | 3 | 0 |

## Detailed Results

### gpt-5-mini

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 47.6 | - |
| VC wedge from OSS signal | ✅ PASS | 43.7 | - |
| CTO risk exposure + patch plan | ✅ PASS | 44.3 | - |
| Exec vendor evaluation | ✅ PASS | 40.3 | - |
| Ecosystem second-order effects | ✅ PASS | 37.6 | - |
| Founder positioning vs incumbent | ✅ PASS | 50.4 | - |
| Academic literature anchor | ✅ PASS | 61.7 | - |
| Quant signal extraction | ✅ PASS | 49.1 | - |
| Product designer schema card | ✅ PASS | 46.7 | - |
| Sales engineer one-screen summary | ✅ PASS | 40.4 | - |

### claude-haiku-4.5

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 63.3 | - |
| VC wedge from OSS signal | ✅ PASS | 32.4 | - |
| CTO risk exposure + patch plan | ✅ PASS | 40.1 | - |
| Exec vendor evaluation | ✅ PASS | 67.4 | - |
| Ecosystem second-order effects | ❌ FAIL | 24.8 | Missing [DEBRIEF_V1_JSON] block |
| Founder positioning vs incumbent | ✅ PASS | 68.3 | - |
| Academic literature anchor | ✅ PASS | 18.0 | - |
| Quant signal extraction | ✅ PASS | 36.8 | - |
| Product designer schema card | ✅ PASS | 46.5 | - |
| Sales engineer one-screen summary | ✅ PASS | 53.7 | - |

### gemini-3-flash

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 15.3 | - |
| VC wedge from OSS signal | ✅ PASS | 17.4 | - |
| CTO risk exposure + patch plan | ✅ PASS | 18.0 | - |
| Exec vendor evaluation | ✅ PASS | 15.6 | - |
| Ecosystem second-order effects | ✅ PASS | 15.1 | - |
| Founder positioning vs incumbent | ✅ PASS | 20.0 | - |
| Academic literature anchor | ✅ PASS | 15.1 | - |
| Quant signal extraction | ✅ PASS | 17.3 | - |
| Product designer schema card | ✅ PASS | 16.0 | - |
| Sales engineer one-screen summary | ✅ PASS | 17.9 | - |

## Disclosure Metrics (P0 Instrumentation)

### Disclosure Level by Model

| Model | Full | Partial | None |
|-------|------|---------|------|
| gpt-5-mini | 0 | 0 | 10 |
| claude-haiku-4.5 | 0 | 0 | 10 |
| gemini-3-flash | 0 | 0 | 10 |

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
⚠️ [claude-haiku-4.5/vc_vague_openautoglm] No skill search before tool invoke
⚠️ [claude-haiku-4.5/vc_vague_openautoglm] No skill search for EARLY_STAGE_VC scenario
⚠️ [claude-haiku-4.5/vc_vague_openautoglm] No progressive disclosure meta-tools used
⚠️ [claude-haiku-4.5/cto_vague_quickjs] No skill search before tool invoke
⚠️ [claude-haiku-4.5/cto_vague_quickjs] No skill search for CTO_TECH_LEAD scenario
⚠️ [claude-haiku-4.5/cto_vague_quickjs] No progressive disclosure meta-tools used
⚠️ [claude-haiku-4.5/exec_vague_gemini] No skill search for ENTERPRISE_EXEC scenario
⚠️ [claude-haiku-4.5/ecosystem_vague_soundcloud] No skill search before tool invoke
⚠️ [claude-haiku-4.5/ecosystem_vague_soundcloud] No skill search for ECOSYSTEM_PARTNER scenario
⚠️ [claude-haiku-4.5/ecosystem_vague_soundcloud] No progressive disclosure meta-tools used
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
... and 29 more warnings
