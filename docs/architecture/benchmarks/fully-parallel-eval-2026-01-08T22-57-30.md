# Fully Parallel Evaluation Results

Generated: 2026-01-08T22:57:30.958Z
Total Time: 131.7s
Suite: core
Models: 7
Scenarios: 10
Total evaluations: 70

## Summary by Model

| Model | Total | Passed | Failed | Avg Time (s) |
|-------|-------|--------|--------|--------------|
| claude-haiku-4.5 | 10 | 10 | 0 | 49.6 |
| gpt-5-mini | 10 | 10 | 0 | 46.4 |
| gemini-3-flash | 10 | 10 | 0 | 16.1 |
| deepseek-r1 | 10 | 8 | 2 | 63.2 |
| deepseek-v3.2 | 10 | 8 | 2 | 62.5 |
| qwen3-235b | 10 | 7 | 3 | 30.5 |
| minimax-m2.1 | 10 | 10 | 0 | 30.3 |

## Summary by Scenario

| Scenario | Total | Passed | Failed |
|----------|-------|--------|--------|
| Banker vague outreach debrief | 7 | 7 | 0 |
| VC wedge from OSS signal | 7 | 5 | 2 |
| CTO risk exposure + patch plan | 7 | 7 | 0 |
| Exec vendor evaluation | 7 | 7 | 0 |
| Ecosystem second-order effects | 7 | 7 | 0 |
| Founder positioning vs incumbent | 7 | 5 | 2 |
| Academic literature anchor | 7 | 6 | 1 |
| Quant signal extraction | 7 | 6 | 1 |
| Product designer schema card | 7 | 6 | 1 |
| Sales engineer one-screen summary | 7 | 7 | 0 |

## Detailed Results

### claude-haiku-4.5

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 31.7 | - |
| VC wedge from OSS signal | ✅ PASS | 49.6 | - |
| CTO risk exposure + patch plan | ✅ PASS | 64.0 | - |
| Exec vendor evaluation | ✅ PASS | 57.8 | - |
| Ecosystem second-order effects | ✅ PASS | 30.2 | - |
| Founder positioning vs incumbent | ✅ PASS | 87.4 | - |
| Academic literature anchor | ✅ PASS | 14.1 | - |
| Quant signal extraction | ✅ PASS | 46.4 | - |
| Product designer schema card | ✅ PASS | 52.8 | - |
| Sales engineer one-screen summary | ✅ PASS | 62.4 | - |

### gpt-5-mini

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 33.2 | - |
| VC wedge from OSS signal | ✅ PASS | 45.7 | - |
| CTO risk exposure + patch plan | ✅ PASS | 46.1 | - |
| Exec vendor evaluation | ✅ PASS | 35.9 | - |
| Ecosystem second-order effects | ✅ PASS | 38.7 | - |
| Founder positioning vs incumbent | ✅ PASS | 57.4 | - |
| Academic literature anchor | ✅ PASS | 49.8 | - |
| Quant signal extraction | ✅ PASS | 69.2 | - |
| Product designer schema card | ✅ PASS | 51.5 | - |
| Sales engineer one-screen summary | ✅ PASS | 36.6 | - |

### gemini-3-flash

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 11.6 | - |
| VC wedge from OSS signal | ✅ PASS | 13.7 | - |
| CTO risk exposure + patch plan | ✅ PASS | 14.2 | - |
| Exec vendor evaluation | ✅ PASS | 12.6 | - |
| Ecosystem second-order effects | ✅ PASS | 14.5 | - |
| Founder positioning vs incumbent | ✅ PASS | 34.0 | - |
| Academic literature anchor | ✅ PASS | 11.8 | - |
| Quant signal extraction | ✅ PASS | 15.6 | - |
| Product designer schema card | ✅ PASS | 17.0 | - |
| Sales engineer one-screen summary | ✅ PASS | 16.0 | - |

### deepseek-r1

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 34.8 | - |
| VC wedge from OSS signal | ❌ FAIL | 61.7 | persona mismatch: got FOUNDER_STRATEGY expected EARLY_STAGE_VC |
| CTO risk exposure + patch plan | ✅ PASS | 49.6 | - |
| Exec vendor evaluation | ✅ PASS | 60.9 | - |
| Ecosystem second-order effects | ✅ PASS | 40.8 | - |
| Founder positioning vs incumbent | ❌ FAIL | 131.7 | missing ground truth citation anchor in grounding[] |
| Academic literature anchor | ✅ PASS | 37.9 | - |
| Quant signal extraction | ✅ PASS | 69.7 | - |
| Product designer schema card | ✅ PASS | 77.0 | - |
| Sales engineer one-screen summary | ✅ PASS | 67.6 | - |

### deepseek-v3.2

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 55.9 | - |
| VC wedge from OSS signal | ❌ FAIL | 17.7 | Missing [DEBRIEF_V1_JSON] block |
| CTO risk exposure + patch plan | ✅ PASS | 41.5 | - |
| Exec vendor evaluation | ✅ PASS | 54.8 | - |
| Ecosystem second-order effects | ✅ PASS | 94.3 | - |
| Founder positioning vs incumbent | ✅ PASS | 127.4 | - |
| Academic literature anchor | ✅ PASS | 88.1 | - |
| Quant signal extraction | ✅ PASS | 59.4 | - |
| Product designer schema card | ❌ FAIL | 17.9 | Missing [DEBRIEF_V1_JSON] block |
| Sales engineer one-screen summary | ✅ PASS | 68.0 | - |

### qwen3-235b

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 22.1 | - |
| VC wedge from OSS signal | ✅ PASS | 22.2 | - |
| CTO risk exposure + patch plan | ✅ PASS | 34.8 | - |
| Exec vendor evaluation | ✅ PASS | 19.5 | - |
| Ecosystem second-order effects | ✅ PASS | 42.9 | - |
| Founder positioning vs incumbent | ❌ FAIL | 28.7 | missing ground truth citation anchor in grounding[] |
| Academic literature anchor | ❌ FAIL | 21.1 | Invalid JSON: Expected property name or '}' in JSON at position 586 |
| Quant signal extraction | ❌ FAIL | 45.6 | Missing [DEBRIEF_V1_JSON] block |
| Product designer schema card | ✅ PASS | 47.5 | - |
| Sales engineer one-screen summary | ✅ PASS | 20.8 | - |

### minimax-m2.1

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 25.6 | - |
| VC wedge from OSS signal | ✅ PASS | 28.0 | - |
| CTO risk exposure + patch plan | ✅ PASS | 19.8 | - |
| Exec vendor evaluation | ✅ PASS | 26.1 | - |
| Ecosystem second-order effects | ✅ PASS | 50.8 | - |
| Founder positioning vs incumbent | ✅ PASS | 32.9 | - |
| Academic literature anchor | ✅ PASS | 26.0 | - |
| Quant signal extraction | ✅ PASS | 28.6 | - |
| Product designer schema card | ✅ PASS | 40.3 | - |
| Sales engineer one-screen summary | ✅ PASS | 25.2 | - |

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

⚠️ [claude-haiku-4.5/banker_vague_disco] No skill search before tool invoke
⚠️ [claude-haiku-4.5/banker_vague_disco] No progressive disclosure meta-tools used
⚠️ [claude-haiku-4.5/vc_vague_openautoglm] No skill search for EARLY_STAGE_VC scenario
⚠️ [claude-haiku-4.5/cto_vague_quickjs] No skill search for CTO_TECH_LEAD scenario
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
... and 107 more warnings
