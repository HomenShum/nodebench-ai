/**
 * PacketHistoryTimeline — Visual timeline of artifact packet versions.
 *
 * The "return hook" — shows what changed between packets, when they were generated,
 * and lets the user navigate between versions. Grouped by date with version labels.
 *
 * Glass card DNA, touch-friendly (44px), mobile-first.
 */

import { memo, useState, useCallback } from "react";
import { Clock, Eye, GitCompare, Package } from "lucide-react";
import type { FounderArtifactPacket, ArtifactPacketType } from "../types/artifactPacket";

/* ─── Type config ─────────────────────────────────────────────────────────── */

const TYPE_LABELS: Record<ArtifactPacketType, string> = {
  weekly_reset: "Weekly Reset",
  pre_delegation: "Pre-Delegation",
  important_change: "Change Review",
};

const TYPE_BADGE: Record<ArtifactPacketType, { bg: string; text: string }> = {
  weekly_reset: { bg: "bg-[#d97757]/15", text: "text-[#d97757]" },
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

function groupByDate(packets: FounderArtifactPacket[]): Map<string, FounderArtifactPacket[]> {
  const groups = new Map<string, FounderArtifactPacket[]>();
  for (const p of packets) {
    const key = formatDateGroup(p.provenance.generatedAt);
    const arr = groups.get(key) ?? [];
    arr.push(p);
    groups.set(key, arr);
  }
  return groups;
}

/* ─── Timeline Entry ──────────────────────────────────────────────────────── */

interface TimelineEntryProps {
  packet: FounderArtifactPacket;
  version: number;
  isActive: boolean;
  hasPrevious: boolean;
  isLast: boolean;
  onSelect: (id: string) => void;
}

const TimelineEntry = memo(function TimelineEntry({
  packet,
  version,
  isActive,
  hasPrevious,
  isLast,
  onSelect,
}: TimelineEntryProps) {
  const badge = TYPE_BADGE[packet.packetType];
  const stats = {
    entities: packet.nearbyEntities.length,
    changes: packet.whatChanged ? 1 : 0,
    contradictions: packet.contradictions.length,
    actions: packet.nextActions.length,
  };

  return (
    <div className="relative flex gap-3">
      {/* Timeline line + version circle */}
      <div className="flex flex-col items-center">
        <div
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold ${
            isActive
              ? "border-[#d97757] bg-[#d97757]/20 text-[#d97757]"
              : "border-white/20 bg-white/[0.06] text-white/50"
          }`}
        >
          v{version}
        </div>
        {!isLast && (
          <div className="w-0.5 flex-1 bg-white/[0.08]" />
        )}
      </div>

      {/* Card */}
      <button
        type="button"
        onClick={() => onSelect(packet.packetId)}
        className={`mb-3 flex-1 rounded-xl border p-3 text-left transition-all duration-150 ${
          isActive
            ? "border-[#d97757]/40 bg-[#d97757]/5"
            : "border-white/[0.12] bg-white/[0.04] hover:border-white/[0.20] hover:bg-white/[0.06]"
        }`}
      >
        {/* Header row: type badge + timestamp */}
        <div className="flex items-center justify-between gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${badge.bg} ${badge.text}`}
          >
            <Package className="h-2.5 w-2.5" />
            {TYPE_LABELS[packet.packetType]}
          </span>
          <span className="flex items-center gap-1 text-[10px] text-white/40">
            <Clock className="h-2.5 w-2.5" />
            {relativeTime(packet.provenance.generatedAt)}
          </span>
        </div>

        {/* Company name */}
        <p className="mt-1.5 text-sm font-medium text-white/80">
          {packet.canonicalEntity.name}
        </p>

        {/* Stats row */}
        <div className="mt-1.5 flex flex-wrap gap-2">
          {stats.entities > 0 && (
            <span className="text-[10px] text-white/40">
              {stats.entities} entities
            </span>
          )}
          {stats.contradictions > 0 && (
            <span className="text-[10px] text-[#d97757]">
              {stats.contradictions} contradiction{stats.contradictions > 1 ? "s" : ""}
            </span>
          )}
          <span className="text-[10px] text-white/40">
            {stats.actions} action{stats.actions !== 1 ? "s" : ""}
          </span>
          <span className="text-[10px] text-white/40">
            {packet.provenance.sourceCount} sources
          </span>
        </div>

        {/* Actions row */}
        <div className="mt-2 flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-md bg-white/[0.06] px-2 py-1 text-[10px] font-medium text-white/60 transition-colors hover:bg-white/[0.10]">
            <Eye className="h-2.5 w-2.5" />
            View
          </span>
          {hasPrevious && (
            <span className="inline-flex items-center gap-1 rounded-md bg-white/[0.06] px-2 py-1 text-[10px] font-medium text-white/60 transition-colors hover:bg-white/[0.10]">
              <GitCompare className="h-2.5 w-2.5" />
              Diff
            </span>
          )}
        </div>
      </button>
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
  const MAX_INITIAL = 10;

  const sorted = [...packets].sort(
    (a, b) =>
      new Date(b.provenance.generatedAt).getTime() -
      new Date(a.provenance.generatedAt).getTime(),
  );

  const visible = showAll ? sorted : sorted.slice(0, MAX_INITIAL);
  const hiddenCount = sorted.length - MAX_INITIAL;
  const groups = groupByDate(visible);

  const handleToggle = useCallback(() => setShowAll((p) => !p), []);

  if (packets.length === 0) {
    return (
      <div className={`rounded-xl border border-white/[0.12] bg-white/[0.04] p-6 text-center ${className}`}>
        <Package className="mx-auto h-8 w-8 text-white/20" />
        <p className="mt-2 text-sm text-white/40">No packets yet</p>
        <p className="mt-1 text-[11px] text-white/30">
          Generate your first packet above to start building history.
        </p>
      </div>
    );
  }

  // Version numbers: most recent = highest version
  const versionMap = new Map<string, number>();
  sorted.forEach((p, i) => versionMap.set(p.packetId, sorted.length - i));

  let entryIndex = 0;
  const totalEntries = visible.length;

  return (
    <div className={className}>
      {[...groups.entries()].map(([dateLabel, groupPackets]) => (
        <div key={dateLabel}>
          {/* Date group header */}
          <div className="mb-2 ml-10 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
            {dateLabel}
          </div>

          {/* Entries */}
          {groupPackets.map((packet) => {
            const idx = entryIndex++;
            return (
              <TimelineEntry
                key={packet.packetId}
                packet={packet}
                version={versionMap.get(packet.packetId) ?? 1}
                isActive={packet.packetId === activePacketId}
                hasPrevious={idx < totalEntries - 1}
                isLast={idx === totalEntries - 1}
                onSelect={onSelectPacket}
              />
            );
          })}
        </div>
      ))}

      {/* Show more button */}
      {!showAll && hiddenCount > 0 && (
        <button
          type="button"
          onClick={handleToggle}
          className="ml-10 rounded-lg border border-white/[0.12] bg-white/[0.04] px-3 py-2 text-[11px] font-medium text-white/50 transition-colors hover:bg-white/[0.06] hover:text-white/70"
        >
          Show {hiddenCount} older packet{hiddenCount !== 1 ? "s" : ""}
        </button>
      )}
      {showAll && hiddenCount > 0 && (
        <button
          type="button"
          onClick={handleToggle}
          className="ml-10 rounded-lg border border-white/[0.12] bg-white/[0.04] px-3 py-2 text-[11px] font-medium text-white/50 transition-colors hover:bg-white/[0.06] hover:text-white/70"
        >
          Show less
        </button>
      )}
    </div>
  );
});
