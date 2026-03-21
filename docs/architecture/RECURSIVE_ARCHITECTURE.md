# Recursive Self-Similar Architecture

> Closes P2 gap from the [Time Compounding Deep Review](./TIME_COMPOUNDING_DEEP_REVIEW.md).
> Every layer of NodeBench executes the same loop: **observe -> decide -> act -> learn -> evolve**.
> This document maps the pattern across five scales and identifies the shared primitives that make
> improvements at any layer automatically benefit every other layer.

---

## 1. The Pattern

The "Letting Time Be A Compounding Factor to Success" document identifies a mirror insight: from token prediction to civilization-scale decision-making, every effective system runs the same cycle:

```
observe -> decide -> act -> learn -> evolve
```

NodeBench implements this loop at five nested scales. Each layer's "evolve" output feeds the next layer's "observe" input, creating a compounding chain where better decisions at one scale improve the data available to every other scale.

---

## 2. Five Layers

```
+---------------------------------------------------------------+
|  PRODUCT        trajectory scoring, intervention, forecast     |
|  +---------------------------------------------------------+  |
|  |  SYSTEM      autonomousCrons, selfEvolution, consistency |  |
|  |  +-----------------------------------------------------+|  |
|  |  |  ORCHESTRATOR   swarmDeliberation, 6 roles, 4 rounds ||  |
|  |  |  +-------------------------------------------------+||  |
|  |  |  |  AGENT    preExecutionGate, 5 gates, 6 disquals  |||  |
|  |  |  |  +---------------------------------------------+ |||  |
|  |  |  |  |  TOKEN   LLM prompt -> generateText -> resp  | |||  |
|  |  |  |  +---------------------------------------------+ |||  |
|  |  |  +-------------------------------------------------+ ||  |
|  |  +------------------------------------------------------+|  |
|  +-----------------------------------------------------------+  |
+-----------------------------------------------------------------+
```

Each box runs the same five-step loop, but at a different timescale:

| Layer | Cycle period | Unit of work |
|-------|-------------|--------------|
| Token | ~100ms | Single LLM call |
| Agent | ~seconds | One task dispatch decision |
| Orchestrator | ~minutes | Multi-role deliberation session |
| System | ~hours/daily | Self-evolution cycle |
| Product | ~days/weeks | Trajectory score update |

---

## 3. Mapping Table

Each cell names the concrete NodeBench module or function that implements that step at that layer.

