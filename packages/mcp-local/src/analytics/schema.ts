/**
 * Usage Analytics Schema for NodeBench MCP
 * 
 * Tracks tool usage, project context, and generates smart preset recommendations.
 * All data stored locally in SQLite at ~/.nodebench/analytics.db
 */

import Database from 'better-sqlite3';
import path from 'path';
import os from 'os';
import fs from 'fs';

const DB_DIR = path.join(os.homedir(), '.nodebench');
const DB_PATH = path.join(DB_DIR, 'analytics.db');

let _analyticsDb: Database.Database | null = null;

export interface ToolUsageRecord {
  id?: number;
  toolName: string;
  toolset: string;
  timestamp: number;
  duration: number; // milliseconds
  success: boolean;
  errorMessage?: string;
  projectPath: string;
  preset: string;
  args?: string; // JSON string of arguments
}

export interface ProjectContextRecord {
  id?: number;
  projectPath: string;
  projectType: string;
  detectedAt: number;
  lastSeen: number;
  language: string;
  framework?: string;
  hasTests: boolean;
  hasCI: boolean;
  hasDocs: boolean;
  fileCount: number;
}

export interface PresetHistoryRecord {
  id?: number;
  projectPath: string;
  preset: string;
  toolsetCount: number;
  selectedAt: number;
  selectionReason: 'manual' | 'smart' | 'default';
}

export interface UsageStatsCacheRecord {
  id?: number;
  projectPath: string;
  cacheKey: string;
  stats: string; // JSON string
  computedAt: number;
  ttl: number; // seconds
}

export function initAnalyticsDb(): Database.Database {
  fs.mkdirSync(DB_DIR, { recursive: true });
  const db = new Database(DB_PATH);
  
  // Enable WAL mode for better concurrency
  db.pragma('journal_mode = WAL');
  
  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS tool_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tool_name TEXT NOT NULL,
      toolset TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      duration INTEGER NOT NULL,
      success BOOLEAN NOT NULL,
      error_message TEXT,
      project_path TEXT NOT NULL,
      preset TEXT NOT NULL,
      args TEXT
    );
    
    CREATE INDEX IF NOT EXISTS idx_tool_usage_tool ON tool_usage(tool_name);
    CREATE INDEX IF NOT EXISTS idx_tool_usage_toolset ON tool_usage(toolset);
    CREATE INDEX IF NOT EXISTS idx_tool_usage_project ON tool_usage(project_path);
    CREATE INDEX IF NOT EXISTS idx_tool_usage_timestamp ON tool_usage(timestamp);
    
    CREATE TABLE IF NOT EXISTS project_context (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_path TEXT UNIQUE NOT NULL,
      project_type TEXT NOT NULL,
      detected_at INTEGER NOT NULL,
      last_seen INTEGER NOT NULL,
      language TEXT NOT NULL,
      framework TEXT,
      has_tests BOOLEAN NOT NULL,
      has_ci BOOLEAN NOT NULL,
      has_docs BOOLEAN NOT NULL,
      file_count INTEGER NOT NULL
    );
    
    CREATE INDEX IF NOT EXISTS idx_project_context_type ON project_context(project_type);
    CREATE INDEX IF NOT EXISTS idx_project_context_last_seen ON project_context(last_seen);
    
    CREATE TABLE IF NOT EXISTS preset_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_path TEXT NOT NULL,
      preset TEXT NOT NULL,
      toolset_count INTEGER NOT NULL,
      selected_at INTEGER NOT NULL,
      selection_reason TEXT NOT NULL
    );
    
    CREATE INDEX IF NOT EXISTS idx_preset_history_project ON preset_history(project_path);
    CREATE INDEX IF NOT EXISTS idx_preset_history_timestamp ON preset_history(selected_at);
    
    CREATE TABLE IF NOT EXISTS usage_stats_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_path TEXT NOT NULL,
      cache_key TEXT NOT NULL,
      stats TEXT NOT NULL,
      computed_at INTEGER NOT NULL,
      ttl INTEGER NOT NULL,
      UNIQUE(project_path, cache_key)
    );
    
    CREATE INDEX IF NOT EXISTS idx_usage_stats_cache_key ON usage_stats_cache(project_path, cache_key);
  `);
  
  return db;
}

export function getAnalyticsDb(): Database.Database {
  if (_analyticsDb) return _analyticsDb;
  _analyticsDb = initAnalyticsDb();
  return _analyticsDb;
}

export function closeAnalyticsDb(db: Database.Database): void {
  db.close();
  if (_analyticsDb === db) _analyticsDb = null;
}

// Helper functions for common queries
export function recordToolUsage(
  db: Database.Database,
  record: Omit<ToolUsageRecord, 'id'>
): void {
  const stmt = db.prepare(`
    INSERT INTO tool_usage (
      tool_name, toolset, timestamp, duration, success,
      error_message, project_path, preset, args
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    record.toolName,
    record.toolset,
    record.timestamp,
    record.duration,
    record.success ? 1 : 0,
    record.errorMessage || null,
    record.projectPath,
    record.preset,
    record.args || null
  );
}

