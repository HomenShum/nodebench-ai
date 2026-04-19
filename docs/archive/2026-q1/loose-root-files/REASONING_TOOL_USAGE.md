# Reasoning Tool - Usage Guide

## Overview

The Reasoning Tool provides deep reasoning capabilities at ultra-low cost by combining:
- **GLM 4.7 Flash** ($0.07/M) for reasoning using OpenRouter's native reasoning API
- **Devstral-2-free** ($0.00) for structuring output

**Total cost: $0.07/M (98% savings vs claude-sonnet-4 $3.00/M)**

## Location

`convex/domains/agents/mcp_tools/reasoningTool.ts`

## Available Functions

### 1. `getReasoning` - General Purpose Reasoning

Use for any task requiring step-by-step thinking.

```typescript
import { internal } from "../../../_generated/api";

const result = await ctx.runAction(internal.domains.agents.mcp_tools.reasoningTool.getReasoning, {
  prompt: "Analyze the pros and cons of this approach...",
  systemPrompt: "You are an expert analyst.", // Optional
  maxTokens: 1000, // Optional, default: 1000
  extractStructured: true, // Optional, default: true
  returnRaw: false, // Optional, default: false
});

// Result:
{
  success: true,
  content: "...",  // Main response
  reasoning: "...",  // Reasoning steps (if available)
  reasoningTokens: 150,
  structured: {  // Auto-structured output
    mainPoints: [...],
    summary: "...",
    conclusion: "...",
  },
  duration: 5000,  // ms
  cost: 0.000035,  // USD
}
```

### 2. `decomposeTask` - Task Decomposition

Breaks complex tasks into parallel execution branches.

```typescript
const result = await ctx.runAction(internal.domains.agents.mcp_tools.reasoningTool.decomposeTask, {
  task: "Build a real-time financial dashboard",
  context: "Using React, Convex, and OpenBB", // Optional
  numBranches: 5, // Optional, default: 5
});

// Result:
{
  success: true,
  decomposition: {
    branches: [
      {
        name: "Real-time data pipeline",
        description: "...",
        estimatedComplexity: "high",
        canStartImmediately: true,
        dependsOn: [],
        keyRisks: [...],
      },
      // ...more branches
    ],
    criticalPath: "...",
    overallStrategy: "...",
  },
  rawReasoning: "...",
  reasoningTokens: 200,
  duration: 8000,
  cost: 0.000050,
}
```

### 3. `analyzeStrategically` - Strategic Analysis

Performs SWOT analysis and strategic evaluation.

```typescript
const result = await ctx.runAction(internal.domains.agents.mcp_tools.reasoningTool.analyzeStrategically, {
  topic: "Tesla's competitive position",
  context: "Current EV market landscape", // Optional
  focusAreas: ["technology", "brand", "market share"], // Optional
});

// Result:
{
  success: true,
  analysis: {
    keyFactors: [...],
    strengths: [...],
    weaknesses: [...],
    opportunities: [...],
    threats: [...],
    strategicOptions: [
      {
        option: "Expand into energy storage",
        pros: [...],
        cons: [...],
      },
    ],
    recommendation: "...",
    reasoning: "...",
  },
  rawReasoning: "...",
  reasoningTokens: 250,
  duration: 10000,
  cost: 0.000060,
}
```

## Use Cases

### 1. Parallel Task Orchestrator

**Before (claude-sonnet-4, $3.00/M):**
```typescript
const { text } = await generateText({
  model: getLanguageModelSafe("claude-sonnet-4"),
  prompt: `Break down this task: ${description}`,
  maxOutputTokens: 1000,
});
```

**After (Reasoning Tool, $0.07/M):**
```typescript
const result = await ctx.runAction(internal.domains.agents.mcp_tools.reasoningTool.decomposeTask, {
  task: description,
  context: additionalContext,
  numBranches: 5,
});

const branches = result.decomposition.branches;
```

**Savings: 98% ($2.93/M)**

### 2. Branch Exploration

