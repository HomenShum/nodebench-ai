// convex/testQueryPatterns.ts
// Test both query patterns: Criteria-based search and Named company list with CRM

import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";

/**
 * Test Query Pattern 1: Criteria-Based Search
 * "Find companies: $2M+ seed, healthcare, founded 2022+, experienced founders"
 */
export const testCriteriaSearch = action({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    console.log("\n========== TEST: Query Pattern 1 - Criteria-Based Search ==========\n");
    
    const startTime = Date.now();
    
    try {
      // Create EntityResearchAgent
      const { createEntityResearchAgent } = await import("./agents/specializedAgents");
      const agent = createEntityResearchAgent(ctx, args.userId);
      
      // Simulate calling the searchCompaniesByCriteria tool
      console.log("🔍 Searching for companies matching criteria...");
      console.log("Criteria:");
      console.log("  - Minimum Funding: $2M");
      console.log("  - Industry: healthcare");
      console.log("  - Founded After: 2022");
      console.log("  - Require Founder Experience: true");
      
      // Note: In a real scenario, this would be called through the agent
      // For testing, we'll simulate the search
      const criteria = {
        minFunding: "$2M",
        industry: "healthcare",
        minFoundingYear: 2022,
        requireFounderExperience: true,
        maxResults: 10,
      };
      
      console.log("\n✅ Criteria search tool configured");
      console.log("Expected Results: 5-10 companies matching all criteria");
      console.log("Expected Duration: 30-60 seconds");
      
      const duration = Date.now() - startTime;
      console.log(`\n⏱️ Test setup completed in ${duration}ms`);
      
      return {
        pattern: "Criteria-Based Search",
        status: "configured",
        criteria,
        expectedResults: "5-10 companies",
        expectedDuration: "30-60 seconds",
        setupTime: duration,
      };
    } catch (error) {
      console.error("❌ Test failed:", error);
      throw error;
    }
  },
});

/**
 * Test Query Pattern 2: Named Company List + CRM
 * "Research: Stripe, Shopify, Square, Plaid, Brex + 15 CRM fields"
 */
export const testNamedCompanyListWithCRM = action({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<any> => {
    console.log("\n========== TEST: Query Pattern 2 - Named Company List + CRM ==========\n");
    
    const startTime = Date.now();
    const companies = ["Stripe", "Shopify", "Square", "Plaid", "Brex"];
    
    try {
      console.log("🔍 Researching companies with CRM fields...");
      console.log(`Companies: ${companies.join(", ")}`);
      
      const crmFields = [
        "Company Name",
        "Description",
        "Headline",
        "HQ Location",
        "City",
        "State",
        "Country",
        "Website",
        "Email",
        "Phone",
        "Founders",
        "Founders Background",
        "Key People",
        "Industry",
        "Company Type",
        "Founding Year",
        "Product",
        "Target Market",
        "Business Model",
        "Funding Stage",
        "Total Funding",
        "Last Funding Date",
        "Investors",
        "Investor Background",
        "Competitors",
        "Competitor Analysis",
        "FDA Approval Status",
        "FDA Timeline",
        "Recent News",
        "Partnerships",
      ];
      
      console.log(`\n📋 CRM Fields to Extract (${crmFields.length}):`);
      crmFields.forEach((field, i) => {
        console.log(`  ${i + 1}. ${field}`);
      });
      
      // Simulate research for each company
      const results = [];
      for (const company of companies) {
        console.log(`\n📊 Researching ${company}...`);
        
        // Check if cached
        const cached: any = await ctx.runQuery(api.entityContexts.getEntityContext, {
          entityName: company,
          entityType: "company",
        });

        if (cached?.crmFields) {
          console.log(`  ✅ Found in cache (${cached.ageInDays} days old)`);
          results.push({
            company,
            status: "cached",
            crmFieldsCount: Object.keys(cached.crmFields).length,
            completeness: cached.crmFields.completenessScore,
            dataQuality: cached.crmFields.dataQuality,
          });
        } else {
          console.log(`  ⏳ Would research from LinkUp API`);
          results.push({
            company,
            status: "would-research",
            crmFieldsCount: 0,
            completeness: 0,
            dataQuality: "incomplete",
          });
        }
      }
      
      const duration = Date.now() - startTime;
      
      console.log(`\n📈 Summary:`);
      console.log(`  - Companies researched: ${results.length}`);
      console.log(`  - Cached: ${results.filter(r => r.status === 'cached').length}`);
      console.log(`  - Would research: ${results.filter(r => r.status === 'would-research').length}`);
      console.log(`  - Duration: ${duration}ms`);
      
      return {
        pattern: "Named Company List + CRM",
        status: "configured",
        companies,
        crmFieldsCount: crmFields.length,
        results,
        expectedDuration: "60-120 seconds",
        actualSetupTime: duration,
      };
    } catch (error) {
      console.error("❌ Test failed:", error);
      throw error;
    }
  },
});

/**
 * Test CSV Export
 */
export const testCSVExport = action({
  args: {
    userId: v.id("users"),
    companyNames: v.array(v.string()),
  },
  handler: async (ctx, args): Promise<any> => {
    console.log("\n========== TEST: CSV Export ==========\n");
    
    const startTime = Date.now();
    
    try {
      console.log(`📥 Exporting ${args.companyNames.length} companies to CSV...`);
      
      const { generateCSVWithMetadata, generateSummaryReport } = await import("./agents/csvExport");
      
      // Fetch CRM fields for each company
      const crmFieldsArray: any[] = [];
      for (const companyName of args.companyNames) {
        const cached: any = await ctx.runQuery(api.entityContexts.getEntityContext, {
          entityName: companyName,
          entityType: "company",
        });

        if (cached?.crmFields) {
          crmFieldsArray.push(cached.crmFields);
          console.log(`  ✅ ${companyName}`);
        } else {
          console.log(`  ⚠️ ${companyName} - not in cache`);
        }
      }
      
      if (crmFieldsArray.length === 0) {
        console.log("❌ No companies found in cache");
        return { status: "failed", message: "No companies found in cache" };
      }
      
      // Generate CSV
      const csv = generateCSVWithMetadata(crmFieldsArray, {
        title: "Company Research Export",
        description: `Research data for ${crmFieldsArray.length} companies`,
        generatedAt: new Date(),
      });
      
      // Generate summary
      const summary = generateSummaryReport(crmFieldsArray);
      
      const duration = Date.now() - startTime;
      
      console.log(`\n✅ Export complete in ${duration}ms`);
      console.log(`📊 Summary:\n${summary}`);
      
      return {
        status: "success",
        companiesExported: crmFieldsArray.length,
        csvSize: csv.length,
        duration,
      };
    } catch (error) {
      console.error("❌ Export failed:", error);
      throw error;
    }
  },
});

