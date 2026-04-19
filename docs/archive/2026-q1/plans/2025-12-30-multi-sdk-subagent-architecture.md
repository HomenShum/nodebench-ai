# Multi-SDK Sub-Agent Architecture Plan
**Date:** December 30, 2025
**Status:** Implementation Ready
**Author:** NodeBench AI Architecture Team
**SDK Documentation Version:** Latest (fetched via Context7 MCP)

---

## Executive Summary

This document outlines the architecture for spawning **native SDK sub-agents** from our Convex + Vercel AI SDK coordinator. The goal is to leverage each SDK's native strengths while maintaining unified orchestration through our existing `CoordinatorAgent`.

**Key SDKs Integrated:**
- `@convex-dev/agent` - Primary orchestration with Convex backend
- `@langchain/langgraph` - Stateful multi-agent workflows
- `@openai/agents` - OpenAI Agents SDK with handoffs
- `@anthropic-ai/sdk` - Extended thinking and tool use
- `ai` (Vercel AI SDK) - Unified LLM provider abstraction

**Supported Model Series:**
| Provider | Model Series | Variants | Use Case |
|----------|--------------|----------|----------|
| **OpenAI** | GPT-5.2 series | `gpt-5.2`, `gpt-5.2-pro`, `gpt-5.2-chat-latest`, `gpt-5-mini`, `gpt-5-nano` | General orchestration, reasoning, coding |
| **Anthropic** | Claude 4.5 series | `claude-opus-4-5`, `claude-sonnet-4-5`, `claude-haiku-4-5` | Extended thinking, agents, complex reasoning |
| **Google** | Gemini 2.5 + 3 Preview | `gemini-3.1-flash-lite-preview`, `gemini-2.5-pro`, `gemini-3-pro-preview`, `gemini-3-flash-preview` | Multi-modal, long context (1M+ tokens) |

---

## Current Architecture Analysis

### What We Have
```
CoordinatorAgent (Convex Agent SDK + Vercel AI SDK)
    ├── DocumentAgent (Convex Agent)
    ├── MediaAgent (Convex Agent)
    ├── SECAgent (Convex Agent)
    ├── OpenBBAgent (Convex Agent)
    └── EntityResearchAgent (Convex Agent)
```

**Current Stack:**
- **Orchestration:** `@convex-dev/agent` with `stepCountIs()` flow control
- **LLM Providers:** `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google`
- **Delegation:** `buildDelegationTools()` → synchronous sub-agent calls
- **Memory:** Convex-native thread/message persistence

### Limitations
1. All sub-agents use same SDK (Convex Agent) - no SDK-specific optimizations
2. No native support for LangGraph's state machines or CrewAI's role-based agents
3. Parallel delegation exists but lacks heterogeneous SDK support

---

## Target Architecture

### Hybrid Multi-SDK Orchestration
```
┌─────────────────────────────────────────────────────────────────┐
│                    CoordinatorAgent (Convex)                     │
│                   Primary Orchestrator Layer                     │
└─────────────────────────────┬───────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ Convex Agents │    │ LangGraph     │    │ OpenAI Agents │
│ (Document,    │    │ Workflows     │    │ SDK           │
│  Media, SEC)  │    │ (Research,    │    │ (Handoffs,    │
│               │    │  Analysis)    │    │  Guardrails)  │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ Anthropic     │    │ Vercel AI SDK │    │ Custom        │
│ (Extended     │    │ (Multi-step   │    │ Adapters      │
│  Thinking)    │    │  Agents)      │    │               │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              ▼
                    ┌─────────────────┐
                    │ Unified Result  │
                    │ Aggregation     │
                    └─────────────────┘
```

---

## SDK Integration Specifications

### 1. Convex Agent SDK (Primary Orchestrator)

**Package:** `@convex-dev/agent`
**Documentation:** https://github.com/get-convex/agent
**Use Case:** Primary orchestration, thread management, tool delegation

#### Creating Agents with Tools (Official Pattern)

```typescript
// convex/domains/agents/core/coordinatorAgent.ts
import { Agent, createTool, stepCountIs } from "@convex-dev/agent";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { components, internal } from "../../../_generated/api";

// Tool with database access (official pattern)
const searchMessages = createTool({
  description: "Search messages in other threads for the user",
  args: z.object({
    query: z.string().describe("The search query"),
  }),
  handler: async (ctx, args) => {
    // ctx includes: agent, userId, threadId, messageId, and full action ctx
    const results = await ctx.runQuery(internal.search.searchUserMessages, {
      userId: ctx.userId!,
      query: args.query,
      limit: 5,
    });
    return results.map(m => m.message.content).join("\n");
  },
});

// Tool that calls another agent (sub-agent pattern)
const delegateToWeatherAgent = createTool({
  description: "Get weather-based fashion advice",
  args: z.object({
    location: z.string(),
  }),
  handler: async (ctx, args) => {
    // Create a sub-thread for the tool
    const { threadId } = await ctx.agent!.createThread(ctx, {
      userId: ctx.userId,
      title: `Weather advice for ${args.location}`,
    });

    // Use another agent
    const result = await weatherAgent.generateText(
      ctx,
      { threadId },
      { prompt: `What's the weather in ${args.location}?` },
    );

    return result.text;
  },
});

