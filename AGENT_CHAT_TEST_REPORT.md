# Agent Chat Testing Report - Playwright E2E Analysis

**Date:** 2025-11-10  
**Test Framework:** Playwright  
**Tests Run:** 12  
**Tests Passed:** 2  
**Tests Failed:** 10  
**Success Rate:** 16.7%

---

## Critical Issues Found

### 🔴 ISSUE #1: Send Button Disabled When Not Authenticated
**Severity:** CRITICAL  
**Location:** `src/components/MiniNoteAgentChat.tsx` line 231  
**Problem:**
- Send button is DISABLED when user is not authenticated
- This contradicts the recent change to show chat input immediately
- Button shows "Send (sign in)" but is disabled, preventing user interaction
- Users cannot trigger the sign-in flow

**Current Code:**
```tsx
disabled={creating || sending || !input.trim()}
```

**Expected Behavior:**
- Button should be ENABLED when user is not authenticated
- Clicking should trigger sign-in flow
- Button should only be disabled when input is empty

**Impact:** Users cannot send messages on landing page - defeats the purpose of showing input immediately

---

### 🔴 ISSUE #2: Layout Overlay Blocking Click Events
**Severity:** CRITICAL  
**Location:** `src/components/views/WelcomeLanding.tsx`  
**Problem:**
- Multiple overlapping divs are intercepting pointer events
- Playwright logs show: "intercepts pointer events" from:
  - `opacity-0 animate-[fadeUp_0.8s_ease-out_1s_forwards]` (animated hero section)
  - `parallax-container` (background parallax)
  - Chat container itself
- Elements are not stable during animation
- Click retries fail 13+ times before timeout

**Root Cause:**
- Hero section animations are still running and blocking clicks
- Parallax container has pointer events enabled
- No pointer-events: none on non-interactive animated elements

**Impact:** Cannot interact with chat input during page load animations

---

### 🔴 ISSUE #3: Browser/Context Closes During Tests
**Severity:** CRITICAL  
**Problem:**
- Multiple tests timeout with "Target page, context or browser has been closed"
- Happens after 30 seconds of retry attempts
- Suggests backend is crashing or hanging

**Possible Causes:**
1. Backend streaming action hangs indefinitely
2. Convex connection drops
3. Memory leak in streaming handler
4. Unhandled promise rejection crashes process

---

### 🟡 ISSUE #4: No Error Handling for Failed Sign-In
**Severity:** HIGH  
**Location:** `src/components/MiniNoteAgentChat.tsx` line 114-130  
**Problem:**
- `onSignInRequired` callback has no error handling
- If sign-in fails, message is lost
- No user feedback about auth failure
- Input is cleared before sign-in completes

**Current Code:**
```tsx
if (!user) {
  if (onSignInRequired) {
    await onSignInRequired();
    setInput(msg); // Message preserved but no error handling
    return;
  }
}
```

---

### 🟡 ISSUE #5: Streaming Timeout Not Implemented
**Severity:** HIGH  
**Location:** `convex/fastAgentPanelStreaming.ts`  
**Problem:**
- No timeout on streaming operations
- Agent can hang indefinitely
- No heartbeat/keepalive mechanism
- User has no way to know if agent is stuck

---

### 🟡 ISSUE #6: Message Not Cleared on Send Failure
**Severity:** MEDIUM  
**Location:** `src/components/MiniNoteAgentChat.tsx` line 150  
**Problem:**
- Input is cleared BEFORE message is confirmed sent
- If send fails, message is lost
- User doesn't know if message was sent

**Current Code:**
```tsx
await sendStreaming({ threadId, prompt: msg });
setSending(false);
setInput(''); // Cleared before confirmation
```

---

## UI/UX Issues

### 🟠 Issue: Animations Block Interaction
- Hero section fade-up animation runs for 1.8s (0.8s + 1s delay)
- Parallax container is interactive during animation
- Users cannot click chat input until animations complete
- **Fix:** Add `pointer-events: none` to animated elements

### 🟠 Issue: No Loading State Feedback
- "Thinking…" indicator appears but no context
- User doesn't know what agent is doing
- No tool execution visibility
- **Fix:** Show "Searching web...", "Analyzing document...", etc.

### 🟠 Issue: No Error Messages
- Failed sends show no error
- Network errors silent
- Auth failures not communicated
- **Fix:** Add toast notifications for errors

### 🟠 Issue: Keyboard Shortcut Not Obvious
- Shift+Enter for newline not documented
- Ctrl+Enter shortcut not visible
- **Fix:** Show hint in placeholder or below input

---

## Backend Issues

### 🔴 Issue: Streaming Action Hangs
**Location:** `convex/fastAgentPanelStreaming.ts:916`  
**Problem:**
- `agent.streamText()` may hang indefinitely
- No timeout mechanism
- AbortController set but may not work properly
- **Fix:** Add explicit timeout (30s default)

### 🔴 Issue: No Heartbeat/Keepalive
**Problem:**
- Long-running streams have no keepalive
- Browser may close connection thinking it's dead
- **Fix:** Send periodic heartbeat messages

