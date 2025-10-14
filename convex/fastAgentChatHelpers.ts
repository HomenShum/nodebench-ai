import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

// Move all non-Node functions here (file intentionally does NOT have "use node")

export const updateRunStatus = internalMutation({
  args: {
    runId: v.id("agentRuns"),
    status: v.union(
      v.literal("running"),
      v.literal("completed"),
      v.literal("error")
    ),
    finalResponse: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const update: any = {
      status: args.status,
      updatedAt: Date.now(),
    };
    if (args.finalResponse !== undefined) update.finalResponse = args.finalResponse;
    if (args.errorMessage !== undefined) update.errorMessage = args.errorMessage;

    await ctx.db.patch(args.runId, update);
    return null;
  },
});

export const getMessagesByRun = internalQuery({
  args: { runId: v.id("agentRuns") },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("chatMessages")
      .withIndex("by_run", (q) => q.eq("runId", args.runId))
      .collect();
  },
});

export const updateMessageContent = internalMutation({
  args: {
    messageId: v.id("chatMessages"),
    content: v.string(),
    status: v.optional(v.union(v.literal("complete"), v.literal("error"))),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const nextStatus = args.status ?? "complete";
    await ctx.db.patch(args.messageId, {
      content: args.content,
      status: nextStatus as "complete" | "error",
      updatedAt: Date.now(),
    });
    return null;
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
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run) {
      throw new Error("Agent run not found");
    }

    const seq = (run.nextSeq || 0) + 1;

    await ctx.db.insert("agentRunEvents", {
      runId: args.runId,
      seq,
      kind: args.kind,
      message: args.message,
      data: args.data,
      createdAt: Date.now(),
    });

    await ctx.db.patch(args.runId, { nextSeq: seq });

    return { seq };
  },
});

