// Intent Parser - Stub implementation for FastAgentPanel
"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";

/**
 * Check if a user message is a data operation request
 */
export const isDataOperationRequest = action({
  args: {
    userMessage: v.string(),
  },
  returns: v.boolean(),
  handler: async (_ctx, { userMessage }) => {
    // Simple heuristic: check for data operation keywords
    const dataOpKeywords = /\b(create|delete|update|insert|remove|add)\s+(task|event|document|note|file)\b/i;
    return dataOpKeywords.test(userMessage);
  },
});

/**
 * Parse data operation intent from user message
 */
export const parseDataOperationIntent = action({
  args: {
    userMessage: v.string(),
  },
  returns: v.object({
    entityType: v.string(),
    operation: v.string(),
    params: v.any(),
  }),
  handler: async (_ctx, { userMessage }) => {
    // Simple parsing logic
    const message = userMessage.toLowerCase();
    
    let entityType = "unknown";
    let operation = "unknown";
    const params: any = {};

    // Detect entity type
    if (message.includes("task")) entityType = "task";
    else if (message.includes("event")) entityType = "event";
    else if (message.includes("document")) entityType = "document";
    else if (message.includes("note")) entityType = "note";

    // Detect operation
    if (message.includes("create") || message.includes("add")) operation = "create";
    else if (message.includes("delete") || message.includes("remove")) operation = "delete";
    else if (message.includes("update") || message.includes("edit")) operation = "update";

    // Extract params (basic implementation)
    params.rawMessage = userMessage;

    return {
      entityType,
      operation,
      params,
    };
  },
});

