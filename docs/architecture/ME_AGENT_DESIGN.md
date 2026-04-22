# Me Agent Design — Background Maintainer

> Status: draft v1, 2026-04-22
> Owner: hshum
> Companion to: [ME_PAGE_WIKI_SPEC.md](ME_PAGE_WIKI_SPEC.md)
> Thesis: **The agent runs behind the Me UI, not in front of it.** Me stays a read-first lens. All AI work happens at write-time (on ingest) and at user-triggered regeneration — never at query-time.

---

## 1. Why background, not foreground

From the Karpathy / Nate Jones framing:

- **AI as maintainer, not oracle.** The oracle model burns tokens on every query and forgets afterwards. The maintainer model processes new information as it arrives, writes it into a persistent artifact, and makes subsequent queries cheap.
- **Write-time synthesis, query-time retrieval.** Hard thinking happens once, at ingest. Queries retrieve pre-compiled understanding.
- **Preserve the raw.** The wiki is derivative. If editorial drift appears, fix the source and regenerate — never patch the wiki in place.
- **Multi-agent safe.** A markdown directory with N agents writing concurrently is a corruption factory. Our background maintainer uses per-target idempotency + singleflight + a durable job queue.
- **Operational speed mismatch.** Live chat, ticket updates, and deal flow move faster than a wiki can re-synthesize. The wiki layer sits on top of the structured database (productReports, productClaims, canonicalSources); it is not in the hot path.

### Consequences for Me

- Me does not host a persistent chat panel. Open-ended Q→A goes back to Chat, which already owns the streaming runtime.
- Every AI touch in Me is either a **named specialist action** (user-triggered verb) or an **ambient maintainer job** (background cron / trigger). Neither is a conversation.
- Reads on Me are pure Convex queries. No synchronous agent calls.

---

## 2. The four-stage pipeline

```
                         ┌─────────────────────────────┐
                         │  1. INGEST                   │
                         │                              │
  productReports insert  │  a hook fires:               │
  canonicalSources write │  "signal X touched entity Y" │
  extractedSignals write │                              │
  pulse material change  └──────────────┬───────────────┘
  file uploaded                         │
  manual regenerate                     ▼
                         ┌─────────────────────────────┐
                         │  2. ROUTE                    │
                         │                              │
                         │  identify affected wiki      │
                         │  pages; compute idempotency  │
                         │  key = cyrb53(owner + slug + │
                         │    pageType + signal +       │
                         │    triggerRef +              │
                         │    debounceBucket)           │
                         │                              │
                         │  if identical job is queued  │
                         │  or running → coalesce       │
                         │  (SINGLEFLIGHT)              │
                         └──────────────┬───────────────┘
                                        │
                                        ▼
                         ┌─────────────────────────────┐
                         │  3. COMPILE (background)     │
                         │                              │
                         │  scheduler wakes job         │
                         │  → buildMeContextForAgent    │
                         │  → modelRouter.invoke        │
                         │      (tier=standard,         │
                         │       category=synthesis)   │
                         │  → answer-control pipeline:  │
                         │      claim extraction        │
                         │      grounding filter        │
                         │      decideArtifactState     │
                         │      lowConfidenceGuard      │
                         │  → sourceSnapshotHash        │
                         │    (DETERMINISTIC replay)    │
                         └──────────────┬───────────────┘
                                        │
                                        ▼
                         ┌─────────────────────────────┐
                         │  4. SURFACE                  │
                         │                              │
                         │  append userWikiRevisions    │
                         │  row (history preserved)     │
                         │  update userWikiPages if     │
                         │    approved + answer-control │
                         │    passed                    │
                         │  emit Inbox item only if     │
                         │    isMaterialChange(...)     │
                         └─────────────────────────────┘
```

All four stages are backend-only. The UI simply reads `userWikiPages` and `userWikiRevisions` via Convex live queries.

---

## 3. Invariants (what must always hold)

