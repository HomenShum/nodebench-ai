/**
 * Engine Context Bridge
 *
 * Connects the engine's ephemeral sessions to SQLite persistent storage.
 * Loads accumulated context before workflow execution and persists outcomes after.
 */

import { getDb, genId } from "../db.js";
import type { ConformanceReport } from "./conformance.js";
import type { ToolCallRecord } from "./session.js";

// ── Types ─────────────────────────────────────────────────────────────

export interface SessionContext {
  recentRuns: Array<{
    workflow: string;
    score: number;
    grade: string;
    durationMs: number;
    createdAt: string;
  }>;
  relevantLearnings: Array<{
    key: string;
    content: string;
    category: string;
  }>;
  conformanceTrend: {
    direction: "improving" | "stable" | "regressing" | "insufficient_data";
    avgScore: number;
    runCount: number;
  };
  recentContentThemes: string[];
  openGapCount: number;
}

export interface ContextHealth {
  learningsCount: number;
  recentRunScores: number[];
  trendDirection: string;
  contentArchiveSize: number;
  daysSinceLastLearning: number | null;
  workflowCoverage: Record<string, number>;
}

// ── Load Context ──────────────────────────────────────────────────────

export function loadSessionContext(workflow: string, _preset: string): SessionContext {
  const db = getDb();

  // Recent runs of the same workflow
  let recentRuns: SessionContext["recentRuns"] = [];
  try {
    const rows = db.prepare(`
      SELECT workflow, score, grade, duration_ms, created_at
      FROM engine_workflow_runs
      WHERE workflow = ?
      ORDER BY created_at DESC
      LIMIT 5
    `).all(workflow) as any[];
    recentRuns = rows.map((r) => ({
      workflow: r.workflow,
      score: r.score ?? 0,
      grade: r.grade ?? "F",
      durationMs: r.duration_ms,
      createdAt: r.created_at,
    }));
  } catch { /* table may not exist yet */ }

  // Enrich with scores from engine_reports if workflow_runs doesn't have them
  if (recentRuns.length > 0 && recentRuns[0].score === 0) {
    try {
      for (const run of recentRuns) {
        const report = db.prepare(`
          SELECT score, grade FROM engine_reports
          WHERE session_id = (
            SELECT session_id FROM engine_workflow_runs
            WHERE workflow = ? AND created_at = ?
            LIMIT 1
          )
          ORDER BY generated_at DESC LIMIT 1
        `).get(run.workflow, run.createdAt) as any;
        if (report) {
          run.score = report.score;
          run.grade = report.grade;
        }
      }
    } catch { /* best effort */ }
  }

  // Relevant learnings via FTS5
  let relevantLearnings: SessionContext["relevantLearnings"] = [];
  try {
    const searchTerms = workflow.replace(/_/g, " ");
    const rows = db.prepare(`
      SELECT l.key, l.content, l.category
      FROM learnings_fts fts
      JOIN learnings l ON l.id = fts.rowid
      WHERE learnings_fts MATCH ?
      ORDER BY rank
      LIMIT 10
    `).all(searchTerms) as any[];
    relevantLearnings = rows.map((r) => ({
      key: r.key,
      content: r.content,
      category: r.category,
    }));
  } catch {
    // FTS5 syntax error or table missing — try LIKE fallback
    try {
      const pattern = `%${workflow.replace(/_/g, "%")}%`;
      const rows = db.prepare(`
        SELECT key, content, category FROM learnings
        WHERE content LIKE ? OR key LIKE ? OR category LIKE ?
        ORDER BY created_at DESC LIMIT 10
      `).all(pattern, pattern, pattern) as any[];
      relevantLearnings = rows.map((r) => ({
        key: r.key,
        content: r.content,
        category: r.category,
      }));
    } catch { /* no learnings available */ }
  }

  // Conformance trend from engine_reports
  let conformanceTrend: SessionContext["conformanceTrend"] = {
    direction: "insufficient_data",
    avgScore: 0,
    runCount: 0,
  };
  try {
    const rows = db.prepare(`
      SELECT score FROM engine_reports
      WHERE workflow = ?
      ORDER BY generated_at DESC
      LIMIT 10
    `).all(workflow) as any[];

    if (rows.length >= 3) {
      const scores = rows.map((r) => r.score);
      const avgScore = scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
      const recentHalf = scores.slice(0, Math.ceil(scores.length / 2));
      const olderHalf = scores.slice(Math.ceil(scores.length / 2));
      const recentAvg = recentHalf.reduce((a: number, b: number) => a + b, 0) / recentHalf.length;
      const olderAvg = olderHalf.reduce((a: number, b: number) => a + b, 0) / olderHalf.length;
      const delta = recentAvg - olderAvg;

      conformanceTrend = {
        direction: delta > 5 ? "improving" : delta < -5 ? "regressing" : "stable",
        avgScore: Math.round(avgScore * 10) / 10,
        runCount: rows.length,
      };
    } else if (rows.length > 0) {
      const avgScore = rows.reduce((a: number, r: any) => a + r.score, 0) / rows.length;
      conformanceTrend = {
        direction: "insufficient_data",
        avgScore: Math.round(avgScore * 10) / 10,
        runCount: rows.length,
      };
    }
  } catch { /* no reports yet */ }

  // Recent content themes
  let recentContentThemes: string[] = [];
  try {
    const rows = db.prepare(`
      SELECT themes FROM content_archive
      ORDER BY published_at DESC
      LIMIT 20
    `).all() as any[];
    const themeSet = new Set<string>();
    for (const row of rows) {
      if (row.themes) {
        try {
          const parsed = JSON.parse(row.themes);
          if (Array.isArray(parsed)) parsed.forEach((t: string) => themeSet.add(t));
        } catch { /* skip malformed */ }
      }
    }
    recentContentThemes = Array.from(themeSet).slice(0, 30);
  } catch { /* no content archive */ }

  // Open gap count
  let openGapCount = 0;
  try {
    const row = db.prepare(`SELECT COUNT(*) as c FROM gaps WHERE status = 'open'`).get() as any;
    openGapCount = row.c;
  } catch { /* no gaps table */ }

  return { recentRuns, relevantLearnings, conformanceTrend, recentContentThemes, openGapCount };
}

