/**
 * Reconnaissance tools — structured research and context gathering.
 * Phase 1 of verification requires checking latest SDKs, APIs, docs,
 * AND understanding the existing codebase/project context.
 * These tools structure that research as a trackable process.
 */

import { getDb, genId, isFirstRun } from "../db.js";
import type { McpTool } from "../types.js";

/** Pre-built source checklists for known ecosystems. No API keys needed. */
const FRAMEWORK_SOURCES: Record<
  string,
  Array<{ source: string; url: string; checkFor: string }>
> = {
  anthropic: [
    {
      source: "Anthropic Blog",
      url: "https://www.anthropic.com/news",
      checkFor: "New model releases, API changes, safety updates",
    },
    {
      source: "Claude API Changelog",
      url: "https://docs.anthropic.com/en/release-notes/api",
      checkFor: "Breaking changes, new endpoints, deprecations",
    },
    {
      source: "MCP Specification",
      url: "https://github.com/modelcontextprotocol/specification",
      checkFor: "Protocol version updates, new capabilities",
    },
    {
      source: "MCP TypeScript SDK Releases",
      url: "https://github.com/modelcontextprotocol/typescript-sdk/releases",
      checkFor: "SDK API changes, Zod requirements, transport updates",
    },
    {
      source: "Anthropic Cookbook",
      url: "https://github.com/anthropics/anthropic-cookbook",
      checkFor: "Best practices, tool use patterns, prompt engineering",
    },
  ],
  langchain: [
    {
      source: "LangChain Blog",
      url: "https://blog.langchain.dev/",
      checkFor: "Architecture changes, LangGraph updates, new integrations",
    },
    {
      source: "LangChain JS Releases",
      url: "https://github.com/langchain-ai/langchainjs/releases",
      checkFor: "Breaking changes, new tools, deprecated APIs",
    },
    {
      source: "LangChain Python Releases",
      url: "https://github.com/langchain-ai/langchain/releases",
      checkFor: "Breaking changes, new tools, deprecated APIs",
    },
    {
      source: "LangSmith Docs",
      url: "https://docs.smith.langchain.com/",
      checkFor: "Eval frameworks, tracing patterns, dataset management",
    },
  ],
  openai: [
    {
      source: "OpenAI Blog",
      url: "https://openai.com/blog",
      checkFor: "New models, API features, pricing changes",
    },
    {
      source: "OpenAI API Changelog",
      url: "https://platform.openai.com/docs/changelog",
      checkFor: "Endpoint changes, deprecations, new parameters",
    },
    {
      source: "OpenAI Agents SDK",
      url: "https://github.com/openai/openai-agents-sdk/releases",
      checkFor: "Agent patterns, tool use, MCP integration",
    },
    {
      source: "OpenAI Evals",
      url: "https://github.com/openai/evals",
      checkFor: "Evaluation datasets, benchmarks, scoring patterns",
    },
  ],
  google: [
    {
      source: "Google AI Blog",
      url: "https://blog.google/technology/ai/",
      checkFor: "Gemini updates, new capabilities, research papers",
    },
    {
      source: "Gemini API Changelog",
      url: "https://ai.google.dev/gemini-api/docs/changelog",
      checkFor: "API changes, new models, feature additions",
    },
    {
      source: "Google AI Studio",
      url: "https://aistudio.google.com/",
      checkFor: "Tool use patterns, grounding, function calling updates",
    },
  ],
  mcp: [
    {
      source: "MCP Specification",
      url: "https://github.com/modelcontextprotocol/specification",
      checkFor: "Protocol version, new capabilities, transport changes",
    },
    {
      source: "MCP TypeScript SDK",
      url: "https://github.com/modelcontextprotocol/typescript-sdk/releases",
      checkFor: "SDK breaking changes, new server/client APIs",
    },
    {
      source: "MCP Python SDK",
      url: "https://github.com/modelcontextprotocol/python-sdk/releases",
      checkFor: "SDK breaking changes, new patterns",
    },
    {
      source: "MCP Servers Directory",
      url: "https://github.com/modelcontextprotocol/servers",
      checkFor: "Reference implementations, community patterns",
    },
  ],
};

