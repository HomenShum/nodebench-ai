"use client";

import React from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { StickyDashboard } from "./StickyDashboard";
import { RefreshCw, AlertCircle } from "lucide-react";
import type { DashboardState } from "@/features/research/types";

/**
 * LiveDashboard - Wrapper component that fetches live dashboard data
 * from daily brief snapshots and displays it using StickyDashboard
 */
export const LiveDashboard: React.FC<{
  fallbackData?: DashboardState;
}> = ({ fallbackData }) => {
  const snapshot = useQuery(api.domains.research.dashboardQueries.getLatestDashboardSnapshot);
  const refreshMetrics = useAction(api.domains.research.dashboardQueries.refreshDashboardMetrics);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshMetrics({});
    } catch (error) {
      console.error("Failed to refresh dashboard metrics:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Show loading state while fetching
  if (snapshot === undefined) {
    return (
      <div className="w-full font-mono text-slate-900">
        <div className="sticky top-4 z-10 rounded-xl border border-slate-200 bg-white shadow-sm p-3">
          <div className="flex items-center justify-center h-[400px] text-slate-400">
            <div className="flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin" />
              <span className="text-sm">Loading dashboard...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show fallback or empty state if no snapshot exists
  if (!snapshot) {
    if (fallbackData) {
      return (
        <div className="relative">
          <div className="absolute top-2 right-2 z-20">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded text-slate-600 transition-colors"
              title="Generate fresh metrics"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Generate</span>
            </button>
          </div>
          <StickyDashboard data={fallbackData} />
        </div>
      );
    }

    return (
      <div className="w-full font-mono text-slate-900">
        <div className="sticky top-4 z-10 rounded-xl border border-slate-200 bg-white shadow-sm p-3">
          <div className="flex flex-col items-center justify-center h-[400px] text-slate-400 gap-4">
            <AlertCircle className="w-8 h-8" />
            <div className="text-center">
              <p className="text-sm font-medium mb-1">No dashboard data available</p>
              <p className="text-xs text-slate-500 mb-4">
                Daily metrics will be generated automatically at 6:00 AM UTC
              </p>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm transition-colors mx-auto"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{isRefreshing ? 'Generating...' : 'Generate Now'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render dashboard with live data
  const lastUpdated = new Date(snapshot.generatedAt).toLocaleString();

  return (
    <div className="relative">
      {/* Header with last updated timestamp and refresh button */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="text-[10px] text-slate-500 font-mono">
          Last updated: {lastUpdated}
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded text-slate-600 transition-colors disabled:opacity-50"
          title="Refresh dashboard metrics"
        >
          <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Dashboard component */}
      <StickyDashboard data={snapshot.dashboardMetrics} />

      {/* Source summary footer */}
      {snapshot.sourceSummary && (
        <div className="mt-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-100">
          <div className="text-[9px] uppercase tracking-widest text-slate-400 mb-1">
            Data Sources
          </div>
          <div className="flex flex-wrap gap-2 text-[10px] text-slate-600">
            {Object.entries(snapshot.sourceSummary.bySource || {}).map(([source, count]) => (
              <span key={source} className="flex items-center gap-1">
                <span className="font-medium">{source}:</span>
                <span className="text-slate-500">{count as number}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveDashboard;

