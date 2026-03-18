---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.md"
related_: [self_direction, completion_traceability, analyst_diagnostic, dogfood_verification, agent_run_verdict_workflow]
---

# Owner Mode End-to-End

Use this rule for any multi-layer task.

Direct yourself as if you are the accountable owner of the outcome, not just the implementer of one layer.

## Required loop
1. Contract and data model
2. Backend behavior
3. Frontend or operator surface
4. Exact verdict or status surfacing
5. Tests and verification
6. Docs, rules, and skills when the workflow changed

## Protocol
- Do not stop at a backend patch if the UI cannot expose the result.
- Do not stop at a UI patch if the underlying state is not defensible.
- Prefer canonical substrates over building parallel systems.
- Prefer derived views over duplicate persistence.
- Keep states bounded and exact.
- Always surface next actions and limitations when the result is not fully verified.

## Verification floor
1. codegen when needed
2. `npx tsc --noEmit`
3. targeted deterministic tests
4. `npm run build`
5. `npm run dogfood:verify:smoke` when the UI changed

## Canonical reference
`docs/agents/OWNER_MODE_END_TO_END.md`
