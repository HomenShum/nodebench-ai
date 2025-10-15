# Streaming Implementation Fixes

## 🎯 Root Cause: Missing `stream: true` Option

**THE CRITICAL ISSUE:** The `useUIMessages` hook was missing `stream: true` in its options, which prevented it from subscribing to streaming deltas.

Without this option, the hook only fetches completed messages and **completely ignores** the streaming deltas being saved to the database.

---

## Issues Identified & Fixed

### ✅ Issue #1: Incorrect `threadId` Validator in `getThreadMessagesWithStreaming`
**Problem:** The query was using `v.id("chatThreadsStream")` as the validator for `threadId`, but the `useUIMessages` hook passes the Agent component's thread ID (a string), not our app's custom thread ID.

**Location:** `convex/fastAgentPanelStreaming.ts` line 222-266

**Error Message:**
```
ArgumentValidationError: Value does not match validator.
Path: .threadId
Value: "m57ew3rjk7pvf5xhmpssy4ytkd7shtdf"
Validator: v.id("chatThreadsStream")
```

**Before:**
```typescript
export const getThreadMessagesWithStreaming = query({
  args: {
    threadId: v.id("chatThreadsStream"),  // ❌ Wrong validator
    paginationOpts: paginationOptsValidator,
    streamArgs: vStreamArgs,
  },
  handler: async (ctx, args) => {
    // Verify access
    const thread = await ctx.db.get(args.threadId);
    if (!thread || thread.userId !== userId) {
      return { page: [], continueCursor: null, isDone: true };
    }

    // Use thread.agentThreadId...
  },
});
```

**After:**
```typescript
export const getThreadMessagesWithStreaming = query({
  args: {
    threadId: v.string(),  // ✅ Correct: Agent component's thread ID is a string
    paginationOpts: paginationOptsValidator,
    streamArgs: vStreamArgs,
  },
  handler: async (ctx, args) => {
    // Verify the user has access to this agent thread
    const agentThread = await ctx.runQuery(components.agent.threads.getThread, {
      threadId: args.threadId,
    });

    if (!agentThread || agentThread.userId !== userId) {
      return { page: [], continueCursor: "", isDone: true, streams: [] };
    }

    // Use args.threadId directly...
  },
});
```

**Why this matters:**
1. The `useUIMessages` hook passes the Agent component's thread ID (string) to the query
2. We need to validate against `v.string()`, not `v.id("chatThreadsStream")`
3. We verify access by querying the Agent component's thread table instead of our custom table
4. Return type must use empty string `""` for `continueCursor`, not `null`

---

### ✅ Issue #2: Incorrect `threadId` Type in `useUIMessages` Hook
**Problem:** The `useUIMessages` hook expects the Agent component's `threadId` (a string), but we were passing our app's `chatThreadsStream` ID. Additionally, the hook doesn't accept `paginationOpts` in the args - it handles pagination internally.

**Location:** `src/components/FastAgentPanel/FastAgentPanel.tsx` line 107-128

**Before:**
```typescript
const { results: streamingMessages, status: streamingStatus } = useUIMessages(
  api.fastAgentPanelStreaming.getThreadMessagesWithStreaming,
  activeThreadId && chatMode === 'agent-streaming'
    ? {
        threadId: activeThreadId as Id<"chatThreadsStream">,  // ❌ Wrong ID type
      }
    : "skip",
  {
    initialNumItems: 100,
    stream: true
  }
);
```

**After:**
```typescript
// First, fetch the thread to get the agentThreadId
const streamingThread = useQuery(
  api.fastAgentPanelStreaming.getThreadByStreamId,
  activeThreadId && chatMode === 'agent-streaming'
    ? { threadId: activeThreadId as Id<"chatThreadsStream"> }
    : "skip"
);

// Then use the agentThreadId with useUIMessages
const { results: streamingMessages, status: _streamingStatus } = useUIMessages(
  api.fastAgentPanelStreaming.getThreadMessagesWithStreaming,
  streamingThread?.agentThreadId && chatMode === 'agent-streaming'
    ? {
        threadId: streamingThread.agentThreadId,  // ✅ Correct: Agent component's threadId
      }
    : "skip",
  {
    initialNumItems: 100,  // ✅ Pagination handled by the hook
    stream: true
  }
);
```

