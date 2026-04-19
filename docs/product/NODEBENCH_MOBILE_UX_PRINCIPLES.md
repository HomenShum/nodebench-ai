# NodeBench Mobile UX Principles — Context Graph Native

**Date:** 2026-03-24 (updated 2026-03-24 with current build state)
**Source:** SitFlow deep dive + NodeBench audit + industry research + context graph architecture
**Goal:** Translate mobile UX learnings into NodeBench's own DNA — not copy SitFlow, but express the context graph natively on mobile.

### Current Build State (as of 2026-03-24 dogfood)

13 founder surfaces shipped and verified. All render at 375px without horizontal overflow. Zero console errors. Key shipped components mapped to principles below.

| Principle | Status | Shipped Component | Route |
|-----------|--------|-------------------|-------|
| P1: Entity Cards | PARTIAL | `NearbyEntitiesView` (5 entities), `CompanyAnalysisView` (Shopify) | `/founder/entities`, `/founder/analysis` |
| P2: Claims/Changes | NOT STARTED | Changes render as text list in `FounderDashboardView`, not structured cards | `/founder` |
| P3: Role Ordering | DONE | `RoleOverlayView` — 5 lenses (Banker/CEO/Strategy/Diligence/Founder) | `/founder/perspectives` |
| P4: Bottom Sheet | NOT STARTED | Agent panel is full-screen overlay, not bottom sheet | N/A |
| P5: Packet History | PARTIAL | `HistoryView` + `ArtifactPacketPanel` with packet state/history hooks | `/founder/history` |
| P6: Contradictions | DONE (desktop) | "BIGGEST CONTRADICTION" card prominent on dashboard | `/founder` |
| P7: One-Tap Artifact | DONE | 7 export actions: Memo/Copy/Markdown/HTML/View as Memo/Download/Copy Markdown | `/founder/export`, `/founder/analysis` |
| P8: Swipeable Entities | NOT STARTED | Zero gesture/swipe support | N/A |
| P9: Daily Brief | PARTIAL | Founder Dashboard IS the landing with truth/change/contradiction/next moves | `/founder` |
| P10: Share = Distribution | DONE | `ShareableMemoView` at `/memo/:id` — public, no auth required | `/memo/:id` |

---

## The Core Insight

SitFlow's mobile excellence comes from one principle: **every screen is a decision surface with inline actions**. The pet sitter sees a booking, sees the AI draft, taps Send — done. No navigation, no context switch, no rebuild.

NodeBench's mobile should follow the same principle, but at a higher layer: **every screen is a packet surface with inline judgment**. The user sees an entity, sees the claims and changes, taps to produce an artifact — done.

The difference:

```
SitFlow:  booking → draft → approve → send
NodeBench: entity → claims + changes → judgment → artifact
```

Both are **decision pipelines rendered as cards**. The mobile UX is the same pattern applied to different graph layers.

---

## The 4-Layer Mobile Architecture

NodeBench's context graph has 4 layers. Each one maps to a mobile surface:

```
┌──────────────────────────────────────────────────┐
│  LAYER 4: ARTIFACT GRAPH                         │
│  memo, deck, HTML brief, delegation packet       │
│  ─────────────────────────────────────────────── │
│  LAYER 3: PACKET GRAPH                           │
│  packet truth, versions, lineage, freshness      │
│  ─────────────────────────────────────────────── │
│  LAYER 2: CONTEXT GRAPH                          │
│  entities, claims, changes, contradictions,      │
│  workflows, adjacency, role priorities           │
│  ─────────────────────────────────────────────── │
│  LAYER 1: INTAKE                                 │
│  search, upload, ask, ingest                     │
└──────────────────────────────────────────────────┘
```

On mobile, these layers become **swipeable depth**:

```
Surface view (Layer 1):     Entity card with headline claims
Tap to expand (Layer 2):    Full context graph — changes, contradictions, adjacency
Tap "Build Packet" (L3):    Packet studio — role-adaptive ordering
Tap "Export" (Layer 4):     Artifact generation — memo, deck, brief
```

---

## 10 Principles (NodeBench DNA, Not SitFlow Copy)

### Principle 1: Entity Cards Are the Atomic Unit

Not chat bubbles. Not search results. Not links. **Entity cards.**

```
┌──────────────────────────────────────────┐
│  Acme AI                        [◉ live] │
│  Series B · $42M raised · AI/ML          │
│                                          │
│  ▲ 3 claims changed since last packet    │
│  ⚡ 1 contradiction detected              │
│  ↗ 2 adjacent entities worth tracking    │
│                                          │
│  [Open Workspace]  [Quick Packet]  [···] │
└──────────────────────────────────────────┘
```

