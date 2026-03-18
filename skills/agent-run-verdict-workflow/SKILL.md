# Skill: Agent Run Verdict Workflow

## Goal
Ship agent-run features that can produce exact verdicts, open-source citations, trace-backed evidence, and explicit next actions through the existing app UI.

## When to Use
- Any task-session or execution-trace workflow change
- Any feature that claims verified results, citations, or proof packs
- Any UI slice that should let an operator inspect and act on an agent run
- Any work involving contract wiring, backend issue enrichment, workflow panels, verdict surfacing, or verification

## Inputs
- Existing NodeBench task/session substrate
- Convex session and trace contracts
- UI surface where the run will be inspected
- User request or product requirement for verified, cited, traceable output

## Outputs
- Updated contract and data-model wiring
- Backend derivation or enrichment for verdict-ready context
- UI surface exposing verdict, citations, evidence, and next actions
- Deterministic tests and verification artifacts

## Protocol
1. Start with the contract. Define the session output shape before coding.
2. Reuse the existing session and trace substrate before adding persistence.
3. Derive verdict state from evidence, verification, approvals, and drift.
4. Put the operator summary in the UI above the trace drill-down.
5. Surface exact verdicts, not vague status theater.
6. Add deterministic tests for derivation and UI rendering.
7. Run the closed loop: codegen, typecheck, targeted tests, build, dogfood if the UI changed.

## Required workflow sections
- Contract + data model wiring
- Backend issue context enrichment
- Frontend live workflow panels
- Verdict exactness UI surfacing
- Tests + verification

## Progressive disclosure rule
If the workflow expects the agent to resolve tool usage itself, prefer surfacing or recording:
- `discover_tools`
- `smart_select_tools`
- `get_tool_quick_ref`
- `get_workflow_chain`
- `findTools`

## Source of truth
See `docs/agents/AGENT_RUN_VERDICT_WORKFLOW.md`.
