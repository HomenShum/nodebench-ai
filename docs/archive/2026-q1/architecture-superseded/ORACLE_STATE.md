# Oracle State

## Current Milestone
- Name: Harness-first prompt pack and control tower
- Status: in_progress
- Goal: ship the shared Oracle docs, typed cross-check fields, builder-facing control tower, and session detail surfacing

## Completed
- `ORACLE_VISION.md` is now builder-first and repo-native
- task sessions and traces support Oracle cross-check fields
- agent hub includes an Oracle Control Tower panel
- task cards and task detail show drift and source context
- targeted Oracle tests pass
- Convex codegen, TypeScript, and production build pass

## Active Quest
- Close the remaining dogfood verification gap or replace it with a smaller deterministic smoke check if the full loop remains too heavy for the environment

## Open Defects
- Existing sessions may not have Oracle metadata yet; UI must handle untracked runs cleanly
- Cost fields are optional until all producers write them
- Dogfood linkage depends on builders attaching the latest run to the session
- `npm run dogfood:verify` timed out during local verification; no pass/fail verdict was produced for the full end-to-end loop

## Blocked Items
- None

## Latest Dogfood Status
- Source of truth: latest builder-owned row in `dogfoodQaRuns`
- Expected action: attach the latest run ID to the active session when the slice is verified

## Update Rules
Update this file whenever a loop completes:
1. record what changed
2. record what still fails or drifts
3. record the next recommended action
4. keep entries short and operational

## Next Recommended Action
- Attach real Oracle metadata from live task producers so the control tower moves from seeded/sample support to live operating data.
- Re-run dogfood with a narrower route-level scope or a longer timeout if full verification remains required for this slice.
