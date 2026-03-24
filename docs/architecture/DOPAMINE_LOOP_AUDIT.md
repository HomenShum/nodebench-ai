# Dopamine Loop Audit — NodeBench Product

**Date:** 2026-03-22
**Scope:** Source code audit of 6 key surfaces for feedback loops, retention hooks, and viral mechanics.
**Method:** Full read of ControlPlaneLanding, FounderDashboardView, CommandPanelView, CompanySetupView, AgentOversightView, founderFixtures.ts, and related interaction code.

---

## Executive Summary

NodeBench is a beautifully designed museum. Every surface renders static demo data with zero backend persistence, zero feedback loops, and zero reasons to return tomorrow. The product has the visual sophistication of a Bloomberg terminal but the interactivity of a PDF.

**Overall Dopamine Score: 14/100** (Grade F — science project with great CSS)

The core problem is not design — the design is excellent. The problem is that nothing is real, nothing persists, and nothing changes. Every button is a dead end. Every "Accept" click is a `useState` toggle that evaporates on page refresh.

---

## Surface-by-Surface Audit

### 1. ControlPlaneLanding.tsx (Landing Page)

**Time to dopamine:** ~2 seconds (visual stagger animation is satisfying)
- **What IS the reward?** Visual delight from stagger animations + a compelling demo Decision Packet.
- **Is it real?** No. `DEMO_PACKET` is a hardcoded const. The question ("Should we raise Series A now or wait until Q3?"), the answer, the variables, the scenarios — all static. The confidence score of 78% never changes.

**Feedback loop:** PARTIAL — the input bar opens the FastAgentPanel, which has demo conversations. But:
- The workflow preset cards fire `onOpenFastAgentWithPrompt` which leads to a demo conversation, not a real analysis.
- The "Run a Decision Packet" CTA sends `DEMO_PACKET.question` to the agent panel — same demo.
- Voice input works (browser speech API) and auto-submits, which is a genuine micro-loop.

**Variable reward:** ZERO. The page is identical on every visit. Same question, same 78% confidence, same 5 variables, same 3 scenarios.

**Investment mechanism:** ZERO. The input bar does not persist. No history. No saved queries.

**Social triggers:** ZERO. No share button. No export. No URL with embedded results. The Decision Packet preview is screenshot-worthy but there is no mechanism to share it.

**Progressive disclosure:** GOOD. Hero > Decision Packet > Input > Workflows > How It Works > Integrate > Proof. The complexity curve is well-structured. This is the one thing the landing page does right.

**Verdict:** A museum exhibit. Beautiful to look at once, no reason to return.

---

### 2. FounderDashboardView.tsx (Dashboard)

**Time to dopamine:** ~1.5 seconds (stagger cards reveal)
- **What IS the reward?** Sense of control — you see your company identity, what changed, ranked actions, initiatives, agents, and a daily memo. The information density is excellent.
- **Is it real?** No. Every block reads from `founderFixtures.ts`. `DEMO_COMPANY`, `DEMO_CHANGES`, `DEMO_INTERVENTIONS`, `DEMO_INITIATIVES`, `DEMO_AGENTS`, `DEMO_DAILY_MEMO`. All hardcoded.

**Feedback loop:** DEAD END.
- The "Accept / Defer / Reject" buttons on Ranked Interventions are `<button>` elements with no `onClick` handler. They render icons (Check, Clock, X) but clicking them does literally nothing — no state change, no toast, no animation, no persistence. The buttons exist only visually.
- The "Clarify Identity" button on the Company Identity card has no `onClick`.
- The "Inspect" button on Agent Activity cards has no `onClick`.
- The "New Initiative" card has no `onClick`.
- The chevron on change entries with `linkedInitiativeId` has no meaningful handler.

**Variable reward:** ZERO. `DEMO_DAILY_MEMO.date` is hardcoded to "March 21, 2026". The "What Changed" panel shows the same 5 items every time. Nothing is ever fresh.

**Investment mechanism:** ZERO. No Convex mutations. No localStorage. No state that survives a page refresh.

**Social triggers:** ZERO. No share, no export, no copy-to-clipboard on the daily memo.

**Progressive disclosure:** GOOD structure (6 blocks in priority order). But the content never evolves.

**Verdict:** A mockup pretending to be a dashboard. The ranked interventions are the single most valuable surface in the entire product — and their buttons do nothing.

---

### 3. CommandPanelView.tsx (Command Center)

**Time to dopamine:** ~3 seconds
- **What IS the reward?** A Slack-like agent conversation interface. The demo messages are well-written and create the illusion of agent intelligence.
- **Is it real?** No. `DEMO_CONVERSATIONS` (5 conversations), `DEMO_MESSAGES`, and `DEMO_AGENT_INFO` are all hardcoded. Zero backend calls.

