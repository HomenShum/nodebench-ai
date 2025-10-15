// convex/tools/evaluation/helpers.ts
// Helper queries for evaluation tests (cannot be in Node.js files)

import { internalQuery } from "../../_generated/server";
import { v } from "convex/values";

/**
 * Get the first user in the database (for testing)
 */
export const getTestUser = internalQuery({
  args: {},
  returns: v.union(v.id("users"), v.null()),
  handler: async (ctx) => {
    const user = await ctx.db.query("users").first();
    return user?._id || null;
  },
});

