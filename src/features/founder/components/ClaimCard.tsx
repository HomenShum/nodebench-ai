/**
 * ClaimCard — Visual card for claims, changes, and contradictions.
 *
 * The core mobile data object. Replaces text lists with scannable cards:
 * - Type badge: NEW / CHANGED / CONTRADICTION / SIGNAL / DECISION / AGENT
 * - Evidence source icons
 * - Confidence bar (when available)
 * - Inline actions: [Investigate] [Update Packet] [Dismiss]
 *
 * Mobile-first: 44px min touch targets, full-width tap, single column.
 * "Every screen is a judgment surface that produces shareable packets."
 */

import { memo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Clock,
  Eye,
  FileText,
  Globe,
  Lightbulb,
  Zap,
} from "lucide-react";

/* ─── Types ────────────────────────────────────────────────────────────────── */

export type ClaimType = "new" | "changed" | "contradiction" | "signal" | "decision" | "agent" | "stale";

export interface ClaimCardData {
  id: string;
  type: ClaimType;
  title: string;
  detail?: string;
  previousValue?: string;
  currentValue?: string;
  sources?: string[];
  confidence?: number; // 0-100
  timestamp: string;
  relativeTime: string;
  severity?: "high" | "medium" | "low";
  entityName?: string;
  linkedInitiativeId?: string;
}

export interface ClaimCardProps {
  claim: ClaimCardData;
  onInvestigate?: (id: string) => void;
  onUpdatePacket?: (id: string) => void;
  className?: string;
}

/* ─── Type config ──────────────────────────────────────────────────────────── */

const TYPE_CONFIG: Record<ClaimType, {
  label: string;
  badgeClass: string;
  borderClass: string;
  icon: React.ElementType;
}> = {
  new: {
    label: "NEW",
    badgeClass: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    borderClass: "border-l-emerald-500/50",
    icon: Lightbulb,
  },
  changed: {
    label: "CHANGED",
    badgeClass: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    borderClass: "border-l-blue-500/50",
    icon: ArrowRight,
  },
  contradiction: {
    label: "CONTRADICTION",
    badgeClass: "bg-accent-primary/20 text-accent-primary border-accent-primary/30",
    borderClass: "border-l-[#d97757]",
    icon: AlertTriangle,
  },
  signal: {
    label: "SIGNAL",
    badgeClass: "bg-violet-500/20 text-violet-400 border-violet-500/30",
    borderClass: "border-l-violet-500/50",
    icon: Zap,
  },
  decision: {
    label: "DECISION",
    badgeClass: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    borderClass: "border-l-amber-500/50",
    icon: FileText,
  },
  agent: {
    label: "AGENT",
    badgeClass: "bg-pink-500/20 text-pink-400 border-pink-500/30",
    borderClass: "border-l-pink-500/50",
    icon: Eye,
  },
  stale: {
    label: "STALE",
    badgeClass: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
    borderClass: "border-l-zinc-500/50",
    icon: Clock,
  },
};

/* ─── Confidence bar ───────────────────────────────────────────────────────── */

function ConfidenceBar({ value }: { value: number }) {
  const color = value >= 75 ? "bg-emerald-400" : value >= 50 ? "bg-amber-400" : "bg-rose-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-[#2c2b28] overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-500`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-[10px] font-mono tabular-nums text-white/40">{value}%</span>
    </div>
  );
}

/* ─── Source pills ─────────────────────────────────────────────────────────── */

