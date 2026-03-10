/**
 * FocalArea — Renders the active view based on currentView.
 *
 * Extracted from MainLayout's 28-view conditional chain.
 * Each view component stays identical — this is a pure extraction.
 */

import { lazy, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { VIEW_PATH_MAP, VIEW_TITLES } from "./cockpitModes";
import { Id } from "../../convex/_generated/dataModel";
import { LazyView } from "@/shared/components/LazyView";
import { ViewSkeleton } from "@/components/skeletons";
import type { MainView, ResearchTab } from "../hooks/useMainLayoutRouting";

// Lazy imports — same as MainLayout
const PublicDocuments = lazy(() =>
  import("@/features/documents/views/PublicDocuments").then((mod) => ({ default: mod.PublicDocuments })),
);
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
const AgentsHub = lazy(() =>
  import("@/features/agents/views/AgentsHub").then((mod) => ({ default: mod.AgentsHub })),
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
const PublicSignalsLog = lazy(() =>
  import("@/features/research/views/PublicSignalsLog").then((mod) => ({ default: mod.PublicSignalsLog })),
);
const WorkbenchView = lazy(() =>
  import("@/features/benchmarks/views/WorkbenchView").then((mod) => ({ default: mod.WorkbenchView })),
);
const EntityProfilePage = lazy(() =>
  import("@/features/research/views/EntityProfilePage").then((mod) => ({ default: mod.EntityProfilePage })),
);
const FundingBriefView = lazy(() =>
  import("@/features/research/views/FundingBriefView").then((mod) => ({ default: mod.FundingBriefView })),
);
const TabManager = lazy(() =>
  import("@/components/TabManager").then((mod) => ({ default: mod.TabManager })),
);
const PublicActivityView = lazy(() =>
  import("@/features/agents/views/PublicActivityView").then((mod) => ({ default: mod.PublicActivityView })),
);
const HITLAnalyticsDashboard = lazy(() =>
  import("@/features/analytics/views/HITLAnalyticsDashboard").then((mod) => ({ default: mod.default })),
);
const ComponentMetricsDashboard = lazy(() =>
  import("@/features/analytics/views/ComponentMetricsDashboard").then((mod) => ({ default: mod.default })),
);
const RecommendationFeedbackDashboard = lazy(() =>
  import("@/features/analytics/views/RecommendationAnalyticsDashboard").then((mod) => ({ default: mod.default })),
);
const CostDashboard = lazy(() =>
  import("@/components/CostDashboard").then((mod) => ({ default: mod.CostDashboard })),
);
const IndustryUpdatesPanel = lazy(() =>
  import("@/components/IndustryUpdatesPanel").then((mod) => ({ default: mod.IndustryUpdatesPanel })),
);
const ForYouFeed = lazy(() =>
  import("@/features/research/components/ForYouFeed").then((mod) => ({ default: mod.ForYouFeed })),
);
const DocumentRecommendations = lazy(() =>
  import("@/features/documents/components/DocumentRecommendations").then((mod) => ({ default: mod.DocumentRecommendations })),
);
const AgentMarketplace = lazy(() =>
  import("@/features/agents/components/AgentMarketplace").then((mod) => ({ default: mod.AgentMarketplace })),
);
const GitHubExplorer = lazy(() =>
  import("@/features/research/components/GitHubExplorer").then((mod) => ({ default: mod.GitHubExplorer })),
);
const PRSuggestions = lazy(() =>
  import("@/features/monitoring/components/PRSuggestions").then((mod) => ({ default: mod.PRSuggestions })),
);
const LinkedInPostArchiveView = lazy(() =>
  import("@/features/social/views/LinkedInPostArchiveView").then((mod) => ({ default: mod.LinkedInPostArchiveView })),
);
const McpToolLedgerView = lazy(() =>
  import("@/features/mcp/views/McpToolLedgerView").then((mod) => ({ default: mod.McpToolLedgerView })),
);
const DogfoodReviewView = lazy(() =>
  import("@/features/dogfood/views/DogfoodReviewView").then((mod) => ({ default: mod.DogfoodReviewView })),
);
const OracleView = lazy(() =>
  import("@/features/oracle/views/OracleView").then((mod) => ({ default: mod.OracleView })),
);

// Skeleton fallbacks
const viewFallbackDefault = <ViewSkeleton variant="default" />;
const viewFallbackDocuments = <ViewSkeleton variant="documents" />;
const viewFallbackCalendar = <ViewSkeleton variant="calendar" />;
const viewFallbackAgents = <ViewSkeleton variant="agents" />;
const viewFallbackDashboard = <ViewSkeleton variant="dashboard" />;
const viewFallbackCost = <ViewSkeleton variant="cost-dashboard" />;
const viewFallbackIndustry = <ViewSkeleton variant="industry-updates" />;

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
      ) : currentView === "agents" ? (
        <LazyView title="AI Assistants failed to load" resetKey={viewResetKey} fallback={viewFallbackAgents}>
          <AgentsHub />
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
      ) : currentView === "signals" ? (
        <LazyView title="Signals failed to load" resetKey={viewResetKey} fallback={viewFallbackDefault}>
          <PublicSignalsLog />
        </LazyView>
      ) : currentView === "benchmarks" ? (
        <LazyView title="Workbench failed to load" resetKey={viewResetKey} fallback={viewFallbackDefault} className="h-full">
          <WorkbenchView />
        </LazyView>
      ) : currentView === "funding" ? (
        <LazyView title="Funding Brief failed to load" resetKey={viewResetKey} fallback={viewFallbackDefault}>
          <FundingBriefView />
        </LazyView>
      ) : currentView === "activity" ? (
        <LazyView title="Activity failed to load" resetKey={viewResetKey} fallback={viewFallbackDefault}>
          <PublicActivityView />
        </LazyView>
      ) : currentView === "analytics-hitl" ? (
        <LazyView title="Review Queue failed to load" resetKey={viewResetKey} fallback={viewFallbackDefault} className="h-full overflow-auto bg-surface pb-24">
          <HITLAnalyticsDashboard />
        </LazyView>
      ) : currentView === "analytics-components" ? (
        <LazyView title="Usage & Costs failed to load" resetKey={viewResetKey} fallback={viewFallbackDefault} className="h-full overflow-auto bg-surface pb-24">
          <ComponentMetricsDashboard />
        </LazyView>
      ) : currentView === "analytics-recommendations" ? (
        <LazyView title="Feedback failed to load" resetKey={viewResetKey} fallback={viewFallbackDefault} className="h-full overflow-auto bg-surface pb-24">
          <RecommendationFeedbackDashboard />
        </LazyView>
      ) : currentView === "cost-dashboard" ? (
        <LazyView title="Cost Dashboard failed to load" resetKey={viewResetKey} fallback={viewFallbackCost} className="h-full overflow-auto bg-surface pb-24">
          <CostDashboard />
        </LazyView>
      ) : currentView === "industry-updates" ? (
        <LazyView title="Industry News failed to load" resetKey={viewResetKey} fallback={viewFallbackIndustry} className="h-full overflow-auto bg-surface pb-24">
          <IndustryUpdatesPanel />
        </LazyView>
      ) : currentView === "for-you-feed" ? (
        <LazyView title="For You feed failed to load" resetKey={viewResetKey} fallback={viewFallbackDefault} className="h-full overflow-auto bg-surface pb-24">
          <ForYouFeed />
        </LazyView>
      ) : currentView === "document-recommendations" ? (
        <LazyView title="Recommendations failed to load" resetKey={viewResetKey} fallback={viewFallbackDocuments} className="h-full overflow-auto bg-surface pb-24">
          <DocumentRecommendations />
        </LazyView>
      ) : currentView === "agent-marketplace" ? (
        <LazyView title="Agent Templates failed to load" resetKey={viewResetKey} fallback={viewFallbackAgents} className="h-full overflow-auto bg-surface pb-24">
          <AgentMarketplace />
        </LazyView>
      ) : currentView === "github-explorer" ? (
        <LazyView title="GitHub Explorer failed to load" resetKey={viewResetKey} fallback={viewFallbackDefault} className="h-full overflow-auto bg-surface pb-24">
          <GitHubExplorer />
        </LazyView>
      ) : currentView === "pr-suggestions" ? (
        <LazyView title="PR Suggestions failed to load" resetKey={viewResetKey} fallback={viewFallbackDefault} className="h-full overflow-auto bg-surface pb-24">
          <PRSuggestions />
        </LazyView>
      ) : currentView === "linkedin-posts" ? (
        <LazyView title="LinkedIn Archive failed to load" resetKey={viewResetKey} fallback={viewFallbackDocuments} className="h-full overflow-auto bg-surface pb-24">
          <LinkedInPostArchiveView />
        </LazyView>
      ) : currentView === "mcp-ledger" ? (
        <LazyView title="Activity Log failed to load" resetKey={viewResetKey} fallback={viewFallbackDefault} className="h-full overflow-auto bg-surface pb-24">
          <McpToolLedgerView />
        </LazyView>
      ) : currentView === "dogfood" ? (
        <LazyView title="Quality Review failed to load" resetKey={viewResetKey} fallback={viewFallbackDefault} className="h-full overflow-auto bg-surface pb-24">
          <DogfoodReviewView />
        </LazyView>
      ) : currentView === "oracle" ? (
        <LazyView title="Oracle failed to load" resetKey={viewResetKey} fallback={viewFallbackDefault} className="h-full overflow-auto bg-surface pb-24">
          <OracleView />
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
