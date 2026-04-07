# NodeBench Plugin for Claude Code

Entity intelligence, deep diligence, and founder clarity — right inside Claude Code.

## Install

```bash
# Add the plugin
/plugin marketplace add HomenShum/nodebench-ai
/plugin install nodebench@nodebench

# Reload
/reload-plugins

# Check setup
/nodebench:setup
```

## Commands

| Command | What it does |
|---------|-------------|
| `/nodebench:search <query>` | Search any company, market, or question |
| `/nodebench:diligence <company>` | Run 6-branch deep diligence (people, timeline, financials, market, products, risks) |
| `/nodebench:remediate` | Show actionable gap remediation steps |
| `/nodebench:remediate --delegate` | Delegate remediation to Codex (if installed) |
| `/nodebench:packet` | Inject company truth into session context |
| `/nodebench:setup` | Check configuration and guide setup |

## With Codex

When both NodeBench and [Codex](https://github.com/openai/codex-plugin-cc) are installed:

```bash
/nodebench:diligence "My Company"     # Find gaps
/nodebench:remediate --delegate        # Send fixes to Codex
/codex:status                          # Check progress
/codex:result                          # Get the implementation
```

## With MCP (deeper integration)

```bash
claude mcp add nodebench -- npx -y nodebench-mcp --preset founder
```

This gives Claude Code direct access to 350+ MCP tools including:
- `get_company_truth` — subconscious memory blocks
- `traverse_entity_graph` — knowledge graph navigation
- `discover_tools` — find the right tool for any task
