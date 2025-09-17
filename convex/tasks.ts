import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

// Helper to normalize/validate user id, consistent with folders.ts pattern
async function getSafeUserId(ctx: any): Promise<Id<"users">> {
  const rawUserId = await getAuthUserId(ctx);
  if (!rawUserId) throw new Error("Not authenticated");
  let userId: Id<"users">;
  if (typeof rawUserId === "string" && rawUserId.includes("|")) {
    const first = rawUserId.split("|")[0];
    if (!first || first.length < 10) throw new Error("Invalid user ID format. Please sign out and in.");
    userId = first as Id<"users">;
  } else {
    userId = rawUserId as Id<"users">;
  }
  const user = await ctx.db.get(userId);
  if (!user) throw new Error("User not found. Please sign out and sign back in.");
  return userId;
}

// Helper that does NOT throw for unauthenticated access; returns null instead.
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

// Create a new task
export const createTask = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    descriptionJson: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("todo"),
      v.literal("in_progress"),
      v.literal("done"),
      v.literal("blocked"),
    )),
    priority: v.optional(v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("urgent"),
    )),
    dueDate: v.optional(v.number()),
    startDate: v.optional(v.number()),
    documentId: v.optional(v.id("documents")),
    eventId: v.optional(v.id("events")),
    assigneeId: v.optional(v.id("users")),
    refs: v.optional(
      v.array(
        v.union(
          v.object({ kind: v.literal("document"), id: v.id("documents") }),
          v.object({ kind: v.literal("task"), id: v.id("tasks") }),
          v.object({ kind: v.literal("event"), id: v.id("events") }),
        ),
      ),
    ),
    tags: v.optional(v.array(v.string())),
    color: v.optional(v.string()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getSafeUserId(ctx);
    const now = Date.now();
    const taskId = await ctx.db.insert("tasks", {
      userId,
      title: args.title,
      description: args.description,
      descriptionJson: args.descriptionJson,
      status: args.status ?? "todo",
      priority: args.priority,
      dueDate: args.dueDate,
      startDate: args.startDate,
      documentId: args.documentId,
      eventId: args.eventId,
      assigneeId: args.assigneeId,
      refs: args.refs,
      tags: args.tags,
      color: args.color,
      order: args.order,
      createdAt: now,
      updatedAt: now,
    });
    return taskId;
  },
});

// Tiny resolver: get task title by id (authorized)
export const getTitle = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const userId = await getOptionalUserId(ctx);
    if (!userId) return null;
    const t = await ctx.db.get(args.taskId);
    if (!t || t.userId !== userId) return null;
    return { title: t.title } as { title: string };
  },
});

// Batch resolver: get task titles by ids (authorized)
export const getTitles = query({
  args: { ids: v.array(v.id("tasks")) },
  handler: async (ctx, args) => {
    const userId = await getOptionalUserId(ctx);
    if (!userId) return [] as Array<{ _id: Id<"tasks">; title: string }>;
    const out: Array<{ _id: Id<"tasks">; title: string }> = [];
    for (const id of args.ids) {
      const t = await ctx.db.get(id);
      if (t && t.userId === userId) {
        out.push({ _id: id, title: t.title });
      }
    }
    return out;
  },
});

// List tasks for current user filtered by assigneeId
export const listTasksByAssignee = query({
  args: { assigneeId: v.id("users") },
  handler: async (ctx, args) => {
    const userId = await getOptionalUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("tasks")
      .withIndex("by_user_assignee", (q: any) => q.eq("userId", userId).eq("assigneeId", args.assigneeId))
      .order("asc")
      .collect();
  },
});

// Toggle favorite on a task (owner-only)
export const toggleFavorite = mutation({
  args: { taskId: v.id("tasks") },
  returns: v.object({ isFavorite: v.boolean() }),
  handler: async (ctx, args) => {
    const userId = await getSafeUserId(ctx);
    const existing = await ctx.db.get(args.taskId);
    if (!existing) throw new Error("Task not found");
    if (existing.userId !== userId) throw new Error("Not authorized");

    const next = !existing.isFavorite;
    await ctx.db.patch(args.taskId, { isFavorite: next, updatedAt: Date.now() });
    return { isFavorite: next };
  },
});

