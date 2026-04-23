# UI Spec Verification V2 — Post-v9 Rollout

Generated 2026-04-21. Independent file-level + live-DOM re-verification of claimed v9 mobile IA rollout. Read-only audit. Worktree: `.claude/worktrees/festive-mclaren-0555d3`.

---

## Executive summary

- **Prior landmines resolved: 0 of 8** (1 partially addressed)
- **New claimed fixes verified: 0 of 5**
- **Live UI status:** preview sandbox blocked to port 5191 (nothing listening there). Verified via raw HTTP fetches against local dev (port 5173, reachable) and live prod (`https://www.nodebenchai.com`). Both confirm the v9 rollout has NOT landed at the code or deploy level.
- **Remaining P0s:** the same 8 from the previous audit, plus the false-positive rollout claim itself.

The user-claimed "v9 rollout is complete and agent-browser checks passed" is not supported by the code in this worktree or the deployed production bundle. Either the verification was run against a different branch/worktree, or the claim is mis-attributed.

---

## Prior landmine resolution table

| # | Landmine | Path:line | Status | Evidence (literal text) |
|---|---|---|---|---|
| 1 | Accent blue `#1B7AE0` | `src/index.css:120` (light) and `:181` (dark) | **STILL OPEN** | L120: `--accent-primary: #1B7AE0;` · L181: `--accent-primary: #1B7AE0;` · L122: `--accent-primary-bg: rgba(27, 122, 224, 0.08);` · L184: `--accent-primary-hover: #1567C0;`. Terracotta `#d97757` appears only in `--paper-margin` / `--paper-rule` notebook-theme vars (L136–137, L192). Confirmed on live prod at `/assets/index-BcA4bAgy.css` — contains `--accent-primary: #1B7AE0` twice. |
| 2 | Tab order wrong | `src/layouts/MobileTabBar.tsx:26–31` | **STILL OPEN** | L26–31: `{id:"ask",label:"Home"}, {id:"workspace",label:"Chat"}, {id:"packets",label:"Reports"}, {id:"history",label:"Nudges"}, {id:"connect",label:"Me"}`. Spec demands `Home / Reports / Chat(centered) / Inbox / Me`. Actual is `Home / Chat / Reports / Nudges / Me`. Chat is position 2, not centered. No icon size variance (`h-6 w-6` for all at L75). No `-translate-y-[2px]` lift. Confirmed on live prod entry bundle: `label:"Nudges"` ×3, `label:"Inbox"` = 0. |
| 3 | Button primary inverted | `src/shared/ui/Button.tsx:31` | **STILL OPEN** | L31: `primary: 'bg-content text-surface hover:bg-content/90 shadow-sm hud-ripple'`. Renders off-white background with dark label — not spec's `bg-accent-500 text-text-inverse` (terracotta). Still 5 variants (`primary|secondary|ghost|danger|success`), spec wants 3. Press-scale not spec-compliant either. |
| 4 | No `SourceChip` primitive | `src/**/SourceChip*` glob → 0 hits | **STILL OPEN** | No file matches `SourceChip*` in `src/`. The 5 ad-hoc implementations flagged previously remain in place: `src/features/strategy/views/ProductDirectionMemoView.tsx`, `src/features/strategy/views/ExecutionTraceView.tsx`, `src/features/research/components/PersonalPulse.tsx`, `src/features/calendar/components/agenda/AgendaMiniRow.tsx`, `src/features/agents/components/FastAgentPanel/FusedSearchResults.tsx`. |
| 5 | Pulse `createSampleBrief` fake-data fallback | `src/features/research/hooks/useBriefData.ts:26` and `:243` (**file moved from `src/features/home/hooks/` to `src/features/research/hooks/`**) | **STILL OPEN** | L26: `function createSampleBrief(dateString: string): DailyBriefPayload {`. L243: `return { executiveBrief: createSampleBrief(dateToUse), isUsingFallback: true };`. No 18-hour staleness suppression. Callers receive hardcoded sample instead of `null`. Violates spec §3.9 "auto-suppress when stale >18h or items<3". |
| 6 | Convex schema naming | `convex/schema.ts` | **STILL OPEN** | L1170: `const chatThreadsStream = defineTable({...})`. L1193: `const chatMessagesStream = defineTable({...})`. `grep` for spec names `'reports'`, `library_items`, `inbox_items`, `notebook_blocks`, `shares`, `chat_threads` → 0 hits. No table named `reports` in the single-file schema. None of the 11 spec-required canonical tables exist verbatim. |
| 7 | PWA absent | `vite.config.ts`, `public/` | **PARTIALLY ADDRESSED** | `vite-plugin-pwa@^1.2.0` installed (`package.json:348`), `VitePWA` imported (`vite.config.ts:7`), plugin configured (`vite.config.ts:169–245`) with Workbox + autoUpdate + Google-Fonts caching. BUT: manifest inline in config only ships ONE icon (`/favicon.svg` sized `192x192`, L180–183) — spec requires 180 (apple-touch), 192, and 512 PNG icons. No `public/manifest.json` standalone file. No `apple-touch-icon.png`, no `icon-192.png`, no `icon-512.png`. Install-prompt handler not found. Live prod HTML DOES include `<link rel="manifest"...>` confirming plugin emits one at build-time — but icon coverage incomplete. |
| 8 | Preview rendered blank at mobile viewport | Preview sandbox | **STILL OPEN** (different root cause) | Preview tool (`mcp__Claude_Preview__preview_start`) started a sandbox-internal shell on port 5191, but NO process is listening on 5191 (verified via `netstat -an | findstr ":5191"` — no LISTENING entry). `launch.json` declares port 5191 with `autoPort: true`, but the Vite dev server launched by the harness instead is running on 5173 (found via netstat + 10 822-byte HTML response). Preview sandbox refuses external navigation (`chrome-error://chromewebdata/` when redirected to `localhost:5173` or `https://www.nodebenchai.com`). Blank-render root cause: the sandbox port and the actual dev-server port diverged. Raw-HTML/bundle verification below replaces the visual pass. |

