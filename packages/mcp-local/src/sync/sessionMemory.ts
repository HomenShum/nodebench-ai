/**
 * sessionMemory.ts — Session-scoped action/failure memory for agent learning.
 *
 * Ported from TA Studio's SessionMemory + LearningStore pattern.
 * Records every action and failure in a session, generates reflection
 * prompts for retry, and persists recovery strategies across sessions.
 *
 * Storage: SQLite (shared with founderEpisodeStore).
 */

import { getDb, genId } from "../db.js";

// ─── Types ───────────────────────────────────────────────────────

export interface ActionRecord {
  actionId: string;
  episodeId: string;
  stepIndex: number;
  toolName: string;
  input: string;       // JSON-stringified args (truncated to 2KB)
  output: string;      // JSON-stringified result (truncated to 2KB)
  success: boolean;
  durationMs: number;
  timestamp: string;
}

export interface FailureRecord {
  failureId: string;
  episodeId: string;
  stepIndex: number;
  toolName: string;
  failureType: string; // "timeout" | "error" | "empty_result" | "invalid_output" | "rate_limit"
  rootCause: string;
  recoveryStrategy: string;
  recoverySuccessful: boolean | null; // null = not yet attempted
  timestamp: string;
}

export interface RecoveryStrategy {
  strategyId: string;
  failureType: string;
  toolName: string;
  strategy: string;
  successCount: number;
  failureCount: number;
  lastUsed: string;
}

// ─── Schema init ─────────────────────────────────────────────────

const MAX_ACTIONS_PER_EPISODE = 200;
const MAX_RECOVERY_STRATEGIES = 100;
const TRUNCATE_LIMIT = 2048;

function truncate(s: string, limit = TRUNCATE_LIMIT): string {
  return s.length > limit ? s.slice(0, limit - 3) + "..." : s;
}

