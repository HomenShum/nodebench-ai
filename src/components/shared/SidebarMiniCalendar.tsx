import React from "react";
import { MiniMonthCalendar } from "@/components/MiniMonthCalendar";

export interface SidebarMiniCalendarProps {
  onSelectDate?: (ms: number) => void;
  onViewDay?: (ms: number) => void;
  onViewWeek?: (ms: number) => void;
  showViewFullCalendarLink?: boolean;
}

export function SidebarMiniCalendar({ onSelectDate, onViewDay, onViewWeek, showViewFullCalendarLink }: SidebarMiniCalendarProps) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-[var(--text-muted)] mb-2">Mini Calendar</div>
      <MiniMonthCalendar
        onSelectDate={onSelectDate}
        onViewDay={onViewDay}
        onViewWeek={onViewWeek}
        constrainToSidebar
      />
      {showViewFullCalendarLink && (
        <div className="mt-2">
          <button
            type="button"
            className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] underline-offset-2 hover:underline"
            onClick={() => { try { window.dispatchEvent(new CustomEvent('navigate:calendar')); } catch { /* no-op */ } }}
            aria-label="View full calendar"
          >
            View full calendar
          </button>
        </div>
      )}
    </div>
  );
}

