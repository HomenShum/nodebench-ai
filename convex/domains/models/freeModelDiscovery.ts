/**
 * Free Model Discovery - OpenRouter Free Model Discovery & Evaluation
 * Deep Agents 3.0
 *
 * Automatically discovers and evaluates free models from OpenRouter for autonomous operations.
 * Maintains a ranked list of capable free models with fallback chain support.
 */

import { v } from "convex/values";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../../_generated/server";
import { internal } from "../../_generated/api";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * OpenRouter model from API response
 */
interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  context_length: number;
  pricing: {
    prompt: string; // Cost per token as string (e.g., "0" for free)
    completion: string;
  };
  top_provider?: {
    is_moderated: boolean;
    max_completion_tokens?: number;
  };
  architecture?: {
    modality: string;
    tokenizer: string;
    instruct_type?: string;
  };
}

/**
 * Discovered free model with evaluation data
 */
export interface DiscoveredFreeModel {
  id: string;
  openRouterId: string;
  name: string;
  contextLength: number;
  capabilities: {
    toolUse: boolean;
    streaming: boolean;
    structuredOutputs: boolean;
    vision: boolean;
  };
  performanceScore: number; // 0-100
  reliabilityScore: number; // 0-100 (based on uptime/success rate)
  latencyAvgMs: number;
  lastEvaluated: number;
  evaluationCount: number;
  successCount: number;
  failureCount: number;
  isActive: boolean;
  rank: number; // 1 = best
}

/**
 * Evaluation result from a test run
 */
