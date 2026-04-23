# NodeBench Mobile UI Design Spec v1 (pairs with IA v9)

**Goal:** lock the visual design, interactions, transitions, and screen-by-screen look so any engineer can build Phase 1 without re-deciding anything. References Manus's interaction patterns (from the 16-screenshot teardown) grafted onto NodeBench's existing warm-dark design DNA.

---

## 1. Design language

### 1.1 Mood board

- **NodeBench base (existing):** warm-dark, quiet, premium. Think "Bloomberg terminal meets Linear" — data-dense but readable.
- **Manus grafts:** expandable task lists, bottom sheets, tabbed artifact views, smooth accordions.
- **What we're NOT:** sterile macOS grey, Slack-bright-accent, Notion-white-paper, ChatGPT-pure-black.

### 1.2 Design tokens (single source of truth)

```css
/* Color — warm dark base */
--bg-primary:      #151413;   /* app background */
--bg-elevated:     #1c1a19;   /* raised surface (cards, sheets) */
--bg-sheet:        #221f1d;   /* bottom sheet / modal */
--surface-glass:   rgba(255,255,255,0.02);  /* glass card fill */
--border-subtle:   rgba(255,255,255,0.06);  /* glass card stroke */
--border-strong:   rgba(255,255,255,0.12);  /* active / focus stroke */

/* Text */
--text-primary:    #f5f3ef;   /* body */
--text-secondary:  #a8a39d;   /* metadata */
--text-muted:      #6e6863;   /* tertiary */
--text-accent:     #d97757;   /* brand terracotta */
--text-inverse:    #151413;   /* on accent-filled buttons */

/* Accent — terracotta warm orange */
--accent-500:      #d97757;   /* primary CTA, active tab, brand */
--accent-400:      #e08b6e;   /* hover */
--accent-600:      #c26742;   /* pressed */
--accent-wash:     rgba(217,119,87,0.12);  /* selected-row fill */

/* Semantic */
--success-500:     #4fb286;   /* verified */
--warn-500:        #d4a94a;   /* provisionally_verified, stale */
--error-500:       #cf5656;   /* failed, action_required */
--info-500:        #6e9fd4;   /* update, info */

/* Verdict-specific (derived) */
--verdict-verified:    var(--success-500);
--verdict-prov:        var(--warn-500);
--verdict-review:      var(--warn-500);
--verdict-failed:      var(--error-500);

/* Radius */
--r-sm:  6px;   /* chips, badges */
--r-md:  10px;  /* cards, inputs */
--r-lg:  16px;  /* sheets, large cards */
--r-xl:  24px;  /* hero cards */
--r-full: 9999px;

/* Spacing — 4pt grid */
--s-1: 4px;  --s-2: 8px;  --s-3: 12px;  --s-4: 16px;
--s-5: 20px; --s-6: 24px; --s-8: 32px;  --s-10: 40px;

/* Typography */
--font-ui:    'Manrope', -apple-system, 'Inter', system-ui, sans-serif;
--font-mono:  'JetBrains Mono', 'SF Mono', Consolas, monospace;

/* Type scale */
--t-display: 28px / 1.15  var(--font-ui);  /* screen title */
--t-title:   20px / 1.25  var(--font-ui);  /* section title */
--t-body:    14px / 1.45  var(--font-ui);  /* BASELINE: never below 14px */
--t-body-lg: 16px / 1.45  var(--font-ui);  /* preferred reading */
--t-meta:    12px / 1.35  var(--font-ui);  /* metadata (14px baseline ≥ keep at 12px ONLY for true metadata) */
--t-label:   11px / 1.2   var(--font-ui);  /* section label, uppercase */
--t-mono:    13px / 1.4   var(--font-mono);/* trace, IDs */

/* Tracking */
--tr-label:  0.2em;  /* on uppercase section labels */
--tr-tight:  -0.01em;
--tr-normal: 0;

/* Elevation */
--shadow-sm: 0 1px 2px rgba(0,0,0,0.3);
--shadow-md: 0 4px 16px rgba(0,0,0,0.4);
--shadow-lg: 0 16px 48px rgba(0,0,0,0.5);

/* Motion */
--ease-out:    cubic-bezier(0.22, 1, 0.36, 1);   /* default for entrances */
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);     /* tab switches */
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);/* sheets, sends */

--dur-fast:   120ms;  /* hover, tap feedback */
--dur-base:   220ms;  /* tab switch, inline reveal */
--dur-slow:   360ms;  /* sheet present, modal */
--dur-xl:     500ms;  /* page transition, large reveal */

/* Z-index */
--z-tab-bar:    50;
--z-sheet:      100;
--z-modal:      200;
--z-toast:      300;
```

