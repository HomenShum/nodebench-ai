/**
 * Planning Tools for Deep Agents 2.0
 * 
 * These tools enable explicit planning by creating and managing task plans
 * as tool-accessible documents. This is Pillar 1 of Deep Agents architecture.
 */

const CONVEX_BASE_URL = process.env.CONVEX_BASE_URL;
const CONVEX_ADMIN_KEY = process.env.CONVEX_ADMIN_KEY;
const MCP_SECRET = process.env.MCP_SECRET;

type PlanStep = {
  step: string;
  status: "pending" | "in_progress" | "completed";
  assignedAgent?: string;
  notes?: string;
};

type Plan = {
  id: string;
  goal: string;
  steps: PlanStep[];
  createdAt: string;
  updatedAt: string;
};

async function callConvex(method: "GET" | "POST" | "PATCH" | "DELETE", path: string, body?: any) {
  if (!CONVEX_BASE_URL) {
    throw new Error("Missing CONVEX_BASE_URL for MCP storage");
  }
  if (!MCP_SECRET) {
    throw new Error("Missing MCP_SECRET for MCP storage");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-mcp-secret": MCP_SECRET,
  };

  // Optional: allow admin key auth as well (not required for mcp-3 endpoints)
  if (CONVEX_ADMIN_KEY) {
    headers["Authorization"] = `Bearer ${CONVEX_ADMIN_KEY}`;
  }

  const res = await fetch(`${CONVEX_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Convex error ${res.status}: ${text}`);
  }
  return await res.json();
}

export const planningTools = [
  {
    name: "createPlan",
    description: "Create an explicit task plan as a markdown document with steps marked as pending/in_progress/completed",
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
                description: "Which agent is responsible for this step (optional)",
              },
              notes: {
                type: "string",
                description: "Additional notes about the step (optional)",
              },
            },
            required: ["step", "status"],
          },
        },
      },
      required: ["goal", "steps"],
    },
    handler: async (args: any) => {
      const { goal, steps } = args;

      if (!goal || !steps || steps.length === 0) {
        throw new Error("Goal and steps are required");
      }

      // Generate plan ID
      const planId = `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const plan: Plan = {
        id: planId,
        goal,
        steps,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Store plan in Convex
      await callConvex("POST", "/api/mcpPlans", plan);

      // Generate markdown representation
      const markdown = `# Task Plan: ${goal}\n\n` +
        `Created: ${plan.createdAt}\n\n` +
        `## Steps\n\n` +
        steps.map((s: any, i: number) => {
          const checkbox = s.status === "completed" ? "x" : s.status === "in_progress" ? "/" : " ";
          const agent = s.assignedAgent ? ` (${s.assignedAgent})` : "";
          const notes = s.notes ? `\n   - ${s.notes}` : "";
          return `${i + 1}. [${checkbox}] ${s.step}${agent}${notes}`;
        }).join("\n");

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
    description: "Update the status or notes of a specific step in a task plan",
    inputSchema: {
      type: "object",
      properties: {
        planId: {
          type: "string",
          description: "ID of the plan to update",
        },
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
    handler: async (args: any) => {
      const { planId, stepIndex, status, notes } = args;

      const fetched = await callConvex("GET", `/api/mcpPlans/${planId}`) as any;
      const plan = (fetched?.plan ?? null) as Plan | null;
      if (!plan) throw new Error(`Plan not found: ${planId}`);

      if (stepIndex < 0 || stepIndex >= plan.steps.length) {
        throw new Error(`Invalid step index: ${stepIndex}`);
      }

      // Update step
      if (status) {
        plan.steps[stepIndex].status = status;
      }
      if (notes !== undefined) {
        plan.steps[stepIndex].notes = notes;
      }

      plan.updatedAt = new Date().toISOString();
      plan.steps[stepIndex] = plan.steps[stepIndex];
      await callConvex("PATCH", `/api/mcpPlans/${planId}`, { steps: plan.steps, updatedAt: plan.updatedAt });

      return {
        success: true,
        message: `Updated step ${stepIndex + 1} in plan ${planId}`,
        step: plan.steps[stepIndex],
      };
    },
  },
  {
    name: "getPlan",
    description: "Retrieve a task plan by ID",
    inputSchema: {
      type: "object",
      properties: {
        planId: {
          type: "string",
          description: "ID of the plan to retrieve",
        },
      },
      required: ["planId"],
    },
    handler: async (args: any) => {
      const { planId } = args;

      const fetched = await callConvex("GET", `/api/mcpPlans/${planId}`) as any;
      const plan = (fetched?.plan ?? null) as Plan | null;
      if (!plan) throw new Error(`Plan not found: ${planId}`);

      return {
        success: true,
        plan,
      };
    },
  },
];
