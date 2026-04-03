/**
 * PacketHistoryTimeline — Visual vertical timeline of artifact packet versions.
 *
 * Features:
 *   - Vertical timeline with date-grouped entries
 *   - Diff indicators between adjacent packets (green/red/gray arrows)
 *   - Expandable cards showing full packet summary
 *   - Most recent packet highlighted with terracotta accent
 *   - "Compare with previous" mini diff on each card
 *   - Max 12 packets (matches loadPackets limit)
 *   - Glass card DNA, touch-friendly (44px), mobile-first
 */

import { memo, useState, useCallback, useMemo } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Clock,
  Eye,
  GitCompare,
  Minus,
  Package,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type {
  FounderArtifactPacket,
  ArtifactPacketType,
} from "../types/artifactPacket";
import {
  diffPackets,
  formatConfidenceDelta,
  trendLabel,
  type PacketDiffResult,
} from "../lib/packetDiff";

/* ─── Type config ─────────────────────────────────────────────────────────── */

const TYPE_LABELS: Record<ArtifactPacketType, string> = {
  weekly_reset: "Weekly Reset",
  pre_delegation: "Pre-Delegation",
  important_change: "Change Review",
};

const TYPE_BADGE: Record<ArtifactPacketType, { bg: string; text: string }> = {
  weekly_reset: { bg: "bg-accent-primary/15", text: "text-accent-primary" },
  pre_delegation: { bg: "bg-violet-500/15", text: "text-violet-400" },
  important_change: { bg: "bg-amber-500/15", text: "text-amber-400" },
};

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function formatDateGroup(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function groupByDate(
  packets: FounderArtifactPacket[],
): Map<string, FounderArtifactPacket[]> {
  const groups = new Map<string, FounderArtifactPacket[]>();
  for (const p of packets) {
    const key = formatDateGroup(p.provenance.generatedAt);
    const arr = groups.get(key) ?? [];
    arr.push(p);
    groups.set(key, arr);
  }
  return groups;
}

/* ─── Diff Badge ──────────────────────────────────────────────────────────── */

function DiffBadge({ diff }: { diff: PacketDiffResult }) {
  const { overallTrend, confidenceDelta } = diff;
  const deltaStr = formatConfidenceDelta(confidenceDelta);

  if (overallTrend === "improving") {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-400">
        <ArrowUp className="h-2.5 w-2.5" />
        {deltaStr}
      </span>
    );
  }
  if (overallTrend === "declining") {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-rose-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-rose-400">
        <ArrowDown className="h-2.5 w-2.5" />
        {deltaStr}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-semibold text-white/40">
      <Minus className="h-2.5 w-2.5" />
      {deltaStr}
    </span>
  );
}

/* ─── Mini Diff Panel ─────────────────────────────────────────────────────── */

function MiniDiffPanel({ diff }: { diff: PacketDiffResult }) {
  return (
    <div className="mt-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-2 text-[10px]">
      <div className="mb-1 text-[9px] font-semibold uppercase tracking-[0.15em] text-white/40">
        vs Previous
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        {diff.confidenceDelta !== 0 && (
          <div className="flex items-center gap-1">
            <span className="text-white/40">Confidence:</span>
            <span
              className={
                diff.confidenceDelta > 0
                  ? "font-medium text-emerald-400"
                  : "font-medium text-rose-400"
              }
            >
              {formatConfidenceDelta(diff.confidenceDelta)}
            </span>
          </div>
        )}
        {diff.contradictionsResolved > 0 && (
          <div className="flex items-center gap-1 text-emerald-400/80">
            <ArrowDown className="h-2.5 w-2.5" />
            {diff.contradictionsResolved} resolved
          </div>
        )}
        {diff.contradictionsAdded > 0 && (
          <div className="flex items-center gap-1 text-rose-400/80">
            <ArrowUp className="h-2.5 w-2.5" />
            {diff.contradictionsAdded} new contradiction
            {diff.contradictionsAdded > 1 ? "s" : ""}
          </div>
        )}
        {diff.actionsCompleted > 0 && (
          <div className="flex items-center gap-1 text-emerald-400/80">
            <ArrowDown className="h-2.5 w-2.5" />
            {diff.actionsCompleted} completed
          </div>
        )}
        {diff.actionsAdded > 0 && (
          <div className="flex items-center gap-1 text-white/50">
            <ArrowUp className="h-2.5 w-2.5" />
            {diff.actionsAdded} new action{diff.actionsAdded > 1 ? "s" : ""}
          </div>
        )}
      </div>
      <div className="mt-1.5 flex items-center gap-1">
        <span className="text-white/30">Trend:</span>
        <span
          className={
            diff.overallTrend === "improving"
              ? "font-medium text-emerald-400"
              : diff.overallTrend === "declining"
                ? "font-medium text-rose-400"
                : "font-medium text-white/40"
          }
        >
          {trendLabel(diff.overallTrend)}
        </span>
        {diff.overallTrend === "improving" ? (
          <TrendingUp className="h-2.5 w-2.5 text-emerald-400" />
        ) : diff.overallTrend === "declining" ? (
          <TrendingDown className="h-2.5 w-2.5 text-rose-400" />
        ) : null}
      </div>
    </div>
  );
}

