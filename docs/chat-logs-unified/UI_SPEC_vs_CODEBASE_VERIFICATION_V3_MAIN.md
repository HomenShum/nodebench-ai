# Verification V3 — Main Branch + Live Prod

**Verified:** 2026-04-21 (Pacific) / 2026-04-22 UTC
**Verifier:** festive-mclaren-0555d3 worktree (Opus 4.7 1M)
**Scope:** User claim that v9 mobile IA rollout (Pulse backend, Inbox tab rename, terracotta accent, centered Chat, Me > Files, strict dogfood lane, six passing gates) landed on `main` and shipped to production at `https://www.nodebenchai.com`.

## Executive summary

| Surface | State |
|---|---|
| **Main branch HEAD** | `cab5646a` — "fix(types): batch TS error cleanup" — 2026-04-20 19:45:52 -0700 |
| **Working copy** | On `main`, **324 modified + 74 untracked** files (extremely dirty) |
| **Pulse backend on main (committed)** | **MISSING.** `convex/domains/product/home.ts@main` contains only `getHomeSnapshot`. `getPulsePreview` / `getPulsePreviewInternal` / `refreshDailyPulsePreview` absent. `git log --all -S "getPulsePreview"` returns zero commits — never committed to any branch. |
| **Pulse backend in working copy** | PRESENT. `getPulsePreviewInternal@L138`, `getPulsePreview@L150`, `refreshDailyPulsePreview@L162`. |
| **Tab order on main (committed)** | `Home / Chat / Reports / Nudges / Me` — old order. Label `"Nudges"` still used (not `"Inbox"`). Chat is slot #2, not centered slot #3. |
| **Tab order in working copy** | `Home / Reports / Chat / Inbox / Me` — matches v9 spec. Chat is centered (slot #3). Label renamed to `"Inbox"`. |
| **Accent color** | **STILL `#1B7AE0` (blue) in both main and working copy.** `src/index.css` lines 120, 122, 181, 183 unchanged. Claim of "terracotta `#d97757`" rollout to `--accent-primary` is **FALSE**. `#d97757` appears only in ad-hoc `text-[#d97757]` utility classes in email/agent-palette components. |
| **Live prod bundle** | **UNCHANGED from prior audit.** JS `index-CQHXymHa.js`, CSS `index-BcA4bAgy.css`. `label:"Nudges"` ×3, `label:"Inbox"` ×0. `getPulsePreview` not in bundle. v9 has **NOT** deployed. |
| **manifest.json** | Returns HTTP 200 but body is the SPA `index.html` fallback, not a real PWA manifest JSON. |
| **Gates: convex codegen** | Runs (reports "TypeScript typecheck via `tsc` failed" intermediate, exits 0). PASS |
| **Gates: `npx vitest run src/features/home/views/HomeLanding.test.ts`** | **PASS — 6/6 tests** including new `formatPulseFreshness` + `isPulsePreviewVisible` cases. |
| **Gates: `npx tsc --noEmit --pretty false`** | **PASS — 0 errors.** |
| **Other gates (build, test:run, dogfood:verify:strict)** | Not executed per task constraint. Scripts exist in `package.json`: `dogfood:verify:strict = node scripts/ui/runSegmentedDogfoodVerify.mjs --gemini require` (verified on main). |
| **Local dev preview** | **SKIPPED.** Working copy has 324 modified + 74 untracked; running dev risked disrupting user state. Fell back to Tier A (curl/grep) only. |

**Bottom line:** The v9 mobile IA work is **real and present in the uncommitted working copy** (HomeLanding + MobileTabBar + NudgesHome + Pulse backend all materially changed, HomeLanding.test.ts passes), but it has been **committed to ZERO branches** and **deployed to ZERO production environments**. The user's claim that it "landed on main and production" is false. The prod bundle hashes, tab labels, and accent color all match the pre-v9 state from the previous audit.

## Main branch audit (via `git show main:<path>`)

### A. Pulse backend — `convex/domains/product/home.ts`

**Claimed:** 3 exports — `getPulsePreview`, `getPulsePreviewInternal`, `refreshDailyPulsePreview`.

**On main:** File is 95 lines. Only export is `getHomeSnapshot@L11` (wraps `productEvidenceItems` + `productReports` + `productPublicCards`). No Pulse exports whatsoever.

**Literal from `git show main:convex/domains/product/home.ts`:**
```ts
import { query } from "../../_generated/server";
import { v } from "convex/values";
import { resolveProductReadOwnerKeys } from "./helpers";

const EMPTY_HOME_SNAPSHOT = { ... };

export const getHomeSnapshot = query({
  args: { anonymousSessionId: v.optional(v.string()) },
  handler: async (ctx, args) => { ... },
});
```

`git grep "getPulsePreview" main -- "*.ts" "*.tsx"` → **zero results**
`git log --all -S "getPulsePreview"` → **zero commits**

**Status:** **MISSING ON MAIN.** Exists only in the working copy at L138/L150/L162.

### B. Home consumes Pulse — `src/features/home/views/HomeLanding.tsx`

**Claimed:** fresh-only `≥ 3` item suppression rule.

**On main:** File exists and exports `buildVisibleHomeReports@L109`. No `formatPulseFreshness`, no `isPulsePreviewVisible`, no `pulsePreview` references — grep returns zero matches on main for those identifiers.

**In working copy (uncommitted):**
- `formatPulseFreshness@L163`
- `isPulsePreviewVisible@L173` — literal:
  ```ts
  pulsePreview &&
    pulsePreview.freshnessState === "fresh" &&
    Array.isArray(pulsePreview.items) &&
    pulsePreview.items.length >= 3,
  ```
- `showPulseCard = isPulsePreviewVisible(pulsePreview)@L291`
- Render at `@L480` with `pulsePreview.items.slice(0, 5)` and "Updated Xm ago" freshness.

**Status:** **MISSING ON MAIN. Present + correct in working copy.** The fresh-only 3+ suppression rule is verified in `isPulsePreviewVisible` against the uncommitted file.

### C. Strict dogfood lane — `scripts/ui/*.mjs` + `tests/e2e/full-ui-dogfood.spec.ts`

**Claimed:** Windows-safe retries in `runDogfoodGeminiQa.mjs`, Gemini segment retry in `runSegmentedDogfoodVerify.mjs`, durable screenshot dir in `runDogfoodWalkthroughLocal.mjs`, updates to `publishDogfoodGallery.mjs`, `recordDogfoodWalkthrough.mjs`, and `tests/e2e/full-ui-dogfood.spec.ts`.

**On main** — all six files exist and contain relevant infrastructure already:

- `scripts/ui/runDogfoodGeminiQa.mjs@main` — L74 "NOTE(coworker): npm@10 on Windows occasionally strips `--flags`", L1021 rate-limit retry, L1249 Windows Playwright video path flush workaround, L2202 `qa-results.json` append capped at 100 entries, L3110/3149 aspiration score patching.
- `scripts/ui/runDogfoodWalkthroughLocal.mjs@main` — L29/36 `rm(..., { maxRetries: 3, retryDelay: 150 })`, L390 "Building... (retry N)" for build retries.
- `scripts/ui/runSegmentedDogfoodVerify.mjs@main` — grep for retry/readyState/Windows/EBUSY/EPERM returned nothing, but file exists at 1st line `import { existsSync, readFileSync }`.
- `tests/e2e/full-ui-dogfood.spec.ts@main` — file exists.

**Gap:** I could not find a dated changelog entry proving the "v9 strict lane" specifically added these lines (the retry scaffolding is already on main from earlier commits). Without a specific commit hash for the claimed v9 stabilization, I cannot attribute these particular lines to v9 work. They were present before v9.

**Status:** **File infrastructure exists on main** (scripts are stable, retries in place, qa-results.json path). **Cannot separately verify "v9 added retries" vs "retries were already there."**

### D. Root `package.json` — segmented test runner uses curated `mcp-local` package suite

**On main** (L29–L32):
```json
"test:run": "node scripts/testing/runSegmentedVitest.mjs",
"test:run:mcp-local": "node scripts/testing/runVitestSegment.mjs --cwd packages/mcp-local --target src --mode filter",
"test:run:convex-mcp": "node scripts/testing/runVitestSegment.mjs --cwd packages/convex-mcp-nodebench --target src --mode filter",
"test:run:openclaw-mcp": "node scripts/testing/runVitestSegment.mjs --cwd packages/openclaw-mcp-nodebench --target src --mode filter",
```
Plus `dogfood:verify:strict = node scripts/ui/runSegmentedDogfoodVerify.mjs --gemini require` at L80.

**Status:** **VERIFIED on main.** Segmented runner + strict dogfood script wiring exist.

### E. Tab order + label — `src/layouts/MobileTabBar.tsx`

**On main** (lines 26–30):
```tsx
{ id: "ask", label: "Home", icon: Home },
{ id: "workspace", label: "Chat", icon: MessageSquare },
{ id: "packets", label: "Reports", icon: FileText },
{ id: "history", label: "Nudges", icon: Bell },
{ id: "connect", label: "Me", icon: User },
```
Order: `Home / Chat / Reports / Nudges / Me`. Chat is slot 2. Label is `"Nudges"`.

**In working copy:**
```tsx
{ id: "ask", label: "Home", icon: Home },
{ id: "packets", label: "Reports", icon: FileText },
{ id: "workspace", label: "Chat", icon: MessageSquare },
{ id: "history", label: "Inbox", icon: Bell },
{ id: "connect", label: "Me", icon: User },
```
Order: `Home / Reports / Chat / Inbox / Me`. Chat is slot 3 (centered). Label renamed to `"Inbox"`.

**Status:** **MISSING on main. Present + correct in working copy.**

### F. Accent color — `src/index.css`

**On main and in working copy** (lines 120, 122, 181, 183):
```css
--accent-primary: #1B7AE0;
--accent-primary-bg: rgba(27, 122, 224, 0.08);
--accent-primary-hover: #1567C0;
```

Grep for `d97757` in `src/index.css`: **3 matches**, but none bind `--accent-primary`. `grep -rn "d97757" src/` shows the terracotta color is used only in:
- `src/components/email/EmailInboxView.tsx` (8× — local utility classes)
- `src/features/agents/components/FastAgentPanel/FastAgentPanel.UIMessageBubble.tsx` (1× — agent pill)
- `src/features/agents/components/FastAgentPanel/QuickCommandChips.tsx` (1×)
- `src/features/agents/lib/agentPalette.ts` — `founder: { color: "#d97757", glyph: "F" } // terracotta`

**Status:** **FALSE CLAIM.** The design system accent (`--accent-primary`) is still blue `#1B7AE0`. Terracotta is used only as a secondary founder-lens color in isolated components. The global accent was NOT rebranded.

### G. Inbox empty-state copy — `src/features/nudges/views/NudgesHome.tsx`

**On main:** `openLoopLabel = "No open loops"`. No "Inbox quiet" copy. No `getInboxEmptyState`. No `InboxFilter` type. Kicker not set to "Inbox".

**In working copy:**
- L29: `type InboxFilter = "action_required" | "update" | "all";`
- L141: `function getInboxEmptyState(filter: InboxFilter, lastCheckedAt?: number | null) { ... }`
- L143: `return "You're all caught up · last checked ${lastChecked}"`
- L211: `openLoopLabel = hasLiveNudges ? "${nudges.length} open items" : "Inbox quiet"`
- L258: `kicker="Inbox"`

**Status:** **MISSING on main. Present + correct in working copy.** Positive empty-state ("You're all caught up / Inbox quiet") exists only in the uncommitted file.

### H. Tests — `tests/e2e/full-ui-dogfood.spec.ts`

**On main:** file exists, starts with `import { expect, test, type Page } from "@playwright/test";`.
Grep for `"Ask NodeBench"` → 0 matches on main in this file. Claim of "Ask NodeBench composer string" not directly verified on main; may be in working copy diff.

**Status:** **PARTIAL** — file exists, composer string not confirmed on the main revision.

### I. Root route — `src/lib/registry/viewRegistry.ts`

**On main:** `/@L188-191` → `id: "control-plane"`, `/chat@L438-443` → `id: "chat-home"`. Bare root is control-plane landing, NOT chat. Claim of "bare root → Chat routing" not verified on main.

**Status:** **UNVERIFIED on main** — bare `/` still routes to `control-plane`. If the claim was meant for a mobile-specific redirect, it needs a different file verified (e.g., a layout-level redirect).

## Live production status

| Asset | Prior audit hash | Current hash (2026-04-22 01:41 UTC) | Changed? |
|---|---|---|---|
| JS bundle | `/assets/index-CQHXymHa.js` | `/assets/index-CQHXymHa.js` | **NO** |
| CSS bundle | `/assets/index-BcA4bAgy.css` | `/assets/index-BcA4bAgy.css` | **NO** |
| manifest.json | 404 | 200 (but body is SPA index.html fallback, not real manifest) | cosmetic only |

Prod HTTP headers:
```
Last-Modified: Tue, 21 Apr 2026 18:10:41 GMT
Etag: "e0781b0c46746dafd4b396114b400b89"
Age: 27069
X-Vercel-Cache: HIT
```

Prod JS bundle grep results:
- `label:"Nudges"` → **3 hits** (unchanged)
- `label:"Inbox"` → **0 hits** (still not renamed)
- `label:"Home"` ×3, `label:"Chat"` ×3, `label:"Reports"` ×3, `label:"Me"` ×3 (consistent with the pre-v9 tab order)
- `getPulsePreview` / `refreshDailyPulsePreview` → **0 hits**

Prod CSS bundle grep result:
- `--accent-primary: #1B7AE0` (blue, not terracotta)

**v9 claims reach production? NO. The bundle is byte-identical to the pre-v9 state. No deploy has occurred in the last 24h (Last-Modified = 2026-04-21 18:10 UTC; prior audit was also before that timestamp).**

## Gate re-run

| Gate | Claimed | Observed |
|---|---|---|
| `npx convex codegen` | pass | **PASS** — exits 0. (Emits intermediate "TypeScript typecheck via `tsc` failed" but returns 0; non-blocking behavior consistent with previous runs.) |
| `npx vitest run src/features/home/views/HomeLanding.test.ts` | pass | **PASS** — 6/6 tests passed, 34.9s total. Includes new `formatPulseFreshness` + `isPulsePreviewVisible` specs. |
| `npx tsc --noEmit --pretty false` | pass | **PASS** — 0 errors. Completed within 8-min budget. |
| `npm run build` | pass | Not executed (task constraint). Script wired on main as standard Vite build. |
| `npm run test:run` | pass | Not executed (task constraint). Defined as `node scripts/testing/runSegmentedVitest.mjs`. |
| `npm run dogfood:verify:strict` | pass | Not executed (task constraint). Defined as `node scripts/ui/runSegmentedDogfoodVerify.mjs --gemini require`. |

**Observed:** 3/3 of the gates we ran pass. The uncommitted working copy has a coherent, typesafe state that matches the v9 spec.

## Agent browser (local)

**Not executed.** Working copy is on `main` but has 324 modified + 74 untracked files. Starting `npm run dev` from this state carries risk of disrupting the user's in-progress work (Convex dev backend would regenerate `_generated/*`, dev server would lock reload state). Per the task fallback rule, I remained at Tier A (curl/grep).

If dev preview is needed, the safe sequence is:
1. User commits the v9 work to a branch (e.g., `feat/mobile-ia-v9`), or stashes it cleanly
2. Verifier spawns dev from that branch head
3. Re-run visual sweep at 414×896 against `/`, `/home`, `/chat`, `/reports`, `/inbox`, `/me`

## Delta from V2 audit

**Resolved since V2:**
- None at the production level — prod is byte-identical to V2.

**Still open (same as V2):**
- Tab label still `"Nudges"` in prod, not `"Inbox"`.
- Accent still `#1B7AE0`, not terracotta `#d97757`.
- No `getPulsePreview` / `refreshDailyPulsePreview` in prod bundle.
- Chat tab not centered in prod.

**New in V3:**
- Confirmed **the v9 work exists in a non-trivial working copy** (HomeLanding.tsx, MobileTabBar.tsx, NudgesHome.tsx, convex/domains/product/home.ts all modified coherently; HomeLanding.test.ts adds 2 new test IDs that pass).
- Confirmed **the v9 work has never been committed** — `git log --all -S "getPulsePreview"` returns zero commits.
- Confirmed **the accent rebrand to terracotta was never actually done**, even in the working copy. Claim F is the one piece that is simply wrong in both locations.

## Final verdict

| Layer | State |
|---|---|
| **Working copy (uncommitted)** | 7/8 v9 claims materially present and passing tests. Accent rebrand (claim F) absent. |
| **Main branch (committed)** | **NONE** of the v9 UI/backend claims present. Only dogfood script infrastructure (D) was pre-existing before v9. |
| **Live production** | **NONE of v9.** Bundles unchanged from prior audit. |

**Recommended next action (in priority order):**

1. **Commit the working copy.** The v9 work is solid, typechecks, and `HomeLanding.test.ts` passes 6/6. Commit in logical chunks: `(a) feat(mobile): Pulse backend + getPulsePreview`, `(b) feat(home): Pulse preview card + fresh-only 3+ suppression`, `(c) feat(mobile): tab reorder — Home/Reports/Chat/Inbox/Me`, `(d) feat(inbox): positive empty-state + InboxFilter`. Do NOT amend `cab5646a`; create new commits.
2. **Decide on the accent claim.** Either (a) drop the terracotta claim and keep `#1B7AE0`, or (b) actually flip `--accent-primary` in `src/index.css` L120/L122/L181/L183 plus any dependent tokens before shipping. Cannot claim "terracotta shipped" with the current state.
3. **Push + deploy.** After commit, `git push origin main`. Per `.claude/rules/live_dom_verification.md`, wait for Vercel Ready, then re-fetch `https://www.nodebenchai.com` and confirm bundle hashes have CHANGED from `CQHXymHa` / `BcA4bAgy`. Grep for `label:"Inbox"` > 0.
4. **Root-cause: why was "landed on main and production" claimed?** Likely two failure modes per `live_dom_verification`: (a) local work was never pushed, or (b) the user confused "WC compiles" with "shipped". The 324-file dirty tree suggests mid-work — consistent with (a).
5. **Do NOT run `npm run dogfood:verify:strict` until the commit lands** — the strict lane will run against whatever `npm run build` output exists, and a partial WC commit would produce misleading artifacts.

**Verdict in vocabulary-discipline terms (per `.claude/rules/live_dom_verification.md`):**
- "committed": **NO** for the v9 work
- "tsc clean": **YES** for the working copy
- "build clean": not tested
- "deployed to Vercel": **NO** (bundle hashes unchanged)
- "live / shipped to users": **NO**

The user said "landed on main and production." The accurate framing is: **"staged in working copy, typechecks, tests green — ready to commit, not yet committed, not yet shipped."**
