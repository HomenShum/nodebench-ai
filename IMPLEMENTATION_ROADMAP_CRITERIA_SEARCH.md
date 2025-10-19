# Implementation Roadmap: Criteria-Based Search & Enhanced CRM Fields
**Date**: 2025-10-19  
**Priority**: HIGH  
**Estimated Effort**: 15-22 hours (2-3 days)

---

## 🎯 Objective

Enable Fast Agent multi-agent orchestration to handle:

1. **Criteria-Based Search**: Find companies matching specific criteria (funding, industry, founding year, founder experience)
2. **Enhanced CRM Fields**: Extract comprehensive CRM data including phones, emails, FDA timelines, investor backgrounds, competitor analysis

---

## 📋 Implementation Plan

### **Phase 1: Criteria-Based Search Tool** (Priority 1)

**Goal**: Enable Query Pattern 1 - "Find companies: $2M+ seed, healthcare, founded 2022+, experienced founders"

**Estimated Effort**: 4-6 hours

#### **Step 1.1: Add `searchCompaniesByCriteria` Tool**

**File**: `convex/agents/specializedAgents.ts`

**Location**: Inside `createEntityResearchAgent()` function, add to `tools` object

```typescript
searchCompaniesByCriteria: createTool({
  description: "Search for companies matching specific criteria (funding stage, industry, founding year, founder experience). Returns a list of companies that match ALL specified criteria.",
  args: z.object({
    fundingStage: z.enum(["pre-seed", "seed", "series-a", "series-b", "series-c", "series-d", "growth", "any"]).optional()
      .describe("Funding stage filter"),
    minFunding: z.number().optional()
      .describe("Minimum funding amount in millions (e.g., 2 for $2M+)"),
    maxFunding: z.number().optional()
      .describe("Maximum funding amount in millions"),
    industry: z.string().optional()
      .describe("Industry filter (e.g., 'healthcare', 'fintech', 'life science')"),
    foundedAfter: z.number().optional()
      .describe("Founded after this year (e.g., 2022)"),
    foundedBefore: z.number().optional()
      .describe("Founded before this year"),
    founderExperience: z.enum(["first-time", "experienced", "serial", "any"]).optional()
      .describe("Founder experience level"),
    location: z.string().optional()
      .describe("Geographic location (e.g., 'San Francisco', 'United States')"),
    maxResults: z.number().default(10)
      .describe("Maximum number of results to return"),
  }),
  handler: async (_toolCtx: ActionCtx, args): Promise<string> => {
    console.log(`[searchCompaniesByCriteria] Starting search with criteria:`, args);

    // 1. Build search query for LinkUp
    const queryParts: string[] = [];
    
    if (args.industry) {
      queryParts.push(`${args.industry} companies`);
    }
    
    if (args.fundingStage && args.fundingStage !== "any") {
      queryParts.push(`${args.fundingStage} funding`);
    }
    
    if (args.minFunding) {
      queryParts.push(`raised $${args.minFunding}M+`);
    }
    
    if (args.foundedAfter) {
      queryParts.push(`founded after ${args.foundedAfter}`);
    }
    
    if (args.founderExperience && args.founderExperience !== "any") {
      queryParts.push(`${args.founderExperience} founders`);
    }
    
    if (args.location) {
      queryParts.push(`based in ${args.location}`);
    }
    
    const searchQuery = queryParts.join(" ");
    console.log(`[searchCompaniesByCriteria] Search query: "${searchQuery}"`);

    // 2. Call LinkUp API with deep search to find candidate companies
    const { linkupStructuredSearch } = await import("../../agents/services/linkup");
    
    const companyListSchema = {
      type: "object",
      properties: {
        companies: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              description: { type: "string" },
              fundingStage: { type: "string" },
              totalFunding: { type: "string" },
              foundedYear: { type: "number" },
              industry: { type: "string" },
            },
          },
        },
      },
    };
    
    const searchResults = await linkupStructuredSearch(
      searchQuery,
      companyListSchema,
      "deep"
    );
    
    const candidateCompanies = (searchResults as any)?.structured?.companies || [];
    console.log(`[searchCompaniesByCriteria] Found ${candidateCompanies.length} candidate companies`);
    
    if (candidateCompanies.length === 0) {
      return `No companies found matching criteria: ${searchQuery}`;
    }

    // 3. Research each candidate company in parallel (batches of 5)
    const batchSize = 5;
    const allResearchResults: any[] = [];
    
    for (let i = 0; i < candidateCompanies.length; i += batchSize) {
      const batch = candidateCompanies.slice(i, i + batchSize);
      console.log(`[searchCompaniesByCriteria] Researching batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(candidateCompanies.length / batchSize)}`);
      
      const batchResults = await Promise.all(
        batch.map(async (company: any) => {
          try {
            // Check cache first
            const cached = await ctx.runQuery(api.entityContexts.getEntityContext, {
              entityName: company.name,
              entityType: "company",
            });
            
            if (cached && !cached.isStale) {
              console.log(`[searchCompaniesByCriteria] Cache hit: ${company.name}`);
              return { name: company.name, data: cached.linkupData, cached: true };
            }
            
            // Research company
            const { linkupCompanyProfile } = await import("../../agents/services/linkup");
            const data = await linkupCompanyProfile(company.name);
            
            // Store in cache
            await ctx.runMutation(api.entityContexts.storeEntityContext, {
              entityName: company.name,
              entityType: "company",
              linkupData: data,
              summary: (data as any).summary || "",
              keyFacts: [],
              sources: [],
              researchedBy: userId,
            });
            
            return { name: company.name, data, cached: false };
          } catch (error) {
            console.error(`[searchCompaniesByCriteria] Failed to research ${company.name}:`, error);
            return { name: company.name, error: String(error) };
          }
        })
      );
      
      allResearchResults.push(...batchResults);
    }

    // 4. Filter by criteria
    const filteredCompanies = allResearchResults.filter((result) => {
      if (result.error) return false;
      
      const data = result.data as any;
      
      // Funding filter
      if (args.minFunding) {
        const totalFunding = parseFundingAmount(data.financials?.totalFunding);
        if (totalFunding < args.minFunding) return false;
      }
      
      if (args.maxFunding) {
        const totalFunding = parseFundingAmount(data.financials?.totalFunding);
        if (totalFunding > args.maxFunding) return false;
      }
      
      // Industry filter
      if (args.industry) {
        const industry = String(data.industry || "").toLowerCase();
        if (!industry.includes(args.industry.toLowerCase())) return false;
      }
      
      // Founding year filter
      if (args.foundedAfter) {
        const foundedYear = parseInt(data.foundedYear || "0");
        if (foundedYear < args.foundedAfter) return false;
      }
      
      if (args.foundedBefore) {
        const foundedYear = parseInt(data.foundedYear || "9999");
        if (foundedYear > args.foundedBefore) return false;
      }
      
      // Founder experience filter
      if (args.founderExperience && args.founderExperience !== "any") {
        const hasExperiencedFounders = checkFounderExperience(data.keyPeople, args.founderExperience);
        if (!hasExperiencedFounders) return false;
      }
      
      return true;
    });
    
    console.log(`[searchCompaniesByCriteria] ${filteredCompanies.length} companies match criteria`);
    
    // 5. Format results
    const limitedResults = filteredCompanies.slice(0, args.maxResults);
    
    let report = `**Criteria-Based Search Results**\n\n`;
    report += `🔍 **Search Criteria:**\n`;
    if (args.fundingStage) report += `- Funding Stage: ${args.fundingStage}\n`;
    if (args.minFunding) report += `- Min Funding: $${args.minFunding}M+\n`;
    if (args.industry) report += `- Industry: ${args.industry}\n`;
    if (args.foundedAfter) report += `- Founded After: ${args.foundedAfter}\n`;
    if (args.founderExperience) report += `- Founder Experience: ${args.founderExperience}\n`;
    if (args.location) report += `- Location: ${args.location}\n`;
    report += `\n`;
    
    report += `📊 **Results:** ${limitedResults.length} companies found\n\n`;
    
    limitedResults.forEach((result, idx) => {
      const data = result.data as any;
      report += `**${idx + 1}. ${result.name}**\n`;
      report += `${data.summary?.substring(0, 150) || "No description"}...\n`;
      report += `- Industry: ${data.industry || "N/A"}\n`;
      report += `- Founded: ${data.foundedYear || "N/A"}\n`;
      report += `- Funding: ${data.financials?.totalFunding || "N/A"}\n`;
      report += `- Location: ${data.location || "N/A"}\n`;
      report += `${result.cached ? "💾 (from cache)" : "🆕 (newly researched)"}\n\n`;
    });
    
    report += `✅ All companies cached for instant follow-up questions!`;
    
    return report;
  },
}),
```

