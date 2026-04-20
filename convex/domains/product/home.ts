import { query } from "../../_generated/server";
import { v } from "convex/values";
import { resolveProductReadOwnerKeys } from "./helpers";

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
    const ownerKeys = await resolveProductReadOwnerKeys(ctx, args.anonymousSessionId);
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

    if (ownerKeys.length === 0) {
      return {
        evidenceCards: EMPTY_HOME_SNAPSHOT.evidenceCards,
        recentReports: EMPTY_HOME_SNAPSHOT.recentReports,
        publicCards,
      };
    }

    try {
      const [evidenceGroups, reportGroups] = await Promise.all([
        Promise.all(
          ownerKeys.map((ownerKey) =>
            ctx.db
              .query("productEvidenceItems")
              .withIndex("by_owner_updated", (q) => q.eq("ownerKey", ownerKey))
              .order("desc")
              .take(6),
          ),
        ),
        Promise.all(
          ownerKeys.map((ownerKey) =>
            ctx.db
              .query("productReports")
              .withIndex("by_owner_updated", (q) => q.eq("ownerKey", ownerKey))
              .order("desc")
              .take(3),
          ),
        ),
      ]);

      const evidenceCards = evidenceGroups
        .flat()
        .sort((left, right) => right.updatedAt - left.updatedAt)
        .reduce<Array<(typeof evidenceGroups)[number][number]>>((acc, evidence) => {
          if (acc.some((existing) => existing._id === evidence._id)) return acc;
          acc.push(evidence);
          return acc;
        }, [])
        .slice(0, 6);

      const recentReports = reportGroups
        .flat()
        .sort((left, right) => right.updatedAt - left.updatedAt)
        .reduce<Array<(typeof reportGroups)[number][number]>>((acc, report) => {
          if (acc.some((existing) => existing._id === report._id)) return acc;
          acc.push(report);
          return acc;
        }, [])
        .slice(0, 3);

      return {
        evidenceCards,
        recentReports,
        publicCards,
      };
    } catch (error) {
      console.error("[product] getHomeSnapshot owner data failed", {
        ownerKeys,
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