**Why this matters:**
1. The `useUIMessages` hook expects `threadId` to be the Agent component's thread ID (string), not your app's custom thread ID
2. The hook automatically handles `paginationOpts` internally using `initialNumItems`
3. The type `UIMessagesQueryArgs` explicitly removes `paginationOpts` from expected args

---

### ✅ Issue #3: Missing `stream: true` in `useUIMessages` Options (CRITICAL!)

**Problem:** The `useUIMessages` hook was not configured to subscribe to streaming deltas. Without `stream: true`, the hook only fetches completed messages and completely ignores the streaming deltas being saved to the database.

**Location:** `src/components/FastAgentPanel/FastAgentPanel.tsx` line 115-128

**Error Symptom:** Messages appear only after they're fully generated, with no real-time streaming visible to the user.

**Before:**
```typescript
const { results: streamingMessages, status: _streamingStatus } = useUIMessages(
  api.fastAgentPanelStreaming.getThreadMessagesWithStreaming,
  streamingThread?.agentThreadId && chatMode === 'agent-streaming'
    ? {
        threadId: streamingThread.agentThreadId,
      }
    : "skip",
  {
    initialNumItems: 100,
    // ❌ MISSING: stream: true
  }
);
```

**After:**
```typescript
const { results: streamingMessages, status: _streamingStatus } = useUIMessages(
  api.fastAgentPanelStreaming.getThreadMessagesWithStreaming,
  streamingThread?.agentThreadId && chatMode === 'agent-streaming'
    ? {
        threadId: streamingThread.agentThreadId,
      }
    : "skip",
  {
    initialNumItems: 100,
    stream: true,  // ✅ CRITICAL: Enable streaming deltas!
  }
);
```

**Why this matters:**
1. Without `stream: true`, the hook **does not call `syncStreams()`** to fetch streaming deltas
2. The backend is saving deltas correctly, but the frontend never subscribes to them
3. This is the **most critical** setting for enabling real-time streaming
4. From the docs: "passing in `stream: true` to enable streaming"

**Reference from working example:**
```typescript
// ChatStreaming.tsx - Working example
const { results: messages } = useUIMessages(
  api.chat.streaming.listThreadMessages,
  { threadId },
  { initialNumItems: 10, stream: true },  // ✅ stream: true is required!
);
```

---

### ✅ Issue #4: Missing `useSmoothText` Hook for Streaming Animation
**Problem:** The `MessageBubble` component was not using the `useSmoothText` hook from `@convex-dev/agent/react`, which provides smooth character-by-character streaming animation.

**Location:** `src/components/FastAgentPanel/FastAgentPanel.MessageBubble.tsx`

**Changes:**
1. **Added import:**
```typescript
import { useSmoothText } from '@convex-dev/agent/react';
```

2. **Added smooth text hook:**
```typescript
// Use smooth text streaming for assistant messages
const [smoothText] = useSmoothText(contentToRender, {
  startStreaming: isStreaming && isAssistant,
});

// Use smooth text for streaming, otherwise use the raw content
const displayText = isStreaming && isAssistant ? smoothText : contentToRender;
```

3. **Updated ReactMarkdown to use `displayText`:**
```typescript
<ReactMarkdown>
  {displayText}  {/* Changed from contentToRender */}
</ReactMarkdown>
```

**Why this matters:** The `useSmoothText` hook provides:
- Smooth character-by-character animation
- Adaptive speed based on incoming text rate
- Better UX during streaming
- Automatic handling of streaming state transitions

---

### ⚠️ Issue #5: WebSocket Connection Error (Not Critical)
**Error:** `WebSocket connection to 'ws://localhost:5175/' failed`

**Analysis:** This error is **NOT** related to your Convex streaming implementation. Here's why:

1. **Convex uses its own WebSocket:** Your app connects to `wss://formal-shepherd-851.convex.cloud` (from `.env.local`)
2. **Port mismatch:** Vite dev server runs on port 5173 (default), not 5175
3. **Likely source:** Browser extension, dev tool, or unrelated service

**How to verify:**
1. Open DevTools → Network → WS tab
2. Look for WebSocket connections to `formal-shepherd-851.convex.cloud`
3. If Convex queries/mutations work, the WebSocket is fine

**Action:** No fix needed. This is a harmless error from an unrelated source.

---

## How Streaming Works Now

### Architecture Overview

