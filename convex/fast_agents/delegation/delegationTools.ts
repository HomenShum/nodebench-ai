/**
 * Delegation Tools
 * 
 * Tools that enable the coordinator agent to delegate tasks to specialized subagents
 */

import { Agent, createTool, stepCountIs } from "@convex-dev/agent";
import type { Tool } from "ai";
import { z } from "zod";
import type { DelegationCtx, ensureThread, pickUserId, formatDelegationResult, extractToolNames } from "./delegationHelpers";
import { buildPromptWithTemporalContext } from "./temporalContext";

type DelegationTool = Tool<any, any>;

// Import subagent creators
import { createDocumentAgent } from "../subagents/document_subagent/documentAgent";
import { createMediaAgent } from "../subagents/media_subagent/mediaAgent";
import { createSECAgent } from "../subagents/sec_subagent/secAgent";
import { createOpenBBAgent } from "../subagents/openbb_subagent/openbbAgent";
import { createEntityResearchAgent } from "../subagents/entity_subagent/entityResearchAgent";

// Import helpers
import {
  ensureThread as ensureThreadHelper,
  pickUserId as pickUserIdHelper,
  formatDelegationResult as formatResult,
  extractToolNames as extractTools,
} from "./delegationHelpers";

/**
 * Build delegation tools for a specific language model
 * 
 * @param model - Language model to use for subagents
 * @returns Object containing all delegation tools
 */
