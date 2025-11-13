// convex/agents/humanInTheLoop.ts
// Human-in-the-Loop Pattern: Agents can request human input for ambiguous queries

import { createTool } from "@convex-dev/agent";
import { z } from "zod/v3";
import { internalAction, mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { components, internal } from "../_generated/api";

/**
 * Ask Human Tool
 * Allows agents to request clarification from users
 */
export const askHuman = createTool({
  description: "Ask a human for clarification when the request is ambiguous or requires user input. Use this when you need more information to proceed.",
  args: z.object({
    question: z.string().describe("The question to ask the human"),
    context: z.string().optional().describe("Context about why you're asking"),
    options: z.array(z.string()).optional().describe("Suggested options for the user to choose from"),
  }),
  handler: async (toolCtx, args) => {
    // This is a placeholder - actual implementation would create a human request
    return `Human input requested: ${args.question}`;
  },
});

/**
 * Human Request Schema
 * Stores pending human requests in the database
 */
// This would be added to your schema.ts:
// humanRequests: defineTable({
//   threadId: v.string(),
//   messageId: v.string(),
//   toolCallId: v.string(),
//   question: v.string(),
//   context: v.optional(v.string()),
//   options: v.optional(v.array(v.string())),
//   status: v.union(v.literal("pending"), v.literal("answered"), v.literal("cancelled")),
//   response: v.optional(v.string()),
//   respondedAt: v.optional(v.number()),
// }).index("by_thread", ["threadId"]).index("by_status", ["status"]),

/**
 * Create Human Request
 * Called when agent uses askHuman tool
 */
export const createHumanRequest = mutation({
  args: {
    userId: v.id("users"),
    threadId: v.string(),
    messageId: v.string(),
    toolCallId: v.string(),
    question: v.string(),
    context: v.optional(v.string()),
    options: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const requestId = await ctx.db.insert("humanRequests", {
      userId: args.userId,
      threadId: args.threadId,
      messageId: args.messageId,
      toolCallId: args.toolCallId,
      question: args.question,
      context: args.context,
      options: args.options,
      status: "pending",
    });

    console.log('[createHumanRequest] Created request:', requestId);
    return { requestId };
  },
});

/**
 * Get Pending Human Requests
 * Query to fetch pending requests for a thread
 */
export const getPendingHumanRequests = query({
  args: { threadId: v.string() },
  handler: async (ctx, args) => {
    const requests = await ctx.db
      .query("humanRequests")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();
    
    return requests;
  },
});

/**
 * Get All Human Requests for Thread
 * Query to fetch all requests (pending and answered)
 */
export const getHumanRequestsByThread = query({
  args: { threadId: v.string() },
  handler: async (ctx, args) => {
    const requests = await ctx.db
      .query("humanRequests")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .order("desc")
      .collect();
    
    return requests;
  },
});

/**
 * Submit Human Response
 * User provides answer to agent's question
 */
export const submitHumanResponse = mutation({
  args: {
    requestId: v.id("humanRequests"),
    response: v.string(),
  },
  handler: async (ctx, args) => {
    // Get current user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Request not found");
    }

    // Security: Verify user owns this request
    if (request.userId !== identity.subject) {
      throw new Error("Unauthorized: You can only respond to your own requests");
    }

    if (request.status !== "pending") {
      throw new Error("Request already answered or cancelled");
    }

    // Update request status
    await ctx.db.patch(args.requestId, {
      status: "answered",
      response: args.response,
      respondedAt: Date.now(),
    });

    console.log('[submitHumanResponse] Response submitted for request:', args.requestId);

    // Schedule action to continue agent execution
    await ctx.scheduler.runAfter(
      0,
      internal.agents.humanInTheLoop.continueAfterHumanResponse,
      {
        threadId: request.threadId,
        messageId: request.messageId,
        toolCallId: request.toolCallId,
        response: args.response,
      }
    );

    return { success: true };
  },
});

/**
 * Cancel Human Request
 * User cancels the request
 */
