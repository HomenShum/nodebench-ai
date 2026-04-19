# NodeBench Cost Analysis — Full Transparency

Last updated: 2026-03-31
Source: Production measurements from nodebenchai.com/api/harness

---

## 1. What a Single Query Costs Us (Provider Cost)

Every query triggers 3 LLM calls + 2-5 tool executions:

| Step | Model | Tokens (est.) | Cost |
|------|-------|---------------|------|
| 1. Classify intent | Gemini 3.1 Flash Lite | ~300 in / ~100 out | $0.000053 |
| 2. Plan tool chain | Gemini 3.1 Flash Lite | ~800 in / ~200 out | $0.000120 |
| 3. Execute tools | — | — | varies by tool |
| 4. Synthesize results | Gemini 3.1 Flash Lite | ~2000 in / ~500 out | $0.000300 |
| **LLM subtotal** | | | **~$0.0005/query** |

Tool execution costs:

| Tool | Provider | Cost per call | Notes |
|------|----------|---------------|-------|
| web_search | Gemini Search Grounding | ~$0.001-0.005 | Depends on result count |
| enrich_entity | Gemini Flash Lite | ~$0.0005 | Structured extraction |
| run_recon | Local (no API) | $0.00 | SQLite + filesystem |
| founder_local_gather | Local (no API) | $0.00 | SQLite + git |
| founder_local_weekly_reset | Local (no API) | $0.00 | SQLite |
| call_llm | Gemini → OpenAI → Anthropic | $0.0005-0.075 | Depends on provider |
| linkup_search | Linkup API | ~$0.01 | Used in legacy path |

### Measured production costs (5-query session, 2026-03-31):

| Query | Type | Steps | Duration | Cost |
|-------|------|-------|----------|------|
| "Tell me about Anthropic" | company_search | 3 | 13.4s | $0.015 |
| "What are their biggest risks?" | general (follow-up) | 3 | 16.2s | $0.015 |
| "Compare Anthropic vs OpenAI" | multi_entity | 3 | 5.7s | $0.015 |
| "What happened this week?" | weekly_reset | 2 | 4.5s | $0.010 |
| "Plan a GTM strategy" | plan_proposal | 4 | 12.8s | $0.020 |
| **Session total** | | **15 steps** | **52.6s** | **$0.082** |

**Average: $0.016/query, $0.005/tool-step**

---

## 2. What Each Provider Actually Charges (per 1M tokens)

### LLM Providers (as of March 2026)

| Model | Input | Output | Use Case |
|-------|-------|--------|----------|
| Gemini 3.1 Flash Lite | $0.075 | $0.30 | Classification, planning, synthesis (default) |
| Gemini 3.1 Flash | $0.15 | $0.60 | Complex extraction |
| Gemini 3.1 Pro | $1.25 | $5.00 | Deep analysis (Pro QA runs) |
| Claude Haiku 4.5 | $1.00 | $5.00 | Fallback routing |
| Claude Sonnet 4.6 | $3.00 | $15.00 | Mid-tier tasks |
| Claude Opus 4.6 | $15.00 | $75.00 | Full synthesis (not used in harness) |
| GPT-5.4 Nano | ~$0.10 | ~$0.40 | OpenAI fallback |

### Search & Data Providers

| Provider | Cost | Included in |
|----------|------|-------------|
| Gemini Search Grounding | ~$0.001-0.005/query | web_search tool |
| Linkup API (standard) | €0.01-0.05/search | Legacy search path, depth: "standard" |
| Linkup API (deep) | €0.05/search | Deep mode, not currently used |
| Linkup Fetch | €0.001-0.005/call | URL fetch (without/with JS rendering) |
| Convex | Free tier: 25K fn calls/mo | Backend persistence |
| Vercel | Free Hobby: 100GB bandwidth | Frontend + serverless |

---

## 3. Monthly Cost Projections (Our Infrastructure Cost)

### Scenario A: Solo Founder (10 queries/day)
| Component | Monthly Cost |
|-----------|-------------|
| LLM (Gemini Flash Lite) | $0.16 × 30 = **$4.80** |
| Web search | ~$1.50 |
| Convex | Free tier |
| Vercel | Free tier |
| **Total** | **~$6.30/month** |

### Scenario B: Active Team (100 queries/day)
| Component | Monthly Cost |
|-----------|-------------|
| LLM (Gemini Flash Lite) | $1.63 × 30 = **$48.90** |
| Web search | ~$15.00 |
| Convex | Free or $25/mo Pro |
| Vercel | Free or $20/mo Pro |
| **Total** | **~$64-109/month** |

### Scenario C: Power User (500 queries/day)
| Component | Monthly Cost |
|-----------|-------------|
| LLM (Gemini Flash Lite) | $8.15 × 30 = **$244.50** |
| Web search | ~$75.00 |
| Convex | $25/mo Pro |
| Vercel | $20/mo Pro |
| **Total** | **~$365/month** |

