# Getting Started with NodeBench MCP

## Install

```bash
# Claude Code core lane
claude mcp add nodebench -- npx -y nodebench-mcp

# Claude Code power lane
claude mcp add nodebench-power -- npx -y nodebench-mcp-power

# Claude Code admin lane
claude mcp add nodebench-admin -- npx -y nodebench-mcp-admin

# Cursor
npx nodebench-mcp --preset cursor
```

## Your Tools

| Tool | What It Does |
|------|-------------|
| `investigate` | Research a company, person, or topic. Returns a sourced artifact. |
| `compare` | Side-by-side analysis of 2-4 entities. |
| `track` | Add, check, or list watched entities. |
| `summarize` | Turn raw context into a compact brief with key points. |
| `search` | Search live web + stored NodeBench knowledge in one call. |
| `report` | Produce a decision memo or diligence report. |
| `ask_context` | Query against saved session memory and knowledge base. |
| `discover_tools` | Find the next toolset or deeper tool lane when the default workflow is not enough. |
| `load_toolset` | Expand the session with a specific toolset only when the workflow needs it. |

## First Prompts to Try

1. `investigate Anthropic` -- get a sourced artifact on Anthropic
2. `compare Anthropic, OpenAI` -- side-by-side comparison
3. `report topic="AI agent infrastructure" decision="Which framework to use?"` -- decision memo
4. `search "MCP server best practices 2026"` -- web + knowledge search
5. `track entity="Anthropic" action="add"` -- start watching for changes

## Need More?

```
discover_tools query="visual QA"     # find the right deeper lane
load_toolset domain="ui_ux_dive"     # load an entire domain
```

## Lanes And Presets

| Entry | Surface | Use Case |
|-------|---------|----------|
| `nodebench-mcp` | 9 visible tools | Core workflow lane |
| `nodebench-mcp-power` | expanded workflow surface | Founder + recon + packet workflows |
| `nodebench-mcp-admin` | operator surface | Profiling, dashboards, eval, observability |
| `--preset founder` | compatibility preset | Existing founder setups |
| `--preset cursor` | constrained preset | Cursor IDE tool-cap safe |
| `--preset full` | all domains | Maximum coverage |

```bash
npx nodebench-mcp --preset power
npx nodebench-mcp-power
npx nodebench-mcp-admin
npx nodebench-mcp --list-presets
```
