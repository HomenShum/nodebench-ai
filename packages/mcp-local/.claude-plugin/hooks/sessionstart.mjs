#!/usr/bin/env node
/**
 * NodeBench SessionStart hook — inject context sandbox awareness at session start.
 */

const guidance = `<context_window_protection>
  <priority_instructions>
    NodeBench MCP includes a context sandbox. Use sandbox_execute instead of Bash for commands
    producing >20 lines. Use sandbox_ingest for large text, then sandbox_search to query it.
  </priority_instructions>
  <tool_hierarchy>
    1. sandbox_batch — run N commands + M queries in ONE call (highest efficiency)
    2. sandbox_execute — run one command, auto-index, return summary only
    3. sandbox_search — BM25 search across all sandboxed content
    4. sandbox_ingest — index arbitrary text for later search
    5. sandbox_stats — check context savings for current session
  </tool_hierarchy>
</context_window_protection>`;

process.stdout.write(
  JSON.stringify({
    result: "allow",
    additional_context: guidance,
  })
);
