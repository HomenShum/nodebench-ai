# Autonomous Continuation System — Implementation Plan

A unified NodeBench subsystem enabling agents to self-heal from both semantic errors (rollback + lessons) and infrastructure failures (capability-aware model failover + budget gates), so long-running research jobs keep making progress when the user steps away.

---

## Continuation Context

This plan picks up after the cockpit-parity work landed via:

- **PR #92** — `feat(chat): full ChatStream port with streaming, attachments, tools`
- **PR #93** — `feat(topnav): kit avatar status panel (pulse + watching + plan + sessions + theme + links)`
- **PR #105** — `fix(theme): dark mode token overrides for kit-scoped surfaces`
- **PR #115** — `fix(avatar): wire dead Upgrade to Team button`

Production cockpit is now in exact kit parity for Home, Reports, Chat, Inbox, Me, and the avatar status panel. The next failure mode that blocks dogfood sessions is **agent runs that die mid-task** — either from semantic spirals (the agent breaks a file, then keeps trying to fix it) or infrastructure failures (rate-limit 429s with no failover). This plan addresses both.

---

## Scope Decision: What Applies to NodeBench

| Subsystem from upstream spec | Applies? | Why |
|---|---|---|
| Visual refinement (gpt-image-2 → wireframes) | **No** (defer indefinitely) | NodeBench is a research/entity-graph platform, not a design tool. No wireframe artifacts, no Electron main process, no `ui_kits/` concept. |
| Report refinement (NodeBench analog) | Defer to v2 | Conceptually: "premium pass on a research report preserving all entities/claims/citations." Nice-to-have, not core to the continuation problem. |
| **Time-travel + learning (rollback + lessons)** | **Yes** (core) | Universal agent-spiral failure mode. Convex threads, action timeline, and schema already support most plumbing. |
| **Auto-routing + failover** | **Yes** (core, partially shipped) | `autonomousModelResolver.ts` already has retry/jitter for 429s. Missing: capability tiers, visible switches, budget gates, cross-provider failover. |

This plan ships only the two applicable subsystems.

---

## Existing NodeBench Plumbing to Reuse

- `convex/domains/ai/models/autonomousModelResolver.ts` — fallback chain + retry/jitter for 429/503/502/504 (partial)
- `convex/domains/ai/models/freeModelDiscovery.ts` — OpenRouter discovery (355 models)
- `convex/domains/ai/models/modelRouter.ts` — unified inference layer with `RouteRequest` + `RouteResult`
- `@convex-dev/agent` threads + messages — rollback target surface
- `convex/schema.ts` `autonomousModelUsage` — cost ledger (extend with failover metadata)
- `src/features/chat/views/ChatHome.tsx` + `ProductIntakeComposer.tsx` — command interceptor surface
- Existing diagnostic event system in `convex/domains/operations/observability/`

---

# Subsystem A: Time-Travel + Learning

## The 3 Layers

| Layer | Trigger | State Location | Cost |
|---|---|---|---|
| 1. Auto-snapshot | Before every destructive tool call (`patch_notebook`, `export_report`, `update_entity`, `merge_claims`) | New Convex table `agentSnapshots` keyed by `(threadId, turnId, artifactType, artifactId, sha256)` | $0 — sha-dedup, identical content stored once |
| 2. Chat-native rollback | User types `/rollback`, `/rollback 3`, "undo that", "revert that" in composer | Restores artifacts from snapshot; emits typed `rollback` diagnostic event into thread | $0 |
| 3. Lesson capture + injection | Toast after rollback: "What went wrong?" → stored in `agentLessons` table → top-K injected into next agent system prompt | Convex table (not `LESSONS.md` since NodeBench is web, not file-system) | ~50 tokens per relevant lesson per turn |

## Why Layer 3 Is Non-Negotiable

Without injection, rollback is just `git stash` — the next agent turn repeats the same mistake. The injected block looks like:

```
## Lessons learned in this thread (auto-applied)
- turn 47: Tried patch_notebook with fuzzy section match, overwrote wrong section.
  Next time: call get_notebook_structure first, match by explicit section ID.
- turn 52: search_public_sources returned 429 → retried same model 4x → gave up.
  Next time: on first 429, escalate to chain-resolver instead of same-model retry.
```

Injected verbatim into `RouteRequest.systemPrompt` before user instruction. Scoped per-thread (not global) for v1.

## Spiral Circuit-Breaker

After 3 consecutive turns touching the same artifact with no measurable progress (artifact size oscillating, same tool signature repeating with different args, same failure class repeating), orchestrator auto-pauses:

> "I've tried 3 times to merge entities into Orbital Labs and the graph structure failed each time. Rollback to turn 42 and try a different approach, or take over manually?"

Tunable threshold per-thread.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Lesson pollution balloons system prompt | Cap at top-10 per turn; age-out unused after 30 turns; pinned lessons never expire |
| Rollback during streaming corrupts in-flight write | Abort generation first via `AbortController`, then snapshot-restore (same pattern as existing test-endpoint) |
| User reverts past retention window | Honest `{ok: false, error: 'snapshot_expired', oldestAvailable: turnN}` — never fake-success |
| Captured lesson is actually wrong | All lessons editable + deletable via Me surface or `/lessons` command; bad lessons get pruned by humans |
| Lessons don't transfer between threads | Intentional v1 — per-thread isolation. Cross-thread "global guardrails" deferred to v2 |
| Spiral detector too sensitive | Tunable threshold (default 3 turns); can be disabled per-thread via agent config |
| Snapshot table grows unbounded | Hard cap 100 snapshots per thread (BOUND rule); oldest evicted first; sha-dedup keeps storage minimal |

## Deliverables — PR-A (Foundation, ship first)

1. **Schema extension** — `convex/schema.ts`
   - `agentSnapshots` table: `threadId`, `turnId`, `toolName`, `artifactType`, `artifactId`, `contentSha256`, `content` (stringified JSON), `parentTurnId`, `createdAt`
   - Index `by_thread_turn`: `["threadId", "turnId"]`
   - Index `by_thread_artifact`: `["threadId", "artifactType", "artifactId"]`

2. **Snapshot pre-hook** — `convex/domains/agents/snapshots/snapshotCheckpoint.ts`
   - Internal mutation called before every destructive tool call
   - Not agent-callable (automatic)
   - sha-dedup: if content hash exists for `(threadId, artifactId)`, reuse row

3. **Rollback action** — `convex/domains/agents/snapshots/rollbackToCheckpoint.ts`
   - Agent-callable action, takes `turnId` OR `stepsBack: N`
   - Restores artifacts via domain-specific restore functions (entity, notebook, report, claim)
   - Emits `rollback` diagnostic event into thread messages

4. **Chat composer keyword interceptor** — `src/features/product/components/ProductIntakeComposer.tsx`
   - Match `/rollback`, `/rollback N`, fuzzy "undo that", "revert that", "rollback that"
   - Short-circuits before LLM call
   - Calls `rollbackToCheckpoint` action
   - Mirrors existing slash-command patterns

5. **Rollback message renderer** — `src/features/chat/components/RollbackMessageCard.tsx`
   - New `ChatMessage.kind = 'rollback'`
   - Renders grey card: "Reverted N edits to {artifactName}. Lesson captured: {lesson}"
   - Visible audit trail, not silent

## Deliverables — PR-B (Learning, ship second)

6. **Lessons table** — `convex/schema.ts`
   - `agentLessons` table: `threadId`, `turnId`, `toolName`, `mistakePattern`, `correctPattern`, `capturedAt`, `expiresAfterTurns`, `pinned`, `deprecated`
   - Index `by_thread`: `["threadId"]`
   - Index `by_thread_tool`: `["threadId", "toolName"]`

7. **Capture action** — `convex/domains/agents/lessons/captureLesson.ts`
   - Mutation called from post-rollback toast
   - Schema-validated write to `agentLessons`

8. **Lesson prompt hook** — `src/features/chat/hooks/useLessonCapturePrompt.ts`
   - Toast component with input field
   - "What should the agent do differently next time? (one sentence, optional)"
   - Esc-skippable

9. **System prompt builder** — `convex/domains/agents/core/systemPromptBuilder.ts`
   - New module read by coordinator + subagents
   - Fetches `agentLessons` for thread, filters relevant by upcoming tool name (string-match)
   - Injects top-5 verbatim into `systemPrompt` field of `RouteRequest`
   - Falls back to most-recent 3 as general guardrails if no tool-match

10. **Lessons management surface** — `src/features/agents/components/LessonsPanel.tsx`
    - Rendered in Me surface
    - Edit / delete / pin per lesson
    - Bulk cleanup for deprecated lessons

11. **Spiral detector** — `convex/domains/agents/orchestration/spiralDetector.ts`
    - Internal query: given threadId, returns `{detected: boolean, reason: string, suggestedAction: 'rollback' | 'switch_model' | 'escalate'}`
    - Called after every agent turn completes
    - Signals: artifact size oscillating, tool signature repeating, same error class 3x

