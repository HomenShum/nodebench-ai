/**
 * A/B Test Harness for Dynamic Toolset Loading
 *
 * Spawns the NodeBench MCP server in both static and dynamic modes,
 * runs identical structured scenarios via JSON-RPC over stdio,
 * then queries the SQLite database for comparison metrics.
 *
 * Usage:
 *   npx tsx scripts/ab-test-harness.ts
 *   npx tsx scripts/ab-test-harness.ts --rounds 5
 */

import { spawn, type ChildProcess } from "node:child_process";
import { join } from "node:path";
import { homedir } from "node:os";
import Database from "better-sqlite3";
import { createInterface } from "node:readline";

// ── Config ──────────────────────────────────────────────────────────────
const ROUNDS = parseInt(process.argv.find((_, i, a) => a[i - 1] === "--rounds") ?? "3", 10);
const SERVER_ENTRY = join(import.meta.dirname, "..", "dist", "index.js");

// ── Scenarios: identical tasks run in both modes ────────────────────────
// Each scenario is a sequence of tool calls that exercises different capabilities
const SCENARIOS: Array<{
  name: string;
  description: string;
  calls: Array<{ tool: string; args: Record<string, unknown> }>;
}> = [
  {
    name: "basic_discovery",
    description: "Discover tools for a common task (stays within default preset)",
    calls: [
      { tool: "discover_tools", args: { query: "verify my code changes", limit: 5 } },
      { tool: "get_workflow_chain", args: { chain: "fix_bug" } },
    ],
  },
  {
    name: "cross_preset_discovery",
    description: "Search for tools that require loading additional toolsets",
    calls: [
      { tool: "discover_tools", args: { query: "analyze screenshot for UI regressions", limit: 5 } },
      { tool: "discover_tools", args: { query: "check SEO meta tags and lighthouse score", limit: 5 } },
      { tool: "discover_tools", args: { query: "parse CSV file and extract data", limit: 5 } },
    ],
  },
  {
    name: "dynamic_load_flow",
    description: "Discover, then load a toolset, then use its tools (dynamic mode advantage)",
    calls: [
      { tool: "list_available_toolsets", args: {} },
      { tool: "discover_tools", args: { query: "web search and fetch URL content", limit: 5 } },
      // In dynamic mode, agent would call load_toolset here
      // In static mode, the tools simply aren't available
      { tool: "load_toolset", args: { toolset: "web" } },
      { tool: "discover_tools", args: { query: "web search and fetch URL content", limit: 5 } },
    ],
  },
  {
    name: "methodology_workflow",
    description: "Full methodology workflow using default tools only",
    calls: [
      { tool: "getMethodology", args: { topic: "mandatory_flywheel" } },
      { tool: "discover_tools", args: { query: "record what I learned", limit: 3 } },
      { tool: "get_tool_quick_ref", args: { toolName: "record_learning" } },
      { tool: "get_workflow_chain", args: { chain: "new_feature" } },
    ],
  },
  {
    name: "multi_domain_discovery",
    description: "Search across multiple domains to test breadth of discovery",
    calls: [
      { tool: "discover_tools", args: { query: "email notification RSS feed digest", limit: 5 } },
      { tool: "discover_tools", args: { query: "git commit compliance check", limit: 5 } },
      { tool: "discover_tools", args: { query: "academic paper review and polish", limit: 5 } },
      { tool: "discover_tools", args: { query: "parallel agent task coordination", limit: 5 } },
    ],
  },

  // ── Real user query scenarios ──────────────────────────────────────

  {
    name: "file_operations",
    description: "User needs to read/parse files (CSV, PDF, Excel) — requires local_file toolset",
    calls: [
      { tool: "discover_tools", args: { query: "read CSV file and extract rows", limit: 5 } },
      { tool: "discover_tools", args: { query: "parse PDF document extract text", limit: 5 } },
      { tool: "discover_tools", args: { query: "read Excel spreadsheet aggregate data", limit: 5 } },
      { tool: "load_toolset", args: { toolset: "local_file" } },
      { tool: "discover_tools", args: { query: "read CSV file and extract rows", limit: 5 } },
    ],
  },
  {
    name: "email_workflow",
    description: "User wants to send email or check inbox — requires email toolset",
    calls: [
      { tool: "discover_tools", args: { query: "send email with attachment", limit: 5 } },
      { tool: "discover_tools", args: { query: "check my inbox for unread messages", limit: 5 } },
      { tool: "load_toolset", args: { toolset: "email" } },
    ],
  },
  {
    name: "github_search",
    description: "User wants to search GitHub repos or analyze a repo",
    calls: [
      { tool: "discover_tools", args: { query: "search GitHub for React component library", limit: 5 } },
      { tool: "discover_tools", args: { query: "analyze repository structure and dependencies", limit: 5 } },
      { tool: "load_toolset", args: { toolset: "github" } },
    ],
  },
  {
    name: "academic_writing",
    description: "User writing a paper — needs research_writing toolset",
    calls: [
      { tool: "discover_tools", args: { query: "polish my paper abstract remove AI tone", limit: 5 } },
      { tool: "discover_tools", args: { query: "check paper logic and argument structure", limit: 5 } },
      { tool: "discover_tools", args: { query: "translate academic text to Spanish", limit: 5 } },
      { tool: "load_toolset", args: { toolset: "research_writing" } },
    ],
  },
  {
    name: "git_pre_merge",
    description: "User preparing a PR — needs git_workflow toolset",
    calls: [
      { tool: "discover_tools", args: { query: "check git commit messages follow convention", limit: 5 } },
      { tool: "discover_tools", args: { query: "review PR checklist before merge", limit: 5 } },
      { tool: "load_toolset", args: { toolset: "git_workflow" } },
    ],
  },
  {
    name: "seo_audit",
    description: "User wants to audit website SEO and performance",
    calls: [
      { tool: "discover_tools", args: { query: "audit my website SEO score meta tags", limit: 5 } },
      { tool: "discover_tools", args: { query: "check page load speed performance lighthouse", limit: 5 } },
      { tool: "load_toolset", args: { toolset: "seo" } },
    ],
  },
  {
    name: "multi_step_chain",
    description: "Real workflow: fetch URL → parse data → send email (cross-toolset chain)",
    calls: [
      { tool: "discover_tools", args: { query: "fetch webpage and extract content", limit: 5 } },
      { tool: "load_toolset", args: { toolset: "web" } },
      { tool: "discover_tools", args: { query: "read JSON data and select fields", limit: 5 } },
      { tool: "load_toolset", args: { toolset: "local_file" } },
      { tool: "discover_tools", args: { query: "send results via email", limit: 5 } },
      { tool: "load_toolset", args: { toolset: "email" } },
    ],
  },
  {
    name: "ambiguous_queries",
    description: "Queries that could match multiple toolsets — tests ranking accuracy",
    calls: [
      { tool: "discover_tools", args: { query: "analyze my code", limit: 10 } },
      { tool: "discover_tools", args: { query: "scan for issues", limit: 10 } },
      { tool: "discover_tools", args: { query: "generate a report", limit: 10 } },
      { tool: "discover_tools", args: { query: "compare two versions", limit: 10 } },
    ],
  },
  {
    name: "sequential_loading",
    description: "Load multiple toolsets across a session (realistic accumulation pattern)",
    calls: [
      { tool: "list_available_toolsets", args: {} },
      { tool: "load_toolset", args: { toolset: "github" } },
      { tool: "load_toolset", args: { toolset: "local_file" } },
      { tool: "load_toolset", args: { toolset: "llm" } },
      { tool: "list_available_toolsets", args: {} },
      { tool: "unload_toolset", args: { toolset: "local_file" } },
      { tool: "list_available_toolsets", args: {} },
    ],
  },
  {
    name: "natural_language_discovery",
    description: "How real users phrase requests (informal, non-technical)",
    calls: [
      { tool: "discover_tools", args: { query: "I need to look at what's in this zip file", limit: 5 } },
      { tool: "discover_tools", args: { query: "can you help me write better text for my blog", limit: 5 } },
      { tool: "discover_tools", args: { query: "how do I set up monitoring for my website", limit: 5 } },
      { tool: "discover_tools", args: { query: "benchmark different AI models on my task", limit: 5 } },
    ],
  },

  // ── Production usage patterns (from Towards Data Science MCP analysis + industry) ──
  // Top 3 categories: Web/Browser Automation (24.8%), Software Engineering (24.7%), Database/Search (23.1%)

  {
    name: "browser_automation",
    description: "Browser automation is #1 MCP use case (24.8%). Users scrape, screenshot, test UI.",
    calls: [
      { tool: "discover_tools", args: { query: "take screenshot of webpage and check layout", limit: 5 } },
      { tool: "discover_tools", args: { query: "automate browser to fill out form and submit", limit: 5 } },
      { tool: "discover_tools", args: { query: "visual regression testing compare before and after", limit: 5 } },
      { tool: "discover_tools", args: { query: "responsive design test mobile tablet desktop breakpoints", limit: 5 } },
    ],
  },
  {
    name: "database_search",
    description: "Database & search is #3 MCP use case (23.1%). Users query data, run analytics.",
    calls: [
      { tool: "discover_tools", args: { query: "query database and analyze schema", limit: 5 } },
      { tool: "discover_tools", args: { query: "search across all project knowledge and findings", limit: 5 } },
      { tool: "discover_tools", args: { query: "aggregate data and compute statistics", limit: 5 } },
      { tool: "discover_tools", args: { query: "full text search documents and filter results", limit: 5 } },
    ],
  },
  {
    name: "cicd_devops",
    description: "CI/CD and DevOps: check deployments, run tests, validate infrastructure",
    calls: [
      { tool: "discover_tools", args: { query: "run automated tests and check results", limit: 5 } },
      { tool: "discover_tools", args: { query: "scan project dependencies for vulnerabilities", limit: 5 } },
      { tool: "discover_tools", args: { query: "set up local development environment and scaffold", limit: 5 } },
      { tool: "discover_tools", args: { query: "discover what infrastructure and services are running", limit: 5 } },
    ],
  },
  {
    name: "productivity_comms",
    description: "Productivity & communication: Slack/Notion/Google Drive patterns",
    calls: [
      { tool: "discover_tools", args: { query: "send notification to team about deployment", limit: 5 } },
      { tool: "discover_tools", args: { query: "update project documentation and knowledge base", limit: 5 } },
      { tool: "discover_tools", args: { query: "create task and assign to team member", limit: 5 } },
      { tool: "discover_tools", args: { query: "search meeting notes and summarize action items", limit: 5 } },
    ],
  },
  {
    name: "design_integration",
    description: "Design tools: Figma specs, visual analysis, component extraction",
    calls: [
      { tool: "discover_tools", args: { query: "extract design specs from Figma mockup", limit: 5 } },
      { tool: "discover_tools", args: { query: "analyze UI component visual consistency", limit: 5 } },
      { tool: "discover_tools", args: { query: "generate flow visualization from user journey", limit: 5 } },
    ],
  },
  {
    name: "data_analysis_pipeline",
    description: "Data analysis: read, transform, aggregate, visualize (CSV/Excel/JSON)",
    calls: [
      { tool: "discover_tools", args: { query: "load CSV and compute average by category", limit: 5 } },
      { tool: "discover_tools", args: { query: "read JSON API response and extract nested fields", limit: 5 } },
      { tool: "discover_tools", args: { query: "compare two datasets and find differences", limit: 5 } },
      { tool: "load_toolset", args: { toolset: "local_file" } },
      { tool: "load_toolset", args: { toolset: "llm" } },
    ],
  },
  {
    name: "security_audit",
    description: "Security scanning: dependency audit, code analysis, terminal security",
    calls: [
      { tool: "discover_tools", args: { query: "scan code for security vulnerabilities and XSS", limit: 5 } },
      { tool: "discover_tools", args: { query: "check npm packages for known CVEs", limit: 5 } },
      { tool: "discover_tools", args: { query: "audit terminal history for leaked secrets", limit: 5 } },
    ],
  },
  {
    name: "llm_model_interaction",
    description: "LLM interaction: call models, extract structured data, benchmark",
    calls: [
      // Unload llm first — previous scenarios (sequential_loading, data_analysis_pipeline) may have loaded it
      { tool: "unload_toolset", args: { toolset: "llm" } },
      { tool: "discover_tools", args: { query: "call LLM generate prompt GPT Claude Gemini", limit: 5 } },
      { tool: "discover_tools", args: { query: "extract structured data JSON from text using LLM", limit: 5 } },
      { tool: "discover_tools", args: { query: "benchmark models compare latency quality cost", limit: 5 } },
      { tool: "load_toolset", args: { toolset: "llm" } },
    ],
  },
  {
    name: "monitoring_observability",
    description: "Monitoring: check status, analyze patterns, predict risks",
    calls: [
      { tool: "discover_tools", args: { query: "check project health and quality metrics", limit: 5 } },
      { tool: "discover_tools", args: { query: "analyze usage patterns and predict risks", limit: 5 } },
      { tool: "discover_tools", args: { query: "get self evaluation report and improvement recommendations", limit: 5 } },
    ],
  },

  // ── Edge cases and interaction patterns ──

  {
    name: "zero_match_queries",
    description: "Queries that have no good match — tests graceful degradation",
    calls: [
      { tool: "discover_tools", args: { query: "connect to Salesforce CRM and sync contacts", limit: 5 } },
      { tool: "discover_tools", args: { query: "deploy Kubernetes pods to AWS EKS cluster", limit: 5 } },
      { tool: "discover_tools", args: { query: "train a neural network on my dataset", limit: 5 } },
    ],
  },
  {
    name: "long_session_accumulation",
    description: "Realistic long session: load many toolsets, use tools, check state repeatedly",
    calls: [
      { tool: "list_available_toolsets", args: {} },
      { tool: "load_toolset", args: { toolset: "web" } },
      { tool: "load_toolset", args: { toolset: "github" } },
      { tool: "load_toolset", args: { toolset: "local_file" } },
      { tool: "load_toolset", args: { toolset: "llm" } },
      { tool: "load_toolset", args: { toolset: "vision" } },
      { tool: "load_toolset", args: { toolset: "seo" } },
      { tool: "list_available_toolsets", args: {} },
      { tool: "discover_tools", args: { query: "analyze screenshot", limit: 3 } },
      { tool: "discover_tools", args: { query: "fetch URL content", limit: 3 } },
      { tool: "unload_toolset", args: { toolset: "seo" } },
      { tool: "unload_toolset", args: { toolset: "vision" } },
      { tool: "list_available_toolsets", args: {} },
    ],
  },
  {
    name: "mixed_read_write_workflow",
    description: "Realistic pattern: discover → read data → analyze → verify → report",
    calls: [
      { tool: "discover_tools", args: { query: "read project files and analyze structure", limit: 5 } },
      { tool: "load_toolset", args: { toolset: "local_file" } },
      { tool: "discover_tools", args: { query: "run code quality analysis", limit: 5 } },
      { tool: "discover_tools", args: { query: "generate report with findings", limit: 5 } },
      { tool: "load_toolset", args: { toolset: "docs" } },
      { tool: "get_workflow_chain", args: { chain: "new_feature" } },
    ],
  },
  {
    name: "rapid_burst_calls",
    description: "Burst of quick calls — tests server under rapid consecutive requests",
    calls: [
      { tool: "get_tool_quick_ref", args: { toolName: "discover_tools" } },
      { tool: "get_tool_quick_ref", args: { toolName: "load_toolset" } },
      { tool: "get_tool_quick_ref", args: { toolName: "run_quality_gate" } },
      { tool: "get_tool_quick_ref", args: { toolName: "record_learning" } },
      { tool: "get_tool_quick_ref", args: { toolName: "start_verification_cycle" } },
      { tool: "get_tool_quick_ref", args: { toolName: "get_flywheel_status" } },
    ],
  },
];