**Feedback loop:** PARTIAL — the only real loop in the entire founder domain.
- The input bar at the bottom accepts text. `handleSend` adds the user message to `localMessages` state and then... does nothing else. No AI response is generated. No backend is called. The message appears in the chat, and the conversation is over.
- The "Approve / Reject" buttons on escalation cards DO toggle local state (`setResolved("approved")`). This is the only button in the entire founder domain that actually responds to a click. But it does not persist, and no follow-up action occurs.

**Variable reward:** ZERO. The demo messages are static. The conversations do not update.

**Investment mechanism:** MINIMAL. Users can type messages that appear in the chat — but these are lost on page refresh (React state only, no localStorage, no Convex).

**Social triggers:** ZERO.

**Progressive disclosure:** GOOD. Conversation list > Active chat > Context sidebar > Agent info.

**Verdict:** The closest thing to a real product surface. The approve/reject on escalations is the one working micro-interaction. But the input bar is a dead end — sending a message produces no response.

---

### 4. CompanySetupView.tsx (Onboarding Wizard)

**Time to dopamine:** ~5 seconds (step 1 selection gives immediate visual feedback)
- **What IS the reward?** Progress through a 4-step wizard. Selecting a founding mode gives a satisfying check animation and terracotta highlight. The step indicator fills in with emerald dots.
- **Is it real?** PARTIALLY. The wizard collects real input and generates a company profile using `generateProfile()` — a local function that creates a name, mission, wedge, and open questions from user input. This is the closest thing to "AI-generated" content in the product, but it's just string interpolation.

**Feedback loop:** GOOD STRUCTURE, DEAD END.
- Step 1: Select mode > visual feedback (check icon, highlight) > Continue button enables. This is a real micro-loop.
- Step 2: Form fields > Continue enables when validation passes. Decent.
- Step 3: Profile preview with inline edit (pencil icons toggle editable fields). Confidence meter animates to 42/68/35% depending on mode. This is genuinely satisfying.
- Step 4: Animated checkmark + "Your workspace is ready" + stats showing 0/0/0. And then... the "Go to Dashboard" button calls `console.log()`. The "Add First Initiative" button calls `console.log()`. Dead end.

**Variable reward:** ZERO. `generateProfile()` is deterministic based on input.

**Investment mechanism:** MODERATE for the session — user enters company name, mission fragments, market area. But ZERO persistence. Refresh and it's all gone. No localStorage, no Convex.

**Social triggers:** ZERO.

**Progressive disclosure:** EXCELLENT. The 4-step wizard is the best-designed surface for progressive complexity. Simple choice > Details > Preview > Confirmation.

**Verdict:** The best onboarding UX in the product. But it leads nowhere — the data evaporates and the final CTAs are console.log stubs.

---

### 5. AgentOversightView.tsx (Agent Management)

**Time to dopamine:** ~2 seconds (stagger reveal of agent cards with glowing status dots)
- **What IS the reward?** Sense of awareness — you see 4 agents with realistic statuses, heartbeat timestamps, current goals, and last summaries. The "blocked" and "drifting" states with escalation reasons are compelling.
- **Is it real?** No. `DEMO_AGENTS` is hardcoded. The "12s ago" heartbeat timestamp is a static string that will always say "12s ago".

**Feedback loop:** DEAD END.
- "Inspect" buttons: no handler.
- "Escalate" buttons: no handler.
- "Resolve" buttons: no handler.
- "Connect Agent" button: no handler.
- The entire Escalation Queue section renders but cannot be interacted with.

**Variable reward:** ZERO. Same 4 agents, same statuses, forever.

**Investment mechanism:** ZERO.

**Social triggers:** ZERO. The agent cards with status dots are genuinely screenshot-worthy but there is no mechanism to share them.

**Progressive disclosure:** GOOD. Summary grid > Escalation queue > Empty state with setup instructions.

**Verdict:** The most emotionally compelling surface (blocked agent + scope drift are real founder anxieties). Completely non-functional.

---

### 6. founderFixtures.ts (Demo Data)

This file defines the entire "reality" of the founder domain:
- 1 company (Meridian AI, climate-tech)
- 5 change events (all timestamped March 20-21, 2026)
- 5 ranked interventions (priority scores 65-94)
- 6 initiatives (various statuses)
- 4 agents (2 healthy, 1 waiting, 1 blocked)
- 1 daily memo (March 21, 2026)

**Critical finding:** The timestamps are absolute, not relative. "2h ago" will always say "2h ago" regardless of when the user visits. The daily memo date is hardcoded to "March 21, 2026" — it was already stale by March 22.

---

## Cross-Cutting Analysis

### What changes between visits?

**Nothing.** Zero surfaces use:
- `useQuery` / `usePaginatedQuery` (Convex realtime)
- `useEffect` with intervals or polling
- `localStorage` for persistence
- `Date.now()` for relative timestamps
- Any API call whatsoever

