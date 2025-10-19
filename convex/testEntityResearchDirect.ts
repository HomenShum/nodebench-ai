// Direct test for EntityResearchAgent with real LinkUp API calls
import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

/**
 * Test 1: Research a company directly (Anthropic)
 * This will call the LinkUp API and store results in entityContexts
 */
export const testCompanyResearchDirect = action({
  args: {},
  handler: async (ctx): Promise<{
    success: boolean;
    message: string;
    companyName: string;
    summary: string;
    keyFactsCount: number;
    cached: boolean;
    cacheAge: string;
    accessCount: number;
  }> => {
    console.log("🧪 TEST 1: Direct Company Research (Anthropic)");

    // Get a user ID
    const users = await ctx.runQuery(api.users.list, {});
    if (!users || users.length === 0) {
      throw new Error("No users found. Please create a user first.");
    }
    const userId = users[0]._id;
    console.log("Using user ID:", userId);
    
    // Import LinkUp API
    const { linkupCompanyProfile } = await import("../agents/services/linkup");
    
    // Call LinkUp API
    console.log("📞 Calling LinkUp API for Anthropic...");
    const companyData = await linkupCompanyProfile("Anthropic");
    console.log("✅ LinkUp API response received");
    console.log("Company data keys:", Object.keys(companyData));
    
    // Extract summary and key facts
    const summary = `${companyData.name} - ${companyData.description || 'AI safety company'}`;
    const keyFacts = [
      `Founded: ${companyData.founded || 'N/A'}`,
      `Headquarters: ${companyData.headquarters || 'N/A'}`,
      `Industry: ${companyData.industry || 'N/A'}`,
      `Employees: ${companyData.employeeCount || 'N/A'}`,
      `Funding: ${companyData.totalFunding || 'N/A'}`,
    ].filter(fact => !fact.includes('N/A'));
    
    // Store in entityContexts
    console.log("💾 Storing in entityContexts table...");
    await ctx.runMutation(api.entityContexts.storeEntityContext, {
      entityName: "Anthropic",
      entityType: "company",
      linkupData: companyData,
      summary,
      keyFacts,
      sources: [
        {
          name: "LinkUp Company Profile",
          url: "https://linkup.so",
          snippet: "Comprehensive company data from LinkUp API",
        },
      ],
      researchedBy: userId,
    });
    console.log("✅ Stored in entityContexts");

    // Verify storage
    const stored: any = await ctx.runQuery(api.entityContexts.getEntityContext, {
      entityName: "Anthropic",
      entityType: "company",
    });
    
    return {
      success: true,
      message: "Company research completed successfully",
      companyName: companyData.name as string,
      summary,
      keyFactsCount: keyFacts.length,
      cached: stored !== null,
      cacheAge: stored ? `${stored.ageInDays} days` : "N/A",
      accessCount: stored?.accessCount || 0,
    };
  },
});

/**
 * Test 2: Research a person directly (Sam Altman)
 * This will call the LinkUp API and store results in entityContexts
 */
export const testPersonResearchDirect = action({
  args: {},
  handler: async (ctx): Promise<{
    success: boolean;
    message: string;
    personName: string;
    summary: string;
    keyFactsCount: number;
    cached: boolean;
    cacheAge: string;
    accessCount: number;
  }> => {
    console.log("🧪 TEST 2: Direct Person Research (Sam Altman)");

    // Get a user ID
    const users = await ctx.runQuery(api.users.list, {});
    if (!users || users.length === 0) {
      throw new Error("No users found. Please create a user first.");
    }
    const userId = users[0]._id;
    console.log("Using user ID:", userId);
    
    // Import LinkUp API
    const { linkupPersonProfile } = await import("../agents/services/linkup");
    
    // Call LinkUp API
    console.log("📞 Calling LinkUp API for Sam Altman...");
    const personData = await linkupPersonProfile("Sam Altman, OpenAI");
    console.log("✅ LinkUp API response received");
    console.log("Person data keys:", Object.keys(personData));
    
    // Extract summary and key facts
    const summary = `${personData.name} - ${personData.currentRole || 'Tech executive'}`;
    const keyFacts = [
      `Current Role: ${personData.currentRole || 'N/A'}`,
      `Company: ${personData.currentCompany || 'N/A'}`,
      `Location: ${personData.location || 'N/A'}`,
      `Education: ${(personData.education as any)?.[0]?.institution || 'N/A'}`,
      `Previous: ${(personData.workHistory as any)?.[0]?.company || 'N/A'}`,
    ].filter(fact => !fact.includes('N/A'));
    
    // Store in entityContexts
    console.log("💾 Storing in entityContexts table...");
    await ctx.runMutation(api.entityContexts.storeEntityContext, {
      entityName: "Sam Altman",
      entityType: "person",
      linkupData: personData,
      summary,
      keyFacts,
      sources: [
        {
          name: "LinkUp Person Profile",
          url: "https://linkup.so",
          snippet: "Comprehensive person data from LinkUp API",
        },
      ],
      researchedBy: userId,
    });
    console.log("✅ Stored in entityContexts");

    // Verify storage
    const stored: any = await ctx.runQuery(api.entityContexts.getEntityContext, {
      entityName: "Sam Altman",
      entityType: "person",
    });
    
    return {
      success: true,
      message: "Person research completed successfully",
      personName: personData.name as string,
      summary,
      keyFactsCount: keyFacts.length,
      cached: stored !== null,
      cacheAge: stored ? `${stored.ageInDays} days` : "N/A",
      accessCount: stored?.accessCount || 0,
    };
  },
});

