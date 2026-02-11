/**
 * Usage Statistics Aggregation
 * 
 * Aggregates tool usage data to generate insights and recommendations.
 */

import Database from 'better-sqlite3';
import { getCachedStats, setCachedStats } from './schema.js';
import type { ToolUsageRecord } from './schema.js';

export interface ToolUsageStats {
  toolName: string;
  toolset: string;
  callCount: number;
  successCount: number;
  failureCount: number;
  avgDuration: number;
  lastUsed: number;
  firstUsed: number;
}

export interface ToolsetUsageStats {
  toolset: string;
  toolCount: number;
  totalCalls: number;
  uniqueToolsUsed: number;
  avgCallsPerTool: number;
}

export interface ProjectUsageSummary {
  projectPath: string;
  totalCalls: number;
  uniqueToolsUsed: number;
  totalDuration: number;
  avgDuration: number;
  successRate: number;
  mostUsedTool: string;
  mostUsedToolset: string;
  topTools: Array<{ name: string; count: number }>;
  topToolsets: Array<{ name: string; count: number }>;
}

export interface UsageTrend {
  date: string; // YYYY-MM-DD
  callCount: number;
  uniqueTools: number;
  avgDuration: number;
}

export function getToolUsageStats(
  db: Database.Database,
  projectPath: string,
  days: number = 30
): ToolUsageStats[] {
  const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
  
  const stmt = db.prepare(`
    SELECT
      tool_name as toolName,
      toolset,
      COUNT(*) as callCount,
      SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successCount,
      SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failureCount,
      AVG(duration) as avgDuration,
      MAX(timestamp) as lastUsed,
      MIN(timestamp) as firstUsed
    FROM tool_usage
    WHERE project_path = ? AND timestamp >= ?
    GROUP BY tool_name, toolset
    ORDER BY callCount DESC
  `);
  
  return stmt.all(projectPath, cutoff) as ToolUsageStats[];
}

export function getToolsetUsageStats(
  db: Database.Database,
  projectPath: string,
  days: number = 30
): ToolsetUsageStats[] {
  const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
  
  const stmt = db.prepare(`
    SELECT
      toolset,
      COUNT(DISTINCT tool_name) as toolCount,
      SUM(call_count) as totalCalls,
      COUNT(DISTINCT tool_name) as uniqueToolsUsed,
      CAST(SUM(call_count) AS FLOAT) / COUNT(DISTINCT tool_name) as avgCallsPerTool
    FROM (
      SELECT tool_name, toolset, COUNT(*) as call_count
      FROM tool_usage
      WHERE project_path = ? AND timestamp >= ?
      GROUP BY tool_name, toolset
    )
    GROUP BY toolset
    ORDER BY totalCalls DESC
  `);
  
  return stmt.all(projectPath, cutoff) as ToolsetUsageStats[];
}

