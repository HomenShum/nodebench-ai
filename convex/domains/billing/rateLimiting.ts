/**
 * Rate Limiting Module
 * 
 * Integrates with the model catalog to enforce usage limits based on user tier.
 * Tracks requests, tokens, and costs per user per day.
 */

import { v } from "convex/values";
import { query, mutation } from "../../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api } from "../../_generated/api";
import {
  type UserTier,
  type LlmProvider,
  getTierLimits,
  calculateRequestCost,
  isModelAllowedForTier,
  getBestModelForTier,
  getProviderForModel,
  type LlmTask,
} from "../../../shared/llm/modelCatalog";

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

async function getUserTier(ctx: any, userId: any): Promise<UserTier> {
  if (!userId) return "anonymous";
  
  try {
    // Check subscription status
    const sub = await ctx.runQuery(api.domains.billing.billing.getSubscription, {});
    if (sub?.status === "active") {
      // Map subscription plan to tier
      const planId = sub.planId?.toLowerCase() || "";
      if (planId.includes("enterprise")) return "enterprise";
      if (planId.includes("team")) return "team";
      if (planId.includes("pro")) return "pro";
      return "pro"; // Default active subscription to pro
    }
    return "free";
  } catch {
    return "free";
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get current usage and limits for the authenticated user
 */
export const getCurrentUsage = query({
  args: {},
  returns: v.object({
    tier: v.string(),
    usage: v.object({
      requests: v.number(),
      tokens: v.number(),
      cost: v.number(),
    }),
    limits: v.object({
      requestsPerDay: v.number(),
      tokensPerDay: v.number(),
      costLimitPerDay: v.number(),
      maxTokensPerRequest: v.number(),
    }),
    remaining: v.object({
      requests: v.number(),
      tokens: v.number(),
      cost: v.number(),
    }),
    allowedModels: v.array(v.string()),
  }),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    const tier = await getUserTier(ctx, userId);
    const limits = getTierLimits(tier as UserTier);
    const date = todayISO();

    // Get today's usage
    let usage = { requests: 0, tokens: 0, cost: 0 };
    
    if (userId) {
      const usageRecord = await ctx.db
        .query("llmUsageDaily")
        .withIndex("by_user_date", (q: any) => q.eq("userId", userId).eq("date", date))
        .first();
      
      if (usageRecord) {
        usage = {
          requests: usageRecord.requests,
          tokens: usageRecord.totalTokens,
          cost: usageRecord.totalCost,
        };
      }
    }

    // Calculate remaining
    const remaining = {
      requests: limits.requestsPerDay === -1 ? -1 : Math.max(0, limits.requestsPerDay - usage.requests),
      tokens: limits.tokensPerDay === -1 ? -1 : Math.max(0, limits.tokensPerDay - usage.tokens),
      cost: limits.costLimitPerDay === -1 ? -1 : Math.max(0, limits.costLimitPerDay - usage.cost),
    };

    return {
      tier,
      usage,
      limits: {
        requestsPerDay: limits.requestsPerDay,
        tokensPerDay: limits.tokensPerDay,
        costLimitPerDay: limits.costLimitPerDay,
        maxTokensPerRequest: limits.maxTokensPerRequest,
      },
      remaining,
      allowedModels: limits.allowedModels,
    };
  },
});

/**
 * Check if a specific model is allowed for the current user
 */
export const canUseModel = query({
  args: { model: v.string() },
  returns: v.object({
    allowed: v.boolean(),
    reason: v.optional(v.string()),
    suggestedModel: v.optional(v.string()),
  }),
  handler: async (ctx, { model }) => {
    const userId = await getAuthUserId(ctx);
    const tier = await getUserTier(ctx, userId) as UserTier;
    
    if (isModelAllowedForTier(model, tier)) {
      return { allowed: true };
    }
    
    // Suggest an alternative
    const provider = getProviderForModel(model);
    const suggestedModel = getBestModelForTier("chat", tier, provider || "openai");
    
    return {
      allowed: false,
      reason: `Model "${model}" is not available on the ${tier} tier`,
      suggestedModel,
    };
  },
});

/**
 * Pre-flight check before making an LLM request
 */
export const checkRequestAllowed = query({
  args: {
    model: v.string(),
    estimatedInputTokens: v.number(),
    estimatedOutputTokens: v.optional(v.number()),
  },
  returns: v.object({
    allowed: v.boolean(),
    reason: v.optional(v.string()),
    estimatedCost: v.number(),
    suggestedModel: v.optional(v.string()),
  }),
  handler: async (ctx, { model, estimatedInputTokens, estimatedOutputTokens }) => {
    const userId = await getAuthUserId(ctx);
    const tier = await getUserTier(ctx, userId) as UserTier;
    const limits = getTierLimits(tier);
    const date = todayISO();

    // Check model allowed
    if (!isModelAllowedForTier(model, tier)) {
      const provider = getProviderForModel(model);
      return {
        allowed: false,
        reason: `Model "${model}" is not available on the ${tier} tier`,
        estimatedCost: 0,
        suggestedModel: getBestModelForTier("chat", tier, provider || "openai"),
      };
    }

    // Calculate estimated cost
    const outputTokens = estimatedOutputTokens ?? Math.ceil(estimatedInputTokens * 0.5);
    const estimatedCost = calculateRequestCost(model, estimatedInputTokens, outputTokens);

    // Check token limit per request
    const totalTokens = estimatedInputTokens + outputTokens;
    if (totalTokens > limits.maxTokensPerRequest) {
      return {
        allowed: false,
        reason: `Request exceeds max tokens per request (${limits.maxTokensPerRequest.toLocaleString()})`,
        estimatedCost,
      };
    }

    // Get current usage
    let currentUsage = { requests: 0, tokens: 0, cost: 0 };
    if (userId) {
      const usageRecord = await ctx.db
        .query("llmUsageDaily")
        .withIndex("by_user_date", (q: any) => q.eq("userId", userId).eq("date", date))
        .first();
      
      if (usageRecord) {
        currentUsage = {
          requests: usageRecord.requests,
          tokens: usageRecord.totalTokens,
          cost: usageRecord.totalCost,
        };
      }
    }

    // Check daily limits (skip if unlimited)
    if (limits.requestsPerDay !== -1 && currentUsage.requests >= limits.requestsPerDay) {
      return {
        allowed: false,
        reason: `Daily request limit reached (${limits.requestsPerDay})`,
        estimatedCost,
      };
    }

    if (limits.tokensPerDay !== -1 && currentUsage.tokens + totalTokens > limits.tokensPerDay) {
      return {
        allowed: false,
        reason: `Would exceed daily token limit (${limits.tokensPerDay.toLocaleString()})`,
        estimatedCost,
      };
    }

    if (limits.costLimitPerDay !== -1 && currentUsage.cost + estimatedCost > limits.costLimitPerDay) {
      return {
        allowed: false,
        reason: `Would exceed daily cost limit ($${limits.costLimitPerDay.toFixed(2)})`,
        estimatedCost,
      };
    }

    return { allowed: true, estimatedCost };
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// MUTATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Record an LLM request (called after successful completion)
 */
export const recordLlmUsage = mutation({
  args: {
    model: v.string(),
    inputTokens: v.number(),
    outputTokens: v.number(),
    cachedTokens: v.optional(v.number()),
    latencyMs: v.optional(v.number()),
    success: v.boolean(),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return; // Anonymous users still tracked but not persisted

    const date = todayISO();
    const cost = calculateRequestCost(
      args.model,
      args.inputTokens,
      args.outputTokens,
      (args.cachedTokens ?? 0) > 0
    );
    const totalTokens = args.inputTokens + args.outputTokens;
    const provider = getProviderForModel(args.model) || "openai";

    // Update daily aggregate
    const existing = await ctx.db
      .query("llmUsageDaily")
      .withIndex("by_user_date", (q: any) => q.eq("userId", userId).eq("date", date))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        requests: existing.requests + 1,
        totalTokens: existing.totalTokens + totalTokens,
        inputTokens: existing.inputTokens + args.inputTokens,
        outputTokens: existing.outputTokens + args.outputTokens,
        cachedTokens: existing.cachedTokens + (args.cachedTokens ?? 0),
        totalCost: existing.totalCost + cost,
        successCount: existing.successCount + (args.success ? 1 : 0),
        errorCount: existing.errorCount + (args.success ? 0 : 1),
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("llmUsageDaily", {
        userId,
        date,
        requests: 1,
        totalTokens,
        inputTokens: args.inputTokens,
        outputTokens: args.outputTokens,
        cachedTokens: args.cachedTokens ?? 0,
        totalCost: cost,
        successCount: args.success ? 1 : 0,
        errorCount: args.success ? 0 : 1,
        providers: { [provider]: 1 },
        models: { [args.model]: 1 },
        updatedAt: Date.now(),
      });
    }

    // Also record detailed log (for analytics)
    await ctx.db.insert("llmUsageLog", {
      userId,
      timestamp: Date.now(),
      model: args.model,
      provider,
      inputTokens: args.inputTokens,
      outputTokens: args.outputTokens,
      cachedTokens: args.cachedTokens ?? 0,
      cost,
      latencyMs: args.latencyMs,
      success: args.success,
      errorMessage: args.errorMessage,
    });
  },
});

/**
 * Get the best model for current user's tier
 */
export const getRecommendedModel = query({
  args: {
    task: v.string(),
    preferredProvider: v.optional(v.string()),
  },
  returns: v.string(),
  handler: async (ctx, { task, preferredProvider }) => {
    const userId = await getAuthUserId(ctx);
    const tier = await getUserTier(ctx, userId) as UserTier;
    
    return getBestModelForTier(
      task as LlmTask,
      tier,
      (preferredProvider as LlmProvider) || "openai"
    );
  },
});
