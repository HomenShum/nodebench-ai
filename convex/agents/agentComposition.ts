// convex/agents/agentComposition.ts
// Agent Composition Pattern: Agents calling other agents directly

import { ActionCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { createTool } from "@convex-dev/agent";
import { z } from "zod/v3";
import { Agent } from "@convex-dev/agent";
import { components } from "../_generated/api";
import { openai } from "@ai-sdk/openai";

/**
 * Agent Composition Helpers
 *
 * These functions enable agents to call other specialized agents directly,
 * creating a hierarchical agent system where complex tasks are broken down
 * and delegated to specialized sub-agents.
 *
 * SAFETY FEATURES:
 * - Depth limit (max 3 levels) to prevent infinite recursion
 * - Timeout protection (max 60s per sub-agent)
 * - Error recovery with graceful degradation
 */

// Track delegation depth to prevent infinite recursion
const DELEGATION_DEPTH_KEY = "__delegationDepth";
const MAX_DELEGATION_DEPTH = 3;
const MAX_SUBAGENT_TIMEOUT_MS = 60000; // 60 seconds

/**
 * Create a tool that delegates to a sub-agent
 *
 * @param agentFactory - Function that creates the sub-agent
 * @param toolName - Name of the tool
 * @param toolDescription - Description of what the tool does
 * @returns A tool that can be used by parent agents
 */
export function createAgentDelegationTool(
  agentFactory: (ctx: ActionCtx, userId: Id<"users">) => Agent,
  toolName: string,
  toolDescription: string
) {
  return createTool({
    description: toolDescription,
    args: z.object({
      query: z.string().describe("The query to send to the sub-agent"),
      context: z.string().optional().describe("Additional context for the sub-agent"),
    }),
    handler: async (toolCtx: ActionCtx, args): Promise<string> => {
      const userId = (toolCtx as any).userId as Id<"users">;
      const threadId = (toolCtx as any).threadId as string;

      // Check delegation depth to prevent infinite recursion
      const currentDepth = ((toolCtx as any)[DELEGATION_DEPTH_KEY] as number) || 0;
      if (currentDepth >= MAX_DELEGATION_DEPTH) {
        const errorMsg = `❌ Maximum delegation depth (${MAX_DELEGATION_DEPTH}) reached. Cannot delegate further.`;
        console.error(`[${toolName}] ${errorMsg}`);
        return errorMsg;
      }

      console.log(`[${toolName}] Delegating to sub-agent (depth ${currentDepth + 1}/${MAX_DELEGATION_DEPTH}):`, args.query.substring(0, 100));

      try {
        // Create the sub-agent with incremented depth
        const subAgent = agentFactory(toolCtx, userId);

        // Inject depth tracking into sub-agent context
        const subAgentCtx = {
          ...toolCtx,
          [DELEGATION_DEPTH_KEY]: currentDepth + 1,
        } as ActionCtx;

        // Build the prompt with context if provided
        const prompt = args.context
          ? `Context: ${args.context}\n\nQuery: ${args.query}`
          : args.query;

        // Execute the sub-agent with timeout protection
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Sub-agent timeout')), MAX_SUBAGENT_TIMEOUT_MS);
        });

        const executionPromise = (async () => {
          const result = await subAgent.streamText(subAgentCtx, { threadId }, { prompt });
          await result.consumeStream();
          return await result.text;
        })();

        const text = await Promise.race([executionPromise, timeoutPromise]);

        console.log(`[${toolName}] Sub-agent completed, response length:`, text.length);

        return text;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[${toolName}] Sub-agent failed:`, errorMsg);
        return `❌ Sub-agent error: ${errorMsg}`;
      }
    },
  });
}

/**
 * Create a tool that delegates to multiple sub-agents in parallel
 * 
 * @param agentFactories - Array of agent factory functions
 * @param toolName - Name of the tool
 * @param toolDescription - Description of what the tool does
 * @returns A tool that executes multiple agents in parallel
 */
export function createParallelAgentDelegationTool(
  agentFactories: Array<{
    factory: (ctx: ActionCtx, userId: Id<"users">) => Agent;
    name: string;
  }>,
  toolName: string,
  toolDescription: string
) {
  return createTool({
    description: toolDescription,
    args: z.object({
      query: z.string().describe("The query to send to all sub-agents"),
      context: z.string().optional().describe("Additional context for the sub-agents"),
    }),
    handler: async (toolCtx: ActionCtx, args): Promise<string> => {
      const userId = (toolCtx as any).userId as Id<"users">;
      const threadId = (toolCtx as any).threadId as string;
      
      console.log(`[${toolName}] Delegating to ${agentFactories.length} sub-agents in parallel`);
      
      // Build the prompt
      const prompt = args.context 
        ? `Context: ${args.context}\n\nQuery: ${args.query}`
        : args.query;
      
      // Execute all sub-agents in parallel
      const results = await Promise.all(
        agentFactories.map(async ({ factory, name }) => {
          try {
            const subAgent = factory(toolCtx, userId);
            const result = await subAgent.streamText(toolCtx, { threadId }, { prompt });
            await result.consumeStream();
            const text = await result.text;
            return { name, text, error: null };
          } catch (error) {
            console.error(`[${toolName}] Sub-agent ${name} failed:`, error);
            return { 
              name, 
              text: '', 
              error: error instanceof Error ? error.message : 'Unknown error' 
            };
          }
        })
      );
      
      // Combine results
      const combined = results
        .map(({ name, text, error }) => {
          if (error) {
            return `## ${name}\n\n❌ Error: ${error}`;
          }
          return `## ${name}\n\n${text}`;
        })
        .join('\n\n---\n\n');
      
      console.log(`[${toolName}] All sub-agents completed`);
      
      return combined;
    },
  });
}

