# NodeBench Context-Graph Flywheel — Implementation Plan

## Thesis
NodeBench = the economically sane, productizable version of MiroFish's ambition.
- Compress reality into the right context graph
- Identify decisive variables
- Generate a small number of strategically meaningful futures
- Compile those futures into decision-ready artifacts or simulation environments
- Self-judge, self-diagnose, self-fix in a closed loop

**Tagline**: Right context, right order, better odds of right judgment. Never certainty.

---

## Current State (what exists)

| Layer | Status | Key Files |
|-------|--------|-----------|
| Search trace emission | LIVE — server emits `trace[]` with classify/context/tool_call/judge steps | `server/routes/search.ts` |
| Trace audit panel | LIVE — wired to Convex `traceAuditEntries` | `src/features/agents/components/FastAgentPanel/TraceAuditPanel.tsx` |
| Eval harness (search) | 53 queries, 10 categories, 7 Gemini criteria, 13 structural checks | `packages/mcp-local/src/benchmarks/searchQualityEval.ts` |
| Eval harness (MCP tools) | 500+ queries, 11 personas × 8 scenarios, hybrid code+LLM judge, majority vote | `packages/mcp-local/src/benchmarks/llmJudgeEval.ts` |
| Telemetry dashboard | DEMO DATA — ToolCoverageProof, ContextualGraph, EvalScorecard, AgentTelemetryDashboard | `src/features/telemetry/`, `src/features/monitoring/` |
| Trajectory types | DEFINED — 8-dimension scoring (spanQuality, evidenceCompleteness, etc.) | `src/features/trajectory/types.ts` |
| Convex tables | 342 tables total; trajectory*, traceAuditEntries, evalRuns, toolHealth exist | `convex/schema.ts` |
| Judge models | gemini-3.1-flash-lite-preview (lite), gemini-3.1-flash-preview (full/hard) | Both eval files |
| SQLite eval storage | `eval_runs` + `llm_eval_runs` + `llm_eval_results` tables | `packages/mcp-local/src/db.ts` |

---

## Phase 1: Wire Live Telemetry (kill demo data)

**Goal**: Every telemetry surface shows REAL data from actual runs.

### 1A. Convex eval persistence
- Create Convex action `recordEvalRun` that accepts eval results from the harness
- After each eval run, POST results to Convex (not just SQLite)
- EvalScorecard component queries Convex `evalRuns` instead of `createDemoEvalData()`
- Show: pass rate trend (last 10 runs), per-category breakdown, regression flags

**Files to modify:**
- `convex/domains/agents/` — new `evalPersistence.ts` (mutations + queries)
- `src/features/telemetry/EvalScorecard.tsx` — replace demo factory with `useQuery(api.domains.agents.evalPersistence.getRecentEvals)`
- `packages/mcp-local/src/benchmarks/searchQualityEval.ts` — add Convex POST after SQLite write
- `packages/mcp-local/src/benchmarks/llmJudgeEval.ts` — same

### 1B. Live tool breakdown from search trace
- Aggregate `trace[]` steps across recent searches into tool breakdown metrics
- Store in Convex: per-tool call count, avg latency, error rate, cost estimate
- AgentTelemetryDashboard queries real aggregates instead of `generateToolBreakdowns()`

**Files to modify:**
- `server/routes/search.ts` — after response, POST trace summary to Convex
- `convex/domains/agents/` — new `traceAggregation.ts`
- `src/features/monitoring/views/AgentTelemetryDashboard.tsx` — replace demo with live queries

### 1C. ContextInspector live wiring
- `buildContextBundle()` in search.ts already computes pinned/injected/archival
- Return `context` object in search response (already partially there)
- ContextInspector reads from search response context, not demo factory

**Files to modify:**
- `src/features/telemetry/ContextInspector.tsx` — consume real context from search response

### 1D. TrajectoryPanel live data
- Wire TrajectoryPanel to Convex `trajectorySpans` + `trajectoryCompoundingScores`
- Show real 8-dimension scores if data exists, graceful empty state if not

**Files to modify:**
- `src/features/telemetry/TrajectoryPanel.tsx` — `useQuery(api.domains.trajectory.*)`

---

## Phase 2: Dual-Surface Trace UX

**Goal**: Dev console for debugging, user provenance panel for trust.

### 2A. Dev trace console (new component)
Build `src/features/telemetry/DevTraceConsole.tsx`:
- **Trajectory rail**: horizontal step sequence with branching subagents
- **Node detail panel**: click any step → see raw input/output, tokens, latency
- **Judge overlay**: per-step judge verdict if available
- **Diff mode**: compare two runs side-by-side (failing vs passing)
- **Filter**: by step type, status, tool name, latency threshold
- Only visible in dev mode (`NODE_ENV=development` or `?dev=true`)