#### **Step 1.2: Add Helper Functions**

**File**: `convex/agents/specializedAgents.ts`

**Location**: Outside the agent creation functions, at the top level

```typescript
/**
 * Parse funding amount from string (e.g., "$2.5M" -> 2.5, "$100K" -> 0.1)
 */
function parseFundingAmount(fundingStr: string | undefined): number {
  if (!fundingStr) return 0;
  
  const str = String(fundingStr).toUpperCase();
  const match = str.match(/([\d.]+)\s*([KMB])?/);
  
  if (!match) return 0;
  
  const amount = parseFloat(match[1]);
  const unit = match[2];
  
  if (unit === "K") return amount / 1000; // Convert to millions
  if (unit === "B") return amount * 1000; // Convert to millions
  return amount; // Already in millions
}

/**
 * Check if founders have the specified experience level
 */
function checkFounderExperience(
  keyPeople: any[] | undefined,
  experienceLevel: "first-time" | "experienced" | "serial"
): boolean {
  if (!keyPeople || keyPeople.length === 0) return false;
  
  // This is a simplified check - in production, you'd want to:
  // 1. Identify which keyPeople are founders
  // 2. Research their backgrounds
  // 3. Check for previous founding experience
  
  // For now, we'll use a heuristic based on the data we have
  const founders = keyPeople.filter((person: any) => {
    const role = String(person.role || "").toLowerCase();
    return role.includes("founder") || role.includes("ceo") || role.includes("co-founder");
  });
  
  if (founders.length === 0) return false;
  
  // Placeholder logic - in production, research each founder's background
  // For now, assume if we have founder data, they meet the criteria
  return true;
}
```

