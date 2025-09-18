import { internal } from "../../_generated/api";

import { addThinkingStep, addToolCall } from "./agentThinking";
import { getOpenAI, safeChatCompletion, openAIModelFromContext, isOpenAI, getProvider } from "./openaiUtils";
import type { AgentState } from "./types";

export async function generateKnowledgeResponse(ctx: any, agentState: AgentState, message: string): Promise<string> {
  const { model } = agentState.context;
  try {
    await addThinkingStep(ctx, agentState, "execution", `Generating response using ${String(model).toUpperCase()}…`);

    const provider = getProvider(agentState.context);
    if (provider === "openai") {
      const OpenAI = await getOpenAI();
      const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const openaiModel = openAIModelFromContext(agentState.context);

      const messages = [
        agentState.context.uiSummary
          ? { role: "system", content: String(agentState.context.uiSummary) }
          : { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: message },
      ];

      const response =
        (await safeChatCompletion(openaiClient, { model: openaiModel, messages, temperature: 0.7 })) ||
        "I'm here to help, but I couldn't generate a response.";
      await addToolCall(ctx, agentState, "openai_generation", "Generated response", { message }, { response }, true);
      return response;
    } else if (provider === "gemini") {
      const { getGeminiKey } = await import("../../genai");
      const geminiKey = await getGeminiKey(ctx);
      if (!geminiKey) throw new Error("Gemini API key not configured");
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: geminiKey ?? undefined });
      const result = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [{ role: "user", parts: [{ text: message }] }],
      });
      try {
        await ctx.runMutation((internal as any).usage.incrementDailyUsage, { provider: "gemini" });
      } catch (e) {
        console.warn("[usage] incrementDailyUsage failed (gemini)", e);
      }
      const text = (result as any).text || "I'm here to help, but I couldn't generate a response.";
      await addToolCall(ctx, agentState, "gemini_generation", "Generated response", { message }, { response: text }, true);
      return text;
    } else {
      return "I'm here to help, but could not determine a provider.";
    }
  } catch (error) {
    await addToolCall(ctx, agentState, "knowledge_generation", "Failed to generate response", { message }, { error }, false);
    return `I understand you're asking about: "${message}". I'm experiencing some technical difficulties, but I'm here to help.`;
  }
}

export async function enhanceResponse(
  _ctx: any,
  agentState: AgentState,
  response: string,
  originalMessage: string,
): Promise<string> {
  const enhancementPrompt = `The user asked: "${originalMessage}"

Here is my current response:
"""
${response}
"""

Please enhance this response to be more helpful, detailed, and complete while maintaining accuracy. Add context, examples, or additional insights that would be valuable.`;

  try {
    if (isOpenAI(agentState.context)) {
      const OpenAI = await getOpenAI();
      const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const openaiModel = openAIModelFromContext(agentState.context);
      const messages: any[] = [];
      if (agentState.context.uiSummary) {
        messages.push({ role: "system", content: String(agentState.context.uiSummary) });
      }
      messages.push({ role: "user", content: enhancementPrompt });
      const enhanced = (await safeChatCompletion(openaiClient, { model: openaiModel, messages, temperature: 0.5 })) || response;
      return enhanced;
    }
    return response;
  } catch {
    return response;
  }
}

