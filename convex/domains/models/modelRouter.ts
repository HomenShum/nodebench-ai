"use node";

/**
 * Model Router — Unified Inference Layer (Action)
 *
 * Single entrypoint for ALL model calls in the system.
 * Enforces: routing by task/cost/quality tier, caching, token budgets per agent,
 * model version pinning for repro packs, rate limiting, and audit logging.
 *
 * Queries and mutations live in modelRouterQueries.ts (cannot be in "use node" files).
 *
 * Architecture upgrade: turns "we use models" into "we operate an inference layer."
 */

import { v } from "convex/values";
import { internalAction } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { generateText } from "ai";
import { getLanguageModelSafe } from "../agents/mcp_tools/models";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type TaskTier = "free" | "cheap" | "standard" | "premium";
export type TaskCategory =
  | "research"
  | "synthesis"
  | "publishing"
  | "validation"
  | "judge"
  | "agent_loop"
  | "content_generation"
  | "entity_extraction"
  | "translation"
  | "summarization";

export interface RouteRequest {
  /** Task category for routing decisions */
  taskCategory: TaskCategory;
  /** Quality tier (free→premium) */
  tier?: TaskTier;
  /** System prompt */
  systemPrompt: string;
  /** User message(s) */
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  /** Max output tokens */
  maxTokens?: number;
  /** Temperature (0-1) */
  temperature?: number;
  /** Calling agent ID (for budget enforcement) */
  agentId?: string;
  /** Pin to specific model (for repro packs) */
  pinnedModel?: string;
  /** Cache key for response caching (omit to disable caching) */
  cacheKey?: string;
  /** Cache TTL in ms (default: 5 min) */
  cacheTtlMs?: number;
  /** Require specific capabilities */
  requiredCapabilities?: {
    toolUse?: boolean;
    vision?: boolean;
    structuredOutputs?: boolean;
    minContext?: number;
  };
}

