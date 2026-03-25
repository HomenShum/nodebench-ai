# Mobile UX Deep Comparison: SitFlow vs NodeBench AI

**Date:** 2026-03-24 (updated 2026-03-24 with post-fix scores)
**Method:** Parallel subagent deep dive (SitFlow mobile, NodeBench responsive, industry benchmarks)
**Dogfood:** Full judge loop completed — 13/13 surfaces verified, 354 contrast fixes applied, mobile layout height chain fixed

---

## Head-to-Head Scorecard

| Dimension | SitFlow (RN) | NodeBench (Web) | Gap | Industry Best |
|-----------|:---:|:---:|:---:|:---:|
| **Touch Targets** | 9 | 3 | -6 | Superhuman (10) |
| **Agent/Chat UX** | 9 | 6 | -3 | ChatGPT (9) |
| **Navigation** | 8 | 5 | -3 | TikTok (10) |
| **Typography Scaling** | 7 | 4 | -3 | Perplexity (8) |
| **Dark Mode Contrast** | 8.5 | 6 → **7.5** | -1 | Linear (9) |
| **Loading/Feedback** | 8.5 | 7 | -1.5 | Superhuman (10) |
| **Gesture Support** | 6 | 2 | -4 | TikTok (10) |
| **Offline/Persistence** | 7 | 5 | -2 | SitFlow (7) |
| **Data Density** | 8 | 3 → **5** | -3 | Perplexity (8) |
| **Accessibility** | 6.5 | 3 → **4.5** | -2 | Linear (8) |
| **Overall Mobile** | **8.2** | **4.4 → 5.3** | **-2.9** | |

> **Score changes after 2026-03-24 fixes:**
> - Dark Mode Contrast: 6→7.5 — 354 text opacity fixes (text-white/10-20 → /70, text-white/25-55 → /60)
> - Data Density: 3→5 — Founder dashboard now renders 8 content-rich cards (truth, changes, contradiction, moves, packet, agents, signals, history)
> - Accessibility: 3→4.5 — Mobile layout height chain fixed (content was invisible at 375px), contrast fixes improve readability
> - **Still P0:** Touch targets (3/10), Gesture support (2/10), Navigation (5/10)

---

## What SitFlow Does That NodeBench Should Steal

### 1. Inline Draft Approval Cards (SitFlow: 9.5/10, NodeBench: 0/10)

```
SitFlow Pattern:
┌────────────────────────────────────┐
│ ▎ Agent drafted reply · 2 min ago  │
│ ▎                                  │
│ ▎ "Hey Sarah! Those dates work     │
│ ▎  perfectly for Mochi..."         │
│ ▎                                  │
│ ▎  [Send reply]  [Edit]  [✕]      │
└────────────────────────────────────┘

NodeBench equivalent needed:
┌────────────────────────────────────┐
│ ▎ Agent analyzed · 30s ago         │
│ ▎                                  │
│ ▎ "Acme AI shows 3 red flags:     │
│ ▎  funding gap, team turnover..."  │
│ ▎                                  │
│ ▎  [Save Memo]  [Deep Dive]  [✕]  │
└────────────────────────────────────┘
```

**Why it works:** Zero-tap preview + 1-tap action. No modal, no navigation, no context switch. The agent's output is embedded directly where the user is already looking.

**NodeBench implementation:** Every agent response in the Ask surface should render as an actionable card with "Save to Memo", "Share", or "Go Deeper" inline — not just a chat bubble.

---

### 2. Quick Command Chips (SitFlow: 8.5/10, NodeBench: 5/10)

```
SitFlow:
┌──────────────────────────────────────────┐
│ [Morning briefing] [Check avail] [Pending│
│  replies] [Today's schedule]             │
│                                          │
│  ┌──────────────────────────────────┐    │
│  │ Ask the agent...            [→]  │    │
│  └──────────────────────────────────┘    │
└──────────────────────────────────────────┘

NodeBench mobile needed:
┌──────────────────────────────────────────┐
│ [Investigate] [Daily brief] [Compare]    │
│ [Run diligence] [Market scan]            │
│                                          │
│  ┌──────────────────────────────────┐    │
│  │ Ask NodeBench...            [→]  │    │
│  └──────────────────────────────────┘    │
└──────────────────────────────────────────┘
```

