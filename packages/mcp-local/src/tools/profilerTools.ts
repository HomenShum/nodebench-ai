/**
 * profilerTools.ts — Founder Operating Profiler
 *
 * Intercepts MCP tool calls, logs cost/latency/patterns, and surfaces
 * optimization intelligence. This is the meta-layer that makes NodeBench
 * indispensable for agent-native builders.
 *
 * What it profiles:
 * - Tool call sequences (what chains do users run)
 * - Cost patterns (which tools/models are expensive, which are redundant)
 * - Context reuse (what gets rebuilt that should be cached)
 * - Query patterns (repeated questions, similar intents)
 * - Workflow efficiency (shortest valid path vs actual path)
 *
 * Architecture principle:
 * - LLM for interpretation (pattern detection, optimization suggestions)
 * - Deterministic code for control (logging, storage, budget enforcement)
 */

import type { McpTool } from "../types.js";
import { getDb, genId } from "../db.js";

// ── Types ─────────────────────────────────────────────────────────────

interface ToolCallRecord {
  id: string;
  sessionId: string;
  toolName: string;
  args: Record<string, unknown>;
  result: { success: boolean; tokenEstimate?: number; error?: string };
  startMs: number;
  durationMs: number;
  costEstimateUsd: number;
  modelUsed?: string;
  timestamp: string;
}

interface SessionProfile {
  sessionId: string;
  totalCalls: number;
  totalDurationMs: number;
  totalCostUsd: number;
  uniqueTools: string[];
  toolChain: string[];        // Ordered sequence of tool names
  redundantCalls: number;     // Same tool+args within 30min
  reusedContext: number;      // Times prior packet/context was referenced
  optimizationScore: number;  // 0-100 (higher = more efficient)
}

interface OptimizationSuggestion {
  type: "redundant_call" | "cheaper_model" | "cache_opportunity" | "workflow_shortcut" | "context_reuse";
  description: string;
  estimatedSavings: { calls?: number; costUsd?: number; latencyMs?: number; tokens?: number };
  confidence: number;  // 0-100
  actionable: string;  // What the user should do
}

// ── Cost estimates per tool category ──────────────────────────────────

const COST_PER_CALL: Record<string, number> = {
  web_search: 0.008,
  fetch_url: 0.002,
  enrich_entity: 0.015,
  run_deep_sim: 0.05,
  build_claim_graph: 0.03,
  extract_variables: 0.02,
  generate_countermodels: 0.04,
  rank_interventions: 0.02,
  score_compounding: 0.02,
  render_decision_memo: 0.01,
  founder_local_weekly_reset: 0.005,
  founder_local_synthesize: 0.01,
  founder_local_gather: 0.003,
  discover_tools: 0.001,
  get_tool_quick_ref: 0.001,
  // Default for unknown tools
  _default: 0.005,
};

function estimateCost(toolName: string): number {
  return COST_PER_CALL[toolName] ?? COST_PER_CALL._default;
}

// ── In-memory profiling store (bounded) ──────────────────────────────

const MAX_RECORDS = 5000;
const MAX_SESSIONS = 200;
const toolCallLog: ToolCallRecord[] = [];
const sessionProfiles = new Map<string, SessionProfile>();

function addToolCall(record: ToolCallRecord) {
  toolCallLog.push(record);
  if (toolCallLog.length > MAX_RECORDS) {
    toolCallLog.splice(0, toolCallLog.length - MAX_RECORDS);
  }
}

function getOrCreateSession(sessionId: string): SessionProfile {
  let profile = sessionProfiles.get(sessionId);
  if (!profile) {
    if (sessionProfiles.size >= MAX_SESSIONS) {
      // Evict oldest session
      const oldest = sessionProfiles.keys().next().value;
      if (oldest) sessionProfiles.delete(oldest);
    }
    profile = {
      sessionId,
      totalCalls: 0,
      totalDurationMs: 0,
      totalCostUsd: 0,
      uniqueTools: [],
      toolChain: [],
      redundantCalls: 0,
      reusedContext: 0,
      optimizationScore: 100,
    };
    sessionProfiles.set(sessionId, profile);
  }
  return profile;
}

// ── Redundancy detection ─────────────────────────────────────────────

