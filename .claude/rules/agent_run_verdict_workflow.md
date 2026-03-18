---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.md"
related_: [self_direction, completion_traceability, analyst_diagnostic, agentic_reliability, dogfood_verification]
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
- Enrich backend context from:
  - `sourceRefs`
  - trace decisions
  - verification checks
  - evidence
  - approvals
  - drift or violated cross-checks
- Surface the operator summary in the UI above the raw trace drill-down.
- Make verdicts exact and bounded: `verified`, `provisionally_verified`, `needs_review`, `awaiting_approval`, `failed`, `in_progress`.
- Always expose next actions and open issues when the run is not fully verified.

## Progressive disclosure requirement
If the run is expected to resolve tool usage itself, prefer using or surfacing:
- `discover_tools`
- `smart_select_tools`
- `get_tool_quick_ref`
- `get_workflow_chain`
- `findTools`

Absence of those signals should be surfaced as a review issue, not hidden.

## Verification floor
For any contract, verdict, or operator-panel change:
1. `npx convex codegen`
2. `npx tsc --noEmit`
3. targeted tests for derivation and UI
4. `npm run build`
5. `npm run dogfood:verify:smoke` when the UI changed

## Anti-patterns
- Treating `completed` as equivalent to `verified`
- Shipping a UI badge without evidence logic
- Leaving next actions buried in trace logs
- Stopping after backend work when the UI cannot expose the result
- Stopping after UI work when deterministic verification is missing

## Canonical reference
`docs/agents/AGENT_RUN_VERDICT_WORKFLOW.md`
