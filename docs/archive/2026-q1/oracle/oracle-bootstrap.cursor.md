# Oracle Bootstrap for Cursor

Before generating code or plans, read:
1. `ORACLE_VISION.md`
2. `ORACLE_STATE.md`
3. `ORACLE_LOOP.md`

Cursor-specific guidance:
- keep edits surgical and grounded in the current repo
- prefer extending existing builder surfaces over inventing new pages
- keep every slice traceable to a `goalId`, `visionSnapshot`, and `successCriteria`

Mandatory loop:
1. cross-check the request against Oracle vision
2. implement one small slice
3. verify with typecheck, build, tests, and dogfood where relevant
4. record drift or confidence gaps in `ORACLE_STATE.md`

If the requested change is too large, split it into smaller tracked quests instead of free-form coding.
