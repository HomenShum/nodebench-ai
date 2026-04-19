# Notebook Production Readiness Checklist

Date: 2026-04-18

Scope:
- Live notebook block editing
- Notebook provenance and report sync
- Tiptap + Convex ProseMirror sync for editable text blocks
- Shared-session collaboration on a single entity/workspace identity
- Link-based workspace sharing with distinct view/edit permissions
- Authenticated workspace membership and invitation flows
- Direct invite email delivery with secure-link fallback
- Convex production deployment `https://agile-caribou-964.convex.cloud`

Decision:
- Open phase 1 beta: 15 testers for 14 days
- Expand to 50 only if phase 1 exits without unresolved P0/P1 data-loss or access bugs
- Expand to 100 only if phase 2 stays clean

Why:
- The live notebook is now on maintained Convex sync plumbing instead of a homegrown merge path.
- Shared-session append is stable.
- The core collaboration path is green under a real 10-collaborator browser scenario.
- Conflict handling is explicit, retryable, and measured.
- Actor-pressure on the append path now surfaces as `RATE_LIMITED` instead of a raw failure.
- Zero-ramp spike and 10-minute soak lanes are both green.
- Staged rollout by cohort exists in the frontend, not just a global kill switch.
- Named invites now attempt real email delivery and fall back to a secure copyable link only when email is unavailable.
- The notebook now shows collaborator-aware status instead of a bare count: active editor identity plus last human edit.

Measured load results:

| Scenario | ok / total | p50 | p95 | p99 | Notes |
|---|---:|---:|---:|---:|---|
| `concurrent_insert` | 2903 / 2903 | 165ms | 232ms | 343ms | 10 clients x 60s, 0 errors |
| `sustained_append` | 500 / 500 | 175ms | 239ms | 323ms | 500 appended blocks, 0 errors |
| `paginated_read` | 21 / 21 | 136ms | 145ms | 149ms | 21 pages, flat p95 |
| `multi_tab_edit` | 899 / 899 | 156ms | 216ms | 288ms | 10 clients x 500ms cadence x 60s |
| `multi_tab_conflict` | 153 / 360 accepted | 154ms | 204ms | 216ms | 207 expected `REVISION_MISMATCH` rejects |
| `shared_session_insert` | 1573 / 1573 | 158ms | 207ms | 318ms | 10 shared-session clients x 30s, 0 errors |
| `actor_rate_limit_guard` | 242 / 435 accepted | 314ms | 1223ms | 1495ms | 193 expected `RATE_LIMITED` contention rejects under same-actor storm |
| `spike_insert` | 2079 / 2079 | 180ms | 269ms | 352ms | 100 clients x 5s zero-ramp burst, 0 errors |
| `soak_mixed` | 9586 / 9586 | 155ms | 198ms | 260ms | 5 shared-session clients x 600s mixed append/update/read, 0 errors |

Supporting verification:
- `npx tsc --noEmit`
- `npx convex dev --once --typecheck=enable`
- `npm run build`
- `npm run deploy:convex`
- `vercel --prod --yes`
- `npx vitest run convex/domains/product/blockProsemirror.test.ts src/features/entities/components/notebook/notebookOfflineQueue.test.ts src/features/entities/components/notebook/EntityNotebookLive.test.tsx src/features/entities/views/EntityPage.test.tsx`
- `npx playwright test tests/e2e/entity-notebook-regression.spec.ts --project=chromium`
- `npx playwright test tests/e2e/entity-share-permissions.spec.ts --project=chromium`
- `npx playwright test tests/e2e/entity-member-invite.spec.ts --project=chromium`
- `npx playwright test tests/e2e/product-shell-smoke.spec.ts --project=chromium`
- `node scripts/loadtest/notebook-load.mjs --entity softbank --scenario all --clients 10 --duration 60 --jsonOut .tmp/notebook-load-summary.json`
- `node scripts/loadtest/notebook-load.mjs --entity softbank --scenario actor_rate_limit_guard --clients 20 --duration 15 --jsonOut .tmp/notebook-load-actor-guard.json`
- `node scripts/loadtest/notebook-load.mjs --entity softbank --scenario spike_insert --clients 100 --duration 5 --jsonOut .tmp/notebook-load-spike.json`
- `node scripts/loadtest/notebook-load.mjs --entity softbank --scenario soak_mixed --clients 5 --duration 600 --jsonOut .tmp/notebook-load-soak.json`
- Local browser sanity with seeded workspace session:
  - `/?surface=home`
  - `/?surface=reports`
  - `/entity/softbank`