// Create the coordinator agent
export const coordinatorAgent = new Agent(components.agent, {
  name: "CoordinatorAgent",
  languageModel: openai.chat("gpt-5.2"),  // GPT-5.2 flagship model
  textEmbeddingModel: openai.embedding("text-embedding-3-large"),
  instructions: `You are a coordinator agent that orchestrates specialized sub-agents.`,
  tools: {
    searchMessages,
    delegateToWeatherAgent,
  },
  stopWhen: stepCountIs(15),
});
```

#### Convex Agent Handoff Pattern (Tool-as-Agent)

```typescript
// Official pattern: Agent as a Tool for delegation
const agentTool = createTool({
  description: `Ask a question to agent ${agent.name}`,
  args: z.object({
    message: z.string().describe("The message to ask the agent"),
  }),
  handler: async (ctx, args, options): Promise<string> => {
    const { userId } = ctx;
    const { thread } = await agent.createThread(ctx, { userId });
    const result = await thread.generateText(
      {
        // Pass through all messages from the current generation
        prompt: [...options.messages, { role: "user", content: args.message }],
      },
      // Save all the messages from the current generation to this thread
      { storageOptions: { saveMessages: "all" } },
    );
    // Optionally associate the child thread with the parent thread
    await saveThreadAsChild(ctx, ctx.threadId, thread.threadId);
    return result.text;
  },
});
```

#### Thread Management (Create & Continue)

```typescript
import { action, mutation } from "./_generated/server";
import { v } from "convex/values";

// Create a new thread from an action
export const createNewThread = action({
  args: { userId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { threadId, thread } = await agent.createThread(ctx, {
      userId: args.userId,
      title: "New Conversation",
      summary: "User asking about weather",
    });

    // Use thread object to generate text immediately
    const result = await thread.generateText({
      prompt: "What's the weather like?",
    });

    return { threadId, response: result.text };
  },
});

// Continue an existing thread
export const continueConversation = action({
  args: { threadId: v.string(), userId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { thread } = await agent.continueThread(ctx, {
      threadId: args.threadId,
      userId: args.userId,
    });

    const result = await thread.generateText({
      prompt: "Tell me more",
    });

    return result.text;
  },
});
```

---

### 2. OpenAI Agents SDK (Native Handoffs)

**Package:** `@openai/agents`
**Documentation:** https://github.com/openai/openai-agents-js
**Use Case:** Multi-agent handoffs, guardrails, structured outputs

#### Basic Agent with Handoffs (Official Pattern)

```typescript
// convex/domains/agents/adapters/openai/triageAgent.ts
import { Agent, handoff, run } from '@openai/agents';
import { z } from 'zod';

// Create specialist agents
const billingAgent = new Agent({
  name: 'Billing agent',
  instructions: 'You handle billing questions and payment issues.',
});

const refundAgent = new Agent({
  name: 'Refund agent',
  instructions: 'You process refund requests politely and efficiently.',
  outputType: z.object({
    refundApproved: z.boolean(),
    refundAmount: z.number().optional(),
  }),
});

// Triage agent with handoffs - use Agent.create() for proper type inference
const triageAgent = Agent.create({
  name: 'Triage agent',
  instructions: `Help the user with their questions.
If the user asks about billing, hand off to the billing agent.
If the user asks about refunds, hand off to the refund agent.`,
  handoffs: [billingAgent, handoff(refundAgent)],
});

// Execute with run()
export async function handleCustomerQuery(userMessage: string) {
  const result = await run(triageAgent, userMessage);

  // finalOutput type is union of all possible outputs
  const output = result.finalOutput;
  // ^? { refundApproved: boolean; refundAmount?: number } | string | undefined

  return output;
}
```

#### Manager Pattern (Agents as Tools)

```typescript
// Manager agent orchestrates specialists as tools (never relinquishes control)
import { Agent } from '@openai/agents';

const bookingAgent = new Agent({
  name: 'Booking expert',
  instructions: 'Answer booking questions and modify reservations.',
});

const refundAgent = new Agent({
  name: 'Refund expert',
  instructions: 'Help customers process refunds and credits.',
});

