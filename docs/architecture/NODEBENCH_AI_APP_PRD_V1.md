# NodeBench AI App — Product Requirements Document v1

> **One-liner:** NodeBench is where any user types or uploads a company question and immediately receives a tailored, decision-ready intelligence workspace that stays current over time.

**Author:** Homen Shum | **Date:** 2026-03-23 | **Status:** Draft

---

## 1. Product Split

NodeBench has two canonical surfaces serving different users and workflows.

### 1A. NodeBench AI App (this PRD)
- **For:** Investors, founders, bankers, CEOs, legal/compliance, professors, students, non-technical operators
- **Primary interaction:** Type a question, paste a brief, upload docs, search an entity
- **Output:** Tailored intelligence workspace + artifact packet (memo, sheet, deck, HTML, delegation packet)
- **Feel:** PitchBook simplicity + Perplexity artifact-first + Bloomberg information density

### 1B. NodeBench Local / Power Surface (separate PRD)
- **For:** Builders, staff operators, agent-heavy users, internal dogfooding
- **Primary interaction:** Monitor, review diffs, inspect causality, delegate to agents, replay and audit
- **Feel:** Operating dashboard, continuity-heavy, tracing-heavy

**Critical rule:** The AI App never leads with the power dashboard. Search/upload canvas first. Dashboard comes after results, not before.

---

## 2. Design Reference Stack

### What to borrow

| Source | Take | Don't take |
|--------|------|------------|
| **Bloomberg Terminal** | Density of intelligence, strong watchlists, multi-panel situational awareness, fast keyboard/search-first workflows | Janky legacy UI, intimidating enterprise-first feel, too many simultaneous primitives |
| **PitchBook / Crunchbase** | Clean search-first entity profiles, simple filters, highly legible comparables, "oriented in 60 seconds" feel | Over-reliance on static profiles, gated content walls |
| **Clado (YC S25)** | Natural-language search as default interaction — "describe what you need" instead of filter soup, agentic search deploys agents to find and enrich | People-only domain, recruiting focus |
| **Perplexity Labs / Create** | Artifact-first response style (reports, spreadsheets, dashboards, mini-apps, presentations), web/mobile/desktop continuity | Generic search feel, no entity persistence |

### 5 Universal Product Principles (from competitive research)

1. **VALUE BEFORE IDENTITY** — Time-to-wow < 10 seconds. First screen must already be doing the thing. No landing page tour.
2. **MEET USERS WHERE THEY ARE** — Most familiar interaction pattern (search box), make it do something new. MCP protocol extends this to Claude Code/Cursor/Windsurf.
3. **THE OUTPUT IS THE DISTRIBUTION** — Every Decision Memo, every investigation, every forecast produces a shareable artifact. The output IS the marketing.
4. **SPEED IS A FEATURE** — Tool dispatch < 200ms to first useful token. If a response takes > 2s, it's a product bug.
5. **THE PRODUCT IMPROVES ITSELF** — Session memory, progressive discovery rankings, co-occurrence edges, skill freshness. Use a tool -> tool learns patterns -> next suggestion is better -> use more tools.

---

## 3. Landing Experience

### The Search Canvas

On a Tuesday afternoon after a meeting, conference, or senior request, the default action is:

> **Type, paste, or upload what you need to understand.**

Not: pick a mode, configure agents, choose a memory provider, browse a dashboard.

```
+----------------------------------------------------------------------+
| NODEBENCH                                                            |
| Understand any company, market, competitor, or strategic question    |
+----------------------------------------------------------------------+
| [ Search, paste a task, or upload files...                     ] [>] |
|                                                                      |
| Examples:                                                            |
|  - Analyze Shopify's AI commerce strategy and export a banker memo   |
|  - Compare 5 competitors around agent memory infrastructure          |
|  - What changed in our company direction since last week?            |
|  - Build a CEO brief from these meeting notes + deck + market links  |
|                                                                      |
| Lenses:  Founder  Investor  Banker  CEO  Legal  Student              |
| Outputs: Brief  Sheet  Deck  HTML  Delegation Packet                 |
+----------------------------------------------------------------------+
```

