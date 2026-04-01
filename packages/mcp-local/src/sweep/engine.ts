/**
 * Sweep Engine — runs all data source collectors in parallel,
 * computes deltas, and produces the top signal for auto-fire.
 *
 * Pattern: Crucix's briefing.mjs master orchestrator
 * Architecture: DeerFlow's sub-agent parallel dispatch
 *
 * Each source is a self-contained module that exports collect().
 * The engine runs them all with timeouts, collects signals,
 * computes what changed since last sweep, and identifies the
 * top entity for the landing page.
 */

import { getDb, genId } from "../db.js";
import type { SweepSignal, SweepResult, DeltaResult, SourceCollector } from "./types.js";

// ── Source registry ──────────────────────────────────────────────────

interface SourceModule {
  name: string;
  collect: SourceCollector;
}

const SOURCE_MODULES: SourceModule[] = [];

export function registerSource(name: string, collect: SourceCollector): void {
  SOURCE_MODULES.push({ name, collect });
}

// ── Sweep execution ──────────────────────────────────────────────────

export async function runSweep(): Promise<SweepResult> {
  const sweepId = genId("sweep");
  const startMs = Date.now();
  const sourceResults: SweepResult["sources"] = [];
  const allSignals: SweepSignal[] = [];

  // Load sources dynamically (lazy import to avoid bundling issues)
  if (SOURCE_MODULES.length === 0) {
    try {
      const hn = await import("./sources/hackernews.js");
      registerSource("hackernews", hn.collect);
    } catch { /* source unavailable */ }
    try {
      const gh = await import("./sources/github_trending.js");
      registerSource("github_trending", gh.collect);
    } catch { /* source unavailable */ }
    try {
      const yf = await import("./sources/yahoo_finance.js");
      registerSource("yahoo_finance", yf.collect);
    } catch { /* source unavailable */ }
    try {
      const ph = await import("./sources/producthunt.js");
      registerSource("producthunt", ph.collect);
    } catch { /* source unavailable */ }
  }

  // Run all sources in parallel with per-source timeouts (Crucix pattern)
  const results = await Promise.all(
    SOURCE_MODULES.map(async (source) => {
      const sourceStart = Date.now();
      try {
        const signals = await Promise.race([
          source.collect(),
          new Promise<SweepSignal[]>((_, reject) =>
            setTimeout(() => reject(new Error("timeout")), 10000)
          ),
        ]);
        return {
          name: source.name,
          status: "ok" as const,
          count: signals.length,
          durationMs: Date.now() - sourceStart,
          signals,
        };
      } catch {
        return {
          name: source.name,
          status: "error" as const,
          count: 0,
          durationMs: Date.now() - sourceStart,
          signals: [] as SweepSignal[],
        };
      }
    })
  );

  for (const r of results) {
    sourceResults.push({ name: r.name, status: r.status, count: r.count, durationMs: r.durationMs });
    allSignals.push(...r.signals);
  }

  // Sort by score descending
  allSignals.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  const result: SweepResult = {
    signals: allSignals,
    sources: sourceResults,
    totalDurationMs: Date.now() - startMs,
    sweepId,
    timestamp: new Date().toISOString(),
  };

  // Persist sweep result
  persistSweep(result);

  return result;
}

// ── Delta engine (Crucix delta/engine.mjs pattern) ───────────────────

export function computeDelta(current: SweepResult, previous: SweepResult | null): DeltaResult {
  const prevIds = new Set((previous?.signals ?? []).map(s => s.id));
  const prevSeverities = new Map((previous?.signals ?? []).map(s => [s.id, s.severity]));

  const newSignals = current.signals.filter(s => !prevIds.has(s.id));

  const escalations: DeltaResult["escalations"] = [];
  const deescalations: DeltaResult["deescalations"] = [];

  for (const sig of current.signals) {
    const prevSev = prevSeverities.get(sig.id);
    if (!prevSev) continue;
    const sevOrder = { flash: 3, priority: 2, routine: 1 };
    if (sevOrder[sig.severity] > sevOrder[prevSev]) {
      escalations.push({ signal: sig, from: prevSev, to: sig.severity });
    } else if (sevOrder[sig.severity] < sevOrder[prevSev]) {
      deescalations.push({ signal: sig, from: prevSev, to: sig.severity });
    }
  }

  // Top entity = highest-scored new signal, or highest-scored escalation
  const topCandidates = [
    ...newSignals.filter(s => s.severity === "flash"),
    ...escalations.map(e => e.signal),
    ...newSignals.filter(s => s.severity === "priority"),
    ...newSignals,
  ];

  const topSignal = topCandidates[0] ?? current.signals[0] ?? null;

  return {
    newSignals,
    escalations,
    deescalations,
    topEntity: topSignal?.entity ?? null,
    topEntityQuery: topSignal
      ? `${topSignal.headline} — what does this mean for founders?`
      : null,
    topEntitySeverity: topSignal?.severity ?? null,
    sweepId: current.sweepId,
    previousSweepId: previous?.sweepId ?? null,
  };
}

