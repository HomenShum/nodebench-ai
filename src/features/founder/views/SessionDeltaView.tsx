/**
 * SessionDeltaView — Phase 11 "Since Your Last Session"
 *
 * The ambient intelligence surface. Shows what changed since the user
 * was last active, grouped by importance:
 *   1. Strategy shifts
 *   2. Competitor signals
 *   3. New contradictions
 *   4. Build items decided
 *   5. Packets ready for review
 *   6. Attention required
 *
 * This is the first thing a founder sees when they open NodeBench.
 * It should answer: "What do I need to know right now?"
 */

import { memo, useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { useConvexAuth } from "convex/react";
import { useConvexApi } from "@/lib/convexApi";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Check,
  Clock,
  Eye,
  FileText,
  Flame,
  Globe,
  Lightbulb,
  Loader2,
  Package,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Demo data for "Since Your Last Session" ───────────────────────────

const DEMO_LAST_SESSION = Date.now() - 8 * 3_600_000; // 8 hours ago

const DEMO_SESSION_DELTA = {
  sinceTimestamp: DEMO_LAST_SESSION,
  totalChanges: 14,
  strategyShifts: [
    {
      title: "Positioned above memory layer, not competing with Supermemory",
      content: "NodeBench should sit above memory providers as the operating intelligence layer. Memory is replaceable plumbing; business truth is the moat.",
      confidence: 0.92,
      type: "strategic_insight",
    },
    {
      title: "Adopted ambient intelligence as core product principle",
      content: "User should not have to repeatedly ask for the state of their own product. NodeBench should already know, show what changed, and prepare the next artifact.",
      confidence: 0.95,
      type: "thesis",
    },
  ],
  competitorSignals: [
    {
      title: "Supermemory raised $3M seed, 17.8k GitHub stars",
      content: "Universal memory API with OAuth-first MCP server, plugin-per-agent distribution, benchmark narrative (LongMemEval_s 85.2%). Not competing on business intelligence layer.",
      confidence: 0.88,
    },
    {
      title: "AgentChattr: multi-agent local coordination at ~1k stars",
      content: "Local chat server where multiple agents share channels via terminal injection. Good pattern for coordination bus, but no business intelligence layer.",
      confidence: 0.75,
    },
    {
      title: "Mastra reports 94.87% on LongMemEval_s with GPT-5-mini",
      content: "Observational Memory architecture. Benchmark-maxxing in the memory category. Confirms memory is commoditizing fast.",
      confidence: 0.82,
    },
  ],
  contradictions: [
    {
      title: "NodeBench positioning vs actual build priorities",
      content: "Positioned as 'Operating Intelligence for Founders' but 60% of recent build effort was on MCP tool infrastructure (distribution) not founder experience (product).",
      confidence: 0.7,
    },
  ],
  buildItems: [
    { title: "Phase 10: Causal Memory (8 tables, 4 views, 10 MCP tools)", content: "Complete. Event ledger, path graph, state diffs, time rollups, packet/memo lineage, important changes.", type: "initiative_update" },
    { title: "Phase 11: Ambient Intelligence Layer (4 tables, ingestion pipeline)", content: "In progress. Memory provider abstraction, multi-provider event bus, session delta dashboard.", type: "initiative_update" },
    { title: "MemoryProvider interface for Supermemory/local/zep", content: "Designed. Allows NodeBench to sit above any memory substrate.", type: "build_item" },
  ],
  risks: [
    { title: "Memory commoditization accelerating", content: "3+ providers with >80% on standard benchmarks. Building memory infrastructure from scratch would be wasted effort.", confidence: 0.85 },
  ],
  opportunities: [
    { title: "No one owns the 'business truth from agent traffic' layer", content: "Supermemory stores memories. AgentChattr coordinates agents. Nobody turns cross-provider traffic into business intelligence and reusable artifacts.", confidence: 0.9 },
  ],
  attentionRequired: 2,
  recentDetections: 5,
  stalePackets: [
    { type: "weekly_reset", changeCount: 14, readiness: 0.85, reason: "14 changes since last weekly reset — Phase 10 complete, Phase 11 started, competitive landscape analyzed" },
    { type: "investor_update", changeCount: 8, readiness: 0.7, reason: "Strategic positioning shift and new competitive intelligence" },
  ],
  eventsSinceLastSession: 23,
};

// ── Styling ────────────────────────────────────────────────────────────

const SECTION_ICONS: Record<string, { icon: typeof Sparkles; color: string }> = {
  strategy: { icon: Target, color: "text-accent-primary" },
  competitors: { icon: Globe, color: "text-blue-400" },
  contradictions: { icon: AlertTriangle, color: "text-amber-400" },
  build: { icon: Zap, color: "text-emerald-400" },
  packets: { icon: Package, color: "text-violet-400" },
  risks: { icon: Shield, color: "text-red-400" },
  opportunities: { icon: Lightbulb, color: "text-cyan-400" },
};

function formatTimeAgo(ms: number): string {
  const hours = Math.round(ms / 3_600_000);
  if (hours < 1) return `${Math.round(ms / 60_000)}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

// ── Section Components ─────────────────────────────────────────────────

function DeltaHeader({ delta }: { delta: typeof DEMO_SESSION_DELTA }) {
  const timeSince = Date.now() - delta.sinceTimestamp;

  return (
    <div className="rounded-xl border border-accent-primary/20 bg-accent-primary/[0.05] p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-primary/10">
          <Sparkles className="h-5 w-5 text-accent-primary" />
        </div>
        <div>
          <h1 className="text-sm font-medium text-white/80">Since your last session</h1>
          <p className="text-[10px] text-white/35">{formatTimeAgo(timeSince)} — {delta.totalChanges} changes, {delta.eventsSinceLastSession} events</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MiniStat label="Strategy" count={delta.strategyShifts.length} color="text-accent-primary" />
        <MiniStat label="Competitors" count={delta.competitorSignals.length} color="text-blue-400" />
        <MiniStat label="Contradictions" count={delta.contradictions.length} color="text-amber-400" />
        <MiniStat label="Attention" count={delta.attentionRequired} color="text-red-400" />
      </div>
    </div>
  );
}

function MiniStat({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="rounded-lg border border-white/[0.08] bg-white/[0.04] p-2 text-center">
      <div className={cn("text-lg font-light tabular-nums", color)}>{count}</div>
      <div className="text-[8px] uppercase tracking-wider text-white/25">{label}</div>
    </div>
  );
}

function DeltaSection({
  title,
  icon: iconKey,
  items,
  emptyMessage,
}: {
  title: string;
  icon: string;
  items: { title: string; content: string; confidence?: number; type?: string }[];
  emptyMessage?: string;
}) {
  const cfg = SECTION_ICONS[iconKey] ?? { icon: Bell, color: "text-white/50" };
  const Icon = cfg.icon;

  if (items.length === 0 && !emptyMessage) return null;

  return (
    <div className="rounded-xl border border-white/[0.20] bg-white/[0.12] p-5">
      <div className="flex items-center gap-2">
        <Icon className={cn("h-4 w-4", cfg.color)} />
        <h2 className="text-[11px] uppercase tracking-[0.2em] text-white/40">{title}</h2>
        {items.length > 0 && (
          <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] tabular-nums font-medium", cfg.color, "bg-white/[0.06]")}>
            {items.length}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <p className="mt-2 text-[10px] text-white/25">{emptyMessage}</p>
      ) : (
        <div className="mt-3 space-y-2">
          {items.map((item, i) => (
            <div key={i} className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
              <div className="flex items-start justify-between">
                <h3 className="text-xs font-medium text-white/70">{item.title}</h3>
                {item.confidence !== undefined && (
                  <span className="shrink-0 rounded bg-white/[0.06] px-1.5 py-0.5 text-[9px] tabular-nums text-white/35">
                    {Math.round(item.confidence * 100)}%
                  </span>
                )}
              </div>
              <p className="mt-1 text-[10px] leading-relaxed text-white/40">{item.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PacketReadinessSection({ packets }: { packets: typeof DEMO_SESSION_DELTA.stalePackets }) {
  if (packets.length === 0) return null;

  return (
    <div className="rounded-xl border border-violet-500/20 bg-violet-500/[0.03] p-5">
      <div className="flex items-center gap-2">
        <Package className="h-4 w-4 text-violet-400" />
        <h2 className="text-[11px] uppercase tracking-[0.2em] text-white/40">Packets Ready for Regeneration</h2>
        <span className="rounded-full bg-violet-500/10 px-1.5 py-0.5 text-[9px] tabular-nums font-medium text-violet-400">
          {packets.length}
        </span>
      </div>

      <div className="mt-3 space-y-2">
        {packets.map((p, i) => {
          const pctFull = Math.round(p.readiness * 100);
          return (
            <div key={i} className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium capitalize text-white/70">{p.type.replace(/_/g, " ")}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] tabular-nums text-white/30">{p.changeCount} changes</span>
                  <span className={cn(
                    "rounded px-1.5 py-0.5 text-[9px] tabular-nums font-medium",
                    pctFull >= 80 ? "bg-red-500/10 text-red-400" : "bg-amber-500/10 text-amber-400",
                  )}>
                    {pctFull}% stale
                  </span>
                </div>
              </div>
              {p.reason && (
                <p className="mt-1 text-[10px] text-white/35">{p.reason}</p>
              )}
              <button className="mt-2 flex items-center gap-1 rounded-lg bg-violet-500/10 px-2.5 py-1 text-[10px] text-violet-400 transition-colors hover:bg-violet-500/20">
                <FileText className="h-3 w-3" /> Regenerate
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main View ──────────────────────────────────────────────────────────

function SessionDeltaViewInner() {
  const { isAuthenticated } = useConvexAuth();
  const api = useConvexApi();

  // Try Convex query if authenticated, fall back to demo data
  const liveSignals = useQuery(
    api?.domains?.founder?.operations?.getSignalsByCompany ?? "skip",
    isAuthenticated && api ? { limit: 20 } : "skip",
  );
  const liveTimeline = useQuery(
    api?.domains?.founder?.operations?.getTimelineEvents ?? "skip",
    isAuthenticated && api ? { limit: 20 } : "skip",
  );

  const isLive = isAuthenticated && api && (liveSignals !== undefined || liveTimeline !== undefined);
  const isLoading = isAuthenticated && api && liveSignals === undefined && liveTimeline === undefined;

  // Build delta from live data or fall back to demo
  const delta = useMemo(() => {
    if (!isLive || (!liveSignals?.length && !liveTimeline?.length)) {
      return DEMO_SESSION_DELTA;
    }

    // Map live signals into delta sections
    const signals = liveSignals ?? [];
    const timeline = liveTimeline ?? [];

    return {
      ...DEMO_SESSION_DELTA,
      totalChanges: signals.length + timeline.length,
      strategyShifts: signals
        .filter((s: Record<string, unknown>) => s.sourceType === "founder_note" || s.sourceType === "memo")
        .slice(0, 5)
        .map((s: Record<string, unknown>) => ({
          title: (s.title as string) || "Signal",
          content: (s.content as string) || "",
          confidence: (s.importanceScore as number) ?? 0.5,
          type: (s.sourceType as string) || "signal",
        })),
      competitorSignals: signals
        .filter((s: Record<string, unknown>) => s.sourceType === "market" || s.sourceType === "customer")
        .slice(0, 5)
        .map((s: Record<string, unknown>) => ({
          title: (s.title as string) || "Market Signal",
          content: (s.content as string) || "",
          confidence: (s.importanceScore as number) ?? 0.5,
        })),
      buildItems: timeline
        .filter((t: Record<string, unknown>) => t.eventType === "initiative_completed" || t.eventType === "decision_made")
        .slice(0, 5)
        .map((t: Record<string, unknown>) => ({
          title: (t.summary as string) || "Event",
          content: (t.entityType as string) || "",
          type: (t.eventType as string) || "build",
        })),
      eventsSinceLastSession: timeline.length,
      attentionRequired: signals.filter((s: Record<string, unknown>) => (s.importanceScore as number) >= 0.8).length,
    };
  }, [isLive, liveSignals, liveTimeline]);

  return (
    <div className="h-full overflow-y-auto px-6 py-6">
      <div className="mx-auto max-w-3xl space-y-4">
        {/* Live/Demo indicator */}
        <div className="flex items-center justify-end gap-2">
          {isLoading ? (
            <span className="flex items-center gap-1.5 rounded-full bg-white/[0.06] px-2.5 py-1 text-[9px] text-white/30">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading live data...
            </span>
          ) : (
            <span className={cn(
              "rounded-full px-2.5 py-1 text-[9px] font-medium",
              isLive ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400",
            )}>
              {isLive ? "Live" : "Demo"}
            </span>
          )}
        </div>

        <DeltaHeader delta={delta} />

        <DeltaSection
          title="Strategy Shifts"
          icon="strategy"
          items={delta.strategyShifts}
        />

        <DeltaSection
          title="Competitor Intelligence"
          icon="competitors"
          items={delta.competitorSignals}
        />

        <DeltaSection
          title="Contradictions"
          icon="contradictions"
          items={delta.contradictions}
        />

        <DeltaSection
          title="Risks"
          icon="risks"
          items={delta.risks}
        />

        <DeltaSection
          title="Opportunities"
          icon="opportunities"
          items={delta.opportunities}
        />

        <DeltaSection
          title="Build Progress"
          icon="build"
          items={delta.buildItems}
        />

        <PacketReadinessSection packets={delta.stalePackets} />

        {/* Compounding Investment Card — the moat visualization */}
        <CompoundingInvestmentCard />

        {/* Watchlist Card */}
        <WatchlistCard />
      </div>
    </div>
  );
}

// ── Compounding Investment Card ──────────────────────────────────────

function CompoundingInvestmentCard() {
  // Read from localStorage (packets stored by delta tools via MCP)
  const stats = useMemo(() => {
    try {
      // Check for delta packets synced from CLI
      const retentionData = localStorage.getItem("nodebench-delta-compounding");
      if (retentionData) return JSON.parse(retentionData);
    } catch { /* fallback */ }

    // Demo compounding data
    return {
      totalPackets: 44,
      breakdown: "1 brief, 10 diligence, 16 market, 2 memo, 1 retain, 12 review, 1 handoff",
      watchedCount: 1,
      daysSinceFirst: 1,
      staleCount: 0,
    };
  }, []);

  return (
    <div className="rounded-xl border border-accent-primary/20 bg-accent-primary/[0.03] p-5">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-accent-primary" />
        <h2 className="text-[11px] uppercase tracking-[0.2em] text-white/40">Your NodeBench Investment</h2>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-white/[0.08] bg-white/[0.04] p-3 text-center">
          <div className="text-xl font-light tabular-nums text-accent-primary">{stats.totalPackets}</div>
          <div className="text-[8px] uppercase tracking-wider text-white/25">Packets</div>
        </div>
        <div className="rounded-lg border border-white/[0.08] bg-white/[0.04] p-3 text-center">
          <div className="text-xl font-light tabular-nums text-blue-400">{stats.watchedCount}</div>
          <div className="text-[8px] uppercase tracking-wider text-white/25">Watched</div>
        </div>
        <div className="rounded-lg border border-white/[0.08] bg-white/[0.04] p-3 text-center">
          <div className="text-xl font-light tabular-nums text-emerald-400">{stats.daysSinceFirst}</div>
          <div className="text-[8px] uppercase tracking-wider text-white/25">Days Active</div>
        </div>
        <div className="rounded-lg border border-white/[0.08] bg-white/[0.04] p-3 text-center">
          <div className={cn("text-xl font-light tabular-nums", stats.staleCount > 0 ? "text-amber-400" : "text-emerald-400")}>
            {stats.staleCount}
          </div>
          <div className="text-[8px] uppercase tracking-wider text-white/25">Going Stale</div>
        </div>
      </div>

      <p className="mt-3 text-[10px] leading-relaxed text-white/30">
        {stats.breakdown}
      </p>
      <p className="mt-1 text-[10px] text-accent-primary/60">
        {stats.totalPackets < 10
          ? "Build your intelligence base: run delta_diligence on key entities via CLI."
          : `Your context is compounding. ${stats.staleCount > 0 ? "Regenerate stale packets to keep intelligence fresh." : "Every session makes the next one more valuable."}`}
      </p>
    </div>
  );
}

// ── Watchlist Card ───────────────────────────────────────────────────

function WatchlistCard() {
  const watchlist = useMemo(() => {
    try {
      const data = localStorage.getItem("nodebench-delta-watchlist");
      if (data) return JSON.parse(data) as Array<{ entity: string; addedAt: string; changeCount: number; lastChecked: string | null }>;
    } catch { /* fallback */ }

    // Demo watchlist
    return [
      { entity: "Anthropic", addedAt: "2026-03-29", changeCount: 0, lastChecked: "2026-03-29" },
    ];
  }, []);

  if (watchlist.length === 0) {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-blue-400" />
          <h2 className="text-[11px] uppercase tracking-[0.2em] text-white/40">Watchlist</h2>
        </div>
        <p className="mt-3 text-[10px] text-white/25">
          No entities monitored. Run <code className="rounded bg-white/[0.06] px-1 py-0.5 text-[9px] font-mono">delta_watch Anthropic</code> via CLI to start monitoring.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-blue-500/20 bg-blue-500/[0.03] p-5">
      <div className="flex items-center gap-2">
        <Eye className="h-4 w-4 text-blue-400" />
        <h2 className="text-[11px] uppercase tracking-[0.2em] text-white/40">Watchlist</h2>
        <span className="rounded-full bg-blue-500/10 px-1.5 py-0.5 text-[9px] tabular-nums font-medium text-blue-400">
          {watchlist.length}
        </span>
      </div>

      <div className="mt-3 space-y-2">
        {watchlist.map((w, i) => (
          <div key={i} className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
            <div>
              <span className="text-xs font-medium text-white/70">{w.entity}</span>
              {w.changeCount > 0 && (
                <span className="ml-2 rounded bg-accent-primary/10 px-1.5 py-0.5 text-[9px] text-accent-primary">
                  {w.changeCount} changes
                </span>
              )}
            </div>
            <div className="text-[9px] text-white/25">
              {w.lastChecked ? `Checked ${new Date(w.lastChecked).toLocaleDateString()}` : "Not yet checked"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const SessionDeltaView = memo(SessionDeltaViewInner);
export default SessionDeltaView;
