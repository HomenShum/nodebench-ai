# Workflow Orchestration Analysis

## Current State

### ❌ Problem: Specialized Agents Are NOT Being Used

The Fast Agent Panel is currently **NOT** using the specialized agent coordinator we created. Instead, it's using a single monolithic agent with all tools.

### Current Flow:
```
User Message
     ↓
initiateAsyncStreaming (mutation)
     ↓
streamAsync (action)
     ↓
createChatAgent("gpt-5-chat-latest") ← Single agent with ALL tools
     ↓
agent.streamText()
     ↓
Response
```

### What We Built (Not Being Used):
```
User Message
     ↓
sendMessageWithCoordinator (action)
     ↓
createCoordinatorAgent() ← Coordinator with delegation tools
     ↓
Delegates to specialized agents:
  - DocumentAgent
  - MediaAgent
  - SECAgent
  - WebAgent
     ↓
Combined Response
```

## Issues with Current Implementation

### 1. No Delegation Happening
**File:** `convex/fastAgentPanelStreaming.ts`
**Line:** 634

```typescript
const chatAgent = createChatAgent(modelName); // ❌ Uses monolithic agent
```

**Should be:**
```typescript
const coordinator = createCoordinatorAgent(ctx, userId); // ✅ Uses coordinator
```

### 2. Coordinator Not Integrated
The coordinator functions exist in `convex/fastAgentPanelCoordinator.ts` but are **never called** by the main Fast Agent Panel.

### 3. No Agent Tracking
The UI doesn't show which specialized agents were used because the coordinator is never invoked.

## Recommended Solutions

### Option 1: Replace Main Agent with Coordinator (Recommended)

**Pros:**
- Automatic delegation to specialized agents
- Better token efficiency (each agent only loads needed tools)
- Better accuracy (domain-specific instructions)
- Agent usage tracking

**Cons:**
- Adds one extra LLM call (coordinator decides which agent to use)
- Slightly higher latency for simple queries

**Implementation:**
```typescript
// In convex/fastAgentPanelStreaming.ts

export const streamAsync = internalAction({
  args: {
    promptMessageId: v.string(),
    threadId: v.string(),
    model: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    
    // ✅ Use coordinator instead of single agent
    const coordinator = createCoordinatorAgent(ctx, userId);
    
    const result = await coordinator.streamText(
      ctx,
      { threadId: args.threadId },
      { promptMessageId: args.promptMessageId },
      {
        saveStreamDeltas: {
          chunking: "word",
          throttleMs: 100
        }
      }
    );
    
    await result.consumeStream();
  },
});
```

### Option 2: Hybrid Approach (Smart Routing)

Use the coordinator for complex queries, single agent for simple ones.

**Pros:**
- Best of both worlds
- Lower latency for simple queries
- Specialized handling for complex queries

**Cons:**
- More complex logic
- Need to classify queries

**Implementation:**
```typescript
export const streamAsync = internalAction({
  args: {
    promptMessageId: v.string(),
    threadId: v.string(),
    model: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    
    // Get the user's prompt
    const message = await ctx.runQuery(components.agent.messages.getMessage, {
      messageId: args.promptMessageId
    });
    
    const prompt = message.content;
    
    // Classify query complexity
    const needsSpecialization = 
      /(?:document|video|sec|filing|youtube)/i.test(prompt) ||
      /(?:find.*and|search.*and)/i.test(prompt); // Multi-domain query
    
    let agent;
    if (needsSpecialization) {
      // Use coordinator for complex/multi-domain queries
      agent = createCoordinatorAgent(ctx, userId);
    } else {
      // Use single agent for simple queries
      agent = createChatAgent(args.model);
    }
    
    const result = await agent.streamText(
      ctx,
      { threadId: args.threadId },
      { promptMessageId: args.promptMessageId },
      {
        saveStreamDeltas: {
          chunking: "word",
          throttleMs: 100
        }
      }
    );
    
    await result.consumeStream();
  },
});
```

### Option 3: User-Selectable Mode

Let users choose between "Fast Mode" (single agent) and "Specialized Mode" (coordinator).

**Pros:**
- User control
- Can compare performance
- Gradual rollout

**Cons:**
- UI complexity
- User confusion

**Implementation:**
```typescript
// Add to thread schema
export const chatThreadsStream = defineTable({
  // ... existing fields
  agentMode: v.optional(v.union(
    v.literal("fast"),
    v.literal("specialized")
  )),
});

// In streamAsync
const thread = await ctx.runQuery(internal.fastAgentPanelStreaming.getThread, {
  threadId: args.threadId
});

const agent = thread.agentMode === "specialized"
  ? createCoordinatorAgent(ctx, userId)
  : createChatAgent(args.model);
```

## Workflow Pattern from Documentation

According to the Convex documentation, there are two main patterns:

### Pattern 1: Sequential Agent Calls (What We Should Use)

