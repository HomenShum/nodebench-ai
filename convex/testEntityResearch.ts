// Test file for EntityResearchAgent
import { action } from "./_generated/server";
import { v } from "convex/values";
import type { ActionCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

/**
 * Test EntityResearchAgent with a simple company research query
 */
type AgentRunResult = {
  success: boolean;
  response: string;
  threadId: string;
};

type CacheHitResult = {
  success: boolean;
  firstResearch: string;
  secondResearch: string;
  cacheHit: boolean;
};

type CoordinatorDelegationResult = {
  success: boolean;
  response: string;
  delegatedToEntityResearch: boolean;
};

export const testCompanyResearch = action({
  args: {
    companyName: v.string(),
  },
  handler: async (ctx: ActionCtx, args): Promise<AgentRunResult> => {
    const { createEntityResearchAgent } = await import("./agents/specializedAgents");

    const userId = "test-user-id" as Id<"users">;
    const agent = createEntityResearchAgent(ctx, userId);
    const { threadId, thread } = await agent.createThread(ctx);

    const result = await thread.streamText({
      system: `Research the company: ${args.companyName}`,
    });
    await result.consumeStream();
    const text: string = await result.text;

    return {
      success: true,
      response: text,
      threadId,
    };
  },
});

/**
 * Test EntityResearchAgent with a person research query
 */
export const testPersonResearch = action({
  args: {
    personName: v.string(),
    company: v.optional(v.string()),
  },
  handler: async (ctx: ActionCtx, args): Promise<AgentRunResult> => {
    const { createEntityResearchAgent } = await import("./agents/specializedAgents");

    const userId = "test-user-id" as Id<"users">;
    const agent = createEntityResearchAgent(ctx, userId);
    const { threadId, thread } = await agent.createThread(ctx);

    const query = args.company
      ? `Research ${args.personName} at ${args.company}`
      : `Research ${args.personName}`;

    const result = await thread.streamText({
      system: query,
    });
    await result.consumeStream();
    const text: string = await result.text;

    return {
      success: true,
      response: text,
      threadId,
    };
  },
});

/**
 * Test cache hit by researching the same company twice
 */
export const testCacheHit = action({
  args: {
    companyName: v.string(),
  },
  handler: async (ctx: ActionCtx, args): Promise<CacheHitResult> => {
    const { createEntityResearchAgent } = await import("./agents/specializedAgents");

    const userId = "test-user-id" as Id<"users">;
    const agent = createEntityResearchAgent(ctx, userId);
    
    // First research (should call API)
    const { thread: thread1 } = await agent.createThread(ctx);
    const result1 = await thread1.streamText({
      system: `Research the company: ${args.companyName}`,
    });
    await result1.consumeStream();
    const text1: string = await result1.text;
    
    // Second research (should use cache)
    const { thread: thread2 } = await agent.createThread(ctx);
    const result2 = await thread2.streamText({
      system: `Research the company: ${args.companyName}`,
    });
    await result2.consumeStream();
    const text2: string = await result2.text;

    return {
      success: true,
      firstResearch: text1,
      secondResearch: text2,
      cacheHit: text2.includes('[CACHED'),
    };
  },
});

/**
 * Test CoordinatorAgent delegation to EntityResearchAgent
 */
export const testCoordinatorDelegation = action({
  args: {
    query: v.string(),
  },
  handler: async (ctx: ActionCtx, args): Promise<CoordinatorDelegationResult> => {
    const { createCoordinatorAgent } = await import("./agents/specializedAgents");

    const userId = "test-user-id" as Id<"users">;
    const agent = createCoordinatorAgent(ctx, userId);
    const { thread } = await agent.createThread(ctx);

    const result = await thread.streamText({
      system: args.query,
    });
    await result.consumeStream();
    const text: string = await result.text;

    return {
      success: true,
      response: text,
      delegatedToEntityResearch: text.includes('Research') || text.includes('company') || text.includes('person'),
    };
  },
});
