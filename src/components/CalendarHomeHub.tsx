import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { CalendarView } from "@/components/views/CalendarView";
import { DocumentsHomeHub } from "./DocumentsHomeHub";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";

interface CalendarHomeHubProps {
  onDocumentSelect: (documentId: Id<"documents">) => void;
  onGridModeToggle?: () => void;
}

export function CalendarHomeHub({
  onDocumentSelect,
  onGridModeToggle,
}: CalendarHomeHubProps) {
  // Load server-side preference for calendar panel height
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const prefs = useQuery(api.userPreferences.getCalendarUiPrefs);
  const upsertSize = useMutation(api.userPreferences.upsertCalendarHubSizePct);

  const [initialPct, setInitialPct] = useState<number>(45);
  const hasAppliedServer = useRef(false);

  // When preferences load, apply server value once (clamped 20-80)
  useEffect(() => {
    if (!hasAppliedServer.current && prefs) {
      const n = typeof prefs.calendarHubSizePct === "number" ? prefs.calendarHubSizePct : 45;
      const clamped = Math.min(80, Math.max(20, Math.round(n)));
      setInitialPct(clamped);
      hasAppliedServer.current = true;
    }
  }, [prefs]);

  const handleLayout = (sizes: number[]) => {
    // sizes are percentages for each Panel
    const first = sizes?.[0];
    if (typeof first === "number" && Number.isFinite(first)) {
      // Optimistically update local state for remount key stability
      const clamped = Math.min(80, Math.max(20, Math.round(first)));
      setInitialPct(clamped);
      // Persist to server if authenticated
      if (loggedInUser) {
        upsertSize({ pct: clamped }).catch(() => {/* ignore */});
      }
    }
  };

  return (
    <div className="h-full w-full overflow-hidden">
      {/* Remount when initialPct changes so defaultSize takes effect */}
      <PanelGroup key={`pct-${initialPct}`} direction="vertical" className="h-full" onLayout={handleLayout}>
        <Panel defaultSize={initialPct} minSize={20} maxSize={80} className="border-b border-[var(--border-color)] bg-[var(--bg-primary)]">
          <div id="planner-panel-calendar" className="h-full w-full overflow-hidden">
            <CalendarView />
          </div>
        </Panel>
        <PanelResizeHandle className="h-2 relative group">
          <div className="absolute inset-0 cursor-row-resize bg-transparent group-hover:bg-[var(--bg-hover)]" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-1 rounded bg-[var(--border-color)]" />
        </PanelResizeHandle>
        <Panel minSize={20}>
          <div className="h-full min-h-0 overflow-hidden">
            <DocumentsHomeHub
              onDocumentSelect={onDocumentSelect}
              onGridModeToggle={onGridModeToggle}
              hideCalendarCard
            />
          </div>
        </Panel>
      </PanelGroup>
    </div>
  );
}
