/**
 * Central registry for LLM model selection across providers.
 *
 * Defaults bias toward the gpt-5-nano series for OpenAI and
 * Gemini Flash / Flash Lite for Google, with legacy fallbacks
 * to keep existing flows working during migration.
 */
export type LlmProvider = "openai" | "gemini";

export type LlmTask =
  | "chat"
  | "agent"
  | "router"
  | "judge"
  | "analysis"
  | "vision"
  | "fileSearch"
  | "voice";

type ModelCatalog = Record<LlmProvider, Record<LlmTask, string[]>>;

export const llmModelCatalog: ModelCatalog = {
  openai: {
    chat: ["gpt-5-nano", "gpt-5-mini"],
    agent: ["gpt-5-nano", "gpt-5-mini"],
    router: ["gpt-5-nano", "gpt-5-mini"],
    judge: ["gpt-5-nano", "gpt-5-mini"],
    analysis: ["gpt-5-nano", "gpt-5-mini"],
    vision: ["gpt-5-mini"],
    fileSearch: ["gpt-5-nano", "gpt-5-mini"],
    voice: ["gpt-5-nano", "gpt-5-mini"],
  },
  gemini: {
    chat: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-3-pro-preview"],
    agent: ["gemini-2.5-pro", "gemini-2.5-flash"],
    router: ["gemini-2.5-flash-lite", "gemini-2.5-flash"],
    judge: ["gemini-2.5-flash-lite", "gemini-2.5-flash"],
    analysis: ["gemini-2.5-pro", "gemini-2.5-flash"],
    vision: ["gemini-2.5-flash-image", "gemini-2.5-flash"],
    fileSearch: ["gemini-2.5-flash", "gemini-2.5-flash-lite"],
    voice: ["gemini-2.5-flash-lite", "gemini-2.5-flash"],
  },
};

/**
 * Resolve the preferred model for a given task/provider with optional override.
 * Override wins; otherwise the first configured model for the task is returned.
 */
export function getLlmModel(
  task: LlmTask,
  provider: LlmProvider = "openai",
  override?: string | null | undefined
): string {
  if (override && override.trim().length > 0) return override.trim();
  const candidates = llmModelCatalog[provider]?.[task];
  if (!candidates || candidates.length === 0) {
    throw new Error(`No LLM model configured for task "${task}" and provider "${provider}"`);
  }
  return candidates[0];
}
