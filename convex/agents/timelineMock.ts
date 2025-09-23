"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

import { structuredTool } from "../../agents/tools/structured";
import { searchTool } from "../../agents/tools/search";
import { mapStructuredToTimeline } from "../../agents/mappers/structuredToTimeline";
import { InMemoryStore } from "../../agents/core/memory";
import { Trace } from "../../agents/core/trace";

const apiAny = api as any;

// Shared helpers
async function ensureTimeline(ctx: any, documentId: Id<"documents">, name?: string) {
  const timelineId: Id<"agentTimelines"> = await ctx.runMutation(apiAny.agentTimelines.createForDocument, {
    documentId,
    name: name ?? "Generated Timeline",
  });
  return timelineId;
}

function msFromPct(pct: number, totalMs = 600000 /* 10 min */) {
  return Math.round((pct / 100) * totalMs);
}

// Option 2: Ask model for structured timeline, then apply to Convex
export const generateFromStructured = action({
  args: {
    documentId: v.id("documents"),
    name: v.optional(v.string()),
    prompt: v.string(),
    // Optional schema override
    schema: v.optional(v.any()),
  },
  returns: v.object({ timelineId: v.id("agentTimelines") }),
  handler: async (ctx, { documentId, name, prompt, schema }) => {
    const timelineId = await ensureTimeline(ctx, documentId, name);

    // Run structured tool
    const memory = new InMemoryStore();
    const trace = new Trace();
    const result = await structuredTool({
      prompt,
      schema: schema ?? defaultStructuredSchema,
      mode: "tool",
      name: "timeline_schema",
      description: "Produce agent hierarchy and timeline bars",
    }, { memory, trace } as any);

    // Map to tasks and links
    const now = Date.now();
    const agents = Array.isArray(result?.agents) ? result.agents : [];
    const timeline = Array.isArray(result?.timeline) ? result.timeline : [];

    const rootId = "root";
    const tasks: any[] = [
      { id: rootId, parentId: null, name: name ?? "Orchestration", startOffsetMs: 0, durationMs: 600000, agentType: "orchestrator" },
    ];

    for (const a of agents) {
      const agentType = a.type === "orchestrator" ? "orchestrator" : (a.type === "main" ? "main" : "leaf");
      tasks.push({
        id: a.id,
        parentId: a.parentId ?? rootId,
        name: a.name ?? a.id,
        startOffsetMs: 0,
        durationMs: 60000,
        agentType,
      });
    }

    const links: any[] = [];
    for (const a of agents) {
      if (a.parentId) links.push({ sourceId: a.parentId, targetId: a.id });
    }

    await ctx.runMutation(apiAny.agentTimelines.applyPlan, { timelineId, baseStartMs: now, tasks, links });

    // After tasks exist, map timeline bars to metrics per task
    const tl = await ctx.runQuery(apiAny.agentTimelines.getByTimelineId, { timelineId });
    const byId: Record<string, any> = {};
    if (tl) {
      for (const t of tl.tasks) byId[t.id || t.name] = t;
      for (const t of tl.tasks) byId[t.name] = t;
    }

    for (const bar of timeline) {
      const t = byId[bar.agentId];
      if (!t?._id) continue;
      const startOffsetMs = typeof bar.startOffsetMs === 'number' ? bar.startOffsetMs : 0;
      const durationMs = typeof bar.durationMs === 'number' ? bar.durationMs : 60000;
      const status = (bar.status === 'running' || bar.status === 'complete' || bar.status === 'paused') ? bar.status : 'pending';
      await ctx.runMutation(apiAny.agentTimelines.updateTaskMetrics, {
        taskId: t._id,
        status,
        startedAtMs: now + startOffsetMs,
        elapsedMs: durationMs,
      });
    }

    return { timelineId } as any;
  }
});

