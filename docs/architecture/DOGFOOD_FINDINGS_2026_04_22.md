# Dogfood Findings — 2026-04-22

> Honest post-mortem after actually starting the preview server and running the walkthrough.
> Preview: `http://127.0.0.1:4173`. Runner: `tests/e2e/demo-walkthrough.spec.ts` on Pixel 7 (Chromium).

## What I did before this dogfood pass

Engineering-grade work (did this earlier):
- Wrote 4 safety modules + 65 unit tests (all pass)
- Wired rate-limit + singleflight + low-confidence guard into `/search`
- Wired artifact-decision gate into `chat.ts:1832`
- Added CSL/ESL persistence layer
- `tsc --noEmit`: 0 errors; `vite build`: clean

**What I skipped.** I did not start a preview server, open the app, or walk a single surface as a user. The "LIVE in code" claims were technically true but product-blind. Fixing that now.

## Findings from the 14-case walkthrough run

All 14 routes loaded. Zero console errors. But visual inspection surfaced real polish gaps.

### Bug #1 — Playwright default device pulls WebKit (FIXED)
**Symptom.** `npx playwright test --project=chromium` failed: `browserType.launch: Executable doesn't exist at ...webkit-2272\Playwright.exe`.

**Root cause.** `devices["iPhone 13"]` sets `defaultBrowserType: "webkit"`. The device config overrides the project's `--project=chromium`.

**Fix.** `tests/e2e/demo-walkthrough.spec.ts`: switched to `devices["Pixel 7"]` — Chromium-native Android emulation with mobile viewport. 14/14 pass after.

### Bug #2 — Reports shows skeleton shimmer forever when Convex is cold (P1, NOT FIXED)
**Symptom.** `/reports` under a preview server (no Convex connection) renders four skeleton-loader cards and a terracotta spinner indefinitely. No fallback to `STARTER_CARDS` (which the code DOES define at `ReportsHome.tsx:437`).

**Evidence.** `.tmp/demo-walkthrough/TF04/reports.png` shows 4 skeleton cards + center spinner + "NODEBENCH / Reports" header.

**Root cause hypothesis.** The skeleton render is likely guarded on a separate loading signal above the `cards.length === 0 → STARTER_CARDS` fallback. `useQuery` returns `undefined` while loading, and some upstream gate keeps skeletons visible until query resolves. When Convex never connects, it never resolves.

**Why it matters for demo.** If the demo phone lands on `/reports` with a cold or disconnected Convex, audience sees an endless spinner. Cover: demo against live prod (`www.nodebenchai.com`), NOT local preview.

**Fix deferred.** Needs a proper timeout → fallback-to-`STARTER_CARDS` after ~6s. Not surgical enough to land tonight without reading the full data-flow.

### Bug #3 — Home is a white void for guest users (P1, NOT FIXED)
**Symptom.** `/` on a cold guest session shows: "NodeBench" title, two header icons, a giant white middle, a query suggestion at the bottom, and a "Message NodeBench" composer. No pulse card, no recent artifacts, no welcome state.

**Evidence.** `.tmp/demo-walkthrough/TF10/home.png`.

**Root cause hypothesis.** Authenticated users see recent-artifacts cards + pulse; guest path doesn't have a welcome card.

**Why it matters for demo.** If the demo opens on the phone as a new/guest session, the landing looks empty. Cover: sign in on the demo phone ahead of time.

**Fix deferred.** Adding a welcome card requires product-copy + layout decisions. Not for tonight.

### Bug #4 — The 5-surface IA (Home/Reports/Chat/Inbox/Me) does not render as a persistent tab bar (P1, NOT FIXED)
**Symptom.** On every route, the bottom nav shows ONE active tab (e.g. "Chat" on `/chat`, "Reports" on `/reports`, "Inbox" on `/inbox`). The other tabs are off-screen or collapsed. The operating memo's "mobile IA with 5 tabs" is not what renders.

**Evidence.** Compare `TF01/landing.png`, `TF04/reports.png`, `TF09/inbox.png` — each shows a different single-tab footer.

**Why it matters.** If the user doesn't know the other surfaces exist, discoverability suffers. This is a Jony Ive checkpoint ("earned complexity") violation — we say we have 5 surfaces but only one is reachable at a time from the current tab.

**Fix deferred.** Needs a tab-bar component redesign. Not tonight.

### Bug #5 — Thread detail tabs (Conversation / Steps / Artifacts / Files) missing on `/chat` (P1, NOT FIXED)
**Symptom.** `/chat` renders the composer + query suggestion but NO sub-tabs for the thread.

**Evidence.** TF06 soft-gates: all 4 tabs missing.

**Why it matters.** The eval CSV and operating memo both assume these tabs exist. Without them, the "Steps" demo moment (Checkpoint 2: "deep work visible") can't happen.

**Workaround for demo.** Either land the tabs today, or swap the checkpoint-2 demo to "Reports detail view with saved slow-run" — which does exist.