export function updateProjectContext(
  db: Database.Database,
  context: Omit<ProjectContextRecord, 'id'>
): void {
  const stmt = db.prepare(`
    INSERT INTO project_context (
      project_path, project_type, detected_at, last_seen,
      language, framework, has_tests, has_ci, has_docs, file_count
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(project_path) DO UPDATE SET
      project_type = excluded.project_type,
      last_seen = excluded.last_seen,
      language = excluded.language,
      framework = excluded.framework,
      has_tests = excluded.has_tests,
      has_ci = excluded.has_ci,
      has_docs = excluded.has_docs,
      file_count = excluded.file_count
  `);
  
  stmt.run(
    context.projectPath,
    context.projectType,
    context.detectedAt,
    context.lastSeen,
    context.language,
    context.framework || null,
    context.hasTests ? 1 : 0,
    context.hasCI ? 1 : 0,
    context.hasDocs ? 1 : 0,
    context.fileCount
  );
}

export function recordPresetSelection(
  db: Database.Database,
  record: Omit<PresetHistoryRecord, 'id'>
): void {
  const stmt = db.prepare(`
    INSERT INTO preset_history (
      project_path, preset, toolset_count, selected_at, selection_reason
    ) VALUES (?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    record.projectPath,
    record.preset,
    record.toolsetCount,
    record.selectedAt,
    record.selectionReason
  );
}

export function getCachedStats(
  db: Database.Database,
  projectPath: string,
  cacheKey: string
): string | null {
  const stmt = db.prepare(`
    SELECT stats FROM usage_stats_cache
    WHERE project_path = ? AND cache_key = ?
      AND computed_at + (ttl * 1000) > ?
  `);
  
  const now = Date.now();
  const result = stmt.get(projectPath, cacheKey, now) as { stats: string } | undefined;
  
  return result?.stats || null;
}

export function setCachedStats(
  db: Database.Database,
  record: Omit<UsageStatsCacheRecord, 'id'>
): void {
  const stmt = db.prepare(`
    INSERT INTO usage_stats_cache (
      project_path, cache_key, stats, computed_at, ttl
    ) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(project_path, cache_key) DO UPDATE SET
      stats = excluded.stats,
      computed_at = excluded.computed_at,
      ttl = excluded.ttl
  `);
  
  stmt.run(
    record.projectPath,
    record.cacheKey,
    record.stats,
    record.computedAt,
    record.ttl
  );
}

export function clearOldRecords(db: Database.Database, daysToKeep: number = 90): void {
  const cutoff = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
  
  db.prepare('DELETE FROM tool_usage WHERE timestamp < ?').run(cutoff);
  db.prepare('DELETE FROM usage_stats_cache WHERE computed_at < ?').run(cutoff);
  
  // Don't delete project_context or preset_history - they're useful for history
}
