/**
 * Overstory QA Orchestration tools — read Overstory state for dogfood/QA monitoring.
 *
 * Provides MCP tools to query the Overstory multi-agent orchestration state:
 * - Fleet status (active agents, health)
 * - QA gate summary (per-route stability grades, issue counts)
 * - Mail log (recent QA messages)
 * - Merge queue (pending merges + gate results)
 *
 * Reads from .overstory/overstory.db (SQLite) and .overstory/agent-manifest.json.
 * All tools are read-only — they never modify Overstory state.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { McpTool } from "../types.js";
import { openOptionalSqliteDatabase } from "../db.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function findOverstoryRoot(): string | null {
  // Walk up from cwd looking for .overstory/
  let dir = process.cwd();
  for (let i = 0; i < 10; i++) {
    const candidate = join(dir, ".overstory");
    if (existsSync(candidate)) return candidate;
    const parent = join(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function readOverstoryDb(overstoryDir: string): any {
  const dbPath = join(overstoryDir, "overstory.db");
  if (!existsSync(dbPath)) return null;
  return openOptionalSqliteDatabase(dbPath, { readonly: true });
}

function readManifest(overstoryDir: string): any {
  const manifestPath = join(overstoryDir, "agent-manifest.json");
  if (!existsSync(manifestPath)) return null;
  try {
    return JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch {
    return null;
  }
}

// ─── Tools ────────────────────────────────────────────────────────────────────

const overstoryFleetStatus: McpTool = {
  name: "overstory_fleet_status",
  description:
    "Read the Overstory multi-agent fleet status — active agents, capabilities, health, worktree state. " +
    "Returns agent manifest configuration and live agent states from .overstory/overstory.db. " +
    "Use this to monitor QA agent progress during a dogfood session.",
  inputSchema: {
    type: "object" as const,
    properties: {
      include_config: {
        type: "boolean",
        description: "Include agent manifest configuration (capabilities, models, constraints). Default true.",
      },
    },
  },
  handler: async (params: { include_config?: boolean }) => {
    const includeConfig = params.include_config !== false;
    const overstoryDir = findOverstoryRoot();

    if (!overstoryDir) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              status: "not_initialized",
              message:
                "No .overstory/ directory found. Run 'overstory init' to initialize.",
              setupCommand:
                "bash scripts/overstory/run-in-wsl.sh init",
            }),
          },
        ],
      };
    }

    const result: Record<string, any> = { status: "initialized" };

    // Read manifest for agent definitions
    if (includeConfig) {
      const manifest = readManifest(overstoryDir);
      if (manifest) {
        result.agents = manifest.agents;
        result.gatePolicy = manifest.gatePolicy;
        result.mailProtocol = manifest.mailProtocol;
      }
    }

    // Read live agent states from DB
    const db = readOverstoryDb(overstoryDir);
    if (db) {
      try {
        // Overstory stores agent sessions in the agents table
        const agents = db
          .prepare(
            "SELECT name, capability, status, worktree_path, created_at, updated_at FROM agents ORDER BY updated_at DESC"
          )
          .all();
        result.activeAgents = agents;
        result.agentCount = agents.length;

        // Health summary
        const statusCounts: Record<string, number> = {};
        for (const a of agents as any[]) {
          statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
        }
        result.statusSummary = statusCounts;
      } catch {
        result.dbNote =
          "overstory.db exists but agents table not found (may need overstory init)";
      }
      db.close();
    } else {
      result.dbNote = "No overstory.db found — coordinator not yet started";
    }

    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  },
};

const overstoryQaSummary: McpTool = {
  name: "overstory_qa_summary",
  description:
    "Aggregate QA gate results across all routes — per-route stability grades, " +
    "issue counts by severity (p0-p3), gate pass/fail status, and freshness check. " +
    "Combines data from visual_qa_runs (SSIM) and Overstory mail (Gemini QA triage).",
  inputSchema: {
    type: "object" as const,
    properties: {
      hours: {
        type: "number",
        description: "Only include data from the last N hours. Default 4.",
      },
    },
  },
  handler: async (params: { hours?: number }) => {
    const hours = params.hours || 4;
    const overstoryDir = findOverstoryRoot();
    const result: Record<string, any> = { windowHours: hours };

    // Read SSIM stability data from nodebench.db
    const nodebenchDbPath = join(
      process.env.HOME || process.env.USERPROFILE || "",
      ".nodebench",
      "nodebench.db"
    );

    if (existsSync(nodebenchDbPath)) {
      const db = openOptionalSqliteDatabase(nodebenchDbPath, { readonly: true });
      if (db) {
        try {
          const routes = db
            .prepare(
              `SELECT url, stability_grade, stability_score, mean_ssim, jank_count, effective_fps, created_at
               FROM visual_qa_runs
               WHERE created_at > datetime('now', '-${hours} hours')
               ORDER BY created_at DESC`
            )
            .all();

          result.stabilityRoutes = routes;
          result.routeCount = routes.length;

          // Grade distribution
          const grades: Record<string, number> = {};
          for (const r of routes as any[]) {
            grades[r.stability_grade] = (grades[r.stability_grade] || 0) + 1;
          }
          result.gradeDistribution = grades;

          // Failing routes (grade < B)
          const failing = (routes as any[]).filter(
            (r) => !["A", "B"].includes(r.stability_grade)
          );
          result.failingRoutes = failing;
          result.failingCount = failing.length;
        } catch {
          result.stabilityNote = "Could not read visual_qa_runs table";
        } finally {
          db.close();
        }
      } else {
        result.stabilityNote = "Could not read visual_qa_runs table";
      }
    } else {
      result.stabilityNote = "No nodebench.db found";
    }

    // Read latest QA triage from Overstory mail
    if (overstoryDir) {
      const db = readOverstoryDb(overstoryDir);
      if (db) {
        try {
          const triage = db
            .prepare(
              "SELECT body, created_at FROM mail WHERE subject = 'qa-triage-complete' ORDER BY created_at DESC LIMIT 1"
            )
            .get() as { body: string; created_at: string } | undefined;
          if (triage) {
            const body = JSON.parse(triage.body);
            result.latestTriage = {
              createdAt: triage.created_at,
              summary: body.summary,
              gateResult: body.gateResult,
              issueCount: body.issues?.length || 0,
              p0Count: body.gateResult?.p0Count || 0,
              p1Count: body.gateResult?.p1Count || 0,
              p2Count: body.gateResult?.p2Count || 0,
              p3Count: body.gateResult?.p3Count || 0,
            };
          }
        } catch {
          result.triageNote = "Could not read triage mail";
        }
        db.close();
      }
    }

    // Gate verdict
    const p0 = result.latestTriage?.p0Count || 0;
    const p1 = result.latestTriage?.p1Count || 0;
    const failCount = result.failingCount || 0;
    result.gateVerdict = {
      passed: p0 === 0 && p1 === 0 && failCount === 0,
      blockers: [
        ...(p0 > 0 ? [`${p0} p0 issues`] : []),
        ...(p1 > 0 ? [`${p1} p1 issues`] : []),
        ...(failCount > 0 ? [`${failCount} routes below grade B`] : []),
      ],
    };

    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  },
};

const overstoryMailLog: McpTool = {
  name: "overstory_mail_log",
  description:
    "Read recent Overstory QA mail messages — capture-complete, stability results, " +
    "triage reports, fix assignments, worker-done notices, and escalations. " +
    "Useful for understanding the current state of a QA session.",
  inputSchema: {
    type: "object" as const,
    properties: {
      limit: {
        type: "number",
        description: "Maximum number of messages to return. Default 20.",
      },
      type_filter: {
        type: "string",
        description:
          "Filter by message type: result, dispatch, worker_done, escalation, error, status. Empty = all.",
      },
      agent_filter: {
        type: "string",
        description: "Filter by sender or recipient agent name. Empty = all.",
      },
    },
  },
  handler: async (params: {
    limit?: number;
    type_filter?: string;
    agent_filter?: string;
  }) => {
    const limit = params.limit || 20;
    const overstoryDir = findOverstoryRoot();

    if (!overstoryDir) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              messages: [],
              note: "No .overstory/ directory found",
            }),
          },
        ],
      };
    }

    const db = readOverstoryDb(overstoryDir);
    if (!db) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              messages: [],
              note: "No overstory.db found — coordinator not yet started",
            }),
          },
        ],
      };
    }

    try {
      let query =
        "SELECT id, sender, recipient, type, subject, priority, body, created_at FROM mail";
      const conditions: string[] = [];
      const queryParams: any[] = [];

      if (params.type_filter) {
        conditions.push("type = ?");
        queryParams.push(params.type_filter);
      }
      if (params.agent_filter) {
        conditions.push("(sender = ? OR recipient = ?)");
        queryParams.push(params.agent_filter, params.agent_filter);
      }

      if (conditions.length > 0) {
        query += " WHERE " + conditions.join(" AND ");
      }
      query += " ORDER BY created_at DESC LIMIT ?";
      queryParams.push(limit);

      const messages = db.prepare(query).all(...queryParams);
      db.close();

      // Parse body JSON for each message
      const parsed = (messages as any[]).map((m) => {
        let body: any;
        try {
          body = JSON.parse(m.body);
        } catch {
          body = m.body;
        }
        return { ...m, body };
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              { messages: parsed, count: parsed.length },
              null,
              2
            ),
          },
        ],
      };
    } catch (e: any) {
      db.close();
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              messages: [],
              error: e.message || "Failed to query mail table",
            }),
          },
        ],
      };
    }
  },
};

const overstoryMergeQueue: McpTool = {
  name: "overstory_merge_queue",
  description:
    "Read the Overstory merge queue — pending merges, completed merges, " +
    "conflict resolution status, and QA gate results per branch. " +
    "Shows which builder branches are ready to merge and which are blocked.",
  inputSchema: {
    type: "object" as const,
    properties: {
      include_completed: {
        type: "boolean",
        description: "Include already-merged branches. Default false.",
      },
    },
  },
  handler: async (params: { include_completed?: boolean }) => {
    const includeCompleted = params.include_completed === true;
    const overstoryDir = findOverstoryRoot();

    if (!overstoryDir) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              queue: [],
              note: "No .overstory/ directory found",
            }),
          },
        ],
      };
    }

    const db = readOverstoryDb(overstoryDir);
    if (!db) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              queue: [],
              note: "No overstory.db found",
            }),
          },
        ],
      };
    }

    try {
      let query =
        "SELECT id, branch, agent_name, status, conflict_tier, qa_gate_passed, created_at, merged_at FROM merge_queue";
      if (!includeCompleted) {
        query += " WHERE status != 'merged'";
      }
      query += " ORDER BY created_at ASC";

      const queue = db.prepare(query).all();
      db.close();

      // Summarize
      const pending = (queue as any[]).filter((q) => q.status === "pending");
      const blocked = (queue as any[]).filter((q) => q.status === "blocked");
      const merged = (queue as any[]).filter((q) => q.status === "merged");

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                queue,
                summary: {
                  pendingCount: pending.length,
                  blockedCount: blocked.length,
                  mergedCount: merged.length,
                  totalCount: queue.length,
                },
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (e: any) {
      db.close();
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              queue: [],
              error: e.message || "Failed to query merge_queue table",
            }),
          },
        ],
      };
    }
  },
};

// ─── Export ────────────────────────────────────────────────────────────────────

export const overstoryTools: McpTool[] = [
  overstoryFleetStatus,
  overstoryQaSummary,
  overstoryMailLog,
  overstoryMergeQueue,
];