### 1.3 Iconography

- **Set:** Lucide (tree-shakeable, 1.5px stroke, consistent with Manrope weight).
- **Size:** 20px default in UI, 16px in chips, 24px in headers, 32px in empty states.
- **Stroke:** 1.5px everywhere. Never 2px on mobile — reads as heavy.
- **No emoji in chrome.** Emoji only in user-generated content and explicit reactions.

---

## 2. Layout grid

### 2.1 Mobile-first viewports

```
┌─────────────────────┐   360px (smallest supported, pre-2021 Android)
│                     │
│   One-column body   │   content width = viewport - 2×var(--s-4) = 328px
│                     │
└─────────────────────┘

┌───────────────────────────┐   414px (iPhone Pro-max, most common target)
│                           │
│     Roomier one-column    │   content width = 382px
│                           │
└───────────────────────────┘

At 768px+ (iPad portrait), we do NOT add a sidebar. Mobile layout scales up with max-width 640px centered. Desktop is NOT a first-class target for v1.
```

### 2.2 Safe areas

- Top: `env(safe-area-inset-top) + var(--s-2)`.
- Bottom: `env(safe-area-inset-bottom) + tab-bar-height (56px)`.
- Sides: always `var(--s-4)` (16px).

### 2.3 Vertical rhythm

- Screen title → first content: `var(--s-6)` (24px).
- Section title → cards: `var(--s-3)` (12px).
- Card → card: `var(--s-2)` (8px).
- Inside card padding: `var(--s-4)` (16px).

---

## 3. Component library

### 3.1 Buttons

```
Primary                  Secondary                 Ghost
┌──────────────┐         ┌──────────────┐          ┌──────────────┐
│  Ask NodeB.  │         │   Cancel     │          │   Dismiss    │
└──────────────┘         └──────────────┘          └──────────────┘
bg: accent-500            bg: bg-elevated           bg: transparent
text: text-inverse        text: text-primary        text: text-secondary
border: none              border: border-subtle     border: none
height: 44px              height: 44px              height: 44px
radius: --r-md            radius: --r-md            radius: --r-md
press scale: 0.97         press scale: 0.97         press scale: 0.97
haptic: light             haptic: light             haptic: none
```

All buttons: `min-height 44px` (Apple HIG touch target). Full-width on mobile unless in a row of 2+.

### 3.2 Tabs (bottom nav)

```
┌────────────────────────────────────────────────┐
│                                                │
│  🏠      📊      💬      📬      👤           │
│  Home   Reports  Chat*   Inbox    Me           │
│                  •                              │
└────────────────────────────────────────────────┘
                 * center tab, visually emphasized

- Height: 56px + safe-area-inset-bottom
- Background: rgba(21,20,19,0.85) + backdrop-filter: blur(16px)
- Active tab: accent-500 icon + 2px dot underneath
- Inactive: text-muted icon, text-secondary label
- Center Chat emphasis: icon 24px (vs 20px for others), slight vertical lift (-2px),
  persistent accent tint on the icon even when inactive
- Tap target: 56×64 per tab (well over 44×44 minimum)
- Tap feedback: scale 0.92 + 50ms haptic
```

### 3.3 Tabs (top segmented)

```
┌──────────────────────────────────────────────┐
│  [Conversation]  Steps   Artifacts   Files   │
│   ───────────                                 │
└──────────────────────────────────────────────┘

- Underlined active state, not filled pill
- Swipe left/right between tabs (optional, respects reduced-motion)
- Tab indicator: 2px accent-500, 220ms ease-in-out slide
- Tab label: --t-body, weight 600 when active, 500 inactive
```

### 3.4 Thread card (Chat list)

```
┌─────────────────────────────────────────────┐
│  🟢  Anthropic diligence                  › │
│                                             │
│  "found 3 recent funding signals + 2 team   │
│   changes. Structuring the memo now..."     │
│                                             │
│  ───────────                                 │
│  streaming · 3 artifacts · 2 files · 2m ago │
└─────────────────────────────────────────────┘

- Radius: --r-md (10px)
- Padding: --s-4 (16px)
- Background: var(--surface-glass)
- Border: 1px var(--border-subtle)
- Status dot top-left: 8px circle
    🟢 streaming        → success-500 with 1.4s pulse
    🟡 needs_attention  → warn-500
    ✓  completed        → success-500 solid
    ✕  failed           → error-500
- Title: --t-body-lg, weight 600
- Preview: --t-body, text-secondary, max 2 lines
- Divider: 1px border-subtle
- Meta row: --t-meta, text-muted, "·" separators
- Press scale: 0.99, haptic light
```

