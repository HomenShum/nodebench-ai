import React, { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { ArrowRight, Newspaper, Zap, TrendingUp, Briefcase, LayoutGrid, Layers, Bell, ScrollText } from "lucide-react";
import { formatBriefDate, isBriefDateToday } from "@/lib/briefDate";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { EvidenceProvider, useEvidence } from "@/features/research/contexts/EvidenceContext";
import { useFastAgent } from "@/features/agents/context/FastAgentContext";
import type { FeedItem } from "@/features/research/components/FeedCard";
import type { Evidence } from "@/features/research/types";
// Lazy-load all section components to reduce initial bundle size
const BriefingSection = React.lazy(() => import("@/features/research/sections/BriefingSection").then(m => ({ default: m.BriefingSection })));
const DashboardSection = React.lazy(() => import("@/features/research/sections/DashboardSection").then(m => ({ default: m.DashboardSection })));
const DigestSection = React.lazy(() => import("@/features/research/sections/DigestSection").then(m => ({ default: m.DigestSection })));
const FeedSection = React.lazy(() => import("@/features/research/sections/FeedSection").then(m => ({ default: m.FeedSection })));
const ActAwareDashboard = React.lazy(() => import("@/features/research/components/ActAwareDashboard").then(m => ({ default: m.ActAwareDashboard })));
const PersonalPulse = React.lazy(() => import("@/features/research/components/PersonalPulse").then(m => ({ default: m.PersonalPulse })));
const IntelPulseMonitor = React.lazy(() => import("@/features/research/components/IntelPulseMonitor").then(m => ({ default: m.IntelPulseMonitor })));
const FeedReaderModal = React.lazy(() => import("@/features/research/components/FeedReaderModal").then(m => ({ default: m.FeedReaderModal })));
const EntityContextDrawer = React.lazy(() => import("@/features/research/components/EntityContextDrawer").then(m => ({ default: m.EntityContextDrawer })));
const DealRadar = React.lazy(() => import("@/features/research/components/DealRadar").then(m => ({ default: m.DealRadar })));
const NotificationActivityPanel = React.lazy(() => import("@/components/NotificationActivityPanel").then(m => ({ default: m.NotificationActivityPanel })));
const WhatChangedPanelLazy = React.lazy(() => import("@/features/research/components/WhatChangedPanel"));
const ProductChangelogPanelLazy = React.lazy(() => import("@/features/research/components/ProductChangelogPanel"));

import { usePersonalBrief } from "@/features/research/hooks/usePersonalBrief";
import { TimelineStrip, type TimelineEvent, type TemporalPhase } from "@/features/research/components/TimelineStrip";
import type { ReaderItem } from "@/features/research/components/FeedReaderModal";
import { cn } from "@/lib/utils";

// Loading fallback for lazy-loaded sections - shimmer skeleton
const SectionLoading = () => (
  <div className="py-6 space-y-4 animate-pulse">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-gray-200/60 rounded-lg" />
      <div className="space-y-2 flex-1">
        <div className="h-4 bg-gray-200/60 rounded w-1/3" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
      </div>
    </div>
    <div className="space-y-2">
      <div className="h-3 bg-gray-100 rounded w-full" />
      <div className="h-3 bg-gray-100 rounded w-5/6" />
      <div className="h-3 bg-gray-100 rounded w-4/6" />
    </div>
  </div>
);

// Tab definitions for the main content sections
type ContentTab = 'overview' | 'signals' | 'briefing' | 'deals' | 'changes' | 'changelog';

const CONTENT_TABS: Array<{ id: ContentTab; label: string; icon: React.ElementType; description: string }> = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid, description: 'Digest + Personal Pulse' },
  { id: 'signals', label: 'Signals', icon: Zap, description: 'Live Signal Stream' },
  { id: 'briefing', label: 'Briefing', icon: Layers, description: 'Deep Institutional Analysis' },
  { id: 'deals', label: 'Deals', icon: Briefcase, description: 'Deal Radar & Funding' },
  { id: 'changes', label: 'Changes', icon: Bell, description: 'What Changed [Sources]' },
  { id: 'changelog', label: 'Changelog', icon: ScrollText, description: 'Product updates' },
];

