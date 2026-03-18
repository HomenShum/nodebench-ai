# Fully Parallel Evaluation Results

Generated: 2026-01-08T07:57:39.086Z
Total Time: 131.0s
Suite: full
Models: 3
Scenarios: 32
Total evaluations: 96

## Summary by Model

| Model | Total | Passed | Failed | Avg Time (s) |
|-------|-------|--------|--------|--------------|
| gpt-5-mini | 32 | 25 | 7 | 58.1 |
| claude-haiku-4.5 | 32 | 0 | 32 | 4.3 |
| gemini-3-flash | 32 | 21 | 11 | 51.6 |

## Summary by Scenario

| Scenario | Total | Passed | Failed |
|----------|-------|--------|--------|
| Banker vague outreach debrief | 3 | 2 | 1 |
| VC wedge from OSS signal | 3 | 2 | 1 |
| CTO risk exposure + patch plan | 3 | 2 | 1 |
| Exec vendor evaluation | 3 | 2 | 1 |
| Ecosystem second-order effects | 3 | 2 | 1 |
| Founder positioning vs incumbent | 3 | 1 | 2 |
| Academic literature anchor | 3 | 1 | 2 |
| Quant signal extraction | 3 | 1 | 2 |
| Product designer schema card | 3 | 2 | 1 |
| Sales engineer one-screen summary | 3 | 1 | 2 |
| Next: banker vague (fast debrief) | 3 | 2 | 1 |
| Next: banker tool-driven outbound pack | 3 | 2 | 1 |
| Next: VC vague wedge | 3 | 2 | 1 |
| Next: VC tool-driven comps + diligence | 3 | 2 | 1 |
| Next: CTO vague exposure | 3 | 1 | 2 |
| Next: CTO tool-driven CVE plan | 3 | 2 | 1 |
| Next: founder vague positioning | 3 | 1 | 2 |
| Next: founder tool-driven memo | 3 | 1 | 2 |
| Next: academic vague anchor | 3 | 2 | 1 |
| Next: academic tool-driven literature debrief | 3 | 0 | 3 |
| Next: exec vague standardize | 3 | 0 | 3 |
| Next: exec tool-driven cost model | 3 | 1 | 2 |
| Next: ecosystem vague incident | 3 | 0 | 3 |
| Next: ecosystem tool-driven second-order brief | 3 | 0 | 3 |
| Next: quant vague what to track | 3 | 2 | 1 |
| Next: quant tool-driven signal set JSON | 3 | 2 | 1 |
| Next: product vague UI usable | 3 | 2 | 1 |
| Next: product tool-driven expandable card schema | 3 | 2 | 1 |
| Next: sales vague shareable | 3 | 2 | 1 |
| Next: sales tool-driven one-screen + objections | 3 | 1 | 2 |
| Stress: ambiguous persona (wedge + outreach) | 3 | 1 | 2 |
| Stress: contradiction handling (Seed vs Series A) | 3 | 2 | 1 |

## Detailed Results