// Manager uses specialists as tools
const customerFacingAgent = new Agent({
  name: 'Customer-facing agent',
  instructions:
    'Talk to the user directly. When they need booking or refund help, call the matching tool.',
  tools: [
    bookingAgent.asTool({
      toolName: 'booking_expert',
      toolDescription: 'Handles booking questions and requests.',
    }),
    refundAgent.asTool({
      toolName: 'refund_expert',
      toolDescription: 'Handles refund questions and requests.',
    }),
  ],
});
```

---

### 3. LangGraph.js (Stateful Workflows with Handoffs)

**Package:** `@langchain/langgraph`
**Documentation:** https://github.com/langchain-ai/langgraphjs
**Use Case:** Multi-step research, state machines, conditional routing

#### Supervisor Architecture (Official Pattern)

```typescript
// convex/domains/agents/adapters/langgraph/supervisorWorkflow.ts
import {
  StateGraph,
  MessagesAnnotation,
  Command,
} from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";

const model = new ChatOpenAI({ model: "gpt-5.2" });  // GPT-5.2 flagship

// Supervisor node - decides which agent to call next
const supervisor = async (state: typeof MessagesAnnotation.State) => {
  // Call model with structured output to determine next agent
  const response = await model.withStructuredOutput({
    next_agent: z.enum(["agent1", "agent2", "__end__"]),
  }).invoke(state.messages);

  // Route to agent or exit
  return new Command({
    goto: response.next_agent,
  });
};

// Worker agent 1
const agent1 = async (state: typeof MessagesAnnotation.State) => {
  const response = await model.invoke(state.messages);
  return new Command({
    goto: "supervisor",  // Return control to supervisor
    update: {
      messages: [response],
    },
  });
};

// Worker agent 2
const agent2 = async (state: typeof MessagesAnnotation.State) => {
  const response = await model.invoke(state.messages);
  return new Command({
    goto: "supervisor",
    update: {
      messages: [response],
    },
  });
};

// Build the graph
const graph = new StateGraph(MessagesAnnotation)
  .addNode("supervisor", supervisor, {
    ends: ["agent1", "agent2", "__end__"],
  })
  .addNode("agent1", agent1, {
    ends: ["supervisor"],
  })
  .addNode("agent2", agent2, {
    ends: ["supervisor"],
  })
  .addEdge("__start__", "supervisor")
  .compile();
```

#### Custom Handoff Tool (LangGraph Swarm Pattern)

```typescript
// convex/domains/agents/adapters/langgraph/handoffTool.ts
import { z } from "zod";
import { BaseMessage, ToolMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { Command, getCurrentTaskInput } from "@langchain/langgraph";

const createCustomHandoffTool = ({
  agentName,
  toolName,
  toolDescription,
}: {
  agentName: string;
  toolName: string;
  toolDescription: string;
}) => {
  const handoffTool = tool(
    async (args, config) => {
      const toolMessage = new ToolMessage({
        content: `Successfully transferred to ${agentName}`,
        name: toolName,
        tool_call_id: config.toolCall.id,
      });

      const { messages } = getCurrentTaskInput() as { messages: BaseMessage[] };
      const lastAgentMessage = messages[messages.length - 1];

      return new Command({
        goto: agentName,
        graph: Command.PARENT,
        update: {
          messages: [lastAgentMessage, toolMessage],
          activeAgent: agentName,
          taskDescription: args.taskDescription,
        },
      });
    },
    {
      name: toolName,
      schema: z.object({
        taskDescription: z.string().describe(
          "Detailed description of what the next agent should do"
        ),
      }),
      description: toolDescription,
    }
  );

  return handoffTool;
};
```

#### Multi-Agent Swarm with Memory

```typescript
// convex/domains/agents/adapters/langgraph/researchSwarm.ts
import { ChatOpenAI } from "@langchain/openai";
import { MemorySaver } from "@langchain/langgraph";
import { createSwarm, createHandoffTool } from "@langchain/langgraph-swarm";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

const model = new ChatOpenAI({ modelName: "gpt-5.2" });  // GPT-5.2 flagship

// Research tool
const searchWeb = tool(
  async (args) => `Search results for: ${args.query}`,
  {
    name: "search_web",
    description: "Search the web for information.",
    schema: z.object({ query: z.string() }),
  }
);

// Create agents with handoff tools
const researchAgent = createAgent({
  llm: model,
  tools: [searchWeb, createHandoffTool({ agentName: "Analyst" })],
  name: "Researcher",
  prompt: "You are a research specialist. Gather information thoroughly.",
});

const analystAgent = createAgent({
  llm: model,
  tools: [createHandoffTool({
    agentName: "Researcher",
    description: "Transfer back to Researcher for more data"
  })],
  name: "Analyst",
  prompt: "You are an analyst. Synthesize research into insights.",
});

// Create swarm with checkpointing
const checkpointer = new MemorySaver();
const workflow = createSwarm({
  agents: [researchAgent, analystAgent],
  defaultActiveAgent: "Researcher",
});

export const researchSwarm = workflow.compile({ checkpointer });

// Usage with memory
const config = { configurable: { thread_id: "research-session-1" } };
const result = await researchSwarm.invoke(
  { messages: [{ role: "user", content: "Research AI agent frameworks" }] },
  config
);
```

---

### 4. Anthropic SDK (Extended Thinking & Tool Use)

**Package:** `@anthropic-ai/sdk`
**Documentation:** https://github.com/anthropics/anthropic-sdk-typescript
**Use Case:** Complex reasoning, chain-of-thought, tool execution

#### Extended Thinking (Deep Reasoning)

```typescript
// convex/domains/agents/adapters/anthropic/deepReasoningAgent.ts
import Anthropic from "@anthropic-ai/sdk";

export async function runDeepReasoningAgent(
  problem: string,
  budgetTokens: number = 10000
): Promise<{ thinking: string; answer: string }> {
  const anthropic = new Anthropic();

  // Extended thinking requires specific model and parameters
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5",  // Claude 4.5 Sonnet - best for agents and coding
    max_tokens: 16000,
    thinking: {
      type: "enabled",
      budget_tokens: budgetTokens,  // Token budget for thinking (1024-32000)
    },
    messages: [{ role: "user", content: problem }],
  });

  let thinking = "";
  let answer = "";

  // Parse thinking and text blocks from response
  for (const block of response.content) {
    if (block.type === "thinking") {
      thinking = block.thinking;  // Internal reasoning trace
    }
    if (block.type === "text") {
      answer = block.text;  // Final answer
    }
  }

  return { thinking, answer };
}
```

#### Tool Use with Zod Schemas (Official Pattern)

```typescript
// convex/domains/agents/adapters/anthropic/toolAgent.ts
import Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers";
import { z } from "zod";