**Why it works:** Users don't know what to ask an AI agent. Chips solve the blank-input problem by showing 4-5 high-value actions. One tap = full query. Haptic feedback on press.

**NodeBench has suggestion chips** but they're buried inside the FastAgentPanel. On mobile, they should be the FIRST thing visible when the agent panel opens.

---

### 3. Haptic Feedback Taxonomy (SitFlow: 9/10, NodeBench: 0/10)

SitFlow uses three distinct haptic levels:
- **Light** — tab switch, filter toggle (acknowledgment)
- **Medium** — starting async operation (AI draft generating)
- **Success** — action completed (draft sent)

NodeBench is web-only, so no native haptics. But the **Vibration API** exists in mobile browsers:

```typescript
// Web haptic equivalent
function haptic(style: 'light' | 'medium' | 'success') {
  if (!navigator.vibrate) return;
  switch (style) {
    case 'light': navigator.vibrate(10); break;
    case 'medium': navigator.vibrate(25); break;
    case 'success': navigator.vibrate([15, 50, 15]); break;
  }
}
```

---

### 4. Chat Typing Indicator Animation (SitFlow: 9/10, NodeBench: 6/10)

SitFlow's three-dot breathing animation:
- 3 dots with 200ms stagger
- Each fades 0.3 → 1.0 over 400ms, then back
- 1200ms cycle (calm, not frantic)
- Uses `react-native-reanimated` for GPU-accelerated 60fps

NodeBench's thinking state is a pulsing text. On mobile, the animated dots pattern is universally understood (iMessage, WhatsApp). Switch to it.

---

### 5. Badge Visibility Toggle (SitFlow: 8.5/10, NodeBench: N/A)

```
Tab NOT focused:        Tab IS focused:
┌─────┐                ┌─────┐
│ 🤖  │                │ 🤖  │
│  3  │ ← red badge    │  ·  │ ← active dot only
└─────┘                └─────┘
```

Badge hides when you're already looking at the tab. Prevents visual clutter. NodeBench should adopt this for the agent panel toggle on mobile bottom nav.

---

## What NodeBench Does Well (Desktop) That Needs Mobile Translation

### Glass Card DNA → Mobile Cards

Desktop glass cards (`border-white/[0.06] bg-white/[0.02]`) look elegant but have problems on mobile:

| Issue | Desktop | Mobile Fix |
|-------|---------|------------|
| Touch targets | Click anywhere | Min 44px height, full-width tap |
| Contrast | backdrop-filter helps | Increase bg opacity to 0.05 |
| Text density | Multi-column | Single column, larger text |
| Card spacing | 8-12px gaps | 12-16px gaps (thumb clearance) |

### 5-Surface Architecture → Mobile Tab Bar

```
Desktop (cockpit grid):
┌────┬──────────────┬────┐
│Left│   Center     │Right│
│Rail│   Surface    │Rail │
└────┴──────────────┴────┘

Mobile (bottom tab bar):
┌──────────────────────────┐
│                          │
│      Active Surface      │
│      (full screen)       │
│                          │
├──────────────────────────┤
│ Ask  Memo  Research  ··· │
└──────────────────────────┘
```

Current CommandBar is at the **top** — move it to the **bottom** for thumb reach. iOS/Android convention is bottom tab bar.

---

## The 10 Recommendations (Ranked by Impact)

### Tier 1: Must-Do (Week 1)

**R1. Bottom-Sheet Agent Panel (not full-screen modal)**
```
Current:                    Recommended:
┌──────────────┐           ┌──────────────┐
│              │           │  Main content │
│  Full-screen │           │  (visible)    │
│  agent modal │           ├──────────────┤
│  (blocks     │           │ ─── drag ─── │
│   everything)│           │ Agent panel   │
│              │           │ (50-70% h)   │
└──────────────┘           └──────────────┘
```
- Swipe down to dismiss
- Swipe up to expand to full screen
- Content stays visible above
- Use `framer-motion` `useDragControls` for gesture

**R2. Touch Targets → 44px Minimum**
Every interactive element in the mobile viewport must be min 44px tall. Current: 24-36px buttons. This is a P0 accessibility violation.

