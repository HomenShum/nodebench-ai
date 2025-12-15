/**
 * Daily Brief Domain Memory Mutations
 *
 * Kept out of Node.js runtime modules so we can write to the DB.
 */

import { v } from "convex/values";
import { internalMutation } from "../../_generated/server";

export const createMemory = internalMutation({
  args: {
    snapshotId: v.id("dailyBriefSnapshots"),
    dateString: v.string(),
    generatedAt: v.number(),
    version: v.number(),
    goal: v.string(),
    features: v.array(v.any()),
    context: v.any(),
    progressLog: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const memoryId = await ctx.db.insert("dailyBriefMemories", {
      snapshotId: args.snapshotId,
      dateString: args.dateString,
      generatedAt: args.generatedAt,
      version: args.version,
      goal: args.goal,
      features: args.features,
      progressLog: args.progressLog,
      context: args.context,
      createdAt: now,
      updatedAt: now,
    });
    return memoryId;
  },
});

export const insertTaskResult = internalMutation({
  args: {
    memoryId: v.id("dailyBriefMemories"),
    taskId: v.string(),
    resultMarkdown: v.string(),
    citations: v.optional(v.any()),
    artifacts: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const resultId = await ctx.db.insert("dailyBriefTaskResults", {
      memoryId: args.memoryId,
      taskId: args.taskId,
      resultMarkdown: args.resultMarkdown,
      citations: args.citations,
      artifacts: args.artifacts,
      createdAt: Date.now(),
    });
    return resultId;
  },
});

export const updateTaskStatus = internalMutation({
  args: {
    memoryId: v.id("dailyBriefMemories"),
    taskId: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("failing"),
      v.literal("passing"),
    ),
    notes: v.optional(v.string()),
    resultId: v.optional(v.id("dailyBriefTaskResults")),
    logMessage: v.string(),
    logStatus: v.optional(v.union(
      v.literal("info"),
      v.literal("pending"),
      v.literal("working"),
      v.literal("passing"),
      v.literal("failing"),
      v.literal("error"),
    )),
    meta: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const memory = await ctx.db.get(args.memoryId);
    if (!memory) throw new Error("Memory not found");

    const now = Date.now();

    const features = (memory.features as any[]).map((f) =>
      f.id === args.taskId
        ? {
            ...f,
            status: args.status,
            notes: args.notes ?? f.notes,
            resultId: args.resultId ?? f.resultId,
            updatedAt: now,
          }
        : f,
    );

    const progressLog = [
      ...(memory.progressLog as any[]),
      {
        ts: now,
        status:
          args.logStatus ??
          (args.status === "passing"
            ? "passing"
            : args.status === "failing"
              ? "failing"
              : "info"),
        message: args.logMessage,
        meta: args.meta,
      },
    ];

    await ctx.db.patch(memory._id, {
      features,
      progressLog,
      updatedAt: now,
    });
  },
});

export const setExecutiveBrief = internalMutation({
  args: {
    memoryId: v.id("dailyBriefMemories"),
    payload: v.any(),
    generatedAt: v.number(),
    validation: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const memory = await ctx.db.get(args.memoryId);
    if (!memory) throw new Error("Memory not found");

    const now = Date.now();
    const context = (memory.context ?? {}) as any;

    await ctx.db.patch(memory._id, {
      context: {
        ...context,
        executiveBrief: args.payload,
        executiveBriefGeneratedAt: args.generatedAt,
        executiveBriefValidation: args.validation,
      },
      updatedAt: now,
    });
  },
});

export const updateMemoryContext = internalMutation({
  args: {
    memoryId: v.id("dailyBriefMemories"),
    contextPatch: v.any(),
  },
  handler: async (ctx, args) => {
    const memory = await ctx.db.get(args.memoryId);
    if (!memory) throw new Error("Memory not found");

    const now = Date.now();
    const context = (memory.context ?? {}) as any;

    await ctx.db.patch(memory._id, {
      context: {
        ...context,
        ...args.contextPatch,
      },
      updatedAt: now,
    });
  },
});
