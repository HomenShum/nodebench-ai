# Agent Pipeline — Orchestrator-Workers with Scratchpad

**Status:** Living · Last reviewed 2026-04-19
**Owner:** Core team
**Supersedes:** `HARNESS_V2_PROPOSAL.md`, `HARNESS_V2_BUILD_PLAN.md`, `HARNESS_V2_ONE_PAGER.md`, `NODEBENCH_SUBCONSCIOUS_SPEC.md`, `DEEP_AGENTS_2.0_COMPLETE.md`, `AGENT_NATIVE_UI_MCP_COMPATIBILITY.md`, `DCF_AGENT_ARCHITECTURE.md`, `DEEP_AGENT_OPTIMIZATION_GUIDE.md`, `DEEPTRACE_DIMENSION_ENGINE_IMPLEMENTATION_SPEC.md`, `NINE_LAYER_WALKTHROUGH.md`, `HARNESS_ARCHITECTURE_NEXT.md` — all archived under `docs/archive/2026-q1/architecture-superseded/`.

## TL;DR

NodeBench's harnessed agent pipeline uses the **orchestrator-workers pattern** on top of a **shared scratchpad** (markdown), with every run emitting a **telemetry trace** and a **self-review** step that can produce **user-reviewable auto-feedback**. One primitive runs many diligence blocks (founder, product, funding, news, hiring, patent, publicOpinion, competitor, regulatory) — each block is a config, not a copy-paste of the pipeline.

## Prior art — what we borrowed, and from whom

| Reference | Pattern |
|---|---|
| **Anthropic — "Building Effective Agents" (2024)** | The *Orchestrator-Workers* pattern: orchestrator holds state, workers get fresh context + scoped task + bounded tool allowlist |
| **Anthropic Claude Code `Task` tool** | Sub-agents with `subagent_type` + prompt; fresh context per call |
| **Manus AI virtual workspace** | Agents iterate on a shared markdown document before presenting structured output |
| **Cognition Devin** | Explicit "blocked" state + budget envelope per worker |
| **Reflexion (Shinn et al., 2023)** | Self-review step that reflects on failures before retry |
| **OpenAI o1 reasoning display** | Stream-as-you-think — user sees thinking as summary bullets |
| **LangSmith / Helicone / Braintrust / Phoenix / Traceloop** | Trace tree with per-node token / latency / cost rollups |
| **OWASP LLM Top 10 · Anthropic prompt-injection guidance** | Trust boundary wrapping for any user-contributed content |

## Invariants

1. **Orchestrator holds the shared scratchpad.** Workers have read access across sections, write access only to their own section.
2. **Every worker has a bounded budget** (time, tokens, tool calls). A worker never blocks forever.
3. **Every worker writes trace events** on start, on completion, and on each tool call. No silent work.
4. **Structuring is a separate pass**, not inline in workers. Markdown is the working medium; structured output is the committed artifact.
5. **Self-review runs after fan-out, before structuring.** It classifies every open question as `resolved | bounded | needs-human | known-gap`.
6. **Auto-feedback is drafted by the agent** but submitted only after explicit user review.
7. **No auto-persistence of structured output in v1.** All artifacts pass through the Session Artifacts panel for user keep/dismiss.
8. **Sub-agent fan-out is deterministic.** Given the same input + scratchpad state + tool responses, re-running produces the same structured output.

## Architecture — the six-stage pipeline

```
┌──────────────────────────────────────────────────────────────┐
│ 1. INGEST                                                     │
│    User submits a URL / file / notes / query                  │
│    → entity resolution (canonicalize who/what this is about)  │
├──────────────────────────────────────────────────────────────┤
│ 2. ORCHESTRATOR SPAWN                                          │
│    → create per-run scratchpad (markdown with block sections) │
│    → initialize agentTraceEvents row: orchestrator.running    │
├──────────────────────────────────────────────────────────────┤
│ 3. FAN-OUT (parallel)                                          │
│    For each block in the requested set:                       │
│      → spawn sub-agent with:                                  │
│          · fresh context (entity + relevant scratchpad slice) │
│          · scoped tool allowlist                              │
│          · budget envelope                                    │
│      → sub-agent iterates: search → extract → write section   │
│      → sub-agent emits trace events on every tool call        │
│    Convergence: all blocks complete OR global budget hit      │
├──────────────────────────────────────────────────────────────┤
│ 4. SELF-REVIEW                                                 │
│    Orchestrator reads scratchpad.open-questions               │
│    For each:                                                  │
│      → can resolve in remaining budget?    → schedule retry   │
│      → clear known-gap (tracked)?          → mark + feedback  │
│      → irresolvable without user?          → mark needs-human │
│    Writes "Agent bounds" section to scratchpad                 │
├──────────────────────────────────────────────────────────────┤
│ 5. STRUCTURING                                                 │
│    Second LLM call reads final markdown scratchpad            │
│    Emits structured data per block:                           │
│      · candidates with honest confidence tiers                │
│      · source refs (citation per fact)                        │
│      · grounded filter applied (isGrounded)                   │
├──────────────────────────────────────────────────────────────┤
│ 6. ATTRIBUTION                                                 │
│    Deterministic merge into Convex entity state               │
│    · sourceRefs on every fact                                 │
│    · contributionLog entry per block write                    │
│    · version bump on the target entity                        │
│    · emits structured artifacts into Session Artifacts panel  │
└──────────────────────────────────────────────────────────────┘
```