| Layer | Observe | Decide | Act | Learn | Evolve |
|-------|---------|--------|-----|-------|--------|
| **Token** | LLM input context (prompt + system message) | `generateText()` token sampling | Response text generation | -- (stateless) | -- (stateless) |
| **Agent** | `preExecutionGate` inputs (prompt, context, missionType) | 5 boolean gates + 6 disqualifiers (proceed / skip / escalate) | Tool execution via `toolRouter` | `decisionMemory` fingerprinting (SHA-256 of entityRef + actionType + domain) | -- (agent doesn't self-modify) |
| **Orchestrator** | Swarm topic + compacted prior context (`compactContext` 3-stage pipeline) | 6-role structured deliberation across up to 4 rounds (80% convergence threshold) | `synthesizeDeliberation` (consensus points, action items, blind spots) | `deliberationToEvolution` bridge (consensus -> gate change proposals) | `evolutionVerification` (simulate impact on historical judge reviews, thrashing detection) |
| **System** | `autonomousCrons` 30-min monitor (drift detection, competitive analysis, prediction lenses) + `analyzeDecisionLogs` (post rate, false positive rate, rubric health) | `selfEvolution.proposeRubricChanges` (LLM-driven, max 2 changes/cycle, min 7-day data window) | `applyRubricEvolution` (version-tracked before/after with confidence) | `consistencyIndex` (cross-agent conflict detection, confidence divergence alerts) | `evolutionVerification` (false positive/negative rate simulation, thrashing window = 7 days) |
| **Product** | Trajectory data collection: spans, verdicts, feedback events, interventions, benchmark runs | `computeTrajectoryScores` (8-dimension weighted scoring: spanQuality, evidenceCompleteness, adaptationVelocity, trustLeverage, interventionEffect, drift, rawCompounding, trustAdjustedCompounding) | Intervention recommendations + score label assignment (compounding / improving / flat / drifting) | Forecast scorekeeping via PostmortemView timeline | Trust-adjusted compounding score update (feeds back into next window's observation) |

---

## 4. Shared Primitives

Five structural invariants recur at every layer. These are not conventions -- they are enforced by the code.

### 4.1 ActionSpan (the atomic unit)

Defined in `convex/shared/actionSpan.ts`. Every observable action at every layer projects into the same 15-field shape:

```
startTime, endTime, actorIdentity, environment, inputs,
observedStateBefore, observedStateAfter, toolCalls, evidenceRefs,
successCriteria, judgeResult, replayPath, cost, confidence,
escalationStatus
```

Both `trajectorySpans` (product layer) and `runSteps` (agent layer) have converters into this unified type. This means trajectory scoring can operate on agent-level data without translation, and agent-level replay paths connect directly to product-level audit trails.

### 4.2 Boolean gate (true/false + reason, never scores)

Every decision point in the system uses boolean gates with mandatory string reasoning, never floating-point scores:

- **Agent layer**: 5 gates (`opportunity_identified`, `unique_value`, `actionable_outcome`, `right_audience`, `information_not_lost`) + 6 disqualifiers (`already_resolved`, `social_only`, `bot_already_replied`, `sensitive_topic`, `rapid_fire`, `command_word`)
- **Orchestrator layer**: Consensus convergence is boolean (>= 80% agreement = converged)
- **System layer**: Evolution verification gates are boolean (approved/rejected with `rejectionReason`)
- **Product layer**: Checklist items are `{ passed: boolean }`, trajectory labels are categorical thresholds not continuous scores

HONEST_SCORES is enforced throughout: confidence defaults to 0 on failure, never an artificial floor like 0.5.

### 4.3 Bounded proposals (max 2-3 changes per cycle)

No layer is permitted to make unbounded changes in a single cycle:

- **Agent**: Single proceed/skip/escalate decision per task
- **Orchestrator**: Max 4 rounds before forced synthesis, early-stop on convergence
- **System**: `EVOLUTION_SAFETY_GATES.maxChangesPerCycle = 2`, `minGatesAfterChange = 3`
- **Product**: Score updates are clamped to [0, 1] via `clampScore()`, drift pressure is bounded

This prevents catastrophic rewrites and ensures each cycle's changes are small enough to be verified by the next cycle.

### 4.4 Evidence requirement (no action without provenance)

Every layer requires evidence before acting:

- **Agent**: `preExecutionGate` requires prompt text + context before evaluation. `decisionMemory` fingerprints every decision with SHA-256 for future retrieval.
- **Orchestrator**: Each role assessment includes `keyRisks`, `opportunities`, and explicit `recommendation`. Compaction preserves intent residuals (positions, disagreements, open questions) while dropping verbose tool output.
- **System**: `selfEvolution` requires `minDataWindowDays = 7` before proposing changes. `evolutionVerification` replays proposals against `MAX_JUDGE_REVIEWS_TO_SIMULATE = 100` historical reviews.
- **Product**: `evidenceRefs` on every ActionSpan. `evidenceBundleCount` and `sourceRefCount` are direct inputs to the trajectory scoring formula.

### 4.5 Fail-open design (gates don't block service)

Every gate at every layer defaults to "proceed" on error:

- **Agent**: `preExecutionGate` returns all-pass on LLM timeout (15s), JSON parse failure, or missing fields
- **Orchestrator**: Role assessment failures produce `confidence: 0` entries (honest) but don't halt the round
- **System**: `evolutionVerification` errors let the proposal through (fail-open for verification)
- **Product**: Missing data produces 0 scores (honest) but never blocks trajectory computation

The pattern is: gates are advisory, not blocking. Service availability always wins over evaluation precision.

---

## 5. The Compounding Chain

```
                    +----------+
                    |  TOKEN   |  response text
                    +----+-----+
                         |
                         v
                    +----------+
                    |  AGENT   |  decisionMemory fingerprint
                    +----+-----+
                         |
                         v
                  +--------------+
                  | ORCHESTRATOR |  deliberation synthesis
                  +------+-------+
                         |
              deliberationToEvolution bridge
                         |
                         v
                    +----------+
                    |  SYSTEM  |  rubric evolution record
                    +----+-----+
                         |
              trajectorySpan projection
                         |
                         v
                    +----------+
                    |  PRODUCT |  compounding score
                    +----+-----+
                         |
              score feeds next cycle's observation
                         |
                         +-------> back to TOKEN
```

The compounding property: when `selfEvolution` improves a rubric gate at the System layer, that gate is used by `preExecutionGate` at the Agent layer, which produces better decision data, which feeds `swarmDeliberation` at the Orchestrator layer, which produces higher-confidence synthesis, which triggers more precise evolution proposals at the System layer. The product-level trajectory score captures this improvement as increased `adaptationVelocity` and decreased `driftPressure`.

---

## 6. Why This Matters

### 6.1 Single-point improvements compound across layers

Fixing evidence quality at the Agent layer (better `evidenceRefs` on `runSteps`) automatically improves:
- Orchestrator deliberation (richer context for role assessments)
- System evolution (more accurate `falsePositiveRate` in `analyzeDecisionLogs`)
- Product trajectory (higher `evidenceCompleteness` score)

### 6.2 Shared primitives reduce implementation surface

The `ActionSpan` type means any new layer (e.g., a team coordination layer between Orchestrator and System) only needs to implement the five-step loop and project into the existing 15-field shape. All downstream scoring, auditing, and evolution machinery works without modification.

### 6.3 Fail-open + bounded proposals = safe autonomous operation

The combination of fail-open gates and bounded proposals means:
- No single LLM failure can halt the system
- No single evolution cycle can destabilize the rubric
- Thrashing detection (7-day window in `evolutionVerification`) catches oscillating changes
- The consistency index catches cross-agent conflicts that any single gate would miss

### 6.4 The recursion is the architecture

This is not a metaphor. The same code patterns (boolean gate, bounded proposal, evidence requirement, fail-open default, ActionSpan projection) are literally reused across layers. The architecture IS the recursive pattern -- there is no separate "meta-architecture" governing the layers. Each layer governs itself using the same primitives that every other layer uses.

---

## 7. File Reference

| Module | Layer | Role in the loop |
|--------|-------|-----------------|
| `convex/shared/actionSpan.ts` | All | Unified 15-field atomic unit + converters |
| `convex/domains/missions/preExecutionGate.ts` | Agent | Observe + Decide (5 gates, 6 disqualifiers) |
| `convex/domains/agents/decisionMemory.ts` | Agent | Learn (fingerprinted decision retrieval) |
| `convex/domains/agents/swarmDeliberation.ts` | Orchestrator | Observe + Decide + Act (6 roles, 4 rounds, synthesis) |
| `convex/domains/agents/deliberationToEvolution.ts` | Orchestrator -> System | Learn (bridge consensus to rubric proposals) |
| `convex/domains/agents/selfEvolution.ts` | System | Decide + Act (analyze logs, propose changes, apply) |
| `convex/domains/agents/evolutionVerification.ts` | System | Evolve (simulate impact, detect thrashing) |
| `convex/domains/agents/consistencyIndex.ts` | System | Learn (cross-agent conflict detection) |
| `convex/domains/agents/autonomousCrons.ts` | System | Observe (30-min drift detection, competitive analysis) |
| `convex/domains/trajectory/lib.ts` | Product | Decide + Act (8-dimension scoring, label assignment) |
