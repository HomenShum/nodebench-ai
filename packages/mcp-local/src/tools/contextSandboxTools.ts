/**
 * Context Sandbox Tools — Context window protection via FTS5 indexing.
 *
 * Inspired by claude-context-mode (mksglu): raw output stays in a SQLite
 * sandbox and only summaries/search results enter the agent's context window.
 *
 * 5 tools in the `context_sandbox` domain:
 * - sandbox_ingest: Index arbitrary text/content into FTS5, return a compact reference
 * - sandbox_search: BM25-ranked search across all sandboxed content
 * - sandbox_execute: Run a shell command, index output, return summary only
 * - sandbox_batch: Batch multiple commands + queries in one call
 * - sandbox_stats: Token savings tracking per source/session
 */

import { getDb, genId } from "../db.js";
import type { McpTool } from "../types.js";
import { execSync } from "child_process";

// ── Session-level stats ─────────────────────────────────────────────────
const sessionStats = {
  startedAt: Date.now(),
  calls: {} as Record<string, number>,
  bytesIndexed: 0,
  bytesReturned: 0,
};

function trackCall(tool: string, indexed: number, returned: number): void {
  sessionStats.calls[tool] = (sessionStats.calls[tool] || 0) + 1;
  sessionStats.bytesIndexed += indexed;
  sessionStats.bytesReturned += returned;
}

// ── FTS5 schema (lazy init) ─────────────────────────────────────────────
let _initialized = false;

