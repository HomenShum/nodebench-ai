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

  // GPT-5-mini fallback planner
  gpt5mini: async (_ctx: any, prompt: string) => {
    try {
      const OpenAI = (await import("openai")).default;
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error("Missing OPENAI_API_KEY");
      const client = new OpenAI({ apiKey });
      const sys = "You are an orchestrator that returns ONLY JSON per the schema. Plan small, safe steps. Use parallel groups when independent.";
      const completion: any = await (client as any).chat.completions.parse({
        model: "gpt-5-mini",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: prompt },
        ],
        response_format: zodResponseFormat(PlanSchema, "plan"),
      });
      const plan = completion?.choices?.[0]?.message?.parsed;
      if (plan && Array.isArray((plan as any).groups)) return planToProviderOutput(plan as any, prompt);
    } catch (e) {
      console.warn("[gpt5mini] GPT-5-mini planner failed; falling back", e);
    }
    // Fallback to heuristic if GPT-5-mini fails
    const fallback = makePlan({ taskSpec: { goal: prompt, type: "custom", constraints: { maxSteps: 6 } } as any });
    return planToProviderOutput(fallback, prompt);
  },

  // GLM 4.6 via OpenRouter (defaults to OPENROUTER_MODEL or GLM 4.6). Falls back gracefully.
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
      const model = process.env.OPENROUTER_MODEL || "z-ai/glm-4.6"; // Set OPENROUTER_MODEL to override GLM 4.6
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
      console.warn("[glm] GLM 4.6 planner failed; falling back", e);
    }
    // Fallback chain: GPT-5-mini → OpenAI → heuristic
    try {
      console.log("[glm] Trying GPT-5-mini fallback...");
      return await providers.gpt5mini(null, prompt);
    } catch (e) {
      console.warn("[glm] GPT-5-mini fallback failed, trying OpenAI", e);
    }
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
    overrideGraph: v.optional(v.any()),
  },
  returns: v.object({ timelineId: v.id("agentTimelines") }),
  handler: async (ctx, { timelineId, prompt, provider, overrideGraph }) => {
    const now = Date.now();

    let out: ProviderOutput;

    // If overrideGraph is provided, use it directly
    if (overrideGraph && overrideGraph.nodes && overrideGraph.edges) {
      // Convert the override graph to ProviderOutput format
      const suffix = Math.floor(Math.random() * 1e6).toString(36);
      const tasks: ProviderOutput["tasks"] = [];
      const links: ProviderOutput["links"] = [];

      // Create orchestrator task
      const rootId = `orchestrate-${suffix}`;
      tasks.push({
        id: rootId,
        parentId: null,
        name: `Orchestrator: ${prompt.slice(0, 80)}`,
        startOffsetMs: 0,
        durationMs: 10 * 60_000,
        agentType: "orchestrator",
        status: "running",
        icon: "🧠"
      });

      // Create tasks for each node
      overrideGraph.nodes.forEach((node: any, idx: number) => {
        const taskId = `task-${node.id}-${suffix}`;
        const agentType = node.kind === 'orchestrator' ? 'orchestrator' : (node.kind === 'eval' ? 'main' : 'leaf');
        tasks.push({
          id: taskId,
          parentId: rootId,
          name: node.label || node.id,
          startOffsetMs: idx * 15_000,
          durationMs: 60_000,
          agentType: agentType as any,
          status: "pending",
          icon: node.kind === 'custom' ? '🔧' : (node.kind === 'search' ? '🔍' : '📝')
        });

        // Link to orchestrator
        links.push({ sourceId: rootId, targetId: taskId, type: "e2e" });
      });

      // Create links for edges
      overrideGraph.edges.forEach((edge: any) => {
        const sourceTask = tasks.find(t => t.name.includes(edge.from));
        const targetTask = tasks.find(t => t.name.includes(edge.to));
        if (sourceTask && targetTask) {
          links.push({ sourceId: sourceTask.id, targetId: targetTask.id, type: "e2e" });
        }
      });

      out = {
        tasks,
        links,
        graph: overrideGraph
      };
    } else {
      // Use the planner to generate a plan
      const p = provider && providers[provider]
        ? provider
        : (process.env.OPENROUTER_API_KEY ? "grok" : (process.env.OPENAI_API_KEY ? "openai" : "heuristic"));
      out = await providers[p](ctx, prompt);
    }

    // 1) Apply the plan to the existing timeline (so UI renders immediately)
    await ctx.runMutation(apiAny.agentTimelines.applyPlan, {
      timelineId,
      baseStartMs: now,
      tasks: out.tasks,
      links: out.links,
    });

    // 2) Trigger orchestration to stream progress updates onto the SAME timeline
    try {
      // Build a self-adaptive bootstrap graph that can add tool nodes dynamically via an eval step.
      const toolCatalog = [
        { id: 'web.search', kind: 'search', label: 'Web Search (web.search)' },
        { id: 'web.fetch', kind: 'custom', label: 'Fetch URL (web.fetch)', tool: 'web.fetch' },
        { id: 'structured', kind: 'structured', label: 'Structured' },
        { id: 'code.exec', kind: 'code.exec', label: 'Code Execution' },
        { id: 'image.search', kind: 'custom', label: 'Image Search', tool: 'image.search' },
        { id: 'xray.classify', kind: 'custom', label: 'X-Ray Classification', tool: 'xray.classify' },
        { id: 'vision.multi', kind: 'custom', label: 'Vision Multi-Model', tool: 'vision.multi' },
      ];

      const bootstrapGraph = {
        nodes: [
          {
            id: 'bootstrap_eval',
            kind: 'eval',
            label: 'Decide and compose tools',
            // The orchestrator will substitute {{topic}} and allow this eval to add nodes/edges.
            prompt: `Topic: {{topic}}

Available tools (id, kind):\n${toolCatalog.map(t => `- ${t.id} (${t.kind})`).join('\n')}

Instructions:
- Mandatory wiring rule: Every node AFTER the first MUST reference an upstream output using {{channel:<nodeId>.last}} in its prompt or payload. If you cannot wire data via channel refs, set pass=false and propose the missing node.
- For custom kinds, ALWAYS set 'tool' and a JSON 'payload'. Examples:
  - web.fetch: { url: "{{channel:search_prices.last}}", maxBytes: 500000 }
  - code.exec: { prompt: "Compute 7-day SMA over last 30 days", context: { csv: "{{channel:fetch_prices.last}}" } }
- Use stable ids when relevant: search_prices, fetch_prices, compute_sma7, search_news, summarize_news, correlate.

- If the topic involves STOCK PRICES / MOVING AVERAGES:
  1) Add a search node to locate a reliable source of recent daily prices (e.g., "GOOGL historical stock prices last 30 days daily closing prices").
  2) Prefer adding a custom web.fetch node to retrieve raw CSV or page content from a specific URL found by search.
  3) Add a code.exec node that parses the CSV/text into rows {date, close}, filters to the last 30 calendar days, and computes a 7-day simple moving average (SMA7). Return JSON: { data: [{ date, close, sma7 }...], summary: string }.
  4) Add a second search node for news in the same 30-day window (e.g., "Google OR Alphabet stock news last 30 days").
  5) Add a structured node to summarize the top news items with dates, headlines, impact, and source URLs.
  6) Optionally add a final structured node to correlate the largest price moves with news events by date.

- If the topic involves IMAGES/VISION (e.g., x-ray, classify):
  - Add image.search → xray.classify (or vision.multi) → structured report with citations.

Return pass=false with addNodes (id, kind, label, and for custom kinds set 'tool' and 'payload') and addEdges that wire the execution order.`,
          }
        ],
        edges: [],
      } as any;

      await ctx.runAction(apiAny.agents.orchestrate.runOnTimeline, {
        timelineId,
        taskSpec: {
          goal: prompt,
          type: 'ad-hoc',
          graph: bootstrapGraph,
        },
      });
    } catch (e) {
      console.error("orchestrate.runOnTimeline failed", e);
    }

    return { timelineId };
  },
});

