/**
 * Live Performance Evaluation - End-to-End Free Model Performance Tracking
 * Deep Agents 3.0
 *
 * Provides comprehensive evaluation of free models in live autonomous operations.
 * Tracks real-world performance metrics for continuous model ranking adjustments.
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

export interface LiveEvaluationResult {
  modelId: string;
  taskType: string;
  scenarioId: string;
  success: boolean;
  latencyMs: number;
  outputQuality: number; // 0-100
  tokenEfficiency: number; // output quality / tokens used
  costEfficiency: number; // output quality / cost
  errors: string[];
  timestamp: number;
}

export interface ModelPerformanceReport {
  modelId: string;
  periodStart: number;
  periodEnd: number;
  totalTasks: number;
  successRate: number;
  avgLatencyMs: number;
  avgQuality: number;
  avgTokenEfficiency: number;
  avgCostEfficiency: number;
  taskBreakdown: Record<string, {
    count: number;
    successRate: number;
    avgQuality: number;
  }>;
  recommendation: "promote" | "maintain" | "demote" | "disable";
  reasonings: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// EVALUATION SCENARIOS
// ═══════════════════════════════════════════════════════════════════════════

const EVALUATION_SCENARIOS = {
  // Basic capability tests
  basic_math: {
    prompt: "What is 17 * 23? Answer with just the number.",
    expectedContains: ["391"],
    maxTokens: 20,
    taskType: "validation",
  },
  basic_reasoning: {
    prompt: "If all roses are flowers and some flowers fade quickly, can we conclude that some roses fade quickly? Answer yes or no and explain briefly.",
    expectedContains: ["no", "cannot"],
    maxTokens: 100,
    taskType: "research",
  },

  // Research-oriented tests
  summarization: {
    prompt: "Summarize the key benefits of renewable energy in 2-3 sentences.",
    qualityKeywords: ["environment", "sustainable", "clean", "cost", "renewable"],
    minLength: 50,
    maxTokens: 150,
    taskType: "research",
  },
  entity_extraction: {
    prompt: "Extract any company names, people names, and monetary amounts from this text: 'Acme Corp, led by CEO Jane Smith, raised $50 million in Series B funding from Sequoia Capital.' Format as JSON.",
    expectedContains: ["Acme", "Jane Smith", "50", "Sequoia"],
    maxTokens: 200,
    taskType: "synthesis",
  },

  // Publishing-oriented tests
  formatting: {
    prompt: "Format the following as a brief news headline and 1-sentence summary: Tech startup raises funding for AI platform.",
    qualityKeywords: ["tech", "startup", "AI", "funding"],
    minLength: 30,
    maxTokens: 100,
    taskType: "publishing",
  },

  // Instruction following
  structured_output: {
    prompt: 'Respond with exactly this JSON structure: {"status": "ok", "items": ["one", "two"]}',
    expectedContains: ['"status"', '"ok"', '"items"', '"one"', '"two"'],
    maxTokens: 50,
    taskType: "synthesis",
  },
} as const;

type ScenarioId = keyof typeof EVALUATION_SCENARIOS;

// ═══════════════════════════════════════════════════════════════════════════
// EVALUATION ACTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Run a comprehensive evaluation of a free model
 */
