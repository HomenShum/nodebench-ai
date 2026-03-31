/**
 * CompanyAnalysisView — 9-card structured analysis for a searched company.
 *
 * Route: /founder/analysis?company=shopify&lens=banker&output=memo
 * Demo always renders Shopify data regardless of query.
 */

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, Building2, TrendingUp, Newspaper, Cpu, Shield,
  HelpCircle, GitCompare, Layers, Download, Copy, FileText, FileCode2,
  Check, RefreshCw, Loader2, Wifi, WifiOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CitationLink } from "@/features/controlPlane/components/CitationLink";
import { ArtifactPacketPanel } from "../components/ArtifactPacketPanel";
import {
  buildFounderArtifactPacket,
  artifactPacketToMarkdown,
  artifactPacketToHtml,
  saveFounderArtifactPacket,
  loadFounderArtifactPackets,
  getArtifactPacketTypeLabel,
} from "../lib/artifactPacket";
import type { FounderArtifactPacket } from "../types/artifactPacket";
import {
  buildShopifyPacketSource,
  type SearchLens,
  type CompanySnapshot,
  type BusinessQualitySignal,
  type PlatformReadinessSignal,
  type RegulatorySignal,
  type ComparableCompany,
  type NextQuestion,
  type NewsSignal,
} from "./founderFixtures";
import { useCompanyAnalysis } from "../hooks/useCompanyAnalysis";
import {
  saveMemoToStorage,
  generateMemoId,
  copyMemoUrl,
  type ShareableMemoData,
} from "./ShareableMemoView";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const GLASS_CARD = "rounded-xl border border-white/[0.20] bg-white/[0.12] p-4";
const SECTION_HEADER = "text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60";
const ANALYSIS_STORAGE_KEY = "nodebench-analysis-artifact-packets";

const RATING_COLORS: Record<BusinessQualitySignal["rating"], string> = {
  strong: "bg-emerald-500/10 text-emerald-400",
  improving: "bg-sky-500/10 text-sky-400",
  watch: "bg-amber-500/10 text-amber-400",
  weak: "bg-rose-500/10 text-rose-400",
};

const STATUS_COLORS: Record<PlatformReadinessSignal["status"], { bar: string; text: string; width: string }> = {
  leading: { bar: "bg-emerald-500/60", text: "text-emerald-400", width: "w-[90%]" },
  building: { bar: "bg-amber-500/60", text: "text-amber-400", width: "w-[55%]" },
  lagging: { bar: "bg-rose-500/60", text: "text-rose-400", width: "w-[25%]" },
};

const RISK_COLORS: Record<string, string> = {
  low: "bg-emerald-500/10 text-emerald-400",
  medium: "bg-amber-500/10 text-amber-400",
  high: "bg-rose-500/10 text-rose-400",
};

const SIGNAL_CAT_COLORS: Record<string, string> = {
  regulatory: "bg-amber-500/10 text-amber-400",
  competitive: "bg-rose-500/10 text-rose-400",
  market: "bg-sky-500/10 text-sky-400",
  macro: "bg-violet-500/10 text-violet-400",
  partner: "bg-emerald-500/10 text-emerald-400",
};

