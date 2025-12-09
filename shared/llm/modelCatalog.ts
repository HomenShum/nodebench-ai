/**
 * Central registry for LLM model selection across providers.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * OPENAI MODELS (via @ai-sdk/openai) ✅ FULLY INTEGRATED
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * GPT-5.1 Series (December 2025) - Latest flagship:
 * - gpt-5.1: Best for complex reasoning and agentic tasks (128K context)
 * - gpt-5.1-codex: Optimized for coding (400K context)
 *
 * GPT-5 Series (August 2025):
 * - gpt-5-mini: Balanced speed/quality (400K context)
 * - gpt-5-nano: Fastest, most cost-effective (400K context)
 *
 * GPT-4.1 Series (April 2025) - Stable fallback:
 * - gpt-4.1-mini: Cost-effective fallback
 * - gpt-4.1-nano: Fastest fallback
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ANTHROPIC/CLAUDE MODELS (via @ai-sdk/anthropic) ✅ FULLY INTEGRATED
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Claude 4.5 Series (October 2025) - Latest:
 * - claude-sonnet-4-5-20250929: Best balance of speed/quality (200K context)
 * - claude-opus-4-5-20251101: Most capable (200K context)
 * - claude-haiku-4-5-20251001: Fastest, cheapest (200K context)
 *
 * Claude 4 Series (2025):
 * - claude-sonnet-4: Balanced
 * - claude-opus-4: Most capable
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * GEMINI MODELS (via @ai-sdk/google) ✅ FULLY INTEGRATED
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * - gemini-2.5-flash: Fast, good quality (1M context)
 * - gemini-2.5-pro: Best quality (2M context)
 * - gemini-2.5-flash-lite: Ultra-fast, low cost (1M context)
 */

// ═══════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

export type LlmProvider = "openai" | "anthropic" | "gemini";

export type LlmTask =
  | "chat"
  | "agent"
  | "router"
  | "judge"
  | "analysis"
  | "vision"
  | "fileSearch"
  | "voice"
  | "coding";

export type UserTier = "anonymous" | "free" | "pro" | "team" | "enterprise";

// ═══════════════════════════════════════════════════════════════════════════
// MODEL PRICING (per 1M tokens, USD)
// ═══════════════════════════════════════════════════════════════════════════

export interface ModelPricing {
  inputPer1M: number;    // Cost per 1M input tokens
  outputPer1M: number;   // Cost per 1M output tokens
  cachedInputPer1M?: number; // Cached input discount (if supported)
  contextWindow: number; // Max context window
}

export const modelPricing: Record<string, ModelPricing> = {
  // OpenAI GPT-5.1 Series
  "gpt-5.1": { inputPer1M: 2.50, outputPer1M: 10.00, cachedInputPer1M: 0.25, contextWindow: 128000 },
  "gpt-5.1-codex": { inputPer1M: 3.00, outputPer1M: 12.00, cachedInputPer1M: 0.30, contextWindow: 400000 },
  
  // OpenAI GPT-5 Series
  "gpt-5-mini": { inputPer1M: 0.40, outputPer1M: 1.60, cachedInputPer1M: 0.04, contextWindow: 400000 },
  "gpt-5-nano": { inputPer1M: 0.10, outputPer1M: 0.40, cachedInputPer1M: 0.01, contextWindow: 400000 },
  
  // OpenAI GPT-4.1 Series (fallbacks)
  "gpt-4.1": { inputPer1M: 2.00, outputPer1M: 8.00, contextWindow: 128000 },
  "gpt-4.1-mini": { inputPer1M: 0.15, outputPer1M: 0.60, contextWindow: 128000 },
  "gpt-4.1-nano": { inputPer1M: 0.05, outputPer1M: 0.20, contextWindow: 128000 },
  "gpt-4o": { inputPer1M: 2.50, outputPer1M: 10.00, contextWindow: 128000 },
  
  // Anthropic Claude 4.5 Series
  "claude-sonnet-4-5-20250929": { inputPer1M: 3.00, outputPer1M: 15.00, cachedInputPer1M: 0.30, contextWindow: 200000 },
  "claude-opus-4-5-20251101": { inputPer1M: 15.00, outputPer1M: 75.00, cachedInputPer1M: 1.50, contextWindow: 200000 },
  "claude-haiku-4-5-20251001": { inputPer1M: 0.80, outputPer1M: 4.00, cachedInputPer1M: 0.08, contextWindow: 200000 },
  
  // Anthropic Claude 4 Series
  "claude-sonnet-4": { inputPer1M: 3.00, outputPer1M: 15.00, contextWindow: 200000 },
  "claude-opus-4": { inputPer1M: 15.00, outputPer1M: 75.00, contextWindow: 200000 },
  
  // Google Gemini 2.5 Series
  "gemini-2.5-flash": { inputPer1M: 0.075, outputPer1M: 0.30, contextWindow: 1000000 },
  "gemini-2.5-pro": { inputPer1M: 1.25, outputPer1M: 5.00, contextWindow: 2000000 },
  "gemini-2.5-flash-lite": { inputPer1M: 0.02, outputPer1M: 0.08, contextWindow: 1000000 },
};