- Production browser sanity:
  - `https://www.nodebenchai.com/?surface=home`
  - `https://www.nodebenchai.com/?surface=reports`
  - `https://www.nodebenchai.com/entity/softbank`
- Playwright people test:
  - 10 shared collaborators on the same notebook
  - first 5 edit different sections
  - last 5 all edit the same section
  - persisted markers survive reload
- Playwright share test:
  - owner creates view/edit links
  - view link is read-only and revocation invalidates the URL
  - edit link can update the live notebook from another session
- Playwright member/invite test:
  - owner signs up from an anonymous seeded workspace
  - owner invites a named collaborator by email
  - collaborator signs up, accepts the invite, lands on a member-scoped workspace URL, and edits the live notebook
  - member link hides owner-only share controls and persisted edits survive reload

Legend:
- `verified` = directly proven in code, tests, load runs, or browser verification
- `partial` = intentionally limited for beta, but explicit and understood
- `post-beta` = not a beta blocker, revisit if the surface expands

## 1. Correctness

| Status | Check | Evidence |
|---|---|---|
| verified | Type safety clean | `npx tsc --noEmit` passes |
| verified | Build clean | `npm run build` passes |
| verified | Production deploy completed | Vercel production deploy succeeded and aliased to `https://www.nodebenchai.com` |
| verified | Contract path works end to end | Playwright verifies `chat -> auto-save -> entity -> notebook -> live -> reload` |
| verified | ProseMirror bridge round-trip covered | `blockProsemirror.test.ts` covers sync id parsing plus chip <-> ProseMirror snapshot bridge |
| verified | Live notebook error parsing handles rate-limit fallback cleanly | `EntityNotebookLive.test.tsx` covers write-window OCC mapping to `RATE_LIMITED` |
| verified | Browser sanity on the main notebook surfaces | local browser pass on `home`, `reports`, and `/entity/softbank` with `Live` visible and no console errors |
| verified | Classic entity notes remain the primary reading width on desktop | Playwright `product-shell-smoke` asserts the notes column stays wider than the workspace rail |

## 2. Concurrency and consistency

| Status | Check | Evidence |
|---|---|---|
| verified | Deterministic ordering under concurrent insert | `comparePositionsWithId` plus `2903/2903` clean concurrent inserts |
| verified | Shared-session append works | `shared_session_insert` `1573/1573`, 0 errors |
| verified | OT-backed live collaboration path works | editable notebook blocks now run through Tiptap + `@convex-dev/prosemirror-sync` |
| verified | 10 shared collaborators mixed different-section and same-section edits persist | Playwright `10 shared collaborators can edit mixed sections and the same section without losing persisted content` |
| verified | Explicit conflict detection still exists on mutation-backed notebook paths | `expectedRevision` in `updateBlock`, `REVISION_MISMATCH` surfaced |
| verified | Conflict recovery behavior measured on revision-guarded paths | `multi_tab_conflict` shows expected rejects, no silent corruption path |
| verified | Presence session isolation no longer collapses all tabs into one session token | `EntityNotebookLive.tsx` now uses a per-tab `presenceClientSessionIdRef` |
| verified | Canonical source contract is explicit | `productReports` is canonical for saved brief surfaces; `productBlocks` is canonical for live notebook editing/backlinks/revisions; newer user notebook edits are never silently overwritten by a report refresh |
| partial | Same-actor pressure handling | current beta contract is actor-scoped pacing plus `RATE_LIMITED` contention fallback on the append hot path |
| verified | Link-based workspace sharing works across distinct sessions | Playwright proves owner-created view/edit links, read-only enforcement, revocation invalidation, and cross-session note/notebook persistence through the shared URL |
| verified | Team identity and invitation model | Playwright proves owner signup, named email invite, collaborator signup, invite acceptance, member-scoped edit access, and persisted live notebook edits on the resulting member URL |
| verified | Invite delivery is explicit and visible | named invites try email first, persist delivery status, and fall back to secure link copy only when email delivery is unavailable |
| partial | Rich multi-user awareness | collaborator-aware status now shows active editor identity and latest human edit, but there is still no live cursor model or shared selection awareness inside the notebook body |

