# Reports & Entities — Surface Anatomy

**Status:** Living · Last reviewed 2026-04-19
**Owner:** Core team
**Supersedes:** `NODEBENCH_AI_APP_PRD_V1.md`, `nodebench-ai-app-v2.md`, `COCKPIT_WIREFRAMES.md`, `DAY1_USER_JOURNEYS.md`, `ARCHETYPE_GAP_ANALYSIS.md`, `UNIFIED_TEMPORAL_OS.md`, `IDEAFLOW_BLOCK_NOTEBOOK_ULTRAPLAN.md`, `NODEBENCH_COMPLETE_SPEC.md` — archived.

## TL;DR

The **Reports** surface is the grid view of every saved entity. The **Entity page** is the detail view — three modes (Classic / Notebook / Live) — that layers diligence blocks via prosemirror decorations. Cards lead with **entity name** (not a generic type label), carry a **freshness pill** (fresh / recent / stale), and expose **owner-only actions** when the viewer owns the entity.

## Prior art

| Reference | Pattern |
|---|---|
| **Notion databases** | Grid with filters + groups + card templates |
| **Linear project views** | Status-first card anatomy |
| **GitHub issues grid** | Freshness + owner chips |
| **Crunchbase entity profiles** | Multi-section detail view, attributed facts |

## Invariants

1. **Cards lead with entity name**, not a generic type label.
2. **Freshness pill is honest.** Computed from `getFreshness(updatedAt)` — never hardcoded.
3. **Default group = Date** (recent first). User can switch to Origin / Type.
4. **Header subtitle surfaces state:** *"20 reports · 3 updated today · 2 stale"*.
5. **YOU pill** on entities the viewer owns. Owner actions appear only then.
6. **Entity URL is public-by-default.** OG/Twitter metadata on every page. Anonymous visitors can view.
7. **Three view modes** — Classic (prose) · Notebook (prosemirror live + decorations) · Live (streaming from pipeline).

## Card anatomy

```
┌─────────────────────────────────────┐
│ [type icon] COMPANY                 │
│                                     │
│ Acme AI                             │  ← entity name (NOT "Company memory")
│                                     │
│ Agent-native CRM · Series B $42M    │  ← one-line summary
│                                     │
│ [related chip 1] [related chip 2]   │
│                                     │
│ System · Company · 3 briefs · 5 src │
│                              [2h ago]│  ← freshness pill (fresh = emerald)
└─────────────────────────────────────┘
```

## Entity page layout

```
Breadcrumb: Reports > Acme AI

Title + status badges    | [Reopen in Chat]
(summary, updated ts)    | [Prep brief] [Track] [...⋮]

Since last visit: First visit · 23m ago

Recent edits: investor brief rev 2 · investor brief rev 1 · working notes

                    [Classic | Notebook | Live]

┌ Diligence sections (each a prosemirror decoration in Notebook mode):
│ FOUNDERS        [verified×2 · unverified×1]
│ PRODUCTS        [verified×3]
│ FUNDING         [Series B $42M]
│ RECENT NEWS     [5 items · last 30 days]
│ HIRING          [8 open roles · +3 vs last month]
│ PATENTS         [3 filings · 1 granted]
│ PUBLIC OPINION  [mixed · Reddit × 450 · HN × 12]

EXPORT: [Executive brief] [Outreach memo] [CRM block] [Markdown] [Copy link]
```

## Data model

- `entities` table — canonical
- `reports` table — one-to-many with entities (revisions)
- `contributionLog` — per-fact attribution (see [AGENT_PIPELINE.md](AGENT_PIPELINE.md))

## Freshness tiering

See [ReportsHome.tsx](../../src/features/reports/views/ReportsHome.tsx) `getFreshness()`.

| Tier | Window | Pill color |
|---|---|---|
| `fresh` | < 24h | emerald |
| `recent` | 24h – 7d | neutral |
| `stale` | > 7d | amber |
| `unknown` | no timestamp | muted |

## Failure modes

| Failure | Detection | Recovery |
|---|---|---|
| Entity without a name (e.g., ingestion failure) | `getFreshness` returns unknown + thumbnail fallback | Card still renders with `getPosterLabel(type)` · doesn't crash |
| Anonymous session viewing another user's private entity | Auth check on entity load | 403 with graceful "this entity is private" page |

## Related

- [AGENT_PIPELINE.md](AGENT_PIPELINE.md) — generates entity content
- [PROSEMIRROR_DECORATIONS.md](PROSEMIRROR_DECORATIONS.md) — how blocks render in Notebook mode
- [AUTH_AND_SHARING.md](AUTH_AND_SHARING.md) — public-by-default URLs
- [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) — glass card DNA, terracotta accent

## Changelog

| Date | Change |
|---|---|
| 2026-04-19 | Consolidated card + entity-page spec post-redesign |
