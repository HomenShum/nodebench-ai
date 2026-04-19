# Fully Parallel Evaluation Results

Generated: 2026-01-08T07:52:17.252Z
Total Time: 45.3s
Suite: full
Models: 3
Scenarios: 3
Total evaluations: 9

## Summary by Model

| Model | Total | Passed | Failed | Avg Time (s) |
|-------|-------|--------|--------|--------------|
| gpt-5-mini | 3 | 3 | 0 | 41.1 |
| claude-haiku-4.5 | 3 | 2 | 1 | 17.4 |
| gemini-3-flash | 3 | 3 | 0 | 15.8 |

## Summary by Scenario

| Scenario | Total | Passed | Failed |
|----------|-------|--------|--------|
| Banker vague outreach debrief | 3 | 2 | 1 |
| VC wedge from OSS signal | 3 | 3 | 0 |
| CTO risk exposure + patch plan | 3 | 3 | 0 |

## Detailed Results

### gpt-5-mini

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 41.1 | - |
| VC wedge from OSS signal | ✅ PASS | 45.3 | - |
| CTO risk exposure + patch plan | ✅ PASS | 36.9 | - |

### claude-haiku-4.5

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ❌ FAIL | 16.2 | funding.stage mismatch: got 'N/A' expected 'Seed' |
| VC wedge from OSS signal | ✅ PASS | 18.2 | - |
| CTO risk exposure + patch plan | ✅ PASS | 17.6 | - |

### gemini-3-flash

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 15.5 | - |
| VC wedge from OSS signal | ✅ PASS | 16.3 | - |
| CTO risk exposure + patch plan | ✅ PASS | 15.7 | - |

## Disclosure Metrics (P0 Instrumentation)

### Disclosure Level by Model

| Model | Full | Partial | None |
|-------|------|---------|------|
| gpt-5-mini | 0 | 0 | 3 |
| claude-haiku-4.5 | 0 | 0 | 3 |
| gemini-3-flash | 0 | 0 | 3 |

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
⚠️ [claude-haiku-4.5/banker_vague_disco] No skill search before tool invoke
⚠️ [claude-haiku-4.5/banker_vague_disco] No progressive disclosure meta-tools used
⚠️ [claude-haiku-4.5/vc_vague_openautoglm] No skill search before tool invoke
⚠️ [claude-haiku-4.5/vc_vague_openautoglm] No skill search for EARLY_STAGE_VC scenario
⚠️ [claude-haiku-4.5/vc_vague_openautoglm] No progressive disclosure meta-tools used
⚠️ [claude-haiku-4.5/cto_vague_quickjs] No skill search before tool invoke
⚠️ [claude-haiku-4.5/cto_vague_quickjs] No skill search for CTO_TECH_LEAD scenario
⚠️ [claude-haiku-4.5/cto_vague_quickjs] No progressive disclosure meta-tools used
⚠️ [gemini-3-flash/banker_vague_disco] No skill search before tool invoke
⚠️ [gemini-3-flash/banker_vague_disco] No progressive disclosure meta-tools used
⚠️ [gemini-3-flash/vc_vague_openautoglm] No skill search before tool invoke
⚠️ [gemini-3-flash/vc_vague_openautoglm] No skill search for EARLY_STAGE_VC scenario
⚠️ [gemini-3-flash/vc_vague_openautoglm] No progressive disclosure meta-tools used
⚠️ [gemini-3-flash/cto_vague_quickjs] No skill search before tool invoke
⚠️ [gemini-3-flash/cto_vague_quickjs] No skill search for CTO_TECH_LEAD scenario
⚠️ [gemini-3-flash/cto_vague_quickjs] No progressive disclosure meta-tools used
