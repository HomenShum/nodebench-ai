/**
 * CoordinationHubView — Team coordination surface.
 *
 * Shows peer presence, task delegation, context packets, and messaging.
 * Wired to /api/shared-context endpoints via useCoordinationHub().
 * Falls back to demo fixtures when backend is offline.
 *
 * Route: /founder/coordination
 */

import { useState, useRef, useEffect } from "react";
import { RefreshCw, Radio, Wifi, WifiOff, Activity, Eye, ChevronDown, ChevronUp } from "lucide-react";
import { useCoordinationHub } from "../hooks/useCoordinationHub";
import type { SharedContextEvent } from "../types/sharedContext";
import {
  PeerPresenceCard,
  TaskDelegationCard,
  ContextPacketCard,
  MessageThread,
} from "../components/coordination";

export default function CoordinationHubView() {
  const {
    peers,
    packets,
    tasks,
    messages,
    counts,
    isLive,
    isConnected,
    isLoading,
    lastEvent,
    eventLog,
    actions,
    refresh,
  } = useCoordinationHub();

  const currentPeerId = "peer:founder:homen";
  const peerIds = peers.map((p) => p.peerId);

  // Claw3D-inspired: event feed panel (live activity stream)
  const [showEventFeed, setShowEventFeed] = useState(false);
  // Claw3D-inspired: follow packet mode
  const [followPacketId, setFollowPacketId] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Radio className="h-5 w-5 text-[#d97757]" />
          <h1 className="text-lg font-semibold text-white/90" style={{ fontFamily: "Manrope, sans-serif" }}>
            Coordination Hub
          </h1>
          {/* Connection indicator */}
          <div className="flex items-center gap-1.5">
            {isConnected ? (
              <Wifi className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <WifiOff className="h-3.5 w-3.5 text-white/20" />
            )}
            <span className={`text-[10px] font-medium ${isLive ? "text-emerald-400" : "text-amber-400"}`}>
              {isLive ? "Live" : "Demo"}
            </span>
          </div>
        </div>

        <button
          onClick={refresh}
          disabled={isLoading}
          className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/50 transition-colors hover:bg-white/10 disabled:opacity-30"
          type="button"
          aria-label="Refresh"
        >
          <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Counts strip */}
      <div className="flex flex-wrap gap-4 rounded-lg border border-white/[0.04] bg-white/[0.01] px-4 py-2">
        <Stat label="Peers" value={counts.activePeers} active={counts.activePeers > 0} />
        <Stat label="Tasks" value={counts.openTasks} active={counts.openTasks > 0} />
        <Stat label="Packets" value={counts.activePackets} />
        <Stat label="Unread" value={counts.unreadMessages} active={counts.unreadMessages > 0} />
      </div>

      {/* Peer Presence (full width) */}
      <PeerPresenceCard peers={peers} />

      {/* Two-column: Tasks + Packets */}
      <div className="grid gap-4 md:grid-cols-2">
        <TaskDelegationCard tasks={tasks} />
        <ContextPacketCard packets={packets} />
      </div>

      {/* Messages (full width) */}
      <MessageThread
        messages={messages}
        currentPeerId={currentPeerId}
        peerIds={peerIds}
        onSend={async (toPeerId, body) => {
          await actions.publishPacket({
            contextType: "state_snapshot_packet",
            producerPeerId: currentPeerId,
            subject: `Message to ${toPeerId}`,
            summary: body,
            claims: [],
            evidenceRefs: [],
          });
          refresh();
        }}
      />

      {/* Claw3D-Inspired: Live Event Feed */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02]">
        <button
          type="button"
          onClick={() => setShowEventFeed((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-left"
          aria-expanded={showEventFeed}
          aria-controls="event-feed-panel"
        >
          <div className="flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 text-[#d97757]" />
            <span className="text-[11px] uppercase tracking-[0.2em] text-white/40">
              Live Event Feed
            </span>
            {eventLog.length > 0 && (
              <span className="rounded-full bg-[#d97757]/20 px-2 py-0.5 text-[10px] font-medium text-[#d97757]">
                {eventLog.length}
              </span>
            )}
          </div>
          {showEventFeed ? (
            <ChevronUp className="h-3.5 w-3.5 text-white/20" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-white/20" />
          )}
        </button>

        {showEventFeed && (
          <div id="event-feed-panel" className="max-h-60 overflow-y-auto border-t border-white/[0.04] px-4 pb-3">
            {eventLog.length === 0 ? (
              <p className="py-4 text-center text-xs text-white/30">
                No events yet. Events appear when peers publish, delegate, or message.
              </p>
            ) : (
              <div className="space-y-1 pt-2" role="log" aria-label="Live coordination events">
                {eventLog.slice().reverse().map((event, i) => (
                  <EventRow key={`${event.type}-${event.timestamp}-${i}`} event={event} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Claw3D-Inspired: Delegation Target Cards */}
      {isLive && (
        <div className="grid gap-3 md:grid-cols-2">
          <DelegationTargetCard
            name="Claude Code"
            peerId="peer:delegate:claude_code"
            peers={peers}
            installCommand="claude mcp add nodebench -- npx -y nodebench-mcp"
          />
          <DelegationTargetCard
            name="OpenClaw"
            peerId="peer:delegate:openclaw"
            peers={peers}
            installCommand="npx -y nodebench-mcp"
          />
        </div>
      )}

      {/* Empty state guidance when no backend */}
      {!isLive && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 text-center">
          <p className="text-sm text-white/40 mb-3">
            Showing demo data. Start the backend to see live coordination:
          </p>
          <code className="inline-block rounded-lg bg-black/40 px-4 py-2 font-mono text-xs text-[#d97757]">
            npx tsx server/index.ts
          </code>
          <p className="mt-2 text-[10px] text-white/20">
            Then connect agents via MCP: <code className="text-white/30">npx nodebench-mcp --preset founder</code>
          </p>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, active }: { label: string; value: number; active?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`font-mono text-sm font-semibold ${active ? "text-[#d97757]" : "text-white/50"}`}>
        {value}
      </span>
      <span className="text-[10px] text-white/30">{label}</span>
    </div>
  );
}

/** Claw3D-inspired event feed row */
function EventRow({ event }: { event: SharedContextEvent }) {
  const typeColors: Record<string, string> = {
    connected: "text-emerald-400",
    heartbeat: "text-white/15",
    peer_registered: "text-blue-400",
    packet_published: "text-[#d97757]",
    task_proposed: "text-amber-400",
    task_accepted: "text-emerald-400",
    task_completed: "text-emerald-300",
    message_sent: "text-purple-400",
  };

  const color = typeColors[event.type] ?? "text-white/30";
  const ts = event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : "";

  // Hide heartbeat noise
  if (event.type === "heartbeat") return null;

  return (
    <div className="flex items-center gap-2 py-0.5">
      <span className="shrink-0 font-mono text-[9px] text-white/20">{ts}</span>
      <span className={`shrink-0 text-[10px] font-medium ${color}`}>
        {event.type.replaceAll("_", " ")}
      </span>
      {typeof event.payload === "object" && event.payload && "subject" in (event.payload as Record<string, unknown>) && (
        <span className="truncate text-[10px] text-white/30">
          {String((event.payload as Record<string, unknown>).subject)}
        </span>
      )}
    </div>
  );
}

/** Claw3D-inspired delegation target card */
function DelegationTargetCard({
  name,
  peerId,
  peers,
  installCommand,
}: {
  name: string;
  peerId: string;
  peers: Array<{ peerId: string; status: string; summary?: { currentTask?: string } }>;
  installCommand: string;
}) {
  const peer = peers.find((p) => p.peerId === peerId);
  const isConnected = peer?.status === "active";

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="h-3.5 w-3.5 text-white/30" />
          <span className="text-sm font-medium text-white/80">{name}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={`h-2 w-2 rounded-full ${isConnected ? "bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.5)]" : "bg-white/20"}`}
          />
          <span className={`text-[10px] ${isConnected ? "text-emerald-400" : "text-white/30"}`}>
            {isConnected ? "Connected" : "Awaiting"}
          </span>
        </div>
      </div>
      {peer?.summary?.currentTask && (
        <p className="mt-2 truncate text-xs text-white/40">{peer.summary.currentTask}</p>
      )}
      {!isConnected && (
        <div className="mt-2">
          <code className="block rounded bg-black/30 px-2 py-1 font-mono text-[10px] text-[#d97757]/80">
            {installCommand}
          </code>
        </div>
      )}
    </div>
  );
}
