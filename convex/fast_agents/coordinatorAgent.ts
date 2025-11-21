/**
 * Coordinator Agent - Main agent with full tool access
 *
 * Based on latest Convex Agent documentation:
 * https://docs.convex.dev/agents/agent-usage
 *
 * This agent has access to all tools and can handle complex multi-step workflows.
 */

import { Agent, createTool, stepCountIs, type ToolCtx } from "@convex-dev/agent";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { components } from "../_generated/api";

// Import all tools
import { linkupSearch } from "../tools/linkupSearch";
import { youtubeSearch } from "../tools/youtubeSearch";
import {
  findDocument,
  getDocumentContent,
  analyzeDocument,
  analyzeMultipleDocuments,
  updateDocument,
  createDocument,
  generateEditProposals,
  createDocumentFromAgentContentTool,
} from "../tools/documentTools";
import {
  searchMedia,
  analyzeMediaFile,
  getMediaDetails,
  listMediaFiles
} from "../tools/mediaTools";
import {
  listTasks,
  createTask,
  updateTask,
  listEvents,
  createEvent,
  getFolderContents
} from "../tools/dataAccessTools";
import {
  searchSecFilings,
  downloadSecFiling,
  getCompanyInfo
} from "../tools/secFilingTools";
import {
  searchHashtag,
  createHashtagDossier,
  getOrCreateHashtagDossier
} from "../tools/hashtagSearchTools";
import {
  searchTodaysFunding
} from "../tools/fundingResearchTools";
import {
  enrichFounderInfo,
  enrichInvestmentThesis,
  enrichPatentsAndResearch,
  enrichCompanyDossier
} from "../tools/enhancedFundingTools";
import { searchFiles } from "../tools/geminiFileSearch";

type DelegationCtx = ToolCtx & { evaluationUserId?: string };

export const DEFAULT_MODEL = "gpt-5-chat-latest";

const pickUserId = (ctx: DelegationCtx) =>
  (ctx.evaluationUserId as string | undefined) ?? ctx.userId;

async function ensureThread(agent: Agent, ctx: DelegationCtx, threadId?: string) {
  if (threadId) return threadId;
  if (ctx.threadId) return ctx.threadId;
  const { threadId: created } = await agent.createThread(ctx as any, {
    userId: pickUserId(ctx),
  });
  return created;
}

/**
 * Specialized document agent with a narrow toolset.
 */
export const createDocumentAgent = (model: string) =>
  new Agent(components.agent, {
    name: "DocumentAgent",
    languageModel: openai.chat(model),
    textEmbeddingModel: openai.embedding("text-embedding-3-small"),
    instructions: `You are a document analyst. Always:
- Search for documents with findDocument
- If the user wants to read/see/open content, immediately call getDocumentContent
- When multiple docs are requested, call analyzeMultipleDocuments with all IDs
- Return concise summaries with clear sources`,
    tools: {
      findDocument,
      getDocumentContent,
      analyzeDocument,
      analyzeMultipleDocuments,
      updateDocument,
      createDocument,
      generateEditProposals,
      createDocumentFromAgentContentTool,
      searchFiles,
    },
    stopWhen: stepCountIs(10),
  });

/**
 * Specialized media agent for image/video discovery.
 */
export const createMediaAgent = (model: string) =>
  new Agent(components.agent, {
    name: "MediaAgent",
    languageModel: openai.chat(model),
    instructions: `You are a media specialist. Behaviors:
- For videos or "find videos", ALWAYS call youtubeSearch first
- For images or general media, call searchMedia and fall back to linkupSearch with includeImages=true if empty
- Summaries must cite the source (internal library vs web)`,
    tools: {
      searchMedia,
      analyzeMediaFile,
      getMediaDetails,
      listMediaFiles,
      youtubeSearch,
      linkupSearch,
    },
    stopWhen: stepCountIs(8),
  });

/**
 * Specialized SEC filings agent.
 */
export const createSECAgent = (model: string) =>
  new Agent(components.agent, {
    name: "SECAgent",
    languageModel: openai.chat(model),
    instructions: `You are a filings specialist focused on EDGAR:
- Use searchSecFilings for tickers or company names
- Download filings when asked with downloadSecFiling
- Include form types (10-K, 10-Q, 8-K) and a short rationale`,
    tools: {
      searchSecFilings,
      downloadSecFiling,
      getCompanyInfo,
    },
    stopWhen: stepCountIs(8),
  });

