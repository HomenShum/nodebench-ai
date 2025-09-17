import { v } from "convex/values";
import { internalMutation, internalQuery, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api, internal } from "./_generated/api";
import { detectNodeType, createBlockJson, extractPlainText } from "./lib/markdown";

// Helper: list children ordered by `order`
async function listChildren(ctx: any, parentId: Id<"nodes">): Promise<Array<any>> {
  const children: any[] = [];
  for await (const child of ctx.db
    .query("nodes")
    .withIndex("by_parent", (q: any) => q.eq("parentId", parentId))
    .order("asc")) {
    children.push(child);
  }
  // Ensure deterministic sort by order then creation time
  children.sort((a, b) => (a.order - b.order) || (a._creationTime - b._creationTime));
  return children;
}

// Helper: resolve a depth path from a root node, e.g. [1, 0, 2]
async function resolvePath(ctx: any, rootId: Id<"nodes">, path: number[]): Promise<{ parentId: Id<"nodes"> | null; targetId: Id<"nodes"> | null; index: number }>{
  let parent: Id<"nodes"> | null = null;
  let current: Id<"nodes"> = rootId;
  if (!Array.isArray(path) || path.length === 0) {
    return { parentId: null, targetId: current, index: 0 };
  }
  for (let depth = 0; depth < path.length; depth++) {
    const idx = path[depth] ?? 0;
    const children = await listChildren(ctx, current);
    if (idx < 0 || idx >= children.length) {
      return { parentId: current, targetId: null, index: idx };
    }
    parent = current;
    current = children[idx]._id as Id<"nodes">;
  }
  return { parentId: parent, targetId: current, index: path[path.length - 1] ?? 0 };
}

export const getNodeByPosition = internalQuery({
  args: {
    rootId: v.id("nodes"),
    path: v.array(v.number()),
  },
  returns: v.object({
    parentId: v.union(v.id("nodes"), v.null()),
    targetId: v.union(v.id("nodes"), v.null()),
    index: v.number(),
  }),
  handler: async (ctx, { rootId, path }) => {
    const res = await resolvePath(ctx, rootId, path);
    return res as any;
  },
});

export const updateAtPosition = internalMutation({
  args: {
    documentId: v.id("documents"),
    rootId: v.id("nodes"),
    path: v.array(v.number()), // depth indices from root
    op: v.union(
      v.literal("replace"),
      v.literal("insertBefore"),
      v.literal("insertAfter"),
      v.literal("appendChild"),
    ),
    // Provide content as markdown (preferred) or direct json/text
    markdown: v.optional(v.string()),
    json: v.optional(v.any()),
    text: v.optional(v.string()),
    type: v.optional(v.string()),
  },
  returns: v.object({
    targetId: v.union(v.id("nodes"), v.null()),
    newNodeId: v.union(v.id("nodes"), v.null()),
  }),
  handler: async (ctx, args): Promise<{ targetId: Id<"nodes"> | null; newNodeId: Id<"nodes"> | null }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Resolve target
    const { parentId, targetId, index } = await resolvePath(ctx, args.rootId, args.path);

    // Build normalized block fields
    let json = args.json;
    let text = args.text;
    let type = args.type;
    if (args.markdown !== undefined) {
      const nodeType = detectNodeType(args.markdown);
      type = type || nodeType;
      json = createBlockJson(type, args.markdown);
      text = extractPlainText(args.markdown);
    }

    // Determine operation
    if (args.op === "replace") {
      if (!targetId) throw new Error("No target at path to replace");
      if (args.markdown !== undefined) {
        await ctx.runMutation(api.nodes.update, { nodeId: targetId, markdown: args.markdown });
      } else {
        await ctx.runMutation(api.nodes.update, { nodeId: targetId, json: json, text: text, ...(type ? { type } : {}) } as any);
      }
      return { targetId, newNodeId: null } as any;
    }

    // insertBefore / insertAfter within parent's children ordering
    if (args.op === "insertBefore" || args.op === "insertAfter") {
      if (!parentId) throw new Error("Cannot insert at root level using this operation. Use appendChild on root instead.");
      // compute insertion order
      const siblings = await listChildren(ctx, parentId);
      const refIdx = Math.max(0, Math.min(index, siblings.length));
      const ref = siblings[refIdx];
      let order: number;
      if (args.op === "insertBefore") {
        const prev = siblings[refIdx - 1];
        order = prev ? (prev.order + ref.order) / 2 : ref ? ref.order - 1 : 0;
      } else {
        const next = siblings[refIdx + 1];
        order = next ? (ref.order + next.order) / 2 : ref ? ref.order + 1 : siblings.length;
      }

      // Create the node under parentId at computed order
      const newNodeId: Id<"nodes"> = await ctx.runMutation(api.nodes.add, {
        documentId: args.documentId,
        parentId,
        order,
        type: type || "paragraph",
        json,
        text,
      });
      return { targetId: targetId ?? null, newNodeId } as any;
    }

    // appendChild: add as last child of target (or root if target is null meaning exact root)
    if (args.op === "appendChild") {
      const containerId = targetId ?? args.rootId;
      const kids = await listChildren(ctx, containerId);
      const order = kids.length ? kids[kids.length - 1].order + 1 : 0;
      const newNodeId: Id<"nodes"> = await ctx.runMutation(api.nodes.add, {
        documentId: args.documentId,
        parentId: containerId,
        order,
        type: type || "paragraph",
        json,
        text,
      });
      return { targetId: containerId, newNodeId } as any;
    }

    throw new Error("Unsupported op");
  },
});

// Public wrapper for agents: stable tool endpoint
export const agentUpdateAtPosition = mutation({
  args: {
    documentId: v.id("documents"),
    rootId: v.id("nodes"),
    path: v.array(v.number()),
    op: v.union(
      v.literal("replace"),
      v.literal("insertBefore"),
      v.literal("insertAfter"),
      v.literal("appendChild"),
    ),
    markdown: v.optional(v.string()),
    json: v.optional(v.any()),
    text: v.optional(v.string()),
    type: v.optional(v.string()),
  },
  returns: v.object({ targetId: v.union(v.id("nodes"), v.null()), newNodeId: v.union(v.id("nodes"), v.null()) }),
  handler: async (ctx, args): Promise<{ targetId: Id<"nodes"> | null; newNodeId: Id<"nodes"> | null }> => {
    // Basic doc access check
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const doc = await ctx.db.get(args.documentId);
    const docAny = doc as any;
    if (!doc) throw new Error("Document not found");
    if (!docAny.isPublic && docAny.createdBy !== userId) throw new Error("Unauthorized");

    const res: { targetId: Id<"nodes"> | null; newNodeId: Id<"nodes"> | null } = await ctx.runMutation(internal.agentEditor.updateAtPosition, args as any);

    // Auto-save a checkpoint for AI edits; ignore if unauthorized (e.g., non-owner)
    try {
      await ctx.runMutation(api.documentVersions.create, { documentId: args.documentId, note: "ai edit" } as any);
    } catch {
      // ignore errors (e.g., create requires owner)
    }

    return res;
  },
});

