# Persona Episode Eval (Raw Live Agent)

Generated: 2026-01-06T04:54:00.179Z
Git SHA: 48f80b32fb12f7fed3732e6edc41a0bbf9e6ec1b
Convex: https://formal-shepherd-851.convex.cloud
Model: claude-haiku-4.5
Elapsed: 250408ms

## Summary
- ok=true total=3 passed=3 failed=0

## Pricing (API)
- provider=anthropic model=Claude Haiku 4.5 baseInput=$1/MTok output=$5/MTok cacheHit=$0.1/MTok
- providerTokens: input=262770 output=5679 cachedInputTokens=0 estCostUsd=$0.2912

## Totals (Execution)
- steps=6 toolCalls=3 toolResults=3 estInputTokens=5591 estOutputTokens=4443
- providerTokens: input=262770 output=5679 cachedInput=0

## Runs
| Scenario | Persona | Entity | Status | Notes |
|---|---|---|---:|---|
| Banker vague outreach debrief | JPM_STARTUP_BANKER | DISCO | PASS |  |
| CTO risk exposure + patch plan | CTO_TECH_LEAD | MQUICKJS | PASS |  |
| Exec vendor evaluation | ENTERPRISE_EXEC | GEMINI_3 | PASS |  |
