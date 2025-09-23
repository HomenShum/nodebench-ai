"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api } from "../_generated/api";
const apiAny = api as any;

import type { Id } from "../_generated/dataModel";

// Import orchestrator from agents core (framework-agnostic module)
import { orchestrate } from "../../agents/core/orchestrator";
import { InMemoryStore } from "../../agents/core/memory";
import { Trace } from "../../agents/core/trace";
import { executePlan, type ToolsRegistry } from "../../agents/core/execute";
import { makePlan } from "../../agents/core/plan";
import { answerTool } from "../../agents/tools/openai";
import { structuredTool } from "../../agents/tools/structured";
import { searchTool } from "../../agents/tools/search";
import { linkupCompanyProfile, linkupPersonProfile } from "../../agents/services/linkup";
import { fetchUrlTool } from "../../agents/tools/fetchUrl";

// Instantiate tool factories here to satisfy ToolsRegistry types
const demoRoot = `${process.cwd()}/agents/app/demo_scenarios`;
const tools: ToolsRegistry = {
  "web.search": searchTool({ root: demoRoot }),
  "web.fetch": fetchUrlTool(),
  "answer": answerTool,
  "structured": structuredTool,
  // Linkup profile tools (optional, used by plans that ask for profiles)
  "get_person_profile": async (args: { full_name_and_company: string }) => {
    return await linkupPersonProfile(String(args?.full_name_and_company || ""));
  },
  "get_company_profile": async (args: { company_name: string }) => {
    return await linkupCompanyProfile(String(args?.company_name || ""));
  },
};

async function getSafeUserId(ctx: any): Promise<Id<"users">> {
  const rawUserId = await getAuthUserId(ctx);
  if (!rawUserId) throw new Error("Not authenticated");
  return rawUserId as Id<"users">;
}

