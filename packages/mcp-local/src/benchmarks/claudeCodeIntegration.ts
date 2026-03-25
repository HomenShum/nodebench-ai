/**
 * claudeCodeIntegration.ts — Real MCP stdio integration test for NodeBench.
 *
 * Tests NodeBench MCP exactly as Claude Code uses it: spawns the server as a
 * child process and communicates via JSON-RPC over stdio (line-delimited JSON).
 *
 * Usage:
 *   npx tsx src/benchmarks/claudeCodeIntegration.ts
 *
 * Requires: `npm run build` first (spawns dist/index.js).
 */

import { spawn, type ChildProcess } from "node:child_process";
import { join, dirname } from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createInterface, type Interface as RLInterface } from "node:readline";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Environment                                                               */
/* ═══════════════════════════════════════════════════════════════════════════ */

function loadEnv(): void {
  if (process.env.GEMINI_API_KEY) return;
  const paths = [".env.local", "../.env.local", "../../.env.local"];
  for (const p of paths) {
    try {
      const content = readFileSync(join(process.cwd(), p), "utf-8");
      for (const line of content.split("\n")) {
        const match = line.match(/^(GEMINI_API_KEY)\s*=\s*(.+)$/);
        if (match) {
          process.env[match[1]] = match[2].trim();
          return;
        }
      }
    } catch {
      /* skip missing files */
    }
  }
}

loadEnv();

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  MCP Client over stdio                                                     */
/* ═══════════════════════════════════════════════════════════════════════════ */

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: number;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

class McpStdioClient {
  private proc: ChildProcess;
  private nextId = 1;
  private pending = new Map<number, {
    resolve: (v: JsonRpcResponse) => void;
    reject: (e: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  }>();
  private rl: RLInterface;
  private ready: Promise<void>;

  constructor(serverPath: string, args: string[]) {
    // __dirname = src/benchmarks/ -> go up two levels to package root
    const pkgDir = join(__dirname, "..", "..");
    const resolvedServer = join(pkgDir, serverPath);

    this.proc = spawn("node", [resolvedServer, ...args], {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, NODE_NO_WARNINGS: "1" },
      cwd: pkgDir,
    });

    // Capture stderr for debugging but don't block
    this.proc.stderr?.on("data", (chunk: Buffer) => {
      const text = chunk.toString().trim();
      if (text && process.env.DEBUG_MCP) {
        process.stderr.write(`  [server stderr] ${text}\n`);
      }
    });

    // Read line-delimited JSON from stdout
    this.rl = createInterface({ input: this.proc.stdout!, crlfDelay: Infinity });
    this.rl.on("line", (line: string) => {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("{")) return; // skip non-JSON lines
      try {
        const msg = JSON.parse(trimmed) as JsonRpcResponse;
        if (msg.id != null && this.pending.has(msg.id)) {
          const entry = this.pending.get(msg.id)!;
          clearTimeout(entry.timer);
          this.pending.delete(msg.id);
          entry.resolve(msg);
        }
      } catch {
        // not JSON — ignore (log lines, etc.)
      }
    });

