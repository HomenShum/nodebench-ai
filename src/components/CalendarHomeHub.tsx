import { useEffect, useState, useRef } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { Id } from "../../convex/_generated/dataModel";
import { CalendarView } from "@/components/views/CalendarView";
import { AgentDashboard } from "@/components/agentDashboard/AgentDashboard";
import { usePlannerState } from "@/hooks/usePlannerState";
import { SidebarMiniCalendar } from "@/components/shared/SidebarMiniCalendar";
import { SidebarUpcoming } from "@/components/shared/SidebarUpcoming";
import { TopDividerBar } from "@/components/shared/TopDividerBar";
import { UnifiedHubPills } from "@/components/shared/UnifiedHubPills";

interface CalendarHomeHubProps {
  onDocumentSelect: (documentId: Id<"documents">) => void;
  onGridModeToggle?: () => void;
}

export function CalendarHomeHub({
  onDocumentSelect,
  onGridModeToggle: _onGridModeToggle,
}: CalendarHomeHubProps) {
  // Shared planner state
  const { focusedDateMs, setFocusedDateMs, handleViewDay, handleViewWeek, handleAddTaskForDate, upcoming } = usePlannerState();
  // Subview: calendar | agents; synced to URL hash (#calendar or #calendar/agents)
  const [subView, setSubView] = useState<"calendar" | "agents">("calendar");
  useEffect(() => {
    const apply = () => {
      try {
        const h = (window.location.hash || "").toLowerCase();
        // Only react to hash changes that target the calendar hub; ignore unrelated hashes
        if (!h.startsWith("#calendar")) return;
        setSubView(h.includes("calendar/agents") ? "agents" : "calendar");
      } catch {
        // noop
      }
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);
  const switchTo = (v: "calendar" | "agents") => {
    try {
      const base = "#calendar";
      window.location.hash = v === "agents" ? `${base}/agents` : base;
    } catch {
      // best effort
    }
    setSubView(v);
  };

  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    try {
      return JSON.parse(localStorage.getItem("unifiedSidebar.open") || "true");
    } catch {
      return true;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("unifiedSidebar.open", JSON.stringify(sidebarOpen));
    } catch {
      // noop
    }
  }, [sidebarOpen]);

  // If this sidebar is rendered as an overlay (absolute/fixed), publish its width so timeline can pad-left
  const sidebarRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sidebarRef.current;
    const update = () => {
      if (!el) return;
      const cs = window.getComputedStyle(el);
      const pos = cs.position;
      const isOverlay = pos === 'absolute' || pos === 'fixed';
      const w = Math.ceil(el.getBoundingClientRect().width);
      try {
        document.documentElement.style.setProperty('--left-overlay-padding', isOverlay && w > 0 ? `${w}px` : '0px');
      } catch {}
    };
    update();
    let ro: ResizeObserver | null = null;
    try {
      if (typeof ResizeObserver !== 'undefined' && el) {
        // @ts-ignore
        ro = new ResizeObserver(() => update());
        // @ts-ignore
        ro.observe(el);
      }
    } catch {}
    window.addEventListener('resize', update);
    return () => {
      try { document.documentElement.style.setProperty('--left-overlay-padding', '0px'); } catch {}
      window.removeEventListener('resize', update);
      if (ro) try { ro.disconnect(); } catch {}
    };
  }, [sidebarOpen]);


  return (
    <div className="h-full w-full bg-[var(--bg-primary)] overflow-y-auto relative">

      <div className="flex-1 p-8 relative z-10">
        <div className="dashboard-container max-w-7xl mx-auto flex gap-8">
          <div className="flex-1 min-w-0">
            <TopDividerBar
              left={
                <UnifiedHubPills active={subView} showRoadmap roadmapDisabled={false} />
              }
            />
            {/* Sub-tabs replaced by header breadcrumb/toggles */}

            {subView === "calendar" ? (
              <CalendarView
                focusedDateMs={focusedDateMs}
                onSelectDate={setFocusedDateMs}
                onViewDay={handleViewDay}
                onViewWeek={handleViewWeek}
                onQuickAddTask={handleAddTaskForDate}
              />
            ) : (
              <AgentDashboard />
            )}
          </div>
          <aside ref={sidebarRef} className={`${sidebarOpen ? "w-[320px] md:w-[360px] p-3" : "w-[18px] p-0"} shrink-0 border-l border-[var(--border-color)] bg-[var(--bg-primary)] relative z-20`}>
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
              aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
              className="absolute -left-2 top-3 w-4 h-6 rounded-sm border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] flex items-center justify-center shadow-sm"
            >
              {sidebarOpen ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
            </button>
            {sidebarOpen && (
              <div className="space-y-4">
                <SidebarMiniCalendar
                  onSelectDate={(ms) => handleViewWeek(ms)}
                  onViewDay={(ms) => handleViewDay(ms)}
                  onViewWeek={(ms) => handleViewWeek(ms)}
                  showViewFullCalendarLink
                />
                <SidebarUpcoming upcoming={upcoming} onOpenDocument={onDocumentSelect} />
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
