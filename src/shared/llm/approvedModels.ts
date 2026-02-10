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
  "claude-opus-4.6", // Anthropic flagship (Feb 5, 2026)
  "claude-opus-4.5", // Anthropic previous flagship
  "claude-sonnet-4.5", // Anthropic balanced
  "claude-haiku-4.5", // Anthropic fast
  "gemini-3-pro", // Google flagship
  "gemini-3-flash", // Google fast (DEFAULT)
  // OpenRouter priced models (Jan 2026)
  "glm-4.7-flash", // GLM 4.7 Flash - fast, agentic coding
  "glm-4.7", // GLM 4.7 - flagship reasoning/coding
  "deepseek-r1", // DeepSeek R1 - reasoning model
  "deepseek-v3.2-speciale", // DeepSeek V3.2 Speciale - agentic variant
  "deepseek-v3.2", // DeepSeek V3.2 - general purpose
  "qwen3-235b", // Qwen3 235B - tool calling
  "minimax-m2.1", // MiniMax M2.1 - agentic workflows
  "mistral-large", // Mistral Large - function calling
  // OpenRouter free-tier models (verified Feb 5, 2026 via API)
  "qwen3-coder-free", // Qwen3 Coder 480B MoE (A3.5B) - 262K, agentic coding
  "step-3.5-flash-free", // StepFun Step 3.5 Flash 196B MoE (11B) - 256K, reasoning
  "gpt-oss-120b-free", // OpenAI open-source 120B - 131K, tools
  "qwen3-next-free", // Qwen3 Next 80B A3B - 262K, tools
  "trinity-large-free", // Arcee Trinity Large 400B MoE (13B) - 131K, agentic
  "nemotron-3-nano-free", // NVIDIA Nemotron 3 Nano 30B A3B - 256K, tools
  "mistral-small-3.1-free", // Mistral Small 3.1 24B - 128K, tools
  "llama-3.3-70b-free", // Meta Llama 3.3 70B - 128K, tools
  "gemma-3-27b-free", // Google Gemma 3 27B - 131K, tools
  "gpt-oss-20b-free", // OpenAI open-source 20B - 131K, tools
  "trinity-mini-free", // Arcee Trinity Mini MoE - 131K, agentic
  "nemotron-nano-12b-vl-free", // NVIDIA Nemotron Nano 12B VL - 128K, vision+tools
  // Still available from Jan 2026
  "deepseek-r1-free", // DeepSeek R1 - reasoning model
  "glm-4.5-air-free", // GLM 4.5 Air - agent-focused
  "deepseek-chimera-free", // TNG R1T2 Chimera - 164K
  "venice-dolphin-free", // Venice Dolphin Mistral 24B
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
  "claude-opus-4.6": {
    id: "claude-opus-4.6",
    name: "Claude Opus 4.6",
    provider: "anthropic",
    description: "Latest flagship, agent teams, 1M context",
    tier: "powerful",
    contextWindow: "1M",
    icon: "🟠",
  },
  "claude-opus-4.5": {
    id: "claude-opus-4.5",
    name: "Claude Opus 4.5",
    provider: "anthropic",
    description: "Previous flagship",
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
  "glm-4.7-flash": {
    id: "glm-4.7-flash",
    name: "GLM 4.7 Flash",
    provider: "openrouter",
    description: "Cheap fast agentic coding (200K)",
    tier: "fast",
    contextWindow: "200K",
    icon: "OR",
  },
  "glm-4.7": {
    id: "glm-4.7",
    name: "GLM 4.7",
    provider: "openrouter",
    description: "Flagship reasoning/coding (203K)",
    tier: "balanced",
    contextWindow: "203K",
    icon: "OR",
  },
  "deepseek-r1": {
    id: "deepseek-r1",
    name: "DeepSeek R1",
    provider: "openrouter",
    description: "Reasoning model (164K)",
    tier: "powerful",
    contextWindow: "164K",
    icon: "OR",
  },
  "deepseek-v3.2-speciale": {
    id: "deepseek-v3.2-speciale",
    name: "DeepSeek V3.2 Speciale",
    provider: "openrouter",
    description: "Agentic variant, fast (164K)",
    tier: "fast",
    contextWindow: "164K",
    icon: "OR",
  },
  "deepseek-v3.2": {
    id: "deepseek-v3.2",
    name: "DeepSeek V3.2",
    provider: "openrouter",
    description: "General purpose (164K)",
    tier: "balanced",
    contextWindow: "164K",
    icon: "OR",
  },
  "qwen3-235b": {
    id: "qwen3-235b",
    name: "Qwen3 235B",
    provider: "openrouter",
    description: "Tool calling, huge model (131K)",
    tier: "powerful",
    contextWindow: "131K",
    icon: "OR",
  },
  "minimax-m2.1": {
    id: "minimax-m2.1",
    name: "MiniMax M2.1",
    provider: "openrouter",
    description: "Agentic workflows (197K)",
    tier: "balanced",
    contextWindow: "197K",
    icon: "OR",
  },
  "mistral-large": {
    id: "mistral-large",
    name: "Mistral Large",
    provider: "openrouter",
    description: "Function calling (131K)",
    tier: "powerful",
    contextWindow: "131K",
    icon: "OR",
  },
  "qwen3-coder-free": {
    id: "qwen3-coder-free",
    name: "Qwen3 Coder (Free)",
    provider: "openrouter",
    description: "480B MoE, agentic coding beast",
    tier: "powerful",
    contextWindow: "262K",
    icon: "🟣",
    isFree: true,
  },
  "step-3.5-flash-free": {
    id: "step-3.5-flash-free",
    name: "Step 3.5 Flash (Free)",
    provider: "openrouter",
    description: "196B MoE, reasoning + tools",
    tier: "balanced",
    contextWindow: "256K",
    icon: "🟣",
    isFree: true,
  },
  "gpt-oss-120b-free": {
    id: "gpt-oss-120b-free",
    name: "GPT-OSS 120B (Free)",
    provider: "openrouter",
    description: "OpenAI open-source 120B",
    tier: "powerful",
    contextWindow: "131K",
    icon: "🟣",
    isFree: true,
  },
  "qwen3-next-free": {
    id: "qwen3-next-free",
    name: "Qwen3 Next 80B (Free)",
    provider: "openrouter",
    description: "80B A3B, large context",
    tier: "balanced",
    contextWindow: "262K",
    icon: "🟣",
    isFree: true,
  },
  "trinity-large-free": {
    id: "trinity-large-free",
    name: "Trinity Large (Free)",
    provider: "openrouter",
    description: "Arcee 400B MoE, agentic coding",
    tier: "powerful",
    contextWindow: "131K",
    icon: "🟣",
    isFree: true,
  },
  "nemotron-3-nano-free": {
    id: "nemotron-3-nano-free",
    name: "Nemotron 3 Nano (Free)",
    provider: "openrouter",
    description: "NVIDIA 30B A3B, 256K context",
    tier: "fast",
    contextWindow: "256K",
    icon: "🟣",
    isFree: true,
  },
  "mistral-small-3.1-free": {
    id: "mistral-small-3.1-free",
    name: "Mistral Small 3.1 (Free)",
    provider: "openrouter",
    description: "24B, solid tool calling",
    tier: "fast",
    contextWindow: "128K",
    icon: "🟣",
    isFree: true,
  },
  "llama-3.3-70b-free": {
    id: "llama-3.3-70b-free",
    name: "Llama 3.3 70B (Free)",
    provider: "openrouter",
    description: "Meta proven workhorse",
    tier: "balanced",
    contextWindow: "128K",
    icon: "🟣",
    isFree: true,
  },
  "gemma-3-27b-free": {
    id: "gemma-3-27b-free",
    name: "Gemma 3 27B (Free)",
    provider: "openrouter",
    description: "Google open-source 27B",
    tier: "fast",
    contextWindow: "131K",
    icon: "🟣",
    isFree: true,
  },
  "gpt-oss-20b-free": {
    id: "gpt-oss-20b-free",
    name: "GPT-OSS 20B (Free)",
    provider: "openrouter",
    description: "OpenAI small open-source",
    tier: "fast",
    contextWindow: "131K",
    icon: "🟣",
    isFree: true,
  },
  "trinity-mini-free": {
    id: "trinity-mini-free",
    name: "Trinity Mini (Free)",
    provider: "openrouter",
    description: "Arcee lightweight agentic",
    tier: "fast",
    contextWindow: "131K",
    icon: "🟣",
    isFree: true,
  },
  "nemotron-nano-12b-vl-free": {
    id: "nemotron-nano-12b-vl-free",
    name: "Nemotron 12B VL (Free)",
    provider: "openrouter",
    description: "NVIDIA 12B, vision + tools",
    tier: "fast",
    contextWindow: "128K",
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
  "glm-4.5-air-free": {
    id: "glm-4.5-air-free",
    name: "GLM 4.5 Air (Free)",
    provider: "openrouter",
    description: "Zhipu agent-focused model",
    tier: "fast",
    contextWindow: "131K",
    icon: "🟣",
    isFree: true,
  },
  "deepseek-chimera-free": {
    id: "deepseek-chimera-free",
    name: "DeepSeek Chimera (Free)",
    provider: "openrouter",
    description: "TNG R1T2 Chimera, strong reasoning",
    tier: "powerful",
    contextWindow: "164K",
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
};

// FREE-FIRST STRATEGY: Use verified free models as default (Feb 2026)
// qwen3-coder-free: 480B MoE agentic coding, 262K context
// step-3.5-flash-free: 196B MoE reasoning, 256K context
// Paid fallback: gemini-3-flash → gpt-5-nano → claude-haiku-4.5
export const DEFAULT_MODEL: ApprovedModel = "qwen3-coder-free";

// Fallback when free model fails
export const FALLBACK_MODEL: ApprovedModel = "gemini-3-flash";

// Model priority order for FREE-FIRST strategy
export const MODEL_PRIORITY_ORDER: ApprovedModel[] = [
  // TOP FREE (verified available Feb 5, 2026)
  "qwen3-coder-free",       // 480B MoE, agentic coding
  "step-3.5-flash-free",    // 196B MoE, reasoning + tools
  "gpt-oss-120b-free",      // OpenAI open-source 120B
  "trinity-large-free",     // Arcee 400B MoE, agentic
  "nemotron-3-nano-free",   // NVIDIA 30B A3B, 256K
  // CHEAP PAID (fallback)
  "gemini-3-flash",         // $0.50/M input, fast
  "gpt-5-nano",             // $0.10/M input, efficient
  "claude-haiku-4.5",       // $1.00/M input, reliable
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
  openai: { bg: "bg-indigo-50", border: "border-indigo-200", text: "text-gray-700", icon: "🟢" },
  anthropic: { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700", icon: "🟠" },
  google: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", icon: "🔵" },
  openrouter: { bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-700", icon: "🟣" },
};
