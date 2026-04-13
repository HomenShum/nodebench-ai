# NodeBench MCP Power

`nodebench-mcp-power` is the expanded workflow lane for agent-native users who already know they need more than the tiny core install.

It runs the same NodeBench runtime as `nodebench-mcp`, but starts in the `power` lane:

- founder workflows
- recon and web-heavy research
- shared context and sync bridge
- session memory, entity lookup, delta, and site map

## Install

```bash
claude mcp add nodebench-power -- npx -y nodebench-mcp-power
```

Or in raw MCP config:

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

## What it is for

Use this package when the default `nodebench-mcp` lane is too small and you want the richer founder/research surface immediately, without turning on the admin runtime.

If you need the tiny workflow-first front door instead, use `nodebench-mcp`.
If you need profiling, dashboards, eval, and operator tooling, use `nodebench-mcp-admin`.