export function getProjectUsageSummary(
  db: Database.Database,
  projectPath: string,
  days: number = 30
): ProjectUsageSummary | null {
  const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
  
  const stmt = db.prepare(`
    SELECT
      COUNT(*) as totalCalls,
      COUNT(DISTINCT tool_name) as uniqueToolsUsed,
      SUM(duration) as totalDuration,
      AVG(duration) as avgDuration,
      CAST(SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*) as successRate
    FROM tool_usage
    WHERE project_path = ? AND timestamp >= ?
  `);
  
  const summary = stmt.get(projectPath, cutoff) as any;
  if (!summary || summary.totalCalls === 0) return null;
  
  // Get most used tool
  const mostUsedToolStmt = db.prepare(`
    SELECT tool_name, COUNT(*) as count
    FROM tool_usage
    WHERE project_path = ? AND timestamp >= ?
    GROUP BY tool_name
    ORDER BY count DESC
    LIMIT 1
  `);
  const mostUsedTool = mostUsedToolStmt.get(projectPath, cutoff) as { tool_name: string; count: number } | undefined;
  
  // Get most used toolset
  const mostUsedToolsetStmt = db.prepare(`
    SELECT toolset, COUNT(*) as count
    FROM tool_usage
    WHERE project_path = ? AND timestamp >= ?
    GROUP BY toolset
    ORDER BY count DESC
    LIMIT 1
  `);
  const mostUsedToolset = mostUsedToolsetStmt.get(projectPath, cutoff) as { toolset: string; count: number } | undefined;
  
  // Get top 5 tools
  const topToolsStmt = db.prepare(`
    SELECT tool_name as name, COUNT(*) as count
    FROM tool_usage
    WHERE project_path = ? AND timestamp >= ?
    GROUP BY tool_name
    ORDER BY count DESC
    LIMIT 5
  `);
  const topTools = topToolsStmt.all(projectPath, cutoff) as Array<{ name: string; count: number }>;
  
  // Get top 5 toolsets
  const topToolsetsStmt = db.prepare(`
    SELECT toolset as name, COUNT(*) as count
    FROM tool_usage
    WHERE project_path = ? AND timestamp >= ?
    GROUP BY toolset
    ORDER BY count DESC
    LIMIT 5
  `);
  const topToolsets = topToolsetsStmt.all(projectPath, cutoff) as Array<{ name: string; count: number }>;
  
  return {
    projectPath,
    totalCalls: summary.totalCalls,
    uniqueToolsUsed: summary.uniqueToolsUsed,
    totalDuration: summary.totalDuration,
    avgDuration: summary.avgDuration,
    successRate: summary.successRate,
    mostUsedTool: mostUsedTool?.tool_name || 'N/A',
    mostUsedToolset: mostUsedToolset?.toolset || 'N/A',
    topTools,
    topToolsets,
  };
}

export function getUsageTrend(
  db: Database.Database,
  projectPath: string,
  days: number = 30
): UsageTrend[] {
  const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
  
  const stmt = db.prepare(`
    SELECT
      DATE(timestamp / 1000, 'unixepoch') as date,
      COUNT(*) as callCount,
      COUNT(DISTINCT tool_name) as uniqueTools,
      AVG(duration) as avgDuration
    FROM tool_usage
    WHERE project_path = ? AND timestamp >= ?
    GROUP BY date
    ORDER BY date ASC
  `);
  
  return stmt.all(projectPath, cutoff) as UsageTrend[];
}

export function getUnusedTools(
  db: Database.Database,
  projectPath: string,
  availableTools: string[],
  days: number = 30
): string[] {
  const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
  
  const usedToolsStmt = db.prepare(`
    SELECT DISTINCT tool_name
    FROM tool_usage
    WHERE project_path = ? AND timestamp >= ?
  `);
  
  const usedTools = usedToolsStmt.all(projectPath, cutoff) as Array<{ tool_name: string }>;
  const usedToolNames = new Set(usedTools.map(t => t.tool_name));
  
  return availableTools.filter(tool => !usedToolNames.has(tool));
}

export function getFrequentlyFailingTools(
  db: Database.Database,
  projectPath: string,
  days: number = 30,
  minFailures: number = 3
): Array<{ toolName: string; failureCount: number; lastError: string | null }> {
  const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
  
  const stmt = db.prepare(`
    SELECT
      tool_name as toolName,
      SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failureCount,
      MAX(error_message) as lastError
    FROM tool_usage
    WHERE project_path = ? AND timestamp >= ?
    GROUP BY tool_name
    HAVING failureCount >= ?
    ORDER BY failureCount DESC
  `);
  
  return stmt.all(projectPath, cutoff, minFailures) as Array<{
    toolName: string;
    failureCount: number;
    lastError: string | null;
  }>;
}

export function getAllProjects(db: Database.Database): Array<{ projectPath: string; lastSeen: number }> {
  const stmt = db.prepare(`
    SELECT DISTINCT project_path as projectPath, MAX(timestamp) as lastSeen
    FROM tool_usage
    GROUP BY project_path
    ORDER BY lastSeen DESC
  `);
  
  return stmt.all() as Array<{ projectPath: string; lastSeen: number }>;
}