const LENS_LABELS: Record<SearchLens, string> = {
  banker: "Banker View",
  ceo: "CEO View",
  strategy: "Strategy View",
  diligence: "Diligence View",
};

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function SnapshotCard({ snapshot }: { snapshot: CompanySnapshot }) {
  const pct = Math.round(snapshot.identityConfidence * 100);
  return (
    <div className={GLASS_CARD}>
      <h2 className={SECTION_HEADER}>Company Snapshot</h2>
      <div className="mt-3 flex items-start justify-between">
        <div>
          <h3 className="text-xl font-bold text-white/90">{snapshot.name}</h3>
          {snapshot.ticker && <span className="text-xs text-white/60">{snapshot.ticker}</span>}
        </div>
        <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs font-medium text-white/60">{snapshot.sector}</span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-white/60">{snapshot.description}</p>
      <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-accent-primary/20 bg-accent-primary/10 px-3 py-1 text-xs font-medium text-accent-primary">
        {snapshot.wedge}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Revenue", value: snapshot.revenueAnnual },
          { label: "Growth", value: snapshot.revenueGrowthYoY },
          { label: "FCF", value: snapshot.freeCashFlow },
          { label: "Market Cap", value: snapshot.marketCap ?? "N/A" },
        ].map((m) => (
          <div key={m.label} className="rounded-lg border border-white/[0.06] bg-black/10 p-2.5">
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/60">{m.label}</p>
            <p className="mt-1 text-sm font-semibold tabular-nums text-white/80">{m.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="text-white/60">Identity confidence</span>
        <span className="font-semibold tabular-nums text-emerald-400">{pct}%</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function BusinessQualityCard({ signals }: { signals: BusinessQualitySignal[] }) {
  return (
    <div className={GLASS_CARD}>
      <h2 className={SECTION_HEADER}>Business Quality</h2>
      <div className="mt-3 space-y-2">
        {signals.map((s) => (
          <div key={s.id} className="flex items-start gap-3 rounded-lg border border-white/[0.06] bg-black/10 p-3">
            <span className={cn("mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase", RATING_COLORS[s.rating])}>{s.rating}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white/80">{s.dimension}</p>
              <p className="mt-1 text-xs text-white/60">{s.evidence}</p>
              <p className="mt-1 text-[10px] text-white/60">
                <CitationLink source={s.source} url={s.sourceUrl} />
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NewsSignalsCard({ signals }: { signals: NewsSignal[] }) {
  return (
    <div className={GLASS_CARD}>
      <h2 className={SECTION_HEADER}>News &amp; Signals</h2>
      <div className="mt-3 space-y-2">
        {signals.map((s) => (
          <div key={s.id} className="rounded-lg border border-white/[0.06] bg-black/10 p-3">
            <div className="flex items-center gap-2">
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase", SIGNAL_CAT_COLORS[s.category])}>{s.category}</span>
              <span className="text-[10px] text-white/60"><CitationLink source={s.source} url={s.sourceUrl} className="text-[10px]" /> &middot; {s.date}</span>
              <span className="ml-auto text-[10px] tabular-nums text-white/60">Rel: {s.relevance}</span>
            </div>
            <p className="mt-2 text-sm font-medium text-white/80">{s.headline}</p>
            <div className="mt-1.5 border-l-2 border-accent-primary/30 pl-2">
              <p className="text-[11px] text-accent-primary/80">{s.implication}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlatformReadinessCard({ signals }: { signals: PlatformReadinessSignal[] }) {
  return (
    <div className={GLASS_CARD}>
      <h2 className={SECTION_HEADER}>AI &amp; Platform Readiness</h2>
      <div className="mt-3 space-y-3">
        {signals.map((s) => {
          const style = STATUS_COLORS[s.status];
          return (
            <div key={s.id}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white/75">{s.dimension}</span>
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase", style.text)}>{s.status}</span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <div className={cn("h-full rounded-full transition-all", style.bar, style.width)} />
              </div>
              <p className="mt-1 text-xs text-white/60">{s.evidence}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RegulatoryCard({ signals }: { signals: RegulatorySignal[] }) {
  return (
    <div className={GLASS_CARD}>
      <h2 className={SECTION_HEADER}>Regulatory &amp; Governance</h2>
      <div className="mt-3 space-y-2">
        {signals.map((s) => (
          <div key={s.id} className="rounded-lg border border-white/[0.06] bg-black/10 p-3">
            <div className="flex items-center gap-2">
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase", RISK_COLORS[s.risk])}>{s.risk} risk</span>
              <span className="text-[10px] text-white/60">{s.jurisdiction}</span>
              <span className="ml-auto text-[10px] text-white/60">{s.timeline}</span>
            </div>
            <p className="mt-2 text-sm font-medium text-white/80">{s.title}</p>
            <p className="mt-1 text-xs text-white/60">{s.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function NextQuestionsCard({ questions, lens }: { questions: NextQuestion[]; lens: SearchLens }) {
  const filtered = questions.filter((q) => q.lens === lens);
  const others = questions.filter((q) => q.lens !== lens);
  return (
    <div className={GLASS_CARD}>
      <h2 className={SECTION_HEADER}>Next Questions — {LENS_LABELS[lens]}</h2>
      <div className="mt-3 space-y-2">
        {filtered.map((q) => (
          <div key={q.id} className="flex items-start gap-2 rounded-lg border border-accent-primary/20 bg-accent-primary/5 p-3">
            <HelpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-primary" />
            <div>
              <p className="text-sm font-medium text-white/80">{q.question}</p>
              <span className="mt-1 text-[10px] uppercase text-white/60">{q.priority} priority</span>
            </div>
          </div>
        ))}
        {others.length > 0 && (
          <>
            <p className="mt-3 text-[10px] uppercase tracking-[0.18em] text-white/60">Other lenses</p>
            {others.map((q) => (
              <div key={q.id} className="flex items-start gap-2 rounded-lg border border-white/[0.06] bg-black/10 p-3">
                <HelpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/60" />
                <div>
                  <p className="text-sm text-white/60">{q.question}</p>
                  <span className="mt-1 text-[10px] uppercase text-white/70">{q.lens} &middot; {q.priority}</span>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function ComparablesCard({ comparables }: { comparables: ComparableCompany[] }) {
  const relColors: Record<string, string> = {
    direct: "bg-rose-500/10 text-rose-400",
    adjacent: "bg-sky-500/10 text-sky-400",
    aspirational: "bg-violet-500/10 text-violet-400",
  };
  return (
    <div className={GLASS_CARD}>
      <h2 className={SECTION_HEADER}>Comparables</h2>
      <div className="mt-3 space-y-2">
        {comparables.map((c) => (
          <div key={c.id} className="rounded-lg border border-white/[0.06] bg-black/10 p-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white/80">{c.name}</span>
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase", relColors[c.relationship] ?? "bg-white/[0.06] text-white/60")}>{c.relationship}</span>
            </div>
            <p className="mt-1 text-xs text-white/60">{c.metric}</p>
            <div className="mt-1.5 border-l-2 border-accent-primary/30 pl-2">
              <p className="text-[11px] text-accent-primary/80">{c.implication}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExportCard({
  outputTarget,
  packet,
  snapshot,
}: {
  outputTarget: string;
  packet: FounderArtifactPacket | null;
  snapshot: CompanySnapshot;
}) {
  const [copied, setCopied] = useState(false);

  const handleExportMemo = useCallback(() => {
    if (!packet) return;
    const memo: ShareableMemoData = {
      id: generateMemoId(),
      company: snapshot.name,
      date: new Date().toISOString().slice(0, 10),
      question: `Strategic assessment: ${snapshot.name}`,
      answer: packet.operatingMemo,
      confidence: Math.round(snapshot.identityConfidence * 100),
      sourceCount: packet.provenance.sourceCount,
      variables: packet.contradictions.map((c, i) => ({
        rank: i + 1,
        name: c.title,
        direction: "neutral" as const,
        impact: c.severity as "high" | "medium" | "low",
      })),
      scenarios: [
        { label: "Base", probability: 55, outcome: packet.nextActions[0]?.label ?? "Continue current trajectory" },
        { label: "Bull", probability: 25, outcome: packet.nextActions[1]?.label ?? "Accelerate position" },
        { label: "Bear", probability: 20, outcome: packet.contradictions[0]?.detail ?? "Key risks materialize" },
      ],
      actions: packet.nextActions.map((a) => ({ action: a.label, impact: a.priority })),
    };
    saveMemoToStorage(memo);
    window.open(`/memo/${memo.id}`, "_blank");
  }, [packet, snapshot]);

  const handleExportMarkdown = useCallback(() => {
    if (!packet) return;
    const md = artifactPacketToMarkdown(packet);
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${snapshot.name.toLowerCase()}-analysis.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [packet, snapshot]);

  const handleExportHTML = useCallback(() => {
    if (!packet) return;
    const html = artifactPacketToHtml(packet);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${snapshot.name.toLowerCase()}-analysis.html`;
    a.click();
    URL.revokeObjectURL(url);
  }, [packet, snapshot]);

  const handleCopy = useCallback(async () => {
    if (!packet) return;
    try {
      await navigator.clipboard.writeText(artifactPacketToMarkdown(packet));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }, [packet]);

  return (
    <div className={GLASS_CARD}>
      <h2 className={SECTION_HEADER}>Export</h2>
      <p className="mt-2 text-xs text-white/60">
        Selected output: <span className="font-medium text-white/60">{outputTarget.replace("_", " ")}</span>
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={handleExportMemo} className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.20] bg-white/[0.12] px-3 py-2 text-[11px] font-medium text-white/60 transition-colors hover:bg-white/[0.07] hover:text-white/70">
          <FileText className="h-3.5 w-3.5" /> View as Memo
        </button>
        <button onClick={handleExportMarkdown} className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.20] bg-white/[0.12] px-3 py-2 text-[11px] font-medium text-white/60 transition-colors hover:bg-white/[0.07] hover:text-white/70">
          <Download className="h-3.5 w-3.5" /> Download .md
        </button>
        <button onClick={handleExportHTML} className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.20] bg-white/[0.12] px-3 py-2 text-[11px] font-medium text-white/60 transition-colors hover:bg-white/[0.07] hover:text-white/70">
          <FileCode2 className="h-3.5 w-3.5" /> Download .html
        </button>
        <button onClick={handleCopy} className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.20] bg-white/[0.12] px-3 py-2 text-[11px] font-medium text-white/60 transition-colors hover:bg-white/[0.07] hover:text-white/70">
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy Markdown"}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Loading skeleton                                                   */
/* ------------------------------------------------------------------ */

function AnalysisSkeleton() {
  return (
    <div className="flex-1 space-y-4 px-4 pb-24 pt-4 animate-pulse">
      <div className="grid gap-4 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className={GLASS_CARD}>
            <div className="h-3 w-32 rounded bg-white/[0.08]" />
            <div className="mt-4 h-5 w-48 rounded bg-white/[0.06]" />
            <div className="mt-3 space-y-2">
              <div className="h-3 w-full rounded bg-white/[0.05]" />
              <div className="h-3 w-3/4 rounded bg-white/[0.05]" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[0, 1, 2, 3].map((j) => (
                <div key={j} className="h-14 rounded-lg bg-white/[0.04]" />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className={GLASS_CARD}>
        <div className="h-3 w-40 rounded bg-white/[0.08]" />
        <div className="mt-4 space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 w-full rounded-lg bg-white/[0.04]" />
          ))}
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className={GLASS_CARD}>
            <div className="h-3 w-28 rounded bg-white/[0.08]" />
            <div className="mt-4 space-y-2">
              {[0, 1].map((j) => (
                <div key={j} className="h-16 rounded-lg bg-white/[0.04]" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main View                                                          */
/* ------------------------------------------------------------------ */

export default function CompanyAnalysisView() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const company =
    searchParams.get("company")
    ?? localStorage.getItem("nodebench-analysis-company")
    ?? "shopify";
  const lens = (
    searchParams.get("lens")
    ?? localStorage.getItem("nodebench-analysis-lens")
    ?? "banker"
  ) as SearchLens;
  const outputTarget =
    searchParams.get("output")
    ?? localStorage.getItem("nodebench-analysis-output")
    ?? "memo";

  // Live search hook — falls back to Shopify fixtures
  const { data: analysisData, isLoading, error: fetchError, refetch } = useCompanyAnalysis(company, lens);

  // Destructure for card rendering
  const {
    snapshot: currentSnapshot,
    businessQuality: currentBusinessQuality,
    newsSignals: currentNewsSignals,
    platformReadiness: currentPlatformReadiness,
    regulatory: currentRegulatory,
    comparables: currentComparables,
    nextQuestions: currentNextQuestions,
    isLive,
  } = analysisData;

  // Packet state
  const [activePacket, setActivePacket] = useState<FounderArtifactPacket | null>(null);
  const [packetHistory, setPacketHistory] = useState<FounderArtifactPacket[]>([]);
  const hasGenerated = useRef(false);

  // Auto-generate packet on mount or when analysis data changes
  useEffect(() => {
    if (hasGenerated.current || activePacket) return;
    hasGenerated.current = true;
    const source = buildShopifyPacketSource();
    const packet = buildFounderArtifactPacket({ packetType: "pre_delegation", source });
    setActivePacket(packet);
    setPacketHistory([packet]);
  }, [activePacket]);

  // Packet handlers for ArtifactPacketPanel
  const handleGeneratePacket = useCallback((packetType: "weekly_reset" | "pre_delegation" | "important_change") => {
    const source = buildShopifyPacketSource();
    const packet = buildFounderArtifactPacket({ packetType, source });
    setActivePacket(packet);
    setPacketHistory((prev) => [packet, ...prev].slice(0, 5));
  }, []);

  const handleRefreshPacket = useCallback(() => {
    if (activePacket) handleGeneratePacket(activePacket.packetType);
  }, [activePacket, handleGeneratePacket]);

  const handleExportMarkdown = useCallback(() => {
    if (!activePacket) return;
    const md = artifactPacketToMarkdown(activePacket);
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `shopify-packet.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [activePacket]);

  const handleExportHTML = useCallback(() => {
    if (!activePacket) return;
    const html = artifactPacketToHtml(activePacket);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `shopify-packet.html`;
    a.click();
    URL.revokeObjectURL(url);
  }, [activePacket]);

  const handleCopyPacket = useCallback(async () => {
    if (!activePacket) return;
    try { await navigator.clipboard.writeText(artifactPacketToMarkdown(activePacket)); } catch { /* */ }
  }, [activePacket]);

  const handleHandToAgent = useCallback(() => { /* no-op in analysis view */ }, []);

  if (!company) return null;

  if (isLoading) {
    return (
      <div className="flex h-full flex-col overflow-auto">
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-white/[0.04] bg-[#151413]/95 px-4 py-3 backdrop-blur-md">
          <button onClick={() => navigate("/founder/search")} className="flex items-center gap-1.5 rounded-lg bg-white/[0.07] px-2.5 py-1.5 text-xs text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white/70">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Search
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold text-white/90">Analyzing {company}...</h1>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/50">
            <Loader2 className="h-3 w-3 animate-spin" /> Loading
          </span>
        </div>
        <AnalysisSkeleton />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-auto">
      {/* Header bar */}
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-white/[0.04] bg-[#151413]/95 px-4 py-3 backdrop-blur-md">
        <button onClick={() => navigate("/founder/search")} className="flex items-center gap-1.5 rounded-lg bg-white/[0.07] px-2.5 py-1.5 text-xs text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white/70">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Search
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold text-white/90">{currentSnapshot.name}</h1>
        </div>
        {/* Live / Demo indicator */}
        {isLive ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
            <Wifi className="h-3 w-3" /> Live
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400">
            <WifiOff className="h-3 w-3" /> Demo
          </span>
        )}
        {/* Refresh button */}
        <button
          onClick={refetch}
          className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.07] px-2.5 py-1.5 text-xs text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white/70"
          title="Refresh analysis"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
        <span className="rounded-full border border-accent-primary/20 bg-accent-primary/10 px-3 py-1 text-xs font-semibold text-accent-primary">{LENS_LABELS[lens]}</span>
      </div>

      {/* Error banner */}
      {fetchError && (
        <div className="mx-4 mt-3 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs text-amber-300">
          Search unavailable: {fetchError}. Showing demo data.
        </div>
      )}

      {/* Cards grid */}
      <div className="flex-1 space-y-4 px-4 pb-24 pt-4">
        {/* Row 1: Snapshot + Business Quality + News (3-col on desktop) */}
        <div className="grid gap-4 lg:grid-cols-3">
          <SnapshotCard snapshot={currentSnapshot} />
          <BusinessQualityCard signals={currentBusinessQuality} />
          <NewsSignalsCard signals={currentNewsSignals} />
        </div>

        {/* Row 2: Platform Readiness (full-width) */}
        <PlatformReadinessCard signals={currentPlatformReadiness} />

        {/* Row 3: Regulatory + Next Questions + Comparables (2-col, then 1-col) */}
        <div className="grid gap-4 lg:grid-cols-3">
          <RegulatoryCard signals={currentRegulatory} />
          <NextQuestionsCard questions={currentNextQuestions} lens={lens} />
          <ComparablesCard comparables={currentComparables} />
        </div>

        {/* Row 4: Artifact Packet (full-width) */}
        <ArtifactPacketPanel
          packet={activePacket}
          packetHistory={packetHistory}
          onGenerate={handleGeneratePacket}
          onRefresh={handleRefreshPacket}
          onExportMarkdown={handleExportMarkdown}
          onExportHTML={handleExportHTML}
          onCopyPacket={handleCopyPacket}
          onHandToAgent={handleHandToAgent}
        />

        {/* Row 5: Export (full-width) */}
        <ExportCard outputTarget={outputTarget} packet={activePacket} snapshot={currentSnapshot} />
      </div>
    </div>
  );
}
