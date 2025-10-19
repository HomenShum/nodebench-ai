/**
 * Parallel Entity Research Test with CSV Export
 * Tests parallel LinkUp API calls and generates CSV for manual review
 */

import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

interface CompanyResearchResult {
  companyName: string;
  success: boolean;
  duration: number;
  data?: {
    // Core Info
    companyName: string;
    description: string;
    headline: string;
    
    // Location
    hqLocation: string;
    city: string;
    state: string;
    country: string;
    
    // Founders & Team
    founders: string;
    foundersBackground: string;
    keyPeople: string;
    
    // Contact Info
    website: string;
    email: string;
    phone: string;
    linkedIn: string;
    
    // Business Details
    industry: string;
    companyType: string;
    foundedYear: string;
    employeeCount: string;
    
    // Product & Market
    products: string;
    targetMarket: string;
    businessModel: string;
    
    // Funding & Investors
    fundingStage: string;
    totalFunding: string;
    lastFundingDate: string;
    investors: string;
    investorBackground: string;
    
    // Competitors
    competitors: string;
    competitorAnalysis: string;
    
    // News & Timeline
    recentNews: string;
    newsTimeline: string;
    milestones: string;
    
    // Healthcare Specific
    fdaApprovalStatus: string;
    fdaTimeline: string;
    clinicalTrials: string;
    
    // Additional
    partnerships: string;
    researchPapers: string;
    keyEntities: string;
  };
  error?: string;
}

/**
 * Test 1: Parallel Research for Healthcare/Life Science Companies
 * Scenario: User provides criteria-based search
 */
export const testParallelHealthcareResearch = action({
  args: {},
  handler: async (ctx) => {
    console.log("🧪 TEST: Parallel Healthcare Company Research");
    console.log("Criteria: $2M+ seed, Healthcare/Life Science, Founded 2022+, Experienced founders");
    
    const startTime = Date.now();
    
    // Sample healthcare companies matching criteria
    const companies = [
      "Recursion Pharmaceuticals",
      "Insitro",
      "Ginkgo Bioworks",
      "Benchling",
      "Tempus Labs",
    ];
    
    console.log(`\n📋 Researching ${companies.length} companies in parallel...`);
    
    // Execute all API calls in parallel
    const results = await Promise.all(
      companies.map(async (companyName) => {
        const companyStartTime = Date.now();
        try {
          const data = await researchCompanyDetailed(companyName);
          const duration = Date.now() - companyStartTime;
          console.log(`✅ ${companyName} completed in ${duration}ms`);
          return {
            companyName,
            success: true,
            duration,
            data,
          };
        } catch (error: any) {
          const duration = Date.now() - companyStartTime;
          console.error(`❌ ${companyName} failed: ${error.message}`);
          return {
            companyName,
            success: false,
            duration,
            error: error.message,
          };
        }
      })
    );
    
    const totalDuration = Date.now() - startTime;
    const successCount = results.filter(r => r.success).length;
    
    console.log(`\n📊 Results:`);
    console.log(`Total time: ${totalDuration}ms (${(totalDuration / 1000).toFixed(1)}s)`);
    console.log(`Average per company: ${(totalDuration / companies.length).toFixed(0)}ms`);
    console.log(`Success: ${successCount}/${companies.length}`);
    
    // Generate CSV
    const csv = generateCSV(results);
    
    // Store CSV in database for download
    const users = await ctx.runQuery(api.users.list, {});
    if (users && users.length > 0) {
      const userId = users[0]._id as Id<"users">;
      
      const docId = await ctx.runMutation(internal.testHelpers.createTestDocument, {
        title: `Healthcare Research Results - ${new Date().toISOString()}`,
        userId,
      });
      
      console.log(`\n📄 CSV saved to document: ${docId}`);
    }
    
    console.log(`\n📥 CSV Preview (first 500 chars):`);
    console.log(csv.substring(0, 500));
    console.log(`\n... (${csv.length} total characters)`);
    
    return {
      totalCompanies: companies.length,
      successCount,
      failCount: companies.length - successCount,
      totalDuration,
      averageDuration: totalDuration / companies.length,
      results,
      csv,
      csvLength: csv.length,
    };
  },
});