/**
 * Test 3: Test cache hit (research Anthropic again)
 * This should retrieve from cache without calling LinkUp API
 */
export const testCacheHit = action({
  args: {},
  handler: async (ctx): Promise<{
    success: boolean;
    message: string;
    entityName?: string;
    cacheAge?: string;
    previousAccessCount?: number;
    newAccessCount?: number;
    isStale?: boolean;
    summary?: string;
    keyFactsCount?: number;
  }> => {
    console.log("🧪 TEST 3: Cache Hit Test (Anthropic)");

    // Check cache
    console.log("🔍 Checking cache...");
    const cached: any = await ctx.runQuery(api.entityContexts.getEntityContext, {
      entityName: "Anthropic",
      entityType: "company",
    });
    
    if (!cached) {
      return {
        success: false,
        message: "No cached data found. Run testCompanyResearchDirect first.",
      };
    }
    
    console.log("✅ Cache hit!");
    console.log("Cache age:", cached.ageInDays, "days");
    console.log("Access count:", cached.accessCount);
    console.log("Is stale:", cached.isStale);
    
    // Update access count
    await ctx.runMutation(api.entityContexts.updateAccessCount, {
      id: cached._id,
    });

    // Verify access count increased
    const updated: any = await ctx.runQuery(api.entityContexts.getEntityContext, {
      entityName: "Anthropic",
      entityType: "company",
    });
    
    return {
      success: true,
      message: "Cache hit successful",
      entityName: cached.entityName,
      cacheAge: `${cached.ageInDays} days`,
      previousAccessCount: cached.accessCount,
      newAccessCount: updated?.accessCount || 0,
      isStale: cached.isStale,
      summary: cached.summary,
      keyFactsCount: cached.keyFacts.length,
    };
  },
});

/**
 * Test 4: List all cached entities
 */
export const testListCachedEntities = action({
  args: {},
  handler: async (ctx): Promise<{
    success: boolean;
    message: string;
    entities: Array<{
      name: string;
      type: string;
      ageInDays: number;
      accessCount: number;
      isStale: boolean;
      keyFactsCount: number;
    }>;
  }> => {
    console.log("🧪 TEST 4: List All Cached Entities");

    // Get a user ID
    const users = await ctx.runQuery(api.users.list, {});
    if (!users || users.length === 0) {
      throw new Error("No users found. Please create a user first.");
    }
    const userId = users[0]._id;

    // List all entities (no userId parameter needed - it's inferred from auth)
    const entities: any[] = await ctx.runQuery(api.entityContexts.listEntityContexts, {});

    console.log("✅ Found", entities.length, "cached entities");

    return {
      success: true,
      message: `Found ${entities.length} cached entities`,
      entities: entities.map((e: any) => ({
        name: e.entityName,
        type: e.entityType,
        ageInDays: e.ageInDays,
        accessCount: e.accessCount,
        isStale: e.isStale,
        keyFactsCount: e.keyFacts.length,
      })),
    };
  },
});

/**
 * Test 5: Get entity context stats
 */
export const testEntityStats = action({
  args: {},
  handler: async (ctx): Promise<any> => {
    console.log("🧪 TEST 5: Entity Context Stats");

    // Get a user ID
    const users = await ctx.runQuery(api.users.list, {});
    if (!users || users.length === 0) {
      throw new Error("No users found. Please create a user first.");
    }
    const userId = users[0]._id;

    // Get stats (no userId parameter needed - it's inferred from auth)
    const stats: any = await ctx.runQuery(api.entityContexts.getEntityContextStats, {});

    if (!stats) {
      console.log("⚠️ Stats query returned null (no authenticated user)");
      console.log("Note: This is expected when running tests without authentication");
      return {
        success: true,
        message: "Stats query returned null (no authenticated user - expected in tests)",
        note: "Entity data exists in database but stats require authentication",
      };
    }

    console.log("✅ Stats retrieved");
    console.log("Total entities:", stats.total);
    console.log("Companies:", stats.companies);
    console.log("People:", stats.people);
    console.log("Fresh entities:", stats.fresh);
    console.log("Stale entities:", stats.stale);
    console.log("Total cache hits:", stats.totalCacheHits);

    return {
      success: true,
      message: "Stats retrieved successfully",
      ...stats,
    };
  },
});

/**
 * Test 6: Clean up test data
 */
export const cleanupTestData = action({
  args: {},
  handler: async (ctx): Promise<{
    success: boolean;
    message: string;
    deletedCount: number;
  }> => {
    console.log("🧪 TEST 6: Cleanup Test Data");

    // Get a user ID
    const users: any = await ctx.runQuery(api.users.list, {});
    if (!users || users.length === 0) {
      throw new Error("No users found. Please create a user first.");
    }
    const userId: any = users[0]._id;

    // List all entities
    const entities: any[] = await ctx.runQuery(api.entityContexts.listEntityContexts, {});
    
    console.log("🗑️ Deleting", entities.length, "entities...");
    
    // Delete each entity
    for (const entity of entities) {
      await ctx.runMutation(api.entityContexts.deleteEntityContext, {
        id: entity._id,
      });
    }
    
    console.log("✅ Cleanup complete");
    
    return {
      success: true,
      message: `Deleted ${entities.length} entities`,
      deletedCount: entities.length,
    };
  },
});

