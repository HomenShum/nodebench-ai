import React, { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { formatBriefDate, isBriefDateToday } from "@/lib/briefDate";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { EvidenceProvider, useEvidence } from "@/features/research/contexts/EvidenceContext";
import { useFastAgent } from "@/features/agents/context/FastAgentContext";
import type { FeedItem } from "@/features/research/components/FeedCard";
import type { Evidence } from "@/features/research/types";
import {
  BriefingSection,
  DashboardSection,
  DealListSection,
  DigestSection,
  FeedSection,
} from "@/features/research/sections";
import { ActAwareDashboard } from "@/features/research/components/ActAwareDashboard";
import { usePersonalBrief } from "@/features/research/hooks/usePersonalBrief";
import { PersonalPulse } from "@/features/research/components/PersonalPulse";
import { IntelPulseMonitor } from "@/features/research/components/IntelPulseMonitor";
import { TimelineStrip, type TimelineEvent, type TemporalPhase } from "@/features/research/components/TimelineStrip";
import { NotificationActivityPanel } from "@/components/NotificationActivityPanel";
import { FeedReaderModal, type ReaderItem } from "@/features/research/components/FeedReaderModal";
import { EntityContextDrawer } from "@/features/research/components/EntityContextDrawer";

export interface ResearchHubProps {
  onDocumentSelect?: (documentId: string) => void;
  onEnterWorkspace?: () => void;
  /** When true, renders content-only (no sidebar/header) for use inside MainLayout */
  embedded?: boolean;
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
      <div className={`${embedded ? "h-full" : "h-screen"} flex flex-col bg-[#faf9f6] overflow-hidden`}>
        {!embedded && (
          <header className="h-20 bg-[#faf9f6]/95 backdrop-blur-md sticky top-0 z-50 flex items-center justify-between px-12 border-b border-stone-200 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-900 rounded-none flex items-center justify-center text-white shadow-none transform hover:scale-105 transition-transform duration-300">
                <span className="text-2xl font-serif">N</span>
              </div>
              <div>
                <div className="text-2xl font-serif font-bold tracking-tight text-gray-900 italic leading-none cursor-pointer" onClick={onGoHome}>Research Hub</div>
                <div className="text-[10px] font-black text-emerald-900 uppercase tracking-[0.3em] mt-1 ml-0.5 opacity-60">Archive Dossier 2027</div>
              </div>
            </div>

            {onGoHome && (
              <button
                onClick={onGoHome}
                className="flex items-center gap-2 text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] hover:text-emerald-900 transition-colors"
              >
                <ArrowRight className="w-3 h-3 rotate-180" />
                <span>Return to Pulse</span>
              </button>
            )}

            <div className="flex items-center gap-8">
              {/* Historical Date Selector */}
              <div className="flex items-center gap-2 p-1 bg-stone-100/50 border border-stone-200">
                {availableDates && availableDates.length > 0 ? (
                  <>
                    {availableDates.slice(0, 3).map((date: string) => (
                      <button
                        key={date}
                        onClick={() => setSelectedDate(date)}
                        className={`px-3 py-1 text-[9px] font-bold uppercase tracking-tighter transition-all ${(selectedDate === date || (!selectedDate && date === briefingDateString))
                          ? "bg-emerald-950 text-white shadow-lg"
                          : "text-stone-400 hover:text-stone-900"
                          }`}
                      >
                        {new Date(date + "T00:00:00").toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </button>
                    ))}
                    <div className="w-[1px] h-3 bg-stone-300 mx-1" />
                    <button
                      onClick={() => setSelectedDate(undefined)}
                      className={`px-3 py-1 text-[9px] font-bold uppercase tracking-tighter transition-all ${!selectedDate ? "bg-emerald-950 text-white" : "text-stone-400"}`}
                    >
                      Latest
                    </button>
                  </>
                ) : (
                  <span className="px-3 py-1 text-[9px] font-bold text-stone-400 uppercase tracking-widest">Live Live Live</span>
                )}
              </div>

              <div className="hidden sm:flex items-center gap-3 text-[10px] font-bold text-stone-500 uppercase tracking-[0.2em]">
                <div className="w-2 h-2 rounded-full bg-emerald-700 animate-pulse" />
                <span>Encrypted Intelligence Stream</span>
              </div>
              <div className="hidden sm:block w-[1px] h-6 bg-stone-200" />
              <div className="text-sm font-semibold text-stone-600 font-mono tracking-widest">
                <span>{briefingDateString?.replace(/-/g, '.').toUpperCase()}</span>
              </div>
            </div>
          </header>
        )}

        {/* UNIFIED SCROLL CONTAINER */}
        <main className="flex-1 overflow-y-auto custom-scrollbar bg-[#faf9f6]">
          {embedded && onGoHome && (
            <div className="mx-auto max-w-[1600px] px-6 md:px-12 xl:px-16 pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-stone-200 pb-3">
                <button
                  type="button"
                  onClick={onGoHome}
                  className="flex items-center gap-2 text-[10px] font-black text-stone-500 uppercase tracking-[0.2em] hover:text-emerald-900 transition-colors"
                >
                  <ArrowRight className="w-3 h-3 rotate-180" />
                  <span>Return to Pulse Overview</span>
                </button>
                {briefDateLabel && (
                  <div className="text-[10px] font-mono text-stone-400 uppercase tracking-widest">
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

          <div className="max-w-[1600px] mx-auto flex items-start">

            {/* LEFT: THE PAPER (Scrolls with the main container) */}
            <div className="flex-1 pl-16 pr-12 py-16 space-y-28 pb-32">

              {/* 1. EXECUTIVE SYNTHESIS (ACT I) */}
              <section
                ref={actIRef}
                data-act-id="actI"
                className="animate-in fade-in duration-700"
              >
                <div className="mb-10 flex items-center justify-between border-b border-stone-200 pb-4">
                  <div className="flex items-center gap-4">
                    <h3 className="text-[11px] font-black text-emerald-900 uppercase tracking-[0.4em]">Executive Synthesis</h3>
                    {selectedDate && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-900 text-[9px] font-black uppercase tracking-widest border border-amber-900/10">Archive View</span>
                    )}
                  </div>
                  <div className={`w-2 h-2 rounded-full ${selectedDate ? 'bg-amber-500' : 'bg-emerald-900'} animate-pulse`} />
                </div>
                <DigestSection
                  onItemClick={handleDigestItemClick}
                  onEntityClick={handleEntityOpen}
                />
              </section>

              {/* PERSONALIZED OVERLAY SECTION */}
              <section className="animate-in fade-in duration-700 delay-75">
                <div className="mb-10 flex items-center justify-between border-b border-stone-200 pb-4">
                  <h3 className="text-[11px] font-black text-emerald-900 uppercase tracking-[0.4em]">Personal Pulse</h3>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[9px] font-mono text-stone-400 uppercase tracking-widest">Local_Context_Active</span>
                  </div>
                </div>
                <PersonalPulse
                  personalizedContext={personalizedContext}
                  tasksToday={tasksToday || []}
                  recentDocs={recentDocs || []}
                  onDocumentSelect={props.onDocumentSelect}
                />
              </section>

              {/* 2. THE BRIEFING (ACT II) */}
              <section
                ref={actIIRef}
                data-act-id="actII"
                className="animate-in fade-in duration-700 delay-100"
              >
                <div className="mb-14 flex items-center justify-between border-b border-stone-200 pb-4">
                  <h3 className="text-[11px] font-black text-emerald-900 uppercase tracking-[0.4em]">Institutional Briefing</h3>
                  <span className="text-[10px] font-serif italic text-stone-400">Deep Analysis</span>
                </div>
                <BriefingSection
                  onActChange={(act) => {
                    setActiveAct(act as any);
                    // Logic for internal act changes within BriefingSection could still update focus
                    updateFocus({ briefId: (briefMemory as any)?._id || "morning_brief_latest", currentAct: act as any });
                  }}
                  onAskAI={handleAskAI}
                  onOpenReader={handleOpenReader}
                />
              </section>

              {/* 3. SIGNAL STREAM (ACT III) */}
              <section
                ref={actIIIRef}
                data-act-id="actIII"
                className="animate-in fade-in duration-700 delay-200"
              >
                <div className="mb-10 flex items-center justify-between border-b border-stone-200 pb-4">
                  <h3 className="text-[11px] font-black text-emerald-900 uppercase tracking-[0.4em]">Live Signal Stream</h3>
                  <div className="px-2 py-0.5 bg-emerald-50 text-emerald-900 border border-emerald-900/10 text-[9px] font-black uppercase tracking-widest">Real-time Nodes</div>
                </div>
                <div className="bg-[#f2f1ed]/30 p-10 border border-stone-200/60">
                  <FeedSection
                    onItemClick={handleFeedItemClick}
                    onOpenWithAgent={handleFeedOpenWithAgent}
                  />
                </div>
              </section>

              {/* 4. DEAL WATCHLIST */}
              <section className="animate-in fade-in duration-700 delay-300 pb-32">
                <div className="mb-10 flex items-center justify-between border-b border-stone-200 pb-4">
                  <h3 className="text-[11px] font-black text-emerald-900 uppercase tracking-[0.4em]">Institutional Deal Flow</h3>
                  <div className="px-2 py-0.5 bg-gray-900 text-white text-[9px] font-black uppercase tracking-widest">PRO_ACCESS</div>
                </div>
                <DealListSection />
              </section>
            </div>

            {/* RIGHT: THE HUD (Sticky to the main scroll container) */}
            <aside className="w-[450px] shrink-0 sticky top-0 h-fit p-12 pr-16 hidden xl:block">
              {/* Gradient separator fallback */}
              <div className="absolute left-0 top-12 bottom-12 w-px bg-gradient-to-b from-stone-200/0 via-stone-200 to-stone-200/0" />

              <div className="space-y-12">
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
                  // Fallback while loading
                  <DashboardSection activeAct={activeAct} />
                )}
                <NotificationActivityPanel
                  mode="topic"
                  variant="hub"
                  title="Morning Digest Log"
                  subtitle="Global ntfy channel: nodebench"
                  limit={5}
                />
              </div>
            </aside>
          </div>
        </main>

        {/* LIVE INTEL FLOW MONITOR */}
        <IntelPulseMonitor taskResults={taskResults || []} />

        <FeedReaderModal
          item={readerItem}
          techStack={techStack}
          onClose={() => setReaderItem(null)}
        />
        <EntityContextDrawer
          isOpen={Boolean(activeEntity)}
          entityName={activeEntity?.name ?? null}
          entityType={activeEntity?.type}
          trackedHashtags={trackedHashtags}
          techStack={techStack}
          onClose={handleEntityClose}
          onOpenReader={handleOpenReader}
        />
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
