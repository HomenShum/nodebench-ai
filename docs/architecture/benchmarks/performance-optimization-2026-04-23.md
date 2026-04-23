# Performance Optimization Findings

Generated: 2026-04-23

## Summary

The shared-runtime latency problem was not primarily raw tool latency. The biggest source of wasted time was model routing:

- bounded executor turns were still honoring the outer `kimi-k2.6` request as the first executor model
- many of those turns produced an empty first response
- the runtime then paid for a full fallback attempt before returning a usable answer

That created the earlier pattern of:

- average latency in the `70s`
- p95 latency in the `90s`
- several vague and tool-heavy scenarios clustering in the `82s-102s`

After the routing fix and the earlier hot-path cleanup, the capability lane now meets the next-gate latency target.

## Before / After

### Earlier post-fix baseline

From [comprehensive-eval-2026-04-23T12-18-07.md](/D:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/docs/architecture/benchmarks/comprehensive-eval-2026-04-23T12-18-07.md):

- overall pass: `100%`
- avg latency: `71.1s`
- p95 latency: `96.8s`
- judge avg: `9.7/10`

### Final capability result for this slice

From [comprehensive-eval-2026-04-23T13-35-10.md](/D:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/docs/architecture/benchmarks/comprehensive-eval-2026-04-23T13-35-10.md):

- overall pass: `100%`
- avg latency: `18.1s`
- p50 latency: `7.4s`
- p95 latency: `85.6s`
- judge avg: `9.7/10`
- entity correct: `100%`
- factually accurate: `90.6%`
- no hallucinations: `90.6%`
- actionable: `100%`

### Targeted p95-heavy replay

From [comprehensive-eval-2026-04-23T12-28-00.md](/D:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/docs/architecture/benchmarks/comprehensive-eval-2026-04-23T12-28-00.md), the previously slow scenarios collapsed to:

- `banker_vague_disco`: `9.2s`
- `vc_vague_openautoglm`: `6.6s`
- `next_banker_vague_disco_cover_this_week`: `8.0s`
- `next_exec_tool_cost_model`: `8.5s`
- `next_product_vague_make_usable_ui`: `5.2s`

## What Changed

### 1. Prompt and context hot-path cleanup

In [fastAgentPanelStreaming.ts](/D:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/convex/domains/agents/fastAgentPanelStreaming.ts):

- cached stable runtime summaries and matched-skill lookups
- parallelized several context fetch groups
- reused persisted thread messages inside compaction instead of refetching
- shortened stream attempt budgets by runtime profile
- reduced synthesis retries and preferred direct tool text when possible
- shortened prompt cache keys to avoid provider rejection

### 2. Provider configuration hardening

In [modelResolver.ts](/D:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/convex/domains/agents/mcp_tools/models/modelResolver.ts) and [healthcheck.ts](/D:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/convex/domains/agents/mcp_tools/models/healthcheck.ts):

- Google models now honor all expected API key aliases:
  - `GEMINI_API_KEY`
  - `GOOGLE_AI_API_KEY`
  - `GOOGLE_GENERATIVE_AI_API_KEY`

This removed the hard failure mode where Gemini-routed scenarios died before fallback even had a chance to help.

### 3. Executor routing fix

In [runtimeRouting.ts](/D:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/convex/domains/agents/runtimeRouting.ts):

- advisor-grade requested models no longer override the fast executor default
- `kimi-k2.6` remains valid for advisor/background orchestration
- bounded executor turns now stay on the intended Gemini 3 / MiniMax / GPT mini lanes first

This was the highest-leverage change. It removed the "Kimi first, empty response, fallback second" tax from the low-latency executor path.

## Remaining Slow Scenarios

Top remaining latencies from [comprehensive-eval-2026-04-23T13-35-10.json](/D:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/docs/architecture/benchmarks/comprehensive-eval-2026-04-23T13-35-10.json):

- `next_founder_tool_salesforce_memo`: `86.4s`
- `next_academic_tool_lit_debrief`: `85.6s`
- `next_cto_tool_cve_plan`: `82.4s`
- `cto_vague_quickjs`: `82.1s`

These are no longer general executor regressions. They are the remaining deep/tool-heavy outliers.

## Readiness

From [full-stack-eval-latest.md](/D:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/docs/architecture/benchmarks/full-stack-eval-latest.md):

- readiness: `demo_candidate`
- capability next gate: `true`
- capability production gate: `false`

The capability production gate is still blocked by the stricter p95 target:

- current p95: `85.6s`
- production target: `<= 70s`

Quality is no longer the blocker for this lane. Remaining work is latency trimming on the final four deep/tool-heavy scenarios.

## Fast Rerun Commands

Use these instead of rerunning the entire stack:

```bash
npm run eval:capability -- --scenario banker_vague_disco --concurrency 1
npm run eval:capability -- --scenario next_cto_tool_cve_plan --concurrency 1
npx tsx scripts/run-comprehensive-eval.ts --models kimi-k2.6 --suite full --judge --judge-model kimi-k2.6 --metrics --rerun-failures-from docs/architecture/benchmarks/comprehensive-eval-2026-04-23T12-18-07.json
npm run eval:assemble:latest
```

## Next Slice

If we keep optimizing latency, the next slice should be:

1. shrink or bypass the remaining deep/tool-heavy fallback path
2. reduce the outlier scenarios from `82s-86s` into the `50s-60s`
3. keep the current `100%` pass rate and `9.7/10` judge average while pushing p95 under the stricter `70s` production bar
