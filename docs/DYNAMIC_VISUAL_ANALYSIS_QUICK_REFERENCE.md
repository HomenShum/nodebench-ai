# Dynamic Visual Meta-Analysis - Quick Reference

## 🚀 Quick Start

### 1. Basic Usage

```typescript
import { runDynamicVisualMetaAnalysis } from './agents/core/visualMetaAnalysis';
import { codeExecTool } from './agents/tools/codeExec';

// Your LLM outputs (any schema)
const outputs = [
  { imageId: 'img_001', score: 8.5, tags: ['outdoor', 'sunny'], confidence: 0.9 },
  { imageId: 'img_002', score: 7.2, tags: ['indoor'], confidence: 0.85 },
];

// Run analysis (zero configuration!)
const { fields, plan, results } = await runDynamicVisualMetaAnalysis(
  outputs,
  codeExecTool()
);

console.log('Results:', results);
```

---

## 📋 API Reference

### `discoverFields(sampleOutputs: any[]): FieldClassification`

**Purpose**: Discover and classify fields from LLM outputs

**Returns**:
```typescript
{
  numerical: Set<string>;    // Fields for distribution analysis
  categorical: Set<string>;  // Fields for frequency analysis
  excluded: Set<string>;     // Metadata fields (ignored)
}
```

**Example**:
```typescript
const fields = discoverFields([
  { imageId: 'img_001', score: 8.5, tags: ['outdoor'], confidence: 0.9 }
]);

// Result:
// numerical: Set(['score', 'confidence'])
// categorical: Set(['tags'])
// excluded: Set(['imageId'])
```

---

### `planComputationalAnalysis(fields, outputs): AnalysisPlan`

**Purpose**: Generate dynamic analysis plan

**Returns**:
```typescript
{
  numericalFields: string[];     // Fields to analyze with stats
  categoricalFields: string[];   // Fields to analyze with frequencies
  analysisPrompt: string;        // Prompt for computational LLM
  codeTemplate: string;          // Python code for analysis
}
```

**Example**:
```typescript
const plan = planComputationalAnalysis(fields, outputs);

// Result:
// numericalFields: ['score', 'confidence']
// categoricalFields: ['tags']
// analysisPrompt: "**FIELDS DETECTED FOR ANALYSIS:**\nNumerical Fields: score, confidence\n..."
// codeTemplate: "import json\nimport statistics\n..."
```

---

### `runDynamicVisualMetaAnalysis(llmOutputs, codeExecTool)`

**Purpose**: Complete end-to-end analysis pipeline

**Returns**:
```typescript
{
  fields: FieldClassification;  // Discovered fields
  plan: AnalysisPlan;           // Generated plan
  results: any;                 // Analysis results
}
```

**Example**:
```typescript
const { fields, plan, results } = await runDynamicVisualMetaAnalysis(
  llmOutputs,
  codeExecTool()
);

// results.numericalAnalysis: { score: { mean: 7.85, median: 7.85, ... }, ... }
// results.categoricalAnalysis: { tags: { frequencies: { outdoor: 1, indoor: 1 }, ... } }
```

---

## 🎯 Field Classification Rules

### Numerical Fields

**Classified as numerical if**:
- Field name contains: `rating`, `score`, `confidence`, `count`
- Value is a number: `typeof value === 'number'`
- Nested object with numeric values: `ratings.movementMotion`

**Examples**:
```typescript
{ score: 8.5 }                           // ✅ Numerical
{ confidence: 0.9 }                      // ✅ Numerical
{ ratings: { quality: 5 } }              // ✅ Numerical (ratings.quality)
{ peopleCount: 3 }                       // ✅ Numerical
```

---

### Categorical Fields

**Classified as categorical if**:
- Value is an array: `Array.isArray(value)`
- Value is a boolean: `typeof value === 'boolean'`
- Value is a short string: `typeof value === 'string' && value.length < 100`

**Examples**:
```typescript
{ tags: ['outdoor', 'sunny'] }           // ✅ Categorical
{ requiresFollowup: true }               // ✅ Categorical
{ severity: 'moderate' }                 // ✅ Categorical
{ primaryEmotion: 'happy' }              // ✅ Categorical
```

---

### Excluded Fields

**Excluded if**:
- Field name is: `imageId`, `image_id`, `modelName`, `model_name`
- Field name contains: `summary`, `description`, `findings`, `details`
- Value is a long string: `value.length >= 100`

**Examples**:
```typescript
{ imageId: 'img_001' }                   // ❌ Excluded (metadata)
{ modelName: 'gpt-5-mini' }              // ❌ Excluded (metadata)
{ summary: 'Long text...' }              // ❌ Excluded (summary)
{ detailedFindings: 'Very long...' }     // ❌ Excluded (long text)
```

---

## 📊 Analysis Output Format

### Numerical Analysis

