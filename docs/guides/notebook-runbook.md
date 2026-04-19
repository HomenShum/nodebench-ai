# Notebook Runbook

Date: 2026-04-17

Scope:
- Live notebook editing on `/entity/:slug`
- Notebook provenance and block persistence
- Shared-session collaboration on a single entity
- Named member invites with email delivery fallback
- Convex production deployment `https://agile-caribou-964.convex.cloud`

## Fast triage rule

When a user reports a notebook problem, capture:
- the exact error toast text
- the trailing `(ref: <requestId>)` when present
- the entity slug
- whether the user was in `Classic`, `Notebook`, or `Live`

Default rule:
1. find the Convex request id first
2. check whether the failure is expected (`REVISION_MISMATCH`, `RATE_LIMITED`, `CONTENT_TOO_LARGE`)
3. if not expected, treat it as a product incident until proven otherwise

## Rollout controls

These controls exist so Live can be disabled or narrowed without deleting data.

### Frontend env vars

| Control | Meaning |
|---|---|
| `VITE_NOTEBOOK_LIVE_ENABLED=false` | Hide Live globally and force fallback to `Classic` |
| `VITE_NOTEBOOK_LIVE_ROLLOUT_PERCENT=0..100` | Deterministic session-and-entity cohort rollout |
| `VITE_NOTEBOOK_ALERT_NTFY_URL` | Client-side error alerts to ntfy |

### Browser-local overrides

| Key | Effect |
|---|---|
| `nodebench.liveNotebookDisabled=1` | Disable Live for one browser only |
| `nodebench.liveNotebookForceEnabled=1` | Force-enable Live for one browser even if cohort rollout is below 100% |

Examples:

```js
localStorage.setItem("nodebench.liveNotebookDisabled", "1");
location.reload();
```

```js
localStorage.setItem("nodebench.liveNotebookForceEnabled", "1");
location.reload();
```

### Rollback order

1. One user broken:
   - use `nodebench.liveNotebookDisabled=1`
2. Small cohort issue:
   - reduce `VITE_NOTEBOOK_LIVE_ROLLOUT_PERCENT`
3. Broad issue:
   - set `VITE_NOTEBOOK_LIVE_ENABLED=false`
4. Backend bug:
   - forward-fix and `npx convex deploy`

Do not revert schema in production. Use forward-fix only.

## Canonical source contract

This is the current production contract.

| Surface | Canonical source |
|---|---|
| Saved brief rendering in `Classic` and report-derived notebook views | `productReports` |
| Live notebook blocks, backlinks, revisions, block relations | `productBlocks` |

Important rules:
- `productReports` remains canonical for the saved brief and provenance packet.
- `productBlocks` is canonical for user-driven live edits.
- report refreshes may project newer agent material into the entity notebook
- newer user notebook edits are never silently overwritten by report refresh
- `REVISION_MISMATCH` is the explicit reject-and-retry contract for concurrent writes

## Ownership and escalation

| Situation | Severity | First action | Escalation |
|---|---|---|---|
| `REVISION_MISMATCH` on one block | expected | user reload or retry | none unless widespread |
| `RATE_LIMITED` from same actor storm | expected under pressure | wait and retry | investigate if normal users hit it |
| `CONTENT_TOO_LARGE` | user/tool misuse | split content | inspect the generating tool if repeated |
| `ENTITY_NOT_FOUND` / `BLOCK_NOT_FOUND` | P1 | inspect request id and owner scope | fix owner/session mapping or seed path |
| opaque `Server Error` | P0 | inspect Convex request id immediately | disable or reduce rollout if broad |
| widespread save failures | P0 | disable Live or reduce rollout | forward-fix + redeploy |

## Real-time alerting

Two independent ntfy feeds exist.

| Feed | Source | Env var | Severity |
|---|---|---|---|
| Client alerts | browsers and agent sessions | `VITE_NOTEBOOK_ALERT_NTFY_URL` | P0 for unknown/server failures, P1 otherwise |
| Load-test alerts | CI and manual load runs | `LOAD_TEST_NTFY_URL` | P0 when the CI gate fails |

Recommended topics:
- `https://ntfy.sh/nodebench-client-prod`
- `https://ntfy.sh/nodebench-loadtest-prod`

Subscribe examples:

```bash
ntfy sub nodebench-client-prod
```

```bash
curl -s https://ntfy.sh/nodebench-client-prod/json | jq -r '.title, .message'
```

Operational notes:
- client alerts are sampled to 1 alert per code per 60s per tab
- load-test alerts are not sampled because CI runs are bounded
- if ntfy env vars are unset, publishing is a silent no-op
- ntfy publish failures are fail-open and do not block the notebook

## Error code map

### `REVISION_MISMATCH`

Meaning:
- two writers raced on the same block
- server accepted one write and rejected the stale one

Severity:
- expected behavior

Triage:
- if isolated, user reloads and retries
- if frequent, inspect whether an agent loop is hammering the same block
- if near 100 percent, verify the reactive query is refreshing revisions correctly

