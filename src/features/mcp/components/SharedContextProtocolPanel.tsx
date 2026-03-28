import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { Boxes, Link2, Mail, RefreshCw, RotateCcw, Search, Users } from "lucide-react";

import { getSharedContextEventsUrl, getSharedContextSnapshotUrl } from "@/lib/syncBridgeApi";

type SharedContextSnapshot = {
  peers: Array<{
    peerId: string;
    product: string;
    workspaceId?: string | null;
    surface: string;
    role: string;
    capabilities: string[];
    contextScopes: string[];
    status: string;
    summary: {
      currentTask?: string;
      focusEntity?: string;
      currentState?: string;
    };
    lastHeartbeatAt: string;
  }>;
  recentPackets: Array<{
    contextId: string;
    contextType: string;
    producerPeerId: string;
    subject: string;
    summary: string;
    status: string;
    confidence?: number;
    scope: string[];
    nextActions: string[];
  }>;
  recentTasks: Array<{
    taskId: string;
    taskType: string;
    proposerPeerId: string;
    assigneePeerId: string;
    status: string;
    outputContextId?: string | null;
  }>;
  recentMessages: Array<{
    messageId: string;
    fromPeerId: string;
    toPeerId: string;
    messageClass: string;
    status: string;
  }>;
  counts: {
    activePeers: number;
    activePackets: number;
    invalidatedPackets: number;
    openTasks: number;
    unreadMessages: number;
  };
};

function formatWhen(value?: string | null): string {
  if (!value) return "Not yet";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-edge bg-surface-secondary/50 px-3 py-3">
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-content-muted">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-xl font-semibold text-content">{value}</div>
    </div>
  );
}

