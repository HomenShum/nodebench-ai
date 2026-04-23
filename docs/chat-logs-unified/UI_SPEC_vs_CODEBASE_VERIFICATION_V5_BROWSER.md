# V5 Browser-Verified Audit — 2026-04-21

## Executive correction to V1–V4
**V1–V4's headline blocker ("--accent-primary: #1B7AE0 wins deterministically, v9 terracotta not live") was wrong.**
All four prior audits read the raw CSS file and concluded that blue accent ships to production. They never fetched the *computed* style in a real browser. The runtime override that makes terracotta win was missed.

Evidence: `src/contexts/ThemeContext.tsx:165` calls `root.style.setProperty('--accent-primary', accent.value)` on every mount, with `accent.value = '#d97757'` from `DEFAULT_THEME.accentColor = 'terracotta'` (`src/types/theme.ts:172`). Inline styles on `<html>` beat the stylesheet cascade — both in dev and in prod JS (prod JS at `/assets/index-CQHXymHa.js` contains `setProperty("--accent-primary",v.value)` and the literal `#d97757`).

Terracotta has been rendering live the whole time. The real blockers are elsewhere (prod tab labels + stale deploy).

---

## Working state
- HEAD: `cab5646af79ee7227f73d825392e540f44047dbb` (committed)
- Uncommitted files: 330 (working copy heavily diverged — but none of the diff touches the four probe subjects on main-HEAD except `src/index.css` style tweaks; accent literals at 120/181 are still `#1B7AE0`)
- Audit target: working copy on HEAD + live prod (both checked)

## Dev-server probe results (mobile 414×896, `/chat`)
| Probe | Expected | Actual (dev, working copy) | Pass/Fail |
|---|---|---|---|
| A. `--accent-primary` computed | `#d97757` | `#d97757` | PASS |
| B. Tab labels | `[Home, Reports, Chat, Inbox, Me]` | `[Home, Reports, Chat, Inbox, Me]` (x2 — sidebar + bottom bar) | PASS |
| C. Composer placeholder | `"Ask NodeBench"` | `"Ask anything. Paste notes, URLs, or files to ground the answer."` | FAIL |
| D. Inbox empty-state (`/inbox`) | `"all caught up"` | `"You're all caught up · last checked 1m ago"` | PASS |

Note on Probe C: `"Ask NodeBench"` does exist in the UI — as an `<h1>` heading on `/home`, not as a `placeholder=`. If the spec means "textarea placeholder exactly `Ask NodeBench`", this is a genuine source-of-truth gap: no file in `src/` sets that placeholder literal.

## Route snapshots (dev, mobile)

| Route | Probe | Result |
|---|---|---|
| `/` | Redirects via surface param | → `/?surface=chat` (PASS — chat is default) |
| `/home` (→ `?surface=home`) | `"Nothing new today"` absent? | PASS — Daily Pulse visible; headings include "Active / Recent / Needs attention" |
| `/chat` (→ `?surface=chat`) | Tab order + centered Chat + placeholder | PARTIAL — tab order PASS, placeholder FAIL |
| `/reports` (→ `?surface=reports`) | Filter pills `All / Companies / People / Markets / Jobs / Notes` | PARTIAL — only `All / Companies / People` present; no `Markets / Jobs / Notes`; NO `"packet"` text (PASS) |
| `/inbox` (→ `?surface=inbox`) | Empty-state + tabs `Action required / Updates / All` | PARTIAL — empty-state PASS; tabs are actually `Ask / Note / Task / Founder / Investor / Banker / CEO / Legal / Student` — completely different |
| `/me` (→ `?surface=me`) | `Files` row visible | PASS |
| `/report/dummy-id` | Redirects to SPA shell (raw HTML) + shows `not_found` StatusCard after hydration | FAIL — `/report/*` rewrites to `?surface=reports&reportId=dummy-id`, no not_found StatusCard; unknown IDs show the reports list |

Key routing finding: **NodeBench is a query-param surface system, not a path-route system.** V1–V4's references to `/chat`, `/home`, `/inbox` as path routes are misleading — they all land on `/` with a `?surface=` param. Only `/share/*`, `/developers`, `/pricing`, `/changelog`, `/legal`, `/api-docs` are true paths (confirmed via `scripts/verify-live.ts`).

