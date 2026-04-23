# NodeBench Shared Runtime Memo, Tightened

## Summary

### Canonical direction

> NodeBench uses one shared runtime kernel for fast and slow work.  
> Convex is the durable system of record.  
> LangGraph executes deep runs and mirrors checkpoints into Convex.  
> Vercel AI SDK renders streaming UI from Convex-backed state.  
> Provider SDKs are worker adapters, not product architecture.  
> All outputs pass through one answer-control pipeline before they can update chat or artifact state.  
> The notebook/report artifact is the durable user object the product preserves.

### Current repo truth

- Product conversation terms are `productChatSessions` and `productChatEvents`.
- Current saved-report behavior still centers on `productReports`.
- Current live notebook ownership still centers on `productBlocks`.
- "Report is read mode of the same artifact" remains the target architecture, not fully current repo fact.

### Target architecture

- One shared runtime kernel with two execution profiles: `fast` and `slow`.
- One answer-control pipeline for both profiles:
  `classify -> resolve -> retrieve -> claim -> gate -> compile -> persist`
- One durable artifact model with explicit save-state discipline.
- One rollout plan using dual-write, flags, and kill switches.

## Core Decision

### Shared runtime kernel

Shared across fast and slow:

- session and thread model
- entity resolution
- evidence and claim pipeline
- save gating
- tool registry
- run events and interrupts
- telemetry and evals
- budgets and queueing

### Two execution profiles

#### Fast profile

- no planner by default
- artifact-first retrieval first
- `0-2` external calls
- `1-2` model calls
- no broad fanout
- usually `none` or `draft` output
- no canonical artifact unless save gating passes

Fast is intended to be trustworthy, bounded, artifact-aware, and low-latency. It is not "too fast too dumb."

#### Slow profile

- planner plus worker fanout
- checkpoints and resumability
- scratchpad and projections
- visible run object
- eligible for saved artifact, background continuation, and pulse

### Layer ownership

- `Convex`: sessions, runs, evidence, claims, artifacts, interrupts, budgets, provenance
- `LangGraph`: slow and background execution only; mirrors checkpoints into Convex
- `Vercel AI SDK`: streaming chat and runtime UI only
- `OpenAI / Google / Anthropic SDKs`: worker adapters only
- `OpenRouter`: routing, fallback, and cost broker only
- `Claude Code / Manus / OpenClaw / DeerFlow / Hermes`: design references only

## Persistence and Answer-Control Invariants

### State machines

- `ResolutionState = exact | probable | ambiguous | unresolved`
- `ArtifactState = none | draft | saved | published`
- `SaveEligibility = blocked | draft_only | save_ready | publish_ready`

### Persistence contract

- `unresolved` -> no canonical artifact
- `ambiguous` -> no canonical artifact; clarification or disambiguation UI only
- `probable` -> draft only
- `exact` + weak support -> draft only
- `exact` + support threshold -> save-ready
- `published` -> explicit user action only

### Universal answer-control pipeline

Every answer path, fast or slow, must:

1. classify the request
2. resolve the target
3. retrieve evidence
4. extract claims
5. gate claims
6. compile truth
7. compile actions
8. persist only what is allowed

### Claim and evidence discipline

- Extend `productEvidenceItems`; do not create a second raw-evidence store.
- Add `productClaims`, `productClaimSupports`, and `productClaimReviews`.
- Claim supports must be span-level:
  - `evidenceId`
  - `spanText`
  - `spanHash`
  - `supportType = direct | inferred | weak`
  - `entityId`
  - `freshnessStatus`
- Contradictions must be slot-aware via `claimType` and `slotKey`, not generic text flags.

### Compiler contracts

#### Truth compiler

- input: publishable claims only
- output: `what_it_is`, `why_it_matters`, `what_im_less_sure_about`
- every sentence must carry `claimIds[]` and `evidenceIds[]`

#### Action compiler

- input: verified claims, resolution state, artifact state, save eligibility, lens, category
- output: bounded `ActionItem[]`
- no action may introduce new facts

## Operational Policy

### Cost and request guardrails

Define "request" separately:

- app and HTTP requests
- Convex function calls
- LLM calls
- search and fetch calls

Core runtime policy:

- provider QPS and token budgets are first-class runtime constraints
- Linkup and vendor latency is not the product SLO
- artifact-first retrieval is the fast-lane latency strategy
- duplicate deep questions should coalesce onto one run where possible
- runs above call or cost thresholds must degrade, ask for confirmation, or move to background

### Default routing policy

- remove `gemini-3-flash` from default production routing
- keep weak lanes only in shadow eval or explicit experiments
- do not use the same model family as both answer model and primary judge in the same eval lane

### Run visibility

Promote these to core policy:

- typed `productRunEvents`
- typed interrupts
- provider budget state
- save-block reasons
- runtime panel visibility for claim counts, rejected claims, resolution state, and artifact state

## Rollout, Flags, and Acceptance

### Rollout method

Use a dual-write bridge:

- keep current `productReports` and `productBlocks` readable
- add claim-backed compiled payloads additively first
- do not cut over the artifact renderer in one move

### Feature flags

- `strict_resolution_gate_v1`
- `claim_ledger_v1`
- `truth_compiler_v1`
- `action_compiler_v1`
- `artifact_save_gate_v1`
- `model_route_strict_v1`

### Kill switches

- disable claim-backed compilation
- disable strict save gating
- disable model-route strictness
- disable action compiler while leaving truth compiler enabled

### Rollout order

1. resolution gate plus save gate
2. claim ledger plus span supports, dual-write
3. truth compiler plus action compiler
4. run event and interrupt expansion
5. model route cleanup
6. eval fixture expansion and threshold ratchet

### Acceptance and eval additions

Add explicit eval dimensions:

- `entity_resolution`
- `retrieval_relevance`
- `claim_support`
- `final_response_quality`
- `trajectory_quality`
- `actionability`
- `artifact_decision_quality`
- `ux`
- `prolonged_usage`

Required next-gate thresholds:

- overall pass `>= 65%`
- expanded pass `>= 75%`
- `entityCorrect >= 80%`
- `factuallyAccurate >= 50%`
- `noHallucinations >= 60%`
- `isActionable >= 55%`
- `artifact_decision_quality >= 80%`
- `ambiguity_recovery >= 75%`
- p95 latency `<= 90s`

## Assumptions

- `productEvidenceItems` remains the canonical evidence substrate.
- `productReports.sections` remains readable during migration.
- The notebook/report artifact remains the primary user object and is not replaced by any provider runtime or workflow framework.
- LangGraph is introduced only for slow and background execution after the Convex-backed run graph and claim pipeline are stable enough to mirror cleanly.