### `CONTENT_TOO_LARGE`

Meaning:
- block content exceeded `MAX_BLOCK_CONTENT_BYTES = 50_000`

Severity:
- permanent until the caller changes payload size

Triage:
- split the block
- if caused by an agent, fix the generating tool or summarization path

### `ENTITY_NOT_FOUND` or `BLOCK_NOT_FOUND`

Meaning:
- id did not resolve under the current `ownerKey`
- usually session drift, auth drift, or a bad seed/backfill assumption

Severity:
- P1

Triage:
- inspect the request id in Convex logs
- verify owner/session scoping
- verify `ensureEntity` seed path if this came from a load or automation lane

### `RATE_LIMITED`

Meaning:
- actor-scoped pacing or write-window contention guard fired

Current beta contract:
- phase 1 rollout is 15 testers for 14 days
- phase 2 expands to 50 only if phase 1 exits without unresolved P0/P1 data-loss or access bugs
- phase 3 expands to 100 only if phase 2 stays clean
- same-actor storms degrade into `RATE_LIMITED`
- collaboration-safe append path takes priority over a stricter session-wide anti-rotation limiter

Severity:
- expected under synthetic pressure
- suspicious if normal single-user editing hits it

Triage:
- confirm whether the same actor is writing from many tabs or an agent loop
- inspect recent notebook or agent writes before raising limits
- only raise limits after verifying the source of pressure

Relevant constants:
- `NOTEBOOK_WRITE_BURST_LIMIT = 300`
- `NOTEBOOK_WRITE_LIMIT_PER_MINUTE = 1200`
- `NOTEBOOK_WRITE_BUCKET_MS = 10000`
- `NOTEBOOK_WRITE_WINDOW_MS = 60000`

### Opaque `Server Error`

Meaning:
- an unplanned failure path threw without a structured notebook code

Severity:
- P0 until understood

Triage:
1. grep Convex logs by request id
2. identify the missing structured error path
3. patch to a codified error or disable Live if broad

## Verification commands

### Core engineering gate

```bash
npx tsc --noEmit
npx convex dev --once --typecheck=enable
npx convex deploy -y --typecheck=enable
npm run build
```

### Focused notebook tests

```bash
npx vitest run \
  convex/domains/product/blockProsemirror.test.ts \
  src/features/entities/components/notebook/notebookOfflineQueue.test.ts \
  src/features/entities/components/notebook/EntityNotebookLive.test.tsx \
  src/features/entities/views/EntityPage.test.tsx
```

### E2E regression

```bash
npx playwright test tests/e2e/entity-notebook-regression.spec.ts --project=chromium
npx playwright test tests/e2e/entity-share-permissions.spec.ts --project=chromium
npx playwright test tests/e2e/entity-member-invite.spec.ts --project=chromium
npx playwright test tests/e2e/product-shell-smoke.spec.ts --project=chromium
```

### Load verification

Baseline suite:

```bash
node scripts/loadtest/notebook-load.mjs --entity softbank --scenario all --clients 10 --duration 60 --jsonOut .tmp/notebook-load-summary.json
```

Actor-pressure guard:

```bash
node scripts/loadtest/notebook-load.mjs --entity softbank --scenario actor_rate_limit_guard --clients 20 --duration 15 --jsonOut .tmp/notebook-load-actor-guard.json
```

Zero-ramp burst:

```bash
node scripts/loadtest/notebook-load.mjs --entity softbank --scenario spike_insert --clients 100 --duration 5 --jsonOut .tmp/notebook-load-spike.json
```

10-minute soak:

```bash
node scripts/loadtest/notebook-load.mjs --entity softbank --scenario soak_mixed --clients 5 --duration 600 --jsonOut .tmp/notebook-load-soak.json
```

## Current measured baselines

See [notebook-load-latest.md](/d:/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/docs/architecture/benchmarks/notebook-load-latest.md).

At the time of this run:
- baseline shared-session append is green
- actor-pressure guard produces expected `RATE_LIMITED` rejects
- 100-client spike stays under 269ms p95
- 10-minute soak stays under 198ms p95

## Browser verification checklist

Verify these routes after notebook changes:

1. `/?surface=home`
2. `/?surface=reports`
3. `/entity/softbank`

On `/entity/softbank`, verify:
- `Classic` renders
- `Notebook` renders provenance and sources
- `Live` renders editable blocks when enabled
- reload preserves the selected mode when allowed
- Live disable or rollout gating produces an honest fallback state
- no console errors beyond known non-blocking dev CSP noise

## What is intentionally not solved yet

These are not beta blockers, but they are real boundaries:

1. strict session-wide anti-rotation abuse enforcement on the append hot path
   - current beta guard is actor-scoped to preserve shared-session collaboration correctness
2. full live SLO dashboard
   - current truth is benchmark artifacts plus ntfy alerts
3. full live cursor and shared-selection awareness
   - current collaboration model shows active-editor identity and last human edit, not cursor-level presence
