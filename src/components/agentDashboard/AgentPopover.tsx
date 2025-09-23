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
        <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-[var(--border-color)] text-[11px]">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Status</div>
            <div className="font-semibold capitalize text-[var(--text-primary)]">{status}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Progress</div>
            <div className="font-semibold text-[var(--text-primary)]">{Number.isFinite(progressPct) ? `${progressPct}%` : "—"}</div>
          </div>
        </div>
      </div>
    </div>,
    portalRoot
  );
}