/* ─── Expanded Summary ────────────────────────────────────────────────────── */

function ExpandedSummary({ packet }: { packet: FounderArtifactPacket }) {
  const confRaw = Math.round(packet.canonicalEntity.identityConfidence * 100);
  const conf = confRaw > 0 ? confRaw : null;
  return (
    <div className="mt-2 space-y-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 text-xs">
      {/* Operating memo */}
      {packet.operatingMemo && (
        <div>
          <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-white/40">
            Operating Memo
          </span>
          <p className="mt-0.5 leading-relaxed text-white/60">
            {packet.operatingMemo}
          </p>
        </div>
      )}

      {/* What changed */}
      {packet.whatChanged && (
        <div>
          <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-white/40">
            What Changed
          </span>
          <p className="mt-0.5 text-white/50">{packet.whatChanged}</p>
        </div>
      )}

      {/* Contradictions */}
      {packet.contradictions.length > 0 && (
        <div className="rounded-md border border-rose-500/10 bg-rose-500/[0.03] p-2">
          <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-rose-400/60">
            Contradictions ({packet.contradictions.length})
          </span>
          {packet.contradictions.map((c) => (
            <p key={c.id} className="mt-0.5 text-rose-300/60">
              {c.title}
            </p>
          ))}
        </div>
      )}

      {/* Next actions */}
      {packet.nextActions.length > 0 && (
        <div>
          <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-white/40">
            Next Actions ({packet.nextActions.length})
          </span>
          <ul className="mt-0.5 space-y-0.5">
            {packet.nextActions.map((a) => (
              <li key={a.id} className="flex items-start gap-1.5 text-white/50">
                <span
                  className={`mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                    a.priority === "high"
                      ? "bg-accent-primary"
                      : a.priority === "medium"
                        ? "bg-amber-400/60"
                        : "bg-white/20"
                  }`}
                />
                {a.label}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Key metrics row */}
      <div className="flex flex-wrap gap-3 border-t border-white/[0.06] pt-2">
        {conf != null && (
          <span className="text-[10px] text-white/30">
            Confidence:{" "}
            <span
              className={
                conf >= 60
                  ? "font-medium text-emerald-400/70"
                  : conf >= 45
                    ? "font-medium text-amber-400/70"
                    : "font-medium text-rose-400/70"
              }
            >
              {conf}%
            </span>
          </span>
        )}
        <span className="text-[10px] text-white/30">
          Sources: {packet.provenance.sourceCount}
        </span>
        <span className="text-[10px] text-white/30">
          Entities: {packet.nearbyEntities.length}
        </span>
      </div>
    </div>
  );
}

/* ─── Timeline Entry ──────────────────────────────────────────────────────── */

interface TimelineEntryProps {
  packet: FounderArtifactPacket;
  version: number;
  isLatest: boolean;
  isActive: boolean;
  diff: PacketDiffResult | null;
  isLast: boolean;
  onSelect: (id: string) => void;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  showDiff: boolean;
  onToggleDiff: (id: string) => void;
}

const TimelineEntry = memo(function TimelineEntry({
  packet,
  version,
  isLatest,
  isActive,
  diff,
  isLast,
  onSelect,
  isExpanded,
  onToggleExpand,
  showDiff,
  onToggleDiff,
}: TimelineEntryProps) {
  const badge = TYPE_BADGE[packet.packetType];
  const confRaw = Math.round(packet.canonicalEntity.identityConfidence * 100);
  const conf = confRaw > 0 ? confRaw : null;

  return (
    <div className="relative flex gap-3">
      {/* Timeline line + node circle */}
      <div className="flex flex-col items-center">
        <div
          className={`flex h-3 w-3 shrink-0 items-center justify-center rounded-full ${
            isLatest
              ? "bg-accent-primary shadow-[0_0_8px_rgba(217,119,87,0.3)]"
              : "bg-white/[0.20]"
          }`}
        />
        {!isLast && <div className="w-0.5 flex-1 bg-white/[0.10]" />}
      </div>

      {/* Card */}
      <div className="mb-3 min-w-0 flex-1">
        <button
          type="button"
          onClick={() => onSelect(packet.packetId)}
          className={`w-full rounded-xl border p-3 text-left transition-all duration-150 ${
            isActive
              ? "border-accent-primary/40 bg-accent-primary/5"
              : isLatest
                ? "border-accent-primary/20 bg-white/[0.04] hover:border-accent-primary/30 hover:bg-white/[0.06]"
                : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]"
          }`}
        >
          {/* Header row: type badge + diff badge + timestamp */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${badge.bg} ${badge.text}`}
              >
                <Package className="h-2.5 w-2.5" />
                {TYPE_LABELS[packet.packetType]}
              </span>
              {diff && <DiffBadge diff={diff} />}
            </div>
            <span className="flex items-center gap-1 text-[10px] text-white/40">
              <Clock className="h-2.5 w-2.5" />
              {relativeTime(packet.provenance.generatedAt)}
            </span>
          </div>

          {/* Company name + confidence */}
          <div className="mt-1.5 flex items-center justify-between">
            <p className="text-sm font-medium text-white/80">
              {packet.canonicalEntity.name}
            </p>
            {conf != null ? (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold tabular-nums ${
                  conf >= 60
                    ? "bg-emerald-500/10 text-emerald-400/70"
                    : conf >= 45
                      ? "bg-amber-500/10 text-amber-400/70"
                      : "bg-rose-500/10 text-rose-400/70"
                }`}
              >
                {conf}%
              </span>
            ) : (
              <span className="rounded-full bg-white/[0.05] px-1.5 py-0.5 text-[9px] text-white/30">
                New
              </span>
            )}
          </div>

          {/* Stats row */}
          <div className="mt-1.5 flex flex-wrap gap-2">
            {packet.contradictions.length > 0 && (
              <span className="text-[10px] text-rose-400/70">
                {packet.contradictions.length} contradiction
                {packet.contradictions.length > 1 ? "s" : ""}
              </span>
            )}
            <span className="text-[10px] text-white/40">
              {packet.nextActions.length} action
              {packet.nextActions.length !== 1 ? "s" : ""}
            </span>
            <span className="text-[10px] text-white/40">
              {packet.provenance.sourceCount} sources
            </span>
            {packet.nearbyEntities.length > 0 && (
              <span className="text-[10px] text-white/40">
                {packet.nearbyEntities.length} entities
              </span>
            )}
          </div>

          {/* Actions row */}
          <div className="mt-2 flex items-center gap-2">
            <span
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand(packet.packetId);
              }}
              className="inline-flex items-center gap-1 rounded-md bg-white/[0.06] px-2 py-1 text-[10px] font-medium text-white/60 transition-colors hover:bg-white/[0.10]"
            >
              {isExpanded ? (
                <ChevronUp className="h-2.5 w-2.5" />
              ) : (
                <Eye className="h-2.5 w-2.5" />
              )}
              {isExpanded ? "Collapse" : "View"}
            </span>
            {diff && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleDiff(packet.packetId);
                }}
                className="inline-flex items-center gap-1 rounded-md bg-white/[0.06] px-2 py-1 text-[10px] font-medium text-white/60 transition-colors hover:bg-white/[0.10]"
              >
                <GitCompare className="h-2.5 w-2.5" />
                {showDiff ? "Hide diff" : "Compare"}
              </span>
            )}
          </div>
        </button>

        {/* Expanded summary */}
        {isExpanded && <ExpandedSummary packet={packet} />}

        {/* Mini diff panel */}
        {showDiff && diff && <MiniDiffPanel diff={diff} />}
      </div>
    </div>
  );
});