### Landing Page Hierarchy

1. **Search/upload canvas** — full-width, center-screen, primary CTA
2. **Example prompts** — 4-6 real scenarios that launch immediately on click
3. **Lens selector** — subtle chips below input, default auto-detected from context
4. **Output type hints** — what you'll get back (brief, sheet, deck, etc.)
5. **Live proof section** — below the fold: a real investigation result running, not a demo screenshot
6. **Trust signals** — tool count (338 MCP tools), source count, processing speed

### What the landing does NOT show
- Dashboard panels
- Agent configuration
- Memory/provider settings
- Onboarding wizards (deferred to post-first-result)
- Auth walls (guest mode delivers real results)

---

## 4. Four Canonical Modes

### 4.1 Search
**For:** "Tell me about X company" / "Compare these competitors" / "What changed in this space?"

**Output shape:**
- Entity profile (company, fund, person, market)
- Current snapshot (financial, strategic, competitive)
- Timeline of changes
- Key signals + risks
- Comparables matrix
- Exportable packet

### 4.2 Analyze
**For:** Uploaded notes, meeting transcripts, PDFs, decks, spreadsheets

**Output shape:**
- Executive synthesis
- Contradictions detected
- Recommendations with evidence
- Exportable memo / deck / sheet

### 4.3 Monitor
**For:** Saved companies, competitors, markets, initiatives

**Output shape:**
- Deltas since last check
- Alerts on material changes
- Weekly / daily digests
- Packet refreshes with diff highlighting

### 4.4 Delegate
**For:** Handing context to Claude Code, contractors, internal agents, team members

**Output shape:**
- Scoped briefing packet
- Task context with evidence trail
- Constraints and open questions
- Agent-ready structured prompt

**Mode routing:** Modes are auto-inferred from input, not manually selected. User can override via explicit mention ("monitor Stripe" vs "analyze Stripe"). The mode selector appears as subtle navigation after the first result, not before.

---

## 5. Role-Based Adaptive Shaping

### The Lens System

Same entity + different user context = different packet shape.

| Lens | Emphasis | Key Sections |
|------|----------|--------------|
| **Founder** | Competitive timing, market positioning, build-vs-buy | Competitor map, timing window, distribution quality, hiring signals |
| **Investor** | Growth signals, momentum, comparables, funding/exit timing | Unit economics, retention curves, comparable exits, deal terms context |
| **Banker** | Deal relevance, financial implications, relationship angles | Company summary, diligence questions, financial modeling inputs, contact graph |
| **CEO** | Strategic positioning, resource allocation, board narrative | Strategy comparison, quarterly trajectory, key decisions, delegation opportunities |
| **Legal** | Regulatory exposure, disputes, data handling, governance | Policy analysis, compliance signal summary, IP/patent landscape, risk matrix |
| **Student** | Simplified timeline, concept explanations, source-backed summaries | Business model explainer, compare/contrast tables, study brief, citation list |

### Inference Signals

Role is inferred from:
1. **Explicit lens selection** — user clicks a lens chip (highest priority)
2. **Query language** — "diligence" -> Investor, "regulatory exposure" -> Legal, "market entry" -> Founder
3. **Prior usage patterns** — if user consistently exports banker memos, default to Banker lens
4. **Upload content** — term sheets -> Investor, board decks -> CEO, contracts -> Legal
5. **Saved watchlists** — portfolio companies -> Investor, competitors -> Founder
6. **Session context** — questions asked earlier in session bias the lens

Default: **Founder** lens (most common NodeBench user). Auto-detection runs silently; user can always switch.

---

## 6. Entity Intelligence Engine

### Core Entity Types