### 3.5 Report card (Reports list)

```
┌─────────────────────────────────────────────┐
│  [company]  Anthropic                    ⭐ │
│                                             │
│  Signal: $8B Series E reported 2026-04-18.  │
│  Verified (9/10 gates).                     │
│                                             │
│  updated 4h ago · 12 sources · memo ready   │
└─────────────────────────────────────────────┘

- Subject type chip top-left: --t-label, uppercase, tracked 0.2em,
  bg accent-wash, text accent-500, radius --r-sm
- Title: --t-body-lg, weight 600
- Favorite star right: tap to toggle, 220ms fade
- Summary: --t-body, text-secondary, 2 lines
- Meta row: --t-meta, text-muted
```

### 3.6 Source chip (the readability fix)

```
❌ Before:                    ✓ After:
┌───┐                         ┌──────────────────────────┐
│ T │                         │ ● techcrunch.com — Series E│
└───┘                         └──────────────────────────┘
single letter, unreadable     min-width 80px, max 220px

- Height: 24px
- Padding: 0 --s-2 (8px horizontal)
- Radius: --r-sm
- Background: var(--bg-elevated)
- Border: 1px var(--border-subtle)
- Domain: --t-meta, weight 600, text-primary
- Title: --t-meta, text-secondary, truncate middle
- Leading favicon dot: 6px circle at domain's brand color (or neutral)
- Max 3 chips visible per row; overflow → "+4 more" chip that opens a sheet
```

### 3.7 Task execution list (the Manus-grafted pattern)

```
┌─────────────────────────────────────────────┐
│  ✓  Read and analyze pitch deck         ⌄   │
│     └ extracted 14 slides                   │
│     └ identified 3 risk factors             │
│                                             │
│  ✓  Web search for recent signals       ⌄   │
│     └ 12 results from techcrunch, the info  │
│                                             │
│  ○  Structuring the memo...                 │
│     └ (running 4s...)                        │
│                                             │
│  ○  Judge gate                              │
└─────────────────────────────────────────────┘

- Each row: 36px min height
- Checkbox: 18px, completed=success-500 filled, running=empty pulsing,
  pending=text-muted stroke
- Title: --t-body, weight 500
- Sub-steps: --t-meta, text-secondary, indented 28px, prefix "└ "
- Expand chevron right: 220ms rotate on tap
- Running row: 1.4s opacity pulse 0.4 → 1.0 → 0.4
- Position: Steps tab, NOT default Conversation view
```

### 3.8 Bottom sheet

```
             (dim backdrop — rgba(0,0,0,0.5))
             tap outside to dismiss
┌───────────────────────────────────────────┐
│           ══════════                      │  ← grabber handle, 36px × 4px
│                                           │     bg border-strong
│   Anthropic diligence                     │  ← title, --t-title
│   ─────────                                │
│                                           │
│   ⭐  Favorite                             │
│   ✎  Rename                                │
│   🗂  View all files                       │
│   ⓘ  Task details                          │
│   🗑  Delete                    (error-500)│
│                                           │
└───────────────────────────────────────────┘

- Background: var(--bg-sheet), radius --r-lg top only
- Presentation: slide up from bottom, 360ms ease-spring
- Dismiss: swipe down OR tap backdrop, 220ms ease-out
- Safe area padding bottom
- Rows: 48px height, icon 20px, label --t-body-lg
- Destructive row: text-error-500, pressed state bg rgba(207,86,86,0.12)
```

### 3.9 Pulse card (Home)

```
┌─────────────────────────────────────────────┐
│  DAILY PULSE                    Updated 2h  │
│                                             │
│  Today's signal: Anthropic closed an $8B   │
│  Series E and shipped Claude 4.7 Opus.     │
│                                             │
│  ──────                                     │
│  1. $8B Series E — 3 competing explanation. │
│  2. Claude 4.7 Opus 1M context launch.     │
│  3. Cursor crossed 100k paid seats.         │
│                                             │
│  [ Open full brief → ]                     │
└─────────────────────────────────────────────┘

- Background: linear-gradient(135deg, bg-elevated, bg-sheet) + glass DNA
- Top label: --t-label uppercase tracked, text-muted
- Top-right: --t-meta, text-muted, freshness stamp
- Intro: --t-body-lg, text-primary, 2 lines max
- Divider: 1px border-subtle
- Items: numbered, --t-body, text-secondary, 1 line each
- CTA: ghost button full-width → opens brief thread in Chat
- ENTIRE CARD is tappable → same destination as CTA
- Suppression: if stale (>18h) or items <3, render nothing; caller chooses fallback
```