**Design**: Glass card DNA, JetBrains Mono for trace data, terracotta for active/selected steps

### 2B. User provenance panel (enhance SearchTrace)
Enhance `src/features/controlPlane/components/SearchTrace.tsx`:
- **Answer provenance**: each claim tied to source evidence (web URL, tool result)
- **Confidence bands**: show 0-100 score with visual indicator
- **Validation checklist**: citation coverage, unsupported claims, stale source risk
- **Reasoning receipt**: concise action receipt (sources used, tools called, checks passed)
- Always visible (not just dev mode)

### 2C. Evidence graph (new component)
Build `src/features/telemetry/EvidenceGraph.tsx`:
- Lightweight force-directed graph: claim → evidence → source
- Click claim → supporting docs/web/tool result
- Click citation → source excerpt
- Click warning badge → caveat explanation
- Uses existing ContextualGraph.tsx patterns (633 lines already implemented)

---

## Phase 3: Self-Improving Eval Flywheel

**Goal**: Closed loop — eval → diagnose → fix → re-eval → expand corpus → repeat.

### 3A. Failure clustering
- After each eval run, cluster failures by:
  - Root cause: data quality, entity resolution, multi-entity, lens shaping, latency
  - Affected criteria: which of the 7 judge criteria fail most
  - Scenario family: which categories regress
- Store clusters in Convex `evalFailureClusters` table
- Surface in EvalScorecard: "Top 3 failure clusters this week"

**Files:**
- `packages/mcp-local/src/benchmarks/failureClustering.ts` — new
- `convex/domains/agents/evalPersistence.ts` — add cluster mutations

### 3B. Automated diagnosis
- For each failure cluster, generate diagnosis:
  - Trace which search branch produced the failing result
  - Check: was entity correctly extracted? Was web_search empty? Did Gemini extraction work?
  - Output: `{ clusterId, rootCause, suggestedFixType, affectedFiles }`
- Store diagnoses alongside clusters

### 3C. Corpus expansion pipeline
- **Failure mining**: every failed run becomes a candidate scenario
- **Adversarial generation**: misspellings, ambiguous entities, overlapping names
- **Difficulty ladders**: easy → medium → adversarial per category
- **Production sampling**: anonymized real queries (with consent)
- Target: 53 → 100 → 250 → 500 search eval queries over 4 weeks
- Target: 500 → 750 → 1000 MCP tool eval queries

**Corpus tiers:**
| Tier | Size | When |
|------|------|------|
| Smoke | 25 | Every commit (< 60s) |
| PR gate | 100 | Every PR (< 3 min) |
| Nightly | 500 | Scheduled (< 15 min) |
| Weekly full | 1000+ | Scheduled (< 60 min) |

### 3D. Judge calibration
- Track judge-human agreement rate
- For disagreement cases: flag for human review
- Use response flipping for pairwise comparisons
- Multi-sample (N=3 majority vote) already implemented for hard scenarios
- Extend to ALL scenarios when judge-human agreement < 85%

### 3E. Flywheel scheduler
- Convex cron: nightly eval run → diagnose → report
- Weekly: expand corpus with mined failures + adversarial queries
- Monthly: judge calibration review
- All automated, no human intervention needed for standard loop

**Files:**
- `convex/domains/research/narrative/crons.ts` — add eval crons alongside existing weekly/daily crons

---

## Phase 4: Context Graph + Scenario Compiler (MiroFish Essence)

**Goal**: Compress MiroFish's swarm into structured passes.

### 4A. Entity context graph
Enhance `packages/mcp-local/src/tools/entityEnrichmentTools.ts`:
- **Temporal edges**: `valid_at` / `expired_at` on entity relationships (learned from MiroFish/Zep)
- **Contradiction detection**: flag when two sources disagree about an entity fact
- **Change tracking**: diff entity state across time windows
- **Adjacency mapping**: auto-discover related entities from search results

### 4B. Scenario compiler (new tool)
Add `packages/mcp-local/src/tools/scenarioCompilerTools.ts`:
- Input: entity + context graph + user goal
- Output: 3-7 future branches
  - Base case
  - Adversarial case
  - Competitor-reaction case
  - Policy-shift case
  - Execution-failure case
- Each branch: probability estimate, key assumptions, decisive variables, recommended actions
- Uses 3-5 "stakeholder archetypes" (not 100 agents) reacting to proposals

### 4C. Packet compiler (new tool)
Add `packages/mcp-local/src/tools/packetCompilerTools.ts`:
- Compile context graph + scenarios into:
  - Decision memo (markdown)
  - HTML briefing page
  - Spreadsheet (CSV/XLSX)
  - MCP tool schema (for environment generation)
  - Evaluator/grader spec
- Each output is a first-class artifact with lineage tracking