The founder domain has 0 Convex imports, 0 fetch calls, 0 mutations, 0 actions.

### What persists across sessions?

**Nothing.** No localStorage, no sessionStorage, no IndexedDB, no cookies, no Convex writes. Every user action (form input, wizard progress, message sent) is lost on page refresh.

### What is shareable?

**Nothing.** Zero share buttons, zero clipboard copy, zero export-to-PDF, zero shareable URLs, zero OG-tag-ready routes. The only copy mechanism in the entire founder domain is the "npx nodebench-mcp setup" code snippet in the AgentOversight empty state.

### What is the "feed" that's always fresh?

**Nothing.** There is no feed. The "What Changed" panel and "Today's Briefing" are static fixtures. No RSS, no API poll, no Convex subscription, no WebSocket.

---

## The Dead Button Inventory

Every button below renders visually but has NO functional handler:

| Surface | Button | What it should do |
|---------|--------|-------------------|
| FounderDashboard | Accept/Defer/Reject (interventions) | Mark action taken, update priority, trigger agent |
| FounderDashboard | Clarify Identity | Open refinement flow, recalculate confidence |
| FounderDashboard | Inspect (agent) | Navigate to AgentOversight detail |
| FounderDashboard | New Initiative | Open initiative creation flow |
| FounderDashboard | Change chevrons | Navigate to linked initiative |
| AgentOversight | Inspect | Show agent detail/logs |
| AgentOversight | Escalate | Create escalation, notify founder |
| AgentOversight | Resolve | Mark issue resolved, update agent status |
| AgentOversight | Connect Agent | Open connection wizard |
| CompanySetup | Go to Dashboard | Navigate to dashboard with persisted data |
| CompanySetup | Add First Initiative | Navigate to initiative creation |
| CommandPanel | Send message | Generate AI response |

**Total dead buttons: 13**

---

## P0 / P1 / P2 Product Changes

### P0: Make the core loop real (blocks everything else)

**P0-1: Wire intervention Accept/Defer/Reject to Convex.**
The ranked interventions in FounderDashboardView are the single highest-value interaction. When a founder clicks "Accept":
1. Persist the decision to Convex (`intervention_decisions` table)
2. Show a toast confirmation with undo
3. Move the accepted item to an "In Progress" state with a progress bar
4. Re-rank remaining interventions
5. Optionally trigger the linked agent to begin work

Code location: `FounderDashboardView.tsx` lines 331-350 (the Accept/Defer/Reject button group). Currently renders buttons with hover states but no `onClick` handlers.

**P0-2: Persist CompanySetup wizard data to Convex.**
The wizard collects real input (company name, mission, wedge, founding mode). This is the user's investment. It MUST persist:
1. On Step 4 completion, write to `company_identity` table in Convex
2. "Go to Dashboard" navigates to `/founder` and the dashboard reads real data
3. The Identity Confidence score becomes a live metric that improves as the user adds initiatives and connects agents

Code location: `CompanySetupView.tsx` lines 796-799 (`handleGoToDashboard` currently calls `console.log`).

**P0-3: Make "What Changed" use real timestamps.**
Replace static `relativeTime: "2h ago"` strings with `Date.now()` relative calculations. Even with demo data, showing "3 days ago" vs "2h ago" makes staleness visible and forces fresh data.

Code location: `founderFixtures.ts` lines 37-83. Replace `relativeTime` with a computed getter from `timestamp`.

### P1: Create the first dopamine loop

**P1-1: Daily Memo auto-generation.**
The Daily Memo is the return hook. It must be different every day:
1. Convex scheduled function runs at 6:30 AM user-local
2. Aggregates: intervention decisions made yesterday, agent status changes, initiative movements, new signals
3. Generates "What matters / What to do next / Unresolved" using LLM
4. Shows "New briefing available" badge in WorkspaceRail when user returns

This is the TikTok "For You Page" equivalent — the thing that is always fresh.

**P1-2: Agent heartbeat simulation (minimum viable liveness).**
Even without real agents, simulate liveness:
1. `useEffect` with 30-second interval updates heartbeat timestamps
2. Randomly drift agent statuses (healthy -> waiting -> healthy)
3. Add a pulsing dot animation on the "healthy" status
4. Show "Last active: just now" instead of static "12s ago"

This creates the illusion of a living system. When real agents connect, the pattern is already established.

**P1-3: CommandPanel should echo back AI responses.**
When the user sends a message, generate at minimum a streaming demo response:
1. Show typing indicator (3 dots)
2. After 1-2 seconds, stream a contextual response character-by-character
3. Use the existing `demoConversation.ts` pattern to match keywords to responses
4. This creates the minimum viable input -> processing -> output loop

