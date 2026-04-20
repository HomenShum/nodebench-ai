# NodeBench MCP

[![npm version](https://img.shields.io/npm/v/nodebench-mcp.svg)](https://www.npmjs.com/package/nodebench-mcp)
[![npm downloads](https://img.shields.io/npm/dm/nodebench-mcp.svg)](https://www.npmjs.com/package/nodebench-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![GitHub stars](https://img.shields.io/github/stars/HomenShum/nodebench-ai.svg)](https://github.com/HomenShum/nodebench-ai)
[![MCP Compatible](https://img.shields.io/badge/MCP-Compatible-green.svg)](https://modelcontextprotocol.io)
[![Default](https://img.shields.io/badge/Default-9%20visible-brightgreen.svg)](https://www.npmjs.com/package/nodebench-mcp)

**Investigate a topic and return a sourced report fast.** The NodeBench MCP architecture is now split into three install lanes that share one runtime.

Default install: `9` visible tools total, including `7` core workflow tools:
`investigate`, `compare`, `track`, `summarize`, `search`, `report`, and `ask_context`.

```bash
# Core workflow lane
claude mcp add nodebench -- npx -y nodebench-mcp

# Power lane
claude mcp add nodebench-power -- npx -y nodebench-mcp-power

# Admin lane
claude mcp add nodebench-admin -- npx -y nodebench-mcp-admin
```

### What's New

- **v3 default surface** - the default preset is now a workflow-first facade instead of a tool warehouse.
- **Admin-only runtime gates** - dashboards and the observability watchdog no longer start on the default hot path. Use `--admin`, `--dashboards`, or `--watchdog` explicitly.
- **Faster health path** - `--health` now loads only the active preset instead of eagerly loading every domain.
- **Separate install lanes** - `nodebench-mcp-power` and `nodebench-mcp-admin` are now published companion packages, while `--preset power` and `--preset admin` remain compatible paths on the core package.

> **New here?** Read **[AGENT_LOGIC.md](./AGENT_LOGIC.md)** for the complete guide to how NodeBench thinks.

---

## RETHINK REDESIGN APR 2026

This section records a repo-grounded reexamination of NodeBench MCP as of April 2026. It is intentionally blunt. The goal is to shrink the product to clear, measurable workflows and make the runtime and claims trustworthy.

### Repo-grounded findings

- **Surface area and messaging were out of sync**
  - At the time of this audit, the README marketed `350+ tools`, `founder` under `50` tools, and `full` as `338`.
  - The audit that drove this section measured roughly `28` tools in the starter `tools/list` payload, roughly `186` in `founder`, and roughly `546` in `full`, before counting the extra dynamic-loading helpers separately.
- **The core executable is overloaded**
  - `packages/mcp-local/src/index.ts` currently combines MCP serving, analytics tracking, embedding bootstrapping, profiling hooks, A/B instrumentation, dynamic tool loading, dashboard startup, and engine hosting in one runtime path.
- **Performance is not yet credibly measured**
  - During this audit, `node packages/mcp-local/dist/index.js --health` took about `2.9s` locally because CLI mode eagerly loaded all toolsets before exit.
  - The main performance comparison in the package measures local toolchain overhead, not end-user outcome quality, startup SLOs, workflow completion, or real provider spend.
- **Cost reporting is not yet auditable**
  - The current profiler relies on heuristic per-tool cost estimates, not authoritative provider billing or exact token accounting.
- **Workflow clarity is weak**
  - The product currently explains presets, domains, discovery engines, and meta-systems before it proves one concrete job to be done.

### Redesign principles

1. **One dominant workflow per persona**
   - A founder should land on one obvious path.
   - A banker should land on one obvious path.
   - The MCP should prove value before it explains its architecture.
2. **Truthful counts and truthful claims**
   - Preset docs, README counts, and `tools/list` output must agree.
3. **Speed is a product behavior**
   - Measure startup time, `tools/list` payload size, per-tool latency, and workflow time-to-first-value.
4. **Keep optional systems out of the hot path**
   - Embeddings, dashboards, profilers, and engine surfaces should not make the default MCP startup slower.
5. **Prefer workflows over catalogs**
   - Opinionated, repeatable outcomes are more valuable than an oversized flat tool inventory.
6. **Ship process, not prose**
   - The right mental model is a small number of strong workflows with evidence and verification, not a giant capabilities brochure.

### Execution board

| Ship order | Cause | Symptom in NodeBench | Metric to enforce |
| --- | --- | --- | --- |
| 1 | No single dominant job | The package reads like "everything MCP" instead of one clear wedge | Every persona entry point must answer the main job in one sentence |
| 2 | Tool surface is not truthful | README counts and runtime counts disagree | Published counts must match `tools/list` within 5% |
| 3 | Workflow is hidden behind tool volume | Users see presets, domains, and discovery systems before a clear task path | One canonical workflow per persona, completable in 3 to 5 tool calls |
| 4 | Performance is claimed, not instrumented | Benchmarks focus on harness overhead, not real user value | Track startup p50/p95, `tools/list` bytes, per-tool latency, workflow success, and real spend |
| 5 | Hot path contains optional systems | Profiling, embeddings, dashboards, and engine behavior sit in the main boot path | `--health` under 300ms and stdio ready under 500ms on warm start |
| 6 | Benchmarking is inward-facing | The package proves bookkeeping more than business outcomes | Benchmark by artifact quality, time-to-artifact, cost-per-artifact, and reuse rate |

### Reference models

- **[agent-skills](https://github.com/addyosmani/agent-skills)**: process, not prose. Strong lifecycle commands, checkpoints, and evidence requirements.
- **[GitHub MCP Server](https://github.com/github/github-mcp-server)**: narrower toolsets improve tool choice and reduce context size. The server also exposes a simple `tool-search` utility.
- **[Google MCP Toolbox](https://github.com/googleapis/mcp-toolbox)**: performance and operability are anchored in concrete runtime primitives such as connection pooling and OpenTelemetry, not only internal heuristics.

### Bottom line

NodeBench MCP should evolve from a monolithic "hundreds of tools" surface into a smaller number of opinionated workflow products backed by a measurable, trustworthy runtime.

Unified cross-surface spec: [`docs/architecture/UNIFIED_WORKFLOW_SPEC.md`](../../docs/architecture/UNIFIED_WORKFLOW_SPEC.md)

Production companion spec: [`docs/architecture/UNIFIED_WEB_MCP_PRODUCTION_SPEC.md`](../../docs/architecture/UNIFIED_WEB_MCP_PRODUCTION_SPEC.md)

Founder MCP flow spec: [`docs/architecture/FOUNDER_MCP_FLOW_SPEC.md`](../../docs/architecture/FOUNDER_MCP_FLOW_SPEC.md)

---

## What You Get

NodeBench is now a workflow-first MCP. The default install proves one concrete job quickly, and the heavier surfaces are still available when you explicitly ask for them.

### Install Lanes And Presets

| Entry | Surface | What it is for |
|---|---|---|
| `nodebench-mcp` | `9` visible tools | Workflow-first lane: `investigate`, `compare`, `track`, `summarize`, `search`, `report`, `ask_context`, `discover_tools`, `load_toolset` |
| `nodebench-mcp-power` | expanded workflow surface | Founder, recon, packets, and web-heavy workflows without admin runtime |
| `nodebench-mcp-admin` | operator surface | Profiling, observability, dashboards, eval, and debug-oriented lanes |
| `core` | full methodology lane | Verification, eval, learning, recon, execution trace, and mission harness |
| `founder` | compatibility preset | Legacy founder-facing pack kept for existing setups |
| `full` | all loaded domains | Maximum coverage when you explicitly want the warehouse |

### Default workflow

```text
ASK -> CHECK -> WRITE -> SAVE
```

The default preset is optimized for that loop. It does not start local dashboards or the observability watchdog unless you pass admin flags explicitly.

```bash
# Claude Code core lane
claude mcp add nodebench -- npx -y nodebench-mcp

# Claude Code power lane
claude mcp add nodebench-power -- npx -y nodebench-mcp-power

# Claude Code admin lane
claude mcp add nodebench-admin -- npx -y nodebench-mcp-admin

# Windsurf / Cursor - add --preset to args only when you want a compatibility preset on the core package
```

---

## Quick Start

### Claude Code (CLI)

```bash
claude mcp add nodebench -- npx -y nodebench-mcp
claude mcp add nodebench-power -- npx -y nodebench-mcp-power
claude mcp add nodebench-admin -- npx -y nodebench-mcp-admin
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
    "nodebench-power": {
      "command": "npx",
      "args": ["-y", "nodebench-mcp-power"]
    }
  }
}
```

### Other MCP Clients

Any MCP-compatible client works. Point `command` to `npx` and choose the package that matches the lane you want:

- `["-y", "nodebench-mcp"]` for the tiny default workflow lane
- `["-y", "nodebench-mcp-power"]` for the expanded founder/research lane
- `["-y", "nodebench-mcp-admin"]` for the operator lane

Add `"--preset", "<name>"` only when you want a compatibility preset on the core package.

### First Prompts to Try

```
# Research a topic
> Use investigate with topic="Anthropic" to produce a sourced report

# Compare two entities
> Use compare with entities=["Anthropic","OpenAI"] to get a side-by-side brief

# Turn rough notes into a report
> Use report with topic="AI agent infrastructure" and context="..." to produce a decision memo

# Search live web + saved knowledge
> Use search with query="MCP server best practices 2026"

# Track an entity
> Use track with action="add" and entity="Anthropic"

# Expand only when you need more
> Use discover_tools("visual QA for a Vite app"), then load_toolset("ui_ux_dive")
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

## Progressive Discovery â€” How Optional Toolsets Stay Off the Hot Path

The default preset exposes `9` tools. Everything else stays off the hot path until you deliberately load a specific toolset.

### How it works

```
1. discover_tools("your task description")    â†’ ranked results from the full registry
2. load_toolset("ui_ux_dive")                 â†’ a specific toolset activates in your session
3. Use the newly loaded tools directly        â†’ no proxy, native binding
4. Keep the default surface small             â†’ only load what the workflow needs
```

### Multi-modal search engine

`discover_tools` scores tools using 14 parallel strategies:

| Strategy | What it does |
|---|---|
| Keyword + TF-IDF | Exact matching, rare tags score higher |
| Fuzzy (Levenshtein) | Tolerates typos |
| Semantic (synonyms) | 30 word families â€” "check" finds "verify", "validate" |
| N-gram + Bigram | Partial words and phrases |
| Dense (TF-IDF cosine) | Vector-like ranking |
| Embedding (neural) | Agent-as-a-Graph bipartite search |
| Execution traces | Co-occurrence mining from usage logs |
| Intent pre-filter | Narrow to relevant categories before search |

Plus cursor pagination (`offset`/`limit`), result expansion (`expand: N`), and multi-hop BFS traversal (`depth: 1-3`) via `get_tool_quick_ref`.

### Client compatibility

| Client | Recommended path |
|---|---|
| Claude Code, GitHub Copilot | Default preset + `discover_tools` / `load_toolset` |
| Cursor | `--preset cursor` to stay within its tool cap |
| Windsurf, Claude Desktop, Gemini CLI | Use `--preset power` or a targeted preset if your client does not refresh tools reliably |

---

## Key Features

### Decision Intelligence (Deep Sim)

Simulate decisions before committing. Run scenarios with multiple variables, score trajectories, generate postmortems, produce decision memos.

### Causal Memory

Track actions, paths, and state across sessions. Important-change review surfaces what shifted since your last session.

### Artifact Packets

Every analysis produces a shareable artifact â€” decision memos, delegation briefs, investigation reports. The output is the distribution.

### Founder Tools

Weekly reset, pre-delegation briefing, company tracking, important-change review. Built for the founder who needs to make 20 decisions a day with incomplete information.

### Knowledge Compounding

`record_learning` + `search_all_knowledge` â€” findings persist across sessions. By session 9, the agent finds 2+ relevant prior findings before writing a single line of code.

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

# Dynamic loading â€” start minimal, load on demand
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

### TOON Format â€” Token Savings

TOON (Token-Oriented Object Notation) is on by default. Every tool response is TOON-encoded for ~40% fewer tokens vs JSON. Disable with `--no-toon`.

---

## Security & Trust Boundaries

NodeBench MCP runs locally on your machine.

- Local runtime data lives under `~/.nodebench/`. Native SQLite is used when the addon is available; lightweight mode skips the native persistence layer. No data is sent to external servers unless you provide API keys and use tools that call external APIs.
- Analytics data never leaves your machine.
- The `local_file` toolset can read files anywhere your Node.js process has permission. Use the `default` preset to keep local-file tools off the hot path.
- All API keys read from environment variables â€” never hardcoded or logged.
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

**"No search provider available"** â€” Set `GEMINI_API_KEY`, `OPENAI_API_KEY`, or `PERPLEXITY_API_KEY`

**"GitHub API error 403"** â€” Set `GITHUB_TOKEN` for higher rate limits

**"Cannot find module"** â€” Run `npm run build` in the mcp-local directory

**MCP not connecting** â€” Check path is absolute, run `claude --mcp-debug`, ensure Node.js >= 18

**Windsurf not finding tools** â€” Verify `~/.codeium/windsurf/mcp_config.json` has correct JSON structure

**Cursor tools not loading** â€” Ensure `.cursor/mcp.json` exists in project root. Use `--preset cursor` to stay within the tool cap. Restart Cursor after config changes.

**Dynamic loading not working** â€” Claude Code and GitHub Copilot support native dynamic loading. For Windsurf/Cursor, prefer `--preset cursor` or `--preset power` if your client does not refresh tools reliably after `load_toolset`.

---

## License

MIT


