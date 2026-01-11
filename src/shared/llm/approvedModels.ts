/**
 * Approved Models - UI & frontend single source of truth
 *
 * NOTE: Backend model resolution lives in `convex/domains/agents/mcp_tools/models/modelResolver.ts`.
 * This file defines the models exposed in the UI model pickers.
 */

export const APPROVED_MODELS = [
  "gpt-5.2", // OpenAI flagship
  "gpt-5-mini", // OpenAI efficient reasoning
  "gpt-5-nano", // OpenAI ultra-efficient
  "claude-opus-4.5", // Anthropic flagship
  "claude-sonnet-4.5", // Anthropic balanced
  "claude-haiku-4.5", // Anthropic fast
  "gemini-3-pro", // Google flagship
  "gemini-3-flash", // Google fast (DEFAULT)
  "mimo-v2-flash-free", // OpenRouter free-tier
] as const;

export type ApprovedModel = (typeof APPROVED_MODELS)[number];

export type Provider = "openai" | "anthropic" | "google" | "openrouter";

export interface ModelUIInfo {
  id: ApprovedModel;
  name: string;
  provider: Provider;
  description: string;
  tier: "fast" | "balanced" | "powerful";
  contextWindow: string;
  icon: string; // Simple emoji/icon for quick visual
  isFree?: boolean;
}

export const MODEL_UI_INFO: Record<ApprovedModel, ModelUIInfo> = {
  "gpt-5.2": {
    id: "gpt-5.2",
    name: "GPT-5.2",
    provider: "openai",
    description: "Latest flagship",
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
  "gemini-3-flash": {
    id: "gemini-3-flash",
    name: "Gemini 3 Flash",
    provider: "google",
    description: "Frontier intelligence, fast (DEFAULT)",
    tier: "fast",
    contextWindow: "1M",
    icon: "🔵",
  },
  "mimo-v2-flash-free": {
    id: "mimo-v2-flash-free",
    name: "MiMo V2 Flash (Free)",
    provider: "openrouter",
    description: "OpenRouter free-tier fast model",
    tier: "fast",
    contextWindow: "32K",
    icon: "🟣",
    isFree: true,
  },
};

export const DEFAULT_MODEL: ApprovedModel = "gemini-3-flash";

export function isApprovedModel(model: string): model is ApprovedModel {
  return (APPROVED_MODELS as readonly string[]).includes(model);
}

export function getModelsByProvider(provider: Provider): ApprovedModel[] {
  return APPROVED_MODELS.filter((m) => MODEL_UI_INFO[m].provider === provider);
}

export function getModelUIList(): ModelUIInfo[] {
  return APPROVED_MODELS.map((m) => MODEL_UI_INFO[m]);
}

export const PROVIDER_COLORS: Record<
  Provider,
  { bg: string; border: string; text: string; icon: string }
> = {
  openai: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", icon: "🟢" },
  anthropic: { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700", icon: "🟠" },
  google: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", icon: "🔵" },
  openrouter: { bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-700", icon: "🟣" },
};

