'use client';

import { useState } from 'react';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  ThumbsUp,
  ThumbsDown,
  Eye,
  MousePointer,
  Target,
  RefreshCw,
  Filter,
  ChevronRight,
} from 'lucide-react';

interface Recommendation {
  id: string;
  type: 'entity' | 'document' | 'signal' | 'deal';
  title: string;
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
  feedback: { positive: number; negative: number };
  status: 'active' | 'paused' | 'completed';
}

const recommendations: Recommendation[] = [
  {
    id: '1',
    type: 'entity',
    title: 'NVIDIA Corporation Analysis',
    impressions: 1250,
    clicks: 234,
    ctr: 18.7,
    conversions: 45,
    feedback: { positive: 42, negative: 3 },
    status: 'active',
  },
  {
    id: '2',
    type: 'signal',
    title: 'AI Market Trends Q1 2026',
    impressions: 890,
    clicks: 156,
    ctr: 17.5,
    conversions: 28,
    feedback: { positive: 25, negative: 3 },
    status: 'active',
  },
  {
    id: '3',
    type: 'deal',
    title: 'Series B Funding Opportunity',
    impressions: 450,
    clicks: 89,
    ctr: 19.8,
    conversions: 12,
    feedback: { positive: 10, negative: 2 },
    status: 'active',
  },
  {
    id: '4',
    type: 'document',
    title: 'Investment Thesis Template',
    impressions: 2100,
    clicks: 312,
    ctr: 14.9,
    conversions: 67,
    feedback: { positive: 58, negative: 9 },
    status: 'completed',
  },
  {
    id: '5',
    type: 'entity',
    title: 'OpenAI Research Deep Dive',
    impressions: 780,
    clicks: 145,
    ctr: 18.6,
    conversions: 32,
    feedback: { positive: 30, negative: 2 },
    status: 'paused',
  },
];

export function RecommendationsClient() {
  const [filter, setFilter] = useState<'all' | 'active' | 'paused' | 'completed'>('all');

  const filteredRecs = filter === 'all'
    ? recommendations
    : recommendations.filter((r) => r.status === filter);

  const totalImpressions = recommendations.reduce((sum, r) => sum + r.impressions, 0);
  const totalClicks = recommendations.reduce((sum, r) => sum + r.clicks, 0);
  const avgCtr = totalClicks / totalImpressions * 100;
  const totalConversions = recommendations.reduce((sum, r) => sum + r.conversions, 0);

  const typeColors: Record<string, string> = {
    entity: 'bg-blue-100 text-blue-700',
    document: 'bg-green-100 text-green-700',
    signal: 'bg-purple-100 text-purple-700',
    deal: 'bg-orange-100 text-orange-700',
  };

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    paused: 'bg-yellow-100 text-yellow-700',
    completed: 'bg-gray-100 text-gray-700',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Recommendation Analytics</h1>
            <p className="text-gray-600 mt-1">Track AI recommendation performance and user engagement</p>
          </div>
          <div className="flex items-center gap-3">
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
                <p className="text-2xl font-bold text-gray-900">{totalImpressions.toLocaleString()}</p>
                <p className="text-sm text-gray-600">Impressions</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <MousePointer className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalClicks.toLocaleString()}</p>
                <p className="text-sm text-gray-600">Clicks</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{avgCtr.toFixed(1)}%</p>
                <p className="text-sm text-gray-600">Avg CTR</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-50 rounded-lg">
                <Target className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalConversions}</p>
                <p className="text-sm text-gray-600">Conversions</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {(['all', 'active', 'paused', 'completed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === status
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Recommendations List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recommendations</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {filteredRecs.map((rec) => (
              <div key={rec.id} className="px-6 py-4 hover:bg-gray-50 cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Sparkles className="h-5 w-5 text-gray-600" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900">{rec.title}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${typeColors[rec.type]}`}>
                        {rec.type}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[rec.status]}`}>
                        {rec.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-6 mt-2 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        {rec.impressions.toLocaleString()} views
                      </span>
                      <span className="flex items-center gap-1">
                        <MousePointer className="h-4 w-4" />
                        {rec.clicks} clicks ({rec.ctr.toFixed(1)}%)
                      </span>
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="h-4 w-4 text-green-500" />
                        {rec.feedback.positive}
                      </span>
                      <span className="flex items-center gap-1">
                        <ThumbsDown className="h-4 w-4 text-red-500" />
                        {rec.feedback.negative}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-gray-500 transition-colors" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
