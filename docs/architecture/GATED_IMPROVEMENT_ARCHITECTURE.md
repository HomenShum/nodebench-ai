# NodeBench — Gated Improvement Architecture

Status: repo-grounded, April 2026

---

## Plain English

Most AI products answer questions. NodeBench learns how good investigations are done.

Strong models explore. A meta layer improves the workflow. Retention and Attrition compress it. NodeBench delivers it to the user.

---

## The 6-Step Loop

```
                                 ┌──────────────────────────────┐
                                 │     6. ROUTING               │
                                 │  Cheap replay first.         │
                                 │  Hard cases escalate to      │
                                 │  frontier model.             │
                                 └──────────┬───────────────────┘
                                            │
            ┌───────────────────────────────┐│┌─────────────────────────────────┐
            │  1. LIVE RUN                  │││  5. DISTILLATION / REPLAY       │
            │  Frontier model handles the   ││◄  Approved workflow becomes a    │
            │  hard ambiguous question.     │││  cheaper executable policy.     │
            │  Linkup search + Gemini       │││  Saved as trajectory + template │
            │  extraction + evidence.       │││  for future similar queries.    │
            └──────────┬────────────────────┘│└─────────────────────────────────┘
                       │                     │              ▲
                       ▼                     │              │
            ┌───────────────────────────────┐│┌─────────────┴───────────────────┐
            │  2. STRUCTURED TRACE CAPTURE  │││  4. EVAL GATE                   │
            │  Record full path: queries,   │││  Benchmark suites + scenario    │
            │  sources, tool calls, claims, │││  replays. Compare to baseline.  │
            │  evidence, synthesis format.  │││  Approve before deploying.      │
            │  → WorkflowEnvelope           │││  No blind self-improvement.     │
            └──────────┬────────────────────┘│└─────────────────────────────────┘
                       │                     │              ▲
                       ▼                     │              │
            ┌───────────────────────────────┐│┌─────────────┘
            │  3. META REVIEW               │││
            │  Reviewer checks: was the     │┘│
            │  run good? Where did it fail? │  │
            │  What should change?          ├──┘
            │  → HyperLoop eval + gates     │
            └───────────────────────────────┘
```

---

## What Each Step Does (with repo evidence)

### 1. Live Run
A strong model handles the hard ambiguous question.

- `POST /api/pipeline/search` → `runSearchPipelineWithEnvelope()`
- 4-node typed pipeline: classify → search (Linkup) → analyze (Gemini) → package
- Returns a ResultPacket with claims, sources, signals, risks, next actions

Source: [searchPipeline.ts](../../server/pipeline/searchPipeline.ts), [pipelineRoute.ts](../../server/routes/pipelineRoute.ts)

### 2. Structured Trace Capture
NodeBench records the full investigation path — not just the answer.

- `WorkflowEnvelope` captures 6 layers: transport, content, proof chain, trace steps, lineage, scope
- `SearchTrajectory` records each pipeline step with timing, state hashes, and tool calls
- Both are stored in SQLite with bounded eviction

Source: [workflowEnvelope.ts](../../server/lib/workflowEnvelope.ts), [trajectoryStore.ts](../../server/lib/trajectoryStore.ts)

### 3. Meta Review
A separate reviewer checks whether the run was good, where it failed, and what should change.

- HyperLoop evaluation scores 6 weighted components: evidence coverage (30%), claim grounding (25%), contradiction capture (15%), human edit burden (15%), outcome readiness (10%), latency budget (5%)
- 5 gates: minimum evidence, minimum grounding, human edit load, latency window, archive candidate score
- Policy action: `candidate` (archive as reusable template) or `archive_only`

Source: [hyperloopEval.ts](../../packages/mcp-local/src/sync/hyperloopEval.ts), [hyperloopArchive.ts](../../packages/mcp-local/src/sync/hyperloopArchive.ts)

### 4. Eval Gate
Benchmark suites and scenario replays compare against baseline. No blind self-improvement.

- Archive entries have explicit status lifecycle: `candidate` → `validated` → `promoted` → `retired`
- Promotion requires: quality score delta > threshold AND no critical gate failures
- Human-gated: `runPromotionCycle()` validates but promotion decisions are bounded

Source: [hyperloopArchive.ts](../../packages/mcp-local/src/sync/hyperloopArchive.ts), [AI_FLYWHEEL.md](./AI_FLYWHEEL.md)

### 5. Distillation / Replay
The approved workflow becomes a cheaper executable policy.

- `trajectoryStore.ts` saves successful search trajectories with entity+lens indexing
- Trajectory includes: pipeline steps, tool calls, state hashes, timing, token estimates
- Rolling replay stats: avg token savings %, avg time savings %, drift score
- Retention bridge forwards approved envelopes to attrition.sh for TCWP bundling

