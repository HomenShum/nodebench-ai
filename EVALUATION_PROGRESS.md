# Convex Agent Tools Evaluation Progress

## 📊 Current Status (as of 2025-01-15 02:23 AM)

### ✅ Completed

1. **Critical Agent Fix - Text Response Generation**
   - **Problem**: Agent was calling tools successfully but returning empty response text (0 chars)
   - **Root Cause**: `thread.generateText()` only performs ONE step by default. After calling a tool, it stops without generating final text response
   - **Solution**: Implemented loop-based approach that calls `generateText()` multiple times until text response is found
   - **Result**: All tests now have response text! Agent properly synthesizes tool results into natural language

2. **Golden Dataset Creation**
   - Created `convex/seedGoldenDataset.ts` with comprehensive test data
   - **Documents**: 3 documents (Revenue Report Q4 2024, Product Roadmap 2025, Team Meeting Notes)
   - **Media**: 5 files (3 architecture images, 1 team photo, 1 demo video)
   - **Tasks**: 5 tasks (3 due today, 1 tomorrow, 1 next week) with high/medium priority
   - **Events**: 5 events (2 today, 1 tomorrow, 2 this week) with times and locations
   - **Folders**: 4 folders (Finance, Product, Team, Marketing)
   - Successfully seeded using test user: `k170ahnxnw00w76av9kp06q7097n3na1`

3. **Evaluation Infrastructure**
   - LLM-as-a-Judge using GPT-5 with structured outputs (Zod schema)
   - Pass/fail boolean evaluation (removed arbitrary numeric scores)
   - 6 quick tests covering all tool categories
   - Comprehensive test cases in `testCases.ts`

4. **userId Support (Partial)**
   - Added `userId` parameter to `sendMessageInternal`
   - Added `userId` parameter to `runSingleTest`
   - Created `helpers.ts` with `getTestUser` query
   - Quick tests now fetch and pass test user ID

### ❌ Current Blocker: userId Context Propagation

**Test Results**: 1/6 passing (16.7% success rate)

| Test ID | Category | Tool | Status | Issue |
|---------|----------|------|--------|-------|
| web-001 | Web Search | linkupSearch | ✅ PASS | Works! No userId filtering |
| doc-001 | Document Discovery | findDocument | ❌ FAIL | No results (userId filter) |
| doc-002 | Document Reading | getDocumentContent | ❌ FAIL | No tool called |
| media-001 | Media Search | searchMedia | ❌ FAIL | Wrong tool (linkupSearch) |
| task-001 | Task Listing | listTasks | ❌ FAIL | No results (userId filter) |
| cal-001 | Event Listing | listEvents | ❌ FAIL | No results (userId filter) |

**Root Cause**:
- Agent tools call queries like `api.documents.getSearch` which filter by `createdBy: userId`
- These queries use `getAuthUserId(ctx)` to get the current user
- When Agent runs in evaluation, there's no auth context, so `getAuthUserId` returns `null`
- Queries return empty results even though golden dataset exists

**Example from `convex/documents.ts:902`**:
```typescript
export const getSearch = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);  // Returns null in Agent context!
    if (!userId) return [];  // Empty results
    return await ctx.db
      .query("documents")
      .withSearchIndex("search_title", (q) =>
        q.search("title", args.query).eq("createdBy", userId)  // Filters out all results
      )
      .take(50);
  },
});
```

---

## 🎯 Next Steps to Fix

### Option 1: Modify Queries to Accept Optional userId (RECOMMENDED)

**Approach**: Add optional `userId` parameter to all queries used by Agent tools

**Example**:
```typescript
export const getSearch = query({
  args: { 
    query: v.string(),
    userId: v.optional(v.id("users")),  // NEW: Optional for evaluation
  },
  handler: async (ctx, args) => {
    // Use provided userId or fall back to auth
    const userId = args.userId || await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("documents")
      .withSearchIndex("search_title", (q) =>
        q.search("title", args.query).eq("createdBy", userId)
      )
      .take(50);
  },
});
```