**Before (claude-sonnet-4, $3.00/M):**
```typescript
const { text } = await generateText({
  model: getLanguageModelSafe("claude-sonnet-4"),
  prompt: `Explore this approach: ${branch.description}`,
  maxOutputTokens: 2000,
});
```

**After (Reasoning Tool, $0.07/M):**
```typescript
const result = await ctx.runAction(internal.domains.agents.mcp_tools.reasoningTool.getReasoning, {
  prompt: `Explore and analyze this approach: ${branch.description}`,
  systemPrompt: "You are a technical explorer analyzing solutions.",
  maxTokens: 2000,
  extractStructured: true,
});

const analysis = result.structured;
```

**Savings: 98% ($2.93/M)**

### 3. Strategic Decision Making

```typescript
const analysis = await ctx.runAction(internal.domains.agents.mcp_tools.reasoningTool.analyzeStrategically, {
  topic: "Should we invest in this technology?",
  context: "Current tech stack, team skills, budget constraints",
  focusAreas: ["cost", "performance", "maintainability", "team expertise"],
});

// Get structured SWOT analysis with reasoning
const recommendation = analysis.analysis.recommendation;
```

### 4. Complex Problem Solving

```typescript
const solution = await ctx.runAction(internal.domains.agents.mcp_tools.reasoningTool.getReasoning, {
  prompt: `How can we optimize database queries that are taking 5+ seconds?

  Current setup:
  - PostgreSQL with 50M rows
  - Complex joins across 5 tables
  - No indexes on foreign keys

  Think step by step about the optimization approach.`,
  systemPrompt: "You are a database performance expert.",
  maxTokens: 1500,
});

// Get reasoning steps + structured recommendations
const steps = solution.structured.mainPoints;
const plan = solution.structured.conclusion;
```

## When to Use

### ✅ USE Reasoning Tool for:

- **Complex task decomposition** - Breaking down large projects
- **Strategic analysis** - SWOT, competitive analysis, decision-making
- **Problem solving** - Debugging complex issues
- **Exploration** - Analyzing multiple approaches
- **Planning** - Multi-step planning with dependencies
- **Evaluation** - Deep analysis of options/trade-offs

### ❌ DON'T USE for:

- **Simple tasks** - Use devstral-2-free directly ($0.00)
- **Structured data extraction** - Use devstral with generateObject
- **Quick responses** - Reasoning adds latency (~5-10s)
- **Real-time user interactions** - Too slow for chat
- **High-frequency operations** - Use cached results

## Performance Characteristics

| Metric | Value |
|--------|-------|
| Latency | 5-15 seconds |
| Cost | $0.07/M tokens (98% savings vs claude-sonnet-4) |
| Quality | High (reasoning transparency) |
| Best for | Complex, non-real-time analysis |

## Cost Comparison

| Model | Cost/M Tokens | Use Case | vs Reasoning Tool |
|-------|---------------|----------|-------------------|
| claude-sonnet-4 | $3.00/M | Premium quality | 98% more expensive |
| deepseek-v3.2 | $0.25/M | Budget quality | 257% more expensive |
| glm-4.7-flash (direct) | $0.07/M | ❌ Broken (empty responses) | N/A |
| Reasoning Tool | $0.07/M | ✅ Working with reasoning | Baseline |
| devstral-2-free | $0.00/M | Simple tasks | 100% cheaper |

## Migration Guide

### Parallel Task Orchestrator

**File:** `convex/domains/agents/parallelTaskOrchestrator.ts`

```typescript
// Import the reasoning tool
import { internal } from "../../_generated/api";

// Line 268 - Decomposition
// BEFORE:
const { text } = await generateText({
  model: getLanguageModelSafe("devstral-2-free"),
  prompt,
  maxOutputTokens: 1000,
});

// AFTER:
const result = await ctx.runAction(internal.domains.agents.mcp_tools.reasoningTool.decomposeTask, {
  task: description,
  context: context || undefined,
  numBranches: 5,
});

const branches = result.decomposition.branches.map(b => ({
  description: b.description,
  complexity: b.estimatedComplexity,
  dependencies: b.dependsOn || [],
}));

// Line 334 - Exploration
// AFTER:
const exploreResult = await ctx.runAction(internal.domains.agents.mcp_tools.reasoningTool.getReasoning, {
  prompt: `Explore this branch deeply: ${branch.description}`,
  systemPrompt: "You are a technical explorer.",
  maxTokens: 2000,
  extractStructured: true,
});

const analysis = exploreResult.structured;
```