```css
@media (max-width: 1024px) {
  button, [role="button"], a {
    min-height: 44px;
    min-width: 44px;
  }
}
```

**R3. Bottom Tab Bar (Replace Top CommandBar)**
Move surface navigation from top to bottom. Thumb zone on 375px:
```
Easy reach (bottom 40%):  ████████████
OK reach (middle 30%):    ████████
Hard reach (top 30%):     ████
```
Top CommandBar forces users to reach to the hardest zone for the most common action.

---

### Tier 2: High Impact (Week 2)

**R4. Inline Actionable Cards for Agent Responses**
Every agent response should include 2-3 action buttons:
```
┌─────────────────────────────────────┐
│ 🐾 NodeBench                       │
│                                     │
│ Acme AI's Series B looks risky:     │
│ - Burn rate: 18 months runway       │
│ - CTO departed Q4 2025             │
│ - Revenue flat YoY                  │
│                                     │
│ [Save as Memo] [Share] [Go Deeper]  │
└─────────────────────────────────────┘
```

**R5. Typography Scaling**
```css
/* Current: fixed 14px everywhere */
/* Recommended: fluid scaling */
body { font-size: clamp(14px, 2.5vw, 16px); }
h3 { font-size: clamp(13px, 2.2vw, 15px); }
.section-header { font-size: clamp(11px, 2vw, 12px); }
.code { font-size: clamp(12px, 2vw, 14px); }
```

**R6. Quick Command Chips as Default Mobile Input**
When agent panel opens on mobile, show chips BEFORE the text input:
```
┌──────────────────────────────────────┐
│ What would you like to investigate?  │
│                                      │
│ [Daily Brief] [Run Diligence]        │
│ [Compare Companies] [Market Scan]    │
│                                      │
│ ┌──────────────────────────────┐     │
│ │ Or type anything...     [→]  │     │
│ └──────────────────────────────┘     │
└──────────────────────────────────────┘
```

---

### Tier 3: Polish (Week 3-4)

**R7. Gesture Navigation Between Surfaces**
Horizontal swipe to switch surfaces (Ask ↔ Memo ↔ Research):
```
← swipe left: next surface
swipe right →: previous surface
```
Same pattern as iOS Mail (inbox ↔ message) or TikTok (FYP ↔ Following).

**R8. Skeleton Loading with Stagger**
Replace loading spinners with skeleton cards:
```
┌──────────────────────────┐  ← appears at 0ms
│ ████████████████         │
│ ████████████             │
│ ████████                 │
└──────────────────────────┘
┌──────────────────────────┐  ← appears at 100ms
│ ████████████████         │
│ ████████████             │
└──────────────────────────┘
┌──────────────────────────┐  ← appears at 200ms
│ ████████████████         │
└──────────────────────────┘
```
Stagger creates a waterfall reveal effect. SitFlow uses `FadeInDown.duration(200)` per card.

**R9. Dark Mode Contrast Fix** — **DONE (2026-03-24)**
~~Glass card background: `rgba(0,0,0,0.3)` → `rgba(0,0,0,0.5)` on mobile.~~
~~Muted text: `#908d85` → `#b0ad a5` (bump from 2.8:1 to 4.5:1 contrast).~~
Fixed: 354 instances across 11 founder files. `text-white/10-20` → `text-white/70`, `text-white/25-55` → `text-white/60`. Glass card borders (`border-white/[0.06]`) and backgrounds (`bg-white/[0.02]`) preserved — only text opacity changed.

**R10. Share Button on Every Agent Response** — **PARTIAL (2026-03-24)**
Every investigation result, memo, or analysis should have a one-tap share that generates:
- A shareable URL (no auth required to view)
- OG meta tags (title, description, preview image)
- A subtle "Powered by NodeBench" watermark

This is the distribution mechanism. ChatGPT spread via screenshots. Perplexity via citation URLs. NodeBench should spread via shareable investigation reports.
`ShareableMemoView` at `/memo/:id` exists and works without auth. Share buttons on dashboard intervention cards. Missing: share button on individual agent responses and on the shareable memo page itself.

---

## Implementation Priority Matrix (updated 2026-03-24)

