# NodeBench AI

Entity intelligence for any company, market, or question.

**Live:** [nodebenchai.com](https://www.nodebenchai.com) · **npm:** `npx nodebench-mcp` · **GitHub:** [HomenShum/nodebench-ai](https://github.com/HomenShum/nodebench-ai)

---

## What It Does

Search any company. Get a decision-ready intelligence packet with people, timeline, financials, competitive landscape, product intelligence, and risk flags — shaped for your role (founder, investor, banker, CEO, legal, student).

- **Deep diligence**: 6 parallel research branches, each chaining up to 3 levels deep
- **Gap remediation**: Every risk comes with actionable steps, effort estimates, and expected outcomes
- **SEO audit**: Automatic discoverability scoring with missing-presence detection
- **Self-search**: Search your own company — NodeBench injects your local context for honest self-assessment

## Quick Start

### Option 1: Use the Web App

Go to [nodebenchai.com](https://www.nodebenchai.com) and search.

### Option 2: Connect via MCP (Claude Code / Cursor / Windsurf)

```bash
# Claude Code (one command)
claude mcp add nodebench -- npx -y nodebench-mcp --preset founder

# Cursor
npx nodebench-mcp --preset cursor

# Any MCP client
npx nodebench-mcp --preset starter
```

That's it. NodeBench starts with 15 tools and discovers more as you need them.

### Option 2b: Claude Code Plugin (slash commands + Codex delegation)

```bash
/plugin marketplace add HomenShum/nodebench-ai
/plugin install nodebench@nodebench
/reload-plugins
/nodebench:setup
```

Commands: `/nodebench:search`, `/nodebench:diligence`, `/nodebench:remediate`, `/nodebench:packet`

With [Codex plugin](https://github.com/openai/codex-plugin-cc) installed, `/nodebench:remediate --delegate` sends gap fixes to Codex for background implementation.

### Option 3: Run Everything Locally

```bash
git clone https://github.com/HomenShum/nodebench-ai.git
cd nodebench-ai
npm install
cp .env.example .env.local  # Add your API keys

# Start the app
npm run dev                  # Frontend (Vite, port 5191)
npx convex dev               # Backend (Convex)

# Or just the MCP server
cd packages/mcp-local && npx tsx src/index.ts
```

## Claude Code Setup Guide

After running `claude mcp add nodebench -- npx -y nodebench-mcp --preset founder`, Claude Code can guide itself. Here's what to tell it:

```
I have NodeBench MCP connected. Help me:

1. Run `discover_tools` to see what's available
2. Search my company: use `web_search` + `enrich_entity` for "[Your Company]"
3. Get my weekly reset: use `founder_local_weekly_reset`
4. Analyze a competitor: use `run_recon` for "[Competitor Name]"
```

### Presets

| Preset | Tools | Best for |
|--------|-------|----------|
| `starter` | 15 | First-time users, any IDE |
| `founder` | ~40 | Founders — weekly reset, delegation, company truth |
| `banker` | ~40 | Bankers — diligence, credit memo, risk analysis |
| `cursor` | 28 | Cursor IDE (fits tool cap) |
| `full` | 350+ | Power users — everything |

## Architecture

```
nodebenchai.com (React + Vite + Tailwind)
    ↓
Convex Cloud (realtime DB + 10-min actions + durable workflows)
    ↓
Deep Diligence Pipeline:
  Entity Resolution → 6 Parallel Branches → Chained Depth (3 levels)
    ├── People & Leadership
    ├── Company History & Timeline
    ├── Financials & Metrics
    ├── Market & Competitive
    ├── Products & Technology
    └── Risks & Diligence Flags
    ↓
Gap Remediation → SEO Audit → Actionable Next Steps
    ↓
Result Packet (realtime via Convex subscription)
```

### Key Tech

- **Frontend**: React, Vite, TypeScript, Tailwind CSS
- **Backend**: Convex (realtime database, serverless functions, durable workflows)
- **Search**: Linkup API + Gemini 3.1 extraction + 4-layer grounding pipeline
- **MCP Server**: Node.js, TypeScript, better-sqlite3, 350+ tools across 57 domains
- **Design**: Glass cards, terracotta `#d97757`, Manrope + JetBrains Mono

## API Keys

Set these in `.env.local` (local dev) or Convex environment (production):

| Key | Required | Purpose |
|-----|----------|---------|
| `GEMINI_API_KEY` | Yes | Gemini 3.1 for classification, extraction, synthesis |
| `LINKUP_API_KEY` | Recommended | Deep web search with sourced answers |
| `VITE_CONVEX_URL` | Yes (app) | Convex deployment URL |

```bash
# Set Convex env vars
npx convex env set GEMINI_API_KEY "your-key"
npx convex env set LINKUP_API_KEY "your-key"
```

## Project Structure

```
nodebench-ai/
├── src/                          # React frontend
│   ├── features/                 # Feature modules (controlPlane, founder, monitoring)
│   ├── hooks/useConvexSearch.ts  # Convex search hook (realtime polling)
│   └── layouts/                  # App shell, surface routing
├── convex/                       # Convex backend
│   ├── domains/search/           # Deep diligence pipeline
│   │   ├── searchPipeline.ts     # Mutations + queries (start, get, cache)
│   │   ├── searchPipelineNode.ts # Quick search action
│   │   └── deepDiligence.ts      # 6-branch deep diligence + remediation
│   └── schema.ts                 # Database schema (50+ tables)
├── packages/mcp-local/           # MCP server (npm: nodebench-mcp)
│   ├── src/tools/                # 350+ tool implementations
│   ├── src/subconscious/         # Memory blocks, graph engine, whisper policy
│   └── src/toolsetRegistry.ts    # Lazy-loading tool domains
├── server/                       # Express server (local dev + Vercel)
│   ├── routes/search.ts          # SSE search (Vercel fallback)
│   └── agentHarness.ts           # Agent orchestration
└── docs/architecture/            # Specs and analysis
```

## License

MIT
