# NodeBench Product Spec

Status: canonical spec, April 2026
Audience: interviewers, investors, new engineers, founder

---

## 1. One-liner

NodeBench helps people investigate messy company, founder, market, and relationship questions quickly, then turns good research runs into reusable packets that can be revisited, delegated, refreshed, and eventually replayed more cheaply.

## 2. The problem

In startup, banking, VC, PE, and acquisition workflows, the hardest part is rarely finding a fact. The hardest part is:

1. **Not knowing the right starting query** — entity names are ambiguous, product brands differ from legal names, the useful search terms are not obvious
2. **Entity resolution is messy** — companies change names, founders move roles, products are features inside other platforms
3. **Public data is easy; decision-useful context is not** — anyone can find a website; few can quickly surface hidden risks, contradictions, or the right follow-up angle
4. **Information is scattered** — website, LinkedIn, podcasts, event notes, CRM, emails, decks, filings, market context — all incompatible
5. **Speed kills depth** — people choose between deep-but-slow manual research or fast-but-shallow summaries
6. **No reusable mental model** — people don't know what a "good investigation" looks like for this type of question

## 3. Persona friction map

### Founder
- Hard to find: who matters in an account/fund ecosystem, warm paths, real competitor positioning, what investors care about, what changed in last 6 months
- Pain: "Help me know where to focus and who actually matters"

### Banker (JPM startup banking example)
- Hard to find: real company snapshot in 2-5 minutes, whether worth follow-up, founder/management quality, ownership/investor map, conference note capture tied to CRM
- Pain: "Help me move from raw contact to usable coverage intelligence fast"
- Specific workflow: incomplete prep → fragmented event notes → CRM entry pain → insights decay → next step unclear

### VC
- Hard to find: whether team is exceptional, what's non-obvious about market, whether product wedge is real, customer proof beyond deck
- Pain: "Help me get conviction faster, or kill the deal faster"

### Uninformed buyer (inherited wealth, searcher)
- Hard to find: how to evaluate business quality, what numbers matter, real risks of buying, management dependency
- Pain: "Help me become dangerous enough to ask the right questions"

### PE / Hormozi-style operator
- Hard to find: fragmented acquisition targets, niches worth rolling up, operational upside, process-poor but fixable businesses
- Pain: "Help me spot buyable businesses and operational upside fast"

### Investment banker
- Hard to find: clean comps for weird/emerging companies, relevant strategic buyers/sponsors, real-time meeting/event synthesis
- Pain: "Help me convert fragmented market intelligence into actionable deal context"

## 4. Product hierarchy

| Name | Role | Audience |
|------|------|----------|
| **NodeBench** | The product and brand | External |
| **Ask / Control Plane** | Main user runtime | Users |
| **Evidence Board** | Upload + extraction surface for screenshots, audio, video, links | Users |
| **Homes Hub** | Saved dossier shelf for packets, notes, revisits, refresh | Users |
| **Shared Context** | Memory and handoff protocol for packets, tasks, peers | Internal |
| **Oracle / HyperLoop** | Builder-facing evaluation and improvement | Builders |
| **Retention / Attrition** | Workflow capture, replay, cost compression | Infra |

Externally, lead with NodeBench. The other names are internal infrastructure.

## 5. Tab-by-tab spec

### Tab 1: Ask
- Simple input box with quick prompts
- Role lens switcher: founder / investor / banker / CEO / legal / student
- Screenshot/media upload zone (Evidence Board)
- Packet output: Founder Truth, Why This Holds/Breaks, Next Move, Ready Packet
- Success metric: vague question to useful packet in under 2-5 minutes

### Tab 2: Homes Hub (Library)
- Shelf of saved packets and dossiers: recent, pinned, drafts, event captures, delegated
- Reopen instantly, add search, recompile packet
- Anonymous: browser session persistence. Signed-in: durable via Convex
- Retention role: preserve useful packet structure. Attrition role: trim replay/refresh cost
- Success metric: reopen and extend prior research in under 30 seconds

### Tab 3: Packet View
- Full-page dossier: summary, founder truth, risks, key people, product/market, next move, ready packet, notes, delegation history, refresh history
- Rule: packet first, transcript second

