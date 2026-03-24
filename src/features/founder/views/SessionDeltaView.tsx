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
  strategy: { icon: Target, color: "text-[#d97757]" },
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
    <div className="rounded-xl border border-[#d97757]/20 bg-[#d97757]/[0.05] p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d97757]/10">
          <Sparkles className="h-5 w-5 text-[#d97757]" />
        </div>
        <div>
          <h1 className="text-sm font-medium text-white/80">Since your last session</h1>
          <p className="text-[10px] text-white/35">{formatTimeAgo(timeSince)} — {delta.totalChanges} changes, {delta.eventsSinceLastSession} events</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MiniStat label="Strategy" count={delta.strategyShifts.length} color="text-[#d97757]" />
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
  const delta = DEMO_SESSION_DELTA;

  return (
    <div className="h-full overflow-y-auto px-6 py-6">
      <div className="mx-auto max-w-3xl space-y-4">
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
      </div>
    </div>
  );
}

const SessionDeltaView = memo(SessionDeltaViewInner);
export default SessionDeltaView;
