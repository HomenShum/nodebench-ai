# Agent Run Verdict Workflow

## Goal
Make every in-app agent run capable of producing a final operator-facing verdict with open-source citations, trace-backed evidence, and explicit next actions, all surfaced through the existing UI.

This is the standard workflow for any agent-facing slice that touches:
- contract + data model wiring
- backend issue context enrichment
- frontend live workflow panels
- verdict exactness UI surfacing
- tests + verification

This extends the existing NodeBench harness. Do not build a second orchestration stack, second trace system, or parallel review UI.

## Operating stance
- Direct yourself as if you were the product owner and reliability lead.
- Do not stop after a backend patch if the UI cannot expose the result.
- Do not stop after UI polish if the verdict is not defensible from stored evidence.
- Do not stop after a “looks good” pass if deterministic tests and verification are missing.

## Workflow contract

### 1. Contract + data model wiring
Start at the contract layer.

Define or confirm:
- the user-facing job contract
- the stored data contract
- the verdict contract
- the UI contract

For agent-task substrate work, prefer the existing tables and query surfaces:
- `agentTaskSessions`
- `agentTaskTraces`
- `agentTaskSpans`
- `toolApprovals`
- existing `sourceRefs`, `goalId`, `visionSnapshot`, `successCriteria`, `crossCheckStatus`, `deltaFromVision`

If the feature needs new session output, first ask:
1. Can this be derived from existing session or trace metadata?
2. Can the UI query synthesize it without adding new persistence?
3. If persistence is required, is the new field part of the canonical session contract?

Rules:
- Prefer derived proof packs over duplicate storage.
- Keep verdict enums explicit and bounded.
- Keep source references structured, not embedded in prose only.
- Use exact validators and exact return contracts in Convex.

Minimum verdict shape:
- `verdict`
- `verdictLabel`
- `summary`
- `confidence`
- `evidenceCount`
- `citationCount`
- `verificationCounts`
- `approvalCounts`
- `keyFindings`
- `openIssues`
- `nextActions`
- `topSourceRefs`

### 2. Backend issue context enrichment
Once the contract is defined, enrich the backend so the verdict is explainable.

The backend must aggregate or derive from:
- trace decisions
- trace verification checks
- attached evidence
- source references
- approval state
- session status
- cross-check drift or violation state

For execution-trace-backed sessions, prefer:
- `executionTraceDecisions`
- `executionTraceVerificationChecks`
- `executionTraceEvidence`
- `executionTraceApprovals`

Rules:
- Do not hardcode “pass” or inflate confidence.
- Unsupported claims must downgrade the verdict.
- Missing citations must downgrade the verdict.
- Pending approvals must block externally visible completion.
- Drift and violated cross-checks must be surfaced as explicit review issues.

Backend output must answer:
- What happened?
- Why is this verdict justified?
- What evidence supports it?
- What is still unresolved?
- What should happen next?

### 3. Frontend live workflow panels
The operator must be able to inspect the run from the app, not from logs or shell output.

Use the existing UI surfaces first:
- task/session detail panels
- execution trace views
- agent workspace panels
- control-plane review surfaces

Rules:
- Put the verdict summary above the raw trace drill-down.
- Keep traces as the evidence substrate, not the only way to understand the run.
- Use progressive disclosure: summary first, deep trace second.
- Show counts and status summaries that drive action.
- Link citations and evidence back to exact references.

A live workflow panel is incomplete if the operator cannot answer:
- Is this run verified?
- Can I trust the result?
- What sources support it?
- What failed or drifted?
- What action should the agent or human take next?

### 4. Verdict exactness UI surfacing
Verdicts must be exact, not theatrical.

Allowed verdicts should be bounded and operational, for example:
- `verified`
- `provisionally_verified`
- `needs_review`
- `awaiting_approval`
- `failed`
- `in_progress`

Rules:
- A completed run is not automatically verified.
- “Verified” requires trace-backed evidence plus explicit verification.
- “Provisionally verified” is allowed only when the run is useful but still weaker than the fully verified bar.
- “Needs review” is for evidence gaps, unsupported claims, or drift.
- “Awaiting approval” is for approval-gated actions.
- “Failed” is for failed session status, failed verification, or violated cross-checks.

The UI must surface:
- the verdict badge
- the confidence number
- the concise summary
- the next actions
- the open issues
- the citation pack
- the verification totals
- the approval totals
- whether progressive-disclosure tool usage was recorded

### 5. Tests + verification
No slice is complete without deterministic proof and operator verification.

Required test layers:
- pure derivation tests for verdict logic
- query or contract tests for backend output shape
- UI tests for the operator-facing surface
- build/typecheck
- dogfood verification when the UI changed

Minimum verification loop:
1. `npx convex codegen`
2. `npx tsc --noEmit`
3. targeted tests for new backend and UI behavior
4. `npm run build`
5. `npm run dogfood:verify:smoke` when the operator surface changed

Rules:
- Do not rely on screenshots alone for verdict logic.
- Do not rely on tests alone for UI operator flows.
- If a rule or skill says “prefer interactive verification,” that does not replace deterministic tests for contract or verdict changes.

## Progressive disclosure requirement
When an agent run is expected to resolve tool usage itself, the run should record or surface front-door tool resolution when available:
- `discover_tools`
- `smart_select_tools`
- `get_tool_quick_ref`
- `get_workflow_chain`
- `findTools`

If those tools were not used or not recorded, surface that as a reviewable signal rather than hiding it.

## Done definition
The work is done only when all of these are true:
- the contract is explicit
- the backend can derive a defensible verdict
- the UI exposes the verdict, evidence, and next actions
- the trace links remain available for drill-down
- deterministic tests pass
- build passes
- dogfood verification passes when UI changed

## Anti-patterns
- Shipping a backend-only verdict that never reaches the operator UI
- Shipping a UI badge with no evidence logic behind it
- Adding new tables when the verdict can be derived from existing trace metadata
- Treating “completed” as equivalent to “verified”
- Burying next actions in raw trace logs
- Declaring done after grep or code inspection only

## Canonical references
- `AGENTS.md`
- `docs/agents/AUTONOMOUS_QA_AGENT_OPERATING_MODEL.md`
- `convex/domains/operations/taskManager/queries.ts`
- `convex/domains/operations/taskManager/proofPack.ts`
- `src/features/agents/components/TaskManager/TaskSessionDetail.tsx`
