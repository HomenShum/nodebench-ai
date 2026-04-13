# NodeBench MCP Admin

`nodebench-mcp-admin` is the operator lane for the same NodeBench runtime.

It starts with the `admin` lane and enables the admin runtime surfaces automatically:

- profiling and observability
- dashboards
- eval and quality lanes
- execution trace and mission harness

## Install

```bash
claude mcp add nodebench-admin -- npx -y nodebench-mcp-admin
```

Or in raw MCP config:

```json
{
  "mcpServers": {
    "nodebench-admin": {
      "command": "npx",
      "args": ["-y", "nodebench-mcp-admin"]
    }
  }
}
```

## What it is for

Use this package when you are operating, profiling, benchmarking, or debugging the NodeBench runtime itself.

If you want the public workflow-first front door, use `nodebench-mcp`.
If you want a larger research/founder lane without dashboards and operator runtime, use `nodebench-mcp-power`.