function buildDelegationTools(model: string) {
  const documentAgent = createDocumentAgent(model);
  const mediaAgent = createMediaAgent(model);
  const secAgent = createSECAgent(model);

  const delegateToDocumentAgent = createTool({
    description:
      "Delegate document search/reading/comparison to the DocumentAgent. It shares the current thread so history stays intact.",
    args: z.object({
      query: z.string().describe("What to find or analyze in documents"),
      analysisType: z
        .enum(["comparison", "synthesis", "aggregation", "themes", "relationships"])
        .optional()
        .describe("How to analyze multiple documents when relevant"),
      threadId: z.string().optional().describe("Agent thread to reuse"),
    }),
    handler: async (ctx: DelegationCtx, args) => {
      const threadId = await ensureThread(documentAgent, ctx, args.threadId);
      const prompt = [
        "DocumentAgent task:",
        `Query: ${args.query}`,
        args.analysisType ? `Analysis: ${args.analysisType}` : null,
        "If user wants to read/see/open, call getDocumentContent right after findDocument.",
        "Summarize with bullet points and include sources.",
      ]
        .filter(Boolean)
        .join("\n");

      const result = await documentAgent.generateText(
        ctx as any,
        { threadId, userId: pickUserId(ctx) },
        { prompt, stopWhen: stepCountIs(8) },
      );
      const toolCalls = (await result.toolCalls) ?? [];

      return {
        delegate: "DocumentAgent",
        threadId,
        messageId: result.messageId,
        text: result.text,
        toolsUsed: toolCalls.map((call: any) => call.toolName),
      };
    },
  });

  const delegateToMediaAgent = createTool({
    description:
      "Delegate media and video requests to MediaAgent. Use for 'find videos', 'find images', or media analysis.",
    args: z.object({
      query: z.string().describe("Topic to search for media"),
      mediaType: z.enum(["image", "video", "any"]).optional(),
      threadId: z.string().optional(),
    }),
    handler: async (ctx: DelegationCtx, args) => {
      const threadId = await ensureThread(mediaAgent, ctx, args.threadId);
      const prompt = [
        "MediaAgent task:",
        `Query: ${args.query}`,
        args.mediaType ? `MediaType: ${args.mediaType}` : null,
        "For videos, always call youtubeSearch first.",
        "If searchMedia returns nothing, immediately try linkupSearch with images.",
        "Return a concise gallery-style summary.",
      ]
        .filter(Boolean)
        .join("\n");

      const result = await mediaAgent.generateText(
        ctx as any,
        { threadId, userId: pickUserId(ctx) },
        { prompt, stopWhen: stepCountIs(8) },
      );
      const toolCalls = (await result.toolCalls) ?? [];

      return {
        delegate: "MediaAgent",
        threadId,
        messageId: result.messageId,
        text: result.text,
        toolsUsed: toolCalls.map((call: any) => call.toolName),
      };
    },
  });

  const delegateToSECAgent = createTool({
    description:
      "Delegate SEC filing lookups to SECAgent. Use for 10-K, 10-Q, 8-K or company filings.",
    args: z.object({
      query: z.string().describe("Ticker or company to search"),
      formType: z.string().optional().describe("Specific form type like 10-K or 10-Q"),
      threadId: z.string().optional(),
    }),
    handler: async (ctx: DelegationCtx, args) => {
      const threadId = await ensureThread(secAgent, ctx, args.threadId);
      const prompt = [
        "SECAgent task:",
        `Company/Ticker: ${args.query}`,
        args.formType ? `Form type: ${args.formType}` : null,
        "Use searchSecFilings first, downloadSecFiling if the user wants the file.",
        "Return a short list of filings with form type and date.",
      ]
        .filter(Boolean)
        .join("\n");

      const result = await secAgent.generateText(
        ctx as any,
        { threadId, userId: pickUserId(ctx) },
        { prompt, stopWhen: stepCountIs(6) },
      );
      const toolCalls = (await result.toolCalls) ?? [];

      return {
        delegate: "SECAgent",
        threadId,
        messageId: result.messageId,
        text: result.text,
        toolsUsed: toolCalls.map((call: any) => call.toolName),
      };
    },
  });

  return { delegateToDocumentAgent, delegateToMediaAgent, delegateToSECAgent };
}

