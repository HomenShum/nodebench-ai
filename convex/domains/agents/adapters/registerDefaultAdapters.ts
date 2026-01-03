"use node";

import { getAdapter, registerAdapter } from "./registry";

let registrationPromise: Promise<void> | null = null;

export function ensureDefaultAdaptersRegistered(): Promise<void> {
  if (registrationPromise) return registrationPromise;

  registrationPromise = (async () => {
    if (
      getAdapter("DefaultAnthropicReasoning") ||
      getAdapter("DefaultOpenAIAgents") ||
      getAdapter("DefaultVercelAiSdk") ||
      getAdapter("DefaultLangGraph")
    ) {
      return;
    }

    const [anthropicModule, openaiModule, vercelModule, langgraphModule] =
      await Promise.all([
        import("./anthropic/anthropicReasoningAdapter"),
        import("./openai/openaiAgentsAdapter"),
        import("./vercel/vercelAiSdkAdapter"),
        import("./langgraph/langgraphAdapter"),
      ]);

    registerAdapter(
      anthropicModule.createAnthropicReasoningAdapter({
        name: "DefaultAnthropicReasoning",
        thinking: { enabled: false, budgetTokens: 0 },
        systemPrompt: "You are a helpful assistant. Answer concisely.",
      })
    );

    registerAdapter(
      openaiModule.createOpenAIAgentsAdapter({
        name: "DefaultOpenAIAgents",
        instructions: "You are a helpful assistant. Answer concisely.",
        model: "gpt-5-mini",
        maxTurns: 6,
      })
    );

    registerAdapter(
      vercelModule.createVercelAiSdkAdapter({
        name: "DefaultVercelAiSdk",
        model: "gpt-5-mini",
        systemPrompt: "You are a helpful assistant. Answer concisely.",
        maxSteps: 5,
      })
    );

    registerAdapter(
      langgraphModule.createLangGraphAdapter({
        name: "DefaultLangGraph",
        model: "gpt-5-mini",
        systemPrompt: "You are a helpful assistant. Answer concisely.",
        maxIterations: 5,
      })
    );
  })().catch((err) => {
    registrationPromise = null;
    throw err;
  });

  return registrationPromise;
}