// Demo: research → web.search (schema via Grok) → mapStructuredToTimeline → applyPlan
export const generateFromWebSearch = action({
  args: {
    documentId: v.id("documents"),
    name: v.optional(v.string()),
    query: v.string(),
    intent: v.optional(v.string()),
    schema: v.optional(v.any()),
  },
  returns: v.object({ timelineId: v.id("agentTimelines") }),
  handler: async (ctx, { documentId, name, query, intent, schema }) => {
    const timelineId = await ensureTimeline(ctx, documentId, name ?? "Web Search Timeline");

    const memory = new InMemoryStore();
    const trace = new Trace();
    const tool = searchTool({ root: `${process.cwd()}/agents/app/demo_scenarios` });
    const out = await tool({
      query,
      intent: intent || 'research',
      schema,
      schemaGenerator: schema ? 'provided' : 'grok',
      sources: [],
    }, { memory, trace } as any);

    const structured = (out as any)?.structured;
    if (!structured) throw new Error("web.search did not return structured output");

    const mapped = mapStructuredToTimeline(structured, { defaultName: name ?? 'Web Research Orchestrator' });
    const now = Date.now();
    await ctx.runMutation(apiAny.agentTimelines.applyPlan, { timelineId, baseStartMs: now, tasks: mapped.tasks as any, links: mapped.links as any });

    return { timelineId } as any;
  }
});

const defaultStructuredSchema = {

  type: 'object',
  required: ['agents','timeline'],
  properties: {
    agents: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id','name','type'],
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          type: { type: 'string', enum: ['orchestrator','main','sub'] },
          parentId: { type: 'string' },
          status: { type: 'string', enum: ['pending','running','complete','paused'] },
        },
        additionalProperties: false,
      }
    },
    timeline: {
      type: 'array',
      items: {
        type: 'object',
        required: ['agentId','startOffsetMs','durationMs','status'],
        properties: {
          agentId: { type: 'string' },
          startOffsetMs: { type: 'number' },
          durationMs: { type: 'number' },
          status: { type: 'string', enum: ['pending','running','complete','paused'] },
        },
        additionalProperties: false,
      }
    }
  },
  additionalProperties: false,
};

