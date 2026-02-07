/**
 * C-Compiler Benchmark Tools — Autonomous agent capability measurement.
 *
 * Based on Anthropic's "Building a C Compiler with Parallel Claudes" (Feb 2026).
 * Measures how long and how far an agent can autonomously run to build something
 * complex using NodeBench MCP tools.
 *
 * 3 tools:
 * - start_autonomy_benchmark: Define a complex build challenge and track agent progress
 * - log_benchmark_milestone: Record each milestone the agent achieves
 * - complete_autonomy_benchmark: Finalize and score the benchmark run
 */

import type { McpTool } from "../types.js";
import { getDb, genId } from "../db.js";

// ── Benchmark challenge definitions ──────────────────────────────────────

interface BenchmarkChallenge {
  name: string;
  description: string;
  difficulty: "easy" | "medium" | "hard" | "extreme";
  estimatedMinutes: number;
  milestones: Array<{
    id: string;
    name: string;
    description: string;
    points: number;
    /** Tools that should be used to verify this milestone */
    verificationTools: string[];
  }>;
  totalPoints: number;
  /** What Anthropic's parallel Claudes achieved for reference */
  anthropicReference?: string;
}

const CHALLENGES: Record<string, BenchmarkChallenge> = {
  c_compiler: {
    name: "C Compiler (Anthropic Reference)",
    description:
      "Build a C compiler that passes a test suite. Based on Anthropic's blog where parallel Claudes built a C compiler from scratch. Measures: project setup, lexer, parser, codegen, optimization, test coverage.",
    difficulty: "extreme",
    estimatedMinutes: 480,
    milestones: [
      { id: "project_setup", name: "Project Setup", description: "Initialize project with build system, tests, CI", points: 5, verificationTools: ["run_closed_loop", "bootstrap_project"] },
      { id: "lexer", name: "Lexer/Tokenizer", description: "Tokenize C source into tokens (keywords, identifiers, operators, literals)", points: 15, verificationTools: ["run_closed_loop", "log_test_result"] },
      { id: "parser", name: "Parser/AST", description: "Parse tokens into an AST (expressions, statements, functions, types)", points: 20, verificationTools: ["run_closed_loop", "run_oracle_comparison"] },
      { id: "semantic_analysis", name: "Semantic Analysis", description: "Type checking, scope resolution, symbol table", points: 15, verificationTools: ["run_closed_loop", "log_test_result"] },
      { id: "codegen_basic", name: "Basic Code Generation", description: "Generate assembly/IR for arithmetic, variables, functions", points: 15, verificationTools: ["run_oracle_comparison", "log_test_result"] },
      { id: "control_flow", name: "Control Flow", description: "If/else, while, for, switch, break, continue", points: 10, verificationTools: ["run_oracle_comparison"] },
      { id: "pointers_arrays", name: "Pointers & Arrays", description: "Pointer arithmetic, array indexing, string literals", points: 10, verificationTools: ["run_oracle_comparison"] },
      { id: "structs_unions", name: "Structs & Unions", description: "Struct layout, member access, union support", points: 5, verificationTools: ["run_oracle_comparison"] },
      { id: "stdlib_integration", name: "Standard Library", description: "Link against libc, printf, malloc, etc.", points: 3, verificationTools: ["run_closed_loop"] },
      { id: "optimization", name: "Optimization Pass", description: "At least one optimization: constant folding, dead code elimination, etc.", points: 2, verificationTools: ["run_oracle_comparison"] },
    ],
    totalPoints: 100,
    anthropicReference: "Anthropic's parallel Claudes built a working C compiler in ~8 hours with 4 parallel agents. Key insight: oracle-based testing (using GCC as reference) enabled parallel debugging.",
  },

  rest_api: {
    name: "Production REST API",
    description:
      "Build a production-ready REST API with auth, CRUD, validation, error handling, tests, docs, and deployment config. A common real-world benchmark for agent capability.",
    difficulty: "medium",
    estimatedMinutes: 120,
    milestones: [
      { id: "project_setup", name: "Project Setup", description: "Initialize with framework, TypeScript, linting", points: 10, verificationTools: ["run_closed_loop", "bootstrap_project"] },
      { id: "database_schema", name: "Database Schema", description: "Define models/tables with relationships", points: 10, verificationTools: ["run_closed_loop"] },
      { id: "crud_endpoints", name: "CRUD Endpoints", description: "Create, Read, Update, Delete for main resource", points: 15, verificationTools: ["run_closed_loop", "log_test_result"] },
      { id: "auth", name: "Authentication", description: "JWT or session-based auth with login/signup/logout", points: 15, verificationTools: ["run_closed_loop", "log_test_result"] },
      { id: "validation", name: "Input Validation", description: "Request validation with proper error messages", points: 10, verificationTools: ["log_test_result"] },
      { id: "error_handling", name: "Error Handling", description: "Global error handler, proper HTTP status codes", points: 10, verificationTools: ["log_test_result"] },
      { id: "tests", name: "Test Suite", description: "Unit + integration tests with >80% coverage", points: 15, verificationTools: ["run_closed_loop", "log_test_result"] },
      { id: "docs", name: "API Documentation", description: "OpenAPI/Swagger docs or equivalent", points: 5, verificationTools: ["run_closed_loop"] },
      { id: "deployment", name: "Deployment Config", description: "Docker + CI/CD pipeline", points: 5, verificationTools: ["run_closed_loop"] },
      { id: "security", name: "Security Hardening", description: "Rate limiting, CORS, helmet, input sanitization", points: 5, verificationTools: ["scan_dependencies"] },
    ],
    totalPoints: 100,
  },

  fullstack_app: {
    name: "Full-Stack Web Application",
    description:
      "Build a complete full-stack app with frontend (React), backend (API), database, auth, real-time features, and deployment. Maximum complexity for measuring sustained autonomous capability.",
    difficulty: "hard",
    estimatedMinutes: 300,
    milestones: [
      { id: "project_setup", name: "Project Setup", description: "Monorepo with frontend + backend + shared types", points: 5, verificationTools: ["run_closed_loop", "bootstrap_project"] },
      { id: "backend_api", name: "Backend API", description: "REST or GraphQL API with auth and CRUD", points: 15, verificationTools: ["run_closed_loop", "log_test_result"] },
      { id: "database", name: "Database Layer", description: "Schema, migrations, seed data", points: 10, verificationTools: ["run_closed_loop"] },
      { id: "auth_system", name: "Auth System", description: "Login, signup, session management, protected routes", points: 10, verificationTools: ["log_test_result"] },
      { id: "frontend_shell", name: "Frontend Shell", description: "React app with routing, layout, navigation", points: 10, verificationTools: ["run_closed_loop", "capture_responsive_suite"] },
      { id: "frontend_pages", name: "Frontend Pages", description: "List, detail, create, edit pages with forms", points: 15, verificationTools: ["capture_responsive_suite", "run_quality_gate"] },
      { id: "realtime", name: "Real-Time Features", description: "WebSocket or SSE for live updates", points: 10, verificationTools: ["log_test_result"] },
      { id: "testing", name: "Test Coverage", description: "Frontend + backend tests, E2E tests", points: 10, verificationTools: ["run_closed_loop", "log_test_result"] },
      { id: "responsive_ui", name: "Responsive UI", description: "Works on mobile, tablet, and desktop", points: 5, verificationTools: ["capture_responsive_suite", "analyze_screenshot"] },
      { id: "deployment", name: "Deployment", description: "Docker, CI/CD, production build", points: 5, verificationTools: ["run_closed_loop"] },
      { id: "documentation", name: "Documentation", description: "README, API docs, architecture diagram", points: 5, verificationTools: ["update_agents_md"] },
    ],
    totalPoints: 100,
  },

  cli_tool: {
    name: "CLI Tool with Plugin System",
    description:
      "Build a CLI tool with argument parsing, plugin architecture, config file support, colored output, tests, and npm publishing setup. Good for measuring focused implementation capability.",
    difficulty: "easy",
    estimatedMinutes: 60,
    milestones: [
      { id: "project_setup", name: "Project Setup", description: "TypeScript project with build and test", points: 15, verificationTools: ["run_closed_loop"] },
      { id: "arg_parsing", name: "Argument Parsing", description: "Commands, flags, help text, validation", points: 15, verificationTools: ["run_closed_loop", "log_test_result"] },
      { id: "core_logic", name: "Core Logic", description: "Main functionality with error handling", points: 20, verificationTools: ["run_closed_loop", "log_test_result"] },
      { id: "config", name: "Config File Support", description: "Load/save config from .json or .yaml", points: 10, verificationTools: ["log_test_result"] },
      { id: "plugin_system", name: "Plugin Architecture", description: "Dynamic plugin loading with hooks", points: 15, verificationTools: ["log_test_result"] },
      { id: "output", name: "Colored Output", description: "Pretty printing, progress bars, tables", points: 5, verificationTools: ["log_test_result"] },
      { id: "tests", name: "Test Suite", description: "Unit tests with >80% coverage", points: 15, verificationTools: ["run_closed_loop"] },
      { id: "publish", name: "NPM Publishing", description: "package.json, bin field, README", points: 5, verificationTools: ["run_closed_loop"] },
    ],
    totalPoints: 100,
  },

  data_pipeline: {
    name: "Data Processing Pipeline",
    description:
      "Build an ETL pipeline with multiple data sources, transformations, error recovery, monitoring, and scheduling. Tests agent's ability to handle complex data flows.",
    difficulty: "medium",
    estimatedMinutes: 180,
    milestones: [
      { id: "project_setup", name: "Project Setup", description: "Project with typing, config, logging", points: 10, verificationTools: ["run_closed_loop"] },
      { id: "data_sources", name: "Data Source Connectors", description: "Read from CSV, JSON, API endpoints", points: 15, verificationTools: ["run_closed_loop", "log_test_result"] },
      { id: "transformations", name: "Data Transformations", description: "Filter, map, join, aggregate operations", points: 20, verificationTools: ["run_oracle_comparison", "log_test_result"] },
      { id: "error_recovery", name: "Error Recovery", description: "Retry logic, dead letter queue, partial failure handling", points: 15, verificationTools: ["log_test_result"] },
      { id: "output_sinks", name: "Output Sinks", description: "Write to file, database, or API", points: 10, verificationTools: ["run_closed_loop"] },
      { id: "monitoring", name: "Monitoring & Metrics", description: "Processing stats, error rates, throughput", points: 10, verificationTools: ["log_test_result"] },
      { id: "scheduling", name: "Scheduling", description: "Cron-based or event-driven triggering", points: 5, verificationTools: ["run_closed_loop"] },
      { id: "tests", name: "Test Suite", description: "Unit + integration tests with test fixtures", points: 15, verificationTools: ["run_closed_loop", "log_test_result"] },
    ],
    totalPoints: 100,
  },
};

