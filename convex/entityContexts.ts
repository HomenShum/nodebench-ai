// convex/entityContexts.ts
// Entity context storage for caching company/person research results

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "./_generated/dataModel";

/**
 * Store or update entity research context
 */
export const storeEntityContext = mutation({
  args: {
    entityName: v.string(),
    entityType: v.union(v.literal("company"), v.literal("person")),
    linkupData: v.optional(v.any()),
    summary: v.string(),
    keyFacts: v.array(v.string()),
    sources: v.array(v.object({
      name: v.string(),
      url: v.string(),
      snippet: v.optional(v.string()),
    })),
    crmFields: v.optional(v.any()), // NEW: CRM fields
    spreadsheetId: v.optional(v.id("documents")),
    rowIndex: v.optional(v.number()),
    researchedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if entity context already exists
    const existing = await ctx.db
      .query("entityContexts")
      .withIndex("by_entity", (q) =>
        q.eq("entityName", args.entityName).eq("entityType", args.entityType)
      )
      .first();

    if (existing) {
      // Update existing context
      await ctx.db.patch(existing._id, {
        linkupData: args.linkupData,
        summary: args.summary,
        keyFacts: args.keyFacts,
        sources: args.sources,
        crmFields: args.crmFields, // NEW
        spreadsheetId: args.spreadsheetId,
        rowIndex: args.rowIndex,
        researchedAt: now,
        researchedBy: args.researchedBy,
        lastAccessedAt: now,
        version: existing.version + 1,
        isStale: false,
      });

      console.log(`[entityContexts] Updated context for ${args.entityType}: ${args.entityName}`);
      return existing._id;
    } else {
      // Create new context
      const id = await ctx.db.insert("entityContexts", {
        entityName: args.entityName,
        entityType: args.entityType,
        linkupData: args.linkupData,
        summary: args.summary,
        keyFacts: args.keyFacts,
        sources: args.sources,
        crmFields: args.crmFields, // NEW
        spreadsheetId: args.spreadsheetId,
        rowIndex: args.rowIndex,
        researchedAt: now,
        researchedBy: args.researchedBy,
        lastAccessedAt: now,
        accessCount: 0,
        version: 1,
        isStale: false,
      });

      console.log(`[entityContexts] Created context for ${args.entityType}: ${args.entityName}`);
      return id;
    }
  },
});

/**
 * Get entity research context by name and type
 */
export const getEntityContext = query({
  args: {
    entityName: v.string(),
    entityType: v.union(v.literal("company"), v.literal("person")),
  },
  handler: async (ctx, args) => {
    const context = await ctx.db
      .query("entityContexts")
      .withIndex("by_entity", (q) =>
        q.eq("entityName", args.entityName).eq("entityType", args.entityType)
      )
      .first();
    
    if (!context) {
      return null;
    }
    
    // Check if stale (> 7 days)
    const age = Date.now() - context.researchedAt;
    const isStale = age > 7 * 24 * 60 * 60 * 1000;
    
    return {
      ...context,
      isStale,
      ageInDays: Math.floor(age / (1000 * 60 * 60 * 24)),
    };
  },
});

/**
 * Update access count when entity context is used
 */
export const updateAccessCount = mutation({
  args: {
    id: v.id("entityContexts"),
  },
  handler: async (ctx, args) => {
    const context = await ctx.db.get(args.id);
    if (!context) {
      throw new Error("Entity context not found");
    }
    
    await ctx.db.patch(args.id, {
      lastAccessedAt: Date.now(),
      accessCount: context.accessCount + 1,
    });
    
    console.log(`[entityContexts] Cache hit for ${context.entityType}: ${context.entityName} (count: ${context.accessCount + 1})`);
  },
});

/**
 * List all entity contexts for a user
 */
export const listEntityContexts = query({
  args: {
    entityType: v.optional(v.union(v.literal("company"), v.literal("person"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }
    
    const results = await ctx.db
      .query("entityContexts")
      .withIndex("by_user", (q) => q.eq("researchedBy", userId))
      .collect();
    
    // Filter by entity type if specified
    const filtered = args.entityType
      ? results.filter((r) => r.entityType === args.entityType)
      : results;
    
    // Sort by most recently accessed
    const sorted = filtered.sort((a, b) => b.lastAccessedAt - a.lastAccessedAt);
    
    // Limit results
    const limited = args.limit ? sorted.slice(0, args.limit) : sorted;
    
    // Add age and stale flag
    return limited.map((context) => {
      const age = Date.now() - context.researchedAt;
      const isStale = age > 7 * 24 * 60 * 60 * 1000;
      
      return {
        ...context,
        isStale,
        ageInDays: Math.floor(age / (1000 * 60 * 60 * 24)),
      };
    });
  },
});

/**
 * Search entity contexts by name
 */
export const searchEntityContexts = query({
  args: {
    searchTerm: v.string(),
    entityType: v.optional(v.union(v.literal("company"), v.literal("person"))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }
    
    const results = await ctx.db
      .query("entityContexts")
      .withSearchIndex("search_entity", (q) =>
        q.search("entityName", args.searchTerm)
          .eq("researchedBy", userId)
      )
      .collect();
    
    // Filter by entity type if specified
    const filtered = args.entityType
      ? results.filter((r) => r.entityType === args.entityType)
      : results;
    
    // Add age and stale flag
    return filtered.map((context) => {
      const age = Date.now() - context.researchedAt;
      const isStale = age > 7 * 24 * 60 * 60 * 1000;
      
      return {
        ...context,
        isStale,
        ageInDays: Math.floor(age / (1000 * 60 * 60 * 24)),
      };
    });
  },
});

/**
 * Delete entity context
 */
export const deleteEntityContext = mutation({
  args: {
    id: v.id("entityContexts"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    
    const context = await ctx.db.get(args.id);
    if (!context) {
      throw new Error("Entity context not found");
    }
    
    // Only allow deletion if user owns the context
    if (context.researchedBy !== userId) {
      throw new Error("Not authorized to delete this context");
    }
    
    await ctx.db.delete(args.id);
    console.log(`[entityContexts] Deleted context for ${context.entityType}: ${context.entityName}`);
  },
});

/**
 * Mark stale contexts (> 7 days old)
 */
export const markStaleContexts = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    
    const contexts = await ctx.db.query("entityContexts").collect();
    
    let markedCount = 0;
    for (const context of contexts) {
      if (context.researchedAt < sevenDaysAgo && !context.isStale) {
        await ctx.db.patch(context._id, { isStale: true });
        markedCount++;
      }
    }
    
    console.log(`[entityContexts] Marked ${markedCount} contexts as stale`);
    return { markedCount };
  },
});

/**
 * Get entity context statistics
 */
export const getEntityContextStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    
    const contexts = await ctx.db
      .query("entityContexts")
      .withIndex("by_user", (q) => q.eq("researchedBy", userId))
      .collect();
    
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    
    const stats = {
      total: contexts.length,
      companies: contexts.filter((c) => c.entityType === "company").length,
      people: contexts.filter((c) => c.entityType === "person").length,
      fresh: contexts.filter((c) => c.researchedAt >= sevenDaysAgo).length,
      stale: contexts.filter((c) => c.researchedAt < sevenDaysAgo).length,
      totalCacheHits: contexts.reduce((sum, c) => sum + c.accessCount, 0),
      mostAccessed: contexts.sort((a, b) => b.accessCount - a.accessCount).slice(0, 5),
    };
    
    return stats;
  },
});
