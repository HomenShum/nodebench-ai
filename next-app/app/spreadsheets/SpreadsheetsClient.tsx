'use client';

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Loader2, Table2, Clock, Users, Plus } from 'lucide-react';

export function SpreadsheetsClient() {
  const spreadsheets = useQuery(api.domains.integrations.spreadsheets.listSheets, { limit: 25 });

  if (spreadsheets === undefined) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
          <p className="text-gray-600">Loading Spreadsheets...</p>
        </div>
      </div>
    );
  }

  // Calculate stats
  const totalSpreadsheets = spreadsheets?.length || 0;
  const now = Date.now();
  const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const recentCount = spreadsheets?.filter((s: any) => s.updatedAt && s.updatedAt > oneWeekAgo).length || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Spreadsheets</h1>
            <p className="text-gray-600 mt-1">Manage your spreadsheets and data</p>
          </div>
          <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Spreadsheet
          </button>
        </div>
      </header>

      {/* Quick Stats */}
      <div className="max-w-7xl mx-auto px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <StatCard icon={Table2} label="Total Spreadsheets" value={totalSpreadsheets} color="green" />
          <StatCard icon={Clock} label="Recent (7 days)" value={recentCount} color="blue" />
          <StatCard icon={Users} label="Shared" value={0} color="purple" />
        </div>

        {/* Spreadsheets Grid */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Your Spreadsheets</h2>
          </div>
          <div className="p-6">
            {spreadsheets && spreadsheets.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {spreadsheets.map((sheet: any) => (
                  <div key={sheet._id} className="p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:shadow-sm transition-all cursor-pointer">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-green-50 rounded-lg">
                        <Table2 className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">{sheet.name || 'Untitled Spreadsheet'}</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {sheet.updatedAt ? new Date(sheet.updatedAt).toLocaleDateString() : 'Recently updated'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Table2 className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <p>No spreadsheets yet. Create your first spreadsheet!</p>
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
    green: 'bg-green-50 text-green-600',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
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