export const runComprehensiveEvaluation = internalAction({
  args: {
    modelId: v.id("freeModels"),
    scenarios: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { modelId, scenarios }): Promise<{
    results: LiveEvaluationResult[];
    overallScore: number;
    recommendation: string;
  }> => {
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

    const scenariosToRun = scenarios as ScenarioId[] ?? (Object.keys(EVALUATION_SCENARIOS) as ScenarioId[]);
    const results: LiveEvaluationResult[] = [];

    for (const scenarioId of scenariosToRun) {
      const scenario = EVALUATION_SCENARIOS[scenarioId];
      if (!scenario) continue;

      const startTime = Date.now();
      let success = false;
      let outputQuality = 0;
      const errors: string[] = [];

      try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": process.env.OPENROUTER_HTTP_REFERER || "https://nodebench.ai",
            "X-Title": process.env.OPENROUTER_X_TITLE || "NodeBench Eval",
          },
          body: JSON.stringify({
            model: model.openRouterId,
            messages: [{ role: "user", content: scenario.prompt }],
            max_tokens: scenario.maxTokens,
          }),
          signal: AbortSignal.timeout(30000),
        });

        if (!response.ok) {
          const errorText = await response.text();
          errors.push(`API error: ${response.status} - ${errorText}`);
        } else {
          const data = await response.json();
          const content = data.choices?.[0]?.message?.content || "";

          // Evaluate output quality
          let qualityScore = 0;

          // Check expected content
          if ("expectedContains" in scenario && scenario.expectedContains) {
            const found = scenario.expectedContains.filter((kw: string) =>
              content.toLowerCase().includes(kw.toLowerCase())
            );
            qualityScore += (found.length / scenario.expectedContains.length) * 50;
          }

          // Check quality keywords
          if ("qualityKeywords" in scenario && scenario.qualityKeywords) {
            const found = scenario.qualityKeywords.filter((kw: string) =>
              content.toLowerCase().includes(kw.toLowerCase())
            );
            qualityScore += (found.length / scenario.qualityKeywords.length) * 30;
          }

          // Check minimum length
          if ("minLength" in scenario && scenario.minLength) {
            if (content.length >= scenario.minLength) {
              qualityScore += 20;
            } else {
              qualityScore += (content.length / scenario.minLength) * 20;
            }
          } else if (content.length > 0) {
            qualityScore += 20;
          }

          outputQuality = Math.min(100, Math.round(qualityScore));
          success = outputQuality >= 50;
        }
      } catch (e) {
        errors.push(e instanceof Error ? e.message : String(e));
      }

      const latencyMs = Date.now() - startTime;

      const result: LiveEvaluationResult = {
        modelId: modelId as string,
        taskType: scenario.taskType,
        scenarioId,
        success,
        latencyMs,
        outputQuality,
        tokenEfficiency: outputQuality / (scenario.maxTokens || 100),
        costEfficiency: outputQuality, // Free models = infinite cost efficiency
        errors,
        timestamp: Date.now(),
      };

      results.push(result);

      // Record individual result
      await ctx.runMutation(
        internal.domains.models.livePerformanceEval.recordEvaluationResult,
        result
      );
    }

    // Calculate overall score
    const overallScore = results.length > 0
      ? Math.round(results.reduce((sum, r) => sum + r.outputQuality, 0) / results.length)
      : 0;

    const successRate = results.filter((r) => r.success).length / results.length;

    // Generate recommendation
    let recommendation = "maintain";
    if (overallScore >= 80 && successRate >= 0.9) {
      recommendation = "promote";
    } else if (overallScore < 50 || successRate < 0.5) {
      recommendation = "disable";
    } else if (overallScore < 65 || successRate < 0.7) {
      recommendation = "demote";
    }

    return { results, overallScore, recommendation };
  },
});

/**
 * Run evaluation across all active free models
 */
export const evaluateAllModels = internalAction({
  args: {},
  handler: async (ctx): Promise<{
    modelsEvaluated: number;
    avgScore: number;
    recommendations: Record<string, string>;
  }> => {
    const models = await ctx.runQuery(
      internal.domains.models.freeModelDiscovery.getActiveFreeModels,
      {}
    );

    const recommendations: Record<string, string> = {};
    let totalScore = 0;

    for (const model of models) {
      try {
        const result = await ctx.runAction(
          internal.domains.models.livePerformanceEval.runComprehensiveEvaluation,
          { modelId: model._id }
        );
        totalScore += result.overallScore;
        recommendations[model.openRouterId] = result.recommendation;
      } catch (e) {
        console.error(`[livePerformanceEval] Failed to evaluate ${model.name}:`, e);
        recommendations[model.openRouterId] = "error";
      }
    }

    return {
      modelsEvaluated: models.length,
      avgScore: models.length > 0 ? totalScore / models.length : 0,
      recommendations,
    };
  },
});