export function buildDelegationTools(model: string): Record<string, DelegationTool> {
  // Create subagent instances
  const documentAgent = createDocumentAgent(model);
  const mediaAgent = createMediaAgent(model);
  const secAgent: Agent = createSECAgent(model);
  const openbbAgent = createOpenBBAgent(model);

  /**
   * Safety helper: Enforce maximum delegation depth
   */
  const enforceSafety = (ctx: DelegationCtx): number => {
    const currentDepth = ctx.depth ?? 0;
    if (currentDepth >= 3) {
      throw new Error("Maximum delegation depth (3) exceeded. Cannot delegate further.");
    }
    return currentDepth + 1;
  };

  /**
   * Helper to run agent with timeout
   */
  const runWithTimeout = async <T>(promise: Promise<T>, timeoutMs: number = 60000): Promise<T> => {
    let timeoutHandle: NodeJS.Timeout;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => reject(new Error("Delegation timed out after 60s")), timeoutMs);
    });

    try {
      const result = await Promise.race([promise, timeoutPromise]);
      clearTimeout(timeoutHandle!);
      return result;
    } catch (error) {
      clearTimeout(timeoutHandle!);
      throw error;
    }
  };

  const buildDelegationPrompt = (query: string, inheritedContext?: DelegationCtx["temporalContext"]) => {
    const promptWithContext = buildPromptWithTemporalContext(query);

    if (!promptWithContext.temporalContext && inheritedContext) {
      const prompt = `${query}\n\nTimeframe: ${inheritedContext.label} (from ${inheritedContext.startDate} to ${inheritedContext.endDate}).` +
        " Apply date filters in your tools to stay within this range and prioritize the most recent results.";

      return { prompt, temporalContext: inheritedContext };
    }

    return promptWithContext;
  };

  /**
   * Delegate to Document Agent
   * Use for: document search, reading, creation, editing, multi-document analysis
   */
  const delegateToDocumentAgent: DelegationTool = createTool({
    description: `Delegate document-related tasks to the DocumentAgent specialist.

Use this tool when the user asks to:
- Find, search, or look up documents
- Read or view document content
- Create or edit documents
- Analyze or compare multiple documents
- Search by hashtag
- Search uploaded files

The DocumentAgent has specialized tools for document management and will return a comprehensive answer.`,

    args: z.object({
      query: z.string().describe("The user's question or task for the DocumentAgent"),
      analysisType: z.enum(["search", "read", "create", "edit", "analyze", "compare", "hashtag"]).optional()
        .describe("Type of document operation"),
      threadId: z.string().optional().describe("Optional thread ID to continue previous conversation"),
    }),

    handler: async (ctx: DelegationCtx, args) => {
      const nextDepth = enforceSafety(ctx);
      const threadId = await ensureThreadHelper(documentAgent, ctx, args.threadId);
      const { prompt, temporalContext } = buildDelegationPrompt(args.query, ctx.temporalContext);

      const result = await runWithTimeout(documentAgent.generateText(
        { ...ctx, depth: nextDepth, temporalContext } as any,
        { threadId, userId: pickUserIdHelper(ctx) },
        {
          prompt,
          stopWhen: stepCountIs(8),
        }
      ));

      const toolsUsed = extractTools(result);

      return formatResult(
        "DocumentAgent",
        threadId,
        result.messageId || "",
        result.text,
        toolsUsed
      );
    },
  });

  /**
   * Delegate to Media Agent
   * Use for: YouTube videos, web search, images, media discovery
   */
  const delegateToMediaAgent: DelegationTool = createTool({
    description: `Delegate media discovery tasks to the MediaAgent specialist.

Use this tool when the user asks to:
- Find YouTube videos
- Search for images
- Search the web for content
- Discover media files
- Analyze uploaded media

The MediaAgent has specialized tools for media discovery and will return relevant results with URLs.`,

    args: z.object({
      query: z.string().describe("The user's question or task for the MediaAgent"),
      mediaType: z.enum(["video", "image", "web", "media"]).optional()
        .describe("Type of media to search for"),
      threadId: z.string().optional().describe("Optional thread ID to continue previous conversation"),
    }),

    handler: async (ctx: DelegationCtx, args) => {
      const nextDepth = enforceSafety(ctx);
      const threadId = await ensureThreadHelper(mediaAgent, ctx, args.threadId);
      const { prompt, temporalContext } = buildDelegationPrompt(args.query, ctx.temporalContext);

      const result = await runWithTimeout(mediaAgent.generateText(
        { ...ctx, depth: nextDepth, temporalContext } as any,
        { threadId, userId: pickUserIdHelper(ctx) },
        {
          prompt,
          stopWhen: stepCountIs(6),
        }
      ));

      const toolsUsed = extractTools(result);

      return formatResult(
        "MediaAgent",
        threadId,
        result.messageId || "",
        result.text,
        toolsUsed
      );
    },
  });

  /**
   * Delegate to SEC Agent
   * Use for: SEC filings, company research, regulatory documents
   */
  const delegateToSECAgent: DelegationTool = createTool({
    description: `Delegate SEC filing and company research tasks to the SECAgent specialist.

Use this tool when the user asks to:
- Find SEC filings (10-K, 10-Q, 8-K, S-1, etc.)
- Look up company information
- Research regulatory filings
- Analyze financial documents
- Find company CIK or ticker

The SECAgent has specialized tools for SEC EDGAR database access and will return filing details with URLs.`,

    args: z.object({
      query: z.string().describe("The user's question or task for the SECAgent"),
      filingType: z.string().optional().describe("Specific filing type if known (e.g., '10-K', '10-Q')"),
      threadId: z.string().optional().describe("Optional thread ID to continue previous conversation"),
    }),

    handler: async (ctx: DelegationCtx, args) => {
      const nextDepth = enforceSafety(ctx);
      const threadId = await ensureThreadHelper(secAgent, ctx, args.threadId);
      const { prompt, temporalContext } = buildDelegationPrompt(args.query, ctx.temporalContext);

      const result = await runWithTimeout<any>(secAgent.generateText(
        { ...ctx, depth: nextDepth, temporalContext } as any,
        { threadId, userId: pickUserIdHelper(ctx) },
        {
          prompt,
          stopWhen: stepCountIs(6),
        }
      ));

      const toolsUsed = extractTools(result);

      return formatResult(
        "SECAgent",
        threadId,
        result.messageId || "",
        result.text,
        toolsUsed
      );
    },
  });

  /**
   * Delegate to OpenBB Agent
   * Use for: financial data, stock prices, crypto, economic indicators, financial news
   */
  const delegateToOpenBBAgent: DelegationTool = createTool({
    description: `Delegate financial data and market research tasks to the OpenBBAgent specialist.

Use this tool when the user asks to:
- Get stock prices or fundamentals
- Research cryptocurrency data
- Find economic indicators (GDP, employment, inflation)
- Get financial news
- Compare stocks or analyze markets

The OpenBBAgent has specialized tools for financial data via OpenBB Platform and will return market data with analysis.`,

    args: z.object({
      query: z.string().describe("The user's question or task for the OpenBBAgent"),
      dataCategory: z.enum(["equity", "crypto", "economy", "news", "general"]).optional()
        .describe("Category of financial data"),
      threadId: z.string().optional().describe("Optional thread ID to continue previous conversation"),
    }),

    handler: async (ctx: DelegationCtx, args) => {
      const nextDepth = enforceSafety(ctx);
      const threadId = await ensureThreadHelper(openbbAgent, ctx, args.threadId);
      const { prompt, temporalContext } = buildDelegationPrompt(args.query, ctx.temporalContext);

      const result = await runWithTimeout(openbbAgent.generateText(
        { ...ctx, depth: nextDepth, temporalContext } as any,
        { threadId, userId: pickUserIdHelper(ctx) },
        {
          prompt,
          stopWhen: stepCountIs(8),
        }
      ));

      const toolsUsed = extractTools(result);

      return formatResult(
        "OpenBBAgent",
        threadId,
        result.messageId || "",
        result.text,
        toolsUsed
      );
    },
  });


  // Import Entity Research Agent
  const entityResearchAgent = createEntityResearchAgent(model);


  /**
   * Delegate to Entity Research Agent
   * Use for: deep research on companies and people
   */
  const delegateToEntityResearchAgent: DelegationTool = createTool({
    description: `Delegate deep research tasks to the EntityResearchAgent specialist.

Use this tool when the user asks to:
- Research a specific company (funding, founders, thesis)
- Research a specific person (background, education)
- Research a topic or hashtag deeply
- Get "banker-quality" analysis

The EntityResearchAgent has specialized tools for deep enrichment and will return a comprehensive dossier.`,

    args: z.object({
      query: z.string().describe("The user's question or task for the EntityResearchAgent"),
      entityType: z.enum(["company", "person", "topic", "general"]).optional()
        .describe("Type of entity to research"),
      threadId: z.string().optional().describe("Optional thread ID to continue previous conversation"),
    }),

    handler: async (ctx: DelegationCtx, args) => {
      const nextDepth = enforceSafety(ctx);
      const threadId = await ensureThreadHelper(entityResearchAgent, ctx, args.threadId);
      const { prompt, temporalContext } = buildDelegationPrompt(args.query, ctx.temporalContext);

      const result = await runWithTimeout(entityResearchAgent.generateText(
        { ...ctx, depth: nextDepth, temporalContext } as any,
        { threadId, userId: pickUserIdHelper(ctx) },
        {
          prompt,
          stopWhen: stepCountIs(10),
        }
      ));

      const toolsUsed = extractTools(result);

      return formatResult(
        "EntityResearchAgent",
        threadId,
        result.messageId || "",
        result.text,
        toolsUsed
      );
    },
  });

  /**
   * Parallel Delegation
   * Use for: running multiple subagents simultaneously
   */
  const parallelDelegate: DelegationTool = createTool({
    description: `Delegate to multiple agents simultaneously.
    
    Use this when:
    - You need to compare two different things (e.g. "Compare Tesla and Rivian")
    - You need information from different domains at once (e.g. "Get Apple stock price and recent news")
    - The tasks are independent of each other
    
    Returns an array of results from each agent.`,

    args: z.object({
      tasks: z.array(z.object({
        agentName: z.enum(["DocumentAgent", "MediaAgent", "SECAgent", "OpenBBAgent", "EntityResearchAgent"]),
        query: z.string(),
        threadId: z.string().optional(),
      })).describe("List of tasks to delegate"),
    }),

    handler: async (ctx: DelegationCtx, args) => {
      const nextDepth = enforceSafety(ctx);

      const promises = args.tasks.map(async (task) => {
        let agent;
        switch (task.agentName) {
          case "DocumentAgent": agent = documentAgent; break;
          case "MediaAgent": agent = mediaAgent; break;
          case "SECAgent": agent = secAgent; break;
          case "OpenBBAgent": agent = openbbAgent; break;
          case "EntityResearchAgent": agent = entityResearchAgent; break;
          default: throw new Error(`Unknown agent: ${task.agentName}`);
        }

        const threadId = await ensureThreadHelper(agent, ctx, task.threadId);
        const { prompt, temporalContext } = buildDelegationPrompt(task.query, ctx.temporalContext);

        try {
          const generation = agent.generateText(
            { ...ctx, depth: nextDepth, temporalContext } as any,
            { threadId, userId: pickUserIdHelper(ctx) },
            {
              prompt,
              stopWhen: stepCountIs(8), // Slightly lower limit for parallel tasks
            }
          ) as Promise<any>;

          const result: any = await runWithTimeout<any>(generation);

          return {
            task: task.query,
            agent: task.agentName,
            status: "success",
            result: formatResult(task.agentName, threadId, result.messageId || "", result.text, extractTools(result))
          };
        } catch (error: any) {
          return {
            task: task.query,
            agent: task.agentName,
            status: "error",
            error: error.message
          };
        }
      });

      const results = await Promise.all(promises);
      return JSON.stringify(results, null, 2);
    }
  });

  // Update existing handlers to use safety checks
  // Note: We are wrapping the existing handlers to add safety. 
  // Since we can't easily wrap them in-place without rewriting the whole file, 
  // we will just return the new set which includes the new tools.
  // Ideally we should update the existing tools to use `enforceSafety` and `runWithTimeout` too.
  // For this refactor, I will assume the user wants me to update the existing ones as well.
  // I will rewrite the return statement to include the new tools and I will rely on the fact that I am replacing the end of the file.
  // Wait, I need to update the existing tools in the file to use the safety checks.
  // The `replace_file_content` tool replaces a block. I should probably replace the whole `buildDelegationTools` function body or large chunks of it.
  // Given the file size (234 lines), I can replace the whole function `buildDelegationTools`.

  return {
    delegateToDocumentAgent,
    delegateToMediaAgent,
    delegateToSECAgent,
    delegateToOpenBBAgent,
    delegateToEntityResearchAgent,
    parallelDelegate,
  };
}

