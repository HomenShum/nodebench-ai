# 2026-03-12 Hierarchical Mission Harness Plan

## One-line thesis

NodeBench is not a single-agent assistant. It is a hierarchical mission execution harness for verifiable work.

The next execution architecture must be built around:
- planner -> worker -> judge -> human sniff-check -> merge
- Convex-backed persistent state
- verifiability as a routing primitive
- retries and merges gated by verification
- progressive disclosure from outcome to full trace

## Why this plan exists

The next system needs to absorb six hard lessons:

1. Jaggedness is often a deployment problem, not just a model problem.
2. Long-running work needs a harness, not one oversized agent.
3. Planner -> Worker -> Judge is the core execution loop.
4. Flat coordination makes agents risk-averse and ownership-blurry.
5. Verifiability is the gating function.
6. Persistence through structured artifacts and databases is mandatory.
7. Human value shifts toward sniff-checking, not manual redoing of all work.

This means the plan cannot be "better prompts." It must be explicit orchestration.

## Core architecture

### 1. Planner

Responsible for:
- reading the mission model
- decomposing work into subtasks
- defining output contracts
- assigning verification tiers
- assigning retry budgets
- deciding what is parallelizable
- deciding what requires human review or approval

Required outputs:
- task plan
- dependency graph
- success criteria
- unacceptable outcomes
- merge boundaries

### 2. Workers

Responsible for:
- executing bounded subtasks
- using scoped tools only
- generating artifacts, receipts, evidence, and diffs
- staying inside their input package and output contract

Rules:
- one owner per subtask
- no uncontrolled shared scratchpad
- no many-agents-editing-the-same-output without a merge boundary
- no direct cross-worker coordination unless the planner models it explicitly

### 3. Judge

Responsible for:
- machine checks where possible
- expert-check rubric scoring where necessary
- pass / retry / escalate decisions
- blocking low-verifiability completion
- preserving limitations and uncertainty instead of letting them disappear in merge

The judge is mandatory, not optional.

### 4. Human sniff-check

Responsible for:
- rapid credibility review
- catching overreach, weak evidence, bad decomposition, and unsafe merges
- blocking outputs that are technically polished but strategically wrong

### 5. Merge layer

Responsible for:
- composing passed subtask outputs
- preserving contradictions, limitations, and confidence
- surfacing what was merged and what was rejected

## Anti-flat-coordination rules

Flat multi-agent coordination is banned by default.

Every subtask must have:
- one owner worker
- one bounded input package
- one output contract
- one verification path
- one merge boundary

Explicit anti-patterns:
- many agents editing one artifact directly
- one giant shared context buffer
- all workers seeing all tools and all evidence
- parallelism without dependency modeling
- "everyone contributes to the same answer" without a judge

## Verifiability routing

Verifiability is the routing engine, not a post-hoc decoration.

### Tier 1: machine-checkable

Examples:
- code compiles
- tests pass
- spreadsheet formulas recalculate
- output artifact exists
- schema validates
- links resolve
- totals reconcile

Routing fields:
- `verifiabilityTier = "machine_check"`
- `judgeMethod = "deterministic"`
- `requiresHumanSniffCheck = false` unless high-stakes

### Tier 2: expert-checkable

Examples:
- company direction memo
- product recommendation
- investigation hypothesis ranking
- architecture tradeoff
- legal-style or policy reasoning
- reputation-sensitive positioning

Routing fields:
- `verifiabilityTier = "expert_check"`
- `judgeMethod = "rubric"`
- `requiresHumanSniffCheck = true` by default for high-stakes outputs

### Required planner assignment

Before any worker runs, the planner must assign:
- `verifiabilityTier`
- `judgeMethod`
- `retryBudget`
- `requiresHumanSniffCheck`
- `parallelizable`
- `dependsOnSubtaskIds`

## Convex-backed persistence model

Persistence is mandatory. Long-running work must survive restarts, retries, and review handoffs.

### Core tables

#### `runs`

One row per mission or workflow run.

Suggested fields:
- `runType`
- `title`
- `userId`
- `orgId`
- `status`
- `startedAt`
- `completedAt`
- `missionModelId`
- `overallConfidence`
- `summary`
- `limitationSummary`

#### `taskPlans`

Planner-produced graph of work.