| # | Invariant | Enforced at |
|---|---|---|
| 1 | AI never writes to `userWikiNotes` (Zone 3) | Convex mutations — no server-side path exists for AI-origin writes to that table |
| 2 | `userWikiPages.revision` advances only when answer-control passes | `completeRegenJob` mutation gates the `revision` promotion on `approvedByUser` |
| 3 | Raw sources (`canonicalSources`, `productReports`, `productClaims`) are never mutated by the maintainer | Maintainer only reads from those tables; writes only to `userWiki*` |
| 4 | Concurrent triggers for the same `(owner, slug, pageType, signal, bucket)` collapse onto one job | `computeIdempotencyKey` + `by_idempotency` index |
| 5 | Same input set produces same revision (DETERMINISTIC) | `sourceSnapshotHash` over sorted ids + model + prompt version; no-op if hash unchanged |
| 6 | Failed jobs never announce success (HONEST_STATUS) | `failJob` mutation surfaces `lastError`; 3 strikes → `dead_letter` status |
| 7 | Every regen carries a trace — which model, which inputs, which gates passed | `userWikiRevisions` row captures all of this |
| 8 | User can always return to raw source | Evidence zone on every wiki page links back to the productReports / canonicalSources that fed the revision |
| 9 | Editorial drift is fixable by fixing source + regenerating, never by in-place edit | Revisions are append-only; regeneration consumes the CURRENT source state, not a prior revision |
| 10 | USL (user notes, private files) never enters CSL/ESL | `buildMeContextForAgent` flags any value pulled from private tables; pre-write scanner (`detectUserContent` from sharedCache) rejects on leak |

---

## 4. Signal taxonomy

Seven trigger signals, each emitting at a well-defined boundary:

| Signal | Emitted by | Debounce behavior |
|---|---|---|
| `report_saved` | `productReports` insert (chat.ts completeSession) | 5-minute bucket; if user saves two Stripe reports in 3 minutes, one job fires |
| `canonical_source_added` | `canonicalSources` insert (CSL write path) | Same bucket, keyed by entity slug derived from URL heuristics |
| `extracted_signal_added` | `extractedSignals` insert | Keyed by entity slug of the signal |
| `pulse_material_change` | `productNudges` insert for watched entity | Keyed by watched-entity slug |
| `file_uploaded` | `files` insert + entity-tagged | Keyed by inferred entity (via file metadata) |
| `manual_regenerate` | User taps "Regenerate" on a wiki page | Immediate scheduling (bypass 5-min debounce) |
| `scheduled_refresh` | Daily cron for pages crossing `stale` threshold | Already time-bucketed by cron cadence |

The first five are write-time signals — they fire exactly when new information arrives. The sixth is user-driven. The seventh is staleness-driven.

---

## 5. Why this survives multi-agent / concurrency hazards

The Karpathy-wiki-in-a-markdown-folder model breaks when N agents write simultaneously. Our design avoids that in four ways:

1. **Single writer per job.** Each `userWikiMaintainerJobs` row is claimed exactly once via the `queued → running` transition (`markJobRunning` throws if the job is not queued). A racing worker gets the error, exits cleanly, and the leader processes.
2. **Idempotency coalescing.** 100 triggers within the same 5-minute bucket collapse onto one queued job. The 99 duplicates become `{ action: "coalesced" }` — no extra work, no extra tokens.
3. **Convex transactional DB.** `userWikiPages` + `userWikiRevisions` writes are ACID. No torn reads. No lost writes.
4. **Deterministic snapshot hash.** Even if two jobs somehow run against identical input sets, the second one will observe the prior revision's `sourceSnapshotHash` match and skip-append (no duplicate revision row, no duplicate inbox noise).

This is the structural-database answer to "wiki breaks under multi-agent concurrency" — the wiki layer is generated from a transactional substrate, so concurrency safety is inherited.

---

## 6. Why editorial drift is bounded

1. **Revisions are append-only.** You can read any past revision to see exactly what the maintainer said at that time, along with the model + input hash + gates.
2. **Every specific claim is cited to a `productClaims` id.** If a claim is later marked `contradicted` in the source, the next regen's `countContradictions()` reflects it — and `isMaterialChange()` fires an Inbox item when the contradiction count rises.
3. **Regeneration is cheap and frequent.** Because the scheduler + singleflight pattern collapses duplicate triggers, we can afford to regenerate aggressively on every material signal rather than "once at ingest and hope."
4. **Source fixups propagate.** If an evidence item is re-classified (e.g. `productClaims.status: accepted → contradicted`), the next regen picks that up. The wiki stays aligned with the database by design.
5. **The compile pass is gated by answer-control.** Unsupported claims force `draft_only` state; hallucination-gate failure blocks the revision from promotion entirely. The editorial trap is a gate failure, not an accumulating bug.

---

## 7. Fast / slow / pulse mapping

| Profile | Who triggers | Runtime path | Budget |
|---|---|---|---|
| Fast (manual regen from Me UI) | User tap | `requestManualRegenerate` → scheduler → `processRegenJob` (standard-tier model) | 60s wall-clock ceiling; most runs ~5–15s; cache-warm runs much faster |
| Slow (deep-sim-style) | Not applicable to the wiki directly — deep research goes through Chat → creates productReports → `report_saved` signal flows into the wiki via Stage 1 | — | — |
| Pulse (scheduled) | Daily cron + material-change detection | `pulse_material_change` signal → scheduler → `processRegenJob` (standard-tier) with lower per-job priority | Each pulse regen capped at 60s; per-owner rolling-hour cap of 60 regens |

