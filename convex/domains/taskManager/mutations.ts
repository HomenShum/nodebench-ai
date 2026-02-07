/**
 * Task Manager Mutations
 *
 * CRUD operations for task sessions, traces, and spans.
 * Designed for integration with existing agent infrastructure.
 */

import { v } from "convex/values";
import { mutation, internalMutation } from "../../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id, Doc } from "../../_generated/dataModel";

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// UTILITY FUNCTIONS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

/**
 * Generate a unique trace ID (OpenTelemetry-compatible format)
 */
function generateTraceId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "trace_";
  for (let i = 0; i < 32; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

/**
 * Utility function to safely extract and validate user ID from authentication
 */
async function getSafeUserId(ctx: any): Promise<Id<"users"> | null> {
  const rawUserId = await getAuthUserId(ctx);
  if (!rawUserId) {
    return null;
  }

  // Handle malformed user IDs with pipe characters
  let userId: Id<"users">;
  if (typeof rawUserId === "string" && rawUserId.includes("|")) {
    const userIdPart = rawUserId.split("|")[0];
    if (!userIdPart || userIdPart.length < 10) {
      return null;
    }
    userId = userIdPart as Id<"users">;
  } else {
    userId = rawUserId;
  }

  return userId;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// SESSION MUTATIONS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

/**
 * Create a new task session
 * Used when starting agent runs, cron jobs, or manual tasks
 */
export const createSession = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    type: v.union(
      v.literal("manual"),
      v.literal("cron"),
      v.literal("scheduled"),
      v.literal("agent"),
      v.literal("swarm"),
    ),
    visibility: v.union(
      v.literal("public"),
      v.literal("private"),
    ),
    cronJobName: v.optional(v.string()),
    agentRunId: v.optional(v.id("agentRuns")),
    agentThreadId: v.optional(v.string()),
    swarmId: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  returns: v.id("agentTaskSessions"),
  handler: async (ctx, args) => {
    const userId = await getSafeUserId(ctx);
    const now = Date.now();

    const sessionId = await ctx.db.insert("agentTaskSessions", {
      title: args.title,
      description: args.description,
      type: args.type,
      visibility: args.visibility,
      userId: userId ?? undefined,
      status: "pending",
      startedAt: now,
      cronJobName: args.cronJobName,
      agentRunId: args.agentRunId,
      agentThreadId: args.agentThreadId,
      swarmId: args.swarmId,
      metadata: args.metadata,
    });

    return sessionId;
  },
});

/**
 * Update session status (for starting, completing, failing)
 */
export const updateSessionStatus = mutation({
  args: {
    sessionId: v.id("agentTaskSessions"),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled"),
    ),
    errorMessage: v.optional(v.string()),
    errorStack: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    const updates: Partial<Doc<"agentTaskSessions">> = {
      status: args.status,
    };

    // Set completion time for terminal states
    if (["completed", "failed", "cancelled"].includes(args.status)) {
      updates.completedAt = Date.now();
      updates.totalDurationMs = Date.now() - session.startedAt;
    }

    if (args.errorMessage) {
      updates.errorMessage = args.errorMessage;
    }
    if (args.errorStack) {
      updates.errorStack = args.errorStack;
    }

    await ctx.db.patch(args.sessionId, updates);
  },
});

/**
 * Update session metrics (aggregated from traces/spans)
 */
export const updateSessionMetrics = mutation({
  args: {
    sessionId: v.id("agentTaskSessions"),
    totalTokens: v.optional(v.number()),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    toolsUsed: v.optional(v.array(v.string())),
    agentsInvolved: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      totalTokens: args.totalTokens,
      inputTokens: args.inputTokens,
      outputTokens: args.outputTokens,
      toolsUsed: args.toolsUsed,
      agentsInvolved: args.agentsInvolved,
    });
  },
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// INTERNAL SESSION MUTATIONS (for cron wrapper and actions)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

/**
 * Start a new task session (internal, for use in actions)
 */
