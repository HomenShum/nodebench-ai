# NodeBench AI

The local-first operating-memory and entity-context layer for agent-native businesses.

**Live:** [nodebenchai.com](https://www.nodebenchai.com) · **MCP:** `npx nodebench-mcp` · **Docs:** [/developers](https://www.nodebenchai.com/developers)

---

## Evolution

```
PHASE 0 ─── Genesis
"Can we build operating intelligence for founders?"
    │
    ├── Collaborative editor + early AI agents (Convex + Vite)
    ├── LLM-as-a-judge validation (50% → 100% pass rate)
    └── VDR-pattern dossiers, SEC disambiguation, news feeds
    ↓
PHASE 1 ─── Search Intelligence
"What if every company had a structured intelligence packet?"
    │
    ├── Multi-source search fusion (Linkup + Gemini + web)
    ├── 6 role lenses: Founder, Investor, Banker, CEO, Legal, Student
    ├── Entity extraction with Gemini Structured Output
    └── 4-layer grounding pipeline (claim verification → citation chain)
    ↓
PHASE 2 ─── Agent Harness
"Search alone isn't enough — agents need to orchestrate tool chains."
    │
    ├── LLM-planned execution: plan → parallel dispatch → synthesize
    ├── Multi-provider failover: Gemini → OpenAI → Anthropic
    ├── Monte Carlo 3-case financial simulation (bull/base/bear)
    ├── Context budgeting (DeerFlow pattern: per-tool char budget)
    └── Kilo Code-style auto model routing by task complexity
    ↓
PHASE 3 ─── MCP Distribution
"Meet users where they are — inside Claude Code, Cursor, Windsurf."
    │
    ├── 350+ MCP tools across 50 domains
    ├── Progressive discovery: starter (19 tools) → load_toolset → full (350)
    ├── Lazy-loading toolset registry (62K lines, only parse on demand)
    ├── CLI subcommands: discover, setup, workflow, quickref, call, demo
    └── WebSocket MCP Gateway with API key auth + rate limiting
    ↓
PHASE 4 ─── Founder Platform
"Founders don't just research — they need operating clarity."
    │
    ├── 5-surface cockpit: Ask, Decisions, Research, Docs, System
    ├── Decision Workbench with HCSN timing hierarchy
    ├── Founder Dashboard: 9 tabs, artifact packets, weekly reset
    ├── Research Hub with live daily brief + signal tracking
    └── Entity relationship graph + competitive landscape
    ↓
PHASE 5 ─── Credibility & Trust Layer
"Good companies are judged on people, trust, and hidden criteria."
    │
    ├── "Why This Team" — parallel Gemini credibility assessment
    │     Founder credibility · Trust signals · Vision magnitude
    │     Reinvention capacity · Hidden qualification requirements
    ├── Local context injection (CLAUDE.md + memory + git history)
    ├── Post-extraction entity verification (proper noun + phrase check)
    └── Confidence formula: 20-95 range based on web source quality
    ↓
PHASE 6 ─── Agent Workspace
"Agents need persistent memory — skills, rules, tasks, research."
    │
    ├── 6 MCP workspace tools: write, read, list, mkdir, research, tasks
    ├── Implementation packet system (draft → approved → executing → completed)
    ├── WorkspaceExplorer UI: Agents → Workspace → Documents → Schedule → Roadmap
    ├── Local-first storage (~/.nodebench/workspace/) with platform sync
    └── All views agent-aware: Agent Artifacts, Agent Schedule, Agent Roadmap
    ↓
PHASE 7 ─── Intelligence → Execution Loop
"NodeBench decides WHAT to build. Claude Code executes."
    │
    ├── Implementation packets: objective, scope, constraints, validation
    ├── Claude Code bridge: structured prompt → Messages API → parsed result
    ├── Execution API: POST /api/execute → background dispatch → status polling
    ├── Validation layer: diff check, test check, constraint check, cost tracking
    └── PWA auto-reload on deploy (controllerchange listener)
    ↓
PHASE 8 ─── What's Next
    │
    ├── KAIROS-style tick loop: always-on background monitoring
    ├── MCP proxy integration layer (zero-code-change interception)
    ├── Trajectory replay: save paths, replay with checkpoints, fallback on drift
    ├── Workflow compression: learn shortest cheapest valid path
    └── Team/enterprise: shared context, approval queues, cost governance
```

---

## Quick Start

```bash
# Clone and install
git clone https://github.com/HomenShum/nodebench-ai.git
cd nodebench-ai && npm install

# Set up environment
cp .env.example .env.local
# Add GEMINI_API_KEY (required for search)

# Run
npm run dev          # Frontend (Vite)
npx nodebench-mcp   # MCP server (standalone)
```

### MCP Install (Claude Code / Cursor / Windsurf)

```bash
claude mcp add nodebench -- npx -y nodebench-mcp@latest
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  NODEBENCH AI APP                       │
│  Ask · Decisions · Research · Docs · Dashboard          │
│  Search → Intelligence Packet → Action                  │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────┐
│              AGENT HARNESS + SEARCH ROUTE               │
│  LLM classification → Plan → Parallel execution →      │
│  Synthesis → Why This Team → Monte Carlo → Validation   │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────┐
│                  MCP TOOL LAYER                         │
│  350 tools · 50 domains · Progressive discovery         │
│  web_search · linkup · enrich_entity · simulate · etc.  │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────┐
│              WORKSPACE + EXECUTION                      │
│  Skills · Rules · Tasks · Research · Implementation     │
│  Claude Code bridge · Packet lifecycle · Validation     │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────┐
│              PERSISTENCE                                │
│  Local: ~/.nodebench/ (SQLite + workspace files)        │
│  Cloud: Convex (documents, files, missions, agents)     │
│  Sync: local-first, Convex when available               │
└─────────────────────────────────────────────────────────┘
```

---

## Key Surfaces

| Surface | URL | What |
|---------|-----|------|
| **Ask** | `/?surface=ask` | Search any company, get structured intelligence with credibility layer |
| **Decisions** | `/?surface=memo` | Decision Workbench — map variables, compare branches, surface next move |
| **Research** | `/?surface=research` | Live daily brief, signal tracking, forecast context |
| **Docs** | `/?surface=editor` | Agent Artifacts, Workspace, Schedule, Roadmap |
| **Dashboard** | `/?surface=ask&view=founder-dashboard` | 9-tab founder operating cockpit |

---

## Design DNA

- Glass cards: `border-white/[0.06] bg-white/[0.02]`
- Warm terracotta accent: `#d97757`
- Typography: Manrope (UI) + JetBrains Mono (data)
- Background: `--bg-primary: #151413`
- Section headers: `text-[11px] uppercase tracking-[0.2em]`

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite + Tailwind CSS + Recharts |
| Backend | Convex (real-time DB + serverless functions) |
| Server | Express + WebSocket MCP Gateway |
| Search | Gemini 3.1 Flash + Linkup + web_search |
| Models | Gemini (primary) → OpenAI GPT-5.4 (fallback) → Anthropic (bridge) |
| MCP | 350 tools, lazy-loaded, progressive discovery |
| Storage | SQLite (local) + Convex (cloud) + filesystem workspace |
| Deploy | Vercel (frontend + serverless) + PWA |

---

## License

MIT

---

Built by [Homen Shum](https://github.com/HomenShum) · Banking + Data Engineering + Agentic AI
