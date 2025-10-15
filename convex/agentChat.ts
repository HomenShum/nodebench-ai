// Agent-based Chat using @convex-dev/agent component
// This replaces the manual HTTP streaming approach with built-in memory management

import { v } from "convex/values";
import { action, mutation, query, internalMutation } from "./_generated/server";
import { Agent } from "@convex-dev/agent";
import { components } from "./_generated/api";
import { openai } from "@ai-sdk/openai";
import { getAuthUserId } from "@convex-dev/auth/server";
import { paginationOptsValidator } from "convex/server";

// Helper to create agent with specific model
const createChatAgent = (model: string) => new Agent(components.agent, {
  name: "ChatAgent",
  languageModel: openai.chat(model),
  instructions: "You are a helpful AI assistant. Respond naturally and helpfully to user questions.",
});

/**
 * Create a new chat thread and send the first message
 */
export const createThreadWithMessage = action({
  args: {
    prompt: v.string(),
    model: v.optional(v.string()),
    fastMode: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const modelName = args.model || "gpt-5-chat-latest";
    const chatAgent = createChatAgent(modelName);

    // Create a new thread using the Agent component
    const { threadId, thread } = await chatAgent.createThread(ctx, { userId });

    // Update thread summary with model info
    await ctx.runMutation(components.agent.threads.updateThread, {
      threadId,
      patch: {
        summary: `Model: ${modelName}, Fast: ${args.fastMode || false}`,
      },
    });

    // Generate the first response
    const result = await thread.generateText({
      prompt: args.prompt,
      system: chatAgent.options.instructions,
    });

    return {
      threadId,
      text: result.text,
      messageId: result.messageId,
    };
  },
});

/**
 * Continue an existing conversation thread
 */
export const continueThread = action({
  args: {
    threadId: v.string(),
    prompt: v.string(),
    model: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Verify thread ownership
    const thread = await ctx.runQuery(components.agent.threads.getThread, {
      threadId: args.threadId,
    });
    if (thread?.userId !== userId) throw new Error("Unauthorized");

    const modelName = args.model || "gpt-5-chat-latest";
    const chatAgent = createChatAgent(modelName);

    // Continue the thread - this automatically includes previous message history
    const { thread: agentThread } = await chatAgent.continueThread(ctx, {
      threadId: args.threadId,
    });

    // Generate response with full conversation context
    const result = await agentThread.generateText({
      prompt: args.prompt,
    });

    return {
      text: result.text,
      messageId: result.messageId,
    };
  },
});

/**
 * Create a new thread with first message (non-streaming for reliability)
 */
export const createThreadWithStream = action({
  args: {
    prompt: v.string(),
    model: v.optional(v.string()),
    fastMode: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const modelName = args.model || "gpt-5-chat-latest";
    const chatAgent = createChatAgent(modelName);

    console.log('[agentChat] Creating new thread for user:', userId);
    const { threadId, thread } = await chatAgent.createThread(ctx, { userId });
    console.log('[agentChat] Thread created:', threadId);

    // Update thread summary
    await ctx.runMutation(components.agent.threads.updateThread, {
      threadId,
      patch: {
        summary: `Model: ${modelName}, Fast: ${args.fastMode || false}`,
      },
    });

    // Use generateText (synchronous) instead of streamText
    // The frontend will subscribe to message updates via query
    console.log('[agentChat] Generating response...');
    const result = await thread.generateText({
      prompt: args.prompt,
      system: chatAgent.options.instructions,
    });
    console.log('[agentChat] Response generated, messageId:', result.messageId);

    return {
      threadId,
      text: result.text,
      messageId: result.messageId,
    };
  },
});

/**
 * Continue a thread with message (non-streaming for reliability)
 */
export const continueThreadWithStream = action({
  args: {
    threadId: v.string(),
    prompt: v.string(),
    model: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    console.log('[agentChat] Continuing thread:', args.threadId);

    // Verify thread ownership
    const thread = await ctx.runQuery(components.agent.threads.getThread, {
      threadId: args.threadId,
    });
    if (thread?.userId !== userId) throw new Error("Unauthorized");

    const modelName = args.model || "gpt-5-chat-latest";
    const chatAgent = createChatAgent(modelName);

    const { thread: agentThread } = await chatAgent.continueThread(ctx, {
      threadId: args.threadId,
    });

    // Use generateText instead of streamText
    // Frontend subscribes to message updates via query
    console.log('[agentChat] Generating response...');
    const result = await agentThread.generateText({
      prompt: args.prompt,
    });
    console.log('[agentChat] Response generated, messageId:', result.messageId);

    return {
      text: result.text,
      messageId: result.messageId,
    };
  },
});

/**
 * Get messages for a thread (for UI display)
 * This queries the Agent component's internal storage
 */
export const getThreadMessages = query({
  args: {
    threadId: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Verify thread ownership
    const thread = await ctx.runQuery(components.agent.threads.getThread, {
      threadId: args.threadId,
    });
    if (thread?.userId !== userId) throw new Error("Unauthorized");

    // Query messages directly from the agent component table
    // Use listMessagesByThreadId instead of listMessages
    return await ctx.runQuery(components.agent.messages.listMessagesByThreadId, {
      threadId: args.threadId,
      order: "asc",
      paginationOpts: args.paginationOpts,
    });
  },
});

/**
 * List all threads for the current user
 */
export const listUserThreads = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const threads = await ctx.runQuery(components.agent.threads.listThreadsByUserId, {
      userId,
    });

    return threads.page;
  },
});

/**
 * Delete a thread (soft delete by marking as archived)
 */
export const deleteThread = mutation({
  args: { threadId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Verify thread ownership
    const thread = await ctx.runQuery(components.agent.threads.getThread, {
      threadId: args.threadId,
    });
    if (thread?.userId !== userId) throw new Error("Unauthorized");

    // Mark as archived by prefixing summary
    await ctx.runMutation(components.agent.threads.updateThread, {
      threadId: args.threadId,
      patch: {
        summary: `[ARCHIVED] ${thread.summary || ""}`,
      },
    });
  },
});

