import React, { useState, useMemo } from 'react';
import { Filter, TrendingUp, Building2 } from 'lucide-react';
import { useDealData, type DealStage, type DealSector } from '../hooks/useDealData';
import { DealTable } from './DealTable';

interface DealRadarProps {
    onDealClick: (dealId: string, companyName: string) => void;
}

const STAGE_OPTIONS: Array<{ value: DealStage | 'all'; label: string }> = [
    { value: 'all', label: 'All Stages' },
    { value: 'Seed', label: 'Seed' },
    { value: 'Series A', label: 'Series A' },
    { value: 'Series B', label: 'Series B' },
    { value: 'Series C+', label: 'Series C+' },
];

const SECTOR_OPTIONS: Array<{ value: DealSector | 'all'; label: string }> = [
    { value: 'all', label: 'All Sectors' },
    { value: 'Biotech', label: 'Biotech' },
    { value: 'Fintech', label: 'Fintech' },
    { value: 'AI/ML', label: 'AI/ML' },
    { value: 'HealthTech', label: 'HealthTech' },
    { value: 'Space', label: 'Space' },
    { value: 'Other', label: 'Other' },
];

export function DealRadar({ onDealClick }: DealRadarProps) {
    const [activeTab, setActiveTab] = useState<'all' | DealStage>('all');
    const [sectorFilter, setSectorFilter] = useState<DealSector | 'all'>('all');
    const [minScore, setMinScore] = useState<number>(0);

    const filters = useMemo(() => ({
        stage: activeTab === 'all' ? undefined : activeTab,
        sector: sectorFilter === 'all' ? undefined : sectorFilter,
        minBankerScore: minScore,
    }), [activeTab, sectorFilter, minScore]);

    const { deals, stats } = useDealData(filters);

    return (
        <div className="space-y-6">
            {/* Header with Stats */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-2xl font-serif font-bold text-[color:var(--text-primary)] italic">Deal Radar</h3>
                    <p className="text-xs text-stone-500 mt-1">
                        Recent financings matching JPM criteria • {stats.filtered} of {stats.total} deals
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-900/10 rounded">
                        <div className="text-[9px] font-bold uppercase tracking-widest text-emerald-700">Avg Score</div>
                        <div className="text-xl font-serif font-bold text-emerald-900">{stats.avgBankerScore}</div>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-stone-400 uppercase tracking-widest">
                        <Building2 className="w-4 h-4" />
                        <span>Last 30 Days</span>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-2 border-b border-stone-200 pb-3">
                {STAGE_OPTIONS.map((option) => {
                    const count = option.value === 'all' ? stats.total : stats.byStage[option.value as DealStage] || 0;
                    return (
                        <button
                            key={option.value}
                            onClick={() => setActiveTab(option.value as typeof activeTab)}
                            className={`px-4 py-2 text-xs font-bold uppercase tracking-tight transition-all ${activeTab === option.value
                                    ? 'bg-emerald-900 text-white'
                                    : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100'
                                }`}
                        >
                            {option.label}
                            <span className={`ml-2 ${activeTab === option.value ? 'text-emerald-200' : 'text-stone-400'}`}>
                                ({count})
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 p-4 bg-stone-50 border border-stone-200">
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-stone-400" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Filters</span>
                </div>

                <select
                    value={sectorFilter}
                    onChange={(e) => setSectorFilter(e.target.value as typeof sectorFilter)}
                    className="px-3 py-1.5 text-xs font-medium border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                    {SECTOR_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>

                <div className="flex items-center gap-2">
                    <label className="text-xs text-stone-600">Min Score:</label>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        step="10"
                        value={minScore}
                        onChange={(e) => setMinScore(Number(e.target.value))}
                        className="w-32"
                    />
                    <span className="text-xs font-mono font-semibold text-stone-700 w-8">{minScore}</span>
                </div>

                {(sectorFilter !== 'all' || minScore > 0) && (
                    <button
                        onClick={() => {
                            setSectorFilter('all');
                            setMinScore(0);
                        }}
                        className="ml-auto text-[10px] font-bold uppercase tracking-widest text-stone-500 hover:text-emerald-900 transition-colors"
                    >
                        Clear Filters
                    </button>
                )}
            </div>

            {/* Deal Table */}
            <div className="border border-stone-200 bg-white">
                <DealTable deals={deals} onDealClick={onDealClick} />
            </div>

            {/* Footer Stats */}
            {deals.length > 0 && (
                <div className="flex items-center justify-between text-xs text-stone-500 px-4">
                    <div>
                        Showing {deals.length} deal{deals.length !== 1 ? 's' : ''}
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-emerald-600" />
                            <span>High Quality (80+)</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-blue-600" />
                            <span>Good Fit (60-79)</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-amber-500" />
                            <span>Potential (40-59)</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
