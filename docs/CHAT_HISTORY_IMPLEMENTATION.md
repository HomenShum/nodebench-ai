# Chat History & Dynamic Progress Implementation Guide

## 🎯 Summary

This document provides a complete implementation guide for:
1. **Chat History Integration**: Display agent runs as conversational chat history
2. **Dynamic Execution Bars**: Update bars in real-time based on actual execution time

---

## ✅ Current State Analysis

### **What's Already Implemented**

1. ✅ **Schema has required fields**:
   - `agentTasks.startedAtMs` - Actual start time
   - `agentTasks.elapsedMs` - Actual elapsed time
   - `agentTasks.status` - Current status (pending/running/complete/error)

2. ✅ **Execution bar component exists**:
   - `src/components/agentDashboard/ExecutionBar.tsx`
   - `src/components/agentDashboard/AgentTimeline.tsx`

3. ✅ **Chat components exist**:
   - `src/components/agentDashboard/AgentChats.tsx`
   - `src/components/AIChatPanel/AIChatPanel.tsx`

### **What Needs to Be Implemented**

1. ❌ **Chat history for agent runs**: Agent outputs not stored as chat messages
2. ❌ **Dynamic bar width**: Bars use static 600s duration, not actual `elapsedMs`
3. ❌ **Real-time updates**: Orchestrator doesn't update Convex during execution

---

## 📋 Implementation Plan

### **Phase 1: Dynamic Execution Bars** (High Priority)

#### **Step 1.1: Update AgentTimeline.tsx Bar Calculations**

**File**: `src/components/agentDashboard/AgentTimeline.tsx`

**Current Code** (Lines ~400-420):
```typescript
const widthPct = (task: any) => {
  const dur = Number((task as any).durationMs ?? 0);
  return `${(dur / (windowEndMs - windowStartMs)) * 100}%`;
};
```

**Updated Code**:
```typescript
const widthPct = (task: any) => {
  const status = String(task.status ?? 'pending').toLowerCase();
  const baseStartMs = Number((timeline as any)?.baseStartMs ?? Date.now());
  
  // For completed tasks, use actual elapsed time
  if (status === 'complete' || status === 'error') {
    const elapsed = Number((task as any).elapsedMs ?? 0);
    return `${Math.max(0.5, (elapsed / (windowEndMs - windowStartMs)) * 100)}%`;
  }
  
  // For running tasks, calculate current elapsed time
  if (status === 'running') {
    const startMs = (task as any).startedAtMs ?? (baseStartMs + Number((task as any).startOffsetMs ?? 0));
    const elapsed = Date.now() - startMs;
    return `${Math.max(0.5, (elapsed / (windowEndMs - windowStartMs)) * 100)}%`;
  }
  
  // For pending tasks, show minimal width (0.5% = thin line)
  return '0.5%';
};
```

**Why This Works**:
- ✅ Uses actual `elapsedMs` for completed tasks
- ✅ Calculates real-time elapsed for running tasks
- ✅ Shows thin bar for pending tasks (not 600s)
- ✅ Convex reactivity automatically updates UI

#### **Step 1.2: Update Window Size Calculation**

**Current Issue**: Window is fixed at 600s (10 minutes)

**File**: `src/components/agentDashboard/AgentTimeline.tsx` (Lines ~200-220)

**Current Code**:
```typescript
const windowEndMs = windowStartMs + 600000; // Fixed 10 minutes
```

**Updated Code**:
```typescript
// Calculate window size based on actual task durations
const maxElapsed = Math.max(
  ...tasks.map((t: any) => {
    const status = String(t.status ?? 'pending').toLowerCase();
    if (status === 'complete' || status === 'error') {
      return Number(t.startOffsetMs ?? 0) + Number(t.elapsedMs ?? 0);
    }
    if (status === 'running') {
      const startMs = t.startedAtMs ?? (baseStartMs + Number(t.startOffsetMs ?? 0));
      return (startMs - baseStartMs) + (Date.now() - startMs);
    }
    return Number(t.startOffsetMs ?? 0) + Number(t.durationMs ?? 0);
  }),
  60000 // Minimum 1 minute window
);

const windowEndMs = windowStartMs + Math.max(maxElapsed, 60000);
```