| Entity | Examples | Key Data Points |
|--------|----------|-----------------|
| **Company** | Stripe, Shopify, Anthropic | Profile, financials, team, strategy, competitive position, news, signals |
| **Fund** | a16z, Sequoia, Tiger Global | Portfolio, thesis, recent deals, returns, team, strategy shifts |
| **Person** | Founders, executives, investors | Background, trajectory, relationships, public statements, role history |
| **Market** | AI Infrastructure, Agent Memory, E-commerce AI | Size, growth, key players, dynamics, timing signals, regulatory landscape |
| **Competitor Set** | "5 companies in agent memory space" | Feature matrix, positioning, funding, team, momentum comparison |
| **Initiative** | "Our Series A raise", "Product pivot to AI" | Timeline, milestones, open decisions, evidence, delegation state |

### Processing Pipeline

```
User Input
    |
    v
[1. INGEST] — Parse text, extract entities, classify intent, detect upload types
    |
    v
[2. CANONICALIZE] — Resolve entities to canonical IDs, merge duplicates, link relationships
    |
    v
[3. INFER] — Detect user role, likely intent, output preference, urgency level
    |
    v
[4. ENRICH] — Pull from knowledge graph, live sources, cached signals, watchlist deltas
    |
    v
[5. SHAPE] — Apply lens-specific template, prioritize sections, set detail level
    |
    v
[6. RENDER] — Generate intelligence workspace + artifact packet
    |
    v
[7. PERSIST] — Warm state for future sessions, watchlist updates, trajectory tracking
```

---

## 7. Result Page Architecture

### Canonical Result Page Structure

Every result page follows this 8-section layout:

```
+----------------------------------------------------------------------+
| [< Back]  Entity: Shopify Inc.         [Lens: Founder v]  [Share]    |
+----------------------------------------------------------------------+
|                                                                      |
| 1. ENTITY TRUTH                                                      |
|    One-paragraph executive summary of current state.                 |
|    Key metrics inline: revenue, growth, team size, last funding.     |
|                                                                      |
+----------------------------------------------------------------------+
|                                                                      |
| 2. WHAT CHANGED / WHY NOW                                            |
|    Material changes in the last 7/30/90 days.                        |
|    "Why this entity matters right now" framing.                      |
|                                                                      |
+----------------------------------------------------------------------+
|                                                                      |
| 3. KEY SIGNALS                                                       |
|    Ranked list of positive and negative signals.                     |
|    Each with source, recency, confidence badge.                      |
|                                                                      |
+----------------------------------------------------------------------+
|                                                                      |
| 4. RISKS / CONTRADICTIONS                                            |
|    Where evidence conflicts. Where the narrative breaks.             |
|    Falsification criteria for each risk.                             |
|                                                                      |
+----------------------------------------------------------------------+
|                                                                      |
| 5. COMPARABLES / RELATED ENTITIES                                    |
|    Feature matrix, positioning map, momentum comparison.             |
|    Links to entity profiles for each comparable.                     |
|                                                                      |
+----------------------------------------------------------------------+
|                                                                      |
| 6. RECOMMENDED NEXT QUESTIONS                                        |
|    3-5 questions the user should ask next, based on lens.            |
|    Each clickable — triggers a follow-up investigation.              |
|                                                                      |
+----------------------------------------------------------------------+
|                                                                      |
| 7. PACKET ACTIONS                                                    |
|    [Export Memo] [Generate Sheet] [Build Deck] [Share URL] [Delegate]|
|    One-click artifact generation from the intelligence workspace.    |
|                                                                      |
+----------------------------------------------------------------------+
|                                                                      |
| 8. KEEP WARM / MONITOR                                               |
|    [Add to Watchlist] [Set Alert Frequency] [Subscribe to Changes]   |
|    Turns a one-time search into persistent intelligence.             |
|                                                                      |
+----------------------------------------------------------------------+
```

### Result Page Design Principles

- **Density without overwhelm** — Use progressive disclosure. Show summaries, expand on click.
- **Evidence-backed** — Every claim has a source badge. No unattributed statements.
- **Action-oriented** — Every section ends with a next action (export, compare, monitor, delegate).
- **Shareable** — Any section can be shared independently. Each result has a permanent URL.
- **Adaptive** — Section ordering and emphasis shifts based on lens. Investor sees financials first; Founder sees competitive timing first.

