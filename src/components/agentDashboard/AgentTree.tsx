import React, { useEffect, useMemo, useState } from "react";

export type AgentType = "orchestrator" | "main" | "leaf";
export type Status = "pending" | "running" | "complete" | "error";

const extractElapsedMs = (task: any): number => {
  const candidates = [
    (task as any)?.elapsedMs,
    (task as any)?.metrics?.elapsedMs,
    (task as any)?.metrics?.latencyMs,
    (task as any)?.meta?.elapsedMs,
    (task as any)?.latencyMs,
    (task as any)?.stats?.elapsedMs,
  ];
  for (const candidate of candidates) {
    const ms = Number(candidate);
    if (Number.isFinite(ms) && ms > 0) return ms;
  }
  return 0;
};

const formatDurationShort = (ms: number): string => {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (hours > 0) {
    if (minutes === 0 && seconds === 0) return `${hours}h`;
    if (seconds === 0) return `${hours}h ${minutes}m`;
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    if (seconds === 0) return `${minutes}m`;
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
};

export type TaskNode = {
  id: string;
  parentId: string | null;
  name: string;
  agentType: AgentType;
  startOffsetMs: number;
  durationMs: number;
  elapsedMs?: number;
  startedAtMs?: number;
  completedAtMs?: number;
  finishedAtMs?: number;
  progress?: number;
  metrics?: { elapsedMs?: number; latencyMs?: number };
  meta?: { elapsedMs?: number };
  latencyMs?: number;
  stats?: { elapsedMs?: number };
  status?: Status;
};

type AgentTreeProps = {
  nodes: TaskNode[];
  rootId?: string | null;
  onRowClick?: (id: string) => void;
  className?: string;
  renderMini?: (node: TaskNode) => React.ReactNode;
};

export default function AgentTree({
  nodes,
  rootId: rootIdProp,
  onRowClick,
  className,
  renderMini,
}: AgentTreeProps) {
  const safeNodes = nodes ?? [];
  const byId = useMemo(() => new Map(safeNodes.map((n) => [n.id, n])), [safeNodes]);

  const root = useMemo(() => {
    if (rootIdProp && byId.get(rootIdProp)) return byId.get(rootIdProp)!;
    const explicitRoot =
      safeNodes.find((n) => n.agentType === "orchestrator") ??
      safeNodes.find((n) => n.parentId === null) ??
      safeNodes[0] ?? null;
    return explicitRoot;
  }, [byId, safeNodes, rootIdProp]);

  const children = useMemo(() => {
    const m = new Map<string, TaskNode[]>();
    for (const n of safeNodes) {
      if (!n.parentId) continue;
      if (!m.has(n.parentId)) m.set(n.parentId, []);
      m.get(n.parentId)!.push(n);
    }
    for (const [k, arr] of m.entries()) {
      arr.sort((a, b) => {
        const rank = (t: AgentType) => (t === "orchestrator" ? 0 : t === "main" ? 1 : 2);
        const r = rank(a.agentType) - rank(b.agentType);
        return r !== 0 ? r : a.name.localeCompare(b.name);
      });
      m.set(k, arr);
    }
    return m;
  }, [safeNodes]);

  const orchestratorDuration = (root && root.durationMs > 0) ? root.durationMs : Math.max(1, sumDurations(safeNodes));
  const mainIds = useMemo(() => {
    if (!root) return [] as string[];
    const arr = (children.get(root.id) ?? [])
      .filter((n) => n.agentType === "main")
      .map((n) => n.id);
    return arr;
  }, [children, root]);

  // Expansion model
  const [rootExpanded, setRootExpanded] = useState(true);
  const [expandedMain, setExpandedMain] = useState<Record<string, boolean>>({});

  // Keep new mains expanded by default when root is expanded
  useEffect(() => {
    if (!rootExpanded) return;
    setExpandedMain((prev) => {
      let changed = false;
      const next = { ...prev } as Record<string, boolean>;
      for (const id of mainIds) {
        if (next[id] === undefined) {
          next[id] = true;
          changed = true;
        }
      }
      for (const k of Object.keys(next)) {
        if (!mainIds.includes(k)) {
          delete next[k];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [rootExpanded, mainIds]);

  function toggleRoot() {
    if (rootExpanded) {
      setRootExpanded(false);
      setExpandedMain({});
    } else {
      setRootExpanded(true);
      const allOpen: Record<string, boolean> = {};
      for (const id of mainIds) allOpen[id] = true;
      setExpandedMain(allOpen);
    }
  }


  function toggleMain(id: string) {
    setExpandedMain((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div className={className ?? "flex-1 min-h-0"}>
      <div className="tree-view">
        {/* Level 0 — Orchestrator row */}
        {root && (
          <TreeRow
            node={root}
            depth={0}
            hasChevron={true}
            expanded={rootExpanded}
            onToggle={toggleRoot}
            orchestratorDuration={orchestratorDuration}
            onRowClick={onRowClick}
            renderMini={renderMini}
          />
        )}

        {/* Level 1 — Main agents */}
        {rootExpanded && root &&
          (children.get(root.id) ?? [])
            .filter((n) => n.agentType === "main")
            .map((main) => {
              const leaves = (children.get(main.id) ?? []).filter((n) => n.agentType === "leaf");
              const hasLeaves = leaves.length > 0;
              return (
                <React.Fragment key={main.id}>
                  <TreeRow
                    node={main}
                    depth={1}
                    hasChevron={hasLeaves}
                    expanded={!!expandedMain[main.id]}
                    onToggle={() => toggleMain(main.id)}
                    orchestratorDuration={orchestratorDuration}
                    onRowClick={onRowClick}
                    renderMini={renderMini}
                  />
                  {hasLeaves && expandedMain[main.id] && (
                    <div className="pl-6 border-l border-[var(--border-color)] ml-3">
                      {leaves.map((leaf) => (
                        <TreeRow
                          key={leaf.id}
                          node={leaf}
                          depth={2}
                          hasChevron={false}
                          expanded={false}
                          orchestratorDuration={orchestratorDuration}
                          onRowClick={onRowClick}
                          renderMini={renderMini}
                        />
                      ))}
                    </div>
                  )}
                </React.Fragment>
              );
            })}
      </div>
    </div>
  );
}

function TreeRow(props: {
  node: TaskNode;
  depth: number;
  hasChevron: boolean;
  expanded: boolean;
  onToggle?: () => void;
  orchestratorDuration: number;
  onRowClick?: (id: string) => void;
  renderMini?: (node: TaskNode) => React.ReactNode;
}) {
  const { node, depth, hasChevron, expanded, onToggle, orchestratorDuration, onRowClick, renderMini } = props;

  const status = String(node.status ?? 'pending').toLowerCase();
  const elapsedMs = extractElapsedMs(node);
  const startedAtMs = Number((node as any).startedAtMs ?? 0);
  const completedAtMs = Number((node as any).completedAtMs ?? (node as any).finishedAtMs ?? 0);
  const nowMs = typeof window !== 'undefined' ? Date.now() : 0;
  const runtimeCandidates: number[] = [];
  if (elapsedMs > 0) runtimeCandidates.push(elapsedMs);
  if (status === 'complete' || status === 'error') {
    if (startedAtMs && completedAtMs && completedAtMs > startedAtMs) runtimeCandidates.push(completedAtMs - startedAtMs);
  } else if (status === 'running') {
    if (startedAtMs) runtimeCandidates.push(Math.max(0, nowMs - startedAtMs));
    if (node.durationMs > 0 && typeof (node as any).progress === 'number' && (node as any).progress > 0) {
      runtimeCandidates.push(Math.max(0, (node as any).progress * node.durationMs));
    }
  }
  const runtimeMs = runtimeCandidates.length ? Math.max(...runtimeCandidates) : null;
  const runtimeLabel = runtimeMs !== null
    ? formatDurationShort(runtimeMs)
    : (node.durationMs > 0 ? formatDurationShort(node.durationMs) : '—');

  const leftPct = clampPct((node.startOffsetMs / Math.max(1, orchestratorDuration)) * 100);
  const widthPct = clampPct((node.durationMs / Math.max(1, orchestratorDuration)) * 100);

  return (
    <div className={`tree-node ${node.agentType}`} style={{ marginLeft: depth * 8 }} data-level={depth} data-type={node.agentType}>
      <div className="node-header flex items-center gap-2 py-1">
        {hasChevron ? (
          <button
            type="button"
            className="expand-btn text-xs px-2 py-0.5 border rounded"
            aria-expanded={expanded}
            aria-label={expanded ? "Collapse" : "Expand"}
            onClick={onToggle}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onToggle?.();
              }
            }}
          >
            <span className={`inline-block transition-transform ${expanded ? "rotate-0" : "-rotate-90"}`}>▼</span>
          </button>
        ) : (
          <span className="w-6" />
        )}

        <button className="task-card-inline flex-1 text-left" onClick={() => onRowClick?.(node.id)}>
          <div className="task-card relative overflow-hidden rounded-md border border-[var(--border-color)] bg-[var(--bg-elev)] p-2" role="button" tabIndex={0}>
            <div className="task-header flex items-center justify-between gap-3">
              <div className="task-title flex items-center gap-2 min-w-0">
                <span className="task-icon">👤</span>
                <span className="truncate">{node.name}</span>
                <span className="agent-type-badge text-[10px] px-1.5 py-0.5 rounded border border-[var(--border-color)]" title="Agent type">
                  {node.agentType}
                </span>
              </div>
              <div className="task-meta flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                <div className="task-status inline-flex items-center gap-1">
                  <span className={`status-dot ${status}`} />
                  <span className="capitalize">{status}</span>
                </div>
                <span className="muted">{runtimeLabel}</span>
              </div>
            </div>
            {renderMini ? (
              <>{renderMini(node)}</>
            ) : (
              <div className="mini-timeline relative h-4 mt-2 rounded bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                <div className="mini-execution-bar absolute top-0 bottom-0 border" style={{ left: `${leftPct}%`, width: `${widthPct}%`, opacity: 0.9 }} />
              </div>
            )}
          </div>
        </button>
      </div>
    </div>
  );
}

function clampPct(n: number): number {
  if (!isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function sumDurations(nodes: TaskNode[]): number {
  return nodes.reduce((acc, n) => acc + Math.max(0, n.durationMs || 0), 0);
}

