# Founder Feature — Trait, Not Page

**Status:** Living · Last reviewed 2026-04-19
**Owner:** Core team
**Supersedes:** `FOUNDER_ARTIFACT_BUILD_PLAN.md` and related founder-platform docs (archived under `docs/archive/2026-q1/`).

## TL;DR

Founder is a **detected trait** that lights up capability on the **Me** and **Reports** surfaces — not a dedicated page. On Me, the user can generate their own founder profile (via Claude Code or NodeBench's harnessed agent). On Reports, any company research auto-generates founder sub-profiles via the pipeline, with full attribution. The `/founder` URL smart-routes based on user state.

## Prior art

| Reference | Pattern |
|---|---|
| **Claude Code skill detection** | Conditional feature surface based on project signals |
| **GitHub's "your profile" micro-rendering** | Self-view gains owner-only actions |
| **Linear's trait-based workspace** | Feature lights up for builders, dormant for others |

## Invariants

1. **Founder is a trait, not a nav item.** No sixth surface.
2. **Zero footprint for non-builders.** Detection gates all founder UI.
3. **Two paths converge on one data type.** Both self-generation and auto-generation produce `PERSON` entities — same schema, same rendering, same exports. Only ownership + actions differ.
4. **Owner-only actions gated on identity.** YOU pill appears only on profiles owned by the viewer.
5. **Permission-gated generation.** No indexing without explicit user opt-in.
6. **Anonymous users get full fidelity.** Only sign-in gains cross-device persistence.

## Detection

A user is founder-tagged if **any one** is true:

- MCP is connected (ran `claude mcp add nodebench`)
- A GitHub project is linked
- Saved lens is `founder`
- They own a founder profile (generated or in-progress)

If none fire, the feature stays dormant. Search-only users see Me + Reports without founder UI.

## Me trickle — "Your founder profile"

Conditional section on the Me surface (only rendered if founder-tagged).

**State: no profile yet, builder-tagged**

Two generation paths offered:
- **Via Claude Code** — copies a one-line prompt. Claude Code runs MCP tools locally and pushes profile back.
- **Via NodeBench agent** — requires GitHub permission. Harnessed agent reads public repo metadata.

**State: profile generated**

Shows: company name · last refresh time · 3-bullet summary · [Open] [Refresh] [Share] actions.

## Reports trickle — auto-generated founder sub-profiles

Every company / market / job report triggers the orchestrator to fan out to the `founder` block. This block auto-identifies founders via search + LLM extraction, runs per-candidate background gather, and emits a structured founder entity.

Each founder entity becomes a first-class `PERSON` report in the Reports grid, **distinguishable from watched entities via a provenance chip** (not a single origin — a running tally: *"Built from 3 reports, 5 chats · Last enriched 2h ago"*).

See [DILIGENCE_BLOCKS.md](DILIGENCE_BLOCKS.md) for the block contract and [AGENT_PIPELINE.md](AGENT_PIPELINE.md) for the pipeline.

## `/founder` smart routing

```
/founder  →  if hasProfile        → /entity/<own-slug>
          →  if founder-tagged    → /?surface=me#founder-profile
          →  otherwise            → /?surface=me (generic)
```

This makes the `agent-setup.txt` dashboard link valid for every user state.

## Ownership + actions

| Profile kind | Origin | Pill | Actions inside entity page |
|---|---|---|---|
| **Self-profile** | User generated from Me tab | `YOU` (terracotta) | Refresh from MCP · Draft investor update · Draft hire brief · Share |
| **Auto-generated** | Byproduct of researching another company | *(none)* | Watch · Open originating report · Add to outreach list · Share |

Action set is gated on identity — non-owners viewing the same URL never see owner actions.

## Data model

No new tables. Founder profiles are `entities` with `entityType: "person"` and optional `ownedBy: userId`. Ownership is set by the generation flow.

## Failure modes

| Failure | Detection | Recovery |
|---|---|---|
| Founder pipeline misidentifies (homonym) | Verification gates fail | Rendered as `unverified` in company report, never auto-persisted |
| User ends MCP session mid-generation | Partial scratchpad persists | Resume from partial state on next run |
| Anonymous user loses session cookie | Anonymous session ID lost | Claim flow surfaces at wrap-up offering sign-in |

## How to extend

Adding a new founder-trait signal (e.g., "invited a teammate"):

1. Update `useFounderTrait()` hook in `src/features/me/hooks/`
2. Add the signal to the detection predicate
3. Add a fixture test that asserts the hook fires on the new signal

## Related

- [DILIGENCE_BLOCKS.md](DILIGENCE_BLOCKS.md) — founder block contract
- [AGENT_PIPELINE.md](AGENT_PIPELINE.md) — pipeline that generates profiles
- [SESSION_ARTIFACTS.md](SESSION_ARTIFACTS.md) — where generated profiles surface for keep/dismiss
- [AUTH_AND_SHARING.md](AUTH_AND_SHARING.md) — ownership and sharing

## Changelog

| Date | Change |
|---|---|
| 2026-04-19 | Reframed from dedicated surface to trait-based trickle design |
