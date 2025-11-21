/**
 * DealFlowOutcomeHeader - Summary header for deal flow research results
 * 
 * Shows high-level outcome with smart messaging for zero-result scenarios
 */

import React from 'react';
import { TrendingUp, Calendar, AlertCircle, CheckCircle, Info } from 'lucide-react';

interface DealFlowOutcomeHeaderProps {
  dealCount: number;
  searchCriteria: {
    stages?: string[];
    industries?: string[];
    minAmount?: number;
    dateRange?: string;
  };
  fallbackApplied?: {
    originalDate: string;
    expandedTo: string;
    reason: string;
  };
  totalAmount?: string;
}

export function DealFlowOutcomeHeader({ 
  dealCount, 
  searchCriteria, 
  fallbackApplied,
  totalAmount 
}: DealFlowOutcomeHeaderProps) {
  const formatCriteria = () => {
    const parts: string[] = [];
    
    if (searchCriteria.stages && searchCriteria.stages.length > 0) {
      parts.push(searchCriteria.stages.join(' / '));
    }
    
    if (searchCriteria.industries && searchCriteria.industries.length > 0) {
      parts.push(`in ${searchCriteria.industries.join(', ')}`);
    }
    
    if (searchCriteria.minAmount) {
      parts.push(`>${searchCriteria.minAmount >= 1000000 ? `$${searchCriteria.minAmount / 1000000}M` : `$${searchCriteria.minAmount / 1000}K`}`);
    }
    
    return parts.join(' ');
  };

  const getStatusIcon = () => {
    if (dealCount === 0) return <AlertCircle className="h-6 w-6 text-amber-500" />;
    if (dealCount >= 5) return <CheckCircle className="h-6 w-6 text-green-500" />;
    return <Info className="h-6 w-6 text-blue-500" />;
  };

  const getStatusColor = () => {
    if (dealCount === 0) return 'from-amber-50 to-orange-50 border-amber-200';
    if (dealCount >= 5) return 'from-green-50 to-emerald-50 border-green-200';
    return 'from-blue-50 to-indigo-50 border-blue-200';
  };

  return (
    <div className={`bg-gradient-to-r ${getStatusColor()} border rounded-xl p-4 sm:p-6 mb-6 sm:mb-8`}>
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="flex-shrink-0 mt-1">
          {getStatusIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          {/* Primary Outcome */}
          <div className="mb-2">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
              {dealCount === 0 && 'No deals found today'}
              {dealCount === 1 && '1 deal found'}
              {dealCount > 1 && `${dealCount} deals found`}
              {dealCount > 0 && totalAmount && (
                <span className="text-lg sm:text-xl font-semibold text-gray-600 ml-2">
                  • {totalAmount} total
                </span>
              )}
            </h2>
            <p className="text-sm sm:text-base text-gray-700">
              {formatCriteria()}
            </p>
          </div>

          {/* Fallback Message */}
          {fallbackApplied && (
            <div className="mt-3 p-3 bg-white/60 rounded-lg border border-gray-200">
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-gray-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-gray-700">
                  <span className="font-medium">{fallbackApplied.reason}</span>
                  <br />
                  <span className="text-gray-600">
                    Expanded search from {fallbackApplied.originalDate} to {fallbackApplied.expandedTo}
                    {dealCount > 0 && ` and found ${dealCount} relevant ${dealCount === 1 ? 'deal' : 'deals'}`}
                    {dealCount === 0 && '. Consider broadening criteria or checking back later.'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Zero-result guidance */}
          {dealCount === 0 && !fallbackApplied && (
            <div className="mt-3 p-3 bg-white/60 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-700">
                <span className="font-medium">Suggestions:</span>
                <br />
                • Try expanding the date range (e.g., "last 7 days")
                <br />
                • Broaden industry criteria
                <br />
                • Lower minimum funding threshold
                <br />
                • Check back tomorrow for new announcements
              </p>
            </div>
          )}

          {/* Success message for good results */}
          {dealCount >= 3 && (
            <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span>
                {dealCount >= 10 ? 'High activity day' : 'Active deal flow'} — 
                {dealCount >= 5 ? ' detailed dossiers below' : ' see analysis below'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