### gpt-5-mini

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 43.1 | - |
| VC wedge from OSS signal | ✅ PASS | 56.4 | - |
| CTO risk exposure + patch plan | ✅ PASS | 39.4 | - |
| Exec vendor evaluation | ✅ PASS | 44.0 | - |
| Ecosystem second-order effects | ✅ PASS | 61.2 | - |
| Founder positioning vs incumbent | ✅ PASS | 60.5 | - |
| Academic literature anchor | ✅ PASS | 51.4 | - |
| Quant signal extraction | ✅ PASS | 61.0 | - |
| Product designer schema card | ✅ PASS | 44.5 | - |
| Sales engineer one-screen summary | ✅ PASS | 47.3 | - |
| Next: banker vague (fast debrief) | ✅ PASS | 40.3 | - |
| Next: banker tool-driven outbound pack | ✅ PASS | 60.7 | - |
| Next: VC vague wedge | ✅ PASS | 41.2 | - |
| Next: VC tool-driven comps + diligence | ✅ PASS | 63.2 | - |
| Next: CTO vague exposure | ✅ PASS | 50.5 | - |
| Next: CTO tool-driven CVE plan | ✅ PASS | 77.6 | - |
| Next: founder vague positioning | ✅ PASS | 57.1 | - |
| Next: founder tool-driven memo | ✅ PASS | 63.3 | - |
| Next: academic vague anchor | ✅ PASS | 50.3 | - |
| Next: academic tool-driven literature debrief | ❌ FAIL | 69.5 | missing ground truth citation anchor in grounding[] |
| Next: exec vague standardize | ❌ FAIL | 52.3 | persona mismatch: got CTO_TECH_LEAD expected ENTERPRISE_EXEC |
| Next: exec tool-driven cost model | ❌ FAIL | 86.5 | missing ground truth citation anchor in grounding[] |
| Next: ecosystem vague incident | ❌ FAIL | 51.2 | persona mismatch: got CTO_TECH_LEAD expected ECOSYSTEM_PARTNER |
| Next: ecosystem tool-driven second-order brief | ❌ FAIL | 131.0 | entity mismatch: got resolvedId='N/A' canonical='Unspecified Incident' expected  |
| Next: quant vague what to track | ✅ PASS | 66.6 | - |
| Next: quant tool-driven signal set JSON | ✅ PASS | 75.6 | - |
| Next: product vague UI usable | ✅ PASS | 51.0 | - |
| Next: product tool-driven expandable card schema | ✅ PASS | 70.4 | - |
| Next: sales vague shareable | ✅ PASS | 42.4 | - |
| Next: sales tool-driven one-screen + objections | ❌ FAIL | 36.8 | Missing [DEBRIEF_V1_JSON] block |
| Stress: ambiguous persona (wedge + outreach) | ❌ FAIL | 55.1 | persona mismatch: got EARLY_STAGE_VC expected JPM_STARTUP_BANKER |
| Stress: contradiction handling (Seed vs Series A) | ✅ PASS | 56.6 | - |

### claude-haiku-4.5

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ❌ FAIL | 3.7 | Missing [DEBRIEF_V1_JSON] block |
| VC wedge from OSS signal | ❌ FAIL | 4.1 | Missing [DEBRIEF_V1_JSON] block |
| CTO risk exposure + patch plan | ❌ FAIL | 3.9 | Missing [DEBRIEF_V1_JSON] block |
| Exec vendor evaluation | ❌ FAIL | 4.0 | Missing [DEBRIEF_V1_JSON] block |
| Ecosystem second-order effects | ❌ FAIL | 9.3 | Missing [DEBRIEF_V1_JSON] block |
| Founder positioning vs incumbent | ❌ FAIL | 4.1 | Missing [DEBRIEF_V1_JSON] block |
| Academic literature anchor | ❌ FAIL | 3.8 | Missing [DEBRIEF_V1_JSON] block |
| Quant signal extraction | ❌ FAIL | 3.8 | Missing [DEBRIEF_V1_JSON] block |
| Product designer schema card | ❌ FAIL | 3.9 | Missing [DEBRIEF_V1_JSON] block |
| Sales engineer one-screen summary | ❌ FAIL | 3.6 | Missing [DEBRIEF_V1_JSON] block |
| Next: banker vague (fast debrief) | ❌ FAIL | 3.9 | Missing [DEBRIEF_V1_JSON] block |
| Next: banker tool-driven outbound pack | ❌ FAIL | 4.3 | Missing [DEBRIEF_V1_JSON] block |
| Next: VC vague wedge | ❌ FAIL | 4.2 | Missing [DEBRIEF_V1_JSON] block |
| Next: VC tool-driven comps + diligence | ❌ FAIL | 3.7 | Missing [DEBRIEF_V1_JSON] block |
| Next: CTO vague exposure | ❌ FAIL | 4.0 | Missing [DEBRIEF_V1_JSON] block |
| Next: CTO tool-driven CVE plan | ❌ FAIL | 4.4 | Missing [DEBRIEF_V1_JSON] block |
| Next: founder vague positioning | ❌ FAIL | 4.3 | Missing [DEBRIEF_V1_JSON] block |
| Next: founder tool-driven memo | ❌ FAIL | 4.2 | Missing [DEBRIEF_V1_JSON] block |
| Next: academic vague anchor | ❌ FAIL | 4.2 | Missing [DEBRIEF_V1_JSON] block |
| Next: academic tool-driven literature debrief | ❌ FAIL | 3.9 | Missing [DEBRIEF_V1_JSON] block |
| Next: exec vague standardize | ❌ FAIL | 3.8 | Missing [DEBRIEF_V1_JSON] block |
| Next: exec tool-driven cost model | ❌ FAIL | 3.9 | Missing [DEBRIEF_V1_JSON] block |
| Next: ecosystem vague incident | ❌ FAIL | 9.3 | Missing [DEBRIEF_V1_JSON] block |
| Next: ecosystem tool-driven second-order brief | ❌ FAIL | 3.8 | Missing [DEBRIEF_V1_JSON] block |
| Next: quant vague what to track | ❌ FAIL | 4.1 | Missing [DEBRIEF_V1_JSON] block |
| Next: quant tool-driven signal set JSON | ❌ FAIL | 4.0 | Missing [DEBRIEF_V1_JSON] block |
| Next: product vague UI usable | ❌ FAIL | 3.9 | Missing [DEBRIEF_V1_JSON] block |
| Next: product tool-driven expandable card schema | ❌ FAIL | 3.9 | Missing [DEBRIEF_V1_JSON] block |
| Next: sales vague shareable | ❌ FAIL | 3.9 | Missing [DEBRIEF_V1_JSON] block |
| Next: sales tool-driven one-screen + objections | ❌ FAIL | 4.0 | Missing [DEBRIEF_V1_JSON] block |
| Stress: ambiguous persona (wedge + outreach) | ❌ FAIL | 4.1 | Missing [DEBRIEF_V1_JSON] block |
| Stress: contradiction handling (Seed vs Series A) | ❌ FAIL | 3.6 | Missing [DEBRIEF_V1_JSON] block |

