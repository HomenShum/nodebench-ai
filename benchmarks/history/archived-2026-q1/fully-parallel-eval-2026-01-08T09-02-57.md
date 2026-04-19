# Fully Parallel Evaluation Results

Generated: 2026-01-08T09:02:57.487Z
Total Time: 40.3s
Suite: core
Models: 2
Scenarios: 4
Total evaluations: 8

## Summary by Model

| Model | Total | Passed | Failed | Avg Time (s) |
|-------|-------|--------|--------|--------------|
| qwen3-235b | 4 | 4 | 0 | 18.0 |
| deepseek-r1 | 4 | 3 | 1 | 32.5 |

## Summary by Scenario

| Scenario | Total | Passed | Failed |
|----------|-------|--------|--------|
| Banker vague outreach debrief | 2 | 2 | 0 |
| VC wedge from OSS signal | 2 | 2 | 0 |
| CTO risk exposure + patch plan | 2 | 2 | 0 |
| Exec vendor evaluation | 2 | 1 | 1 |

## Detailed Results

### qwen3-235b

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 11.0 | - |
| VC wedge from OSS signal | ✅ PASS | 13.5 | - |
| CTO risk exposure + patch plan | ✅ PASS | 26.0 | - |
| Exec vendor evaluation | ✅ PASS | 21.5 | - |

### deepseek-r1

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 21.3 | - |
| VC wedge from OSS signal | ✅ PASS | 34.4 | - |
| CTO risk exposure + patch plan | ✅ PASS | 33.9 | - |
| Exec vendor evaluation | ❌ FAIL | 40.3 | Missing [DEBRIEF_V1_JSON] block |

## Disclosure Metrics (P0 Instrumentation)

### Disclosure Level by Model

| Model | Full | Partial | None |
|-------|------|---------|------|
| qwen3-235b | 0 | 0 | 4 |
| deepseek-r1 | 0 | 0 | 4 |

### Disclosure Warnings (Non-Scored)

> **Note:** These warnings are informational and do not affect pass/fail.
> They track progressive disclosure usage for Week 1-2 observability.

⚠️ [qwen3-235b/vc_vague_openautoglm] No skill search for EARLY_STAGE_VC scenario
⚠️ [qwen3-235b/cto_vague_quickjs] No skill search before tool invoke
⚠️ [qwen3-235b/cto_vague_quickjs] No skill search for CTO_TECH_LEAD scenario
⚠️ [qwen3-235b/cto_vague_quickjs] No progressive disclosure meta-tools used
⚠️ [qwen3-235b/exec_vague_gemini] No skill search for ENTERPRISE_EXEC scenario
⚠️ [deepseek-r1/banker_vague_disco] No skill search before tool invoke
⚠️ [deepseek-r1/banker_vague_disco] No progressive disclosure meta-tools used
⚠️ [deepseek-r1/vc_vague_openautoglm] No skill search before tool invoke
⚠️ [deepseek-r1/vc_vague_openautoglm] No skill search for EARLY_STAGE_VC scenario
⚠️ [deepseek-r1/vc_vague_openautoglm] No progressive disclosure meta-tools used
⚠️ [deepseek-r1/cto_vague_quickjs] No skill search before tool invoke
⚠️ [deepseek-r1/cto_vague_quickjs] No skill search for CTO_TECH_LEAD scenario
⚠️ [deepseek-r1/cto_vague_quickjs] No progressive disclosure meta-tools used
⚠️ [deepseek-r1/exec_vague_gemini] No skill search for ENTERPRISE_EXEC scenario