**Why entity cards, not chat:** NodeBench thinks in entities (company, product, founder, market, workflow). The mobile primary view should show the entities the user cares about, not a chat history. The chat is a tool for querying entities — it's Layer 1 intake, not the primary surface.

**SitFlow learning applied:** SitFlow's booking cards have inline status + inline actions. NodeBench entity cards have inline claims + inline judgment actions. Same pattern, higher abstraction.

**Touch target:** Full card is tappable (min 88px height). Action buttons are 44px minimum.

> **CURRENT STATE (2026-03-24):** PARTIAL. `NearbyEntitiesView` at `/founder/entities` renders 5 entity cards (Pricing Engine MVP, Market Feed, TradeFlow, CarbonPulse, EU CBAM Draft) with inline status and actions. `CompanyAnalysisView` at `/founder/analysis` renders the Shopify entity card with 9 data sections. Both use the glass card DNA (`border-white/[0.06] bg-white/[0.02]`).
> **GAP:** Entity cards don't show inline claim counts, contradiction indicators, or "Quick Packet" action. Touch targets are 24-36px, not 44px minimum. No entity card grid as a primary mobile surface — entities are nested inside the dashboard, not top-level.
> **FILES:** `src/features/founder/views/NearbyEntitiesView.tsx`, `src/features/founder/views/CompanyAnalysisView.tsx`

---

### Principle 2: Claims and Changes Are First-Class Visual Objects

Not buried in prose. Not hidden in a report. **Rendered as scannable cards within entity context.**

```
┌──────────────────────────────────────────┐
│  CLAIMS · Acme AI                        │
│                                          │
│  ┌─ NEW ────────────────────────────┐    │
│  │ "Enterprise motion launched"     │    │
│  │ 📄 pricing page + 📰 TechCrunch  │    │
│  │ Confidence: ████████░░ 82%       │    │
│  └──────────────────────────────────┘    │
│                                          │
│  ┌─ CHANGED ────────────────────────┐    │
│  │ "Pricing shifted to usage-based" │    │
│  │ Was: $99/seat → Now: $0.01/call  │    │
│  │ 📄 pricing page (diff available) │    │
│  └──────────────────────────────────┘    │
│                                          │
│  ┌─ CONTRADICTION ──────────────────┐    │
│  │ Website says "SOC2 certified"    │    │
│  │ Trust page shows no badge        │    │
│  │ ⚠ Unresolved · Flagged for review│    │
│  └──────────────────────────────────┘    │
└──────────────────────────────────────────┘
```

**Why this matters on mobile:** On a 375px screen, you can show exactly 3 claim cards at once. That's the right information density — enough to form judgment, not enough to overwhelm. Scroll for more.

**SitFlow learning:** SitFlow's draft cards have a purple accent bar + timestamp + truncated preview. Claims should have a type badge (NEW / CHANGED / CONTRADICTION) + evidence count + confidence bar.

> **CURRENT STATE (2026-03-24):** NOT STARTED. `WhatChangedPanel` in `FounderDashboardView` renders changes as a text list with timestamps, not as structured visual cards with type badges. The "BIGGEST CONTRADICTION" card exists but contradictions aren't rendered as the scannable card format shown above.
> **GAP:** Need claim/change card component with: type badge (NEW/CHANGED/CONTRADICTION), evidence source icons, confidence bar, inline actions. This is the highest-impact mobile UX gap — claims are the core data object and they're invisible as prose.
> **FILES:** `src/features/founder/views/FounderDashboardView.tsx` (WhatChangedPanel section), `src/features/founder/views/founderFixtures.ts` (DEMO_CHANGES)

---

### Principle 3: Role Determines Card Ordering, Not Recency

The same entity has different importance depending on who's looking:

```
FOUNDER viewing Acme AI:          BANKER viewing Acme AI:
1. Competitive positioning         1. Revenue trajectory
2. Product changes                 2. Burn rate / runway
3. Hiring signals                  3. Cap table / investors
4. Integration opportunities       4. Comparable transactions

RESEARCHER viewing Acme AI:       OPERATOR viewing Acme AI:
1. Methodology / approach          1. API / integration surface
2. Published papers                2. Workflow compatibility
3. Team credentials                3. SLA / uptime history
4. Funding sources                 4. Support responsiveness
```

**Mobile implementation:** Role selector is a **pill toggle at the top of entity workspace**, not a settings page:

```
┌──────────────────────────────────────────┐
│  [Founder] [Banker] [PM] [Researcher]    │
│  ─────────────────────────────────────── │
│  Claims re-ordered for: Founder          │
│  ...                                     │
└──────────────────────────────────────────┘
```

