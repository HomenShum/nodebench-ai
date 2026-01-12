/**
 * Autonomous Model Resolver - Free Model Selection for Autonomous Operations
 * Deep Agents 3.0
 *
 * Provides model selection and fallback chain specifically for autonomous agents.
 * Uses free models by default with intelligent fallback to paid models if needed.
 */

import { v } from "convex/values";
import {
  internalAction,
  internalQuery,
  internalMutation,
} from "../../_generated/server";
import { internal } from "../../_generated/api";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Autonomous model selection configuration
 */
export const AUTONOMOUS_MODEL_CONFIG = {
  /** Use free models for autonomous operations by default */
  preferFreeModels: true,

  /** Maximum retries before falling back to paid model */
  maxFreeModelRetries: 3,

  /** Known good free models (hardcoded fallback if discovery fails) */
  knownFreeModels: [
    "xiaomi/mimo-v2-flash:free",
    "google/gemma-2-9b-it:free",
    "meta-llama/llama-3.2-3b-instruct:free",
    "huggingfaceh4/zephyr-7b-beta:free",
  ] as const,

  /** Paid model fallback chain (used only if all free models fail) */
  paidFallbackChain: [
    "gemini-3-flash",      // Cheapest good model
    "deepseek-v3.2",       // Very cheap
    "qwen3-235b",          // Cheap
    "claude-haiku-4.5",    // Slightly more expensive but reliable
  ] as const,

  /** Task type to model requirements mapping */
  taskRequirements: {
    research: { minContext: 16000, toolUse: false },
    synthesis: { minContext: 32000, toolUse: false },
    publishing: { minContext: 8000, toolUse: false },
    validation: { minContext: 16000, toolUse: false },
    agentLoop: { minContext: 32000, toolUse: true },
  },

  /** Timeout for model calls (ms) */
  modelTimeoutMs: 60_000,

  /** Rate limit tracking window (ms) */
  rateLimitWindowMs: 60_000,

  /** Max requests per minute for free models */
  freeModelRateLimit: 20,
} as const;

export type AutonomousTaskType = keyof typeof AUTONOMOUS_MODEL_CONFIG.taskRequirements;

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ModelSelectionResult {
  modelId: string;
  provider: "openrouter" | "native";
  isFree: boolean;
  fallbackLevel: number; // 0 = primary, 1+ = fallback
}

