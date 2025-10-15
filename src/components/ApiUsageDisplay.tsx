// src/components/ApiUsageDisplay.tsx
// Display API usage statistics for the current user

import React from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Activity, TrendingUp, DollarSign, AlertCircle } from 'lucide-react';

export function ApiUsageDisplay() {
  const usageSummary = useQuery(api.apiUsageTracking.getUserApiUsageSummary);

  if (!usageSummary) {
    return (
      <div className="p-4 border border-gray-200 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="h-5 w-5 text-gray-500" />
          <h3 className="font-semibold">API Usage</h3>
        </div>
        <p className="text-sm text-gray-500">Loading usage data...</p>
      </div>
    );
  }

  const { byApi, summary } = usageSummary;
  const apiNames = Object.keys(byApi);

  // Calculate costs
  const totalCostDollars = (summary.totalCost / 100).toFixed(2);

  return (
    <div className="p-4 border border-gray-200 rounded-lg space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Activity className="h-5 w-5 text-blue-600" />
        <h3 className="font-semibold text-lg">API Usage</h3>
      </div>

      {/* Overall Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 bg-blue-50 rounded-lg">
          <div className="text-xs text-gray-600 mb-1">Today</div>
          <div className="text-2xl font-bold text-blue-600">
            {summary.todayTotalCalls}
          </div>
          <div className="text-xs text-gray-500">API calls</div>
        </div>
        
        <div className="p-3 bg-green-50 rounded-lg">
          <div className="text-xs text-gray-600 mb-1">This Month</div>
          <div className="text-2xl font-bold text-green-600">
            {summary.monthTotalCalls}
          </div>
          <div className="text-xs text-gray-500">API calls</div>
        </div>
        
        <div className="p-3 bg-purple-50 rounded-lg">
          <div className="text-xs text-gray-600 mb-1">All Time</div>
          <div className="text-2xl font-bold text-purple-600">
            {summary.totalCalls}
          </div>
          <div className="text-xs text-gray-500">API calls</div>
        </div>
      </div>

      {/* Success Rate */}
      {summary.totalCalls > 0 && (
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Success Rate</span>
            <span className="text-lg font-bold text-green-600">
              {((summary.successfulCalls / summary.totalCalls) * 100).toFixed(1)}%
            </span>
          </div>
          <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500"
              style={{ width: `${(summary.successfulCalls / summary.totalCalls) * 100}%` }}
            />
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {summary.successfulCalls} successful, {summary.failedCalls} failed
          </div>
        </div>
      )}

      {/* Estimated Cost */}
      {summary.totalCost > 0 && (
        <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-yellow-600" />
            <span className="text-sm font-medium">Estimated Cost</span>
          </div>
          <div className="text-2xl font-bold text-yellow-700 mt-1">
            ${totalCostDollars}
          </div>
          <div className="text-xs text-gray-600 mt-1">
            Based on API pricing estimates
          </div>
        </div>
      )}

      {/* Per-API Breakdown */}
      {apiNames.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            API Breakdown
          </h4>
          <div className="space-y-2">
            {apiNames.map((apiName) => {
              const apiData = byApi[apiName];
              const successRate = apiData.totalCalls > 0 
                ? ((apiData.successfulCalls / apiData.totalCalls) * 100).toFixed(0)
                : 0;

              return (
                <div key={apiName} className="p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        apiName === 'linkup' ? 'bg-blue-500' :
                        apiName === 'youtube' ? 'bg-red-500' :
                        apiName === 'openai' ? 'bg-green-500' :
                        'bg-gray-500'
                      }`} />
                      <span className="font-medium capitalize">{apiName}</span>
                    </div>
                    <span className="text-sm text-gray-600">
                      {apiData.totalCalls} calls
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <div className="text-gray-500">Today</div>
                      <div className="font-semibold">{apiData.todayCalls}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">This Month</div>
                      <div className="font-semibold">{apiData.monthCalls}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Success</div>
                      <div className="font-semibold text-green-600">{successRate}%</div>
                    </div>
                  </div>

                  {apiData.totalUnitsUsed > 0 && (
                    <div className="mt-2 text-xs text-gray-500">
                      {apiData.totalUnitsUsed} units used
                      {apiData.totalCost > 0 && ` • $${(apiData.totalCost / 100).toFixed(2)}`}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Info Note */}
      <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <AlertCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-gray-700">
          <div className="font-medium mb-1">About API Usage Tracking</div>
          <div className="text-gray-600 space-y-1">
            <div>• <strong>Linkup:</strong> Web search (~€0.005 = 0.5¢ per search)</div>
            <div>• <strong>YouTube:</strong> Video search (free: 10K units/day, 100 units/search)</div>
            <div>• <strong>OpenAI GPT-5:</strong> $1.25/1M input ($0.00125/1K), $10/1M output ($0.01/1K)</div>
            <div className="mt-2 pt-2 border-t border-blue-200">
              Pricing updated August 2025. Actual costs may vary with usage patterns.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
