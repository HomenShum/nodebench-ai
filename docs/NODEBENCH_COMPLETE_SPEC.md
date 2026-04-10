# NodeBench Complete Specification

> **One-line:** NodeBench helps people investigate messy company, founder, market, and relationship questions quickly, then turns good research runs into reusable packets that can be revisited, delegated, refreshed, and eventually replayed more cheaply.

> **Canonical sentence:** "NodeBench is a live dossier and research workflow system for ambiguous business entities; it turns searches into portable packets, packets into reusable memory, and over time aims to turn good workflows into cheaper repeatable execution."

---

## Table of Contents

- [Part 1: Product Specification](#part-1-product-specification)
- [Part 2: Landing Page & Evidence Board](#part-2-landing-page--evidence-board)
- [Part 3: Benchmark & Evaluation](#part-3-benchmark--evaluation)
- [Part 4: Codebase Architecture](#part-4-codebase-architecture)
- [Part 5: System Flows](#part-5-system-flows)
- [Part 6: Developer Navigation](#part-6-developer-navigation)

---

# Part 1: Product Specification

## What NodeBench Is

### For Users

NodeBench should feel like:

- **Search + Memory + Notes + CRM Prep + Delegation**
- One place to understand an entity fast
- One place to revisit and extend prior research
- One place to turn a vague question into a usable packet

### For the System

NodeBench should be:

- A typed research runtime
- A packet system
- A shared-context memory and handoff spine
- An evaluation/improvement loop
- A future replay and cost-compression layer

---

## Product Hierarchy

```
NodeBench
├── Ask / Control Plane      # Main user-facing runtime
├── Homes Hub                # Saved dossier shelf for packets, notes, revisits, refresh
├── Shared Context           # Memory and handoff protocol
├── Oracle / Flywheel        # Builder-facing evaluation layer
└── Retention / Attrition    # Future workflow capture, replay, cost-compression
```

---

## Tab-by-Tab Product Spec

### Tab 1: Ask

**What the user sees:**

A simple input box and quick prompts:
- Search a company
- Search a founder
- Compare two companies
- Summarize meeting notes
- Add a follow-up question
- Switch role lens: banker / founder / VC / buyer

**What the page should do:**

1. Accept messy input
2. Resolve entities
3. Run the typed pipeline:
   - Classify
   - Search
   - Analyze
   - Package
4. Produce a packet
5. Show the packet in a structured way, not as a transcript

**Core packet sections on the page:**

- Founder Truth
- Why This Holds / Breaks
- Next Move
- Ready Packet

**MVP requirements:**

- Fast first answer
- Visible sources/citations
- Editable follow-up query
- Role lens switcher
- Save to Homes Hub
- Publish to shared context
- Delegate to downstream worker

**Success metric:** User can go from vague question to useful packet in under 2-5 minutes.

---

### Tab 2: Homes Hub

**What the user sees:**

A shelf of saved packets and dossiers:
- Recent searches
- Pinned dossiers
- Drafts
- Conference/event captures
- Meeting follow-ups
- CRM-ready packets

**What the page should do:**

1. Reopen old packets instantly
2. Show timeline and last refresh time
3. Let user add one more search or one more note
4. Recompile the packet instead of starting from zero
5. Support anonymous/session-based revisit if browser cache exists
6. Support signed-in durable version through shared context / Convex path

**Required subviews:**

- All Homes
- Recent
- Pinned
- Event Notes
- Delegated
- Needs Refresh

**Future Retention / Attrition role:**

- **Retention** preserves useful packet structure and query expansions
- **Attrition** trims replay path and delta refresh cost
- **Meta layer** scores which saved homes are strong enough to become templates

**Success metric:** User can reopen a prior research object and extend it in under 30 seconds.

---

### Tab 3: Packet View

**What the user sees:**

A full-page dossier for one packet.

**Required sections:**

- Summary
- Founder Truth
- Why This Holds / Breaks
- Risks / contradictions
- Key people
- Product / market view
- Next Move
- Ready Packet
- Notes / annotations
- Delegation history
- Refresh history

**What the page should do:**

1. Render the answer as a portable object
2. Preserve evidence structure
3. Show what changed since last refresh
4. Allow export
5. Allow publish
6. Allow delegate
7. Allow user annotations

**Critical UX rule:** Packet first, transcript second. The user should never have to dig through a long chat log to find the actual answer.

---

### Tab 4: Compare

**What the user sees:**

Two or more entities side by side.

**Primary use cases:**

- Company vs competitor
- Founder vs founder
- Prospect vs prospect
- Target acquisition A vs B
- Portfolio company vs new lead

**Core fields:**

- What each entity is
- Who matters
- What changed
- Strengths
- Risks
- Fit for banker / VC / acquirer / founder
- Recommended next action

**Why this matters:** This is one of the clearest monetizable workflows for bankers, VCs, PE searchers, and acquirers.

---

### Tab 5: Event / Conference Capture

**What the user sees:**

A fast mobile mode:
- Voice note
- Quick text note
- Add company/founder
- Add event tag
- Generate packet
- CRM summary draft

**What the page should do:**

1. Capture fragmented live information fast
2. Link people to companies and notes
3. Generate a useful packet later
4. Produce CRM-ready fields:
   - Who
   - Company
   - Context
   - Why relevant
   - Next action
   - Confidence
   - Follow-up date

**Why this matters:** This is one of the strongest real wedges from the banking workflow background.

---

### Tab 6: Delegation

**What the user sees:**

A clean handoff page:
- Send packet to Claude Code
- Send packet to OpenClaw
- Send packet to internal worker
- View execution result
- See lineage back to original packet

**What the page should do:**

1. Preserve packet identity
2. Preserve task scope
3. Preserve target
4. Preserve execution result
5. Preserve human-readable lineage

**Rule:** Delegation is an execution lane, not the main product.

---

### Tab 7: Oracle / Review

**What the builder sees:**

An operator view, not a consumer view.

**Required sections:**

- Recent runs
- Scorecards
- Trajectory traces
- Packet quality
- Evidence gaps
- Failure modes
- Cost / latency
- Benchmark comparisons
- Candidate workflow assets
- Promote / reject decisions

**Rule:** Keep this builder-facing. Do not merge it into the main user story.

---

### Tab 8: Benchmarks

**What the page should show:**

A 4-way comparison matrix:
- Cheap model baseline
- Frontier model baseline
- Frontier model + NodeBench
- Cheap model + distilled NodeBench workflow

**Metrics:**

- Answer quality
- Evidence completeness
- Contradictions caught
- Structure quality
- Next-step usefulness
- Token cost
- Latency
- Gap closed vs frontier path

---

### Tab 9: Workflow Assets

**What the builder sees:**

A registry of reusable workflow candidates.

**Asset fields:**

- asset_id
- name
- source packet ids
- source episode ids
- task type
- role lens
- entity class
- steps
- required tools
- input schema
- output schema
- benchmark scores
- replay policy
- promotion status
- last reviewed

**Rule:** This becomes the canonical workflow-asset backbone.

---

### Tab 10: Settings / Identity / Trust

**What the user sees:**

- Account/session state
- Cache/session memory
- Shared context settings
- Privacy
- Delegation permissions
- Export controls

---

## Data Model Spec

### Core Object 1: Packet

A packet is the main research object.

**Fields:**
- packet_id
- query
- normalized_entities[]
- answer
- founder_truth
- why_holds_breaks
- next_move
- ready_packet
- evidence[]
- citations[]
- contradictions[]
- notes[]
- role_lens
- created_at
- updated_at
- source_run_id
- status

---

### Core Object 2: Home

A Home is the persistent dossier container.

**Fields:**
- home_id
- title
- primary_entity
- linked_packets[]
- tags[]
- pinned
- owner/session_id
- refresh_status
- last_viewed_at

---

### Core Object 3: Workflow Asset

This is the reusable investigation pattern.

**Fields:**
- workflow_asset_id
- source_packet_ids[]
- source_episode_ids[]
- task_type
- entity_type
- input_schema
- output_schema
- canonical_steps[]
- tool_requirements[]
- evaluation_scores
- replay_prompt_or_policy
- promotion_status

---

### Core Object 4: Delegation Task

**Fields:**
- task_id
- source_packet_id
- target
- scope
- instruction
- execution_status
- result_packet_id
- receipts[]
- started_at
- completed_at

---

### Core Object 5: Episode

A temporal lineage object for one longer run or work session.

**Fields:**
- episode_id
- home_id
- spans[]
- packets[]
- delegated_tasks[]
- outcome
- review_score

---

### Core Object 6: Review Record

**Fields:**
- review_id
- source_run_id
- packet_id
- evaluator
- quality_score
- evidence_score
- usefulness_score
- efficiency_score
- promotion_decision
- comments

---

## API Spec

### Ask / Runtime
- `POST /api/pipeline/search`
- `GET /api/pipeline/health`

### Homes Hub
- `GET /api/homes`
- `POST /api/homes`
- `GET /api/homes/:homeId`
- `POST /api/homes/:homeId/refresh`
- `POST /api/homes/:homeId/note`
- `POST /api/homes/:homeId/pin`

### Packets
- `GET /api/packets/:packetId`
- `POST /api/packets/:packetId/export`
- `POST /api/packets/:packetId/publish`
- `POST /api/packets/:packetId/compare`

### Shared Context
- snapshot
- publish
- delegate
- episodes
- events

### Delegation
- `POST /api/delegate`
- `GET /api/tasks/:taskId`
- `GET /api/tasks/:taskId/result`

### Workflow Assets
- `GET /api/workflow-assets`
- `POST /api/workflow-assets/promote`
- `POST /api/workflow-assets/replay`
- `POST /api/workflow-assets/reject`

### Benchmarks
- `POST /api/benchmarks/run`
- `GET /api/benchmarks/results`
- `GET /api/benchmarks/gap-closure`

---

## Phased Build Plan

### Phase 1: Flagship User Loop

**Goal:** Make Ask + Packet + Homes Hub excellent.

**Build:**
- Ask home
- Packet detail
- Homes Hub
- Session persistence
- Refresh packet
- Role lens basics

### Phase 2: Actionability

**Goal:** Make research portable and useful.

**Build:**
- Publish
- Delegate
- Export
- Compare
- Conference capture

### Phase 3: Builder Loop

**Goal:** Make evaluation visible.

**Build:**
- Oracle review page
- Benchmark tab
- Run scorecards
- Packet quality rubric

### Phase 4: Workflow Asset Backbone

**Goal:** Unify packet, episode, template, replay.

**Build:**
- Canonical workflow asset schema
- Lineage graph
- Asset promote/reject flow

### Phase 5: Replay and Cost Routing

**Goal:** Make Retention / Attrition real.

**Build:**
- Replay policy
- Cheap-path routing
- Delta refresh strategy
- Frontier escalation rules

---

## What Retention and Attrition Actually Do

### Retention

Keeps good research structure:
- Successful query expansions
- Useful packet layouts
- High-signal evidence bundles
- Role-specific follow-up patterns

### Attrition

Removes waste and compresses execution:
- Skip redundant searches
- Replay useful structure
- Refresh only changed parts
- Reduce token cost and latency

### Meta Layer / Oracle / Flywheel

Decides:
- What was good
- What should be kept
- What should become a workflow asset
- What should be ignored

---

## Explanation Scripts

### For Interviewers

"NodeBench is a packet-first research system for ambiguous company and founder questions. A user query goes through a typed pipeline, becomes a structured packet, can be published or delegated through shared context, and is reviewed through a builder-facing evaluation layer. The longer-term system goal is to unify packets, episodes, templates, and replay into a canonical workflow asset so repeated research can become cheaper and more consistent over time."

### For New Onboard Engineers

"The mental model is simple. Ask is the user runtime. Packets are the core product object. Shared context is the memory and delegation spine. Oracle/Flywheel review the system. Retention and Attrition are the future replay and cost-compression substrate. The architectural priority is to consolidate these into one workflow-asset backbone instead of adding more isolated systems."

### For Investors

"NodeBench solves a real workflow problem: people dealing with companies, founders, markets, and relationship-driven work need fast, deep, portable research, not another generic chatbot. The product turns messy questions into structured packets, stores them as live dossiers, supports revisits and delegation, and has a path to improving unit economics by turning successful frontier-model research runs into reusable cheaper replay paths over time."

---

## What Not to Say

Do not say:
- NodeBench is fully autonomous
- Retention / Attrition are fully shipped
- Workflow learning is automatic end to end
- Oracle is the main user product
- Claude Code / OpenClaw are the product

Do say:
- NodeBench already has a working packetized runtime
- It already has real handoff/delegation and evaluation surfaces
- Replay/distillation exist in pieces
- The next task is unification and routing

---

# Part 2: Landing Page & Evidence Board

## Product Framing

**NodeBench helps users turn raw evidence into a live research packet.**

That raw evidence can start from:
- A typed question
- Screenshots
- A bundle of screenshots
- Audio
- Video
- Links
- Notes
- PDFs or docs (later)

---

## Landing Page Layout

### Top Section

**NodeBench logo and one-line pitch:**

```
Drop screenshots, notes, links, or media. NodeBench turns them into a live research packet you can inspect, revisit, and build on.
```

**Centered:**
- Ask bar: "Search a company, founder, sector, or thesis"
- Drag-and-drop upload target with visual drop zone
- Example chips (clickable):
  - "Analyze this thesis"
  - "Compare these screenshots"
  - "Turn meeting notes into a packet"
  - "Find the real risks here"

---

### Middle Section: Evidence Board

**Visual metaphor:** Research tray, not social collage.

Each tile shows:

**Required fields:**
- Thumbnail (for screenshots/images) or icon (for audio/video/link/note)
- Source type badge: `screenshot` | `audio` | `video` | `link` | `note`
- Extracted title or quick summary (auto-generated)
- Timestamp
- Tags (auto-extracted or user-added)
- Confidence score of extraction (visual indicator)
- Linked entity if resolved (clickable to entity preview)

**Tile interactions:**
- Click to expand details
- Hover to show full summary
- Drag to reorder
- Delete button
- "Add note" quick action

**Board-level controls:**
- "Add more" button (opens upload modal)
- "Compile packet" button (prominent CTA)
- "Clear board" button
- Filter by source type
- Sort by time / confidence / relevance

---

### Right or Lower Section: Live Packet Preview

**As evidence is uploaded, show a live evolving output:**

**Preview sections:**
- **Thesis** (one-sentence summary of what the evidence suggests)
- **Key claims** (bullet points extracted from evidence)
- **Unresolved questions** (what's missing or unclear)
- **Contradictions** (conflicting signals across evidence)
- **Next steps** (what research should happen next)

**Visual behavior:**
- Updates in real-time as uploads are added
- Shows "compiling..." state during processing
- Collapsible sections
- "View full packet" button when ready

---

## Naming

**Internal metaphor:** Pinterest board (for team alignment)

**External terminology:**
- Evidence Board (recommended - implies inputs to judgment)
- Research Board
- Signal Board
- Input Board
- Dossier Board

**Recommendation:** Use "Evidence Board" as the primary term.

---

## Why This Is Better Than a Generic Upload Feature

A generic upload feature is commodity. The Evidence Board becomes:

1. **Provenance:** Shows where the research came from
2. **Visual comparability:** Users can see the original content side-by-side
3. **Social proof:** Demonstrates research in motion
4. **Packet input:** Uploads become structured inputs, not attachments
5. **Reusable workflow seed:** The board-to-packet path can be retained and replayed

---

## Core User Flows

### Flow 1: Anonymous Social-to-Packet

1. User drops 4 screenshots
2. NodeBench extracts text and entities
3. Evidence Board renders the uploads as tiles
4. Ask bar proposes a starter question automatically
5. User clicks "Compile packet"
6. Packet view shows: Thesis, Evidence ledger, Risks / contradictions, Next move
7. User can keep it in browser session or sign up to save it

**Success metric:** Anonymous user goes from evidence to packet in under 3 minutes without creating an account.

### Flow 2: Signed-in Private Dossier

1. User uploads screenshots + notes + links
2. Packet gets created
3. Packet is stored in Homes Hub
4. User revisits later
5. Adds one more search or one new upload
6. NodeBench refreshes packet (delta update)
7. User delegates or exports

**Success metric:** Signed-in user can extend an existing packet in under 30 seconds.

### Flow 3: Team / MCP-as-a-Service (Future)

1. Team creates a private board around a company or theme
2. Shared-context packet lineage tracks updates
3. Workflow assets get promoted from successful board-to-packet runs
4. Cheaper replay paths handle refresh and monitoring
5. External MCP routes can consume the packet/task handoff contract

**Success metric:** Team sees 50%+ cost reduction on repeated research patterns.

---

## Freemium Model

### Anonymous / Session Mode

**Capabilities:**
- Upload screenshots, audio, video, links, notes
- Generate packets
- Revisit using browser session/local cache
- Do lightweight refresh and add-on search
- Share read-only link (future virality feature)

**Limitations:**
- No durable storage across sessions
- No team features
- No advanced delegation
- No retained workflow benefits

**Technical implementation:**
- Browser session storage for board state
- Local SQLite or IndexedDB for packet cache
- Convex anonymous session with time-based expiration

### Signed-in / Paid Mode

**Capabilities:**
- Durable Homes Hub dossiers
- Store unlimited evidence and history
- Run unlimited refreshes
- Private saved info
- Team workspaces
- Advanced compare/monitoring
- MCP and downstream workflow connections
- Retained workflow benefits (cheaper replay)

**Pricing narrative:**

"Free lets you try evidence-to-packet research in session. Paid gives you durable dossiers, private storage, refresh history, team memory, and lower unit economics through retained workflows."

**Cost transparency example:**

```
This run cost: ~$0.15 (frontier model)
With retained workflow: ~$0.04 (replay path)
Raw equivalent without NodeBench: ~$0.35
You saved: ~89%
```

---

## How Attrition / Retention Fit This Landing Page

### Retention Role

**Retention should preserve:**
- The evidence bundle (what uploads were used)
- Extracted entities
- Good query expansions
- Useful packet shape
- Role-lensed output
- The path from evidence board to final packet

**Benefit:** If a user uploads a similar bundle later, the system starts stronger than zero.

### Attrition Role

**Attrition should:**
- Remove redundant steps in board-to-packet conversion
- Reduce repeated searches across similar boards
- Reuse the good structure from similar evidence boards
- Support cheaper refresh when a user adds only one new screenshot or link

**Benefit:** Turns "re-run everything" into "refresh the changed parts."

### HyperLoop / Oracle / Meta Layer

**This stays builder-facing.** It judges:
- Whether the compiled packet was actually good
- Whether the evidence was weak
- Whether the tool path was wasteful
- Whether the board-to-packet workflow should become a reusable asset

---

## Evidence Board Implementation Priority

### Step 1: Core Evidence Board
- Ask bar + screenshot upload
- Evidence Board grid layout
- Basic packet preview
- Compile button

### Step 2: Session Persistence
- Browser session storage for board state
- Local cache for packets
- "Revisit from session" capability

### Step 3: Signed-in Durable Storage
- Auth integration
- Convex-backed Homes Hub storage
- Save board to home
- Refresh from saved home

### Step 4: Evidence Diff
- "What changed" view when adding new evidence
- Visual diff of packet before/after
- Timeline of evidence additions

### Step 5: Role Lenses
- Role selector on packet view
- Banker / VC / buyer / founder lenses
- Lens-specific packet rendering

### Step 6: Delegation
- Handoff modal from packet
- Target selector (Claude Code, OpenClaw, internal)
- Result viewer with lineage

### Step 7: Retained Workflow Replay
- Workflow asset extraction from board-to-packet runs
- Replay path for similar boards
- Cost comparison display

---

## Technical Considerations

### File Upload Handling

**Supported formats:**
- Images: PNG, JPG, JPEG, WEBP, GIF
- Audio: MP3, WAV, M4A
- Video: MP4, WEBM (with size limit)
- Text: TXT, MD
- Future: PDF, DOCX

**Extraction pipeline:**
- Images: OCR + vision model extraction
- Audio: Speech-to-text
- Video: Frame extraction + speech-to-text
- Text: Direct parsing
- Links: Web scraping and content extraction

### Entity Resolution

**Auto-linking:**
- Extract company names from evidence
- Extract founder names
- Extract sector/industry terms
- Link to existing entity database
- Show confidence score

**User correction:**
- Allow user to manually correct entity links
- Learn from corrections for future runs

### Real-time Compilation

**Performance targets:**
- First preview within 10 seconds of first upload
- Full compilation within 60 seconds for typical board (5-10 items)

---

## Evidence Board Success Metrics

### Landing Page
- Upload-to-packet conversion rate (anonymous)
- Sign-up rate after successful packet creation
- Average board size (number of uploads per session)
- Time from first upload to packet completion

### Freemium Conversion
- Session-to-sign-up conversion rate
- Paid upgrade rate within 30 days
- Retention rate of paid users after 90 days
- Average refreshes per saved home

### Product Quality
- Packet quality scores (via Oracle)
- User satisfaction with evidence extraction
- Reduction in research time (self-reported)
- Cost savings from retained workflows (measured)

---

# Part 3: Benchmark & Evaluation

## The Problem with Social Baselines

The example screenshots (short thesis + 3 stock names + no evidence) are useful as a low bar, but insufficient for actual decision-making.

**For SMRs (Small Modular Reactors) as an example:**

A social post might say: "SMRs are the future, buy NuScale, Oklo, BWXT."

**What's missing:**
- Distinction between design approval vs operating plant
- Partnership announcements vs booked revenue
- Pure-play exposure vs broad nuclear supplier
- Workforce constraints
- Regional deployment readiness
- Fuel supply chain
- Licensing timeline risks

**The benchmark question:** Can NodeBench turn a social-media thesis into an evidence-backed decision packet?

---

## NodeBench Gold-Standard Output

For a query like "What is the underrated asset or technology that could deliver 10x to 100x by 2030?" NodeBench should generate:

### 1. One-Sentence Thesis

"SMRs may benefit from AI-driven baseload demand, but investability depends on licensing path, fuel availability, manufacturing/supply chain readiness, customer offtake, and regional workforce buildout."

### 2. Opportunity Stack

Break the space into buckets:
- Reactor developers
- Fuel/enrichment
- Engineering/manufacturing
- Utilities/offtakers
- Hyperscaler demand pull
- Grid/land/regional siting
- Workforce/training

### 3. Constraint Ledger

A separate section called "What can kill the thesis?"

For SMRs this includes: Licensing risk, Project finance, Fuel supply, Construction timelines, Component bottlenecks, Local permitting, Talent availability, Customer concentration

### 4. Regional Map

If the thesis depends on actual deployment, tie opportunity to geography:
- Where the projects are
- Which RTO/ISO markets matter
- Where skilled labor pools are
- Where DOE pilot pathways or local economic incentives exist
- Where colleges/training pipelines sit relative to likely deployment regions

### 5. Public Market Exposure Map

Instead of "top 3 stocks," show:
- Pure or near-pure exposure
- Picks-and-shovels exposure
- Policy/defense-adjacent exposure
- Speculative vs nearer-term cash flow exposure

### 6. Evidence Ledger

Each major claim shows:
- Claim
- Evidence source
- Date
- Confidence
- What would falsify it

### 7. Role-Lensed Output

**VC lens:** Where is the non-consensus value, What's the wedge, What's the exit path

**Banker lens:** Who matters, What follow-up, What financing angle, What's the M&A angle

**Buyer lens:** What is actually acquirable / ownable, What's the operational reality, What's the key person risk

**Public-market lens:** What has revenue today vs narrative optionality, What's the valuation support, What's the catalyst timeline

### 8. Monitoring Triggers

"What should I watch monthly?" — NRC licensing milestones, DOE Reactor Pilot Program, Hyperscaler offtake announcements, Workforce funding, HALEU/fuel supply, Regional queue/interconnection

---

## Tool Call Architecture

NodeBench should use an explicit tool plan, not a generic browse loop.

### Layer 1: Resolver
```
entity.resolve("SMR")
theme.expand("SMR") -> { developers, fuel, suppliers, hyperscalers, regulators, regions }
lens.select("investor" | "banker" | "buyer" | "founder")
```

### Layer 2: Official Evidence
```
regulatory.fetch for NRC/DOE milestones
company.fetch_official for IR/newsroom/earnings releases
partner.fetch_official for customer or hyperscaler announcements
workforce.fetch for DOE/state/training signals
region.fetch for state/regional deployment context
```

### Layer 3: Market Structure
```
equity.map_exposure
supplier.map_chain
jobs.map_region
timeline.build
risk.extract
contradiction.check
```

### Layer 4: Packet Composition
```
packet.compose
packet.lens("VC")
packet.lens("banker")
watchlist.create
monitor.subscribe
```

### Source Priority

**Official first, interpretive second:**

High-priority: NRC, DOE, Company/IR newsrooms, Partner announcements, SEC filings

Low-priority: Social posts (use for thesis discovery, not evidence), Generic news summaries, AI-generated content without sources

---

## Evaluation Baselines

Use a ladder, not one comparison.

### Baseline 0: Social Baseline
- Short thesis + 3 names + no evidence ledger
- Use case: Thesis discovery, not diligence

### Baseline 1: Model-Only
- Same prompt, no tools, no web, no structured output
- Use case: Quick brainstorming

### Baseline 2: Model + Generic Browsing
- Frontier model with basic web search and free-form answer
- Use case: General research

### Baseline 3: NodeBench Frontier Run
- Structured tool plan, evidence ledger, contradiction check, role lens, packet output
- Use case: Decision-grade research

### Baseline 4: NodeBench Replay/Distilled Run
- Same task class, but run through the cheaper retained/attrited workflow
- Use case: Repeated similar research

### Baseline 5: Human Analyst Reference
- A short gold packet written or corrected by a knowledgeable human
- Use case: Calibration and evaluation

---

## Evaluation Dimensions

Judge across six axes:

### 1. Factual Correctness
- Are claims true? Are sources accurate? Are numbers correct? Are attributions right?

### 2. Evidence Quality
- Are sources high-quality (tier-1/tier-2)? Is evidence recent? Is evidence directly relevant? Are sources diverse?

### 3. Completeness of Key Constraints
- Did it surface major risks? Did it identify missing information? Did it cover all relevant buckets? Did it surface contradictions?

### 4. Actionability
- Does it have clear next steps? Is the "what to do next" specific? Can a user actually make a decision? Is the monitoring trigger list useful?

### 5. Uncertainty Calibration
- Does it admit what it doesn't know? Are confidence scores accurate? Does it distinguish between fact and opinion? Does it flag speculative claims?

### 6. Cost / Latency
- Token cost, Wall-clock latency, Cost per decision-quality unit, Latency vs quality trade-off

---

## External Benchmarks

### GAIA (General AI Assistants)
Tests real-world assistant behavior with reasoning, tools, web use, and multimodality. Limitation: GAIA tests general assistance, not domain-specific diligence.

### BrowseComp
Specifically measures the ability to find hard-to-locate information on the web. Limitation: BrowseComp tests fact-finding, not packet synthesis.

### NodeBench-Native Benchmark

**Task Families:**
1. Sector thesis breakdown (e.g., SMRs, AI infra, quantum)
2. Company / founder diligence
3. Public-equity exposure mapping
4. Regional workforce and deployment readiness
5. Conference-note-to-CRM packet
6. Compare-two-targets
7. "What changed in the last 90 days?"
8. "What would break this thesis?"

Each benchmark item has: Gold facts, Acceptable sources, Required constraint categories, Required unresolved questions, Rubric by role lens, Max budget and max latency target

**Important trick:** The answer should be easy to verify but hard to assemble.

---

## How Attrition, Retention, HyperAgent, and ARE Integrate

### Retention
**Keeps good run artifacts:** Resolved entities, Query expansions, Trusted source set, Evidence ledger, Contradiction checks, Final packet schema, Role-lensed transformations

**Evaluation metric:** Reduction in search calls, Increase in evidence quality, Time-to-packet reduction

### Attrition
**Removes waste:** Redundant searches, Low-signal pages, Repeated extraction steps, Unnecessary broad browsing

**Evaluation metric:** Token cost reduction, Latency reduction, Quality retention (delta from frontier baseline)

### HyperAgent
**Not the user-facing product.** It should be the meta-review layer that examines: Which tool calls were necessary? Which claims were weak? Which constraints were missed? What source routing should change next time? Which workflow should be promoted?

**Evaluation metric:** Workflow promotion accuracy, Failure mode detection rate, Source routing improvement over time

### ARE (Asynchronous Recursive Environment)
**Core idea:** Static benchmarks miss failure modes. You need richer environments with: Rules, Tools, Content, Verifiers, Ambiguity, Noise, Collaboration, Temporal constraints

**Real NodeBench eval environment should include:** Stale press releases, Contradictory filings, Partial workforce data, Delayed regulatory updates, Broken tool calls, User interruptions, Regional ambiguity, Multi-step follow-up tasks

**Evaluation metric:** Success rate under noisy conditions, Recovery from tool failures, Handling of contradictory sources, Interruption and resumption quality

---

## Benchmark Implementation Plan

### Phase 1: Gold Standard Creation
Create 50-100 gold packets across task families: 20 sector thesis, 15 company/founder, 10 compare-two, 10 conference-note-to-CRM, 15 "what changed"/"what would break"

### Phase 2: Baseline Evaluation
Run all baselines on the gold set. Score across six dimensions.

### Phase 3: ARE Environment Setup
Build realistic test environment with stale data, contradictory sources, tool failures, rate limiting, interruption scenarios.

### Phase 4: Attrition/Retention Evaluation
After sufficient runs: extract retained workflows, run replay, measure cost/latency/quality/promotion accuracy.

### Phase 5: Continuous Evaluation
Automated pipeline: weekly benchmark runs, regression detection, A/B testing, leaderboard tracking.

---

## Benchmark Success Metrics

### Quality Metrics
- NodeBench frontier ≥ 90% of human analyst quality
- NodeBench replay ≥ 80% of frontier quality
- Evidence quality ≥ tier-2 source threshold
- Constraint completeness ≥ 90%

### Cost Metrics
- Replay cost ≤ 30% of frontier cost
- Overall cost reduction ≥ 50% after workflow maturity
- Latency reduction ≥ 40% for replay

### Robustness Metrics
- Success rate under noise ≥ 85%
- Recovery from tool failure ≥ 90%
- Interruption resumption quality ≥ 85%

---

## The Real Arbitrage

The arbitrage is not "better summarization." It is:

1. Take a noisy thesis
2. Decompose it into investable subquestions
3. Route those questions through the right official and contextual sources
4. Surface what matters and what is missing
5. Preserve that workflow so the next similar problem is cheaper

---

# Part 4: Codebase Architecture

## Executive Summary

NodeBench is a full-stack monorepo with a React/Vite frontend, Convex backend, and multiple MCP (Model Context Protocol) server packages. The system is organized around a domain-driven architecture with feature-based frontend modules and backend domains, supporting entity intelligence research, agent orchestration, and founder operations.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Cockpit     │  │  FastAgent   │  │  Research    │          │
│  │  Layout      │  │  Panel       │  │  Hub         │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Convex Cloud Backend                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Domains     │  │  Workflows   │  │  Schema      │          │
│  │  (1200+      │  │  (Durable)   │  │  (50+ tables)│          │
│  │   files)     │  │              │  │              │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    MCP Server Packages                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  mcp-local   │  │  convex-mcp  │  │  openclaw-   │          │
│  │  (350+ tools)│  │  nodebench   │  │  mcp         │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Repository Structure

```
nodebench-ai/
├── src/                          # React frontend (997 items)
│   ├── features/                 # Feature modules (689 items)
│   │   ├── agents/              # Agent orchestration (149 items)
│   │   ├── research/            # Research surfaces (147 items)
│   │   ├── documents/           # Document editing (99 items)
│   │   ├── controlPlane/        # Agent control surface (48 items)
│   │   ├── founder/             # Founder platform (76 items)
│   │   ├── narrative/           # Narrative intelligence (27 items)
│   │   └── oracle/              # Oracle evaluation (7 items)
│   ├── components/              # Shared UI components (80 items)
│   ├── layouts/                 # Layout shells (23 items)
│   ├── hooks/                   # Custom React hooks (47 items)
│   ├── lib/                     # Utilities and registries (62 items)
│   ├── shared/                  # Shared utilities (50 items)
│   └── contexts/                # React contexts (2 items)
│
├── convex/                       # Convex backend (1420 items)
│   ├── domains/                 # Domain logic (1200 items)
│   │   ├── agents/              # Agent domain (234 items)
│   │   ├── narrative/           # Narrative domain (76 items)
│   │   ├── research/            # Research domain (155 items)
│   │   ├── evaluation/          # Evaluation domain (92 items)
│   │   ├── social/              # Social media domain (27 items)
│   │   ├── documents/           # Document domain (48 items)
│   │   ├── search/              # Search domain (48 items)
│   │   ├── founder/             # Founder platform (13 items)
│   │   ├── oracle/              # Oracle domain (4 items)
│   │   ├── mcp/                 # MCP integration (22 items)
│   │   └── operations/          # Operations domain (65 items)
│   ├── workflows/               # Durable Convex workflows (19 items)
│   ├── tools/                   # Convex tools (118 items)
│   ├── crons/                   # Cron jobs (7 items)
│   ├── actions/                 # Convex actions (7 items)
│   ├── http/                    # HTTP endpoints (2 items)
│   └── schema.ts                # Database schema (50+ tables)
│
├── packages/                     # Sub-packages (436 items)
│   ├── mcp-local/               # Local MCP server (302 items)
│   ├── convex-mcp-nodebench/    # Convex MCP bridge (44 items)
│   ├── openclaw-mcp-nodebench/  # OpenClaw integration (47 items)
│   ├── mcp-client/              # MCP client library (5 items)
│   ├── eval-engine/             # Evaluation engine (16 items)
│   └── create-nodebench-app/    # App scaffolding (13 items)
│
├── apps/                         # Standalone apps (33 items)
│   └── api-headless/            # Headless API (33 items)
│
├── docs/                         # Documentation (1098 items)
├── scripts/                      # Build and utility scripts (309 items)
├── tests/                        # Test files (37 items)
└── server/                       # Express server (75 items)
```

---

## Frontend Architecture

### Main Application Shell

**Entry Point:** `src/App.tsx`

The app uses a multi-shell architecture with three main modes:

1. **Standalone Routes** (no cockpit chrome): `/memo/:id`, `/company/:slug`, `/embed/:type/:id`
2. **Cockpit Shell** (authenticated/unauthenticated): `CockpitLayout` — 5-region cockpit shell
3. **Tutorial Mode**: `/onboarding`

### Cockpit Layout

**File:** `src/layouts/CockpitLayout.tsx`

```
+--------------------------------------+
| StatusStrip                          |
+--------+------------------+----------+
| Work-  |  ActiveSurface   |  Agent   |
| space  |      Host        | Presence |
| Rail   |                  |  Rail    |
+--------+------------------+----------+
| TraceStrip                           |
+--------------------------------------+
```

**Key Components:**
- **WorkspaceRail** — Left navigation rail
- **ActiveSurfaceHost** — Main content area
- **StatusStrip** — Top status bar
- **TraceStrip** — Bottom execution trace
- **CommandBar** — Cmd+K command palette
- **MobileTabBar** — Mobile bottom navigation

### View Registry

**File:** `src/lib/registry/viewRegistry.ts`

Single source of truth for all view routing. Defines 40+ views with: View metadata, Route groups (core, nested, internal, legacy), Surface assignments, Navigation visibility.

**Main Views:**
- `control-plane` (ask) — Agent trust control plane
- `research` — Research hub
- `documents` — Document editor
- `founder-dashboard` — Founder daily brief
- `workspace` — Founder workspace
- `packets` — Packet center
- `history` — Founder history
- `connect` — MCP connections
- `library` — Document library

### Feature Modules

1. **Agents** (`src/features/agents/` — 149 items) — FastAgentPanel, agent orchestration, streaming, selection context
2. **Research** (`src/features/research/` — 147 items) — ResearchHub, evidence management, citation system
3. **Documents** (`src/features/documents/` — 99 items) — ProseMirror editor, document hierarchy, file upload
4. **Control Plane** (`src/features/controlPlane/` — 48 items) — Agent trust, action receipts, delegation, MCP ledger
5. **Founder** (`src/features/founder/` — 76 items) — Dashboard, company truth, packet management, export
6. **Narrative** (`src/features/narrative/` — 27 items) — Narrative events, hypotheses, signal metrics, evidence grading
7. **Oracle** (`src/features/oracle/` — 7 items) — Oracle evaluation UI, session management

### Key Contexts

- **FastAgentContext** — Agent panel state and control
- **SelectionContext** — Text selection across components
- **OracleSessionContext** — Oracle session management
- **EvidenceContext** — Evidence state across research
- **ThemeContext** — Theme and mode management
- **ContextPillsProvider** — Context pill suggestions

### Key Hooks

- **useCockpitMode** — Cockpit routing and mode derivation
- **useCommandPalette** — Cmd+K command palette
- **useFastAgent** — Agent panel control
- **useConvexAuth** — Authentication state
- **useWebMcpProvider** — WebMCP tool exposure
- **useVoiceIntentRouter** — Voice command routing

---

## Backend Architecture (Convex)

### Schema Organization

**File:** `convex/schema.ts` (13,105 lines)

**Core Tables:**
- `documents` — Document metadata and hierarchy
- `nodes` — ProseMirror block nodes
- `relations` — Graph edges between nodes
- `relationTypes` — Relation type definitions
- `tags` — Domain/entity/topic keywords
- `files` — File storage references
- `chunks` — RAG text chunks
- `sourceArtifacts` — Citation artifacts

**Domain Tables (17 imports):**
1. **Dossier** — Focus state, annotations, enrichment
2. **Email** — Threads, messages, labels, processing
3. **Proactive** — Events, opportunities, detectors
4. **OpenClaw** — Workflows, sessions, executions
5. **Forecasting** — Forecasts, evidence, resolutions, calibration
6. **Temporal** — Time series, causal chains, proof packs
7. **Hyperloop** — Evaluation variants, promotions
8. **DeepTrace** — Relationship observations, world events
9. **Oracle** — Player profiles, quest log, transactions
10. **Missions** — Execution, task plans, run steps
11. **Intelligence** — Entity profiles, investor profiles, holdings
12. **World** — Geo entities, infrastructure, market signals
13. **Evaluation** — Inference calls, baseline comparisons
14. **Trajectory** — Entities, spans, evidence bundles
15. **SuccessLoops** — Registry, experiments
16. **MCP** — API keys, gateway sessions
17. **Founder** — Workspaces, companies, products, agents, signals

### Key Domains

1. **Agents** (234 items) — Coordination, streaming, reviews, harness
2. **Narrative** (76 items) — Events/claims, hypotheses, signal metrics, DRANE
3. **Research** (155 items) — Search pipeline, deep diligence, daily brief, RAG
4. **Evaluation** (92 items) — Live eval, comprehensive testing, benchmarking, quality gates
5. **Social** (27 items) — LinkedIn posting, archive management, daily digest
6. **Documents** (48 items) — Document operations, ProseMirror sync, file processing
7. **Search** (48 items) — Search pipeline, entity resolution, evidence ranking
8. **Founder** (13 items) — Workspace management, company truth, packet management
9. **Oracle** (4 items) — Oracle evaluation schema
10. **MCP** (22 items) — MCP gateway, API key management
11. **Operations** (65 items) — Operational workflows, task management, monitoring

### Convex Function Types

- **Queries** — Read-only data access
- **Mutations** — Write operations
- **Actions** — Long-running, side-effectful operations
- **Internal Functions** — Private helpers (internalQuery, internalMutation, internalAction)

### Workflows & Cron Jobs

**Workflows** (`convex/workflows/` — 19 items): Daily LinkedIn posting, Deep diligence, Narrative processing, Founder operations, Proactive detection

**Crons** (`convex/crons/` — 7 items): Daily brief generation, Social media posting, Data synchronization, Maintenance tasks

---

## MCP Server Architecture

### mcp-local Package

**Location:** `packages/mcp-local/` (302 items) — 350+ tools across 57 domains.

**Key Subsystems:**

1. **Tools** (`src/tools/` — 100 files)
   - Agent, Research, File, Web, Founder, UI/UX, Meta, Evaluation, Security, Vision, Voice tools

2. **Subconscious** (`src/subconscious/` — 6 items) — Memory blocks, graph engine, whisper policy, decay

3. **Dashboard** (`src/dashboard/` — 6 items) — HTTP server on port 6274, Tailwind CDN UI

4. **Database** (`src/db.ts` — 51KB) — SQLite schema, skills, dive sessions, A/B test tables

5. **Toolset Registry** (`src/toolsetRegistry.ts`) — Lazy-loading, preset management, dynamic loading

### Presets

- `starter` — 15 tools for first-time users
- `founder` — ~40 tools for founders
- `banker` — ~40 tools for bankers
- `cursor` — 28 tools for Cursor IDE
- `full` — 350+ tools for power users

### Dynamic Loading

Implements Search+Load architecture: Tool discovery via `discover_tools`, Lazy loading via `load_toolset`, A/B testing, Token cost optimization

---

## Integration Points

### 1. Frontend ↔ Convex
**Mechanism:** `convex/react` hooks (useQuery, useMutation, useAction, real-time subscriptions)

### 2. Frontend ↔ MCP
**Mechanism:** WebMCP Provider (`useWebMcpProvider`, `navigator.modelContext`)

### 3. Convex ↔ External APIs
**Mechanism:** Convex actions (Gemini, Linkup, Google, Social media APIs)

### 4. MCP ↔ Convex
**Mechanism:** `convex-mcp-nodebench` package, direct Convex function calls

### 5. MCP ↔ External APIs
**Mechanism:** Direct REST API calls, web scraping, file system access

---

## State Management

### Frontend State
- **React Context:** FastAgentContext, SelectionContext, OracleSessionContext, EvidenceContext, ThemeContext
- **Convex State:** Real-time subscriptions, optimistic updates, query caching
- **Local Storage:** User preferences, session state, WebMCP settings

### Backend State
- **Convex Database:** 50+ tables, real-time sync, durable workflows, cron jobs
- **SQLite (MCP):** Skills registry, dive sessions, A/B test data, local cache

---

## Authentication & Authorization

**Mechanism:** `@convex-dev/auth` — Email/password, OAuth providers, Anonymous sessions

**Authorization:** User-scoped queries, Admin functions, Public document access

---

## Testing Architecture

- **Frontend Tests:** Vitest + Testing Library — `src/features/*/test/`, `src/layouts/*/test/`
- **E2E Tests:** Playwright — `tests/e2e/`, dogfood testing with Gemini QA
- **Backend Tests:** Convex test utilities — `convex/domains/*/tests/`, DRANE golden sets
- **MCP Tests:** Vitest — `packages/mcp-local/src/__tests__/`, GAIA/ToolBench/SWE-Bench

---

## Deployment Architecture

- **Frontend:** Vercel (Vite build, static assets, PWA)
- **Backend:** Convex Cloud (`convex deploy`, type checking, schema migrations)
- **MCP:** npm (`npx nodebench-mcp --preset founder`)
- **API Headless:** `apps/api-headless/`

---

## Key Design Patterns

1. **Domain-Driven Design** — Feature-based frontend, domain-based backend
2. **View Registry Pattern** — Single source of truth for routing, centralized metadata
3. **Cockpit Surface Pattern** — Surface-based rendering, query-driven state, surface caching
4. **Lazy Loading Pattern** — Lazy routes, lazy tools, lazy features
5. **Context Provider Pattern** — Shared state via React contexts
6. **Streaming Pattern** — Convex streaming, React streaming UI, progressive rendering

---

## Performance, Security, Monitoring

### Performance
- Frontend: Lazy loading, code splitting, image optimization, virtual scrolling, memoization
- Backend: Query optimization, index usage, caching, parallel execution, workflow durability
- MCP: Lazy tool loading, tool caching, SQLite indexing

### Security
- Convex Auth integration, API key management, user-scoped data, MCP sandboxing

### Monitoring
- Frontend: Error tracking, intent telemetry, path tracking
- Backend: Convex dashboard, custom metrics, error logging
- MCP: Dashboard UI, SQLite logging, performance profiling

---

## Key Configuration Files

- `package.json` — Root package configuration
- `pnpm-workspace.yaml` — Workspace configuration
- `turbo.json` — Turborepo configuration
- `vite.config.ts` — Vite configuration
- `tsconfig.json` — TypeScript configuration
- `tailwind.config.js` — Tailwind CSS configuration
- `convex/convex.config.ts` — Convex configuration
- `playwright.config.ts` — Playwright configuration

---

# Part 5: System Flows

## Flow 1: Agent Research Pipeline

```
User Query (FastAgentPanel)
    ↓
FastAgentContext (manages panel state)
    ↓
Coordinator Agent (convex/domains/agents/core/coordinatorAgent.ts)
    ↓
┌─────────────────┬─────────────────┐
│  MCP Tools       │  Convex Tools   │
│  (mcp-local)     │  (convex/tools) │
└─────────────────┴─────────────────┘
    ↓
Evidence Collection (Linkup/Gemini, entity enrichment, RAG, file processing)
    ↓
Packet Compilation (convex/domains/research/searchPipeline.ts)
    ↓
Streaming Response → Progressive rendering in FastAgentPanel
```

---

## Flow 2: Document Creation & Processing

```
File Upload (Document Hub / Editor)
    ↓
File Upload Handler (validates, stores in Convex storage)
    ↓
┌─────────────────┬─────────────────┐
│  Text Extraction │  Metadata       │
│  (PDF/OCR/CSV)   │  Extraction     │
└─────────────────┴─────────────────┘
    ↓
Text Processing (chunking, entity extraction, page index detection)
    ↓
RAG Indexing (convex/domains/search/rag.ts — embeddings, vector storage)
    ↓
ProseMirror Node Creation (graph nodes, relations)
    ↓
Document Storage (documents table, search indexes, RAG flag)
```

---

## Flow 3: Research Hub & Evidence

```
ResearchHub (Multi-tab: Overview, Signals, Briefing, Deals, Changes)
    ↓
Tab Selection Handler (manages tab state, deep linking)
    ↓
┌─────────────────┬─────────────────┐
│  Real-time       │  Cached Data    │
│  Convex Queries  │  (local/session)│
└─────────────────┴─────────────────┘
    ↓
EvidenceProvider (manages evidence state, coordinates with EvidenceDrawer)
    ↓
Evidence Drawer (citations with page indices, source documents, quality indicators)
    ↓
Document Hub Integration (links evidence to source documents)
```

---

## Flow 4: Founder Platform

```
Founder Dashboard (daily brief, company truth, contradictions, next moves)
    ↓
Daily Brief Generation (convex/domains/research/dailyBriefWorker.ts — cron)
    ↓
┌─────────────────┬─────────────────┐
│  Signal Detection│  Context        │
│  (news, social,  │  Ingestion      │
│   market changes)│  (user/company) │
└─────────────────┴─────────────────┘
    ↓
Packet Compilation (founder lens, contradictions, next moves)
    ↓
Founder Workspace (company truth, changes, packet lineage)
    ↓
┌─────────────────┬─────────────────┐
│  Export          │  Delegation     │
│  (PDF/MD/link)   │  (Claude/Claw)  │
└─────────────────┴─────────────────┘
```

---

## Flow 5: Narrative Intelligence (DRANE)

```
News Ingestion (convex/domains/narrative/newsroom/ — RSS, scraping, social)
    ↓
Analyst Agent (hypothesis candidates, claims, evidence, signal metrics)
    ↓
Hypothesis Creation (convex/domains/narrative/mutations/hypotheses.ts)
    ↓
Publisher Agent (claim classification: speculative risk, entailment, evidence grading)
    ↓
Deduplication (convex/domains/narrative/mutations/dedup.ts)
    ↓
QA Gate (convex/domains/narrative/qaFramework.ts — speculative claim rate, contradictions)
    ↓
Narrative Storage (narrativeEvents, narrativeHypotheses, narrativeSignalMetrics, claimClassifications)
    ↓
Hypothesis Lifecycle (scoring, status transitions: active→supported/weakened/retired)
```

---

## Flow 6: MCP Tool Execution

```
MCP Client Request (Claude Code, Cursor, Windsurf)
    ↓
MCP Server (packages/mcp-local/src/index.ts — stdio)
    ↓
Toolset Registry (packages/mcp-local/src/toolsetRegistry.ts — lazy loading)
    ↓
┌─────────────────┬─────────────────┐
│  Cached Tool     │  Load Toolset   │
│  (fast path)     │  (lazy load)    │
└─────────────────┴─────────────────┘
    ↓
Tool Execution (parameters, error handling, metrics)
    ↓
┌─────────────────┬─────────────────┐
│  External APIs   │  Local Ops      │
│  (web/vision)    │  (fs/SQLite)    │
└─────────────────┴─────────────────┘
    ↓
Result Processing → Response Return
```

---

## Flow 7: Cockpit Routing & Surface Management

```
URL Navigation (e.g., /workspace, /research/briefing, /entity/:name)
    ↓
useCockpitMode Hook (parses URL, derives view/surface, extracts entity/workspace/run IDs)
    ↓
View Registry Lookup (src/lib/registry/viewRegistry.ts — path → view → surface)
    ↓
Cockpit State Update (currentView, currentSurface, entityName, workspace, panel)
    ↓
ActiveSurfaceHost (selects surface, renders component, manages caching)
    ↓
┌──────────┬──────────┬──────────┬──────────┐
│ Ask      │ Research │ Workspace│ Packets  │
│ (Control │ (Hub +   │ (Founder │ (Packet  │
│  Plane)  │ Evidence)│  Dash)   │  Center) │
└──────────┴──────────┴──────────┴──────────┘
```

---

## Flow 8: Social Media Posting (LinkedIn)

```
Daily Digest Generation (convex/workflows/dailyLinkedInPost.ts — cron)
    ↓
Content Formatting (3 posts: Signal, Analysis, Agency — each < 1450 chars)
    ↓
LinkedIn API Posting (convex/domains/social/linkedinPosting.ts)
    ↓
Archive Logging (persona, postType, dateString metadata)
    ↓
Idempotency Check (dedup by content + date + persona)
```

---

## Flow 9: Evaluation & Benchmarking

```
Benchmark Execution (convex/domains/evaluation/)
    ↓
Quality Measurement (factual correctness, evidence, completeness, actionability, calibration)
    ↓
┌─────────────────┬─────────────────┐
│  Baseline        │  Golden Set     │
│  Compare         │  (human-written │
│  (model-only,    │   references)   │
│   model+browse)  │                 │
└─────────────────┴─────────────────┘
    ↓
Oracle Review (convex/domains/oracle/ — human review, scores, failure modes)
    ↓
Trajectory Tracking (convex/domains/trajectory/ — quality over time, improvements)
```

---

## Flow 10: WebMCP Integration

```
WebMCP Provider (src/hooks/useWebMcpProvider.ts — init on mount)
    ↓
Tool Capability Exposure (registers tools with browser agent, schemas, descriptions)
    ↓
Navigation Bridge (navigation requests → cockpit surface routing)
    ↓
Context Injection (view context, entity/workspace/document state)
```

---

## Cross-Cutting Flows

### Authentication
```
User Login → @convex-dev/auth → Session → Token → useConvexAuth → Route Guards
```

### Error Handling
```
Error → ErrorBoundary (React) → Error Reporting → FeedbackListener → Recovery/Fallback
```

### Real-time Updates
```
Data Change (Convex) → Subscription → useQuery Hook → Component Re-render → UI Update
```

### Lazy Loading
```
Route Change → View Registry → Lazy Import → Suspense Fallback → Load → Render
```

### Streaming
```
Long-running Op → Convex Action/Workflow → Stream → Chunked Response → Progressive UI
```

---

# Part 6: Developer Navigation

## Quick Start: Where to Find Things

### I want to...

**...add a new feature/view**
1. Add view entry to `src/lib/registry/viewRegistry.ts`
2. Create component in appropriate `src/features/` directory
3. Add to surface in viewRegistry.ts (surfaceId field)
4. Add navigation item if needed (navVisible: true)
5. Update `src/hooks/useCockpitMode.ts` if custom routing needed

**...add a new Convex table**
1. Add to domain schema in `convex/domains/{domain}/schema.ts`
2. Import and add to `convex/schema.ts`
3. Create queries/mutations in `convex/domains/{domain}/`
4. Add indexes as needed
5. Run `npx convex dev --typecheck=enable`

**...add a new MCP tool**
1. Create tool in `packages/mcp-local/src/tools/{category}Tools.ts`
2. Add to tool registry in `packages/mcp-local/src/tools/toolRegistry.ts`
3. Add to preset in `packages/mcp-local/src/index.ts` if needed
4. Write test in `packages/mcp-local/src/__tests__/`
5. Update tool count in README

**...modify the agent chat interface**
1. Main: `src/features/agents/components/FastAgentPanel/FastAgentPanel.tsx`
2. Messages: `src/features/agents/components/FastAgentPanel/UIMessageBubble.tsx`
3. Input: `src/features/agents/components/FastAgentPanel/InputBar.tsx`
4. Context: `src/features/agents/context/FastAgentContext.tsx`

**...change the layout/routing**
1. Layout: `src/layouts/CockpitLayout.tsx`
2. Routing: `src/hooks/useCockpitMode.ts`
3. Registry: `src/lib/registry/viewRegistry.ts`
4. Surface: `src/layouts/ActiveSurfaceHost.tsx`

**...add a new research tab**
1. Add tab type to viewRegistry.ts (ResearchTab)
2. Update `src/features/research/views/ResearchHub.tsx`
3. Add tab-specific queries in `convex/domains/research/`
4. Update EvidenceContext if needed

**...modify the founder platform**
1. Dashboard: `src/features/founder/views/FounderDashboard.tsx`
2. Schema: `convex/domains/founder/schema.ts`
3. Queries: `convex/domains/founder/`
4. Daily brief: `convex/domains/research/dailyBriefWorker.ts`

---

## Key Files by Function

### Routing & Navigation
- `src/lib/registry/viewRegistry.ts` — View definitions and routing
- `src/hooks/useCockpitMode.ts` — URL parsing and state derivation
- `src/layouts/CockpitLayout.tsx` — Main layout shell
- `src/layouts/ActiveSurfaceHost.tsx` — Surface rendering

### Agent System
- `src/features/agents/components/FastAgentPanel/FastAgentPanel.tsx` — Agent UI
- `src/features/agents/context/FastAgentContext.tsx` — Agent state
- `convex/domains/agents/core/coordinatorAgent.ts` — Agent coordinator
- `convex/domains/agents/fastAgentPanelStreaming.ts` — Streaming

### Research System
- `src/features/research/views/ResearchHub.tsx` — Research hub UI
- `convex/domains/research/searchPipeline.ts` — Search pipeline
- `convex/domains/research/deepDiligence.ts` — Deep diligence
- `convex/domains/search/rag.ts` — RAG implementation

### Document System
- `src/features/documents/` — Document UI components
- `convex/domains/documents/` — Document operations
- `convex/schema.ts` — Document/nodes/relations tables

### Founder Platform
- `src/features/founder/views/FounderDashboard.tsx` — Founder dashboard
- `convex/domains/founder/schema.ts` — Founder schema
- `convex/domains/research/dailyBriefWorker.ts` — Daily brief

### Narrative System
- `convex/domains/narrative/` — All narrative logic
- `convex/domains/narrative/newsroom/agents/` — Analyst and Publisher agents
- `convex/domains/narrative/qaFramework.ts` — QA gate

### MCP Integration
- `packages/mcp-local/src/index.ts` — MCP server
- `packages/mcp-local/src/tools/toolRegistry.ts` — Tool registry
- `convex/domains/mcp/` — Convex MCP bridge

---

## Common Tasks (with code examples)

### Adding a New Route

```typescript
// src/lib/registry/viewRegistry.ts
{
  id: "my-new-view",
  title: "My New View",
  path: "/my-new-view",
  component: lazyView(() => import("@/features/myFeature/views/MyNewView")),
  group: "core",
  navVisible: true,
  surfaceId: "ask",
}
```

### Adding a New Convex Query

```typescript
// convex/domains/myDomain/queries.ts
import { query } from "./_generated/server";
import { v } from "convex/values";

export const myQuery = query({
  args: { myArg: v.string() },
  handler: async (ctx, args) => {
    // Query logic
    return result;
  },
});
```

```typescript
// Frontend usage
const data = useQuery(api.myDomain.myQuery, { myArg: "value" });
```

### Modifying the Schema

```typescript
// convex/domains/myDomain/schema.ts
export const myTable = defineTable({
  field: v.string(),
});
```

```typescript
// convex/schema.ts
import { myTable } from "./domains/myDomain/schema";

export default defineSchema({
  // ...
  myTable,
});
```

Then run `npx convex dev` to apply migration.

---

## Debugging Tips

### Frontend
- React DevTools for component inspection
- Console for errors
- Network tab for Convex queries

### Backend
- Convex dashboard logs
- `console.log` in Convex functions
- Function execution time monitoring

### MCP
- SQLite database at `~/.nodebench/nodebench.db`
- Local dashboard via `open_dive_dashboard` tool
- MCP server logs

---

## Testing Locations

- **Frontend Unit:** `src/features/*/test/` — Run with `npm test`
- **E2E:** `tests/e2e/` — Run with `npm run test:e2e`
- **Backend:** `convex/domains/*/tests/` — Run with `npm run test:run:convex`
- **MCP:** `packages/mcp-local/src/__tests__/` — Run with `npm run test:run:mcp-local`

---

## Environment Variables

### Required
- `GEMINI_API_KEY` — Gemini API for AI features
- `LINKUP_API_KEY` — Linkup API for web search
- `VITE_CONVEX_URL` — Convex deployment URL

### Optional
- `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_API_KEY`

Set in `.env.local` or via `npx convex env set`.

---

## Common Commands

```bash
# Development
npm run dev              # Start everything
npm run dev:frontend     # Frontend only
npx convex dev           # Backend only

# Building
npm run build            # Production build
npm run build:voice      # Voice server build

# Testing
npm test                 # Unit tests
npm run test:e2e         # E2E tests
npm run dogfood:verify   # Dogfood verification

# Linting
npm run lint             # Full lint check
npm run lint:eslint      # ESLint only

# Convex
npx convex dev           # Local development
npx convex deploy        # Deploy to production
npx convex env set VAR value  # Set environment variable
```

---

## Key Concepts

### Cockpit Surfaces
- `ask` — Control plane landing
- `research` — Research hub
- `workspace` — Founder workspace
- `packets` — Packet center
- `history` — Founder history
- `connect` — MCP connections
- `library` — Document library

### View Groups
- `core` — Primary navigation items
- `nested` — Sub-pages of core items
- `internal` — Dev/admin routes
- `legacy` — Deprecated redirects

### MCP Presets
- `starter` — 15 tools for beginners
- `founder` — ~40 tools for founders
- `banker` — ~40 tools for bankers
- `cursor` — 28 tools for Cursor IDE
- `full` — 350+ tools for power users

---

## Quick Reference

- **Find a component:** `src/components/` (shared) or `src/features/{feature}/components/` (feature)
- **Find a query/mutation:** `convex/domains/{domain}/queries.ts` or `mutations.ts`
- **Find a tool:** `packages/mcp-local/src/tools/`
- **Find a route:** `src/lib/registry/viewRegistry.ts`
- **Find a style:** `tailwind.config.js` for theme tokens, `src/index.css` for globals

---

# Part 7: New Component Specifications (Shipped)

## Evidence Board

**File:** `src/features/controlPlane/components/EvidenceBoard.tsx`
**Route:** Ask landing page (inline, between lens selector and example card)
**Status:** Live, visually verified

Pinterest-style upload zone on the Ask surface. Drop screenshots, audio, video, or notes to build a research packet. Compact dashed-border drop zone with upload icon. Wired into `ControlPlaneLanding.tsx`.

## Conference Capture

**File:** `src/features/controlPlane/components/ConferenceCapture.tsx`
**Route:** `/capture` (also `/conference`, `/event-capture`)
**Status:** Live, visually verified, zero console errors

Fast mobile-first capture mode for events and conferences. Features:
- Entity linking (person, company, event, topic) with chip display
- Quick text notes with Enter-to-submit
- Voice memo stub (start/stop recording)
- Quick tags: Hot lead, Follow-up ASAP, Potential partner, Competitor, Investor interest, Acquisition target
- CRM-ready summary generation with copy-to-clipboard
- Clear all with empty state

## Entity Compare

**File:** `src/features/controlPlane/components/EntityCompare.tsx`
**Route:** `/compare` (also `/entity-compare`, `/compare-entities`)
**Status:** Live, visually verified, zero console errors

Side-by-side diligence with role-specific framing. Features:
- 5 role lenses (founder, investor, banker, buyer, operator)
- Two-entity search inputs
- Per-entity: confidence bar, what changed, strengths, risks, key people, role-fit scoring
- Comparison matrix with delta arrows
- Recommendation engine based on lens-specific scoring
- Demo: Anthropic vs OpenAI

## Role Lens Output

**File:** `src/features/controlPlane/components/RoleLensOutput.tsx`
**Route:** `/lens` (also `/role-lens`, `/persona`) + embedded in ResultWorkspace "Lens" tab
**Status:** Live, visually verified, zero console errors

Same packet, different persona rendering. 6 lenses:
- **Founder:** Who matters, competitor truth, focus signal
- **Investor:** Non-obvious value, hidden risks, conviction signal
- **Banker:** Coverage intel, relationship graph, financing fit
- **Buyer:** Business quality, acquirability, comparable deals
- **Operator:** Process-poor but fixable, roll-up logic, EBITDA upside
- **Student:** Context primer, what to question, what to read next

Each lens outputs: headline, 3 sections with items, next action, watch-for.

Wired into ResultWorkspace as 5th tab ("Lens") — selecting a lens on the Ask bar now changes the Lens tab output.

## Benchmark Comparison

**File:** `src/features/controlPlane/components/BenchmarkComparison.tsx`
**Route:** `/benchmarks` (also `/benchmark`, `/eval`)
**Status:** Live, visually verified, zero console errors

5-baseline ladder proving NodeBench structured output vs shallow alternatives:
1. **Social Baseline** (31 avg): Short thesis + 3 names, no evidence
2. **Model Only** (40 avg): Same prompt, no tools, free-form
3. **Model + Browse** (51 avg): Frontier model with basic web search
4. **NodeBench Frontier** (75 avg): Structured tool plan, evidence ledger, role lens
5. **NodeBench Distilled** (76 avg): Retained/attrited workflow replay

Features:
- Gap closure chart: social → frontier (+44), distilled retains 102% of gap at 23% of cost
- 6-metric drill-down: factual, evidence, completeness, actionability, uncertainty, cost efficiency
- 10 benchmark task families
- External benchmark alignment: GAIA, BrowseComp, NodeBench-native

## Delegation Modal

**File:** `src/features/controlPlane/components/DelegationModal.tsx`
**Route:** Modal triggered from ResultWorkspace Actions tab ("Delegate with scope" button)
**Status:** Live, visually verified, zero console errors

Handoff from packet to downstream agents. Features:
- Target selection: Claude Code, OpenClaw, Internal Worker
- Goal, scope, constraints, success criteria inputs
- Lineage tracking (parent packet ID, delegation chain depth)
- Briefing copy-to-clipboard
- One-click delegate with success/error feedback

## Homes Hub Session

**File:** `src/features/controlPlane/components/HomesHubSession.tsx`
**Route:** `/homes` (also `/homes-hub`, `/sessions`)
**Status:** Live, visually verified, zero console errors

Anonymous browser-session persistence. Features:
- Session list with last-visited timestamps
- Status badges: Fresh, Drifted, Stale
- Delta refresh: detects what changed since last visit
- Recompile: re-runs full pipeline with current data
- Drift warning: "Data has changed since last compile"
- Search filter, clear all
- localStorage persistence (no auth required)
- Demo seed: Anthropic AI, OpenAI, Stripe, Notion

---

# Part 8: Persona Friction Analysis

## Founder Friction

| Pain | Current workaround | NodeBench fix |
|------|--------------------|---------------|
| "I don't know what investors will actually care about" | Guess, ask friends | Role lens shows investor-specific framing of your company |
| "My positioning feels generic" | Copy competitor copy | Evidence Board + Packet shows what makes you different with sources |
| "I can't keep track of what changed" | Manual notes | Homes Hub drift detection + delta refresh |
| "I need to hand this to someone else" | Copy-paste into email | Delegation Modal with scoped briefing |

## Investor Friction

| Pain | Current workaround | NodeBench fix |
|------|--------------------|---------------|
| "Decks hide the real risks" | Manual DD, call founders | Entity Compare surfaces hidden risks with evidence |
| "I can't kill deals fast enough" | Spend weeks on DD | Confidence + proof status lets you kill or convict in minutes |
| "What changed since I last looked?" | Re-read old notes | Homes Hub drift badge + recompile |
| "I need to brief my IC" | Write memo from scratch | Packet export + role lens for IC-ready framing |

## Banker Friction

| Pain | Current workaround | NodeBench fix |
|------|--------------------|---------------|
| "Raw contact → usable coverage takes too long" | Manual research | Conference Capture → CRM summary in 2 minutes |
| "Who actually influences the transaction?" | Guess from LinkedIn | Relationship graph in banker lens |
| "Is this company ready for capital markets?" | Ask the company | Banker lens: financing fit + strategic buyer map |

## Buyer/Acquirer Friction

| Pain | Current workaround | NodeBench fix |
|------|--------------------|---------------|
| "Is this business actually good or just well-marketed?" | Trust the seller | Buyer lens: business quality + acquirability scoring |
| "What will go wrong post-close?" | Hope for the best | Drift detection + risk inventory with evidence |
| "How does this compare to the other target?" | Two separate DD tracks | Entity Compare side-by-side with buyer framing |

## Operator Friction

| Pain | Current workaround | NodeBench fix |
|------|--------------------|---------------|
| "Is this process-poor but fixable?" | Gut feel | Operator lens: EBITDA upside + playbook fit |
| "Does this niche have roll-up density?" | Manual market map | Roll-up logic section in operator lens |
| "Can I diligence without sounding naive?" | Hire a consultant | Buyer lens + Entity Compare for comparable deals |

---

# Part 9: Attrition, Retention, HyperAgent & ARE Integration

## Retention

**Definition:** Preserves useful workflow structure and query expansions from prior runs.

**What is retained:**
- Tool call sequences that produced high-quality outputs
- Query expansions that surfaced non-obvious sources
- Evidence ledger patterns that achieved high confidence
- Role lens configurations that matched user behavior

**How it surfaces:**
- Homes Hub "Recompile" uses retained workflow structure to produce similar-quality output faster
- Benchmark "NodeBench Distilled" baseline is the retained/attrited path
- `workflowAsset.replayReady` flag on packets indicates retention is available

**Current state:** Infrastructure exists (workflowEnvelope, trajectoryStore, replayDetector). Full automatic retention promotion is future.

## Attrition

**Definition:** Compresses workflows by removing redundant steps and enabling delta refresh.

**What is attrited:**
- Redundant tool calls (same query, same result)
- Low-signal exploration branches that didn't contribute to the final packet
- Intermediate state that can be reconstructed from the final packet

**How it surfaces:**
- Delta refresh in Homes Hub only re-runs attrited portions of the workflow
- Cost reduction: distilled runs cost 23% of frontier runs while retaining 102% of quality gap
- `workflowAsset.state` tracks attrition progress

**Current state:** Attrition bridge exists (ta.nodebench.ingest_envelope). Full automatic step elimination is future.

## HyperAgent (Oracle/Flywheel)

**Definition:** Meta-agent that reviews runs to promote reusable workflow assets and improve system quality.

**What it does:**
- Reviews completed runs for replay candidacy
- Promotes high-quality tool sequences to workflow assets
- Identifies patterns across runs (e.g., "banker lens always starts with ownership map")
- Feeds benchmark improvements back into the pipeline

**How it surfaces:**
- Improvement Timeline tab in telemetry stack
- `workflowAsset.assetType` = "promoted" for HyperAgent-promoted assets
- Benchmark comparison shows quality improvement over time

**Current state:** Improvement Timeline visualization shipped. Automatic promotion is future.

## ARE (Attrition-Retention-Evaluation)

**Definition:** The closed loop connecting attrition, retention, and evaluation into a self-improving cycle.

**The loop:**
1. **Run** a search → produces packet + trajectory
2. **Evaluate** the packet against gold standard or user feedback
3. **Retain** high-quality workflow structures
4. **Attrit** redundant steps from retained workflows
5. **Replay** similar tasks through the distilled path
6. **Benchmark** distilled vs frontier to measure cost/quality tradeoff
7. **Promote** distilled paths that maintain quality as new defaults

**Current state:** Steps 1-2 and 6 are live. Steps 3-5 and 7 are infrastructure-ready but not yet automatic.

---

# Part 10: Tool-Call Sequences

## Standard Search Sequence

```
1. receive_query → parse intent, select lens
2. discover_tools → find relevant tools for this query type
3. web_search × 3-5 → parallel searches across domains
4. fetch_url × 5-10 → retrieve promising sources
5. analyze_content → extract claims, metrics, entities
6. cross_reference → verify claims against multiple sources
7. assemble_packet → build structured output with evidence ledger
8. apply_lens → render per-role framing
9. prepare_next_move → suggest follow-up, delegation, or export
```

## Conference Capture Sequence

```
1. receive_note → parse entity type + content
2. link_entity → resolve person/company/event to known entities
3. generate_crm_summary → assemble who/company/context/next action
4. store_session → persist to Homes Hub for later revisit
```

## Delta Refresh Sequence

```
1. load_session → retrieve prior packet + workflow from Homes Hub
2. detect_drift → compare current source state vs last compile
3. attrited_search → re-run only changed portions of the workflow
4. merge_deltas → combine new findings with retained structure
5. recompile_packet → produce updated packet with change markers
```

## Delegation Sequence

```
1. build_briefing → assemble packet context + evidence + constraints
2. select_target → route to Claude Code / OpenClaw / Internal Worker
3. scope_task → define goal, constraints, success criteria
4. track_lineage → record parent packet + delegation chain depth
5. execute_delegation → send briefing to target agent
6. monitor_progress → track execution via Actions feed
```