## 3. Scale

| Status | Check | Evidence |
|---|---|---|
| verified | Write p95 under 500ms in baseline suite | main write scenarios are `204ms` to `239ms` p95 |
| verified | Read p95 under 250ms | paginated read p95 `145ms` |
| verified | Pagination stays bounded | `usePaginatedQuery` + `listEntityBlocksPaginated`, flat p95 on page reads |
| verified | Zero-ramp spike survives | `spike_insert` at 100 clients has p95 `269ms`, 0 errors |
| verified | Longer soak survives | `soak_mixed` 10-minute lane has p95 `198ms`, 0 errors |
| partial | Same-actor abusive storm | intentionally degrades into `RATE_LIMITED` with p95 `1223ms` under the synthetic 20-client same-actor guard |
| post-beta | Multi-hour or 24h soak | not needed for the current beta gate, revisit before broader rollout |

## 4. Reliability

| Status | Check | Evidence |
|---|---|---|
| verified | Structured error codes instead of opaque failure | `REVISION_MISMATCH`, `CONTENT_TOO_LARGE`, `RATE_LIMITED`, etc. |
| verified | Client retry on transient save failures | debounced save retry logic in `EntityNotebookLive.tsx` |
| verified | Kill switch exists | env flag + localStorage disable path |
| verified | Staged rollout exists | `VITE_NOTEBOOK_LIVE_ROLLOUT_PERCENT` with deterministic session/entity cohorting |
| verified | Force-enable path exists for support/debug | `nodebench.liveNotebookForceEnabled=1` local override |
| verified | Editor no longer tears itself down under collaboration bursts | `NotebookBlockEditor.tsx` stabilizes callback refs and narrows `useEditor` deps so sync teardown churn does not crash the notebook |
| partial | Append hot-path abuse control | durable actor-scoped pacing is in place; same-actor contention is surfaced as `RATE_LIMITED` rather than a raw crash |
| post-beta | Backend circuit breaker | not required for the current beta gate |

## 5. Observability

| Status | Check | Evidence |
|---|---|---|
| verified | Request ID surfaced to the user | notebook errors include request ref |
| verified | Runbook exists | `docs/architecture/NOTEBOOK_RUNBOOK.md` |
| verified | Real-time alerting path exists | ntfy-based client/load-test alert path documented and implemented |
| verified | Benchmarks are persisted in-repo | `docs/architecture/benchmarks/notebook-load-latest.md` |
| verified | Ambient collaboration state is visible in-product | `BlockStatusBar` shows active collaborator identity, latest human edit, sync freshness, offline queue size, rate-limit hint, and read-only state |
| partial | Continuous dashboards | current source of truth is benchmark artifacts plus ntfy alerting, not a live SLO dashboard |
| post-beta | Full trace propagation across every layer | request refs exist, but not a full distributed trace stack |

## 6. Security and abuse control

| Status | Check | Evidence |
|---|---|---|
| verified | Owner-key scoping on block mutations | `requireProductIdentity` enforcement |
| verified | Content size bound on blocks | `MAX_BLOCK_CONTENT_BYTES = 50_000` |
| verified | Actor-pressure guard exists on append | same-actor storm returns `RATE_LIMITED` in the guard lane |
| partial | Session-wide anti-rotation abuse control | current beta guard is actor-scoped to preserve collaboration correctness |
| post-beta | Full hostile-traffic review | revisit if the notebook becomes externally exposed beyond the current beta |

## 7. Data integrity

