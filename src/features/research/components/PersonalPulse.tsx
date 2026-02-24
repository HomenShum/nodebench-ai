import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FileText,
    Calendar,
    ChevronRight,
    Sparkles,
    Zap
} from 'lucide-react';
import { CompactSignalCard } from './CompactSignalCard';
import { cn } from '@/lib/utils';

interface PersonalPulseProps {
    personalizedContext: any;
    tasksToday: any[];
    recentDocs: any[];
    onDocumentSelect?: (id: string) => void;
}

// Compact status pill
function StatusPill({ isLive, count, total, freshness }: { isLive: boolean; count: number; total: number; freshness: string }) {
    return (
        <div className={cn(
            'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold',
            isLive ? 'bg-indigo-100 text-content' : 'bg-amber-100 text-amber-800'
        )}>
            <span className={cn('w-1.5 h-1.5 rounded-full', isLive ? 'bg-indigo-500 motion-safe:animate-pulse' : 'bg-amber-500')} />
            {isLive ? `${count}/${total} signals` : 'Waiting'}
            <span className="text-content-muted">•</span>
            <span className="text-content-secondary">{freshness}</span>
        </div>
    );
}

// Source badge grid
function SourceBadges({ sources }: { sources: Array<{ name: string; count: number }> }) {
    if (sources.length === 0) return null;
    return (
        <div className="flex flex-wrap gap-1">
            {sources.slice(0, 6).map(({ name, count }) => (
                <span key={name} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-surface-secondary rounded text-xs text-content-secondary">
                    {name} <span className="text-content-muted">({count})</span>
                </span>
            ))}
            {sources.length > 6 && (
                <span className="px-1.5 py-0.5 text-xs text-content-muted">+{sources.length - 6}</span>
            )}
        </div>
    );
}

