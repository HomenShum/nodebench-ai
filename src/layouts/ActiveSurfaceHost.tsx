import { lazy, Suspense, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Id } from "../../convex/_generated/dataModel";
import { ErrorBoundary } from "@/shared/components/ErrorBoundary";
import { ViewSkeleton } from "@/components/skeletons";
import { AgentScreen } from "@/shared/agent-ui/AgentScreen";
import {
  getDefaultViewForSurface,
  type CockpitSurfaceId,
  type MainView,
  type ResearchTab,
  SURFACE_TITLES,
  VIEW_MAP,
} from "@/lib/registry/viewRegistry";

/* ── Lazy imports: 5 product surfaces + EntityPage + NotFound ─────── */
const HomeLanding = lazy(() =>
  import("@/features/home/views/HomeLanding").then((mod) => ({ default: mod.HomeLanding })),
);
const NotFoundPage = lazy(() =>
  import("@/features/controlPlane/views/NotFoundPage").then((mod) => ({ default: mod.NotFoundPage })),
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

const SURFACE_SKELETON_VARIANT: Record<CockpitSurfaceId, "default" | "ask"> = {
  ask: "ask",
  workspace: "default",
  packets: "default",
  history: "default",
  connect: "default",
  trace: "default",
};

const MAX_CACHED_SURFACES = 4;
const DIRECT_ROUTE_COMPONENT_EXCLUSIONS = new Set<MainView>([
  "control-plane",
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
  selectedTaskId: Id<"userEvents"> | null;
  selectedTaskSource: "today" | "upcoming" | "week" | "other" | null;
  onSelectTask: (id: Id<"userEvents">, source: "today" | "upcoming" | "week" | "other") => void;
  onClearTaskSelection: () => void;
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

export function ActiveSurfaceHost(props: ActiveSurfaceHostProps) {
  const {
    currentSurface,
    currentView,
    entityName,
    isUnknownRoute,
  } = props;
  const mountedRef = useRef<CockpitSurfaceId[]>([currentSurface]);
  mountedRef.current = deriveMounted(mountedRef.current, currentSurface);

  const renderSurface = (surfaceId: CockpitSurfaceId) => {
    const directRouteComponent =
      surfaceId === currentSurface && !DIRECT_ROUTE_COMPONENT_EXCLUSIONS.has(currentView)
        ? VIEW_MAP[currentView]?.component
        : null;

    if (directRouteComponent) {
      const DirectRouteComponent = directRouteComponent;
      return <DirectRouteComponent />;
    }

    const defaultViewComponent =
      !DIRECT_ROUTE_COMPONENT_EXCLUSIONS.has(getDefaultViewForSurface(surfaceId))
        ? VIEW_MAP[getDefaultViewForSurface(surfaceId)]?.component
        : null;

    if (defaultViewComponent) {
      const DefaultViewComponent = defaultViewComponent;
      return <DefaultViewComponent />;
    }

    switch (surfaceId) {
      case "ask":
        if (isUnknownRoute) {
          return <NotFoundPage />;
        }
        return <HomeLanding />;
      case "workspace":
        return <ChatHome />;
      case "packets":
        return <ReportsHome />;
      case "history":
        return <NudgesHome />;
      case "connect":
        return <MeHome />;
      case "trace":
        return <NotFoundPage />;
      default:
        return <HomeLanding />;
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