export function SharedContextProtocolPanel() {
  const [snapshot, setSnapshot] = useState<SharedContextSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [streamState, setStreamState] = useState<"connecting" | "live" | "fallback">("connecting");
  const STORAGE_KEY = "scp-panel-filters";

  const readSavedFilters = (): {
    workspace: string;
    peer: string;
    contextType: string;
    subject: string;
  } => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, string>;
        return {
          workspace: parsed.workspace ?? "",
          peer: parsed.peer ?? "",
          contextType: parsed.contextType ?? "",
          subject: parsed.subject ?? "",
        };
      }
    } catch {
      /* corrupted — ignore */
    }
    return { workspace: "", peer: "", contextType: "", subject: "" };
  };

  const saved = useRef(readSavedFilters()).current;
  const [workspaceFilter, setWorkspaceFilter] = useState(saved.workspace);
  const [peerFilter, setPeerFilter] = useState(saved.peer);
  const [contextTypeFilter, setContextTypeFilter] = useState(saved.contextType);
  const [subjectSearch, setSubjectSearch] = useState(saved.subject);

  // Persist filters to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          workspace: workspaceFilter,
          peer: peerFilter,
          contextType: contextTypeFilter,
          subject: subjectSearch,
        }),
      );
    } catch {
      /* quota exceeded — ignore */
    }
  }, [workspaceFilter, peerFilter, contextTypeFilter, subjectSearch]);

  const resetFilters = useCallback(() => {
    setWorkspaceFilter("");
    setPeerFilter("");
    setContextTypeFilter("");
    setSubjectSearch("");
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const hasActiveFilters = !!(workspaceFilter || peerFilter || contextTypeFilter || subjectSearch);

  // Generation counter to prevent stale closures from writing state.
  // Incremented each time the effect re-runs; old handlers compare their
  // captured generation against the ref and bail if mismatched.
  const generationRef = useRef(0);

  const load = useCallback(async (generation: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(getSharedContextSnapshotUrl({
        limit: 8,
        peerId: peerFilter.trim() || undefined,
        workspaceId: workspaceFilter.trim() || undefined,
        contextType: contextTypeFilter || undefined,
        subjectIncludes: subjectSearch.trim() || undefined,
      }));
      // Bail if a newer generation has started — prevents stale data overwrite
      if (generation !== generationRef.current) return;
      if (!response.ok) {
        throw new Error(`Shared context snapshot failed: HTTP ${response.status}`);
      }
      const json = (await response.json()) as { success: boolean; snapshot: SharedContextSnapshot };
      if (generation !== generationRef.current) return;
      setSnapshot(json.snapshot);
    } catch (loadError) {
      if (generation !== generationRef.current) return;
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      if (generation === generationRef.current) {
        setLoading(false);
      }
    }
  }, [contextTypeFilter, peerFilter, workspaceFilter, subjectSearch]);

  useEffect(() => {
    const generation = ++generationRef.current;

    void load(generation);
    const timer = window.setInterval(() => {
      if (generation === generationRef.current) {
        void load(generation);
      }
    }, 15000);

    if (typeof EventSource === "undefined") {
      setStreamState("fallback");
      return () => window.clearInterval(timer);
    }

    const source = new EventSource(getSharedContextEventsUrl({
      peerId: peerFilter.trim() || undefined,
      workspaceId: workspaceFilter.trim() || undefined,
      contextType: contextTypeFilter || undefined,
      subjectIncludes: subjectSearch.trim() || undefined,
      eventTypes: ["peer_registered", "peer_heartbeat", "packet_published", "packet_invalidated", "packet_acknowledged", "task_proposed", "task_status_changed", "message_sent"],
    }));
    source.addEventListener("shared_context", () => {
      if (generation !== generationRef.current) return;
      setStreamState("live");
      void load(generation);
    });
    source.onerror = () => {
      if (generation !== generationRef.current) return;
      setStreamState("fallback");
    };

    return () => {
      window.clearInterval(timer);
      source.close();
    };
  }, [contextTypeFilter, load, peerFilter, workspaceFilter, subjectSearch]);

  return (
    <section className="mb-6 nb-surface-card p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Boxes className="h-4 w-4 text-[var(--accent-primary)]" />
            <h2 className="text-base font-semibold text-content">
              Shared Context Protocol
            </h2>
          </div>
          <p className="mt-2 max-w-2xl text-sm text-content-secondary">
            Peer discovery, versioned context packets, direct messages, and task handoffs on top of the local-first MCP runtime.
          </p>
          <div className="mt-2 text-xs uppercase tracking-[0.16em] text-content-muted">
            {streamState === "live" ? "Live stream connected" : streamState === "connecting" ? "Connecting live stream" : "Polling fallback"}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 rounded-lg border border-edge bg-surface px-3 py-2 text-sm text-content-secondary transition hover:bg-surface-hover hover:text-content"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset filters
            </button>
          )}
          <button
            type="button"
            onClick={() => void load(generationRef.current)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-edge bg-surface px-3 py-2 text-sm text-content-secondary transition hover:bg-surface-hover hover:text-content"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-5">
        <Stat icon={<Users className="h-3.5 w-3.5" />} label="Active peers" value={snapshot?.counts.activePeers ?? 0} />
        <Stat icon={<Boxes className="h-3.5 w-3.5" />} label="Active packets" value={snapshot?.counts.activePackets ?? 0} />
        <Stat icon={<Link2 className="h-3.5 w-3.5" />} label="Invalidated" value={snapshot?.counts.invalidatedPackets ?? 0} />
        <Stat icon={<RefreshCw className="h-3.5 w-3.5" />} label="Open tasks" value={snapshot?.counts.openTasks ?? 0} />
        <Stat icon={<Mail className="h-3.5 w-3.5" />} label="Unread" value={snapshot?.counts.unreadMessages ?? 0} />
      </div>

      {loading && <div className="mt-4 text-sm text-content-secondary">Loading shared context snapshot...</div>}
      {error && <div className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</div>}

      <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-content-muted">Workspace</div>
          <input
            value={workspaceFilter}
            onChange={(event) => setWorkspaceFilter(event.target.value)}
            placeholder="workspace:nodebench..."
            className="mt-1 w-full rounded-lg border border-edge bg-surface px-3 py-2 text-sm text-content placeholder:text-content-muted"
          />
        </label>
        <label className="block">
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-content-muted">Peer</div>
          <input
            value={peerFilter}
            onChange={(event) => setPeerFilter(event.target.value)}
            placeholder="peer:web:control_plane"
            className="mt-1 w-full rounded-lg border border-edge bg-surface px-3 py-2 text-sm text-content placeholder:text-content-muted"
          />
        </label>
        <label className="block">
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-content-muted">Packet type</div>
          <select
            value={contextTypeFilter}
            onChange={(event) => setContextTypeFilter(event.target.value)}
            className="mt-1 w-full rounded-lg border border-edge bg-surface px-3 py-2 text-sm text-content"
          >
            <option value="">All packet types</option>
            <option value="entity_packet">entity_packet</option>
            <option value="workflow_packet">workflow_packet</option>
            <option value="trace_packet">trace_packet</option>
            <option value="judge_packet">judge_packet</option>
            <option value="environment_packet">environment_packet</option>
            <option value="failure_packet">failure_packet</option>
            <option value="state_snapshot_packet">state_snapshot_packet</option>
            <option value="verdict_packet">verdict_packet</option>
            <option value="scenario_packet">scenario_packet</option>
            <option value="change_packet">change_packet</option>
          </select>
        </label>
        <label className="block">
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-content-muted">
            <span className="inline-flex items-center gap-1"><Search className="h-3 w-3" /> Subject</span>
          </div>
          <input
            value={subjectSearch}
            onChange={(event) => setSubjectSearch(event.target.value)}
            placeholder="Search by keyword..."
            className="mt-1 w-full rounded-lg border border-edge bg-surface px-3 py-2 text-sm text-content placeholder:text-content-muted"
          />
        </label>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-edge bg-surface-secondary/40 p-4">
          <div className="text-sm font-semibold text-content">Peers</div>
          <div className="mt-3 space-y-3">
            {(snapshot?.peers ?? []).length === 0 ? (
              <div className="text-sm text-content-secondary">
                No peers have registered yet. Once local runtimes or role-specific workers announce themselves, they will show up here.
              </div>
            ) : (
              snapshot?.peers.map((peer) => (
                <div key={peer.peerId} className="rounded-xl border border-edge bg-surface px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium text-content">{peer.role} · {peer.surface}</div>
                    <div className="text-[11px] uppercase tracking-[0.16em] text-content-muted">{peer.status}</div>
                  </div>
                  <div className="mt-1 text-xs text-content-secondary">
                    {peer.product} · {peer.workspaceId ?? "local workspace"} · heartbeat {formatWhen(peer.lastHeartbeatAt)}
                  </div>
                  {peer.summary?.currentTask && (
                    <div className="mt-2 text-sm text-content-secondary">
                      {peer.summary.currentTask}
                    </div>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {peer.capabilities.slice(0, 4).map((capability) => (
                      <span key={capability} className="rounded-full border border-edge bg-surface-secondary px-2.5 py-1 text-[11px] text-content-secondary">
                        {capability}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-edge bg-surface-secondary/40 p-4">
          <div className="text-sm font-semibold text-content">Recent packets</div>
          <div className="mt-3 space-y-3">
            {(snapshot?.recentPackets ?? []).length === 0 ? (
              <div className="text-sm text-content-secondary">
                No shared packets yet. Publish structured packets here instead of passing free-form text between peers.
              </div>
            ) : (
              snapshot?.recentPackets.map((packet) => (
                <div key={packet.contextId} className="rounded-xl border border-edge bg-surface px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium text-content">{packet.subject}</div>
                    <div className="text-[11px] uppercase tracking-[0.16em] text-content-muted">{packet.status}</div>
                  </div>
                  <div className="mt-1 text-xs text-content-secondary">
                    {packet.contextType} · {packet.producerPeerId}
                    {typeof packet.confidence === "number" ? ` · ${(packet.confidence * 100).toFixed(0)}% confidence` : ""}
                  </div>
                  <div className="mt-2 text-sm text-content-secondary">{packet.summary}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {packet.scope.slice(0, 4).map((scope) => (
                      <span key={scope} className="rounded-full border border-edge bg-surface-secondary px-2.5 py-1 text-[11px] text-content-secondary">
                        {scope}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-edge bg-surface-secondary/40 p-4">
          <div className="text-sm font-semibold text-content">Task handoffs</div>
          <div className="mt-3 space-y-3">
            {(snapshot?.recentTasks ?? []).length === 0 ? (
              <div className="text-sm text-content-secondary">No shared tasks yet.</div>
            ) : (
              snapshot?.recentTasks.map((task) => (
                <div key={task.taskId} className="rounded-xl border border-edge bg-surface px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium text-content">{task.taskType}</div>
                    <div className="text-[11px] uppercase tracking-[0.16em] text-content-muted">{task.status}</div>
                  </div>
                  <div className="mt-1 text-xs text-content-secondary">
                    {task.proposerPeerId} {"->"} {task.assigneePeerId}
                  </div>
                  {task.outputContextId && (
                    <div className="mt-2 text-xs text-content-secondary">
                      Output: {task.outputContextId}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-edge bg-surface-secondary/40 p-4">
          <div className="text-sm font-semibold text-content">Direct messages</div>
          <div className="mt-3 space-y-3">
            {(snapshot?.recentMessages ?? []).length === 0 ? (
              <div className="text-sm text-content-secondary">No direct peer messages yet.</div>
            ) : (
              snapshot?.recentMessages.map((message) => (
                <div key={message.messageId} className="rounded-xl border border-edge bg-surface px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium text-content">{message.messageClass}</div>
                    <div className="text-[11px] uppercase tracking-[0.16em] text-content-muted">{message.status}</div>
                  </div>
                  <div className="mt-1 text-xs text-content-secondary">
                    {message.fromPeerId} {"->"} {message.toPeerId}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