export const cancelHumanRequest = mutation({
  args: { requestId: v.id("humanRequests") },
  handler: async (ctx, args) => {
    // Get current user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Request not found");
    }

    // Security: Verify user owns this request
    if (request.userId !== identity.subject) {
      throw new Error("Unauthorized: You can only cancel your own requests");
    }

    await ctx.db.patch(args.requestId, {
      status: "cancelled",
      respondedAt: Date.now(),
    });

    console.log('[cancelHumanRequest] Request cancelled:', args.requestId);
    return { success: true };
  },
});

/**
 * Continue Agent After Human Response
 * Internal action to resume agent execution after human provides answer
 */
export const continueAfterHumanResponse = internalAction({
  args: {
    threadId: v.string(),
    messageId: v.string(),
    toolCallId: v.string(),
    response: v.string(),
  },
  handler: async (ctx, args) => {
    console.log('[continueAfterHumanResponse] Resuming agent with human response');

    // Save the human's response as a tool result
    await ctx.runMutation(components.agent.messages.addMessages, {
      threadId: args.threadId,
      messages: [{
        message: {
          role: "tool",
          content: [
            {
              type: "tool-result",
              result: args.response,
              toolCallId: args.toolCallId,
              toolName: "askHuman",
            },
          ],
        },
      }],
    });

    // Continue generating response from the LLM
    // This will be handled by the agent's streamText continuation
    console.log('[continueAfterHumanResponse] Tool result saved, agent will continue');
  },
});

/**
 * Example: Create an agent with askHuman tool
 */
export function createAgentWithHumanInTheLoop() {
  // This is an example of how to use askHuman in an agent
  // You would add this to your agent's tools object:
  
  /*
  import { Agent } from "@convex-dev/agent";
  import { openai } from "@ai-sdk/openai";
  import { askHuman } from "./humanInTheLoop";
  
  const agent = new Agent(components.agent, {
    name: "HumanAssistedAgent",
    languageModel: openai.chat("gpt-5"),
    instructions: `You are a helpful assistant that can ask humans for clarification.
    
When the user's request is ambiguous or you need more information:
1. Use the askHuman tool to ask a specific question
2. Wait for the human's response
3. Continue with the task using their answer

Examples of when to ask:
- "Which document do you mean?" when multiple documents match
- "What time zone?" when scheduling events
- "Which company?" when name is ambiguous
- "What format?" when exporting data

Always provide context and options when asking.`,
    tools: {
      askHuman,
      // ... other tools
    },
  });
  */
}

/**
 * Smart Disambiguation Tool
 * Automatically asks human when multiple options are found
 */
export function createSmartDisambiguationTool() {
  return createTool({
    description: "When multiple options match the user's query, ask them to choose. Use this for document selection, company selection, etc.",
    args: z.object({
      category: z.string().describe("What type of thing needs disambiguation (e.g., 'document', 'company', 'person')"),
      options: z.array(z.object({
        id: z.string(),
        label: z.string(),
        description: z.string().optional(),
      })).describe("The options to choose from"),
      context: z.string().optional().describe("Why disambiguation is needed"),
    }),
    handler: async (toolCtx, args) => {
      return `Disambiguation requested for ${args.category}`;
    },
  });
}

/**
 * Confirmation Tool
 * Ask human to confirm before taking an action
 */
export function createConfirmationTool() {
  return createTool({
    description: "Ask human to confirm before taking a potentially destructive or important action. Use this for delete, update, or send operations.",
    args: z.object({
      action: z.string().describe("The action to confirm (e.g., 'delete document', 'send email')"),
      details: z.string().describe("Details about what will happen"),
      warning: z.string().optional().describe("Any warnings or risks"),
    }),
    handler: async (toolCtx, args) => {
      return `Confirmation requested for: ${args.action}`;
    },
  });
}

/**
 * Preference Tool
 * Ask human for their preference when multiple valid approaches exist
 */
export function createPreferenceTool() {
  return createTool({
    description: "Ask human for their preference when multiple valid approaches exist. Use this for format selection, style choices, etc.",
    args: z.object({
      question: z.string().describe("The preference question"),
      options: z.array(z.object({
        value: z.string(),
        label: z.string(),
        pros: z.string().optional(),
        cons: z.string().optional(),
      })).describe("The options with pros/cons"),
    }),
    handler: async (toolCtx, args) => {
      return `Preference requested: ${args.question}`;
    },
  });
}

