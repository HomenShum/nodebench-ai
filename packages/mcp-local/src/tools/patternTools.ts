/**
 * Pattern Tools — Session Pattern Mining & Risk Prediction.
 *
 * Analyzes historical tool call trajectories and learnings to extract
 * recurring success/failure sequences, then predicts risks for new tasks
 * based on historically similar sessions.
 *
 * 2 tools:
 * - mine_session_patterns: Extract recurring tool call sequences (bigrams/trigrams) with success/failure rates
 * - predict_risks_from_patterns: Predict failure modes for a task based on historical session data
 */

import { getDb } from "../db.js";
import type { McpTool } from "../types.js";

export const patternTools: McpTool[] = [
  // ─── Tool 1: mine_session_patterns ────────────────────────────────────
  {
    name: "mine_session_patterns",
    description:
      "Analyze tool_call_log and learnings tables to extract recurring success/failure sequences across sessions. Finds common 2-3 tool sequences (bigrams/trigrams), cross-references with result_status to surface failure-prone patterns, and returns top patterns ranked by occurrence count and success rate. Use this to discover which tool workflows reliably succeed and which tend to fail.",
    inputSchema: {
      type: "object",
      properties: {
        minOccurrences: {
          type: "number",
          description:
            "Minimum number of times a pattern must appear to be included (default: 2)",
        },
        maxPatterns: {
          type: "number",
          description:
            "Maximum number of patterns to return (default: 20)",
        },
        sessionFilter: {
          type: "string",
          description:
            "Only analyze sessions whose session_id contains this substring (optional — omit for all sessions)",
        },
      },
      required: [],
    },
    handler: async (args) => {
      const db = getDb();
      const minOccurrences = args.minOccurrences ?? 2;
      const maxPatterns = args.maxPatterns ?? 20;
      const sessionFilter: string | undefined = args.sessionFilter;

      // Fetch tool call rows ordered by session and time
      let rows: any[];
      if (sessionFilter) {
        rows = db
          .prepare(
            "SELECT session_id, tool_name, result_status FROM tool_call_log WHERE session_id LIKE ? ORDER BY session_id ASC, created_at ASC"
          )
          .all(`%${sessionFilter}%`) as any[];
      } else {
        rows = db
          .prepare(
            "SELECT session_id, tool_name, result_status FROM tool_call_log ORDER BY session_id ASC, created_at ASC"
          )
          .all() as any[];
      }

      if (rows.length === 0) {
        return {
          patterns: [],
          totalSessions: 0,
          totalCalls: 0,
          message:
            "No tool call data found. Use log_tool_call after each tool invocation to build trajectory data.",
        };
      }

      // Group rows by session
      const sessions: Map<string, any[]> = new Map();
      for (const row of rows) {
        if (!sessions.has(row.session_id)) {
          sessions.set(row.session_id, []);
        }
        sessions.get(row.session_id)!.push(row);
      }

      // ── Bigram extraction ──
      const bigramStats: Map<
        string,
        { occurrences: number; successes: number; failures: number; sessionIds: Set<string> }
      > = new Map();

      // ── Trigram extraction ──
      const trigramStats: Map<
        string,
        { occurrences: number; successes: number; failures: number; sessionIds: Set<string> }
      > = new Map();

      for (const [sessionId, calls] of sessions) {
        // Bigrams
        for (let i = 0; i < calls.length - 1; i++) {
          const key = JSON.stringify([calls[i].tool_name, calls[i + 1].tool_name]);
          if (!bigramStats.has(key)) {
            bigramStats.set(key, { occurrences: 0, successes: 0, failures: 0, sessionIds: new Set() });
          }
          const stat = bigramStats.get(key)!;
          stat.occurrences++;
          stat.sessionIds.add(sessionId);
          // A bigram is a "success" if both calls succeeded
          const bothSucceeded =
            calls[i].result_status === "success" && calls[i + 1].result_status === "success";
          if (bothSucceeded) {
            stat.successes++;
          } else {
            stat.failures++;
          }
        }

        // Trigrams
        for (let i = 0; i < calls.length - 2; i++) {
          const key = JSON.stringify([
            calls[i].tool_name,
            calls[i + 1].tool_name,
            calls[i + 2].tool_name,
          ]);
          if (!trigramStats.has(key)) {
            trigramStats.set(key, { occurrences: 0, successes: 0, failures: 0, sessionIds: new Set() });
          }
          const stat = trigramStats.get(key)!;
          stat.occurrences++;
          stat.sessionIds.add(sessionId);
          const allSucceeded =
            calls[i].result_status === "success" &&
            calls[i + 1].result_status === "success" &&
            calls[i + 2].result_status === "success";
          if (allSucceeded) {
            stat.successes++;
          } else {
            stat.failures++;
          }
        }
      }

      // ── Identify failure-prone sequences ──
      // A sequence where the last tool frequently errors
      const failureSequences: Map<
        string,
        { sequence: string[]; errorCount: number; totalCount: number }
      > = new Map();

      for (const [sessionId, calls] of sessions) {
        for (let i = 0; i < calls.length - 1; i++) {
          if (calls[i + 1].result_status === "error") {
            const key = JSON.stringify([calls[i].tool_name, calls[i + 1].tool_name]);
            if (!failureSequences.has(key)) {
              failureSequences.set(key, {
                sequence: [calls[i].tool_name, calls[i + 1].tool_name],
                errorCount: 0,
                totalCount: 0,
              });
            }
            failureSequences.get(key)!.errorCount++;
          }
          // Track total for the same pair to compute rate
          const key = JSON.stringify([calls[i].tool_name, calls[i + 1].tool_name]);
          if (failureSequences.has(key)) {
            failureSequences.get(key)!.totalCount++;
          }
        }
      }

      // ── Classify patterns by context ──
      const classifyPattern = (sequence: string[]): string => {
        const joined = sequence.join(" ");
        if (joined.includes("recon") || joined.includes("search_all_knowledge"))
          return "Research pattern";
        if (joined.includes("log_test_result") || joined.includes("run_closed_loop"))
          return "Testing pattern";
        if (joined.includes("assess_risk") || joined.includes("run_quality_gate"))
          return "Quality assurance pattern";
        if (joined.includes("start_verification") || joined.includes("log_phase"))
          return "Verification pattern";
        if (joined.includes("record_learning") || joined.includes("search_learnings"))
          return "Knowledge pattern";
        if (joined.includes("run_mandatory_flywheel") || joined.includes("promote_to_eval"))
          return "Flywheel pattern";
        if (joined.includes("claim_agent") || joined.includes("release_agent"))
          return "Parallel coordination pattern";
        return "General workflow";
      };

      // ── Build output arrays ──
      const bigramPatterns = [...bigramStats.entries()]
        .filter(([, stat]) => stat.occurrences >= minOccurrences)
        .sort(([, a], [, b]) => b.occurrences - a.occurrences)
        .slice(0, maxPatterns)
        .map(([key, stat]) => {
          const sequence = JSON.parse(key) as string[];
          return {
            type: "bigram" as const,
            sequence,
            occurrences: stat.occurrences,
            successRate: Math.round((stat.successes / stat.occurrences) * 100) / 100,
            failureRate: Math.round((stat.failures / stat.occurrences) * 100) / 100,
            uniqueSessions: stat.sessionIds.size,
            context: classifyPattern(sequence),
          };
        });

      const trigramPatterns = [...trigramStats.entries()]
        .filter(([, stat]) => stat.occurrences >= minOccurrences)
        .sort(([, a], [, b]) => b.occurrences - a.occurrences)
        .slice(0, Math.max(5, Math.floor(maxPatterns / 2)))
        .map(([key, stat]) => {
          const sequence = JSON.parse(key) as string[];
          return {
            type: "trigram" as const,
            sequence,
            occurrences: stat.occurrences,
            successRate: Math.round((stat.successes / stat.occurrences) * 100) / 100,
            failureRate: Math.round((stat.failures / stat.occurrences) * 100) / 100,
            uniqueSessions: stat.sessionIds.size,
            context: classifyPattern(sequence),
          };
        });

      const topFailures = [...failureSequences.values()]
        .filter((f) => f.errorCount >= minOccurrences)
        .sort((a, b) => b.errorCount - a.errorCount)
        .slice(0, 10)
        .map((f) => ({
          sequence: f.sequence,
          errorCount: f.errorCount,
          totalCount: f.totalCount,
          errorRate:
            f.totalCount > 0
              ? Math.round((f.errorCount / f.totalCount) * 100) / 100
              : 0,
        }));

      return {
        totalSessions: sessions.size,
        totalCalls: rows.length,
        bigramPatterns,
        trigramPatterns,
        failureProneSequences: topFailures,
        summary: {
          totalBigramsFound: bigramPatterns.length,
          totalTrigramsFound: trigramPatterns.length,
          totalFailurePatterns: topFailures.length,
          avgBigramSuccessRate:
            bigramPatterns.length > 0
              ? Math.round(
                  (bigramPatterns.reduce((s, p) => s + p.successRate, 0) /
                    bigramPatterns.length) *
                    100
                ) / 100
              : 0,
        },
        tip: "Use predict_risks_from_patterns with a task description to predict which failure patterns are most likely for your next task.",
      };
    },
  },

  // ─── Tool 2: predict_risks_from_patterns ──────────────────────────────
  {
    name: "predict_risks_from_patterns",
    description:
      "Given a task description, predict likely failure modes based on historically similar sessions. Searches the learnings table (FTS) for entries matching the task, finds sessions where similar tools were used and checks their error patterns, and cross-references with gaps of CRITICAL or HIGH severity. Returns risk predictions ranked by confidence with supporting evidence.",
    inputSchema: {
      type: "object",
      properties: {
        taskDescription: {
          type: "string",
          description:
            "Description of the task you are about to undertake (e.g. 'Add JWT authentication to the API')",
        },
        maxPredictions: {
          type: "number",
          description:
            "Maximum number of risk predictions to return (default: 5)",
        },
      },
      required: ["taskDescription"],
    },
    handler: async (args) => {
      const db = getDb();
      const taskDescription: string = args.taskDescription;
      const maxPredictions = args.maxPredictions ?? 5;

      const predictions: Array<{
        risk: string;
        confidence: number;
        evidence: string;
        category: string;
        relatedLearnings: Array<{ key: string; preview: string }>;
        relatedGaps: Array<{ title: string; severity: string }>;
      }> = [];

      // ── 1. Search learnings via FTS for task-relevant knowledge ──
      let matchedLearnings: any[] = [];
      try {
        // Build FTS query: tokenize the description into keywords
        const keywords = taskDescription
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, "")
          .split(/\s+/)
          .filter((w) => w.length > 2)
          .slice(0, 10);

        if (keywords.length > 0) {
          const ftsQuery = keywords.map((k) => `"${k}"`).join(" OR ");
          try {
            matchedLearnings = db
              .prepare(
                `SELECT l.key, l.content, l.category, l.tags
                 FROM learnings_fts fts
                 JOIN learnings l ON l.id = fts.rowid
                 WHERE learnings_fts MATCH ?
                 ORDER BY rank
                 LIMIT 20`
              )
              .all(ftsQuery) as any[];
          } catch {
            // FTS query may fail with certain inputs; fall back to LIKE
            matchedLearnings = db
              .prepare(
                `SELECT key, content, category, tags FROM learnings
                 WHERE ${keywords.map(() => "content LIKE ?").join(" OR ")}
                 LIMIT 20`
              )
              .all(...keywords.map((k) => `%${k}%`)) as any[];
          }
        }
      } catch {
        /* learnings_fts table may not exist yet */
      }

      // Extract risk signals from learnings
      const riskKeywords = ["error", "fail", "timeout", "crash", "bug", "broke", "regression", "flaky", "race condition", "deadlock", "memory leak", "permission"];
      for (const learning of matchedLearnings) {
        const content = (learning.content ?? "").toLowerCase();
        for (const riskWord of riskKeywords) {
          if (content.includes(riskWord)) {
            const existingPrediction = predictions.find(
              (p) => p.risk.toLowerCase().includes(riskWord)
            );
            if (existingPrediction) {
              existingPrediction.confidence = Math.min(
                existingPrediction.confidence + 0.1,
                0.95
              );
              existingPrediction.relatedLearnings.push({
                key: learning.key,
                preview: (learning.content ?? "").slice(0, 100),
              });
            } else {
              // Extract a sentence around the risk keyword for the risk description
              const idx = content.indexOf(riskWord);
              const start = Math.max(0, content.lastIndexOf(".", idx - 1) + 1);
              const end = content.indexOf(".", idx + riskWord.length);
              const riskSentence = (learning.content ?? "").slice(
                start,
                end > 0 ? end + 1 : start + 120
              ).trim();

              predictions.push({
                risk: riskSentence || `Potential ${riskWord} issue`,
                confidence: 0.4,
                evidence: `Found in learning: ${learning.key}`,
                category: learning.category ?? "unknown",
                relatedLearnings: [
                  {
                    key: learning.key,
                    preview: (learning.content ?? "").slice(0, 100),
                  },
                ],
                relatedGaps: [],
              });
            }
          }
        }
      }

      // ── 2. Find sessions with similar tool patterns and check errors ──
      try {
        // Infer likely tools from task description keywords
        const TOOL_KEYWORDS: Record<string, string[]> = {
          web: ["web_search", "web_scrape", "check_framework_updates"],
          test: ["log_test_result", "run_closed_loop"],
          auth: ["assess_risk", "scan_terminal_security"],
          api: ["run_recon", "check_framework_updates"],
          ui: ["capture_screenshot", "detect_ui_flicker"],
          deploy: ["run_quality_gate", "run_mandatory_flywheel"],
          database: ["run_recon", "assess_risk"],
          security: ["assess_risk", "scan_terminal_security"],
          migration: ["assess_risk", "run_recon", "log_gap"],
          refactor: ["run_recon", "log_test_result", "run_closed_loop"],
        };

        const descLower = taskDescription.toLowerCase();
        const likelyTools: Set<string> = new Set();
        for (const [keyword, tools] of Object.entries(TOOL_KEYWORDS)) {
          if (descLower.includes(keyword)) {
            for (const tool of tools) {
              likelyTools.add(tool);
            }
          }
        }

        if (likelyTools.size > 0) {
          // Find sessions that used these tools and had errors
          const placeholders = [...likelyTools].map(() => "?").join(", ");
          const errorSessions = db
            .prepare(
              `SELECT session_id, tool_name, result_status, error
               FROM tool_call_log
               WHERE tool_name IN (${placeholders}) AND result_status = 'error'
               ORDER BY created_at DESC
               LIMIT 50`
            )
            .all(...likelyTools) as any[];

          // Group errors by tool
          const errorsByTool: Map<string, { count: number; errors: string[] }> = new Map();
          for (const row of errorSessions) {
            if (!errorsByTool.has(row.tool_name)) {
              errorsByTool.set(row.tool_name, { count: 0, errors: [] });
            }
            const entry = errorsByTool.get(row.tool_name)!;
            entry.count++;
            if (row.error && entry.errors.length < 3) {
              entry.errors.push(row.error.slice(0, 100));
            }
          }

          for (const [toolName, stats] of errorsByTool) {
            if (stats.count >= 2) {
              predictions.push({
                risk: `${toolName} failures (${stats.count} historical errors)`,
                confidence: Math.min(0.3 + stats.count * 0.1, 0.85),
                evidence: `${stats.count} prior sessions using ${toolName} encountered errors. Sample: ${stats.errors[0] ?? "unknown error"}`,
                category: "tool_reliability",
                relatedLearnings: [],
                relatedGaps: [],
              });
            }
          }
        }
      } catch {
        /* tool_call_log table may not exist yet */
      }

      // ── 3. Cross-reference with CRITICAL/HIGH gaps ──
      try {
        const criticalGaps = db
          .prepare(
            "SELECT title, description, severity FROM gaps WHERE status = 'open' AND severity IN ('CRITICAL', 'HIGH') ORDER BY CASE severity WHEN 'CRITICAL' THEN 1 ELSE 2 END LIMIT 20"
          )
          .all() as any[];

        const descWords = new Set(
          taskDescription
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, "")
            .split(/\s+/)
            .filter((w) => w.length > 3)
        );

        for (const gap of criticalGaps) {
          const gapWords = new Set(
            ((gap.title ?? "") + " " + (gap.description ?? ""))
              .toLowerCase()
              .replace(/[^a-z0-9\s]/g, "")
              .split(/\s+/)
              .filter((w: string) => w.length > 3)
          );

          // Simple word overlap check
          const overlap = [...descWords].filter((w) => gapWords.has(w));
          if (overlap.length >= 2) {
            const existingPrediction = predictions.find(
              (p) => p.risk.includes(gap.title)
            );
            if (existingPrediction) {
              existingPrediction.relatedGaps.push({
                title: gap.title,
                severity: gap.severity,
              });
              existingPrediction.confidence = Math.min(
                existingPrediction.confidence + 0.15,
                0.95
              );
            } else {
              predictions.push({
                risk: `Existing ${gap.severity} gap: ${gap.title}`,
                confidence: gap.severity === "CRITICAL" ? 0.8 : 0.6,
                evidence: `Open ${gap.severity} gap overlaps with task keywords: ${overlap.join(", ")}`,
                category: "existing_gap",
                relatedLearnings: [],
                relatedGaps: [{ title: gap.title, severity: gap.severity }],
              });
            }
          }
        }
      } catch {
        /* gaps table may not exist yet */
      }

      // ── Sort by confidence and limit ──
      predictions.sort((a, b) => b.confidence - a.confidence);
      const topPredictions = predictions.slice(0, maxPredictions);

      // Deduplicate related learnings within each prediction
      for (const pred of topPredictions) {
        const seen = new Set<string>();
        pred.relatedLearnings = pred.relatedLearnings.filter((l) => {
          if (seen.has(l.key)) return false;
          seen.add(l.key);
          return true;
        });
      }

      return {
        taskDescription,
        predictionsCount: topPredictions.length,
        predictions: topPredictions.map((p) => ({
          risk: p.risk,
          confidence: Math.round(p.confidence * 100) / 100,
          evidence: p.evidence,
          category: p.category,
          relatedLearnings: p.relatedLearnings.slice(0, 3),
          relatedGaps: p.relatedGaps,
        })),
        matchedLearningsCount: matchedLearnings.length,
        tip:
          topPredictions.length === 0
            ? "No risk patterns found for this task. Either the task is novel or the knowledge base needs more data. Run mine_session_patterns to build historical pattern data."
            : "Review predictions before starting. Use assess_risk for a formal risk assessment, or search_all_knowledge for deeper context on each predicted risk.",
      };
    },
  },
];
