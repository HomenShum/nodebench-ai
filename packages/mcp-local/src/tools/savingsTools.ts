/**
 * Savings Tools — Token/time/cost savings comparison
 *
 * Reads analytics DB to compute ROI metrics:
 * - Total tokens used vs saved (TOON compression)
 * - Time saved vs manual workflow
 * - Cost estimates
 * - Before/after delta between sessions
 */

import type { McpTool } from "../types.js";
import { openOptionalSqliteDatabase } from "../db.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getAnalyticsDbSafe(): Promise<any | null> {
  try {
    const os = await import("node:os");
    const path = await import("node:path");
    const fs = await import("node:fs");
    const dbPath = path.join(os.homedir(), ".nodebench", "analytics.db");
    if (!fs.existsSync(dbPath)) return null;
    return openOptionalSqliteDatabase(dbPath, { readonly: true });
  } catch {
    return null;
  }
}

// ─── Tools ────────────────────────────────────────────────────────────────────

export const savingsTools: McpTool[] = [
  {
    name: "compare_savings",
    description:
      "Compare token usage, time savings, and cost estimates. Optionally compare two sessions for before/after ROI. Shows total tool calls, tokens, estimated time saved, and cost.",
    inputSchema: {
      type: "object",
      properties: {
        session_id: {
          type: "string",
          description: "Specific session to analyze (omit for all-time stats)",
        },
        compare_session_id: {
          type: "string",
          description: "Second session ID for before/after comparison",
        },
        days: {
          type: "number",
          description: "Limit to last N days (default: 30)",
        },
      },
    },
    annotations: { readOnlyHint: true },
    handler: async (args: { session_id?: string; compare_session_id?: string; days?: number }) => {
      const db = await getAnalyticsDbSafe();
      if (!db) {
        return {
          error: "No analytics data found. Use NodeBench MCP tools first to generate usage data.",
          suggestion: "Run some tools, then call compare_savings() to see your ROI.",
        };
      }

      try {
        const days = args.days ?? 30;
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

        // Check if tool_call_log table exists
        const tableCheck = db.prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='tool_call_log'"
        ).get();

        if (!tableCheck) {
          db.close();
          return {
            error: "Analytics table not initialized yet. Run some tools first.",
          };
        }

        // Get column info to handle schema variations
        const columns = db.prepare("PRAGMA table_info(tool_call_log)").all();
        const columnNames = new Set(columns.map((c: any) => c.name));

        const hasTokens = columnNames.has("tokens_used");
        const hasDuration = columnNames.has("duration_ms");
        const hasSession = columnNames.has("session_id");
        const hasTimestamp = columnNames.has("timestamp") || columnNames.has("called_at");
        const timestampCol = columnNames.has("timestamp") ? "timestamp" : "called_at";

        // Build query based on available columns
        function getStats(sessionFilter?: string) {
          let where = hasTimestamp ? `WHERE ${timestampCol} > ?` : "WHERE 1=1";
          const params: any[] = hasTimestamp ? [cutoff] : [];

          if (sessionFilter && hasSession) {
            where += " AND session_id = ?";
            params.push(sessionFilter);
          }

          const totalCalls = db.prepare(`SELECT COUNT(*) as cnt FROM tool_call_log ${where}`).get(...params) as any;

          let avgDuration = 0;
          if (hasDuration) {
            const durResult = db.prepare(`SELECT AVG(duration_ms) as avg_dur FROM tool_call_log ${where}`).get(...params) as any;
            avgDuration = durResult?.avg_dur ?? 0;
          }

          let totalTokens = 0;
          if (hasTokens) {
            const tokResult = db.prepare(`SELECT SUM(tokens_used) as total FROM tool_call_log ${where}`).get(...params) as any;
            totalTokens = tokResult?.total ?? 0;
          }

          // Top tools
          const topTools = db.prepare(
            `SELECT tool_name, COUNT(*) as calls${hasDuration ? ", AVG(duration_ms) as avg_ms" : ""} FROM tool_call_log ${where} GROUP BY tool_name ORDER BY calls DESC LIMIT 10`
          ).all(...params);

          // Error rate
          const hasSuccess = columnNames.has("success");
          let errorRate = 0;
          if (hasSuccess) {
            const errResult = db.prepare(
              `SELECT COUNT(*) as errs FROM tool_call_log ${where} AND success = 0`
            ).get(...params) as any;
            errorRate = totalCalls.cnt > 0 ? (errResult.errs / totalCalls.cnt) * 100 : 0;
          }

          return {
            totalCalls: totalCalls.cnt,
            avgDurationMs: Math.round(avgDuration),
            totalTokens,
            topTools,
            errorRate: Math.round(errorRate * 10) / 10,
          };
        }

        const stats = getStats(args.session_id);

        // Cost estimates (rough: $0.003 per 1K tokens for Claude Haiku, $0.015 for Sonnet)
        const estimatedCost = (stats.totalTokens / 1000) * 0.003;

        // Time savings estimate (assume 5 min manual per tool call)
        const manualMinutes = stats.totalCalls * 5;
        const automatedMinutes = (stats.totalCalls * stats.avgDurationMs) / 60_000;
        const timeSavedMinutes = Math.max(0, manualMinutes - automatedMinutes);

        // TOON savings estimate (~40% compression)
        const toonSavedTokens = Math.round(stats.totalTokens * 0.4);

        const result: Record<string, unknown> = {
          period: `Last ${days} days`,
          totalToolCalls: stats.totalCalls,
          avgLatencyMs: stats.avgDurationMs,
          totalTokens: stats.totalTokens,
          toonSavedTokens,
          estimatedCostUsd: Math.round(estimatedCost * 100) / 100,
          timeSavedMinutes: Math.round(timeSavedMinutes),
          timeSavedHours: Math.round(timeSavedMinutes / 60 * 10) / 10,
          errorRate: `${stats.errorRate}%`,
          topTools: stats.topTools,
        };

        // Comparison mode
        if (args.compare_session_id && hasSession) {
          const compareStats = getStats(args.compare_session_id);
          result.comparison = {
            baseSession: args.session_id || "all",
            compareSession: args.compare_session_id,
            callsDelta: stats.totalCalls - compareStats.totalCalls,
            tokensDelta: stats.totalTokens - compareStats.totalTokens,
            latencyDelta: stats.avgDurationMs - compareStats.avgDurationMs,
            errorRateDelta: stats.errorRate - compareStats.errorRate,
          };
        }

        db.close();
        return result;
      } catch (e: any) {
        db.close();
        return { error: `Analytics query failed: ${e.message}` };
      }
    },
  },
];
