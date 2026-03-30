/**
 * TeamView — Team coordination page.
 *
 * Shows connected Claude Code peers, their summaries, and allows
 * cross-agent messaging. Inspired by claude-peers-mcp (louislva)
 * and retention.sh/memory/team.
 *
 * Route: /founder/coordination?tab=team
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { Users, Send, Radio, RefreshCw, UserPlus, Copy, Check, Wifi, WifiOff } from "lucide-react";
import { useCoordinationHub } from "../hooks/useCoordinationHub";
import { cn } from "@/lib/utils";

/* ─── Types ──────────────────────────────────────────────────── */

interface TeamMessage {
  id: string;
  fromPeerId: string;
  toPeerId: string;
  content: string;
  timestamp: string;
  acknowledged: boolean;
}

/* ─── Helpers ────────────────────────────────────────────────── */

function peerLabel(peerId: string): string {
  const parts = peerId.split(":");
  return parts[parts.length - 1]?.replaceAll("_", " ") ?? peerId;
}

function relativeTime(iso?: string): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "now";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  return `${Math.floor(diff / 86400_000)}d ago`;
}

function statusDot(status: string) {
  if (status === "active") return "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]";
  if (status === "idle") return "bg-amber-400";
  return "bg-white/20";
}

/* ─── Main ───────────────────────────────────────────────────── */

