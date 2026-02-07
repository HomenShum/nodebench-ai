/**
 * Verification tools — 6-Phase Iterative Deep-Dive Verification Process.
 * Guides agents through systematic verification of non-trivial implementations.
 */

import { getDb, genId } from "../db.js";
import type { McpTool } from "../types.js";

const PHASE_NAMES = [
  "context_gathering",
  "gap_analysis",
  "implementation",
  "testing",
  "self_verify",
  "document",
] as const;

const PHASE_INSTRUCTIONS: Record<string, string> = {
  context_gathering: `Phase 1: Context Gathering (Parallel Research)
Launch parallel research into:
- SDK/Protocol specs: Latest versions, blogs, announcements, GitHub repos, official SDKs
- Implementation audit: Current codebase patterns, inconsistencies, unused code
- Dispatcher/backend audit: Function signatures, allowlists, argument shapes
- External API research: Check if third-party APIs still work, find known breaking changes

Goal: Build a comprehensive picture of "what production looks like" vs "what we have."
TIP: Call search_learnings first to check for known issues related to this work.`,

  gap_analysis: `Phase 2: Gap Analysis
Compare Phase 1 findings against current implementation. For each gap found, call log_gap with:
- severity: CRITICAL (protocol violations, security), HIGH (API incompatibilities, silent failures), MEDIUM (outdated versions, missing features), LOW (edge case handling)
- root_cause: Why the gap exists
- fix_strategy: How to fix it

Output: A numbered gap list. Fix CRITICAL and HIGH first.`,

  implementation: `Phase 3: Implementation
Apply fixes following production patterns exactly. Rules:
- Fix CRITICAL and HIGH gaps first
- Each fix is a discrete, testable change
- Follow the reference pattern found in Phase 1 — don't invent new patterns
- Document why each change was made (comments in code where non-obvious)
- Call resolve_gap as you fix each gap`,

  testing: `Phase 4: Testing & Validation (Multi-Layer — CRITICAL)
Run tests at all 5 layers. Call log_test_result for each:
- Layer 1: static — TypeScript tsc --noEmit, type checking
- Layer 2: unit — Run existing test suites, add targeted tests for fixes
- Layer 3: integration — End-to-end flow through handler chain
- Layer 4: manual — Spot-check critical paths with curl or direct invocation
- Layer 5: live_e2e — Deploy to staging, hit real endpoints, verify real responses

ALL layers must pass before proceeding to Phase 5.`,

  self_verify: `Phase 5: Self-Closed-Loop Verification (Parallel Checks)
Launch parallel verification checks, each targeting a different dimension:
- Spec compliance: Does every response match the protocol spec exactly?
- Functional correctness: Do tools return correct data for known inputs?
- Argument compatibility: Do all handler-backend function pairs have matching shapes?

Each check produces PASS/FAIL. Any FAIL loops back to Phase 3 (Implementation).`,

  document: `Phase 6: Document Learnings
Record what you discovered. For each edge case, gotcha, or pattern, call record_learning with:
- key: Short identifier (e.g. 'convex-use-node-export-restriction')
- content: What happened, why, and how to avoid it
- category: edge_case | gotcha | pattern | regression | convention
- sourceCycle: This verification cycle's ID

This prevents future regressions and expands the knowledge base.`,
};