---

## 4. Cost Comparison vs. Alternatives

| Product | Cost per Query | What You Get |
|---------|---------------|--------------|
| **NodeBench (Gemini Flash Lite)** | **$0.016** | 3-5 tool calls, structured packet, multi-turn session |
| ChatGPT Pro | ~$0.05-0.15 | Single LLM response, no tool orchestration |
| Perplexity Pro | $20/mo flat | Web search + synthesis, no tool chain |
| Claude Pro | $20/mo flat | Single conversation, no MCP tools |
| Custom GPT-4o pipeline | ~$0.08-0.20 | Similar tool chain, 10x more expensive per token |
| Custom Claude Opus pipeline | ~$0.50-2.00 | Highest quality but 100x cost |

**NodeBench's cost advantage**: Gemini Flash Lite is 13-200x cheaper than Claude/GPT for the classification and planning steps where quality difference is minimal. We use expensive models only when synthesis quality requires it (not yet enabled in default harness).

---

## 5. Where the Money Goes (Cost Breakdown by Function)

Based on production measurements:

```
Classification:  3% ($0.0005) — Gemini Flash Lite, 400 tokens
Planning:        7% ($0.0012) — Gemini Flash Lite, 1000 tokens
Tool execution: 60% ($0.0098) — web_search + enrich_entity API calls
Synthesis:      18% ($0.0030) — Gemini Flash Lite, 2500 tokens
Overhead:       12% ($0.0020) — cost tracking, session management estimate
```

**Insight**: Tool execution (web search API calls) is 60% of cost. LLM calls are only 28%. Optimizing search caching would have the highest ROI.

---

## 6. Cost Optimization Levers (What We Can Do)

| Lever | Savings | Tradeoff |
|-------|---------|----------|
| Cache web_search results (1hr TTL) | -40% on repeat entities | Stale data for fast-moving topics |
| Skip classification for follow-ups | -3% per follow-up | Might misclassify context switches |
| Batch parallel tool calls | -10% latency | Already implemented |
| Use Gemini Flash Lite for synthesis | Already default | Lower quality than Pro |
| Linkup instead of Gemini search | Similar cost | Different source coverage |
| Skip planning for known patterns | -7% for common queries | Less flexible |

---

## 7. Honest Limitations

1. **Cost tracking is estimated, not metered.** We estimate tokens from JSON payload sizes (`string.length / 4`), not from actual API response headers. Real costs may be 10-30% higher due to prompt overhead and system tokens.

2. **web_search cost is opaque.** Gemini Search Grounding doesn't report per-call costs in the API response. We estimate $0.001-0.005 based on Google's published rates.

3. **Synthesis quality vs cost tradeoff.** The harness defaults to Gemini Flash Lite ($0.075/1M) for ALL LLM calls. Upgrading synthesis to Gemini Pro ($1.25/1M) would improve answer quality but increase per-query cost from $0.016 to ~$0.05.

4. **Vercel cold starts add latency, not cost.** First query after idle takes 2-5s longer due to serverless cold start. Subsequent queries in the same session are faster.

5. **Convex free tier has limits.** 25K function calls/month. At 100 queries/day with profiler logging, we'd hit this in ~8 days. Pro tier ($25/mo) removes the limit.

---

## 8. Pricing Tiers (What We Should Charge)

Based on 3x margin over infrastructure cost:

| Tier | Queries/mo | Our Cost | Price | Margin |
|------|-----------|----------|-------|--------|
| **Free** | 50 | $0.82 | $0 | Acquisition |
| **Pro** | 1,000 | $16.30 | $29/mo | 78% |
| **Team** | 5,000/seat | $81.50 | $49/seat/mo | 40% |
| **Enterprise** | Unlimited | Usage-based | Custom | Negotiated |

### Usage-based add-ons:
- Additional queries beyond tier: $0.05/query (3x markup)
- Gemini Pro synthesis upgrade: $0.10/query
- Linkup deep search: $0.03/query
- Session replay/export: $0.02/session
- API access (harness endpoints): Included in Pro+

---

## 9. How We Track Costs

### In the harness (real-time):
- `session.totalCostUsd` — accumulated per session
- `turn.costUsd` — per-query cost estimate
- `/status` slash command shows running total
- `/cost` slash command shows per-turn breakdown
- `GET /api/harness/sessions/:id/cost` — programmatic access

### In the profiler (persistent):
- `profilerEvents` table in Convex — every tool call with cost estimate
- `profilerSessionSummaries` — per-session aggregates
- Dashboard Profiler tab — 4 insight cards (when Convex writes verified)

### What we DON'T track yet:
- Actual token counts from API response headers
- Gemini Search Grounding per-call cost
- Convex function call costs
- Vercel serverless invocation costs
