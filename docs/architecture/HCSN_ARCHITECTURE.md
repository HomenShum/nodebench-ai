# HCSN Architecture

## Purpose

HCSN in NodeBench means **Hierarchical Causal Structure Network**.

It is the explicit model that connects:

- raw evidence
- extracted observations
- temporal signals
- causal chains
- entity trajectories
- interventions and trust effects
- business outcome loops

The goal is to stop treating Deep Sim, trajectory intelligence, temporal reasoning, and success loops as separate features. They are one stack.

## Core Thesis

NodeBench should not just generate a memo.

It should show how a recommendation emerged through a hierarchical causal network:

`evidence -> observation -> signal -> causal chain -> trajectory -> intervention -> outcome loop`

That is the HCSN.

## Stack Mapping

### L0: Evidence

Question: what exact source material exists?

Examples:
- filings
- transcripts
- source packets
- screenshots
- logs
- benchmark artifacts
- uploaded notes

Current substrate:
- `trajectoryEvidenceBundles`
- source refs in Deep Sim fixtures and memos
- temporal ingestion inputs

### L1: Observations

Question: what concrete state can we say was observed?

Examples:
- runway is 14 months
- time-to-first-value is high
- engagement is rising
- benchmark artifact was reused in diligence

Current substrate:
- `timeSeriesObservations`
- extracted claims and structured facts

### L2: Signals

Question: what trend or change pattern is emerging?

Examples:
- momentum
- anomaly
- regime shift
- risk window
- opportunity window

Current substrate:
- `timeSeriesSignals`

### L3: Causal Chains

Question: what directed explanation best links the important observations and signals?

Examples:
- warm intros + open market window -> partner meetings -> financing leverage
- product proof + MCP-native fit -> clearer wedge -> pilot conversion

Current substrate:
- `causalChains`
- DeepTrace causal missions

### L4: Trajectories

Question: what slope is the entity actually on?

Examples:
- improving
- flat
- drifting
- compounding

Current substrate:
- `trajectoryEntities`
- `trajectorySpans`
- `trajectorySummaries`
- `trajectoryCompoundingScores`

### L5: Interventions And Trust

Question: what can change the slope, and how much of the slope is intrinsic versus trust-amplified?

Examples:
- publish benchmark artifact
- activate trust-node intros
- ship MCP preset
- create a sharper demo

Current substrate:
- `trajectoryInterventionEvents`
- `trajectoryTrustNodes`
- `trajectoryTrustEdges`

### L6: Outcome Loops

Question: did the intervention produce real compounding in the business?

Examples:
- pilot conversion
- activation improvement
- retention improvement
- proof-to-pipeline conversion
- expansion

Current substrate:
- `successLoops`
- Oracle control-tower rollups

## HCSN Object Model

The first explicit HCSN layer is now represented in the frontend by:

- `HcsnNode`
- `HcsnEdge`
- `HcsnGraph`

Node levels:
- `evidence`
- `observation`
- `signal`
- `causal_chain`
- `trajectory`
- `intervention`
- `outcome_loop`

Node statuses:
- `grounded`
- `inferred`
- `projected`
- `needs_review`

This keeps causality humble:
- evidence is grounded
- projections are visibly different from facts
- weak links can be flagged instead of hidden

## Full-Stack Demo Flow

Use HCSN as the narrative spine for the live demo.

### 1. Decision Workbench

Start at `/deep-sim`.

Show:
- the question
- recommendation
- source packet
- HCSN panel
- variables
- scenarios
- interventions

Tell the user:

"This recommendation is not just prose. It is built from a hierarchical causal structure network."

### 2. Entity Surface

Go to the relevant entity profile.

Show:
- causal chains
- trajectory summary
- intervention attribution
- benchmark-linked rows

Tell the user:

"Here is the entity-level slope and the causal context behind it."

### 3. Execution Trace

Go to `/execution-trace`.

Show:
- span-level trajectory overlays
- evidence completeness
- slope attribution

Tell the user:

"This is where the local state transitions are recorded before they roll up into the entity model."

### 4. Oracle

Go to the Oracle control tower.

Show:
- product trajectory summary
- success loops
- causal and temporal OS counts

Tell the user:

"This is the business-level scorekeeping loop. It tells us whether the analysis is actually compounding in the real product."

## Why This Matters

Without HCSN, NodeBench risks looking like:
- a strong memo renderer
- a scenario generator
- a dashboard with many good subsystems

With HCSN, the product reads as one system:
- evidence enters at the bottom
- causal structure is built in the middle
- decisions are made near the top
- business outcomes judge the whole stack

## What Still Needs To Exist

The current HCSN layer is explicit in the demo surface, but still incomplete at the system level.

Next work:
- persist HCSN graphs as first-class Convex records instead of fixture-only demo structures
- add counterfactual nodes and edges
- connect HCSN nodes directly to temporal and trajectory row IDs
- add postmortem scorekeeping for which HCSN edges were validated or falsified
- add Oracle rollups for top driver, top intervention, top trust amplifier, and top unresolved uncertainty

## One-Line Explanation

NodeBench uses a hierarchical causal structure network to turn raw evidence into decision-grade judgment, then checks whether those judgments actually improve the business over time.
