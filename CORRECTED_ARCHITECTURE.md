# CORRECTED: Fast Agent Panel Architecture for Parallel Spreadsheet Research

**Date**: 2025-10-19  
**Status**: Architecture Correction

---

## ✅ **Current Fast Agent Panel Implementation**

### **What's Actually Being Used**

The Fast Agent Panel **DOES NOT** use `convex/aiAgents.ts` (that file is deprecated/legacy).

**Actual Implementation**:
- **File**: `convex/fastAgentPanelStreaming.ts`
- **Agent System**: `convex/agents/specializedAgents.ts`
- **Pattern**: Coordinator Agent with specialized sub-agents

### **Code Evidence**

```typescript
// convex/fastAgentPanelStreaming.ts (line 812)
if (args.useCoordinator !== false) { // Default to coordinator
  agentType = 'COORDINATOR';
  console.log(`Using COORDINATOR AGENT for intelligent delegation`);
  const { createCoordinatorAgent } = await import("./agents/specializedAgents");
  agent = createCoordinatorAgent(ctx, userId);
}
```

### **Current Specialized Agents**

Located in `convex/agents/specializedAgents.ts`:

1. **DocumentAgent** - Document operations (find, read, create, update)
2. **MediaAgent** - YouTube videos, images, media search
3. **SECAgent** - SEC filings and financial documents
4. **WebAgent** - Web search and general information
5. **CoordinatorAgent** - Routes requests to specialized agents

---

## ✅ **Corrected Integration Plan**

### **Where to Add Spreadsheet Research**

**Option 1: Add to Existing CoordinatorAgent** (Recommended)

Add a new delegation tool to the existing `CoordinatorAgent`:

```typescript
// convex/agents/specializedAgents.ts (modify existing file)
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
5. SpreadsheetResearchAgent - For researching companies/people in spreadsheets (NEW)

...existing instructions...`,
    
    tools: {
      // ... existing delegation tools ...
      
      delegateToSpreadsheetResearchAgent: createTool({
        description: `Delegate to SpreadsheetResearchAgent for researching entities in spreadsheets.
        
        Use this when user asks to:
        - Research companies in a spreadsheet
        - Research people in a spreadsheet
        - Enrich spreadsheet data with external information
        - Update spreadsheet with research findings`,
        
        args: z.object({
          query: z.string(),
        }),
        
        handler: async (ctx, args) => {
          const { createSpreadsheetResearchAgent } = await import("./spreadsheetResearch");
          const agent = createSpreadsheetResearchAgent(ctx, userId);
          const result = await agent.generateText({ prompt: args.query });
          return result.text;
        },
      }),
    },
  });
}
```

**Option 2: Create Standalone SpreadsheetResearchAgent**

Create a new specialized agent that can be called directly:

```typescript
// convex/agents/spreadsheetResearch.ts (new file)
import { Agent, createTool } from "@convex-dev/agent";
import { openai } from "@ai-sdk/openai";
import { components, api } from "../_generated/api";
import type { ActionCtx } from "../_generated/server";
import { z } from "zod";

