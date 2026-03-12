#!/usr/bin/env node
/**
 * NodeBench PreToolUse hook — nudges heavy output tools toward context sandbox.
 *
 * When Claude uses Bash, Read, Grep, WebFetch, or Task, this hook injects
 * a context_guidance reminder suggesting sandbox_execute or sandbox_ingest
 * to keep raw output out of the context window.
 */

const toolName = process.env.CLAUDE_TOOL_NAME || "";
const toolInput = process.env.CLAUDE_TOOL_INPUT || "{}";

// Tools that commonly produce heavy output
const HEAVY_TOOLS = new Set(["Bash", "WebFetch", "Grep", "Read", "Task"]);

if (!HEAVY_TOOLS.has(toolName)) {
  // Not a heavy tool — pass through
  process.stdout.write(JSON.stringify({ result: "allow" }));
  process.exit(0);
}

// Build guidance based on tool type
let guidance = "";

if (toolName === "Bash") {
  guidance = [
    "<context_guidance>",
    "  <tip>",
    "    This command may produce large output. Consider using sandbox_execute instead:",
    '    sandbox_execute({ command: "...", label: "descriptive-label", queries: ["what to find"] })',
    "    Raw output stays in FTS5 sandbox — only summary enters context.",
    "  </tip>",
    "</context_guidance>",
  ].join("\n");
} else if (toolName === "Read") {
  guidance = [
    "<context_guidance>",
    "  <tip>",
    "    If you are reading this file to Edit it, Read is correct.",
    "    If you are reading to analyze, consider sandbox_ingest({ label: 'filename', content: '...' })",
    "    then sandbox_search({ queries: ['what to find'] }) — keeps raw content out of context.",
    "  </tip>",
    "</context_guidance>",
  ].join("\n");
} else if (toolName === "WebFetch") {
  guidance = [
    "<context_guidance>",
    "  <tip>",
    "    Web content can be large. Consider sandbox_execute({ command: 'curl -s URL', label: 'source' })",
    "    or sandbox_ingest the response — raw HTML/JSON stays in sandbox, search for what you need.",
    "  </tip>",
    "</context_guidance>",
  ].join("\n");
} else if (toolName === "Grep") {
  guidance = [
    "<context_guidance>",
    "  <tip>",
    "    Search results may flood context. Consider sandbox_execute({ command: 'grep ...', label: 'search' })",
    "    then sandbox_search to extract specific matches.",
    "  </tip>",
    "</context_guidance>",
  ].join("\n");
} else if (toolName === "Task") {
  // Inject sandbox routing into subagent prompts
  let input;
  try {
    input = JSON.parse(toolInput);
  } catch {
    input = {};
  }

  if (input.prompt && !input.prompt.includes("sandbox_")) {
    guidance = [
      "<context_guidance>",
      "  <tip>",
      "    Subagent routing: the spawned agent should use sandbox_execute and sandbox_search",
      "    (NodeBench MCP tools) instead of raw Bash for heavy output. This preserves context.",
      "  </tip>",
      "</context_guidance>",
    ].join("\n");
  }
}

if (guidance) {
  process.stdout.write(
    JSON.stringify({
      result: "allow",
      additional_context: guidance,
    })
  );
} else {
  process.stdout.write(JSON.stringify({ result: "allow" }));
}
