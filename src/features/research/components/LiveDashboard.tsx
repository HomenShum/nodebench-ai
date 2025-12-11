"use client";

import React from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { StickyDashboard } from "./StickyDashboard";
import { RefreshCw, AlertCircle, ChevronLeft, ChevronRight, Calendar, RotateCcw } from "lucide-react";
import type { DashboardState } from "@/features/research/types";
import { useBriefDateSelection } from "@/lib/useBriefDateSelection";

/**
 * LiveDashboard - Wrapper component that fetches live dashboard data
 * from daily brief snapshots and displays it using StickyDashboard
 *
 * Features:
 * - Auto-refresh when new data available
 * - Manual refresh button
 * - Historical data navigation (last 7 days)
 * - Date picker for specific dates
 * - "Return to Latest" button when viewing historical data
 */
export const LiveDashboard: React.FC<{
  fallbackData?: DashboardState;
}> = ({ fallbackData }) => {
  const [selectedDate, setSelectedDate] = useBriefDateSelection();
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // Fetch latest snapshot or specific date
  const latestSnapshot = useQuery(
    api.domains.research.dashboardQueries.getLatestDashboardSnapshot,
    selectedDate ? "skip" : {}
  );

  const dateSnapshot = useQuery(
    api.domains.research.dashboardQueries.getDashboardSnapshotByDate,
    selectedDate ? { dateString: selectedDate } : "skip"
  );

  // Fetch historical snapshots for navigation
  const historicalSnapshots = useQuery(
    api.domains.research.dashboardQueries.getHistoricalSnapshots,
    { days: 7 }
  );

  const refreshMetrics = useAction(api.domains.research.dashboardQueries.refreshDashboardMetrics);

  // Determine which snapshot to display
  const snapshot = selectedDate ? dateSnapshot : latestSnapshot;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshMetrics({});
      setSelectedDate(null); // Return to latest after refresh
    } catch (error) {
      console.error("Failed to refresh dashboard metrics:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Navigation helpers
  const availableDates = React.useMemo(() => {
    if (!historicalSnapshots) return [];
    return historicalSnapshots.map(s => s.dateString).sort().reverse();
  }, [historicalSnapshots]);

  const currentDateIndex = React.useMemo(() => {
    if (!selectedDate || availableDates.length === 0) return -1;
    return availableDates.indexOf(selectedDate);
  }, [selectedDate, availableDates]);

  const canGoPrevious = currentDateIndex < availableDates.length - 1;
  const canGoNext = currentDateIndex > 0;

  const handlePreviousDay = () => {
    if (canGoPrevious) {
      setSelectedDate(availableDates[currentDateIndex + 1]);
    }
  };

  const handleNextDay = () => {
    if (canGoNext) {
      setSelectedDate(availableDates[currentDateIndex - 1]);
    }
  };

  const handleReturnToLatest = () => {
    setSelectedDate(null);
  };

  const isViewingHistorical = selectedDate !== null;

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
              type="button"
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
                type="button"
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
  const displayDate = selectedDate || snapshot.dateString;

  return (
    <div className="relative">
      {/* Historical Data Navigation Bar */}
      {isViewingHistorical && (
        <div className="mb-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-3 h-3 text-amber-600" />
              <span className="text-xs text-amber-800 font-medium">
                Viewing historical data: {displayDate}
              </span>
            </div>
            <button
              type="button"
              onClick={handleReturnToLatest}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-amber-600 hover:bg-amber-700 text-white rounded transition-colors"
              title="Return to latest data"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Latest</span>
            </button>
          </div>
        </div>
      )}

      {/* Header with navigation, timestamp, and refresh button */}
      <div className="flex items-center justify-between mb-2 px-1">
        {/* Left: Date Navigation */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePreviousDay}
              disabled={!canGoPrevious}
              className="p-1 hover:bg-slate-100 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Previous day"
            >
              <ChevronLeft className="w-3 h-3 text-slate-600" />
            </button>
            <button
              type="button"
              onClick={handleNextDay}
              disabled={!canGoNext}
              className="p-1 hover:bg-slate-100 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Next day"
            >
              <ChevronRight className="w-3 h-3 text-slate-600" />
            </button>
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            {isViewingHistorical ? (
              <span className="text-amber-600 font-medium">{displayDate}</span>
            ) : (
              <span>Latest: {lastUpdated}</span>
            )}
          </div>
        </div>

        {/* Right: Refresh Button */}
        <button
          type="button"
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
          <div className="flex items-center justify-between mb-1">
            <div className="text-[9px] uppercase tracking-widest text-slate-400">
              Data Sources
            </div>
            {availableDates.length > 0 && (
              <div className="text-[9px] text-slate-500">
                {availableDates.length} day{availableDates.length !== 1 ? 's' : ''} available
              </div>
            )}
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

      {/* Historical Date Picker */}
      {availableDates.length > 1 && (
        <div className="mt-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-100">
          <div className="text-[9px] uppercase tracking-widest text-slate-400 mb-2">
            Historical Data
          </div>
          <div className="flex flex-wrap gap-1">
            {availableDates.map((date) => (
              <button
                key={date}
                type="button"
                onClick={() => setSelectedDate(date === selectedDate ? null : date)}
                className={`px-2 py-1 text-[10px] rounded transition-colors ${
                  date === displayDate
                    ? 'bg-indigo-600 text-white font-medium'
                    : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                }`}
                title={`View data from ${date}`}
              >
                {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveDashboard;
