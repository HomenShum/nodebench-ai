/**
 * Mission Harness Tools — Hierarchical mission execution for verifiable work
 *
 * NodeBench is not a single-agent assistant. It is a hierarchical mission
 * execution harness for verifiable work.
 *
 * Architecture: Planner → Worker → Judge → Human Sniff-Check → Merge
 *
 * 5 first-class tools:
 *   plan.decompose_mission   — Break mission into subtasks with verifiability routing
 *   judge.verify_subtask     — Machine/expert verification with retry budget
 *   judge.request_retry      — Retry, re-plan, escalate, or stop
 *   merge.compose_output     — Judge-gated merge of subtask artifacts
 *   sniff.record_human_review — Human pass/concern/block with issue tags
 *
 * Persistence: SQLite-backed runs, taskPlans, subtaskAssignments, runSteps,
 * artifacts, evidence, judgeReviews, retryAttempts, mergeBoundaries,
 * sniffChecks, approvals.
 *
 * Verifiability tiers:
 *   Tier 1 — Machine-checkable (deterministic, automated judge)
 *   Tier 2 — Expert-checkable (requires human sniff-check)
 *
 * Anti-flat-coordination rules enforced:
 *   - One owner per subtask
 *   - Bounded input package
 *   - Explicit output contract
 *   - Judge-gated merge only
 *   - No shared free-for-all editing
 */

import { getDb, genId } from "../db.js";
import type { McpTool } from "../types.js";

// ── Constants ─────────────────────────────────────────────────────────────

const MAX_SUBTASKS = 50;
const MAX_RETRY_BUDGET = 5;
const MAX_EVIDENCE_PER_REVIEW = 20;
const MAX_ARTIFACTS_PER_MERGE = 100;

type VerifiabilityTier = "tier_1_machine" | "tier_2_expert";
type JudgeMethod = "deterministic" | "llm_judge" | "human_review" | "composite";
type SubtaskStatus = "pending" | "assigned" | "in_progress" | "review" | "passed" | "failed" | "retrying" | "escalated" | "blocked";
type RunStatus = "planning" | "executing" | "reviewing" | "merging" | "sniff_check" | "completed" | "failed" | "stopped";
type RetryAction = "pass" | "retry" | "replan" | "escalate" | "stop";
type SniffVerdict = "pass" | "concern" | "block";
type IssueTag = "unsupported_claim" | "weak_evidence" | "not_credible" | "too_risky" | "scope_drift" | "missing_source" | "contradictory" | "stale_data";

// ── DB Setup ──────────────────────────────────────────────────────────────

