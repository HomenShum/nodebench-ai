import React, { useState, useRef } from "react";
import AgendaMiniRow from "@/components/agenda/AgendaMiniRow";
import type { Id } from "../../../convex/_generated/dataModel";

export interface SidebarUpcomingProps {
  // Hook shape can evolve; keep it permissive to avoid churn.
  upcoming: any;
  onOpenDocument?: (documentId: Id<"documents">) => void;
}

export function SidebarUpcoming({ upcoming, onOpenDocument }: SidebarUpcomingProps) {
  const [lastClickedId, setLastClickedId] = useState<string | null>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleOpenDocument = (documentId: Id<"documents">) => {
    if (onOpenDocument) {
      onOpenDocument(documentId);
    }
  };
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">Today</div>
          <div className="text-[11px] text-[var(--text-secondary)]">
            {(upcoming?.counts?.todayEvents ?? 0) + (upcoming?.counts?.todayTasks ?? 0)} items
          </div>
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
                  // Double-click: navigate to document
                  if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
                  setLastClickedId(null);
                  if (e.documentId) {
                    handleOpenDocument(e.documentId as Id<"documents">);
                  }
                } else {
                  // First click: set for potential double-click
                  setLastClickedId(`event_${idStr}`);
                  if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
                  clickTimeoutRef.current = setTimeout(() => {
                    setLastClickedId(null);
                    // Single click: also navigate to document
                    if (e.documentId) {
                      handleOpenDocument(e.documentId as Id<"documents">);
                    }
                  }, 300);
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
                  // Double-click: navigate to document
                  if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
                  setLastClickedId(null);
                  if (t.documentId) {
                    handleOpenDocument(t.documentId as Id<"documents">);
                  }
                } else {
                  // First click: set for potential double-click
                  setLastClickedId(`task_${idStr}`);
                  if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
                  clickTimeoutRef.current = setTimeout(() => {
                    setLastClickedId(null);
                    // Single click: also navigate to document
                    if (t.documentId) {
                      handleOpenDocument(t.documentId as Id<"documents">);
                    }
                  }, 300);
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
          <div className="text-[11px] text-[var(--text-secondary)]">
            {(upcoming?.counts?.weekEvents ?? 0) + (upcoming?.counts?.weekTasks ?? 0)} items
          </div>
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
                  // Double-click: navigate to document
                  if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
                  setLastClickedId(null);
                  if (e.documentId) {
                    handleOpenDocument(e.documentId as Id<"documents">);
                  }
                } else {
                  // First click: set for potential double-click
                  setLastClickedId(`event_${idStr}`);
                  if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
                  clickTimeoutRef.current = setTimeout(() => {
                    setLastClickedId(null);
                    // Single click: also navigate to document
                    if (e.documentId) {
                      handleOpenDocument(e.documentId as Id<"documents">);
                    }
                  }, 300);
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
                  // Double-click: navigate to document
                  if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
                  setLastClickedId(null);
                  if (t.documentId) {
                    handleOpenDocument(t.documentId as Id<"documents">);
                  }
                } else {
                  // First click: set for potential double-click
                  setLastClickedId(`task_${idStr}`);
                  if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
                  clickTimeoutRef.current = setTimeout(() => {
                    setLastClickedId(null);
                    // Single click: also navigate to document
                    if (t.documentId) {
                      handleOpenDocument(t.documentId as Id<"documents">);
                    }
                  }, 300);
                }
              }}
            />
          ))}
          {!((upcoming?.sevenDays?.holidays?.length ?? 0) || (upcoming?.sevenDays?.events?.length ?? 0) || (upcoming?.sevenDays?.tasks?.length ?? 0)) && (
            <div className="text-sm text-[var(--text-secondary)]">No upcoming items.</div>
          )}
        </div>
      </div>
    </div>
  );
}

