import { useState, useEffect, useRef, useCallback, startTransition, Suspense, lazy } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useConvexAuth, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { CleanSidebar } from "./CleanSidebar";
// Agent Chat Panel removed

import { Sparkles, Zap, Menu, X as CloseIcon, Search, ChevronRight, Settings as SettingsIcon } from "lucide-react";
import { useContextPills } from "../hooks/contextPills";
import HashtagQuickNotePopover from "./HashtagQuickNotePopover";
import MiniEditorPopover from "@/shared/components/MiniEditorPopover";
import { useFastAgent } from "@/features/agents/context/FastAgentContext";
import { CommandPalette } from "./CommandPalette";
import { useCommandPalette } from "../hooks/useCommandPalette";
import { QuickCaptureWidget } from "./QuickCapture";
import { ErrorBoundary } from "@/shared/components/ErrorBoundary";
import { LazyView } from "@/shared/components/LazyView";
import { usePanelResize } from "../hooks/usePanelResize";
import { useMainLayoutRouting } from "../hooks/useMainLayoutRouting";
import { useGlobalEventListeners } from "../hooks/useGlobalEventListeners";
import { ViewSkeleton } from "./skeletons";

const PublicDocuments = lazy(() =>
  import("@/features/documents/views/PublicDocuments").then((mod) => ({
    default: mod.PublicDocuments,
  })),
);
const DocumentsHomeHub = lazy(() =>
  import("@/features/documents/components/DocumentsHomeHub").then((mod) => ({
    default: mod.DocumentsHomeHub,
  })),
);
const SpreadsheetsHub = lazy(() =>
  import("@/features/spreadsheets/components/SpreadsheetsHub").then((mod) => ({
    default: mod.SpreadsheetsHub,
  })),
);
const SpreadsheetSheetView = lazy(() =>
  import("@/features/spreadsheets/views/SpreadsheetSheetView").then((mod) => ({
    default: mod.SpreadsheetSheetView,
  })),
);
const CalendarHomeHub = lazy(() =>
  import("@/features/calendar/components/CalendarHomeHub").then((mod) => ({
    default: mod.CalendarHomeHub,
  })),
);
const AgentsHub = lazy(() =>
  import("@/features/agents/views/AgentsHub").then((mod) => ({
    default: mod.AgentsHub,
  })),
);
const TimelineRoadmapView = lazy(() =>
  import("@/components/timelineRoadmap/TimelineRoadmapView").then((mod) => ({
    default: mod.TimelineRoadmapView,
  })),
);
const ResearchHub = lazy(() => import("@/features/research/views/ResearchHub"));
const CinematicHome = lazy(() => import("@/features/research/views/CinematicHome"));
const PhaseAllShowcase = lazy(() =>
  import("@/features/research/views/PhaseAllShowcase").then((mod) => ({
    default: mod.PhaseAllShowcase,
  })),
);
const FootnotesPage = lazy(() => import("@/features/research/views/FootnotesPage"));
const PublicSignalsLog = lazy(() =>
  import("@/features/research/views/PublicSignalsLog").then((mod) => ({
    default: mod.PublicSignalsLog,
  })),
);
const ModelEvalDashboard = lazy(() =>
  import("@/features/research/components/ModelEvalDashboard").then((mod) => ({
    default: mod.ModelEvalDashboard,
  })),
);
const EntityProfilePage = lazy(() =>
  import("@/features/research/views/EntityProfilePage").then((mod) => ({
    default: mod.EntityProfilePage,
  })),
);
const FundingBriefView = lazy(() =>
  import("@/features/research/views/FundingBriefView").then((mod) => ({
    default: mod.FundingBriefView,
  })),
);
const TabManager = lazy(() =>
  import("./TabManager").then((mod) => ({
    default: mod.TabManager,
  })),
);
const FastAgentPanel = lazy(() =>
  import("@features/agents/components/FastAgentPanel/FastAgentPanel").then((mod) => ({
    default: mod.FastAgentPanel,
  })),
);
const PublicActivityView = lazy(() =>
  import("@/features/agents/views/PublicActivityView").then((mod) => ({
    default: mod.PublicActivityView,
  })),
);
const HITLAnalyticsDashboard = lazy(() =>
  import("@/features/analytics/views/HITLAnalyticsDashboard").then((mod) => ({
    default: mod.default,
  })),
);
const ComponentMetricsDashboard = lazy(() =>
  import("@/features/analytics/views/ComponentMetricsDashboard").then((mod) => ({
    default: mod.default,
  })),
);
const RecommendationFeedbackDashboard = lazy(() =>
  import("@/features/analytics/views/RecommendationAnalyticsDashboard").then((mod) => ({
    default: mod.default,
  })),
);
const CostDashboard = lazy(() =>
  import("@/components/CostDashboard").then((mod) => ({
    default: mod.CostDashboard,
  })),
);
const IndustryUpdatesPanel = lazy(() =>
  import("@/components/IndustryUpdatesPanel").then((mod) => ({
    default: mod.IndustryUpdatesPanel,
  })),
);
const ForYouFeed = lazy(() =>
  import("@/features/research/components/ForYouFeed").then((mod) => ({
    default: mod.ForYouFeed,
  })),
);
const DocumentRecommendations = lazy(() =>
  import("@/features/documents/components/DocumentRecommendations").then((mod) => ({
    default: mod.DocumentRecommendations,
  })),
);
const AgentMarketplace = lazy(() =>
  import("@/features/agents/components/AgentMarketplace").then((mod) => ({
    default: mod.AgentMarketplace,
  })),
);
const GitHubExplorer = lazy(() =>
  import("@/features/research/components/GitHubExplorer").then((mod) => ({
    default: mod.GitHubExplorer,
  })),
);
const PRSuggestions = lazy(() =>
  import("@/features/monitoring/components/PRSuggestions").then((mod) => ({
    default: mod.PRSuggestions,
  })),
);
const LinkedInPostArchiveView = lazy(() =>
  import("@/features/social/views/LinkedInPostArchiveView").then((mod) => ({
    default: mod.LinkedInPostArchiveView,
  })),
);
const McpToolLedgerView = lazy(() =>
  import("@/features/mcp/views/McpToolLedgerView").then((mod) => ({
    default: mod.McpToolLedgerView,
  })),
);
const DogfoodReviewView = lazy(() =>
  import("@/features/dogfood/views/DogfoodReviewView").then((mod) => ({
    default: mod.DogfoodReviewView,
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
  };
  if ("requestIdleCallback" in window) {
    (window as any).requestIdleCallback(prefetch, { timeout: 3000 });
  } else {
    setTimeout(prefetch, 2000);
  }
};

// Fire once on module load (after initial render settles)
if (typeof window !== "undefined") {
  setTimeout(prefetchRoutes, 1500);
}

const viewFallbackDefault = <ViewSkeleton variant="default" />;
const viewFallbackDocuments = <ViewSkeleton variant="documents" />;
const viewFallbackCalendar = <ViewSkeleton variant="calendar" />;
const viewFallbackAgents = <ViewSkeleton variant="agents" />;
const viewFallbackSettings = <ViewSkeleton variant="settings" />;
const viewFallbackDashboard = <ViewSkeleton variant="dashboard" />;
const viewFallbackCost = <ViewSkeleton variant="cost-dashboard" />;
const viewFallbackIndustry = <ViewSkeleton variant="industry-updates" />;

const viewFallback = viewFallbackDefault;
const EMPTY_FOOTNOTES_LIBRARY = { citations: {} as Record<string, unknown>, order: [] as string[], updatedAt: new Date().toISOString() };

const VIEW_TITLES: Record<string, string> = {
  research: 'Home',
  public: 'Shared with You',
  spreadsheets: 'Spreadsheets',
  'for-you-feed': 'For You',
  'document-recommendations': 'Suggestions',
  'agent-marketplace': 'Agent Templates',
  'github-explorer': 'GitHub',
  'pr-suggestions': 'PR Suggestions',
  calendar: 'Calendar',
  roadmap: 'Roadmap',
  timeline: 'Timeline',
  signals: 'Signals',
  benchmarks: 'Benchmarks',
  funding: 'Funding',
  'analytics-hitl': 'Review Queue',
  'analytics-components': 'Performance Analytics',
  'analytics-recommendations': 'Feedback',
  'cost-dashboard': 'Usage & Costs',
  'industry-updates': 'Industry News',
  'linkedin-posts': 'LinkedIn Posts',
  'mcp-ledger': 'Activity Log',
  dogfood: 'Quality Review',
  documents: 'My Workspace',
  agents: 'Assistants',
  activity: 'Activity',
  showcase: 'Showcase',
  footnotes: 'Sources',
};

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

  const viewResetKey = `${location.pathname}:${currentView}:${String(selectedSpreadsheetId ?? "")}:${String(entityName ?? "")}:${showResearchDossier ? "dossier" : "home"}:${researchHubInitialTab}`;

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
    currentView === "research" &&
    !showResearchDossier;

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

  // Open settings modal with optional tab
  const openSettings = useCallback((tab?: string) => {
    if (tab) setSettingsTab(tab);
    setShowSettingsModal(true);
  }, []);
  // Removed MCP panel persistence and shortcut (no AIChatPanel)

  // Command Palette state with global Cmd/Ctrl+K shortcut
  const commandPalette = useCommandPalette();
  const commandShortcutLabel =
    typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform)
      ? "⌘K"
      : "Ctrl+K";

  // Sync Fast Agent panel state with global context
  const { registerExternalState, options: fastAgentOpenOptions, clearOptions: clearFastAgentOptions } = useFastAgent();
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


  return (
    <div className="h-screen flex bg-background transition-colors duration-200">
      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Resizable Width on Desktop, Overlay on Mobile */}
      <div
        className={`
           flex-shrink-0 h-full bg-gray-50/80 dark:bg-[#18181B]/80 backdrop-blur-xl border-r border-edge z-50 transition-[transform,width] duration-200
           lg:relative lg:translate-x-0
           fixed inset-y-0 left-0
           ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
         `}
        style={{ width: `${effectiveSidebarWidth}px` }}
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
          onGoHome={() => {
            setCurrentView('research');
            setShowResearchDossier(false);
          }}
          onEnterResearchHub={() => {
            setCurrentView('research');
            setShowResearchDossier(true);
          }}
          selectedDocumentId={selectedDocumentId}
          onDocumentSelect={onDocumentSelect}
          currentView={currentView}
          onViewChange={setCurrentView}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebarCollapse}
        />
      </div>

      {/* Sidebar Resize Handle - Desktop Only */}
      <div
        className="hidden lg:block w-1 bg-surface-secondary hover:bg-gray-400 dark:hover:bg-white/[0.12] cursor-col-resize transition-colors duration-200 flex-shrink-0"
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
          <div className="h-12 bg-surface/80 backdrop-blur-md border-b border-edge px-4 sm:px-5 flex items-center transition-colors duration-200 relative z-10">
            {/* Left: hamburger + breadcrumb */}
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
                className="lg:hidden p-1.5 rounded-md text-content-muted hover:text-content hover:bg-surface-hover dark:hover:bg-white/[0.06] transition-colors"
                aria-label={isMobileSidebarOpen ? "Close menu" : "Open menu"}
              >
                {isMobileSidebarOpen ? <CloseIcon className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>

              {/* Breadcrumb */}
              <nav className="flex items-center gap-1 text-[13px] min-w-0">
                <button
                  type="button"
                  onClick={() => { setCurrentView('research'); setShowResearchDossier(false); }}
                  className="text-content-muted hover:text-content-secondary dark:hover:text-gray-300 transition-colors shrink-0"
                >
                  Home
                </button>
                {currentView !== 'research' && (
                  <>
                    <ChevronRight className="w-3 h-3 text-gray-300 dark:text-content-secondary shrink-0" />
                    <span className="font-medium text-content truncate">
                      {VIEW_TITLES[currentView] || (currentView === 'entity' ? entityName || 'Entity' : selectedDocumentId ? 'My Documents' : 'My Workspace')}
                    </span>
                  </>
                )}
                {currentView === 'research' && showResearchDossier && (
                  <>
                    <ChevronRight className="w-3 h-3 text-gray-300 dark:text-content-secondary shrink-0" />
                    <span className="font-medium text-content truncate">Research Hub</span>
                  </>
                )}
              </nav>
            </div>

            {/* Center: Cmd+K search trigger */}
            <div className="hidden sm:flex flex-1 justify-center px-4">
              <button
                type="button"
                onClick={commandPalette.toggle}
                aria-label="Open command palette"
                data-testid="open-command-palette"
                className="flex items-center gap-2 px-3 py-1.5 w-full max-w-xs rounded-lg border border-edge bg-surface-secondary text-content-muted hover:bg-surface-hover hover:border-edge dark:hover:border-white/10 transition-all duration-150 group"
              >
                <Search className="w-3.5 h-3.5" />
                <span className="text-[13px]">Search...</span>
                <kbd className="ml-auto text-xs font-medium text-content-muted bg-white dark:bg-white/[0.06] border border-gray-200/80 dark:border-white/10 rounded px-1.5 py-0.5 font-mono group-hover:border-edge dark:group-hover:border-white/20">
                  {commandShortcutLabel}
                </kbd>
              </button>
            </div>

            {/* Right: actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Research Hub CTA */}
              {currentView === 'research' && showResearchDossier ? (
                <button
                  type="button"
                  onClick={() => setShowResearchDossier(false)}
                  className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-[13px] font-medium rounded-md bg-surface-secondary text-content-secondary hover:bg-surface-secondary dark:hover:bg-white/10 transition-colors"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Home
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => { onShowResearchHub?.(); setCurrentView('research'); setResearchHubInitialTab("overview"); setShowResearchDossier(true); }}
                  className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-[13px] font-medium rounded-md bg-gray-900 dark:bg-white/[0.12] text-white hover:bg-gray-800 dark:hover:bg-white/[0.16] shadow-sm transition-colors relative"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Research
                  {(userStats?.unreadBriefings ?? 0) > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                      {userStats!.unreadBriefings > 9 ? '9+' : userStats!.unreadBriefings}
                    </span>
                  )}
                </button>
              )}

              {/* Fast Agent toggle */}
              <button
                type="button"
                onClick={() => setShowFastAgent((open) => !open)}
                aria-label={showFastAgent ? "Close assistant" : "Open assistant"}
                className={`relative flex items-center gap-1.5 px-2.5 py-1.5 text-[13px] font-medium rounded-md transition-all duration-150 ${showFastAgent
                  ? 'bg-gray-900 dark:bg-indigo-500/20 text-white dark:text-indigo-300 shadow-sm'
                  : 'text-content-secondary hover:text-content hover:bg-surface-hover'
                }`}
              >
                <Zap className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Assistant</span>
                {!showFastAgent && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-indigo-500/80 rounded-full" />
                )}
              </button>

              {/* Divider */}
              <div className="w-px h-5 bg-gray-200/60 dark:bg-white/[0.06] mx-0.5" />

              {/* Settings / Profile */}
              <button
                type="button"
                onClick={() => openSettings(user ? "profile" : "usage")}
                className="flex items-center gap-2 p-1 rounded-md hover:bg-surface-hover transition-colors"
                aria-label="Settings"
                data-testid="open-settings"
              >
                {user ? (
                  user.image ? (
                    <img src={user.image} alt={user.name || user.email || "User avatar"} width={24} height={24} className="h-6 w-6 rounded-full" />
                  ) : (
                    <div className="h-6 w-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                      {(user.name?.charAt(0) || user.email?.charAt(0) || "U").toUpperCase()}
                    </div>
                  )
                ) : (
                  <div className="h-6 w-6 rounded-full bg-surface-secondary flex items-center justify-center text-content-secondary">
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
                className="ml-auto px-3 py-1.5 text-xs font-semibold rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
              >
                {isAnonSigningIn ? "Signing in..." : "Sign in"}
              </button>
              <button
                type="button"
                aria-label="Dismiss preview banner"
                onClick={() => {
                  setPreviewBannerDismissed(true);
                  try { localStorage.setItem("nodebench_preview_dismissed", "1"); } catch {}
                }}
                className="p-1 rounded hover:bg-muted/60 text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          )}

          {/* Content Area - Resizable Split */}
          <div className="flex-1 overflow-hidden" data-main-content>
            {currentView === "research" ? (
              <LazyView
                title="Research Hub failed to load"
                resetKey={viewResetKey}
                fallback={viewFallbackDashboard}
              >
                {!showResearchDossier ? (
                  <CinematicHome
                    onEnterHub={(tab) => {
                      setResearchHubInitialTab(tab ?? "overview");
                      setShowResearchDossier(true);
                    }}
                    onEnterWorkspace={() => setCurrentView("documents")}
                    onOpenFastAgent={() => setShowFastAgent(true)}
                  />
                ) : (
                  <ResearchHub
                    embedded
                    initialTab={researchHubInitialTab}
                    onGoHome={() => setShowResearchDossier(false)}
                    onDocumentSelect={(id) => onDocumentSelect(id as Id<"documents">)}
                    onEnterWorkspace={() => setCurrentView("documents")}
                    activeSources={activeSources}
                    onToggleSource={(sourceId) =>
                      setActiveSources((prev) =>
                        prev.includes(sourceId)
                          ? prev.filter((id) => id !== sourceId)
                          : [...prev, sourceId],
                      )
                    }
                  />
                )}
              </LazyView>
            ) : currentView === "public" ? (
              <LazyView
                title="Public documents failed to load"
                resetKey={viewResetKey}
                fallback={viewFallbackDocuments}
              >
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
            ) : currentView === "roadmap" ? (
              <LazyView title="Roadmap failed to load" resetKey={viewResetKey} fallback={viewFallbackDefault}>
                <TimelineRoadmapView />
              </LazyView>
            ) : currentView === "showcase" ? (
              <LazyView title="Showcase failed to load" resetKey={viewResetKey} fallback={viewFallbackDefault}>
                <PhaseAllShowcase onBack={() => setCurrentView("research")} />
              </LazyView>
            ) : currentView === "footnotes" ? (
              <LazyView title="Sources failed to load" resetKey={viewResetKey} fallback={viewFallbackDefault}>
                <FootnotesPage
                  library={EMPTY_FOOTNOTES_LIBRARY}
                  briefTitle="Latest Daily Brief"
                  onBack={() => setCurrentView("research")}
                />
              </LazyView>
            ) : currentView === "signals" ? (
              <LazyView title="Signals failed to load" resetKey={viewResetKey} fallback={viewFallbackDefault}>
                <PublicSignalsLog />
              </LazyView>
            ) : currentView === "benchmarks" ? (
              <LazyView
                title="Benchmarks failed to load"
                resetKey={viewResetKey}
                fallback={viewFallbackDefault}
                className="h-full overflow-auto p-6 pb-24 lg:pb-6 bg-surface"
              >
                <ModelEvalDashboard />
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
              <LazyView
                title="Review Queue failed to load"
                resetKey={viewResetKey}
                fallback={viewFallbackDefault}
                className="h-full overflow-auto bg-background pb-20 lg:pb-0"
              >
                <HITLAnalyticsDashboard />
              </LazyView>
            ) : currentView === "analytics-components" ? (
              <LazyView
                title="Usage & Costs failed to load"
                resetKey={viewResetKey}
                fallback={viewFallbackDefault}
                className="h-full overflow-auto bg-background pb-20 lg:pb-0"
              >
                <ComponentMetricsDashboard />
              </LazyView>
            ) : currentView === "analytics-recommendations" ? (
              <LazyView
                title="Feedback failed to load"
                resetKey={viewResetKey}
                fallback={viewFallbackDefault}
                className="h-full overflow-auto bg-background pb-20 lg:pb-0"
              >
                <RecommendationFeedbackDashboard />
              </LazyView>
            ) : currentView === "cost-dashboard" ? (
              <LazyView
                title="Cost Dashboard failed to load"
                resetKey={viewResetKey}
                fallback={viewFallbackCost}
                className="h-full overflow-auto bg-background pb-20 lg:pb-0"
              >
                <CostDashboard />
              </LazyView>
            ) : currentView === "industry-updates" ? (
              <LazyView
                title="Industry News failed to load"
                resetKey={viewResetKey}
                fallback={viewFallbackIndustry}
                className="h-full overflow-auto bg-background pb-20 lg:pb-0"
              >
                <IndustryUpdatesPanel />
              </LazyView>
            ) : currentView === "for-you-feed" ? (
              <LazyView
                title="For You feed failed to load"
                resetKey={viewResetKey}
                fallback={viewFallbackDefault}
                className="h-full overflow-auto bg-background pb-20 lg:pb-0"
              >
                <ForYouFeed />
              </LazyView>
            ) : currentView === "document-recommendations" ? (
              <LazyView
                title="Recommendations failed to load"
                resetKey={viewResetKey}
                fallback={viewFallbackDocuments}
                className="h-full overflow-auto bg-background pb-20 lg:pb-0"
              >
                <DocumentRecommendations />
              </LazyView>
            ) : currentView === "agent-marketplace" ? (
              <LazyView
                title="Agent Templates failed to load"
                resetKey={viewResetKey}
                fallback={viewFallbackAgents}
                className="h-full overflow-auto bg-background pb-20 lg:pb-0"
              >
                <AgentMarketplace />
              </LazyView>
            ) : currentView === "github-explorer" ? (
              <LazyView
                title="GitHub Explorer failed to load"
                resetKey={viewResetKey}
                fallback={viewFallbackDefault}
                className="h-full overflow-auto bg-background pb-20 lg:pb-0"
              >
                <GitHubExplorer />
              </LazyView>
            ) : currentView === "pr-suggestions" ? (
              <LazyView
                title="PR Suggestions failed to load"
                resetKey={viewResetKey}
                fallback={viewFallbackDefault}
                className="h-full overflow-auto bg-background pb-20 lg:pb-0"
              >
                <PRSuggestions />
              </LazyView>
            ) : currentView === "linkedin-posts" ? (
              <LazyView
                title="LinkedIn Archive failed to load"
                resetKey={viewResetKey}
                fallback={viewFallbackDocuments}
                className="h-full overflow-auto bg-background pb-20 lg:pb-0"
              >
                <LinkedInPostArchiveView />
              </LazyView>
            ) : currentView === "mcp-ledger" ? (
              <LazyView
                title="Activity Log failed to load"
                resetKey={viewResetKey}
                fallback={viewFallbackDefault}
                className="h-full overflow-auto bg-background pb-20 lg:pb-0"
              >
                <McpToolLedgerView />
              </LazyView>
            ) : currentView === "dogfood" ? (
              <LazyView
                title="Quality Review failed to load"
                resetKey={viewResetKey}
                fallback={viewFallbackDefault}
                className="h-full overflow-auto bg-background pb-20 lg:pb-0"
              >
                <DogfoodReviewView />
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
                        onSelectTask={handleSelectTask}
                        onClearTaskSelection={clearTaskSelection}
                      />
                    )}
                  </div>
                </div>
              </LazyView>
            )}
          </div>

          {/* Floating Context Pills */}
          {/* Context pills rendered inline in views */}
        </div>

        {/* Resize Handle between Main and AI Chat Panel */}
        {showFastAgent && (
          <div
            className="hidden lg:block w-1 bg-surface-secondary hover:bg-gray-400 dark:hover:bg-white/[0.12] cursor-col-resize transition-colors duration-200 flex-shrink-0 z-10"
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
            <Suspense fallback={showFastAgent ? <div className="fixed inset-0 z-overlay bg-background flex items-center justify-center text-sm text-muted-foreground">Loading assistant...</div> : null}>
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
        onNavigate={(view) => {
          setCurrentView(view as typeof currentView);
        }}
        onCreateDocument={() => {
          // Navigate to documents and trigger new document creation
          setCurrentView('documents');
          onDocumentSelect(null);
          // Dispatch event to create new document
          window.dispatchEvent(new CustomEvent('document:create'));
        }}
        onCreateTask={() => {
          // Navigate to calendar/tasks view
          setCurrentView('calendar');
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
