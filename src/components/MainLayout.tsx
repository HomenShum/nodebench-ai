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

import { Sparkles, Zap, Menu, X as CloseIcon, Search, ChevronRight } from "lucide-react";
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
const McpToolLedgerView = lazy(() =>
  import("@/features/mcp/views/McpToolLedgerView").then((mod) => ({
    default: mod.McpToolLedgerView,
  })),
);

const viewFallback = <ViewSkeleton variant="default" />;

const VIEW_TITLES: Record<string, string> = {
  research: 'Home',
  public: 'Public Documents',
  spreadsheets: 'Spreadsheets',
  'for-you-feed': 'For You',
  'document-recommendations': 'Recommendations',
  'agent-marketplace': 'Agent Marketplace',
  'github-explorer': 'GitHub Explorer',
  'pr-suggestions': 'PR Suggestions',
  calendar: 'Calendar',
  roadmap: 'Roadmap',
  timeline: 'Timeline',
  signals: 'Signals',
  benchmarks: 'Model Benchmarks',
  funding: 'Funding Brief',
  'analytics-hitl': 'HITL Analytics',
  'analytics-components': 'Component Metrics',
  'analytics-recommendations': 'Recommendation Feedback',
  'cost-dashboard': 'Cost Dashboard',
  'industry-updates': 'Industry Updates',
  'linkedin-posts': 'LinkedIn Posts',
  'mcp-ledger': 'MCP Ledger',
  documents: 'My Workspace',
  agents: 'Agents',
  activity: 'Activity',
  showcase: 'Showcase',
  footnotes: 'Footnotes',
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
          flex-shrink-0 h-full bg-gray-50/80 dark:bg-[#18181B]/80 backdrop-blur-xl border-r border-gray-200/60 dark:border-white/[0.06] z-50 transition-all duration-200
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
        className="hidden lg:block w-1 bg-gray-200 dark:bg-white/[0.06] hover:bg-gray-400 dark:hover:bg-white/[0.12] cursor-col-resize transition-colors duration-200 flex-shrink-0"
        onMouseDown={startSidebarResizing}
      />

      {/* Remaining Space Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main Content Area */}
        <div
          className="flex flex-col overflow-hidden transition-all duration-300 ease-in-out"
          style={{ width: '100%' }}
        >
          {/* Top Bar — Linear-style with breadcrumb + Cmd+K */}
          <div className="h-12 bg-white/80 dark:bg-[#09090B]/80 backdrop-blur-md border-b border-gray-200/60 dark:border-white/[0.06] px-4 sm:px-5 flex items-center transition-colors duration-200 relative z-10">
            {/* Left: hamburger + breadcrumb */}
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
                className="lg:hidden p-1.5 rounded-md text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
                title={isMobileSidebarOpen ? "Close menu" : "Open menu"}
              >
                {isMobileSidebarOpen ? <CloseIcon className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>

              {/* Breadcrumb */}
              <nav className="flex items-center gap-1 text-[13px] min-w-0">
                <button
                  type="button"
                  onClick={() => { setCurrentView('research'); setShowResearchDossier(false); }}
                  className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors shrink-0"
                >
                  Home
                </button>
                {currentView !== 'research' && (
                  <>
                    <ChevronRight className="w-3 h-3 text-gray-300 dark:text-gray-600 shrink-0" />
                    <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {VIEW_TITLES[currentView] || (currentView === 'entity' ? entityName || 'Entity' : selectedDocumentId ? 'My Documents' : 'My Workspace')}
                    </span>
                  </>
                )}
                {currentView === 'research' && showResearchDossier && (
                  <>
                    <ChevronRight className="w-3 h-3 text-gray-300 dark:text-gray-600 shrink-0" />
                    <span className="font-medium text-gray-900 dark:text-gray-100 truncate">Research Hub</span>
                  </>
                )}
              </nav>
            </div>

            {/* Center: Cmd+K search trigger */}
            <div className="hidden sm:flex flex-1 justify-center px-4">
              <button
                type="button"
                onClick={commandPalette.toggle}
                className="flex items-center gap-2 px-3 py-1.5 w-full max-w-xs rounded-lg border border-gray-200/60 dark:border-white/[0.06] bg-gray-50 dark:bg-white/[0.04] text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:border-gray-300 dark:hover:border-white/10 transition-all duration-150 group"
              >
                <Search className="w-3.5 h-3.5" />
                <span className="text-[13px]">Search...</span>
                <kbd className="ml-auto text-[11px] font-medium text-gray-400 dark:text-gray-500 bg-white dark:bg-white/[0.06] border border-gray-200/80 dark:border-white/10 rounded px-1.5 py-0.5 font-mono group-hover:border-gray-300">
                  {navigator.platform?.includes('Mac') ? '⌘' : 'Ctrl+'}K
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
                  className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-[13px] font-medium rounded-md bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
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
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                      {userStats!.unreadBriefings > 9 ? '9+' : userStats!.unreadBriefings}
                    </span>
                  )}
                </button>
              )}

              {/* Fast Agent toggle */}
              <button
                type="button"
                onClick={() => setShowFastAgent((open) => !open)}
                className={`relative flex items-center gap-1.5 px-2.5 py-1.5 text-[13px] font-medium rounded-md transition-all duration-150 ${showFastAgent
                  ? 'bg-gray-900 dark:bg-indigo-500/20 text-white dark:text-indigo-300 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-white/[0.06]'
                }`}
              >
                <Zap className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Agent</span>
                {!showFastAgent && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                )}
              </button>

              {/* Divider */}
              <div className="w-px h-5 bg-gray-200/60 dark:bg-white/[0.06] mx-0.5" />

              {/* User Avatar */}
              {user && (
                <button
                  onClick={() => openSettings('profile')}
                  className="flex items-center gap-2 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
                  title={user.name || user.email || 'Profile'}
                >
                  {user.image ? (
                    <img src={user.image} alt="" className="h-6 w-6 rounded-full" />
                  ) : (
                    <div className="h-6 w-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-[10px] font-bold">
                      {(user.name?.charAt(0) || user.email?.charAt(0) || "U").toUpperCase()}
                    </div>
                  )}
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
          <div className={`flex-1 overflow-hidden ${isTransitioning ? 'opacity-50' : 'opacity-100'}`} data-main-content>
            <AnimatePresence mode="wait">
            <motion.div
              key={`${currentView}:${showResearchDossier ? "hub" : "home"}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              className="h-full w-full"
            >
            <Suspense
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
                <div className="h-full overflow-auto p-6 bg-gray-50 dark:bg-[#09090B]">
                  <ModelEvalDashboard />
                </div>
              ) : currentView === 'funding' ? (
                <FundingBriefView />
              ) : currentView === 'activity' ? (
                <Suspense fallback={viewFallback}>
                  <PublicActivityView />
                </Suspense>
              ) : currentView === 'analytics-hitl' ? (
                <div className="h-full overflow-auto bg-background">
                  <HITLAnalyticsDashboard />
                </div>
              ) : currentView === 'analytics-components' ? (
                <div className="h-full overflow-auto bg-background">
                  <ComponentMetricsDashboard />
                </div>
              ) : currentView === 'analytics-recommendations' ? (
                <div className="h-full overflow-auto bg-background">
                  <RecommendationFeedbackDashboard />
                </div>
              ) : currentView === 'cost-dashboard' ? (
                <div className="h-full overflow-auto bg-background">
                  <Suspense fallback={viewFallback}>
                    <CostDashboard />
                  </Suspense>
                </div>
              ) : currentView === 'industry-updates' ? (
                <div className="h-full overflow-auto bg-background">
                  <Suspense fallback={viewFallback}>
                    <IndustryUpdatesPanel />
                  </Suspense>
                </div>
              ) : currentView === 'for-you-feed' ? (
                <div className="h-full overflow-auto bg-background">
                  <Suspense fallback={viewFallback}>
                    <ForYouFeed />
                  </Suspense>
                </div>
              ) : currentView === 'document-recommendations' ? (
                <div className="h-full overflow-auto bg-background">
                  <Suspense fallback={viewFallback}>
                    <DocumentRecommendations />
                  </Suspense>
                </div>
              ) : currentView === 'agent-marketplace' ? (
                <div className="h-full overflow-auto bg-background">
                  <Suspense fallback={viewFallback}>
                    <AgentMarketplace />
                  </Suspense>
                </div>
              ) : currentView === 'github-explorer' ? (
                <div className="h-full overflow-auto bg-background">
                  <Suspense fallback={viewFallback}>
                    <GitHubExplorer />
                  </Suspense>
                </div>
              ) : currentView === 'pr-suggestions' ? (
                <div className="h-full overflow-auto bg-background">
                  <Suspense fallback={viewFallback}>
                    <PRSuggestions />
                  </Suspense>
                </div>
              ) : currentView === 'linkedin-posts' ? (
                <div className="h-full overflow-auto bg-background">
                  <Suspense fallback={viewFallback}>
                    <LinkedInPostArchiveView />
                  </Suspense>
                </div>
              ) : currentView === 'mcp-ledger' ? (
                <div className="h-full overflow-auto bg-background">
                  <Suspense fallback={viewFallback}>
                    <McpToolLedgerView />
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
            </motion.div>
            </AnimatePresence>
          </div>

          {/* Floating Context Pills */}
          {/* Context pills rendered inline in views */}
        </div>

        {/* Resize Handle between Main and AI Chat Panel */}
        {showFastAgent && (
          <div
            className="hidden lg:block w-1 bg-gray-200 dark:bg-white/[0.06] hover:bg-gray-400 dark:hover:bg-white/[0.12] cursor-col-resize transition-colors duration-200 flex-shrink-0 z-10"
            onMouseDown={startAgentResizing}
          />
        )}

        {/* AI Chat Panel - Right Side Column (Desktop) */}
        {showFastAgent && (
          <div
            className="hidden lg:flex flex-shrink-0 h-full bg-white/80 dark:bg-[#09090B]/80 backdrop-blur-xl border-l border-gray-200/60 dark:border-white/[0.06] z-20 shadow-xl lg:shadow-none lg:relative overflow-hidden"
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