// ── DB schema extension ──────────────────────────────────────────────────

function ensureBenchmarkTables(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS autonomy_benchmarks (
      id TEXT PRIMARY KEY,
      challenge_key TEXT NOT NULL,
      challenge_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT,
      total_points INTEGER NOT NULL DEFAULT 0,
      earned_points INTEGER NOT NULL DEFAULT 0,
      milestones_completed INTEGER NOT NULL DEFAULT 0,
      milestones_total INTEGER NOT NULL DEFAULT 0,
      duration_minutes REAL,
      tools_used TEXT,
      context_tokens_estimate INTEGER,
      notes TEXT,
      score_pct REAL
    );
    CREATE TABLE IF NOT EXISTS benchmark_milestones (
      id TEXT PRIMARY KEY,
      benchmark_id TEXT NOT NULL,
      milestone_id TEXT NOT NULL,
      milestone_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      points INTEGER NOT NULL DEFAULT 0,
      started_at TEXT,
      completed_at TEXT,
      duration_minutes REAL,
      tools_used TEXT,
      verification_passed INTEGER,
      notes TEXT,
      FOREIGN KEY (benchmark_id) REFERENCES autonomy_benchmarks(id)
    );
  `);
}

// ── Tools ────────────────────────────────────────────────────────────────

export const cCompilerBenchmarkTools: McpTool[] = [
  {
    name: "start_autonomy_benchmark",
    description:
      'Start an autonomous capability benchmark. Defines a complex build challenge and tracks agent progress through milestones. Inspired by Anthropic\'s C-compiler test. Available challenges: c_compiler, rest_api, fullstack_app, cli_tool, data_pipeline. Call with challenge="list" to see all options.',
    inputSchema: {
      type: "object",
      properties: {
        challenge: {
          type: "string",
          enum: ["c_compiler", "rest_api", "fullstack_app", "cli_tool", "data_pipeline", "list"],
          description: 'Which challenge to run. Use "list" to see all available challenges.',
        },
        projectPath: {
          type: "string",
          description: "Absolute path where the project will be built (optional, for tracking)",
        },
        notes: {
          type: "string",
          description: "Any notes about the setup (model used, configuration, etc.)",
        },
      },
      required: ["challenge"],
    },
    handler: async (args) => {
      if (args.challenge === "list") {
        return {
          availableChallenges: Object.entries(CHALLENGES).map(([key, ch]) => ({
            key,
            name: ch.name,
            difficulty: ch.difficulty,
            estimatedMinutes: ch.estimatedMinutes,
            totalPoints: ch.totalPoints,
            milestoneCount: ch.milestones.length,
            description: ch.description,
            ...(ch.anthropicReference ? { anthropicReference: ch.anthropicReference } : {}),
          })),
          _quickRef: {
            nextAction: "Pick a challenge and call start_autonomy_benchmark with that challenge key.",
            nextTools: ["start_autonomy_benchmark"],
          },
        };
      }

      const challenge = CHALLENGES[args.challenge];
      if (!challenge) {
        throw new Error(`Unknown challenge: ${args.challenge}. Available: ${Object.keys(CHALLENGES).join(", ")}`);
      }

      ensureBenchmarkTables();
      const db = getDb();
      const benchmarkId = genId("bench");

      db.prepare(
        "INSERT INTO autonomy_benchmarks (id, challenge_key, challenge_name, total_points, milestones_total, notes) VALUES (?, ?, ?, ?, ?, ?)"
      ).run(benchmarkId, args.challenge, challenge.name, challenge.totalPoints, challenge.milestones.length, args.notes ?? null);

      // Create milestone rows
      const insertMilestone = db.prepare(
        "INSERT INTO benchmark_milestones (id, benchmark_id, milestone_id, milestone_name, points) VALUES (?, ?, ?, ?, ?)"
      );
      for (const ms of challenge.milestones) {
        insertMilestone.run(genId("bms"), benchmarkId, ms.id, ms.name, ms.points);
      }

      return {
        benchmarkId,
        challenge: args.challenge,
        challengeName: challenge.name,
        difficulty: challenge.difficulty,
        estimatedMinutes: challenge.estimatedMinutes,
        totalPoints: challenge.totalPoints,
        milestones: challenge.milestones.map((ms) => ({
          id: ms.id,
          name: ms.name,
          description: ms.description,
          points: ms.points,
          verificationTools: ms.verificationTools,
        })),
        ...(challenge.anthropicReference ? { anthropicReference: challenge.anthropicReference } : {}),
        _quickRef: {
          nextAction: `Benchmark started! Begin with milestone '${challenge.milestones[0].id}': ${challenge.milestones[0].description}. Call log_benchmark_milestone when each milestone is achieved.`,
          nextTools: ["log_benchmark_milestone", "scaffold_nodebench_project", "bootstrap_project"],
          methodology: "verification",
        },
        recommendedWorkflow: [
          "1. scaffold_nodebench_project to set up project infrastructure",
          "2. bootstrap_project to register with NodeBench MCP",
          "3. For each milestone: implement → test → verify → log_benchmark_milestone",
          "4. Use run_closed_loop and run_oracle_comparison for verification",
          "5. Call complete_autonomy_benchmark when done (or when stuck)",
        ],
      };
    },
  },

  {
    name: "log_benchmark_milestone",
    description:
      "Record completion of a benchmark milestone. Tracks which milestones the agent achieved, time taken, tools used, and whether verification passed.",
    inputSchema: {
      type: "object",
      properties: {
        benchmarkId: {
          type: "string",
          description: "The benchmark run ID from start_autonomy_benchmark",
        },
        milestoneId: {
          type: "string",
          description: "The milestone ID to mark as complete (e.g. 'lexer', 'auth', 'tests')",
        },
        verificationPassed: {
          type: "boolean",
          description: "Whether the milestone passed verification (tests, oracle comparison, etc.)",
        },
        toolsUsed: {
          type: "array",
          items: { type: "string" },
          description: "List of NodeBench MCP tools used for this milestone",
        },
        notes: {
          type: "string",
          description: "Any notes about the implementation, challenges faced, or patterns discovered",
        },
        durationMinutes: {
          type: "number",
          description: "How long this milestone took (optional, for manual tracking)",
        },
      },
      required: ["benchmarkId", "milestoneId", "verificationPassed"],
    },
    handler: async (args) => {
      ensureBenchmarkTables();
      const db = getDb();

      // Verify benchmark exists
      const benchmark = db.prepare("SELECT * FROM autonomy_benchmarks WHERE id = ?").get(args.benchmarkId) as any;
      if (!benchmark) throw new Error(`Benchmark not found: ${args.benchmarkId}`);
      if (benchmark.status !== "active") throw new Error(`Benchmark is ${benchmark.status}, not active`);

      // Find the milestone row
      const milestone = db.prepare(
        "SELECT * FROM benchmark_milestones WHERE benchmark_id = ? AND milestone_id = ?"
      ).get(args.benchmarkId, args.milestoneId) as any;
      if (!milestone) throw new Error(`Milestone '${args.milestoneId}' not found in benchmark ${args.benchmarkId}`);

      if (milestone.status === "completed") {
        return {
          skipped: true,
          message: `Milestone '${args.milestoneId}' already completed`,
          milestone: milestone.milestone_name,
        };
      }

      // Update milestone
      const toolsUsed = args.toolsUsed ? JSON.stringify(args.toolsUsed) : null;
      db.prepare(
        "UPDATE benchmark_milestones SET status = ?, completed_at = datetime('now'), verification_passed = ?, tools_used = ?, notes = ?, duration_minutes = ? WHERE id = ?"
      ).run(
        args.verificationPassed ? "completed" : "failed",
        args.verificationPassed ? 1 : 0,
        toolsUsed,
        args.notes ?? null,
        args.durationMinutes ?? null,
        milestone.id
      );

      // Update benchmark totals
      if (args.verificationPassed) {
        db.prepare(
          "UPDATE autonomy_benchmarks SET earned_points = earned_points + ?, milestones_completed = milestones_completed + 1 WHERE id = ?"
        ).run(milestone.points, args.benchmarkId);
      }

      // Get updated status
      const updated = db.prepare("SELECT * FROM autonomy_benchmarks WHERE id = ?").get(args.benchmarkId) as any;
      const allMilestones = db.prepare(
        "SELECT milestone_id, milestone_name, status, points, verification_passed FROM benchmark_milestones WHERE benchmark_id = ? ORDER BY rowid"
      ).all(args.benchmarkId) as any[];

      const nextPending = allMilestones.find((m: any) => m.status === "pending");

      return {
        milestoneId: args.milestoneId,
        milestoneName: milestone.milestone_name,
        points: args.verificationPassed ? milestone.points : 0,
        verificationPassed: args.verificationPassed,
        progress: {
          earnedPoints: updated.earned_points,
          totalPoints: updated.total_points,
          scorePct: Math.round((updated.earned_points / updated.total_points) * 100),
          milestonesCompleted: updated.milestones_completed,
          milestonesTotal: updated.milestones_total,
        },
        allMilestones: allMilestones.map((m: any) => ({
          id: m.milestone_id,
          name: m.milestone_name,
          status: m.status,
          points: m.points,
          verified: m.verification_passed === 1,
        })),
        _quickRef: nextPending
          ? {
              nextAction: `Next milestone: '${nextPending.milestone_id}' (${nextPending.milestone_name}, ${nextPending.points} pts). Implement, test, verify, then log.`,
              nextTools: ["log_benchmark_milestone", "run_closed_loop", "run_oracle_comparison"],
            }
          : {
              nextAction: "All milestones attempted! Call complete_autonomy_benchmark to finalize the score.",
              nextTools: ["complete_autonomy_benchmark"],
            },
      };
    },
  },

  {
    name: "complete_autonomy_benchmark",
    description:
      "Finalize an autonomy benchmark run. Computes final score, duration, tool usage stats, and comparison against reference (e.g. Anthropic's C-compiler results). Call when the agent is done or stuck.",
    inputSchema: {
      type: "object",
      properties: {
        benchmarkId: {
          type: "string",
          description: "The benchmark run ID to finalize",
        },
        reason: {
          type: "string",
          enum: ["completed", "stuck", "timeout", "context_exhausted"],
          description: "Why the benchmark is ending",
        },
        totalContextTokens: {
          type: "number",
          description: "Estimated total context tokens consumed during the benchmark",
        },
        notes: {
          type: "string",
          description: "Final notes about the run (what worked, what didn't, key insights)",
        },
      },
      required: ["benchmarkId", "reason"],
    },
    handler: async (args) => {
      ensureBenchmarkTables();
      const db = getDb();

      const benchmark = db.prepare("SELECT * FROM autonomy_benchmarks WHERE id = ?").get(args.benchmarkId) as any;
      if (!benchmark) throw new Error(`Benchmark not found: ${args.benchmarkId}`);

      const milestones = db.prepare(
        "SELECT * FROM benchmark_milestones WHERE benchmark_id = ? ORDER BY rowid"
      ).all(args.benchmarkId) as any[];

      // Compute duration
      const startedAt = new Date(benchmark.started_at + "Z");
      const now = new Date();
      const durationMinutes = Math.round((now.getTime() - startedAt.getTime()) / 60000);

      // Compute score
      const scorePct = Math.round((benchmark.earned_points / benchmark.total_points) * 100);

      // Tool usage stats
      const toolUsageCounts: Record<string, number> = {};
      for (const ms of milestones) {
        if (ms.tools_used) {
          try {
            const tools = JSON.parse(ms.tools_used);
            for (const t of tools) {
              toolUsageCounts[t] = (toolUsageCounts[t] ?? 0) + 1;
            }
          } catch { /* ignore */ }
        }
      }

      // Update benchmark
      db.prepare(
        "UPDATE autonomy_benchmarks SET status = ?, completed_at = datetime('now'), duration_minutes = ?, score_pct = ?, context_tokens_estimate = ?, tools_used = ?, notes = ? WHERE id = ?"
      ).run(
        "completed",
        durationMinutes,
        scorePct,
        args.totalContextTokens ?? null,
        JSON.stringify(toolUsageCounts),
        args.notes ?? null,
        args.benchmarkId
      );

      // Grade
      let grade: string;
      if (scorePct >= 95) grade = "A+ (Exceptional)";
      else if (scorePct >= 85) grade = "A (Excellent)";
      else if (scorePct >= 75) grade = "B (Good)";
      else if (scorePct >= 60) grade = "C (Adequate)";
      else if (scorePct >= 40) grade = "D (Below Average)";
      else grade = "F (Insufficient)";

      // Get challenge for reference
      const challenge = CHALLENGES[benchmark.challenge_key];

      return {
        benchmarkId: args.benchmarkId,
        challenge: benchmark.challenge_key,
        challengeName: benchmark.challenge_name,
        reason: args.reason,
        score: {
          earnedPoints: benchmark.earned_points,
          totalPoints: benchmark.total_points,
          percentage: scorePct,
          grade,
        },
        duration: {
          minutes: durationMinutes,
          hours: Math.round(durationMinutes / 60 * 10) / 10,
          estimatedMinutes: challenge?.estimatedMinutes ?? null,
          vsEstimate: challenge ? `${Math.round((durationMinutes / challenge.estimatedMinutes) * 100)}% of estimated time` : null,
        },
        milestones: {
          completed: milestones.filter((m: any) => m.status === "completed").length,
          failed: milestones.filter((m: any) => m.status === "failed").length,
          pending: milestones.filter((m: any) => m.status === "pending").length,
          total: milestones.length,
          details: milestones.map((m: any) => ({
            id: m.milestone_id,
            name: m.milestone_name,
            status: m.status,
            points: m.points,
            verified: m.verification_passed === 1,
            durationMinutes: m.duration_minutes,
          })),
        },
        toolUsage: {
          uniqueTools: Object.keys(toolUsageCounts).length,
          totalCalls: Object.values(toolUsageCounts).reduce((a, b) => a + b, 0),
          byTool: toolUsageCounts,
        },
        contextTokens: args.totalContextTokens ?? null,
        ...(challenge?.anthropicReference ? { anthropicReference: challenge.anthropicReference } : {}),
        analysis: {
          strengths: milestones.filter((m: any) => m.status === "completed").map((m: any) => m.milestone_name),
          gaps: milestones.filter((m: any) => m.status !== "completed").map((m: any) => `${m.milestone_name} (${m.status})`),
          stoppingReason: args.reason,
          toolEfficiency: Object.keys(toolUsageCounts).length > 0
            ? `Used ${Object.keys(toolUsageCounts).length} unique tools across ${Object.values(toolUsageCounts).reduce((a, b) => a + b, 0)} calls`
            : "No tool usage tracked",
        },
        _quickRef: {
          nextAction: "Benchmark complete. Record key learnings with record_learning. Use promote_to_eval to create eval cases from the milestone results.",
          nextTools: ["record_learning", "promote_to_eval", "start_autonomy_benchmark"],
        },
      };
    },
  },
];
