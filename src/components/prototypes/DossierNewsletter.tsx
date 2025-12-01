// src/components/prototypes/DossierNewsletter.tsx
// Self-contained newsletter-style dossier prototype with mock data
// Drop-in component to preview the new editorial layout

import React, { useState, ReactNode } from 'react';
import {
    TrendingUp, Users, Briefcase, AlertTriangle, Lightbulb,
    Search, Filter, ExternalLink, Youtube, FileText,
    ChevronDown, ChevronRight, Pin, Copy, RefreshCw,
    CheckCircle2, AlertCircle, Clock, MoreHorizontal
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface KPI {
    label: string;
    value: string;
    status?: 'positive' | 'negative' | 'neutral';
}

interface Bullet {
    text: string;
    evidenceChips: string[];
}

interface MediaItem {
    type: 'youtube' | 'web' | 'sec' | 'pdf';
    title: string;
    domain: string;
    favicon?: string;
    verified?: boolean;
}

interface DossierSection {
    key: string;
    title: string;
    icon: ReactNode;
    freshness: 'new' | 'updated' | 'stable';
    bullets: Bullet[];
    mediaRail: MediaItem[];
    takeaway?: string;
    isPinned?: boolean;
    isExpanded?: boolean;
}

interface Source {
    id: string;
    title: string;
    domain: string;
    url: string;
    section: string;
    verified: boolean;
    tool: string;
    timestamp: Date;
}

// ═══════════════════════════════════════════════════════════════════════════
// MOCK DATA
// ═══════════════════════════════════════════════════════════════════════════

const MOCK_SECTIONS: DossierSection[] = [
    {
        key: 'executive_summary',
        title: 'Executive Summary',
        icon: <Lightbulb className="w-4 h-4" />,
        freshness: 'new',
        bullets: [
            { text: 'Etched raised $120M Series A for custom AI chips', evidenceChips: ['1', '2'] },
            { text: 'Focus on Transformer-specific ASICs, 10x faster than GPUs', evidenceChips: ['3', '4'] },
            { text: 'Key hires from Google TPU and Nvidia teams', evidenceChips: ['5'] },
        ],
        mediaRail: [
            { type: 'web', title: 'Etched Raises $120M for AI Chips', domain: 'techcrunch.com', verified: true },
            { type: 'youtube', title: 'Founder Interview: Sohu', domain: 'youtube.com', verified: true },
            { type: 'web', title: 'Analysis: ASICs vs GPUs', domain: 'semianalysis.com', verified: true },
        ],
        takeaway: 'Strong technical team targeting a niche but critical market segment.',
        isExpanded: true,
    },
    {
        key: 'market_landscape',
        title: 'Market Landscape',
        icon: <TrendingUp className="w-4 h-4" />,
        freshness: 'updated',
        bullets: [
            { text: 'AI chip market growing 40% YoY, expected $150B by 2027', evidenceChips: ['6', '7'] },
            { text: 'Key competitors: Nvidia (dominant), Groq, Cerebras', evidenceChips: ['8', '9', '10'] },
            { text: 'Transformer workloads represent 80% of inference demand', evidenceChips: ['11'] },
            { text: 'Customer pain point: GPU costs and latency bottlenecks', evidenceChips: ['12', '13'] },
        ],
        mediaRail: [
            { type: 'web', title: 'AI Chip Market Report 2024', domain: 'gartner.com', verified: true },
            { type: 'web', title: 'Groq vs Nvidia Comparison', domain: 'anandtech.com', verified: false },
        ],
        takeaway: 'Market timing is excellent, but competition from Nvidia is fierce.',
        isExpanded: true,
    },
    {
        key: 'funding_signals',
        title: 'Funding & Traction',
        icon: <Briefcase className="w-4 h-4" />,
        freshness: 'new',
        bullets: [
            { text: '$120M Series A led by Primary Venture Partners', evidenceChips: ['14'] },
            { text: 'Valuation estimated at $500M post-money', evidenceChips: ['15'] },
            { text: 'LOIs from 3 hyperscalers (unconfirmed)', evidenceChips: ['16'] },
        ],
        mediaRail: [
            { type: 'web', title: 'SEC Filing: Series A Close', domain: 'sec.gov', verified: true },
        ],
        isExpanded: false,
    },
    {
        key: 'risk_flags',
        title: 'Risk Flags',
        icon: <AlertTriangle className="w-4 h-4" />,
        freshness: 'stable',
        bullets: [
            { text: 'No commercial product shipped yet (currently in alpha)', evidenceChips: ['17'] },
            { text: 'Nvidia dominance creates high barrier to adoption', evidenceChips: ['18'] },
            { text: 'Limited team size (40 people) for ambitious roadmap', evidenceChips: ['19'] },
        ],
        mediaRail: [],
        isExpanded: false,
    },
];

const MOCK_SOURCES: Source[] = [
    { id: '1', title: 'Etched Raises $120M for AI Chips', domain: 'techcrunch.com', url: 'https://techcrunch.com/...', section: 'executive_summary', verified: true, tool: 'linkupSearch', timestamp: new Date('2024-11-25') },
    { id: '2', title: 'Primary VP Announces Investment', domain: 'primary.vc', url: 'https://primary.vc/...', section: 'executive_summary', verified: true, tool: 'linkupSearch', timestamp: new Date('2024-11-25') },
    { id: '6', title: 'AI Chip Market Forecast', domain: 'gartner.com', url: 'https://gartner.com/...', section: 'market_landscape', verified: true, tool: 'linkupSearch', timestamp: new Date('2024-11-20') },
    { id: '14', title: 'SEC Form D Filing', domain: 'sec.gov', url: 'https://sec.gov/...', section: 'funding_signals', verified: true, tool: 'secSearch', timestamp: new Date('2024-11-26') },
];

// ═══════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function TopBar({
    entity,
    scope,
    verificationStatus,
    lastRefresh,
    onSubscribe,
    onExport,
    onRefresh
}: {
    entity: string;
    scope: string;
    verificationStatus: 'verified' | 'partial' | 'unverified';
    lastRefresh: Date;
    onSubscribe: () => void;
    onExport: () => void;
    onRefresh: () => void;
}) {
    const statusColors = {
        verified: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
        partial: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
        unverified: 'bg-red-500/10 text-red-600 border-red-500/20',
    };

    return (
        <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 px-6 py-3">
            <div className="flex items-center justify-between max-w-7xl mx-auto">
                {/* Left */}
                <div className="flex items-center gap-3">
                    <span className="px-3 py-1 rounded-full bg-gray-900 text-white text-sm font-bold">
                        {entity}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
                        {scope}
                    </span>
                </div>

                {/* Center */}
                <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Updated {lastRefresh.toLocaleDateString()}
                    </span>
                    <span className={`px-3 py-1 rounded-full border text-xs font-medium ${statusColors[verificationStatus]}`}>
                        {verificationStatus === 'verified' && <CheckCircle2 className="w-3 h-3 inline mr-1" />}
                        {verificationStatus === 'partial' && <AlertCircle className="w-3 h-3 inline mr-1" />}
                        {verificationStatus.charAt(0).toUpperCase() + verificationStatus.slice(1)}
                    </span>
                </div>

                {/* Right */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={onSubscribe}
                        className="px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Subscribe
                    </button>
                    <button
                        onClick={onExport}
                        className="px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Export
                    </button>
                    <button
                        onClick={onRefresh}
                        className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}

function DigestHero({
    title,
    summary,
    kpis,
    confidence,
}: {
    title: string;
    summary: string;
    kpis?: KPI[];
    confidence: 'single-source' | 'cross-referenced' | 'verified';
}) {
    const confidenceColors = {
        'single-source': 'text-amber-600',
        'cross-referenced': 'text-blue-600',
        'verified': 'text-emerald-600',
    };

    return (
        <div className="bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-2xl border border-gray-200 p-8 mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">{title}</h1>
            <p className="text-sm leading-6 text-gray-700 mb-6">{summary}</p>

            {kpis && kpis.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                    {kpis.map((kpi, idx) => (
                        <span
                            key={idx}
                            className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-xs font-medium text-gray-800"
                        >
                            <span className="text-gray-500">{kpi.label}:</span> {kpi.value}
                        </span>
                    ))}
                </div>
            )}

            <div className={`text-xs font-medium ${confidenceColors[confidence]}`}>
                Confidence: {confidence.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                {confidence === 'verified' && ' ✓'}
            </div>
        </div>
    );
}

function SectionCard({
    section,
    onToggleExpand,
    onTogglePin,
}: {
    section: DossierSection;
    onToggleExpand: () => void;
    onTogglePin: () => void;
}) {
    const freshnessColors = {
        new: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
        updated: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
        stable: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-4 shadow-sm hover:shadow-md transition-shadow">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-gray-100 rounded-lg text-gray-600">
                        {section.icon}
                    </span>
                    <h3 className="text-base font-semibold text-gray-900">{section.title}</h3>
                    <span className={`px-2 py-0.5 rounded-full border text-[10px] font-medium uppercase ${freshnessColors[section.freshness]}`}>
                        {section.freshness}
                    </span>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={onTogglePin}
                        className={`p-1.5 rounded-lg transition-colors ${section.isPinned ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:bg-gray-100'}`}
                    >
                        <Pin className="w-3.5 h-3.5" />
                    </button>
                    <button className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors">
                        <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={onToggleExpand}
                        className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        {section.isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </button>
                </div>
            </div>

            {/* Bullets */}
            {section.isExpanded && (
                <>
                    <div className="space-y-2 mb-4">
                        {section.bullets.map((bullet, idx) => (
                            <div key={idx} className="flex items-start gap-3">
                                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                                <div className="flex-1">
                                    <span className="text-sm leading-6 text-gray-700">{bullet.text}</span>
                                    <div className="flex gap-1 mt-1">
                                        {bullet.evidenceChips.map((chip) => (
                                            <span
                                                key={chip}
                                                className="inline-flex items-center justify-center w-5 h-5 rounded bg-blue-100 text-blue-700 text-[10px] font-bold cursor-pointer hover:bg-blue-200 transition-colors"
                                                title="Click to view source"
                                            >
                                                {chip}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* MediaRail */}
                    {section.mediaRail.length > 0 && (
                        <div className="mb-4">
                            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                {section.mediaRail.slice(0, 3).map((item, idx) => (
                                    <div
                                        key={idx}
                                        className="flex-shrink-0 w-56 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 cursor-pointer transition-colors"
                                    >
                                        <div className="flex items-start gap-2">
                                            <span className="p-1 bg-white rounded border border-gray-200">
                                                {item.type === 'youtube' && <Youtube className="w-3 h-3 text-red-500" />}
                                                {item.type === 'web' && <ExternalLink className="w-3 h-3 text-blue-500" />}
                                                {item.type === 'sec' && <FileText className="w-3 h-3 text-green-500" />}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs font-medium text-gray-900 truncate">{item.title}</div>
                                                <div className="text-[10px] text-gray-500 truncate">{item.domain}</div>
                                            </div>
                                            {item.verified && <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />}
                                        </div>
                                    </div>
                                ))}
                                {section.mediaRail.length > 3 && (
                                    <button className="flex-shrink-0 w-20 flex items-center justify-center text-xs text-gray-500 hover:text-gray-700 font-medium">
                                        +{section.mediaRail.length - 3} more
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Takeaway */}
                    {section.takeaway && (
                        <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-lg">
                            <div className="flex items-start gap-2">
                                <Lightbulb className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                                <span className="text-xs leading-5 text-blue-900">{section.takeaway}</span>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

function WhatChangedStrip({
    newSources,
    updates,
    contradictions,
    onViewDiff,
}: {
    newSources: number;
    updates: number;
    contradictions: number;
    onViewDiff: () => void;
}) {
    if (newSources === 0 && updates === 0 && contradictions === 0) return null;

    return (
        <div className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-xl border border-emerald-200 p-4 mb-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs font-medium">
                    {newSources > 0 && (
                        <span className="text-emerald-700">+ {newSources} new sources</span>
                    )}
                    {updates > 0 && (
                        <span className="text-blue-700">+ {updates} updates</span>
                    )}
                    {contradictions > 0 && (
                        <span className="text-red-700">! {contradictions} contradiction{contradictions > 1 ? 's' : ''}</span>
                    )}
                </div>
                <button
                    onClick={onViewDiff}
                    className="px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 rounded-lg transition-colors"
                >
                    View diff →
                </button>
            </div>
        </div>
    );
}

function EvidenceDrawer({ sources, activeChipId }: { sources: Source[]; activeChipId?: string }) {
    const [activeTab, setActiveTab] = useState<'sources' | 'artifacts' | 'verify'>('sources');
    const [searchQuery, setSearchQuery] = useState('');

    const filteredSources = sources.filter(s =>
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.domain.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const groupedSources = filteredSources.reduce((acc, source) => {
        if (!acc[source.section]) acc[source.section] = [];
        acc[source.section].push(source);
        return acc;
    }, {} as Record<string, Source[]>);

    return (
        <div className="h-full flex flex-col bg-gray-50 border-l border-gray-200">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 bg-white">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Evidence</h3>

                {/* Tabs */}
                <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mb-3">
                    {(['sources', 'artifacts', 'verify'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${activeTab === tab
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search sources..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {activeTab === 'sources' && Object.entries(groupedSources).map(([section, items]) => (
                    <div key={section}>
                        <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                            {section.replace(/_/g, ' ')}
                        </div>
                        <div className="space-y-2">
                            {items.map((source) => (
                                <div
                                    key={source.id}
                                    className={`p-3 bg-white rounded-lg border transition-colors cursor-pointer ${activeChipId === source.id
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <div className="flex items-start gap-2 mb-1">
                                        <ExternalLink className="w-3 h-3 text-gray-400 shrink-0 mt-0.5" />
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-medium text-gray-900 leading-tight mb-1">
                                                {source.title}
                                            </div>
                                            <div className="text-[10px] text-gray-500">{source.domain}</div>
                                        </div>
                                        {source.verified && <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />}
                                    </div>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="px-1.5 py-0.5 bg-gray-100 text-[9px] text-gray-600 rounded">
                                            {source.tool}
                                        </span>
                                        <span className="text-[9px] text-gray-400">
                                            {source.timestamp.toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                {activeTab === 'artifacts' && (
                    <div className="text-center text-xs text-gray-500 py-8">
                        Artifacts timeline coming soon
                    </div>
                )}

                {activeTab === 'verify' && (
                    <div className="text-center text-xs text-gray-500 py-8">
                        Verification panel coming soon
                    </div>
                )}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function DossierNewsletter() {
    const [sections, setSections] = useState(MOCK_SECTIONS);

    const handleToggleExpand = (key: string) => {
        setSections(prev =>
            prev.map(s => (s.key === key ? { ...s, isExpanded: !s.isExpanded } : s))
        );
    };

    const handleTogglePin = (key: string) => {
        setSections(prev =>
            prev.map(s => (s.key === key ? { ...s, isPinned: !s.isPinned } : s))
        );
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Top Bar */}
            <TopBar
                entity="Etched.ai"
                scope="This Week"
                verificationStatus="partial"
                lastRefresh={new Date('2024-11-26')}
                onSubscribe={() => console.log('Subscribe clicked')}
                onExport={() => console.log('Export clicked')}
                onRefresh={() => console.log('Refresh clicked')}
            />

            {/* Main Layout */}
            <div className="max-w-7xl mx-auto pt-6 pb-12">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
                    {/* Main Content */}
                    <div className="px-6">
                        {/* Digest Hero */}
                        <DigestHero
                            title="Weekly Brief — Etched.ai"
                            summary="Etched is building custom ASICs for Transformer inference, claiming 10x performance improvements over GPUs. The company raised $120M Series A and is hiring aggressively from top ML hardware teams. Strong technical positioning but no commercial product yet."
                            kpis={[
                                { label: 'Funding', value: '$120M Series A', status: 'positive' },
                                { label: 'Hiring', value: '+15 engineers', status: 'positive' },
                                { label: 'Product', value: 'Alpha testing', status: 'neutral' },
                            ]}
                            confidence="cross-referenced"
                        />

                        {/* What Changed */}
                        <WhatChangedStrip
                            newSources={6}
                            updates={2}
                            contradictions={0}
                            onViewDiff={() => console.log('View diff clicked')}
                        />

                        {/* Section Cards */}
                        {sections.map((section) => (
                            <SectionCard
                                key={section.key}
                                section={section}
                                onToggleExpand={() => handleToggleExpand(section.key)}
                                onTogglePin={() => handleTogglePin(section.key)}
                            />
                        ))}
                    </div>

                    {/* Evidence Drawer */}
                    <div className="hidden lg:block sticky top-20 h-[calc(100vh-6rem)]">
                        <EvidenceDrawer sources={MOCK_SOURCES} />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default DossierNewsletter;
