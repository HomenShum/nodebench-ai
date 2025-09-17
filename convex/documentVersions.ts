import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";
import { components } from "./_generated/api";

// Create a persistent checkpoint/snapshot for a document
export const create = mutation({
  args: {
    documentId: v.id("documents"),
    note: v.optional(v.string()),
  },
  returns: v.object({ snapshotId: v.id("documentSnapshots"), version: v.number() }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const doc = await ctx.db.get(args.documentId);
    if (!doc) throw new Error("Document not found");
    if (doc.createdBy !== userId) throw new Error("Unauthorized");

    // Get the current latest ProseMirror version
    const version: number | null = await ctx.runQuery(components.prosemirrorSync.lib.latestVersion, {
      id: args.documentId as unknown as string,
    });
    const safeVersion: number = typeof version === "number" ? version : 0;

    const content = (doc as any).content ?? "";
    const now = Date.now();

    const snapshotId: Id<"documentSnapshots"> = await ctx.db.insert("documentSnapshots", {
      documentId: args.documentId,
      content: String(content),
      version: safeVersion,
      createdBy: userId,
      createdAt: now,
      stepCount: 0,
      isManual: true,
      triggerReason: args.note ?? "manual",
      contentSize: String(content).length,
    } as any);

    // Update counter on the document (optional)
    const existingCount = (doc as any).snapshotCount ?? 0;
    await ctx.db.patch(args.documentId, { snapshotCount: existingCount + 1, lastModified: now } as any);

    return { snapshotId, version: safeVersion };
  },
});

// List checkpoints for a given document (newest first)
export const listForDocument = query({
  args: { documentId: v.id("documents"), limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      _id: v.id("documentSnapshots"),
      version: v.number(),
      createdAt: v.number(),
      createdBy: v.id("users"),
      note: v.optional(v.string()),
      size: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);

    const doc = await ctx.db.get(args.documentId);
    if (!doc) return [];
    const d = doc as any;
    if (!d.isPublic && d.createdBy !== userId) return [];

    const rows = await ctx.db
      .query("documentSnapshots")
      .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
      .order("desc")
      .take(Math.max(1, Math.min(args.limit ?? 50, 200)));

    return rows.map((r) => ({
      _id: r._id as Id<"documentSnapshots">,
      version: r.version as number,
      createdAt: r.createdAt as number,
      createdBy: r.createdBy as Id<"users">,
      note: (r as any).triggerReason as string | undefined,
      size: (r as any).contentSize as number | undefined,
    }));
  },
});

// Restore a document to a given snapshot
export const restore = mutation({
  args: { snapshotId: v.id("documentSnapshots") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const snap = await ctx.db.get(args.snapshotId);
    const snapAny = snap as any;
    if (!snap) throw new Error("Snapshot not found");

    const doc = await ctx.db.get(snapAny.documentId as Id<"documents">);
    if (!doc) throw new Error("Document not found");
    if (doc.createdBy !== userId) throw new Error("Unauthorized");

    const content = String((snap as any).content ?? "");

    // Set the document content to the snapshot immediately for read flows
    await ctx.db.patch(snapAny.documentId as Id<"documents">, {
      content,
      lastModified: Date.now(),
    } as any);

    // Inform the ProseMirror sync layer by appending a new snapshot at the next version.
    // Using the saved snapshot's old version can collide with an existing snapshot, so we
    // fetch the latest version and submit at latest+1.
    const latest: number | null = await ctx.runQuery(components.prosemirrorSync.lib.latestVersion, {
      id: snapAny.documentId as unknown as string,
    });
    const nextVersion = (typeof latest === 'number' ? latest : 0) + 1;
    await ctx.runMutation(components.prosemirrorSync.lib.submitSnapshot, {
      id: snapAny.documentId as unknown as string,
      version: nextVersion,
      content,
      pruneSnapshots: true,
    });

    return null;
  },
});

