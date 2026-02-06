# NodeBench MCP Server

A fully local, zero-config MCP server with **72 tools** for AI-powered development workflows.

**Features:**
- Web search (Gemini/OpenAI/Perplexity)
- GitHub repository discovery and analysis
- Job market research
- AGENTS.md self-maintenance
- AI vision for screenshot analysis
- 6-phase verification flywheel
- Self-reinforced learning (trajectory analysis, health reports, improvement recommendations)
- Autonomous agent bootstrap and self-maintenance
- Parallel agent teams (task locking, role specialization, oracle testing, context budget)
- SQLite-backed learning database

## Quick Start (30 seconds)

### Option A: Claude Code CLI (recommended)

```bash
claude mcp add nodebench -- npx -y nodebench-mcp
```

That's it. One command, 72 tools. No restart needed.

### Option B: Manual config

Add to `~/.claude/settings.json` (global) or `.claude.json` (per-project):

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

Then restart Claude Code.

---

## Alternative: Build from source

```bash
git clone https://github.com/nodebench/nodebench-ai.git
cd nodebench-ai/packages/mcp-local
npm install && npm run build
```

Then use absolute path in settings:

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

### 3. Add API keys (optional but recommended)

Add to your shell profile (`~/.bashrc`, `~/.zshrc`, or Windows Environment Variables):

```bash
# Required for web search (pick one)
export GEMINI_API_KEY="your-key"        # Best: Google Search grounding
export OPENAI_API_KEY="your-key"        # Alternative: GPT-4o web search
export PERPLEXITY_API_KEY="your-key"    # Alternative: Perplexity

# Required for GitHub (higher rate limits)
export GITHUB_TOKEN="your-token"        # github.com/settings/tokens

# Required for vision analysis (pick one)
export GEMINI_API_KEY="your-key"        # Best: Gemini 2.5 Flash
export OPENAI_API_KEY="your-key"        # Alternative: GPT-4o
export ANTHROPIC_API_KEY="your-key"     # Alternative: Claude
```

### 4. Restart Claude Code

```bash
# Quit and reopen Claude Code, or run:
claude --mcp-debug
```

### 5. Test it works

In Claude Code, try these prompts:

```
# Check your environment
> Use setup_local_env to check my development environment

# Search GitHub
> Use search_github to find TypeScript MCP servers with at least 100 stars

# Fetch documentation
> Use fetch_url to read https://modelcontextprotocol.io/introduction

# Get methodology
> Use getMethodology("overview") to see all available workflows
```

---

## Tool Categories

| Category | Tools | Description |
|----------|-------|-------------|
| **Web** | `web_search`, `fetch_url` | Search the web, fetch URLs as markdown |
| **GitHub** | `search_github`, `analyze_repo` | Find repos, analyze tech stacks |
| **Documentation** | `update_agents_md`, `research_job_market`, `setup_local_env` | Self-maintaining docs, job research |
| **Vision** | `discover_vision_env`, `analyze_screenshot`, `manipulate_screenshot` | AI-powered image analysis |
| **UI Capture** | `capture_ui_screenshot`, `capture_responsive_suite` | Browser screenshots (requires Playwright) |
| **Verification** | `start_cycle`, `log_phase`, `complete_cycle` | 6-phase dev workflow |
| **Eval** | `start_eval_run`, `log_test_result`, `list_eval_runs` | Test case tracking |
| **Quality Gates** | `run_quality_gate`, `get_gate_history` | Pass/fail checkpoints |
| **Learning** | `record_learning`, `search_learnings`, `search_all_knowledge` | Persistent knowledge base |
| **Flywheel** | `run_closed_loop`, `check_framework_updates` | Automated workflows |
| **Recon** | `run_recon`, `log_recon_finding`, `log_gap` | Discovery and gap tracking |
| **Agent Bootstrap** | `bootstrap_project`, `setup_local_env`, `triple_verify`, `self_implement` | Self-discover infrastructure, auto-configure |
| **Autonomous** | `assess_risk`, `decide_re_update`, `run_self_maintenance`, `run_autonomous_loop` | Risk-tiered autonomous execution |
| **Self-Eval** | `log_tool_call`, `get_trajectory_analysis`, `get_self_eval_report`, `get_improvement_recommendations`, `cleanup_stale_runs`, `synthesize_recon_to_learnings` | Self-reinforced learning loop |
| **Parallel Agents** | `claim_agent_task`, `release_agent_task`, `list_agent_tasks`, `assign_agent_role`, `get_agent_role`, `log_context_budget`, `run_oracle_comparison`, `get_parallel_status`, `bootstrap_parallel_agents`, `generate_parallel_agents_md` | Multi-agent coordination + auto-bootstrap |
| **Meta** | `findTools`, `getMethodology` | Tool discovery, methodology guides |

---

## Methodology Topics (19 total)

Ask Claude: `Use getMethodology("topic_name")`

- `overview` — See all methodologies
- `verification` — 6-phase development cycle
- `eval` — Test case management
- `flywheel` — Continuous improvement loop
- `mandatory_flywheel` — Required verification for changes
- `reconnaissance` — Codebase discovery
- `quality_gates` — Pass/fail checkpoints
- `ui_ux_qa` — Frontend verification
- `agentic_vision` — AI-powered visual QA
- `closed_loop` — Build/test before presenting
- `learnings` — Knowledge persistence
- `project_ideation` — Validate ideas before building
- `tech_stack_2026` — Dependency management
- `telemetry_setup` — Observability setup
- `agents_md_maintenance` — Keep docs in sync
- `agent_bootstrap` — Self-discover and auto-configure infrastructure
- `autonomous_maintenance` — Risk-tiered autonomous execution
- `parallel_agent_teams` — Multi-agent coordination with task locking and oracle testing
- `self_reinforced_learning` — Trajectory analysis and improvement loop