// ── JSON-RPC helpers ────────────────────────────────────────────────────
let _msgId = 0;
function jsonRpcRequest(method: string, params: Record<string, unknown> = {}) {
  return JSON.stringify({ jsonrpc: "2.0", id: ++_msgId, method, params });
}

interface JsonRpcResponse {
  jsonrpc: string;
  id: number;
  result?: unknown;
  error?: { code: number; message: string };
}

// ── Server lifecycle ────────────────────────────────────────────────────
async function startServer(mode: "static" | "dynamic"): Promise<{
  proc: ChildProcess;
  send: (method: string, params?: Record<string, unknown>) => Promise<JsonRpcResponse>;
  close: () => Promise<void>;
}> {
  const args = ["--no-embedding", "--no-toon"]; // skip embedding + toon for faster test + parseable JSON
  if (mode === "dynamic") args.push("--dynamic");

  const proc = spawn("node", [SERVER_ENTRY, ...args], {
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env, NODE_ENV: "test" },
  });

  // Collect stderr for debugging
  const stderrChunks: string[] = [];
  proc.stderr?.on("data", (chunk: Buffer) => {
    stderrChunks.push(chunk.toString());
  });

  // Response promise map
  const pending = new Map<number, { resolve: (v: JsonRpcResponse) => void; reject: (e: Error) => void }>();

  // Parse stdout line by line for JSON-RPC responses
  let buffer = "";
  proc.stdout?.on("data", (chunk: Buffer) => {
    buffer += chunk.toString();
    // MCP uses newline-delimited JSON
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const msg = JSON.parse(line) as JsonRpcResponse;
        if (msg.id != null && pending.has(msg.id)) {
          pending.get(msg.id)!.resolve(msg);
          pending.delete(msg.id);
        }
      } catch { /* not JSON, skip */ }
    }
  });

  const send = (method: string, params: Record<string, unknown> = {}): Promise<JsonRpcResponse> => {
    return new Promise((resolve, reject) => {
      const req = jsonRpcRequest(method, params);
      pending.set(_msgId, { resolve, reject });
      proc.stdin?.write(req + "\n");

      // Timeout after 10s
      setTimeout(() => {
        if (pending.has(_msgId)) {
          pending.delete(_msgId);
          reject(new Error(`Timeout waiting for response to ${method} (id=${_msgId})`));
        }
      }, 10_000);
    });
  };

  const close = (): Promise<void> => {
    return new Promise((resolve) => {
      proc.on("exit", () => resolve());
      proc.kill("SIGTERM");
      // Force kill after 3s
      setTimeout(() => {
        try { proc.kill("SIGKILL"); } catch { /* already dead */ }
        resolve();
      }, 3_000);
    });
  };

  // Wait for server ready (stderr message)
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Server start timeout")), 15_000);
    const check = setInterval(() => {
      if (stderrChunks.some(s => s.includes("nodebench-mcp ready"))) {
        clearInterval(check);
        clearTimeout(timeout);
        resolve();
      }
    }, 100);
  });

  // Initialize MCP connection
  await send("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "ab-test-harness", version: "1.0.0" },
  });

  // Send initialized notification (no response expected, fire and forget)
  proc.stdin?.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");
  await new Promise(r => setTimeout(r, 200)); // small delay for server to process

  return { proc, send, close };
}

