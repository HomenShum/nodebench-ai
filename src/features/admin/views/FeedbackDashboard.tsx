/**
 * Admin Feedback Dashboard
 * Invite-only dashboard for viewing all user feedback and analytics
 *
 * Access: hshum2018@gmail.com + test accounts only
 *
 * Features:
 * - Overview stats (30-day)
 * - Feedback by detector
 * - Recent feedback list
 * - Top complaints
 * - Export CSV
 */

import React, { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Download,
  Filter,
  Search,
} from "lucide-react";

// Components
import { OverviewStats } from "../components/OverviewStats";
import { DetectorTable } from "../components/DetectorTable";
import { RecentFeedbackList } from "../components/RecentFeedbackList";
import { TopComplaints } from "../components/TopComplaints";
import { FeedbackFilters } from "../components/FeedbackFilters";

interface FeedbackFilters {
  dateRange: "7d" | "30d" | "90d" | "all";
  feedbackType?: "useful" | "not_useful" | "all";
  detectorName?: string;
  userEmail?: string;
}

export function FeedbackDashboard() {
  const [filters, setFilters] = useState<FeedbackFilters>({
    dateRange: "30d",
    feedbackType: "all",
  });
  const [searchQuery, setSearchQuery] = useState("");

  // Check admin access
  const adminAccess = useQuery(api.proactive.adminQueries.checkAdminAccess);

  // Fetch feedback data
  const feedbackData = useQuery(
    api.proactive.adminQueries.getAllFeedback,
    adminAccess?.hasAccess
      ? {
          filters: {
            startDate: getStartDate(filters.dateRange),
            endDate: Date.now(),
            feedbackType:
              filters.feedbackType === "all" ? undefined : filters.feedbackType,
            detectorName: filters.detectorName,
          },
        }
      : "skip"
  );

  // Calculate metrics
  const stats = useMemo(() => {
    if (!feedbackData) return null;

    const total = feedbackData.feedback.length;
    const useful = feedbackData.feedback.filter(
      (f) => f.feedbackType === "useful"
    ).length;
    const notUseful = feedbackData.feedback.filter(
      (f) => f.feedbackType === "not_useful"
    ).length;
    const noFeedback = total - useful - notUseful;

    return {
      total,
      useful,
      notUseful,
      noFeedback,
      usefulRate: total > 0 ? (useful / total) * 100 : 0,
      notUsefulRate: total > 0 ? (notUseful / total) * 100 : 0,
      trending: feedbackData.stats?.trending || [],
    };
  }, [feedbackData]);

  const handleExportCSV = () => {
    if (!feedbackData) return;

    const csv = convertToCSV(feedbackData.feedback);
    downloadCSV(csv, `feedback-export-${Date.now()}.csv`);
  };

  // Unauthorized access
  if (!adminAccess?.hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
            Access Denied
          </h1>
          <p className="text-[var(--text-secondary)]">
            You don't have permission to access the admin dashboard.
          </p>
          <p className="text-sm text-[var(--text-muted)] mt-2">
            Contact hshum2018@gmail.com for access.
          </p>
        </div>
      </div>
    );
  }

  // Loading
  if (!feedbackData || !stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[var(--text-primary)]">
                Admin Feedback Dashboard
              </h1>
              <p className="text-[var(--text-secondary)] mt-1">
                {adminAccess.email} • Last updated:{" "}
                {new Date().toLocaleTimeString()}
              </p>
            </div>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">
            Overview - Last {filters.dateRange === "7d" ? "7" : filters.dateRange === "30d" ? "30" : "90"} Days
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard
              label="Total Feedback"
              value={stats.total}
              change={stats.trending.find((t) => t.metric === "total")?.change}
            />
            <StatCard
              label="Useful"
              value={stats.useful}
              percentage={stats.usefulRate}
              color="green"
              change={stats.trending.find((t) => t.metric === "useful")?.change}
            />
            <StatCard
              label="Not Useful"
              value={stats.notUseful}
              percentage={stats.notUsefulRate}
              color="red"
              change={
                stats.trending.find((t) => t.metric === "not_useful")?.change
              }
            />
            <StatCard
              label="No Feedback"
              value={stats.noFeedback}
              percentage={(stats.noFeedback / stats.total) * 100}
              color="gray"
            />
          </div>

          {/* Trending Issues */}
          {stats.trending.filter((t) => t.alert).length > 0 && (
            <div className="mt-4 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span className="font-medium text-amber-600">
                  Trending Issues
                </span>
              </div>
              <ul className="space-y-1 text-sm text-[var(--text-secondary)]">
                {stats.trending
                  .filter((t) => t.alert)
                  .map((issue, idx) => (
                    <li key={idx}>
                      • {issue.description}
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="mb-6">
          <FeedbackFilters
            filters={filters}
            onFiltersChange={setFilters}
            detectors={feedbackData.stats.byDetector.map((d) => d.detectorName)}
          />
        </div>

        {/* Feedback by Detector */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">
            Feedback by Detector
          </h2>
          <DetectorTable
            data={feedbackData.stats.byDetector}
            onDetectorClick={(name) => setFilters({ ...filters, detectorName: name })}
          />
        </div>

        {/* Recent Feedback */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">
              Recent Feedback
            </h2>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search by user email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 rounded border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)]"
              />
            </div>
          </div>
          <RecentFeedbackList
            feedback={feedbackData.feedback.filter((f) =>
              searchQuery
                ? f.userId.includes(searchQuery) ||
                  f.contextSnapshot?.detectorName
                    ?.toLowerCase()
                    .includes(searchQuery.toLowerCase())
                : true
            )}
          />
        </div>

        {/* Top Complaints */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">
            Top Complaints (Last 7 Days)
          </h2>
          <TopComplaints complaints={feedbackData.stats.topComplaints} />
        </div>
      </div>
    </div>
  );
}

// Helper Components

function StatCard({
  label,
  value,
  percentage,
  color = "blue",
  change,
}: {
  label: string;
  value: number;
  percentage?: number;
  color?: "green" | "red" | "blue" | "gray";
  change?: number;
}) {
  const colorClasses = {
    green: "text-green-600 bg-green-500/10 border-green-500/20",
    red: "text-red-600 bg-red-500/10 border-red-500/20",
    blue: "text-blue-600 bg-blue-500/10 border-blue-500/20",
    gray: "text-gray-600 bg-gray-500/10 border-gray-500/20",
  };

  return (
    <div className="p-4 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)]">
      <div className="text-sm text-[var(--text-secondary)] mb-1">{label}</div>
      <div className="text-2xl font-bold text-[var(--text-primary)] mb-1">
        {value.toLocaleString()}
      </div>
      {percentage !== undefined && (
        <div className={cn("text-sm font-medium", colorClasses[color])}>
          {percentage.toFixed(1)}%
        </div>
      )}
      {change !== undefined && change !== 0 && (
        <div className="flex items-center gap-1 mt-2 text-xs">
          {change > 0 ? (
            <>
              <TrendingUp className="w-3 h-3 text-red-500" />
              <span className="text-red-500">+{change}%</span>
            </>
          ) : (
            <>
              <TrendingDown className="w-3 h-3 text-green-500" />
              <span className="text-green-500">{change}%</span>
            </>
          )}
          <span className="text-[var(--text-muted)]">vs last period</span>
        </div>
      )}
    </div>
  );
}

// Helper Functions

function getStartDate(range: string): number {
  const now = Date.now();
  switch (range) {
    case "7d":
      return now - 7 * 24 * 60 * 60 * 1000;
    case "30d":
      return now - 30 * 24 * 60 * 60 * 1000;
    case "90d":
      return now - 90 * 24 * 60 * 60 * 1000;
    default:
      return 0; // All time
  }
}

function convertToCSV(feedback: any[]): string {
  const headers = [
    "Timestamp",
    "User",
    "Opportunity Type",
    "Detector",
    "Feedback Type",
    "Reason",
    "Comment",
  ];

  const rows = feedback.map((f) => [
    new Date(f.createdAt).toISOString(),
    f.userId,
    f.contextSnapshot?.opportunityType || "",
    f.contextSnapshot?.detectorName || "",
    f.feedbackType,
    f.reason || "",
    (f.specificIssues || []).join("; "),
  ]);

  return [headers, ...rows].map((row) => row.join(",")).join("\n");
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
