/**
 * Main Orchestrator
 * 
 * Coordinates execution of complex multi-step queries across specialized sub-agents
 */

import type { ActionCtx } from "../_generated/server";
import type { 
  ExecutionPlan, 
  TaskStep, 
  StepResult, 
  OrchestrationResult,
  AgentContext,
  AgentDomain
} from "./types";
import { 
  createDocumentAgent, 
  createMediaAgent, 
  createTaskAgent, 
  createEventAgent, 
  createWebAgent 
} from "./subAgents";
import { getExecutionOrder } from "./planner";

/**
 * Execute a single step using the appropriate sub-agent
 */
async function executeStep(
  ctx: ActionCtx,
  step: TaskStep,
  context: AgentContext,
  previousResults: Record<string, any>
): Promise<StepResult> {
  const startTime = Date.now();
  console.log(`[Orchestrator] Executing step ${step.id}: ${step.description}`);

  try {
    // Select appropriate sub-agent based on domain
    let agent;
    switch (step.domain) {
      case "document":
        agent = createDocumentAgent("gpt-5-mini");
        break;
      case "media":
        agent = createMediaAgent("gpt-5-mini");
        break;
      case "task":
        agent = createTaskAgent("gpt-5-mini");
        break;
      case "event":
        agent = createEventAgent("gpt-5-mini");
        break;
      case "web":
        agent = createWebAgent("gpt-5-mini");
        break;
      default:
        // Fallback to document agent for general queries
        agent = createDocumentAgent("gpt-5-mini");
    }

    // Build context-aware prompt
    let prompt = step.description;
    
    // Add context from previous steps if available
    if (step.dependencies.length > 0) {
      const contextParts: string[] = [];
      for (const depId of step.dependencies) {
        if (previousResults[depId]) {
          contextParts.push(`Previous step (${depId}): ${JSON.stringify(previousResults[depId]).slice(0, 200)}`);
        }
      }
      if (contextParts.length > 0) {
        prompt = `${contextParts.join("\n")}\n\nNow: ${prompt}`;
      }
    }

    // Create or continue thread
    let threadId;
    if (context.threadId) {
      threadId = context.threadId;
    } else {
      const result = await agent.createThread(ctx, {});
      threadId = result.threadId;
      context.threadId = result.threadId;
    }

    // Inject userId into context for evaluation
    if (context.userId) {
      (ctx as any).evaluationUserId = context.userId;
    }

    // Execute with the agent - use streamText and await full result
    let finalResponse = "";
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      const result = await agent.streamText(ctx, { threadId }, { prompt });
      const response = await result.text;
      attempts++;

      if (response && response.trim().length > 0) {
        finalResponse = response;
        console.log(`[Orchestrator] Step ${step.id} got response on attempt ${attempts}`);
        break;
      }

      console.log(`[Orchestrator] Step ${step.id} attempt ${attempts} - no text, retrying...`);

      // If no response after max attempts, break
      if (attempts >= maxAttempts) {
        console.warn(`[Orchestrator] Step ${step.id} failed to get response after ${maxAttempts} attempts`);
        break;
      }
    }

    const latencyMs = Date.now() - startTime;

    console.log(`[Orchestrator] Step ${step.id} completed in ${latencyMs}ms`);
    console.log(`[Orchestrator] Response: ${finalResponse.slice(0, 200)}...`);

    return {
      stepId: step.id,
      success: finalResponse.length > 0,
      output: finalResponse,
      toolsCalled: [], // TODO: Extract from agent response
      latencyMs,
    };
  } catch (error: any) {
    const latencyMs = Date.now() - startTime;
    console.error(`[Orchestrator] Step ${step.id} failed:`, error.message);

    return {
      stepId: step.id,
      success: false,
      output: null,
      error: error.message,
      toolsCalled: [],
      latencyMs,
    };
  }
}

/**
 * Execute an execution plan across multiple sub-agents
 */
