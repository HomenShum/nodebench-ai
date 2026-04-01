/**
 * sweepTools.ts — MCP tools for the Live Signal Sweep Engine.
 *
 * Exposes sweep, delta, and recommendation capabilities as MCP tools
 * so Claude Code / Cursor / any MCP client can run sweeps and get
 * real-time market intelligence.
 */

import type { McpTool } from "../types.js";
import { runSweep, computeDelta, getLatestSweep, getPreviousSweep, initSweepTables, generateRecommendations } from "../sweep/engine.js";

export const sweepTools: McpTool[] = [
  {
    name: "run_signal_sweep",
    description: "Run a live signal sweep across all data sources (HackerNews, GitHub Trending, Yahoo Finance, ProductHunt). Returns signals sorted by relevance with severity tiers (FLASH/PRIORITY/ROUTINE). Use this to find what's happening in the AI/agent ecosystem right now.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
    handler: async () => {
      try { initSweepTables(); } catch { /* tables may exist */ }
      const result = await runSweep();
      const previous = getPreviousSweep();
      const delta = computeDelta(result, previous);
      const recommendations = generateRecommendations(result.signals);

      return {
        sweep: {
          id: result.sweepId,
          signalCount: result.signals.length,
          sources: result.sources,
          durationMs: result.totalDurationMs,
        },
        topSignals: result.signals.slice(0, 10).map(s => ({
          entity: s.entity,
          headline: s.headline,
          source: s.source,
          severity: s.severity,
          score: s.score,
          category: s.category,
          url: s.url,
        })),
        delta: {
          newSignals: delta.newSignals.length,
          escalations: delta.escalations.length,
          deescalations: delta.deescalations.length,
          topEntity: delta.topEntity,
          topEntityQuery: delta.topEntityQuery,
        },
        recommendations: recommendations.slice(0, 5).map(r => ({
          entity: r.signal.entity,
          action: r.action,
          urgency: r.urgency,
          category: r.category,
        })),
      };
    },
  },

  {
    name: "get_latest_signals",
    description: "Get the most recent signal sweep results without running a new sweep. Returns cached signals from the last sweep. Fast — no API calls.",
    inputSchema: {
      type: "object" as const,
      properties: {
        limit: { type: "number", description: "Max signals to return (default 10)" },
        severity: { type: "string", description: "Filter by severity: flash, priority, routine" },
      },
    },
    handler: async (args: Record<string, unknown>) => {
      const limit = Number(args.limit ?? 10);
      const severity = args.severity as string | undefined;
      const latest = getLatestSweep();
      if (!latest) return { signals: [], message: "No sweep data yet. Run run_signal_sweep first." };

      let signals = latest.signals;
      if (severity) signals = signals.filter(s => s.severity === severity);

      return {
        sweepId: latest.sweepId,
        timestamp: latest.timestamp,
        signals: signals.slice(0, limit).map(s => ({
          entity: s.entity, headline: s.headline, source: s.source,
          severity: s.severity, score: s.score, category: s.category, url: s.url,
        })),
      };
    },
  },

  {
    name: "get_signal_recommendations",
    description: "Get founder-specific actionable recommendations from the latest signals. Each recommendation includes: what to do, why, and urgency (act_now / this_week / monitor).",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
    handler: async () => {
      const latest = getLatestSweep();
      if (!latest) return { recommendations: [], message: "No sweep data yet. Run run_signal_sweep first." };

      const recs = generateRecommendations(latest.signals);
      return {
        recommendations: recs.map(r => ({
          entity: r.signal.entity,
          action: r.action,
          reasoning: r.reasoning,
          urgency: r.urgency,
          category: r.category,
          sourceHeadline: r.signal.headline,
        })),
      };
    },
  },
];
