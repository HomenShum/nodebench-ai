// FastAgentPanel Backend - Thread and message management
import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

/**
 * List all threads for the current user, sorted by most recent
 */
export const listThreads = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("chatThreads"),
      _creationTime: v.number(),
      userId: v.id("users"),
      title: v.string(),
      pinned: v.optional(v.boolean()),
      createdAt: v.number(),
      updatedAt: v.number(),
      messageCount: v.optional(v.number()),
      lastMessage: v.optional(v.string()),
      lastMessageAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Get all threads for user
    const threads = await ctx.db
      .query("chatThreads")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    // Enrich with message counts and last message
    const enriched = await Promise.all(
      threads.map(async (thread) => {
        const messages = await ctx.db
          .query("chatMessages")
          .withIndex("by_thread", (q) => q.eq("threadId", thread._id))
          .order("desc")
          .take(1);

        const lastMsg = messages[0];
        const allMessages = await ctx.db
          .query("chatMessages")
          .withIndex("by_thread", (q) => q.eq("threadId", thread._id))
          .collect();

        return {
          ...thread,
          messageCount: allMessages.length,
          lastMessage: lastMsg?.content,
          lastMessageAt: lastMsg?.createdAt,
        };
      })
    );

    // Sort: pinned first, then by updatedAt
    return enriched.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.updatedAt - a.updatedAt;
    });
  },
});

/**
 * Get messages for a specific thread
 */
export const getMessages = query({
  args: { threadId: v.id("chatThreads") },
  returns: v.array(
    v.object({
      _id: v.id("chatMessages"),
      _creationTime: v.number(),
      threadId: v.id("chatThreads"),
      role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
      content: v.string(),
      status: v.union(
        v.literal("sending"),
        v.literal("streaming"),
        v.literal("complete"),
        v.literal("error")
      ),
      runId: v.optional(v.id("agentRuns")),
      streamId: v.optional(v.string()), // For persistent text streaming
      isStreaming: v.optional(v.boolean()), // Whether message is actively streaming
      model: v.optional(v.string()),
      fastMode: v.optional(v.boolean()),
      tokensUsed: v.optional(
        v.object({
          input: v.number(),
          output: v.number(),
        })
      ),
      elapsedMs: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, { threadId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Verify thread ownership
    const thread = await ctx.db.get(threadId);
    if (!thread || thread.userId !== userId) return [];

    // Get messages in chronological order
    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_thread", (q) => q.eq("threadId", threadId))
      .order("asc")
      .collect();

    return messages;
  },
});

/**
 * Create a new thread
 */
export const createThread = mutation({
  args: {
    title: v.optional(v.string()),
    pinned: v.optional(v.boolean()),
  },
  returns: v.id("chatThreads"),
  handler: async (ctx, { title, pinned }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const now = Date.now();
    const threadTitle = title || `Chat — ${new Date(now).toLocaleString()}`;

    const threadId = await ctx.db.insert("chatThreads", {
      userId,
      title: threadTitle,
      pinned: pinned || false,
      createdAt: now,
      updatedAt: now,
    });

    return threadId;
  },
});

/**
 * Update thread properties
 */
export const updateThread = mutation({
  args: {
    threadId: v.id("chatThreads"),
    title: v.optional(v.string()),
    pinned: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, { threadId, title, pinned }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const thread = await ctx.db.get(threadId);
    if (!thread || thread.userId !== userId) {
      throw new Error("Thread not found or unauthorized");
    }

    const updates: any = { updatedAt: Date.now() };
    if (title !== undefined) updates.title = title;
    if (pinned !== undefined) updates.pinned = pinned;

    await ctx.db.patch(threadId, updates);
    return null;
  },
});

/**
 * Delete a thread and all its messages
 */
export const deleteThread = mutation({
  args: { threadId: v.id("chatThreads") },
  returns: v.null(),
  handler: async (ctx, { threadId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const thread = await ctx.db.get(threadId);
    if (!thread || thread.userId !== userId) {
      throw new Error("Thread not found or unauthorized");
    }

    // Delete all messages in thread
    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_thread", (q) => q.eq("threadId", threadId))
      .collect();

    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }

    // Delete thread
    await ctx.db.delete(threadId);
    return null;
  },
});

/**
 * Send a message (creates message record and initiates agent run)
 */
export const sendMessage = action({
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
    messageId: v.id("chatMessages"),
    runId: v.id("agentRuns"),
  }),
  handler: async (
    ctx,
    { threadId, content, model, fastMode }
  ): Promise<{ messageId: Id<"chatMessages">; runId: Id<"agentRuns"> }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const now = Date.now();

    await ctx.runMutation(internal.fastAgentPanelHelpers.insertChatMessage, {
      threadId,
      role: "user",
      content,
      status: "complete",
      ...(model ? { model } : {}),
      ...(fastMode === undefined ? {} : { fastMode }),
      createdAt: now,
      updatedAt: now,
    });

    const runId = (await ctx.runMutation(
      internal.fastAgentPanelHelpers.insertAgentRun,
      {
        userId,
        threadId: threadId as string,
        ...(model ? { model } : { model: "openai" }),
        status: "pending",
        createdAt: now,
        updatedAt: now,
      }
    )) as Id<"agentRuns">;

    const assistantMessageId = (await ctx.runMutation(
      internal.fastAgentPanelHelpers.insertChatMessage,
      {
        threadId,
        role: "assistant",
        content: "",
        status: "streaming",
        runId,
        ...(model ? { model } : {}),
        ...(fastMode === undefined ? {} : { fastMode }),
        createdAt: now,
        updatedAt: now,
      }
    )) as Id<"chatMessages">;

    await ctx.runMutation(internal.fastAgentPanelHelpers.touchThread, {
      threadId,
      updatedAt: now,
    });

    return { messageId: assistantMessageId, runId };
  },
});

/**
 * Update message content (for streaming updates)
 */
export const updateMessage = mutation({
  args: {
    messageId: v.id("chatMessages"),
    content: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("sending"),
        v.literal("streaming"),
        v.literal("complete"),
        v.literal("error")
      )
    ),
    tokensUsed: v.optional(
      v.object({
        input: v.number(),
        output: v.number(),
      })
    ),
    elapsedMs: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, { messageId, content, status, tokensUsed, elapsedMs }) => {
    const updates: any = { updatedAt: Date.now() };
    if (content !== undefined) updates.content = content;
    if (status !== undefined) updates.status = status;
    if (tokensUsed !== undefined) updates.tokensUsed = tokensUsed;
    if (elapsedMs !== undefined) updates.elapsedMs = elapsedMs;

    await ctx.db.patch(messageId, updates);
    return null;
  },
});
