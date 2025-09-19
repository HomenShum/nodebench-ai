import React from "react";
import AgendaMiniRow from "@/components/agenda/AgendaMiniRow";

export interface SidebarUpcomingProps {
  // Hook shape can evolve; keep it permissive to avoid churn.
  upcoming: any;
}

export function SidebarUpcoming({ upcoming }: SidebarUpcomingProps) {
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
            <AgendaMiniRow key={`e_${String(e?._id)}`} item={e} kind="event" />
          ))}
          {upcoming?.today?.tasks?.map((t: any) => (
            <AgendaMiniRow key={`t_${String(t?._id)}`} item={t} kind="task" showCheckbox />
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
            <AgendaMiniRow key={`we_${String(e?._id)}`} item={e} kind="event" />
          ))}
          {upcoming?.sevenDays?.tasks?.map((t: any) => (
            <AgendaMiniRow key={`wt_${String(t?._id)}`} item={t} kind="task" showCheckbox />
          ))}
          {!((upcoming?.sevenDays?.holidays?.length ?? 0) || (upcoming?.sevenDays?.events?.length ?? 0) || (upcoming?.sevenDays?.tasks?.length ?? 0)) && (
            <div className="text-sm text-[var(--text-secondary)]">No upcoming items.</div>
          )}
        </div>
      </div>
    </div>
  );
}

