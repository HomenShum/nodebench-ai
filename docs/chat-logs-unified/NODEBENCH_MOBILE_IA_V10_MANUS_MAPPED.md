# NodeBench Mobile IA v10 — Manus-Mapped
Date: 2026-04-21 · Supersedes: `docs/architecture/MOBILE_IA_V9.md` · Demo target: 2026-04-22

---

## TL;DR

- **v9's 5-tab IA is correct and already committed to source** (`Home · Reports · Chat · Inbox · Me`). The Manus teardown validates this order, it does not force a re-architecture.
- **v10 adopts 4 concrete Manus patterns** on top of v9: the expandable Task Progress card inside agent bubbles, the `Favorite · Rename · View files · Run details · Delete` bottom-sheet, the `Diff · Original · Modified` document-viewer bottom tabs, and the Plan-and-Credits hero with sticky Upgrade CTA.
- **v10 rejects 2 Manus patterns**: the "Agents/Manual/Scheduled/Favorites" hub filter pills (NodeBench already has Reports filters and Inbox buckets — adding hub pills creates three competing filter surfaces) and the separate Notifications screen (merge into Inbox — one actionable feed, not two).
- **Demo-day minimum = redeploy, not re-edit.** V5 proved the real ship-gate is the stalled Vercel build. All v9 IA copy (`Inbox` label, composer placeholder `Ask NodeBench…`, Reports pills `Jobs/Markets/Notes`, bucket tabs `Action required/Updates/All`) is already in `main` at HEAD `cab5646a`. Production bundle `CQHXymHa/BcA4bAgy` pre-dates the merge. Ship step is a Vercel manual redeploy + `verify-live.ts` grep.
- **Post-demo follow-ups**: wire the Manus-style Task Progress accordion into `FastAgentPanel`, adopt the Plan-and-Credits breakdown for Me, add the document-viewer Diff/Original/Modified tabs to Report snapshot diffs.

---

## 16-screenshot inventory

Filenames are meaningless IG hashes — identified by content. Numbered by the order they were read.