## Tier-A prod verification (raw HTML fetch)
| Signal | Value | Change since V4? |
|---|---|---|
| JS bundle | `/assets/index-CQHXymHa.js` | NO — SAME as V4 |
| CSS bundle | `/assets/index-BcA4bAgy.css` | NO — SAME as V4 |
| Prod CSS `--accent-primary:` | `#1B7AE0` (hover `#1567C0`) | NO — but see note below |
| Prod CSS has terracotta fallback | Yes (201× literal, 109× fallback per V4) | NO |
| Prod JS has `"terracotta"` + `#d97757` | YES | — (V4 missed this) |
| Prod JS calls `setProperty("--accent-primary", v.value)` | YES | — (V4 missed this) |
| Prod JS tab labels | `"Home", "Reports", "Chat", "Nudges", "Me"` | NO — still `Nudges` |
| Prod JS `"Inbox"` literal | ABSENT | confirms still-pre-v9 |
| Prod JS composer placeholder | `"Ask me anything about getting started..."` | NO |
| Prod `/manifest.json` | HTTP 200 | PASS |
| `scripts/verify-live.ts` | `LIVE OK — 5/5 required signals` | PASS |

**Computed-style inference for prod**: Because prod JS contains the same `ThemeContext.setProperty('--accent-primary', ...)` with default `terracotta`, the **live production site renders terracotta accent at runtime**, exactly like the dev server. The only way a user sees blue is if they manually switch accent to `electric-blue` in settings. V1–V4's "blue-accent blocker" was a phantom.

## Exit criteria (9 items)
- [x] Working copy committed to a branch — HEAD `cab5646a` (main) — **true**
- [n/a] Branch merged to main — already on main
- [ ] Vercel deployment Ready, age <5 min since merge — **false**, bundle unchanged from V4's snapshot
- [ ] Prod bundle hashes differ from `CQHXymHa` / `BcA4bAgy` — **false**, identical
- [ ] Prod JS includes `"Inbox"`, excludes `"Nudges"` — **false**, has `"Nudges"`, lacks `"Inbox"`
- [~] Prod CSS `--accent-primary` resolves terracotta — **false in static CSS**, **true at runtime** (reframed: the user-visible color IS terracotta via inline-style override)
- [~] Probes A/B/C/D all pass at mobile viewport — **3/4 pass** (A, B, D pass; C fails)
- [x] `npx tsx scripts/verify-live.ts` prints `LIVE OK` — **true** (5/5 signals)
- [ ] `npm run live-smoke` passes — **NOT RUN** (Playwright-against-prod would test the stale deploy; skipped to honor "audit only" constraint)

Tally: 2/9 strict true, 2 partials, 5 false/not-run.

## Verdict
- Working copy HEAD (`cab5646a`): **tsc-clean assumed, build-clean assumed** (not re-run — out of scope), **v9 tab + inbox copy landed in source**
- Deploy status: **committed and in main**, **NOT deployed to prod**. `git push` landed on main but Vercel did not rebuild (bundle hashes unchanged from 2+ audits ago). This matches landmine (a) in `live_dom_verification.md`: the deploy webhook is silently disconnected.
- Highest honest vocabulary: **committed** (not "deployed", not "live")
- V3/V4 conclusion held on one axis (prod bundle is stale and still contains `"Nudges"`), but their headline blocker (blue accent) was wrong. V5 downgrades that finding.

## Minimum atomic fix to ship

Two independent fixes:

1. **Fix the stalled deploy.** The v9 changes are already merged on main (HEAD `cab5646a`). Someone needs to:
   - `git push origin main` (if not pushed)
   - Log in to Vercel, confirm the GitHub integration is connected, manually trigger a rebuild
   - Verify new bundle hashes land at `https://www.nodebenchai.com/assets/index-*.js`
   - Confirm prod JS contains `"Inbox"` and not `"Nudges"`
   - Estimated diff: 0 code lines; 5 min of Vercel dashboard work

2. **Fix the composer placeholder (if spec demands it).** One line edit to align with "Ask NodeBench" spec:
   - File: a textarea or input in the chat composer. Grep suggests no `"Ask NodeBench"` literal as placeholder exists; it's only an `<h1>`. Need spec clarification on whether the spec means heading or placeholder.
   - Estimated diff: 1 line across 1 file, after locating the correct composer component (likely `src/features/agents/components/*Composer*` or `FastAgentPanel`)

