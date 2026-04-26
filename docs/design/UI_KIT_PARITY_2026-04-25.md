# UI Kit Parity Map — 2026-04-25

Source: design packet `claude.ai/design` handoffs `1cZMB1GZ0_1h2PJ-UFZFlA` and
`m5tRJVYm6xtPvjqrQpv5rA` (verified byte-identical content). Landed at:

- `ui_kits/nodebench-web/` — flagship web app kit (29 JSX files + nodebench.css, 148 KB)
- `ui_kits/nodebench-mobile/` — iOS-shell mobile kit (17 files)
- `ui_kits/nodebench-mcp/` — terminal/CLI lane (3 files)
- `ui_kits/assets/` — shared brand SVGs / webp renders / OG card
- `docs/design/nodebench-ai-design-system/` — refreshed design system (README, SKILL, colors_and_type.css, preview/, scraps/, screenshots/, chats/, explorations/)

Verify the kit locally:

```bash
npx http-server ui_kits -p 5300 -c-1
# → http://localhost:5300/nodebench-web/index.html
```

The kit is a self-contained Babel-in-browser React 18 prototype. Five surfaces
(Home / Chat / Reports / Inbox / Me) plus a floating Tweaks panel that drives
feel-axis tokens (pace, density, paper texture, reasoning trace).

## Surface map: kit → live React

| Kit JSX (in `ui_kits/nodebench-web/`) | Live React surface | Live file |
| --- | --- | --- |
| `App.jsx` — 5-surface router | `CockpitLayout` | `src/features/controlPlane/components/CockpitLayout.tsx` |
| `TopNav.jsx` — translucent topbar | Cockpit topbar / left-rail | `src/features/controlPlane/components/` |
| `HomePulse.jsx` + `PulseStrip.jsx` + `TodayIntel.jsx` + `ActiveEvent.jsx` + `RecentReports.jsx` | Home | `src/features/home/views/HomeLanding.tsx` (desktop) · `MobileHomeSurface.tsx` |
| `Composer.jsx` — homepage hero composer | (Composer in Home hero, also reused in Chat) | `HomeLanding.tsx` composer block |
| `ChatStream.jsx` + `ChatTurn.jsx` + `ChatRightRail.jsx` + `ChatStreamData.jsx` | Chat | `src/features/chat/views/ChatHome.tsx` (or `ChatHomeEnhanced` / `ChatHomePremium`) |
| `AnswerPacket.jsx` — single-shot answer card | (legacy single-shot answer view) | `ChatHome` answer block |
| `ReportCard.jsx` + grid layout | Reports list | `src/features/reports/views/ReportsHome.tsx` (or `ReportsHomeEnhanced`) |
| `ReportDetail.jsx` + `ReportDetailData.jsx` + `Notebook.jsx` | Report detail + notebook | `src/features/reports/views/ReportNotebookDetail.tsx` |
| `LayoutExplorer.jsx` | Layout-explorer toolbar (tweak detail layout) | n/a yet — new internal view |
| `WorkspaceMemory.jsx` | Workspace-memory subview | n/a yet |
| `ProposedChanges.jsx` | Proposed-changes subview | n/a yet |
| `NudgeList.jsx` | Inbox | `src/features/nudges/views/...` (NudgesHome + Mobile) |
| `EntityNotebook.jsx` | Me / Notebook | `src/features/me/views/MeHome.tsx` |
| `Icon.jsx` | Lucide icons (already used) | direct lucide-react imports |
| `tweaks-panel.jsx` | (no live equivalent yet) | new floating overlay — feel-axis controls |

## Token + chrome alignment (apply once, benefits all surfaces)

The kit's `nodebench.css` (148 KB) is the canonical token sheet. The live app
uses Tailwind + `src/index.css` (~2,800 lines). To bridge:

1. **Adopt the kit's CSS variable contract** in `src/index.css`:
   - `--accent-primary: #D97757`, hover `#C76648` (light) / `#E59579` (dark)
   - `--bg-primary` / `--bg-secondary` / `--bg-surface` per theme
   - `--text-primary` / `--text-secondary` / `--text-faint`
   - `--border-default` / `--border-subtle` / `--border-strong`
   - `--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1)`, `--ease-spring`
   - `--shadow-sm/md/lg/hover/accent`
   - density: `data-density` on `<html>` (`compact` / `comfortable` / `spacious`)
   - feel-axis: `data-pace` on `<body>` (`instant` / `conversational` / `deliberate`)
   - texture: `data-texture` on `<body>` (`off` / `on` for paper)

2. **Adopt the kit's component classes** as utility primitives:
   - `.nb-app` (body), `.nb-shell` (page frame), `.nb-topnav`, `.nb-panel`, `.nb-panel-soft`, `.nb-panel-inset`
   - `.nb-btn`, `.nb-btn-ghost`, `.nb-btn-primary`, `.nb-btn-pill`
   - `.nb-focus` (focus ring), `.nb-hover-lift` (card lift), `.nb-surface-card-interactive`
   - `.type-kicker` (11px / `0.18em` tracking / uppercase / muted)
   - `.reveal`, `.reveal-scale`, `.reveal-blur`, `.reveal-stagger` (entrance animation primitives)

3. **Logo mark + favicon**: copy `ui_kits/assets/logo-mark.svg` references to live app's index.html — already at `public/` for prod.

