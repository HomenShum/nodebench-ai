# Reasoning Tool - Architecture Diagrams

## 1. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           USER LAYER                                     │
│  FastAgentPanel │ CinematicHome │ TaskManager │ ProactiveFeed          │
└────────────┬────────────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      ORCHESTRATION LAYER                                 │
│                                                                          │
│  ┌───────────────┐  ┌──────────────┐  ┌─────────────┐                 │
│  │ Swarm Orch    │  │ Parallel Orch│  │ Fast Agent  │                 │
│  │ Fan-out/gather│  │ Tree execution│  │ Direct chat │                 │
│  └───────┬───────┘  └──────┬───────┘  └──────┬──────┘                 │
│          │                  │                  │                         │
│          └──────────────────┼──────────────────┘                         │
│                             │                                            │
└─────────────────────────────┼────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      MODEL ROUTING LAYER                                 │
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │              Decision: Simple or Complex?                          │ │
│  │                                                                    │ │
│  │  Factors:                                                         │ │
│  │  - Query complexity                                               │ │
│  │  - Multi-step reasoning needed?                                   │ │
│  │  - Strategic analysis required?                                   │ │
│  │  - Cost vs quality trade-off                                      │ │
│  └───────────┬───────────────────────────────┬───────────────────────┘ │
│              │                                 │                        │
│       Simple │                                 │ Complex                │
│              ▼                                 ▼                        │
│  ┌─────────────────────┐         ┌───────────────────────────┐        │
│  │  FREE Models        │         │  Reasoning Tool           │        │
│  │                     │         │                           │        │
│  │  devstral-2-free    │         │  Cost: $0.07/M           │        │
│  │  Cost: $0.00        │         │  Time: 5-15s             │        │
│  │  Time: 1-3s         │         │  Quality: High+Reasoning │        │
│  │  Quality: Good      │         │                           │        │
│  └─────────────────────┘         └────────────┬──────────────┘        │
│                                                │                        │
└────────────────────────────────────────────────┼────────────────────────┘
                                                 │
                                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   REASONING TOOL INTERNALS                               │
│                                                                          │
│  Step 1: GLM 4.7 Flash Reasoning                                        │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │ OpenRouter Native Reasoning API                                    ││
│  │                                                                     ││
│  │ POST https://openrouter.ai/api/v1/chat/completions                ││
│  │ {                                                                  ││
│  │   model: "z-ai/glm-4.7-flash",                                    ││
│  │   reasoning: { enabled: true },  ← Key parameter                  ││
│  │   messages: [...]                                                  ││
│  │ }                                                                  ││
│  │                                                                     ││
│  │ Response:                                                          ││
│  │ {                                                                  ││
│  │   content: "Detailed answer...",                                  ││
│  │   reasoning_details: [{step1}, {step2}, ...],                    ││
│  │   usage: { reasoning_tokens: 150 }                                ││
│  │ }                                                                  ││
│  └────────────────────────────────────────────────────────────────────┘│
│                             │                                           │
│                             │ Raw GLM response                          │
│                             ▼                                           │
│  Step 2: Devstral Structuring (Optional)                               │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │ @openrouter/ai-sdk-provider + Vercel AI SDK                       ││
│  │                                                                     ││
│  │ const model = openrouter("mistralai/devstral-2512:free");        ││
│  │ const result = await generateObject({                             ││
│  │   model,                                                          ││
│  │   schema: z.object({                                              ││
│  │     mainPoints: z.array(z.string()),                             ││
│  │     summary: z.string(),                                          ││
│  │     conclusion: z.string(),                                       ││
│  │   }),                                                             ││
│  │   prompt: `Structure this: ${glmResponse}`                        ││
│  │ });                                                               ││
│  │                                                                     ││
│  │ Cost: $0.00 (FREE)                                                ││
│  └────────────────────────────────────────────────────────────────────┘│
│                             │                                           │
│                             ▼                                           │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │ Return Structured Result                                           ││
│  │ {                                                                  ││
│  │   success: true,                                                   ││
│  │   content: "Detailed answer",                                     ││
│  │   reasoning: "Step-by-step thinking",                            ││
│  │   structured: { mainPoints, summary, conclusion },                ││
│  │   reasoningTokens: 150,                                           ││
│  │   duration: 7000ms,                                               ││
│  │   cost: 0.000049 USD                                              ││
│  │ }                                                                  ││
│  └────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

