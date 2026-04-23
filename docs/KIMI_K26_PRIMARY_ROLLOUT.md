# Kimi K2.6 Primary Model Rollout - April 22, 2026

## Summary

Successfully switched NodeBench's primary LLM agent runtime from Anthropic Claude to **MoonshotAI Kimi K2.6 via OpenRouter**.

## Changes Made

### 1. Model Resolver (`convex/domains/agents/mcp_tools/models/modelResolver.ts`)
- **DEFAULT_MODEL**: Changed to `"kimi-k2.6"` (line 120)
- **MODEL_PRIORITY_ORDER**: Kimi K2.6 is now first in the priority list (line 128)
- Updated documentation header to reflect the new default

### 2. Model Router (`convex/domains/ai/models/modelRouter.ts`)
- **Standard tier**: `kimi-k2.6` is first in the model list (line 114)
- **Premium tier**: `kimi-k2.6` is first in the model list (line 120)
- **Pricing**: Updated to $0.95/M input, $4.00/M output (line 145)

### 3. LLM Judge (`convex/domains/evaluation/llmJudge.ts`)
- **Primary judge model**: Returns `"kimi-k2.6"` when `OPENROUTER_API_KEY` is available (lines 48-49)
- **Fallback chain**: gpt-5.4 → claude-sonnet-4.6 → gemini-3.1-pro-preview → gpt-5.4-mini

### 4. Model Catalog (`shared/llm/modelCatalog.ts`)
- **Header documentation**: Updated to show "kimi-k2.6: OpenRouter-first primary agent lane" (line 9)
- **Pricing**: Corrected Kimi K2.6 pricing to $0.95/$4.00 per 1M tokens (line 100)

## Model Specifications

| Model | Provider | Input Cost | Output Cost | Context Window |
|-------|----------|------------|-------------|----------------|
| kimi-k2.6 | OpenRouter | $0.95/M | $4.00/M | 262,144 tokens |
| gpt-5.4 | OpenAI | $2.50/M | $15.00/M | 1,050,000 tokens |
| claude-sonnet-4.6 | Anthropic | $3.00/M | $15.00/M | 1,000,000 tokens |
| claude-opus-4.7 | Anthropic | $5.00/M | $25.00/M | 1,000,000 tokens |

## Verification Status

### ✅ Code Changes
- [x] Model resolver defaults updated
- [x] Model router tier assignments updated
- [x] LLM judge selection logic updated
- [x] Pricing catalog synchronized
- [x] TypeScript type-check passes
- [x] Convex deploy succeeds

### ⚠️ Live Validation (Requires Credentials)
The following require `CONVEX_URL` and `MCP_SECRET`:
- [ ] Direct OpenRouter Kimi API smoke test
- [ ] Multi-SDK adapter validation (Vercel, LangGraph)
- [ ] End-to-end eval suite on Kimi lane

## Migration Notes

### For Developers
- Ensure `OPENROUTER_API_KEY` is set in your Convex environment
- The system will automatically fall back to other providers if OpenRouter is unavailable
- No code changes required for existing agents - they will use the new default automatically

### For Evaluations
- The judge will now use Kimi K2.6 when OpenRouter is configured
- Fallback to GPT-5.4 if OpenRouter is not available
- Eval scripts use the new defaults automatically

## Rollback Plan

If issues are discovered:
1. Change `DEFAULT_MODEL` in `modelResolver.ts` back to previous primary
2. Reorder `MODEL_PRIORITY_ORDER` to preference previous model
3. Redeploy Convex functions
4. Restart any active evaluation runs

## References

- OpenRouter Model Card: https://openrouter.ai/moonshotai/kimi-k2.6
- Kimi K2.6 supports 256K context window with strong long-horizon reasoning
- Pricing verified against OpenRouter API as of April 22, 2026

---

**Date**: April 22, 2026  
**Commit**: TBD  
**Deployed**: Yes (Convex cloud)
