/**
 * Search Fusion Benchmark Harness
 *
 * Provides:
 * - Standard output schema for search runs (JudgeInput)
 * - LLM-as-judge evaluation for search quality
 * - Pass/fail scoring based on relevance criteria
 * - Saved artifacts for iterative improvement
 *
 * @module search/fusion/benchmark
 */

import { v } from "convex/values";
import { action, internalAction, internalMutation, internalQuery } from "../../../_generated/server";
import { internal, api } from "../../../_generated/api";
import type { SearchResult, SearchResponse, SearchSource } from "./types";

// ═══════════════════════════════════════════════════════════════════════════
// BENCHMARK TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Standard output schema for search runs - input to LLM judge
 */
export interface JudgeInput {
  /** Unique identifier for this evaluation */
  evaluationId: string;
  /** Original search query */
  query: string;
  /** Search mode used */
  mode: "fast" | "balanced" | "comprehensive";
  /** Sources that were queried */
  sourcesQueried: SearchSource[];
  /** Top N results for evaluation */
  results: JudgeResultItem[];
  /** Expected behavior description (optional, for ground truth) */
  expectedBehavior?: string;
  /** Ground truth URLs or titles (optional) */
  groundTruth?: string[];
  /** Timing metadata */
  timing: {
    totalMs: number;
    perSource: Record<string, number>;
  };
  /** Error summary */
  errors: Array<{ source: string; error: string }>;
}

/**
 * Simplified result item for judge evaluation
 */
export interface JudgeResultItem {
  rank: number;
  source: SearchSource;
  title: string;
  snippet: string;
  url?: string;
  contentType: string;
}

/**
 * Judge rubric - criteria for evaluation
 */
export interface JudgeRubric {
  /** Query-result relevance (0-1) */
  relevance: {
    weight: number;
    description: string;
  };
  /** Source diversity (0-1) */
  diversity: {
    weight: number;
    description: string;
  };
  /** Result freshness (0-1) */
  freshness: {
    weight: number;
    description: string;
  };
  /** Coverage of key topics (0-1) */
  coverage: {
    weight: number;
    description: string;
  };
  /** Ranking quality (0-1) */
  ranking: {
    weight: number;
    description: string;
  };
}

/**
 * Judge evaluation result
 */