---

## 8. Artifact Packet System

### Packet Types

| Type | Format | Use Case |
|------|--------|----------|
| **Brief** | Markdown / HTML | Executive summary, meeting prep, quick orientation |
| **Sheet** | CSV / XLSX | Comparables matrix, financial data, contact lists |
| **Deck** | HTML slides / PPTX | Board presentations, investor updates, team briefings |
| **HTML** | Standalone page | Shareable without auth, embeddable, printable |
| **Delegation Packet** | Structured JSON + prose | Agent handoff, contractor briefing, team task context |

### Packet Generation Rules

1. **One-click generation** — User clicks export, packet generates immediately from workspace data
2. **Lens-shaped** — Packet structure adapts to active lens
3. **Evidence-linked** — Every claim in the packet traces to a source
4. **Versioned** — Packets have timestamps; regenerating shows what changed
5. **Shareable** — Every packet gets a unique URL that works without auth (read-only)

---

## 9. Tuesday Afternoon Scenarios

### Scenario A: Banker after a client meeting

**Input:** `summarize company X, compare it to 3 peers, highlight AI strategy, risks, and export a memo`

**NodeBench returns:**
- Company profile with current financial/strategic snapshot
- Competitor matrix (3 peers auto-selected or user-specified)
- AI strategy section with evidence and timeline
- Risk panel with falsification criteria
- "What changed recently" section
- Banker memo packet (one-click export)
- Share URL for the team

### Scenario B: Founder after a conference

**Input:** Pastes meeting notes + 3 company names + 2 competitor links + one question

**NodeBench returns:**
- Synthesized opportunity view
- Overlap with current company thesis (if watchlist exists)
- Contradictions / fit analysis
- Recommended next actions
- Saved watchlist entries
- Delegation packet for follow-up agent work

### Scenario C: Student researching for a paper

**Input:** `help me understand how Shopify's AI commerce strategy evolved and compare it with Amazon and Google`

**NodeBench returns:**
- Timeline of Shopify's AI strategy evolution
- Business model summary (simplified for student lens)
- Strategy comparison table (Shopify vs Amazon vs Google)
- Cited evidence with source links
- Simplified explainer sections
- Exportable study brief

### Scenario D: CEO preparing for a board meeting

**Input:** Uploads last quarter's board deck + types `what should I update for this quarter?`

**NodeBench returns:**
- Delta analysis (what changed since last deck)
- New competitive dynamics
- Key metrics that improved/declined
- Suggested narrative updates
- Board-ready talking points
- Updated deck sections (one-click export)

### Scenario E: Legal reviewing a potential partnership

**Input:** `regulatory exposure for partnering with [Company X] in EU healthcare AI`

**NodeBench returns:**
- Regulatory landscape summary (EU AI Act, GDPR, MDR)
- Company X's compliance posture
- Recent enforcement actions in the space
- Partnership risk matrix
- Recommended diligence questions
- Legal memo packet

---

## 10. Adaptive Shaping Engine

### How the same query produces different results

**Query:** "Tell me about Anthropic"

| Lens | Section Priority | Emphasis | Default Export |
|------|-----------------|----------|----------------|
| Founder | Competitive position > Product strategy > Hiring signals | How to compete/partner | Strategy brief |
| Investor | Funding history > Growth metrics > Comparable exits | Whether to invest | Investment memo |
| Banker | Deal flow > Financial profile > Relationship map | Deal relevance | Banker memo |
| CEO | Market positioning > Strategic implications > Board narrative | Strategic decision | Board brief |
| Legal | Data practices > Regulatory filings > IP portfolio | Risk assessment | Legal memo |
| Student | Company history > Business model > Competitive landscape | Understanding | Study brief |

### Shaping Signals (Priority Order)

