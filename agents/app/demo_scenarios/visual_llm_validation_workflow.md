# Visual LLM Validation Workflow - Multi-Agent Implementation Plan

## Overview
This workflow demonstrates our multi-agent orchestration system's ability to handle complex visual AI validation tasks with multiple LLMs, structured outputs, code execution, and comparative analysis.

## Workflow Architecture

### Phase 1: Image Collection & Preparation
**Agent Type**: Main Agent (Image Collector)
**Sub-agents**: 2-3 Leaf Agents (parallel)

```
Orchestrator
├── Main: Image Collection Coordinator
│   ├── Leaf: Web Image Search (Linkup API)
│   ├── Leaf: Image URL Validation
│   └── Leaf: Dataset Metadata Extraction
```

**Tasks**:
1. Use web search to find relevant test images (avatars, VR scenarios, etc.)
2. Validate image URLs and accessibility
3. Extract metadata (resolution, format, source)
4. Compile into structured dataset

**Tools Used**:
- `web.search` with `includeImages: true` (Linkup API)
- `structured` output for dataset compilation
- `code.exec` for image validation (Python PIL/requests)

---

### Phase 2: Multi-Model Visual Analysis
**Agent Type**: Main Agent (Visual Analysis Coordinator)
**Sub-agents**: 4-5 Leaf Agents (parallel)

```
Orchestrator
├── Main: Visual Analysis Coordinator
│   ├── Leaf: GPT-5 Vision Analysis
│   ├── Leaf: Gemini 2.0 Flash Vision Analysis
│   ├── Leaf: Llama Vision Analysis (via OpenRouter)
│   ├── Leaf: Claude Vision Analysis (via OpenRouter)
│   └── Leaf: Grok Vision Analysis (via OpenRouter)
```

**Tasks**:
1. Send each image to multiple vision LLMs
2. Use structured output to extract:
   - Detected artifacts (redlines, distortions, etc.)
   - Movement quality assessment
   - Visual comfort rating (1-5)
   - Emotional comfort rating (1-5)
   - Specific issues (feet, fingers, eyes, clothing)
3. Compile results per model

**Structured Output Schema**:
```json
{
  "type": "object",
  "properties": {
    "imageId": { "type": "string" },
    "modelName": { "type": "string" },
    "artifacts": {
      "type": "object",
      "properties": {
        "hasRedlines": { "type": "boolean" },
        "hasDistortions": { "type": "boolean" },
        "distortionLocations": { "type": "array", "items": { "type": "string" } }
      }
    },
    "ratings": {
      "type": "object",
      "properties": {
        "movementMotion": { "type": "number", "minimum": 1, "maximum": 5 },
        "visualQuality": { "type": "number", "minimum": 1, "maximum": 5 },
        "emotionalComfort": { "type": "number", "minimum": 1, "maximum": 5 }
      }
    },
    "specificIssues": {
      "type": "object",
      "properties": {
        "feetMovement": { "type": "boolean" },
        "fingerMovement": { "type": "boolean" },
        "eyeArtifacts": { "type": "boolean" },
        "clothingDistortions": { "type": "boolean" }
      }
    },
    "confidence": { "type": "number", "minimum": 0, "maximum": 1 },
    "detailedFindings": { "type": "string" }
  }
}
```

**Tools Used**:
- `answer` with `imageUrls` parameter (multimodal)
- `structured` output for each model
- Multiple model providers (OpenAI, Google, OpenRouter)

---

### Phase 3: Computational Analysis
**Agent Type**: Main Agent (Data Analyst)
**Sub-agents**: 2-3 Leaf Agents (sequential)

```
Orchestrator
├── Main: Data Analysis Coordinator
│   ├── Leaf: Statistical Analysis (Google GenAI Code Exec)
│   ├── Leaf: Visualization Generation (Plotly via Code Exec)
│   └── Leaf: Comparative Metrics (Code Exec)
```

**Tasks**:
1. Aggregate all model outputs into CSV/JSON
2. Calculate inter-model agreement scores
3. Compute average ratings per image
4. Generate statistical analysis:
   - Mean, median, std dev per metric
   - Model correlation matrix
   - Outlier detection
5. Create visualizations:
   - Heatmaps of model agreement
   - Rating distributions per model
   - Artifact detection accuracy
   - Plotly interactive charts

