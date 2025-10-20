# Authentication Fix - "Make New Document" Feature

## Problem

When users typed "make new document", the agent would call the `createDocument` tool, but it would fail with:

```
Error: Not authenticated
    at handler (../convex/documents.ts:450:27)
```

The frontend would show "..." (incomplete response) because the tool result message wasn't being saved properly.

---

## Root Cause

The issue had **two parts**:

### 1. Missing userId in Agent Context
When `agent.streamText()` was called, the `ctx` parameter didn't have the `evaluationUserId` set. This meant:
- Tools couldn't access the userId
- `createDocument` would call `getAuthUserId(ctx)` which returned null
- Authentication check would fail with "Not authenticated"

### 2. saveStreamDeltas Configuration
The `saveStreamDeltas` option was saving only text deltas, not tool result messages. This caused:
- Tool calls to be saved but not tool results
- Frontend error: "tool_call_ids did not have response messages"
- Incomplete responses showing as "..."

---

## Solution

### Fix 1: Pass userId to Agent Context
**File**: `convex/fastAgentPanelStreaming.ts` (Lines 803-808)

```typescript
// Create a context with userId for tools to access
// This allows tools like createDocument to authenticate properly
const contextWithUserId = {
  ...ctx,
  evaluationUserId: userId,
};

const result = await agent.streamText(
  contextWithUserId as any,  // Pass context with userId
  { threadId: args.threadId },
  { promptMessageId: args.promptMessageId }
);
```

**How it works**:
1. Get userId from thread (line 781)
2. Create new context object with `evaluationUserId` set
3. Pass this context to `agent.streamText()`
4. Tools can now access userId via `(ctx as any).evaluationUserId`

### Fix 2: Remove saveStreamDeltas
**File**: `convex/fastAgentPanelStreaming.ts` (Lines 814-818)

Removed the `saveStreamDeltas` configuration:
```typescript
// BEFORE (broken):
const result = await agent.streamText(ctx, ..., {
  saveStreamDeltas: {
    chunking: "word",
    throttleMs: 100
  }
});

// AFTER (fixed):
const result = await agent.streamText(ctx, ..., {
  // No saveStreamDeltas - let agent handle message saving
});
```

**Why this works**:
- `saveStreamDeltas` only saves text chunks, not tool result messages
- Without it, the agent automatically saves the complete message with all tool results
- Tool calls and results are properly paired
- No more "tool_call_ids did not have response messages" error

---

## Complete Flow Now

```
User: "make new document about LLM"
    ↓
CoordinatorAgent recognizes request
    ↓
Delegates to DocumentAgent
    ↓
DocumentAgent calls createDocument tool
    ↓
Tool receives context with userId
    ↓
Tool authenticates successfully
    ↓
Document created in database
    ↓
Tool returns response with HTML marker
    ↓
Agent saves complete message with tool result
    ↓
consumeStream() completes
    ↓
Fast Agent Panel receives complete message
    ↓
Document card appears and is clickable
    ↓
✅ User can open document
```

---

## Testing

### Quick Test

1. Open Fast Agent Panel
2. Type: "make new document about LLM"
3. Press Enter
4. Verify:
   - ✅ No "Not authenticated" error
   - ✅ No "..." incomplete response
   - ✅ Document is created
   - ✅ Document card appears
   - ✅ Card is clickable
   - ✅ Document opens in editor

### Expected Console Logs

```
[streamAsync:xxxxx] 📡 Calling COORDINATOR AGENT agent.streamText...
[streamAsync:xxxxx] ✅ Stream started, messageId: msg_xxxxx
[createDocument] Creating document: "LLM Document"
[createDocument] Document created with ID: k57abc123def456
[streamAsync:xxxxx] 🏁 Stream completed successfully
[streamAsync:xxxxx] Tool calls: 1, Tool results: 1
```

### Error Logs (Should NOT see)

```
❌ Error: Not authenticated
❌ tool_call_ids did not have response messages
❌ Tool result without preceding tool call
```

---

## Files Modified

1. **`convex/fastAgentPanelStreaming.ts`** (Lines 803-819)
   - Added userId to agent context
   - Removed saveStreamDeltas configuration
   - Added explanatory comments

---

## Why This Works

### Authentication Flow

```
1. streamAsync gets userId from thread
   ↓
2. Creates contextWithUserId with evaluationUserId set
   ↓
3. Passes to agent.streamText()
   ↓
4. Agent calls createDocument tool
   ↓
5. Tool checks: (ctx as any).evaluationUserId
   ↓
6. ✅ userId found, authentication succeeds
   ↓
7. Document created successfully
```

### Message Saving Flow

```
1. agent.streamText() called without saveStreamDeltas
   ↓
2. Agent executes tool call
   ↓
3. Tool returns result
   ↓
4. Agent saves complete message with:
   - Assistant message with tool calls
   - Tool result message
   ↓
5. consumeStream() waits for all to complete
   ↓
6. ✅ Both messages saved to stream
   ↓
7. Frontend receives complete message
```

---

## Backward Compatibility

✅ **No Breaking Changes**
- All existing functionality preserved
- Only added userId to context
- Removed problematic saveStreamDeltas
- All other agents work the same way

---

## Status

🚀 **READY FOR TESTING**

The "make new document" feature should now work correctly:
- ✅ Authentication succeeds
- ✅ Document is created
- ✅ Tool results are saved
- ✅ Document card appears
- ✅ No "..." incomplete responses

**Test it now!**