| # | File suffix | Manus screen | NodeBench mapping | Adopt? |
|---|---|---|---|---|
| 1 | `...542_1297040218419992` | **A. Chat (Task Progress)** — user+agent bubbles, inline task list with checkboxes, collapsed Task Progress card `Task Progress 2/4`, composer `Message Manus` + paperclip + `M +1` connector chip + mic + stop | `/chat` thread detail — agent bubble + inline step chips, plus collapsible Task Progress accordion | **YES** (v10) |
| 2 | `...308_4040901196214353` | **C. Action Menu (bottom sheet)** — Favorite · Rename · View all files · Task details · Delete (red) | `/chat` thread 3-dot menu | **YES** verbatim, rename "Task details" → "Run details" |
| 3 | `...070_1618420302752666` | **E. Files screen** — pill tabs `All · Documents · Code files`, file rows with type icons | `/me > Files` global vault | **ADAPT** — NodeBench pills become `All · Documents · Uploads · Generated` |
| 4 | `...148_1326849189287714` | **D. Task details** — Name · Create at · Credits count (0) | Run details screen | **YES**, add NodeBench fields (Agent · Verdict · Cost · Source) |
| 5 | `...994_1652050049324076` | **Connectors sheet** — `+ Add connectors`, `Manage connectors`, toggles (My Browser/Gmail/GitHub/Repositories/Google Calendar) | `/me > Connectors` | **ADAPT** — already exists; copy the toggle row layout |
| 6 | `...434_937670909133867` | **J. Notifications** — tabs `All · Updates · Messages`, repeated waitlist-lead cards with View more links | DECISION: merge into `/inbox` | **REJECT as separate screen**, merge content types into Inbox buckets |
| 7 | `...017_2372248719915410` | **Live browser (Manus's computer)** — full-screen overlay with URL bar, live page snapshot, `Take control` pill, `Live` indicator, transport controls, progress scrubber | `/chat` live-trace full-screen sheet | **DEFER to post-demo** — too much surface for tomorrow |
| 8 | `...213_1841657349836863` | **Composer attach sheet** — Photos row with Camera tile + thumbnails + `See all`, then `Add files · Connect My Computer · Add Skills · Build website · Create slides (Nano Banana Pro badge) · Create image (Nano Banana Pro badge)` | `/chat` composer + button sheet | **PARTIAL ADOPT** — keep Add files + Connect + Skills; skip Build website / slides / image for demo |
| 9 | `...958_963232022784958` | **F. Home / Manus Hub** — avatar top-left, `manus` wordmark center, search top-right, filter pills `All · Agents · Manual · Scheduled · Favorites`, share banner `Share Manus with a friend · Get 500 credits each`, task list with icons | Candidate for `/home` or unified list | **REJECT pills** (redundant with Reports filters + Inbox buckets); keep avatar + search + recent list pattern for `/home` fallback |
| 10 | `...610_1985656609495232` | **Model picker dropdown** — Manus 1.6 Max / Manus 1.6 (checked) / Manus 1.6 Lite with one-line descriptions | Model picker in agent panel | **YES** post-demo — matches existing NodeBench multi-model story |
| 11 | `...645_2673766739664645` | **A (variant). Initial chat turn** — wordmark `manus`, user bubble "Put all these into markdown…", attachment chip `X GenAI_Interview_Scor… Excel · 15.8 KB`, agent reply opening, `✓ Read and analyze the Excel scorecard` expanded tool chip, Knowledge recalled chip | `/chat` first-turn layout | **YES** — attachment chip shape (X icon + truncated filename + type/size) is the target for NodeBench file chips |
| 12 | `...445_975411818468020` | **Composer + keyboard focus** — live `Viewing browser` status pill, `Convert the scorecard… 01:33` subtask card, `Message Manus` textarea with caret, `+ M+1` attach row, mic, stop | `/chat` active-streaming layout | **YES** — "Viewing browser" status pill pattern = NodeBench "Steps" tab live indicator |
| 13 | `...426_1517687160068426` | **G. Account** — avatar, `Tap to change profile picture`, Name row, Email row, `Delete Account` (red), sticky `Log out` bottom button | `/me > Account` | **YES** verbatim |
| 14 | `...034_2150568675803417` | **Settings list** (continuation of Me) — Data controls · Cloud Browser · Skills · Connectors · Integrations · General (Account · Language · Appearance · Clear cache) · Other (Rate this app · Get help) · version footer | `/me` row list | **ADAPT** — keep the information-architecture rhythm; drop Cloud Browser / Skills for demo |
| 15 | `...793_2165124977594793` | **Mid-chat Thinking state** — extracted scorecard rows as tool chips, `Find authoritative documentation…` Q-icon chips, `Thinking` pill with dot indicator | `/chat` streaming Thinking state | **YES** — `Thinking` pill with blue-dot is simpler than spinner, adopt |
| 16 | `...680_1542899340583680` | **F (variant). Hub list scroll** — share banner, filter pills active `All`, list of threads: `Improving Interview Skills…`, `Create Web and Mobile App…`, `Replying to LinkedIn Messages…`, `Reminder for Homen Shum's Byte…` (yellow calendar icon), etc. | Thread list | **YES** for `/chat > ChatList` row shape (title + 1-line summary + truncated timestamp like `4/12`, icon slot for type/scheduled) |

**MP4 walkthrough**: not ingested — 16 stills already cover screens A–J per the provided teardown, and decisions are unambiguous. If a post-demo pass finds motion/gesture detail the stills missed, we run it through `convex/domains/agents/orchestrator/geminiVideoWrapper.ts` then.

---

## Screen-by-screen NodeBench spec

### 1. `/chat` — Thread detail (Manus A + mid-chat variants)

**Header** (left → center → right):
- Back chevron (circle, 36px) · Manus-equivalent wordmark pill (`Manus 1.6` → for NodeBench this is the model selector `NodeBench · GPT-5` pill) · Add-collaborator icon · Share icon · Overflow (`...`)

**User bubble**:
- Right-aligned
- Corner radius `var(--r-lg)` 16px
- Background `var(--bg-elevated)` (not terracotta — Manus keeps user bubbles neutral)
- Attachment chip below bubble: horizontal row — icon tile (24×24 with app-color: Excel green, code blue, doc blue, image purple) + filename (truncate to 24 chars) + metadata line (`Excel · 15.8 KB`) · min-height 56px · `var(--r-md)` 10px

**Agent bubble**:
- Left-aligned, no bubble background (plain on canvas) — Manus pattern, cleaner than a filled bubble
- Wordmark `nodebench` (JetBrains Mono, lowercase, small, muted) as "avatar" label on first turn only
- Body: Manrope 14px `var(--text-primary)`
- Inline tool-call chips (inherited pattern): icon + 1-line truncated description · capsule · `var(--r-full)` · `var(--bg-elevated)` fill
- Tool icon slot (16×16): pencil (edit/write), magnifying-glass (search/query), compass (browse/open URL), `>_` (shell/code), lightbulb ($-symbol) (Knowledge recalled)

**Inline Task Progress accordion** (Manus A — the big adopt):
- Card with `var(--r-lg)` 16px, `var(--bg-elevated)`, full-width
- Header row: small thumbnail-preview stack on left (24×24 rotated doc icons), title `Task Progress 2/4`, chevron-down on right
- Expanded body: vertical checklist
  - `✓ Read and analyze the Excel scorecard` — green check · strike-through on label only if v-complete
  - `◉ Convert the scorecard content into Markdown…` + `01:07` timestamp muted 12px
  - `◷ Identify knowledge/usage gaps and formulate…` — clock icon for queued
  - `◷ Deliver the final Markdown document and imp…`
- Tap any row = scroll chat to that step
- NodeBench semantics: the 4 items are **sub-runs** (children of parent run). `RunEnvelope.verdict` drives the leading icon color (verified = green check, needs_review = amber clock, failed = red X).

**Inline "status pill"** (Manus screenshot 12):
- Format: `● Viewing browser` or `● Thinking`
- Blue dot (`var(--info-500)`) for live state, amber for paused
- Appears BETWEEN tool-chips when agent is active on a long-running tool
- Replaces traditional spinner for better calm; respects `prefers-reduced-motion`

**Artifact chip** (Manus 12 — the "Convert the scorecard content into Mar… 01:33" card):
- Card with small doc thumbnail on left, truncated title, `mm:ss` elapsed or timestamp
- Tapping = open Document Viewer (spec 6)

**Composer** (bottom):
- Textarea with placeholder literal: `Ask NodeBench` (v9 rule; source already correct at `src/features/agents/primitives/AgentComposer.tsx:59`)
- Left affordance: `+` button (opens attach sheet, spec 8)
- Connector chips inline after `+`: `M +1` style = active connector icon(s) + `+N` overflow count
- Right affordances: mic icon, primary Send/Stop button (filled terracotta circle with send arrow OR filled dark with stop square during streaming)
- Height: 48px collapsed, expands to 120px max on multiline

---

### 2. `/reports` — List (v9 rules reinforced)

**Filter pills** (literal, left → right):
`All · Companies · People · Markets · Jobs · Notes`

Source already has all six at `src/features/reports/views/ReportsHome.tsx:45-49`. The V5 audit saw only `All / Companies / People` in dev because a filter flag hides the last three on certain personas. **Fix: remove that gating for demo day.** One-line change in the pill render.

**Row shape** (per Manus F variant):
- 56px height
- Icon tile 36×36 left (entity-type specific — building for company, person-circle for person, chart for market, briefcase for job, note for note)
- Title: Manrope 14/semibold, truncate 1 line
- Summary: Manrope 13/regular `var(--text-secondary)`, truncate 1 line
- Meta (right): favorite star + updatedAt short-form (`4/12`, `3h`, `Now`)

**Empty state**:
`No reports yet · Save a thread's artifacts to track entities`
(Positive, not dead.)

---

### 3. `/inbox` — List (Manus J + v9 rules)

**Tab order** (literal):
`Action required · Updates · All`

Source already has `action_required` tab at `src/features/nudges/views/NudgesHome.tsx:285`. V5 saw the wrong tabs (`Ask / Note / Task / Founder / …`) because production was stale **and** the working-copy had a persona-overlay variant active. **Fix: confirm the `bucket: "action_required" | "update"` contract is wired and persona overlays don't replace it.**

**Empty states** (positive, per v9):
- Action required: `You're all caught up · last checked Xm ago`
- Updates: `No fresh updates · last checked Xm ago`
- All: `Nothing waiting on you · last checked Xm ago`

**Row composition** (per Manus J "New Nodebench AI waitlist lead" card):
- Card `var(--bg-elevated)` + `var(--r-md)`
- Title 14/semibold
- Body: 2-3 lines of `Label: value` metadata (`Email:`, `Name:`, `Company:`) — monospace-ish
- Link: `View more` in terracotta accent
- Bucket indicator: left edge rail (2px, colored) — red for action_required, blue for update

**Notifications merge**: Notifications screen (Manus J) is folded into Inbox. Messages from system become `update` bucket items. Lead notifications (NodeBench-specific — waitlist leads, RSS matches) also land in `update`. No separate `/notifications` route.

---

### 4. `/home` — Daily Pulse (Manus F + v9 rules)

**Header** (Manus F):
- Avatar top-left (32px circle, tap → `/me`)
- Logo wordmark center (`nodebench` Manrope)
- Search icon top-right (opens global-search sheet)
- Bell icon (red dot when unread) — taps `/inbox` NOT a separate screen

**Daily Pulse card** (v9 rule, load-bearing):
- Hero card with `var(--r-xl)` 24px
- Editorial 1-sentence dominant story
- 3-5 preview items (never more)
- Freshness chip: `Updated 2h ago`
- Suppress if `updatedAt > 18h` OR `items.length < 3`

**Quick actions row** (Manus F equivalent — but reduced):
- Manus has 4: Agents/Manual/Scheduled/Favorites
- NodeBench v10 has 3: **Run · Scheduled · Saved** (rejecting Favorites as a separate tile — use star-on-row affordance instead)
- Each tile: 64×72 card, icon 24px top, label 12px bottom

**Recent threads** (Manus F list):
- Section header `Recent` 11px uppercase `var(--tr-label)`
- Rows = same shape as `/chat > ChatList` rows
- Tap = open thread in `/chat`

**Fallback chain** (if Pulse suppressed, per v9):
pinned reports → important inbox items → recent threads.

---

### 5. `/me` — Profile + Files + Plan + Account (Manus F+G+H)

**Profile header** (Manus H):
- Avatar 48px left
- Name `Homen Shum` 18/semibold
- Email `hshum2018@gmail.com` 14/muted
- Chevron right = tap opens Account screen (Manus G)

**Plan & Credits card** (Manus H — strong adopt):
- Hero `var(--r-xl)` card, gradient-subtle accent
- Row 1: plan name (`NodeBench Pro`) + renewal date + `Upgrade` pill-button right
- Dashed divider
- Row 2: `Credits` label + sparkle icon + amount (`2374`) + chevron right (opens breakdown)
- Row 3 (subdued): `Explore what's in NodeBench Pro` + chevron

**Sections below** (reduced from Manus 14 — drop Cloud Browser, Mail-to-app for demo):
- **NodeBench** section header
  - Files (→ vault, spec 5a)
  - Share with a friend
  - Scheduled runs
  - Knowledge
- **Connectors** section header
  - Connectors (→ sheet, Manus screenshot 5)
  - Integrations
- **General** section header
  - Account (→ Manus G screen verbatim)
  - Appearance · dropdown `Follow system` / `Light` / `Dark`
  - Language
  - Clear cache · right-side shows size like `22.2 MB`
- **Other** section header
  - Rate this app
  - Get help
- Version footer: `NodeBench v2.32.0` (center, muted)

**5a. `/me > Files` — vault** (Manus E):
- Screen title: `Files`
- Filter pills: `All · Documents · Uploads · Generated`
- Row shape per Manus E: 36×36 colored icon tile + filename + meta (`12:58 · File` or `15.8 KB · Excel`)
- Tap = open Document Viewer (spec 6)

---

### 6. Document viewer (Manus B — full adopt)

**Header**:
- Back chevron · truncated filename title center · Share icon · Download-to-menu icon (overflow)

**Body**:
- Markdown-rendered prose with code fences
- `JetBrains Mono` for code
- Single-column, full width minus `var(--s-4)` padding

**Bottom tabs** (Manus B — the pattern we steal verbatim):
`Diff · Original · Modified` — when the file has a diff available (Report snapshot vs parent, or agent-edited upload vs original). If no diff, hide the tab bar and show just the body.

**Share sheet** (Manus-style):
- `Only me` / `Public access` toggle
- `Download as PDF`
- `Copy link`

---

### 7. Bottom-sheet action menu (Manus C — verbatim adopt)

Triggered from 3-dot overflow on any thread row or artifact:

```
☆ Favorite
✎ Rename
📁 View all files
ⓘ Run details            (Manus says "Task details" — rename for NodeBench)
🗑 Delete                  (destructive, red text)
```

Sheet uses `var(--r-lg)` top-corners, `var(--bg-sheet)` fill, 44px row height, full-width tap targets, safe-area-inset bottom.

---

### 8. Run details (Manus D + NodeBench verdict extensions)

**Header**: back chevron · `Run details` title

**Single card**:
- Name: link to rename (Manus `>` affordance)
- Created at: `Apr 21, 2026 at 12:55 AM`
- Cost: `$0.24` (NodeBench addition)
- Credits: `47` (if applicable)
- **Agent**: `NodeBench · GPT-5` (NodeBench addition)
- **Verdict**: badge — `verified` (green) / `provisionally_verified` (amber) / `needs_review` (amber outline) / `failed` (red) — from `RunEnvelope.verdict`
- **Gates**: compact row `6/6 · 0 failed` with chevron → gate breakdown
- **Source**: link to parent run/thread

This panel is the operator's "summary above raw trace" per the `agent_run_verdict_workflow` rule. Verdict derives from existing `RunEnvelope.verdict` shipped in the v9 projection.

---

### 9. Plan & Credits breakdown (Manus H — adopt)

Drilled into from the Me Plan card:

**Hero counter**:
- `2374` (JetBrains Mono 44px, `var(--text-primary)`)
- Sparkle icon above
- Label `Credits` 14/muted

**Breakdown rows**:
- `Free: 12`
- `Monthly: 2362 / 4000` (with progress bar)
- `Daily refresh: 229`

**History list**:
- Date + reason + delta (red negative, green positive)
- Example: `Apr 20 · Report generation · -47`

**Sticky bottom**: `Upgrade` button (terracotta fill, full-width minus padding).

---

### 10. Upgrade modal (Manus I — copy structure)

Plan cards stacked vertically on mobile:

```
┌─────────────────┐
│ Free             │
│ $0/mo            │
│ • 40 credits/day │
└─────────────────┘

┌─────────────────┐  ← highlighted
│ Pro              │
│ $29/mo           │
│ • 4000/mo        │
│ • Priority runs  │
│ • Full history   │
└─────────────────┘

┌─────────────────┐
│ Team             │
│ $99/seat/mo      │
│ • Shared files   │
│ • Admin controls │
└─────────────────┘

Contact sales ─ Enterprise
```

(Pricing numbers placeholder — align to `docs/architecture/PRODUCT_POSITIONING.md`.)

---

### 11. Notifications — REJECTED as separate screen

Manus ships J (Notifications: `All · Updates · Messages`) as a separate bell-icon destination. NodeBench v10 **merges this into Inbox**. Rationale:

- v9 already defines `Inbox = Action required + Updates + All`.
- Manus's `Messages` tab is for system chat-threads (onboarding, tips) — NodeBench folds these into `Updates` with `kind: "system_message"`.
- Manus's `Updates` tab is operational change logs — already covered by NodeBench `Updates`.
- A bell icon on `/home` still works — it navigates to `/inbox` (NOT a separate `/notifications` route).

**Shipping two actionable feeds is the anti-pattern to avoid.** Users check one place.

---

## Deltas from v9 (explicit)

| Area | v9 | v10 | Reason |
|---|---|---|---|
| Task Progress presentation | "Steps" tab in thread detail | **v9 Steps tab PLUS** an inline Task Progress accordion inside the agent bubble | Manus proves the inline view reads better than hunting to a tab for active runs; keep Steps tab for full trace |
| Document viewer | Single-column markdown (v9) | **+ Diff / Original / Modified bottom tabs** when diff available | Direct Manus B adoption; extends to Report snapshot diffs |
| Action menu | Not fully specced in v9 | **Explicit 5-item sheet**: Favorite · Rename · View all files · Run details · Delete | Manus C is a clean pattern; naming Run details not Task details aligns NodeBench vocabulary |
| Run details panel | Implied by `RunEnvelope.verdict` contract (v9) | **Concrete screen spec** with verdict badge, gates row, cost, agent, source link | Satisfies `agent_run_verdict_workflow` rule requirement that verdicts are surfaced above raw trace |
| Plan & Credits | Generic "credits/plan" row in Me (v9) | **Explicit Manus-H hero + breakdown + sticky Upgrade CTA** | Monetization path needs concrete UI; Manus H is the template |
| Home quick-actions | Daily Pulse only (v9) | **Pulse + 3-tile quick-action row**: Run · Scheduled · Saved | Manus F proves users want a launchpad; REJECT Manus's 4-tile pills (filters elsewhere) |
| Thinking state | Spinner (implied) | **`● Thinking` status pill** with calm blue dot | Reduced-motion friendly; Manus pattern |
| Notifications | Not addressed in v9 | **Merged into Inbox, no separate screen** | Prevents two-feed fragmentation |
| Files pills | Global vault (v9) | `All · Documents · Uploads · Generated` (adapted from Manus E's `All · Documents · Code files`) | NodeBench has no separate "Code files" type; Uploads vs Generated is the load-bearing axis |
| Attachment chip | Generic (v9) | **Manus-11 shape**: colored app icon + filename + `type · size` metadata | Concrete spec, not "TBD" |

---

## What we ADOPT from Manus (top-5)

| # | Pattern | Why it works | NodeBench application |
|---|---|---|---|
| 1 | **Inline Task Progress accordion** (A) | Users see what the agent is doing without switching tabs; visual density stays calm | `/chat` agent bubble — inline steps PLUS a collapsible progress card with first/current/remaining sub-runs |
| 2 | **Bottom-sheet action menu** (C) | 5 items, destructive red, clean `var(--r-lg)` sheet; zero ambiguity about what each does | All thread/artifact 3-dot menus |
| 3 | **Diff / Original / Modified** document tabs (B) | Makes revision review native; doesn't force a desktop-diff viewer | Report snapshot diffs, agent-edited uploads |
| 4 | **Plan & Credits hero + sticky Upgrade** (H) | Monetization feels like a feature, not a paywall; the credit counter is the main character | `/me > Plan & Credits` |
| 5 | **Status pill with calm blue dot** (12) | `● Viewing browser` / `● Thinking` replaces spinner with something you can read | Replace spinners across `/chat` active states |

---

## What we REJECT from Manus

| # | Pattern | Why it doesn't fit |
|---|---|---|
| 1 | **Hub filter pills** `Agents · Manual · Scheduled · Favorites` (F) | NodeBench already filters Reports AND buckets Inbox. A third filter surface on Home splits user attention and repeats logic. Replace with 3 explicit quick-action tiles (Run · Scheduled · Saved). |
| 2 | **Separate Notifications screen** (J) | Two actionable feeds = user confusion. NodeBench merges system messages into Inbox `Updates`. One place to check. |

Also noted but deferred (not rejected): Manus's Live Browser overlay (screenshot 7) is elegant but non-essential for demo. Manus's Model Picker dropdown (10) is a clean pattern we'll adopt post-demo.

---

## Demo-day minimum (2026-04-22) — MUST SHIP TONIGHT

**The critical finding from V5 is that NodeBench's v9 IA is already committed to main.** The blocker is a **stalled Vercel deploy**, not source-code churn. Production bundle `CQHXymHa/BcA4bAgy` is older than HEAD `cab5646a`. All four V5-flagged failures resolve the moment the deploy webhook re-fires.

### Atomic merge set for demo-day

**Step 1 — Kick the Vercel deploy (0 code, 5 min).**

- Log in to Vercel dashboard
- Confirm the GitHub integration for `nodebench-ai` is still connected (V5 suspects it's silently disconnected)
- Manually trigger a `Redeploy` against `main @ cab5646a` (or latest HEAD)
- Wait for Ready status
- Verify new bundle hashes: `curl -s https://www.nodebenchai.com/ | grep -oE '/assets/index-[A-Za-z0-9]+\.(js|css)'` — must differ from `CQHXymHa / BcA4bAgy`

**Step 2 — Tier-A grep verification (2 min).**

```bash
npx tsx scripts/verify-live.ts          # must print "LIVE OK"
curl -s https://www.nodebenchai.com/ | grep -oE '(Inbox|Nudges)'    # expect: Inbox only
curl -s https://www.nodebenchai.com/ | grep -oE 'Ask NodeBench'     # expect: match
curl -s https://www.nodebenchai.com/ | grep -oE '(Jobs|Markets|Notes)'  # expect: all three
```

**Step 3 — Tier-B live smoke (5 min).**

```bash
BASE_URL=https://www.nodebenchai.com npm run live-smoke
```

**Step 4 — If ANY step 2/3 signal is missing, source is out of sync.** Check these exact file:line locations:

- Sidebar label — verify there's no remaining `"Nudges"` literal anywhere a user reads:
  ```
  src/layouts/WorkspaceRail.tsx            # sidebar labels
  src/layouts/ActiveSurfaceHost.tsx:29-30  # lazy import is fine (internal name)
  src/features/nudges/views/NudgesHome.tsx # component file name — LEAVE (internal)
  ```
  User-facing strings should say `Inbox`. The component export name `NudgesHome` can stay.

- Composer placeholder — already correct:
  ```
  src/features/agents/primitives/AgentComposer.tsx:59
    placeholder = "Ask NodeBench…",
  src/features/agents/components/FastAgentPanel/FastAgentPanel.InputBar.tsx:213
    placeholder = 'Ask NodeBench...',
  ```
  **Action**: none if the v9 composer is the one used on mobile `/chat`. **Audit this before demo** — V5's "FAIL" report came from a desktop `AgentCommandBar.tsx:228` which still says `"Ask anything or use /spawn…"`. If mobile `/chat` renders `AgentCommandBar`, override its `placeholder` prop to `"Ask NodeBench"` at the call site.

- Reports filter pills — already correct:
  ```
  src/features/reports/views/ReportsHome.tsx:45-49
    { id: "all", label: "All", … },
    { id: "companies", label: "Companies", type: "company" },
    { id: "people", label: "People", type: "person" },
    { id: "jobs", label: "Jobs", type: "job" },
    { id: "markets", label: "Markets", type: "market" },
    { id: "notes", label: "Notes", type: "note" },
  ```
  **Action**: if dev-server only renders 3 pills, find the persona gate that hides the last 3 and remove it for demo. (Search `ReportsHome.tsx` for `.filter(` or `activeFilters` predicates.)

- Inbox tabs — already correct:
  ```
  src/features/nudges/views/NudgesHome.tsx:285
    ["action_required", `Action required ${filterCounts.action_required}`],
  ```
  **Action**: confirm `Updates` and `All` tabs are adjacent in the same map. If persona overlay replaces these tabs with `Ask/Note/Task/Founder/…` as V5 saw, disable the persona overlay for demo.

### Vocabulary tier for tomorrow

Until the Vercel rebuild completes + `verify-live.ts` prints `LIVE OK`:

- Say: `committed`, `merged to main`, `tsc clean`, `build clean`
- Do NOT say: `live`, `shipped`, `deployed`, `the site now shows`

After `LIVE OK` + Tier-B smoke passing: then the word `live` is earned.

---

## Remainder 6 — how the 16 screenshots contribute

The user's literal question: there are 10 Manus screen archetypes A–J in the teardown, but 16 screenshots. What do the "remainder 6" actually add?

The remainder 6 are **state variations and transitions** of the canonical screens, and that's exactly where the load-bearing UI detail lives. Screenshots 1, 11, 12, 15 are all "Chat" (screen A) but each captures a different state: collapsed Task Progress card (1), first-turn with attachment chip (11), mid-stream with live `Viewing browser` status pill and focused keyboard (12), and the `Thinking` pill indicator with tool-chip density (15). If we only had the canonical A screen, we'd miss the mid-stream status-pill pattern entirely — which is the difference between a loud spinner-driven UI and a calm dot-indicator UI. Likewise, screenshots 9 and 16 are both "Home hub" (F) but one shows the share-banner empty-ish state and the other shows a scrolled list state — together they specify what the list row looks like in both contexts.

The other remainder variations: screenshot 5 is a bottom-sheet (Connectors) that extends E/F context, screenshot 8 is the composer attach sheet that extends A, and screenshot 10 is the model-picker dropdown that extends A's header. None of these are new screens — they are critical interaction affordances rooted in existing screens. **Net: we keep all 16 because each "extra" pins down a specific transition or sub-sheet that the canonical A–J screens leave ambiguous.** Rejecting the 6 extras would force the engineer to improvise those states, which is exactly what the v10 spec exists to prevent.

---

## Open questions (pin to demo followup)

1. **Which composer does mobile `/chat` actually render?** `AgentComposer.tsx` (correct placeholder) or `AgentCommandBar.tsx` (wrong placeholder)? V5 saw `"Ask anything. Paste notes, URLs, or files to ground the answer."` on mobile — that string isn't in `src/` grep results, which means it's coming from a third composer or a prop override. Audit tonight.
2. **Persona overlays on Inbox tabs** — is the overlay that replaces `Action required/Updates/All` with `Ask/Note/Task/Founder/…` intentional for a specific role, or an accidental A/B flag? If intentional, v10 Inbox spec needs a persona-aware tab contract.
3. **Plan pricing numbers** — $29/$99 placeholders vs. whatever `docs/architecture/PRODUCT_POSITIONING.md` says. Finalize before Upgrade modal demos.
4. **Live Browser overlay (Manus 7)** — adopt for v10.1 or rely on existing `/chat > Steps` tab forever? Depends on whether investors expect the "Manus-style computer-use" reveal.
5. **Credits semantics** — does NodeBench price runs in credits or dollars? Manus H uses credits. NodeBench current Me page uses dollar cost. Pick one for the hero counter.

---

## Appendix — source-file pointers (for the engineer)

| Concern | File | Line(s) |
|---|---|---|
| Sidebar label (Inbox) | `src/layouts/WorkspaceRail.tsx` | grep for `Nudges`, replace user-facing strings with `Inbox` |
| Mobile `/chat` composer (placeholder) | `src/features/agents/primitives/AgentComposer.tsx` | 59 (default), 158 (render) |
| FastAgent input bar (placeholder) | `src/features/agents/components/FastAgentPanel/FastAgentPanel.InputBar.tsx` | 213 (default), 1155 (render) |
| Desktop agent command bar (placeholder — possible mobile leak) | `src/features/agents/components/AgentCommandBar.tsx` | 228 (default), 332 (render) |
| Reports filter pills | `src/features/reports/views/ReportsHome.tsx` | 45-49 (definition), 446-451 (filter logic) |
| Inbox tabs | `src/features/nudges/views/NudgesHome.tsx` | 285 (tab list) |
| Theme override (terracotta, already live at runtime) | `src/contexts/ThemeContext.tsx` | 160-169 |

Verification commands (mandatory, in order):
```bash
npx convex codegen
npx tsc --noEmit
npm run test:run
npm run build
npx tsx scripts/verify-live.ts
BASE_URL=https://www.nodebenchai.com npm run live-smoke
```

---

*Spec v10 · 2026-04-21 · Supersedes `docs/architecture/MOBILE_IA_V9.md` for the mobile surface. Architecture contracts (`RunEnvelope`, `ChatThread`, projections) are unchanged from v9.*
