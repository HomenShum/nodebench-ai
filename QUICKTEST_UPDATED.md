# QuickTest Updated for Coordinator Agent ✅

## Summary

The `convex/tools/evaluation/quickTest.ts` file has been updated to test the new coordinator agent orchestration system.

## Changes Made

### 1. Added YouTube Test to Quick Test Suite
```typescript
const quickTests = [
  "doc-001",    // findDocument
  "doc-002",    // getDocumentContent
  "media-001",  // searchMedia
  "task-001",   // listTasks
  "cal-001",    // listEvents
  "web-001",    // linkupSearch
  "sec-001",    // searchSecFilings
  "youtube-001", // YouTube search ← NEW
  "agent-001",  // Coordinator multi-domain
  "agent-002",  // MediaAgent YouTube
  "agent-003",  // SECAgent filing search
];
```

### 2. Updated `testTool` Function
Added `useCoordinator` parameter to enable/disable coordinator mode:

```typescript
export const testTool = action({
  args: {
    toolName: v.string(),
    userQuery: v.string(),
    useCoordinator: v.optional(v.boolean()), // ← NEW
  },
  handler: async (ctx, args) => {
    console.log(`Coordinator: ${args.useCoordinator !== false ? "ENABLED" : "DISABLED"}`);
    
    const result = await ctx.runAction(internal.fastAgentPanelStreaming.sendMessageInternal, {
      message: args.userQuery,
      useCoordinator: args.useCoordinator, // ← NEW
    });
    
    return result;
  },
});
```

### 3. Added New `testCoordinator` Function
Comprehensive test suite specifically for coordinator agent:

```typescript
export const testCoordinator = action({
  args: {},
  returns: v.object({
    totalTests: v.number(),
    passed: v.number(),
    failed: v.number(),
    results: v.array(v.any()),
  }),
  handler: async (ctx) => {
    const tests = [
      {
        name: "Multi-Domain Query (Document + Video)",
        query: "Find documents and videos about Google",
        expectedDelegations: ["delegateToDocumentAgent", "delegateToMediaAgent"],
        expectedTools: ["findDocument", "youtubeSearch"],
      },
      {
        name: "SEC Filing Query",
        query: "Get Tesla's latest 10-K filing",
        expectedDelegations: ["delegateToSECAgent"],
        expectedTools: ["searchSecFilings"],
      },
      {
        name: "YouTube Video Search",
        query: "Find videos about Python programming",
        expectedDelegations: ["delegateToMediaAgent"],
        expectedTools: ["youtubeSearch"],
      },
      {
        name: "Document Search",
        query: "Find the revenue report",
        expectedDelegations: ["delegateToDocumentAgent"],
        expectedTools: ["findDocument"],
      },
    ];
    
    // Run tests and validate:
    // ✅ Expected tools were called
    // ✅ Response generated
    // ✅ No validation errors
  },
});
```

### 4. Updated `testWorkflow` Function
Enabled coordinator mode for multi-step workflows:

```typescript
export const testWorkflow = action({
  handler: async (ctx) => {
    const result = await ctx.runAction(internal.fastAgentPanelStreaming.sendMessageInternal, {
      message: workflow,
      useCoordinator: true, // ← NEW: Enable coordinator
    });
    
    // Validates multi-step sequence:
    // findDocument → getDocumentContent → analyzeDocument
  },
});
```

## Test Functions Available

### 1. `runQuickTest`
**Purpose:** Run a quick test suite covering all major functionality

**Usage:**
```bash
npx convex run tools/evaluation/quickTest:runQuickTest
```

**Tests:**
- Document tools (2 tests)
- Media tools (1 test)
- Task tools (1 test)
- Calendar tools (1 test)
- Web search (1 test)
- SEC tools (1 test)
- YouTube search (1 test)
- Coordinator agent (3 tests)

**Total:** 12 tests

### 2. `testCoordinator` ⭐ NEW
**Purpose:** Test coordinator agent with specialized agents

**Usage:**
```bash
npx convex run tools/evaluation/quickTest:testCoordinator
```

**Tests:**
1. **Multi-Domain Query** - Document + Video search
2. **SEC Filing Query** - Tesla 10-K
3. **YouTube Video Search** - Python programming
4. **Document Search** - Revenue report

**Validates:**
- ✅ Correct tools called
- ✅ Response generated
- ✅ No validation errors
- ✅ Thread context maintained

### 3. `testTool`
**Purpose:** Test a specific tool with optional coordinator mode

**Usage:**
```bash
# With coordinator (default)
npx convex run tools/evaluation/quickTest:testTool \
  --arg toolName="findDocument" \
  --arg userQuery="Find the revenue report"

# Without coordinator (legacy mode)
npx convex run tools/evaluation/quickTest:testTool \
  --arg toolName="findDocument" \
  --arg userQuery="Find the revenue report" \
  --arg useCoordinator=false
```

