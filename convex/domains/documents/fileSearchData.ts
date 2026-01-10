import { v } from "convex/values";
import { internalMutation, internalQuery } from "../../_generated/server";
import type { Id } from "../../_generated/dataModel";

export const getFileSearchStoreForUser = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("fileSearchStores")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
  },
});

export const createFileSearchStore = internalMutation({
  args: { userId: v.id("users"), storeName: v.string() },
  handler: async (ctx, { userId, storeName }) => {
    const now = Date.now();
    await ctx.db.insert("fileSearchStores", {
      userId,
      storeName,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const getDocumentForUpsert = internalQuery({
  args: { documentId: v.id("documents") },
  handler: async (ctx, { documentId }) => {
    const doc = await ctx.db.get(documentId);
    if (!doc) return null;

    let fileData = null;
    if ((doc).documentType === "file" && (doc).fileId) {
      const file = await ctx.db.get((doc).fileId as Id<"files">);
      if (file?.storageId) {
        fileData = {
          storageId: file.storageId,
          mimeType: file.mimeType,
        };
      }
    }

    return {
      doc,
      fileData,
    };
  },
});

export const updateDocumentIndexedAt = internalMutation({
  args: { documentId: v.id("documents") },
  handler: async (ctx, { documentId }) => {
    await ctx.db.patch(documentId, { fileSearchIndexedAt: Date.now() });
  },
});
