# Kimi K2.6 Primary Rollout Findings

Generated: 2026-04-23

## Summary

NodeBench now runs the primary agent lane on `moonshotai/kimi-k2.6` via OpenRouter across the core runtime, Vercel adapter, LangGraph adapter, eval defaults, and the product-side diligence judge path. Google Deep Research remains supported as a specialized worker adapter, not the primary state model.

Current honest status:

- Primary default model: `kimi-k2.6`
- Primary eval judge default: `kimi-k2.6`
- Full capability pass rate: `100%`
- Expanded feature breadth: `100%`
- Answer-control pass rate: `100%`
- Full-stack readiness: `not_ready`

The blocker is no longer breadth or answer-control. The blocker is latency and first-attempt stability on the primary Kimi lane. The latest full-stack report shows capability `p95 latency = 174.6s`, which is above the next gate target of `<= 90s`.

## What Changed

Runtime and routing:

- OpenRouter Kimi is the default primary model across the shared runtime registry.
- OpenRouter is the preferred provider for the primary NodeBench agent lane.
- Search/RAG fallback defaults now use `moonshotai/kimi-k2.6` instead of the older GLM fallback.
- The product diligence LLM judge now runs through the shared model resolver instead of a Gemini-only fetch path.

Eval and harness:

- Comprehensive eval already had fallback/retry hardening for empty or missing-debrief responses.
- Expanded eval now has the same retry/fallback behavior and validates against the full returned answer plus recorded tool traces.
- `runEvaluation.ts` now prefers the newest expanded-eval artifact for the requested category, so a later subset run does not accidentally poison the full-stack aggregate.
- Both leaf eval runners now support targeted reruns:
  - `--scenario <id-or-substring>`
  - `--rerun-failures-from <artifact.json>`

## Verification Results

### Multi-SDK live validation

`npx convex run tools/evaluation/multiSdkLiveValidation:runMultiSdkLiveValidation "{}"`

Passed:

- OpenAI
- Anthropic
- Google Deep Research (`background_started`)
- Vercel
- LangGraph

### Expanded feature breadth

Artifact:

- [expanded-eval-2026-04-23T05-51-39.md](./expanded-eval-2026-04-23T05-51-39.md)

Result:

- total scenarios: `31`
- passed: `31`
- pass rate: `100%`

### Capability and judge

Artifact:

- [comprehensive-eval-2026-04-23T06-43-07.md](./comprehensive-eval-2026-04-23T06-43-07.md)

Result:

- overall pass rate: `100%`
- judge avg: `9.6/10`
- entity correct: `100%`
- factually accurate: `90.6%`
- no hallucinations: `90.6%`
- actionable: `100%`
- p95 latency: `174.6s`

### Answer-control

Artifact:

- [product-answer-control-eval-2026-04-23T06-43-12.md](./product-answer-control-eval-2026-04-23T06-43-12.md)

Result:

- pass rate: `100%`
- artifact decision quality: `100%`
- ambiguity recovery: `100%`
- entity resolution: `100%`

### Retention / continuity

Runner:

- `node scripts/run-retention-evals.mjs`

Result:

- passed: `4/4`
- failed: `0`
- summary: `Passed: 4/4 scenarios`

### Full-stack aggregate

Artifact:

- [full-stack-eval-latest.md](./full-stack-eval-latest.md)

Result:

- readiness: `not_ready`
- reason: capability p95 is still too high for the next gate

## Key Observation

Kimi is good enough to be the **primary default lane**, but not yet good enough to be the **sole lane**.

In both comprehensive and expanded runs, a meaningful share of successful cases required one fallback retry to `gpt-5.4` after Kimi returned an empty response with a missing debrief block on attempt one. The harness now recovers correctly, but this is still a real production signal:

- Kimi works as primary
- GPT-5.4 should remain the automatic fallback
- production confidence should not assume Kimi-only execution yet

## Faster Selective Reruns

Use these instead of full reruns:

Comprehensive single scenario:

```bash
npx tsx scripts/run-comprehensive-eval.ts --models kimi-k2.6 --suite full --scenario next_quant_tool_signal_json --judge --judge-model kimi-k2.6 --metrics --concurrency 1
```

Expanded single scenario:

```bash
npx tsx scripts/run-expanded-eval.ts --category all --model kimi-k2.6 --scenario tool_describe_schemas
```

Replay only prior failures:

```bash
npx tsx scripts/run-comprehensive-eval.ts --models kimi-k2.6 --suite full --rerun-failures-from docs/architecture/benchmarks/comprehensive-eval-2026-04-23T06-43-07.json
npx tsx scripts/run-expanded-eval.ts --category all --model kimi-k2.6 --rerun-failures-from docs/architecture/benchmarks/expanded-eval-2026-04-23T05-51-39.json
```