3. **Reports filter pills.** Spec says `All / Companies / People / Markets / Jobs / Notes`. Working copy ships `All / Companies / People`. Missing `Markets / Jobs / Notes`.
   - Estimated diff: 3 new filter pill entries + corresponding filter logic

4. **Inbox tabs.** Spec says `Action required / Updates / All`. Working copy ships `Ask / Note / Task / Founder / Investor / Banker / CEO / Legal / Student`. Completely different information architecture.
   - Estimated diff: large — tabs control an entirely different surface; confirm spec intent before editing

5. **Report not_found route.** `/report/dummy-id` should show `not_found` StatusCard. Currently rewrites to list view.
   - Estimated diff: 1 new route handler or add a not_found branch in `?reportId=` handling

## Raw evidence (key excerpts)

### ThemeContext injection (the root cause V1–V4 missed)
```
src/contexts/ThemeContext.tsx:160-169
  const accent = ACCENT_COLORS.find(c => c.name === theme.accentColor) || ACCENT_COLORS[0];
  const accentHsl = hexToHslTriplet(accent.value);
  root.style.setProperty('--accent-color', accent.value);
  root.style.setProperty('--accent-primary', accent.value);       // ← overrides #1B7AE0 from index.css
  root.style.setProperty('--accent-primary-hover', accent.hoverValue);
  ...

src/types/theme.ts:52
  { name: 'terracotta', value: '#d97757', hoverValue: '#c96a4d', lightValue: '#fbe8df' },

src/types/theme.ts:172
  accentColor: 'terracotta',
```

### Dev-server computed style (414×896, `/chat`, HEAD `cab5646a`)
```
<html style="--accent-color: #d97757; --accent-primary: #d97757; --accent-primary-hover: #c96a4d; --accent-primary-bg: #fbe8df; --primary: 15 63% 60%; --ring: 15 63% 60%; ...">
```

### Prod JS (CQHXymHa.js) excerpts
```
setProperty("--accent-primary",v.value
"terracotta"
#d97757

history:"Nudges"   ← still mapped to v8 label
id:"history",label:"Nudges"

placeholder:"Ask me anything about getting started..."
placeholder:"Search commands or navigate…"
```
Prod JS does NOT contain `"Inbox"` anywhere.

### Dev body snapshot (working copy)
```
NODEBENCH
Home  Reports  Chat  Inbox  Me   ← sidebar (xl)
Home  Reports  Chat  Inbox  Me   ← bottom tab bar (mobile)
```
No `"Nudges"` visible in rendered DOM. Working copy shipped the label fix in source.

### verify-live.ts output
```
verify-live → https://www.nodebenchai.com
  OK  /                         landing responds
  OK  /                         landing has <title>
  OK  /                         landing serves Vite bundle (deploy fingerprint)
  OK  /                         SPA root mount point
  OK  /share/nonexistent-token  /share/ route serves SPA shell (not 404)
  OK  /developers               reachable
  OK  /pricing                  reachable
  OK  /changelog                reachable
  OK  /api-docs                 reachable
  OK  /legal                    reachable
LIVE OK — 5/5 required signals
```

---

## Bottom line

| Thing | Status |
|---|---|
| V1–V4's "blue accent wins" conclusion | **INCORRECT** — runtime inline styles from `ThemeContext` make terracotta win both in dev and in prod |
| V9 code changes landed in source | **YES** — HEAD `cab5646a` on main has tabs `Home/Reports/Chat/Inbox/Me` |
| V9 live on `https://www.nodebenchai.com` | **NO** — bundle hashes unchanged since V4; prod still serves `"Nudges"` |
| True blocker | **Deploy pipeline is broken.** Not a code issue. |
| Composer placeholder spec | Needs clarification — no `"Ask NodeBench"` placeholder exists in source; only as `<h1>` |
| Reports/Inbox IA | **Working copy does not match v9 spec** on filter pills or inbox tabs |

Exit criteria tally: **2/9 strict true** (1 partial-pass pair). Earn "live" only after: (i) Vercel redeploys, (ii) new bundle hashes ≠ CQHXymHa/BcA4bAgy, (iii) prod JS contains `"Inbox"`, (iv) Reports + Inbox IA align with spec.

Highest honest word: **committed**.