Suggested fields:
- `runId`
- `missionId`
- `planVersion`
- `subtasks[]`

Each subtask should include:
- `subtaskId`
- `title`
- `ownerWorkerType`
- `inputArtifactIds`
- `outputContract`
- `verifiabilityTier`
- `parallelizable`
- `dependsOnSubtaskIds`
- `retryBudget`
- `requiresHumanSniffCheck`

#### `subtaskAssignments`

Assignment and ownership state for workers.

Suggested fields:
- `runId`
- `subtaskId`
- `workerId`
- `workerType`
- `status`
- `claimedAt`
- `completedAt`

#### `runSteps`

Receipts for meaningful execution steps.

Suggested fields:
- `runId`
- `subtaskId`
- `stage`
- `action`
- `target`
- `status`
- `toolName`
- `toolType`
- `summary`
- `evidenceRefIds`
- `artifactRefIds`
- `verificationRefIds`
- `startedAt`
- `completedAt`

#### `decisions`

Structured decision records instead of raw chain-of-thought.

Suggested fields:
- `runId`
- `subtaskId`
- `decisionType`
- `statement`
- `basis`
- `alternativesConsidered`
- `confidence`
- `limitationNotes`
- `evidenceRefIds`

#### `evidence`

All supporting sources and captured inputs.

Suggested fields:
- `runId`
- `subtaskId`
- `sourceType`
- `uri`
- `title`
- `claimSupport`
- `capturedAt`
- `contentHash`
- `metadata`

#### `artifacts`

Intermediate and final outputs.

Suggested fields:
- `runId`
- `subtaskId`
- `artifactType`
- `uri`
- `filename`
- `beforeArtifactId`
- `afterArtifactId`
- `createdAt`
- `exportStatus`

#### `verifications`

Verification checks and their results.

Suggested fields:
- `runId`
- `subtaskId`
- `verificationType`
- `target`
- `result`
- `details`
- `createdAt`

#### `judgeReviews`

Judge decisions for each subtask.

Suggested fields:
- `runId`
- `subtaskId`
- `reviewType`
- `reviewer`
- `result`
- `findings`
- `evidenceRefIds`
- `createdAt`

#### `retryAttempts`

Subtask retry history.

Suggested fields:
- `runId`
- `subtaskId`
- `attemptNumber`
- `retryMode`
- `triggeredBy`
- `reason`
- `createdAt`

#### `mergeBoundaries`

Explicit composition boundaries.

Suggested fields:
- `runId`
- `mergeId`
- `inputSubtaskIds`
- `outputArtifactId`
- `mergeJudgeReviewId`
- `status`
- `createdAt`

#### `sniffChecks`

Human review state.

Suggested fields:
- `runId`
- `subtaskId`
- `humanReviewerId`
- `sniffCheckType`
- `result`
- `issueTags`
- `notes`
- `createdAt`

#### `approvals`

Approval gates for risky actions.

Suggested fields:
- `runId`
- `subtaskId`
- `actionLabel`
- `riskLevel`
- `justification`
- `status`
- `requestedAt`
- `resolvedAt`
- `resolvedBy`

## Tool inventory changes

The next wave should prioritize control primitives over niche domain tools.

### Planner tools
- `plan.decompose_mission`
- `plan.assign_verification`
- `plan.compute_merge_boundaries`

### Worker-facing trace tools
- `trace.record_step`
- `trace.record_decision`
- `evidence.attach`
- `artifact.diff`

### Judge tools
- `judge.verify_subtask`
- `judge.request_retry`
- `judge.escalate`

### Human review tools
- `sniff.record_human_review`
- `approval.request`
- `approval.resolve`

### Merge tools
- `merge.compose_output`
- `merge.publish_final_result`

## Skill changes

Skills must become hierarchical workflow contracts, not simple long prompts.

### `skill.enterprise_investigation`

Stages:
- fact gathering
- signal extraction
- hypothesis generation
- counter-analysis
- recommendation drafting
- judge review
- human sniff-check if credibility-sensitive

### `skill.company_direction_analysis`

Stages:
- gather public evidence
- separate verified vs inferred
- build reputation profile
- rank adjacent options
- apply credibility filter
- judge recommendation quality
- human sniff-check on credibility and overreach risk

### `skill.spreadsheet_enrichment`

