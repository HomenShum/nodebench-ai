# Background Mode + Async Reliability — Architecture Addendum

Extends `AGENT_PIPELINE.md`, `SCRATCHPAD_PATTERN.md`, and
`JIT_RETRIEVAL_LAYERED_MEMORY.md`. Adds two things: (1) a user-selectable
"background mode" for runs that don't need live streaming, and (2) the
async-reliability layer (retries, DLQ, metrics, graceful failure) that any
long-horizon agent system needs.

Incorporates lessons from the Uma/Danny gRPC async-report mock interview:
sync report generation blocks the client; correct architecture returns `202
Accepted` immediately, processes off-thread, handles failure explicitly.

## 1. Two-mode UX — Live vs Background

### Live mode (default)
Streaming scratchpad, visible trace, chatty back-and-forth. User waits.
Good for: single-entity exploration, short investigations, demo moments.

### Background mode (opt-in per run)
User submits ingest + picks "Run in background." Client gets `202 Accepted +
runId` in <500ms. User can close tab. System processes. Notification on
completion (in-app chip + optional email).
Good for: deep-diligence on multiple entities, overnight runs, batch work,
mobile use, focus protection.

### UX details
- Default = live. Background is a checkbox on the composer: `Run in background`
- Once started in background, the run shows in a top-bar `Running: 2 in
  background` chip across every surface
- Clicking the chip opens a slim drawer with progress per run + cancel
- Completed runs post a Session Artifacts review **at user's convenience** —
  they decide when to triage, not on page load
- User can switch any live run to background mid-stream via a `Send to
  background` button in the trace block

### Technical shape
Same pipeline primitive. Same scratchpad layer. The only difference is UI
subscription model:
- Live: UI subscribes to scratchpad + trace events; tab open required
- Background: server owns the lifecycle; UI can re-attach any time by runId

## 2. Credibility-first default (flip the configuration flow)

**Current redesign problem:** `ENTITY.md` with allowlists and DO-NOT-TRUST
lists requires the user to configure *before* they've seen value. A
non-technical first-time user hitting allow/deny prompts is the worst UX.

**ChatGPT pattern to copy:** ship useful output by default, self-verify,
present data with evidence and reasoning chain, *then* offer customization.

### The flip

| Step | Before (broken) | After (correct) |
|---|---|---|
| 1 | New user must author ENTITY.md conventions upfront | User runs query — zero config |
| 2 | Allow/deny prompts per source | Baked-in default authority tiers per block (tier1 official, tier2 reputable press, tier3 community) |
| 3 | User sees sparse output, discouraged | User sees rich output with `[verified · from: Acme About page]` evidence chips on every fact |
| 4 | Configuration required to proceed | User reads, trusts, is satisfied |
| 5 | — | Footer prompt: *"Want to customize sources for future runs? Pin favorites or ban any."* Opt-in. |
| 6 | — | Power users who opt in can still author `ENTITY.md` — it becomes team-shared conventions, not mandatory setup |

### Default authority tiers (per block — shipped as defaults, editable later)

```
founder:       tier1 = company About + LinkedIn + SEC filings + YC/Crunchbase
               tier2 = TechCrunch + Bloomberg + Reuters + WSJ
               tier3 = forums (low weight, always requires corroboration)

product:       tier1 = company site + ProductHunt + App Store
               tier2 = tech press review sites
               tier3 = Reddit / HN mentions

funding:       tier1 = SEC EDGAR + company press release
               tier2 = Crunchbase + TechCrunch round coverage
               tier3 = forum speculation (rejected by default)

news:          tier1 = reputable-newsroom allowlist (editorial policy + corrections)
               tier2 = trade publications
               tier3 = aggregators (never quoted directly)

... etc per block
```

Every fact rendered in the report carries inline evidence chips that explain
the tier + source. Matches ChatGPT's "evidence and reason to back itself up"
feel.

### Post-satisfaction config prompt (one-time, dismissible)

