import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";

export const listForUser = query({
  args: {},
  returns: v.array(v.object({
    timelineId: v.id("agentTimelines"),
    documentId: v.id("documents"),
    title: v.string(),
    taskCount: v.number(),
    linkCount: v.number(),
    updatedAt: v.number(),
  })),
  handler: async (ctx) => {
    const userId = (await ctx.auth.getUserIdentity())?.subject as Id<"users"> | undefined;
    if (!userId) return [];
    const timelines = await ctx.db
      .query("agentTimelines")
      .withIndex("by_user", (q) => q.eq("createdBy", userId))
      .collect();
    const out = [] as Array<{ timelineId: Id<"agentTimelines">; documentId: Id<"documents">; title: string; taskCount: number; linkCount: number; updatedAt: number; }>;
    for (const tl of timelines) {
      const [tasks, links, doc] = await Promise.all([
        ctx.db.query("agentTasks").withIndex("by_timeline", (q) => q.eq("timelineId", tl._id)).collect(),
        ctx.db.query("agentLinks").withIndex("by_timeline", (q) => q.eq("timelineId", tl._id)).collect(),
        ctx.db.get((tl as any).documentId as Id<"documents">),
      ]);
      out.push({
        timelineId: tl._id as Id<"agentTimelines">,
        documentId: (tl as any).documentId as Id<"documents">,
        title: (doc as any)?.title ?? (tl as any).name ?? "Timeline",
        taskCount: tasks.length,
        linkCount: links.length,
        updatedAt: (tl as any).updatedAt ?? 0,
      });
    }
    // Sort by updatedAt desc
    out.sort((a, b) => b.updatedAt - a.updatedAt);
    return out as any;
  },
});

export const importSnapshot = mutation({
  args: {
    timelineId: v.id("agentTimelines"),
    tasks: v.array(v.object({
      id: v.string(), // client-provided temp id
      parentId: v.union(v.string(), v.null()),
      name: v.string(),
      startMs: v.number(),
      durationMs: v.number(),
      progress: v.optional(v.number()),
      status: v.optional(v.union(v.literal("pending"), v.literal("running"), v.literal("complete"), v.literal("paused"))),
      agentType: v.optional(v.union(v.literal("orchestrator"), v.literal("main"), v.literal("leaf"))),
    })),
    links: v.array(v.object({
      sourceId: v.string(),
      targetId: v.string(),
      type: v.optional(v.union(v.literal("e2e"), v.literal("s2s"), v.literal("s2e"), v.literal("e2s"))),
    })),
  },
  returns: v.null(),
  handler: async (ctx, { timelineId, tasks, links }) => {
    const userId = (await ctx.auth.getUserIdentity())?.subject as Id<"users"> | undefined;
    if (!userId) throw new Error("Not authenticated");
    const timeline = await ctx.db.get(timelineId);
    if (!timeline) throw new Error("Timeline not found");

    // Delete existing
    const [existingTasks, existingLinks] = await Promise.all([
      ctx.db.query("agentTasks").withIndex("by_timeline", (q) => q.eq("timelineId", timelineId)).collect(),
      ctx.db.query("agentLinks").withIndex("by_timeline", (q) => q.eq("timelineId", timelineId)).collect(),
    ]);
    for (const l of existingLinks) await ctx.db.delete(l._id);
    for (const t of existingTasks) await ctx.db.delete(t._id);

    // Insert tasks in two passes to resolve parent refs
    const idMap = new Map<string, Id<"agentTasks">>();
    const now = Date.now();
    for (const t of tasks) {
      const newId = await ctx.db.insert("agentTasks", {
        timelineId,
        name: t.name,
        startMs: t.startMs,
        durationMs: t.durationMs,
        progress: t.progress,
        status: t.status ?? "pending",
        agentType: t.agentType,
        createdAt: now,
        updatedAt: now,
      } as any);
      idMap.set(t.id, newId as Id<"agentTasks">);
    }
    // Patch parents
    for (const t of tasks) {
      if (t.parentId) {
        const childId = idMap.get(t.id)!;
        const parentDbId = idMap.get(t.parentId);
        if (parentDbId) {
          await ctx.db.patch(childId, { parentId: parentDbId } as any);
        }
      }
    }

    // Insert links
    for (const l of links) {
      const src = idMap.get(l.sourceId);
      const tgt = idMap.get(l.targetId);
      if (src && tgt) {
        await ctx.db.insert("agentLinks", {
          timelineId,
          sourceTaskId: src,
          targetTaskId: tgt,
          type: l.type ?? "e2e",
          createdAt: now,
        } as any);
      }
    }

    await ctx.db.patch(timelineId, { updatedAt: Date.now() } as any);
    return null;
  },
});

