// FastAgentPanel Streaming Action
"use node";

import { internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";
import OpenAI from "openai";

/**
 * Internal action to stream chat response from OpenAI
 * This runs in Node.js runtime and can use the OpenAI SDK
 */
export const streamOpenAIResponse = internalAction({
  args: {
    streamId: v.string(),
    model: v.optional(v.string()),
  },
  returns: v.array(v.string()), // Returns array of content chunks
  handler: async (ctx, args) => {
    try {
      // Get the message that we're streaming to
      const message = await ctx.runQuery(api.fastAgentPanelStreaming.getMessageByStreamId, {
        streamId: args.streamId,
      });

      if (!message) {
        return ["Error: Message not found"];
      }

      // Get conversation history
      const messages = await ctx.runQuery(api.fastAgentPanel.getMessages, {
        threadId: message.threadId,
      });

      if (messages.length === 0) {
        return ["Hello! How can I help you today?"];
      }

      // Initialize OpenAI
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      // Build conversation context
      const conversationMessages = messages
        .filter((m: any) => m.status === "complete")
        .map((m: any) => ({
          role: m.role as "user" | "assistant" | "system",
          content: m.content,
        }));

      // Stream response from OpenAI
      const stream = await openai.chat.completions.create({
        model: args.model === "gemini" ? "gpt-4o" : "gpt-4o",
        messages: conversationMessages,
        stream: true,
      });

      const chunks: string[] = [];
      let fullResponse = "";

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          fullResponse += content;
          chunks.push(content);
        }
      }

      // Mark the message as complete
      await ctx.runMutation(internal.fastAgentPanelStreaming.markStreamComplete, {
        messageId: message._id,
        finalContent: fullResponse,
      });

      return chunks;
    } catch (error) {
      console.error("Chat generation error:", error);
      const errorMessage = error instanceof Error
        ? `Sorry, an error occurred: ${error.message}`
        : "Sorry, an error occurred while generating the response.";
      return [errorMessage];
    }
  },
});

