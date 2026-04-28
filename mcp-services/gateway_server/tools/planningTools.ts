/**
 * Planning tools — create and manage task plans via the Convex dispatcher.
 * Ported from core_agent_server/tools/planningTools.ts.
 */

import { callGateway } from "../convexClient.js";
import type { McpTool } from "./researchTools.js";

export const planningTools: McpTool[] = [
  {
    name: "createPlan",
    description:
      "Create an explicit task plan with steps marked as pending/in_progress/completed.",
    inputSchema: {
      type: "object",
      properties: {
        goal: {
          type: "string",
          description: "The high-level goal to accomplish",
        },
        steps: {
          type: "array",
          description: "List of steps to accomplish the goal",
          items: {
            type: "object",
            properties: {
              step: { type: "string", description: "Description of the step" },
              status: {
                type: "string",
                enum: ["pending", "in_progress", "completed"],
                description: "Current status of the step",
              },
              assignedAgent: {
                type: "string",
                description: "Which agent is responsible (optional)",
              },
              notes: {
                type: "string",
                description: "Additional notes (optional)",
              },
            },
            required: ["step", "status"],
          },
        },
      },
      required: ["goal", "steps"],
    },
    handler: async (args) => {
      const { goal, steps } = args;
      if (!goal || !steps || steps.length === 0) {
        throw new Error("Goal and steps are required");
      }

      const planId = `plan_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      const now = new Date().toISOString();

      await callGateway("createPlan", {
        plan: { id: planId, goal, steps, createdAt: now, updatedAt: now },
      });

      const markdown =
        `# Task Plan: ${goal}\n\nCreated: ${now}\n\n## Steps\n\n` +
        steps
          .map((s: any, i: number) => {
            const cb =
              s.status === "completed"
                ? "x"
                : s.status === "in_progress"
                  ? "/"
                  : " ";
            const agent = s.assignedAgent ? ` (${s.assignedAgent})` : "";
            const notes = s.notes ? `\n   - ${s.notes}` : "";
            return `${i + 1}. [${cb}] ${s.step}${agent}${notes}`;
          })
          .join("\n");

      return {
        success: true,
        planId,
        message: `Created task plan with ${steps.length} steps`,
        markdown,
      };
    },
  },
  {
    name: "updatePlanStep",
    description:
      "Update the status or notes of a specific step in a task plan.",
    inputSchema: {
      type: "object",
      properties: {
        planId: { type: "string", description: "ID of the plan to update" },
        stepIndex: {
          type: "number",
          description: "Index of the step to update (0-based)",
        },
        status: {
          type: "string",
          enum: ["pending", "in_progress", "completed"],
          description: "New status for the step (optional)",
        },
        notes: {
          type: "string",
          description: "New notes for the step (optional)",
        },
      },
      required: ["planId", "stepIndex"],
    },
    handler: async (args) => {
      const { planId, stepIndex, status, notes } = args;

      const fetched = (await callGateway("getPlan", { planId })) as any;
      const plan = fetched?.plan ?? fetched;
      if (!plan) throw new Error(`Plan not found: ${planId}`);

      if (stepIndex < 0 || stepIndex >= plan.steps.length) {
        throw new Error(`Invalid step index: ${stepIndex}`);
      }

      if (status) plan.steps[stepIndex].status = status;
      if (notes !== undefined) plan.steps[stepIndex].notes = notes;
      plan.updatedAt = new Date().toISOString();

      await callGateway("updatePlan", { planId, plan });

      return {
        success: true,
        message: `Updated step ${stepIndex + 1} in plan ${planId}`,
        step: plan.steps[stepIndex],
      };
    },
  },
  {
    name: "getPlan",
    description: "Retrieve a task plan by ID.",
    inputSchema: {
      type: "object",
      properties: {
        planId: { type: "string", description: "ID of the plan to retrieve" },
      },
      required: ["planId"],
    },
    handler: async (args) => {
      const result = (await callGateway("getPlan", {
        planId: args.planId,
      })) as any;
      const plan = result?.plan ?? result;
      if (!plan) throw new Error(`Plan not found: ${args.planId}`);
      return { success: true, plan };
    },
  },
];
