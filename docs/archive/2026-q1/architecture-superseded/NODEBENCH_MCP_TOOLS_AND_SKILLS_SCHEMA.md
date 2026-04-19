# NodeBench MCP Tools And Skills Schema

## Purpose

This document defines the MCP tool layer and the companion skills / subagent layer for NodeBench Deep Sim.

The design goal is simple: keep extraction, judgment, simulation, rendering, and scorekeeping separate so the system can be benchmarked, debugged, and improved over time.

## Design Rules

1. Every MCP tool emits structured JSON.
2. Every major tool output includes provenance.
3. Every major tool output includes confidence.
4. Every analytical output includes `whatWouldChangeMyMind`.
5. Extraction tools do not render prose-heavy executive outputs.
6. Rendering tools do not invent evidence.
7. Scorekeeping tools compare predictions against later outcomes.
8. Tool names should be domain-clear, not cute.

## Core MCP Tools

### 1. `build_claim_graph`

Purpose:
- convert source packets into typed claims linked to evidence

Input:
- `entityType`
- `entityKey`
- `sourceRefs[]`
- `timeWindow`

Output:
- `claims[]`
- `evidenceBundles[]`
- `timeline[]`
- `coverageScore`
- `confidence`
- `whatWouldChangeMyMind`

### 2. `extract_variables`

Purpose:
- identify the variables that materially drive the decision or trajectory

Input:
- `entityType`
- `entityKey`
- `question`
- `sourceRefs[]`

Output:
- `variables[]`
  - `name`
  - `direction`
  - `estimatedWeight`
  - `evidenceRefs[]`
  - `uncertainty`
- `sensitivityNotes[]`
- `confidence`
- `whatWouldChangeMyMind`

### 3. `generate_countermodels`

Purpose:
- produce serious alternative theses and mechanisms

Input:
- `primaryThesis`
- `claims[]`
- `variables[]`

Output:
- `countermodels[]`
  - `title`
  - `mechanism`
  - `supportingEvidenceRefs[]`
  - `disconfirmingEvidenceRefs[]`
  - `confidence`
- `dissentSummary`
- `whatWouldChangeMyMind`

### 4. `run_deep_sim`

Purpose:
- generate bounded scenario branches using variables, actors, and interventions

Input:
- `entityType`
- `entityKey`
- `question`
- `variables[]`
- `countermodels[]`
- `simulationMode`
- `timeHorizon`

Output:
- `scenarios[]`
  - `title`
  - `summary`
  - `triggerVariables[]`
  - `keyActors[]`
  - `confidence`
  - `risks[]`
  - `evidenceRefs[]`
- `branchingNotes`
- `whatWouldChangeMyMind`

### 5. `rank_interventions`

Purpose:
- identify the highest-leverage actions that could change the trajectory

Input:
- `entityType`
- `entityKey`
- `variables[]`
- `scenarios[]`
- `trustNodes[]`

Output:
- `interventions[]`
  - `title`
  - `expectedDelta`
  - `mechanism`
  - `cost`
  - `timeToImpact`
  - `risk`
  - `evidenceRefs[]`
- `rankingRationale`
- `confidence`
- `whatWouldChangeMyMind`

### 6. `score_compounding`

Purpose:
- measure whether progress is intrinsic, trust-assisted, flat, or drifting

Input:
- `entityType`
- `entityKey`
- `timeWindow`

Output:
- `rawCompoundingScore`
- `trustAdjustedCompoundingScore`
- `driftScore`
- `adaptationVelocityScore`
- `trustLeverageScore`
- `label`
- `explanation`

### 7. `forecast_scorecard`

Purpose:
- compare prior scenarios and recommendations against later outcomes

Input:
- `analysisId`
- `entityType`
- `entityKey`
- `observedOutcomeRefs[]`

Output:
- `verdict`
- `calibrationScore`
- `directionalAccuracy`
- `timingAccuracy`
- `mechanismAccuracy`
- `missedVariables[]`
- `learningNotes[]`

### 8. `render_decision_memo`

Purpose:
- render the operator-facing output

Input:
- `question`
- `variables[]`
- `scenarios[]`
- `interventions[]`
- `scorecard?`

Output:
- `coreThesis`
- `whyNow`
- `topVariables[]`
- `scenarioCards[]`
- `bestNextActions[]`
- `confidenceSummary`
- `evidenceDrawerSummary`
- `dissentSummary`

## Output Contract

Every major tool response should include the following envelope:

```json
{
  "entityType": "company",
  "entityKey": "acme-ai",
  "createdAt": "2026-03-19T10:15:00.000Z",
  "sourceRecordType": "analysis_run",
  "sourceRecordId": "run_123",
  "confidence": {
    "score": 0.71,
    "label": "moderate"
  },
  "whatWouldChangeMyMind": [
    "new financing data",
    "customer retention breakdown",
    "contradictory trust-node evidence"
  ]
}
```

## Skill / Subagent Layer

The skill layer teaches agents how to use the MCP layer safely and consistently.

### Required Subagents

1. `nodebench-supervisor`
2. `nodebench-benchmark-runner`
3. `nodebench-deep-sim-analyst`
4. `nodebench-changelog-updater`
5. `nodebench-frontend-polisher`

These are stored as project subagents under `.claude/agents/`.

## Routing Guidance

### Use `nodebench-deep-sim-analyst` when

- the task is strategic analysis
- the user asks for scenarios, variables, interventions, or diligence
- the output should become a memo or scorecard

### Use `nodebench-benchmark-runner` when

- a benchmark suite must be executed
- golden cases must be scored
- regressions must be compared

### Use `nodebench-frontend-polisher` when

- the live demo UI needs refinement
- layout hierarchy is weak
- design dogfood or traversal is failing

### Use `nodebench-changelog-updater` when

- draft release notes or an in-app changelog need updates
- evidence from benchmarks should be translated into user-facing deltas

## Safe Autonomy Pattern

Recommended recurring loop:

1. scheduled benchmark run
2. compare against last baseline
3. open or update a tracking artifact
4. generate draft changelog notes
5. stop and wait for review on risky actions

Unsafe pattern to avoid:
- unrestricted access to personal environments
- direct protected-branch pushes
- automatic deploys
- self-modifying prompts with no audit trail

## GitHub And Claude Code Integration

Use:
- Claude Code hooks for logging, validation, and guardrails
- Claude Code subagents for narrow-role decomposition
- GitHub Actions schedules and `repository_dispatch` for bounded recurring runs
- GitHub release notes and workflow badges for public proof surfaces

## Reference Links

- Claude Code hooks: https://docs.anthropic.com/en/docs/claude-code/hooks
- Claude Code subagents: https://docs.anthropic.com/en/docs/claude-code/sub-agents
- Claude Code MCP: https://docs.anthropic.com/en/docs/claude-code/mcp
- GitHub Actions scheduling: https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run
- GitHub status badges: https://docs.github.com/en/actions/monitoring-and-troubleshooting-workflows/monitoring-workflows/adding-a-workflow-status-badge
- GitHub automatic release notes: https://docs.github.com/en/repositories/releasing-projects-on-github/automatically-generated-release-notes
