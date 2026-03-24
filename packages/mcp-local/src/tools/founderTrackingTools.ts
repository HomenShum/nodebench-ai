/**
 * founderTrackingTools — Temporal action tracking across sessions, days, weeks,
 * months, quarters, and years. Plus agent compatibility validation.
 *
 * Every significant action records before/after state and reasoning.
 * Aggregation queries run in SQL for efficiency.
 */

import type { McpTool } from "../types.js";
import { getDb, genId } from "../db.js";
import { validateAgentCompatibilityTool } from "../benchmarks/agentValidation.js";

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

    CREATE TABLE IF NOT EXISTS session_summaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      summaryId TEXT UNIQUE NOT NULL,
      sessionId TEXT NOT NULL,
      sessionSummary TEXT NOT NULL,
      activeEntities TEXT NOT NULL,
      openIntents TEXT NOT NULL,
      packetState TEXT NOT NULL,
      unresolvedItems TEXT NOT NULL,
      lastAction TEXT NOT NULL,
      sessionDurationMs INTEGER NOT NULL,
      toolCallCount INTEGER NOT NULL,
      keyDecisions TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      timestampMs INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_session_summaries_sessionId ON session_summaries(sessionId);
    CREATE INDEX IF NOT EXISTS idx_session_summaries_timestampMs ON session_summaries(timestampMs);

    CREATE TABLE IF NOT EXISTS intent_residuals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      intentId TEXT UNIQUE NOT NULL,
      intent TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      context TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_intent_residuals_status ON intent_residuals(status);
    CREATE INDEX IF NOT EXISTS idx_intent_residuals_updatedAt ON intent_residuals(updatedAt);
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
  // ─── 12. summarize_session ────────────────────────────────────────
  {
    name: "summarize_session",
    description:
      "Summarize the current or specified session's activity from causal memory, tracking actions, packets, and important changes. Stores the summary to session_summaries for post-compaction recovery.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: {
          type: "string",
          description:
            "Session ID to summarize (defaults to current process session)",
        },
        maxTokens: {
          type: "number",
          description:
            "Approximate max tokens for the sessionSummary text (default 500)",
        },
      },
    },
    handler: async (args: { sessionId?: string; maxTokens?: number }) => {
      ensureSchema();
      const db = getDb();
      const sid = args.sessionId ?? SESSION_ID;
      const _maxTokens = args.maxTokens ?? 500;

      // --- Gather causal events for this session's time window ---
      // Find session time bounds from tracking_actions
      const sessionBounds = db
        .prepare(
          `SELECT MIN(timestamp) as earliest, MAX(timestamp) as latest, COUNT(*) as cnt
           FROM tracking_actions WHERE sessionId = ?`,
        )
        .get(sid) as any;

      const actionCount = sessionBounds?.cnt ?? 0;
      const earliestTs = sessionBounds?.earliest;
      const latestTs = sessionBounds?.latest;
      const sessionDurationMs =
        earliestTs && latestTs
          ? new Date(latestTs).getTime() - new Date(earliestTs).getTime()
          : 0;

      // --- Tracking actions ---
      const actions = db
        .prepare(
          `SELECT action, category, impactLevel, timestamp
           FROM tracking_actions WHERE sessionId = ?
           ORDER BY timestamp DESC LIMIT 50`,
        )
        .all(sid) as any[];

      // --- Causal events in the session window ---
      let causalEvents: any[] = [];
      let causalEventCount = 0;
      if (earliestTs) {
        const startMs = new Date(earliestTs).getTime() - 60000; // 1 min before
        const endMs = latestTs
          ? new Date(latestTs).getTime() + 60000
          : Date.now();
        const causalResult = db
          .prepare(
            `SELECT eventType, entityType, entityId, summary
             FROM causal_events WHERE timestampMs BETWEEN ? AND ?
             ORDER BY timestampMs DESC LIMIT 50`,
          )
          .all(startMs, endMs) as any[];
        causalEvents = causalResult;
        const countResult = db
          .prepare(
            `SELECT COUNT(*) as cnt FROM causal_events WHERE timestampMs BETWEEN ? AND ?`,
          )
          .get(startMs, endMs) as any;
        causalEventCount = countResult?.cnt ?? 0;
      }

      // --- Active entities (unique from causal events) ---
      const entitySet = new Set<string>();
      for (const ev of causalEvents) {
        entitySet.add(`${ev.entityType}:${ev.entityId}`);
      }
      const activeEntities = [...entitySet].slice(0, 20);

      // --- Open intents (inferred from event types) ---
      const intentSet = new Set<string>();
      for (const ev of causalEvents) {
        if (ev.eventType.includes("started") || ev.eventType.includes("created")) {
          intentSet.add(`${ev.eventType}: ${ev.summary.slice(0, 80)}`);
        }
      }
      for (const a of actions) {
        if (a.category === "research" || a.category === "build" || a.category === "decision") {
          intentSet.add(`${a.category}: ${a.action.slice(0, 80)}`);
        }
      }
      const openIntents = [...intentSet].slice(0, 10);

      // --- Packet state ---
      let packetState = { generated: 0, exported: 0, reused: 0 };
      try {
        if (earliestTs) {
          const startMs = new Date(earliestTs).getTime() - 60000;
          const endMs = latestTs
            ? new Date(latestTs).getTime() + 60000
            : Date.now();
          const gen = db
            .prepare(
              `SELECT COUNT(*) as cnt FROM founder_packets
               WHERE createdAt >= ? AND createdAt <= ?`,
            )
            .get(
              new Date(startMs).toISOString(),
              new Date(endMs).toISOString(),
            ) as any;
          packetState.generated = gen?.cnt ?? 0;
          const exp = db
            .prepare(
              `SELECT COUNT(*) as cnt FROM founder_packets
               WHERE exportedAt IS NOT NULL AND createdAt >= ? AND createdAt <= ?`,
            )
            .get(
              new Date(startMs).toISOString(),
              new Date(endMs).toISOString(),
            ) as any;
          packetState.exported = exp?.cnt ?? 0;
        }
      } catch {
        /* founder_packets table may not exist yet */
      }

      // --- Unresolved important changes ---
      const unresolvedRows = db
        .prepare(
          `SELECT changeCategory, impactReason
           FROM causal_important_changes
           WHERE status NOT IN ('resolved', 'dismissed')
           ORDER BY timestampMs DESC LIMIT 10`,
        )
        .all() as any[];
      const unresolvedItems = unresolvedRows.map(
        (r) => `[${r.changeCategory}] ${r.impactReason.slice(0, 100)}`,
      );

      // --- Key decisions ---
      const decisionEvents = causalEvents.filter(
        (ev) =>
          ev.eventType.includes("decision") ||
          ev.eventType.includes("packet.generated") ||
          ev.eventType === "artifact_generated",
      );
      const keyDecisions = decisionEvents
        .map((ev) => ev.summary.slice(0, 120))
        .slice(0, 10);

      // --- Last action ---
      const lastAction =
        actions.length > 0
          ? `[${actions[0].category}] ${actions[0].action}`
          : "No actions recorded";

      // --- Build natural language summary ---
      const categoryBreakdown: Record<string, number> = {};
      for (const a of actions) {
        categoryBreakdown[a.category] = (categoryBreakdown[a.category] ?? 0) + 1;
      }
      const catParts = Object.entries(categoryBreakdown)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([cat, n]) => `${n} ${cat}`)
        .join(", ");

      const summaryParts: string[] = [];
      summaryParts.push(
        `Session ${sid} recorded ${actionCount} actions${catParts ? ` (${catParts})` : ""} and ${causalEventCount} causal events across ${activeEntities.length} entities over ${Math.round(sessionDurationMs / 60000)} minutes.`,
      );
      if (keyDecisions.length > 0) {
        summaryParts.push(
          `Key decisions: ${keyDecisions.slice(0, 3).join("; ")}.`,
        );
      }
      if (unresolvedItems.length > 0) {
        summaryParts.push(
          `${unresolvedItems.length} unresolved important change(s) pending.`,
        );
      }

      // Truncate summary to approximate token limit (4 chars ~ 1 token)
      let sessionSummary = summaryParts.join(" ");
      const charLimit = _maxTokens * 4;
      if (sessionSummary.length > charLimit) {
        sessionSummary = sessionSummary.slice(0, charLimit - 3) + "...";
      }

      // --- Store to session_summaries ---
      const now = Date.now();
      const summaryId = genId("ssm");
      const summaryPayload = {
        sessionSummary,
        activeEntities,
        openIntents,
        packetState,
        unresolvedItems,
        lastAction,
        sessionDurationMs,
        toolCallCount: actionCount + causalEventCount,
        keyDecisions,
      };

      db.prepare(
        `INSERT INTO session_summaries
          (summaryId, sessionId, sessionSummary, activeEntities, openIntents, packetState, unresolvedItems, lastAction, sessionDurationMs, toolCallCount, keyDecisions, createdAt, timestampMs)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        summaryId,
        sid,
        sessionSummary,
        JSON.stringify(activeEntities),
        JSON.stringify(openIntents),
        JSON.stringify(packetState),
        JSON.stringify(unresolvedItems),
        lastAction,
        sessionDurationMs,
        actionCount + causalEventCount,
        JSON.stringify(keyDecisions),
        new Date(now).toISOString(),
        now,
      );

      return {
        summaryId,
        ...summaryPayload,
        stored: true,
      };
    },
  },

  // ─── 13. track_intent ──────────────────────────────────────────────
  {
    name: "track_intent",
    description:
      "Track a user intent that should survive context window compaction. On 'active' status inserts a new intent. On 'completed' or 'blocked' updates the best-matching existing active intent via word overlap.",
    inputSchema: {
      type: "object",
      properties: {
        intent: {
          type: "string",
          description:
            "Natural language description of the user's intent (e.g. 'Build session memory system for NodeBench MCP')",
        },
        status: {
          type: "string",
          enum: ["active", "completed", "blocked"],
          description:
            "Intent status: 'active' to create, 'completed'/'blocked' to update an existing intent",
        },
        context: {
          type: "string",
          description:
            "Optional context about the intent (what was tried, what's blocking, etc.)",
        },
      },
      required: ["intent", "status"],
    },
    handler: async (args: {
      intent: string;
      status: "active" | "completed" | "blocked";
      context?: string;
    }) => {
      ensureSchema();
      const db = getDb();
      const now = new Date().toISOString();

      if (args.status === "active") {
        // Insert new intent
        const intentId = genId("int");
        db.prepare(
          `INSERT INTO intent_residuals (intentId, intent, status, context, createdAt, updatedAt)
           VALUES (?, ?, 'active', ?, ?, ?)`,
        ).run(intentId, args.intent, args.context ?? null, now, now);

        // Return all active intents for context
        const activeIntents = db
          .prepare(
            `SELECT intentId, intent, context, createdAt, updatedAt
             FROM intent_residuals WHERE status = 'active'
             ORDER BY updatedAt DESC`,
          )
          .all() as any[];

        return {
          intentId,
          recorded: true,
          totalActive: activeIntents.length,
          activeIntents: activeIntents.map((i) => ({
            intentId: i.intentId,
            intent: i.intent,
            context: i.context,
            createdAt: i.createdAt,
          })),
        };
      }

      // For completed/blocked: fuzzy match by word overlap against active intents
      const activeIntents = db
        .prepare(
          `SELECT intentId, intent, context FROM intent_residuals WHERE status = 'active'`,
        )
        .all() as any[];

      if (activeIntents.length === 0) {
        return {
          updated: false,
          error: "No active intents found to update",
          totalActive: 0,
        };
      }

      // Word overlap scoring
      const inputWords = new Set(
        args.intent
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => w.length > 2),
      );
      let bestMatch: any = null;
      let bestScore = 0;

      for (const candidate of activeIntents) {
        const candidateWords = new Set(
          candidate.intent
            .toLowerCase()
            .split(/\s+/)
            .filter((w: string) => w.length > 2),
        );
        let overlap = 0;
        for (const w of inputWords) {
          if (candidateWords.has(w)) overlap++;
        }
        const score =
          inputWords.size > 0 ? overlap / inputWords.size : 0;
        if (score > bestScore) {
          bestScore = score;
          bestMatch = candidate;
        }
      }

      if (!bestMatch || bestScore < 0.2) {
        // No good match — insert as new intent with the given status
        const intentId = genId("int");
        db.prepare(
          `INSERT INTO intent_residuals (intentId, intent, status, context, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?)`,
        ).run(intentId, args.intent, args.status, args.context ?? null, now, now);

        return {
          intentId,
          recorded: true,
          matchScore: bestScore,
          note: "No close match found among active intents; created new entry",
          totalActive: activeIntents.length,
        };
      }

      // Update matched intent
      db.prepare(
        `UPDATE intent_residuals SET status = ?, context = ?, updatedAt = ? WHERE intentId = ?`,
      ).run(
        args.status,
        args.context ?? bestMatch.context,
        now,
        bestMatch.intentId,
      );

      // Return remaining active intents
      const remaining = db
        .prepare(
          `SELECT intentId, intent, context, createdAt, updatedAt
           FROM intent_residuals WHERE status = 'active'
           ORDER BY updatedAt DESC`,
        )
        .all() as any[];

      return {
        updated: true,
        matchedIntentId: bestMatch.intentId,
        matchedIntent: bestMatch.intent,
        matchScore: Math.round(bestScore * 100) / 100,
        newStatus: args.status,
        totalActive: remaining.length,
        activeIntents: remaining.map((i) => ({
          intentId: i.intentId,
          intent: i.intent,
          context: i.context,
          createdAt: i.createdAt,
        })),
      };
    },
  },

  // ─── 14. get_compaction_recovery ────────────────────────────────────
  {
    name: "get_compaction_recovery",
    description:
      "Recovery tool for post-context-compaction state restoration. Call this RIGHT AFTER Claude Code compacts context to recover session state, active intents, packet status, unresolved changes, and pending alerts. Returns a ready-to-use injection prompt.",
    inputSchema: {
      type: "object",
      properties: {
        maxTokens: {
          type: "number",
          description:
            "Approximate max tokens for the injection prompt (default 2000)",
        },
      },
    },
    annotations: { readOnlyHint: true },
    handler: async (args: { maxTokens?: number }) => {
      ensureSchema();
      const db = getDb();
      const maxTokens = args.maxTokens ?? 2000;

      // --- Most recent session summary ---
      let lastSessionSummary = "No session summary available.";
      try {
        const latest = db
          .prepare(
            `SELECT sessionSummary, activeEntities, openIntents, keyDecisions, sessionDurationMs, toolCallCount
             FROM session_summaries ORDER BY timestampMs DESC LIMIT 1`,
          )
          .get() as any;
        if (latest) {
          lastSessionSummary = latest.sessionSummary;
        }
      } catch {
        /* table may be empty */
      }

      // --- Active intent residuals ---
      const activeIntentRows = db
        .prepare(
          `SELECT intent, context, createdAt FROM intent_residuals
           WHERE status = 'active' ORDER BY updatedAt DESC LIMIT 20`,
        )
        .all() as any[];
      const activeIntents = activeIntentRows.map((r) => r.intent);

      // --- Most recent founder packet ---
      let currentPacketState = "No packets generated.";
      try {
        const latestPacket = db
          .prepare(
            `SELECT entityId, packetType, createdAt, exportedAt
             FROM founder_packets ORDER BY createdAt DESC LIMIT 1`,
          )
          .get() as any;
        if (latestPacket) {
          const ageMs = Date.now() - new Date(latestPacket.createdAt).getTime();
          const ageHours = Math.round(ageMs / 3600000);
          const ageLabel =
            ageHours < 1
              ? "just now"
              : ageHours === 1
                ? "1 hour ago"
                : `${ageHours} hours ago`;
          const exportStatus = latestPacket.exportedAt
            ? "exported"
            : "not yet exported";
          currentPacketState = `${latestPacket.packetType} packet for ${latestPacket.entityId} generated ${ageLabel}, ${exportStatus}.`;
        }
      } catch {
        /* founder_packets may not exist */
      }

      // --- Unresolved important changes ---
      const unresolvedRows = db
        .prepare(
          `SELECT changeCategory, impactReason, suggestedAction
           FROM causal_important_changes
           WHERE status NOT IN ('resolved', 'dismissed')
           ORDER BY impactScore DESC, timestampMs DESC LIMIT 10`,
        )
        .all() as any[];
      const unresolvedChanges = unresolvedRows.map(
        (r) =>
          `[${r.changeCategory}] ${r.impactReason.slice(0, 100)}${r.suggestedAction ? ` — action: ${r.suggestedAction.slice(0, 60)}` : ""}`,
      );

      // --- Pending alerts count ---
      let pendingAlerts = 0;
      try {
        const alertCount = db
          .prepare(
            `SELECT COUNT(*) as cnt FROM causal_important_changes
             WHERE status NOT IN ('resolved', 'dismissed')`,
          )
          .get() as any;
        pendingAlerts = alertCount?.cnt ?? 0;
      } catch {
        /* ignore */
      }

      // --- Recommended next action ---
      let recommendedNextAction = "Review active intents and continue work.";
      if (unresolvedChanges.length > 0) {
        const topChange = unresolvedRows[0];
        recommendedNextAction = topChange.suggestedAction
          ? topChange.suggestedAction
          : `Investigate unresolved ${topChange.changeCategory}: ${topChange.impactReason.slice(0, 80)}`;
      } else if (activeIntents.length > 0) {
        recommendedNextAction = `Continue working on: ${activeIntents[0]}`;
      }

      // --- Build injection prompt ---
      const promptParts: string[] = [];
      promptParts.push(
        `[Session Recovery] ${lastSessionSummary}`,
      );
      if (activeIntents.length > 0) {
        promptParts.push(
          `Active intents (${activeIntents.length}): ${activeIntents.slice(0, 5).join("; ")}.`,
        );
      }
      if (currentPacketState !== "No packets generated.") {
        promptParts.push(`Packet state: ${currentPacketState}`);
      }
      if (unresolvedChanges.length > 0) {
        promptParts.push(
          `Unresolved changes (${unresolvedChanges.length}): ${unresolvedChanges.slice(0, 3).join("; ")}.`,
        );
      }
      if (pendingAlerts > 0) {
        promptParts.push(`${pendingAlerts} pending alert(s) — run get_proactive_alerts for details.`);
      }
      promptParts.push(`Recommended next action: ${recommendedNextAction}`);

      let injectionPrompt = promptParts.join(" ");
      const charLimit = maxTokens * 4;
      if (injectionPrompt.length > charLimit) {
        injectionPrompt = injectionPrompt.slice(0, charLimit - 3) + "...";
      }

      // Estimate tokens (rough: 1 token ~ 4 chars)
      const tokenEstimate = Math.ceil(injectionPrompt.length / 4);

      return {
        recoveryContext: {
          lastSessionSummary,
          activeIntents,
          currentPacketState,
          unresolvedChanges,
          pendingAlerts,
          recommendedNextAction,
        },
        tokenEstimate,
        injectionPrompt,
      };
    },
  },

  validateAgentCompatibilityTool,
];
