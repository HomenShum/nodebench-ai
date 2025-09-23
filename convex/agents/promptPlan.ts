"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { tryGenerateStructuredPlan } from "./lib/planningGen";
import { makePlan, type Plan as CorePlan } from "../../agents/core/plan";
import { PlanSchema } from "./lib/planning";
import { zodResponseFormat } from "openai/helpers/zod";

const apiAny = api as any;

type ProviderOutput = {
  tasks: Array<{ id: string; parentId: string | null; name: string; startOffsetMs: number; durationMs: number; agentType: "orchestrator" | "main" | "leaf"; status?: "pending" | "running" | "complete" | "paused"; icon?: string; color?: string }>;
  links: Array<{ sourceId: string; targetId: string; type?: string }>;
  graph: { nodes: Array<{ id: string; kind: string; label: string }>; edges: Array<{ from: string; to: string }> };
};

function planToProviderOutput(plan: CorePlan, prompt: string): ProviderOutput {
  const safe = prompt.trim().slice(0, 80);
  const suffix = Math.floor(Math.random() * 1e6).toString(36);
  const rootId = `orchestrate-${suffix}`;
  const tasks: ProviderOutput["tasks"] = [
    { id: rootId, parentId: null, name: `Orchestrator: ${safe}`.trim(), startOffsetMs: 0, durationMs: 10 * 60_000, agentType: "orchestrator", status: "running", icon: "🧠" },
  ];
  const links: ProviderOutput["links"] = [];
  const graphNodes: Array<{ id: string; kind: string; label: string }> = [
    { id: rootId, kind: "orchestrator", label: `Orchestrator: ${safe}`.trim() },
  ];
  const graphEdges: Array<{ from: string; to: string }> = [];

  const groupBaseDurMs = Math.max(30_000, Math.floor((10 * 60_000) / Math.max(1, plan.groups.length)));

  plan.groups.forEach((group, gi) => {
    const mainId = `main-${gi}-${suffix}`;
    const mainName = group?.[0]?.label ? `Main: ${String(group[0].label)}` : `Main Group ${gi + 1}`;
    const mainStart = Math.min(gi * 15_000, 9 * 60_000);
    const mainDur = Math.max(45_000, groupBaseDurMs);
    tasks.push({ id: mainId, parentId: rootId, name: mainName, startOffsetMs: mainStart, durationMs: mainDur, agentType: "main", status: "running", icon: "👤" });
    links.push({ sourceId: rootId, targetId: mainId, type: "e2e" });
    graphNodes.push({ id: mainId, kind: "main", label: mainName });
    graphEdges.push({ from: rootId, to: mainId });

    group.forEach((step, si) => {
      const leafId = `leaf-${gi}-${si}-${suffix}`;
      const label = step.label || step.kind;
      const leafName = `Leaf: ${label}`;
      const base = mainStart + si * 10_000;
      const kind = String(step.kind);
      const dur = kind.includes("search") ? 60_000 : kind.includes("fetch") ? 30_000 : kind.includes("edit") ? 90_000 : 45_000;
      tasks.push({ id: leafId, parentId: mainId, name: leafName, startOffsetMs: base, durationMs: dur, agentType: "leaf", status: "pending", icon: "🔗" });
      links.push({ sourceId: mainId, targetId: leafId, type: "e2e" });
      graphNodes.push({ id: leafId, kind: "leaf", label: leafName });
      graphEdges.push({ from: mainId, to: leafId });
    });
  });

  return { tasks, links, graph: { nodes: graphNodes, edges: graphEdges } };
}

const providers: Record<string, (ctx: any, prompt: string) => Promise<ProviderOutput>> = {
  // Heuristic planner (no external API); maps steps to main/leaf agents
  heuristic: async (_ctx: any, prompt: string) => {
    const plan = makePlan({ taskSpec: { goal: prompt, type: "custom", constraints: { maxSteps: 6 } } as any });
    return planToProviderOutput(plan, prompt);
  },

  // OpenAI-based structured planner
  openai: async (ctx: any, prompt: string) => {
    const agentState: any = { context: { model: "openai", message: prompt } };
    const plan = await tryGenerateStructuredPlan(ctx, agentState);
    if (plan && Array.isArray((plan as any).groups)) return planToProviderOutput(plan as any, prompt);
    // Fallback to heuristic if structured fails
    const fallback = makePlan({ taskSpec: { goal: prompt, type: "custom", constraints: { maxSteps: 6 } } as any });
    return planToProviderOutput(fallback, prompt);
  },

  // Grok via OpenRouter (defaults to OPENROUTER_MODEL or a Grok ID). Falls back gracefully.
  grok: async (_ctx: any, prompt: string) => {
    try {
      const OpenAI = (await import("openai")).default;
      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey) throw new Error("Missing OPENROUTER_API_KEY");
      const client = new OpenAI({
        apiKey,
        baseURL: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
        defaultHeaders: {
          "HTTP-Referer": process.env.OPENROUTER_HTTP_REFERER || "http://localhost",
          "X-Title": process.env.OPENROUTER_X_TITLE || "Agent Dashboard",
        },
      });
      const model = process.env.OPENROUTER_MODEL || "x-ai/grok-4-fast:free"; // Set OPENROUTER_MODEL to your Grok 4 fast slug
      const sys = "You are an orchestrator that returns ONLY JSON per the schema. Plan small, safe steps. Use parallel groups when independent.";
      const completion: any = await (client as any).chat.completions.parse({
        model,
        messages: [
          { role: "system", content: sys },
          { role: "user", content: prompt },
        ],
        response_format: zodResponseFormat(PlanSchema, "plan"),
        temperature: 0.2,
      });
      const plan = completion?.choices?.[0]?.message?.parsed;
      if (plan && Array.isArray((plan as any).groups)) return planToProviderOutput(plan as any, prompt);
    } catch (e) {
      console.warn("[grok] OpenRouter planner failed; falling back", e);
    }
    // Fallback chain: OpenAI → heuristic
    try { return await providers.openai(null, prompt); } catch {}
    const fallback = makePlan({ taskSpec: { goal: prompt, type: "custom", constraints: { maxSteps: 6 } } as any });
    return planToProviderOutput(fallback, prompt);
  },
};

export const startFromPrompt = action({
  args: {
    timelineId: v.id("agentTimelines"),
    prompt: v.string(),
    provider: v.optional(v.union(v.literal("local"), v.literal("openai"), v.literal("grok"))),
  },
  returns: v.object({ timelineId: v.id("agentTimelines") }),
  handler: async (ctx, { timelineId, prompt, provider }) => {
    const now = Date.now();
    const p = provider && providers[provider]
      ? provider
      : (process.env.OPENROUTER_API_KEY ? "grok" : (process.env.OPENAI_API_KEY ? "openai" : "heuristic"));
    const out = await providers[p](ctx, prompt);

    // 1) Apply the plan to the existing timeline (so UI renders immediately)
    await ctx.runMutation(apiAny.agentTimelines.applyPlan, {
      timelineId,
      baseStartMs: now,
      tasks: out.tasks,
      links: out.links,
    });

    // 2) Trigger orchestration to stream progress updates onto the SAME timeline
    try {
      await ctx.runAction(apiAny.agents.orchestrate.runOnTimeline, {
        timelineId,
        taskSpec: {
          goal: prompt,
          type: "ad-hoc",
          graph: { nodes: out.graph.nodes, edges: out.graph.edges },
        },
      });
    } catch (e) {
      console.error("orchestrate.runOnTimeline failed", e);
    }

    return { timelineId };
  },
});

