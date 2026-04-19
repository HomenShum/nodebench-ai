# Fully Parallel Evaluation Results

Generated: 2026-01-08T08:56:37.594Z
Total Time: 77.8s
Suite: core
Models: 5
Scenarios: 3
Total evaluations: 15

## Summary by Model

| Model | Total | Passed | Failed | Avg Time (s) |
|-------|-------|--------|--------|--------------|
| gpt-5-mini | 3 | 3 | 0 | 60.9 |
| gemini-3-flash | 3 | 3 | 0 | 15.4 |
| deepseek-v3.2 | 3 | 3 | 0 | 74.7 |
| minimax-m2.1 | 3 | 3 | 0 | 24.2 |
| qwen3-235b | 3 | 3 | 0 | 29.2 |

## Summary by Scenario

| Scenario | Total | Passed | Failed |
|----------|-------|--------|--------|
| Banker vague outreach debrief | 5 | 5 | 0 |
| VC wedge from OSS signal | 5 | 5 | 0 |
| CTO risk exposure + patch plan | 5 | 5 | 0 |

## Detailed Results

### gpt-5-mini

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 63.8 | - |
| VC wedge from OSS signal | ✅ PASS | 49.2 | - |
| CTO risk exposure + patch plan | ✅ PASS | 69.7 | - |

### gemini-3-flash

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 13.2 | - |
| VC wedge from OSS signal | ✅ PASS | 18.6 | - |
| CTO risk exposure + patch plan | ✅ PASS | 14.3 | - |

### deepseek-v3.2

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 70.1 | - |
| VC wedge from OSS signal | ✅ PASS | 76.3 | - |
| CTO risk exposure + patch plan | ✅ PASS | 77.7 | - |

### minimax-m2.1

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 28.9 | - |
| VC wedge from OSS signal | ✅ PASS | 19.9 | - |
| CTO risk exposure + patch plan | ✅ PASS | 23.7 | - |

### qwen3-235b

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 32.3 | - |
| VC wedge from OSS signal | ✅ PASS | 28.0 | - |
| CTO risk exposure + patch plan | ✅ PASS | 27.3 | - |

## Disclosure Metrics (P0 Instrumentation)

### Disclosure Level by Model

| Model | Full | Partial | None |
|-------|------|---------|------|
| gpt-5-mini | 0 | 0 | 3 |
| gemini-3-flash | 0 | 0 | 3 |
| deepseek-v3.2 | 0 | 0 | 3 |
| minimax-m2.1 | 0 | 0 | 3 |
| qwen3-235b | 0 | 0 | 3 |

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
⚠️ [gemini-3-flash/banker_vague_disco] No skill search before tool invoke
⚠️ [gemini-3-flash/banker_vague_disco] No progressive disclosure meta-tools used
⚠️ [gemini-3-flash/vc_vague_openautoglm] No skill search before tool invoke
⚠️ [gemini-3-flash/vc_vague_openautoglm] No skill search for EARLY_STAGE_VC scenario
⚠️ [gemini-3-flash/vc_vague_openautoglm] No progressive disclosure meta-tools used
⚠️ [gemini-3-flash/cto_vague_quickjs] No skill search before tool invoke
⚠️ [gemini-3-flash/cto_vague_quickjs] No skill search for CTO_TECH_LEAD scenario
⚠️ [gemini-3-flash/cto_vague_quickjs] No progressive disclosure meta-tools used
⚠️ [deepseek-v3.2/banker_vague_disco] No skill search before tool invoke
⚠️ [deepseek-v3.2/banker_vague_disco] No progressive disclosure meta-tools used
⚠️ [deepseek-v3.2/vc_vague_openautoglm] No skill search before tool invoke
⚠️ [deepseek-v3.2/vc_vague_openautoglm] No skill search for EARLY_STAGE_VC scenario
⚠️ [deepseek-v3.2/vc_vague_openautoglm] No progressive disclosure meta-tools used
⚠️ [deepseek-v3.2/cto_vague_quickjs] No skill search before tool invoke
⚠️ [deepseek-v3.2/cto_vague_quickjs] No skill search for CTO_TECH_LEAD scenario
⚠️ [deepseek-v3.2/cto_vague_quickjs] No progressive disclosure meta-tools used
⚠️ [minimax-m2.1/banker_vague_disco] No skill search before tool invoke
⚠️ [minimax-m2.1/banker_vague_disco] No progressive disclosure meta-tools used
⚠️ [minimax-m2.1/vc_vague_openautoglm] No skill search before tool invoke
⚠️ [minimax-m2.1/vc_vague_openautoglm] No skill search for EARLY_STAGE_VC scenario
⚠️ [minimax-m2.1/vc_vague_openautoglm] No progressive disclosure meta-tools used
⚠️ [minimax-m2.1/cto_vague_quickjs] No skill search before tool invoke
⚠️ [minimax-m2.1/cto_vague_quickjs] No skill search for CTO_TECH_LEAD scenario
⚠️ [minimax-m2.1/cto_vague_quickjs] No progressive disclosure meta-tools used
⚠️ [qwen3-235b/banker_vague_disco] No skill search before tool invoke
⚠️ [qwen3-235b/banker_vague_disco] No progressive disclosure meta-tools used
⚠️ [qwen3-235b/vc_vague_openautoglm] No skill search before tool invoke
⚠️ [qwen3-235b/vc_vague_openautoglm] No skill search for EARLY_STAGE_VC scenario
⚠️ [qwen3-235b/vc_vague_openautoglm] No progressive disclosure meta-tools used
⚠️ [qwen3-235b/cto_vague_quickjs] No skill search for CTO_TECH_LEAD scenario
