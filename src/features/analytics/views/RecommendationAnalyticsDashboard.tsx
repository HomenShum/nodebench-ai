"use client";

import React, { useState, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import {
  ThumbsUp,
  ThumbsDown,
  Eye,
  EyeOff,
  X,
  TrendingUp,
  Clock,
  BarChart3,
  PieChart,
  Activity,
} from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  color?: 'green' | 'red' | 'blue' | 'yellow' | 'gray';
}

function MetricCard({ title, value, subtitle, icon, trend, color = 'blue' }: MetricCardProps) {
  const dotColor = {
    green: 'bg-green-500',
    red: 'bg-red-500',
    blue: 'bg-[var(--accent-primary)]',
    yellow: 'bg-yellow-500',
    gray: 'bg-content-muted',
  };

  return (
    <div className="bg-surface border border-edge rounded-lg p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${dotColor[color]}`} />
          <span className="text-sm font-medium text-content-secondary">{title}</span>
        </div>
        <div className="text-content-muted">{icon}</div>
      </div>
      <div className="text-2xl font-bold text-content mb-1">{value}</div>
      {subtitle && <div className="text-xs text-content-muted">{subtitle}</div>}
      {trend && (
        <div className={`flex items-center gap-1 text-xs mt-2 ${trend.direction === 'up' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          }`}>
          <TrendingUp size={12} className={trend.direction === 'down' ? 'rotate-180' : ''} />
          <span>{Math.abs(trend.value)}%</span>
        </div>
      )}
    </div>
  );
}

interface RejectionReasonBarProps {
  reason: string;
  count: number;
  maxCount: number;
}

