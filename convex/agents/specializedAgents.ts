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
import { confirmCompanySelection } from "../tools/confirmCompanySelection";
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

CRITICAL RULES - BEST-EFFORT EXECUTION:
1. NEVER ask clarifying questions before searching - execute immediately with best interpretation
2. When user asks to "show", "read", "open", or "display" a document:
   - First call findDocument to locate it
   - Then IMMEDIATELY call getDocumentContent to retrieve the full content
   - Display the content to the user
3. When creating documents, use clear titles and organize them properly
4. Always provide the document ID when referencing documents
5. If multiple documents match, show the most relevant one first
6. If query is ambiguous, make a reasonable assumption and search immediately
7. Include a brief note at the END if you made assumptions

BEST-EFFORT DOCUMENT RESOLUTION:
- For partial titles: Search for the most likely match based on keywords
  Example: "revenue report" → search for documents containing "revenue" and "report"
- For ambiguous titles: Use the most recently modified document
- If multiple matches: Present the most relevant match first, list alternatives at the end
- ALWAYS execute the search first, present findings, then clarify if needed

RESPONSE STYLE:
- Present findings FIRST (document content, metadata)
- Be concise and focused on document operations
- Always confirm actions taken (created, updated, found)
- Provide document metadata (title, folder, creation date) when relevant
- Include clarifications/alternatives at the END, not the beginning`,
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

CRITICAL RULES - BEST-EFFORT EXECUTION:
1. NEVER ask clarifying questions before searching - execute immediately with best interpretation
2. For video searches, ALWAYS use youtubeSearch (NOT internal search)
3. For image searches:
   - First try searchMedia for internal files
   - If no results, IMMEDIATELY use linkupSearch with includeImages: true
4. Return results in gallery format for better user experience
5. Provide relevant metadata (title, channel, duration, etc.)
6. If query is ambiguous, make a reasonable assumption and search immediately
7. Include a brief note at the END if you made assumptions (e.g., "Note: I searched for [X]. If you meant something else, please clarify.")

BEST-EFFORT ENTITY RESOLUTION:
- For company/product names: Use the most prominent/well-known entity (e.g., "Ditto.ai" → search for the company at ditto.ai domain)
- For person names: Include context clues from the query (e.g., "Eric Liu founder Ditto.ai" → search for "Eric Liu Ditto.ai founder")
- For ambiguous terms: Use the most common interpretation and note alternatives at the end
- ALWAYS execute the search first, clarify later if needed

RESPONSE STYLE:
- Present findings FIRST (videos, images, metadata)
- Be enthusiastic about media content
- Provide context about videos/images (what they're about, who created them)
- Suggest related content when appropriate
- Use emojis sparingly for visual appeal (🎥 📹 🖼️)
- Include clarifications/assumptions at the END, not the beginning`,
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
- Search for SEC filings by ticker symbol, CIK, or company name
- Filter by form type (10-K, 10-Q, 8-K, DEF 14A, S-1, etc.)
- Download SEC filings to user's document library
- Look up company information from SEC database
- Explain filing types and their purposes
- Handle company disambiguation when multiple matches are found

FILING TYPES:
- 10-K: Annual report with comprehensive financial information
- 10-Q: Quarterly report with unaudited financial statements
- 8-K: Current report for major events
- DEF 14A: Proxy statement for shareholder meetings
- S-1: Initial registration statement for IPOs

CRITICAL RULES - BEST-EFFORT EXECUTION:
1. NEVER ask clarifying questions before searching - execute immediately with best interpretation
2. When searching by company name (not ticker), ALWAYS include the threadId parameter
3. If multiple companies match, present the MOST LIKELY match first with findings
4. Include a note at the END if other companies matched
5. Provide filing dates and accession numbers for reference
6. When downloading, save to user's documents with clear naming
7. Explain what each filing type contains
8. Return results in gallery format for easy browsing

BEST-EFFORT COMPANY RESOLUTION:
- For well-known companies: Use the most prominent public company with that name
  Example: "Apple" → Apple Inc. (AAPL, CIK: 0000320193)