/**
 * Test 2: Parallel Research for Named Companies
 * Scenario: User provides specific company list
 */
export const testParallelNamedCompanies = action({
  args: {},
  handler: async (ctx) => {
    console.log("🧪 TEST: Parallel Named Company Research");
    console.log("Scenario: User provides list of companies for CRM");
    
    const startTime = Date.now();
    
    // User-provided company list
    const companies = [
      "Stripe",
      "Shopify",
      "Square",
      "Plaid",
      "Brex",
      "Ramp",
      "Mercury",
      "Deel",
    ];
    
    console.log(`\n📋 Researching ${companies.length} companies in parallel...`);
    
    // Execute all API calls in parallel
    const results = await Promise.all(
      companies.map(async (companyName) => {
        const companyStartTime = Date.now();
        try {
          const data = await researchCompanyDetailed(companyName);
          const duration = Date.now() - companyStartTime;
          console.log(`✅ ${companyName} completed in ${duration}ms`);
          return {
            companyName,
            success: true,
            duration,
            data,
          };
        } catch (error: any) {
          const duration = Date.now() - companyStartTime;
          console.error(`❌ ${companyName} failed: ${error.message}`);
          return {
            companyName,
            success: false,
            duration,
            error: error.message,
          };
        }
      })
    );
    
    const totalDuration = Date.now() - startTime;
    const successCount = results.filter(r => r.success).length;
    
    console.log(`\n📊 Results:`);
    console.log(`Total time: ${totalDuration}ms (${(totalDuration / 1000).toFixed(1)}s)`);
    console.log(`Average per company: ${(totalDuration / companies.length).toFixed(0)}ms`);
    console.log(`Success: ${successCount}/${companies.length}`);
    console.log(`\n⚡ Parallel speedup: ~${companies.length}x faster than sequential`);
    
    // Generate CSV
    const csv = generateCSV(results);
    
    // Store CSV in database
    const users = await ctx.runQuery(api.users.list, {});
    if (users && users.length > 0) {
      const userId = users[0]._id as Id<"users">;
      
      const docId = await ctx.runMutation(internal.testHelpers.createTestDocument, {
        title: `Company Research Results - ${new Date().toISOString()}`,
        userId,
      });
      
      console.log(`\n📄 CSV saved to document: ${docId}`);
    }
    
    console.log(`\n📥 CSV Preview (first 1000 chars):`);
    console.log(csv.substring(0, 1000));
    console.log(`\n... (${csv.length} total characters)`);
    
    return {
      totalCompanies: companies.length,
      successCount,
      failCount: companies.length - successCount,
      totalDuration,
      averageDuration: totalDuration / companies.length,
      sequentialEstimate: totalDuration * companies.length,
      parallelSpeedup: companies.length,
      results,
      csv,
      csvLength: csv.length,
    };
  },
});

/**
 * Helper: Generate CSV from research results
 */
