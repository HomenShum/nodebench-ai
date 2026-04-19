# NodeBench AI App v2 — Entity Intelligence Workspace Architecture

**Date:** 2026-03-24
**Status:** Draft — awaiting approval
**Author:** Homen Shum + Claude

---

## Product Thesis

NodeBench is an entity intelligence workspace that compounds over time. A user can search any company, person, market, or adjacent set of entities — or search their own entity with all private context layered in — and immediately get a tailored intelligence workspace that keeps getting smarter.

**One-sentence promise:**
> Search anything. Upload anything. NodeBench merges public intelligence, private context, agent findings, and session history into the smallest set of truths, changes, and packets that help you act.

---

## Reference: Offset → Rogo Acquisition (March 13, 2026)

Rogo acquired Offset to bring AI agents into financial workflows. Key lesson:

- **Offset** = Excel-native AI extension ($30/mo per user) where agents develop memory about how financial models are constructed, updated, and maintained over time. Not a separate app — operates inside the user's existing spreadsheets, formulas, and workflows. Enterprise tier supports on-prem for regulated firms.
- **Rogo** = AI platform for 25,000+ finance professionals (Series C, $75M from Sequoia). Positioned as moving from AI-as-research-tool to AI agents embedded in the actual tools finance teams use daily.
- **Combined thesis** = workflow-native + structural memory beats generic tooling. The AI should understand model logic, not just generate text. Financial professionals shouldn't context-switch to an AI chat window.
- **Founders:** Raj Khare and Shiv Shrivastava.

**NodeBench implication:** Become the entity intelligence + packet + continuity layer *above* generic search and providers. Not a generic agent. Not a generic dashboard. A workspace that remembers how work evolves — and like Offset's agents that learn model structure, NodeBench's agents should learn entity structure, decision patterns, and packet evolution over time.

---

## Two Entry Modes (Same Product)

### A. Outside-In Search
"Tell me about Anthropic, Shopify, Rogo, Offset, Supermemory, OpenAI..."

→ Public entity intelligence + web enrichment + comparables + risks

### B. Inside-Out Search
"Given everything in my profile, company history, notes, packets, and prior sessions — what should I do next?"

→ Private context + prior actions + trajectory + delegation-ready packets

**These must feel like the same product.** Same search bar. Same workspace layout. Different context sources merged.

---

## Four Context Sources (Merged Per Query)

| # | Source | Examples | Ingestion Path |
|---|--------|----------|----------------|
| 1 | **Public entity intelligence** | Web search, SEC filings, press releases, Crunchbase, LinkedIn | Web enrichment jobs |
| 2 | **Private uploaded context** | PDFs, spreadsheets, docs, repos, Slack exports | Upload ingestion + queue |
| 3 | **Prior NodeBench history** | Past searches, packets, decisions, contradictions, exports | Session memory + SQLite/Convex |
| 4 | **Connected agent/provider context** | Claude Code, OpenClaw, MCP outputs, outbound WS | Provider bus + queue |

---

## Source Classes

Any permissioned source the user or their agents can access becomes NodeBench input:

| Source Class | Examples | What NodeBench Extracts |
|-------------|----------|------------------------|
| **Codebase / Repo** | Git repos, PRs, commits, architecture notes | Initiative state, feature diffs, before/after, delegation packets |
| **Messaging** | Slack, Discord, Teams threads | Decisions, action items, pain themes, contradictions, escalations |
| **Documents** | PDFs, DOCX, spreadsheets, presentations | Entity facts, financial data, terms, comparables |
| **Uploads** | Batch file upload (Offset-style) | Structured extraction → canonical entities |
| **Agent outputs** | Claude Code sessions, OpenClaw tasks, Gemini, Codex | Findings, artifacts, code summaries, agent state |
| **Web research** | Search results, monitored URLs, RSS | Signals, news, competitive moves |
| **Local files** | ~/.nodebench/, local folders | Prior packets, session state, SQLite data |
| **Meeting transcripts** | Zoom, Meet, Gong recordings | Decisions, action items, customer quotes |
| **CRM / Tickets** | Linear, Jira, HubSpot, Notion | Initiative state, blockers, customer signals |
| **Email** | Gmail, Outlook (via agent) | Decisions, follow-ups, external signals |

