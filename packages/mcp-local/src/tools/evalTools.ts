/**
 * Eval tools — Eval-Driven Development Loop.
 * Changes only ship if evals improve — never on gut feel alone.
 */

import { getDb, genId } from "../db.js";
import type { McpTool } from "../types.js";

export const evalTools: McpTool[] = [
  {
    name: "start_eval_run",
    description:
      "Start a new eval run. Define the test batch upfront with test cases (input, intent, expected behavior), then record results as each case is executed. Rule: no change ships without an eval improvement.",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description:
            "Name for this eval run (e.g. 'auth-flow-v2', 'prompt-rewrite-A')",
        },
        description: { type: "string" },
        cases: {
          type: "array",
          items: {
            type: "object",
            properties: {
              input: {
                type: "string",
                description: "The prompt / scenario",
              },
              intent: {
                type: "string",
                description: "What the agent should accomplish (ground truth)",
              },
              expected: {
                type: "string",
                description: "Expected behavior description",
              },
            },
            required: ["input", "intent"],
          },
        },
      },
      required: ["name", "cases"],
    },
    handler: async (args) => {
      const { name, description, cases } = args;
      if (!name || !cases || cases.length === 0)
        throw new Error("Name and at least one case are required");

      const db = getDb();
      const runId = genId("eval");
      const now = new Date().toISOString();

      db.prepare(
        "INSERT INTO eval_runs (id, name, description, status, created_at) VALUES (?, ?, ?, 'running', ?)"
      ).run(runId, name, description ?? null, now);

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
        runId,
        name,
        caseCount: cases.length,
        caseIds,
        status: "running",
      };
    },
  },
  {
    name: "record_eval_result",
    description:
      "Record the actual result for a specific eval case. Include what happened, the verdict (pass/fail/partial), and optionally telemetry data and judge notes.",
    inputSchema: {
      type: "object",
      properties: {
        caseId: { type: "string", description: "Eval case ID" },
        actual: {
          type: "string",
          description: "What actually happened",
        },
        verdict: {
          type: "string",
          enum: ["pass", "fail", "partial"],
          description: "Did the case pass?",
        },
        score: {
          type: "number",
          description: "0.0 to 1.0 score",
        },
        telemetry: {
          type: "object",
          description:
            "Tool calls, latency, errors — any execution trace data",
        },
        judgeNotes: {
          type: "object",
          description:
            "LLM judge analysis: goal alignment, tool efficiency, output quality, suggestions",
        },
      },
      required: ["caseId", "verdict"],
    },
    handler: async (args) => {
      const { caseId, actual, verdict, score, telemetry, judgeNotes } = args;
      const db = getDb();

      const evalCase = db
        .prepare("SELECT * FROM eval_cases WHERE id = ?")
        .get(caseId) as any;
      if (!evalCase) throw new Error(`Eval case not found: ${caseId}`);

      db.prepare(
        "UPDATE eval_cases SET actual = ?, verdict = ?, score = ?, telemetry = ?, judge_notes = ? WHERE id = ?"
      ).run(
        actual ?? null,
        verdict,
        score ?? (verdict === "pass" ? 1.0 : verdict === "partial" ? 0.5 : 0.0),
        telemetry ? JSON.stringify(telemetry) : null,
        judgeNotes ? JSON.stringify(judgeNotes) : null,
        caseId
      );

      // Progress
      const total = db
        .prepare(
          "SELECT COUNT(*) as count FROM eval_cases WHERE run_id = ?"
        )
        .get(evalCase.run_id) as any;
      const recorded = db
        .prepare(
          "SELECT COUNT(*) as count FROM eval_cases WHERE run_id = ? AND verdict IS NOT NULL"
        )
        .get(evalCase.run_id) as any;

      return {
        caseId,
        verdict,
        score:
          score ??
          (verdict === "pass" ? 1.0 : verdict === "partial" ? 0.5 : 0.0),
        runProgress: `${recorded.count}/${total.count} cases recorded`,
      };
    },
  },
  {
    name: "complete_eval_run",
    description:
      "Finalize an eval run and compute aggregate scores. Returns pass rate, average score, failure patterns, and improvement suggestions.",
    inputSchema: {
      type: "object",
      properties: {
        runId: { type: "string", description: "Eval run ID" },
      },
      required: ["runId"],
    },
    handler: async (args) => {
      const db = getDb();
      const now = new Date().toISOString();

      const run = db
        .prepare("SELECT * FROM eval_runs WHERE id = ?")
        .get(args.runId) as any;
      if (!run) throw new Error(`Eval run not found: ${args.runId}`);

      const cases = db
        .prepare("SELECT * FROM eval_cases WHERE run_id = ?")
        .all(args.runId) as any[];

      const totalCases = cases.length;
      const passed = cases.filter((c: any) => c.verdict === "pass").length;
      const failed = cases.filter((c: any) => c.verdict === "fail").length;
      const partial = cases.filter((c: any) => c.verdict === "partial").length;
      const passRate =
        totalCases > 0 ? Math.round((passed / totalCases) * 100) / 100 : 0;

      const scores = cases
        .filter((c: any) => c.score !== null)
        .map((c: any) => c.score);
      const avgScore =
        scores.length > 0
          ? Math.round(
              (scores.reduce((s: number, v: number) => s + v, 0) /
                scores.length) *
                100
            ) / 100
          : 0;

      // Extract failure patterns from judge notes
      const failurePatterns: string[] = [];
      const suggestions: string[] = [];
      for (const c of cases) {
        if (c.verdict === "fail" || c.verdict === "partial") {
          failurePatterns.push(`[${c.verdict}] ${c.intent}`);
        }
        if (c.judge_notes) {
          try {
            const notes = JSON.parse(c.judge_notes);
            if (notes.suggestions) {
              const s = Array.isArray(notes.suggestions)
                ? notes.suggestions
                : [notes.suggestions];
              suggestions.push(...s);
            }
          } catch {
            /* ignore parse errors */
          }
        }
      }

      const summary = {
        totalCases,
        passed,
        failed,
        partial,
        passRate,
        avgScore,
        failurePatterns: failurePatterns.slice(0, 10),
        topSuggestions: [...new Set(suggestions)].slice(0, 5),
      };

      db.prepare(
        "UPDATE eval_runs SET status = 'completed', summary = ?, completed_at = ? WHERE id = ?"
      ).run(JSON.stringify(summary), now, args.runId);

      return {
        runId: args.runId,
        status: "completed",
        summary,
        _contributeBack: {
          instruction:
            "Eval run complete. Record insights so the knowledge base grows:",
          actions: [
            "record_learning — for any failure patterns or scoring insights discovered",
            "search_all_knowledge — check accumulated knowledge before next iteration",
          ],
        },
      };
    },
  },
  {
    name: "compare_eval_runs",
    description:
      "Compare two eval runs to decide whether a change should ship. Returns side-by-side scores and a deploy/revert recommendation. Rule: no change ships without an eval improvement.",
    inputSchema: {
      type: "object",
      properties: {
        baselineRunId: {
          type: "string",
          description: "The previous/baseline eval run",
        },
        candidateRunId: {
          type: "string",
          description: "The new eval run after changes",
        },
      },
      required: ["baselineRunId", "candidateRunId"],
    },
    handler: async (args) => {
      const db = getDb();

      const baseline = db
        .prepare("SELECT * FROM eval_runs WHERE id = ?")
        .get(args.baselineRunId) as any;
      if (!baseline)
        throw new Error(`Baseline run not found: ${args.baselineRunId}`);
      if (baseline.status !== "completed")
        throw new Error(
          `Baseline run "${baseline.name}" is not completed (status: ${baseline.status}). Call complete_eval_run first.`
        );

      const candidate = db
        .prepare("SELECT * FROM eval_runs WHERE id = ?")
        .get(args.candidateRunId) as any;
      if (!candidate)
        throw new Error(`Candidate run not found: ${args.candidateRunId}`);
      if (candidate.status !== "completed")
        throw new Error(
          `Candidate run "${candidate.name}" is not completed (status: ${candidate.status}). Call complete_eval_run first.`
        );

      const parseSummary = (run: any) => {
        if (run.summary) {
          try {
            return JSON.parse(run.summary);
          } catch {
            /* fall through */
          }
        }
        return { passRate: 0, avgScore: 0 };
      };

      const baselineSummary = parseSummary(baseline);
      const candidateSummary = parseSummary(candidate);

      const deltaPassRate =
        Math.round(
          (candidateSummary.passRate - baselineSummary.passRate) * 100
        ) / 100;
      const deltaAvgScore =
        Math.round(
          (candidateSummary.avgScore - baselineSummary.avgScore) * 100
        ) / 100;

      let recommendation: string;
      let reason: string;

      if (deltaPassRate > 0 || deltaAvgScore > 0.05) {
        recommendation = "DEPLOY";
        reason = `Eval scores improved: pass rate ${deltaPassRate >= 0 ? "+" : ""}${deltaPassRate}, avg score ${deltaAvgScore >= 0 ? "+" : ""}${deltaAvgScore}`;
      } else if (deltaPassRate < 0 || deltaAvgScore < -0.05) {
        recommendation = "REVERT";
        reason = `Eval scores regressed: pass rate ${deltaPassRate}, avg score ${deltaAvgScore}. Revert changes and try a different approach.`;
      } else {
        recommendation = "INVESTIGATE";
        reason = `Eval scores are flat (pass rate delta: ${deltaPassRate}, avg score delta: ${deltaAvgScore}). Investigate whether the change is meaningful.`;
      }

      return {
        baseline: {
          runId: baseline.id,
          name: baseline.name,
          passRate: baselineSummary.passRate,
          avgScore: baselineSummary.avgScore,
        },
        candidate: {
          runId: candidate.id,
          name: candidate.name,
          passRate: candidateSummary.passRate,
          avgScore: candidateSummary.avgScore,
        },
        delta: { passRate: deltaPassRate, avgScore: deltaAvgScore },
        recommendation,
        reason,
      };
    },
  },
  {
    name: "list_eval_runs",
    description:
      "List recent eval runs with their aggregate scores. Use this to track quality over time and detect drift.",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Max runs to return (default 10)",
        },
        name: {
          type: "string",
          description: "Filter by name substring (optional)",
        },
      },
    },
    handler: async (args) => {
      const db = getDb();
      const limit = args.limit ?? 10;

      const rows = args.name
        ? (db
            .prepare(
              "SELECT * FROM eval_runs WHERE name LIKE ? ORDER BY created_at DESC LIMIT ?"
            )
            .all(`%${args.name}%`, limit) as any[])
        : (db
            .prepare(
              "SELECT * FROM eval_runs ORDER BY created_at DESC LIMIT ?"
            )
            .all(limit) as any[]);

      return {
        count: rows.length,
        runs: rows.map((r: any) => {
          let summary = { passRate: 0, avgScore: 0, totalCases: 0 };
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
            caseCount: summary.totalCases,
            createdAt: r.created_at,
          };
        }),
      };
    },
  },

  {
    name: "diff_outputs",
    description:
      "Compare two text or JSON outputs and produce a structured diff with similarity score. Use for model comparison, oracle validation, before/after analysis, or regression detection. Returns added/removed/changed elements with a human-readable summary.",
    inputSchema: {
      type: "object",
      properties: {
        baseline: { type: "string", description: "The baseline (expected/reference) content" },
        candidate: { type: "string", description: "The candidate (actual/new) content to compare" },
        format: {
          type: "string",
          enum: ["text", "json", "auto"],
          description: "Comparison format: 'text' for line-by-line, 'json' for field-level, 'auto' to detect (default: 'auto')",
        },
      },
      required: ["baseline", "candidate"],
    },
    handler: async (args: { baseline: string; candidate: string; format?: string }) => {
      const format = args.format ?? "auto";

      // Auto-detect JSON
      let useJson = format === "json";
      if (format === "auto") {
        try {
          JSON.parse(args.baseline);
          JSON.parse(args.candidate);
          useJson = true;
        } catch {
          useJson = false;
        }
      }

      if (useJson) {
        return diffJson(args.baseline, args.candidate);
      }
      return diffText(args.baseline, args.candidate);
    },
  },
];

