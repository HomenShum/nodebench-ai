/**
 * Forecasting OS — MCP Tools
 *
 * 9 tools for agent-driven forecast lifecycle:
 * create, update, evidence, resolve, track record, calibration, audit trail.
 *
 * Storage: SQLite (local, mirrors Convex schema for offline use).
 * Convex crons handle LinkedIn integration independently.
 */

import { getDb } from "../db.js";
import type { McpTool } from "../types.js";

// ─── SQLite Schema ──────────────────────────────────────────────────────────

function ensureForecastTables(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS forecasts (
      id TEXT PRIMARY KEY,
      question TEXT NOT NULL,
      forecast_type TEXT NOT NULL DEFAULT 'binary',
      probability REAL,
      confidence_lower REAL,
      confidence_upper REAL,
      base_rate REAL,
      resolution_date TEXT NOT NULL,
      resolution_criteria TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      top_drivers TEXT DEFAULT '[]',
      top_counterarguments TEXT DEFAULT '[]',
      refresh_frequency TEXT DEFAULT 'weekly',
      last_refreshed_at INTEGER,
      update_count INTEGER DEFAULT 0,
      tags TEXT DEFAULT '[]',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS forecast_evidence (
      id TEXT PRIMARY KEY,
      forecast_id TEXT NOT NULL,
      source_url TEXT NOT NULL,
      source_title TEXT NOT NULL,
      source_type TEXT NOT NULL,
      excerpt TEXT NOT NULL,
      signal TEXT NOT NULL,
      impact_on_probability REAL,
      added_at INTEGER NOT NULL,
      FOREIGN KEY (forecast_id) REFERENCES forecasts(id)
    );

    CREATE TABLE IF NOT EXISTS forecast_resolutions (
      id TEXT PRIMARY KEY,
      forecast_id TEXT NOT NULL UNIQUE,
      outcome TEXT NOT NULL,
      brier_score REAL,
      log_score REAL,
      resolution_notes TEXT NOT NULL,
      resolution_source_url TEXT,
      resolved_at INTEGER NOT NULL,
      FOREIGN KEY (forecast_id) REFERENCES forecasts(id)
    );

    CREATE TABLE IF NOT EXISTS forecast_update_history (
      id TEXT PRIMARY KEY,
      forecast_id TEXT NOT NULL,
      previous_probability REAL NOT NULL,
      new_probability REAL NOT NULL,
      reasoning TEXT NOT NULL,
      evidence_ids TEXT DEFAULT '[]',
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (forecast_id) REFERENCES forecasts(id)
    );

    CREATE TABLE IF NOT EXISTS forecast_calibration_log (
      id TEXT PRIMARY KEY,
      window_start TEXT NOT NULL,
      window_end TEXT NOT NULL,
      bins TEXT NOT NULL,
      overall_brier REAL NOT NULL,
      mean_log_score REAL,
      forecast_count INTEGER NOT NULL,
      resolved_count INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);
}

function genId(): string {
  return `fc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Scoring (pure functions, duplicated from Convex for offline use) ───────

function brierScore(p: number, outcome: "yes" | "no"): number {
  const o = outcome === "yes" ? 1 : 0;
  return (p - o) ** 2;
}

function logScoreFn(p: number, outcome: "yes" | "no"): number {
  const clamped = Math.max(0.001, Math.min(0.999, p));
  return outcome === "yes" ? -Math.log(clamped) : -Math.log(1 - clamped);
}

// ─── Tools ──────────────────────────────────────────────────────────────────

export const forecastingTools: McpTool[] = [
  // 1. create_forecast
  {
    name: "create_forecast",
    description:
      "Create a new forecast with a question, resolution date, and criteria. Optionally set initial probability, base rate, and evidence. Returns forecast ID for subsequent updates.",
    inputSchema: {
      type: "object" as const,
      properties: {
        question: {
          type: "string",
          description: 'The forecast question, e.g. "Will X happen by date D?"',
        },
        forecastType: {
          type: "string",
          enum: ["binary", "numeric", "categorical"],
          description: "Forecast type (default: binary)",
        },
        resolutionDate: {
          type: "string",
          description: "ISO date (YYYY-MM-DD) when the forecast should be resolved",
        },
        resolutionCriteria: {
          type: "string",
          description: "Objective criteria for resolving the forecast",
        },
        probability: {
          type: "number",
          description: "Initial probability estimate (0-1)",
        },
        baseRate: {
          type: "number",
          description: "Historical base rate for this type of event (0-1)",
        },
        refreshFrequency: {
          type: "string",
          enum: ["daily", "weekly", "on_trigger"],
          description: "How often to auto-refresh (default: weekly)",
        },
        topDrivers: {
          type: "array",
          items: { type: "string" },
          description: "Top 1-3 reasons supporting the forecast",
        },
        topCounterarguments: {
          type: "array",
          items: { type: "string" },
          description: "Top 1-3 disconfirming signals",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Category tags (e.g. ai_tech, econ, company, geo)",
        },
      },
      required: ["question", "resolutionDate", "resolutionCriteria"],
    },
    handler: async (args: Record<string, unknown>) => {
      ensureForecastTables();
      const db = getDb();
      const id = genId();
      const now = Date.now();
      const p = args.probability as number | undefined;

      if (p != null && (p < 0 || p > 1)) {
        return [{ type: "text" as const, text: JSON.stringify({ error: "Probability must be between 0 and 1" }) }];
      }

      db.prepare(`
        INSERT INTO forecasts (id, question, forecast_type, probability, base_rate,
          resolution_date, resolution_criteria, status, top_drivers, top_counterarguments,
          refresh_frequency, update_count, tags, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, 0, ?, ?, ?)
      `).run(
        id,
        args.question as string,
        (args.forecastType as string) || "binary",
        p ?? null,
        (args.baseRate as number) ?? null,
        args.resolutionDate as string,
        args.resolutionCriteria as string,
        JSON.stringify((args.topDrivers as string[]) || []),
        JSON.stringify((args.topCounterarguments as string[]) || []),
        (args.refreshFrequency as string) || "weekly",
        JSON.stringify((args.tags as string[]) || []),
        now,
        now
      );

      return [{
        type: "text" as const,
        text: JSON.stringify({
          forecastId: id,
          question: args.question,
          status: "active",
          probability: p ?? null,
          resolutionDate: args.resolutionDate,
        }),
      }];
    },
  },

  // 2. update_forecast_probability
  {
    name: "update_forecast_probability",
    description:
      "Update a forecast's probability with reasoning. Records the change in update history for audit trail and forecast diffs.",
    inputSchema: {
      type: "object" as const,
      properties: {
        forecastId: { type: "string", description: "Forecast ID" },
        probability: { type: "number", description: "New probability (0-1)" },
        topDrivers: {
          type: "array",
          items: { type: "string" },
          description: "Updated top drivers (max 3)",
        },
        topCounterarguments: {
          type: "array",
          items: { type: "string" },
          description: "Updated counterarguments (max 3)",
        },
        reasoning: {
          type: "string",
          description: "Why the probability changed (1-2 sentences)",
        },
      },
      required: ["forecastId", "probability", "reasoning"],
    },
    handler: async (args: Record<string, unknown>) => {
      ensureForecastTables();
      const db = getDb();
      const fId = args.forecastId as string;
      const newP = args.probability as number;

      if (newP < 0 || newP > 1) {
        return [{ type: "text" as const, text: JSON.stringify({ error: "Probability must be between 0 and 1" }) }];
      }

      const forecast = db.prepare("SELECT * FROM forecasts WHERE id = ?").get(fId) as Record<string, unknown> | undefined;
      if (!forecast) {
        return [{ type: "text" as const, text: JSON.stringify({ error: `Forecast ${fId} not found` }) }];
      }
      if (forecast.status !== "active") {
        return [{ type: "text" as const, text: JSON.stringify({ error: `Cannot update ${forecast.status} forecast` }) }];
      }

      const prevP = (forecast.probability as number) ?? 0.5;
      const now = Date.now();

      // Record history
      db.prepare(`
        INSERT INTO forecast_update_history (id, forecast_id, previous_probability, new_probability, reasoning, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(genId(), fId, prevP, newP, args.reasoning as string, now);

      // Update forecast
      const drivers = args.topDrivers ? JSON.stringify(args.topDrivers) : forecast.top_drivers;
      const counters = args.topCounterarguments ? JSON.stringify(args.topCounterarguments) : forecast.top_counterarguments;
      db.prepare(`
        UPDATE forecasts SET probability = ?, top_drivers = ?, top_counterarguments = ?,
          update_count = update_count + 1, last_refreshed_at = ?, updated_at = ?
        WHERE id = ?
      `).run(newP, drivers, counters, now, now, fId);

      const deltaPct = ((newP - prevP) * 100).toFixed(0);
      const dir = newP >= prevP ? "+" : "";

      return [{
        type: "text" as const,
        text: JSON.stringify({
          forecastId: fId,
          previousProbability: prevP,
          newProbability: newP,
          diff: `${(prevP * 100).toFixed(0)}% → ${(newP * 100).toFixed(0)}% (${dir}${deltaPct}pp)`,
          reasoning: args.reasoning,
        }),
      }];
    },
  },

  // 3. add_forecast_evidence
  {
    name: "add_forecast_evidence",
    description:
      "Add evidence to a forecast's ledger. Each entry includes source URL, excerpt, and directional signal (supporting/disconfirming/neutral). Deduplicates by source URL.",
    inputSchema: {
      type: "object" as const,
      properties: {
        forecastId: { type: "string", description: "Forecast ID" },
        sourceUrl: { type: "string", description: "URL of the evidence source" },
        sourceTitle: { type: "string", description: "Title of the source" },
        sourceType: {
          type: "string",
          enum: ["news", "filing", "macro_data", "poll", "market_signal", "manual"],
          description: "Type of source",
        },
        excerpt: {
          type: "string",
          description: "Grounded snippet from the source (max 500 chars)",
        },
        signal: {
          type: "string",
          enum: ["supporting", "disconfirming", "neutral"],
          description: "Direction of evidence relative to the forecast",
        },
        impactOnProbability: {
          type: "number",
          description: "Estimated impact on probability (e.g. +0.05)",
        },
      },
      required: ["forecastId", "sourceUrl", "sourceTitle", "sourceType", "excerpt", "signal"],
    },
    handler: async (args: Record<string, unknown>) => {
      ensureForecastTables();
      const db = getDb();

      // Dedup check
      const existing = db.prepare(
        "SELECT id FROM forecast_evidence WHERE forecast_id = ? AND source_url = ?"
      ).get(args.forecastId as string, args.sourceUrl as string);
      if (existing) {
        return [{ type: "text" as const, text: JSON.stringify({ error: "Evidence from this URL already exists for this forecast" }) }];
      }

      const id = genId();
      db.prepare(`
        INSERT INTO forecast_evidence (id, forecast_id, source_url, source_title, source_type, excerpt, signal, impact_on_probability, added_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        args.forecastId as string,
        args.sourceUrl as string,
        args.sourceTitle as string,
        args.sourceType as string,
        (args.excerpt as string).slice(0, 500),
        args.signal as string,
        (args.impactOnProbability as number) ?? null,
        Date.now()
      );

      return [{ type: "text" as const, text: JSON.stringify({ evidenceId: id, forecastId: args.forecastId, signal: args.signal }) }];
    },
  },

  // 4. get_forecast_evidence
  {
    name: "get_forecast_evidence",
    description:
      "Query evidence ledger for a forecast. Optionally filter by signal direction (supporting/disconfirming/neutral).",
    inputSchema: {
      type: "object" as const,
      properties: {
        forecastId: { type: "string", description: "Forecast ID" },
        signal: {
          type: "string",
          enum: ["supporting", "disconfirming", "neutral"],
          description: "Filter by signal direction",
        },
        limit: { type: "number", description: "Max results (default 20)" },
      },
      required: ["forecastId"],
    },
    handler: async (args: Record<string, unknown>) => {
      ensureForecastTables();
      const db = getDb();
      const limit = (args.limit as number) || 20;
      const signal = args.signal as string | undefined;

      let sql = "SELECT * FROM forecast_evidence WHERE forecast_id = ?";
      const params: unknown[] = [args.forecastId as string];
      if (signal) {
        sql += " AND signal = ?";
        params.push(signal);
      }
      sql += " ORDER BY added_at DESC LIMIT ?";
      params.push(limit);

      const evidence = db.prepare(sql).all(...params);
      return [{ type: "text" as const, text: JSON.stringify({ evidence, count: evidence.length }) }];
    },
  },

  // 5. resolve_forecast
  {
    name: "resolve_forecast",
    description:
      "Resolve a forecast with an outcome. Auto-computes Brier and log scores for binary forecasts. Ambiguous outcomes are excluded from scoring.",
    inputSchema: {
      type: "object" as const,
      properties: {
        forecastId: { type: "string", description: "Forecast ID" },
        outcome: {
          type: "string",
          enum: ["yes", "no", "ambiguous"],
          description: "Resolution outcome",
        },
        resolutionNotes: {
          type: "string",
          description: "Justification for the resolution",
        },
        resolutionSourceUrl: {
          type: "string",
          description: "URL to resolution source (optional)",
        },
      },
      required: ["forecastId", "outcome", "resolutionNotes"],
    },
    handler: async (args: Record<string, unknown>) => {
      ensureForecastTables();
      const db = getDb();
      const fId = args.forecastId as string;
      const outcome = args.outcome as "yes" | "no" | "ambiguous";

      const forecast = db.prepare("SELECT * FROM forecasts WHERE id = ?").get(fId) as Record<string, unknown> | undefined;
      if (!forecast) {
        return [{ type: "text" as const, text: JSON.stringify({ error: `Forecast ${fId} not found` }) }];
      }
      if (forecast.status === "resolved") {
        return [{ type: "text" as const, text: JSON.stringify({ error: "Forecast already resolved" }) }];
      }

      let brier: number | null = null;
      let log: number | null = null;
      if (forecast.forecast_type === "binary" && forecast.probability != null && outcome !== "ambiguous") {
        brier = brierScore(forecast.probability as number, outcome);
        log = logScoreFn(forecast.probability as number, outcome);
      }

      const id = genId();
      const now = Date.now();

      db.prepare(`
        INSERT INTO forecast_resolutions (id, forecast_id, outcome, brier_score, log_score, resolution_notes, resolution_source_url, resolved_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, fId, outcome, brier, log, args.resolutionNotes as string, (args.resolutionSourceUrl as string) ?? null, now);

      db.prepare("UPDATE forecasts SET status = 'resolved', updated_at = ? WHERE id = ?").run(now, fId);

      return [{
        type: "text" as const,
        text: JSON.stringify({
          resolutionId: id,
          forecastId: fId,
          outcome,
          brierScore: brier,
          logScore: log,
          status: "resolved",
        }),
      }];
    },
  },

  // 6. get_forecast_track_record
  {
    name: "get_forecast_track_record",
    description:
      "Get aggregate Brier scores, calibration summary, and track record statistics across all resolved forecasts.",
    inputSchema: {
      type: "object" as const,
      properties: {
        startDate: { type: "string", description: "Filter resolutions after this ISO date" },
        endDate: { type: "string", description: "Filter resolutions before this ISO date" },
      },
      required: [],
    },
    handler: async (args: Record<string, unknown>) => {
      ensureForecastTables();
      const db = getDb();

      let sql = "SELECT * FROM forecast_resolutions WHERE 1=1";
      const params: unknown[] = [];

      if (args.startDate) {
        sql += " AND resolved_at >= ?";
        params.push(new Date(args.startDate as string).getTime());
      }
      if (args.endDate) {
        sql += " AND resolved_at <= ?";
        params.push(new Date(args.endDate as string).getTime());
      }

      const resolutions = db.prepare(sql).all(...params) as Array<Record<string, unknown>>;
      const scored = resolutions.filter((r) => r.brier_score != null && r.outcome !== "ambiguous");

      if (scored.length === 0) {
        return [{
          type: "text" as const,
          text: JSON.stringify({
            totalResolved: resolutions.length,
            scoredCount: 0,
            overallBrier: null,
            meanLogScore: null,
            message: "No scoreable resolutions yet",
          }),
        }];
      }

      const totalBrier = scored.reduce((s, r) => s + (r.brier_score as number), 0);
      const totalLog = scored.reduce((s, r) => s + (r.log_score as number), 0);

      return [{
        type: "text" as const,
        text: JSON.stringify({
          totalResolved: resolutions.length,
          scoredCount: scored.length,
          overallBrier: totalBrier / scored.length,
          meanLogScore: totalLog / scored.length,
          interpretation: totalBrier / scored.length < 0.25
            ? "Better than random — well calibrated"
            : totalBrier / scored.length < 0.5
            ? "Moderate calibration — room to improve"
            : "Poor calibration — review methodology",
        }),
      }];
    },
  },

  // 7. get_active_forecasts
  {
    name: "get_active_forecasts",
    description:
      "List active forecasts. Optionally filter by those needing refresh (based on last refresh time and frequency).",
    inputSchema: {
      type: "object" as const,
      properties: {
        limit: { type: "number", description: "Max results (default 20)" },
        needsRefresh: { type: "boolean", description: "Only show forecasts due for refresh" },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Filter by tags",
        },
      },
      required: [],
    },
    handler: async (args: Record<string, unknown>) => {
      ensureForecastTables();
      const db = getDb();
      const limit = (args.limit as number) || 20;

      let forecasts = db.prepare(
        "SELECT * FROM forecasts WHERE status = 'active' ORDER BY updated_at DESC LIMIT ?"
      ).all(limit) as Array<Record<string, unknown>>;

      // Parse JSON fields
      forecasts = forecasts.map((f) => ({
        ...f,
        top_drivers: JSON.parse((f.top_drivers as string) || "[]"),
        top_counterarguments: JSON.parse((f.top_counterarguments as string) || "[]"),
        tags: JSON.parse((f.tags as string) || "[]"),
      }));

      // Filter by tags
      if (args.tags && (args.tags as string[]).length > 0) {
        const filterTags = new Set(args.tags as string[]);
        forecasts = forecasts.filter((f) =>
          (f.tags as string[]).some((t) => filterTags.has(t))
        );
      }

      // Filter by needs refresh
      if (args.needsRefresh) {
        const now = Date.now();
        const DAY = 86_400_000;
        const WEEK = 7 * DAY;
        forecasts = forecasts.filter((f) => {
          const last = (f.last_refreshed_at as number) || 0;
          const freq = f.refresh_frequency as string;
          if (freq === "daily") return now - last > DAY * 0.8;
          if (freq === "weekly") return now - last > WEEK * 0.8;
          return false; // on_trigger not auto-refreshed
        });
      }

      return [{ type: "text" as const, text: JSON.stringify({ forecasts, count: forecasts.length }) }];
    },
  },

  // 8. compute_calibration
  {
    name: "compute_calibration",
    description:
      "Compute calibration bins and Brier aggregates across all resolved forecasts. Returns 10 bins (0-10%, 10-20%, ..., 90-100%) with predicted vs observed frequency.",
    inputSchema: {
      type: "object" as const,
      properties: {
        startDate: { type: "string", description: "Window start (ISO date)" },
        endDate: { type: "string", description: "Window end (ISO date)" },
      },
      required: [],
    },
    handler: async (args: Record<string, unknown>) => {
      ensureForecastTables();
      const db = getDb();

      // Get resolved forecasts with probabilities
      const sql = `
        SELECT f.probability, r.outcome
        FROM forecasts f
        JOIN forecast_resolutions r ON f.id = r.forecast_id
        WHERE f.forecast_type = 'binary'
          AND f.probability IS NOT NULL
          AND r.outcome != 'ambiguous'
      `;
      const pairs = db.prepare(sql).all() as Array<{ probability: number; outcome: string }>;

      if (pairs.length === 0) {
        return [{
          type: "text" as const,
          text: JSON.stringify({ error: "No resolved binary forecasts with probabilities" }),
        }];
      }

      // Compute 10 calibration bins
      const bins = [];
      for (let i = 0; i < 10; i++) {
        const lower = i * 0.1;
        const upper = (i + 1) * 0.1;
        const inBin = pairs.filter((p) => {
          if (i === 9) return p.probability >= lower && p.probability <= upper;
          return p.probability >= lower && p.probability < upper;
        });
        const yesCount = inBin.filter((p) => p.outcome === "yes").length;
        bins.push({
          binLabel: `${i * 10}-${(i + 1) * 10}%`,
          predictedProb: (lower + upper) / 2,
          observedFreq: inBin.length > 0 ? yesCount / inBin.length : 0,
          count: inBin.length,
        });
      }

      // Overall Brier
      const totalBrier = pairs.reduce((s, p) => {
        const o = p.outcome === "yes" ? 1 : 0;
        return s + (p.probability - o) ** 2;
      }, 0);

      const result = {
        bins,
        overallBrier: totalBrier / pairs.length,
        forecastCount: pairs.length,
        windowStart: args.startDate ?? "all_time",
        windowEnd: args.endDate ?? "now",
      };

      // Store in calibration log
      const id = genId();
      db.prepare(`
        INSERT INTO forecast_calibration_log (id, window_start, window_end, bins, overall_brier, forecast_count, resolved_count, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        result.windowStart,
        result.windowEnd,
        JSON.stringify(bins),
        result.overallBrier,
        pairs.length,
        pairs.length,
        Date.now()
      );

      return [{ type: "text" as const, text: JSON.stringify(result) }];
    },
  },

  // 9. get_forecast_chain
  {
    name: "get_forecast_chain",
    description:
      "Get full audit trail for a forecast: the forecast itself, all evidence entries, update history, and resolution (if resolved). Complete chain of custody.",
    inputSchema: {
      type: "object" as const,
      properties: {
        forecastId: { type: "string", description: "Forecast ID" },
      },
      required: ["forecastId"],
    },
    handler: async (args: Record<string, unknown>) => {
      ensureForecastTables();
      const db = getDb();
      const fId = args.forecastId as string;

      const forecast = db.prepare("SELECT * FROM forecasts WHERE id = ?").get(fId) as Record<string, unknown> | undefined;
      if (!forecast) {
        return [{ type: "text" as const, text: JSON.stringify({ error: `Forecast ${fId} not found` }) }];
      }

      // Parse JSON fields
      forecast.top_drivers = JSON.parse((forecast.top_drivers as string) || "[]");
      forecast.top_counterarguments = JSON.parse((forecast.top_counterarguments as string) || "[]");
      forecast.tags = JSON.parse((forecast.tags as string) || "[]");

      const evidence = db.prepare(
        "SELECT * FROM forecast_evidence WHERE forecast_id = ? ORDER BY added_at DESC"
      ).all(fId);

      const updates = db.prepare(
        "SELECT * FROM forecast_update_history WHERE forecast_id = ? ORDER BY updated_at DESC"
      ).all(fId);

      const resolution = db.prepare(
        "SELECT * FROM forecast_resolutions WHERE forecast_id = ?"
      ).get(fId);

      return [{
        type: "text" as const,
        text: JSON.stringify({
          forecast,
          evidence,
          updateHistory: updates,
          resolution: resolution || null,
          summary: {
            evidenceCount: evidence.length,
            updateCount: updates.length,
            isResolved: !!resolution,
          },
        }),
      }];
    },
  },
];
