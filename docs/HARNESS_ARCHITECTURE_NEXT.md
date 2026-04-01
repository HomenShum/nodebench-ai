# Agent Harness Architecture — Next Steps

## Current State (what works but is brittle)

```
callLLM() → direct Gemini REST API → 15s timeout → 2000 char per tool result
```

This works for production demos but has fundamental problems:
- Timeout-based: if LLM takes 16s, synthesis fails silently
- Truncation-based: 2000 chars per tool loses data
- Blocking: user waits for full response before seeing anything
- No caching: same entity queried twice pays full cost twice

## What Big Players Do

### DeerFlow (ByteDance)
- **Isolated sub-agent context**: Each sub-agent gets scoped context
- **Summarization**: Completed sub-tasks are summarized, intermediate results offloaded
- **Progressive loading**: Skills loaded only when needed
- Pattern: decompose → parallel sub-agents → summarize → merge

### Claw-Code (instructkr)
- **Session compaction**: Runtime compacts conversation to stay in budget
- **Streaming API**: Response streams token-by-token
- Pattern: stream → compact → re-stream

### Claude API (Anthropic)
- **Prompt caching**: `cache_control` stores reusable context blocks
- **Streaming**: SSE with token-by-token delivery
- Pattern: cache system prompt → stream response → reuse cache

## What NodeBench Should Build

### 1. Streaming Synthesis (replace callLLM timeout)
```
User query → harness plans → tools execute → results stream to frontend
                                           → synthesis streams to frontend
```
- Use Gemini streaming API (server-sent events), not batch generateContent
- Frontend renders tokens as they arrive (like ChatGPT/Perplexity)
- No timeout needed — stream until done or user cancels

### 2. Context Budgeting (replace char truncation)
```
Available tokens = model_limit - system_prompt - tool_descriptions
Per-tool budget = available / num_tools
Summarize if tool_output > per_tool_budget
```
- Calculate available context per tool based on model limits
- If tool output exceeds budget, summarize it first (cheap LLM call)
- Never truncate at arbitrary char count

### 3. Prompt Caching (reduce cost for repeat entities)
```
First query: "Anthropic" → cache system prompt + entity context → $0.015
Second query: "Anthropic risks" → cache hit → $0.002
```
- Use Anthropic's prompt caching or Gemini's context caching
- Cache key: entity name + lens + date
- TTL: 1 hour (entity data changes slowly)

### 4. Sub-Agent Synthesis (DeerFlow pattern)
```
ResearchAgent → produces research_summary (500 tokens)
AnalysisAgent → produces analysis_summary (500 tokens)
SynthesisAgent → merges summaries into final packet (1000 tokens)
```
- Each agent works in isolated context
- Intermediate results summarized before passing to next agent
- Final synthesis sees only summaries, not raw tool dumps

### 5. Progressive Disclosure in Frontend
```
Step 1 visible: "Planning strategy..." (0.5s)
Step 2 visible: "Searching web..." (2s) → show partial sources
Step 3 visible: "Analyzing risks..." (5s) → show partial risks
Step 4 visible: "Writing memo..." (8s) → stream answer tokens
```
- Each harness step updates the frontend card as it completes
- User sees intelligence building up, not waiting for full completion
- Similar to Perplexity's progressive answer rendering