```typescript
// From docs: workflows/chaining.ts
export const getAdvice = action({
  args: { location: v.string(), threadId: v.string() },
  handler: async (ctx, { location, threadId }) => {
    const userId = await getAuthUserId(ctx);

    // Step 1: Weather agent
    await weatherAgent.generateText(
      ctx,
      { threadId, userId },
      { prompt: `What is the weather in ${location}?` },
    );

    // Step 2: Fashion agent (uses context from step 1)
    await fashionAgent.generateText(
      ctx,
      { threadId, userId },
      { prompt: `What should I wear based on the weather?` },
    );
  },
});
```

**Our Equivalent:**
```typescript
export const handleMultiDomainQuery = action({
  args: { prompt: v.string(), threadId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    
    // Step 1: Document agent finds documents
    await documentAgent.generateText(
      ctx,
      { threadId: args.threadId, userId },
      { prompt: `Find documents about ${args.prompt}` }
    );
    
    // Step 2: Media agent finds videos (uses context from step 1)
    await mediaAgent.generateText(
      ctx,
      { threadId: args.threadId, userId },
      { prompt: `Find videos about ${args.prompt}` }
    );
  },
});
```

### Pattern 2: WorkflowManager (For Complex Multi-Step)

```typescript
// From docs: workflows/chaining.ts
const workflow = new WorkflowManager(components.workflow);

export const weatherAgentWorkflow = workflow.define({
  args: { location: v.string(), threadId: v.string() },
  handler: async (step, { location, threadId }): Promise<void> => {
    // Step 1: Save message
    const weatherQ = await saveMessage(step, components.agent, {
      threadId,
      prompt: `What is the weather in ${location}?`,
    });
    
    // Step 2: Run agent action with retry
    const forecast = await step.runAction(
      internal.workflows.chaining.getForecast,
      { promptMessageId: weatherQ.messageId, threadId },
      { retry: true },
    );
    
    // Step 3: Another agent action
    const fashionQ = await saveMessage(step, components.agent, {
      threadId,
      prompt: `What should I wear based on the weather?`,
    });
    
    const fashion = await step.runAction(
      internal.workflows.chaining.getFashionAdvice,
      { promptMessageId: fashionQ.messageId, threadId },
      { retry: { maxAttempts: 5, initialBackoffMs: 1000, base: 2 } },
    );
  },
});
```

**When to use WorkflowManager:**
- Multi-step processes that need durability
- Operations that might fail and need retry logic
- Long-running processes that survive server restarts
- Complex orchestration with conditional logic

**When NOT to use WorkflowManager:**
- Simple single-step operations
- Real-time streaming responses
- Operations that complete quickly

## Recommendation

### Immediate Action: Option 1 (Replace with Coordinator)

**Why:**
1. We already built the specialized agents
2. Better architecture (separation of concerns)
3. Token efficiency gains
4. Better accuracy with domain-specific instructions
5. Easy to implement (just swap the agent)

**Implementation Steps:**

1. **Update `streamAsync` to use coordinator:**
```typescript
// convex/fastAgentPanelStreaming.ts
export const streamAsync = internalAction({
  args: {
    promptMessageId: v.string(),
    threadId: v.string(),
    model: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    
    console.log('[streamAsync] Starting stream with COORDINATOR');
    
    // ✅ Use coordinator agent
    const coordinator = createCoordinatorAgent(ctx, userId);
    
    const result = await coordinator.streamText(
      ctx,
      { threadId: args.threadId },
      { promptMessageId: args.promptMessageId },
      {
        saveStreamDeltas: {
          chunking: "word",
          throttleMs: 100
        }
      }
    );
    
    await result.consumeStream();
    console.log('[streamAsync] Stream completed');
  },
});
```

2. **Update `sendMessageInternal` for evaluation:**
```typescript
export const sendMessageInternal = internalAction({
  // ... args
  handler: async (ctx, args) => {
    const coordinator = createCoordinatorAgent(ctx, args.userId);
    
    // ... rest of implementation
  },
});
```

3. **Add agent tracking to UI:**
```typescript
// In FastAgentPanel.tsx
const [agentsUsed, setAgentsUsed] = useState<string[]>([]);

// After message is sent, extract agents from tool calls
// Display: "Agents: Document, Media"
```

### Future Enhancement: WorkflowManager

For complex multi-step operations like:
- "Find Tesla's 10-K, download it, analyze it, and create a summary document"
- "Search for all documents about Q4, analyze them, and create a consolidated report"

We can add WorkflowManager for durability and retry logic.

## Conclusion

**Current Status:** ❌ Specialized agents exist but are NOT being used

**Required Action:** ✅ Integrate coordinator agent into Fast Agent Panel

**Expected Benefits:**
- 60-70% token reduction per request
- Better accuracy with domain-specific instructions
- Clearer agent responsibilities
- Agent usage tracking
- Parallel processing capability

**Next Steps:**
1. Update `streamAsync` to use coordinator
2. Update `sendMessageInternal` to use coordinator
3. Test with multi-domain queries
4. Add agent tracking to UI
5. Monitor performance and token usage

