# Entity Page Redesign — Physical Notebook, Co-Authored with Agents

**Status**: In flight (PR-A) · **Scope**: `src/features/entities/views/EntityPage.tsx` + adjacent notebook surfaces · **Product identity**: a physical notebook that the user scrolls and edits, co-authored by NodeBench agents

## 0. Identity

The entity page is **one piece of paper**, not a dashboard. The user:
- scrolls through it like a notebook
- edits it like a notebook
- sees agent contributions as **margin notes and ink from a second author**, not as a separate "agent activity feed"
- trusts it because the paper is real — there is no app chrome fighting the content

This reframes every other design decision below. A right-rail is not "a sidebar" — it is a **companion notebook** or the page margin. A status chip is not "telemetry" — it's **the ink still wet** indicator. The toolbar disappears when the user is writing.

**Refs we borrow from**: Notion (editor-is-the-interface), Roam (block as unit), Obsidian (paper aesthetic + graph as companion), **and the analog notebook** (ruling, margin, page number, date in the corner, second author's pen visible).

## 1. What's wrong today

Inventory of sections rendered on `/entity/:slug` (measured in code, not guessed):

| Section | Line | Role today | Notebook-first verdict |
|---|---|---|---|
| Page container `max-w-[1360px]` | 1270 | Whole-page cap | **Raise** — cap is the reason the notebook column is ~880px on a 1920 display. |
| Title + classic/notebook/live toggle | 1312–1396 | Header | **Keep** — but compress into a single top strip, not a tall hero. |
| Notebook view (Classic / Notebook / Live Tiptap) | 1646–1665 | The product | **Promote to primary surface**. Fills viewport minus header and a collapsible right-rail. |
| "Current brief" + sections grid | 1667–~1800 | Classic-only legacy | **Fold into notebook** as a block template; do not render as a separate section when in Notebook/Live mode. |
| Working notes (full) | 2050–~2110 | Collab notes on classic | **Fold into notebook** (it is already the same underlying data). |
| Workspace rail (right) | 2116–~2380 | Sources, mentions, related, actions | **Keep — but collapse by default**, move behind a toggle button in the header, widen to 320 on demand. |
| Connected node | 2382–2420 | Graph peek | **Move into rail** under "Connections". |
| Hidden legacy sections | 2426+, 2487+, 2499+ | `hidden` in markup | **Delete** — dead code per `reexamine_design_reduction`. |

Plus on the home surface, the Starting Points grid cards don't equalize slot heights. See §7.

## 2. Design principles (from Notion/Roam/Obsidian)

1. **Editor is the interface.** Title + editor are the whole screen. Nothing competes.
2. **Right-rail is a drawer, not a fixture.** Visible on ≥1440px by default, collapsible to a 36px strip.
3. **Identity lives at the top strip, not in a hero card.** Breadcrumb, title, facet chips, action button.
4. **Everything else is progressive disclosure.** Sources, mentions, evidence, history — inside the rail or bottom drawer.
5. **The notebook itself owns its typography.** No nested card borders. No double rounded corners. No visual competition with the block editor.

## 3. Target layout

```
┌───────────────────────────────────────────────────────────────────────────────┐
│  ← Entities   SoftBank · Company    [investor lens ▾]     [🔗 share] [… rail] │   top strip (48px)
├───────────────────────────────────────────────────────────────────────────────┤
│                                                             │                  │
│                                                             │  Workspace       │
│                                                             │  ────────────    │
│                                                             │  Sources (4)     │
│                                                             │  Mentions (12)   │
│                                                             │  Connections (3) │
│                 NOTEBOOK (Tiptap via sync)                  │  History         │
│                 ═══════════════════════════                 │  Actions         │
│              Fills: viewport − 48px − rail                  │                  │
│                                                             │  (collapsible,   │
│                                                             │   320px → 36px)  │
│                                                             │                  │
└───────────────────────────────────────────────────────────────────────────────┘
                                                              ↑
                                              Below 1440px the rail is off-canvas
                                              (toggle button in the top strip reveals it)
```

- Width: `max-w(min(1760px, 95vw))`
- Notebook column: `grid-cols-[minmax(0,1fr)_320px]` at `xl`, collapses to 1 column below
- Content padding: matches Notion's ~96px left for title and ~48px for body
- No section cards around the notebook. The block editor provides its own rhythm.

## 4. What moves / what dies

**Moves into the rail (single tabbed panel, not 4 stacked cards)**
- Sources · Mentions · Connections · History · Actions (send to Slack, draft email, share)

**Moves into the notebook as block templates** (not as separate sections)
- Current brief (becomes the default first block)
- Working notes (becomes subsequent blocks; already is, structurally)
- Connected node summary (becomes a `connected_node` block kind in the notebook)

**Deletes** (dead under `hidden` in JSX)
- Lines 2426–2498 trio of `hidden` working-notes / metadata / evidence cards
- Any classic-only duplicate panels once the notebook becomes the default view

## 5. Mode reduction

Current: `Classic | Notebook | Live ✨` three-way toggle.

Proposed: **drop Classic and Notebook from user-facing surface**. Live (Tiptap + sync) becomes the default and only editable view. Rationale:
- Classic reads the same `productBlocks` the Live view writes via `onSnapshot`.
- Notebook without sync is strictly a subset of Live.
- Keeping three toggles is feature-proliferation that `reexamine_design_reduction` directly forbids.

Keep them as **ops kill-switch paths** (Classic falls out automatically when `VITE_NOTEBOOK_LIVE_ENABLED=false` or `NOTEBOOK_PM_SYNC_ENABLED=false`), not as a user toggle.

## 6. Collaboration surface (use what commit 3 built)

- **Presence chip** in the top strip (not buried in a status bar): "3 editing" with avatars.
- **Sync indicator** next to the title: "synced just now" / "offline — 3 queued".
- **Read-only lock** replaces the share button when `accessMode=read`.
- **Oversize + Tombstone modals** keep their production behavior — triggered from the editor, not the rail.

## 7. Starting Points card heights (home surface, same discipline)

**Root cause**: `<button>` container has no `flex h-full flex-col`, so when `ProductSourceIdentity` renders null (no source chips) and `line-clamp-2` resolves to 1 line of actual content, the bottom edge floats up. CSS-grid row-stretch equalizes outer heights, but inner content doesn't pin to the bottom.

**Fix** (inside the `<button>` className in `src/features/home/views/HomeLanding.tsx` line 448):
- Add `flex h-full flex-col` to the button.
- Give the summary `<p>` a `min-h-[3em]` so 1-line summaries reserve 2-line space.
- Wrap `originLabel + updatedLabel + ProductSourceIdentity` in a `<div className="mt-auto">` footer.
- Give `ProductSourceIdentity` a `min-h-[20px]` wrapper so empty-chip cards reserve the chip slot.

This is one small edit; it's in the redesign document because it's the same discipline being applied consistently.

## 8. Implementation staging

Three PRs, each reversible:

**PR-A · Layout shell (low risk)**
- Raise container to `max-w-[min(1760px,95vw)]`
- Rebalance grid to `minmax(0,1fr)_320px`
- Collapse rail below `xl`
- Starting Points card flex column + slot reservation
- Est: ~150 lines; CSS-string churn only

**PR-B · Section consolidation (medium risk)**
- Delete the three `hidden` legacy sections (lines 2426, 2487, 2499)
- Fold "Current brief" + "Working notes" into the notebook render path
- Collapse the rail into a single tabbed panel component `EntityWorkspaceRail.tsx`
- Est: ~400 lines deleted, ~250 added

**PR-C · Mode reduction + presence surfacing (higher review bar)**
- Remove Classic/Notebook user-facing toggles; keep as kill-switch fallbacks
- Move presence + sync indicator into the top strip
- Replace in-rail metadata with inline top-strip chips
- Est: ~300 lines; biggest UX shift — ship behind `VITE_NOTEBOOK_IDENTITY_REDESIGN_ENABLED=true` for a week

## 9. Kill switches

- `VITE_NOTEBOOK_IDENTITY_REDESIGN_ENABLED=false` → old layout
- `VITE_NOTEBOOK_LIVE_ENABLED=false` → Classic view (already wired)
- `NOTEBOOK_PM_SYNC_ENABLED=false` (Convex env) → server-side fallback already built

## 10. Verification

Per `dogfood_verification.md` + `reexamine_process.md`:
- Dark + light at 1920, 1440, 1024, 390
- All three kill-switch paths render without regressions
- Presence chip updates within 2s of a second tab opening
- `npm run dogfood:full:local` before merging PR-C

## 11. Honest non-goals

- **Not rewriting the block editor** — the commit-2 Tiptap editor is the surface; this document only reframes what's AROUND it.
- **Not adding per-block cursors** — still deferred (needs Y.js awareness).
- **Not building a new right-rail component library** — one `EntityWorkspaceRail.tsx` with tabs is enough.

## 12. Paper aesthetic (PR-B scope)

This is what makes it feel like a physical notebook, not another web app page.

### Tokens

```
--paper-bg-light:      #fbf8f2   /* warm off-white, not pure #ffffff */
--paper-bg-dark:       #1b1a18   /* warm graphite, not pure #000 */
--paper-rule-light:    rgba(217, 119, 87, 0.06)   /* faint terracotta rule */
--paper-rule-dark:     rgba(255, 255, 255, 0.04)
--paper-margin-light:  rgba(217, 119, 87, 0.10)   /* warmer left-margin guide */
--paper-margin-dark:   rgba(217, 119, 87, 0.18)
--ink-user-light:      #1a1918
--ink-user-dark:       #f3efe7
--ink-agent-light:     #6a6763   /* slightly different ink, second author */
--ink-agent-dark:      #c3bfb5
```

### Surface
- Entity page `<article>` wraps the notebook in a paper sheet: off-white/graphite background, subtle drop shadow, rounded-xl corners ONLY at the sheet edge (not per-section).
- No nested card borders inside the sheet. Blocks sit on the paper.
- Optional horizontal ruling at baseline of each paragraph (light, barely visible). Disabled under `prefers-reduced-motion` or via a "ruled / blank" toggle in the top strip.
- A 48px left margin that acts as the "binding" area: page number, timestamp, author dot per block. Like the left margin of a Moleskine.

### Co-authorship signals
- **Agent contributions get a second ink tone**. Not a card, not a badge — just a shade of gray that's recognizably "not me." Like a second author's pen on the same page.
- **A small dot in the left margin** marks blocks touched by agents, colored by agent (terracotta for NodeBench, cool-gray for "system"). Hovering reveals "NodeBench agent · 2h ago".
- **Recently-written blocks pulse once** (200ms, disabled under reduced-motion) so the user can see where the ink is wet.
- **When the agent is writing live**, a subtle ellipsis marker appears in the margin for that block — like watching the second author's pen move.

### Top strip ("the cover / the date at the top of the page")
- Breadcrumb + title + one accent chip (entity type) + lens dropdown
- Right side: presence avatars + sync state ("synced · just now" or "offline · 3 queued")
- No big buttons. Actions live in a single `⋯` menu that opens the rail.

### Right rail ("margin notes / companion notebook")
- Collapsed by default below 1536px. A 36px vertical strip with icon-only hints (Sources count, Mentions count, Connections count).
- When expanded, it's its own paper sheet beside the main one, 320px wide, not a dashboard.
- Tabs: Sources · Mentions · Connections · History · Actions. Single component.

### Block-level details (margin + block)
- Every block carries its own tiny timestamp in the left margin (`4/18  3:12p`).
- Author attribution (user name / agent name) in the same margin, not in the block body.
- Hover a block → the margin lights up with the full provenance (agent name, run id, confidence).

### Motion budget
- One animation at a time (the "wet ink" pulse on the most recent edit).
- No staggered fade-ins for blocks on load — a notebook doesn't fade in.
- `prefers-reduced-motion` disables everything: no pulse, no rule drawing, no margin glow.

### What this replaces
- Today's per-section card borders (lines 1671, 1725, 2022, 2050, 2055, 2116, 2382, 2426, 2487, 2499, 2601) — all of them. The sheet owns the chrome.
- Today's flat `bg-white / dark:bg-[#111214]` — replaced by the warm paper tokens.
- Today's three-view toggle — removed in PR-C; the paper itself IS the view.