export const startSession = internalMutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    type: v.union(
      v.literal("manual"),
      v.literal("cron"),
      v.literal("scheduled"),
      v.literal("agent"),
      v.literal("swarm"),
    ),
    visibility: v.union(
      v.literal("public"),
      v.literal("private"),
    ),
    cronJobName: v.optional(v.string()),
    agentRunId: v.optional(v.id("agentRuns")),
    agentThreadId: v.optional(v.string()),
    swarmId: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  returns: v.id("agentTaskSessions"),
  handler: async (ctx, args) => {
    const now = Date.now();

    const sessionId = await ctx.db.insert("agentTaskSessions", {
      title: args.title,
      description: args.description,
      type: args.type,
      visibility: args.visibility,
      status: "running",
      startedAt: now,
      cronJobName: args.cronJobName,
      agentRunId: args.agentRunId,
      agentThreadId: args.agentThreadId,
      swarmId: args.swarmId,
      metadata: args.metadata,
    });

    return sessionId;
  },
});

/**
 * Complete a task session successfully (internal, for use in actions)
 */
export const completeSession = internalMutation({
  args: {
    sessionId: v.id("agentTaskSessions"),
    completedAt: v.number(),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    toolsUsed: v.optional(v.array(v.string())),
    agentsInvolved: v.optional(v.array(v.string())),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    const totalTokens = (args.inputTokens ?? 0) + (args.outputTokens ?? 0);
    const totalDurationMs = args.completedAt - session.startedAt;

    await ctx.db.patch(args.sessionId, {
      status: "completed",
      completedAt: args.completedAt,
      totalDurationMs,
      inputTokens: args.inputTokens,
      outputTokens: args.outputTokens,
      totalTokens,
      toolsUsed: args.toolsUsed,
      agentsInvolved: args.agentsInvolved,
      metadata: args.metadata ? { ...session.metadata, ...args.metadata } : undefined,
    });
  },
});

/**
 * Fail a task session (internal, for use in actions)
 */