### Tab 4: Compare
- Two+ entities side by side
- Same fields, different lens per role
- Primary uses: company vs competitor, target A vs B, prospect vs prospect

### Tab 5: Event / Conference Capture
- Fast mobile mode: voice note, quick text, entity link, event tag
- Generates CRM-ready packet: who, company, context, why relevant, next action, confidence, follow-up date

### Tab 6: Delegation
- Handoff to Claude Code / OpenClaw / internal worker
- Preserve packet identity, task scope, execution result, human-readable lineage

### Tab 7: Oracle / Review (builder-facing)
- Recent runs, scorecards, trajectory traces, packet quality, evidence gaps, failure modes, cost/latency, promote/reject workflow assets

### Tab 8: Benchmarks
- 4-way comparison: cheap baseline, frontier baseline, NodeBench frontier, NodeBench distilled
- Dimensions: quality, evidence, contradictions, structure, next-step usefulness, cost, latency

### Tab 9: Workflow Assets (builder-facing)
- Registry of reusable workflow candidates with promotion lifecycle

### Tab 10: Improvements
- Recharts visualization of all improvements via retention/attrition
- Summary cards, quality trend, savings curve, event timeline, replay adoption, promotion funnel

## 6. Evidence Board spec

### What it is
A Pinterest-style research tray on the Ask landing page where users can drop screenshots, audio, video, links, and notes as seed evidence for NodeBench to compile into a packet.

### Landing page layout
1. **Ask bar** — "Search a company, founder, sector, or thesis"
2. **Evidence upload zone** — drag-and-drop or click to upload. Accepts: images, audio, video, links, text notes, PDFs
3. **Evidence Board grid** — each tile shows: thumbnail, source type badge, extracted title/summary, timestamp, linked entity if resolved
4. **Compile button** — "Turn this into a packet"
5. **Live packet preview** — evolves as evidence is added: thesis, key claims, unresolved questions, contradictions, next steps

### Evidence tile fields
- `id`, `type` (screenshot | audio | video | link | note | pdf)
- `thumbnail` or waveform
- `extractedText` (OCR / whisper / parse)
- `extractedEntities[]`
- `sourceUrl?`
- `uploadedAt`
- `confidence`
- `tags[]`

### User flows

**Flow 1: Anonymous social-to-packet**
1. User drops 4 screenshots of a social media thesis
2. NodeBench extracts text and entities via OCR
3. Evidence Board renders tiles
4. Ask bar auto-proposes a starter question
5. User clicks "Compile packet"
6. Packet view shows thesis + evidence ledger + risks + next move
7. User keeps in browser session or signs up to save

**Flow 2: Signed-in private dossier**
1. Upload screenshots + notes + links
2. Packet created and stored in Homes Hub
3. Revisit later, add search or upload
4. NodeBench refreshes packet (delta-aware via Retention)
5. Delegate or export

**Flow 3: Conference capture**
1. Voice note + quick tags at event
2. Entity linked, CRM summary generated
3. Packet available for team review

### Free vs Paid
- **Free**: session-based research, Evidence Board, packet generation, browser cache revisit
- **Paid**: durable Homes Hub, private storage, refresh history, team memory, cheaper retained workflows, MCP as a service

### Pricing narrative
Lead with value, not tokens:
- "Free lets you try evidence-to-packet research in session"
- "Paid gives you durable dossiers, private storage, refresh history, and lower unit economics through retained workflows"
- Show: estimated token cost, what NodeBench saved through workflow reuse, what raw equivalent would cost

## 7. Benchmark spec

### What NodeBench should output (gold standard)

For a query like "What is the underrated technology that could deliver 10x-100x by 2030?" (e.g., SMRs):

1. **One-sentence thesis** — with caveats
2. **Opportunity stack** — bucketed: developers, fuel/enrichment, engineering, utilities, hyperscaler demand, regional siting, workforce
3. **Constraint ledger** — "What can kill the thesis?" — licensing, project finance, fuel supply, construction, talent, customer concentration
4. **Regional map** — tie opportunity to geography: projects, RTO/ISO markets, labor pools, DOE pathways, training pipelines
5. **Public market exposure map** — pure-play, picks-and-shovels, policy-adjacent, speculative vs near-term
6. **Evidence ledger** — per claim: source, date, confidence, falsification condition
7. **Role-lensed output** — VC/banker/buyer/public-market views of same data
8. **Monitoring triggers** — what to watch monthly

