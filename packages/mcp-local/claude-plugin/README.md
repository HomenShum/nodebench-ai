# NodeBench — Claude Code Plugin

Operating intelligence for founders. 350 MCP tools across 57 domains.

## What you get

- **MCP Server**: 350 tools for decision intelligence, entity research, QA automation, session memory
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
      "args": ["-y", "nodebench-mcp"],
      "env": {}
    }
  }
}
```

## Quick start

1. `discover_tools('analyze a company')` — find relevant tools
2. `load_toolset('founder')` — activate 40 founder-specific tools
3. `site_map({ url: 'https://yoursite.com' })` — crawl and inspect interactively
4. `compare_savings()` — see your ROI

## Links

- [GitHub](https://github.com/HomenShum/nodebench-ai)
- [Website](https://nodebenchai.com)
- [npm](https://www.npmjs.com/package/nodebench-mcp)
