'use client';

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Loader2, TrendingUp, FileText, Users, Calendar } from 'lucide-react';

export function ResearchClient() {
  // Fetch research data from Convex
  const signals = useQuery(api.feed.getPublicSignals, { limit: 10 });

  if (signals === undefined) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <p className="text-gray-600">Loading Research Hub...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900">Research Hub</h1>
          <p className="text-gray-600 mt-1">AI-powered research intelligence</p>
        </div>
      </header>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard icon={TrendingUp} label="Signals" value={signals?.length || 0} color="emerald" />
          <StatCard icon={FileText} label="Reports" value="12" color="blue" />
          <StatCard icon={Users} label="Sources" value="48" color="purple" />
          <StatCard icon={Calendar} label="Updated" value="Today" color="orange" />
        </div>

        {/* Signals List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Latest Signals</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {signals && signals.length > 0 ? (
              signals.map((signal: any) => (
                <div key={signal._id} className="px-6 py-4 hover:bg-gray-50">
                  <h3 className="font-medium text-gray-900">{signal.title || signal.headline || 'Untitled Signal'}</h3>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {signal.summary || signal.description || 'No description available'}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span>{signal.source || 'Unknown source'}</span>
                    <span>•</span>
                    <span>{signal.publishedAt ? new Date(signal.publishedAt).toLocaleDateString() : 'Recent'}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-12 text-center text-gray-500">
                No signals available yet. Check back later!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  const colorClasses: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-600">{label}</p>
        </div>
      </div>
    </div>
  );
}
