import { lazy, Suspense, useCallback, useRef } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery} from "convex/react";
import { Id } from "../../convex/_generated/dataModel";
import { useConvexApi } from "@/lib/convexApi";
import { ErrorBoundary } from "@/shared/components/ErrorBoundary";
import { DataSourceBanner } from "@/shared/components/DataSourceBanner";
import { ViewSkeleton } from "@/components/skeletons";
import { AgentScreen } from "@/shared/agent-ui/AgentScreen";
import { TrajectorySparkline } from "@/shared/ui/TrajectorySparkline";
import {
  buildCockpitPath,
  getDefaultViewForSurface,
  type CockpitSurfaceId,
  type MainView,
  type ResearchTab,
  SURFACE_TITLES,
  VIEW_MAP,
} from "@/lib/registry/viewRegistry";

const DocumentsHomeHub = lazy(() =>
  import("@/features/documents/components/DocumentsHomeHub").then((mod) => ({ default: mod.DocumentsHomeHub })),
);
const SpreadsheetsHub = lazy(() =>
  import("@/features/documents/surfaces/spreadsheets/SpreadsheetsHub").then((mod) => ({ default: mod.SpreadsheetsHub })),
);
const SpreadsheetSheetView = lazy(() =>
  import("@/features/documents/surfaces/spreadsheets/SpreadsheetSheetView").then((mod) => ({ default: mod.SpreadsheetSheetView })),
);
const CalendarHomeHub = lazy(() =>
  import("@/features/calendar/components/CalendarHomeHub").then((mod) => ({ default: mod.CalendarHomeHub })),
);
const TimelineRoadmapView = lazy(() =>
  import("@/components/timelineRoadmap/TimelineRoadmapView").then((mod) => ({ default: mod.TimelineRoadmapView })),
);
const HomeLanding = lazy(() =>
  import("@/features/home/views/HomeLanding").then((mod) => ({ default: mod.HomeLanding })),
);
const NotFoundPage = lazy(() =>
  import("@/features/controlPlane/views/NotFoundPage").then((mod) => ({ default: mod.NotFoundPage })),
);
const ResearchHub = lazy(() => import("@/features/research/views/ResearchHub"));
const DecisionMemoView = lazy(() =>
  import("@/features/deepSim/views/DecisionMemoView").then((mod) => ({ default: mod.DecisionMemoView })),
);
const EnterpriseInvestigationView = lazy(() =>
  import("@/features/investigation/views/EnterpriseInvestigationView").then((mod) => ({ default: mod.default })),
);
const PostmortemView = lazy(() =>
  import("@/features/deepSim/views/PostmortemView").then((mod) => ({ default: mod.PostmortemView })),
);
const EntityProfilePage = lazy(() =>
  import("@/features/research/views/EntityProfilePage").then((mod) => ({ default: mod.EntityProfilePage })),
);
const ActionReceiptFeed = lazy(() =>
  import("@/features/controlPlane/views/ActionReceiptFeed").then((mod) => ({ default: mod.ActionReceiptFeed })),
);
const DelegationShowcase = lazy(() =>
  import("@/features/controlPlane/views/DelegationShowcase").then((mod) => ({ default: mod.DelegationShowcase })),
);
const ExecutionTraceView = lazy(() =>
  import("@/features/strategy/views/ExecutionTraceView").then((mod) => ({ default: mod.default })),
);
const OracleView = lazy(() =>
  import("@/features/oracle/views/OracleView").then((mod) => ({ default: mod.OracleView })),
);
const AgentTelemetryDashboard = lazy(() =>
  import("@/features/monitoring/views/AgentTelemetryDashboard").then((mod) => ({ default: mod.AgentTelemetryDashboard })),
);
const AgentsHub = lazy(() =>
  import("@/features/agents/views/AgentsHub").then((mod) => ({ default: mod.AgentsHub })),
);
const WorkbenchView = lazy(() =>
  import("@/features/benchmarks/views/WorkbenchView").then((mod) => ({ default: mod.WorkbenchView })),
);
const ObservabilityView = lazy(() =>
  import("@/features/observability/views/ObservabilityView").then((mod) => ({ default: mod.ObservabilityView })),
);
const CostDashboard = lazy(() =>
  import("@/features/admin/components/CostDashboard").then((mod) => ({ default: mod.CostDashboard })),
);
const SubconsciousDashboard = lazy(() =>
  import("@/features/monitoring/views/SubconsciousDashboard").then((mod) => ({ default: mod.SubconsciousDashboard })),
);
const TrajectoryConsole = lazy(() =>
  import("@/features/monitoring/views/TrajectoryConsole").then((mod) => ({ default: mod.TrajectoryConsole })),
);
const RunCompareView = lazy(() =>
  import("@/features/monitoring/views/RunCompareView").then((mod) => ({ default: mod.RunCompareView })),
);
const SavingsDashboard = lazy(() =>
  import("@/features/monitoring/views/SavingsDashboard").then((mod) => ({ default: mod.SavingsDashboard })),
);
const JudgeDashboard = lazy(() =>
  import("@/features/monitoring/views/JudgeDashboard").then((mod) => ({ default: mod.JudgeDashboard })),
);
const HyperLoopDashboard = lazy(() =>
  import("@/features/monitoring/views/HyperLoopDashboard").then((mod) => ({ default: mod.HyperLoopDashboard })),
);
const ImprovementTimeline = lazy(() =>
  import("@/features/monitoring/views/ImprovementTimeline").then((mod) => ({ default: mod.ImprovementTimeline })),
);
const ChatHome = lazy(() =>
  import("@/features/chat/views/ChatHome").then((mod) => ({ default: mod.ChatHome })),
);
const ReportsHome = lazy(() =>
  import("@/features/reports/views/ReportsHome").then((mod) => ({ default: mod.ReportsHome })),
);
const NudgesHome = lazy(() =>
  import("@/features/nudges/views/NudgesHome").then((mod) => ({ default: mod.NudgesHome })),
);
const MeHome = lazy(() =>
  import("@/features/me/views/MeHome").then((mod) => ({ default: mod.MeHome })),
);
const FounderWorkspaceHome = lazy(() =>
  import("@/features/founder/views/FounderWorkspaceHome").then((mod) => ({ default: mod.FounderWorkspaceHome })),
);
const FounderPacketsHome = lazy(() =>
  import("@/features/founder/views/FounderPacketsHome").then((mod) => ({ default: mod.FounderPacketsHome })),
);
const FounderHistoryHome = lazy(() =>
  import("@/features/founder/views/FounderHistoryHome").then((mod) => ({ default: mod.FounderHistoryHome })),
);
const FounderConnectHome = lazy(() =>
  import("@/features/founder/views/FounderConnectHome").then((mod) => ({ default: mod.FounderConnectHome })),
);
const LibraryHome = lazy(() =>
  import("@/features/founder/views/LibraryHome").then((mod) => ({ default: mod.LibraryHome })),
);