---

## Self-Reinforced Learning (v1.4.0)

The MCP learns from its own usage. Every tool call is **auto-instrumented** — timing, status, and errors are logged automatically. The system accumulates trajectory data and surfaces recommendations.

```
Use → Auto-Log → Analyze → Clean → Synthesize → Recommend → Apply → Re-analyze
```

**Try it:**
```
> Use getMethodology("self_reinforced_learning") for the 5-step guide
> Use get_self_eval_report to see your project's health score
> Use get_improvement_recommendations to find actionable improvements
> Use get_trajectory_analysis to see your tool usage patterns
```

The health score is a weighted composite:
- Cycle completion (25%) — Are verification cycles being completed?
- Eval pass rate (25%) — Are eval runs succeeding?
- Gap resolution (20%) — Are logged gaps getting resolved?
- Gate pass rate (15%) — Are quality gates passing?
- Tool error rate (15%) — Are tools running without errors?

---

## VSCode Extension Setup

If using the Claude Code VSCode extension:

1. Open VSCode Settings (Ctrl/Cmd + ,)
2. Search for "Claude Code MCP"
3. Add server configuration:

```json
{
  "claude-code.mcpServers": {
    "nodebench": {
      "command": "node",
      "args": ["/absolute/path/to/packages/mcp-local/dist/index.js"]
    }
  }
}
```

---

## Optional Dependencies

Install for additional features:

```bash
# Screenshot capture (headless browser)
npm install playwright
npx playwright install chromium

# Image manipulation
npm install sharp

# HTML parsing (already included)
npm install cheerio

# AI providers (pick your preferred)
npm install @google/genai    # Gemini
npm install openai           # OpenAI
npm install @anthropic-ai/sdk # Anthropic
```

---

## Troubleshooting

**"No search provider available"**
- Set at least one API key: `GEMINI_API_KEY`, `OPENAI_API_KEY`, or `PERPLEXITY_API_KEY`

**"GitHub API error 403"**
- Set `GITHUB_TOKEN` for higher rate limits (60/hour without, 5000/hour with)

**"Cannot find module"**
- Run `npm run build` in the mcp-local directory

**MCP not connecting**
- Check path is absolute in settings.json
- Run `claude --mcp-debug` to see connection errors
- Ensure Node.js >= 18

---

## Example Workflows

### Research a new project idea

```
1. Use getMethodology("project_ideation") for the 6-step process
2. Use web_search to validate market demand
3. Use search_github to find similar projects
4. Use analyze_repo to study competitor implementations
5. Use research_job_market to understand skill demand
```

### Analyze a GitHub repo before using it

```
1. Use search_github({ query: "mcp server", language: "typescript", minStars: 100 })
2. Use analyze_repo({ repoUrl: "owner/repo" }) to see tech stack and patterns
3. Use fetch_url to read their documentation
```

### Set up a new development environment

```
1. Use setup_local_env to scan current environment
2. Follow the recommendations to install missing SDKs
3. Use getMethodology("tech_stack_2026") for ongoing maintenance
```

---

## Parallel Agent Teams (v1.6.0)

Based on Anthropic's ["Building a C Compiler with Parallel Claudes"](https://www.anthropic.com/engineering/building-c-compiler) (Feb 2026). Run multiple AI agents in parallel on a shared codebase with coordination.

**Key tools:**
- `claim_agent_task` / `release_agent_task` — Task locking to prevent duplicate work
- `assign_agent_role` — 7 predefined roles (implementer, dedup_reviewer, performance_optimizer, etc.)
- `log_context_budget` — Track context window usage, prevent pollution
- `run_oracle_comparison` — Compare output against known-good reference
- `get_parallel_status` — Overview for new agent sessions to orient themselves
- `bootstrap_parallel_agents` — Auto-detect gaps and scaffold parallel infra for ANY repo
- `generate_parallel_agents_md` — Generate portable AGENTS.md parallel section for any project

**Auto-bootstrap for external repos:**
```
> Use bootstrap_parallel_agents to scan any project and scaffold parallel agent infrastructure
> Use generate_parallel_agents_md to create a portable AGENTS.md section for any repo
```

The bootstrap tool scans 7 categories (task coordination, roles, oracle testing, context budget, progress files, AGENTS.md, git worktrees) and creates everything missing. The generated AGENTS.md section is framework-agnostic and works with any AI agent.

**MCP Prompts:**
- `parallel-agent-team` — Team setup with role assignment and task breakdown
- `oracle-test-harness` — Oracle-based testing for any component
- `bootstrap-parallel-agents` — Detect and scaffold parallel agent infra for external repos

---

## Agent Protocol (NODEBENCH_AGENTS.md)

The package includes `NODEBENCH_AGENTS.md` — a portable agent operating procedure that any AI agent can use to self-configure.

**What it provides:**
- The 6-step AI Flywheel verification process (mandatory for all changes)
- MCP tool usage patterns and workflows
- Quality gate definitions
- Post-implementation checklists
- Self-update instructions

**To use in your project:**

1. Copy `NODEBENCH_AGENTS.md` to your repo root
2. Agents will auto-discover and follow the protocol
3. Use `update_agents_md` tool to keep it in sync

Or fetch it directly:

```bash
curl -o AGENTS.md https://raw.githubusercontent.com/nodebench/nodebench-ai/main/packages/mcp-local/NODEBENCH_AGENTS.md
```

The file is designed to be:
- **Portable** — Works in any repo, any language
- **Self-updating** — Agents can modify it via MCP tools
- **Composable** — Add your own sections alongside the standard protocol

---

## License

MIT
