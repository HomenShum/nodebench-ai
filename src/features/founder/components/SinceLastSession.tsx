import { memo, useCallback } from "react";
import {
  AlertTriangle,
  ArrowRight,
  GitBranch,
  Layers,
  RefreshCw,
  Shield,
  Target,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSessionDelta } from "../hooks/useSessionDelta";
import type { ChangeCategory, ImpactLevel } from "../hooks/useSessionDelta";

/* ─── Design tokens (glass card DNA) ────────────────────────────────── */

const GLASS_CARD = "rounded-xl border border-white/[0.20] bg-white/[0.12] backdrop-blur-sm";
const SECTION_HEADER =
  "text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40";
const INNER_CARD = "rounded-lg border border-white/[0.06] bg-black/10 p-3";

/* ─── Category config ────────────────────────────────────────────────── */

const CATEGORY_CONFIG: Record<
  ChangeCategory,
  { label: string; color: string; icon: typeof Target }
> = {
  strategy: { label: "Strategy", color: "bg-violet-500/20 text-violet-300 border-violet-500/25", icon: Target },
  architecture: { label: "Architecture", color: "bg-sky-500/20 text-sky-300 border-sky-500/25", icon: Layers },
  competitor: { label: "Competitor", color: "bg-amber-500/20 text-amber-300 border-amber-500/25", icon: Shield },
  market: { label: "Market", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/25", icon: TrendingUp },
};

const IMPACT_CONFIG: Record<ImpactLevel, { label: string; dot: string }> = {
  high: { label: "High", dot: "bg-rose-400" },
  medium: { label: "Med", dot: "bg-amber-400" },
  low: { label: "Low", dot: "bg-white/30" },
};

/* ─── Helpers ────────────────────────────────────────────────────────── */

function formatRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/* ─── Summary card ───────────────────────────────────────────────────── */

interface SummaryCardProps {
  label: string;
  count: number;
  icon: typeof Target;
}

const SummaryCard = memo(function SummaryCard({ label, count, icon: Icon }: SummaryCardProps) {
  return (
    <div className={cn(INNER_CARD, "flex items-center gap-3")}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.06]">
        <Icon className="h-4 w-4 text-white/50" />
      </div>
      <div className="min-w-0">
        <p className="text-lg font-semibold tabular-nums text-white/90">{count}</p>
        <p className="truncate text-[11px] text-white/40">{label}</p>
      </div>
    </div>
  );
});

/* ─── Change row ─────────────────────────────────────────────────────── */

interface ChangeRowProps {
  category: ChangeCategory;
  impact: ImpactLevel;
  summary: string;
  suggestedAction: string;
}

const ChangeRow = memo(function ChangeRow({
  category,
  impact,
  summary,
  suggestedAction,
}: ChangeRowProps) {
  const cat = CATEGORY_CONFIG[category];
  const imp = IMPACT_CONFIG[impact];
  const CatIcon = cat.icon;

  return (
    <div
      className={cn(
        INNER_CARD,
        "group space-y-2 transition-colors hover:bg-black/20",
      )}
    >
      {/* Top row: badge + impact */}
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider",
            cat.color,
          )}
        >
          <CatIcon className="h-3 w-3" />
          {cat.label}
        </span>
        <span className="flex items-center gap-1 text-[10px] text-white/35">
          <span className={cn("inline-block h-1.5 w-1.5 rounded-full", imp.dot)} />
          {imp.label}
        </span>
      </div>

      {/* Summary */}
      <p className="text-[13px] leading-relaxed text-white/80">{summary}</p>

      {/* Suggested action */}
      <div className="flex items-start gap-1.5 text-[12px] text-white/45">
        <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-[#d97757]/70" />
        <span>{suggestedAction}</span>
      </div>
    </div>
  );
});

/* ─── Main component ─────────────────────────────────────────────────── */

function SinceLastSession() {
  const { lastSessionAt, changeSummary, topChanges, isLoading, refresh } =
    useSessionDelta();

  const handleRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  if (isLoading) {
    return (
      <div className={cn(GLASS_CARD, "dark animate-pulse p-6 bg-[#151413]")}>
        <div className="h-5 w-48 rounded bg-white/10" />
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 rounded-lg bg-white/[0.04]" />
          ))}
        </div>
        <div className="mt-6 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-lg bg-white/[0.04]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <section className={cn(GLASS_CARD, "dark p-5 sm:p-6 bg-[#151413] text-[#d4d0c8]")}>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-white/90">
            Since your last session
          </h2>
          <p className="mt-0.5 text-[12px] text-white/40">
            {formatRelativeTime(lastSessionAt)}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5",
            "bg-[#d97757]/15 text-[13px] font-medium text-[#d97757]",
            "border border-[#d97757]/25 transition-colors",
            "hover:bg-[#d97757]/25 active:bg-[#d97757]/30",
          )}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh packet
        </button>
      </div>

      {/* ── Summary cards ───────────────────────────────────────────── */}
      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <SummaryCard label="Strategy changes" count={changeSummary.strategyChanges} icon={GitBranch} />
        <SummaryCard label="Competitor signals" count={changeSummary.competitorSignals} icon={Shield} />
        <SummaryCard label="Contradictions" count={changeSummary.contradictions} icon={AlertTriangle} />
        <SummaryCard label="Needs attention" count={changeSummary.attentionRequired} icon={Target} />
      </div>

      {/* ── Top changes ─────────────────────────────────────────────── */}
      <div className="mt-5">
        <p className={SECTION_HEADER}>Top changes</p>
        <div className="mt-2.5 space-y-2">
          {topChanges.map((change) => (
            <ChangeRow
              key={change.id}
              category={change.category}
              impact={change.impact}
              summary={change.summary}
              suggestedAction={change.suggestedAction}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default memo(SinceLastSession);