// ═══════════════════════════════════════════════════════════════════════════
// RATE LIMITS BY TIER (requests per day)
// ═══════════════════════════════════════════════════════════════════════════

export interface TierLimits {
  requestsPerDay: number;
  tokensPerDay: number;
  maxTokensPerRequest: number;
  allowedProviders: LlmProvider[];
  allowedModels: string[];  // Empty = all models allowed
  costLimitPerDay: number;  // USD
}

export const tierLimits: Record<UserTier, TierLimits> = {
  anonymous: {
    requestsPerDay: 5,
    tokensPerDay: 10_000,
    maxTokensPerRequest: 2_000,
    allowedProviders: ["openai"],
    allowedModels: ["gpt-4.1-nano", "gpt-5-nano"],  // Cheapest only
    costLimitPerDay: 0.01,
  },
  free: {
    requestsPerDay: 25,
    tokensPerDay: 100_000,
    maxTokensPerRequest: 8_000,
    allowedProviders: ["openai", "anthropic"],
    allowedModels: ["gpt-4.1-mini", "gpt-5-nano", "gpt-5-mini", "claude-haiku-4-5-20251001"],
    costLimitPerDay: 0.50,
  },
  pro: {
    requestsPerDay: 500,
    tokensPerDay: 2_000_000,
    maxTokensPerRequest: 32_000,
    allowedProviders: ["openai", "anthropic", "gemini"],
    allowedModels: [],  // All models
    costLimitPerDay: 25.00,
  },
  team: {
    requestsPerDay: 2000,
    tokensPerDay: 10_000_000,
    maxTokensPerRequest: 128_000,
    allowedProviders: ["openai", "anthropic", "gemini"],
    allowedModels: [],  // All models
    costLimitPerDay: 100.00,
  },
  enterprise: {
    requestsPerDay: -1,  // Unlimited
    tokensPerDay: -1,    // Unlimited
    maxTokensPerRequest: 400_000,
    allowedProviders: ["openai", "anthropic", "gemini"],
    allowedModels: [],   // All models
    costLimitPerDay: -1, // Unlimited
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// MODEL CATALOG BY PROVIDER AND TASK
// ═══════════════════════════════════════════════════════════════════════════

type ModelCatalog = Record<LlmProvider, Record<LlmTask, string[]>>;

export const llmModelCatalog: ModelCatalog = {
  openai: {
    chat: ["gpt-5.1", "gpt-5-mini", "gpt-4.1-mini"],
    agent: ["gpt-5.1", "gpt-5-mini", "gpt-4.1-mini"],
    router: ["gpt-5-nano", "gpt-4.1-nano"],
    judge: ["gpt-5.1", "gpt-5-mini", "gpt-4.1-mini"],
    analysis: ["gpt-5.1", "gpt-5-mini", "gpt-4.1-mini"],
    vision: ["gpt-5.1", "gpt-5-mini", "gpt-4o"],
    fileSearch: ["gpt-5-nano", "gpt-4.1-nano"],
    voice: ["gpt-5-nano", "gpt-4.1-nano"],
    coding: ["gpt-5.1-codex", "gpt-5.1", "gpt-4.1-mini"],
  },
  anthropic: {
    chat: ["claude-sonnet-4-5-20250929", "claude-haiku-4-5-20251001"],
    agent: ["claude-sonnet-4-5-20250929", "claude-opus-4-5-20251101"],
    router: ["claude-haiku-4-5-20251001"],
    judge: ["claude-opus-4-5-20251101", "claude-sonnet-4-5-20250929"],
    analysis: ["claude-sonnet-4-5-20250929", "claude-opus-4-5-20251101"],
    vision: ["claude-sonnet-4-5-20250929", "claude-opus-4-5-20251101"],
    fileSearch: ["claude-haiku-4-5-20251001"],
    voice: ["claude-haiku-4-5-20251001"],
    coding: ["claude-sonnet-4-5-20250929", "claude-opus-4-5-20251101"],
  },
  gemini: {
    chat: ["gemini-2.5-flash", "gemini-2.5-pro"],
    agent: ["gemini-2.5-pro", "gemini-2.5-flash"],
    router: ["gemini-2.5-flash-lite", "gemini-2.5-flash"],
    judge: ["gemini-2.5-pro", "gemini-2.5-flash"],
    analysis: ["gemini-2.5-pro", "gemini-2.5-flash"],
    vision: ["gemini-2.5-flash", "gemini-2.5-pro"],
    fileSearch: ["gemini-2.5-flash-lite", "gemini-2.5-flash"],
    voice: ["gemini-2.5-flash-lite", "gemini-2.5-flash"],
    coding: ["gemini-2.5-pro", "gemini-2.5-flash"],
  },
};

/** Default fallback model if everything else fails */
export const DEFAULT_FALLBACK_MODEL = "gpt-4.1-mini";

/**
 * Check if Gemini is fully integrated with the Agent SDK.
 * Returns true - @ai-sdk/google is now fully integrated.
 */
export function isGeminiAgentSupported(): boolean {
  return true;
}

/**
 * Resolve the preferred model for a given task/provider with optional override.
 * Override wins; otherwise the first configured model for the task is returned.
 *
 * @param task - The type of task (chat, agent, coding, etc.)
 * @param provider - "openai" or "gemini" (note: gemini falls back to openai in agents)
 * @param override - Optional explicit model name to use instead
 * @returns The model identifier string for the API
 */
export function getLlmModel(
  task: LlmTask,
  provider: LlmProvider = "openai",
  override?: string | null | undefined
): string {
  // If explicit override provided, use it
  if (override && override.trim().length > 0) return override.trim();

  // Warn if Gemini requested but not supported in agent context
  if (provider === "gemini" && !isGeminiAgentSupported()) {
    console.warn(`[getLlmModel] Gemini requested for "${task}" but agent SDK not integrated. Use externalOrchestrator for Gemini.`);
  }

  const candidates = llmModelCatalog[provider]?.[task];
  if (!candidates || candidates.length === 0) {
    console.warn(`[getLlmModel] No model configured for task "${task}" provider "${provider}", using fallback`);
    return DEFAULT_FALLBACK_MODEL;
  }
  return candidates[0];
}

/**
 * Get all configured models for a task (useful for UI model pickers)
 */
export function getAvailableModels(task: LlmTask, provider: LlmProvider = "openai"): string[] {
  return llmModelCatalog[provider]?.[task] ?? [DEFAULT_FALLBACK_MODEL];
}

/**
 * Check if a model name is valid for a given provider
 */
export function isValidModel(modelName: string, provider: LlmProvider): boolean {
  const allModels = Object.values(llmModelCatalog[provider] ?? {}).flat();
  return allModels.includes(modelName);
}

// ═══════════════════════════════════════════════════════════════════════════
// COST CALCULATION UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate the cost for a request given input/output token counts
 */
export function calculateRequestCost(
  modelName: string,
  inputTokens: number,
  outputTokens: number,
  useCachedInput: boolean = false
): number {
  const pricing = modelPricing[modelName];
  if (!pricing) {
    console.warn(`[calculateRequestCost] No pricing for model "${modelName}", using estimate`);
    // Default to gpt-4.1-mini pricing as fallback
    return (inputTokens * 0.15 + outputTokens * 0.60) / 1_000_000;
  }

  const inputRate = useCachedInput && pricing.cachedInputPer1M 
    ? pricing.cachedInputPer1M 
    : pricing.inputPer1M;

  return (inputTokens * inputRate + outputTokens * pricing.outputPer1M) / 1_000_000;
}

/**
 * Get pricing info for a model
 */
export function getModelPricing(modelName: string): ModelPricing | null {
  return modelPricing[modelName] ?? null;
}

/**
 * Get the provider for a given model name
 */
export function getProviderForModel(modelName: string): LlmProvider | null {
  if (modelName.startsWith("gpt-") || modelName.startsWith("o1-") || modelName.startsWith("o3-") || modelName.startsWith("o4-")) {
    return "openai";
  }
  if (modelName.startsWith("claude-")) {
    return "anthropic";
  }
  if (modelName.startsWith("gemini-")) {
    return "gemini";
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// RATE LIMITING UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get rate limits for a user tier
 */
export function getTierLimits(tier: UserTier): TierLimits {
  return tierLimits[tier] ?? tierLimits.anonymous;
}

/**
 * Check if a model is allowed for a given tier
 */
export function isModelAllowedForTier(modelName: string, tier: UserTier): boolean {
  const limits = getTierLimits(tier);
  
  // Check provider first
  const provider = getProviderForModel(modelName);
  if (provider && !limits.allowedProviders.includes(provider)) {
    return false;
  }
  
  // Empty allowedModels = all models allowed
  if (limits.allowedModels.length === 0) {
    return true;
  }
  
  return limits.allowedModels.includes(modelName);
}

/**
 * Get the best allowed model for a tier and task
 * Returns the first allowed model from the task's model list
 */
export function getBestModelForTier(
  task: LlmTask, 
  tier: UserTier, 
  preferredProvider: LlmProvider = "openai"
): string {
  const limits = getTierLimits(tier);
  
  // Try preferred provider first
  const candidates = llmModelCatalog[preferredProvider]?.[task] ?? [];
  for (const model of candidates) {
    if (isModelAllowedForTier(model, tier)) {
      return model;
    }
  }
  
  // Try other allowed providers
  for (const provider of limits.allowedProviders) {
    if (provider === preferredProvider) continue;
    const providerCandidates = llmModelCatalog[provider]?.[task] ?? [];
    for (const model of providerCandidates) {
      if (isModelAllowedForTier(model, tier)) {
        return model;
      }
    }
  }
  
  // Fallback to default
  return DEFAULT_FALLBACK_MODEL;
}

export interface RateLimitCheck {
  allowed: boolean;
  reason?: string;
  remaining?: {
    requests: number;
    tokens: number;
    cost: number;
  };
}

/**
 * Check if a request would exceed rate limits
 * Note: This is a synchronous check - actual usage tracking is in Convex
 */
export function checkRateLimitSync(
  tier: UserTier,
  currentUsage: { requests: number; tokens: number; cost: number },
  requestTokens: number,
  requestCost: number
): RateLimitCheck {
  const limits = getTierLimits(tier);
  
  // Unlimited tier
  if (limits.requestsPerDay === -1) {
    return { allowed: true };
  }
  
  // Check requests
  if (currentUsage.requests >= limits.requestsPerDay) {
    return { 
      allowed: false, 
      reason: `Daily request limit reached (${limits.requestsPerDay} requests)` 
    };
  }
  
  // Check tokens
  if (limits.tokensPerDay > 0 && currentUsage.tokens + requestTokens > limits.tokensPerDay) {
    return { 
      allowed: false, 
      reason: `Daily token limit would be exceeded (${limits.tokensPerDay.toLocaleString()} tokens)` 
    };
  }
  
  // Check cost
  if (limits.costLimitPerDay > 0 && currentUsage.cost + requestCost > limits.costLimitPerDay) {
    return { 
      allowed: false, 
      reason: `Daily cost limit would be exceeded ($${limits.costLimitPerDay.toFixed(2)})` 
    };
  }
  
  // Check max tokens per request
  if (requestTokens > limits.maxTokensPerRequest) {
    return { 
      allowed: false, 
      reason: `Request exceeds max tokens (${limits.maxTokensPerRequest.toLocaleString()} tokens)` 
    };
  }
  
  return {
    allowed: true,
    remaining: {
      requests: limits.requestsPerDay - currentUsage.requests - 1,
      tokens: limits.tokensPerDay - currentUsage.tokens - requestTokens,
      cost: limits.costLimitPerDay - currentUsage.cost - requestCost,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// MODEL ALIASES (for easier user input)
// ═══════════════════════════════════════════════════════════════════════════

/** Short aliases that map to full model IDs */
export const modelAliases: Record<string, string> = {
  // OpenAI aliases
  "gpt5": "gpt-5.1",
  "gpt-5": "gpt-5.1",
  "gpt5-mini": "gpt-5-mini",
  "gpt5-nano": "gpt-5-nano",
  "gpt4": "gpt-4.1-mini",
  "gpt-4": "gpt-4.1-mini",
  "codex": "gpt-5.1-codex",
  
  // Anthropic/Claude aliases  
  "claude": "claude-sonnet-4-5-20250929",
  "claude-4.5": "claude-sonnet-4-5-20250929",
  "claude-sonnet": "claude-sonnet-4-5-20250929",
  "claude-opus": "claude-opus-4-5-20251101",
  "claude-haiku": "claude-haiku-4-5-20251001",
  "sonnet": "claude-sonnet-4-5-20250929",
  "opus": "claude-opus-4-5-20251101",
  "haiku": "claude-haiku-4-5-20251001",
  
  // Gemini aliases
  "gemini": "gemini-2.5-flash",
  "gemini-flash": "gemini-2.5-flash",
  "gemini-pro": "gemini-2.5-pro",
  "flash": "gemini-2.5-flash",
};

/**
 * Resolve a model alias to its full model ID.
 * If no alias exists, returns the original input.
 */
export function resolveModelAlias(modelInput: string): string {
  const normalized = modelInput.toLowerCase().trim();
  return modelAliases[normalized] ?? modelInput;
}

// ═══════════════════════════════════════════════════════════════════════════
// PROVIDER INTEGRATION STATUS
// ═══════════════════════════════════════════════════════════════════════════

export interface ProviderStatus {
  provider: LlmProvider;
  sdkPackage: string;
  integrated: boolean;
  supportsAgents: boolean;
  notes: string;
}

export const providerIntegrationStatus: ProviderStatus[] = [
  {
    provider: "openai",
    sdkPackage: "@ai-sdk/openai",
    integrated: true,
    supportsAgents: true,
    notes: "Fully integrated. SDK installed.",
  },
  {
    provider: "anthropic",
    sdkPackage: "@ai-sdk/anthropic",
    integrated: true, // SDK installed
    supportsAgents: true,
    notes: "Fully integrated. SDK installed.",
  },
  {
    provider: "gemini",
    sdkPackage: "@ai-sdk/google",
    integrated: true,
    supportsAgents: true,
    notes: "Fully integrated. SDK installed.",
  },
];

export function getProviderStatus(provider: LlmProvider): ProviderStatus | undefined {
  return providerIntegrationStatus.find(p => p.provider === provider);
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTEXT WINDOW VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if a prompt fits within a model's context window.
 * Returns { fits: boolean, tokenEstimate: number, contextWindow: number, overflow: number }
 */
export function validateContextWindow(
  modelName: string,
  promptText: string,
  reserveOutputTokens: number = 4000
): { fits: boolean; tokenEstimate: number; contextWindow: number; overflow: number } {
  const pricing = modelPricing[modelName];
  const contextWindow = pricing?.contextWindow ?? 128000; // Default to 128K
  
  // Rough token estimation: ~4 chars per token for English
  const tokenEstimate = Math.ceil(promptText.length / 4);
  const availableTokens = contextWindow - reserveOutputTokens;
  const overflow = Math.max(0, tokenEstimate - availableTokens);
  
  return {
    fits: tokenEstimate <= availableTokens,
    tokenEstimate,
    contextWindow,
    overflow,
  };
}

/**
 * Get a model with sufficient context window for the given prompt
 * Falls back to larger models if needed
 */
export function getModelForContextSize(
  promptText: string,
  preferredModel: string,
  reserveOutputTokens: number = 4000
): string {
  const validation = validateContextWindow(preferredModel, promptText, reserveOutputTokens);
  
  if (validation.fits) {
    return preferredModel;
  }
  
  // Try larger context models in order of preference
  const largeContextModels = [
    "gemini-2.5-flash",      // 1M context
    "gemini-2.5-pro",        // 2M context
    "gpt-5-mini",            // 400K context
    "gpt-5.1-codex",         // 400K context
  ];
  
  for (const model of largeContextModels) {
    const check = validateContextWindow(model, promptText, reserveOutputTokens);
    if (check.fits) {
      console.log(`[getModelForContextSize] Upgrading from ${preferredModel} to ${model} for context (${validation.tokenEstimate} tokens)`);
      return model;
    }
  }
  
  // Return gemini-2.5-pro as last resort (2M context)
  console.warn(`[getModelForContextSize] Prompt too large (${validation.tokenEstimate} tokens), using gemini-2.5-pro`);
  return "gemini-2.5-pro";
}

// ═══════════════════════════════════════════════════════════════════════════
// ENVIRONMENT VARIABLE VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

/** Environment variable names for each provider */
export const providerEnvVars: Record<LlmProvider, string> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  gemini: "GEMINI_API_KEY",
};

/**
 * Check if a provider's API key is configured.
 * Note: This only works in Node.js runtime (Convex actions).
 */
export function isProviderConfigured(provider: LlmProvider): boolean {
  if (typeof process === "undefined" || !process.env) {
    // Can't check in browser context
    return true; // Assume configured
  }
  const envVar = providerEnvVars[provider];
  const value = process.env[envVar];
  return !!value && value.length > 10;
}

/**
 * Get all configured providers
 */
export function getConfiguredProviders(): LlmProvider[] {
  return (["openai", "anthropic", "gemini"] as LlmProvider[]).filter(isProviderConfigured);
}

// ═══════════════════════════════════════════════════════════════════════════
// PROVIDER FAILOVER
// ═══════════════════════════════════════════════════════════════════════════

/** Fallback chain for each provider */
export const providerFallbackChain: Record<LlmProvider, LlmProvider[]> = {
  openai: ["anthropic", "gemini"],
  anthropic: ["openai", "gemini"],
  gemini: ["openai", "anthropic"],
};

/** Model equivalents across providers (for failover) */
export const modelEquivalents: Record<string, Record<LlmProvider, string>> = {
  // High-tier models
  "gpt-5.1": { openai: "gpt-5.1", anthropic: "claude-sonnet-4-5-20250929", gemini: "gemini-2.5-pro" },
  "claude-sonnet-4-5-20250929": { openai: "gpt-5.1", anthropic: "claude-sonnet-4-5-20250929", gemini: "gemini-2.5-pro" },
  "gemini-2.5-pro": { openai: "gpt-5.1", anthropic: "claude-sonnet-4-5-20250929", gemini: "gemini-2.5-pro" },
  
  // Mid-tier models
  "gpt-5-mini": { openai: "gpt-5-mini", anthropic: "claude-haiku-4-5-20251001", gemini: "gemini-2.5-flash" },
  "claude-haiku-4-5-20251001": { openai: "gpt-5-mini", anthropic: "claude-haiku-4-5-20251001", gemini: "gemini-2.5-flash" },
  "gemini-2.5-flash": { openai: "gpt-5-mini", anthropic: "claude-haiku-4-5-20251001", gemini: "gemini-2.5-flash" },
  
  // Fast/cheap models
  "gpt-5-nano": { openai: "gpt-5-nano", anthropic: "claude-haiku-4-5-20251001", gemini: "gemini-2.5-flash-lite" },
  "gpt-4.1-mini": { openai: "gpt-4.1-mini", anthropic: "claude-haiku-4-5-20251001", gemini: "gemini-2.5-flash" },
};

/**
 * Get equivalent model for a different provider (for failover)
 */
export function getEquivalentModel(modelName: string, targetProvider: LlmProvider): string {
  const equivalents = modelEquivalents[modelName];
  if (equivalents?.[targetProvider]) {
    return equivalents[targetProvider];
  }
  
  // Default fallback by provider
  const defaults: Record<LlmProvider, string> = {
    openai: DEFAULT_FALLBACK_MODEL,
    anthropic: "claude-haiku-4-5-20251001",
    gemini: "gemini-2.5-flash",
  };
  
  return defaults[targetProvider];
}

/**
 * Get a working model with failover.
 * Tries the preferred model's provider first, then falls back to alternatives.
 */
export function getModelWithFailover(preferredModel: string): {
  model: string;
  provider: LlmProvider;
  isFallback: boolean;
} {
  const provider = getProviderForModel(preferredModel);
  
  if (!provider) {
    return { model: DEFAULT_FALLBACK_MODEL, provider: "openai", isFallback: true };
  }
  
  // Check if preferred provider is configured
  if (isProviderConfigured(provider)) {
    return { model: preferredModel, provider, isFallback: false };
  }
  
  // Try fallback providers
  const fallbacks = providerFallbackChain[provider];
  for (const fallbackProvider of fallbacks) {
    if (isProviderConfigured(fallbackProvider)) {
      const equivalentModel = getEquivalentModel(preferredModel, fallbackProvider);
      console.warn(`[getModelWithFailover] ${provider} not configured, falling back to ${fallbackProvider}: ${equivalentModel}`);
      return { model: equivalentModel, provider: fallbackProvider, isFallback: true };
    }
  }
  
  // Last resort: return OpenAI default
  console.error(`[getModelWithFailover] No providers configured! Using default.`);
  return { model: DEFAULT_FALLBACK_MODEL, provider: "openai", isFallback: true };
}
