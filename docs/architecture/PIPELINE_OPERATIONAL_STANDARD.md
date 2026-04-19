# Pipeline Operational Standard — Real-Time Chat + Report Generator

> **Purpose:** A single repeatable template for any change to the NodeBench
> real-time chat pipeline or the report generator pipeline — so every run is
> instrumented, every emit is judged, every failure surfaces as a bounded
> verdict, and every regression shows up in telemetry before it ships.
>
> **Audience:** engineers, agents, and operators who touch structuring passes,
> projection writes, or chat/report UI.

## 1. North-star invariants (mirrors `.claude/rules/agentic_reliability.md`)

| Invariant | What it means | Where enforced |
|---|---|---|
| `BOUND` | Every in-memory + DB collection has a max cap and eviction. | `MAX_PROJECTIONS_PER_ENTITY`, `MAX_RECENT_RUNS`, `MAX_VERDICTS` |
| `HONEST_STATUS` | 2xx only on real success. Failed emits land with status="error". | `diligenceProjections.upsertFromStructuringPass`, `recordTelemetry` |
| `HONEST_SCORES` | Every score is computed from measured data — no hardcoded floors. | `diligenceJudge.score = passCount / (pass + fail)` |
| `TIMEOUT` | Every external call is bracketed by a deadline. | Judge gate `latencyWithinBudget` (default 30 s) |
| `DETERMINISTIC` | Same telemetry replayed through the judge produces the same verdict. | `server/pipeline/diligenceJudge.ts` — no wall-clock, no randomness |
| `ERROR_BOUNDARY` | Telemetry + verdict persistence never breaks the write path. | `emitDiligenceProjectionInstrumented` swallows `onTelemetry` errors |

## 2. Reference architecture

```
orchestrator (real-time chat | report generator)
   │
   ▼
emitDiligenceProjectionInstrumented(mutation, args, { seedTelemetry, onTelemetry })
   │                                                    ├─► recordTelemetry  (Convex mutation)
   │                                                    └─► recordVerdict    (Convex mutation)
   ├─► upsertFromStructuringPass  (Convex mutation, HONEST_STATUS)
   ├─► judgeDiligenceRun          (pure fn, DETERMINISTIC)
   ▼
operator UI + dashboards
   • listRecentRuns      (telemetry stream, BOUND)
   • listRecentVerdicts  (verdict stream, BOUND)
   • rollupRecent        (p50/p95 latency, error rate)
   • rollupVerdicts      (verdict tier breakdown, average score)
```

Sources of truth:

| Concept | File |
|---|---|
| Pure judge (10 boolean gates) | `server/pipeline/diligenceJudge.ts` |
| Instrumented writer | `server/pipeline/diligenceProjectionWriter.ts` |
| Telemetry persistence | `convex/domains/product/diligenceRunTelemetry.ts` |
| Verdict persistence | `convex/domains/product/diligenceJudge.ts` |
| Schema | `convex/schema.ts` → `diligenceRunTelemetry`, `diligenceJudgeVerdicts` |

## 3. The 10 gate catalog

Stable ordering (dashboards depend on it):

| # | Gate | Fails when | Notes |
|---|---|---|---|
| 1 | `hasValidTier` | tier ∉ {verified, corroborated, single-source, unverified} | Pure enum check |
| 2 | `hasStableScratchpadRunId` | empty, whitespace, or <3 chars | Protects `scratchpadRunId` dedupe key |
| 3 | `hasMonotonicVersion` | version < prior version for (slug, blockType) | Replay safety — scratchpad_first.md |
| 4 | `hasHeader` | empty or > 120 chars | Bounded UI text |
| 5 | `tierMatchesBodyProse` | `verified` with <40 chars prose / `corroborated` with <20 | No fake verification |
| 6 | `latencyWithinBudget` | elapsed > `latencyBudgetMs` (default 30 s) | `TIMEOUT` budget gate |
| 7 | `reportsToolCalls` | toolCalls < 0 (missing → skipped, not failed) | Partial telemetry is allowed |
| 8 | `reportsTokenCounts` | tokensIn or tokensOut < 0 | Partial telemetry is allowed |
| 9 | `capturedSources` | verified/corroborated with 0 sources | Anti-hallucination floor |
| 10 | `emitStatusIsTerminal` | errorMessage set, or status ∉ {created, updated, stale} | `HONEST_STATUS` enforcement |