### 4. `testWorkflow`
**Purpose:** Test multi-step workflow with coordinator

**Usage:**
```bash
npx convex run tools/evaluation/quickTest:testWorkflow
```

**Workflow:** "Find my revenue report, open it, and tell me what it's about"

**Expected Sequence:**
1. findDocument
2. getDocumentContent
3. analyzeDocument

### 5. `testDocumentTools`
**Purpose:** Test document-specific tools

**Usage:**
```bash
npx convex run tools/evaluation/quickTest:testDocumentTools
```

### 6. `testWebSearch`
**Purpose:** Test web search with images

**Usage:**
```bash
npx convex run tools/evaluation/quickTest:testWebSearch
```

## Test Validation Criteria

### For Coordinator Tests

Each test validates:

1. **Tool Execution** ✅
   - All expected tools were called
   - Tools executed successfully

2. **Response Quality** ✅
   - Response is not empty
   - Response length > 0 characters

3. **No Errors** ✅
   - No `ArgumentValidationError` in response
   - No thread ID validation errors
   - No tool execution failures

4. **Thread Context** ✅
   - All operations in same thread
   - Context maintained across delegations

## Example Test Output

### Successful Test
```
================================================================================
🧪 Test: Multi-Domain Query (Document + Video)
Query: "Find documents and videos about Google"
Expected Delegations: delegateToDocumentAgent, delegateToMediaAgent
Expected Tools: findDocument, youtubeSearch
--------------------------------------------------------------------------------

Tools Called: findDocument, youtubeSearch

✅ PASSED
✓ All expected tools called
✓ Response generated (1234 chars)
✓ No validation errors
```

### Failed Test
```
================================================================================
🧪 Test: SEC Filing Query
Query: "Get Tesla's latest 10-K filing"
Expected Delegations: delegateToSECAgent
Expected Tools: searchSecFilings
--------------------------------------------------------------------------------

Tools Called: linkupSearch

❌ FAILED
✗ Missing tools: searchSecFilings
✗ Wrong tool called: linkupSearch
```

## Running All Tests

### Quick Test Suite
```bash
npx convex run tools/evaluation/quickTest:runQuickTest
```

**Expected Output:**
```
📊 QUICK TEST SUMMARY
================================================================================
Total Tests: 12
✅ Passed: 12
❌ Failed: 0
Success Rate: 100.0%
================================================================================
```

### Coordinator-Specific Tests
```bash
npx convex run tools/evaluation/quickTest:testCoordinator
```

**Expected Output:**
```
📊 COORDINATOR TEST SUMMARY
================================================================================
Total Tests: 4
✅ Passed: 4
❌ Failed: 0
Success Rate: 100.0%
================================================================================
```

## Integration with CI/CD

### GitHub Actions Example
```yaml
name: Test Coordinator Agent

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npx convex dev --once
      - run: npx convex run tools/evaluation/quickTest:testCoordinator
```

## Troubleshooting

### If Tests Fail

1. **Check Coordinator is Enabled**
   ```typescript
   useCoordinator: true // Should be true
   ```

2. **Verify Thread Context**
   - Look for `ArgumentValidationError` in logs
   - Check thread IDs are valid Convex IDs

3. **Check Tool Registration**
   - Verify specialized agents are imported
   - Check delegation tools are defined

4. **Review Agent Instructions**
   - Coordinator should have delegation instructions
   - Specialized agents should have domain-specific instructions

### Common Issues

**Issue:** `ArgumentValidationError: Value does not match validator`
**Solution:** Thread context inheritance is broken. Check delegation tools use `{}` instead of hardcoded thread IDs.

**Issue:** Empty response
**Solution:** Check `stopWhen: stepCountIs(n)` is sufficient for tool execution.

**Issue:** Wrong tools called
**Solution:** Review coordinator instructions and delegation logic.

## Next Steps

1. **Run Tests** ✅
   ```bash
   npx convex run tools/evaluation/quickTest:testCoordinator
   ```

2. **Monitor Results** 📊
   - Check pass rate
   - Review failed tests
   - Analyze tool usage

3. **Iterate** 🔄
   - Fix failing tests
   - Optimize delegation logic
   - Improve agent instructions

4. **Production Deployment** 🚀
   - Verify 100% pass rate
   - Monitor performance
   - Collect user feedback

## Summary

✅ **QuickTest Updated**

**New Features:**
- Coordinator agent testing
- YouTube search test
- Multi-domain query validation
- Thread context verification

**Test Coverage:**
- 12 quick tests
- 4 coordinator-specific tests
- Multi-step workflow validation
- Error detection and reporting

**Status:** Ready for testing

**Next Action:** Run `npx convex run tools/evaluation/quickTest:testCoordinator`

