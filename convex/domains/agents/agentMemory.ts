/**
 * Agent Memory - Backend functions for persistent agent memory
 * 
 * This module provides mutations and queries for the Deep Agents memory system.
 * Memory entries are key-value pairs stored per user with optional metadata.
 */

import { v } from "convex/values";
import { mutation, query } from "../../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Write data to agent memory
 */
export const writeMemory = mutation({
    args: {
        key: v.string(),
        content: v.string(),
        metadata: v.optional(v.any()),
    },
    returns: v.id("agentMemory"),
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("Authentication required");
        }

        const now = Date.now();

        // Check if entry already exists
        const existing = await ctx.db
            .query("agentMemory")
            .withIndex("by_user_key", (q) => q.eq("userId", userId).eq("key", args.key))
            .first();

        if (existing) {
            // Update existing entry
            await ctx.db.patch(existing._id, {
                content: args.content,
                metadata: args.metadata,
                updatedAt: now,
            });
            return existing._id;
        } else {
            // Create new entry
            const memoryId = await ctx.db.insert("agentMemory", {
                userId,
                key: args.key,
                content: args.content,
                metadata: args.metadata,
                createdAt: now,
                updatedAt: now,
            });
            return memoryId;
        }
    },
});

/**
 * Read data from agent memory
 */
export const readMemory = query({
    args: {
        key: v.string(),
    },
    returns: v.union(
        v.object({
            _id: v.id("agentMemory"),
            userId: v.id("users"),
            key: v.string(),
            content: v.string(),
            metadata: v.optional(v.any()),
            createdAt: v.number(),
            updatedAt: v.number(),
        }),
        v.null()
    ),
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            return null;
        }

        const memory = await ctx.db
            .query("agentMemory")
            .withIndex("by_user_key", (q) => q.eq("userId", userId).eq("key", args.key))
            .first();

        return memory || null;
    },
});

/**
 * List all memory entries for the current user
 */
export const listMemory = query({
    args: {
        limit: v.optional(v.number()),
    },
    returns: v.array(v.object({
        _id: v.id("agentMemory"),
        userId: v.id("users"),
        key: v.string(),
        content: v.string(),
        metadata: v.optional(v.any()),
        createdAt: v.number(),
        updatedAt: v.number(),
    })),
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            return [];
        }

        const query = ctx.db
            .query("agentMemory")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .order("desc");

        const memories = args.limit
            ? await query.take(args.limit)
            : await query.take(50);

        return memories;
    },
});

/**
 * Delete a memory entry
 */
export const deleteMemory = mutation({
    args: {
        key: v.string(),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("Authentication required");
        }

        const memory = await ctx.db
            .query("agentMemory")
            .withIndex("by_user_key", (q) => q.eq("userId", userId).eq("key", args.key))
            .first();

        if (!memory) {
            throw new Error("Memory entry not found");
        }

        if (memory.userId !== userId) {
            throw new Error("Access denied");
        }

        await ctx.db.delete(memory._id);
        return null;
    },
});

/**
 * Service: Write memory (called by MCP server)
 */
export const writeMemoryAsService = mutation({
    args: {
        userId: v.id("users"),
        key: v.string(),
        content: v.string(),
        metadata: v.optional(v.any()),
        secret: v.string(),
    },
    returns: v.id("agentMemory"),
    handler: async (ctx, args) => {
        if (args.secret !== "nodebench_dev_secret") {
            throw new Error("Unauthorized: Invalid MCP secret");
        }

        const now = Date.now();
        const existing = await ctx.db
            .query("agentMemory")
            .withIndex("by_user_key", (q) => q.eq("userId", args.userId).eq("key", args.key))
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, {
                content: args.content,
                metadata: args.metadata,
                updatedAt: now,
            });
            return existing._id;
        } else {
            return await ctx.db.insert("agentMemory", {
                userId: args.userId,
                key: args.key,
                content: args.content,
                metadata: args.metadata,
                createdAt: now,
                updatedAt: now,
            });
        }
    },
});

/**
 * Service: Read memory (called by MCP server)
 */
export const readMemoryAsService = query({
    args: {
        userId: v.id("users"),
        key: v.string(),
        secret: v.string(),
    },
    returns: v.union(v.any(), v.null()),
    handler: async (ctx, args) => {
        if (args.secret !== "nodebench_dev_secret") {
            throw new Error("Unauthorized: Invalid MCP secret");
        }
        const memory = await ctx.db
            .query("agentMemory")
            .withIndex("by_user_key", (q) => q.eq("userId", args.userId).eq("key", args.key))
            .first();
        return memory;
    },
});

/**
 * Service: List memory (called by MCP server)
 */
export const listMemoryAsService = query({
    args: {
        userId: v.id("users"),
        limit: v.optional(v.number()),
        secret: v.string(),
    },
    returns: v.array(v.any()),
    handler: async (ctx, args) => {
        if (args.secret !== "nodebench_dev_secret") {
            throw new Error("Unauthorized: Invalid MCP secret");
        }
        const query = ctx.db
            .query("agentMemory")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .order("desc");

        return args.limit ? await query.take(args.limit) : await query.take(50);
    },
});

/**
 * Service: Delete memory (called by MCP server)
 */
export const deleteMemoryAsService = mutation({
    args: {
        userId: v.id("users"),
        key: v.string(),
        secret: v.string(),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        if (args.secret !== "nodebench_dev_secret") {
            throw new Error("Unauthorized: Invalid MCP secret");
        }
        const memory = await ctx.db
            .query("agentMemory")
            .withIndex("by_user_key", (q) => q.eq("userId", args.userId).eq("key", args.key))
            .first();

        if (memory) {
            await ctx.db.delete(memory._id);
        }
        return null;
    },
});