const SURFACE_SKELETON_VARIANT: Record<CockpitSurfaceId, "default" | "ask" | "research" | "telemetry" | "memo" | "trace" | "documents"> = {
  ask: "ask",
  memo: "memo",
  research: "research",
  investigate: "default",
  compare: "default",
  editor: "documents",
  graph: "default",
  trace: "trace",
  telemetry: "telemetry",
  // Canonical founder surfaces
  workspace: "default",
  packets: "default",
  history: "default",
  connect: "default",
  library: "documents",
};

const MAX_CACHED_SURFACES = 4;
const DIRECT_ROUTE_COMPONENT_EXCLUSIONS = new Set<MainView>([
  "control-plane",
  "research",
  "documents",
  "spreadsheets",
  "calendar",
  "roadmap",
  "timeline",
  "entity",
  "receipts",
  "delegation",
  "oracle",
]);

interface ActiveSurfaceHostProps {
  currentSurface: CockpitSurfaceId;
  currentView: MainView;
  panel?: string | null;
  entityName: string | null;
  selectedSpreadsheetId: Id<"spreadsheets"> | null;
  setSelectedSpreadsheetId: (id: Id<"spreadsheets"> | null) => void;
  selectedDocumentId: Id<"documents"> | null;
  onDocumentSelect: (id: Id<"documents"> | null) => void;
  isGridMode: boolean;
  setIsGridMode: React.Dispatch<React.SetStateAction<boolean>>;
  selectedTaskId: Id<"tasks"> | null;
  selectedTaskSource: "today" | "upcoming" | "week" | "other" | null;
  onSelectTask: (id: Id<"tasks">, source: "today" | "upcoming" | "week" | "other") => void;
  onClearTaskSelection: () => void;
  showResearchDossier: boolean;
  setShowResearchDossier: (show: boolean) => void;
  researchHubInitialTab: ResearchTab;
  setResearchHubInitialTab: (tab: ResearchTab) => void;
  activeSources: string[];
  setActiveSources: React.Dispatch<React.SetStateAction<string[]>>;
  setCurrentView: (view: MainView) => void;
  setEntityName: (name: string | null) => void;
  onNavigateToView: (view: MainView) => void;
  onOpenFastAgent: () => void;
  onOpenFastAgentWithPrompt?: (prompt: string) => void;
  isUnknownRoute?: boolean;
}