// List recent tasks ordered by updatedAt descending
export const listTasksByUpdatedDesc = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getOptionalUserId(ctx);
    if (!userId) return [];
    const limit = Math.min(Math.max(1, args.limit ?? 10), 100);
    const rows = await ctx.db
      .query("tasks")
      .withIndex("by_user_updatedAt", (q: any) => q.eq("userId", userId))
      .order("desc")
      .take(limit);
    return rows;
  },
});

// Update a task (owner-only)
export const updateTask = mutation({
  args: {
    taskId: v.id("tasks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    descriptionJson: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("todo"),
      v.literal("in_progress"),
      v.literal("done"),
      v.literal("blocked"),
    )),
    priority: v.optional(v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("urgent"),
    )),
    dueDate: v.optional(v.number()),
    startDate: v.optional(v.number()),
    documentId: v.optional(v.id("documents")),
    eventId: v.optional(v.id("events")),
    assigneeId: v.optional(v.id("users")),
    refs: v.optional(
      v.array(
        v.union(
          v.object({ kind: v.literal("document"), id: v.id("documents") }),
          v.object({ kind: v.literal("task"), id: v.id("tasks") }),
          v.object({ kind: v.literal("event"), id: v.id("events") }),
        ),
      ),
    ),
    tags: v.optional(v.array(v.string())),
    color: v.optional(v.string()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getSafeUserId(ctx);
    const existing = await ctx.db.get(args.taskId);
    if (!existing) throw new Error("Task not found");
    if (existing.userId !== userId) throw new Error("Not authorized");

    const updates: any = { updatedAt: Date.now() };
    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;
    if (args.descriptionJson !== undefined) updates.descriptionJson = args.descriptionJson;
    if (args.status !== undefined) updates.status = args.status;
    if (args.priority !== undefined) updates.priority = args.priority;
    if (args.dueDate !== undefined) updates.dueDate = args.dueDate;
    if (args.startDate !== undefined) updates.startDate = args.startDate;
    if (args.documentId !== undefined) updates.documentId = args.documentId;
    if (args.eventId !== undefined) updates.eventId = args.eventId;
    if (args.assigneeId !== undefined) updates.assigneeId = args.assigneeId;
    if (args.refs !== undefined) updates.refs = args.refs;
    if (args.tags !== undefined) updates.tags = args.tags;
    if (args.color !== undefined) updates.color = args.color;
    if (args.order !== undefined) updates.order = args.order;

    await ctx.db.patch(args.taskId, updates);
    return { success: true };
  },
});

// Delete a task (owner-only)
export const deleteTask = mutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const userId = await getSafeUserId(ctx);
    const existing = await ctx.db.get(args.taskId);
    if (!existing) return { success: true };
    if (existing.userId !== userId) throw new Error("Not authorized");
    await ctx.db.delete(args.taskId);
    return { success: true };
  },
});

// Get a task
export const getTask = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const userId = await getOptionalUserId(ctx);
    if (!userId) return null;
    const task = await ctx.db.get(args.taskId);
    if (!task || task.userId !== userId) return null;
    return task;
  },
});

// List tasks by status
export const listTasksByStatus = query({
  args: { status: v.optional(v.union(
    v.literal("todo"),
    v.literal("in_progress"),
    v.literal("done"),
    v.literal("blocked"),
  )) },
  handler: async (ctx, args) => {
    const userId = await getOptionalUserId(ctx);
    if (!userId) return [];
    if (!args.status) return [];
    return await ctx.db
      .query("tasks")
      .withIndex("by_user_status", (q: any) => q.eq("userId", userId).eq("status", args.status))
      .order("asc")
      .collect();
  },
});

// List tasks due in [start, end]
export const listTasksDueInRange = query({
  args: { start: v.number(), end: v.number() },
  handler: async (ctx, args) => {
    const userId = await getOptionalUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("tasks")
      .withIndex("by_user_dueDate", (q: any) =>
        q.eq("userId", userId).gte("dueDate", args.start).lte("dueDate", args.end)
      )
      .order("asc")
      .collect();
  },
});

// List tasks by priority
export const listTasksByPriority = query({
  args: { priority: v.union(
    v.literal("low"),
    v.literal("medium"),
    v.literal("high"),
    v.literal("urgent"),
  ) },
  handler: async (ctx, args) => {
    const userId = await getOptionalUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("tasks")
      .withIndex("by_user_priority", (q: any) => q.eq("userId", userId).eq("priority", args.priority))
      .order("asc")
      .collect();
  },
});