export async function executeOrchestration(
  ctx: ActionCtx,
  plan: ExecutionPlan,
  userQuery: string,
  context: AgentContext
): Promise<OrchestrationResult> {
  const startTime = Date.now();
  console.log(`[Orchestrator] Starting orchestration for: "${userQuery}"`);
  console.log(`[Orchestrator] Plan has ${plan.steps.length} steps`);

  const stepResults: StepResult[] = [];
  const previousResults: Record<string, any> = {};
  const allToolsCalled: string[] = [];

  // Get steps in dependency order
  const orderedSteps = getExecutionOrder(plan);

  // Execute steps sequentially (respecting dependencies)
  for (const step of orderedSteps) {
    const result = await executeStep(ctx, step, context, previousResults);
    stepResults.push(result);
    
    if (result.success) {
      previousResults[step.id] = result.output;
    }
    
    allToolsCalled.push(...result.toolsCalled);

    // If a critical step fails, we might want to stop
    // For now, continue to gather all results
  }

  // Aggregate final response
  const successfulResults = stepResults.filter(r => r.success);
  const failedResults = stepResults.filter(r => !r.success);

  let finalResponse = "";
  
  if (successfulResults.length === 0) {
    finalResponse = "I encountered errors while processing your request:\n" +
      failedResults.map(r => `- ${r.error}`).join("\n");
  } else if (successfulResults.length === 1) {
    // Single step - use its output directly
    finalResponse = successfulResults[0].output;
  } else {
    // Multiple steps - combine outputs
    finalResponse = successfulResults
      .map((r, i) => `Step ${i + 1}: ${r.output}`)
      .join("\n\n");
  }

  const totalLatencyMs = Date.now() - startTime;

  console.log(`[Orchestrator] Orchestration completed in ${totalLatencyMs}ms`);
  console.log(`[Orchestrator] Success: ${successfulResults.length}/${stepResults.length} steps`);

  return {
    success: successfulResults.length > 0,
    finalResponse,
    steps: stepResults,
    totalLatencyMs,
    toolsCalled: allToolsCalled,
  };
}

/**
 * Execute a simple query with a single sub-agent (no orchestration)
 */
export async function executeSimple(
  ctx: ActionCtx,
  userQuery: string,
  domain: AgentDomain,
  context: AgentContext
): Promise<OrchestrationResult> {
  const startTime = Date.now();
  console.log(`[Orchestrator] Executing simple query with ${domain} agent: "${userQuery}"`);

  // Select appropriate sub-agent
  let agent;
  switch (domain) {
    case "document":
      agent = createDocumentAgent("gpt-5-mini");
      break;
    case "media":
      agent = createMediaAgent("gpt-5-mini");
      break;
    case "task":
      agent = createTaskAgent("gpt-5-mini");
      break;
    case "event":
      agent = createEventAgent("gpt-5-mini");
      break;
    case "web":
      agent = createWebAgent("gpt-5-mini");
      break;
    default:
      agent = createDocumentAgent("gpt-5-mini");
  }

  try {
    // Create thread
    const { threadId } = await agent.createThread(ctx, {});

    // Inject userId into context for evaluation
    if (context.userId) {
      (ctx as any).evaluationUserId = context.userId;
    }

    // Execute - use streamText and await full result
    let finalResponse = "";
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      const result = await agent.streamText(ctx, { threadId }, { prompt: userQuery });
      const response = await result.text;
      attempts++;

      if (response && response.trim().length > 0) {
        finalResponse = response;
        console.log(`[Orchestrator] Simple execution got response on attempt ${attempts}`);
        break;
      }

      console.log(`[Orchestrator] Simple execution attempt ${attempts} - no text, retrying...`);

      // If no response after max attempts, break
      if (attempts >= maxAttempts) {
        console.warn(`[Orchestrator] Simple execution failed to get response after ${maxAttempts} attempts`);
        break;
      }
    }

    const latencyMs = Date.now() - startTime;

    console.log(`[Orchestrator] Simple execution completed in ${latencyMs}ms`);

    return {
      success: finalResponse.length > 0,
      finalResponse,
      steps: [{
        stepId: "simple-1",
        success: finalResponse.length > 0,
        output: finalResponse,
        toolsCalled: [],
        latencyMs,
      }],
      totalLatencyMs: latencyMs,
      toolsCalled: [],
    };
  } catch (error: any) {
    const latencyMs = Date.now() - startTime;
    console.error(`[Orchestrator] Simple execution failed:`, error.message);

    return {
      success: false,
      finalResponse: `Error: ${error.message}`,
      steps: [{
        stepId: "simple-1",
        success: false,
        output: null,
        error: error.message,
        toolsCalled: [],
        latencyMs,
      }],
      totalLatencyMs: latencyMs,
      toolsCalled: [],
    };
  }
}

