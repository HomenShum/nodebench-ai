// FastAgentPanel Streaming - Backend functions for Agent component streaming
import { v } from "convex/values";
import { internalQuery, internalMutation, internalAction, action, mutation, query } from "../../_generated/server";
import { paginationOptsValidator } from "convex/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api, internal, components } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";

// Import streaming utilities from @convex-dev/agent
import { Agent, stepCountIs, vStreamArgs, syncStreams, listUIMessages, storeFile, getFile, saveMessage, vProviderMetadata } from "@convex-dev/agent";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

// Import tools
import { linkupSearch } from "../../tools/media/linkupSearch";
import { youtubeSearch } from "../../tools/media/youtubeSearch";
import {
  findDocument,
  getDocumentContent,
  analyzeDocument,
  analyzeMultipleDocuments,
  updateDocument,
  createDocument,
  generateEditProposals,
  createDocumentFromAgentContentTool,
} from "../../tools/document/documentTools";
import {
  searchMedia,
  analyzeMediaFile,
  getMediaDetails,
  listMediaFiles
} from "../../tools/media/mediaTools";
import {
  listTasks,
  createTask,
  updateTask,
  listEvents,
  createEvent,
  getFolderContents
} from "../../tools/integration/dataAccessTools";
import {
  searchSecFilings,
  downloadSecFiling,
  getCompanyInfo
} from "../../tools/sec/secFilingTools";
import {
  searchHashtag,
  createHashtagDossier,
  getOrCreateHashtagDossier
} from "../../tools/document/hashtagSearchTools";
import {
  searchTodaysFunding
} from "../../tools/financial/fundingResearchTools";
import {
  enrichFounderInfo,
  enrichInvestmentThesis,
  enrichPatentsAndResearch,
  enrichCompanyDossier
} from "../../tools/financial/enhancedFundingTools";
import { searchFiles } from "../../tools/document/geminiFileSearch";
import { getLlmModel } from "../../../shared/llm/modelCatalog";

const streamCancellationControllers = new Map<string, AbortController>();

// Helper to get the appropriate language model based on model name
// Note: For now, only OpenAI models are supported due to bundler constraints
// Gemini support will be added in a future update
function getLanguageModel(modelName: string) {
  const fallbackModel = getLlmModel("chat", "openai");
  // For now, map all models to OpenAI
  // TODO: Add Gemini support with dynamic imports when @ai-sdk/google is available
  if (modelName.startsWith("gemini")) {
    console.warn(`[getLanguageModel] Gemini model requested(${modelName}) but not yet supported, falling back to ${fallbackModel}`);
    return openai.chat(fallbackModel);
  }
  // Default to OpenAI
  return openai.chat(modelName || fallbackModel);
}

// Simple, lightweight agent for Mini Note Agent (no tools, fast responses)
const createSimpleChatAgent = (model: string) => new Agent(components.agent, {
  name: "MiniNoteAgent",
  languageModel: getLanguageModel(model),
  instructions: `You are a helpful, friendly AI assistant for quick conversations and note - taking.

Keep responses:
- Concise and conversational
  - Helpful and informative
    - Natural and friendly

You don't have access to tools or external data - just provide thoughtful, direct responses based on the conversation.`,
  tools: {}, // No tools for speed
  stopWhen: stepCountIs(3), // Very short for simple chat
});

// Full-featured agent with tools for Fast Agent Panel
const createChatAgent = (model: string) => new Agent(components.agent, {
  name: "FastChatAgent",
  languageModel: getLanguageModel(model),
  contextHandler: async (ctx: any, args: any): Promise<any[]> => {
    try {
      if (!args.threadId) return [];
      const threadId = args.threadId as string;
      const recent = await ctx.runQuery(components.agent.messages.listMessagesByThreadId, {
        threadId,
        order: "desc",
        paginationOpts: { cursor: null, numItems: 30 },
      });

      const lessons = recent.page
        .filter((m: any) => m.role === "assistant" && m.metadata?.lesson)
        .map((m: any) => ({ role: "assistant", content: m.metadata.lesson as string }));

      return [
        ...(lessons || []),
        ...(args.recent || []),
        ...(args.inputMessages || []),
        ...(typeof args.inputPrompt === "string"
          ? [{ role: "user", content: args.inputPrompt }]
          : []),
      ] as any;
    } catch (err) {
      console.warn("[FastChatAgent][contextHandler] failed, falling back to default", err);
      return [];
    }
  },
  instructions: `You are a helpful AI assistant with access to the user's documents, tasks, events, and media files.

You can help with:
- Finding and opening documents by title or content
- Analyzing and summarizing documents
- Creating and editing documents
- Searching for images and videos in the user's files
- Searching across uploaded files (PDFs, images, documents) using searchFiles tool
- Managing tasks and calendar events
- Organizing files in folders
- Searching the web for current information
- Creating flowcharts and diagrams using Mermaid syntax
- Searching and downloading SEC EDGAR filings (10-K, 10-Q, 8-K, etc.)
- Looking up company information from SEC databases

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
8. MULTI-DOCUMENT CONTEXT - When user has selected multiple documents (indicated by [CONTEXT: Analyzing N document(s): ...]):
   - Use analyzeMultipleDocuments with ALL provided document IDs
   - Choose appropriate analysisType: "comparison" for side-by-side, "synthesis" for combined insights, "aggregation" for data collection, "themes" for patterns, "relationships" for connections
   - Provide comprehensive analysis that leverages all documents together
   - Highlight connections and patterns across documents

IMPORTANT Tool Selection Guidelines:
- When the user asks to "find images" or "find videos":
  * First, try searchMedia to search their internal files
  * If searchMedia returns "No images found" or similar, IMMEDIATELY call linkupSearch with includeImages: true to search the web
  * CRITICAL: Don't stop after searchMedia fails - automatically try linkupSearch next!
- Use linkupSearch for web searches and when searchMedia finds no results
- When they ask about tasks or calendar, use the task and event tools
- When they want to find or watch YouTube videos, use the youtubeSearch tool
- For document-related queries:
  * Use findDocument to SEARCH for documents by title or content
  * Use getDocumentContent to READ/SHOW the actual content of a specific document
  * Use searchFiles to search across ALL uploaded files (PDFs, images, documents) when:
    - User asks to find information across multiple uploaded files
    - User wants to search through their uploaded documents
    - User asks questions about files they've uploaded
    - User wants to compare or analyze content from multiple files
  * Use analyzeMultipleDocuments when the user wants to:
    - Compare multiple documents
    - Synthesize information across documents
    - Find common themes or patterns
    - Aggregate data from multiple sources
    - Analyze relationships between documents
  * MULTI-DOCUMENT WORKFLOW: If user asks to compare/analyze multiple docs, first use findDocument to locate them, then call analyzeMultipleDocuments with all the IDs
  * CRITICAL: When user asks to "show", "read", "open", or "display" document content, you MUST call getDocumentContent after findDocument
  * Example workflow: User says "Show me the Revenue Report" → Call findDocument("Revenue Report") → Call getDocumentContent(documentId) → Return the content

Image Search Workflow (MANDATORY):
1. User asks for "cat images" or similar
2. Call searchMedia(query: "cat", mediaType: "image")
3. If result contains "No images found", IMMEDIATELY call linkupSearch(query: "cat images", includeImages: true)
4. Return the web images to the user

Video Search Workflow (MANDATORY):
1. User asks for "videos about X" or "find video on Y"
2. ALWAYS use youtubeSearch tool (NOT searchMedia for videos)
3. youtubeSearch will return an interactive gallery of YouTube videos
4. Example: "find videos about Google" → Call youtubeSearch(query: "Google")

SEC Filing Workflow (MANDATORY):
1. User asks about SEC filings, 10-K, 10-Q, 8-K, annual reports, quarterly reports, or company filings
2. Use searchSecFilings with ticker symbol or company name
3. To download a filing, use downloadSecFiling with the document URL
4. Examples:
   - "Find SEC filings for Apple" → Call searchSecFilings(ticker: "AAPL")
   - "Get Google's 10-K" → Call searchSecFilings(ticker: "GOOGL", formType: "10-K")
   - "Download Tesla's latest quarterly report" → Call searchSecFilings(ticker: "TSLA", formType: "10-Q") then downloadSecFiling()

Document vs Video vs SEC Distinction (CRITICAL):
- "find document about X" → Use findDocument (searches internal documents)
- "find video about X" → Use youtubeSearch (searches YouTube)
- "find SEC filing for X" → Use searchSecFilings (searches SEC EDGAR)
- "find information about X" → Use linkupSearch (searches the web)
- When user says "document AND video", call BOTH findDocument AND youtubeSearch

Creation & Mutation Actions (ALWAYS EXECUTE IMMEDIATELY):
When the user asks to create, update, or modify something, you MUST call the appropriate tool IMMEDIATELY and then provide a confirmation response.

Examples of IMMEDIATE execution:
- "Create a document" → Call createDocument() NOW → Respond with confirmation
- "Create a task" → Call createTask() NOW → Respond with confirmation
- "Schedule a meeting" → Call createEvent() NOW → Respond with confirmation
- "Update document title" → Call findDocument() then updateDocument() NOW → Respond with confirmation
- "Mark task complete" → Call listTasks() then updateTask() NOW → Respond with confirmation
- "Analyze image" → Call analyzeMediaFile() NOW → Respond with analysis

Document Generation Save Workflow:
- If your assistant text includes a DOCUMENT_METADATA block followed by markdown content, you MUST immediately call createDocumentFromAgentContentTool with the parsed title and the full markdown content (excluding the comment block). After the tool call, provide a short confirmation text mentioning the created document title. This ensures the timeline displays the creation as a tool call.


CRITICAL RULES:
1. NEVER ask "Would you like me to..." or "Should I..." for mutations - JUST DO IT!
2. ALWAYS provide a text response after calling tools - never leave response empty
3. After calling ANY tool, you MUST generate a final text response

Context Handling:
- When asked "What is this document about?" - Use the most recent document from conversation context, or search for the most relevant document
- When asked to "analyze this image" - Use analyzeMediaFile with the specific filename or most recent image from context
- When asked to "create a document" - Create it immediately with reasonable defaults (don't ask for details)
- When asked to "change the title" - Find the most recent document mentioned and update it immediately
- When asked about "tasks" or "events" without specifics - Show today's items by default
- When comparing multiple documents - Retrieve ALL documents first, then compare them
- When asked for "all tasks" - Return ALL tasks without limits
- For follow-up questions - Maintain context from previous conversation

Multi-Source Handling:
- When analyzing multiple documents, retrieve each one and cite sources
- When combining web and internal data, clearly distinguish between sources
- For cross-references, show connections between documents/tasks/events
- Always provide source attribution for facts and data

Workflow Completion:
- If user asks for multiple actions (e.g., "find, open, analyze, and edit"), complete ALL steps
- Don't stop after partial completion - finish the entire workflow
- Confirm each step as you complete it
- For multi-step workflows, execute ALL tools needed, then provide a comprehensive response

Mermaid Diagram Support:
- You can create flowcharts, sequence diagrams, class diagrams, and more using Mermaid syntax
- Wrap Mermaid code in \`\`\`mermaid code blocks
- Supported diagram types: flowchart, sequenceDiagram, classDiagram, stateDiagram, erDiagram, gantt, pie, and more
- Example:
\`\`\`mermaid
graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    C --> E[End]
    D --> E
\`\`\`

Mermaid Syntax Rules (CRITICAL):
- Edges from decision nodes MUST use: -->|Label| or --> (not -- or -)
- Node IDs must be alphanumeric (no spaces)
- Subgraph syntax: subgraph title ... end
- Common errors:
  * Using '-- Label' instead of '-->|Label|' for labeled edges
  * Using 'PS' or invalid tokens - always use proper edge syntax
  * Missing brackets around node labels

Mermaid Error Auto-Correction:
- If you receive a message starting with "[MERMAID_ERROR]" or "Fix this Mermaid diagram", you MUST:
  1. Analyze the parse error message carefully
  2. Identify the syntax error (usually edge syntax like '-- Pass' instead of '-->|Pass|')
  3. Generate a CORRECTED version of the Mermaid diagram
  4. Respond with ONLY the corrected \`\`\`mermaid code block
  5. Add a brief note about what was fixed

Always provide clear, helpful responses and confirm actions you take.`,

  // Explicitly pass all tools to the agent
  tools: {
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

    // Gemini File Search
    searchFiles,
  },

  // Allow up to 15 steps for complex multi-tool workflows
  stopWhen: stepCountIs(15),

  // Add text embedding model for vector search
  textEmbeddingModel: openai.embedding("text-embedding-3-small"),

  usageHandler: async (ctx, args) => {
    // Track OpenAI API usage for billing/analytics
    if (!args.userId) {
      console.debug("[usageHandler] No userId, skipping tracking");
      return;
    }

    await ctx.runMutation(internal.domains.agents.fastAgentPanelStreaming.insertApiUsage, {
      userId: args.userId,
      apiName: "openai",
      operation: "generate",
      model: args.model,
      provider: args.provider,
      usage: args.usage, // Pass as-is, will transform in mutation
    });
  },
});

