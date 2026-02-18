/**
 * Local Dashboard MCP Tools
 *
 * 5 tools for operating the local Daily Brief dashboard via Claude Code.
 * All tools read from local SQLite — zero network dependency.
 */

import type { McpTool } from "../types.js";
import { getDb, genId } from "../db.js";
import { getBriefDashboardUrl, startBriefDashboardServer } from "../dashboard/briefServer.js";

function safeParseJson(s: string | null | undefined): unknown {
  if (!s) return null;
  try { return JSON.parse(s); } catch { return s; }
}

export const localDashboardTools: McpTool[] = [
  // ── sync_daily_brief ────────────────────────────────────────────────
  {
    name: "sync_daily_brief",
    description:
      "Sync daily brief + narrative data from Convex to local SQLite. Requires CONVEX_SITE_URL and MCP_SECRET environment variables. Returns sync summary with row counts and timing.",
    inputSchema: {
      type: "object",
      properties: {
        days: {
          type: "number",
          description: "Number of days to sync (default: 7)",
        },
        force: {
          type: "boolean",
          description: "Force re-sync even if data already exists (default: false)",
        },
      },
    },
    handler: async (args) => {
      const siteUrl = process.env.CONVEX_SITE_URL || process.env.VITE_CONVEX_URL;
      if (!siteUrl) {
        return {
          error: true,
          message: "Missing CONVEX_SITE_URL or VITE_CONVEX_URL environment variable",
          setupInstructions: "Set CONVEX_SITE_URL in .env.local or as an environment variable",
        };
      }

      const secret = process.env.MCP_SECRET;
      if (!secret) {
        return {
          error: true,
          message: "Missing MCP_SECRET environment variable",
          setupInstructions: "Set MCP_SECRET via: npx convex env set MCP_SECRET <value>",
        };
      }

      const db = getDb();
      const syncId = genId("sync");
      const startMs = Date.now();
      db.prepare("INSERT INTO sync_runs (id, status) VALUES (?, 'running')").run(syncId);

      const counts: Record<string, number> = {};

      try {
        // Fetch latest dashboard snapshot
        const snapRes = await fetch(`${siteUrl.replace(/\/$/, "")}/api/mcpGateway`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-mcp-secret": secret },
          body: JSON.stringify({ fn: "getLatestDashboardSnapshot", args: {} }),
        });
        const snapData = await snapRes.json();
        if (snapData.success && snapData.data) {
          const s = snapData.data;
          db.prepare(`
            INSERT OR REPLACE INTO brief_snapshots (id, date_string, generated_at, dashboard_metrics, source_summary, version)
            VALUES (?, ?, ?, ?, ?, 1)
          `).run(
            s._id ?? genId("snap"),
            s.dateString ?? new Date().toISOString().slice(0, 10),
            s.generatedAt ?? Date.now(),
            JSON.stringify(s.dashboardMetrics ?? {}),
            JSON.stringify(s.sourceSummary ?? null),
          );
          counts.brief_snapshots = 1;
        }

        // Fetch narrative threads
        const threadRes = await fetch(`${siteUrl.replace(/\/$/, "")}/api/mcpGateway`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-mcp-secret": secret },
          body: JSON.stringify({ fn: "getPublicThreads", args: { limit: 100 } }),
        });
        const threadData = await threadRes.json();
        if (threadData.success && Array.isArray(threadData.data)) {
          const upsert = db.prepare(`
            INSERT OR REPLACE INTO narrative_threads_local
            (id, thread_id, name, slug, thesis, counter_thesis, entity_keys, topic_tags,
             current_phase, first_event_at, latest_event_at, event_count, plot_twist_count, quality)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          const tx = db.transaction((items: any[]) => {
            for (const t of items) {
              upsert.run(
                t._id, t.threadId ?? t._id, t.name, t.slug ?? "",
                t.thesis, t.counterThesis ?? null,
                JSON.stringify(t.entityKeys ?? []), JSON.stringify(t.topicTags ?? []),
                t.currentPhase, t.firstEventAt ?? null, t.latestEventAt ?? null,
                t.eventCount ?? 0, t.plotTwistCount ?? 0,
                JSON.stringify(t.quality ?? null),
              );
            }
          });
          tx(threadData.data);
          counts.narrative_threads = threadData.data.length;
        }

        const durationMs = Date.now() - startMs;
        db.prepare(`
          UPDATE sync_runs SET status = 'success', completed_at = datetime('now'),
            tables_synced = ?, duration_ms = ?
          WHERE id = ?
        `).run(JSON.stringify(counts), durationMs, syncId);

        return {
          success: true,
          syncId,
          durationMs,
          counts,
          dashboardUrl: getBriefDashboardUrl(),
        };
      } catch (err: any) {
        const durationMs = Date.now() - startMs;
        db.prepare(`
          UPDATE sync_runs SET status = 'error', completed_at = datetime('now'),
            error = ?, duration_ms = ?
          WHERE id = ?
        `).run(err.message, durationMs, syncId);
        return { error: true, message: err.message, syncId, durationMs };
      }
    },
  },

  // ── get_daily_brief_summary ─────────────────────────────────────────
  {
    name: "get_daily_brief_summary",
    description:
      "Get the latest daily brief summary from local SQLite. Returns dashboard metrics, features, and source summary. No network needed — reads cached data.",
    inputSchema: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "Date string (YYYY-MM-DD). Omit for latest.",
        },
      },
    },
    handler: async (args) => {
      const db = getDb();
      const row = args.date
        ? db.prepare("SELECT * FROM brief_snapshots WHERE date_string = ? ORDER BY version DESC LIMIT 1").get(args.date) as any
        : db.prepare("SELECT * FROM brief_snapshots ORDER BY generated_at DESC LIMIT 1").get() as any;

      if (!row) {
        return {
          empty: true,
          message: args.date
            ? `No brief for ${args.date}. Run sync_daily_brief to fetch data.`
            : "No briefs synced yet. Run sync_daily_brief to fetch data.",
          tip: "Use sync_daily_brief tool or run: npm run local:sync",
        };
      }

      return {
        dateString: row.date_string,
        generatedAt: row.generated_at,
        version: row.version,
        dashboardMetrics: safeParseJson(row.dashboard_metrics),
        sourceSummary: safeParseJson(row.source_summary),
        syncedAt: row.synced_at,
        dashboardUrl: getBriefDashboardUrl(),
      };
    },
  },

  // ── get_narrative_status ────────────────────────────────────────────
  {
    name: "get_narrative_status",
    description:
      "Get narrative thread status from local SQLite. Returns threads grouped by phase (emerging, escalating, climax, resolution, dormant) with event counts. No network needed.",
    inputSchema: {
      type: "object",
      properties: {
        phase: {
          type: "string",
          enum: ["emerging", "escalating", "climax", "resolution", "dormant"],
          description: "Filter by phase (optional)",
        },
        limit: {
          type: "number",
          description: "Max threads to return (default: 20)",
        },
      },
    },
    handler: async (args) => {
      const db = getDb();
      const limit = Math.min(args.limit ?? 20, 100);

      const query = args.phase
        ? "SELECT * FROM narrative_threads_local WHERE current_phase = ? ORDER BY latest_event_at DESC LIMIT ?"
        : "SELECT * FROM narrative_threads_local ORDER BY latest_event_at DESC LIMIT ?";

      const rows = args.phase
        ? db.prepare(query).all(args.phase, limit) as any[]
        : db.prepare(query).all(limit) as any[];

      if (rows.length === 0) {
        return {
          empty: true,
          message: "No narrative threads synced. Run sync_daily_brief to fetch data.",
        };
      }

      // Group by phase
      const grouped: Record<string, any[]> = {};
      for (const r of rows) {
        const phase = r.current_phase || "dormant";
        if (!grouped[phase]) grouped[phase] = [];
        grouped[phase].push({
          id: r.id,
          name: r.name,
          thesis: r.thesis,
          eventCount: r.event_count,
          plotTwistCount: r.plot_twist_count,
          latestEventAt: r.latest_event_at,
          entityKeys: safeParseJson(r.entity_keys),
          topicTags: safeParseJson(r.topic_tags),
          quality: safeParseJson(r.quality),
        });
      }

      // Phase distribution
      const distribution: Record<string, number> = {};
      try {
        const dist = db.prepare(
          "SELECT current_phase, COUNT(*) as count FROM narrative_threads_local GROUP BY current_phase"
        ).all() as any[];
        for (const d of dist) distribution[d.current_phase] = d.count;
      } catch { /* table may not exist */ }

      return {
        totalThreads: rows.length,
        phaseDistribution: distribution,
        threads: grouped,
        dashboardUrl: getBriefDashboardUrl(),
      };
    },
  },

  // ── get_ops_dashboard ───────────────────────────────────────────────
  {
    name: "get_ops_dashboard",
    description:
      "Get operational dashboard status from local SQLite. Returns last sync info, tool call frequency, active verification cycles, and data counts. No network needed.",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async () => {
      const db = getDb();

      // Last sync
      let lastSync: any = null;
      try {
        const row = db.prepare("SELECT * FROM sync_runs ORDER BY started_at DESC LIMIT 1").get() as any;
        if (row) {
          lastSync = {
            ...row,
            tables_synced: safeParseJson(row.tables_synced),
          };
        }
      } catch { /* table may not exist */ }

      // Tool call frequency (last 24h)
      let toolStats: any[] = [];
      try {
        toolStats = db.prepare(`
          SELECT tool_name, COUNT(*) as count, AVG(duration_ms) as avg_duration,
            SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as errors
          FROM tool_call_log
          WHERE created_at > datetime('now', '-1 day')
          GROUP BY tool_name ORDER BY count DESC LIMIT 15
        `).all() as any[];
      } catch { /* table may not exist */ }

      // Active verification cycles
      let activeCycles: any[] = [];
      try {
        activeCycles = db.prepare(`
          SELECT id, title, status, created_at FROM verification_cycles
          WHERE status NOT IN ('completed', 'abandoned')
          ORDER BY created_at DESC LIMIT 5
        `).all() as any[];
      } catch { /* table may not exist */ }

      // Data counts
      let briefCount = 0, threadCount = 0, eventCount = 0;
      try {
        briefCount = (db.prepare("SELECT COUNT(*) as c FROM brief_snapshots").get() as any)?.c ?? 0;
        threadCount = (db.prepare("SELECT COUNT(*) as c FROM narrative_threads_local").get() as any)?.c ?? 0;
        eventCount = (db.prepare("SELECT COUNT(*) as c FROM narrative_events_local").get() as any)?.c ?? 0;
      } catch { /* tables may not exist */ }

      // Privacy/audience stats
      let privacyMode: any = null;
      try {
        const todayEvents = db.prepare(`
          SELECT COUNT(*) as count,
            SUM(CASE WHEN is_public = 1 THEN 1 ELSE 0 END) as public_triggers
          FROM audience_events WHERE created_at > datetime('now', '-1 day')
        `).get() as any;
        if (todayEvents && todayEvents.count > 0) {
          privacyMode = {
            triggeredToday: todayEvents.public_triggers ?? 0,
            totalEvents: todayEvents.count,
          };
        }
      } catch { /* table may not exist */ }

      return {
        lastSync,
        toolCallFrequency: toolStats,
        activeCycles,
        dataCounts: { briefs: briefCount, threads: threadCount, events: eventCount },
        privacyMode,
        dashboardUrl: getBriefDashboardUrl(),
      };
    },
  },

  // ── open_local_dashboard ────────────────────────────────────────────
  {
    name: "open_local_dashboard",
    description:
      "Start the local Daily Brief dashboard server if needed, and return the URL. The dashboard shows Brief metrics, Narrative thread lanes, and Ops status — all from local SQLite.",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async () => {
      let url = getBriefDashboardUrl();
      if (!url) {
        try {
          const port = await startBriefDashboardServer(getDb(), 6275);
          url = `http://127.0.0.1:${port}`;
        } catch (err: any) {
          return { error: true, message: `Failed to start dashboard: ${err.message}` };
        }
      }
      return {
        url,
        views: ["Brief (metrics, features, sources)", "Narrative (thread lanes by phase)", "Ops (sync status, tool frequency)"],
        tip: "Open the URL in a browser to see the dashboard. Data auto-refreshes every 30s.",
      };
    },
  },
];
