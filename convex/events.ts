import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

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

// Returns null instead of throwing when unauthenticated / user missing
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

export const createEvent = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    descriptionJson: v.optional(v.string()),
    startTime: v.number(),
    endTime: v.optional(v.number()),
    allDay: v.optional(v.boolean()),
    location: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("confirmed"),
      v.literal("tentative"),
      v.literal("cancelled"),
    )),
    color: v.optional(v.string()),
    documentId: v.optional(v.id("documents")),
    tags: v.optional(v.array(v.string())),
    recurrence: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getSafeUserId(ctx);
    if (args.endTime !== undefined && args.endTime < args.startTime) {
      throw new Error("endTime cannot be earlier than startTime");
    }
    const now = Date.now();
    const id = await ctx.db.insert("events", {
      userId,
      title: args.title,
      description: args.description,
      descriptionJson: args.descriptionJson,
      startTime: args.startTime,
      endTime: args.endTime,
      allDay: args.allDay,
      location: args.location,
      status: args.status ?? "confirmed",
      color: args.color,
      documentId: args.documentId,
      tags: args.tags,
      recurrence: args.recurrence,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

// Tiny resolvers for event titles (for references UI)
export const getTitle = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const userId = await getOptionalUserId(ctx);
    if (!userId) return null;
    const ev = await ctx.db.get(args.eventId);
    if (!ev || ev.userId !== userId) return null;
    return { title: ev.title } as { title: string };
  },
});

export const getTitles = query({
  args: { ids: v.array(v.id("events")) },
  handler: async (ctx, args) => {
    const userId = await getOptionalUserId(ctx);
    if (!userId) return [] as Array<{ _id: Id<"events">; title: string }>;
    const out: Array<{ _id: Id<"events">; title: string }> = [];
    for (const id of args.ids) {
      const ev = await ctx.db.get(id);
      if (ev && ev.userId === userId) {
        out.push({ _id: id, title: ev.title });
      }
    }
    return out;
  },
});

export const updateEvent = mutation({
  args: {
    eventId: v.id("events"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    descriptionJson: v.optional(v.string()),
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
    allDay: v.optional(v.boolean()),
    location: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("confirmed"),
      v.literal("tentative"),
      v.literal("cancelled"),
    )),
    color: v.optional(v.string()),
    documentId: v.optional(v.id("documents")),
    tags: v.optional(v.array(v.string())),
    recurrence: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getSafeUserId(ctx);
    const existing = await ctx.db.get(args.eventId);
    if (!existing) throw new Error("Event not found");
    if (existing.userId !== userId) throw new Error("Not authorized");

    const start = args.startTime ?? existing.startTime;
    const end = args.endTime ?? existing.endTime;
    if (end !== undefined && start !== undefined && end < start) {
      throw new Error("endTime cannot be earlier than startTime");
    }

    const updates: any = { updatedAt: Date.now() };
    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;
    if (args.descriptionJson !== undefined) updates.descriptionJson = args.descriptionJson;
    if (args.startTime !== undefined) updates.startTime = args.startTime;
    if (args.endTime !== undefined) updates.endTime = args.endTime;
    if (args.allDay !== undefined) updates.allDay = args.allDay;
    if (args.location !== undefined) updates.location = args.location;
    if (args.status !== undefined) updates.status = args.status;
    if (args.color !== undefined) updates.color = args.color;
    if (args.documentId !== undefined) updates.documentId = args.documentId;
    if (args.tags !== undefined) updates.tags = args.tags;
    if (args.recurrence !== undefined) updates.recurrence = args.recurrence;

    await ctx.db.patch(args.eventId, updates);
    return { success: true };
  },
});

export const deleteEvent = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const userId = await getSafeUserId(ctx);
    const existing = await ctx.db.get(args.eventId);
    if (!existing) return { success: true };
    if (existing.userId !== userId) throw new Error("Not authorized");
    await ctx.db.delete(args.eventId);
    return { success: true };
  },
});

export const getEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const userId = await getOptionalUserId(ctx);
    if (!userId) return null;
    const ev = await ctx.db.get(args.eventId);
    if (!ev || ev.userId !== userId) return null;
    return ev;
  },
});