12. **Scenario tests** — `convex/domains/agents/__tests__/`
    - Rollback during streaming aborts cleanly
    - Rollback past retention returns honest `snapshot_expired`
    - Duplicate-lesson dedup
    - Lesson contradicting current intent → deprecated status
    - 1000-turn session keeps context bounded
    - Spiral detector accuracy on labeled set

---

# Subsystem B: Auto-Routing + Capability-Aware Failover

## Why Two Layers

| Layer | Handles | When |
|---|---|---|
| OpenRouter native routing | Transient/rate-limit within OpenRouter | Cheap, server-side, always on |
| Client-side cross-provider failover | "OpenRouter down" or all free models saturated | When native fails or non-OpenRouter provider hits 429/5xx |

Current NodeBench state: `autonomousModelResolver.executeWithFallback` has retry/jitter but swaps to next chain entry without capability awareness — can silently go from a 200B reasoning model to a 7B chat model.

## Capability Registry

```typescript
// convex/domains/ai/models/capabilityRegistry.ts
interface ModelCapability {
  vision: boolean;
  tools: boolean;
  longContext: boolean;  // >= 128k
  toolCallFormat: 'openai' | 'anthropic';
  tier: 'frontier' | 'strong' | 'fast' | 'tiny';
  estimatedTps: number;     // tokens/sec baseline
  pricePerMInput: number;   // $/1M input tokens
  pricePerMOutput: number;  // $/1M output tokens
}

const CAPABILITY_REGISTRY: Record<string, ModelCapability> = {
  'anthropic/claude-sonnet-4.5':       { tier: 'frontier', tools: true,  vision: true,  ... },
  'kimi/kimi-k2.6':                    { tier: 'strong',   tools: true,  vision: false, ... },
  'qwen/qwen3-235b:free':              { tier: 'strong',   tools: true,  vision: false, ... },
  'deepseek/deepseek-v4-flash:free':   { tier: 'fast',     tools: true,  vision: false, ... },
  // populated from freeModelDiscovery.ts + approvedModels.ts
};
```

## Chain Resolver Contract

```typescript
// convex/domains/ai/models/chainResolver.ts
interface ResolveInput {
  currentModel: string;
  failureReason: 429 | 503 | 502 | 504 | 'timeout' | 'upstream_error';
  requiredCaps: Partial<ModelCapability>;
  budgetRemainingUsd: number;
  previouslyAttempted: string[];  // same-turn exclusion
}

interface ResolveOutput {
  nextModel: string | null;
  reason: string;             // "429 on X, tier 'strong' preserved, swapped to Y"
  tierChange: 'same' | 'up' | 'down' | 'none';
  estimatedCostUsd: number;
}
```

**Critical rules:**

