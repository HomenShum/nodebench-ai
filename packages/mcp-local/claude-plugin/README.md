# NodeBench - Claude Code Plugin

NodeBench MCP inside Claude Code. Start with the same 9-tool workflow lane the main package exposes, then load deeper toolsets only when the task actually needs them.

## What you get

- **MCP Server**: 9-tool default lane for `investigate`, `compare`, `track`, `summarize`, `search`, `report`, `ask_context`, `discover_tools`, and `load_toolset`
- **Slash Commands**: `/nodebench-qa` (full QA loop), `/agentic-reliability-audit` (8-point infra check)
- **Rules**: Auto-QA after code changes, analyst diagnostic (5-whys), agentic reliability checklist

## Install

```bash
/plugin install nodebench@claude-plugins-official
```

Or add to your project's `.mcp.json`:
```json
{
  "mcpServers": {
    "nodebench": {
      "command": "npx",
      "args": ["-y", "nodebench-mcp", "--preset", "default"],
      "env": {}
    }
  }
}
```

## Quick start

1. `investigate({ topic: 'analyze a company' })` - get a sourced report first
2. `compare({ items: ['Competitor A', 'Competitor B'] })` - produce a side-by-side brief
3. `discover_tools({ query: 'crawl and inspect a site' })` - find the deeper lane only if needed
4. `load_toolset({ toolset: 'site_map' })` - expand deliberately when the task calls for it

## Links

- [GitHub](https://github.com/HomenShum/nodebench-ai)
- [Website](https://nodebenchai.com)
- [npm](https://www.npmjs.com/package/nodebench-mcp)