const anthropic = new Anthropic();

// Define tool with Zod schema
const weatherTool = betaZodTool({
  name: "get_weather",
  inputSchema: z.object({
    location: z.string(),
  }),
  description: "Get the current weather in a given location",
  run: (input) => {
    return `The weather in ${input.location} is foggy and 60°F`;
  },
});

// Run with automatic tool execution
export async function runWithTools(userMessage: string) {
  const finalMessage = await anthropic.beta.messages.toolRunner({
    model: "claude-sonnet-4-5",  // Claude 4.5 Sonnet
    max_tokens: 1000,
    messages: [{ role: "user", content: userMessage }],
    tools: [weatherTool],
  });

  return finalMessage;
}
```

#### Streaming Tool Execution

```typescript
// Streaming with tool calls
const runner = anthropic.beta.messages.toolRunner({
  model: "claude-sonnet-4-5",  // Claude 4.5 Sonnet
  max_tokens: 1000,
  messages: [{ role: "user", content: "What is the weather in San Francisco?" }],
  tools: [weatherTool],
  stream: true,
});

// Process streamed events
for await (const messageStream of runner) {
  for await (const event of messageStream) {
    console.log("event:", event);
  }
  console.log("message:", await messageStream.finalMessage());
}
```

---

### 5. Vercel AI SDK (Multi-Step Agents)

**Package:** `ai`
**Documentation:** https://sdk.vercel.ai
**Use Case:** Multi-provider abstraction, streaming, tool loops

#### Multi-Tool Agent with Step Control

```typescript
// convex/domains/agents/adapters/vercel/weatherAgent.ts
import { streamText, tool, stepCountIs } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const weatherAgent = async (userMessage: string) => {
  const result = streamText({
    model: openai("gpt-5-mini"),  // GPT-5 mini - fast and cost-effective
    messages: [{ role: "user", content: userMessage }],
    tools: {
      weather: tool({
        description: "Get the weather in a location (fahrenheit)",
        inputSchema: z.object({
          location: z.string().describe("The location to get the weather for"),
        }),
        execute: async ({ location }) => {
          const temperature = Math.round(Math.random() * (90 - 32) + 32);
          return { location, temperature };
        },
      }),
      convertFahrenheitToCelsius: tool({
        description: "Convert a temperature in fahrenheit to celsius",
        inputSchema: z.object({
          temperature: z.number().describe("The temperature in fahrenheit"),
        }),
        execute: async ({ temperature }) => {
          const celsius = Math.round((temperature - 32) * (5 / 9));
          return { celsius };
        },
      }),
    },
    stopWhen: stepCountIs(5),  // Max 5 tool call steps
    onStepFinish: async ({ toolResults }) => {
      if (toolResults.length) {
        console.log(JSON.stringify(toolResults, null, 2));
      }
    },
  });

  return result;
};
```

#### Multi-Step Workflow with Writer Merging

```typescript
// Server-side multi-step agent workflow
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  tool,
} from "ai";
import { z } from "zod";