One tap changes the entire card ordering. Same data, different judgment lens.

> **CURRENT STATE (2026-03-24):** DONE. `RoleOverlayView` at `/founder/perspectives` implements 5 role lenses (Banker, CEO, Strategy, Diligence, Founder). Each lens reorders and reshapes the same Meridian AI data — banker sees revenue/burn/cap table first, founder sees competitive positioning first. Pill toggle at the top switches lenses. On `CompanyAnalysisView`, the lens parameter from `/founder/search` carries through to `/founder/analysis?lens=banker`.
> **GAP:** Mobile pill toggle could be larger (currently ~32px height). Card reordering animation is instant, not animated — a subtle slide transition would reinforce that the data is the same, just reshuffled.
> **FILES:** `src/features/founder/views/RoleOverlayView.tsx`, `src/features/founder/views/CompanySearchView.tsx` (lens selector), `src/features/founder/views/CompanyAnalysisView.tsx` (lens-aware rendering)

---

### Principle 4: The Bottom Sheet Is the Judgment Panel

Not a full-screen modal. Not a separate page. A **bottom sheet that slides up over the entity workspace.**

```
┌──────────────────────────────────────────┐
│                                          │
│  Entity workspace                        │
│  (still visible, dimmed)                 │
│                                          │
├────────── ═══ drag handle ═══ ───────────┤
│                                          │
│  🐾 NodeBench                            │
│                                          │
│  Based on 12 sources and 3 changes:      │
│  Acme AI is expanding enterprise but     │
│  burn rate suggests 14-month runway...   │
│                                          │
│  [Save as Memo]  [Share]  [Go Deeper]    │
│                                          │
│  ┌──────────────────────────────────┐    │
│  │ Ask about this entity...    [→]  │    │
│  └──────────────────────────────────┘    │
└──────────────────────────────────────────┘
```

**Three states:**
- **Collapsed (peek):** Shows last response summary + input bar. 25% viewport.
- **Half-expanded:** Shows full response + actions. 60% viewport. Entity workspace scrollable above.
- **Full-screen:** Deep conversation mode. Swipe down to return to half.

**SitFlow learning:** SitFlow uses `KeyboardAvoidingView` with platform-specific offsets. NodeBench bottom sheet should use `env(safe-area-inset-bottom)` and detect keyboard height for input bar positioning.

> **CURRENT STATE (2026-03-24):** NOT STARTED. The agent panel (`FastAgentPanel`) opens as a full-screen overlay that blocks all content underneath. On mobile, this is especially bad — the user loses all context when the agent panel opens. No drag handle, no peek state, no half-expanded mode.
> **GAP:** This is the #1 mobile UX structural change needed. The agent panel needs to become a bottom sheet with three states (collapsed 25%, half 60%, full 100%) and a drag handle. `framer-motion` `useDragControls` or CSS `snap-type` could implement this without a native dependency.
> **FILES:** `src/features/agents/components/FastAgentPanel/FastAgentPanel.tsx`, `src/layouts/CockpitLayout.tsx` (panel mounting)

---

### Principle 5: Packet History Is Visible Timeline, Not Hidden Log

```
┌──────────────────────────────────────────┐
│  PACKET HISTORY · Acme AI                │
│                                          │
│  ── Today ──────────────────────────     │
│  v7 · Founder lens · 3 new claims       │
│  "Enterprise motion + pricing shift"     │
│  [View] [Diff vs v6] [Export]            │
│                                          │
│  ── Mar 18 ─────────────────────────     │
│  v6 · Banker lens · 1 contradiction     │
│  "SOC2 claim unverified"                 │
│  [View] [Diff vs v5]                     │
│                                          │
│  ── Mar 10 ─────────────────────────     │
│  v5 · Initial research packet           │
│  [View]                                  │
└──────────────────────────────────────────┘
```

**Why on mobile:** This is the "return hook" — the reason to open NodeBench again tomorrow. The packet timeline shows what changed since last visit, which claims are stale, which contradictions are unresolved.

**SitFlow learning:** SitFlow's inbox sorts by `createdAt` descending with filter tabs (All / Needs Reply / New Client / Confirmed). Packet history should sort by `updatedAt` with filter tabs (All / Changed / Contradictions / Stale).

> **CURRENT STATE (2026-03-24):** PARTIAL. `HistoryView` at `/founder/history` exists and renders session history from localStorage. `ArtifactPacketPanel` (mounted in `FounderDashboardView`) has packet state and history hooks — it tracks packet versions and can diff between them. But the UI is a flat list, not the visual timeline with version labels and diff buttons shown above.
> **GAP:** Need timeline visualization with date groupings (Today / Mar 18 / Mar 10), version labels (v7, v6, v5), lens badges, and inline [View] [Diff vs vN] actions. The data layer exists (packet history hooks); the visual layer doesn't express it as a timeline yet. Filter tabs (All / Changed / Contradictions / Stale) not implemented.
> **FILES:** `src/features/founder/views/HistoryView.tsx`, `src/features/founder/components/ArtifactPacketPanel.tsx` (packet history state)