export interface ModelEvaluationResult {
  modelId: string;
  success: boolean;
  latencyMs: number;
  error?: string;
  responseQuality?: number; // 0-100
  toolCallSuccess?: boolean;
  timestamp: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const FREE_MODEL_CONFIG = {
  /** OpenRouter API endpoint for models */
  modelsApiUrl: "https://openrouter.ai/api/v1/models",

  /** Minimum context length for autonomous tasks */
  minContextLength: 8192,

  /** Model discovery refresh interval (6 hours) */
  discoveryIntervalMs: 6 * 60 * 60 * 1000,

  /** Performance evaluation interval (1 hour) */
  evaluationIntervalMs: 60 * 60 * 1000,

  /** Minimum evaluations before ranking */
  minEvaluationsForRanking: 5,

  /** Maximum models to keep in active pool */
  maxActiveModels: 10,

  /** Reliability threshold for active status */
  minReliabilityScore: 60,

  /** Test prompts for evaluation */
  testPrompts: {
    basic: "What is 2 + 2? Answer with just the number.",
    reasoning: "Explain briefly why the sky appears blue in 2-3 sentences.",
    toolUse: "I need you to help me search for information about AI research.",
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// DISCOVERY ACTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch available free models from OpenRouter API
 */
export const discoverFreeModels = internalAction({
  args: {},
  handler: async (ctx): Promise<{ discovered: number; added: number }> => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.warn("[freeModelDiscovery] OPENROUTER_API_KEY not set, skipping discovery");
      return { discovered: 0, added: 0 };
    }

    try {
      // Fetch models from OpenRouter
      const response = await fetch(FREE_MODEL_CONFIG.modelsApiUrl, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const models: OpenRouterModel[] = data.data || [];

      // Filter for free models
      const freeModels = models.filter((m) => {
        const promptCost = parseFloat(m.pricing.prompt);
        const completionCost = parseFloat(m.pricing.completion);
        return (
          promptCost === 0 &&
          completionCost === 0 &&
          m.context_length >= FREE_MODEL_CONFIG.minContextLength
        );
      });

      console.log(`[freeModelDiscovery] Found ${freeModels.length} free models with sufficient context`);

      let added = 0;

      // Process each free model
      for (const model of freeModels) {
        const existing = await ctx.runQuery(
          internal.domains.models.freeModelDiscovery.getFreeModelByOpenRouterId,
          { openRouterId: model.id }
        );

        if (!existing) {
          // Add new free model
          await ctx.runMutation(
            internal.domains.models.freeModelDiscovery.upsertFreeModel,
            {
              openRouterId: model.id,
              name: model.name,
              contextLength: model.context_length,
              capabilities: {
                // Assume basic capabilities, will be refined by evaluation
                toolUse: model.id.includes("instruct") || model.id.includes("chat"),
                streaming: true,
                structuredOutputs: false,
                vision: model.architecture?.modality?.includes("image") ?? false,
              },
            }
          );
          added++;
        }
      }

      console.log(`[freeModelDiscovery] Added ${added} new free models`);
      return { discovered: freeModels.length, added };
    } catch (error) {
      console.error("[freeModelDiscovery] Discovery failed:", error);
      throw error;
    }
  },
});

/**
 * Evaluate a specific free model's performance
 */
export const evaluateFreeModel = internalAction({
  args: {
    modelId: v.id("freeModels"),
  },
  handler: async (ctx, { modelId }): Promise<ModelEvaluationResult> => {
    const model = await ctx.runQuery(
      internal.domains.models.freeModelDiscovery.getFreeModel,
      { id: modelId }
    );

    if (!model) {
      throw new Error(`Model not found: ${modelId}`);
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY not configured");
    }

    const startTime = Date.now();
    let success = false;
    let responseQuality = 0;
    let error: string | undefined;
    let toolCallSuccess = false;

    try {
      // Test basic completion
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.OPENROUTER_HTTP_REFERER || "https://nodebench.ai",
          "X-Title": process.env.OPENROUTER_X_TITLE || "NodeBench Autonomous",
        },
        body: JSON.stringify({
          model: model.openRouterId,
          messages: [
            { role: "user", content: FREE_MODEL_CONFIG.testPrompts.basic },
          ],
          max_tokens: 50,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";

      // Check if response is reasonable
      if (content.includes("4")) {
        responseQuality = 100;
        success = true;
      } else if (content.length > 0) {
        responseQuality = 50; // Response but wrong
        success = true;
      }

      // Test tool use capability (simplified check)
      if (model.capabilities.toolUse) {
        try {
          const toolResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: model.openRouterId,
              messages: [
                { role: "user", content: FREE_MODEL_CONFIG.testPrompts.toolUse },
              ],
              tools: [
                {
                  type: "function",
                  function: {
                    name: "search",
                    description: "Search for information",
                    parameters: { type: "object", properties: { query: { type: "string" } } },
                  },
                },
              ],
              max_tokens: 100,
            }),
          });

          if (toolResponse.ok) {
            const toolData = await toolResponse.json();
            toolCallSuccess = toolData.choices?.[0]?.message?.tool_calls?.length > 0;
          }
        } catch {
          // Tool use test failed, but basic completion worked
          toolCallSuccess = false;
        }
      }
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      success = false;
    }

    const latencyMs = Date.now() - startTime;

    // Record evaluation result
    await ctx.runMutation(
      internal.domains.models.freeModelDiscovery.recordEvaluation,
      {
        modelId,
        success,
        latencyMs,
        responseQuality,
        toolCallSuccess,
        error,
      }
    );

    return {
      modelId: modelId as string,
      success,
      latencyMs,
      error,
      responseQuality,
      toolCallSuccess,
      timestamp: Date.now(),
    };
  },
});

/**
 * Evaluate all active free models and update rankings
 */
export const evaluateAllFreeModels = internalAction({
  args: {},
  handler: async (ctx): Promise<{ evaluated: number; updated: number }> => {
    const models = await ctx.runQuery(
      internal.domains.models.freeModelDiscovery.getActiveFreeModels,
      {}
    );

    let evaluated = 0;

    for (const model of models) {
      try {
        await ctx.runAction(
          internal.domains.models.freeModelDiscovery.evaluateFreeModel,
          { modelId: model._id }
        );
        evaluated++;
      } catch (e) {
        console.error(`[freeModelDiscovery] Evaluation failed for ${model.name}:`, e);
      }
    }

    // Update rankings based on evaluation results
    await ctx.runMutation(
      internal.domains.models.freeModelDiscovery.updateModelRankings,
      {}
    );

    return { evaluated, updated: evaluated };
  },
});

/**
 * Cron tick for model discovery and evaluation
 */