// Convenience: list tasks due today, using timezone offset minutes (default 0)
export const listTasksDueToday = query({
  args: { tzOffsetMinutes: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getOptionalUserId(ctx);
    if (!userId) return [];
    const offsetMs = (args.tzOffsetMinutes ?? 0) * 60 * 1000;
    const now = Date.now();
    const localNow = now + offsetMs;
    const d = new Date(localNow);
    d.setUTCHours(0, 0, 0, 0);
    const start = d.getTime() - offsetMs;
    const end = start + 24 * 60 * 60 * 1000 - 1;

    return await ctx.db
      .query("tasks")
      .withIndex("by_user_dueDate", (q: any) => q.eq("userId", userId).gte("dueDate", start).lte("dueDate", end))
      .order("asc")
      .collect();
  },
});

// Convenience: list tasks due this week (Mon-Sun), using timezone offset minutes (default 0)
export const listTasksDueThisWeek = query({
  args: { tzOffsetMinutes: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getOptionalUserId(ctx);
    if (!userId) return [];
    const offsetMs = (args.tzOffsetMinutes ?? 0) * 60 * 1000;
    const now = Date.now();
    const localNow = now + offsetMs;
    const d = new Date(localNow);
    // Compute Monday as first day of week
    const day = d.getUTCDay(); // 0=Sun..6=Sat
    const diffToMonday = ((day + 6) % 7); // days since Monday
    const monday = new Date(localNow - diffToMonday * 24 * 60 * 60 * 1000);
    monday.setUTCHours(0, 0, 0, 0);
    const start = monday.getTime() - offsetMs;
    const end = start + 7 * 24 * 60 * 60 * 1000 - 1;

    return await ctx.db
      .query("tasks")
      .withIndex("by_user_dueDate", (q: any) => q.eq("userId", userId).gte("dueDate", start).lte("dueDate", end))
      .order("asc")
      .collect();
  },
});

// Move task to a new status and optionally update order (Kanban)
export const moveTask = mutation({
  args: {
    taskId: v.id("tasks"),
    status: v.union(
      v.literal("todo"),
      v.literal("in_progress"),
      v.literal("done"),
      v.literal("blocked"),
    ),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getSafeUserId(ctx);
    const existing = await ctx.db.get(args.taskId);
    if (!existing) throw new Error("Task not found");
    if (existing.userId !== userId) throw new Error("Not authorized");

    await ctx.db.patch(args.taskId, {
      status: args.status,
      order: args.order ?? existing.order,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

// Rebalance orders in a lane (or all lanes) for the current user
export const rebalanceOrders = mutation({
  args: {
    status: v.optional(
      v.union(
        v.literal("todo"),
        v.literal("in_progress"),
        v.literal("done"),
        v.literal("blocked"),
      ),
    ),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const userId = await getSafeUserId(ctx);
    const lanes: Array<"todo" | "in_progress" | "done" | "blocked"> = args.status
      ? [args.status]
      : ["todo", "in_progress", "done", "blocked"];

    let updated = 0;
    const STEP = 1000;

    for (const lane of lanes) {
      // Fetch all tasks for this user and status
      const rows = await ctx.db
        .query("tasks")
        .withIndex("by_user_status", (q: any) => q.eq("userId", userId).eq("status", lane))
        .order("asc")
        .collect();

      // Sort by existing order (missing orders go last), tie-breaker by createdAt
      rows.sort((a: any, b: any) => {
        const ao = typeof a?.order === "number" ? a.order : Number.MAX_SAFE_INTEGER;
        const bo = typeof b?.order === "number" ? b.order : Number.MAX_SAFE_INTEGER;
        if (ao !== bo) return ao - bo;
        const ac = typeof a?.createdAt === "number" ? a.createdAt : 0;
        const bc = typeof b?.createdAt === "number" ? b.createdAt : 0;
        return ac - bc;
      });

      // Assign spaced integer orders
      for (let i = 0; i < rows.length; i++) {
        const desired = (i + 1) * STEP;
        if (rows[i].order !== desired) {
          await ctx.db.patch(rows[i]._id, { order: desired, updatedAt: Date.now() });
          updated++;
        }
      }
    }

    return updated;
  },
});
