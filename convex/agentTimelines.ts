import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

// Normalize/validate Convex user id from auth, consistent with other modules
async function getSafeUserId(ctx: any): Promise<Id<"users">> {
  const rawUserId = await getAuthUserId(ctx);
  if (!rawUserId) throw new Error("Not authenticated");
  let userId: Id<"users">;
  if (typeof rawUserId === "string" && rawUserId.includes("|")) {
    const first = rawUserId.split("|")[0];
    if (!first || first.length < 10) throw new Error("Invalid user ID format. Please sign out and sign back in.");
    userId = first as Id<"users">;
  } else {
    userId = rawUserId as Id<"users">;
  }
  const user = await ctx.db.get(userId);
  if (!user) throw new Error("User not found. Please sign out and sign back in.");
  return userId;
}

async function getOptionalUserId(ctx: any): Promise<Id<"users"> | null> {
  const rawUserId = await getAuthUserId(ctx);
  if (!rawUserId) return null;
  let userId: Id<"users"> | null = null;
  if (typeof rawUserId === "string" && rawUserId.includes("|")) {
    const first = rawUserId.split("|")[0];
    if (!first || first.length < 10) return null;
    userId = first as Id<"users">;
  } else {
    userId = rawUserId as Id<"users">;
  }
  const user = userId ? await ctx.db.get(userId) : null;
  if (!user) return null;
  return userId;
}


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
    const userId = await getOptionalUserId(ctx);
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
      // Accept either absolute or offset; we'll normalize to offset on write
      startMs: v.optional(v.number()),
      startOffsetMs: v.optional(v.number()),
      durationMs: v.number(),
      progress: v.optional(v.number()),
      status: v.optional(v.union(v.literal("pending"), v.literal("running"), v.literal("complete"), v.literal("paused"), v.literal("error"))),
      agentType: v.optional(v.union(v.literal("orchestrator"), v.literal("main"), v.literal("leaf"))),
      // Optional visual + metrics
      icon: v.optional(v.string()),
      color: v.optional(v.string()),
      sequence: v.optional(v.union(v.literal("parallel"), v.literal("sequential"))),
      description: v.optional(v.string()),
      inputTokens: v.optional(v.number()),
      outputTokens: v.optional(v.number()),
      outputSizeBytes: v.optional(v.number()),
      elapsedMs: v.optional(v.number()),
      startedAtMs: v.optional(v.number()),
      // New: phase boundaries and retry/error markers
      phaseBoundariesMs: v.optional(v.array(v.number())),
      retryOffsetsMs: v.optional(v.array(v.number())),
      failureOffsetMs: v.optional(v.number()),
    })),
    links: v.array(v.object({
      sourceId: v.string(),
      targetId: v.string(),
      type: v.optional(v.union(v.literal("e2e"), v.literal("s2s"), v.literal("s2e"), v.literal("e2s"))),
    })),
  },
  returns: v.null(),
  handler: async (ctx, { timelineId, tasks, links }) => {
    const userId = await getSafeUserId(ctx);
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

    // Determine baseStartMs and normalize to offsets
    const existingBase: number | undefined = (timeline as any).baseStartMs;
    let baseStartMs = typeof existingBase === "number" ? existingBase : undefined;
    if (baseStartMs === undefined) {
      const starts = tasks
        .map((t) => (typeof t.startMs === "number" ? t.startMs : undefined))
        .filter((n): n is number => typeof n === "number");
      baseStartMs = starts.length ? Math.min(...starts) : Date.now();
      await ctx.db.patch(timelineId, { baseStartMs } as any);
    }

    // Insert tasks in two passes to resolve parent refs
    const idMap = new Map<string, Id<"agentTasks">>();
    const now = Date.now();
    for (const t of tasks) {
      const offset = typeof t.startOffsetMs === "number"
        ? t.startOffsetMs
        : typeof t.startMs === "number"
          ? Math.max(0, t.startMs - (baseStartMs as number))
          : 0;
      const newId = await ctx.db.insert("agentTasks", {
        timelineId,
        name: t.name,
        startOffsetMs: offset,
        durationMs: t.durationMs,
        progress: t.progress,
        status: t.status ?? "pending",
        agentType: t.agentType,
        icon: t.icon,
        color: t.color,
        sequence: t.sequence,
        description: t.description,
        inputTokens: t.inputTokens,
        outputTokens: t.outputTokens,
        outputSizeBytes: t.outputSizeBytes,
        elapsedMs: t.elapsedMs,
        startedAtMs: (t as any).startedAtMs,
        phaseBoundariesMs: (t as any).phaseBoundariesMs,
        retryOffsetsMs: (t as any).retryOffsetsMs,
        failureOffsetMs: (t as any).failureOffsetMs,
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
      status: v.optional(v.union(v.literal("pending"), v.literal("running"), v.literal("complete"), v.literal("paused"), v.literal("error"))),
      icon: v.optional(v.string()),
      color: v.optional(v.string()),
      sequence: v.optional(v.union(v.literal("parallel"), v.literal("sequential"))),
      description: v.optional(v.string()),
      inputTokens: v.optional(v.number()),
      outputTokens: v.optional(v.number()),
      outputSizeBytes: v.optional(v.number()),
      elapsedMs: v.optional(v.number()),
      phaseBoundariesMs: v.optional(v.array(v.number())),
      retryOffsetsMs: v.optional(v.array(v.number())),
      failureOffsetMs: v.optional(v.number()),
    })),
    links: v.array(v.object({ sourceId: v.string(), targetId: v.string(), type: v.optional(v.string()) })),
  },
  returns: v.null(),
  handler: async (ctx, { timelineId, baseStartMs, tasks, links }) => {
    const startBase = baseStartMs ?? Date.now();
    // Ensure timeline has baseStartMs
    await ctx.db.patch(timelineId, { baseStartMs: startBase, updatedAt: Date.now() } as any);
    const normalized = tasks.map((t) => ({
      id: t.id,
      parentId: t.parentId,
      name: t.name,
      startOffsetMs: t.startOffsetMs ?? 0,
      durationMs: t.durationMs,
      progress: 0,
      status: t.status ?? "pending",
      agentType: t.agentType,
      icon: t.icon,
      color: t.color,
      sequence: t.sequence,
      description: t.description,
      inputTokens: t.inputTokens,
      outputTokens: t.outputTokens,
      outputSizeBytes: t.outputSizeBytes,
      elapsedMs: t.elapsedMs,
      phaseBoundariesMs: (t as any).phaseBoundariesMs,
      retryOffsetsMs: (t as any).retryOffsetsMs,
      failureOffsetMs: (t as any).failureOffsetMs,
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
    const userId = await getSafeUserId(ctx);
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
      baseStartMs: now,
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
    // Accept either; we'll compute and store offset
    startOffsetMs: v.optional(v.number()),
    startMs: v.optional(v.number()),
    durationMs: v.number(),
    progress: v.optional(v.number()),
    status: v.optional(v.union(v.literal("pending"), v.literal("running"), v.literal("complete"), v.literal("paused"), v.literal("error"))),
    agentType: v.optional(v.union(v.literal("orchestrator"), v.literal("main"), v.literal("leaf"))),
    assigneeId: v.optional(v.id("users")),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
    sequence: v.optional(v.union(v.literal("parallel"), v.literal("sequential"))),
    description: v.optional(v.string()),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    outputSizeBytes: v.optional(v.number()),
    elapsedMs: v.optional(v.number()),
    startedAtMs: v.optional(v.number()),
    // New optional segmentation/markers
    phaseBoundariesMs: v.optional(v.array(v.number())),
    retryOffsetsMs: v.optional(v.array(v.number())),
    failureOffsetMs: v.optional(v.number()),
  },
  returns: v.id("agentTasks"),
  handler: async (ctx, args) => {
    const userId = await getSafeUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const now = Date.now();
    const timeline = await ctx.db.get(args.timelineId);
    if (!timeline) throw new Error("Timeline not found");
    const base = (timeline as any).baseStartMs ?? now;
    const startOffsetMs = typeof args.startOffsetMs === "number"
      ? args.startOffsetMs
      : typeof args.startMs === "number"
        ? Math.max(0, args.startMs - base)
        : 0;
    const id = await ctx.db.insert("agentTasks", {
      timelineId: args.timelineId,
      parentId: args.parentId,
      name: args.name,
      startOffsetMs,
      durationMs: args.durationMs,
      progress: args.progress,
      status: args.status ?? "pending",
      agentType: args.agentType,
      assigneeId: args.assigneeId,
      icon: args.icon,
      color: args.color,
      sequence: args.sequence,
      description: args.description,
      inputTokens: args.inputTokens,
      outputTokens: args.outputTokens,
      outputSizeBytes: args.outputSizeBytes,
      elapsedMs: args.elapsedMs,
      startedAtMs: (args as any).startedAtMs,
      phaseBoundariesMs: (args as any).phaseBoundariesMs,
      retryOffsetsMs: (args as any).retryOffsetsMs,
      failureOffsetMs: (args as any).failureOffsetMs,
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
    const userId = await getSafeUserId(ctx);
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

export const updateTaskMetrics = mutation({
  args: {
    taskId: v.id("agentTasks"),
    progress: v.optional(v.number()),
    status: v.optional(v.union(v.literal("pending"), v.literal("running"), v.literal("complete"), v.literal("paused"), v.literal("error"))),
    startedAtMs: v.optional(v.number()),
    elapsedMs: v.optional(v.number()),
    outputSizeBytes: v.optional(v.number()),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    assigneeId: v.optional(v.id("users")),
    // Optional updates to segmentation/markers
    phaseBoundariesMs: v.optional(v.array(v.number())),
    retryOffsetsMs: v.optional(v.array(v.number())),
    failureOffsetMs: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getSafeUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      console.warn("updateTaskMetrics: Task not found, skipping", String(args.taskId));
      return null;
    }
    const patch: any = { updatedAt: Date.now() };
    if (typeof args.progress === "number") patch.progress = args.progress;
    if (args.status) patch.status = args.status;
    if (typeof args.startedAtMs === "number") patch.startedAtMs = args.startedAtMs;
    if (typeof args.elapsedMs === "number") patch.elapsedMs = args.elapsedMs;
    if (typeof args.outputSizeBytes === "number") patch.outputSizeBytes = args.outputSizeBytes;
    if (typeof args.inputTokens === "number") patch.inputTokens = args.inputTokens;
    if (typeof args.outputTokens === "number") patch.outputTokens = args.outputTokens;
    if (args.assigneeId) patch.assigneeId = args.assigneeId;
    if (Array.isArray((args as any).phaseBoundariesMs)) patch.phaseBoundariesMs = (args as any).phaseBoundariesMs;
    if (Array.isArray((args as any).retryOffsetsMs)) patch.retryOffsetsMs = (args as any).retryOffsetsMs;
    if (typeof (args as any).failureOffsetMs === "number") patch.failureOffsetMs = (args as any).failureOffsetMs;
    await ctx.db.patch(args.taskId, patch);
    // Avoid patching the parent timeline here to prevent OCC hotspots under concurrent updates.
    // The timeline's updatedAt will be bumped by plan application and structural changes (applyPlan/addTask).
    return null;
  },
});


export const setLatestRun = mutation({
  args: {
    timelineId: v.id("agentTimelines"),
    input: v.string(),
    output: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { timelineId, input, output }) => {
    const tl = await ctx.db.get(timelineId);
    if (!tl) throw new Error("Timeline not found");
    const now = Date.now();
    await ctx.db.patch(timelineId, {
      latestRunInput: input,
      latestRunOutput: output,
      latestRunAt: now,
      updatedAt: now,
    } as any);
    return null;
  },
});

export const addRun = mutation({
  args: {
    timelineId: v.id("agentTimelines"),
    input: v.string(),
    output: v.string(),
    retryCount: v.optional(v.number()),
    modelUsed: v.optional(v.string()),
    meta: v.optional(v.any()),
  },
  returns: v.id("agentTimelineRuns"),
  handler: async (ctx, { timelineId, input, output, retryCount, modelUsed, meta }) => {
    const tl = await ctx.db.get(timelineId);
    if (!tl) throw new Error("Timeline not found");
    const now = Date.now();
    const id = await ctx.db.insert("agentTimelineRuns", {
      timelineId,
      input,
      output,
      retryCount,
      modelUsed,
      createdAt: now,
      meta,
    } as any);
    await ctx.db.patch(timelineId, { updatedAt: now } as any);
    return id as Id<"agentTimelineRuns">;
  },
});

export const listRuns = query({
  args: { timelineId: v.id("agentTimelines") },
  returns: v.array(v.object({
    _id: v.id("agentTimelineRuns"),
    timelineId: v.id("agentTimelines"),
    input: v.string(),
    output: v.string(),
    createdAt: v.number(),
    retryCount: v.optional(v.number()),
    modelUsed: v.optional(v.string()),
    meta: v.optional(v.any()),
  })),
  handler: async (ctx, { timelineId }) => {
    const rows = await ctx.db
      .query("agentTimelineRuns")
      .withIndex("by_timeline", (q) => q.eq("timelineId", timelineId))
      .order("desc")
      .take(20);
    return rows.map((r) => ({
      _id: r._id as Id<"agentTimelineRuns">,
      timelineId: r.timelineId as Id<"agentTimelines">,
      input: (r as any).input as string,
      output: (r as any).output as string,
      createdAt: (r as any).createdAt as number,
      retryCount: (r as any).retryCount as number | undefined,
      modelUsed: (r as any).modelUsed as string | undefined,
      meta: (r as any).meta as any,
    })) as any;
  },
});



export const getByDocumentId = query({
  args: { documentId: v.id("documents") },
  returns: v.union(
    v.null(),
    v.object({
      timelineId: v.id("agentTimelines"),
      name: v.string(),
      baseStartMs: v.number(),
	      latestRunInput: v.optional(v.string()),
	      latestRunOutput: v.optional(v.string()),
	      latestRunAt: v.optional(v.number()),

      tasks: v.array(
        v.object({
          _id: v.id("agentTasks"),
          parentId: v.optional(v.id("agentTasks")),
          name: v.string(),
          // Provide both absolute and offset to the client
          startMs: v.number(),
          startOffsetMs: v.number(),
          durationMs: v.number(),
          progress: v.optional(v.number()),
          status: v.optional(v.string()),
          agentType: v.optional(v.string()),
          assigneeId: v.optional(v.id("users")),
          icon: v.optional(v.string()),
          color: v.optional(v.string()),
          sequence: v.optional(v.string()),
          description: v.optional(v.string()),
          inputTokens: v.optional(v.number()),
          outputTokens: v.optional(v.number()),
          outputSizeBytes: v.optional(v.number()),
          elapsedMs: v.optional(v.number()),
          startedAtMs: v.optional(v.number()),
          phaseBoundariesMs: v.optional(v.array(v.number())),
          retryOffsetsMs: v.optional(v.array(v.number())),
          failureOffsetMs: v.optional(v.number()),
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

    const base = (timeline as any).baseStartMs as number | undefined;

    const [tasks, links] = await Promise.all([
      ctx.db.query("agentTasks").withIndex("by_timeline", (q) => q.eq("timelineId", timeline._id)).collect(),
      ctx.db.query("agentLinks").withIndex("by_timeline", (q) => q.eq("timelineId", timeline._id)).collect(),
    ]);

    const tasksOut = tasks.map((t) => {
      const rawOffset = (t as any).startOffsetMs as number | undefined;
      const rawStart = (t as any).startMs as number | undefined;
      const computedOffset = typeof rawOffset === "number" ? rawOffset : (typeof rawStart === "number" && typeof base === "number" ? Math.max(0, rawStart - base) : 0);
      const startMs = (base ?? 0) + computedOffset;
      return {
        _id: t._id as Id<"agentTasks">,
        parentId: t.parentId as Id<"agentTasks"> | undefined,
        name: t.name as string,
        startMs,
        startOffsetMs: computedOffset,
        durationMs: t.durationMs as number,
        progress: (t as any).progress as number | undefined,
        status: (t as any).status as string | undefined,
        agentType: (t as any).agentType as string | undefined,
        assigneeId: (t as any).assigneeId as Id<"users"> | undefined,
        icon: (t as any).icon as string | undefined,
        color: (t as any).color as string | undefined,
        sequence: (t as any).sequence as string | undefined,
        description: (t as any).description as string | undefined,
        inputTokens: (t as any).inputTokens as number | undefined,
        outputTokens: (t as any).outputTokens as number | undefined,
        outputSizeBytes: (t as any).outputSizeBytes as number | undefined,
        elapsedMs: (t as any).elapsedMs as number | undefined,
        startedAtMs: (t as any).startedAtMs as number | undefined,
        phaseBoundariesMs: (t as any).phaseBoundariesMs as number[] | undefined,
        retryOffsetsMs: (t as any).retryOffsetsMs as number[] | undefined,
        failureOffsetMs: (t as any).failureOffsetMs as number | undefined,
      };
    });

    const linksOut = links.map((l) => ({
      _id: l._id as Id<"agentLinks">,
      sourceTaskId: l.sourceTaskId as Id<"agentTasks">,
      targetTaskId: l.targetTaskId as Id<"agentTasks">,
      type: (l as any).type as string | undefined,
    }));

    return {
      timelineId: timeline._id as Id<"agentTimelines">,
      name: (timeline as any).name as string,
      baseStartMs: base ?? 0,
      latestRunInput: (timeline as any).latestRunInput as string | undefined,
      latestRunOutput: (timeline as any).latestRunOutput as string | undefined,
      latestRunAt: (timeline as any).latestRunAt as number | undefined,
      tasks: tasksOut,
      links: linksOut,
    } as any;
  },
});


export const getByTimelineId = query({
  args: { timelineId: v.id("agentTimelines") },
  returns: v.union(
    v.null(),
    v.object({
      timelineId: v.id("agentTimelines"),
      name: v.string(),
      baseStartMs: v.number(),
	      latestRunInput: v.optional(v.string()),
	      latestRunOutput: v.optional(v.string()),
	      latestRunAt: v.optional(v.number()),

      tasks: v.array(
        v.object({
          _id: v.id("agentTasks"),
          parentId: v.optional(v.id("agentTasks")),
          name: v.string(),
          startMs: v.number(),
          startOffsetMs: v.number(),
          durationMs: v.number(),


          progress: v.optional(v.number()),
          status: v.optional(v.string()),
          agentType: v.optional(v.string()),
          assigneeId: v.optional(v.id("users")),
          icon: v.optional(v.string()),
          color: v.optional(v.string()),
          sequence: v.optional(v.string()),
          description: v.optional(v.string()),
          inputTokens: v.optional(v.number()),
          outputTokens: v.optional(v.number()),
          outputSizeBytes: v.optional(v.number()),
          elapsedMs: v.optional(v.number()),
          startedAtMs: v.optional(v.number()),
          phaseBoundariesMs: v.optional(v.array(v.number())),
          retryOffsetsMs: v.optional(v.array(v.number())),
          failureOffsetMs: v.optional(v.number()),
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
  handler: async (ctx, { timelineId }) => {
    const timeline = await ctx.db.get(timelineId);
    if (!timeline) return null;
    const base = (timeline as any).baseStartMs as number | undefined;

    const [tasks, links] = await Promise.all([
      ctx.db.query("agentTasks").withIndex("by_timeline", (q) => q.eq("timelineId", timeline._id)).collect(),
      ctx.db.query("agentLinks").withIndex("by_timeline", (q) => q.eq("timelineId", timeline._id)).collect(),
    ]);

    const tasksOut = tasks.map((t) => {
      const rawOffset = (t as any).startOffsetMs as number | undefined;
      const rawStart = (t as any).startMs as number | undefined;
      const computedOffset = typeof rawOffset === "number" ? rawOffset : (typeof rawStart === "number" && typeof base === "number" ? Math.max(0, rawStart - base) : 0);
      const startMs = (base ?? 0) + computedOffset;
      return {
        _id: t._id as Id<"agentTasks">,
        parentId: t.parentId as Id<"agentTasks"> | undefined,
        name: t.name as string,
        startMs,
        startOffsetMs: computedOffset,
        durationMs: t.durationMs as number,
        progress: (t as any).progress as number | undefined,
        status: (t as any).status as string | undefined,
        agentType: (t as any).agentType as string | undefined,
        assigneeId: (t as any).assigneeId as Id<"users"> | undefined,
        icon: (t as any).icon as string | undefined,
        color: (t as any).color as string | undefined,
        sequence: (t as any).sequence as string | undefined,
        description: (t as any).description as string | undefined,
        inputTokens: (t as any).inputTokens as number | undefined,
        outputTokens: (t as any).outputTokens as number | undefined,
        outputSizeBytes: (t as any).outputSizeBytes as number | undefined,
        elapsedMs: (t as any).elapsedMs as number | undefined,
        startedAtMs: (t as any).startedAtMs as number | undefined,
        phaseBoundariesMs: (t as any).phaseBoundariesMs as number[] | undefined,
        retryOffsetsMs: (t as any).retryOffsetsMs as number[] | undefined,
        failureOffsetMs: (t as any).failureOffsetMs as number | undefined,
      };
    });

    const linksOut = links.map((l) => ({
      _id: l._id as Id<"agentLinks">,
      sourceTaskId: l.sourceTaskId as Id<"agentTasks">,
      targetTaskId: l.targetTaskId as Id<"agentTasks">,
      type: (l as any).type as string | undefined,
    }));

    return {
      timelineId: timeline._id as Id<"agentTimelines">,
      name: (timeline as any).name as string,
      baseStartMs: base ?? 0,
      latestRunInput: (timeline as any).latestRunInput as string | undefined,
      latestRunOutput: (timeline as any).latestRunOutput as string | undefined,
      latestRunAt: (timeline as any).latestRunAt as number | undefined,
      tasks: tasksOut,
      links: linksOut,
    } as any;
  },
});


// Export a portable snapshot for download (timeline JSON)
export const exportSnapshot = action({
  args: {
    timelineId: v.id("agentTimelines"),
    includeReport: v.optional(v.boolean()),
    includeIoPairs: v.optional(v.boolean()),
  },
  returns: v.object({
    timeline: v.object({
      timelineId: v.id("agentTimelines"),
      name: v.string(),
      baseStartMs: v.number(),
      tasks: v.array(v.object({
        id: v.string(),
        parentId: v.union(v.string(), v.null()),
        name: v.string(),
        startOffsetMs: v.number(),
        durationMs: v.number(),
        progress: v.optional(v.number()),
        status: v.optional(v.union(v.literal("pending"), v.literal("running"), v.literal("complete"), v.literal("paused"), v.literal("error"))),
        agentType: v.optional(v.union(v.literal("orchestrator"), v.literal("main"), v.literal("leaf"))),
        icon: v.optional(v.string()),
        color: v.optional(v.string()),
        sequence: v.optional(v.union(v.literal("parallel"), v.literal("sequential"))),
        description: v.optional(v.string()),
        inputTokens: v.optional(v.number()),
        outputTokens: v.optional(v.number()),
        outputSizeBytes: v.optional(v.number()),
        elapsedMs: v.optional(v.number()),
        startedAtMs: v.optional(v.number()),
        phaseBoundariesMs: v.optional(v.array(v.number())),
        retryOffsetsMs: v.optional(v.array(v.number())),
        failureOffsetMs: v.optional(v.number()),
      })),
      links: v.array(v.object({
        sourceId: v.string(),
        targetId: v.string(),
        type: v.optional(v.string()),
      })),
    }),
    report: v.optional(v.any()),
    ioPairs: v.optional(v.array(v.object({
      input: v.string(),
      output: v.string(),
      citations: v.optional(v.array(v.string())),
    }))),
  }),
  handler: async (ctx, { timelineId, includeReport, includeIoPairs }): Promise<{
    timeline: {
      timelineId: Id<"agentTimelines">;
      name: string;
      baseStartMs: number;
      tasks: Array<{
        id: string;
        parentId: string | null;
        name: string;
        startOffsetMs: number;
        durationMs: number;
        progress?: number;
        status?: "pending" | "running" | "complete" | "paused";
        agentType?: "orchestrator" | "main" | "leaf";
        icon?: string;
        color?: string;
        sequence?: "parallel" | "sequential";
        description?: string;
        inputTokens?: number;
        outputTokens?: number;
        outputSizeBytes?: number;
        elapsedMs?: number;
        startedAtMs?: number;
      }>;
      links: Array<{ sourceId: string; targetId: string; type?: string }>;
    };
    report?: any;
    ioPairs?: Array<{ input: string; output: string; citations?: string[] }>;
  }> => {
    type TL = {
      timelineId: Id<"agentTimelines">;
      name: string;
      baseStartMs: number;
      tasks: Array<{
        _id: Id<"agentTasks">;
        parentId?: Id<"agentTasks">;
        name: string;
        startMs: number;
        startOffsetMs: number;
        durationMs: number;
        progress?: number;
        status?: string;
        agentType?: string;
        assigneeId?: Id<"users">;
        icon?: string;
        color?: string;
        sequence?: string;
        description?: string;
        inputTokens?: number;
        outputTokens?: number;
        outputSizeBytes?: number;
        elapsedMs?: number;
        startedAtMs?: number;
      }>;
      links: Array<{
        _id: Id<"agentLinks">;
        sourceTaskId: Id<"agentTasks">;
        targetTaskId: Id<"agentTasks">;
        type?: string;
      }>;
    } | null;

    const tl: TL = await ctx.runQuery(api.agentTimelines.getByTimelineId, { timelineId });
    if (!tl) throw new Error("Timeline not found");

    const tasks = tl.tasks.map((t: NonNullable<TL>['tasks'][number]) => ({
      id: String(t._id),
      parentId: t.parentId ? String(t.parentId) : null,
      name: t.name,
      startOffsetMs: t.startOffsetMs,
      durationMs: t.durationMs,
      progress: t.progress,
      status: (t.status as any) ?? undefined,
      agentType: (t.agentType as any) ?? undefined,
      icon: (t.icon as any) ?? undefined,
      color: (t.color as any) ?? undefined,
      sequence: (t.sequence as any) ?? undefined,
      description: (t.description as any) ?? undefined,
      inputTokens: (t.inputTokens as any) ?? undefined,
      outputTokens: (t.outputTokens as any) ?? undefined,
      outputSizeBytes: (t.outputSizeBytes as any) ?? undefined,
      elapsedMs: (t.elapsedMs as any) ?? undefined,
      startedAtMs: (t.startedAtMs as any) ?? undefined,
      phaseBoundariesMs: (t as any).phaseBoundariesMs ?? undefined,
      retryOffsetsMs: (t as any).retryOffsetsMs ?? undefined,
      failureOffsetMs: (t as any).failureOffsetMs ?? undefined,
    }));

    const links = tl.links.map((l: NonNullable<TL>['links'][number]) => ({
      sourceId: String(l.sourceTaskId),
      targetId: String(l.targetTaskId),
      type: (l.type as any) ?? undefined,
    }));

    const report = includeReport ? { title: tl.name, summary: "", sections: [] } : undefined;
    const ioPairs = includeIoPairs ? [] : undefined;

    return {
      timeline: {
        timelineId: tl.timelineId,
        name: tl.name,
        baseStartMs: tl.baseStartMs,
        tasks,
        links,
      },
      report,
      ioPairs,
    };
  },
});
