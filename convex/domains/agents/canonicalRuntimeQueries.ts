import { v } from "convex/values";
import { query } from "../../_generated/server";

/**
 * Canonical Runtime Queries — Fast lane cache hydration
 *
 * These queries power the on-the-go fast path: read the best available
 * cached state for an entity so the planner can answer immediately.
 */

export const getEntityFastLaneCache = query({
  args: {
    ownerKey: v.string(),
    entitySlug: v.string(),
  },
  handler: async (ctx, args) => {
    const entity = await ctx.db
      .query("productEntities")
      .withIndex("by_owner_slug", (q) =>
        q.eq("ownerKey", args.ownerKey).eq("slug", args.entitySlug),
      )
      .unique();

    if (!entity) return null;

    // Latest accepted blocks (user + agent)
    const blocks = await ctx.db
      .query("productBlocks")
      .withIndex("by_owner_entity_position", (q) =>
        q.eq("ownerKey", entity.ownerKey).eq("entityId", entity._id),
      )
      .order("asc")
      .take(100);

    const acceptedBlocks = blocks
      .filter((b) => !b.deletedAt && b.parentBlockId === undefined)
      .slice(0, 50)
      .map((b) => ({
        id: b._id,
        kind: b.kind,
        authorKind: b.authorKind,
        text: b.content.map((c) => c.value).join(""),
        updatedAt: b.updatedAt,
      }));

    // Latest projections (structured agent output)
    const projections = await ctx.db
      .query("diligenceProjections")
      .withIndex("by_entity", (q) => q.eq("entitySlug", args.entitySlug))
      .order("desc")
      .take(20);

    const latestProjections = projections.map((p) => ({
      id: p._id,
      blockType: p.blockType,
      title: p.headerText,
      summary: p.bodyProse,
      overallTier: p.overallTier,
      updatedAt: p.updatedAt,
    }));

    // Latest pulse report
    const latestPulse = await ctx.db
      .query("pulseReports")
      .withIndex("by_entity_date", (q) => q.eq("entitySlug", args.entitySlug))
      .order("desc")
      .take(1);

    // Entity memory index
    const memory = await ctx.db
      .query("entityMemoryIndex")
      .withIndex("by_entity", (q) => q.eq("entitySlug", args.entitySlug))
      .unique();

    // Latest run status
    const latestRun = await ctx.db
      .query("extendedThinkingRuns")
      .withIndex("by_entity", (q) => q.eq("entitySlug", args.entitySlug))
      .order("desc")
      .take(1);

    return {
      entity: {
        id: entity._id,
        slug: entity.slug,
        name: entity.name,
        entityType: entity.entityType,
        summary: entity.summary,
        latestReportId: entity.latestReportId,
        updatedAt: entity.updatedAt,
      },
      acceptedBlocks,
      latestProjections,
      latestPulse: latestPulse[0] ?? null,
      memory: memory
        ? {
            indexJson: memory.indexJson,
            topicCount: memory.topicCount,
            totalFactCount: memory.totalFactCount,
            lastRebuildAt: memory.lastRebuildAt,
          }
        : null,
      latestRun: latestRun[0]
        ? {
            runId: latestRun[0]._id,
            goal: latestRun[0].goal,
            status: latestRun[0].status,
            startedAt: latestRun[0].startedAt,
          }
        : null,
    };
  },
});

export const getThreadMessages = query({
  args: {
    threadId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("agentMessages")
      .withIndex("by_thread_time", (q) => q.eq("threadId", args.threadId))
      .order("desc")
      .take(args.limit ?? 50);
    return messages.reverse();
  },
});

export const getRunWithScratchpad = query({
  args: {
    runId: v.id("extendedThinkingRuns"),
  },
  handler: async (ctx, args) => {
    const run = await ctx.db
      .query("extendedThinkingRuns")
      .withIndex("by_status", (q) => q.eq("status", "running"))
      .filter((q) => q.eq(q.field("_id"), args.runId))
      .unique();

    if (!run) return null;

    // Scratchpads don't have a runId field; we look up by entitySlug + status
    const scratchpads = await ctx.db
      .query("agentScratchpads")
      .withIndex("by_entity", (q) => q.eq("entitySlug", run.entitySlug))
      .order("desc")
      .take(5);

    const scratchpad =
      scratchpads.find(
        (s) => s.status === "streaming" || s.status === "structuring",
      ) ?? null;

    const checkpoints = await ctx.db
      .query("extendedThinkingCheckpoints")
      .withIndex("by_run", (q) => q.eq("runId", args.runId))
      .order("asc")
      .take(100);

    return { run, scratchpad, checkpoints };
  },
});

export const getEntityNotebookPage = query({
  args: {
    entitySlug: v.string(),
    pageType: v.union(v.literal("entity"), v.literal("pulse")),
    dateKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let page;
    if (args.dateKey) {
      page = await ctx.db
        .query("productNotebookPages")
        .withIndex("by_entity_date", (q) =>
          q.eq("entitySlug", args.entitySlug).eq("dateKey", args.dateKey),
        )
        .unique();
    } else {
      page = await ctx.db
        .query("productNotebookPages")
        .withIndex("by_entity_type", (q) =>
          q.eq("entitySlug", args.entitySlug).eq("pageType", args.pageType),
        )
        .unique();
    }
    return page ?? null;
  },
});
