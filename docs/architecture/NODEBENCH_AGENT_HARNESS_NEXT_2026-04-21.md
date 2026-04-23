# NodeBench Agent Harness Next

Date: 2026-04-21
Status: recommended next-step architecture memo
Scope: post-eval follow-up after UX fixes and expanded capability suite

## Why this exists

We fixed the four highest-signal UX defects from the April 21 dogfood/eval pass and expanded capability coverage beyond the original 3 core scenarios. The next question is not only "what failed?" but "what should the runtime become?"

This memo translates:

- current NodeBench eval results
- current NodeBench artifact model
- latest patterns from Claude Code, LangGraph, Hermes Agent, DeerFlow, and OpenClaw

into a concrete NodeBench recommendation.

## Current state

### UX fixes now landed

- Composer mode active state is explicit and stable.
- Voice button active state is explicit and stable.
- `Me` no longer depends on a fragile native dropdown interaction model.
- root-level screen flash caused by `startViewTransition` is removed.
- chat lens switching now updates URL state instead of being silently reset by search-param hydration.

Related code:

- [ChatHome.tsx](../../src/features/chat/views/ChatHome.tsx)
- [HomeLanding.tsx](../../src/features/home/views/HomeLanding.tsx)
- [ProductIntakeComposer.tsx](../../src/features/product/components/ProductIntakeComposer.tsx)
- [AskNodeBenchPill.tsx](../../src/features/agents/components/AskNodeBenchPill.tsx)
- [MeHome.tsx](../../src/features/me/views/MeHome.tsx)
- [CockpitLayout.tsx](../../src/layouts/CockpitLayout.tsx)

### Current eval status

From [comprehensive-eval-2026-04-21T16-23-48.md](./benchmarks/comprehensive-eval-2026-04-21T16-23-48.md):

- overall pass rate: `53.1%`
- memory-first compliance: `61.5%`
- tool ordering accuracy: `61.5%`
- average latency: `45.1s`
- p95 latency: `136.7s`
- LLM judge average: `5.4/10`
- `factuallyAccurate`: `14%`
- `noHallucinations`: `17%`
- `isActionable`: `28%`

From [expanded-eval-2026-04-21T17-30-53.md](./benchmarks/expanded-eval-2026-04-21T17-30-53.md):

- scenarios: `31`
- pass rate: `61.3%`
- strongest categories: `calendar`, `spreadsheet`
- weakest categories: `web`, some `media`, some `hybrid`, some `tools`

Interpretation:

- the notebook/report substrate is stronger than the runtime quality layer
- the current system is better at structured internal tasks than fresh, grounded, multi-source external reasoning
- the next improvement frontier is harness quality, not just prompt tweaking

## What the latest agent systems are converging on

### Claude Code

Useful patterns:

- project and user memory files with layered resolution via `CLAUDE.md`
- subagents with their own tool permissions
- hooks on `SubagentStart`, `SubagentStop`, `Stop`, `PermissionDenied`, `SessionStart`
- permission modes and explicit allow/deny/ask rules

What matters for NodeBench:

- use hooks/events as enforcement and telemetry boundaries, not just as convenience callbacks
- keep project memory layered and scoped, instead of re-injecting giant summaries every turn
- treat subagents as scoped execution contexts, not as magical parallelism

Official refs:

- https://code.claude.com/docs/en/memory
- https://code.claude.com/docs/en/hooks
- https://docs.anthropic.com/en/docs/claude-code/sub-agents
- https://docs.anthropic.com/en/docs/claude-code/settings

### LangGraph / Deep Agents

Useful patterns:

- durable execution through a persistence layer
- interrupt-based human approval
- per-invocation vs per-thread subgraph persistence
- subgraphs for isolated specialist state
- time-travel/checkpoint inspection

What matters for NodeBench:

- explicit interrupt/resume is a better primitive than ad hoc "background mode"
- most subagents should be per-invocation
- only long-horizon specialists should keep per-thread state
- checkpoint state needs to be a first-class product/debugging object

Official refs:

- https://docs.langchain.com/oss/python/langgraph/durable-execution
- https://docs.langchain.com/oss/python/langgraph/interrupts
- https://docs.langchain.com/oss/python/langgraph/use-subgraphs
- https://docs.langchain.com/oss/python/deepagents/overview
- https://docs.langchain.com/oss/python/deepagents/human-in-the-loop

### Hermes Agent

Useful patterns:

- one platform-agnostic core agent with multiple entry surfaces
- profile isolation for separate state, configs, sessions, and gateways
- defense-in-depth security with approval modes, sandboxing, credential filtering, and context scanning
- worktree-based concurrency for parallel agent work

What matters for NodeBench:

- keep one runtime core for chat, pulse, background, and notebook operations
- isolate agent state per profile/workspace for eval and concurrency
- introduce `manual | smart | off` approval modes for risky tool actions
- use worktrees or equivalent isolated directories for parallel coding/eval agents

Official refs:

- https://hermes-agent.nousresearch.com/docs/developer-guide/architecture/
- https://hermes-agent.nousresearch.com/docs/user-guide/security/
- https://hermes-agent.nousresearch.com/docs/user-guide/profiles
- https://hermes-agent.nousresearch.com/docs/user-guide/git-worktrees

### DeerFlow

Useful patterns:

- "batteries included" harness instead of a bag of disconnected agent pieces
- explicit gateway/runtime topology
- sandbox-aware execution middleware
- strict tool-call recovery for malformed/interrupted tool histories
- long-horizon lead-agent + subagent design

What matters for NodeBench:

- fix tool-call recovery at the harness layer instead of relying on model obedience
- keep a runtime middleware chain around runs: uploads, sandbox, summarization, title/context, planner, recovery
- consider a gateway mode that embeds the runtime for lower-latency product flows

Official refs:

- https://github.com/bytedance/deer-flow
- https://github.com/bytedance/deer-flow/blob/main/backend/docs/ARCHITECTURE.md

### OpenClaw

Useful patterns:

- single long-lived gateway as the control-plane edge
- capability layering: core capability layer, vendor plugin layer, channel/surface layer
- explicit delegate tiers with hard blocks, sandboxing, and audit trail
- markdown-first memory plus compaction
- idempotency keys on side-effecting methods

What matters for NodeBench:

- build a stronger control plane around the run system
- separate core reasoning/runtime policy from vendor/search/model adapters and UI surfaces
- add idempotency keys to externally visible or expensive run steps
- keep memory compacted and inspectable rather than opaque

Official refs:

- https://docs.openclaw.ai/concepts/architecture
- https://docs.openclaw.ai/concepts/delegate-architecture
- https://docs.openclaw.ai/plugins/architecture
- https://docs.openclaw.ai/concepts/memory

## Recommended NodeBench target

### Keep these invariants

Do not change:

- `productBlocks` for owned notebook content
- scratchpad/run working memory
- `diligenceProjections` as the bridge into the notebook/report
- report as the same artifact in read mode
- pulse as a scheduled page on the same substrate

These are still the correct product boundaries.

### Add these runtime primitives

#### 1. Canonical run graph

Create one canonical run object with:

- `runId`
- `sessionId`
- `artifactTarget`
- `mode`
- `status`
- `budget`
- `providerBudgetState`
- `checkpointPointer`
- `interruptState`

Then move all execution state off implicit chat/session assumptions and onto that run graph.

#### 2. Interrupt/resume as a first-class product primitive

Replace ad hoc approval flows with a typed interrupt object:

- `approval_required`
- `edit_tool_args`
- `needs_missing_context`
- `queued_for_budget`
- `awaiting_human_accept`

This should drive:

- chat cards
- drawer flow state
- notebook overlay state
- background continuation

#### 3. Two subagent persistence modes

Default:

- per-invocation subagents for one-off block work

Allowed selectively:

- per-thread persistent subagents for long-lived specialists such as:
  - entity memory curator
  - pulse watcher
  - customer export/CRM assistant

Do not give every subagent persistent state.

#### 4. Tool-call recovery and idempotency

Add a recovery layer that:

- validates tool-call/result sequences before the next model call
- inserts placeholder tool results when a dangling tool call would poison history
- dedupes side-effecting steps with idempotency keys
- records retry lineage explicitly in run events

This is the single most practical lesson from DeerFlow and OpenClaw.

#### 5. Capability-layer split

Adopt this shape:

```text
core runtime layer
  planning, budgets, interrupts, retries, structuring, projections

vendor adapter layer
  model providers, search providers, fetchers, embeddings, export backends

surface layer
  chat page, notebook drawer, report read mode, pulse, share, CSV export
```

Do not let surface components talk directly to provider-specific semantics.

#### 6. Smart approval modes

Add:

- `manual`
- `smart`
- `off`

