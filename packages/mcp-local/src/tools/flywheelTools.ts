/**
 * Flywheel tools — compose the 6-Phase Verification (inner loop) with
 * Eval-Driven Development (outer loop) into the AI Flywheel.
 */

import { getDb, genId } from "../db.js";
import type { McpTool } from "../types.js";

export const flywheelTools: McpTool[] = [
  {
    name: "get_flywheel_status",
    description:
      "Get the current state of both loops (Verification inner loop and Eval outer loop) and how they connect. Shows active verification cycles, recent eval trends, and cross-loop connections.",
    inputSchema: {
      type: "object",
      properties: {
        includeHistory: {
          type: "boolean",
          description:
            "Include recent completed cycles and eval runs (default false)",
        },
      },
    },
    handler: async (args) => {
      const db = getDb();
      const includeHistory = args.includeHistory ?? false;

      // Inner loop: verification cycles
      const activeCycles = db
        .prepare(
          "SELECT id, title, current_phase, status, created_at FROM verification_cycles WHERE status = 'active' ORDER BY created_at DESC"
        )
        .all() as any[];

      const recentCompleted = includeHistory
        ? (db
            .prepare(
              "SELECT id, title, updated_at as completed_at FROM verification_cycles WHERE status = 'completed' ORDER BY updated_at DESC LIMIT 10"
            )
            .all() as any[])
        : [];

      // Gap counts for active cycles
      for (const cycle of activeCycles) {
        const gaps = db
          .prepare(
            "SELECT severity, COUNT(*) as count FROM gaps WHERE cycle_id = ? AND status = 'open' GROUP BY severity"
          )
          .all(cycle.id) as any[];
        cycle.gapCounts = {};
        for (const g of gaps) cycle.gapCounts[g.severity] = g.count;
      }

      // Outer loop: eval runs
      const recentRuns = db
        .prepare(
          "SELECT id, name, status, summary, created_at FROM eval_runs ORDER BY created_at DESC LIMIT 10"
        )
        .all() as any[];

      const parsedRuns = recentRuns.map((r: any) => {
        let summary = { passRate: 0, avgScore: 0 };
        try {
          if (r.summary) summary = JSON.parse(r.summary);
        } catch {
          /* ignore */
        }
        return {
          runId: r.id,
          name: r.name,
          status: r.status,
          passRate: summary.passRate,
          avgScore: summary.avgScore,
        };
      });

      // Trend detection
      const completedRuns = parsedRuns.filter(
        (r) => r.passRate !== undefined && r.passRate > 0
      );
      let trend: { direction: string; delta: number } = {
        direction: "insufficient_data",
        delta: 0,
      };
      if (completedRuns.length >= 2) {
        const latest = completedRuns[0].passRate;
        const previous = completedRuns[1].passRate;
        const delta = Math.round((latest - previous) * 100) / 100;
        trend = {
          direction: delta > 0 ? "improving" : delta < 0 ? "regressing" : "stable",
          delta,
        };
      }

      // Cross-loop connections
      const learningsFromVerification =
        (
          db
            .prepare(
              "SELECT COUNT(*) as count FROM learnings WHERE source_cycle IS NOT NULL"
            )
            .get() as any
        )?.count ?? 0;

      const totalLearnings =
        (db.prepare("SELECT COUNT(*) as count FROM learnings").get() as any)
          ?.count ?? 0;

      return {
        innerLoop: {
          activeCycles: activeCycles.map((c: any) => ({
            cycleId: c.id,
            title: c.title,
            currentPhase: c.current_phase,
            gapCounts: c.gapCounts,
          })),
          recentCompleted,
        },
        outerLoop: {
          recentRuns: parsedRuns,
          trend,
        },
        connections: {
          learningsFromVerification,
          totalLearnings,
        },
      };
    },
  },
  {
    name: "promote_to_eval",
    description:
      "Take findings from a completed verification cycle and promote them into eval test cases. This is how the inner loop feeds the outer loop: Phase 4 test results become eval cases, Phase 5 checklists become scoring rubrics, Phase 6 edge cases become adversarial eval cases.",
    inputSchema: {
      type: "object",
      properties: {
        cycleId: {
          type: "string",
          description: "Completed verification cycle to promote from",
        },
        evalRunName: {
          type: "string",
          description: "Name for the new eval run",
        },
        cases: {
          type: "array",
          description: "Eval cases derived from the verification cycle",
          items: {
            type: "object",
            properties: {
              input: { type: "string" },
              intent: { type: "string" },
              expected: { type: "string" },
            },
            required: ["input", "intent"],
          },
        },
      },
      required: ["cycleId", "evalRunName", "cases"],
    },
    handler: async (args) => {
      const { cycleId, evalRunName, cases } = args;
      if (!cases || cases.length === 0)
        throw new Error("At least one eval case is required");

      const db = getDb();

      // Verify cycle exists
      const cycle = db
        .prepare("SELECT * FROM verification_cycles WHERE id = ?")
        .get(cycleId) as any;
      if (!cycle) throw new Error(`Cycle not found: ${cycleId}`);

      const runId = genId("eval");
      const now = new Date().toISOString();

      db.prepare(
        "INSERT INTO eval_runs (id, name, description, status, created_at) VALUES (?, ?, ?, 'running', ?)"
      ).run(
        runId,
        evalRunName,
        `Promoted from verification cycle: ${cycle.title} (${cycleId})`,
        now
      );

      const insertCase = db.prepare(
        "INSERT INTO eval_cases (id, run_id, input, intent, expected) VALUES (?, ?, ?, ?, ?)"
      );

      const caseIds: string[] = [];
      for (const c of cases) {
        const caseId = genId("case");
        insertCase.run(caseId, runId, c.input, c.intent, c.expected ?? null);
        caseIds.push(caseId);
      }

      return {
        evalRunId: runId,
        caseCount: cases.length,
        caseIds,
        sourceCycleId: cycleId,
        message:
          "Verification findings promoted to eval suite. Record results with record_eval_result, then finalize with complete_eval_run.",
      };
    },
  },
  {
    name: "trigger_investigation",
    description:
      "When an eval run shows regression, trigger a new verification cycle to investigate. This is how the outer loop feeds the inner loop: regressions trigger 6-phase investigations.",
    inputSchema: {
      type: "object",
      properties: {
        evalRunId: {
          type: "string",
          description: "The eval run that showed regression",
        },
        regressionDescription: {
          type: "string",
          description: "What regressed and hypothesis about why",
        },
      },
      required: ["evalRunId", "regressionDescription"],
    },
    handler: async (args) => {
      const { evalRunId, regressionDescription } = args;
      const db = getDb();

      // Verify eval run exists
      const evalRun = db
        .prepare("SELECT * FROM eval_runs WHERE id = ?")
        .get(evalRunId) as any;
      if (!evalRun) throw new Error(`Eval run not found: ${evalRunId}`);

      const cycleId = genId("cycle");
      const now = new Date().toISOString();
      const title = `Investigation: ${regressionDescription}`;
      const description = `Triggered by eval regression in run "${evalRun.name}" (${evalRunId}). ${regressionDescription}`;

      db.prepare(
        "INSERT INTO verification_cycles (id, title, description, status, current_phase, created_at, updated_at) VALUES (?, ?, ?, 'active', 1, ?, ?)"
      ).run(cycleId, title, description, now, now);

      // Create all 6 phases
      const phaseNames = [
        "context_gathering",
        "gap_analysis",
        "implementation",
        "testing",
        "self_verify",
        "document",
      ];

      const insertPhase = db.prepare(
        "INSERT INTO verification_phases (id, cycle_id, phase_number, phase_name, status, started_at) VALUES (?, ?, ?, ?, ?, ?)"
      );

      for (let i = 0; i < phaseNames.length; i++) {
        insertPhase.run(
          genId("phase"),
          cycleId,
          i + 1,
          phaseNames[i],
          i === 0 ? "in_progress" : "pending",
          i === 0 ? now : null
        );
      }

      return {
        cycleId,
        title,
        linkedEvalRun: evalRunId,
        phase1Instructions: `Phase 1: Context Gathering — Investigate the regression.
The eval run "${evalRun.name}" showed regression. Research:
- What changed since the baseline eval?
- Which test cases failed that previously passed?
- Is this a code change, upstream API change, or data drift?

Start by calling search_learnings to check for known related issues.`,
      };
    },
  },
  {
    name: "run_mandatory_flywheel",
    description:
      "Enforce the mandatory 6-step AI Flywheel verification after any non-trivial change. All 6 steps must pass before work is considered done. Skipping is only allowed for trivial changes (typo, comment, config) with explicit justification. Real-world example: a variety-check dead-code bug was only caught by running this process after smoke tests passed.",
    inputSchema: {
      type: "object",
      properties: {
        target: {
          type: "string",
          description:
            "What changed (e.g., 'auth migration', 'variety check pipeline')",
        },
        cycleId: {
          type: "string",
          description: "Optional: link to a verification cycle",
        },
        steps: {
          type: "array",
          description:
            "The 6 mandatory steps. All must be present: static_analysis, happy_path_test, failure_path_test, gap_analysis, fix_and_reverify, deploy_and_document",
          items: {
            type: "object",
            properties: {
              stepName: {
                type: "string",
                enum: [
                  "static_analysis",
                  "happy_path_test",
                  "failure_path_test",
                  "gap_analysis",
                  "fix_and_reverify",
                  "deploy_and_document",
                ],
              },
              passed: { type: "boolean" },
              output: {
                type: "string",
                description: "Step output or notes",
              },
            },
            required: ["stepName", "passed"],
          },
        },
        skipJustification: {
          type: "string",
          description:
            "Only if skipping all 6 steps: explain why this change is trivial (typo fix, comment update, config tweak)",
        },
      },
      required: ["target"],
    },
    handler: async (args) => {
      const { target, cycleId, steps, skipJustification } = args;
      const db = getDb();
      const now = new Date().toISOString();

      // Skip path
      if (skipJustification && (!steps || steps.length === 0)) {
        const gateRunId = genId("gate");
        db.prepare(
          "INSERT INTO quality_gate_runs (id, gate_name, target, passed, score, total_rules, failures, rule_results, created_at) VALUES (?, 'mandatory_flywheel', ?, 1, 1.0, 0, '[]', ?, ?)"
        ).run(
          gateRunId,
          target,
          JSON.stringify({
            skipped: true,
            justification: skipJustification,
          }),
          now
        );
        return {
          gateRunId,
          passed: true,
          skipped: true,
          justification: skipJustification,
          guidance:
            "Flywheel skipped for trivial change. If the change has any behavioral impact, re-run with all 6 steps.",
        };
      }

      // Validate steps
      if (!steps || steps.length === 0) {
        throw new Error(
          "Either provide all 6 mandatory steps or a skipJustification for trivial changes. The 6 required steps are: static_analysis, happy_path_test, failure_path_test, gap_analysis, fix_and_reverify, deploy_and_document."
        );
      }

      const REQUIRED_STEPS = [
        "static_analysis",
        "happy_path_test",
        "failure_path_test",
        "gap_analysis",
        "fix_and_reverify",
        "deploy_and_document",
      ];

      const providedNames = steps.map((s: any) => s.stepName);
      const missing = REQUIRED_STEPS.filter(
        (r) => !providedNames.includes(r)
      );
      if (missing.length > 0) {
        throw new Error(
          `Missing required steps: ${missing.join(", ")}. All 6 steps must be reported.`
        );
      }

      // Validate cycle exists if provided
      if (cycleId) {
        const cycle = db
          .prepare("SELECT id FROM verification_cycles WHERE id = ?")
          .get(cycleId);
        if (!cycle)
          throw new Error(`Verification cycle not found: ${cycleId}`);
      }

      // Build results
      const ruleResults: Record<string, boolean> = {};
      const failures: string[] = [];
      let firstFailure: string | null = null;

      for (const step of steps) {
        ruleResults[step.stepName] = step.passed;
        if (!step.passed) {
          failures.push(step.stepName);
          if (!firstFailure) firstFailure = step.stepName;
        }
      }

      const allPassed = failures.length === 0;
      const score =
        Math.round(
          ((REQUIRED_STEPS.length - failures.length) /
            REQUIRED_STEPS.length) *
            100
        ) / 100;

      const gateRunId = genId("gate");
      db.prepare(
        "INSERT INTO quality_gate_runs (id, gate_name, target, passed, score, total_rules, failures, rule_results, created_at) VALUES (?, 'mandatory_flywheel', ?, ?, ?, 6, ?, ?, ?)"
      ).run(
        gateRunId,
        target,
        allPassed ? 1 : 0,
        score,
        JSON.stringify(failures),
        JSON.stringify(ruleResults),
        now
      );

      let guidance: string;
      if (allPassed) {
        guidance =
          "Flywheel verification complete. All 6 mandatory steps passed. Work is ready to ship.";
      } else {
        guidance = `Failed at ${firstFailure}. Fix the issue and re-run ALL 6 steps from scratch (not just the failed step). Remember: the variety-check dead-code bug was only caught because the full flywheel was re-run after initial smoke tests passed.`;
      }

      return {
        gateRunId,
        target,
        passed: allPassed,
        score,
        totalSteps: 6,
        passedCount: REQUIRED_STEPS.length - failures.length,
        failures,
        firstFailure,
        ruleResults,
        linkedCycleId: cycleId ?? null,
        guidance,
        ...(allPassed
          ? {
              _contributeBack: {
                instruction:
                  "All 6 steps passed. Record what you learned so the knowledge base grows automatically:",
                actions: [
                  "record_learning — for edge cases, gotchas, or patterns found during verification",
                  "log_recon_finding — for any SDK/API/framework discoveries",
                  "search_all_knowledge — check existing knowledge before your next task",
                ],
              },
            }
          : {}),
      };
    },
  },
];