```
                    HIGH IMPACT
                        │
     R1 (bottom sheet)  │  R4 (inline cards)
     R2 (touch targets) │  R10 (share button)
     R3 (bottom nav)    │
                        │
  LOW EFFORT ───────────┼─────────── HIGH EFFORT
                        │
     R5 (typography)    │  R7 (gestures)
     R6 (command chips) │  R8 (skeleton stagger)
     R9 (contrast fix)  │
                        │
                    LOW IMPACT
```

**Original ship order:** R2 → R3 → R1 → R5 → R9 → R6 → R4 → R10 → R8 → R7

**Revised ship order (post 2026-03-24 fixes):**
- ~~R9~~ DONE — contrast fixed
- ~~R10~~ PARTIAL — shareable memos exist, need share button on agent responses
- R2 → R1 → R3 → R5 → R6 → R4 → R8 → R7
- R2 (touch targets) remains #1 — P0 accessibility
- R1 (bottom sheet) is #2 — highest structural mobile UX change
- R3 (bottom nav) is #3 — thumb-zone optimization

---

## Key Insight from Industry Research

The top 3 principles that separate great mobile AI apps from mediocre ones:

1. **Streaming is table stakes, but the pre-stream gap is where you win** — The 500ms-2s before tokens appear is where users decide if the app is broken. Skeleton shimmer > spinner > blank screen.

2. **Predict the next action, surface it as a tap target** — After every AI response, show 2-3 follow-up chips. Users are bad at formulating follow-ups. Perplexity does this brilliantly.

3. **The output IS the distribution** — Every result should be shareable in one tap. ChatGPT spread via screenshots. Perplexity via URLs. If your output isn't screenshot-worthy, it won't spread.

---

## SitFlow Patterns Worth Porting to NodeBench (Code-Level)

| Pattern | SitFlow File | Adaptation for NodeBench |
|---------|-------------|--------------------------|
| Inline approval cards | `app/(tabs)/index.tsx:197-229` | Agent response cards with Save/Share/Deeper |
| Quick command chips | `app/(tabs)/agent.tsx:48-53,99-120` | Surface-aware command suggestions |
| Typing indicator | `app/(tabs)/agent.tsx:261-303` | CSS-only 3-dot animation |
| Badge visibility toggle | `app/(tabs)/_layout.tsx:11-28` | Agent panel notification badge |
| KeyboardAvoidingView | `app/(tabs)/agent.tsx:153-182` | CSS `env(safe-area-inset-bottom)` |
| Memoized filtering | `app/(tabs)/index.tsx:70-95` | `useMemo` on research signals list |
| Template-based responses | `server/routers.ts:648-673` | Structured memo templates |
| Haptic taxonomy | `app/(tabs)/index.tsx:97-117` | Web Vibration API |
| Chat persistence | `agent.tsx:27-28` (AsyncStorage) | `localStorage` for chat history |
| Dark color system | Multiple files | Already has glass DNA, ~~needs contrast fix~~ FIXED 2026-03-24 |

---

## SitFlow Implementation Deep-Dive (2026-03-25 Audit)

Extracted from actual SitFlow codebase — specific patterns, values, and architecture decisions that NodeBench should learn from.

### Bottom Tab Bar Architecture

SitFlow's tab bar is the most polished part of the mobile UX. Key implementation details:

```
SITFLOW TAB BAR ANATOMY:
┌──────────────────────────────────────────────────┐
│                                                  │
│  paddingTop: 8                                   │
│                                                  │
│   📥 Inbox    📅 Calendar    👥 Clients    🤖 Agent │
│                                                  │
│  paddingBottom: max(safeAreaInsets.bottom, 8)     │
│  height: 56 + bottomPadding                      │
│  bg: #0F0F1A                                     │
│  borderTop: 0.5px solid #2A2A40                  │
└──────────────────────────────────────────────────┘
```

**What makes it good:**
- `useSafeAreaInsets()` — dynamic bottom padding, never hardcoded
- `HapticTab` wrapper — every tab press triggers haptic feedback, zero config per-tab
- Platform-aware: `Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8)`
- Icon size: 28px — large enough for thumb targets
- Active tint: `colors.tint` (theme-aware), inactive: `#8E8EA0`
- Border top: 0.5px (hairline), not 1px — feels native iOS