for risky tools only. Use `smart` for:

- destructive edits
- external sends
- large spend escalations
- bulk exports
- public share publication

#### 7. Compaction pipeline tied to the artifact model

Use:

```text
scratchpad
-> structuring
-> projections
-> accept/publish
-> entity memory topics
-> compact summary/index
```

Do not let raw scratchpad become memory.

## Three viable runtime variants

### Variant A: NodeBench-native orchestrator, hardened

What it is:

- keep Convex-first orchestration
- keep current notebook/report substrate
- add interrupts, provider budgets, recovery, and canonical `runEvents`

Pros:

- least migration risk
- best fit with current product model
- easiest to ship incrementally

Cons:

- more custom harness logic to maintain
- slower path to richer graph inspection/time travel

Best if:

- priority is product shipping this quarter

### Variant B: LangGraph kernel under the product

What it is:

- treat NodeBench UI/artifact plane as the product shell
- run deep/slow/background logic on LangGraph-style durable graphs
- persist graph checkpoints but project outputs back into Convex artifacts

Pros:

- best-in-class interrupts/checkpointing/subgraph semantics
- easier HITL and replay
- cleaner multi-agent state model

Cons:

- more runtime/platform complexity
- migration risk if adopted too broadly too early

Best if:

- priority is long-horizon agent reliability and richer eval/replay

### Variant C: Hybrid gateway + embedded runtime

What it is:

- keep the current UI and Convex state
- add a long-lived control-plane gateway for routing, budgets, approvals, and run streaming
- embed the runtime for fast lane; queue deep lane behind the same gateway

Pros:

- best control-plane story
- strongest path for multi-session, multi-entity, prolonged usage
- easiest to add org/delegate style surfaces later

Cons:

- highest systems complexity
- more infra/ops work

Best if:

- priority is customer-facing multi-session scale and auditable operations

## Recommended choice

Choose `Variant A` now, but shape it so `Variant C` is the natural next step.

In practice:

1. harden the current NodeBench runtime
2. add canonical run graph + interrupts + run events + recovery
3. keep the product artifact model exactly as-is
4. keep subagents narrow and mostly per-invocation
5. only move toward a gateway-style control plane once the run graph is stable

This avoids a rewrite while still aligning with where the best current systems are going.

## Model strategy changes

### Current finding

The current local eval already shows that cheap/fast is not enough if the model fails groundedness. The weakest lane is not coherence; it is factual usefulness and debrief quality.

### Recommended model policy

- fast lane:
  - small, strong tool-using model
  - shallow budget
  - must answer from artifact state first
- deep lane:
  - stronger reasoning model for planner + synthesis
  - cheaper model for rote extraction/search summarization
- judge lane:
  - separate judge model from answer model
  - deterministic rubric first, LLM judge second

### Anti-patterns

- one model for all phases
- cheapest model for deep synthesis
- judging with the same model and prompt family that generated the answer

## Harness changes required for the next eval step

### Immediate

- add deterministic contradiction filters ahead of Gemini/LLM QA issue creation
- add route-state proof to all browser-eval actions
- split web-grounding scenarios into:
  - entity-first
  - cross-source verification
  - stale-data detection
  - export/share follow-through

### Next

- add prolonged-usage evals with:
  - multiple entities
  - multiple sessions per entity
  - retrieval across prior artifacts
  - pulse carry-forward
  - export/share tasks after long history accumulation

### Required scoreboard additions

- first useful answer latency
- first visible report block latency
- groundedness pass rate
- stale-data detection accuracy
- reuse-of-existing-artifact rate
- duplicate external-call suppression rate
- interrupt approval recovery rate

## Concrete next implementation slices

1. Introduce a canonical `runEvents` stream and unify checkpoint/action/progress under it.
2. Add typed interrupt records and UI cards for resume/approve/edit.
3. Add provider token buckets and queue visibility to the flow drawer.
4. Add tool-call sequence validation and dangling-tool repair before each model turn.
5. Add per-subagent persistence mode config: `invocation | thread`.
6. Add a typed capability adapter layer between runtime and providers.
7. Extend expanded eval with harder web-grounding and prolonged-history scenarios.

## Bottom line

NodeBench does not need a second agent platform.

It needs:

- a stronger run kernel
- explicit interrupts
- better recovery
- narrower subagent state
- capability layering
- smarter evals

The notebook/report/pulse product model is already the right differentiator. The runtime now needs to catch up to it.
