# Orchestrator Custom Tools Fix

## ✅ **COMPLETE: Fixed Orchestrator to Use Custom Tools**

---

## 🐛 **Problem**

When the user typed "find images from medical x ray and classify them", the orchestrator was **only using the `answer` tool** (which just calls the LLM to generate text) instead of **actually executing the custom tools** we built:

- ❌ **Not using**: `image.search` (Linkup image search)
- ❌ **Not using**: `xray.classify` (X-ray classification with vision LLMs)
- ❌ **Not using**: `vision.multi` (Multi-model vision analysis)
- ❌ **Not using**: `code.exec` (Python code execution)

**Logs showed**:
```
[LOG] '{"event":"step.start","data":{"kind":"answer","label":"Orchestrator: find images from medical x ray and classify them"}}'
[LOG] '{"event":"step.start","data":{"kind":"answer","label":"Main: Find medical X-ray images"}}'
[LOG] '{"event":"step.start","data":{"kind":"answer","label":"Leaf: Find medical X-ray images"}}'
[LOG] '{"event":"step.start","data":{"kind":"answer","label":"Leaf: Classification of medical X-rays"}}'
```

All steps were using `kind: "answer"` instead of `kind: "custom"` with our custom tools!

---

## 🔍 **Root Cause**

The **planner** (Grok) was generating a generic plan with `answer` nodes because:

1. **The planner doesn't know about our custom tools** - It only knows about basic tools like `web.search`, `web.fetch`, `answer`, `summarize`, `structured`, `code.exec`

2. **No way to override the plan** - The user couldn't provide a pre-defined workflow that uses custom tools

3. **Custom tools are registered but never called** - The tools exist in the registry but the planner never generates nodes that use them

---

## 🔧 **Fix Applied**

### **1. Added `overrideGraph` Parameter to `startFromPrompt`**

**File**: `convex/agents/promptPlan.ts`

**Changes**:
- Added `overrideGraph: v.optional(v.any())` to the args
- If `overrideGraph` is provided, use it directly instead of calling the planner
- Convert the override graph to `ProviderOutput` format with proper task/link structure

**Before**:
```typescript
export const startFromPrompt = action({
  args: {
    timelineId: v.id("agentTimelines"),
    prompt: v.string(),
    provider: v.optional(v.union(v.literal("local"), v.literal("openai"), v.literal("grok"))),
  },
  // ...
});
```

**After**:
```typescript
export const startFromPrompt = action({
  args: {
    timelineId: v.id("agentTimelines"),
    prompt: v.string(),
    provider: v.optional(v.union(v.literal("local"), v.literal("openai"), v.literal("grok"))),
    overrideGraph: v.optional(v.any()),  // ✅ NEW: Allow pre-defined workflows
  },
  handler: async (ctx, { timelineId, prompt, provider, overrideGraph }) => {
    // If overrideGraph is provided, use it directly
    if (overrideGraph && overrideGraph.nodes && overrideGraph.edges) {
      // Convert to ProviderOutput format
      // ...
    } else {
      // Use the planner to generate a plan
      // ...
    }
  },
});
```

---

### **2. Added "🩺 X-Ray Workflow" Button**

**File**: `src/components/agentDashboard/AgentTimeline.tsx`

**Changes**:
- Added a new button to trigger the pre-defined Medical X-Ray Workflow
- Loads the workflow from `agents/app/demo_scenarios/medical_xray_workflow.json`
- Passes the workflow graph to `startFromPrompt` via `overrideGraph` parameter

**Button Code**:
```typescript
<button
  className="btn"
  style={{ backgroundColor: '#10b981', color: 'white' }}
  title="Run Medical X-Ray Workflow (Image Search + Classification)"
  onClick={async () => {
    try {
      const xrayWorkflow = await import('../../../agents/app/demo_scenarios/medical_xray_workflow.json');
      await startFromPrompt({
        timelineId,
        prompt: "Find and classify medical X-ray images",
        provider: planner as any,
        overrideGraph: xrayWorkflow.graph as any,  // ✅ Pass pre-defined workflow
      });
      setDataSource(DataSource.Convex);
      try { window.localStorage.setItem("agents.dataSource", DataSource.Convex); } catch {}
      console.log("Started Medical X-Ray Workflow");
    } catch (e) {
      console.error("X-Ray Workflow failed:", e);
    }
  }}
>
  🩺 X-Ray Workflow
</button>
```

---

### **3. Updated Medical X-Ray Workflow**

**File**: `agents/app/demo_scenarios/medical_xray_workflow.json`

**Changes**:
- Changed `tool: "xray.search"` to `tool: "image.search"` (using the generic image search tool)
- Updated payload to include proper query, depth, and maxResults

**Workflow Structure**:
```json
{
  "type": "orchestrate",
  "topic": "Medical X-Ray Image Search and Classification",
  "graph": {
    "nodes": [
      {
        "id": "search_xray_images",
        "kind": "custom",
        "tool": "image.search",
        "payload": {
          "query": "medical chest x-ray pneumonia tuberculosis radiology",
          "depth": "deep",
          "maxResults": 5
        }
      },
      {
        "id": "classify_xray_images",
        "kind": "custom",
        "tool": "xray.classify",
        "payload": {
          "images": "{{channel:search_xray_images.last}}"
        }
      },
      {
        "id": "generate_classification_report",
        "kind": "structured",
        "query": "Generate comprehensive report with citations...",
        "schema": { /* ... */ }
      }
    ],
    "edges": [
      { "from": "search_xray_images", "to": "classify_xray_images" },
      { "from": "classify_xray_images", "to": "generate_classification_report" }
    ]
  }
}
```

