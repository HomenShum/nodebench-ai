# DeepTrace Causal Intelligence Roadmap

Status: canonical architecture roadmap  
Date: 2026-03-18

## Purpose

DeepTrace is the product wrapper for four subsystems that already exist in partial form across NodeBench:

1. Mission harness orchestration
2. Execution trace and approval replay
3. Due-diligence and entity intelligence
4. Temporal signals and causal chains

This roadmap consolidates those pieces into one operator-facing system for Bloomberg-shaped public-source intelligence:

- supplier and customer mapping
- ownership, holder, people, and investor mapping
- causal event-to-company impact analysis
- world-scale monitoring and watchlists benchmarked against `worldmonitor.app` and `koala73/worldmonitor`

Transcript work is explicitly deferred in this revision because no single source video was selected.

Related implementation artifacts:

- [DEEPTRACE_DIMENSION_ENGINE_IMPLEMENTATION_SPEC.md](d:/VSCode Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/docs/architecture/DEEPTRACE_DIMENSION_ENGINE_IMPLEMENTATION_SPEC.md)
- [DEEPTRACE_CLAUDE_CODE_BASELINE_AND_UPLIFT.md](d:/VSCode Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/docs/architecture/benchmarks/DEEPTRACE_CLAUDE_CODE_BASELINE_AND_UPLIFT.md)
- [scripts/eval-harness/deeptrace/README.md](d:/VSCode Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/scripts/eval-harness/deeptrace/README.md)

## OpenClaw Architecture Mapping

The OpenClaw blueprint now maps to the current DeepTrace and agent-system implementation as follows:

| Blueprint layer / principle | Existing NodeBench surface | Status | DeepTrace-specific note |
|---|---|---|---|
| Layer 1: autonomous infrastructure / control plane | `convex/crons.ts`, `convex/domains/operations/autonomousControlTower.ts` | Implemented analogue | DeepTrace sits inside the same cloud-native cron and operator-control substrate already used for health, maintenance, benchmarking, and autonomous loops. |
| Layer 2: routing, budget, and telemetry | `convex/domains/ai/models/modelRouter.ts`, `convex/schema.ts` (`modelRouterCalls`) | Implemented | This is the source of truth for model choice, token use, cost, latency, requested tier, actual tier, and fallback count. |
| Layer 3: persistent runtime / agent OS | `convex/schema.ts` (`agentIdentities`, `agentChannels`, `agentHeartbeats`) | Partial analogue | The schema supports first-class agent runtime identity, but the DeepTrace slice still primarily executes through mission workflows and swarm/session traces. |
| Layer 4: boolean rubric judgment | `convex/domains/evaluation/llmJudge.ts`, `convex/schema.ts` (`judgeMetrics`) | Implemented | The OpenClaw-style boolean rubric pattern is already real in NodeBench, including critical-pass thresholds and recorded metrics. |
| Layer 5: swarm, checkpoints, and trace replay | `convex/domains/agents/swarmOrchestratorEnhanced.ts`, `convex/schema.ts` (`traces`, `checkpoints`) | Implemented analogue | Parallel fan-out, resume-from-checkpoint, and cost/latency trace capture already exist and are reusable for DeepTrace missions. |
| Layer 6: deep simulation / mission harness | `convex/workflows/deepTrace.ts` | Implemented analogue | Entity intelligence, world-monitor, and watchlist workflows already represent the structured-research backbone for DeepTrace. |
| Layer 7: durable graph, world-event, and evidence store | `convex/domains/deepTrace/schema.ts`, temporal tables imported through `convex/schema.ts` | Implemented | Relationship, event, watchlist, dimension, signal, and causal-chain state already persists in Convex. |
| Layer 8: self-evolution / dogfooding loop | `convex/domains/operations/selfMaintenance.ts`, `convex/domains/ai/models/livePerformanceEval.ts`, `convex/domains/evaluation/cronHandlers.ts`, `scripts/eval-harness/deeptrace/paired-benchmark-runner.ts` | Implemented analogue | The system already has nightly invariant checks, daily live free-model evaluation, leaderboard/calibration refreshes, and deterministic DeepTrace paired-benchmark dogfooding. |
| Layer 9: command center / operator visibility | `src/features/agents/components/AutonomousOperationsPanel.tsx`, `src/features/agents/components/OracleControlTowerPanel.tsx`, `src/features/observability/views/ObservabilityView.tsx` | Partial analogue | NodeBench has real operator dashboards, but not yet a single DeepTrace-native or Slack-native command-center thread. |
| Layer 10: Slack/operator integration | `convex/domains/integrations/slack/slackAgent.ts` | Partial analogue + gap | Slack transport exists, including a thread-capable send primitive, but the OpenClaw-specific wake-word gate, consolidated command-center thread coordinator, and router-telemetry footer remain open items. |

### Current gap boundary

What is already real:

- task-based routing and persisted per-call telemetry
- boolean-rubric judging
- swarm orchestration with traces and checkpoints
- DeepTrace mission workflows
- durable relationship, world-event, watchlist, dimension, signal, and causal storage
- nightly self-maintenance and daily live model evaluation loops
- in-product operator views for autonomous operations and control-tower drift/cost monitoring

What remains a gap or only a partial analogue:

- **command-word gating** in `convex/domains/integrations/slack/slackAgent.ts`
- **single-thread Daily Command Center** consolidation for autonomous output on top of the existing `threadTs` Slack transport primitive
- **router-backed observer/footer telemetry** in Slack or DeepTrace operator messages
- **live operator-traffic dogfooding** that complements the existing repo-local paired benchmark harness

## Product Framing

DeepTrace should continue using the existing application shell:

- `/` is the control plane
- `/research` remains the intelligence workspace
- `/entity/:name` is the default company and person drilldown
- `/execution-trace` remains the replay surface

The implementation rule is to extend the current NodeBench harness and UI surfaces, not build a second agent platform or a parallel dashboard tree.

## Storage Model

Mission harness remains the orchestration plane.

- The mainline NodeBench runtime is Convex-first: crons, traces, checkpoints, router telemetry, world-monitor state, and DeepTrace tables all live there today.
- Local SQLite exists today only in auxiliary repo-local surfaces such as `packages/openclaw-mcp-nodebench` skills and proof-harness helpers; it is not the primary DeepTrace system of record.

Existing Convex primitives to reuse first:

- `relationshipObservations`
- `relationshipEdges`
- `worldEvents`
- `watchlists`
- `dimensionProfiles`
- `dimensionSnapshots`
- `dimensionEvidence`
- `dimensionInteractions`
- `timeSeriesSignals`
- `causalChains`
- `evidencePacks`
- `traces`
- `checkpoints`

## Durable DeepTrace Tables

The existing implementation already includes the following durable Convex tables in `convex/domains/deepTrace/schema.ts`, with temporal companions imported through `convex/schema.ts`:

1. `relationshipObservations`
   - Time-stamped factual claims such as supplier, customer, holder, board seat, executive role, investor link, competitor mention, or subsidiary relation.
   - Stores source refs, evidence links, confidence, freshness, and claim text.

2. `relationshipEdges`
   - Canonical materialized graph edges built from observations.
   - Stores status, confidence, freshness, summary, latest observation, and observation counts.

3. `worldEvents`
   - Geotagged open-source events with time, severity, topic, provenance, linked entities, and optional linked causal chain.

4. `watchlists`
   - Saved company, sector, geography, or theme monitors with cadence, thresholds, and last mission refresh metadata.

5. `dimensionProfiles`
   - Latest normalized multi-dimension state for an entity, including regime label, policy context, confidence, and source refs.

6. `dimensionSnapshots`
   - Historical state captures keyed by entity and date so regime transitions can be replayed instead of inferred later.

7. `dimensionEvidence`
   - One row per dimension claim, with rationale, normalized score, evidence links, and optional causal-chain linkage.

8. `dimensionInteractions`
   - Captures cross-dimension effects so the system can explain why two signals combine into a larger regime or risk shift.

Related temporal durability already exists via:

- `timeSeriesSignals`
- `causalChains`

This means the durable DeepTrace substrate is already broader than the original four-table target.

## DeepTrace Surfaces

The implementation target is explicit so no future agent has to invent API names:

### Relationship graph

File: [relationshipGraph.ts](d:/VSCode Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/convex/domains/knowledge/relationshipGraph.ts)

- `domains/knowledge/relationshipGraph:ingestObservation`
- `domains/knowledge/relationshipGraph:materializeEdge`
- `domains/knowledge/relationshipGraph:getEntityGraph`
- `domains/knowledge/relationshipGraph:getRelationshipTimeline`
- `domains/knowledge/relationshipGraph:getOwnershipSnapshot`
- `domains/knowledge/relationshipGraph:getSupplyChainView`

### World monitor

File: [worldMonitor.ts](d:/VSCode Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/convex/domains/monitoring/worldMonitor.ts)

- `domains/monitoring/worldMonitor:ingestEvent`
- `domains/monitoring/worldMonitor:getMapSnapshot`
- `domains/monitoring/worldMonitor:getEventCluster`
- `domains/monitoring/worldMonitor:getWatchlistDigest`

### Workflow contracts

File: [deepTrace.ts](d:/VSCode Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/convex/workflows/deepTrace.ts)

- `workflows/deepTrace:runEntityIntelligenceMission`
- `workflows/deepTrace:runWorldMonitorMission`
- `workflows/deepTrace:refreshWatchlist`

## Default Mission Workflow

All non-trivial company or world investigations should follow one default flow:

`plan_decompose_mission`  
`parallel DD / entity / world subtasks`  
`record_execution_step` and `record_execution_decision`  
`judge_verify_subtask`  
`build_causal_chain` when cross-source impact exists  
`merge_compose_output`  
`sniff_record_human_review` for tier-2 claims

This keeps the mission harness focused on coordination while Convex stores the durable graph and event intelligence created during execution.

## UI Integration