**Key principle:** Not all input becomes first-class memory. Only canonicalized objects persist. Raw source is referenced, not stored verbatim.

---

## Canonical Object Schema

No matter the source, NodeBench extracts the same kinds of objects:

```
Entity              — company, person, product, market, technology
Initiative          — project, goal, workstream
Decision            — choice made, with rationale and status
Action              — step taken or planned
Milestone           — measurable event
Contradiction       — conflicting signals or beliefs
Signal              — inbound information with importance score
Artifact            — memo, deck, sheet, packet, report
Packet              — structured outbound bundle for delegation
BeforeState         — snapshot at time T
AfterState          — snapshot at time T+1
SourceProvenance    — where each fact came from
```

### Existing Schema Alignment (Convex)

The `convex/domains/founder/schema.ts` already implements most of this:

| Canonical Object | Existing Table | Status |
|-----------------|----------------|--------|
| Entity | `founderCompanies` + `ambientCanonicalObjects` | Exists — `entityResolution.ts` has canonical keys (`company:TSLA`, `person:elon-musk`, `theme:agent-memory`). Phase 11 `ambientCanonicalObjects` adds generalized entity support. |
| Initiative | `founderInitiatives` | Exists |
| Decision | `founderDecisions` | Exists |
| Action | `founderPendingActions` | Exists |
| Signal | `founderSignals` | Exists — has sourceType, importanceScore |
| Artifact | `founderEvidence` + `artifactModels.ts` | Exists — `ArtifactRow` with kind (url/file/video/image/document), provider (youtube/sec/arxiv/news/web/local) |
| Packet | `founderTaskPackets` | Exists — full lifecycle with approval, permission mode, return format |
| Contradiction | — | **NEW** — needs dedicated table |
| Milestone | `founderOutcomes` | Partial — needs milestone semantics |
| BeforeState / AfterState | `founderContextSnapshots` + `founderStateDiffs` | Exists — Phase 10 added `founderStateDiffs` for delta tracking |
| SourceProvenance | `founderEvidence.sourceRef` | Partial — needs richer provenance |
| Timeline | `founderTimelineEvents` | Exists — has correlationId for cross-entity linking |
| Agent | `founderAgents` | Exists — claude_code, openclaw, nodebench_background, other |
| IngestionQueue | `ambientIngestionQueue` | **Exists** — Phase 11 ambient intelligence |
| ChangeDetection | `ambientChangeDetections` | **Exists** — Phase 11 delta detection |
| PacketReadiness | `ambientPacketReadiness` | **Exists** — Phase 11 packet maturity tracking |
| Search/RAG | `convex/domains/search/` | **Exists** — ragQueries, searchCache, hashtagDossiers, vector search |
| FileUpload | `useFileUpload.ts` → Convex storage | **Exists** — generates upload URL, creates file record |
| PacketVersioning | `founderPacketVersions` + `founderMemoVersions` | **Exists** — Phase 10 causal memory |
| EventLedger | `founderEventLedger` | **Exists** — Phase 10 immutable event log |
| TrajectoryScoring | `founderTrajectoryScores` | **Exists** — Phase 10 compounding scores |

### Existing Infrastructure Summary

More infrastructure exists than initially estimated. Key systems already built:

| System | Location | What Exists |
|--------|----------|-------------|
| **Entity Resolution** | `convex/lib/entityResolution.ts` | Canonical key system, confirmed vs unconfirmed resolution, priority ordering |
| **Ambient Intelligence** | Phase 11 tables | Ingestion queue, canonical objects, change detection, packet readiness |
| **Causal Memory** | Phase 10 tables | Packet versions, memo versions, event ledger, path steps, state diffs, trajectory scores |
| **RAG Search** | `convex/domains/search/` | Vector search, batch indexing, query caching, dossier search |
| **File Upload** | `src/features/editor/hooks/useFileUpload.ts` | Convex storage upload + file record creation |
| **Agent Chat** | `convex/domains/agents/` | Thread management, message streaming, memories, snapshots, annotations |
| **Cron Jobs** | `convex/crons/` | Daily briefing, email intelligence, LinkedIn posting |
| **Task Dispatch** | `founderTaskPackets` | Full queued → dispatched → running → completed lifecycle |

