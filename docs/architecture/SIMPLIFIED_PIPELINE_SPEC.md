# Simplified Search Pipeline — April 2026 Industry Standard

## Plain English (for non-technical managers)

NodeBench's search works like a research analyst with three steps:

1. **Search** — We ask Linkup (a web search API built for AI) to find everything about a company. It returns structured, cited results — not raw web pages.

2. **Analyze** — We send those results to Gemini (Google's AI) and ask: "What are the key signals, risks, and next moves?" It returns a structured report with every claim linked to a source.

3. **Package** — We take the analysis, check every claim against its source, filter out anything unverified, and deliver a clean 4-block result: Founder Truth, Why This Holds/Breaks, Next Move, Ready Packet.

This is the same pattern used by Perplexity, ChatGPT Research, and Claude Research — but with NodeBench's founder-specific lens and signal taxonomy.

## Architecture (LangGraph pattern)

```
User Query
    │
    ▼
┌─────────────┐
│  CLASSIFY    │  What kind of query? Company search, competitor, founder ops?
│  (instant)   │  Token-overlap routing hints (no LLM needed)
└─────┬───────┘
      │
      ▼
┌─────────────┐
│  SEARCH     │  Linkup API: structured web search with source citations
│  (2-5 sec)  │  Returns: answer + sources[] with URLs, titles, snippets
└─────┬───────┘
      │
      ▼
┌─────────────┐
│  ANALYZE    │  Gemini: extract signals, risks, comparables, next moves
│  (3-8 sec)  │  Every claim carries a source reference
└─────┬───────┘
      │
      ▼
┌─────────────┐
│  PACKAGE    │  Deterministic filter: remove unverified claims, apply taxonomy
│  (instant)  │  Classify signals into 12 categories, compute evidence spans
└─────┬───────┘
      │
      ▼
┌─────────────┐
│  EVAL       │  HyperLoop: record quality metrics, compare to archive
│  (instant)  │  Score components, gates, improvement@k
└─────────────┘
```

Total latency target: **5-15 seconds** (vs current 15-40 seconds)

## Why this is simpler

| Current (3500+ lines) | New (500 lines) |
|----------------------|-----------------|
| 8+ classification branches | 1 token-overlap classifier |
| 3 different search tools | 1 Linkup API call |
| 5 parallel tool calls | 1 structured search + 1 analysis |
| 4-model LLM fallback chain | 1 Gemini call with JSON mode |
| 500+ lines of deterministic extraction | Linkup structured output handles it |
| Hand-rolled retry/timeout | LangGraph checkpointing |

## Stack

| Layer | Tool | Why |
|-------|------|-----|
| Orchestration | LangGraph pattern (TypeScript) | Industry standard, typed state, checkpointing |
| Web Search | Linkup API (structured output) | Returns cited, structured results — no scraping |
| Analysis | Gemini 2.0 Flash (JSON mode) | Fast, cheap, good at structured extraction |
| Signal Taxonomy | `server/lib/signalTaxonomy.ts` | 12 categories, 30 labels (already built) |
| Evidence | `server/lib/evidenceSpan.ts` | Source verification (already built) |
| Quality | HyperLoop eval (already built) | Archive + improvement@k |
| Routing | `server/lib/routingHints.ts` | Token-overlap scoring (already built) |

## What we keep from current system

- Signal taxonomy (12 categories, 30 canonical labels)
- Evidence spans (verification status per claim)
- HyperLoop evaluation (quality scoring + archive)
- Routing hints (token-overlap scoring)
- Session memory (action/failure records)
- Packet filter (deterministic claim validation)

## What we replace

- The 3500-line `search.ts` route handler → 500-line pipeline
- The 2700-line `agentHarness.ts` → LangGraph-style typed state graph
- Multiple search tool calls → Single Linkup structured search
- 4-model LLM fallback chain → Single Gemini call with JSON mode
- Hand-rolled classification → Token-overlap hints + simple keyword matching
