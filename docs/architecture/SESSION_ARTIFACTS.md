# Session Artifacts — Live Panel + Wrap-Up Review

**Status:** Living · Last reviewed 2026-04-19
**Owner:** Core team

## TL;DR

Every chat session accumulates artifacts (entities, founders, memos, products, etc.) as the pipeline runs. Users review them in a **live side panel** during the chat and a **non-blocking wrap-up modal** when leaving. Undecided items land in a **pending strip** on the Reports tab so no artifact is ever silently persisted or dropped.

## Prior art

| Reference | Pattern |
|---|---|
| **Claude Code "Files changed" summary** | End-of-task batched review |
| **Perplexity Lab generated artifacts rail** | Live accumulation during session |
| **Cursor composer panel** | Keep/dismiss per artifact before commit |
| **OpenAI Memory (structured)** | Suggestion UX with explicit opt-in |

## Invariants

1. **Never steal focus during active chat.** Panel is ambient / collapsible.
2. **Never silently persist or drop.** Every artifact → Keep / Dismiss / Skip.
3. **Defaults are consent-friendly:** `verified` tier → pre-checked · `unverified` → unchecked. User still confirms at wrap-up.
4. **Skip is always an option.** Wrap-up never blocks. Skipped items go to a pending bucket.
5. **Backfill works.** Panel renders for sessions that ran before the feature existed.
6. **Anonymous-user fidelity.** Sign-in CTA appears at highest-intent moment (wrap-up with reviewed items), never before.

## Three surfaces

1. **Live right rail (during chat)** — ambient, collapsible, grouped by block type
2. **Wrap-up modal (on navigate / explicit / 5-min idle)** — non-blocking review + sign-in CTA for anonymous
3. **Pending strip (top of Reports)** — surfaces skipped items awaiting decision

## Data model

```ts
sessionArtifacts {
  id, sessionId, runId,
  blockType, entitySlug,
  confidence: "verified" | "corroborated" | "single-source" | "unverified",
  status: "pending" | "kept" | "dismissed",
  decisionAt?, decisionBy?,
  createdAt,
}
```

Queries: `getSessionArtifacts(sessionId)`, `getPendingCount(sessionId|userId)`.
Mutations: `promoteArtifacts(ids[])`, `dismissArtifacts(ids[])`.

## Wrap-up triggers (all three stable)

1. **Navigate away** — route change intercepted
2. **Explicit "Wrap up" button** — in chat header, always visible
3. **Inactivity** — 5+ min idle on the chat surface

Plus **experimental** (flag-gated, not in stable v1): LLM rabbit-hole detector using boolean gates over circularity / diminishing returns / stated-goal-resolved signals.

## Failure modes

| Failure | Detection | Recovery |
|---|---|---|
| User closes tab with pending items | Beforeunload not reliable cross-browser | Items stay in pending bucket; shown on next visit |
| Session artifact references deleted entity | FK check on promote | 404 surfaced in UI, user re-runs |
| Claim flow hits auth error | Sign-in modal error state | Retry button; artifacts remain pending |

## How to extend

To add a new artifact type (beyond the 10 block types):

1. Extend `blockType` enum in schema
2. Add type-specific card renderer in `src/features/chat/components/SessionArtifactCard.tsx`
3. Add default-toggle logic in `useSessionArtifactPanel` hook

## Related

- [AGENT_PIPELINE.md](AGENT_PIPELINE.md) — pipeline that generates artifacts
- [FOUNDER_FEATURE.md](FOUNDER_FEATURE.md) — the founder self-profile generation flow plugs into this panel
- [AUTH_AND_SHARING.md](AUTH_AND_SHARING.md) — anonymous claim flow surfaced at wrap-up

## Changelog

| Date | Change |
|---|---|
| 2026-04-19 | Initial spec of three-surface review UX |
