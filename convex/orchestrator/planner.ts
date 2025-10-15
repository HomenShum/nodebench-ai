/**
 * Task Planner
 * 
 * Decomposes complex queries into executable steps
 */

import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import type { ExecutionPlan, TaskStep, QueryClassification } from "./types";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Task step schema for structured output
 */
const TaskStepSchema = z.object({
  id: z.string().describe("Unique step identifier (step-1, step-2, etc.)"),
  domain: z.enum(["document", "media", "task", "event", "web", "general"]).describe("Agent domain for this step"),
  action: z.string().describe("Action to perform (e.g., 'find', 'create', 'update', 'analyze')"),
  description: z.string().describe("Human-readable description of what this step does"),
  dependencies: z.array(z.string()).describe("IDs of steps that must complete before this one"),
  args: z.record(z.any()).optional().describe("Arguments for the action"),
});

/**
 * Execution plan schema for structured output
 */
const ExecutionPlanSchema = z.object({
  steps: z.array(TaskStepSchema).describe("Ordered list of steps to execute"),
  reasoning: z.string().describe("Explanation of the plan"),
});

/**
 * Create an execution plan for a complex query
 */
export async function createExecutionPlan(
  userQuery: string,
  classification: QueryClassification
): Promise<ExecutionPlan> {
  console.log(`[Planner] Creating execution plan for: "${userQuery}"`);
  console.log(`[Planner] Classification:`, classification);

  const systemPrompt = `You are a task planning expert. Given a user query, decompose it into a sequence of executable steps.

Available agent domains:
- document: Find, read, create, update, analyze documents
- media: Search, analyze, list media files (images, videos)
- task: List, create, update tasks
- event: List, create calendar events
- web: Search the web, find online content

Rules:
1. Break complex queries into simple, atomic steps
2. Each step should use ONE domain and ONE action
3. Specify dependencies between steps (e.g., step-2 depends on step-1)
4. Be specific about what each step accomplishes
5. For workflows like "find, open, analyze, edit", create separate steps for each action
6. For comparisons, retrieve all items first, then compare
7. Keep steps focused and actionable

Example:
Query: "Find my revenue report, open it, and tell me what it's about"
Steps:
1. step-1: document/find - Find revenue report (no dependencies)
2. step-2: document/read - Read document content (depends on step-1)
3. step-3: document/analyze - Analyze and summarize (depends on step-2)`;

  const userPrompt = `User query: "${userQuery}"

Classification:
- Complexity: ${classification.complexity}
- Domains: ${classification.domains.join(", ")}
- Requires workflow: ${classification.requiresWorkflow}
- Estimated steps: ${classification.estimatedSteps}

Create an execution plan with clear, atomic steps.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: zodResponseFormat(ExecutionPlanSchema, "execution_plan"),
      temperature: 0.3,
    });

    const result = JSON.parse(completion.choices[0].message.content || "{}");
    
    console.log(`[Planner] Created plan with ${result.steps.length} steps`);
    console.log(`[Planner] Reasoning: ${result.reasoning}`);

    return {
      complexity: classification.complexity,
      steps: result.steps,
      requiresOrchestration: true,
      estimatedSteps: result.steps.length,
    };
  } catch (error) {
    console.error("[Planner] Failed to create execution plan:", error);
    
    // Fallback: Create simple single-step plan
    const fallbackStep: TaskStep = {
      id: "step-1",
      domain: classification.domains[0] || "general",
      action: "execute",
      description: userQuery,
      dependencies: [],
    };

    return {
      complexity: "simple",
      steps: [fallbackStep],
      requiresOrchestration: false,
      estimatedSteps: 1,
    };
  }
}

/**
 * Validate execution plan
 */
export function validatePlan(plan: ExecutionPlan): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const stepIds = new Set(plan.steps.map(s => s.id));

  // Check for duplicate step IDs
  if (stepIds.size !== plan.steps.length) {
    errors.push("Duplicate step IDs found");
  }

  // Check dependencies exist
  for (const step of plan.steps) {
    for (const depId of step.dependencies) {
      if (!stepIds.has(depId)) {
        errors.push(`Step ${step.id} depends on non-existent step ${depId}`);
      }
    }
  }

  // Check for circular dependencies (simple check)
  for (const step of plan.steps) {
    if (step.dependencies.includes(step.id)) {
      errors.push(`Step ${step.id} has circular dependency on itself`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get executable steps in dependency order
 */
export function getExecutionOrder(plan: ExecutionPlan): TaskStep[] {
  const steps = [...plan.steps];
  const executed = new Set<string>();
  const ordered: TaskStep[] = [];

  // Simple topological sort
  while (ordered.length < steps.length) {
    const ready = steps.filter(step => 
      !executed.has(step.id) &&
      step.dependencies.every(dep => executed.has(dep))
    );

    if (ready.length === 0) {
      // Circular dependency or error - just add remaining steps
      const remaining = steps.filter(s => !executed.has(s.id));
      ordered.push(...remaining);
      break;
    }

    for (const step of ready) {
      ordered.push(step);
      executed.add(step.id);
    }
  }

  return ordered;
}

