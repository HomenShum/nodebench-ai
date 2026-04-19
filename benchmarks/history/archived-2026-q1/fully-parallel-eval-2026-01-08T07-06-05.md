# Fully Parallel Evaluation Results

Generated: 2026-01-08T07:06:05.975Z
Total Time: 18.3s
Suite: core
Models: 1
Scenarios: 3
Total evaluations: 3

## Summary by Model

| Model | Total | Passed | Failed | Avg Time (s) |
|-------|-------|--------|--------|--------------|
| claude-haiku-4.5 | 3 | 3 | 0 | 17.2 |

## Summary by Scenario

| Scenario | Total | Passed | Failed |
|----------|-------|--------|--------|
| Banker vague outreach debrief | 1 | 1 | 0 |
| VC wedge from OSS signal | 1 | 1 | 0 |
| CTO risk exposure + patch plan | 1 | 1 | 0 |

## Detailed Results

### claude-haiku-4.5

| Scenario | Status | Time (s) | Failures |
|----------|--------|----------|----------|
| Banker vague outreach debrief | ✅ PASS | 15.6 | - |
| VC wedge from OSS signal | ✅ PASS | 17.7 | - |
| CTO risk exposure + patch plan | ✅ PASS | 18.3 | - |

## Disclosure Metrics (P0 Instrumentation)

### Disclosure Level by Model

| Model | Full | Partial | None |
|-------|------|---------|------|
| claude-haiku-4.5 | 0 | 0 | 3 |

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