    // Wait for the process to be writable
    this.ready = new Promise<void>((resolve) => {
      if (this.proc.stdin?.writable) {
        resolve();
      } else {
        this.proc.stdin?.once("ready", resolve);
        // fallback: resolve after a short delay
        setTimeout(resolve, 500);
      }
    });
  }

  /** Send a JSON-RPC request and wait for the matching response. */
  async request(method: string, params?: Record<string, unknown>, timeoutMs = 30_000): Promise<JsonRpcResponse> {
    await this.ready;
    const id = this.nextId++;
    const msg: JsonRpcRequest = { jsonrpc: "2.0", id, method, params };
    const line = JSON.stringify(msg) + "\n";

    return new Promise<JsonRpcResponse>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Timeout after ${timeoutMs}ms for ${method} (id=${id})`));
      }, timeoutMs);

      this.pending.set(id, { resolve, reject, timer });
      this.proc.stdin!.write(line);
    });
  }

  /** Send a JSON-RPC notification (no id, no response expected). */
  async notify(method: string, params?: Record<string, unknown>): Promise<void> {
    await this.ready;
    const msg: JsonRpcRequest = { jsonrpc: "2.0", method, params };
    const line = JSON.stringify(msg) + "\n";
    this.proc.stdin!.write(line);
    // Give the server a moment to process
    await new Promise<void>((r) => setTimeout(r, 100));
  }

  /** Call an MCP tool via tools/call. */
  async callTool(name: string, args: Record<string, unknown> = {}, timeoutMs = 30_000): Promise<JsonRpcResponse> {
    return this.request("tools/call", { name, arguments: args }, timeoutMs);
  }

  /** Shut down the child process. */
  async close(): Promise<void> {
    for (const [, entry] of this.pending) {
      clearTimeout(entry.timer);
      entry.reject(new Error("Client closing"));
    }
    this.pending.clear();
    this.rl.close();
    this.proc.stdin?.end();
    this.proc.kill("SIGTERM");
    // Wait for exit
    await new Promise<void>((resolve) => {
      const t = setTimeout(() => {
        this.proc.kill("SIGKILL");
        resolve();
      }, 5_000);
      this.proc.once("exit", () => {
        clearTimeout(t);
        resolve();
      });
    });
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Test harness                                                              */
/* ═══════════════════════════════════════════════════════════════════════════ */

interface TestResult {
  name: string;
  passed: boolean;
  durationMs: number;
  error?: string;
  detail?: string;
}

const results: TestResult[] = [];

async function runTest(
  name: string,
  fn: () => Promise<{ passed: boolean; detail?: string }>,
): Promise<void> {
  const t0 = Date.now();
  try {
    const { passed, detail } = await fn();
    results.push({ name, passed, durationMs: Date.now() - t0, detail });
  } catch (err) {
    results.push({
      name,
      passed: false,
      durationMs: Date.now() - t0,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Main                                                                      */
/* ═══════════════════════════════════════════════════════════════════════════ */

async function main(): Promise<void> {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  NodeBench MCP — Claude Code Integration Tests              ║");
  console.log("║  Transport: stdio (JSON-RPC over stdin/stdout)              ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  // Spawn the MCP server
  const client = new McpStdioClient("dist/index.js", [
    "--preset", "starter",
    "--no-toon",
    "--no-embedding",
  ]);

  // Allow server to initialize DB, load toolsets
  await new Promise<void>((r) => setTimeout(r, 2_000));

  let initialToolCount = 0;

  /* ── Test 1: Initialize ────────────────────────────────────────────────── */
  await runTest("1. Initialize", async () => {
    const res = await client.request("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "claude-code-integration-test", version: "1.0.0" },
    });

    if (res.error) {
      return { passed: false, detail: `Error: ${res.error.message}` };
    }

    const result = res.result as Record<string, unknown> | undefined;
    const serverInfo = result?.serverInfo as { name?: string } | undefined;
    const hasServerInfo = !!serverInfo?.name;
    const nameContainsNodebench = serverInfo?.name?.includes("nodebench") ?? false;

    // Send initialized notification
    await client.notify("notifications/initialized");

    return {
      passed: hasServerInfo && nameContainsNodebench,
      detail: `serverInfo.name = "${serverInfo?.name ?? "missing"}"`,
    };
  });

  /* ── Test 2: List Tools ────────────────────────────────────────────────── */
  await runTest("2. List Tools (starter preset)", async () => {
    const res = await client.request("tools/list", {});

    if (res.error) {
      return { passed: false, detail: `Error: ${res.error.message}` };
    }

    const result = res.result as { tools?: unknown[] } | undefined;
    const tools = result?.tools;
    if (!Array.isArray(tools)) {
      return { passed: false, detail: "No tools array in response" };
    }

    initialToolCount = tools.length;

    // Starter preset = deep_sim (7) + meta/progressive discovery overhead (~12)
    // Expected: ~19 tools. Allow range 10-30 for flexibility.
    const countOk = tools.length >= 10 && tools.length <= 30;

    // Verify each tool has required fields
    const wellFormed = tools.every((t: unknown) => {
      const tool = t as Record<string, unknown>;
      return (
        typeof tool.name === "string" &&
        typeof tool.description === "string" &&
        tool.inputSchema != null
      );
    });

    return {
      passed: countOk && wellFormed,
      detail: `${tools.length} tools, all well-formed: ${wellFormed}`,
    };
  });

  /* ── Test 3: Progressive Discovery ─────────────────────────────────────── */
  await runTest("3. Progressive Discovery (discover_tools)", async () => {
    const res = await client.callTool("discover_tools", {
      query: "founder weekly reset",
    });

    if (res.error) {
      return { passed: false, detail: `Error: ${res.error.message}` };
    }

    const result = res.result as { content?: Array<{ text?: string }> } | undefined;
    const text = result?.content?.[0]?.text ?? "";

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(text);
    } catch {
      return { passed: false, detail: `Response is not JSON: ${text.slice(0, 200)}` };
    }

    const matches = parsed.matches as unknown[] | undefined;
    const hasMatches = Array.isArray(matches) && matches.length > 0;

    // Check that it suggests loading a toolset
    const suggestsToolset =
      text.includes("load_toolset") ||
      text.includes("founder") ||
      (parsed._unloadedToolsetHits != null);

    return {
      passed: hasMatches && suggestsToolset,
      detail: `${matches?.length ?? 0} matches, suggests toolset: ${suggestsToolset}`,
    };
  });

  /* ── Test 4: Dynamic Loading (load_toolset) ────────────────────────────── */
  await runTest("4. Dynamic Loading (load_toolset -> founder)", async () => {
    const res = await client.callTool("load_toolset", {
      toolset: "founder",
    });

    if (res.error) {
      return { passed: false, detail: `Error: ${res.error.message}` };
    }

    // Give server time to register new tools and send listChanged notification
    await new Promise<void>((r) => setTimeout(r, 1_500));

    // Re-list tools
    const listRes = await client.request("tools/list", {});
    const listResult = listRes.result as { tools?: unknown[] } | undefined;
    const newCount = listResult?.tools?.length ?? 0;

    const increased = newCount > initialToolCount;

    return {
      passed: increased,
      detail: `Before: ${initialToolCount}, after: ${newCount} (delta: +${newCount - initialToolCount})`,
    };
  });

  /* ── Test 5: Tool Execution (founder_local_synthesize) ─────────────────── */
  await runTest("5. Tool Execution (founder_local_synthesize)", async () => {
    const res = await client.callTool(
      "founder_local_synthesize",
      { query: "What is NodeBench?" },
      30_000,
    );

    if (res.error) {
      return { passed: false, detail: `Error: ${res.error.message}` };
    }

    const result = res.result as { content?: Array<{ text?: string }> } | undefined;
    const text = result?.content?.[0]?.text ?? "";

    if (!text) {
      return { passed: false, detail: "Empty response text" };
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(text);
    } catch {
      // Some tools return plain text — that's also acceptable
      return {
        passed: text.length > 20,
        detail: `Plain text response (${text.length} chars)`,
      };
    }

    // Check for structured output (summary, keyFindings, or other expected fields)
    const hasStructure =
      parsed.summary != null ||
      parsed.keyFindings != null ||
      parsed.packet != null ||
      parsed.synthesis != null ||
      parsed.answer != null;
    const noError = parsed.error == null;

    return {
      passed: noError && (hasStructure || text.length > 50),
      detail: `Structured: ${hasStructure}, keys: [${Object.keys(parsed).slice(0, 5).join(", ")}]`,
    };
  });

  /* ── Test 6: Memory Persistence (record_event + get_event_ledger) ──────── */
  await runTest("6. Memory Persistence (record_event -> get_event_ledger)", async () => {
    const testEntityId = `test-entity-${Date.now()}`;
    const testSummary = `Integration test event at ${new Date().toISOString()}`;

    // Record an event
    const recordRes = await client.callTool("record_event", {
      eventType: "agent_action",
      actorType: "agent",
      entityType: "test",
      entityId: testEntityId,
      summary: testSummary,
    });

    if (recordRes.error) {
      return { passed: false, detail: `record_event error: ${recordRes.error.message}` };
    }

    const recordResult = recordRes.result as { content?: Array<{ text?: string }> } | undefined;
    const recordText = recordResult?.content?.[0]?.text ?? "";
    let recordParsed: Record<string, unknown>;
    try {
      recordParsed = JSON.parse(recordText);
    } catch {
      return { passed: false, detail: `record_event response not JSON: ${recordText.slice(0, 200)}` };
    }

    const eventId = recordParsed.eventId as string | undefined;
    if (!eventId) {
      return { passed: false, detail: "No eventId in record_event response" };
    }

    // Query the ledger for our event
    const ledgerRes = await client.callTool("get_event_ledger", {
      entityId: testEntityId,
    });

    if (ledgerRes.error) {
      return { passed: false, detail: `get_event_ledger error: ${ledgerRes.error.message}` };
    }

    const ledgerResult = ledgerRes.result as { content?: Array<{ text?: string }> } | undefined;
    const ledgerText = ledgerResult?.content?.[0]?.text ?? "";

    // The event should appear somewhere in the ledger response
    const eventFound = ledgerText.includes(testEntityId) || ledgerText.includes(eventId);

    return {
      passed: eventFound,
      detail: `eventId: ${eventId}, found in ledger: ${eventFound}`,
    };
  });

  /* ── Cleanup ───────────────────────────────────────────────────────────── */
  await client.close();

  /* ── Report ────────────────────────────────────────────────────────────── */
  console.log("\n" + "═".repeat(64));
  console.log("  RESULTS");
  console.log("═".repeat(64));

  for (const r of results) {
    const status = r.passed ? "\x1b[32mPASS\x1b[0m" : "\x1b[31mFAIL\x1b[0m";
    const timing = `${r.durationMs}ms`;
    console.log(`  ${status}  ${r.name}  (${timing})`);
    if (r.detail) console.log(`         ${r.detail}`);
    if (r.error) console.log(`         \x1b[31mError: ${r.error}\x1b[0m`);
  }

  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  const pct = Math.round((passed / total) * 100);
  const color = pct === 100 ? "\x1b[32m" : pct >= 50 ? "\x1b[33m" : "\x1b[31m";

  console.log("\n" + "═".repeat(64));
  console.log(`  ${color}${passed}/${total} passed (${pct}%)\x1b[0m`);
  console.log("═".repeat(64) + "\n");

  process.exit(passed === total ? 0 : 1);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(2);
});