export function PersonalPulse({ personalizedContext, tasksToday, recentDocs, onDocumentSelect }: PersonalPulseProps) {
    const [showAllSignals, setShowAllSignals] = useState(false);
    const [contextTab, setContextTab] = useState<'tasks' | 'docs'>('tasks');
    const passingFeatures = personalizedContext?.passingFeatures || [];

    // Extract data
    const isLiveData = personalizedContext?.isLiveData === true;
    const hasFeatures = passingFeatures.length > 0;
    const freshestAge = personalizedContext?.freshestAgeHours;
    const totalSignals = personalizedContext?.totalFreshSignals ?? 0;
    const freshSignalsData = personalizedContext?.freshSignals;
    const sourceStats = freshSignalsData?.sourceStats || {};
    const totalAvailable = freshSignalsData?.totalAvailable ?? 0;

    // Freshness label (compact)
    const freshnessLabel = freshestAge != null
        ? freshestAge < 1 ? 'now' : freshestAge < 24 ? `${freshestAge}h` : 'today'
        : 'live';

    // Source diversity - sorted by count
    const sources = Object.entries(sourceStats)
        .map(([name, count]) => ({ name, count: count as number }))
        .sort((a, b) => b.count - a.count);

    // Display features with fallback
    // INCREASED: Show 10 signals by default, 20 when expanded for better space usage
    const displayFeatures = hasFeatures ? passingFeatures : [];
    const visibleCount = showAllSignals ? 20 : 10;

    // Determine if workspace context has content
    const hasWorkspaceContent = tasksToday.length > 0 || recentDocs.length > 0;

    return (
        <div className={cn(
            'grid grid-cols-1 gap-4',
            hasWorkspaceContent ? 'lg:grid-cols-12' : 'lg:grid-cols-1'
        )}>
            {/* LEFT: SIGNAL FEED */}
            <div className={cn(
                'bg-white border border-edge rounded-lg overflow-hidden',
                hasWorkspaceContent ? 'lg:col-span-8' : 'lg:col-span-full'
            )}>
                {/* Header */}
                <div className="px-4 py-3 bg-surface-secondary border-b border-edge flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-content-secondary" />
                        <div>
                            <div className="text-xs font-semibold text-content-secondary">Your Signal Feed</div>
                            <div className="text-xs text-content-secondary">Latest headlines from your tracked sources</div>
                        </div>
                    </div>
                    <StatusPill isLive={isLiveData && hasFeatures} count={totalSignals} total={totalAvailable} freshness={freshnessLabel} />
                </div>

                {/* Source badges */}
                {sources.length > 0 && (
                    <div className="px-4 py-2 border-b border-edge bg-gray-50/50">
                        <SourceBadges sources={sources} />
                    </div>
                )}

                {/* Signal list - expanded with summaries for richer content */}
                <div className={cn(
                    'divide-y divide-gray-100 overflow-y-auto',
                    showAllSignals ? 'max-h-[680px]' : 'max-h-[520px]'
                )}>
                    {displayFeatures.length > 0 ? (
                        displayFeatures.slice(0, visibleCount).map((feature: any, idx: number) => {
                            // Parse the actual title from resultMarkdown (format: "**Title** — Summary" or just "Title")
                            const markdown = feature.resultMarkdown || '';
                            const boldMatch = markdown.match(/\*\*(.+?)\*\*/);
                            const actualTitle = boldMatch ? boldMatch[1] : markdown.slice(0, 120);

                            // Extract source label from feature.name (format: "📰 News • 2h ago")
                            const nameParts = (feature.name || '').split(' • ');
                            const sourceLabel = nameParts[0]?.replace(/^[^\w]+/, '').trim() || feature.source || 'Signal';

                            // Get summary directly from feature or parse from markdown
                            const summary = feature.summary || (markdown.includes(' — ') ? markdown.split(' — ')[1] : undefined);

                            return (
                                <CompactSignalCard
                                    key={feature.id || idx}
                                    title={actualTitle}
                                    source={sourceLabel}
                                    category={feature.category}
                                    url={feature.url}
                                    publishedAt={feature.timestamp ? new Date(feature.timestamp) : feature.publishedAt}
                                    score={feature.score}
                                    summary={summary}
                                    showSummary={true}
                                />
                            );
                        })
                    ) : (
                        <div className="p-6 text-center">
                            <Sparkles className="w-5 h-5 text-gray-300 mx-auto mb-2" />
                            <p className="text-xs text-content-muted">No signals yet. Sources refresh automatically every few hours.</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {totalSignals > 6 && (
                    <button
                        type="button"
                        onClick={() => setShowAllSignals(!showAllSignals)}
                        className="w-full py-2.5 text-xs font-medium text-content-secondary bg-indigo-50/50 hover:bg-indigo-50 border-t border-edge transition-colors flex items-center justify-center gap-1"
                    >
                        {showAllSignals ? 'Show less' : `+${totalSignals - 6} more signals`}
                        <ChevronRight className={cn('w-3 h-3 transition-transform', showAllSignals && 'rotate-90')} />
                    </button>
                )}
            </div>

            {/* RIGHT: WORKSPACE CONTEXT (TABBED) - Only show if there's content */}
            {hasWorkspaceContent && (
                <div className="lg:col-span-4 bg-white border border-edge rounded-lg overflow-hidden">
                    <div className="px-4 py-3 bg-surface-secondary border-b border-edge">
                        <div className="flex items-center justify-between">
                            <div className="text-xs font-semibold text-content-secondary">Your Context</div>
                            <div className="text-xs text-content-secondary">Quick access</div>
                        </div>
                        <div className="mt-2 inline-flex rounded-lg border border-edge bg-white p-1">
                            <button
                                type="button"
                                onClick={() => setContextTab('tasks')}
                                className={cn(
                                    'px-2.5 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5',
                                    contextTab === 'tasks' ? 'bg-blue-50 text-blue-700' : 'text-content-secondary hover:bg-surface-hover'
                                )}
                            >
                                <Calendar className="w-3.5 h-3.5" />
                                Today
                                {tasksToday.length > 0 && (
                                    <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-bold">
                                        {tasksToday.length}
                                    </span>
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={() => setContextTab('docs')}
                                className={cn(
                                    'px-2.5 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5',
                                    contextTab === 'docs' ? 'bg-violet-50 text-violet-700' : 'text-content-secondary hover:bg-surface-hover'
                                )}
                            >
                                <FileText className="w-3.5 h-3.5" />
                                Recent
                                {recentDocs.length > 0 && (
                                    <span className="ml-1 px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded text-xs font-bold">
                                        {recentDocs.length}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>

                    <AnimatePresence mode="wait">
                        {contextTab === 'tasks' ? (
                            <motion.div
                                key="tasks"
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                transition={{ duration: 0.18 }}
                                className="divide-y divide-gray-100"
                            >
                                {tasksToday.slice(0, 6).map((task: any) => (
                                    <div key={task._id} className="px-4 py-2.5 flex items-center gap-2 hover:bg-surface-hover">
                                        <div className={cn(
                                            'w-1.5 h-1.5 rounded-full shrink-0',
                                            task.status === 'done' ? 'bg-indigo-500' : 'bg-gray-300'
                                        )} />
                                        <span className="text-[12px] text-content-secondary truncate flex-1">{task.title}</span>
                                    </div>
                                ))}
                            </motion.div>
                        ) : (
                            <motion.div
                                key="docs"
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                transition={{ duration: 0.18 }}
                                className="divide-y divide-gray-100"
                            >
                                {recentDocs.slice(0, 6).map((doc: any) => (
                                    <button
                                        type="button"
                                        key={doc._id}
                                        onClick={() => onDocumentSelect?.(doc._id)}
                                        className="w-full text-left px-4 py-2.5 hover:bg-surface-hover group"
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className="text-[12px] text-content-secondary truncate flex-1">{doc.title}</div>
                                            <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-content-secondary shrink-0" />
                                        </div>
                                        <div className="text-xs text-content-muted mt-0.5">
                                            {doc.updatedAt && !isNaN(new Date(doc.updatedAt).getTime())
                                                ? new Date(doc.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                : 'recently'}
                                        </div>
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}
