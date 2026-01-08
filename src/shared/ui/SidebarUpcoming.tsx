import React, { useState, useRef, useCallback } from "react";
import AgendaMiniRow from "@features/calendar/components/agenda/AgendaMiniRow";
import MiniEditorPopover from "@/shared/components/MiniEditorPopover";
import type { Id } from "../../../convex/_generated/dataModel";

export interface SidebarUpcomingProps {
  // Hook shape can evolve; keep it permissive to avoid churn.
  upcoming: any;
  onOpenDocument?: (documentId: Id<"documents">) => void;
}

/**
 * TaskCountBadge - Interactive badge showing task count with hover preview
 */
function TaskCountBadge({
  taskCount,
  eventCount,
  tasks,
  onTaskClick,
}: {
  taskCount: number;
  eventCount: number;
  tasks: any[];
  onTaskClick?: (taskId: string) => void;
}) {
  const [showPreview, setShowPreview] = useState(false);
  const badgeRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = useCallback(() => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => setShowPreview(true), 200);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => setShowPreview(false), 150);
  }, []);

  const totalItems = taskCount + eventCount;
  const hasItems = totalItems > 0;

  return (
    <div className="relative" ref={badgeRef}>
      <div
        className={`text-[11px] text-[var(--text-secondary)] cursor-pointer transition-colors ${
          hasItems ? "hover:text-[var(--text-primary)]" : ""
        }`}
        onMouseEnter={hasItems ? handleMouseEnter : undefined}
        onMouseLeave={hasItems ? handleMouseLeave : undefined}
        onClick={() => hasItems && setShowPreview((prev) => !prev)}
      >
        {totalItems} item{totalItems !== 1 ? "s" : ""}
        {taskCount > 0 && (
          <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 rounded-full dark:bg-amber-900/30 dark:text-amber-300">
            {taskCount} task{taskCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Hover preview popover */}
      {showPreview && tasks.length > 0 && (
        <div
          className="absolute right-0 top-full mt-2 z-50 w-64 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="px-3 py-2 bg-[var(--bg-secondary)] border-b border-[var(--border-color)]">
            <div className="text-xs font-medium text-[var(--text-primary)]">
              Tasks Due Today
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {tasks.slice(0, 5).map((task: any) => (
              <div
                key={task._id}
                className="px-3 py-2 hover:bg-[var(--bg-hover)] cursor-pointer border-b border-[var(--border-color)] last:border-b-0"
                onClick={() => onTaskClick?.(String(task._id))}
              >
                <div className="text-sm text-[var(--text-primary)] line-clamp-1">
                  {task.title || "Untitled Task"}
                </div>
                {task.dueDate && (
                  <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
                    Due {new Date(task.dueDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                )}
              </div>
            ))}
            {tasks.length > 5 && (
              <div className="px-3 py-2 text-[10px] text-[var(--text-muted)] text-center bg-[var(--bg-secondary)]">
                +{tasks.length - 5} more task{tasks.length - 5 !== 1 ? "s" : ""}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function SidebarUpcoming({ upcoming, onOpenDocument }: SidebarUpcomingProps) {
  const [lastClickedId, setLastClickedId] = useState<string | null>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [editTarget, setEditTarget] = useState<
    | { kind: "event"; id: string }
    | { kind: "task"; id: string }
    | null
  >(null);
  const [editAnchorEl, setEditAnchorEl] = useState<HTMLElement | null>(null);

  const handleOpenDocument = (documentId: Id<"documents">) => {
    if (onOpenDocument) {
      onOpenDocument(documentId);
    }
  };

  const handleTaskBadgeClick = useCallback((taskId: string) => {
    // Find the task element and trigger click
    const el = document.querySelector(`[data-agenda-mini-row][data-task-id="${taskId}"]`);
    if (el) {
      (el as HTMLElement).click();
    }
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">Today</div>
          <TaskCountBadge
            taskCount={upcoming?.counts?.todayTasks ?? 0}
            eventCount={upcoming?.counts?.todayEvents ?? 0}
            tasks={upcoming?.today?.tasks ?? []}
            onTaskClick={handleTaskBadgeClick}
          />
        </div>
        <div className="space-y-1">
          {upcoming?.today?.holidays?.map((h: any, i: number) => (
            <AgendaMiniRow key={`h_${i}`} item={h} kind="holiday" />
          ))}
          {upcoming?.today?.events?.map((e: any) => (
            <AgendaMiniRow
              key={`e_${String(e?._id)}`}
              item={e}
              kind="event"
              onSelect={(id) => {
                const idStr = String(id);
                if (lastClickedId === `event_${idStr}`) {
                  // Double-click: navigate to full document
                  if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
                  setLastClickedId(null);
                  setEditTarget(null);
                  setEditAnchorEl(null);
                  if (e.documentId) {
                    handleOpenDocument(e.documentId as Id<"documents">);
                  }
                } else {
                  // First click: show mini popover
                  setLastClickedId(`event_${idStr}`);
                  const el = document.querySelector(`[data-agenda-mini-row][data-event-id="${idStr}"]`);
                  setEditAnchorEl(el as HTMLElement);
                  setEditTarget({ kind: "event", id: idStr });
                  if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
                  clickTimeoutRef.current = setTimeout(() => setLastClickedId(null), 300);
                }
              }}
            />
          ))}
          {upcoming?.today?.tasks?.map((t: any) => (
            <AgendaMiniRow
              key={`t_${String(t?._id)}`}
              item={t}
              kind="task"
              showCheckbox
              onSelect={(id) => {
                const idStr = String(id);
                if (lastClickedId === `task_${idStr}`) {
                  // Double-click: navigate to full document
                  if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
                  setLastClickedId(null);
                  setEditTarget(null);
                  setEditAnchorEl(null);
                  if (t.documentId) {
                    handleOpenDocument(t.documentId as Id<"documents">);
                  }
                } else {
                  // First click: show mini popover
                  setLastClickedId(`task_${idStr}`);
                  const el = document.querySelector(`[data-agenda-mini-row][data-task-id="${idStr}"]`);
                  setEditAnchorEl(el as HTMLElement);
                  setEditTarget({ kind: "task", id: idStr });
                  if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
                  clickTimeoutRef.current = setTimeout(() => setLastClickedId(null), 300);
                }
              }}
            />
          ))}
          {!((upcoming?.today?.holidays?.length ?? 0) || (upcoming?.today?.events?.length ?? 0) || (upcoming?.today?.tasks?.length ?? 0)) && (
            <div className="text-sm text-[var(--text-secondary)]">Nothing scheduled.</div>
          )}
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">This Week</div>
          <TaskCountBadge
            taskCount={upcoming?.counts?.weekTasks ?? 0}
            eventCount={upcoming?.counts?.weekEvents ?? 0}
            tasks={upcoming?.sevenDays?.tasks ?? []}
            onTaskClick={handleTaskBadgeClick}
          />
        </div>
        <div className="space-y-1">
          {upcoming?.sevenDays?.holidays?.map((h: any, i: number) => (
            <AgendaMiniRow key={`wh_${i}`} item={h} kind="holiday" />
          ))}
          {upcoming?.sevenDays?.events?.map((e: any) => (
            <AgendaMiniRow
              key={`we_${String(e?._id)}`}
              item={e}
              kind="event"
              onSelect={(id) => {
                const idStr = String(id);
                if (lastClickedId === `event_${idStr}`) {
                  // Double-click: navigate to full document
                  if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
                  setLastClickedId(null);
                  setEditTarget(null);
                  setEditAnchorEl(null);
                  if (e.documentId) {
                    handleOpenDocument(e.documentId as Id<"documents">);
                  }
                } else {
                  // First click: show mini popover
                  setLastClickedId(`event_${idStr}`);
                  const el = document.querySelector(`[data-agenda-mini-row][data-event-id="${idStr}"]`);
                  setEditAnchorEl(el as HTMLElement);
                  setEditTarget({ kind: "event", id: idStr });
                  if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
                  clickTimeoutRef.current = setTimeout(() => setLastClickedId(null), 300);
                }
              }}
            />
          ))}
          {upcoming?.sevenDays?.tasks?.map((t: any) => (
            <AgendaMiniRow
              key={`wt_${String(t?._id)}`}
              item={t}
              kind="task"
              showCheckbox
              onSelect={(id) => {
                const idStr = String(id);
                if (lastClickedId === `task_${idStr}`) {
                  // Double-click: navigate to full document
                  if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
                  setLastClickedId(null);
                  setEditTarget(null);
                  setEditAnchorEl(null);
                  if (t.documentId) {
                    handleOpenDocument(t.documentId as Id<"documents">);
                  }
                } else {
                  // First click: show mini popover
                  setLastClickedId(`task_${idStr}`);
                  const el = document.querySelector(`[data-agenda-mini-row][data-task-id="${idStr}"]`);
                  setEditAnchorEl(el as HTMLElement);
                  setEditTarget({ kind: "task", id: idStr });
                  if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
                  clickTimeoutRef.current = setTimeout(() => setLastClickedId(null), 300);
                }
              }}
            />
          ))}
          {!((upcoming?.sevenDays?.holidays?.length ?? 0) || (upcoming?.sevenDays?.events?.length ?? 0) || (upcoming?.sevenDays?.tasks?.length ?? 0)) && (
            <div className="text-sm text-[var(--text-secondary)]">No upcoming items.</div>
          )}
        </div>
      </div>

      {/* Mini Editor Popover for events/tasks */}
      {editTarget && editTarget.kind === "event" && (
        <MiniEditorPopover
          isOpen={true}
          documentId={editTarget.id as Id<"documents">}
          anchorEl={editAnchorEl}
          onClose={() => {
            setEditTarget(null);
            setEditAnchorEl(null);
          }}
        />
      )}
      {editTarget && editTarget.kind === "task" && (
        <MiniEditorPopover
          isOpen={true}
          documentId={editTarget.id as Id<"documents">}
          anchorEl={editAnchorEl}
          onClose={() => {
            setEditTarget(null);
            setEditAnchorEl(null);
          }}
        />
      )}
    </div>
  );
}