### 🟡 Issue: Error Recovery
**Problem:**
- If streaming fails, thread is left in bad state
- Cancel flag not reset on error
- **Fix:** Ensure finally block always runs

---

## Proposed Better Agent Frameworks

### Current Stack Issues:
1. **@convex-dev/agent** - Good but:
   - Limited streaming control
   - No built-in timeout
   - Difficult error recovery
   - No tool result streaming

2. **OpenAI SDK** - Good but:
   - No persistence
   - Manual state management
   - No built-in memory

### Recommended Alternatives:

#### 1. **Vercel AI SDK (Recommended)**
```typescript
import { generateText, streamText } from 'ai';

// Better streaming with built-in timeout
const result = await streamText({
  model: openai('gpt-4'),
  prompt: 'Hello',
  temperature: 0.7,
  maxTokens: 2000,
  system: 'You are helpful',
  tools: { /* tools */ },
  toolChoice: 'auto',
  onFinish: (event) => {
    // Guaranteed to run
  },
});

// Built-in streaming with proper error handling
for await (const chunk of result.textStream) {
  console.log(chunk);
}
```

**Advantages:**
- ✅ Built-in streaming with proper error handling
- ✅ Tool calling with automatic result handling
- ✅ Timeout support
- ✅ Better TypeScript support
- ✅ Structured output support
- ✅ Cost tracking built-in

#### 2. **LangChain (For Complex Workflows)**
```typescript
import { ChatOpenAI } from '@langchain/openai';
import { AgentExecutor, createOpenAIToolsAgent } from 'langchain/agents';

const agent = await createOpenAIToolsAgent({
  llm: new ChatOpenAI({ model: 'gpt-4' }),
  tools: [tool1, tool2],
  prompt: ChatPromptTemplate.fromMessages([...]),
});

const executor = new AgentExecutor({
  agent,
  tools,
  maxIterations: 10,
  returnIntermediateSteps: true,
});

const result = await executor.invoke({ input: 'question' });
```

**Advantages:**
- ✅ Multi-step agent orchestration
- ✅ Memory management
- ✅ Tool chaining
- ✅ Callback system for streaming
- ✅ Extensive middleware

#### 3. **Anthropic SDK (For Claude)**
```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();
const stream = client.messages.stream({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 2000,
  tools: [...],
  messages: [...],
});

stream.on('text', (text) => console.log(text));
stream.on('error', (error) => console.error(error));
```

**Advantages:**
- ✅ Native streaming with events
- ✅ Proper error handling
- ✅ Tool use with automatic retry
- ✅ Better context window management

#### 4. **Hybrid Approach (Recommended for Your Stack)**
Combine Convex Agent + Vercel AI SDK:

```typescript
// convex/agent.ts
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

export const streamAgent = internalAction({
  args: { threadId: v.string(), prompt: v.string() },
  handler: async (ctx, args) => {
    const result = await streamText({
      model: openai('gpt-4'),
      prompt: args.prompt,
      system: 'You are helpful',
      tools: { /* tools */ },
      onFinish: async (event) => {
        // Save final message
        await ctx.runMutation(internal.messages.save, {
          threadId: args.threadId,
          content: event.text,
        });
      },
    });

    // Stream to client
    for await (const chunk of result.textStream) {
      await ctx.runMutation(internal.messages.appendDelta, {
        threadId: args.threadId,
        delta: chunk,
      });
    }
  },
});
```

**Advantages:**
- ✅ Convex persistence + Vercel streaming
- ✅ Better error handling
- ✅ Proper timeout support
- ✅ Tool result streaming
- ✅ Cost tracking

---

## Immediate Fixes Required

### Priority 1 (Blocking):
1. ✅ Enable Send button when not authenticated
2. ✅ Add `pointer-events: none` to animated hero section
3. ✅ Add timeout to streaming operations (30s)

### Priority 2 (High):
4. Add error handling for failed sends
5. Add error toast notifications
6. Implement heartbeat for long streams
7. Clear input AFTER send confirmation

### Priority 3 (Medium):
8. Add tool execution visibility
9. Document keyboard shortcuts
10. Add loading state feedback

---

## Test Results Summary

| Test | Status | Issue |
|------|--------|-------|
| Chat input visible | ✅ PASS | - |
| Send button enabled | ❌ FAIL | Button disabled |
| Type in input | ✅ PASS | - |
| Send triggers auth | ❌ FAIL | Layout blocking |
| Message appears | ❌ FAIL | Browser closes |
| Agent response streams | ❌ FAIL | Browser closes |
| Stop button visible | ❌ FAIL | Browser closes |
| Conversation history | ❌ FAIL | Browser closes |
| Keyboard shortcut | ❌ FAIL | Browser closes |
| Auto-scroll | ❌ FAIL | Browser closes |
| Error handling | ❌ FAIL | Browser closes |
| No console errors | ❌ FAIL | Browser closes |