**Verdict derivation (bounded enum, matches `AGENT_RUN_VERDICT_WORKFLOW.md`):**

| Condition | Verdict |
|---|---|
| 0 failures, ≤ 2 skipped | `verified` |
| 0 failures, > 2 skipped | `provisionally_verified` |
| 1–2 failures | `needs_review` |
| 3+ failures | `failed` |

## 4. The operational loop (repeatable for any pipeline change)

### Step 1 — Contract
- Confirm `EmitProjectionArgs` + `RunTelemetry` still describe what the orchestrator emits.
- If you added a field, update the schema, the judge, the Convex args, and all three in one commit.

### Step 2 — Instrument
- Every orchestrator write path calls `emitDiligenceProjectionInstrumented(...)`.
- Always seed `toolCalls`, `tokensIn`, `tokensOut`, `sourceCount` when they are known. Missing fields are skipped (not failed) — that's by design.
- Always pass `onTelemetry` that persists to Convex via `recordTelemetry` → `recordVerdict`.

### Step 3 — Judge inline
- Call `judgeDiligenceRun({ args, result, telemetry, priorVersion })` immediately after the instrumented emit settles.
- Attach the verdict to whatever trace envelope the orchestrator returns so the operator UI can surface it above the raw trace.

### Step 4 — Persist
- `recordTelemetry(...)` → `{ id }`.
- `recordVerdict({ telemetryId: id, ...verdict, gatesJson: JSON.stringify(verdict.gates) })`.

### Step 5 — Surface
- Operator UI displays the verdict + gate breakdown above the raw trace drill-down (`AGENT_RUN_VERDICT_WORKFLOW.md`).
- `needs_review` and `failed` surface next-action hints derived from gate reasons.

### Step 6 — Measure
- Dashboards subscribe to `rollupRecent` + `rollupVerdicts`.
- Track p50/p95 latency, error rate, verified rate, and per-gate pass rate.

### Step 7 — Regress
- Targeted tests: `npx vitest run server/pipeline/diligenceJudge.test.ts server/pipeline/diligenceProjectionWriter.test.ts`.
- Full floor: `npx convex codegen && npx tsc --noEmit && npm run build`.
- If UI surfaces changed: `npm run dogfood:verify:smoke`.

## 5. Review checklist (run before every pipeline PR)

- [ ] New field in `EmitProjectionArgs`? Mirrored in schema + Convex args?
- [ ] New gate? Added to `GATE_ORDER` and documented in §3 above?
- [ ] Telemetry still captured on both success AND failure?
- [ ] Verdict surfaced in operator UI (not hidden in trace logs)?
- [ ] All 4 verdict tiers exercised in tests?
- [ ] Long-running accumulation scenario (100+ runs) tested?
- [ ] Adversarial scenarios (non-monotonic version, whitespace id, negative tokens) tested?
- [ ] `HONEST_STATUS` preserved on every failure path?
- [ ] `BOUND` cap on every new query (cap ≤ 200)?

## 6. Incident protocol

When the dashboard shows a regression (e.g., verified rate drops below historical floor):

1. Read the last 50 `diligenceRunTelemetry` rows + their verdicts.
2. Group failures by dominant failing gate — that names the root cause.
3. Use `analyst_diagnostic.md` (ask "why" 5×) before any fix.
4. Add a scenario test for the failure mode before fixing.
5. Re-run the regression gate.
6. Document the incident + fix in the commit message and link both to the failing gate.

## 7. Non-goals

- **No LLM judging in this file.** Prose quality and citation quality are
  non-deterministic; they live in a separate optional action that wraps this
  module's output. Keeping this layer deterministic is a feature, not a gap.
- **No auto-retry.** Partial failures surface as `needs_review`, not silent
  retries. The orchestrator decides what to do with a stale or errored emit.

## 8. Related

- `.claude/rules/pipeline_operational_standard.md` — terse rule mirror
- `.claude/skills/pipeline-operational-loop/SKILL.md` — invocation recipe
- `.claude/rules/agentic_reliability.md` — upstream invariants
- `.claude/rules/agent_run_verdict_workflow.md` — verdict contract
- `.claude/rules/owner_mode_end_to_end.md` — loop scope
- `.claude/rules/scenario_testing.md` — test bar
