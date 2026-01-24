'use client';

import { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Clock,
  Zap,
  Eye,
  MousePointer,
  RefreshCw,
  Calendar,
  Filter,
} from 'lucide-react';

interface ComponentMetric {
  name: string;
  renders: number;
  avgRenderTime: number;
  interactions: number;
  errors: number;
  trend: 'up' | 'down' | 'stable';
}

const componentMetrics: ComponentMetric[] = [
  { name: 'FastAgentPanel', renders: 1243, avgRenderTime: 12.5, interactions: 890, errors: 2, trend: 'up' },
  { name: 'ResearchHub', renders: 892, avgRenderTime: 45.2, interactions: 456, errors: 0, trend: 'stable' },
  { name: 'DocumentEditor', renders: 567, avgRenderTime: 23.8, interactions: 1200, errors: 1, trend: 'down' },
  { name: 'EntityProfileCard', renders: 2341, avgRenderTime: 8.3, interactions: 340, errors: 0, trend: 'up' },
  { name: 'SignalsTable', renders: 445, avgRenderTime: 67.1, interactions: 220, errors: 3, trend: 'down' },
  { name: 'DealRadar', renders: 234, avgRenderTime: 34.5, interactions: 180, errors: 0, trend: 'stable' },
  { name: 'Navigation', renders: 4521, avgRenderTime: 2.1, interactions: 890, errors: 0, trend: 'stable' },
  { name: 'CalendarView', renders: 312, avgRenderTime: 28.9, interactions: 145, errors: 1, trend: 'up' },
];

export function ComponentAnalyticsClient() {
  const [timeRange, setTimeRange] = useState('24h');
  const [sortBy, setSortBy] = useState<'renders' | 'avgRenderTime' | 'interactions'>('renders');

  const sortedMetrics = [...componentMetrics].sort((a, b) => b[sortBy] - a[sortBy]);

  const totalRenders = componentMetrics.reduce((sum, c) => sum + c.renders, 0);
  const avgRenderTime = componentMetrics.reduce((sum, c) => sum + c.avgRenderTime, 0) / componentMetrics.length;
  const totalInteractions = componentMetrics.reduce((sum, c) => sum + c.interactions, 0);
  const totalErrors = componentMetrics.reduce((sum, c) => sum + c.errors, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Component Analytics</h1>
            <p className="text-gray-600 mt-1">Track and optimize component performance</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            >
              <option value="1h">Last hour</option>
              <option value="24h">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </select>
            <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
              <RefreshCw className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-8 py-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Eye className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalRenders.toLocaleString()}</p>
                <p className="text-sm text-gray-600">Total Renders</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <Clock className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{avgRenderTime.toFixed(1)}ms</p>
                <p className="text-sm text-gray-600">Avg Render Time</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <MousePointer className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalInteractions.toLocaleString()}</p>
                <p className="text-sm text-gray-600">Interactions</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 rounded-lg">
                <Zap className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalErrors}</p>
                <p className="text-sm text-gray-600">Errors</p>
              </div>
            </div>
          </div>
        </div>

        {/* Component Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Component Metrics</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-2 py-1 border border-gray-300 rounded text-sm bg-white"
              >
                <option value="renders">Renders</option>
                <option value="avgRenderTime">Render Time</option>
                <option value="interactions">Interactions</option>
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Component
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Renders
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Render Time
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Interactions
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Errors
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trend
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedMetrics.map((component) => (
                  <tr key={component.name} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                          <BarChart3 className="h-4 w-4 text-gray-600" />
                        </div>
                        <span className="font-medium text-gray-900">{component.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-900">
                      {component.renders.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right text-sm">
                      <span className={component.avgRenderTime > 50 ? 'text-red-600' : 'text-gray-900'}>
                        {component.avgRenderTime.toFixed(1)}ms
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-900">
                      {component.interactions.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right text-sm">
                      <span className={component.errors > 0 ? 'text-red-600 font-medium' : 'text-gray-500'}>
                        {component.errors}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {component.trend === 'up' && (
                        <span className="inline-flex items-center text-green-600">
                          <TrendingUp className="h-4 w-4" />
                        </span>
                      )}
                      {component.trend === 'down' && (
                        <span className="inline-flex items-center text-red-600">
                          <TrendingDown className="h-4 w-4" />
                        </span>
                      )}
                      {component.trend === 'stable' && (
                        <span className="inline-flex items-center text-gray-400">
                          &mdash;
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