### Tool-call sequence for sector thesis

```
entity.resolve("SMR")
theme.expand("SMR") → {developers, fuel, suppliers, hyperscalers, regulators, regions}
lens.select("investor" | "banker" | "buyer")

regulatory.fetch → NRC/DOE milestones
company.fetch_official → IR/newsroom/earnings
partner.fetch_official → customer/hyperscaler announcements
workforce.fetch → DOE/state/training signals
region.fetch → state/regional deployment context

equity.map_exposure
supplier.map_chain
jobs.map_region
timeline.build
risk.extract
contradiction.check

packet.compose
packet.lens("VC")
packet.lens("banker")
watchlist.create
monitor.subscribe
```

Source priority: official first (NRC, DOE, company IR), interpretive second (press, social).

### 5-baseline comparison ladder

| Baseline | Description |
|----------|------------|
| 0: Social | Screenshot thesis + 3 stock names + no evidence |
| 1: Model-only | Frontier model, no tools, no web |
| 2: Model + browsing | Frontier model with basic web search |
| 3: NodeBench frontier | Structured pipeline + evidence + role lens + packet |
| 4: NodeBench replay | Same task via retained/distilled workflow |
| 5: Human analyst | Gold packet written by domain expert |

### 6-axis judge rubric

| Axis | Weight | 10 = | 1 = |
|------|--------|------|-----|
| Factual correctness | 25% | All claims verified with dated sources | Multiple fabricated claims |
| Evidence quality | 20% | Official sources with dates and context | Generic or undated |
| Constraint completeness | 20% | All key risks identified and scoped | Missing obvious blockers |
| Actionability | 15% | Clear next steps per role | Generic advice |
| Uncertainty calibration | 10% | Honest about what's unknown | False confidence |
| Cost/latency | 10% | Under budget and fast | Expensive and slow |

### Benchmark task families

- Sector thesis breakdown (SMR, quantum, robotics)
- Company/founder diligence (Anthropic, Cursor, Ramp)
- Public equity exposure mapping
- Regional workforce and deployment readiness
- Conference note to CRM packet
- Compare two targets
- "What changed in last 90 days?"
- "What would break this thesis?"

## 8. How Retention / Attrition / HyperAgent / ARE tie in

### The 6-step gated improvement loop

```
1. LIVE RUN — frontier model handles the hard question
2. TRACE CAPTURE — WorkflowEnvelope records full path
3. META REVIEW — HyperLoop evaluates quality
4. EVAL GATE — benchmark + scenario replay, compare to baseline
5. DISTILLATION — Retention/Attrition compress to cheaper replay
6. ROUTING — cheap replay first, escalate on hard cases
```

### Retention
- Keeps: successful query expansions, useful packet layouts, high-signal evidence bundles, role-specific follow-up patterns
- For Homes Hub: makes revisit delta-aware (refresh what changed, not everything)
- For Evidence Board: remembers how similar evidence bundles were compiled before

### Attrition
- Removes: redundant searches, low-signal pages, repeated extraction steps
- For Homes Hub: "re-open and search again" becomes "replay useful skeleton + refresh deltas"
- For Evidence Board: skip re-extracting known screenshots, reuse entity resolution

### Meta-hyperagent (HyperLoop/Oracle)
- Reviews: was the query decomposition good? Evidence complete? Tools efficient? Packet useful?
- Decides: which runs become reusable workflow assets, which get promoted/rejected
- Stays builder-facing, never visible to end users

### ARE (Agent Runtime Environments)
- Provides: realistic eval environments with stale data, contradictory sources, broken tools, user interruptions, regional ambiguity
- Tests: whether system produces correct packets under realistic mess, not just clean benchmarks
- Aligns with: NodeBench-native benchmark families (not just GAIA/BrowseComp)

### LangGraph / deep-agent principles
- Durable execution → resumable research threads
- Checkpointed state → packet lineage
- Human approval → review before delegation
- Thread identity → Homes Hub dossier continuity
- Side-effect separation → retries don't duplicate work