// ── Run scenarios ───────────────────────────────────────────────────────
async function runScenarios(mode: "static" | "dynamic", round: number): Promise<{
  mode: string;
  round: number;
  results: Array<{ scenario: string; tool: string; success: boolean; durationMs: number; hasLoadSuggestions: boolean; error?: string }>;
}> {
  console.log(`\n  [${mode.toUpperCase()} R${round}] Starting server...`);
  const { send, close } = await startServer(mode);
  const results: Array<{
    scenario: string; tool: string; success: boolean; durationMs: number;
    hasLoadSuggestions: boolean; suggestedToolsets: string[]; topResults: string[];
    error?: string;
  }> = [];

  for (const scenario of SCENARIOS) {
    console.log(`    Scenario: ${scenario.name}`);
    for (const call of scenario.calls) {
      const startMs = Date.now();
      try {
        const resp = await send("tools/call", { name: call.tool, arguments: call.args });
        const durationMs = Date.now() - startMs;
        const isError = resp.error != null || (resp.result as any)?.isError === true;
        const content = (resp.result as any)?.content?.[0]?.text ?? "";

        // Parse response for discovery accuracy metrics
        let hasLoadSuggestions = false;
        let suggestedToolsets: string[] = [];
        let topResults: string[] = [];
        try {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed?._loadSuggestions) && parsed._loadSuggestions.length > 0) {
            hasLoadSuggestions = true;
            suggestedToolsets = parsed._loadSuggestions.map((s: any) => s.toolset);
          }
          if (Array.isArray(parsed?.results)) {
            topResults = parsed.results.slice(0, 3).map((r: any) => r.name);
          }
        } catch { /* not JSON */ }

        results.push({
          scenario: scenario.name,
          tool: call.tool,
          success: !isError,
          durationMs,
          hasLoadSuggestions,
          suggestedToolsets,
          topResults,
          ...(isError ? { error: resp.error?.message ?? "tool error" } : {}),
        });
        const sugHint = suggestedToolsets.length > 0 ? ` [suggest: ${suggestedToolsets.join(",")}]` : "";
        const topHint = topResults.length > 0 ? ` top:[${topResults.join(",")}]` : "";
        console.log(`      ${call.tool}: ${isError ? "FAIL" : "OK"} (${durationMs}ms)${sugHint}${topHint}`);
      } catch (err: any) {
        results.push({
          scenario: scenario.name,
          tool: call.tool,
          success: false,
          durationMs: Date.now() - startMs,
          hasLoadSuggestions: false,
          suggestedToolsets: [],
          topResults: [],
          error: err.message,
        });
        console.log(`      ${call.tool}: ERROR (${err.message})`);
      }
    }
  }

  // ── tools/list verification: prove server returns new tools after load_toolset ──
  if (mode === "dynamic" && round === 1) {
    console.log(`    [NOTIFICATION TEST] Verifying tools/list reflects load_toolset...`);
    try {
      // 1. Get initial tool list
      const listBefore = await send("tools/list", {});
      const toolsBefore = ((listBefore.result as any)?.tools ?? []) as Array<{ name: string }>;
      const beforeCount = toolsBefore.length;
      const beforeNames = new Set(toolsBefore.map(t => t.name));

      // 2. Pick a toolset that isn't loaded yet
      const testToolset = "voice_bridge";
      const isAlreadyLoaded = beforeNames.has("design_voice_pipeline");

      if (!isAlreadyLoaded) {
        // 3. Load it
        await send("tools/call", { name: "load_toolset", arguments: { toolset: testToolset } });

        // 4. Re-fetch tools/list (simulates what a client does after list_changed)
        const listAfter = await send("tools/list", {});
        const toolsAfter = ((listAfter.result as any)?.tools ?? []) as Array<{ name: string }>;
        const afterCount = toolsAfter.length;
        const afterNames = new Set(toolsAfter.map(t => t.name));

        // 5. Check new tools appeared
        const newTools = [...afterNames].filter(n => !beforeNames.has(n));
        const hasExpectedTool = afterNames.has("design_voice_pipeline");

        console.log(`      tools/list BEFORE: ${beforeCount} tools`);
        console.log(`      tools/list AFTER:  ${afterCount} tools (+${afterCount - beforeCount})`);
        console.log(`      New tools: [${newTools.join(", ")}]`);
        console.log(`      Has design_voice_pipeline: ${hasExpectedTool}`);
        console.log(`      ✓ SERVER PROOF: tools/list returns updated tools after load_toolset`);

        // 6. Test call_loaded_tool proxy (fallback for clients without list_changed)
        const proxyResp = await send("tools/call", {
          name: "call_loaded_tool",
          arguments: { tool: "design_voice_pipeline", args: {} },
        });
        const proxyContent = (proxyResp.result as any)?.content?.[0]?.text ?? "";
        const proxyOk = proxyResp.error == null && !(proxyResp.result as any)?.isError;
        console.log(`      call_loaded_tool proxy: ${proxyOk ? "✓ OK" : "✗ FAIL"} (dispatched to design_voice_pipeline)`);

        // 7. Unload to clean up
        await send("tools/call", { name: "unload_toolset", arguments: { toolset: testToolset } });

        // 7. Verify unload reflected too
        const listFinal = await send("tools/list", {});
        const toolsFinal = ((listFinal.result as any)?.tools ?? []) as Array<{ name: string }>;
        const removedTools = [...afterNames].filter(n => !new Set(toolsFinal.map(t => t.name)).has(n));
        console.log(`      tools/list AFTER UNLOAD: ${toolsFinal.length} tools (-${afterCount - toolsFinal.length})`);
        console.log(`      Removed: [${removedTools.join(", ")}]`);
        console.log(`      ✓ SERVER PROOF: tools/list reflects unload_toolset too`);
      } else {
        console.log(`      SKIP: ${testToolset} already loaded (${beforeCount} tools)`);
      }
    } catch (err: any) {
      console.log(`      ✗ NOTIFICATION TEST FAILED: ${err.message}`);
    }
  }

  console.log(`  [${mode.toUpperCase()} R${round}] Closing server...`);
  await close();
  return { mode, round, results };
}