function overlaps(startA: number, endA: number | undefined, startB: number, endB: number): boolean {
  const aEnd = endA ?? startA;
  return startA <= endB && aEnd >= startB;
}

export const listEventsInRange = query({
  args: { start: v.number(), end: v.number() },
  handler: async (ctx, args) => {
    const userId = await getOptionalUserId(ctx);
    if (!userId) return [];
    // Primary: events starting within range
    const inRange = await ctx.db
      .query("events")
      .withIndex("by_user_start", (q: any) =>
        q.eq("userId", userId).gte("startTime", args.start).lte("startTime", args.end)
      )
      .order("asc")
      .collect();

    // Secondary: events that start before range but overlap into it (limited scan)
    const before = await ctx.db
      .query("events")
      .withIndex("by_user_start", (q: any) => q.eq("userId", userId).lt("startTime", args.start))
      .order("desc")
      .take(200);

    const overlapping = before.filter((e: any) => overlaps(e.startTime, e.endTime, args.start, args.end));

    const map = new Map<string, any>();
    for (const e of [...inRange, ...overlapping]) map.set(e._id, e);
    return Array.from(map.values()).sort((a, b) => a.startTime - b.startTime);
  },
});

export const listEventsByStatus = query({
  args: { status: v.union(
    v.literal("confirmed"),
    v.literal("tentative"),
    v.literal("cancelled"),
  ) },
  handler: async (ctx, args) => {
    const userId = await getOptionalUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("events")
      .withIndex("by_user_status", (q: any) => q.eq("userId", userId).eq("status", args.status))
      .order("asc")
      .collect();
  },
});

export const listEventsForDay = query({
  args: { dateMs: v.optional(v.number()), tzOffsetMinutes: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getOptionalUserId(ctx);
    if (!userId) return [];
    const offsetMs = (args.tzOffsetMinutes ?? 0) * 60 * 1000;
    const base = args.dateMs ?? Date.now();
    const local = base + offsetMs;
    const d = new Date(local);
    d.setUTCHours(0, 0, 0, 0);
    const start = d.getTime() - offsetMs;
    const end = start + 24 * 60 * 60 * 1000 - 1;

    const inRange = await ctx.db
      .query("events")
      .withIndex("by_user_start", (q: any) =>
        q.eq("userId", userId).gte("startTime", start).lte("startTime", end)
      )
      .order("asc")
      .collect();

    const before = await ctx.db
      .query("events")
      .withIndex("by_user_start", (q: any) => q.eq("userId", userId).lt("startTime", start))
      .order("desc")
      .take(200);

    const overlapping = before.filter((e: any) => overlaps(e.startTime, e.endTime, start, end));
    const map = new Map<string, any>();
    for (const e of [...inRange, ...overlapping]) map.set(e._id, e);
    return Array.from(map.values()).sort((a, b) => a.startTime - b.startTime);
  },
});

export const listEventsForWeek = query({
  args: { dateMs: v.optional(v.number()), tzOffsetMinutes: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getOptionalUserId(ctx);
    if (!userId) return [];
    const offsetMs = (args.tzOffsetMinutes ?? 0) * 60 * 1000;
    const base = args.dateMs ?? Date.now();
    const local = base + offsetMs;
    const d = new Date(local);
    const day = d.getUTCDay();
    const diffToMonday = ((day + 6) % 7);
    const monday = new Date(local - diffToMonday * 24 * 60 * 60 * 1000);
    monday.setUTCHours(0, 0, 0, 0);
    const start = monday.getTime() - offsetMs;
    const end = start + 7 * 24 * 60 * 60 * 1000 - 1;

    const inRange = await ctx.db
      .query("events")
      .withIndex("by_user_start", (q: any) =>
        q.eq("userId", userId).gte("startTime", start).lte("startTime", end)
      )
      .order("asc")
      .collect();

    const before = await ctx.db
      .query("events")
      .withIndex("by_user_start", (q: any) => q.eq("userId", userId).lt("startTime", start))
      .order("desc")
      .take(200);

    const overlapping = before.filter((e: any) => overlaps(e.startTime, e.endTime, start, end));
    const map = new Map<string, any>();
    for (const e of [...inRange, ...overlapping]) map.set(e._id, e);
    return Array.from(map.values()).sort((a, b) => a.startTime - b.startTime);
  },
});