export function createSpreadsheetResearchAgent(ctx: ActionCtx, userId: string) {
  return new Agent(components.agent, {
    name: "SpreadsheetResearchAgent",
    languageModel: openai.chat("gpt-5"),
    instructions: `You are a spreadsheet research specialist.

Your job is to:
1. Read spreadsheet files (CSV/Excel)
2. Identify entities to research (companies, people)
3. Spawn parallel sub-agents to research each entity
4. Store research results in entity context database
5. Update spreadsheet with findings
6. Answer questions using cached entity context

WORKFLOW:
1. User uploads spreadsheet or asks to research entities
2. You read the spreadsheet structure
3. You identify which column contains entities (Company, Person, etc.)
4. You spawn parallel CompanyResearchAgent or PersonResearchAgent for each entity
5. Each sub-agent checks cache first, then calls LinkUp API if needed
6. Results are aggregated and stored
7. User can ask follow-up questions using cached data`,

    tools: {
      readSpreadsheet: createTool({
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
          
          // Parse CSV headers
          const lines = csvText.split('\n');
          const headers = lines[0].split(',');
          
          return `Spreadsheet has ${lines.length - 1} rows and ${headers.length} columns.
Columns: ${headers.join(', ')}`;
        },
      }),
      
      researchCompanies: createTool({
        description: "Research all companies in a spreadsheet column in parallel",
        args: z.object({
          documentId: z.string(),
          companyColumn: z.string(),
          maxParallel: z.number().optional(),
        }),
        handler: async (ctx, args) => {
          // Call the parallel research action
          const result = await ctx.runAction(
            api.actions.spreadsheetResearch.researchSpreadsheetCompanies,
            {
              documentId: args.documentId as any,
              companyColumn: args.companyColumn,
              maxParallel: args.maxParallel || 5,
            }
          );
          
          return `Researched ${result.totalCompanies} companies.
Success: ${result.successCount}
Failed: ${result.failureCount}

All research results are now cached and available for questions.`;
        },
      }),
      
      askAboutEntity: createTool({
        description: "Answer questions about a researched entity using cached context",
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
            return `No cached context found for ${args.entityName}. Would you like me to research this ${args.entityType}?`;
          }
          
          // Find relevant facts
          const relevantFacts = context.keyFacts.filter((fact) =>
            fact.toLowerCase().includes(args.question.toLowerCase())
          );
          
          const answer = relevantFacts.length > 0
            ? relevantFacts.join("\n")
            : context.summary;
          
          return `Based on my research on ${args.entityName} (last updated ${new Date(context.researchedAt).toLocaleDateString()}):

${answer}

Sources:
${context.sources.slice(0, 3).map((s) => `- ${s.name}: ${s.url}`).join("\n")}

(Cached research, access count: ${context.accessCount})`;
        },
      }),
    },
  });
}
```

---

## ✅ **Corrected File Structure**

**CONSOLIDATED APPROACH**: Everything goes into `specializedAgents.ts` following existing pattern

```
convex/
├── fastAgentPanelStreaming.ts          # Main Fast Agent Panel backend
│   └── Uses createCoordinatorAgent from specializedAgents.ts
│
├── agents/
│   └── specializedAgents.ts            # ✅ MODIFY: Add all new agents here
│       ├── createDocumentAgent()       # Existing
│       ├── createMediaAgent()          # Existing
│       ├── createSECAgent()            # Existing
│       ├── createWebAgent()            # Existing
│       ├── createSpreadsheetResearchAgent()  # 🆕 NEW
│       ├── createCompanyResearchAgent()      # 🆕 NEW
│       ├── createPersonResearchAgent()       # 🆕 NEW
│       └── createCoordinatorAgent()    # 🆕 MODIFY: Add delegation tool
│
├── tools/
│   └── spreadsheetTools.ts             # 🆕 NEW: Reusable tools for spreadsheet agents
│       ├── readSpreadsheet()
│       ├── parseSpreadsheetEntities()
│       └── updateSpreadsheetRow()
│
├── actions/
│   └── spreadsheetResearch.ts          # 🆕 NEW: Parallel execution action
│       └── researchSpreadsheetCompanies()
│
├── entityContexts.ts                   # 🆕 NEW: Entity context storage
│   ├── storeEntityContext()
│   └── getEntityContext()
│
├── schema.ts                           # 🆕 MODIFY: Add entityContexts table
│
└── aiAgents.ts                         # ❌ DEPRECATED: Not used by Fast Agent Panel
```

**Why This Approach?**
- ✅ Follows existing codebase pattern (all agents in one file)
- ✅ Easier to maintain and understand
- ✅ Reduces file proliferation
- ✅ Keeps related agents together
- ✅ Simpler imports (one file to import from)

---

## ✅ **Corrected Implementation Steps**

### Step 1: Add Entity Context Table (30 min)

**File**: `convex/schema.ts`

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

### Step 2: Create Entity Context Mutations (1 hour)

**File**: `convex/entityContexts.ts` (new file)

Create mutations/queries for storing and retrieving entity context.

### Step 3: Create Spreadsheet Tools (1 hour)

**File**: `convex/tools/spreadsheetTools.ts` (new file)

Create reusable tools that can be shared across agents:
- `readSpreadsheet` - Parse CSV/Excel files
- `parseSpreadsheetEntities` - Extract entity names from columns
- `updateSpreadsheetRow` - Update specific row with research data

### Step 4: Add All New Agents to specializedAgents.ts (3 hours)

**File**: `convex/agents/specializedAgents.ts` (modify existing)

Add three new agent creator functions to the existing file:
1. `createCompanyResearchAgent()` - Research individual companies
2. `createPersonResearchAgent()` - Research individual people
3. `createSpreadsheetResearchAgent()` - Coordinate spreadsheet research

### Step 5: Add Delegation to CoordinatorAgent (30 min)

**File**: `convex/agents/specializedAgents.ts` (modify existing)

Add `delegateToSpreadsheetResearchAgent` tool to the existing `createCoordinatorAgent()` function.

### Step 6: Create Parallel Execution Action (2 hours)

**File**: `convex/actions/spreadsheetResearch.ts` (new file)

Create `researchSpreadsheetCompanies` action that spawns parallel sub-agents.

---

## ✅ **Key Differences from Original Design**

| Aspect | Original (Incorrect) | Corrected |
|--------|---------------------|-----------|
| **Integration Point** | `convex/aiAgents.ts` | `convex/agents/specializedAgents.ts` |
| **Agent Pattern** | Standalone agents | Coordinator + specialized agents |
| **Tool Registration** | Direct tool export | Delegation tools in CoordinatorAgent |
| **File Structure** | Separate from existing agents | Integrated with existing agent system |

---

## ✅ **Testing the Corrected Implementation**

### Test 1: Verify Current Fast Agent Panel

```typescript
// In Fast Agent Panel, send message:
User: "Find my revenue report"

// Should trigger:
CoordinatorAgent → delegateToDocumentAgent → DocumentAgent
```

### Test 2: Add Spreadsheet Research

```typescript
// After implementation, send message:
User: "Research all companies in companies.csv"

// Should trigger:
CoordinatorAgent → delegateToSpreadsheetResearchAgent → SpreadsheetResearchAgent
  → Spawns 13 CompanyResearchAgent instances in parallel
```

### Test 3: Cached Entity Questions

```typescript
// After research is complete:
User: "What is Anthropic's funding?"

// Should trigger:
CoordinatorAgent → delegateToSpreadsheetResearchAgent → SpreadsheetResearchAgent
  → askAboutEntity tool → Returns cached data (no LinkUp API call)
```

---

## ✅ **Summary**

**Corrected Understanding**:
- Fast Agent Panel uses `convex/agents/specializedAgents.ts` (NOT `aiAgents.ts`)
- Integration requires adding delegation tool to existing `CoordinatorAgent`
- New specialized agents follow the same pattern as existing ones
- All tools are accessed via delegation, not direct export

**Next Steps**:
1. Implement entity context storage
2. Create CompanyResearchAgent following DocumentAgent pattern
3. Create SpreadsheetResearchAgent as coordinator
4. Add delegation tool to existing CoordinatorAgent
5. Test end-to-end workflow

**Status**: ✅ **ARCHITECTURE CORRECTED - READY TO IMPLEMENT**