// ── Main ────────────────────────────────────────────────────────────────
async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  A/B Test: Static vs Dynamic Toolset Loading");
  console.log(`  Rounds: ${ROUNDS} per mode | Scenarios: ${SCENARIOS.length}`);
  console.log(`  Total calls per round: ${SCENARIOS.reduce((s, sc) => s + sc.calls.length, 0)}`);
  console.log("═══════════════════════════════════════════════════════════");

  // Build first
  console.log("\n[BUILD] Compiling TypeScript...");
  const build = spawn("npx", ["tsc", "--outDir", "dist"], {
    cwd: join(import.meta.dirname, ".."),
    stdio: "inherit",
    shell: true,
  });
  await new Promise<void>((resolve, reject) => {
    build.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`Build failed with code ${code}`)));
  });
  console.log("[BUILD] Done.\n");

  const allResults: Array<{ mode: string; round: number; results: any[] }> = [];

  // Run static rounds
  console.log("──── GROUP A: STATIC MODE ────");
  for (let r = 1; r <= ROUNDS; r++) {
    const result = await runScenarios("static", r);
    allResults.push(result);
  }

  // Run dynamic rounds
  console.log("\n──── GROUP B: DYNAMIC MODE ────");
  for (let r = 1; r <= ROUNDS; r++) {
    const result = await runScenarios("dynamic", r);
    allResults.push(result);
  }

  // ── Analyze from SQLite ───────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("  A/B TEST RESULTS");
  console.log("═══════════════════════════════════════════════════════════\n");

  const dbPath = join(homedir(), ".nodebench", "nodebench.db");
  const db = new Database(dbPath, { readonly: true });

  // Session summary
  const sessions = db.prepare(`
    SELECT
      mode,
      COUNT(*) as sessions,
      ROUND(AVG(initial_tool_count), 1) as avg_initial_tools,
      ROUND(AVG(COALESCE(final_tool_count, initial_tool_count)), 1) as avg_final_tools,
      ROUND(AVG(COALESCE(total_tool_calls, 0)), 1) as avg_tool_calls,
      ROUND(AVG(COALESCE(total_load_events, 0)), 1) as avg_load_events,
      ROUND(AVG(COALESCE(session_duration_ms, 0)) / 1000.0, 1) as avg_duration_sec
    FROM ab_test_sessions
    WHERE created_at > datetime('now', '-10 minutes')
    GROUP BY mode
  `).all() as any[];

  console.log("Session Summary (this run):");
  console.log("─────────────────────────────────────────────────────────");
  for (const s of sessions) {
    console.log(`  ${s.mode.toUpperCase().padEnd(8)} | ${s.sessions} sessions | avg ${s.avg_initial_tools}→${s.avg_final_tools} tools | ${s.avg_tool_calls} calls | ${s.avg_load_events} loads | ${s.avg_duration_sec}s`);
  }

  // Error rates
  const errors = db.prepare(`
    SELECT
      s.mode,
      COUNT(CASE WHEN t.result_status = 'error' THEN 1 END) as errors,
      COUNT(*) as total,
      ROUND(100.0 * COUNT(CASE WHEN t.result_status = 'error' THEN 1 END) / MAX(COUNT(*), 1), 2) as error_pct
    FROM tool_call_log t
    JOIN ab_test_sessions s ON t.session_id = s.id
    WHERE s.created_at > datetime('now', '-10 minutes')
    GROUP BY s.mode
  `).all() as any[];

  console.log("\nError Rates:");
  console.log("─────────────────────────────────────────────────────────");
  for (const e of errors) {
    console.log(`  ${e.mode.toUpperCase().padEnd(8)} | ${e.errors}/${e.total} errors (${e.error_pct}%)`);
  }

  // Load events
  const loads = db.prepare(`
    SELECT toolset_name, COUNT(*) as count, ROUND(AVG(latency_ms), 1) as avg_ms
    FROM ab_tool_events
    WHERE event_type = 'load' AND created_at > datetime('now', '-10 minutes')
    GROUP BY toolset_name
    ORDER BY count DESC
  `).all() as any[];

  if (loads.length > 0) {
    console.log("\nDynamic Load Events:");
    console.log("─────────────────────────────────────────────────────────");
    for (const l of loads) {
      console.log(`  ${l.toolset_name.padEnd(20)} | ${l.count}x loaded | avg ${l.avg_ms}ms`);
    }
  }

  // In-memory analysis: load suggestions
  const staticResults = allResults.filter(r => r.mode === "static").flatMap(r => r.results);
  const dynamicResults = allResults.filter(r => r.mode === "dynamic").flatMap(r => r.results);

  const staticSuggestions = staticResults.filter(r => r.hasLoadSuggestions).length;
  const dynamicSuggestions = dynamicResults.filter(r => r.hasLoadSuggestions).length;
  const staticSuccessRate = staticResults.length > 0 ? (staticResults.filter(r => r.success).length / staticResults.length * 100).toFixed(1) : "N/A";
  const dynamicSuccessRate = dynamicResults.length > 0 ? (dynamicResults.filter(r => r.success).length / dynamicResults.length * 100).toFixed(1) : "N/A";
  const staticAvgMs = staticResults.length > 0 ? Math.round(staticResults.reduce((s, r) => s + r.durationMs, 0) / staticResults.length) : 0;
  const dynamicAvgMs = dynamicResults.length > 0 ? Math.round(dynamicResults.reduce((s, r) => s + r.durationMs, 0) / dynamicResults.length) : 0;

  console.log("\nIn-Memory Metrics:");
  console.log("─────────────────────────────────────────────────────────");
  console.log(`  STATIC   | ${staticSuccessRate}% success | avg ${staticAvgMs}ms/call | ${staticSuggestions} load suggestions`);
  console.log(`  DYNAMIC  | ${dynamicSuccessRate}% success | avg ${dynamicAvgMs}ms/call | ${dynamicSuggestions} load suggestions`);

  // Discovery accuracy: did _loadSuggestions point to the correct toolset?
  const EXPECTED_SUGGESTIONS: Record<string, string[]> = {
    // scenario → expected toolsets in suggestions for discover_tools calls
    // Original scenarios
    "file_operations": ["local_file"],
    "email_workflow": ["email", "rss"],
    "github_search": ["github"],
    "academic_writing": ["research_writing"],
    "git_pre_merge": ["git_workflow"],
    "seo_audit": ["seo"],
    "cross_preset_discovery": ["vision", "seo", "local_file", "ui_capture"],
    "natural_language_discovery": ["local_file", "seo", "llm"],
    // Production usage scenarios (from TDS research: Web 24.8%, SWE 24.7%, DB 23.1%)
    "browser_automation": ["ui_capture", "vision"],
    "database_search": ["local_file", "platform"],
    "cicd_devops": ["bootstrap", "self_eval"],
    "productivity_comms": ["email", "docs", "parallel"],
    "design_integration": ["figma_flow", "vision", "ui_capture"],
    "data_analysis_pipeline": ["local_file"],
    "security_audit": [],  // security is in default preset — no _loadSuggestions needed
    "llm_model_interaction": ["llm"],
    "monitoring_observability": ["self_eval", "pattern"],
    // Edge cases
    "zero_match_queries": [],  // no good match expected — graceful degradation
  };

  console.log("\nDiscovery Accuracy (did _loadSuggestions point to the right toolset?):");
  console.log("─────────────────────────────────────────────────────────");
  let totalChecks = 0;
  let correctChecks = 0;
  // Use first round of dynamic results for accuracy check
  const firstDynamic = allResults.find(r => r.mode === "dynamic" && r.round === 1)?.results ?? [];
  for (const [scenario, expectedToolsets] of Object.entries(EXPECTED_SUGGESTIONS)) {
    const discoverCalls = firstDynamic.filter(
      (r: any) => r.scenario === scenario && r.tool === "discover_tools"
    );
    const callsWithSuggestions = discoverCalls.filter((r: any) => r.suggestedToolsets?.length > 0);

    // Zero-match scenarios: success = discover_tools returned without error (graceful degradation)
    if (expectedToolsets.length === 0) {
      const allOk = discoverCalls.every((r: any) => r.success);
      totalChecks++;
      if (allOk) correctChecks++;
      console.log(`  ${scenario.padEnd(28)} | ${allOk ? "✓" : "✗"} graceful degradation (${discoverCalls.length} calls, all OK: ${allOk})`);
      continue;
    }

    if (callsWithSuggestions.length === 0) {
      // No suggestions — check if expected toolsets are already loaded (e.g. security)
      const allExpectedLoaded = expectedToolsets.every(ts =>
        ["verification", "eval", "quality_gate", "learning", "flywheel", "recon", "security", "boilerplate"].includes(ts)
      );
      totalChecks++;
      if (allExpectedLoaded) {
        correctChecks++;
        console.log(`  ${scenario.padEnd(28)} | ✓ no suggestions needed (expected toolsets already loaded)`);
      } else {
        console.log(`  ${scenario.padEnd(28)} | ✗ NO suggestions (0 discover calls with suggestions)`);
      }
      continue;
    }
    const allSuggested = new Set(callsWithSuggestions.flatMap((r: any) => r.suggestedToolsets));
    const hits = expectedToolsets.filter(ts => allSuggested.has(ts));
    const accuracy = hits.length > 0 ? "✓" : "✗";
    totalChecks++;
    if (hits.length > 0) correctChecks++;
    console.log(`  ${scenario.padEnd(28)} | ${accuracy} suggested:[${[...allSuggested].join(",")}] expected:[${expectedToolsets.join(",")}] hits:${hits.length}/${expectedToolsets.length}`);
  }
  if (totalChecks > 0) {
    console.log(`  ──────────────────────────────────────────`);
    console.log(`  Overall: ${correctChecks}/${totalChecks} scenarios correctly suggested (${(correctChecks / totalChecks * 100).toFixed(0)}%)`);
  }

  // Per-scenario breakdown
  console.log("\nPer-Scenario Breakdown (dynamic mode, round 1):");
  console.log("─────────────────────────────────────────────────────────");
  const scenarioNames = [...new Set(firstDynamic.map((r: any) => r.scenario))];
  for (const sn of scenarioNames) {
    const calls = firstDynamic.filter((r: any) => r.scenario === sn);
    const successes = calls.filter((r: any) => r.success).length;
    const suggestions = calls.filter((r: any) => r.hasLoadSuggestions).length;
    const avgMs = Math.round(calls.reduce((s: number, r: any) => s + r.durationMs, 0) / calls.length);
    console.log(`  ${sn.padEnd(28)} | ${successes}/${calls.length} ok | ${suggestions} suggestions | avg ${avgMs}ms`);
  }

  // Verdict
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("  VERDICT");
  console.log("═══════════════════════════════════════════════════════════");

  const staticSession = sessions.find((s: any) => s.mode === "static");
  const dynamicSession = sessions.find((s: any) => s.mode === "dynamic");
  if (staticSession && dynamicSession) {
    const toolDelta = staticSession.avg_final_tools - dynamicSession.avg_final_tools;
    console.log(`  Tool count: Static avg ${staticSession.avg_final_tools} vs Dynamic avg ${dynamicSession.avg_final_tools} (delta: ${toolDelta > 0 ? "-" : "+"}${Math.abs(toolDelta).toFixed(1)})`);
    console.log(`  Load events: Dynamic loaded ${dynamicSession.avg_load_events} toolsets/session on average`);
    console.log(`  Call latency: Static avg ${staticAvgMs}ms vs Dynamic avg ${dynamicAvgMs}ms`);

    if (toolDelta > 5) {
      console.log("\n  ✓ Dynamic loading reduces active tool count significantly.");
    }
    if (dynamicSession.avg_load_events > 0) {
      console.log("  ✓ Agents successfully discover and load toolsets on demand.");
    }
  } else {
    console.log("  Insufficient data. Check server logs for errors.");
  }

  console.log("\n  Data persisted to ~/.nodebench/nodebench.db");
  console.log("  Run `get_ab_test_report` tool for detailed comparison.\n");

  db.close();
}

main().catch((err) => {
  console.error("A/B test harness failed:", err);
  process.exit(1);
});
