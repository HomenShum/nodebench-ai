import { ArrowLeft } from "lucide-react";
import { Id } from "../../convex/_generated/dataModel";
import { CalendarView } from "@/components/views/CalendarView";
import { usePlannerState } from "@/hooks/usePlannerState";
import { SidebarMiniCalendar } from "@/components/shared/SidebarMiniCalendar";
import { SidebarUpcoming } from "@/components/shared/SidebarUpcoming";
import { TopDividerBar } from "@/components/shared/TopDividerBar";

interface CalendarHomeHubProps {
  onDocumentSelect: (documentId: Id<"documents">) => void;
  onGridModeToggle?: () => void;
}

export function CalendarHomeHub({
  onDocumentSelect: _onDocumentSelect,
  onGridModeToggle: _onGridModeToggle,
}: CalendarHomeHubProps) {
  // Shared planner state
  const { focusedDateMs, setFocusedDateMs, handleViewDay, handleViewWeek, handleAddTaskForDate, upcoming } = usePlannerState();

  return (
    <div className="h-full w-full bg-[var(--bg-primary)] overflow-y-auto relative">

      <div className="flex-1 p-8 relative z-10">
        <div className="dashboard-container max-w-7xl mx-auto flex gap-8">
          <div className="flex-1 min-w-0">
            <TopDividerBar
              left={
                <button
                  onClick={() => { try { window.dispatchEvent(new CustomEvent('navigate:documents')); } catch {} }}
                  className="inline-flex items-center gap-2 text-xs px-2 py-1 rounded border border-[var(--border-color)] hover:bg-[var(--bg-hover)]"
                  title="Back to Documents"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Back to Documents</span>
                </button>
              }
            />
            <CalendarView
              focusedDateMs={focusedDateMs}
              onSelectDate={setFocusedDateMs}
              onViewDay={handleViewDay}
              onViewWeek={handleViewWeek}
              onQuickAddTask={handleAddTaskForDate}
            />
          </div>
          <aside className="w-[320px] md:w-[360px] shrink-0 border-l border-[var(--border-color)] bg-[var(--bg-primary)] p-3">
            <div className="space-y-4">
              <SidebarMiniCalendar
                onSelectDate={(ms) => handleViewWeek(ms)}
                onViewDay={(ms) => handleViewDay(ms)}
                onViewWeek={(ms) => handleViewWeek(ms)}
                showViewFullCalendarLink
              />
              <SidebarUpcoming upcoming={upcoming} />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
