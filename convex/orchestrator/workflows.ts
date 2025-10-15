/**
 * Durable Workflow Definitions
 * 
 * Multi-step workflows using @convex-dev/workflow for guaranteed completion,
 * retries, and idempotency. Follows patterns from https://docs.convex.dev/agents/workflows
 */

import { WorkflowManager } from "@convex-dev/workflow";
import { createThread, saveMessage, stepCountIs } from "@convex-dev/agent";
import { components, internal } from "../_generated/api";
import { v } from "convex/values";
import { mutation, internalMutation, internalAction } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "../_generated/dataModel";

const workflow = new WorkflowManager(components.workflow);

/**
 * Document Discovery & Analysis Workflow
 * 
 * Steps:
 * 1. Find documents matching query
 * 2. Get document content
 * 3. Analyze and summarize
 */
export const documentAnalysisWorkflow = workflow.define({
  args: { 
    query: v.string(), 
    userId: v.id("users"),
    threadId: v.optional(v.string()),
  },
  handler: async (step, { query, userId, threadId }): Promise<void> => {
    // Step 1: Create or use existing thread
    let actualThreadId: string;
    if (threadId) {
      actualThreadId = threadId;
    } else {
      const thread = await step.runMutation(
        internal.orchestrator.workflows.createThreadMutation,
        { userId, title: `Document: ${query}` }
      );
      actualThreadId = thread.threadId;
    }

    // Step 2: Find document (with retries)
    const findMessage = await saveMessage(step, components.agent, {
      threadId: actualThreadId,
      prompt: `Find document: ${query}`,
    });
    
    await step.runAction(
      internal.agents.specialized.findDocumentAction,
      { promptMessageId: findMessage.messageId, threadId: actualThreadId },
      { 
        retry: { 
          maxAttempts: 3, 
          initialBackoffMs: 1000, 
          base: 2 
        } 
      }
    );

    // Step 3: Get content (depends on step 2)
    const contentMessage = await saveMessage(step, components.agent, {
      threadId: actualThreadId,
      prompt: "Get the full content of the found document",
    });
    
    await step.runAction(
      internal.agents.specialized.findDocumentAction,
      { promptMessageId: contentMessage.messageId, threadId: actualThreadId },
      { retry: true }
    );

    // Step 4: Analyze (depends on step 3)
    const analysisMessage = await saveMessage(step, components.agent, {
      threadId: actualThreadId,
      prompt: "Analyze this document and provide a summary with key points",
    });
    
    await step.runAction(
      internal.agents.specialized.analyzeDocumentAction,
      { promptMessageId: analysisMessage.messageId, threadId: actualThreadId },
      { retry: true }
    );
  },
});

/**
 * Task Management Workflow
 * 
 * Steps:
 * 1. List existing tasks
 * 2. Create new task if requested
 * 3. Update task status if needed
 */
export const taskManagementWorkflow = workflow.define({
  args: { 
    action: v.string(), // "list", "create", "update"
    query: v.string(), 
    userId: v.id("users"),
    threadId: v.optional(v.string()),
  },
  handler: async (step, { action, query, userId, threadId }): Promise<void> => {
    // Create thread if needed
    let actualThreadId: string;
    if (threadId) {
      actualThreadId = threadId;
    } else {
      const thread = await step.runMutation(
        internal.orchestrator.workflows.createThreadMutation,
        { userId, title: `Task: ${action}` }
      );
      actualThreadId = thread.threadId;
    }

    // Execute based on action type
    if (action === "list") {
      const listMessage = await saveMessage(step, components.agent, {
        threadId: actualThreadId,
        prompt: query,
      });
      
      await step.runAction(
        internal.agents.specialized.listTasksAction,
        { promptMessageId: listMessage.messageId, threadId: actualThreadId },
        { retry: true }
      );
    } else if (action === "create") {
      const createMessage = await saveMessage(step, components.agent, {
        threadId: actualThreadId,
        prompt: query,
      });
      
      await step.runAction(
        internal.agents.specialized.createTaskAction,
        { promptMessageId: createMessage.messageId, threadId: actualThreadId },
        { retry: { maxAttempts: 5, initialBackoffMs: 500, base: 2 } }
      );
    }
  },
});

/**
 * Media Search Workflow
 */
export const mediaSearchWorkflow = workflow.define({
  args: { 
    query: v.string(), 
    userId: v.id("users"),
    threadId: v.optional(v.string()),
  },
  handler: async (step, { query, userId, threadId }): Promise<void> => {
    let actualThreadId: string;
    if (threadId) {
      actualThreadId = threadId;
    } else {
      const thread = await step.runMutation(
        internal.orchestrator.workflows.createThreadMutation,
        { userId, title: `Media: ${query}` }
      );
      actualThreadId = thread.threadId;
    }

    const searchMessage = await saveMessage(step, components.agent, {
      threadId: actualThreadId,
      prompt: query,
    });
    
    await step.runAction(
      internal.agents.specialized.searchMediaAction,
      { promptMessageId: searchMessage.messageId, threadId: actualThreadId },
      { retry: true }
    );
  },
});

/**
 * Helper Mutations for Workflows
 */

export const createThreadMutation = internalMutation({
  args: { 
    userId: v.id("users"), 
    title: v.string() 
  },
  handler: async (ctx, { userId, title }): Promise<{ threadId: string }> => {
    const threadId = await createThread(ctx, components.agent, {
      userId,
      title,
    });
    return { threadId };
  },
});

/**
 * Workflow Starters - Public API
 */

export const startDocumentWorkflow = mutation({
  args: { query: v.string() },
  handler: async (ctx, { query }): Promise<{ workflowId: string; message: string }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    
    const workflowId = await workflow.start(
      ctx,
      internal.orchestrator.workflows.documentAnalysisWorkflow,
      { query, userId }
    );
    
    return { workflowId, message: "Document workflow started" };
  },
});

export const startTaskWorkflow = mutation({
  args: { action: v.string(), query: v.string() },
  handler: async (ctx, { action, query }): Promise<{ workflowId: string; message: string }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    
    const workflowId = await workflow.start(
      ctx,
      internal.orchestrator.workflows.taskManagementWorkflow,
      { action, query, userId }
    );
    
    return { workflowId, message: "Task workflow started" };
  },
});

export const startMediaWorkflow = mutation({
  args: { query: v.string() },
  handler: async (ctx, { query }): Promise<{ workflowId: string; message: string }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    
    const workflowId = await workflow.start(
      ctx,
      internal.orchestrator.workflows.mediaSearchWorkflow,
      { query, userId }
    );
    
    return { workflowId, message: "Media workflow started" };
  },
});