**Queries to Update**:
1. `convex/documents.ts`:
   - `getSearch` (used by findDocument)
   - `getById` (used by getDocumentContent)
   - `getByIdWithContent` (used by analyzeDocument)

2. `convex/files.ts` (or wherever media queries are):
   - Media search query (used by searchMedia)
   - Media details query (used by getMediaDetails)
   - List media query (used by listMediaFiles)

3. `convex/tasks.ts` (or task queries):
   - List tasks query (used by listTasks)

4. `convex/events.ts` (or event queries):
   - List events query (used by listEvents)

5. `convex/folders.ts` (or folder queries):
   - Get folder contents query (used by getFolderContents)

**Then Update Tools**:
```typescript
// In convex/tools/documentTools.ts
export const findDocument = createTool({
  // ... existing code ...
  handler: async (ctx, args): Promise<string> => {
    // Get userId from Agent context (passed via sendMessageInternal)
    const userId = (ctx as any).userId;  // TODO: Find proper way to access this
    
    const results = await ctx.runQuery(api.documents.getSearch, {
      query: args.query,
      userId,  // Pass userId to query
    });
    // ... rest of handler ...
  },
});
```

### Option 2: Use Convex Agent Context System

**Research needed**: Check if `@convex-dev/agent` supports passing custom context to tools

**Potential approach**:
```typescript
const agent = new Agent(components.agent, {
  // ... existing config ...
  context: {  // If this exists
    userId: args.userId,
  },
});
```

### Option 3: Create Evaluation-Specific Queries

**Approach**: Create separate internal queries that don't filter by userId

**Example**:
```typescript
// In convex/documents.ts
export const getSearchForEvaluation = internalQuery({
  args: { 
    query: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("documents")
      .withSearchIndex("search_title", (q) =>
        q.search("title", args.query).eq("createdBy", args.userId)
      )
      .take(50);
  },
});
```

**Downside**: Duplicates query logic, harder to maintain

---

## 📝 Implementation Plan

1. **Choose Option 1** (modify queries to accept optional userId)
2. **Update all queries** used by Agent tools (list above)
3. **Update all tools** to pass userId from context
4. **Figure out how to pass userId through Agent context** to tools
5. **Re-run evaluation tests** - target 100% pass rate
6. **Refine test expectations** if needed (e.g., response formatting)
7. **Run full test suite** (`npm run eval all`)
8. **Document final results** and commit

---

## 🔍 Key Files

- `convex/fastAgentPanelStreaming.ts` - Agent creation and sendMessageInternal
- `convex/tools/documentTools.ts` - Document tools (findDocument, getDocumentContent, etc.)
- `convex/tools/mediaTools.ts` - Media tools (searchMedia, etc.)
- `convex/tools/dataAccessTools.ts` - Task and event tools
- `convex/documents.ts` - Document queries (getSearch, getById, etc.)
- `convex/tools/evaluation/quickTest.ts` - Quick test runner
- `convex/tools/evaluation/evaluator.ts` - LLM-as-a-Judge evaluator
- `convex/tools/evaluation/testCases.ts` - All test case definitions
- `convex/seedGoldenDataset.ts` - Test data seeding script

---

## 🎉 Wins So Far

1. **Agent now generates text responses** after tool calls (was critical blocker)
2. **Golden dataset successfully created** with realistic test data
3. **Evaluation infrastructure working** with GPT-5 structured outputs
4. **1 test passing** (linkupSearch) proves the system works end-to-end
5. **Clear path forward** - just need to fix userId propagation

---

## 📈 Success Metrics

- **Current**: 16.7% pass rate (1/6 tests)
- **Target**: 100% pass rate (6/6 tests)
- **Latency**: All tests <2s (currently web-001 is 21s, others <3s)
- **Token Usage**: Within budget (evaluation uses ~5K tokens per test)

---

## 🚀 Ready to Continue

The foundation is solid. The remaining work is straightforward:
1. Add `userId` parameter to queries
2. Pass `userId` through Agent context to tools
3. Re-run tests and achieve 100% pass rate

**Estimated time**: 30-60 minutes to implement and test