### LLM Judge

**File:** `convex/domains/evaluation/llmJudge.ts`

```typescript
// For complex evaluations requiring reasoning
const evaluation = await ctx.runAction(internal.domains.agents.mcp_tools.reasoningTool.getReasoning, {
  prompt: `Evaluate this test result:\n\nExpected: ${expected}\nActual: ${actual}`,
  systemPrompt: "You are an impartial judge evaluating test results.",
  maxTokens: 500,
  extractStructured: true,
});

const verdict = evaluation.structured.conclusion;
```

## Testing

Run the test suite:

```bash
npx convex run "domains/agents/mcp_tools/reasoningTool:testReasoningTool"
```

Expected output:
```
TEST: Reasoning Tool (GLM + Devstral Hybrid)
================================================================================

1️⃣  Test: Basic Reasoning
   Success: true
   Content: "Let me count the r's..."
   Reasoning tokens: 150
   Duration: 5.23s
   Cost: $0.000035

2️⃣  Test: Task Decomposition
   Success: true
   Branches: 4
      1. Real-time data pipeline (high)
      2. UI Components (medium)
      3. AI insights engine (high)
      4. User portfolio management (medium)
   Duration: 8.45s
   Cost: $0.000052

3️⃣  Test: Strategic Analysis
   Success: true
   Key factors: 5
   Strategic options: 3
   Recommendation: "Focus on technology leadership..."
   Duration: 10.12s
   Cost: $0.000065

✅ Reasoning Tool Tests Complete
```

## Monitoring

Track usage and costs:

```typescript
// Log reasoning tool usage
console.log(`Reasoning tool used:`, {
  operation: "task_decomposition",
  duration: result.duration,
  cost: result.cost,
  reasoningTokens: result.reasoningTokens,
});
```

## Best Practices

1. **Cache results** - Reasoning is slow, cache when possible
2. **Batch operations** - Combine multiple reasoning tasks
3. **Set appropriate maxTokens** - Don't overspend on tokens
4. **Use structured output** - Let devstral structure for FREE
5. **Fallback to devstral** - If reasoning fails, use devstral directly
6. **Monitor costs** - Track reasoning_tokens usage

## Fallback Strategy

```typescript
// Always have a fallback
let result;
try {
  result = await ctx.runAction(internal.domains.agents.mcp_tools.reasoningTool.getReasoning, {
    prompt,
    maxTokens: 1000,
  });

  if (!result.success) {
    throw new Error(result.error);
  }
} catch (error) {
  // Fallback to devstral-2-free (FREE, fast, reliable)
  const { generateText } = await import("ai");
  const { openrouter } = await import("@openrouter/ai-sdk-provider");
  const model = openrouter("mistralai/devstral-2512:free");

  const fallback = await generateText({ model, prompt });
  result = {
    success: true,
    content: fallback.text,
    duration: 0,
    cost: 0,
  };
}
```

## Future Enhancements

- [ ] Add caching layer for repeated reasoning requests
- [ ] Support custom structuring schemas
- [ ] Add reasoning quality scoring
- [ ] Implement token budgeting
- [ ] Support multi-turn reasoning conversations
- [ ] Add reasoning visualization/debugging

## Support

For issues or questions:
1. Check test results: `testReasoningTool`
2. Review docs: `REASONING_TOOL_USAGE.md`
3. Check cost impact: `docs/LLM_COST_OPTIMIZATION_SUMMARY.md`

---

**Status:** ✅ Production Ready
**Cost:** $0.07/M (98% savings vs claude-sonnet-4)
**Quality:** High with reasoning transparency
**Recommended for:** Complex analysis, task decomposition, strategic planning