// ── Persist Outcome ───────────────────────────────────────────────────

export function persistSessionOutcome(
  sessionId: string,
  report: ConformanceReport,
  workflow: string,
  preset: string,
  callHistory?: ToolCallRecord[],
): void {
  const db = getDb();

  // Persist conformance report
  try {
    db.prepare(`
      INSERT INTO engine_reports (id, session_id, workflow, preset, score, grade, breakdown, summary, total_steps, successful_steps, failed_steps, total_duration_ms, generated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      genId("rpt"),
      sessionId,
      workflow,
      preset,
      report.score,
      report.grade,
      JSON.stringify(report.breakdown),
      report.summary,
      report.totalSteps,
      report.successfulSteps,
      report.failedSteps,
      report.totalDurationMs,
    );
  } catch { /* best effort */ }

  // Persist workflow run
  try {
    db.prepare(`
      INSERT INTO engine_workflow_runs (id, session_id, workflow, preset, step_count, success_count, failed_count, duration_ms, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      genId("run"),
      sessionId,
      workflow,
      preset,
      report.totalSteps,
      report.successfulSteps,
      report.failedSteps,
      report.totalDurationMs,
    );
  } catch { /* best effort */ }

  // Auto-extract learnings from error→success recovery patterns
  if (callHistory) {
    autoExtractLearnings(db, sessionId, callHistory);
  }
}

function autoExtractLearnings(
  db: ReturnType<typeof getDb>,
  sessionId: string,
  callHistory: ToolCallRecord[],
): void {
  const errors = callHistory.filter((r) => r.status === "error");
  for (const err of errors) {
    const laterSuccess = callHistory.find(
      (r) => r.toolName === err.toolName && r.status === "success" && r.timestamp > err.timestamp,
    );
    if (laterSuccess) {
      try {
        const key = `auto:${err.toolName}:${sessionId.slice(-8)}`;
        const errMsg = typeof err.result === "object" && err.result !== null
          ? (err.result as any).error ?? JSON.stringify(err.result)
          : String(err.result);
        db.prepare(`
          INSERT OR IGNORE INTO learnings (id, key, content, category, tags, created_at, updated_at)
          VALUES (?, ?, ?, 'gotcha', ?, datetime('now'), datetime('now'))
        `).run(
          genId("lrn"),
          key,
          `Tool "${err.toolName}" failed then succeeded. Error: ${String(errMsg).slice(0, 200)}`,
          JSON.stringify([err.toolName, "auto-extracted"]),
        );
      } catch { /* best-effort, duplicate keys silently ignored */ }
    }
  }
}

// ── Context Health ────────────────────────────────────────────────────

export function getContextHealth(): ContextHealth {
  const db = getDb();

  let learningsCount = 0;
  try {
    const row = db.prepare("SELECT COUNT(*) as c FROM learnings").get() as any;
    learningsCount = row.c;
  } catch { /* table missing */ }

  let recentRunScores: number[] = [];
  try {
    const rows = db.prepare(`
      SELECT score FROM engine_reports
      ORDER BY generated_at DESC LIMIT 20
    `).all() as any[];
    recentRunScores = rows.map((r) => r.score);
  } catch { /* no reports */ }

  // Trend direction
  let trendDirection = "insufficient_data";
  if (recentRunScores.length >= 3) {
    const half = Math.ceil(recentRunScores.length / 2);
    const recentAvg = recentRunScores.slice(0, half).reduce((a, b) => a + b, 0) / half;
    const olderAvg = recentRunScores.slice(half).reduce((a, b) => a + b, 0) / (recentRunScores.length - half);
    const delta = recentAvg - olderAvg;
    trendDirection = delta > 5 ? "improving" : delta < -5 ? "regressing" : "stable";
  }

  let contentArchiveSize = 0;
  try {
    const row = db.prepare("SELECT COUNT(*) as c FROM content_archive").get() as any;
    contentArchiveSize = row.c;
  } catch { /* table missing */ }

  let daysSinceLastLearning: number | null = null;
  try {
    const row = db.prepare(
      "SELECT created_at FROM learnings ORDER BY created_at DESC LIMIT 1",
    ).get() as any;
    if (row) {
      const lastDate = new Date(row.created_at);
      daysSinceLastLearning = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    }
  } catch { /* table missing */ }

  let workflowCoverage: Record<string, number> = {};
  try {
    const rows = db.prepare(`
      SELECT workflow, COUNT(*) as c FROM engine_workflow_runs
      GROUP BY workflow ORDER BY c DESC LIMIT 15
    `).all() as any[];
    for (const r of rows) {
      workflowCoverage[r.workflow] = r.c;
    }
  } catch { /* table missing */ }

  return { learningsCount, recentRunScores, trendDirection, contentArchiveSize, daysSinceLastLearning, workflowCoverage };
}

// ── Content Archive ───────────────────────────────────────────────────

export function archiveContent(
  title: string,
  contentType: string,
  digest: string,
  themes: string[],
  workflow?: string,
  fullContent?: string,
): void {
  const db = getDb();
  try {
    db.prepare(`
      INSERT INTO content_archive (id, title, content_type, digest, full_content, themes, workflow, published_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      genId("cnt"),
      title,
      contentType,
      digest,
      fullContent ?? null,
      JSON.stringify(themes),
      workflow ?? null,
    );
  } catch { /* best effort */ }
}

export function searchContentArchive(
  query: string,
  contentType?: string,
  limit = 10,
): Array<{ id: string; title: string; contentType: string; digest: string; themes: string[]; publishedAt: string }> {
  const db = getDb();
  try {
    let rows: any[];
    if (query) {
      rows = db.prepare(`
        SELECT c.id, c.title, c.content_type, c.digest, c.themes, c.published_at
        FROM content_archive_fts fts
        JOIN content_archive c ON c.rowid = fts.rowid
        WHERE content_archive_fts MATCH ?
        ${contentType ? "AND c.content_type = ?" : ""}
        ORDER BY rank
        LIMIT ?
      `).all(...(contentType ? [query, contentType, limit] : [query, limit])) as any[];
    } else {
      rows = db.prepare(`
        SELECT id, title, content_type, digest, themes, published_at
        FROM content_archive
        ${contentType ? "WHERE content_type = ?" : ""}
        ORDER BY published_at DESC
        LIMIT ?
      `).all(...(contentType ? [contentType, limit] : [limit])) as any[];
    }
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      contentType: r.content_type,
      digest: r.digest ?? "",
      themes: r.themes ? (() => { try { return JSON.parse(r.themes); } catch { return []; } })() : [],
      publishedAt: r.published_at,
    }));
  } catch {
    // FTS5 syntax error — LIKE fallback
    try {
      const pattern = `%${query}%`;
      const rows = db.prepare(`
        SELECT id, title, content_type, digest, themes, published_at
        FROM content_archive
        WHERE title LIKE ? OR digest LIKE ? OR themes LIKE ?
        ${contentType ? "AND content_type = ?" : ""}
        ORDER BY published_at DESC LIMIT ?
      `).all(...(contentType ? [pattern, pattern, pattern, contentType, limit] : [pattern, pattern, pattern, limit])) as any[];
      return rows.map((r) => ({
        id: r.id,
        title: r.title,
        contentType: r.content_type,
        digest: r.digest ?? "",
        themes: r.themes ? (() => { try { return JSON.parse(r.themes); } catch { return []; } })() : [],
        publishedAt: r.published_at,
      }));
    } catch { return []; }
  }
}

// ── Workflow History ──────────────────────────────────────────────────

export function getWorkflowHistory(
  workflow: string,
  limit = 10,
): Array<{ sessionId: string; workflow: string; preset: string; score: number; grade: string; durationMs: number; stepCount: number; successCount: number; failedCount: number; createdAt: string }> {
  const db = getDb();
  try {
    const rows = db.prepare(`
      SELECT r.session_id, r.workflow, r.preset,
             COALESCE(rp.score, 0) as score,
             COALESCE(rp.grade, '-') as grade,
             r.duration_ms, r.step_count, r.success_count, r.failed_count, r.created_at
      FROM engine_workflow_runs r
      LEFT JOIN engine_reports rp ON rp.session_id = r.session_id AND rp.workflow = r.workflow
      WHERE r.workflow = ?
      ORDER BY r.created_at DESC
      LIMIT ?
    `).all(workflow, limit) as any[];
    return rows.map((r) => ({
      sessionId: r.session_id,
      workflow: r.workflow,
      preset: r.preset,
      score: r.score,
      grade: r.grade,
      durationMs: r.duration_ms,
      stepCount: r.step_count,
      successCount: r.success_count,
      failedCount: r.failed_count,
      createdAt: r.created_at,
    }));
  } catch { return []; }
}

// ── Search Learnings (for API) ────────────────────────────────────────

export function searchLearnings(
  query: string,
  limit = 10,
): Array<{ key: string; content: string; category: string; createdAt: string }> {
  const db = getDb();
  try {
    const rows = db.prepare(`
      SELECT l.key, l.content, l.category, l.created_at
      FROM learnings_fts fts
      JOIN learnings l ON l.id = fts.rowid
      WHERE learnings_fts MATCH ?
      ORDER BY rank
      LIMIT ?
    `).all(query, limit) as any[];
    return rows.map((r) => ({ key: r.key, content: r.content, category: r.category, createdAt: r.created_at }));
  } catch {
    try {
      const pattern = `%${query}%`;
      const rows = db.prepare(`
        SELECT key, content, category, created_at
        FROM learnings WHERE content LIKE ? OR key LIKE ?
        ORDER BY created_at DESC LIMIT ?
      `).all(pattern, pattern, limit) as any[];
      return rows.map((r) => ({ key: r.key, content: r.content, category: r.category, createdAt: r.created_at }));
    } catch { return []; }
  }
}