// ─── Diff helpers ────────────────────────────────────────────────────────────

function diffText(baseline: string, candidate: string): Record<string, unknown> {
  const baseLines = baseline.split("\n");
  const candLines = candidate.split("\n");

  const added: string[] = [];
  const removed: string[] = [];
  const common: string[] = [];

  // Simple LCS-based diff
  const baseSet = new Set(baseLines);
  const candSet = new Set(candLines);

  for (const line of candLines) {
    if (!baseSet.has(line)) added.push(line);
    else common.push(line);
  }
  for (const line of baseLines) {
    if (!candSet.has(line)) removed.push(line);
  }

  const totalLines = Math.max(baseLines.length, candLines.length);
  const similarity = totalLines > 0
    ? Math.round((common.length / totalLines) * 100) / 100
    : baseline === candidate ? 1 : 0;

  const summary = added.length === 0 && removed.length === 0
    ? "Outputs are identical."
    : `${added.length} line(s) added, ${removed.length} line(s) removed. ${Math.round(similarity * 100)}% similar.`;

  return {
    format: "text",
    similarity,
    added,
    removed,
    commonLines: common.length,
    baselineLines: baseLines.length,
    candidateLines: candLines.length,
    summary,
  };
}

function diffJson(baseline: string, candidate: string): Record<string, unknown> {
  let baseObj: any;
  let candObj: any;

  try {
    baseObj = JSON.parse(baseline);
    candObj = JSON.parse(candidate);
  } catch (err: any) {
    return { error: true, message: `JSON parse error: ${err.message}` };
  }

  const changes: Array<{ field: string; from: unknown; to: unknown }> = [];
  const added: string[] = [];
  const removed: string[] = [];

  // Flatten objects for comparison
  const flatBase = flattenObject(baseObj);
  const flatCand = flattenObject(candObj);

  for (const key of Object.keys(flatCand)) {
    if (!(key in flatBase)) {
      added.push(key);
    } else if (JSON.stringify(flatBase[key]) !== JSON.stringify(flatCand[key])) {
      changes.push({ field: key, from: flatBase[key], to: flatCand[key] });
    }
  }

  for (const key of Object.keys(flatBase)) {
    if (!(key in flatCand)) {
      removed.push(key);
    }
  }

  const totalFields = Math.max(Object.keys(flatBase).length, Object.keys(flatCand).length);
  const unchangedCount = totalFields - added.length - removed.length - changes.length;
  const similarity = totalFields > 0
    ? Math.round((unchangedCount / totalFields) * 100) / 100
    : JSON.stringify(baseObj) === JSON.stringify(candObj) ? 1 : 0;

  const summary = changes.length === 0 && added.length === 0 && removed.length === 0
    ? "JSON objects are identical."
    : `${changes.length} field(s) changed, ${added.length} added, ${removed.length} removed. ${Math.round(similarity * 100)}% similar.`;

  return {
    format: "json",
    similarity,
    added,
    removed,
    changed: changes,
    totalFields,
    unchangedFields: unchangedCount,
    summary,
  };
}

function flattenObject(obj: any, prefix = ""): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, fullKey));
    } else {
      result[fullKey] = value;
    }
  }
  return result;
}
