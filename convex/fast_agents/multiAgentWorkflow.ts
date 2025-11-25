import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { createCoordinatorAgent } from "./coordinatorAgent";

/**
 * Entry point for the multi-agent workflow.
 * Called by fastAgentPanelStreaming.ts when "complex" mode is selected.
 */
export const startMultiAgentWorkflowInternal = internalAction({
    args: {
        prompt: v.string(),
        threadId: v.id("chatThreadsStream"),
        includeMedia: v.optional(v.boolean()),
        includeFilings: v.optional(v.boolean()),
        userId: v.string(),
    },
    returns: v.object({ workflowId: v.id("chatThreadsStream") }),
    handler: async (ctx, args): Promise<{ workflowId: Id<"chatThreadsStream"> }> => {
        console.log(`[multiAgentWorkflow] 🚀 Starting workflow for thread ${args.threadId}`);

        // Schedule the workflow via mutation to ensure we can write the initial status message
        // and schedule the long-running action safely.
        const workflowId = await ctx.runMutation(internal.fast_agents.multiAgentWorkflow.scheduleWorkflow, {
            prompt: args.prompt,
            threadId: args.threadId,
            includeMedia: args.includeMedia,
            includeFilings: args.includeFilings,
            userId: args.userId,
        }) as Id<"chatThreadsStream">;

        return { workflowId };
    },
});

/**
 * Schedules the long-running workflow action and creates the initial status message.
 */
export const scheduleWorkflow = internalMutation({
    args: {
        prompt: v.string(),
        threadId: v.id("chatThreadsStream"),
        userId: v.string(),
        includeMedia: v.optional(v.boolean()),
        includeFilings: v.optional(v.boolean()),
    },
    handler: async (ctx, args): Promise<Id<"chatThreadsStream">> => {
        // Create the initial progress state
        const initialProgress = {
            type: "deep_agent_progress",
            steps: [
                { label: "Analyzing Request", status: "in_progress" },
                { label: "Orchestrating Agents", status: "pending" },
                { label: "Synthesizing Intelligence", status: "pending" }
            ]
        };

        // Update the thread with the progress state
        await ctx.db.patch(args.threadId, {
            workflowProgress: initialProgress,
            updatedAt: Date.now()
        });

        console.log(`[multiAgentWorkflow] 📅 Scheduling runWorkflow for ${args.threadId}`);

        await ctx.scheduler.runAfter(0, internal.fast_agents.multiAgentWorkflow.runWorkflow, {
            prompt: args.prompt,
            threadId: args.threadId,
            userId: args.userId,
            includeMedia: args.includeMedia,
            includeFilings: args.includeFilings,
        });

        return args.threadId;
    },
});

/**
 * The worker action that runs the Coordinator Agent.
 */
export const runWorkflow = internalAction({
    args: {
        prompt: v.string(),
        threadId: v.id("chatThreadsStream"),
        userId: v.string(),
        includeMedia: v.optional(v.boolean()),
        includeFilings: v.optional(v.boolean()),
    },
    returns: v.null(),
    handler: async (ctx, args): Promise<null> => {
        console.log(`[multiAgentWorkflow] 🏃 Running Coordinator Agent for ${args.threadId}`);

        // Helper to update progress
        const updateProgress = async (steps: any[]) => {
            await ctx.runMutation(internal.fast_agents.multiAgentWorkflow.updateWorkflowProgress, {
                threadId: args.threadId,
                steps,
            });
        };

        try {
            // 1. Update: Analyzing Done, Orchestrating Started
            await updateProgress([
                { label: "Analyzing Request", status: "completed" },
                { label: "Orchestrating Agents", status: "in_progress", details: "Identifying required specialists..." },
                { label: "Synthesizing Intelligence", status: "pending" }
            ]);

            const coordinator = createCoordinatorAgent("gpt-4o");

            // Get agent thread ID
            const threadInfo = await ctx.runQuery(internal.fast_agents.multiAgentWorkflow.getAgentThreadId, {
                threadId: args.threadId
            });

            if (!threadInfo) {
                throw new Error(`Thread not found: ${args.threadId}`);
            }

            // Run the agent
            // Use generateText to run the coordinator and persist output to the agent thread
            const result = await coordinator.generateText(
                ctx,
                { threadId: threadInfo.agentThreadId, userId: args.userId },
                { prompt: args.prompt }
            );

            // 2. Update: Orchestrating Done, Synthesizing Started
            await updateProgress([
                { label: "Analyzing Request", status: "completed" },
                { label: "Orchestrating Agents", status: "completed" },
                { label: "Synthesizing Intelligence", status: "in_progress", details: "Compiling final dossier..." }
            ]);

            // 3. Finalize: All Done
            await updateProgress([
                { label: "Analyzing Request", status: "completed" },
                { label: "Orchestrating Agents", status: "completed" },
                { label: "Synthesizing Intelligence", status: "completed" }
            ]);

            console.log(`[multiAgentWorkflow] ✅ Coordinator finished`);

        } catch (error: any) {
            console.error(`[multiAgentWorkflow] 💥 Coordinator failed`, error);

            // Mark as error
            await updateProgress([
                { label: "Analyzing Request", status: "completed" },
                { label: "Orchestrating Agents", status: "error", details: error.message },
                { label: "Synthesizing Intelligence", status: "pending" }
            ]);
        }

        return null;
    },
});

// Helper query to get agentThreadId since actions can't read DB directly
export const getAgentThreadId = internalQuery({
    args: { threadId: v.id("chatThreadsStream") },
    handler: async (ctx, args) => {
        const thread = await ctx.db.get(args.threadId);
        return thread ? { agentThreadId: thread.agentThreadId } : null;
    }
});

// Helper mutation to update progress in thread
export const updateWorkflowProgress = internalMutation({
    args: {
        threadId: v.id("chatThreadsStream"),
        steps: v.any(),
    },
    handler: async (ctx, args) => {
        const workflowProgress = {
            type: "deep_agent_progress",
            steps: args.steps
        };
        await ctx.db.patch(args.threadId, {
            workflowProgress,
            updatedAt: Date.now()
        });
    }
});
