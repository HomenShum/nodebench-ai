import { v } from "convex/values";
import { query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

interface EpisodicMemoryItem {
  _id: Id<"agentRunEvents">;
  runId: Id<"agentRuns">;
  seq: number;
  kind: string;
  message?: string;
  data?: any;
  createdAt: number;
  tags?: string[];
}

export const getEpisodicByRunId = query({
  args: {
    runId: v.id("agentRuns"),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.any()),
  handler: async (ctx, { runId, limit }) => {
    const maxItems = typeof limit === "number" && limit > 0 ? Math.min(limit, 100) : 50;

    const results = await ctx.db
      .query("agentRunEvents")
      .withIndex("by_run", (q) => q.eq("runId", runId))
      .order("desc")
      .take(maxItems);

    return results.map((item) => normalizeEvent(item));
  },
});

function normalizeEvent(event: any): EpisodicMemoryItem {
  const tags: string[] | undefined = Array.isArray(event.data?.tags)
    ? event.data.tags
    : Array.isArray(event.tags)
    ? event.tags
    : undefined;

  return {
    _id: event._id,
    runId: event.runId,
    seq: typeof event.seq === "number" ? event.seq : Date.now(),
    kind: String(event.kind ?? "unknown"),
    message: typeof event.message === "string" ? event.message : undefined,
    data: event.data,
    createdAt: typeof event.createdAt === "number" ? event.createdAt : Date.now(),
    tags,
  } satisfies EpisodicMemoryItem;
}
