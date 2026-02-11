/**
 * AnalyticsTracker — Singleton analytics engine for NodeBench MCP
 *
 * Owns the full lifecycle: DB open, tool-call recording, project context,
 * session stats, retention cleanup, and graceful shutdown.
 * index.ts calls tracker.record() instead of inline SQL.
 */

import Database from 'better-sqlite3';
import {
  getAnalyticsDb,
  closeAnalyticsDb,
  recordToolUsage,
  updateProjectContext,
  recordPresetSelection,
  clearOldRecords,
} from './schema.js';
import { detectProject } from './projectDetector.js';

// ── Public types ────────────────────────────────────────────────────────

export interface TrackerConfig {
  projectPath: string;
  preset: string;
  toolCount: number;
  /** tool name → toolset name lookup */
  toolToToolset: Map<string, string>;
  /** Tools to skip tracking (avoid recursion) */
  skipTools?: Set<string>;
  /** Days to keep analytics data (default 90) */
  retentionDays?: number;
}

export interface SessionStats {
  totalCalls: number;
  successCount: number;
  failureCount: number;
  totalDuration: number;
  uniqueTools: number;
  topTools: Array<{ name: string; count: number }>;
  errorRate: number;
}

// ── Singleton ───────────────────────────────────────────────────────────

let _instance: AnalyticsTracker | null = null;

export class AnalyticsTracker {
  private db: Database.Database;
  private projectPath: string;
  private preset: string;
  private toolToToolset: Map<string, string>;
  private skipTools: Set<string>;
  private sessionStart: number;
  private _callCount = 0;
  private _insertStmt: Database.Statement | null = null;

  private constructor(config: TrackerConfig) {
    this.db = getAnalyticsDb();
    this.projectPath = config.projectPath;
    this.preset = config.preset;
    this.toolToToolset = config.toolToToolset;
    this.skipTools = config.skipTools ?? new Set();
    this.sessionStart = Date.now();

    // Run retention cleanup once on startup (non-blocking, best-effort)
    const retentionDays = config.retentionDays ?? 90;
    try { clearOldRecords(this.db, retentionDays); } catch { /* ignore */ }

    // Register project context
    this._initProjectContext(config);

    // Pre-compile the insert statement for performance
    this._insertStmt = this.db.prepare(
      `INSERT INTO tool_usage (tool_name, toolset, timestamp, duration, success, error_message, project_path, preset, args)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
  }

  /** Get or create the singleton tracker */
  static init(config: TrackerConfig): AnalyticsTracker {
    if (!_instance) {
      _instance = new AnalyticsTracker(config);
    }
    return _instance;
  }

  /** Get existing instance (returns null if not initialized) */
  static get(): AnalyticsTracker | null {
    return _instance;
  }

  /** Underlying DB handle (for stats queries that need it) */
  getDb(): Database.Database {
    return this.db;
  }

  // ── Core: record a tool call ────────────────────────────────────────

  /**
   * Record a tool call outcome. Called from the CallToolRequestSchema handler.
   * Returns silently on any error — analytics must never break tool dispatch.
   */
  record(
    toolName: string,
    startMs: number,
    success: boolean,
    errorMsg: string | null,
    args?: Record<string, unknown>
  ): void {
    if (this.skipTools.has(toolName)) return;
    try {
      const toolset = this.toolToToolset.get(toolName) ?? 'unknown';
      this._insertStmt!.run(
        toolName,
        toolset,
        startMs,
        Date.now() - startMs,
        success ? 1 : 0,
        errorMsg,
        this.projectPath,
        this.preset,
        args ? JSON.stringify(args) : null
      );
      this._callCount++;
    } catch { /* never break tool dispatch */ }
  }

  // ── Session stats ───────────────────────────────────────────────────

  getSessionStats(): SessionStats {
    const stmt = this.db.prepare(`
      SELECT
        COUNT(*) as totalCalls,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successCount,
        SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failureCount,
        SUM(duration) as totalDuration,
        COUNT(DISTINCT tool_name) as uniqueTools
      FROM tool_usage
      WHERE project_path = ? AND timestamp >= ?
    `);
    const r = stmt.get(this.projectPath, this.sessionStart) as any;

    const topStmt = this.db.prepare(`
      SELECT tool_name as name, COUNT(*) as count
      FROM tool_usage
      WHERE project_path = ? AND timestamp >= ?
      GROUP BY tool_name ORDER BY count DESC LIMIT 5
    `);
    const topTools = topStmt.all(this.projectPath, this.sessionStart) as Array<{ name: string; count: number }>;

    const total = r.totalCalls || 0;
    const failures = r.failureCount || 0;
    return {
      totalCalls: total,
      successCount: r.successCount || 0,
      failureCount: failures,
      totalDuration: r.totalDuration || 0,
      uniqueTools: r.uniqueTools || 0,
      topTools,
      errorRate: total > 0 ? failures / total : 0,
    };
  }

  get callCount(): number {
    return this._callCount;
  }

  // ── Lifecycle ───────────────────────────────────────────────────────

  close(): void {
    try { closeAnalyticsDb(this.db); } catch { /* ignore */ }
    _instance = null;
  }

  // ── Private helpers ─────────────────────────────────────────────────

  private _initProjectContext(config: TrackerConfig): void {
    const context = detectProject(config.projectPath);
    const now = Date.now();

    updateProjectContext(this.db, {
      projectPath: config.projectPath,
      projectType: context.projectType,
      detectedAt: now,
      lastSeen: now,
      language: context.language,
      framework: context.framework,
      hasTests: context.hasTests,
      hasCI: context.hasCI,
      hasDocs: context.hasDocs,
      fileCount: context.fileCount,
    });

    recordPresetSelection(this.db, {
      projectPath: config.projectPath,
      preset: config.preset,
      toolsetCount: config.toolCount,
      selectedAt: now,
      selectionReason: 'manual',
    });
  }
}

// ── Convenience re-exports for backward compat ────────────────────────

/** @deprecated Use AnalyticsTracker.init() instead */
export function initializeProjectContext(
  db: Database.Database,
  projectPath: string = process.cwd(),
  preset: string,
  toolCount: number = 44
): void {
  const context = detectProject(projectPath);
  const now = Date.now();
  updateProjectContext(db, {
    projectPath,
    projectType: context.projectType,
    detectedAt: now,
    lastSeen: now,
    language: context.language,
    framework: context.framework,
    hasTests: context.hasTests,
    hasCI: context.hasCI,
    hasDocs: context.hasDocs,
    fileCount: context.fileCount,
  });
  recordPresetSelection(db, {
    projectPath,
    preset,
    toolsetCount: toolCount,
    selectedAt: now,
    selectionReason: 'manual',
  });
}
