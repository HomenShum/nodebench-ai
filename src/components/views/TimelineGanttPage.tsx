import React from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import UnifiedEditor from "@/components/UnifiedEditor";
import TimelineGanttView from "@/components/views/TimelineGanttView";

export default function TimelineGanttPage({
  documentId,
  isGridMode = false,
  isFullscreen = false,
}: {
  documentId: Id<"documents">;
  isGridMode?: boolean;
  isFullscreen?: boolean;
}) {
  // Keep this wrapper minimal: compose the timeline view with a right-side notes panel
  // DocumentView already renders DocumentHeader and cover image; don't duplicate them here.
  const userId = useQuery(api.presence.getUserId);

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[var(--bg-primary)]">
      <PanelGroup direction="horizontal">
        <Panel defaultSize={70} minSize={30} className="min-w-0">
          <div className="h-full w-full">
            <TimelineGanttView documentId={documentId} isGridMode={isGridMode} isFullscreen={isFullscreen} />
          </div>
        </Panel>
        <PanelResizeHandle className="w-1 bg-[var(--border-color)]" />
        <Panel defaultSize={30} minSize={0} collapsible className="min-w-0">
          <div className="h-full w-full border-l border-[var(--border-color)] bg-[var(--bg-primary)]">
            <div className="px-3 py-2 border-b border-[var(--border-color)] flex items-center justify-between">
              <div className="text-sm font-medium text-[var(--text-primary)]">Notes</div>
              {/* Intentionally minimal; add PresenceIndicator or controls here later if desired */}
              {userId ? <div className="text-[10px] text-[var(--text-secondary)]">You are viewing</div> : null}
            </div>
            <div className="h-[calc(100%-36px)] overflow-hidden">
              <UnifiedEditor documentId={documentId} mode="agentLog" />
            </div>
          </div>
        </Panel>
      </PanelGroup>
    </div>
  );
}