/**
 * Create a tool that delegates to sub-agents sequentially (pipeline)
 * 
 * Each agent receives the output of the previous agent as input.
 * 
 * @param agentFactories - Array of agent factory functions in execution order
 * @param toolName - Name of the tool
 * @param toolDescription - Description of what the tool does
 * @returns A tool that executes agents in a pipeline
 */
export function createSequentialAgentDelegationTool(
  agentFactories: Array<{
    factory: (ctx: ActionCtx, userId: Id<"users">) => Agent;
    name: string;
  }>,
  toolName: string,
  toolDescription: string
) {
  return createTool({
    description: toolDescription,
    args: z.object({
      query: z.string().describe("The initial query to send to the first sub-agent"),
      context: z.string().optional().describe("Additional context for the sub-agents"),
    }),
    handler: async (toolCtx: ActionCtx, args): Promise<string> => {
      const userId = (toolCtx as any).userId as Id<"users">;
      const threadId = (toolCtx as any).threadId as string;
      
      console.log(`[${toolName}] Starting sequential delegation through ${agentFactories.length} sub-agents`);
      
      let currentInput = args.query;
      const results: Array<{ name: string; input: string; output: string }> = [];
      
      // Execute agents sequentially
      for (const { factory, name } of agentFactories) {
        console.log(`[${toolName}] Executing sub-agent: ${name}`);
        
        try {
          const subAgent = factory(toolCtx, userId);
          
          // Build prompt with context for first agent only
          const prompt = results.length === 0 && args.context
            ? `Context: ${args.context}\n\nQuery: ${currentInput}`
            : currentInput;
          
          const result = await subAgent.streamText(toolCtx, { threadId }, { prompt });
          await result.consumeStream();
          const text = await result.text;
          
          results.push({ name, input: currentInput, output: text });
          currentInput = text; // Output becomes input for next agent
          
          console.log(`[${toolName}] Sub-agent ${name} completed, output length:`, text.length);
        } catch (error) {
          console.error(`[${toolName}] Sub-agent ${name} failed:`, error);
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          results.push({ 
            name, 
            input: currentInput, 
            output: `❌ Error: ${errorMsg}` 
          });
          break; // Stop pipeline on error
        }
      }
      
      // Format results showing the pipeline flow
      const formatted = results
        .map(({ name, output }, idx) => {
          const stepNum = idx + 1;
          return `### Step ${stepNum}: ${name}\n\n${output}`;
        })
        .join('\n\n---\n\n');
      
      console.log(`[${toolName}] Sequential delegation completed`);
      
      return `# Pipeline Results\n\n${formatted}\n\n---\n\n# Final Output\n\n${currentInput}`;
    },
  });
}

/**
 * Create a supervisor agent that coordinates multiple sub-agents
 * 
 * The supervisor analyzes the query and decides which sub-agents to call,
 * then synthesizes their results into a final answer.
 * 
 * @param ctx - Action context
 * @param userId - User ID
 * @param subAgentTools - Tools that delegate to sub-agents
 * @param supervisorInstructions - Custom instructions for the supervisor
 * @returns A supervisor agent
 */
export function createSupervisorAgent(
  ctx: ActionCtx,
  userId: Id<"users">,
  subAgentTools: Record<string, any>,
  supervisorInstructions?: string
) {
  const defaultInstructions = `You are a supervisor agent that coordinates multiple specialized sub-agents.

Your role:
1. Analyze the user's query
2. Decide which sub-agents to call (you can call multiple in parallel or sequentially)
3. Synthesize the results from sub-agents into a comprehensive final answer

Available sub-agents:
${Object.keys(subAgentTools).map(name => `- ${name}`).join('\n')}

Guidelines:
- Call multiple sub-agents when the query requires different types of information
- Synthesize results into a coherent, well-structured answer
- If sub-agents provide conflicting information, note the discrepancies
- Always provide a final summary that directly answers the user's question`;

  return new Agent(components.agent, {
    name: "SupervisorAgent",
    languageModel: openai.chat("gpt-5"),
    instructions: supervisorInstructions || defaultInstructions,
    tools: subAgentTools,
  });
}

/**
 * Example: Create a research supervisor that coordinates web, document, and media agents
 */
export function createResearchSupervisor(ctx: ActionCtx, userId: Id<"users">) {
  // Import specialized agents
  const { createWebAgent, createDocumentAgent, createMediaAgent } = require("./specializedAgents");
  
  // Create delegation tools
  const tools = {
    searchWeb: createAgentDelegationTool(
      createWebAgent,
      "searchWeb",
      "Search the web for information using the Web Agent"
    ),
    searchDocuments: createAgentDelegationTool(
      createDocumentAgent,
      "searchDocuments",
      "Search user's documents using the Document Agent"
    ),
    searchMedia: createAgentDelegationTool(
      createMediaAgent,
      "searchMedia",
      "Search for videos and media using the Media Agent"
    ),
  };
  
  const instructions = `You are a research supervisor that coordinates web search, document search, and media search.

When the user asks a research question:
1. Determine which sources are relevant (web, documents, media)
2. Call the appropriate sub-agents (you can call multiple in parallel)
3. Synthesize the results into a comprehensive research report

Format your final answer as:
## Research Summary
[Brief overview of findings]

## Detailed Findings
[Organized information from all sources]

## Sources
[List of sources from sub-agents]`;

  return createSupervisorAgent(ctx, userId, tools, instructions);
}