export function exportUsageStats(
  db: Database.Database,
  projectPath: string,
  days: number = 30
): string {
  const summary = getProjectUsageSummary(db, projectPath, days);
  const toolStats = getToolUsageStats(db, projectPath, days);
  const toolsetStats = getToolsetUsageStats(db, projectPath, days);
  const trend = getUsageTrend(db, projectPath, days);
  const failingTools = getFrequentlyFailingTools(db, projectPath, days);
  
  return JSON.stringify({
    projectPath,
    period: `${days} days`,
    summary,
    toolStats,
    toolsetStats,
    trend,
    failingTools,
    exportedAt: new Date().toISOString(),
  }, null, 2);
}

// ── Cached wrapper ──────────────────────────────────────────────────────

const SUMMARY_CACHE_TTL = 300; // 5 minutes in seconds

export function getCachedProjectSummary(
  db: Database.Database,
  projectPath: string,
  days: number = 30
): ProjectUsageSummary | null {
  const cacheKey = `summary_${days}d`;
  const cached = getCachedStats(db, projectPath, cacheKey);
  if (cached) {
    try { return JSON.parse(cached) as ProjectUsageSummary; } catch { /* fall through */ }
  }
  const summary = getProjectUsageSummary(db, projectPath, days);
  if (summary) {
    setCachedStats(db, {
      projectPath,
      cacheKey,
      stats: JSON.stringify(summary),
      computedAt: Date.now(),
      ttl: SUMMARY_CACHE_TTL,
    });
  }
  return summary;
}

// ── Rich formatted display ──────────────────────────────────────────────

function fmtDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60_000).toFixed(1)}m`;
}

function fmtPercent(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function bar(value: number, max: number, width: number = 20): string {
  const filled = max > 0 ? Math.round((value / max) * width) : 0;
  return '\u2588'.repeat(filled) + '\u2591'.repeat(width - filled);
}

export function formatStatsDisplay(
  summary: ProjectUsageSummary,
  projectPath: string
): string {
  const lines: string[] = [];
  const projectName = projectPath.split(/[\\/]/).pop() || projectPath;

  lines.push(`\n=== Usage Analytics: ${projectName} (last 30 days) ===\n`);

  // Overview
  lines.push(`  Total calls:     ${summary.totalCalls.toLocaleString()}`);
  lines.push(`  Unique tools:    ${summary.uniqueToolsUsed}`);
  lines.push(`  Success rate:    ${fmtPercent(summary.successRate)}`);
  lines.push(`  Avg duration:    ${fmtDuration(summary.avgDuration)}`);
  lines.push(`  Total time:      ${fmtDuration(summary.totalDuration)}`);

  // Top tools
  if (summary.topTools.length > 0) {
    lines.push(`\n--- Top Tools ---`);
    const maxCount = summary.topTools[0].count;
    for (const t of summary.topTools) {
      const pct = summary.totalCalls > 0 ? (t.count / summary.totalCalls) : 0;
      lines.push(`  ${bar(t.count, maxCount, 16)} ${t.name} (${t.count} calls, ${fmtPercent(pct)})`);
    }
  }

  // Top toolsets
  if (summary.topToolsets.length > 0) {
    lines.push(`\n--- Top Toolsets ---`);
    const maxCount = summary.topToolsets[0].count;
    for (const t of summary.topToolsets) {
      const pct = summary.totalCalls > 0 ? (t.count / summary.totalCalls) : 0;
      lines.push(`  ${bar(t.count, maxCount, 16)} ${t.name} (${t.count} calls, ${fmtPercent(pct)})`);
    }
  }

  lines.push(`\n  Most used tool:    ${summary.mostUsedTool}`);
  lines.push(`  Most used toolset: ${summary.mostUsedToolset}`);
  lines.push('');

  return lines.join('\n');
}