function ensureMissionTables(): void {
  const db = getDb();
  db.exec(`
    -- ═══════════════════════════════════════════
    -- MISSION HARNESS — Hierarchical execution
    -- Planner → Worker → Judge → Sniff → Merge
    -- ═══════════════════════════════════════════

    CREATE TABLE IF NOT EXISTS mission_runs (
      id              TEXT PRIMARY KEY,
      title           TEXT NOT NULL,
      description     TEXT,
      status          TEXT NOT NULL DEFAULT 'planning',
      owner_agent     TEXT,
      created_at      TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at    TEXT
    );

    CREATE TABLE IF NOT EXISTS mission_task_plans (
      id              TEXT PRIMARY KEY,
      run_id          TEXT NOT NULL REFERENCES mission_runs(id) ON DELETE CASCADE,
      version         INTEGER NOT NULL DEFAULT 1,
      decomposition   TEXT NOT NULL,
      rationale       TEXT,
      created_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_mission_task_plans_run ON mission_task_plans(run_id);

    CREATE TABLE IF NOT EXISTS mission_subtasks (
      id                    TEXT PRIMARY KEY,
      run_id                TEXT NOT NULL REFERENCES mission_runs(id) ON DELETE CASCADE,
      plan_id               TEXT NOT NULL REFERENCES mission_task_plans(id) ON DELETE CASCADE,
      sequence              INTEGER NOT NULL,
      title                 TEXT NOT NULL,
      description           TEXT,
      owner_agent           TEXT,
      status                TEXT NOT NULL DEFAULT 'pending',
      verifiability_tier    TEXT NOT NULL DEFAULT 'tier_1_machine',
      judge_method          TEXT NOT NULL DEFAULT 'deterministic',
      retry_budget          INTEGER NOT NULL DEFAULT 3,
      retries_used          INTEGER NOT NULL DEFAULT 0,
      requires_sniff_check  INTEGER NOT NULL DEFAULT 0,
      input_package         TEXT,
      output_contract       TEXT,
      depends_on            TEXT DEFAULT '[]',
      created_at            TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at            TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at          TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_mission_subtasks_run ON mission_subtasks(run_id);
    CREATE INDEX IF NOT EXISTS idx_mission_subtasks_plan ON mission_subtasks(plan_id);
    CREATE INDEX IF NOT EXISTS idx_mission_subtasks_status ON mission_subtasks(status);
    CREATE INDEX IF NOT EXISTS idx_mission_subtasks_owner ON mission_subtasks(owner_agent);

    CREATE TABLE IF NOT EXISTS mission_run_steps (
      id              TEXT PRIMARY KEY,
      run_id          TEXT NOT NULL REFERENCES mission_runs(id) ON DELETE CASCADE,
      subtask_id      TEXT NOT NULL REFERENCES mission_subtasks(id) ON DELETE CASCADE,
      step_type       TEXT NOT NULL,
      agent_id        TEXT,
      input_summary   TEXT,
      output_summary  TEXT,
      status          TEXT NOT NULL DEFAULT 'pending',
      duration_ms     INTEGER,
      created_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_mission_run_steps_subtask ON mission_run_steps(subtask_id);

    CREATE TABLE IF NOT EXISTS mission_artifacts (
      id              TEXT PRIMARY KEY,
      run_id          TEXT NOT NULL REFERENCES mission_runs(id) ON DELETE CASCADE,
      subtask_id      TEXT NOT NULL REFERENCES mission_subtasks(id) ON DELETE CASCADE,
      artifact_type   TEXT NOT NULL,
      title           TEXT NOT NULL,
      content         TEXT NOT NULL,
      content_hash    TEXT,
      metadata        TEXT,
      created_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_mission_artifacts_subtask ON mission_artifacts(subtask_id);

    CREATE TABLE IF NOT EXISTS mission_evidence (
      id              TEXT PRIMARY KEY,
      run_id          TEXT NOT NULL REFERENCES mission_runs(id) ON DELETE CASCADE,
      subtask_id      TEXT REFERENCES mission_subtasks(id) ON DELETE SET NULL,
      review_id       TEXT,
      evidence_type   TEXT NOT NULL,
      content         TEXT NOT NULL,
      source_ref      TEXT,
      created_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_mission_evidence_subtask ON mission_evidence(subtask_id);
    CREATE INDEX IF NOT EXISTS idx_mission_evidence_review ON mission_evidence(review_id);

    CREATE TABLE IF NOT EXISTS mission_judge_reviews (
      id              TEXT PRIMARY KEY,
      run_id          TEXT NOT NULL REFERENCES mission_runs(id) ON DELETE CASCADE,
      subtask_id      TEXT NOT NULL REFERENCES mission_subtasks(id) ON DELETE CASCADE,
      judge_agent     TEXT,
      judge_method    TEXT NOT NULL,
      verdict         TEXT NOT NULL,
      reasoning       TEXT,
      evidence_ids    TEXT DEFAULT '[]',
      score           REAL,
      action          TEXT NOT NULL DEFAULT 'pass',
      created_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_mission_judge_reviews_subtask ON mission_judge_reviews(subtask_id);

    CREATE TABLE IF NOT EXISTS mission_retry_attempts (
      id              TEXT PRIMARY KEY,
      run_id          TEXT NOT NULL REFERENCES mission_runs(id) ON DELETE CASCADE,
      subtask_id      TEXT NOT NULL REFERENCES mission_subtasks(id) ON DELETE CASCADE,
      review_id       TEXT NOT NULL REFERENCES mission_judge_reviews(id) ON DELETE CASCADE,
      action          TEXT NOT NULL,
      reason          TEXT,
      new_instructions TEXT,
      created_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_mission_retry_attempts_subtask ON mission_retry_attempts(subtask_id);

    CREATE TABLE IF NOT EXISTS mission_merge_boundaries (
      id              TEXT PRIMARY KEY,
      run_id          TEXT NOT NULL REFERENCES mission_runs(id) ON DELETE CASCADE,
      subtask_ids     TEXT NOT NULL,
      artifact_ids    TEXT NOT NULL,
      merged_output   TEXT,
      merge_agent     TEXT,
      status          TEXT NOT NULL DEFAULT 'pending',
      judge_review_id TEXT,
      created_at      TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at    TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_mission_merge_boundaries_run ON mission_merge_boundaries(run_id);

    CREATE TABLE IF NOT EXISTS mission_sniff_checks (
      id              TEXT PRIMARY KEY,
      run_id          TEXT NOT NULL REFERENCES mission_runs(id) ON DELETE CASCADE,
      subtask_id      TEXT REFERENCES mission_subtasks(id) ON DELETE SET NULL,
      merge_id        TEXT REFERENCES mission_merge_boundaries(id) ON DELETE SET NULL,
      reviewer        TEXT,
      verdict         TEXT NOT NULL,
      issue_tags      TEXT DEFAULT '[]',
      notes           TEXT,
      force_retry     INTEGER NOT NULL DEFAULT 0,
      created_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_mission_sniff_checks_run ON mission_sniff_checks(run_id);
    CREATE INDEX IF NOT EXISTS idx_mission_sniff_checks_subtask ON mission_sniff_checks(subtask_id);

    CREATE TABLE IF NOT EXISTS mission_approvals (
      id              TEXT PRIMARY KEY,
      run_id          TEXT NOT NULL REFERENCES mission_runs(id) ON DELETE CASCADE,
      subtask_id      TEXT,
      merge_id        TEXT,
      approver        TEXT NOT NULL,
      decision        TEXT NOT NULL,
      reason          TEXT,
      created_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_mission_approvals_run ON mission_approvals(run_id);
  `);
}

// ── Helpers ───────────────────────────────────────────────────────────────