function ensureSandboxTables(): void {
  if (_initialized) return;
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS sandbox_chunks (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      source_id   TEXT NOT NULL,
      source_label TEXT NOT NULL,
      title       TEXT NOT NULL,
      content     TEXT NOT NULL,
      byte_size   INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_sandbox_chunks_source ON sandbox_chunks(source_id);

    CREATE VIRTUAL TABLE IF NOT EXISTS sandbox_fts USING fts5(
      title,
      content,
      source_label,
      content='sandbox_chunks',
      content_rowid='id',
      tokenize='porter unicode61'
    );

    CREATE TRIGGER IF NOT EXISTS sandbox_fts_insert AFTER INSERT ON sandbox_chunks BEGIN
      INSERT INTO sandbox_fts(rowid, title, content, source_label)
      VALUES (new.id, new.title, new.content, new.source_label);
    END;

    CREATE TRIGGER IF NOT EXISTS sandbox_fts_delete AFTER DELETE ON sandbox_chunks BEGIN
      INSERT INTO sandbox_fts(sandbox_fts, rowid, title, content, source_label)
      VALUES ('delete', old.id, old.title, old.content, old.source_label);
    END;
  `);
  _initialized = true;
}

// ── Chunking ────────────────────────────────────────────────────────────
interface Chunk {
  title: string;
  content: string;
}

function chunkText(text: string, label: string, maxChunkSize = 2048): Chunk[] {
  const lines = text.split("\n");
  const chunks: Chunk[] = [];
  let current: string[] = [];
  let currentTitle = `${label} (part 1)`;
  let partNum = 1;

  for (const line of lines) {
    // Heading-based splitting
    if (/^#{1,3}\s/.test(line) && current.length > 0) {
      chunks.push({ title: currentTitle, content: current.join("\n") });
      partNum++;
      currentTitle = line.replace(/^#+\s*/, "").slice(0, 100) || `${label} (part ${partNum})`;
      current = [line];
      continue;
    }

    current.push(line);

    // Size-based splitting
    if (current.join("\n").length >= maxChunkSize) {
      chunks.push({ title: currentTitle, content: current.join("\n") });
      partNum++;
      currentTitle = `${label} (part ${partNum})`;
      current = [];
    }
  }

  if (current.length > 0) {
    chunks.push({ title: currentTitle, content: current.join("\n") });
  }

  return chunks.length > 0 ? chunks : [{ title: label, content: text }];
}

// ── Index content ───────────────────────────────────────────────────────
function indexContent(label: string, text: string): { sourceId: string; chunkCount: number; totalBytes: number } {
  ensureSandboxTables();
  const db = getDb();
  const sourceId = genId("sbx");
  const chunks = chunkText(text, label);
  const totalBytes = Buffer.byteLength(text);

  const insert = db.prepare(
    `INSERT INTO sandbox_chunks (source_id, source_label, title, content, byte_size)
     VALUES (?, ?, ?, ?, ?)`
  );

  const tx = db.transaction(() => {
    for (const chunk of chunks) {
      insert.run(sourceId, label, chunk.title, chunk.content, Buffer.byteLength(chunk.content));
    }
  });
  tx();

  return { sourceId, chunkCount: chunks.length, totalBytes };
}

// ── Search ──────────────────────────────────────────────────────────────
interface SearchResult {
  title: string;
  snippet: string;
  sourceLabel: string;
  rank: number;
}

function searchSandbox(query: string, sourceLabel?: string, limit = 5): SearchResult[] {
  ensureSandboxTables();
  const db = getDb();

  // Sanitize query for FTS5
  const safeQuery = query.replace(/[^\w\s]/g, " ").trim();
  if (!safeQuery) return [];

  let sql: string;
  const params: unknown[] = [];

  if (sourceLabel) {
    sql = `SELECT title, snippet(sandbox_fts, 1, '>>>', '<<<', '...', 40) as snippet,
           source_label, rank
           FROM sandbox_fts
           WHERE sandbox_fts MATCH ? AND source_label = ?
           ORDER BY rank
           LIMIT ?`;
    params.push(safeQuery, sourceLabel, limit);
  } else {
    sql = `SELECT title, snippet(sandbox_fts, 1, '>>>', '<<<', '...', 40) as snippet,
           source_label, rank
           FROM sandbox_fts
           WHERE sandbox_fts MATCH ?
           ORDER BY rank
           LIMIT ?`;
    params.push(safeQuery, limit);
  }

  try {
    const rows = db.prepare(sql).all(...params) as any[];
    return rows.map((r) => ({
      title: r.title,
      snippet: r.snippet,
      sourceLabel: r.source_label,
      rank: r.rank,
    }));
  } catch {
    return [];
  }
}

// ── Execute shell command (secured via commandSandbox) ──────────────────
import { safeExec, SecurityError } from "../security/index.js";

function executeCommand(command: string, timeoutMs = 30000): { stdout: string; stderr: string; exitCode: number } {
  try {
    const result = safeExec(command, { timeout: timeoutMs, allowPipes: true });
    return { stdout: result.stdout, stderr: result.stderr, exitCode: result.exitCode };
  } catch (err: any) {
    if (err instanceof SecurityError) {
      return { stdout: "", stderr: `[SECURITY] ${err.message}`, exitCode: 126 };
    }
    return {
      stdout: err.stdout ?? "",
      stderr: err.stderr ?? "",
      exitCode: err.status ?? 1,
    };
  }
}

// ═════════════════════════════════════════════════════════════════════════
// TOOLS
// ═════════════════════════════════════════════════════════════════════════

export const contextSandboxTools: McpTool[] = [
  // ── Tool 1: sandbox_ingest ──────────────────────────────────────────
  {
    name: "sandbox_ingest",
    description:
      "Index arbitrary text into the context sandbox (FTS5). Raw content stays in SQLite — only a compact reference enters context. Use for large outputs, API responses, file contents, or any data you want searchable without flooding the context window.",
    inputSchema: {
      type: "object",
      properties: {
        label: {
          type: "string",
          description: "Label for the indexed content (e.g., 'API response', 'build output', 'README')",
        },
        content: {
          type: "string",
          description: "The raw content to index. Will be chunked by headings or size and stored in FTS5.",
        },
      },
      required: ["label", "content"],
    },
    handler: async (args) => {
      const label = String(args.label ?? "");
      const content = String(args.content ?? "");
      if (!label || !content) return { error: "label and content are required" };

      const { sourceId, chunkCount, totalBytes } = indexContent(label, content);
      const returnedBytes = 120; // approx size of this response
      trackCall("sandbox_ingest", totalBytes, returnedBytes);

      return {
        indexed: true,
        sourceId,
        label,
        chunks: chunkCount,
        bytesIndexed: totalBytes,
        bytesInContext: returnedBytes,
        savingsRatio: totalBytes > 0 ? `${(totalBytes / Math.max(returnedBytes, 1)).toFixed(0)}x` : "N/A",
        _hint: `Indexed ${chunkCount} chunks (${(totalBytes / 1024).toFixed(1)}KB). Use sandbox_search to query this content. Label: "${label}".`,
      };
    },
  },

  // ── Tool 2: sandbox_search ──────────────────────────────────────────
  {
    name: "sandbox_search",
    description:
      "BM25-ranked full-text search across all sandboxed content. Pass multiple queries as an array to batch all questions in one call. Use after sandbox_ingest or sandbox_execute to retrieve relevant snippets without pulling raw data into context.",
    inputSchema: {
      type: "object",
      properties: {
        queries: {
          type: "array",
          items: { type: "string" },
          description: "Array of search queries. Batch ALL questions in one call for efficiency.",
        },
        source: {
          type: "string",
          description: "Filter to a specific source label (partial match). Optional.",
        },
        limit: {
          type: "number",
          description: "Results per query (default: 5)",
        },
      },
      required: ["queries"],
    },
    handler: async (args) => {
      const queries = Array.isArray(args.queries) ? args.queries.map(String) : [];
      if (queries.length === 0) return { error: "queries array is required" };
      const source = args.source ? String(args.source) : undefined;
      const limit = typeof args.limit === "number" ? args.limit : 5;

      const results: Record<string, SearchResult[]> = {};
      let totalResultBytes = 0;

      for (const q of queries) {
        const hits = searchSandbox(q, source, limit);
        results[q] = hits;
        totalResultBytes += JSON.stringify(hits).length;
      }

      trackCall("sandbox_search", 0, totalResultBytes);

      return {
        queryCount: queries.length,
        results,
        _hint: `Searched ${queries.length} queries across sandbox. Results are BM25-ranked snippets — not full documents.`,
      };
    },
  },

  // ── Tool 3: sandbox_execute ─────────────────────────────────────────
  {
    name: "sandbox_execute",
    description:
      "Run a shell command, automatically index the output into the sandbox, and return only a summary. The raw stdout/stderr stays in SQLite — only line counts and a preview enter context. Use instead of raw shell execution for commands that produce large output (build logs, test results, file listings, git logs).",
    inputSchema: {
      type: "object",
      properties: {
        command: {
          type: "string",
          description: "Shell command to execute (runs in bash)",
        },
        label: {
          type: "string",
          description: "Label for the indexed output (default: derived from command)",
        },
        timeout: {
          type: "number",
          description: "Timeout in milliseconds (default: 30000, max: 120000)",
        },
        queries: {
          type: "array",
          items: { type: "string" },
          description: "Optional: search queries to run against the output immediately. Saves a follow-up sandbox_search call.",
        },
      },
      required: ["command"],
    },
    handler: async (args) => {
      const command = String(args.command ?? "");
      if (!command) return { error: "command is required" };

      const label = String(args.label || command.slice(0, 60));
      const timeout = Math.min(typeof args.timeout === "number" ? args.timeout : 30000, 120000);

      const { stdout, stderr, exitCode } = executeCommand(command, timeout);
      const fullOutput = [stdout, stderr].filter(Boolean).join("\n--- stderr ---\n");
      const totalBytes = Buffer.byteLength(fullOutput);

      // Index into sandbox
      const { sourceId, chunkCount } = indexContent(label, fullOutput);

      // Build summary
      const lines = fullOutput.split("\n");
      const preview = lines.slice(0, 5).join("\n");
      const tail = lines.length > 10 ? lines.slice(-3).join("\n") : "";

      // Optional immediate search
      let searchResults: Record<string, SearchResult[]> | undefined;
      const queries = Array.isArray(args.queries) ? args.queries.map(String) : [];
      if (queries.length > 0) {
        searchResults = {};
        for (const q of queries) {
          searchResults[q] = searchSandbox(q, label, 5);
        }
      }

      const returnedBytes = 300; // approx
      trackCall("sandbox_execute", totalBytes, returnedBytes);

      return {
        exitCode,
        lineCount: lines.length,
        bytesProduced: totalBytes,
        bytesInContext: returnedBytes,
        savingsRatio: totalBytes > 0 ? `${(totalBytes / Math.max(returnedBytes, 1)).toFixed(0)}x` : "N/A",
        sourceId,
        chunks: chunkCount,
        label,
        preview: preview.slice(0, 500),
        ...(tail ? { tail: tail.slice(0, 300) } : {}),
        ...(searchResults ? { searchResults } : {}),
        _hint: `Command produced ${lines.length} lines (${(totalBytes / 1024).toFixed(1)}KB). ${totalBytes > 1024 ? `Saved ~${(totalBytes / 1024).toFixed(0)}KB from context.` : ""} Use sandbox_search(queries: [...], source: "${label}") for details.`,
      };
    },
  },

  // ── Tool 4: sandbox_batch ───────────────────────────────────────────
  {
    name: "sandbox_batch",
    description:
      "Execute multiple commands, index all outputs, and run multiple search queries — all in ONE call. This is the highest-efficiency tool: one sandbox_batch replaces N sandbox_execute calls + M sandbox_search calls. Use for research phases, multi-file analysis, or any task requiring multiple data sources.",
    inputSchema: {
      type: "object",
      properties: {
        commands: {
          type: "array",
          items: {
            type: "object",
            properties: {
              label: { type: "string", description: "Section header for this command's output" },
              command: { type: "string", description: "Shell command to execute" },
            },
            required: ["label", "command"],
          },
          description: "Commands to execute. Each runs sequentially, output is indexed with the label.",
        },
        queries: {
          type: "array",
          items: { type: "string" },
          description: "Search queries to run after all commands complete. Results come from ALL indexed content.",
        },
        timeout: {
          type: "number",
          description: "Per-command timeout in ms (default: 30000)",
        },
      },
      required: ["commands", "queries"],
    },
    handler: async (args) => {
      const commands = Array.isArray(args.commands) ? args.commands : [];
      const queries = Array.isArray(args.queries) ? args.queries.map(String) : [];
      if (commands.length === 0) return { error: "commands array is required" };
      if (queries.length === 0) return { error: "queries array is required" };

      const timeout = Math.min(typeof args.timeout === "number" ? args.timeout : 30000, 120000);
      let totalBytesIndexed = 0;
      const commandSummaries: Array<{ label: string; exitCode: number; lines: number; bytes: number }> = [];

      // Execute and index all commands
      for (const cmd of commands) {
        const label = String(cmd.label ?? "");
        const command = String(cmd.command ?? "");
        if (!command) continue;

        const { stdout, stderr, exitCode } = executeCommand(command, timeout);
        const fullOutput = [stdout, stderr].filter(Boolean).join("\n--- stderr ---\n");
        const bytes = Buffer.byteLength(fullOutput);
        totalBytesIndexed += bytes;

        indexContent(label || command.slice(0, 60), fullOutput);
        commandSummaries.push({
          label: label || command.slice(0, 40),
          exitCode,
          lines: fullOutput.split("\n").length,
          bytes,
        });
      }

      // Search across all indexed content
      const searchResults: Record<string, SearchResult[]> = {};
      for (const q of queries) {
        searchResults[q] = searchSandbox(q, undefined, 5);
      }

      const returnedBytes = JSON.stringify({ commandSummaries, searchResults }).length;
      trackCall("sandbox_batch", totalBytesIndexed, Math.min(returnedBytes, 2000));

      return {
        commandsExecuted: commandSummaries.length,
        commandSummaries,
        totalBytesIndexed,
        bytesInContext: Math.min(returnedBytes, 2000),
        savingsRatio: totalBytesIndexed > 0
          ? `${(totalBytesIndexed / Math.max(returnedBytes, 1)).toFixed(0)}x`
          : "N/A",
        queryCount: queries.length,
        searchResults,
        _hint: `Batch complete: ${commandSummaries.length} commands indexed (${(totalBytesIndexed / 1024).toFixed(1)}KB total), ${queries.length} queries searched. Use sandbox_search for follow-up queries.`,
      };
    },
  },

  // ── Tool 5: sandbox_stats ───────────────────────────────────────────
  {
    name: "sandbox_stats",
    description:
      "Show context savings for the current session — per-tool breakdown, total bytes indexed vs returned, savings ratio, and estimated token savings. Use to quantify how much context window space the sandbox has preserved.",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async () => {
      ensureSandboxTables();
      const db = getDb();

      // Get total indexed content stats
      let totalChunks = 0;
      let totalStoredBytes = 0;
      let sourceCount = 0;
      try {
        const stats = db.prepare(
          "SELECT COUNT(*) as chunks, COALESCE(SUM(byte_size), 0) as bytes, COUNT(DISTINCT source_id) as sources FROM sandbox_chunks"
        ).get() as any;
        totalChunks = stats.chunks;
        totalStoredBytes = stats.bytes;
        sourceCount = stats.sources;
      } catch { /* table may not exist */ }

      const sessionDurationMs = Date.now() - sessionStats.startedAt;
      const totalIndexed = sessionStats.bytesIndexed;
      const totalReturned = sessionStats.bytesReturned;
      const savingsRatio = totalReturned > 0
        ? (totalIndexed / totalReturned).toFixed(1)
        : "N/A";
      const estimatedTokensSaved = Math.round((totalIndexed - totalReturned) / 4); // ~4 bytes per token

      const perTool = Object.entries(sessionStats.calls).map(([tool, calls]) => ({
        tool,
        calls,
      }));

      return {
        session: {
          durationMs: sessionDurationMs,
          durationFormatted: `${(sessionDurationMs / 60000).toFixed(1)} min`,
        },
        savings: {
          totalBytesIndexed: totalIndexed,
          totalBytesReturned: totalReturned,
          bytesKeptInSandbox: totalIndexed - totalReturned,
          savingsRatio: `${savingsRatio}x`,
          contextReduction: totalIndexed > 0
            ? `${(((totalIndexed - totalReturned) / totalIndexed) * 100).toFixed(0)}%`
            : "0%",
          estimatedTokensSaved,
        },
        storage: {
          totalChunks,
          totalStoredBytes,
          sourceCount,
        },
        perTool,
        _hint: totalIndexed > 1024
          ? `Sandbox saved ~${(totalIndexed / 1024).toFixed(0)}KB from context (${savingsRatio}x compression). ~${estimatedTokensSaved.toLocaleString()} tokens preserved.`
          : "No significant data sandboxed yet. Use sandbox_execute or sandbox_ingest to start saving context.",
      };
    },
  },
];
