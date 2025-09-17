import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";
import { detectNodeType, createBlockJson, extractPlainText, coerceToBlockJson } from "./lib/markdown";

/* ------------------------------------------------------------------ */
/* Helper                                                             */
/* ------------------------------------------------------------------ */
function assertCanEdit(userId: string | null, ownerId: string) {
  if (!userId || userId !== ownerId) throw new Error("forbidden");
}

/* ------------------------------------------------------------------ */
/* Queries                                                             */
/* ------------------------------------------------------------------ */
export const by_document = query({
  args: { docId: v.id("documents") },
  handler: async (ctx, { docId }) => {
    const nodes = await ctx.db
      .query("nodes")
      .withIndex("by_document", (q) => q.eq("documentId", docId))
      .collect();
    return nodes;
  },
});

export const searchByText = query({
  args: { docId: v.id("documents"), query: v.string() },
  handler: async (ctx, { docId, query }) => {
    return ctx.db
      .query("nodes")
      .withSearchIndex("search_text", (q) =>
        q.search("text", query).eq("documentId", docId),
      )
      .take(20);
  },
});

/* ------------------------------------------------------------------ */
/* Mutations                                                          */
/* ------------------------------------------------------------------ */
export const add = mutation({
  args: {
    documentId: v.id("documents"),
    parentId: v.optional(v.id("nodes")),
    order: v.number(),
    type: v.string(),
    json: v.optional(v.any()),
    text: v.optional(v.string()),
  },
  returns: v.id("nodes"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("unauthenticated");

    // Normalize incoming json/text to a valid single block
    const coerced = coerceToBlockJson(args.json, args.text ?? "");
    const finalType = coerced.type;
    const finalJson = coerced.block;
    const finalText = coerced.text;

    if (args.type && args.type !== finalType) {
      console.warn("[nodes.add] provided type mismatch with normalized json:", args.type, "->", finalType);
    }

    const id = await ctx.db.insert("nodes", {
      documentId: args.documentId,
      parentId: args.parentId,
      order: args.order,
      type: finalType,
      json: finalJson,
      text: finalText,
      authorId: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isUserNode: true,
    });
    if (args.parentId) {
      await ctx.db.insert("relations", {
        from: args.parentId,
        to: id,
        relationTypeId: "child",
        order: args.order,
        createdBy: userId,
        createdAt: Date.now(),
      });
    }
    return id;
  },
});

export const update = mutation({
  args: {
    nodeId: v.id("nodes"),
    json: v.optional(v.any()),
    text: v.optional(v.string()),
    order: v.optional(v.number()),
    markdown: v.optional(v.string()),
  },
  returns: v.id("nodes"),
  handler: async (ctx, { nodeId, ...updates }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("unauthenticated");

    const node = await ctx.db.get(nodeId);
    if (!node) throw new Error("not found");
    assertCanEdit(userId, node.authorId);

    // Build patch object with only provided fields
    const patch: any = { updatedAt: Date.now() };

    // If markdown is provided, parse it and update relevant fields
    if (updates.markdown !== undefined) {
      const nodeType = detectNodeType(updates.markdown);
      patch.type = nodeType;
      patch.json = createBlockJson(nodeType, updates.markdown);
      patch.text = extractPlainText(updates.markdown);
    } else {
      // Handle direct json/text updates by normalizing
      if (updates.json !== undefined || updates.text !== undefined) {
        const input = updates.json ?? updates.text ?? "";
        const coerced = coerceToBlockJson(input, updates.text ?? (node.text ?? ""));
        patch.type = coerced.type;
        patch.json = coerced.block;
        patch.text = coerced.text;
      }
    }

    if (updates.order !== undefined) patch.order = updates.order;

    await ctx.db.patch(nodeId, patch);

    console.log("[nodes.update] Updated node:", nodeId, "fields:", Object.keys(patch));
    return nodeId;
  },
});

/**
 * Batch update sibling ordering for multiple nodes.
 * - Only updates the `order` field for provided nodeIds.
 * - Performs per-node auth (author match) checks.
 * - Also syncs the corresponding "child" relation's `order` if present.
 */
export const updateOrders = mutation({
  args: {
    updates: v.array(
      v.object({
        nodeId: v.id("nodes"),
        order: v.number(),
      }),
    ),
  },
  returns: v.number(),
  handler: async (ctx, { updates }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("unauthenticated");
    if (!updates.length) return 0;

    // Deduplicate by nodeId – last write wins.
    const dedup = new Map<string, number>();
    for (const u of updates) dedup.set(u.nodeId, u.order);

    let changed = 0;
    for (const [nodeIdStr, nextOrder] of dedup) {
      const nodeId = nodeIdStr as Id<"nodes">;
      const node = await ctx.db.get(nodeId);
      if (!node) continue;
      assertCanEdit(userId, node.authorId);

      if (node.order === nextOrder) {
        continue; // no-op
      }

      await ctx.db.patch(nodeId, {
        order: nextOrder,
        updatedAt: Date.now(),
        lastEditedBy: userId,
      } as any);
      changed++;

      // Keep the matching child relation order in sync if it exists.
      if (node.parentId) {
        // Iterate relations to avoid relying on unsupported compound filters.
        for await (const rel of ctx.db
          .query("relations")
          .withIndex("by_to", (q) => q.eq("to", nodeId))) {
          if (rel.relationTypeId === "child" && rel.from === node.parentId) {
            await ctx.db.patch(rel._id, { order: nextOrder });
            break;
          }
        }
      }
    }
    return changed;
  },
});

/* ------------------------------------------------------------------ */
/* Remove (cascade delete node, children, relations)                   */
/* ------------------------------------------------------------------ */
export const remove = mutation({
  args: { nodeId: v.id("nodes") },
  returns: v.null(),
  handler: async (ctx, { nodeId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("unauthenticated");
    const root = await ctx.db.get(nodeId);
    if (!root) throw new Error("not found");
    assertCanEdit(userId, root.authorId);

    const stack: Id<"nodes">[] = [nodeId];
    while (stack.length) {
      const id = stack.pop()!;
      // delete relations starting from this node
      for await (const rel of ctx.db
        .query("relations")
        .withIndex("by_from", (q) => q.eq("from", id))) {
        await ctx.db.delete(rel._id);
      }
      // collect children
      for await (const child of ctx.db
        .query("nodes")
        .withIndex("by_parent", (q) => q.eq("parentId", id))) {
        stack.push(child._id);
      }
      await ctx.db.delete(id);
    }
    return null;
  },
});