## Data model

### Scratchpad (`scratchpads` table)

```ts
{
  runId: string,                    // this run's unique ID
  entitySlug: string,               // which entity we're enriching
  version: number,                  // monotonic per-entity
  entityVersionAtStart: number,     // entity's version when we started
  markdown: string,                 // the working document
  status: "streaming" | "structuring" | "merged" | "drifted",
  createdAt, updatedAt,
}
```

**Drift detection:** if `entity.version > scratchpad.entityVersionAtStart` at merge time, the structured output was computed against stale state. Either (a) regenerate structuring, or (b) three-way merge. Default: regenerate.

### Agent trace events (`agentTraceEvents` table)

```ts
{
  runId, parentId,
  type: "orchestrator" | "subagent" | "tool" | "scratchpad" | "structuring" | "attribution",
  blockType?: BlockType,            // populated for sub-agents
  toolName?: string,
  status: "queued" | "running" | "done" | "failed",
  startedAt, completedAt,
  tokensIn, tokensOut, costCents,
  errorMessage?, summary?, payloadRef?,
}
```

Every event is append-only. Trace tree reconstructed from parentId chain. Used by `<AgentTraceBlock />` for live rendering.

### Attribution — `contributionLog`

```ts
{
  entitySlug,
  fact: StructuredFact,             // the specific claim
  blockType: BlockType,             // which block produced it
  sourceRefs: SourceRef[],          // citations
  runId: string,                    // originating run
  createdAt,
}
```

Every fact that lands on an entity is traceable to its originating block, run, and source. Never silent.

## Failure modes + recovery

| Failure | Detection | Recovery |
|---|---|---|
| Sub-agent hits budget | Worker self-reports at budget gate | Mark section `partial`, feed into self-review as open question |
| Tool 429 / rate limit | Trace event with `status: failed` + retry count | Exponential backoff up to 3x, then mark as known-gap in scratchpad |
| Structuring pass disagrees with scratchpad | Validator check: every structured fact must have a corresponding scratchpad assertion | Structuring rejected, regenerate with stricter prompt |
| Entity drift during structuring | `entity.version > scratchpad.entityVersionAtStart` | Regenerate structuring against current entity state |
| Pipeline crash mid-fan-out | Scratchpad persists; completed sections retained | Restart resumes from scratchpad — only unfinished blocks re-run |
| SSRF attempt via URL input | `server/security/urlValidation.ts` rejects pre-fetch | 400 error surfaced, agentTraceEvents records attempt |

See [agentic_reliability](../../.claude/rules/agentic_reliability.md) for the broader 8-point checklist (BOUND · HONEST_STATUS · HONEST_SCORES · TIMEOUT · SSRF · BOUND_READ · ERROR_BOUNDARY · DETERMINISTIC).

## How to extend — adding a new diligence block

See [DILIGENCE_BLOCKS.md](DILIGENCE_BLOCKS.md) for the block contract. In summary:

1. Create `server/pipeline/blocks/<name>.ts` with the `DiligenceBlock<T>` config
2. Add authority allowlist in `server/pipeline/authority/`
3. Add renderer component in `src/features/entities/components/notebook/renderers/`
4. Add fixtures in `packages/mcp-local/src/benchmarks/fixtures/`
5. Register in the orchestrator's default block set

The pipeline primitive (`server/pipeline/diligenceBlock.ts`) handles everything else — source fan-out, LLM extraction, confidence tiers, merge, contribution log. The block author only writes config + extraction schema + gates.

## Related docs

- [DILIGENCE_BLOCKS.md](DILIGENCE_BLOCKS.md) — block contract, 10 blocks enumerated
- [AGENT_OBSERVABILITY.md](AGENT_OBSERVABILITY.md) — trace tree UX
- [SCRATCHPAD_PATTERN.md](SCRATCHPAD_PATTERN.md) — the write-revise-structure cycle
- [USER_FEEDBACK_SECURITY.md](USER_FEEDBACK_SECURITY.md) — auto-feedback threat model
- [EVAL_AND_FLYWHEEL.md](EVAL_AND_FLYWHEEL.md) — Karpathy loop (deferred, trigger defined)

## Changelog

| Date | Change | Ref |
|---|---|---|
| 2026-04-19 | Initial consolidation from ~11 architecture MDs | Docs consolidation Stage 3 |