function isRedundant(toolName: string, args: Record<string, unknown>, sessionId: string): boolean {
  const recentCalls = toolCallLog
    .filter(r => r.sessionId === sessionId && r.toolName === toolName)
    .slice(-10);

  const argsStr = JSON.stringify(args);
  const thirtyMinAgo = Date.now() - 30 * 60 * 1000;

  return recentCalls.some(r =>
    r.startMs > thirtyMinAgo && JSON.stringify(r.args) === argsStr
  );
}

// ── Pattern detection ────────────────────────────────────────────────

function detectPatterns(sessionId: string): OptimizationSuggestion[] {
  const suggestions: OptimizationSuggestion[] = [];
  const session = sessionProfiles.get(sessionId);
  if (!session || session.totalCalls < 3) return suggestions;

  // 1. Redundant calls
  if (session.redundantCalls > 0) {
    suggestions.push({
      type: "redundant_call",
      description: `${session.redundantCalls} tool calls were identical to recent calls. Results could be cached.`,
      estimatedSavings: {
        calls: session.redundantCalls,
        costUsd: session.redundantCalls * 0.005,
        latencyMs: session.redundantCalls * 2000,
      },
      confidence: 90,
      actionable: "Enable NodeBench result caching for repeated queries within 30-minute windows.",
    });
  }

  // 2. Repeated tool chains
  const chain = session.toolChain;
  if (chain.length >= 6) {
    // Look for repeated subsequences of length 3+
    for (let len = 3; len <= Math.min(5, Math.floor(chain.length / 2)); len++) {
      const last = chain.slice(-len).join(",");
      const prior = chain.slice(-(len * 2), -len).join(",");
      if (last === prior) {
        suggestions.push({
          type: "workflow_shortcut",
          description: `Detected repeated ${len}-step sequence: ${chain.slice(-len).join(" → ")}. This can be automated.`,
          estimatedSavings: { calls: len, latencyMs: len * 1500 },
          confidence: 75,
          actionable: "Save this as a reusable workflow in NodeBench.",
        });
        break;
      }
    }
  }

  // 3. Expensive tool usage
  const expensiveCalls = toolCallLog
    .filter(r => r.sessionId === sessionId && r.costEstimateUsd > 0.02)
    .length;
  if (expensiveCalls > 3) {
    suggestions.push({
      type: "cheaper_model",
      description: `${expensiveCalls} calls used expensive tools. Some may work with Gemini Flash Lite instead.`,
      estimatedSavings: {
        costUsd: expensiveCalls * 0.015,
        tokens: expensiveCalls * 500,
      },
      confidence: 60,
      actionable: "Consider using lighter models for classification and extraction tasks.",
    });
  }

  return suggestions;
}

// ── Query pattern analysis ───────────────────────────────────────────

function getQueryPatterns(): { repeatedQueries: Array<{ query: string; count: number }>; topTools: Array<{ tool: string; count: number; avgLatencyMs: number; totalCostUsd: number }> } {
  // Find repeated queries (by tool args similarity)
  const queryMap = new Map<string, number>();
  for (const record of toolCallLog) {
    if (record.toolName === "web_search" || record.toolName === "enrich_entity") {
      const key = `${record.toolName}:${JSON.stringify(record.args).substring(0, 100)}`;
      queryMap.set(key, (queryMap.get(key) ?? 0) + 1);
    }
  }
  const repeatedQueries = Array.from(queryMap.entries())
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([query, count]) => ({ query, count }));

  // Top tools by usage
  const toolStats = new Map<string, { count: number; totalLatency: number; totalCost: number }>();
  for (const record of toolCallLog) {
    const stats = toolStats.get(record.toolName) ?? { count: 0, totalLatency: 0, totalCost: 0 };
    stats.count++;
    stats.totalLatency += record.durationMs;
    stats.totalCost += record.costEstimateUsd;
    toolStats.set(record.toolName, stats);
  }
  const topTools = Array.from(toolStats.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 15)
    .map(([tool, stats]) => ({
      tool,
      count: stats.count,
      avgLatencyMs: Math.round(stats.totalLatency / stats.count),
      totalCostUsd: Math.round(stats.totalCost * 1000) / 1000,
    }));

  return { repeatedQueries, topTools };
}