export const run = action({
  args: {
    documentId: v.id("documents"),
    name: v.optional(v.string()),
    taskSpec: v.object({
      goal: v.string(),
      type: v.string(),
      topic: v.optional(v.string()),
      constraints: v.optional(v.object({ maxSteps: v.optional(v.number()) })),
      planHints: v.optional(v.array(v.string())),
      graph: v.optional(v.object({
        nodes: v.array(v.object({ id: v.string(), kind: v.string(), label: v.optional(v.string()), prompt: v.optional(v.string()) })),
        edges: v.array(v.object({ from: v.string(), to: v.string() })),
      })),
    }),
  },
  returns: v.object({ timelineId: v.id("agentTimelines"), result: v.string() }),
  handler: async (ctx, { documentId, name, taskSpec }) => {
    const userId = await getSafeUserId(ctx);
    const startedAt = Date.now();

    // Ensure timeline exists for the document
    const timelineId = await ctx.runMutation(apiAny.agentTimelines.createForDocument, {
      documentId,
      name: name ?? "Orchestration",
    });

    // Prefer: if graph is provided, apply plan first to get DB task ids, then stream updates while running
    const now = Date.now();
    const graph = (taskSpec as any).graph as { nodes?: Array<{ id: string; label?: string }>; edges?: Array<{ from: string; to: string }> } | undefined;

    let result = "";
    let metrics: Record<string, any> | undefined;

    if (graph?.nodes && graph.nodes.length) {
      const tasks = [
        { id: "root", parentId: null, name: name ?? "Orchestration", startOffsetMs: 0, durationMs: 20000, agentType: "orchestrator" },
        ...graph.nodes.map((n, i) => ({ id: n.id, parentId: "root", name: n.label || n.id, startOffsetMs: i * 20000, durationMs: 20000, agentType: "leaf" })),
      ];
      const links = [
        ...graph.edges!.map((e) => ({ sourceId: e.from, targetId: e.to })),
      ];
      await ctx.runMutation(apiAny.agentTimelines.applyPlan, { timelineId, baseStartMs: now, tasks: tasks as any, links: links as any });

      // Build nodeId -> taskId map for streaming updates
      const tl = await ctx.runQuery(apiAny.agentTimelines.getByTimelineId, { timelineId });
      const mapByName: Record<string, any> = {};
      if (tl) { for (const t of tl.tasks) mapByName[t.name] = t; }

      const base = new Trace();
      const trace = {
        info: async (event: string, data?: any) => {
          base.info(event, data);
          if (event === 'node.start') {
            const nodeId = data?.id as string | undefined;
            if (nodeId) {
              const taskName = graph.nodes!.find((n) => n.id === nodeId)?.label || nodeId;
              const task = mapByName[taskName];
              if (task?._id) await ctx.runMutation(apiAny.agentTimelines.updateTaskMetrics, { taskId: task._id, status: 'running', startedAtMs: Date.now() } as any);
            }
          } else if (event === 'node.end') {
            const nodeId = data?.id as string | undefined;
            const elapsedMs = data?.elapsedMs as number | undefined;
            if (nodeId) {
              const taskName = graph.nodes!.find((n) => n.id === nodeId)?.label || nodeId;
              const task = mapByName[taskName];
              if (task?._id) await ctx.runMutation(apiAny.agentTimelines.updateTaskMetrics, { taskId: task._id, status: 'complete', elapsedMs } as any);
            }
          }
        },
        warn: (event: string, data?: any) => base.warn(event, data),
        error: (event: string, data?: any) => base.error(event, data),
        count: () => base.count(),
      } as any;

      const data = {};
      const out = await orchestrate({ taskSpec: taskSpec as any, tools, trace: trace as any, data });
      result = out.result; metrics = out.metrics;

      // After run, write final token metrics if available
      if (metrics && tl) {
        for (const [nodeId, m] of Object.entries(metrics)) {
          const taskName = graph.nodes!.find((n) => n.id === nodeId)?.label || nodeId;
          const task = mapByName[taskName];
          if (task?._id) {
            await ctx.runMutation(apiAny.agentTimelines.updateTaskMetrics, {
              taskId: task._id,
              inputTokens: (m as any).inputTokens as number | undefined,
              outputTokens: (m as any).outputTokens as number | undefined,
            } as any);
          }
        }
      }
    } else {
      // No graph: run then write a simple snapshot
      const base = new Trace();
      const data = {};
      const out = await orchestrate({ taskSpec: taskSpec as any, tools, trace: base, data });
      result = out.result; metrics = out.metrics;
      await ctx.runMutation(apiAny.agentTimelines.applyPlan, {
        timelineId,
        baseStartMs: now,
        tasks: [
          { id: "root", parentId: null, name: "Orchestration", startOffsetMs: 0, durationMs: 20000, agentType: "orchestrator" },
          { id: "research", parentId: "root", name: "Web Researcher", startOffsetMs: 0, durationMs: 30000, agentType: "leaf" },
          { id: "kb", parentId: "root", name: "KB Retriever", startOffsetMs: 30000, durationMs: 20000, agentType: "leaf" },
          { id: "outline", parentId: "root", name: "Outline Generator", startOffsetMs: 50000, durationMs: 20000, agentType: "leaf" },
          { id: "edit", parentId: "root", name: "Editor", startOffsetMs: 70000, durationMs: 20000, agentType: "leaf" },
        ],
        links: [
          { sourceId: "root", targetId: "research" },
          { sourceId: "root", targetId: "kb" },
          { sourceId: "root", targetId: "outline" },
          { sourceId: "root", targetId: "edit" },
          { sourceId: "research", targetId: "outline" },
          { sourceId: "kb", targetId: "outline" },
          { sourceId: "outline", targetId: "edit" },
        ],
      } as any);
    }


    // Persist latest run result for header readout
    try {
      await ctx.runMutation(apiAny.agentTimelines.setLatestRun, {
        timelineId,
        input: String((taskSpec as any)?.goal ?? ""),
        output: String(result ?? ""),
      } as any);
    } catch (e) {
      console.warn("setLatestRun failed", e);
    }

    // Also append to run history
    try {
      let totalInputTokens = 0, totalOutputTokens = 0;
      if (metrics && typeof metrics === 'object') {
        for (const m of Object.values(metrics)) {
          const mi: any = m;
          if (typeof mi?.inputTokens === 'number') totalInputTokens += mi.inputTokens;
          if (typeof mi?.outputTokens === 'number') totalOutputTokens += mi.outputTokens;
        }
      }
      const elapsedMs = Math.max(0, Date.now() - startedAt);
      await ctx.runMutation(apiAny.agentTimelines.addRun, {
        timelineId,
        input: String((taskSpec as any)?.goal ?? ""),
        output: String(result ?? ""),
        meta: { totalInputTokens, totalOutputTokens, elapsedMs },
      } as any);
    } catch (e) {
      console.warn("addRun failed", e);
    }

    return { timelineId, result } as any;
  },
});

