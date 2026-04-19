# NodeBench "Ask NodeBench" Docs Assistant — Architecture Spec

## Overview

One visible assistant surface. Multi-level orchestration behind it. The user sees "Ask NodeBench" — a single input that answers questions about docs, architecture, the current workspace, and operational state. No agent management UI. No "select your specialist." One box, one answer stream, one evidence tray.

The system routes internally through intent classification, specialist dispatch, and tool-level policy enforcement — all invisible to the user unless they open the trace rail.

---

## Architecture Layers

### Level 0: Presenter

The only user-facing surface. Renders the input, the answer stream, and the evidence citations.

| Component | File | Role |
|-----------|------|------|
| FastAgentPanel | `src/features/agents/components/FastAgentPanel/FastAgentPanel.tsx` | Chat container: input bar, message stream, thread list, evidence tray |
| AgentPresenceRail | `src/layouts/AgentPresenceRail.tsx` | Shell-level presence strip: current task label, active specialist count, pending approvals |
| InputBar | `FastAgentPanel.InputBar.tsx` | Single text input + voice. No mode selector. |
| UIMessageStream | `FastAgentPanel.UIMessageStream.tsx` | Streamed answer rendering with inline citations |
| DisclosureTrace | `FastAgentPanel.DisclosureTrace.tsx` | Optional expansion: shows which specialists ran, what tools fired, latencies |

**Presenter rules:**
- Default placeholder: `"Ask NodeBench about docs, architecture, or the current workspace..."`
- Empty state shows 4 suggested queries (contextual to current route)
- Answer stream starts within 500ms of submit (streaming, not batch)
- Citations render inline as `[docs]` `[code]` `[trace]` badges — clickable to expand source
- AgentPresenceRail shows: current task (1 line), specialist count (0-3), evidence count, confidence tier (high/medium/low)

### Level 1: Intent Router

Classifies the user query into one of 5 intent categories. Boolean gate: route or reject. No numeric scoring.

| Intent | Description | Routed to |
|--------|-------------|-----------|
| `docs` | Questions about product docs, features, how-to | docs-retriever |
| `codebase` | Questions about implementation, file locations, architecture | codebase-explainer |
| `product` | Questions about roadmap, strategy, design decisions | research-synthesizer |
| `operator` | Questions about system health, agent status, execution state | execution-trace-auditor |
| `action-request` | Requests to do something (run a tool, trigger a workflow) | rejected with explanation — "Ask NodeBench" is read-only |

**Implementation mapping:**
- Primary: `convex/domains/agents/orchestrator/toolRouter.ts` — `isCircuitOpen` check before dispatch, `ToolResult<T>` contract for all responses
- Secondary: `src/hooks/useVoiceIntentRouter.ts` — client-side alias matching for voice input (40+ aliases, 14 callbacks)
- Classification: LLM call with structured output, constrained to the 5 categories above. Falls back to `docs` on timeout.

**Gate logic:**
```
if intent == "action-request" → reject("Ask NodeBench answers questions. Use the command palette for actions.")
if intent confidence < threshold → ask clarifying question (max 1 clarification per query)
else → dispatch to specialist
```

### Level 2: Specialist Workers

Each specialist is a bounded worker that retrieves, synthesizes, and returns structured evidence. Max 3 parallel. Max 90s wall clock per query.

| Specialist | Input | Output | Tools |
|------------|-------|--------|-------|
| **docs-retriever** | Query + current route context | Answer text + doc section citations | Vector search over docs, section retrieval |
| **codebase-explainer** | Query + file context hints | Answer text + file:line citations | AST search, file read, symbol lookup |
| **research-synthesizer** | Query + research surface state | Answer text + signal/source citations | Research hub data, narrative state, briefings |
| **execution-trace-auditor** | Query + agent stats | Answer text + receipt/trace citations | Action receipts, agent runs, queue state |

**Worker lifecycle (maps to `queueProtocol.ts`):**
1. `enqueueRun` — Intent router creates a run, enqueues with priority
2. `claimNextWorkItem` — Worker claims the run, acquires 5-min lease
3. `heartbeatLease` — Worker renews lease during long retrievals
4. `completeWorkItem` / `failWorkItem` — Worker returns structured result or error
5. `reclaimExpiredLeases` — Cron reclaims crashed workers (existing)

**Bounded execution:**
- Max 3 specialists per query (router picks top 1-2 intents, never all 4)
- 90s wall clock hard timeout via AbortController
- Each specialist limited to 5 tool calls max per invocation
- Memory: no unbounded collections — results capped at 10 evidence items per specialist

### Level 3: Tool Execution & Policy

Every specialist tool call passes through the existing enforcement stack. No specialist bypasses policy.

| Gate | File | What it checks |
|------|------|----------------|
| **Passport enforcement** | `convex/domains/agents/orchestrator/passportEnforcement.ts` | Trust tier, allowed/denied tools, spend limits. Fail-closed: deny on error. |
| **Pre-execution gate** | `convex/domains/missions/preExecutionGate.ts` | 5 required gates + 6 disqualifiers. LLM-evaluated. 15s timeout, fail-open. |
| **Circuit breaker** | `convex/domains/agents/orchestrator/toolRouter.ts` | Per-tool health tracking. Open circuit = fallback response, not error. |
| **Retry + backoff** | `toolRouter.ts` — `DEFAULT_RETRY_CONFIG` | 3 attempts, 1s initial, 2x multiplier. |
| **Telemetry** | `toolRouter.ts` — automatic | Every call logged: success/failure, latency, fallback used. |