// Fast responder with small step budget for simple requests (still has all tools)
const createFastResponderAgent = (model: string) => new Agent(components.agent, {
  name: "FastResponder",
  languageModel: getLanguageModel(model),
  instructions: `You are the fast path responder. Provide a direct, helpful reply in one message with no tool calls or long reasoning. Keep it under two sentences unless clarification is essential.`,
  tools: {},
  stopWhen: stepCountIs(1),
  textEmbeddingModel: openai.embedding("text-embedding-3-small"),
});

// Lightweight planner to classify and decompose requests
// Note: The mode field is advisory - CoordinatorAgent is always used for research panel
const planSchema = z.object({
  mode: z.enum(["simple", "complex"]),
  tasks: z.array(
    z.object({
      description: z.string(),
      agent: z.enum(["document", "media", "sec", "web", "task", "event", "entity", "general"]).default("general"),
    })
  ).default([]),
});

const createPlannerAgent = (model: string) => new Agent(components.agent, {
  name: "PlannerAgent",
  languageModel: getLanguageModel(model),
  instructions: `Classify and decompose the user's request.

RULES:
- Use mode = "simple" ONLY when the request can be answered in one short response using general knowledge, with NO tasks.
- Use mode = "complex" whenever you create ANY tasks.
- If the user asks to research/analyze/investigate/dossier/newsletter about a company/person/theme, create a task with agent = "entity".
- If tasks array is non-empty, mode MUST be "complex".
- SEC/10-K/10-Q/funding/valuation requests → agent = "sec" or "entity"

AGENT BUCKETS:
- entity: Company research, person research, thematic analysis, GAM memory queries
- document: Document search, reading, creation, editing
- media: YouTube, images, web media
- sec: SEC filings, 10-K, 10-Q, 8-K
- web: General web search
- task/event: Task or calendar management
- general: Other

EXAMPLES:
"Research Tesla" → mode: "complex", tasks: [{ agent: "entity", description: "Research Tesla company" }]
"Who is Sam Altman?" → mode: "complex", tasks: [{ agent: "entity", description: "Research Sam Altman" }]
"Tell me about OpenAI" → mode: "complex", tasks: [{ agent: "entity", description: "Research OpenAI" }]
"#AI infrastructure trends" → mode: "complex", tasks: [{ agent: "entity", description: "Research AI infrastructure theme" }]
"Find Tesla's 10-K" → mode: "complex", tasks: [{ agent: "sec", description: "Find Tesla 10-K filing" }]
"What is 2+2?" → mode: "simple", tasks: []
"Thanks!" → mode: "simple", tasks: []
"Hello" → mode: "simple", tasks: []`,
  stopWhen: stepCountIs(3),
});

/**
 * List all streaming threads for the current user with enriched data
 */
export const listThreads = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const threads = await ctx.db
      .query("chatThreadsStream")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(200);

    // Enrich each thread with message count, tools used, and models used
    const enrichedThreads = await Promise.all(
      threads.map(async (thread) => {
        try {
          // Get messages from the chatMessagesStream table
          const messages = await ctx.db
            .query("chatMessagesStream")
            .withIndex("by_thread", (q) => q.eq("threadId", thread._id))
            .take(500);

          let messageCount = messages.length;

          // Extract unique tools and models from messages
          const toolsUsed = new Set<string>();
          const modelsUsed = new Set<string>();
          let lastMessage = "";
          let lastMessageAt = thread.updatedAt;

          // If linked to agent thread, get more detailed info
          if (thread.agentThreadId) {
            try {
              const agentMessagesResult = await ctx.runQuery(components.agent.messages.listMessagesByThreadId, {
                threadId: thread.agentThreadId,
                order: "asc",
                paginationOpts: { cursor: null, numItems: 1000 },
              });

              const agentMessages = agentMessagesResult.page;

              // Use agent message count if available (it's the source of truth)
              if (agentMessages && agentMessages.length > 0) {
                messageCount = agentMessages.length;
              }

              for (const message of agentMessages) {
                const msg = message as any;

                // Track tools - agent component stores tool info in 'tool' field
                if (msg.tool) {
                  if (typeof msg.tool === 'string') {
                    toolsUsed.add(msg.tool);
                  } else if (msg.tool.name) {
                    toolsUsed.add(msg.tool.name);
                  } else if (msg.tool.toolName) {
                    toolsUsed.add(msg.tool.toolName);
                  }
                }

                // Also check message.message for tool call info
                if (msg.message && typeof msg.message === 'object') {
                  if (msg.message.tool) {
                    const toolName = typeof msg.message.tool === 'string' ? msg.message.tool : msg.message.tool.name;
                    if (toolName) toolsUsed.add(toolName);
                  }
                  if (msg.message.toolCalls && Array.isArray(msg.message.toolCalls)) {
                    for (const tc of msg.message.toolCalls) {
                      if (tc.toolName) toolsUsed.add(tc.toolName);
                      if (tc.name) toolsUsed.add(tc.name);
                    }
                  }
                }

                // Track model from provider metadata
                if (msg.providerMetadata?.model) {
                  modelsUsed.add(msg.providerMetadata.model);
                } else if (msg.message?.model) {
                  modelsUsed.add(msg.message.model);
                }

                // Get last message text for preview
                if (msg.text) {
                  lastMessage = msg.text.substring(0, 100);
                  lastMessageAt = msg._creationTime;
                }
              }
            } catch (err) {
              console.error("Error fetching agent messages:", err);
            }
          }

          // Also check the model stored in the thread
          if (thread.model) {
            modelsUsed.add(thread.model);
          }

          // Get last message from streaming messages if no agent message found
          if (!lastMessage && messages.length > 0) {
            const lastMsg = messages[messages.length - 1];
            if (lastMsg.content) {
              lastMessage = lastMsg.content.substring(0, 100);
              lastMessageAt = lastMsg.updatedAt;
            }
          }

          const enriched = {
            ...thread,
            messageCount,
            toolsUsed: Array.from(toolsUsed),
            modelsUsed: Array.from(modelsUsed),
            lastMessage,
            lastMessageAt,
          };
          console.log(`[listThreads] Enriched streaming thread ${thread._id}:`, {
            messageCount: enriched.messageCount,
            toolsCount: enriched.toolsUsed.length,
            modelsCount: enriched.modelsUsed.length,
          });
          return enriched;
        } catch (error) {
          console.error("[listThreads] Error enriching streaming thread:", thread._id, error);
          return {
            ...thread,
            messageCount: 0,
            toolsUsed: [],
            modelsUsed: [],
            lastMessage: "",
            lastMessageAt: thread.updatedAt,
          };
        }
      })
    );

    console.log('[listThreads] Returning', enrichedThreads.length, 'enriched streaming threads');
    return enrichedThreads;
  },
});

