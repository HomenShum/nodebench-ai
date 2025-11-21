// convex/agentChatActions.ts
// Action functions for Agent component-based chat
// Actions can call external APIs and integrate with the Agent component

"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Agent } from "@convex-dev/agent";
import { components } from "./_generated/api";
import { openai } from "@ai-sdk/openai";

// Define the agent configuration (simplified version of FastChatAgent)
const createChatAgent = (model: string) => new Agent(components.agent, {
  name: "FastChatAgent",
  languageModel: openai.chat(model),
  instructions: `You are a helpful AI assistant with access to the user's documents, tasks, events, and media files.
  
  CRITICAL BEHAVIOR RULES:
  1. BE PROACTIVE - Don't ask for clarification when you can take reasonable action
  2. USE CONTEXT - If a query is ambiguous, make a reasonable assumption and act
  3. COMPLETE WORKFLOWS - When a user asks for multiple actions, complete ALL of them
  
  Always provide clear, helpful responses.`,
  // We can add tools here if needed, but for now let's start with basic chat
  // to fix the end-to-end flow.
  tools: {},
});

/**
 * Utility function to safely extract and validate user ID from authentication
 */
async function getSafeUserId(ctx: ActionCtx): Promise<Id<"users">> {
  const rawUserId = await getAuthUserId(ctx);
  if (!rawUserId) {
    throw new Error("Not authenticated");
  }

  // Handle malformed user IDs with pipe characters
  let userId: Id<"users">;
  if (typeof rawUserId === "string" && rawUserId.includes("|")) {
    const userIdPart = rawUserId.split("|")[0];
    if (!userIdPart || userIdPart.length < 10) {
      throw new Error("Invalid user ID format. Please sign out and sign back in.");
    }
    userId = userIdPart as Id<"users">;
  } else {
    userId = rawUserId as Id<"users">;
  }

  return userId;
}

/**
 * Create a new thread with an initial message and get agent response
 */
export const createThreadWithMessage: any = action({
  args: {
    message: v.string(),
    model: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ success: boolean; threadId: string; messageId?: string }> => {
    const userId = await getSafeUserId(ctx);

    return await ctx.runAction(internal.agentChatActions.createThreadWithMessageInternal, {
      message: args.message,
      model: args.model,
      userId,
    });
  },
});

/**
 * Internal version of createThreadWithMessage for testing and internal use
 */
export const createThreadWithMessageInternal = internalAction({
  args: {
    message: v.string(),
    model: v.optional(v.string()),
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<{ success: boolean; threadId: string; messageId?: string }> => {
    const { userId, message, model } = args;
    const modelName = model || "gpt-5-chat-latest";
    const chatAgent = createChatAgent(modelName);

    // Create agent thread
    const { threadId: agentThreadId } = await chatAgent.createThread(ctx, { userId });

    // Create streaming thread record linked to agent thread
    const threadId = await ctx.runMutation(internal.agentChat.createThread, {
      userId,
      title: message.slice(0, 50) + (message.length > 50 ? "..." : ""),
      model: model,
      agentThreadId,
    });

    // Continue with the message
    const result = await ctx.runAction(api.agentChatActions.continueThread, {
      threadId: agentThreadId, // Pass agent thread ID for the agent component
      message: message,
    });

    return {
      success: true,
      threadId: agentThreadId, // Return agent thread ID as expected by frontend
      messageId: result.messageId,
    };
  },
});

/**
 * Continue an existing thread with a new message
 */
export const continueThread = action({
  args: {
    threadId: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const chatAgent = createChatAgent("gpt-5-chat-latest");
    let agentThreadId = args.threadId;

    // Check if the threadId is a chatThreadsStream ID
    // We can't easily check the format if it's a generic string, but we can try to find it in the DB
    // via an internal query helper.
    // Since we can't query the DB directly in an action, we need a helper.

    const streamThread = await ctx.runQuery(internal.agentChat.getStreamThread, {
      threadId: args.threadId,
    });

    if (streamThread && streamThread.agentThreadId) {
      agentThreadId = streamThread.agentThreadId;
    }

    // Save the user message
    const { messageId } = await chatAgent.saveMessage(ctx, {
      threadId: agentThreadId,
      prompt: args.message,
    });

    // Run the agent (using streamText and consumeStream to ensure execution)
    const result = await chatAgent.streamText(
      ctx,
      { threadId: agentThreadId },
      { promptMessageId: messageId }
    );

    await result.consumeStream();

    return {
      success: true,
      messageId,
    };
  },
});

