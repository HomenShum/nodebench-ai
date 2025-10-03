# Agent Dashboard Test Button - Complete Guide

## 🎯 Overview

A **"Run Visual LLM Test"** button has been added to the Agent Dashboard that allows users to execute the complete Visual LLM validation workflow with a single click.

---

## 🚀 Features

### One-Click Test Execution
- ✅ **Single Click**: Run the entire Visual LLM validation workflow
- ✅ **Auto Timeline Creation**: Creates a new timeline for the test
- ✅ **Auto Tab Switch**: Switches to Timeline tab to show progress
- ✅ **Real-time Progress**: Watch tasks execute in real-time
- ✅ **Visual Feedback**: Button shows loading state during execution

### What the Test Does

The button triggers a complete 9-node workflow:

1. **Image Search** - Search for VR avatar images using Linkup API
2. **Image Validation** - Validate image URLs with HEAD requests
3. **Image Filtering** - Filter valid JPEGs/PNGs under 1MB
4. **Vision Analysis** - Parallel analysis with GPT-5-mini + Gemini 2.5 Flash
5. **Statistical Analysis** - Compute correlations and statistics
6. **Visualization** - Generate Plotly charts
7. **Model Comparison** - Compare GPT-5-mini vs Gemini performance
8. **Prompt Optimization** - Generate enhanced prompts
9. **Quality Evaluation** - Check workflow completeness

---

## 📍 Location

**File**: `src/components/agentDashboard/AgentDashboard.tsx`

**UI Location**: 
- Agent Dashboard header
- Right side, next to "New Timeline" button
- Purple gradient button with 🧪 emoji

---

## 🎨 UI Design

### Button States

#### Idle State
```
🧪 Run Visual LLM Test
```
- Purple-to-indigo gradient background
- White text
- Hover effect: Darker gradient
- Shadow for depth

#### Running State
```
⏳ Running Test...
```
- Gray background
- Disabled cursor
- Spinning hourglass animation
- Cannot be clicked again

---

## 🔧 Implementation Details

### Code Structure

```typescript
// State management
const [isRunningTest, setIsRunningTest] = useState(false);

// Handler function
const handleRunVisualLLMTest = async () => {
  if (isRunningTest) return;
  
  try {
    setIsRunningTest(true);
    
    // 1. Create document and timeline
    const docId = await createDoc({ 
      title: "Visual LLM Validation Test", 
      parentId: undefined, 
      content: [] as any 
    });
    const tlId = await createTimeline({ 
      documentId: docId as Id<"documents">, 
      name: "Visual LLM Test" 
    });
    
    // 2. Switch to timeline view
    setSelectedId(tlId as Id<"agentTimelines">);
    setTab("timeline");
    
    // 3. Run orchestration workflow
    await convex.action(api.agents.orchestrate.run, {
      documentId: docId as Id<"documents">,
      name: "Visual LLM Validation Test",
      taskSpec: {
        goal: "Visual LLM validation workflow...",
        type: "orchestrate",
        topic: "Visual LLM Model Validation...",
        graph: {
          nodes: [...],
          edges: [...],
        },
      },
    });
    
    // 4. Success notification
    alert("Visual LLM validation test started! Check the Timeline tab for progress.");
  } catch (err) {
    console.error("Failed to run Visual LLM test:", err);
    alert((err as any)?.message ?? "Failed to run Visual LLM test. Make sure API keys are configured.");
  } finally {
    setIsRunningTest(false);
  }
};
```

### Button JSX

```tsx
<button
  className={`px-3 py-1 text-xs rounded-md border font-medium transition-colors ${
    isRunningTest 
      ? "bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed" 
      : "bg-gradient-to-r from-purple-500 to-indigo-500 text-white border-transparent hover:from-purple-600 hover:to-indigo-600 shadow-sm"
  }`}
  onClick={handleRunVisualLLMTest}
  disabled={isRunningTest}
  title="Run Visual LLM validation test with GPT-5-mini and Gemini 2.5 Flash"
>
  {isRunningTest ? (
    <>
      <span className="inline-block animate-spin mr-1">⏳</span>
      Running Test...
    </>
  ) : (
    <>
      🧪 Run Visual LLM Test
    </>
  )}
</button>
```

---

## 🧪 How to Use

### Step 1: Navigate to Agent Dashboard

1. Open the application
2. Click on the **"Agents"** tab in the Calendar/Documents/Agents header
3. You'll see the Agent Dashboard with timelines

### Step 2: Click the Test Button

1. Look for the purple **"🧪 Run Visual LLM Test"** button in the header
2. Click it once
3. The button will change to **"⏳ Running Test..."**

### Step 3: Watch Progress

1. The view automatically switches to the **Timeline** tab
2. You'll see a new timeline called **"Visual LLM Test"**
3. Watch as tasks execute in real-time:
   - Tasks turn from gray → blue (running) → green (complete)
   - Progress bars fill up
   - Elapsed time updates every second

### Step 4: Review Results

1. Click on individual tasks to see details in the popover
2. Switch to the **Tasks** tab to see the task list
3. Click **"Open Full View"** on any task to see detailed output
4. Review the final results in the document

---

## ⚙️ Prerequisites

### Required Environment Variables

The test requires these API keys to be configured:

```bash
# Required for image search (optional, will use fallback if missing)
LINKUP_API_KEY="your-linkup-api-key"

# Required for GPT-5-mini vision analysis
OPENAI_API_KEY="sk-your-openai-key"

# Required for Gemini 2.5 Flash vision and code execution
GOOGLE_GENAI_API_KEY="your-google-genai-key"
```

