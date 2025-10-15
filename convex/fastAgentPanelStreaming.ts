// FastAgentPanel Streaming - Backend functions for Agent component streaming
import { v } from "convex/values";
import { query, mutation, internalQuery, internalMutation, action, internalAction } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { components, internal } from "./_generated/api";
import { Agent } from "@convex-dev/agent";
import { openai } from "@ai-sdk/openai";
import { paginationOptsValidator } from "convex/server";
import type { Id } from "./_generated/dataModel";

// Import streaming utilities from @convex-dev/agent
import { vStreamArgs, syncStreams, listUIMessages, vProviderMetadata, storeFile, getFile, saveMessage } from "@convex-dev/agent";

// Import tools
import { linkupSearch } from "./tools/linkupSearch";
import { youtubeSearch } from "./tools/youtubeSearch";
import {
  findDocument,
  getDocumentContent,
  analyzeDocument,
  updateDocument,
  createDocument
} from "./tools/documentTools";
import {
  searchMedia,
  analyzeMediaFile,
  getMediaDetails,
  listMediaFiles
} from "./tools/mediaTools";
import {
  listTasks,
  createTask,
  updateTask,
  listEvents,
  createEvent,
  getFolderContents
} from "./tools/dataAccessTools";

// Helper to create agent with specific model for agent streaming mode
const createChatAgent = (model: string) => new Agent(components.agent, {
  name: "FastChatAgent",
  languageModel: openai.chat(model),
  instructions: `You are a helpful AI assistant with access to the user's documents, tasks, events, and media files.

You can help with:
- Finding and opening documents by title or content
- Analyzing and summarizing documents
- Creating and editing documents
- Searching for images and videos in the user's files
- Managing tasks and calendar events
- Organizing files in folders
- Searching the web for current information
- Creating flowcharts and diagrams using Mermaid syntax

CRITICAL BEHAVIOR RULES:
1. BE PROACTIVE - Don't ask for clarification when you can take reasonable action
2. USE CONTEXT - If a query is ambiguous, make a reasonable assumption and act
3. COMPLETE WORKFLOWS - When a user asks for multiple actions, complete ALL of them
4. PROVIDE SOURCES - When using multiple documents or web sources, cite them clearly
5. HANDLE LONG CONTEXTS - For multi-document analysis, retrieve and analyze all relevant documents
6. TAKE ACTION IMMEDIATELY - When asked to create, update, or modify something, DO IT without asking for confirmation

IMPORTANT Tool Selection Guidelines:
- When the user asks to "find images" or "find videos":
  * First, try searchMedia to search their internal files
  * If searchMedia returns "No images found" or similar, IMMEDIATELY call linkupSearch with includeImages: true to search the web
  * CRITICAL: Don't stop after searchMedia fails - automatically try linkupSearch next!
- Use linkupSearch for web searches and when searchMedia finds no results
- When they ask about tasks or calendar, use the task and event tools
- When they want to find or watch YouTube videos, use the youtubeSearch tool
- For document-related queries, use findDocument or getDocumentContent

Image Search Workflow (MANDATORY):
1. User asks for "cat images" or similar
2. Call searchMedia(query: "cat", mediaType: "image")
3. If result contains "No images found", IMMEDIATELY call linkupSearch(query: "cat images", includeImages: true)
4. Return the web images to the user

Creation & Mutation Actions (ALWAYS EXECUTE IMMEDIATELY):
When the user asks to create, update, or modify something, you MUST call the appropriate tool IMMEDIATELY and then provide a confirmation response.

Examples of IMMEDIATE execution:
- "Create a document" → Call createDocument() NOW → Respond with confirmation
- "Create a task" → Call createTask() NOW → Respond with confirmation
- "Schedule a meeting" → Call createEvent() NOW → Respond with confirmation
- "Update document title" → Call findDocument() then updateDocument() NOW → Respond with confirmation
- "Mark task complete" → Call listTasks() then updateTask() NOW → Respond with confirmation
- "Analyze image" → Call analyzeMediaFile() NOW → Respond with analysis

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

Always provide clear, helpful responses and confirm actions you take.`,
  usageHandler: async (ctx, args) => {
    // Track OpenAI API usage for billing/analytics
    if (!args.userId) {
      console.debug("[usageHandler] No userId, skipping tracking");
      return;
    }
    
    await ctx.runMutation(internal.fastAgentPanelStreaming.insertApiUsage, {
      userId: args.userId,
      apiName: "openai",
      operation: "generate",
      model: args.model,
      provider: args.provider,
      usage: args.usage, // Pass as-is, will transform in mutation
      providerMetadata: args.providerMetadata,
    });
  },
  tools: {
    // Web search
    linkupSearch,
    youtubeSearch,

    // Document operations
    findDocument,
    getDocumentContent,
    analyzeDocument,
    updateDocument,
    createDocument,

    // Media operations
    searchMedia,
    analyzeMediaFile,
    getMediaDetails,
    listMediaFiles,

    // Data access
    listTasks,
    createTask,
    updateTask,
    listEvents,
    createEvent,
    getFolderContents,
  },
});

/* ================================================================
 * THREAD MANAGEMENT
 * ================================================================ */

/**
 * List all streaming threads for the current user
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
      .collect();

    return threads;
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
    return await ctx.db.get(args.threadId);
  },
});

/**
 * Create a new streaming thread (also creates agent thread for memory management)
 */