// Option 3: Deterministically seed the mock shown in the HTML
export const seedDeterministicMock = action({
  args: {
    documentId: v.id('documents'),
    name: v.optional(v.string()),
  },
  returns: v.object({ timelineId: v.id('agentTimelines') }),
  handler: async (ctx, { documentId, name }) => {
    const timelineId = await ensureTimeline(ctx, documentId, name ?? 'Research Orchestrator');
    const now = Date.now();

    // 10 min window (600000ms)
    const tasks = [
      { id: 'root', parentId: null, name: 'Research Orchestrator', startOffsetMs: 0, durationMs: 600000, agentType: 'orchestrator' },
      { id: 'person-research', parentId: 'root', name: 'Person Research Agent', startOffsetMs: msFromPct(0.833333), durationMs: msFromPct(30), agentType: 'main' },
      { id: 'linkedin-scraper', parentId: 'person-research', name: 'LinkedIn Profile Scraper', startOffsetMs: msFromPct(1.66667), durationMs: msFromPct(7.5), agentType: 'leaf' },
      { id: 'news-scanner', parentId: 'person-research', name: 'News & Media Scanner', startOffsetMs: msFromPct(1.66667), durationMs: msFromPct(10), agentType: 'leaf' },
      { id: 'background-analyzer', parentId: 'person-research', name: 'Professional Background Analyzer', startOffsetMs: msFromPct(10), durationMs: msFromPct(15), agentType: 'leaf' },

      { id: 'company-research', parentId: 'root', name: 'Company Research Agent', startOffsetMs: msFromPct(0.833333), durationMs: msFromPct(33.3333), agentType: 'main' },
      { id: 'financial-collector', parentId: 'company-research', name: 'Financial Data Collector', startOffsetMs: msFromPct(1.66667), durationMs: msFromPct(8.33333), agentType: 'leaf' },
      { id: 'competitor-analysis', parentId: 'company-research', name: 'Competitor Analysis Agent', startOffsetMs: msFromPct(1.66667), durationMs: msFromPct(13.3333), agentType: 'leaf' },
      { id: 'product-analyzer', parentId: 'company-research', name: 'Product/Service Analyzer', startOffsetMs: msFromPct(11.6667), durationMs: msFromPct(11.6667), agentType: 'leaf' },
      { id: 'market-position', parentId: 'company-research', name: 'Market Position Evaluator', startOffsetMs: msFromPct(24.1667), durationMs: msFromPct(8.33333), agentType: 'leaf' },

      { id: 'fundraising-analysis', parentId: 'root', name: 'Fundraising Analysis Agent', startOffsetMs: msFromPct(35), durationMs: msFromPct(25), agentType: 'main' },
      { id: 'previous-rounds', parentId: 'fundraising-analysis', name: 'Previous Rounds Analyzer', startOffsetMs: msFromPct(35.8333), durationMs: msFromPct(6.66667), agentType: 'leaf' },
      { id: 'investor-network', parentId: 'fundraising-analysis', name: 'Investor Network Mapper', startOffsetMs: msFromPct(43.3333), durationMs: msFromPct(8.33333), agentType: 'leaf' },
      { id: 'valuation-calculator', parentId: 'fundraising-analysis', name: 'Valuation Calculator', startOffsetMs: msFromPct(52.5), durationMs: msFromPct(6.66667), agentType: 'leaf' },


      { id: 'synthesis', parentId: 'root', name: 'Report Synthesis Agent', startOffsetMs: msFromPct(60), durationMs: msFromPct(20), agentType: 'main' },
      { id: 'data-consolidation', parentId: 'synthesis', name: 'Data Consolidation', startOffsetMs: msFromPct(61.6667), durationMs: msFromPct(8.33333), agentType: 'leaf' },
      { id: 'report-generator', parentId: 'synthesis', name: 'Report Generator', startOffsetMs: msFromPct(71.6667), durationMs: msFromPct(6.66667), agentType: 'leaf' },
    ];

    const links = [
      { sourceId: 'root', targetId: 'person-research' },
      { sourceId: 'root', targetId: 'company-research' },
      { sourceId: 'company-research', targetId: 'fundraising-analysis' },
      { sourceId: 'fundraising-analysis', targetId: 'synthesis' },
      // Parent -> sub edges
      { sourceId: 'person-research', targetId: 'linkedin-scraper' },
      { sourceId: 'person-research', targetId: 'news-scanner' },
      { sourceId: 'person-research', targetId: 'background-analyzer' },
      { sourceId: 'company-research', targetId: 'financial-collector' },
      { sourceId: 'company-research', targetId: 'competitor-analysis' },
      { sourceId: 'company-research', targetId: 'product-analyzer' },
      { sourceId: 'company-research', targetId: 'market-position' },
      { sourceId: 'synthesis', targetId: 'data-consolidation' },
      { sourceId: 'synthesis', targetId: 'report-generator' },
    ];

    await ctx.runMutation(apiAny.agentTimelines.applyPlan, { timelineId, baseStartMs: now, tasks, links });

    // Set statuses to match the HTML (orchestrator running, others complete)
    const tl = await ctx.runQuery(apiAny.agentTimelines.getByTimelineId, { timelineId });
    const byId: Record<string, any> = {};
    if (tl) for (const t of tl.tasks) byId[t.id || t.name] = t;

    const complete = [
      'person-research','linkedin-scraper','news-scanner','background-analyzer',
      'company-research','financial-collector','competitor-analysis','product-analyzer','market-position',
      'fundraising-analysis','previous-rounds','investor-network','valuation-calculator',
      'synthesis','data-consolidation','report-generator'
    ];

    const setStatus = async (id: string, status: 'running'|'complete') => {
      const t = byId[id]; if (!t?._id) return;
      await ctx.runMutation(apiAny.agentTimelines.updateTaskMetrics, {
        taskId: t._id, status,
        startedAtMs: now + (t.startOffsetMs || 0), elapsedMs: t.durationMs || 0,
      });
    };

    await setStatus('root', 'running');
    for (const id of complete) await setStatus(id, 'complete');

    return { timelineId } as any;
  }
});


