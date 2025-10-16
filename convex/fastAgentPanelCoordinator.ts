// convex/fastAgentPanelCoordinator.ts
// Fast Agent Panel with Coordinator Agent that delegates to specialized agents

import { v } from "convex/values";
import { internalAction, action } from "./_generated/server";
import { internal } from "./_generated/api";
import { createCoordinatorAgent } from "./agents/specializedAgents";

/**
 * Send a message using the coordinator agent
 * The coordinator will analyze the request and delegate to appropriate specialized agents
 */
export const sendMessageWithCoordinator = action({
  args: {
    threadId: v.string(),
    prompt: v.string(),
    userId: v.string(),
  },
  returns: v.object({
    response: v.string(),
    agentsUsed: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const { threadId, prompt, userId } = args;

    // Create the coordinator agent
    const coordinator = createCoordinatorAgent(ctx, userId);

    // Generate response using the coordinator
    const result = await coordinator.generateText(
      ctx,
      { threadId },
      { prompt }
    );

    // Extract which agents were used from the tool calls
    const agentsUsed: string[] = [];
    if (result.steps) {
      for (const step of result.steps) {
        if (step.toolCalls) {
          for (const toolCall of step.toolCalls) {
            if (toolCall.toolName.startsWith("delegateTo")) {
              const agentName = toolCall.toolName.replace("delegateTo", "").replace("Agent", "");
              if (!agentsUsed.includes(agentName)) {
                agentsUsed.push(agentName);
              }
            }
          }
        }
      }
    }

    return {
      response: result.text,
      agentsUsed,
    };
  },
});

/**
 * Stream a message using the coordinator agent
 * This version streams the response back to the client
 */
export const streamMessageWithCoordinator = internalAction({
  args: {
    threadId: v.string(),
    promptMessageId: v.string(),
    userId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { threadId, promptMessageId, userId } = args;

    // Create the coordinator agent
    const coordinator = createCoordinatorAgent(ctx, userId);

    // Stream response using the coordinator
    await coordinator.streamText(
      ctx,
      { threadId },
      { promptMessageId }
    );

    return null;
  },
});

/**
 * Example: Direct delegation to a specific agent
 * This bypasses the coordinator and goes straight to a specialized agent
 */
export const sendMessageToSpecializedAgent = action({
  args: {
    threadId: v.string(),
    prompt: v.string(),
    userId: v.string(),
    agentType: v.union(
      v.literal("document"),
      v.literal("media"),
      v.literal("sec"),
      v.literal("web")
    ),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const { threadId, prompt, userId, agentType } = args;

    // Import the specialized agent creators
    const {
      createDocumentAgent,
      createMediaAgent,
      createSECAgent,
      createWebAgent,
    } = await import("./agents/specializedAgents");

    // Create the appropriate specialized agent
    let agent;
    switch (agentType) {
      case "document":
        agent = createDocumentAgent(ctx, userId);
        break;
      case "media":
        agent = createMediaAgent(ctx, userId);
        break;
      case "sec":
        agent = createSECAgent(ctx, userId);
        break;
      case "web":
        agent = createWebAgent(ctx, userId);
        break;
    }

    // Generate response
    const result = await agent.generateText(
      ctx,
      { threadId },
      { prompt }
    );

    return result.text;
  },
});

