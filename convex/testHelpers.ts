/**
 * Test Helper Functions
 * Utilities to bypass auth and other test constraints
 */

import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

/**
 * Strategy 1: Internal Mutation to Create Test Documents
 * Bypasses authentication by using internalMutation
 */
export const createTestDocument = internalMutation({
  args: {
    title: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<Id<"documents">> => {
    // Create document directly without auth check
    const documentId = await ctx.db.insert("documents", {
      title: args.title,
      createdBy: args.userId,
      isPublic: false,
    });

    return documentId;
  },
});

/**
 * Strategy 2: Get Test User
 * Returns the first user in the database for testing
 */
export const getTestUser = internalQuery({
  args: {},
  handler: async (ctx): Promise<Id<"users"> | null> => {
    const users = await ctx.db.query("users").first();
    return users?._id ?? null;
  },
});

/**
 * Strategy 3: Create Test User
 * Creates a dedicated test user if none exists
 */
export const createTestUser = internalMutation({
  args: {
    email: v.optional(v.string()),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"users">> => {
    // Check if test user already exists
    const existingUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email ?? "test@example.com"))
      .first();
    
    if (existingUser) {
      return existingUser._id;
    }
    
    // Create new test user
    const userId = await ctx.db.insert("users", {
      email: args.email ?? "test@example.com",
      name: args.name ?? "Test User",
    });

    return userId;
  },
});

/**
 * Strategy 4: Clean Up Test Data
 * Removes test documents and entities created during testing
 */
export const cleanupTestData = internalMutation({
  args: {
    testPrefix: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const prefix = args.testPrefix ?? "Test";
    
    // Delete test documents
    const testDocs = await ctx.db
      .query("documents")
      .filter((q) => q.eq(q.field("title"), prefix))
      .collect();
    
    for (const doc of testDocs) {
      await ctx.db.delete(doc._id);
    }
    
    // Delete test entities
    const testEntities = await ctx.db
      .query("entityContexts")
      .filter((q) => q.eq(q.field("entityName"), prefix))
      .collect();
    
    for (const entity of testEntities) {
      await ctx.db.delete(entity._id);
    }
    
    return {
      documentsDeleted: testDocs.length,
      entitiesDeleted: testEntities.length,
    };
  },
});

/**
 * Strategy 5: Create Entity Context Without Auth
 * Directly inserts entity context bypassing auth checks
 */
export const createTestEntityContext = internalMutation({
  args: {
    entityName: v.string(),
    entityType: v.union(v.literal("company"), v.literal("person")),
    userId: v.id("users"),
    spreadsheetId: v.optional(v.id("documents")),
    rowIndex: v.optional(v.number()),
    linkupData: v.optional(v.any()),
  },
  handler: async (ctx, args): Promise<Id<"entityContexts">> => {
    const entityId = await ctx.db.insert("entityContexts", {
      entityName: args.entityName,
      entityType: args.entityType,
      summary: `Test entity: ${args.entityName}`,
      keyFacts: ["Test fact 1", "Test fact 2"],
      sources: [{
        name: "Test Source",
        url: "https://test.com",
      }],
      linkupData: args.linkupData,
      spreadsheetId: args.spreadsheetId,
      rowIndex: args.rowIndex,
      researchedAt: Date.now(),
      researchedBy: args.userId,
      lastAccessedAt: Date.now(),
      accessCount: 0,
      version: 1,
      isStale: false,
    });
    
    return entityId;
  },
});

/**
 * Strategy 6: Get All Test Entities
 * Returns all entities for testing/verification
 */
export const getAllTestEntities = internalQuery({
  args: {},
  handler: async (ctx) => {
    const entities = await ctx.db.query("entityContexts").collect();
    return entities;
  },
});

/**
 * Strategy 7: Get All Test Documents
 * Returns all documents for testing/verification
 */
export const getAllTestDocuments = internalQuery({
  args: {},
  handler: async (ctx) => {
    const documents = await ctx.db.query("documents").collect();
    return documents;
  },
});