### 3.10 Verdict badge

```
✓ Verified         (success-500, bg-wash 12%)
~ Provisional      (warn-500)
! Needs review     (warn-500)
✕ Failed           (error-500)

- Height: 20px
- Padding: 0 --s-2
- Radius: --r-sm
- Icon 12px + label --t-meta uppercase tracked
- Placed in thread card meta row, report header, run detail
```

### 3.11 Empty states (positive terminal)

```
Inbox empty:
┌─────────────────────────────────────────┐
│                                         │
│                 ✓                        │   ← 32px success icon
│                                         │
│      You're all caught up                │   ← --t-title
│   last checked 2m ago                    │   ← --t-meta text-muted
│                                         │
└─────────────────────────────────────────┘

Pulse empty (suppressed entirely; fallback promoted):
  (not rendered — fallback widgets shown in priority order)

Search empty:
  "No results for 'X' · try a different spelling or source"
  with suggested recent threads below
```

---

## 4. Screen-by-screen (all 5 tabs + key details)

### 4.1 Chat list (default landing)

```
╔══════════════════════════════════════════════╗
║ 10:24                                   ●●●● ║  ← status bar (system)
╠══════════════════════════════════════════════╣
║                              🔍              ║  ← top-bar: search
║                                              ║
║  Chat                                        ║  ← --t-display
║                                              ║
║  ┌────────────────────────────────────────┐ ║
║  │  Ask NodeBench…                     ➤ │ ║  ← composer
║  │  📎  🎤                                │ ║     (attach, voice)
║  └────────────────────────────────────────┘ ║
║                                              ║
║  ACTIVE                                      ║  ← --t-label tracked
║  ┌────────────────────────────────────────┐ ║
║  │ 🟢 Anthropic diligence              ›  │ ║
║  │ ...                                    │ ║
║  └────────────────────────────────────────┘ ║
║  ┌────────────────────────────────────────┐ ║
║  │ 🟡 GlobalFoundries vs TSMC          ›  │ ║
║  │ ...                                    │ ║
║  └────────────────────────────────────────┘ ║
║                                              ║
║  RECENT                                      ║
║  ...                                         ║
║                                              ║
║  NEEDS ATTENTION                             ║
║  ...                                         ║
╠══════════════════════════════════════════════╣
║  🏠   📊   💬*  📬   👤                    ║  ← tab bar
╚══════════════════════════════════════════════╝
```

### 4.2 Thread detail (Conversation tab)

```
╔══════════════════════════════════════════════╗
║ ◀   Anthropic diligence          ⋯   share   ║  ← app bar
╠══════════════════════════════════════════════╣
║ [Conversation] Steps  Artifacts  Files       ║  ← top tabs
║  ─────────                                    ║
║                                              ║
║  You · 2m ago                                ║
║  "Analyze Anthropic Series E and what it     ║
║   means for agentic AI pricing"              ║
║                                              ║
║  NodeBench · streaming                        ║
║  ┌────────────────────────────────────────┐ ║
║  │ Anthropic raised $8B Series E led by   │ ║  ← streaming scratchpad
║  │ Lightspeed. The round values the...    │ ║     as markdown prose
║  │ ▉ (cursor pulsing)                     │ ║
║  └────────────────────────────────────────┘ ║
║                                              ║
║  Sources so far (5):                         ║
║  [● techcrunch.com — Series E announce]     ║
║  [● theinformation.com — round details]     ║
║  [● anthropic.com — founder post]            ║
║  [+ 2 more]                                  ║
║                                              ║
║  ┌────────────────────────────────────────┐ ║
║  │  💬  Live memo → tap to open         ›│ ║  ← linked draft Report
║  └────────────────────────────────────────┘ ║
╠══════════════════════════════════════════════╣
║ [ Follow up…                            ➤ ]  ║  ← persistent composer
╚══════════════════════════════════════════════╝
```

### 4.3 Thread detail (Steps tab)