```typescript
{
  numericalAnalysis: {
    score: {
      mean: 7.85,
      median: 7.85,
      stdev: 0.92,
      min: 7.2,
      max: 8.5,
      count: 2
    },
    confidence: {
      mean: 0.875,
      median: 0.875,
      stdev: 0.035,
      min: 0.85,
      max: 0.9,
      count: 2
    }
  }
}
```

---

### Categorical Analysis

```typescript
{
  categoricalAnalysis: {
    tags: {
      frequencies: {
        outdoor: 1,
        sunny: 1,
        indoor: 1
      },
      percentages: {
        outdoor: 33.33,
        sunny: 33.33,
        indoor: 33.33
      },
      most_common: [
        ['outdoor', 1],
        ['sunny', 1],
        ['indoor', 1]
      ],
      unique_count: 3
    }
  }
}
```

---

## 🔧 Common Patterns

### Pattern 1: VR Avatar Analysis

```typescript
const vrOutputs = [
  {
    imageId: 'vr_001',
    ratings: { movementMotion: 4, visualQuality: 5, emotionalComfort: 3 },
    detectedArtifacts: ['redline', 'glitch'],
    confidence: 0.85
  }
];

// Discovers:
// - Numerical: ratings.movementMotion, ratings.visualQuality, ratings.emotionalComfort, confidence
// - Categorical: detectedArtifacts
```

---

### Pattern 2: General Image Analysis

```typescript
const generalOutputs = [
  {
    imageId: 'img_001',
    peopleCount: 5,
    detectedEmotions: ['happy', 'calm'],
    primaryEmotion: 'happy',
    sceneType: 'outdoor',
    confidence: 0.78
  }
];

// Discovers:
// - Numerical: peopleCount, confidence
// - Categorical: detectedEmotions, primaryEmotion, sceneType
```

---

### Pattern 3: Medical Image Analysis

```typescript
const medicalOutputs = [
  {
    imageId: 'xray_001',
    abnormalityScore: 7.5,
    detectedAbnormalities: ['fracture', 'inflammation'],
    severity: 'moderate',
    requiresFollowup: true,
    confidence: 0.88
  }
];

// Discovers:
// - Numerical: abnormalityScore, confidence
// - Categorical: detectedAbnormalities, severity, requiresFollowup
```

---

## ⚠️ Common Pitfalls

### ❌ Pitfall 1: Assuming Fixed Schema

**Wrong**:
```typescript
// Don't assume specific fields exist
const movementRating = results.numericalAnalysis.ratings.movementMotion; // ❌ May not exist
```

**Right**:
```typescript
// Check if field exists first
const movementRating = results.numericalAnalysis?.['ratings.movementMotion']; // ✅ Safe
```

---

### ❌ Pitfall 2: Hardcoding Field Names

**Wrong**:
```typescript
// Don't hardcode field names
const fields = ['movementMotion', 'visualQuality']; // ❌ Task-specific
```

**Right**:
```typescript
// Use discovered fields
const fields = plan.numericalFields; // ✅ Dynamic
```

---

### ❌ Pitfall 3: Ignoring Nested Objects

**Wrong**:
```typescript
// Don't ignore nested structure
const outputs = [{ ratings: { quality: 5 } }];
// Expecting: fields.numerical.has('quality') // ❌ Wrong
```

**Right**:
```typescript
// Use full path for nested fields
const outputs = [{ ratings: { quality: 5 } }];
// Expecting: fields.numerical.has('ratings.quality') // ✅ Correct
```

---

## 🧪 Testing

### Run Tests

```bash
npm test agents/core/__tests__/visualMetaAnalysis.test.ts
```

### Run Examples

```bash
npx tsx agents/examples/dynamicVisualAnalysisExample.ts
```

---

## 📚 Documentation

- **Full Guide**: `docs/DYNAMIC_VISUAL_META_ANALYSIS.md`
- **Summary**: `docs/DYNAMIC_VISUAL_ANALYSIS_SUMMARY.md`
- **Examples**: `agents/examples/dynamicVisualAnalysisExample.ts`
- **Tests**: `agents/core/__tests__/visualMetaAnalysis.test.ts`

---

## ✅ Checklist

Before using the system, ensure:

- [ ] LLM outputs are in JSON format
- [ ] Each output has an `imageId` field
- [ ] Each output has a `modelName` field
- [ ] Each output has a `confidence` field (0-1)
- [ ] Code execution tool is available
- [ ] API keys are configured (if using real LLMs)

---

## 🎯 Key Takeaways

1. **Zero Configuration**: No schemas, no field lists, no hardcoded assumptions
2. **Task-Agnostic**: Works with VR, general images, medical images, or any other task
3. **Self-Adapting**: Automatically discovers and analyzes relevant fields
4. **Production-Ready**: Comprehensive tests, documentation, and examples

**Just provide LLM outputs and let the system do the rest!** 🚀