export const verificationTools: McpTool[] = [
  {
    name: "start_verification_cycle",
    description:
      "Start a new 6-phase verification cycle for a non-trivial implementation. Returns the cycle ID and Phase 1 instructions. Call this before declaring any integration, migration, or protocol-level change done.",
    inputSchema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description:
            "What you are verifying (e.g. 'MCP protocol compliance', 'Auth migration')",
        },
        description: {
          type: "string",
          description: "Context about the change being verified",
        },
      },
      required: ["title"],
    },
    handler: async (args) => {
      const { title, description } = args;
      if (!title) throw new Error("Title is required");

      const db = getDb();
      const cycleId = genId("cycle");
      const now = new Date().toISOString();

      db.prepare(
        "INSERT INTO verification_cycles (id, title, description, status, current_phase, created_at, updated_at) VALUES (?, ?, ?, 'active', 1, ?, ?)"
      ).run(cycleId, title, description ?? null, now, now);

      // Create all 6 phase rows
      const insertPhase = db.prepare(
        "INSERT INTO verification_phases (id, cycle_id, phase_number, phase_name, status, started_at) VALUES (?, ?, ?, ?, ?, ?)"
      );

      for (let i = 0; i < PHASE_NAMES.length; i++) {
        const phaseId = genId("phase");
        const status = i === 0 ? "in_progress" : "pending";
        const startedAt = i === 0 ? now : null;
        insertPhase.run(phaseId, cycleId, i + 1, PHASE_NAMES[i], status, startedAt);
      }

      return {
        cycleId,
        title,
        currentPhase: 1,
        phaseName: PHASE_NAMES[0],
        instructions: PHASE_INSTRUCTIONS[PHASE_NAMES[0]],
        allPhases: PHASE_NAMES.map((name, i) => ({
          number: i + 1,
          name,
          status: i === 0 ? "in_progress" : "pending",
        })),
      };
    },
  },
  {
    name: "log_phase_findings",
    description:
      "Record findings for the current phase of a verification cycle. Advances the cycle to the next phase if the current phase passes. If it fails, returns guidance to loop back.",
    inputSchema: {
      type: "object",
      properties: {
        cycleId: { type: "string", description: "Verification cycle ID" },
        phaseNumber: {
          type: "number",
          description: "Phase to record (1-6)",
        },
        status: {
          type: "string",
          enum: ["passed", "failed"],
          description: "Did this phase pass?",
        },
        findings: {
          type: "object",
          description: "Phase-specific structured findings",
        },
      },
      required: ["cycleId", "phaseNumber", "status"],
    },
    handler: async (args) => {
      const { cycleId, phaseNumber, status, findings } = args;
      const db = getDb();
      const now = new Date().toISOString();

      const cycle = db
        .prepare("SELECT * FROM verification_cycles WHERE id = ?")
        .get(cycleId) as any;
      if (!cycle) throw new Error(`Cycle not found: ${cycleId}`);

      const phase = db
        .prepare(
          "SELECT * FROM verification_phases WHERE cycle_id = ? AND phase_number = ?"
        )
        .get(cycleId, phaseNumber) as any;
      if (!phase) throw new Error(`Phase ${phaseNumber} not found in cycle`);

      // Update this phase
      db.prepare(
        "UPDATE verification_phases SET status = ?, findings = ?, completed_at = ? WHERE id = ?"
      ).run(status, findings ? JSON.stringify(findings) : null, now, phase.id);

      let nextPhase: number | null = null;
      let nextPhaseInstructions: string | null = null;
      let cycleComplete = false;

      if (status === "passed") {
        if (phaseNumber < 6) {
          nextPhase = phaseNumber + 1;
          const nextPhaseName = PHASE_NAMES[(nextPhase as number) - 1];
          nextPhaseInstructions = PHASE_INSTRUCTIONS[nextPhaseName];

          // Advance cycle and start next phase
          db.prepare(
            "UPDATE verification_cycles SET current_phase = ?, updated_at = ? WHERE id = ?"
          ).run(nextPhase, now, cycleId);
          db.prepare(
            "UPDATE verification_phases SET status = 'in_progress', started_at = ? WHERE cycle_id = ? AND phase_number = ?"
          ).run(now, cycleId, nextPhase);
        } else {
          // Phase 6 passed — cycle complete
          cycleComplete = true;
          db.prepare(
            "UPDATE verification_cycles SET status = 'completed', updated_at = ? WHERE id = ?"
          ).run(now, cycleId);
        }
      } else {
        // Phase failed
        const loopBackPhase =
          phaseNumber === 5 ? 3 : phaseNumber; // Phase 5 failure loops to Phase 3
        nextPhaseInstructions = `Phase ${phaseNumber} FAILED. ${
          phaseNumber === 5
            ? "Loop back to Phase 3 (Implementation) to fix the issues found."
            : "Review the failures and retry this phase."
        }`;
      }

      return {
        cycleId,
        phaseRecorded: phaseNumber,
        phaseStatus: status,
        nextPhase,
        nextPhaseInstructions,
        cycleComplete,
        ...(cycleComplete
          ? {
              _contributeBack: {
                instruction:
                  "Cycle complete! Record what you learned so future agents benefit:",
                actions: [
                  "record_learning — for each edge case, gotcha, or pattern discovered",
                  "log_recon_finding — for any SDK/API discoveries made during research",
                  "search_all_knowledge — check what the system already knows before your next task",
                ],
              },
            }
          : {}),
      };
    },
  },
  {
    name: "log_gap",
    description:
      "Record a gap found during Phase 2 (Gap Analysis). Gaps are categorized by severity: CRITICAL (protocol violations, security), HIGH (API incompatibilities), MEDIUM (outdated versions), LOW (edge cases).",
    inputSchema: {
      type: "object",
      properties: {
        cycleId: { type: "string", description: "Verification cycle ID" },
        severity: {
          type: "string",
          enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW"],
        },
        title: { type: "string", description: "Short gap description" },
        description: { type: "string", description: "Detailed description" },
        rootCause: { type: "string", description: "Why this gap exists" },
        fixStrategy: { type: "string", description: "How to fix it" },
      },
      required: ["cycleId", "severity", "title"],
    },
    handler: async (args) => {
      const { cycleId, severity, title, description, rootCause, fixStrategy } =
        args;
      const db = getDb();
      const gapId = genId("gap");

      db.prepare(
        "INSERT INTO gaps (id, cycle_id, severity, title, description, root_cause, fix_strategy) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).run(
        gapId,
        cycleId,
        severity,
        title,
        description ?? null,
        rootCause ?? null,
        fixStrategy ?? null
      );

      return {
        gapId,
        severity,
        title,
        message: "Fix CRITICAL and HIGH gaps first.",
      };
    },
  },
  {
    name: "resolve_gap",
    description:
      "Mark a gap as resolved after implementing the fix. Returns remaining gap counts by severity.",
    inputSchema: {
      type: "object",
      properties: {
        gapId: { type: "string", description: "Gap ID to resolve" },
        resolution: {
          type: "string",
          description: "What was done to fix it",
        },
      },
      required: ["gapId"],
    },
    handler: async (args) => {
      const db = getDb();
      const now = new Date().toISOString();

      const gap = db
        .prepare("SELECT * FROM gaps WHERE id = ?")
        .get(args.gapId) as any;
      if (!gap) throw new Error(`Gap not found: ${args.gapId}`);

      db.prepare(
        "UPDATE gaps SET status = 'resolved', fix_strategy = COALESCE(?, fix_strategy), resolved_at = ? WHERE id = ?"
      ).run(args.resolution ?? null, now, args.gapId);

      // Count remaining open gaps for this cycle
      const remaining = db
        .prepare(
          "SELECT severity, COUNT(*) as count FROM gaps WHERE cycle_id = ? AND status = 'open' GROUP BY severity"
        )
        .all(gap.cycle_id) as any[];

      const counts: Record<string, number> = {
        CRITICAL: 0,
        HIGH: 0,
        MEDIUM: 0,
        LOW: 0,
      };
      for (const r of remaining) counts[r.severity] = r.count;

      return {
        gapId: args.gapId,
        status: "resolved",
        remainingGaps: counts,
        _contributeBack: {
          instruction:
            "Gap resolved. Record what you learned so it's searchable for future work:",
          actions: [
            "record_learning — capture the root cause and fix as a reusable pattern",
          ],
        },
      };
    },
  },
  {
    name: "log_test_result",
    description:
      "Record a test result for Phase 4 (Testing & Validation). Tests are organized by layer: static, unit, integration, manual, live_e2e. All layers must pass before proceeding.",
    inputSchema: {
      type: "object",
      properties: {
        cycleId: { type: "string", description: "Verification cycle ID" },
        layer: {
          type: "string",
          enum: ["static", "unit", "integration", "manual", "live_e2e"],
          description: "Test layer",
        },
        label: {
          type: "string",
          description: "What was tested (e.g. 'tsc --noEmit', 'jest auth.test')",
        },
        passed: { type: "boolean", description: "Did the test pass?" },
        output: {
          type: "string",
          description: "Error message or success detail",
        },
      },
      required: ["cycleId", "layer", "label", "passed"],
    },
    handler: async (args) => {
      const { cycleId, layer, label, passed, output } = args;
      const db = getDb();
      const testId = genId("test");

      db.prepare(
        "INSERT INTO test_results (id, cycle_id, layer, label, passed, output) VALUES (?, ?, ?, ?, ?, ?)"
      ).run(testId, cycleId, layer, label, passed ? 1 : 0, output ?? null);

      // Summarize this layer
      const layerResults = db
        .prepare(
          "SELECT passed, COUNT(*) as count FROM test_results WHERE cycle_id = ? AND layer = ? GROUP BY passed"
        )
        .all(cycleId, layer) as any[];

      const layerTotal = layerResults.reduce(
        (s: number, r: any) => s + r.count,
        0
      );
      const layerPassed = layerResults.find((r: any) => r.passed === 1)?.count ?? 0;
      const layerFailed = layerTotal - layerPassed;

      // Check all layers
      const allResults = db
        .prepare(
          "SELECT layer, MIN(passed) as all_passed FROM test_results WHERE cycle_id = ? GROUP BY layer"
        )
        .all(cycleId) as any[];
      const allLayersPassing =
        allResults.length > 0 &&
        allResults.every((r: any) => r.all_passed === 1);

      return {
        testId,
        layer,
        passed,
        layerSummary: {
          total: layerTotal,
          passed: layerPassed,
          failed: layerFailed,
        },
        allLayersPassing,
      };
    },
  },
  {
    name: "get_verification_status",
    description:
      "Get the current status of a verification cycle including all phases, gaps, and test results. Use this to understand where you are in the process and what to do next.",
    inputSchema: {
      type: "object",
      properties: {
        cycleId: { type: "string", description: "Verification cycle ID" },
      },
      required: ["cycleId"],
    },
    handler: async (args) => {
      const db = getDb();

      const cycle = db
        .prepare("SELECT * FROM verification_cycles WHERE id = ?")
        .get(args.cycleId) as any;
      if (!cycle) throw new Error(`Cycle not found: ${args.cycleId}`);

      const phases = db
        .prepare(
          "SELECT * FROM verification_phases WHERE cycle_id = ? ORDER BY phase_number"
        )
        .all(args.cycleId) as any[];

      const gaps = db
        .prepare(
          "SELECT severity, status, COUNT(*) as count FROM gaps WHERE cycle_id = ? GROUP BY severity, status"
        )
        .all(args.cycleId) as any[];

      const tests = db
        .prepare(
          "SELECT layer, passed, COUNT(*) as count FROM test_results WHERE cycle_id = ? GROUP BY layer, passed"
        )
        .all(args.cycleId) as any[];

      const completedPhases = phases.filter(
        (p: any) => p.status === "passed"
      ).length;
      const progress = Math.round((completedPhases / 6) * 100);

      const currentPhaseName = PHASE_NAMES[cycle.current_phase - 1];
      const nextAction =
        cycle.status === "completed"
          ? "Cycle complete. Consider promoting findings to eval suite with promote_to_eval."
          : PHASE_INSTRUCTIONS[currentPhaseName];

      return {
        cycleId: cycle.id,
        title: cycle.title,
        status: cycle.status,
        currentPhase: cycle.current_phase,
        progress: `${progress}%`,
        phases: phases.map((p: any) => ({
          number: p.phase_number,
          name: p.phase_name,
          status: p.status,
          findings: p.findings ? JSON.parse(p.findings) : null,
        })),
        gaps: gaps.map((g: any) => ({
          severity: g.severity,
          status: g.status,
          count: g.count,
        })),
        tests: tests.map((t: any) => ({
          layer: t.layer,
          passed: t.passed === 1,
          count: t.count,
        })),
        nextAction,
      };
    },
  },
  {
    name: "list_verification_cycles",
    description:
      "List all verification cycles, optionally filtered by status. Use this to find a cycle ID or review past verifications.",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["active", "completed", "abandoned"],
          description: "Filter by status (optional, returns all if omitted)",
        },
        limit: {
          type: "number",
          description: "Max results (default 20)",
        },
      },
    },
    handler: async (args) => {
      const db = getDb();
      const limit = args.limit ?? 20;

      const rows = args.status
        ? (db
            .prepare(
              "SELECT * FROM verification_cycles WHERE status = ? ORDER BY created_at DESC LIMIT ?"
            )
            .all(args.status, limit) as any[])
        : (db
            .prepare(
              "SELECT * FROM verification_cycles ORDER BY created_at DESC LIMIT ?"
            )
            .all(limit) as any[]);

      return {
        count: rows.length,
        cycles: rows.map((r: any) => ({
          cycleId: r.id,
          title: r.title,
          status: r.status,
          currentPhase: r.current_phase,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        })),
      };
    },
  },
  {
    name: "abandon_cycle",
    description:
      "Abandon an active verification cycle that will not be completed. Use this to clean up orphaned or stale cycles.",
    inputSchema: {
      type: "object",
      properties: {
        cycleId: {
          type: "string",
          description: "The verification cycle ID to abandon",
        },
        reason: {
          type: "string",
          description: "Why this cycle is being abandoned (optional)",
        },
      },
      required: ["cycleId"],
    },
    handler: async (args: { cycleId: string; reason?: string }) => {
      const db = getDb();
      const cycle = db
        .prepare("SELECT * FROM verification_cycles WHERE id = ?")
        .get(args.cycleId) as any;

      if (!cycle) throw new Error(`Cycle not found: ${args.cycleId}`);
      if (cycle.status !== "active") {
        return {
          skipped: true,
          reason: `Cycle is already '${cycle.status}', cannot abandon`,
          cycleId: args.cycleId,
        };
      }

      const now = new Date().toISOString();
      db.prepare(
        "UPDATE verification_cycles SET status = 'abandoned', updated_at = ? WHERE id = ?"
      ).run(now, args.cycleId);

      return {
        abandoned: true,
        cycleId: args.cycleId,
        title: cycle.title,
        reason: args.reason ?? "No reason provided",
        abandonedAt: now,
      };
    },
  },
];