After a user's first keep-session (they promoted at least one artifact):

```
You kept 4 artifacts from that run. Want to:
  [ + Pin a source ]    (e.g. "always trust Sequoia press releases")
  [ – Ban a source ]    (e.g. "never use Reddit for funding claims")
  [ Skip for now ]      (default — keeps the baked-in tiers)
```

Non-technical users can press Skip forever without losing quality.

## 3. Async reliability layer (the interview's retry patterns)

Maps directly to the four Q&A items from the Uma/Danny interview.

### Q1 — What risk does background processing create for data?

| Risk | NodeBench mitigation |
|---|---|
| Race conditions on entity state | Version-lock scratchpad ↔ entity (existing drift detection) |
| Duplicate processing | Idempotency key per run: `sha256(entitySlug + ingestHash + userId)` — rejects duplicate enqueues |
| Orphaned state | Scratchpad has `status: streaming | structuring | merged | drifted | failed`; janitor sweeps orphaned `streaming` runs older than 1hr |
| Drift vs entity truth | Compaction re-runs against current entity on drift |

### Q2 — Why avoid blind reliance on AI agents?

| Risk | Mitigation |
|---|---|
| Hallucination | `isGrounded()` filter (existing `grounded_eval.md`) |
| Fake confidence | `HONEST_SCORES` rule — no hardcoded floors |
| Un-auditable output | Agent trace block + contribution log + evidence chips on every fact |
| Silent failures | Bounds surfaced as explicit output; never hidden |
| User distrust | Credibility-first defaults + evidence + reason chain on every claim |

### Q3 — How to handle failures in background tasks?

Layered per the interview's four approaches:

#### a) Retry with exponential backoff + jitter (for transient failures)
```
Attempt 1 → fail
Attempt 2 → wait (2s + jitter)
Attempt 3 → wait (6s + jitter)
Attempt 4 → wait (18s + jitter)
Max 3 retries per sub-agent
```
Applies to: rate-limits, 5xx, network timeouts.

#### b) Automated long-horizon scheduling (for data-availability failures)
```
USPTO returned nothing today → schedule retry at +12h, +24h, +48h
Patent data publishes on a delay; not all failures are "now or never"
```
Stored in Convex `scheduledRuns` table. Canceled if entity deleted.

#### c) Dead Letter Queue (for non-retryable failures)
```
After N retries or permanent failure (4xx, schema mismatch, auth expired):
  → write to `deadLetterQueue` table
  → tagged with block + failure reason + fingerprint
  → visible on internal /admin/dlq route
  → grouped by fingerprint so 100 instances of the same bug appear once
```

#### d) Metrics + alerting
```
Every failure writes to `agentFailureMetrics` table.
Thresholds in `server/monitoring/alerts.ts`:
  - block-level: if one block fails >20% in 1h → page dev
  - source-level: if SEC EDGAR fails >50% in 15m → mark tier1 authority unhealthy
  - global: if >5% of all runs fail in 1h → system alert
Integrates with the existing `get_system_pulse` MCP tool.
```

#### e) Graceful failure UX
Never silent. User always sees:
```
Background run: Acme AI — Partial success
  ✓ founder, product, funding completed
  ✗ patent: USPTO rate-limited after 3 retries
     (scheduled retry at 2026-04-20 05:00 UTC)
  ✗ hiring: careers page returned 404
     (likely moved — flagged for manual source update)
```

### Q4 — Retry mechanism implementation specifics

Mapped to files:

| Mechanism | File | Notes |
|---|---|---|
| Exponential backoff retries | `server/pipeline/retry/exponentialBackoff.ts` | per-tool wrapper |
| Scheduled long-horizon retry | `convex/domains/product/scheduledRuns.ts` | cron-like |
| DLQ | `convex/domains/product/deadLetterQueue.ts` + `src/features/admin/views/DeadLetterQueueView.tsx` | /admin surface |
| Metrics | `convex/domains/product/agentFailureMetrics.ts` | thresholds |
| Alerts | `server/monitoring/alerts.ts` | email/Slack on threshold |
| User-visible failure UX | `src/features/chat/components/BackgroundRunStatus.tsx` | partial-success rendering |

