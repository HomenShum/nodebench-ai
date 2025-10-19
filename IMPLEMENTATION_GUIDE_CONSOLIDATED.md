# Implementation Guide: Parallel Spreadsheet Research (Consolidated)

**Date**: 2025-10-19  
**Approach**: Add everything to `convex/agents/specializedAgents.ts` following existing pattern

---

## 📋 **Implementation Checklist**

- [ ] **Step 1**: Add `entityContexts` table to schema (30 min)
- [ ] **Step 2**: Create `convex/entityContexts.ts` mutations/queries (1 hour)
- [ ] **Step 3**: Create `convex/tools/spreadsheetTools.ts` (1 hour)
- [ ] **Step 4**: Add 3 new agents to `specializedAgents.ts` (3 hours)
- [ ] **Step 5**: Add delegation tool to `CoordinatorAgent` (30 min)
- [ ] **Step 6**: Create `convex/actions/spreadsheetResearch.ts` (2 hours)
- [ ] **Step 7**: Test with companies.csv (1 hour)

**Total Time**: ~9 hours

---

## 🎯 **Step 1: Add Entity Context Table**

**File**: `convex/schema.ts`

**Action**: Add this table definition to the schema:

```typescript
export const entityContexts = defineTable({
  entityName: v.string(),
  entityType: v.union(v.literal("company"), v.literal("person")),
  linkupData: v.optional(v.any()),
  summary: v.string(),
  keyFacts: v.array(v.string()),
  sources: v.array(v.object({
    name: v.string(),
    url: v.string(),
    snippet: v.optional(v.string()),
  })),
  spreadsheetId: v.optional(v.id("documents")),
  rowIndex: v.optional(v.number()),
  researchedAt: v.number(),
  researchedBy: v.id("users"),
  lastAccessedAt: v.number(),
  accessCount: v.number(),
  version: v.number(),
  isStale: v.optional(v.boolean()),
})
  .index("by_entity", ["entityName", "entityType"])
  .index("by_spreadsheet", ["spreadsheetId", "rowIndex"]);
```

**Deploy**: Run `npx convex deploy` to apply schema changes.

---

## 🎯 **Step 2: Create Entity Context Storage**

**File**: `convex/entityContexts.ts` (new file)

**Content**: Create mutations and queries for entity context CRUD operations.

**Key Functions**:
- `storeEntityContext` - Mutation to store/update entity research
- `getEntityContext` - Query to retrieve entity research
- `listEntityContexts` - Query to list all cached entities
- `updateAccessCount` - Mutation to track cache hits

---

## 🎯 **Step 3: Create Spreadsheet Tools**

**File**: `convex/tools/spreadsheetTools.ts` (new file)

**Purpose**: Reusable tools shared across spreadsheet agents

**Key Tools**:

```typescript
import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { api } from "../_generated/api";

export const readSpreadsheet = createTool({
  description: "Read a spreadsheet file and return its structure",
  args: z.object({
    documentId: z.string(),
  }),
  handler: async (ctx, args) => {
    const doc = await ctx.runQuery(api.fileDocuments.getFileDocument, {
      documentId: args.documentId as any,
    });
    
    if (!doc?.file?.storageUrl) {
      return "Spreadsheet not found";
    }
    
    const response = await fetch(doc.file.storageUrl);
    const csvText = await response.text();
    
    const lines = csvText.split('\n');
    const headers = lines[0].split(',');
    
    return `Spreadsheet: ${doc.title}
Rows: ${lines.length - 1}
Columns: ${headers.join(', ')}`;
  },
});

export const parseSpreadsheetEntities = createTool({
  description: "Extract entity names from a spreadsheet column",
  args: z.object({
    documentId: z.string(),
    columnName: z.string(),
  }),
  handler: async (ctx, args) => {
    // Parse CSV and extract column values
    // Return array of entity names
  },
});
```

---

## 🎯 **Step 4: Add New Agents to specializedAgents.ts**

**File**: `convex/agents/specializedAgents.ts` (modify existing)

**Action**: Add three new agent creator functions at the end of the file (before `createCoordinatorAgent`)

### 4.1: Add CompanyResearchAgent

```typescript
/**
 * Company Research Agent - Researches individual companies via LinkUp API
 */
export function createCompanyResearchAgent(
  ctx: ActionCtx,
  userId: string,
  companyName: string
) {
  return new Agent(components.agent, {
    name: `CompanyResearchAgent_${companyName}`,
    languageModel: openai.chat("gpt-5-mini"),
    instructions: `You research ${companyName} using LinkUp API and cached context.
    
Your workflow:
1. Check if ${companyName} has cached context
2. If cached and fresh (< 7 days), use cached data
3. If not cached or stale, call LinkUp API
4. Store research results in entity context database
5. Return formatted summary with sources`,

    tools: {
      checkCache: createTool({
        description: `Check if ${companyName} has cached research`,
        args: z.object({}),
        handler: async (ctx) => {
          const context = await ctx.runQuery(api.entityContexts.getEntityContext, {
            entityName: companyName,
            entityType: "company",
          });
          
          if (!context) return "No cache found";
          
          const age = Date.now() - context.researchedAt;
          const days = Math.floor(age / (1000 * 60 * 60 * 24));
          
          return `Cached (${days} days old):\n${context.summary}`;
        },
      }),
      
      researchViaLinkup: createTool({
        description: `Research ${companyName} using LinkUp API`,
        args: z.object({}),
        handler: async () => {
          const { linkupCompanyProfile } = await import("../../agents/services/linkup");
          const result = await linkupCompanyProfile(companyName);
          return JSON.stringify(result, null, 2);
        },
      }),
      
      storeContext: createTool({
        description: `Store research context for ${companyName}`,
        args: z.object({
          summary: z.string(),
          keyFacts: z.array(z.string()),
          sources: z.array(z.object({
            name: z.string(),
            url: z.string(),
          })),
        }),
        handler: async (ctx, args) => {
          await ctx.runMutation(api.entityContexts.storeEntityContext, {
            entityName: companyName,
            entityType: "company",
            researchedBy: userId as any,
            ...args,
          });
          return "Context stored";
        },
      }),
    },
    stopWhen: stepCountIs(5),
  });
}
```

