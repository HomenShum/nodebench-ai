# xAI/Grok Setup Guide

Quick guide to get xAI/Grok integration working in NodeBench.

---

## 1. Get Your xAI API Key

### Step 1: Create an Account
1. Visit https://console.x.ai
2. Sign up or log in with your X/Twitter account
3. Complete verification if required

### Step 2: Generate API Key
1. Navigate to API Keys section
2. Click "Create New API Key"
3. Copy the key (starts with `xai-...`)
4. Store it securely (you won't see it again!)

**Pricing:**
- Free tier: 100 requests/month
- Pay-as-you-go: $0.20/$0.50 per M tokens (98% cheaper than GPT-4)
- No commitment required

---

## 2. Add to Convex Environment

### Option A: Convex Dashboard (Recommended)

1. Visit your Convex dashboard: https://dashboard.convex.dev
2. Select your project: `nodebench-ai`
3. Go to Settings → Environment Variables
4. Click "Add Environment Variable"
5. Add:
   - **Name:** `XAI_API_KEY`
   - **Value:** `xai-...` (your API key)
   - **Environment:** Production
6. Save changes
7. Redeploy: `npx convex deploy`

### Option B: Command Line

```bash
# Set production environment variable
npx convex env set XAI_API_KEY xai-your-key-here

# Verify it's set
npx convex env list
```

---

## 3. Test the Integration

### Test 1: Basic API Call
```bash
npx convex run lib/xaiClient:testGrok
```

**Expected Output:**
```json
{
  "success": true,
  "response": "Paris",
  "usage": {
    "prompt_tokens": 25,
    "completion_tokens": 1,
    "total_tokens": 26
  }
}
```

### Test 2: Web Search
```bash
npx convex run lib/xaiClient:callGrokWithWebSearch '{
  "model": "grok-4-1-fast-reasoning",
  "query": "What are the latest updates from xAI?"
}'
```

### Test 3: X Search
```bash
npx convex run lib/xaiClient:callGrokWithXSearch '{
  "model": "grok-4-1-fast-reasoning",
  "query": "What is trending about AI on X today?"
}'
```

### Test 4: Rate Limits
```bash
npx convex run lib/xaiClient:getRateLimitStatus
```

---

## 4. Verify Industry Monitoring

### Manual Scan
```bash
npx convex run domains/monitoring/industryUpdates:scanIndustryUpdates
```

**Expected:**
- Scans 15 sources including xAI docs, GitHub, and blog
- Finds and analyzes updates
- Saves to database with relevance scores

### Check Results
1. Open your app at `#industry`
2. Click "Industry Updates" in sidebar
3. Filter by "xAI"
4. Should see recent updates from xAI sources

---

## 5. Start Using Grok Models

### In Agent Workflows

```typescript
import { api } from "@/convex/_generated/api";

// Use Grok for high-volume routing (98% cheaper)
const result = await ctx.runAction(api.lib.xaiClient.callGrok, {
  model: "grok-3-mini",
  messages: [
    { role: "system", content: "You are a router agent." },
    { role: "user", content: "Route this request to the best handler" }
  ],
  temperature: 0.3,
  maxTokens: 100,
});
```

### In Research Features

```typescript
// Use Grok with web search for real-time research
const research = await ctx.runAction(api.lib.xaiClient.callGrokWithWebSearch, {
  model: "grok-4-1-fast-reasoning",
  query: "Latest developments in LLM prompt caching 2026",
  maxTokens: 500,
});
```

### In GitHub Analysis

```typescript
// Use Grok with X search for trending repos
const trending = await ctx.runAction(api.lib.xaiClient.callGrokWithXSearch, {
  model: "grok-4-1-fast-reasoning",
  query: "What GitHub repos are trending on X today?",
  maxTokens: 500,
});
```

---

## 6. Cost Optimization Strategy

### Hybrid Approach (Recommended)

**Use Grok (98% cheaper) for:**
- Agent routing and classification
- High-volume tasks (1000+ requests/day)
- Real-time web/X search
- GitHub repository analysis
- Document summarization
- Code analysis

**Use Claude/GPT for:**
- Final decision making
- Complex reasoning tasks
- Long-form content generation
- Mission-critical operations

**Example Workflow:**
```
1. Grok gathers 100 candidates ($0.02)
2. Grok ranks top 20 ($0.004)
3. Claude analyzes top 5 ($0.01)
4. Grok generates summaries ($0.002)

Total: $0.036 (vs $1.80 with all GPT-4 = 98% savings)
```

### Monthly Cost Example

**Scenario:** 10,000 research queries/month

**All GPT-4:**
- 10,000 × $0.18 per request = $1,800/month

**Hybrid (70% Grok / 30% Claude):**
- 7,000 × $0.004 (Grok) = $28
- 3,000 × $0.02 (Claude) = $60
- **Total: $88/month (95% savings)**

---

## 7. Monitoring and Debugging

### Check API Usage
```bash
# View recent API calls
npx convex run lib/xaiClient:getRateLimitStatus

# Check cost dashboard
# Navigate to #cost in your app
```

### Debug Failed Calls

**Common Issues:**

1. **"XAI_API_KEY not found"**
   - Solution: Add key to Convex environment
   - Verify: `npx convex env list`

2. **"429 Rate limit exceeded"**
   - Solution: Upgrade plan or add retry logic
   - Check: `getRateLimitStatus()`

3. **"Invalid model name"**
   - Solution: Use valid model from catalog
   - Models: grok-4-1-fast-reasoning, grok-3-mini, etc.

4. **"API error (500)"**
   - Solution: Check xAI status page
   - Fallback: Automatic failover to OpenRouter/Anthropic

### Enable Logging

```typescript
// In your action
console.log("[xAI] Calling Grok with:", args);
const result = await callGrokAPI(args);
console.log("[xAI] Response:", result);
```

---

## 8. Next Steps

### Phase 2: For You Feed (Week 2)
See [X_ALGORITHM_INTEGRATION_PLAN.md](./X_ALGORITHM_INTEGRATION_PLAN.md) for:
- Personalized content discovery
- Phoenix ML ranking with Grok
- 50/50 in-network/out-of-network mix
- Real-time engagement tracking

### Phase 3-6: Full Integration
- Document Discovery (Week 3)
- Agent Marketplace (Week 4)
- Industry Monitoring Enhancement (Week 5)
- GitHub Explorer (Week 6)

---

## Quick Reference

### API Endpoints
- Base URL: `https://api.x.ai/v1`
- Chat Completions: `/chat/completions`
- Models: https://docs.x.ai/docs/models

### Available Models

| Model | Context | Input/Output per M | Best For |
|-------|---------|-------------------|----------|
| grok-4-1-fast-reasoning | 2M | $0.20/$0.50 | Routing, analysis |
| grok-3-mini | 128K | $1.00/$5.00 | High-volume tasks |
| grok-4 | 256K | $3.00/$15.00 | Complex reasoning |
| grok-code-fast-1 | 256K | $0.20/$0.50 | Code analysis |
| grok-2-vision-1212 | 128K | $3.00/$15.00 | Image analysis |

### Convex Actions
- `api.lib.xaiClient.callGrok` - Main API call
- `api.lib.xaiClient.callGrokWithWebSearch` - Web search
- `api.lib.xaiClient.callGrokWithXSearch` - X/Twitter search
- `api.lib.xaiClient.testGrok` - Integration test
- `api.lib.xaiClient.getRateLimitStatus` - Rate limits

### Environment Variables
- `XAI_API_KEY` - Your xAI API key (required)

---

## Support

**xAI Support:**
- Docs: https://docs.x.ai/docs
- Status: https://status.x.ai
- Community: https://x.com/xai

**NodeBench Issues:**
- Check logs: `npx convex logs`
- View dashboard: https://dashboard.convex.dev
- See plan: [X_ALGORITHM_INTEGRATION_PLAN.md](./X_ALGORITHM_INTEGRATION_PLAN.md)

---

🎉 **You're all set! Start using Grok for 98% cost savings on high-volume tasks.**