#### **Step 1.3: Update CoordinatorAgent Instructions**

**File**: `convex/agents/specializedAgents.ts`

**Location**: Inside `createCoordinatorAgent()` function, update instructions

Add to the examples section:
```typescript
- "Find healthcare companies with $2M+ seed funding" → IMMEDIATELY call delegateToEntityResearchAgent("Find healthcare companies with $2M+ seed funding")
- "Show me fintech startups founded after 2022" → IMMEDIATELY call delegateToEntityResearchAgent("Show me fintech startups founded after 2022")
```

---

### **Phase 2: Enhanced CRM Field Extraction** (Priority 2)

**Goal**: Extract comprehensive CRM fields for Query Pattern 2

**Estimated Effort**: 8-12 hours

#### **Step 2.1: Extend entityContexts Schema**

**File**: `convex/schema.ts`

**Location**: In the `entityContexts` table definition

```typescript
entityContexts: defineTable({
  entityName: v.string(),
  entityType: v.union(v.literal("company"), v.literal("person")),
  summary: v.string(),
  keyFacts: v.array(v.string()),
  sources: v.array(v.object({
    name: v.string(),
    url: v.string(),
  })),
  linkupData: v.any(),
  researchedBy: v.id("users"),
  researchedAt: v.number(),
  accessCount: v.number(),
  
  // NEW: CRM-specific fields
  crmFields: v.optional(v.object({
    // Contact
    phones: v.optional(v.array(v.string())),
    emails: v.optional(v.array(v.string())),
    
    // Founders
    founders: v.optional(v.array(v.object({
      name: v.string(),
      role: v.string(),
      background: v.optional(v.string()),
    }))),
    
    // FDA (healthcare-specific)
    fdaTimeline: v.optional(v.array(v.object({
      date: v.string(),
      event: v.string(),
      status: v.string(),
    }))),
    
    // News Timeline
    newsTimeline: v.optional(v.array(v.object({
      date: v.string(),
      headline: v.string(),
      source: v.string(),
      url: v.string(),
    }))),
    
    // Investors
    investorDetails: v.optional(v.array(v.object({
      name: v.string(),
      background: v.string(),
      otherInvestments: v.array(v.string()),
    }))),
    
    // Competitors
    competitorDetails: v.optional(v.array(v.object({
      name: v.string(),
      rationale: v.string(),
      funding: v.string(),
      developmentStage: v.string(),
    }))),
    
    // Research
    researchPapers: v.optional(v.array(v.object({
      title: v.string(),
      authors: v.array(v.string()),
      url: v.string(),
      year: v.number(),
    }))),
  })),
})
```

#### **Step 2.2: Create CRM Field Extraction Helpers**

**File**: `convex/agents/crmExtraction.ts` (NEW FILE)

```typescript
// convex/agents/crmExtraction.ts
// CRM field extraction helpers for entity research

import { ActionCtx } from "../_generated/server";
import { api } from "../_generated/api";

/**
 * Extract comprehensive CRM fields from LinkUp data
 */
export async function extractCRMFields(
  ctx: ActionCtx,
  linkupData: any,
  companyName: string,
  userId: string
) {
  const crmFields: any = {};
  
  // Extract phones and emails (requires additional search)
  const contactInfo = await extractContactInfo(companyName);
  crmFields.phones = contactInfo.phones;
  crmFields.emails = contactInfo.emails;
  
  // Extract and research founders
  crmFields.founders = await extractFounders(ctx, linkupData.keyPeople, userId);
  
  // Extract FDA timeline (healthcare-specific)
  if (isHealthcareCompany(linkupData)) {
    crmFields.fdaTimeline = await extractFDATimeline(companyName);
  }
  
  // Build news timeline
  crmFields.newsTimeline = await buildNewsTimeline(companyName);
  
  // Research investors
  if (linkupData.financials?.investors) {
    crmFields.investorDetails = await researchInvestors(
      ctx,
      linkupData.financials.investors,
      userId
    );
  }
  
  // Research competitors
  if (linkupData.competitiveLandscape?.primaryCompetitors) {
    crmFields.competitorDetails = await researchCompetitors(
      ctx,
      linkupData.competitiveLandscape.primaryCompetitors,
      userId
    );
  }
  
  // Find research papers
  crmFields.researchPapers = await findResearchPapers(companyName);
  
  return crmFields;
}

// ... (implementation of helper functions)
```

