import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { detectNodeType, createBlockJson, extractPlainText, coerceToBlockJson } from "./lib/markdown";

/**
 * Create a new node with markdown content
 * This mutation handles markdown storage and order assignment
 */
export const create = mutation({
  args: {
    documentId: v.id("documents"),
    parentId: v.optional(v.union(v.id("nodes"), v.null())),
    markdown: v.string(),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("unauthenticated");

    // Parse the markdown to determine node type
    const nodeType = detectNodeType(args.markdown);
    
    // If no order specified, append to end
    let order = args.order;
    if (order === undefined) {
      const existingNodes = await ctx.db
        .query("nodes")
        .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
        .filter((q) => q.eq(q.field("parentId"), args.parentId || null))
        .collect();
      
      order = existingNodes.length;
    }

    // Create the node with normalized JSON structure
    const normalized = coerceToBlockJson(createBlockJson(nodeType, args.markdown), extractPlainText(args.markdown));
    const nodeId = await ctx.db.insert("nodes", {
      documentId: args.documentId,
      parentId: args.parentId ?? undefined,
      order,
      type: normalized.type,
      text: normalized.text,
      json: normalized.block,
      authorId: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isUserNode: true,
    });

    // Create parent-child relation if parentId is provided
    if (args.parentId) {
      await ctx.db.insert("relations", {
        from: args.parentId,
        to: nodeId,
        relationTypeId: "child",
        order: order,
        createdBy: userId,
        createdAt: Date.now(),
      });
    }

    console.log("[nodes_extras.create] Created node:", nodeId, "type:", nodeType);
    return nodeId;
  },
});

/**
 * Archive a node and all its descendants
 */
export const archive = mutation({
  args: {
    nodeId: v.id("nodes"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("unauthenticated");

    const node = await ctx.db.get(args.nodeId);
    if (!node) {
      throw new Error("Node not found");
    }

    // Check permissions
    if (node.authorId !== userId) {
      throw new Error("forbidden");
    }

    // Find all descendant nodes
    const descendants = await findDescendants(ctx, args.nodeId);
    
    // Archive the node and all descendants by deleting them
    const allNodes = [args.nodeId, ...descendants];
    
    for (const id of allNodes) {
      // Delete relations for this node
      const relations = await ctx.db
        .query("relations")
        .withIndex("by_from", (q) => q.eq("from", id))
        .collect();
      
      for (const rel of relations) {
        await ctx.db.delete(rel._id);
      }
      
      // Delete the node itself
      await ctx.db.delete(id);
    }

    console.log("[nodes_extras.archive] Archived node and", descendants.length, "descendants");
    return null;
  },
});

/**
 * Recursively find all descendant nodes
 */
async function findDescendants(
  ctx: any, 
  nodeId: Id<"nodes">
): Promise<Id<"nodes">[]> {
  const children = await ctx.db
    .query("nodes")
    .withIndex("by_parent", (q: any) => q.eq("parentId", nodeId))
    .collect();

  const descendants: Id<"nodes">[] = [];
  
  for (const child of children) {
    descendants.push(child._id);
    const childDescendants = await findDescendants(ctx, child._id);
    descendants.push(...childDescendants);
  }
  
  return descendants;
}