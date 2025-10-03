# Chat History Integration & Dynamic Progress Bars

## 🎯 Requirements

### **1. Chat History Integration**
The trip plan (and all agent outputs) should appear as part of a chat history showing:
- **User Input**: "Make a plan for SF trip spanning from 10/3/2025 to 10/4/2025"
- **Assistant Response**: The complete trip plan in markdown format
- **Conversational Format**: Like a chat between user and AI assistant

### **2. Dynamic Execution Bars**
The execution bars should update in real-time as agents complete, not use a static 10-minute (600s) estimate:
- ❌ **Current**: Bars are pre-allocated with 600s duration, don't grow dynamically
- ✅ **Expected**: Bars should grow as agents execute and complete

---

## 📋 Current Implementation Issues

### **Issue 1: No Chat History for Agent Runs**

**Current State**:
- Agent runs are displayed in `AgentTimeline.tsx` and `AgentTasks.tsx`
- No integration with chat history (`AgentChats.tsx`)
- User input and agent output are not shown conversationally

**Expected State**:
- User input: "Make a plan for SF trip spanning from 10/3/2025 to 10/4/2025"
- Assistant response: Full trip plan markdown
- Stored in `chatThreads` or `documents` table
- Displayed in `AgentChats.tsx` or `AIChatPanel.tsx`

---

### **Issue 2: Static 600s Execution Bars**

**Current State** (from `agent_dashboard_prototype_100225.html`):
```javascript
// Line 1068: Static 600s duration
const startPos = (agent.startTime / 600) * 100;
const width = (agent.duration / 600) * 100;
```

**Problem**:
- All bars are pre-allocated with 600s (10 minutes) duration
- Bars don't grow dynamically as agents execute
- Progress indicator shows percentage, but bar width is static

**Expected State**:
- Bars should start small and grow as agents execute
- Width should be based on `elapsedMs` or `durationMs` (actual time)
- Should update in real-time via Convex reactivity

---

## ✅ Solution Design

### **Solution 1: Chat History Integration**

#### **A. Store Agent Runs as Chat Messages**

**Schema Addition** (`convex/schema.ts`):
```typescript
chatMessages: defineTable({
  threadId: v.id("documents"),
  role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
  content: v.string(),
  timelineId: v.optional(v.id("agentTimelines")), // Link to agent run
  createdAt: v.number(),
  metadata: v.optional(v.object({
    taskSpec: v.any(), // Original task spec
    executionMetrics: v.any(), // Execution time, cost, etc.
  })),
}).index("by_thread", ["threadId", "createdAt"]),
```

#### **B. Create Chat Thread on Agent Run**

**New Mutation** (`convex/agentTimelines.ts`):
```typescript
export const createChatThreadForRun = mutation({
  args: {
    timelineId: v.id("agentTimelines"),
    userInput: v.string(),
    assistantOutput: v.string(),
    taskSpec: v.any(),
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
      },
    });

    return threadId;
  },
});
```

#### **C. Update CLI to Create Chat Thread**

**Update** (`agents/app/cli.ts`):
```typescript
if (taskSpec.type === 'orchestrate') {
  const orch = await orchestrate({ taskSpec, tools, trace, data });
  
  // Create chat thread for the run
  if (taskSpec.tripPlanning) {
    const userInput = taskSpec.goal;
    const assistantOutput = orch.result;
    
    // Call Convex mutation to create chat thread
    await createChatThreadForRun({
      timelineId: orch.timelineId, // Assuming orchestrator returns this
      userInput,
      assistantOutput,
      taskSpec,
    });
  }
  
  console.log(orch.result);
}
```

---

### **Solution 2: Dynamic Execution Bars**

#### **A. Update Schema to Track Real-Time Progress**

**Current Schema** (`convex/schema.ts`):
```typescript
agentTasks: defineTable({
  timelineId: v.id("agentTimelines"),
  name: v.string(),
  startOffsetMs: v.number(), // Offset from baseStartMs
  durationMs: v.number(),     // ❌ Static, pre-allocated
  progress: v.optional(v.number()), // 0-1
  status: v.union(
    v.literal("pending"),
    v.literal("running"),
    v.literal("complete"),
    v.literal("paused"),
    v.literal("error")
  ),
  elapsedMs: v.optional(v.number()), // ✅ Actual elapsed time
  startedAtMs: v.optional(v.number()), // ✅ Actual start time
  // ...
})
```

**Key Fields**:
- `startedAtMs`: When the agent actually started (not pre-allocated)
- `elapsedMs`: Actual elapsed time (grows as agent executes)
- `durationMs`: Can be used for estimated duration, but not for bar width

#### **B. Update Execution Bar Calculation**

**Current** (`src/components/agentDashboard/AgentTimeline.tsx`):
```typescript
// Line 706-709: Static calculation
const leftPct = (task: any) => {
  const offset = Number((task as any).startOffsetMs ?? 0);
  return `${(offset / (windowEndMs - windowStartMs)) * 100}%`;
};

const widthPct = (task: any) => {
  const dur = Number((task as any).durationMs ?? 0);
  return `${(dur / (windowEndMs - windowStartMs)) * 100}%`;
};
```

