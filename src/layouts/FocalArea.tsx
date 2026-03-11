/**
 * FocalArea — Renders the active view based on currentView.
 *
 * Extracted from MainLayout's 28-view conditional chain.
 * Each view component stays identical — this is a pure extraction.
 */

import { lazy, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { VIEW_PATH_MAP, VIEW_TITLES } from "./cockpitModes";
import { VIEW_MAP } from "@/lib/viewRegistry";
import { Id } from "../../convex/_generated/dataModel";
import { LazyView } from "@/shared/components/LazyView";
import { ViewSkeleton } from "@/components/skeletons";
import type { MainView, ResearchTab } from "../hooks/useMainLayoutRouting";

// ─── Lazy imports: only views with custom rendering (props/callbacks) ────────
// Simple views (no props) use the registry component via the fallback at the
// bottom of the render chain — no per-view lazy import needed here.
const DocumentsHomeHub = lazy(() =>
  import("@/features/documents/components/DocumentsHomeHub").then((mod) => ({ default: mod.DocumentsHomeHub })),
);
const SpreadsheetsHub = lazy(() =>
  import("@/features/spreadsheets/components/SpreadsheetsHub").then((mod) => ({ default: mod.SpreadsheetsHub })),
);
const SpreadsheetSheetView = lazy(() =>
  import("@/features/spreadsheets/views/SpreadsheetSheetView").then((mod) => ({ default: mod.SpreadsheetSheetView })),
);
const CalendarHomeHub = lazy(() =>
  import("@/features/calendar/components/CalendarHomeHub").then((mod) => ({ default: mod.CalendarHomeHub })),
);
const TimelineRoadmapView = lazy(() =>
  import("@/components/timelineRoadmap/TimelineRoadmapView").then((mod) => ({ default: mod.TimelineRoadmapView })),
);
const ResearchHub = lazy(() => import("@/features/research/views/ResearchHub"));
const CinematicHome = lazy(() => import("@/features/research/views/CinematicHome"));
const PhaseAllShowcase = lazy(() =>
  import("@/features/research/views/PhaseAllShowcase").then((mod) => ({ default: mod.PhaseAllShowcase })),
);
const FootnotesPage = lazy(() => import("@/features/research/views/FootnotesPage"));
const EntityProfilePage = lazy(() =>
  import("@/features/research/views/EntityProfilePage").then((mod) => ({ default: mod.EntityProfilePage })),
);
const TabManager = lazy(() =>
  import("@/components/TabManager").then((mod) => ({ default: mod.TabManager })),
);
const ControlPlaneLanding = lazy(() =>
  import("@/features/controlPlane/views/ControlPlaneLanding").then((mod) => ({ default: mod.ControlPlaneLanding })),
);
const PublicDocuments = lazy(() =>
  import("@/features/documents/views/PublicDocuments").then((mod) => ({ default: mod.PublicDocuments })),
);

// Skeleton fallbacks
const viewFallbackDefault = <ViewSkeleton variant="default" />;
const viewFallbackDocuments = <ViewSkeleton variant="documents" />;
const viewFallbackCalendar = <ViewSkeleton variant="calendar" />;
const viewFallbackDashboard = <ViewSkeleton variant="dashboard" />;

const EMPTY_FOOTNOTES_LIBRARY = {
  citations: {} as Record<string, unknown>,
  order: [] as string[],
  updatedAt: new Date().toISOString(),
};

export interface FocalAreaProps {
  currentView: MainView;
  viewResetKey: string;
  // Research
  showResearchDossier: boolean;
  setShowResearchDossier: (show: boolean) => void;
  researchHubInitialTab: ResearchTab;
  setResearchHubInitialTab: (tab: ResearchTab) => void;
  activeSources: string[];
  setActiveSources: React.Dispatch<React.SetStateAction<string[]>>;
  // Navigation
  setCurrentView: (view: MainView) => void;
  // Entity
  entityName: string | null;
  setEntityName: (name: string | null) => void;
  // Spreadsheets
  selectedSpreadsheetId: Id<"spreadsheets"> | null;
  setSelectedSpreadsheetId: (id: Id<"spreadsheets"> | null) => void;
  // Documents
  selectedDocumentId: Id<"documents"> | null;
  onDocumentSelect: (id: Id<"documents"> | null) => void;
  isGridMode: boolean;
  setIsGridMode: React.Dispatch<React.SetStateAction<boolean>>;
  selectedTaskId: Id<"tasks"> | null;
  selectedTaskSource: "today" | "upcoming" | "week" | "other" | null;
  onSelectTask: (id: Id<"tasks">, source: "today" | "upcoming" | "week" | "other") => void;
  onClearTaskSelection: () => void;
  // Agent
  onOpenFastAgent: () => void;
  onOpenFastAgentWithPrompt?: (prompt: string) => void;
}

export function FocalArea({
  currentView,
  viewResetKey,
  showResearchDossier,
  setShowResearchDossier,
  researchHubInitialTab,
  setResearchHubInitialTab,
  activeSources,
  setActiveSources,
  setCurrentView,
  entityName,
  setEntityName,
  selectedSpreadsheetId,
  setSelectedSpreadsheetId,
  selectedDocumentId,
  onDocumentSelect,
  isGridMode,
  setIsGridMode,
  selectedTaskId,
  selectedTaskSource,
  onSelectTask,
  onClearTaskSelection,
  onOpenFastAgent,
  onOpenFastAgentWithPrompt,
}: FocalAreaProps) {
  const navigate = useNavigate();

  // Retrigger hud-materialize animation on view change WITHOUT remounting the tree.
  // Toggling a CSS class forces the browser to restart the animation — no DOM teardown.
  const [animKey, setAnimKey] = useState(false);
  const prevViewRef = useRef(currentView);
  useEffect(() => {
    if (prevViewRef.current !== currentView) {
      prevViewRef.current = currentView;
      setAnimKey((v) => !v);
    }
  }, [currentView]);

  return (
    <div
      className={`relative flex-1 overflow-hidden font-sans hud-focal-area ${animKey ? "hud-materialize" : "hud-materialize-alt"}`}
      data-agent-id={`view:${currentView}:content`}
      data-agent-label={VIEW_TITLES[currentView] ?? currentView}
    >
      {currentView === "research" ? (
        <LazyView title="Research Hub failed to load" resetKey={viewResetKey} fallback={viewFallbackDashboard}>
          {!showResearchDossier ? (
            <CinematicHome
              onEnterHub={(tab) => {
                setResearchHubInitialTab(tab ?? "overview");
                setShowResearchDossier(true);
              }}
              onEnterWorkspace={() => {
                navigate(VIEW_PATH_MAP["documents"] ?? "/documents");
                setCurrentView("documents");
              }}
              onOpenFastAgent={onOpenFastAgent}
              onOpenFastAgentWithPrompt={onOpenFastAgentWithPrompt}
              onOpenAgents={() => {
                navigate(VIEW_PATH_MAP["agents"] ?? "/agents");
                setCurrentView("agents");
              }}
              onOpenWorkbench={() => {
                navigate(VIEW_PATH_MAP["benchmarks"] ?? "/benchmarks");
                setCurrentView("benchmarks");
              }}
            />
          ) : (
            <ResearchHub
              embedded
              initialTab={researchHubInitialTab}
              onGoHome={() => setShowResearchDossier(false)}
              onDocumentSelect={(id) => onDocumentSelect(id as Id<"documents">)}
              onEnterWorkspace={() => {
                navigate(VIEW_PATH_MAP["documents"] ?? "/documents");
                setCurrentView("documents");
              }}
              activeSources={activeSources}
              onToggleSource={(sourceId) =>
                setActiveSources((prev) =>
                  prev.includes(sourceId) ? prev.filter((id) => id !== sourceId) : [...prev, sourceId],
                )
              }
            />
          )}
        </LazyView>
      ) : currentView === "public" ? (
        <LazyView title="Public documents failed to load" resetKey={viewResetKey} fallback={viewFallbackDocuments}>
          <PublicDocuments onDocumentSelect={onDocumentSelect} />
        </LazyView>
      ) : currentView === "spreadsheets" ? (
        <LazyView title="Spreadsheets failed to load" resetKey={viewResetKey} fallback={viewFallbackDefault}>
          {selectedSpreadsheetId ? (
            <SpreadsheetSheetView
              sheetId={selectedSpreadsheetId}
              onBack={() => {
                setSelectedSpreadsheetId(null);
                navigate("/spreadsheets");
              }}
            />
          ) : (
            <SpreadsheetsHub
              onOpenSheet={(id: Id<"spreadsheets">) => {
                setSelectedSpreadsheetId(id);
                navigate(`/spreadsheets/${String(id)}`);
              }}
            />
          )}
        </LazyView>
      ) : currentView === "calendar" ? (
        <LazyView title="Calendar failed to load" resetKey={viewResetKey} fallback={viewFallbackCalendar}>
          <CalendarHomeHub
            onDocumentSelect={onDocumentSelect}
            onGridModeToggle={() => setIsGridMode((v) => !v)}
          />
        </LazyView>
      ) : currentView === "roadmap" || currentView === "timeline" ? (
        <LazyView title="Roadmap failed to load" resetKey={viewResetKey} fallback={viewFallbackDefault}>
          <TimelineRoadmapView />
        </LazyView>
      ) : currentView === "showcase" ? (
        <LazyView title="Showcase failed to load" resetKey={viewResetKey} fallback={viewFallbackDefault}>
          <PhaseAllShowcase onBack={() => {
            navigate(VIEW_PATH_MAP["research"] ?? "/");
            setCurrentView("research");
          }} />
        </LazyView>
      ) : currentView === "footnotes" ? (
        <LazyView title="Sources failed to load" resetKey={viewResetKey} fallback={viewFallbackDefault}>
          <FootnotesPage
            library={EMPTY_FOOTNOTES_LIBRARY}
            briefTitle="Latest Daily Brief"
            onBack={() => {
              navigate(VIEW_PATH_MAP["research"] ?? "/");
              setCurrentView("research");
            }}
          />
        </LazyView>
      ) : currentView === "control-plane" ? (
        <LazyView title="Landing failed to load" resetKey={viewResetKey} fallback={viewFallbackDefault}>
          <ControlPlaneLanding onNavigate={(view) => {
            navigate(VIEW_PATH_MAP[view as MainView] ?? `/${view}`);
            setCurrentView(view as MainView);
          }} />
        </LazyView>
      ) : currentView === "entity" && entityName ? (
        <LazyView title="Entity profile failed to load" resetKey={viewResetKey} fallback={viewFallbackDefault}>
          <EntityProfilePage
            entityName={entityName}
            onBack={() => {
              setEntityName(null);
              setCurrentView("research");
              navigate("/");
            }}
          />
        </LazyView>
      ) : VIEW_MAP[currentView]?.component ? (
        /* ── Registry-driven renderer ────────────────────────────────────
         * All views with a non-null `component` in VIEW_REGISTRY are
         * rendered here via a single lookup — no per-view branch needed.
         * Adding a new simple view = add 1 entry to viewRegistry.ts.
         * Matches the same pattern used in MainLayout (classic layout).
         */
        (() => {
          const RegistryComponent = VIEW_MAP[currentView].component!;
          const entry = VIEW_MAP[currentView];
          return (
            <LazyView
              title={`${entry.title} failed to load`}
              resetKey={viewResetKey}
              fallback={viewFallbackDefault}
              className="h-full overflow-auto bg-surface pb-24"
            >
              <RegistryComponent />
            </LazyView>
          );
        })()
      ) : (
        <LazyView title="Workspace failed to load" resetKey={viewResetKey} fallback={viewFallbackDocuments}>
          <div className="h-full flex">
            <div className="flex-1 overflow-hidden">
              {isGridMode || !!selectedDocumentId ? (
                <TabManager
                  selectedDocumentId={selectedDocumentId}
                  onDocumentSelect={onDocumentSelect}
                  isGridMode={isGridMode}
                  setIsGridMode={setIsGridMode}
                  currentView={currentView}
                />
              ) : (
                <DocumentsHomeHub
                  onDocumentSelect={(id) => onDocumentSelect(id)}
                  onGridModeToggle={() => setIsGridMode((v) => !v)}
                  selectedTaskId={selectedTaskId}
                  selectedTaskSource={selectedTaskSource}
                  onSelectTask={onSelectTask}
                  onClearTaskSelection={onClearTaskSelection}
                />
              )}
            </div>
          </div>
        </LazyView>
      )}
    </div>
  );
}
