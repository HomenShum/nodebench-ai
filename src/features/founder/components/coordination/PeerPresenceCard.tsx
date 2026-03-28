/**
 * PeerPresenceCard — Shows who's working on what.
 * Displays agents, humans, and tools with role icons, status dots, heartbeat.
 */

import { Bot, User, Wrench, Radio } from "lucide-react";
import type { SharedContextPeer, PeerRole } from "../../types/sharedContext";

function roleIcon(role: PeerRole) {
  switch (role) {
    case "runner":
    case "compiler":
    case "judge":
    case "explorer":
    case "replay":
      return <Bot className="h-3.5 w-3.5" />;
    case "environment_builder":
    case "observer":
    case "monitor":
      return <Wrench className="h-3.5 w-3.5" />;
    default:
      return <User className="h-3.5 w-3.5" />;
  }
}

function statusColor(status: string) {
  switch (status) {
    case "active": return "bg-emerald-400";
    case "idle": return "bg-amber-400";
    default: return "bg-white/20";
  }
}

function relativeTime(iso?: string): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "now";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h`;
  return `${Math.floor(diff / 86400_000)}d`;
}

function peerLabel(peerId: string): string {
  // peer:agent:claude_code -> claude_code, peer:founder:homen -> homen
  const parts = peerId.split(":");
  return parts[parts.length - 1]?.replaceAll("_", " ") ?? peerId;
}

interface Props {
  peers: SharedContextPeer[];
  compact?: boolean;
}

export function PeerPresenceCard({ peers, compact = false }: Props) {
  const activeCount = peers.filter((p) => p.status === "active").length;

  if (compact) {
    return (
      <div className="flex items-center gap-2" role="status" aria-label={`${activeCount} active peers`}>
        <div className="flex -space-x-1.5">
          {peers.slice(0, 5).map((p) => (
            <div
              key={p.peerId}
              className="relative flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60"
              title={`${peerLabel(p.peerId)} (${p.role})`}
            >
              {roleIcon(p.role)}
              <span className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ${statusColor(p.status)} ring-1 ring-black/40`} />
            </div>
          ))}
        </div>
        {activeCount > 0 && (
          <span className="text-xs font-medium text-[#d97757]">{activeCount} active</span>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-white/40">
          <Radio className="h-3.5 w-3.5" />
          Peers
        </h3>
        <span className="text-xs text-white/30">{activeCount} active</span>
      </div>

      <div className="space-y-2" role="list" aria-label="Connected peers">
        {peers.map((peer) => (
          <div
            key={peer.peerId}
            className="flex items-center gap-3 rounded-lg border border-white/[0.04] bg-white/[0.01] px-3 py-2"
            role="listitem"
            aria-label={`${peerLabel(peer.peerId)}, ${peer.role}, ${peer.status}`}
          >
            {/* Avatar */}
            <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60">
              {roleIcon(peer.role)}
              <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ${statusColor(peer.status)} ring-1 ring-black/40`} />
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium text-white/80">
                  {peerLabel(peer.peerId)}
                </span>
                <span className="shrink-0 rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-white/30">
                  {peer.role}
                </span>
              </div>
              {peer.summary?.currentTask && (
                <p className="mt-0.5 truncate text-xs text-white/40">
                  {peer.summary.currentTask}
                </p>
              )}
            </div>

            {/* Heartbeat */}
            <span className="shrink-0 text-[10px] text-white/20 font-mono">
              {relativeTime(peer.lastHeartbeatAt)}
            </span>
          </div>
        ))}

        {peers.length === 0 && (
          <p className="py-4 text-center text-xs text-white/30">
            No peers connected. Start an agent with{" "}
            <code className="rounded bg-white/5 px-1 font-mono text-[10px]">
              npx nodebench-mcp
            </code>
          </p>
        )}
      </div>
    </div>
  );
}
