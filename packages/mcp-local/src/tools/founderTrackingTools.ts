/**
 * founderTrackingTools — Temporal action tracking across sessions, days, weeks,
 * months, quarters, and years.
 *
 * Every significant action records before/after state and reasoning.
 * Aggregation queries run in SQL for efficiency.
 */

import type { McpTool } from "../types.js";
import { getDb, genId } from "../db.js";

/* ------------------------------------------------------------------ */
/*  Module-level session ID (unique per process)                       */
/* ------------------------------------------------------------------ */

const SESSION_ID = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

/* ------------------------------------------------------------------ */
/*  Schema bootstrap (idempotent — runs on first getDb() call per      */
/*  process)                                                           */
/* ------------------------------------------------------------------ */

let _schemaReady = false;

function ensureSchema(): void {
  if (_schemaReady) return;
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS tracking_actions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actionId TEXT UNIQUE NOT NULL,
      sessionId TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      action TEXT NOT NULL,
      category TEXT NOT NULL,
      beforeState TEXT,
      afterState TEXT,
      reasoning TEXT,
      filesChanged TEXT,
      impactLevel TEXT NOT NULL,
      dayOfWeek TEXT NOT NULL,
      weekNumber INTEGER NOT NULL,
      month TEXT NOT NULL,
      quarter TEXT NOT NULL,
      year INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tracking_actions_session ON tracking_actions(sessionId);
    CREATE INDEX IF NOT EXISTS idx_tracking_actions_timestamp ON tracking_actions(timestamp);
    CREATE INDEX IF NOT EXISTS idx_tracking_actions_category ON tracking_actions(category);
    CREATE INDEX IF NOT EXISTS idx_tracking_actions_year ON tracking_actions(year);
    CREATE INDEX IF NOT EXISTS idx_tracking_actions_month ON tracking_actions(month);
    CREATE INDEX IF NOT EXISTS idx_tracking_actions_quarter ON tracking_actions(quarter);

    CREATE TABLE IF NOT EXISTS tracking_milestones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      milestoneId TEXT UNIQUE NOT NULL,
      sessionId TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      evidence TEXT,
      metrics TEXT,
      dayOfWeek TEXT NOT NULL,
      weekNumber INTEGER NOT NULL,
      month TEXT NOT NULL,
      quarter TEXT NOT NULL,
      year INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tracking_milestones_session ON tracking_milestones(sessionId);
    CREATE INDEX IF NOT EXISTS idx_tracking_milestones_timestamp ON tracking_milestones(timestamp);
    CREATE INDEX IF NOT EXISTS idx_tracking_milestones_category ON tracking_milestones(category);
    CREATE INDEX IF NOT EXISTS idx_tracking_milestones_year ON tracking_milestones(year);
    CREATE INDEX IF NOT EXISTS idx_tracking_milestones_month ON tracking_milestones(month);
    CREATE INDEX IF NOT EXISTS idx_tracking_milestones_quarter ON tracking_milestones(quarter);
  `);
  _schemaReady = true;
}

/* ------------------------------------------------------------------ */
/*  Temporal helpers                                                    */
/* ------------------------------------------------------------------ */

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

interface TemporalMeta {
  timestamp: string;
  dayOfWeek: string;
  weekNumber: number;
  month: string;
  quarter: string;
  year: number;
}

function getISOWeek(d: Date): number {
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  return Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function deriveQuarter(month: number): string {
  if (month <= 3) return "Q1";
  if (month <= 6) return "Q2";
  if (month <= 9) return "Q3";
  return "Q4";
}

function temporalMeta(now?: Date): TemporalMeta {
  const d = now ?? new Date();
  const m = d.getMonth() + 1;
  const y = d.getFullYear();
  return {
    timestamp: d.toISOString(),
    dayOfWeek: DAY_NAMES[d.getDay()],
    weekNumber: getISOWeek(d),
    month: `${y}-${String(m).padStart(2, "0")}`,
    quarter: `${y}-${deriveQuarter(m)}`,
    year: y,
  };
}

/* ------------------------------------------------------------------ */
/*  Tools                                                              */
/* ------------------------------------------------------------------ */

export const founderTrackingTools: McpTool[] = [
  // ─── 1. track_action ─────────────────────────────────────────────
  {
    name: "track_action",
    description:
      "Record any significant action with before/after state, reasoning, and temporal metadata. Auto-captures session, day, week, month, quarter, year.",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          description: "What was done (concise imperative description)",
        },
        category: {
          type: "string",
          enum: [
            "build",
            "deploy",
            "fix",
            "design",
            "research",
            "decision",
            "config",
            "test",
            "dogfood",
          ],
          description: "Action category",
        },
        beforeState: {
          type: "string",
          description: "State before the action (optional)",
        },
        afterState: {
          type: "string",
          description: "State after the action (optional)",
        },
        reasoning: {
          type: "string",
          description: "Why this action was taken (optional)",
        },
        filesChanged: {
          type: "array",
          items: { type: "string" },
          description: "File paths changed (optional)",
        },
        impactLevel: {
          type: "string",
          enum: ["minor", "moderate", "major", "critical"],
          description: "Impact level of the action (also accepts 'impact' as alias)",
        },
        impact: {
          type: "string",
          enum: ["minor", "moderate", "major", "critical", "high", "medium", "low"],
          description: "Alias for impactLevel — accepts high/medium/low or minor/moderate/major/critical",
        },
      },
      required: ["action", "category"],
    },
    handler: async (args: {
      action: string;
      category: string;
      beforeState?: string;
      afterState?: string;
      reasoning?: string;
      filesChanged?: string[];
      impactLevel?: string;
      impact?: string;
    }) => {
      ensureSchema();
      const db = getDb();
      const meta = temporalMeta();
      const actionId = genId("act");
      // Accept 'impact' as alias for 'impactLevel' (common agent shorthand)
      const resolvedImpact = args.impactLevel ?? args.impact ?? "moderate";

      db.prepare(
        `INSERT INTO tracking_actions
          (actionId, sessionId, timestamp, action, category, beforeState, afterState, reasoning, filesChanged, impactLevel, dayOfWeek, weekNumber, month, quarter, year)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        actionId,
        SESSION_ID,
        meta.timestamp,
        args.action,
        args.category,
        args.beforeState ?? null,
        args.afterState ?? null,
        args.reasoning ?? null,
        args.filesChanged ? JSON.stringify(args.filesChanged) : null,
        resolvedImpact,
        meta.dayOfWeek,
        meta.weekNumber,
        meta.month,
        meta.quarter,
        meta.year,
      );

      return {
        actionId,
        sessionId: SESSION_ID,
        timestamp: meta.timestamp,
        recorded: true,
      };
    },
  },

  // ─── 2. track_milestone ──────────────────────────────────────────
  {
    name: "track_milestone",
    description:
      "Record a significant milestone (phase complete, deploy, ship, launch, pivot, decision) with optional evidence and metrics.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Milestone title" },
        description: {
          type: "string",
          description: "What was achieved and why it matters",
        },
        category: {
          type: "string",
          enum: [
            "phase_complete",
            "deploy",
            "ship",
            "launch",
            "pivot",
            "decision",
            "dogfood",
            "benchmark",
          ],
          description: "Milestone category (required)",
        },
        evidence: {
          type: "string",
          description: "Evidence or proof (URL, screenshot path, metric)",
        },
        metrics: {
          type: "object",
          description:
            "Key metrics at milestone time (e.g. {tools: 338, tests: 1510})",
        },
      },
      required: ["title", "description", "category"],
    },
    handler: async (args: {
      title: string;
      description: string;
      category: string;
      evidence?: string;
      metrics?: Record<string, number>;
    }) => {
      ensureSchema();
      const db = getDb();
      const meta = temporalMeta();
      const milestoneId = genId("ms");

      db.prepare(
        `INSERT INTO tracking_milestones
          (milestoneId, sessionId, timestamp, title, description, category, evidence, metrics, dayOfWeek, weekNumber, month, quarter, year)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        milestoneId,
        SESSION_ID,
        meta.timestamp,
        args.title,
        args.description,
        args.category,
        args.evidence ?? null,
        args.metrics ? JSON.stringify(args.metrics) : null,
        meta.dayOfWeek,
        meta.weekNumber,
        meta.month,
        meta.quarter,
        meta.year,
      );

      return {
        milestoneId,
        sessionId: SESSION_ID,
        timestamp: meta.timestamp,
        recorded: true,
      };
    },
  },

  // ─── 3. get_session_journal ──────────────────────────────────────
  {
    name: "get_session_journal",
    description:
      "Get all tracked actions from the current or a specified session, in chronological order.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: {
          type: "string",
          description:
            "Session ID to query (defaults to current process session)",
        },
        limit: {
          type: "number",
          description: "Max actions to return (default 100)",
        },
      },
    },
    annotations: { readOnlyHint: true },
    handler: async (args: { sessionId?: string; limit?: number }) => {
      ensureSchema();
      const db = getDb();
      const sid = args.sessionId ?? SESSION_ID;
      const limit = args.limit ?? 100;

      const actions = db
        .prepare(
          `SELECT actionId, timestamp, action, category, beforeState, afterState, reasoning, filesChanged, impactLevel
           FROM tracking_actions WHERE sessionId = ? ORDER BY timestamp ASC LIMIT ?`,
        )
        .all(sid, limit) as any[];

      const milestones = db
        .prepare(
          `SELECT milestoneId, timestamp, title, description, category, evidence, metrics
           FROM tracking_milestones WHERE sessionId = ? ORDER BY timestamp ASC`,
        )
        .all(sid) as any[];

      return {
        sessionId: sid,
        currentSession: sid === SESSION_ID,
        actionCount: actions.length,
        milestoneCount: milestones.length,
        actions: actions.map((a) => ({
          ...a,
          filesChanged: a.filesChanged ? JSON.parse(a.filesChanged) : null,
        })),
        milestones: milestones.map((m) => ({
          ...m,
          metrics: m.metrics ? JSON.parse(m.metrics) : null,
        })),
      };
    },
  },

  // ─── 4. get_daily_log ────────────────────────────────────────────
  {
    name: "get_daily_log",
    description:
      "Get all tracked actions for a specific date, grouped by session with milestone highlights.",
    inputSchema: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "Date in YYYY-MM-DD format (defaults to today)",
        },
      },
    },
    annotations: { readOnlyHint: true },
    handler: async (args: { date?: string }) => {
      ensureSchema();
      const db = getDb();
      const targetDate =
        args.date ?? new Date().toISOString().slice(0, 10);

      const actions = db
        .prepare(
          `SELECT actionId, sessionId, timestamp, action, category, beforeState, afterState, reasoning, filesChanged, impactLevel
           FROM tracking_actions
           WHERE date(timestamp) = ?
           ORDER BY timestamp ASC`,
        )
        .all(targetDate) as any[];

      const milestones = db
        .prepare(
          `SELECT milestoneId, sessionId, timestamp, title, description, category, evidence, metrics
           FROM tracking_milestones
           WHERE date(timestamp) = ?
           ORDER BY timestamp ASC`,
        )
        .all(targetDate) as any[];

      // Group actions by session
      const bySession: Record<string, any[]> = {};
      for (const a of actions) {
        const sid = a.sessionId;
        if (!bySession[sid]) bySession[sid] = [];
        bySession[sid].push({
          ...a,
          filesChanged: a.filesChanged ? JSON.parse(a.filesChanged) : null,
        });
      }

      return {
        date: targetDate,
        totalActions: actions.length,
        totalMilestones: milestones.length,
        sessions: Object.entries(bySession).map(([sid, acts]) => ({
          sessionId: sid,
          actionCount: acts.length,
          actions: acts,
        })),
        milestones: milestones.map((m) => ({
          ...m,
          metrics: m.metrics ? JSON.parse(m.metrics) : null,
        })),
      };
    },
  },

  // ─── 5. get_weekly_summary ───────────────────────────────────────
  {
    name: "get_weekly_summary",
    description:
      "Summarize a week's tracked actions: totals by category and impact, files most changed, milestones.",
    inputSchema: {
      type: "object",
      properties: {
        weekStart: {
          type: "string",
          description:
            "Monday of the week in YYYY-MM-DD (defaults to current week's Monday)",
        },
      },
    },
    annotations: { readOnlyHint: true },
    handler: async (args: { weekStart?: string }) => {
      ensureSchema();
      const db = getDb();

      let monday: string;
      if (args.weekStart) {
        monday = args.weekStart;
      } else {
        const now = new Date();
        const day = now.getDay();
        const diff = day === 0 ? 6 : day - 1;
        const m = new Date(now);
        m.setDate(m.getDate() - diff);
        monday = m.toISOString().slice(0, 10);
      }

      const sundayDate = new Date(monday);
      sundayDate.setDate(sundayDate.getDate() + 6);
      const sunday = sundayDate.toISOString().slice(0, 10);

      const byCategory = db
        .prepare(
          `SELECT category, COUNT(*) as count
           FROM tracking_actions
           WHERE date(timestamp) BETWEEN ? AND ?
           GROUP BY category ORDER BY count DESC`,
        )
        .all(monday, sunday) as any[];

      const byImpact = db
        .prepare(
          `SELECT impactLevel, COUNT(*) as count
           FROM tracking_actions
           WHERE date(timestamp) BETWEEN ? AND ?
           GROUP BY impactLevel ORDER BY count DESC`,
        )
        .all(monday, sunday) as any[];

      const totalActions = db
        .prepare(
          `SELECT COUNT(*) as count
           FROM tracking_actions
           WHERE date(timestamp) BETWEEN ? AND ?`,
        )
        .get(monday, sunday) as any;

      const milestones = db
        .prepare(
          `SELECT milestoneId, timestamp, title, category
           FROM tracking_milestones
           WHERE date(timestamp) BETWEEN ? AND ?
           ORDER BY timestamp ASC`,
        )
        .all(monday, sunday) as any[];

      // Files most changed
      const allFiles = db
        .prepare(
          `SELECT filesChanged
           FROM tracking_actions
           WHERE date(timestamp) BETWEEN ? AND ? AND filesChanged IS NOT NULL`,
        )
        .all(monday, sunday) as any[];

      const fileCounts: Record<string, number> = {};
      for (const row of allFiles) {
        const files: string[] = JSON.parse(row.filesChanged);
        for (const f of files) {
          fileCounts[f] = (fileCounts[f] ?? 0) + 1;
        }
      }
      const topFiles = Object.entries(fileCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([file, count]) => ({ file, count }));

      return {
        weekStart: monday,
        weekEnd: sunday,
        totalActions: totalActions.count,
        byCategory: Object.fromEntries(
          byCategory.map((r) => [r.category, r.count]),
        ),
        byImpact: Object.fromEntries(
          byImpact.map((r) => [r.impactLevel, r.count]),
        ),
        milestones,
        topFiles,
      };
    },
  },

  // ─── 6. get_monthly_report ───────────────────────────────────────
  {
    name: "get_monthly_report",
    description:
      "Monthly rollup of actions: weekly breakdown, trending categories, velocity (actions/day), milestone timeline.",
    inputSchema: {
      type: "object",
      properties: {
        month: {
          type: "string",
          description: "Month in YYYY-MM format (defaults to current month)",
        },
      },
    },
    annotations: { readOnlyHint: true },
    handler: async (args: { month?: string }) => {
      ensureSchema();
      const db = getDb();
      const month =
        args.month ?? new Date().toISOString().slice(0, 7);

      const byCategory = db
        .prepare(
          `SELECT category, COUNT(*) as count
           FROM tracking_actions WHERE month = ?
           GROUP BY category ORDER BY count DESC`,
        )
        .all(month) as any[];

      const byWeek = db
        .prepare(
          `SELECT weekNumber, COUNT(*) as count
           FROM tracking_actions WHERE month = ?
           GROUP BY weekNumber ORDER BY weekNumber ASC`,
        )
        .all(month) as any[];

      const totalActions = db
        .prepare(
          `SELECT COUNT(*) as count FROM tracking_actions WHERE month = ?`,
        )
        .get(month) as any;

      const milestones = db
        .prepare(
          `SELECT milestoneId, timestamp, title, category, metrics
           FROM tracking_milestones WHERE month = ?
           ORDER BY timestamp ASC`,
        )
        .all(month) as any[];

      const byImpact = db
        .prepare(
          `SELECT impactLevel, COUNT(*) as count
           FROM tracking_actions WHERE month = ?
           GROUP BY impactLevel ORDER BY count DESC`,
        )
        .all(month) as any[];

      // Distinct days with actions for velocity
      const activeDays = db
        .prepare(
          `SELECT COUNT(DISTINCT date(timestamp)) as days
           FROM tracking_actions WHERE month = ?`,
        )
        .get(month) as any;

      const velocity =
        activeDays.days > 0
          ? Math.round((totalActions.count / activeDays.days) * 10) / 10
          : 0;

      return {
        month,
        totalActions: totalActions.count,
        activeDays: activeDays.days,
        velocityPerDay: velocity,
        byCategory: Object.fromEntries(
          byCategory.map((r) => [r.category, r.count]),
        ),
        byImpact: Object.fromEntries(
          byImpact.map((r) => [r.impactLevel, r.count]),
        ),
        byWeek: byWeek.map((r) => ({
          week: r.weekNumber,
          actions: r.count,
        })),
        milestones: milestones.map((m) => ({
          ...m,
          metrics: m.metrics ? JSON.parse(m.metrics) : null,
        })),
      };
    },
  },

  // ─── 7. get_quarterly_review ─────────────────────────────────────
  {
    name: "get_quarterly_review",
    description:
      "Quarterly strategic view: monthly trends, category shifts, biggest milestones, velocity curve.",
    inputSchema: {
      type: "object",
      properties: {
        quarter: {
          type: "string",
          description:
            "Quarter in YYYY-Q1/Q2/Q3/Q4 format (defaults to current quarter)",
        },
      },
    },
    annotations: { readOnlyHint: true },
    handler: async (args: { quarter?: string }) => {
      ensureSchema();
      const db = getDb();

      let quarter: string;
      if (args.quarter) {
        quarter = args.quarter;
      } else {
        const now = new Date();
        quarter = `${now.getFullYear()}-${deriveQuarter(now.getMonth() + 1)}`;
      }

      const byMonth = db
        .prepare(
          `SELECT month, COUNT(*) as count
           FROM tracking_actions WHERE quarter = ?
           GROUP BY month ORDER BY month ASC`,
        )
        .all(quarter) as any[];

      const byCategory = db
        .prepare(
          `SELECT category, COUNT(*) as count
           FROM tracking_actions WHERE quarter = ?
           GROUP BY category ORDER BY count DESC`,
        )
        .all(quarter) as any[];

      const totalActions = db
        .prepare(
          `SELECT COUNT(*) as count FROM tracking_actions WHERE quarter = ?`,
        )
        .get(quarter) as any;

      const milestones = db
        .prepare(
          `SELECT milestoneId, timestamp, title, category, metrics
           FROM tracking_milestones WHERE quarter = ?
           ORDER BY timestamp ASC`,
        )
        .all(quarter) as any[];

      const activeDays = db
        .prepare(
          `SELECT COUNT(DISTINCT date(timestamp)) as days
           FROM tracking_actions WHERE quarter = ?`,
        )
        .get(quarter) as any;

      const velocity =
        activeDays.days > 0
          ? Math.round((totalActions.count / activeDays.days) * 10) / 10
          : 0;

      // First and last action timestamps for state span
      const firstAction = db
        .prepare(
          `SELECT timestamp, action FROM tracking_actions WHERE quarter = ? ORDER BY timestamp ASC LIMIT 1`,
        )
        .get(quarter) as any;

      const lastAction = db
        .prepare(
          `SELECT timestamp, action FROM tracking_actions WHERE quarter = ? ORDER BY timestamp DESC LIMIT 1`,
        )
        .get(quarter) as any;

      return {
        quarter,
        totalActions: totalActions.count,
        activeDays: activeDays.days,
        velocityPerDay: velocity,
        byMonth: byMonth.map((r) => ({
          month: r.month,
          actions: r.count,
        })),
        byCategory: Object.fromEntries(
          byCategory.map((r) => [r.category, r.count]),
        ),
        milestones: milestones.map((m) => ({
          ...m,
          metrics: m.metrics ? JSON.parse(m.metrics) : null,
        })),
        stateSpan: {
          firstAction: firstAction ?? null,
          lastAction: lastAction ?? null,
        },
      };
    },
  },

  // ─── 8. get_annual_retrospective ─────────────────────────────────
  {
    name: "get_annual_retrospective",
    description:
      "Full year view: quarterly summaries, yearly milestones, category distribution, growth metrics.",
    inputSchema: {
      type: "object",
      properties: {
        year: {
          type: "number",
          description: "Year to review (defaults to current year)",
        },
      },
    },
    annotations: { readOnlyHint: true },
    handler: async (args: { year?: number }) => {
      ensureSchema();
      const db = getDb();
      const year = args.year ?? new Date().getFullYear();

      const byQuarter = db
        .prepare(
          `SELECT quarter, COUNT(*) as count
           FROM tracking_actions WHERE year = ?
           GROUP BY quarter ORDER BY quarter ASC`,
        )
        .all(year) as any[];

      const byCategory = db
        .prepare(
          `SELECT category, COUNT(*) as count
           FROM tracking_actions WHERE year = ?
           GROUP BY category ORDER BY count DESC`,
        )
        .all(year) as any[];

      const byMonth = db
        .prepare(
          `SELECT month, COUNT(*) as count
           FROM tracking_actions WHERE year = ?
           GROUP BY month ORDER BY month ASC`,
        )
        .all(year) as any[];

      const totalActions = db
        .prepare(
          `SELECT COUNT(*) as count FROM tracking_actions WHERE year = ?`,
        )
        .get(year) as any;

      const milestones = db
        .prepare(
          `SELECT milestoneId, timestamp, title, category, metrics
           FROM tracking_milestones WHERE year = ?
           ORDER BY timestamp ASC`,
        )
        .all(year) as any[];

      const activeDays = db
        .prepare(
          `SELECT COUNT(DISTINCT date(timestamp)) as days
           FROM tracking_actions WHERE year = ?`,
        )
        .get(year) as any;

      const totalSessions = db
        .prepare(
          `SELECT COUNT(DISTINCT sessionId) as count
           FROM tracking_actions WHERE year = ?`,
        )
        .get(year) as any;

      const velocity =
        activeDays.days > 0
          ? Math.round((totalActions.count / activeDays.days) * 10) / 10
          : 0;

      return {
        year,
        totalActions: totalActions.count,
        totalSessions: totalSessions.count,
        totalMilestones: milestones.length,
        activeDays: activeDays.days,
        velocityPerDay: velocity,
        byQuarter: byQuarter.map((r) => ({
          quarter: r.quarter,
          actions: r.count,
        })),
        byMonth: byMonth.map((r) => ({
          month: r.month,
          actions: r.count,
        })),
        byCategory: Object.fromEntries(
          byCategory.map((r) => [r.category, r.count]),
        ),
        milestones: milestones.map((m) => ({
          ...m,
          metrics: m.metrics ? JSON.parse(m.metrics) : null,
        })),
      };
    },
  },

  // ─── 9. get_proactive_alerts ─────────────────────────────────────
  {
    name: "get_proactive_alerts",
    description:
      "Scan causal memory for watchlist-worthy alerts: new events on tracked entities, unresolved important changes, stale packets, trajectory drift, and repeated unanswered queries. Returns prioritized alerts with suggested actions.",
    inputSchema: {
      type: "object",
      properties: {
        entityId: {
          type: "string",
          description:
            "Filter to a specific entity (optional — omit to scan all tracked entities)",
        },
        lookbackDays: {
          type: "number",
          description: "How many days back to scan (default 7)",
        },
        limit: {
          type: "number",
          description: "Max alerts to return (default 10)",
        },
      },
    },
    annotations: { readOnlyHint: true },
    handler: async (args: {
      entityId?: string;
      lookbackDays?: number;
      limit?: number;
    }) => {
      ensureSchema();
      const db = getDb();
      const lookbackDays = args.lookbackDays ?? 7;
      const limit = args.limit ?? 10;
      const nowMs = Date.now();
      const sinceMs = nowMs - lookbackDays * 24 * 60 * 60 * 1000;
      const sinceIso = new Date(sinceMs).toISOString();

      type AlertPriority = "critical" | "high" | "medium" | "low";
      type AlertType =
        | "new_event"
        | "unresolved_change"
        | "stale_packet"
        | "trajectory_drift"
        | "repeated_question";

      interface ProactiveAlert {
        priority: AlertPriority;
        alertType: AlertType;
        entityId: string;
        summary: string;
        suggestedAction: string;
        lastSeen: string;
      }

      const alerts: ProactiveAlert[] = [];

      /* --- 1. New events since lookback for tracked entities ---------- */
      try {
        const entityFilter = args.entityId ? "AND entityId = ?" : "";
        const entityParams: unknown[] = args.entityId
          ? [sinceMs, args.entityId]
          : [sinceMs];

        const newEvents = db
          .prepare(
            `SELECT entityId, COUNT(*) as cnt, MAX(createdAt) as lastSeen,
                    GROUP_CONCAT(DISTINCT eventType) as types
             FROM causal_events
             WHERE timestampMs >= ? ${entityFilter}
             GROUP BY entityId
             ORDER BY cnt DESC LIMIT 50`,
          )
          .all(...entityParams) as any[];

        for (const row of newEvents) {
          const priority: AlertPriority =
            row.cnt >= 10 ? "high" : row.cnt >= 5 ? "medium" : "low";
          alerts.push({
            priority,
            alertType: "new_event",
            entityId: row.entityId,
            summary: `${row.cnt} new event(s) [${row.types}] in the last ${lookbackDays}d`,
            suggestedAction: `Review recent activity for entity "${row.entityId}" via get_event_ledger`,
            lastSeen: row.lastSeen,
          });
        }
      } catch {
        /* causal_events table may not exist yet — skip */
      }

      /* --- 2. Unresolved important changes --------------------------- */
      try {
        const unresolvedChanges = db
          .prepare(
            `SELECT changeId, changeCategory, impactScore, impactReason,
                    affectedEntities, suggestedAction, status, createdAt
             FROM causal_important_changes
             WHERE status IN ('detected', 'acknowledged')
             ORDER BY impactScore DESC LIMIT 50`,
          )
          .all() as any[];

        for (const row of unresolvedChanges) {
          const affected: Array<{ entityType: string; entityId: string }> =
            JSON.parse(row.affectedEntities);

          // If filtering by entityId, skip non-matching
          if (
            args.entityId &&
            !affected.some((a) => a.entityId === args.entityId)
          ) {
            continue;
          }

          const priority: AlertPriority =
            row.impactScore >= 0.8
              ? "critical"
              : row.impactScore >= 0.5
                ? "high"
                : "medium";
          const entityLabel =
            affected.map((a) => a.entityId).join(", ") || "unknown";

          alerts.push({
            priority,
            alertType: "unresolved_change",
            entityId: entityLabel,
            summary: `[${row.status}] ${row.changeCategory}: ${row.impactReason}`,
            suggestedAction:
              row.suggestedAction ??
              `Investigate change ${row.changeId} and resolve or dismiss`,
            lastSeen: row.createdAt,
          });
        }
      } catch {
        /* causal_important_changes table may not exist yet — skip */
      }

      /* --- 3. Stale packets — entities with no packet in 7+ days ----- */
      try {
        const staleThreshold = new Date(
          nowMs - 7 * 24 * 60 * 60 * 1000,
        ).toISOString();
        const entityFilter = args.entityId
          ? "WHERE entityId = ?"
          : "";
        const entityParams: unknown[] = args.entityId
          ? [args.entityId]
          : [];

        const latestPackets = db
          .prepare(
            `SELECT entityId, MAX(createdAt) as lastPacket, COUNT(*) as totalPackets
             FROM founder_packets
             ${entityFilter}
             GROUP BY entityId
             HAVING MAX(createdAt) < ?`,
          )
          .all(...entityParams, staleThreshold) as any[];

        for (const row of latestPackets) {
          const daysSince = Math.floor(
            (nowMs - new Date(row.lastPacket).getTime()) / (24 * 60 * 60 * 1000),
          );
          const priority: AlertPriority = daysSince >= 14 ? "high" : "medium";

          alerts.push({
            priority,
            alertType: "stale_packet",
            entityId: row.entityId,
            summary: `Last packet was ${daysSince}d ago (${row.totalPackets} total packets)`,
            suggestedAction: `Generate a fresh founder packet for "${row.entityId}"`,
            lastSeen: row.lastPacket,
          });
        }
      } catch {
        /* founder_packets table may not exist yet — skip */
      }

      /* --- 4. Trajectory drift — score changed >10% since last ----- */
      try {
        const entityFilter = args.entityId
          ? "WHERE entityId = ?"
          : "";
        const entityParams: unknown[] = args.entityId
          ? [args.entityId]
          : [];

        const trajectoryRows = db
          .prepare(
            `SELECT entityId, score, createdAt
             FROM causal_trajectory_scores
             ${entityFilter}
             ORDER BY createdAt DESC`,
          )
          .all(...entityParams) as any[];

        // Group by entityId and compare last two scores
        const byEntity: Record<string, any[]> = {};
        for (const row of trajectoryRows) {
          if (!byEntity[row.entityId]) byEntity[row.entityId] = [];
          if (byEntity[row.entityId].length < 2) {
            byEntity[row.entityId].push(row);
          }
        }

        for (const [eid, rows] of Object.entries(byEntity)) {
          if (rows.length < 2) continue;
          const latest = rows[0].score as number;
          const previous = rows[1].score as number;
          if (previous === 0) continue;
          const pctChange = Math.abs((latest - previous) / previous) * 100;
          if (pctChange > 10) {
            const direction = latest > previous ? "up" : "down";
            alerts.push({
              priority: pctChange > 25 ? "high" : "medium",
              alertType: "trajectory_drift",
              entityId: eid,
              summary: `Trajectory score shifted ${direction} ${pctChange.toFixed(1)}% (${previous.toFixed(2)} -> ${latest.toFixed(2)})`,
              suggestedAction: `Review trajectory for "${eid}" — significant drift detected`,
              lastSeen: rows[0].createdAt,
            });
          }
        }
      } catch {
        /* causal_trajectory_scores table may not exist yet — skip */
      }

      /* --- 5. Repeated questions — same entity queried 3+ times ----- */
      try {
        const entityFilter = args.entityId
          ? "AND entityId = ?"
          : "";
        const entityParams: unknown[] = args.entityId
          ? [sinceMs, args.entityId]
          : [sinceMs];

        const repeats = db
          .prepare(
            `SELECT entityId, COUNT(*) as queryCount, MAX(createdAt) as lastSeen
             FROM causal_events
             WHERE timestampMs >= ?
               AND eventType IN ('search', 'query', 'investigation_started', 'entity_viewed', 'user_action')
               ${entityFilter}
             GROUP BY entityId
             HAVING queryCount >= 3
             ORDER BY queryCount DESC LIMIT 20`,
          )
          .all(...entityParams) as any[];

        // Check which of these have NO packet export
        for (const row of repeats) {
          let hasRecentPacket = false;
          try {
            const pkt = db
              .prepare(
                `SELECT COUNT(*) as cnt FROM founder_packets
                 WHERE entityId = ? AND createdAt >= ?`,
              )
              .get(row.entityId, sinceIso) as any;
            hasRecentPacket = pkt.cnt > 0;
          } catch {
            /* founder_packets may not exist */
          }

          if (!hasRecentPacket) {
            alerts.push({
              priority: row.queryCount >= 5 ? "high" : "medium",
              alertType: "repeated_question",
              entityId: row.entityId,
              summary: `Queried ${row.queryCount} times in ${lookbackDays}d with no packet export`,
              suggestedAction: `Generate a packet for "${row.entityId}" — repeated interest without capture`,
              lastSeen: row.lastSeen,
            });
          }
        }
      } catch {
        /* causal_events table may not exist yet — skip */
      }

      /* --- Sort: priority order (critical > high > medium > low), then recency --- */
      const priorityOrder: Record<AlertPriority, number> = {
        critical: 0,
        high: 1,
        medium: 2,
        low: 3,
      };
      alerts.sort((a, b) => {
        const pd = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (pd !== 0) return pd;
        return (
          new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime()
        );
      });

      const trimmed = alerts.slice(0, limit);
      const criticalCount = trimmed.filter(
        (a) => a.priority === "critical",
      ).length;

      return {
        alerts: trimmed,
        alertCount: trimmed.length,
        criticalCount,
        since: sinceIso,
        note: "These items need attention before your next packet generation.",
      };
    },
  },

  // ─── 10. dismiss_alert ──────────────────────────────────────────
  {
    name: "dismiss_alert",
    description:
      "Dismiss an important change alert so it no longer appears in proactive alerts. Sets the status to 'dismissed'.",
    inputSchema: {
      type: "object",
      properties: {
        changeId: {
          type: "string",
          description:
            "The changeId of the important change to dismiss (from causal_important_changes)",
        },
        reason: {
          type: "string",
          description: "Optional reason for dismissal",
        },
      },
      required: ["changeId"],
    },
    handler: async (args: { changeId: string; reason?: string }) => {
      ensureSchema();
      const db = getDb();

      // Verify the change exists
      let existing: any;
      try {
        existing = db
          .prepare(
            `SELECT changeId, status, changeCategory, impactReason
             FROM causal_important_changes WHERE changeId = ?`,
          )
          .get(args.changeId);
      } catch {
        return {
          dismissed: false,
          error:
            "causal_important_changes table does not exist yet. No alerts to dismiss.",
        };
      }

      if (!existing) {
        return {
          dismissed: false,
          error: `No important change found with changeId "${args.changeId}"`,
        };
      }

      if (existing.status === "dismissed") {
        return {
          dismissed: false,
          error: `Change "${args.changeId}" is already dismissed`,
        };
      }

      db.prepare(
        `UPDATE causal_important_changes SET status = 'dismissed' WHERE changeId = ?`,
      ).run(args.changeId);

      return {
        dismissed: true,
        changeId: args.changeId,
        previousStatus: existing.status,
        reason: args.reason ?? null,
        note: `Alert for "${existing.changeCategory}" dismissed. It will no longer appear in proactive alerts.`,
      };
    },
  },
];