```
║ Conversation [Steps] Artifacts  Files        ║
║              ───────                          ║
║                                              ║
║  Run #4cbd … · streaming                     ║
║  Budget: 120s / $0.45 / 15 tool calls        ║
║  Used:   67s / $0.22 / 9 tool calls          ║
║  Provider: claude-sonnet-4-6 → gemini-flash  ║
║                                              ║
║  ✓  Classify intent (120ms)                  ║
║  ✓  Fan out to 6 sub-agents                  ║
║     └ entity (done)   people (done)         ║
║     └ location (skip) event (running)       ║
║     └ product (done)  job (pending)         ║
║  ✓  Web search via Linkup (12 results)      ║
║  ○  Extract + ground claims (running 4s...) ║
║  ○  Judge gate                               ║
║  ○  Structure + persist                      ║
║                                              ║
║  Approval needed (1):                        ║
║  [ ✓ Approve larger budget   ✕ Cancel ]     ║
╚══════════════════════════════════════════════╝
```

### 4.4 Home (with Pulse)

```
╔══════════════════════════════════════════════╗
║                              🔍              ║
║                                              ║
║  Good afternoon, Homen                       ║  ← --t-display
║                                              ║
║  ┌────────────────────────────────────────┐ ║
║  │ DAILY PULSE              Updated 2h    │ ║
║  │                                         │ ║
║  │ Today's signal: Anthropic $8B Series E.│ ║
║  │ ──────                                  │ ║
║  │ 1. $8B Series E — competing explanat.  │ ║
║  │ 2. Claude 4.7 Opus 1M context launch   │ ║
║  │ 3. Cursor crossed 100k paid seats      │ ║
║  │                                         │ ║
║  │ [ Open full brief → ]                  │ ║
║  └────────────────────────────────────────┘ ║
║                                              ║
║  PINNED                                      ║
║  ┌────────────────────────────────────────┐ ║
║  │ [company]  GlobalFoundries         ⭐  │ ║
║  └────────────────────────────────────────┘ ║
║                                              ║
║  SUGGESTED                                   ║
║  ・ Follow up on 3 founders dormant 2+ weeks │
║  ・ Compare Linear vs Notion pricing         │
╚══════════════════════════════════════════════╝
```

### 4.5 Reports list

```
║  Reports                                     ║
║                                              ║
║  [All] Companies People Markets Jobs Notes  ║  ← horizontal filter
║                                              ║
║  12 reports                                  ║
║                                              ║
║  ┌────────────────────────────────────────┐ ║
║  │ [company]  Anthropic                 ⭐│ ║
║  │ $8B Series E · verified (9/10 gates)   │ ║
║  │ updated 4h ago · 12 sources            │ ║
║  └────────────────────────────────────────┘ ║
║  ┌────────────────────────────────────────┐ ║
║  │ [person]   Dario Amodei              ⭐│ ║
║  │ founder profile · provisional (7/10)   │ ║
║  │ updated 1d ago · 8 sources             │ ║
║  └────────────────────────────────────────┘ ║
║  ...                                         ║
╚══════════════════════════════════════════════╝
```

### 4.6 Report detail (Brief tab)

```
║ ◀   Anthropic                      ⋯   share ║
╠══════════════════════════════════════════════╣
║ [Brief]  Notebook  Sources  History          ║
║  ─────                                       ║
║                                              ║
║  [company]                          ✓ VERIFIED║
║                                              ║
║  Anthropic                                   ║  ← --t-display
║  AI safety research company                  ║  ← --t-body-lg
║                                              ║
║  LATEST SIGNAL                               ║
║  ┌────────────────────────────────────────┐ ║
║  │ $8B Series E led by Lightspeed         │ ║
║  │ (2026-04-18, 2 corroborating sources)  │ ║
║  └────────────────────────────────────────┘ ║
║                                              ║
║  FUNDRAISE HISTORY        (expand to see all)║
║  Seed → A → B → C → D → E ($8B)             ║
║                                              ║
║  KEY PEOPLE                                  ║
║  Dario Amodei (CEO)   Daniela Amodei (Pres) ║
║                                              ║
║  [ Open live notebook → ]                   ║  ← tap opens Notebook tab
╚══════════════════════════════════════════════╝
```

### 4.7 Report detail (Notebook tab — live co-edit)

```
║ Brief [Notebook] Sources  History            ║
║       ────────                               ║
║                                              ║
║  ┌────────────────────────────────────────┐ ║
║  │ # Anthropic — diligence memo           │ ║
║  │                                         │ ║
║  │ ## Thesis                               │ ║
║  │ Anthropic is the highest-ROI safety    │ ║
║  │ bet pre-AGI because of...              │ ║
║  │ (user-editable block — cursor here)    │ ║
║  │                                         │ ║
║  │ ## Latest signal            🤖 writing  │ ║  ← block locked by agent
║  │ (grey overlay, subtle 1.4s pulse)      │ ║
║  │ $8B Series E led by Lightspeed...      │ ║
║  │                                         │ ║
║  │ ## Key risks                            │ ║
║  │ (user-editable block)                   │ ║
║  └────────────────────────────────────────┘ ║
║                                              ║
║  2 agents · 1 user editing                  ║
╚══════════════════════════════════════════════╝
```