### Actual Gaps (What Needs Building)

| Gap | Description | Priority |
|-----|-------------|----------|
| **Unified search entry** | No single search bar that routes to entity resolver + context merger | P0 |
| **Result workspace UI** | No canonical 8-section entity intelligence layout | P0 |
| **Contradiction detection** | No dedicated table or detection logic | P1 |
| **Web enrichment job** | Entity enrichment from public web not wired to ambient queue | P1 |
| **Upload → canonical pipeline** | File upload exists but doesn't extract entities/signals | P1 |
| **Provider bus normalizer** | No unified event normalization from multiple agent sources | P2 |
| **Compounding behavior signals** | No user behavior tracking for result personalization | P2 |
| **Shareable workspace URLs** | No public share mechanism for entity results | P2 |

---

## Result Workspace (Canonical Layout)

For any search, NodeBench renders:

| Section | Purpose |
|---------|---------|
| **Entity Truth** | Current canonical state of the entity |
| **What Changed** | Deltas since last view or since threshold |
| **Key Signals** | Inbound information ranked by importance |
| **Risks / Contradictions** | Conflicting signals, unresolved tensions |
| **Comparables / Adjacent Entities** | Related entities for context |
| **Helpful Next Questions** | What to investigate next |
| **Recommended Next Steps** | Actions ranked by impact |
| **Packet Actions** | Export, delegate, brief, share |

For **own entity** searches, add:

| Section | Purpose |
|---------|---------|
| **My Company Context** | Full private truth |
| **My Initiative History** | Active workstreams + state |
| **My Prior Packets / Memos** | Reusable artifacts |
| **My Tracked Contradictions** | What I'm watching |
| **My Likely Next Actions** | Predicted from history |
| **My Delegation-Ready Packet** | Pre-built for agent handoff |

---

## Message Queue Architecture

### Why a Queue

The app experience must feel instant, but intelligence work is asynchronous. Without a queue:
- User waits too long for everything, OR
- Background intelligence is skipped and the compounding effect is lost

### Queue Topology

```
User Action (search / upload / agent event)
    │
    ▼
┌─────────────────────────────────────┐
│         Immediate Response          │
│  (first-pass result from cache +    │
│   existing canonical memory)        │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│          Message Queue              │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  Ingestion Jobs             │   │
│  │  - File extraction          │   │
│  │  - Source normalization      │   │
│  │  - Provenance tagging       │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  Canonicalization Jobs      │   │
│  │  - Entity resolution        │   │
│  │  - Dedup / merge            │   │
│  │  - Schema mapping           │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  Enrichment Jobs            │   │
│  │  - Web enrichment           │   │
│  │  - Contradiction detection  │   │
│  │  - Comparable discovery     │   │
│  │  - Importance scoring       │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  Change Detection Jobs      │   │
│  │  - Delta computation        │   │
│  │  - Staleness detection      │   │
│  │  - Watchlist evaluation     │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  Artifact / Packet Jobs     │   │
│  │  - Packet refresh           │   │
│  │  - Memo regeneration        │   │
│  │  - Digest compilation       │   │
│  │  - Share link rendering     │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  Monitoring Jobs            │   │
│  │  - Watchlist checks         │   │
│  │  - Daily/weekly digests     │   │
│  │  - Keep-warm tracking       │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│       Refined Result + Alerts       │
│  (entity truth updated, packet      │
│   refreshed, contradictions found)  │
└─────────────────────────────────────┘
```

### Queue Implementation Options

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| **Convex scheduled functions** | Already deployed, serverless, built-in retry | No priority queue, limited concurrency control | **Phase 1** — use for first 3 jobs |
| **Inngest** | Event-driven, step functions, retry, fan-out | External dependency, another service | Phase 2 — when job complexity grows |
| **BullMQ + Redis** | Full-featured, priority queues, rate limiting | Self-hosted, operational overhead | Phase 3 — if/when self-hosting |
| **Trigger.dev** | Serverless jobs, TypeScript, built-in dashboard | External dependency | Alternative to Inngest |

### First 3 Queue-Backed Jobs to Ship

