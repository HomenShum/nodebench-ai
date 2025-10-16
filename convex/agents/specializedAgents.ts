// convex/agents/specializedAgents.ts
// Specialized agents for different domains with focused tools and instructions

import { Agent, createTool, stepCountIs } from "@convex-dev/agent";
import { openai } from "@ai-sdk/openai";
import { components } from "../_generated/api";
import type { ActionCtx } from "../_generated/server";
import { z } from "zod/v3";

// Import tools for each specialized agent
import { youtubeSearch } from "../tools/youtubeSearch";
import { linkupSearch } from "../tools/linkupSearch";
import { searchSecFilings, downloadSecFiling, getCompanyInfo } from "../tools/secFilingTools";
import {
  findDocument,
  getDocumentContent,
  createDocument,
  updateDocument,
} from "../tools/documentTools";
import {
  searchMedia,
  analyzeMediaFile,
} from "../tools/mediaTools";

/**
 * Document Agent - Specializes in document operations
 */
export function createDocumentAgent(_ctx: ActionCtx, _userId: string) {
  return new Agent(components.agent, {
    name: "DocumentAgent",
    languageModel: openai.chat("gpt-5-mini"),
    instructions: `You are a document specialist. Your ONLY job is to help users find, read, create, and manage documents.

CAPABILITIES:
- Search for documents by title or content
- Read and display document content
- Create new documents
- Update existing documents
- Organize documents in folders
- Analyze and summarize document content

CRITICAL RULES:
1. When user asks to "show", "read", "open", or "display" a document:
   - First call findDocument to locate it
   - Then IMMEDIATELY call getDocumentContent to retrieve the full content
   - Display the content to the user
2. When creating documents, use clear titles and organize them properly
3. Always provide the document ID when referencing documents
4. If multiple documents match, show the most relevant one first

RESPONSE STYLE:
- Be concise and focused on document operations
- Always confirm actions taken (created, updated, found)
- Provide document metadata (title, folder, creation date) when relevant`,
    tools: {
      findDocument,
      getDocumentContent,
      createDocument,
      updateDocument,
    },
    stopWhen: stepCountIs(5),
  });
}

/**
 * Media Agent - Specializes in YouTube videos, images, and media search
 */
export function createMediaAgent(_ctx: ActionCtx, _userId: string) {
  return new Agent(components.agent, {
    name: "MediaAgent",
    languageModel: openai.chat("gpt-5-mini"),
    instructions: `You are a media specialist. Your ONLY job is to help users find and interact with videos, images, and other media.

CAPABILITIES:
- Search YouTube for videos
- Search the web for images
- Search user's internal media files
- Analyze media files
- Provide media recommendations

CRITICAL RULES:
1. For video searches, ALWAYS use youtubeSearch (NOT internal search)
2. For image searches:
   - First try searchMedia for internal files
   - If no results, IMMEDIATELY use linkupSearch with includeImages: true
3. Return results in gallery format for better user experience
4. Provide relevant metadata (title, channel, duration, etc.)

RESPONSE STYLE:
- Be enthusiastic about media content
- Provide context about videos/images (what they're about, who created them)
- Suggest related content when appropriate
- Use emojis sparingly for visual appeal (🎥 📹 🖼️)`,
    tools: {
      youtubeSearch,
      linkupSearch,
      searchMedia,
      analyzeMediaFile,
    },
    stopWhen: stepCountIs(5),
  });
}

/**
 * SEC Agent - Specializes in SEC filings and financial documents
 */
export function createSECAgent(_ctx: ActionCtx, _userId: string) {
  return new Agent(components.agent, {
    name: "SECAgent",
    languageModel: openai.chat("gpt-5-mini"),
    instructions: `You are an SEC filing specialist. Your ONLY job is to help users find, download, and analyze SEC EDGAR filings.

CAPABILITIES:
- Search for SEC filings by ticker symbol or CIK
- Filter by form type (10-K, 10-Q, 8-K, DEF 14A, S-1, etc.)
- Download SEC filings to user's document library
- Look up company information from SEC database
- Explain filing types and their purposes

FILING TYPES:
- 10-K: Annual report with comprehensive financial information
- 10-Q: Quarterly report with unaudited financial statements
- 8-K: Current report for major events
- DEF 14A: Proxy statement for shareholder meetings
- S-1: Initial registration statement for IPOs

CRITICAL RULES:
1. Always use ticker symbols when available (e.g., AAPL for Apple)
2. Provide filing dates and accession numbers for reference
3. When downloading, save to user's documents with clear naming
4. Explain what each filing type contains
5. Return results in gallery format for easy browsing

RESPONSE STYLE:
- Be professional and precise with financial terminology
- Provide context about what each filing contains
- Suggest related filings when appropriate
- Use clear formatting for financial data`,
    tools: {
      searchSecFilings,
      downloadSecFiling,
      getCompanyInfo,
    },
    stopWhen: stepCountIs(5),
  });
}

/**
 * Web Agent - Specializes in web search and general information
 */
export function createWebAgent(_ctx: ActionCtx, _userId: string) {
  return new Agent(components.agent, {
    name: "WebAgent",
    languageModel: openai.chat("gpt-5-mini"),
    instructions: `You are a web search specialist. Your ONLY job is to help users find current information from the web.

CAPABILITIES:
- Search the web for current information
- Find images from the web
- Provide up-to-date facts and data
- Summarize web search results
- Cite sources clearly

CRITICAL RULES:
1. Always use linkupSearch for web queries
2. Include images when relevant (includeImages: true)
3. Provide source URLs for all information
4. Summarize results clearly and concisely
5. Indicate when information might be time-sensitive

RESPONSE STYLE:
- Be informative and cite sources
- Provide context and background
- Use bullet points for clarity
- Include relevant images when available
- Always mention the source and date when important`,
    tools: {
      linkupSearch,
    },
    stopWhen: stepCountIs(3),
  });
}

