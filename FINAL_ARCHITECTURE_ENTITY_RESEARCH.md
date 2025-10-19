# Final Architecture: General Entity Research (Not Spreadsheet-Specific)

**Date**: 2025-10-19  
**Key Insight**: Entity research should be general-purpose, not locked to spreadsheets

---

## 🎯 **The Right Approach**

### **Option 1: Add Research Tools to WebAgent** (Simplest)

WebAgent already handles web search. Just add company/person research tools to it.

```typescript
// convex/agents/specializedAgents.ts (MODIFY existing WebAgent)
export function createWebAgent(_ctx: ActionCtx, _userId: string) {
  return new Agent(components.agent, {
    name: "WebAgent",
    languageModel: openai.chat("gpt-5-mini"),
    instructions: `You are a web search and research specialist.

CAPABILITIES:
- Search the web for current information
- Research companies with structured data (funding, competitors, SWOT, etc.)
- Research people with structured data (work history, skills, compensation, etc.)
- All research is cached for instant follow-up questions`,

    tools: {
      linkupSearch,        // Existing - general web search
      researchCompany,     // NEW - structured company research with caching
      researchPerson,      // NEW - structured person research with caching
      askAboutEntity,      // NEW - query cached entity data
    },
  });
}
```

**User Experience**:
```
User: "Research Anthropic"
→ CoordinatorAgent → WebAgent → researchCompany → Returns structured data

User: "What's Anthropic's funding?"
→ CoordinatorAgent → WebAgent → askAboutEntity → Returns cached data (instant)

User: "Compare Anthropic and OpenAI"
→ CoordinatorAgent → WebAgent → researchCompany (2x parallel) → Returns comparison
```

---

### **Option 2: Create EntityResearchAgent** (More Focused)

Create a dedicated agent for entity research (companies, people, organizations).

```typescript
// convex/agents/specializedAgents.ts (ADD new agent)

/**
 * Entity Research Agent - Researches companies, people, and organizations
 */
export function createEntityResearchAgent(ctx: ActionCtx, userId: string) {
  return new Agent(components.agent, {
    name: "EntityResearchAgent",
    languageModel: openai.chat("gpt-5"),
    instructions: `You are an entity research specialist.

CAPABILITIES:
- Research companies (funding, competitors, SWOT, financials, key personnel)
- Research people (work history, skills, compensation, role suitability)
- Research organizations (non-profits, foundations, government entities)
- All research is cached for 7 days for instant follow-up questions

WORKFLOW:
1. Check cache first (instant if available)
2. Call LinkUp API if not cached or stale
3. Store structured data in cache
4. Return comprehensive analysis

