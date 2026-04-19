# NodeBench Competitive Gap Analysis

## vs DeerFlow (ByteDance) — Super Agent Harness
**What they have that we don't:**
- **Sub-agents**: Named specialist agents (researcher, coder, reporter) that the coordinator dispatches to. NodeBench harness dispatches to tools, not agents.
- **Sandbox & file system**: Isolated execution environments for code/data. NodeBench runs tools in-process.
- **Context engineering**: Explicit context window management. NodeBench has TOON encoding but no context budget allocation per agent.
- **Long-term memory**: Cross-session persistent memory with retrieval. NodeBench has session memory tools but no vector-indexed long-term recall.
- **MCP server mode**: DeerFlow can run AS an MCP server. NodeBench IS an MCP server — this is parity.
- **Claude Code integration**: One-line setup. NodeBench has this too — parity.
- **LangSmith tracing**: Built-in observability. NodeBench has its own profiler — different approach, same goal.

**What we have that they don't:**
- **350+ domain-specific tools** (they have generic skills)
- **Founder operating profiler** (behavioral intelligence)
- **Dual persistence** (SQLite + Convex)
- **Proof engine** for validated workflow shortcuts
- **Real-time web intelligence** (Linkup, web_search, entity enrichment)
- **Decision Workbench** (Deep Sim scenarios)
- **Multi-lens analysis** (founder/investor/banker/ceo/legal/student)

**Key gap to close:** Sub-agent architecture. NodeBench should dispatch to specialist agents (ResearchAgent, AnalysisAgent, SynthesisAgent) not just tools.

## vs Claw-Code (instructkr) — Agent Harness Engineering
**What they have:**
- **Clean-room Claude Code rewrite** in Python + Rust
- **Runtime modules**: assistant, bootstrap, bridge, buddy, coordinator, hooks, services, tools
- **Buddy system**: Agent-to-agent coordination (swarm)
- **Rust port**: Memory-safe, fast harness runtime