export interface JudgeResult {
  /** Overall pass/fail */
  pass: boolean;
  /** Overall score (0-1) */
  overallScore: number;
  /** Per-criterion scores */
  scores: {
    relevance: number;
    diversity: number;
    freshness: number;
    coverage: number;
    ranking: number;
  };
  /** LLM reasoning */
  reasoning: string;
  /** Specific issues found */
  issues: string[];
  /** Improvement suggestions */
  suggestions: string[];
  /** Timestamp */
  evaluatedAt: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT RUBRIC
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_RUBRIC: JudgeRubric = {
  relevance: {
    weight: 0.35,
    description: "How well do the results answer the query? Are they on-topic and useful?",
  },
  diversity: {
    weight: 0.15,
    description: "Do results come from multiple sources? Is there variety in perspectives?",
  },
  freshness: {
    weight: 0.15,
    description: "Are results recent and up-to-date for time-sensitive queries?",
  },
  coverage: {
    weight: 0.20,
    description: "Do results cover the key aspects of the topic comprehensively?",
  },
  ranking: {
    weight: 0.15,
    description: "Are the most relevant results ranked highest? Is the ordering sensible?",
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Convert SearchResponse to JudgeInput format
 */
export function toJudgeInput(
  query: string,
  response: SearchResponse,
  options: {
    evaluationId?: string;
    expectedBehavior?: string;
    groundTruth?: string[];
    maxResults?: number;
  } = {}
): JudgeInput {
  const maxResults = options.maxResults || 10;

  return {
    evaluationId: options.evaluationId || `eval-${Date.now()}`,
    query,
    mode: response.mode,
    sourcesQueried: response.sourcesQueried,
    results: response.results.slice(0, maxResults).map((r, idx) => ({
      rank: idx + 1,
      source: r.source,
      title: r.title,
      snippet: r.snippet.slice(0, 300),
      url: r.url,
      contentType: r.contentType,
    })),
    expectedBehavior: options.expectedBehavior,
    groundTruth: options.groundTruth,
    timing: {
      totalMs: response.totalTimeMs,
      perSource: response.timing,
    },
    errors: response.errors || [],
  };
}

/**
 * Build the LLM judge prompt
 */
function buildJudgePrompt(input: JudgeInput, rubric: JudgeRubric): string {
  const criteriaList = Object.entries(rubric)
    .map(([key, value]) => `- **${key}** (weight: ${value.weight}): ${value.description}`)
    .join("\n");

  const resultsFormatted = input.results
    .map(r => `${r.rank}. [${r.source}] "${r.title}" - ${r.snippet}${r.url ? ` (${r.url})` : ""}`)
    .join("\n");

  const groundTruthSection = input.groundTruth?.length
    ? `\n## Ground Truth\nExpected to find: ${input.groundTruth.join(", ")}`
    : "";

  return `You are an expert search quality evaluator. Evaluate the following search results.

## Query
"${input.query}"

## Search Mode
${input.mode}

## Sources Queried
${input.sourcesQueried.join(", ")}
${groundTruthSection}
${input.expectedBehavior ? `\n## Expected Behavior\n${input.expectedBehavior}` : ""}

## Results (Top ${input.results.length})
${resultsFormatted}

## Errors
${input.errors.length > 0 ? input.errors.map(e => `- ${e.source}: ${e.error}`).join("\n") : "None"}

## Evaluation Criteria
${criteriaList}

## Instructions
Evaluate the search results against each criterion. For each criterion, provide a score from 0.0 to 1.0.
Then determine if the overall search PASSES or FAILS based on:
- PASS: Overall weighted score >= 0.7 AND no critical issues
- FAIL: Overall weighted score < 0.7 OR critical issues present

Respond in JSON format:
{
  "pass": true/false,
  "scores": {
    "relevance": 0.0-1.0,
    "diversity": 0.0-1.0,
    "freshness": 0.0-1.0,
    "coverage": 0.0-1.0,
    "ranking": 0.0-1.0
  },
  "reasoning": "Brief explanation of your evaluation",
  "issues": ["List of specific issues found"],
  "suggestions": ["List of improvement suggestions"]
}`;
}

/**
 * Parse LLM judge response
 */
function parseJudgeResponse(response: string, rubric: JudgeRubric): JudgeResult {
  try {
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Calculate overall score
    const scores = parsed.scores || {};
    let overallScore = 0;
    for (const [key, value] of Object.entries(rubric)) {
      const score = scores[key] || 0;
      overallScore += score * value.weight;
    }

    return {
      pass: parsed.pass === true && overallScore >= 0.7,
      overallScore,
      scores: {
        relevance: scores.relevance || 0,
        diversity: scores.diversity || 0,
        freshness: scores.freshness || 0,
        coverage: scores.coverage || 0,
        ranking: scores.ranking || 0,
      },
      reasoning: parsed.reasoning || "No reasoning provided",
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      evaluatedAt: Date.now(),
    };
  } catch (error) {
    console.error("[parseJudgeResponse] Failed to parse:", error);
    return {
      pass: false,
      overallScore: 0,
      scores: { relevance: 0, diversity: 0, freshness: 0, coverage: 0, ranking: 0 },
      reasoning: `Failed to parse LLM response: ${error}`,
      issues: ["Evaluation failed to complete"],
      suggestions: [],
      evaluatedAt: Date.now(),
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CONVEX FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Evaluate search quality using LLM-as-judge
 */
export const evaluateSearch = action({
  args: {
    query: v.string(),
    mode: v.optional(v.union(v.literal("fast"), v.literal("balanced"), v.literal("comprehensive"))),
    expectedBehavior: v.optional(v.string()),
    groundTruth: v.optional(v.array(v.string())),
    maxResults: v.optional(v.number()),
    model: v.optional(v.string()),
  },
  returns: v.object({
    judgeInput: v.any(),
    judgeResult: v.any(),
    searchResponse: v.any(),
  }),
  handler: async (ctx, args) => {
    const mode = args.mode || "balanced";
    console.log(`[evaluateSearch] Evaluating query: "${args.query}" in ${mode} mode`);

    // 1. Execute the search
    const searchResponse = await ctx.runAction(api.domains.search.fusion.actions.fusionSearch, {
      query: args.query,
      mode,
      skipRateLimit: true,
      skipCache: true,
    });

    // 2. Convert to JudgeInput
    const judgeInput = toJudgeInput(args.query, searchResponse, {
      expectedBehavior: args.expectedBehavior,
      groundTruth: args.groundTruth,
      maxResults: args.maxResults || 10,
    });

    // 3. Build prompt and call LLM
    const prompt = buildJudgePrompt(judgeInput, DEFAULT_RUBRIC);

    // Use OpenAI for evaluation (gpt-5.2 or fallback)
    const model = args.model || "gpt-5.2";

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: model === "gpt-5.2" ? "gpt-4.1" : model, // Use actual model name
        messages: [
          { role: "system", content: "You are an expert search quality evaluator. Respond only with valid JSON." },
          { role: "user", content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const llmResponse = data.choices?.[0]?.message?.content || "";

    // 4. Parse judge result
    const judgeResult = parseJudgeResponse(llmResponse, DEFAULT_RUBRIC);

    // 5. Save evaluation artifact
    await ctx.runMutation(internal.domains.search.fusion.benchmark.saveEvaluation, {
      evaluationId: judgeInput.evaluationId,
      query: args.query,
      mode,
      judgeInput: JSON.stringify(judgeInput),
      judgeResult: JSON.stringify(judgeResult),
      pass: judgeResult.pass,
      overallScore: judgeResult.overallScore,
    });

    console.log(`[evaluateSearch] Result: ${judgeResult.pass ? "PASS" : "FAIL"} (score: ${judgeResult.overallScore.toFixed(2)})`);

    return {
      judgeInput,
      judgeResult,
      searchResponse,
    };
  },
});

/**
 * Save evaluation artifact to database
 */
export const saveEvaluation = internalMutation({
  args: {
    evaluationId: v.string(),
    query: v.string(),
    mode: v.string(),
    judgeInput: v.string(),
    judgeResult: v.string(),
    pass: v.boolean(),
    overallScore: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("searchEvaluations", {
      evaluationId: args.evaluationId,
      query: args.query,
      mode: args.mode,
      judgeInput: args.judgeInput,
      judgeResult: args.judgeResult,
      pass: args.pass,
      overallScore: args.overallScore,
      createdAt: Date.now(),
    });
  },
});

/**
 * Get recent evaluations
 */
export const getRecentEvaluations = internalQuery({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    return await ctx.db
      .query("searchEvaluations")
      .order("desc")
      .take(limit);
  },
});

/**
 * Get evaluation statistics
 */
export const getEvaluationStats = internalQuery({
  args: {},
  returns: v.object({
    total: v.number(),
    passed: v.number(),
    failed: v.number(),
    passRate: v.number(),
    avgScore: v.number(),
  }),
  handler: async (ctx) => {
    const evals = await ctx.db.query("searchEvaluations").collect();

    const total = evals.length;
    const passed = evals.filter(e => e.pass).length;
    const failed = total - passed;
    const passRate = total > 0 ? passed / total : 0;
    const avgScore = total > 0 ? evals.reduce((sum, e) => sum + e.overallScore, 0) / total : 0;

    return { total, passed, failed, passRate, avgScore };
  },
});
