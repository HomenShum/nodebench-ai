import { internalMutation, internalQuery } from "../../_generated/server";
import { v } from "convex/values";

export const writeMemory = internalMutation({
  args: {
    entry: v.object({
      id: v.optional(v.string()),
      key: v.string(),
      content: v.string(),
      metadata: v.optional(v.any()),
    }),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const entryId = args.entry.id ?? `mem_${now}_${Math.random().toString(36).substr(2, 9)}`;
    const existing = await ctx.db
      .query("mcpMemoryEntries")
      .withIndex("by_key", (q) => q.eq("key", args.entry.key))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        content: args.entry.content,
        metadata: args.entry.metadata,
        updatedAt: now,
      });
      return existing._id as any;
    }

    await ctx.db.insert("mcpMemoryEntries", {
      key: args.entry.key,
      content: args.entry.content,
      metadata: args.entry.metadata,
      createdAt: now,
      updatedAt: now,
    });

    return entryId;
  },
});

export const readMemory = internalQuery({
  args: { key: v.string() },
  returns: v.union(
    v.object({
      id: v.string(),
      key: v.string(),
      content: v.string(),
      metadata: v.optional(v.any()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const entry = await ctx.db
      .query("mcpMemoryEntries")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    if (!entry) return null;
    return {
      id: entry._id as any,
      key: entry.key,
      content: entry.content,
      metadata: entry.metadata,
    };
  },
});

export const listMemory = internalQuery({
  args: { filter: v.optional(v.string()) },
  returns: v.array(v.object({
    id: v.string(),
    key: v.string(),
    content: v.string(),
    metadata: v.optional(v.any()),
  })),
  handler: async (ctx, args) => {
    const filter = args.filter ?? "";
    const entries = await ctx.db.query("mcpMemoryEntries").collect();
    return entries
      .filter((e) => e.key.includes(filter))
      .map((e) => ({
        id: e._id as any,
        key: e.key,
        content: e.content,
        metadata: e.metadata,
      }));
  },
});

export const deleteMemory = internalMutation({
  args: { key: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const entry = await ctx.db
      .query("mcpMemoryEntries")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    if (!entry) return false;
    await ctx.db.delete(entry._id);
    return true;
  },
});