#### Job 1: Entity Enrichment (`entity.enrich`)
```
Trigger: User searches an entity not in cache (or stale > 24h)
Steps:
  1. Web search for entity (company/person/product)
  2. Extract structured facts (founding, funding, team, product, competitors)
  3. Score importance of each fact
  4. Upsert into founderCompanies / canonical entity table
  5. Compute comparables via embedding similarity
  6. Notify frontend via Convex subscription
Latency budget: < 10 seconds for basic facts, < 60 seconds for full enrichment
```

#### Job 2: Upload Ingestion (`source.ingest`)
```
Trigger: User uploads file(s) or agent sends artifact
Steps:
  1. Detect file type (PDF, DOCX, XLSX, CSV, MD, JSON, images)
  2. Extract text + structure (tables, headers, sections)
  3. Identify entities mentioned
  4. Map to canonical objects (decisions, signals, actions, etc.)
  5. Tag source provenance
  6. Queue canonicalization for each extracted entity
  7. Update relevant packets if entity already tracked
Latency budget: < 5 seconds for acknowledgment, < 2 minutes for full processing
```

#### Job 3: Contradiction Detection (`entity.detect_contradictions`)
```
Trigger: Any entity update (new signal, new evidence, enrichment complete)
Steps:
  1. Load all signals/evidence for entity
  2. Cluster by topic/dimension
  3. Detect conflicting claims within each cluster
  4. Score contradiction severity (1-5)
  5. Store in new contradictions table
  6. If severity >= 3, mark entity packet as stale
  7. Surface in "Risks / Contradictions" section
Latency budget: < 30 seconds per entity
```

---

## Provider Bus Architecture

For agent events from multiple providers:

```
Provider Event Sources:
  ├── nodebench-mcp (direct tool calls)
  ├── Claude Code (session events via outbound WS)
  ├── OpenClaw (heartbeat + task completion events)
  ├── Manual uploads (HTTP POST)
  ├── External webhooks (Slack, GitHub, etc.)
  └── Scheduled monitors (watchlist URLs, RSS)
         │
         ▼
┌─────────────────────────────────────┐
│        Provider Bus (Normalizer)    │
│                                     │
│  Input: raw provider event          │
│  Output: canonical event record     │
│    {                                │
│      sourceProvider: string,        │
│      sourceRef: string,             │
│      eventType: string,             │
│      entities: Entity[],            │
│      signals: Signal[],             │
│      decisions: Decision[],         │
│      actions: Action[],             │
│      rawPayload: string,            │
│      timestamp: number,             │
│      confidence: number             │
│    }                                │
│                                     │
│  Then: queue enrichment + canon     │
└─────────────────────────────────────┘
```

---

## Permission & Retention Boundaries

| Boundary | Rule |
|----------|------|
| **Raw source** | Referenced by provenance ID, not stored verbatim (except user uploads) |
| **Canonical memory** | Structured truth that NodeBench keeps. User owns, can delete. |
| **Derived artifacts** | Memos, packets, briefs. Regenerable from canonical memory. |
| **Retention** | User-controlled. Default: 90 days for raw, indefinite for canonical. |
| **Sharing** | Artifacts can be shared via URL. Canonical memory is private. |
| **Agent access** | Agents see only entities/packets in their permission scope. |

---

## Compounding Intelligence Mechanisms

The system learns from user behavior to improve over time:

| User Action | What System Learns | How It Compounds |
|-------------|-------------------|------------------|
| Searched entity | Interest signal | Rank higher in suggestions |
| Revisited entity | Sustained interest | Add to watchlist candidates |
| Exported packet | Output format preference | Default to that format |
| Accepted recommendation | Recommendation quality | Boost similar recommendations |
| Reused prior packet | Packet value | Keep packet fresher |
| Ignored contradiction | Risk tolerance signal | Adjust contradiction threshold |
| Acted on contradiction | Risk awareness | Surface similar contradictions faster |
| Searched adjacent entities | Relationship interest | Build comparable graph |
| Agent handoff succeeded | Delegation pattern | Pre-build similar packets |

These signals feed into:
- **Result ranking** — what to show first
- **Suppression** — what to hide
- **Adjacent entity discovery** — what connections matter
- **Risk calibration** — what risks matter for this user type
- **Default artifact format** — what to produce by default

---

## App Architecture Stack

