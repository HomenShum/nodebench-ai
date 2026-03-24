/**
 * dogfoodJudgeTools — Dogfood Judge Fix System (Phase 13)
 *
 * Measures whether NodeBench actually removes repeat cognition:
 * - Session recording: track manual corrections, repeated questions, packet usefulness
 * - 6-dimension judging: truth, compression, anticipation, output, delegation, trust
 * - Failure triage: classify by canonical system layer taxonomy
 * - Replay verification: prove fixes work, detect regressions
 * - Repeat cognition metrics: the core compound metric
 */

import type { McpTool } from "../types.js";
import { getDb, genId } from "../db.js";

/* ------------------------------------------------------------------ */
/*  Schema bootstrap (idempotent)                                      */
/* ------------------------------------------------------------------ */

let _schemaReady = false;

export function ensureDogfoodSchema(): void {
  if (_schemaReady) return;
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS dogfood_sessions (
      sessionId TEXT PRIMARY KEY,
      loopType TEXT NOT NULL,
      startedAt INTEGER NOT NULL,
      endedAt INTEGER,
      transcript TEXT,
      packetVersionUsed TEXT,
      artifactsProduced TEXT,
      manualCorrections TEXT,
      repeatedQuestions TEXT,
      timeToFirstUsefulOutput INTEGER,
      delegationSucceeded INTEGER,
      packetExported INTEGER,
      overallNotes TEXT
    );

    CREATE TABLE IF NOT EXISTS judge_runs (
      runId TEXT PRIMARY KEY,
      sessionId TEXT REFERENCES dogfood_sessions(sessionId),
      judgedAt INTEGER NOT NULL,
      truthQuality REAL,
      compressionQuality REAL,
      anticipationQuality REAL,
      outputQuality REAL,
      delegationQuality REAL,
      trustQuality REAL,
      overallScore REAL,
      notes TEXT,
      failureClasses TEXT
    );

    CREATE TABLE IF NOT EXISTS failure_cases (
      caseId TEXT PRIMARY KEY,
      sessionId TEXT REFERENCES dogfood_sessions(sessionId),
      judgeRunId TEXT REFERENCES judge_runs(runId),
      symptom TEXT NOT NULL,
      rootCause TEXT NOT NULL,
      systemLayer TEXT NOT NULL,
      severity TEXT DEFAULT 'medium',
      frequency INTEGER DEFAULT 1,
      fixAttemptId TEXT,
      status TEXT DEFAULT 'open',
      createdAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS fix_attempts (
      attemptId TEXT PRIMARY KEY,
      caseId TEXT REFERENCES failure_cases(caseId),
      failureClass TEXT NOT NULL,
      rootCause TEXT NOT NULL,
      layerCorrected TEXT NOT NULL,
      description TEXT NOT NULL,
      replayProof TEXT,
      regressionProtection TEXT,
      status TEXT DEFAULT 'proposed',
      createdAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS replay_runs (
      replayId TEXT PRIMARY KEY,
      originalSessionId TEXT REFERENCES dogfood_sessions(sessionId),
      fixAttemptId TEXT REFERENCES fix_attempts(attemptId),
      replayedAt INTEGER NOT NULL,
      priorScores TEXT,
      newScores TEXT,
      improved INTEGER,
      regressionDetected INTEGER,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS repeat_question_events (
      eventId TEXT PRIMARY KEY,
      question TEXT NOT NULL,
      sessionId TEXT,
      priorSessionId TEXT,
      timeSinceLastAsked INTEGER,
      shouldHaveBeenWarm INTEGER DEFAULT 1,
      detectedAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS manual_correction_events (
      eventId TEXT PRIMARY KEY,
      sessionId TEXT,
      field TEXT NOT NULL,
      beforeValue TEXT,
      afterValue TEXT,
      correctionType TEXT,
      detectedAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS packet_usefulness_ratings (
      ratingId TEXT PRIMARY KEY,
      sessionId TEXT,
      packetType TEXT,
      exported INTEGER DEFAULT 0,
      delegated INTEGER DEFAULT 0,
      reused INTEGER DEFAULT 0,
      abandoned INTEGER DEFAULT 0,
      humanEditsCount INTEGER DEFAULT 0,
      ratedAt INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_dogfood_sessions_loop ON dogfood_sessions(loopType);
    CREATE INDEX IF NOT EXISTS idx_judge_runs_session ON judge_runs(sessionId);
    CREATE INDEX IF NOT EXISTS idx_failure_cases_session ON failure_cases(sessionId);
    CREATE INDEX IF NOT EXISTS idx_failure_cases_status ON failure_cases(status);
    CREATE INDEX IF NOT EXISTS idx_failure_cases_layer ON failure_cases(systemLayer);
    CREATE INDEX IF NOT EXISTS idx_fix_attempts_case ON fix_attempts(caseId);
    CREATE INDEX IF NOT EXISTS idx_replay_runs_session ON replay_runs(originalSessionId);
    CREATE INDEX IF NOT EXISTS idx_repeat_questions_session ON repeat_question_events(sessionId);
    CREATE INDEX IF NOT EXISTS idx_manual_corrections_session ON manual_correction_events(sessionId);
    CREATE INDEX IF NOT EXISTS idx_packet_ratings_session ON packet_usefulness_ratings(sessionId);

    CREATE TABLE IF NOT EXISTS dogfood_telemetry (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      runId TEXT NOT NULL,
      timestampStart INTEGER NOT NULL,
      timestampEnd INTEGER,
      surface TEXT NOT NULL DEFAULT 'mcp',
      scenarioId TEXT NOT NULL,
      userRole TEXT NOT NULL DEFAULT 'founder',
      primaryPrompt TEXT NOT NULL,
      attachedInputs TEXT,
      inferredLens TEXT,
      packetType TEXT,
      stateBeforeHash TEXT,
      stateAfterHash TEXT,
      importantChangesDetected INTEGER DEFAULT 0,
      contradictionsDetected INTEGER DEFAULT 0,
      actionsRanked INTEGER DEFAULT 0,
      artifactsProduced TEXT,
      toolsInvoked TEXT,
      toolCallCount INTEGER DEFAULT 0,
      writeOpsCount INTEGER DEFAULT 0,
      readOpsCount INTEGER DEFAULT 0,
      webEnrichmentCount INTEGER DEFAULT 0,
      providerBusMessagesSent INTEGER DEFAULT 0,
      providerBusMessagesReceived INTEGER DEFAULT 0,
      inputTokensEst INTEGER DEFAULT 0,
      outputTokensEst INTEGER DEFAULT 0,
      totalTokensEst INTEGER DEFAULT 0,
      totalLatencyMs INTEGER DEFAULT 0,
      estCostBandUsd REAL DEFAULT 0,
      humanScore INTEGER,
      judgeScore INTEGER,
      repeatedQuestionPrevented TEXT DEFAULT 'unknown',
      followupNeeded TEXT DEFAULT 'unknown',
      createdAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE INDEX IF NOT EXISTS idx_telemetry_scenario ON dogfood_telemetry(scenarioId);
    CREATE INDEX IF NOT EXISTS idx_telemetry_role ON dogfood_telemetry(userRole);
    CREATE INDEX IF NOT EXISTS idx_telemetry_surface ON dogfood_telemetry(surface);
  `);
  _schemaReady = true;
}

/* ------------------------------------------------------------------ */
/*  Canonical system layer taxonomy                                    */
/* ------------------------------------------------------------------ */

const SYSTEM_LAYERS = [
  "ingestion",
  "canonicalization",
  "change_detection",
  "contradiction",
  "suppression",
  "packet_construction",
  "artifact_rendering",
  "trace_lineage",
  "provider_bus",
  "role_overlay",
  "ux_explanation",
] as const;

/* ------------------------------------------------------------------ */
/*  Tools                                                              */
/* ------------------------------------------------------------------ */

export const dogfoodJudgeTools: McpTool[] = [
  // ─── 1. start_dogfood_session ──────────────────────────────────
  {
    name: "start_dogfood_session",
    description:
      "Start a new dogfood session for one of the 3 canonical loops (weekly_reset, pre_delegation, company_search). Returns sessionId for subsequent recording.",
    inputSchema: {
      type: "object",
      properties: {
        loopType: {
          type: "string",
          enum: ["weekly_reset", "pre_delegation", "company_search"],
          description: "Which canonical dogfood loop is being tested",
        },
        packetVersionUsed: {
          type: "string",
          description: "Version/ID of the packet template being tested (optional)",
        },
      },
      required: ["loopType"],
    },
    handler: async (args: { loopType: string; packetVersionUsed?: string }) => {
      ensureDogfoodSchema();
      const db = getDb();
      const sessionId = genId("dfs");
      const now = Date.now();

      db.prepare(
        `INSERT INTO dogfood_sessions (sessionId, loopType, startedAt, packetVersionUsed)
         VALUES (?, ?, ?, ?)`,
      ).run(sessionId, args.loopType, now, args.packetVersionUsed ?? null);

      return { sessionId, loopType: args.loopType, startedAt: now };
    },
  },

  // ─── 2. end_dogfood_session ────────────────────────────────────
  {
    name: "end_dogfood_session",
    description:
      "End a dogfood session with summary metrics: time-to-first-useful-output, delegation success, packet export status, and notes.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: { type: "string", description: "Session to end" },
        notes: { type: "string", description: "Overall session notes" },
        timeToFirstUsefulOutput: {
          type: "number",
          description: "Milliseconds until first useful output was produced",
        },
        delegationSucceeded: {
          type: "boolean",
          description: "Whether delegation worked without restatement",
        },
        packetExported: {
          type: "boolean",
          description: "Whether the packet was exported/shared",
        },
      },
      required: ["sessionId"],
    },
    handler: async (args: {
      sessionId: string;
      notes?: string;
      timeToFirstUsefulOutput?: number;
      delegationSucceeded?: boolean;
      packetExported?: boolean;
    }) => {
      ensureDogfoodSchema();
      const db = getDb();
      const now = Date.now();

      const result = db.prepare(
        `UPDATE dogfood_sessions
         SET endedAt = ?, overallNotes = ?, timeToFirstUsefulOutput = ?,
             delegationSucceeded = ?, packetExported = ?
         WHERE sessionId = ?`,
      ).run(
        now,
        args.notes ?? null,
        args.timeToFirstUsefulOutput ?? null,
        args.delegationSucceeded != null ? (args.delegationSucceeded ? 1 : 0) : null,
        args.packetExported != null ? (args.packetExported ? 1 : 0) : null,
        args.sessionId,
      );

      return {
        sessionId: args.sessionId,
        endedAt: now,
        updated: result.changes > 0,
      };
    },
  },

  // ─── 3. record_manual_correction ───────────────────────────────
  {
    name: "record_manual_correction",
    description:
      "Track a human correction to agent output. Every correction is evidence of a system gap — the system should have gotten this right.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: { type: "string", description: "Dogfood session ID" },
        field: { type: "string", description: "Which field/section was corrected" },
        beforeValue: { type: "string", description: "What the system produced" },
        afterValue: { type: "string", description: "What the human corrected it to" },
        correctionType: {
          type: "string",
          enum: ["factual", "priority", "scope", "tone", "missing"],
          description: "Category of correction",
        },
      },
      required: ["sessionId", "field", "correctionType"],
    },
    handler: async (args: {
      sessionId: string;
      field: string;
      beforeValue?: string;
      afterValue?: string;
      correctionType: string;
    }) => {
      ensureDogfoodSchema();
      const db = getDb();
      const eventId = genId("mc");
      const now = Date.now();

      db.prepare(
        `INSERT INTO manual_correction_events
         (eventId, sessionId, field, beforeValue, afterValue, correctionType, detectedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        eventId,
        args.sessionId,
        args.field,
        args.beforeValue ?? null,
        args.afterValue ?? null,
        args.correctionType,
        now,
      );

      // Also update session's manualCorrections array
      const session = db
        .prepare(`SELECT manualCorrections FROM dogfood_sessions WHERE sessionId = ?`)
        .get(args.sessionId) as { manualCorrections: string | null } | undefined;

      if (session) {
        const corrections: unknown[] = session.manualCorrections
          ? JSON.parse(session.manualCorrections)
          : [];
        corrections.push({
          field: args.field,
          before: args.beforeValue ?? null,
          after: args.afterValue ?? null,
          type: args.correctionType,
        });
        db.prepare(
          `UPDATE dogfood_sessions SET manualCorrections = ? WHERE sessionId = ?`,
        ).run(JSON.stringify(corrections), args.sessionId);
      }

      return { eventId, sessionId: args.sessionId, recorded: true };
    },
  },

  // ─── 4. record_repeated_question ───────────────────────────────
  {
    name: "record_repeated_question",
    description:
      "Track a question the user asked that NodeBench should have already known. This is the core failure signal — repeat cognition means the system isn't compounding.",
    inputSchema: {
      type: "object",
      properties: {
        question: { type: "string", description: "The repeated question" },
        sessionId: { type: "string", description: "Current session ID" },
        priorSessionId: {
          type: "string",
          description: "Session where this was previously asked (optional)",
        },
      },
      required: ["question"],
    },
    handler: async (args: {
      question: string;
      sessionId?: string;
      priorSessionId?: string;
    }) => {
      ensureDogfoodSchema();
      const db = getDb();
      const eventId = genId("rq");
      const now = Date.now();

      // Calculate time since last asked if priorSessionId provided
      let timeSinceLastAsked: number | null = null;
      if (args.priorSessionId) {
        const prior = db
          .prepare(`SELECT startedAt FROM dogfood_sessions WHERE sessionId = ?`)
          .get(args.priorSessionId) as { startedAt: number } | undefined;
        if (prior) {
          timeSinceLastAsked = now - prior.startedAt;
        }
      }

      db.prepare(
        `INSERT INTO repeat_question_events
         (eventId, question, sessionId, priorSessionId, timeSinceLastAsked, shouldHaveBeenWarm, detectedAt)
         VALUES (?, ?, ?, ?, ?, 1, ?)`,
      ).run(
        eventId,
        args.question,
        args.sessionId ?? null,
        args.priorSessionId ?? null,
        timeSinceLastAsked,
        now,
      );

      // Also update session's repeatedQuestions array
      if (args.sessionId) {
        const session = db
          .prepare(`SELECT repeatedQuestions FROM dogfood_sessions WHERE sessionId = ?`)
          .get(args.sessionId) as { repeatedQuestions: string | null } | undefined;

        if (session) {
          const questions: string[] = session.repeatedQuestions
            ? JSON.parse(session.repeatedQuestions)
            : [];
          questions.push(args.question);
          db.prepare(
            `UPDATE dogfood_sessions SET repeatedQuestions = ? WHERE sessionId = ?`,
          ).run(JSON.stringify(questions), args.sessionId);
        }
      }

      return { eventId, question: args.question, timeSinceLastAsked, recorded: true };
    },
  },

  // ─── 5. rate_packet_usefulness ─────────────────────────────────
  {
    name: "rate_packet_usefulness",
    description:
      "Rate a packet's real-world utility: was it exported, delegated, reused, or abandoned? How many human edits were needed?",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: { type: "string", description: "Dogfood session ID" },
        packetType: {
          type: "string",
          description: "Type of packet (weekly_reset, pre_delegation, company_search, etc.)",
        },
        exported: { type: "boolean", description: "Was the packet exported?" },
        delegated: { type: "boolean", description: "Was the packet delegated to someone?" },
        reused: { type: "boolean", description: "Was the packet reused in another context?" },
        abandoned: { type: "boolean", description: "Was the packet abandoned?" },
        humanEditsCount: {
          type: "number",
          description: "Number of human edits required before the packet was usable",
        },
      },
      required: ["sessionId", "packetType"],
    },
    handler: async (args: {
      sessionId: string;
      packetType: string;
      exported?: boolean;
      delegated?: boolean;
      reused?: boolean;
      abandoned?: boolean;
      humanEditsCount?: number;
    }) => {
      ensureDogfoodSchema();
      const db = getDb();
      const ratingId = genId("pur");
      const now = Date.now();

      db.prepare(
        `INSERT INTO packet_usefulness_ratings
         (ratingId, sessionId, packetType, exported, delegated, reused, abandoned, humanEditsCount, ratedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        ratingId,
        args.sessionId,
        args.packetType,
        args.exported ? 1 : 0,
        args.delegated ? 1 : 0,
        args.reused ? 1 : 0,
        args.abandoned ? 1 : 0,
        args.humanEditsCount ?? 0,
        now,
      );

      return { ratingId, sessionId: args.sessionId, recorded: true };
    },
  },

  // ─── 6. judge_session ──────────────────────────────────────────
  {
    name: "judge_session",
    description:
      "Score a dogfood session on 6 dimensions (1-5 each): truth, compression, anticipation, output, delegation, trust. Returns overall score and records failure classes.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: { type: "string", description: "Session to judge" },
        truthQuality: {
          type: "number",
          minimum: 1,
          maximum: 5,
          description: "1-5: Were facts correct? Did it hallucinate?",
        },
        compressionQuality: {
          type: "number",
          minimum: 1,
          maximum: 5,
          description: "1-5: Was context compressed without losing signal?",
        },
        anticipationQuality: {
          type: "number",
          minimum: 1,
          maximum: 5,
          description: "1-5: Did it anticipate what you needed next?",
        },
        outputQuality: {
          type: "number",
          minimum: 1,
          maximum: 5,
          description: "1-5: Was the artifact/output directly usable?",
        },
        delegationQuality: {
          type: "number",
          minimum: 1,
          maximum: 5,
          description: "1-5: Could you hand the output to someone without restatement?",
        },
        trustQuality: {
          type: "number",
          minimum: 1,
          maximum: 5,
          description: "1-5: Did you trust the output enough to act on it?",
        },
        notes: { type: "string", description: "Judge notes" },
        failureClasses: {
          type: "array",
          items: { type: "string" },
          description: "Array of failure class strings (e.g. 'stale_entity', 'missing_change', 'wrong_priority')",
        },
      },
      required: [
        "sessionId",
        "truthQuality",
        "compressionQuality",
        "anticipationQuality",
        "outputQuality",
        "delegationQuality",
        "trustQuality",
      ],
    },
    handler: async (args: {
      sessionId: string;
      truthQuality: number;
      compressionQuality: number;
      anticipationQuality: number;
      outputQuality: number;
      delegationQuality: number;
      trustQuality: number;
      notes?: string;
      failureClasses?: string[];
    }) => {
      ensureDogfoodSchema();
      const db = getDb();
      const runId = genId("jr");
      const now = Date.now();

      const scores = [
        args.truthQuality,
        args.compressionQuality,
        args.anticipationQuality,
        args.outputQuality,
        args.delegationQuality,
        args.trustQuality,
      ];
      const overallScore =
        Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100;

      db.prepare(
        `INSERT INTO judge_runs
         (runId, sessionId, judgedAt, truthQuality, compressionQuality, anticipationQuality,
          outputQuality, delegationQuality, trustQuality, overallScore, notes, failureClasses)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        runId,
        args.sessionId,
        now,
        args.truthQuality,
        args.compressionQuality,
        args.anticipationQuality,
        args.outputQuality,
        args.delegationQuality,
        args.trustQuality,
        overallScore,
        args.notes ?? null,
        args.failureClasses ? JSON.stringify(args.failureClasses) : null,
      );

      return {
        runId,
        sessionId: args.sessionId,
        overallScore,
        dimensions: {
          truth: args.truthQuality,
          compression: args.compressionQuality,
          anticipation: args.anticipationQuality,
          output: args.outputQuality,
          delegation: args.delegationQuality,
          trust: args.trustQuality,
        },
      };
    },
  },

  // ─── 7. classify_failure ───────────────────────────────────────
  {
    name: "classify_failure",
    description:
      "Classify a failure by canonical system layer taxonomy. Tracks symptom, root cause, and system layer for structured triage.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: { type: "string", description: "Dogfood session ID" },
        judgeRunId: { type: "string", description: "Judge run that identified this failure" },
        symptom: { type: "string", description: "What the user observed" },
        rootCause: { type: "string", description: "Why it happened (5-whys root cause)" },
        systemLayer: {
          type: "string",
          enum: [...SYSTEM_LAYERS],
          description: "Which system layer is responsible",
        },
        severity: {
          type: "string",
          enum: ["low", "medium", "high", "critical"],
          description: "Severity level (default: medium)",
        },
      },
      required: ["sessionId", "symptom", "rootCause", "systemLayer"],
    },
    handler: async (args: {
      sessionId: string;
      judgeRunId?: string;
      symptom: string;
      rootCause: string;
      systemLayer: string;
      severity?: string;
    }) => {
      ensureDogfoodSchema();
      const db = getDb();
      const caseId = genId("fc");
      const now = Date.now();

      // Check if a similar failure exists (same layer + similar symptom)
      const existing = db
        .prepare(
          `SELECT caseId, frequency FROM failure_cases
           WHERE systemLayer = ? AND status = 'open'
           ORDER BY createdAt DESC LIMIT 5`,
        )
        .all(args.systemLayer) as { caseId: string; frequency: number }[];

      db.prepare(
        `INSERT INTO failure_cases
         (caseId, sessionId, judgeRunId, symptom, rootCause, systemLayer, severity, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        caseId,
        args.sessionId,
        args.judgeRunId ?? null,
        args.symptom,
        args.rootCause,
        args.systemLayer,
        args.severity ?? "medium",
        now,
      );

      return {
        caseId,
        systemLayer: args.systemLayer,
        severity: args.severity ?? "medium",
        existingOpenInLayer: existing.length,
        recorded: true,
      };
    },
  },

  // ─── 8. record_fix_attempt ─────────────────────────────────────
  {
    name: "record_fix_attempt",
    description:
      "Record a fix attempt with replay proof and regression protection description. Links to a failure case.",
    inputSchema: {
      type: "object",
      properties: {
        caseId: { type: "string", description: "Failure case being fixed" },
        failureClass: { type: "string", description: "Class of failure being addressed" },
        rootCause: { type: "string", description: "Root cause being fixed" },
        layerCorrected: {
          type: "string",
          enum: [...SYSTEM_LAYERS],
          description: "Which system layer was corrected",
        },
        description: { type: "string", description: "What was changed" },
        replayProof: {
          type: "object",
          properties: {
            priorScore: { type: "number" },
            newScore: { type: "number" },
            improved: { type: "boolean" },
          },
          description: "JSON proof: prior vs new scores",
        },
        regressionProtection: {
          type: "string",
          description: "What prevents this from regressing",
        },
      },
      required: ["caseId", "failureClass", "rootCause", "layerCorrected", "description"],
    },
    handler: async (args: {
      caseId: string;
      failureClass: string;
      rootCause: string;
      layerCorrected: string;
      description: string;
      replayProof?: { priorScore: number; newScore: number; improved: boolean };
      regressionProtection?: string;
    }) => {
      ensureDogfoodSchema();
      const db = getDb();
      const attemptId = genId("fix");
      const now = Date.now();

      const status = args.replayProof?.improved ? "verified" : "proposed";

      db.prepare(
        `INSERT INTO fix_attempts
         (attemptId, caseId, failureClass, rootCause, layerCorrected, description, replayProof, regressionProtection, status, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        attemptId,
        args.caseId,
        args.failureClass,
        args.rootCause,
        args.layerCorrected,
        args.description,
        args.replayProof ? JSON.stringify(args.replayProof) : null,
        args.regressionProtection ?? null,
        status,
        now,
      );

      // Update failure case status
      if (status === "verified") {
        db.prepare(
          `UPDATE failure_cases SET status = 'fixed', fixAttemptId = ? WHERE caseId = ?`,
        ).run(attemptId, args.caseId);
      } else {
        db.prepare(
          `UPDATE failure_cases SET status = 'investigating', fixAttemptId = ? WHERE caseId = ?`,
        ).run(attemptId, args.caseId);
      }

      return { attemptId, caseId: args.caseId, status, recorded: true };
    },
  },

  // ─── 9. get_dogfood_sessions ───────────────────────────────────
  {
    name: "get_dogfood_sessions",
    description:
      "List recent dogfood sessions with their judge scores. Filter by loop type.",
    inputSchema: {
      type: "object",
      properties: {
        loopType: {
          type: "string",
          enum: ["weekly_reset", "pre_delegation", "company_search"],
          description: "Filter by loop type (optional)",
        },
        limit: {
          type: "number",
          description: "Max sessions to return (default 10)",
        },
      },
    },
    annotations: { readOnlyHint: true },
    handler: async (args: { loopType?: string; limit?: number }) => {
      ensureDogfoodSchema();
      const db = getDb();
      const limit = args.limit ?? 10;

      let sessions: any[];
      if (args.loopType) {
        sessions = db
          .prepare(
            `SELECT * FROM dogfood_sessions WHERE loopType = ? ORDER BY startedAt DESC LIMIT ?`,
          )
          .all(args.loopType, limit) as any[];
      } else {
        sessions = db
          .prepare(
            `SELECT * FROM dogfood_sessions ORDER BY startedAt DESC LIMIT ?`,
          )
          .all(limit) as any[];
      }

      // Attach judge scores
      const enriched = sessions.map((s) => {
        const judgeRun = db
          .prepare(
            `SELECT overallScore, truthQuality, compressionQuality, anticipationQuality,
                    outputQuality, delegationQuality, trustQuality, failureClasses
             FROM judge_runs WHERE sessionId = ? ORDER BY judgedAt DESC LIMIT 1`,
          )
          .get(s.sessionId) as any;

        return {
          ...s,
          manualCorrections: s.manualCorrections ? JSON.parse(s.manualCorrections) : [],
          repeatedQuestions: s.repeatedQuestions ? JSON.parse(s.repeatedQuestions) : [],
          artifactsProduced: s.artifactsProduced ? JSON.parse(s.artifactsProduced) : [],
          judgeScore: judgeRun
            ? {
                overall: judgeRun.overallScore,
                truth: judgeRun.truthQuality,
                compression: judgeRun.compressionQuality,
                anticipation: judgeRun.anticipationQuality,
                output: judgeRun.outputQuality,
                delegation: judgeRun.delegationQuality,
                trust: judgeRun.trustQuality,
                failureClasses: judgeRun.failureClasses
                  ? JSON.parse(judgeRun.failureClasses)
                  : [],
              }
            : null,
        };
      });

      return { sessions: enriched, count: enriched.length };
    },
  },

  // ─── 10. get_failure_triage ────────────────────────────────────
  {
    name: "get_failure_triage",
    description:
      "Get open failure cases grouped by system layer with frequency counts. The triage board for fixing system gaps.",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["open", "investigating", "fixed", "wont_fix"],
          description: "Filter by status (default: open)",
        },
      },
    },
    annotations: { readOnlyHint: true },
    handler: async (args: { status?: string }) => {
      ensureDogfoodSchema();
      const db = getDb();
      const status = args.status ?? "open";

      const cases = db
        .prepare(
          `SELECT caseId, sessionId, symptom, rootCause, systemLayer, severity, frequency, status, createdAt
           FROM failure_cases WHERE status = ? ORDER BY
           CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
           createdAt DESC`,
        )
        .all(status) as any[];

      // Group by system layer
      const byLayer: Record<string, any[]> = {};
      for (const c of cases) {
        if (!byLayer[c.systemLayer]) byLayer[c.systemLayer] = [];
        byLayer[c.systemLayer].push(c);
      }

      // Layer summary
      const layerSummary = Object.entries(byLayer).map(([layer, items]) => ({
        layer,
        count: items.length,
        criticalCount: items.filter((i) => i.severity === "critical").length,
        highCount: items.filter((i) => i.severity === "high").length,
      }));

      return {
        status,
        totalCases: cases.length,
        byLayer,
        layerSummary: layerSummary.sort((a, b) => b.criticalCount - a.criticalCount || b.count - a.count),
      };
    },
  },

  // ─── 11. get_regression_gate ───────────────────────────────────
  {
    name: "get_regression_gate",
    description:
      "Check if the 3 canonical loops pass. Returns per-loop scores, overall pass/fail, and regression detection.",
    inputSchema: {
      type: "object",
      properties: {},
    },
    annotations: { readOnlyHint: true },
    handler: async () => {
      ensureDogfoodSchema();
      const db = getDb();

      const PASS_THRESHOLD = 3.5;
      const loops = ["weekly_reset", "pre_delegation", "company_search"] as const;

      const results: Record<string, { latestScore: number | null; trend: number[]; passed: boolean }> = {};
      let allPassed = true;
      let regressionsDetected = false;

      for (const loop of loops) {
        // Get last 5 judge scores for this loop type
        const scores = db
          .prepare(
            `SELECT jr.overallScore
             FROM judge_runs jr
             JOIN dogfood_sessions ds ON jr.sessionId = ds.sessionId
             WHERE ds.loopType = ?
             ORDER BY jr.judgedAt DESC LIMIT 5`,
          )
          .all(loop) as { overallScore: number }[];

        const trend = scores.map((s) => s.overallScore);
        const latestScore = trend.length > 0 ? trend[0] : null;
        const passed = latestScore != null && latestScore >= PASS_THRESHOLD;

        if (!passed) allPassed = false;

        // Check for regression: if latest score is lower than previous
        if (trend.length >= 2 && trend[0] < trend[1]) {
          regressionsDetected = true;
        }

        results[loop] = { latestScore, trend, passed };
      }

      // Count open failures
      const openFailures = db
        .prepare(`SELECT COUNT(*) as count FROM failure_cases WHERE status = 'open'`)
        .get() as { count: number };

      return {
        weeklyResetScore: results.weekly_reset.latestScore,
        preDelegationScore: results.pre_delegation.latestScore,
        companySearchScore: results.company_search.latestScore,
        passed: allPassed,
        regressions: regressionsDetected,
        details: results,
        openFailureCount: openFailures.count,
      };
    },
  },

  // ─── 12. get_repeat_cognition_metrics ──────────────────────────
  {
    name: "get_repeat_cognition_metrics",
    description:
      "The key compound metric. Measures repeat question rate, manual reconstruction count, packet abandonment rate, delegation-without-restatement rate, and average time-to-useful-output.",
    inputSchema: {
      type: "object",
      properties: {
        daysSince: {
          type: "number",
          description: "Look back N days (default 30)",
        },
      },
    },
    annotations: { readOnlyHint: true },
    handler: async (args: { daysSince?: number }) => {
      ensureDogfoodSchema();
      const db = getDb();
      const since = Date.now() - (args.daysSince ?? 30) * 86400000;

      // Total sessions in window
      const totalSessions = db
        .prepare(`SELECT COUNT(*) as count FROM dogfood_sessions WHERE startedAt >= ?`)
        .get(since) as { count: number };

      // Repeat questions in window
      const repeatQuestions = db
        .prepare(`SELECT COUNT(*) as count FROM repeat_question_events WHERE detectedAt >= ?`)
        .get(since) as { count: number };

      // Manual corrections in window
      const manualCorrections = db
        .prepare(`SELECT COUNT(*) as count FROM manual_correction_events WHERE detectedAt >= ?`)
        .get(since) as { count: number };

      // Packet ratings in window
      const packetRatings = db
        .prepare(`SELECT * FROM packet_usefulness_ratings WHERE ratedAt >= ?`)
        .all(since) as any[];

      const totalRated = packetRatings.length;
      const abandoned = packetRatings.filter((r) => r.abandoned === 1).length;
      const delegated = packetRatings.filter((r) => r.delegated === 1).length;
      const totalHumanEdits = packetRatings.reduce(
        (sum: number, r: any) => sum + (r.humanEditsCount ?? 0),
        0,
      );

      // Average time-to-first-useful-output
      const times = db
        .prepare(
          `SELECT timeToFirstUsefulOutput FROM dogfood_sessions
           WHERE startedAt >= ? AND timeToFirstUsefulOutput IS NOT NULL`,
        )
        .all(since) as { timeToFirstUsefulOutput: number }[];

      const avgTimeToUsefulOutput =
        times.length > 0
          ? Math.round(
              times.reduce((s, t) => s + t.timeToFirstUsefulOutput, 0) / times.length,
            )
          : null;

      // Delegation without restatement rate
      const delegationSessions = db
        .prepare(
          `SELECT delegationSucceeded FROM dogfood_sessions
           WHERE startedAt >= ? AND delegationSucceeded IS NOT NULL`,
        )
        .all(since) as { delegationSucceeded: number }[];

      const delegationSuccessRate =
        delegationSessions.length > 0
          ? Math.round(
              (delegationSessions.filter((s) => s.delegationSucceeded === 1).length /
                delegationSessions.length) *
                100,
            )
          : null;

      // Incorporate causal-event-based repeated question detection
      const detectTool = dogfoodJudgeTools.find((t) => t.name === "detect_repeated_questions");
      let causalRepeatRate: number | null = null;
      if (detectTool) {
        try {
          const detection = await detectTool.handler({ lookbackDays: args.daysSince ?? 30 });
          causalRepeatRate = (detection as { repeatRate: number }).repeatRate;
        } catch {
          // causal_events table may not exist yet — non-fatal
        }
      }

      const sessionRepeatRate =
        totalSessions.count > 0
          ? repeatQuestions.count / totalSessions.count
          : 0;

      // Blend session-based and causal-event-based repeat rates when both available
      const blendedRepeatRate =
        causalRepeatRate != null
          ? Math.round(((sessionRepeatRate + causalRepeatRate) / 2) * 100) / 100
          : Math.round(sessionRepeatRate * 100) / 100;

      return {
        window: { days: args.daysSince ?? 30, since: new Date(since).toISOString() },
        totalSessions: totalSessions.count,
        repeatQuestionRate: blendedRepeatRate,
        repeatQuestionCount: repeatQuestions.count,
        causalRepeatRate,
        manualCorrectionCount: manualCorrections.count,
        packetAbandonmentRate:
          totalRated > 0 ? Math.round((abandoned / totalRated) * 100) / 100 : 0,
        delegationWithoutRestatementRate: delegationSuccessRate,
        averageTimeToUsefulOutputMs: avgTimeToUsefulOutput,
        totalHumanEdits,
        compoundScore: computeCompoundScore({
          repeatRate: blendedRepeatRate,
          correctionRate:
            totalSessions.count > 0
              ? manualCorrections.count / totalSessions.count
              : 0,
          abandonmentRate: totalRated > 0 ? abandoned / totalRated : 0,
          delegationRate: delegationSuccessRate ?? 0,
        }),
      };
    },
  },

  // ─── 13. record_dogfood_telemetry ─────────────────────────────
  {
    name: "record_dogfood_telemetry",
    description:
      "Record a full telemetry row for a dogfood run. Captures surface, scenario, user role, prompt, tool usage, token estimates, latency, cost, and quality scores.",
    inputSchema: {
      type: "object",
      properties: {
        scenarioId: { type: "string", description: "Scenario identifier (e.g. weekly_reset_v3)" },
        userRole: {
          type: "string",
          enum: ["founder", "banker", "ceo", "operator", "researcher", "student"],
          description: "Role of the user running the scenario (default: founder)",
        },
        primaryPrompt: { type: "string", description: "The primary prompt/question that initiated this run" },
        surface: {
          type: "string",
          enum: ["ai_app", "mcp", "engine_api"],
          description: "Which surface was used (default: mcp)",
        },
        attachedInputs: {
          type: "array",
          items: { type: "string" },
          description: "Array of attached input descriptors (files, URLs, etc.)",
        },
        inferredLens: { type: "string", description: "The lens/perspective inferred for this run" },
        packetType: { type: "string", description: "Type of packet produced" },
        stateBeforeHash: { type: "string", description: "Hash of state before the run" },
        stateAfterHash: { type: "string", description: "Hash of state after the run" },
        importantChangesDetected: { type: "number", description: "Count of important changes detected" },
        contradictionsDetected: { type: "number", description: "Count of contradictions detected" },
        actionsRanked: { type: "number", description: "Count of actions ranked" },
        artifactsProduced: {
          type: "array",
          items: { type: "string" },
          description: "Array of artifact identifiers produced",
        },
        toolsInvoked: {
          type: "array",
          items: { type: "string" },
          description: "Array of tool names invoked during the run",
        },
        toolCallCount: { type: "number", description: "Total tool calls made" },
        writeOpsCount: { type: "number", description: "Number of write operations" },
        readOpsCount: { type: "number", description: "Number of read operations" },
        webEnrichmentCount: { type: "number", description: "Number of web enrichment calls" },
        providerBusMessagesSent: { type: "number", description: "Messages sent via provider bus" },
        providerBusMessagesReceived: { type: "number", description: "Messages received via provider bus" },
        inputTokensEst: { type: "number", description: "Estimated input tokens" },
        outputTokensEst: { type: "number", description: "Estimated output tokens" },
        totalTokensEst: { type: "number", description: "Estimated total tokens" },
        totalLatencyMs: { type: "number", description: "Total latency in milliseconds" },
        estCostBandUsd: { type: "number", description: "Estimated cost band in USD" },
        humanScore: { type: "number", minimum: 1, maximum: 5, description: "Human quality score 1-5" },
        judgeScore: { type: "number", minimum: 1, maximum: 5, description: "Automated judge score 1-5" },
        repeatedQuestionPrevented: {
          type: "string",
          enum: ["yes", "no", "unknown"],
          description: "Whether a repeated question was prevented (default: unknown)",
        },
        followupNeeded: {
          type: "string",
          enum: ["yes", "no", "unknown"],
          description: "Whether followup is needed (default: unknown)",
        },
      },
      required: ["scenarioId", "userRole", "primaryPrompt"],
    },
    handler: async (args: {
      scenarioId: string;
      userRole?: string;
      primaryPrompt: string;
      surface?: string;
      attachedInputs?: string[];
      inferredLens?: string;
      packetType?: string;
      stateBeforeHash?: string;
      stateAfterHash?: string;
      importantChangesDetected?: number;
      contradictionsDetected?: number;
      actionsRanked?: number;
      artifactsProduced?: string[];
      toolsInvoked?: string[];
      toolCallCount?: number;
      writeOpsCount?: number;
      readOpsCount?: number;
      webEnrichmentCount?: number;
      providerBusMessagesSent?: number;
      providerBusMessagesReceived?: number;
      inputTokensEst?: number;
      outputTokensEst?: number;
      totalTokensEst?: number;
      totalLatencyMs?: number;
      estCostBandUsd?: number;
      humanScore?: number;
      judgeScore?: number;
      repeatedQuestionPrevented?: string;
      followupNeeded?: string;
    }) => {
      ensureDogfoodSchema();
      const db = getDb();
      const runId = genId("dft");
      const now = Date.now();

      db.prepare(
        `INSERT INTO dogfood_telemetry
         (runId, timestampStart, timestampEnd, surface, scenarioId, userRole, primaryPrompt,
          attachedInputs, inferredLens, packetType, stateBeforeHash, stateAfterHash,
          importantChangesDetected, contradictionsDetected, actionsRanked,
          artifactsProduced, toolsInvoked, toolCallCount, writeOpsCount, readOpsCount,
          webEnrichmentCount, providerBusMessagesSent, providerBusMessagesReceived,
          inputTokensEst, outputTokensEst, totalTokensEst, totalLatencyMs, estCostBandUsd,
          humanScore, judgeScore, repeatedQuestionPrevented, followupNeeded, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        runId,
        now,
        args.totalLatencyMs != null ? now + args.totalLatencyMs : null,
        args.surface ?? "mcp",
        args.scenarioId,
        args.userRole ?? "founder",
        args.primaryPrompt,
        args.attachedInputs ? JSON.stringify(args.attachedInputs) : null,
        args.inferredLens ?? null,
        args.packetType ?? null,
        args.stateBeforeHash ?? null,
        args.stateAfterHash ?? null,
        args.importantChangesDetected ?? 0,
        args.contradictionsDetected ?? 0,
        args.actionsRanked ?? 0,
        args.artifactsProduced ? JSON.stringify(args.artifactsProduced) : null,
        args.toolsInvoked ? JSON.stringify(args.toolsInvoked) : null,
        args.toolCallCount ?? 0,
        args.writeOpsCount ?? 0,
        args.readOpsCount ?? 0,
        args.webEnrichmentCount ?? 0,
        args.providerBusMessagesSent ?? 0,
        args.providerBusMessagesReceived ?? 0,
        args.inputTokensEst ?? 0,
        args.outputTokensEst ?? 0,
        args.totalTokensEst ?? 0,
        args.totalLatencyMs ?? 0,
        args.estCostBandUsd ?? 0,
        args.humanScore ?? null,
        args.judgeScore ?? null,
        args.repeatedQuestionPrevented ?? "unknown",
        args.followupNeeded ?? "unknown",
        now,
      );

      return { runId, scenarioId: args.scenarioId, surface: args.surface ?? "mcp", recorded: true };
    },
  },

  // ─── 14. detect_repeated_questions ────────────────────────────
  {
    name: "detect_repeated_questions",
    description:
      "Analyze causal_events to find patterns where the user/agent asks the same strategic question repeatedly. Uses Jaccard similarity on summary text to cluster repeated queries.",
    inputSchema: {
      type: "object",
      properties: {
        lookbackDays: {
          type: "number",
          description: "How many days to look back (default 30)",
        },
        similarityThreshold: {
          type: "number",
          description: "Jaccard similarity threshold to consider two questions repeated (0-1, default 0.6)",
        },
      },
    },
    annotations: { readOnlyHint: true },
    handler: async (args: { lookbackDays?: number; similarityThreshold?: number }) => {
      ensureDogfoodSchema();
      // Also ensure causal_events table exists (created by causalMemoryTools)
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
      `);

      const lookbackDays = args.lookbackDays ?? 30;
      const threshold = args.similarityThreshold ?? 0.6;
      const since = Date.now() - lookbackDays * 86400000;

      // Query causal_events for search/query/gather/recon/context event types
      const events = db
        .prepare(
          `SELECT eventId, eventType, summary, timestampMs
           FROM causal_events
           WHERE timestampMs >= ?
             AND (eventType LIKE '%search%' OR eventType LIKE '%query%'
               OR eventType LIKE '%gather%' OR eventType LIKE '%recon%'
               OR eventType LIKE '%context%')
           ORDER BY timestampMs ASC`,
        )
        .all(since) as {
        eventId: string;
        eventType: string;
        summary: string;
        timestampMs: number;
      }[];

      if (events.length === 0) {
        return {
          clusters: [],
          totalRepeatedQuestions: 0,
          uniqueQuestions: 0,
          repeatRate: 0,
          recommendation: "No search/query events found in the lookback window.",
        };
      }

      // Jaccard similarity on word sets
      const tokenize = (text: string): Set<string> =>
        new Set(
          text
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, "")
            .split(/\s+/)
            .filter((w) => w.length > 1),
        );

      const jaccardSimilarity = (a: Set<string>, b: Set<string>): number => {
        let intersection = 0;
        for (const w of a) {
          if (b.has(w)) intersection++;
        }
        const union = a.size + b.size - intersection;
        return union === 0 ? 0 : intersection / union;
      };

      // Build adjacency via pairwise similarity
      const tokenSets = events.map((e) => tokenize(e.summary));
      const parent: number[] = events.map((_, i) => i);

      const find = (x: number): number => {
        while (parent[x] !== x) {
          parent[x] = parent[parent[x]];
          x = parent[x];
        }
        return x;
      };
      const union = (a: number, b: number): void => {
        const ra = find(a);
        const rb = find(b);
        if (ra !== rb) parent[ra] = rb;
      };

      for (let i = 0; i < events.length; i++) {
        for (let j = i + 1; j < events.length; j++) {
          if (jaccardSimilarity(tokenSets[i], tokenSets[j]) >= threshold) {
            union(i, j);
          }
        }
      }

      // Group by cluster root
      const clusterMap = new Map<number, number[]>();
      for (let i = 0; i < events.length; i++) {
        const root = find(i);
        if (!clusterMap.has(root)) clusterMap.set(root, []);
        clusterMap.get(root)!.push(i);
      }

      // Filter to clusters with 2+ members (actual repeats)
      const repeatedClusters: {
        question: string;
        occurrences: number;
        firstAsked: string;
        lastAsked: string;
        wasAnswered: boolean;
        wasExported: boolean;
        suggestedResponse: string | null;
      }[] = [];

      for (const [, indices] of clusterMap) {
        if (indices.length < 2) continue;

        // Most common phrasing: pick the summary that appears most, or longest as tiebreaker
        const summaryFreq = new Map<string, number>();
        for (const idx of indices) {
          const s = events[idx].summary;
          summaryFreq.set(s, (summaryFreq.get(s) ?? 0) + 1);
        }
        let bestSummary = events[indices[0]].summary;
        let bestCount = 0;
        for (const [s, count] of summaryFreq) {
          if (count > bestCount || (count === bestCount && s.length > bestSummary.length)) {
            bestSummary = s;
            bestCount = count;
          }
        }

        const timestamps = indices.map((i) => events[i].timestampMs).sort((a, b) => a - b);
        const firstAsked = timestamps[0];
        const lastAsked = timestamps[timestamps.length - 1];

        // Check if a packet was generated within 1 hour after any occurrence
        let wasAnswered = false;
        let answeredDate: number | null = null;
        for (const ts of timestamps) {
          const packetEvent = db
            .prepare(
              `SELECT timestampMs FROM causal_events
               WHERE eventType LIKE '%packet.generated%'
                 AND timestampMs >= ? AND timestampMs <= ?
               LIMIT 1`,
            )
            .get(ts, ts + 3600000) as { timestampMs: number } | undefined;
          if (packetEvent) {
            wasAnswered = true;
            answeredDate = packetEvent.timestampMs;
            break;
          }
        }

        // Check if an export event followed
        let wasExported = false;
        for (const ts of timestamps) {
          const exportEvent = db
            .prepare(
              `SELECT eventId FROM causal_events
               WHERE (eventType LIKE '%export%' OR eventType LIKE '%share%')
                 AND timestampMs >= ? AND timestampMs <= ?
               LIMIT 1`,
            )
            .get(ts, ts + 7200000) as { eventId: string } | undefined;
          if (exportEvent) {
            wasExported = true;
            break;
          }
        }

        const suggestedResponse = wasAnswered && answeredDate
          ? `This was already answered on ${new Date(answeredDate).toISOString().slice(0, 10)}. Retrieve prior packet.`
          : null;

        repeatedClusters.push({
          question: bestSummary,
          occurrences: indices.length,
          firstAsked: new Date(firstAsked).toISOString(),
          lastAsked: new Date(lastAsked).toISOString(),
          wasAnswered,
          wasExported,
          suggestedResponse,
        });
      }

      // Sort by occurrences descending
      repeatedClusters.sort((a, b) => b.occurrences - a.occurrences);

      const totalRepeatedQuestions = repeatedClusters.reduce((s, c) => s + c.occurrences, 0);
      const uniqueQuestions = clusterMap.size;
      const repeatRate = events.length > 0 ? Math.round((totalRepeatedQuestions / events.length) * 100) / 100 : 0;

      const recommendation =
        repeatRate > 0.5
          ? "High repeat rate. The system is not compounding knowledge — investigate packet retrieval and warm-start paths."
          : repeatRate > 0.2
            ? "Moderate repeat rate. Some questions are being re-asked — consider surfacing prior answers proactively."
            : "Low repeat rate. The system is retaining and reusing prior answers well.";

      return {
        clusters: repeatedClusters,
        totalRepeatedQuestions,
        uniqueQuestions,
        repeatRate,
        recommendation,
      };
    },
  },

  // ─── 15. get_dogfood_telemetry ────────────────────────────────
  {
    name: "get_dogfood_telemetry",
    description:
      "Query dogfood telemetry rows with optional filters. Returns matching rows plus computed averages (tool calls, latency, cost, judge score).",
    inputSchema: {
      type: "object",
      properties: {
        scenarioId: { type: "string", description: "Filter by scenario ID" },
        userRole: {
          type: "string",
          enum: ["founder", "banker", "ceo", "operator", "researcher", "student"],
          description: "Filter by user role",
        },
        surface: {
          type: "string",
          enum: ["ai_app", "mcp", "engine_api"],
          description: "Filter by surface",
        },
        limit: { type: "number", description: "Max rows to return (default 20)" },
      },
    },
    annotations: { readOnlyHint: true },
    handler: async (args: {
      scenarioId?: string;
      userRole?: string;
      surface?: string;
      limit?: number;
    }) => {
      ensureDogfoodSchema();
      const db = getDb();
      const limit = args.limit ?? 20;

      const conditions: string[] = [];
      const params: unknown[] = [];

      if (args.scenarioId) {
        conditions.push("scenarioId = ?");
        params.push(args.scenarioId);
      }
      if (args.userRole) {
        conditions.push("userRole = ?");
        params.push(args.userRole);
      }
      if (args.surface) {
        conditions.push("surface = ?");
        params.push(args.surface);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

      const rows = db
        .prepare(
          `SELECT * FROM dogfood_telemetry ${whereClause} ORDER BY createdAt DESC LIMIT ?`,
        )
        .all(...params, limit) as any[];

      // Parse JSON fields
      const parsed = rows.map((r) => ({
        ...r,
        attachedInputs: r.attachedInputs ? JSON.parse(r.attachedInputs) : [],
        artifactsProduced: r.artifactsProduced ? JSON.parse(r.artifactsProduced) : [],
        toolsInvoked: r.toolsInvoked ? JSON.parse(r.toolsInvoked) : [],
      }));

      // Compute averages across returned rows
      const count = parsed.length;
      const avgToolCalls =
        count > 0
          ? Math.round((parsed.reduce((s: number, r: any) => s + (r.toolCallCount ?? 0), 0) / count) * 100) / 100
          : 0;
      const avgLatencyMs =
        count > 0
          ? Math.round(parsed.reduce((s: number, r: any) => s + (r.totalLatencyMs ?? 0), 0) / count)
          : 0;
      const avgCostUsd =
        count > 0
          ? Math.round((parsed.reduce((s: number, r: any) => s + (r.estCostBandUsd ?? 0), 0) / count) * 10000) / 10000
          : 0;
      const scoredRows = parsed.filter((r: any) => r.judgeScore != null);
      const avgJudgeScore =
        scoredRows.length > 0
          ? Math.round((scoredRows.reduce((s: number, r: any) => s + r.judgeScore, 0) / scoredRows.length) * 100) / 100
          : null;

      return {
        rows: parsed,
        count,
        averages: {
          toolCallCount: avgToolCalls,
          totalLatencyMs: avgLatencyMs,
          estCostBandUsd: avgCostUsd,
          judgeScore: avgJudgeScore,
        },
      };
    },
  },
];

/* ------------------------------------------------------------------ */
/*  Compound score: 0-100, higher is better                           */
/* ------------------------------------------------------------------ */

function computeCompoundScore(metrics: {
  repeatRate: number;
  correctionRate: number;
  abandonmentRate: number;
  delegationRate: number;
}): number {
  // Lower repeat/correction/abandonment is better → invert
  // Higher delegation is better → keep
  const repeatScore = Math.max(0, 100 - metrics.repeatRate * 100);
  const correctionScore = Math.max(0, 100 - metrics.correctionRate * 50);
  const abandonmentScore = Math.max(0, 100 - metrics.abandonmentRate * 100);
  const delegationScore = metrics.delegationRate; // already 0-100

  // Weighted average (repeat cognition weighted highest)
  const score =
    repeatScore * 0.35 +
    correctionScore * 0.25 +
    abandonmentScore * 0.15 +
    delegationScore * 0.25;

  return Math.round(score * 100) / 100;
}