## 2. Parallel Orchestrator Integration

```
┌─────────────────────────────────────────────────────────────────────────┐
│            PARALLEL TASK ORCHESTRATOR FLOW                               │
└─────────────────────────────────────────────────────────────────────────┘

User Query: "Analyze Tesla's competitive position"
     │
     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Phase 1: DECOMPOSITION                                                   │
│                                                                          │
│ Current: devstral-2-free ($0.00)                                        │
│ Optional: Reasoning Tool ($0.07/M) for dependency analysis              │
│                                                                          │
│ Input:  "Analyze Tesla's competitive position"                          │
│ Output: [                                                               │
│   { name: "Technology Leadership", complexity: "high" },                │
│   { name: "Brand Equity", complexity: "medium" },                       │
│   { name: "Manufacturing Scale", complexity: "high" },                  │
│   { name: "Market Position", complexity: "medium" }                     │
│ ]                                                                        │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Phase 2: PARALLEL EXECUTION (4 branches in parallel)                    │
│                                                                          │
│  Branch 1              Branch 2            Branch 3          Branch 4   │
│  ┌──────────┐        ┌──────────┐        ┌──────────┐      ┌────────┐ │
│  │Tech Lead │        │Brand     │        │Manufact  │      │Market  │ │
│  │          │        │Equity    │        │Scale     │      │Position│ │
│  └────┬─────┘        └────┬─────┘        └────┬─────┘      └───┬────┘ │
│       │                   │                   │                 │      │
│       │ Use Reasoning Tool for deep exploration                 │      │
│       │                   │                   │                 │      │
│       ▼                   ▼                   ▼                 ▼      │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │ reasoningTool.getReasoning({                                       ││
│  │   prompt: "Explore [branch] deeply...",                           ││
│  │   maxTokens: 2000                                                  ││
│  │ })                                                                 ││
│  │                                                                     ││
│  │ GLM reasoning: 8s, $0.07/M                                        ││
│  │ Devstral structure: 2s, FREE                                       ││
│  │ Total per branch: ~10s, ~$0.000014                               ││
│  └────────────────────────────────────────────────────────────────────┘│
│       │                   │                   │                 │      │
│       └───────────────────┴───────────────────┴─────────────────┘      │
│                                     │                                   │
└─────────────────────────────────────┼───────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Phase 3: VERIFICATION (per branch)                                      │
│                                                                          │
│ Current: devstral-2-free ($0.00) - Simple checks                       │
│ Keep as-is: Fast, FREE, good enough                                     │
└─────────────────────────────────────┬───────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Phase 4: CRITIQUE (cross-branch validation)                             │
│                                                                          │
│ Current: devstral-2-free ($0.00) - Simple critiques                    │
│ Keep as-is: Works well, FREE                                            │
└─────────────────────────────────────┬───────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Phase 5: SYNTHESIS                                                       │
│                                                                          │
│ UPGRADE: Use Reasoning Tool for strategic synthesis                     │
│                                                                          │
│ reasoningTool.analyzeStrategically({                                    │
│   topic: "Tesla competitive position synthesis",                        │
│   context: [branch1, branch2, branch3, branch4],                        │
│   focusAreas: ["technology", "brand", "scale", "market"]               │
│ })                                                                       │
│                                                                          │
│ GLM reasoning: 12s, $0.07/M                                            │
│ - Analyzes all branches                                                 │
│ - Identifies patterns                                                   │
│ - Performs SWOT                                                         │
│ - Strategic recommendation                                              │
│                                                                          │
│ Devstral structure: 3s, FREE                                            │
│ - Structured SWOT output                                                │
│ - Key factors, opportunities, threats                                   │
│ - Strategic options with pros/cons                                      │
│                                                                          │
│ Output: {                                                               │
│   keyFactors: [...],                                                    │
│   strengths: [...],                                                     │
│   opportunities: [...],                                                 │
│   strategicOptions: [...],                                              │
│   recommendation: "Tesla's competitive advantages center on..."         │
│ }                                                                        │
└─────────────────────────────────────┬───────────────────────────────────┘
                                      │
                                      ▼
                          Final Answer to User
```