1. `tierChange: 'down'` → **never happens**. Resolver filters candidates by `tier >= currentTier`. Falls sideways or up only.
2. Capability mismatch → explicit failure: `{ok: false, error: 'no_capable_fallback', tried: [...]}`. Never silently strip a required capability like vision.
3. Same tool-call format family only (`openai` can't swap to `anthropic` without adapter).

## Budget Gates

```typescript
interface BudgetCaps {
  perTurnUsd: number;     // default 0.50
  perSessionUsd: number;  // default 5.00
  perThreadUsd: number;   // default 20.00
}
```

When exceeded → pause job + toast "Budget cap hit — resume?" Never silent runaway.

## Visible Switch Notifications

New `ChatMessage.kind = 'model_switched'`:

> **Model switched**
> deepseek-v4-flash → kimi-k2.6 (reason: 429 rate-limit, tier 'strong' preserved)
> Continuing your task.

Grey card, non-blocking. User sees the degradation path, not a silent "it finished."

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Silent capability downgrade | Tier-floor enforcement in resolver + visible `model_switched` card |
| Runaway cost | Hard budget caps (turn/session/thread); pause-on-exceed not silent-on-exceed |
| Tool-call format drift across providers | Capability tag includes `toolCallFormat`; only swap within same format family |
| Stale fallback chain references dead models | Validate against `freeModelDiscovery` output on app start; prune missing ones with notification |
| OpenRouter native fallback hides which model actually answered | Surface `x-router-model` response header in chat audit trail |
| Failover loop (B fails → A fails → B fails…) | Per-turn retry budget = 3; after that, surface honest failure with full chain attempt log |
| Cascading degradation (silent chain through tiny models) | Never auto-accept a tier-downgrade; explicit user confirmation required |

## Deliverables (8 PRs)

| # | PR | NodeBench file path | Effort | Priority |
|---|---|---|---|---|
| 1 | OpenRouter native routing headers | `convex/domains/ai/models/autonomousModelResolver.ts` — set `provider.allow_fallbacks: true` + `provider.order: [...]` in OpenRouter request body | 30 min | **Ship first** — fixes 429 spiral immediately |
| 2 | Capability registry | `convex/domains/ai/models/capabilityRegistry.ts` (new) — JSON map populated from `approvedModels.ts` + `freeModelDiscovery.ts` | 1h | Enables 3+ |
| 3 | Chain resolver | `convex/domains/ai/models/chainResolver.ts` (new) — `resolveNextModel()` enforcing tier floor + capability match + budget | 1.5h | Core logic |
| 4 | Failover wiring in model router | `convex/domains/ai/models/modelRouter.ts` — catch 429/5xx/timeout, invoke resolver, swap model, retry once, emit `model_switched` event | 2h | The actual failover |
| 5 | `model_switched` chat message | `src/features/chat/components/ModelSwitchedCard.tsx` (new) + new `ChatMessage.kind` in thread renderer | 1h | Trust signal |
| 6 | Budget gates | `convex/domains/ai/models/budgetGates.ts` (new) + `userBudgets` table in `schema.ts` + pause-on-exceed mutation | 1.5h | Safety valve |
| 7 | Settings → Resilience tab | `src/features/settings/views/ResilienceSettings.tsx` (new) — per-thread fallback chain override, budget sliders, tier floor toggle | 2h | User control |
| 8 | LESSONS integration | `convex/domains/agents/lessons/captureLesson.ts` — append `{type: 'infrastructure', fromModel, failedWith, toModel, succeeded, count}` per failover. Resolver reads this on next turn to upgrade successful pair's priority for this thread | 1h | Self-learning infra |

**PR #1 alone would have prevented the screenshot's 429 spiral** — that's the 30-min cheapest meaningful ship.

---

# Cross-Subsystem Integration Matrix

| Failure Mode | Recovery | Learning Destination |
|---|---|---|
| Agent semantic spiral (notebook/entity/claim corruption) | `/rollback` to last good turn | `agentLessons` row `{type: 'semantic', toolName, mistakePattern, correctPattern}` → injected next turn |
| Model infrastructure failure (429/5xx/timeout) | Auto-failover to next capable model via chain resolver | `agentLessons` row `{type: 'infrastructure', fromModel, failedWith, toModel, succeeded, count}` → resolver priority upgrade |
| Both at once (semantic error + rate-limit) | Rollback first, then retry with different model | Both lesson rows captured |
| Budget cap hit mid-task | Pause + user prompt to raise cap or continue with free tier | `agentLessons` row `{type: 'budget', taskCategory, estimatedTokensRemaining}` |
| Spiral detector trips after 3 same-signature turns | Auto-pause + user prompt: rollback / switch model / manual takeover | `agentLessons` row `{type: 'spiral', artifactType, toolSignature, consecutiveFailures}` |

---

# Unified `agentLessons` Schema

```typescript
// convex/schema.ts
agentLessons: defineTable({
  threadId: v.string(),
  turnId: v.number(),
  type: v.union(
    v.literal("semantic"),
    v.literal("infrastructure"),
    v.literal("budget"),
    v.literal("spiral"),
  ),
  // Semantic lessons
  toolName: v.optional(v.string()),
  mistakePattern: v.optional(v.string()),
  correctPattern: v.optional(v.string()),
  artifactType: v.optional(v.string()),
  // Infrastructure lessons
  fromModel: v.optional(v.string()),
  toModel: v.optional(v.string()),
  failedWith: v.optional(v.union(v.number(), v.string())),
  succeeded: v.optional(v.boolean()),
  count: v.optional(v.number()),
  // Budget lessons
  taskCategory: v.optional(v.string()),
  estimatedTokensRemaining: v.optional(v.number()),
  // Lifecycle
  capturedAt: v.number(),
  expiresAfterTurns: v.optional(v.number()),
  pinned: v.boolean(),
  deprecated: v.boolean(),
  userNote: v.optional(v.string()),  // user-supplied sentence from toast
})
.index("by_thread", ["threadId"])
.index("by_thread_type", ["threadId", "type"])
.index("by_thread_tool", ["threadId", "toolName"])
```

---

# Phased Rollout

**Phase 1 (Week 1): Prevent today's failures**

- B-PR1 OpenRouter native routing (30 min)
- A-PR-A PRs 1–5 (snapshots + rollback + chat command + rollback card)

**Phase 2 (Week 2): Capability-aware failover**

- B-PRs 2–5 (capability registry + chain resolver + model router wiring + visible switches)
- A-PR-B PRs 6–9 (lessons table + capture + system prompt injection + management UI)

**Phase 3 (Week 3): Safety + learning loop**

- B-PRs 6–7 (budget gates + settings tab)
- A-PR-B PRs 10–11 (spiral detector + scenario tests)
- B-PR8 (LESSONS infrastructure integration)

**Phase 4 (optional, deferred):**

- Report refinement analog — "premium pass on a research report" preserving all entities/claims/citations, using a higher-tier model for final polish. Deferred until core continuation system proves out.

---

# Success Metrics

| Metric | Target | Measurement |
|---|---|---|
| Rollback latency | <2s command → restored state | Timer in `rollbackToCheckpoint` handler |
| Spiral detection accuracy | >90% true positives, <5% false positives | Labeled eval set of 50 spiral/non-spiral sessions |
| Model failover success rate | >95% recovery from 429/5xx | Synthetic failure injection tests |
| Silent capability downgrades | 0% | All switches visible in chat audit; assertion in resolver |
| Lesson relevance | Top-3 lessons relevant to current intent >80% | Manual review of 20 sessions |
| Budget cap violations | 0 silent overages | Pause-on-exceed assertion in every agent turn |
| Autonomous continuation rate | >80% of long jobs complete when user away | Synthetic multi-turn research jobs with user idle |

---

# Files to Create / Modify Summary

## New Files (13)

**Schema + persistence:**

- `convex/domains/agents/snapshots/snapshotCheckpoint.ts`
- `convex/domains/agents/snapshots/rollbackToCheckpoint.ts`
- `convex/domains/agents/lessons/captureLesson.ts`
- `convex/domains/agents/lessons/getRelevantLessons.ts`
- `convex/domains/agents/core/systemPromptBuilder.ts`
- `convex/domains/agents/orchestration/spiralDetector.ts`

**Auto-routing:**

- `convex/domains/ai/models/capabilityRegistry.ts`
- `convex/domains/ai/models/chainResolver.ts`
- `convex/domains/ai/models/budgetGates.ts`

**Frontend:**

- `src/features/chat/components/RollbackMessageCard.tsx`
- `src/features/chat/components/ModelSwitchedCard.tsx`
- `src/features/chat/hooks/useLessonCapturePrompt.ts`
- `src/features/agents/components/LessonsPanel.tsx`
- `src/features/settings/views/ResilienceSettings.tsx`

## Modified Files (6)

- `convex/schema.ts` — add `agentSnapshots`, `agentLessons`, `userBudgets` tables
- `convex/domains/ai/models/autonomousModelResolver.ts` — add OpenRouter native routing headers
- `convex/domains/ai/models/modelRouter.ts` — wire chain resolver into catch blocks
- `src/features/product/components/ProductIntakeComposer.tsx` — keyword interceptor for `/rollback`
- `src/features/chat/views/ChatHome.tsx` — render new message kinds
- `convex/domains/agents/core/coordinatorAgent.ts` — consume `systemPromptBuilder` output

---

# Executor Model Instructions

**Ship order (non-negotiable):**

1. **B-PR1 first** (30 min) — OpenRouter native routing. Prevents current 429 failure mode. Single-file change to `autonomousModelResolver.ts`.
2. **A-PR-A** (foundation) — snapshots + rollback + chat command. Users can `/rollback` immediately. This alone saves the 14-minute spiral scenario.
3. **B-PRs 2–5** — capability-aware failover. Prevents silent downgrades.
4. **A-PR-B** — lessons + injection. Turns rollback into learning.
5. **B-PRs 6–8 + A spiral detector** — safety valves + self-learning infra.

**Per-PR checklist:**

- [ ] Unit tests for pure logic (resolver, detector, prompt builder)
- [ ] Integration test with Convex test harness
- [ ] Scenario test for the failure mode the PR prevents
- [ ] Cost estimate in PR description (tokens + $/turn delta)
- [ ] Explicit "next PR" in handoff notes
- [ ] No silent degradation: every agent-visible behavior change emits a diagnostic event

**Never do:**

- Silent tier downgrade in resolver
- Auto-apply rollback without user command
- Inject >10 lessons into a single system prompt (token pollution)
- Fake-success on snapshot expiry (use `HONEST_STATUS` rule)
- Cross-thread lesson leakage in v1

---

## Continuation Note for Future Agents

This plan is the next step after the kit-parity stack landed (PRs #92, #93, #105, #115). It is the **only** outstanding plan touching `convex/domains/ai/models/*` and `convex/domains/agents/snapshots/*` — if a future plan proposes parallel snapshot or failover infrastructure, reconcile against this document first.

When `B-PR1` ships, link it back into this document and mark Phase 1 partially complete. When all of Phase 1 ships, this document moves from `docs/agents/` to `docs/agents/archive/` with a status banner.