RESEARCH DEPTH:
- Company: 20+ fields including SWOT, competitors, financials, tech stack
- Person: 15+ fields including compensation analysis, role suitability
- All data is sourced and cited`,

    tools: {
      researchCompany: createTool({
        description: "Research a company with comprehensive structured data",
        args: z.object({
          companyName: z.string(),
          forceRefresh: z.boolean().optional(),
        }),
        handler: async (ctx, args) => {
          // 1. Check cache
          const cached = await ctx.runQuery(api.entityContexts.getEntityContext, {
            entityName: args.companyName,
            entityType: "company",
          });
          
          const cacheAge = cached ? Date.now() - cached.researchedAt : Infinity;
          const isStale = cacheAge > 7 * 24 * 60 * 60 * 1000; // 7 days
          
          if (cached && !isStale && !args.forceRefresh) {
            await ctx.runMutation(api.entityContexts.updateAccessCount, {
              id: cached._id,
            });
            return `[CACHED] ${formatCompanyProfile(cached)}`;
          }
          
          // 2. Call LinkUp API
          const { linkupCompanyProfile } = await import("../../agents/services/linkup");
          const result = await linkupCompanyProfile(args.companyName);
          
          if (!result || result.error) {
            return `Failed to research ${args.companyName}: ${result?.error || 'Unknown error'}`;
          }
          
          // 3. Store in cache
          await ctx.runMutation(api.entityContexts.storeEntityContext, {
            entityName: args.companyName,
            entityType: "company",
            linkupData: result,
            summary: result.summary || "",
            keyFacts: extractCompanyKeyFacts(result),
            sources: (result.allLinks || []).map(url => ({ name: url, url })),
            researchedBy: userId as any,
          });
          
          return formatCompanyProfile(result);
        },
      }),
      
      researchPerson: createTool({
        description: "Research a person with comprehensive structured data",
        args: z.object({
          fullName: z.string(),
          company: z.string().optional(),
          forceRefresh: z.boolean().optional(),
        }),
        handler: async (ctx, args) => {
          // Similar to researchCompany
        },
      }),
      
      askAboutEntity: createTool({
        description: "Answer questions about a previously researched entity using cached data",
        args: z.object({
          entityName: z.string(),
          entityType: z.enum(["company", "person"]),
          question: z.string(),
        }),
        handler: async (ctx, args) => {
          const context = await ctx.runQuery(api.entityContexts.getEntityContext, {
            entityName: args.entityName,
            entityType: args.entityType,
          });
          
          if (!context) {
            return `No cached data for ${args.entityName}. Would you like me to research this ${args.entityType}?`;
          }
          
          // Update access count
          await ctx.runMutation(api.entityContexts.updateAccessCount, {
            id: context._id,
          });
          
          // Extract relevant information based on question
          const relevantFacts = context.keyFacts.filter(fact =>
            fact.toLowerCase().includes(args.question.toLowerCase())
          );
          
          return `Based on my research on ${args.entityName} (cached ${formatAge(context.researchedAt)}):

${relevantFacts.length > 0 ? relevantFacts.join('\n') : context.summary}

Sources: ${context.sources.slice(0, 3).map(s => s.url).join(', ')}

(Cache hit #${context.accessCount})`;
        },
      }),
      
      compareEntities: createTool({
        description: "Compare multiple companies or people side-by-side",
        args: z.object({
          entityNames: z.array(z.string()),
          entityType: z.enum(["company", "person"]),
          comparisonAspects: z.array(z.string()).optional(),
        }),
        handler: async (ctx, args) => {
          // Research all entities in parallel
          const results = await Promise.all(
            args.entityNames.map(name =>
              args.entityType === "company"
                ? researchCompany.handler(ctx, { companyName: name })
                : researchPerson.handler(ctx, { fullName: name })
            )
          );
          
          return formatComparison(results, args.comparisonAspects);
        },
      }),
    },
    stopWhen: stepCountIs(10),
  });
}