export const createThread = action({
  args: {
    title: v.string(),
    model: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"chatThreadsStream">> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const modelName = args.model || "gpt-5-chat-latest";
    const chatAgent = createChatAgent(modelName);

    // Create agent thread for automatic memory management
    const { threadId: agentThreadId } = await chatAgent.createThread(ctx, { userId });

    // Update agent thread summary
    await ctx.runMutation(components.agent.threads.updateThread, {
      threadId: agentThreadId,
      patch: {
        summary: args.title,
      },
    });

    // Create streaming thread linked to agent thread
    const now = Date.now();
    const threadId = await ctx.runMutation(internal.fastAgentPanelStreaming.createThreadInternal, {
      userId,
      title: args.title,
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
    const messages = await ctx.db
      .query("chatMessagesStream")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .collect();

    for (const message of messages) {
      await ctx.db.delete(message._id);
    }

    // Delete the thread
    await ctx.db.delete(args.threadId);
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
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { page: [], continueCursor: "", isDone: true, streams: [] };
    }

    // Verify the user has access to this agent thread
    const agentThread = await ctx.runQuery(components.agent.threads.getThread, {
      threadId: args.threadId,
    });

    if (!agentThread || agentThread.userId !== userId) {
      return { page: [], continueCursor: "", isDone: true, streams: [] };
    }

    // Fetch UIMessages with streaming support
    const paginated = await listUIMessages(ctx, components.agent, {
      threadId: args.threadId,
      paginationOpts: args.paginationOpts,
    });

    // Fetch streaming deltas
    const streams = await syncStreams(ctx, components.agent, {
      threadId: args.threadId,
      streamArgs: args.streamArgs,
    });

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
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    console.log('[initiateAsyncStreaming] Starting for thread:', args.threadId);

    const streamingThread: any = await ctx.db.get(args.threadId);
    if (!streamingThread || !streamingThread.agentThreadId) {
      throw new Error("Thread not found or not linked to agent");
    }
    if (streamingThread.userId !== userId) {
      throw new Error("Unauthorized");
    }

    const modelName = args.model || "gpt-5-chat-latest";
    const chatAgent = createChatAgent(modelName);

    console.log('[initiateAsyncStreaming] Saving user message, agentThreadId:', streamingThread.agentThreadId);

    // Save the user message first (enables optimistic updates)
    const { messageId } = await chatAgent.saveMessage(ctx, {
      threadId: streamingThread.agentThreadId,
      prompt: args.prompt,
      skipEmbeddings: true, // Skip embeddings in mutation, generate lazily when streaming
    });

    console.log('[initiateAsyncStreaming] User message saved, messageId:', messageId);

    // Schedule async streaming
    await ctx.scheduler.runAfter(0, internal.fastAgentPanelStreaming.streamAsync, {
      threadId: streamingThread.agentThreadId,
      promptMessageId: messageId,
      model: modelName,
    });

    console.log('[initiateAsyncStreaming] Stream scheduled');

    return { messageId };
  },
});

/**
 * Internal action to stream text asynchronously
 */
export const streamAsync = internalAction({
  args: {
    promptMessageId: v.string(),
    threadId: v.string(),
    model: v.string(),
  },
  handler: async (ctx, args) => {
    console.log('[streamAsync] Starting stream for message:', args.promptMessageId);
    const chatAgent = createChatAgent(args.model);

    try {
      const result = await chatAgent.streamText(
        ctx,
        { threadId: args.threadId },
        { promptMessageId: args.promptMessageId },
        {
          // Match the documentation's recommended settings
          saveStreamDeltas: {
            chunking: "word",   // Same as docs
            throttleMs: 100     // Same as docs
          }
        }
      );

      console.log('[streamAsync] Stream started, messageId:', result.messageId);

      // Use consumeStream() as recommended in the docs
      await result.consumeStream();

      console.log('[streamAsync] Stream completed successfully');
      // Note: Usage tracking is handled automatically by the agent's usageHandler
      
    } catch (error) {
      console.error('[streamAsync] Error:', error);
      throw error;
    }
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
      .collect();

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
 */
export const sendMessageInternal = internalAction({
  args: {
    threadId: v.optional(v.string()),
    message: v.string(),
    userId: v.optional(v.id("users")), // Optional userId for evaluation tests
  },
  returns: v.object({
    response: v.string(),
    toolsCalled: v.array(v.string()),
  }),
  handler: async (ctx, args): Promise<{ response: string; toolsCalled: string[] }> => {
    // Delegate to the OpenAI function-calling implementation
    // This is in a separate file that can use "use node" directive
    const result: { response: string; toolsCalled: string[] } = await ctx.runAction(
      internal.fastAgentPanelStreaming.sendMessageInternal,
      {
        message: args.message,
        threadId: args.threadId,
        userId: args.userId,
      }
    );
    return result;
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
  handler: async (ctx, args) => {
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

    return {
      fileId: file.fileId,
      url: file.url,
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
    await ctx.scheduler.runAfter(0, internal.fastAgentPanelStreaming.generateFileResponse, {
      threadId: thread.agentThreadId,
      promptMessageId: messageId,
      streamThreadId: args.threadId,
      model: thread.model || "gpt-5-chat-latest",
    });

    return {
      messageId: streamMessageId,
      agentMessageId: messageId,
    };
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
      const result = await chatAgent.streamText(
        ctx,
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