// ── MCP Tools ────────────────────────────────────────────────────────

export const profilerTools: McpTool[] = [
  {
    name: "log_tool_call",
    description: "Log an MCP tool call for profiling. Called automatically by the NodeBench gateway to track tool usage patterns, cost, and latency. Returns whether the call was redundant.",
    inputSchema: {
      type: "object" as const,
      properties: {
        sessionId: { type: "string", description: "Session or conversation ID" },
        toolName: { type: "string", description: "Name of the MCP tool called" },
        args: { type: "object", description: "Tool input arguments" },
        durationMs: { type: "number", description: "How long the call took" },
        success: { type: "boolean", description: "Whether the call succeeded" },
        modelUsed: { type: "string", description: "LLM model used (if applicable)" },
        tokenEstimate: { type: "number", description: "Estimated tokens consumed" },
      },
      required: ["sessionId", "toolName", "durationMs", "success"],
    },
    handler: async (args: Record<string, unknown>) => {
      const sessionId = String(args.sessionId ?? "unknown");
      const toolName = String(args.toolName ?? "unknown");
      const toolArgs = (args.args as Record<string, unknown>) ?? {};
      const durationMs = Number(args.durationMs ?? 0);
      const success = Boolean(args.success);
      const modelUsed = args.modelUsed ? String(args.modelUsed) : undefined;
      const tokenEstimate = args.tokenEstimate ? Number(args.tokenEstimate) : undefined;

      const redundant = isRedundant(toolName, toolArgs, sessionId);
      const costEstimate = estimateCost(toolName);

      const record: ToolCallRecord = {
        id: genId("prof"),
        sessionId,
        toolName,
        args: toolArgs,
        result: { success, tokenEstimate },
        startMs: Date.now() - durationMs,
        durationMs,
        costEstimateUsd: costEstimate,
        modelUsed,
        timestamp: new Date().toISOString(),
      };

      addToolCall(record);

      // Update session profile
      const session = getOrCreateSession(sessionId);
      session.totalCalls++;
      session.totalDurationMs += durationMs;
      session.totalCostUsd += costEstimate;
      session.toolChain.push(toolName);
      if (session.toolChain.length > 100) session.toolChain.splice(0, 50);
      if (!session.uniqueTools.includes(toolName)) session.uniqueTools.push(toolName);
      if (redundant) session.redundantCalls++;

      return {
        logged: true,
        redundant,
        callNumber: session.totalCalls,
        sessionCostSoFar: Math.round(session.totalCostUsd * 1000) / 1000,
        suggestion: redundant ? "This call is identical to a recent one. Consider caching." : null,
      };
    },
  },

  {
    name: "get_session_profile",
    description: "Get the efficiency profile for the current session. Shows total calls, cost, latency, redundancy, and optimization suggestions.",
    inputSchema: {
      type: "object" as const,
      properties: {
        sessionId: { type: "string", description: "Session ID to profile" },
      },
      required: ["sessionId"],
    },
    handler: async (args: Record<string, unknown>) => {
      const sessionId = String(args.sessionId ?? "unknown");
      const session = sessionProfiles.get(sessionId);
      if (!session) {
        return { error: false, message: "No profile data yet. Use tools to build a profile.", totalCalls: 0 };
      }

      const suggestions = detectPatterns(sessionId);

      return {
        ...session,
        totalCostUsd: Math.round(session.totalCostUsd * 1000) / 1000,
        suggestions,
        efficiency: {
          redundancyRate: session.totalCalls > 0 ? Math.round((session.redundantCalls / session.totalCalls) * 100) : 0,
          avgLatencyMs: session.totalCalls > 0 ? Math.round(session.totalDurationMs / session.totalCalls) : 0,
          costPerCall: session.totalCalls > 0 ? Math.round((session.totalCostUsd / session.totalCalls) * 1000) / 1000 : 0,
        },
      };
    },
  },

  {
    name: "get_usage_insights",
    description: "Get aggregate usage insights across all sessions. Shows top tools, repeated queries, cost breakdown, and optimization opportunities. This is the founder operating intelligence layer.",
    inputSchema: {
      type: "object" as const,
      properties: {
        daysBack: { type: "number", description: "How many days of data to analyze (default: 7)" },
      },
    },
    handler: async (args: Record<string, unknown>) => {
      const patterns = getQueryPatterns();
      const totalSessions = sessionProfiles.size;
      const totalCalls = toolCallLog.length;
      const totalCost = toolCallLog.reduce((sum, r) => sum + r.costEstimateUsd, 0);
      const totalLatency = toolCallLog.reduce((sum, r) => sum + r.durationMs, 0);
      const redundantTotal = Array.from(sessionProfiles.values()).reduce((sum, s) => sum + s.redundantCalls, 0);

      // Find the most common tool chains
      const chainCounts = new Map<string, number>();
      for (const session of sessionProfiles.values()) {
        const chain = session.toolChain;
        for (let i = 0; i < chain.length - 2; i++) {
          const triplet = `${chain[i]} → ${chain[i + 1]} → ${chain[i + 2]}`;
          chainCounts.set(triplet, (chainCounts.get(triplet) ?? 0) + 1);
        }
      }
      const topChains = Array.from(chainCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([chain, count]) => ({ chain, count }));

      return {
        overview: {
          totalSessions,
          totalCalls,
          totalCostUsd: Math.round(totalCost * 1000) / 1000,
          totalLatencyMs: totalLatency,
          avgCallsPerSession: totalSessions > 0 ? Math.round(totalCalls / totalSessions) : 0,
          redundantCallRate: totalCalls > 0 ? Math.round((redundantTotal / totalCalls) * 100) : 0,
        },
        topTools: patterns.topTools,
        repeatedQueries: patterns.repeatedQueries,
        topChains,
        recommendations: [
          redundantTotal > 5 ? `${redundantTotal} redundant calls detected. Enable caching to save ~$${Math.round(redundantTotal * 0.005 * 100) / 100}/week.` : null,
          patterns.topTools.some(t => t.avgLatencyMs > 5000) ? `Some tools average >5s. Consider async dispatch or cheaper model alternatives.` : null,
          topChains.length > 0 ? `Most common workflow: ${topChains[0].chain} (${topChains[0].count}x). Save as reusable template.` : null,
        ].filter(Boolean),
      };
    },
  },

  {
    name: "suggest_optimizations",
    description: "Analyze the current session and suggest specific optimizations: cheaper models, cached results, workflow shortcuts, and reusable patterns.",
    inputSchema: {
      type: "object" as const,
      properties: {
        sessionId: { type: "string", description: "Session to optimize" },
      },
      required: ["sessionId"],
    },
    handler: async (args: Record<string, unknown>) => {
      const sessionId = String(args.sessionId ?? "unknown");
      const suggestions = detectPatterns(sessionId);
      const session = sessionProfiles.get(sessionId);

      if (!session || session.totalCalls < 2) {
        return {
          suggestions: [],
          message: "Keep using tools — optimization suggestions appear after 3+ tool calls.",
        };
      }

      // Calculate potential savings
      const totalPotentialSavings = suggestions.reduce((sum, s) => ({
        calls: sum.calls + (s.estimatedSavings.calls ?? 0),
        costUsd: sum.costUsd + (s.estimatedSavings.costUsd ?? 0),
        latencyMs: sum.latencyMs + (s.estimatedSavings.latencyMs ?? 0),
      }), { calls: 0, costUsd: 0, latencyMs: 0 });

      return {
        sessionStats: {
          totalCalls: session.totalCalls,
          totalCostUsd: Math.round(session.totalCostUsd * 1000) / 1000,
          redundancyRate: `${Math.round((session.redundantCalls / session.totalCalls) * 100)}%`,
        },
        suggestions,
        potentialSavings: {
          calls: totalPotentialSavings.calls,
          costUsd: Math.round(totalPotentialSavings.costUsd * 1000) / 1000,
          latencyMs: totalPotentialSavings.latencyMs,
          summary: totalPotentialSavings.calls > 0
            ? `Save ${totalPotentialSavings.calls} calls, ~$${Math.round(totalPotentialSavings.costUsd * 100) / 100}, ~${Math.round(totalPotentialSavings.latencyMs / 1000)}s per session`
            : "No optimizations needed — your workflow is efficient.",
        },
      };
    },
  },
];