Code location: `CommandPanelView.tsx` line 865 (`handleSend` currently only appends user message).

**P1-4: Intervention completion creates a decision log.**
When a user accepts/defers/rejects an intervention, write to a `decision_log` table. Show the log as a new "Decision History" section on the dashboard. Over time, this becomes:
- Evidence of founder decision velocity
- Training data for better intervention ranking
- A shareable artifact ("I made 47 data-backed decisions this month")

### P2: Viral mechanics and retention

**P2-1: One-click share for Decision Packets.**
Add a "Share" button to the Decision Packet preview on the landing page that:
1. Generates a unique URL (`/p/{packet_id}`)
2. The URL renders the packet in a clean, public-facing view with OG tags
3. No auth required to view
4. Footer: "Generated by NodeBench — try it free"

This is the ChatGPT screenshot equivalent — the output IS the distribution.

**P2-2: Decision Memo PDF export.**
Add an "Export" button to the Daily Memo that generates a one-page PDF:
- Company name + date
- What matters (3 bullets)
- What to do next (3 bullets)
- Unresolved (2 bullets)
- Intervention ladder with accept/defer/reject status
- Footer: "Generated by NodeBench"

Founders share these in Slack channels and investor updates.

**P2-3: Streak counter for daily engagement.**
Track consecutive days the founder reviewed the daily memo and acted on at least one intervention:
- "5-day streak" badge on the dashboard
- Streak breaks show "You missed yesterday's briefing" with a summary of what changed
- Weekly email: "Your decision velocity: 12 actions this week (up 40%)"

**P2-4: Identity Confidence as a game mechanic.**
The `identityConfidence` score (currently hardcoded at 0.62) should be a live metric:
- +5% when you add an initiative
- +3% when you connect an agent
- +2% when you accept an intervention
- -1% per day of inactivity
- Reaching 90%+ unlocks "Founder Identity Verified" badge

This turns setup completion from a one-time task into an ongoing investment.

**P2-5: Agent cards as embeddable widgets.**
Let founders embed their agent status panel in a Notion page or personal site:
- `<iframe src="nodebench.ai/embed/agents/{company_id}" />`
- Shows live agent count, health status, last action
- Clicking through opens NodeBench signup

---

## Minimum Viable Dopamine Loop Design

The smallest possible change set that creates a real feedback loop:

```
User opens dashboard
  -> Sees TODAY's daily memo (generated, not static)
  -> Reads "What to do next" (3 ranked interventions)
  -> Clicks "Accept" on #1
    -> Button animates (check -> green bg)
    -> Toast: "Accepted: Fix 3 failing integration tests"
    -> Intervention moves to "In Progress" section
    -> Decision logged to Convex
    -> Intervention count badge updates: "1 action today"
  -> Clicks "Accept" on #2
    -> Same loop
    -> Badge: "2 actions today"
  -> Scrolls to Daily Memo
    -> "What to do next" has 2 items struck through
    -> "Unresolved" section still shows 2 open items
  -> Closes app

NEXT DAY:
  -> Opens dashboard
  -> NEW daily memo (yesterday's actions reflected)
  -> "What Changed" shows: "You accepted 2 interventions yesterday"
  -> New interventions ranked based on what was completed
  -> Streak counter: "2-day streak"
```

**Implementation cost:** ~3 days
- Day 1: Convex table for decisions + mutation for accept/defer/reject + toast feedback
- Day 2: Daily memo generation function (can start with template-based, upgrade to LLM later)
- Day 3: Streak tracking + relative timestamps + "What Changed" includes user actions

**What this achieves:**
- Input -> Output loop (click Accept -> visual confirmation + persistence)
- Variable reward (daily memo is different every day)
- Investment (decisions accumulate, streak builds)
- Return hook (new memo every morning)

This is the difference between a demo and a product.

---

## Appendix: Scoring by Usability Dimension

| Dimension | Current | After P0 | After P1 | After P2 |
|-----------|---------|----------|----------|----------|
| Time to Value | 2 | 4 | 7 | 8 |
| Zero-Friction Entry | 5 | 5 | 6 | 7 |
| Input Obviousness | 6 | 7 | 8 | 9 |
| Output Quality | 1 | 3 | 6 | 8 |
| Feedback Loop Speed | 0 | 4 | 7 | 8 |
| Mobile Usability | 5 | 5 | 6 | 7 |
| Voice / Hands-Free | 3 | 3 | 4 | 6 |
| Shareability | 0 | 0 | 2 | 7 |
| Return Hook | 0 | 1 | 6 | 8 |
| Show Someone Factor | 3 | 4 | 6 | 8 |
| **TOTAL** | **25** | **36** | **58** | **76** |
| **Grade** | **F** | **D** | **C** | **A** |

The path from F to A is clear. The design work is done. The backend wiring is what separates a demo from a product.
