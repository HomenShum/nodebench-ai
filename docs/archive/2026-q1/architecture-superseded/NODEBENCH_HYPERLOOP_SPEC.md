# NodeBench HyperLoop Spec

Status: draft implementation spec
Date: 2026-04-08

## Purpose

HyperLoop is NodeBench's governed improvement layer for founder/company workflows.

It borrows the useful structure from Meta HyperAgents: task execution, evaluation feedback, improvement, and an archive of successful variants. It does not copy the highest-risk part: autonomous self-rewriting of the core NodeBench app, schemas, permissions, or security logic.

The goal is to make NodeBench better at improving founder/company workflows over time:

```text
founder task -> packet/artifact/delegation -> evaluation -> archived variant -> human-gated promotion
```

Sources:
- Meta HyperAgents official site: https://hyperagents.agency/
- HyperAgents docs mirror: https://www.mintlify.com/facebookresearch/HyperAgents/introduction

## Core Interpretation

HyperAgents:

```text
task agent + meta-agent + evaluation + archive + self-modification
```

NodeBench HyperLoop:

```text
founder workflow + evaluation + archive + proposed improvement + human-gated promotion
```

NodeBench should improve:
- packet routing
- packet templates
- workflow templates
- diligence/export structures
- role/lens defaults
- model/tool routing
- watchlist thresholds
- delegation packet shapes

NodeBench should not autonomously mutate:
- Convex schema
- permission logic
- auth or tenant isolation
- billing or destructive workflows
- core app code
- production deployment config
- evaluation gates themselves without review

## Existing NodeBench Primitives

HyperLoop builds on existing repo surfaces:

- `FounderEpisode`: before/during/after episode traces in the control plane.
- `packet_lineage`: packet reuse, refresh, delegation, and stale-state tracking.
- `ResultWorkflowPathComparison`: baseline path vs optimized path evidence.
- `forecastGate`: TimesFM/statistical temporal gating signal for route/suppress/escalate decisions.
- `subconscious routing`: packet-aware whisper/suppression decision surface.
- `dogfood` and evaluation runs: UI/backend evidence for whether a flow actually worked.
- OpenClaw handoff policy: downstream execution receives bounded packets, not raw memory.

The key product rule:

```text
HyperLoop can propose and score improvements.
Only approved variants become default product behavior.
```

## Three Loops

### 1. Task Loop

User-facing founder work:

```text
query / upload / MCP context
  -> founder/company truth
  -> packet
  -> artifact or delegation
  -> history + lineage
```

Required records:
- `episodeId`
- `workspaceId`
- `companyId`
- `packetId`
- `packetLineageId`
- `artifactIds`
- `workflowTemplateId`
- `traceStepCount`
- `sourceRefs`
- `forecastGate`, if applicable

### 2. Evaluation Loop

Evaluation turns work into measurable feedback:

```text
packet/artifact/delegation
  -> evidence coverage
  -> contradiction checks
  -> artifact quality
  -> cost/latency/tool-call profile
  -> user edits/outcome feedback
```

Evaluation must be deterministic first. LLM judges can explain or suggest, but boolean gates decide pass/fail.

Core evaluation gates:
- `hasCompanyTruth`
- `hasEvidenceRefs`
- `hasContradictionReview`
- `hasNextMoves`
- `hasArtifactOrHandoff`
- `noPlaceholderEntities`
- `noUndefinedFields`
- `noRawTranscriptDump`
- `noUnauthorizedCrossTenantReads`
- `costWithinBudget`
- `latencyWithinBudget`
- `humanApprovalRequiredForPromotion`

### 3. Improvement Loop

The improvement loop compares variants and proposes upgrades:

```text
failed/weak/high-cost workflow
  -> retrieve archive parents
  -> propose variant
  -> run evaluation
  -> compare against baseline
  -> archive result
  -> promote only if gates pass
```

Allowed improvement targets:
- packet section order
- founder-readiness rubric thresholds
- prompt fragments
- retrieval strategy
- tool shortlist
- model routing
- workflow shortcut template
- export adapter structure
- delegation packet checklist
- watchlist alert threshold

Disallowed automatic targets:
- source code edits to core product
- schema changes
- permission policy changes
- deployment changes
- auth changes
- destructive cleanup jobs
- evaluation gate removal

## Archive Schema

The archive should be a Convex-backed graph of variants and outcomes.

Proposed table: `hyperloopVariants`