All seven threats of the agentic_reliability 8-point checklist map onto these
files — `TIMEOUT` gates retries, `BOUND` caps DLQ size, `HONEST_STATUS`
forbids silent 2xx on failure, etc.

## 4. File additions to Phase 1

```
server/pipeline/mode.ts                                  NEW — live vs background selector
server/pipeline/retry/exponentialBackoff.ts              NEW
server/pipeline/retry/idempotencyKey.ts                  NEW
server/monitoring/alerts.ts                              NEW
convex/domains/product/scheduledRuns.ts                  NEW
convex/domains/product/deadLetterQueue.ts                NEW
convex/domains/product/agentFailureMetrics.ts            NEW
src/features/chat/components/BackgroundRunStatus.tsx     NEW
src/features/chat/components/BackgroundRunsChip.tsx      NEW — top-bar "Running: N" chip
src/features/admin/views/DeadLetterQueueView.tsx         NEW
src/features/entities/components/EvidenceChip.tsx        NEW — inline source+tier chip
src/features/me/components/SourceCustomization.tsx       NEW — post-satisfaction pin/ban UI
docs/architecture/BACKGROUND_MODE_AND_RELIABILITY.md     THIS FILE
.claude/rules/async_reliability.md                       NEW — retry + DLQ + metrics rules
```

## 5. Invariants (codify in `.claude/rules/async_reliability.md`)

1. **202 fast path**: background-mode submit returns `202 + runId` in <500ms always.
2. **Idempotency**: every run has a deterministic key; duplicates reject, don't duplicate.
3. **Max 3 retries** per sub-agent for transient failures; after that → DLQ or scheduled.
4. **No silent 2xx on failure** (`HONEST_STATUS`).
5. **Partial success is first-class**: if 5/7 blocks succeed, the report is still delivered with explicit gaps surfaced.
6. **User always sees which block failed and why** — no hidden failures.
7. **DLQ entries grouped by fingerprint** — same bug doesn't flood triage.
8. **Credibility-first UX**: no user-authored config is required before the first good report.
9. **Evidence chips are mandatory** on every rendered fact; no unchipped claims.
10. **ENTITY.md becomes opt-in power-user feature**, surfaced only after first satisfied session.

## 6. Answers to the four interview questions (condensed)

1. **Data risks of background processing** → race conditions, duplicate processing, orphans, drift. All addressed by version-locking + idempotency keys + janitor + drift detection.

2. **Why not blindly rely on AI agents** → hallucination, fake confidence, un-auditable output, silent failure, user distrust. Addressed by grounded filtering + honest scores + trace visibility + evidence chips + surfaced bounds.

3. **Handling failures** → exponential backoff retry, scheduled long-horizon retry, DLQ, metrics, alerting, graceful failure UX. Each mapped to a specific file in this addendum.

4. **Retry mechanism implementation** → four layers: (a) in-request exponential backoff with jitter for transient, (b) scheduled retries for data-availability failures, (c) DLQ for permanent failures, (d) metrics → alerts → triage. See file mapping table.

## 7. Comparison to the interview's architectural takeaways

| Interview gate | How NodeBench satisfies |
|---|---|
| Gate 1: async pattern | Two-mode UX with background submit returning 202 immediately |
| Gate 2: "in progress" response vs block | BackgroundRunsChip + StatusDrawer + re-attach by runId |
| Gate 3: scaling (threads → distributed) | Convex scheduled functions + DLQ + metrics; horizontal scale via queue workers |
| Mindset: verify AI, communicate, architect | Trace block + contribution log + auto-feedback + evidence chips — every part of the stack is inspectable |