Score: **0/8 closed, 1/8 partial (PWA plumbing partial), 7/8 still open.**

---

## New fix verification table

| # | Claim | File:line | Verified? | Evidence |
|---|---|---|---|---|
| A | Bare mobile root routes resolve to Chat | `src/lib/registry/viewRegistry.ts:191` + `:591–598` | **NO** | L191: `path: "/"` still points to `id: "control-plane"` (surface `ask` = Home). `SURFACE_DEFAULT_VIEW.workspace = "chat-home"` exists (L593) but the bare-root entry remains Home. No mobile-responsive redirect logic (user-agent or viewport check) wired in `viewRegistry.ts`. `SURFACE_TITLES.history = "Nudges"` still (L604) — the "Inbox" rename never landed. |
| B | Test asserting bare-root → Chat | `src/lib/registry/viewRegistry.test.ts` | **NO** | 105-line file. Tests exist for `resolvePathToCockpitState("/", "?surface=ask|home|chat")` (L50, 54, 58) — these assert EXPLICIT `?surface=chat` resolves to Chat. NO test asserts bare `/` (no query string) on mobile resolves to Chat. Closest match is L45: `buildCockpitPath({surfaceId:"workspace"})` → `"/?surface=chat"` — constructive, not resolution. |
| C | Inbox empty-state copy tightened | `src/features/nudges/views/NudgesHome.tsx` | **NO** | Filter taxonomy at L28: `type NudgeFilter = "priority" \| "watch" \| "all"` — spec wants `action_required / updates / all`. Filter labels at L260–261: `"Priority"` and `"Watchlist"` — spec wants `"Action required"` and `"Updates"`. Grep for spec copy (`all caught up`, `No fresh updates`, `Nothing waiting on you`, `last checked`) → **0 hits** across the 534-line file. L361 copy reads `"Create your first report. We'll watch it for you."` — this is the actual empty state today, unrelated to spec. |
| D | Test asserting new empty-state copy | `src/features/nudges/views/NudgesHome.test.tsx` | **NO** | Tests at L146–194 cover an empty state but assert `/all quiet/i` (L158), `/create your first report\. we'll watch it for you\./i` (L160), `/start a run/i` (L162), `/open a saved report/i` (L163). NONE of the three spec phrases (`You're all caught up`, `No fresh updates`, `Nothing waiting on you`) appear. The test does guard against old copy ("Nothing urgent right now" L178) but locks in the WRONG copy per spec. |
| E | Dogfood Chat composer v9 — "Ask NodeBench" | `tests/e2e/full-ui-dogfood.spec.ts` | **NO** | 340-line file. L300: `page.getByLabel("Ask anything or upload anything")` — this is the HOME composer label, not spec's "Ask NodeBench" Chat composer. L306 + L330: `page.getByLabel("Continue the live session")` — Chat is reached via "Continue the live session" button, not an "Ask NodeBench" composer. Grep for literal `"Ask NodeBench"` → **0 hits** in this file. |

