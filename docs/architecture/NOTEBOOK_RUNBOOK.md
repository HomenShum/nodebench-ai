# Notebook Runbook — Error Code → Triage

When a user reports a notebook problem, the error toast detail ends with `(ref: <requestId>)`. The steps below map each error code to a 2-minute triage path. If an issue isn't in this doc, the default is: read the Convex log for that Request ID first, then decide.

## Kill-switch shortcuts (before any triage)

If Live notebook is misbehaving broadly:

1. **Whole deployment**: set env var `VITE_NOTEBOOK_LIVE_ENABLED=false` and redeploy the frontend. All users fall back to Classic view on next reload; data is untouched.
2. **Single user**: have them paste this in devtools console and reload:
   ```js
   localStorage.setItem("nodebench.liveNotebookDisabled", "1"); location.reload();
   ```
   Same fallback, scoped to one browser.

Both paths downgrade Live → Classic with **zero data loss** — blocks stay in `productBlocks`, only the renderer changes.

---

## Error codes

### `REVISION_MISMATCH`

**What the user sees**: soft yellow toast "Notebook changed in another tab."

**What it means**: two clients (two tabs, agent + human, two people on a shared session) both tried to write the same block. The server accepted the first and rejected this one because `expectedRevision` didn't match `existing.revision`.

**Severity**: expected behavior. Not a bug.

**Triage**:
- If rate is <5% of writes in a given minute: ignore.
- If rate is >20%: check whether an agent is hammering the same block in a loop. `npx convex logs --prod | grep "<blockId>"` shows the write sequence.
- If rate is near 100%: the client is not refreshing from the reactive query. Check `useQuery`/`usePaginatedQuery` health in the browser console.

### `CONTENT_TOO_LARGE`

**What the user sees**: red toast "Notebook block is too large. Split into smaller sections."

**What it means**: the block content serialized to more than `MAX_BLOCK_CONTENT_BYTES` (50 KB). Usually an agent pasted tool output without summarizing.

**Severity**: permanent until the caller splits the block.

**Triage**:
- If a user reports it: they can reproduce by pasting. Suggest splitting at natural paragraph breaks.
- If an agent triggers it repeatedly: check the tool that generated the oversized content. Usually `web_search` returning full article text instead of a snippet. Fix the tool, not the block.

### `ENTITY_NOT_FOUND` / `BLOCK_NOT_FOUND`

**What the user sees**: red toast, generic "save failed".

**What it means**: the id in the mutation doesn't resolve under the caller's `ownerKey`. Usually means the session lost auth or the record was hard-deleted (should never happen in prod — we soft-delete).

**Severity**: P1 — data reference broken.

**Triage**:
- Check `npx convex logs --prod | grep "<requestId>"` for the actual query path.
- If `ownerKey` in the log is `anon:…` but the user is signed in: auth claim broke. Check `getAuthUserId` pipeline.
- If the record is missing from the index scan: run `ensureEntityBackfill` on that session's ownerKey.

### `RATE_LIMITED`

**What the user sees**: soft yellow toast "Notebook write rate limit reached. Wait about Ns and try again."

**What it means**: per-session write counter exceeded either the per-bucket burst (300/10s) or per-window cap (1200/min).

**Severity**: expected under load; concerning under normal traffic.

**Triage**:
- If a human user hits this: they have 20+ tabs open or an agent is writing on their behalf. Confirm with the user.
- If widespread: an agent loop is mis-behaving. Check recent agent runs.
- To permanently raise: edit `NOTEBOOK_WRITE_BURST_LIMIT` / `NOTEBOOK_WRITE_LIMIT_PER_MINUTE` in `convex/domains/product/blocks.ts` and redeploy. Don't bump without first checking the cause.

### Opaque "Server Error" with no code

**What it means**: something threw a non-`ConvexError`. The default message-regex will still capture the Request ID. A missing code = a missing ConvexError = an unplanned failure path.

**Severity**: P0 until we know what failed.

**Triage**:
- `npx convex logs --prod | grep "<requestId>"` returns the stack trace.
- Wrap the offending throw in `ConvexError({ code: "…" })` so future occurrences are codified and trigger structured triage.

---

## Load-test commands (verification)

Quick sanity check after any deploy touching block mutations:

```bash
# Full CI gate, ~4 minutes, exits non-zero on >5% non-expected errors:
node scripts/loadtest/notebook-load.mjs --entity softbank --clients 10 --duration 60

# Conflict-only smoke, ~30 seconds — use after changing updateBlock:
node scripts/loadtest/notebook-load.mjs --scenario multi_tab_conflict --duration 30

# Soak — use before major releases or to investigate slow degradation:
node scripts/loadtest/notebook-load.mjs --clients 5 --duration 600 --scenario concurrent_insert
```

## Rollback paths (by scope)

| Scope | Action |
|---|---|
| One user's browser | `localStorage.setItem("nodebench.liveNotebookDisabled", "1")` + reload |
| Whole frontend | Ship build with `VITE_NOTEBOOK_LIVE_ENABLED=false` |
| One Convex function | Revert + `npx convex deploy`. Schema stays compatible across revert — block rows are never schema-broken by a code revert |
| One Convex schema change | Never revert schema in prod. Ship forward-fix only. |

## Canonical on-call references

- Changelog with root-cause history: `docs/architecture/NOTEBOOK_HARDENING_CHANGELOG.md`
- Load-test definitions: `scripts/loadtest/notebook-load.mjs`
- Error-code sources: `convex/domains/product/blocks.ts` (search `ConvexError`)
- Client error parser: `src/features/entities/components/notebook/EntityNotebookLive.tsx` (`parseNotebookMutationError`)