**What we have that they don't:**
- **Production web app** (they're CLI-only)
- **Live intelligence** (real company data, not just code execution)
- **Profiler/optimizer** layer
- **MCP ecosystem** integration

**Key gap:** The buddy/swarm system. NodeBench Coordination Hub has the UI but no real agent swarm engine underneath.

## vs Crucix (calesthio/HomenShum fork) — Personal Intelligence Agent

**What Crucix IS:** A real-time OSINT + market intelligence platform that watches 27 data sources in parallel every 15 minutes, computes deltas (what changed/escalated/de-escalated), generates LLM-powered trade ideas, and pushes tiered alerts (FLASH/PRIORITY/ROUTINE) to Telegram/Discord.

**What they have that we don't:**
- **27 live data sources in parallel** — GDELT (global news), OpenSky (flight tracking), NASA FIRMS (satellite fire detection), Maritime/AIS (vessel tracking), ACLED (conflict events), WHO (disease outbreaks), FRED (economic indicators), Yahoo Finance (live prices), CelesTrak (satellite tracking), OFAC/OpenSanctions, EPA RadNet (radiation), EIA (energy), and more. NodeBench has web_search + linkup + recon — 3 sources vs 27.
- **Delta engine** — dedicated `lib/delta/engine.mjs` that computes what changed between sweeps with severity classification. NodeBench has `founder_local_synthesize(important_change)` but no dedicated delta engine comparing structured snapshots.
- **Multi-tier alerting** — FLASH/PRIORITY/ROUTINE with semantic dedup, cross-domain correlation, confidence scoring. LLM evaluates severity. Rule-based fallback when LLM unavailable. NodeBench has no alerting system.
- **Telegram/Discord bots** — two-way bot commands (`/sweep`, `/brief`, `/portfolio`, `/alerts`, `/mute`). NodeBench has no messaging bot integration.
- **8 LLM providers** — Anthropic, OpenAI, Gemini, OpenRouter, Codex, MiniMax, Mistral, Grok with graceful fallback. NodeBench has 3 (Gemini, OpenAI, Anthropic) via `call_llm`.
- **Jarvis-style dashboard** — 3D WebGL globe with 9 marker types, animated flight arcs, radiation/nuclear watch, space watch (CelesTrak), risk gauges (VIX, high-yield spread), OSINT feed from 17 Telegram channels. NodeBench dashboard is card-based, no globe/map visualization.
- **Alpaca portfolio integration** — live portfolio status, trade idea generation from intelligence signals. NodeBench has no brokerage integration.
- **Sweep delta panel** — live panel showing new signals, escalations, de-escalations with severity. NodeBench's "What Changed" is static demo data, not computed deltas.
- **Self-contained source modules** — each of 27 sources exports `briefing()` and can run standalone (`node apis/sources/fred.mjs`). Clean, testable, parallelizable. NodeBench tools are MCP-shaped but not independently runnable data collectors.
- **Zero-dependency operation** — 18+ sources work with no API keys at all. NodeBench requires GEMINI_API_KEY minimum.

**What we have that they don't:**
- **MCP protocol integration** — works inside Claude Code, Cursor, Windsurf. Crucix is standalone.
- **Agent harness with LLM-orchestrated tool chains** — Crucix runs a fixed sweep cycle, not adaptive agent planning.
- **Founder operating profiler** — behavioral intelligence about how users work.
- **350+ domain-specific tools** — Crucix has 27 data sources, NodeBench has 350 tools.
- **Chat interface with follow-ups** — Crucix is dashboard-only, no conversational UX.
- **Multi-lens analysis** (founder/investor/banker/ceo/legal/student).
- **Decision Workbench** (Deep Sim scenarios, claim graphs, counter-models).
- **Proof engine** for validated workflow shortcuts.

**Critical gaps to close from Crucix:**

1. **Live data source sweep** — NodeBench should run a periodic sweep (like Crucix's 15-min cycle) that queries multiple data sources in parallel, computes deltas, and feeds the landing page auto-fire with REAL today-signals. This is the answer to "why is auto-fire not showing something actually relevant for the day."

2. **Delta engine** — a dedicated module that compares the current state of tracked entities against the previous snapshot and produces structured diffs: new signals, escalations, de-escalations, severity changes. This feeds "What Changed" with real computed deltas instead of demo data.

3. **Multi-tier alerting** — FLASH/PRIORITY/ROUTINE classification for signals that matter to the founder. "Your competitor just raised" = FLASH. "Market index moved 2%" = ROUTINE. Push to Telegram/Discord/email.

4. **More data sources** — beyond web_search and linkup, NodeBench should have structured data collectors for: GitHub Trending (repos in founder's space), HackerNews (top stories mentioning tracked entities), ProductHunt (new launches in category), Crunchbase/PitchBook (funding rounds), SEC EDGAR (filings), FRED (economic indicators), Yahoo Finance (market data).

5. **Self-contained source architecture** — each data source should be an independent module that exports a standard `collect()` function, runs standalone, and returns structured data. The sweep engine runs them all in parallel and feeds the delta engine.

## vs OpenBB (OpenBB-finance) — Financial Data Platform
**What they have:**
- **Open Data Platform (ODP)**: Standardized financial data API (FastAPI server)
- **Dozens of data providers**: Yahoo Finance, FRED, SEC, Bloomberg, etc.
- **OpenBB Workspace**: Professional analyst dashboard
- **Community-driven extensions**: Anyone can add data providers

**What we have that they don't:**
- **AI-native analysis** (OpenBB shows data, NodeBench analyzes it)
- **Agent orchestration** (OpenBB is data access, not agent coordination)
- **Founder-specific intelligence** (not just financial data)

**Key opportunity:** Integrate OpenBB as a data provider. NodeBench's harness could call OpenBB API tools for financial data, then synthesize with LLM analysis. Best of both worlds.

## What NodeBench Should Build Next

### 1. Live Signal Sweep Engine (from Crucix)
**The #1 gap.** NodeBench auto-fire rotates hardcoded entities. Crucix sweeps 27 sources every 15 minutes. NodeBench should:
- Build self-contained data source modules: `sources/hackernews.ts`, `sources/github_trending.ts`, `sources/producthunt.ts`, `sources/crunchbase.ts`, `sources/yahoo_finance.ts`
- Each exports `collect(): Promise<Signal[]>` with standardized output
- Sweep engine runs all sources in parallel every 30 minutes (or on-demand)
- Delta engine compares current vs previous sweep → new signals, escalations, de-escalations
- Top delta signal becomes the auto-fire entity on the landing page
- Multi-tier alerting: FLASH (competitor raised, market crash) / PRIORITY (new launch in space) / ROUTINE (minor movement)
- Convex persistence for sweep history + delta tracking

### 2. Crucix-Style Delta Engine
Dedicated module that tracks entity state over time:
- Previous snapshot: `{entity: "Anthropic", revenue: "$14B", marketShare: "70%", lastChecked: "2026-03-31"}`
- Current snapshot from today's sweep
- Delta: `{field: "revenue", from: "$14B", to: "$26B", direction: "up", magnitude: "85%", severity: "FLASH"}`
- Feed into Dashboard "What Changed" with REAL computed deltas, not demo data
- Feed into auto-fire: the entity with the biggest delta today is the landing page entity

### 3. Sub-Agent Architecture (from DeerFlow)
Replace single-harness with specialist agents:
- **ResearchAgent**: web_search + linkup + recon + data source sweep (parallel)
- **AnalysisAgent**: extract_variables + build_claim_graph + generate_countermodels
- **SynthesisAgent**: render_decision_memo + export_artifact_packet
- **ProfilerAgent**: logs everything, suggests optimizations
Each agent has its own context budget and can be dispatched independently.

### 4. OpenBB + Financial Data Integration
Add structured financial data alongside web intelligence:
- OpenBB API: `openbb_company_overview`, `openbb_financial_statements`, `openbb_analyst_estimates`
- Yahoo Finance: live prices for tracked entities (from Crucix pattern)
- FRED: economic indicators that affect the founder's market
- SEC EDGAR: filing alerts for tracked companies
This gives NodeBench real financial data, not just web snippets.

### 5. Agent Swarm for Complex Queries (from Claw-Code buddy)
For queries like "Compare Anthropic vs OpenAI vs Google DeepMind":
- Spawn 3 ResearchAgents in parallel (one per entity)
- Each gathers + analyzes independently
- SynthesisAgent merges all three into comparative packet
- ProfilerAgent tracks the whole swarm's cost

### 6. Long-Term Memory with Vector Retrieval (from DeerFlow)
Current session memory is SQLite key-value. Should be:
- Vector-indexed entity knowledge (embed every packet)
- Cross-session entity continuity ("Anthropic was at $14B revenue last time you checked")
- Drift detection ("Anthropic's market share changed from 40% to 70% since your last search")

### 7. Messaging Bot Integration (from Crucix)
Push intelligence to where founders actually are:
- Telegram bot: `/brief`, `/sweep`, `/alerts`, `/mute`
- Discord bot: rich embed alerts with severity color coding
- Slack webhook: for team-based founder workflows
- Semantic dedup so founders don't get the same alert twice

### 8. Recommendation Engine
Turn signals into actionable founder recommendations:
- "Stripe published MCP benchmark → you should integrate MCP into your product this week"
- "Your competitor raised Series B → accelerate your pitch timeline"
- "GitHub Copilot supports MCP → submit NodeBench to Copilot extensions marketplace"
- Recommendations scored by relevance to founder's company + stage + wedge
- LLM generates the recommendation, deterministic system validates and routes it