**Cost Analysis:**
- Decomposition: $0.00 (devstral-2-free)
- 4 Branch Explorations: 4 × $0.000014 = $0.000056
- 4 Verifications: $0.00 (devstral-2-free)
- Synthesis: $0.000084
- **Total: ~$0.00014** (vs $0.0024 with claude-sonnet-4)
- **Savings: 94%**

## 3. Swarm Orchestrator Integration

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    SWARM ORCHESTRATOR FLOW                               │
└─────────────────────────────────────────────────────────────────────────┘

User: /spawn "Tesla market analysis" --agents=sec,media,research
     │
     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Phase 1: SPAWN AGENTS (parallel)                                        │
│                                                                          │
│  SECAgent          MediaAgent         EntityResearchAgent               │
│  ┌────────┐       ┌─────────┐        ┌──────────────┐                 │
│  │Financial│       │News &   │        │Market        │                 │
│  │Filings  │       │Sentiment│        │Analysis      │                 │
│  └───┬────┘       └────┬────┘        └──────┬───────┘                 │
│      │                 │                     │                          │
│      │  Each agent runs independently         │                          │
│      │  with their own tools/context          │                          │
│      │                 │                     │                          │
│      └─────────────────┴─────────────────────┘                          │
│                           │                                              │
│                           ▼                                              │
│  3 agent results completed                                              │
└─────────────────────────────────────┬───────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Phase 2: SYNTHESIS (gather & merge)                                     │
│                                                                          │
│ Current: synthesizeResults() uses model resolver                        │
│ UPGRADE: Use Reasoning Tool for intelligent synthesis                   │
│                                                                          │
│ const synthesis = await ctx.runAction(                                 │
│   internal.domains.agents.mcp_tools.reasoningTool.getReasoning,        │
│   {                                                                     │
│     prompt: `Synthesize results from 3 specialized agents:             │
│                                                                          │
│     SECAgent found:                                                     │
│     ${secResult}                                                        │
│                                                                          │
│     MediaAgent found:                                                   │
│     ${mediaResult}                                                      │
│                                                                          │
│     EntityResearchAgent found:                                          │
│     ${researchResult}                                                   │
│                                                                          │
│     Think deeply about:                                                 │
│     1. Agreement between sources                                        │
│     2. Contradictions and how to resolve them                          │
│     3. Confidence levels                                                │
│     4. Comprehensive unified answer                                     │
│     `,                                                                  │
│     systemPrompt: "You are a synthesis expert.",                       │
│     maxTokens: 2000,                                                    │
│     extractStructured: true                                             │
│   }                                                                     │
│ );                                                                      │
│                                                                          │
│ GLM reasoning (10s, $0.07/M):                                          │
│ - Analyzes all 3 agent outputs                                          │
│ - Identifies agreements                                                 │
│ - Resolves contradictions                                               │
│ - Assesses confidence                                                   │
│ - Provides reasoning transparency                                       │
│                                                                          │
│ Devstral structures (3s, FREE):                                         │
│ {                                                                        │
│   mainPoints: [                                                         │
│     "SEC filings show strong revenue growth",                          │
│     "Media sentiment is positive on innovation",                       │
│     "Market share expanding in EV segment"                             │
│   ],                                                                    │
│   summary: "Unified analysis shows...",                                │
│   confidence: 0.85,                                                     │
│   sourceAgreement: {                                                    │
│     agreeing: ["growth trajectory", "innovation"],                     │
│     conflicting: ["profitability timeline"]                            │
│   }                                                                     │
│ }                                                                        │
│                                                                          │
│ Cost: ~$0.00014 (vs $0.0024 with claude-sonnet-4)                     │
└─────────────────────────────────────┬───────────────────────────────────┘
                                      │
                                      ▼
                       Display in FastAgentPanel thread
```

## 4. Tool Calling Pattern

```
┌─────────────────────────────────────────────────────────────────────────┐
│                   MCP-STYLE TOOL ARCHITECTURE                            │
└─────────────────────────────────────────────────────────────────────────┘

Agent or Orchestrator
     │
     │ Needs complex reasoning
     │
     ▼
