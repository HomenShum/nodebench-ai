// DaaS admin utilities — intended for one-time cleanup / seed operations.
// Guarded: each mutation requires a bounded prefix match to avoid accidental
// wholesale deletes. No auth middleware here (we're running on a private dev
// deployment); harden before exposing publicly.

import { v } from "convex/values";
import { mutation } from "../../_generated/server";

const MAX_DELETE = 50;

/**
 * Delete traces whose sessionId starts with the given prefix.
 * Returns the count deleted. Hard capped at MAX_DELETE per call.
 */
export const deleteTracesByPrefix = mutation({
  args: {
    sessionIdPrefix: v.string(),
  },
  returns: v.number(),
  handler: async (ctx, { sessionIdPrefix }) => {
    if (!sessionIdPrefix || sessionIdPrefix.length < 3) {
      throw new Error("sessionIdPrefix must be at least 3 chars");
    }
    const traces = await ctx.db.query("daasTraces").take(MAX_DELETE * 4);
    let deleted = 0;
    for (const t of traces) {
      if (deleted >= MAX_DELETE) break;
      if (t.sessionId.startsWith(sessionIdPrefix)) {
        await ctx.db.delete(t._id);
        deleted += 1;
      }
    }
    return deleted;
  },
});
