# Architecture Decision: Do We Need Specialized Research Agents?

**Date**: 2025-10-19  
**Question**: Should we create specialized CompanyResearchAgent and PersonResearchAgent, or just use existing LinkUp tools?

---

## 🔍 **Current State Analysis**

### **What We Already Have**

#### 1. LinkUp SDK Integration (`agents/services/linkup.ts`)

```typescript
// Already exists - comprehensive structured company research
export async function linkupCompanyProfile(companyName: string) {
  return await client.search({
    query: companyName,
    depth: "standard",
    outputType: "structured",
    structuredOutputSchema: comprehensiveCompanySchema,
  });
}

// Already exists - comprehensive structured person research
export async function linkupPersonProfile(fullNameAndCompany: string) {
  return await client.search({
    query: fullNameAndCompany,
    depth: "standard",
    outputType: "structured",
    structuredOutputSchema: comprehensivePersonSchema,
  });
}
```

#### 2. Comprehensive Schemas Already Defined

**Company Schema** (20+ fields):
- Basic: companyName, companyType, headline, summary, website, location
- Strategic: businessModel, competitiveLandscape, swotAnalysis
- Financial: stockTicker, marketCap, fundingRounds, investors
- Operational: primaryServicesOrProducts, keyPersonnel, techStack
- Market: publicSentiment, regulatoryAndIP, socialMediaPresence

**Person Schema** (15+ fields):
- Basic: fullName, headline, summary, location
- Professional: workExperience, education, skills, certifications
- Analysis: keyAchievements, inferredExpertise, roleSuitabilityAnalysis, compensationAnalysis

#### 3. WebAgent Already Has LinkUp Access

```typescript
// convex/agents/specializedAgents.ts
export function createWebAgent(_ctx: ActionCtx, _userId: string) {
  return new Agent(components.agent, {
    name: "WebAgent",
    tools: {
      linkupSearch,  // ✅ Already has access to LinkUp
    },
  });
}
```

---

## 🤔 **The Question**

**Option A: Create Specialized Agents**
```typescript
// NEW: CompanyResearchAgent
export function createCompanyResearchAgent(ctx, userId, companyName) {
  return new Agent({
    tools: {
      checkCache,
      researchViaLinkup,  // Calls linkupCompanyProfile()
      storeContext,
    },
  });
}
```

**Option B: Just Add Tools to Existing Agents**
```typescript
// MODIFY: Add to WebAgent or create simple tool
export const researchCompany = createTool({
  description: "Research a company using LinkUp structured search",
  handler: async (ctx, args) => {
    // 1. Check cache
    const cached = await ctx.runQuery(api.entityContexts.getEntityContext, {...});
    if (cached) return cached;
    
    // 2. Call LinkUp
    const result = await linkupCompanyProfile(args.companyName);
    
    // 3. Store in cache
    await ctx.runMutation(api.entityContexts.storeEntityContext, {...});
    
    return result;
  },
});
```

---

## ⚖️ **Comparison**

| Aspect | Option A: Specialized Agents | Option B: Simple Tools |
|--------|------------------------------|------------------------|
| **Code Complexity** | High (3 new agent creators) | Low (2 new tools) |
| **Lines of Code** | ~300 lines | ~100 lines |
| **Depth/Usefulness** | ⚠️ **Same as Option B** | ✅ Uses same LinkUp schemas |
| **Relevancy** | ⚠️ **Same as Option B** | ✅ Uses same LinkUp API |
| **Caching** | ✅ Built into agent workflow | ✅ Built into tool handler |
| **Parallel Execution** | ✅ Spawn multiple agents | ✅ Promise.all() with tools |
| **Context Reuse** | ✅ Stored in entityContexts | ✅ Stored in entityContexts |
| **Maintainability** | ❌ More files to maintain | ✅ Simpler codebase |
| **Flexibility** | ❌ Locked into agent pattern | ✅ Can be used anywhere |

---

## 💡 **Key Insight**

**The specialized agents don't add depth/usefulness/relevancy because:**

1. ✅ **LinkUp API already returns structured, comprehensive data**
   - Company schema has 20+ fields including SWOT, competitors, financials
   - Person schema has 15+ fields including compensation analysis
   - This is already "deep" research

2. ✅ **The agent wrapper doesn't enhance the data**
   - Agent just calls `linkupCompanyProfile()` → same result
   - Agent just stores result in cache → tool can do this too
   - Agent just formats output → tool can do this too

3. ✅ **Parallel execution works with both approaches**
   - Agents: `Promise.all(companies.map(c => createAgent(c).generateText()))`
   - Tools: `Promise.all(companies.map(c => researchCompany({ companyName: c })))`

