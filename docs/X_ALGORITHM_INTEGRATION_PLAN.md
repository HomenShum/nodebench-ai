# X Algorithm & Grok Integration Plan
## End-to-End NodeBench Implementation

**Date:** 2026-01-22
**GitHub:** https://github.com/xai-org/x-algorithm
**Status:** Implementation Ready

---

## Executive Summary

Integrate X's open-source For You algorithm patterns and xAI's Grok models across NodeBench to create a **personalized discovery engine** for research, documents, agents, and industry updates.

### Core Value Propositions

1. **Transparency**: Use proven ranking logic from X (12.2k stars, Apache-2.0)
2. **Real-time Intelligence**: Grok's live web search for latest data
3. **Cost Efficiency**: Grok 4.1 Fast at $0.20/$0.50 per million tokens (vs GPT-4)
4. **Native X Integration**: Pull trending discussions, papers, companies
5. **50/50 Discovery Mix**: In-network (saved/followed) + out-of-network (discovery)

---

## Architecture Overview

### X Algorithm Components → NodeBench Features

| X Component | NodeBench Application | Impact |
|-------------|----------------------|---------|
| **Phoenix** (ML Ranking) | Dossier/Document Recommendation | Personalized research feed |
| **Thunder** (In-Memory Store) | Real-time Entity Updates | Fresh company/market data |
| **Home Mixer** | Research Hub Orchestration | Unified content assembly |
| **Candidate Pipeline** | Agent/Tool Discovery | Reusable ranking framework |
| **Grok Transformer** | Multi-Action Prediction | 15+ engagement signals |

---

## Feature Integration Matrix

### 1. Research Hub - Personalized For You Feed

**Current State:** Static list of dossiers
**X Algorithm Pattern:** Phoenix ranking + Home Mixer orchestration
**Grok Enhancement:** Real-time trending topics from X/web

```typescript
// convex/domains/research/forYouFeed.ts
import { internalAction } from "../../_generated/server";
import { v } from "convex/values";

export const generateForYouFeed = internalAction({
  args: {
    userId: v.id("users"),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    // STEP 1: Candidate Sourcing (X's Thunder pattern)
    const candidates = await ctx.runQuery(
      internal.domains.research.forYouFeed.getCandidates,
      {
        userId: args.userId,
        sources: [
          "in_network",     // Saved dossiers
          "out_of_network", // Discovery
          "trending",       // Grok real-time
        ],
      }
    );

    // STEP 2: Phoenix ML Ranking
    const rankedCandidates = await ctx.runAction(
      internal.domains.research.forYouFeed.rankWithPhoenix,
      {
        userId: args.userId,
        candidates,
        model: "grok-4-1-fast-reasoning",
      }
    );

    // STEP 3: Home Mixer Orchestration (50/50 mix)
    const feed = await ctx.runAction(
      internal.domains.research.forYouFeed.mixFeed,
      {
        inNetwork: rankedCandidates.filter(c => c.source === "in_network"),
        outOfNetwork: rankedCandidates.filter(c => c.source === "out_of_network"),
        trending: rankedCandidates.filter(c => c.source === "trending"),
        targetRatio: { inNetwork: 0.5, outOfNetwork: 0.4, trending: 0.1 },
      }
    );

    return feed.slice(0, args.limit);
  },
});
```