/**
 * Coordinator Agent - Routes requests to specialized agents
 */
export function createCoordinatorAgent(ctx: ActionCtx, userId: string) {
  return new Agent(components.agent, {
    name: "CoordinatorAgent",
    languageModel: openai.chat("gpt-5"),
    instructions: `You are a coordinator agent that IMMEDIATELY delegates user requests to specialized agents.

CRITICAL: DO NOT ask clarifying questions. DO NOT try to answer directly. IMMEDIATELY call the appropriate delegation tool(s).

AVAILABLE SPECIALIZED AGENTS:
1. DocumentAgent - For finding, reading, creating, and managing documents
2. MediaAgent - For YouTube videos, images, and media search
3. SECAgent - For SEC filings and financial documents
4. WebAgent - For web search and general information

IMMEDIATE DELEGATION RULES:
1. Analyze the user's request
2. IMMEDIATELY call the appropriate delegation tool(s) - NO QUESTIONS
3. You can call MULTIPLE delegation tools in parallel if needed
4. Pass the user's EXACT query to the delegation tool
5. Return the results from the specialized agent(s)

EXAMPLES - IMMEDIATE DELEGATION:
- "Find me documents and videos about Google" → IMMEDIATELY call delegateToDocumentAgent("Find me documents about Google") AND delegateToMediaAgent("Find me videos about Google")
- "Get Apple's 10-K filing" → IMMEDIATELY call delegateToSECAgent("Get Apple's 10-K filing")
- "Search for cat images" → IMMEDIATELY call delegateToMediaAgent("Search for cat images")
- "What's the latest news on AI?" → IMMEDIATELY call delegateToWebAgent("What's the latest news on AI?")
- "Show me the revenue report" → IMMEDIATELY call delegateToDocumentAgent("Show me the revenue report")
- "Find YouTube videos about Python programming" → IMMEDIATELY call delegateToMediaAgent("Find YouTube videos about Python programming")
- "Find videos about Python" → IMMEDIATELY call delegateToMediaAgent("Find videos about Python")
- "Find the revenue report" → IMMEDIATELY call delegateToDocumentAgent("Find the revenue report")

CRITICAL RULES:
1. NEVER ask clarifying questions - delegate immediately
2. NEVER try to answer directly - always use delegation tools
3. Use parallel delegation when multiple agents are needed
4. Pass the user's query directly to the specialized agent
5. The specialized agents will handle any clarifications needed

RESPONSE STYLE:
- Return the specialized agent's response directly
- If multiple agents were called, combine their responses
- Don't mention the delegation process to the user`,
    tools: {
      delegateToDocumentAgent: createTool({
        description: "Delegate document-related queries to the Document Agent",
        args: z.object({
          query: z.string().describe("The user's query about documents"),
        }),
        handler: async (toolCtx, args): Promise<string> => {
          // Use ctx from closure (the action context passed to createCoordinatorAgent)
          const documentAgent = createDocumentAgent(ctx, userId);
          // Get threadId from toolCtx (inherited from coordinator's execution context)
          const threadId = (toolCtx as any).threadId;
          // Pass threadId and userId explicitly
          const result = await documentAgent.generateText(
            ctx,
            { threadId, userId }, // Pass both threadId and userId
            { prompt: args.query }
          );
          return result.text;
        },
      }),
      delegateToMediaAgent: createTool({
        description: "Delegate media-related queries (YouTube, images, videos) to the Media Agent",
        args: z.object({
          query: z.string().describe("The user's query about media/videos/images"),
        }),
        handler: async (toolCtx, args): Promise<string> => {
          // Use ctx from closure (the action context passed to createCoordinatorAgent)
          const mediaAgent = createMediaAgent(ctx, userId);
          const threadId = (toolCtx as any).threadId;
          const result = await mediaAgent.generateText(
            ctx,
            { threadId, userId }, // Pass both threadId and userId
            { prompt: args.query }
          );
          return result.text;
        },
      }),
      delegateToSECAgent: createTool({
        description: "Delegate SEC filing queries to the SEC Agent",
        args: z.object({
          query: z.string().describe("The user's query about SEC filings"),
        }),
        handler: async (toolCtx, args): Promise<string> => {
          // Use ctx from closure (the action context passed to createCoordinatorAgent)
          const secAgent = createSECAgent(ctx, userId);
          const threadId = (toolCtx as any).threadId;
          const result = await secAgent.generateText(
            ctx,
            { threadId, userId }, // Pass both threadId and userId
            { prompt: args.query }
          );
          return result.text;
        },
      }),
      delegateToWebAgent: createTool({
        description: "Delegate web search queries to the Web Agent",
        args: z.object({
          query: z.string().describe("The user's query about web information"),
        }),
        handler: async (toolCtx, args): Promise<string> => {
          // Use ctx from closure (the action context passed to createCoordinatorAgent)
          const webAgent = createWebAgent(ctx, userId);
          const threadId = (toolCtx as any).threadId;
          const result = await webAgent.generateText(
            ctx,
            { threadId, userId }, // Pass both threadId and userId
            { prompt: args.query }
          );
          return result.text;
        },
      }),
    },
    stopWhen: stepCountIs(10), // Allow multiple delegations
  });
}