### 4.2: Add PersonResearchAgent

```typescript
/**
 * Person Research Agent - Researches individual people via LinkUp API
 */
export function createPersonResearchAgent(
  ctx: ActionCtx,
  userId: string,
  personName: string
) {
  return new Agent(components.agent, {
    name: `PersonResearchAgent_${personName}`,
    languageModel: openai.chat("gpt-5-mini"),
    instructions: `You research ${personName} using LinkUp API and cached context.`,
    tools: {
      // Similar to CompanyResearchAgent but for people
    },
    stopWhen: stepCountIs(5),
  });
}
```

### 4.3: Add SpreadsheetResearchAgent

```typescript
/**
 * Spreadsheet Research Agent - Coordinates parallel entity research
 */
export function createSpreadsheetResearchAgent(ctx: ActionCtx, userId: string) {
  return new Agent(components.agent, {
    name: "SpreadsheetResearchAgent",
    languageModel: openai.chat("gpt-5"),
    instructions: `You coordinate research on spreadsheet entities.
    
Your workflow:
1. Read spreadsheet structure
2. Identify entity column (Company, Person, etc.)
3. Trigger parallel research action
4. Report progress and results
5. Answer questions using cached context`,

    tools: {
      readSpreadsheet,
      
      researchCompanies: createTool({
        description: "Research all companies in a spreadsheet in parallel",
        args: z.object({
          documentId: z.string(),
          companyColumn: z.string(),
          maxParallel: z.number().optional(),
        }),
        handler: async (ctx, args) => {
          const result = await ctx.runAction(
            api.actions.spreadsheetResearch.researchSpreadsheetCompanies,
            {
              documentId: args.documentId as any,
              companyColumn: args.companyColumn,
              maxParallel: args.maxParallel || 5,
            }
          );
          
          return `Researched ${result.totalCompanies} companies
Success: ${result.successCount}
Failed: ${result.failureCount}`;
        },
      }),
      
      askAboutEntity: createTool({
        description: "Answer questions using cached entity context",
        args: z.object({
          entityName: z.string(),
          question: z.string(),
        }),
        handler: async (ctx, args) => {
          const context = await ctx.runQuery(api.entityContexts.getEntityContext, {
            entityName: args.entityName,
            entityType: "company",
          });
          
          if (!context) {
            return `No cached data for ${args.entityName}`;
          }
          
          return `${context.summary}\n\nSources: ${context.sources.map(s => s.url).join(', ')}`;
        },
      }),
    },
    stopWhen: stepCountIs(10),
  });
}
```

---

## 🎯 **Step 5: Add Delegation to CoordinatorAgent**

**File**: `convex/agents/specializedAgents.ts` (modify existing `createCoordinatorAgent`)

**Action**: Add new delegation tool to the `tools` object:

```typescript
export function createCoordinatorAgent(ctx: ActionCtx, userId: string) {
  return new Agent(components.agent, {
    name: "CoordinatorAgent",
    languageModel: openai.chat("gpt-5"),
    instructions: `You are a coordinator agent that IMMEDIATELY delegates user requests to specialized agents.

AVAILABLE SPECIALIZED AGENTS:
1. DocumentAgent - For finding, reading, creating, and managing documents
2. MediaAgent - For YouTube videos, images, and media search
3. SECAgent - For SEC filings and financial documents
4. WebAgent - For web search and general information
5. SpreadsheetResearchAgent - For researching entities in spreadsheets (NEW)

...existing instructions...`,
    
    tools: {
      // ... existing delegation tools ...
      
      delegateToSpreadsheetResearchAgent: createTool({
        description: `Delegate to SpreadsheetResearchAgent for spreadsheet entity research.
        
Use this when user asks to:
- Research companies in a spreadsheet
- Research people in a spreadsheet
- Enrich spreadsheet data
- Answer questions about researched entities`,
        
        args: z.object({
          query: z.string(),
        }),
        
        handler: async (ctx, args) => {
          console.log('[CoordinatorAgent] Delegating to SpreadsheetResearchAgent');
          const agent = createSpreadsheetResearchAgent(ctx, userId);
          const result = await agent.generateText({ prompt: args.query });
          return result.text;
        },
      }),
    },
    stopWhen: stepCountIs(10),
  });
}
```

---

## 🎯 **Summary**

**Files Modified**:
1. `convex/schema.ts` - Add entityContexts table
2. `convex/agents/specializedAgents.ts` - Add 3 new agents + delegation tool

**Files Created**:
1. `convex/entityContexts.ts` - Entity context storage
2. `convex/tools/spreadsheetTools.ts` - Reusable spreadsheet tools
3. `convex/actions/spreadsheetResearch.ts` - Parallel execution action

**Total Changes**: 2 modified files, 3 new files

**Ready to implement?** Start with Step 1 (schema) and work sequentially through the steps.

