/**
 * Orchestrator Entry Point
 * 
 * Main interface for the hybrid orchestration system
 */

import { action, internalAction } from "../_generated/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { routeQuery } from "./router";
import type { AgentContext } from "./types";

/**
 * Process a user message with hybrid routing
 * 
 * This is the main entry point for the orchestration system.
 * It intelligently routes queries between simple direct execution
 * and complex multi-agent orchestration.
 */
export const processMessage = action({
  args: {
    userQuery: v.string(),
    userId: v.optional(v.id("users")),
    threadId: v.optional(v.string()),
  },
  returns: v.object({
    response: v.string(),
    success: v.boolean(),
    steps: v.number(),
    latencyMs: v.number(),
    toolsCalled: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    console.log(`\n${"=".repeat(80)}`);
    console.log(`[Orchestrator] New message: "${args.userQuery}"`);
    console.log(`${"=".repeat(80)}\n`);

    const context: AgentContext = {
      userId: args.userId,
      threadId: args.threadId,
    };

    const result = await routeQuery(ctx, args.userQuery, context);

    console.log(`\n[Orchestrator] Final result:`);
    console.log(`  Success: ${result.success}`);
    console.log(`  Steps: ${result.steps.length}`);
    console.log(`  Latency: ${result.totalLatencyMs}ms`);
    console.log(`  Response length: ${result.finalResponse.length} chars\n`);

    return {
      response: result.finalResponse,
      success: result.success,
      steps: result.steps.length,
      latencyMs: result.totalLatencyMs,
      toolsCalled: result.toolsCalled,
    };
  },
});

/**
 * Internal action for evaluation tests
 * 
 * This is used by the evaluation system to test the orchestrator
 * with specific userId context.
 */
export const processMessageForEvaluation = internalAction({
  args: {
    userQuery: v.string(),
    userId: v.id("users"),
  },
  returns: v.object({
    response: v.string(),
    success: v.boolean(),
    steps: v.number(),
    latencyMs: v.number(),
    toolsCalled: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const context: AgentContext = {
      userId: args.userId,
    };

    const result = await routeQuery(ctx, args.userQuery, context);

    return {
      response: result.finalResponse,
      success: result.success,
      steps: result.steps.length,
      latencyMs: result.totalLatencyMs,
      toolsCalled: result.toolsCalled,
    };
  },
});

/**
 * Test the classifier without executing
 */
export const testClassifier = action({
  args: {
    userQuery: v.string(),
  },
  returns: v.object({
    complexity: v.union(v.literal("simple"), v.literal("complex")),
    domains: v.array(v.string()),
    requiresMultipleTools: v.boolean(),
    requiresWorkflow: v.boolean(),
    estimatedSteps: v.number(),
    reasoning: v.string(),
  }),
  handler: async (ctx, args) => {
    const { classifyQuery } = await import("./classifier");
    const classification = classifyQuery(args.userQuery);
    
    return {
      complexity: classification.complexity,
      domains: classification.domains,
      requiresMultipleTools: classification.requiresMultipleTools,
      requiresWorkflow: classification.requiresWorkflow,
      estimatedSteps: classification.estimatedSteps,
      reasoning: classification.reasoning,
    };
  },
});

/**
 * Test the planner without executing
 */
export const testPlanner = action({
  args: {
    userQuery: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const { classifyQuery } = await import("./classifier");
    const { createExecutionPlan } = await import("./planner");
    
    const classification = classifyQuery(args.userQuery);
    const plan = await createExecutionPlan(args.userQuery, classification);
    
    return {
      classification,
      plan,
    };
  },
});

