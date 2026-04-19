# Agent Observability — Live Trace in Chat

**Status:** Living · Last reviewed 2026-04-19
**Owner:** Core team

## TL;DR

Every agent run emits a **trace tree** that renders live inside the Chat page as a dedicated `<AgentTraceBlock />` component. Tree shape: orchestrator → sub-agents → tool calls. Rollup metrics at each parent (tokens, time, cost). Collapses to a one-line summary when the run completes.

## Prior art

| Reference | Pattern |
|---|---|
| **Anthropic Claude Code** | Inline tool-call cards with expand-to-see-input |
| **Anthropic Console Workbench** | Full tool-use + thinking timeline |
| **Perplexity Agent Mode** | Animated search-step cards |
| **OpenAI o1 reasoning display** | Stream-as-you-think bullets |
| **LangSmith / Helicone / Braintrust / Phoenix / Traceloop** | Tree trace with per-node metrics |

## Invariants

1. **Always live during active run.** Collapses to one-line summary when done.
2. **Hierarchy preserved.** Orchestrator > sub-agents > tool calls > (optional) payload preview.
3. **Rollup metrics at every parent.** Total time, total tokens, total cost, tool count.
4. **Streaming via Convex reactivity.** No polling.
5. **Drill-down per node.** Click any node → tool input / output / scratchpad slice.
6. **Cost visible upfront.** Not buried in drilldown — user sees what each query costs.
7. **Ambient, not modal.** Embedded in chat transcript like a Claude Code tool card.

## Data model

See `agentTraceEvents` table in [AGENT_PIPELINE.md#data-model](AGENT_PIPELINE.md#data-model).

## Architecture

```
┌─────────────────────────────────────────────────┐
│ ◎ Diligence: Acme AI       3.2s · 2.4k tok     │
│                            $0.003 · 4 tools    │
├─────────────────────────────────────────────────┤
│ ▾ Orchestrator            1.2s · 600t          │
│   ✓ Resolved entity       120ms                │
│   ⟳ Fanning out 7 blocks                       │
│                                                 │
│ ▾ Sub-agents                                    │
│   ⟳ [founder]  2/3   420ms · 280t · 3 tools    │
│     ✓ search(linkedin, press)  180ms · 90t     │
│     ✓ extract(candidates)      160ms · 140t    │
│     ⟳ verify(grounded)          ongoing         │
│   ✓ [product]  done  680ms · 410t              │
│   ✓ [funding]  done  510ms · 320t              │
│   ⟳ [news]     1/2    90ms · 180t              │
│   ○ [hiring]   queued                           │
│   ○ [patent]   queued                           │
│   ○ [publicOpinion] queued                      │
│                                                 │
│ ○ Structuring pass        pending              │
├─────────────────────────────────────────────────┤
│ Scratchpad growing — [Preview] [Pause] [Open]  │
└─────────────────────────────────────────────────┘
```

## Component + hook

- `src/features/chat/components/AgentTraceBlock.tsx` — live subscriber, renders tree
- `src/features/chat/components/AgentTraceNode.tsx` — recursive node renderer
- `src/features/chat/hooks/useAgentTrace.ts` — Convex subscription + rollup math

## Failure modes

| Failure | Detection | Recovery |
|---|---|---|
| Trace events lag behind actual work | Heartbeat check per sub-agent | UI shows "reconnecting..." · keeps last known state |
| Parent node never completes | Budget envelope triggers "force-complete" | Node marked `failed` with reason |
| User pauses a run | Trigger budget cancellation | Sub-agents self-report paused state · resumable |

## How to extend

Adding a new trace event type:

1. Extend `type` enum in `agentTraceEvents` schema
2. Add renderer branch in `AgentTraceNode.tsx`
3. Update rollup logic if the new type contributes metrics

## Related

- [AGENT_PIPELINE.md](AGENT_PIPELINE.md) — pipeline that emits events
- [SESSION_ARTIFACTS.md](SESSION_ARTIFACTS.md) — companion UI that shows output artifacts
- [USER_FEEDBACK_SECURITY.md](USER_FEEDBACK_SECURITY.md) — auto-feedback drafted from bounded failures surfaced in trace

## Changelog

| Date | Change |
|---|---|
| 2026-04-19 | Initial trace UI spec |