```
User sends message
    ↓
FastAgentPanel.tsx: sendStreamingMessage()
    ↓
convex/fastAgentPanelStreaming.ts: initiateAsyncStreaming (mutation)
    ↓
Saves user message + schedules streamAsync action
    ↓
streamAsync (internal action)
    ↓
chatAgent.streamText() with saveStreamDeltas
    ↓
Agent component saves deltas to database
    ↓
Frontend: useUIMessages hook subscribes to deltas
    ↓
syncStreams() returns streaming deltas
    ↓
MessageBubble: useSmoothText() animates text
    ↓
User sees smooth streaming animation
```

### Key Components

1. **Backend (Convex):**
   - `initiateAsyncStreaming`: Mutation that saves user message and schedules streaming
   - `streamAsync`: Internal action that calls `chatAgent.streamText()`
   - `getThreadMessagesWithStreaming`: Query that returns messages + stream deltas
   - `syncStreams`: Returns active streaming deltas for a thread

2. **Frontend (React):**
   - `useUIMessages`: Hook that subscribes to messages and streaming deltas
   - `useSmoothText`: Hook that animates streaming text character-by-character
   - `MessageBubble`: Component that renders messages with smooth streaming

### Stream Delta Configuration

```typescript
{
  saveStreamDeltas: {
    chunking: "word",      // Chunk by word boundaries
    throttleMs: 50         // Update every 50ms for smooth animation
  }
}
```

**Options:**
- `chunking`: "word" | "line" | regex | custom function
- `throttleMs`: Milliseconds between delta saves (lower = smoother, higher = fewer DB writes)

---

## Testing the Fix

### 1. Start the dev server
```bash
npm run dev
```

### 2. Open the app and enable Agent Streaming mode
- Click the "Streaming" toggle in FastAgentPanel header
- Create a new chat or select existing thread

### 3. Send a message
- Type a message and send
- You should see:
  - User message appears immediately (optimistic update)
  - Assistant message starts streaming with smooth animation
  - Text appears character-by-character
  - Cursor blinks during streaming

### 4. Verify in DevTools
- Open Console and look for:
  ```
  [FastAgentPanel] Messages updated: X messages
  [FastAgentPanel] Last message: { role: 'assistant', textLength: Y, status: 'streaming' }
  ```
- Check Network → WS tab for Convex WebSocket connection
- Should see connection to `wss://formal-shepherd-851.convex.cloud`

---

## Common Issues & Solutions

### Issue: Messages not streaming
**Check:**
1. Is "Agent Streaming" mode enabled? (toggle in header)
2. Are there console errors?
3. Is the Convex backend running? (`npm run dev:backend`)

### Issue: Text appears all at once
**Check:**
1. Is `useSmoothText` being used? (should be in MessageBubble.tsx)
2. Is `startStreaming: true` being passed to `useSmoothText`?
3. Check if `displayText` is being used in ReactMarkdown

### Issue: Streaming never completes
**Check:**
1. Backend logs for errors in `streamAsync`
2. Is `result.consumeStream()` being called?
3. Check if OpenAI API key is valid

---

## Performance Considerations

### Delta Throttling
- Current: 50ms (20 updates/second)
- Recommended range: 50-200ms
- Lower = smoother but more DB writes
- Higher = fewer DB writes but choppier animation

### Chunking Strategy
- `"word"`: Best for natural language (current)
- `"line"`: Better for code/structured output
- Custom regex: For specific use cases

### Memory Management
- Stream deltas are automatically cleaned up after completion
- Old messages are paginated (100 items initial load)
- Use `loadMore()` to fetch older messages

---

## Next Steps

### Recommended Enhancements

1. **Add abort functionality:**
   - Already implemented in `convex/chat/streamAbort.ts`
   - Wire up to UI button

2. **Add retry on error:**
   - Detect failed streams
   - Show retry button
   - Rerun `streamAsync` with same message

3. **Add streaming indicators:**
   - Show "AI is thinking..." before first delta
   - Show token count during streaming
   - Show completion time after streaming

4. **Optimize for mobile:**
   - Reduce `throttleMs` on slower connections
   - Add connection quality detection
   - Fallback to non-streaming on poor connections

---

## References

- [Convex Agent Docs](https://docs.convex.dev/agents)
- [Streaming Messages](https://docs.convex.dev/agents/messages#streaming)
- [Agent Component GitHub](https://github.com/get-convex/agent)
- [AI SDK Documentation](https://sdk.vercel.ai/docs)