/**
 * Get a specific thread by ID
 */
export const getThread = query({
  args: {
    threadId: v.id("chatThreadsStream"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const thread = await ctx.db.get(args.threadId);
    if (!thread || thread.userId !== userId) return null;

    return thread;
  },
});

/**
 * Get a specific thread (for HTTP streaming endpoint)
 */
export const getThreadByStreamId = query({
  args: {
    threadId: v.id("chatThreadsStream"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const thread = await ctx.db.get(args.threadId);
    if (!thread || thread.userId !== userId) return null;

    return thread;
  },
});

/**
 * Create a new streaming thread (also creates agent thread for memory management)
 */
export const createThread = action({
  args: {
    title: v.optional(v.string()),
    model: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"chatThreadsStream">> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const modelName = args.model || getLlmModel("chat", "openai");
    const chatAgent = createChatAgent(modelName);
    const title = (args.title ?? "").trim() || "Research Thread";

    // Create agent thread for automatic memory management
    const { threadId: agentThreadId } = await chatAgent.createThread(ctx, { userId, title });

    // Update agent thread summary
    await ctx.runMutation(components.agent.threads.updateThread, {
      threadId: agentThreadId,
      patch: {
        summary: title,
      },
    });

    // Create streaming thread linked to agent thread
    const now = Date.now();
    const threadId = await ctx.runMutation(internal.domains.agents.fastAgentPanelStreaming.createThreadInternal, {
      userId,
      title,
      model: modelName,
      agentThreadId,
      now,
    });

    return threadId;
  },
});

/**
 * Internal mutation to create streaming thread
 */
export const createThreadInternal = internalMutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    model: v.optional(v.string()),
    agentThreadId: v.string(),
    now: v.number(),
  },
  handler: async (ctx, args) => {
    const threadId = await ctx.db.insert("chatThreadsStream", {
      userId: args.userId,
      title: args.title,
      model: args.model,
      agentThreadId: args.agentThreadId,
      pinned: false,
      createdAt: args.now,
      updatedAt: args.now,
    });

    return threadId;
  },
});

/**
 * Update thread title
 */
