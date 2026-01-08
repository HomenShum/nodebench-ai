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
 */
export const APPROVED_MODELS = [
  // Native providers (direct API)
  "gpt-5.2",           // OpenAI flagship (Dec 11, 2025)
  "gpt-5-mini",        // OpenAI efficient reasoning (Aug 7, 2025)
  "gpt-5-nano",        // OpenAI ultra-efficient (Aug 7, 2025)
  "claude-opus-4.5",   // Anthropic flagship
  "claude-sonnet-4.5", // Anthropic balanced
  "claude-haiku-4.5",  // Anthropic fast (DEFAULT)
  "gemini-3-pro",      // Google flagship
  "gemini-3-flash",    // Google fast (Dec 17, 2025)
  // OpenRouter models - affordable frontier models with tool calling
  "deepseek-v3.2",     // DeepSeek V3.2 - sparse attention, tool use ($0.25/M in)
  "minimax-m2.1",      // MiniMax M2.1 - optimized for agentic workflows ($0.28/M in)
  "qwen-2.5-72b",      // Qwen 2.5 72B - coding/math specialist ($0.12/M in)
  "mistral-large",     // Mistral Large 2411 - improved function calling ($2/M in)
  "cohere-command-r+", // Cohere Command R+ - RAG optimized ($2.50/M in)
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
 * Model specification with full metadata
 * - alias: User-facing model name (shown in UI)
 * - sdkId: Provider-specific ID sent to API (internal, may include dates)
 */
export interface ModelSpec {
  alias: ApprovedModel;
  provider: Provider;
  sdkId: string;                    // Actual SDK model ID (internal)
  capabilities: ModelCapabilities;
}

// ═══════════════════════════════════════════════════════════════════════════
// MODEL REGISTRY - THE SINGLE SOURCE OF TRUTH
// ═══════════════════════════════════════════════════════════════════════════

export const MODEL_SPECS: Record<ApprovedModel, ModelSpec> = {
  "gpt-5.2": {
    alias: "gpt-5.2",
    provider: "openai",
    sdkId: "gpt-5.2",  // Real GPT-5.2 API (Dec 11, 2025)
    capabilities: {
      vision: true,
      toolUse: true,
      streaming: true,
      structuredOutputs: true,
      maxContext: 256_000
    },
  },
  "gpt-5-mini": {
    alias: "gpt-5-mini",
    provider: "openai",
    sdkId: "gpt-5-mini",  // GPT-5 Mini (Aug 7, 2025) - efficient reasoning
    capabilities: {
      vision: true,
      toolUse: true,
      streaming: true,
      structuredOutputs: true,
      maxContext: 272_000  // 272K input, 128K output
    },
  },
  "gpt-5-nano": {
    alias: "gpt-5-nano",
    provider: "openai",
    sdkId: "gpt-5-nano",  // GPT-5 Nano (Aug 7, 2025) - ultra-efficient
    capabilities: {
      vision: true,
      toolUse: true,
      streaming: true,
      structuredOutputs: true,
      maxContext: 272_000  // 272K input, 128K output
    },
  },
  "claude-opus-4.5": {
    alias: "claude-opus-4.5",
    provider: "anthropic",
    sdkId: "claude-opus-4-5-20251101",  // Dated ID for reproducibility
    capabilities: {
      vision: true,
      toolUse: true,
      streaming: true,
      structuredOutputs: true,
      maxContext: 200_000
    },
  },
  "claude-sonnet-4.5": {
    alias: "claude-sonnet-4.5",
    provider: "anthropic",
    sdkId: "claude-sonnet-4-5-20250929",  // Dated ID for reproducibility
    capabilities: {
      vision: true,
      toolUse: true,
      streaming: true,
      structuredOutputs: true,
      maxContext: 200_000
    },
  },
  "claude-haiku-4.5": {
    alias: "claude-haiku-4.5",
    provider: "anthropic",
    sdkId: "claude-haiku-4-5-20251001",  // Dated ID for reproducibility
    capabilities: {
      vision: true,
      toolUse: true,
      streaming: true,
      structuredOutputs: true,
      maxContext: 200_000
    },
  },
  "gemini-3-pro": {
    alias: "gemini-3-pro",
    provider: "google",
    sdkId: "gemini-3-pro-preview",  // Gemini 3 Pro Preview - flagship reasoning model (Jan 2026)
    capabilities: {
      vision: true,
      toolUse: true,
      streaming: true,
      structuredOutputs: true,
      maxContext: 1_000_000
    },
  },
  "gemini-3-flash": {
    alias: "gemini-3-flash",
    provider: "google",
    sdkId: "gemini-3-flash-preview",  // Gemini 3 Flash Preview - Pro-level at Flash speed (Jan 2026)
    capabilities: {
      vision: true,
      toolUse: true,
      streaming: true,
      structuredOutputs: true,
      maxContext: 1_000_000
    },
  },
  // ═══════════════════════════════════════════════════════════════════════════
  // OPENROUTER MODELS - Frontier models via unified API
  // ═══════════════════════════════════════════════════════════════════════════
  "deepseek-v3.2": {
    alias: "deepseek-v3.2",
    provider: "openrouter",
    sdkId: "deepseek/deepseek-v3.2",  // DeepSeek V3.2 - sparse attention (Dec 2025)
    capabilities: {
      vision: false,
      toolUse: true,
      streaming: true,
      structuredOutputs: true,
      maxContext: 163_840
    },
  },
  "minimax-m2.1": {
    alias: "minimax-m2.1",
    provider: "openrouter",
    sdkId: "minimax/minimax-m2.1",  // MiniMax M2.1 - agentic workflows (Dec 2025)
    capabilities: {
      vision: false,
      toolUse: true,
      streaming: true,
      structuredOutputs: true,
      maxContext: 196_608
    },
  },
  "qwen-2.5-72b": {
    alias: "qwen-2.5-72b",
    provider: "openrouter",
    sdkId: "qwen/qwen-2.5-72b-instruct",  // Qwen 2.5 72B - coding/math specialist
    capabilities: {
      vision: false,
      toolUse: true,
      streaming: true,
      structuredOutputs: true,
      maxContext: 32_768
    },
  },
  "mistral-large": {
    alias: "mistral-large",
    provider: "openrouter",
    sdkId: "mistralai/mistral-large-2411",  // Mistral Large 2411 - improved function calling
    capabilities: {
      vision: false,
      toolUse: true,
      streaming: true,
      structuredOutputs: true,
      maxContext: 131_072
    },
  },
  "cohere-command-r+": {
    alias: "cohere-command-r+",
    provider: "openrouter",
    sdkId: "cohere/command-r-plus-08-2024",  // Cohere Command R+ - RAG optimized
    capabilities: {
      vision: false,
      toolUse: true,
      streaming: true,
      structuredOutputs: true,
      maxContext: 128_000
    },
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