export interface ResearchHubProps {
  onDocumentSelect?: (documentId: string) => void;
  onEnterWorkspace?: () => void;
  /** When true, renders content-only (no sidebar/header) for use inside MainLayout */
  embedded?: boolean;
  /** Optional initial tab when opening the hub */
  initialTab?: ContentTab;
  /** Source toggles from parent (MainLayout) - used in embedded mode */
  activeSources?: string[];
  onToggleSource?: (sourceId: string) => void;
  onGoHome?: () => void;
}

function ResearchHubContent(props: ResearchHubProps) {
  const {
    embedded = false,
    onDocumentSelect: _onDocumentSelect,
    onEnterWorkspace: _onEnterWorkspace,
    initialTab,
    activeSources: _activeSources,
    onToggleSource: _onToggleSource,
    onGoHome,
  } = props;

  const { openWithContext } = useFastAgent();
  const { registerEvidence } = useEvidence();
  const updateFocus = useMutation(api.domains.dossier.focusState.updateFocus);
  const seedAuditSignals = useMutation(api.feed.seedAuditSignals);
  const [activeAct, setActiveAct] = useState<"actI" | "actII" | "actIII">("actI");
  const [phaseFilter, setPhaseFilter] = useState<TemporalPhase | "all">("all");
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);
  const [readerItem, setReaderItem] = useState<ReaderItem | null>(null);
  const [activeEntity, setActiveEntity] = useState<{ name: string; type: "company" | "person" } | null>(null);
  const seededAuditRef = useRef(false);
  const [activeTab, setActiveTab] = useState<ContentTab>(() => initialTab ?? 'overview');

  // Fetch all brief data (Global + Personal)
  const {
    executiveBrief,
    sourceSummary,
    dashboardMetrics,
    evidence,
    deltas,
    briefMemory,
    personalizedContext,
    tasksToday,
    recentDocs,
    taskResults,
    availableDates,
    briefingDateString,
    isLoading
  } = usePersonalBrief({ dateString: selectedDate });

  const userPreferences = useQuery(api.domains.auth.userPreferences.getUserPreferences);
  const trackedHashtags = userPreferences?.trackedHashtags ?? [];
  const techStack = userPreferences?.techStack?.length
    ? userPreferences.techStack
    : ["AWS", "Vercel", "Postgres", "Cloudflare"];

  const isBriefToday = isBriefDateToday(briefingDateString);
  const briefLabel = isBriefToday ? "Today's Intelligence Brief" : "Latest Intelligence Brief";
  const briefDateLabel = briefingDateString ? formatBriefDate(briefingDateString) : null;

  const briefId = (briefMemory as any)?._id || "morning_brief_latest";
  const dossierContextBase = useMemo(() => ({
    briefId,
    currentAct: activeAct,
  }), [briefId, activeAct]);

  useEffect(() => {
    if (evidence && evidence.length > 0) {
      registerEvidence(evidence);
    }
  }, [evidence, registerEvidence]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (seededAuditRef.current) return;
    seededAuditRef.current = true;
    seedAuditSignals({})
      .then((result) => {
        if (result?.inserted) {
          console.info(`[ResearchHub] Seeded ${result.inserted} audit signals.`);
        }
      })
      .catch((err) => console.warn("[ResearchHub] Audit signal seed failed:", err?.message || err));
  }, [seedAuditSignals]);

  const phasedDashboardMetrics = useMemo(() => {
    if (!dashboardMetrics) return null;
    const trendLine = dashboardMetrics.charts?.trendLine;
    if (!trendLine || !trendLine.series?.length) return dashboardMetrics;

    const totalPoints = trendLine.xAxisLabels?.length ?? trendLine.series[0]?.data?.length ?? 0;
    const basePresent = typeof trendLine.presentIndex === "number"
      ? trendLine.presentIndex
      : (trendLine.visibleEndIndex ?? totalPoints - 1);
    const safePresent = Math.max(0, Math.min(basePresent, Math.max(0, totalPoints - 1)));

    let visibleEnd = trendLine.visibleEndIndex ?? Math.max(0, totalPoints - 1);
    let presentIndex = safePresent;
    let timeWindow = trendLine.timeWindow;

    if (phaseFilter === "past") {
      visibleEnd = Math.max(0, safePresent - 1);
      presentIndex = visibleEnd;
      timeWindow = "Historical window";
    } else if (phaseFilter === "future") {
      presentIndex = Math.max(0, safePresent - 2);
      timeWindow = "Projection window";
    } else if (phaseFilter === "present") {
      visibleEnd = safePresent;
      presentIndex = safePresent;
      timeWindow = "Current window";
    }

    const phaseScalar = phaseFilter === "past" ? 0.96 : phaseFilter === "future" ? 1.04 : 1;
    const capabilities = (dashboardMetrics.capabilities ?? []).map((cap) => ({
      ...cap,
      score: Math.round(Math.min(100, cap.score * phaseScalar)),
    }));
    const keyStats = (dashboardMetrics.keyStats ?? []).map((stat) => ({
      ...stat,
      context:
        phaseFilter === "future"
          ? "Projection"
          : phaseFilter === "past"
            ? "Historical"
            : stat.context,
    }));

    return {
      ...dashboardMetrics,
      keyStats,
      capabilities,
      charts: {
        ...dashboardMetrics.charts,
        trendLine: {
          ...trendLine,
          visibleEndIndex: Math.min(Math.max(visibleEnd, 0), Math.max(0, totalPoints - 1)),
          presentIndex,
          timeWindow,
        },
      },
    };
  }, [dashboardMetrics, phaseFilter]);

  // Hoist agent plans for the adaptive HUD
  const agentPlans = useQuery(
    api.domains.agents.agentPlanning.listPlans,
    { limit: 3 }
  );

  const workflowSteps = useMemo(() => {
    if (!agentPlans || agentPlans.length === 0) return [];
    const latestPlan = agentPlans[0];
    return latestPlan.steps || [];
  }, [agentPlans]);

  // Timeline events derived from evidence and dashboard data
  const timelineEvents: TimelineEvent[] = useMemo(() => {
    const events: TimelineEvent[] = [];
    const now = new Date();

    // Past events from evidence
    evidence?.forEach((e: any, idx: number) => {
      if (e.date || e.timestamp) {
        const dateStr = e.date || e.timestamp;
        events.push({
          id: `evidence-${idx}`,
          date: typeof dateStr === 'string' ? dateStr : new Date(dateStr).toISOString(),
          label: e.title || e.label || 'Evidence',
          description: e.summary || e.text,
          phase: 'past',
        });
      }
    });

    // Present: Today's briefing
    if (briefingDateString) {
      events.push({
        id: 'today-briefing',
        date: briefingDateString,
        label: briefLabel,
        description: executiveBrief?.summary || 'Current market synthesis',
        phase: 'present',
        isCurrent: true,
      });
    }

    // Future projections from dashboard forecasts
    const futureDate = new Date(now);
    futureDate.setDate(futureDate.getDate() + 7);
    events.push({
      id: 'forecast-week',
      date: futureDate.toISOString(),
      label: 'Weekly Outlook',
      description: 'Projected market movements and upcoming catalysts',
      phase: 'future',
    });

    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [evidence, briefingDateString, executiveBrief, briefLabel]);

  const formatTimestamp = useCallback((value?: string) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }, []);

  const buildReaderItem = useCallback((input: {
    id?: string;
    title?: string;
    url?: string;
    source?: string;
    summary?: string;
    relevance?: string;
    publishedAt?: string;
    tags?: string[];
    subtitle?: string;
    timestamp?: string;
  }): ReaderItem => {
    const title = input.title ?? input.url ?? "Source";
    const subtitle = input.subtitle ?? input.summary ?? input.relevance ?? "";
    const timestamp = input.timestamp ?? formatTimestamp(input.publishedAt);
    const tags = input.tags ?? (input.source ? [input.source] : []);
    return {
      id: input.id ?? input.url ?? title,
      title,
      subtitle,
      timestamp,
      url: input.url,
      source: input.source,
      tags,
      raw: input,
    };
  }, [formatTimestamp]);

  // Intersection Observer for Act tracking
  const actIRef = useRef<HTMLElement>(null);
  const actIIRef = useRef<HTMLElement>(null);
  const actIIIRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const actId = entry.target.getAttribute("data-act-id") as "actI" | "actII" | "actIII";
            if (actId) {
              setActiveAct(actId);
              // Update focus in Convex for bidirectional sync
              updateFocus({
                briefId: (briefMemory as any)?._id || "morning_brief_latest",
                currentAct: actId,
                focusSource: "panel_action"
              }).catch(err => console.error("Failed to update act focus:", err));
            }
          }
        });
      },
      { threshold: 0.3, rootMargin: "-10% 0px -70% 0px" }
    );

    [actIRef, actIIRef, actIIIRef].forEach((ref) => {
      if (ref.current) observer.observe(ref.current);
    });

    return () => observer.disconnect();
  }, [updateFocus]);

  const handleFeedItemClick = useCallback((item: FeedItem) => {
    if (item.url) {
      setReaderItem(item);
      return;
    }

    openWithContext({
      contextTitle: item.title,
      initialMessage: `Analyze this feed item and summarize key takeaways.\n\n${item.title}${item.subtitle ? `\n\n${item.subtitle}` : ""}`,
      dossierContext: {
        ...dossierContextBase,
        activeSectionId: "signal_stream",
      },
    });
  }, [openWithContext, dossierContextBase]);

  const handleOpenReader = useCallback((input: {
    id?: string;
    title?: string;
    url?: string;
    source?: string;
    summary?: string;
    relevance?: string;
    publishedAt?: string;
    tags?: string[];
    subtitle?: string;
    timestamp?: string;
    category?: string;
  }) => {
    if (!input.url) return;
    setReaderItem(buildReaderItem({
      ...input,
      tags: input.tags ?? (input.category ? [input.category] : undefined),
    }));
  }, [buildReaderItem]);

  const handleEvidenceOpen = useCallback((ev: Evidence) => {
    handleOpenReader({
      id: ev.id,
      title: ev.title ?? ev.source,
      url: ev.url,
      source: ev.source,
      relevance: ev.relevance,
      summary: ev.summary,
      publishedAt: ev.publishedAt,
      tags: ev.source ? [ev.source] : [],
    });
  }, [handleOpenReader]);

  const handleCoverageOpen = useCallback((item: {
    title?: string;
    url?: string;
    source?: string;
    summary?: string;
    category?: string;
  }) => {
    handleOpenReader({
      title: item.title,
      url: item.url,
      source: item.source,
      summary: item.summary,
      category: item.category,
    });
  }, [handleOpenReader]);

  const handleEntityOpen = useCallback((entityName: string, entityType?: "company" | "person") => {
    if (!entityName) return;
    setActiveEntity({ name: entityName, type: entityType ?? "company" });
  }, []);

  const handleEntityClose = useCallback(() => {
    setActiveEntity(null);
  }, []);

  const handleFeedOpenWithAgent = useCallback((item: FeedItem) => {
    openWithContext({
      contextTitle: item.title,
      contextWebUrls: item.url ? [item.url] : undefined,
      initialMessage: `Deep dive on: ${item.title}\n\nWhat happened, why it matters, and what to watch next?`,
      dossierContext: {
        ...dossierContextBase,
        activeSectionId: "signal_stream",
      },
    });
  }, [openWithContext, dossierContextBase]);

  const handleDigestItemClick = useCallback((item: { text: string; relevance?: string; linkedEntity?: string }) => {
    openWithContext({
      contextTitle: item.linkedEntity ? `Digest: ${item.linkedEntity}` : "Morning Digest",
      initialMessage: `Expand on this digest item:\n\n${item.text}`,
      dossierContext: {
        ...dossierContextBase,
        currentAct: "actI",
        activeSectionId: "executive_synthesis",
      },
    });
  }, [openWithContext, dossierContextBase]);

  const handleAskAI = useCallback((prompt: string) => {
    openWithContext({
      contextTitle: "Executive Brief",
      initialMessage: prompt,
      dossierContext: {
        ...dossierContextBase,
        activeSectionId: "institutional_briefing",
      },
    });
  }, [openWithContext, dossierContextBase]);

  const handleAskAgentAboutChanges = useCallback((input: { prompt: string; urls?: string[] }) => {
    openWithContext({
      contextTitle: "What Changed",
      contextWebUrls: input.urls,
      initialMessage: input.prompt,
      dossierContext: {
        ...dossierContextBase,
        activeSectionId: "knowledge_product_changes",
      },
    });
  }, [openWithContext, dossierContextBase]);

  const handleDashboardPointClick = useCallback((point: { seriesId: string; dataIndex: number; dataLabel: string; value: number; unit?: string }) => {
    openWithContext({
      contextTitle: "Pulse Overview",
      initialMessage: `Analyze this chart point:\n- Series: ${point.seriesId}\n- Point: ${point.dataLabel}\n- Value: ${point.value}${point.unit ?? ""}\n\nWhat changed, what it implies, and the next actions to consider.`,
      dossierContext: {
        ...dossierContextBase,
        focusedDataIndex: point.dataIndex,
        chartContext: {
          seriesId: point.seriesId,
          dataLabel: point.dataLabel,
          value: point.value,
          unit: point.unit,
        },
      },
    });
  }, [openWithContext, dossierContextBase]);

  return (
    <div className={`${embedded ? "h-full" : "h-screen"} flex flex-col bg-background overflow-hidden`}>
      {!embedded && (
        <header className="h-20 bg-background/95 backdrop-blur-md sticky top-0 z-50 flex items-center justify-between px-12 border-b border-gray-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gray-900 rounded-none flex items-center justify-center text-white shadow-none transform hover:scale-105 transition-transform duration-300">
              <span className="text-2xl">N</span>
            </div>
            <div>
              <div className="text-2xl font-bold tracking-tight text-[color:var(--text-primary)] italic leading-none cursor-pointer" onClick={onGoHome}>Research Hub</div>
              <div className="text-[10px] font-black text-gray-900 uppercase tracking-[0.3em] mt-1 ml-0.5 opacity-60">Archive Dossier 2027</div>
            </div>
          </div>

          {onGoHome && (
            <button
              type="button"
              onClick={onGoHome}
              className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] hover:text-gray-900 transition-colors"
            >
              <ArrowRight className="w-3 h-3 rotate-180" />
              <span>Return to Pulse</span>
            </button>
          )}

          <div className="flex items-center gap-8">
            {/* Historical Date Selector */}
            <div className="flex items-center gap-2 p-1 bg-gray-100/50 border border-gray-200">
              {availableDates && availableDates.length > 0 ? (
                <>
                  {availableDates.slice(0, 3).map((date: string) => (
                    <button
                      type="button"
                      key={date}
                      onClick={() => setSelectedDate(date)}
                      className={`px-3 py-1 text-[9px] font-bold uppercase tracking-tighter transition-all ${(selectedDate === date || (!selectedDate && date === briefingDateString))
                        ? "bg-gray-950 text-white shadow-lg"
                        : "text-gray-400 hover:text-gray-900"
                        }`}
                    >
                      {new Date(date + "T00:00:00").toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </button>
                  ))}
                  <div className="w-[1px] h-3 bg-gray-300 mx-1" />
                  <button
                    type="button"
                    onClick={() => setSelectedDate(undefined)}
                    className={`px-3 py-1 text-[9px] font-bold uppercase tracking-tighter transition-all ${!selectedDate ? "bg-gray-950 text-white" : "text-gray-400"}`}
                  >
                    Latest
                  </button>
                </>
              ) : (
                <span className="px-3 py-1 text-[9px] font-bold text-gray-400 uppercase tracking-widest">Live Live Live</span>
              )}
            </div>

            <div className="hidden sm:flex items-center gap-3 text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">
              <div className="w-2 h-2 rounded-full bg-gray-700 animate-pulse" />
              <span>Encrypted Intelligence Stream</span>
            </div>
            <div className="hidden sm:block w-[1px] h-6 bg-gray-200" />
            <div className="text-sm font-semibold text-gray-600 font-mono tracking-widest">
              <span>{briefingDateString?.replace(/-/g, '.').toUpperCase()}</span>
            </div>
          </div>
        </header>
      )}

      {/* UNIFIED SCROLL CONTAINER */}
      <main className="flex-1 overflow-y-auto custom-scrollbar bg-background">
        {embedded && onGoHome && (
          <div className="mx-auto max-w-[1600px] px-6 md:px-12 xl:px-16 pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-200 pb-3">
              <button
                type="button"
                onClick={onGoHome}
                className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] hover:text-gray-900 transition-colors"
              >
                <ArrowRight className="w-3 h-3 rotate-180" />
                <span>Return to Pulse Overview</span>
              </button>
              {briefDateLabel && (
                <div className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">
                  {isBriefToday ? "Updated today" : `Latest brief: ${briefDateLabel}`}
                </div>
              )}
            </div>
          </div>
        )}
        {/* TIMELINE STRIP - Past + Present + Future temporal context */}
        <TimelineStrip
          events={timelineEvents}
          activeEventId={activeAct === 'actI' ? 'today-briefing' : undefined}
          phaseFilter={phaseFilter}
          onPhaseChange={setPhaseFilter}
          onEventClick={(event) => {
            const currentAct = event.phase === 'past' ? 'actI' : event.phase === 'present' ? 'actII' : 'actIII';
            openWithContext({
              contextTitle: `Timeline: ${event.label}`,
              initialMessage: `Tell me more about: "${event.label}" (${event.date})${event.description ? `\n\nContext: ${event.description}` : ''}`,
              dossierContext: {
                ...dossierContextBase,
                currentAct,
                activeSectionId: "timeline_strip",
              },
            });
            // Also update the active act based on event phase
            if (event.phase === 'past') setActiveAct('actI');
            else if (event.phase === 'present') setActiveAct('actII');
            else setActiveAct('actIII');
            setPhaseFilter(event.phase);
          }}
          className="mx-auto max-w-[1600px] px-16 pt-8"
        />

        <div className="max-w-[1600px] mx-auto flex items-start gap-4">

          {/* LEFT: MAIN CONTENT WITH TABS */}
          <div className="flex-1 pl-6 md:pl-10 pr-4 md:pr-6 py-4 pb-16">

            {/* TAB NAVIGATION */}
            <nav className="flex items-center gap-1 mb-4 p-1 bg-gray-100/50 dark:bg-white/[0.04] rounded-lg border border-gray-200 dark:border-white/[0.06] w-fit">
              {CONTENT_TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all',
                      activeTab === tab.id
                        ? 'bg-white dark:bg-white/[0.08] text-gray-900 dark:text-gray-100 shadow-sm border border-gray-200 dark:border-white/[0.06]'
                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.04]'
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* TAB CONTENT */}
            <div className="space-y-6">

              {/* OVERVIEW TAB: Digest + Personal Pulse */}
              {activeTab === 'overview' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  {/* Executive Synthesis */}
                  <section ref={actIRef} data-act-id="actI">
                    <div className="mb-3 flex items-center justify-between border-b border-gray-200 dark:border-white/[0.06] pb-2">
                      <div className="flex items-center gap-3">
                        <Newspaper className="w-4 h-4 text-gray-800" />
                        <h3 className="text-[11px] font-black text-gray-900 dark:text-gray-100 uppercase tracking-[0.3em]">Executive Synthesis</h3>
                        {selectedDate && (
                          <span className="px-1.5 py-0.5 bg-amber-100 text-amber-900 text-[9px] font-bold uppercase tracking-wider border border-amber-900/10 rounded">Archive</span>
                        )}
                      </div>
                      <div className={cn('w-1.5 h-1.5 rounded-full animate-pulse', selectedDate ? 'bg-amber-500' : 'bg-indigo-600')} />
                    </div>
                    <React.Suspense fallback={<SectionLoading />}>
                      <DigestSection
                        onItemClick={handleDigestItemClick}
                        onEntityClick={handleEntityOpen}
                      />
                    </React.Suspense>
                  </section>

                  {/* Personal Pulse */}
                  <section className="pt-2">
                    <React.Suspense fallback={<SectionLoading />}>
                      <PersonalPulse
                        personalizedContext={personalizedContext}
                        tasksToday={tasksToday || []}
                        recentDocs={recentDocs || []}
                        onDocumentSelect={props.onDocumentSelect}
                      />
                    </React.Suspense>
                  </section>
                </div>
              )}

              {/* SIGNALS TAB: Live Signal Stream */}
              {activeTab === 'signals' && (
                <section ref={actIIIRef} data-act-id="actIII" className="animate-in fade-in duration-300">
                  <div className="mb-3 flex items-center justify-between border-b border-gray-200 dark:border-white/[0.06] pb-2">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      <h3 className="text-[11px] font-black text-gray-900 dark:text-gray-100 uppercase tracking-[0.3em]">Live Signal Stream</h3>
                    </div>
                    <div className="px-1.5 py-0.5 bg-indigo-50 text-gray-800 border border-indigo-200 text-[9px] font-bold uppercase tracking-wider rounded">Real-time</div>
                  </div>
                  <div className="bg-gray-50/50 dark:bg-white/[0.02] p-4 border border-gray-200/60 dark:border-white/[0.06] rounded-lg">
                    <React.Suspense fallback={<SectionLoading />}>
                      <FeedSection
                        onItemClick={handleFeedItemClick}
                        onOpenWithAgent={handleFeedOpenWithAgent}
                      />
                    </React.Suspense>
                  </div>
                </section>
              )}

              {/* BRIEFING TAB: Institutional Briefing */}
              {activeTab === 'briefing' && (
                <section ref={actIIRef} data-act-id="actII" className="animate-in fade-in duration-300">
                  <div className="mb-3 flex items-center justify-between border-b border-gray-200 dark:border-white/[0.06] pb-2">
                    <div className="flex items-center gap-3">
                      <Layers className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      <h3 className="text-[11px] font-black text-gray-900 dark:text-gray-100 uppercase tracking-[0.3em]">Institutional Briefing</h3>
                    </div>
                    <span className="text-[10px] font-medium italic text-gray-400">Deep Analysis</span>
                  </div>
                  <React.Suspense fallback={<SectionLoading />}>
                    <BriefingSection
                      onActChange={(act) => {
                        setActiveAct(act as any);
                        updateFocus({ briefId: (briefMemory as any)?._id || "morning_brief_latest", currentAct: act as any });
                      }}
                      onAskAI={handleAskAI}
                      onOpenReader={handleOpenReader}
                    />
                  </React.Suspense>
                </section>
              )}

              {/* DEALS TAB: Deal Radar */}
              {activeTab === 'deals' && (
                <section className="animate-in fade-in duration-300 pb-8">
                  <div className="mb-3 flex items-center justify-between border-b border-gray-200 dark:border-white/[0.06] pb-2">
                    <div className="flex items-center gap-3">
                      <Briefcase className="w-4 h-4 text-gray-700" />
                      <h3 className="text-[11px] font-black text-gray-900 dark:text-gray-100 uppercase tracking-[0.3em]">Deal Radar</h3>
                    </div>
                    <div className="px-1.5 py-0.5 bg-gray-900 text-white text-[9px] font-bold uppercase tracking-wider rounded">JPM</div>
                  </div>
                  <React.Suspense fallback={<SectionLoading />}>
                    <DealRadar
                      onDealClick={(dealId, companyName) => {
                        setActiveEntity({ name: companyName, type: "company" });
                      }}
                    />
                  </React.Suspense>
                </section>
              )}

              {/* CHANGES TAB: Knowledge Product Layer diffs */}
              {activeTab === 'changes' && (
                <section className="animate-in fade-in duration-300 pb-8">
                  <div className="mb-3 flex items-center justify-between border-b border-gray-200 dark:border-white/[0.06] pb-2">
                    <div className="flex items-center gap-3">
                      <Bell className="w-4 h-4 text-indigo-700" />
                      <h3 className="text-[11px] font-black text-gray-900 dark:text-gray-100 uppercase tracking-[0.3em]">What Changed</h3>
                    </div>
                    <div className="px-1.5 py-0.5 bg-indigo-50 text-indigo-800 border border-indigo-200 text-[9px] font-bold uppercase tracking-wider rounded">Sources</div>
                  </div>
                  <div className="bg-gray-50/50 dark:bg-white/[0.02] p-4 border border-gray-200/60 dark:border-white/[0.06] rounded-lg">
                    <React.Suspense
                      fallback={
                        <div className="flex items-center justify-center py-10 text-sm text-gray-500">
                          Loading changes…
                        </div>
                      }
                    >
                      <WhatChangedPanelLazy limit={20} daysBack={30} onAskAgent={handleAskAgentAboutChanges} />
                    </React.Suspense>
                  </div>
                </section>
              )}

              {/* CHANGELOG TAB: Product changelog */}
              {activeTab === 'changelog' && (
                <section className="animate-in fade-in duration-300 pb-8">
                  <div className="mb-3 flex items-center justify-between border-b border-gray-200 dark:border-white/[0.06] pb-2">
                    <div className="flex items-center gap-3">
                      <ScrollText className="w-4 h-4 text-gray-800" />
                      <h3 className="text-[11px] font-black text-gray-900 dark:text-gray-100 uppercase tracking-[0.3em]">Changelog</h3>
                    </div>
                    <div className="px-1.5 py-0.5 bg-indigo-50 text-gray-800 border border-indigo-200 text-[9px] font-bold uppercase tracking-wider rounded">Product</div>
                  </div>
                  <div className="bg-gray-50/50 dark:bg-white/[0.02] p-4 border border-gray-200/60 dark:border-white/[0.06] rounded-lg">
                    <React.Suspense
                      fallback={
                        <div className="flex items-center justify-center py-10 text-sm text-gray-500">
                          Loading changelog...
                        </div>
                      }
                    >
                      <ProductChangelogPanelLazy />
                    </React.Suspense>
                  </div>
                </section>
              )}
            </div>
          </div>

          {/* RIGHT: COMPACT HUD SIDEBAR */}
          <aside className="w-[340px] shrink-0 sticky top-0 h-fit py-4 pr-6 hidden xl:block">
            {/* Gradient separator */}
            <div className="absolute left-0 top-4 bottom-4 w-px bg-gradient-to-b from-gray-200/0 via-gray-200 to-gray-200/0" />

            <div className="space-y-4 pl-4">
              <React.Suspense fallback={<SectionLoading />}>
                {phasedDashboardMetrics ? (
                  <ActAwareDashboard
                    activeAct={activeAct}
                    dashboardData={phasedDashboardMetrics}
                    executiveBrief={executiveBrief}
                    sourceSummary={sourceSummary}
                    evidence={evidence || []}
                    workflowSteps={workflowSteps}
                    deltas={deltas}
                    onDataPointClick={handleDashboardPointClick}
                    onEvidenceClick={handleEvidenceOpen}
                  />
                ) : (
                  <DashboardSection activeAct={activeAct} />
                )}
              </React.Suspense>
              <React.Suspense fallback={<SectionLoading />}>
                <NotificationActivityPanel
                  mode="topic"
                  variant="hub"
                  title="Activity Log"
                  subtitle="nodebench"
                  limit={4}
                />
              </React.Suspense>
            </div>
          </aside>
        </div>
      </main>

      {/* LIVE INTEL FLOW MONITOR */}
      <React.Suspense fallback={null}>
        <IntelPulseMonitor taskResults={taskResults || []} />
      </React.Suspense>

      <React.Suspense fallback={null}>
        <FeedReaderModal
          item={readerItem}
          techStack={techStack}
          onClose={() => setReaderItem(null)}
        />
      </React.Suspense>
      <React.Suspense fallback={null}>
        <EntityContextDrawer
          isOpen={Boolean(activeEntity)}
          entityName={activeEntity?.name ?? null}
          entityType={activeEntity?.type}
          trackedHashtags={trackedHashtags}
          techStack={techStack}
          onClose={handleEntityClose}
          onOpenReader={handleOpenReader}
        />
      </React.Suspense>
    </div>
  );
}

export default function ResearchHub(props: ResearchHubProps) {
  return (
    <EvidenceProvider>
      <ResearchHubContent {...props} />
    </EvidenceProvider>
  );
}
