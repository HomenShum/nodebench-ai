# Fully Parallel Evaluation Results

Generated: 2026-01-08T09:52:52.247Z
Total Time: 246.3s
Suite: core
Models: 7
Scenarios: 3
Total evaluations: 21

## Summary by Model

| Model | Total | Passed | Failed | Avg Time (s) |
|-------|-------|--------|--------|--------------|
| claude-haiku-4.5 | 3 | 3 | 0 | 19.7 |
| gpt-5-mini | 3 | 3 | 0 | 39.6 |
| gemini-3-flash | 3 | 3 | 0 | 14.9 |
| deepseek-r1 | 3 | 3 | 0 | 44.1 |
| deepseek-v3.2 | 3 | 3 | 0 | 148.9 |
| qwen3-235b | 3 | 2 | 1 | 11.4 |
| minimax-m2.1 | 3 | 3 | 0 | 23.0 |

## Summary by Scenario

| Scenario | Total | Passed | Failed |
|----------|-------|--------|--------|
| Banker vague outreach debrief | 7 | 7 | 0 |
| VC wedge from OSS signal | 7 | 6 | 1 |
| CTO risk exposure + patch plan | 7 | 7 | 0 |

## Detailed Results

### claude-haiku-4.5

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 16.4 | - |
| VC wedge from OSS signal | ✅ PASS | 18.8 | - |
| CTO risk exposure + patch plan | ✅ PASS | 24.0 | - |

### gpt-5-mini

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 33.7 | - |
| VC wedge from OSS signal | ✅ PASS | 43.6 | - |
| CTO risk exposure + patch plan | ✅ PASS | 41.4 | - |

### gemini-3-flash

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 13.1 | - |
| VC wedge from OSS signal | ✅ PASS | 16.5 | - |
| CTO risk exposure + patch plan | ✅ PASS | 15.0 | - |

### deepseek-r1

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 43.9 | - |
| VC wedge from OSS signal | ✅ PASS | 19.5 | - |
| CTO risk exposure + patch plan | ✅ PASS | 68.9 | - |

### deepseek-v3.2

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 246.2 | - |
| VC wedge from OSS signal | ✅ PASS | 78.3 | - |
| CTO risk exposure + patch plan | ✅ PASS | 122.1 | - |

### qwen3-235b

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 15.0 | - |
| VC wedge from OSS signal | ❌ FAIL | 5.3 | Missing [DEBRIEF_V1_JSON] block |
| CTO risk exposure + patch plan | ✅ PASS | 14.0 | - |

### minimax-m2.1

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 19.8 | - |
| VC wedge from OSS signal | ✅ PASS | 27.4 | - |
| CTO risk exposure + patch plan | ✅ PASS | 21.8 | - |

## Disclosure Metrics (P0 Instrumentation)

### Disclosure Level by Model

| Model | Full | Partial | None |
|-------|------|---------|------|
| claude-haiku-4.5 | 0 | 0 | 3 |
| gpt-5-mini | 0 | 0 | 3 |
| gemini-3-flash | 0 | 0 | 3 |
| deepseek-r1 | 0 | 0 | 3 |
| deepseek-v3.2 | 0 | 0 | 3 |
| qwen3-235b | 0 | 0 | 3 |
| minimax-m2.1 | 0 | 0 | 3 |

### Disclosure Warnings (Non-Scored)

> **Note:** These warnings are informational and do not affect pass/fail.
> They track progressive disclosure usage for Week 1-2 observability.

⚠️ [claude-haiku-4.5/banker_vague_disco] No skill search before tool invoke
⚠️ [claude-haiku-4.5/banker_vague_disco] No progressive disclosure meta-tools used
⚠️ [claude-haiku-4.5/vc_vague_openautoglm] No skill search before tool invoke
⚠️ [claude-haiku-4.5/vc_vague_openautoglm] No skill search for EARLY_STAGE_VC scenario
⚠️ [claude-haiku-4.5/vc_vague_openautoglm] No progressive disclosure meta-tools used
⚠️ [claude-haiku-4.5/cto_vague_quickjs] No skill search before tool invoke
⚠️ [claude-haiku-4.5/cto_vague_quickjs] No skill search for CTO_TECH_LEAD scenario
⚠️ [claude-haiku-4.5/cto_vague_quickjs] No progressive disclosure meta-tools used
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
⚠️ [deepseek-r1/banker_vague_disco] No skill search before tool invoke
⚠️ [deepseek-r1/banker_vague_disco] No progressive disclosure meta-tools used
⚠️ [deepseek-r1/vc_vague_openautoglm] No skill search for EARLY_STAGE_VC scenario
⚠️ [deepseek-r1/cto_vague_quickjs] No skill search before tool invoke
⚠️ [deepseek-r1/cto_vague_quickjs] No skill search for CTO_TECH_LEAD scenario
⚠️ [deepseek-r1/cto_vague_quickjs] No progressive disclosure meta-tools used
⚠️ [deepseek-v3.2/banker_vague_disco] No skill search before tool invoke
⚠️ [deepseek-v3.2/banker_vague_disco] No progressive disclosure meta-tools used
⚠️ [deepseek-v3.2/vc_vague_openautoglm] No skill search before tool invoke
⚠️ [deepseek-v3.2/vc_vague_openautoglm] No skill search for EARLY_STAGE_VC scenario
⚠️ [deepseek-v3.2/vc_vague_openautoglm] No progressive disclosure meta-tools used
⚠️ [deepseek-v3.2/cto_vague_quickjs] No skill search before tool invoke
⚠️ [deepseek-v3.2/cto_vague_quickjs] No skill search for CTO_TECH_LEAD scenario
⚠️ [deepseek-v3.2/cto_vague_quickjs] No progressive disclosure meta-tools used
⚠️ [qwen3-235b/vc_vague_openautoglm] No skill search for EARLY_STAGE_VC scenario
⚠️ [qwen3-235b/cto_vague_quickjs] No skill search for CTO_TECH_LEAD scenario
⚠️ [minimax-m2.1/banker_vague_disco] No skill search before tool invoke
⚠️ [minimax-m2.1/banker_vague_disco] No progressive disclosure meta-tools used
⚠️ [minimax-m2.1/vc_vague_openautoglm] No skill search before tool invoke
⚠️ [minimax-m2.1/vc_vague_openautoglm] No skill search for EARLY_STAGE_VC scenario
⚠️ [minimax-m2.1/vc_vague_openautoglm] No progressive disclosure meta-tools used
⚠️ [minimax-m2.1/cto_vague_quickjs] No skill search before tool invoke
⚠️ [minimax-m2.1/cto_vague_quickjs] No skill search for CTO_TECH_LEAD scenario
⚠️ [minimax-m2.1/cto_vague_quickjs] No progressive disclosure meta-tools used
