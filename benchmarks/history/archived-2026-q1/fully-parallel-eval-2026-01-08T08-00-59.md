# Fully Parallel Evaluation Results

Generated: 2026-01-08T08:00:59.800Z
Total Time: 148.0s
Suite: full
Models: 2
Scenarios: 32
Total evaluations: 64

## Summary by Model

| Model | Total | Passed | Failed | Avg Time (s) |
|-------|-------|--------|--------|--------------|
| gpt-5-mini | 32 | 24 | 8 | 54.1 |
| gemini-3-flash | 32 | 20 | 12 | 57.3 |

## Summary by Scenario

| Scenario | Total | Passed | Failed |
|----------|-------|--------|--------|
| Banker vague outreach debrief | 2 | 2 | 0 |
| VC wedge from OSS signal | 2 | 2 | 0 |
| CTO risk exposure + patch plan | 2 | 2 | 0 |
| Exec vendor evaluation | 2 | 2 | 0 |
| Ecosystem second-order effects | 2 | 2 | 0 |
| Founder positioning vs incumbent | 2 | 1 | 1 |
| Academic literature anchor | 2 | 2 | 0 |
| Quant signal extraction | 2 | 2 | 0 |
| Product designer schema card | 2 | 1 | 1 |
| Sales engineer one-screen summary | 2 | 1 | 1 |
| Next: banker vague (fast debrief) | 2 | 2 | 0 |
| Next: banker tool-driven outbound pack | 2 | 1 | 1 |
| Next: VC vague wedge | 2 | 2 | 0 |
| Next: VC tool-driven comps + diligence | 2 | 2 | 0 |
| Next: CTO vague exposure | 2 | 2 | 0 |
| Next: CTO tool-driven CVE plan | 2 | 2 | 0 |
| Next: founder vague positioning | 2 | 1 | 1 |
| Next: founder tool-driven memo | 2 | 1 | 1 |
| Next: academic vague anchor | 2 | 2 | 0 |
| Next: academic tool-driven literature debrief | 2 | 0 | 2 |
| Next: exec vague standardize | 2 | 0 | 2 |
| Next: exec tool-driven cost model | 2 | 1 | 1 |
| Next: ecosystem vague incident | 2 | 0 | 2 |
| Next: ecosystem tool-driven second-order brief | 2 | 0 | 2 |
| Next: quant vague what to track | 2 | 1 | 1 |
| Next: quant tool-driven signal set JSON | 2 | 2 | 0 |
| Next: product vague UI usable | 2 | 2 | 0 |
| Next: product tool-driven expandable card schema | 2 | 1 | 1 |
| Next: sales vague shareable | 2 | 1 | 1 |
| Next: sales tool-driven one-screen + objections | 2 | 1 | 1 |
| Stress: ambiguous persona (wedge + outreach) | 2 | 1 | 1 |
| Stress: contradiction handling (Seed vs Series A) | 2 | 2 | 0 |

## Detailed Results

### gpt-5-mini

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 46.5 | - |
| VC wedge from OSS signal | ✅ PASS | 37.9 | - |
| CTO risk exposure + patch plan | ✅ PASS | 60.0 | - |
| Exec vendor evaluation | ✅ PASS | 43.9 | - |
| Ecosystem second-order effects | ✅ PASS | 45.7 | - |
| Founder positioning vs incumbent | ✅ PASS | 58.6 | - |
| Academic literature anchor | ✅ PASS | 46.7 | - |
| Quant signal extraction | ✅ PASS | 69.0 | - |
| Product designer schema card | ✅ PASS | 60.1 | - |
| Sales engineer one-screen summary | ✅ PASS | 37.4 | - |
| Next: banker vague (fast debrief) | ✅ PASS | 41.2 | - |
| Next: banker tool-driven outbound pack | ✅ PASS | 46.5 | - |
| Next: VC vague wedge | ✅ PASS | 46.1 | - |
| Next: VC tool-driven comps + diligence | ✅ PASS | 85.1 | - |
| Next: CTO vague exposure | ✅ PASS | 37.6 | - |
| Next: CTO tool-driven CVE plan | ✅ PASS | 62.4 | - |
| Next: founder vague positioning | ✅ PASS | 42.9 | - |
| Next: founder tool-driven memo | ✅ PASS | 64.0 | - |
| Next: academic vague anchor | ✅ PASS | 52.0 | - |
| Next: academic tool-driven literature debrief | ❌ FAIL | 55.8 | missing ground truth citation anchor in grounding[] |
| Next: exec vague standardize | ❌ FAIL | 46.7 | persona mismatch: got CTO_TECH_LEAD expected ENTERPRISE_EXEC |
| Next: exec tool-driven cost model | ❌ FAIL | 114.1 | missing ground truth citation anchor in grounding[] |
| Next: ecosystem vague incident | ❌ FAIL | 46.7 | persona mismatch: got CTO_TECH_LEAD expected ECOSYSTEM_PARTNER |
| Next: ecosystem tool-driven second-order brief | ❌ FAIL | 86.6 | entity mismatch: got resolvedId='N/A' canonical='QuickJS / MicroQuickJS' expecte |
| Next: quant vague what to track | ✅ PASS | 55.2 | - |
| Next: quant tool-driven signal set JSON | ✅ PASS | 56.8 | - |
| Next: product vague UI usable | ✅ PASS | 49.5 | - |
| Next: product tool-driven expandable card schema | ❌ FAIL | 67.7 | persona.inferred must be a known persona |
| Next: sales vague shareable | ✅ PASS | 32.6 | - |
| Next: sales tool-driven one-screen + objections | ❌ FAIL | 27.4 | Missing [DEBRIEF_V1_JSON] block |
| Stress: ambiguous persona (wedge + outreach) | ❌ FAIL | 52.2 | persona mismatch: got EARLY_STAGE_VC expected JPM_STARTUP_BANKER |
| Stress: contradiction handling (Seed vs Series A) | ✅ PASS | 57.8 | - |

