"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { productionMocks, type RunMock, type TaskMock } from "../../agents/data/productionMocks";

const apiAny = api as any;

/**
 * Map AgentKind to Convex agentType
 */
function mapAgentKind(kind: string): "orchestrator" | "main" | "leaf" {
  if (kind === "orchestrator") return "orchestrator";
  if (kind === "main") return "main";
  return "leaf"; // web_researcher, content_generator, validator, code_executor, reviewer, synthesizer → leaf
}

/**
 * Map TaskState to Convex status
 */
function mapTaskState(state: string): "pending" | "running" | "complete" | "paused" | "error" {
  if (state === "ok") return "complete";
  if (state === "failed") return "error";
  if (state === "running") return "running";
  if (state === "pending") return "pending";
  if (state === "skipped") return "paused";
  return "pending";
}

/**
 * Seed a single production mock into Convex
 */
export const seedMock = action({
  args: {
    documentId: v.id("documents"),
    mockId: v.string(), // timelineId from productionMocks
  },
  returns: v.object({ timelineId: v.id("agentTimelines"), taskCount: v.number() }),
  handler: async (ctx, { documentId, mockId }) => {
    const mock = productionMocks.find(m => m.timelineId === mockId);
    if (!mock) throw new Error(`Mock not found: ${mockId}`);

    // Create timeline
    const timelineId: Id<"agentTimelines"> = await ctx.runMutation(apiAny.agentTimelines.createForDocument, {
      documentId,
      name: mock.label,
    });

    const now = Date.now();
    const baseStartMs = mock.baseStartMs || now;

    // Map tasks
    const tasks: any[] = mock.tasks.map((t: TaskMock) => ({
      id: t.id,
      parentId: t.parentId || null,
      name: t.title,
      startOffsetMs: t.startOffsetMs,
      durationMs: t.durationMs,
      agentType: mapAgentKind(t.agentKind),
      status: mapTaskState(t.state),
      description: t.artifacts ? JSON.stringify(t.artifacts) : undefined,
      inputTokens: t.metrics?.tokensIn,
      outputTokens: t.metrics?.tokensOut,
      elapsedMs: t.metrics?.latencyMs || t.durationMs,
      retryOffsetsMs: t.retryOffsetsMs,
      failureOffsetMs: t.failureOffsetMs,
      icon: getIconForAgentKind(t.agentKind),
      color: getColorForAgentKind(t.agentKind),
    }));

    // Map links
    const links: any[] = mock.links.map(l => ({
      sourceId: l.from,
      targetId: l.to,
    }));

    // Apply to Convex
    await ctx.runMutation(apiAny.agentTimelines.applyPlan, {
      timelineId,
      baseStartMs,
      tasks,
      links,
    });

    // Update task metrics with additional fields
    const tl = await ctx.runQuery(apiAny.agentTimelines.getByTimelineId, { timelineId });
    if (tl) {
      const taskMap = new Map<string, any>();
      for (const t of tl.tasks) {
        if (t.id) taskMap.set(t.id, t);
      }

      for (const mockTask of mock.tasks) {
        const convexTask = taskMap.get(mockTask.id);
        if (!convexTask?._id) continue;

        await ctx.runMutation(apiAny.agentTimelines.updateTaskMetrics, {
          taskId: convexTask._id,
          status: mapTaskState(mockTask.state),
          startedAtMs: baseStartMs + mockTask.startOffsetMs,
          elapsedMs: mockTask.metrics?.latencyMs || mockTask.durationMs,
          inputTokens: mockTask.metrics?.tokensIn,
          outputTokens: mockTask.metrics?.tokensOut,
          retryOffsetsMs: mockTask.retryOffsetsMs,
          failureOffsetMs: mockTask.failureOffsetMs,
        } as any);
      }
    }

    return { timelineId, taskCount: tasks.length };
  },
});

/**
 * Seed all production mocks into separate timelines
 */
export const seedAllMocks = action({
  args: {
    documentId: v.id("documents"),
  },
  returns: v.array(v.object({ timelineId: v.id("agentTimelines"), label: v.string(), taskCount: v.number() })),
  handler: async (ctx, { documentId }) => {
    const results: any[] = [];

    for (const mock of productionMocks) {
      const { timelineId, taskCount } = await ctx.runAction(apiAny.agents.seedProductionMocks.seedMock, {
        documentId,
        mockId: mock.timelineId,
      });
      results.push({ timelineId, label: mock.label, taskCount });
    }

    return results;
  },
});

/**
 * List all available production mocks
 */
export const listMocks = action({
  args: {},
  returns: v.array(v.object({
    timelineId: v.string(),
    label: v.string(),
    goal: v.string(),
    mode: v.string(),
    coordination: v.string(),
    taskCount: v.number(),
  })),
  handler: async (_ctx, _args) => {
    return productionMocks.map(m => ({
      timelineId: m.timelineId,
      label: m.label,
      goal: m.goal,
      mode: m.mode,
      coordination: m.coordination,
      taskCount: m.tasks.length,
    }));
  },
});

/**
 * Get icon for agent kind
 */
function getIconForAgentKind(kind: string): string {
  const icons: Record<string, string> = {
    orchestrator: "🧠",
    main: "🎯",
    web_researcher: "🔍",
    content_generator: "✍️",
    validator: "✅",
    code_executor: "⚙️",
    reviewer: "👁️",
    synthesizer: "🔄",
  };
  return icons[kind] || "🤖";
}

/**
 * Get color for agent kind
 */
function getColorForAgentKind(kind: string): string {
  const colors: Record<string, string> = {
    orchestrator: "#6366F1",
    main: "#10B981",
    web_researcher: "#F59E0B",
    content_generator: "#8B5CF6",
    validator: "#06B6D4",
    code_executor: "#EF4444",
    reviewer: "#EC4899",
    synthesizer: "#14B8A6",
  };
  return colors[kind] || "#6B7280";
}