export const reconTools: McpTool[] = [
  {
    name: "run_recon",
    description:
      "Start a reconnaissance research session. Use this at the start of Phase 1 (Context Gathering) to organize research into external sources (SDKs, APIs, blogs) AND internal context (codebase, project details, existing patterns). Returns a structured research plan with suggested sources and context-gathering questions.",
    inputSchema: {
      type: "object",
      properties: {
        target: {
          type: "string",
          description:
            "What you're researching (e.g., 'MCP SDK update', 'Anthropic Claude API', 'project auth system')",
        },
        description: {
          type: "string",
          description:
            "Why you're researching this (e.g., 'Planning MCP server upgrade', 'Understanding existing auth before refactor')",
        },
        projectContext: {
          type: "object",
          description:
            "Existing project context to inform the research. Include whatever is known.",
          properties: {
            techStack: {
              type: "string",
              description:
                "Languages, frameworks, runtimes (e.g., 'TypeScript, Node.js, Convex, React')",
            },
            currentVersions: {
              type: "string",
              description:
                "Relevant package versions (e.g., 'MCP SDK 1.25.3, better-sqlite3 11.x')",
            },
            architecture: {
              type: "string",
              description:
                "Brief architecture description (e.g., 'MCP server over stdio, SQLite local DB')",
            },
            knownIssues: {
              type: "string",
              description:
                "Known problems to investigate (e.g., 'Zod schema requirement in SDK >=1.17')",
            },
          },
        },
      },
      required: ["target"],
    },
    handler: async (args) => {
      const { target, description, projectContext } = args;
      const db = getDb();
      const sessionId = genId("recon");
      const now = new Date().toISOString();

      const fullDescription = projectContext
        ? `${description ?? target}. Context: ${JSON.stringify(projectContext)}`
        : description ?? null;

      db.prepare(
        "INSERT INTO recon_sessions (id, target, description, status, created_at) VALUES (?, ?, ?, 'active', ?)"
      ).run(sessionId, target, fullDescription, now);

      // Generate research plan based on target keywords
      const targetLower = target.toLowerCase();
      const externalSources: string[] = [];
      const internalChecks: string[] = [];
      const contextQuestions: string[] = [];

      // External source suggestions based on keywords
      for (const [ecosystem, sources] of Object.entries(FRAMEWORK_SOURCES)) {
        if (
          targetLower.includes(ecosystem) ||
          (ecosystem === "anthropic" && targetLower.includes("claude")) ||
          (ecosystem === "mcp" &&
            targetLower.includes("model context protocol"))
        ) {
          for (const s of sources) {
            externalSources.push(`[${s.source}] ${s.url} — ${s.checkFor}`);
          }
        }
      }

      // Always suggest generic external checks
      externalSources.push(
        "Search GitHub issues for recent bugs related to your target"
      );
      externalSources.push(
        "Check npm/PyPI for latest package versions and changelogs"
      );

      // Internal context checks
      internalChecks.push(
        "Search codebase for existing usage of the target (grep for imports, function calls)"
      );
      internalChecks.push(
        "Review AGENTS.md or project docs for documented patterns and conventions"
      );
      internalChecks.push(
        "Check package.json / requirements.txt for current dependency versions"
      );
      internalChecks.push(
        "Look for existing tests that cover the area being researched"
      );
      internalChecks.push(
        "Search learnings DB for past issues related to this target"
      );

      // Context questions to ask if projectContext is missing
      if (!projectContext) {
        contextQuestions.push(
          "What is the tech stack? (languages, frameworks, runtimes)"
        );
        contextQuestions.push(
          "What are the current versions of relevant packages?"
        );
        contextQuestions.push(
          "What is the high-level architecture? (monolith, microservices, MCP server, etc.)"
        );
        contextQuestions.push(
          "Are there known issues or constraints related to this research?"
        );
      } else {
        if (!projectContext.techStack)
          contextQuestions.push("What is the full tech stack?");
        if (!projectContext.currentVersions)
          contextQuestions.push(
            "What versions of relevant packages are installed?"
          );
      }

      return {
        sessionId,
        target,
        status: "active",
        researchPlan: {
          externalSources:
            externalSources.length > 0
              ? externalSources
              : [
                  "No pre-built sources for this target. Use check_framework_updates for known ecosystems, or research manually.",
                ],
          internalChecks,
          contextQuestions:
            contextQuestions.length > 0
              ? contextQuestions
              : ["Project context provided — no additional questions."],
          projectContext: projectContext ?? null,
        },
        nextSteps: [
          "1. Answer any contextQuestions (gather project context)",
          "2. Use check_framework_updates for known ecosystems",
          "3. Use search_learnings to check for past findings",
          "4. Visit each external source",
          "5. Call log_recon_finding for each discovery",
          "6. Call get_recon_summary when research is complete",
        ],
      };
    },
  },
  {
    name: "log_recon_finding",
    description:
      "Record a finding from reconnaissance research. Link it to a recon session and categorize it. Use for both external discoveries (SDK changes, blog posts) and internal findings (codebase patterns, existing implementations).",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: {
          type: "string",
          description: "Recon session ID from run_recon",
        },
        sourceUrl: {
          type: "string",
          description:
            "Where you found this (URL to blog post, GitHub issue, docs page, or 'internal:filename' for codebase findings)",
        },
        category: {
          type: "string",
          enum: [
            "breaking_change",
            "new_feature",
            "deprecation",
            "best_practice",
            "dataset",
            "benchmark",
            "codebase_pattern",
            "existing_implementation",
          ],
          description: "Type of finding",
        },
        summary: {
          type: "string",
          description: "What you found (concise description)",
        },
        relevance: {
          type: "string",
          description: "How this affects current work",
        },
        actionItems: {
          type: "string",
          description: "What needs to be done based on this finding",
        },
      },
      required: ["sessionId", "category", "summary"],
    },
    handler: async (args) => {
      const { sessionId, sourceUrl, category, summary, relevance, actionItems } =
        args;
      const db = getDb();

      const session = db
        .prepare("SELECT * FROM recon_sessions WHERE id = ?")
        .get(sessionId) as any;
      if (!session) throw new Error(`Recon session not found: ${sessionId}`);

      const findingId = genId("finding");
      const now = new Date().toISOString();

      db.prepare(
        "INSERT INTO recon_findings (id, session_id, source_url, category, summary, relevance, action_items, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      ).run(
        findingId,
        sessionId,
        sourceUrl ?? null,
        category,
        summary,
        relevance ?? null,
        actionItems ?? null,
        now
      );

      // Count findings so far
      const count = (
        db
          .prepare(
            "SELECT COUNT(*) as count FROM recon_findings WHERE session_id = ?"
          )
          .get(sessionId) as any
      ).count;

      return {
        findingId,
        sessionId,
        category,
        findingCount: count,
        message: `Finding recorded (${count} total). Call get_recon_summary to see all findings for this session.`,
      };
    },
  },
  {
    name: "get_recon_summary",
    description:
      "Get aggregated summary of all findings from a recon session. Groups findings by category (breaking changes, new features, codebase patterns, etc.) with prioritized action items.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: {
          type: "string",
          description: "Recon session ID",
        },
        completeSession: {
          type: "boolean",
          description: "Mark session as completed (default false)",
        },
      },
      required: ["sessionId"],
    },
    handler: async (args) => {
      const { sessionId, completeSession } = args;
      const db = getDb();

      const session = db
        .prepare("SELECT * FROM recon_sessions WHERE id = ?")
        .get(sessionId) as any;
      if (!session) throw new Error(`Recon session not found: ${sessionId}`);

      const findings = db
        .prepare(
          "SELECT * FROM recon_findings WHERE session_id = ? ORDER BY created_at ASC"
        )
        .all(sessionId) as any[];

      // Group by category
      const byCategory: Record<string, any[]> = {};
      for (const f of findings) {
        if (!byCategory[f.category]) byCategory[f.category] = [];
        byCategory[f.category].push({
          findingId: f.id,
          summary: f.summary,
          sourceUrl: f.source_url,
          relevance: f.relevance,
          actionItems: f.action_items,
        });
      }

      // Aggregate action items
      const allActionItems = findings
        .filter((f: any) => f.action_items)
        .map((f: any) => ({
          action: f.action_items,
          category: f.category,
          source: f.source_url,
        }));

      // Priority order for categories
      const PRIORITY_ORDER = [
        "breaking_change",
        "deprecation",
        "existing_implementation",
        "codebase_pattern",
        "new_feature",
        "best_practice",
        "dataset",
        "benchmark",
      ];

      const prioritizedActions = allActionItems.sort((a, b) => {
        const ai = PRIORITY_ORDER.indexOf(a.category);
        const bi = PRIORITY_ORDER.indexOf(b.category);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      });

      if (completeSession) {
        const now = new Date().toISOString();
        db.prepare(
          "UPDATE recon_sessions SET status = 'completed', completed_at = ? WHERE id = ?"
        ).run(now, sessionId);
      }

      return {
        sessionId,
        target: session.target,
        status: completeSession ? "completed" : session.status,
        totalFindings: findings.length,
        findingsByCategory: byCategory,
        prioritizedActionItems: prioritizedActions,
        recommendation:
          findings.length > 0
            ? "Review by priority: breaking_change > deprecation > existing_implementation > codebase_pattern > new_feature > best_practice > dataset > benchmark"
            : "No findings recorded yet. Continue research or close session.",
      };
    },
  },
  {
    name: "check_framework_updates",
    description:
      "Get a structured checklist of sources to check for framework/SDK updates. Pre-built source lists for: anthropic, langchain, openai, google, mcp. Each source includes what to check for. Use this to guide your reconnaissance research systematically.",
    inputSchema: {
      type: "object",
      properties: {
        ecosystem: {
          type: "string",
          enum: ["anthropic", "langchain", "openai", "google", "mcp"],
          description: "Which ecosystem to get sources for",
        },
      },
      required: ["ecosystem"],
    },
    handler: async (args) => {
      const sources = FRAMEWORK_SOURCES[args.ecosystem];
      if (!sources)
        throw new Error(
          `Unknown ecosystem: ${args.ecosystem}. Valid: ${Object.keys(FRAMEWORK_SOURCES).join(", ")}`
        );

      return {
        ecosystem: args.ecosystem,
        sourceCount: sources.length,
        sources,
        checklist: sources.map((s, i) => ({
          step: i + 1,
          action: `Visit ${s.source}`,
          url: s.url,
          lookFor: s.checkFor,
        })),
        usage:
          "Visit each source and record findings with log_recon_finding. Focus on: breaking_change (highest priority), deprecation, new_feature, best_practice.",
      };
    },
  },
  {
    name: "search_all_knowledge",
    description:
      "Search ALL accumulated knowledge in one call: learnings (edge cases, gotchas, patterns), recon findings (across ALL sessions), and resolved gaps from past verifications. Use this before starting any new work to see what the system already knows. This is the unified knowledge base that grows automatically as the tools are used.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "What you're looking for (e.g., 'MCP SDK breaking changes', 'auth patterns', 'SQLite gotchas')",
        },
        categories: {
          type: "array",
          items: { type: "string" },
          description:
            "Filter by categories (optional). Applies to both learnings and recon findings.",
        },
        limit: {
          type: "number",
          description: "Max results per source (default 10)",
        },
      },
      required: ["query"],
    },
    handler: async (args) => {
      const { query, categories, limit: maxResults } = args;
      const db = getDb();
      const limit = maxResults ?? 10;

      // 1. Search learnings via FTS5 (with LIKE fallback for syntax issues)
      let learnings: any[] = [];
      try {
        learnings = db
          .prepare(
            `SELECT l.key, l.content, l.category, l.tags, l.source_cycle, l.created_at
             FROM learnings_fts
             JOIN learnings l ON l.id = learnings_fts.rowid
             WHERE learnings_fts MATCH ?
             ORDER BY rank
             LIMIT ?`
          )
          .all(query, limit) as any[];
      } catch {
        // FTS5 syntax error (e.g., special chars in query) — fall back to LIKE
        learnings = db
          .prepare(
            `SELECT key, content, category, tags, source_cycle, created_at
             FROM learnings
             WHERE content LIKE ? OR key LIKE ?
             ORDER BY created_at DESC
             LIMIT ?`
          )
          .all(`%${query}%`, `%${query}%`, limit) as any[];
      }

      // Apply category filter if provided
      if (categories && categories.length > 0) {
        learnings = learnings.filter((l: any) =>
          categories.includes(l.category)
        );
      }

      // 2. Search recon findings across ALL sessions
      let reconFindings: any[];
      if (categories && categories.length > 0) {
        const placeholders = categories.map(() => "?").join(", ");
        reconFindings = db
          .prepare(
            `SELECT f.id, f.session_id, f.source_url, f.category, f.summary,
                    f.relevance, f.action_items, f.created_at,
                    s.target as session_target
             FROM recon_findings f
             JOIN recon_sessions s ON s.id = f.session_id
             WHERE (f.summary LIKE ? OR f.relevance LIKE ? OR f.action_items LIKE ?)
               AND f.category IN (${placeholders})
             ORDER BY f.created_at DESC
             LIMIT ?`
          )
          .all(
            `%${query}%`,
            `%${query}%`,
            `%${query}%`,
            ...categories,
            limit
          ) as any[];
      } else {
        reconFindings = db
          .prepare(
            `SELECT f.id, f.session_id, f.source_url, f.category, f.summary,
                    f.relevance, f.action_items, f.created_at,
                    s.target as session_target
             FROM recon_findings f
             JOIN recon_sessions s ON s.id = f.session_id
             WHERE f.summary LIKE ? OR f.relevance LIKE ? OR f.action_items LIKE ?
             ORDER BY f.created_at DESC
             LIMIT ?`
          )
          .all(`%${query}%`, `%${query}%`, `%${query}%`, limit) as any[];
      }

      // 3. Search ALL gaps from past verification cycles (resolved + open)
      const matchedGaps = db
        .prepare(
          `SELECT g.id, g.cycle_id, g.title, g.description, g.severity,
                  g.status, g.fix_strategy as resolution, g.resolved_at,
                  c.title as cycle_target
           FROM gaps g
           JOIN verification_cycles c ON c.id = g.cycle_id
           WHERE (g.description LIKE ? OR g.fix_strategy LIKE ? OR g.title LIKE ?)
           ORDER BY g.created_at DESC
           LIMIT ?`
        )
        .all(`%${query}%`, `%${query}%`, `%${query}%`, limit) as any[];

      const totalResults =
        learnings.length + reconFindings.length + matchedGaps.length;

      return {
        query,
        totalResults,
        learnings: learnings.map((l: any) => ({
          source: "learnings",
          key: l.key,
          content: l.content,
          category: l.category,
          tags: l.tags ? JSON.parse(l.tags) : [],
          createdAt: l.created_at,
        })),
        reconFindings: reconFindings.map((f: any) => ({
          source: "recon",
          sessionTarget: f.session_target,
          category: f.category,
          summary: f.summary,
          relevance: f.relevance,
          actionItems: f.action_items,
          sourceUrl: f.source_url,
          createdAt: f.created_at,
        })),
        gaps: matchedGaps.map((g: any) => ({
          source: "verification",
          cycleTarget: g.cycle_target,
          title: g.title,
          description: g.description,
          severity: g.severity,
          status: g.status,
          resolution: g.resolution,
          resolvedAt: g.resolved_at,
        })),
        _contributeBack: {
          instruction:
            "If you discover new information while working, record it so future agents benefit:",
          actions: [
            "record_learning — for edge cases, gotchas, patterns, conventions",
            "log_recon_finding — for SDK changes, breaking changes, best practices",
          ],
        },
      };
    },
  },
  {
    name: "bootstrap_project",
    description:
      "Register or update your project's context (tech stack, architecture, conventions, build commands). This is stored persistently and used by all future agent sessions. Call this on first use to give the MCP full project awareness, or call again to update when your project evolves.",
    inputSchema: {
      type: "object",
      properties: {
        projectName: {
          type: "string",
          description: "Project name (e.g., 'my-saas-app', 'nodebench-mcp')",
        },
        techStack: {
          type: "string",
          description:
            "Languages, frameworks, runtimes (e.g., 'TypeScript, Node.js, React, Convex')",
        },
        architecture: {
          type: "string",
          description:
            "High-level architecture (e.g., 'Monorepo: MCP server (stdio) + web client (Next.js) + Convex backend')",
        },
        buildCommands: {
          type: "string",
          description:
            "Build commands (e.g., 'npm run build, tsc --noEmit')",
        },
        testCommands: {
          type: "string",
          description:
            "Test commands (e.g., 'npm test, npx jest, npx vitest')",
        },
        conventions: {
          type: "string",
          description:
            "Coding conventions (e.g., 'ESM modules, no default exports, strict TypeScript, raw JSON Schema for MCP tools')",
        },
        keyDependencies: {
          type: "string",
          description:
            "Key dependency versions (e.g., '@modelcontextprotocol/sdk 1.25.3, better-sqlite3 11.x')",
        },
        repoStructure: {
          type: "string",
          description:
            "Repository structure highlights (e.g., 'packages/mcp-local (MCP server), packages/web (frontend), convex/ (backend)')",
        },
      },
      required: ["projectName"],
    },
    handler: async (args) => {
      const db = getDb();
      const now = new Date().toISOString();
      const upsert = db.prepare(
        "INSERT INTO project_context (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at"
      );

      const fields: Record<string, string | undefined> = {
        project_name: args.projectName,
        tech_stack: args.techStack,
        architecture: args.architecture,
        build_commands: args.buildCommands,
        test_commands: args.testCommands,
        conventions: args.conventions,
        key_dependencies: args.keyDependencies,
        repo_structure: args.repoStructure,
      };

      const stored: Record<string, string> = {};
      for (const [key, value] of Object.entries(fields)) {
        if (value) {
          upsert.run(key, value, now);
          stored[key] = value;
        }
      }

      // Get knowledge base stats
      const learningsCount = (
        db.prepare("SELECT COUNT(*) as c FROM learnings").get() as any
      ).c;
      const reconCount = (
        db.prepare("SELECT COUNT(*) as c FROM recon_sessions").get() as any
      ).c;
      const cycleCount = (
        db.prepare("SELECT COUNT(*) as c FROM verification_cycles").get() as any
      ).c;
      const gapCount = (
        db
          .prepare(
            "SELECT COUNT(*) as c FROM gaps WHERE status = 'resolved'"
          )
          .get() as any
      ).c;

      const isNew =
        learningsCount === 0 && reconCount === 0 && cycleCount === 0;

      return {
        projectName: args.projectName,
        storedFields: Object.keys(stored),
        context: stored,
        knowledgeBase: {
          learnings: learningsCount,
          reconSessions: reconCount,
          verificationCycles: cycleCount,
          resolvedGaps: gapCount,
        },
        ...(isNew
          ? {
              _onboarding: {
                message:
                  "Project registered! This is a fresh install. Here's how to get started:",
                nextSteps: [
                  'Call getMethodology("overview") to see all available development methodologies',
                  'Call search_all_knowledge("your current task") before starting any work',
                  'Call run_recon with your project context to research latest SDK/framework updates',
                  "As you work, tool responses will guide you to record learnings and findings",
                  "The knowledge base grows automatically — future sessions benefit from past work",
                ],
              },
            }
          : {
              _returning: {
                message: `Welcome back! Knowledge base has ${learningsCount} learnings, ${reconCount} recon sessions, ${cycleCount} verification cycles, and ${gapCount} resolved gaps.`,
                nextSteps: [
                  "Call search_all_knowledge with your current task to see what's already known",
                  "Call get_project_context to see full project context",
                  "Continue where you left off — all past work is searchable",
                ],
              },
            }),
      };
    },
  },
  {
    name: "get_project_context",
    description:
      "Retrieve the stored project context (tech stack, architecture, conventions, etc.) and knowledge base stats. Call this at the start of any session to refresh your project awareness. If no project context exists, returns onboarding instructions.",
    inputSchema: {
      type: "object",
      properties: {
        key: {
          type: "string",
          description:
            "Get a specific field (optional). Keys: project_name, tech_stack, architecture, build_commands, test_commands, conventions, key_dependencies, repo_structure",
        },
      },
    },
    handler: async (args) => {
      const db = getDb();

      // Get project context
      let rows: any[];
      if (args.key) {
        rows = db
          .prepare("SELECT * FROM project_context WHERE key = ?")
          .all(args.key) as any[];
      } else {
        rows = db
          .prepare("SELECT * FROM project_context ORDER BY key")
          .all() as any[];
      }

      const context: Record<string, string> = {};
      for (const row of rows) {
        context[row.key] = row.value;
      }

      // Knowledge base stats
      const learningsCount = (
        db.prepare("SELECT COUNT(*) as c FROM learnings").get() as any
      ).c;
      const reconCount = (
        db.prepare("SELECT COUNT(*) as c FROM recon_sessions").get() as any
      ).c;
      const cycleCount = (
        db.prepare("SELECT COUNT(*) as c FROM verification_cycles").get() as any
      ).c;
      const gapCount = (
        db
          .prepare(
            "SELECT COUNT(*) as c FROM gaps WHERE status = 'resolved'"
          )
          .get() as any
      ).c;
      const evalCount = (
        db.prepare("SELECT COUNT(*) as c FROM eval_runs").get() as any
      ).c;

      if (rows.length === 0) {
        return {
          context: {},
          knowledgeBase: {
            learnings: learningsCount,
            reconSessions: reconCount,
            verificationCycles: cycleCount,
            resolvedGaps: gapCount,
            evalRuns: evalCount,
          },
          _onboarding: {
            message:
              "No project context stored yet. Call bootstrap_project to register your project.",
            example:
              'bootstrap_project({ projectName: "my-app", techStack: "TypeScript, React, Node.js", architecture: "Next.js frontend + Express API" })',
          },
        };
      }

      return {
        context,
        knowledgeBase: {
          learnings: learningsCount,
          reconSessions: reconCount,
          verificationCycles: cycleCount,
          resolvedGaps: gapCount,
          evalRuns: evalCount,
        },
        _contributeBack: {
          instruction:
            "Keep project context current. Call bootstrap_project to update if your stack or architecture changes.",
          actions: [
            "bootstrap_project — update tech stack, dependencies, or conventions",
            "search_all_knowledge — check existing knowledge before starting work",
          ],
        },
      };
    },
  },
];