// Convenience: apply a plan with baseStartMs and offsets
export const applyPlan = mutation({
  args: {
    timelineId: v.id("agentTimelines"),
    baseStartMs: v.optional(v.number()),
    tasks: v.array(v.object({
      id: v.string(),
      parentId: v.union(v.string(), v.null()),
      name: v.string(),
      startOffsetMs: v.optional(v.number()),
      durationMs: v.number(),
      agentType: v.optional(v.union(v.literal("orchestrator"), v.literal("main"), v.literal("leaf"))),
      status: v.optional(v.union(v.literal("pending"), v.literal("running"), v.literal("complete"), v.literal("paused"))),
    })),
    links: v.array(v.object({ sourceId: v.string(), targetId: v.string(), type: v.optional(v.string()) })),
  },
  returns: v.null(),
  handler: async (ctx, { timelineId, baseStartMs, tasks, links }) => {
    const startBase = baseStartMs ?? Date.now();
    const normalized = tasks.map((t) => ({
      id: t.id,
      parentId: t.parentId,
      name: t.name,
      startMs: (t.startOffsetMs ?? 0) + startBase,
      durationMs: t.durationMs,
      progress: 0,
      status: t.status ?? "pending",
      agentType: t.agentType,
    }));
    await ctx.runMutation(api.agentTimelines.importSnapshot, { timelineId, tasks: normalized as any, links: links as any });
    return null;
  },
});

export const createForDocument = mutation({
  args: {
    documentId: v.id("documents"),
    name: v.string(),
  },
  returns: v.id("agentTimelines"),
  handler: async (ctx, { documentId, name }) => {
    const userId = (await ctx.auth.getUserIdentity())?.subject as Id<"users"> | undefined;
    if (!userId) throw new Error("Not authenticated");

    // Ensure single timeline per document
    const existing = await ctx.db
      .query("agentTimelines")
      .withIndex("by_document", (q) => q.eq("documentId", documentId))
      .unique();
    if (existing) return existing._id as Id<"agentTimelines">;

    const now = Date.now();
    const id = await ctx.db.insert("agentTimelines", {
      documentId,
      name,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    } as any);
    return id as Id<"agentTimelines">;
  },
});

export const addTask = mutation({
  args: {
    timelineId: v.id("agentTimelines"),
    parentId: v.optional(v.id("agentTasks")),
    name: v.string(),
    startMs: v.number(),
    durationMs: v.number(),
    progress: v.optional(v.number()),
    status: v.optional(v.union(v.literal("pending"), v.literal("running"), v.literal("complete"), v.literal("paused"))),
    agentType: v.optional(v.union(v.literal("orchestrator"), v.literal("main"), v.literal("leaf"))),
    assigneeId: v.optional(v.id("users")),
  },
  returns: v.id("agentTasks"),
  handler: async (ctx, args) => {
    const userId = (await ctx.auth.getUserIdentity())?.subject as Id<"users"> | undefined;
    if (!userId) throw new Error("Not authenticated");
    const now = Date.now();
    const id = await ctx.db.insert("agentTasks", {
      timelineId: args.timelineId,
      parentId: args.parentId,
      name: args.name,
      startMs: args.startMs,
      durationMs: args.durationMs,
      progress: args.progress,
      status: args.status ?? "pending",
      agentType: args.agentType,
      assigneeId: args.assigneeId,
      createdAt: now,
      updatedAt: now,
    } as any);
    await ctx.db.patch(args.timelineId, { updatedAt: now } as any);
    return id as Id<"agentTasks">;
  },
});

export const addLink = mutation({
  args: {
    timelineId: v.id("agentTimelines"),
    sourceTaskId: v.id("agentTasks"),
    targetTaskId: v.id("agentTasks"),
    type: v.optional(v.union(v.literal("e2e"), v.literal("s2s"), v.literal("s2e"), v.literal("e2s"))),
  },
  returns: v.id("agentLinks"),
  handler: async (ctx, args) => {
    const userId = (await ctx.auth.getUserIdentity())?.subject as Id<"users"> | undefined;
    if (!userId) throw new Error("Not authenticated");
    const now = Date.now();
    const id = await ctx.db.insert("agentLinks", {
      timelineId: args.timelineId,
      sourceTaskId: args.sourceTaskId,
      targetTaskId: args.targetTaskId,
      type: args.type ?? "e2e",
      createdAt: now,
    } as any);
    await ctx.db.patch(args.timelineId, { updatedAt: now } as any);
    return id as Id<"agentLinks">;
  },
});

export const getByDocumentId = query({
  args: { documentId: v.id("documents") },
  returns: v.union(
    v.null(),
    v.object({
      timelineId: v.id("agentTimelines"),
      name: v.string(),
      tasks: v.array(
        v.object({
          _id: v.id("agentTasks"),
          parentId: v.optional(v.id("agentTasks")),
          name: v.string(),
          startMs: v.number(),
          durationMs: v.number(),
          progress: v.optional(v.number()),
          status: v.optional(v.string()),
          agentType: v.optional(v.string()),
          assigneeId: v.optional(v.id("users")),
        })
      ),
      links: v.array(
        v.object({
          _id: v.id("agentLinks"),
          sourceTaskId: v.id("agentTasks"),
          targetTaskId: v.id("agentTasks"),
          type: v.optional(v.string()),
        })
      ),
    })
  ),
  handler: async (ctx, { documentId }) => {
    const timeline = await ctx.db
      .query("agentTimelines")
      .withIndex("by_document", (q) => q.eq("documentId", documentId))
      .unique();
    if (!timeline) return null;

    const [tasks, links] = await Promise.all([
      ctx.db.query("agentTasks").withIndex("by_timeline", (q) => q.eq("timelineId", timeline._id)).collect(),
      ctx.db.query("agentLinks").withIndex("by_timeline", (q) => q.eq("timelineId", timeline._id)).collect(),
    ]);

    return {
      timelineId: timeline._id as Id<"agentTimelines">,
      name: (timeline as any).name as string,
      tasks: tasks as any,
      links: links as any,
    };
  },
});

