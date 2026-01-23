/**
 * Minimal agentic test action
 */

"use node";

import { v } from "convex/values";
import { action } from "../../../../_generated/server";

export const testAgenticAction = action({
  args: {
    query: v.string(),
  },
  handler: async (ctx, args) => {
    console.log(`[AgenticTest] Received query: ${args.query}`);
    return {
      received: args.query,
      status: "working",
      timestamp: Date.now(),
    };
  },
});