### 4D. Environment blueprint compiler
Add `packages/mcp-local/src/tools/environmentCompilerTools.ts`:
- Input: target product/workflow (URL, docs, screenshots)
- Output:
  - Product ontology (entities, roles, permissions)
  - Workflow inventory (user flows, edge cases)
  - Seed data schema (internally consistent datasets)
  - MCP tool schema (permitted actions, constraints)
  - Evaluator hooks (success/failure checks)
- This is the "simulation environment generation" market play

---

## Phase 5: Redesign Layer (Roomba Insight)

**Goal**: Don't just add more agents. Redesign the system so fewer agents are needed.

### 5A. Workflow bottleneck detector
- Instrument every tool chain to measure: redundant retrievals, repeated context reconstruction, unnecessary translations
- Surface: "These 5 workflow patterns waste 60% of agent compute"
- Recommend: precompilation, caching, structural simplification

### 5B. Precompiled context packets
- For frequent entity queries, precompile canonical packets
- Cache in SQLite/Convex with freshness TTL
- Reduce: context reconstruction from O(n) tool calls to O(1) packet retrieval
- Track: cache hit rate, staleness, packet size

### 5C. Bounded action spaces
- For each workflow type, define the valid action set
- Constrain tool selection to relevant subset (already have preset system)
- Measure: tool precision improvement from bounded vs unbounded

---

## Phase 6: Interactive Visual Layer

**Goal**: Mission-control aesthetic, not a log viewer.

### 6A. Trajectory rail animation
- Horizontal path with branch animations for subagent spawning
- Pulse current selected node
- Replay trajectory with scrubber control
- Fade inactive branches
- Show counterfactual overlay when comparing fixed run vs original

### 6B. Judge heatmap
- Red/yellow/green grid: scenarios × criteria
- Click cell → drill into specific failures
- Sparkline per criterion over time
- Regression alerts as badges

### 6C. Cost waterfall
- Which steps consumed spend
- Token breakdown: input vs output vs cached
- Model cost comparison (lite vs full)
- Budget alerts when approaching thresholds

### 6D. Evidence constellation
- Force-directed graph around selected entity
- Nodes: claims, sources, tools, policies, verdicts
- Edge labels: supports, contradicts, derived_from, checked_against
- Click any node → detail panel

---

## Build Order (prioritized)

| # | What | Phase | Effort | Impact |
|---|------|-------|--------|--------|
| 1 | Wire EvalScorecard to real Convex data | 1A | S | High — kills demo data |
| 2 | Wire AgentTelemetryDashboard to real trace aggregates | 1B | M | High — real metrics |
| 3 | Failure clustering after eval runs | 3A | M | High — enables diagnosis |
| 4 | Dev trace console | 2A | M | High — dev debugging |
| 5 | User provenance panel enhancement | 2B | S | High — user trust |
| 6 | Corpus expansion: 53 → 100 search queries | 3C | S | Medium — coverage |
| 7 | Nightly eval cron in Convex | 3E | S | Medium — automation |
| 8 | Scenario compiler tool | 4B | L | High — MiroFish essence |
| 9 | Entity temporal edges + contradiction detection | 4A | M | High — context quality |
| 10 | Packet compiler tool | 4C | M | High — artifact output |
| 11 | Evidence graph component | 2C | M | Medium — trust surface |
| 12 | Judge heatmap + cost waterfall | 6B-C | M | Medium — observability |
| 13 | Environment blueprint compiler | 4D | L | High — new market |
| 14 | Workflow bottleneck detector | 5A | M | Medium — efficiency |
| 15 | Precompiled context packets | 5B | M | Medium — latency |

**S** = 1-2 hours, **M** = 3-6 hours, **L** = 1-2 days

---

## Success Metrics

| Metric | Current | Target (30 days) | Target (90 days) |
|--------|---------|-------------------|-------------------|
| Search eval pass rate | Unknown (run needed) | 85% | 95% |
| MCP tool eval pass rate | ~100% (latest) | 100% maintained | 100% on 1000+ queries |
| Search eval corpus size | 53 | 150 | 500 |
| MCP tool eval corpus size | 500 | 750 | 1500 |
| Telemetry surfaces with live data | 1 (TraceAuditPanel) | 5 (all surfaces) | 5 + dev console |
| Judge-human agreement | Unknown | 80% | 90% |
| Time to first useful result | ~5s | 3s | 1.5s |
| Context packet cache hit rate | 0% | 30% | 60% |
| Failure clusters identified | 0 | Top 5 automated | Top 10 + auto-diagnosis |

---

## Key Principle

NodeBench does not guarantee correct decisions. It increases the probability of correct judgment by assembling the most decision-relevant context in the most useful order.

The best agent architecture is often the one that makes fewer agents necessary.