Aggregate without rerunning every phase:

```bash
npx tsx scripts/runEvaluation.ts --skip-typecheck --skip-build --skip-expanded --skip-dogfood --models kimi-k2.6 --judge-model kimi-k2.6 --expanded-model kimi-k2.6
```

Convenience package scripts:

```bash
npm run eval:capability -- --scenario next_quant_tool_signal_json --concurrency 1
npm run eval:feature-breadth -- --scenario tool_describe_schemas
npm run eval:retention
```

## What Is And Is Not Fully Evaluated

The current framework covers:

- answer-control and save gating
- memory-first compliance
- tool ordering
- expanded feature breadth
- product history soak across multiple owners, entities, sessions, and reads
- retention / continuity evaluation through the wiki continuity suite

The current framework still does **not yet** have a first-class, aggregate-gated metric for:

- "Never lose context of what matters to me" across the main `npm run eval` scoreboard
- continuation-value / retention quality across ultra-long chats in the shared agent lane
- multi-angle ultra-long conversations with progressive disclosure and just-in-time retrieval as a shipped scored lane

There is now a **real retention suite** in:

- `convex/domains/product/wikiDreamingEvaluationNatural.ts`
- runner: `scripts/run-retention-evals.mjs`

There is also an **ultra-long chat scaffold** in:

- `convex/domains/evaluation/scenarios/researchUltraLongChatEval.ts`

But that ultra-long-chat lane is currently a local/scaffolded scenario and is **not yet wired into** `npm run eval` or the published full-stack aggregate. So the honest status is:

- continuation / retention: **yes, evaluated**
- ultra-long multi-angle progressive-disclosure chat: **partially scaffolded, not yet aggregate-gated**

## Recommended Next Slice

1. Add a `continuation_value` eval dimension that checks whether the assistant preserves the user's durable priorities across long threads.
2. Promote `researchUltraLongChatEval.ts` into a real aggregate lane with runtime-backed traces instead of a local simulation.
3. Add a `first_attempt_stability` metric for Kimi so the fallback rate is visible and gated.
4. Keep `gpt-5.4` as the automatic fallback until Kimi's empty/missing-debrief rate drops materially.

## Latest Production Patterns For Long Chats

The current production pattern from official docs is converging on five rules:

1. Keep durable conversation state outside the raw prompt when possible.
   - OpenAI recommends stateful conversation objects and `previous_response_id` chaining instead of manually replaying everything every turn.
2. Cache the stable prefix and move volatile user-specific content to the tail.
   - OpenAI and Anthropic both document prefix-based prompt caching as the latency/cost lever for long-running assistants.
3. Do not treat a larger context window as permission to stuff everything in.
   - Anthropic explicitly warns about context rot as token count grows.
4. Persist checkpoints and branch chat state rather than forcing one linear transcript.
   - LangGraph persistence and branching chat are the clearest reference pattern for deep, multi-angle conversations.
5. Use just-in-time retrieval for new angles instead of eagerly hydrating every possible source.
   - That is the right fit for NodeBench's artifact-first retrieval plus progressive disclosure model.

## Sources

- OpenRouter Kimi K2.6 model card: [openrouter.ai/moonshotai/kimi-k2.6](https://openrouter.ai/moonshotai/kimi-k2.6)
- OpenAI prompt caching: [platform.openai.com/docs/guides/prompt-caching](https://platform.openai.com/docs/guides/prompt-caching)
- OpenAI conversation state and compaction: [platform.openai.com/docs/guides/conversation-state](https://platform.openai.com/docs/guides/conversation-state)
- OpenAI latest-model guide on allowed tools for long contexts: [platform.openai.com/docs/guides/latest-model](https://platform.openai.com/docs/guides/latest-model)
- Anthropic prompt caching: [docs.anthropic.com/en/docs/build-with-claude/prompt-caching](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching)
- Anthropic context windows: [docs.anthropic.com/en/docs/build-with-claude/context-windows](https://docs.anthropic.com/en/docs/build-with-claude/context-windows)
- LangGraph persistence: [docs.langchain.com/oss/javascript/langgraph/persistence](https://docs.langchain.com/oss/javascript/langgraph/persistence)
- LangGraph memory: [docs.langchain.com/oss/javascript/langgraph/memory](https://docs.langchain.com/oss/javascript/langgraph/memory)
- LangGraph branching chat: [docs.langchain.com/oss/javascript/langchain/frontend/branching-chat](https://docs.langchain.com/oss/javascript/langchain/frontend/branching-chat)
- Google Gemini Deep Research: [ai.google.dev/gemini-api/docs/deep-research](https://ai.google.dev/gemini-api/docs/deep-research)
