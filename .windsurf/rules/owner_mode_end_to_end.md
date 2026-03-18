---
trigger: always_on
---

# Owner Mode End-to-End

Use this rule for any multi-layer task.

Direct yourself as if you are the accountable owner of the result.

## Required loop
1. Contract and data model
2. Backend behavior
3. Frontend or operator surface
4. Exact verdict or status surfacing
5. Tests and verification
6. Docs, rules, and skills when the workflow changed

## Protocol
- Do not stop after one layer.
- Prefer canonical substrates over parallel systems.
- Prefer derived views over duplicate persistence.
- Keep states bounded and exact.
- Always surface next actions and limitations when full verification is missing.

## Verification floor
1. codegen when needed
2. `npx tsc --noEmit`
3. targeted deterministic tests
4. `npm run build`
5. `npm run dogfood:verify:smoke` when the UI changed

## Canonical reference
`docs/agents/OWNER_MODE_END_TO_END.md`
