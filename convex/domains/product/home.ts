import { query } from "../../_generated/server";
import { v } from "convex/values";
import { resolveProductIdentitySafely } from "./helpers";

const EMPTY_HOME_SNAPSHOT = {
  evidenceCards: [],
  recentReports: [],
  publicCards: [],
};

export const getHomeSnapshot = query({
  args: {
    anonymousSessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await resolveProductIdentitySafely(ctx, args.anonymousSessionId);
    let publicCards: any[] = [];
    try {
      publicCards = await ctx.db
        .query("productPublicCards")
        .withIndex("by_visibility_rank", (q) => q.eq("visibility", "public"))
        .order("asc")
        .take(6);
    } catch (error) {
      console.error("[product] getHomeSnapshot publicCards failed", error);
    }

    if (!identity.ownerKey) {
      return {
        evidenceCards: EMPTY_HOME_SNAPSHOT.evidenceCards,
        recentReports: EMPTY_HOME_SNAPSHOT.recentReports,
        publicCards,
      };
    }

    try {
      const [evidenceCards, recentReports] = await Promise.all([
        ctx.db
          .query("productEvidenceItems")
          .withIndex("by_owner_updated", (q) => q.eq("ownerKey", identity.ownerKey!))
          .order("desc")
          .take(6),
        ctx.db
          .query("productReports")
          .withIndex("by_owner_updated", (q) => q.eq("ownerKey", identity.ownerKey!))
          .order("desc")
          .take(3),
      ]);

      return {
        evidenceCards,
        recentReports,
        publicCards,
      };
    } catch (error) {
      console.error("[product] getHomeSnapshot owner data failed", {
        ownerKey: identity.ownerKey,
        error,
      });
      return {
        evidenceCards: EMPTY_HOME_SNAPSHOT.evidenceCards,
        recentReports: EMPTY_HOME_SNAPSHOT.recentReports,
        publicCards,
      };
    }
  },
});