**Engagement Signals** (X's 15+ actions):
- `click` - User opened dossier
- `save` - User saved to library
- `share` - User shared link
- `time_spent` - Dwell time on page
- `create_similar` - User created related dossier
- `agent_invoke` - User ran agents on content
- `export` - User exported to PDF/LinkedIn

**Implementation Files:**
- `convex/domains/research/forYouFeed.ts` - Feed generation
- `convex/domains/research/candidateSourcing.ts` - Thunder pattern
- `convex/domains/research/phoenixRanking.ts` - ML scoring
- `src/features/research/views/ForYouFeed.tsx` - UI component

---

### 2. Document Discovery - Smart Recommendations

**Current State:** Recent documents list
**X Algorithm Pattern:** Two-tower embeddings + Grok reasoning
**Grok Enhancement:** Semantic search with web context

```typescript
// convex/domains/documents/smartDiscovery.ts
export const discoverRelevantDocuments = internalAction({
  args: {
    userId: v.id("users"),
    currentDocumentId: v.optional(v.id("documents")),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    // Get user's engagement history
    const userHistory = await ctx.runQuery(
      internal.domains.documents.smartDiscovery.getUserHistory,
      { userId: args.userId }
    );

    // Two-tower embedding (X's Phoenix pattern)
    const userEmbedding = await generateUserEmbedding(userHistory);
    const candidateEmbeddings = await getCandidateDocumentEmbeddings();

    // Cosine similarity for retrieval
    const candidates = retrieveTopK(userEmbedding, candidateEmbeddings, 100);

    // Grok transformer for precise ranking
    const ranked = await ctx.runAction(
      internal.domains.documents.smartDiscovery.rankWithGrok,
      {
        userId: args.userId,
        candidates,
        currentContext: args.currentDocumentId,
        engagementHistory: userHistory,
      }
    );

    return ranked.slice(0, args.limit);
  },
});

// Grok ranking implementation
export const rankWithGrok = internalAction({
  args: {
    userId: v.id("users"),
    candidates: v.array(v.any()),
    currentContext: v.optional(v.id("documents")),
    engagementHistory: v.any(),
  },
  handler: async (ctx, args) => {
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.XAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "grok-4-1-fast-reasoning",
        messages: [{
          role: "system",
          content: `You are a document recommendation system using X's algorithm.
Rank documents by predicted engagement probability.
Consider: relevance, recency, diversity, user history.
Output JSON array of document IDs ranked by score.`
        }, {
          role: "user",
          content: `User History: ${JSON.stringify(args.engagementHistory)}
Current Context: ${args.currentContext}
Candidates: ${JSON.stringify(args.candidates.map(c => ({ id: c.id, title: c.title, tags: c.tags })))}

Rank by engagement probability (click, save, time_spent).`
        }],
        response_format: { type: "json_object" },
      }),
    });

    const result = await response.json();
    return JSON.parse(result.choices[0].message.content);
  },
});
```

**Metrics to Track:**
- CTR (Click-through rate)
- Dwell time
- Save rate
- Diversity score
- Coverage ratio

**Implementation Files:**
- `convex/domains/documents/smartDiscovery.ts`
- `convex/domains/documents/engagementTracking.ts`
- `src/features/documents/components/SmartRecommendations.tsx`

---

### 3. Agent Marketplace - Ranked by Relevance

**Current State:** Agent list with basic filtering
**X Algorithm Pattern:** Candidate pipeline + multi-action prediction
**Grok Enhancement:** Real-time agent performance from GitHub

```typescript
// convex/domains/agents/agentRanking.ts
export const rankAgents = internalAction({
  args: {
    userId: v.id("users"),
    task: v.string(),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    // STEP 1: Candidate sourcing (X's pattern)
    const candidates = await ctx.runQuery(
      internal.domains.agents.agentRanking.getCandidateAgents,
      {
        task: args.task,
        sources: [
          "user_favorites",  // In-network
          "popular",         // Engagement-based
          "new",            // Discovery
          "similar_tasks",  // Collaborative filtering
        ],
      }
    );

    // STEP 2: Grok web search for real-time agent performance
    const enhancedCandidates = await ctx.runAction(
      internal.domains.agents.agentRanking.enhanceWithLiveData,
      {
        candidates,
        task: args.task,
      }
    );

    // STEP 3: Multi-action prediction (X's Phoenix)
    const ranked = await ctx.runAction(
      internal.domains.agents.agentRanking.predictEngagement,
      {
        userId: args.userId,
        candidates: enhancedCandidates,
        task: args.task,
      }
    );

    return ranked.slice(0, args.limit);
  },
});

// Grok live data enhancement
export const enhanceWithLiveData = internalAction({
  args: {
    candidates: v.array(v.any()),
    task: v.string(),
  },
  handler: async (ctx, args) => {
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.XAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "grok-4-1-fast-reasoning",
        messages: [{
          role: "user",
          content: `Search GitHub and X for latest performance data on these AI agents for task: "${args.task}"

Agents: ${args.candidates.map(c => c.name).join(", ")}

Return JSON with:
- Agent name
- Recent GitHub stars/activity
- X mentions/sentiment
- Performance benchmarks
- Success rate for similar tasks`
        }],
        tools: [{
          type: "function",
          function: {
            name: "web_search",
            description: "Search web for agent performance data",
          }
        }],
      }),
    });

    const result = await response.json();
    return mergeWithCandidates(args.candidates, result);
  },
});
```

**Ranking Factors:**
1. **Task Relevance** (40%) - Match to user's task
2. **Performance** (25%) - Success rate, speed
3. **Recency** (15%) - Recent updates
4. **Popularity** (10%) - GitHub stars, usage
5. **User History** (10%) - Past agent preferences

**Implementation Files:**
- `convex/domains/agents/agentRanking.ts`
- `convex/domains/agents/engagementPrediction.ts`
- `src/features/agents/components/RankedAgentList.tsx`

---

### 4. Industry Updates - Relevance Scoring

**Current State:** Daily scan with LLM analysis
**X Algorithm Pattern:** Real-time filtering + ranking
**Grok Enhancement:** X/Twitter trending + deep web search

```typescript
// Enhanced industry monitoring with X algorithm patterns
// convex/domains/monitoring/industryUpdatesEnhanced.ts

export const scanWithXAlgorithm = internalAction({
  args: {},
  handler: async (ctx) => {
    // STEP 1: Grok real-time trending topics
    const trendingTopics = await ctx.runAction(
      internal.domains.monitoring.industryUpdatesEnhanced.getTrendingTopics,
      {}
    );

    // STEP 2: Deep web search for each topic
    const findings = [];
    for (const topic of trendingTopics) {
      const result = await ctx.runAction(
        internal.domains.monitoring.industryUpdatesEnhanced.deepSearch,
        { topic }
      );
      findings.push(...result);
    }

    // STEP 3: X algorithm ranking (Phoenix pattern)
    const ranked = await ctx.runAction(
      internal.domains.monitoring.industryUpdatesEnhanced.rankByEngagement,
      { findings }
    );

    // STEP 4: Save top findings
    await ctx.runMutation(
      internal.domains.monitoring.industryUpdates.saveFindings,
      { findings: ranked.slice(0, 20) }
    );

    return ranked;
  },
});

export const getTrendingTopics = internalAction({
  args: {},
  handler: async (ctx) => {
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.XAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "grok-4-1-fast-reasoning",
        messages: [{
          role: "user",
          content: `Search X (Twitter) for trending topics in AI/ML today.
Focus on: Anthropic, OpenAI, Google DeepMind, LangChain, Vercel AI SDK, xAI

Return JSON array of:
{
  "topic": "string",
  "sentiment": "positive|neutral|negative",
  "engagement": number,
  "sources": ["url1", "url2"]
}`
        }],
        tools: [{
          type: "function",
          function: {
            name: "x_search",
            description: "Search X for trending AI topics",
          }
        }],
      }),
    });

    const result = await response.json();
    return JSON.parse(result.choices[0].message.content);
  },
});

export const deepSearch = internalAction({
  args: {
    topic: v.object({
      topic: v.string(),
      sources: v.array(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.XAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "grok-4-1-fast-reasoning",
        messages: [{
          role: "user",
          content: `Deep web search for: "${args.topic.topic}"

Search:
- GitHub repositories (recent commits, stars)
- Documentation updates
- Academic papers (arXiv)
- Blog posts and tutorials
- X discussions

Return detailed findings with citations.`
        }],
        tools: [{
          type: "function",
          function: {
            name: "web_search",
            description: "Deep web search across multiple sources",
          }
        }],
      }),
    });

    const result = await response.json();
    return parseFindings(result, args.topic.topic);
  },
});
```

**Enhanced Relevance Scoring:**
- **X Engagement** (30%) - Likes, retweets, replies on X
- **GitHub Activity** (25%) - Stars, commits, PR activity
- **LLM Analysis** (20%) - Existing relevance scoring
- **Recency** (15%) - How fresh is the update
- **Source Authority** (10%) - Official vs. community

**Implementation Files:**
- `convex/domains/monitoring/industryUpdatesEnhanced.ts`
- `convex/domains/monitoring/xAlgorithmRanking.ts`
- Update `IndustryUpdatesPanel.tsx` to show X engagement metrics

---

### 5. GitHub Content Analyzer - Repository Ranking

**New Feature:** AI-powered GitHub discovery
**X Algorithm Pattern:** Full Phoenix + Thunder implementation
**Grok Enhancement:** Native GitHub analysis + X sentiment

```typescript
// convex/domains/github/repoRanking.ts
export const discoverRepositories = internalAction({
  args: {
    query: v.string(),
    filters: v.object({
      language: v.optional(v.string()),
      minStars: v.optional(v.number()),
      topics: v.optional(v.array(v.string())),
    }),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    // STEP 1: Grok GitHub search
    const candidates = await ctx.runAction(
      internal.domains.github.repoRanking.searchGitHub,
      { query: args.query, filters: args.filters }
    );

    // STEP 2: X sentiment analysis
    const withSentiment = await ctx.runAction(
      internal.domains.github.repoRanking.getXSentiment,
      { repos: candidates }
    );

    // STEP 3: X algorithm ranking
    const ranked = await ctx.runAction(
      internal.domains.github.repoRanking.applyXAlgorithm,
      { repos: withSentiment }
    );

    // STEP 4: Cache results
    await ctx.runMutation(
      internal.domains.github.repoRanking.cacheResults,
      { query: args.query, results: ranked }
    );

    return ranked.slice(0, args.limit);
  },
});

export const applyXAlgorithm = internalAction({
  args: {
    repos: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    // Implement X's multi-action prediction
    const engagementPredictions = await Promise.all(
      args.repos.map(async (repo) => {
        const score = calculateEngagementScore(repo, {
          star: 0.3,          // Weight for stars
          fork: 0.2,          // Weight for forks
          commit: 0.15,       // Weight for recent commits
          x_mentions: 0.15,   // Weight for X mentions
          dependency: 0.1,    // Weight for downstream deps
          freshness: 0.1,     // Weight for recency
        });

        return {
          ...repo,
          engagementScore: score,
          predictedActions: {
            star: score * 0.3,
            fork: score * 0.2,
            visit: score * 0.5,
          },
        };
      })
    );

    // Sort by engagement score (X's ranking)
    return engagementPredictions.sort((a, b) =>
      b.engagementScore - a.engagementScore
    );
  },
});

function calculateEngagementScore(repo: any, weights: Record<string, number>) {
  // Normalize each factor to 0-1 range
  const factors = {
    star: Math.log(repo.stars + 1) / Math.log(100000), // Log scale
    fork: Math.log(repo.forks + 1) / Math.log(10000),
    commit: repo.recentCommits / 100,
    x_mentions: Math.log(repo.xMentions + 1) / Math.log(1000),
    dependency: Math.log(repo.dependencies + 1) / Math.log(1000),
    freshness: Math.exp(-repo.daysSinceUpdate / 30), // Exponential decay
  };

  // Weighted sum
  return Object.entries(weights).reduce((sum, [key, weight]) => {
    return sum + (factors[key] || 0) * weight;
  }, 0);
}
```

**UI Component:**
```tsx
// src/features/github/components/GitHubExplorer.tsx
export function GitHubExplorer() {
  const [query, setQuery] = useState("");
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(false);

  const discoverRepos = useMutation(api.domains.github.repoRanking.discoverRepositories);

  const handleSearch = async () => {
    setLoading(true);
    const results = await discoverRepos({
      query,
      filters: { minStars: 100 },
      limit: 20,
    });
    setRepos(results);
    setLoading(false);
  };

  return (
    <div>
      <input value={query} onChange={e => setQuery(e.target.value)} />
      <button onClick={handleSearch}>Discover with X Algorithm</button>

      {repos.map(repo => (
        <RepoCard
          key={repo.id}
          repo={repo}
          engagementScore={repo.engagementScore}
          xMentions={repo.xMentions}
          predictedActions={repo.predictedActions}
        />
      ))}
    </div>
  );
}
```

**Implementation Files:**
- `convex/domains/github/repoRanking.ts`
- `convex/domains/github/xAlgorithmScoring.ts`
- `src/features/github/components/GitHubExplorer.tsx`
- `src/features/github/views/RepositoryDiscovery.tsx`

---

## Cost Optimization Strategy

### Model Selection by Use Case

| Use Case | Recommended Model | Cost | Justification |
|----------|------------------|------|---------------|
| **Document Ranking** | grok-4-1-fast-reasoning | $0.20/$0.50 per M | Fast, 2M context for full history |
| **Industry Scan** | grok-4-1-fast-reasoning | $0.20/$0.50 per M | Web search + reasoning |
| **GitHub Analysis** | grok-4-1-fast-reasoning | $0.20/$0.50 per M | Large context for repo analysis |
| **Agent Recommendation** | grok-3-mini | Lower than Grok 3 | Cost-efficient for simple ranking |
| **Feed Assembly** | grok-code-fast-1 | $0.20/$0.50 per M | Specialized for agentic tasks |

### Cost Comparison (10K requests/month)

**Current (GPT-4):**
- Input: 10K × 2K tokens × $10/M = $200
- Output: 10K × 500 tokens × $30/M = $150
- **Total: $350/month**

**With Grok 4.1 Fast:**
- Input: 10K × 2K tokens × $0.20/M = $4
- Output: 10K × 500 tokens × $0.50/M = $2.50
- **Total: $6.50/month**
- **Savings: $343.50/month (98% reduction!)**

### Web Search Cost Management

**Live Search Pricing:** $25 per 1,000 sources ($0.025/source)

**Optimization:**
- Cache search results for 1 hour
- Batch queries when possible
- Limit to 3-5 sources per search
- Use cached tokens for repeated queries

**Example:**
- 100 searches/day × 5 sources = 500 sources/day
- 500 × $0.025 = $12.50/day
- **Monthly: ~$375** (still cheaper than GPT-4 base cost!)

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
**Goal:** Set up xAI integration and basic ranking

1. **Get xAI API Key**
   - Visit https://console.x.ai
   - Add to environment: `XAI_API_KEY=your_key_here`

2. **Add Grok to Model Registry**
   ```typescript
   // convex/lib/modelRegistry.ts
   {
     id: "grok-4-1-fast-reasoning",
     name: "Grok 4.1 Fast Reasoning",
     provider: "xai",
     contextWindow: 2000000, // 2M tokens
     pricing: {
       input: 0.20,  // per 1M tokens
       output: 0.50,
     },
     capabilities: ["reasoning", "web_search", "x_search"],
   }
   ```

3. **Create xAI Client Wrapper**
   ```typescript
   // convex/lib/xaiClient.ts
   export async function callGrok(params: {
     model: string;
     messages: any[];
     tools?: any[];
   }) {
     const response = await fetch("https://api.x.ai/v1/chat/completions", {
       method: "POST",
       headers: {
         "Authorization": `Bearer ${process.env.XAI_API_KEY}`,
         "Content-Type": "application/json",
       },
       body: JSON.stringify(params),
     });
     return response.json();
   }
   ```

4. **Test Basic Integration**
   ```bash
   npx convex run lib/xaiClient:testGrok
   ```

**Deliverables:**
- ✅ xAI API working
- ✅ Grok in model registry
- ✅ Client wrapper tested

---

### Phase 2: Research Hub Feed (Week 2)
**Goal:** Personalized For You feed with 50/50 mix

1. **Track User Engagement**
   - Add engagement tracking to existing dossier views
   - Store: clicks, saves, time_spent, shares

2. **Implement Candidate Sourcing**
   - In-network: User's saved dossiers
   - Out-of-network: Popular + new dossiers
   - Trending: Grok real-time topics

3. **Build Phoenix Ranking**
   - Two-tower embeddings for retrieval
   - Grok transformer for precision ranking
   - Multi-action prediction (15+ signals)

4. **Create Home Mixer**
   - 50% in-network
   - 40% out-of-network
   - 10% trending
   - Diversity filtering

5. **UI Component**
   - Add "For You" tab to Research Hub
   - Infinite scroll
   - Engagement tracking on clicks

**Deliverables:**
- ✅ For You feed working
- ✅ Engagement tracking active
- ✅ 50/50 mix maintained

---

### Phase 3: Document Discovery (Week 3)
**Goal:** Smart document recommendations

1. **User History Embedding**
   - Generate user profile from engagement
   - Two-tower architecture

2. **Candidate Retrieval**
   - Cosine similarity for top-K
   - Retrieve 100 candidates

3. **Grok Ranking**
   - Rank by engagement probability
   - Consider context and diversity

4. **UI Integration**
   - Add "Recommended" section to Documents Hub
   - Show relevance scores

**Deliverables:**
- ✅ Smart recommendations working
- ✅ Metrics tracked (CTR, save rate)

---

### Phase 4: Agent Marketplace (Week 4)
**Goal:** Ranked agent discovery

1. **Agent Performance Tracking**
   - Success rate
   - Speed
   - User ratings

2. **Grok Live Data**
   - GitHub stars/activity
   - X mentions
   - Recent benchmarks

3. **Multi-Action Prediction**
   - Predict: use, save, share
   - Rank by weighted score

4. **UI**
   - Ranked agent list
   - Performance badges
   - "Why this agent?" explanations

**Deliverables:**
- ✅ Agents ranked by relevance
- ✅ Real-time performance data

---

### Phase 5: Industry Monitoring Enhancement (Week 5)
**Goal:** X algorithm patterns for industry updates

1. **Trending Topics**
   - Grok X/Twitter search
   - Real-time trending

2. **Deep Web Search**
   - GitHub + arXiv + docs
   - Multi-source synthesis

3. **X Algorithm Ranking**
   - Engagement-based scoring
   - Recency + authority

4. **UI Enhancement**
   - Show X engagement metrics
   - Trending badge
   - Source diversity score

**Deliverables:**
- ✅ Enhanced industry monitoring
- ✅ X engagement visible in UI

---

### Phase 6: GitHub Explorer (Week 6)
**Goal:** New feature for repository discovery

1. **GitHub Search**
   - Grok native GitHub analysis
   - Filter by language, stars, topics

2. **X Sentiment**
   - Pull X mentions
   - Sentiment analysis

3. **X Algorithm Ranking**
   - Multi-factor scoring
   - Engagement prediction

4. **UI**
   - New GitHub Explorer view
   - Repository cards with scores
   - Filters and sorting

**Deliverables:**
- ✅ GitHub Explorer live
- ✅ X algorithm ranking applied

---

## Evaluation & Metrics

### Recommendation Quality

**Metrics to Track:**
- **Precision@K**: % of top-K recommendations that are relevant
- **Recall@K**: % of relevant items in top-K
- **nDCG**: Normalized Discounted Cumulative Gain
- **Diversity**: 1 - Simpson's diversity index
- **Coverage**: % of items that appear in any recommendation

**Target Benchmarks:**
- Precision@10: >40%
- nDCG@20: >0.65
- Diversity: >0.7
- Coverage: >50%

### User Engagement

**Metrics to Track:**
- CTR (Click-through rate)
- Save rate
- Share rate
- Time spent
- Return rate (daily/weekly)

**Target Benchmarks:**
- CTR: >10%
- Save rate: >5%
- Daily return rate: >30%

### Cost Efficiency

**Metrics to Track:**
- Cost per recommendation
- Cost per user per day
- Web search cost per query
- Cache hit rate

**Target Benchmarks:**
- <$0.001 per recommendation
- <$0.05 per user per day
- Cache hit rate: >70%

---

## Database Schema Extensions

### New Tables

**1. engagement_events**
```typescript
defineTable({
  userId: v.id("users"),
  itemId: v.string(),           // documentId, dossierId, agentId
  itemType: v.string(),          // "document", "dossier", "agent"
  action: v.string(),            // "click", "save", "share", "time_spent"
  value: v.optional(v.number()), // For time_spent, rating
  metadata: v.any(),
  timestamp: v.number(),
})
  .index("by_user_and_type", ["userId", "itemType"])
  .index("by_item", ["itemId"])
  .index("by_timestamp", ["timestamp"]);
```

**2. ranking_cache**
```typescript
defineTable({
  cacheKey: v.string(),          // Hash of query + user
  rankedItems: v.array(v.any()),
  model: v.string(),             // "grok-4-1-fast-reasoning"
  score: v.number(),             // Quality score
  expiresAt: v.number(),
  createdAt: v.number(),
})
  .index("by_cache_key", ["cacheKey"])
  .index("by_expires_at", ["expiresAt"]);
```

**3. x_mentions**
```typescript
defineTable({
  itemId: v.string(),            // GitHub repo, topic, etc.
  source: v.string(),            // "x", "github", "arxiv"
  mentionCount: v.number(),
  sentiment: v.string(),         // "positive", "neutral", "negative"
  lastUpdated: v.number(),
  metadata: v.any(),
})
  .index("by_item_and_source", ["itemId", "source"])
  .index("by_last_updated", ["lastUpdated"]);
```

---

## Testing Strategy

### Unit Tests
```typescript
// Test candidate sourcing
test("getCandidates returns 50/50 mix", async () => {
  const candidates = await getCandidates(userId);
  const inNetwork = candidates.filter(c => c.source === "in_network");
  const outNetwork = candidates.filter(c => c.source === "out_of_network");

  expect(inNetwork.length / candidates.length).toBeCloseTo(0.5, 1);
});

// Test ranking quality
test("rankWithGrok orders by engagement", async () => {
  const ranked = await rankWithGrok(candidates);

  for (let i = 0; i < ranked.length - 1; i++) {
    expect(ranked[i].score).toBeGreaterThanOrEqual(ranked[i + 1].score);
  }
});
```

### Integration Tests
```typescript
// Test full For You feed generation
test("generateForYouFeed returns personalized results", async () => {
  const feed = await generateForYouFeed({ userId, limit: 20 });

  expect(feed).toHaveLength(20);
  expect(feed[0].score).toBeGreaterThan(0);

  // Check diversity
  const uniqueTopics = new Set(feed.map(item => item.topic));
  expect(uniqueTopics.size).toBeGreaterThan(10);
});
```

### A/B Testing
```typescript
// Compare X algorithm vs baseline
const abTest = {
  variant_a: "baseline_ranking",    // Current algorithm
  variant_b: "x_algorithm_ranking", // New X algorithm
  metrics: ["ctr", "save_rate", "time_spent"],
  duration_days: 14,
};

// Track results
const results = await runABTest(abTest);
console.log(`CTR improvement: ${results.variant_b.ctr / results.variant_a.ctr}x`);
```

---

## Monitoring & Observability

### Key Dashboards

**1. Recommendation Quality Dashboard**
- Precision@K over time
- nDCG trends
- Diversity score
- Coverage ratio

**2. Cost Dashboard** (extend existing)
- Grok API costs
- Web search costs
- Cost per recommendation
- ROI (engagement increase vs cost)

**3. Engagement Dashboard**
- CTR by item type
- Save rate trends
- Time spent distribution
- Return rate (DAU/MAU)

### Alerts

**Performance Alerts:**
- Precision@10 drops below 30%
- nDCG drops below 0.5
- Diversity drops below 0.6

**Cost Alerts:**
- Daily cost exceeds $50
- Web search cost >$20/day
- Cost per user >$0.10/day

**Quality Alerts:**
- API error rate >1%
- Cache hit rate <50%
- Response time >2s (p95)

---

## Next Steps

1. **Review this plan** - Discuss priorities and timeline
2. **Get xAI API key** - Start with foundation phase
3. **Choose first feature** - Recommend Research Hub For You feed
4. **Set up tracking** - Implement engagement events table
5. **Build MVP** - Basic ranking with Grok in 1 week
6. **Measure & iterate** - Track metrics, optimize

**Estimated Total Timeline:** 6 weeks for all features

**Estimated Monthly Cost (at scale):**
- Grok API: ~$50/month (10K requests/day)
- Web search: ~$400/month (with caching)
- **Total: ~$450/month** (vs $10,500 with GPT-4!)

---

## Conclusion

Integrating X's algorithm and Grok creates a **personalized discovery engine** across NodeBench:

✅ **Proven patterns** from 500M+ DAU platform
✅ **Cost efficiency** - 98% reduction vs GPT-4
✅ **Real-time intelligence** - Grok web search
✅ **Native X integration** - Trending topics and sentiment
✅ **Transparent ranking** - Open-source algorithm

**Ready to implement Phase 1?** I can start with the xAI integration and basic model registry right now.
