# UI Spec v1 → Existing Codebase Translation Map

Generated 2026-04-21. Audit is read-only. Spec under review: `docs/chat-logs-unified/UI_DESIGN_SPEC_V1.md`.
IA v9 5-tab order: **Home / Reports / Chat (center) / Inbox / Me**.

---

## Executive summary

- **Tabs: MISMATCH.** Actual bottom-tab order is `Home / Chat / Reports / Nudges / Me` — spec wants `Home / Reports / Chat / Inbox / Me` with Chat centered and visually emphasized. Label "Nudges" must become "Inbox".
- **Tokens: MISMATCH.** `--accent-primary` in `src/index.css` is `#1B7AE0` (blue) for both light and dark modes. Spec accent is `#d97757` terracotta. `--bg-primary` dark is `#111418`, not `#151413`. `#d97757` only appears as a hardcoded fallback in 4 places (focus outlines, notebook-margin tint, paper-margin variable). Manrope + JetBrains Mono loaded via Google Fonts — matches spec.
- **Components: 4 of 13 exist at target quality.** `EmptyState`, `Skeleton` family, `Button` (5 variants — spec wants 3), `Card` exist. Missing as dedicated primitives: `BottomNav` with center emphasis, `Tabs` (top segmented), `ThreadCard`, `ReportCard`, `SourceChip`, `VerdictBadge`, `StatusDot`, `TaskExecutionList`, `BottomSheet`, `PulseCard`, `Toast` (present but not spec-compliant).
- **Convex schema: MISMATCH on 10 of 11 spec tables.** No tables named `reports`, `library_items`, `inbox_items`, `files` (different shape), `notebook_blocks`, `shares`, `message_embeddings`. Closest equivalents: `chatThreadsStream` / `chatMessagesStream` (camelCase, suffixed `Stream`), `agentRuns` (close to `run_envelopes`), `feedItems`/`nudges-related` for inbox, no explicit scratchpad table.
- **PWA: MISSING.** No `public/manifest.json`, no service worker, no `vite-plugin-pwa`, no 180/192/512 PWA icons (only `favicon.ico` + `favicon.svg`).
- **Routing: PARTIAL.** Canonical URL params `home/chat/reports/nudges/me` exist. Default landing route `/` → `control-plane` view (surface `ask`) — not `/chat` as spec implies for mobile. Route `/pulse` exists separately under `packets` surface (does not match spec's "Home > Pulse card" composition).

Result: **13 P0 items, 18 P1 items, 14 P2 items.**

---

## Surface-by-surface

### Chat (primary tab — center, emphasized)
- **Spec §4.1–4.3 requires:** Chat list landing (ACTIVE / RECENT / NEEDS ATTENTION groups), Thread detail with top tabs `Conversation | Steps | Artifacts | Files`, persistent bottom composer.
- **Existing at:** `src/features/chat/views/ChatHome.tsx` (952 lines) — described in file header as "Perplexity-style answer page. Answer first. Sources next. Trace later. Single centered column." This is an answer surface, NOT a chat list.
- **Related:** `src/features/chat/components/SessionArtifactsPanel.tsx`, `src/features/chat/components/BackgroundRunsChip.tsx`, `src/features/chat/hooks/useConversationEngine.ts`, `src/features/agents/components/FastAgentPanel/` (has StepTimeline and parallel-task components).
- **Gaps:**
  - No ChatList view (L401–424 of spec). Need to split `ChatHome.tsx` into `ChatList.tsx` (new) + `ThreadDetail.tsx` (extract existing answer flow).
  - No top-tab chrome — conversation / steps / artifacts / files are currently inline.
  - Thread-card status dot (streaming pulse) not a primitive.
  - Routes `/chat/:threadId` and chat detail view are not in `viewRegistry.ts`.
- **Bottom nav:** `src/layouts/MobileTabBar.tsx:22-31` hard-codes order `ask, workspace, packets, history, connect` — Chat is position 2, not 3 (not centered). No visual size/lift emphasis.

### Home (with Pulse card)
- **Spec §4.4 requires:** Greeting display, PulseCard (daily brief), PINNED section, SUGGESTED section; PulseCard suppresses when stale >18h or items <3.
- **Existing at:** `src/features/home/views/HomeLanding.tsx` (542 lines) — product-intake landing with SUGGESTED_PROMPTS (not a daily brief).
- **Pulse wiring exists at backend layer:** `convex/workflows/dailyLinkedInPost.ts` (scheduled via `convex/crons.ts:354,381,390,399,408`), `convex/domains/agents/core/coordinatorAgent.ts:77,388` uses `getDailyBrief`. Frontend hooks `src/features/research/hooks/useBriefData.ts` and `usePersonalBrief.ts` exist. `ActAwareDashboard.tsx` renders a `DailyBriefPayload`.
- **Gaps:**
  - No `PulseCard` component. The brief-rendering is buried in ActAwareDashboard, not a reusable top-of-Home hero.
  - No 18h staleness suppression logic. `useBriefData.ts` falls back to `createSampleBrief` (hardcoded sample) instead of suppressing.
  - HomeLanding route `/` is `control-plane` (surface `ask`). The mobile Home tab currently lands on a product-intake composer, not on Pulse + PINNED + SUGGESTED.
  - Pulse lives separately at `/pulse` under `surfaceId: packets` (reports tab) — misrouted relative to spec.

### Reports
- **Spec §4.5–4.7 requires:** Horizontal filter `[All] Companies People Markets Jobs Notes`, report cards with subject-type chip + verdict badge + source count, Report Detail with top tabs `Brief | Notebook | Sources | History`, live co-edit notebook.
- **Existing at:** `src/features/reports/views/ReportsHome.tsx` (630 lines) — filter types `companies/people/jobs/markets/notes` defined at lines 42–46. **Matches spec filter taxonomy.**
- **Related:** `src/features/reports/components/RecentPulseStrip.tsx`, `src/features/pulse/views/GlobalPulsePage.tsx`, `src/features/pulse/views/EntityPulsePage.tsx`, `src/features/entities/lib/starterEntityWorkspaces.ts`.
- **Gaps:**
  - No top-tab chrome `Brief | Notebook | Sources | History` in a unified Report Detail view.
  - Notebook live co-edit surface not found — no `notebook_blocks` table, no block-lock overlay component.
  - No `ReportCard` primitive. Cards are inline ad-hoc JSX using `ProductThumbnail`.
  - Subject-type chip uses lucide icons (Building2, User, Briefcase, TrendingUp, FileText) not terracotta accent-wash `--t-label` uppercase chips.
  - Verdict badge not rendered on cards.

### Inbox (spec tab — current label "Nudges")
- **Spec §4.8 requires:** tab label "Inbox", top tabs `[Action required] Updates All`, action rows with Approve/Cancel CTAs.
- **Existing at:** `src/features/nudges/views/NudgesHome.tsx`. Filter enum `"priority" | "watch" | "all"` at line 28. Filter pill labels "Priority / Watchlist / All" at lines 260–262.
- **Gaps:**
  - Label mismatch: "Nudges" everywhere — `SURFACE_TITLES.history = "Nudges"` (viewRegistry.ts:604), `MobileTabBar.tsx:29 label: "Nudges"`, view id `nudges-home`, canonical path `/nudges`, alias `history → nudges`. Spec wants "Inbox".
  - Filter taxonomy differs: `priority/watch/all` vs spec `action_required/updates/all`. `priority` ≈ `action_required`, `watch` ≈ `updates` — rename + re-map.
  - No verdict CTAs (`✓ Approve` / `✕ Cancel run` / `Reconnect →`) styled per spec.

### Me / Files
- **Spec §4.9–4.10 requires:** Avatar+name header, rows for Files / Connectors / Credits / Settings / Privacy / Sign out. Me > Files with filter `[All] Documents Images Videos Audio Code`.
- **Existing at:** `src/features/me/views/MeHome.tsx`. Files section embedded at line 301–338 with filter counts (`Images/Documents/Audio/Other`). No Videos, no Code filter.
- **Convex source:** `api.domains.product.me.listFiles` (line 56).
- **Gaps:**
  - Files is embedded inline in MeHome, not a dedicated `Me > Files` detail route.
  - Missing filter categories Videos and Code.
  - No route `/me/files`. No breadcrumb back-nav.

---

## Component-by-component translation table

| Spec component | Exists? | Current path | Gap vs spec | Action | Effort |
|---|---|---|---|---|---|
| `BottomNav` (5-tab, center Chat emphasized) | partial | `src/layouts/MobileTabBar.tsx` | Wrong order (Home/Chat/Reports/Nudges/Me), no center lift/size emphasis, no backdrop-blur accent tint on Chat icon, icon stroke uses 2px default not 1.5px | refactor | S |
| Tabs (top segmented, swipeable, 2px accent underline) | NO | — | Nothing exists as a primitive; ad-hoc rendering in per-feature views | create | M |
| `Button` (3 variants) | YES + extra | `src/shared/ui/Button.tsx` | Has 5 variants (primary/secondary/ghost/danger/success), spec wants 3. Uses `bg-content text-surface` (inverse mapping) instead of accent-500 background. Press scale 0.98 not spec's 0.97. | refactor | S |
| `Card` (glass DNA) | partial | `src/shared/ui/Card.tsx` + `src/shared/ui/surface-tokens.css` (`.nb-card`) | `.nb-card` uses `bg-surface/50` instead of spec's `rgba(255,255,255,0.02)`, border `border-edge` not `rgba(255,255,255,0.06)`, `rounded-xl` (12px) not `--r-md` 10px | refactor | S |
| `ThreadCard` | NO | — | Status dot + title + preview + meta not extracted as reusable. Meta/preview rendered inline in per-surface JSX. | create | M |
| `ReportCard` | NO | — | Report grid items rendered inline in `ReportsHome.tsx`. No subject-type chip in accent-wash, no verdict badge, no favorite-star toggle. | create | M |
| `SourceChip` (readable: domain + label, min-width 80px) | NO (unreadable variant exists) | `src/features/strategy/views/ProductDirectionMemoView.tsx:49-73` (`function SourceChips`); also hits in `ExecutionTraceView`, `PersonalPulse`, `AgendaMiniRow`, `FusedSearchResults` | Current SourceChips renders `rounded-full bg-surface-secondary/50 px-2 py-1 text-[11px]` label-only pills. No favicon dot, no domain prefix, no overflow → "+N more" sheet. Not centralized — each surface ad-hoc. | create + replace all | M |
| `VerdictBadge` (4 bounded verdicts per `agent_run_verdict_workflow`) | NO | one-off `CritiqueBadge` at `src/features/agents/components/FastAgentPanel/FastAgentPanel.ParallelTaskTimeline.tsx:588-593` uses 3 verdicts `agree/disagree/partial` — wrong vocabulary | Spec wants `verified / provisional / needs_review / failed`. The rule requires 6 verdicts including `awaiting_approval` and `in_progress`. | create | S |
| `StatusDot` (streaming pulse 1400ms scale+opacity) | NO | ad-hoc pulse dots in multiple views | Not extracted; none honor reduced-motion with opacity-only fallback | create | S |
| `TaskExecutionList` (Manus-grafted accordion) | partial | `src/features/agents/components/FastAgentPanel/StepTimeline.tsx`; `CollapsibleAgentProgress.tsx`; `useParallelTaskExecution.ts`; `src/features/research/views/LiveDossierDocument.tsx` | StepTimeline exists but (a) not used outside FastAgentPanel, (b) not accordion-expandable per spec, (c) running-row pulse animation not spec-compliant. | refactor + promote to shared | M |
| `BottomSheet` (Radix Dialog + swipe-to-dismiss) | NO | `src/layouts/CockpitLayout.tsx` mentions BottomSheet; `src/features/agents/components/FastAgentPanel/useBottomSheet.ts` is a custom hook, not the Radix-based primitive the spec requires | No `@radix-ui/react-dialog` bottom-sheet wrapper. No grabber handle primitive. No `@use-gesture/react`. | create | M |
| `PulseCard` (Home daily brief) | NO | `src/features/pulse/components/PulseBadge.tsx` (compact chip, not hero card); `src/features/reports/components/RecentPulseStrip.tsx` (horizontal strip on Reports, not Home hero) | Neither matches Home hero spec (§3.9): no 3-item numbered list + "Open full brief" CTA, no 135° gradient, no staleness suppression. | create | M |
| `EmptyState` (positive terminal, 32px icon) | YES | `src/shared/ui/EmptyState.tsx` (also `src/shared/components/EmptyStates.tsx`) | Styling / copy tone needs spec check — spec wants 32px success icon, `--t-title` headline, `--t-meta` subline. | verify + small refactor | S |
| `Skeleton` (no spinners, 1.5s shimmer) | YES | `src/shared/components/SkeletonCard.tsx`, `src/components/skeletons/` (BriefingSkeleton, CostDashboardSkeleton, DealCardSkeleton, DigestSkeleton, FeedCardSkeleton, IndustryUpdatesSkeleton, ReportCardSkeleton, Skeleton.tsx, ViewSkeleton.tsx) | Family exists. Verify shimmer gradient uses `bg-elevated → border-subtle → bg-elevated` from tokens. Verify reduced-motion disables shimmer. | verify | XS |
| `Toast` | YES (ad-hoc) | `src/shared/ui/Toast.tsx` + `sonner` library ("toast" import in most views) | Uses `sonner`. Verify Y-20px slide + 3s auto-dismiss + accent colors. | verify | XS |
| `haptics` API | partial | Inline `navigator.vibrate(10)` at `MobileTabBar.tsx:61` | No `HAPTIC_MAP`, no iOS Taptic fallback, no kind taxonomy. | create | S |

---

## Tokens delta

Source of truth today: `src/index.css` (HSL vars + hex vars), `tailwind.config.js` (reads `var(--*)`), `src/shared/ui/surface-tokens.css` (`.nb-card` family).

| Token | Spec value | Current value | File | Action |
|---|---|---|---|---|
| `--bg-primary` (dark) | `#151413` | `#111418` | `src/index.css:176` | update |
| `--bg-elevated` | `#1c1a19` | none (no such var) | `src/index.css` | add |
| `--bg-sheet` | `#221f1d` | none | — | add |
| `--surface-glass` | `rgba(255,255,255,0.02)` | via `bg-surface/50` tailwind shortcut | `src/shared/ui/surface-tokens.css:12` | add explicit var |
| `--border-subtle` | `rgba(255,255,255,0.06)` | `--border-color: rgba(255,255,255,0.10)` | `src/index.css:180` | update + alias |
| `--border-strong` | `rgba(255,255,255,0.12)` | none | — | add |
| `--text-primary` | `#f5f3ef` | `#f2f4f7` | `src/index.css:172` | update |
| `--text-secondary` | `#a8a39d` | `#c6ccd4` | `src/index.css:173` | update |
| `--text-muted` | `#6e6863` | `#99a3ae` | `src/index.css:174` | update |
| `--accent-500` / `--accent-primary` | `#d97757` | `#1B7AE0` (blue!) | `src/index.css:120,181` | **P0 update — color identity mismatch** |
| `--accent-400` (hover) | `#e08b6e` | `--accent-secondary: #4A9EF0` (blue) | `src/index.css:121,182` | update |
| `--accent-600` (pressed) | `#c26742` | `--accent-primary-hover: #1567C0` | `src/index.css:123,184` | update |
| `--accent-wash` | `rgba(217,119,87,0.12)` | `rgba(27,122,224,0.08-0.1)` | `src/index.css:122,183` | update |
| `--success-500` | `#4fb286` | ad-hoc `green-600` tailwind | — | add var |
| `--warn-500` | `#d4a94a` | ad-hoc `yellow-*` tailwind | — | add var |
| `--error-500` | `#cf5656` | `--destructive: 0 63% 31%` HSL | `src/index.css` | add hex alias |
| `--info-500` | `#6e9fd4` | none | — | add |
| `--r-sm / --r-md / --r-lg / --r-xl / --r-full` | 6/10/16/24/9999 px | none as CSS vars — tailwind `rounded-md/lg/xl` used ad-hoc | — | add |
| `--s-1..--s-10` (4pt grid) | explicit | tailwind gap/space utilities | — | add CSS vars for non-tailwind consumers |
| `--font-ui` | Manrope | Manrope (loaded via Google Fonts import at `src/index.css:2`) | `src/index.css:127` | matches — verify JetBrains Mono mono var |
| `--font-mono` | JetBrains Mono | loaded via Google Fonts, no explicit `--font-mono` var | `src/index.css:2` | add var |
| `--t-*` type scale | explicit | tailwind text-xs/sm/base + `clamp()` fluid | `src/index.css:34-52` | add CSS vars for consistency |
| `--ease-out / --ease-in-out / --ease-spring` | explicit | ad-hoc Framer Motion easings | — | add vars |
| `--dur-fast/base/slow/xl` | 120/220/360/500 ms | ad-hoc | — | add vars |
| `--z-tab-bar=50` | | `tailwind.config.js: zIndex.sidebar=20, modal=50, toast=60`; `MobileTabBar` uses `z-50` | matches modal collision — consider adjusting | verify |

**Landmine:** `--accent-primary: #d97757` appears at four hardcoded fallback positions (`src/index.css:1684,1685,2664,3023`) but the primary variable is blue. Any existing UI that reads `var(--accent-primary)` resolves to **blue**, not terracotta. Fixing the token alone flips the entire color identity of the app.

---

## Convex schema delta

Schema at `convex/schema.ts` (4000+ lines, 363 `defineTable` entries). None of the spec's table names exist verbatim.

| Spec table | Exists as | convex/schema.ts line | Notes |
|---|---|---|---|
| `chat_threads` | `chatThreadsStream` | 1170 | camelCase + `Stream` suffix. Consider type alias only, or add new canonical table. |
| `messages` | `chatMessagesStream` | 1193 | same naming |
| `run_envelopes` | `agentRuns` (closest) | 708 | Shape differs — check if envelopes can derive from runs + `traceAuditEntries` (4017) |
| `scratchpads` | — | — | Not found. Closest: `agentRunEvents` (1024), `parallelTaskTrees` (3827). Required by `.claude/rules/scratchpad_first.md` canonical pattern. |
| `reports` | — | — | Not found. Closest: `scheduledReports` (3286) — but that's cron metadata, not report rows. Reports render from `starterEntityWorkspaces` + `pulseReports` (implied, used by `RecentPulseStrip.tsx:15`). |
| `library_items` | — | — | Not found. |
| `inbox_items` | — | — | Not found. `feedItems` (2582) is for newsfeed, not agent-inbox actions. Nudges are read from an unnamed query in `NudgesHome.tsx` — grep needed on `convex/domains/nudges` to confirm storage table. |
| `files` | `files` | 565 | Matches name but spec shape may differ — confirm field set. |
| `notebook_blocks` | — | — | Not found. `documentPatches` (4176) + `documents` (239) may approximate but no block-lock semantics. |
| `shares` | — | — | Not found. Share URLs built by `buildEntityShareUrl` in `entityExport.ts` but no persisted share records. |
| `message_embeddings` | `embeddings` (533) OR `searchCache` (1223) | | Generic — not scoped to messages. |

**Action:** Either (a) rename-via-type-alias at contract boundary, or (b) introduce canonical tables alongside existing ones, derived where possible. Per `.claude/rules/agent_run_verdict_workflow.md`: *"Prefer deriving verdict state from existing session and trace metadata before adding new persistence."*

---

## Routing delta

`src/lib/registry/viewRegistry.ts` — canonical surface params map to paths:

```
ask      → "home"   → "/"         → control-plane view (not HomeLanding)
workspace→ "chat"   → "/chat"     → chat-home (ActiveSurfaceHost custom render)
packets  → "reports"→ "/reports"  → reports-home
history  → "nudges" → "/nudges"   → nudges-home
connect  → "me"     → "/me"       → me-home
```

- **Default landing:** `/` resolves to `control-plane` not `chat-home`. Spec implies Chat is default for mobile.
- **`/pulse` is standalone** under `surfaceId: packets` — spec wants Pulse embedded as a card on Home, not a separate route.
- **Alias `history↔nudges`** already supports renaming "Nudges" → "Inbox" without breaking URLs (`SURFACE_PARAM_ALIASES` at `viewRegistry.ts:81`). Add `"inbox"` alias and flip `SURFACE_TITLES.history = "Inbox"`.

---

## PWA baseline

- **`public/manifest.json`:** MISSING.
- **Service worker:** MISSING (no `public/sw.js`, no `src/sw.ts`).
- **`vite-plugin-pwa`:** NOT in dependencies — `grep -l 'vite-plugin-pwa' vite.config.*` returns nothing.
- **Icons:** Only `favicon.ico` + `favicon.svg` + `og-nodebench.svg`. Missing 180 (Apple touch), 192, 512 PWA icons.
- **Install prompt handler:** NONE.
- **Fonts:** `@import url('https://fonts.googleapis.com/...')` at `src/index.css:2` — external CDN, not `@fontsource` local fonts per spec §9.1.

---

## Prioritized Phase 1 file-change list

### P0 — blocks Phase 1 (color identity, IA correctness, data contract)

1. **`src/index.css` L120–184** — flip `--accent-primary: #1B7AE0` → `#d97757` (terracotta) for both `:root` (light) and `.dark` blocks. Propagate `--accent-secondary`, `--accent-primary-bg`, `--accent-primary-hover`. Also update `--bg-primary` dark `#111418 → #151413`.
2. **`src/layouts/MobileTabBar.tsx` L22–31** — reorder tabs to `Home, Reports, Chat, Inbox, Me`. Emphasize Chat: 24px icon vs 20px, `-translate-y-[2px]`, persistent `accent-primary/60` tint when inactive.
3. **`src/layouts/MobileTabBar.tsx` L29** + **`src/lib/registry/viewRegistry.ts` L603** — relabel "Nudges" → "Inbox". Add `"inbox"` to `SURFACE_PARAM_ALIASES` (L81).
4. **Create `src/shared/ui/tokens.css`** — formal token layer per spec §1.2 (accent-400/500/600/wash, semantic success/warn/error/info, radius, spacing, typography scale, motion durations/easings).
5. **Create `src/shared/ui/SourceChip.tsx`** — domain+label readable chip (min-width 80px). Replace 5 ad-hoc SourceChip implementations: `ProductDirectionMemoView.tsx:49`, `ExecutionTraceView.tsx`, `PersonalPulse.tsx`, `AgendaMiniRow.tsx`, `FusedSearchResults.tsx`.
6. **Create `src/shared/ui/VerdictBadge.tsx`** — 4-verdict component (`verified | provisional | needs_review | failed`) honoring `agent_run_verdict_workflow` bounded set (including `awaiting_approval` + `in_progress`).
7. **Create `src/shared/ui/BottomSheet.tsx`** — Radix Dialog wrapper with grabber handle, swipe-to-dismiss via `@use-gesture/react` (NEW dependency).
8. **Create `src/shared/ui/PulseCard.tsx`** — Home hero using existing `useBriefData`/`usePersonalBrief` hooks. Include ≥18h staleness suppression (render null).
9. **Create `src/shared/ui/ThreadCard.tsx`** — extract from inline Chat list JSX. Includes `StatusDot`.
10. **Create `src/shared/ui/StatusDot.tsx`** — streaming pulse animation with `prefers-reduced-motion` opacity-only fallback.
11. **Create `src/shared/ui/BottomNav.tsx`** (or refactor MobileTabBar) — formal 5-tab primitive with center emphasis, 56px + safe-area, `backdrop-filter: blur(16px)`.
12. **Split `src/features/chat/views/ChatHome.tsx`** into `ChatList.tsx` + `ThreadDetail.tsx`. ChatList becomes default Chat-tab content with ACTIVE/RECENT/NEEDS ATTENTION groups.
13. **Create `public/manifest.json` + `vite-plugin-pwa` config in `vite.config.ts`** — minimum viable PWA. Add 180/192/512 icons.

### P1 — Phase 2 (component parity, accessibility, secondary surfaces)

1. `src/shared/ui/Button.tsx` — reduce to 3 variants per spec, realign press scale to 0.97, map `primary` to `bg-accent-500 text-text-inverse`.
2. `src/shared/ui/Tabs.tsx` (NEW) — top-segmented primitive with 2px accent underline slide and optional swipe-between-tabs via `@use-gesture`.
3. `src/shared/ui/TaskExecutionList.tsx` — promote from `StepTimeline.tsx` to shared primitive. Add accordion expand/collapse with 220ms ease-in-out and chevron rotate.
4. `src/shared/ui/ReportCard.tsx` — extract from `ReportsHome.tsx` inline JSX. Add verdict badge + favorite star.
5. `src/features/reports/views/ReportsHome.tsx` — wire `Brief | Notebook | Sources | History` top-tabs for Report Detail.
6. `src/features/nudges/views/NudgesHome.tsx` L260 — rename filter taxonomy `priority/watch/all` → `action_required/updates/all`. Also rename directory `src/features/nudges/` → `src/features/inbox/` (high-churn refactor — consider type alias first).
7. `src/features/home/views/HomeLanding.tsx` — wire PulseCard at hero position; keep existing SUGGESTED_PROMPTS as secondary.
8. `src/shared/ui/surface-tokens.css` L12 — switch `.nb-card` from `bg-surface/50 border-edge rounded-xl` to spec `rgba(255,255,255,0.02) border-subtle rounded-[10px]`.
9. `src/features/me/views/MeHome.tsx` — extract Files section to `/me/files` route + add Videos/Code filter categories.
10. `src/shared/ui/haptics.ts` (NEW) — HAPTIC_MAP + `navigator.vibrate` wrapper with iOS Taptic detection.
11. Convex schema — rename-alias or add canonical tables: `scratchpads`, `inbox_items`, `notebook_blocks`, `shares`.
12. `src/shared/ui/EmptyState.tsx` — verify 32px success icon, `--t-title` headline, freshness stamp.
13. Toast — validate `sonner` config against spec §5.1 durations/easings.
14. `src/features/chat/views/ChatHome.tsx` — add persistent bottom composer fixture matching spec §4.2.
15. `@media (prefers-reduced-motion: reduce)` — audit every keyframe in `src/index.css` for opacity-only fallbacks (StatusDot is the canonical exception allowed).
16. `src/features/research/hooks/useBriefData.ts:26` `createSampleBrief` — replace silent fallback with suppression path + telemetry.
17. Fonts — migrate from Google Fonts CDN import to `@fontsource/manrope` + `@fontsource/jetbrains-mono` (offline PWA requirement).
18. ARIA — verify every icon-only `<button>` across `MobileTabBar`, `FastAgentPanel`, `ReportsHome` action rows has `aria-label`.

### P2 — Phase 3+ (polish, docs, performance)

1. `src/shared/ui/Skeleton.tsx` — unify shimmer gradient colors with tokens (currently ad-hoc per skeleton file).
2. `src/shared/components/SkipLinks.tsx` — add per-surface "Skip to results", "Skip to search" targets.
3. Motion budget audit — reduce concurrent animations on HomeLanding (SignatureOrb + stagger + Pulse pulse).
4. Print stylesheet (spec §11 excludes it from v1, but `reexamine_polish` requires it).
5. Dynamic type — migrate body sizes from `clamp(14px, 2.5vw, 16px)` to `rem` for iOS/Android system font-size respect.
6. Light mode — spec defers to v1+1 (§8). Keep `[data-theme="light"]` tokens prepared but untested.
7. `src/index.css:2` — drop Google Fonts external import once `@fontsource` migration lands.
8. `src/index.css` `#d97757` fallbacks at L1684, 1685, 2664, 3023 — once `--accent-primary` flips, these can reference `var(--accent-primary)` directly.
9. `tailwind.config.js` — add `terracotta` / `accent-wash` palette entries so components can use `text-accent-500` etc. without raw `var()`.
10. `src/features/reports/components/RecentPulseStrip.tsx` — consider removing once PulseCard lives on Home (avoid two Pulse surfaces).
11. `src/shared/ui/Toast.tsx` vs `sonner` — pick one; don't ship both.
12. Convex schema delta — write a migration doc so renames don't break prod data.
13. `src/features/nudges/` directory rename to `src/features/inbox/` once type-alias shim is in place for 1 release.
14. Register a proper default route alias: `/` → Chat for mobile, `/` → Home for desktop (responsive routing).

---

## Landmines found

- **LANDMINE 1 — Color identity mismatch is silent.** `src/index.css:181` `--accent-primary: #1B7AE0` in `.dark` block means **every `var(--accent-primary)` read today resolves to BLUE, not terracotta**. The codebase references terracotta `#d97757` only as four hardcoded fallback values (`src/index.css:1684,1685,2664,3023`). Most of NodeBench renders blue accents today despite spec + MEMORY.md claiming terracotta. Flipping the token = visual identity change across the entire app.
- **LANDMINE 2 — SourceChip duplication.** Five files hand-roll source chip markup (`ProductDirectionMemoView.tsx:49`, `ExecutionTraceView.tsx`, `PersonalPulse.tsx:XXX`, `AgendaMiniRow.tsx`, `FusedSearchResults.tsx`). Centralizing is multi-file refactor. Spec's "single-letter unreadable" anti-example may already be shipping in one of these five.
- **LANDMINE 3 — Pulse lives at the wrong route.** `viewRegistry.ts:467` `pulse-home` has `path: "/pulse"` under `surfaceId: "packets"` (Reports tab) with `group: "core"`. Spec wants Pulse as a card ON Home, not a separate route on Reports. `RecentPulseStrip.tsx` also renders on Reports landing. Moving Pulse to Home without removing from Reports creates two sources of truth.
- **LANDMINE 4 — Staleness suppression is inverted.** `src/features/research/hooks/useBriefData.ts:26` `createSampleBrief` falls back to a hardcoded sample `DailyBriefPayload` when real data is missing. Spec §3.9 says if stale >18h or items <3, PulseCard should render **nothing** (fallback chosen by caller). Current behavior always renders — users see fake data as real.
- **LANDMINE 5 — Nudges → Inbox rename is high-surface.** 12 files grep-hit `Nudges`. URL path `/nudges`, view id `nudges-home`, surface id `history` (???), directory `src/features/nudges/`. Type alias path exists (`SURFACE_PARAM_ALIASES[history↔nudges]` at `viewRegistry.ts:85`). A label flip in `SURFACE_TITLES.history` + `MobileTabBar.tsx:29` is mechanically small; full code rename is not.
- **LANDMINE 6 — Convex `chat_threads` vs `chatThreadsStream` naming.** Spec assumes snake_case `chat_threads`, `messages`. Convex convention is camelCase. Don't rename tables blindly — downstream `api.domains.*.chatThreadsStream.*` imports will break. Spec vocabulary should adapt to convex convention, or add thin aliases.
- **LANDMINE 7 — Default route `/` is `control-plane` not mobile-first Chat.** `viewRegistry.ts:191` `id: control-plane, path: "/"`. On mobile, the spec implies Chat is primary. Consider user-agent + auth-aware responsive redirect at `src/App.tsx` rather than flipping the canonical view id.
- **LANDMINE 8 — Button variant mapping is inverted.** `src/shared/ui/Button.tsx:32` `primary: 'bg-content text-surface'` — uses text-primary color as the background and surface color as the label. Spec's primary is `bg accent-500 / text text-inverse`. Existing primary buttons render as solid off-white today, not terracotta.
- **LANDMINE 9 — `sonner` + custom Toast both present.** `src/shared/ui/Toast.tsx` exists AND most views import `toast` from `sonner`. Two toast systems. Spec expects one.
- **LANDMINE 10 — No PWA means no "add to home screen", no offline fonts, no install prompt.** Spec §10 lists manifest + 180/192/512 icons as ship-gate items; none exist.

---

## Screenshots

Preview server (Vite on port 5191) started cleanly but `preview_snapshot` returned only `[1] RootWebArea` and `preview_screenshot` returned a blank black viewport at 414×896. Likely cause: the default route `/` for guest users gates rendering behind `<Authenticated>` or requires URL params, or the React tree is suspended on a lazy import that never resolves in headless capture. Per `live_dom_verification` rule: **do not claim "the UI renders X" without raw-HTML / DOM evidence.** No screenshots captured; scope of this audit is strictly codebase trace.

Screenshot folder prepared at `docs/chat-logs-unified/screenshots/` for a follow-up pass that (a) starts Convex dev, (b) navigates to `/?surface=ask|workspace|packets|history|connect` explicitly, (c) captures each at 414×896 + 360×780.