### 4.8 Inbox

```
║  Inbox                                       ║
║                                              ║
║  [Action required]  Updates  All             ║
║   ─────────────                              ║
║                                              ║
║  NEEDS YOUR INPUT (2)                        ║
║  ┌────────────────────────────────────────┐ ║
║  │ ❗ Budget increase needed               │ ║
║  │ Anthropic diligence run · $0.45 spent  │ ║
║  │ approve additional $0.50 to finish     │ ║
║  │ [ ✓ Approve ]    [ ✕ Cancel run ]     │ ║
║  └────────────────────────────────────────┘ ║
║  ┌────────────────────────────────────────┐ ║
║  │ 🔌 LinkedIn connector expired          │ ║
║  │ Reconnect to keep signals flowing      │ ║
║  │ [ Reconnect → ]                        │ ║
║  └────────────────────────────────────────┘ ║
╚══════════════════════════════════════════════╝
```

### 4.9 Me

```
║  Me                                          ║
║                                              ║
║  ┌──────────────────┐                       ║
║  │      [ HS ]       │    Homen Shum         ║  ← avatar + name
║  └──────────────────┘    hshum2018@gmail.com ║
║                                              ║
║  📁  Files                                 › ║
║  🔌  Connectors                            › ║
║  💳  Credits & plan                        › ║
║                                              ║
║  ⚙️  Settings                              › ║
║  🔒  Privacy                               › ║
║                                              ║
║  🚪  Sign out                                ║
╚══════════════════════════════════════════════╝
```

### 4.10 Me > Files

```
║ ◀   Files                            +upload ║
╠══════════════════════════════════════════════╣
║ [All] Documents Images Videos Audio Code    ║
║                                              ║
║  ┌────────────────────────────────────────┐ ║
║  │ 📄 deck-anthropic-2025q4.pdf        ⭐ │ ║
║  │ uploaded 2d ago · 2.4MB                │ ║
║  │ used in 2 reports                      │ ║
║  └────────────────────────────────────────┘ ║
║  ┌────────────────────────────────────────┐ ║
║  │ 📊 metrics-q1.xlsx                    │ ║
║  │ generated today · 44KB                 │ ║
║  │ used in 1 report                       │ ║
║  └────────────────────────────────────────┘ ║
║  ...                                         ║
╚══════════════════════════════════════════════╝
```

---

## 5. Transitions + animations

### 5.1 Canonical transitions (with durations + easings)

| Transition | Duration | Easing | Notes |
|---|---|---|---|
| Tab switch (bottom nav) | 220ms | `--ease-in-out` | Crossfade content, tab indicator slides 120ms ahead |
| Top-tab switch (thread detail) | 220ms | `--ease-in-out` | Indicator underline slides; content swap X translate 8px + fade |
| Push screen (thread detail from list) | 360ms | `--ease-out` | Slide-in from right 100% → 0 |
| Pop screen (back) | 280ms | `--ease-out` | Slide-out to right |
| Bottom sheet present | 360ms | `--ease-spring` | Y translate 100% → 0, backdrop opacity 0 → 0.5 |
| Bottom sheet dismiss | 220ms | `--ease-out` | Mirror, faster |
| Modal (upgrade, share) | 300ms | `--ease-spring` | Scale 0.95 → 1.0 + fade |
| Toast appear | 220ms | `--ease-out` | Y translate 20px → 0 + fade, auto-dismiss 3s |
| Accordion expand (task list row) | 220ms | `--ease-in-out` | Height auto-animate + chevron rotate 180deg |
| Card press | 120ms | `--ease-out` | Scale 0.99 (full cards) / 0.97 (buttons) |
| Send message | 150ms | `--ease-spring` | Composer shrink, message slide up into list |
| Stream cursor | 1200ms | linear | Opacity 0 → 1 → 0 loop |
| Status dot pulse (streaming) | 1400ms | `--ease-in-out` | Scale 1.0 ↔ 1.3, opacity 1.0 ↔ 0.6 |
| Verdict reveal | 300ms | `--ease-spring` | Scale 0 → 1 + opacity, anchored center |
| Block lock overlay | 180ms | `--ease-out` | Opacity 0 → 0.4 over locked block |