### gemini-3-flash

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 49.5 | - |
| VC wedge from OSS signal | ✅ PASS | 53.8 | - |
| CTO risk exposure + patch plan | ✅ PASS | 17.2 | - |
| Exec vendor evaluation | ✅ PASS | 49.6 | - |
| Ecosystem second-order effects | ✅ PASS | 47.4 | - |
| Founder positioning vs incumbent | ❌ FAIL | 88.1 | Missing [DEBRIEF_V1_JSON] block |
| Academic literature anchor | ❌ FAIL | 16.1 | Missing [DEBRIEF_V1_JSON] block |
| Quant signal extraction | ❌ FAIL | 14.9 | Missing [DEBRIEF_V1_JSON] block |
| Product designer schema card | ✅ PASS | 56.2 | - |
| Sales engineer one-screen summary | ❌ FAIL | 57.8 | Invalid JSON: Expected ',' or ']' after array element in JSON at position 1073 |
| Next: banker vague (fast debrief) | ✅ PASS | 57.2 | - |
| Next: banker tool-driven outbound pack | ✅ PASS | 72.1 | - |
| Next: VC vague wedge | ✅ PASS | 66.9 | - |
| Next: VC tool-driven comps + diligence | ✅ PASS | 104.4 | - |
| Next: CTO vague exposure | ❌ FAIL | 15.5 | Missing [DEBRIEF_V1_JSON] block |
| Next: CTO tool-driven CVE plan | ✅ PASS | 78.6 | - |
| Next: founder vague positioning | ❌ FAIL | 71.0 | missing ground truth citation anchor in grounding[] |
| Next: founder tool-driven memo | ❌ FAIL | 14.6 | Missing [DEBRIEF_V1_JSON] block |
| Next: academic vague anchor | ✅ PASS | 16.9 | - |
| Next: academic tool-driven literature debrief | ❌ FAIL | 94.5 | Missing [DEBRIEF_V1_JSON] block |
| Next: exec vague standardize | ❌ FAIL | 51.5 | persona mismatch: got CTO_TECH_LEAD expected ENTERPRISE_EXEC |
| Next: exec tool-driven cost model | ✅ PASS | 19.2 | - |
| Next: ecosystem vague incident | ❌ FAIL | 40.0 | persona mismatch: got CTO_TECH_LEAD expected ECOSYSTEM_PARTNER |
| Next: ecosystem tool-driven second-order brief | ❌ FAIL | 106.3 | Missing [DEBRIEF_V1_JSON] block |
| Next: quant vague what to track | ✅ PASS | 59.7 | - |
| Next: quant tool-driven signal set JSON | ✅ PASS | 53.5 | - |
| Next: product vague UI usable | ✅ PASS | 65.6 | - |
| Next: product tool-driven expandable card schema | ✅ PASS | 17.4 | - |
| Next: sales vague shareable | ✅ PASS | 46.1 | - |
| Next: sales tool-driven one-screen + objections | ✅ PASS | 78.3 | - |
| Stress: ambiguous persona (wedge + outreach) | ✅ PASS | 53.9 | - |
| Stress: contradiction handling (Seed vs Series A) | ✅ PASS | 18.3 | - |

