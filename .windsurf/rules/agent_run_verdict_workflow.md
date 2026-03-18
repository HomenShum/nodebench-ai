---
trigger: always_on
---

# Agent Run Verdict Workflow

Use this rule whenever a change affects agent runs, task sessions, execution traces, proof packs, verified results, citations, or operator-facing workflow UI.

## Required workflow sections
1. **Contract + data model wiring**
2. **Backend issue context enrichment**
3. **Frontend live workflow panels**
4. **Verdict exactness UI surfacing**
5. **Tests + verification**

## Protocol
- Extend the existing NodeBench harness. Do not build a parallel agent platform.
- Start at the contract layer: session shape, verdict shape, UI shape.
- Prefer deriving verdict state from existing session and trace metadata before adding new persistence.
- Enrich backend context from decisions, verification checks, evidence, approvals, source refs, and drift.
- Put the operator summary above the raw trace drill-down.
- Keep verdicts bounded and exact: `verified`, `provisionally_verified`, `needs_review`, `awaiting_approval`, `failed`, `in_progress`.
- Always surface open issues and next actions when the run is not fully verified.

## Progressive disclosure requirement
If the run is expected to resolve tool usage itself, prefer using or surfacing:
- `discover_tools`
- `smart_select_tools`
- `get_tool_quick_ref`
- `get_workflow_chain`
- `findTools`

## Verification floor
1. `npx convex codegen`
2. `npx tsc --noEmit`
3. targeted tests for derivation and UI
4. `npm run build`
5. `npm run dogfood:verify:smoke` when the UI changed

## Anti-patterns
- Treating `completed` as equivalent to `verified`
- Shipping a verdict badge with no evidence logic
- Hiding next actions in raw traces
- Stopping after one layer when the workflow spans contract, backend, UI, and verification

## Canonical reference
`docs/agents/AGENT_RUN_VERDICT_WORKFLOW.md`
