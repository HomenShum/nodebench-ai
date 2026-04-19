# Auth & Sharing — Public by Default, Frictionless Claim

**Status:** Living · Last reviewed 2026-04-19
**Owner:** Core team
**Supersedes:** `NOTEBOOK_HARDENING_CHANGELOG.md` (auth sections), `ANALYTICS_ROUTE_INTEGRATION.md` (sharing).

## TL;DR

Entity URLs (`/entity/<slug>`) are **public by default** — any unauthenticated visitor can render a full report, complete with OG/Twitter metadata for social previews. Anonymous users get **full fidelity** for generating reports; sign-in is surfaced only at the highest-intent moment (Session Artifacts wrap-up with reviewed items). Sign-in options: Gmail, GitHub. Claim flow atomically transfers anonymous-session state to the new account.

## Prior art

| Reference | Pattern |
|---|---|
| **Perplexity answer URLs** | Shareable public URL with full OG metadata |
| **Figma "Shareable link"** | Public view without sign-in · auth gates editing |
| **Notion public pages** | Entity-level public toggle |
| **GitHub gist claim flow** | Anonymous-to-user state transfer |

## Invariants

1. **No auth wall before value.** Anonymous users can generate a report, view it, share it.
2. **Entity URLs are public-by-default.** OG/Twitter tags render on every page.
3. **Sign-in surfaces at highest-intent moment.** Specifically: Session Artifacts wrap-up modal when user has reviewed items.
4. **Claim is atomic.** Anonymous session's `sourceRefs`, `contributionLog`, and entity ownership transfer together or not at all.
5. **OAuth providers are Gmail and GitHub.** No password-based flows. GitHub doubles as a founder-trait signal.
6. **Named-member invites enforce permissions.** `view` vs `edit` roles respected across notebook + sharing surfaces.

## Architecture

```
┌──────────────────────────────────────────────┐
│ Visit /entity/<slug> (any visitor)            │
│   → Convex fetches entity by slug             │
│   → Check visibility (public | private)       │
│     public → render full page                 │
│     private → auth check → 403 if unauth'd    │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ Anonymous session (default)                   │
│   → getAnonymousProductSessionId() returns    │
│     stable per-browser ID (cookie-free,       │
│     uses localStorage)                        │
│   → all entities/reports/contribs tied to     │
│     that session ID                           │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ Claim flow (surfaced at wrap-up)              │
│   1. User chooses Gmail or GitHub             │
│   2. OAuth completes → user record created    │
│   3. Atomic mutation: claim(anonSessionId)    │
│      - transfer entity.ownerId                │
│      - transfer reports.ownerId               │
│      - transfer contributionLog.userId         │
│      - delete anonSession record              │
│   4. User redirected to their claimed work    │
└──────────────────────────────────────────────┘
```

## Named-member invites

See `convex/domains/product/shares.ts`. Permissions:

- `view` — can read notebook, cannot edit
- `edit` — can read + edit notebook in real time (prosemirror-sync)
- Owner-only controls (share, delete, transfer) never shown to members

Entity URLs for members: `/entity/<slug>?member=<memberId>`.

## Failure modes

| Failure | Detection | Recovery |
|---|---|---|
| Anonymous claim hits network error mid-flow | Transaction rollback | Session state untouched, user can retry |
| OAuth provider outage | HTTP 5xx from provider | Error state in sign-in modal with retry |
| User tries to view private entity without auth | 403 response | Graceful "this entity is private" page with optional sign-in |
| Duplicate claim attempt (same anonSession, two browsers) | Idempotent mutation | Second claim no-op, surfaces message |

## How to extend

Adding a new OAuth provider:

1. Add provider config in `src/SignInForm.tsx`
2. Add Convex auth callback handler
3. Extend `user` table with provider-specific fields if needed
4. Update claim flow to recognize the new provider as a valid claim source

## Related

- [SESSION_ARTIFACTS.md](SESSION_ARTIFACTS.md) — where sign-in CTA surfaces
- [REPORTS_AND_ENTITIES.md](REPORTS_AND_ENTITIES.md) — entity URL structure
- [FOUNDER_FEATURE.md](FOUNDER_FEATURE.md) — GitHub sign-in signals founder trait

## Changelog

| Date | Change |
|---|---|
| 2026-04-19 | Consolidated auth + sharing spec |