**Fix deferred.** Tab-bar component work.

### Bug #6 — No pulse / welcome card on Home (P1, NOT FIXED)
**Symptom.** TF10 soft gate `pulse-or-welcome` missed.

**Evidence.** Same as Bug #3 — the middle of Home is blank.

**Fix deferred.** Product-decision-dependent.

### Bug #7 — Disambiguation UI missing on ambiguous queries (P1, NOT FIXED)
**Symptom.** TF03 submits "tell me about Vitalize" (ambiguous). No visible disambiguation affordance.

**Evidence.** TF03 soft gate `disambiguation-candidates` missed.

**Why it matters.** This is Checkpoint 4 ("trust is enforced"). My `lowConfidenceGuard` on `/search` returns a card payload, but the frontend does not render it yet. Need a `<LowConfidenceCard />` component that reads `payload.lowConfidenceCard` and renders with the "Run deep research" CTA.

**Fix deferred.** Component work + wiring it into the chat output render.

### Bug #8 — Inbox renders beautifully ✓ (NOT A BUG, commendation)
**Evidence.** `.tmp/demo-walkthrough/TF09/inbox.png` — clean empty state, actionable copy, two clear CTAs ("Open Chat" + "Open saved report"), consistent typography, polished overall.

**Why this matters.** This is the Jony Ive bar the other surfaces should match. Whoever built the Inbox got the pattern right — empty state is intentional, not blank.

## What I fixed tonight

1. **Playwright chromium device.** 14/14 walkthrough pass.
2. **`data-testid="report-card"`** added to `ReportsHome.tsx::ReportCard`. Soft-gates found went from 22 → 23. Small win.
3. **Rebuilt**, confirmed the new testid is served by the running preview.

## What is deferred with honest priority

| Bug | Priority | Blocker for stage? | Fix shape |
|---|---|---|---|
| #2 Reports skeleton-stuck | P1 | Yes if demo phone on local preview. No if demo on prod. | Add timeout → fallback to STARTER_CARDS |
| #3 Home white void (guest) | P1 | Yes if demo opens as guest | Welcome card + sign-in CTA |
| #4 5-tab IA missing | P1 | Narrative-breaking | Persistent bottom-nav redesign |
| #5 Thread detail tabs | P1 | Checkpoint-2 demo blocker | Tab bar component |
| #6 Pulse card on Home | P1 | Checkpoint-5 demo blocker | Card + data hookup |
| #7 Disambiguation UI | P1 | Checkpoint-4 demo blocker | `<LowConfidenceCard />` frontend component |

## Demo-day implications

1. **Demo MUST run against prod** (`www.nodebenchai.com`), not local preview. Preview without Convex = Reports stuck loading.
2. **Sign in on demo phone ahead of time.** Guest Home is a white void.
3. **Skip the Steps-tab demo moment** unless the tab bar lands today. Swap with "re-open saved report" flow instead.
4. **Checkpoint-4 trust demo** (low-confidence card) works on the backend but has no frontend rendering yet. Either (a) land the component today, or (b) demo the trust moment via "we refused this injection" instead — which does work end-to-end.
5. **Inbox is genuinely polished.** Use it. It's the anchor for "it survives real usage" + "trust is enforced".

## Revised "demo is green" criteria

A demo is green if:
- All 14 walkthrough cases still pass (14/14 current ✓)
- Zero console errors across flows (0 current ✓)
- Demo phone authenticated on prod
- Pre-warm run completed, scorecard saved
- At least one live checkpoint-2 moment works (pick Reports-detail over Steps-tab if needed)
- Adversarial refusal reproducible (checkpoint 4, verified via backend `/search` response)

## What "senior QA who actually used the product" looks like

- Open the preview. Don't just read the HTML.
- Click every nav item once.
- Look at empty states.
- Look at loading states.
- Look at error states (unplug Convex mid-load, observe).
- File each visual gap with a screenshot.
- Distinguish root cause from bandaid. "Add a testid" is a bandaid if the actual bug is "Reports never finishes loading."

## What "senior staff eng who read the failure and fixed the cause" looks like

- Tonight I fixed the testid (bandaid for soft-gate cosmetics) and the Pixel 7 device (real bug).
- Tonight I did NOT fix the skeleton-stuck-forever (real bug) because the surgery needed a full data-flow read I didn't have time for.
- The preflight accurately documents what ships live vs what's deferred.
- The OPERATING MEMO is now honest — I should update it to note that the 5-surface IA is aspirational, not current reality on mobile.

## File changes this session

- `tests/e2e/demo-walkthrough.spec.ts` — Pixel 7 device
- `src/features/reports/views/ReportsHome.tsx` — `data-testid="report-card"`
- `docs/architecture/DOGFOOD_FINDINGS_2026_04_22.md` — this file

No backend changes. No broken tests. `tsc` clean. `vite build` clean.