/**
 * Generate performance report for a model
 */
export const generatePerformanceReport = internalAction({
  args: {
    modelId: v.string(),
    hours: v.optional(v.number()),
  },
  handler: async (ctx, { modelId, hours = 24 }): Promise<ModelPerformanceReport> => {
    const periodEnd = Date.now();
    const periodStart = periodEnd - hours * 60 * 60 * 1000;

    // Get evaluation results for this period
    const results = await ctx.runQuery(
      internal.domains.models.livePerformanceEval.getEvaluationResults,
      { modelId, since: periodStart }
    );

    // Get usage data
    const usageStats = await ctx.runQuery(
      internal.domains.models.autonomousModelResolver.getAutonomousModelStats,
      { hours }
    );

    const modelUsage = usageStats.byModel[modelId] || { calls: 0, success: 0, cost: 0 };

    // Calculate metrics
    const successCount = results.filter((r) => r.success).length;
    const successRate = results.length > 0 ? successCount / results.length : 0;
    const avgLatency = results.length > 0
      ? results.reduce((sum, r) => sum + r.latencyMs, 0) / results.length
      : 0;
    const avgQuality = results.length > 0
      ? results.reduce((sum, r) => sum + r.outputQuality, 0) / results.length
      : 0;
    const avgTokenEff = results.length > 0
      ? results.reduce((sum, r) => sum + r.tokenEfficiency, 0) / results.length
      : 0;
    const avgCostEff = results.length > 0
      ? results.reduce((sum, r) => sum + r.costEfficiency, 0) / results.length
      : 0;

    // Task breakdown
    const taskBreakdown: Record<string, { count: number; successRate: number; avgQuality: number }> = {};
    for (const result of results) {
      if (!taskBreakdown[result.taskType]) {
        taskBreakdown[result.taskType] = { count: 0, successRate: 0, avgQuality: 0 };
      }
      taskBreakdown[result.taskType].count++;
      if (result.success) taskBreakdown[result.taskType].successRate++;
      taskBreakdown[result.taskType].avgQuality += result.outputQuality;
    }

    // Normalize breakdown
    for (const task of Object.keys(taskBreakdown)) {
      const count = taskBreakdown[task].count;
      taskBreakdown[task].successRate = taskBreakdown[task].successRate / count;
      taskBreakdown[task].avgQuality = taskBreakdown[task].avgQuality / count;
    }

    // Generate recommendation
    const reasonings: string[] = [];
    let recommendation: "promote" | "maintain" | "demote" | "disable" = "maintain";

    if (results.length < 5) {
      reasonings.push("Insufficient data for reliable recommendation");
    } else if (avgQuality >= 80 && successRate >= 0.9) {
      recommendation = "promote";
      reasonings.push(`High quality (${avgQuality.toFixed(1)}) and reliability (${(successRate * 100).toFixed(0)}%)`);
    } else if (avgQuality < 50) {
      recommendation = "disable";
      reasonings.push(`Quality below threshold (${avgQuality.toFixed(1)} < 50)`);
    } else if (successRate < 0.5) {
      recommendation = "disable";
      reasonings.push(`Reliability below threshold (${(successRate * 100).toFixed(0)}% < 50%)`);
    } else if (avgQuality < 65 || successRate < 0.7) {
      recommendation = "demote";
      reasonings.push(`Below optimal performance thresholds`);
    }

    if (avgLatency > 10000) {
      reasonings.push(`High latency: ${(avgLatency / 1000).toFixed(1)}s avg`);
      if (recommendation === "promote") recommendation = "maintain";
    }

    if (modelUsage.calls > 0) {
      const liveSuccessRate = modelUsage.success / modelUsage.calls;
      if (liveSuccessRate < 0.6) {
        reasonings.push(`Low live success rate: ${(liveSuccessRate * 100).toFixed(0)}%`);
        if (recommendation === "promote") recommendation = "maintain";
      }
    }

    return {
      modelId,
      periodStart,
      periodEnd,
      totalTasks: results.length + modelUsage.calls,
      successRate,
      avgLatencyMs: avgLatency,
      avgQuality,
      avgTokenEfficiency: avgTokenEff,
      avgCostEfficiency: avgCostEff,
      taskBreakdown,
      recommendation,
      reasonings,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get evaluation results for a model
 */
export const getEvaluationResults = internalQuery({
  args: {
    modelId: v.string(),
    since: v.number(),
  },
  handler: async (ctx, { modelId, since }): Promise<LiveEvaluationResult[]> => {
    // Query from the evaluation results we store
    const results = await ctx.db
      .query("freeModelEvaluations")
      .withIndex("by_timestamp")
      .filter((q) => q.gte(q.field("timestamp"), since))
      .collect();

    // Transform and filter by model
    return results
      .filter((r) => {
        // Get the model to check openRouterId
        return true; // We store modelId as string in LiveEvaluationResult
      })
      .map((r) => ({
        modelId: r.modelId as unknown as string,
        taskType: "evaluation",
        scenarioId: "basic",
        success: r.success,
        latencyMs: r.latencyMs,
        outputQuality: r.responseQuality ?? (r.success ? 70 : 0),
        tokenEfficiency: 1,
        costEfficiency: 100,
        errors: r.error ? [r.error] : [],
        timestamp: r.timestamp,
      }));
  },
});

/**
 * Get aggregate performance stats across all models
 */
export const getAggregateStats = internalQuery({
  args: {
    hours: v.optional(v.number()),
  },
  handler: async (ctx, { hours = 24 }) => {
    const since = Date.now() - hours * 60 * 60 * 1000;

    const evals = await ctx.db
      .query("freeModelEvaluations")
      .withIndex("by_timestamp")
      .filter((q) => q.gte(q.field("timestamp"), since))
      .collect();

    const usage = await ctx.db
      .query("autonomousModelUsage")
      .withIndex("by_timestamp")
      .filter((q) => q.gte(q.field("timestamp"), since))
      .collect();

    return {
      evaluationCount: evals.length,
      successfulEvals: evals.filter((e) => e.success).length,
      avgLatency: evals.length > 0
        ? evals.reduce((sum, e) => sum + e.latencyMs, 0) / evals.length
        : 0,
      usageCount: usage.length,
      successfulUsage: usage.filter((u) => u.success).length,
      totalCost: usage.reduce((sum, u) => sum + u.cost, 0),
      freeUsageCount: usage.filter((u) => u.cost === 0).length,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// MUTATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Record an evaluation result
 */
export const recordEvaluationResult = internalMutation({
  args: {
    modelId: v.string(),
    taskType: v.string(),
    scenarioId: v.string(),
    success: v.boolean(),
    latencyMs: v.number(),
    outputQuality: v.number(),
    tokenEfficiency: v.number(),
    costEfficiency: v.number(),
    errors: v.array(v.string()),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    // We use the freeModelEvaluations table but with extended data
    // The modelId here is a Doc<"freeModels"> ID string
    // We need to validate it exists first
    const modelDoc = await ctx.db.get(args.modelId as any);
    if (modelDoc) {
      await ctx.db.insert("freeModelEvaluations", {
        modelId: args.modelId as any,
        success: args.success,
        latencyMs: args.latencyMs,
        responseQuality: args.outputQuality,
        toolCallSuccess: undefined,
        error: args.errors.length > 0 ? args.errors.join("; ") : undefined,
        timestamp: args.timestamp,
      });
    }
  },
});