1. **Explicit lens** — User clicked or typed a lens preference
2. **Query intent** — NLP classification of the question type
3. **Upload content** — Document type implies role and need
4. **Session history** — Previous queries and exports in this session
5. **User profile** — Saved role, industry, prior watchlists
6. **Action history** — What kinds of exports this user typically creates
7. **Time context** — Morning (digest mode), afternoon (research mode), evening (monitoring mode)

---

## 11. Technical Architecture

```
+-------------------------------------------------------------+
|                    NODEBENCH AI APP                         |
| Landing Canvas | Result Workspace | Packet Export | Monitor |
+----------------------------+--------------------------------+
                             |
                             v
+-------------------------------------------------------------+
|           INTENT + ROLE INFERENCE LAYER                     |
| NLP classification | Lens detection | Upload parsing        |
| Query -> {entities, intent, lens, urgency, output_pref}     |
+----------------------------+--------------------------------+
                             |
                             v
+-------------------------------------------------------------+
|        ENTITY / EVIDENCE / CHANGE ENGINE                    |
| Company | Fund | Person | Competitor | Market | Initiative  |
| Knowledge graph | Live enrichment | Signal detection        |
| Change tracking | Contradiction detection                   |
+----------------------------+--------------------------------+
                             |
                             v
+-------------------------------------------------------------+
|          PACKET + ARTIFACT GENERATION LAYER                 |
| Brief | Sheet | Deck | HTML | Delegation Packet             |
| Template engine | Lens-specific shaping | Evidence linking   |
| One-click export | Shareable URLs | Version tracking         |
+----------------------------+--------------------------------+
                             |
                             v
+-------------------------------------------------------------+
|       MEMORY / TRAJECTORY / MONITORING LAYER                |
| Warm state | Watchlists | Delta detection | Alerts          |
| Session memory | Usage patterns | Lens history               |
| Packet versioning | Change subscriptions                     |
+-------------------------------------------------------------+
```

### Key Technical Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Search canvas framework | React + streaming response | Perplexity-style progressive rendering |
| Entity resolution | Convex + external APIs | Canonical entity IDs with live enrichment |
| Lens inference | Client-side NLP + server-side classification | Fast initial guess, refined server-side |
| Artifact generation | Server-side template engine | Consistent formatting, one-click exports |
| Shareable URLs | Static HTML generation with OG tags | Works without auth, social-media friendly |
| Monitoring | Convex scheduled functions | Automatic delta detection and alerting |
| MCP integration | Existing 338-tool server | Powers enrichment, analysis, and delegation |

---

## 12. Implementation Phases

### Phase 1: Search Canvas + Basic Result (2-3 weeks)
**Goal:** Replace current landing with search-first canvas. Type a company name, get a structured result.

- [ ] New landing component: `SearchCanvas.tsx` — full-width search/upload input
- [ ] Intent classification: parse query into {entities, intent, lens}
- [ ] Basic entity result page with 8-section layout
- [ ] Demo mode: pre-cached results for 5 showcase companies
- [ ] Live mode: MCP tool dispatch for real-time enrichment
- [ ] Lens selector (6 chips, default auto-detected)
- [ ] Route: `/?q=anthropic` renders result workspace

### Phase 2: Artifact Packets + Sharing (1-2 weeks)
**Goal:** Every result generates exportable, shareable artifacts.

- [ ] Brief packet template (Markdown -> HTML)
- [ ] Sheet packet template (structured data -> CSV/table)
- [ ] Shareable URL generation (static HTML with OG tags)
- [ ] One-click export buttons on result page
- [ ] Packet versioning (timestamp + diff on regeneration)

### Phase 3: Adaptive Shaping (1-2 weeks)
**Goal:** Same query, different result shape based on lens and context.

- [ ] Lens-specific section ordering and emphasis
- [ ] Query intent NLP (investor language vs founder language vs legal language)
- [ ] Upload-based lens detection (term sheet -> Investor, contract -> Legal)
- [ ] Session memory (lens preference persists within session)

### Phase 4: Monitor + Watchlists (2 weeks)
**Goal:** One-time search becomes persistent intelligence.

