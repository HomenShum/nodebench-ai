"use client";

import React, { useState, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import {
  BarChart3,
  TrendingUp,
  Eye,
  MousePointerClick,
  Clock,
  Activity,
  Calendar,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
  };
}

function MetricCard({ title, value, subtitle, icon, trend }: MetricCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div className="text-gray-600 text-sm font-medium">{title}</div>
        <div className="text-gray-400">{icon}</div>
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
      {subtitle && <div className="text-xs text-gray-500">{subtitle}</div>}
      {trend && (
        <div className={`flex items-center gap-1 text-xs mt-2 ${trend.direction === 'up' ? 'text-green-600' :
            trend.direction === 'down' ? 'text-red-600' :
              'text-gray-500'
          }`}>
          {trend.direction === 'up' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          <span>{Math.abs(trend.value)}%</span>
        </div>
      )}
    </div>
  );
}

interface SourcePerformanceBarProps {
  sourceName: string;
  itemCount: number;
  maxCount: number;
  clicks?: number;
  impressions?: number;
  ctr?: number;
}

function SourcePerformanceBar({
  sourceName,
  itemCount,
  maxCount,
  clicks = 0,
  impressions = 0,
  ctr = 0,
}: SourcePerformanceBarProps) {
  const percentage = maxCount > 0 ? (itemCount / maxCount) * 100 : 0;

  return (
    <div className="py-2 border-b border-gray-100 last:border-0">
      <div className="flex items-center justify-between mb-1">
        <div className="text-sm font-medium text-gray-700 truncate flex-1">
          {sourceName}
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="font-mono">{itemCount} items</span>
          {impressions > 0 && (
            <>
              <span className="text-gray-300">|</span>
              <span className="flex items-center gap-1">
                <Eye size={12} />
                {impressions}
              </span>
            </>
          )}
          {clicks > 0 && (
            <>
              <span className="text-gray-300">|</span>
              <span className="flex items-center gap-1">
                <MousePointerClick size={12} />
                {clicks}
              </span>
            </>
          )}
          {ctr > 0 && (
            <>
              <span className="text-gray-300">|</span>
              <span className="font-semibold text-blue-600">
                {(ctr * 100).toFixed(1)}% CTR
              </span>
            </>
          )}
        </div>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

interface CategoryBreakdownProps {
  category: string;
  itemCount: number;
  percentage: number;
  avgReadTime?: number;
}

function CategoryBreakdown({ category, itemCount, percentage, avgReadTime }: CategoryBreakdownProps) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <div className="flex-1">
        <div className="text-sm font-medium text-gray-700">{category}</div>
        <div className="flex items-center gap-2 mt-1">
          <div className="h-1.5 bg-gray-100 rounded-full flex-1 max-w-[100px]">
            <div
              className="h-full bg-purple-500 rounded-full"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <span className="text-xs text-gray-500">{percentage.toFixed(0)}%</span>
        </div>
      </div>
      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span className="font-mono">{itemCount} items</span>
        {avgReadTime && avgReadTime > 0 && (
          <>
            <span className="text-gray-300">|</span>
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {Math.round(avgReadTime)}s
            </span>
          </>
        )}
      </div>
    </div>
  );
}