**Why This Works**:
- ✅ Window grows dynamically as tasks execute
- ✅ No artificial 600s limit
- ✅ Minimum 1-minute window for visibility

---

### **Phase 2: Real-Time Progress Updates** (High Priority)

#### **Step 2.1: Create Convex Integration in Orchestrator**

**File**: `agents/core/orchestrator.ts`

**Add Convex Client**:
```typescript
import { ConvexHttpClient } from "convex/browser";

const convexUrl = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;
const convexClient = convexUrl ? new ConvexHttpClient(convexUrl) : null;
```

**Update Node Execution**:
```typescript
// Before executing node
const t0 = Date.now();
if (convexClient && node.convexTaskId) {
  await convexClient.mutation(api.agentTimelines.updateTaskMetrics, {
    taskId: node.convexTaskId,
    status: 'running',
    startedAtMs: t0,
  });
}

// Execute node
const result = await executeNode(node);

// After executing node
const elapsed = Date.now() - t0;
if (convexClient && node.convexTaskId) {
  await convexClient.mutation(api.agentTimelines.updateTaskMetrics, {
    taskId: node.convexTaskId,
    status: 'complete',
    elapsedMs: elapsed,
    progress: 1.0,
  });
}
```

#### **Step 2.2: Link Graph Nodes to Convex Tasks**

**File**: `agents/app/cli.ts`

**Create Timeline and Tasks**:
```typescript
if (taskSpec.type === 'orchestrate' && taskSpec.tripPlanning) {
  const graph = buildTripPlanningGraph(taskSpec.tripPlanning);
  
  // Create timeline in Convex
  const timelineId = await convexClient.mutation(api.agentTimelines.create, {
    name: taskSpec.goal,
    description: taskSpec.topic,
  });
  
  // Create tasks for each node
  const nodeToTaskId = new Map();
  for (const node of graph.nodes) {
    const taskId = await convexClient.mutation(api.agentTimelines.addTask, {
      timelineId,
      name: node.label || node.id,
      startOffsetMs: 0, // Will be updated when node starts
      durationMs: 60000, // Estimated 1 minute (will be replaced by actual)
      status: 'pending',
      agentType: node.kind === 'search' ? 'main' : 'leaf',
    });
    nodeToTaskId.set(node.id, taskId);
  }
  
  // Add task IDs to nodes
  graph.nodes.forEach((node) => {
    (node as any).convexTaskId = nodeToTaskId.get(node.id);
  });
  
  // Execute orchestration
  const orch = await orchestrate({ taskSpec: { ...taskSpec, graph }, tools, trace, data });
}
```

---

### **Phase 3: Chat History Integration** (Medium Priority)

#### **Step 3.1: Add Chat Messages Schema**

**File**: `convex/schema.ts`

**Add Table**:
```typescript
chatMessages: defineTable({
  threadId: v.id("documents"),
  role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
  content: v.string(),
  timelineId: v.optional(v.id("agentTimelines")), // Link to agent run
  createdAt: v.number(),
  metadata: v.optional(v.object({
    taskSpec: v.any(),
    executionMetrics: v.optional(v.object({
      totalMs: v.number(),
      cost: v.number(),
      nodes: v.number(),
    })),
  })),
}).index("by_thread", ["threadId", "createdAt"]),
```

#### **Step 3.2: Create Chat Thread Mutation**

**File**: `convex/agentTimelines.ts`

**Add Mutation**:
```typescript
export const createChatThreadForRun = mutation({
  args: {
    timelineId: v.id("agentTimelines"),
    userInput: v.string(),
    assistantOutput: v.string(),
    taskSpec: v.any(),
    executionMetrics: v.optional(v.object({
      totalMs: v.number(),
      cost: v.number(),
      nodes: v.number(),
    })),
  },
  returns: v.id("documents"),
  handler: async (ctx, args) => {
    const userId = await getSafeUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Create document for thread
    const threadId = await ctx.db.insert("documents", {
      title: `Trip Plan: ${args.userInput.slice(0, 50)}...`,
      content: args.assistantOutput,
      userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Add user message
    await ctx.db.insert("chatMessages", {
      threadId,
      role: "user",
      content: args.userInput,
      createdAt: Date.now(),
    });

    // Add assistant message
    await ctx.db.insert("chatMessages", {
      threadId,
      role: "assistant",
      content: args.assistantOutput,
      timelineId: args.timelineId,
      createdAt: Date.now() + 1,
      metadata: {
        taskSpec: args.taskSpec,
        executionMetrics: args.executionMetrics,
      },
    });

    return threadId;
  },
});
```