// ── Persistence ──────────────────────────────────────────────────────

export function initSweepTables(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS sweep_results (
      id TEXT PRIMARY KEY,
      signals TEXT NOT NULL DEFAULT '[]',
      sources TEXT NOT NULL DEFAULT '[]',
      total_duration_ms INTEGER DEFAULT 0,
      signal_count INTEGER DEFAULT 0,
      top_entity TEXT,
      top_entity_query TEXT,
      new_signal_count INTEGER DEFAULT 0,
      escalation_count INTEGER DEFAULT 0,
      timestamp TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sr_ts ON sweep_results(timestamp);
  `);
}

function persistSweep(result: SweepResult): void {
  try {
    const db = getDb();
    db.prepare(`
      INSERT OR REPLACE INTO sweep_results (id, signals, sources, total_duration_ms, signal_count, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      result.sweepId,
      JSON.stringify(result.signals.slice(0, 50)),
      JSON.stringify(result.sources),
      result.totalDurationMs,
      result.signals.length,
      result.timestamp,
    );
  } catch { /* persistence is non-blocking */ }
}

export function getLatestSweep(): SweepResult | null {
  try {
    const db = getDb();
    const row = db.prepare(`SELECT * FROM sweep_results ORDER BY timestamp DESC LIMIT 1`).get() as any;
    if (!row) return null;
    return {
      signals: JSON.parse(row.signals ?? "[]"),
      sources: JSON.parse(row.sources ?? "[]"),
      totalDurationMs: row.total_duration_ms,
      sweepId: row.id,
      timestamp: row.timestamp,
    };
  } catch { return null; }
}

export function getPreviousSweep(): SweepResult | null {
  try {
    const db = getDb();
    const row = db.prepare(`SELECT * FROM sweep_results ORDER BY timestamp DESC LIMIT 1 OFFSET 1`).get() as any;
    if (!row) return null;
    return {
      signals: JSON.parse(row.signals ?? "[]"),
      sources: JSON.parse(row.sources ?? "[]"),
      totalDurationMs: row.total_duration_ms,
      sweepId: row.id,
      timestamp: row.timestamp,
    };
  } catch { return null; }
}

// ── Recommendation engine ────────────────────────────────────────────
// Turn signals into founder-specific actionable recommendations

export interface Recommendation {
  signal: SweepSignal;
  action: string;
  reasoning: string;
  urgency: "act_now" | "this_week" | "monitor";
  category: "competitive" | "opportunity" | "risk" | "market";
}

export function generateRecommendations(signals: SweepSignal[]): Recommendation[] {
  const recs: Recommendation[] = [];

  for (const sig of signals.slice(0, 10)) {
    let action = "";
    let reasoning = "";
    let urgency: Recommendation["urgency"] = "monitor";
    let category: Recommendation["category"] = "market";

    if (sig.category === "funding") {
      action = `Research ${sig.entity}'s funding round. Evaluate if this changes your competitive landscape.`;
      reasoning = "Funding signals shift market dynamics. A well-funded competitor can accelerate faster.";
      urgency = "this_week";
      category = "competitive";
    } else if (sig.category === "launch") {
      action = `Evaluate ${sig.entity}. Is this a competitor, partner opportunity, or irrelevant?`;
      reasoning = "New launches in your space can validate or threaten your wedge.";
      urgency = sig.severity === "flash" ? "act_now" : "this_week";
      category = "opportunity";
    } else if (sig.category === "market" && sig.severity === "flash") {
      action = `Check your exposure to ${sig.entity}. Review your portfolio and customer base.`;
      reasoning = "Major market moves can affect your runway, fundraising, and customer behavior.";
      urgency = "act_now";
      category = "risk";
    } else if (sig.category === "trend") {
      action = `Assess if the ${sig.entity} trend affects your product roadmap or positioning.`;
      reasoning = "Trending topics signal where developer and investor attention is shifting.";
      urgency = "this_week";
      category = "opportunity";
    } else {
      action = `Note: ${sig.headline}`;
      reasoning = "Signal detected but no immediate action required.";
      urgency = "monitor";
      category = "market";
    }

    recs.push({ signal: sig, action, reasoning, urgency, category });
  }

  // Sort: act_now first, then this_week, then monitor
  const urgencyOrder = { act_now: 0, this_week: 1, monitor: 2 };
  recs.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

  return recs;
}
