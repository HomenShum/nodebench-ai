/**
 * TaskDelegationCard — Task lifecycle: propose → accept → complete.
 * Status-grouped list with approval actions.
 */

import { ArrowRight, Check, X, AlertTriangle, Clock, Send } from "lucide-react";
import type { SharedContextTask, TaskStatus } from "../../types/sharedContext";

function statusBadge(status: TaskStatus) {
  const map: Record<TaskStatus, { label: string; cls: string }> = {
    proposed: { label: "Proposed", cls: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
    accepted: { label: "In Progress", cls: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
    completed: { label: "Done", cls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
    rejected: { label: "Rejected", cls: "bg-white/5 text-white/30 border-white/10" },
    escalated: { label: "Escalated", cls: "bg-accent-primary/20 text-accent-primary border-accent-primary/30" },
  };
  const s = map[status];
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${s.cls}`}>
      {s.label}
    </span>
  );
}

function statusIcon(status: TaskStatus) {
  switch (status) {
    case "proposed": return <Clock className="h-3.5 w-3.5 text-amber-400" />;
    case "accepted": return <Send className="h-3.5 w-3.5 text-blue-400" />;
    case "completed": return <Check className="h-3.5 w-3.5 text-emerald-400" />;
    case "rejected": return <X className="h-3.5 w-3.5 text-white/30" />;
    case "escalated": return <AlertTriangle className="h-3.5 w-3.5 text-accent-primary" />;
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
  tasks: SharedContextTask[];
  onAccept?: (taskId: string) => void;
  onReject?: (taskId: string) => void;
  onComplete?: (taskId: string) => void;
}

const STATUS_ORDER: TaskStatus[] = ["proposed", "accepted", "escalated", "completed", "rejected"];

export function TaskDelegationCard({ tasks, onAccept, onReject, onComplete }: Props) {
  const grouped = STATUS_ORDER.reduce<Record<TaskStatus, SharedContextTask[]>>((acc, status) => {
    acc[status] = tasks.filter((t) => t.status === status);
    return acc;
  }, {} as Record<TaskStatus, SharedContextTask[]>);

  const openCount = (grouped.proposed?.length ?? 0) + (grouped.accepted?.length ?? 0);

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[11px] uppercase tracking-[0.2em] text-white/40">
          Tasks
        </h3>
        {openCount > 0 && (
          <span className="text-xs font-medium text-accent-primary">{openCount} open</span>
        )}
      </div>

      <div className="space-y-1.5" role="list" aria-label="Delegated tasks">
        {STATUS_ORDER.flatMap((status) =>
          grouped[status].map((task) => (
            <div
              key={task.taskId}
              className="rounded-lg border border-white/[0.04] bg-white/[0.01] px-3 py-2.5"
              role="listitem"
            >
              <div className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0">{statusIcon(task.status)}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white/70">{task.description || task.taskType}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-white/30">
                    <span className="font-mono">{peerLabel(task.proposerPeerId)}</span>
                    <ArrowRight className="h-2.5 w-2.5" />
                    <span className="font-mono">{peerLabel(task.assigneePeerId)}</span>
                    {task.createdAt && <span>{relativeTime(task.createdAt)}</span>}
                  </div>
                  {task.reason && (
                    <p className="mt-1 text-[10px] italic text-white/25">{task.reason}</p>
                  )}
                </div>
                {statusBadge(task.status)}
              </div>

              {/* Action buttons for proposed tasks */}
              {task.status === "proposed" && (onAccept || onReject) && (
                <div className="mt-2 flex gap-2 pl-6">
                  {onAccept && (
                    <button
                      onClick={() => onAccept(task.taskId)}
                      className="rounded-md bg-emerald-500/20 px-3 py-1 text-[10px] font-medium text-emerald-300 transition-colors hover:bg-emerald-500/30"
                      type="button"
                    >
                      Accept
                    </button>
                  )}
                  {onReject && (
                    <button
                      onClick={() => onReject(task.taskId)}
                      className="rounded-md bg-white/5 px-3 py-1 text-[10px] font-medium text-white/40 transition-colors hover:bg-white/10"
                      type="button"
                    >
                      Reject
                    </button>
                  )}
                </div>
              )}

              {/* Complete button for accepted tasks */}
              {task.status === "accepted" && onComplete && (
                <div className="mt-2 pl-6">
                  <button
                    onClick={() => onComplete(task.taskId)}
                    className="rounded-md bg-blue-500/20 px-3 py-1 text-[10px] font-medium text-blue-300 transition-colors hover:bg-blue-500/30"
                    type="button"
                  >
                    Mark Complete
                  </button>
                </div>
              )}
            </div>
          )),
        )}

        {tasks.length === 0 && (
          <p className="py-4 text-center text-xs text-white/30">
            No tasks delegated yet
          </p>
        )}
      </div>
    </div>
  );
}
