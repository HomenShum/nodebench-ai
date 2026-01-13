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
  // OpenRouter free-tier models (auto-discovered Jan 2026)
  "mimo-v2-flash-free", // Xiaomi MiMo V2 Flash - 256K, reasoning
  "devstral-2-free", // Mistral Devstral 2 - 256K, agentic coding (123B)
  "deepseek-r1-free", // DeepSeek R1 - reasoning model
  "llama-4-maverick-free", // Meta Llama 4 Maverick - latest
  "llama-4-scout-free", // Meta Llama 4 Scout - efficient
  "glm-4.5-air-free", // GLM 4.5 Air - agent-focused
  "kat-coder-pro-free", // KAT-Coder-Pro V1 - agentic coding
  "deepseek-chimera-free", // DeepSeek-TNG-R1T2-Chimera - 671B MoE
  "grok-4-fast-free", // X.AI Grok 4 Fast
  // Legacy free models (still valid)
  "venice-dolphin-free", // Venice Dolphin Mistral 24B
  "nemotron-free", // NVIDIA Nemotron 70B
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
    description: "Xiaomi 309B MoE, #1 open-source on SWE-bench",
    tier: "fast",
    contextWindow: "256K",
    icon: "🟣",
    isFree: true,
  },
  "devstral-2-free": {
    id: "devstral-2-free",
    name: "Devstral 2 (Free)",
    provider: "openrouter",
    description: "Mistral 123B, agentic coding specialist",
    tier: "balanced",
    contextWindow: "256K",
    icon: "🟣",
    isFree: true,
  },
  "deepseek-r1-free": {
    id: "deepseek-r1-free",
    name: "DeepSeek R1 (Free)",
    provider: "openrouter",
    description: "Reasoning model, high performance",
    tier: "powerful",
    contextWindow: "164K",
    icon: "🟣",
    isFree: true,
  },
  "llama-4-maverick-free": {
    id: "llama-4-maverick-free",
    name: "Llama 4 Maverick (Free)",
    provider: "openrouter",
    description: "Meta latest flagship",
    tier: "powerful",
    contextWindow: "131K",
    icon: "🟣",
    isFree: true,
  },
  "llama-4-scout-free": {
    id: "llama-4-scout-free",
    name: "Llama 4 Scout (Free)",
    provider: "openrouter",
    description: "Meta efficient model",
    tier: "fast",
    contextWindow: "131K",
    icon: "🟣",
    isFree: true,
  },
  "glm-4.5-air-free": {
    id: "glm-4.5-air-free",
    name: "GLM 4.5 Air (Free)",
    provider: "openrouter",
    description: "Zhipu agent-focused model",
    tier: "fast",
    contextWindow: "128K",
    icon: "🟣",
    isFree: true,
  },
  "kat-coder-pro-free": {
    id: "kat-coder-pro-free",
    name: "KAT-Coder-Pro (Free)",
    provider: "openrouter",
    description: "KwaiKAT agentic coding, 73.4% SWE-bench",
    tier: "balanced",
    contextWindow: "128K",
    icon: "🟣",
    isFree: true,
  },
  "deepseek-chimera-free": {
    id: "deepseek-chimera-free",
    name: "DeepSeek Chimera (Free)",
    provider: "openrouter",
    description: "671B MoE, strong reasoning",
    tier: "powerful",
    contextWindow: "164K",
    icon: "🟣",
    isFree: true,
  },
  "grok-4-fast-free": {
    id: "grok-4-fast-free",
    name: "Grok 4 Fast (Free)",
    provider: "openrouter",
    description: "X.AI fast model",
    tier: "fast",
    contextWindow: "128K",
    icon: "🟣",
    isFree: true,
  },
  "venice-dolphin-free": {
    id: "venice-dolphin-free",
    name: "Venice Dolphin (Free)",
    provider: "openrouter",
    description: "Dolphin Mistral 24B, 199ms latency",
    tier: "fast",
    contextWindow: "32K",
    icon: "🟣",
    isFree: true,
  },
  "nemotron-free": {
    id: "nemotron-free",
    name: "Nemotron 70B (Free)",
    provider: "openrouter",
    description: "NVIDIA instruction-tuned",
    tier: "balanced",
    contextWindow: "131K",
    icon: "🟣",
    isFree: true,
  },
};

// FREE-FIRST STRATEGY: Use proven free models as default
// devstral-2-free: PROVEN 100% pass rate, 70s avg (fastest free)
// mimo-v2-flash-free: PROVEN 100% pass rate, 83s avg (reliable backup)
// Paid fallback: gemini-3-flash → gpt-5-nano → claude-haiku-4.5
export const DEFAULT_MODEL: ApprovedModel = "devstral-2-free";

// Fallback when free model fails
export const FALLBACK_MODEL: ApprovedModel = "gemini-3-flash";

// Model priority order for FREE-FIRST strategy
export const MODEL_PRIORITY_ORDER: ApprovedModel[] = [
  // PROVEN FREE (100% pass rate in eval)
  "devstral-2-free",      // Fastest free: 70s avg
  "mimo-v2-flash-free",   // Reliable free: 83s avg
  // CHEAP PAID (fallback)
  "gemini-3-flash",       // $0.50/M input, fast
  "gpt-5-nano",           // $0.10/M input, efficient
  "claude-haiku-4.5",     // $1.00/M input, reliable
];

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