export function initSessionMemoryTables(): void {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS session_actions (
      action_id TEXT PRIMARY KEY,
      episode_id TEXT NOT NULL,
      step_index INTEGER NOT NULL,
      tool_name TEXT NOT NULL,
      input TEXT NOT NULL,
      output TEXT NOT NULL,
      success INTEGER NOT NULL,
      duration_ms INTEGER NOT NULL,
      timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS session_failures (
      failure_id TEXT PRIMARY KEY,
      episode_id TEXT NOT NULL,
      step_index INTEGER NOT NULL,
      tool_name TEXT NOT NULL,
      failure_type TEXT NOT NULL,
      root_cause TEXT NOT NULL,
      recovery_strategy TEXT NOT NULL,
      recovery_successful INTEGER,
      timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS recovery_strategies (
      strategy_id TEXT PRIMARY KEY,
      failure_type TEXT NOT NULL,
      tool_name TEXT NOT NULL,
      strategy TEXT NOT NULL,
      success_count INTEGER NOT NULL DEFAULT 0,
      failure_count INTEGER NOT NULL DEFAULT 0,
      last_used TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_actions_episode ON session_actions(episode_id);
    CREATE INDEX IF NOT EXISTS idx_failures_episode ON session_failures(episode_id);
    CREATE INDEX IF NOT EXISTS idx_recovery_type ON recovery_strategies(failure_type, tool_name);
  `);
}

// ─── Record actions ──────────────────────────────────────────────

export function recordAction(action: Omit<ActionRecord, "actionId">): ActionRecord {
  const db = getDb();
  initSessionMemoryTables();

  const actionId = genId();

  // Enforce bounded memory: evict oldest actions if over limit
  const countStmt = db.prepare("SELECT COUNT(*) as cnt FROM session_actions WHERE episode_id = ?");
  const count = (countStmt.get(action.episodeId) as any)?.cnt ?? 0;
  if (count >= MAX_ACTIONS_PER_EPISODE) {
    db.prepare(
      "DELETE FROM session_actions WHERE action_id IN (SELECT action_id FROM session_actions WHERE episode_id = ? ORDER BY timestamp ASC LIMIT 10)"
    ).run(action.episodeId);
  }

  db.prepare(`
    INSERT INTO session_actions (action_id, episode_id, step_index, tool_name, input, output, success, duration_ms, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    actionId,
    action.episodeId,
    action.stepIndex,
    action.toolName,
    truncate(action.input),
    truncate(action.output),
    action.success ? 1 : 0,
    action.durationMs,
    action.timestamp,
  );

  return { ...action, actionId };
}

// ─── Record failures ─────────────────────────────────────────────

export function recordFailure(failure: Omit<FailureRecord, "failureId">): FailureRecord {
  const db = getDb();
  initSessionMemoryTables();

  const failureId = genId();

  db.prepare(`
    INSERT INTO session_failures (failure_id, episode_id, step_index, tool_name, failure_type, root_cause, recovery_strategy, recovery_successful, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    failureId,
    failure.episodeId,
    failure.stepIndex,
    failure.toolName,
    failure.failureType,
    failure.rootCause,
    failure.recoveryStrategy,
    failure.recoverySuccessful == null ? null : failure.recoverySuccessful ? 1 : 0,
    failure.timestamp,
  );

  return { ...failure, failureId };
}

// ─── Recovery strategy persistence ───────────────────────────────

export function recordRecoveryOutcome(
  failureType: string,
  toolName: string,
  strategy: string,
  succeeded: boolean,
): void {
  const db = getDb();
  initSessionMemoryTables();

  const existing = db.prepare(
    "SELECT strategy_id, success_count, failure_count FROM recovery_strategies WHERE failure_type = ? AND tool_name = ? AND strategy = ?"
  ).get(failureType, toolName, strategy) as any;

  if (existing) {
    if (succeeded) {
      db.prepare("UPDATE recovery_strategies SET success_count = success_count + 1, last_used = ? WHERE strategy_id = ?")
        .run(new Date().toISOString(), existing.strategy_id);
    } else {
      db.prepare("UPDATE recovery_strategies SET failure_count = failure_count + 1, last_used = ? WHERE strategy_id = ?")
        .run(new Date().toISOString(), existing.strategy_id);
    }
  } else {
    // Enforce bounded: evict lowest success rate if over limit
    const countRow = db.prepare("SELECT COUNT(*) as cnt FROM recovery_strategies").get() as any;
    if ((countRow?.cnt ?? 0) >= MAX_RECOVERY_STRATEGIES) {
      db.prepare(
        "DELETE FROM recovery_strategies WHERE strategy_id IN (SELECT strategy_id FROM recovery_strategies ORDER BY (CAST(success_count AS REAL) / MAX(success_count + failure_count, 1)) ASC LIMIT 5)"
      ).run();
    }

    db.prepare(`
      INSERT INTO recovery_strategies (strategy_id, failure_type, tool_name, strategy, success_count, failure_count, last_used)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(genId(), failureType, toolName, strategy, succeeded ? 1 : 0, succeeded ? 0 : 1, new Date().toISOString());
  }
}

// ─── Reflection prompt generation ────────────────────────────────

export function getReflectionPrompt(failureType: string, toolName: string): string {
  const db = getDb();
  initSessionMemoryTables();

  // Get proven recovery strategies for this failure type
  const strategies = db.prepare(
    "SELECT strategy, success_count, failure_count FROM recovery_strategies WHERE failure_type = ? AND tool_name = ? AND success_count > 0 ORDER BY success_count DESC LIMIT 3"
  ).all(failureType, toolName) as RecoveryStrategy[];

  if (strategies.length === 0) {
    return `No known recovery strategies for ${failureType} on ${toolName}. Try a different approach.`;
  }

  const lines = strategies.map((s, i) =>
    `${i + 1}. "${s.strategy}" (succeeded ${s.success_count}x, failed ${s.failure_count}x)`,
  );

  return `Known recovery strategies for ${failureType} on ${toolName}:\n${lines.join("\n")}\nUse the most successful strategy, or try a new approach if all have been exhausted.`;
}

// ─── Query helpers ────────────────────────────────────────────────

export function getSessionActions(episodeId: string): ActionRecord[] {
  const db = getDb();
  initSessionMemoryTables();
  return db.prepare("SELECT * FROM session_actions WHERE episode_id = ? ORDER BY step_index ASC").all(episodeId) as any[];
}

export function getSessionFailures(episodeId: string): FailureRecord[] {
  const db = getDb();
  initSessionMemoryTables();
  return db.prepare("SELECT * FROM session_failures WHERE episode_id = ? ORDER BY step_index ASC").all(episodeId) as any[];
}
