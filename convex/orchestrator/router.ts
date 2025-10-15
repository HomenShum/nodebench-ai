/**
 * Hybrid Router
 * 
 * Intelligently routes queries between simple direct execution and complex orchestration
 */

import type { ActionCtx } from "../_generated/server";
import type { AgentContext, OrchestrationResult } from "./types";
import { classifyQuery, shouldUseOrchestrator, getPrimaryDomain } from "./classifier";
import { createExecutionPlan, validatePlan } from "./planner";
import { executeOrchestration, executeSimple } from "./orchestrator";

/**
 * Route a user query to the appropriate execution strategy
 */
export async function routeQuery(
  ctx: ActionCtx,
  userQuery: string,
  context: AgentContext
): Promise<OrchestrationResult> {
  console.log(`\n[Router] Processing query: "${userQuery}"`);
  
  // Step 1: Classify the query
  const classification = classifyQuery(userQuery);
  console.log(`[Router] Classification:`, {
    complexity: classification.complexity,
    domains: classification.domains,
    requiresWorkflow: classification.requiresWorkflow,
    requiresMultipleTools: classification.requiresMultipleTools,
    estimatedSteps: classification.estimatedSteps,
    reasoning: classification.reasoning,
  });

  // Step 2: Decide routing strategy
  const useOrchestrator = shouldUseOrchestrator(classification);
  console.log(`[Router] Strategy: ${useOrchestrator ? "ORCHESTRATOR" : "SIMPLE"}`);

  if (!useOrchestrator) {
    // Simple query - route directly to specialized sub-agent
    const domain = getPrimaryDomain(classification);
    console.log(`[Router] Routing to ${domain} agent directly`);
    
    return await executeSimple(ctx, userQuery, domain, context);
  }

  // Complex query - use orchestrator
  console.log(`[Router] Using orchestrator for complex query`);

  // Step 3: Create execution plan
  const plan = await createExecutionPlan(userQuery, classification);
  console.log(`[Router] Execution plan created with ${plan.steps.length} steps`);

  // Step 4: Validate plan
  const validation = validatePlan(plan);
  if (!validation.valid) {
    console.error(`[Router] Invalid execution plan:`, validation.errors);
    // Fallback to simple execution
    const domain = getPrimaryDomain(classification);
    return await executeSimple(ctx, userQuery, domain, context);
  }

  // Step 5: Execute orchestration
  return await executeOrchestration(ctx, plan, userQuery, context);
}

/**
 * Get routing statistics for monitoring
 */
export interface RoutingStats {
  totalQueries: number;
  simpleQueries: number;
  complexQueries: number;
  averageSteps: number;
  domainDistribution: Record<string, number>;
}

let routingStats: RoutingStats = {
  totalQueries: 0,
  simpleQueries: 0,
  complexQueries: 0,
  averageSteps: 0,
  domainDistribution: {},
};

/**
 * Track routing decision for analytics
 */
export function trackRouting(
  classification: ReturnType<typeof classifyQuery>,
  useOrchestrator: boolean,
  steps: number
) {
  routingStats.totalQueries++;
  
  if (useOrchestrator) {
    routingStats.complexQueries++;
  } else {
    routingStats.simpleQueries++;
  }

  // Update average steps
  const totalSteps = routingStats.averageSteps * (routingStats.totalQueries - 1) + steps;
  routingStats.averageSteps = totalSteps / routingStats.totalQueries;

  // Update domain distribution
  for (const domain of classification.domains) {
    routingStats.domainDistribution[domain] = (routingStats.domainDistribution[domain] || 0) + 1;
  }
}

/**
 * Get current routing statistics
 */
export function getRoutingStats(): RoutingStats {
  return { ...routingStats };
}

/**
 * Reset routing statistics
 */
export function resetRoutingStats() {
  routingStats = {
    totalQueries: 0,
    simpleQueries: 0,
    complexQueries: 0,
    averageSteps: 0,
    domainDistribution: {},
  };
}

