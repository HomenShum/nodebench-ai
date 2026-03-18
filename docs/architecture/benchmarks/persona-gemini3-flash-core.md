# Persona Episode Eval (Raw Live Agent)

Generated: 2026-01-20T10:18:08.114Z
Git SHA: 8855f5f82eff2962a0459bd16d1c29720d5d3dc7
Convex: https://formal-shepherd-851.convex.cloud
Model: gemini-3-flash
Elapsed: 65000ms

## Summary
- ok=true total=3 passed=3 failed=0

## Pricing (API)
- provider=google model=Gemini 3 Flash Preview input=$0.5/1M output=$3/1M (over200k: in=$? out=$?)
- providerTokens: input=276036 output=2793 cachedInputTokens=217060 estCostUsd=$0.1464

## Totals (Execution)
- steps=10 toolCalls=17 toolResults=15 estInputTokens=5137 estOutputTokens=3051
- providerTokens: input=276036 output=2793 cachedInput=217060

## Runs
| Scenario | Persona | Entity | Status | Notes |
|---|---|---|---:|---|
| Banker vague outreach debrief | JPM_STARTUP_BANKER | DISCO | PASS |  |
| CTO risk exposure + patch plan | CTO_TECH_LEAD | MQUICKJS | PASS |  |
| Exec vendor evaluation | ENTERPRISE_EXEC | GEMINI_3 | PASS |  |
