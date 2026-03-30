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
import { Users, Send, Radio, RefreshCw, UserPlus, Copy, Check, Wifi, WifiOff, Tag, GitBranch } from "lucide-react";
import { useCoordinationHub } from "../hooks/useCoordinationHub";
import { cn } from "@/lib/utils";
import { ROLE_CONFIG, ROLE_PERMISSIONS, shapeDelegationForRole, type TeamRole, type TeamPermission } from "../types/teamRoles";

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
  const [showDelegatePanel, setShowDelegatePanel] = useState(false);
  const [delegateTask, setDelegateTask] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentPeerId = "peer:founder:local";

  // Ensure current user + demo teammate always appear
  const selfPeer = {
    peerId: currentPeerId,
    product: "nodebench",
    workspaceId: "local",
    surface: "web" as const,
    role: "compiler" as const,
    capabilities: ["publish", "delegate", "approve"],
    status: "active" as const,
    lastHeartbeatAt: new Date().toISOString(),
    summary: { currentTask: "Team coordination" },
  };
  const demoPeers = [
    selfPeer,
    {
      peerId: "peer:teammate:sarah",
      product: "nodebench",
      workspaceId: "local",
      surface: "local_runtime" as const,
      role: "runner" as const,
      capabilities: ["execute", "publish"],
      status: "active" as const,
      lastHeartbeatAt: new Date(Date.now() - 60_000).toISOString(),
      summary: { currentTask: "Setting up dev environment" },
    },
  ];
  const allPeers = peers.length > 0
    ? (peers.some((p) => p.peerId === currentPeerId) ? peers : [selfPeer, ...peers])
    : demoPeers;

  // Role assignments (would be persisted in real impl)
  const [peerRoles, setPeerRoles] = useState<Record<string, TeamRole[]>>({
    "peer:founder:local": ["founder"],
    "peer:teammate:sarah": ["builder"],
    "peer:agent:sarah_claude": ["builder"],
  });

  const getPeerRoles = (peerId: string): TeamRole[] =>
    peerRoles[peerId] ?? (peerId.includes("founder") ? ["founder"] : ["builder"]);

  const toggleRole = (peerId: string, role: TeamRole) => {
    setPeerRoles((prev) => {
      const current = prev[peerId] ?? [];
      const next = current.includes(role)
        ? current.filter((r) => r !== role)
        : [...current, role];
      return { ...prev, [peerId]: next.length > 0 ? next : ["builder"] };
    });
  };

  // Local chat log — messages appear immediately, then sync with API
  const [localMessages, setLocalMessages] = useState<Array<{
    id: string;
    fromPeerId: string;
    toPeerId: string;
    content: string;
    timestamp: string;
    roles: TeamRole[];
  }>>([
    // Demo conversation seed — shows what the experience looks like
    {
      id: "demo-1",
      fromPeerId: "peer:founder:local",
      toPeerId: "peer:teammate:sarah",
      content: "Hey Sarah, I just set up NodeBench-MCP for our project. Can you install it on your end? Run: claude mcp add nodebench -- npx -y nodebench-mcp --preset founder",
      timestamp: new Date(Date.now() - 3600_000).toISOString(),
      roles: ["founder"],
    },
    {
      id: "demo-2",
      fromPeerId: "peer:teammate:sarah",
      toPeerId: "peer:founder:local",
      content: "Got it! Installing now... it found 81 tools. What should I do first?",
      timestamp: new Date(Date.now() - 3500_000).toISOString(),
      roles: ["builder"],
    },
    {
      id: "demo-3",
      fromPeerId: "peer:founder:local",
      toPeerId: "peer:teammate:sarah",
      content: "Great! Your Claude Code agent now has the full founder toolkit. First, clone the repo and create a new branch. I'm delegating the setup task to your agent now.",
      timestamp: new Date(Date.now() - 3400_000).toISOString(),
      roles: ["founder"],
    },
    {
      id: "demo-4",
      fromPeerId: "peer:agent:sarah_claude",
      toPeerId: "peer:founder:local",
      content: "[AGENT] Branch `feat/sarah-onboarding` created. Dependencies installed (node_modules: 1,247 packages). Dev server running on port 5191. Ready for next task.",
      timestamp: new Date(Date.now() - 3300_000).toISOString(),
      roles: ["builder"],
    },
    {
      id: "demo-5",
      fromPeerId: "peer:founder:local",
      toPeerId: "peer:teammate:sarah",
      content: "Perfect — your agent handled the setup. Now check the Dashboard tab to see our company profile and what's changed this week.",
      timestamp: new Date(Date.now() - 3200_000).toISOString(),
      roles: ["founder"],
    },
  ]);

  // Merge API messages + local messages, deduplicate by id
  const allMessages = [...localMessages, ...messages.map((m) => ({
    id: m.messageId ?? `api-${m.createdAt}`,
    fromPeerId: m.fromPeerId,
    toPeerId: m.toPeerId,
    content: m.content,
    timestamp: m.createdAt ?? new Date().toISOString(),
    roles: getPeerRoles(m.fromPeerId),
  }))];
  const seenIds = new Set<string>();
  const dedupedMessages = allMessages.filter((m) => {
    if (seenIds.has(m.id)) return false;
    seenIds.add(m.id);
    return true;
  });

  // Filter for selected peer conversation (show all if "all" channel later)
  const peerMessages = selectedPeer
    ? dedupedMessages.filter(
        (m) =>
          (m.fromPeerId === currentPeerId && m.toPeerId === selectedPeer) ||
          (m.fromPeerId === selectedPeer && m.toPeerId === currentPeerId) ||
          // Also show agent messages related to this peer
          (m.fromPeerId.includes("agent") && m.toPeerId === currentPeerId),
      )
    : dedupedMessages;

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [peerMessages.length]);

  const handleSend = useCallback(async () => {
    if (!selectedPeer || !composeText.trim()) return;
    const content = composeText.trim();
    const msgId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    // Add to local state immediately (optimistic)
    setLocalMessages((prev) => [
      ...prev,
      {
        id: msgId,
        fromPeerId: currentPeerId,
        toPeerId: selectedPeer,
        content,
        timestamp: new Date().toISOString(),
        roles: getPeerRoles(currentPeerId),
      },
    ]);
    setComposeText("");

    // Send via API in background
    try {
      const { SHARED_CONTEXT_API_BASE } = await import("@/lib/syncBridgeApi");
      await fetch(`${SHARED_CONTEXT_API_BASE}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromPeerId: currentPeerId,
          toPeerId: selectedPeer,
          content,
          messageType: "request",
        }),
      });
    } catch {
      // Message already in local state — no-op on failure
    }
  }, [selectedPeer, composeText, getPeerRoles]);

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
          {allPeers.length === 0 ? (
            <div className="p-4 text-center">
              <UserPlus className="mx-auto h-8 w-8 text-white/10" />
              <p className="mt-2 text-xs text-white/30">No peers connected</p>
              <p className="mt-1 text-[10px] text-white/20">
                Have your teammate run the join command below
              </p>
            </div>
          ) : (
            <div className="space-y-0.5 p-1">
              {allPeers.map((peer) => (
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
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {getPeerRoles(peer.peerId).map((role) => (
                        <span key={role} className={cn("rounded-full border px-1.5 py-0 text-[8px] font-medium", ROLE_CONFIG[role].color)}>
                          {ROLE_CONFIG[role].label}
                        </span>
                      ))}
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
            <div className="border-b border-white/[0.06] px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-xs font-medium text-white/50">
                  {peerLabel(selectedPeer).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-white/80">{peerLabel(selectedPeer)}</div>
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    {getPeerRoles(selectedPeer).map((role) => (
                      <span key={role} className={cn("rounded-full border px-1.5 py-0 text-[8px] font-medium", ROLE_CONFIG[role].color)}>
                        {ROLE_CONFIG[role].label}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDelegatePanel(!showDelegatePanel)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors",
                      showDelegatePanel ? "bg-[#d97757]/20 text-[#d97757]" : "bg-white/5 text-white/40 hover:bg-white/10",
                    )}
                  >
                    <GitBranch className="h-3 w-3" />
                    Delegate
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const allRoles: TeamRole[] = ["founder", "leader", "builder", "marketer", "researcher", "designer", "operator", "analyst", "sales", "support"];
                      // Cycle through adding roles for demo — in real impl this would be a dropdown
                      const current = getPeerRoles(selectedPeer);
                      const available = allRoles.filter((r) => !current.includes(r));
                      if (available.length > 0) toggleRole(selectedPeer, available[0]);
                    }}
                    className="rounded-md bg-white/5 p-1 text-white/30 hover:bg-white/10 hover:text-white/50"
                    title="Add role tag"
                  >
                    <Tag className="h-3 w-3" />
                  </button>
                  {isConnected ? (
                    <Wifi className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <WifiOff className="h-3 w-3 text-white/20" />
                  )}
                </div>
              </div>

              {/* Delegate panel */}
              {showDelegatePanel && (
                <div className="mt-3 rounded-lg border border-[#d97757]/15 bg-[#d97757]/[0.03] p-3">
                  <div className="text-[10px] uppercase tracking-wider text-[#d97757]/60">
                    Delegate to {peerLabel(selectedPeer)}&apos;s Claude Code
                  </div>
                  <div className="mt-1 text-[10px] text-white/30">
                    Permissions: {ROLE_PERMISSIONS[getPeerRoles(selectedPeer)[0] ?? "builder"]?.slice(0, 3).join(", ")}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <input
                      value={delegateTask}
                      onChange={(e) => setDelegateTask(e.target.value)}
                      placeholder="e.g. Set up git, create new branch, install deps..."
                      className="flex-1 rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-1.5 text-xs text-white/70 placeholder:text-white/20 focus:border-[#d97757]/30 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (!delegateTask.trim()) return;
                        const roles = getPeerRoles(selectedPeer);
                        const shaped = shapeDelegationForRole(roles, delegateTask, "Team coordination via NodeBench");
                        try {
                          const { SHARED_CONTEXT_API_BASE } = await import("@/lib/syncBridgeApi");
                          await fetch(`${SHARED_CONTEXT_API_BASE}/message`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              fromPeerId: currentPeerId,
                              toPeerId: selectedPeer,
                              content: shaped.formattedTask + (shaped.onboardingSteps ? "\n\nOnboarding steps:\n" + shaped.onboardingSteps.map((s, i) => `${i + 1}. ${s}`).join("\n") : ""),
                              messageType: "request",
                            }),
                          });
                        } catch {
                          // silent
                        }
                        setDelegateTask("");
                        setShowDelegatePanel(false);
                        refresh();
                      }}
                      disabled={!delegateTask.trim()}
                      className="rounded-md bg-[#d97757] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#c86747] disabled:opacity-30"
                    >
                      Send
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Messages — Slack-style */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
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
                <div className="space-y-4">
                  {peerMessages
                    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                    .map((msg, i, arr) => {
                      const isOwn = msg.fromPeerId === currentPeerId;
                      const isAgent = msg.fromPeerId.includes("agent");
                      const senderName = peerLabel(msg.fromPeerId);
                      const senderRoles = msg.roles ?? getPeerRoles(msg.fromPeerId);
                      const ts = new Date(msg.timestamp);
                      const timeStr = ts.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

                      // Group consecutive messages from same sender (Slack-style)
                      const prevMsg = i > 0 ? arr[i - 1] : null;
                      const sameSender = prevMsg?.fromPeerId === msg.fromPeerId;
                      const closeInTime = prevMsg
                        ? ts.getTime() - new Date(prevMsg.timestamp).getTime() < 300_000
                        : false;
                      const showHeader = !sameSender || !closeInTime;

                      return (
                        <div
                          key={msg.id}
                          className={cn(
                            "group",
                            showHeader ? "pt-2" : "pt-0",
                            isAgent && "border-l-2 border-blue-500/30 pl-3",
                          )}
                        >
                          {showHeader && (
                            <div className="mb-1 flex items-center gap-2">
                              {/* Avatar */}
                              <div className={cn(
                                "flex h-7 w-7 shrink-0 items-center justify-center rounded text-[10px] font-bold",
                                isOwn ? "bg-[#d97757]/20 text-[#d97757]" : isAgent ? "bg-blue-500/20 text-blue-400" : "bg-white/10 text-white/50",
                              )}>
                                {isAgent ? "AI" : senderName.charAt(0).toUpperCase()}
                              </div>
                              {/* Name + roles + time */}
                              <span className={cn("text-sm font-semibold", isOwn ? "text-[#d97757]" : isAgent ? "text-blue-400" : "text-white/70")}>
                                {isAgent ? `${senderName} (Agent)` : senderName}
                              </span>
                              {senderRoles.map((role) => (
                                <span key={role} className={cn("rounded border px-1 py-0 text-[7px] font-medium", ROLE_CONFIG[role]?.color ?? "text-white/30 bg-white/5 border-white/10")}>
                                  {ROLE_CONFIG[role]?.label ?? role}
                                </span>
                              ))}
                              <span className="text-[10px] text-white/20">{timeStr}</span>
                            </div>
                          )}
                          {/* Message body */}
                          <div className={cn("text-sm leading-relaxed text-white/60", showHeader ? "ml-9" : "ml-9")}>
                            {msg.content.startsWith("[AGENT]") || msg.content.startsWith("[BUILDER TASK]") || msg.content.startsWith("[TASK]") ? (
                              <pre className="whitespace-pre-wrap rounded-md bg-black/30 px-3 py-2 font-mono text-xs text-white/50">
                                {msg.content}
                              </pre>
                            ) : (
                              <p>{msg.content}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
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
