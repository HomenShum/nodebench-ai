/**
 * OpenAI Agents SDK Adapter
 *
 * Wraps @openai/agents for multi-agent workflows with native
 * handoff support. Best for customer support triage patterns
 * and declarative agent-to-agent handoffs.
 *
 * @see https://openai.github.io/openai-agents-js/
 * @see docs/architecture/2025-12-30-multi-sdk-subagent-architecture.md
 */
"use node";

import { Agent, run, tool, handoff } from "@openai/agents";
import { z } from "zod";
import type {
  SubAgentAdapter,
  AdapterInput,
  AdapterResult,
  HandoffContext,
  AdapterMessage,
} from "../types";

/**
 * Configuration for OpenAI Agents adapter
 */
export interface OpenAIAgentsConfig {
  /** Agent name */
  name: string;
  /** Agent instructions */
  instructions: string;
  /** Model to use (default: gpt-5.2) */
  model?: string;
  /** Tools available to the agent */
  tools?: Array<ReturnType<typeof tool>>;
  /** Other agents this agent can hand off to */
  handoffs?: Agent[];
  /** Maximum turns before stopping */
  maxTurns?: number;
}

/**
 * Create an OpenAI Agents SDK adapter
 *
 * This adapter uses the official @openai/agents package
 * with native handoff support for multi-agent flows.
 */
export function createOpenAIAgentsAdapter(
  config: OpenAIAgentsConfig
): SubAgentAdapter<AdapterInput, unknown> {
  const {
    name,
    instructions,
    model = "gpt-5.2",
    tools = [],
    handoffs: handoffAgents = [],
    maxTurns = 10,
  } = config;

  // Create the agent with handoffs
  const agent = new Agent({
    name,
    instructions,
    model,
    tools,
    handoffs: handoffAgents.map(a => handoff(a)),
  });

  return {
    name,
    sdk: "openai",
    description: `OpenAI Agents SDK agent with handoffs: ${name}`,
    supportsHandoff: true,

    async execute(input: AdapterInput): Promise<AdapterResult<unknown>> {
      const startTime = Date.now();

      try {
        // Run the agent
        const result = await run(agent, input.query, {
          maxTurns,
        });

        return {
          agentName: name,
          sdk: "openai",
          status: "success",
          result: result.finalOutput,
          executionTimeMs: Date.now() - startTime,
        };
      } catch (error) {
        return {
          agentName: name,
          sdk: "openai",
          status: "error",
          result: error instanceof Error ? error.message : String(error),
          executionTimeMs: Date.now() - startTime,
        };
      }
    },

    async handoff(
      targetAgent: string,
      context: HandoffContext
    ): Promise<AdapterResult<unknown>> {
      const startTime = Date.now();

      try {
        // In OpenAI Agents SDK, handoffs happen automatically
        // when the agent's instructions trigger them
        // For manual handoffs, we run with context
        const combinedPrompt = context.messages
          .map((m) => `${m.role}: ${m.content}`)
          .join("\n");

        const result = await run(agent, combinedPrompt, {
          maxTurns,
        });

        return {
          agentName: name,
          sdk: "openai",
          status: result.finalOutput ? "success" : "handoff",
          result: result.finalOutput,
          executionTimeMs: Date.now() - startTime,
          handoffTarget: targetAgent,
        };
      } catch (error) {
        return {
          agentName: name,
          sdk: "openai",
          status: "error",
          result: error instanceof Error ? error.message : String(error),
          executionTimeMs: Date.now() - startTime,
        };
      }
    },
  };
}

/**
 * Create a triage agent with specialists
 *
 * This is a common pattern for customer support:
 * - Triage agent routes to specialists
 * - Specialists handle specific domains
 * - Control returns to triage or ends
 */
export function createTriageAgentSystem(config: {
  triageName: string;
  triageInstructions: string;
  specialists: Array<{
    name: string;
    instructions: string;
    handoffDescription?: string;
    tools?: Array<ReturnType<typeof tool>>;
  }>;
  model?: string;
}) {
  const { triageName, triageInstructions, specialists, model = "gpt-5.2" } = config;

  // Create specialist agents
  const specialistAgents = specialists.map((spec) =>
    new Agent({
      name: spec.name,
      instructions: spec.instructions,
      model,
      tools: spec.tools || [],
      handoffDescription: spec.handoffDescription || `Handles ${spec.name} tasks`,
    })
  );

  // Create triage agent with handoffs to specialists
  const triageAgent = new Agent({
    name: triageName,
    instructions: triageInstructions,
    model,
    handoffs: specialistAgents.map(a => handoff(a)),
  });

  return {
    triageAgent,
    specialistAgents,
    async run(query: string, maxTurns = 10) {
      return await run(triageAgent, query, { maxTurns });
    },
  };
}

/**
 * Create an agent that uses other agents as tools (manager pattern)
 *
 * In this pattern, the manager never relinquishes control -
 * it calls specialists as tools and synthesizes results.
 */
export function createManagerAgentSystem(config: {
  managerName: string;
  managerInstructions: string;
  specialists: Array<{
    name: string;
    instructions: string;
    toolName: string;
    toolDescription: string;
  }>;
  model?: string;
}) {
  const { managerName, managerInstructions, specialists, model = "gpt-5.2" } = config;

  // Create specialist agents
  const specialistAgents = specialists.map((spec) =>
    new Agent({
      name: spec.name,
      instructions: spec.instructions,
      model,
    })
  );

  // Create tools from specialists
  const specialistTools = specialists.map((spec, i) =>
    specialistAgents[i].asTool({
      toolName: spec.toolName,
      toolDescription: spec.toolDescription,
    })
  );

  // Create manager agent with specialists as tools
  const managerAgent = new Agent({
    name: managerName,
    instructions: managerInstructions,
    model,
    tools: specialistTools,
  });

  return {
    managerAgent,
    specialistAgents,
    async run(query: string, maxTurns = 10) {
      return await run(managerAgent, query, { maxTurns });
    },
  };
}

/**
 * Create a research agent with web search and analysis capabilities
 */
export function createResearchAgent(config: {
  name?: string;
  model?: string;
  searchTool: ReturnType<typeof tool>;
  analysisTool?: ReturnType<typeof tool>;
}) {
  const {
    name = "ResearchAgent",
    model = "gpt-5.2",
    searchTool,
    analysisTool,
  } = config;

  const tools = [searchTool];
  if (analysisTool) tools.push(analysisTool);

  return new Agent({
    name,
    instructions: `You are a research agent. Use your tools to search for information and analyze findings.

When given a research task:
1. Break down the query into searchable terms
2. Use the search tool to find relevant information
3. Synthesize the findings into a clear summary
4. Cite sources where appropriate`,
    model,
    tools,
  });
}

/**
 * Utility to create a tool from a function
 * Note: The OpenAI Agents SDK expects specific parameter types
 */
export function createOpenAITool(config: {
  name: string;
  description: string;
  schema: z.ZodObject<z.ZodRawShape>;
  execute: (args: Record<string, unknown>) => Promise<string>;
}) {
  return tool({
    name: config.name,
    description: config.description,
    parameters: config.schema,
    execute: config.execute,
  });
}