## Disclosure Metrics (P0 Instrumentation)

### Disclosure Level by Model

| Model | Full | Partial | None |
|-------|------|---------|------|
| gpt-5-mini | 0 | 0 | 32 |
| claude-haiku-4.5 | 0 | 0 | 32 |
| gemini-3-flash | 0 | 0 | 32 |

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
⚠️ [gpt-5-mini/next_banker_vague_disco_cover_this_week] No skill search before tool invoke
⚠️ [gpt-5-mini/next_banker_vague_disco_cover_this_week] No progressive disclosure meta-tools used
⚠️ [gpt-5-mini/next_banker_tool_ambros_outbound_pack] No skill search before tool invoke
⚠️ [gpt-5-mini/next_banker_tool_ambros_outbound_pack] No progressive disclosure meta-tools used
⚠️ [gpt-5-mini/next_vc_vague_disco_wedge] No skill search before tool invoke
⚠️ [gpt-5-mini/next_vc_vague_disco_wedge] No skill search for EARLY_STAGE_VC scenario
⚠️ [gpt-5-mini/next_vc_vague_disco_wedge] No progressive disclosure meta-tools used
⚠️ [gpt-5-mini/next_vc_tool_disco_comps] No skill search before tool invoke
⚠️ [gpt-5-mini/next_vc_tool_disco_comps] No skill search for EARLY_STAGE_VC scenario
⚠️ [gpt-5-mini/next_vc_tool_disco_comps] No progressive disclosure meta-tools used
⚠️ [gpt-5-mini/next_cto_vague_quickjs_exposure] No skill search before tool invoke
⚠️ [gpt-5-mini/next_cto_vague_quickjs_exposure] No skill search for CTO_TECH_LEAD scenario
⚠️ [gpt-5-mini/next_cto_vague_quickjs_exposure] No progressive disclosure meta-tools used
⚠️ [gpt-5-mini/next_cto_tool_cve_plan] No skill search before tool invoke
⚠️ [gpt-5-mini/next_cto_tool_cve_plan] No skill search for CTO_TECH_LEAD scenario
⚠️ [gpt-5-mini/next_cto_tool_cve_plan] No progressive disclosure meta-tools used
⚠️ [gpt-5-mini/next_founder_vague_salesforce_agentforce] No skill search before tool invoke
⚠️ [gpt-5-mini/next_founder_vague_salesforce_agentforce] No skill search for FOUNDER_STRATEGY scenario
⚠️ [gpt-5-mini/next_founder_vague_salesforce_agentforce] No progressive disclosure meta-tools used
⚠️ [gpt-5-mini/next_founder_tool_salesforce_memo] No skill search before tool invoke
⚠️ [gpt-5-mini/next_founder_tool_salesforce_memo] No skill search for FOUNDER_STRATEGY scenario
... and 127 more warnings
