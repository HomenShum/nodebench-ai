import { v } from "convex/values";
import { internalQuery, query } from "../../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const listMyDogfoodQaRuns = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const limit = Math.min(Math.max(args.limit ?? 10, 1), 50);
    return await ctx.db
      .query("dogfoodQaRuns")
      .withIndex("by_user_createdAt", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit);
  },
});

export const findMyDogfoodQaRunByInputSha256 = internalQuery({
  args: { inputSha256: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    return await ctx.db
      .query("dogfoodQaRuns")
      .withIndex("by_user_inputSha256", (q) => q.eq("userId", userId).eq("inputSha256", args.inputSha256))
      .order("desc")
      .first();
  },
});
