# NodeBench MCP

[![npm version](https://img.shields.io/npm/v/nodebench-mcp.svg)](https://www.npmjs.com/package/nodebench-mcp)
[![npm downloads](https://img.shields.io/npm/dm/nodebench-mcp.svg)](https://www.npmjs.com/package/nodebench-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![GitHub stars](https://img.shields.io/github/stars/HomenShum/nodebench-ai.svg)](https://github.com/HomenShum/nodebench-ai)
[![MCP Compatible](https://img.shields.io/badge/MCP-Compatible-green.svg)](https://modelcontextprotocol.io)
[![Tools](https://img.shields.io/badge/Tools-338-orange.svg)](https://www.npmjs.com/package/nodebench-mcp)

**Operating intelligence for founders, bankers, researchers, and operators. Turn messy context into decision-ready packets, memos, and delegation briefs.**

350 tools across 57 domains. You start with 15 (starter preset). Call `discover_tools` to find what you need, then `load_toolset` to activate it. No context bloat, no IDE crashes.

> **New here?** Read **[AGENT_LOGIC.md](./AGENT_LOGIC.md)** for the complete plain-English guide to how NodeBench thinks — what happens when you say "What changed this week?" or "Analyze Anthropic", the full decision tree, fallback chain, and cost estimates.

```bash
# Starter preset (15 tools) — decision intelligence + progressive discovery
claude mcp add nodebench -- npx -y nodebench-mcp

# Founder preset (~40 tools) — decision intelligence, company tracking, session memory
claude mcp add nodebench -- npx -y nodebench-mcp --preset founder

# All 338 tools
claude mcp add nodebench -- npx -y nodebench-mcp --preset full
```

---

## What You Get

NodeBench is a decision-intelligence layer for your AI coding agent. Instead of dumping 300+ tools into context, you start with a tight starter set and expand on demand.

### Starter Preset (default, 15 tools)

Decision intelligence core + progressive discovery. Enough to run Deep Sim scenarios, generate decision memos, and discover/load any of the 338 tools when needed.

| Domain | What it does |
|---|---|
| **Decision Intelligence (Deep Sim)** | Simulate decisions, run postmortems, score trajectories, generate decision memos |
| **Progressive Discovery** | `discover_tools` (14-strategy hybrid search), `get_tool_quick_ref` (multi-hop BFS), `get_workflow_chain` |
| **Dynamic Loading** | `load_toolset` / `unload_toolset` — activate any toolset mid-session |

### Persona Presets (all under 50 tools — IDE-safe)

| Preset | Tools | What it adds | Best for |
|---|---|---|---|
| `founder` | ~40 | Company tracking, session memory, local dashboard, weekly reset, delegation briefs | Solo founders, CEOs making daily decisions |
| `banker` | ~39 | Company profiling, web research, recon, risk assessment | Due diligence, deal evaluation, market analysis |
| `operator` | ~40 | Company tracking, causal memory, action tracing, important-change review | COOs, ops leads tracking execution |
| `researcher` | ~32 | Web search, recon, session memory | Analysts, research-heavy workflows |

### Task Presets (specialized toolsets)

| Preset | Tools | Use case |
|---|---|---|
| `core` | ~81 | Full verification flywheel — recon, eval, quality gates, knowledge |
| `web_dev` | 150 | Web projects — vision, UI capture, SEO, git workflow, PR reports |
| `research` | 115 | Research workflows — web search, RSS, LLM, docs |
| `data` | 122 | Data analysis — CSV/XLSX/PDF/DOCX/JSON parsing, LLM |
| `devops` | 92 | CI/CD — git compliance, benchmarks, pattern mining |
| `mobile` | 126 | Mobile apps — vision, flicker detection, UI/UX analysis |
| `academic` | 113 | Academic papers — research writing, translation, citation |
| `multi_agent` | 136 | Parallel agents — task locks, roles, context budget, self-eval |
| `content` | 115 | Content pipelines — LLM, email, RSS, publishing |
| `cursor` | 28 | Cursor IDE — fits within Cursor's tool cap |
| `full` | 338 | Everything |

```bash
# Claude Code
claude mcp add nodebench -- npx -y nodebench-mcp --preset founder

# Windsurf / Cursor — add --preset to args in your MCP config
```

---

## Quick Start

### Claude Code (CLI)

```bash
claude mcp add nodebench -- npx -y nodebench-mcp
```

Or add to `~/.claude/settings.json` or `.mcp.json` in your project root:

```json
{
  "mcpServers": {
    "nodebench": {
      "command": "npx",
      "args": ["-y", "nodebench-mcp"]
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json` (or Settings > MCP). Use the `cursor` preset to stay within Cursor's tool limit:

```json
{
  "mcpServers": {
    "nodebench": {
      "command": "npx",
      "args": ["-y", "nodebench-mcp", "--preset", "cursor"]
    }
  }
}
```

### Windsurf

Add to `.windsurf/mcp.json` (or Settings > MCP > View raw config):

```json
{
  "mcpServers": {
    "nodebench": {
      "command": "npx",
      "args": ["-y", "nodebench-mcp", "--preset", "founder"]
    }
  }
}
```

### Other MCP Clients

Any MCP-compatible client works. Point `command` to `npx`, `args` to `["-y", "nodebench-mcp"]`. Add `"--preset", "<name>"` to the args array for presets.

### First Prompts to Try

```
# Find tools for your task
> Use discover_tools("evaluate this acquisition target") to find relevant tools

# Load a toolset
> Use load_toolset("deep_sim") to activate decision simulation tools

# Run a decision simulation
> Use run_deep_sim_scenario to simulate a business decision with multiple variables

# Generate a decision memo
> Use generate_decision_memo to produce a shareable memo from your analysis

# Weekly founder reset
> Use founder_weekly_reset to review the week's decisions and outcomes

# Pre-delegation briefing
> Use pre_delegation_briefing to prepare context before handing off a task
```

### Optional: API Keys

```bash
export GEMINI_API_KEY="your-key"        # Web search + vision (recommended)
export GITHUB_TOKEN="your-token"        # GitHub (higher rate limits)
```

Set these as environment variables, or add them to the `env` block in your MCP config:

```json
{
  "mcpServers": {
    "nodebench": {
      "command": "npx",
      "args": ["-y", "nodebench-mcp"],
      "env": {
        "GEMINI_API_KEY": "your-key",
        "GITHUB_TOKEN": "your-token"
      }
    }
  }
}
```

---

## Progressive Discovery — How 338 Tools Fit in Any Context Window

The starter preset loads 15 tools. The other 323 are discoverable and loadable on demand.

### How it works

```
1. discover_tools("your task description")    → ranked results from all 338 tools
2. load_toolset("deep_sim")                   → tools activate in your session
3. Use the tools directly                     → no proxy, native binding
4. unload_toolset("deep_sim")                 → free context budget when done
```

### Multi-modal search engine

`discover_tools` scores tools using 14 parallel strategies:

| Strategy | What it does |
|---|---|
| Keyword + TF-IDF | Exact matching, rare tags score higher |
| Fuzzy (Levenshtein) | Tolerates typos |
| Semantic (synonyms) | 30 word families — "check" finds "verify", "validate" |
| N-gram + Bigram | Partial words and phrases |
| Dense (TF-IDF cosine) | Vector-like ranking |
| Embedding (neural) | Agent-as-a-Graph bipartite search |
| Execution traces | Co-occurrence mining from usage logs |
| Intent pre-filter | Narrow to relevant categories before search |

Plus cursor pagination (`offset`/`limit`), result expansion (`expand: N`), and multi-hop BFS traversal (`depth: 1-3`) via `get_tool_quick_ref`.

### Client compatibility

| Client | Dynamic Loading |
|---|---|
| Claude Code, GitHub Copilot | Native — re-fetches tools after `list_changed` |
| Windsurf, Cursor, Claude Desktop, Gemini CLI | Via `call_loaded_tool` fallback (always available) |

---

## Key Features

### Decision Intelligence (Deep Sim)

Simulate decisions before committing. Run scenarios with multiple variables, score trajectories, generate postmortems, produce decision memos.

### Causal Memory

Track actions, paths, and state across sessions. Important-change review surfaces what shifted since your last session.

### Artifact Packets

Every analysis produces a shareable artifact — decision memos, delegation briefs, investigation reports. The output is the distribution.

### Founder Tools

Weekly reset, pre-delegation briefing, company tracking, important-change review. Built for the founder who needs to make 20 decisions a day with incomplete information.

### Knowledge Compounding

`record_learning` + `search_all_knowledge` — findings persist across sessions. By session 9, the agent finds 2+ relevant prior findings before writing a single line of code.

---

## Headless Engine API

NodeBench ships a headless, API-first engine for programmatic access.

```bash
# Start MCP server with engine API on port 6276
npx nodebench-mcp --engine

# With auth token
npx nodebench-mcp --engine --engine-secret "your-token"
```

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/` | Engine status, tool count, uptime |
| GET | `/api/health` | Health check |
| GET | `/api/tools` | List all available tools |
| POST | `/api/tools/:name` | Execute a single tool |
| GET | `/api/workflows` | List workflow chains |
| POST | `/api/workflows/:name` | Execute a workflow (SSE streaming) |
| POST | `/api/sessions` | Create an isolated session |
| GET | `/api/sessions/:id` | Session status + call history |
| GET | `/api/sessions/:id/report` | Conformance report |
| GET | `/api/presets` | List presets with tool counts |

---

## Fine-Grained Control

```bash
# Include only specific toolsets
npx nodebench-mcp --toolsets deep_sim,recon,learning

# Exclude heavy toolsets
npx nodebench-mcp --exclude vision,ui_capture,parallel

# Dynamic loading — start minimal, load on demand
npx nodebench-mcp --dynamic

# Smart preset recommendation based on your project
npx nodebench-mcp --smart-preset

# Usage stats
npx nodebench-mcp --stats

# List all presets
npx nodebench-mcp --list-presets

# See all options
npx nodebench-mcp --help
```

### TOON Format — Token Savings

TOON (Token-Oriented Object Notation) is on by default. Every tool response is TOON-encoded for ~40% fewer tokens vs JSON. Disable with `--no-toon`.

---

## Security & Trust Boundaries

NodeBench MCP runs locally on your machine.

- All persistent data stored in `~/.nodebench/` (SQLite). No data sent to external servers unless you provide API keys and use tools that call external APIs.
- Analytics data never leaves your machine.
- The `local_file` toolset can read files anywhere your Node.js process has permission. Use the `starter` preset to restrict file system access.
- All API keys read from environment variables — never hardcoded or logged.
- All database queries use parameterized statements.

---

## Build from Source

```bash
git clone https://github.com/HomenShum/nodebench-ai.git
cd nodebench-ai/packages/mcp-local
npm install && npm run build
```

Then use absolute path:

```json
{
  "mcpServers": {
    "nodebench": {
      "command": "node",
      "args": ["/path/to/packages/mcp-local/dist/index.js"]
    }
  }
}
```

---

## Troubleshooting

**"No search provider available"** — Set `GEMINI_API_KEY`, `OPENAI_API_KEY`, or `PERPLEXITY_API_KEY`

**"GitHub API error 403"** — Set `GITHUB_TOKEN` for higher rate limits

**"Cannot find module"** — Run `npm run build` in the mcp-local directory

**MCP not connecting** — Check path is absolute, run `claude --mcp-debug`, ensure Node.js >= 18

**Windsurf not finding tools** — Verify `~/.codeium/windsurf/mcp_config.json` has correct JSON structure

**Cursor tools not loading** — Ensure `.cursor/mcp.json` exists in project root. Use `--preset cursor` to stay within the tool cap. Restart Cursor after config changes.

**Dynamic loading not working** — Claude Code and GitHub Copilot support native dynamic loading. For Windsurf/Cursor, use `call_loaded_tool` as a fallback.

---

## License

MIT
