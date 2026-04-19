# NodeBench Delta — Self-Diligence & Market Coverage Spec

> "The product that finds its own gaps is the product that closes them fastest."

**Version:** 1.0.0
**Date:** 2026-03-29
**Status:** Implementation-ready
**Owner:** Homen Shum

---

## Table of Contents

1. [Naming Architecture](#1-naming-architecture)
2. [Product Thesis](#2-product-thesis)
3. [Hackathon-Ready: NodeBench + retention.sh](#3-hackathon-ready-nodebench--retentionsh)
4. [Self-Diligence Loop](#4-self-diligence-loop-dog-eats-its-own-food)
5. [5-Layer Market Coverage Scanner](#5-5-layer-market-coverage-scanner)
6. [Gap Registry](#6-gap-registry-what-nodebench-does-not-yet-cover)
7. [UI Layer Mapping](#7-ui-layer-mapping-every-surface-every-gap)
8. [Backend Layer Mapping](#8-backend-layer-mapping-every-route-every-gap)
9. [Packet Schema](#9-packet-schema)
10. [Eval Metrics](#10-eval-metrics)
11. [Cadence & Recurring Prompts](#11-cadence--recurring-prompts)
12. [One-Liner Install](#12-one-liner-install)
13. [Hackathon Playbook](#13-hackathon-playbook)
14. [Competitive Grid](#14-competitive-grid)
15. [Implementation Priorities](#15-implementation-priorities)

---

## 1. Naming Architecture

### Two-Layer System

| Layer | Name | Purpose |
|-------|------|---------|
| **Company/Platform** | **NodeBench** | The infrastructure, the MCP server, the backend |
| **Product/App** | **Delta** | The intelligence workspace — what changed, what matters, what next |

### Packet Types (Banking Convention)

| Packet | Shell Verb | What It Produces | UI Surface |
|--------|-----------|------------------|------------|
| `delta.brief` | `brief` | What changed since last session | Session Delta view (`founder-session-delta`) |
| `delta.diligence` | `diligence` | Deep company/entity teardown | Company Analysis (`company-analysis`) |
| `delta.handoff` | `handoff` | Delegation packet for agents/teammates | Agent Brief (`agent-brief`) |
| `delta.watchlist` | `watch` | Entities to monitor + alert triggers | Nearby Entities (`nearby-entities`) |
| `delta.memo` | `memo` | Decision-ready artifact with evidence | Decision Workbench (`deep-sim`) |
| `delta.postmortem` | `review` | Forecast vs reality reconciliation | Postmortem (`postmortem`) |
| `delta.retain` | `retain` | Context preservation across sessions | Context Intake (`context-intake`) |
| `delta.market` | `scan` | Market coverage gap analysis (this spec) | System / Oracle (`oracle`) |

### CLI/Workflow Commands (retention.sh Style)

```bash
# Shell verbs — all produce packets
npx nodebench-mcp brief              # What changed since last session
npx nodebench-mcp diligence "Anthropic"  # Deep entity teardown
npx nodebench-mcp handoff --to claude_code "Build the auth flow"
npx nodebench-mcp watch --add "Stripe" --alert "pricing change"
npx nodebench-mcp memo --decision "Should we pivot to B2B?"
npx nodebench-mcp review --forecast "Q1 revenue target"
npx nodebench-mcp retain --context "Meeting notes from board call"
npx nodebench-mcp scan --layer market  # Self-diligence scan
```

---

## 2. Product Thesis

### One-Sentence

**NodeBench Delta is the operating-memory and entity-context layer that tells founders, bankers, and operators: what changed, what matters, what to do next — using their own private context layered on top of public intelligence.**

### Three Hard Rules

1. **Value before identity** — The first interaction returns a useful result, not a landing page. Demo packets run live. No signup required to see real output.
2. **Output IS distribution** — Every delta.memo, delta.diligence, delta.brief produces a shareable artifact (URL, markdown, PDF). The output brings new users in.
3. **The product improves itself** — Session memory, progressive discovery rankings, co-occurrence edges, skill freshness, and this self-diligence loop compound. Use a tool -> tool learns -> next suggestion is better -> use more tools.

### Positioning vs Market

| Axis | NodeBench Delta | Supermemory | Perplexity | PitchBook | Linear |
|------|----------------|-------------|------------|-----------|--------|
| **Core value** | Entity intelligence + change detection | Universal memory substrate | Search + synthesis | Financial data terminal | Project management |
| **Differentiator** | Private context + contradiction detection + packets | MCP memory connectors | Citations + follow-up | Coverage depth | Speed + keyboard |
| **Front door** | Search/upload -> proof packet | Connect everything | Search box | Browse database | Create issue |
| **Who** | Founders, bankers, operators | Developers, AI builders | Everyone | Finance professionals | Engineering teams |
| **What we own** | Own-entity intelligence, causal memory, change delta | Memory infrastructure | General knowledge | Financial data | Workflow velocity |

---

## 3. Hackathon-Ready: NodeBench + retention.sh

### The Pitch

> **retention.sh** keeps your QA workflow repeatable and your team's context in sync.
> **NodeBench Delta** gives your team entity intelligence, decision memos, and agent-powered research — so you build the right thing, not just build things right.
>
> Together: **build fast, build right, keep winning.**

### Integration Architecture

```
+-------------------+     Shared Context Protocol     +-------------------+
|   retention.sh    |<------------------------------->|  NodeBench Delta  |
|                   |                                  |                   |
| - QA crawl/audit  |     peer: "retention"            | - Entity intel    |
| - Team memory     |     peer: "nodebench_delta"      | - Decision memos  |
| - Token tracking  |                                  | - Agent dispatch  |
| - Rule enforcement|     Shared packets:              | - Watchlists      |
| - Screenshot QA   |     - qa_findings                | - Market scans    |
|                   |     - context_bundle              |                   |
| Port: proxy       |     - decision_packet             | Port: 5191        |
| Dashboard: web    |     - handoff_prompt              | Dashboard: web    |
+-------------------+                                  +-------------------+
         |                                                       |
         +-------------------+  +  +-----------------------------+
                             |  |  |
                        MCP Protocol (JSON-RPC 2.0)
                             |  |  |
                    +--------+--+--+---------+
                    |  Claude Code / Cursor   |
                    |  OpenClaw / Windsurf    |
                    |  Any MCP-compatible IDE |
                    +------------------------+
```

### Hackathon Team Setup (< 2 minutes)

#### Step 1: retention.sh (QA + Memory)
```bash
# One-liner: install retention.sh for your team
RETENTION_TEAM=<TEAM_CODE> curl -sL retention.sh/install.sh | bash
# Restart Claude Code. QA runs now sync to team dashboard.
# Dashboard: https://retention.sh/memory/team?team=<TEAM_CODE>
```

#### Step 2: NodeBench Delta (Intelligence + Decisions)
```bash
# One-liner: install NodeBench Delta for your team
claude mcp add nodebench -- npx -y nodebench-mcp --preset=founder
# Or for Cursor:
# Add to .cursor/mcp.json: { "nodebench": { "command": "npx", "args": ["-y", "nodebench-mcp", "--preset=founder"] } }
```

#### Step 3: Wire them together (optional, for advanced teams)
```bash
# In Claude Code, NodeBench auto-discovers retention.sh if both are running
# Shared context packets flow between them via the sync bridge
# retention.sh QA findings become NodeBench context packets
# NodeBench decision memos become retention.sh team memory
```

### Hackathon Workflow: Build -> Ship -> Win -> Scale

| Phase | retention.sh Does | NodeBench Delta Does |
|-------|-------------------|---------------------|
| **Ideation (0-1h)** | — | `delta.diligence "competitor"` -> understand the market in 60 seconds |
| **Building (1-20h)** | QA every deploy, catch regressions, track team memory | `delta.handoff` -> delegate research to agents while you code |
| **Demo prep (20-22h)** | Screenshot gallery, QA score for judges | `delta.memo` -> decision-ready artifact explaining WHY this product |
| **Judging (22-24h)** | Proof of quality (100/100 QA score) | Proof of intelligence (market analysis, competitor grid) |
| **Post-hackathon** | Continue QA pipeline, team memory persists | `delta.watchlist` -> monitor competitors, track market shifts |
| **Scaling (week 2+)** | Regression prevention, onboarding new devs | `delta.brief` -> daily what-changed digest, `delta.review` -> forecast accuracy |

### What Judges See

| Without NodeBench + retention.sh | With NodeBench + retention.sh |
|----------------------------------|-------------------------------|
| "We built a thing" | "We built a thing, here's WHY it wins" |
| No QA evidence | 100/100 QA score, screenshot proof |
| Manual competitor research | Live entity intelligence with citations |
| Hope-based market sizing | Evidence-backed decision memo |
| Demo breaks on stage | Regression-tested, every surface verified |
| Post-hackathon: project dies | Post-hackathon: daily brief, watchlist alerts, team memory |

---

## 4. Self-Diligence Loop (Dog Eats Its Own Food)

### The Meta-Loop

NodeBench Delta uses its own tools to find its own blind spots.

```
                    +---------------------------+
                    |   1. SCAN                 |
                    |   Run 5-layer market      |
                    |   coverage analysis       |
                    +-------------|-------------+
                                  |
                    +-------------|-------------+
                    |   2. DETECT               |
                    |   Identify uncovered       |
                    |   jobs/workflows/angles   |
                    +-------------|-------------+
                                  |
                    +-------------|-------------+
                    |   3. PACKET               |
                    |   Generate delta.market   |
                    |   gap analysis packet     |
                    +-------------|-------------+
                                  |
                    +-------------|-------------+
                    |   4. DELEGATE             |
                    |   Route fixes via         |
                    |   delta.handoff packets   |
                    +-------------|-------------+
                                  |
                    +-------------|-------------+
                    |   5. MEASURE              |
                    |   Before/after impact     |
                    |   Blind-spot closure rate  |
                    +-------------|-------------+
                                  |
                    +-------------|-------------+
                    |   6. REPEAT               |
                    |   Weekly / Monthly /      |
                    |   Quarterly cadence       |
                    +---------------------------+
```

### Self-Diligence Prompts (Run via NodeBench MCP)

These are the actual prompts NodeBench should run on itself:

#### Daily Prompt (Automated via `delta.brief`)
```
Given the last 24 hours of:
- git commits to nodebench-ai
- market signals from watchlist entities
- user feedback (if any)
- eval score changes

Produce a delta.brief packet:
1. What changed in the product
2. What changed in the market
3. What gap widened or narrowed
4. What to prioritize today
```

#### Weekly Prompt (Automated via `delta.market`)
```
Run a 5-layer market coverage scan:

LAYER 1 — MARKET BASELINE
- What is table stakes for AI intelligence tools in March 2026?
- What capabilities do users expect by default?
- Where has NodeBench fallen behind baseline?

LAYER 2 — JOB COVERAGE
For each persona (founder, banker, CEO, researcher, student):
- What jobs are they hiring tools to do?
- Which of those jobs does NodeBench serve well?
- Which are underserved or unserved?
- Rank by urgency and retention impact.

LAYER 3 — WORKFLOW FRICTION
Map the full workflow from search/upload/ask to artifact/delegation/monitoring.
- Where does the user still manually reconstruct context?
- Where does the user manually compare entities?
- Where does the user manually route work to an agent?
- Where is there no "keep warm" default?

LAYER 4 — COMPETITIVE DELTA
Research current adjacent products and tell me:
- What they are clearly better at than NodeBench
- What they make users expect by default
- What parts of their experience we should absorb
- What categories we should refuse to fight directly

LAYER 5 — TREND EXPOSURE
Given current AI agent/tool trends:
- What parts of NodeBench architecture are future-proof?
- What parts are likely to become table stakes in 6 months?
- What missing capabilities will become expected?
- What should we build now to stay ahead?

Output: delta.market packet with ranked gaps, confidence scores, and recommended actions.
```

#### Monthly Prompt (Strategic Review)
```
Review the last 4 weekly delta.market packets.

1. TREND LINE — Are gaps closing or widening?
2. CATEGORY DRIFT — Is our category changing faster than we are?
3. COMPETITIVE MOVES — What did competitors ship this month?
4. BLIND SPOT AUDIT — What did we miss that we should have caught?
5. BUILD RECOMMENDATIONS — Rank top 5 investments by impact/effort.
6. NARRATIVE CHECK — Is our positioning still accurate?

Output: delta.market.monthly packet with:
- Gap closure rate (%)
- Competitive delta trend
- Top 3 build recommendations
- Narrative adjustment (if needed)
```

#### Quarterly Prompt (Category Review)
```
Full category review:

1. CATEGORY DEFINITION — How would an analyst define our category today?
2. MARKET MAP — Who are the top 10 players? Where do we sit?
3. MOAT ASSESSMENT — What is defensible? What is not?
4. USER RESEARCH — What are the top 5 unmet needs in the category?
5. TECHNOLOGY SHIFTS — What infrastructure changes affect us?
6. DISTRIBUTION — What channels are working? What new ones opened?
7. PRICING — Are we priced correctly relative to value delivered?

Output: delta.market.quarterly with category map, moat score, and 90-day roadmap.
```

---

## 5. 5-Layer Market Coverage Scanner

### Layer 1: Market Baseline

| Capability | Table Stakes? | NodeBench Status | Gap? |
|-----------|--------------|-----------------|------|
| MCP interoperability | YES (2026) | 304 tools, JSON-RPC 2.0 gateway | No |
| Persistent memory/context | YES (2026) | Session memory, SQLite store, sync bridge | No |
| Search-first entry | YES (2026) | ControlPlaneLanding search bar + role lenses | No |
| Entity intelligence | EMERGING | Company search + analysis + 9-card brief | Partial — needs live data |
| Artifact generation | EMERGING | Decision memos, export center (7 formats) | Partial — needs shareable URLs |
| Agent orchestration | EMERGING | Agent oversight, command panel, handoff | Partial — needs smoother bridge |
| Change detection | NOT YET | Session delta view exists | YES — no automated alerts |
| Watchlist/monitoring | NOT YET | Nearby entities view exists | YES — no "keep warm" |
| Voice-first | EARLY | Browser speech + server voice restored | Partial — not primary interface |
| Mobile-first | EXPECTED | Responsive but cramped | YES — agent panel needs mobile |

### Layer 2: Job Coverage by Persona

| Persona | Top Job | NodeBench Covers? | Gap |
|---------|---------|-------------------|-----|
| **Founder** | "What changed in my market while I was building?" | Partial — session delta exists but no live signals | Need automated daily brief with real data |
| **Founder** | "Give me a decision memo I can share with my board" | YES — deep-sim decision workbench | Need shareable URL (not just PDF) |
| **Founder** | "Watch my competitors and alert me" | Partial — nearby entities view | Need watchlist with proactive alerts |
| **Banker** | "Deep diligence on a company in 60 seconds" | YES — company search + analysis | Need live data (not demo fixtures) |
| **Banker** | "Compare this target to 3 comps" | Partial — entity view exists | Need side-by-side comparison view |
| **CEO** | "What does my own company look like from outside?" | Partial — own-entity mode exists | Need private context overlay |
| **Researcher** | "Synthesize these 5 papers/sources" | Partial — context intake + research hub | Need better multi-doc synthesis |
| **Student** | "Help me understand this company for my case study" | YES — company search with student lens | Good coverage |
| **Hackathon team** | "Understand the market, build fast, prove we're right" | NEW — this spec enables it | Need full workflow (below) |

### Layer 3: Workflow Friction Map

```
USER JOURNEY: Search → Understand → Decide → Act → Monitor → Repeat

Step 1: SEARCH / UPLOAD / ASK
  NodeBench: ControlPlaneLanding search bar ✓
  Friction: None — clear input, role lenses, voice input

Step 2: UNDERSTAND (Entity Intelligence)
  NodeBench: Company analysis 9-card brief ✓
  Friction: MEDIUM — results use demo data, not live
  Gap: Need live web search + extraction pipeline

Step 3: COMPARE (Multiple Entities)
  NodeBench: Entity view with related entities ✓
  Friction: HIGH — no side-by-side comparison
  Gap: Need delta.diligence comparison mode

Step 4: DECIDE (Generate Artifact)
  NodeBench: Decision Workbench (deep-sim) ✓
  Friction: LOW — good workflow, 6 sub-views
  Gap: Need one-click from search result → decision memo

Step 5: ACT (Delegate to Agent)
  NodeBench: Agent brief + command panel ✓
  Friction: MEDIUM — handoff prompt is manual
  Gap: Need delta.handoff with auto-generated context

Step 6: MONITOR (Watch for Changes)
  NodeBench: Session delta view ✓
  Friction: HIGH — no automated monitoring
  Gap: Need delta.watchlist with proactive alerts

Step 7: REPEAT (Come Back Tomorrow)
  NodeBench: Research hub with daily brief ✓
  Friction: HIGH — daily brief uses demo data
  Gap: Need live signals + "what changed" notifications
```

### Layer 4: Competitive Delta (March 2026)

| Competitor | What They're Better At | What We Should Absorb | What We Should NOT Fight |
|-----------|----------------------|----------------------|--------------------------|
| **Supermemory** | Universal memory connectors, MCP-native memory substrate, benchmark discourse | Connector breadth, memory-as-infrastructure positioning | Pure memory substrate — they own this narrative |
| **Perplexity** | Search UX, citation quality, follow-up chains, speed | Citation chain UI, streaming response feel | General web search — too broad, too expensive |
| **PitchBook/CB Insights** | Financial data depth, coverage breadth, institutional trust | Data density per entity, comparison views | Historical financial data — they have decades of it |
| **Linear** | Speed (sub-50ms), keyboard-first, opinionated defaults | Response time obsession, keyboard shortcuts | Project management — different category |
| **OpenClaw** | Proactive heartbeat, self-modifying skills, Discord/Telegram UI | Proactive agent patterns, "meet users where they are" | General autonomous agent — too broad |
| **ChatGPT** | General knowledge, streaming UX, mobile app | Streaming response feel, mobile-first agent panel | General AI assistant — can't out-ChatGPT ChatGPT |
| **Notion AI** | Workspace integration, collaborative editing, database queries | Workspace feel for documents, team collaboration | Full workspace replacement — too much scope |

### Layer 5: Trend Exposure (6-12 Month Horizon)

| Trend | NodeBench Position | Risk | Action |
|-------|-------------------|------|--------|
| MCP becomes universal standard | STRONG — 304 tools, gateway, presets | LOW — already built | Maintain, add more connectors |
| Memory/context becomes table stakes | STRONG — session memory, sync bridge, shared context | MEDIUM — Supermemory is louder | Differentiate on causal memory, not just raw storage |
| Agent orchestration matures | STRONG — command panel, agent oversight, handoff | MEDIUM — many competitors entering | Focus on packet-driven delegation, not generic orchestration |
| Voice-first interfaces emerge | PARTIAL — browser speech works | HIGH — not primary interface yet | Build voice-first mobile experience |
| Proactive intelligence expected | WEAK — no automated alerts | HIGH — users will expect "push" not just "pull" | Build watchlist + notification system |
| Cross-provider continuity | STRONG — sync bridge, shared context protocol | LOW — unique architecture | Continue building |
| Shareable artifacts as distribution | WEAK — no shareable URLs for memos | HIGH — output IS distribution | Build one-click share for all packets |
| Role-native outputs | PARTIAL — 6 lenses exist | MEDIUM — same output shape per role | Differentiate output structure per persona |

---

## 6. Gap Registry: What NodeBench Does Not Yet Cover

### P0 — Must Have for Hackathon + Launch

| # | Gap | Why It Matters | Existing Infra | What to Build | Effort |
|---|-----|---------------|----------------|---------------|--------|
| G1 | **Live entity intelligence** | Demo data makes the product feel fake | Search route exists, Gemini extraction exists | Wire live web search → extraction → result rendering | 2 days |
| G2 | **Shareable packet URLs** | Output IS distribution — without sharing, no virality | ShareableMemoView exists at `/memo/:id` | Extend to all packet types: brief, diligence, watchlist | 1 day |
| G3 | **One-click search → memo** | Too many clicks from result to decision artifact | Both search and deep-sim exist | Add "Create Memo" CTA on every search result card | 4 hours |
| G4 | **Hackathon preset** | Founders need < 2 min setup | `founder` preset exists with ~40 tools | Create `hackathon` preset: founder + shared_context + retain | 2 hours |
| G5 | **retention.sh peer registration** | Teams using both tools need seamless coordination | Shared context protocol exists | Register retention.sh as a peer, sync QA findings | 1 day |

### P1 — Should Have for Week 1 Post-Launch

| # | Gap | Why It Matters | Existing Infra | What to Build | Effort |
|---|-----|---------------|----------------|---------------|--------|
| G6 | **Watchlist with alerts** | No "keep warm" = no return hook | Nearby entities view exists | Add "Watch" button, background refresh, notification system | 3 days |
| G7 | **Own-entity intelligence** | Highest-value surface — "what does MY company look like?" | Company search exists | Add private context overlay, internal doc upload, contradiction detection | 3 days |
| G8 | **Side-by-side comparison** | Bankers/founders always compare entities | Entity view exists | Build comparison view: 2-4 entities, same metrics, delta highlighting | 2 days |
| G9 | **Daily brief with live data** | Research Hub needs fresh content for retention | Research Hub exists with daily brief section | Wire to live news/signal feeds, daily digest generation | 3 days |
| G10 | **Mobile-first agent panel** | > 50% of hackathon browsing is mobile | Agent panel exists as sidebar | Responsive redesign: bottom sheet on mobile, full-screen on small viewports | 2 days |

### P2 — Nice to Have for Month 1

| # | Gap | Why It Matters | Existing Infra | What to Build | Effort |
|---|-----|---------------|----------------|---------------|--------|
| G11 | **Voice-first commands** | "Investigate Anthropic" via voice = OpenClaw pattern | Voice input hook exists | Map voice aliases → delta commands (brief, diligence, watch) | 2 days |
| G12 | **Proactive heartbeat** | Agent should check in, not wait to be asked | Command bridge exists | Scheduled agent check-ins: "Your watchlist entity X had a major change" | 3 days |
| G13 | **Before/after tracking** | No way to measure if a gap closed | Eval harness exists | Store weekly snapshots, diff across time, visualize trend | 2 days |
| G14 | **Role-native artifact shapes** | Banker gets same output shape as student | Role lenses exist | Per-role templates: banker = financial grid, founder = narrative, student = study guide | 3 days |
| G15 | **Multi-doc synthesis** | Researchers need to synthesize 5+ sources | Context intake exists | Upload multiple docs → cross-reference → unified brief | 3 days |

---

## 7. UI Layer Mapping: Every Surface, Every Gap

### Current Surfaces → Delta Mapping

| Surface | Current Views | Delta Packet | Gap Status | Action Required |
|---------|--------------|-------------|------------|-----------------|
| **Ask** | ControlPlaneLanding, developers, pricing, changelog, legal | `delta.diligence` (search results) | PARTIAL — demo data | G1: Wire live search |
| **Memo** | Deep-sim, snapshot, variables, scenarios, interventions, evidence | `delta.memo` | GOOD — full decision workbench | G3: One-click from search |
| **Research** | Research hub, entity profiles | `delta.brief`, `delta.watchlist` | PARTIAL — demo data | G9: Live daily brief, G6: Watchlist |
| **Investigate** | Investigation surface | `delta.diligence` (deep) | GOOD — adversarial analysis | — |
| **Compare** | Postmortem (forecast review) | `delta.postmortem` | GOOD — prediction vs reality | — |
| **Workspace** | Documents | `delta.retain` | GOOD — files and notes | — |
| **Graph** | Entity view | `delta.diligence` (entity profile) | PARTIAL — needs comparison | G8: Side-by-side |
| **Trace** | Receipts, delegation | — (operational) | GOOD — audit trail | — |
| **System** | Oracle (telemetry) | `delta.market` (self-diligence) | NEW — add market scan tab | Add self-diligence dashboard |

### New UI Components Needed

#### 7.1 Watchlist Panel (for `delta.watchlist`)
```
Location: Research Hub → new "Watchlist" tab
Components:
  - WatchlistEntityCard — entity name, last checked, change count, alert badge
  - WatchlistAlertFeed — chronological stream of material changes
  - WatchlistAddModal — search + add entity with alert preferences
  - WatchlistRefreshButton — manual refresh all watched entities

Design DNA:
  - Glass card: bg-white/[0.02] border-white/[0.06] backdrop-blur
  - Alert badge: terracotta #d97757 for material changes
  - Muted text: text-[11px] uppercase tracking-[0.2em] for labels
  - Entity cards: hover glow, click → entity detail view
```

#### 7.2 Comparison View (for `delta.diligence` comparison)
```
Location: Entity view → "Compare" mode toggle
Components:
  - ComparisonGrid — 2-4 entity columns, same metric rows
  - ComparisonDeltaHighlight — green/red for better/worse
  - ComparisonPacketExport — generate shareable comparison URL

Design DNA:
  - Grid: fixed left column (metrics), scrollable entity columns
  - Delta highlighting: terracotta for "your entity", muted for others
  - Export button: glass pill in top-right
```

#### 7.3 Self-Diligence Dashboard (for `delta.market`)
```
Location: System / Oracle → new "Market Coverage" tab
Components:
  - MarketCoverageScorecard — 5-layer scores (0-100 each)
  - GapRegistryTable — all gaps with status, priority, effort
  - TrendRadar — 6-12 month trend exposure visualization
  - CompetitiveDeltaGrid — competitor comparison (what they're better at)
  - BlindSpotTimeline — weekly blind spot detection history
  - GapClosureChart — trend line of gaps closed over time

Design DNA:
  - Scorecard: 5 glass cards in a row, each with layer name + score + trend arrow
  - Gap table: sortable by priority, filterable by status
  - Trend radar: radar chart with NodeBench position on each axis
```

#### 7.4 Share Modal (for all packets)
```
Location: Every packet view → "Share" button in top-right
Components:
  - ShareModal — copy URL, choose visibility (public/team/private)
  - SharePreview — OG card preview (title, summary, cover image)
  - ShareQRCode — QR code for mobile sharing

Design DNA:
  - Modal: glass overlay with backdrop-blur-xl
  - URL input: monospace, one-click copy
  - QR: centered, terracotta accent
```

#### 7.5 Hackathon Mode Banner
```
Location: Top of every surface when `--preset=hackathon` is active
Components:
  - HackathonBanner — team name, member count, time remaining, QA score from retention.sh
  - HackathonQuickActions — [Run Diligence] [Create Memo] [Share Packet] [QA Status]

Design DNA:
  - Banner: bg-terracotta/10 border-terracotta/20
  - Timer: countdown to demo deadline
  - QA score: green/amber/red from retention.sh sync
```

---

## 8. Backend Layer Mapping: Every Route, Every Gap

### Current Routes → Delta Integration

| Route | Method | Current Purpose | Delta Integration | Gap |
|-------|--------|----------------|-------------------|-----|
| `/search` (search.ts) | POST | Entity intelligence search | Produces `delta.diligence` packets | G1: Live data pipeline |
| `/voice/session` (session.ts) | POST | Voice WebRTC sessions | Voice → delta commands | G11: Voice-first commands |
| `/tts` (tts.ts) | POST | Text-to-speech | Read delta.brief aloud | — |
| `/shared-context/*` (sharedContext.ts) | Various | Team coordination | retention.sh peer registration | G5: Peer sync |
| `/tool-graph/*` (toolGraph.ts) | GET | Tool metadata | — | — |
| `/mcp` (WebSocket) | WS | MCP gateway (304 tools) | All delta commands as MCP tools | G4: Hackathon preset |
| `/bridge` (WebSocket) | WS | Agent command dispatch | delta.handoff execution | — |
| `/sync-bridge` (WebSocket) | WS | Cross-device sync | delta.retain persistence | — |
| `/bus` (WebSocket) | WS | Ambient intelligence | delta.watchlist alerts | G6: Push notifications |

### New Backend Endpoints Needed

#### 8.1 Watchlist API
```typescript
// server/routes/watchlist.ts
POST   /watchlist/add          { entityName, alertPreferences }
DELETE /watchlist/remove/:id
GET    /watchlist/list          → WatchlistEntity[]
POST   /watchlist/refresh       → trigger background refresh of all watched entities
GET    /watchlist/alerts         → recent changes across all watched entities
POST   /watchlist/check/:id     → check single entity for changes now

// Alert preferences:
{
  entityName: string;
  alertOn: ("pricing_change" | "funding" | "leadership" | "product_launch" | "legal" | "any_material")[];
  frequency: "realtime" | "daily" | "weekly";
  channel: "in_app" | "webhook" | "email";
}
```

#### 8.2 Share API
```typescript
// server/routes/share.ts
POST   /share/create           { packetType, packetId, visibility } → { shareUrl, shareId }
GET    /share/:shareId          → public render of packet (no auth required)
DELETE /share/:shareId          → revoke share link
GET    /share/:shareId/og       → OG meta tags for link previews
```

#### 8.3 Market Scan API
```typescript
// server/routes/marketScan.ts
POST   /market/scan            { layers: Layer[], depth: "quick" | "deep" } → MarketCoveragePacket
GET    /market/history          → last 12 weekly scans
GET    /market/gaps             → current gap registry
GET    /market/trend/:gap_id    → gap closure trend over time
```

#### 8.4 Retention.sh Integration API
```typescript
// server/routes/retentionBridge.ts
POST   /retention/register     { teamCode, peerId } → { sessionId }
POST   /retention/sync         { qaFindings[], tokensSaved, teamMembers } → ack
GET    /retention/status        → { connected, teamCode, lastSync, qaScore }
POST   /retention/webhook       → receive retention.sh events (crawl complete, QA pass/fail)
```

### New MCP Tools Needed

| Tool | Preset | Purpose | Input | Output |
|------|--------|---------|-------|--------|
| `delta_brief` | founder, hackathon | What changed since last session | `{ since?: ISO, persona?: string }` | `delta.brief` packet |
| `delta_diligence` | founder, hackathon | Deep entity teardown | `{ entity: string, depth?: "quick" \| "deep" }` | `delta.diligence` packet |
| `delta_handoff` | founder, hackathon | Generate delegation packet | `{ task: string, to?: string, context?: string }` | `delta.handoff` packet |
| `delta_watch` | founder, hackathon | Add/manage watchlist | `{ action: "add" \| "remove" \| "list", entity?: string }` | `delta.watchlist` update |
| `delta_memo` | founder, hackathon | Create decision memo | `{ decision: string, evidence?: string[] }` | `delta.memo` packet |
| `delta_scan` | founder, hackathon | Self-diligence market scan | `{ layers?: number[], depth?: string }` | `delta.market` packet |
| `delta_compare` | founder, hackathon | Side-by-side entity comparison | `{ entities: string[], metrics?: string[] }` | `delta.diligence` comparison |
| `delta_retain` | founder, hackathon | Preserve context for future | `{ content: string, type?: string, ttl?: number }` | `delta.retain` packet |
| `retention_status` | hackathon | Get retention.sh QA status | `{ teamCode?: string }` | QA score, last crawl, findings |
| `retention_sync` | hackathon | Sync retention.sh findings | `{ findings: QAFinding[] }` | Shared context packets |

### Hackathon Preset Definition
```typescript
// packages/mcp-local/src/tools/toolsetRegistry.ts
hackathon: [
  // From founder preset
  "deep_sim",           // Decision memos
  "founder",            // Company tracking
  "learning",           // Session memory
  "local_dashboard",    // Local observability
  "autonomous_delivery",// Agent dispatch
  "sync_bridge",        // Cross-device sync
  "shared_context",     // Team coordination

  // Delta-specific tools
  "delta",              // All delta.* packet tools

  // retention.sh bridge
  "retention",          // retention.sh integration

  // Web intelligence
  "web",                // web_search, web_fetch
  "entity_enrichment",  // Entity extraction

  // Total: ~55 tools (within MCP limits)
],
```

---

## 9. Packet Schema

### Base Packet (All Types)

```typescript
interface DeltaPacket {
  // Identity
  id: string;                    // UUID v4
  type: PacketType;              // "brief" | "diligence" | "handoff" | "watchlist" | "memo" | "postmortem" | "retain" | "market"
  version: string;               // "1.0.0"

  // Metadata
  createdAt: string;             // ISO 8601
  createdBy: string;             // peerId
  persona: string;               // "founder" | "banker" | "ceo" | "researcher" | "student" | "operator"

  // Content
  subject: string;               // Primary entity or topic
  summary: string;               // One-paragraph summary
  sections: PacketSection[];     // Structured content sections

  // Evidence
  sources: Source[];              // URLs, docs, APIs consulted
  confidence: number;            // 0-100
  groundingStatus: "grounded" | "partial" | "ungrounded";

  // Lifecycle
  freshness: "fresh" | "warming" | "stale";
  expiresAt: string;             // ISO 8601
  supersedes?: string;           // Previous packet ID

  // Sharing
  shareUrl?: string;             // Public URL if shared
  visibility: "private" | "team" | "public";

  // Lineage
  parentPacketId?: string;       // What packet spawned this
  childPacketIds?: string[];     // What packets this spawned
  relatedEntityIds?: string[];   // Entities referenced
}

interface PacketSection {
  title: string;
  content: string;               // Markdown
  sectionType: "signal" | "analysis" | "recommendation" | "evidence" | "comparison" | "risk" | "action";
  confidence: number;            // 0-100
  sourceIndices: number[];       // Links to sources[]
}

interface Source {
  url: string;
  title: string;
  snippet: string;
  retrievedAt: string;
  reliability: "high" | "medium" | "low";
}
```

### Type-Specific Extensions

```typescript
// delta.brief — What changed
interface BriefPacket extends DeltaPacket {
  type: "brief";
  since: string;                 // ISO 8601 — changes since when
  changes: Change[];
  priorityActions: Action[];
}

interface Change {
  entity: string;
  what: string;
  significance: "material" | "notable" | "minor";
  source: string;
}

// delta.diligence — Deep entity teardown
interface DiligencePacket extends DeltaPacket {
  type: "diligence";
  entity: string;
  signals: Signal[];
  risks: Risk[];
  opportunities: string[];
  comparisonEntities?: string[]; // For comparison mode
}

// delta.handoff — Delegation packet
interface HandoffPacket extends DeltaPacket {
  type: "handoff";
  task: string;
  delegateTo: string;            // "claude_code" | "openclaw" | "teammate"
  contextBundle: string;         // Full context for the delegate
  acceptanceCriteria: string[];
  deadline?: string;
}

// delta.watchlist — Monitoring configuration
interface WatchlistPacket extends DeltaPacket {
  type: "watchlist";
  entities: WatchedEntity[];
  alerts: Alert[];
}

interface WatchedEntity {
  name: string;
  addedAt: string;
  lastChecked: string;
  alertPreferences: string[];
  changeCount: number;
}

interface Alert {
  entityName: string;
  change: string;
  significance: "material" | "notable" | "minor";
  detectedAt: string;
  acknowledged: boolean;
}

// delta.memo — Decision artifact
interface MemoPacket extends DeltaPacket {
  type: "memo";
  decision: string;
  recommendation: string;
  variables: Variable[];
  scenarios: Scenario[];
  evidence: Evidence[];
}

// delta.market — Self-diligence scan
interface MarketPacket extends DeltaPacket {
  type: "market";
  layers: LayerResult[];
  gaps: Gap[];
  gapClosureRate: number;        // % of gaps closed since last scan
  competitiveDelta: CompetitorEntry[];
  trendExposure: TrendEntry[];
  buildRecommendations: Recommendation[];
}

interface Gap {
  id: string;
  title: string;
  priority: "P0" | "P1" | "P2";
  status: "open" | "in_progress" | "closed";
  detectedAt: string;
  closedAt?: string;
  effort: string;
  description: string;
}

interface LayerResult {
  layer: number;                 // 1-5
  name: string;
  score: number;                 // 0-100
  findings: string[];
  trend: "improving" | "stable" | "declining";
}
```

---

## 10. Eval Metrics

### Self-Diligence Metrics

| Metric | Formula | Target | Cadence |
|--------|---------|--------|---------|
| **Gap Detection Precision** | (True gaps detected) / (Total gaps flagged) | > 80% | Weekly |
| **Gap-to-Packet Rate** | (Gaps that became packets) / (Total gaps detected) | > 90% | Weekly |
| **Packet-to-Execution Rate** | (Packets that became implementations) / (Total packets) | > 70% | Monthly |
| **Blind-Spot Closure Rate** | (Gaps closed this period) / (Gaps open at start) | > 30% / month | Monthly |
| **Market Drift Lead Time** | Days between market shift and NodeBench detection | < 7 days | Quarterly |
| **Competitive Parity Score** | (NodeBench capabilities) / (Best-in-class capabilities) | > 80% | Monthly |
| **Self-Diligence Coverage** | (Angles checked) / (Total angle framework) | 100% | Every scan |

### Product Health Metrics (Tracked by Self-Diligence)

| Metric | Current | Target | How to Measure |
|--------|---------|--------|---------------|
| **Time to Value** | ~15s (demo data) | < 5s (live data) | Timer from page load to first useful result |
| **Zero-Friction Entry** | 5/10 (needs setup) | 8/10 (instant value) | Can guest see real output without signup? |
| **Output Quality** | 3/10 (demo data) | 8/10 (live intelligence) | Eval harness Gemini judge scores |
| **Feedback Loop Speed** | ~5s (demo) | < 3s (live) | Time from query to first streaming token |
| **Shareability** | 3/10 (no share) | 8/10 (one-click share) | Share button exists on all packets? |
| **Return Hook** | 4/10 (no fresh data) | 8/10 (daily brief + watchlist) | Users return within 7 days? |
| **"Show Someone" Factor** | 5/10 (impressive arch) | 9/10 (wow experience) | Would user screenshot and share? |

### Hackathon-Specific Metrics

| Metric | Definition | Target |
|--------|-----------|--------|
| **Team Setup Time** | Time from "start" to both tools running | < 2 minutes |
| **First Useful Result** | Time from setup to first entity intelligence packet | < 30 seconds |
| **Demo Artifact Quality** | Judge score on generated decision memo | > 8/10 |
| **QA Score** | retention.sh quality score at demo time | > 90/100 |
| **Packet Count** | Number of delta packets generated during hackathon | > 10 |
| **Share Count** | Number of packets shared externally | > 3 |

---

## 11. Cadence & Recurring Prompts

### Automated Schedule

| Cadence | What Runs | Output | Where Results Go |
|---------|----------|--------|-----------------|
| **Every commit** | retention.sh QA crawl | QA score, regressions | Team dashboard + NodeBench shared context |
| **Daily (9am)** | `delta.brief` | What changed in 24h | Research Hub → daily brief tab |
| **Daily (9am)** | Watchlist refresh | Entity change alerts | In-app notifications |
| **Weekly (Monday 9am)** | `delta.market` (5-layer scan) | Market coverage packet | System → Market Coverage tab |
| **Weekly (Monday 9am)** | Eval harness run | Search quality scores | System → Eval tab |
| **Monthly (1st)** | `delta.market.monthly` | Strategic review | Exported as shareable memo |
| **Quarterly (1st)** | `delta.market.quarterly` | Category review | Board-ready artifact |

### MCP Tool Integration for Scheduled Runs

```typescript
// packages/mcp-local/src/tools/deltaTools.ts

// Tool: delta_scheduled_brief
// Runs daily, produces delta.brief packet
{
  name: "delta_scheduled_brief",
  description: "Generate daily what-changed brief for the team",
  inputSchema: {
    type: "object",
    properties: {
      since: { type: "string", description: "ISO timestamp, defaults to 24h ago" },
      persona: { type: "string", enum: ["founder", "banker", "ceo", "researcher"] },
      includeWatchlist: { type: "boolean", default: true },
    },
  },
  handler: async (args) => {
    // 1. Pull git changes from last 24h
    // 2. Pull watchlist entity changes
    // 3. Pull market signals
    // 4. Generate delta.brief packet
    // 5. Store in shared context
    // 6. Return summary
  },
}
```

---

## 12. One-Liner Install

### For Hackathon Teams

```bash
# The Slack message to share:
# ---
# 🧠 Set up intelligence + QA for our team
#
# Step 1: QA Memory (retention.sh)
# RETENTION_TEAM=<CODE> curl -sL retention.sh/install.sh | bash
#
# Step 2: Entity Intelligence (NodeBench Delta)
# claude mcp add nodebench -- npx -y nodebench-mcp --preset=hackathon
#
# Restart Claude Code. That's it.
#
# QA Dashboard: https://retention.sh/memory/team?team=<CODE>
# Intel Dashboard: https://nodebenchai.com/?surface=ask
# ---
```

### Install Verification

After install, the agent should be able to:

```
# Verify retention.sh
→ retention.sh crawl <your-app-url>
→ Expected: QA score + screenshot + findings

# Verify NodeBench Delta
→ delta_diligence { entity: "Anthropic" }
→ Expected: 9-card entity intelligence brief

# Verify integration
→ retention_status
→ Expected: { connected: true, teamCode: "...", qaScore: 95 }
```

---

## 13. Hackathon Playbook

### Hour-by-Hour Guide

#### Hour 0-1: Setup + Market Intelligence
```
1. Install retention.sh + NodeBench Delta (2 min)
2. Run: delta_diligence { entity: "<your-competitor>" } (30 sec)
3. Run: delta_diligence { entity: "<adjacent-product>" } (30 sec)
4. Run: delta_compare { entities: ["competitor1", "competitor2", "your-idea"] } (1 min)
5. Run: delta_memo { decision: "Should we build X or Y?" } (2 min)
6. Share the memo with your team
7. Start building with clear conviction
```

#### Hour 1-20: Build + Verify
```
Every deploy:
  - retention.sh auto-crawls, reports QA score
  - Fix any regressions before moving on

Every 2 hours:
  - Run: delta_brief (what changed in the product + market)
  - Run: delta_handoff { task: "Research [topic]", to: "claude_code" }

When stuck on a decision:
  - Run: delta_memo { decision: "..." }
  - Share with teammates for async review
```

#### Hour 20-22: Demo Prep
```
1. Run: delta_memo { decision: "Why this product wins" } → shareable artifact
2. Run: retention_status → QA score for demo slides
3. Run: delta_diligence { entity: "<your-product>" } → self-analysis
4. Run: delta_compare { entities: ["us", "competitor1", "competitor2"] } → competitive positioning
5. Export all packets → demo deck appendix
```

#### Hour 22+: Post-Hackathon (Why Teams Stay)
```
Day 1: delta_watch { action: "add", entity: "<competitor>" }
Day 2: delta_brief → "Your competitor shipped a new feature"
Week 1: delta_market → "Here's what changed in your category"
Week 2: delta_handoff { task: "Build landing page", to: "claude_code" }
Month 1: delta_review → "Your Q1 forecast vs reality"
```

### The Retention Hook

**Why teams keep using NodeBench Delta after the hackathon:**

1. **Watchlist alerts** — "Your competitor raised $5M" pushed to you, not pulled
2. **Session memory** — Every conversation builds on the last, no re-explaining
3. **Daily brief** — Fresh intelligence every morning, reason to open the app
4. **Decision trail** — History of memos, forecasts, reviews — your company's memory
5. **Team context** — New teammates get instant context via shared packets

---

## 14. Competitive Grid

### Full Landscape (March 2026)

| Capability | NodeBench Delta | retention.sh | Supermemory | Perplexity | PitchBook | ChatGPT | Linear | OpenClaw |
|-----------|----------------|-------------|-------------|------------|-----------|---------|--------|----------|
| **MCP native** | 304 tools | 45 tools | MCP memory | No | No | No | No | Self-modifying |
| **Entity intel** | Deep (6 lenses) | No | No | General | Deep (finance) | General | No | No |
| **QA/testing** | Eval harness | Full pipeline | No | No | No | No | No | No |
| **Team memory** | Shared context | Team dashboard | Universal | No | Shared seats | Shared chats | Shared workspace | Discord bot |
| **Decision memos** | Full workbench | No | No | No | Yes (reports) | No | No | No |
| **Change detection** | Session delta | Regression detection | No | No | Alerts (paid) | No | No | Heartbeat |
| **Watchlist** | Planned (G6) | No | No | No | Yes | No | No | No |
| **Shareable artifacts** | Planned (G2) | Screenshots | No | Answer pages | Reports | Share conversations | Issues | No |
| **Voice-first** | Browser + server | No | No | No | No | Mobile app | No | No |
| **Self-diligence** | This spec | Self-crawl | No | No | No | No | No | Self-modifying |
| **Hackathon-ready** | Planned (G4) | YES | No | No | No | No | No | No |

### Combined Value Proposition

```
retention.sh = QA + Memory + Regression Prevention
NodeBench Delta = Intelligence + Decisions + Agent Orchestration

Together = Build Fast + Build Right + Keep Winning
```

---

## 15. Implementation Priorities

### Phase 1: Hackathon-Ready (Before Tomorrow)

| Task | Files | Effort | Impact |
|------|-------|--------|--------|
| Create `hackathon` preset in toolsetRegistry.ts | `packages/mcp-local/src/tools/toolsetRegistry.ts` | 30 min | Enables hackathon install |
| Add delta CLI aliases to existing CLI subcommands | `packages/mcp-local/src/index.ts` | 1 hour | `npx nodebench-mcp brief/diligence/watch` |
| Wire retention.sh status check as MCP tool | `packages/mcp-local/src/tools/retentionTools.ts` (new) | 1 hour | Cross-tool integration |
| Update landing page with hackathon CTA | `src/features/controlPlane/views/ControlPlaneLanding.tsx` | 30 min | Visible entry point |

### Phase 2: Live Intelligence (Week 1)

| Task | Files | Effort | Impact |
|------|-------|--------|--------|
| Wire live web search → Gemini extraction in search route | `server/routes/search.ts` | 2 days | G1: Real data, not demo |
| Build share API + shareable packet renderer | `server/routes/share.ts` (new) | 1 day | G2: Output IS distribution |
| Add "Create Memo" CTA on search results | `src/features/controlPlane/components/SearchResultCard.tsx` | 4 hours | G3: One-click memo |
| Retention.sh peer registration in shared context | `server/routes/retentionBridge.ts` (new) | 1 day | G5: Cross-tool sync |

### Phase 3: Retention Hooks (Week 2-3)

| Task | Files | Effort | Impact |
|------|-------|--------|--------|
| Watchlist API + UI | `server/routes/watchlist.ts` + UI components | 3 days | G6: Keep warm |
| Own-entity intelligence mode | Company search + private context overlay | 3 days | G7: Highest-value surface |
| Side-by-side comparison view | Entity view + comparison components | 2 days | G8: Banker requirement |
| Daily brief with live data | Research Hub + signal feed integration | 3 days | G9: Return hook |

### Phase 4: Self-Diligence System (Week 4)

| Task | Files | Effort | Impact |
|------|-------|--------|--------|
| Market scan API + MCP tool | `server/routes/marketScan.ts` + delta tools | 2 days | Self-diligence engine |
| Market Coverage dashboard tab in Oracle | `src/features/oracle/` + new components | 2 days | Visibility into gaps |
| Scheduled scan via cron/Convex | `convex/crons.ts` or scheduled task | 1 day | Automated cadence |
| Gap closure tracking + trend visualization | SQLite storage + chart components | 2 days | Before/after proof |

---

## Appendix A: Angle Framework Checklist

Every important run, every packet, every self-diligence scan must check these angles:

| # | Angle | Question | Default Check |
|---|-------|----------|---------------|
| A1 | **Business** | What does this mean commercially? | Revenue impact, market size, customer demand |
| A2 | **Product** | What feature/workflow/UX implication exists? | User journey friction, missing capability |
| A3 | **Technical** | What system/implementation implication exists? | Architecture fit, performance, security |
| A4 | **Competitive** | What changed outside us? | Competitor moves, market shifts, category evolution |
| A5 | **Operational** | What has to happen next, by whom? | Next action, owner, deadline, dependencies |
| A6 | **Risk/Legal/Governance** | What needs caution, approval, or auditability? | Compliance, data privacy, IP, liability |
| A7 | **Artifact/Communication** | What needs to be shown upward or handed off? | Memo, deck, packet, report, delegation |
| A8 | **User/Persona** | Who specifically benefits or is affected? | Persona mapping, job coverage, satisfaction |
| A9 | **Temporal** | What changes over time? What's the 30/60/90 day view? | Trend, forecast, decay, freshness |
| A10 | **Distribution** | How does this spread? How do people discover it? | Virality, shareability, channel fit |

---

## Appendix B: retention.sh Integration Protocol

### Peer Registration Handshake

```typescript
// When retention.sh starts alongside NodeBench:
// 1. retention.sh calls NodeBench shared context API
POST /shared-context/peers/register
{
  peerId: "peer:monitor:retention",
  product: "retention.sh",
  surface: "qa_pipeline",
  role: "monitor",
  capabilities: ["can-crawl", "can-screenshot", "can-score", "can-archive"],
  metadata: {
    teamCode: "C47DRF",
    version: "0.4.0",
    qaScore: 100,
    memberCount: 3,
    tokensSaved: 165700,
  }
}

// 2. NodeBench registers as peer in retention.sh (if API exists)
// Or: retention.sh simply publishes QA findings as shared context packets

// 3. Bidirectional sync:
// retention.sh → NodeBench: QA findings, crawl results, regression alerts
// NodeBench → retention.sh: Entity context, decision packets, market signals
```

### Shared Packet Types

```typescript
// retention.sh publishes:
{
  contextType: "qa_finding",
  subject: "Regression detected on /pricing page",
  summary: "CTA button invisible on mobile viewport (375px)",
  confidence: 95,
  metadata: {
    qaScore: 92, // dropped from 100
    affectedPages: ["/pricing"],
    severity: "P1",
    screenshot: "https://retention.sh/screenshots/...",
  }
}

// NodeBench publishes:
{
  contextType: "entity_intelligence",
  subject: "Competitor shipped new feature",
  summary: "Anthropic released Claude 4.6 with 1M context",
  confidence: 90,
  metadata: {
    entity: "Anthropic",
    changeType: "product_launch",
    significance: "material",
    sources: ["https://anthropic.com/..."],
  }
}
```

---

## Appendix C: Usability Score Targets

### Current → Target (90-Day Roadmap)

| Dimension | Current | Phase 1 (Hackathon) | Phase 2 (Week 1) | Phase 3 (Week 2-3) | Phase 4 (Week 4) | Target |
|-----------|---------|--------------------|--------------------|---------------------|-------------------|--------|
| Time to Value | 4 | 5 (preset works) | 7 (live data) | 8 (instant results) | 8 | 8 |
| Zero-Friction Entry | 5 | 6 (one-liner install) | 7 (guest sees real output) | 8 (no signup needed) | 8 | 8 |
| Input Obviousness | 7 | 7 | 8 (clear CTAs) | 9 (delta command hints) | 9 | 9 |
| Output Quality | 3 | 4 (better demo data) | 7 (live intelligence) | 8 (role-shaped output) | 8 | 8 |
| Feedback Loop Speed | 5 | 5 | 7 (streaming responses) | 8 (< 3s to first token) | 8 | 8 |
| Mobile Usability | 6 | 6 | 6 | 7 (responsive agent panel) | 8 | 8 |
| Voice/Hands-Free | 4 | 4 | 5 (voice → delta commands) | 7 (full voice-first) | 7 | 7 |
| Shareability | 3 | 3 | 7 (share URLs for all packets) | 8 (OG previews) | 8 | 8 |
| Return Hook | 4 | 5 (hackathon timer) | 6 (watchlist alerts) | 8 (daily brief + alerts) | 8 | 8 |
| "Show Someone" | 5 | 6 (hackathon wow) | 7 (live intelligence demo) | 8 (shareable artifacts) | 9 | 9 |
| **TOTAL** | **46/100 (D)** | **51/100 (C)** | **67/100 (B)** | **79/100 (A)** | **81/100 (A)** | **80+** |

---

## Appendix D: The Meta-Metric

### How to Know This Spec Is Working

```
The spec is working when:
1. NodeBench Delta finds a real product blind spot          ← Gap Detection
2. That blind spot becomes a delta.market packet            ← Gap-to-Packet
3. That packet becomes a delta.handoff to an agent          ← Packet-to-Execution
4. The agent implements the fix                             ← Execution
5. The next delta.market scan shows the gap is smaller      ← Blind-Spot Closure
6. The usability score goes up                              ← Impact Measurement
7. A user screenshots and shares the output                 ← Distribution Proof

If any link in this chain breaks, the system is not self-diligent yet.
```

---

*End of spec. This document is itself a delta.market packet — it should be superseded by the first automated scan.*
