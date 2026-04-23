# Ultra-Long Chat Advisor/Executor Findings

Generated: 2026-04-23

## Decision

NodeBench should use a Claude Code-style advisor/executor architecture for long sessions:

- `advisor`: separate-context orchestrator, durable continuity owner, bounded planning lane
- `executor`: cheaper, narrower lanes that answer the current angle after compaction and JIT hydration
- `runtime order`: compaction first, JIT retrieval second, model routing third
- `parallel escalation`: only use team-style fanout when the task benefits from genuinely independent workers

For the current rollout:

- `primary advisor`: `kimi-k2.6`
- `primary executors`: `gemini-3.1-flash-lite-preview`, `gemini-3-flash-preview`
- `bounded fallbacks`: `minimax-m2.7`, `gpt-5.4-mini`
- `background large-context lane`: `gemini-3.1-pro-preview` first, then `gpt-5.4`, then `kimi-k2.6`

This keeps the main runtime coherent:

- Kimi handles orchestration and long-horizon continuity.
- Gemini 3 handles most cheap execution turns.
- MiniMax and GPT mini stay available when a specific executor lane is cheaper or more stable for the task.

## Source-backed rationale

Official references used:

- Anthropic Claude Code subagents: [https://docs.anthropic.com/en/docs/claude-code/sub-agents](https://docs.anthropic.com/en/docs/claude-code/sub-agents)
- Anthropic Claude Code agent teams: [https://code.claude.com/docs/en/agent-teams](https://code.claude.com/docs/en/agent-teams)
- Anthropic Claude Code changelog: [https://code.claude.com/docs/en/changelog](https://code.claude.com/docs/en/changelog)
- Anthropic Claude Code hooks: [https://code.claude.com/docs/en/hooks](https://code.claude.com/docs/en/hooks)
- Anthropic Claude Code MCP: [https://docs.anthropic.com/en/docs/claude-code/mcp](https://docs.anthropic.com/en/docs/claude-code/mcp)
- Google Gemini models: [https://ai.google.dev/gemini-api/docs/models](https://ai.google.dev/gemini-api/docs/models)
- Google Gemini Deep Research: [https://ai.google.dev/gemini-api/docs/deep-research](https://ai.google.dev/gemini-api/docs/deep-research)
- OpenRouter Kimi K2.6: [https://openrouter.ai/moonshotai/kimi-k2.6](https://openrouter.ai/moonshotai/kimi-k2.6)
- OpenRouter MiniMax M2.7: [https://openrouter.ai/minimax/minimax-m2.7](https://openrouter.ai/minimax/minimax-m2.7)

What matters from those sources:

- Claude Code's current public pattern is specialized subagents with separate context windows, configurable tool permissions, and inherited MCP access when allowed.
- Claude Code agent teams add a lead-plus-teammates model only for work that benefits from real parallel exploration, and Anthropic is explicit that teams cost more tokens and add coordination overhead.
- Claude Code's recent releases also added recap plus PreCompact and PostCompact hooks, which reinforces the NodeBench choice to treat compaction as a first-class runtime step instead of a prompt trick.
- Google's current model page puts `Gemini 3.1 Pro Preview`, `Gemini 3 Flash Preview`, and `Gemini 3.1 Flash-Lite Preview` at the front of the family, and it explicitly marks the older Gemini 3 Pro preview as deprecated. Deep Research is available as a separate preview agent.
- OpenRouter's current cards position `kimi-k2.6` as a long-horizon, multi-agent orchestration model and `minimax-m2.7` as a strong agentic executor.

That maps directly to NodeBench:

- Use Kimi as the lead advisor/orchestrator.
- Use Gemini 3 executor lanes for most cheap, bounded turns.
- Keep MiniMax and GPT mini only as bounded executor fallbacks.
- Reserve team-style multi-agent fanout for slow, high-value, parallelizable work.

## What shipped

Runtime and evaluation changes:

- Added a shared Convex CLI helper for focused eval lanes on Windows:
  - [scripts/lib/convexCli.mjs](/D:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/scripts/lib/convexCli.mjs)
- Fixed focused rerun scripts:
  - [scripts/run-retention-evals.mjs](/D:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/scripts/run-retention-evals.mjs)
  - [scripts/run-ultra-long-chat-eval.mjs](/D:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/scripts/run-ultra-long-chat-eval.mjs)
- Implemented compaction-first working sets:
  - [shared/ultraLongChatContext.ts](/D:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/shared/ultraLongChatContext.ts)
- Added runtime advisor/executor routing:
  - [convex/domains/agents/runtimeRouting.ts](/D:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/convex/domains/agents/runtimeRouting.ts)
  - [convex/domains/agents/runtimeRouting.test.ts](/D:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/convex/domains/agents/runtimeRouting.test.ts)
- Updated runtime model registry and policy:
  - [convex/domains/agents/mcp_tools/models/modelResolver.ts](/D:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/convex/domains/agents/mcp_tools/models/modelResolver.ts)
  - [shared/llm/modelCatalog.ts](/D:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/shared/llm/modelCatalog.ts)
  - [src/shared/llm/approvedModels.ts](/D:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/src/shared/llm/approvedModels.ts)
- Added and tightened long-chat eval lanes:
  - [convex/domains/evaluation/scenarios/researchUltraLongChatEval.ts](/D:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/convex/domains/evaluation/scenarios/researchUltraLongChatEval.ts)
  - [convex/domains/evaluation/scenarios/ultraLongChatRealPathEval.ts](/D:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/convex/domains/evaluation/scenarios/ultraLongChatRealPathEval.ts)
  - [scripts/runEvaluation.ts](/D:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/scripts/runEvaluation.ts)
- Added a dedicated script for fast reruns:
  - [package.json](/D:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/package.json)

Compaction behavior now explicitly does this:

- keeps a smaller hot window
- keeps a scored priority ledger for durable user priorities
- keeps angle capsules for active threads of thought
- hydrates only a few JIT slices at a time
- treats freshness mostly as retrieval policy, not as an always-on semantic angle
- routes the hydrated turn through the advisor/executor chooser only after the working set is built

## Results

Latest focused artifacts:

- [retention-eval-latest.md](/D:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/docs/architecture/benchmarks/retention-eval-latest.md)
- [ultra-long-chat-eval-latest.md](/D:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/docs/architecture/benchmarks/ultra-long-chat-eval-latest.md)

Focused results after fixes:

- Retention continuity: `4/4 passed` (`100%`)
- Ultra-long progressive disclosure: `80`, `passed`
- Ultra-long real path: `102`, `passed`
- Real-path savings vs kitchen sink: `50%`
- Final real-path context rot risk: `medium`

Important observed behavior:

- The priority ledger now preserves durable user goals like equity upside and ramp time across the full long session.
- Recap turns reuse cache instead of rehydrating personal or pulse context by default.
- The advisor/executor split is real in the routing path now: Kimi remains the advisor, while execution turns stay on Gemini 3 lanes unless a bounded fallback is needed.
- The runtime now mirrors the latest Claude Code public pattern more closely: cheap separate-context workers for focused work, with team-like escalation reserved for truly parallel tasks instead of every long conversation.

## Selective rerun workflow

When only the long-chat and continuity slice changes, do not rerun the entire suite first.

Recommended loop:

1. If Convex functions changed, deploy the current backend:

```powershell
npx convex deploy -y --typecheck=enable
```

2. Run only the continuity lane:

```powershell
npm run eval:retention
```

3. Run only the ultra-long lane:

```powershell
npm run eval:ultra-long
```

4. Reassemble the aggregate report without rerunning capability, expanded, dogfood, notebook, or history lanes:

```powershell
npx tsx scripts/runEvaluation.ts --skip-typecheck --skip-build --skip-capability --skip-expanded --skip-answer-control --skip-dogfood --skip-notebook --skip-history
```

This is the fast path for iterative work on:

- long-chat compaction
- JIT retrieval behavior
- advisor/executor routing
- continuity and retention regressions

## Current policy

Use this as the working policy until the next architecture revision:

- `compaction first`
- `JIT retrieval second`
- `advisor/executor routing third`
- `Kimi K2.6` is the main orchestrator
- `Gemini 3.1 Flash-Lite` and `Gemini 3 Flash` are the primary executor lanes
- `MiniMax M2.7` and `GPT-5.4 Mini` are bounded executor fallbacks, not the default path
- `team-style multi-agent fanout` is reserved for slow, high-value, parallelizable work

That is the current best fit for ultra-long, multi-angle, multi-context chat in NodeBench.