### 5.2 Reduced motion policy

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
  /* Keep the dots for streaming indicator — but as opacity-only, no scale */
  .streaming-dot { animation: fade-pulse 1400ms infinite; transform: none; }
}
```

Specifically remove: scale transforms, spring bounces, slide animations. Keep: opacity fades (imperceptibly fast), status dot opacity pulse (because it's the only "agent is alive" signal).

### 5.3 Haptics (iOS Safari PWA)

```typescript
type HapticKind = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

const HAPTIC_MAP: Record<string, HapticKind> = {
  'tap-button':        'light',
  'tap-tab':           'light',
  'tap-card':          'light',
  'send-message':      'medium',
  'run-completed':     'success',
  'verdict-verified':  'success',
  'verdict-failed':    'error',
  'error-generic':     'error',
  'delete-confirm':    'warning',
  'long-press-menu':   'medium',
};
```

Use via the `navigator.vibrate()` fallback on Android + native `Taptic Engine` via iOS 16+ PWA support where available.

### 5.4 Streaming animation details

```
Status dot (streaming thread card):
  ● ← 8px circle, success-500 fill
  animation: scale 1.0 → 1.3 → 1.0, opacity 1.0 → 0.6 → 1.0
  duration: 1400ms
  infinite

Cursor (in streaming scratchpad):
  ▉ ← solid block character, accent-500
  animation: opacity 0 → 1 → 0
  duration: 1200ms
  infinite

Sub-step running row:
  ○  ← hollow circle, 18px
  animation: opacity 0.4 → 1.0 → 0.4
  duration: 1400ms
  infinite

Block lock overlay:
  covers ProseMirror block with rgba(217,119,87,0.08) + caption "🤖 writing"
  animation: opacity base 1.0, caption 0.7 → 1.0 → 0.7 at 1800ms
```

---

## 6. States (required for every component)

Each component must handle all of these states:

| State | Visual rule |
|---|---|
| **Default** | Base colors, no adornment |
| **Hover** (desktop-only guardrail) | bg darkens by 4% — NOT required on mobile |
| **Pressed** | Scale 0.99 (cards) or 0.97 (buttons) + light haptic |
| **Focused** | 2px accent-500 ring, offset 2px |
| **Disabled** | Opacity 0.4, no press feedback |
| **Loading** | Skeleton (not spinner) with 1.5s shimmer |
| **Empty** | Positive terminal state, never blank (§3.11) |
| **Error** | Inline --t-meta error-500 text + retry CTA |
| **Offline** | Top toast "Reconnecting…" with 20s timeout before showing offline mode |
| **Stale** | Freshness stamp + auto-suppress per surface rule |

### 6.1 Loading skeletons (no spinners)

```
Thread card skeleton:
  ┌─────────────────────────────────┐
  │  ▇  ████████████████            │   ← 16px bar
  │                                  │
  │     ████████████████████████    │   ← 12px bar
  │     ████████████               │   ← 12px bar, shorter
  │                                  │
  │     ▇▇▇▇  ▇▇▇▇  ▇▇▇▇          │   ← meta chips
  └─────────────────────────────────┘

  Shimmer: linear-gradient left-to-right, 1.5s linear infinite
  Colors: bg-elevated → border-subtle → bg-elevated
```

### 6.2 Offline / reconnection

```
┌────────────────────────────────────┐
│  ⚠  Reconnecting…                   │   ← sticky toast top
└────────────────────────────────────┘
         ↓ (if > 20s)
┌────────────────────────────────────┐
│  📴 Offline · your messages will   │
│     send when you reconnect        │
└────────────────────────────────────┘
         ↓ (connection restored)