```ts
type HyperLoopVariant = {
  variantId: string;
  workspaceId: string;
  companyId?: string;
  parentVariantIds: string[];
  targetKind:
    | "packet_template"
    | "workflow_template"
    | "routing_policy"
    | "retrieval_strategy"
    | "export_adapter"
    | "delegation_packet"
    | "watchlist_threshold"
    | "model_tool_route";
  targetId: string;
  status:
    | "draft"
    | "evaluating"
    | "archived"
    | "candidate"
    | "promoted"
    | "rejected"
    | "rolled_back";
  summary: string;
  diffSummary: string;
  createdFromEpisodeIds: string[];
  createdFromPacketIds: string[];
  sourceRefs: string[];
  evaluationRunIds: string[];
  metrics: HyperLoopMetrics;
  promotionDecision?: HyperLoopPromotionDecision;
  createdAt: number;
  updatedAt: number;
};
```

Proposed table: `hyperloopEvaluationRuns`

```ts
type HyperLoopEvaluationRun = {
  runId: string;
  variantId: string;
  baselineVariantId?: string;
  workspaceId: string;
  episodeIds: string[];
  packetIds: string[];
  workflowTemplateId?: string;
  metrics: HyperLoopMetrics;
  gates: Record<string, boolean>;
  failedGateReasons: string[];
  llmExplanation?: string;
  artifactIds: string[];
  startedAt: number;
  completedAt?: number;
};
```

Proposed table: `hyperloopPromotions`

```ts
type HyperLoopPromotionDecision = {
  promotionId: string;
  variantId: string;
  approvedBy: "human" | "system_review_only";
  reviewerId?: string;
  decision: "promote" | "reject" | "rollback";
  rationale: string;
  requiredFollowup?: string[];
  decidedAt: number;
};
```

## Metrics

HyperAgents uses an improvement metric to measure whether improvement itself transfers. NodeBench should use product-native equivalents.

Primary metrics:

```text
packet_improvement@k
workflow_cost_reduction@k
readiness_score_gain@k
artifact_quality_gain@k
delegation_success_gain@k
contradiction_catch_gain@k
stale_packet_catch_gain@k
```

Suggested definitions:

```text
packet_improvement@k =
  best packet_quality_delta achieved within k archived variants

workflow_cost_reduction@k =
  max valid reduction in tool calls, latency, or token cost within k variants

readiness_score_gain@k =
  validated readiness score lift without reducing evidence coverage

artifact_quality_gain@k =
  artifact score lift while preserving provenance and editability

delegation_success_gain@k =
  improved completion rate for downstream Claude Code/OpenClaw handoffs

contradiction_catch_gain@k =
  increase in valid contradictions caught before export/delegation

stale_packet_catch_gain@k =
  increase in stale packet detections before shipping
```

Minimum metric record:

```ts
type HyperLoopMetrics = {
  packetQualityScore: number;
  evidenceCoverageScore: number;
  contradictionCoverageScore: number;
  artifactCompletenessScore: number;
  delegationReadinessScore: number;
  toolCallCount: number;
  latencyMs: number;
  estimatedCostUsd?: number;
  repeatedQuestionRate?: number;
  stalePacketCatchRate?: number;
  humanEditDistance?: number;
  successRate?: number;
};
```

Promotion requires a better aggregate score and no critical gate failures.

## Promotion Rules

No automatic promotion to production defaults.

Promotion requires:
- baseline comparison exists
- deterministic gates pass
- no privacy/tenant/auth gate failure
- no evidence coverage regression
- no artifact provenance regression
- no hidden model/fallback uncertainty
- at least one target metric improves
- rollback target is recorded
- human review for any user-facing default change

Promotion categories:

```text
safe_auto_archive:
  store as historical variant only

candidate:
  visible in operator/control tower, not active by default

workspace_opt_in:
  user can choose the new packet/workflow variant for one workspace

default_promoted:
  becomes default after human approval and regression verification
```

Rollback rule:

```text
Any promoted variant must keep the prior default as a parent and rollback target.
```

## Human-Gated Boundaries

Always human-gated:
- new default packet template
- new default readiness rubric
- new export adapter for investor/banker-facing artifacts
- new delegation handoff template
- any route that changes OpenClaw/Claude Code task execution
- any threshold that suppresses evidence gathering
- any workflow that reduces review steps

