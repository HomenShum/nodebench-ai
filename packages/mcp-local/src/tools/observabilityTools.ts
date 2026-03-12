/**
 * Observability Tools — Continuous system health, drift detection, and autonomous maintenance.
 *
 * Provides:
 * 1. Real-time system pulse (health snapshot)
 * 2. Drift detection (expected vs actual state)
 * 3. Self-healing for common issues
 * 4. Background watchdog with configurable intervals
 * 5. Uptime statistics and error trend analysis
 */

import { existsSync, statSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { createRequire } from "node:module";
import type { McpTool } from "../types.js";

const _require = createRequire(import.meta.url);
function _isInstalled(pkg: string): boolean {
  try { _require.resolve(pkg); return true; } catch { return false; }
}

// ── Watchdog State ──────────────────────────────────────────────────────

interface WatchdogConfig {
  enabled: boolean;
  intervalMs: number;
  maxLogEntries: number;
  thresholds: {
    dbSizeMb: number;
    errorRatePercent: number;
    staleEmbeddingCacheHours: number;
    orphanedCycleHours: number;
    analyticsRetentionDays: number;
  };
}

interface WatchdogLogEntry {
  timestamp: string;
  checks: DriftCheck[];
  healthScore: number;
  healed: string[];
}

interface DriftCheck {
  id: string;
  name: string;
  status: "ok" | "warning" | "critical";
  detail: string;
  healable: boolean;
}

interface SystemPulse {
  timestamp: string;
  uptime: { startedAt: string; durationMs: number };
  database: { exists: boolean; sizeKb: number; path: string };
  analytics: { exists: boolean; sizeKb: number };
  embeddingCache: { exists: boolean; sizeKb: number; ageHours: number };
  toolCount: number;
  dashboards: { main: boolean; brief: boolean; engine: boolean };
  recentErrors: { last5min: number; last1hr: number; last24hr: number };
  healthScore: number;
}

// Singleton watchdog state
let watchdogConfig: WatchdogConfig = {
  enabled: true,
  intervalMs: 300_000, // 5 minutes
  maxLogEntries: 100,
  thresholds: {
    dbSizeMb: 500,
    errorRatePercent: 20,
    staleEmbeddingCacheHours: 168, // 7 days
    orphanedCycleHours: 48,
    analyticsRetentionDays: 90,
  },
};

const watchdogLog: WatchdogLogEntry[] = [];
let watchdogTimer: ReturnType<typeof setInterval> | null = null;
const serverStartTime = Date.now();

// Lazy DB accessor — set by init function
let _getDb: (() => any) | null = null;

export function initObservability(getDb: () => any): void {
  _getDb = getDb;
}

// ── Helpers ─────────────────────────────────────────────────────────────

function nodebenchDir(): string {
  return join(homedir(), ".nodebench");
}

function fileInfo(path: string): { exists: boolean; sizeKb: number; ageHours: number } {
  if (!existsSync(path)) return { exists: false, sizeKb: 0, ageHours: 0 };
  const stat = statSync(path);
  return {
    exists: true,
    sizeKb: Math.round(stat.size / 1024),
    ageHours: Math.round((Date.now() - stat.mtimeMs) / 3_600_000),
  };
}

async function checkDashboard(port: number): Promise<boolean> {
  try {
    const resp = await fetch(`http://127.0.0.1:${port}/api/health`, { signal: AbortSignal.timeout(1500) });
    return resp.ok;
  } catch { return false; }
}

function getRecentErrors(db: any, windowMinutes: number): number {
  try {
    const cutoff = new Date(Date.now() - windowMinutes * 60_000).toISOString();
    const row = db.prepare(
      `SELECT COUNT(*) as cnt FROM tool_call_log WHERE result_status = 'error' AND created_at > ?`
    ).get(cutoff) as { cnt: number } | undefined;
    return row?.cnt ?? 0;
  } catch { return 0; }
}

function getRecentCallCount(db: any, windowMinutes: number): number {
  try {
    const cutoff = new Date(Date.now() - windowMinutes * 60_000).toISOString();
    const row = db.prepare(
      `SELECT COUNT(*) as cnt FROM tool_call_log WHERE created_at > ?`
    ).get(cutoff) as { cnt: number } | undefined;
    return row?.cnt ?? 0;
  } catch { return 0; }
}

function getOrphanedCycles(db: any, hoursOld: number): any[] {
  try {
    const cutoff = new Date(Date.now() - hoursOld * 3_600_000).toISOString();
    return db.prepare(
      `SELECT id, title, status, created_at FROM verification_cycles WHERE status IN ('active', 'in_progress') AND created_at < ?`
    ).all(cutoff) as any[];
  } catch { return []; }
}

function getStaleEvalRuns(db: any): any[] {
  try {
    return db.prepare(
      `SELECT id, name, created_at FROM eval_runs WHERE status IN ('running', 'pending') AND created_at < datetime('now', '-24 hours')`
    ).all() as any[];
  } catch { return []; }
}

// ── Core: System Pulse ──────────────────────────────────────────────────

async function computeSystemPulse(db: any, toolCount: number): Promise<SystemPulse> {
  const dir = nodebenchDir();
  const dbInfo = fileInfo(join(dir, "nodebench.db"));
  const analyticsInfo = fileInfo(join(dir, "analytics.db"));
  const cacheInfo = fileInfo(join(dir, "embedding_cache.json"));

  const [mainUp, briefUp, engineUp] = await Promise.all([
    checkDashboard(6274),
    checkDashboard(6275),
    checkDashboard(6276),
  ]);

  const errors5min = getRecentErrors(db, 5);
  const errors1hr = getRecentErrors(db, 60);
  const errors24hr = getRecentErrors(db, 1440);

  // Health score: 100 base, deduct for issues
  let healthScore = 100;
  if (!dbInfo.exists) healthScore -= 30;
  if (dbInfo.sizeKb > watchdogConfig.thresholds.dbSizeMb * 1024) healthScore -= 10;
  if (!mainUp) healthScore -= 10;
  const calls1hr = getRecentCallCount(db, 60);
  const errorRate = calls1hr > 0 ? (errors1hr / calls1hr) * 100 : 0;
  if (errorRate > watchdogConfig.thresholds.errorRatePercent) healthScore -= 20;
  if (errorRate > 50) healthScore -= 20;
  if (cacheInfo.ageHours > watchdogConfig.thresholds.staleEmbeddingCacheHours) healthScore -= 5;

  return {
    timestamp: new Date().toISOString(),
    uptime: { startedAt: new Date(serverStartTime).toISOString(), durationMs: Date.now() - serverStartTime },
    database: { exists: dbInfo.exists, sizeKb: dbInfo.sizeKb, path: join(dir, "nodebench.db") },
    analytics: { exists: analyticsInfo.exists, sizeKb: analyticsInfo.sizeKb },
    embeddingCache: { exists: cacheInfo.exists, sizeKb: cacheInfo.sizeKb, ageHours: cacheInfo.ageHours },
    toolCount,
    dashboards: { main: mainUp, brief: briefUp, engine: engineUp },
    recentErrors: { last5min: errors5min, last1hr: errors1hr, last24hr: errors24hr },
    healthScore: Math.max(0, healthScore),
  };
}

// ── Core: Drift Detection ───────────────────────────────────────────────

function runDriftChecks(db: any): DriftCheck[] {
  const checks: DriftCheck[] = [];
  const dir = nodebenchDir();
  const { thresholds } = watchdogConfig;

  // 1. DB size drift
  const dbInfo = fileInfo(join(dir, "nodebench.db"));
  if (dbInfo.exists && dbInfo.sizeKb > thresholds.dbSizeMb * 1024) {
    checks.push({
      id: "db_size",
      name: "Database size exceeds threshold",
      status: dbInfo.sizeKb > thresholds.dbSizeMb * 2 * 1024 ? "critical" : "warning",
      detail: `${(dbInfo.sizeKb / 1024).toFixed(1)} MB (threshold: ${thresholds.dbSizeMb} MB)`,
      healable: true,
    });
  } else {
    checks.push({ id: "db_size", name: "Database size", status: "ok", detail: `${(dbInfo.sizeKb / 1024).toFixed(1)} MB`, healable: false });
  }

  // 2. Orphaned verification cycles
  const orphaned = getOrphanedCycles(db, thresholds.orphanedCycleHours);
  if (orphaned.length > 0) {
    checks.push({
      id: "orphaned_cycles",
      name: "Orphaned verification cycles",
      status: orphaned.length > 5 ? "critical" : "warning",
      detail: `${orphaned.length} cycles stuck in active/in_progress for >${thresholds.orphanedCycleHours}h`,
      healable: true,
    });
  } else {
    checks.push({ id: "orphaned_cycles", name: "Verification cycles", status: "ok", detail: "No orphaned cycles", healable: false });
  }

  // 3. Stale eval runs
  const staleRuns = getStaleEvalRuns(db);
  if (staleRuns.length > 0) {
    checks.push({
      id: "stale_evals",
      name: "Stale eval runs",
      status: "warning",
      detail: `${staleRuns.length} eval runs stuck in running/pending for >24h`,
      healable: true,
    });
  } else {
    checks.push({ id: "stale_evals", name: "Eval runs", status: "ok", detail: "No stale runs", healable: false });
  }

  // 4. Embedding cache freshness
  const cacheInfo = fileInfo(join(dir, "embedding_cache.json"));
  if (cacheInfo.exists && cacheInfo.ageHours > thresholds.staleEmbeddingCacheHours) {
    checks.push({
      id: "embedding_cache_stale",
      name: "Embedding cache stale",
      status: "warning",
      detail: `Last updated ${cacheInfo.ageHours}h ago (threshold: ${thresholds.staleEmbeddingCacheHours}h)`,
      healable: false, // Requires re-init, not a simple fix
    });
  } else if (cacheInfo.exists) {
    checks.push({ id: "embedding_cache_stale", name: "Embedding cache", status: "ok", detail: `${cacheInfo.ageHours}h old, ${cacheInfo.sizeKb} KB`, healable: false });
  }

  // 5. Error rate spike
  const calls1hr = getRecentCallCount(db, 60);
  const errors1hr = getRecentErrors(db, 60);
  const errorRate = calls1hr > 0 ? (errors1hr / calls1hr) * 100 : 0;
  if (errorRate > thresholds.errorRatePercent && calls1hr > 5) {
    checks.push({
      id: "error_rate",
      name: "Error rate spike",
      status: errorRate > 50 ? "critical" : "warning",
      detail: `${errorRate.toFixed(1)}% errors in last hour (${errors1hr}/${calls1hr} calls, threshold: ${thresholds.errorRatePercent}%)`,
      healable: false,
    });
  } else {
    checks.push({ id: "error_rate", name: "Error rate", status: "ok", detail: `${errorRate.toFixed(1)}% (${errors1hr}/${calls1hr})`, healable: false });
  }

  // 6. Analytics data retention
  const analyticsInfo = fileInfo(join(dir, "analytics.db"));
  if (analyticsInfo.exists && analyticsInfo.sizeKb > 50_000) {
    checks.push({
      id: "analytics_bloat",
      name: "Analytics DB large",
      status: "warning",
      detail: `${(analyticsInfo.sizeKb / 1024).toFixed(1)} MB — may benefit from retention cleanup`,
      healable: true,
    });
  } else {
    checks.push({ id: "analytics_bloat", name: "Analytics size", status: "ok", detail: `${(analyticsInfo.sizeKb / 1024).toFixed(1)} MB`, healable: false });
  }

  // 7. Notes directory growth
  const notesDir = join(dir, "notes");
  if (existsSync(notesDir)) {
    try {
      const noteFiles = readdirSync(notesDir).filter(f => f.endsWith(".md"));
      if (noteFiles.length > 200) {
        checks.push({
          id: "notes_growth",
          name: "Session notes accumulation",
          status: "warning",
          detail: `${noteFiles.length} note files — consider archiving old notes`,
          healable: false,
        });
      } else {
        checks.push({ id: "notes_growth", name: "Session notes", status: "ok", detail: `${noteFiles.length} files`, healable: false });
      }
    } catch {
      checks.push({ id: "notes_growth", name: "Session notes", status: "ok", detail: "Directory not readable", healable: false });
    }
  }

  return checks;
}

// ── Core: Self-Heal ─────────────────────────────────────────────────────

function runSelfHeal(db: any, targets?: string[]): string[] {
  const healed: string[] = [];

  const shouldHeal = (id: string) => !targets || targets.length === 0 || targets.includes(id);

  // Heal orphaned verification cycles
  if (shouldHeal("orphaned_cycles")) {
    const orphaned = getOrphanedCycles(db, watchdogConfig.thresholds.orphanedCycleHours);
    for (const cycle of orphaned) {
      try {
        db.prepare(`UPDATE verification_cycles SET status = 'abandoned', updated_at = datetime('now') WHERE id = ?`).run(cycle.id);
        healed.push(`Abandoned orphaned cycle ${cycle.id} ("${cycle.title}")`);
      } catch { /* skip */ }
    }
  }

  // Heal stale eval runs
  if (shouldHeal("stale_evals")) {
    const stale = getStaleEvalRuns(db);
    for (const run of stale) {
      try {
        db.prepare(`UPDATE eval_runs SET status = 'failed', completed_at = datetime('now') WHERE id = ?`).run(run.id);
        healed.push(`Marked stale eval run ${run.id} as failed`);
      } catch { /* skip */ }
    }
  }

  // Heal DB bloat via VACUUM (if over 2x threshold)
  if (shouldHeal("db_size")) {
    const dbInfo = fileInfo(join(nodebenchDir(), "nodebench.db"));
    if (dbInfo.sizeKb > watchdogConfig.thresholds.dbSizeMb * 2 * 1024) {
      try {
        // Delete old tool call logs (>90 days)
        const cutoff = new Date(Date.now() - 90 * 24 * 3_600_000).toISOString();
        const deleted = db.prepare(`DELETE FROM tool_call_log WHERE created_at < ?`).run(cutoff);
        if (deleted.changes > 0) {
          healed.push(`Pruned ${deleted.changes} tool_call_log entries older than 90 days`);
        }
        db.pragma("wal_checkpoint(TRUNCATE)");
        healed.push("Ran WAL checkpoint (TRUNCATE)");
      } catch { /* skip */ }
    }
  }

  // Heal analytics bloat
  if (shouldHeal("analytics_bloat")) {
    const analyticsInfo = fileInfo(join(nodebenchDir(), "analytics.db"));
    if (analyticsInfo.sizeKb > 50_000) {
      try {
        // Import and use analytics cleanup
        healed.push("Analytics cleanup recommended — run: nodebench-mcp --reset-stats");
      } catch { /* skip */ }
    }
  }

  return healed;
}

// ── Core: Uptime Stats ──────────────────────────────────────────────────

function computeUptimeStats(db: any): Record<string, any> {
  const durationMs = Date.now() - serverStartTime;
  const windows = [
    { label: "5min", minutes: 5 },
    { label: "1hr", minutes: 60 },
    { label: "24hr", minutes: 1440 },
    { label: "7d", minutes: 10080 },
  ];

  const stats: Record<string, any> = {
    serverStart: new Date(serverStartTime).toISOString(),
    uptimeMs: durationMs,
    uptimeHuman: formatDuration(durationMs),
  };

  for (const { label, minutes } of windows) {
    const calls = getRecentCallCount(db, minutes);
    const errors = getRecentErrors(db, minutes);
    const rate = calls > 0 ? ((calls - errors) / calls * 100).toFixed(1) : "N/A";
    stats[label] = { calls, errors, successRate: `${rate}%`, callsPerMinute: (calls / minutes).toFixed(2) };
  }

  // Top 10 tools by call count in last 24h
  try {
    const cutoff = new Date(Date.now() - 24 * 3_600_000).toISOString();
    stats.topTools24h = db.prepare(
      `SELECT tool_name, COUNT(*) as calls, SUM(CASE WHEN result_status = 'error' THEN 1 ELSE 0 END) as errors,
       ROUND(AVG(duration_ms)) as avg_ms
       FROM tool_call_log WHERE created_at > ? GROUP BY tool_name ORDER BY calls DESC LIMIT 10`
    ).all(cutoff);
  } catch { stats.topTools24h = []; }

  // Error trend: compare last hour vs previous hour
  try {
    const now = Date.now();
    const errorsThisHour = getRecentErrors(db, 60);
    const cutoffPrev = new Date(now - 120 * 60_000).toISOString();
    const cutoffThisHour = new Date(now - 60 * 60_000).toISOString();
    const row = db.prepare(
      `SELECT COUNT(*) as cnt FROM tool_call_log WHERE result_status = 'error' AND created_at > ? AND created_at <= ?`
    ).get(cutoffPrev, cutoffThisHour) as { cnt: number } | undefined;
    const errorsPrevHour = row?.cnt ?? 0;
    stats.errorTrend = {
      thisHour: errorsThisHour,
      prevHour: errorsPrevHour,
      direction: errorsThisHour > errorsPrevHour ? "increasing" : errorsThisHour < errorsPrevHour ? "decreasing" : "stable",
    };
  } catch { stats.errorTrend = { thisHour: 0, prevHour: 0, direction: "stable" }; }

  return stats;
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h ${m % 60}m`;
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

// ── Watchdog Background Loop ────────────────────────────────────────────

function runWatchdogCycle(db: any): WatchdogLogEntry {
  const checks = runDriftChecks(db);
  const criticals = checks.filter(c => c.status === "critical");
  const warnings = checks.filter(c => c.status === "warning");

  // Auto-heal critical healable issues
  let healed: string[] = [];
  const healableTargets = criticals.filter(c => c.healable).map(c => c.id);
  if (healableTargets.length > 0) {
    healed = runSelfHeal(db, healableTargets);
  }

  const healthScore = Math.max(0, 100 - criticals.length * 20 - warnings.length * 5);

  const entry: WatchdogLogEntry = {
    timestamp: new Date().toISOString(),
    checks,
    healthScore,
    healed,
  };

  watchdogLog.push(entry);
  if (watchdogLog.length > watchdogConfig.maxLogEntries) {
    watchdogLog.splice(0, watchdogLog.length - watchdogConfig.maxLogEntries);
  }

  return entry;
}

export function startWatchdog(db: any): void {
  if (watchdogTimer) return;
  if (!watchdogConfig.enabled) return;

  // Run initial check
  runWatchdogCycle(db);

  watchdogTimer = setInterval(() => {
    try { runWatchdogCycle(db); } catch { /* never crash the server */ }
  }, watchdogConfig.intervalMs);

  // Unref so it doesn't prevent process exit
  if (watchdogTimer && typeof watchdogTimer.unref === "function") {
    watchdogTimer.unref();
  }
}

export function stopWatchdog(): void {
  if (watchdogTimer) {
    clearInterval(watchdogTimer);
    watchdogTimer = null;
  }
}

// ── MCP Tool Definitions ────────────────────────────────────────────────

function getDb(): any {
  if (!_getDb) throw new Error("Observability not initialized — call initObservability(getDb) first");
  return _getDb();
}

export const observabilityTools: McpTool[] = [
  {
    name: "get_system_pulse",
    description:
      "Get a real-time health snapshot of the NodeBench MCP system. Returns database status, " +
      "dashboard availability, embedding cache freshness, recent error rates, and overall health score (0-100). " +
      "Think of it like a vital signs monitor — one glance tells you if the system is healthy.",
    inputSchema: {
      type: "object" as const,
      properties: {
        include_dashboards: {
          type: "boolean",
          description: "Check dashboard HTTP endpoints (adds ~1.5s latency). Default: true.",
        },
      },
      required: [],
    },
    handler: async (args: any) => {
      const db = getDb();
      const toolCount = 0; // Will be overridden at registration
      const pulse = await computeSystemPulse(db, args._toolCount ?? toolCount);

      if (args.include_dashboards === false) {
        pulse.dashboards = { main: false, brief: false, engine: false };
      }

      return {
        pulse,
        interpretation: pulse.healthScore >= 90 ? "System is healthy"
          : pulse.healthScore >= 70 ? "System has minor issues — check warnings"
          : pulse.healthScore >= 50 ? "System needs attention — multiple issues detected"
          : "System is degraded — immediate action recommended",
        _hint: pulse.healthScore < 70 ? "Run get_drift_report for details, then run_self_heal to fix healable issues." : undefined,
      };
    },
  },
  {
    name: "get_drift_report",
    description:
      "Detect configuration and state drift in the NodeBench system. Checks for orphaned verification " +
      "cycles, stale eval runs, database bloat, error rate spikes, embedding cache staleness, and notes " +
      "accumulation. Each issue is classified as ok/warning/critical with healable flag. " +
      "Think of it like a home inspection — it finds the leaky faucets before they become floods.",
    inputSchema: {
      type: "object" as const,
      properties: {
        include_history: {
          type: "boolean",
          description: "Include last 10 watchdog log entries for trend analysis. Default: false.",
        },
      },
      required: [],
    },
    handler: async (args: any) => {
      const db = getDb();
      const checks = runDriftChecks(db);
      const criticals = checks.filter(c => c.status === "critical");
      const warnings = checks.filter(c => c.status === "warning");
      const healable = checks.filter(c => c.healable && c.status !== "ok");

      const result: any = {
        timestamp: new Date().toISOString(),
        summary: {
          total: checks.length,
          ok: checks.filter(c => c.status === "ok").length,
          warnings: warnings.length,
          criticals: criticals.length,
          healable: healable.length,
        },
        checks,
      };

      if (healable.length > 0) {
        result._hint = `${healable.length} issue(s) can be auto-fixed. Run run_self_heal to fix: ${healable.map(h => h.id).join(", ")}`;
      }

      if (args.include_history) {
        result.recentWatchdogRuns = watchdogLog.slice(-10).map(e => ({
          timestamp: e.timestamp,
          healthScore: e.healthScore,
          issues: e.checks.filter(c => c.status !== "ok").length,
          healed: e.healed.length,
        }));
      }

      return result;
    },
  },
  {
    name: "run_self_heal",
    description:
      "Autonomous self-healing for detected drift issues. Fixes orphaned verification cycles " +
      "(marks as abandoned), stale eval runs (marks as failed), and database bloat (prunes old logs, " +
      "runs WAL checkpoint). Only fixes issues that are safe to auto-repair. " +
      "Think of it like a house robot that cleans up messes — it only touches what it knows how to handle safely.",
    inputSchema: {
      type: "object" as const,
      properties: {
        targets: {
          type: "array",
          items: { type: "string" },
          description: "Specific drift IDs to heal (e.g. ['orphaned_cycles', 'stale_evals', 'db_size']). Empty = heal all.",
        },
        dry_run: {
          type: "boolean",
          description: "If true, report what would be healed without actually doing it. Default: false.",
        },
      },
      required: [],
    },
    handler: async (args: any) => {
      const db = getDb();

      if (args.dry_run) {
        const checks = runDriftChecks(db);
        const healable = checks.filter(c => c.healable && c.status !== "ok");
        const filtered = args.targets?.length
          ? healable.filter(c => args.targets.includes(c.id))
          : healable;
        return {
          dryRun: true,
          wouldHeal: filtered.map(c => ({ id: c.id, name: c.name, detail: c.detail })),
          _hint: filtered.length > 0 ? "Run again without dry_run=true to apply fixes." : "Nothing to heal.",
        };
      }

      const healed = runSelfHeal(db, args.targets);

      // Re-check after healing
      const postChecks = runDriftChecks(db);
      const remaining = postChecks.filter(c => c.status !== "ok");

      return {
        healed,
        healedCount: healed.length,
        remainingIssues: remaining.length,
        postHealChecks: postChecks,
        _hint: remaining.length > 0
          ? `${remaining.length} issue(s) remain after healing. Some require manual intervention.`
          : "All healable issues resolved.",
      };
    },
  },
  {
    name: "get_uptime_stats",
    description:
      "Get session uptime, tool call rates, error trends, and top tools over multiple time windows " +
      "(5min, 1hr, 24hr, 7d). Includes error direction trend (increasing/decreasing/stable). " +
      "Think of it like a car dashboard — speed, fuel level, and engine warning lights at a glance.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
    handler: async () => {
      const db = getDb();
      return computeUptimeStats(db);
    },
  },
  {
    name: "set_watchdog_config",
    description:
      "Configure the background watchdog that continuously monitors system health. " +
      "Set check interval, enable/disable, and adjust drift thresholds. Changes take effect immediately. " +
      "Think of it like setting alarm sensitivity — too sensitive and you get noise, too loose and you miss real issues.",
    inputSchema: {
      type: "object" as const,
      properties: {
        enabled: { type: "boolean", description: "Enable/disable the background watchdog" },
        interval_minutes: { type: "number", description: "Check interval in minutes (min: 1, max: 60). Default: 5." },
        thresholds: {
          type: "object",
          description: "Override drift detection thresholds",
          properties: {
            db_size_mb: { type: "number", description: "DB size warning threshold in MB (default: 500)" },
            error_rate_percent: { type: "number", description: "Error rate warning threshold (default: 20)" },
            stale_cache_hours: { type: "number", description: "Embedding cache staleness threshold in hours (default: 168)" },
            orphaned_cycle_hours: { type: "number", description: "Orphaned cycle threshold in hours (default: 48)" },
          },
        },
      },
      required: [],
    },
    handler: async (args: any) => {
      const prev = { ...watchdogConfig };

      if (args.enabled !== undefined) watchdogConfig.enabled = args.enabled;
      if (args.interval_minutes !== undefined) {
        const clamped = Math.max(1, Math.min(60, args.interval_minutes));
        watchdogConfig.intervalMs = clamped * 60_000;
      }
      if (args.thresholds) {
        if (args.thresholds.db_size_mb !== undefined) watchdogConfig.thresholds.dbSizeMb = args.thresholds.db_size_mb;
        if (args.thresholds.error_rate_percent !== undefined) watchdogConfig.thresholds.errorRatePercent = args.thresholds.error_rate_percent;
        if (args.thresholds.stale_cache_hours !== undefined) watchdogConfig.thresholds.staleEmbeddingCacheHours = args.thresholds.stale_cache_hours;
        if (args.thresholds.orphaned_cycle_hours !== undefined) watchdogConfig.thresholds.orphanedCycleHours = args.thresholds.orphaned_cycle_hours;
      }

      // Restart watchdog if interval or enabled changed
      if (watchdogConfig.enabled !== prev.enabled || watchdogConfig.intervalMs !== prev.intervalMs) {
        stopWatchdog();
        if (watchdogConfig.enabled && _getDb) {
          startWatchdog(_getDb());
        }
      }

      return {
        config: watchdogConfig,
        changes: {
          enabled: prev.enabled !== watchdogConfig.enabled ? `${prev.enabled} → ${watchdogConfig.enabled}` : undefined,
          intervalMs: prev.intervalMs !== watchdogConfig.intervalMs ? `${prev.intervalMs} → ${watchdogConfig.intervalMs}` : undefined,
        },
      };
    },
  },
  {
    name: "get_watchdog_log",
    description:
      "Get recent watchdog check results. Shows health score trend, detected issues, and auto-healed " +
      "actions over time. Useful for understanding system behavior patterns. " +
      "Think of it like a security camera playback — see what happened while you weren't looking.",
    inputSchema: {
      type: "object" as const,
      properties: {
        limit: { type: "number", description: "Number of recent entries to return (default: 20, max: 100)" },
        only_issues: { type: "boolean", description: "Filter to only show entries with warnings or criticals. Default: false." },
      },
      required: [],
    },
    handler: async (args: any) => {
      const limit = Math.min(args.limit ?? 20, 100);
      let entries = watchdogLog.slice(-limit);

      if (args.only_issues) {
        entries = entries.filter(e => e.checks.some(c => c.status !== "ok"));
      }

      // Compute trend
      const scores = entries.map(e => e.healthScore);
      const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 100;
      const trend = scores.length >= 2
        ? scores[scores.length - 1] > scores[0] ? "improving" : scores[scores.length - 1] < scores[0] ? "degrading" : "stable"
        : "insufficient_data";

      return {
        entries: entries.map(e => ({
          timestamp: e.timestamp,
          healthScore: e.healthScore,
          issues: e.checks.filter(c => c.status !== "ok").map(c => `[${c.status}] ${c.name}`),
          healed: e.healed,
        })),
        summary: {
          totalEntries: watchdogLog.length,
          returned: entries.length,
          avgHealthScore: Math.round(avgScore),
          trend,
          totalAutoHealed: watchdogLog.reduce((s, e) => s + e.healed.length, 0),
        },
      };
    },
  },
  {
    name: "get_sentinel_report",
    description:
      "Get the latest sentinel self-test report with all 9 probe results (build, e2e, design, dogfood, " +
      "voice, a11y, visual, performance, contract), root-cause diagnoses, and fix suggestions. " +
      "The sentinel system is the 3-layer autonomous quality pipeline that tests the entire app surface.",
    inputSchema: {
      type: "object" as const,
      properties: {
        probe_filter: {
          type: "string",
          description: "Comma-separated probes to include (e.g. 'build,e2e,voice'). Default: all.",
        },
      },
      required: [],
    },
    handler: async (args: any) => {
      const reportPaths = [
        join(process.cwd(), ".sentinel", "latest.json"),
        join(process.cwd(), "../../.sentinel/latest.json"),
      ];
      let report: any = null;
      for (const p of reportPaths) {
        if (existsSync(p)) {
          try { report = JSON.parse(readFileSync(p, "utf8")); break; } catch { /* skip */ }
        }
      }
      if (!report) {
        return { available: false, hint: "Run 'npm run sentinel' to generate a health report." };
      }

      let probes = report.probes || [];
      if (args.probe_filter) {
        const filter = new Set((args.probe_filter as string).split(",").map((s: string) => s.trim().toLowerCase()));
        probes = probes.filter((p: any) => filter.has(p.probe));
      }

      return {
        reportId: report.id,
        timestamp: report.timestamp,
        summary: report.summary,
        probes: probes.map((p: any) => ({
          probe: p.probe, status: p.status, duration: p.duration,
          summary: p.summary, failures: (p.failures || []).slice(0, 10),
        })),
        diagnoses: (report.diagnoses || []).slice(0, 15).map((d: any) => ({
          probe: d.probe, severity: d.severity, symptom: d.symptom,
          rootCause: d.rootCause, suggestedFix: d.suggestedFix,
        })),
      };
    },
  },
  {
    name: "get_observability_summary",
    description:
      "Unified observability summary combining MCP system pulse, sentinel probes, watchdog status, " +
      "and maintenance recommendations. Best single tool for a quick health check before starting work.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
    handler: async () => {
      const db = getDb();
      const pulse = await computeSystemPulse(db, 0);
      const checks = runDriftChecks(db);

      // Read sentinel report
      const reportPaths = [
        join(process.cwd(), ".sentinel", "latest.json"),
        join(process.cwd(), "../../.sentinel/latest.json"),
      ];
      let sentinel: any = { available: false };
      for (const p of reportPaths) {
        if (existsSync(p)) {
          try {
            const r = JSON.parse(readFileSync(p, "utf8"));
            sentinel = {
              reportId: r.id,
              age: r.timestamp ? `${Math.round((Date.now() - new Date(r.timestamp).getTime()) / 60000)}min` : "unknown",
              summary: r.summary,
              topIssues: (r.diagnoses || []).slice(0, 3).map((d: any) => `[${d.severity}] ${d.symptom}`),
            };
            break;
          } catch { /* skip */ }
        }
      }

      const healable = checks.filter(c => c.healable && c.status !== "ok");
      const nextActions: string[] = [];
      if (pulse.healthScore < 70) nextActions.push("System degraded — run get_drift_report then run_self_heal");
      if (sentinel.available === false) nextActions.push("Run 'npm run sentinel' for full app surface health check");
      if (healable.length > 0) nextActions.push(`${healable.length} auto-fixable issue(s) — run run_self_heal`);
      if (nextActions.length === 0) nextActions.push("All systems healthy.");

      return {
        timestamp: new Date().toISOString(),
        mcpHealth: { score: pulse.healthScore, errors24h: pulse.recentErrors.last24hr, uptimeMs: pulse.uptime.durationMs },
        driftChecks: { total: checks.length, ok: checks.filter(c => c.status === "ok").length, issues: checks.filter(c => c.status !== "ok").length },
        sentinel,
        watchdog: { running: !!watchdogTimer, logEntries: watchdogLog.length, lastScore: watchdogLog[watchdogLog.length - 1]?.healthScore ?? null },
        nextActions,
      };
    },
  },
];