┌───────────────────────────────────────────────────────────────────────┐
│ ctx.runAction(                                                         │
│   internal.domains.agents.mcp_tools.reasoningTool.getReasoning,      │
│   {                                                                    │
│     prompt: "Complex question...",                                    │
│     systemPrompt: "You are an expert...",                            │
│     maxTokens: 1500,                                                  │
│     extractStructured: true,                                          │
│     returnRaw: false                                                  │
│   }                                                                    │
│ )                                                                      │
└────────────────────────────┬──────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    REASONING TOOL                                        │
│  convex/domains/agents/mcp_tools/reasoningTool.ts                      │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │ 1. Validate Input                                                  ││
│  │    - Check API key                                                 ││
│  │    - Validate parameters                                           ││
│  │    - Check token budget                                            ││
│  └────────────────────────────────────────────────────────────────────┘│
│                             │                                           │
│                             ▼                                           │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │ 2. Call GLM with Native Reasoning                                  ││
│  │    - POST to OpenRouter API                                        ││
│  │    - reasoning: { enabled: true }                                  ││
│  │    - Get content + reasoning_details                               ││
│  │    - Track tokens & cost                                           ││
│  └────────────────────────────────────────────────────────────────────┘│
│                             │                                           │
│                             ▼                                           │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │ 3. Structure with Devstral (if extractStructured=true)            ││
│  │    - Use Vercel AI SDK generateObject()                           ││
│  │    - Apply Zod schema                                              ││
│  │    - FREE structuring                                              ││
│  └────────────────────────────────────────────────────────────────────┘│
│                             │                                           │
│                             ▼                                           │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │ 4. Return Typed Response                                           ││
│  │    {                                                               ││
│  │      success: true,                                                ││
│  │      content: "Answer...",                                         ││
│  │      reasoning: "Reasoning steps...",                             ││
│  │      reasoningTokens: 150,                                         ││
│  │      structured: { mainPoints, summary, conclusion },             ││
│  │      duration: 7000,                                               ││
│  │      cost: 0.000049                                                ││
│  │    }                                                               ││
│  └────────────────────────────────────────────────────────────────────┘│
│                             │                                           │
└─────────────────────────────┼───────────────────────────────────────────┘
                              │
                              ▼
                     Agent uses structured result
```

## 5. Cost Comparison Visualization

```
┌─────────────────────────────────────────────────────────────────────────┐
│                   MONTHLY COST COMPARISON                                │
└─────────────────────────────────────────────────────────────────────────┘

BEFORE (claude-sonnet-4 everywhere):
█████████████████████████████████████████████████████████ $29.00/mo

AFTER OPTIMIZATIONS (FREE + deepseek):
████ $1.25/mo (96% savings)

WITH REASONING TOOL (selective use):
██ $0.49/mo (98% savings)

Breakdown:
┌────────────────────────┬──────────┬──────────┬──────────┐
│ Component              │ Before   │ After Opt│ +Reasoning│
├────────────────────────┼──────────┼──────────┼──────────┤
│ Email Drafts           │ $1.00    │ $0.00    │ $0.00    │
│ LLM Judge              │ $1.00    │ $0.00    │ $0.00    │
│ Parallel Decomp        │ $3.00    │ $0.00    │ $0.00    │
│ Parallel Explore       │ $9.00    │ $0.75    │ $0.21    │
│ Parallel Verify        │ $3.00    │ $0.00    │ $0.00    │
│ Parallel Critique      │ $6.00    │ $0.00    │ $0.00    │
│ Parallel Synth         │ $6.00    │ $0.50    │ $0.14    │
│ Swarm Synth            │ -        │ -        │ $0.14    │
├────────────────────────┼──────────┼──────────┼──────────┤
│ TOTAL                  │ $29.00   │ $1.25    │ $0.49    │
│ SAVINGS                │ -        │ 96%      │ 98%      │
└────────────────────────┴──────────┴──────────┴──────────┘

