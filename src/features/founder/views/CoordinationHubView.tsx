/**
 * CoordinationHubView — Team coordination surface.
 *
 * Shows peer presence, task delegation, context packets, and messaging.
 * Wired to /api/shared-context endpoints via useCoordinationHub().
 * Falls back to demo fixtures when backend is offline.
 *
 * Route: /founder/coordination
 */

import { RefreshCw, Radio, Wifi, WifiOff } from "lucide-react";
import { useCoordinationHub } from "../hooks/useCoordinationHub";
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
    actions,
    refresh,
  } = useCoordinationHub();

  const currentPeerId = "peer:founder:homen";
  const peerIds = peers.map((p) => p.peerId);

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
