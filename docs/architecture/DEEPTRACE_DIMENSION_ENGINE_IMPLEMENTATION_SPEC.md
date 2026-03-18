# DeepTrace Dimension Engine Implementation Spec

Status: implementation spec  
Date: 2026-03-15

## Goal

DeepTrace should treat important business constraints and capacities as explicit control dimensions of analysis rather than background notes.

The operating rule is:

`facts + relationships + dimensions + incentives + time = causal interpretation`

This extends the current DeepTrace stack:

- relationship graph
- world monitor
- watchlists
- causal chains
- mission harness
- execution trace

The missing layer is a durable Dimension Engine that makes the system reason over explicit state, regime shifts, and interaction effects.

## What already exists in this repo

Current durable DeepTrace and related substrates:

- [schema.ts](d:/VSCode Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/convex/domains/deepTrace/schema.ts)
- [relationshipGraph.ts](d:/VSCode Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/convex/domains/knowledge/relationshipGraph.ts)
- [worldMonitor.ts](d:/VSCode Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/convex/domains/monitoring/worldMonitor.ts)
- [deepTrace.ts](d:/VSCode Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/convex/workflows/deepTrace.ts)
- [missionHarnessTools.ts](d:/VSCode Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/packages/mcp-local/src/tools/missionHarnessTools.ts)
- [executionTraceTools.ts](d:/VSCode Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/packages/mcp-local/src/tools/executionTraceTools.ts)
- [temporalIntelligenceTools.ts](d:/VSCode Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/packages/mcp-local/src/tools/temporalIntelligenceTools.ts)

This spec adds the missing dimension substrate on top of those systems instead of replacing them.

## Core model

Every company, person, product, investment case, or mission should carry a dimension state and a derived operating regime.

```ts
type DimensionAvailability = "verified" | "estimated" | "inferred" | "unavailable";

type DimensionMetric = {
  value: number | string | null;
  score?: number | null; // normalized 0-1 when meaningful
  availability: DimensionAvailability;
  rationale?: string;
  sourceRefIds: string[];
};

type DimensionState = {
  time: {
    runwayMonths: DimensionMetric;
    deadlinePressure: DimensionMetric;
    executionTempo: DimensionMetric;
    maturityStage: DimensionMetric;
  };
  capital: {
    fundingRaisedUsd: DimensionMetric;
    burnEstimateUsdPerMonth: DimensionMetric;
    capitalSlack: DimensionMetric;
    financingQualityScore: DimensionMetric;
  };
  people: {
    founderCredibilityScore: DimensionMetric;
    operatorStrengthScore: DimensionMetric;
    technicalExecutionScore: DimensionMetric;
    hiringDensityScore: DimensionMetric;
    teamContinuityScore: DimensionMetric;
  };
  market: {
    customerDemandScore: DimensionMetric;
    urgencyScore: DimensionMetric;
    competitionPressureScore: DimensionMetric;
    distributionAdvantageScore: DimensionMetric;
  };
  network: {
    investorQualityScore: DimensionMetric;
    partnerLeverageScore: DimensionMetric;
    alumniNetworkScore: DimensionMetric;
    strategicBackerScore: DimensionMetric;
  };
  operations: {
    supplierFragilityScore: DimensionMetric;
    customerConcentrationScore: DimensionMetric;
    infraDependenceScore: DimensionMetric;
    regulatoryExposureScore: DimensionMetric;
  };
  narrative: {
    credibilityScore: DimensionMetric;
    overclaimRiskScore: DimensionMetric;
    momentumScore: DimensionMetric;
  };
};
```

## New durable tables

Add four new Convex tables under `convex/domains/deepTrace/schema.ts` and export them through `convex/schema.ts`.

### 1. `dimensionProfiles`

Purpose:

- latest normalized dimension state for an entity or investigation target
- current regime classification
- operator-facing summary

Fields:

- `profileKey`
- `entityKey`
- `entityId?`
- `entityType`
- `dimensionState`
- `regimeLabel`
- `policyContext`
- `confidence`
- `sourceRefs`
- `lastComputedAt`
- `updatedAt`

Indexes:

- `by_entity`
- `by_regime_updated`

### 2. `dimensionSnapshots`

Purpose:

- time-series of dimension states
- regime transition tracking

Fields:

- `snapshotKey`
- `entityKey`
- `entityId?`
- `asOfDate`
- `dimensionState`
- `regimeLabel`
- `policyContext`
- `triggerEventKey?`
- `sourceRefs`
- `createdAt`

Indexes:

- `by_entity_asOfDate`
- `by_regime_asOfDate`

### 3. `dimensionEvidence`

Purpose:

- one row per dimension claim with evidence, availability, and reasoning boundary
- lets judge and UI show why a dimension is what it is

Fields:

- `evidenceKey`
- `entityKey`
- `dimensionFamily`
- `dimensionName`
- `availability`
- `rawValue`
- `normalizedScore?`
- `rationale`
- `sourceRefs`
- `sourceArtifactId?`
- `evidencePackId?`
- `linkedChainId?`
- `effectiveAt?`
- `observedAt`

Indexes:

- `by_entity_dimension_time`
- `by_dimension_time`

### 4. `dimensionInteractions`

Purpose:

- explicitly store interaction effects instead of hiding them inside one opaque score

Fields:

- `interactionKey`
- `entityKey`
- `dimensions`
- `effectDirection`
- `magnitude`
- `interactionSummary`
- `sourceRefs`
- `linkedEvidenceKeys`
- `createdAt`
- `updatedAt`

