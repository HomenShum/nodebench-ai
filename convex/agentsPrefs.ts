import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

async function getSafeUserId(ctx: any): Promise<Id<"users"> | null> {
  const rawUserId = await getAuthUserId(ctx);
  if (!rawUserId) return null;
  let userId: Id<"users">;
  if (typeof rawUserId === "string" && rawUserId.includes("|")) {
    const userIdPart = rawUserId.split("|")[0];
    if (!userIdPart || userIdPart.length < 10) return null;
    userId = userIdPart as Id<"users">;
  } else {
    userId = rawUserId as Id<"users">;
  }
  const user = await ctx.db.get(userId);
  if (!user) return null;
  return userId;
}

export const getAgentsPrefs = query({
  args: {},
  returns: v.record(v.string(), v.string()),
  handler: async (ctx) => {
    const userId = await getSafeUserId(ctx);
    if (!userId) return {} as Record<string, string>;
    const preferences = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    return (preferences?.agentsPrefs as Record<string, string> | undefined) ?? {};
  },
});

export const setAgentsPrefs = mutation({
  args: { prefs: v.record(v.string(), v.string()) },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, { prefs }) => {
    const userId = await getSafeUserId(ctx);
    if (!userId) throw new Error("Not authenticated. Please sign out and sign back in.");
    const now = Date.now();
    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (existing) {
      const merged = { ...(existing.agentsPrefs || {}), ...prefs } as Record<string, string>;
      await ctx.db.patch(existing._id, { agentsPrefs: merged, updatedAt: now });
    } else {
      await ctx.db.insert("userPreferences", {
        userId,
        agentsPrefs: prefs as Record<string, string>,
        createdAt: now,
        updatedAt: now,
      } as any);
    }
    return { success: true } as const;
  },
});