**Policy flow per tool call:**
```
passport check (fail-closed) → pre-execution gate (fail-open) → circuit breaker check → execute → retry on transient failure → record telemetry
```

---

## UX Contract

### Input
- Single text input, no mode toggles
- Voice input via existing `useVoiceIntentRouter` hook
- Supports follow-up queries within same thread (context carries)

### Output
- Streamed text with inline citation badges: `[docs]` `[code]` `[trace]`
- Each badge expandable to show source: doc section title + link, file:line, or receipt ID
- Confidence displayed as tier (high/medium/low), not numeric score
- If no confident answer: "I don't have enough context for this. Try asking about [suggested topic]."

### Right rail (AgentPresenceRail)
- Current task: 1-line summary of active query
- Specialists: count of active workers (0-3), names on hover
- Evidence: count of retrieved sources
- Confidence: tier badge

### Escalation
- "Open deeper analysis" CTA below any answer — routes to memo/research/trace surface depending on intent
- `docs` → opens relevant doc section in workspace
- `codebase` → opens file in editor surface
- `product` → opens research hub with pre-filtered signals
- `operator` → opens execution trace view

---

## Control Scopes (Hidden Capability Tiers)

Not exposed in UI. Determines what data the assistant can access.

| Scope | When active | Data access |
|-------|-------------|-------------|
| **Page-level** | Default for all queries | Current surface context, visible data, route params |
| **Browser-level** | When page context insufficient | Cross-surface data, research hub, document store, agent history |
| **OS-level** | Explicit operator mode only | External tool calls, MCP bridge, file system access |

Scope escalation is automatic and invisible. The router tries page-level first, escalates to browser-level if retrieval confidence is below threshold. OS-level requires the user to be in operator mode (existing `isOperatorMode` flag).

---

## Implementation Path

### Phase 1: Rebrand (cosmetic, no new backend)
- Rename FastAgentPanel header from "Agent" to "Ask NodeBench"
- Update placeholder text to `"Ask NodeBench about docs, architecture, or the current workspace..."`
- Simplify empty state: remove agent hierarchy, show 4 contextual suggested queries
- Update AgentPresenceRail label to "NodeBench Assistant"
- Files: `FastAgentPanel.tsx`, `AgentPresenceRail.tsx`, `FastAgentPanel.InputBar.tsx`

### Phase 2: Intent router (new classification layer)
- Add intent classification call before agent dispatch
- Wire `toolRouter.ts` to reject `action-request` intents with explanation
- Add client-side intent hints from current route (e.g., on `/research` → bias toward `product` intent)
- Files: `toolRouter.ts`, new `intentClassifier.ts` in `convex/domains/agents/orchestrator/`

### Phase 3: Specialist dispatch (new workers)
- Implement 4 specialist worker types as Convex actions
- Wire to `queueProtocol.ts` for lifecycle management
- Add 3-parallel cap and 90s timeout enforcement
- Files: `convex/domains/agents/orchestrator/specialists/` (new directory), `queueProtocol.ts`

### Phase 4: Citation badges and confidence (UI enrichment)
- Parse specialist results into inline `[docs]`/`[code]`/`[trace]` badges
- Add expandable source cards below answer
- Display confidence tier in AgentPresenceRail
- Add "Open deeper analysis" CTA with intent-aware routing
- Files: `FastAgentPanel.UIMessageBubble.tsx`, `AgentPresenceRail.tsx`, new `CitationBadge.tsx`

---

## Reference Pattern

| Reference | Location | Relationship |
|-----------|----------|-------------|
| OpenClaw Architecture | `docs/agents/OPENCLAW_ARCHITECTURE.md` | Target pattern: boolean gates, role specialization, institutional memory |
| Tool Router | `convex/domains/agents/orchestrator/toolRouter.ts` | Existing: circuit breaker, retry, telemetry — reused as-is |
| Queue Protocol | `convex/domains/agents/orchestrator/queueProtocol.ts` | Existing: enqueue, claim, heartbeat, complete, fail, reclaim — reused as-is |
| Passport Enforcement | `convex/domains/agents/orchestrator/passportEnforcement.ts` | Existing: trust tier + spend limit checks — reused as-is |
| Pre-Execution Gate | `convex/domains/missions/preExecutionGate.ts` | Existing: 5-gate + 6-disqualifier LLM evaluation — reused as-is |
| FastAgentPanel | `src/features/agents/components/FastAgentPanel/` | Existing: chat UI, threads, streaming — modified in Phase 1 + 4 |
| AgentPresenceRail | `src/layouts/AgentPresenceRail.tsx` | Existing: shell presence strip — modified in Phase 1 + 4 |
| Voice Intent Router | `src/hooks/useVoiceIntentRouter.ts` | Existing: 40+ aliases — extended with docs-assistant intents |
