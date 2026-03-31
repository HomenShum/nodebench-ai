/**
 * ClaimChangeCard — Structured visual card for changes/claims in the founder dashboard.
 *
 * Replaces text-list rendering of ChangeEntry items with scannable, mobile-first cards.
 * Each card is <1s scannable with type badge, severity dot, description, timestamp,
 * confidence bar, and chevron for expandability.
 *
 * ClaimChangeCardList wraps an array with "show N more" progressive disclosure.
 *
 * Glass card DNA: rounded-xl border border-white/[0.20] bg-white/[0.12] p-3
 * Touch-friendly: min-height 44px, full card tappable
 */

import { memo, useState, useCallback } from "react";
import {
  AlertTriangle,
  Bot,
  ChevronRight,
  FileText,
  Globe,
  Lightbulb,
  Radio,
  Target,
  Zap,
} from "lucide-react";
import type { ChangeEntry, ChangeType } from "../views/founderFixtures";

/* ─── Extended type for the card ──────────────────────────────────────────── */

export type ClaimChangeType =
  | "new"
  | "changed"
  | "contradiction"
  | "signal"
  | "agent"
  | "decision"
  | "initiative";

export interface ClaimChangeCardData {
  id: string;
  type: ClaimChangeType;
  description: string;
  timestamp: string;
  relativeTime: string;
  severity?: "high" | "medium" | "low";
  confidence?: number; // 0-100
  sources?: string[];
  linkedInitiativeId?: string;
}

/* ─── Type visual config ──────────────────────────────────────────────────── */

const TYPE_CONFIG: Record<
  ClaimChangeType,
  { label: string; badgeBg: string; badgeText: string; accentColor: string; icon: React.ElementType }
> = {
  new: {
    label: "NEW",
    badgeBg: "bg-emerald-500/15",
    badgeText: "text-emerald-400",
    accentColor: "bg-emerald-500",
    icon: Lightbulb,
  },
  changed: {
    label: "CHANGED",
    badgeBg: "bg-amber-500/15",
    badgeText: "text-amber-400",
    accentColor: "bg-amber-500",
    icon: Target,
  },
  contradiction: {
    label: "CONTRADICTION",
    badgeBg: "bg-accent-primary/15",
    badgeText: "text-accent-primary",
    accentColor: "bg-accent-primary",
    icon: AlertTriangle,
  },
  signal: {
    label: "SIGNAL",
    badgeBg: "bg-sky-500/15",
    badgeText: "text-sky-400",
    accentColor: "bg-sky-500",
    icon: Radio,
  },
  agent: {
    label: "AGENT",
    badgeBg: "bg-violet-500/15",
    badgeText: "text-violet-400",
    accentColor: "bg-violet-500",
    icon: Bot,
  },
  decision: {
    label: "DECISION",
    badgeBg: "bg-amber-500/15",
    badgeText: "text-amber-400",
    accentColor: "bg-amber-500",
    icon: FileText,
  },
  initiative: {
    label: "INITIATIVE",
    badgeBg: "bg-emerald-500/15",
    badgeText: "text-emerald-400",
    accentColor: "bg-emerald-500",
    icon: Zap,
  },
};

/* ─── Severity dot ────────────────────────────────────────────────────────── */