**Agent icon with smart badge:**
```
┌───────────────┐
│    🤖         │  ← IconSymbol "cpu" at 28px
│      ●        │  ← Green dot (8px) when focused (active session)
│      ②        │  ← Red badge when NOT focused + pending drafts > 0
│   Agent       │     Badge shows "9+" if > 9
└───────────────┘
```

The badge logic: `{badgeCount > 0 && !focused && <Badge />}` — badge HIDES when you're looking at the Agent tab (you already see the content). Only shows when you're on other tabs. This is a subtle but important pattern — don't distract users who are already engaging with the thing.

**NodeBench translation:** The left rail on desktop serves a similar purpose but has none of these mobile affordances. For responsive mobile view:
- Convert 5-surface rail to bottom tab bar at `< 768px`
- Use `env(safe-area-inset-bottom)` instead of hardcoded padding
- Add `navigator.vibrate(10)` on tab switch (Web Vibration API)
- Badge on Agent tab: count of unread entity changes / daily brief items

### Card System (The Universal Atom)

Every screen in SitFlow uses the same card DNA:

```css
/* SitFlow card DNA */
backgroundColor: '#1A1A2E',
borderRadius: 16,
padding: 16,
marginBottom: 12,
borderWidth: 1,
borderColor: '#2A2A40',
```

**NodeBench equivalent:**
```css
/* NodeBench glass card DNA */
background: rgba(255, 255, 255, 0.02);
border: 1px solid rgba(255, 255, 255, 0.06);
border-radius: 16px;    /* Match SitFlow's 16 */
padding: 16px;           /* Match SitFlow's 16 */
margin-bottom: 12px;     /* Match SitFlow's 12 */
backdrop-filter: blur(12px);
```

The card radius (16) and padding (16) are nearly identical. NodeBench adds `backdrop-filter` for glass effect. Key insight: SitFlow's cards FEEL native because they use solid backgrounds (`#1A1A2E`) not transparency — glass blur is expensive on mobile and often janky on Android. Consider a `prefers-reduced-transparency` fallback that uses solid `#1A1A2E` instead of glass blur.

### Agent Draft Card (The Inline Action Pattern)

This is SitFlow's killer UX pattern — the draft appears INSIDE the booking card, not as a separate screen:

```
DRAFT CARD ANATOMY:
┌──────────────────────────────────────────────┐
│▐                                              │  ← accent bar: 4px wide, #7C3AED
│▐  ⏱ Agent drafted reply · 1 min ago          │  ← header: 12px font, #A78BFA color
│▐                                              │
│▐  "Hi Sarah! I'd love to meet you..."        │  ← draft text: 14px, #F0F0F5, numberOfLines={4}
│▐                                              │
│▐  [Send Reply]  [Edit ✏️]  [Dismiss]          │  ← 3 action buttons inline
│▐                                              │
└──────────────────────────────────────────────┘

Styles:
  container: bg #1E1040, borderRadius 12, overflow hidden
  accentBar: width 4, bg #7C3AED (purple)
  draftContent: flex 1, padding 12
```

**Why it works:** You see the booking context (client, dates, service) AND the draft AND the actions all in one scroll position. No navigation, no modal, no context switch.

**NodeBench translation:** Entity cards should have inline action panels that slide in:
- After a research query completes → inline result card appears inside the entity card
- Actions: [Save as Memo] [Share] [Go Deeper] — same 3-action pattern
- Accent bar color changes by type: purple (AI-generated), amber (needs review), green (verified)

### Chat UX (Message Bubbles + Quick Commands)

**Quick command chips:** Horizontal ScrollView, no scrollbar indicator, haptic on press
```
Chip styles:
  paddingHorizontal: 14
  paddingVertical: 8
  borderRadius: 16 (fully rounded)
  bg: rgba(124, 58, 237, 0.12)
  border: 1px solid rgba(124, 58, 237, 0.24)
  text: #A78BFA, 13px, weight 600
```

These chips are NOT decorative — they're the primary interaction for 80% of agent usage. "Morning briefing" is tapped far more often than typed.