export const runOnTimeline = action({
  args: {
    timelineId: v.id("agentTimelines"),
    taskSpec: v.object({
      goal: v.string(),
      type: v.string(),
      topic: v.optional(v.string()),
      constraints: v.optional(v.object({ maxSteps: v.optional(v.number()) })),
      planHints: v.optional(v.array(v.string())),
      graph: v.optional(v.object({
        nodes: v.array(v.object({ id: v.string(), kind: v.string(), label: v.optional(v.string()), prompt: v.optional(v.string()) })),
        edges: v.array(v.object({ from: v.string(), to: v.string() })),
      })),
    }),
  },
  returns: v.object({ timelineId: v.id("agentTimelines"), result: v.string(), retryCount: v.optional(v.number()) }),
  handler: async (ctx, { timelineId, taskSpec }) => {
    const startedAt = Date.now();
    // Use existing timeline; assume plan has already been applied to it
    const tl = await ctx.runQuery(apiAny.agentTimelines.getByTimelineId, { timelineId });
    if (!tl) throw new Error("Timeline not found");

    const graph = (taskSpec as any).graph as { nodes?: Array<{ id: string; label?: string; kind?: string }>; edges?: Array<{ from: string; to: string }> } | undefined;

    // Build nodeId/name -> task map for streaming updates and dynamic spawn
    const mapByName: Record<string, any> = {};
    const nodeToTaskId: Record<string, string> = {};
    for (const t of tl.tasks) mapByName[t.name] = t;
    if (graph?.nodes) {
      for (const n of graph.nodes) {
        const taskName = n.label || n.id;
        const task = mapByName[taskName];
        if (task?._id) nodeToTaskId[n.id] = String(task._id);
      }
    }
    const orchestrator = tl.tasks.find((t: any) => (t.agentType || "").toLowerCase() === "orchestrator") || tl.tasks[0];

    const baseStartMs = tl.baseStartMs || Date.now();
    const defaultDuration = 20000;

    const base = new Trace();
    let retryCount = 0;
    const trace = {
      info: async (event: string, data?: any) => {
        base.info(event, data);
        if (event === 'graph.extend') {
          const addNodes: Array<{ id: string; kind?: string; label?: string }> = Array.isArray(data?.addNodes) ? data.addNodes : [];
          const addEdges: Array<{ from: string; to: string }> = Array.isArray(data?.addEdges) ? data.addEdges : [];
          // Create tasks for new nodes
          for (const nn of addNodes) {
            if (nodeToTaskId[nn.id]) continue;
            const name = nn.label || nn.id;
            const agentType = (nn.kind === 'eval' ? 'main' : 'leaf') as 'main' | 'leaf';
            const startOffsetMs = Math.max(0, Date.now() - baseStartMs);
            const newId = await ctx.runMutation(apiAny.agentTimelines.addTask, {
              timelineId,
              parentId: orchestrator?._id,
              name,
              durationMs: defaultDuration,
              agentType,
              startOffsetMs,
              status: 'pending',
            } as any);
            nodeToTaskId[nn.id] = String(newId);
            mapByName[name] = { _id: newId, name, startOffsetMs, durationMs: defaultDuration, agentType } as any;
          }
          // Create links for new edges when possible
          for (const ee of addEdges) {
            const s = nodeToTaskId[ee.from];
            const t = nodeToTaskId[ee.to];
            if (s && t) {
              await ctx.runMutation(apiAny.agentTimelines.addLink, { timelineId, sourceTaskId: s, targetTaskId: t, type: 'e2e' } as any);
            }
          }
        } else if (event === 'node.start') {
          const nodeId = data?.id as string | undefined;
          if (nodeId) {
            let taskId = nodeToTaskId[nodeId];
            // If we haven't seen this node before (no graph.extend and no pre-applied plan), create a task on-the-fly
            if (!taskId) {
              const nid = String(nodeId).toLowerCase();
              const agentType = nid.includes('orchestrate') ? 'orchestrator' : (nid.includes('main') ? 'main' : 'leaf');
              const topic = (taskSpec as any)?.topic as string | undefined;
              const goal = (taskSpec as any)?.goal as string | undefined;
              const prettyName = `${agentType.charAt(0).toUpperCase() + agentType.slice(1)}${topic ? `: ${topic}` : (goal ? `: ${goal}` : '')}`.trim();
              const startOffsetMs = Math.max(0, Date.now() - baseStartMs);
              const parentId = agentType === 'orchestrator' ? undefined : (orchestrator?._id as any);
              const newId = await ctx.runMutation(apiAny.agentTimelines.addTask, {
                timelineId,
                parentId,
                name: prettyName || nodeId,
                durationMs: defaultDuration,
                agentType: agentType as any,
                startOffsetMs,
                status: 'pending',
              } as any);
              taskId = String(newId);
              nodeToTaskId[nodeId] = taskId;
              mapByName[prettyName || nodeId] = { _id: newId, name: prettyName || nodeId, startOffsetMs, durationMs: defaultDuration, agentType } as any;
            }
            await ctx.runMutation(apiAny.agentTimelines.updateTaskMetrics, { taskId, status: 'running', startedAtMs: Date.now() } as any);
          }
        } else if (event === 'node.end') {
          const nodeId = data?.id as string | undefined;
          const elapsedMs = data?.elapsedMs as number | undefined;
          if (nodeId) {
            let taskId = nodeToTaskId[nodeId];
            if (!taskId) {
              const nid = String(nodeId).toLowerCase();
              const agentType = nid.includes('orchestrate') ? 'orchestrator' : (nid.includes('main') ? 'main' : 'leaf');
              const topic = (taskSpec as any)?.topic as string | undefined;
              const goal = (taskSpec as any)?.goal as string | undefined;
              const prettyName = `${agentType.charAt(0).toUpperCase() + agentType.slice(1)}${topic ? `: ${topic}` : (goal ? `: ${goal}` : '')}`.trim();
              const startOffsetMs = Math.max(0, Date.now() - baseStartMs);
              const parentId = agentType === 'orchestrator' ? undefined : (orchestrator?._id as any);
              const newId = await ctx.runMutation(apiAny.agentTimelines.addTask, {
                timelineId,
                parentId,
                name: prettyName || nodeId,
                durationMs: defaultDuration,
                agentType: agentType as any,
                startOffsetMs,
                status: 'pending',
              } as any);
              taskId = String(newId);
              nodeToTaskId[nodeId] = taskId;
              mapByName[prettyName || nodeId] = { _id: newId, name: prettyName || nodeId, startOffsetMs, durationMs: defaultDuration, agentType } as any;
            }
            await ctx.runMutation(apiAny.agentTimelines.updateTaskMetrics, { taskId, status: 'complete', elapsedMs } as any);
          }
        }
      },
      warn: (event: string, data?: any) => {
        if (event === 'openai.completion.retry') retryCount++;
        base.warn(event, data);
      },
      error: (event: string, data?: any) => base.error(event, data),
      count: () => base.count(),
    } as any;

    const data = {};
    const out = await orchestrate({ taskSpec: taskSpec as any, tools, trace: trace as any, data });
    const result = out.result;

    // Optional: write token metrics if present
    const metrics = out.metrics as Record<string, any> | undefined;
    if (metrics && graph?.nodes) {
      for (const [nodeId, m] of Object.entries(metrics)) {

        const taskName = graph.nodes.find((n) => n.id === nodeId)?.label || nodeId;
        const task = mapByName[taskName];
        if (task?._id) {
          await ctx.runMutation(apiAny.agentTimelines.updateTaskMetrics, {
            taskId: task._id,
            inputTokens: (m as any).inputTokens as number | undefined,
            outputTokens: (m as any).outputTokens as number | undefined,
          } as any);
        }
      }
    }

    // Persist latest run result for header readout
    try {
      await ctx.runMutation(apiAny.agentTimelines.setLatestRun, {
        timelineId,
        input: String((taskSpec as any)?.goal ?? ""),
        output: String(result ?? ""),
      } as any);
    } catch (e) {
      console.warn("setLatestRun failed", e);
    }

    // Also append to run history
    try {
      let totalInputTokens = 0, totalOutputTokens = 0;
      const mrec = out.metrics as Record<string, any> | undefined;
      if (mrec && typeof mrec === 'object') {
        for (const m of Object.values(mrec)) {
          const mi: any = m;
          if (typeof mi?.inputTokens === 'number') totalInputTokens += mi.inputTokens;
          if (typeof mi?.outputTokens === 'number') totalOutputTokens += mi.outputTokens;
        }
      }
      const elapsedMs = Math.max(0, Date.now() - startedAt);
      await ctx.runMutation(apiAny.agentTimelines.addRun, {
        timelineId,
        input: String((taskSpec as any)?.goal ?? ""),
        output: String(result ?? ""),
        retryCount,
        meta: { totalInputTokens, totalOutputTokens, elapsedMs },
      } as any);
    } catch (e) {
      console.warn("addRun failed", e);
    }

    return { timelineId, result, retryCount } as any;
  },
});

