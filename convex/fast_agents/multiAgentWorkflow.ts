"use node";

import { getAuthUserId } from "@convex-dev/auth/server";
import { Agent, stepCountIs } from "@convex-dev/agent";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { v } from "convex/values";
import { action, internalAction } from "../_generated/server";
import { components, internal } from "../_generated/api";
import {
  DEFAULT_MODEL,
  createCoordinatorAgent,
  createDocumentAgent,
  createMediaAgent,
  createSECAgent,
} from "./coordinatorAgent";
import { workflow } from "./multiAgentWorkflowDefinition";

const coordinatorAgent = createCoordinatorAgent(DEFAULT_MODEL);
const documentAgent = createDocumentAgent(DEFAULT_MODEL);
const mediaAgent = createMediaAgent(DEFAULT_MODEL);
const secAgent = createSECAgent(DEFAULT_MODEL);
const criticAgent = new Agent(components.agent, {
  name: "CriticAgent",
  languageModel: openai.chat(DEFAULT_MODEL),
  instructions: `You are a rigorous reviewer. Given the agent's assembled answer, evaluate quality and safety.
Return pass=true only if:
- Claims are supported by provided content
- Citations or sources are present when referring to external data
- The answer is concise and actionable
Suggest concrete fixes or follow-ups when failing.`,
  stopWhen: stepCountIs(6),
});

export const createCoordinatorThread = action({
  args: {
    userId: v.string(),
    title: v.string(),
    summary: v.string(),
  },
  returns: v.object({ threadId: v.string() }),
  handler: async (ctx, args) => {
    const { threadId } = await coordinatorAgent.createThread(ctx, {
      userId: args.userId,
      title: args.title,
    });

    await ctx.runMutation(components.agent.threads.updateThread, {
      threadId,
      patch: {
        summary: args.summary,
      },
    });

    return { threadId };
  },
});

export const documentAgentAction = documentAgent.asTextAction({
  stopWhen: stepCountIs(8),
});

export const mediaAgentAction = mediaAgent.asTextAction({
  stopWhen: stepCountIs(8),
});

export const secAgentAction = secAgent.asTextAction({
  stopWhen: stepCountIs(6),
});

export const coordinatorAction = coordinatorAgent.asTextAction({
  stopWhen: stepCountIs(12),
});

export const criticAction = criticAgent.asObjectAction({
  schema: z.object({
    pass: z.boolean(),
    improvements: z.array(z.string()).default([]),
    refinedPrompt: z.string().optional(),
  }),
});

export const startMultiAgentWorkflow = action({
  args: {
    prompt: v.string(),
    threadId: v.optional(v.string()),
    includeMedia: v.optional(v.boolean()),
    includeFilings: v.optional(v.boolean()),
  },
  returns: v.object({ workflowId: v.string() }),
  handler: async (ctx, args): Promise<{ workflowId: string }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const workflowId: string = await workflow.start(
      ctx,
      (internal as any)["fast_agents/multiAgentWorkflowDefinition"].multiAgentOrchestration,
      { ...args, userId },
    );

    return { workflowId };
  },
});

export const startMultiAgentWorkflowInternal = internalAction({
  args: {
    prompt: v.string(),
    threadId: v.optional(v.string()),
    includeMedia: v.optional(v.boolean()),
    includeFilings: v.optional(v.boolean()),
    userId: v.id("users"),
  },
  returns: v.object({ workflowId: v.string() }),
  handler: async (ctx, args): Promise<{ workflowId: string }> => {
    const workflowId: string = await workflow.start(
      ctx,
      (internal as any)["fast_agents/multiAgentWorkflowDefinition"].multiAgentOrchestration,
      args,
    );
    return { workflowId };
  },
});