**Updated** (Dynamic):
```typescript
const leftPct = (task: any) => {
  // Use actual start time if available, otherwise use offset
  const startMs = (task as any).startedAtMs 
    ? (task as any).startedAtMs - baseStartMs
    : Number((task as any).startOffsetMs ?? 0);
  return `${(startMs / (windowEndMs - windowStartMs)) * 100}%`;
};

const widthPct = (task: any) => {
  const status = String(task.status ?? 'pending').toLowerCase();
  
  // For completed tasks, use elapsedMs
  if (status === 'complete' || status === 'error') {
    const elapsed = Number((task as any).elapsedMs ?? 0);
    return `${(elapsed / (windowEndMs - windowStartMs)) * 100}%`;
  }
  
  // For running tasks, use current elapsed time
  if (status === 'running') {
    const startMs = (task as any).startedAtMs ?? (baseStartMs + Number((task as any).startOffsetMs ?? 0));
    const elapsed = Date.now() - startMs;
    return `${(elapsed / (windowEndMs - windowStartMs)) * 100}%`;
  }
  
  // For pending tasks, use estimated duration (or show as thin bar)
  const dur = Number((task as any).durationMs ?? 1000); // Default 1s
  return `${(dur / (windowEndMs - windowStartMs)) * 100}%`;
};
```

#### **C. Update Orchestrator to Track Real-Time Progress**

**Update** (`agents/core/orchestrator.ts`):
```typescript
// Before executing node
const t0 = Date.now();
await updateTaskMetrics({
  taskId: node.convexTaskId, // Assuming we store this
  status: 'running',
  startedAtMs: t0,
});

// Execute node
const result = await executeNode(node);

// After executing node
const elapsed = Date.now() - t0;
await updateTaskMetrics({
  taskId: node.convexTaskId,
  status: 'complete',
  elapsedMs: elapsed,
  progress: 1.0,
});
```

#### **D. Add Real-Time Updates via Convex**

**Convex Mutation** (`convex/agentTimelines.ts`):
```typescript
export const updateTaskProgress = mutation({
  args: {
    taskId: v.id("agentTasks"),
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("complete"),
      v.literal("error")
    )),
    startedAtMs: v.optional(v.number()),
    elapsedMs: v.optional(v.number()),
    progress: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const updates: any = {};
    if (args.status) updates.status = args.status;
    if (args.startedAtMs) updates.startedAtMs = args.startedAtMs;
    if (args.elapsedMs) updates.elapsedMs = args.elapsedMs;
    if (args.progress !== undefined) updates.progress = args.progress;
    
    await ctx.db.patch(args.taskId, updates);
    return null;
  },
});
```

---

## 🚀 Implementation Steps

### **Step 1: Chat History Integration**

1. ✅ Add `chatMessages` table to schema
2. ✅ Create `createChatThreadForRun` mutation
3. ✅ Update CLI to call mutation after orchestration
4. ✅ Update `AgentChats.tsx` to display threads
5. ✅ Add "View Chat" button in `AgentTimeline.tsx`

### **Step 2: Dynamic Execution Bars**

1. ✅ Update `agentTasks` schema to include `startedAtMs` and `elapsedMs`
2. ✅ Create `updateTaskProgress` mutation
3. ✅ Update orchestrator to call mutation on node start/complete
4. ✅ Update `leftPct()` and `widthPct()` calculations in `AgentTimeline.tsx`
5. ✅ Add real-time updates via Convex reactivity

---

## 📊 Expected Result

### **Chat History View**

```
┌─────────────────────────────────────────────────────────────┐
│ Chat History                                                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ 👤 You (Oct 3, 2025 10:30 AM)                               │
│ Make a plan for SF trip spanning from 10/3/2025 to 10/4/2025│
│                                                              │
│ 🤖 Assistant (Oct 3, 2025 10:31 AM)                         │
│ # San Francisco Trip Plan                                   │
│ **October 3-4, 2025 | 2 Travelers | Moderate Budget**       │
│                                                              │
│ ## 📋 Trip Overview                                          │
│ - Duration: 2 days, 1 night                                 │
│ - Budget: Moderate ($300-500/day per person)                │
│ ...                                                          │
│                                                              │
│ [View Timeline] [View Details]                              │
└─────────────────────────────────────────────────────────────┘
```

### **Dynamic Execution Bars**

```
Before (Static 600s):
┌────────────────────────────────────────────────────────────┐
│ weather_research    [████████████████████████████████] 600s│ ❌ Pre-allocated
│ attractions_research[████████████████████████████████] 600s│ ❌ Pre-allocated
└────────────────────────────────────────────────────────────┘

After (Dynamic):
┌────────────────────────────────────────────────────────────┐
│ weather_research    [███] 2.3s                             │ ✅ Actual time
│ attractions_research[████] 2.6s                            │ ✅ Actual time
│ restaurants_research[████] 2.8s (running...)               │ ✅ Growing
└────────────────────────────────────────────────────────────┘
```

---

## 🎉 Benefits

### **Chat History Integration**
✅ User can see conversation history  
✅ Easy to reference past trip plans  
✅ Natural conversational interface  
✅ Links to agent timeline for details  

### **Dynamic Execution Bars**
✅ Accurate representation of execution time  
✅ Real-time progress updates  
✅ No misleading 10-minute estimates  
✅ Better UX for understanding agent performance  

---

## 📝 Next Steps

1. Implement chat history integration
2. Implement dynamic execution bars
3. Test with trip planning example
4. Update documentation
5. Deploy to production

---

## 🔗 Related Files

- Schema: `convex/schema.ts`
- Mutations: `convex/agentTimelines.ts`
- CLI: `agents/app/cli.ts`
- Orchestrator: `agents/core/orchestrator.ts`
- Timeline UI: `src/components/agentDashboard/AgentTimeline.tsx`
- Chat UI: `src/components/agentDashboard/AgentChats.tsx`