Source: [trajectoryStore.ts](../../server/lib/trajectoryStore.ts), [retentionBridge.ts](../../server/routes/retentionBridge.ts), [mcp_nodebench_bridge.py](../../.nodebench-ref/backend/app/api/mcp_nodebench_bridge.py)

### 6. Routing
Future requests start with the cheaper replay path. Only hard cases escalate.

- `detectReplayCandidate()` checks for replayable trajectories by entity + lens
- 3 verdicts:
  - `replay`: drift < 0.3, staleness < 7 days → use cached trajectory
  - `replay_with_fallback`: drift < 0.6, staleness < 14 days → try replay, fall back on divergence
  - `full_pipeline`: high drift or stale → run full frontier model
- Savings measurement: honest A/B comparison (same query, different modes)

Source: [replayDetector.ts](../../server/lib/replayDetector.ts)

---

## Why the Gate Matters

The meta-agent does NOT directly change production behavior. The loop is:

1. **Proposal** — HyperLoop identifies a candidate improvement (better prompt, tool policy, retrieval plan)
2. **Benchmark** — Run against eval corpus and scenario replays
3. **Compare** — Quality score vs baseline, gate checks pass/fail
4. **Approve** — Only promoted entries enter the active routing table
5. **Deploy** — Cheaper replay path uses the approved workflow

This is the difference between "the system improves itself" (unstable, scary to operators) and "the system proposes improvements that are validated before deployment" (credible, auditable).

---

## Naming Hierarchy

| Name | Role | Audience |
|------|------|----------|
| **NodeBench** | The product. Entity intelligence for any company, market, or question. | External — users, investors, partners |
| **HyperLoop** | Internal evaluation and improvement system. Meta review + eval gate + archive promotion. | Internal — builders, operators |
| **Retention / Attrition** | Distillation and replay engines. Compress approved workflows into cheaper execution. | Internal — infra, cost optimization |

Externally, lead with NodeBench. The other names are internal infrastructure.

---

## The Business Model Unlock

The 6-step loop means NodeBench's cost curve improves over time instead of staying permanently attached to frontier model pricing.

- **Run 1**: Full frontier model (Gemini 3.1 Flash Lite + Linkup). Cost: ~$0.013, latency: ~15-30s.
- **Run 2+**: Replay from trajectory. Cost: ~$0.002, latency: ~2-5s.
- **Breakeven**: 2 replays (measured, not projected).

Every successful investigation makes the next similar query cheaper. That is compounding infrastructure, not just a chatbot.

---

## Founder/Investor Pitch (60 seconds)

NodeBench is an AI research system for ambiguous startup and finance questions.

It uses frontier models to discover high-quality investigation workflows, applies a HyperAgent-style meta layer to critique and improve those workflows, and then distills them into cheaper models through Retention and Attrition.

Over time, this makes the system more consistent, faster, and cheaper on repeated research patterns — while keeping frontier-model quality for genuinely new questions.

The result: enterprise-grade entity intelligence that gets better and cheaper with every query, instead of staying permanently expensive.

---

## Comparison Frames (what NodeBench is NOT claiming)

- NodeBench is **not** identical to Meta HyperAgents. It uses a similar task-agent/meta-agent split.
- NodeBench is **not** identical to Meta ARE. It uses a similar scalable evaluation philosophy.
- NodeBench is **not** identical to the software-engineering HyperAgent paper. It uses a similar planner+specialist architecture.
- NodeBench **does not** let the meta-agent rewrite production behavior without a gate.

The accurate claim: NodeBench has a working gated improvement loop with frontier exploration, structured trace capture, meta review, eval gates, distillation, and cost-aware routing.

---

## Repo Evidence

| File | Role in the 6-step loop |
|------|------------------------|
| `server/pipeline/searchPipeline.ts` | Step 1 (live run) + Step 2 (trace capture) |
| `server/lib/workflowEnvelope.ts` | Step 2 (canonical envelope) |
| `server/lib/trajectoryStore.ts` | Step 2 (trajectory storage) + Step 5 (replay) |
| `packages/mcp-local/src/sync/hyperloopEval.ts` | Step 3 (meta review) |
| `packages/mcp-local/src/sync/hyperloopArchive.ts` | Step 4 (eval gate + promotion) |
| `server/lib/replayDetector.ts` | Step 6 (routing) |
| `server/routes/retentionBridge.ts` | Step 5 (bridge to attrition) |
| `server/routes/pipelineRoute.ts` | Orchestrates steps 1-4, returns envelope metadata |
| `.nodebench-ref/backend/app/api/mcp_nodebench_bridge.py` | Step 5 (envelope → TCWP conversion) |
