// OpenAI helper utilities used by aiAgents.ts and lib modules

import type { AgentStateContext } from "./types";

export const GPT5_NANO = "gpt-5-nano";
export const GPT5_MINI = "gpt-5-mini";
export const isGpt5MiniOrNano = (m: string) => m === GPT5_NANO || m === GPT5_MINI;

export const isOpenAI = (context: Pick<AgentStateContext, "model"> | { model?: string }) => context?.model === "openai";
export const isGemini = (context: Pick<AgentStateContext, "model"> | { model?: string }) => context?.model === "gemini";
export const getProvider = (context: Pick<AgentStateContext, "model"> | { model?: string }): "openai" | "gemini" | undefined => {
  if (isOpenAI(context)) return "openai" as const;
  if (isGemini(context)) return "gemini" as const;
  return undefined;
};

export function openAIModelFromContext(context: Pick<AgentStateContext, "openaiVariant"> | { openaiVariant?: string }): string {
  return context?.openaiVariant ?? GPT5_NANO;
}

export async function getOpenAI(): Promise<any> {
  const OpenAI = (await import("openai")).default;
  return OpenAI;
}

/** Guarded Chat Completions (filters unsupported params for nano/mini) */
export async function safeChatCompletion(
  client: any,
  args: { model: string; messages: any[]; temperature?: number }
): Promise<string> {
  const { model, messages, temperature } = args;
  const payload: any = { model, messages };
  if (!isGpt5MiniOrNano(model) && typeof temperature === "number") {
    payload.temperature = temperature;
  }
  const resp = await client.chat.completions.create(payload);
  return resp.choices?.[0]?.message?.content?.trim() ?? "";
}