Stages:
- inspect workbook
- infer structure and formatting
- gather evidence
- edit cells
- render and machine-check
- human sniff-check presentation if high-stakes
- export artifact

## Retry and escalation logic

A worker can only complete when:
- output contract is satisfied
- required evidence is attached
- judge passes
- required sniff-check passes when flagged

Otherwise the system must choose one of:
- retry
- retry with fresh context
- re-plan
- escalate to human
- stop as unverifiable

### Retry modes
- `same_plan_retry`
- `fresh_context_retry`
- `replan_required`
- `human_escalation`
- `terminal_unverifiable`

## Human sniff-check product surface

Human review is now a first-class product surface, not a side note.

### Review actions
- `pass`
- `concern`
- `block`

### Required issue tags
- `unsupported_claim`
- `weak_evidence`
- `bad_decomposition`
- `poor_merge`
- `not_credible`
- `too_risky`
- `needs_more_proof`
- `not_maintainable`

### Product behaviors
- concern can trigger targeted retry
- block forces retry or re-plan
- all human review writes durable Convex state

## Product surfaces

The next UI plan should include four primary surfaces.

### 1. Mission Graph
- mission
- subtasks
- dependencies
- owners
- verification tiers
- retry budget

### 2. Live Execution Board
- planner state
- worker progress
- judge outcomes
- retries
- approvals

### 3. Sniff-Check Queue
- risky outputs
- credibility-sensitive claims
- expert-check outputs pending human review

### 4. Trace + Receipts
- evidence
- decisions
- diffs
- verification history
- final outcome
- progressive disclosure

## Progressive disclosure

This architecture must remain readable to different user types.

### Outcome
- result
- confidence
- key evidence
- limitations

### Why
- decomposition
- decisions
- judge findings
- alternatives considered
- sniff-check summary

### Full Trace
- step receipts
- evidence catalog
- diffs
- verifications
- retries
- approvals
- merge history

## Evaluation framework

The system should be evaluated on five dimensions.

### 1. Decomposition quality
- were subtasks sensible
- were dependencies correct
- was parallelism used appropriately

### 2. Verification quality
- were tasks routed to the right verification tier
- did judge catch weak outputs
- did retries improve quality

### 3. Persistence quality
- were artifacts and evidence stored correctly
- could the run resume
- was context transferred correctly between stages

### 4. Sniff-check quality
- what percentage of judge-passed outputs still failed human sniff-check
- did human feedback improve retries
- were overclaims blocked

### 5. Merge quality
- did the final output integrate subtask outputs coherently
- were contradictions surfaced instead of silently erased
- were limitations preserved

## Phased roadmap

### Phase 1: harness substrate
- add planner/worker/judge schema
- add task plan table and basic decomposition contract
- add judge review table and basic pass/retry loop
- route current execution-trace runs through this substrate

### Phase 2: human review and retries
- add sniff-check queue
- add retryAttempts and mergeBoundaries
- expose pass / concern / block review path
- wire retry and re-plan into the run state machine

### Phase 3: UI surfaces
- Mission Graph
- Live Execution Board
- Sniff-Check Queue
- richer Trace + Receipts merge history

### Phase 4: domain skill migration
- upgrade investigation, company-direction, spreadsheet, and delegation workflows to planner/worker/judge form
- replace implicit monolithic execution with explicit subtask contracts

### Phase 5: outcome-grounded evaluation
- freeze recommendations at decision time
- compare later against real-world outcomes
- measure confidence calibration, sniff-check catch rate, and merge quality

## Non-negotiable architecture statements

- NodeBench is not a single-agent assistant.
- Flat multi-agent coordination is banned by default.
- Every subtask must have an owner, contract, and judge path.
- Persistence is mandatory for long-running work.
- Verifiability is a routing decision, not a retrospective label.
- Human sniff-checking is a product surface, not an apology layer.

## Immediate next implementation move

The next implementation plan should start with:
- Convex schema additions for `taskPlans`, `subtaskAssignments`, `judgeReviews`, `retryAttempts`, `mergeBoundaries`, and `sniffChecks`
- planner, judge, merge, and sniff-check tool primitives
- a Mission Graph and Sniff-Check Queue UI stub

That is the minimum architecture that actually takes the harness model seriously.