Gemini Deep Research (when it ships as a slow-worker adapter) writes productReports the same way a NodeBench slow run does. The wiki maintainer treats Gemini-DR-saved reports identically to native slow-run saves — one signal, one regen.

---

## 8. What the user sees

- **No chat drawer on Me.** If the user has an open-ended question, a "Continue in Chat with this context" button transfers the current Me-scope context into a Chat thread and the existing streaming runtime takes over.
- **One-tap regenerate.** Every wiki page has a `Regenerate` button. Tap → status spinner → new revision lands via Convex live query → UI updates. Typical 5–15s.
- **Pending-revision banner.** If approval mode is on, new revisions land in draft state. A banner appears with a diff view. Accept → `userWikiPages.revision` advances.
- **Inbox material-change items.** When overnight regens surface new contradictions or materially new summaries, an Inbox item appears: "8 pages refreshed • 1 contradiction flagged • 2 need review."

---

## 9. What the user *does not* see (and should not need to)

- The job queue
- The scheduler cron
- The idempotency hashing
- Revision counts
- Per-source answer-control gate states (visible on the wiki page via provenance popover, but collapsed by default)

These are inspectable — in a settings → privacy/audit panel — but not front-and-center. The principle: the maintainer works behind the UI; the UI shows polished, trust-signaled output.

---

## 10. What ships in Phase 1

Implemented as of this commit:

- `convex/domains/product/userWikiSchema.ts` — tables `userWikiPages`, `userWikiRevisions`, `userWikiMaintainerJobs`
- `convex/domains/product/userWikiMaintainer.ts` — pure helpers (idempotency key, source-snapshot hash, slug normalization, freshness tiering, material-change detection) + queries (`listPagesForOwner`, `getPageBySlug`, `listContradictingPages`, `listPendingJobs`) + internal mutations (`enqueueRegenFromSignal`, `markJobRunning`, `completeRegenJob`, `failJob`) + public mutation (`requestManualRegenerate`) + internal action stub (`processRegenJob` — writes placeholder until Phase 2 wires modelRouter)
- `convex/domains/product/userWikiMaintainer.test.ts` — 29 unit tests covering the pure-helper surface (determinism, collision resistance, slug safety, freshness tiering, debounce buckets, material-change detection, constants)

Deferred to Phase 2:

- Full `processRegenJob` wiring through `modelRouter` + answer-control pipeline (currently a stub that records the placeholder and transitions job to dead_letter)
- Ingest hooks on `productReports`, `canonicalSources`, `extractedSignals`, `pulse`, `files`
- Scheduler cron for daily `scheduled_refresh`
- UI components under `src/features/me/components/wiki/`

Deferred to later phases per the wiki spec §12:
- User notes (Zone 3)
- Edges / graph navigation
- Cross-link views

---

## 11. Rule compliance

| Rule | How this design honors it |
|---|---|
| `agentic_reliability.BOUND` | Max 50 retained revisions per page; max 12 sources per ESL signal; max 1 MB CSL body; bounded job queue |
| `agentic_reliability.HONEST_STATUS` | `failJob` surfaces real errors; dead-letter after 3 attempts; no fake 2xx on failed regen |
| `agentic_reliability.DETERMINISTIC` | `computeIdempotencyKey` + `computeSourceSnapshotHash` use sorted-key serialization; same inputs → same hash |
| `agentic_reliability.TIMEOUT` | 60s wall-clock ceiling per regen; scheduler-level per-owner rate-limit |
| `scenario_testing` | Unit tests exercise determinism, coalescing, freshness tiers, material-change detection at the level the UI will observe |
| `scratchpad_first` | Revisions are structured output from a compile pass over source material — same pattern as the diligence pipeline |
| `grounded_eval` | Answer-control layer enforces claim-grounding before a revision can promote |
| `live_dom_verification` | Regeneration outcomes visible via Convex live queries; no "deployed but not showing" class of bug |
| `analyst_diagnostic` | Root cause of drift is source drift; fix source + regenerate; never patch the wiki in place |

---

## 12. The shortest possible framing

**Me is where your past work crystallizes into personal knowledge. The agent is the maintainer, not the author — it regenerates summaries, extracts structure, flags drift, and announces change, but it never authors your private thoughts and never becomes a chat window.** Queries retrieve pre-compiled understanding. Editorial drift is bounded by append-only revisions + source-linked claims + answer-control gates. Multi-agent safety is inherited from the Convex transactional substrate. The wiki never replaces the database; it lives on top of it as a generated lens.
