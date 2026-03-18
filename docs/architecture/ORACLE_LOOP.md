# Oracle Loop

## Read First
Before planning or coding, read:
1. `ORACLE_VISION.md`
2. `ORACLE_STATE.md`
3. this file

## Operating Loop
### Step A: Cross-check and plan
- restate the slice in 2-5 lines
- confirm it extends existing repo primitives
- save or refresh:
  - `goalId`
  - `visionSnapshot`
  - `successCriteria[]`
  - `sourceRefs[]`

### Step B: Implement the smallest viable slice
- prefer extending existing task/session, telemetry, dogfood, and agent hub surfaces
- avoid parallel architectures
- keep the change small enough to verify in one pass

### Step C: Instrument the loop
- update task/session or trace metadata with:
  - `crossCheckStatus`
  - `deltaFromVision`
  - `dogfoodRunId` when available
- capture tokens, timing, cost, tool sequence, and failure state wherever the existing harness supports it

### Step D: Verify
Run the verification floor for non-trivial changes:
```bash
npx tsc -p convex -noEmit --pretty false
npx tsc -p . -noEmit --pretty false
npm run build
npm run test:run
npm run dogfood:verify
```

If the slice is smaller than full dogfood, explain why and still run the highest-signal checks available.

### Step E: Refine
- if any check fails, fix the cause, not the symptom
- rewrite the smallest possible scope
- re-run verification

### Step F: Update state
- update `ORACLE_STATE.md`
- note drift, failures, follow-up work, and next recommended action

## Rules
- no one-shot implementation dumps
- no uncited product claims
- no generic dashboards when an existing surface can be extended
- no declaring done without a green loop or a clearly stated verification gap

## Plain-English Constraint
Any builder-facing or user-facing text must:
- translate jargon immediately
- explain the purpose before the mechanism
- acknowledge uncertainty plainly
- stay concise enough to scan during active debugging
