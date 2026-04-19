# Notebook Load Benchmark

Date: 2026-04-17

Target deployment:
- Convex: `https://agile-caribou-964.convex.cloud`
- Entity slug: `softbank`

Purpose:
- publish the latest notebook load evidence as a durable artifact
- separate baseline success lanes from expected conflict and rate-limit lanes

## Commands used

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

## Baseline suite

Source:
- `.tmp/notebook-load-summary.json`
- generated at `2026-04-17T22:21:15.692Z`

| Scenario | ok / total | p50 | p95 | p99 | Expected errors | Unexpected errors |
|---|---:|---:|---:|---:|---|---|
| `concurrent_insert` | 2903 / 2903 | 165ms | 232ms | 343ms | none | none |
| `sustained_append` | 500 / 500 | 175ms | 239ms | 323ms | none | none |
| `paginated_read` | 21 / 21 | 136ms | 145ms | 149ms | none | none |
| `multi_tab_edit` | 899 / 899 | 156ms | 216ms | 288ms | none | none |
| `multi_tab_conflict` | 153 / 360 accepted | 154ms | 204ms | 216ms | `REVISION_MISMATCH: 207` | none |
| `shared_session_insert` | 1573 / 1573 | 158ms | 207ms | 318ms | none | none |

Interpretation:
- collaboration-critical baseline lanes are green
- conflict detection is active and explicit, not silent
- page-read latency stays flat under pagination

## Actor-pressure guard

Source:
- `.tmp/notebook-load-actor-guard.json`
- generated at `2026-04-17T22:27:37.178Z`

| Scenario | ok / total | p50 | p95 | p99 | Expected errors | Unexpected errors |
|---|---:|---:|---:|---:|---|---|
| `actor_rate_limit_guard` | 242 / 435 accepted | 314ms | 1223ms | 1495ms | `RATE_LIMITED: 193` | none |

Interpretation:
- same-actor storms degrade into structured `RATE_LIMITED`
- this is a deliberate beta contract, not an unplanned server failure

## Zero-ramp burst

Source:
- `.tmp/notebook-load-spike.json`
- generated at `2026-04-17T22:27:59.507Z`

| Scenario | ok / total | p50 | p95 | p99 | Expected errors | Unexpected errors |
|---|---:|---:|---:|---:|---|---|
| `spike_insert` | 2079 / 2079 | 180ms | 269ms | 352ms | none | none |

Interpretation:
- the notebook survives a 100-client zero-ramp burst without error inflation

## 10-minute soak

Source:
- `.tmp/notebook-load-soak.json`
- generated at `2026-04-17T22:38:13.896Z`

| Scenario | ok / total | p50 | p95 | p99 | Expected errors | Unexpected errors |
|---|---:|---:|---:|---:|---|---|
| `soak_mixed` | 9586 / 9586 | 155ms | 198ms | 260ms | none | none |

Interpretation:
- no error creep over a 10-minute mixed append/update/read lane
- latency remained below the beta write/read targets throughout the run

## Current beta gate read

Bars:
- unexpected error rate < 5 percent
- write p95 < 500ms
- read p95 < 250ms

Status:
- passed

Why:
- all baseline write lanes are under 239ms p95
- paginated reads are at 145ms p95
- burst lane is at 269ms p95 with zero unexpected errors
- soak lane is at 198ms p95 with zero unexpected errors

## Remaining boundary

What this benchmark does not claim:
- strict session-wide anti-rotation abuse control
- CRDT merge semantics
- multi-hour or 24-hour soak

Those are post-beta concerns, not blockers for the current 100-user notebook beta.
