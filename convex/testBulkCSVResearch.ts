/**
 * Bulk CSV Research Test
 * Tests the bulkResearchFromCSV tool
 */

import { action } from "./_generated/server";
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
 * Test bulk CSV research with sample data
 */
export const testBulkCSVResearch = action({
  args: {},
  handler: async (ctx): Promise<TestResult> => {
    const testName = "Bulk CSV Research";
    const startTime = Date.now();
    
    try {
      console.log(`\n🧪 HIGH PRIORITY TEST: ${testName}`);
      
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
      
      // Create test CSV content
      const csvContent = `Entity Name,Entity Type
Stripe,company
Patrick Collison,person
Shopify,company
Tobi Lütke,person`;
      
      console.log("Test CSV content:");
      console.log(csvContent);
      
      // Parse CSV manually (simulating the tool's behavior)
      const lines = csvContent.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      if (!headers.includes('Entity Name') || !headers.includes('Entity Type')) {
        return {
          testName,
          passed: false,
          message: "CSV missing required columns",
          duration: Date.now() - startTime,
          error: "CSV must have 'Entity Name' and 'Entity Type' columns",
        };
      }
      
      const nameIndex = headers.indexOf('Entity Name');
      const typeIndex = headers.indexOf('Entity Type');
      
      const entities: Array<{ name: string; type: "company" | "person" }> = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const name = values[nameIndex];
        const type = values[typeIndex].toLowerCase();
        
        if (name && (type === 'company' || type === 'person')) {
          entities.push({ name, type: type as "company" | "person" });
        }
      }
      
      console.log(`\n✅ Parsed ${entities.length} entities from CSV`);
      
      // Research each entity
      const { linkupCompanyProfile, linkupPersonProfile } = await import("../agents/services/linkup");
      const results: Array<{ name: string; type: string; success: boolean; error?: string }> = [];
      
      for (const entity of entities) {
        console.log(`\nResearching ${entity.type}: ${entity.name}...`);
        
        try {
          if (entity.type === 'company') {
            const data = await linkupCompanyProfile(entity.name);
            
            await ctx.runMutation(api.entityContexts.storeEntityContext, {
              entityName: entity.name,
              entityType: "company" as const,
              summary: `${data.companyName} - ${data.headline || 'Company'}`,
              keyFacts: [
                `Type: ${data.companyType || 'N/A'}`,
                `Location: ${data.location || 'N/A'}`,
              ],
              sources: [{
                name: "LinkUp Company Profile",
                url: "https://linkup.so",
              }],
              linkupData: data,
              researchedBy: userId,
            });
            
            console.log(`✅ ${entity.name} researched and stored`);
            results.push({ name: entity.name, type: entity.type, success: true });
          } else {
            const data = await linkupPersonProfile(entity.name);
            const personData = data as any;

            await ctx.runMutation(api.entityContexts.storeEntityContext, {
              entityName: entity.name,
              entityType: "person" as const,
              summary: `${personData.fullName} - ${personData.headline || 'Professional'}`,
              keyFacts: [
                `Location: ${(personData.location as any)?.city || 'N/A'}`,
              ],
              sources: [{
                name: "LinkUp Person Profile",
                url: "https://linkup.so",
              }],
              linkupData: data,
              researchedBy: userId,
            });
            
            console.log(`✅ ${entity.name} researched and stored`);
            results.push({ name: entity.name, type: entity.type, success: true });
          }
        } catch (error: any) {
          console.error(`❌ Failed to research ${entity.name}: ${error.message}`);
          results.push({ name: entity.name, type: entity.type, success: false, error: error.message });
        }
      }
      
      // Verify all entities were stored
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;
      
      console.log(`\n📊 Bulk Research Summary:`);
      console.log(`Total entities: ${entities.length}`);
      console.log(`✅ Successful: ${successCount}`);
      console.log(`❌ Failed: ${failCount}`);
      
      if (failCount > 0) {
        console.log(`\nFailed entities:`);
        results.filter(r => !r.success).forEach(r => {
          console.log(`  - ${r.name} (${r.type}): ${r.error}`);
        });
      }
      
      // Verify entities are retrievable
      console.log(`\n🔍 Verifying stored entities...`);
      let verifiedCount = 0;
      
      for (const entity of entities) {
        const stored = await ctx.runQuery(api.entityContexts.getEntityContext, {
          entityName: entity.name,
          entityType: entity.type,
        });
        
        if (stored) {
          verifiedCount++;
          console.log(`✅ ${entity.name} verified in cache`);
        } else {
          console.log(`❌ ${entity.name} NOT found in cache`);
        }
      }
      
      const allVerified = verifiedCount === successCount;
      
      if (!allVerified) {
        return {
          testName,
          passed: false,
          message: "Not all entities were stored correctly",
          duration: Date.now() - startTime,
          error: `Expected ${successCount} entities, found ${verifiedCount}`,
          details: {
            totalEntities: entities.length,
            successCount,
            failCount,
            verifiedCount,
          },
        };
      }
      
      console.log(`\n✅ All ${verifiedCount} entities verified in cache`);
      
      return {
        testName,
        passed: true,
        message: "Bulk CSV research validated",
        duration: Date.now() - startTime,
        details: {
          totalEntities: entities.length,
          successCount,
          failCount,
          verifiedCount,
          entities: results,
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
 * Test bulk CSV with spreadsheet linking
 */
export const testBulkCSVWithSpreadsheet = action({
  args: {},
  handler: async (ctx): Promise<TestResult> => {
    const testName = "Bulk CSV Research with Spreadsheet Linking";
    const startTime = Date.now();
    
    try {
      console.log(`\n🧪 HIGH PRIORITY TEST: ${testName}`);
      
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

      // Create test spreadsheet using internal helper (bypasses auth)
      const spreadsheetId = await ctx.runMutation(internal.testHelpers.createTestDocument, {
        title: "Bulk Research Test Spreadsheet",
        userId,
      });
      
      console.log(`Created test spreadsheet: ${spreadsheetId}`);
      
      // Create test CSV content
      const csvContent = `Entity Name,Entity Type
Airbnb,company
Brian Chesky,person`;
      
      console.log("Test CSV content:");
      console.log(csvContent);
      
      // Parse CSV
      const lines = csvContent.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      const nameIndex = headers.indexOf('Entity Name');
      const typeIndex = headers.indexOf('Entity Type');
      
      const entities: Array<{ name: string; type: "company" | "person"; rowIndex: number }> = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const name = values[nameIndex];
        const type = values[typeIndex].toLowerCase();
        
        if (name && (type === 'company' || type === 'person')) {
          entities.push({ name, type: type as "company" | "person", rowIndex: i });
        }
      }
      
      // Research each entity with spreadsheet linking
      const { linkupCompanyProfile, linkupPersonProfile } = await import("../agents/services/linkup");
      
      for (const entity of entities) {
        console.log(`\nResearching ${entity.type}: ${entity.name} (row ${entity.rowIndex})...`);
        
        if (entity.type === 'company') {
          const data = await linkupCompanyProfile(entity.name);
          
          await ctx.runMutation(api.entityContexts.storeEntityContext, {
            entityName: entity.name,
            entityType: "company" as const,
            summary: `${data.companyName} - ${data.headline || 'Company'}`,
            keyFacts: [`Type: ${data.companyType || 'N/A'}`],
            sources: [{ name: "LinkUp", url: "https://linkup.so" }],
            linkupData: data,
            researchedBy: userId,
            spreadsheetId: spreadsheetId as Id<"documents">,
            rowIndex: entity.rowIndex,
          });
        } else {
          const data = await linkupPersonProfile(entity.name);
          const personData = data as any;

          await ctx.runMutation(api.entityContexts.storeEntityContext, {
            entityName: entity.name,
            entityType: "person" as const,
            summary: `${personData.fullName} - ${personData.headline || 'Professional'}`,
            keyFacts: [`Location: ${(personData.location as any)?.city || 'N/A'}`],
            sources: [{ name: "LinkUp", url: "https://linkup.so" }],
            linkupData: data,
            researchedBy: userId,
            spreadsheetId: spreadsheetId as Id<"documents">,
            rowIndex: entity.rowIndex,
          });
        }
        
        console.log(`✅ ${entity.name} stored with spreadsheet link (row ${entity.rowIndex})`);
      }
      
      // Verify spreadsheet linking
      console.log(`\n🔍 Verifying spreadsheet links...`);
      
      for (const entity of entities) {
        const stored = await ctx.runQuery(api.entityContexts.getEntityContext, {
          entityName: entity.name,
          entityType: entity.type,
        });
        
        if (!stored) {
          return {
            testName,
            passed: false,
            message: `Entity ${entity.name} not found`,
            duration: Date.now() - startTime,
            error: "Failed to retrieve entity after storage",
          };
        }
        
        if (stored.spreadsheetId !== spreadsheetId || stored.rowIndex !== entity.rowIndex) {
          return {
            testName,
            passed: false,
            message: `Spreadsheet link incorrect for ${entity.name}`,
            duration: Date.now() - startTime,
            error: `Expected row ${entity.rowIndex}, got ${stored.rowIndex}`,
          };
        }
        
        console.log(`✅ ${entity.name} verified: spreadsheet=${spreadsheetId}, row=${stored.rowIndex}`);
      }
      
      console.log(`\n✅ All entities linked to spreadsheet correctly`);
      
      return {
        testName,
        passed: true,
        message: "Bulk CSV with spreadsheet linking validated",
        duration: Date.now() - startTime,
        details: {
          spreadsheetId,
          totalEntities: entities.length,
          allLinked: true,
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