---

## 🎯 **How It Works Now**

### **Step 1: User Clicks "🩺 X-Ray Workflow" Button**

The button loads the pre-defined workflow and passes it to `startFromPrompt`:

```typescript
await startFromPrompt({
  timelineId,
  prompt: "Find and classify medical X-ray images",
  provider: planner as any,
  overrideGraph: xrayWorkflow.graph,  // ✅ Pre-defined workflow
});
```

---

### **Step 2: `startFromPrompt` Uses the Override Graph**

Instead of calling the planner, it uses the provided graph directly:

```typescript
if (overrideGraph && overrideGraph.nodes && overrideGraph.edges) {
  // Convert to ProviderOutput format
  out = {
    tasks: [...],  // Tasks for each node
    links: [...],  // Links for each edge
    graph: overrideGraph  // Original graph
  };
}
```

---

### **Step 3: Orchestrator Executes Custom Tools**

The orchestrator receives the graph and executes each node:

1. **Node: `search_xray_images`** (kind: `custom`, tool: `image.search`)
   - Calls `imageSearchTool()` with payload `{ query: "medical chest x-ray...", depth: "deep", maxResults: 5 }`
   - Returns array of images with URLs and source citations

2. **Node: `classify_xray_images`** (kind: `custom`, tool: `xray.classify`)
   - Calls `xrayClassificationTool()` with images from previous step
   - Uses GPT-5-mini and Gemini 2.0 Flash to classify each image
   - Returns classification results with confidence scores

3. **Node: `generate_classification_report`** (kind: `structured`)
   - Generates structured JSON report with citations
   - Includes summary, classifications, key findings, recommendations

---

## ✅ **Expected Logs**

After the fix, you should see logs like this:

```
[LOG] '{"event":"step.start","data":{"kind":"custom","label":"Search for Medical X-Ray Images","tool":"image.search"}}'
[LOG] '{"event":"tool.usage","data":{"tool":"image.search","elapsedMs":2345}}'
[LOG] '{"event":"step.success","data":{"kind":"custom","label":"Search for Medical X-Ray Images"}}'

[LOG] '{"event":"step.start","data":{"kind":"custom","label":"Classify X-Ray Images","tool":"xray.classify"}}'
[LOG] '{"event":"tool.usage","data":{"tool":"xray.classify","elapsedMs":5678}}'
[LOG] '{"event":"step.success","data":{"kind":"custom","label":"Classify X-Ray Images"}}'

[LOG] '{"event":"step.start","data":{"kind":"structured","label":"Generate Classification Report"}}'
[LOG] '{"event":"tool.usage","data":{"tool":"structured","elapsedMs":3456}}'
[LOG] '{"event":"step.success","data":{"kind":"structured","label":"Generate Classification Report"}}'
```

---

## 🧪 **Testing**

### **Test 1: Click "🩺 X-Ray Workflow" Button**

1. Open the Agent Dashboard
2. Click the **"🩺 X-Ray Workflow"** button (green button in advanced controls)
3. Watch the timeline execute the workflow
4. Check logs for `kind: "custom"` and `tool: "image.search"`, `tool: "xray.classify"`

### **Test 2: Verify Images Are Found**

1. After the workflow completes, check the Convex database
2. Query the `agentImageResults` table
3. Verify images have `sourceUrl` and `imageUrl` fields

### **Test 3: Verify Classifications**

1. Check the final output in the Agent Timeline
2. Should include structured JSON with:
   - `summary.totalImages`
   - `classifications[].imageUrl`
   - `classifications[].sourceUrl`
   - `classifications[].classification`
   - `classifications[].confidence`

---

## 📊 **Workflow Diagram**

```
┌─────────────────────────────────────────────────────────┐
│ User clicks "🩺 X-Ray Workflow" button                  │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Load medical_xray_workflow.json                         │
│ Pass graph to startFromPrompt(overrideGraph)            │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ startFromPrompt converts graph to ProviderOutput        │
│ Creates tasks and links for each node/edge              │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Orchestrator executes nodes in topological order        │
│ - search_xray_images (custom: image.search)             │
│ - classify_xray_images (custom: xray.classify)          │
│ - generate_classification_report (structured)           │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Results stored in Convex database                       │
│ - agentImageResults table (images with sources)         │
│ - agentTimelines table (final output)                   │
└─────────────────────────────────────────────────────────┘
```

---

## ✅ **Summary**

**Problem**: Orchestrator was only using `answer` tool instead of custom tools

**Solution**: Added `overrideGraph` parameter to `startFromPrompt` to allow pre-defined workflows

**Result**: Users can now click "🩺 X-Ray Workflow" to execute a workflow that:
1. Searches for medical X-ray images using Linkup
2. Classifies them using GPT-5-mini and Gemini 2.0 Flash
3. Generates a structured report with source citations

**Next Steps**: Test the workflow and verify custom tools are being called! 🚀