function hashContent(content: string): string {
  // FNV-1a 32-bit for deterministic content hashing
  let hash = 0x811c9dc5;
  for (let i = 0; i < content.length; i++) {
    hash ^= content.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function now(): string {
  return new Date().toISOString().replace("T", " ").replace("Z", "");
}

// ── Tool Definitions ──────────────────────────────────────────────────────

export const missionHarnessTools: McpTool[] = [
  // ═══════════════════════════════════════════════════════════════════════
  // 1. plan.decompose_mission
  // ═══════════════════════════════════════════════════════════════════════
  {
    name: "plan_decompose_mission",
    description:
      "Decompose a mission into subtasks with verifiability routing. " +
      "Creates a run, task plan, and subtask assignments. Each subtask gets " +
      "a verifiabilityTier (tier_1_machine | tier_2_expert), judgeMethod, " +
      "retryBudget, and requiresHumanSniffCheck flag. Enforces: one owner " +
      "per subtask, bounded input package, explicit output contract.",
    inputSchema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Mission title — what is the top-level goal?",
        },
        description: {
          type: "string",
          description: "Full mission description with context and constraints",
        },
        subtasks: {
          type: "array",
          description: "Ordered list of subtask decompositions",
          items: {
            type: "object",
            properties: {
              title: { type: "string", description: "Subtask title" },
              description: { type: "string", description: "What this subtask must accomplish" },
              ownerAgent: { type: "string", description: "Assigned agent (one owner, no shared editing)" },
              verifiabilityTier: {
                type: "string",
                enum: ["tier_1_machine", "tier_2_expert"],
                description: "Tier 1 = machine-checkable, Tier 2 = expert-checkable",
              },
              judgeMethod: {
                type: "string",
                enum: ["deterministic", "llm_judge", "human_review", "composite"],
                description: "How to verify this subtask's output",
              },
              retryBudget: {
                type: "number",
                description: "Max retry attempts before escalation (default: 3, max: 5)",
              },
              requiresSniffCheck: {
                type: "boolean",
                description: "Whether human sniff-check is required before merge",
              },
              inputPackage: {
                type: "string",
                description: "Bounded input — what data/context this subtask receives",
              },
              outputContract: {
                type: "string",
                description: "Explicit output contract — what this subtask must produce",
              },
              dependsOn: {
                type: "array",
                items: { type: "number" },
                description: "Indices (0-based) of subtasks this depends on",
              },
            },
            required: ["title", "verifiabilityTier", "judgeMethod", "outputContract"],
          },
        },
        rationale: {
          type: "string",
          description: "Why this decomposition was chosen (for traceability)",
        },
      },
      required: ["title", "subtasks"],
    },
    handler: async (args: {
      title: string;
      description?: string;
      subtasks: Array<{
        title: string;
        description?: string;
        ownerAgent?: string;
        verifiabilityTier: VerifiabilityTier;
        judgeMethod: JudgeMethod;
        retryBudget?: number;
        requiresSniffCheck?: boolean;
        inputPackage?: string;
        outputContract: string;
        dependsOn?: number[];
      }>;
      rationale?: string;
    }) => {
      ensureMissionTables();
      const db = getDb();

      // Validate bounds
      if (args.subtasks.length === 0) {
        return { error: "At least one subtask is required" };
      }
      if (args.subtasks.length > MAX_SUBTASKS) {
        return { error: `Max ${MAX_SUBTASKS} subtasks per mission` };
      }

      // Validate dependency indices
      for (const [i, st] of args.subtasks.entries()) {
        for (const dep of st.dependsOn ?? []) {
          if (dep < 0 || dep >= args.subtasks.length || dep === i) {
            return { error: `Subtask ${i} has invalid dependency index: ${dep}` };
          }
          if (dep >= i) {
            return { error: `Subtask ${i} depends on later subtask ${dep} — forward deps not allowed` };
          }
        }
      }

      const runId = genId("mrun");
      const planId = genId("mplan");
      const timestamp = now();

      // Create run
      db.prepare(
        `INSERT INTO mission_runs (id, title, description, status, created_at, updated_at)
         VALUES (?, ?, ?, 'planning', ?, ?)`
      ).run(runId, args.title, args.description ?? null, timestamp, timestamp);

      // Create task plan
      db.prepare(
        `INSERT INTO mission_task_plans (id, run_id, version, decomposition, rationale, created_at)
         VALUES (?, ?, 1, ?, ?, ?)`
      ).run(
        planId,
        runId,
        JSON.stringify(args.subtasks.map((s) => s.title)),
        args.rationale ?? null,
        timestamp
      );

      // Create subtasks
      const subtaskIds: string[] = [];
      const insertSubtask = db.prepare(
        `INSERT INTO mission_subtasks
         (id, run_id, plan_id, sequence, title, description, owner_agent, status,
          verifiability_tier, judge_method, retry_budget, requires_sniff_check,
          input_package, output_contract, depends_on, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );

      const txn = db.transaction(() => {
        for (const [i, st] of args.subtasks.entries()) {
          const subtaskId = genId("msub");
          subtaskIds.push(subtaskId);

          const retryBudget = Math.min(st.retryBudget ?? 3, MAX_RETRY_BUDGET);
          const depIds = (st.dependsOn ?? []).map((idx) => subtaskIds[idx]).filter(Boolean);

          insertSubtask.run(
            subtaskId,
            runId,
            planId,
            i,
            st.title,
            st.description ?? null,
            st.ownerAgent ?? null,
            st.verifiabilityTier,
            st.judgeMethod,
            retryBudget,
            st.requiresSniffCheck ? 1 : 0,
            st.inputPackage ?? null,
            st.outputContract,
            JSON.stringify(depIds),
            timestamp,
            timestamp
          );
        }
      });
      txn();

      // Transition to executing
      db.prepare(
        `UPDATE mission_runs SET status = 'executing', updated_at = ? WHERE id = ?`
      ).run(now(), runId);

      return {
        runId,
        planId,
        subtaskCount: subtaskIds.length,
        subtasks: subtaskIds.map((id, i) => ({
          id,
          sequence: i,
          title: args.subtasks[i].title,
          verifiabilityTier: args.subtasks[i].verifiabilityTier,
          judgeMethod: args.subtasks[i].judgeMethod,
          retryBudget: Math.min(args.subtasks[i].retryBudget ?? 3, MAX_RETRY_BUDGET),
          requiresSniffCheck: args.subtasks[i].requiresSniffCheck ?? false,
          dependsOn: (args.subtasks[i].dependsOn ?? []).map((idx) => subtaskIds[idx]),
        })),
        status: "executing",
        traceability: {
          receipt: `Mission ${runId} decomposed into ${subtaskIds.length} subtasks`,
          planVersion: 1,
          rationale: args.rationale ?? "not provided",
        },
      };
    },
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 2. judge.verify_subtask
  // ═══════════════════════════════════════════════════════════════════════
  {
    name: "judge_verify_subtask",
    description:
      "Judge verifies a subtask's output against its output contract. " +
      "Records verdict (pass/fail), reasoning, evidence references, and " +
      "recommended action (pass/retry/replan/escalate/stop). " +
      "Creates artifacts and evidence records for full traceability.",
    inputSchema: {
      type: "object",
      properties: {
        runId: { type: "string", description: "Mission run ID" },
        subtaskId: { type: "string", description: "Subtask ID to verify" },
        judgeAgent: { type: "string", description: "Judge agent identifier" },
        verdict: {
          type: "string",
          enum: ["pass", "fail"],
          description: "Did the subtask meet its output contract?",
        },
        reasoning: {
          type: "string",
          description: "Judge's reasoning for the verdict (full traceability, no hidden CoT)",
        },
        score: {
          type: "number",
          description: "Optional numeric score (0-1). No hardcoded floors — 0 means 0.",
        },
        evidence: {
          type: "array",
          description: "Evidence supporting the verdict",
          items: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: ["test_result", "diff", "screenshot", "metric", "document", "citation", "log"],
                description: "Evidence type",
              },
              content: { type: "string", description: "Evidence content or reference" },
              sourceRef: { type: "string", description: "Source reference (URL, file path, etc.)" },
            },
            required: ["type", "content"],
          },
        },
        artifacts: {
          type: "array",
          description: "Output artifacts from the subtask",
          items: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: ["code", "document", "data", "config", "test", "report", "other"],
                description: "Artifact type",
              },
              title: { type: "string", description: "Artifact title" },
              content: { type: "string", description: "Artifact content" },
            },
            required: ["type", "title", "content"],
          },
        },
        action: {
          type: "string",
          enum: ["pass", "retry", "replan", "escalate", "stop"],
          description: "Recommended next action based on verdict",
        },
      },
      required: ["runId", "subtaskId", "verdict", "reasoning", "action"],
    },
    handler: async (args: {
      runId: string;
      subtaskId: string;
      judgeAgent?: string;
      verdict: "pass" | "fail";
      reasoning: string;
      score?: number;
      evidence?: Array<{ type: string; content: string; sourceRef?: string }>;
      artifacts?: Array<{ type: string; title: string; content: string }>;
      action: RetryAction;
    }) => {
      ensureMissionTables();
      const db = getDb();

      // Validate subtask exists
      const subtask = db.prepare(
        "SELECT * FROM mission_subtasks WHERE id = ? AND run_id = ?"
      ).get(args.subtaskId, args.runId) as any;

      if (!subtask) {
        return { error: `Subtask ${args.subtaskId} not found in run ${args.runId}` };
      }

      // Validate score bounds (HONEST_SCORES — no hardcoded floors)
      if (args.score !== undefined && (args.score < 0 || args.score > 1)) {
        return { error: "Score must be between 0 and 1. No hardcoded floors." };
      }

      const timestamp = now();
      const reviewId = genId("mjrev");

      // Store evidence
      const evidenceIds: string[] = [];
      if (args.evidence) {
        const bounded = args.evidence.slice(0, MAX_EVIDENCE_PER_REVIEW);
        const insertEvidence = db.prepare(
          `INSERT INTO mission_evidence (id, run_id, subtask_id, review_id, evidence_type, content, source_ref, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        );
        for (const ev of bounded) {
          const evId = genId("mev");
          evidenceIds.push(evId);
          insertEvidence.run(evId, args.runId, args.subtaskId, reviewId, ev.type, ev.content, ev.sourceRef ?? null, timestamp);
        }
      }

      // Store artifacts
      const artifactIds: string[] = [];
      if (args.artifacts) {
        const bounded = args.artifacts.slice(0, MAX_ARTIFACTS_PER_MERGE);
        const insertArtifact = db.prepare(
          `INSERT INTO mission_artifacts (id, run_id, subtask_id, artifact_type, title, content, content_hash, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        );
        for (const art of bounded) {
          const artId = genId("mart");
          artifactIds.push(artId);
          insertArtifact.run(artId, args.runId, args.subtaskId, art.type, art.title, art.content, hashContent(art.content), timestamp);
        }
      }

      // Store judge review
      db.prepare(
        `INSERT INTO mission_judge_reviews
         (id, run_id, subtask_id, judge_agent, judge_method, verdict, reasoning, evidence_ids, score, action, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        reviewId,
        args.runId,
        args.subtaskId,
        args.judgeAgent ?? "unknown",
        subtask.judge_method,
        args.verdict,
        args.reasoning,
        JSON.stringify(evidenceIds),
        args.score ?? null,
        args.action,
        timestamp
      );

      // Update subtask status
      const newStatus: SubtaskStatus =
        args.action === "pass" ? "passed" :
        args.action === "retry" ? "retrying" :
        args.action === "escalate" ? "escalated" :
        args.action === "stop" ? "failed" :
        "review"; // replan

      db.prepare(
        `UPDATE mission_subtasks SET status = ?, updated_at = ?${newStatus === "passed" ? ", completed_at = ?" : ""} WHERE id = ?`
      ).run(...(newStatus === "passed" ? [newStatus, timestamp, timestamp, args.subtaskId] : [newStatus, timestamp, args.subtaskId]));

      // Log the step
      db.prepare(
        `INSERT INTO mission_run_steps (id, run_id, subtask_id, step_type, agent_id, input_summary, output_summary, status, created_at)
         VALUES (?, ?, ?, 'judge_review', ?, ?, ?, ?, ?)`
      ).run(
        genId("mstep"),
        args.runId,
        args.subtaskId,
        args.judgeAgent ?? "unknown",
        `Verifying subtask: ${subtask.title}`,
        `Verdict: ${args.verdict}, Action: ${args.action}`,
        args.verdict === "pass" ? "completed" : "pending",
        timestamp
      );

      // Check if sniff-check required
      const needsSniff = subtask.requires_sniff_check === 1 && args.action === "pass";
      if (needsSniff) {
        db.prepare(
          `UPDATE mission_subtasks SET status = 'review', updated_at = ? WHERE id = ?`
        ).run(now(), args.subtaskId);
      }

      return {
        reviewId,
        verdict: args.verdict,
        action: args.action,
        score: args.score ?? null,
        evidenceCount: evidenceIds.length,
        artifactCount: artifactIds.length,
        subtaskStatus: needsSniff ? "awaiting_sniff_check" : newStatus,
        needsSniffCheck: needsSniff,
        traceability: {
          receipt: `Judge review ${reviewId} for subtask ${args.subtaskId}: ${args.verdict} → ${args.action}`,
          evidenceRefs: evidenceIds,
          artifactRefs: artifactIds,
          reasoning: args.reasoning,
        },
      };
    },
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 3. judge.request_retry
  // ═══════════════════════════════════════════════════════════════════════
  {
    name: "judge_request_retry",
    description:
      "Request a retry, re-plan, escalation, or stop for a failed subtask. " +
      "Enforces retry budget — if exhausted, auto-escalates. " +
      "Actions: pass | retry | replan | escalate | stop. " +
      "If action is 'stop', marks subtask as unverifiable.",
    inputSchema: {
      type: "object",
      properties: {
        runId: { type: "string", description: "Mission run ID" },
        subtaskId: { type: "string", description: "Subtask ID to retry" },
        reviewId: { type: "string", description: "Judge review ID that triggered this" },
        action: {
          type: "string",
          enum: ["pass", "retry", "replan", "escalate", "stop"],
          description: "What to do next",
        },
        reason: { type: "string", description: "Why this action was chosen" },
        newInstructions: {
          type: "string",
          description: "Updated instructions for retry/replan (what to do differently)",
        },
      },
      required: ["runId", "subtaskId", "reviewId", "action", "reason"],
    },
    handler: async (args: {
      runId: string;
      subtaskId: string;
      reviewId: string;
      action: RetryAction;
      reason: string;
      newInstructions?: string;
    }) => {
      ensureMissionTables();
      const db = getDb();

      const subtask = db.prepare(
        "SELECT * FROM mission_subtasks WHERE id = ? AND run_id = ?"
      ).get(args.subtaskId, args.runId) as any;

      if (!subtask) {
        return { error: `Subtask ${args.subtaskId} not found in run ${args.runId}` };
      }

      const review = db.prepare(
        "SELECT * FROM mission_judge_reviews WHERE id = ?"
      ).get(args.reviewId) as any;

      if (!review) {
        return { error: `Review ${args.reviewId} not found` };
      }

      let effectiveAction = args.action;
      let budgetExhausted = false;

      // Enforce retry budget
      if (args.action === "retry") {
        if (subtask.retries_used >= subtask.retry_budget) {
          effectiveAction = "escalate";
          budgetExhausted = true;
        } else {
          db.prepare(
            `UPDATE mission_subtasks SET retries_used = retries_used + 1, status = 'retrying', updated_at = ? WHERE id = ?`
          ).run(now(), args.subtaskId);
        }
      }

      // Record the attempt
      const attemptId = genId("mretry");
      db.prepare(
        `INSERT INTO mission_retry_attempts (id, run_id, subtask_id, review_id, action, reason, new_instructions, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(attemptId, args.runId, args.subtaskId, args.reviewId, effectiveAction, args.reason, args.newInstructions ?? null, now());

      // Update subtask status based on action
      const statusMap: Record<string, SubtaskStatus> = {
        pass: "passed",
        retry: "retrying",
        replan: "pending",
        escalate: "escalated",
        stop: "failed",
      };

      const newStatus = statusMap[effectiveAction] ?? "pending";
      db.prepare(
        `UPDATE mission_subtasks SET status = ?, updated_at = ? WHERE id = ?`
      ).run(newStatus, now(), args.subtaskId);

      // If stop, check if whole run should stop
      if (effectiveAction === "stop") {
        const remaining = db.prepare(
          `SELECT COUNT(*) as c FROM mission_subtasks WHERE run_id = ? AND status NOT IN ('passed', 'failed')`
        ).get(args.runId) as any;
        if (remaining.c === 0) {
          db.prepare(
            `UPDATE mission_runs SET status = 'failed', updated_at = ?, completed_at = ? WHERE id = ?`
          ).run(now(), now(), args.runId);
        }
      }

      return {
        attemptId,
        requestedAction: args.action,
        effectiveAction,
        budgetExhausted,
        retriesUsed: subtask.retries_used + (effectiveAction === "retry" ? 1 : 0),
        retryBudget: subtask.retry_budget,
        subtaskStatus: newStatus,
        traceability: {
          receipt: `Retry attempt ${attemptId}: ${args.action}${budgetExhausted ? " → auto-escalated (budget exhausted)" : ""}`,
          decision: effectiveAction,
          reason: args.reason,
          newInstructions: args.newInstructions ?? null,
        },
      };
    },
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 4. merge.compose_output
  // ═══════════════════════════════════════════════════════════════════════
  {
    name: "merge_compose_output",
    description:
      "Judge-gated merge of subtask artifacts into a composed output. " +
      "Only merges subtasks that have passed verification. " +
      "Enforces: no shared free-for-all editing — merge boundary is explicit. " +
      "Optionally requires judge review of the merged output.",
    inputSchema: {
      type: "object",
      properties: {
        runId: { type: "string", description: "Mission run ID" },
        subtaskIds: {
          type: "array",
          items: { type: "string" },
          description: "Subtask IDs to merge (must all be passed)",
        },
        mergeAgent: { type: "string", description: "Agent performing the merge" },
        mergedOutput: {
          type: "string",
          description: "The composed output from merging subtask artifacts",
        },
        requiresJudgeReview: {
          type: "boolean",
          description: "Whether the merged output needs judge review before finalization",
        },
      },
      required: ["runId", "subtaskIds", "mergedOutput"],
    },
    handler: async (args: {
      runId: string;
      subtaskIds: string[];
      mergeAgent?: string;
      mergedOutput: string;
      requiresJudgeReview?: boolean;
    }) => {
      ensureMissionTables();
      const db = getDb();

      // Validate run exists
      const run = db.prepare("SELECT * FROM mission_runs WHERE id = ?").get(args.runId) as any;
      if (!run) {
        return { error: `Run ${args.runId} not found` };
      }

      // Validate all subtasks are passed
      const notPassed: string[] = [];
      for (const stId of args.subtaskIds) {
        const st = db.prepare(
          "SELECT id, status, title FROM mission_subtasks WHERE id = ? AND run_id = ?"
        ).get(stId, args.runId) as any;
        if (!st) {
          return { error: `Subtask ${stId} not found in run ${args.runId}` };
        }
        if (st.status !== "passed") {
          notPassed.push(`${stId} (${st.title}: ${st.status})`);
        }
      }

      if (notPassed.length > 0) {
        return {
          error: "Judge-gated merge: all subtasks must be passed before merge",
          notPassed,
          hint: "Use judge_verify_subtask to pass remaining subtasks first",
        };
      }

      // Collect artifact IDs from subtasks
      const artifactIds: string[] = [];
      for (const stId of args.subtaskIds) {
        const arts = db.prepare(
          "SELECT id FROM mission_artifacts WHERE subtask_id = ?"
        ).all(stId) as any[];
        for (const art of arts) {
          artifactIds.push(art.id);
        }
      }

      // Create merge boundary
      const mergeId = genId("mmerge");
      const status = args.requiresJudgeReview ? "pending" : "completed";
      const timestamp = now();

      db.prepare(
        `INSERT INTO mission_merge_boundaries
         (id, run_id, subtask_ids, artifact_ids, merged_output, merge_agent, status, created_at${status === "completed" ? ", completed_at" : ""})
         VALUES (?, ?, ?, ?, ?, ?, ?, ?${status === "completed" ? ", ?" : ""})`
      ).run(
        ...(status === "completed"
          ? [mergeId, args.runId, JSON.stringify(args.subtaskIds), JSON.stringify(artifactIds), args.mergedOutput, args.mergeAgent ?? null, status, timestamp, timestamp]
          : [mergeId, args.runId, JSON.stringify(args.subtaskIds), JSON.stringify(artifactIds), args.mergedOutput, args.mergeAgent ?? null, status, timestamp])
      );

      // If all subtasks merged and no further review needed, complete the run
      if (!args.requiresJudgeReview) {
        const totalSubtasks = db.prepare(
          "SELECT COUNT(*) as c FROM mission_subtasks WHERE run_id = ?"
        ).get(args.runId) as any;
        const passedSubtasks = db.prepare(
          "SELECT COUNT(*) as c FROM mission_subtasks WHERE run_id = ? AND status = 'passed'"
        ).get(args.runId) as any;

        if (passedSubtasks.c === totalSubtasks.c) {
          db.prepare(
            `UPDATE mission_runs SET status = 'completed', updated_at = ?, completed_at = ? WHERE id = ?`
          ).run(now(), now(), args.runId);
        }
      } else {
        db.prepare(
          `UPDATE mission_runs SET status = 'merging', updated_at = ? WHERE id = ?`
        ).run(now(), args.runId);
      }

      return {
        mergeId,
        subtasksMerged: args.subtaskIds.length,
        artifactsMerged: artifactIds.length,
        status,
        requiresJudgeReview: args.requiresJudgeReview ?? false,
        contentHash: hashContent(args.mergedOutput),
        traceability: {
          receipt: `Merge ${mergeId}: ${args.subtaskIds.length} subtasks → composed output`,
          subtaskIds: args.subtaskIds,
          artifactIds,
          mergedContentHash: hashContent(args.mergedOutput),
        },
      };
    },
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 5. sniff.record_human_review
  // ═══════════════════════════════════════════════════════════════════════
  {
    name: "sniff_record_human_review",
    description:
      "Record a human sniff-check for a subtask or merge output. " +
      "Verdicts: pass | concern | block. " +
      "Issue tags: unsupported_claim, weak_evidence, not_credible, " +
      "too_risky, scope_drift, missing_source, contradictory, stale_data. " +
      "If verdict is 'block', creates a force-retry path.",
    inputSchema: {
      type: "object",
      properties: {
        runId: { type: "string", description: "Mission run ID" },
        subtaskId: {
          type: "string",
          description: "Subtask ID being reviewed (mutually exclusive with mergeId)",
        },
        mergeId: {
          type: "string",
          description: "Merge boundary ID being reviewed (mutually exclusive with subtaskId)",
        },
        reviewer: { type: "string", description: "Human reviewer identifier" },
        verdict: {
          type: "string",
          enum: ["pass", "concern", "block"],
          description: "pass = approved, concern = flagged but proceed, block = force retry",
        },
        issueTags: {
          type: "array",
          items: {
            type: "string",
            enum: [
              "unsupported_claim", "weak_evidence", "not_credible",
              "too_risky", "scope_drift", "missing_source",
              "contradictory", "stale_data",
            ],
          },
          description: "Issue tags categorizing the concern/block",
        },
        notes: {
          type: "string",
          description: "Free-text notes from the reviewer",
        },
      },
      required: ["runId", "verdict"],
    },
    handler: async (args: {
      runId: string;
      subtaskId?: string;
      mergeId?: string;
      reviewer?: string;
      verdict: SniffVerdict;
      issueTags?: IssueTag[];
      notes?: string;
    }) => {
      ensureMissionTables();
      const db = getDb();

      // Validate target
      if (!args.subtaskId && !args.mergeId) {
        return { error: "Either subtaskId or mergeId is required" };
      }

      // Validate run exists
      const run = db.prepare("SELECT * FROM mission_runs WHERE id = ?").get(args.runId) as any;
      if (!run) {
        return { error: `Run ${args.runId} not found` };
      }

      const forceRetry = args.verdict === "block" ? 1 : 0;
      const sniffId = genId("msniff");
      const timestamp = now();

      db.prepare(
        `INSERT INTO mission_sniff_checks
         (id, run_id, subtask_id, merge_id, reviewer, verdict, issue_tags, notes, force_retry, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        sniffId,
        args.runId,
        args.subtaskId ?? null,
        args.mergeId ?? null,
        args.reviewer ?? "human",
        args.verdict,
        JSON.stringify(args.issueTags ?? []),
        args.notes ?? null,
        forceRetry,
        timestamp
      );

      // Record approval/block
      db.prepare(
        `INSERT INTO mission_approvals (id, run_id, subtask_id, merge_id, approver, decision, reason, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        genId("mappr"),
        args.runId,
        args.subtaskId ?? null,
        args.mergeId ?? null,
        args.reviewer ?? "human",
        args.verdict,
        args.notes ?? null,
        timestamp
      );

      // Handle force-retry (block verdict)
      if (forceRetry && args.subtaskId) {
        db.prepare(
          `UPDATE mission_subtasks SET status = 'retrying', updated_at = ? WHERE id = ?`
        ).run(now(), args.subtaskId);
      }
      if (forceRetry && args.mergeId) {
        db.prepare(
          `UPDATE mission_merge_boundaries SET status = 'pending', completed_at = NULL WHERE id = ?`
        ).run(args.mergeId);
      }

      // On pass, update run status
      if (args.verdict === "pass") {
        if (args.subtaskId) {
          db.prepare(
            `UPDATE mission_subtasks SET status = 'passed', updated_at = ?, completed_at = ? WHERE id = ?`
          ).run(now(), now(), args.subtaskId);
        }
        if (args.mergeId) {
          db.prepare(
            `UPDATE mission_merge_boundaries SET status = 'completed', completed_at = ? WHERE id = ?`
          ).run(now(), args.mergeId);

          // Check if run is now complete
          const allMerges = db.prepare(
            "SELECT COUNT(*) as c FROM mission_merge_boundaries WHERE run_id = ? AND status != 'completed'"
          ).get(args.runId) as any;
          if (allMerges.c === 0) {
            db.prepare(
              `UPDATE mission_runs SET status = 'completed', updated_at = ?, completed_at = ? WHERE id = ?`
            ).run(now(), now(), args.runId);
          }
        }
      }

      return {
        sniffCheckId: sniffId,
        verdict: args.verdict,
        issueTags: args.issueTags ?? [],
        forceRetry: forceRetry === 1,
        target: args.subtaskId ? `subtask:${args.subtaskId}` : `merge:${args.mergeId}`,
        traceability: {
          receipt: `Sniff-check ${sniffId}: ${args.verdict}${forceRetry ? " → force retry" : ""}`,
          reviewer: args.reviewer ?? "human",
          issueTags: args.issueTags ?? [],
          notes: args.notes ?? null,
          decision: args.verdict,
        },
      };
    },
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 6. harness.get_mission_status (read-only query)
  // ═══════════════════════════════════════════════════════════════════════
  {
    name: "harness_get_mission_status",
    description:
      "Get full mission execution status: run info, subtask states, " +
      "judge reviews, sniff-checks, merge boundaries, and traceability " +
      "receipts. Read-only query for the Mission Graph / Live Execution Board.",
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: "object",
      properties: {
        runId: { type: "string", description: "Mission run ID" },
        includeEvidence: {
          type: "boolean",
          description: "Include evidence records (default: false for performance)",
        },
      },
      required: ["runId"],
    },
    handler: async (args: { runId: string; includeEvidence?: boolean }) => {
      ensureMissionTables();
      const db = getDb();

      const run = db.prepare("SELECT * FROM mission_runs WHERE id = ?").get(args.runId) as any;
      if (!run) {
        return { error: `Run ${args.runId} not found` };
      }

      const subtasks = db.prepare(
        "SELECT * FROM mission_subtasks WHERE run_id = ? ORDER BY sequence"
      ).all(args.runId) as any[];

      const reviews = db.prepare(
        "SELECT * FROM mission_judge_reviews WHERE run_id = ? ORDER BY created_at"
      ).all(args.runId) as any[];

      const sniffChecks = db.prepare(
        "SELECT * FROM mission_sniff_checks WHERE run_id = ? ORDER BY created_at"
      ).all(args.runId) as any[];

      const merges = db.prepare(
        "SELECT * FROM mission_merge_boundaries WHERE run_id = ? ORDER BY created_at"
      ).all(args.runId) as any[];

      const retries = db.prepare(
        "SELECT * FROM mission_retry_attempts WHERE run_id = ? ORDER BY created_at"
      ).all(args.runId) as any[];

      const approvals = db.prepare(
        "SELECT * FROM mission_approvals WHERE run_id = ? ORDER BY created_at"
      ).all(args.runId) as any[];

      let evidence: any[] = [];
      if (args.includeEvidence) {
        evidence = db.prepare(
          "SELECT * FROM mission_evidence WHERE run_id = ? ORDER BY created_at"
        ).all(args.runId) as any[];
      }

      // Compute summary stats
      const statusCounts: Record<string, number> = {};
      for (const st of subtasks) {
        statusCounts[st.status] = (statusCounts[st.status] ?? 0) + 1;
      }

      const passRate = subtasks.length > 0
        ? (statusCounts["passed"] ?? 0) / subtasks.length
        : 0;

      return {
        run: {
          id: run.id,
          title: run.title,
          description: run.description,
          status: run.status,
          createdAt: run.created_at,
          completedAt: run.completed_at,
        },
        summary: {
          totalSubtasks: subtasks.length,
          statusCounts,
          passRate: Math.round(passRate * 100) / 100,
          totalReviews: reviews.length,
          totalSniffChecks: sniffChecks.length,
          totalRetries: retries.length,
          totalMerges: merges.length,
          totalApprovals: approvals.length,
        },
        subtasks: subtasks.map((st) => ({
          id: st.id,
          sequence: st.sequence,
          title: st.title,
          status: st.status,
          ownerAgent: st.owner_agent,
          verifiabilityTier: st.verifiability_tier,
          judgeMethod: st.judge_method,
          retryBudget: st.retry_budget,
          retriesUsed: st.retries_used,
          requiresSniffCheck: st.requires_sniff_check === 1,
          outputContract: st.output_contract,
          dependsOn: JSON.parse(st.depends_on || "[]"),
        })),
        reviews: reviews.map((r) => ({
          id: r.id,
          subtaskId: r.subtask_id,
          verdict: r.verdict,
          action: r.action,
          score: r.score,
          reasoning: r.reasoning,
          createdAt: r.created_at,
        })),
        sniffChecks: sniffChecks.map((s) => ({
          id: s.id,
          subtaskId: s.subtask_id,
          mergeId: s.merge_id,
          verdict: s.verdict,
          issueTags: JSON.parse(s.issue_tags || "[]"),
          forceRetry: s.force_retry === 1,
          notes: s.notes,
        })),
        merges: merges.map((m) => ({
          id: m.id,
          subtaskIds: JSON.parse(m.subtask_ids || "[]"),
          status: m.status,
          contentPreview: m.merged_output?.slice(0, 200) ?? null,
        })),
        retries,
        approvals,
        ...(args.includeEvidence ? { evidence } : {}),
      };
    },
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 7. harness.list_runs (discovery)
  // ═══════════════════════════════════════════════════════════════════════
  {
    name: "harness_list_runs",
    description:
      "List all mission runs with status summary. " +
      "Supports filtering by status. For the Live Execution Board.",
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["planning", "executing", "reviewing", "merging", "sniff_check", "completed", "failed", "stopped"],
          description: "Filter by run status (optional)",
        },
        limit: {
          type: "number",
          description: "Max results (default: 20, max: 100)",
        },
      },
    },
    handler: async (args: { status?: RunStatus; limit?: number }) => {
      ensureMissionTables();
      const db = getDb();

      const limit = Math.min(args.limit ?? 20, 100);
      let runs: any[];

      if (args.status) {
        runs = db.prepare(
          "SELECT * FROM mission_runs WHERE status = ? ORDER BY created_at DESC LIMIT ?"
        ).all(args.status, limit) as any[];
      } else {
        runs = db.prepare(
          "SELECT * FROM mission_runs ORDER BY created_at DESC LIMIT ?"
        ).all(limit) as any[];
      }

      // Enrich with subtask counts
      return {
        runs: runs.map((r) => {
          const counts = db.prepare(
            `SELECT status, COUNT(*) as c FROM mission_subtasks WHERE run_id = ? GROUP BY status`
          ).all(r.id) as any[];

          const statusMap: Record<string, number> = {};
          for (const c of counts) statusMap[c.status] = c.c;

          return {
            id: r.id,
            title: r.title,
            status: r.status,
            createdAt: r.created_at,
            completedAt: r.completed_at,
            subtaskCounts: statusMap,
          };
        }),
        total: runs.length,
      };
    },
  },
];
