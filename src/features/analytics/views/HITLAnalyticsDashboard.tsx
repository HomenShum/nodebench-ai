"use client";

import React, { useState, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import {
  CheckCircle2,
  XCircle,
  Edit3,
  TrendingUp,
  Clock,
  BarChart3,
  AlertTriangle,
  Lightbulb,
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
  color?: 'green' | 'red' | 'blue' | 'yellow' | 'gray' | 'purple';
}

function MetricCard({ title, value, subtitle, icon, trend, color = 'blue' }: MetricCardProps) {
  const colorClasses = {
    green: 'bg-green-50 text-green-600 border-green-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    gray: 'bg-gray-50 text-gray-600 border-gray-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
  };

  // Create accessible description
  const ariaLabel = `${title}: ${value}${subtitle ? `. ${subtitle}` : ''}${trend ? `. Trend: ${trend.direction === 'up' ? 'increasing' : 'decreasing'} by ${Math.abs(trend.value)} percent` : ''
    }`;

  return (
    <div
      className={`border rounded-lg p-4 ${colorClasses[color]}`}
      role="article"
      aria-label={ariaLabel}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="text-sm font-medium opacity-75">{title}</div>
        <div className="opacity-60">{icon}</div>
      </div>
      <div className="text-2xl font-bold mb-1">{value}</div>
      {subtitle && <div className="text-xs opacity-60">{subtitle}</div>}
      {trend && (
        <div className={`flex items-center gap-1 text-xs mt-2 ${trend.direction === 'up' ? 'text-green-600' : 'text-red-600'
          }`}>
          <TrendingUp size={12} className={trend.direction === 'down' ? 'rotate-180' : ''} />
          <span>{Math.abs(trend.value)}%</span>
        </div>
      )}
    </div>
  );
}

interface RequestTypeBarProps {
  requestType: string;
  avgReviewTimeSeconds: number;
  approvalRate: number;
  count: number;
  maxTime: number;
}

function RequestTypeBar({ requestType, avgReviewTimeSeconds, approvalRate, count, maxTime }: RequestTypeBarProps) {
  const percentage = maxTime > 0 ? (avgReviewTimeSeconds / maxTime) * 100 : 0;

  return (
    <div className="py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-center justify-between mb-2">
        <div className="flex-1">
          <div className="text-sm font-medium text-gray-800">{requestType}</div>
          <div className="text-xs text-gray-500 mt-1">
            {count} {count === 1 ? 'decision' : 'decisions'} • {(approvalRate * 100).toFixed(0)}% approved
          </div>
        </div>
        <div className="text-sm font-mono font-semibold text-gray-700 ml-4">
          {avgReviewTimeSeconds.toFixed(1)}s
        </div>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

interface ModifiedFieldBarProps {
  field: string;
  count: number;
  maxCount: number;
}

function ModifiedFieldBar({ field, count, maxCount }: ModifiedFieldBarProps) {
  const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;

  return (
    <div className="py-2 border-b border-gray-100 last:border-0">
      <div className="flex items-center justify-between mb-1">
        <div className="text-sm text-gray-700 font-medium">{field}</div>
        <div className="text-xs text-gray-500 font-mono">
          {count} {count === 1 ? 'modification' : 'modifications'}
        </div>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-purple-400 to-purple-500 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default function HITLAnalyticsDashboard() {
  const [dateRange, setDateRange] = useState<{ startDate?: number; endDate?: number }>({});

  // Get approval rate metrics
  const approvalData = useQuery(
    api.domains.hitl.decisions.getHitlApprovalRate,
    dateRange
  );

  // Get average review time by request type
  const reviewTimeByType = useQuery(
    api.domains.hitl.decisions.getAverageReviewTimeByType,
    dateRange
  );

  // Get most modified fields
  const modifiedFields = useQuery(
    api.domains.hitl.decisions.getMostModifiedFields,
    { limit: 10 }
  );

  // Calculate metrics
  const metrics = useMemo(() => {
    if (!approvalData) return null;

    const {
      total,
      approved,
      rejected,
      modified,
      escalated,
      deferred,
      approvalRate,
      rejectionRate,
      modificationRate,
      avgReviewTimeMs,
      avgReviewTimeSeconds,
    } = approvalData;

    // Calculate efficiency: high approval rate + low review time = good
    const efficiency =
      approvalRate > 0.7 && avgReviewTimeSeconds < 10 ? 'high' :
        approvalRate > 0.5 && avgReviewTimeSeconds < 30 ? 'medium' : 'low';

    return {
      total,
      approved,
      rejected,
      modified,
      escalated,
      deferred,
      approvalRate,
      rejectionRate,
      modificationRate,
      avgReviewTimeMs,
      avgReviewTimeSeconds,
      efficiency,
    };
  }, [approvalData]);

  const maxReviewTime = reviewTimeByType && reviewTimeByType.length > 0
    ? Math.max(...reviewTimeByType.map(r => r.avgReviewTimeSeconds))
    : 0;

  const maxModifiedCount = modifiedFields && modifiedFields.length > 0
    ? Math.max(...modifiedFields.map(f => f.count))
    : 0;

  const isLoading = approvalData === undefined || reviewTimeByType === undefined;

  return (
    <div className="min-h-screen bg-canvas-warm p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-stone-900 flex items-center gap-2">
              <Activity size={32} />
              HITL Decision Analytics
            </h1>
            <p className="text-stone-600 mt-1">
              Human-in-the-loop review performance and automation opportunities
            </p>
          </div>

          {/* Date Range Selector */}
          <div className="flex items-center gap-3">
            <label htmlFor="date-range-select" className="sr-only">
              Select date range for analytics
            </label>
            <select
              id="date-range-select"
              aria-label="Date range filter"
              value={dateRange.startDate ? 'custom' : 'all'}
              onChange={(e) => {
                if (e.target.value === 'all') {
                  setDateRange({});
                } else if (e.target.value === '7d') {
                  setDateRange({
                    startDate: Date.now() - 7 * 24 * 60 * 60 * 1000,
                    endDate: Date.now(),
                  });
                } else if (e.target.value === '30d') {
                  setDateRange({
                    startDate: Date.now() - 30 * 24 * 60 * 60 * 1000,
                    endDate: Date.now(),
                  });
                }
              }}
              className="px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Time</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <Activity className="animate-spin mx-auto text-stone-400 mb-2" size={32} />
            <p className="text-stone-600">Loading metrics...</p>
          </div>
        )}

        {/* Metrics Content */}
        {!isLoading && metrics && (
          <>
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Total Decisions"
                value={metrics.total}
                subtitle="HITL reviews completed"
                icon={<BarChart3 size={20} />}
                color="blue"
              />

              <MetricCard
                title="Approval Rate"
                value={`${(metrics.approvalRate * 100).toFixed(1)}%`}
                subtitle={`${metrics.approved} approved`}
                icon={<CheckCircle2 size={20} />}
                color="green"
              />

              <MetricCard
                title="Modification Rate"
                value={`${(metrics.modificationRate * 100).toFixed(1)}%`}
                subtitle={`${metrics.modified} modified`}
                icon={<Edit3 size={20} />}
                color="yellow"
              />

              <MetricCard
                title="Avg Review Time"
                value={`${metrics.avgReviewTimeSeconds.toFixed(1)}s`}
                subtitle="Time to decision"
                icon={<Clock size={20} />}
                color="purple"
              />
            </div>

            {/* Second Row Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard
                title="Rejection Rate"
                value={`${(metrics.rejectionRate * 100).toFixed(1)}%`}
                subtitle={`${metrics.rejected} rejected`}
                icon={<XCircle size={20} />}
                color="red"
              />

              <MetricCard
                title="Escalated"
                value={metrics.escalated}
                subtitle="Sent to higher review"
                icon={<TrendingUp size={20} />}
                color="yellow"
              />

              <MetricCard
                title="Deferred"
                value={metrics.deferred}
                subtitle="Delayed decisions"
                icon={<Clock size={20} />}
                color="gray"
              />
            </div>

            {/* Decision Breakdown */}
            <div className="bg-white border border-stone-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-stone-900">
                  Decision Breakdown
                </h2>
                <span className="text-sm text-stone-500">
                  {metrics.total} total decisions
                </span>
              </div>

              <div className="grid grid-cols-5 gap-3">
                <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-2xl font-bold text-green-600">{metrics.approved}</div>
                  <div className="text-xs text-green-700 mt-1">Approved</div>
                </div>

                <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="text-2xl font-bold text-red-600">{metrics.rejected}</div>
                  <div className="text-xs text-red-700 mt-1">Rejected</div>
                </div>

                <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="text-2xl font-bold text-yellow-600">{metrics.modified}</div>
                  <div className="text-xs text-yellow-700 mt-1">Modified</div>
                </div>

                <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="text-2xl font-bold text-purple-600">{metrics.escalated}</div>
                  <div className="text-xs text-purple-700 mt-1">Escalated</div>
                </div>

                <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="text-2xl font-bold text-gray-600">{metrics.deferred}</div>
                  <div className="text-xs text-gray-700 mt-1">Deferred</div>
                </div>
              </div>
            </div>

            {/* Average Review Time by Request Type */}
            <div className="bg-white border border-stone-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-stone-900">
                  Review Time by Request Type
                </h2>
                <span className="text-sm text-stone-500">
                  {reviewTimeByType?.length || 0} types
                </span>
              </div>

              {!reviewTimeByType || reviewTimeByType.length === 0 ? (
                <div className="text-center py-8 text-stone-500">
                  No request types recorded yet
                </div>
              ) : (
                <div className="space-y-1">
                  {reviewTimeByType.map((typeData, index) => (
                    <RequestTypeBar
                      key={index}
                      requestType={typeData.requestType}
                      avgReviewTimeSeconds={typeData.avgReviewTimeSeconds}
                      approvalRate={typeData.approvalRate}
                      count={typeData.count}
                      maxTime={maxReviewTime}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Most Modified Fields */}
            <div className="bg-white border border-stone-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-stone-900">
                  Most Modified Fields
                </h2>
                <span className="text-sm text-stone-500">
                  {modifiedFields?.length || 0} fields
                </span>
              </div>

              {!modifiedFields || modifiedFields.length === 0 ? (
                <div className="text-center py-8 text-stone-500">
                  No field modifications recorded yet
                </div>
              ) : (
                <div className="space-y-1">
                  {modifiedFields.map((field, index) => (
                    <ModifiedFieldBar
                      key={index}
                      field={field.field}
                      count={field.count}
                      maxCount={maxModifiedCount}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Insights */}
            {metrics.total > 10 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Lightbulb className="text-blue-600 mt-0.5" size={20} />
                  <div>
                    <h3 className="font-semibold text-blue-900 mb-2">
                      Automation Opportunities
                    </h3>
                    <ul className="text-sm text-blue-700 space-y-2">
                      {metrics.approvalRate > 0.8 && (
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 font-bold">✓</span>
                          <span>
                            High approval rate ({(metrics.approvalRate * 100).toFixed(0)}%) -
                            Consider automating these decisions with confidence thresholds
                          </span>
                        </li>
                      )}
                      {metrics.modificationRate > 0.3 && (
                        <li className="flex items-start gap-2">
                          <span className="text-yellow-600 font-bold">⚠</span>
                          <span>
                            High modification rate ({(metrics.modificationRate * 100).toFixed(0)}%) -
                            Review most-modified fields below to improve agent output quality
                          </span>
                        </li>
                      )}
                      {metrics.avgReviewTimeSeconds < 5 && (
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 font-bold">✓</span>
                          <span>
                            Fast review time ({metrics.avgReviewTimeSeconds.toFixed(1)}s) -
                            Decisions are clear and straightforward
                          </span>
                        </li>
                      )}
                      {metrics.avgReviewTimeSeconds > 30 && (
                        <li className="flex items-start gap-2">
                          <span className="text-red-600 font-bold">⚠</span>
                          <span>
                            Slow review time ({metrics.avgReviewTimeSeconds.toFixed(1)}s) -
                            Consider improving context or breaking down complex decisions
                          </span>
                        </li>
                      )}
                      {metrics.escalated > metrics.total * 0.1 && (
                        <li className="flex items-start gap-2">
                          <span className="text-yellow-600 font-bold">⚠</span>
                          <span>
                            High escalation rate ({((metrics.escalated / metrics.total) * 100).toFixed(0)}%) -
                            Review escalation criteria and provide better guidance
                          </span>
                        </li>
                      )}
                      {metrics.efficiency === 'high' && (
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 font-bold">✓</span>
                          <span>
                            Excellent HITL efficiency - high approval rate with quick decisions
                          </span>
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Empty State */}
            {metrics.total === 0 && (
              <div className="bg-white border border-stone-200 rounded-lg p-12 text-center">
                <Activity className="mx-auto text-stone-300 mb-4" size={48} />
                <h3 className="text-lg font-semibold text-stone-900 mb-2">
                  No HITL Decisions Yet
                </h3>
                <p className="text-stone-600 mb-4">
                  HITL decision data will appear here once agents request human input and users respond.
                </p>
                <p className="text-sm text-stone-500">
                  Make sure the HumanRequestCard component is integrated and agents are using the askHuman tool.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