export async function POST(req: Request) {
  const { messages } = await req.json();

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      // Step 1: Extract user goal with forced tool call
      const result1 = streamText({
        model: openai("gpt-5-mini"),  // GPT-5 mini for fast extraction
        system: "Extract the user goal from the conversation.",
        messages,
        toolChoice: "required",
        tools: {
          extractGoal: tool({
            inputSchema: z.object({ goal: z.string() }),
            execute: async ({ goal }) => goal,
          }),
        },
      });

      // Forward without finish event
      writer.merge(result1.toUIMessageStream({ sendFinish: false }));

      // Step 2: Continue with different model/prompt
      const result2 = streamText({
        model: openai("gpt-5.2"),  // GPT-5.2 flagship for complex response
        system: "Repeat the extracted user goal in your answer.",
        messages: [
          ...convertToModelMessages(messages),
          ...(await result1.response).messages,
        ],
      });

      // Forward with finish event
      writer.merge(result2.toUIMessageStream({ sendStart: false }));
    },
  });

  return createUIMessageStreamResponse({ stream });
}
```

#### Multi-Provider Model Selection (Including Gemini 3)

```typescript
// Vercel AI SDK allows seamless provider switching
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { generateText } from "ai";

// Model resolver for dynamic provider selection
const models = {
  // OpenAI GPT-5.2 series
  "gpt-5.2": openai("gpt-5.2"),                     // Flagship model (best for complex tasks)
  "gpt-5.2-pro": openai("gpt-5.2-pro"),             // Enhanced thinking, more compute (not yet available)
  "gpt-5.2-chat-latest": openai("gpt-5.2-chat-latest"), // Powers ChatGPT
  "gpt-5-mini": openai("gpt-5-mini"),               // Smaller/faster model
  "gpt-5-nano": openai("gpt-5-nano"),               // Ultra-efficient

  // Anthropic Claude 4.5 series
  "claude-opus-4-5": anthropic("claude-opus-4-5"),           // Premium/most capable
  "claude-sonnet-4-5": anthropic("claude-sonnet-4-5"),       // Best for agents and coding
  "claude-haiku-4-5": anthropic("claude-haiku-4-5"),         // Fast/compact with thinking

  // Google Gemini 2.5 + 3 Preview series
  "gemini-3.1-flash-lite-preview": google("gemini-3.1-flash-lite-preview"),             // Fast multimodal (1M+ tokens)
  "gemini-2.5-pro": google("gemini-2.5-pro"),                 // General purpose
  "gemini-3-pro-preview": google("gemini-3-pro-preview"),     // Preview of Gemini 3
  "gemini-3-flash-preview": google("gemini-3-flash-preview"), // Preview of Gemini 3 flash
};

// Use Gemini 2.5 Flash for long-context tasks (1M+ tokens)
const longContextAgent = async (userMessage: string, context: string) => {
  const result = await generateText({
    model: google("gemini-3.1-flash-lite-preview"),  // Gemini 2.5 Flash - 1M+ token context
    messages: [
      { role: "system", content: `Analyze the following context:\n${context}` },
      { role: "user", content: userMessage },
    ],
  });
  return result.text;
};

// Multi-modal with Gemini 3 Flash Preview
const multiModalAgent = async (prompt: string, imageUrl: string) => {
  const result = await generateText({
    model: google("gemini-3-flash-preview"),  // Gemini 3 Flash preview - fast multimodal
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image", image: new URL(imageUrl) },
        ],
      },
    ],
  });
  return result.text;
};
```

---

## Handoff Patterns Reference

### Pattern 1: Convex Agent Sub-Thread Handoff

```typescript
// Parent agent creates child thread for sub-agent
const parentTool = createTool({
  description: "Delegate to specialist agent",
  args: z.object({ task: z.string() }),
  handler: async (ctx, args) => {
    const { thread } = await specialistAgent.createThread(ctx, {
      userId: ctx.userId,
    });
    const result = await thread.generateText({
      prompt: args.task,
    });
    return result.text;
  },
});
```

### Pattern 2: OpenAI Agents SDK Handoff

```typescript
// Declarative handoff configuration
const triageAgent = Agent.create({
  name: "Triage",
  handoffs: [billingAgent, refundAgent],  // Agents to hand off to
});
```

### Pattern 3: LangGraph Command-Based Handoff

```typescript
// Explicit routing with Command
return new Command({
  goto: "next_agent_name",
  graph: Command.PARENT,  // Route to parent graph
  update: { messages: [...] },
});
```

### Pattern 4: Custom Adapter Handoff (Our Implementation)

```typescript
// Universal handoff through adapter registry
const handoffResult = await getAdapter(targetAgent).execute({
  query: delegatedTask,
  context: conversationContext,
  parentThreadId: currentThreadId,
});
```

---

## Adapter Layer Architecture

### Universal Sub-Agent Adapter Interface

```typescript
// convex/domains/agents/adapters/types.ts
export interface SubAgentAdapter<TInput, TOutput> {
  name: string;
  sdk: "convex" | "langgraph" | "openai" | "anthropic" | "vercel";