function RejectionReasonBar({ reason, count, maxCount }: RejectionReasonBarProps) {
  const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;

  return (
    <div className="py-2 border-b border-edge last:border-0">
      <div className="flex items-center justify-between mb-1">
        <div className="text-sm text-content-secondary truncate flex-1">
          {reason || 'No reason given'}
        </div>
        <div className="text-xs text-content-secondary font-mono ml-2">
          {count} {count === 1 ? 'rejection' : 'rejections'}
        </div>
      </div>
      <div className="h-1.5 bg-surface-secondary rounded-full overflow-hidden">
        <div
          className="h-full bg-red-500/60 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default function RecommendationAnalyticsDashboard() {
  const [dateRange, setDateRange] = useState<{ start?: number; end?: number }>({});

  // Get acceptance rate data
  const acceptanceData = useQuery(
    api.domains.recomm.feedback.getRecommendationAcceptanceRate,
    dateRange
  );

  // Get top rejection reasons
  const rejectionReasons = useQuery(
    api.domains.recomm.feedback.getTopRejectionReasons,
    {
      startDate: dateRange.start,
      endDate: dateRange.end,
      limit: 10,
    }
  );

  // Get average time to action
  const avgTimeData = useQuery(
    api.domains.recomm.feedback.getAverageTimeToAction,
    {}
  );

  // Calculate metrics
  const metrics = useMemo(() => {
    if (!acceptanceData) return null;

    const {
      total,
      accepted,
      rejected,
      ignored,
      dismissed,
      snoozed,
      acceptanceRate,
      rejectionRate,
      avgValue,
    } = acceptanceData;

    const engagementRate = total > 0 ? (accepted + rejected) / total : 0;
    const ignoreRate = total > 0 ? ignored / total : 0;

    return {
      total,
      accepted,
      rejected,
      ignored,
      dismissed,
      snoozed,
      acceptanceRate,
      rejectionRate,
      engagementRate,
      ignoreRate,
      avgValue,
    };
  }, [acceptanceData]);

  const maxReasonCount = rejectionReasons && rejectionReasons.length > 0
    ? Math.max(...rejectionReasons.map(r => r.count))
    : 0;

  const isLoading = acceptanceData === undefined || rejectionReasons === undefined;

  return (
    <div className="nb-page-shell">
      <div className="nb-page-inner">
        <div className="nb-page-frame space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="type-page-title text-content flex items-center gap-2">
              <BarChart3 size={32} />
              Recommendation Analytics
            </h1>
            <p className="text-content-secondary mt-1">
              User feedback and engagement metrics for recommendations
            </p>
          </div>

          {/* Date Range Selector */}
          <div className="flex items-center gap-3">
            <select
              value={dateRange.start ? 'custom' : 'all'}
              onChange={(e) => {
                if (e.target.value === 'all') {
                  setDateRange({});
                } else if (e.target.value === '7d') {
                  setDateRange({
                    start: Date.now() - 7 * 24 * 60 * 60 * 1000,
                    end: Date.now(),
                  });
                } else if (e.target.value === '30d') {
                  setDateRange({
                    start: Date.now() - 30 * 24 * 60 * 60 * 1000,
                    end: Date.now(),
                  });
                }
              }}
              className="px-3 py-2 border border-edge rounded-lg text-sm bg-surface text-content focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/50"
            >
              <option value="all">All Time</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>
        </div>

        {/* Loading State — skeleton grid */}
        {isLoading && (
          <div className="space-y-6 no-skeleton-animation" aria-busy="true" aria-live="polite">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-28 rounded-lg bg-surface-secondary/50" />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-48 rounded-lg bg-surface-secondary/50" />
              <div className="h-48 rounded-lg bg-surface-secondary/50" />
            </div>
          </div>
        )}

        {/* Metrics Content */}
        {!isLoading && metrics && (
          <>
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Total Recommendations"
                value={metrics.total}
                subtitle="Shown to users"
                icon={<Eye size={20} />}
                color="blue"
              />

              <MetricCard
                title="Acceptance Rate"
                value={`${parseFloat((metrics.acceptanceRate * 100).toFixed(1))}%`}
                subtitle={`${metrics.accepted} accepted`}
                icon={<ThumbsUp size={20} />}
                color="green"
              />

              <MetricCard
                title="Rejection Rate"
                value={`${parseFloat((metrics.rejectionRate * 100).toFixed(1))}%`}
                subtitle={`${metrics.rejected} rejected`}
                icon={<ThumbsDown size={20} />}
                color="red"
              />

              <MetricCard
                title="Ignore Rate"
                value={`${parseFloat((metrics.ignoreRate * 100).toFixed(1))}%`}
                subtitle={`${metrics.ignored} ignored`}
                icon={<EyeOff size={20} />}
                color="yellow"
              />
            </div>

            {/* Second Row Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard
                title="Engagement Rate"
                value={`${parseFloat((metrics.engagementRate * 100).toFixed(1))}%`}
                subtitle="Accepted or rejected"
                icon={<Activity size={20} />}
                color="blue"
              />

              <MetricCard
                title="Average Rating"
                value={metrics.avgValue !== null ? `${(metrics.avgValue * 5).toFixed(1)}/5.0` : 'No ratings yet'}
                subtitle={metrics.avgValue !== null ? 'From accepted recommendations' : 'Users haven\'t rated yet'}
                icon={<ThumbsUp size={20} />}
                color={metrics.avgValue !== null ? 'green' : 'gray'}
              />

              <MetricCard
                title="Avg Time to Action"
                value={avgTimeData?.avgTimeMs ? `${avgTimeData.avgTimeSeconds.toFixed(1)}s` : 'No data yet'}
                subtitle={avgTimeData?.count ? `${avgTimeData.count} actions tracked` : 'No actions yet'}
                icon={<Clock size={20} />}
                color="blue"
              />
            </div>

            {/* Action Breakdown */}
            <div className="bg-surface border border-edge rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-content">
                  Action Breakdown
                </h2>
                <span className="text-sm text-content-secondary">
                  {metrics.total} total actions
                </span>
              </div>

              <div className="grid grid-cols-5 gap-3">
                {[
                  { label: 'Accepted', value: metrics.accepted, dot: 'bg-green-500' },
                  { label: 'Rejected', value: metrics.rejected, dot: 'bg-red-500' },
                  { label: 'Ignored', value: metrics.ignored, dot: 'bg-yellow-500' },
                  { label: 'Dismissed', value: metrics.dismissed, dot: 'bg-content-muted' },
                  { label: 'Snoozed', value: metrics.snoozed, dot: 'bg-[var(--accent-primary)]' },
                ].map(({ label, value: v, dot }) => (
                  <div key={label} className="text-center p-3 bg-surface-secondary rounded-lg border border-edge">
                    <div className="text-2xl font-bold text-content">{v}</div>
                    <div className="flex items-center justify-center gap-1.5 mt-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                      <span className="text-xs text-content-muted">{label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Rejection Reasons */}
            <div className="bg-surface border border-edge rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-content">
                  Top Rejection Reasons
                </h2>
                <span className="text-sm text-content-secondary">
                  {rejectionReasons?.length || 0} unique reasons
                </span>
              </div>

              {!rejectionReasons || rejectionReasons.length === 0 ? (
                <div className="text-center py-8 text-content-secondary">
                  No rejection reasons recorded yet
                </div>
              ) : (
                <div className="space-y-1">
                  {rejectionReasons.map((reason, index) => (
                    <RejectionReasonBar
                      key={index}
                      reason={reason.reason}
                      count={reason.count}
                      maxCount={maxReasonCount}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Insights */}
            {metrics.total > 0 && (
              <div className="bg-[var(--accent-primary-bg)] border border-[var(--accent-primary)]/25 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <PieChart className="text-[var(--accent-primary)] mt-0.5" size={20} />
                  <div>
                    <h3 className="font-semibold text-[var(--accent-primary)] mb-1">
                      Insights
                    </h3>
                    <ul className="text-sm text-content-secondary space-y-1">
                      {metrics.acceptanceRate > 0.5 && (
                        <li>✓ High acceptance rate ({(metrics.acceptanceRate * 100).toFixed(0)}%) - recommendations are valuable</li>
                      )}
                      {metrics.acceptanceRate < 0.2 && metrics.total > 10 && (
                        <li>⚠ Low acceptance rate ({(metrics.acceptanceRate * 100).toFixed(0)}%) - consider improving recommendation quality</li>
                      )}
                      {metrics.ignoreRate > 0.5 && (
                        <li>⚠ High ignore rate ({(metrics.ignoreRate * 100).toFixed(0)}%) - recommendations may not be relevant or timely</li>
                      )}
                      {metrics.avgValue && metrics.avgValue > 0.8 && (
                        <li>✓ High average rating ({(metrics.avgValue * 5).toFixed(1)}/5) - users find recommendations very helpful</li>
                      )}
                      {avgTimeData?.avgTimeSeconds && avgTimeData.avgTimeSeconds < 5 && (
                        <li>✓ Quick decision time ({avgTimeData.avgTimeSeconds.toFixed(1)}s) - recommendations are clear and actionable</li>
                      )}
                      {avgTimeData?.avgTimeSeconds && avgTimeData.avgTimeSeconds > 30 && (
                        <li>⚠ Slow decision time ({avgTimeData.avgTimeSeconds.toFixed(1)}s) - recommendations may be unclear or complex</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Empty State */}
            {metrics.total === 0 && (
              <div className="bg-surface border border-edge rounded-lg p-12 text-center">
                <BarChart3 className="mx-auto text-content-muted mb-4" size={48} />
                <h3 className="text-lg font-semibold text-content mb-2">
                  No Recommendation Data Yet
                </h3>
                <p className="text-content-secondary mb-4">
                  Recommendation feedback will appear here once users interact with suggestions.
                </p>
                <p className="text-sm text-content-secondary">
                  Make sure the RecommendationPanel component is integrated into your app.
                </p>
              </div>
            )}
          </>
        )}
        </div>
      </div>
    </div>
  );
}
