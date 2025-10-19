import { v } from "convex/values";
import { internalMutation, query } from "../_generated/server";
import { ensureUserId } from "./common";

export const startAgentRun = internalMutation({
  args: {
    threadId: v.optional(v.string()),
    documentId: v.optional(v.id("documents")),
    mcpServerId: v.optional(v.id("mcpServers")),
    model: v.optional(v.string()),
    openaiVariant: v.optional(v.string()),
  },
  returns: v.id("agentRuns"),
  handler: async (ctx, { threadId, documentId, mcpServerId, model, openaiVariant }) => {
    const userId = await ensureUserId(ctx);
    const now = Date.now();
    const runId = await ctx.db.insert("agentRuns", {
      userId,
      threadId,
      documentId,
      mcpServerId,
      model,
      openaiVariant,
      status: "running",
      nextSeq: 1,
      createdAt: now,
      updatedAt: now,
    });
    return runId;
  },
});

export const appendRunEvent = internalMutation({
  args: {
    runId: v.id("agentRuns"),
    kind: v.string(),
    message: v.optional(v.string()),
    data: v.optional(v.any()),
  },
  returns: v.object({ seq: v.number() }),
  handler: async (ctx, { runId, kind, message, data }) => {
    const now = Date.now();
    const seq = now;
    await ctx.db.insert("agentRunEvents", { runId, seq, kind, message, data, createdAt: now });
    return { seq };
  },
});

export const updateAgentRun = internalMutation({
  args: { runId: v.id("agentRuns"), fields: v.any() },
  returns: v.null(),
  handler: async (ctx, { runId, fields }) => {
    await ctx.db.patch(runId, { ...fields, updatedAt: Date.now() });
    return null;
  },
});

export const getAgentRun = query({
  args: { runId: v.id("agentRuns") },
  returns: v.any(),
  handler: async (ctx, { runId }) => {
    return await ctx.db.get(runId);
  },
});

export const listAgentRunEvents = query({
  args: { runId: v.id("agentRuns") },
  returns: v.array(v.any()),
  handler: async (ctx, { runId }) => {
    return await ctx.db
      .query("agentRunEvents")
      .withIndex("by_run", (q) => q.eq("runId", runId))
      .collect();
  },
});

export const latestAgentRunForThread = query({
  args: { threadId: v.string() },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, { threadId }) => {
    const userId = await ensureUserId(ctx);
    const rows = await ctx.db
      .query("agentRuns")
      .withIndex("by_thread", (q) => q.eq("threadId", threadId))
      .order("desc")
      .take(1);
    const run = rows[0] || null;
    if (!run) return null;
    if (run.userId !== userId) return null;
    return run;
  },
});

export const latestAgentRunForUser = query({
  args: {},
  returns: v.union(v.any(), v.null()),
  handler: async (ctx) => {
    const userId = await ensureUserId(ctx);
    const rows = await ctx.db
      .query("agentRuns")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(1);
    return rows[0] || null;
  },
});