```
┌─────────────────────────────────────────────────┐
│              Search / Upload Canvas              │
│  (text input, file drop, voice, paste, URL)      │
└───────────────────────┬─────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────┐
│           Intent + Role Inference               │
│  (what are they asking? what role are they in?)  │
└───────────────────────┬─────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────┐
│              Entity Resolver                     │
│  (public entities + private entities +           │
│   my own profile + fuzzy match + dedup)          │
└───────────────────────┬─────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────┐
│              Context Merger                       │
│  (web + uploads + MCP + provider bus +           │
│   packet history + session memory)               │
└───────────────────────┬─────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────┐
│      Queue-Backed Enrichment (async)             │
│  (canonicalization, deltas, contradictions,       │
│   comparables, scoring, artifact refresh)        │
└───────────────────────┬─────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────┐
│             Result Workspace                     │
│  (entity truth, changes, risks, comparables,     │
│   next steps, packet actions)                    │
└───────────────────────┬─────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────┐
│    Keep Warm / Monitor / Delegate / Export        │
│  (watchlist, daily digest, agent handoff,         │
│   share link, PDF/deck/sheet export)             │
└─────────────────────────────────────────────────┘
```

---

## Product Split

### NodeBench AI App (Broad Market)

**For:** Founders, investors, bankers, CEOs, legal, professors, students, operators

**Entry:** Search / ask / paste / upload

**Output:** Tailored entity intelligence workspace + packets + memos + monitoring

**First screen:** Search bar with suggestion chips + recent entities + trending signals

### NodeBench Power / Local Surface (Deep Continuity)

**For:** Power users, builders, operators, agent-heavy users

**Purpose:** Traces, paths, before/after state, provider-bus activity, packet lineage, replay, audit

**First screen:** Dashboard with active agents, recent sessions, packet history, system health

**These are the same product, different first screens.** Power users toggle between them.

---

## Implementation Phases

### Phase 1: Search → Result Workspace (2 weeks)
- [ ] Unified search bar on landing (replaces current hero)
- [ ] Entity resolver (public web search → structured entity)
- [ ] Result workspace layout (8 sections)
- [ ] Job 1: Entity enrichment via Convex scheduled function
- [ ] Cache layer (don't re-enrich within 24h)

### Phase 2: Upload + Private Context (2 weeks)
- [ ] File upload UI (drag-drop, multi-file, Offset-style)
- [ ] Job 2: Upload ingestion pipeline
- [ ] Private entity overlay (merge uploaded context with public)
- [ ] "My Entity" mode (search own company)
- [ ] Source provenance display

### Phase 3: Compounding Intelligence (2 weeks)
- [ ] Job 3: Contradiction detection
- [ ] User behavior tracking (search, revisit, export, ignore)
- [ ] Result ranking personalization
- [ ] Watchlist / keep-warm monitoring
- [ ] Daily/weekly digest generation

### Phase 4: Provider Bus + Agent Context (2 weeks)
- [ ] Provider bus normalizer
- [ ] Claude Code event ingestion
- [ ] OpenClaw event ingestion
- [ ] MCP context injection enhancement
- [ ] Codebase / Slack / doc source adapters

### Phase 5: Share + Distribute (1 week)
- [ ] Shareable workspace URLs (no auth required to view)
- [ ] Export to PDF / deck / sheet / markdown
- [ ] Delegation packet auto-generation
- [ ] Agent handoff protocol

---

## Key Metrics

| Metric | Target | Why |
|--------|--------|-----|
| Time to first useful result | < 5 seconds | Value before identity |
| Entity enrichment latency | < 60 seconds | Queue-backed, not blocking |
| Packet reuse rate | > 30% | Compounding signal |
| Return rate (7-day) | > 40% | Daily brief + watchlist driving returns |
| Share rate | > 10% of sessions | Output is distribution |
| Contradiction detection rate | > 1 per entity | Proves depth beyond generic search |

---

## Open Questions

1. **Queue technology for Phase 1** — Convex scheduled functions vs. Inngest vs. custom?
2. **Entity resolution service** — Build vs. buy (Diffbot, Crunchbase API, etc.)?
3. **Embedding model for comparables** — OpenAI ada-002 vs. local model?
4. **Slack/GitHub integration priority** — Which source class first after uploads?
5. **Pricing model** — Free tier scope vs. paid enrichment quota?