### gemini-3-flash

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 58.2 | - |
| VC wedge from OSS signal | ✅ PASS | 52.2 | - |
| CTO risk exposure + patch plan | ✅ PASS | 53.7 | - |
| Exec vendor evaluation | ✅ PASS | 55.4 | - |
| Ecosystem second-order effects | ✅ PASS | 41.7 | - |
| Founder positioning vs incumbent | ❌ FAIL | 64.9 | Missing [DEBRIEF_V1_JSON] block |
| Academic literature anchor | ✅ PASS | 14.9 | - |
| Quant signal extraction | ✅ PASS | 14.9 | - |
| Product designer schema card | ❌ FAIL | 14.1 | Missing [DEBRIEF_V1_JSON] block |
| Sales engineer one-screen summary | ❌ FAIL | 62.6 | Invalid JSON: Expected ',' or ']' after array element in JSON at position 824 |
| Next: banker vague (fast debrief) | ✅ PASS | 65.2 | - |
| Next: banker tool-driven outbound pack | ❌ FAIL | 88.1 | persona mismatch: got SALES_ENGINEER expected JPM_STARTUP_BANKER |
| Next: VC vague wedge | ✅ PASS | 68.0 | - |
| Next: VC tool-driven comps + diligence | ✅ PASS | 148.0 | - |
| Next: CTO vague exposure | ✅ PASS | 63.1 | - |
| Next: CTO tool-driven CVE plan | ✅ PASS | 119.8 | - |
| Next: founder vague positioning | ❌ FAIL | 76.3 | missing ground truth citation anchor in grounding[] |
| Next: founder tool-driven memo | ❌ FAIL | 24.9 | Missing [DEBRIEF_V1_JSON] block |
| Next: academic vague anchor | ✅ PASS | 15.9 | - |
| Next: academic tool-driven literature debrief | ❌ FAIL | 106.1 | Missing [DEBRIEF_V1_JSON] block |
| Next: exec vague standardize | ❌ FAIL | 14.7 | Missing [DEBRIEF_V1_JSON] block |
| Next: exec tool-driven cost model | ✅ PASS | 16.2 | - |
| Next: ecosystem vague incident | ❌ FAIL | 59.5 | Missing [DEBRIEF_V1_JSON] block |
| Next: ecosystem tool-driven second-order brief | ❌ FAIL | 108.0 | Missing [DEBRIEF_V1_JSON] block |
| Next: quant vague what to track | ❌ FAIL | 13.3 | Missing [DEBRIEF_V1_JSON] block |
| Next: quant tool-driven signal set JSON | ✅ PASS | 61.6 | - |
| Next: product vague UI usable | ✅ PASS | 52.7 | - |
| Next: product tool-driven expandable card schema | ✅ PASS | 67.4 | - |
| Next: sales vague shareable | ❌ FAIL | 55.8 | Missing [DEBRIEF_V1_JSON] block |
| Next: sales tool-driven one-screen + objections | ✅ PASS | 51.8 | - |
| Stress: ambiguous persona (wedge + outreach) | ✅ PASS | 62.0 | - |
| Stress: contradiction handling (Seed vs Series A) | ✅ PASS | 62.9 | - |

## Disclosure Metrics (P0 Instrumentation)

### Disclosure Level by Model

| Model | Full | Partial | None |
|-------|------|---------|------|
| gpt-5-mini | 0 | 0 | 32 |
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
... and 92 more warnings