export const tickModelDiscovery = internalAction({
  args: {},
  handler: async (ctx): Promise<void> => {
    const lastDiscovery = await ctx.runQuery(
      internal.domains.models.freeModelDiscovery.getLastDiscoveryTime,
      {}
    );

    const now = Date.now();

    // Run discovery if needed
    if (!lastDiscovery || now - lastDiscovery > FREE_MODEL_CONFIG.discoveryIntervalMs) {
      await ctx.runAction(
        internal.domains.models.freeModelDiscovery.discoverFreeModels,
        {}
      );
    }

    // Run evaluation for models that need it
    const modelsNeedingEval = await ctx.runQuery(
      internal.domains.models.freeModelDiscovery.getModelsNeedingEvaluation,
      { intervalMs: FREE_MODEL_CONFIG.evaluationIntervalMs }
    );

    for (const model of modelsNeedingEval.slice(0, 5)) {
      // Limit to 5 per tick
      try {
        await ctx.runAction(
          internal.domains.models.freeModelDiscovery.evaluateFreeModel,
          { modelId: model._id }
        );
      } catch (e) {
        console.error(`[freeModelDiscovery] Tick evaluation failed for ${model.name}:`, e);
      }
    }

    // Update rankings
    if (modelsNeedingEval.length > 0) {
      await ctx.runMutation(
        internal.domains.models.freeModelDiscovery.updateModelRankings,
        {}
      );
    }
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get the best free model for autonomous operations
 */
export const getBestFreeModel = internalQuery({
  args: {
    requireToolUse: v.optional(v.boolean()),
  },
  handler: async (ctx, { requireToolUse }): Promise<DiscoveredFreeModel | null> => {
    let query = ctx.db
      .query("freeModels")
      .withIndex("by_rank")
      .filter((q) => q.eq(q.field("isActive"), true));

    const models = await query.collect();

    if (requireToolUse) {
      const toolCapable = models.filter((m) => m.capabilities.toolUse);
      return toolCapable[0] || null;
    }

    return models[0] || null;
  },
});

/**
 * Get fallback chain of free models (ordered by rank)
 */
export const getFreeModelFallbackChain = internalQuery({
  args: {
    maxModels: v.optional(v.number()),
  },
  handler: async (ctx, { maxModels = 5 }): Promise<DiscoveredFreeModel[]> => {
    const models = await ctx.db
      .query("freeModels")
      .withIndex("by_rank")
      .filter((q) => q.eq(q.field("isActive"), true))
      .take(maxModels);

    return models;
  },
});

/**
 * Get a specific free model by ID
 */
export const getFreeModel = internalQuery({
  args: { id: v.id("freeModels") },
  handler: async (ctx, { id }) => {
    return ctx.db.get(id);
  },
});

/**
 * Get free model by OpenRouter ID
 */
export const getFreeModelByOpenRouterId = internalQuery({
  args: { openRouterId: v.string() },
  handler: async (ctx, { openRouterId }) => {
    return ctx.db
      .query("freeModels")
      .withIndex("by_openRouterId", (q) => q.eq("openRouterId", openRouterId))
      .unique();
  },
});

/**
 * Get all active free models
 */
export const getActiveFreeModels = internalQuery({
  args: {},
  handler: async (ctx) => {
    return ctx.db
      .query("freeModels")
      .withIndex("by_rank")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

/**
 * Get models needing evaluation
 */
export const getModelsNeedingEvaluation = internalQuery({
  args: { intervalMs: v.number() },
  handler: async (ctx, { intervalMs }) => {
    const cutoff = Date.now() - intervalMs;
    const models = await ctx.db.query("freeModels").collect();

    return models.filter(
      (m) => m.isActive && (!m.lastEvaluated || m.lastEvaluated < cutoff)
    );
  },
});

/**
 * Get last discovery time
 */
export const getLastDiscoveryTime = internalQuery({
  args: {},
  handler: async (ctx): Promise<number | null> => {
    const meta = await ctx.db
      .query("freeModelMeta")
      .filter((q) => q.eq(q.field("key"), "lastDiscovery"))
      .unique();

    return meta?.value ?? null;
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// MUTATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Upsert a discovered free model
 */
export const upsertFreeModel = internalMutation({
  args: {
    openRouterId: v.string(),
    name: v.string(),
    contextLength: v.number(),
    capabilities: v.object({
      toolUse: v.boolean(),
      streaming: v.boolean(),
      structuredOutputs: v.boolean(),
      vision: v.boolean(),
    }),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("freeModels")
      .withIndex("by_openRouterId", (q) => q.eq("openRouterId", args.openRouterId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        contextLength: args.contextLength,
        capabilities: args.capabilities,
      });
      return existing._id;
    }

    return ctx.db.insert("freeModels", {
      openRouterId: args.openRouterId,
      name: args.name,
      contextLength: args.contextLength,
      capabilities: args.capabilities,
      performanceScore: 0,
      reliabilityScore: 0,
      latencyAvgMs: 0,
      lastEvaluated: 0,
      evaluationCount: 0,
      successCount: 0,
      failureCount: 0,
      isActive: true,
      rank: 999, // Start with low rank
    });
  },
});

/**
 * Record an evaluation result
 */
export const recordEvaluation = internalMutation({
  args: {
    modelId: v.id("freeModels"),
    success: v.boolean(),
    latencyMs: v.number(),
    responseQuality: v.optional(v.number()),
    toolCallSuccess: v.optional(v.boolean()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const model = await ctx.db.get(args.modelId);
    if (!model) return;

    const newEvalCount = model.evaluationCount + 1;
    const newSuccessCount = model.successCount + (args.success ? 1 : 0);
    const newFailureCount = model.failureCount + (args.success ? 0 : 1);

    // Calculate rolling averages
    const weight = Math.min(0.3, 1 / newEvalCount); // Newer results have more weight
    const newLatencyAvg = model.latencyAvgMs * (1 - weight) + args.latencyMs * weight;

    // Calculate reliability (success rate, weighted)
    const reliabilityScore = Math.round((newSuccessCount / newEvalCount) * 100);

    // Calculate performance score (combines quality, latency, reliability)
    const qualityWeight = 0.4;
    const latencyWeight = 0.3;
    const reliabilityWeight = 0.3;

    const qualityScore = args.responseQuality ?? (args.success ? 70 : 0);
    const latencyScore = Math.max(0, 100 - newLatencyAvg / 50); // 5s = 0 score
    const performanceScore = Math.round(
      qualityScore * qualityWeight +
        latencyScore * latencyWeight +
        reliabilityScore * reliabilityWeight
    );

    // Update tool use capability based on actual test
    const capabilities = { ...model.capabilities };
    if (args.toolCallSuccess !== undefined) {
      capabilities.toolUse = args.toolCallSuccess;
    }

    // Deactivate if reliability is too low after enough evaluations
    const isActive =
      newEvalCount < FREE_MODEL_CONFIG.minEvaluationsForRanking ||
      reliabilityScore >= FREE_MODEL_CONFIG.minReliabilityScore;

    await ctx.db.patch(args.modelId, {
      evaluationCount: newEvalCount,
      successCount: newSuccessCount,
      failureCount: newFailureCount,
      latencyAvgMs: newLatencyAvg,
      reliabilityScore,
      performanceScore,
      capabilities,
      isActive,
      lastEvaluated: Date.now(),
    });

    // Log evaluation for history
    await ctx.db.insert("freeModelEvaluations", {
      modelId: args.modelId,
      success: args.success,
      latencyMs: args.latencyMs,
      responseQuality: args.responseQuality,
      toolCallSuccess: args.toolCallSuccess,
      error: args.error,
      timestamp: Date.now(),
    });
  },
});

/**
 * Update model rankings based on performance
 */
export const updateModelRankings = internalMutation({
  args: {},
  handler: async (ctx) => {
    const models = await ctx.db
      .query("freeModels")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Sort by performance score (descending)
    const sorted = models.sort((a, b) => b.performanceScore - a.performanceScore);

    // Update ranks
    for (let i = 0; i < sorted.length; i++) {
      await ctx.db.patch(sorted[i]._id, { rank: i + 1 });
    }

    // Update last discovery time
    const meta = await ctx.db
      .query("freeModelMeta")
      .filter((q) => q.eq(q.field("key"), "lastRankingUpdate"))
      .unique();

    if (meta) {
      await ctx.db.patch(meta._id, { value: Date.now() });
    } else {
      await ctx.db.insert("freeModelMeta", {
        key: "lastRankingUpdate",
        value: Date.now(),
      });
    }
  },
});

/**
 * Update discovery timestamp
 */
export const updateDiscoveryTime = internalMutation({
  args: {},
  handler: async (ctx) => {
    const meta = await ctx.db
      .query("freeModelMeta")
      .filter((q) => q.eq(q.field("key"), "lastDiscovery"))
      .unique();

    if (meta) {
      await ctx.db.patch(meta._id, { value: Date.now() });
    } else {
      await ctx.db.insert("freeModelMeta", {
        key: "lastDiscovery",
        value: Date.now(),
      });
    }
  },
});
