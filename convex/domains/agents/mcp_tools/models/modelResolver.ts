/**
 * Model Resolver - 2026 Consolidated LLM Model Registry
 *
 * This is the SINGLE SOURCE OF TRUTH for model selection across NodeBench.
 * 14 approved models: GPT-5 series, Claude 4.5 series, Gemini series, + OpenRouter frontier models.
 *
 * POLICY:
 * - UI shows ONLY the approved ALIASES (e.g., "gpt-5.2", "gemini-3-flash")
 * - Dated SDK IDs are INTERNAL ONLY (stored in ModelSpec.sdkId)
 * - Every resolution logs BOTH requestedAlias and resolvedSdkId
 * - Default model is gemini-3-flash (100% pass rate, 16.1s avg, $0.10/M input)
 *
 * @see MODEL_CONSOLIDATION_PLAN.md for architecture details
 * @updated January 8, 2026 - Changed default from claude-haiku-4.5 to gemini-3-flash
 */

import { createOpenAI, openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import type { LanguageModel } from "ai";

// ═══════════════════════════════════════════════════════════════════════════
// OPENROUTER PROVIDER SETUP
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create OpenRouter provider with API key from environment
 * Falls back gracefully if key not available
 */
function getOpenRouterProvider() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.warn("[modelResolver] OPENROUTER_API_KEY not set, OpenRouter models unavailable");
    return null;
  }

  // Use OpenRouter's OpenAI-compatible API. This avoids provider-specific metadata
  // shape mismatches in downstream storage/validators.
  const baseURL = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
  const headers: Record<string, string> = {};
  if (process.env.OPENROUTER_HTTP_REFERER) headers["HTTP-Referer"] = process.env.OPENROUTER_HTTP_REFERER;
  if (process.env.OPENROUTER_X_TITLE) headers["X-Title"] = process.env.OPENROUTER_X_TITLE;

  return createOpenAI({
    apiKey,
    baseURL,
    headers: Object.keys(headers).length ? headers : undefined,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS (Convex backend cannot import from src/shared)
// These MUST match src/shared/llm/approvedModels.ts exactly
// ═══════════════════════════════════════════════════════════════════════════

export type Provider = "openai" | "anthropic" | "google" | "openrouter";

/**
 * The approved model aliases - includes native providers + OpenRouter models
 * OpenRouter models provide access to additional frontier models at competitive pricing
 *
 * LATEST MODELS (Jan 2026):
 * - DeepSeek R1: Reasoning model, open weights ($0.70/M in)
 * - DeepSeek V3.2 Speciale: Agentic variant ($0.27/M in)
 * - Qwen3 235B: Latest Qwen with tool calling ($0.18/M in)
 */
export const APPROVED_MODELS = [
  // Native providers (direct API)
  "gpt-5.2",           // OpenAI flagship (Dec 11, 2025)
  "gpt-5-mini",        // OpenAI efficient reasoning (Aug 7, 2025)
  "gpt-5-nano",        // OpenAI ultra-efficient (Aug 7, 2025)
  "claude-opus-4.5",   // Anthropic flagship
  "claude-sonnet-4.5", // Anthropic balanced
  "claude-haiku-4.5",  // Anthropic fast (DEFAULT)
  "gemini-3-pro",      // Google flagship (Nov 18, 2025)
  "gemini-3-flash",    // Google fast (Dec 17, 2025)
  // OpenRouter models - LATEST frontier models with tool calling (Jan 2026)
  "deepseek-r1",       // DeepSeek R1 - reasoning model (Jan 20, 2025) $0.70/M
  "deepseek-v3.2-speciale", // DeepSeek V3.2 Speciale - agentic variant $0.27/M
  "deepseek-v3.2",     // DeepSeek V3.2 - general purpose $0.25/M
  "qwen3-235b",        // Qwen3 235B - latest Qwen $0.18/M
  "minimax-m2.1",      // MiniMax M2.1 - agentic workflows $0.28/M
  "mistral-large",     // Mistral Large 2411 - function calling $2/M
  "glm-4.7-flash",     // GLM 4.7 Flash - fast, agentic coding ($0.07/$0.40)
  "glm-4.7",           // GLM 4.7 - flagship ($0.40/$1.50)
  // OpenRouter free-tier models (require OPENROUTER_API_KEY; $0 pricing tier - Jan 2026)
  "mimo-v2-flash-free", // Xiaomi MiMo V2 Flash - 309B MoE, #1 SWE-bench
  "devstral-2-free", // Mistral Devstral 2 - 123B agentic coding
  "deepseek-r1-free", // DeepSeek R1 - reasoning model
  "llama-4-maverick-free", // Meta Llama 4 Maverick - latest flagship
  "llama-4-scout-free", // Meta Llama 4 Scout - efficient
  "glm-4.5-air-free", // GLM 4.5 Air - agent-focused
  "kat-coder-pro-free", // KAT-Coder-Pro V1 - 73.4% SWE-bench
  "deepseek-chimera-free", // DeepSeek-TNG-R1T2-Chimera - 671B MoE
  "grok-4-fast-free", // X.AI Grok 4 Fast
  "venice-dolphin-free", // Venice Dolphin Mistral 24B
  "nemotron-free", // NVIDIA Nemotron 70B
] as const;

export type ApprovedModel = (typeof APPROVED_MODELS)[number];

// Default model: devstral-2-free (PROVEN: 100% pass rate, 70s avg, FREE)
// FREE-FIRST STRATEGY: Try free models first, fall back to paid if needed
// Proven free models: devstral-2-free (fastest), mimo-v2-flash-free (reliable)
// Paid fallback chain: gemini-3-flash → claude-haiku-4.5 → gpt-5-nano
export const DEFAULT_MODEL: ApprovedModel = "devstral-2-free";

// Fallback model when free model fails
export const FALLBACK_MODEL: ApprovedModel = "gemini-3-flash";

// Model priority order for FREE-FIRST strategy
export const MODEL_PRIORITY_ORDER: ApprovedModel[] = [
  // PROVEN FREE (100% pass rate in eval)
  "devstral-2-free",      // Fastest free: 70s avg
  "mimo-v2-flash-free",   // Reliable free: 83s avg
  // OTHER FREE MODELS (try before paid fallback)
  "deepseek-r1-free",     // DeepSeek R1 reasoning
  "llama-4-maverick-free", // Meta Llama 4 flagship
  "llama-4-scout-free",   // Meta Llama 4 efficient
  "glm-4.5-air-free",     // GLM 4.5 Air agent-focused
  "deepseek-chimera-free", // DeepSeek Chimera 671B
  "grok-4-fast-free",     // X.AI Grok 4
  "venice-dolphin-free",  // Venice Dolphin 24B
  "nemotron-free",        // NVIDIA Nemotron 70B
  // CHEAP PAID (fallback)
  "gemini-3-flash",       // $0.50/M input, fast
  "gpt-5-nano",           // $0.10/M input, efficient
  "claude-haiku-4.5",     // $1.00/M input, reliable
];

/**
 * Check if a string is a valid approved model
 */
export function isApprovedModel(model: string): model is ApprovedModel {
  return (APPROVED_MODELS as readonly string[]).includes(model);
}

// ═══════════════════════════════════════════════════════════════════════════
// MODEL CAPABILITIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Model capabilities - used for runtime enforcement
 */
export interface ModelCapabilities {
  vision: boolean;
  toolUse: boolean;
  streaming: boolean;
  structuredOutputs: boolean;
  maxContext: number;
}

/**
 * Model pricing per million tokens (for cost tracking)
 */
export interface ModelPricing {
  inputPerMillion: number;   // USD per 1M input tokens
  outputPerMillion: number;  // USD per 1M output tokens
}

/**
 * Model specification with full metadata
 * - alias: User-facing model name (shown in UI)
 * - sdkId: Provider-specific ID sent to API (internal, may include dates)
 * - pricing: Cost per million tokens for tracking
 */
export interface ModelSpec {
  alias: ApprovedModel;
  provider: Provider;
  sdkId: string;                    // Actual SDK model ID (internal)
  capabilities: ModelCapabilities;
  pricing: ModelPricing;            // Cost tracking (Jan 2026 prices)
}

// ═══════════════════════════════════════════════════════════════════════════
// MODEL REGISTRY - THE SINGLE SOURCE OF TRUTH
// ═══════════════════════════════════════════════════════════════════════════

export const MODEL_SPECS: Record<ApprovedModel, ModelSpec> = {
  // ═══════════════════════════════════════════════════════════════════════════
  // NATIVE PROVIDERS - Direct API access
  // ═══════════════════════════════════════════════════════════════════════════
  "gpt-5.2": {
    alias: "gpt-5.2",
    provider: "openai",
    sdkId: "gpt-5.2",
    capabilities: { vision: true, toolUse: true, streaming: true, structuredOutputs: true, maxContext: 256_000 },
    pricing: { inputPerMillion: 2.50, outputPerMillion: 10.00 },
  },
  "gpt-5-mini": {
    alias: "gpt-5-mini",
    provider: "openai",
    sdkId: "gpt-5-mini",
    capabilities: { vision: true, toolUse: true, streaming: true, structuredOutputs: true, maxContext: 400_000 },
    pricing: { inputPerMillion: 0.25, outputPerMillion: 2.00 },  // OpenRouter pricing
  },
  "gpt-5-nano": {
    alias: "gpt-5-nano",
    provider: "openai",
    sdkId: "gpt-5-nano",
    capabilities: { vision: true, toolUse: true, streaming: true, structuredOutputs: true, maxContext: 272_000 },
    pricing: { inputPerMillion: 0.10, outputPerMillion: 0.40 },
  },
  "claude-opus-4.5": {
    alias: "claude-opus-4.5",
    provider: "anthropic",
    sdkId: "claude-opus-4-5-20251101",
    capabilities: { vision: true, toolUse: true, streaming: true, structuredOutputs: true, maxContext: 200_000 },
    pricing: { inputPerMillion: 15.00, outputPerMillion: 75.00 },
  },
  "claude-sonnet-4.5": {
    alias: "claude-sonnet-4.5",
    provider: "anthropic",
    sdkId: "claude-sonnet-4-5-20250929",
    capabilities: { vision: true, toolUse: true, streaming: true, structuredOutputs: true, maxContext: 200_000 },
    pricing: { inputPerMillion: 3.00, outputPerMillion: 15.00 },
  },
  "claude-haiku-4.5": {
    alias: "claude-haiku-4.5",
    provider: "anthropic",
    sdkId: "claude-haiku-4-5-20251001",
    capabilities: { vision: true, toolUse: true, streaming: true, structuredOutputs: true, maxContext: 200_000 },
    pricing: { inputPerMillion: 1.00, outputPerMillion: 5.00 },
  },
  "gemini-3-pro": {
    alias: "gemini-3-pro",
    provider: "google",
    sdkId: "gemini-3-pro-preview",
    capabilities: { vision: true, toolUse: true, streaming: true, structuredOutputs: true, maxContext: 1_000_000 },
    pricing: { inputPerMillion: 2.00, outputPerMillion: 12.00 },
  },
  "gemini-3-flash": {
    alias: "gemini-3-flash",
    provider: "google",
    sdkId: "gemini-3-flash-preview",
    capabilities: { vision: true, toolUse: true, streaming: true, structuredOutputs: true, maxContext: 1_000_000 },
    pricing: { inputPerMillion: 0.50, outputPerMillion: 3.00 },
  },
  // ═══════════════════════════════════════════════════════════════════════════
  // OPENROUTER MODELS - Latest frontier models via unified API (Jan 2026)
  // ═══════════════════════════════════════════════════════════════════════════
  "deepseek-r1": {
    alias: "deepseek-r1",
    provider: "openrouter",
    sdkId: "deepseek/deepseek-r1",  // DeepSeek R1 - reasoning model (Jan 20, 2025)
    capabilities: { vision: false, toolUse: true, streaming: true, structuredOutputs: true, maxContext: 163_840 },
    pricing: { inputPerMillion: 0.70, outputPerMillion: 2.40 },
  },
  "deepseek-v3.2-speciale": {
    alias: "deepseek-v3.2-speciale",
    provider: "openrouter",
    sdkId: "deepseek/deepseek-v3.2-speciale",  // DeepSeek V3.2 Speciale - agentic variant
    capabilities: { vision: false, toolUse: true, streaming: true, structuredOutputs: true, maxContext: 163_840 },
    pricing: { inputPerMillion: 0.27, outputPerMillion: 0.41 },
  },
  "deepseek-v3.2": {
    alias: "deepseek-v3.2",
    provider: "openrouter",
    sdkId: "deepseek/deepseek-v3.2",  // DeepSeek V3.2 - general purpose
    capabilities: { vision: false, toolUse: true, streaming: true, structuredOutputs: true, maxContext: 163_840 },
    pricing: { inputPerMillion: 0.25, outputPerMillion: 0.38 },
  },
  "qwen3-235b": {
    alias: "qwen3-235b",
    provider: "openrouter",
    sdkId: "qwen/qwen3-235b-a22b",  // Qwen3 235B - latest with tool calling
    capabilities: { vision: false, toolUse: true, streaming: true, structuredOutputs: true, maxContext: 131_072 },
    pricing: { inputPerMillion: 0.18, outputPerMillion: 0.54 },
  },
  "minimax-m2.1": {
    alias: "minimax-m2.1",
    provider: "openrouter",
    sdkId: "minimax/minimax-m2.1",  // MiniMax M2.1 - agentic workflows (Dec 2025)
    capabilities: { vision: false, toolUse: true, streaming: true, structuredOutputs: true, maxContext: 196_608 },
    pricing: { inputPerMillion: 0.28, outputPerMillion: 1.20 },
  },
  "mistral-large": {
    alias: "mistral-large",
    provider: "openrouter",
    sdkId: "mistralai/mistral-large-2411",  // Mistral Large 2411 - improved function calling
    capabilities: { vision: false, toolUse: true, streaming: true, structuredOutputs: true, maxContext: 131_072 },
    pricing: { inputPerMillion: 2.00, outputPerMillion: 6.00 },
  },
  "glm-4.7-flash": {
    alias: "glm-4.7-flash",
    provider: "openrouter",
    sdkId: "z-ai/glm-4.7-flash", // Canonical: z-ai/glm-4.7-flash-20260119
    capabilities: { vision: false, toolUse: true, streaming: true, structuredOutputs: true, maxContext: 200_000 },
    pricing: { inputPerMillion: 0.07, outputPerMillion: 0.40 },
  },
  "glm-4.7": {
    alias: "glm-4.7",
    provider: "openrouter",
    sdkId: "z-ai/glm-4.7", // Canonical: z-ai/glm-4.7-20251222
    capabilities: { vision: false, toolUse: true, streaming: true, structuredOutputs: true, maxContext: 202_752 },
    pricing: { inputPerMillion: 0.40, outputPerMillion: 1.50 },
  },
  // ═══════════════════════════════════════════════════════════════════════════
  // OPENROUTER FREE-TIER MODELS - Evaluated Jan 2026
  // PROVEN WORKING (100% pass rate on core eval suite):
  //   - mimo-v2-flash-free: 152s avg, reliable
  //   - devstral-2-free: 70s avg, fastest free model
  // OTHER FREE MODELS: Available but may have capacity/rate limit issues
  // ═══════════════════════════════════════════════════════════════════════════
  "mimo-v2-flash-free": {
    alias: "mimo-v2-flash-free",
    provider: "openrouter",
    // NOTE: OpenRouter retired the free period for this slug. Keep the alias for backward compatibility.
    // If you truly need a free default, use devstral-2-free.
    sdkId: "xiaomi/mimo-v2-flash",  // Paid slug (free tier ended)
    capabilities: { vision: false, toolUse: true, streaming: true, structuredOutputs: false, maxContext: 262_144 },
    pricing: { inputPerMillion: 0.20, outputPerMillion: 0.60 },
  },
  "devstral-2-free": {
    alias: "devstral-2-free",
    provider: "openrouter",
    // NOTE: OpenRouter retired the free period for this slug. Keep the alias for backward compatibility.
    sdkId: "mistralai/devstral-2512",  // Paid slug (free tier ended)
    capabilities: { vision: false, toolUse: true, streaming: true, structuredOutputs: false, maxContext: 262_144 },
    pricing: { inputPerMillion: 0.20, outputPerMillion: 0.60 },
  },
  "deepseek-r1-free": {
    alias: "deepseek-r1-free",
    provider: "openrouter",
    sdkId: "deepseek/deepseek-r1:free",
    capabilities: { vision: false, toolUse: true, streaming: true, structuredOutputs: false, maxContext: 163_840 },
    pricing: { inputPerMillion: 0.00, outputPerMillion: 0.00 },
  },
  "llama-4-maverick-free": {
    alias: "llama-4-maverick-free",
    provider: "openrouter",
    sdkId: "meta-llama/llama-4-maverick:free",
    capabilities: { vision: true, toolUse: true, streaming: true, structuredOutputs: false, maxContext: 131_072 },
    pricing: { inputPerMillion: 0.00, outputPerMillion: 0.00 },
  },
  "llama-4-scout-free": {
    alias: "llama-4-scout-free",
    provider: "openrouter",
    sdkId: "meta-llama/llama-4-scout:free",
    capabilities: { vision: true, toolUse: true, streaming: true, structuredOutputs: false, maxContext: 131_072 },
    pricing: { inputPerMillion: 0.00, outputPerMillion: 0.00 },
  },
  "glm-4.5-air-free": {
    alias: "glm-4.5-air-free",
    provider: "openrouter",
    sdkId: "z-ai/glm-4.5-air:free",  // Fixed: z-ai not zhipu
    capabilities: { vision: false, toolUse: true, streaming: true, structuredOutputs: false, maxContext: 128_000 },
    pricing: { inputPerMillion: 0.00, outputPerMillion: 0.00 },
  },
  "kat-coder-pro-free": {
    alias: "kat-coder-pro-free",
    provider: "openrouter",
    sdkId: "kwaipilot/kat-coder-pro:free",  // Note: deprecating Jan 13, 2026
    capabilities: { vision: false, toolUse: true, streaming: true, structuredOutputs: false, maxContext: 256_000 },  // Fixed: 256K context
    pricing: { inputPerMillion: 0.00, outputPerMillion: 0.00 },
  },
  "deepseek-chimera-free": {
    alias: "deepseek-chimera-free",
    provider: "openrouter",
    sdkId: "tngtech/deepseek-r1t2-chimera:free",
    capabilities: { vision: false, toolUse: true, streaming: true, structuredOutputs: false, maxContext: 163_840 },
    pricing: { inputPerMillion: 0.00, outputPerMillion: 0.00 },
  },
  "grok-4-fast-free": {
    alias: "grok-4-fast-free",
    provider: "openrouter",
    sdkId: "x-ai/grok-4-fast:free",
    capabilities: { vision: true, toolUse: true, streaming: true, structuredOutputs: false, maxContext: 2_000_000 },  // Fixed: 2M context, multimodal
    pricing: { inputPerMillion: 0.00, outputPerMillion: 0.00 },
  },
  "venice-dolphin-free": {
    alias: "venice-dolphin-free",
    provider: "openrouter",
    sdkId: "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
    capabilities: { vision: false, toolUse: true, streaming: true, structuredOutputs: false, maxContext: 32_768 },
    pricing: { inputPerMillion: 0.00, outputPerMillion: 0.00 },
  },
  "nemotron-free": {
    alias: "nemotron-free",
    provider: "openrouter",
    sdkId: "nvidia/llama-3.1-nemotron-ultra-253b-v1:free",  // Fixed: use Ultra 253B (actually exists)
    capabilities: { vision: false, toolUse: true, streaming: true, structuredOutputs: false, maxContext: 131_072 },
    pricing: { inputPerMillion: 0.00, outputPerMillion: 0.00 },
  },
};

/**
 * Legacy aliases for backward compatibility
 * Maps old model names to approved models
 */
export const LEGACY_ALIASES: Record<string, ApprovedModel> = {
  // Old GPT names → appropriate models
  "gpt-5.1": "gpt-5.2",
  "gpt-5.1-codex": "gpt-5.2",
  "gpt-5": "gpt-5.2",
  "gpt-5-chat-latest": "gpt-5.2",  // Found in legacy threads
  "gpt-4.1-mini": "gpt-5-mini",    // Mini → Mini
  "gpt-4.1-nano": "gpt-5-nano",    // Nano → Nano
  "gpt-4o": "gpt-5.2",
  "gpt-4o-mini": "gpt-5-mini",     // Mini → Mini
  // Old Claude names → new aliases
  "claude-sonnet-4-5-20250929": "claude-sonnet-4.5",
  "claude-opus-4-5-20251101": "claude-opus-4.5",
  "claude-haiku-4-5-20251001": "claude-haiku-4.5",
  "claude-sonnet": "claude-sonnet-4.5",
  "claude-opus": "claude-opus-4.5",
  "claude-haiku": "claude-haiku-4.5",
  "claude": "claude-haiku-4.5",  // Default claude → haiku (fast)
  // Old Gemini names → Gemini 3 Flash (Dec 17, 2025)
  "gemini-2.5-flash-lite": "gemini-3-flash",
  "gemini-2.5-flash": "gemini-3-flash",
  "gemini-2.5-pro": "gemini-3-flash",
  "gemini-flash": "gemini-3-flash",
  "gemini-pro": "gemini-3-pro",
  "gemini": "gemini-3-flash",

  // OpenRouter MiMo V2 Flash (free tier ended; keep legacy aliases for compatibility)
  "xiaomi/mimo-v2-flash:free": "mimo-v2-flash-free",
  "xiaomi/mimo-v2-flash": "mimo-v2-flash-free",
  "mimo": "mimo-v2-flash-free",
  "mimo-v2": "mimo-v2-flash-free",
  // Devstral 2 (latest)
  "mistralai/devstral-2:free": "devstral-2-free",
  "devstral-2": "devstral-2-free",
  "devstral": "devstral-2-free",
  // DeepSeek R1 Free
  "deepseek/deepseek-r1:free": "deepseek-r1-free",
  "deepseek-r1": "deepseek-r1-free",
  // Llama 4 Maverick
  "meta-llama/llama-4-maverick:free": "llama-4-maverick-free",
  "llama-4-maverick": "llama-4-maverick-free",
  "llama-4": "llama-4-maverick-free",
  // Llama 4 Scout
  "meta-llama/llama-4-scout:free": "llama-4-scout-free",
  "llama-4-scout": "llama-4-scout-free",
  // GLM 4.5 Air
  "zhipu/glm-4.5-air:free": "glm-4.5-air-free",  // Legacy alias
  "z-ai/glm-4.5-air:free": "glm-4.5-air-free",
  "glm-4.5-air": "glm-4.5-air-free",
  "glm": "glm-4.5-air-free",
  // KAT-Coder-Pro
  "kwaipilot/kat-coder-pro:free": "kat-coder-pro-free",
  "kat-coder": "kat-coder-pro-free",
  "kat-coder-pro": "kat-coder-pro-free",
  // DeepSeek Chimera
  "tngtech/deepseek-r1t2-chimera:free": "deepseek-chimera-free",
  "deepseek-chimera": "deepseek-chimera-free",
  "chimera": "deepseek-chimera-free",
  // Grok 4 Fast
  "x-ai/grok-4-fast:free": "grok-4-fast-free",
  "grok-4-fast": "grok-4-fast-free",
  "grok-4": "grok-4-fast-free",
  "grok": "grok-4-fast-free",
  // Venice Dolphin (legacy)
  "cognitivecomputations/dolphin-mistral-24b-venice-edition:free": "venice-dolphin-free",
  "venice-dolphin": "venice-dolphin-free",
  "dolphin-mistral": "venice-dolphin-free",
  // Nemotron (legacy)
  "nvidia/llama-3.1-nemotron-70b-instruct:free": "nemotron-free",
  "nemotron": "nemotron-free",
  "nemotron-70b": "nemotron-free",

  // GLM 4.7 family (priced)
  "z-ai/glm-4.7-flash": "glm-4.7-flash",
  "z-ai/glm-4.7-flash-20260119": "glm-4.7-flash",
  "glm-4.7-flash": "glm-4.7-flash",
  "z-ai/glm-4.7": "glm-4.7",
  "z-ai/glm-4.7-20251222": "glm-4.7",
  "glm-4.7": "glm-4.7",
};

// ═══════════════════════════════════════════════════════════════════════════
// RESOLVER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build a LanguageModel instance from a ModelSpec
 */
function buildLanguageModel(spec: ModelSpec): LanguageModel {
  switch (spec.provider) {
    case "openai":
      return openai(spec.sdkId);
    case "anthropic":
      return anthropic(spec.sdkId);
    case "google":
      return google(spec.sdkId);
    case "openrouter": {
      const openrouter = getOpenRouterProvider();
      if (!openrouter) {
        throw new Error(
          `OpenRouter model "${spec.alias}" requested but OPENROUTER_API_KEY not configured`
        );
      }
      return openrouter.chat(spec.sdkId);
    }
    default:
      throw new Error(`Unknown provider: ${spec.provider}`);
  }
}

/**
 * Type-safe entry point - ONLY accepts ApprovedModel
 * Compile-time enforcement of 7-model policy
 */
export function getLanguageModel(model: ApprovedModel): LanguageModel {
  const spec = MODEL_SPECS[model];
  logModelResolution(model, spec, "getLanguageModel");
  return buildLanguageModel(spec);
}

/**
 * Resolve untrusted string input to an ApprovedModel
 * Returns null if the input is not a valid alias
 */
export function resolveModelAlias(input: string): ApprovedModel | null {
  const normalized = input.trim().toLowerCase();

  // Check if it's already an approved model
  if ((APPROVED_MODELS as readonly string[]).includes(normalized)) {
    return normalized as ApprovedModel;
  }

  // Check legacy aliases
  return LEGACY_ALIASES[input] ?? LEGACY_ALIASES[normalized] ?? null;
}

/**
 * Convenience function for untrusted input that throws on invalid
 */
export function getLanguageModelOrThrow(input: string): LanguageModel {
  const resolved = resolveModelAlias(input);
  if (!resolved) {
    throw new Error(
      `Invalid model: "${input}". Allowed models: ${APPROVED_MODELS.join(", ")}`
    );
  }
  return getLanguageModel(resolved);
}

/**
 * Get a language model from untrusted input with fallback to default
 */
export function getLanguageModelSafe(input: string | undefined | null): LanguageModel {
  if (!input) {
    return getLanguageModel(DEFAULT_MODEL);
  }
  const resolved = resolveModelAlias(input);
  if (!resolved) {
    console.warn(`[modelResolver] Unknown model "${input}", falling back to ${DEFAULT_MODEL}`);
    return getLanguageModel(DEFAULT_MODEL);
  }
  return getLanguageModel(resolved);
}

/**
 * Get the ModelSpec for an approved model
 */
export function getModelSpec(model: ApprovedModel): ModelSpec {
  return MODEL_SPECS[model];
}

/**
 * Get provider for a model
 */
export function getProviderForModel(model: ApprovedModel): Provider {
  return MODEL_SPECS[model].provider;
}

// ═══════════════════════════════════════════════════════════════════════════
// LOGGING (ModelResolution events per Part 10.2)
// ═══════════════════════════════════════════════════════════════════════════

export interface ModelResolutionEvent {
  event: "ModelResolution";
  timestamp: number;
  requestedAlias: string;
  resolvedAlias: ApprovedModel | null;
  sdkModelId: string;
  provider: Provider;
  caller: string;
  success: boolean;
  errorMessage?: string;
}

function logModelResolution(
  requestedAlias: string,
  spec: ModelSpec,
  caller: string
): void {
  const event: ModelResolutionEvent = {
    event: "ModelResolution",
    timestamp: Date.now(),
    requestedAlias,
    resolvedAlias: spec.alias,
    sdkModelId: spec.sdkId,
    provider: spec.provider,
    caller,
    success: true,
  };
  console.log("[ModelResolver]", JSON.stringify(event));
}

// ═══════════════════════════════════════════════════════════════════════════
// CAPABILITY CHECKING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if a model supports a specific capability
 */
export function modelSupportsCapability(
  model: ApprovedModel,
  capability: keyof Omit<ModelCapabilities, "maxContext">
): boolean {
  return MODEL_SPECS[model].capabilities[capability] === true;
}

/**
 * Validate that a model supports all required capabilities
 * Returns an error message if validation fails, null if valid
 */
export function validateModelCapabilities(
  model: ApprovedModel,
  required: Partial<Record<keyof ModelCapabilities, boolean>>
): string | null {
  const spec = MODEL_SPECS[model];
  const missing: string[] = [];

  if (required.vision && !spec.capabilities.vision) {
    missing.push("vision");
  }
  if (required.toolUse && !spec.capabilities.toolUse) {
    missing.push("toolUse");
  }
  if (required.streaming && !spec.capabilities.streaming) {
    missing.push("streaming");
  }
  if (required.structuredOutputs && !spec.capabilities.structuredOutputs) {
    missing.push("structuredOutputs");
  }

  if (missing.length > 0) {
    return `Model "${model}" does not support required capabilities: ${missing.join(", ")}`;
  }
  return null;
}

/**
 * Get all models that support specific capabilities
 */
export function getModelsWithCapabilities(
  required: Partial<Record<keyof ModelCapabilities, boolean>>
): ApprovedModel[] {
  return APPROVED_MODELS.filter((model) => {
    return validateModelCapabilities(model, required) === null;
  });
}

/**
 * Safely resolve a model alias and return normalized alias
 * Used for API boundary normalization
 */
export function normalizeModelInput(input: string | undefined | null): ApprovedModel {
  if (!input) return DEFAULT_MODEL;
  const resolved = resolveModelAlias(input);
  if (!resolved) {
    console.warn(`[modelResolver] Normalizing unknown model "${input}" to ${DEFAULT_MODEL}`);
    return DEFAULT_MODEL;
  }
  return resolved;
}

// ═══════════════════════════════════════════════════════════════════════════
// COST TRACKING (Jan 2026)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get pricing for a model
 */
export function getModelPricing(model: ApprovedModel): ModelPricing {
  return MODEL_SPECS[model].pricing;
}

/**
 * Calculate cost for a given token usage
 */
export function calculateCost(
  model: ApprovedModel,
  inputTokens: number,
  outputTokens: number
): { inputCost: number; outputCost: number; totalCost: number } {
  const pricing = MODEL_SPECS[model].pricing;
  const inputCost = (inputTokens / 1_000_000) * pricing.inputPerMillion;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPerMillion;
  return {
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
  };
}

/**
 * Format cost as USD string
 */
export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `$${(cost * 100).toFixed(4)}¢`;
  }
  return `$${cost.toFixed(4)}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// FREE-FIRST MODEL SELECTION WITH AUTOMATIC FALLBACK
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Retry configuration for transient errors (429/503)
 */
export const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxJitterMs: 500,
  retryableStatuses: [429, 502, 503, 504] as const,
} as const;

/**
 * Check if a model is a free OpenRouter model
 */
export function isFreeModel(model: ApprovedModel): boolean {
  return MODEL_SPECS[model].pricing.inputPerMillion === 0 &&
         MODEL_SPECS[model].pricing.outputPerMillion === 0;
}

/**
 * Get all free models from the approved list
 */
export function getFreeModels(): ApprovedModel[] {
  return APPROVED_MODELS.filter((model) => isFreeModel(model));
}

/**
 * Get the next model in the priority fallback chain
 * Returns null if no more models available
 */
export function getNextFallbackModel(currentModel: ApprovedModel): ApprovedModel | null {
  const currentIndex = MODEL_PRIORITY_ORDER.indexOf(currentModel);
  if (currentIndex === -1 || currentIndex >= MODEL_PRIORITY_ORDER.length - 1) {
    return null;
  }
  return MODEL_PRIORITY_ORDER[currentIndex + 1];
}

/**
 * Get a language model with automatic fallback to next in priority chain
 * Use this when you want FREE-FIRST behavior with paid fallback
 */
export function getLanguageModelWithFallback(preferredModel?: ApprovedModel): {
  model: LanguageModel;
  modelId: ApprovedModel;
  isFree: boolean;
  fallbackChain: ApprovedModel[];
} {
  const modelId = preferredModel ?? DEFAULT_MODEL;
  const spec = MODEL_SPECS[modelId];

  return {
    model: buildLanguageModel(spec),
    modelId,
    isFree: isFreeModel(modelId),
    fallbackChain: MODEL_PRIORITY_ORDER.slice(MODEL_PRIORITY_ORDER.indexOf(modelId) + 1),
  };
}

/**
 * Execute a model call with automatic fallback on failure
 * This is the recommended way to call models with FREE-FIRST strategy
 *
 * @param fn - Async function that takes a LanguageModel and returns a result
 * @param options - Optional configuration
 * @returns The result from the first successful model call
 */
export async function executeWithModelFallback<T>(
  fn: (model: LanguageModel, modelId: ApprovedModel) => Promise<T>,
  options?: {
    startModel?: ApprovedModel;
    maxRetries?: number;
    onFallback?: (fromModel: ApprovedModel, toModel: ApprovedModel, error: Error) => void;
  }
): Promise<{ result: T; modelUsed: ApprovedModel; isFree: boolean; fallbacksUsed: number }> {
  const { startModel = DEFAULT_MODEL, maxRetries = RETRY_CONFIG.maxRetries, onFallback } = options ?? {};

  let currentModel = startModel;
  let fallbacksUsed = 0;
  let lastError: Error | null = null;

  // Get the starting index in priority order
  let modelIndex = MODEL_PRIORITY_ORDER.indexOf(currentModel);
  if (modelIndex === -1) {
    // Model not in priority order, start from beginning
    modelIndex = 0;
    currentModel = MODEL_PRIORITY_ORDER[0];
  }

  while (modelIndex < MODEL_PRIORITY_ORDER.length) {
    currentModel = MODEL_PRIORITY_ORDER[modelIndex];
    const spec = MODEL_SPECS[currentModel];

    // Try with retries for transient errors
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const model = buildLanguageModel(spec);
        const result = await fn(model, currentModel);

        return {
          result,
          modelUsed: currentModel,
          isFree: isFreeModel(currentModel),
          fallbacksUsed,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if this is a retryable error
        const isRetryable = RETRY_CONFIG.retryableStatuses.some(
          (status) => lastError?.message.includes(String(status))
        );

        if (isRetryable && attempt < maxRetries) {
          // Exponential backoff with jitter
          const delay = RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt) +
                        Math.random() * RETRY_CONFIG.maxJitterMs;
          console.log(
            `[modelResolver] ${currentModel} retryable error, attempt ${attempt + 1}/${maxRetries + 1} after ${Math.round(delay)}ms`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        // Non-retryable or max retries exceeded, move to next model
        break;
      }
    }

    // Move to next model in fallback chain
    const nextIndex = modelIndex + 1;
    if (nextIndex < MODEL_PRIORITY_ORDER.length) {
      const nextModel = MODEL_PRIORITY_ORDER[nextIndex];
      console.log(`[modelResolver] ${currentModel} failed, falling back to ${nextModel}`);

      if (onFallback) {
        onFallback(currentModel, nextModel, lastError!);
      }

      fallbacksUsed++;
    }

    modelIndex++;
  }

  throw new Error(
    `All models in fallback chain failed. Last error: ${lastError?.message}`
  );
}

/**
 * Get the best available free model based on proven performance
 * Returns devstral-2-free as primary (fastest), mimo-v2-flash-free as backup
 */
export function getBestFreeModel(): ApprovedModel {
  // Proven models from evaluation (Jan 2026)
  // devstral-2-free: 100% pass, 70s avg (FASTEST)
  // mimo-v2-flash-free: 100% pass, 83s avg
  return "devstral-2-free";
}

/**
 * Get the fallback chain starting from a given model
 */
export function getFallbackChain(startModel: ApprovedModel = DEFAULT_MODEL): ApprovedModel[] {
  const startIndex = MODEL_PRIORITY_ORDER.indexOf(startModel);
  if (startIndex === -1) {
    return [...MODEL_PRIORITY_ORDER];
  }
  return MODEL_PRIORITY_ORDER.slice(startIndex);
}