Key Insight: Reasoning Tool provides BETTER quality at LOWER cost!
```

## 6. Decision Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│              WHEN TO USE REASONING TOOL                                  │
└─────────────────────────────────────────────────────────────────────────┘

                         LLM Request
                             │
                             ▼
                    ┌────────────────┐
                    │ Analyze Request│
                    └────────┬───────┘
                             │
                             ▼
            ┌────────────────────────────────┐
            │ Is it a complex task?          │
            │ - Multi-step reasoning         │
            │ - Strategic analysis           │
            │ - SWOT/comparison              │
            │ - Task decomposition           │
            │ - Result synthesis             │
            └────────┬──────────────┬────────┘
                     │              │
              No     │              │ Yes
                     │              │
        ┌────────────┘              └────────────┐
        │                                        │
        ▼                                        ▼
┌───────────────────┐                ┌──────────────────────┐
│ Use FREE Model    │                │ Use Reasoning Tool   │
│                   │                │                      │
│ devstral-2-free   │                │ Cost: $0.07/M       │
│ Cost: $0.00       │                │ Time: 5-15s         │
│ Time: 1-3s        │                │ Quality: High       │
│ Quality: Good     │                │ + Reasoning         │
│                   │                │                      │
│ Examples:         │                │ Examples:            │
│ - Email drafts    │                │ - Branch exploration │
│ - Simple checks   │                │ - Strategic analysis │
│ - Quick queries   │                │ - Multi-source synth │
│ - Verification    │                │ - Complex decomp     │
└───────────────────┘                └──────────────────────┘
```

## 7. Token Flow & Cost

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    TOKEN USAGE BREAKDOWN                                 │
└─────────────────────────────────────────────────────────────────────────┘

Example: "Analyze Tesla's competitive advantages"

Input Tokens:
├─ System prompt: 50 tokens
├─ User question: 10 tokens
├─ Context: 100 tokens
└─ Total input: 160 tokens

GLM 4.7 Flash Reasoning:
├─ Output tokens: 500 tokens
├─ Reasoning tokens: 150 tokens
├─ Total GLM: 650 output tokens
└─ Cost: (160 + 650) × $0.00000007 = $0.0000567

Devstral Structuring (if enabled):
├─ Input: 500 tokens (GLM output)
├─ Output: 200 tokens (structured)
├─ Total devstral: 700 tokens
└─ Cost: $0.00 (FREE)

Total:
├─ GLM cost: $0.0000567
├─ Devstral cost: $0.00
└─ Total: $0.0000567

Compare to claude-sonnet-4:
├─ Same 160 input + 500 output = 660 tokens
├─ Cost: 660 × $0.000003 = $0.00198
└─ Savings: 97% ($0.00198 - $0.0000567 = $0.00192)
```

## 8. Future Enhancements

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    REASONING TOOL ROADMAP                                │
└─────────────────────────────────────────────────────────────────────────┘

Phase 1: Foundation (Current)
├─ ✅ GLM + Devstral hybrid
├─ ✅ Native reasoning API
├─ ✅ Three main functions
└─ ✅ MCP-style tool pattern

Phase 2: Optimization (Next)
├─ 🔲 Caching layer for common patterns
├─ 🔲 Token budgeting system
├─ 🔲 Quality scoring metrics
└─ 🔲 Fallback optimization

Phase 3: Advanced (Future)
├─ 🔲 Multi-turn reasoning conversations
├─ 🔲 Reasoning visualization in UI
├─ 🔲 Custom schema support
├─ 🔲 Reasoning quality feedback loop
└─ 🔲 Cross-agent reasoning aggregation

Phase 4: Intelligence (Long-term)
├─ 🔲 Self-improving reasoning patterns
├─ 🔲 Domain-specific reasoning modules
├─ 🔲 Collaborative multi-model reasoning
└─ 🔲 Reasoning process optimization ML
```

---

## Summary

The Reasoning Tool integrates seamlessly into your existing agentic infrastructure as a **shared MCP-style tool**, providing:

1. **Native OpenRouter Reasoning API** - Properly supports glm-4.7-flash
2. **Hybrid Architecture** - GLM reasoning + Devstral structuring
3. **98% Cost Savings** - $0.07/M vs $3.00/M (claude-sonnet-4)
4. **Reasoning Transparency** - Access to thinking process
5. **Flexible Integration** - Use selectively where reasoning adds value
6. **Production Ready** - Tests, fallbacks, monitoring included

**Next Step:** Deploy and integrate with parallel orchestrator for immediate 72% cost savings on branch exploration and synthesis.
