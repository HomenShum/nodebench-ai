import React, { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { EvidenceProvider } from "@/features/research/contexts/EvidenceContext";
import { useFastAgent } from "@/features/agents/context/FastAgentContext";
import type { FeedItem } from "@/features/research/components/FeedCard";
import {
  BriefingSection,
  DashboardSection,
  DealListSection,
  DigestSection,
  FeedSection,
} from "@/features/research/sections";
import { ActAwareDashboard } from "@/features/research/components/ActAwareDashboard";
import { useBriefData } from "@/features/research/hooks/useBriefData";
import { useMemo } from "react";

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

export default function ResearchHub(props: ResearchHubProps) {
  const {
    embedded = false,
    onDocumentSelect: _onDocumentSelect,
    onEnterWorkspace: _onEnterWorkspace,
    activeSources: _activeSources,
    onToggleSource: _onToggleSource,
    onGoHome,
  } = props;

  const { openWithContext } = useFastAgent();
  const updateFocus = useMutation(api.domains.dossier.focusState.updateFocus);
  const [activeAct, setActiveAct] = useState<"actI" | "actII" | "actIII">("actI");

  // Fetch all brief data at the landing level to feed the adaptive dashboard
  const {
    executiveBrief,
    sourceSummary,
    dashboardMetrics,
    evidence,
    deltas,
    briefMemory
  } = useBriefData();

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
      window.open(item.url, "_blank", "noopener,noreferrer");
      return;
    }

    openWithContext({
      contextTitle: item.title,
      initialMessage: `Analyze this feed item and summarize key takeaways.\n\n${item.title}${item.subtitle ? `\n\n${item.subtitle}` : ""}`,
    });
  }, [openWithContext]);

  const handleFeedOpenWithAgent = useCallback((item: FeedItem) => {
    openWithContext({
      contextTitle: item.title,
      contextWebUrls: item.url ? [item.url] : undefined,
      initialMessage: `Deep dive on: ${item.title}\n\nWhat happened, why it matters, and what to watch next?`,
    });
  }, [openWithContext]);

  const handleDigestItemClick = useCallback((item: { text: string; relevance?: string; linkedEntity?: string }) => {
    openWithContext({
      contextTitle: item.linkedEntity ? `Digest: ${item.linkedEntity}` : "Morning Digest",
      initialMessage: `Expand on this digest item:\n\n${item.text}`,
    });
  }, [openWithContext]);

  const handleAskAI = useCallback((prompt: string) => {
    openWithContext({
      contextTitle: "Executive Brief",
      initialMessage: prompt,
    });
  }, [openWithContext]);

  const handleDashboardPointClick = useCallback((point: { seriesId: string; dataIndex: number; dataLabel: string; value: number; unit?: string }) => {
    openWithContext({
      contextTitle: "Pulse Overview",
      initialMessage: `Analyze this chart point:\n- Series: ${point.seriesId}\n- Point: ${point.dataLabel}\n- Value: ${point.value}${point.unit ?? ""}\n\nWhat changed, what it implies, and the next actions to consider.`,
    });
  }, [openWithContext]);

  return (
    <EvidenceProvider>
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
              <div className="hidden sm:flex items-center gap-3 text-[10px] font-bold text-stone-500 uppercase tracking-[0.2em]">
                <div className="w-2 h-2 rounded-full bg-emerald-700 animate-pulse" />
                <span>Encrypted Intelligence Stream</span>
              </div>
              <div className="hidden sm:block w-[1px] h-6 bg-stone-200" />
              <div className="text-sm font-semibold text-stone-600 font-mono tracking-widest">
                <span>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}</span>
              </div>
            </div>
          </header>
        )}

        {/* UNIFIED SCROLL CONTAINER */}
        <main className="flex-1 overflow-y-auto custom-scrollbar bg-[#faf9f6]">
          <div className="max-w-[1600px] mx-auto flex items-start">

            {/* LEFT: THE PAPER (Scrolls with the main container) */}
            <div className="flex-1 pl-16 pr-12 py-24 space-y-48 pb-64">

              {/* 1. EXECUTIVE SYNTHESIS (ACT I) */}
              <section
                ref={actIRef}
                data-act-id="actI"
                className="animate-in fade-in duration-700"
              >
                <div className="mb-10 flex items-center justify-between border-b border-stone-200 pb-4">
                  <h3 className="text-[11px] font-black text-emerald-900 uppercase tracking-[0.4em]">Executive Synthesis</h3>
                  <div className="w-2 h-2 rounded-full bg-emerald-900 animate-pulse" />
                </div>
                <DigestSection onItemClick={handleDigestItemClick} />
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
                {dashboardMetrics ? (
                  <ActAwareDashboard
                    activeAct={activeAct}
                    dashboardData={dashboardMetrics}
                    executiveBrief={executiveBrief}
                    sourceSummary={sourceSummary}
                    evidence={evidence || []}
                    workflowSteps={workflowSteps}
                    deltas={deltas}
                    onDataPointClick={handleDashboardPointClick}
                  />
                ) : (
                  // Fallback while loading
                  <DashboardSection activeAct={activeAct} />
                )}
              </div>
            </aside>
          </div>
        </main>
      </div>
    </EvidenceProvider>
  );
}
