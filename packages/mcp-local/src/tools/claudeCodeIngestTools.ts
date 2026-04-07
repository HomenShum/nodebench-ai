/**
 * claudeCodeIngestTools — Read Claude Code JSONL transcripts and ingest into NodeBench.
 *
 * 3 tools:
 * - ingest_claude_code_sessions — Scan ~/.claude/projects/, parse JSONL, return session summaries
 * - ingest_codebase_changes — Fingerprint key files in a directory, detect changes
 * - get_ingest_status — Report connected sources and sync state
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import * as readline from "node:readline";
import type { McpTool } from "../types.js";

// ─── Constants ───────────────────────────────────────────────────

const CLAUDE_DIR = path.join(os.homedir(), ".claude");
const PROJECTS_DIR = path.join(CLAUDE_DIR, "projects");
const MAX_SESSIONS = 50;
const MAX_LINES_PER_SESSION = 500;

// ─── JSONL types ─────────────────────────────────────────────────

interface JsonlRecord {
  type: "user" | "assistant" | "queue-operation";
  message?: {
    role: string;
    content: string | Array<{ type: string; text?: string }>;
    model?: string;
  };
  sessionId?: string;
  cwd?: string;
  gitBranch?: string;
  version?: string;
  timestamp?: string;
  uuid?: string;
  parentUuid?: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
}

interface SessionSummary {
  sessionId: string;
  projectHash: string;
  turnCount: number;
  tokensIn: number;
  tokensOut: number;
  firstTimestamp: string | null;
  lastTimestamp: string | null;
  cwd: string | null;
  gitBranch: string | null;
  fileSizeBytes: number;
}

// ─── Helpers ─────────────────────────────────────────────────────

function claudeDirExists(): boolean {
  try {
    return fs.existsSync(PROJECTS_DIR);
  } catch {
    return false;
  }
}

async function parseJsonlFile(filePath: string, maxLines: number): Promise<JsonlRecord[]> {
  const records: JsonlRecord[] = [];
  const stream = fs.createReadStream(filePath, { encoding: "utf-8" });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  let count = 0;

  for await (const line of rl) {
    if (count >= maxLines) break;
    if (!line.trim()) continue;
    try {
      const parsed = JSON.parse(line) as JsonlRecord;
      if (parsed.type === "user" || parsed.type === "assistant") {
        records.push(parsed);
      }
      count++;
    } catch {
      // Skip malformed lines
    }
  }
  rl.close();
  stream.destroy();
  return records;
}

function summarizeSession(records: JsonlRecord[], sessionId: string, projectHash: string, fileSize: number): SessionSummary {
  let tokensIn = 0;
  let tokensOut = 0;
  let turnCount = 0;
  let firstTs: string | null = null;
  let lastTs: string | null = null;
  let cwd: string | null = null;
  let gitBranch: string | null = null;

  for (const r of records) {
    if (r.timestamp) {
      if (!firstTs || r.timestamp < firstTs) firstTs = r.timestamp;
      if (!lastTs || r.timestamp > lastTs) lastTs = r.timestamp;
    }
    if (r.cwd && !cwd) cwd = r.cwd;
    if (r.gitBranch && !gitBranch) gitBranch = r.gitBranch;
    if (r.type === "user") turnCount++;
    if (r.usage) {
      tokensIn += (r.usage.input_tokens ?? 0) + (r.usage.cache_read_input_tokens ?? 0);
      tokensOut += r.usage.output_tokens ?? 0;
    }
  }

  return { sessionId, projectHash, turnCount, tokensIn, tokensOut, firstTimestamp: firstTs, lastTimestamp: lastTs, cwd, gitBranch, fileSizeBytes: fileSize };
}

// ─── Key files for codebase fingerprinting ───────────────────────

const KEY_FILES = [
  "package.json",
  "pyproject.toml",
  "README.md",
  "CHANGELOG.md",
  "CLAUDE.md",
  ".env.example",
  "convex/schema.ts",
  "tsconfig.json",
  "Cargo.toml",
  "go.mod",
];

interface FileFingerprint {
  path: string;
  exists: boolean;
  sizeBytes: number;
  modifiedAt: string;
  hash: string; // simple size+mtime fingerprint
}

function fingerprintDir(dirPath: string): FileFingerprint[] {
  const results: FileFingerprint[] = [];
  for (const keyFile of KEY_FILES) {
    const fullPath = path.join(dirPath, keyFile);
    try {
      const stat = fs.statSync(fullPath);
      results.push({
        path: keyFile,
        exists: true,
        sizeBytes: stat.size,
        modifiedAt: stat.mtime.toISOString(),
        hash: `${stat.size}:${stat.mtimeMs}`,
      });
    } catch {
      results.push({ path: keyFile, exists: false, sizeBytes: 0, modifiedAt: "", hash: "" });
    }
  }
  return results;
}

// ─── Tools ───────────────────────────────────────────────────────

export function createClaudeCodeIngestTools(): McpTool[] {
  return [
    // Tool 1: Scan and summarize Claude Code sessions
    {
      name: "ingest_claude_code_sessions",
      description:
        "Scan Claude Code JSONL transcripts from ~/.claude/projects/. Returns session summaries with turn counts, token usage, timestamps, and working directories. Use to understand what the founder has been working on across Claude Code sessions.",
      inputSchema: {
        type: "object" as const,
        properties: {
          path: {
            type: "string",
            description: "Override path to Claude projects dir (default: ~/.claude/projects/)",
          },
          limit: {
            type: "number",
            description: "Max sessions to scan (default: 20)",
          },
          since: {
            type: "string",
            description: "ISO timestamp — only include sessions modified after this date",
          },
          projectFilter: {
            type: "string",
            description: "Filter to sessions from projects whose hash contains this string",
          },
        },
        required: [],
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
      handler: async (args: {
        path?: string;
        limit?: number;
        since?: string;
        projectFilter?: string;
      }) => {
        const projectsDir = args.path ?? PROJECTS_DIR;
        const limit = Math.min(args.limit ?? 20, MAX_SESSIONS);
        const sinceMs = args.since ? new Date(args.since).getTime() : 0;

        if (!fs.existsSync(projectsDir)) {
          return {
            success: false,
            error: `Claude Code projects directory not found at ${projectsDir}`,
            hint: "Install Claude Code and run at least one session to create transcripts.",
          };
        }

        const projectDirs = fs.readdirSync(projectsDir).filter((d) => {
          const fullPath = path.join(projectsDir, d);
          try {
            return fs.statSync(fullPath).isDirectory();
          } catch {
            return false;
          }
        });

        const filteredProjects = args.projectFilter
          ? projectDirs.filter((d) => d.toLowerCase().includes(args.projectFilter!.toLowerCase()))
          : projectDirs;

        const sessions: SessionSummary[] = [];

        for (const projectHash of filteredProjects) {
          if (sessions.length >= limit) break;
          const projDir = path.join(projectsDir, projectHash);

          let jsonlFiles: string[];
          try {
            jsonlFiles = fs.readdirSync(projDir).filter((f) => f.endsWith(".jsonl"));
          } catch {
            continue;
          }

          for (const file of jsonlFiles) {
            if (sessions.length >= limit) break;
            const filePath = path.join(projDir, file);

            try {
              const stat = fs.statSync(filePath);
              if (sinceMs && stat.mtimeMs < sinceMs) continue;

              const records = await parseJsonlFile(filePath, MAX_LINES_PER_SESSION);
              const sessionId = file.replace(".jsonl", "");
              const summary = summarizeSession(records, sessionId, projectHash, stat.size);

              if (summary.turnCount > 0) {
                sessions.push(summary);
              }
            } catch {
              // Skip unreadable files
            }
          }
        }

        // Sort by most recent first
        sessions.sort((a, b) => {
          const ta = a.lastTimestamp ?? "";
          const tb = b.lastTimestamp ?? "";
          return tb.localeCompare(ta);
        });

        const totalTokensIn = sessions.reduce((s, x) => s + x.tokensIn, 0);
        const totalTokensOut = sessions.reduce((s, x) => s + x.tokensOut, 0);
        const totalTurns = sessions.reduce((s, x) => s + x.turnCount, 0);

        return {
          success: true,
          projectsScanned: filteredProjects.length,
          sessionsFound: sessions.length,
          totalTurns,
          totalTokens: { input: totalTokensIn, output: totalTokensOut },
          sessions,
        };
      },
    },

    // Tool 2: Fingerprint a codebase directory
    {
      name: "ingest_codebase_changes",
      description:
        "Fingerprint key files in a directory (package.json, README, schema, CLAUDE.md, etc.) and detect what changed since last check. Use to track codebase evolution as founder context.",
      inputSchema: {
        type: "object" as const,
        properties: {
          path: {
            type: "string",
            description: "Directory to fingerprint (e.g., '.' for current project)",
          },
        },
        required: ["path"],
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
      handler: async (args: { path: string }) => {
        const dirPath = path.resolve(args.path);

        if (!fs.existsSync(dirPath)) {
          return {
            success: false,
            error: `Directory not found: ${dirPath}`,
          };
        }

        const fingerprints = fingerprintDir(dirPath);
        const existing = fingerprints.filter((f) => f.exists);
        const missing = fingerprints.filter((f) => !f.exists);

        // Try to read git log for recent commits
        let recentCommits: string[] = [];
        try {
          const { execSync } = await import("node:child_process");
          const gitLog = execSync("git log --oneline -10", {
            cwd: dirPath,
            encoding: "utf-8",
            timeout: 5000,
          });
          recentCommits = gitLog.trim().split("\n").filter(Boolean);
        } catch {
          // Not a git repo or git not available
        }

        return {
          success: true,
          directory: dirPath,
          keyFilesFound: existing.length,
          keyFilesMissing: missing.length,
          fingerprints: existing,
          missingFiles: missing.map((f) => f.path),
          recentCommits,
        };
      },
    },

    // Tool 3: Get overall ingest status
    {
      name: "get_ingest_status",
      description:
        "Report which data sources are available for ingestion. Checks if Claude Code transcripts exist, what project directories are accessible, and overall sync readiness.",
      inputSchema: {
        type: "object" as const,
        properties: {},
        required: [],
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
      handler: async () => {
        // Claude Code status
        const claudeExists = claudeDirExists();
        let sessionCount = 0;
        let projectCount = 0;
        let latestSession: string | null = null;

        if (claudeExists) {
          try {
            const projects = fs.readdirSync(PROJECTS_DIR).filter((d) => {
              try { return fs.statSync(path.join(PROJECTS_DIR, d)).isDirectory(); } catch { return false; }
            });
            projectCount = projects.length;

            for (const proj of projects) {
              const projDir = path.join(PROJECTS_DIR, proj);
              try {
                const jsonlFiles = fs.readdirSync(projDir).filter((f) => f.endsWith(".jsonl"));
                sessionCount += jsonlFiles.length;

                for (const f of jsonlFiles) {
                  try {
                    const stat = fs.statSync(path.join(projDir, f));
                    const mtime = stat.mtime.toISOString();
                    if (!latestSession || mtime > latestSession) latestSession = mtime;
                  } catch { /* skip */ }
                }
              } catch { /* skip */ }
            }
          } catch { /* skip */ }
        }

        // Current working directory status
        const cwd = process.cwd();
        const cwdFingerprints = fingerprintDir(cwd);
        const cwdKeyFiles = cwdFingerprints.filter((f) => f.exists).length;

        return {
          success: true,
          sources: {
            claude_code: {
              available: claudeExists,
              path: PROJECTS_DIR,
              projectCount,
              sessionCount,
              latestSession,
              status: claudeExists ? (sessionCount > 0 ? "ready" : "empty") : "not_found",
            },
            codebase: {
              available: cwdKeyFiles > 0,
              path: cwd,
              keyFilesFound: cwdKeyFiles,
              status: cwdKeyFiles > 0 ? "ready" : "no_key_files",
            },
          },
          recommendation: !claudeExists
            ? "Install Claude Code and run a session to enable transcript ingestion."
            : sessionCount === 0
              ? "No Claude Code sessions found. Start a session to create transcripts."
              : `${sessionCount} sessions across ${projectCount} projects ready for ingestion.`,
        };
      },
    },
  ];
}