function deriveMounted(prev: CockpitSurfaceId[], active: CockpitSurfaceId) {
  const next = prev.filter((id) => id !== active);
  next.push(active);
  return next.slice(-MAX_CACHED_SURFACES);
}

function SurfaceFrame({
  surfaceId,
  active,
  entityName,
  children,
}: {
  surfaceId: CockpitSurfaceId;
  active: boolean;
  entityName: string | null;
  children: React.ReactNode;
}) {
  const location = useLocation();
  const title = SURFACE_TITLES[surfaceId] ?? surfaceId;

  return (
    <AgentScreen
      className={active ? "h-full overflow-auto" : "hidden"}
      screenId={`surface:${surfaceId}`}
      screenTitle={title}
      screenPath={location.pathname + location.search}
      routeView={`surface:${surfaceId}`}
      data-surface-id={surfaceId}
      data-surface-mode={surfaceId}
      data-surface-entity={entityName ?? ""}
      data-surface-status={active ? "active" : "cached"}
      data-active-scope-id={active ? `${surfaceId}:active` : `${surfaceId}:cached`}
    >
      {children}
    </AgentScreen>
  );
}

const TELEMETRY_TABS = [
  { id: "activity", label: "Activity" },
  { id: "quality", label: "Quality" },
  { id: "runs", label: "Runs" },
  { id: "cost", label: "Cost" },
  { id: "subconscious", label: "Memory" },
] as const;

type TelemetryTabId = (typeof TELEMETRY_TABS)[number]["id"];