## 9. Data model (plain English)

### Packet
The main research object: packet_id, query, entities, answer, founder_truth, why_holds_breaks, next_move, ready_packet, evidence, citations, contradictions, notes, role_lens, source_run_id, status

### Home
Persistent dossier container: home_id, title, primary_entity, linked_packets, tags, pinned, owner/session_id, refresh_status

### Evidence Item
Upload input: id, type (screenshot|audio|video|link|note|pdf), extractedText, extractedEntities, thumbnail, sourceUrl, uploadedAt, confidence, tags

### Workflow Asset
Reusable investigation pattern: asset_id, source_packet_ids, task_type, entity_type, canonical_steps, tool_requirements, evaluation_scores, replay_policy, promotion_status

### Delegation Task
Handoff: task_id, source_packet_id, target, scope, instruction, execution_status, result_packet_id

### Episode
Temporal lineage: episode_id, home_id, spans, packets, delegated_tasks, outcome, review_score

## 10. API routes (plain English)

### Ask/runtime
- `POST /api/pipeline/search` — main search endpoint
- `GET /api/pipeline/health` — component availability

### Evidence Board
- `POST /api/evidence/upload` — upload file, extract text/entities
- `GET /api/evidence/board/:sessionId` — get evidence tiles
- `POST /api/evidence/compile` — compile evidence into packet

### Homes Hub
- `GET /api/homes` — list saved dossiers
- `POST /api/homes` — save new home
- `POST /api/homes/:homeId/refresh` — delta refresh
- `POST /api/homes/:homeId/note` — add note

### Packets
- `GET /api/packets/:packetId`
- `POST /api/packets/:packetId/export`
- `POST /api/packets/:packetId/publish`
- `POST /api/packets/:packetId/compare`

### Shared Context (already exists)
- snapshot, publish, delegate, episodes, events

### Improvements (already built)
- `GET /api/improvements/stats` — aggregated timeline

### Retention (already built)
- `POST /retention/push-envelope`
- `GET /retention/savings`
- `GET /retention/trajectories`

## 11. Phased build plan

| Phase | What | Why first |
|-------|------|-----------|
| 1 | Ask + Evidence Board + Packet output | Flagship demo, mobile-friendly |
| 2 | Homes Hub with session persistence | Revisit value, stickiness |
| 3 | Compare + Conference capture | Commercial usefulness |
| 4 | Delegation + role lenses | Portability |
| 5 | Oracle review + benchmarks | Proof layer |
| 6 | Workflow asset backbone | Unification |
| 7 | Replay + cost routing | Unit economics |

## 12. Explanation scripts

### For interviewers
"NodeBench is a packet-first research system for ambiguous company and founder questions. A user query goes through a typed pipeline, becomes a structured packet with evidence, and can be revisited, delegated, or refreshed. The system captures successful workflows and aims to replay them more cheaply over time. The Evidence Board lets users upload screenshots, audio, or notes as seed material that gets compiled into research packets."

### For new engineers
"Ask is the user runtime. Packets are the core product object. Shared Context is the memory spine. Oracle reviews the system. Retention/Attrition are the future replay layer. Evidence Board is the upload+extraction surface. The priority is consolidating these into one workflow-asset backbone."

### For investors
"NodeBench solves a real workflow problem: people in startup, banking, VC, and acquisition work need fast, deep, portable research — not another chatbot. The product turns messy inputs into structured packets, stores them as live dossiers, and has a path to improving unit economics by distilling successful research runs into cheaper replay paths."

## 13. What not to claim

- NodeBench is NOT fully autonomous
- Retention/Attrition are NOT fully shipped as a unified engine
- Workflow learning is NOT automatic end-to-end yet
- Oracle is NOT the main user product
- Claude Code / OpenClaw are execution lanes, NOT the product

The accurate claim: NodeBench has a working packetized runtime, real handoff/delegation, builder-facing evaluation, and is consolidating toward workflow-learning infrastructure.

## 14. The homepage sentence

> Drop screenshots, notes, links, or media. NodeBench turns them into a live research packet you can inspect, revisit, and build on.