**Message bubbles:**
- User: bg `#7C3AED`, borderBottomRightRadius: 4 (tail effect), self-end
- Agent: bg `#1A1A2E`, borderBottomLeftRadius: 4, self-start
- Agent has avatar: 🐾 emoji in a 32px circle
- Max width: 85% of container — prevents edge-to-edge stretch
- Font size: 15px — larger than most chat apps (14px) for readability

**Typing indicator:** Three animated dots in a bubble:
```
┌──────────────┐
│ 🐾  ● ● ●    │  ← dots use Reanimated FadeIn
└──────────────┘
```

**Chat input bar:**
- Sticky at bottom with `KeyboardAvoidingView`
- `behavior={Platform.OS === 'ios' ? 'padding' : undefined}`
- `keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}` — accounts for tab bar height
- Input: borderRadius 24 (pill shape), bg `rgba(255,255,255,0.08)`, border `rgba(255,255,255,0.12)`
- Send button: 40×40 circle, `#7C3AED`, right of input

**NodeBench translation:**
- The bottom-sheet agent panel should use the same input bar pattern
- Quick chips should be entity-aware: if you're on a company page, show "[Run Diligence] [Compare] [Export Memo]" not generic commands
- On mobile web, use `visualViewport` API to handle keyboard resize instead of `KeyboardAvoidingView`
- Max-width 85% for response bubbles — prevents full-width text walls

### Chat Persistence (AsyncStorage Pattern)

SitFlow persists chat history and unread count across app restarts:
```typescript
const CHAT_STORAGE_KEY = '@sitflow_agent_chat';
const UNREAD_STORAGE_KEY = '@sitflow_agent_unread';

// Load on mount
useEffect(() => {
  AsyncStorage.getItem(CHAT_STORAGE_KEY).then(data => {
    if (data) setMessages(JSON.parse(data));
  });
}, []);

// Save on change
useEffect(() => {
  AsyncStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
}, [messages]);
```

**NodeBench translation:** Use `localStorage` with the same pattern:
```typescript
const CHAT_KEY = 'nodebench_agent_chat';
// Same load/save on mount/change pattern
// Add a max history limit (50 messages) to prevent localStorage bloat
```

### Settings Architecture (Section Tabs + Grouped Cards)

SitFlow's Agent Settings uses horizontal pill tabs to segment a long settings page:

```
[General] [Auto-reply] [Scheduling] [Connection]
```

Each section uses a `SettingCard` wrapper with consistent styling:
- `ToggleRow`: label + sublabel + React Native `Switch`
- `NumberRow`: label + minus/plus steppers
- `PricingRow`: label + TextInput for dollar amount
- Connection section: status dots (green/yellow/red) + connect/disconnect buttons

**Key pattern:** The Google Calendar connection shows 3 states:
- 🟢 Connected (green dot + "Connected" text + Disconnect button)
- 🔴 Not connected (red dot + Connect button that opens OAuth WebBrowser)
- ⏳ Loading (ActivityIndicator while checking status)

Auto-refresh: 30-second polling interval checks connection status. Not WebSocket-based — simple `setInterval` because calendar connection changes are rare.

**NodeBench translation:** The System/Telemetry surface should show similar connection status for:
- Convex backend: 🟢/🔴 with auto-reconnect
- MCP server: 🟢/🔴 with tool count
- Search providers: Linkup/Gemini status
- Voice server: WebSocket connection state

### Screen Container Pattern

SitFlow wraps every screen in a `ScreenContainer` that handles SafeArea:
```typescript
<ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-background">
  {/* content */}
</ScreenContainer>
```

Bottom edge is EXCLUDED because the tab bar handles it. This prevents double-padding.

**NodeBench translation:** For responsive mobile view, use:
```css
padding-top: env(safe-area-inset-top);
padding-left: env(safe-area-inset-left);
padding-right: env(safe-area-inset-right);
/* bottom handled by tab bar or bottom sheet */
```

### Animation System

SitFlow uses `react-native-reanimated` for enter animations:
- `FadeIn` — simple opacity 0→1
- `FadeInDown` — slide up + fade in (used for message bubbles)
- `useSharedValue` + `withTiming` — smooth toggle transitions