Score: **0/5 claims verified.**

---

## Live UI observations

### Infrastructure state

- Preview MCP sandbox: serverId `25e692c9-c8d1-4f7f-a9d4-bbc7df372531` started on port 5191. **Nothing listening on 5191** (netstat confirmed). Preview defaults to an internal "Awaiting server…" placeholder page (`bodyLen=248`, `rootChildCount=0`, URL is `data:text/html;...`).
- Preview attempts to navigate to `http://localhost:5173` and `https://www.nodebenchai.com/` resolved to `chrome-error://chromewebdata/` with `bodyLen=0` — sandbox refuses external navigation.
- Actual dev server **is** running on port 5173 (confirmed via `netstat` + `fetch('http://localhost:5173')` returning 10 822-byte Vite shell HTML with `/@vite/client` + `/src/main.tsx`).

### Raw-HTML + bundle verification (replacement for visual pass)

Since the preview sandbox is isolated, I executed the rule from `live_dom_verification.md` — Tier A raw-HTML grep against local dev + live prod:

**Local dev (port 5173)**: Vite transform of `src/layouts/MobileTabBar.tsx` returned literal source:
```
const TABS = [
  { id: "ask", label: "Home", icon: Home },
  { id: "workspace", label: "Chat", icon: MessageSquare },
  { id: "packets", label: "Reports", icon: FileText },
  { id: "history", label: "Nudges", icon: Bell },
  { id: "connect", label: "Me", icon: User }
];
```
Order and label identical to the file at `src/layouts/MobileTabBar.tsx:26–31`. **No v9 change landed locally.**

**Live prod (`https://www.nodebenchai.com`)**: Entry bundle `/assets/index-CQHXymHa.js` (220 104 bytes) content-matrix:

| Signal | Count |
|---|---|
| `label:"Nudges"` | 3 |
| `label:"Inbox"` | **0** |
| `label:"Home"` / `"Chat"` / `"Reports"` / `"Me"` | 3 each |
| `"Ask NodeBench"` | 1 (appears somewhere, probably chat panel branding) |
| `"Continue the live session"` | 0 (deferred chunk or stripped) |
| `"Ask anything or upload anything"` | 0 (deferred chunk) |
| `"all caught up"` (spec empty-state) | 0 |
| `"No fresh updates"` (spec empty-state) | 0 |
| `"Nothing waiting on you"` (spec empty-state) | 0 |
| `"all quiet"` (current empty-state) | 0 (deferred chunk) |
| `"Create your first report"` (current empty-state) | 0 (deferred chunk) |

CSS bundle `/assets/index-BcA4bAgy.css` (399 862 bytes):
- `--accent-primary: #1B7AE0` defined **twice** (light + dark modes)
- Both `#d97757` (terracotta) and `#1B7AE0` (blue) present — blue is the primary variable, terracotta only as fallback literals

### Per-route observations

Because the preview sandbox couldn't reach the dev server, per-route visual snapshots (`/`, `/home`, `/chat`, `/reports`, `/inbox`, `/me`, `/pulse`) could not be captured. The file + bundle evidence is decisive without them: **no v9 routing/label change shipped**, so any visual pass would render `Home / Chat / Reports / Nudges / Me` in blue.

---

## Remaining P0s after this pass

All 8 prior landmines persist (1 partial via PWA plugin install, 7 fully open). Plus:

- **P0-new-1: Claim/reality gap.** The user-reported passing verifications (`tsc`, `build`, `dogfood:verify`, agent-browser checks) appear to have been run against a different branch or never actually exercised the IA/label/accent contract. Before any further sprint, reconcile: which worktree did those checks pass on, and why does `festive-mclaren-0555d3` not reflect them?
- **P0 still open from prior audit:** 1) flip accent token to terracotta; 2) reorder + center-emphasize Chat; 3) rename Nudges→Inbox in MobileTabBar + viewRegistry.ts; 4) fix Button primary inversion; 5) create SourceChip primitive; 6) suppress stale Pulse instead of `createSampleBrief`; 7) align Convex schema vocabulary; 8) full PWA icon set (180/192/512 PNGs).

---

## Newly discovered issues (regressions or missed items)

1. **File moved, line number drift.** Prior audit listed `src/features/home/hooks/useBriefData.ts:26`. The file now lives at `src/features/research/hooks/useBriefData.ts:26`. Still the same content — `createSampleBrief` at L26, fallback invocation at L243. No regression, just a path update for the next audit.
2. **Port mismatch between `.claude/launch.json` and active dev server.** `launch.json` declares port 5191; actual Vite runs on 5173. This makes every `preview_*` MCP call useless for this worktree. Either update `launch.json` to target 5173, or stop the 5173 server before `preview_start`. This is why "preview rendered blank" in the prior audit reproduces here.
3. **`SURFACE_TITLES.history = "Nudges"`** (viewRegistry.ts:604) and `SURFACE_DEFAULT_VIEW.history = "nudges-home"` (L595) — in addition to `MobileTabBar.tsx:29`. Inbox rename is a 3-site flip, not 1. (Plus `SURFACE_PARAM_ALIASES` at ~L81 already has the `history↔nudges` alias capable of supporting an `"inbox"` third alias cleanly.)
4. **NudgesHome.test.tsx actively locks in non-spec copy.** The empty-state tests (L155–193) assert `"all quiet"` + `"Create your first report..."` as the correct state. Per spec §4.8 those are wrong. The test file will need updating alongside the component to land claim C.
5. **Dogfood spec drifts from v9 contract.** `full-ui-dogfood.spec.ts:300–330` tests `"Ask anything or upload anything"` + `"Continue the live session"`. Per spec §4.1–4.3 the canonical Chat composer label is `"Ask NodeBench"`. The dogfood harness is NOT updated to v9 — and currently serves as a regression shield for the pre-v9 contract.
6. **Entry bundle contains `"Ask NodeBench"` once** — this was in the prior ask-panel branding, not the Chat composer. Grep confirms the current Chat surface uses different labels. The claim that "Ask NodeBench" composer contract is live is not supported.

---

## Suggested sequencing (if resuming v9 work)

1. **Fix the feedback loop first.** Reconcile `launch.json` port with the active Vite port, or explicitly stop 5173 before `preview_start`. Until the preview sandbox can reach the dev server, each pass degrades to a file-grep audit.
2. **Land P0-1 (accent token flip) before visual review** — it unblocks the identity question and every subsequent screenshot.
3. **Land P0-2 + P0-3 (tab reorder + Nudges→Inbox rename) as an atomic commit** — reorder requires position 3 to be Chat; rename requires the alias + title + label flip.
4. **Update dogfood + NudgesHome tests IN THE SAME PR as the component change** — otherwise the tests that currently PASS will start FAILING on the correct behavior.
5. **`createSampleBrief` suppression** — the simplest change: gate on `updatedAt` freshness and item count, return `null` when stale; let PulseCard caller choose fallback.
6. **PWA icon set** — mechanical add of 180/192/512 PNGs and extend manifest icons array.

---

## Verification methodology note

- File reads via `mcp__plugin_context-mode_context-mode__execute_file` to avoid flooding context (files quoted verbatim, only summary printed).
- Live-prod fetch via Node sandbox (`fetch('https://www.nodebenchai.com/...')`) per `live_dom_verification.md`.
- Bundle grep for deploy-level evidence (tab labels, color tokens, spec copy).
- Preview sandbox attempted but unusable due to port mismatch (documented above).
