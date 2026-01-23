/**
 * Daily LinkedIn Post - Mutations
 *
 * Non-Node.js mutations for logging LinkedIn posts.
 * Called by the Node.js actions in dailyLinkedInPost.ts.
 */

import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

/**
 * Log a successful LinkedIn post
 */
export const logLinkedInPost = internalMutation({
  args: {
    dateString: v.string(),
    persona: v.string(),
    postId: v.optional(v.string()),
    content: v.string(),
    factCheckCount: v.number(),
  },
  handler: async (ctx, args) => {
    // Store the post log in a simple audit table
    // For now, just log to console
    console.log(`[dailyLinkedInPost] Post logged: ${args.dateString}, persona=${args.persona}, postId=${args.postId}, facts=${args.factCheckCount}`);

    // Optionally update the digestCache to mark as sent to LinkedIn
    const cached = await ctx.db
      .query("digestCache")
      .withIndex("by_date_persona", (q) =>
        q.eq("dateString", args.dateString).eq("persona", args.persona)
      )
      .first();

    if (cached) {
      // We could add sentToLinkedIn field if needed in the future
      // For now, just log the success
    }

    return null;
  },
});