#### **Step 3.3: Update CLI to Create Chat Thread**

**File**: `agents/app/cli.ts`

**After Orchestration**:
```typescript
if (taskSpec.type === 'orchestrate' && taskSpec.tripPlanning) {
  const orch = await orchestrate({ taskSpec, tools, trace, data });
  
  // Create chat thread
  const threadId = await convexClient.mutation(api.agentTimelines.createChatThreadForRun, {
    timelineId: orch.timelineId,
    userInput: taskSpec.goal,
    assistantOutput: orch.result,
    taskSpec,
    executionMetrics: {
      totalMs: orch.totalMs,
      cost: orch.cost,
      nodes: orch.nodes,
    },
  });
  
  console.log(`Chat thread created: ${threadId}`);
  console.log(orch.result);
}
```

#### **Step 3.4: Display Chat History**

**File**: `src/components/agentDashboard/AgentChats.tsx`

**Update to Show Messages**:
```typescript
const messages = useQuery(api.chatMessages.listByThread, { threadId: selectedThreadId });

return (
  <div className="chat-history">
    {messages?.map((msg) => (
      <div key={msg._id} className={`message ${msg.role}`}>
        <div className="message-header">
          {msg.role === 'user' ? '👤 You' : '🤖 Assistant'}
          <span className="timestamp">{new Date(msg.createdAt).toLocaleString()}</span>
        </div>
        <div className="message-content">
          <ReactMarkdown>{msg.content}</ReactMarkdown>
        </div>
        {msg.timelineId && (
          <button onClick={() => openTimeline(msg.timelineId)}>
            View Timeline
          </button>
        )}
      </div>
    ))}
  </div>
);
```

---

## 🧪 Testing

### **Test 1: Dynamic Execution Bars**

```bash
# Run trip planning
npx tsx agents/app/cli.ts agents/app/demo_scenarios/task_spec_trip_sf.json

# Expected:
# - Bars start thin (0.5% width)
# - Bars grow as agents execute
# - Final bars show actual elapsed time (2-8s, not 600s)
```

### **Test 2: Chat History**

```bash
# Run trip planning
npx tsx agents/app/cli.ts agents/app/demo_scenarios/task_spec_trip_sf.json

# Open Agent Dashboard
# Navigate to "Chats" tab
# Expected:
# - See user input: "Plan a 2-day trip to San Francisco..."
# - See assistant output: Full trip plan markdown
# - "View Timeline" button links to agent timeline
```

---

## 📊 Expected Results

### **Before (Static 600s)**
```
weather_research    [████████████████████████] 600s
attractions_research[████████████████████████] 600s
```

### **After (Dynamic)**
```
weather_research    [███] 2.3s ✅
attractions_research[████] 2.6s ✅
restaurants_research[████▌] 2.8s (running...) ✅
```

---

## 🎉 Benefits

✅ **Accurate execution visualization**: Bars reflect actual time  
✅ **Real-time updates**: See progress as it happens  
✅ **Chat history**: Conversational interface for agent runs  
✅ **Better UX**: No misleading 10-minute estimates  

---

## 📝 Implementation Checklist

- [ ] Update `widthPct()` in `AgentTimeline.tsx`
- [ ] Update window size calculation
- [ ] Add Convex client to orchestrator
- [ ] Link graph nodes to Convex tasks
- [ ] Add `chatMessages` table to schema
- [ ] Create `createChatThreadForRun` mutation
- [ ] Update CLI to create chat threads
- [ ] Update `AgentChats.tsx` to display messages
- [ ] Test with trip planning example
- [ ] Update documentation

---

## 🔗 Related Files

- `src/components/agentDashboard/AgentTimeline.tsx`
- `agents/core/orchestrator.ts`
- `agents/app/cli.ts`
- `convex/schema.ts`
- `convex/agentTimelines.ts`
- `src/components/agentDashboard/AgentChats.tsx`

