"use node";

import { generateText } from "ai";
import type { LanguageModelUsage } from "ai";
import { AIMessage, HumanMessage, SystemMessage, ToolMessage } from "@langchain/core/messages";
import type { BaseMessage } from "@langchain/core/messages";
import { END, MessagesAnnotation, START, StateGraph } from "@langchain/langgraph/web";
import { getLanguageModelSafe } from "../../mcp_tools/models";
import type {
  AdapterInput,
  AdapterMessage,
  AdapterResult,
  SubAgentAdapter,
} from "../types";
import { DEFAULT_SDK_CONFIG } from "../types";

export interface LangGraphAdapterConfig {
  name: string;
  model?: string;
  systemPrompt?: string;
  maxIterations?: number;
}

function usageToTokenUsage(
  usage: LanguageModelUsage | undefined
): AdapterResult<unknown>["tokenUsage"] | undefined {
  const input = usage?.inputTokens;
  const output = usage?.outputTokens;
  if (typeof input !== "number" || typeof output !== "number") return undefined;
  return { input, output };
}

function toBaseMessages(
  input: AdapterInput,
  systemPrompt: string | undefined
): BaseMessage[] {
  const base: BaseMessage[] = [];

  if (systemPrompt && systemPrompt.trim().length > 0) {
    base.push(new SystemMessage(systemPrompt));
  }

  const history = input.messages ?? [];
  for (const msg of history) {
    if (msg.role === "system") {
      base.push(new SystemMessage(msg.content));
      continue;
    }

    if (msg.role === "user") {
      base.push(new HumanMessage(msg.content));
      continue;
    }

    if (msg.role === "assistant") {
      base.push(new AIMessage(msg.content));
      continue;
    }

    const toolCallId = msg.toolCallId ?? `tool_${Date.now()}`;
    base.push(new ToolMessage(msg.content, toolCallId, msg.toolName));
  }

  base.push(new HumanMessage(input.query));

  return base;
}

function baseMessagesToPrompt(messages: BaseMessage[]): string {
  return messages
    .map((m) => {
      const type = (m as any)._getType?.() ?? (m as any).getType?.();
      const role =
        type === "human"
          ? "user"
          : type === "ai"
            ? "assistant"
            : type === "system"
              ? "system"
              : type === "tool"
                ? "tool"
                : "user";

      const content =
        typeof (m as any).content === "string"
          ? (m as any).content
          : JSON.stringify((m as any).content);

      return `${role}: ${content}`;
    })
    .join("\n");
}

function adapterMessagesFromBaseMessages(messages: BaseMessage[]): AdapterMessage[] {
  return messages.map((m) => {
    const type = (m as any)._getType?.() ?? (m as any).getType?.();
    const role: AdapterMessage["role"] =
      type === "human"
        ? "user"
        : type === "ai"
          ? "assistant"
          : type === "system"
            ? "system"
            : type === "tool"
              ? "tool"
              : "user";

    const content =
      typeof (m as any).content === "string"
        ? (m as any).content
        : JSON.stringify((m as any).content);

    return {
      role,
      content,
      toolCallId: (m as any).tool_call_id,
      toolName: (m as any).name,
    };
  });
}

export function createLangGraphAdapter(
  config: LangGraphAdapterConfig
): SubAgentAdapter<AdapterInput, string> {
  const {
    name,
    model = DEFAULT_SDK_CONFIG.openai?.defaultModel || "gpt-5.2",
    systemPrompt,
    maxIterations = DEFAULT_SDK_CONFIG.langgraph?.maxIterations || 5,
  } = config;

  return {
    name,
    sdk: "langgraph",
    description: `LangGraph adapter: ${name}`,
    supportsHandoff: false,

    async execute(input: AdapterInput): Promise<AdapterResult<string>> {
      const startTime = Date.now();

      try {
        let lastUsage: LanguageModelUsage | undefined;

        const graph = new StateGraph(MessagesAnnotation)
          .addNode("agent", async (state) => {
            const prompt = baseMessagesToPrompt(state.messages);
            const result = await generateText({
              model: getLanguageModelSafe(model),
              prompt,
              maxRetries: 3,
            });
            lastUsage = result.totalUsage;
            return { messages: [new AIMessage(result.text)] };
          })
          .addEdge(START, "agent")
          .addEdge("agent", END)
          .compile();

        const initialMessages = toBaseMessages(input, systemPrompt);

        const output = await graph.invoke(
          { messages: initialMessages },
          {
            recursionLimit: maxIterations,
          }
        );

        const allMessages = output.messages ?? [];
        const lastMessage = allMessages[allMessages.length - 1];
        const answer =
          typeof (lastMessage as any)?.content === "string"
            ? ((lastMessage as any).content as string)
            : JSON.stringify((lastMessage as any)?.content ?? "");

        return {
          agentName: name,
          sdk: "langgraph",
          model,
          status: "success",
          result: answer,
          executionTimeMs: Date.now() - startTime,
          tokenUsage: usageToTokenUsage(lastUsage),
          messages: adapterMessagesFromBaseMessages(allMessages),
        };
      } catch (error) {
        return {
          agentName: name,
          sdk: "langgraph",
          model,
          status: "error",
          result: error instanceof Error ? error.message : String(error),
          executionTimeMs: Date.now() - startTime,
        };
      }
    },
  };
}
