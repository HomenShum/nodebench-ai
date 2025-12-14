/**
 * Provider Healthcheck Module
 * 
 * Validates API key configuration for each LLM provider.
 * Used at startup and before making API calls to ensure providers are properly configured.
 * 
 * @module healthcheck
 */

import { APPROVED_MODELS, MODEL_SPECS, type ApprovedModel, type Provider } from "./modelResolver";

// Re-export Provider as LlmProvider for compatibility
export type LlmProvider = Provider;

// ═══════════════════════════════════════════════════════════════════════════
// PROVIDER ENVIRONMENT VARIABLES
// ═══════════════════════════════════════════════════════════════════════════

/** Environment variable names for each provider */
export const PROVIDER_ENV_VARS: Record<Provider, string> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  google: "GOOGLE_GENERATIVE_AI_API_KEY",
};

// ═══════════════════════════════════════════════════════════════════════════
// HEALTHCHECK TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ProviderHealthStatus {
  provider: LlmProvider;
  configured: boolean;
  envVar: string;
  keyPrefix?: string; // First 8 chars of key for debugging (masked)
  error?: string;
}

export interface HealthcheckResult {
  timestamp: number;
  allConfigured: boolean;
  providers: ProviderHealthStatus[];
  availableModels: ApprovedModel[];
  unavailableModels: ApprovedModel[];
}

// ═══════════════════════════════════════════════════════════════════════════
// HEALTHCHECK FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if a specific provider's API key is configured
 */
export function isProviderConfigured(provider: LlmProvider): boolean {
  const envVar = PROVIDER_ENV_VARS[provider];
  const apiKey = process.env[envVar];
  return !!apiKey && apiKey.length > 0;
}

/**
 * Get the health status for a specific provider
 */
export function getProviderHealth(provider: LlmProvider): ProviderHealthStatus {
  const envVar = PROVIDER_ENV_VARS[provider];
  const apiKey = process.env[envVar];
  
  if (!apiKey || apiKey.length === 0) {
    return {
      provider,
      configured: false,
      envVar,
      error: `Missing environment variable: ${envVar}`,
    };
  }
  
  // Mask the key for debugging (show first 8 chars + "...")
  const keyPrefix = apiKey.length > 8 
    ? `${apiKey.substring(0, 8)}...` 
    : "***";
  
  return {
    provider,
    configured: true,
    envVar,
    keyPrefix,
  };
}

/**
 * Run a full healthcheck on all providers
 */
export function runHealthcheck(): HealthcheckResult {
  const providers: LlmProvider[] = ["openai", "anthropic", "google"];
  const providerStatuses = providers.map(getProviderHealth);
  
  const configuredProviders = new Set(
    providerStatuses.filter(s => s.configured).map(s => s.provider)
  );
  
  const availableModels: ApprovedModel[] = [];
  const unavailableModels: ApprovedModel[] = [];
  
  for (const model of APPROVED_MODELS) {
    const spec = MODEL_SPECS[model];
    if (configuredProviders.has(spec.provider)) {
      availableModels.push(model);
    } else {
      unavailableModels.push(model);
    }
  }
  
  return {
    timestamp: Date.now(),
    allConfigured: providerStatuses.every(s => s.configured),
    providers: providerStatuses,
    availableModels,
    unavailableModels,
  };
}

/**
 * Get a list of models that are currently available (provider configured)
 */
export function getAvailableModels(): ApprovedModel[] {
  return runHealthcheck().availableModels;
}

/**
 * Check if a specific model is available (its provider is configured)
 */
export function isModelAvailable(model: ApprovedModel): boolean {
  const spec = MODEL_SPECS[model];
  return isProviderConfigured(spec.provider);
}

/**
 * Log healthcheck results to console (for debugging)
 */
export function logHealthcheck(): void {
  const result = runHealthcheck();
  
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("LLM PROVIDER HEALTHCHECK");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`Timestamp: ${new Date(result.timestamp).toISOString()}`);
  console.log(`All Configured: ${result.allConfigured ? "✅ YES" : "❌ NO"}`);
  console.log("");
  
  for (const status of result.providers) {
    const icon = status.configured ? "✅" : "❌";
    console.log(`${icon} ${status.provider.toUpperCase()}`);
    console.log(`   Env Var: ${status.envVar}`);
    if (status.configured) {
      console.log(`   Key: ${status.keyPrefix}`);
    } else {
      console.log(`   Error: ${status.error}`);
    }
  }
  
  console.log("");
  console.log(`Available Models (${result.availableModels.length}): ${result.availableModels.join(", ")}`);
  console.log(`Unavailable Models (${result.unavailableModels.length}): ${result.unavailableModels.join(", ")}`);
  console.log("═══════════════════════════════════════════════════════════════");
}