/* ─── Timeline List ───────────────────────────────────────────────────────── */

export interface PacketHistoryTimelineProps {
  packets: FounderArtifactPacket[];
  activePacketId?: string;
  onSelectPacket: (packetId: string) => void;
  className?: string;
}

export const PacketHistoryTimeline = memo(function PacketHistoryTimeline({
  packets,
  activePacketId,
  onSelectPacket,
  className = "",
}: PacketHistoryTimelineProps) {
  const [showAll, setShowAll] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [diffId, setDiffId] = useState<string | null>(null);
  const MAX_VISIBLE = 12;

  const sorted = useMemo(
    () =>
      [...packets].sort(
        (a, b) =>
          new Date(b.provenance.generatedAt).getTime() -
          new Date(a.provenance.generatedAt).getTime(),
      ),
    [packets],
  );

  // Pre-compute diffs between adjacent packets (current vs previous)
  const diffs = useMemo(() => {
    const map = new Map<string, PacketDiffResult>();
    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const previous = sorted[i + 1];
      map.set(current.packetId, diffPackets(previous, current));
    }
    return map;
  }, [sorted]);

  const visible = showAll ? sorted : sorted.slice(0, MAX_VISIBLE);
  const hiddenCount = sorted.length - MAX_VISIBLE;
  const groups = groupByDate(visible);

  const handleToggle = useCallback(() => setShowAll((p) => !p), []);
  const handleToggleExpand = useCallback(
    (id: string) => setExpandedId((prev) => (prev === id ? null : id)),
    [],
  );
  const handleToggleDiff = useCallback(
    (id: string) => setDiffId((prev) => (prev === id ? null : id)),
    [],
  );

  /* ─── Empty state ───────────────────────────────────────────────────────── */

  if (packets.length === 0) {
    return (
      <div
        className={`rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 text-center ${className}`}
      >
        <Package className="mx-auto h-8 w-8 text-white/20" />
        <p className="mt-2 text-sm text-white/50">No packet history yet.</p>
        <p className="mt-1 text-[11px] leading-relaxed text-white/30">
          Generate your first weekly reset to start tracking.
        </p>
      </div>
    );
  }

  /* ─── Version numbers ───────────────────────────────────────────────────── */

  const versionMap = new Map<string, number>();
  sorted.forEach((p, i) => versionMap.set(p.packetId, sorted.length - i));

  let entryIndex = 0;
  const totalEntries = visible.length;

  return (
    <div className={className}>
      {[...groups.entries()].map(([dateLabel, groupPackets]) => (
        <div key={dateLabel}>
          {/* Date group header */}
          <div className="mb-2 ml-6 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
            {dateLabel}
          </div>

          {/* Entries */}
          {groupPackets.map((packet) => {
            const idx = entryIndex++;
            const isLatest = idx === 0;
            return (
              <TimelineEntry
                key={packet.packetId}
                packet={packet}
                version={versionMap.get(packet.packetId) ?? 1}
                isLatest={isLatest}
                isActive={packet.packetId === activePacketId}
                diff={diffs.get(packet.packetId) ?? null}
                isLast={idx === totalEntries - 1}
                onSelect={onSelectPacket}
                isExpanded={expandedId === packet.packetId}
                onToggleExpand={handleToggleExpand}
                showDiff={diffId === packet.packetId}
                onToggleDiff={handleToggleDiff}
              />
            );
          })}
        </div>
      ))}

      {/* Show more / less button */}
      {!showAll && hiddenCount > 0 && (
        <button
          type="button"
          onClick={handleToggle}
          className="ml-6 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[11px] font-medium text-white/50 transition-colors hover:bg-white/[0.06] hover:text-white/70"
        >
          Show {hiddenCount} older packet{hiddenCount !== 1 ? "s" : ""}
        </button>
      )}
      {showAll && hiddenCount > 0 && (
        <button
          type="button"
          onClick={handleToggle}
          className="ml-6 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[11px] font-medium text-white/50 transition-colors hover:bg-white/[0.06] hover:text-white/70"
        >
          Show less
        </button>
      )}
    </div>
  );
});