- [ ] "Add to Watchlist" button on result page
- [ ] Watchlist dashboard (Monitor mode)
- [ ] Delta detection (what changed since last check)
- [ ] Daily/weekly digest generation
- [ ] Alert notifications for material changes

### Phase 5: Delegation Packets (1 week)
**Goal:** Hand off context to agents, contractors, or team members.

- [ ] Delegation packet template
- [ ] Agent-ready structured prompt generation
- [ ] MCP/Claude Code integration for automated follow-up
- [ ] Contractor briefing format

---

## 13. Success Metrics

### Primary (Week 1-4)
| Metric | Target | How Measured |
|--------|--------|-------------|
| Time to first useful result | < 10 seconds | From page load to rendered result |
| Search-to-result completion | > 80% | Users who type a query and see a full result |
| Zero-auth value delivery | Yes | Guest users get real results without signing up |

### Secondary (Month 1-3)
| Metric | Target | How Measured |
|--------|--------|-------------|
| Packet export rate | > 30% of sessions | Users who export at least one artifact |
| Share rate | > 15% of packets | Packets that generate a shareable URL |
| Return rate (7-day) | > 40% | Users who return within 7 days |
| Watchlist creation | > 20% of sessions | Users who add an entity to a watchlist |

### North Star
| Metric | Target | Why |
|--------|--------|-----|
| "Would you recommend NodeBench?" (NPS) | > 50 | The output should feel like "this is already shaped the way I would have briefed someone" |

---

## 14. What Users Should Think

### On first result:
> "This is already shaped the way I would have briefed someone."

### NOT:
- "Nice search results"
- "Nice dashboard"
- "Nice AI answer"
- "Interesting but I need to do more work to make this useful"

### The difference:
NodeBench doesn't return search results. It returns **decision-ready intelligence packets** shaped for the user's role and context.

---

## 15. Competitive Positioning

```
                    High Intelligence Density
                           |
                    Bloomberg --------+
                           |         |
              PitchBook ---+         |
                     |     |         |
            Crunchbase     |    [NodeBench]
                     |     |         |
                Clado      |         |
                     |     |         |
  Simple Search -----+----+---------+---- Artifact-First
                     |     |         |
              Google       |    Perplexity Labs
                     |     |         |
                ChatGPT    |         |
                           |
                    Low Intelligence Density
```

**NodeBench's unique position:** High intelligence density (Bloomberg) + artifact-first outputs (Perplexity Labs) + simple entry (Clado/PitchBook) + adaptive shaping (no one does this yet).

---

## Appendix A: Current State Assessment

### What exists today (ControlPlaneLanding.tsx)
- Demo packet with pre-canned Series A question/answer
- Workflow presets (Investor Diligence, CEO Strategy, etc.)
- Voice input support
- Shareable memo generation
- Agent panel (FastAgentPanel)

### What needs to change
1. **Replace demo packet with live search canvas** — The hero should be an input box, not a pre-rendered answer
2. **Move workflow presets below the fold** — They become "example prompts" under the search box
3. **Add lens selector** — Role chips below the input
4. **Build result workspace** — The 8-section layout for entity intelligence
5. **Add artifact export** — One-click packet generation from workspace data
6. **Add watchlist/monitor** — Persistent intelligence from one-time searches

### What to preserve
- Glass card DNA design system
- Voice input capability
- Shareable memo infrastructure
- FastAgentPanel (becomes the "delegate" mode interface)
- MCP tool dispatch (powers the enrichment engine)

---

## Appendix B: Naming

| Internal | User-Facing | Context |
|----------|------------|---------|
| NodeBench AI App | NodeBench | The product name |
| Intelligence Workspace | (no label — it's just "the result") | The result page |
| Packet | Brief / Memo / Sheet / Deck | The exportable artifact |
| Lens | (lens name) — Founder, Investor, etc. | The role-based shaping |
| Watchlist | Watchlist | Persistent monitoring |
| Delta | "What changed" | Change detection |
| Canvas | (no label — it's just the search box) | The landing input |