export interface AutonomousModelUsage {
  modelId: string;
  taskType: AutonomousTaskType;
  success: boolean;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
  cost: number;
  error?: string;
  timestamp: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// MODEL SELECTION QUERIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get the best model for an autonomous task
 */
export const selectModelForTask = internalQuery({
  args: {
    taskType: v.string(),
    requireToolUse: v.optional(v.boolean()),
  },
  handler: async (ctx, { taskType, requireToolUse }): Promise<ModelSelectionResult> => {
    const requirements = AUTONOMOUS_MODEL_CONFIG.taskRequirements[
      taskType as AutonomousTaskType
    ] ?? { minContext: 8000, toolUse: false };

    const needsToolUse = requireToolUse ?? requirements.toolUse;

    // Try to get best free model from discovery system
    if (AUTONOMOUS_MODEL_CONFIG.preferFreeModels) {
      const bestFree = await ctx.db
        .query("freeModels")
        .withIndex("by_rank")
        .filter((q) => q.eq(q.field("isActive"), true))
        .first();

      if (bestFree) {
        // Check if it meets requirements
        if (
          bestFree.contextLength >= requirements.minContext &&
          (!needsToolUse || bestFree.capabilities.toolUse)
        ) {
          return {
            modelId: bestFree.openRouterId,
            provider: "openrouter",
            isFree: true,
            fallbackLevel: 0,
          };
        }
      }

      // Fall back to known free models
      return {
        modelId: AUTONOMOUS_MODEL_CONFIG.knownFreeModels[0],
        provider: "openrouter",
        isFree: true,
        fallbackLevel: 1,
      };
    }

    // Default to paid fallback
    return {
      modelId: AUTONOMOUS_MODEL_CONFIG.paidFallbackChain[0],
      provider: "native",
      isFree: false,
      fallbackLevel: 0,
    };
  },
});

/**
 * Get the full fallback chain for autonomous operations
 */
export const getAutonomousFallbackChain = internalQuery({
  args: {
    taskType: v.string(),
  },
  handler: async (ctx, { taskType }): Promise<ModelSelectionResult[]> => {
    const chain: ModelSelectionResult[] = [];

    // Add discovered free models first
    const freeModels = await ctx.db
      .query("freeModels")
      .withIndex("by_rank")
      .filter((q) => q.eq(q.field("isActive"), true))
      .take(5);

    for (let i = 0; i < freeModels.length; i++) {
      chain.push({
        modelId: freeModels[i].openRouterId,
        provider: "openrouter",
        isFree: true,
        fallbackLevel: i,
      });
    }

    // Add known free models as backup
    for (const knownFree of AUTONOMOUS_MODEL_CONFIG.knownFreeModels) {
      if (!chain.some((m) => m.modelId === knownFree)) {
        chain.push({
          modelId: knownFree,
          provider: "openrouter",
          isFree: true,
          fallbackLevel: chain.length,
        });
      }
    }

    // Add paid fallback chain last
    for (const paid of AUTONOMOUS_MODEL_CONFIG.paidFallbackChain) {
      chain.push({
        modelId: paid,
        provider: "native",
        isFree: false,
        fallbackLevel: chain.length,
      });
    }

    return chain;
  },
});

/**
 * Get autonomous model usage statistics
 */
export const getAutonomousModelStats = internalQuery({
  args: {
    hours: v.optional(v.number()),
  },
  handler: async (ctx, { hours = 24 }) => {
    const since = Date.now() - hours * 60 * 60 * 1000;

    const usages = await ctx.db
      .query("autonomousModelUsage")
      .withIndex("by_timestamp")
      .filter((q) => q.gte(q.field("timestamp"), since))
      .collect();

    const stats = {
      totalCalls: usages.length,
      successCalls: usages.filter((u) => u.success).length,
      failedCalls: usages.filter((u) => !u.success).length,
      totalCost: usages.reduce((sum, u) => sum + u.cost, 0),
      freeCalls: usages.filter((u) => u.cost === 0).length,
      paidCalls: usages.filter((u) => u.cost > 0).length,
      avgLatencyMs:
        usages.length > 0
          ? usages.reduce((sum, u) => sum + u.latencyMs, 0) / usages.length
          : 0,
      byModel: {} as Record<string, { calls: number; success: number; cost: number }>,
      byTaskType: {} as Record<string, { calls: number; success: number; cost: number }>,
    };

    // Group by model
    for (const usage of usages) {
      if (!stats.byModel[usage.modelId]) {
        stats.byModel[usage.modelId] = { calls: 0, success: 0, cost: 0 };
      }
      stats.byModel[usage.modelId].calls++;
      if (usage.success) stats.byModel[usage.modelId].success++;
      stats.byModel[usage.modelId].cost += usage.cost;

      if (!stats.byTaskType[usage.taskType]) {
        stats.byTaskType[usage.taskType] = { calls: 0, success: 0, cost: 0 };
      }
      stats.byTaskType[usage.taskType].calls++;
      if (usage.success) stats.byTaskType[usage.taskType].success++;
      stats.byTaskType[usage.taskType].cost += usage.cost;
    }

    return stats;
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// MODEL EXECUTION ACTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Execute a model call with automatic fallback
 */
export const executeWithFallback = internalAction({
  args: {
    taskType: v.string(),
    messages: v.array(
      v.object({
        role: v.union(v.literal("system"), v.literal("user"), v.literal("assistant")),
        content: v.string(),
      })
    ),
    maxTokens: v.optional(v.number()),
    temperature: v.optional(v.number()),
  },
  handler: async (
    ctx,
    { taskType, messages, maxTokens = 2000, temperature = 0.7 }
  ): Promise<{
    content: string;
    modelUsed: string;
    isFree: boolean;
    latencyMs: number;
    fallbackLevel: number;
  }> => {
    const fallbackChain = await ctx.runQuery(
      internal.domains.models.autonomousModelResolver.getAutonomousFallbackChain,
      { taskType }
    );

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY not configured for autonomous operations");
    }

    let lastError: Error | null = null;

    for (const model of fallbackChain) {
      const startTime = Date.now();

      try {
        let content: string;

        if (model.provider === "openrouter") {
          // Use OpenRouter API directly
          const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
              "HTTP-Referer": process.env.OPENROUTER_HTTP_REFERER || "https://nodebench.ai",
              "X-Title": process.env.OPENROUTER_X_TITLE || "NodeBench Autonomous",
            },
            body: JSON.stringify({
              model: model.modelId,
              messages: messages.map((m) => ({ role: m.role, content: m.content })),
              max_tokens: maxTokens,
              temperature,
            }),
            signal: AbortSignal.timeout(AUTONOMOUS_MODEL_CONFIG.modelTimeoutMs),
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
          }

          const data = await response.json();
          content = data.choices?.[0]?.message?.content || "";

          if (!content) {
            throw new Error("Empty response from model");
          }
        } else {
          // Use native provider via AI SDK
          // This would require importing the model resolver, but for autonomous
          // operations we prefer OpenRouter for cost tracking
          throw new Error("Native provider fallback not implemented for autonomous");
        }

        const latencyMs = Date.now() - startTime;

        // Record successful usage
        await ctx.runMutation(
          internal.domains.models.autonomousModelResolver.recordModelUsage,
          {
            modelId: model.modelId,
            taskType: taskType as AutonomousTaskType,
            success: true,
            latencyMs,
            cost: model.isFree ? 0 : 0.001, // Estimate for paid models
          }
        );

        return {
          content,
          modelUsed: model.modelId,
          isFree: model.isFree,
          latencyMs,
          fallbackLevel: model.fallbackLevel,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const latencyMs = Date.now() - startTime;

        console.warn(
          `[autonomousModelResolver] Model ${model.modelId} failed:`,
          lastError.message
        );

        // Record failed usage
        await ctx.runMutation(
          internal.domains.models.autonomousModelResolver.recordModelUsage,
          {
            modelId: model.modelId,
            taskType: taskType as AutonomousTaskType,
            success: false,
            latencyMs,
            cost: 0,
            error: lastError.message,
          }
        );

        // Continue to next model in fallback chain
        continue;
      }
    }

    throw new Error(
      `All models in fallback chain failed. Last error: ${lastError?.message}`
    );
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// USAGE TRACKING MUTATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Record model usage for analytics
 */
export const recordModelUsage = internalMutation({
  args: {
    modelId: v.string(),
    taskType: v.string(),
    success: v.boolean(),
    latencyMs: v.number(),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    cost: v.number(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("autonomousModelUsage", {
      modelId: args.modelId,
      taskType: args.taskType as AutonomousTaskType,
      success: args.success,
      latencyMs: args.latencyMs,
      inputTokens: args.inputTokens,
      outputTokens: args.outputTokens,
      cost: args.cost,
      error: args.error,
      timestamp: Date.now(),
    });
  },
});

/**
 * Cleanup old usage records (keep 7 days)
 */
export const cleanupOldUsageRecords = internalMutation({
  args: {},
  handler: async (ctx): Promise<number> => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const oldRecords = await ctx.db
      .query("autonomousModelUsage")
      .withIndex("by_timestamp")
      .filter((q) => q.lt(q.field("timestamp"), cutoff))
      .take(500);

    for (const record of oldRecords) {
      await ctx.db.delete(record._id);
    }

    return oldRecords.length;
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Create OpenRouter LanguageModel
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create a LanguageModel instance for an OpenRouter model
 * Use this when you need AI SDK compatibility
 */
export function createOpenRouterModel(modelId: string): LanguageModel {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY not configured");
  }

  const openrouter = createOpenAI({
    apiKey,
    baseURL: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
    headers: {
      "HTTP-Referer": process.env.OPENROUTER_HTTP_REFERER || "https://nodebench.ai",
      "X-Title": process.env.OPENROUTER_X_TITLE || "NodeBench Autonomous",
    },
  });

  return openrouter.chat(modelId);
}

/**
 * Get a free model as LanguageModel (for AI SDK usage)
 */
export async function getFreeLanguageModel(
  ctx: { runQuery: typeof internalQuery.prototype.handler },
  taskType: AutonomousTaskType
): Promise<LanguageModel> {
  // This is a synchronous helper - for async selection use the query directly
  // Fall back to known good free model
  return createOpenRouterModel(AUTONOMOUS_MODEL_CONFIG.knownFreeModels[0]);
}
