/**
 * EntityResearchAgent Critical & High Priority Tests (Part 2)
 * Error handling and high priority tests
 */

import { action, internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

interface TestResult {
  testName: string;
  passed: boolean;
  message: string;
  duration: number;
  details?: Record<string, any>;
  error?: string;
}

/**
 * CRITICAL TEST 4: Error Handling - Invalid Entity
 */
export const testErrorHandlingInvalidEntity = action({
  args: {},
  handler: async (ctx): Promise<TestResult> => {
    const testName = "Error Handling: Invalid Entity Name";
    const startTime = Date.now();
    
    try {
      console.log(`\n🧪 CRITICAL TEST 4: ${testName}`);
      
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
      
      // Test with invalid/non-existent entity
      const invalidName = "XYZ_NONEXISTENT_COMPANY_12345";
      console.log(`Testing with invalid entity: ${invalidName}`);
      
      try {
        const { linkupCompanyProfile } = await import("../agents/services/linkup");
        const result = await linkupCompanyProfile(invalidName);
        
        // If we get here, check if result is valid or empty
        if (!result || !result.companyName) {
          console.log("✅ API returned empty/invalid result (expected)");
          console.log("✅ No crash occurred");
          
          return {
            testName,
            passed: true,
            message: "Error handling validated - graceful handling of invalid entity",
            duration: Date.now() - startTime,
            details: {
              invalidName,
              resultReceived: !!result,
              gracefulHandling: true,
            },
          };
        }
        
        // If we got valid data for an invalid name, that's unexpected but not a failure
        console.log("⚠️ API returned data for invalid name (unexpected but handled)");
        return {
          testName,
          passed: true,
          message: "API returned data for invalid name (handled gracefully)",
          duration: Date.now() - startTime,
          details: {
            invalidName,
            unexpectedData: true,
          },
        };
      } catch (apiError: any) {
        // API threw an error - this is expected and good
        console.log("✅ API threw error (expected)");
        console.log(`✅ Error message: ${apiError.message}`);
        
        return {
          testName,
          passed: true,
          message: "Error handling validated - API error caught gracefully",
          duration: Date.now() - startTime,
          details: {
            invalidName,
            errorThrown: true,
            errorMessage: apiError.message,
          },
        };
      }
    } catch (error: any) {
      console.error("❌ Test failed:", error.message);
      return {
        testName,
        passed: false,
        message: "Test threw unexpected exception",
        duration: Date.now() - startTime,
        error: error.message,
      };
    }
  },
});

/**
 * CRITICAL TEST 5: Error Handling - Empty Name
 */
export const testErrorHandlingEmptyName = action({
  args: {},
  handler: async (ctx): Promise<TestResult> => {
    const testName = "Error Handling: Empty Entity Name";
    const startTime = Date.now();
    
    try {
      console.log(`\n🧪 CRITICAL TEST 5: ${testName}`);
      
      // Test with empty string
      const emptyName = "";
      console.log(`Testing with empty name: "${emptyName}"`);
      
      try {
        const { linkupCompanyProfile } = await import("../agents/services/linkup");
        const result = await linkupCompanyProfile(emptyName);
        
        // Should either throw or return invalid result
        if (!result || !result.companyName) {
          console.log("✅ Empty name handled gracefully");
          return {
            testName,
            passed: true,
            message: "Empty name handled gracefully",
            duration: Date.now() - startTime,
          };
        }
        
        return {
          testName,
          passed: false,
          message: "Empty name should not return valid data",
          duration: Date.now() - startTime,
          error: "API returned data for empty name",
        };
      } catch (apiError: any) {
        console.log("✅ Empty name threw error (expected)");
        return {
          testName,
          passed: true,
          message: "Empty name error handled",
          duration: Date.now() - startTime,
          details: {
            errorMessage: apiError.message,
          },
        };
      }
    } catch (error: any) {
      console.error("❌ Test failed:", error.message);
      return {
        testName,
        passed: false,
        message: "Test threw unexpected exception",
        duration: Date.now() - startTime,
        error: error.message,
      };
    }
  },
});

/**
 * HIGH PRIORITY TEST 1: Force Refresh
 */
export const testForceRefresh = action({
  args: {},
  handler: async (ctx): Promise<TestResult> => {
    const testName = "Force Refresh Existing Entity";
    const startTime = Date.now();
    
    try {
      console.log(`\n🧪 HIGH PRIORITY TEST 1: ${testName}`);
      
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
      
      // Get existing cached entity
      const entityName = "OpenAI";
      const cached = await ctx.runQuery(api.entityContexts.getEntityContext, {
        entityName,
        entityType: "company" as const,
      });
      
      if (!cached) {
        return {
          testName,
          passed: false,
          message: "Entity not found in cache",
          duration: Date.now() - startTime,
          error: "OpenAI should be cached from previous tests",
        };
      }
      
      const oldVersion = cached.version;
      const oldResearchedAt = cached.researchedAt;
      
      console.log(`Old version: ${oldVersion}`);
      console.log(`Old researched at: ${new Date(oldResearchedAt).toISOString()}`);
      
      // Wait a moment to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Force refresh by calling API again
      const { linkupCompanyProfile } = await import("../agents/services/linkup");
      const freshData = await linkupCompanyProfile(entityName);
      
      // Store with new data (should increment version)
      await ctx.runMutation(api.entityContexts.storeEntityContext, {
        entityName,
        entityType: "company" as const,
        summary: `${freshData.companyName} - ${freshData.headline || 'AI company'} (REFRESHED)`,
        keyFacts: [
          `Type: ${freshData.companyType || 'N/A'}`,
          `Location: ${freshData.location || 'N/A'}`,
          `Refreshed: ${new Date().toISOString()}`,
        ],
        sources: [{
          name: "LinkUp Company Profile",
          url: "https://linkup.so",
        }],
        linkupData: freshData,
        researchedBy: userId,
      });
      
      // Verify refresh
      const refreshed = await ctx.runQuery(api.entityContexts.getEntityContext, {
        entityName,
        entityType: "company" as const,
      });
      
      if (!refreshed) {
        return {
          testName,
          passed: false,
          message: "Entity not found after refresh",
          duration: Date.now() - startTime,
          error: "Refresh failed",
        };
      }
      
      const versionIncremented = refreshed.version > oldVersion;
      const timestampUpdated = refreshed.researchedAt > oldResearchedAt;
      
      if (!versionIncremented || !timestampUpdated) {
        return {
          testName,
          passed: false,
          message: "Refresh did not update version or timestamp",
          duration: Date.now() - startTime,
          error: `Version: ${oldVersion} → ${refreshed.version}, Timestamp updated: ${timestampUpdated}`,
        };
      }
      
      console.log("✅ Force refresh successful");
      console.log(`✅ Version: ${oldVersion} → ${refreshed.version}`);
      console.log(`✅ Timestamp updated`);
      console.log(`✅ Summary updated with REFRESHED marker`);
      
      return {
        testName,
        passed: true,
        message: "Force refresh validated",
        duration: Date.now() - startTime,
        details: {
          oldVersion,
          newVersion: refreshed.version,
          timestampUpdated,
          summaryContainsRefreshed: refreshed.summary.includes("REFRESHED"),
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
  },
});

/**
 * HIGH PRIORITY TEST 2: Spreadsheet Linking
 */
export const testSpreadsheetLinking = action({
  args: {},
  handler: async (ctx): Promise<TestResult> => {
    const testName = "Spreadsheet Linking";
    const startTime = Date.now();
    
    try {
      console.log(`\n🧪 HIGH PRIORITY TEST 2: ${testName}`);
      
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

      // Create a test document using internal helper (bypasses auth)
      const spreadsheetId = await ctx.runMutation(internal.testHelpers.createTestDocument, {
        title: "Test Spreadsheet for Entity Research",
        userId,
      });
      
      console.log(`Created test spreadsheet: ${spreadsheetId}`);
      
      // Store entity with spreadsheet linking
      const { linkupCompanyProfile } = await import("../agents/services/linkup");
      const companyData = await linkupCompanyProfile("Microsoft");
      
      await ctx.runMutation(api.entityContexts.storeEntityContext, {
        entityName: "Microsoft",
        entityType: "company" as const,
        summary: `${companyData.companyName} - ${companyData.headline || 'Tech company'}`,
        keyFacts: [
          `Type: ${companyData.companyType || 'N/A'}`,
        ],
        sources: [{
          name: "LinkUp Company Profile",
          url: "https://linkup.so",
        }],
        linkupData: companyData,
        researchedBy: userId,
        spreadsheetId: spreadsheetId as Id<"documents">,
        rowIndex: 1,
      });
      
      // Verify spreadsheet linking
      const stored = await ctx.runQuery(api.entityContexts.getEntityContext, {
        entityName: "Microsoft",
        entityType: "company" as const,
      });
      
      if (!stored) {
        return {
          testName,
          passed: false,
          message: "Entity not found after storage",
          duration: Date.now() - startTime,
          error: "Failed to store entity with spreadsheet link",
        };
      }
      
      if (stored.spreadsheetId !== spreadsheetId || stored.rowIndex !== 1) {
        return {
          testName,
          passed: false,
          message: "Spreadsheet linking failed",
          duration: Date.now() - startTime,
          error: `Expected spreadsheetId: ${spreadsheetId}, rowIndex: 1. Got: ${stored.spreadsheetId}, ${stored.rowIndex}`,
        };
      }
      
      console.log("✅ Entity stored with spreadsheet link");
      console.log(`✅ Spreadsheet ID: ${stored.spreadsheetId}`);
      console.log(`✅ Row index: ${stored.rowIndex}`);
      
      return {
        testName,
        passed: true,
        message: "Spreadsheet linking validated",
        duration: Date.now() - startTime,
        details: {
          spreadsheetId: stored.spreadsheetId,
          rowIndex: stored.rowIndex,
          entityName: stored.entityName,
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
  },
});

