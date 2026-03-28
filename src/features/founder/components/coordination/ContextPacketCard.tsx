/**
 * ContextPacketCard — Published context packets with freshness, confidence, lineage.
 */

import { FileText, Link2, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import type { SharedContextPacket, PacketFreshness } from "../../types/sharedContext";

function freshnessColor(status: PacketFreshness) {
  switch (status) {
    case "fresh": return "text-emerald-400 bg-emerald-500/15";
    case "warming": return "text-amber-400 bg-amber-500/15";
    case "stale": return "text-white/30 bg-white/5";
  }
}

function peerLabel(peerId: string): string {
  const parts = peerId.split(":");
  return parts[parts.length - 1]?.replaceAll("_", " ") ?? peerId;
}

function relativeTime(iso?: string): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  return `${Math.floor(diff / 86400_000)}d ago`;
}

interface Props {
  packets: SharedContextPacket[];
  onSelect?: (contextId: string) => void;
}

function PacketRow({ packet, onSelect }: { packet: SharedContextPacket; onSelect?: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="rounded-lg border border-white/[0.04] bg-white/[0.01] px-3 py-2.5"
      role="listitem"
    >
      <div className="flex items-start gap-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-0.5 shrink-0 text-white/30 hover:text-white/50"
          type="button"
          aria-expanded={expanded}
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </button>

        <div className="min-w-0 flex-1">
          <button
            onClick={() => onSelect?.(packet.contextId)}
            className="text-left text-sm font-medium text-white/70 hover:text-white/90 transition-colors"
            type="button"
          >
            {packet.subject}
          </button>

          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] text-white/30">
              {peerLabel(packet.producerPeerId)}
            </span>
            {packet.createdAt && (
              <span className="text-[10px] text-white/20">{relativeTime(packet.createdAt)}</span>
            )}
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${freshnessColor(packet.freshness.status)}`}>
              {packet.freshness.status}
            </span>
            {packet.confidence != null && (
              <span className="text-[10px] text-white/25">
                {Math.round(packet.confidence * 100)}% conf
              </span>
            )}
            {packet.lineage?.sourceRunId && (
              <Link2 className="h-3 w-3 text-white/15" title="Has lineage" />
            )}
          </div>
        </div>

        {/* Evidence count */}
        {packet.evidenceRefs.length > 0 && (
          <span className="shrink-0 rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-white/30">
            {packet.evidenceRefs.length} src
          </span>
        )}
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="mt-2 space-y-2 pl-6">
          <p className="text-xs text-white/40">{packet.summary}</p>
          {packet.claims.length > 0 && (
            <div>
              <span className="text-[10px] uppercase tracking-wider text-white/25">Claims</span>
              <ul className="mt-1 space-y-0.5">
                {packet.claims.map((c, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-[11px] text-white/35">
                    <FileText className="mt-0.5 h-3 w-3 shrink-0 text-white/15" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ContextPacketCard({ packets, onSelect }: Props) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[11px] uppercase tracking-[0.2em] text-white/40">
          Context Packets
        </h3>
        <span className="text-xs text-white/30">{packets.length} published</span>
      </div>

      <div className="space-y-1.5" role="list" aria-label="Context packets">
        {packets.map((packet) => (
          <PacketRow key={packet.contextId} packet={packet} onSelect={onSelect} />
        ))}

        {packets.length === 0 && (
          <p className="py-4 text-center text-xs text-white/30">
            No context packets published yet
          </p>
        )}
      </div>
    </div>
  );
}