export interface RouteResult {
  /** Generated text */
  text: string;
  /** Model used */
  modelId: string;
  /** Whether this was a free model */
  isFree: boolean;
  /** Token usage */
  inputTokens: number;
  outputTokens: number;
  /** Cost in USD */
  costUsd: number;
  /** Latency in ms */
  latencyMs: number;
  /** Whether result came from cache */
  fromCache: boolean;
  /** Routing decision metadata */
  routing: {
    requestedTier: TaskTier;
    actualTier: TaskTier;
    taskCategory: TaskCategory;
    fallbacksUsed: number;
    pinnedModel: string | null;
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// MODEL TIERS — which models serve which tier
// ═══════════════════════════════════════════════════════════════════════════

const TIER_MODELS: Record<TaskTier, string[]> = {
  free: [
    "qwen3-coder-free",
    "step-3.5-flash-free",
    "openai-gpt-oss-120b-free",
    "arcee-trinity-large-free",
    "nemotron-3-nano-30b-free",
    "llama-3.3-70b-free",
  ],
  cheap: [
    "glm-4.7-flash",       // $0.07/M
    "gemini-3-flash",       // $0.50/M
    "claude-haiku-4.5",     // $1.00/M
  ],
  standard: [
    "gemini-3-flash",       // $0.50/M
    "claude-haiku-4.5",     // $1.00/M
    "gpt-5-mini",           // $0.25/M input
    "claude-sonnet-4.5",    // $3.00/M
  ],
  premium: [
    "claude-sonnet-4.5",    // $3.00/M
    "claude-opus-4.6",      // $5.00/M
    "gpt-5",                // $1.25/M
    "gpt-5.2",              // $1.75/M
    "gemini-3-pro",         // $2.00/M
  ],
};

/** Cost per million tokens (input/output) for budget tracking */
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "qwen3-coder-free": { input: 0, output: 0 },
  "step-3.5-flash-free": { input: 0, output: 0 },
  "openai-gpt-oss-120b-free": { input: 0, output: 0 },
  "arcee-trinity-large-free": { input: 0, output: 0 },
  "nemotron-3-nano-30b-free": { input: 0, output: 0 },
  "llama-3.3-70b-free": { input: 0, output: 0 },
  "glm-4.7-flash": { input: 0.07, output: 0.07 },
  "gemini-3-flash": { input: 0.50, output: 3.00 },
  "claude-haiku-4.5": { input: 1.00, output: 5.00 },
  "gpt-5-mini": { input: 0.25, output: 2.00 },
  "claude-sonnet-4.5": { input: 3.00, output: 15.00 },
  "claude-opus-4.6": { input: 5.00, output: 25.00 },
  "gpt-5": { input: 1.25, output: 10.00 },
  "gpt-5.2": { input: 1.75, output: 14.00 },
  "gemini-3-pro": { input: 2.00, output: 12.00 },
};

/** Task → default tier mapping */
const TASK_DEFAULT_TIER: Record<TaskCategory, TaskTier> = {
  research: "free",
  synthesis: "cheap",
  publishing: "cheap",
  validation: "free",
  judge: "free",
  agent_loop: "cheap",
  content_generation: "standard",
  entity_extraction: "free",
  translation: "cheap",
  summarization: "free",
};

// ═══════════════════════════════════════════════════════════════════════════
// COST CALCULATION
// ═══════════════════════════════════════════════════════════════════════════

function calculateCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = MODEL_PRICING[modelId] ?? { input: 1.0, output: 5.0 };
  return (
    (inputTokens / 1_000_000) * pricing.input +
    (outputTokens / 1_000_000) * pricing.output
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// IN-MEMORY RESPONSE CACHE (per-process, ephemeral)
// ═══════════════════════════════════════════════════════════════════════════

interface CacheEntry {
  text: string;
  modelId: string;
  expiresAt: number;
  inputTokens: number;
  outputTokens: number;
}

const responseCache = new Map<string, CacheEntry>();
const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCached(key: string): CacheEntry | null {
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    responseCache.delete(key);
    return null;
  }
  return entry;
}

function setCache(key: string, entry: CacheEntry): void {
  // Evict old entries if cache grows too large (max 200 entries)
  if (responseCache.size > 200) {
    const now = Date.now();
    for (const [k, v] of responseCache) {
      if (now > v.expiresAt) responseCache.delete(k);
    }
    // If still too large, evict oldest
    if (responseCache.size > 200) {
      const oldest = responseCache.keys().next().value;
      if (oldest) responseCache.delete(oldest);
    }
  }
  responseCache.set(key, entry);
}

// ═══════════════════════════════════════════════════════════════════════════
// ROUTE — Main entrypoint
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Route a model call through the unified inference layer.
 * This is the ONLY entrypoint that should be used for model calls.
 *
 * Handles: tier-based model selection, caching, budget enforcement,
 * version pinning, fallback chains, and audit logging.
 */
export const route = internalAction({
  args: {
    taskCategory: v.string(),
    tier: v.optional(v.string()),
    systemPrompt: v.string(),
    messages: v.array(
      v.object({
        role: v.union(
          v.literal("user"),
          v.literal("assistant"),
          v.literal("system")
        ),
        content: v.string(),
      })
    ),
    maxTokens: v.optional(v.number()),
    temperature: v.optional(v.number()),
    agentId: v.optional(v.string()),
    pinnedModel: v.optional(v.string()),
    cacheKey: v.optional(v.string()),
    cacheTtlMs: v.optional(v.number()),
    requireToolUse: v.optional(v.boolean()),
    requireVision: v.optional(v.boolean()),
    requireStructuredOutputs: v.optional(v.boolean()),
    minContext: v.optional(v.number()),
  },
  returns: v.object({
    text: v.string(),
    modelId: v.string(),
    isFree: v.boolean(),
    inputTokens: v.number(),
    outputTokens: v.number(),
    costUsd: v.number(),
    latencyMs: v.number(),
    fromCache: v.boolean(),
    routing: v.object({
      requestedTier: v.string(),
      actualTier: v.string(),
      taskCategory: v.string(),
      fallbacksUsed: v.number(),
      pinnedModel: v.union(v.string(), v.null()),
    }),
  }),
  handler: async (ctx, args) => {
    const startTime = Date.now();
    const tier = (args.tier ?? TASK_DEFAULT_TIER[args.taskCategory as TaskCategory] ?? "cheap") as TaskTier;

    // ─── Check cache ─────────────────────────────────────────────────
    if (args.cacheKey) {
      const cached = getCached(args.cacheKey);
      if (cached) {
        return {
          text: cached.text,
          modelId: cached.modelId,
          isFree: MODEL_PRICING[cached.modelId]?.input === 0,
          inputTokens: cached.inputTokens,
          outputTokens: cached.outputTokens,
          costUsd: 0,
          latencyMs: 0,
          fromCache: true,
          routing: {
            requestedTier: tier,
            actualTier: tier,
            taskCategory: args.taskCategory,
            fallbacksUsed: 0,
            pinnedModel: args.pinnedModel ?? null,
          },
        };
      }
    }

    // ─── Check agent budget ──────────────────────────────────────────
    if (args.agentId) {
      const budgetCheck = await ctx.runQuery(
        internal.domains.models.modelRouterQueries.checkAgentBudget,
        { agentId: args.agentId }
      );
      if (!budgetCheck.allowed) {
        throw new Error(
          `Agent ${args.agentId} budget exceeded: ${budgetCheck.reason}`
        );
      }
    }

    // ─── Build model candidate list ──────────────────────────────────
    let candidates: string[];
    if (args.pinnedModel) {
      // Version pinning for repro packs — use exactly this model
      candidates = [args.pinnedModel];
    } else {
      candidates = [...(TIER_MODELS[tier] ?? TIER_MODELS.cheap)];
      // If tier is free and no candidates work, escalate to cheap
      if (tier === "free") {
        candidates.push(...TIER_MODELS.cheap);
      }
    }

    // ─── Try models in order with fallback ───────────────────────────
    let lastError: Error | null = null;
    let fallbacksUsed = 0;
    let actualTier = tier;

    for (const modelId of candidates) {
      try {
        const model = getLanguageModelSafe(modelId);
        if (!model) continue;

        const result = await generateText({
          model,
          system: args.systemPrompt,
          messages: args.messages.map((m) => ({
            role: m.role as "user" | "assistant" | "system",
            content: m.content,
          })),
          maxOutputTokens: args.maxTokens ?? 2048,
          temperature: args.temperature ?? 0.3,
        });

        const inputTokens = result.usage?.inputTokens ?? 0;
        const outputTokens = result.usage?.outputTokens ?? 0;
        const costUsd = calculateCost(modelId, inputTokens, outputTokens);
        const latencyMs = Date.now() - startTime;
        const isFree = MODEL_PRICING[modelId]?.input === 0;

        // Determine actual tier based on model used
        if (isFree) actualTier = "free";
        else if (TIER_MODELS.cheap.includes(modelId)) actualTier = "cheap";
        else if (TIER_MODELS.standard.includes(modelId)) actualTier = "standard";
        else actualTier = "premium";

        // ─── Cache result ──────────────────────────────────────────
        if (args.cacheKey) {
          setCache(args.cacheKey, {
            text: result.text,
            modelId,
            expiresAt: Date.now() + (args.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS),
            inputTokens,
            outputTokens,
          });
        }

        // ─── Log to audit trail ────────────────────────────────────
        await ctx.runMutation(
          internal.domains.models.modelRouterQueries.logRouterCall,
          {
            modelId,
            taskCategory: args.taskCategory,
            requestedTier: tier,
            actualTier,
            agentId: args.agentId,
            inputTokens,
            outputTokens,
            costUsd,
            latencyMs,
            fallbacksUsed,
            fromCache: false,
            pinnedModel: args.pinnedModel ?? null,
            success: true,
            errorMessage: null,
          }
        );

        return {
          text: result.text,
          modelId,
          isFree,
          inputTokens,
          outputTokens,
          costUsd,
          latencyMs,
          fromCache: false,
          routing: {
            requestedTier: tier,
            actualTier,
            taskCategory: args.taskCategory,
            fallbacksUsed,
            pinnedModel: args.pinnedModel ?? null,
          },
        };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        fallbacksUsed++;

        // Retry on 429/503 with backoff
        const status = (err as any)?.status ?? (err as any)?.statusCode;
        if ([429, 502, 503, 504].includes(status)) {
          const delay = Math.min(1000 * fallbacksUsed, 5000) + Math.random() * 500;
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }

    // ─── All models failed — log and throw ───────────────────────────
    await ctx.runMutation(
      internal.domains.models.modelRouterQueries.logRouterCall,
      {
        modelId: candidates[0] ?? "unknown",
        taskCategory: args.taskCategory,
        requestedTier: tier,
        actualTier: tier,
        agentId: args.agentId,
        inputTokens: 0,
        outputTokens: 0,
        costUsd: 0,
        latencyMs: Date.now() - startTime,
        fallbacksUsed,
        fromCache: false,
        pinnedModel: args.pinnedModel ?? null,
        success: false,
        errorMessage: lastError?.message ?? "All models failed",
      }
    );

    throw new Error(
      `ModelRouter: All ${candidates.length} models failed for ${args.taskCategory} (tier: ${tier}). Last error: ${lastError?.message}`
    );
  },
});
