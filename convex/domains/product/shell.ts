import { query } from "../../_generated/server";
import { v } from "convex/values";
import { resolveProductIdentitySafely } from "./helpers";

const EMPTY_SHELL_SNAPSHOT = {
  recentChats: [],
  recentReports: [],
  openNudges: [],
};

export const getWorkspaceRailSnapshot = query({
  args: {
    anonymousSessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await resolveProductIdentitySafely(ctx, args.anonymousSessionId);

    if (!identity.ownerKey) {
      return EMPTY_SHELL_SNAPSHOT;
    }

    try {
      const [recentChats, recentReports, openNudges] = await Promise.all([
        ctx.db
          .query("productChatSessions")
          .withIndex("by_owner_updated", (q) => q.eq("ownerKey", identity.ownerKey!))
          .order("desc")
          .take(4),
        ctx.db
          .query("productReports")
          .withIndex("by_owner_updated", (q) => q.eq("ownerKey", identity.ownerKey!))
          .order("desc")
          .take(4),
        ctx.db
          .query("productNudges")
          .withIndex("by_owner_status_updated", (q) =>
            q.eq("ownerKey", identity.ownerKey!).eq("status", "open"),
          )
          .order("desc")
          .take(3),
      ]);

      return {
        recentChats,
        recentReports,
        openNudges,
      };
    } catch (error) {
      console.error("[product] getWorkspaceRailSnapshot failed", {
        ownerKey: identity.ownerKey,
        error,
      });
      return EMPTY_SHELL_SNAPSHOT;
    }
  },
});
