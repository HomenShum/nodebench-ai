import { useState, useEffect, useRef, useCallback, startTransition, Suspense, lazy } from "react";
import { useConvexAuth, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { CleanSidebar } from "./CleanSidebar";
// Agent Chat Panel removed
import { AnimatePresence, motion } from "framer-motion";

import { Zap, Menu, X as CloseIcon } from "lucide-react";
import { useContextPills } from "../hooks/contextPills";
import { SettingsModal } from "./SettingsModal";
import HashtagQuickNotePopover from "./HashtagQuickNotePopover";
import MiniEditorPopover from "@/shared/components/MiniEditorPopover";
import { useFastAgent } from "@/features/agents/context/FastAgentContext";
import { CommandPalette } from "./CommandPalette";
import { useCommandPalette } from "../hooks/useCommandPalette";
import { QuickCaptureWidget } from "./QuickCapture";
import { ErrorBoundary } from "@/shared/components/ErrorBoundary";

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

const viewFallback = (
  <div className="h-full w-full flex items-center justify-center text-sm text-gray-500">
    Loading view...
  </div>
);

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
  const [currentView, setCurrentView] = useState<'documents' | 'calendar' | 'roadmap' | 'timeline' | 'public' | 'agents' | 'research' | 'showcase' | 'footnotes' | 'signals' | 'benchmarks' | 'entity' | 'funding'>('research');
  // Entity name for entity profile page (extracted from hash)
  const [entityName, setEntityName] = useState<string | null>(null);
  const [isGridMode, setIsGridMode] = useState(false);
  // Transition state for smooth view changes
  const [isTransitioning, setIsTransitioning] = useState(false);
  // Research state: toggle between high-level gateway and deep hub
  const [showResearchDossier, setShowResearchDossier] = useState(false);
  const [researchHubInitialTab, setResearchHubInitialTab] = useState<"overview" | "signals" | "briefing" | "deals" | "changes" | "changelog">("overview");
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

  // Global event listener for inline agent "View in Panel" navigation
  useEffect(() => {
    const handler = (e: CustomEvent<{ threadId: string }>) => {
      console.log('[MainLayout] Navigating to Fast Agent thread:', e.detail.threadId);
      setFastAgentThreadId(e.detail.threadId);
      setShowFastAgent(true);
    };
    window.addEventListener('navigate:fastAgentThread' as any, handler as any);
    return () => window.removeEventListener('navigate:fastAgentThread' as any, handler as any);
  }, []);

  // Global event listener for "Chat with Document" - opens Fast Agent with document context
  useEffect(() => {
    const handler = (e: CustomEvent<{ documentId: Id<"documents">; documentTitle?: string }>) => {
      console.log('[MainLayout] Chat with document:', e.detail.documentId, e.detail.documentTitle);
      // Set the document as context for the agent
      setSelectedDocumentIdsForAgent([e.detail.documentId]);
      // Open the Fast Agent panel
      setShowFastAgent(true);
    };
    window.addEventListener('ai:chatWithDocument' as any, handler as any);
    return () => window.removeEventListener('ai:chatWithDocument' as any, handler as any);
  }, []);

  // Removed global quick prompt listener (AIChatPanel removed)

  // Removed open panel listener (AIChatPanel removed)

  // Lightweight global help handler: open Settings as placeholder for Help
  useEffect(() => {
    const onHelp = (_evt: Event) => {
      openSettings("usage");
    };
    window.addEventListener('app:help', onHelp as EventListener);
    return () => {
      window.removeEventListener('app:help', onHelp as EventListener);
    };
  }, []);

  // Resizable panel state
  const [sidebarWidth, setSidebarWidth] = useState(256); // pixels
  // Removed AIChatPanel resize state; main panel occupies full width
  const sidebarResizingRef = useRef(false);
  const startXRef = useRef(0);
  // Removed AIChatPanel resize refs
  const startSidebarWidthRef = useRef(0);

  // Agent Panel resizing
  const [agentPanelWidth, setAgentPanelWidth] = useState(620);
  const agentResizingRef = useRef(false);
  const startAgentWidthRef = useRef(0);
  // Centralized task selection for inline editor
  const [selectedTaskId, setSelectedTaskId] = useState<Id<"tasks"> | null>(null);
  const [selectedTaskSource, setSelectedTaskSource] = useState<
    "today" | "upcoming" | "week" | "other" | null
  >(null);

  const handleSelectTask = (
    id: Id<"tasks">,
    source: "today" | "upcoming" | "week" | "other"
  ) => {
    // Toggle selection when clicking the same task again
    if (selectedTaskId === id) {
      setSelectedTaskId(null);
      setSelectedTaskSource(null);
      return;
    }
    setSelectedTaskId(id);
    setSelectedTaskSource(source);
  };

  const clearTaskSelection = () => {
    setSelectedTaskId(null);
    setSelectedTaskSource(null);
  };

  const user = useQuery(api.domains.auth.auth.loggedInUser);

  const { isAuthenticated } = useConvexAuth();
  const { signIn } = useAuthActions();
  const [isAnonSigningIn, setIsAnonSigningIn] = useState(false);

  const showGuestWorkspaceCta =
    !isAuthenticated && currentView !== "research" && currentView !== "public";

  const handleAnonymousSignIn = () => {
    if (isAnonSigningIn) return;
    setIsAnonSigningIn(true);
    void signIn("anonymous")
      .catch((error) => {
        console.error("Anonymous sign-in failed", error);
        toast.error("Failed to sign in anonymously");
      })
      .finally(() => {
        setIsAnonSigningIn(false);
      });
  };

  // Prefetch DocumentsHomeHub data - keep these subscribed even when viewing a document
  // so the data is ready when user navigates back (no loading flash)
  const _prefetchDocuments = useQuery(api.domains.documents.documents.getSidebarWithPreviews);
  const _prefetchCalendarPrefs = useQuery(api.domains.auth.userPreferences.getCalendarUiPrefs);
  const _prefetchTodoTasks = useQuery(
    api.domains.tasks.userEvents.listTasksByStatus,
    user ? { status: "todo" } : "skip"
  );
  const _prefetchInProgressTasks = useQuery(
    api.domains.tasks.userEvents.listTasksByStatus,
    user ? { status: "in_progress" } : "skip"
  );
  const _prefetchDoneTasks = useQuery(
    api.domains.tasks.userEvents.listTasksByStatus,
    user ? { status: "done" } : "skip"
  );

  // Preferences and API key status for reminder UI
  // Settings modal control
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<
    "profile" | "account" | "usage" | "integrations" | "billing" | "reminders"
  >("usage");
  const openSettings = (
    tab?: "profile" | "account" | "usage" | "integrations" | "billing" | "reminders"
  ) => {
    setSettingsInitialTab(tab ?? "usage");
    setShowSettingsModal(true);
  };

  const selectedDoc = useQuery(
    api.domains.documents.documents.getById,
    selectedDocumentId ? { documentId: selectedDocumentId } : "skip"
  );
  const { setViewingDocs, addPreviouslyViewed, setFocused } = useContextPills();

  // Apply theme to document root and save preference
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const handleDocumentSelect = (documentId: Id<"documents"> | null) => {
    onDocumentSelect(documentId);
    // Ensure switching back to Documents view when a document is chosen from anywhere
    if (documentId) {
      setCurrentView('documents');
      try { window.dispatchEvent(new CustomEvent('navigate:documents')); } catch { }
    }
  };

  // SMS handling removed - integrations moved to Settings

  // Resizable panel handlers
  // Removed AIChatPanel resize handlers

  // Sidebar resizable handlers
  const startSidebarResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    sidebarResizingRef.current = true;
    startXRef.current = e.clientX;
    startSidebarWidthRef.current = sidebarWidth;

    document.addEventListener('mousemove', resizeSidebar);
    document.addEventListener('mouseup', stopSidebarResizing);
  };

  const resizeSidebar = (e: MouseEvent) => {
    if (!sidebarResizingRef.current) return;

    const diff = e.clientX - startXRef.current;
    const newSidebarWidth = Math.min(Math.max(startSidebarWidthRef.current + diff, 200), 500);

    setSidebarWidth(newSidebarWidth);
  };

  const stopSidebarResizing = () => {
    sidebarResizingRef.current = false;
    document.removeEventListener('mousemove', resizeSidebar);
    document.removeEventListener('mouseup', stopSidebarResizing);
  };

  // Agent Panel resizable handlers
  const startAgentResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    agentResizingRef.current = true;
    startXRef.current = e.clientX;
    startAgentWidthRef.current = agentPanelWidth;

    document.addEventListener('mousemove', resizeAgent);
    document.addEventListener('mouseup', stopAgentResizing);
  };

  const resizeAgent = (e: MouseEvent) => {
    if (!agentResizingRef.current) return;

    // Calculate new width (dragging left increases width)
    const diff = startXRef.current - e.clientX;
    const newWidth = Math.min(Math.max(startAgentWidthRef.current + diff, 300), 800);

    setAgentPanelWidth(newWidth);
  };

  const stopAgentResizing = () => {
    agentResizingRef.current = false;
    document.removeEventListener('mousemove', resizeAgent);
    document.removeEventListener('mouseup', stopAgentResizing);
  };

  // Track single doc viewing when not in grid mode (avoid redundant updates)
  const lastSingleDocRef = useRef<{ id: Id<"documents">; title?: string } | null>(null);
  useEffect(() => {
    if (currentView === 'documents' && !isGridMode && selectedDocumentId) {
      const next = { id: selectedDocumentId, title: selectedDoc?.title };
      const prev = lastSingleDocRef.current;
      const same = prev && prev.id === next.id && prev.title === next.title;
      if (!same) {
        setViewingDocs([next]);
        addPreviouslyViewed(next);
        lastSingleDocRef.current = next;
      }
    }
    // leave updates to DocumentGrid in grid mode
  }, [currentView, isGridMode, selectedDocumentId, selectedDoc?.title, setViewingDocs, addPreviouslyViewed]);

  // Clear viewing context when leaving grid mode with no selection or leaving Documents view
  useEffect(() => {
    // If not in Documents view, clear viewing context
    if (currentView !== 'documents') {
      setViewingDocs([]);
      setFocused(null);
      return;
    }
    // In Documents view, when not in grid and no document is selected, clear
    if (!isGridMode && !selectedDocumentId) {
      setViewingDocs([]);
      setFocused(null);
    }
  }, [currentView, isGridMode, selectedDocumentId, setViewingDocs, setFocused]);

  // Listen for AI multi-document open events to switch to grid view and open tabs
  useEffect(() => {
    const handler = (evt: Event) => {
      try {
        const e = evt as CustomEvent<{ documentIds?: Id<"documents">[] }>;
        const maybeIds = e.detail?.documentIds;
        const ids: Id<"documents">[] = Array.isArray(maybeIds) ? maybeIds : [];
        if (ids.length === 0) return;
        // Ensure we are in the Documents view
        setCurrentView('documents');
        // Enable grid mode
        setIsGridMode(true);
        // Select each document to let TabManager add them as tabs
        // Start with the first, then schedule the rest to avoid thrashing
        onDocumentSelect(ids[0]);
        ids.slice(1).forEach((id, idx) => {
          setTimeout(() => onDocumentSelect(id), (idx + 1) * 50);
        });
        // Reselect the first to keep context predictable
        setTimeout(() => onDocumentSelect(ids[0]), (ids.length + 1) * 50);
      } catch (err) {
        console.warn('Failed to handle ai:openMultipleDocuments event', err);
      }
    };
    window.addEventListener('ai:openMultipleDocuments', handler);
    return () => {
      window.removeEventListener('ai:openMultipleDocuments', handler);
    };
  }, [onDocumentSelect]);

  // Listen for single document open events triggered from @mentions
  useEffect(() => {
    const handler = (evt: Event) => {
      try {
        const e = evt as CustomEvent<{ documentId?: string; openInGrid?: boolean; sourceDocumentId?: string }>;
        const rawId = e.detail?.documentId;
        if (!rawId) return;
        const docId = rawId as Id<"documents">;
        const sourceId = e.detail?.sourceDocumentId as Id<"documents"> | undefined;
        const openInGrid = Boolean(e.detail?.openInGrid);

        // Ensure we are in the Documents view
        setCurrentView('documents');

        if (openInGrid) {
          // Enable grid mode
          setIsGridMode(true);
          // If we know the source doc (where the click happened) and it's different, open it first
          if (sourceId && sourceId !== docId) {
            // Ask TabManager to pin the source as first tab (top-left)
            try {
              window.dispatchEvent(
                new CustomEvent('grid:pinFirst', { detail: { docId: sourceId } })
              );
            } catch (err) {
              // ignore errors from dispatching the pin event
              void err;
            }
            // Also select source to ensure it's opened if not already
            onDocumentSelect(sourceId);
            // Then open the target so it's shown alongside and focused
            setTimeout(() => onDocumentSelect(docId), 30);
          } else {
            // No distinct source; just open target in grid
            onDocumentSelect(docId);
          }
        } else {
          // Single-doc navigation
          onDocumentSelect(docId);
        }
      } catch (err) {
        console.warn('Failed to handle nodebench:openDocument event', err);
      }
    };
    window.addEventListener('nodebench:openDocument', handler as EventListener);
    return () => {
      window.removeEventListener('nodebench:openDocument', handler as EventListener);
    };
  }, [onDocumentSelect, setIsGridMode, setCurrentView]);

  // Listen for mention popover events
  useEffect(() => {
    const handler = (evt: Event) => {
      try {
        const e = evt as CustomEvent<{ documentId?: string }>;
        const documentId = e.detail?.documentId as Id<"documents"> | undefined;

        if (!documentId) return;

        // Find the mention element that triggered the event
        const mentionElements = document.querySelectorAll(`[data-document-id="${documentId}"]`);
        const anchorEl = mentionElements[0] as HTMLElement;

        if (anchorEl) {
          setMentionPopover({ documentId, anchorEl });
        }
      } catch (err) {
        console.warn('Failed to handle nodebench:showMentionPopover event', err);
      }
    };
    window.addEventListener('nodebench:showMentionPopover', handler as EventListener);
    return () => {
      window.removeEventListener('nodebench:showMentionPopover', handler as EventListener);
    };
  }, []);

  // Listen for hashtag quick note popover events
  useEffect(() => {
    const handler = (evt: Event) => {
      try {
        const e = evt as CustomEvent<{ dossierId?: string; hashtag?: string }>;
        const dossierId = e.detail?.dossierId as Id<"documents"> | undefined;
        const hashtag = e.detail?.hashtag;

        if (!dossierId || !hashtag) return;

        // Find the hashtag element that triggered the event
        const hashtagElements = document.querySelectorAll(`[data-dossier-id="${dossierId}"]`);
        const anchorEl = hashtagElements[0] as HTMLElement;

        if (anchorEl) {
          setHashtagPopover({ dossierId, hashtag, anchorEl });
        }
      } catch (err) {
        console.warn('Failed to handle nodebench:showHashtagQuickNote event', err);
      }
    };
    window.addEventListener('nodebench:showHashtagQuickNote', handler as EventListener);
    return () => {
      window.removeEventListener('nodebench:showHashtagQuickNote', handler as EventListener);
    };
  }, []);

  // Listen for go back events (e.g., from FileViewer back button)
  useEffect(() => {
    const handler = () => {
      // Use startTransition to defer the state update, keeping the current view visible
      // while the DocumentsHomeHub loads its data
      setIsTransitioning(true);
      startTransition(() => {
        onDocumentSelect(null);
        // Clear transitioning after a short delay to allow the new view to render
        setTimeout(() => setIsTransitioning(false), 100);
      });
    };
    window.addEventListener('nodebench:goBack', handler);
    return () => {
      window.removeEventListener('nodebench:goBack', handler);
    };
  }, [onDocumentSelect]);

  useEffect(() => {
    const toCalendar = () => setCurrentView('calendar');
    const toTimeline = () => setCurrentView('documents'); // legacy
    const toDocuments = () => setCurrentView('documents');
    const toRoadmap = () => setCurrentView('roadmap');
    const toAgents = () => setCurrentView('agents');
    window.addEventListener('navigate:calendar', toCalendar as unknown as EventListener);
    window.addEventListener('navigate:timeline', toTimeline as unknown as EventListener);
    window.addEventListener('navigate:documents', toDocuments as unknown as EventListener);
    window.addEventListener('navigate:roadmap', toRoadmap as unknown as EventListener);
    window.addEventListener('navigate:agents', toAgents as unknown as EventListener);
    return () => {
      window.removeEventListener('navigate:calendar', toCalendar as unknown as EventListener);
      window.removeEventListener('navigate:timeline', toTimeline as unknown as EventListener);
      window.removeEventListener('navigate:documents', toDocuments as unknown as EventListener);
      window.removeEventListener('navigate:roadmap', toRoadmap as unknown as EventListener);
      window.removeEventListener('navigate:agents', toAgents as unknown as EventListener);
    };
  }, []);

  // Sync main view with URL hash for primary hubs
  useEffect(() => {
    const applyFromHash = () => {
      try {
        const h = (window.location.hash || '').toLowerCase();
        const rawHash = window.location.hash || '';
        if (h.startsWith('#agents')) {
          setCurrentView('agents');
        } else if (h.startsWith('#calendar')) {
          setCurrentView('calendar');
        } else if (h.startsWith('#roadmap')) {
          setCurrentView('roadmap');
        } else if (h.startsWith('#timeline')) {
          setCurrentView('timeline');
        } else if (h.startsWith('#signals')) {
          setCurrentView('signals');
        } else if (h.startsWith('#documents') || h.startsWith('#docs')) {
          setCurrentView('documents');
        } else if (h.startsWith('#showcase') || h.startsWith('#demo')) {
          setCurrentView('showcase');
        } else if (h.startsWith('#footnotes') || h.startsWith('#sources')) {
          setCurrentView('footnotes');
        } else if (h.startsWith('#benchmarks') || h.startsWith('#eval')) {
          setCurrentView('benchmarks');
        } else if (h.startsWith('#funding') || h.startsWith('#funding-brief')) {
          setCurrentView('funding');
        } else if (h.startsWith('#entity/') || h.startsWith('#entity%2f')) {
          // Extract entity name from hash (preserve original case)
          const match = rawHash.match(/^#entity[\/](.+)$/i);
          if (match) {
            setEntityName(decodeURIComponent(match[1]));
            setCurrentView('entity');
          }
        }
      } catch {
        // ignore
      }
    };
    // initialize on mount
    applyFromHash();
    window.addEventListener('hashchange', applyFromHash);
    return () => window.removeEventListener('hashchange', applyFromHash);
  }, []);


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
          flex-shrink-0 h-full bg-white border-r border-gray-200 z-50 transition-transform duration-300
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
          onDocumentSelect={handleDocumentSelect}
          currentView={currentView}
          onViewChange={setCurrentView}
        />
      </div>

      {/* Sidebar Resize Handle - Desktop Only */}
      <div
        className="hidden lg:block w-1 bg-gray-200 hover:bg-gray-400 cursor-col-resize transition-colors duration-200 flex-shrink-0"
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
          <div className="h-14 bg-white border-b border-gray-200 px-4 sm:px-6 flex items-center transition-colors duration-200 relative">
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Mobile Hamburger Menu */}
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
                className="lg:hidden p-2 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                title={isMobileSidebarOpen ? "Close menu" : "Open menu"}
              >
                {isMobileSidebarOpen ? (
                  <CloseIcon className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>

              <h1 className="text-base sm:text-lg font-semibold text-gray-900">
                {currentView === 'research'
                  ? 'Home'
                  : currentView === 'public'
                    ? 'Public Documents'
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
                                : currentView === 'entity'
                                  ? `Entity: ${entityName || 'Profile'}`
                                  : selectedDocumentId
                                  ? 'My Documents'
                                  : 'My Workspace'}
              </h1>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={() => setShowFastAgent((open) => !open)}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 ${showFastAgent
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
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
                  className="flex items-center gap-2 px-2 py-1.5 sm:px-3 sm:py-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
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
                  <span className="hidden sm:inline text-sm font-medium text-gray-900 truncate max-w-[140px]">
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
            <Suspense fallback={viewFallback}>
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
                        onDocumentSelect={(id) => handleDocumentSelect(id as Id<"documents">)}
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
                <PublicDocuments onDocumentSelect={handleDocumentSelect} />
              ) : currentView === 'agents' ? (
                <AgentsHub />
              ) : currentView === 'calendar' ? (
                <CalendarHomeHub
                  onDocumentSelect={handleDocumentSelect}
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
                <div className="h-full overflow-auto p-6 bg-gray-50">
                  <ModelEvalDashboard />
                </div>
              ) : currentView === 'funding' ? (
                <FundingBriefView />
              ) : currentView === 'entity' && entityName ? (
                <EntityProfilePage
                  entityName={entityName}
                  onBack={() => {
                    setEntityName(null);
                    setCurrentView('research');
                    window.location.hash = '';
                  }}
                />
              ) : (
                <div className="h-full flex">
                  <div className="flex-1 overflow-hidden">
                    {(isGridMode || !!selectedDocumentId) ? (
                      <TabManager
                        selectedDocumentId={selectedDocumentId}
                        onDocumentSelect={handleDocumentSelect}
                        isGridMode={isGridMode}
                        setIsGridMode={setIsGridMode}
                        currentView={currentView}
                      />
                    ) : (
                      <DocumentsHomeHub
                        onDocumentSelect={(id) => handleDocumentSelect(id)}
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
            className="hidden lg:block w-1 bg-gray-200 hover:bg-gray-400 cursor-col-resize transition-colors duration-200 flex-shrink-0 z-10"
            onMouseDown={startAgentResizing}
          />
        )}

        {/* AI Chat Panel - Right Side Column (Desktop) */}
        {showFastAgent && (
          <div
            className="hidden lg:flex flex-shrink-0 h-full bg-white border-l border-gray-200 z-20 shadow-xl lg:shadow-none lg:relative overflow-hidden"
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