## Locked nav + guard rails (from CLAUDE.md)

- Tabs: `Home · Chat · Reports · Inbox · Me` (kit ships exactly this — confirmed)
- Workspace is a separate deployed surface, NOT a 6th tab
- Preserve all live Convex wiring — replace visual chrome only, never replace runtime calls with fixtures

## Implementation plan (priority order)

### P0 — Foundation (one PR, low risk, big multiplier)

- [ ] Port kit tokens into `src/index.css`: accent, bg, text, border, ease, shadow, density, pace, texture custom properties
- [ ] Port kit utility classes: `.nb-panel`, `.nb-panel-soft`, `.nb-btn`, `.nb-btn-ghost`, `.nb-btn-primary`, `.nb-focus`, `.nb-hover-lift`, `.type-kicker`, `.reveal*`
- [ ] Add favicon + apple-touch-icon from `ui_kits/assets/` to `index.html`
- [ ] Verify: `npx tsc --noEmit`, `npm run build`, browser smoke

### P1 — Chrome (TopNav + Cockpit shell)

- [ ] Match `CockpitLayout` topbar to `TopNav.jsx`: 28×28 logo mark + "NodeBench AI" wordmark, segmented tabs (`Home/Chat/Reports/Inbox/Me`), centered search input with `⌘K` chip, bell + theme toggle + avatar
- [ ] Translucent topbar: `rgba(250,248,245,.88)` light / `rgba(13,16,20,.82)` dark + `backdrop-filter: blur(18px)`
- [ ] Verify against kit screenshot at `docs/design/nodebench-ai-design-system/screenshots/` (terracotta brand visible, `Inbox` not `Nudges`)

### P2 — Surface-by-surface parity (in this order)

1. **Home** — port `HomePulse` + `PulseStrip` + composer hero into `HomeLanding`. Stats grid (entities/relationships/reports/from-memory) + 3 prompt cards + lane chips.
2. **Chat** — adopt the kit's continuous-thread layout from `ChatStream.jsx` over the legacy single-shot answer view. Right rail (entity card / sources / prior threads / report status) + universal composer.
3. **Reports** — port `ReportCard` thumbnail-grid mode + filter tabs (`All / Verified / Review / Watching`) + Grid/List toggle into `ReportsHome` (Enhanced exists; check feature flag).
4. **Inbox** — port `NudgeList` color-coded severity rules (act-now terracotta, auto-handled green, watching purple, fyi muted) into nudges views.
5. **Me** — port `EntityNotebook` profile card + side menu (`ACCOUNT / PREFERENCES / WORKSPACE`) + watched-entities list into `MeHome`.

### P3 — Tweaks panel (new feature, optional polish)

- [ ] Port `tweaks-panel.jsx` as a global floating overlay. Drives `data-pace` / `data-texture` / `--feel-density` and per-surface preferences. Persist in localStorage. Gate behind `?tweaks=1` URL param for first ship.

## Verification protocol per surface

1. `npx http-server ui_kits -p 5300` → screenshot `localhost:5300/nodebench-web/index.html?surface=<name>` (kit reference)
2. Live React: `npm run dev` → screenshot `localhost:5200/?surface=<name>` (current state)
3. Diff side-by-side. Implement only the visible deltas — preserve Convex wiring.
4. `npx tsc --noEmit && npm run build`
5. Re-screenshot live React. Compare to kit.
6. Test light + dark via `data-theme="dark"` on `<html>`.
7. Targeted Vitest suites for the touched surface.
8. Update this doc — check off the surface.

## Known divergences (kit ≠ current live app)

- **Kit Inbox uses "Inbox" label**, current live nav may use "Nudges" — locked nav says `Inbox`, align.
- **Kit Me page is titled "Notebook"**, not "Me" — the surface tab is "Me", the H1 is "Notebook".
- **Kit Reports has Grid + List toggle**; current live may default to one. Toggle should match `tweaks.reportsView`.
- **Kit ChatStream is multi-turn continuous thread** with right-rail entity card; live has 3 progression variants (`ChatHome` / `ChatHomeEnhanced` / `ChatHomePremium`) — pick one, retire the other two.
- **Kit Memory Pulse stats** (42.8k entities, 71% from memory) are demo numbers — live should pull from real Convex telemetry.

## Audit trail

- Original packet README: `docs/design/nodebench-ai-design-system/HANDOFF.md`
- Project README (full design system): `docs/design/nodebench-ai-design-system/README.md`
- Skill manifest: `docs/design/nodebench-ai-design-system/SKILL.md`
- Iteration chats: `docs/design/nodebench-ai-design-system/chats/chat1.md`, `chat2.md`
- Screenshots from packet: `docs/design/nodebench-ai-design-system/screenshots/` (31 files)
- Scraps + drafts: `docs/design/nodebench-ai-design-system/scraps/` (23 files)

## Related rules

- `docs/runbooks/PROD_PARITY_UI_KIT_WORKFLOW.md` — workflow for any UI-kit refresh
- `.claude/rules/dogfood_verification.md` — must screenshot every surface before declaring done
- `.claude/rules/live_dom_verification.md` — never claim "shipped" without fetching the live URL
- `.claude/rules/reexamine_design_reduction.md` — Jony Ive principles on what to keep vs remove
