/**
 * Cost Tracking Dashboard
 *
 * Real-time visibility into LLM costs across users, models, and features.
 * Shows cache hit rates, batch job savings, and trends over time.
 */

import React, { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { DollarSign, TrendingDown, Zap, Clock, Database, Users } from "lucide-react";
import { CostDashboardSkeleton } from "./skeletons";

export function CostDashboard() {
  const [timeRange, setTimeRange] = useState<"24h" | "7d" | "30d">("7d");

  // Memoize time calculations to prevent infinite re-renders
  const { startTime, endTime } = useMemo(() => {
    const now = Date.now();
    const start =
      timeRange === "24h" ? now - 24 * 60 * 60 * 1000 :
      timeRange === "7d" ? now - 7 * 24 * 60 * 60 * 1000 :
      now - 30 * 24 * 60 * 60 * 1000;
    return { startTime: start, endTime: now };
  }, [timeRange]);

  // Fetch metrics
  const metrics = useQuery(api.domains.observability.traces.getAggregatedMetrics, {
    startTime,
    endTime,
  });

  const costByModel = useQuery(api.domains.observability.traces.getCostByModel, {
    startTime,
    endTime,
  });

  const costByUser = useQuery(api.domains.observability.traces.getCostByUser, {
    startTime,
    endTime,
  });

  const cacheStats = useQuery(api.domains.observability.traces.getCacheHitRate, {
    startTime,
    endTime,
  });

  if (!metrics || !costByModel || !costByUser || !cacheStats) {
    return <CostDashboardSkeleton />;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Cost Dashboard
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Real-time LLM cost tracking and optimization insights
          </p>
        </div>

        {/* Time Range Selector */}
        <div className="flex gap-2 bg-[var(--bg-secondary)] rounded-lg p-1">
          {(["24h", "7d", "30d"] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                timeRange === range
                  ? "bg-[var(--accent-primary)] text-white"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {range === "24h" ? "24 Hours" : range === "7d" ? "7 Days" : "30 Days"}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Cost */}
        <MetricCard
          icon={<DollarSign className="w-5 h-5" />}
          label="Total Cost"
          value={`$${metrics.totalCost.toFixed(2)}`}
          subtitle={`${metrics.totalRequests.toLocaleString()} requests`}
          trend={null}
        />

        {/* Avg Cost Per Request */}
        <MetricCard
          icon={<TrendingDown className="w-5 h-5" />}
          label="Avg Cost/Request"
          value={`$${metrics.avgCostPerRequest.toFixed(4)}`}
          subtitle="Per request"
          trend={null}
        />

        {/* Cache Hit Rate */}
        <MetricCard
          icon={<Zap className="w-5 h-5 text-yellow-500" />}
          label="Cache Hit Rate"
          value={`${cacheStats.cacheHitRate.toFixed(1)}%`}
          subtitle={`Saved $${cacheStats.estimatedSavings.toFixed(2)}`}
          trend={cacheStats.cacheHitRate > 70 ? "good" : "warning"}
        />

        {/* P95 Latency */}
        <MetricCard
          icon={<Clock className="w-5 h-5 text-blue-500" />}
          label="P95 Latency"
          value={`${Math.round(metrics.p95LatencyMs)}ms`}
          subtitle={`Avg: ${Math.round(metrics.avgLatencyMs)}ms`}
          trend={null}
        />
      </div>

      {/* Cache Savings Breakdown */}
      {cacheStats.cacheHitRate > 0 && (
        <div className="bg-[var(--bg-secondary)] rounded-lg p-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            Prompt Caching Savings
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-[var(--text-secondary)] mb-1">
                Total Input Tokens
              </div>
              <div className="text-2xl font-bold text-[var(--text-primary)]">
                {cacheStats.totalInputTokens.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-sm text-[var(--text-secondary)] mb-1">
                Cache Read Tokens
              </div>
              <div className="text-2xl font-bold text-yellow-500">
                {cacheStats.cacheHitTokens.toLocaleString()}
              </div>
              <div className="text-xs text-[var(--text-secondary)] mt-1">
                {cacheStats.cacheHitRate.toFixed(1)}% hit rate
              </div>
            </div>
            <div>
              <div className="text-sm text-[var(--text-secondary)] mb-1">
                Cost Savings
              </div>
              <div className="text-2xl font-bold text-green-500">
                ${cacheStats.estimatedSavings.toFixed(2)}
              </div>
              <div className="text-xs text-[var(--text-secondary)] mt-1">
                {cacheStats.savingsRate.toFixed(1)}% saved
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cost by Model */}
      <div className="bg-[var(--bg-secondary)] rounded-lg p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <Database className="w-5 h-5" />
          Cost by Model
        </h2>
        <div className="space-y-3">
          {costByModel.slice(0, 10).map((model: any) => (
            <div key={model.model} className="flex items-center justify-between">
              <div className="flex-1">
                <div className="text-sm font-medium text-[var(--text-primary)]">
                  {model.model}
                </div>
                <div className="text-xs text-[var(--text-secondary)]">
                  {model.requests.toLocaleString()} requests •{" "}
                  {model.tokens.toLocaleString()} tokens
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-[var(--text-primary)]">
                  ${model.cost.toFixed(2)}
                </div>
                <div className="text-xs text-[var(--text-secondary)]">
                  ${model.avgCostPerRequest.toFixed(4)}/req
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cost by User (Top 10) */}
      <div className="bg-[var(--bg-secondary)] rounded-lg p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Cost by User (Top 10)
        </h2>
        <div className="space-y-3">
          {costByUser.slice(0, 10).map((user: any, idx: number) => (
            <div key={user.userId} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-sm font-medium text-[var(--text-muted)] w-6">
                  #{idx + 1}
                </div>
                <div>
                  <div className="text-sm font-medium text-[var(--text-primary)]">
                    {user.userId === "anonymous" ? "Anonymous Users" : `User ${user.userId.slice(0, 8)}...`}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    {user.requests.toLocaleString()} requests
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-[var(--text-primary)]">
                  ${user.cost.toFixed(2)}
                </div>
                <div className="text-xs text-[var(--text-secondary)]">
                  ${user.avgCostPerRequest.toFixed(4)}/req
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Token Usage Breakdown */}
      <div className="bg-[var(--bg-secondary)] rounded-lg p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
          Token Usage Breakdown
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-[var(--text-secondary)] mb-1">
              Total Tokens
            </div>
            <div className="text-2xl font-bold text-[var(--text-primary)]">
              {metrics.totalTokens.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-sm text-[var(--text-secondary)] mb-1">
              Input Tokens
            </div>
            <div className="text-2xl font-bold text-blue-500">
              {metrics.totalInputTokens.toLocaleString()}
            </div>
            <div className="text-xs text-[var(--text-secondary)] mt-1">
              {((metrics.totalInputTokens / metrics.totalTokens) * 100).toFixed(1)}% of total
            </div>
          </div>
          <div>
            <div className="text-sm text-[var(--text-secondary)] mb-1">
              Output Tokens
            </div>
            <div className="text-2xl font-bold text-green-500">
              {metrics.totalOutputTokens.toLocaleString()}
            </div>
            <div className="text-xs text-[var(--text-secondary)] mt-1">
              {((metrics.totalOutputTokens / metrics.totalTokens) * 100).toFixed(1)}% of total
            </div>
          </div>
        </div>
      </div>

      {/* Success Rate */}
      <div className="bg-[var(--bg-secondary)] rounded-lg p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
          Execution Success Rate
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-[var(--text-secondary)] mb-1">
              Successful
            </div>
            <div className="text-2xl font-bold text-green-500">
              {metrics.successfulRequests.toLocaleString()}
            </div>
            <div className="text-xs text-[var(--text-secondary)] mt-1">
              {((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(1)}% success rate
            </div>
          </div>
          <div>
            <div className="text-sm text-[var(--text-secondary)] mb-1">
              Failed
            </div>
            <div className="text-2xl font-bold text-red-500">
              {metrics.failedRequests.toLocaleString()}
            </div>
            <div className="text-xs text-[var(--text-secondary)] mt-1">
              {((metrics.failedRequests / metrics.totalRequests) * 100).toFixed(1)}% failure rate
            </div>
          </div>
          <div>
            <div className="text-sm text-[var(--text-secondary)] mb-1">
              Total Requests
            </div>
            <div className="text-2xl font-bold text-[var(--text-primary)]">
              {metrics.totalRequests.toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper component for metric cards
interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle: string;
  trend: "good" | "warning" | null;
}

function MetricCard({ icon, label, value, subtitle, trend }: MetricCardProps) {
  return (
    <div className="bg-[var(--bg-secondary)] rounded-lg p-6">
      <div className="flex items-center gap-3 mb-3">
        <div className="text-[var(--text-secondary)]">{icon}</div>
        <div className="text-sm font-medium text-[var(--text-secondary)]">
          {label}
        </div>
      </div>
      <div className="text-2xl font-bold text-[var(--text-primary)] mb-1">
        {value}
      </div>
      <div className={`text-sm ${
        trend === "good" ? "text-green-500" :
        trend === "warning" ? "text-yellow-500" :
        "text-[var(--text-secondary)]"
      }`}>
        {subtitle}
      </div>
    </div>
  );
}

export default CostDashboard;