function TelemetryStack({ active = true }: { active?: boolean }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get("tab");
  const activeTab: TelemetryTabId =
    TELEMETRY_TABS.some((t) => t.id === rawTab) ? (rawTab as TelemetryTabId) : "activity";

  const setTab = useCallback(
    (tab: TelemetryTabId) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("tab", tab);
        return next;
      });
    },
    [setSearchParams],
  );

  // Live metrics with demo fallback
  const api = useConvexApi();
  const agentStats = useQuery(
    active && api?.domains.agents.agentHubQueries.getAgentStats
      ? api.domains.agents.agentHubQueries.getAgentStats
      : "skip",
    active ? {} : "skip",
  );

  const receipts = useQuery(
    active && api?.domains.agents.receipts.actionReceipts.list
      ? api.domains.agents.receipts.actionReceipts.list
      : "skip",
    active ? { limit: 200 } : "skip",
  );
  const isLive = agentStats !== undefined && receipts !== undefined && (receipts?.length ?? 0) > 0;

  const daySeed = Math.floor(Date.now() / 86400000) % 5;
  const DEMO_HEALTH = [96, 97, 98, 99, 98] as const;
  const DEMO_ACTIONS = [41, 47, 53, 38, 45] as const;
  const DEMO_DENIED = [1, 2, 3, 1, 2] as const;

  const healthPct = isLive ? (agentStats?.successRate ?? 98) : DEMO_HEALTH[daySeed];
  const actionsTraced = isLive ? (receipts?.length ?? 0) : DEMO_ACTIONS[daySeed];
  const deniedCount = isLive
    ? (receipts?.filter((r: any) => r.approval?.state === "denied" || r.result?.success === false).length ?? 0)
    : DEMO_DENIED[daySeed];
  const healthLabel = healthPct >= 90 ? "Healthy" : healthPct >= 70 ? "Degraded" : "At Risk";
  const healthColor = healthPct >= 90 ? "text-emerald-400" : healthPct >= 70 ? "text-amber-400" : "text-rose-400";

  return (
    <div className="flex h-full flex-col items-center overflow-auto px-4 pb-24 pt-12">
      {/* Headline — matches Ask/Library/Connect */}
      <h1 className="text-center text-3xl font-bold text-content sm:text-4xl">
        Getting <span className="text-accent-primary">better</span> every run
      </h1>
      <p className="mt-3 max-w-lg text-center text-sm text-content-muted">
        See how search quality, evidence coverage, and cost efficiency improve over time.
      </p>
      <DataSourceBanner className="mt-3" />

      {/* Compact metrics row */}
      <div className="mt-8 flex w-full max-w-3xl items-center justify-center gap-8 sm:gap-12">
        <div className="text-center">
          <div className={`text-3xl font-bold tabular-nums ${healthColor}`}>{healthPct}%</div>
          <div className="mt-1 text-[11px] text-content-muted">{healthLabel}</div>
        </div>
        <div className="h-8 w-px bg-white/[0.06]" />
        <div className="text-center">
          <div className="text-3xl font-bold tabular-nums text-content">{actionsTraced}</div>
          <div className="mt-1 text-[11px] text-content-muted">Actions</div>
        </div>
        <div className="h-8 w-px bg-white/[0.06]" />
        <div className="text-center">
          <div className="text-3xl font-bold tabular-nums text-content">{deniedCount}</div>
          <div className="mt-1 text-[11px] text-content-muted">Denied</div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="mt-8 flex w-full max-w-3xl gap-1 border-b border-white/[0.06]" role="tablist">
        {TELEMETRY_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "border-b-2 border-accent-primary text-content"
                : "text-content-muted hover:text-content-secondary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="mt-4 w-full max-w-3xl rounded-xl border border-white/[0.06] bg-white/[0.02] p-5" role="tabpanel">
        {activeTab === "activity" && <AgentTelemetryDashboard />}
        {/* Quality: HyperLoop + Improvements + Verdicts */}
        {activeTab === "quality" && (
          <div className="space-y-6">
            <ImprovementTimeline />
            <HyperLoopDashboard />
            <JudgeDashboard />
          </div>
        )}
        {/* Runs: Trajectory + Compare */}
        {activeTab === "runs" && (
          <div className="space-y-6">
            <TrajectoryConsole session={null} />
            <RunCompareView />
          </div>
        )}
        {/* Cost: Savings + Spend + Health */}
        {activeTab === "cost" && (
          <div className="space-y-6">
            <SavingsDashboard />
            <CostDashboard />
            <ObservabilityView />
          </div>
        )}
        {activeTab === "subconscious" && <SubconsciousDashboard />}
      </div>
    </div>
  );
}