// Simple 4-row mock to match the provided HTML (orchestrate complete, main paused, sub paused/pending)
export const seedSimpleMock = action({
  args: { documentId: v.id('documents'), name: v.optional(v.string()) },
  returns: v.object({ timelineId: v.id('agentTimelines') }),
  handler: async (ctx, { documentId, name }) => {
    const timelineId = await ensureTimeline(ctx, documentId, name ?? 'Multi-Agent Research');
    const now = Date.now();

    const tasks = [
      { id: 'orchestrate', parentId: null, name: 'Orchestrate', startOffsetMs: 0, durationMs: msFromPct(50), agentType: 'orchestrator' },
      { id: 'main-research', parentId: null, name: 'Main Research', startOffsetMs: 0, durationMs: msFromPct(100), agentType: 'main' },
      { id: 'collect-sources', parentId: 'main-research', name: 'Collect Sources', startOffsetMs: 0, durationMs: msFromPct(100), agentType: 'leaf' },
      { id: 'summarize', parentId: 'main-research', name: 'Summarize', startOffsetMs: 0, durationMs: msFromPct(100), agentType: 'leaf' },
    ];

    const links = [
      // Ensure hierarchy links exist: orchestrator -> main, main -> leaves
      { sourceId: 'orchestrate', targetId: 'main-research' },
      { sourceId: 'main-research', targetId: 'collect-sources' },
      { sourceId: 'main-research', targetId: 'summarize' },
      // Also keep leaf sequencing if desired
      { sourceId: 'collect-sources', targetId: 'summarize' },
    ];

    await ctx.runMutation(apiAny.agentTimelines.applyPlan, { timelineId, baseStartMs: now, tasks, links });

    const tl = await ctx.runQuery(apiAny.agentTimelines.getByTimelineId, { timelineId });
    const byId: Record<string, any> = {};
    if (tl) for (const t of tl.tasks) byId[t.id || t.name] = t;


    const setStatus = async (id: string, status: 'running'|'complete'|'paused'|'pending') => {
      const t = byId[id]; if (!t?._id) return;
      await ctx.runMutation(apiAny.agentTimelines.updateTaskMetrics, {
        taskId: t._id, status,
        startedAtMs: now + (t.startOffsetMs || 0), elapsedMs: t.durationMs || 0,
      });
    };

    await setStatus('orchestrate', 'complete');
    await setStatus('main-research', 'paused');
    await setStatus('collect-sources', 'paused');
    await setStatus('summarize', 'pending');

    return { timelineId } as any;
  }
});



// Demo wrapper: run web search and apply to an existing timelineId
export const generateFromWebSearchOnTimeline = action({
  args: {
    timelineId: v.id("agentTimelines"),
    query: v.string(),
    intent: v.optional(v.string()),
    schema: v.optional(v.any()),
  },
  returns: v.object({ timelineId: v.id("agentTimelines") }),
  handler: async (ctx, { timelineId, query, intent, schema }) => {
    const memory = new InMemoryStore();
    const trace = new Trace();
    const tool = searchTool({ root: `${process.cwd()}/agents/app/demo_scenarios` });
    const out = await tool({
      query,
      intent: intent || 'research',
      schema,
      schemaGenerator: schema ? 'provided' : 'grok',
      sources: [],
    }, { memory, trace } as any);

    const structured = (out as any)?.structured;
    if (!structured) throw new Error("web.search did not return structured output");

    const mapped = mapStructuredToTimeline(structured, { defaultName: 'Web Research Orchestrator' });
    const now = Date.now();
    await ctx.runMutation(apiAny.agentTimelines.applyPlan, { timelineId, baseStartMs: now, tasks: mapped.tasks as any, links: mapped.links as any });
    return { timelineId } as any;
  }
});
