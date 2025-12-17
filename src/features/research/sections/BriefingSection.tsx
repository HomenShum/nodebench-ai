/**
 * BriefingSection - Executive Brief / Acts display
 *
 * Handles:
 * - Brief data fetching via useBriefData hook
 * - 3-Act scrollytelling layout
 * - Loading states with skeletons
 * - Act navigation
 */

import React, { useMemo, useState, useCallback } from 'react';
import { ChevronRight, Clock, BarChart2, Zap, ExternalLink } from 'lucide-react';
import { useBriefData } from '../hooks/useBriefData';
import { BriefingSkeleton, DashboardSkeleton } from '@/components/skeletons';
import { ErrorBoundary, BriefingErrorFallback } from '@/components/ErrorBoundary';
import { formatBriefDate } from '@/lib/briefDate';

type ActiveAct = 'actI' | 'actII' | 'actIII';

interface BriefingSectionProps {
  /** Called when act changes */
  onActChange?: (act: ActiveAct) => void;
  /** Called when "Ask AI" is clicked for an item */
  onAskAI?: (prompt: string) => void;
  /** Class name for container */
  className?: string;
}

function BriefingSectionInner({
  onActChange,
  onAskAI,
  className = '',
}: BriefingSectionProps) {
  const {
    executiveBrief,
    briefingDateString,
    sourceSummary,
    isLoading,
  } = useBriefData();

  const [activeAct, setActiveAct] = useState<ActiveAct>('actI');

  const handleActChange = useCallback((act: ActiveAct) => {
    setActiveAct(act);
    onActChange?.(act);
  }, [onActChange]);

  if (isLoading) {
    return (
      <div className={className}>
        <BriefingSkeleton />
      </div>
    );
  }

  if (!executiveBrief) {
    return (
      <div className={`${className} p-8 text-center text-gray-500 border border-gray-200 rounded-xl bg-white`}>
        <Clock className="w-8 h-8 mx-auto mb-3 text-gray-300" />
        <p className="text-sm font-medium">No briefing available yet</p>
        <p className="text-xs text-gray-400 mt-1">
          The morning brief will be generated at 6:00 AM UTC
        </p>
      </div>
    );
  }

  const actI = executiveBrief.actI;
  const actII = executiveBrief.actII;
  const actIII = executiveBrief.actIII;

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Today's Briefing</h2>
          <p className="text-sm text-gray-500">
            {briefingDateString ? formatBriefDate(briefingDateString) : 'Latest brief'}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          {sourceSummary?.totalItems && (
            <span className="px-2 py-1 bg-gray-100 rounded-full">
              {sourceSummary.totalItems} items
            </span>
          )}
        </div>
      </div>

      {/* Act Navigation */}
      <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-100">
        {[
          { id: 'actI', label: 'Act I', subtitle: 'Setup', icon: BarChart2 },
          { id: 'actII', label: 'Act II', subtitle: 'Signals', icon: Zap },
          { id: 'actIII', label: 'Act III', subtitle: 'Actions', icon: ExternalLink },
        ].map((act, idx) => (
          <React.Fragment key={act.id}>
            <button
              onClick={() => handleActChange(act.id as ActiveAct)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                activeAct === act.id
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <act.icon className="w-4 h-4" />
              <span className="text-sm font-medium">{act.label}</span>
              <span className="text-xs opacity-60">{act.subtitle}</span>
            </button>
            {idx < 2 && (
              <ChevronRight className="w-4 h-4 text-gray-300" />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Act Content */}
      <div className="space-y-4">
        {activeAct === 'actI' && actI && (
          <ActIContent
            data={actI}
            onAskAI={onAskAI}
          />
        )}
        {activeAct === 'actII' && actII && (
          <ActIIContent
            data={actII}
            onAskAI={onAskAI}
          />
        )}
        {activeAct === 'actIII' && actIII && (
          <ActIIIContent
            data={actIII}
            onAskAI={onAskAI}
          />
        )}
      </div>
    </div>
  );
}

// Act I: Setup / Coverage
function ActIContent({ data, onAskAI }: { data: any; onAskAI?: (prompt: string) => void }) {
  return (
    <div className="p-6 border border-gray-200 rounded-xl bg-white">
      <h3 className="text-sm font-semibold text-gray-900 mb-2">{data.headline || 'Coverage & Freshness'}</h3>
      <p className="text-sm text-gray-600 mb-4">{data.synthesis || data.summary || 'Today\'s market overview...'}</p>

      {/* Stats */}
      {data.stats && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          {Object.entries(data.stats).slice(0, 3).map(([key, value]) => (
            <div key={key} className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 capitalize">{key.replace(/_/g, ' ')}</p>
              <p className="text-lg font-semibold text-gray-900">{String(value)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Top Sources */}
      {data.topSources && data.topSources.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {data.topSources.slice(0, 5).map((source: any, idx: number) => (
            <span
              key={idx}
              className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-full"
            >
              {source.name || source}: {source.count || '?'}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// Act II: Signals
function ActIIContent({ data, onAskAI }: { data: any; onAskAI?: (prompt: string) => void }) {
  const signals = data.signals || [];

  return (
    <div className="space-y-3">
      {signals.length === 0 ? (
        <div className="p-6 text-center text-gray-500 border border-gray-200 rounded-xl bg-white">
          <p className="text-sm">No signals detected today</p>
        </div>
      ) : (
        signals.map((signal: any, idx: number) => (
          <div key={idx} className="p-4 border border-gray-200 rounded-xl bg-white hover:border-gray-300 transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-gray-900 mb-1">{signal.headline}</h4>
                <p className="text-sm text-gray-600">{signal.synthesis || signal.summary}</p>
              </div>
              {onAskAI && (
                <button
                  onClick={() => onAskAI(`Tell me more about: ${signal.headline}`)}
                  className="shrink-0 px-2 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                >
                  Ask AI
                </button>
              )}
            </div>

            {/* Evidence links */}
            {signal.evidence && signal.evidence.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {signal.evidence.slice(0, 3).map((ev: any, evIdx: number) => (
                  <a
                    key={evIdx}
                    href={ev.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-gray-500 hover:text-gray-700 underline"
                  >
                    {ev.source || ev.title?.slice(0, 30) || `Source ${evIdx + 1}`}
                  </a>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

// Act III: Actions
function ActIIIContent({ data, onAskAI }: { data: any; onAskAI?: (prompt: string) => void }) {
  const actions = data.actions || [];

  return (
    <div className="space-y-3">
      {actions.length === 0 ? (
        <div className="p-6 text-center text-gray-500 border border-gray-200 rounded-xl bg-white">
          <p className="text-sm">No actionable items today</p>
        </div>
      ) : (
        actions.map((action: any, idx: number) => (
          <div key={idx} className="p-4 border border-gray-200 rounded-xl bg-white hover:border-gray-300 transition-colors">
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                action.priority === 'high' ? 'bg-red-100 text-red-600' :
                action.priority === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                'bg-gray-100 text-gray-600'
              }`}>
                <span className="text-sm font-bold">{idx + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-gray-900 mb-1">{action.title || action.headline}</h4>
                <p className="text-sm text-gray-600">{action.description || action.rationale}</p>
                {action.deadline && (
                  <p className="text-xs text-gray-400 mt-2">Due: {action.deadline}</p>
                )}
              </div>
              {onAskAI && (
                <button
                  onClick={() => onAskAI(`Help me with this action: ${action.title || action.headline}`)}
                  className="shrink-0 px-3 py-1.5 text-xs font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Execute
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// Wrap with ErrorBoundary
export function BriefingSection(props: BriefingSectionProps) {
  return (
    <ErrorBoundary
      section="Briefing"
      fallback={<BriefingErrorFallback onRetry={() => window.location.reload()} />}
    >
      <BriefingSectionInner {...props} />
    </ErrorBoundary>
  );
}

export default BriefingSection;