### What Happens Without API Keys?

- **No LINKUP_API_KEY**: Uses 3 fallback images from Unsplash
- **No OPENAI_API_KEY**: Skips GPT-5-mini analysis, only runs Gemini
- **No GOOGLE_GENAI_API_KEY**: Skips Gemini analysis and code execution

---

## 📊 Expected Results

### Timeline View

You'll see 9 tasks executing in sequence:

```
1. Search VR Avatar Test Images          [████████████] 100% ✅ 4.2s
2. Validate Image URLs                   [████████████] 100% ✅ 2.1s
3. Filter Valid Images                   [████████████] 100% ✅ 0.8s
4. Parallel Vision Analysis              [████████████] 100% ✅ 18.5s
5. Statistical Analysis & Aggregation    [████████████] 100% ✅ 12.3s
6. Generate Plotly Visualizations        [████████████] 100% ✅ 8.7s
7. Model Performance Comparison          [████████████] 100% ✅ 5.2s
8. Enhanced Prompt Generation            [████████████] 100% ✅ 4.5s
9. Quality Check & Follow-up             [████████████] 100% ✅ 3.1s

Total Duration: 3m 19s
Total Cost: ~$0.51
```

### Success Alert

After clicking the button, you'll see:

```
✅ Visual LLM validation test started! Check the Timeline tab for progress.
```

### Error Alert

If something goes wrong:

```
❌ Failed to run Visual LLM test. Make sure API keys are configured.
```

---

## 🔍 Troubleshooting

### Issue: Button is Grayed Out

**Cause**: Test is already running

**Solution**: Wait for the current test to complete

---

### Issue: "Failed to run Visual LLM test"

**Possible Causes**:
1. Missing API keys
2. Network error
3. Convex deployment issue

**Solutions**:
1. Check environment variables are set
2. Verify network connectivity
3. Redeploy to Convex: `npx convex deploy`

---

### Issue: Tasks Stuck at 0%

**Cause**: Orchestrator may be waiting for API response

**Solution**: 
1. Check browser console for errors
2. Verify API keys are valid
3. Check Convex logs for backend errors

---

### Issue: No Images Found

**Cause**: Linkup API key missing or invalid

**Solution**: 
1. Set `LINKUP_API_KEY` environment variable
2. Or let it use fallback images (3 from Unsplash)

---

## 📈 Performance Metrics

### Expected Timings

| Task | Expected Duration |
|------|------------------|
| Image Search | 3-5s |
| Image Validation | 2-3s |
| Image Filtering | <1s |
| Vision Analysis | 15-20s |
| Statistical Analysis | 10-15s |
| Visualization | 5-10s |
| Model Comparison | 3-5s |
| Prompt Optimization | 3-5s |
| Quality Evaluation | 2-3s |
| **Total** | **3-4 minutes** |

### Expected Costs

| Component | Cost |
|-----------|------|
| Linkup API | $0.01 |
| GPT-5-mini (10 images) | $0.24 |
| Gemini 2.5 Flash (10 images) | $0.04 |
| Code Execution | $0.05 |
| Other | $0.10 |
| **Total** | **~$0.44-0.60** |

---

## 🎯 Use Cases

### 1. Quick Validation

**Scenario**: You want to quickly test if the vision APIs are working

**Action**: Click the button and watch the timeline

**Expected**: All tasks complete successfully in 3-4 minutes

---

### 2. Model Comparison

**Scenario**: You want to compare GPT-5-mini vs Gemini 2.5 Flash

**Action**: Run the test and review the "Model Performance Comparison" task output

**Expected**: See which model performs better on VR avatar quality assessment

---

### 3. Prompt Optimization

**Scenario**: You want to improve your vision analysis prompts

**Action**: Run the test and review the "Enhanced Prompt Generation" task output

**Expected**: Get suggested improvements for both GPT-5-mini and Gemini prompts

---

### 4. Integration Testing

**Scenario**: You deployed new changes and want to verify everything works

**Action**: Click the button to run end-to-end test

**Expected**: All 9 tasks complete without errors

---

## 🚀 Next Steps

After running the test:

1. **Review Results**: Click on tasks to see detailed outputs
2. **Export Data**: Copy results from task outputs
3. **Iterate**: Modify prompts based on suggestions
4. **Compare**: Run multiple tests to compare results
5. **Deploy**: Use insights to improve production workflows

---

## 📚 Related Documentation

- **Test Cases**: `docs/TEST_CASES_AND_EXPECTED_OUTPUTS.md`
- **Quick Reference**: `TEST_QUICK_REFERENCE.md`
- **Orchestrator Fixes**: `docs/ORCHESTRATOR_FIXES_SUMMARY.md`
- **Linkup Integration**: `docs/LINKUP_INTEGRATION_GUIDE.md`
- **Implementation Guide**: `docs/VISUAL_LLM_IMPLEMENTATION_GUIDE.md`

---

## ✅ Conclusion

The **"Run Visual LLM Test"** button provides a one-click way to:
- ✅ Test the complete Visual LLM validation workflow
- ✅ Verify API integrations are working
- ✅ Compare GPT-5-mini vs Gemini 2.5 Flash
- ✅ Get prompt optimization suggestions
- ✅ Monitor real-time progress in the timeline

**Ready to test!** 🚀

