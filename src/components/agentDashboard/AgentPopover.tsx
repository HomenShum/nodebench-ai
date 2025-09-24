import React, { useEffect, useMemo, useRef } from "react";
import ReactDOM from "react-dom";

export default function AgentPopover({
  isOpen,
  anchorEl,
  agent,
  onClose,
}: {
  isOpen: boolean;
  anchorEl: HTMLElement | null;
  agent: any | null;
  onClose: () => void;
}) {
  const portalRoot = useMemo(() => {
    if (typeof window === "undefined") return null;
    let el = document.getElementById("agent-popover-portal");
    if (!el) {
      el = document.createElement("div");
      el.id = "agent-popover-portal";
      document.body.appendChild(el);
    }
    return el;
  }, []);

  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const rect = anchorEl?.getBoundingClientRect();
  const top = (rect?.bottom ?? 0) + 8;
  const left = Math.min(
    Math.max(8, (rect?.left ?? 8)),
    Math.max(8, window.innerWidth - 320)
  );

  if (!isOpen || !portalRoot || !agent) return null;

  const status = String(agent?.status ?? "pending");
  const progressPct = Math.round(Number(agent?.progress ?? 0) * 100) || (typeof agent?.progress === 'number' ? Math.round(agent.progress) : 0);

  const badgeClass =
    String(agent?.agentType ?? agent?.type) === "orchestrator"
      ? "badge-orchestrator"
      : String(agent?.agentType ?? agent?.type) === "main"
      ? "badge-main"
      : "badge-leaf";

  return ReactDOM.createPortal(
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="false"
      className="fixed z-[1000] min-w-[300px] rounded-xl border border-[var(--border-color)] bg-white shadow-2xl"
      style={{ top, left }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border-color)]">
        <div className="w-6 h-6 rounded-md grid place-items-center bg-[var(--bg-secondary)] border border-[var(--border-color)]">
          <span>{agent?.icon ?? "🧩"}</span>
        </div>
        <div className="text-sm font-semibold truncate" title={String(agent?.name ?? agent?.title ?? "Agent")}>
          {String(agent?.name ?? agent?.title ?? "Agent")}
        </div>
        <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full border ${
          badgeClass === "badge-orchestrator"
            ? "bg-indigo-50 text-indigo-600 border-indigo-200"
            : badgeClass === "badge-main"
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : "bg-amber-50 text-amber-700 border-amber-200"
        }`}>
          {String(agent?.agentType ?? agent?.type ?? "agent").toUpperCase()}
        </span>
      </div>
      <div className="px-3 py-2 text-xs text-[var(--text-secondary)]">
        <div>
          {String(agent?.agentType ?? agent?.type) === "orchestrator"
            ? "Coordinating all research agents and managing workflow execution."
            : String(agent?.agentType ?? agent?.type) === "main"
            ? "Managing specialized sub-agents for focused research tasks."
            : "Executing specific data collection and analysis tasks."}
        </div>
        {(() => {
          const dur = Number((agent as any)?.durationMs ?? 0);
          const elapsed = Number((agent as any)?.elapsedMs ?? ((agent as any)?.progress ? Number((agent as any)?.progress) * dur : 0));
          const etaSec = Math.max(0, Math.ceil((dur - elapsed) / 1000));
          const inTok = Number((agent as any)?.inputTokens ?? 0);
          const outTok = Number((agent as any)?.outputTokens ?? 0);
          const outSz = Number((agent as any)?.outputSizeBytes ?? 0);
          return (
            <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-[var(--border-color)] text-[11px]">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Status</div>
                <div className="font-semibold capitalize text-[var(--text-primary)]">{status}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Progress</div>
                <div className="font-semibold text-[var(--text-primary)]">{Number.isFinite(progressPct) ? `${progressPct}%` : "—"}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">ETA</div>
                <div className="font-semibold text-[var(--text-primary)]">{etaSec}s</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Elapsed</div>
                <div className="font-semibold text-[var(--text-primary)]">{Math.max(0, Math.floor(elapsed/1000))}s</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Tokens</div>
                <div className="font-semibold text-[var(--text-primary)]">{inTok}/{outTok}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Output size</div>
                <div className="font-semibold text-[var(--text-primary)]">{outSz} B</div>
              </div>
            </div>
          );
        })()}

        <div className="mt-3 flex items-center gap-2">
          <button
            className="px-2 py-1 rounded border border-[var(--border-color)] bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)]"
            onClick={() => {
              const action = String(status).toLowerCase() === 'running' ? 'pause' : 'resume';
              window.dispatchEvent(new CustomEvent('agents:taskAction', { detail: { action, task: agent } }));
            }}
          >{String(status).toLowerCase() === 'running' ? 'Pause' : 'Resume'}</button>
          <button
            className="px-2 py-1 rounded border border-[var(--border-color)] bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)]"
            onClick={() => window.dispatchEvent(new CustomEvent('agents:taskAction', { detail: { action: 'rerun', task: agent } }))}
          >Re-run</button>
          <button
            className="px-2 py-1 rounded border border-[var(--border-color)] bg-white hover:bg-[var(--bg-secondary)]"
            onClick={() => window.dispatchEvent(new CustomEvent('agents:openFullView', { detail: { task: agent } }))}
          >Open Full View</button>
        </div>
      </div>
    </div>,
    portalRoot
  );
}

