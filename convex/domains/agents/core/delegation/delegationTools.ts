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
import { createDossierAgent } from "../subagents/dossier_subagent/dossierAgent";
import { getLlmModel } from "../../../../../shared/llm/modelCatalog";

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
  const dossierAgent = createDossierAgent(model);

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

  const premiumEvidenceRequirements = `\n\nQuality bar (premium output):\n- State an explicit date (YYYY-MM-DD) and timezone for every finding.\n- Put the primary source URL right next to the finding (EDGAR link, article URL, etc.).\n- Add a short verification note per finding: which tool/source you used and the UTC retrieval time.\n- Drop or clearly flag anything outside the requested timeframe.`;

  const buildDelegationPrompt = (query: string, inheritedContext?: DelegationCtx["temporalContext"]) => {
    const promptWithContext = buildPromptWithTemporalContext(query);

    if (!promptWithContext.temporalContext && inheritedContext) {
      const prompt = `${query}\n\nTimeframe: ${inheritedContext.label} (from ${inheritedContext.startDate} to ${inheritedContext.endDate}).` +
        " Apply date filters in your tools to stay within this range and prioritize the most recent results.";

      return { prompt: `${prompt}${premiumEvidenceRequirements}`, temporalContext: inheritedContext };
    }

    return { ...promptWithContext, prompt: `${promptWithContext.prompt}${premiumEvidenceRequirements}` };
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
   * Delegate to Dossier Agent
   * Use for: bidirectional focus sync, chart annotations, data point enrichment
   */
  const delegateToDossierAgent: DelegationTool = createTool({
    description: `Delegate dossier interaction tasks to the DossierAgent specialist.

Use this tool when the user is viewing a Morning Dossier and asks to:
- Highlight or focus on a specific data point
- Annotate a chart point with a label
- Get more context about "this point" or "this spike"
- Explain what happened at a specific data point
- Update or expand a narrative section

The DossierAgent has specialized tools for bidirectional focus sync between the chat panel and the dossier view.
It can highlight data points, add annotations, and enrich data with context.`,

    args: z.object({
      query: z.string().describe("The user's question or task for the DossierAgent"),
      briefId: z.string().describe("The brief/memory ID being viewed"),
      dataIndex: z.number().optional().describe("Specific data point index if known"),
      currentAct: z.enum(["actI", "actII", "actIII"]).optional().describe("Current act being viewed"),
      threadId: z.string().optional().describe("Optional thread ID to continue previous conversation"),
    }),

    handler: async (ctx: DelegationCtx, args) => {
      const nextDepth = enforceSafety(ctx);
      const threadId = await ensureThreadHelper(dossierAgent, ctx, args.threadId);

      // Build prompt with dossier context
      let prompt = args.query;
      if (args.briefId) {
        prompt = `[Dossier Context: briefId=${args.briefId}`;
        if (args.dataIndex !== undefined) prompt += `, dataIndex=${args.dataIndex}`;
        if (args.currentAct) prompt += `, act=${args.currentAct}`;
        prompt += `]\n\n${args.query}`;
      }

      const result = await runWithTimeout(dossierAgent.generateText(
        { ...ctx, depth: nextDepth, userId: pickUserIdHelper(ctx) } as any,
        { threadId, userId: pickUserIdHelper(ctx) },
        {
          prompt,
          stopWhen: stepCountIs(6),
        }
      ));

      const toolsUsed = extractTools(result);

      return formatResult(
        "DossierAgent",
        threadId,
        result.messageId || "",
        result.text,
        toolsUsed
      );
    },
  });

  /**
   * Parallel Delegation (Scheduler-based, OCC-safe)
   * Use for: running multiple subagents simultaneously
   * 
   * Architecture: Fire-and-forget scheduling
   * - Creates delegation records immediately
   * - Schedules separate actions for each agent (no OCC fights)
   * - Returns tracking info immediately (non-blocking)
   * - UI subscribes to agentDelegations + agentWriteEvents for live updates
   */
  const parallelDelegate: DelegationTool = createTool({
    description: `Delegate to multiple agents simultaneously using scheduler-based execution.
    
Use this when:
- You need to compare two different things (e.g. "Compare Tesla and Rivian")
- You need information from different domains at once (e.g. "Get Apple stock price and recent news")
- The tasks are independent of each other

Returns immediately with delegation tracking info. Results stream via agentWriteEvents.
UI can subscribe to live updates using the returned runId and delegationIds.`,

    args: z.object({
      tasks: z.array(z.object({
        agentName: z.enum(["DocumentAgent", "MediaAgent", "SECAgent", "OpenBBAgent", "EntityResearchAgent", "DossierAgent"]),
        query: z.string(),
      })).describe("List of tasks to delegate (max 5 for cost control)"),
    }),

    handler: async (ctx: DelegationCtx, args) => {
      // Safety: enforce max parallel to prevent cost/rate limit spikes
      const MAX_PARALLEL = 5;
      if (args.tasks.length > MAX_PARALLEL) {
        return JSON.stringify({
          status: "error",
          error: `Too many parallel tasks. Maximum is ${MAX_PARALLEL}, got ${args.tasks.length}.`,
        });
      }

      enforceSafety(ctx);

      const userId = pickUserIdHelper(ctx);
      // Use coordinator's threadId as runId for UI scoping
      const runId = ctx.threadId ?? crypto.randomUUID();

      // Generate unique delegationIds for each task
      const tasks = args.tasks.map(task => ({
        delegationId: crypto.randomUUID(),
        agentName: task.agentName as "DocumentAgent" | "MediaAgent" | "SECAgent" | "OpenBBAgent" | "EntityResearchAgent" | "DossierAgent",
        query: task.query,
      }));
      
      // Schedule via ctx.scheduler.runAfter (durable, won't be dropped)
      // Using scheduler instead of runAction ensures the job persists
      // even if this handler exits early or errors after returning
      const { internal } = await import("../../../../_generated/api");
      
      await (ctx as any).scheduler.runAfter(0, internal.actions.parallelDelegation.scheduleDelegations, {
        runId,
        userId,
        model: getLlmModel("agent", "openai"), // Could be passed from coordinator config
        tasks,
      });
      
      return JSON.stringify({
        status: "delegations_scheduled",
        runId,
        delegationIds: tasks.map(t => t.delegationId),
        agentCount: tasks.length,
        agents: tasks.map(t => t.agentName),
        message: `Scheduled ${tasks.length} parallel agents. Track via agentDelegations.listByRun({ runId: "${runId}" })`,
        uiHint: "Subscribe to agentWriteEvents for live streaming text from each agent.",
      }, null, 2);
    }
  });

  return {
    delegateToDocumentAgent,
    delegateToMediaAgent,
    delegateToSECAgent,
    delegateToOpenBBAgent,
    delegateToEntityResearchAgent,
    delegateToDossierAgent,
    parallelDelegate,
  };
}