---

### Principle 6: Contradiction Cards Are Attention Magnets

Contradictions are where the most insight lives. They should be visually prominent — not warnings to dismiss, but **investigation triggers**.

```
┌──────────────────────────────────────────┐
│  ⚡ CONTRADICTION                         │
│                                          │
│  Website says:                           │
│  "SOC2 Type II certified"               │
│  📄 acme.ai/security                     │
│                                          │
│  Trust page shows:                       │
│  No SOC2 badge, only ISO 27001          │
│  📄 acme.ai/trust                        │
│                                          │
│  Status: Unresolved                      │
│  First detected: Mar 18                  │
│                                          │
│  [Investigate]  [Flag for Review]  [···] │
└──────────────────────────────────────────┘
```

**Visual treatment:** Yellow/amber accent bar (like SitFlow's tentative booking color `#F59E0B`). Contradictions should feel like "needs attention" not "error."

> **CURRENT STATE (2026-03-24):** DONE on desktop. `FounderDashboardView` renders a prominent "BIGGEST CONTRADICTION" card with: title, affected initiative count ("3 initiatives affected"), description text, and actionable context. The card uses `text-white/70` after contrast fix (was `text-white/20`). On `CompanyAnalysisView`, Shopify's 3 regulatory risks render as a dedicated section.
> **GAP:** Contradiction card doesn't use the amber/terracotta accent bar treatment described above. It's styled the same as other dashboard cards. On mobile, it should visually "pop" with a `#F59E0B` or terracotta `#d97757` left border + slightly elevated background. Also missing: [Investigate] and [Flag for Review] inline actions — currently the card is read-only.
> **FILES:** `src/features/founder/views/FounderDashboardView.tsx` (contradiction section ~line 200+), `src/features/founder/views/founderFixtures.ts` (DEMO_COMPANY contradiction data)

---

### Principle 7: Artifact Generation Is One Tap from Any Entity

The packet graph exists so you never rebuild context for artifacts. On mobile, this means:

```
Long-press any entity card → action sheet:

┌──────────────────────────────────────────┐
│  Generate from Acme AI packet            │
│                                          │
│  📝 Decision Memo                        │
│  📊 Comparison Sheet                     │
│  📋 Delegation Packet                    │
│  🌐 HTML Brief (shareable)              │
│  📑 Slide Deck                           │
│                                          │
│  [Cancel]                                │
└──────────────────────────────────────────┘
```

**SitFlow learning:** SitFlow's template-based drafts generate in 6-10 seconds. NodeBench artifact generation should show a skeleton of the target format while generating (memo skeleton, deck skeleton), then reveal the real content — same pre-stream shimmer principle.

> **CURRENT STATE (2026-03-24):** DONE for export surfaces. `ExportView` at `/founder/export` offers 7 export formats. `CompanyAnalysisView` renders 7 inline export buttons (Memo, Copy, Export Markdown, Export HTML, View as Memo, Download .html, Copy Markdown). `ArtifactPacketPanel` in the dashboard has regenerate, copy, export markdown, export HTML, and hand-to-agent actions. `ShareableMemoView` at `/memo/:id` generates a public shareable URL.
> **GAP:** Missing the "one tap from any entity card" pattern. Currently, exports are on dedicated surfaces or inside the artifact panel — not on entity cards themselves. Long-press action sheet on entity cards (as described above) would make artifact generation accessible from anywhere without navigating to the export surface. Also missing: skeleton loading during generation.
> **FILES:** `src/features/founder/views/ExportView.tsx`, `src/features/founder/components/ArtifactPacketPanel.tsx`, `src/features/founder/views/CompanyAnalysisView.tsx` (export buttons), `src/features/founder/views/ShareableMemoView.tsx`

---

### Principle 8: Adjacent Entities Are Swipeable Discovery

```
Entity workspace for Acme AI:

                    ← swipe left
┌────────┐  ┌────────┐  ┌────────┐
│ Rival  │  │ ACME   │  │ Key    │
│ Corp   │  │  AI    │  │ Vendor │
│        │  │(active)│  │        │
└────────┘  └────────┘  └────────┘
                    swipe right →

Edge label shown above:
"COMPETES_WITH"  ←  active  →  "DEPENDS_ON"
```

**Why swipe:** On mobile, adjacency is best expressed as horizontal navigation. The user is already in Acme AI's workspace. Swiping left/right reveals entities connected by graph edges (COMPETES_WITH, DEPENDS_ON, INVESTED_IN, ADJACENT_TO). The edge label shows the relationship.

**SitFlow learning:** SitFlow doesn't have this (pet sitting is single-entity). But TikTok's horizontal swipe between For You and Following uses the same gesture. NodeBench uses it for graph traversal.

> **CURRENT STATE (2026-03-24):** NOT STARTED. `NearbyEntitiesView` renders 5 adjacent entities as a vertical list with relationship labels. No horizontal swipe gesture. No edge labels between entities. The data model supports adjacency (DEMO_NEARBY_ENTITIES has relationship types), but the UI is a static list, not a swipeable carousel.
> **GAP:** This is a high-effort, high-differentiation feature. Requires: (1) horizontal swipe container with snap points, (2) edge label rendering between cards, (3) tap-to-pivot that recenters on the tapped entity. Could use CSS `scroll-snap-type: x mandatory` as a lightweight implementation before investing in full gesture handling.
> **FILES:** `src/features/founder/views/NearbyEntitiesView.tsx`, `src/features/founder/views/founderFixtures.ts` (DEMO_NEARBY_ENTITIES with relationship types)

---

### Principle 9: The Daily Brief Is the Return Hook

```
┌──────────────────────────────────────────┐
│  DAILY BRIEF · Mar 24                    │
│  3 entities changed · 1 new contradiction│
│                                          │
│  ┌─ IMPORTANT ──────────────────────┐    │
│  │ Acme AI: pricing model shifted   │    │
│  │ Was per-seat, now usage-based    │    │
│  │ Impact: High (affects your comp) │    │
│  │ [Open Entity] [Update Packet]    │    │
│  └──────────────────────────────────┘    │
│                                          │
│  ┌─ MONITOR ────────────────────────┐    │
│  │ Rival Corp: 2 new job postings   │    │
│  │ Both in sales (GTM expansion?)   │    │
│  │ [Open Entity]                    │    │
│  └──────────────────────────────────┘    │
│                                          │
│  ┌─ STALE ──────────────────────────┐    │
│  │ Key Vendor: packet is 14 days old│    │
│  │ Last checked: Mar 10             │    │
│  │ [Refresh Packet]                 │    │
│  └──────────────────────────────────┘    │
└──────────────────────────────────────────┘
```

**Three categories of attention:**
- **IMPORTANT** — graph-level importance shifted (new claims, contradictions, significant changes)
- **MONITOR** — signals detected but not yet significant (job postings, minor doc changes)
- **STALE** — packets that need refresh (time-based degradation)

**SitFlow learning:** SitFlow's agent chat has a "Morning briefing" quick command. NodeBench should make the daily brief the **default landing screen on mobile** — not a command you type, but the first thing you see.

> **CURRENT STATE (2026-03-24):** PARTIAL. `FounderDashboardView` at `/founder` IS the daily brief equivalent — it shows: Company Truth (Meridian AI), What Changed (5 changes), Biggest Contradiction (with initiative count), Next Moves, Artifact Packet, Agent Activity (4 agents), External Signals (4 signals), and History/Packet Reuse. `ExternalSignalsPanel` renders live signal fixtures (OpenAI Codex, Cursor agents, Shopify AI commerce, Shopify data governance). The dashboard auto-generates a weekly reset packet on first load.
> **GAP:** The dashboard is the daily brief on desktop. On mobile, it should be the **landing screen** — currently, `/` lands on the Ask surface (search bar), not the founder dashboard. Mobile users should see their brief first, search second. Also missing: the IMPORTANT/MONITOR/STALE categorization described above — all changes render at equal weight. Time-based staleness detection not implemented.
> **FILES:** `src/features/founder/views/FounderDashboardView.tsx`, `src/features/founder/components/ExternalSignalsPanel.tsx`, `src/features/founder/components/HistoryPacketReusePanel.tsx`

---

### Principle 10: Share = Distribution = Growth

Every entity workspace, every packet, every artifact should have a **one-tap share** that generates a public URL:

```
┌──────────────────────────────────────────┐
│  [Share Acme AI Packet]                  │
│                                          │
│  ┌──────────────────────────────────┐    │
│  │ 🔗 nodebench.ai/p/acme-ai-v7    │    │
│  │                                  │    │
│  │ Viewable without login           │    │
│  │ Includes: claims, changes,       │    │
│  │ contradictions, role: founder    │    │
│  │                                  │    │
│  │ [Copy Link]  [Share via...]      │    │
│  └──────────────────────────────────┘    │
│                                          │
│  OG Preview:                             │
│  ┌──────────────────────────────────┐    │
│  │ NodeBench · Acme AI Packet       │    │
│  │ 12 sources · 3 changes · v7      │    │
│  │ "Enterprise motion + pricing..." │    │
│  └──────────────────────────────────┘    │
└──────────────────────────────────────────┘
```

**Why this matters more than any UX polish:** ChatGPT spread via screenshots. Perplexity via citation URLs. NodeBench should spread via shareable packet URLs. The packet IS the distribution artifact. If the output isn't screenshot-worthy, it won't spread.

> **CURRENT STATE (2026-03-24):** DONE. `ShareableMemoView` at `/memo/:id` renders a public shareable page — no auth required. The component has print stylesheet support, responsive layout, and OG meta tags. Share buttons exist on the landing Decision Packet and Founder Dashboard intervention cards. `/memo/demo` always works with pre-seeded Meridian AI data.
> **GAP:** OG meta tags are static (set in `index.html`), not dynamic per memo. A shareable Shopify banker packet at `/memo/shopify-banker` would need server-side rendering or edge function to set proper OG title/description. Also: no "Copy Link" button on the shareable memo page itself — the share buttons are only on the dashboard, not on the shared artifact.
> **FILES:** `src/features/founder/views/ShareableMemoView.tsx`, `src/features/founder/views/FounderDashboardView.tsx` (share buttons)

---

## Mobile Navigation Architecture

```
Bottom Tab Bar (4 tabs):

┌──────────────────────────────────────────┐
│                                          │
│         Active Surface Content           │
│         (full viewport)                  │
│                                          │
├──────────────────────────────────────────┤
│  Brief    Search    Entities    Agent    │
│   📋        🔍        🏢        🐾      │
│  (3)                  (1)       (·)     │
└──────────────────────────────────────────┘

Brief:     Daily brief (return hook, default landing)
Search:    Search + upload + ask (Layer 1 intake)
Entities:  Tracked entities grid (Layer 2 context graph)
Agent:     Bottom-sheet chat (judgment panel)
```

**Badge behavior (from SitFlow):**
- Brief tab: count of IMPORTANT items since last visit
- Entities tab: count of entities with unresolved contradictions
- Agent tab: active dot when focused, hidden when not (SitFlow pattern)

> **CURRENT STATE (2026-03-24):** DIFFERENT IMPLEMENTATION. The bottom nav exists but uses the 5-surface cockpit tabs (Mission/Intel/Build/Agents/System) plus sub-view tabs (Ask/Research Hub/Agent Actions). This is the desktop information architecture squeezed into mobile. The proposed 4-tab founder-specific nav (Brief/Search/Entities/Agent) would be a fundamentally different mobile navigation model that prioritizes the founder workflow over the surface taxonomy.
> **GAP:** The current mobile nav works but isn't optimized for the founder daily loop. A dedicated founder mobile mode with the 4 proposed tabs would reduce navigation steps: Brief (1 tap to daily dashboard), Search (1 tap to company search), Entities (1 tap to tracked entities), Agent (1 tap to bottom-sheet panel). Badge counts not implemented on any tab.
> **FILES:** `src/layouts/CockpitLayout.tsx` (CommandBar at bottom), `src/layouts/components/CommandBar.tsx`

---

## Context Graph Visualization on Mobile

The full graph is too complex for 375px. Instead, show **ego-centric views**:

```
Centered on Acme AI:

              [Investor A]
                   │
                FUNDED_BY
                   │
[Rival Corp] ── COMPETES ── [ACME AI] ── DEPENDS_ON ── [Key Vendor]
                               │
                          BUILT_BY
                               │
                          [Founder X]
```

**Mobile rendering:** Force-directed layout with the active entity centered. Tap any node to pivot. Pinch to zoom. Double-tap to open entity workspace.

But this is Layer 2 depth — most users should never need to see the graph directly. The entity cards with claim/change/contradiction indicators ARE the graph, rendered for human consumption.

---

## Summary: NodeBench Mobile DNA

| SitFlow Pattern | NodeBench Translation | Graph Layer |
|-----------------|----------------------|-------------|
| Booking cards | Entity cards | L2: Context Graph |
| Draft approval cards | Claim + change cards | L2: Context Graph |
| Quick command chips | Role-aware command chips | L1: Intake |
| Chat with tools | Bottom-sheet judgment panel | L1-L2 bridge |
| Template-based drafts | Packet-based artifacts | L3→L4: Packet→Artifact |
| Haptic feedback | Web Vibration API | All layers |
| Badge visibility toggle | Graph-aware badges (contradictions, stale) | L2: Context Graph |
| Morning briefing | Daily brief as landing screen | L2+L3: Changes + Packets |
| Inbox filters | Claim filters (New/Changed/Contradiction/Stale) | L2: Context Graph |
| Send/Edit/Dismiss actions | Save Memo/Share/Go Deeper actions | L3→L4: Packet→Artifact |

**The one-sentence principle:**

> NodeBench mobile renders the context graph as entity cards with inline claims, changes, and contradictions — so every screen is a judgment surface that produces shareable packets without rebuilding context.

---

## Context Graph as the Mobile Spine (2026-03-25 Addition)

The context graph is NOT a dev tool. It IS the mobile product. NodeBench's mobile UX should think in terms of:

```
Layer 1 — INTAKE:    search, upload, ask, ingest
Layer 2 — CONTEXT:   entities, claims, changes, contradictions, workflows, adjacency, role
Layer 3 — PACKETS:   packet truth, versions, lineage, freshness, reuse
Layer 4 — ARTIFACTS: memo, deck, brief, delegation packet, environment spec
```

### 10 Node Types (What the Graph Contains)

| Node Type | Examples | Mobile Rendering |
|-----------|----------|-----------------|
| **Entity** | company, product, founder, competitor, market | Entity card with claim badges |
| **Source/Evidence** | website, PDF, transcript, news, MCP result | Citation chips on claims |
| **Claim** | "pricing changed", "enterprise motion launched" | Structured cards: NEW / CHANGED / CONTRADICTION |
| **Change** | feature launch, pricing shift, team change | Timeline entries in daily brief |
| **Contradiction** | website says X, docs say Y | Amber accent card with [Investigate] |
| **Workflow** | checkout flow, onboarding, support flow | Workflow cards in entity workspace |
| **Role/Viewpoint** | founder, banker, PM, researcher, operator | Pill toggle that reorders ALL content |
| **Packet** | company packet v7, diligence packet, delegation | Packet timeline with version diffs |
| **Artifact** | memo, sheet, deck, HTML brief | One-tap generate from action sheet |
| **Next-step** | monitor, escalate, delegate, compare, simulate | Action chips at bottom of any card |

### 9 Edge Types (How Nodes Connect)

```
ENTITY_HAS_SOURCE         → entity card shows source count
SOURCE_SUPPORTS_CLAIM     → claim card shows evidence citations
CLAIM_CONTRADICTS_CLAIM   → contradiction card links both sides
CHANGE_AFFECTS_ENTITY     → daily brief change entries
WORKFLOW_USED_BY_ENTITY   → entity workspace workflow tab
ROLE_PRIORITIZES_CLAIM    → role toggle reorders claims
PACKET_SUMMARIZES_ENTITY  → packet panel on entity card
ARTIFACT_DERIVED_FROM_PACKET → export action sheet
ENTITY_ADJACENT_TO_ENTITY → swipeable horizontal carousel
```

### What This Unlocks on Mobile

**Better search results** — Instead of 10 links and a summary, return: the canonical entity, top claims, recent changes, adjacent entities, and the right packet for the user's role.

**Better return hook** — Daily brief shows what CHANGED since last visit, which claims are STALE, which contradictions are UNRESOLVED. Not just "here's new content."

**Better role-adaptive judgment** — One packet truth, many role-specific renderings. The pill toggle at the top reorders everything without refetching.

**Better artifact generation** — The packet graph means you never rebuild context for artifacts. One tap from any entity → memo, deck, brief. The packet IS the cache.

**Better ambient monitoring** — Watch entities, topics, competitors. Update packets only when graph-level importance shifts, not every time a noisy signal appears.

### How SitFlow Validates These Principles

SitFlow is a simpler version of the same architecture:

| Context Graph Concept | SitFlow Implementation | Proof It Works |
|----------------------|----------------------|----------------|
| Entity cards | Booking cards in Inbox | Primary interaction surface |
| Inline action cards | AI draft cards with Send/Edit/Dismiss | 80% of agent interactions happen here |
| Role-adaptive ordering | Filter tabs (All/Needs Reply/New Client/Confirmed) | Same data, different priority |
| Claim nodes | Booking details (dates, service, pet info) | Structured, not prose |
| Change nodes | "Draft ready", "Status changed" via WebSocket | Real-time updates, not polling |
| Next-step actions | Quick command chips in Agent chat | Surface-aware suggestions |
| Packet history | Chat history persisted via AsyncStorage | Return hook — see what agent did |
| Artifact generation | Template-based drafts → clipboard → Rover | One tap produces shareable artifact |

SitFlow proves the pattern works at the pet-sitting scale. NodeBench applies it at the entity intelligence scale.

### SitFlow Implementation Patterns to Adopt (Specific)

**1. Tab bar as primary navigation (not sidebar collapse)**

SitFlow: 4 tabs, 56px + safeAreaInsets height, `HapticTab` wrapper, smart badge logic (hide when focused)

NodeBench mobile: Convert 5-surface left rail to bottom tab bar at `< 768px`:
```
[Brief]  [Search]  [Entities]  [Agent]  [System]
  📋       🔍        🏢         🐾        ⚙️
```

**2. Cards as solid surfaces, not glass**

SitFlow: `backgroundColor: '#1A1A2E'` — solid, zero GPU cost, consistent on all devices

NodeBench mobile: Switch glass cards (`backdrop-filter: blur`) to solid fallback on `< 768px`. Glass is pretty but janky on mid-tier Android phones. Use `@supports not (backdrop-filter: blur(1px))` or just a media query.

**3. Agent chat as bottom sheet, not sidebar**

SitFlow: Full-tab agent with `KeyboardAvoidingView`, `behavior='padding'` on iOS, `keyboardVerticalOffset: 90`

NodeBench mobile: The agent panel currently overlays as a right sidebar. On mobile, convert to a 3-state bottom sheet:
- **Peek (25%):** Last response summary + input bar
- **Half (60%):** Full conversation + quick chips
- **Full (100%):** Deep chat mode, swipe down to return

**4. Quick chips are the primary interaction, not typing**

SitFlow: `QUICK_COMMANDS` array → horizontal ScrollView → haptic on press → sends pre-built prompt

NodeBench mobile: Surface-aware command chips:
- On `/founder`: [Run Analysis] [Compare] [Export Memo]
- On `/research`: [Daily Brief] [Trending] [Check Sources]
- On `/memo`: [Refresh Packet] [Share] [Generate Deck]

**5. Draft/action cards inline, never navigate away**

SitFlow: AI draft appears INSIDE the booking card. 4px purple accent bar. Actions right there.

NodeBench mobile: When the agent returns a result for an entity, show it as an inline card within the entity workspace. Never navigate to a separate "results" page. The entity card IS the context.

**6. Persistence via localStorage, not just session**

SitFlow: `AsyncStorage.setItem(CHAT_KEY, JSON.stringify(messages))` on every message change

NodeBench mobile: Persist agent chat, last viewed entities, daily brief read state, and role selection to localStorage. The return experience should show exactly where you left off.

---

## Revised Priority Matrix (grounded in 2026-03-24 build state)

### Already Shipped (no work needed)
- P3: Role-adaptive ordering via `RoleOverlayView` — 5 lenses working
- P7: One-tap artifact export — 7 formats across 3 surfaces
- P10: Shareable packet URLs — `/memo/:id` public, no auth
- P6: Contradiction card prominent on desktop dashboard

### P0: Must-Do Next (structural mobile gaps)
1. **44px touch targets** — All interactive elements at `@media (max-width: 1024px)`. Current: 24-36px. P0 accessibility.
2. **Bottom-sheet agent panel** — Replace full-screen overlay with 3-state bottom sheet (25%/60%/100%). Highest structural mobile UX change.
3. **Contradiction card accent treatment** — Add terracotta `#d97757` left border + [Investigate] action to make contradictions visually distinct, not just another card.

### P1: High Impact (new mobile components)
4. **Claim/change visual cards** (P2) — Transform text list into structured cards with type badge (NEW/CHANGED/CONTRADICTION), evidence icons, confidence bar. This is the core data object rendered for mobile scanning.
5. **Mobile-first daily brief landing** — On mobile, `/` should route to `/founder` (the daily brief), not the Ask search bar. The brief IS the 5-second wow.
6. **IMPORTANT/MONITOR/STALE categorization** — Triage changes by severity so the daily brief isn't flat. Time-based staleness detection on packets.

### P2: Differentiation (high effort, high moat)
7. **Swipeable entity adjacency** (P8) — Horizontal scroll-snap carousel with edge labels. CSS `scroll-snap-type: x mandatory` as v1.
8. **Packet history timeline** — Visual timeline with date groupings, version labels, diff buttons. Data layer exists; visual layer needed.
9. **Entity cards with inline claim indicators** — Show claim count, contradiction count, staleness badge on entity cards themselves.
10. **Dynamic OG meta tags** — Server-side or edge-function rendering for `/memo/:id` to get proper social previews per packet.

### Effort Estimate

| Priority | Items | Estimated Effort |
|----------|-------|-----------------|
| P0 | 3 items | 1-2 days (CSS + component restructure) |
| P1 | 3 items | 3-5 days (new components + routing change) |
| P2 | 4 items | 5-10 days (gesture handling + timeline viz + SSR) |