---

## 🎯 **Recommendation: Option B (Simple Tools)**

### **Why Simple Tools Are Better**

1. **Same Depth**: Uses identical LinkUp schemas → same comprehensive data
2. **Same Relevancy**: Same API call → same quality results
3. **Less Complexity**: 100 lines vs 300 lines
4. **More Flexible**: Tools can be used by any agent (WebAgent, SpreadsheetAgent, etc.)
5. **Easier to Maintain**: Fewer files, simpler architecture
6. **Faster to Implement**: 2 hours vs 6 hours

### **What We Actually Need**

```typescript
// convex/tools/companyResearch.ts (NEW - 50 lines)
export const researchCompany = createTool({
  description: "Research a company with caching",
  args: z.object({ companyName: z.string() }),
  handler: async (ctx, args) => {
    // 1. Check cache (7-day TTL)
    const cached = await ctx.runQuery(api.entityContexts.getEntityContext, {
      entityName: args.companyName,
      entityType: "company",
    });
    
    if (cached && (Date.now() - cached.researchedAt < 7 * 24 * 60 * 60 * 1000)) {
      await ctx.runMutation(api.entityContexts.updateAccessCount, {
        id: cached._id,
      });
      return formatCompanyProfile(cached);
    }
    
    // 2. Call LinkUp API
    const { linkupCompanyProfile } = await import("../../agents/services/linkup");
    const result = await linkupCompanyProfile(args.companyName);
    
    // 3. Store in cache
    await ctx.runMutation(api.entityContexts.storeEntityContext, {
      entityName: args.companyName,
      entityType: "company",
      linkupData: result,
      summary: result.summary,
      keyFacts: extractKeyFacts(result),
      sources: result.allLinks.map(url => ({ name: url, url })),
    });
    
    return formatCompanyProfile(result);
  },
});

// convex/tools/personResearch.ts (NEW - 50 lines)
export const researchPerson = createTool({
  description: "Research a person with caching",
  args: z.object({ 
    fullName: z.string(),
    company: z.string().optional(),
  }),
  handler: async (ctx, args) => {
    // Same pattern as researchCompany
  },
});
```

### **Then Add to SpreadsheetResearchAgent**

```typescript
// convex/agents/specializedAgents.ts (MODIFY existing file)
export function createSpreadsheetResearchAgent(ctx: ActionCtx, userId: string) {
  return new Agent(components.agent, {
    name: "SpreadsheetResearchAgent",
    tools: {
      readSpreadsheet,
      researchCompany,      // ✅ Simple tool with caching
      researchPerson,       // ✅ Simple tool with caching
      askAboutEntity,       // ✅ Query cached data
      researchAllCompanies, // ✅ Parallel execution tool
    },
  });
}
```

---

## 📊 **Revised Implementation Plan**

### **Files to Create** (3 files, ~200 lines total)

1. **`convex/tools/companyResearch.ts`** (50 lines)
   - `researchCompany` tool with cache-first logic

2. **`convex/tools/personResearch.ts`** (50 lines)
   - `researchPerson` tool with cache-first logic

3. **`convex/entityContexts.ts`** (100 lines)
   - `storeEntityContext` mutation
   - `getEntityContext` query
   - `updateAccessCount` mutation

### **Files to Modify** (2 files)

1. **`convex/schema.ts`** (add entityContexts table)
2. **`convex/agents/specializedAgents.ts`** (add SpreadsheetResearchAgent + delegation)

### **Total Implementation Time**: ~4 hours (vs 9 hours for specialized agents)

---

## ✅ **Decision**

**Use Simple Tools (Option B)** because:

1. ✅ **Same depth/usefulness/relevancy** - Uses identical LinkUp structured schemas
2. ✅ **Less complexity** - 200 lines vs 500 lines
3. ✅ **More flexible** - Tools can be reused across agents
4. ✅ **Faster to implement** - 4 hours vs 9 hours
5. ✅ **Easier to maintain** - Fewer files, simpler architecture

**The specialized agents would just be wrappers around the same LinkUp API calls.**

---

## 🎯 **Next Steps**

1. Create `convex/tools/companyResearch.ts` with cache-first logic
2. Create `convex/tools/personResearch.ts` with cache-first logic
3. Create `convex/entityContexts.ts` for context storage
4. Add `SpreadsheetResearchAgent` to `specializedAgents.ts`
5. Add delegation tool to `CoordinatorAgent`
6. Test with companies.csv

**Ready to proceed with simplified approach?**