export default function TeamView() {
  const {
    peers,
    messages,
    isLive,
    isConnected,
    isLoading,
    actions,
    refresh,
  } = useCoordinationHub();

  const [selectedPeer, setSelectedPeer] = useState<string | null>(null);
  const [composeText, setComposeText] = useState("");
  const [copiedJoin, setCopiedJoin] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentPeerId = "peer:founder:local";

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Filter messages for selected peer conversation
  const peerMessages = messages.filter(
    (m) =>
      selectedPeer &&
      ((m.fromPeerId === currentPeerId && m.toPeerId === selectedPeer) ||
        (m.fromPeerId === selectedPeer && m.toPeerId === currentPeerId)),
  );

  const handleSend = useCallback(async () => {
    if (!selectedPeer || !composeText.trim()) return;
    await actions.publishPacket({
      contextType: "state_snapshot_packet",
      producerPeerId: currentPeerId,
      subject: `Message to ${peerLabel(selectedPeer)}`,
      summary: composeText.trim(),
      claims: [],
      evidenceRefs: [],
    });
    setComposeText("");
    refresh();
  }, [selectedPeer, composeText, actions, refresh]);

  const handleCopyJoinCommand = useCallback(() => {
    navigator.clipboard.writeText("claude mcp add nodebench -- npx -y nodebench-mcp --preset founder");
    setCopiedJoin(true);
    setTimeout(() => setCopiedJoin(false), 2000);
  }, []);

  return (
    <div className="flex h-full">
      {/* ── Left: Peer List ──────────────────────────────────────── */}
      <aside className="w-72 shrink-0 border-r border-white/[0.06] bg-[#151413]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-[#d97757]" />
            <h2 className="text-sm font-semibold text-white/80">Team</h2>
            <span className={cn("h-2 w-2 rounded-full", isConnected ? "bg-emerald-400" : "bg-white/20")} />
          </div>
          <button
            onClick={refresh}
            disabled={isLoading}
            className="rounded-md p-1 text-white/30 hover:bg-white/5 hover:text-white/50"
            type="button"
            aria-label="Refresh"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
          </button>
        </div>

        {/* Peer list */}
        <div className="overflow-y-auto" style={{ height: "calc(100% - 120px)" }}>
          {peers.length === 0 ? (
            <div className="p-4 text-center">
              <UserPlus className="mx-auto h-8 w-8 text-white/10" />
              <p className="mt-2 text-xs text-white/30">No peers connected</p>
              <p className="mt-1 text-[10px] text-white/20">
                Have your teammate run the join command below
              </p>
            </div>
          ) : (
            <div className="space-y-0.5 p-1">
              {peers.map((peer) => (
                <button
                  key={peer.peerId}
                  type="button"
                  onClick={() => setSelectedPeer(peer.peerId)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                    selectedPeer === peer.peerId
                      ? "bg-[#d97757]/10 border border-[#d97757]/20"
                      : "hover:bg-white/[0.03] border border-transparent",
                  )}
                >
                  <div className="relative">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-xs font-medium text-white/50">
                      {peerLabel(peer.peerId).charAt(0).toUpperCase()}
                    </div>
                    <span className={cn("absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-[#151413]", statusDot(peer.status))} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-white/70">
                      {peerLabel(peer.peerId)}
                    </div>
                    <div className="truncate text-[10px] text-white/30">
                      {peer.summary?.currentTask || peer.role}
                    </div>
                  </div>
                  <span className="shrink-0 text-[9px] text-white/15 font-mono">
                    {relativeTime(peer.lastHeartbeatAt)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Join command */}
        <div className="border-t border-white/[0.06] p-3">
          <button
            type="button"
            onClick={handleCopyJoinCommand}
            className="flex w-full items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-left transition-colors hover:bg-white/[0.06]"
          >
            {copiedJoin ? (
              <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
            ) : (
              <Copy className="h-3.5 w-3.5 shrink-0 text-white/30" />
            )}
            <div className="min-w-0 flex-1">
              <div className="text-[10px] text-white/40">
                {copiedJoin ? "Copied!" : "Invite teammate"}
              </div>
              <div className="truncate font-mono text-[9px] text-white/20">
                claude mcp add nodebench ...
              </div>
            </div>
          </button>
        </div>
      </aside>

      {/* ── Right: Messages ─────────────────────────────────────── */}
      <main className="flex min-w-0 flex-1 flex-col">
        {selectedPeer ? (
          <>
            {/* Conversation header */}
            <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-xs font-medium text-white/50">
                {peerLabel(selectedPeer).charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-sm font-medium text-white/80">{peerLabel(selectedPeer)}</div>
                <div className="text-[10px] text-white/30">
                  {peers.find((p) => p.peerId === selectedPeer)?.summary?.currentTask || "Connected"}
                </div>
              </div>
              <div className="ml-auto flex items-center gap-1.5">
                {isConnected ? (
                  <Wifi className="h-3 w-3 text-emerald-400" />
                ) : (
                  <WifiOff className="h-3 w-3 text-white/20" />
                )}
                <span className={cn("text-[10px]", isLive ? "text-emerald-400" : "text-white/30")}>
                  {isLive ? "Live" : "Demo"}
                </span>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {peerMessages.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center">
                    <Radio className="mx-auto h-8 w-8 text-white/10" />
                    <p className="mt-2 text-sm text-white/30">No messages yet</p>
                    <p className="mt-1 text-xs text-white/20">
                      Send a message to {peerLabel(selectedPeer)}&apos;s Claude Code
                    </p>
                  </div>
                </div>
              ) : (
                peerMessages.map((msg) => {
                  const isOwn = msg.fromPeerId === currentPeerId;
                  return (
                    <div
                      key={msg.id}
                      className={cn("max-w-[75%] rounded-xl px-3 py-2", isOwn ? "ml-auto bg-[#d97757]/15" : "bg-white/[0.04]")}
                    >
                      <p className="text-sm text-white/70">{msg.content}</p>
                      <span className="mt-0.5 block text-[9px] text-white/20 font-mono">
                        {relativeTime(msg.timestamp)}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Compose */}
            <div className="border-t border-white/[0.06] p-3">
              <div className="flex gap-2">
                <input
                  value={composeText}
                  onChange={(e) => setComposeText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void handleSend();
                    }
                  }}
                  placeholder={`Message ${peerLabel(selectedPeer)}'s Claude Code...`}
                  className="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white/70 placeholder:text-white/20 focus:border-[#d97757]/30 focus:outline-none"
                  aria-label="Message input"
                />
                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={!composeText.trim()}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#d97757]/20 text-[#d97757] transition-colors hover:bg-[#d97757]/30 disabled:opacity-30"
                  aria-label="Send message"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Empty state — no peer selected */
          <div className="flex h-full items-center justify-center">
            <div className="max-w-sm text-center">
              <Users className="mx-auto h-12 w-12 text-white/10" />
              <h2 className="mt-4 text-lg font-semibold text-white/60">Team Coordination</h2>
              <p className="mt-2 text-sm text-white/30">
                Send messages between Claude Code instances.
                Your agent can help your teammate&apos;s agent set things up,
                share context, and coordinate work — without switching laptops.
              </p>
              <div className="mt-4 rounded-lg border border-white/[0.08] bg-white/[0.03] p-3">
                <div className="text-[10px] uppercase tracking-wider text-white/25">Quick start</div>
                <p className="mt-1 text-xs text-white/40">
                  1. Have your teammate install NodeBench-MCP<br />
                  2. Both peers appear in the left panel<br />
                  3. Select a peer and start messaging
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopyJoinCommand}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#d97757] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#c86747]"
              >
                {copiedJoin ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedJoin ? "Copied!" : "Copy invite command"}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