Indexes:

- `by_entity_updated`
- `by_dimension_pair`

## Policy context

Every dimension profile should emit a policy context that downstream agents and UI can use.

```ts
type PolicyContext = {
  operatingMode:
    | "survival"
    | "focused_build"
    | "measured_scale"
    | "aggressive_expansion"
    | "high_uncertainty_watch";
  confidenceAdjustment: number; // -1 to +1
  recommendedTempo: number; // 0-1
  explorationAllowance: number; // 0-1
  errorTolerance: number; // 0-1
};
```

Interpretation:

- high capital slack + high team credibility + low urgency => lower tempo, more deliberation
- low runway + high deadline pressure + weak operator strength => survival mode, narrow scope
- strong narrative + weak execution => skepticism and forced limitations disclosure

## Dimension extraction pipeline

Use the existing ingestion and DeepTrace sync layer first.

Current good hooks:

- `syncEntityContextToDeepTrace`
- `syncStructuredSourceTextToDeepTrace`
- `syncDueDiligenceBranchToDeepTrace`
- `syncNarrativeEventToDeepTrace`

Add dimension extraction after those sync points:

1. extract candidate dimension facts from the incoming source
2. write `dimensionEvidence`
3. recompute `dimensionProfiles`
4. write `dimensionSnapshots` when a regime changes materially
5. emit `dimensionInteractions`

## Dimension-aware mission harness

Extend the existing planner-worker-judge model. Do not create a second orchestration system.

### Planner routing

For entity and company investigations, decompose by dimension family:

- `time_worker`
- `capital_worker`
- `capability_worker`
- `network_worker`
- `operations_worker`
- `market_worker`
- `narrative_worker`

### Worker responsibilities

Each worker:

- gathers evidence for one dimension family
- records trace steps and decisions
- attaches evidence
- writes provisional dimension evidence rows

### Judge responsibilities

Judge must:

- reject unsupported dimension scores
- downgrade `verified` to `estimated` or `inferred` when evidence is weak
- require limitations disclosure on inferred metrics
- block merge when regime classification depends on unsupported dimension assumptions

### Merge responsibilities

The merge step must output:

- observed facts
- dimension profile
- interaction effects
- regime label
- counter-hypothesis
- recommended next action

## UI implementation

### Entity pages

Add a `Dimension Rail` to the entity surface that shows:

- runway / time slack
- capital slack
- team strength
- investor quality
- market urgency
- structural fragility
- narrative credibility

Each rail item must show:

- score
- availability: verified / estimated / inferred / unavailable
- drilldown into evidence

### Regime summary card

Render one operator-facing label:

- deliberate build regime
- high-pressure survival regime
- capital-rich scaling regime
- credible but underpowered regime
- narrative-rich, execution-poor regime

### Trace linkage

Execution trace should deep-link to:

- dimension evidence rows
- dimension interactions
- the dimension profile snapshot used for the final verdict

## MCP surface plan

This should be implemented as additional typed MCP tools on top of the existing NodeBench MCP server rather than a separate platform.

### New MCP domains

#### `dimension_engine`

Tools:

- `dimension_get_profile`
- `dimension_get_snapshot_timeline`
- `dimension_list_evidence`
- `dimension_compute_regime`
- `dimension_explain_interactions`

#### `deeptrace_eval`

Tools:

- `eval_start_deeptrace_run`
- `eval_record_paired_result`
- `eval_score_deeptrace_case`
- `eval_complete_deeptrace_run`
- `eval_compare_baseline_uplift`

### Prompt surfaces

Expose prompt packs as MCP prompts so Claude Code sees them as slash commands:

- `/mcp__nodebench__deeptrace_dimension_scan`
- `/mcp__nodebench__deeptrace_company_regime`
- `/mcp__nodebench__deeptrace_world_to_company_exposure`
- `/mcp__nodebench__deeptrace_baseline_report`

## CLI bridge for Claude Code

The CLI should stay file-first and artifact-heavy so Claude does not need to keep large tool outputs in chat context.

Recommended command family:

```bash
nbx dimension profile --entity "ByteDance"
nbx dimension timeline --entity "ByteDance" --days 365
nbx dimension evidence --entity "ByteDance" --dimension capital
nbx regime classify --entity "ByteDance"
nbx eval paired-run --spec scripts/eval-harness/deeptrace/canary-benchmark-spec.json
```

Design rules:

- write full results to `./artifacts`
- return concise summaries to Claude
- keep CLI and MCP schemas aligned
- allow Bash + hooks + MCP to coexist

## Rollout order

### Phase 1

- add the four dimension tables
- add extraction and profile computation
- add regime classification rules

### Phase 2

- add dimension MCP tools
- add CLI wrappers
- add prompt pack

### Phase 3

- add entity-page dimension rail
- add trace-to-dimension drilldowns
- add operator views for regime transitions

### Phase 4

- add baseline vs uplift benchmarking
- add weekly Claude canary
- add release gates for traceability regressions

## Non-negotiable implementation rules

- dimensions are evidence-backed, not vibes
- inferred values must be labeled and scored separately from verified values
- interaction effects stay explicit
- regime classification must be reproducible from stored dimension state
- judge review blocks unsupported high-confidence outputs
- the Convex app remains the system of record
- MCP and CLI are access layers, not alternate truth stores