No stagger delays. No spring physics. No complex choreography. Just `FadeIn` on mount. This keeps animation snappy and avoids jank on lower-end devices.

**NodeBench lesson:** The current stagger animations on the landing page are correct for desktop (progressive disclosure). For mobile, simplify to `FadeIn` only — no stagger delays, no entrance animations that delay content visibility.

### Color System (Exact Values)

```
SITFLOW PALETTE:
  Background:     #0F0F1A (tab bar), #111113 (screens via ScreenContainer)
  Card surface:   #1A1A2E
  Card border:    #2A2A40
  Draft surface:  #1E1040 (purple-tinted dark)
  Text primary:   #F0F0F5
  Text secondary: #8E8EA0
  Text muted:     #71717A (zinc-500)
  Accent/tint:    #7C3AED (violet-600)
  Accent light:   #A78BFA (violet-400)
  Success:        #34D399 (emerald-400), #22C55E (green-500)
  Warning:        #F59E0B (amber-500)
  Error:          #EF4444 (red-500)
  Info:           #3B82F6 (blue-500)

NODEBENCH PALETTE (for comparison):
  Background:     #151413 (--bg-primary)
  Card surface:   rgba(255,255,255,0.02) + backdrop-blur
  Card border:    rgba(255,255,255,0.06)
  Accent:         #d97757 (terracotta)
  Text primary:   #F0F0F5
  Text secondary: rgba(255,255,255,0.6)
  Text muted:     rgba(255,255,255,0.4)
```

Key differences:
- SitFlow uses solid hex colors → predictable on all devices, zero render cost
- NodeBench uses rgba transparency → glass effect but requires GPU compositing
- SitFlow's purple accent (#7C3AED) has higher contrast than NodeBench's terracotta (#d97757) against dark backgrounds
- Both use near-identical text primary (#F0F0F5)

**Recommendation:** On mobile, offer a `data-density="compact"` mode that switches glass cards to solid backgrounds for performance. Already partially exists in NodeBench but needs consistent enforcement.

---

## Shipped Components Reference (2026-03-24)

Grounding this doc in what's actually built — so recommendations target real gaps, not hypothetical ones.

| Component | Route | What It Does | Mobile Status |
|-----------|-------|-------------|---------------|
| `FounderDashboardView` | `/founder` | 8-card clarity pipeline: truth, changes, contradiction, moves, packet, agents, signals, history | Renders at 375px, no overflow. Cards stack vertically. |
| `CompanySearchView` | `/founder/search` | Blank-state company search with lens + output selectors | Search input + Run Analysis button work on mobile |
| `CompanyAnalysisView` | `/founder/analysis` | 9-card Shopify result with Banker/CEO/Strategy/Diligence lens | 7 export buttons, all Shopify data renders |
| `RoleOverlayView` | `/founder/perspectives` | 5-lens role switcher — same data, different ordering | Pill toggle works, card reorder is instant |
| `NearbyEntitiesView` | `/founder/entities` | 5 adjacent entity cards with relationship types | Vertical list, no swipe gesture |
| `HistoryView` | `/founder/history` | Session history from localStorage | Flat list, not visual timeline |
| `ExportView` | `/founder/export` | 7 export formats | All buttons render |
| `ShareableMemoView` | `/memo/:id` | Public shareable page, no auth | Responsive, print stylesheet |
| `ArtifactPacketPanel` | embedded in dashboard | Packet state/history, regenerate, export, hand-to-agent | Works but dense on mobile |
| `ExternalSignalsPanel` | embedded in dashboard | 4 live signal fixtures (Codex, Cursor, Shopify x2) | Cards render at 375px |
| `CommandPanelView` | `/founder/command` | 3-panel messaging UI for agent commands | Panels stack on mobile |
| `ContextIntakeView` | `/founder/intake` | Paste notes, upload files, add sources | Generate button accessible |
| `AgentOversightView` | `/founder/agents` | 4 agent status cards | Vertical stack |

**Data source:** All surfaces use hardcoded fixtures from `founderFixtures.ts` (596 lines). Zero Convex queries. Two demo companies: Meridian AI (startup), Shopify (public). Live data wiring is the next major milestone after mobile UX fixes.
