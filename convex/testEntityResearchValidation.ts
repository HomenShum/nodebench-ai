/**
 * EntityResearchAgent Validation Test Suite
 * Comprehensive tests with pass/fail validation for real API calls
 */

import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

interface TestResult {
  testName: string;
  passed: boolean;
  message: string;
  duration: number;
  details?: Record<string, any>;
  error?: string;
}

interface TestSuiteResult {
  totalTests: number;
  passed: number;
  failed: number;
  duration: number;
  results: TestResult[];
}

/**
 * Run all EntityResearchAgent validation tests
 */
export const runAllTests = action({
  args: {},
  handler: async (ctx): Promise<TestSuiteResult> => {
    console.log("🚀 Starting EntityResearchAgent Validation Test Suite");
    const suiteStartTime = Date.now();
    
    const results: TestResult[] = [];
    
    // Test 1: Company Research with Real API Call
    results.push(await testCompanyResearch(ctx));
    
    // Test 2: Person Research with Real API Call
    results.push(await testPersonResearch(ctx));
    
    // Test 3: Cache Hit Validation
    results.push(await testCacheHit(ctx));
    
    // Test 4: Cache Staleness Detection
    results.push(await testStalenessDetection(ctx));
    
    // Test 5: Entity Context Retrieval
    results.push(await testEntityRetrieval(ctx));
    
    const suiteDuration = Date.now() - suiteStartTime;
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    
    console.log("\n" + "=".repeat(80));
    console.log("📊 TEST SUITE SUMMARY");
    console.log("=".repeat(80));
    console.log(`Total Tests: ${results.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏱️  Duration: ${suiteDuration}ms`);
    console.log("=".repeat(80));
    
    results.forEach((result, index) => {
      const icon = result.passed ? "✅" : "❌";
      console.log(`${icon} ${index + 1}. ${result.testName} (${result.duration}ms)`);
      if (!result.passed && result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });
    
    return {
      totalTests: results.length,
      passed,
      failed,
      duration: suiteDuration,
      results,
    };
  },
});

/**
 * Test 1: Company Research with Real API Call
 */
async function testCompanyResearch(ctx: any): Promise<TestResult> {
  const testName = "Company Research (Anthropic) - Real API Call";
  const startTime = Date.now();
  
  try {
    console.log(`\n🧪 TEST 1: ${testName}`);
    
    // Get test user
    const users = await ctx.runQuery(api.users.list);
    if (!users || users.length === 0) {
      return {
        testName,
        passed: false,
        message: "No users found",
        duration: Date.now() - startTime,
        error: "Test requires at least one user in the database",
      };
    }
    const userId = users[0]._id as Id<"users">;
    
    // Call LinkUp API
    const { linkupCompanyProfile } = await import("../agents/services/linkup");
    const companyData = await linkupCompanyProfile("Anthropic");
    
    // Validate API response
    if (!companyData || !companyData.companyName) {
      return {
        testName,
        passed: false,
        message: "LinkUp API returned invalid data",
        duration: Date.now() - startTime,
        error: "Missing companyName in response",
      };
    }
    
    // Store in database
    await ctx.runMutation(api.entityContexts.storeEntityContext, {
      entityName: "Anthropic",
      entityType: "company" as const,
      summary: `${companyData.companyName} - ${companyData.headline || 'AI company'}`,
      keyFacts: [
        `Type: ${companyData.companyType || 'N/A'}`,
        `Location: ${companyData.location || 'N/A'}`,
        `Website: ${companyData.website || 'N/A'}`,
      ],
      sources: [{
        name: "LinkUp Company Profile",
        url: "https://linkup.so",
        snippet: "Comprehensive company data from LinkUp API",
      }],
      linkupData: companyData,
      researchedBy: userId,
    });
    
    // Verify storage
    const stored = await ctx.runQuery(api.entityContexts.getEntityContext, {
      entityName: "Anthropic",
      entityType: "company" as const,
    });
    
    if (!stored) {
      return {
        testName,
        passed: false,
        message: "Failed to store entity in database",
        duration: Date.now() - startTime,
        error: "Entity not found after storage",
      };
    }
    
    console.log("✅ API call successful");
    console.log("✅ Data stored in database");
    console.log(`✅ Company: ${companyData.companyName}`);
    console.log(`✅ Fields received: ${Object.keys(companyData).length}`);
    
    return {
      testName,
      passed: true,
      message: "Company research completed successfully",
      duration: Date.now() - startTime,
      details: {
        companyName: companyData.companyName,
        fieldsReceived: Object.keys(companyData).length,
        stored: true,
        cacheAge: stored.ageInDays,
      },
    };
  } catch (error: any) {
    console.error("❌ Test failed:", error.message);
    return {
      testName,
      passed: false,
      message: "Test threw an exception",
      duration: Date.now() - startTime,
      error: error.message,
    };
  }
}

/**
 * Test 2: Person Research with Real API Call
 */
async function testPersonResearch(ctx: any): Promise<TestResult> {
  const testName = "Person Research (Sam Altman) - Real API Call";
  const startTime = Date.now();
  
  try {
    console.log(`\n🧪 TEST 2: ${testName}`);
    
    // Get test user
    const users = await ctx.runQuery(api.users.list, {});
    if (!users || users.length === 0) {
      return {
        testName,
        passed: false,
        message: "No users found",
        duration: Date.now() - startTime,
        error: "Test requires at least one user in the database",
      };
    }
    const userId = users[0]._id as Id<"users">;

    // Call LinkUp API
    const { linkupPersonProfile } = await import("../agents/services/linkup");
    const personData = await linkupPersonProfile("Sam Altman, OpenAI");
    const person = personData as any;

    // Validate API response
    if (!personData || !person.fullName) {
      return {
        testName,
        passed: false,
        message: "LinkUp API returned invalid data",
        duration: Date.now() - startTime,
        error: "Missing fullName in response",
      };
    }
    
    // Store in database
    await ctx.runMutation(api.entityContexts.storeEntityContext, {
      entityName: "Sam Altman",
      entityType: "person" as const,
      summary: `${person.fullName} - ${person.headline || 'Tech executive'}`,
      keyFacts: [
        `Location: ${(person.location as any)?.city || 'N/A'}`,
        `Current Role: ${person.headline || 'N/A'}`,
      ],
      sources: [{
        name: "LinkUp Person Profile",
        url: "https://linkup.so",
        snippet: "Comprehensive person data from LinkUp API",
      }],
      linkupData: personData,
      researchedBy: userId,
    });
    
    // Verify storage
    const stored = await ctx.runQuery(api.entityContexts.getEntityContext, {
      entityName: "Sam Altman",
      entityType: "person" as const,
    });
    
    if (!stored) {
      return {
        testName,
        passed: false,
        message: "Failed to store entity in database",
        duration: Date.now() - startTime,
        error: "Entity not found after storage",
      };
    }
    
    console.log("✅ API call successful");
    console.log("✅ Data stored in database");
    console.log(`✅ Person: ${personData.fullName}`);
    console.log(`✅ Fields received: ${Object.keys(personData).length}`);
    
    return {
      testName,
      passed: true,
      message: "Person research completed successfully",
      duration: Date.now() - startTime,
      details: {
        personName: personData.fullName,
        fieldsReceived: Object.keys(personData).length,
        stored: true,
        cacheAge: stored.ageInDays,
      },
    };
  } catch (error: any) {
    console.error("❌ Test failed:", error.message);
    return {
      testName,
      passed: false,
      message: "Test threw an exception",
      duration: Date.now() - startTime,
      error: error.message,
    };
  }
}

/**
 * Test 3: Cache Hit Validation
 */
async function testCacheHit(ctx: any): Promise<TestResult> {
  const testName = "Cache Hit Validation";
  const startTime = Date.now();
  
  try {
    console.log(`\n🧪 TEST 3: ${testName}`);
    
    // Get cached entity (Anthropic from Test 1)
    const cached = await ctx.runQuery(api.entityContexts.getEntityContext, {
      entityName: "Anthropic",
      entityType: "company" as const,
    });
    
    if (!cached) {
      return {
        testName,
        passed: false,
        message: "Entity not found in cache",
        duration: Date.now() - startTime,
        error: "Anthropic should be cached from Test 1",
      };
    }
    
    const previousAccessCount = cached.accessCount;
    
    // Update access count
    await ctx.runMutation(api.entityContexts.updateAccessCount, {
      id: cached._id,
    });
    
    // Verify access count incremented
    const updated = await ctx.runQuery(api.entityContexts.getEntityContext, {
      entityName: "Anthropic",
      entityType: "company" as const,
    });
    
    if (!updated || updated.accessCount !== previousAccessCount + 1) {
      return {
        testName,
        passed: false,
        message: "Access count did not increment",
        duration: Date.now() - startTime,
        error: `Expected ${previousAccessCount + 1}, got ${updated?.accessCount}`,
      };
    }
    
    console.log("✅ Cache hit detected");
    console.log(`✅ Access count: ${previousAccessCount} → ${updated.accessCount}`);
    console.log(`✅ Cache age: ${updated.ageInDays} days`);
    
    return {
      testName,
      passed: true,
      message: "Cache hit validation successful",
      duration: Date.now() - startTime,
      details: {
        previousAccessCount,
        newAccessCount: updated.accessCount,
        cacheAge: updated.ageInDays,
        isStale: updated.isStale,
      },
    };
  } catch (error: any) {
    console.error("❌ Test failed:", error.message);
    return {
      testName,
      passed: false,
      message: "Test threw an exception",
      duration: Date.now() - startTime,
      error: error.message,
    };
  }
}

/**
 * Test 4: Cache Staleness Detection
 */
async function testStalenessDetection(ctx: any): Promise<TestResult> {
  const testName = "Cache Staleness Detection";
  const startTime = Date.now();

  try {
    console.log(`\n🧪 TEST 4: ${testName}`);

    // Get cached entity
    const cached = await ctx.runQuery(api.entityContexts.getEntityContext, {
      entityName: "Anthropic",
      entityType: "company" as const,
    });

    if (!cached) {
      return {
        testName,
        passed: false,
        message: "Entity not found in cache",
        duration: Date.now() - startTime,
        error: "Anthropic should be cached from Test 1",
      };
    }

    // Fresh data should not be stale
    if (cached.isStale) {
      return {
        testName,
        passed: false,
        message: "Fresh data incorrectly marked as stale",
        duration: Date.now() - startTime,
        error: `Cache age: ${cached.ageInDays} days, isStale: ${cached.isStale}`,
      };
    }

    console.log("✅ Staleness detection working");
    console.log(`✅ Cache age: ${cached.ageInDays} days`);
    console.log(`✅ Is stale: ${cached.isStale}`);

    return {
      testName,
      passed: true,
      message: "Staleness detection validated",
      duration: Date.now() - startTime,
      details: {
        cacheAge: cached.ageInDays,
        isStale: cached.isStale,
        researchedAt: new Date(cached.researchedAt).toISOString(),
      },
    };
  } catch (error: any) {
    console.error("❌ Test failed:", error.message);
    return {
      testName,
      passed: false,
      message: "Test threw an exception",
      duration: Date.now() - startTime,
      error: error.message,
    };
  }
}

/**
 * Test 5: Entity Context Retrieval
 */
async function testEntityRetrieval(ctx: any): Promise<TestResult> {
  const testName = "Entity Context Retrieval";
  const startTime = Date.now();

  try {
    console.log(`\n🧪 TEST 5: ${testName}`);

    // Retrieve both entities
    const company = await ctx.runQuery(api.entityContexts.getEntityContext, {
      entityName: "Anthropic",
      entityType: "company" as const,
    });

    const person = await ctx.runQuery(api.entityContexts.getEntityContext, {
      entityName: "Sam Altman",
      entityType: "person" as const,
    });

    if (!company) {
      return {
        testName,
        passed: false,
        message: "Company entity not found",
        duration: Date.now() - startTime,
        error: "Anthropic should be in cache",
      };
    }

    if (!person) {
      return {
        testName,
        passed: false,
        message: "Person entity not found",
        duration: Date.now() - startTime,
        error: "Sam Altman should be in cache",
      };
    }

    // Validate data structure
    const companyValid = company.entityName && company.entityType === "company" &&
                        company.summary && company.keyFacts && company.sources;
    const personValid = person.entityName && person.entityType === "person" &&
                       person.summary && person.keyFacts && person.sources;

    if (!companyValid || !personValid) {
      return {
        testName,
        passed: false,
        message: "Entity data structure invalid",
        duration: Date.now() - startTime,
        error: `Company valid: ${companyValid}, Person valid: ${personValid}`,
      };
    }

    console.log("✅ Company entity retrieved");
    console.log("✅ Person entity retrieved");
    console.log(`✅ Company key facts: ${company.keyFacts.length}`);
    console.log(`✅ Person key facts: ${person.keyFacts.length}`);

    return {
      testName,
      passed: true,
      message: "Entity retrieval validated",
      duration: Date.now() - startTime,
      details: {
        companyFound: true,
        personFound: true,
        companyKeyFacts: company.keyFacts.length,
        personKeyFacts: person.keyFacts.length,
        companySources: company.sources.length,
        personSources: person.sources.length,
      },
    };
  } catch (error: any) {
    console.error("❌ Test failed:", error.message);
    return {
      testName,
      passed: false,
      message: "Test threw an exception",
      duration: Date.now() - startTime,
      error: error.message,
    };
  }
}
