# Notebook Hardening Changelog

Every notebook change is recorded here so Homen can learn the codebase as I work. Four columns, one row per change.

| # | User-facing scenario | File paths touched | Exact code changes | Why each change mattered |
|---|---|---|---|---|
| 1 | **Two users (or two browser tabs) press Enter at the same position simultaneously.** Each calls `insertBlockBetween` with the same `beforeBlockId` and `afterBlockId`. Both compute the same fractional key because they passed the same `before`/`after` positions. Without a tiebreaker the two blocks land at identical `(positionInt, positionFrac)` and render order flips on every refresh — the user sees their own note jump above/below the collaborator's at random. | `convex/domains/product/blockOrdering.ts` | Added a new exported function `comparePositionsWithId(a, b)` that first calls the existing `comparePositions` (int, then frac) and falls back to a lexicographic compare on the stable `id` (blockId). Existing `comparePositions` left unchanged so callers without an id still work. | Deterministic sort contract: given the same inputs, every client produces the same order. Without a stable tiebreaker, rendering order is "undefined" which is fine for one user but visibly broken for two. The id-based fallback is O(1), free, and uses a field every block already has. |
| 2 | **Same scenario as #1, but the server-side mutation that inserts the new block also had to sort siblings to figure out "what's after the citing block" (promote-to-evidence) and "what's the last sibling at this parent level" (appendBlock). Those sorts were using the int+frac only compare, so a collision between two agents running `promoteLinkToEvidence` at once could nondeterministically place one evidence row above/below the other across tabs. | `convex/domains/product/blocks.ts` (two callsites at ~lines 1162 and 1532) | Changed two `.sort((a, b) => comparePositions({ int, frac }, { int, frac }))` callsites into `comparePositionsWithId({ int, frac, id: a._id }, { int, frac, id: b._id })`. Also added `comparePositionsWithId` to the import block at the top. | Applies the tiebreaker everywhere the server itself needs to pick a "last sibling" or "citing sibling". Without this, the server can pick different siblings on different runs even on the same input — which produces different fractional keys and amplifies the race. |
| 3 | **A power user pressed Enter 600 times during a long research session. The notebook query returned all 600 blocks every render — hundreds of kilobytes of JSON on every Convex subscription push, causing the Live view to stutter during streaming. No cursor meant scrolling to the bottom forced the whole list client-side.** | `convex/domains/product/blocks.ts` (listEntityBlocksPaginated, already present from the hardening commit) + `src/features/entities/components/notebook/EntityNotebookLive.tsx` (already switched to `usePaginatedQuery`) | Server: `listEntityBlocksPaginated` uses Convex's built-in `paginationOptsValidator` + `ctx.db.paginate({ cursor, numItems })` with a `paginateFilteredRows` helper that drops soft-deleted rows before returning the page. Client: `usePaginatedQuery` hook walks pages lazily. Default `numItems: 50`, client requests more via "load more" UI. | Bounded memory per page (cannot exceed 50 live rows per roundtrip) satisfies the `BOUND` agentic-reliability checklist. Cursor is a server-signed Convex pagination token so we don't invent our own cursor format. Live view stays responsive at 500+ blocks because each subscription push carries one page, not the whole document. |
| 4 | **Launch of beta with 50 users: we have no evidence that 50 concurrent `appendBlock` mutations per second won't corrupt ordering, won't error 502, and won't OOM the Convex function runtime. "Works for me in a browser tab" is not load evidence.** | `scripts/loadtest/notebook-load.mjs` (new) | Scripted three scenarios against Convex prod using the official `ConvexHttpClient`: (1) `concurrent_insert` — N clients append to one entity simultaneously for 60s; (2) `sustained_append` — 1 client appends 500 blocks, then reads them back via `listEntityBlocksPaginated` with cursor-walking to confirm all 500 survive + stay in order; (3) `multi_tab_edit` — N clients seed one block each, then update their own block every 500ms for 30s to stress `updateBlock` + revision bump. Reports p50/p95/p99 latency + error rate per scenario. Exits non-zero if error rate > 5% so CI can gate on it. | Answers three concrete questions the unit test suite cannot: (a) does the tiebreaker survive real concurrent writes or does Convex serialize them anyway? (b) does pagination stay O(1) per page or does latency grow with total block count? (c) does `updateBlock`'s revision chain survive rapid successive edits without race conditions? Honest p95 numbers beat gut feel. Script is scenario-based per `.claude/rules/scenario_testing.md` — each scenario declares persona, scale, duration, and failure mode. |
| 5 | **Going forward Homen wants to learn the codebase as I edit. Without a structured record of "why this change" per change, he has to diff the commit manually and reverse-engineer the intent.** | `docs/architecture/NOTEBOOK_HARDENING_CHANGELOG.md` (this file) | New append-only markdown file. Every future notebook change appends a row with the four columns: user-facing scenario, files touched, exact diff intent, why the change matters. No rewriting history — fixes to prior rows are added as new rows ("Row N supersedes row M because…"). | Lets Homen read one file to understand the codebase evolution. Learning path is causal (problem → files → code → rationale), not technical (diff). Faster to onboard new contributors too. |

---

## How to run the load test

```bash
# All three scenarios (defaults: 10 clients, 30s each)
node scripts/loadtest/notebook-load.mjs --entity softbank

# Just the concurrent-insert scenario with 25 clients for 2 minutes
node scripts/loadtest/notebook-load.mjs --scenario concurrent_insert --clients 25 --duration 120

# Point at a non-default Convex (e.g. a staging deployment)
node scripts/loadtest/notebook-load.mjs --url https://other-deployment.convex.cloud

# CI gate (exits non-zero if > 5% error rate in any scenario)
node scripts/loadtest/notebook-load.mjs --entity softbank && echo "load test passed"
```

Exit codes: `0` = all scenarios < 5% error rate, `1` = at least one scenario exceeded 5% error rate, `2` = runtime/config error.

## How the tiebreaker and pagination wire together

1. Client calls `usePaginatedQuery(listEntityBlocksPaginated, { entitySlug })`.
2. Convex `ctx.db.paginate({ cursor, numItems: 50 })` scans the `by_owner_entity_position` index, which already sorts by `(ownerKey, entityId, positionInt, positionFrac)`. The index gives a stable storage-order across scans.
3. `paginateFilteredRows` drops soft-deleted rows before returning the page.
4. Where the server still has to re-sort in-memory (appendBlock, promoteLinkToEvidence), it now uses `comparePositionsWithId` so ties resolve identically on every call.
5. Client renders the page as-is — never re-sorts — so the deterministic server order is what the user sees.

Result: one write path (fractional indexing with deterministic tiebreaker) and one read path (cursor-paginated index scan with deterministic filter). No invariants split across layers.
