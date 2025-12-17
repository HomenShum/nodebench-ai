/**
 * 2025 Approved Models - SINGLE SOURCE OF TRUTH
 *
 * This module defines the 9 approved LLM models for NodeBench.
 * All UI components and backend logic should import from here.
 *
 * @see convex/domains/agents/MODEL_CONSOLIDATION_PLAN.md
 */

// ═══════════════════════════════════════════════════════════════════════════
// THE 9 APPROVED MODELS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * The 9 approved model aliases - ONLY these are allowed in UI and user-facing code
 */
export const APPROVED_MODELS = [
  "gpt-5.2",           // OpenAI flagship (Dec 11, 2025)
  "gpt-5-mini",        // OpenAI efficient reasoning (Aug 7, 2025)
  "gpt-5-nano",        // OpenAI ultra-efficient (Aug 7, 2025)
  "claude-opus-4.5",   // Anthropic flagship
  "claude-sonnet-4.5", // Anthropic balanced
  "claude-haiku-4.5",  // Anthropic fast (DEFAULT)
  "gemini-3-pro",      // Google flagship
  "gemini-2.5-flash",  // Google balanced
  "gemini-2.5-pro",    // Google quality
] as const;

export type ApprovedModel = (typeof APPROVED_MODELS)[number];

export type Provider = "openai" | "anthropic" | "google";

// ═══════════════════════════════════════════════════════════════════════════
// MODEL METADATA FOR UI
// ═══════════════════════════════════════════════════════════════════════════

export interface ModelUIInfo {
  id: ApprovedModel;
  name: string;
  provider: Provider;
  description: string;
  tier: "fast" | "balanced" | "powerful";
  contextWindow: string;
  icon: string; // Emoji for quick visual
}

/**
 * UI-friendly model information for dropdowns and selectors
 */
export const MODEL_UI_INFO: Record<ApprovedModel, ModelUIInfo> = {
  "gpt-5.2": {
    id: "gpt-5.2",
    name: "GPT-5.2",
    provider: "openai",
    description: "Latest flagship (Dec 2025)",
    tier: "powerful",
    contextWindow: "256K",
    icon: "🟢",
  },
  "gpt-5-mini": {
    id: "gpt-5-mini",
    name: "GPT-5 Mini",
    provider: "openai",
    description: "Efficient reasoning",
    tier: "balanced",
    contextWindow: "272K",
    icon: "🟢",
  },
  "gpt-5-nano": {
    id: "gpt-5-nano",
    name: "GPT-5 Nano",
    provider: "openai",
    description: "Ultra-efficient",
    tier: "fast",
    contextWindow: "272K",
    icon: "🟢",
  },
  "claude-opus-4.5": {
    id: "claude-opus-4.5",
    name: "Claude Opus 4.5",
    provider: "anthropic",
    description: "Most capable",
    tier: "powerful",
    contextWindow: "200K",
    icon: "🟠",
  },
  "claude-sonnet-4.5": {
    id: "claude-sonnet-4.5",
    name: "Claude Sonnet 4.5",
    provider: "anthropic",
    description: "Best balance",
    tier: "balanced",
    contextWindow: "200K",
    icon: "🟠",
  },
  "claude-haiku-4.5": {
    id: "claude-haiku-4.5",
    name: "Claude Haiku 4.5",
    provider: "anthropic",
    description: "Fastest",
    tier: "fast",
    contextWindow: "200K",
    icon: "🟠",
  },
  "gemini-3-pro": {
    id: "gemini-3-pro",
    name: "Gemini 3 Pro",
    provider: "google",
    description: "Latest flagship",
    tier: "powerful",
    contextWindow: "2M",
    icon: "🔵",
  },
  "gemini-2.5-flash": {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "google",
    description: "Fast, great quality",
    tier: "balanced",
    contextWindow: "1M",
    icon: "🔵",
  },
  "gemini-2.5-pro": {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    provider: "google",
    description: "Best quality",
    tier: "powerful",
    contextWindow: "2M",
    icon: "🔵",
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

export const DEFAULT_MODEL: ApprovedModel = "claude-haiku-4.5";

/**
 * Check if a string is a valid approved model
 */
export function isApprovedModel(model: string): model is ApprovedModel {
  return (APPROVED_MODELS as readonly string[]).includes(model);
}

/**
 * Get all models for a specific provider
 */
export function getModelsByProvider(provider: Provider): ApprovedModel[] {
  return APPROVED_MODELS.filter((m) => MODEL_UI_INFO[m].provider === provider);
}

/**
 * Get all models as UI-friendly array (for dropdowns)
 */
export function getModelUIList(): ModelUIInfo[] {
  return APPROVED_MODELS.map((m) => MODEL_UI_INFO[m]);
}

/**
 * Provider colors for UI consistency
 */
export const PROVIDER_COLORS = {
  openai: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", icon: "🟢" },
  anthropic: { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700", icon: "🟠" },
  google: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", icon: "🔵" },
} as const;