// MODIFY: CoordinatorAgent (add delegation)
export function createCoordinatorAgent(ctx: ActionCtx, userId: string) {
  return new Agent(components.agent, {
    instructions: `...
    
AVAILABLE SPECIALIZED AGENTS:
1. DocumentAgent - For documents
2. MediaAgent - For videos/images
3. SECAgent - For SEC filings
4. WebAgent - For web search
5. EntityResearchAgent - For researching companies, people, organizations (NEW)

DELEGATION EXAMPLES:
- "Research Anthropic" → delegateToEntityResearchAgent
- "Tell me about Sam Altman" → delegateToEntityResearchAgent
- "Compare Anthropic and OpenAI" → delegateToEntityResearchAgent
- "What's Anthropic's funding?" → delegateToEntityResearchAgent (uses cache)`,

    tools: {
      // ... existing delegation tools ...
      
      delegateToEntityResearchAgent: createTool({
        description: "Delegate to EntityResearchAgent for company/person research",
        args: z.object({
          query: z.string(),
        }),
        handler: async (toolCtx, args) => {
          const agent = createEntityResearchAgent(ctx, userId);
          const threadId = (toolCtx as any).threadId;
          const { thread } = await agent.continueThread(ctx as any, { threadId });
          const result = await thread.streamText({
            system: `Process this delegated query: "${args.query}"`,
          });
          await result.consumeStream();
          return await result.text;
        },
      }),
    },
  });
}
```

---

## 🔄 **What About Spreadsheets?**

Spreadsheets become just **one use case** for entity research:

```typescript
// convex/actions/spreadsheetResearch.ts
export const researchSpreadsheetCompanies = action({
  args: {
    documentId: v.id("documents"),
    companyColumn: v.string(),
    maxParallel: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // 1. Read spreadsheet
    const doc = await ctx.runQuery(api.fileDocuments.getFileDocument, {
      documentId: args.documentId,
    });
    
    // 2. Parse CSV and extract company names
    const companies = parseCompanyColumn(csvText, args.companyColumn);
    
    // 3. Research all companies in parallel using EntityResearchAgent
    const batchSize = args.maxParallel || 5;
    const results = [];
    
    for (let i = 0; i < companies.length; i += batchSize) {
      const batch = companies.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (company) => {
          // Create EntityResearchAgent for each company
          const agent = createEntityResearchAgent(ctx, userId);
          const result = await agent.generateText({
            prompt: `Research ${company.name}`
          });
          return { company: company.name, data: result.text };
        })
      );
      results.push(...batchResults);
    }
    
    return { totalCompanies: companies.length, results };
  },
});
```

Then EntityResearchAgent can be called with:
```
User: "Research all companies in companies.csv"
→ CoordinatorAgent → EntityResearchAgent → researchAllCompanies tool → Parallel research
```

---

## ⚖️ **Comparison**

| Aspect | Option 1: Add to WebAgent | Option 2: EntityResearchAgent |
|--------|---------------------------|-------------------------------|
| **Simplicity** | ✅ Modify 1 existing agent | ⚠️ Create 1 new agent |
| **Separation of Concerns** | ⚠️ WebAgent does too much | ✅ Clear responsibility |
| **User Experience** | ✅ Works for all queries | ✅ Works for all queries |
| **Spreadsheet Support** | ✅ Via separate action | ✅ Via separate action |
| **Maintainability** | ⚠️ WebAgent becomes large | ✅ Focused agents |
| **Lines of Code** | ~100 lines added | ~200 lines new agent |

---

## ✅ **Recommendation: Option 2 (EntityResearchAgent)**

**Why?**

1. ✅ **Clear separation**: WebAgent = web search, EntityResearchAgent = entity research
2. ✅ **Better UX**: Users can research entities anywhere (Fast Agent Panel, spreadsheets, etc.)
3. ✅ **Scalable**: Easy to add more entity types (organizations, products, etc.)
4. ✅ **Follows pattern**: Each agent has focused responsibility

---

## 📋 **Implementation Plan**

### **Files to Create** (2 files)

1. **`convex/entityContexts.ts`** (100 lines)
   - `storeEntityContext` mutation
   - `getEntityContext` query
   - `updateAccessCount` mutation

2. **`convex/actions/spreadsheetResearch.ts`** (100 lines) - OPTIONAL
   - `researchSpreadsheetCompanies` action for bulk spreadsheet research

### **Files to Modify** (2 files)

1. **`convex/schema.ts`** (add entityContexts table)

2. **`convex/agents/specializedAgents.ts`** (add EntityResearchAgent + delegation)
   - Add `createEntityResearchAgent()` function (~150 lines)
   - Add `delegateToEntityResearchAgent` to CoordinatorAgent (~20 lines)

### **Total**: ~370 lines, ~5 hours

---

## 🎯 **User Experience**

```
# General entity research (no spreadsheet)
User: "Research Anthropic"
→ EntityResearchAgent → researchCompany → Structured data

User: "What's Anthropic's funding?"
→ EntityResearchAgent → askAboutEntity → Cached data (instant)

User: "Compare Anthropic, OpenAI, and Mistral"
→ EntityResearchAgent → compareEntities → Parallel research + comparison

# Spreadsheet research (bulk operation)
User: "Research all companies in companies.csv"
→ EntityResearchAgent → researchAllCompanies → Parallel research (13 companies)

User: "What is Scale AI's tech stack?"
→ EntityResearchAgent → askAboutEntity → Cached data from spreadsheet research
```

**Ready to implement EntityResearchAgent as a general-purpose agent?**