DeepTrace extends the current product surfaces instead of creating a second UI stack.

### Entity drilldown

File: [EntityProfilePage.tsx](d:/VSCode Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/src/features/research/views/EntityProfilePage.tsx)

Entity drilldown now includes tabs for:

- `Overview`
- `Relationships`
- `Ownership`
- `People`
- `Competitors`
- `Supply Chain`
- `Trace`

These tabs combine stored graph data, derived fallbacks from entity context, and temporal signals and chains.

### World monitoring

Files:

- [WorldMonitorView.tsx](d:/VSCode Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/src/features/research/views/WorldMonitorView.tsx)
- [WatchlistsView.tsx](d:/VSCode Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/src/features/research/views/WatchlistsView.tsx)

Nested research views now exist for:

- `/research/world-monitor`
- `/research/watchlists`

### Execution replay

File: [ExecutionTraceView.tsx](d:/VSCode Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/src/features/strategy/views/ExecutionTraceView.tsx)

Execution Trace remains the replay surface and now accepts linked DeepTrace context through query params so entity, edge, event, and evidence context can be carried into the audit view.

## Bloomberg-Shaped Capability Lanes

DeepTrace should target public-source capability parity by shape, not proprietary data parity.

### Lane 1: supplier and customer mapping

Goal:

- map suppliers, customers, partners, distributors, and subsidiaries
- attach evidence and freshness
- show the relationship on both the focus company and competitor side where possible

### Lane 2: ownership, holder, people, and investor mapping

Goal:

- major holders
- beneficial owners where publicly inferable
- board and executive relationships
- investor backgrounds
- network overlap across founders, operators, and capital allocators

### Lane 3: causal event-to-company impact

Goal:

- ingest public world or market events
- link them to entities
- build a causal chain from event to operational, supply-chain, regulatory, or valuation impact

### Lane 4: world monitor

Goal:

- maintain world-scale event clustering by geography, topic, and severity
- drive watchlists and entity missions from the same substrate

## Benchmark Appendix

Reference benchmarks:

- Bloomberg terminal relationship and causal workflow
- `worldmonitor.app`
- `koala73/worldmonitor`

Operating assumption:

- benchmark parity means matching capability shape and operator experience
- it does not mean ingesting Bloomberg proprietary data
- `worldmonitor.app` is a benchmark and reference architecture, not a vendored dependency by default
- direct reuse of open-source code is allowed only after license and security review

## Phased Roadmap

### Phase 1: consolidation and schema plan

Deliverables:

- this canonical roadmap
- benchmark appendix
- DeepTrace schema and function surface plan
- standard mission workflow contract

### Phase 2: relationship graph substrate

Deliverables:

- observation ingestion
- edge materialization
- ownership and supply-chain views
- mission-harness wiring into entity and due-diligence workflows

### Phase 3: world monitor substrate

Deliverables:

- event ingestion
- geospatial aggregation
- watchlists
- entity-event linking
- world-event-to-company-impact causal generation

### Phase 4: UI integration

Deliverables:

- entity relationship tabs
- world monitor and watchlists research views
- trace-to-graph and graph-to-trace linking
- operator flows from the DeepTrace landing page

### Phase 5: eval and hardening

Deliverables:

- extraction evals
- causal-chain evals
- watchlist freshness checks
- conflict-resolution tests
- retry and escalation coverage
- operator dogfood flows

## Test Plan

Mission harness:

- full entity-intelligence runs
- retry budgets
- judge gating
- sniff-check escalation
- merge rules

Relationship graph:

- supplier and customer extraction from filings
- holder and beneficial-owner extraction from public ownership sources
- board and executive extraction from company pages
- investor overlap extraction from funding sources
- competitor extraction from market sources

World monitor:

- event dedupe
- geotagging
- stale-source suppression
- entity linking
- world-event-to-company-impact causal-chain generation

UI dogfood:

- open a company and inspect its graph
- trace a world event into affected companies
- follow evidence from graph edge or event into execution trace

Required eval scenarios:

- top suppliers
- top customers
- major holders
- investor background overlap
- board network overlap
- competitor-side view of the same event
- world-event-to-company-impact replay

Current harness mapping:

- `relationship_mapping` is the first repo-local stand-in for supplier / customer / holder / overlap graph evaluation
- `world_to_company` directly covers world-event-to-company-impact replay
- `trace_backed_draft` covers the evidence-to-trace and human-review-ready verdict path
- `company_direction_analysis` covers the operator-facing company brief layer that sits above raw graph extraction
- additional cases should be added over time until each required eval scenario above has an explicit paired fixture family

Current known gap:

- the repo now has a deterministic paired benchmark proof harness, but the architecture-level weekly live dogfooding eval over real Slack or operator tasks is still a future phase

## Current Implementation Note

The current implementation intentionally supports mixed-mode reads:

- stored graph and event data first
- derived fallback from existing entity context and adaptive profile second

That lets DeepTrace UI surfaces become usable immediately while durable observations, edges, and world events accumulate over time.