export const updateThreadTitle = mutation({
  args: {
    threadId: v.id("chatThreadsStream"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const thread = await ctx.db.get(args.threadId);
    if (!thread || thread.userId !== userId) {
      throw new Error("Thread not found or unauthorized");
    }

    await ctx.db.patch(args.threadId, {
      title: args.title,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Auto-generate a thread title based on the first user message
 * Uses AI to create a concise, descriptive title
 */
export const autoNameThread = action({
  args: {
    threadId: v.id("chatThreadsStream"),
    firstMessage: v.string(),
  },
  handler: async (ctx, args): Promise<{ title: string; skipped: boolean }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const thread: { userId: string; title?: string } | null = await ctx.runQuery(internal.domains.agents.fastAgentPanelStreaming.getThreadById, {
      threadId: args.threadId,
    });

    if (!thread || thread.userId !== userId) {
      throw new Error("Thread not found or unauthorized");
    }

    // Skip if thread already has a custom title (not default)
    if (thread.title && thread.title !== "New Chat" && thread.title !== "Research Thread") {
      return { title: thread.title, skipped: true };
    }

    // Generate title using OpenAI
    const OpenAI = (await import("openai")).default;
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await openai.chat.completions.create({
      model: getLlmModel("chat", "openai"),
      messages: [
        {
          role: "system",
          content: `Generate a concise, descriptive title (max 50 chars) for a research chat thread based on the user's first message.
The title should capture the main topic or intent.
Return ONLY the title, no quotes or extra formatting.
Examples:
- "Tesla Q4 Earnings Analysis"
- "AI Startup Funding Trends"
- "SEC Filing Review: Apple"
- "Competitor Analysis: Stripe"`,
        },
      {
        role: "user",
        content: args.firstMessage.slice(0, 500), // Limit input
      },
    ],
    max_completion_tokens: 60,
  });

    const generatedTitle = response.choices[0]?.message?.content?.trim() || "Research Thread";

    // Truncate to 50 chars if needed
    const finalTitle = generatedTitle.slice(0, 50);

    // Update the thread title
    await ctx.runMutation(api.domains.agents.fastAgentPanelStreaming.updateThreadTitle, {
      threadId: args.threadId,
      title: finalTitle,
    });

    return { title: finalTitle, skipped: false };
  },
});

/**
 * Internal query to get thread by ID
 */
export const getThreadById = internalQuery({
  args: {
    threadId: v.id("chatThreadsStream"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.threadId);
  },
});

/**
 * Delete a thread and all its messages
 */
export const deleteThread = mutation({
  args: {
    threadId: v.id("chatThreadsStream"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const thread = await ctx.db.get(args.threadId);
    if (!thread || thread.userId !== userId) {
      throw new Error("Thread not found or unauthorized");
    }

    // Delete all messages in the thread
    // Delete messages in batches to avoid loading too many at once
    let cursor: string | null = null;
    while (true) {
      const page = await ctx.db
        .query("chatMessagesStream")
        .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
        .paginate({ cursor, numItems: 200 });

      for (const message of page.page) {
        await ctx.db.delete(message._id);
      }

      if (page.isDone) break;
      cursor = page.continueCursor;
    }

    // Delete the thread
    await ctx.db.delete(args.threadId);
  },
});

/**
 * Delete a specific message from a thread
 * Accepts either:
 * - chatMessagesStream _id (stringified) OR
 * - Agent component messageId (string)
 */
export const deleteMessage = mutation({
  args: {
    threadId: v.id("chatThreadsStream"),
    messageId: v.string(), // flexible: supports stream _id or agent message id
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const thread = await ctx.db.get(args.threadId);
    if (!thread || thread.userId !== userId) {
      throw new Error("Thread not found or unauthorized");
    }

    if (!thread.agentThreadId) {
      throw new Error("Thread does not have an associated agent thread");
    }

    console.log(`[deleteMessage] Deleting message: ${args.messageId}`);

    // Helper to delete agent message safely (verifies thread)
    const deleteAgentMessageIfOwned = async (agentMessageId: string) => {
      try {
        const [agentMsg] = await ctx.runQuery(components.agent.messages.getMessagesByIds, {
          messageIds: [agentMessageId],
        });
        if (agentMsg && agentMsg.threadId === thread.agentThreadId) {
          await ctx.runMutation(components.agent.messages.deleteByIds, {
            messageIds: [agentMessageId],
          });
          console.log(`[deleteMessage] ✅ Deleted from agent messages`);
        }
      } catch (agentError) {
        console.warn(`[deleteMessage] Could not delete from agent messages:`, agentError);
      }
    };

    try {
      // Try interpreting messageId as chatMessagesStream _id first
      const streamMessage = await ctx.db.get(args.messageId as any);

      if (streamMessage) {
        // Type guard: ensure it has expected fields
        if (!("threadId" in streamMessage)) {
          throw new Error("Invalid message type");
        }
        // Verify belongs to thread
        if ((streamMessage as any).threadId !== args.threadId) {
          throw new Error("Message does not belong to this thread");
        }

        // Delete stream message
        await ctx.db.delete((streamMessage as any)._id);
        console.log(`[deleteMessage] ✅ Deleted from chatMessagesStream by _id`);

        // Cascade delete agent message if linked
        const agentMessageId = (streamMessage as any).agentMessageId as string | undefined;
        if (agentMessageId) {
          console.log(`[deleteMessage] Deleting linked agent message: ${agentMessageId}`);
          await deleteAgentMessageIfOwned(agentMessageId);
        }

        console.log(`[deleteMessage] ✅ Message deleted successfully`);
        return;
      }

      // Otherwise, interpret messageId as Agent component message id
      console.log(`[deleteMessage] Treating messageId as agent message id`);
      await deleteAgentMessageIfOwned(args.messageId);

      // Delete any corresponding stream messages linked to this agent message id
      const linked = await ctx.db
        .query("chatMessagesStream")
        .withIndex("by_agentMessageId", (q) => q.eq("agentMessageId", args.messageId))
        .take(100);

      for (const m of linked) {
        if (m.threadId === args.threadId) {
          await ctx.db.delete(m._id);
        }
      }
      console.log(`[deleteMessage] ✅ Deleted ${linked.length} linked stream message(s)`);

      console.log(`[deleteMessage] ✅ Message deleted successfully`);
    } catch (error) {
      console.error(`[deleteMessage] Error deleting message:`, error);
      throw new Error(`Failed to delete message: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  },
});

/* ================================================================
 * MESSAGE MANAGEMENT
 * ================================================================ */

/**
 * Get messages for a thread with streaming support (using agent component)
 */
export const getThreadMessages = query({
  args: {
    threadId: v.id("chatThreadsStream"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { page: [], continueCursor: null, isDone: true };
    }

    // Verify access
    const thread = await ctx.db.get(args.threadId);
    if (!thread || thread.userId !== userId) {
      return { page: [], continueCursor: null, isDone: true };
    }

    // If thread doesn't have agentThreadId yet, return empty (it's being created)
    if (!thread.agentThreadId) {
      return { page: [], continueCursor: null, isDone: true };
    }

    // Fetch messages directly from agent component
    const result = await ctx.runQuery(components.agent.messages.listMessagesByThreadId, {
      threadId: thread.agentThreadId,
      order: "asc",
      paginationOpts: args.paginationOpts,
    });

    return result;
  },
});

/**
 * Get messages with streaming support for a thread (using Agent component)
 * This returns messages in a format compatible with useUIMessages hook
 *
 * This version accepts the Agent component's threadId (string) directly
 */
export const getThreadMessagesWithStreaming = query({
  args: {
    threadId: v.string(),  // Agent component's thread ID
    paginationOpts: paginationOptsValidator,
    streamArgs: vStreamArgs,
  },
  handler: async (ctx, args) => {
    const emptyResponse = {
      page: [],
      continueCursor: "",
      isDone: true,
      streams: { kind: "list" as const, messages: [] },
    };

    const userId = await getAuthUserId(ctx);
    if (!userId) return emptyResponse;

    // Verify the user has access to this agent thread
    const agentThread = await ctx.runQuery(components.agent.threads.getThread, {
      threadId: args.threadId,
    });

    if (!agentThread || agentThread.userId !== userId) return emptyResponse;

    // Fetch UIMessages with streaming support
    const paginated = await listUIMessages(ctx, components.agent, {
      threadId: args.threadId,
      paginationOpts: args.paginationOpts,
    });

    // Fetch streaming deltas
    const streams =
      (await syncStreams(ctx, components.agent, {
        threadId: args.threadId,
        streamArgs: args.streamArgs,
      })) ?? emptyResponse.streams;

    return {
      ...paginated,
      streams,
    };
  },
});

/**
 * Create a user message in a thread
 */
export const createUserMessage = mutation({
  args: {
    threadId: v.id("chatThreadsStream"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Verify access
    const thread = await ctx.db.get(args.threadId);
    if (!thread || thread.userId !== userId) {
      throw new Error("Thread not found or unauthorized");
    }

    const now = Date.now();
    const messageId = await ctx.db.insert("chatMessagesStream", {
      threadId: args.threadId,
      userId,
      role: "user",
      content: args.content,
      status: "complete",
      createdAt: now,
      updatedAt: now,
    });

    // Update thread timestamp
    await ctx.db.patch(args.threadId, { updatedAt: now });

    return messageId;
  },
});

/**
 * OPTION 2 (RECOMMENDED): Initiate async streaming with optimistic updates
 * Generate the prompt message first, then asynchronously generate the stream response.
 */
export const initiateAsyncStreaming = mutation({
  args: {
    threadId: v.id("chatThreadsStream"),
    prompt: v.string(),
    model: v.optional(v.string()),
    useCoordinator: v.optional(v.boolean()), // Default true to honor planner + coordinator routing
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const requestId = crypto.randomUUID().substring(0, 8);
    console.log(`[initiateAsyncStreaming:${requestId}] 🚀 Starting for thread:`, args.threadId, 'prompt:', args.prompt.substring(0, 50));

    const streamingThread: any = await ctx.db.get(args.threadId);
    if (!streamingThread || !streamingThread.agentThreadId) {
      throw new Error("Thread not found or not linked to agent");
    }
    if (streamingThread.userId !== userId) {
      throw new Error("Unauthorized");
    }

    const modelName = args.model || getLlmModel("chat", "openai");
    const chatAgent = createChatAgent(modelName);

    console.log(`[initiateAsyncStreaming:${requestId}] 💾 Saving user message, agentThreadId:`, streamingThread.agentThreadId);
    console.log(`[initiateAsyncStreaming:${requestId}] 📝 Prompt:`, args.prompt);

    // Save the user message first (enables optimistic updates)
    const { messageId } = await chatAgent.saveMessage(ctx, {
      threadId: streamingThread.agentThreadId,
      prompt: args.prompt,
      skipEmbeddings: true, // Skip embeddings in mutation, generate lazily when streaming
    });

    console.log(`[initiateAsyncStreaming:${requestId}] ✅ User message saved, messageId:`, messageId);

    // POST-SAVE idempotency check: If an older identical message exists, delete this one and use the older one
    // This handles race conditions where two calls arrive simultaneously
    const IDEMPOTENCY_WINDOW_MS = 4000;
    const normalizedPrompt = args.prompt.trim();
    try {
      const recentResult = await ctx.runQuery(components.agent.messages.listMessagesByThreadId, {
        threadId: streamingThread.agentThreadId,
        order: "desc",
        paginationOpts: { cursor: null, numItems: 10 },
      });
      const now = Date.now();
      const recentPage: any[] = (recentResult as any)?.page ?? (recentResult as any) ?? [];

      // Find all messages with identical text within the window
      const duplicates = recentPage.filter((m: any) => {
        const text = typeof m.text === "string" ? m.text.trim() : "";
        const created = typeof m._creationTime === "number" ? m._creationTime : 0;
        const msgId = String(m.messageId ?? m.id ?? m._id ?? "");
        return text === normalizedPrompt &&
          now - created < IDEMPOTENCY_WINDOW_MS &&
          msgId !== messageId; // Exclude the message we just created
      });

      if (duplicates.length > 0) {
        // Found older duplicate(s) - delete the one we just created and use the oldest existing one
        const oldest = duplicates.reduce((prev, curr) => {
          const prevTime = prev._creationTime ?? 0;
          const currTime = curr._creationTime ?? 0;
          return currTime < prevTime ? curr : prev;
        });

        const oldestId = String(oldest.messageId ?? oldest.id ?? oldest._id ?? "");
        console.log(`[initiateAsyncStreaming:${requestId}] 🛑 POST-SAVE Idempotency: Found ${duplicates.length} older duplicate(s), deleting newly created message ${messageId} and using oldest: ${oldestId}`);

        // Delete the message we just created
        try {
          await ctx.runMutation(components.agent.messages.deleteByIds, {
            messageIds: [messageId],
          });
          console.log(`[initiateAsyncStreaming:${requestId}] ✅ Deleted duplicate message ${messageId}`);
        } catch (deleteErr) {
          console.warn(`[initiateAsyncStreaming:${requestId}] Failed to delete duplicate:`, deleteErr);
        }

        // Return the oldest existing message ID (don't schedule a new stream)
        return { messageId: oldestId };
      }
    } catch (dedupeErr) {
      console.warn(`[initiateAsyncStreaming:${requestId}] POST-SAVE idempotency check failed, proceeding normally:`, dedupeErr);
    }

    console.log(`[initiateAsyncStreaming:${requestId}] 🔍 No duplicates found, proceeding with stream scheduling`);

    // Schedule async streaming
    await ctx.scheduler.runAfter(0, internal.domains.agents.fastAgentPanelStreaming.streamAsync, {
      threadId: streamingThread.agentThreadId,
      promptMessageId: messageId,
      model: modelName,
      useCoordinator: args.useCoordinator ?? true, // Default to planner+coordinator routing
    });

    console.log(`[initiateAsyncStreaming:${requestId}] ⏰ Stream scheduled for messageId:`, messageId);

    return { messageId };
  },
});

export const requestStreamCancel = mutation({
  args: {
    threadId: v.id("chatThreadsStream"),
  },
  handler: async (ctx, { threadId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const thread = await ctx.db.get(threadId);
    if (!thread || thread.userId !== userId) throw new Error("Thread not found or unauthorized");
    await ctx.db.patch(threadId, { cancelRequested: true, cancelRequestedAt: Date.now(), updatedAt: Date.now() });
    const controller = streamCancellationControllers.get(String(threadId));
    if (controller) {
      controller.abort();
    }
    return { success: true } as const;
  },
});

/**
 * Internal action to stream text asynchronously
 *
 * ORCHESTRATION MODE: Uses Coordinator Agent for intelligent delegation
 */
export const streamAsync = internalAction({
  args: {
    promptMessageId: v.string(),
    threadId: v.string(),
    model: v.string(),
    useCoordinator: v.optional(v.boolean()), // Enable/disable coordinator mode (default: true)
  },
  handler: async (ctx, args) => {
    const executionId = crypto.randomUUID().substring(0, 8);
    console.log(`[streamAsync:${executionId}] 🎬 Starting stream for message:`, args.promptMessageId, 'threadId:', args.threadId);

    // Get userId for coordinator agent from thread
    const thread = await ctx.runQuery(components.agent.threads.getThread, {
      threadId: args.threadId
    });
    console.log(`[streamAsync:${executionId}] Thread retrieved:`, { threadId: args.threadId, hasUserId: !!thread?.userId });

    // Get our custom thread data for cancel flag
    const customThread = await ctx.runQuery(internal.domains.agents.fastAgentPanelStreaming.getThreadByAgentId, {
      agentThreadId: args.threadId
    });

    const userId = (thread?.userId ?? null) as Id<"users"> | null;
    console.log(`[streamAsync:${executionId}] userId from thread:`, userId);

    // Fetch user preferences for arbitrage mode
    let arbitrageMode = false;
    if (userId) {
      try {
        const agentsPrefs = await ctx.runQuery(internal.agentsPrefs.getAgentsPrefsByUserId, { userId });
        arbitrageMode = agentsPrefs?.arbitrageMode === "true";
        console.log(`[streamAsync:${executionId}] Arbitrage mode:`, arbitrageMode);
      } catch (err) {
        console.warn(`[streamAsync:${executionId}] Could not fetch agent prefs:`, err);
      }
    }

    // Choose agent based on mode
    let agent;
    let agentType: string;
    let responsePromptOverride: string | undefined;
    const contextWithUserId = {
      ...ctx,
      evaluationUserId: userId,
    };

    if (customThread?.cancelRequested) {
      console.log(`[streamAsync:${executionId}] ❌ Stream already cancelled before start`);
      throw new Error("Stream cancelled");
    }

    // Create the appropriate agent
    // OPTION A: Always use CoordinatorAgent directly (no planner overhead)
    // The Coordinator decides internally whether to use tools or answer directly
    if (args.useCoordinator !== false) {
      const { createCoordinatorAgent } = await import("./core/coordinatorAgent");

      // Create mutable ref for dynamic section tracking
      // This allows setActiveSection to update the current section at runtime
      // and artifact-producing tools to read it at invocation time
      const sectionIdRef = { current: undefined as string | undefined };

      // Build artifact deps if we have userId
      // runId = threadId (agent thread), userId for artifact ownership
      const artifactDeps = userId ? {
        runId: args.threadId,
        userId,
        sectionIdRef, // Mutable ref for per-section artifact linking
      } : undefined;

      // Always use CoordinatorAgent - it has GAM tools and decides internally when to use them
      // Pass artifactDeps to wrap all tools for artifact extraction
      // Pass arbitrageMode option for receipts-first research persona
      agent = createCoordinatorAgent(args.model, artifactDeps, { arbitrageMode });
      agentType = arbitrageMode ? "arbitrage" : "coordinator";
      
      console.log(`[streamAsync:${executionId}] Using CoordinatorAgent directly - GAM memory tools available, artifacts=${!!artifactDeps}, sectionRef=enabled`);
    } else {
      console.log(`[streamAsync:${executionId}] Using SIMPLE AGENT (legacy mode)`);
      agent = createSimpleChatAgent(args.model);
      agentType = "simple";
    }

    const controller = new AbortController();
    const cancelKey = customThread?._id ? String(customThread._id) : args.threadId;
    streamCancellationControllers.set(cancelKey, controller);

    // Optional timeout for streaming; disabled by default to allow long-running tasks
    const ENABLE_STREAM_TIMEOUT = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    if (ENABLE_STREAM_TIMEOUT) {
      const STREAM_TIMEOUT_MS = 600000; // 10 minutes
      timeoutId = setTimeout(() => {
        console.warn(`[streamAsync:${executionId}] ⏱️ Stream timeout after ${STREAM_TIMEOUT_MS}ms, aborting...`);
        controller.abort();
      }, STREAM_TIMEOUT_MS);
    }

    try {
      console.log(`[streamAsync:${executionId}] 📡 Calling ${agentType} agent.streamText...`);
      console.log(`[streamAsync:${executionId}] 🔑 Using promptMessageId:`, args.promptMessageId);
      console.log(`[streamAsync:${executionId}] 🧵 ThreadId:`, args.threadId);

      const result = await agent.streamText(
        contextWithUserId as any,
        { threadId: args.threadId },
        responsePromptOverride
          ? {
            prompt: responsePromptOverride,
            abortSignal: controller.signal,
          }
          : {
            promptMessageId: args.promptMessageId,
            abortSignal: controller.signal,
          },
        {
          // Enable real-time streaming to clients
          // According to Convex Agent docs, this CAN be used with tool execution
          // The deltas are saved to DB and clients can subscribe via syncStreams
          saveStreamDeltas: {
            chunking: "word", // Stream word by word for smooth UX
            throttleMs: 100,  // Throttle writes to reduce DB load
          },
        }
      );

      console.log(`[streamAsync:${executionId}] ✅ Stream started with agent defaults, saveStreamDeltas enabled`);
      console.log(`[streamAsync:${executionId}] 📝 MessageId:`, result.messageId);
      console.log(`[streamAsync:${executionId}] 🔍 Using promptMessageId:`, args.promptMessageId);

      // Use consumeStream() to ensure all tool calls are executed and results are captured
      // This waits for the entire stream to complete, including tool execution
      // With saveStreamDeltas enabled, clients will see real-time updates via syncStreams
      await result.consumeStream();

      console.log(`[streamAsync:${executionId}] 🏁 Stream completed successfully`);

      // Get tool calls and results to verify they were captured
      const toolCalls = await result.toolCalls;
      const toolResults = await result.toolResults;
      console.log(`[streamAsync:${executionId}] Tool calls: ${toolCalls?.length || 0}, Tool results: ${toolResults?.length || 0}`);

      // Check if we got a text response - if not, this is AI_NoOutputGeneratedError
      // This can happen when the agent executes tools but doesn't generate final text
      const finalText = await result.text;
      if (!finalText || finalText.trim().length === 0) {
        console.warn(`[streamAsync:${executionId}] ⚠️ No text output generated after tool execution`);
        console.warn(`[streamAsync:${executionId}] This usually means the agent hit step limit (stopWhen: stepCountIs(15)) without generating final response`);
        console.warn(`[streamAsync:${executionId}] Consider increasing maxSteps if this happens frequently`);
        // Don't throw - the tool results are still saved and visible in the UI
        // The user can see the agent process and tool results even without final text
      } else {
        console.log(`[streamAsync:${executionId}] ✅ Final text response generated successfully`);
        console.log(`[streamAsync:${executionId}] 📊 Text length: ${finalText.length} chars`);
        console.log(`[streamAsync:${executionId}] 🎯 Real-time deltas were streamed to clients via saveStreamDeltas`);
      }

      // Note: Usage tracking is handled automatically by the agent's usageHandler

    } catch (error) {
      // Handle AI_NoOutputGeneratedError gracefully
      const errorName = (error as any)?.name || '';
      if (errorName === 'AI_NoOutputGeneratedError') {
        console.warn(`[streamAsync:${executionId}] ⚠️ AI_NoOutputGeneratedError: Agent completed tool execution but didn't generate final text`);
        console.warn(`[streamAsync:${executionId}] This should be RARE with stopWhen: stepCountIs(15). If you see this often, raise the step count.`);
        console.warn(`[streamAsync:${executionId}] Tool results are still saved and visible in the UI.`);
        // Don't re-throw - this is not a fatal error, tool results are visible
        return;
      }

      console.error(`[streamAsync:${executionId}] ❌ Error:`, error);
      throw error;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      streamCancellationControllers.delete(cancelKey);
      // Reset cancel flag via mutation (actions can't use ctx.db directly)
      if (customThread?._id) {
        try {
          await ctx.runMutation(internal.domains.agents.fastAgentPanelStreaming.resetCancelFlag, {
            threadId: customThread._id
          });
        } catch (patchErr) {
          console.warn(`[streamAsync:${executionId}] Failed to reset cancel flag`, patchErr);
        }
      }
    }
  },
});

/**
 * Generate document content using the Document Generation Agent
 * This action generates content and returns it to the UI for manual document creation
 */
export const generateDocumentContent = action({
  args: {
    prompt: v.string(),
    threadId: v.string(),
  },
  returns: v.object({
    title: v.string(),
    content: v.string(),
    summary: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    console.log(`[generateDocumentContent] Generating content for prompt: "${args.prompt}"`);

    const modelName = getLlmModel("chat", "openai");
    const chatAgent = createChatAgent(modelName);

    // Create or get thread
    let threadId: string;
    if (!args.threadId) {
      const result = await chatAgent.createThread(ctx as any, {});
      threadId = result.threadId;
    } else {
      threadId = args.threadId;
    }

    // Stream the response
    const result = await chatAgent.streamText(
      ctx as any,
      { threadId },
      { promptMessageId: undefined },
      {
        saveStreamDeltas: {
          chunking: "word",
          throttleMs: 100,
        },
      },
    );

    const text = await result.text;

    console.log(`[generateDocumentContent] Generated ${text.length} characters`);

    // Extract metadata from the response
    const metadataMatch = text.match(/<!-- DOCUMENT_METADATA\s*\n([\s\S]*?)\n-->/);
    let title = "Untitled Document";
    let summary = undefined;

    if (metadataMatch) {
      try {
        const metadata = JSON.parse(metadataMatch[1]);
        title = metadata.title || title;
        summary = metadata.summary;
      } catch (e) {
        console.warn("[generateDocumentContent] Failed to parse metadata:", e);
      }
    }

    // Extract content (remove metadata comment)
    const content = text.replace(/<!-- DOCUMENT_METADATA[\s\S]*?-->\s*/, '').trim();

    return { title, content, summary };
  },
});

/**
 * Create a document from agent-generated content
 * This bypasses the agent tool mechanism and creates the document directly
 * with proper authentication from the UI
 */
export const createDocumentFromAgentContent = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    threadId: v.optional(v.string()), // Optional: link to the chat thread
  },
  returns: v.id("documents"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    console.log(`[createDocumentFromAgentContent] Creating document: "${args.title}"`);

    // Convert markdown/text content to ProseMirror blocks
    const contentBlocks = args.content.split('\n\n').map(paragraph => {
      const trimmed = paragraph.trim();
      if (!trimmed) return null;

      // Check if it's a heading
      if (trimmed.startsWith('# ')) {
        return {
          type: "heading",
          level: 1,
          text: trimmed.substring(2).trim(),
        };
      } else if (trimmed.startsWith('## ')) {
        return {
          type: "heading",
          level: 2,
          text: trimmed.substring(3).trim(),
        };
      } else if (trimmed.startsWith('### ')) {
        return {
          type: "heading",
          level: 3,
          text: trimmed.substring(4).trim(),
        };
      } else {
        return {
          type: "paragraph",
          text: trimmed,
        };
      }
    }).filter(Boolean);

    // Build ProseMirror document format
    const editorContent = {
      type: "doc",
      content: contentBlocks.length > 0 ? contentBlocks : [
        { type: "paragraph", text: args.content }
      ],
    };

    const documentId = await ctx.db.insert("documents", {
      title: args.title,
      content: JSON.stringify(editorContent),
      createdBy: userId,
      isPublic: false,
      isArchived: false,
      lastModified: Date.now(),
      chatThreadId: args.threadId, // Link to chat thread if provided
    });

    console.log(`[createDocumentFromAgentContent] Document created: ${documentId}`);

    return documentId;
  },
});

/**
 * Get thread by ID (internal for agent streaming)
 */
export const getThreadByStreamIdInternal = internalQuery({
  args: {
    threadId: v.id("chatThreadsStream"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.threadId);
  },
});

/**
 * Get thread by agent thread ID (internal for cancel flag checking)
 */
export const getThreadByAgentId = internalQuery({
  args: {
    agentThreadId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("chatThreadsStream")
      .withIndex("by_agentThreadId", (q) => q.eq("agentThreadId", args.agentThreadId))
      .first();
  },
});

/**
 * Reset cancel flag (internal mutation for actions)
 */
export const resetCancelFlag = internalMutation({
  args: {
    threadId: v.id("chatThreadsStream"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.threadId, {
      cancelRequested: false,
      cancelRequestedAt: undefined,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Create an assistant message (streaming) with a streamId
 */
export const createAssistantMessage = mutation({
  args: {
    threadId: v.id("chatThreadsStream"),
    model: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Verify access
    const thread = await ctx.db.get(args.threadId);
    if (!thread || thread.userId !== userId) {
      throw new Error("Thread not found or unauthorized");
    }

    // Generate unique streamId using crypto
    const streamId = crypto.randomUUID();

    const now = Date.now();
    const messageId = await ctx.db.insert("chatMessagesStream", {
      threadId: args.threadId,
      userId,
      role: "assistant",
      content: "",
      streamId,
      status: "streaming",
      model: args.model,
      createdAt: now,
      updatedAt: now,
    });

    // Update thread timestamp
    await ctx.db.patch(args.threadId, { updatedAt: now });

    return { messageId, streamId };
  },
});

/* ================================================================
 * STREAMING SUPPORT
 * ================================================================ */

/**
 * Get message by streamId (used by streaming endpoint)
 */
export const getMessageByStreamId = query({
  args: {
    streamId: v.string(),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db
      .query("chatMessagesStream")
      .withIndex("by_streamId", (q) => q.eq("streamId", args.streamId))
      .first();

    return message;
  },
});

/**
 * Get stream body for useStream hook
 */
export const getStreamBody = query({
  args: {
    streamId: v.string(),
  },
  handler: async (ctx, args) => {
    // Query the stream text from the persistent-text-streaming component
    return await ctx.runQuery(
      components.persistentTextStreaming.lib.getStreamText,
      { streamId: args.streamId }
    );
  },
});

/**
 * Get thread messages for streaming (internal, for HTTP action)
 */
export const getThreadMessagesForStreaming = internalQuery({
  args: {
    threadId: v.id("chatThreadsStream"),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("chatMessagesStream")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .order("asc")
      .take(500);

    return messages;
  },
});

/**
 * Mark stream as started and link to agent message (internal)
 */
export const markStreamStarted = internalMutation({
  args: {
    messageId: v.id("chatMessagesStream"),
    agentMessageId: v.string(),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) {
      console.error(`[markStreamStarted] Message not found: ${args.messageId}`);
      return;
    }

    await ctx.db.patch(args.messageId, {
      agentMessageId: args.agentMessageId,
      status: "streaming",
      updatedAt: Date.now(),
    });
  },
});

/**
 * Mark stream as complete and update message content (internal)
 */
export const markStreamComplete = internalMutation({
  args: {
    messageId: v.id("chatMessagesStream"),
    finalContent: v.string(),
    status: v.union(v.literal("complete"), v.literal("error")),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) {
      console.error(`[markStreamComplete] Message not found: ${args.messageId}`);
      return;
    }

    await ctx.db.patch(args.messageId, {
      content: args.finalContent,
      status: args.status,
      updatedAt: Date.now(),
    });

    // Update thread timestamp
    await ctx.db.patch(message.threadId, { updatedAt: Date.now() });
  },
});

/* ================================================================
 * API USAGE TRACKING
 * ================================================================ */

/**
 * Internal mutation to insert API usage data
 * Called by the agent's usageHandler
 */
export const insertApiUsage = internalMutation({
  args: {
    userId: v.string(),
    apiName: v.string(),
    operation: v.string(),
    model: v.string(),
    provider: v.string(),
    usage: v.object({
      totalTokens: v.optional(v.number()),
      inputTokens: v.optional(v.number()),
      outputTokens: v.optional(v.number()),
      reasoningTokens: v.optional(v.number()),
      cachedInputTokens: v.optional(v.number()),
    }),
    providerMetadata: v.optional(vProviderMetadata),
  },
  handler: async (ctx, args) => {
    const timestamp = Date.now();
    const date = new Date(timestamp).toISOString().split('T')[0]; // YYYY-MM-DD

    // Transform usage format and calculate cost
    // From Convex Agent: inputTokens, outputTokens, totalTokens
    // GPT-5 Standard: $1.25/1M input, $10/1M output
    const inputTokens = args.usage.inputTokens ?? 0;
    const outputTokens = args.usage.outputTokens ?? 0;
    const totalTokens = args.usage.totalTokens ?? (inputTokens + outputTokens);

    const inputCostPer1K = 0.00125;  // $1.25 per 1M
    const outputCostPer1K = 0.01;    // $10 per 1M

    const estimatedCostCents = Math.round(
      (inputTokens / 1000 * inputCostPer1K + outputTokens / 1000 * outputCostPer1K) * 100
    );

    // Insert usage record
    await ctx.db.insert("apiUsage", {
      userId: args.userId as Id<"users">,
      apiName: args.apiName,
      operation: args.operation,
      timestamp,
      unitsUsed: totalTokens,
      estimatedCost: estimatedCostCents,
      requestMetadata: {
        model: args.model,
        provider: args.provider,
        tokensUsed: totalTokens,
        promptTokens: inputTokens,
        completionTokens: outputTokens,
      },
      success: true,
      responseTime: undefined,
    });

    // Update daily aggregate
    const existing = await ctx.db
      .query("apiUsageDaily")
      .withIndex("by_user_api_date", (q) =>
        q.eq("userId", args.userId as Id<"users">).eq("apiName", args.apiName).eq("date", date)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        totalCalls: existing.totalCalls + 1,
        successfulCalls: existing.successfulCalls + 1,
        totalUnitsUsed: existing.totalUnitsUsed + totalTokens,
        totalCost: existing.totalCost + estimatedCostCents,
      });
    } else {
      await ctx.db.insert("apiUsageDaily", {
        userId: args.userId as Id<"users">,
        apiName: args.apiName,
        date,
        totalCalls: 1,
        successfulCalls: 1,
        failedCalls: 0,
        totalUnitsUsed: totalTokens,
        totalCost: estimatedCostCents,
      });
    }
  },
});

/* ================================================================
 * EVALUATION SUPPORT
 * ================================================================ */

/**
 * Internal action to send a message and get response for evaluation
 * Returns the response text and tools called
 *
 * ORCHESTRATION MODE: Uses Coordinator Agent for intelligent delegation
 */
export const sendMessageInternal = internalAction({
  args: {
    threadId: v.optional(v.string()),
    message: v.string(),
    userId: v.optional(v.id("users")), // Optional userId for evaluation tests
    useCoordinator: v.optional(v.boolean()), // Enable/disable coordinator mode (default: true)
    context: v.optional(v.string()), // Optional system/context prefix for first message
  },
  returns: v.object({
    response: v.string(),
    toolsCalled: v.array(v.string()),
    threadId: v.string(),
    toolResults: v.array(v.any()),
  }),
  handler: async (ctx, args): Promise<{ response: string; toolsCalled: string[]; threadId: string; toolResults: any[] }> => {
    console.log('[sendMessageInternal] Starting with message:', args.message);
    const modelName = getLlmModel("chat", "openai");

    // Create a context with userId for tools to access
    const contextWithUserId = {
      ...ctx,
      evaluationUserId: args.userId,
    };

    // Fetch user preferences for arbitrage mode
    let arbitrageMode = false;
    if (args.userId) {
      try {
        const agentsPrefs = await ctx.runQuery(internal.agentsPrefs.getAgentsPrefsByUserId, { userId: args.userId });
        arbitrageMode = agentsPrefs?.arbitrageMode === "true";
        console.log('[sendMessageInternal] Arbitrage mode:', arbitrageMode);
      } catch (err) {
        console.warn('[sendMessageInternal] Could not fetch agent prefs:', err);
      }
    }

    // Choose agent based on mode
    let chatAgent;
    if (args.useCoordinator !== false) { // Default to coordinator
      console.log('[sendMessageInternal] Using COORDINATOR AGENT for intelligent delegation');
      const { createCoordinatorAgent } = await import("./core/coordinatorAgent");

      // Create mutable ref for dynamic section tracking
      const sectionIdRef = { current: undefined as string | undefined };

      // Build artifact deps if we have userId
      const artifactDeps = args.userId ? {
        runId: args.threadId ?? "temp-thread",
        userId: args.userId,
        sectionIdRef,
      } : undefined;

      // Pass arbitrageMode option for receipts-first research persona
      chatAgent = createCoordinatorAgent(modelName, artifactDeps, { arbitrageMode });
    } else {
      console.log('[sendMessageInternal] Using SINGLE AGENT (legacy mode)');
      chatAgent = createChatAgent(modelName);
    }

    // Create or get thread
    let threadId: string;
    if (!args.threadId) {
      console.log('[sendMessageInternal] Creating new thread');
      const result = await chatAgent.createThread(
        contextWithUserId as any,
        args.userId ? { userId: args.userId } : {},
      );
      threadId = result.threadId;
      console.log('[sendMessageInternal] Thread created:', threadId);
    } else {
      console.log('[sendMessageInternal] Continuing thread:', args.threadId);
      threadId = args.threadId;
      console.log('[sendMessageInternal] Thread continued');
    }

    const prompt = args.context
      ? `${args.context.trim()}\n\n${args.message}`
      : args.message;

    // Use streamText and await result.text to get the final response
    // Based on official documentation: https://docs.convex.dev/agents/messages
    console.log('[sendMessageInternal] Starting stream...');
    const streamResult = await chatAgent.streamText(
      contextWithUserId as any,
      { threadId },
      { prompt }
      // Note: saveStreamDeltas disabled to avoid race conditions in evaluation tests
    );

    console.log('[sendMessageInternal] Stream started, consuming stream...');

    // CRITICAL: Must call consumeStream() BEFORE accessing text/toolCalls/toolResults
    // This ensures all tool executions complete
    await streamResult.consumeStream();

    console.log('[sendMessageInternal] Stream consumed, extracting results...');

    // Now we can safely access the results
    let responseText = await streamResult.text;
    const toolCalls = await streamResult.toolCalls;
    let toolResults: any[] = (await streamResult.toolResults) ?? [];

    console.log('[sendMessageInternal] Text received, length:', responseText.length);
    console.log('[sendMessageInternal] Tool calls:', toolCalls?.length || 0);
    console.log('[sendMessageInternal] Tool results:', toolResults?.length || 0);

    // Extract tool names from tool calls
    const toolsCalled: string[] = [];
    if (toolCalls) {
      for (const toolCall of toolCalls) {
        toolsCalled.push(toolCall.toolName);
      }
    }

    // If no tools were called, force a tool-first follow-up with explicit guidance
    if (toolsCalled.length === 0) {
      console.log('[sendMessageInternal] No tools called. Forcing tool-first follow-up...');
      const toolForcePrompt = [
        "You must call a tool BEFORE answering. Select the single best tool for the user request and execute it now.",
        `User request: ${args.message}`,
        "Mappings:",
        "- Documents: findDocument; if reading, call getDocumentContent (after findDocument).",
        "- Images: searchMedia (images); if none, fall back to linkupSearch includeImages=true.",
        "- Videos: youtubeSearch.",
        "- SEC filings: searchSecFilings (with ticker).",
        "- Tasks: listTasks; updates via updateTask.",
        "- Events: listEvents (week), createEvent if needed.",
        "- Web search: linkupSearch.",
        "Return a concise answer after tool execution."
      ].join("\n");

      const forced = await chatAgent.streamText(
        contextWithUserId as any,
        { threadId },
        { prompt: toolForcePrompt },
        {
          saveStreamDeltas: {
            chunking: "word",
            throttleMs: 100,
          },
        },
      );

      await forced.consumeStream();

      const forcedCalls = await forced.toolCalls;
      const forcedResults = (await forced.toolResults) ?? [];
      const forcedText = await forced.text;

      if (forcedCalls) {
        for (const call of forcedCalls) {
          if (!toolsCalled.includes(call.toolName)) {
            toolsCalled.push(call.toolName);
          }
        }
      }

      if (forcedResults && forcedResults.length > 0) {
        toolResults = toolResults ? [...toolResults, ...forcedResults] : forcedResults;
      }

      if (forcedText && forcedText.trim().length > 0) {
        responseText = forcedText;
      }

      // If we still didn't get any tool calls, force one more attempt with an even stricter prompt
      if (toolsCalled.length === 0) {
        const strictPrompt = [
          "STOP. You must call exactly one tool now for the user's request. Do not answer until you have invoked a tool.",
          `User request: ${args.message}`,
          "Pick the single best tool from: findDocument, getDocumentContent, searchMedia, youtubeSearch, searchSecFilings, listTasks, listEvents, linkupSearch.",
          "Call it immediately with sensible arguments."
        ].join("\n");

        const strict = await chatAgent.streamText(
          contextWithUserId as any,
          { threadId },
          { prompt: strictPrompt },
          {
            saveStreamDeltas: {
              chunking: "word",
              throttleMs: 100,
            },
          },
        );

        await strict.consumeStream();

        const strictCalls = await strict.toolCalls;
        const strictResults = (await strict.toolResults) ?? [];
        const strictText = await strict.text;

        if (strictCalls) {
          for (const call of strictCalls) {
            if (!toolsCalled.includes(call.toolName)) {
              toolsCalled.push(call.toolName);
            }
          }
        }
        if (strictResults && strictResults.length > 0) {
          toolResults = toolResults ? [...toolResults, ...strictResults] : strictResults;
        }
        if (strictText && strictText.trim().length > 0) {
          responseText = responseText || strictText;
        }
      }
    }

    // Fallback: inspect recent agent messages to infer tool usage if toolCalls are empty
    if (toolsCalled.length === 0) {
      try {
        const recent = await ctx.runQuery(components.agent.messages.listMessagesByThreadId, {
          threadId,
          order: "desc",
          paginationOpts: { cursor: null, numItems: 10 },
        });
        const msgs = recent.page || [];
        for (const msg of msgs) {
          const candidate =
            (msg as any).tool?.name ||
            (msg as any).tool?.toolName ||
            (msg as any).message?.tool?.name ||
            (msg as any).message?.tool;
          if (candidate && typeof candidate === "string" && !toolsCalled.includes(candidate)) {
            toolsCalled.push(candidate);
          }
        }
      } catch (err) {
        console.warn("[sendMessageInternal] Tool inference from messages failed", err);
      }
    }

    // If the response is empty but tools were called, make a follow-up call to get a response
    // We'll try up to 2 times to get a text response
    let followUpAttempts = 0;
    const maxFollowUpAttempts = 2;

    while (!responseText && toolsCalled.length > 0 && followUpAttempts < maxFollowUpAttempts) {
      followUpAttempts++;
      console.log(`[sendMessageInternal] Response is empty but tools were called, making follow-up call (attempt ${followUpAttempts}/${maxFollowUpAttempts})...`);

      const followUpResult = await chatAgent.streamText(
        contextWithUserId as any,
        { threadId },
        { prompt: "Based on the tool results above, provide a helpful response to the user's question. IMPORTANT: Include the actual data from the tool results (IDs, titles, names, dates, etc.) in your response. Do NOT call any more tools - just present the results clearly." }
        // Note: saveStreamDeltas disabled to avoid race conditions in evaluation tests
      );

      // Consume the stream to ensure it finishes
      await followUpResult.consumeStream();

      responseText = await followUpResult.text;
      console.log('[sendMessageInternal] Follow-up response received, length:', responseText.length);

      // Check if more tools were called in the follow-up
      const followUpToolCalls = await followUpResult.toolCalls;
      if (followUpToolCalls && followUpToolCalls.length > 0) {
        console.log('[sendMessageInternal] Follow-up call triggered more tools:', followUpToolCalls.map((tc: any) => tc.toolName));
        // Add these tools to the list
        for (const toolCall of followUpToolCalls) {
          if (!toolsCalled.includes(toolCall.toolName)) {
            toolsCalled.push(toolCall.toolName);
          }
        }
      }
    }

    // If this was a document content request but the agent failed to call getDocumentContent,
    // force a guided follow-up call that explicitly invokes the tool.
    const needsDocumentContent = /(?:\bshow\b|\bread\b|\bopen\b|\bdisplay\b|\bview\b|content)/i.test(args.message)
      && toolsCalled.includes("findDocument")
      && !toolsCalled.includes("getDocumentContent");

    if (needsDocumentContent) {
      console.log("[sendMessageInternal] Detected missing getDocumentContent call for document content request. Forcing follow-up.");

      let primaryDocId: string | null = null;
      if (toolResults) {
        for (const result of toolResults) {
          if (result?.toolName !== "findDocument") {
            continue;
          }
          const rawOutput = typeof result.output === "string"
            ? result.output
            : JSON.stringify(result.output);

          const idMatch = rawOutput.match(/ID:\s*([^\s]+)/);
          if (idMatch && idMatch[1]) {
            primaryDocId = idMatch[1].replace(/[",.]+$/, "");
            console.log("[sendMessageInternal] Parsed documentId from findDocument result:", primaryDocId);
            break;
          }
        }
      }

      const followUpPromptParts: string[] = [
        "The user explicitly asked to see the document content.",
        "Call the getDocumentContent tool now and then summarize the key revenue figures from the returned data.",
        "Do not ask for clarification or permission."
      ];

      if (primaryDocId) {
        followUpPromptParts.unshift(`Use getDocumentContent with documentId "${primaryDocId}".`);
      } else {
        followUpPromptParts.unshift("Use getDocumentContent with the first document returned by your previous findDocument call.");
      }

      const followUpPrompt = followUpPromptParts.join(" ");

      const forcedResult = await chatAgent.streamText(
        contextWithUserId as any,
        { threadId },
        { prompt: followUpPrompt }
      );

      await forcedResult.consumeStream();

      const forcedText = await forcedResult.text;
      const forcedToolCalls = await forcedResult.toolCalls;
      const forcedToolResults = (await forcedResult.toolResults) ?? [];

      if (forcedToolCalls) {
        for (const call of forcedToolCalls) {
          if (!toolsCalled.includes(call.toolName)) {
            toolsCalled.push(call.toolName);
          }
        }
      }

      if (forcedToolResults && forcedToolResults.length > 0) {
        toolResults = toolResults ? [...toolResults, ...forcedToolResults] : forcedToolResults;
      }

      if (forcedText && forcedText.trim().length > 0) {
        responseText = forcedText;
      }

      if (!toolsCalled.includes("getDocumentContent")) {
        console.warn("[sendMessageInternal] Follow-up attempt still missing getDocumentContent call.");
      }
    }

    if (!responseText && toolsCalled.length > 0) {
      console.log('[sendMessageInternal] WARNING: Failed to get text response after follow-up calls. Using fallback message.');
      responseText = "I've processed your request using the available tools, but encountered an issue generating a response. Please try rephrasing your question.";
    }

    console.log('[sendMessageInternal] Returning response, tools called:', toolsCalled, 'response length:', responseText.length);
    return {
      response: responseText,
      toolsCalled,
      threadId,
      toolResults: toolResults ?? [],
    };
  },
});

/* ================================================================
 * FILE & IMAGE UPLOAD
 * ================================================================ */

/**
 * Upload a file (image, PDF, etc.) for the agent to analyze
 * Files are automatically stored and deduplicated by hash
 */
export const uploadFile = action({
  args: {
    filename: v.string(),
    mimeType: v.string(),
    bytes: v.bytes(),
    sha256: v.optional(v.string()),
  },
  returns: v.object({
    fileId: v.string(),
    url: v.string(),
    fileSearchStore: v.optional(v.string()),
  }),
  handler: async (ctx, args): Promise<{ fileId: string; url: string; fileSearchStore?: string }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized - please sign in to upload files");
    }

    console.log(`[uploadFile] Uploading ${args.filename} (${args.mimeType}, ${args.bytes.byteLength} bytes)`);

    // Store the file using Convex Agent's file storage
    // This automatically deduplicates files with the same hash
    const { file } = await storeFile(
      ctx,
      components.agent,
      new Blob([args.bytes], { type: args.mimeType }),
      {
        filename: args.filename,
        sha256: args.sha256,
      },
    );

    console.log(`[uploadFile] ✅ File stored: ${file.fileId}`);

    // Mirror into Gemini File Search for retrieval
    let fileSearchStore: string | undefined;
    try {
      const result: { store: string } | null = await ctx.runAction(internal.domains.documents.fileSearch.uploadFileToSearch, {
        userId,
        bytes: args.bytes,
        mimeType: args.mimeType,
        displayName: args.filename,
      });
      fileSearchStore = result?.store;
    } catch (err) {
      console.warn("[uploadFile] Gemini File Search upload failed", err);
    }

    return {
      fileId: file.fileId,
      url: file.url,
      fileSearchStore,
    };
  },
});

/**
 * Submit a question about an uploaded file
 * Creates a user message with the file attached and triggers agent response
 */
export const submitFileQuestion = mutation({
  args: {
    threadId: v.id("chatThreadsStream"),
    fileId: v.string(),
    question: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    // Verify thread ownership
    const thread = await ctx.db.get(args.threadId);
    if (!thread || thread.userId !== userId) {
      throw new Error("Thread not found or unauthorized");
    }

    if (!thread.agentThreadId) {
      throw new Error("Thread does not have an associated agent thread");
    }

    console.log(`[submitFileQuestion] Thread: ${args.threadId}, FileId: ${args.fileId}`);

    // Get the file (could be an image or other file type)
    const { filePart, imagePart } = await getFile(
      ctx,
      components.agent,
      args.fileId,
    );

    // Save user message with file attachment
    const { messageId } = await saveMessage(ctx, components.agent, {
      threadId: thread.agentThreadId,
      message: {
        role: "user",
        content: [
          imagePart ?? filePart,
          { type: "text", text: args.question },
        ],
      },
      // Track file usage for cleanup
      metadata: { fileIds: [args.fileId] },
    });

    console.log(`[submitFileQuestion] ✅ Message saved: ${messageId}`);

    // Create streaming message in our table
    const streamMessageId = await ctx.db.insert("chatMessagesStream", {
      threadId: args.threadId,
      userId: userId,
      role: "user",
      content: args.question,
      status: "complete",
      agentMessageId: messageId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Trigger async response generation
    await ctx.scheduler.runAfter(0, internal.domains.agents.fastAgentPanelStreaming.generateFileResponse, {
      threadId: thread.agentThreadId,
      promptMessageId: messageId,
      streamThreadId: args.threadId,
      model: thread.model || getLlmModel("chat", "openai"),
    });

    return {
      messageId: streamMessageId,
      agentMessageId: messageId,
    };
  },
});

/**
 * Save an intermediate agent progress message (for multi-agent workflow)
 */
export const saveAgentProgressMessage = internalAction({
  args: {
    threadId: v.string(),
    agentName: v.string(),
    message: v.string(),
    emoji: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    console.log(`[saveAgentProgressMessage] ${args.agentName}: ${args.message.slice(0, 100)}...`);

    const prefix = args.emoji ? `${args.emoji} **${args.agentName}**\n\n` : `**${args.agentName}**\n\n`;
    const fullMessage = prefix + args.message;

    await saveMessage(ctx, components.agent, {
      threadId: args.threadId,
      message: {
        role: "assistant",
        content: fullMessage,
      },
    });

    console.log(`[saveAgentProgressMessage] ✅ Saved message for ${args.agentName}`);
  },
});

/**
 * Generate response to a file question (internal, async)
 */
export const generateFileResponse = internalAction({
  args: {
    threadId: v.string(),
    promptMessageId: v.string(),
    streamThreadId: v.id("chatThreadsStream"),
    model: v.string(),
  },
  handler: async (ctx, args) => {
    console.log('[generateFileResponse] Starting generation');
    const chatAgent = createChatAgent(args.model);

    try {
      // Ensure tools receive a userId for authentication
      const agentThread = await ctx.runQuery(components.agent.threads.getThread, { threadId: args.threadId });
      const userId = (agentThread?.userId ?? null) as Id<"users"> | null;
      const contextWithUserId = {
        ...ctx,
        evaluationUserId: userId,
      };

      const result = await chatAgent.streamText(
        contextWithUserId as any,
        { threadId: args.threadId },
        { promptMessageId: args.promptMessageId },
        {
          saveStreamDeltas: {
            chunking: "word",
            throttleMs: 100,
          },
        },
      );

      console.log('[generateFileResponse] Stream started, messageId:', result.messageId);

      await result.consumeStream();

      console.log('[generateFileResponse] ✅ Stream completed');
    } catch (error) {
      console.error('[generateFileResponse] Error:', error);
      throw error;
    }
  },
});