**Code Execution Prompt Example**:
```python
# Analyze visual LLM validation results
import pandas as pd
import numpy as np
import plotly.graph_objects as go
import plotly.express as px
from scipy.stats import pearsonr

# Load results
results = pd.DataFrame({{results_json}})

# Calculate inter-model agreement
models = results['modelName'].unique()
agreement_matrix = pd.DataFrame(index=models, columns=models)

for m1 in models:
    for m2 in models:
        m1_ratings = results[results['modelName']==m1]['ratings.visualQuality']
        m2_ratings = results[results['modelName']==m2]['ratings.visualQuality']
        corr, _ = pearsonr(m1_ratings, m2_ratings)
        agreement_matrix.loc[m1, m2] = corr

# Create heatmap
fig = px.imshow(agreement_matrix.astype(float), 
                text_auto=True,
                title='Model Agreement Heatmap',
                labels=dict(color="Correlation"))
fig.show()

# Calculate averages
avg_by_model = results.groupby('modelName').agg({
    'ratings.movementMotion': 'mean',
    'ratings.visualQuality': 'mean',
    'ratings.emotionalComfort': 'mean',
    'confidence': 'mean'
}).round(2)

print(avg_by_model)
```

**Tools Used**:
- `code.exec` (Google Gemini with Python sandbox)
- Libraries: pandas, numpy, plotly, scipy, sklearn

---

### Phase 4: Model Comparison & Recommendation
**Agent Type**: Main Agent (Evaluator)
**Sub-agents**: 2 Leaf Agents (sequential)

```
Orchestrator
├── Main: Model Evaluation Coordinator
│   ├── Leaf: Performance Analyzer
│   └── Leaf: Recommendation Generator
```

**Tasks**:
1. Compare model performance across metrics:
   - Accuracy (vs ground truth if available)
   - Consistency (std dev of ratings)
   - Confidence levels
   - Artifact detection rate
   - Processing time
2. Identify model strengths:
   - Which model excels at detecting redlines?
   - Which is best for movement assessment?
   - Which provides most detailed findings?
3. Generate recommendations:
   - Best overall model for this task
   - Task-specific model recommendations
   - Ensemble approach suggestions

**Structured Output Schema**:
```json
{
  "type": "object",
  "properties": {
    "overallBestModel": { "type": "string" },
    "modelRankings": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "modelName": { "type": "string" },
          "overallScore": { "type": "number" },
          "strengths": { "type": "array", "items": { "type": "string" } },
          "weaknesses": { "type": "array", "items": { "type": "string" } }
        }
      }
    },
    "taskSpecificRecommendations": {
      "type": "object",
      "properties": {
        "redlineDetection": { "type": "string" },
        "movementAssessment": { "type": "string" },
        "emotionalComfort": { "type": "string" }
      }
    },
    "ensembleStrategy": { "type": "string" }
  }
}
```

**Tools Used**:
- `structured` output
- `answer` for reasoning

---

### Phase 5: Prompt Enhancement
**Agent Type**: Main Agent (Prompt Engineer)
**Sub-agents**: 1 Leaf Agent

```
Orchestrator
├── Main: Prompt Optimization Coordinator
│   └── Leaf: Prompt Generator
```

**Tasks**:
1. Analyze current prompt effectiveness
2. Identify areas where models struggled
3. Generate enhanced prompts for:
   - Better artifact detection
   - More consistent ratings
   - Improved confidence scores
4. Provide A/B testing suggestions

**Output**:
- Enhanced prompt templates
- Specific improvements per model
- Testing methodology

**Tools Used**:
- `answer` for prompt generation
- `structured` output for prompt templates

---

## Complete Orchestration Graph