export const failSession = internalMutation({
  args: {
    sessionId: v.id("agentTaskSessions"),
    completedAt: v.number(),
    errorMessage: v.string(),
    errorStack: v.optional(v.string()),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    toolsUsed: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    const totalTokens = (args.inputTokens ?? 0) + (args.outputTokens ?? 0);
    const totalDurationMs = args.completedAt - session.startedAt;

    await ctx.db.patch(args.sessionId, {
      status: "failed",
      completedAt: args.completedAt,
      totalDurationMs,
      errorMessage: args.errorMessage,
      errorStack: args.errorStack,
      inputTokens: args.inputTokens,
      outputTokens: args.outputTokens,
      totalTokens,
      toolsUsed: args.toolsUsed,
    });
  },
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// TRACE MUTATIONS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

/**
 * Create a new trace within a session
 */
export const createTrace = mutation({
  args: {
    sessionId: v.id("agentTaskSessions"),
    workflowName: v.string(),
    groupId: v.optional(v.string()),
    model: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  returns: v.id("agentTaskTraces"),
  handler: async (ctx, args) => {
    const traceId = generateTraceId();
    const now = Date.now();

    const id = await ctx.db.insert("agentTaskTraces", {
      sessionId: args.sessionId,
      traceId,
      workflowName: args.workflowName,
      groupId: args.groupId,
      status: "running",
      startedAt: now,
      model: args.model,
      metadata: args.metadata,
    });

    return id;
  },
});

/**
 * Complete a trace
 */
export const completeTrace = mutation({
  args: {
    traceId: v.id("agentTaskTraces"),
    status: v.union(v.literal("completed"), v.literal("error")),
    tokenUsage: v.optional(v.object({
      input: v.number(),
      output: v.number(),
      total: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const trace = await ctx.db.get(args.traceId);
    if (!trace) {
      throw new Error("Trace not found");
    }

    const now = Date.now();

    await ctx.db.patch(args.traceId, {
      status: args.status,
      endedAt: now,
      totalDurationMs: now - trace.startedAt,
      tokenUsage: args.tokenUsage,
    });
  },
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// SPAN MUTATIONS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

/**
 * Create a new span within a trace
 */
export const createSpan = mutation({
  args: {
    traceId: v.id("agentTaskTraces"),
    parentSpanId: v.optional(v.id("agentTaskSpans")),
    spanType: v.union(
      v.literal("agent"),
      v.literal("generation"),
      v.literal("tool"),
      v.literal("guardrail"),
      v.literal("handoff"),
      v.literal("retrieval"),
      v.literal("delegation"),
      v.literal("custom"),
    ),
    name: v.string(),
    data: v.optional(v.any()),
    metadata: v.optional(v.any()),
  },
  returns: v.id("agentTaskSpans"),
  handler: async (ctx, args) => {
    // Get the next sequence number for this trace
    const existingSpans = await ctx.db
      .query("agentTaskSpans")
      .withIndex("by_trace", (q) => q.eq("traceId", args.traceId))
      .collect();

    const seq = existingSpans.length;

    // Calculate depth from parent
    let depth = 0;
    if (args.parentSpanId) {
      const parent = await ctx.db.get(args.parentSpanId);
      if (parent) {
        depth = parent.depth + 1;
      }
    }

    const id = await ctx.db.insert("agentTaskSpans", {
      traceId: args.traceId,
      parentSpanId: args.parentSpanId,
      seq,
      depth,
      spanType: args.spanType,
      name: args.name,
      status: "running",
      startedAt: Date.now(),
      data: args.data,
      metadata: args.metadata,
    });

    return id;
  },
});

/**
 * Complete a span
 */
export const completeSpan = mutation({
  args: {
    spanId: v.id("agentTaskSpans"),
    status: v.union(v.literal("completed"), v.literal("error")),
    data: v.optional(v.any()),
    error: v.optional(v.object({
      message: v.string(),
      code: v.optional(v.string()),
      stack: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const span = await ctx.db.get(args.spanId);
    if (!span) {
      throw new Error("Span not found");
    }

    const now = Date.now();

    await ctx.db.patch(args.spanId, {
      status: args.status,
      endedAt: now,
      durationMs: now - span.startedAt,
      data: args.data ?? span.data,
      error: args.error,
    });
  },
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// SEED DATA (for testing)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

/**
 * Seed sample task sessions for testing the Task Manager UI
 */
export const seedSampleData = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getSafeUserId(ctx);
    const now = Date.now();

    const sessions = [
      {
        title: "Research Market Trends",
        description: "Analyzed Q4 2025 market trends for semiconductor industry. Collected data from 15 sources including industry reports, news articles, and financial filings.",
        type: "manual" as const,
        status: "completed" as const,
        visibility: "public" as const,
        startedAt: now - 3600000, // 1 hour ago
        completedAt: now - 3500000,
        totalDurationMs: 100000,
        inputTokens: 15000,
        outputTokens: 8500,
        totalTokens: 23500,
        toolsUsed: ["web_search", "document_analysis", "summary_generator"],
      },
      {
        title: "Cron: Daily Signal Ingestion",
        description: "Automated daily collection of market signals from RSS feeds, news APIs, and social media monitoring. Processed 247 new signals.",
        type: "cron" as const,
        status: "completed" as const,
        visibility: "public" as const,
        cronJobName: "daily-signal-ingestion",
        startedAt: now - 7200000, // 2 hours ago
        completedAt: now - 7100000,
        totalDurationMs: 100000,
        inputTokens: 45000,
        outputTokens: 12000,
        totalTokens: 57000,
        toolsUsed: ["rss_reader", "news_api", "signal_processor"],
      },
      {
        title: "Agent: Competitor Analysis",
        description: "Deep research on competitor product launches and market positioning. Generated comprehensive comparison matrix.",
        type: "agent" as const,
        status: "running" as const,
        visibility: "private" as const,
        startedAt: now - 1800000, // 30 min ago
        inputTokens: 25000,
        outputTokens: 15000,
        totalTokens: 40000,
        toolsUsed: ["web_search", "document_analysis"],
      },
      {
        title: "Swarm: Multi-Entity Research",
        description: "Coordinated research across 5 entities: Apple, Google, Microsoft, Amazon, Meta. Each entity analyzed by dedicated sub-agent.",
        type: "swarm" as const,
        status: "completed" as const,
        visibility: "public" as const,
        startedAt: now - 86400000, // 1 day ago
        completedAt: now - 82800000,
        totalDurationMs: 3600000,
        inputTokens: 120000,
        outputTokens: 65000,
        totalTokens: 185000,
        toolsUsed: ["web_search", "entity_analyzer", "report_generator"],
      },
      {
        title: "Scheduled: Weekly Report",
        description: "Generated weekly summary report of all research activities and key findings.",
        type: "scheduled" as const,
        status: "failed" as const,
        visibility: "public" as const,
        startedAt: now - 172800000, // 2 days ago
        completedAt: now - 172700000,
        totalDurationMs: 100000,
        errorMessage: "API rate limit exceeded. Retry scheduled for next window.",
        inputTokens: 5000,
        outputTokens: 0,
        totalTokens: 5000,
        toolsUsed: ["report_generator"],
      },
    ];

    const createdIds: Id<"agentTaskSessions">[] = [];

    for (const session of sessions) {
      const sessionId = await ctx.db.insert("agentTaskSessions", {
        ...session,
        userId: userId ?? undefined,
      });
      createdIds.push(sessionId);

      // Create a trace for each session
      const traceStatus = session.status === "running" ? "running" as const : session.status === "failed" ? "error" as const : "completed" as const;
      const traceDocId = await ctx.db.insert("agentTaskTraces", {
        sessionId,
        traceId: generateTraceId(),
        workflowName: session.title,
        status: traceStatus,
        startedAt: session.startedAt,
        endedAt: session.completedAt,
        totalDurationMs: session.totalDurationMs,
        tokenUsage: {
          input: session.inputTokens,
          output: session.outputTokens,
          total: session.totalTokens,
        },
      });

      // Create sample spans for completed sessions
      if (session.status === "completed" && session.totalDurationMs) {
        // Root span
        const rootSpanId = await ctx.db.insert("agentTaskSpans", {
          traceId: traceDocId,
          seq: 0,
          depth: 0,
          spanType: "agent",
          name: "Main Execution",
          status: "completed",
          startedAt: session.startedAt,
          endedAt: session.completedAt,
          durationMs: session.totalDurationMs,
          data: {
            inputTokens: Math.floor(session.inputTokens * 0.3),
            outputTokens: Math.floor(session.outputTokens * 0.3),
          },
        });

        // Child spans
        await ctx.db.insert("agentTaskSpans", {
          traceId: traceDocId,
          parentSpanId: rootSpanId,
          seq: 1,
          depth: 1,
          spanType: "tool",
          name: "Web Search",
          status: "completed",
          startedAt: session.startedAt + 1000,
          endedAt: session.startedAt + 30000,
          durationMs: 29000,
          data: { tool: "web_search", query: "market trends 2025" },
        });

        await ctx.db.insert("agentTaskSpans", {
          traceId: traceDocId,
          parentSpanId: rootSpanId,
          seq: 2,
          depth: 1,
          spanType: "generation",
          name: "LLM Generation",
          status: "completed",
          startedAt: session.startedAt + 31000,
          endedAt: session.startedAt + 60000,
          durationMs: 29000,
          data: {
            model: "gpt-5.2",
            temperature: 0.7,
            inputTokens: Math.floor(session.inputTokens * 0.7),
            outputTokens: Math.floor(session.outputTokens * 0.7),
          },
        });
      }
    }

    return { created: createdIds.length, sessionIds: createdIds };
  },
});

/**
 * Seed additional task sessions with varied dates for testing date navigation
 */
export const seedHistoricalData = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getSafeUserId(ctx);
    const now = Date.now();
    const DAY = 86400000;
    const HOUR = 3600000;

    // Generate sessions across the past 7 days
    const historicalSessions = [
      // 3 days ago
      {
        title: "Cron: Morning Market Scan",
        description: "Automated morning scan of pre-market movers and overnight news.",
        type: "cron" as const,
        status: "completed" as const,
        visibility: "public" as const,
        cronJobName: "morning-market-scan",
        startedAt: now - (3 * DAY) - (8 * HOUR),
        completedAt: now - (3 * DAY) - (8 * HOUR) + 45000,
        totalDurationMs: 45000,
        inputTokens: 8000,
        outputTokens: 3500,
        totalTokens: 11500,
        toolsUsed: ["market_api", "news_aggregator"],
      },
      // 4 days ago
      {
        title: "Entity Deep Dive: Tesla",
        description: "Comprehensive analysis of Tesla's Q4 earnings, production numbers, and market sentiment.",
        type: "manual" as const,
        status: "completed" as const,
        visibility: "public" as const,
        startedAt: now - (4 * DAY) - (14 * HOUR),
        completedAt: now - (4 * DAY) - (13 * HOUR),
        totalDurationMs: HOUR,
        inputTokens: 85000,
        outputTokens: 42000,
        totalTokens: 127000,
        toolsUsed: ["web_search", "sec_filings", "sentiment_analyzer", "chart_generator"],
      },
      // 5 days ago
      {
        title: "Scheduled: Weekly Portfolio Review",
        description: "Automated weekly review of portfolio performance and risk metrics.",
        type: "scheduled" as const,
        status: "completed" as const,
        visibility: "public" as const,
        startedAt: now - (5 * DAY) - (10 * HOUR),
        completedAt: now - (5 * DAY) - (9.5 * HOUR),
        totalDurationMs: 30 * 60000,
        inputTokens: 32000,
        outputTokens: 18000,
        totalTokens: 50000,
        toolsUsed: ["portfolio_analyzer", "risk_calculator", "report_generator"],
      },
      // 6 days ago
      {
        title: "Agent: Competitive Intelligence",
        description: "Multi-source competitive intelligence gathering on top 3 competitors.",
        type: "agent" as const,
        status: "completed" as const,
        visibility: "public" as const,
        startedAt: now - (6 * DAY) - (16 * HOUR),
        completedAt: now - (6 * DAY) - (15 * HOUR),
        totalDurationMs: HOUR,
        inputTokens: 95000,
        outputTokens: 55000,
        totalTokens: 150000,
        toolsUsed: ["web_search", "patent_search", "press_release_analyzer"],
      },
      // 7 days ago
      {
        title: "Cron: Daily Signal Ingestion (7d ago)",
        description: "Historical daily signal ingestion from a week ago.",
        type: "cron" as const,
        status: "completed" as const,
        visibility: "public" as const,
        cronJobName: "daily-signal-ingestion",
        startedAt: now - (7 * DAY) - (6 * HOUR),
        completedAt: now - (7 * DAY) - (6 * HOUR) + 120000,
        totalDurationMs: 120000,
        inputTokens: 52000,
        outputTokens: 14000,
        totalTokens: 66000,
        toolsUsed: ["rss_reader", "news_api", "signal_processor"],
      },
      // Today - earlier
      {
        title: "Quick Research: AI Chip Market",
        description: "Brief research on latest developments in AI chip manufacturing.",
        type: "manual" as const,
        status: "completed" as const,
        visibility: "public" as const,
        startedAt: now - (4 * HOUR),
        completedAt: now - (3.5 * HOUR),
        totalDurationMs: 30 * 60000,
        inputTokens: 12000,
        outputTokens: 6000,
        totalTokens: 18000,
        toolsUsed: ["web_search", "summary_generator"],
      },
      // Yesterday
      {
        title: "Cron: Evening Digest",
        description: "End of day market summary and notable events digest.",
        type: "cron" as const,
        status: "completed" as const,
        visibility: "public" as const,
        cronJobName: "evening-digest",
        startedAt: now - DAY - (2 * HOUR),
        completedAt: now - DAY - (2 * HOUR) + 60000,
        totalDurationMs: 60000,
        inputTokens: 18000,
        outputTokens: 8000,
        totalTokens: 26000,
        toolsUsed: ["market_api", "news_aggregator", "digest_formatter"],
      },
    ];

    const createdIds: Id<"agentTaskSessions">[] = [];

    for (const session of historicalSessions) {
      const sessionId = await ctx.db.insert("agentTaskSessions", {
        ...session,
        userId: userId ?? undefined,
      });
      createdIds.push(sessionId);

      // Create a trace for each session
      const traceDocId = await ctx.db.insert("agentTaskTraces", {
        sessionId,
        traceId: generateTraceId(),
        workflowName: session.title,
        status: "completed" as const,
        startedAt: session.startedAt,
        endedAt: session.completedAt,
        totalDurationMs: session.totalDurationMs,
        tokenUsage: {
          input: session.inputTokens,
          output: session.outputTokens,
          total: session.totalTokens,
        },
      });

      // Create root span for each
      await ctx.db.insert("agentTaskSpans", {
        traceId: traceDocId,
        seq: 0,
        depth: 0,
        spanType: "agent",
        name: "Main Execution",
        status: "completed",
        startedAt: session.startedAt,
        endedAt: session.completedAt,
        durationMs: session.totalDurationMs,
        data: {
          inputTokens: session.inputTokens,
          outputTokens: session.outputTokens,
        },
      });
    }

    return { created: createdIds.length, sessionIds: createdIds };
  },
});