| Status | Check | Evidence |
|---|---|---|
| verified | Soft-delete filtering in reads | pagination/query path excludes deleted rows |
| verified | Revision numbers increment on successful writes | mutation contract verified |
| verified | Deploy-forward schema path verified | Convex deploy succeeded on current schema |
| verified | ProseMirror snapshots mirror back into notebook block chips | `blockProsemirror.ts` `onSnapshot` mirrors synced text into `productBlocks.content` |
| verified | Saved brief and live notebook responsibilities are documented | see Section 2 canonical source contract and the runbook |
| post-beta | Backup and restore drill | not required to open the current beta, but should be rehearsed before wider rollout |
| post-beta | Migration rollback drill | forward-fix remains the current Convex posture |

## 8. Failure modes

| Status | Check | Evidence |
|---|---|---|
| verified | User-visible explanation for expected conflicts | conflict toast/message path exists |
| verified | User-visible explanation for oversized content | content-too-large path exists |
| verified | User-visible explanation for rate-limited actor storms | write-window contention is parsed as `RATE_LIMITED` in the client |
| verified | User-visible disable path when Live is unavailable | Live button gating and fallback behavior exist |
| verified | Offline edit queue | queue helper plus `submitOfflineSnapshot` replay path are wired and covered by browser E2E with reconnect plus tab reopen |
| partial | Oversize/tombstone recovery UX | `OversizeBlockModal` and `TombstoneModal` primitives exist, but they are not yet the primary user path on every relevant failure |
| post-beta | Full offline session replay proof | add dedicated browser coverage for long offline edit sessions and tab-close recovery |

## 9. Deploy and rollback

| Status | Check | Evidence |
|---|---|---|
| verified | Forward deploy verified | `npm run deploy:convex` and `vercel --prod --yes` both succeeded |
| verified | Frontend kill switch available | env/localStorage paths |
| verified | Cohort rollout knob exists | `VITE_NOTEBOOK_LIVE_ROLLOUT_PERCENT` |
| verified | Operational rollback clarity | runbook documents frontend disable, rollout reduction, and forward-fix guidance |
| post-beta | Full rollback rehearsal | not a blocker for the current beta gate |

## 10. NodeBench-specific agentic concerns

| Status | Check | Evidence |
|---|---|---|
| verified | Bounded reads | pagination limit and content-size bound |
| verified | Deterministic ordering | block id tiebreaker |
| verified | Honest status surfaces | structured error codes + request refs |
| verified | Notebook provenance survives report path | entity notebook and live notebook verified after auto-save |
| verified | Agent write pacing is explicit | actor-pressure guard lane exists and is measured |
| post-beta | Per-mutation quality scoring | not needed for the current notebook beta |

## 11. Human factors and operations

| Status | Check | Evidence |
|---|---|---|
| verified | Changelog exists | `docs/architecture/NOTEBOOK_HARDENING_CHANGELOG.md` |
| verified | Runbook exists | `docs/architecture/NOTEBOOK_RUNBOOK.md` |
| verified | Incident ownership and escalation are written down | see runbook section `Ownership and escalation` |
| verified | Error messages are actionable | specific codes and user-facing guidance |
| partial | Formal on-call drill | runbook is ready, but there is no larger team rotation to rehearse |

## Honest verdict

Current gate:
- Load-proven for roughly 100 active users on this notebook surface
- Rollout-proven for phase 1 beta: 15 testers for 14 days

What is now closed for beta:
- shared-session collaboration correctness
- link-based product sharing and permissions
- authenticated workspace membership and invitation flows
- real invite email delivery with secure-link fallback
- teachable `People` empty state for first invite
- collaborator-aware live notebook status
- 10-collaborator browser verification on mixed-section and same-section edits
- Tiptap + Convex ProseMirror sync on editable blocks
- staged rollout by cohort
- append hot-path actor-pressure handling
- zero-ramp spike coverage
- longer soak coverage
- canonical source contract
- runbook ownership/escalation guidance

Post-beta items, not blockers for the current gate:
1. move strict session-wide anti-rotation enforcement behind a non-transactional gateway if we need stronger abuse control than the current actor-scoped beta guard
2. add a true live SLO dashboard if the notebook expands beyond the current owner/operator beta
3. add richer org/team constructs if the product moves beyond named email members and secure links into directory-backed groups, SSO, or workspace-level policy administration
4. add live cursor and shared-selection awareness if testers prove that active-editor identity plus last-edit signal is not enough
