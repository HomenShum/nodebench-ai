/**
 * Model Resolver - 2025 Consolidated LLM Model Registry
 *
 * This is the SINGLE SOURCE OF TRUTH for model selection across NodeBench.
 * 9 approved models: GPT-5 series (flagship/mini/nano), Claude 4.5 series, Gemini series.
 *
 * POLICY:
 * - UI shows ONLY the approved ALIASES (e.g., "gpt-5.2", "claude-haiku-4.5")
 * - Dated SDK IDs are INTERNAL ONLY (stored in ModelSpec.sdkId)
 * - Every resolution logs BOTH requestedAlias and resolvedSdkId
 * - Default model is claude-haiku-4.5 (fast, cost-effective)
 *
 * @see MODEL_CONSOLIDATION_PLAN.md for architecture details
 */

import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
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
  return createOpenRouter({ apiKey });
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
] as const;

export type ApprovedModel = (typeof APPROVED_MODELS)[number];

// Default model: claude-haiku-4.5 (fast, cost-effective)
// Fallback chain: anthropic → openai → gemini
export const DEFAULT_MODEL: ApprovedModel = "claude-haiku-4.5";

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