┌────────────────────────────────────┐
│  ✓  Back online · 2 sent            │   ← 2s auto-dismiss
└────────────────────────────────────┘
```

---

## 7. Accessibility

- **Touch targets:** minimum 44×44 anywhere tappable. Reject designs that break this.
- **Contrast:** body text ≥ 7:1 against bg-primary. Metadata ≥ 4.5:1. Accent CTA ≥ 3:1 vs background.
- **Focus rings:** 2px accent-500 outline, 2px offset, never removed.
- **ARIA:** every tab role="tab", panel role="tabpanel", bottom sheet role="dialog" aria-modal.
- **Screen reader labels:** every icon-only button has `aria-label`. Example: `<button aria-label="Favorite thread">⭐</button>`.
- **Reduced motion:** §5.2 — strict compliance.
- **Dynamic type:** respect iOS/Android system font-size settings; use `rem` + media queries, not fixed `px` for body text.
- **Color independence:** every color-carrying signal (verdict, status) also carries an icon or label.

---

## 8. Dark mode baseline

NodeBench is **dark-first**. Light mode is a P2 for v1 — ship dark only, add light later.

If light mode ships later:

```css
[data-theme="light"] {
  --bg-primary:      #f7f5f1;
  --bg-elevated:     #ffffff;
  --bg-sheet:        #ffffff;
  --surface-glass:   rgba(0,0,0,0.02);
  --border-subtle:   rgba(0,0,0,0.08);
  --text-primary:    #151413;
  --text-secondary:  #5a544e;
  --text-muted:      #8a847d;
  /* accent + semantic colors stay identical */
}
```

---

## 9. Design-to-code mapping

### 9.1 Recommended stack

- **UI framework:** React 18 + Vite (existing).
- **Component primitives:** Radix UI (tabs, dialog, dropdown, accordion) — headless, a11y-complete.
- **Styling:** Tailwind CSS with tokens in `:root` (above).
- **Motion:** Framer Motion (respects `prefers-reduced-motion` automatically).
- **Icons:** `lucide-react`.
- **Typography:** Manrope (UI) + JetBrains Mono (mono) via `@fontsource` local fonts.
- **Haptics:** `ios-haptic` or custom `navigator.vibrate` wrapper with iOS 16+ Taptic fallback.
- **Gesture:** `@use-gesture/react` for swipe-to-dismiss sheets + swipe-tab.

### 9.2 Component file layout

```
src/shared/ui/
├── tokens.css                      ← design tokens (§1.2)
├── Button.tsx                      ← 3 variants
├── Card.tsx                        ← glass DNA
├── Tabs.tsx                        ← both bottom nav and top segmented
├── BottomSheet.tsx                 ← Radix Dialog + gesture
├── SourceChip.tsx                  ← the readable chip (§3.6)
├── VerdictBadge.tsx                ← 4 verdict states
├── StatusDot.tsx                   ← streaming / idle / done / failed
├── Skeleton.tsx                    ← shimmer primitive
├── TaskExecutionList.tsx           ← Manus-pattern list (§3.7)
├── PulseCard.tsx                   ← home pulse (§3.9)
├── EmptyState.tsx                  ← positive terminal
├── Toast.tsx                       ← snackbar-style
└── haptics.ts                      ← HAPTIC_MAP + API
```

### 9.3 Naming convention

- Components: `PascalCase`.
- Variants: prop `variant` with union type.
- Tokens: `kebab-case` in CSS, `camelCase` when referenced in TS.
- Animations: `motion.*` only, never raw CSS keyframes in components (use `@keyframes` in `tokens.css` if needed).

---

## 10. Design QA checklist

Ship-gate for every screen. Check all:

- [ ] All text at or above 14px body / 12px metadata.
- [ ] All touch targets ≥ 44×44.
- [ ] Contrast 7:1 body, 4.5:1 metadata, 3:1 accent.
- [ ] Focus rings visible on keyboard navigation.
- [ ] Every icon-only button has `aria-label`.
- [ ] No horizontal overflow on 360px viewport.
- [ ] Loading state uses skeleton, not spinner.
- [ ] Empty state uses positive copy + freshness stamp.
- [ ] Offline state gracefully degrades.
- [ ] `prefers-reduced-motion` respected.
- [ ] Haptic feedback wired on primary tap actions.
- [ ] Status dot / streaming cursor / block lock animations run smoothly at 60fps on 2021 mid-range Android.
- [ ] Dark mode tested on OLED (no pure black — use `#151413`).
- [ ] Safe area insets applied (notch, home indicator).
- [ ] PWA manifest icons render correctly at 180, 192, 512.

---

## 11. What this spec does NOT cover

Explicitly out of scope for v1:
- Desktop layouts beyond "scale up with centered max-width".
- Light mode polish (ship dark only, P2).
- Complex data visualizations in notebooks (P2).
- Collaborative cursor indicators (show other users editing).
- Rich animation storytelling (onboarding hero animations).
- Custom iconography (use Lucide until brand has budget for a custom set).

These can be added in v2 without invalidating v1.

---

## 12. Related docs

- `MOBILE_IA_V9.md` — navigation + information architecture (the WHAT).
- `ENGINEER_HANDOFF_V2.md` — runtime, Convex, cost math (the HOW).
- `.claude/rules/reexamine_polish.md` — skeleton + stagger fade-in rules.
- `.claude/rules/reexamine_a11y.md` — ARIA, reduced motion, color-blind baseline.
- Manus teardown — `session3_entity_page_notebook.md` lines describing the 16-screenshot analysis.
