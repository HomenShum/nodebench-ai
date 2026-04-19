# Async Reliability

Use this rule any time a change affects long-running or background agent runs,
retry behavior, failure handling, or multi-stage pipelines.

## Mandate

**Every long-running agent run must be idempotent, bounded, honestly-failing,
and user-visible.** Users choose live-stream or background mode; reliability
guarantees are the same either way.

## Prior art

- Uma/Danny gRPC async-report mock interview — the canonical pattern (202 + runId, off-thread processing, retry mechanisms)
- OWASP LLM Top 10 — async failure modes for agent systems
- Existing `.claude/rules/agentic_reliability.md` — the 8-point checklist this rule extends

## The two modes

| Mode | UX | Technical shape |
|---|---|---|
| **Live** (default) | Streaming scratchpad + visible trace, user waits | UI subscribes to scratchpad + trace events |
| **Background** (opt-in) | Fire-and-forget, 202 + runId < 500 ms, notification on complete | Server owns lifecycle; UI re-attaches by runId |

Both use the same pipeline. Only the UI subscription model differs.

## Required reliability layers

### 1. Idempotency
```
idempotencyKey = sha256(entitySlug + ingestHash + userId)
```
Duplicate enqueues are rejected with the existing runId returned. Never double-process.

### 2. Retry with exponential backoff + jitter (transient failures)
```
Attempt 1 → immediate
Attempt 2 → 2s + jitter
Attempt 3 → 6s + jitter
Attempt 4 → 18s + jitter
Max 3 retries per sub-agent.
```
Apply to: 5xx, network timeout, rate-limit (429).

### 3. Scheduled long-horizon retry (data-availability failures)
```
USPTO returned nothing today → +12h, +24h, +48h retry cadence
```
Stored in Convex `scheduledRuns` table. Canceled if entity deleted.

### 4. Dead Letter Queue (permanent failures)
```
After N retries or unrecoverable error:
  → deadLetterQueue table
  → grouped by fingerprint (so 100 instances of same bug appear once)
  → visible at /admin/dlq
```

### 5. Metrics + alerting
- Block-level failure > 20% in 1h → page dev
- Source-level failure > 50% in 15m → mark authority unhealthy
- Global failure > 5% in 1h → system alert

### 6. Graceful failure UX — ALWAYS visible to user
```
Background run: Acme AI — Partial success
  ✓ founder, product, funding completed
  ✗ patent: USPTO rate-limited after 3 retries (scheduled retry 2026-04-20 05:00 UTC)
  ✗ hiring: careers page 404 (flagged for manual source update)
```

## Invariants

1. **202 fast path** — background submit returns `202 + runId` in <500 ms always.
2. **No silent 2xx on failure** — `HONEST_STATUS` rule applies.
3. **Partial success is first-class** — 5/7 blocks succeeded → ship the 5, surface the 2.
4. **User always sees which block failed and why** — no hidden failures.
5. **DLQ entries grouped by fingerprint** — same bug doesn't flood triage.
6. **Idempotency is deterministic** — same key always collides with same prior run.

## Data risks of background processing (and mitigations)

| Risk | Mitigation |
|---|---|
| Race conditions on entity state | Version-lock scratchpad ↔ entity (drift detection) |
| Duplicate processing | Idempotency key rejects duplicates |
| Orphaned streaming state | Janitor cron sweeps `status: streaming` older than 1h |
| Drift vs entity truth | Compaction re-runs against current entity on drift |

## Anti-patterns

- `200 OK` returned on a failure path
- Retry loops without idempotency (double-charges, double-writes)
- DLQ as a single bucket without fingerprint grouping (floods triage)
- Background run without a runId returned to the client
- Silent auto-retry on permanent failures (poisons DLQ)
- Exponential backoff without jitter (thundering herd)

## Related

- [agentic_reliability.md](agentic_reliability.md) — 8-point checklist (BOUND, HONEST_STATUS, TIMEOUT, …) — this rule is a specialization
- [orchestrator_workers.md](orchestrator_workers.md) — retry + DLQ apply per sub-agent
- [scratchpad_first.md](scratchpad_first.md) — version-lock + drift detection
- [scenario_testing.md](scenario_testing.md) — adversarial retry-storm tests required

## Canonical reference

`docs/archive/2026-q1/architecture-superseded/BACKGROUND_MODE_AND_RELIABILITY.md` (earlier draft)

When the canonical v2 doc is written at `docs/architecture/ASYNC_RELIABILITY.md`,
update this pointer.