- For ambiguous names: Use context clues from the query
  Example: "Ditto.ai 10-K" → Search for "Ditto" or "Ditto Inc" in SEC database
- If multiple matches: Present the most likely match first, list alternatives at the end
- ALWAYS execute the search first, present findings, then clarify if needed

COMPANY DISAMBIGUATION WORKFLOW (PROGRESSIVE DISCLOSURE):
1. User asks: "Get Dasher's 10-K"
2. Call searchSecFilings with companyName="Dasher" and threadId
3. If multiple companies match:
   a. Select the MOST LIKELY match based on market cap, filing activity, name similarity
   b. Present findings for that company FIRST
   c. Include a note at the END: "Note: I found [Company Name] (CIK: XXX). If you meant a different company, here are other matches: [list]"
4. User gets immediate value from the best-effort match
5. If user clarifies they meant a different company, call confirmCompanySelection and search again

RESPONSE STYLE:
- Present findings FIRST (filings, company info, financial data)
- Be professional and precise with financial terminology
- Provide context about what each filing contains
- Suggest related filings when appropriate
- Use clear formatting for financial data
- Include clarifications/alternatives at the END, not the beginning`,
    tools: {
      searchSecFilings,
      downloadSecFiling,
      getCompanyInfo,
      confirmCompanySelection,
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
- Research companies, people, products, and topics

CRITICAL RULES - BEST-EFFORT EXECUTION:
1. NEVER ask clarifying questions before searching - execute immediately with best interpretation
2. Always use linkupSearch for web queries
3. Include images when relevant (includeImages: true)
4. Provide source URLs for all information
5. Summarize results clearly and concisely
6. Indicate when information might be time-sensitive
7. For multi-entity queries, execute ALL searches immediately in parallel
8. If query is ambiguous, make a reasonable assumption and search immediately
9. Include a brief note at the END if you made assumptions

BEST-EFFORT ENTITY RESOLUTION:
- For company names: Use the most prominent/well-known entity with that exact name or domain
  Example: "Ditto.ai" → search for "Ditto.ai company" (the company at ditto.ai domain)
- For person names with context: Include all context clues in the search
  Example: "Eric Liu founder Ditto.ai" → search for "Eric Liu founder Ditto.ai LinkedIn"
- For ambiguous terms: Use the most common interpretation and note alternatives at the end
- For multi-entity queries: Break into multiple searches and execute in parallel
  Example: "Ditto.ai, Eric Liu, fundraising, news" →
    1. Search "Ditto.ai company information"
    2. Search "Eric Liu Ditto.ai founder LinkedIn"
    3. Search "Ditto.ai fundraising funding rounds"
    4. Search "Ditto.ai recent news"
- ALWAYS execute searches first, clarify later if needed

MULTI-ENTITY RESEARCH QUERIES:
When user asks for comprehensive information about a company/person/product:
1. Execute multiple searches immediately (company info, founder, funding, news, media)
2. Use linkupSearch with includeImages: true to get visual content
3. Structure the response with clear sections:
   - Company/Entity Overview
   - Key People (founders, executives)
   - Funding/Financials (if applicable)
   - Recent News & Updates
   - Media Assets (images, videos)
   - Additional Resources (careers, social media)
4. Present ALL findings first, then include clarifications at the end

RESPONSE STYLE:
- Present findings FIRST in a structured format
- Be informative and cite sources
- Provide context and background
- Use bullet points and sections for clarity
- Include relevant images when available
- Always mention the source and date when important
- Include clarifications/assumptions at the END, not the beginning
- For comprehensive queries, organize information by category (overview, people, funding, news, media)`,
    tools: {
      linkupSearch,
    },
    stopWhen: stepCountIs(8), // Increased to allow multiple searches for comprehensive queries
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
          console.log('[delegateToDocumentAgent] Delegating query:', args.query);
          const documentAgent = createDocumentAgent(ctx, userId);
          const threadId = (toolCtx as any).threadId;

          // Inject userId into context for tools to access
          const contextWithUserId = {
            ...ctx,
            evaluationUserId: userId,
          };

          // Continue the thread with the document agent
          // This reuses the existing thread context without creating a new user message
          const { thread } = await documentAgent.continueThread(contextWithUserId as any, { threadId });

          // Use streamText to process within the current thread context
          // The agent will see the conversation history and use tools to answer
          const result = await thread.streamText({
            system: `Process this delegated query: "${args.query}". Use your available tools to find and return the requested information.`,
          });

          await result.consumeStream();
          const text = await result.text;
          console.log('[delegateToDocumentAgent] Delegation complete, response length:', text.length);

          return text;
        },
      }),
      delegateToMediaAgent: createTool({
        description: "Delegate media-related queries (YouTube, images, videos) to the Media Agent",
        args: z.object({
          query: z.string().describe("The user's query about media/videos/images"),
        }),
        handler: async (toolCtx, args): Promise<string> => {
          console.log('[delegateToMediaAgent] Delegating query:', args.query);
          const mediaAgent = createMediaAgent(ctx, userId);
          const threadId = (toolCtx as any).threadId;

          // Inject userId into context for tools to access
          const contextWithUserId = {
            ...ctx,
            evaluationUserId: userId,
          };

          // Continue the thread with the media agent
          // This reuses the existing thread context without creating a new user message
          const { thread } = await mediaAgent.continueThread(contextWithUserId as any, { threadId });

          // Use streamText to process within the current thread context
          // The agent will see the conversation history and use tools to answer
          const result = await thread.streamText({
            system: `Process this delegated query: "${args.query}". Use your available tools to find and return the requested information.`,
          });

          await result.consumeStream();
          const text = await result.text;
          console.log('[delegateToMediaAgent] Delegation complete, response length:', text.length);

          return text;
        },
      }),
      delegateToSECAgent: createTool({
        description: "Delegate SEC filing queries to the SEC Agent",
        args: z.object({
          query: z.string().describe("The user's query about SEC filings"),
        }),
        handler: async (toolCtx, args): Promise<string> => {
          console.log('[delegateToSECAgent] Delegating query:', args.query);
          const secAgent = createSECAgent(ctx, userId);
          const threadId = (toolCtx as any).threadId;

          // Inject userId into context for tools to access
          const contextWithUserId = {
            ...ctx,
            evaluationUserId: userId,
          };

          // Continue the thread with the SEC agent
          // This reuses the existing thread context without creating a new user message
          const { thread } = await secAgent.continueThread(contextWithUserId as any, { threadId });

          // Use streamText to process within the current thread context
          // The agent will see the conversation history and use tools to answer
          const result = await thread.streamText({
            system: `Process this delegated query: "${args.query}". Use your available tools to find and return the requested information.`,
          });

          await result.consumeStream();
          const text = await result.text;
          console.log('[delegateToSECAgent] Delegation complete, response length:', text.length);

          return text;
        },
      }),
      delegateToWebAgent: createTool({
        description: "Delegate web search queries to the Web Agent",
        args: z.object({
          query: z.string().describe("The user's query about web information"),
        }),
        handler: async (toolCtx, args): Promise<string> => {
          console.log('[delegateToWebAgent] Delegating query:', args.query);
          const webAgent = createWebAgent(ctx, userId);
          const threadId = (toolCtx as any).threadId;

          // Inject userId into context for tools to access
          const contextWithUserId = {
            ...ctx,
            evaluationUserId: userId,
          };

          // Continue the thread with the web agent
          // This reuses the existing thread context without creating a new user message
          const { thread } = await webAgent.continueThread(contextWithUserId as any, { threadId });

          // Use streamText to process within the current thread context
          // The agent will see the conversation history and use tools to answer
          const result = await thread.streamText({
            system: `Process this delegated query: "${args.query}". Use your available tools to find and return the requested information.`,
          });

          await result.consumeStream();
          const text = await result.text;
          console.log('[delegateToWebAgent] Delegation complete, response length:', text.length);

          return text;
        },
      }),
    },
    stopWhen: stepCountIs(10), // Allow multiple delegations
  });
}