```typescript
const visualLLMValidationGraph = {
  nodes: [
    // Phase 1: Image Collection
    { 
      id: "image_search", 
      kind: "search", 
      label: "Web Image Search",
      prompt: "Find VR avatar test images showing various poses and movements"
    },
    { 
      id: "dataset_prep", 
      kind: "structured", 
      label: "Dataset Preparation",
      prompt: "Compile image URLs into structured dataset with metadata"
    },
    
    // Phase 2: Multi-Model Analysis (parallel)
    { 
      id: "gpt5_vision", 
      kind: "answer", 
      label: "GPT-5 Vision Analysis",
      prompt: "Analyze images for artifacts, distortions, and quality. Use structured output schema. Images: {{channel:dataset_prep.last}}"
    },
    { 
      id: "gemini_vision", 
      kind: "answer", 
      label: "Gemini Vision Analysis",
      prompt: "Analyze images for artifacts, distortions, and quality. Use structured output schema. Images: {{channel:dataset_prep.last}}"
    },
    { 
      id: "llama_vision", 
      kind: "answer", 
      label: "Llama Vision Analysis",
      prompt: "Analyze images for artifacts, distortions, and quality. Use structured output schema. Images: {{channel:dataset_prep.last}}"
    },
    
    // Phase 3: Computational Analysis
    { 
      id: "statistical_analysis", 
      kind: "custom", 
      label: "Statistical Analysis",
      prompt: "Use Python to analyze model outputs: {{channel:gpt4_vision.last}}, {{channel:gemini_vision.last}}, {{channel:llama_vision.last}}. Calculate agreement, correlations, averages."
    },
    { 
      id: "visualization", 
      kind: "custom", 
      label: "Generate Visualizations",
      prompt: "Create Plotly charts: heatmaps, distributions, comparisons. Data: {{channel:statistical_analysis.last}}"
    },
    
    // Phase 4: Evaluation
    { 
      id: "model_comparison", 
      kind: "structured", 
      label: "Model Performance Comparison",
      prompt: "Compare models and recommend best for each task. Analysis: {{channel:visualization.last}}"
    },
    
    // Phase 5: Prompt Enhancement
    { 
      id: "prompt_optimization", 
      kind: "answer", 
      label: "Enhanced Prompt Generation",
      prompt: "Generate improved prompts based on model performance. Comparison: {{channel:model_comparison.last}}"
    }
  ],
  edges: [
    { from: "image_search", to: "dataset_prep" },
    { from: "dataset_prep", to: "gpt4_vision" },
    { from: "dataset_prep", to: "gemini_vision" },
    { from: "dataset_prep", to: "llama_vision" },
    { from: "gpt4_vision", to: "statistical_analysis" },
    { from: "gemini_vision", to: "statistical_analysis" },
    { from: "llama_vision", to: "statistical_analysis" },
    { from: "statistical_analysis", to: "visualization" },
    { from: "visualization", to: "model_comparison" },
    { from: "model_comparison", to: "prompt_optimization" }
  ]
};
```

---

## Implementation Files

### 1. Task Spec JSON
**File**: `agents/app/demo_scenarios/task_spec_visual_llm_validation.json`
- Defines orchestration graph with 9 nodes
- Specifies GPT-5-mini and Gemini 2.0 Flash models
- Includes structured output schemas
- Estimated duration: 3-4 minutes
- Estimated cost: $0.40-0.60 per run

### 2. Orchestration Action
**File**: `convex/agents/visualLLMValidation.ts`
- Server-side Convex action
- Manages agent timeline and task states
- Calls vision APIs (GPT-5-mini, Gemini)
- Runs statistical analysis via code execution
- Returns structured results with all outputs

### 3. Vision Analysis Tool
**File**: `agents/tools/visionAnalysis.ts`
- TypeScript implementation of vision analysis
- `analyzeImageWithGPT5Mini()` - GPT-5-mini vision API
- `analyzeImageWithGemini()` - Gemini 2.0 Flash vision API
- `analyzeImageMultiModel()` - Parallel multi-model analysis
- `parseVisualAnalysis()` - JSON validation and coercion
- Maps directly to Streamlit's `core.visual_llm_clients`

### 4. Frontend Integration
**File**: `src/components/agentDashboard/VisualLLMPanel.tsx`
- React component for UI
- Configuration inputs (search query, image count)
- Real-time timeline status display
- Expandable result sections (comparison, stats, prompts)
- Maps to Streamlit's `ui.test6_visual_llm`

### 5. Test Script
**File**: `agents/app/test_visual_llm.ts`
- Unit tests for vision analysis functions
- Tests GPT-5-mini, Gemini, and multi-model analysis
- Validates structured output parsing
- Calculates inter-model agreement

### 6. Documentation
**Files**:
- `agents/app/demo_scenarios/visual_llm_validation_workflow.md` - This file
- `docs/VISUAL_LLM_VALIDATION_ANALYSIS.md` - Capability analysis
- `docs/VISUAL_LLM_IMPLEMENTATION_GUIDE.md` - Implementation guide

---

## Key Capabilities Demonstrated

✅ **Multi-Model Orchestration**: Parallel execution of 3-5 vision LLMs  
✅ **Structured Outputs**: Consistent JSON schemas across models  
✅ **Code Execution**: Python analysis with pandas, plotly, scipy  
✅ **Image Search**: Web-based image collection via Linkup  
✅ **Comparative Analysis**: Statistical model comparison  
✅ **Interactive Visualizations**: Plotly charts embedded in results  
✅ **Dynamic Workflows**: Eval nodes for adaptive execution  
✅ **Real-time Progress**: Live timeline with task states  
✅ **Artifact Storage**: All outputs saved to Convex documents  
✅ **Follow-up Queries**: Conversational interface for deeper analysis  

---

## Next Steps

1. Create task spec JSON file
2. Implement Convex action for orchestration
3. Add frontend panel for visualization
4. Test with sample VR avatar images
5. Iterate on prompt templates
6. Add human-in-the-loop validation