---

### **Phase 3: CSV Export Tool** (Priority 3)

**Goal**: Enable CSV export for manual review

**Estimated Effort**: 3-4 hours

#### **Step 3.1: Add `exportToCSV` Tool**

**File**: `convex/agents/specializedAgents.ts`

**Location**: Inside `createEntityResearchAgent()` function, add to `tools` object

```typescript
exportToCSV: createTool({
  description: "Export researched entities to CSV file for manual review and CRM import",
  args: z.object({
    entityNames: z.array(z.string())
      .describe("List of entity names to export"),
    entityType: z.enum(["company", "person"])
      .describe("Type of entities to export"),
    includeFields: z.array(z.string()).optional()
      .describe("Specific fields to include (default: all CRM fields)"),
  }),
  handler: async (_toolCtx: ActionCtx, args): Promise<string> => {
    console.log(`[exportToCSV] Exporting ${args.entityNames.length} ${args.entityType}s`);
    
    // 1. Fetch all entity contexts
    const entities = await Promise.all(
      args.entityNames.map(async (name) => {
        const context = await ctx.runQuery(api.entityContexts.getEntityContext, {
          entityName: name,
          entityType: args.entityType,
        });
        return context;
      })
    );
    
    const validEntities = entities.filter((e) => e !== null);
    
    if (validEntities.length === 0) {
      return `No cached data found for the specified ${args.entityType}s. Please research them first.`;
    }
    
    // 2. Generate CSV
    const csv = generateEntityCSV(validEntities, args.entityType, args.includeFields);
    
    // 3. Store as file document
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `${args.entityType}_research_${timestamp}.csv`;
    
    const fileId = await ctx.runMutation(api.documents.create, {
      title: filename,
      documentType: "spreadsheet",
      icon: "📊",
    });
    
    // Store CSV content
    await ctx.runMutation(api.fileDocuments.updateFileContent, {
      documentId: fileId,
      content: csv,
      mimeType: "text/csv",
    });
    
    return `✅ CSV exported successfully!

**File**: ${filename}
**Entities**: ${validEntities.length} ${args.entityType}s
**Fields**: ${args.includeFields?.length || "All CRM fields"}

You can download the file from your documents.`;
  },
}),
```

---

## 📊 Testing Plan

### **Test 1: Criteria-Based Search**

```typescript
// Run in Convex dashboard
await ctx.runAction(api.testEntityResearch.testCriteriaSearch, {
  fundingStage: "seed",
  minFunding: 2,
  industry: "healthcare",
  foundedAfter: 2022,
  founderExperience: "experienced",
});
```

**Expected Output**:
- 5-10 companies matching ALL criteria
- Each company researched and cached
- Formatted report with key details

### **Test 2: Named Company List with CRM**

```typescript
// Run in Convex dashboard
await ctx.runAction(api.testEntityResearch.testCRMExtraction, {
  companies: ["Stripe", "Shopify", "Square"],
});
```

**Expected Output**:
- Full CRM data for each company
- Investor backgrounds researched
- Competitor analysis completed
- CSV file generated

---

## ✅ Success Criteria

1. ✅ Criteria-based search returns 5-10 matching companies in <60s
2. ✅ CRM field extraction covers 15/15 required fields
3. ✅ CSV export generates downloadable file
4. ✅ All data cached for instant follow-up queries
5. ✅ Parallel execution maintains <5s per company average

---

## 🚀 Deployment Checklist

- [ ] Run schema migration for `crmFields`
- [ ] Deploy `crmExtraction.ts` helper functions
- [ ] Update `specializedAgents.ts` with new tools
- [ ] Test criteria-based search with sample queries
- [ ] Test CRM extraction with sample companies
- [ ] Test CSV export functionality
- [ ] Update documentation with new capabilities
- [ ] Monitor LinkUp API usage and costs

---

**Ready to implement?** Start with Phase 1 (Criteria-Based Search) as it's the highest priority and unblocks Query Pattern 1.

