---
name: sandbox-doctor
description: |
  Run NodeBench context sandbox diagnostics.
  Checks SQLite/FTS5 availability, sandbox table health, indexed content stats, and hook configuration.
  Trigger: /nodebench-mcp:sandbox-doctor
user_invocable: true
---

# Sandbox Doctor

Run diagnostics on the NodeBench context sandbox.

## Instructions

1. Call the NodeBench MCP tool `sandbox_stats` to check if the sandbox is initialized.
2. Run this diagnostic shell command via Bash:
   ```
   node -e "const Database = require('better-sqlite3'); const db = new Database(require('os').homedir() + '/.nodebench/nodebench.db'); const tables = db.prepare(\"SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'sandbox%'\").all(); const fts = db.prepare(\"SELECT name FROM sqlite_master WHERE type='table' AND name='sandbox_fts'\").all(); console.log(JSON.stringify({ tables: tables.map(t=>t.name), fts5: fts.length > 0, chunks: db.prepare('SELECT COUNT(*) as c FROM sandbox_chunks').get() }, null, 2));"
   ```
3. Display results as a checklist:
   ```
   ## NodeBench Sandbox Doctor
   - [x] SQLite: OK (~/.nodebench/nodebench.db)
   - [x] FTS5: Available (sandbox_fts table exists)
   - [x] Chunks indexed: N
   - [x] Sources: N
   - [x] Plugin: registered
   - [x] Hooks: PreToolUse + SessionStart configured
   ```
   Use `[x]` for PASS, `[ ]` for FAIL.
