# NodeBench Agent Integration Guide

Instructions for AI coding agents (Claude Code, Cursor, Windsurf, OpenClaw, or any MCP-compatible agent) to install and use NodeBench as the user's operational intelligence layer.

---

## The One-Liner

Paste this into any AI agent to connect it to NodeBench:

```
Read https://www.nodebenchai.com/agent-setup.txt and follow all steps.
```

That's it. The agent reads the URL, installs NodeBench MCP, verifies the connection, and starts logging its work to your dashboard at https://www.nodebenchai.com.

---

## 1. Quick Install

### Claude Code
```bash
claude mcp add nodebench -- npx -y nodebench-mcp
```

### Cursor
Add to `.cursor/mcp.json`:
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

### Windsurf
Add to `.windsurf/mcp.json`:
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

### Any MCP-compatible agent
The server binary is `nodebench-mcp` on npm. Launch it with `npx -y nodebench-mcp`. It speaks standard MCP over stdio.

---

## 2. System Prompt / CLAUDE.md Block

Paste the following block into your agent's system prompt, `CLAUDE.md`, `.cursorrules`, or equivalent configuration file. It makes the agent NodeBench-aware without requiring any code changes.

```markdown
# NodeBench Integration

NodeBench is the user's operational intelligence system — a 304-tool MCP server that tracks company identity, initiatives, agents, signals, decisions, and interventions with durable memory.

## When to use NodeBench tools

- **Before complex work**: Call `founder_deep_context_gather` to ground yourself in the user's company context, active initiatives, priorities, and contradictions.
- **After completing work**: Call `save_session_note` with what was done, files changed, and which initiative it relates to. This feeds the user's dashboard.
- **When the user asks about business state**: Call `get_ops_dashboard` for a system overview or `get_daily_brief_summary` for the morning briefing.
- **When planning next steps**: Call `rank_interventions` for priority-sorted next actions.
- **When you need to find a tool**: Call `discover_tools("your task description")` — it searches all 304 tools with hybrid semantic + keyword matching.

## Tool discovery

You do NOT need to memorize all 304 tools. Use these three discovery tools:
- `discover_tools("what you want to do")` — hybrid search, returns ranked matches
- `get_tool_quick_ref("tool_name")` — shows what to call next after any tool (multi-hop BFS)
- `get_workflow_chain("workflow_name")` — returns a full step-by-step tool sequence

## Key tool categories

| Category | Tools | Purpose |
|----------|-------|---------|
| Founder platform | `founder_deep_context_gather`, `founder_packet_validate`, `founder_packet_diff` | Company identity, context gathering, artifact validation |
| Decision support | `build_claim_graph`, `run_deep_sim`, `rank_interventions`, `render_decision_memo` | Structured decision analysis with simulations |
| Session memory | `save_session_note`, `load_session_notes`, `refresh_task_context` | Persist and recall work across sessions |
| Dashboard | `get_ops_dashboard`, `get_daily_brief_summary`, `get_narrative_status`, `sync_daily_brief` | Operational overview and daily briefings |
| Discovery | `discover_tools`, `get_tool_quick_ref`, `get_workflow_chain` | Find the right tool for any task |
| Deep simulation | `extract_variables`, `generate_countermodels`, `score_compounding` | Variable extraction, counterfactual analysis, compounding effects |
```

---

## 3. Core Workflows an Agent Should Know

### A. Before starting complex work — gather context

```
Call `founder_deep_context_gather` with the task description.

This returns:
- Company identity (mission, wedge, state)
- Active initiatives and their status
- Recent changes since last review
- Contradictions and open questions
- Entity relationships (competitors, partners, customers)

Use this to ground every recommendation in the user's actual business context.
```

### B. After completing any task — persist it

```
Call `save_session_note` with:
  - label: short description of what was done
  - content: summary of changes, decisions made, files modified
  - tags: relevant categories (e.g., "frontend", "security", "initiative-X")

This feeds the user's "What Changed" timeline on their NodeBench dashboard.
```

### C. When the user asks "what should I do next?"

```
1. Call `get_daily_brief_summary` for the morning briefing with signals and priorities.
2. Call `rank_interventions` to get a priority-sorted list of next actions.
3. Call `get_ops_dashboard` for system health and agent activity overview.

Present the top 3 interventions with their rationale.
```

### D. When research or analysis is needed

```
1. Call `discover_tools("research analysis evidence")` to find relevant research tools.
2. Call `build_claim_graph` to structure claims and evidence for a decision.
3. Call `extract_variables` to identify the key variables affecting an outcome.
4. Call `run_deep_sim` to simulate scenarios and their consequences.
5. Call `render_decision_memo` to produce a shareable Decision Memo.
```

### E. When making a decision

```
1. Call `build_claim_graph` with the decision context — maps claims, evidence, and counter-evidence.
2. Call `generate_countermodels` — produces counterarguments the user hasn't considered.
3. Call `run_deep_sim` with scenarios — simulates outcomes under different assumptions.
4. Call `rank_interventions` — prioritizes possible actions by expected impact.
5. Call `render_decision_memo` — produces a structured memo the user can review and share.

The memo is viewable at the user's dashboard and shareable via public URL.
```

### F. When handing off to another agent

```
Call `founder_deep_context_gather` and pass the output to the next agent's prompt.
This produces a structured context packet covering:
- Company identity and current state
- Active initiatives and priorities
- Recent changes and open questions
- Entity relationships

The receiving agent gets full business context without needing to rediscover it.
```

