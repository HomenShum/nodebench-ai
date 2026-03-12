---
name: sandbox-stats
description: |
  Show context sandbox savings for the current session.
  Displays bytes indexed vs returned, savings ratio, estimated tokens saved, and per-tool breakdown.
  Trigger: /nodebench-mcp:sandbox-stats
user_invocable: true
---

# Sandbox Stats

Show context sandbox savings directly in the conversation.

## Instructions

1. Call the NodeBench MCP tool `sandbox_stats` with no arguments.
2. After the tool returns, display the results as a markdown table:
   ```
   ## NodeBench Context Sandbox Stats
   | Metric | Value |
   |--------|-------|
   | Session | X.X min |
   | Bytes indexed | XXX KB |
   | Bytes in context | XXX B |
   | Savings ratio | XXx |
   | Context reduction | XX% |
   | Tokens saved | ~X,XXX |

   | Tool | Calls |
   |------|-------|
   | sandbox_execute | N |
   | sandbox_ingest | N |
   | sandbox_batch | N |
   | sandbox_search | N |
   ```