  execute(input: TInput): Promise<TOutput>;

  // Handoff support
  supportsHandoff: boolean;
  handoff?(targetAgent: string, context: HandoffContext): Promise<TOutput>;

  // Optional lifecycle hooks
  onStart?(input: TInput): Promise<void>;
  onComplete?(output: TOutput): Promise<void>;
  onError?(error: Error): Promise<void>;
}

export interface HandoffContext {
  parentThreadId?: string;
  userId?: string;
  messages: Message[];
  metadata?: Record<string, unknown>;
}

export interface DelegationResult {
  agentName: string;
  sdk: string;
  status: "success" | "error" | "timeout" | "handoff";
  result: unknown;
  executionTimeMs: number;
  tokenUsage?: { input: number; output: number };
  handoffTarget?: string;  // If handoff occurred
}
```

---

## Implementation Phases

### Phase 1: Adapter Foundation (Week 1)

| Task | Priority | Effort |
|------|----------|--------|
| Create `adapters/types.ts` with universal interface | P0 | 2h |
| Implement adapter registry pattern | P0 | 2h |
| Wrap existing Convex agents as adapters | P0 | 4h |
| Add execution timing and error handling | P1 | 2h |
| **Implement Convex sub-thread handoff pattern** | P0 | 3h |

**Deliverable:** All existing agents accessible through adapter interface with handoff support

### Phase 2: LangGraph Integration (Week 2)

| Task | Priority | Effort |
|------|----------|--------|
| Install `@langchain/langgraph` | P0 | 1h |
| Create research workflow graph | P0 | 4h |
| Implement state persistence bridge | P1 | 3h |
| Add conditional branching for confidence loops | P1 | 2h |
| **Implement Command-based handoff between nodes** | P0 | 3h |
| **Create supervisor pattern for multi-agent routing** | P1 | 4h |

**Deliverable:** Working LangGraph research workflow with supervisor handoffs

### Phase 3: OpenAI Agents SDK Integration (Week 2-3)

| Task | Priority | Effort |
|------|----------|--------|
| Install `@openai/agents` package | P0 | 1h |
| Create triage agent with handoffs | P0 | 3h |
| Implement specialist agents (billing, refund) | P0 | 4h |
| **Configure declarative handoff patterns** | P0 | 2h |
| **Implement manager pattern (agents-as-tools)** | P1 | 3h |
| Add guardrails for input/output validation | P1 | 2h |

**Deliverable:** OpenAI Agents SDK with native handoffs for customer support flows

### Phase 4: Anthropic Extended Thinking (Week 3)

| Task | Priority | Effort |
|------|----------|--------|
| Create deep reasoning adapter | P0 | 2h |
| Implement thinking budget management | P1 | 2h |
| Add thinking trace capture for debugging | P2 | 2h |
| **Integrate betaZodTool for type-safe tool use** | P1 | 2h |

**Deliverable:** Claude extended thinking available for complex reasoning tasks

### Phase 5: Unified Orchestration (Week 4)

| Task | Priority | Effort |
|------|----------|--------|
| Implement `delegateToMultipleSdks` tool | P0 | 4h |
| Add SDK-aware routing logic | P0 | 3h |
| Create result aggregation utilities | P1 | 2h |
| Add telemetry and cost tracking | P1 | 3h |
| **Implement cross-SDK handoff bridge** | P0 | 4h |
| **Create handoff context serialization** | P1 | 2h |

**Deliverable:** Coordinator can spawn any SDK sub-agent with seamless handoffs

---

## SDK Selection Matrix

| Task Type | Primary SDK | Rationale |
|-----------|-------------|-----------|
| Document ops (CRUD, search) | Convex Agent | Native DB access, existing tools |
| Multi-step research | LangGraph | State machines, conditional loops |
| Code analysis | OpenAI Agents SDK | Handoffs, guardrails, structured output |
| Complex reasoning | Anthropic | Extended thinking, chain-of-thought |
| Financial data | Convex Agent | OpenBB tools integration |
| Media discovery | Convex Agent | Existing YouTube/image tools |
| Customer support triage | OpenAI Agents SDK | Native handoff patterns |
| Multi-provider abstraction | Vercel AI SDK | Unified interface, streaming |

---

## SDK Comparison Table

| Feature | Convex Agent | OpenAI Agents SDK | LangGraph | Anthropic SDK | Vercel AI SDK |
|---------|--------------|-------------------|-----------|---------------|---------------|
| **Handoff Pattern** | Tool-as-Agent | `handoff()` declarative | `Command.goto()` | Manual | N/A |
| **State Persistence** | Native (Convex DB) | Thread-based | Checkpointer | Stateless | Stateless |
| **Multi-Agent** | Sub-threads | Handoffs + Manager | Supervisor/Swarm | N/A | Multi-step |
| **Streaming** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Tool Execution** | `createTool()` | `tool()` | `tool()` | `betaZodTool()` | `tool()` |
| **Guardrails** | Custom | Built-in | Custom | N/A | Custom |
| **Extended Thinking** | Via Anthropic | ❌ | ❌ | ✅ Native | Via Anthropic |
| **Code Execution** | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Best For** | DB-integrated agents | Customer support | Research workflows | Deep reasoning | Multi-provider |

### Handoff Mechanism Comparison

| SDK | Handoff Syntax | Control Flow | State Transfer |
|-----|----------------|--------------|----------------|
| **Convex Agent** | `agent.createThread()` + `thread.generateText()` | Parent retains control | Via thread context |
| **OpenAI Agents** | `handoffs: [agent1, agent2]` | Target agent takes over | Automatic message passing |
| **LangGraph** | `Command({ goto: "agent_name" })` | Graph-controlled routing | State annotation |
| **Anthropic** | Manual tool chaining | Caller controls | Via tool results |
| **Vercel AI** | `writer.merge()` for multi-step | Sequential steps | Message accumulation |

---

## Configuration Schema

```typescript
// convex/domains/agents/adapters/config.ts
export const SDK_CONFIG = {
  // Model Configuration by Provider
  models: {
    // OpenAI GPT-5.2 series
    openai: {
      default: "gpt-5.2",               // Flagship model (best for complex tasks)
      chat: "gpt-5.2-chat-latest",      // Powers ChatGPT
      fast: "gpt-5-mini",               // Smaller/faster model
      nano: "gpt-5-nano",               // Ultra-efficient
      premium: "gpt-5.2-pro",           // Enhanced thinking (not yet available)
    },
    // Anthropic Claude 4.5 series
    anthropic: {
      default: "claude-sonnet-4-5",     // Best for agents and coding
      fast: "claude-haiku-4-5",         // Fast/compact with thinking
      premium: "claude-opus-4-5",       // Premium/most capable
    },
    // Google Gemini 2.5 + 3 Preview series
    google: {
      default: "gemini-2.5-pro",        // General purpose
      fast: "gemini-3.1-flash-lite-preview",         // Fast multimodal (1M+ tokens)
      preview: "gemini-3-pro-preview",  // Preview of Gemini 3
      previewFast: "gemini-3-flash-preview", // Preview of Gemini 3 flash
    },
  },

  langgraph: {
    maxIterations: 5,
    checkpointStore: "convex", // Use Convex for state persistence
    defaultModel: "gpt-5.2",  // GPT-5.2 flagship for supervisor
  },
  openai: {
    assistantCacheMinutes: 60,
    maxConcurrentThreads: 10,
    defaultModel: "gpt-5.2",  // GPT-5.2 flagship
  },
  anthropic: {
    defaultThinkingBudget: 8000,
    maxThinkingBudget: 32000,
    defaultModel: "claude-sonnet-4-5",  // Claude 4.5 Sonnet - best for agents
  },
  google: {
    maxContextTokens: 1048576,  // Gemini 2.5 Flash supports 1M+ tokens
    defaultModel: "gemini-3.1-flash-lite-preview",  // Gemini 2.5 Flash - fast multimodal
  },
  routing: {
    // Keywords that trigger specific SDKs/models
    langgraphTriggers: ["research", "investigate", "deep dive", "multi-step"],
    openaiTriggers: ["code", "analyze code", "execute", "run python"],
    anthropicTriggers: ["reason", "think through", "complex", "explain why"],
    geminiTriggers: ["long document", "multi-modal", "image", "video", "large context"],
  },
};
```

---

## Risk Mitigation

### Cost Control
- **Budget caps:** Per-request token limits by SDK
- **Caching:** LangGraph checkpoints, assistant reuse
- **Fallback:** Degrade to Convex agents if external SDKs fail

### Latency Management
- **Timeouts:** 30s default, configurable per adapter
- **Parallel execution:** Run independent sub-agents concurrently
- **Early termination:** Cancel slow branches if faster ones succeed

### Error Handling
```typescript
// Unified error types
export class SubAgentError extends Error {
  constructor(
    public agentName: string,
    public sdk: string,
    public originalError: Error,
    public retryable: boolean = true
  ) {
    super(`[${sdk}/${agentName}] ${originalError.message}`);
  }
}
```

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Research quality | +20% relevance | User feedback scores |
| Code analysis accuracy | 95% | Validated against manual review |
| Response latency (p95) | <15s | Telemetry |
| Cost per complex task | <$0.50 | Token tracking |

---

## Dependencies

### New Packages Required
```json
{
  "@langchain/langgraph": "^0.2.x",
  "@langchain/langgraph-swarm": "^0.0.x",
  "@langchain/openai": "^0.3.x",
  "@langchain/core": "^0.3.x",
  "@openai/agents": "^0.1.x"
}
```

### Existing Packages (Already Installed)
- `openai` - OpenAI API client
- `@anthropic-ai/sdk` - Claude extended thinking & tool use
- `@convex-dev/agent` - Core orchestration with sub-threads
- `ai` - Vercel AI SDK core
- `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google` - Vercel AI SDK providers

---

## Next Steps

1. **Immediate:** Review and approve architecture
2. **Week 1:** Implement adapter foundation + Convex handoff patterns
3. **Week 2:** LangGraph supervisor + OpenAI Agents SDK handoffs
4. **Week 3:** Anthropic extended thinking + cross-SDK bridge
5. **Week 4:** Testing, optimization, documentation

---

## Appendix: File Structure

```
convex/domains/agents/
├── adapters/
│   ├── types.ts              # Universal adapter interface with handoff support
│   ├── registry.ts           # Adapter registration
│   ├── handoffBridge.ts      # Cross-SDK handoff serialization
│   ├── langgraph/
│   │   ├── researchWorkflow.ts
│   │   ├── supervisorGraph.ts    # Supervisor pattern
│   │   ├── swarmWorkflow.ts      # Multi-agent swarm
│   │   └── checkpointBridge.ts
│   ├── openai/
│   │   ├── triageAgent.ts        # Handoff-enabled triage
│   │   ├── specialistAgents.ts   # Billing, refund specialists
│   │   └── managerAgent.ts       # Agents-as-tools pattern
│   ├── anthropic/
│   │   ├── deepReasoningAgent.ts
│   │   └── toolAgent.ts          # betaZodTool integration
│   └── vercel/
│       └── multiStepAgent.ts     # Writer merging pattern
├── core/
│   ├── coordinatorAgent.ts   # Updated with multi-SDK delegation
│   └── delegation/
│       ├── delegationTools.ts
│       ├── multiSdkDelegation.ts
│       └── handoffContext.ts     # Handoff state management
└── mcp_tools/
    └── models/               # Existing model resolver