---

## 4. The NodeBench Dashboard

The user has a web dashboard where they can see everything agents log and interact with recommendations.

- **Production**: `https://www.nodebenchai.com`
- **Local dev**: `http://localhost:5188`

Dashboard capabilities:
- **What Changed feed** — timeline of all agent activity and session notes
- **Decision Workbench** — review Decision Memos with claim graphs and simulations
- **Research Hub** — daily briefings, signals, and evidence chains
- **Agent activity** — monitor agent health, token usage, and task completion
- **Role lenses** — view the company through founder, investor, banker, or developer perspectives
- **Shareable memos** — export Decision Memos as public URLs, markdown, or HTML
- **Accept/defer/reject** — act on recommended interventions directly from the dashboard

When you log work via `save_session_note` or produce memos via `render_decision_memo`, the results appear here automatically.

---

## 5. Tool Discovery

NodeBench has 304 tools across 50 domains. You never need to know them all. The progressive discovery system finds the right tools for any task.

### Discovery tools

| Tool | What it does | When to use |
|------|-------------|-------------|
| `discover_tools(query)` | Hybrid semantic + keyword search across all 304 tools. Returns ranked matches with relevance scores. Supports `offset`/`limit` pagination and `expand` for related tools. | You need a tool but don't know its name |
| `get_tool_quick_ref(tool_name)` | Multi-hop BFS traversal of tool relationships. Shows `nextTools` and `relatedTools` with hop distance. Supports `depth: 1-3`. | You found one tool and want to know what to call next |
| `get_workflow_chain(workflow)` | Returns a pre-built step-by-step sequence of tools for common workflows (35+ workflows available). | You know the workflow name (e.g., `fix_bug`, `new_feature`, `research_digest`) |

### Presets

The server supports presets that load subsets of tools by use case:

| Preset | Tools | Best for |
|--------|-------|----------|
| `default` | ~81 | General coding tasks |
| `research` | ~115 | Research and analysis |
| `web_dev` | ~150 | Web development |
| `data` | ~122 | Data engineering |
| `devops` | ~92 | DevOps and infrastructure |
| `mobile` | ~126 | Mobile development |
| `academic` | ~113 | Academic research |
| `multi_agent` | ~136 | Multi-agent orchestration |
| `content` | ~115 | Content creation |
| `full` | 304+ | Everything |

Pass `--preset research` (or any preset name) when launching the server to load a specific subset.

### Dynamic loading

In `default` preset, tools not in the initial set can be loaded on demand:
1. Call `discover_tools("what you need")` — it will indicate if matching tools are in an unloaded toolset.
2. Call `load_toolset("toolset_name")` to activate that toolset in the current session.
3. The new tools are immediately available.

---

## 6. Example: Full Agent Integration Prompt

Copy-paste this entire block into your `CLAUDE.md`, `.cursorrules`, or system prompt:

```markdown
# NodeBench — Operational Intelligence

You have access to NodeBench, a 304-tool MCP server that serves as the user's
operational memory and decision support system.

## Required behaviors

1. **Start of session**: Call `founder_deep_context_gather` to load business context.
   This tells you what company the user is building, what's active, and what matters.

2. **End of task**: Call `save_session_note` with a summary of what you did, why,
   and which files changed. This feeds the user's dashboard timeline.

3. **Before decisions**: Call `build_claim_graph` + `run_deep_sim` + `rank_interventions`
   to produce evidence-backed recommendations, not opinions.

4. **Tool discovery**: Call `discover_tools("your task")` when you need a capability
   you don't have. It searches all 304 tools. Follow up with `get_tool_quick_ref`
   to find related tools.

5. **Morning briefing**: When the user starts their day or asks for status,
   call `get_daily_brief_summary` + `get_ops_dashboard`.

## Do not

- Guess about the user's business context — call `founder_deep_context_gather`.
- Skip logging your work — always call `save_session_note` when a task completes.
- Hardcode tool names — use `discover_tools` to find the right tool dynamically.
- Produce decisions without evidence — use the decision support workflow.

## Dashboard

The user reviews your work at https://www.nodebenchai.com (or localhost:5188).
Decision Memos you produce via `render_decision_memo` are shareable via public URL.
```

---

## 7. CLI Quick Reference

NodeBench also works as a standalone CLI for quick operations outside MCP:

```bash
# Discover tools for a task
npx nodebench-mcp discover "deploy to production"

# Get a tool's quick reference card
npx nodebench-mcp quickref build_claim_graph

# Run a workflow chain
npx nodebench-mcp workflow fix_bug

# Interactive demo
npx nodebench-mcp demo

# List setup instructions
npx nodebench-mcp setup
```

---

## 8. Environment Variables (Optional)

| Variable | Purpose |
|----------|---------|
| `GEMINI_API_KEY` | Enables LLM-powered tool selection (Gemini 3 Flash) |
| `OPENAI_API_KEY` | Fallback LLM tool selection (GPT-5-mini) |
| `ANTHROPIC_API_KEY` | Fallback LLM tool selection (Claude Haiku 4.5) |
| `NODEBENCH_SECURITY_MODE` | `strict` / `permissive` / `audit_only` |

No API keys are required. Without them, tool discovery uses hybrid keyword + semantic search, which covers most use cases.
