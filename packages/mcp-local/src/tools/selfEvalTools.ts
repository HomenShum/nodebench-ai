/**
 * Self-Eval Tools — Trajectory Analysis & Self-Reinforced Learning.
 *
 * Enables the MCP to observe its own tool usage patterns, identify gaps,
 * measure efficiency, and recommend improvements. Every tool call can be
 * logged, then analyzed to produce actionable insights that feed back into
 * the development process via the AI Flywheel.
 *
 * Closed-loop: Use → Log → Analyze → Recommend → Apply → Use again
 */

import { getDb, genId } from "../db.js";
import type { McpTool } from "../types.js";

export const selfEvalTools: McpTool[] = [
  // ─── Tool 1: log_tool_call ─────────────────────────────────────────────
  {
    name: "log_tool_call",
    description:
      "Record a tool invocation with timing, status, and context. Agents should call this after each tool use so the self-eval system can analyze trajectories. Lightweight — just appends a row to the tool_call_log table.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: {
          type: "string",
          description:
            "Session identifier grouping related tool calls (e.g. a verification cycle ID, eval run ID, or a custom session key)",
        },
        toolName: {
          type: "string",
          description: "Name of the tool that was called",
        },
        durationMs: {
          type: "number",
          description: "How long the call took in milliseconds",
        },
        resultStatus: {
          type: "string",
          enum: ["success", "error", "partial"],
          description: "Outcome of the tool call (default: success)",
        },
        error: {
          type: "string",
          description: "Error message if resultStatus is error",
        },
        phase: {
          type: "string",
          description:
            "Which phase/stage this call belongs to (e.g. recon, verification, eval, flywheel)",
        },
      },
      required: ["sessionId", "toolName"],
    },
    handler: async (args) => {
      const db = getDb();
      const id = genId("tcl");
      const {
        sessionId,
        toolName,
        durationMs = 0,
        resultStatus = "success",
        error,
        phase,
      } = args;

      db.prepare(
        "INSERT INTO tool_call_log (id, session_id, tool_name, result_status, duration_ms, error, phase, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))"
      ).run(id, sessionId, toolName, resultStatus, durationMs, error ?? null, phase ?? null);

      return { id, sessionId, toolName, resultStatus, logged: true };
    },
  },

  // ─── Tool 2: get_trajectory_analysis ───────────────────────────────────
  {
    name: "get_trajectory_analysis",
    description:
      "Analyze tool usage trajectories across sessions. Returns tool frequency, error rates, average duration, phase distribution, and sequential patterns. Use this to understand how tools are actually being used and identify bottlenecks.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: {
          type: "string",
          description: "Analyze a specific session (optional — omit for global analysis)",
        },
        sinceDaysAgo: {
          type: "number",
          description: "Only analyze calls from the last N days (default: 30)",
        },
        limit: {
          type: "number",
          description: "Max records to analyze (default: 1000)",
        },
      },
    },
    handler: async (args) => {
      const db = getDb();
      const sinceDays = args.sinceDaysAgo ?? 30;
      const limit = args.limit ?? 1000;
      const sinceDate = new Date(Date.now() - sinceDays * 86400000).toISOString();

      let rows: any[];
      if (args.sessionId) {
        rows = db
          .prepare(
            "SELECT * FROM tool_call_log WHERE session_id = ? AND created_at >= ? ORDER BY created_at ASC LIMIT ?"
          )
          .all(args.sessionId, sinceDate, limit) as any[];
      } else {
        rows = db
          .prepare(
            "SELECT * FROM tool_call_log WHERE created_at >= ? ORDER BY created_at ASC LIMIT ?"
          )
          .all(sinceDate, limit) as any[];
      }

      if (rows.length === 0) {
        return {
          totalCalls: 0,
          message: "No tool call data found. Use log_tool_call after each tool invocation to build trajectory data.",
          recommendation: "Start logging tool calls to enable trajectory analysis.",
        };
      }

      // Tool frequency
      const toolFreq: Record<string, number> = {};
      const toolErrors: Record<string, number> = {};
      const toolDurations: Record<string, number[]> = {};
      const phaseFreq: Record<string, number> = {};
      const sessionSet = new Set<string>();

      for (const row of rows) {
        const name = row.tool_name;
        toolFreq[name] = (toolFreq[name] ?? 0) + 1;
        if (row.result_status === "error") {
          toolErrors[name] = (toolErrors[name] ?? 0) + 1;
        }
        if (!toolDurations[name]) toolDurations[name] = [];
        toolDurations[name].push(row.duration_ms);
        if (row.phase) {
          phaseFreq[row.phase] = (phaseFreq[row.phase] ?? 0) + 1;
        }
        sessionSet.add(row.session_id);
      }

      // Top tools by frequency
      const topTools = Object.entries(toolFreq)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 15)
        .map(([name, count]) => ({
          tool: name,
          calls: count,
          errors: toolErrors[name] ?? 0,
          errorRate: toolErrors[name]
            ? Math.round(((toolErrors[name] ?? 0) / count) * 100) / 100
            : 0,
          avgDurationMs: Math.round(
            (toolDurations[name]?.reduce((s, v) => s + v, 0) ?? 0) /
              (toolDurations[name]?.length ?? 1)
          ),
        }));

      // Sequential pattern detection (bigrams)
      const bigrams: Record<string, number> = {};
      for (let i = 0; i < rows.length - 1; i++) {
        if (rows[i].session_id === rows[i + 1].session_id) {
          const pair = `${rows[i].tool_name} → ${rows[i + 1].tool_name}`;
          bigrams[pair] = (bigrams[pair] ?? 0) + 1;
        }
      }
      const topPatterns = Object.entries(bigrams)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([pattern, count]) => ({ pattern, count }));

      // Error-prone tools
      const errorProne = Object.entries(toolErrors)
        .filter(([name]) => (toolErrors[name] ?? 0) / (toolFreq[name] ?? 1) > 0.1)
        .sort(([, a], [, b]) => b - a)
        .map(([name, errors]) => ({
          tool: name,
          errors,
          totalCalls: toolFreq[name] ?? 0,
          errorRate: Math.round((errors / (toolFreq[name] ?? 1)) * 100) / 100,
        }));

      return {
        totalCalls: rows.length,
        uniqueTools: Object.keys(toolFreq).length,
        uniqueSessions: sessionSet.size,
        timeRange: {
          from: rows[0]?.created_at,
          to: rows[rows.length - 1]?.created_at,
        },
        topTools,
        phaseDistribution: Object.entries(phaseFreq)
          .sort(([, a], [, b]) => b - a)
          .map(([phase, count]) => ({ phase, count })),
        topPatterns,
        errorProneTools: errorProne,
      };
    },
  },

  // ─── Tool 3: get_self_eval_report ──────────────────────────────────────
  {
    name: "get_self_eval_report",
    description:
      "Generate a comprehensive self-evaluation report by cross-referencing all persisted data: verification cycles, eval runs, quality gates, gaps, learnings, recon sessions, and tool call trajectories. Identifies strengths, weaknesses, and areas for improvement.",
    inputSchema: {
      type: "object",
      properties: {
        sinceDaysAgo: {
          type: "number",
          description: "Report window in days (default: 30)",
        },
        includeDetails: {
          type: "boolean",
          description: "Include detailed breakdowns (default: false)",
        },
        excludeTestSessions: {
          type: "boolean",
          description: "Exclude test/eval harness sessions from health score calculation (default: true). Test suites create hundreds of cycles that skew the health score.",
        },
      },
    },
    handler: async (args) => {
      const db = getDb();
      const sinceDays = args.sinceDaysAgo ?? 30;
      const includeDetails = args.includeDetails ?? false;
      const excludeTestSessions = args.excludeTestSessions ?? true;
      const sinceDate = new Date(Date.now() - sinceDays * 86400000).toISOString();

      // Test session patterns — filters eval harness, dataset bench, vitest artifacts, MCP dev cycles
      const TEST_PATTERNS = [
        "eval_", "eval-", "test_", "test-", "bench_", "bench-",
        "bfcl_", "bfcl-", "swe_", "swebench-",
        "integration-test", "search-test", "list test", "promote test",
        "investigation:", "vitest-marker", "gap-vitest-marker",
        "self-verification:", "mcp prompts",
        "open-dataset", "promoted-eval", "baseline-for-", "candidate-for-", "comparison-",
        "testcomponent",
      ];

      const isTestArtifact = (value: string): boolean => {
        const v = (value || "").toLowerCase();
        return TEST_PATTERNS.some((p) => v.startsWith(p));
      };

      // Verification cycles — filter test artifacts and collect test cycle IDs
      const rawCycles = db
        .prepare("SELECT * FROM verification_cycles WHERE created_at >= ? ORDER BY created_at DESC")
        .all(sinceDate) as any[];
      const testCycleIds = new Set<string>();
      let allCycles: any[];
      if (excludeTestSessions) {
        for (const c of rawCycles) {
          if (isTestArtifact(c.id) || isTestArtifact(c.title)) testCycleIds.add(c.id);
        }
        allCycles = rawCycles.filter((c) => !testCycleIds.has(c.id));
      } else {
        allCycles = rawCycles;
      }
      const completedCycles = allCycles.filter((c) => c.status === "completed");
      const activeCycles = allCycles.filter((c) => c.status === "active");
      const abandonedCycles = allCycles.filter((c) => c.status === "abandoned");

      // Gaps — filter by title pattern AND by membership in test cycles
      let allGaps = db
        .prepare("SELECT * FROM gaps WHERE created_at >= ? ORDER BY created_at DESC")
        .all(sinceDate) as any[];
      if (excludeTestSessions) {
        allGaps = allGaps.filter((g) => !isTestArtifact(g.title) && !testCycleIds.has(g.cycle_id));
      }
      const openGaps = allGaps.filter((g) => g.status === "open");
      const resolvedGaps = allGaps.filter((g) => g.status === "resolved");
      const gapsBySeverity: Record<string, number> = {};
      for (const gap of allGaps) {
        gapsBySeverity[gap.severity] = (gapsBySeverity[gap.severity] ?? 0) + 1;
      }

      // Eval runs — filter by name pattern
      let evalRuns = db
        .prepare("SELECT * FROM eval_runs WHERE created_at >= ? ORDER BY created_at DESC")
        .all(sinceDate) as any[];
      if (excludeTestSessions) {
        evalRuns = evalRuns.filter((r) => !isTestArtifact(r.name));
      }
      const completedEvals = evalRuns.filter((r) => r.status === "completed");
      let avgPassRate = 0;
      let avgScore = 0;
      let passRateCounted = 0;
      if (completedEvals.length > 0) {
        for (const run of completedEvals) {
          try {
            const summary = JSON.parse(run.summary ?? "{}");
            if (summary.autoCleaned) continue; // Skip auto-cleaned runs
            if (typeof summary.passRate === "number") {
              avgPassRate += summary.passRate;
              passRateCounted++;
            }
            avgScore += summary.avgScore ?? 0;
          } catch {
            /* ignore */
          }
        }
        if (passRateCounted > 0) avgPassRate = Math.round((avgPassRate / passRateCounted) * 100) / 100;
        avgScore = Math.round((avgScore / completedEvals.length) * 100) / 100;
      }

      // Quality gates — filter by target pattern
      let gateRuns = db
        .prepare("SELECT * FROM quality_gate_runs WHERE created_at >= ? ORDER BY created_at DESC")
        .all(sinceDate) as any[];
      if (excludeTestSessions) {
        gateRuns = gateRuns.filter((g) => !isTestArtifact(g.target));
      }
      const gatePassRate =
        gateRuns.length > 0
          ? Math.round(
              (gateRuns.filter((g) => g.passed).length / gateRuns.length) * 100
            ) / 100
          : 0;

      // Learnings
      const learningCount = (
        db.prepare("SELECT COUNT(*) as c FROM learnings WHERE created_at >= ?").get(sinceDate) as any
      )?.c ?? 0;
      const learningsByCategory = db
        .prepare(
          "SELECT category, COUNT(*) as count FROM learnings WHERE created_at >= ? GROUP BY category ORDER BY count DESC"
        )
        .all(sinceDate) as any[];

      // Recon sessions
      const reconSessions = db
        .prepare("SELECT COUNT(*) as c FROM recon_sessions WHERE created_at >= ?")
        .get(sinceDate) as any;
      const reconFindings = db
        .prepare("SELECT COUNT(*) as c FROM recon_findings WHERE created_at >= ?")
        .get(sinceDate) as any;

      // Tool call trajectories
      const trajectoryCount = (
        db.prepare("SELECT COUNT(*) as c FROM tool_call_log WHERE created_at >= ?").get(sinceDate) as any
      )?.c ?? 0;
      const trajectoryErrors = (
        db
          .prepare(
            "SELECT COUNT(*) as c FROM tool_call_log WHERE created_at >= ? AND result_status = 'error'"
          )
          .get(sinceDate) as any
      )?.c ?? 0;

      // Health scores
      const completionRate =
        allCycles.length > 0
          ? Math.round((completedCycles.length / allCycles.length) * 100) / 100
          : 0;
      const gapResolutionRate =
        allGaps.length > 0
          ? Math.round((resolvedGaps.length / allGaps.length) * 100) / 100
          : 0;
      const toolErrorRate =
        trajectoryCount > 0
          ? Math.round((trajectoryErrors / trajectoryCount) * 100) / 100
          : 0;

      // Overall health (weighted composite)
      const healthScore = Math.round(
        (completionRate * 0.25 +
          gapResolutionRate * 0.2 +
          avgPassRate * 0.25 +
          gatePassRate * 0.15 +
          (1 - toolErrorRate) * 0.15) *
          100
      ) / 100;

      const report: Record<string, unknown> = {
        reportPeriod: `Last ${sinceDays} days`,
        generatedAt: new Date().toISOString(),
        healthScore,
        healthGrade:
          healthScore >= 0.9
            ? "A"
            : healthScore >= 0.75
              ? "B"
              : healthScore >= 0.6
                ? "C"
                : healthScore >= 0.4
                  ? "D"
                  : "F",
        verification: {
          totalCycles: allCycles.length,
          completed: completedCycles.length,
          active: activeCycles.length,
          abandoned: abandonedCycles.length,
          completionRate,
        },
        gaps: {
          total: allGaps.length,
          open: openGaps.length,
          resolved: resolvedGaps.length,
          resolutionRate: gapResolutionRate,
          bySeverity: gapsBySeverity,
        },
        evalRuns: {
          total: evalRuns.length,
          completed: completedEvals.length,
          avgPassRate,
          avgScore,
        },
        qualityGates: {
          total: gateRuns.length,
          passRate: gatePassRate,
        },
        knowledge: {
          learnings: learningCount,
          byCategory: learningsByCategory,
          reconSessions: reconSessions?.c ?? 0,
          reconFindings: reconFindings?.c ?? 0,
        },
        toolTrajectory: {
          totalCalls: trajectoryCount,
          errors: trajectoryErrors,
          errorRate: toolErrorRate,
        },
      };

      if (includeDetails) {
        report.cycleDetails = allCycles.map((c) => ({
          id: c.id,
          title: c.title,
          status: c.status,
          phase: c.current_phase,
          created: c.created_at,
        }));
        report.openGapDetails = openGaps.map((g) => ({
          id: g.id,
          severity: g.severity,
          title: g.title,
          cycleId: g.cycle_id,
        }));
      }

      return report;
    },
  },

  // ─── Tool 4: get_improvement_recommendations ──────────────────────────
  {
    name: "get_improvement_recommendations",
    description:
      "Analyze all persisted data and return actionable improvement recommendations. Detects: unused tools, missing quality gates, unresolved gaps, knowledge gaps, underutilized phases, and tool error patterns. The self-reinforced learning engine.",
    inputSchema: {
      type: "object",
      properties: {
        sinceDaysAgo: {
          type: "number",
          description: "Analysis window in days (default: 30)",
        },
        focus: {
          type: "string",
          enum: ["tools", "process", "quality", "knowledge", "all"],
          description: "Focus area for recommendations (default: all)",
        },
      },
    },
    handler: async (args) => {
      const db = getDb();
      const sinceDays = args.sinceDaysAgo ?? 30;
      const focus = args.focus ?? "all";
      const sinceDate = new Date(Date.now() - sinceDays * 86400000).toISOString();

      const recommendations: Array<{
        category: string;
        priority: "high" | "medium" | "low";
        finding: string;
        recommendation: string;
        action: string;
      }> = [];

      // ── TOOL ANALYSIS ──
      if (focus === "all" || focus === "tools") {
        const toolCalls = db
          .prepare(
            "SELECT tool_name, COUNT(*) as calls, SUM(CASE WHEN result_status = 'error' THEN 1 ELSE 0 END) as errors, AVG(duration_ms) as avg_ms FROM tool_call_log WHERE created_at >= ? GROUP BY tool_name"
          )
          .all(sinceDate) as any[];

        const usedTools = new Set(toolCalls.map((t) => t.tool_name));

        // Known tool catalog for gap detection
        const KNOWN_TOOLS = [
          "start_verification_cycle", "log_phase_findings", "log_gap", "resolve_gap",
          "log_test_result", "get_verification_status", "list_verification_cycles",
          "abandon_cycle", "start_eval_run", "record_eval_result", "complete_eval_run",
          "compare_eval_runs", "list_eval_runs", "run_quality_gate", "get_gate_preset",
          "get_gate_history", "run_closed_loop", "record_learning", "search_learnings",
          "list_learnings", "delete_learning", "search_all_knowledge",
          "get_flywheel_status", "promote_to_eval", "trigger_investigation",
          "run_mandatory_flywheel", "run_recon", "log_recon_finding",
          "get_recon_summary", "check_framework_updates", "bootstrap_project",
          "get_project_context", "findTools", "getMethodology",
          "discover_infrastructure", "triple_verify", "self_implement",
          "generate_self_instructions", "connect_channels", "assess_risk",
          "decide_re_update", "run_self_maintenance", "scaffold_directory",
          "run_autonomous_loop", "log_tool_call", "get_trajectory_analysis",
          "get_self_eval_report", "get_improvement_recommendations",
          "cleanup_stale_runs", "synthesize_recon_to_learnings",
        ];

        // Find underused tools
        const unusedTools = KNOWN_TOOLS.filter((t) => !usedTools.has(t));
        if (unusedTools.length > 10) {
          recommendations.push({
            category: "tools",
            priority: "medium",
            finding: `${unusedTools.length} tools have never been used in the last ${sinceDays} days.`,
            recommendation:
              "Review unused tools to see if they could improve your workflow. Call findTools to discover relevant capabilities.",
            action: `findTools({ query: "${unusedTools.slice(0, 3).join(" ")}" })`,
          });
        }

        // Error-prone tools
        for (const tc of toolCalls) {
          if (tc.calls >= 3 && tc.errors / tc.calls > 0.2) {
            recommendations.push({
              category: "tools",
              priority: "high",
              finding: `Tool "${tc.tool_name}" has a ${Math.round((tc.errors / tc.calls) * 100)}% error rate (${tc.errors}/${tc.calls} calls).`,
              recommendation:
                "Investigate the root cause. Common issues: incorrect arguments, missing prerequisites, or schema mismatches.",
              action: `get_trajectory_analysis({ sessionId: "latest" }) — then search_all_knowledge({ query: "${tc.tool_name} error" })`,
            });
          }
        }

        // Slow tools
        for (const tc of toolCalls) {
          if (tc.avg_ms > 5000 && tc.calls >= 2) {
            recommendations.push({
              category: "tools",
              priority: "low",
              finding: `Tool "${tc.tool_name}" averages ${Math.round(tc.avg_ms)}ms per call (${tc.calls} calls).`,
              recommendation:
                "Consider batching calls or pre-fetching data to reduce latency.",
              action: `record_learning({ key: "slow-tool-${tc.tool_name}", content: "..." })`,
            });
          }
        }
      }

      // ── PROCESS ANALYSIS ──
      if (focus === "all" || focus === "process") {
        // Abandoned cycles
        const abandoned = (
          db
            .prepare(
              "SELECT COUNT(*) as c FROM verification_cycles WHERE status = 'abandoned' AND created_at >= ?"
            )
            .get(sinceDate) as any
        )?.c ?? 0;
        const total = (
          db
            .prepare(
              "SELECT COUNT(*) as c FROM verification_cycles WHERE created_at >= ?"
            )
            .get(sinceDate) as any
        )?.c ?? 0;

        if (total > 0 && abandoned / total > 0.3) {
          recommendations.push({
            category: "process",
            priority: "high",
            finding: `${Math.round((abandoned / total) * 100)}% of verification cycles were abandoned (${abandoned}/${total}).`,
            recommendation:
              "Abandoning too many cycles suggests scope creep or unclear goals. Break work into smaller, completable units.",
            action: "list_verification_cycles — review abandoned cycle titles for patterns.",
          });
        }

        // Cycles stuck in early phases
        const stuckCycles = db
          .prepare(
            "SELECT COUNT(*) as c FROM verification_cycles WHERE status = 'active' AND current_phase <= 2 AND created_at < datetime('now', '-3 days')"
          )
          .get() as any;
        if (stuckCycles?.c > 0) {
          recommendations.push({
            category: "process",
            priority: "medium",
            finding: `${stuckCycles.c} verification cycles have been stuck in early phases for 3+ days.`,
            recommendation:
              "Either complete or abandon stale cycles. Stale context leads to incorrect gap analysis.",
            action: "list_verification_cycles — identify and triage stale cycles.",
          });
        }

        // Missing flywheel runs
        const flywheelRuns = (
          db
            .prepare(
              "SELECT COUNT(*) as c FROM quality_gate_runs WHERE gate_name = 'mandatory_flywheel' AND created_at >= ?"
            )
            .get(sinceDate) as any
        )?.c ?? 0;
        const completedCycles = (
          db
            .prepare(
              "SELECT COUNT(*) as c FROM verification_cycles WHERE status = 'completed' AND created_at >= ?"
            )
            .get(sinceDate) as any
        )?.c ?? 0;

        if (completedCycles > 0 && flywheelRuns < completedCycles) {
          recommendations.push({
            category: "process",
            priority: "high",
            finding: `Only ${flywheelRuns} mandatory flywheel runs for ${completedCycles} completed cycles. Every non-trivial change needs a flywheel run.`,
            recommendation:
              "Run run_mandatory_flywheel after every verification cycle completion.",
            action: 'getMethodology({ topic: "mandatory_flywheel" })',
          });
        }
      }

      // ── QUALITY ANALYSIS ──
      if (focus === "all" || focus === "quality") {
        // Declining eval scores
        const recentEvals = db
          .prepare(
            "SELECT summary FROM eval_runs WHERE status = 'completed' AND created_at >= ? ORDER BY created_at DESC LIMIT 10"
          )
          .all(sinceDate) as any[];

        const passRates: number[] = [];
        for (const run of recentEvals) {
          try {
            const summary = JSON.parse(run.summary ?? "{}");
            if (typeof summary.passRate === "number") passRates.push(summary.passRate);
          } catch {
            /* ignore */
          }
        }

        if (passRates.length >= 3) {
          const recent = passRates.slice(0, 3).reduce((s, v) => s + v, 0) / 3;
          const older = passRates.slice(-3).reduce((s, v) => s + v, 0) / Math.min(3, passRates.slice(-3).length);
          if (recent < older - 0.1) {
            recommendations.push({
              category: "quality",
              priority: "high",
              finding: `Eval pass rates are declining: recent avg ${Math.round(recent * 100)}% vs earlier avg ${Math.round(older * 100)}%.`,
              recommendation:
                "Trigger an investigation to find the regression root cause.",
              action: "trigger_investigation — link to the most recent failing eval run.",
            });
          }
        }

        // Unresolved critical/high gaps
        const criticalGaps = (
          db
            .prepare(
              "SELECT COUNT(*) as c FROM gaps WHERE status = 'open' AND severity IN ('CRITICAL', 'HIGH')"
            )
            .get() as any
        )?.c ?? 0;
        if (criticalGaps > 0) {
          recommendations.push({
            category: "quality",
            priority: "high",
            finding: `${criticalGaps} CRITICAL/HIGH severity gaps remain unresolved.`,
            recommendation:
              "Resolve critical gaps before shipping. Each open critical gap is a potential production incident.",
            action: "get_verification_status — review and resolve_gap for each critical gap.",
          });
        }
      }

      // ── KNOWLEDGE ANALYSIS ──
      if (focus === "all" || focus === "knowledge") {
        const learningCount = (
          db.prepare("SELECT COUNT(*) as c FROM learnings WHERE created_at >= ?").get(sinceDate) as any
        )?.c ?? 0;
        const cycleCount = (
          db.prepare("SELECT COUNT(*) as c FROM verification_cycles WHERE created_at >= ?").get(sinceDate) as any
        )?.c ?? 0;

        if (cycleCount > 0 && learningCount / cycleCount < 1) {
          recommendations.push({
            category: "knowledge",
            priority: "medium",
            finding: `Only ${learningCount} learnings recorded for ${cycleCount} verification cycles (ratio: ${(learningCount / cycleCount).toFixed(1)}).`,
            recommendation:
              "Record at least 1 learning per verification cycle. Every cycle should produce at least one gotcha, pattern, or edge case.",
            action: "record_learning — capture insights from each completed cycle.",
          });
        }

        // Check for orphan recon sessions
        const orphanRecon = (
          db
            .prepare(
              "SELECT COUNT(*) as c FROM recon_sessions WHERE status = 'active' AND created_at < datetime('now', '-7 days')"
            )
            .get() as any
        )?.c ?? 0;
        if (orphanRecon > 0) {
          recommendations.push({
            category: "knowledge",
            priority: "low",
            finding: `${orphanRecon} recon sessions have been active for 7+ days without completion.`,
            recommendation:
              "Complete or close stale recon sessions. Incomplete research creates knowledge gaps.",
            action: "get_recon_summary({ sessionId: '...', completeSession: true })",
          });
        }
      }

      // Sort by priority
      const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
      recommendations.sort(
        (a, b) => (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2)
      );

      return {
        analysisWindow: `Last ${sinceDays} days`,
        focus,
        totalRecommendations: recommendations.length,
        highPriority: recommendations.filter((r) => r.priority === "high").length,
        mediumPriority: recommendations.filter((r) => r.priority === "medium").length,
        lowPriority: recommendations.filter((r) => r.priority === "low").length,
        recommendations,
        _selfReinforcement: {
          instruction:
            "Apply the top recommendations, then re-run this tool to verify improvement. This creates a self-reinforcing loop: Use → Analyze → Improve → Re-analyze.",
          nextSteps: [
            "1. Address high-priority recommendations first",
            "2. Record learnings for each fix applied",
            "3. Re-run get_improvement_recommendations to verify improvement",
            "4. Run get_self_eval_report for the full health dashboard",
          ],
        },
      };
    },
  },

  // ─── Tool 5: cleanup_stale_runs ─────────────────────────────────────
  {
    name: "cleanup_stale_runs",
    description:
      "Clean up orphaned eval runs stuck in 'running'/'pending' state and optionally close stale gaps. Eval runs left in running state forever skew health scores. This tool auto-completes them with a summary noting they were cleaned up.",
    inputSchema: {
      type: "object",
      properties: {
        staleDays: {
          type: "number",
          description: "Consider runs stale if older than N days (default: 7)",
        },
        closeStaleGaps: {
          type: "boolean",
          description: "Also close LOW/MEDIUM gaps older than staleDays that are still open (default: false)",
        },
        dryRun: {
          type: "boolean",
          description: "Preview what would be cleaned up without actually modifying data (default: true)",
        },
      },
    },
    handler: async (args) => {
      const db = getDb();
      const staleDays = args.staleDays ?? 7;
      const closeStaleGaps = args.closeStaleGaps ?? false;
      const dryRun = args.dryRun ?? true;
      const cutoff = new Date(Date.now() - staleDays * 86400000).toISOString();

      // Find stale eval runs
      const staleEvals = db
        .prepare(
          "SELECT id, name, status, created_at FROM eval_runs WHERE status IN ('pending', 'running') AND created_at < ?"
        )
        .all(cutoff) as any[];

      // Find stale verification cycles
      const staleCycles = db
        .prepare(
          "SELECT id, title, status, current_phase, created_at FROM verification_cycles WHERE status = 'active' AND created_at < ?"
        )
        .all(cutoff) as any[];

      // Find stale gaps (optional)
      let staleGaps: any[] = [];
      if (closeStaleGaps) {
        staleGaps = db
          .prepare(
            "SELECT id, title, severity, status, created_at FROM gaps WHERE status = 'open' AND severity IN ('LOW', 'MEDIUM') AND created_at < ?"
          )
          .all(cutoff) as any[];
      }

      if (!dryRun) {
        // Clean up stale eval runs
        for (const run of staleEvals) {
          db.prepare(
            "UPDATE eval_runs SET status = 'completed', summary = ?, completed_at = datetime('now') WHERE id = ?"
          ).run(
            JSON.stringify({ autoCleaned: true, note: `Auto-cleaned: stale ${run.status} run from ${run.created_at}` }),
            run.id
          );
        }

        // Abandon stale verification cycles
        for (const cycle of staleCycles) {
          db.prepare(
            "UPDATE verification_cycles SET status = 'abandoned', updated_at = datetime('now') WHERE id = ?"
          ).run(cycle.id);
        }

        // Close stale gaps
        for (const gap of staleGaps) {
          db.prepare(
            "UPDATE gaps SET status = 'resolved', resolved_at = datetime('now') WHERE id = ?"
          ).run(gap.id);
        }
      }

      return {
        dryRun,
        staleDays,
        staleEvalRuns: {
          count: staleEvals.length,
          action: dryRun ? "would complete" : "completed",
          runs: staleEvals.map((r) => ({ id: r.id, name: r.name, status: r.status, created: r.created_at })),
        },
        staleCycles: {
          count: staleCycles.length,
          action: dryRun ? "would abandon" : "abandoned",
          cycles: staleCycles.map((c) => ({ id: c.id, title: c.title, phase: c.current_phase, created: c.created_at })),
        },
        staleGaps: closeStaleGaps
          ? {
              count: staleGaps.length,
              action: dryRun ? "would resolve" : "resolved",
              gaps: staleGaps.map((g) => ({ id: g.id, title: g.title, severity: g.severity, created: g.created_at })),
            }
          : { skipped: true, reason: "Set closeStaleGaps=true to include" },
        nextStep: dryRun
          ? "Review the above, then re-run with dryRun=false to apply changes."
          : "Cleanup applied. Run get_self_eval_report to verify improved health score.",
      };
    },
  },

  // ─── Tool 6: synthesize_recon_to_learnings ──────────────────────────
  {
    name: "synthesize_recon_to_learnings",
    description:
      "Convert recon findings into persistent learnings. Recon findings are ephemeral research notes; learnings are the distilled, searchable knowledge base. This tool reviews recent recon findings and creates learnings from the most actionable ones.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: {
          type: "string",
          description: "Synthesize findings from a specific recon session (optional — omit for all recent sessions)",
        },
        sinceDaysAgo: {
          type: "number",
          description: "Only look at findings from the last N days (default: 30)",
        },
        categories: {
          type: "array",
          items: { type: "string" },
          description: "Only synthesize findings in these categories (optional — omit for all)",
        },
        dryRun: {
          type: "boolean",
          description: "Preview learnings that would be created without saving (default: true)",
        },
      },
    },
    handler: async (args) => {
      const db = getDb();
      const sinceDays = args.sinceDaysAgo ?? 30;
      const dryRun = args.dryRun ?? true;
      const sinceDate = new Date(Date.now() - sinceDays * 86400000).toISOString();

      // Fetch recon findings
      let findings: any[];
      if (args.sessionId) {
        findings = db
          .prepare(
            "SELECT rf.*, rs.target as session_target FROM recon_findings rf JOIN recon_sessions rs ON rf.session_id = rs.id WHERE rf.session_id = ? AND rf.created_at >= ? ORDER BY rf.created_at DESC"
          )
          .all(args.sessionId, sinceDate) as any[];
      } else {
        findings = db
          .prepare(
            "SELECT rf.*, rs.target as session_target FROM recon_findings rf JOIN recon_sessions rs ON rf.session_id = rs.id WHERE rf.created_at >= ? ORDER BY rf.created_at DESC"
          )
          .all(sinceDate) as any[];
      }

      // Filter by categories if specified
      if (args.categories && Array.isArray(args.categories)) {
        const cats = new Set((args.categories as string[]).map((c) => c.toLowerCase()));
        findings = findings.filter((f) => cats.has((f.category || "").toLowerCase()));
      }

      // Check which findings already have corresponding learnings (by key pattern)
      const existingKeys = new Set(
        (db.prepare("SELECT key FROM learnings").all() as any[]).map((r) => r.key)
      );

      // Generate learning candidates from findings
      const candidates: Array<{
        key: string;
        content: string;
        category: string;
        tags: string;
        finding: any;
        alreadyExists: boolean;
      }> = [];

      for (const f of findings) {
        const key = `recon-${f.category}-${(f.summary || "").slice(0, 40).replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}`;
        const alreadyExists = existingKeys.has(key);

        candidates.push({
          key,
          content: `[From recon: ${f.session_target || "unknown"}] ${f.summary}${f.action_items ? ` Action: ${f.action_items}` : ""}`,
          category: f.category || "recon",
          tags: `recon,${f.category || "general"},synthesized`,
          finding: {
            id: f.id,
            category: f.category,
            summary: (f.summary || "").slice(0, 100),
            sessionTarget: f.session_target,
          },
          alreadyExists,
        });
      }

      const newCandidates = candidates.filter((c) => !c.alreadyExists);
      let created = 0;

      if (!dryRun) {
        for (const c of newCandidates) {
          try {
            db.prepare(
              "INSERT INTO learnings (key, content, category, tags, created_at, updated_at) VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))"
            ).run(c.key, c.content, c.category, c.tags);
            created++;
          } catch {
            // Duplicate key — skip silently
          }
        }
      }

      return {
        dryRun,
        totalFindings: findings.length,
        alreadySynthesized: candidates.filter((c) => c.alreadyExists).length,
        newLearnings: newCandidates.length,
        created: dryRun ? 0 : created,
        preview: newCandidates.slice(0, 10).map((c) => ({
          key: c.key,
          content: c.content.slice(0, 200),
          category: c.category,
          fromFinding: c.finding,
        })),
        nextStep: dryRun
          ? "Review the preview, then re-run with dryRun=false to create learnings."
          : `${created} learnings created. Run search_all_knowledge to verify they're searchable.`,
      };
    },
  },

  // ─── Tool 7: check_contract_compliance ──────────────────────────────
  {
    name: "check_contract_compliance",
    description:
      "Analyze an agent session's tool call trajectory against the NodeBench Agent Contract. Scores compliance across 6 dimensions: front-door protocol (did agent search before coding?), self-setup (did agent resolve missing capabilities?), pre-implementation gates (recon + risk), parallel coordination (locks + roles), ship gates (tests + eval + quality gate + flywheel + learning), and tool efficiency (right tools, minimal waste). Returns a 0-100 score, letter grade, per-dimension breakdown, specific violations, and actionable recommendations.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: {
          type: "string",
          description: "Session ID to analyze. If omitted, analyzes the most recent session.",
        },
        sinceDaysAgo: {
          type: "number",
          description: "Only analyze sessions from the last N days (default: 7)",
        },
        verbose: {
          type: "boolean",
          description: "Include full tool call timeline in output (default: false)",
        },
      },
    },
    handler: async (args) => {
      const db = getDb();
      const sinceDays = args.sinceDaysAgo ?? 7;
      const verbose = args.verbose ?? false;
      const sinceDate = new Date(Date.now() - sinceDays * 86400000).toISOString();

      // Ensure tables exist
      try {
        db.exec("CREATE TABLE IF NOT EXISTS tool_call_log (id TEXT PRIMARY KEY, session_id TEXT, tool_name TEXT, result_status TEXT, duration_ms REAL, error TEXT, phase TEXT, created_at TEXT)");
      } catch { /* already exists */ }

      // Get tool calls for the session
      let rows: any[];
      if (args.sessionId) {
        rows = db
          .prepare("SELECT * FROM tool_call_log WHERE session_id = ? ORDER BY created_at ASC")
          .all(args.sessionId) as any[];
      } else {
        // Find most recent session
        const recent = db
          .prepare("SELECT DISTINCT session_id, MIN(created_at) as first_call FROM tool_call_log WHERE created_at >= ? GROUP BY session_id ORDER BY first_call DESC LIMIT 1")
          .get(sinceDate) as any;
        if (!recent) {
          return {
            score: 0,
            grade: "N/A",
            message: "No tool call data found. Use log_tool_call after each tool invocation to build trajectory data, or the agent-contract prompt to auto-instruct agents.",
            recommendation: "Add the agent-contract prompt to your agent setup. It instructs agents to follow the front-door protocol and log tool calls.",
          };
        }
        rows = db
          .prepare("SELECT * FROM tool_call_log WHERE session_id = ? ORDER BY created_at ASC")
          .all(recent.session_id) as any[];
      }

      if (rows.length === 0) {
        return {
          score: 0,
          grade: "N/A",
          message: "No tool calls found for this session.",
          recommendation: "Ensure log_tool_call is called after each tool invocation.",
        };
      }

      const sessionId = rows[0].session_id;
      const toolNames = rows.map((r: any) => r.tool_name);
      const toolSet = new Set(toolNames);
      const totalCalls = rows.length;
      const errors = rows.filter((r: any) => r.result_status === "error").length;

      // ── Dimension 1: Front-Door Protocol (25 pts) ──
      // Agent should call search_all_knowledge, getMethodology, discover_tools, or get_workflow_chain
      // BEFORE calling implementation/mutation tools
      const FRONT_DOOR_TOOLS = new Set(["search_all_knowledge", "getMethodology", "discover_tools", "get_workflow_chain", "search_learnings", "findTools"]);
      const IMPL_TOOLS = new Set(["run_closed_loop", "log_test_result", "log_gap", "resolve_gap", "start_verification_cycle", "log_phase_findings", "run_mandatory_flywheel", "run_quality_gate", "claim_agent_task"]);

      let frontDoorScore = 0;
      const frontDoorViolations: string[] = [];
      const firstFrontDoor = toolNames.findIndex((t: string) => FRONT_DOOR_TOOLS.has(t));
      const firstImpl = toolNames.findIndex((t: string) => IMPL_TOOLS.has(t));

      if (firstFrontDoor >= 0 && (firstImpl < 0 || firstFrontDoor < firstImpl)) {
        frontDoorScore += 10; // Used front door before implementation
      } else if (firstImpl >= 0 && firstFrontDoor < 0) {
        frontDoorViolations.push("Started implementation without ANY front-door tool call (search_all_knowledge, getMethodology, discover_tools, get_workflow_chain)");
      } else if (firstImpl >= 0 && firstFrontDoor > firstImpl) {
        frontDoorViolations.push(`Called implementation tool (${toolNames[firstImpl]}) at position ${firstImpl + 1} before front-door tool at position ${firstFrontDoor + 1}`);
      }

      // Check which front-door tools were used
      if (toolSet.has("search_all_knowledge") || toolSet.has("search_learnings")) frontDoorScore += 5;
      else frontDoorViolations.push("Never checked existing knowledge (search_all_knowledge)");
      if (toolSet.has("getMethodology")) frontDoorScore += 5;
      else frontDoorViolations.push("Never loaded methodology (getMethodology)");
      if (toolSet.has("discover_tools") || toolSet.has("findTools")) frontDoorScore += 3;
      if (toolSet.has("get_workflow_chain")) frontDoorScore += 2;

      frontDoorScore = Math.min(frontDoorScore, 25);

      // ── Dimension 2: Self-Setup (10 pts) ──
      // If agent encountered errors, did it try to resolve them?
      let selfSetupScore = 0;
      const selfSetupViolations: string[] = [];
      const SETUP_TOOLS = new Set(["scaffold_nodebench_project", "bootstrap_project", "get_boilerplate_status", "bootstrap_parallel_agents", "discover_infrastructure", "setup_local_env", "discover_vision_env"]);
      const usedSetup = [...toolSet].filter((t) => SETUP_TOOLS.has(t));

      if (errors > 0 && usedSetup.length > 0) {
        selfSetupScore = 10; // Recovered from errors with setup tools
      } else if (errors === 0) {
        selfSetupScore = 10; // No errors = no setup needed (full credit)
      } else if (errors > 0 && usedSetup.length === 0) {
        selfSetupScore = 2;
        selfSetupViolations.push(`${errors} tool call errors but never attempted self-setup (scaffold_nodebench_project, bootstrap_project, setup_local_env)`);
      }

      // ── Dimension 3: Pre-Implementation Gates (15 pts) ──
      // recon + risk assessment before implementation
      let preImplScore = 0;
      const preImplViolations: string[] = [];
      const RECON_TOOLS = new Set(["run_recon", "log_recon_finding", "get_recon_summary", "check_framework_updates"]);
      const RISK_TOOLS = new Set(["assess_risk"]);

      if ([...toolSet].some((t) => RECON_TOOLS.has(t))) {
        preImplScore += 8;
      } else {
        preImplViolations.push("No reconnaissance performed (run_recon, check_framework_updates)");
      }
      if ([...toolSet].some((t) => RISK_TOOLS.has(t))) {
        preImplScore += 7;
      } else {
        preImplViolations.push("No risk assessment performed (assess_risk)");
      }

      // ── Dimension 4: Parallel Coordination (10 pts) ──
      // If parallel tools were used, check for proper lock/release pattern
      let parallelScore = 0;
      const parallelViolations: string[] = [];
      const PARALLEL_TOOLS = new Set(["claim_agent_task", "release_agent_task", "assign_agent_role", "get_parallel_status", "log_context_budget"]);
      const usedParallel = [...toolSet].filter((t) => PARALLEL_TOOLS.has(t));

      if (usedParallel.length === 0) {
        parallelScore = 10; // No parallel work = full credit (not applicable)
      } else {
        // Check claim → release pattern
        const claimIdx = toolNames.indexOf("claim_agent_task");
        const releaseIdx = toolNames.lastIndexOf("release_agent_task");
        if (claimIdx >= 0 && releaseIdx > claimIdx) {
          parallelScore += 4; // Proper lock/release
        } else if (claimIdx >= 0 && releaseIdx < 0) {
          parallelViolations.push("Claimed task but never released it (missing release_agent_task)");
        }
        if (toolSet.has("assign_agent_role")) parallelScore += 2;
        if (toolSet.has("log_context_budget")) parallelScore += 2;
        if (toolSet.has("get_parallel_status")) parallelScore += 2;
      }

      // ── Dimension 5: Ship Gates (30 pts) ──
      // Tests + eval + quality gate + mandatory flywheel + learning
      let shipScore = 0;
      const shipViolations: string[] = [];

      if (toolSet.has("log_test_result") || toolSet.has("run_closed_loop")) {
        shipScore += 8;
      } else {
        shipViolations.push("No tests logged (log_test_result, run_closed_loop)");
      }
      if (toolSet.has("promote_to_eval") || toolSet.has("start_eval_run") || toolSet.has("record_eval_result")) {
        shipScore += 6;
      } else {
        shipViolations.push("No eval run recorded (promote_to_eval, start_eval_run)");
      }
      if (toolSet.has("run_quality_gate")) {
        shipScore += 6;
      } else {
        shipViolations.push("No quality gate run (run_quality_gate)");
      }
      if (toolSet.has("run_mandatory_flywheel")) {
        shipScore += 6;
      } else {
        shipViolations.push("Mandatory flywheel not completed (run_mandatory_flywheel)");
      }
      if (toolSet.has("record_learning")) {
        shipScore += 4;
      } else {
        shipViolations.push("No learnings recorded (record_learning)");
      }

      // ── Dimension 6: Tool Efficiency (10 pts) ──
      let efficiencyScore = 0;
      const efficiencyViolations: string[] = [];
      const errorRate = totalCalls > 0 ? errors / totalCalls : 0;

      if (errorRate <= 0.05) efficiencyScore += 4;
      else if (errorRate <= 0.15) efficiencyScore += 2;
      else efficiencyViolations.push(`High error rate: ${Math.round(errorRate * 100)}% of tool calls failed`);

      // Check for redundant consecutive calls
      let redundantCalls = 0;
      for (let i = 1; i < toolNames.length; i++) {
        if (toolNames[i] === toolNames[i - 1] && rows[i].result_status === rows[i - 1].result_status) {
          redundantCalls++;
        }
      }
      if (redundantCalls === 0) efficiencyScore += 3;
      else if (redundantCalls <= 2) efficiencyScore += 1;
      else efficiencyViolations.push(`${redundantCalls} redundant consecutive tool calls (same tool, same result)`);

      // Variety — used more than just 1-2 tools
      const uniqueTools = toolSet.size;
      if (uniqueTools >= 5) efficiencyScore += 3;
      else if (uniqueTools >= 3) efficiencyScore += 1;
      else efficiencyViolations.push(`Only ${uniqueTools} unique tools used — consider using more of the methodology`);

      // ── Aggregate ──
      const totalScore = frontDoorScore + selfSetupScore + preImplScore + parallelScore + shipScore + efficiencyScore;
      const maxScore = 100;
      const pct = Math.round((totalScore / maxScore) * 100);

      let grade: string;
      if (pct >= 90) grade = "A (Exemplary)";
      else if (pct >= 80) grade = "B (Good)";
      else if (pct >= 70) grade = "C (Acceptable)";
      else if (pct >= 55) grade = "D (Needs Improvement)";
      else grade = "F (Non-Compliant)";

      const allViolations = [
        ...frontDoorViolations.map((v) => ({ dimension: "front_door", violation: v })),
        ...selfSetupViolations.map((v) => ({ dimension: "self_setup", violation: v })),
        ...preImplViolations.map((v) => ({ dimension: "pre_implementation", violation: v })),
        ...parallelViolations.map((v) => ({ dimension: "parallel_coordination", violation: v })),
        ...shipViolations.map((v) => ({ dimension: "ship_gates", violation: v })),
        ...efficiencyViolations.map((v) => ({ dimension: "tool_efficiency", violation: v })),
      ];

      // Generate targeted recommendations
      const recommendations: string[] = [];
      if (frontDoorScore < 15) {
        recommendations.push("CRITICAL: Always call search_all_knowledge + getMethodology + discover_tools BEFORE implementation. This is the #1 contract rule.");
      }
      if (shipScore < 15) {
        recommendations.push("CRITICAL: Ship gates incomplete. Must have: tests (log_test_result) + eval (promote_to_eval) + quality gate (run_quality_gate) + flywheel (run_mandatory_flywheel) + learning (record_learning).");
      }
      if (preImplScore < 8) {
        recommendations.push("Run recon (run_recon) and risk assessment (assess_risk) before implementing changes.");
      }
      if (efficiencyScore < 5) {
        recommendations.push("Reduce tool call errors and redundant calls. Use discover_tools to find the right tool before trial-and-error.");
      }
      if (allViolations.length === 0) {
        recommendations.push("Excellent compliance! Consider running get_self_eval_report for a broader system health check.");
      }

      const result: any = {
        sessionId,
        totalCalls,
        uniqueTools,
        errors,
        score: pct,
        grade,
        dimensions: {
          front_door: { score: frontDoorScore, max: 25, description: "Search before code — front-door protocol" },
          self_setup: { score: selfSetupScore, max: 10, description: "Resolve missing capabilities autonomously" },
          pre_implementation: { score: preImplScore, max: 15, description: "Recon + risk assessment before changes" },
          parallel_coordination: { score: parallelScore, max: 10, description: "Task locks, roles, context budget" },
          ship_gates: { score: shipScore, max: 30, description: "Tests + eval + quality gate + flywheel + learning" },
          tool_efficiency: { score: efficiencyScore, max: 10, description: "Error rate, redundancy, tool variety" },
        },
        violations: allViolations,
        violationCount: allViolations.length,
        recommendations,
        _quickRef: {
          nextAction: pct >= 80
            ? "Good compliance. Run get_self_eval_report for broader system health, or record_learning to bank contract patterns."
            : "Address violations starting with CRITICAL recommendations. Re-run check_contract_compliance after fixes.",
          nextTools: pct >= 80
            ? ["get_self_eval_report", "record_learning"]
            : ["search_all_knowledge", "getMethodology", "run_mandatory_flywheel"],
        },
      };

      if (verbose) {
        result.timeline = rows.map((r: any, i: number) => ({
          position: i + 1,
          tool: r.tool_name,
          status: r.result_status,
          phase: r.phase,
          timestamp: r.created_at,
        }));
      }

      return result;
    },
  },
];