```

---

## Enhanced Delegation Tools

### Adapter Registry (Complete Implementation)

```typescript
// convex/domains/agents/adapters/registry.ts
import { SubAgentAdapter } from "./types";

const adapterRegistry = new Map<string, SubAgentAdapter<unknown, unknown>>();

export function registerAdapter(adapter: SubAgentAdapter<unknown, unknown>) {
  adapterRegistry.set(adapter.name, adapter);
}

export function getAdapter(name: string) {
  return adapterRegistry.get(name);
}

export function listAdapters(): string[] {
  return Array.from(adapterRegistry.keys());
}

// Pre-register adapters at module load
registerAdapter(createDocumentAgentAdapter());    // Convex
registerAdapter(createResearchGraphAdapter());    // LangGraph
registerAdapter(createCodeAnalystAdapter());      // OpenAI
registerAdapter(createDeepReasoningAdapter());    // Anthropic
```

### Multi-SDK Parallel Delegation

```typescript
// convex/domains/agents/core/delegation/multiSdkDelegation.ts
import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { getAdapter } from "../../adapters/registry";

export const delegateToMultipleSdks = createTool({
  description: `Execute tasks across multiple SDK agents in parallel.
  Each task is routed to the optimal SDK based on task type.`,

  parameters: z.object({
    tasks: z.array(z.object({
      taskId: z.string(),
      agentName: z.string(),
      input: z.record(z.unknown()),
    })),
    timeoutMs: z.number().default(30000),
  }),

  execute: async (ctx, args) => {
    const results = await Promise.allSettled(
      args.tasks.map(async (task) => {
        const adapter = getAdapter(task.agentName);
        if (!adapter) throw new Error(`Unknown agent: ${task.agentName}`);

        const start = Date.now();
        const result = await adapter.execute(task.input);

        return {
          taskId: task.taskId,
          agentName: task.agentName,
          sdk: adapter.sdk,
          status: "success",
          result,
          executionTimeMs: Date.now() - start,
        };
      })
    );

    return JSON.stringify(results.map((r, i) =>
      r.status === "fulfilled" ? r.value : {
        taskId: args.tasks[i].taskId,
        status: "error",
        error: r.reason.message,
      }
    ));
  },
});
```

---

*Document generated: December 30, 2025*
*Architecture Version: 2.0.0*