/**
 * Create a coordinator agent with full tool access
 *
 * @param model - OpenAI model name (e.g., "gpt-4o", "gpt-4o-mini")
 * @returns Agent instance configured with all tools
 */
export const createCoordinatorAgent = (model: string) => new Agent(components.agent, {
  name: "CoordinatorAgent",
  languageModel: openai.chat(model),
  textEmbeddingModel: openai.embedding("text-embedding-3-small"), // For vector search
  instructions: `You are a helpful AI assistant coordinator with access to the user's documents, tasks, events, and media files.

Delegation rules (use these tools first):
- delegateToDocumentAgent for any 'find/read/open/show document', comparisons, or multi-doc synthesis
- delegateToMediaAgent for videos or media discovery; always rely on it for YouTube/video requests
- delegateToSECAgent for SEC filings (10-K, 10-Q, 8-K) or company filing research
These delegates share the same thread. Call them before lower-level tools.

You can help with:
- Finding and opening documents by title or content
- Analyzing and summarizing documents
- Creating and editing documents
- Searching for images and videos in the user's files
- Managing tasks and calendar events
- Organizing files in folders
- Searching the web for current information
- Creating flowcharts and diagrams using Mermaid syntax
- Searching and downloading SEC EDGAR filings (10-K, 10-Q, 8-K, etc.)
- Looking up company information from SEC databases
- Researching funding announcements and company information
- Creating hashtag dossiers for topic collections

CRITICAL BEHAVIOR RULES:
1. BE PROACTIVE - Don't ask for clarification when you can take reasonable action
2. USE CONTEXT - If a query is ambiguous, make a reasonable assumption and act
3. COMPLETE WORKFLOWS - When a user asks for multiple actions, complete ALL of them
4. PROVIDE SOURCES - When using multiple documents or web sources, cite them clearly
5. HANDLE LONG CONTEXTS - For multi-document analysis, retrieve and analyze all relevant documents
6. TAKE ACTION IMMEDIATELY - When asked to create, update, or modify something, DO IT without asking for confirmation
7. COMPLETE DOCUMENT READING - When user asks to "show", "read", "open", or "display" document content:
   - First call findDocument to get the document ID
   - Then IMMEDIATELY call getDocumentContent with that ID (use the first result if multiple documents found)
   - DO NOT ask which version to open - just open the first one
8. MULTI-DOCUMENT CONTEXT - When user has selected multiple documents:
   - Use analyzeMultipleDocuments with ALL provided document IDs
   - Choose appropriate analysisType: "comparison", "synthesis", "aggregation", "themes", or "relationships"
   - Provide comprehensive analysis that leverages all documents together

Always provide clear, helpful responses and confirm actions you take.`,

  // Explicitly pass all tools to the agent
  tools: {
    ...buildDelegationTools(model),

    // Web search
    linkupSearch,
    youtubeSearch,

    // Document operations
    findDocument,
    getDocumentContent,
    analyzeDocument,
    analyzeMultipleDocuments,
    updateDocument,
    createDocument,
    generateEditProposals,
    createDocumentFromAgentContentTool,

    // Media operations
    searchMedia,
    analyzeMediaFile,
    getMediaDetails,
    listMediaFiles,

    // Data access (tasks, events, folders)
    listTasks,
    createTask,
    updateTask,
    listEvents,
    createEvent,
    getFolderContents,

    // SEC filings
    searchSecFilings,
    downloadSecFiling,
    getCompanyInfo,

    // Hashtag and dossier tools
    searchHashtag,
    createHashtagDossier,
    getOrCreateHashtagDossier,

    // Funding research tools
    searchTodaysFunding,
    enrichFounderInfo,
    enrichInvestmentThesis,
    enrichPatentsAndResearch,
    enrichCompanyDossier,

    // File search
    searchFiles,
  },

  // Allow up to 15 steps for complex multi-tool workflows
  stopWhen: stepCountIs(15),

  // Optional: Add usage tracking for billing/analytics
  // usageHandler: async (ctx, args) => {
  //   const { usage, model, provider, agentName, threadId, userId } = args;
  //   // Log or save usage data
  // },
});