function SeverityDot({ severity }: { severity: "high" | "medium" | "low" }) {
  const color =
    severity === "high"
      ? "bg-rose-400"
      : severity === "medium"
        ? "bg-amber-400"
        : "bg-white/30";
  return (
    <span
      className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${color}`}
      aria-label={`${severity} severity`}
    />
  );
}

/* ─── Confidence bar (thin inline) ────────────────────────────────────────── */

function ConfidenceBarThin({ value }: { value: number }) {
  const color =
    value >= 75 ? "bg-emerald-400" : value >= 50 ? "bg-amber-400" : "bg-rose-400";
  return (
    <div className="mt-1.5 flex items-center gap-1.5">
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
      <span className="text-[9px] font-mono tabular-nums text-white/30">
        {value}%
      </span>
    </div>
  );
}

/* ─── Source icons ─────────────────────────────────────────────────────────── */

function SourceIcons({ sources }: { sources: string[] }) {
  return (
    <div className="flex items-center gap-1">
      {sources.slice(0, 3).map((s) => (
        <span
          key={s}
          className="inline-flex items-center gap-0.5 rounded bg-white/[0.04] px-1 py-0.5 text-[8px] text-white/30"
          title={s}
        >
          <Globe className="h-2 w-2" />
          {s.length > 12 ? s.slice(0, 12) + "..." : s}
        </span>
      ))}
    </div>
  );
}

/* ─── ClaimChangeCard ─────────────────────────────────────────────────────── */

export interface ClaimChangeCardProps {
  data: ClaimChangeCardData;
  onClick?: (id: string) => void;
  className?: string;
  /** Animation delay in ms for stagger */
  animationDelay?: number;
}

export const ClaimChangeCard = memo(function ClaimChangeCard({
  data,
  onClick,
  className = "",
  animationDelay = 0,
}: ClaimChangeCardProps) {
  const config = TYPE_CONFIG[data.type] ?? TYPE_CONFIG.signal;

  const handleClick = useCallback(() => {
    onClick?.(data.id);
  }, [onClick, data.id]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`
        group relative flex w-full items-start gap-2.5 overflow-hidden
        rounded-xl border border-white/[0.20] bg-white/[0.12] p-3
        text-left transition-all duration-200
        hover:border-white/[0.15] hover:bg-white/[0.08]
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40
        min-h-[44px]
        motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1
        ${className}
      `}
      style={{
        animationDelay: `${animationDelay}ms`,
        animationFillMode: "both",
      }}
      aria-label={`${config.label} change: ${data.description}`}
    >
      {/* Left accent bar */}
      <div
        className={`absolute left-0 top-0 h-full w-[3px] ${config.accentColor}`}
        aria-hidden="true"
      />

      {/* Content area */}
      <div className="min-w-0 flex-1 pl-1">
        {/* Top row: badge + severity + timestamp */}
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-flex items-center rounded-full px-1.5 py-[1px] text-[9px] font-bold uppercase tracking-wider ${config.badgeBg} ${config.badgeText}`}
          >
            {config.label}
          </span>
          {data.severity && <SeverityDot severity={data.severity} />}
          <span className="ml-auto shrink-0 text-[10px] tabular-nums text-white/25">
            {data.relativeTime}
          </span>
        </div>

        {/* Description — truncated to 2 lines */}
        <p className="mt-1 line-clamp-2 font-[Manrope,sans-serif] text-[12px] leading-snug text-white/70">
          {data.description}
        </p>

        {/* Sources (if available) */}
        {data.sources && data.sources.length > 0 && (
          <div className="mt-1.5">
            <SourceIcons sources={data.sources} />
          </div>
        )}

        {/* Confidence bar (if available) */}
        {data.confidence != null && <ConfidenceBarThin value={data.confidence} />}
      </div>

      {/* Chevron right — expandability indicator */}
      <ChevronRight
        className="mt-2 h-3.5 w-3.5 shrink-0 text-white/15 transition-transform group-hover:translate-x-0.5 group-hover:text-white/30"
        aria-hidden="true"
      />
    </button>
  );
});

/* ─── ClaimChangeCardList ─────────────────────────────────────────────────── */

export interface ClaimChangeCardListProps {
  changes: ChangeEntry[];
  /** Max cards to show before "show more" button. Default 5. */
  initialCount?: number;
  onCardClick?: (id: string) => void;
  className?: string;
}

/** Map a ChangeEntry (from founderFixtures) to ClaimChangeCardData */
function toCardData(entry: ChangeEntry & { isUser?: boolean; source?: string; severity?: string; confidence?: number; sources?: string[] }): ClaimChangeCardData {
  const typeMap: Record<string, ClaimChangeType> = {
    signal: "signal",
    agent: "agent",
    initiative: "initiative",
    decision: "decision",
    contradiction: "contradiction",
  };
  return {
    id: entry.id,
    type: typeMap[entry.type] ?? "signal",
    description: entry.description,
    timestamp: entry.timestamp,
    relativeTime: entry.relativeTime,
    severity: (entry as { severity?: "high" | "medium" | "low" }).severity ??
      (entry.type === "signal" ? "medium" : "low"),
    confidence: (entry as { confidence?: number }).confidence,
    sources: (entry as { sources?: string[] }).sources,
    linkedInitiativeId: entry.linkedInitiativeId,
  };
}

export const ClaimChangeCardList = memo(function ClaimChangeCardList({
  changes,
  initialCount = 5,
  onCardClick,
  className = "",
}: ClaimChangeCardListProps) {
  const [expanded, setExpanded] = useState(false);
  const cards = changes.map(toCardData);

  // Sort: contradictions first, then severity, then recency
  const sorted = [...cards].sort((a, b) => {
    if (a.type === "contradiction" && b.type !== "contradiction") return -1;
    if (b.type === "contradiction" && a.type !== "contradiction") return 1;
    const sevOrder = { high: 0, medium: 1, low: 2 };
    const sevA = sevOrder[a.severity ?? "low"] ?? 2;
    const sevB = sevOrder[b.severity ?? "low"] ?? 2;
    if (sevA !== sevB) return sevA - sevB;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  const visible = expanded ? sorted : sorted.slice(0, initialCount);
  const remaining = sorted.length - initialCount;

  return (
    <div className={`space-y-2 ${className}`}>
      {visible.map((card, i) => (
        <ClaimChangeCard
          key={card.id}
          data={card}
          onClick={onCardClick}
          animationDelay={i * 60}
        />
      ))}
      {!expanded && remaining > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] py-2 text-[11px] font-medium text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/60"
        >
          Show {remaining} more
        </button>
      )}
    </div>
  );
});

export default ClaimChangeCard;
