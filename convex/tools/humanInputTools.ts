/**
 * Human Input Tools
 * 
 * Tools for agents to request input or clarification from the user.
 * Uses the humanRequests table to store requests and wait for responses.
 */

import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { internal } from "../_generated/api";

/**
 * Ask the human user for input or clarification
 */
export const askHuman = createTool({
    description: `Ask the human user for input, clarification, or approval.
  
  Use this tool when:
  - The user's request is ambiguous
  - You need to confirm a critical action
  - You need more information to proceed
  - You want to offer the user a choice
  
  The system will pause execution (or mark it as pending) until the user responds.`,

    args: z.object({
        question: z.string().describe("The question to ask the user"),
        options: z.array(z.string()).optional().describe("List of suggested options for the user to choose from"),
        context: z.string().optional().describe("Context about why you are asking this question"),
    }),

    handler: async (ctx: any, args) => {
        // Get userId from agent tool context (required for internal mutation)
        const userId = ctx.userId;
        if (!userId) {
            return `ERROR: Cannot ask human - no userId in context. User may not be authenticated.`;
        }

        // Try to get threadId from context
        const threadId = ctx.threadId || "unknown_thread";

        // We don't have easy access to messageId/toolCallId in the tool handler context
        // In a real implementation, these would be passed or available in the context
        const messageId = "pending_message_id";
        const toolCallId = "pending_tool_call_id";

        await ctx.runMutation(internal.humanInTheLoop.createRequest, {
            userId,
            threadId,
            messageId,
            toolCallId,
            question: args.question,
            context: args.context,
            options: args.options,
        });

        return `REQUEST_FOR_HUMAN: ${args.question} ${args.options ? `[Options: ${args.options.join(", ")}]` : ""}`;
    },
});
