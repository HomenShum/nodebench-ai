import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

const MESSAGE_ROLE = v.union(
  v.literal("user"),
  v.literal("assistant"),
  v.literal("system")
);

const MESSAGE_STATUS = v.union(
  v.literal("sending"),
  v.literal("streaming"),
  v.literal("complete"),
  v.literal("error")
);

const RUN_STATUS = v.union(
  v.literal("pending"),
  v.literal("running"),
  v.literal("completed"),
  v.literal("error")
);

export const insertChatMessage = internalMutation({
  args: {
    threadId: v.id("chatThreads"),
    role: MESSAGE_ROLE,
    content: v.string(),
    status: MESSAGE_STATUS,
    runId: v.optional(v.id("agentRuns")),
    model: v.optional(v.string()),
    fastMode: v.optional(v.boolean()),
    tokensUsed: v.optional(
      v.object({
        input: v.number(),
        output: v.number(),
      })
    ),
    elapsedMs: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  },
  returns: v.id("chatMessages"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("chatMessages", args);
  },
});

export const insertAgentRun = internalMutation({
  args: {
    userId: v.id("users"),
    threadId: v.optional(v.string()),
    documentId: v.optional(v.id("documents")),
    mcpServerId: v.optional(v.id("mcpServers")),
    model: v.optional(v.string()),
    openaiVariant: v.optional(v.string()),
    status: RUN_STATUS,
    intent: v.optional(v.string()),
    planExplain: v.optional(v.string()),
    plan: v.optional(v.any()),
    finalResponse: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    nextSeq: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  },
  returns: v.id("agentRuns"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("agentRuns", args);
  },
});

export const touchThread = internalMutation({
  args: {
    threadId: v.id("chatThreads"),
    updatedAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, { threadId, updatedAt }) => {
    await ctx.db.patch(threadId, { updatedAt });
    return null;
  },
});
