import { useState, useEffect, useRef, useCallback, useMemo, startTransition, Suspense, lazy } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useConvexAuth, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { CleanSidebar } from "./CleanSidebar";
// Agent Chat Panel removed

import { Sparkles, Zap, Menu, X as CloseIcon, Search, ChevronRight, Settings as SettingsIcon, Loader2 } from "lucide-react";
import { useContextPills } from "../hooks/contextPills";
import HashtagQuickNotePopover from "./HashtagQuickNotePopover";
import MiniEditorPopover from "@/shared/components/MiniEditorPopover";
import { useFastAgent } from "@/features/agents/context/FastAgentContext";
import { CommandPalette } from "./CommandPalette";
import { useCommandPalette } from "../hooks/useCommandPalette";
import { QuickCaptureWidget } from "./QuickCapture";
import { ErrorBoundary } from "@/shared/components/ErrorBoundary";
import { usePanelResize } from "../hooks/usePanelResize";
import { useMainLayoutRouting, type MainView } from "../hooks/useMainLayoutRouting";
import { useGlobalEventListeners } from "../hooks/useGlobalEventListeners";
import { FocalArea } from "../layouts/FocalArea";
import { ViewSkeleton } from "./skeletons";
import { AgentMetadata } from "./AgentMetadata";
import { ViewBreadcrumbs } from "./ViewBreadcrumbs";
import { useViewWebMcpTools } from "../hooks/useViewWebMcpTools";
import { VIEW_PATH_MAP, VIEW_TITLES, VIEW_SUBTITLES, resolvePathToView, WORKSPACE_SURFACE_VIEWS, AGENTS_SURFACE_VIEWS, RESEARCH_SURFACE_VIEWS, GROUP_VIEW_MAP, VIEW_MAP } from "@/lib/viewRegistry";
import { buildViewBreadcrumbs } from "@/lib/registry/viewBreadcrumbs";
import { OracleSessionBanner } from "./OracleSessionBanner";
import { useOracleSessionContext } from "@/contexts/OracleSessionContext";
import {
  deriveChecklistCompletionsFromRoute,
  loadBuyerChecklistState,
  mergeChecklistCompletions,
  saveBuyerChecklistState,
} from "@/features/controlPlane/lib/onboardingState";

const FastAgentPanel = lazy(() =>
  import("@features/agents/components/FastAgentPanel/FastAgentPanel").then((mod) => ({
    default: mod.FastAgentPanel,
  })),
);
const SettingsModal = lazy(() => import("./SettingsModal"));

// Prefetch likely next routes after idle (perceived-performance optimization).
// Uses requestIdleCallback where available, falls back to 2s setTimeout.
const prefetchRoutes = () => {
  const prefetch = () => {
    import("@/features/research/views/ResearchHub").catch(() => {});
    import("@/features/documents/components/DocumentsHomeHub").catch(() => {});
    import("@/features/agents/views/AgentsHub").catch(() => {});
    // NOTE(coworker): Proactively warm these chunks to prevent lazy-route error flashes
    // during rapid dogfood navigation and QA capture loops.
    import("@/features/benchmarks/views/WorkbenchView").catch(() => {});
    import("@/features/dogfood/views/DogfoodReviewView").catch(() => {});
    // NOTE(coworker): Keep primary "More" section routes warm to avoid blank transitions.
    import("@/features/analytics/views/ComponentMetricsDashboard").catch(() => {});
    import("@/components/IndustryUpdatesPanel").catch(() => {});
    import("@/components/CostDashboard").catch(() => {});
    import("@/features/research/components/ForYouFeed").catch(() => {});
    import("@/features/agents/views/PublicActivityView").catch(() => {});
    import("@/features/research/components/GitHubExplorer").catch(() => {});
    import("@/features/monitoring/components/PRSuggestions").catch(() => {});
    import("@/features/research/views/PublicSignalsLog").catch(() => {});
    import("@/features/research/views/FootnotesPage").catch(() => {});
  };
  if ("requestIdleCallback" in window) {
    (window as any).requestIdleCallback(prefetch, { timeout: 1200 });
  } else {
    window.setTimeout(prefetch, 450);
  }
};

// Fire once on module load (after initial render settles)
if (typeof window !== "undefined") {
  window.setTimeout(prefetchRoutes, 250);
}

const viewFallback = <ViewSkeleton variant="default" />;

// VIEW_TITLES and VIEW_SUBTITLES imported from @/lib/viewRegistry (single source of truth)

// Derived from viewRegistry route groups — no more hardcoded view lists
const WORKSPACE_ROOT_VIEWS = new Set([...WORKSPACE_SURFACE_VIEWS, ...AGENTS_SURFACE_VIEWS]);
const RESEARCH_ROOT_VIEWS = new Set([...RESEARCH_SURFACE_VIEWS, ...GROUP_VIEW_MAP.internal]);