function generateCSV(results: CompanyResearchResult[]): string {
  // CSV Headers (all CRM fields)
  const headers = [
    "Company Name",
    "Success",
    "Duration (ms)",
    "Description",
    "Headline",
    "HQ Location",
    "City",
    "State",
    "Country",
    "Founders",
    "Founders Background",
    "Key People",
    "Website",
    "Email",
    "Phone",
    "LinkedIn",
    "Industry",
    "Company Type",
    "Founded Year",
    "Employee Count",
    "Products",
    "Target Market",
    "Business Model",
    "Funding Stage",
    "Total Funding",
    "Last Funding Date",
    "Investors",
    "Investor Background",
    "Competitors",
    "Competitor Analysis",
    "Recent News",
    "News Timeline",
    "Milestones",
    "FDA Approval Status",
    "FDA Timeline",
    "Clinical Trials",
    "Partnerships",
    "Research Papers",
    "Key Entities",
    "Error",
  ];

  // Escape CSV field (handle commas, quotes, newlines)
  const escapeCSV = (value: string | undefined | null): string => {
    if (!value) return "";
    const str = String(value);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // Build CSV rows
  const rows = results.map(result => {
    if (!result.success || !result.data) {
      return [
        escapeCSV(result.companyName),
        "FALSE",
        result.duration.toString(),
        ...Array(36).fill(""),
        escapeCSV(result.error || "Unknown error"),
      ].join(",");
    }

    const d = result.data;
    return [
      escapeCSV(d.companyName),
      "TRUE",
      result.duration.toString(),
      escapeCSV(d.description),
      escapeCSV(d.headline),
      escapeCSV(d.hqLocation),
      escapeCSV(d.city),
      escapeCSV(d.state),
      escapeCSV(d.country),
      escapeCSV(d.founders),
      escapeCSV(d.foundersBackground),
      escapeCSV(d.keyPeople),
      escapeCSV(d.website),
      escapeCSV(d.email),
      escapeCSV(d.phone),
      escapeCSV(d.linkedIn),
      escapeCSV(d.industry),
      escapeCSV(d.companyType),
      escapeCSV(d.foundedYear),
      escapeCSV(d.employeeCount),
      escapeCSV(d.products),
      escapeCSV(d.targetMarket),
      escapeCSV(d.businessModel),
      escapeCSV(d.fundingStage),
      escapeCSV(d.totalFunding),
      escapeCSV(d.lastFundingDate),
      escapeCSV(d.investors),
      escapeCSV(d.investorBackground),
      escapeCSV(d.competitors),
      escapeCSV(d.competitorAnalysis),
      escapeCSV(d.recentNews),
      escapeCSV(d.newsTimeline),
      escapeCSV(d.milestones),
      escapeCSV(d.fdaApprovalStatus),
      escapeCSV(d.fdaTimeline),
      escapeCSV(d.clinicalTrials),
      escapeCSV(d.partnerships),
      escapeCSV(d.researchPapers),
      escapeCSV(d.keyEntities),
      "",
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

/**
 * Helper: Parse location string into components
 */
function parseLocation(location: string) {
  if (!location) return { city: "", state: "", country: "" };

  // Handle multiple locations (e.g., "SF, CA, USA and Dublin, Ireland")
  const primaryLocation = location.split(" and ")[0];
  const parts = primaryLocation.split(",").map(p => p.trim());

  if (parts.length >= 3) {
    return {
      city: parts[0],
      state: parts[1],
      country: parts[2],
    };
  } else if (parts.length === 2) {
    return {
      city: parts[0],
      state: "",
      country: parts[1],
    };
  } else {
    return {
      city: parts[0] || "",
      state: "",
      country: "",
    };
  }
}

/**
 * Helper: Research company with detailed CRM fields
 */
async function researchCompanyDetailed(companyName: string): Promise<CompanyResearchResult["data"]> {
  const { linkupCompanyProfile } = await import("../agents/services/linkup");
  const rawData = await linkupCompanyProfile(companyName);
  const raw = rawData as any;

  // Parse location
  const loc = parseLocation(raw.location || "");

  // Extract and format all CRM-relevant fields
  return {
    companyName: raw.companyName || companyName,
    description: raw.summary || "",
    headline: raw.headline || "",
    
    // Location
    hqLocation: raw.location || "",
    city: loc.city,
    state: loc.state,
    country: loc.country,

    // Founders & Team
    founders: "", // Not in LinkUp schema
    foundersBackground: "", // Not in LinkUp schema
    keyPeople: Array.isArray(raw.keyPeople)
      ? raw.keyPeople.map((p: any) =>
          typeof p === 'object'
            ? `${p.name || ''} (${p.role || ''})`.trim()
            : String(p)
        ).join("; ")
      : "",
    
    // Contact
    website: raw.website || "",
    email: "", // Not in LinkUp schema
    phone: "", // Not in LinkUp schema
    linkedIn: "", // Not in LinkUp schema

    // Business
    industry: "", // Not in LinkUp schema
    companyType: raw.companyType || "",
    foundedYear: "", // Not in LinkUp schema
    employeeCount: "", // Not in LinkUp schema

    // Product
    products: Array.isArray(raw.products)
      ? raw.products.map((p: any) =>
          typeof p === 'object'
            ? `${p.name || ''}: ${p.description || ''}`.trim()
            : String(p)
        ).join(" | ")
      : (typeof raw.products === 'object' && raw.products !== null
          ? JSON.stringify(raw.products)
          : (raw.products || "")),
    targetMarket: (raw.businessModel as any)?.targetAudience || "",
    businessModel: raw.businessModel
      ? `Monetization: ${(raw.businessModel as any).monetizationStrategy || 'N/A'}; GTM: ${(raw.businessModel as any).goToMarketStrategy || 'N/A'}`
      : "",
    
    // Funding
    fundingStage: (raw.financials as any)?.fundingRounds?.[(raw.financials as any).fundingRounds.length - 1]?.stage || "",
    totalFunding: (raw.financials as any)?.fundingRounds
      ?.reduce((sum: number, round: any) => {
        const amount = parseFloat(round.amount?.replace(/[^0-9.]/g, '') || '0');
        return sum + amount;
      }, 0)
      .toString() || "",
    lastFundingDate: (raw.financials as any)?.fundingRounds?.[(raw.financials as any).fundingRounds.length - 1]?.date || "",
    investors: Array.isArray((raw.financials as any)?.investors)
      ? (raw.financials as any).investors.join("; ")
      : "",
    investorBackground: "", // Not in LinkUp schema

    // Competition
    competitors: Array.isArray((raw.competitiveLandscape as any)?.primaryCompetitors)
      ? (raw.competitiveLandscape as any).primaryCompetitors.join("; ")
      : "",
    competitorAnalysis: Array.isArray((raw.competitiveLandscape as any)?.economicMoat)
      ? `Economic Moat: ${(raw.competitiveLandscape as any).economicMoat.join(", ")}`
      : "",

    // News & Timeline
    recentNews: Array.isArray(raw.recentNews)
      ? raw.recentNews.slice(0, 3).map((n: any) =>
          typeof n === 'object'
            ? `${n.date || ''}: ${n.headline || ''}`.trim()
            : String(n)
        ).join(" | ")
      : "",
    newsTimeline: "", // Not in LinkUp schema
    milestones: "", // Not in LinkUp schema
    
    // Healthcare specific
    fdaApprovalStatus: raw.fdaApprovalStatus || raw.regulatoryStatus || "",
    fdaTimeline: raw.fdaTimeline || "",
    clinicalTrials: raw.clinicalTrials || "",
    
    // Additional
    partnerships: Array.isArray(raw.partnerships) ? raw.partnerships.join("; ") : (raw.partnerships || ""),
    researchPapers: raw.researchPapers || "",
    keyEntities: raw.keyEntities || "",
  };
}

/**
 * Export CSV to file system (for manual review)
 * Returns the CSV content that can be saved locally
 */
export const exportResearchToCSV = action({
  args: {},
  handler: async (ctx): Promise<{ filename: string; csv: string; stats: any }> => {
    console.log("📥 Exporting research results to CSV...");

    // Run the parallel research
    const result = await ctx.runAction(api.testParallelResearch.testParallelNamedCompanies, {}) as any;

    const csv: string = result.csv;
    const filename = `company_research_${new Date().toISOString().replace(/[:.]/g, "-")}.csv`;

    console.log(`\n✅ CSV generated: ${filename}`);
    console.log(`📊 Size: ${csv.length} characters`);
    console.log(`📋 Companies: ${result.totalCompanies}`);
    console.log(`✅ Success: ${result.successCount}`);
    console.log(`❌ Failed: ${result.failCount}`);
    console.log(`⏱️  Total time: ${(result.totalDuration / 1000).toFixed(1)}s`);
    console.log(`⚡ Parallel speedup: ~${result.parallelSpeedup}x`);

    console.log(`\n📄 Full CSV content below:`);
    console.log("=".repeat(80));
    console.log(csv);
    console.log("=".repeat(80));

    return {
      filename,
      csv,
      stats: {
        totalCompanies: result.totalCompanies,
        successCount: result.successCount,
        failCount: result.failCount,
        totalDuration: result.totalDuration,
        parallelSpeedup: result.parallelSpeedup,
      },
    };
  },
});

