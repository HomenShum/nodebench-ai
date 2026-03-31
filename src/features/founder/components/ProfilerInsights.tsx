/**
 * ProfilerInsights — Founder Operating Profiler cards.
 *
 * 4 insight cards that surface behavioral intelligence:
 * 1. Session Efficiency — calls, cost, savings, redundancy
 * 2. Workflow Insights — patterns, repeated chains, automation candidates
 * 3. Model & Tool Efficiency — cost by model, cheaper alternatives
 * 4. Reuse & Memory — packets reused, repeated questions prevented
 *
 * Data source: GET /api/search/insights (behavioral profiler aggregate)
 * Falls back to demo data when profiler hasn't collected enough real data.
 */

import { memo, useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import {
  Activity,
  BarChart3,
  Brain,
  CircleDollarSign,
  Clock,
  Cpu,
  Layers,
  Recycle,
  RefreshCw,
  TrendingDown,
  Zap,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────

interface InsightsData {
  totalSessions: number;
  totalQueries: number;
  totalToolCalls: number;
  totalCostUsd: number;
  redundantCallRate: number;
  topTools: Array<{ tool: string; count: number; avgLatencyMs: number; totalCost: number }>;
  repeatedQueries: Array<{ query: string; count: number }>;
  reuseRate: number;
  message?: string;
}

// ── Card Components ───────────────────────────────────────────────────

const CARD = "rounded-xl border border-edge/40 bg-surface/50 p-5";
const SECTION_HEADER = "mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-content-muted";
const STAT_VALUE = "text-2xl font-semibold text-content tabular-nums";
const STAT_LABEL = "text-[10px] text-content-muted mt-0.5";

function SessionEfficiencyCard({ data }: { data: InsightsData }) {
  const savingsEstimate = data.redundantCallRate > 0
    ? `${data.redundantCallRate}% of calls could be cached`
    : "No redundant calls detected";

  return (
    <div className={CARD}>
      <div className={SECTION_HEADER}>
        <Zap className="h-3.5 w-3.5" />
        Session Efficiency
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <div className={STAT_VALUE}>{data.totalSessions}</div>
          <div className={STAT_LABEL}>Sessions</div>
        </div>
        <div>
          <div className={STAT_VALUE}>{data.totalToolCalls}</div>
          <div className={STAT_LABEL}>Tool calls</div>
        </div>
        <div>
          <div className={STAT_VALUE}>${data.totalCostUsd.toFixed(2)}</div>
          <div className={STAT_LABEL}>Est. cost</div>
        </div>
      </div>
      {data.redundantCallRate > 0 && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-300">
          <TrendingDown className="h-3.5 w-3.5 shrink-0" />
          {savingsEstimate}
        </div>
      )}
      {data.totalSessions === 0 && (
        <p className="mt-3 text-xs text-content-muted">
          Profiling data appears after your first few searches. Try asking about a company.
        </p>
      )}
    </div>
  );
}

function WorkflowInsightsCard({ data }: { data: InsightsData }) {
  const hasRepeats = data.repeatedQueries.length > 0;

  return (
    <div className={CARD}>
      <div className={SECTION_HEADER}>
        <Layers className="h-3.5 w-3.5" />
        Workflow Insights
      </div>
      {hasRepeats ? (
        <div className="space-y-2">
          <p className="text-xs text-content-muted">Repeated questions detected — these could be automated:</p>
          {data.repeatedQueries.slice(0, 3).map((q, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border border-edge/30 bg-white/[0.02] px-3 py-2">
              <span className="text-xs text-content-secondary truncate max-w-[250px]">{q.query}</span>
              <span className="shrink-0 rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-content-muted tabular-nums">{q.count}x</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center py-4 text-center">
          <Brain className="h-6 w-6 text-content-muted/30 mb-2" />
          <p className="text-xs text-content-muted">
            Patterns emerge after 5+ sessions. NodeBench will suggest reusable workflows.
          </p>
        </div>
      )}
    </div>
  );
}

function ModelEfficiencyCard({ data }: { data: InsightsData }) {
  const topTools = data.topTools.slice(0, 5);
  const hasData = topTools.length > 0;

  return (
    <div className={CARD}>
      <div className={SECTION_HEADER}>
        <Cpu className="h-3.5 w-3.5" />
        Tool & Model Efficiency
      </div>
      {hasData ? (
        <div className="space-y-1.5">
          {topTools.map((t, i) => (
            <div key={i} className="flex items-center gap-3 text-xs">
              <span className="w-5 text-content-muted tabular-nums">{i + 1}.</span>
              <span className="flex-1 text-content-secondary font-mono text-[11px]">{t.tool}</span>
              <span className="text-content-muted tabular-nums">{t.count}x</span>
              <span className="text-content-muted tabular-nums">{t.avgLatencyMs}ms</span>
              <span className="text-content-muted tabular-nums">${t.totalCost.toFixed(3)}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center py-4 text-center">
          <BarChart3 className="h-6 w-6 text-content-muted/30 mb-2" />
          <p className="text-xs text-content-muted">
            Tool usage breakdown appears after your first search.
          </p>
        </div>
      )}
    </div>
  );
}

function ReuseMemoryCard({ data }: { data: InsightsData }) {
  return (
    <div className={CARD}>
      <div className={SECTION_HEADER}>
        <Recycle className="h-3.5 w-3.5" />
        Reuse & Memory
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className={STAT_VALUE}>{data.reuseRate}%</div>
          <div className={STAT_LABEL}>Context reuse rate</div>
        </div>
        <div>
          <div className={STAT_VALUE}>{data.totalQueries}</div>
          <div className={STAT_LABEL}>Total queries</div>
        </div>
      </div>
      <div className="mt-4 rounded-lg border border-edge/30 bg-white/[0.02] px-3 py-2.5">
        <div className="flex items-center gap-2 text-xs text-content-muted">
          <RefreshCw className="h-3 w-3" />
          {data.reuseRate > 0
            ? `${data.reuseRate}% of sessions reused prior context. Keep building your knowledge base.`
            : "Context reuse tracking active. Reuse prior packets to see savings here."}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────

export const ProfilerInsights = memo(function ProfilerInsights() {
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);

  // Primary path: Convex query (durable, real-time)
  let convexInsights: any = undefined;
  try {
    // Dynamic import to avoid crash when Convex isn't configured
    const api = (globalThis as any).__CONVEX_API__;
    if (api?.domains?.profiler?.queries?.getInsights) {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      convexInsights = useQuery(api.domains.profiler.queries.getInsights, { daysBack: 7 });
    }
  } catch { /* Convex may not be available */ }

  // If Convex returns data, use it directly
  useEffect(() => {
    if (convexInsights && convexInsights.totalToolCalls > 0) {
      setData(convexInsights as InsightsData);
      setLoading(false);
    }
  }, [convexInsights]);

  useEffect(() => {
    if (data) return; // Already have Convex data
    let cancelled = false;

    async function fetchInsights() {
      try {
        // Fallback: try local server, then Vercel serverless (which reads from Convex)
        const urls = [
          "http://127.0.0.1:3100/search/insights",
          "/api/search/insights",
        ];
        for (const url of urls) {
          try {
            const resp = await fetch(url, { signal: AbortSignal.timeout(3000) });
            if (resp.ok) {
              const json = await resp.json();
              if (!cancelled && json.success) {
                setData(json);
                setLoading(false);
                return;
              }
            }
          } catch { continue; }
        }
        // No data available — show empty state
        if (!cancelled) {
          setData({
            totalSessions: 0, totalQueries: 0, totalToolCalls: 0,
            totalCostUsd: 0, redundantCallRate: 0, topTools: [],
            repeatedQueries: [], reuseRate: 0,
          });
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }

    fetchInsights();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-32 rounded-xl border border-edge/30 bg-white/[0.02]" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-content">Operating Intelligence</h2>
          <p className="mt-0.5 text-xs text-content-muted">
            How you use your agents — and where to improve.
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-white/[0.06] px-2.5 py-1 text-[10px] text-content-muted">
          <Activity className="h-3 w-3" />
          Last 7 days
        </div>
      </div>

      {/* 4 Insight Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <SessionEfficiencyCard data={data} />
        <WorkflowInsightsCard data={data} />
        <ModelEfficiencyCard data={data} />
        <ReuseMemoryCard data={data} />
      </div>
    </div>
  );
});

export default ProfilerInsights;
