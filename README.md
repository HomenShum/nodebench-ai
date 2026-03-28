# NodeBench AI

Operating intelligence for founders. Search any company, get a structured intelligence packet, delegate to your agents.

**Live:** [nodebenchai.com](https://www.nodebenchai.com)

---

## What it does

1. **Ask anything** — Type a company name, paste meeting notes, or ask a strategic question
2. **Get your answer** — A structured intelligence packet shaped for your role (founder, investor, banker, CEO, legal, student)
3. **Share and delegate** — Copy a shareable link, hand off to Claude Code, or delegate to your team

Every result includes: entity truth, signals, risks, contradictions, next actions, and source evidence.

## Quick start

```bash
# 1. Clone and install
git clone https://github.com/HomenShum/nodebench-ai.git
cd nodebench-ai
npm install

# 2. Set up environment
cp .env.example .env.local
# Add your GEMINI_API_KEY (required for search)

# 3. Run
npm run dev
# Open http://localhost:5191
```

### MCP server (use in Claude Code, Cursor, Windsurf)

```bash
# Claude Code
claude mcp add nodebench -- npx -y nodebench-mcp

# Cursor / Windsurf — add to MCP config:
{ "command": "npx", "args": ["-y", "nodebench-mcp"] }
```

## Architecture

```
Search / Upload → Entity extraction → Signals + Risks → Artifact Packet → Share / Delegate
```

### 7 pages

| Page | Path | Purpose |
|------|------|---------|
| **Ask** | `/` | Search, upload, get intelligence packets |
| **Memo** | `/deep-sim` | Decision workbench — variables, scenarios, interventions |
| **Research** | `/research` | Track what changed, daily brief, signals |
| **Workspace** | `/workspace` | Documents, notes |
| **Dashboard** | `/founder` | Company truth, what changed, next moves |
| **Coordination** | `/founder/coordination` | Peer presence, task delegation, messaging |
| **Entities** | `/founder/entities` | Competitors, partners, watchlist |

### Stack

- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Convex (real-time database + serverless functions)
- **Search:** Gemini (entity extraction) + Linkup (web search)
- **MCP server:** 350 tools across 57 domains (`packages/mcp-local/`)
- **Deployment:** Vercel (frontend + API) + Convex (backend)

### Key directories

```
src/                          # React frontend
  features/founder/           # Founder dashboard, coordination, entities
  features/controlPlane/      # Search canvas, result workspace
  features/research/          # Research hub, signals, briefing
packages/mcp-local/           # MCP server (350 tools)
server/                       # Express server (search API, shared context, sync bridge)
convex/                       # Convex backend (schema, operations, workflows)
```

## Environment variables

Only `GEMINI_API_KEY` is required for the search pipeline. See `.env.example` for all options.

| Variable | Required | Purpose |
|----------|----------|---------|
| `GEMINI_API_KEY` | Yes | Entity extraction + grounding |
| `VITE_CONVEX_URL` | For backend | Convex deployment URL |
| `LINKUP_API_KEY` | Recommended | Web search |
| `OPENAI_API_KEY` | Optional | Embedding fallback |
| `ELEVENLABS_API_KEY` | Optional | Voice output |

## Development

```bash
npm run dev              # Start Vite dev server (port 5191)
npm run build            # Production build
npx tsc --noEmit         # Type-check
npx vitest run           # Run tests (from packages/mcp-local/)
```

## License

MIT