export default function ComponentMetricsDashboard() {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [dateRange, setDateRange] = useState<number>(7); // Last 7 days

  // Query metrics for selected date
  const todayMetrics = useQuery(
    api.domains.analytics.componentMetrics.getComponentMetricsByDate,
    { date: selectedDate }
  );

  // Query top performing sources
  const startDate = useMemo(() => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() - dateRange);
    return date.toISOString().split('T')[0];
  }, [selectedDate, dateRange]);

  const topSources = useQuery(
    api.domains.analytics.componentMetrics.getTopPerformingSources,
    {
      startDate,
      endDate: selectedDate,
      limit: 10,
    }
  );

  // Calculate aggregate metrics
  const aggregates = useMemo(() => {
    if (!todayMetrics) return null;

    const totalItems = todayMetrics.reduce((sum, m) => sum + m.itemCount, 0);
    const totalImpressions = todayMetrics.reduce((sum, m) => sum + (m.impressions || 0), 0);
    const totalClicks = todayMetrics.reduce((sum, m) => sum + (m.clicks || 0), 0);
    const avgCTR = totalImpressions > 0 ? totalClicks / totalImpressions : 0;

    const metricsWithReadTime = todayMetrics.filter(m => m.avgReadTimeSeconds && m.avgReadTimeSeconds > 0);
    const avgReadTime = metricsWithReadTime.length > 0
      ? metricsWithReadTime.reduce((sum, m) => sum + (m.avgReadTimeSeconds || 0), 0) / metricsWithReadTime.length
      : 0;

    const uniqueSources = new Set(todayMetrics.map(m => m.sourceName)).size;
    const uniqueReportTypes = new Set(todayMetrics.map(m => m.reportType)).size;

    return {
      totalItems,
      totalImpressions,
      totalClicks,
      avgCTR,
      avgReadTime,
      uniqueSources,
      uniqueReportTypes,
    };
  }, [todayMetrics]);

  // Group metrics by source for chart
  const sourceMetrics = useMemo(() => {
    if (!todayMetrics) return [];

    const grouped = new Map<string, {
      sourceName: string;
      itemCount: number;
      impressions: number;
      clicks: number;
      ctr: number;
    }>();

    for (const metric of todayMetrics) {
      const existing = grouped.get(metric.sourceName) || {
        sourceName: metric.sourceName,
        itemCount: 0,
        impressions: 0,
        clicks: 0,
        ctr: 0,
      };

      existing.itemCount += metric.itemCount;
      existing.impressions += metric.impressions || 0;
      existing.clicks += metric.clicks || 0;

      grouped.set(metric.sourceName, existing);
    }

    // Calculate CTR for each source
    for (const [, source] of grouped) {
      source.ctr = source.impressions > 0 ? source.clicks / source.impressions : 0;
    }

    return Array.from(grouped.values())
      .sort((a, b) => b.itemCount - a.itemCount);
  }, [todayMetrics]);

  // Group metrics by category
  const categoryMetrics = useMemo(() => {
    if (!todayMetrics) return [];

    const grouped = new Map<string, {
      category: string;
      itemCount: number;
      avgReadTime: number;
      recordCount: number;
    }>();

    for (const metric of todayMetrics) {
      if (!metric.category) continue;

      const existing = grouped.get(metric.category) || {
        category: metric.category,
        itemCount: 0,
        avgReadTime: 0,
        recordCount: 0,
      };

      existing.itemCount += metric.itemCount;
      if (metric.avgReadTimeSeconds && metric.avgReadTimeSeconds > 0) {
        existing.avgReadTime += metric.avgReadTimeSeconds;
        existing.recordCount++;
      }

      grouped.set(metric.category, existing);
    }

    const total = Array.from(grouped.values()).reduce((sum, c) => sum + c.itemCount, 0);

    return Array.from(grouped.values())
      .map(c => ({
        ...c,
        percentage: total > 0 ? (c.itemCount / total) * 100 : 0,
        avgReadTime: c.recordCount > 0 ? c.avgReadTime / c.recordCount : 0,
      }))
      .sort((a, b) => b.itemCount - a.itemCount);
  }, [todayMetrics]);

  const maxSourceCount = sourceMetrics.length > 0
    ? Math.max(...sourceMetrics.map(s => s.itemCount))
    : 0;

  const isLoading = todayMetrics === undefined || topSources === undefined;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 size={32} />
              Analytics Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              Component-level performance metrics for reports
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Date Selector */}
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-gray-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Range Selector */}
            <select
              value={dateRange}
              onChange={(e) => setDateRange(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={1}>Last 24 hours</option>
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
            </select>

            <button
              onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
              title="Go to today"
            >
              <RefreshCw size={18} className="text-gray-600" />
            </button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <Activity className="animate-spin mx-auto text-gray-400 mb-2" size={32} />
            <p className="text-gray-600">Loading metrics...</p>
          </div>
        )}

        {/* Metrics Content */}
        {!isLoading && aggregates && (
          <>
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Total Items"
                value={aggregates.totalItems}
                subtitle={`From ${aggregates.uniqueSources} sources`}
                icon={<BarChart3 size={20} />}
              />

              <MetricCard
                title="Impressions"
                value={aggregates.totalImpressions > 0 ? aggregates.totalImpressions : 'Not tracked yet'}
                subtitle={aggregates.totalImpressions > 0 ? 'Total views' : 'Integrate tracking to see data'}
                icon={<Eye size={20} />}
              />

              <MetricCard
                title="Click-Through Rate"
                value={aggregates.avgCTR > 0 ? `${(aggregates.avgCTR * 100).toFixed(1)}%` : 'Not tracked yet'}
                subtitle={aggregates.totalClicks > 0 ? `${aggregates.totalClicks} clicks` : 'Integrate tracking to see data'}
                icon={<MousePointerClick size={20} />}
              />

              <MetricCard
                title="Avg Read Time"
                value={aggregates.avgReadTime > 0 ? `${Math.round(aggregates.avgReadTime)}s` : 'Not tracked yet'}
                subtitle={aggregates.avgReadTime > 0 ? 'Average engagement' : 'Integrate tracking to see data'}
                icon={<Clock size={20} />}
              />
            </div>

            {/* Source Performance */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Source Performance
                </h2>
                <span className="text-sm text-gray-500">
                  {sourceMetrics.length} sources tracked
                </span>
              </div>

              {sourceMetrics.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No source data available for {selectedDate}
                </div>
              ) : (
                <div className="space-y-1">
                  {sourceMetrics.map((source) => (
                    <SourcePerformanceBar
                      key={source.sourceName}
                      sourceName={source.sourceName}
                      itemCount={source.itemCount}
                      maxCount={maxSourceCount}
                      clicks={source.clicks}
                      impressions={source.impressions}
                      ctr={source.ctr}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Category Breakdown */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Category Breakdown
                  </h2>
                  <span className="text-sm text-gray-500">
                    {categoryMetrics.length} categories
                  </span>
                </div>

                {categoryMetrics.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No category data available for {selectedDate}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {categoryMetrics.slice(0, 10).map((category) => (
                      <CategoryBreakdown
                        key={category.category}
                        category={category.category}
                        itemCount={category.itemCount}
                        percentage={category.percentage}
                        avgReadTime={category.avgReadTime}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Top Performers (Last 7 Days) */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Top Performers
                  </h2>
                  <span className="text-sm text-gray-500">
                    Last {dateRange} days
                  </span>
                </div>

                {!topSources || topSources.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No performance data available
                  </div>
                ) : (
                  <div className="space-y-3">
                    {topSources.map((source, index) => (
                      <div
                        key={source.sourceName}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`
                            flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm
                            ${index === 0 ? 'bg-yellow-100 text-yellow-700' :
                              index === 1 ? 'bg-gray-200 text-gray-700' :
                                index === 2 ? 'bg-orange-100 text-orange-700' :
                                  'bg-gray-100 text-gray-600'}
                          `}>
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {source.sourceName}
                            </div>
                            <div className="text-xs text-gray-500">
                              {source.totalItems} items • {source.recordCount} records
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          {source.avgCTR > 0 && (
                            <div className="text-sm font-semibold text-blue-600">
                              {(source.avgCTR * 100).toFixed(1)}% CTR
                            </div>
                          )}
                          {source.avgEngagement > 0 && (
                            <div className="text-xs text-gray-500">
                              {source.avgEngagement.toFixed(0)} engagement
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Integration Status Banner */}
            {aggregates.totalImpressions === 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <TrendingUp className="text-blue-600 mt-0.5" size={20} />
                  <div>
                    <h3 className="font-semibold text-blue-900 mb-1">
                      Engagement Tracking Not Yet Active
                    </h3>
                    <p className="text-sm text-blue-700 mb-2">
                      Component metrics are being collected, but user engagement tracking (impressions, clicks, CTR)
                      is not yet integrated. See{' '}
                      <a
                        href="/docs/engagement-tracking"
                        className="underline font-medium hover:text-blue-900"
                      >
                        integration guide
                      </a>
                      {' '}to enable full analytics.
                    </p>
                    <div className="text-xs text-blue-600">
                      Expected metrics after integration: Impressions, Clicks, CTR, Avg Read Time
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
