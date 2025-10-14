// FastAgentPanel Streaming - Persistent Text Streaming Implementation

import { v } from "convex/values";
import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { PersistentTextStreaming, StreamId } from "@convex-dev/persistent-text-streaming";
import { components } from "./_generated/api";

const persistentTextStreaming = new PersistentTextStreaming(
  components.persistentTextStreaming
);

/**
 * Get the stream body for a given streamId
 * This is used by the useStream hook on the frontend
 */
export const getStreamBody = query(async (ctx, args: { streamId: string }) => {
  return await persistentTextStreaming.getStreamBody(ctx, args.streamId as StreamId);
});

/**
 * Get message by streamId (internal helper)
 */
export const getMessageByStreamId = query({
  args: { streamId: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("chatMessages"),
      threadId: v.id("chatThreads"),
      role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
      content: v.string(),
      streamId: v.optional(v.string()),
      isStreaming: v.optional(v.boolean()),
      createdAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const message = await ctx.db
      .query("chatMessages")
      .withIndex("by_streamId", (q) => q.eq("streamId", args.streamId))
      .first();

    if (!message) return null;

    return {
      _id: message._id,
      threadId: message.threadId,
      role: message.role,
      content: message.content,
      streamId: message.streamId,
      isStreaming: message.isStreaming,
      createdAt: message.createdAt,
    };
  },
});

/**
 * Mark stream as complete and update message content
 */
export const markStreamComplete = internalMutation({
  args: {
    messageId: v.id("chatMessages"),
    finalContent: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      content: args.finalContent,
      isStreaming: false,
      status: "complete",
      updatedAt: Date.now(),
    });
    return null;
  },
});

/**
 * Internal helper to list messages for a thread without auth (used by HTTP streaming)
 */
export const getThreadMessagesForStreaming = internalQuery({
  args: { threadId: v.id("chatThreads") },
  returns: v.array(
    v.object({
      _id: v.id("chatMessages"),
      threadId: v.id("chatThreads"),
      role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
      content: v.string(),
      status: v.union(
        v.literal("sending"),
        v.literal("streaming"),
        v.literal("complete"),
        v.literal("error")
      ),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const msgs = await ctx.db
      .query("chatMessages")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .order("asc")
      .collect();
    return msgs.map((m) => ({
      _id: m._id,
      threadId: m.threadId,
      role: m.role,
      content: m.content,
      status: m.status,
      createdAt: m.createdAt,
    }));
  },
});

/**
 * Send a message and create a streaming response
 * This replaces the old sendMessage action
 */
export const sendMessageWithStreaming = mutation({
  args: {
    threadId: v.id("chatThreads"),
    content: v.string(),
    model: v.optional(v.union(
      v.literal("gpt-5"),
      v.literal("gpt-5-mini"),
      v.literal("gpt-5-nano"),
      v.literal("gemini")
    )),
    fastMode: v.optional(v.boolean()),
  },
  returns: v.object({
    userMessageId: v.id("chatMessages"),
    aiMessageId: v.id("chatMessages"),
    streamId: v.string(),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const thread = await ctx.db.get(args.threadId);
    if (!thread || thread.userId !== userId) {
      throw new Error("Thread not found or access denied");
    }

    // Insert user message
    const userMessageId = await ctx.db.insert("chatMessages", {
      threadId: args.threadId,
      role: "user",
      content: args.content,
      status: "complete",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create a stream for the AI response
    const streamId = await persistentTextStreaming.createStream(ctx);

    // Create the AI message with streaming enabled
    const aiMessageId = await ctx.db.insert("chatMessages", {
      threadId: args.threadId,
      role: "assistant",
      content: "", // Start with empty content
      streamId: streamId,
      isStreaming: true,
      status: "streaming",
      model: args.model,
      fastMode: args.fastMode,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Update thread timestamp
    await ctx.db.patch(args.threadId, {
      updatedAt: Date.now(),
    });

    return {
      userMessageId,
      aiMessageId,
      streamId: streamId,
    };
  },
});