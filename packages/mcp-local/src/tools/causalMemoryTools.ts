/**
 * causalMemoryTools — Phase 10 Causal Memory
 *
 * Records typed events, navigation paths, state diffs, and important changes
 * into a causal event ledger. Supports causal chain tracing, path replay,
 * state diff history, and trajectory summaries.
 *
 * All data stored in local SQLite via the shared getDb().
 */

import type { McpTool } from "../types.js";
import { getDb, genId } from "../db.js";
import crypto from "node:crypto";

/* ------------------------------------------------------------------ */
/*  Schema bootstrap (idempotent)                                      */
/* ------------------------------------------------------------------ */

let _schemaReady = false;

function ensureSchema(): void {
  if (_schemaReady) return;
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS causal_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      eventId TEXT UNIQUE NOT NULL,
      eventType TEXT NOT NULL,
      actorType TEXT NOT NULL,
      entityType TEXT NOT NULL,
      entityId TEXT NOT NULL,
      summary TEXT NOT NULL,
      details TEXT,
      causedByEventId TEXT,
      correlationId TEXT,
      timestampMs INTEGER NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_causal_events_eventId ON causal_events(eventId);
    CREATE INDEX IF NOT EXISTS idx_causal_events_entityType ON causal_events(entityType);
    CREATE INDEX IF NOT EXISTS idx_causal_events_entityId ON causal_events(entityId);
    CREATE INDEX IF NOT EXISTS idx_causal_events_eventType ON causal_events(eventType);
    CREATE INDEX IF NOT EXISTS idx_causal_events_causedBy ON causal_events(causedByEventId);
    CREATE INDEX IF NOT EXISTS idx_causal_events_correlationId ON causal_events(correlationId);
    CREATE INDEX IF NOT EXISTS idx_causal_events_timestampMs ON causal_events(timestampMs);

    CREATE TABLE IF NOT EXISTS causal_path_steps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stepId TEXT UNIQUE NOT NULL,
      sessionId TEXT NOT NULL,
      surfaceType TEXT NOT NULL,
      surfaceRef TEXT NOT NULL,
      surfaceLabel TEXT NOT NULL,
      entityType TEXT,
      entityId TEXT,
      transitionFrom TEXT,
      timestampMs INTEGER NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_causal_path_steps_stepId ON causal_path_steps(stepId);
    CREATE INDEX IF NOT EXISTS idx_causal_path_steps_sessionId ON causal_path_steps(sessionId);
    CREATE INDEX IF NOT EXISTS idx_causal_path_steps_timestampMs ON causal_path_steps(timestampMs);

    CREATE TABLE IF NOT EXISTS causal_state_diffs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      diffId TEXT UNIQUE NOT NULL,
      entityType TEXT NOT NULL,
      entityId TEXT NOT NULL,
      changeType TEXT NOT NULL,
      beforeState TEXT NOT NULL,
      afterState TEXT NOT NULL,
      changedFields TEXT NOT NULL,
      reason TEXT,
      timestampMs INTEGER NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_causal_state_diffs_diffId ON causal_state_diffs(diffId);
    CREATE INDEX IF NOT EXISTS idx_causal_state_diffs_entityType ON causal_state_diffs(entityType);
    CREATE INDEX IF NOT EXISTS idx_causal_state_diffs_entityId ON causal_state_diffs(entityId);
    CREATE INDEX IF NOT EXISTS idx_causal_state_diffs_timestampMs ON causal_state_diffs(timestampMs);

    CREATE TABLE IF NOT EXISTS causal_important_changes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      changeId TEXT UNIQUE NOT NULL,
      changeCategory TEXT NOT NULL,
      impactScore REAL NOT NULL,
      impactReason TEXT NOT NULL,
      affectedEntities TEXT NOT NULL,
      suggestedAction TEXT,
      status TEXT NOT NULL DEFAULT 'detected',
      timestampMs INTEGER NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_causal_important_changes_changeId ON causal_important_changes(changeId);
    CREATE INDEX IF NOT EXISTS idx_causal_important_changes_status ON causal_important_changes(status);
    CREATE INDEX IF NOT EXISTS idx_causal_important_changes_timestampMs ON causal_important_changes(timestampMs);
  `);
  _schemaReady = true;
}

/* ------------------------------------------------------------------ */
/*  Tools                                                              */
/* ------------------------------------------------------------------ */

export const causalMemoryTools: McpTool[] = [
  // --- 1. record_event ---------------------------------------------------
  {
    name: "record_event",
    description:
      "Record a typed event to the causal event ledger. Supports causal linking via causedByEventId and correlation grouping via correlationId.",
    inputSchema: {
      type: "object",
      properties: {
        eventType: {
          type: "string",
          description:
            "Canonical event type (e.g. entity_created, status_changed, decision_made, artifact_generated, investigation_started, task_completed, priority_changed, confidence_updated, agent_action, user_action)",
        },
        actorType: {
          type: "string",
          description: "Who caused this event (e.g. user, agent, system, cron)",
        },
        entityType: {
          type: "string",
          description: "Entity type affected (e.g. company, initiative, task, artifact, memo, investigation)",
        },
        entityId: {
          type: "string",
          description: "ID of the entity affected",
        },
        summary: {
          type: "string",
          description: "Human-readable summary of what happened",
        },
        details: {
          type: "object",
          description: "Optional structured JSON details about the event",
        },
        causedByEventId: {
          type: "string",
          description: "Optional eventId of the event that caused this one (for causal chain tracing)",
        },
        correlationId: {
          type: "string",
          description: "Optional correlation ID to group related events across a workflow",
        },
      },
      required: ["eventType", "actorType", "entityType", "entityId", "summary"],
    },
    handler: async (args: {
      eventType: string;
      actorType: string;
      entityType: string;
      entityId: string;
      summary: string;
      details?: Record<string, unknown>;
      causedByEventId?: string;
      correlationId?: string;
    }) => {
      ensureSchema();
      const db = getDb();
      const now = Date.now();
      const eventId = `evt_${crypto.randomUUID()}`;

      db.prepare(
        `INSERT INTO causal_events
          (eventId, eventType, actorType, entityType, entityId, summary, details, causedByEventId, correlationId, timestampMs, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        eventId,
        args.eventType,
        args.actorType,
        args.entityType,
        args.entityId,
        args.summary,
        args.details ? JSON.stringify(args.details) : null,
        args.causedByEventId ?? null,
        args.correlationId ?? null,
        now,
        new Date(now).toISOString(),
      );

      return { eventId, timestampMs: now, recorded: true };
    },
  },

  // --- 2. record_path_step -----------------------------------------------
  {
    name: "record_path_step",
    description:
      "Record a navigation/exploration step in the user's path through surfaces, entities, artifacts, or external resources.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: {
          type: "string",
          description: "Session identifier for grouping path steps",
        },
        surfaceType: {
          type: "string",
          enum: ["view", "entity", "artifact", "agent_task", "search", "external"],
          description: "Type of surface visited",
        },
        surfaceRef: {
          type: "string",
          description: "Reference identifier for the surface (route, entity ID, URL, etc.)",
        },
        surfaceLabel: {
          type: "string",
          description: "Human-readable label for the surface",
        },
        entityType: {
          type: "string",
          description: "Optional entity type if the surface is entity-scoped",
        },
        entityId: {
          type: "string",
          description: "Optional entity ID if the surface is entity-scoped",
        },
        transitionFrom: {
          type: "string",
          description: "Optional stepId of the previous step (for explicit path linking)",
        },
      },
      required: ["sessionId", "surfaceType", "surfaceRef", "surfaceLabel"],
    },
    handler: async (args: {
      sessionId: string;
      surfaceType: string;
      surfaceRef: string;
      surfaceLabel: string;
      entityType?: string;
      entityId?: string;
      transitionFrom?: string;
    }) => {
      ensureSchema();
      const db = getDb();
      const now = Date.now();
      const stepId = `step_${crypto.randomUUID()}`;

      db.prepare(
        `INSERT INTO causal_path_steps
          (stepId, sessionId, surfaceType, surfaceRef, surfaceLabel, entityType, entityId, transitionFrom, timestampMs, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        stepId,
        args.sessionId,
        args.surfaceType,
        args.surfaceRef,
        args.surfaceLabel,
        args.entityType ?? null,
        args.entityId ?? null,
        args.transitionFrom ?? null,
        now,
        new Date(now).toISOString(),
      );

      return { stepId, timestampMs: now, recorded: true };
    },
  },

  // --- 3. record_state_diff ----------------------------------------------
  {
    name: "record_state_diff",
    description:
      "Record a before/after state change on an entity. Tracks what changed, which fields, and why.",
    inputSchema: {
      type: "object",
      properties: {
        entityType: {
          type: "string",
          description: "Entity type (e.g. company, initiative, task, artifact)",
        },
        entityId: {
          type: "string",
          description: "ID of the entity that changed",
        },
        changeType: {
          type: "string",
          enum: ["identity", "status", "priority", "content", "confidence", "assignment", "structural"],
          description: "Category of change",
        },
        beforeState: {
          type: "object",
          description: "State before the change (JSON)",
        },
        afterState: {
          type: "object",
          description: "State after the change (JSON)",
        },
        changedFields: {
          type: "array",
          items: { type: "string" },
          description: "List of field names that changed",
        },
        reason: {
          type: "string",
          description: "Optional reason for the change",
        },
      },
      required: ["entityType", "entityId", "changeType", "beforeState", "afterState", "changedFields"],
    },
    handler: async (args: {
      entityType: string;
      entityId: string;
      changeType: string;
      beforeState: Record<string, unknown>;
      afterState: Record<string, unknown>;
      changedFields: string[];
      reason?: string;
    }) => {
      ensureSchema();
      const db = getDb();
      const now = Date.now();
      const diffId = `diff_${crypto.randomUUID()}`;

      db.prepare(
        `INSERT INTO causal_state_diffs
          (diffId, entityType, entityId, changeType, beforeState, afterState, changedFields, reason, timestampMs, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        diffId,
        args.entityType,
        args.entityId,
        args.changeType,
        JSON.stringify(args.beforeState),
        JSON.stringify(args.afterState),
        JSON.stringify(args.changedFields),
        args.reason ?? null,
        now,
        new Date(now).toISOString(),
      );

      return { diffId, timestampMs: now, recorded: true };
    },
  },

  // --- 4. get_event_ledger ------------------------------------------------
  {
    name: "get_event_ledger",
    description:
      "Query the causal event ledger with optional filtering by entityId, eventType, entityType, or correlationId.",
    inputSchema: {
      type: "object",
      properties: {
        entityId: {
          type: "string",
          description: "Filter by entity ID",
        },
        eventType: {
          type: "string",
          description: "Filter by event type",
        },
        entityType: {
          type: "string",
          description: "Filter by entity type",
        },
        correlationId: {
          type: "string",
          description: "Filter by correlation ID",
        },
        limit: {
          type: "number",
          description: "Max events to return (default 50)",
        },
      },
    },
    annotations: { readOnlyHint: true },
    handler: async (args: {
      entityId?: string;
      eventType?: string;
      entityType?: string;
      correlationId?: string;
      limit?: number;
    }) => {
      ensureSchema();
      const db = getDb();
      const limit = args.limit ?? 50;

      const conditions: string[] = [];
      const params: unknown[] = [];

      if (args.entityId) {
        conditions.push("entityId = ?");
        params.push(args.entityId);
      }
      if (args.eventType) {
        conditions.push("eventType = ?");
        params.push(args.eventType);
      }
      if (args.entityType) {
        conditions.push("entityType = ?");
        params.push(args.entityType);
      }
      if (args.correlationId) {
        conditions.push("correlationId = ?");
        params.push(args.correlationId);
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
      params.push(limit);

      const events = db
        .prepare(
          `SELECT eventId, eventType, actorType, entityType, entityId, summary, details, causedByEventId, correlationId, timestampMs, createdAt
           FROM causal_events ${where}
           ORDER BY timestampMs DESC LIMIT ?`,
        )
        .all(...params) as any[];

      return {
        totalReturned: events.length,
        events: events.map((e) => ({
          ...e,
          details: e.details ? JSON.parse(e.details) : null,
        })),
      };
    },
  },

  // --- 5. get_causal_chain ------------------------------------------------
  {
    name: "get_causal_chain",
    description:
      "Trace the causality chain from a given event backwards through causedByEventId links. Returns the chain of events that led to this one.",
    inputSchema: {
      type: "object",
      properties: {
        eventId: {
          type: "string",
          description: "The event ID to trace backwards from",
        },
        maxDepth: {
          type: "number",
          description: "Maximum depth to trace (default 10)",
        },
      },
      required: ["eventId"],
    },
    annotations: { readOnlyHint: true },
    handler: async (args: { eventId: string; maxDepth?: number }) => {
      ensureSchema();
      const db = getDb();
      const maxDepth = args.maxDepth ?? 10;

      const chain: any[] = [];
      let currentId: string | null = args.eventId;
      let depth = 0;
      const visited = new Set<string>();

      while (currentId && depth < maxDepth) {
        if (visited.has(currentId)) break; // cycle protection
        visited.add(currentId);

        const event = db
          .prepare(
            `SELECT eventId, eventType, actorType, entityType, entityId, summary, details, causedByEventId, correlationId, timestampMs, createdAt
             FROM causal_events WHERE eventId = ?`,
          )
          .get(currentId) as any;

        if (!event) break;

        chain.push({
          ...event,
          details: event.details ? JSON.parse(event.details) : null,
          depth,
        });

        currentId = event.causedByEventId;
        depth++;
      }

      return {
        rootEventId: args.eventId,
        chainLength: chain.length,
        maxDepthReached: depth >= maxDepth,
        chain,
      };
    },
  },

  // --- 6. get_path_replay -------------------------------------------------
  {
    name: "get_path_replay",
    description:
      "Replay a session's navigation path in chronological order, including computed dwell times between steps.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: {
          type: "string",
          description: "Session ID to replay",
        },
      },
      required: ["sessionId"],
    },
    annotations: { readOnlyHint: true },
    handler: async (args: { sessionId: string }) => {
      ensureSchema();
      const db = getDb();

      const steps = db
        .prepare(
          `SELECT stepId, surfaceType, surfaceRef, surfaceLabel, entityType, entityId, transitionFrom, timestampMs, createdAt
           FROM causal_path_steps WHERE sessionId = ?
           ORDER BY timestampMs ASC`,
        )
        .all(args.sessionId) as any[];

      // Compute dwell time between consecutive steps
      const stepsWithDuration = steps.map((step: any, i: number) => {
        const dwellMs = i < steps.length - 1 ? steps[i + 1].timestampMs - step.timestampMs : null;
        return { ...step, dwellMs };
      });

      const totalDurationMs =
        steps.length >= 2 ? steps[steps.length - 1].timestampMs - steps[0].timestampMs : 0;

      return {
        sessionId: args.sessionId,
        stepCount: steps.length,
        totalDurationMs,
        steps: stepsWithDuration,
      };
    },
  },

  // --- 7. get_state_diff_history ------------------------------------------
  {
    name: "get_state_diff_history",
    description:
      "Get the change history for a specific entity, showing all recorded state diffs in reverse chronological order.",
    inputSchema: {
      type: "object",
      properties: {
        entityType: {
          type: "string",
          description: "Entity type to query",
        },
        entityId: {
          type: "string",
          description: "Entity ID to query",
        },
        limit: {
          type: "number",
          description: "Max diffs to return (default 20)",
        },
      },
      required: ["entityType", "entityId"],
    },
    annotations: { readOnlyHint: true },
    handler: async (args: { entityType: string; entityId: string; limit?: number }) => {
      ensureSchema();
      const db = getDb();
      const limit = args.limit ?? 20;

      const diffs = db
        .prepare(
          `SELECT diffId, entityType, entityId, changeType, beforeState, afterState, changedFields, reason, timestampMs, createdAt
           FROM causal_state_diffs
           WHERE entityType = ? AND entityId = ?
           ORDER BY timestampMs DESC LIMIT ?`,
        )
        .all(args.entityType, args.entityId, limit) as any[];

      return {
        entityType: args.entityType,
        entityId: args.entityId,
        totalReturned: diffs.length,
        diffs: diffs.map((d) => ({
          ...d,
          beforeState: JSON.parse(d.beforeState),
          afterState: JSON.parse(d.afterState),
          changedFields: JSON.parse(d.changedFields),
        })),
      };
    },
  },

  // --- 8. get_trajectory_summary ------------------------------------------
  {
    name: "get_trajectory_summary",
    description:
      "Compute a trajectory summary for a date range: event counts by type, diff counts by change type, path step counts, and top affected entities.",
    inputSchema: {
      type: "object",
      properties: {
        startDate: {
          type: "string",
          description: "Start date in YYYY-MM-DD format",
        },
        endDate: {
          type: "string",
          description: "End date in YYYY-MM-DD format (defaults to today)",
        },
      },
      required: ["startDate"],
    },
    annotations: { readOnlyHint: true },
    handler: async (args: { startDate: string; endDate?: string }) => {
      ensureSchema();
      const db = getDb();

      const startMs = new Date(args.startDate + "T00:00:00Z").getTime();
      const endDate = args.endDate ?? new Date().toISOString().slice(0, 10);
      const endMs = new Date(endDate + "T23:59:59.999Z").getTime();

      // Events by type
      const eventsByType = db
        .prepare(
          `SELECT eventType, COUNT(*) as count
           FROM causal_events WHERE timestampMs BETWEEN ? AND ?
           GROUP BY eventType ORDER BY count DESC`,
        )
        .all(startMs, endMs) as any[];

      const totalEvents = db
        .prepare(
          `SELECT COUNT(*) as count FROM causal_events WHERE timestampMs BETWEEN ? AND ?`,
        )
        .get(startMs, endMs) as any;

      // Diffs by change type
      const diffsByType = db
        .prepare(
          `SELECT changeType, COUNT(*) as count
           FROM causal_state_diffs WHERE timestampMs BETWEEN ? AND ?
           GROUP BY changeType ORDER BY count DESC`,
        )
        .all(startMs, endMs) as any[];

      const totalDiffs = db
        .prepare(
          `SELECT COUNT(*) as count FROM causal_state_diffs WHERE timestampMs BETWEEN ? AND ?`,
        )
        .get(startMs, endMs) as any;

      // Path steps
      const totalPathSteps = db
        .prepare(
          `SELECT COUNT(*) as count FROM causal_path_steps WHERE timestampMs BETWEEN ? AND ?`,
        )
        .get(startMs, endMs) as any;

      const uniqueSessions = db
        .prepare(
          `SELECT COUNT(DISTINCT sessionId) as count FROM causal_path_steps WHERE timestampMs BETWEEN ? AND ?`,
        )
        .get(startMs, endMs) as any;

      // Top affected entities (by event count)
      const topEntities = db
        .prepare(
          `SELECT entityType, entityId, COUNT(*) as eventCount
           FROM causal_events WHERE timestampMs BETWEEN ? AND ?
           GROUP BY entityType, entityId ORDER BY eventCount DESC LIMIT 10`,
        )
        .all(startMs, endMs) as any[];

      // Important changes in range
      const importantChanges = db
        .prepare(
          `SELECT COUNT(*) as count FROM causal_important_changes WHERE timestampMs BETWEEN ? AND ?`,
        )
        .get(startMs, endMs) as any;

      return {
        startDate: args.startDate,
        endDate,
        events: {
          total: totalEvents.count,
          byType: Object.fromEntries(eventsByType.map((r: any) => [r.eventType, r.count])),
        },
        diffs: {
          total: totalDiffs.count,
          byChangeType: Object.fromEntries(diffsByType.map((r: any) => [r.changeType, r.count])),
        },
        pathSteps: {
          total: totalPathSteps.count,
          uniqueSessions: uniqueSessions.count,
        },
        importantChanges: importantChanges.count,
        topAffectedEntities: topEntities,
      };
    },
  },

  // --- 9. flag_important_change -------------------------------------------
  {
    name: "flag_important_change",
    description:
      "Flag a detected important change with impact scoring, affected entities, and optional suggested action. Used by agents to surface significant state transitions.",
    inputSchema: {
      type: "object",
      properties: {
        changeCategory: {
          type: "string",
          description: "Category of the change (e.g. risk_escalation, opportunity_detected, contradiction_found, confidence_shift, priority_reversal, new_evidence)",
        },
        impactScore: {
          type: "number",
          description: "Impact score from 0.0 (negligible) to 1.0 (critical)",
        },
        impactReason: {
          type: "string",
          description: "Human-readable explanation of why this change is important",
        },
        affectedEntities: {
          type: "array",
          items: {
            type: "object",
            properties: {
              entityType: { type: "string" },
              entityId: { type: "string" },
            },
            required: ["entityType", "entityId"],
          },
          description: "List of entities affected by this change",
        },
        suggestedAction: {
          type: "string",
          description: "Optional suggested next action to take",
        },
      },
      required: ["changeCategory", "impactScore", "impactReason", "affectedEntities"],
    },
    handler: async (args: {
      changeCategory: string;
      impactScore: number;
      impactReason: string;
      affectedEntities: Array<{ entityType: string; entityId: string }>;
      suggestedAction?: string;
    }) => {
      ensureSchema();
      const db = getDb();
      const now = Date.now();
      const changeId = `chg_${crypto.randomUUID()}`;

      db.prepare(
        `INSERT INTO causal_important_changes
          (changeId, changeCategory, impactScore, impactReason, affectedEntities, suggestedAction, status, timestampMs, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, 'detected', ?, ?)`,
      ).run(
        changeId,
        args.changeCategory,
        args.impactScore,
        args.impactReason,
        JSON.stringify(args.affectedEntities),
        args.suggestedAction ?? null,
        now,
        new Date(now).toISOString(),
      );

      return { changeId, timestampMs: now, recorded: true };
    },
  },

  // --- 10. get_important_changes ------------------------------------------
  {
    name: "get_important_changes",
    description:
      "Query flagged important changes with optional status filtering. Returns changes ordered by timestamp descending.",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["detected", "acknowledged", "investigating", "resolved", "dismissed"],
          description: "Filter by status (optional)",
        },
        limit: {
          type: "number",
          description: "Max changes to return (default 20)",
        },
      },
    },
    annotations: { readOnlyHint: true },
    handler: async (args: { status?: string; limit?: number }) => {
      ensureSchema();
      const db = getDb();
      const limit = args.limit ?? 20;

      let query: string;
      let params: unknown[];

      if (args.status) {
        query = `SELECT changeId, changeCategory, impactScore, impactReason, affectedEntities, suggestedAction, status, timestampMs, createdAt
                 FROM causal_important_changes WHERE status = ?
                 ORDER BY timestampMs DESC LIMIT ?`;
        params = [args.status, limit];
      } else {
        query = `SELECT changeId, changeCategory, impactScore, impactReason, affectedEntities, suggestedAction, status, timestampMs, createdAt
                 FROM causal_important_changes
                 ORDER BY timestampMs DESC LIMIT ?`;
        params = [limit];
      }

      const changes = db.prepare(query).all(...params) as any[];

      return {
        totalReturned: changes.length,
        changes: changes.map((c) => ({
          ...c,
          affectedEntities: JSON.parse(c.affectedEntities),
        })),
      };
    },
  },
];