interface MainLayoutProps {
  selectedDocumentId: Id<"documents"> | null;
  onDocumentSelect: (documentId: Id<"documents"> | null) => void;
  onShowWelcome?: () => void;
  onShowResearchHub?: () => void;
}

export function MainLayout({ selectedDocumentId, onDocumentSelect, onShowWelcome: _onShowWelcome, onShowResearchHub }: MainLayoutProps) {
  // Agent Chat Panel removed
  const [showFastAgent, setShowFastAgent] = useState(false);
  const [fastAgentHasMounted, setFastAgentHasMounted] = useState(false);

  // Hook 1: Routing & Navigation
  const {
    currentView,
    setCurrentView,
    entityName,
    setEntityName,
    selectedSpreadsheetId,
    setSelectedSpreadsheetId,
    showResearchDossier,
    setShowResearchDossier,
    researchHubInitialTab,
    setResearchHubInitialTab,
    setIsTransitioning,
  } = useMainLayoutRouting();

  const location = useLocation();
  const navigate = useNavigate();
  const resolvedRoute = useMemo(() => resolvePathToView(location.pathname || "/"), [location.pathname]);

  const viewResetKey = `${location.pathname}:${currentView}:${String(selectedSpreadsheetId ?? "")}:${String(entityName ?? "")}:${showResearchDossier ? "dossier" : "home"}:${researchHubInitialTab}`;

  useEffect(() => {
    if (location.pathname === "/" || location.pathname === "") return;
    if (currentView === resolvedRoute.view) return;

    setCurrentView(resolvedRoute.view);
    setShowResearchDossier(false);
    setResearchHubInitialTab(resolvedRoute.researchTab);
    setEntityName(resolvedRoute.entityName);
    setSelectedSpreadsheetId(
      resolvedRoute.spreadsheetId ? (resolvedRoute.spreadsheetId as Id<"spreadsheets">) : null,
    );
  }, [
    currentView,
    location.pathname,
    resolvedRoute.entityName,
    resolvedRoute.researchTab,
    resolvedRoute.spreadsheetId,
    resolvedRoute.view,
    setCurrentView,
    setEntityName,
    setResearchHubInitialTab,
    setSelectedSpreadsheetId,
    setShowResearchDossier,
  ]);

  // Per-view WebMCP tools — register contextual tools when view changes
  const webmcpViewEnabled = typeof navigator !== "undefined" && !!navigator.modelContext;
  useViewWebMcpTools(currentView, webmcpViewEnabled);

  // Oracle session context — for cross-check status banner
  const oracleSession = useOracleSessionContext();

  // User stats for unread briefings badge
  const userStats = useQuery(api.domains.auth.userStats.getUserActivitySummary);
  // Current user for avatar
  const user = useQuery(api.domains.auth.auth.loggedInUser);
  // Authentication state
  const { isAuthenticated } = useConvexAuth();
  const { signIn } = useAuthActions();
  const [isAnonSigningIn, setIsAnonSigningIn] = useState(false);
  const [previewBannerDismissed, setPreviewBannerDismissed] = useState(() => {
    try { return localStorage.getItem("nodebench_preview_dismissed") === "1"; } catch { return false; }
  });
  // Show guest CTA when not authenticated and not dismissed
  // Preview CTA is useful on the "home" surface, but is distracting when it persists across every route.
  const showGuestWorkspaceCta =
    !isAuthenticated &&
    !user &&
    !previewBannerDismissed &&
    (currentView === "control-plane" || (currentView === "research" && !showResearchDossier));

  // Handle anonymous sign in
  const handleAnonymousSignIn = useCallback(async () => {
    setIsAnonSigningIn(true);
    try {
      await signIn("anonymous");
    } catch (error) {
      console.error("Anonymous sign-in failed:", error);
      toast.error("Failed to sign in anonymously");
    } finally {
      setIsAnonSigningIn(false);
    }
  }, [signIn]);

  const [isGridMode, setIsGridMode] = useState(false);
  // Task selection state for DocumentsHomeHub
  const [selectedTaskId, setSelectedTaskId] = useState<Id<"tasks"> | null>(null);
  const [selectedTaskSource, setSelectedTaskSource] = useState<"today" | "upcoming" | "week" | "other" | null>(null);
  
  const handleSelectTask = useCallback((id: Id<"tasks">, source: "today" | "upcoming" | "week" | "other") => {
    setSelectedTaskId(id);
    setSelectedTaskSource(source);
  }, []);
  
  const clearTaskSelection = useCallback(() => {
    setSelectedTaskId(null);
    setSelectedTaskSource(null);
  }, []);
  // Mobile sidebar state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  // Multi-document selection for Fast Agent
  const [selectedDocumentIdsForAgent, setSelectedDocumentIdsForAgent] = useState<Id<"documents">[]>([]);
  // App mode state for sidebar navigation
  const [appMode, setAppMode] = useState<'workspace' | 'fast-agent' | 'deep-agent' | 'dossier'>('workspace');
  // Active sources state for research
  const [activeSources, setActiveSources] = useState<string[]>(['ycombinator', 'techcrunch', 'reddit', 'twitter', 'github', 'arxiv']);
  // Removed AIChatPanel quick prompt handoff
  const [isDarkMode] = useState(() => {
    // Check localStorage for saved theme preference
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });
  // Removed MCP panel state (was used inside AIChatPanel)
  // Hashtag quick note popover state
  const [hashtagPopover, setHashtagPopover] = useState<{
    dossierId: Id<"documents">;
    hashtag: string;
    anchorEl: HTMLElement;
  } | null>(null);
  // Mention mini editor popover state
  const [mentionPopover, setMentionPopover] = useState<{
    documentId: Id<"documents">;
    anchorEl: HTMLElement;
  } | null>(null);
  // Fast Agent thread navigation (for inline agent "View in Panel" link)
  const [fastAgentThreadId, setFastAgentThreadId] = useState<string | null>(null);
  // Settings modal state
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsInitialTab, setSettingsTab] = useState<string>('usage');
  const [viewportMode, setViewportMode] = useState<"mobile" | "tablet" | "desktop">(() => {
    if (typeof window === "undefined") return "desktop";
    if (window.innerWidth < 768) return "mobile";
    if (window.innerWidth < 1024) return "tablet";
    return "desktop";
  });

  // Open settings modal with optional tab
  const openSettings = useCallback((tab?: string) => {
    if (tab) setSettingsTab(tab);
    setShowSettingsModal(true);
  }, []);
  // Removed MCP panel persistence and shortcut (no AIChatPanel)

  // Command Palette state with global Cmd/Ctrl+K shortcut
  const commandPalette = useCommandPalette();
  const routeKey = `${currentView}:${showResearchDossier ? "hub" : "home"}`;
  const previousRouteKeyRef = useRef(routeKey);
  const [isResearchButtonPressed, setIsResearchButtonPressed] = useState(false);
  const [isOpeningResearchHub, setIsOpeningResearchHub] = useState(false);
  const [isAssistantButtonPressed, setIsAssistantButtonPressed] = useState(false);

  useEffect(() => {
    if (previousRouteKeyRef.current !== routeKey && commandPalette.isOpen) {
      commandPalette.close();
    }
    previousRouteKeyRef.current = routeKey;
  }, [routeKey, commandPalette.isOpen, commandPalette.close]);

  useEffect(() => {
    if (!isResearchButtonPressed) return;
    const timer = window.setTimeout(() => setIsResearchButtonPressed(false), 220);
    return () => window.clearTimeout(timer);
  }, [isResearchButtonPressed]);

  useEffect(() => {
    // NOTE(coworker): Keep this explicit visual feedback while navigation resolves.
    if (currentView === "research" && showResearchDossier) {
      setIsOpeningResearchHub(false);
      return;
    }
    if (!isOpeningResearchHub) return;
    const timer = window.setTimeout(() => setIsOpeningResearchHub(false), 1400);
    return () => window.clearTimeout(timer);
  }, [currentView, showResearchDossier, isOpeningResearchHub]);

  useEffect(() => {
    if (!isAssistantButtonPressed) return;
    const timer = window.setTimeout(() => setIsAssistantButtonPressed(false), 220);
    return () => window.clearTimeout(timer);
  }, [isAssistantButtonPressed]);

  const navigateToView = useCallback((view: MainView) => {
    setCurrentView(view);
    const targetPath = VIEW_PATH_MAP[view];
    if (targetPath && location.pathname !== targetPath) {
      navigate(targetPath);
    }
  }, [location.pathname, navigate, setCurrentView]);

  const navigateToRouteTarget = useCallback((view: MainView, path?: string) => {
    setCurrentView(view);
    const targetPath = path ?? VIEW_PATH_MAP[view];
    if (targetPath && location.pathname !== targetPath) {
      navigate(targetPath);
    }
  }, [location.pathname, navigate, setCurrentView]);

  const goToResearchHome = useCallback(() => {
    const targetPath = VIEW_PATH_MAP.research ?? '/research';
    setCurrentView('research');
    setShowResearchDossier(false);
    if (location.pathname !== targetPath) {
      navigate(targetPath);
    }
  }, [location.pathname, navigate, setCurrentView, setShowResearchDossier]);

  const goToResearchHub = useCallback((tab: "overview" | "signals" | "briefing" | "forecasts" = "overview") => {
    const resolvedTab = tab === "forecasts" ? "overview" : tab;
    const targetPath = resolvedTab === "overview" ? "/research/overview" : `/research/${resolvedTab}`;
    setCurrentView('research');
    setResearchHubInitialTab(resolvedTab);
    setShowResearchDossier(true);
    if (location.pathname !== targetPath) {
      navigate(targetPath);
    }
  }, [location.pathname, navigate, setCurrentView, setResearchHubInitialTab, setShowResearchDossier]);

  const goToWorkspaceRoot = useCallback(() => {
    const targetPath = VIEW_PATH_MAP.documents ?? "/workspace";
    setCurrentView('documents');
    onDocumentSelect(null);
    if (location.pathname !== targetPath) {
      navigate(targetPath);
    }
  }, [location.pathname, navigate, onDocumentSelect, setCurrentView]);

  const isCommandPaletteDisabled = currentView === "dogfood";

  useEffect(() => {
    // NOTE(coworker): Quality Review is a visual evidence screen; keep it unobstructed.
    if (isCommandPaletteDisabled && commandPalette.isOpen) {
      commandPalette.close();
    }
  }, [isCommandPaletteDisabled, commandPalette.isOpen, commandPalette.close]);
  const commandShortcutLabel =
    typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform)
      ? "⌘K"
      : "Ctrl+K";

  const showCommandShortcutHint =
    typeof window === "undefined"
      ? true
      : !(
          window.matchMedia("(pointer: coarse)").matches ||
          window.matchMedia("(hover: none)").matches ||
          window.innerWidth < 1024 ||
          (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0)
        );
  const showHomeCommandSurface = currentView === "research" && !showResearchDossier;
  const showHeaderCommandTrigger = !showHomeCommandSurface;
  const showResearchHubAction = currentView !== "research";
  const isMobileViewport = viewportMode === "mobile";
  const isTabletViewport = viewportMode === "tablet";
  const surfaceRoot = useMemo(() => {
    // Use parentId from the registry for nested views — enables "back to parent" breadcrumb
    const entry = VIEW_MAP[currentView];
    const parentId = entry?.parentId;
    if (parentId) {
      const parentEntry = VIEW_MAP[parentId];
      const parentTitle = parentEntry?.title ?? VIEW_TITLES[parentId] ?? parentId;
      return {
        page: parentId,
        label: parentTitle,
        onClick: () => navigateToView(parentId),
      };
    }

    if (currentView === "research") {
      return {
        page: "research" as const,
        label: "Research",
        onClick: goToResearchHome,
      };
    }

    if (currentView === "control-plane") {
      return {
        page: "control-plane" as const,
        label: "DeepTrace",
        onClick: () => navigateToView("control-plane"),
      };
    }

    if (WORKSPACE_ROOT_VIEWS.has(currentView)) {
      return {
        page: "workspace" as const,
        label: "Workspace",
        onClick: goToWorkspaceRoot,
      };
    }

    if (RESEARCH_ROOT_VIEWS.has(currentView)) {
      return {
        page: "research" as const,
        label: "Research",
        onClick: goToResearchHome,
      };
    }

    return {
      page: "workspace" as const,
      label: "Workspace",
      onClick: goToWorkspaceRoot,
    };
  }, [currentView, goToResearchHome, goToWorkspaceRoot, navigateToView]);
  const currentSurfaceTitle =
    currentView === "research"
      ? showResearchDossier
        ? "Research hub"
        : "Research"
      : VIEW_TITLES[currentView] || (currentView === "entity" ? entityName || "Entity" : selectedDocumentId ? "Document" : "Workspace");
  const currentSurfaceSubtitle =
    currentView === "research"
      ? showResearchDossier
        ? "Follow the active intelligence stream without losing context."
        : "Use the command deck below for voice, search, and navigation."
      : VIEW_SUBTITLES[currentView] || "Stay oriented while moving between surfaces.";
  const breadcrumbs = useMemo(
    () =>
      buildViewBreadcrumbs({
        currentView,
        researchHubInitialTab,
        showResearchDossier,
      }),
    [currentView, researchHubInitialTab, showResearchDossier],
  );
  const contextChips = [
    selectedDocumentId ? "Document in focus" : null,
    selectedSpreadsheetId ? "Spreadsheet active" : null,
    currentView === "entity" && entityName ? entityName : null,
    showHeaderCommandTrigger ? "Global commands available" : "Voice and command deck below",
  ].filter(Boolean) as string[];

  // Sync Fast Agent panel state with global context
  const {
    registerExternalState,
    openWithContext,
    options: fastAgentOpenOptions,
    clearOptions: clearFastAgentOptions,
  } = useFastAgent();
  const showFastAgentRef = useRef(showFastAgent);
  showFastAgentRef.current = showFastAgent;

  useEffect(() => {
    registerExternalState(
      setShowFastAgent,
      () => showFastAgentRef.current
    );
  }, [registerExternalState]);

  useEffect(() => {
    if (showFastAgent) setFastAgentHasMounted(true);
  }, [showFastAgent]);

  const handleOpenFastAgentWithPrompt = useCallback(
    (prompt: string) => {
      const normalized = prompt.trim();
      if (!normalized) {
        setShowFastAgent(true);
        return;
      }
      openWithContext({ initialMessage: normalized });
    },
    [openWithContext],
  );

  // Removed quick prompt handoff (AIChatPanel removed)

  // Hook 2: Panel Resizing
  const {
    sidebarWidth,
    effectiveSidebarWidth,
    isSidebarCollapsed,
    toggleSidebarCollapse,
    startSidebarResizing,
    agentPanelWidth,
    startAgentResizing,
  } = usePanelResize();

  // Hook 3: Global Event Listeners
  useGlobalEventListeners({
    setShowFastAgent,
    setFastAgentThreadId,
    setSelectedDocumentIdsForAgent,
    setCurrentView,
    navigateToView,
    onDocumentSelect,
    setIsGridMode,
    setIsTransitioning,
    setMentionPopover,
    setHashtagPopover,
    openSettings,
  });

  // Deep link: ?doc=ID switches to documents view and selects the document
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const docId = params.get('doc');
    if (docId) {
      setCurrentView('documents');
      onDocumentSelect(docId as Id<"documents">);
    }
  }, [location.search, setCurrentView, onDocumentSelect]);

  useEffect(() => {
    const completions = deriveChecklistCompletionsFromRoute({
      currentView,
      showResearchDossier,
      researchHubInitialTab,
    });
    if (completions.length === 0) return;

    const stored = loadBuyerChecklistState();
    const next = mergeChecklistCompletions(stored, completions);
    if (next !== stored) {
      saveBuyerChecklistState(next);
    }
  }, [currentView, researchHubInitialTab, showResearchDossier]);

  useEffect(() => {
    const computeViewportMode = () => {
      if (window.innerWidth < 768) return "mobile" as const;
      if (window.innerWidth < 1024) return "tablet" as const;
      return "desktop" as const;
    };

    const updateViewportMode = () => {
      setViewportMode(computeViewportMode());
    };

    updateViewportMode();
    window.addEventListener("resize", updateViewportMode);
    return () => window.removeEventListener("resize", updateViewportMode);
  }, []);

  useEffect(() => {
    if (!isMobileViewport) {
      setIsMobileSidebarOpen(false);
    }
  }, [isMobileViewport]);

  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [location.pathname, currentView]);

  const effectiveSidebarMode = isTabletViewport ? true : isSidebarCollapsed;
  const sidebarViewportWidth = isMobileViewport
    ? Math.min(sidebarWidth, 320)
    : isTabletViewport
      ? 72
      : effectiveSidebarWidth;


  return (
    <div className="h-screen flex bg-surface transition-colors duration-200">
      {/* Agent traversability: JSON-LD metadata for external crawlers */}
      <AgentMetadata currentView={currentView} currentPath={location.pathname} />

      {/* Mobile Sidebar Overlay */}
      {isMobileViewport && isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Resizable Width on Desktop, Overlay on Mobile */}
      <div
        className={`
           flex-shrink-0 h-full bg-surface border-r border-edge z-50 transition-[transform,width] duration-200
           md:relative md:translate-x-0
           fixed inset-y-0 left-0
           ${isMobileViewport ? (isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0'}
         `}
        style={{ width: `${sidebarViewportWidth}px` }}
      >
        <CleanSidebar
          appMode={appMode}
          onModeChange={setAppMode}
          activeSources={activeSources}
          onToggleSource={(sourceId) => {
            setActiveSources(prev =>
              prev.includes(sourceId)
                ? prev.filter(id => id !== sourceId)
                : [...prev, sourceId]
            );
          }}
          onOpenSettings={openSettings}
          onGoHome={goToResearchHome}
          onEnterResearchHub={() => goToResearchHub("overview")}
          selectedDocumentId={selectedDocumentId}
          onDocumentSelect={onDocumentSelect}
          currentView={currentView}
          onViewChange={navigateToView}
          isCollapsed={effectiveSidebarMode}
          onToggleCollapse={toggleSidebarCollapse}
          showGuestPreviewFooter={showGuestWorkspaceCta}
        />
      </div>

      {/* Sidebar Resize Handle - Desktop Only */}
      <div
        className="hidden lg:block w-1 bg-surface-secondary hover:bg-surface-hover cursor-col-resize transition-colors duration-200 flex-shrink-0"
        onMouseDown={startSidebarResizing}
      />

      {/* Remaining Space Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main Content Area */}
        <div
          className="flex flex-col overflow-hidden"
          style={{ width: '100%' }}
        >
          {/* Top Bar — Linear-style with breadcrumb + Cmd+K */}
          <div className="h-12 bg-surface/95 supports-[backdrop-filter]:bg-surface/90 backdrop-blur-md border-b border-edge px-4 sm:px-5 flex items-center transition-colors duration-200 relative z-sticky">
            {/* Left: hamburger + breadcrumb */}
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
                className="md:hidden p-1.5 rounded-md text-content-muted hover:text-content hover:bg-surface-hover transition-all duration-200 active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                aria-label={isMobileSidebarOpen ? "Close menu" : "Open menu"}
              >
                {isMobileSidebarOpen ? <CloseIcon className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>

              {/* Breadcrumb */}
              <nav className="flex items-center gap-1 text-[13px] min-w-0">
                {currentView === 'research' && showResearchDossier ? (
                  <span className="font-medium text-content truncate">Research Hub</span>
                ) : (
                  <button
                    type="button"
                    onClick={surfaceRoot.onClick}
                    className="text-content-muted hover:text-content-secondary transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-sm px-1"
                    data-agent-id="chrome:nav:home"
                    data-agent-action="navigate"
                    data-agent-label={`Go to ${surfaceRoot.label}`}
                    data-agent-target={surfaceRoot.page}
                  >
                    {surfaceRoot.label}
                  </button>
                )}
                {currentView !== 'research' && currentView !== 'control-plane' && (
                  <>
                    <span aria-hidden="true" className="text-content-muted shrink-0 text-xs">
                      /
                    </span>
                    <span className="font-medium text-content truncate">
                      {VIEW_TITLES[currentView] || (currentView === 'entity' ? entityName || 'Entity' : selectedDocumentId ? 'Document' : 'Workspace')}
                    </span>
                  </>
                )}
              </nav>
            </div>

          {/* Center: unified command trigger */}
          {showHeaderCommandTrigger ? (
          <div className="hidden flex-1 justify-center px-4 sm:flex">
            <button
              type="button"
              onClick={isCommandPaletteDisabled ? undefined : commandPalette.toggle}
              aria-label="Open command bar"
              data-testid="open-command-palette"
              data-agent-id="chrome:search:command-palette"
              data-agent-action="search"
              data-agent-label="Open command bar"
              aria-disabled={isCommandPaletteDisabled}
              className={`nb-search-surface w-full max-w-md px-3 py-1.5 text-sm text-content-muted group focus-visible:outline-none ${isCommandPaletteDisabled ? "opacity-60 cursor-not-allowed" : ""} ${showHomeCommandSurface ? "opacity-80 hover:opacity-100" : ""}`}
            >
              <Search className="h-4 w-4 text-content-muted group-hover:text-content-secondary transition-colors" />
              <span className="flex-1 text-left group-hover:text-content-secondary transition-colors">Ask, search, or jump</span>
              <kbd className={`ml-auto text-xs font-medium text-content-muted bg-surface border border-edge rounded-md px-1.5 py-0.5 font-mono group-hover:border-primary/30 transition-colors shadow-sm ${showCommandShortcutHint ? "hidden xl:inline-flex" : "hidden"}`}>
                {commandShortcutLabel}
              </kbd>
            </button>
          </div>
          ) : <div className="hidden flex-1 sm:flex" />}

          {/* Right: actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Research Hub CTA */}
            {showResearchHubAction && (
              <button
                type="button"
                onClick={() => {
                  setIsResearchButtonPressed(true);
                  setIsOpeningResearchHub(true);
                  commandPalette.close();
                  onShowResearchHub?.();
                  goToResearchHub("overview");
                }}
                disabled={isOpeningResearchHub}
                aria-busy={isOpeningResearchHub}
                data-agent-id="chrome:action:research-hub"
                data-agent-action="navigate"
                data-agent-label="Open Research Hub"
                data-agent-target="research"
                className={`hidden sm:inline-flex items-center gap-1.5 rounded-md border border-primary/20 bg-primary/10 px-2.5 py-1.5 text-[13px] font-medium text-content transition-all duration-200 hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 relative ${isOpeningResearchHub ? "opacity-95 shadow-md ring-2 ring-primary/45" : ""} ${isResearchButtonPressed ? "ring-2 ring-primary/40 shadow-sm" : ""}`}
                >
                  {isOpeningResearchHub ? (
                    <Loader2 className="h-3.5 w-3.5 motion-safe:animate-spin motion-reduce:animate-none" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  <span className="hidden sm:inline">{isOpeningResearchHub ? "Opening..." : "Open hub"}</span>
                {(userStats?.unreadBriefings ?? 0) > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full inline-flex items-center justify-center font-bold">
                    {userStats!.unreadBriefings > 9 ? '9+' : userStats!.unreadBriefings}
                  </span>
                )}
              </button>
            )}

            {/* Fast Agent toggle */}
            <button
              type="button"
              onClick={() => {
                setIsAssistantButtonPressed(true);
                setShowFastAgent((open) => !open);
              }}
              aria-label={showFastAgent ? "Close agent panel" : "Open agent panel"}
              aria-pressed={showFastAgent}
              data-testid="assistant-toggle"
              data-agent-id="chrome:action:assistant-toggle"
              data-agent-action="toggle"
              data-agent-label={showFastAgent ? "Close agent panel" : "Open agent panel"}
              className={`relative flex items-center gap-1.5 px-2.5 py-1.5 text-[13px] font-medium rounded-md transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                showFastAgent
                  ? "bg-[var(--accent-primary-bg)] text-content"
                  : "bg-surface text-content hover:bg-surface-hover"
              } ${isAssistantButtonPressed ? "ring-2 ring-primary/35 shadow-sm" : ""}`}
            >
              <Zap className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Agent</span>
              {!showFastAgent && (
                <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-surface" />
              )}
            </button>

            {/* Divider */}
            <div className="w-px h-5 bg-edge mx-0.5" />

            {/* Settings / Profile */}
            <button
              type="button"
              onClick={() => openSettings(user ? "profile" : "usage")}
              className="flex items-center gap-2 p-1 rounded-md hover:bg-surface-hover transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              aria-label="Settings"
              data-testid="open-settings"
              data-agent-id="chrome:action:settings"
              data-agent-action="navigate"
              data-agent-label="Open settings"
              data-agent-target="settings"
            >
              {user ? (
                user.image ? (
                  <img src={user.image} alt={user.name || user.email || "User avatar"} width={24} height={24} className="h-6 w-6 rounded-full" />
                ) : (
                  <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
                    {(user.name?.charAt(0) || user.email?.charAt(0) || "U").toUpperCase()}
                  </div>
                )
              ) : (
                <div className="h-6 w-6 rounded-full bg-surface-secondary flex items-center justify-center text-content-secondary border border-edge/50 shadow-sm">
                  <SettingsIcon className="h-4 w-4" />
                </div>
              )}
            </button>
          </div>
        </div>

          {showGuestWorkspaceCta && (
            <div className="px-4 sm:px-6 py-2.5 bg-muted/30 border-b border-border/60 flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex h-2 w-2 rounded-full bg-amber-500/70" aria-hidden="true" />
                <span>You&apos;re in preview mode. Sign in to save your work.</span>
              </div>
              <button
                type="button"
                onClick={handleAnonymousSignIn}
                disabled={isAnonSigningIn}
                className="ml-auto inline-flex min-w-[96px] items-center justify-center px-3 py-1.5 text-xs font-semibold rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
                aria-busy={isAnonSigningIn}
                data-agent-id="chrome:action:sign-in"
                data-agent-action="create"
                data-agent-label="Sign in"
              >
                <span className="inline-flex items-center gap-1.5">
                  {isAnonSigningIn && (
                    <span className="h-3 w-3 rounded-full border border-primary-foreground/60 border-t-transparent motion-safe:animate-spin motion-reduce:animate-none" />
                  )}
                  <span>{isAnonSigningIn ? "Signing in" : "Sign in"}</span>
                </span>
              </button>
              <button
                type="button"
                aria-label="Dismiss preview banner"
                onClick={() => {
                  setPreviewBannerDismissed(true);
                  try { localStorage.setItem("nodebench_preview_dismissed", "1"); } catch {}
                }}
                className="p-1 rounded hover:bg-muted/60 text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
                data-agent-id="chrome:action:dismiss-banner"
                data-agent-action="toggle"
                data-agent-label="Dismiss preview banner"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          )}

          <div className="border-b border-edge/70 bg-surface/55 px-4 py-2 sm:px-6">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <ViewBreadcrumbs
                  items={breadcrumbs}
                  onNavigate={(item) => {
                    if (item.view) {
                      navigateToRouteTarget(item.view, item.path);
                    } else if (item.path) {
                      navigate(item.path);
                    }
                  }}
                />
                <div className="text-sm font-semibold text-content">{currentSurfaceTitle}</div>
                <div className="truncate text-xs text-content-muted">{currentSurfaceSubtitle}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                {oracleSession?.hasActiveSession && (() => {
                  const s = oracleSession.state.crossCheckStatus ?? "aligned";
                  const cfg = { aligned: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", drifting: "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400", violated: "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400" }[s];
                  return (
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium ${cfg}`}>
                      {s === "aligned" ? "✓" : s === "drifting" ? "⚠" : "✕"} {s}
                    </span>
                  );
                })()}
                {contextChips.map((chip) => (
                  <span
                    key={chip}
                    className="inline-flex items-center rounded-full border border-edge bg-surface px-2.5 py-1 text-[11px] text-content-secondary"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Oracle Session Banner — persistent cross-check status */}
          {oracleSession && (
            <OracleSessionBanner
              state={oracleSession.state}
              onComplete={oracleSession.hasActiveSession ? () => oracleSession.completeSession() : undefined}
              onCancel={oracleSession.hasActiveSession ? () => oracleSession.cancelSession() : undefined}
            />
          )}

          {/* Content Area - Resizable Split */}
          <FocalArea
            currentView={currentView}
            routeView={resolvedRoute.view}
            viewResetKey={viewResetKey}
            showResearchDossier={showResearchDossier}
            setShowResearchDossier={setShowResearchDossier}
            researchHubInitialTab={researchHubInitialTab}
            setResearchHubInitialTab={setResearchHubInitialTab}
            activeSources={activeSources}
            setActiveSources={setActiveSources}
            setCurrentView={setCurrentView}
            entityName={entityName}
            setEntityName={setEntityName}
            selectedSpreadsheetId={selectedSpreadsheetId}
            setSelectedSpreadsheetId={setSelectedSpreadsheetId}
            selectedDocumentId={selectedDocumentId}
            onDocumentSelect={onDocumentSelect}
            isGridMode={isGridMode}
            setIsGridMode={setIsGridMode}
            selectedTaskId={selectedTaskId}
            selectedTaskSource={selectedTaskSource}
            onSelectTask={handleSelectTask}
            onClearTaskSelection={clearTaskSelection}
            onOpenFastAgent={() => setShowFastAgent(true)}
            onOpenFastAgentWithPrompt={handleOpenFastAgentWithPrompt}
          />

          {/* Floating Context Pills */}
          {/* Context pills rendered inline in views */}
        </div>

        {/* Resize Handle between Main and AI Chat Panel */}
        {showFastAgent && (
          <div
            className="hidden lg:block w-1 bg-surface-secondary hover:bg-surface-hover cursor-col-resize transition-colors duration-200 flex-shrink-0 z-10"
            onMouseDown={startAgentResizing}
          />
        )}

        {/* AI Chat Panel - Right Side Column (Desktop) */}
        {showFastAgent && (
          <div
            className="hidden lg:flex flex-shrink-0 h-full bg-surface/80 backdrop-blur-xl border-l border-edge z-20 shadow-xl lg:shadow-none lg:relative overflow-hidden"
            style={{ width: `${agentPanelWidth}px` }}
          >
            <ErrorBoundary title="Fast Agent Panel Error">
              <Suspense fallback={viewFallback}>
                <FastAgentPanel
                  isOpen={true}
                  onClose={() => setShowFastAgent(false)}
                  selectedDocumentIds={selectedDocumentIdsForAgent}
                  initialThreadId={fastAgentThreadId}
                  variant="sidebar"
                  openOptions={fastAgentOpenOptions}
                  onOptionsConsumed={clearFastAgentOptions}
                />
              </Suspense>
            </ErrorBoundary>
          </div>
        )}
      </div>

      {/* Fast Agent Panel - Overlay (Mobile Only) */}
      <div className="lg:hidden">
        {fastAgentHasMounted && (
          <ErrorBoundary title="Fast Agent Panel Error">
            <Suspense fallback={showFastAgent ? <div className="fixed inset-0 z-overlay bg-surface flex items-center justify-center text-sm text-muted-foreground">Loading assistant...</div> : null}>
              <FastAgentPanel
                isOpen={showFastAgent}
                onClose={() => setShowFastAgent(false)}
                selectedDocumentIds={selectedDocumentIdsForAgent}
                initialThreadId={fastAgentThreadId}
                variant="overlay"
                openOptions={fastAgentOpenOptions}
                onOptionsConsumed={clearFastAgentOptions}
              />
            </Suspense>
          </ErrorBoundary>
        )}
      </div>

      {/* Command Palette - Global Cmd/Ctrl+K */}
      <CommandPalette
        isOpen={commandPalette.isOpen}
        onClose={commandPalette.close}
        onNavigate={navigateToView}
        onCreateDocument={() => {
          // Navigate to documents and trigger new document creation
          navigateToView('documents');
          onDocumentSelect(null);
          // Dispatch event to create new document
          window.dispatchEvent(new CustomEvent('document:create'));
        }}
        onCreateTask={() => {
          // Navigate to calendar/tasks view
          navigateToView('calendar');
        }}
        onOpenSettings={() => openSettings('usage')}
      />

      {/* Mention Mini Editor Popover */}
      <MiniEditorPopover
        isOpen={!!mentionPopover}
        documentId={mentionPopover?.documentId || null}
        anchorEl={mentionPopover?.anchorEl || null}
        onClose={() => setMentionPopover(null)}
      />

      {/* Hashtag Quick Note Popover */}
      <HashtagQuickNotePopover
        isOpen={!!hashtagPopover}
        dossierId={hashtagPopover?.dossierId || null}
        hashtag={hashtagPopover?.hashtag || null}
        anchorEl={hashtagPopover?.anchorEl || null}
        onClose={() => setHashtagPopover(null)}
      />

      {/* Quick Capture Widget - Floating FAB */}
      {isAuthenticated && <QuickCaptureWidget />}
      {showSettingsModal && (
        <ErrorBoundary title="Settings failed to load">
          <Suspense fallback={null}>
            <SettingsModal
              isOpen={showSettingsModal}
              onClose={() => setShowSettingsModal(false)}
              initialTab={settingsInitialTab}
            />
          </Suspense>
        </ErrorBoundary>
      )}
    </div>
  );
}
