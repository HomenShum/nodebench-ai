import { v } from "convex/values";
import { mutation, query } from "../../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Get scratchpad by agentThreadId (for boot-up)
 */
export const getByAgentThread = query({
  args: { agentThreadId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const existing = await ctx.db
      .query("agentScratchpads")
      .withIndex("by_agent_thread", (q) => q.eq("agentThreadId", args.agentThreadId))
      .first();

    if (!existing || existing.userId !== userId) return null;
    return existing;
  },
});

/**
 * Upsert scratchpad for a thread
 */
export const saveScratchpad = mutation({
  args: {
    agentThreadId: v.string(),
    scratchpad: v.any(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const now = Date.now();
    const existing = await ctx.db
      .query("agentScratchpads")
      .withIndex("by_agent_thread", (q) => q.eq("agentThreadId", args.agentThreadId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        scratchpad: args.scratchpad,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("agentScratchpads", {
      agentThreadId: args.agentThreadId,
      userId,
      scratchpad: args.scratchpad,
      createdAt: now,
      updatedAt: now,
    });
  },
});