Never autonomous:
- schema mutation
- permission mutation
- auth mutation
- deletion/cleanup jobs
- Vercel/Convex deployment changes
- LinkedIn or external posting changes

## Integration Points

### Ask

After a founder query completes:
- record the episode
- archive the packet if it differs from prior variants
- calculate packet quality metrics
- propose improvements only if a metric is weak or a gate fails

### Workspace

Show:
- current promoted workflow variant
- candidate improvements
- why the candidate exists
- expected gain and risk

### Packets

Show:
- packet lineage
- parent packet variants
- candidate packet template changes
- before/after packet diff

### History

Show:
- improvement runs over time
- stale packet detections
- accepted/rejected promotions
- rollback history

### Connect / MCP

Expose read-only tools first:
- `list_hyperloop_variants`
- `get_hyperloop_variant`
- `explain_hyperloop_candidate`
- `compare_hyperloop_variant`

Write tools require approval:
- `propose_hyperloop_variant`
- `archive_hyperloop_variant`
- `promote_hyperloop_variant`
- `rollback_hyperloop_variant`

## OpenClaw and Claude Code Handoff

Downstream agents receive:
- active packet
- packet lineage id
- workflow variant id
- evaluation gates
- success criteria
- rollback notes
- approval requirement

They do not receive permission to mutate HyperLoop defaults.

OpenClaw can report:
- task outcome
- tool calls
- latency/cost
- verification result
- artifact produced
- failure mode

NodeBench decides whether that outcome becomes archive evidence.

## Forecast Gate Interaction

TimesFM/statistical forecast gates can influence HyperLoop, but cannot prove causality.

Allowed uses:
- mark packet stale
- trigger important-change review
- suppress redundant diligence only when stable/high-confidence
- propose watchlist threshold adjustment
- escalate anomaly for human review

Disallowed uses:
- claim why a metric changed without evidence
- auto-promote a packet variant
- reduce diligence for investor/banker-facing claims without provenance

## LightRAG / GraphRAG Interaction

Graph retrieval can index HyperLoop artifacts for recall:

```text
variant -> parent
variant -> packet
variant -> workflow
variant -> evaluation
variant -> promotion
variant -> rollback
```

Useful questions:
- Which packet variants improved artifact quality without losing evidence?
- Which workflow shortcuts reduced cost and stayed valid?
- Which delegation packet shape most often succeeded with OpenClaw?
- Which competitor-analysis recipe transferred to banking readiness packets?

Convex remains source of truth. GraphRAG remains recall/forensics.

## First Build Slice

Phase 1: archive only
- Add `hyperloopVariants`
- Add `hyperloopEvaluationRuns`
- Archive packet/workflow variants after founder episodes
- No promotion logic yet

Phase 2: metrics
- Implement deterministic metric scoring
- Add packet/workflow baseline comparison
- Add `packet_improvement@k` and `workflow_cost_reduction@k`

Phase 3: control tower
- Show candidates in Workspace/Packets/History
- Add “why this was proposed”
- Add reject/archive actions

Phase 4: gated promotion
- Add human approval mutation
- Add rollback target
- Add browser/dogfood verification gate

Phase 5: cross-workflow transfer
- Reuse successful packet recipes across:
  - founder weekly reset
  - investor memo
  - banking readiness
  - competitor brief
  - delegation packet

## Acceptance Criteria

Before HyperLoop is considered live:

- No variant can become default without a human approval record.
- Every variant has a parent or explicit genesis reason.
- Every evaluation run stores deterministic gates.
- Every candidate shows the exact metric it is trying to improve.
- Every promoted variant has a rollback target.
- Any forecast-backed recommendation labels model/fallback uncertainty.
- Browser UI shows archive, candidate, and promotion state without exposing raw transcripts.
- MCP tools are read-only by default.

## Anti-Patterns

Do not ship:
- “self-improving” marketing without visible evaluation evidence
- raw transcript archives as memory
- hidden prompt mutation
- silently changing packet schemas
- optimization that removes provenance
- cost reduction that reduces diligence coverage
- LLM judge-only promotion
- autonomous deployment or schema rewrite loops

## Best Framing

```text
NodeBench HyperLoop is a governed archive and evaluation layer that learns which founder/company packet and workflow variants actually improve outcomes, then proposes human-gated upgrades.
```

This gives NodeBench the useful part of HyperAgents:

```text
archive + evaluation + improvement
```

without copying the unsafe part:

```text
uncontrolled self-rewriting core product logic
```
