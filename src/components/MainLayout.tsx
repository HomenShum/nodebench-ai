import { useState, useEffect, useRef, useCallback, startTransition, Suspense, lazy } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useConvexAuth, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { CleanSidebar } from "./CleanSidebar";
// Agent Chat Panel removed
import { AnimatePresence, motion } from "framer-motion";

import { Sparkles, Zap, Menu, X as CloseIcon } from "lucide-react";
import { useContextPills } from "../hooks/contextPills";
import { SettingsModal } from "./SettingsModal";
import HashtagQuickNotePopover from "./HashtagQuickNotePopover";
import MiniEditorPopover from "@/shared/components/MiniEditorPopover";
import { useFastAgent } from "@/features/agents/context/FastAgentContext";
import { CommandPalette } from "./CommandPalette";
import { useCommandPalette } from "../hooks/useCommandPalette";
import { QuickCaptureWidget } from "./QuickCapture";
import { ErrorBoundary } from "@/shared/components/ErrorBoundary";
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

const viewFallback = <ViewSkeleton variant="default" />;

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
    isTransitioning,
    setIsTransitioning,
  } = useMainLayoutRouting();

  const location = useLocation();
  const navigate = useNavigate();

  // User stats for unread briefings badge
  const userStats = useQuery(api.domains.auth.userStats.getUserActivitySummary);
  // Current user for avatar
  const user = useQuery(api.domains.auth.auth.loggedInUser);
  // Authentication state
  const { isAuthenticated } = useConvexAuth();
  const { signIn } = useAuthActions();
  const [isAnonSigningIn, setIsAnonSigningIn] = useState(false);
  // Show guest CTA when not authenticated
  const showGuestWorkspaceCta = !isAuthenticated && !user;

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

  // Sync main view with URL pathname for primary hubs
  useEffect(() => {
    try {
      const next = parsePathname(location.pathname || '/');
      setEntityName(next.entityName);
      setSelectedSpreadsheetId(next.spreadsheetId ? (next.spreadsheetId as any) : null);
      setResearchHubInitialTab(next.researchTab);
      setShowResearchDossier(next.showResearchDossier);
      setCurrentView(next.view);
    } catch {
      // ignore
    }
  }, [location.pathname]);


  return (
    <div className="h-screen flex bg-white transition-colors duration-200">
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
          flex-shrink-0 h-full bg-white border-r border-stone-200 z-50 transition-transform duration-300
          lg:relative lg:translate-x-0
          fixed inset-y-0 left-0
          ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        style={{ width: `${sidebarWidth}px` }}
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
        />
      </div>

      {/* Sidebar Resize Handle - Desktop Only */}
      <div
        className="hidden lg:block w-1 bg-stone-200 hover:bg-stone-400 cursor-col-resize transition-colors duration-200 flex-shrink-0"
        onMouseDown={startSidebarResizing}
      />

      {/* Remaining Space Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main Content Area */}
        <div
          className="flex flex-col overflow-hidden transition-all duration-300 ease-in-out"
          style={{ width: '100%' }}
        >
          {/* Top Bar */}
          <div className="h-14 bg-white border-b border-stone-200 px-4 sm:px-6 flex items-center transition-colors duration-200 relative">
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Mobile Hamburger Menu */}
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
                className="lg:hidden p-2 rounded-md text-stone-500 hover:text-stone-900 hover:bg-stone-100"
                title={isMobileSidebarOpen ? "Close menu" : "Open menu"}
              >
                {isMobileSidebarOpen ? (
                  <CloseIcon className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>

              <h1 className="text-base sm:text-lg font-semibold text-stone-900">
                {currentView === 'research'
                  ? 'Home'
                  : currentView === 'public'
                    ? 'Public Documents'
                    : currentView === 'spreadsheets'
                      ? 'Spreadsheets'
                      : currentView === 'for-you-feed'
                        ? 'For You'
                        : currentView === 'document-recommendations'
                          ? 'Document Recommendations'
                          : currentView === 'agent-marketplace'
                            ? 'Agent Marketplace'
                            : currentView === 'github-explorer'
                              ? 'GitHub Explorer'
                              : currentView === 'pr-suggestions'
                                ? 'PR Suggestions'
                                : currentView === 'calendar'
                                  ? 'Calendar'
                                  : currentView === 'roadmap'
                                    ? 'Roadmap'
                                    : currentView === 'timeline'
                                      ? 'Timeline'
                                      : currentView === 'signals'
                                        ? 'Signals'
                                        : currentView === 'benchmarks'
                                          ? 'Model Benchmarks'
                                          : currentView === 'funding'
                                            ? 'Funding Brief'
                                            : currentView === 'analytics-hitl'
                                              ? 'HITL Analytics'
                                              : currentView === 'analytics-components'
                                                ? 'Component Metrics'
                                                : currentView === 'analytics-recommendations'
                                                  ? 'Recommendation Feedback'
                                                  : currentView === 'cost-dashboard'
                                                    ? 'Cost Dashboard'
                                                    : currentView === 'industry-updates'
                                                      ? 'Industry Updates'
                                                      : currentView === 'entity'
                                                        ? `Entity: ${entityName || 'Profile'}`
                                                        : currentView === 'linkedin-posts'
                                                          ? 'LinkedIn Posts'
                                                          : selectedDocumentId
                                                            ? 'My Documents'
                                                            : 'My Workspace'}
              </h1>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              {/* Research Hub / Back to Home CTA - always visible for consistent navigation */}
              {currentView === 'research' && showResearchDossier ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowResearchDossier(false);
                  }}
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors"
                  title="Back to Home"
                  aria-label="Back to Home"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Home</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onShowResearchHub?.();
                    setCurrentView('research');
                    setResearchHubInitialTab("overview");
                    setShowResearchDossier(true);
                  }}
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-emerald-900 text-white hover:bg-emerald-800 shadow-sm transition-colors relative"
                  title="Open Research Hub"
                  aria-label="Open Research Hub"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Research Hub</span>
                  {(userStats?.unreadBriefings ?? 0) > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                      {userStats!.unreadBriefings > 9 ? '9+' : userStats!.unreadBriefings}
                    </span>
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowFastAgent((open) => !open)}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 ${showFastAgent
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                  }`}
                title="Toggle Fast Agent Panel"
                aria-label="Toggle Fast Agent Panel"
              >
                <Zap className="h-4 w-4" />
                <span className="hidden sm:inline">Fast Agent</span>
              </button>

              {/* User Avatar */}
              {user && (
                <button
                  onClick={() => openSettings('profile')}
                  className="flex items-center gap-2 px-2 py-1.5 sm:px-3 sm:py-1.5 rounded-full border border-stone-200 bg-white hover:bg-stone-50 transition-colors"
                  title={user.name || user.email || 'Profile'}
                  aria-label="Open profile and settings"
                >
                  {user.image ? (
                    <img
                      src={user.image}
                      alt={user.name || user.email || 'User'}
                      className="h-7 w-7 rounded-full"
                    />
                  ) : (
                    <div className="h-7 w-7 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white">
                      <span className="text-xs font-bold">
                        {(user.name?.charAt(0) || user.email?.charAt(0) || "U").toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span className="hidden sm:inline text-sm font-medium text-stone-900 truncate max-w-[140px]">
                    {user.name || user.email}
                  </span>
                </button>
              )}
            </div>
          </div>

          {showGuestWorkspaceCta && (
            <div className="px-4 sm:px-6 py-3 bg-amber-50 border-b border-amber-200 flex items-center gap-3">
              <div className="text-sm text-amber-900">
                You&apos;re in guest preview. Sign in anonymously to create and save workspace data.
              </div>
              <button
                type="button"
                onClick={handleAnonymousSignIn}
                disabled={isAnonSigningIn}
                className="ml-auto px-3 py-1.5 text-sm font-semibold rounded-md bg-amber-900 text-white hover:bg-amber-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isAnonSigningIn ? "Signing in..." : "Sign in anonymously"}
              </button>
            </div>
          )}

          {/* Content Area - Resizable Split */}
          <div className={`flex-1 overflow-hidden transition-opacity duration-150 ${isTransitioning ? 'opacity-50' : 'opacity-100'}`} data-main-content>
            <Suspense
              key={`${currentView}:${showResearchDossier ? "hub" : "home"}`}
              fallback={viewFallback}
            >
              {currentView === 'research' ? (
                <AnimatePresence mode="wait">
                  {!showResearchDossier ? (
                    <motion.div
                      key="gateway"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, scale: 1.05 }}
                      transition={{ duration: 0.6 }}
                      className="h-full w-full"
                    >
                      <CinematicHome
                        onEnterHub={(tab) => {
                          setResearchHubInitialTab(tab ?? "overview");
                          setShowResearchDossier(true);
                        }}
                        onEnterWorkspace={() => setCurrentView('documents')}
                        onOpenFastAgent={() => setShowFastAgent(true)}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="hub"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.5 }}
                      className="h-full w-full"
                    >
                      <ResearchHub
                        embedded
                        initialTab={researchHubInitialTab}
                        onGoHome={() => setShowResearchDossier(false)}
                        onDocumentSelect={(id) => onDocumentSelect(id as Id<"documents">)}
                        onEnterWorkspace={() => setCurrentView('documents')}
                        activeSources={activeSources}
                        onToggleSource={(sourceId) => setActiveSources(prev =>
                          prev.includes(sourceId) ? prev.filter(id => id !== sourceId) : [...prev, sourceId]
                        )}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              ) : currentView === 'public' ? (
                <PublicDocuments onDocumentSelect={onDocumentSelect} />
              ) : currentView === 'spreadsheets' ? (
                <Suspense fallback={viewFallback}>
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
                </Suspense>
              ) : currentView === 'agents' ? (
                <AgentsHub />
              ) : currentView === 'calendar' ? (
                <CalendarHomeHub
                  onDocumentSelect={onDocumentSelect}
                  onGridModeToggle={() => setIsGridMode((v) => !v)}
                />
              ) : currentView === 'roadmap' ? (
                <TimelineRoadmapView />
              ) : currentView === 'showcase' ? (
                <PhaseAllShowcase onBack={() => setCurrentView('research')} />
              ) : currentView === 'footnotes' ? (
                <FootnotesPage
                  library={{
                    citations: {},
                    order: [],
                    updatedAt: new Date().toISOString(),
                  }}
                  briefTitle="Latest Intelligence Brief"
                  onBack={() => setCurrentView('research')}
                />
              ) : currentView === 'signals' ? (
                <PublicSignalsLog />
              ) : currentView === 'benchmarks' ? (
                <div className="h-full overflow-auto p-6 bg-stone-50">
                  <ModelEvalDashboard />
                </div>
              ) : currentView === 'funding' ? (
                <FundingBriefView />
              ) : currentView === 'activity' ? (
                <Suspense fallback={viewFallback}>
                  <PublicActivityView />
                </Suspense>
              ) : currentView === 'analytics-hitl' ? (
                <div className="h-full overflow-auto bg-canvas-warm">
                  <HITLAnalyticsDashboard />
                </div>
              ) : currentView === 'analytics-components' ? (
                <div className="h-full overflow-auto bg-canvas-warm">
                  <ComponentMetricsDashboard />
                </div>
              ) : currentView === 'analytics-recommendations' ? (
                <div className="h-full overflow-auto bg-canvas-warm">
                  <RecommendationFeedbackDashboard />
                </div>
              ) : currentView === 'cost-dashboard' ? (
                <div className="h-full overflow-auto bg-canvas-warm">
                  <Suspense fallback={viewFallback}>
                    <CostDashboard />
                  </Suspense>
                </div>
              ) : currentView === 'industry-updates' ? (
                <div className="h-full overflow-auto bg-canvas-warm">
                  <Suspense fallback={viewFallback}>
                    <IndustryUpdatesPanel />
                  </Suspense>
                </div>
              ) : currentView === 'for-you-feed' ? (
                <div className="h-full overflow-auto bg-canvas-warm">
                  <Suspense fallback={viewFallback}>
                    <ForYouFeed />
                  </Suspense>
                </div>
              ) : currentView === 'document-recommendations' ? (
                <div className="h-full overflow-auto bg-canvas-warm">
                  <Suspense fallback={viewFallback}>
                    <DocumentRecommendations />
                  </Suspense>
                </div>
              ) : currentView === 'agent-marketplace' ? (
                <div className="h-full overflow-auto bg-canvas-warm">
                  <Suspense fallback={viewFallback}>
                    <AgentMarketplace />
                  </Suspense>
                </div>
              ) : currentView === 'github-explorer' ? (
                <div className="h-full overflow-auto bg-canvas-warm">
                  <Suspense fallback={viewFallback}>
                    <GitHubExplorer />
                  </Suspense>
                </div>
              ) : currentView === 'pr-suggestions' ? (
                <div className="h-full overflow-auto bg-canvas-warm">
                  <Suspense fallback={viewFallback}>
                    <PRSuggestions />
                  </Suspense>
                </div>
              ) : currentView === 'linkedin-posts' ? (
                <div className="h-full overflow-auto bg-canvas-warm">
                  <Suspense fallback={viewFallback}>
                    <LinkedInPostArchiveView />
                  </Suspense>
                </div>
              ) : currentView === 'entity' && entityName ? (
                <EntityProfilePage
                  entityName={entityName}
                  onBack={() => {
                    setEntityName(null);
                    setCurrentView('research');
                    navigate('/');
                  }}
                />
              ) : (
                <div className="h-full flex">
                  <div className="flex-1 overflow-hidden">
                    {(isGridMode || !!selectedDocumentId) ? (
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
              )}
            </Suspense>
          </div>



          {/* Floating Context Pills */}
          {/* Context pills rendered inline in views */}
        </div>

        {/* Resize Handle between Main and AI Chat Panel */}
        {showFastAgent && (
          <div
            className="hidden lg:block w-1 bg-stone-200 hover:bg-stone-400 cursor-col-resize transition-colors duration-200 flex-shrink-0 z-10"
            onMouseDown={startAgentResizing}
          />
        )}

        {/* AI Chat Panel - Right Side Column (Desktop) */}
        {showFastAgent && (
          <div
            className="hidden lg:flex flex-shrink-0 h-full bg-white border-l border-stone-200 z-20 shadow-xl lg:shadow-none lg:relative overflow-hidden"
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
            <Suspense fallback={null}>
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

      {showSettingsModal && (
        <SettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          initialTab={settingsInitialTab}
        />
      )}

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
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        initialTab={settingsInitialTab}
      />
    </div>
  );
}
