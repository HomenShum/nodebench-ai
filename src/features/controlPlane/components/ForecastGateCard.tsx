import { memo } from "react";
import type { ElementType } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, GitBranch, PauseCircle, RefreshCw } from "lucide-react";
import type { ResultForecastGate } from "./searchTypes";

const ACTION_COPY: Record<ResultForecastGate["recommendedAction"], { label: string; icon: ElementType; tone: string }> = {
  suppress: {
    label: "Reuse current packet",
    icon: PauseCircle,
    tone: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
  },
  refresh_packet: {
    label: "Refresh packet first",
    icon: RefreshCw,
    tone: "border-amber-500/20 bg-amber-500/10 text-amber-300",
  },
  deepen_diligence: {
    label: "Deepen diligence",
    icon: GitBranch,
    tone: "border-sky-500/20 bg-sky-500/10 text-sky-300",
  },
  escalate: {
    label: "Review important change",
    icon: AlertTriangle,
    tone: "border-rose-500/20 bg-rose-500/10 text-rose-300",
  },
  delegate: {
    label: "Handoff allowed",
    icon: CheckCircle2,
    tone: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
  },
  observe: {
    label: "Tracking started",
    icon: ArrowRight,
    tone: "border-white/[0.08] bg-white/[0.03] text-content-muted",
  },
};

function formatModelLabel(modelUsed: string) {
  if (modelUsed === "insufficient_data") return "insufficient data";
  if (modelUsed === "search_session_confidence_stream") return "search-session confidence stream";
  return modelUsed.replace(/_/g, " ");
}

export const ForecastGateCard = memo(function ForecastGateCard({
  gate,
  compact = false,
  className = "",
}: {
  gate?: ResultForecastGate | null;
  compact?: boolean;
  className?: string;
}) {
  if (!gate) return null;

  const action = ACTION_COPY[gate.recommendedAction] ?? ACTION_COPY.observe;
  const Icon = action.icon;
  const modelLabel = formatModelLabel(gate.modelUsed);
  const intervalLabel = gate.latestOutsideInterval
    ? "outside interval"
    : gate.confidenceBandWidth === null
      ? "interval pending"
      : `band ${Math.round(gate.confidenceBandWidth * 100)}%`;

  return (
    <section
      className={`rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 ${className}`}
      data-testid="forecast-gate-card"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-content-muted">
            Temporal Gate
          </div>
          <h3 className="mt-1 text-sm font-semibold text-content">
            {action.label}
          </h3>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${action.tone}`}>
          <Icon className="h-3.5 w-3.5" />
          {gate.trendDirection.replace(/_/g, " ")}
        </span>
      </div>

      {!compact && (
        <p className="mt-3 text-sm leading-relaxed text-content-secondary">
          {gate.explanation}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-content-muted">
        <span className="rounded-full bg-white/[0.04] px-2.5 py-1">
          {gate.valuesCount} observation{gate.valuesCount === 1 ? "" : "s"}
        </span>
        <span className="rounded-full bg-white/[0.04] px-2.5 py-1">
          {modelLabel}
        </span>
        <span className="rounded-full bg-white/[0.04] px-2.5 py-1">
          {intervalLabel}
        </span>
      </div>
    </section>
  );
});

export default ForecastGateCard;