export function ActiveSurfaceHost(props: ActiveSurfaceHostProps) {
  const {
    currentSurface,
    currentView,
    panel,
    entityName,
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
    researchHubInitialTab,
    setResearchHubInitialTab,
    activeSources,
    setActiveSources,
    setCurrentView,
    setEntityName,
    onNavigateToView,
    onOpenFastAgent,
    onOpenFastAgentWithPrompt,
    isUnknownRoute,
  } = props;
  const navigate = useNavigate();
  const mountedRef = useRef<CockpitSurfaceId[]>([currentSurface]);
  mountedRef.current = deriveMounted(mountedRef.current, currentSurface);

  const navigateToSurface = (surfaceId: CockpitSurfaceId, extras?: { tab?: string | null }) => {
    navigate(buildCockpitPath({ surfaceId, entity: entityName, tab: extras?.tab ?? null }));
  };

  const renderSurface = (surfaceId: CockpitSurfaceId) => {
    const directRouteComponent =
      currentView !== getDefaultViewForSurface(surfaceId) &&
      !DIRECT_ROUTE_COMPONENT_EXCLUSIONS.has(currentView)
        ? VIEW_MAP[currentView]?.component
        : null;

    if (directRouteComponent) {
      const DirectRouteComponent = directRouteComponent;
      return <DirectRouteComponent />;
    }

    switch (surfaceId) {
      case "ask":
        if (isUnknownRoute) {
          return <NotFoundPage />;
        }
        return <HomeLanding />;
      case "memo":
        return <DecisionMemoView />;
      case "research":
        return (
          <ResearchHub
            embedded
            initialTab={researchHubInitialTab}
            onTabChange={(tab) => setResearchHubInitialTab(tab as typeof researchHubInitialTab)}
            onGoHome={() => navigateToSurface("ask")}
            onNavigateToPath={(path) => navigate(path)}
            onDocumentSelect={(id) => onDocumentSelect(id as Id<"documents">)}
            onEnterWorkspace={() => navigateToSurface("editor")}
            activeSources={activeSources}
            onToggleSource={(sourceId) =>
              setActiveSources((prev) =>
                prev.includes(sourceId) ? prev.filter((id) => id !== sourceId) : [...prev, sourceId],
              )
            }
          />
        );
      case "investigate":
        return <EnterpriseInvestigationView />;
      case "compare":
        return <PostmortemView />;
      case "editor":
        if (currentView === "spreadsheets") {
          return selectedSpreadsheetId ? (
            <SpreadsheetSheetView
              sheetId={selectedSpreadsheetId}
              onBack={() => {
                setSelectedSpreadsheetId(null);
                setCurrentView("documents");
                navigateToSurface("editor");
              }}
            />
          ) : (
            <SpreadsheetsHub
              onOpenSheet={(id: Id<"spreadsheets">) => {
                setSelectedSpreadsheetId(id);
                setCurrentView("spreadsheets");
              }}
            />
          );
        }

        if (currentView === "calendar") {
          return (
            <CalendarHomeHub
              onDocumentSelect={onDocumentSelect}
              onGridModeToggle={() => setIsGridMode((value) => !value)}
            />
          );
        }

        if (currentView === "agents") {
          return <AgentsHub />;
        }

        if (currentView === "roadmap" || currentView === "timeline") {
          return <TimelineRoadmapView />;
        }

        return (
          <DocumentsHomeHub
            selectedDocumentId={selectedDocumentId}
            onDocumentSelect={onDocumentSelect}
            isGridMode={isGridMode}
            setIsGridMode={setIsGridMode}
            selectedTaskId={selectedTaskId}
            selectedTaskSource={selectedTaskSource}
            onSelectTask={onSelectTask}
            onClearTaskSelection={onClearTaskSelection}
          />
        );
      case "graph":
        return entityName ? (
          <EntityProfilePage
            entityName={entityName}
            onBack={() => {
              setEntityName(null);
              navigateToSurface("research");
              setResearchHubInitialTab("overview");
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-content-muted">
            Select an entity to inspect the graph surface.
          </div>
        );
      case "trace":
        return (
          <div className="flex h-full flex-col gap-4 overflow-auto px-4 pb-24 pt-4">
            {panel === "permissions" || currentView === "delegation" ? (
              <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-content-muted">Permissions</div>
                <DelegationShowcase />
              </section>
            ) : null}
            <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
              <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-content-muted">Agent Actions</div>
              <ActionReceiptFeed />
            </section>
            <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
              <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-content-muted">Execution Trace</div>
              <ExecutionTraceView />
            </section>
          </div>
        );
      case "telemetry":
        return <TelemetryStack active={surfaceId === currentSurface} />;
      // ── Canonical founder surfaces ──────────────────────────────────
      case "workspace":
        return <ChatHome />;
      case "packets":
        return <ReportsHome />;
      case "history":
        return <NudgesHome />;
      case "connect":
        return <MeHome />;
      case "library":
        return (
          <LibraryHome
            selectedDocumentId={selectedDocumentId}
            onDocumentSelect={onDocumentSelect}
            isGridMode={isGridMode}
            setIsGridMode={setIsGridMode}
            selectedTaskId={selectedTaskId}
            selectedTaskSource={selectedTaskSource}
            onSelectTask={onSelectTask}
            onClearTaskSelection={onClearTaskSelection}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative h-full min-w-0 flex-1 overflow-hidden">
      {mountedRef.current.map((surfaceId) => (
        <SurfaceFrame
          key={surfaceId}
          surfaceId={surfaceId}
          active={surfaceId === currentSurface}
          entityName={entityName}
        >
          <ErrorBoundary title={`${SURFACE_TITLES[surfaceId]} failed to load`}>
            <Suspense fallback={<ViewSkeleton variant={SURFACE_SKELETON_VARIANT[surfaceId] ?? "default"} />}>{renderSurface(surfaceId)}</Suspense>
          </ErrorBoundary>
        </SurfaceFrame>
      ))}
    </div>
  );
}

export default ActiveSurfaceHost;