function SourcePills({ sources }: { sources: string[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {sources.map((s) => (
        <span
          key={s}
          className="inline-flex items-center gap-1 rounded bg-[#222120] px-1.5 py-0.5 text-[9px] text-white/40"
        >
          <Globe className="h-2.5 w-2.5" />
          {s}
        </span>
      ))}
    </div>
  );
}

/* ─── Main component ───────────────────────────────────────────────────────── */

export const ClaimCard = memo(function ClaimCard({
  claim,
  onInvestigate,
  onUpdatePacket,
  className = "",
}: ClaimCardProps) {
  const [expanded, setExpanded] = useState(false);
  const config = TYPE_CONFIG[claim.type] ?? TYPE_CONFIG.signal;
  const Icon = config.icon;
  const isContradiction = claim.type === "contradiction";

  return (
    <div
      className={`
        rounded-xl border border-[#2c2b28] bg-[#1a1918] overflow-hidden
        border-l-[3px] ${config.borderClass}
        ${isContradiction ? "bg-[#2a1f1a] shadow-[0_0_12px_rgba(217,119,87,0.06)]" : ""}
        transition-all
        ${className}
      `}
    >
      {/* Header — always visible, full-width tap target */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-start gap-3 px-4 py-3 text-left min-h-[44px] hover:bg-[#222120] transition-colors"
        aria-expanded={expanded}
      >
        <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${isContradiction ? "text-accent-primary" : "text-white/40"}`} />

        <div className="flex-1 min-w-0 space-y-1">
          {/* Type badge + severity + time */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${config.badgeClass}`}>
              {config.label}
            </span>
            {claim.severity && (
              <span className={`text-[9px] font-semibold ${
                claim.severity === "high" ? "text-rose-400" : claim.severity === "medium" ? "text-amber-400" : "text-white/30"
              }`}>
                {claim.severity}
              </span>
            )}
            <span className="text-[10px] text-white/25 tabular-nums ml-auto shrink-0">
              {claim.relativeTime}
            </span>
          </div>

          {/* Title */}
          <p className={`text-[13px] leading-snug ${isContradiction ? "text-white/80 font-medium" : "text-white/70"}`}>
            {claim.title}
          </p>

          {/* Diff preview for CHANGED type */}
          {claim.type === "changed" && claim.previousValue && claim.currentValue && (
            <div className="text-[11px] space-y-0.5">
              <div className="text-white/30 line-through">{claim.previousValue}</div>
              <div className="text-emerald-400/80">{claim.currentValue}</div>
            </div>
          )}
        </div>

        <span className="text-white/20 shrink-0 mt-1">
          {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </span>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-[#2c2b28] px-4 py-3 space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Detail text */}
          {claim.detail && (
            <p className="text-[12px] text-white/50 leading-relaxed">{claim.detail}</p>
          )}

          {/* Confidence */}
          {claim.confidence != null && (
            <div>
              <span className="text-[9px] uppercase tracking-wider text-white/25">Confidence</span>
              <ConfidenceBar value={claim.confidence} />
            </div>
          )}

          {/* Sources */}
          {claim.sources && claim.sources.length > 0 && (
            <div>
              <span className="text-[9px] uppercase tracking-wider text-white/25">Sources</span>
              <SourcePills sources={claim.sources} />
            </div>
          )}

          {/* Entity link */}
          {claim.entityName && (
            <div className="text-[11px] text-white/30">
              Entity: <span className="text-accent-primary/80">{claim.entityName}</span>
            </div>
          )}

          {/* Actions — 44px min touch targets */}
          <div className="flex gap-2 pt-1">
            {onInvestigate && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onInvestigate(claim.id); }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-accent-primary/30 bg-accent-primary/10 px-3 min-h-[36px] text-[11px] font-medium text-accent-primary hover:bg-accent-primary/20 transition-colors"
              >
                <Eye className="h-3 w-3" />
                Investigate
              </button>
            )}
            {onUpdatePacket && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onUpdatePacket(claim.id); }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#2c2b28] bg-[#1f1e1d] px-3 min-h-[36px] text-[11px] text-white/50 hover:bg-[#2c2b28] transition-colors"
              >
                <FileText className="h-3 w-3" />
                Update Packet
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

/* ─── List wrapper ─────────────────────────────────────────────────────────── */

export interface ClaimListProps {
  claims: ClaimCardData[];
  onInvestigate?: (id: string) => void;
  onUpdatePacket?: (id: string) => void;
  className?: string;
}

export const ClaimList = memo(function ClaimList({
  claims,
  onInvestigate,
  onUpdatePacket,
  className = "",
}: ClaimListProps) {
  // Sort: contradictions first, then by severity, then recency
  const sorted = [...claims].sort((a, b) => {
    if (a.type === "contradiction" && b.type !== "contradiction") return -1;
    if (b.type === "contradiction" && a.type !== "contradiction") return 1;
    const sevOrder = { high: 0, medium: 1, low: 2 };
    const sevA = sevOrder[a.severity ?? "low"] ?? 2;
    const sevB = sevOrder[b.severity ?? "low"] ?? 2;
    if (sevA !== sevB) return sevA - sevB;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  return (
    <div className={`space-y-2 ${className}`}>
      {sorted.map((claim) => (
        <ClaimCard
          key={claim.id}
          claim={claim}
          onInvestigate={onInvestigate}
          onUpdatePacket={onUpdatePacket}
        />
      ))}
    </div>
  );
});

export default ClaimCard;
