import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Sidebar } from "./Sidebar";
import { AIChatPanel } from "./AIChatPanel";
import { PublicDocuments } from "@/components/views/PublicDocuments";
import { TabManager } from "./TabManager";
import { DocumentsHomeHub } from "./DocumentsHomeHub";
import { CalendarHomeHub } from "./CalendarHomeHub";

import { TimelineRoadmapView } from "@/components/timelineRoadmap/TimelineRoadmapView";


import { HelpCircle, Sun, Moon, MessageSquare, Settings as SettingsIcon, Link as LinkIcon, Send } from "lucide-react";
import { useContextPills } from "../hooks/contextPills";
import { SettingsModal } from "./SettingsModal";

interface MainLayoutProps {
  selectedDocumentId: Id<"documents"> | null;
  onDocumentSelect: (documentId: Id<"documents"> | null) => void;
  onShowWelcome?: () => void;
}

export function MainLayout({ selectedDocumentId, onDocumentSelect, onShowWelcome }: MainLayoutProps) {
  const [showAIChat, setShowAIChat] = useState(false);
  const [currentView, setCurrentView] = useState<'documents' | 'calendar' | 'roadmap' | 'timeline' | 'public'>('documents');
  const [smsMessage, setSmsMessage] = useState<{from: string, message: string} | null>(null);
  const [isGridMode, setIsGridMode] = useState(false);
  // File selection state for AI chat context
  const [selectedFileIds, setSelectedFileIds] = useState<Id<"files">[]>([]);
  // Top-bar quick AI chat input
  const [quickChatInput, setQuickChatInput] = useState("");
  // Reliable quick prompt handoff to AIChatPanel
  const [pendingQuickPrompt, setPendingQuickPrompt] = useState<string | undefined>(undefined);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check localStorage for saved theme preference
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });
  // MCP panel visibility (inside AIChatPanel)
  const [showMcpPanel, setShowMcpPanel] = useState(false);
  // Restore persisted MCP panel visibility
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('showMcpPanel');
        if (saved === 'true') setShowMcpPanel(true);
      }
    } catch (e) { void e; }
  }, []);
  // Persist MCP panel visibility
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('showMcpPanel', showMcpPanel ? 'true' : 'false');
      }
    } catch (e) { void e; }
  }, [showMcpPanel]);
  // Keyboard shortcut: Ctrl/Cmd + M toggles MCP panel (and opens AI chat if enabling)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        const next = !showMcpPanel;
        setShowMcpPanel(next);
        if (next && !showAIChat) setShowAIChat(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showMcpPanel, showAIChat]);

  // Listen for quick prompts emitted by other components
  useEffect(() => {
    const onQuickPrompt = (evt: Event) => {
      try {
        const e = evt as CustomEvent<{ prompt?: string; documentId?: string }>;
        const text = e.detail?.prompt?.trim();
        if (!text) return;
        if (!showAIChat) {
          // If closed, optionally select the document context first, then open and hand off the prompt
          const docIdStr = e.detail?.documentId;
          if (docIdStr) {
            try {
              onDocumentSelect(docIdStr as Id<"documents">);
            } catch (err) {
              // best effort
              void err;
            }
            setTimeout(() => {
              setShowAIChat(true);
              setPendingQuickPrompt(text);
            }, 75);
          } else {
            setShowAIChat(true);
            setPendingQuickPrompt(text);
          }
        }
        // If already open, AIChatPanel handles the event directly
      } catch {
        // ignore
      }
    };
    window.addEventListener('ai:quickPrompt', onQuickPrompt as EventListener);
    return () => {
      window.removeEventListener('ai:quickPrompt', onQuickPrompt as EventListener);
    };
  }, [showAIChat, onDocumentSelect]);

  // Listen for explicit requests to open the AI chat panel
  useEffect(() => {
    const onOpenPanel = (_evt: Event) => {
      setShowAIChat(true);
    };
    window.addEventListener('ai:openPanel', onOpenPanel as EventListener);
    return () => {
      window.removeEventListener('ai:openPanel', onOpenPanel as EventListener);
    };
  }, []);

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
  const [mainPanelWidth, setMainPanelWidth] = useState(65); // percentage
  const [aiPanelWidth, setAiPanelWidth] = useState(35); // percentage
  const resizingRef = useRef(false);
  const sidebarResizingRef = useRef(false);
  const startXRef = useRef(0);
  const startMainWidthRef = useRef(0);
  const startAiWidthRef = useRef(0);
  const startSidebarWidthRef = useRef(0);
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

  const user = useQuery(api.auth.loggedInUser);
  // Preferences and API key status for reminder UI
  const userPreferences = useQuery(api.userPreferences.getUserPreferences);
  const keyStatuses = useQuery(api.apiKeys.listApiKeyStatuses, { providers: ["openai", "gemini"] });
  const updateUserPrefs = useMutation(api.userPreferences.updateUserPreferences);

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

  // Session-only dismissal for reminder banner
  const [linkReminderDismissed, setLinkReminderDismissed] = useState(false);
  const selectedDoc = useQuery(
    api.documents.getById,
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

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const handleSmsMessageProcessed = () => {
    setSmsMessage(null);
  };

  const handleDocumentSelect = (documentId: Id<"documents"> | null) => {
    onDocumentSelect(documentId);
    // Ensure switching back to Documents view when a document is chosen from anywhere
    if (documentId) {
      setCurrentView('documents');
      try { window.dispatchEvent(new CustomEvent('navigate:documents')); } catch {}
    }
  };

  const handleSmsReceived = (from: string, message: string) => {
    // Open AI chat panel and pass SMS message
    setShowAIChat(true);
    setSmsMessage({ from, message });
  };

  // Resizable panel handlers
  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    resizingRef.current = true;
    startXRef.current = e.clientX;
    startMainWidthRef.current = mainPanelWidth;
    startAiWidthRef.current = aiPanelWidth;

    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', stopResizing);
  };

  const resize = (e: MouseEvent) => {
    if (!resizingRef.current) return;

    const containerWidth = window.innerWidth - sidebarWidth - 8; // Subtract sidebar width and resize handles
    const diff = e.clientX - startXRef.current;
    const diffPercentage = (diff / containerWidth) * 100;

    const newMainWidth = Math.min(Math.max(startMainWidthRef.current + diffPercentage, 30), 85);
    const newAiWidth = Math.min(Math.max(startAiWidthRef.current - diffPercentage, 15), 70);

    // Ensure the percentages add up to 100
    const total = newMainWidth + newAiWidth;
    if (total !== 100) {
      const adjustment = (100 - total) / 2;
      setMainPanelWidth(newMainWidth + adjustment);
      setAiPanelWidth(newAiWidth + adjustment);
    } else {
      setMainPanelWidth(newMainWidth);
      setAiPanelWidth(newAiWidth);
    }
  };

  const stopResizing = () => {
    resizingRef.current = false;
    document.removeEventListener('mousemove', resize);
    document.removeEventListener('mouseup', stopResizing);
  };

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

  useEffect(() => {
    const toCalendar = () => setCurrentView('calendar');
    const toTimeline = () => setCurrentView('documents'); // legacy
    const toDocuments = () => setCurrentView('documents');
    const toRoadmap = () => setCurrentView('roadmap');
    window.addEventListener('navigate:calendar', toCalendar as unknown as EventListener);
    window.addEventListener('navigate:timeline', toTimeline as unknown as EventListener);
    window.addEventListener('navigate:documents', toDocuments as unknown as EventListener);
    window.addEventListener('navigate:roadmap', toRoadmap as unknown as EventListener);
    return () => {
      window.removeEventListener('navigate:calendar', toCalendar as unknown as EventListener);
      window.removeEventListener('navigate:timeline', toTimeline as unknown as EventListener);
      window.removeEventListener('navigate:documents', toDocuments as unknown as EventListener);
      window.removeEventListener('navigate:roadmap', toRoadmap as unknown as EventListener);
    };
  }, []);

  // Sync main view with URL hash for primary hubs
  useEffect(() => {
    const applyFromHash = () => {
      try {
        const h = (window.location.hash || '').toLowerCase();
        if (h.startsWith('#calendar')) {
          setCurrentView('calendar');
        } else if (h.startsWith('#roadmap')) {
          setCurrentView('roadmap');
        } else if (h.startsWith('#timeline')) {
          setCurrentView('timeline');
        } else if (h.startsWith('#documents') || h.startsWith('#docs')) {
          setCurrentView('documents');
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
    <div className="h-screen flex bg-[var(--bg-secondary)] transition-colors duration-200">
      {/* Sidebar - Resizable Width */}
      <div className="flex-shrink-0 h-full" style={{ width: `${sidebarWidth}px` }}>
        <Sidebar
          onDocumentSelect={handleDocumentSelect}
          selectedDocumentId={selectedDocumentId}
          currentView={currentView === 'calendar' || currentView === 'timeline' || currentView === 'roadmap' ? 'documents' : currentView}
          onViewChange={(view) => setCurrentView(view)}
          showAIChat={showAIChat}
          onToggleAIChat={() => setShowAIChat(!showAIChat)}
          onSmsReceived={handleSmsReceived}
          isGridMode={isGridMode}
          selectedFileIds={selectedFileIds}
          onFileSelectionChange={setSelectedFileIds}
          onOpenSettings={openSettings}
        />
      </div>

      {/* Sidebar Resize Handle */}
      <div
        className="w-2 bg-[var(--border-color)] hover:bg-[var(--accent-primary)] cursor-col-resize transition-colors duration-200 flex-shrink-0"
        onMouseDown={startSidebarResizing}
      />

      {/* Remaining Space Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main Content Area */}
        <div
          className="flex flex-col overflow-hidden transition-all duration-300 ease-in-out"
          style={{ width: showAIChat ? `${mainPanelWidth}%` : '100%' }}
        >
          {/* Top Bar */}
          <div className="bg-[var(--bg-primary)] border-b border-[var(--border-color)] px-6 py-3 flex items-center transition-colors duration-200 relative">
            <div className="flex items-center gap-4">
              <h1 className="text-lg font-semibold text-[var(--text-primary)]">
                {currentView === 'public'
                  ? 'Public Documents'
                  : selectedDocumentId
                  ? 'My Documents'
                  : 'Home'}
              </h1>
              {/* Mobile: Open AI Chat quickly */}
              <button
                onClick={() => setShowAIChat(true)}
                className="lg:hidden flex items-center gap-2 px-2 py-1.5 text-sm rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                title="Open AI Chat"
              >
                <MessageSquare className="h-4 w-4" />
                <span className="sm:hidden">Ask AI</span>
              </button>
            </div>

            {/* Centered, full-width Quick AI Command Bar (compact) */}
            <div className="hidden lg:flex flex-1 items-center justify-center mx-4">
              <div className="w-full max-w-4xl flex items-center gap-2 rounded-md border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2 py-1.5 shadow-sm focus-within:ring-1 focus-within:ring-[var(--accent-primary)]/50 transition-colors">
                {/* Context chips next to quick input */}
                <div className="flex items-center gap-1 mr-1">
                  {selectedDoc?.title && (
                    <span
                      className="px-2 py-0.5 text-xs rounded-full bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-secondary)] max-w-[160px] truncate"
                      title={`Doc: ${selectedDoc.title}`}
                    >
                      Doc: {selectedDoc.title}
                    </span>
                  )}
                  {selectedFileIds.length > 0 && (
                    <span
                      className="px-2 py-0.5 text-xs rounded-full bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-secondary)]"
                      title={`${selectedFileIds.length} files in context`}
                    >
                      Files: {selectedFileIds.length}
                    </span>
                  )}
                  {showMcpPanel && (
                    <span
                      className="px-2 py-0.5 text-xs rounded-full bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30 text-[var(--accent-primary)]"
                      title="MCP panel is visible"
                    >
                      MCP On
                    </span>
                  )}
                </div>
                <div className="relative flex-1">
                  <input
                    value={quickChatInput}
                    onChange={(e) => setQuickChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        const text = quickChatInput.trim();
                        if (!text) return;
                        // Open AIChat and hand off prompt via prop
                        if (!showAIChat) setShowAIChat(true);
                        setPendingQuickPrompt(text);
                        setQuickChatInput("");
                      }
                    }}
                    placeholder="Ask AI…"
                    aria-label="Quick AI prompt"
                    className="px-2 py-1.5 text-sm rounded-md border-0 bg-transparent text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-0 w-full"
                    title="Quick AI prompt"
                  />
                </div>
                <button
                  onClick={() => {
                    const text = quickChatInput.trim();
                    if (!text) return;
                    if (!showAIChat) setShowAIChat(true);
                    setPendingQuickPrompt(text);
                    setQuickChatInput("");
                  }}
                  className="inline-flex items-center justify-center h-10 w-10 bg-[var(--accent-primary)] text-white rounded-md hover:bg-[var(--accent-primary-hover)] shadow-sm"
                  aria-label="Send quick AI prompt"
                  title="Send to AI"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 ml-auto">
              {/* Settings Button */}
              <button
                onClick={() => openSettings("usage")}
                className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-md transition-colors"
                title="Open Settings"
              >
                <SettingsIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Settings</span>
              </button>

              {/* Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-md transition-colors"
                title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
              >
                {isDarkMode ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">
                  {isDarkMode ? "Light" : "Dark"}
                </span>
              </button>

              {/* Welcome/Help Button */}
              {onShowWelcome && (
                <button
                  onClick={onShowWelcome}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-md transition-colors"
                  title="Show welcome guide"
                >
                  <HelpCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">Help</span>
                </button>
              )}



              {/* User Info */}
              {user && (
                <div className="flex items-center gap-3">
                  {user.image ? (
                    <img
                      src={user.image}
                      alt={user.name || user.email}
                      className="h-8 w-8 rounded-full"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-[var(--accent-primary)] flex items-center justify-center">
                      <span className="text-sm font-medium text-[var(--text-primary)]">
                        {user.name?.charAt(0) || user.email?.charAt(0) || "U"}
                      </span>
                    </div>
                  )}
                  <div className="hidden sm:block">
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {user.name || user.email}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Link Reminder Banner */}
          {(() => {
            const hasAnyKey = Array.isArray(keyStatuses) && keyStatuses.some((k: any) => k?.hasKey);
            const optedOut = Boolean(userPreferences?.linkReminderOptOut);
            const shouldShow = Boolean(user) && !hasAnyKey && !optedOut && !linkReminderDismissed;
            if (!shouldShow) return null;
            return (
              <div className="bg-[var(--bg-tertiary)] border-b border-[var(--border-color)] px-6 py-2 flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                  <LinkIcon className="h-4 w-4" />
                  <span>Link your AI API keys to unlock higher limits and faster responses.</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openSettings("usage")}
                    className="px-2 py-1 rounded bg-[var(--accent-primary)] text-white hover:opacity-90"
                  >
                    Link keys
                  </button>
                  <button
                    onClick={() => setLinkReminderDismissed(true)}
                    className="px-2 py-1 rounded border border-[var(--border-color)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]"
                  >
                    Later
                  </button>
                  <button
                    onClick={() => { void updateUserPrefs({ linkReminderOptOut: true }); setLinkReminderDismissed(true); }}
                    className="px-2 py-1 rounded border border-[var(--border-color)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]"
                  >
                    Don't show again
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Content Area - Resizable Split */}
          <div className="flex-1 overflow-hidden" data-main-content>
            {currentView === 'public' ? (
              <PublicDocuments onDocumentSelect={handleDocumentSelect} />
            ) : currentView === 'calendar' ? (
              <CalendarHomeHub
                onDocumentSelect={handleDocumentSelect}
                onGridModeToggle={() => setIsGridMode((v) => !v)}
              />
            ) : currentView === 'roadmap' ? (
              <div className="h-full w-full overflow-auto p-8">
                <TimelineRoadmapView />
              </div>
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
          </div>



          {/* Floating Context Pills */}
          {/* ContextPills now rendered inline in AIChatPanel's Context section */}
        </div>

        {/* Resize Handle between Main and AI Chat Panel */}
        {showAIChat && (
          <div
            className="w-2 bg-[var(--border-color)] hover:bg-[var(--accent-primary)] cursor-col-resize transition-colors duration-200 flex-shrink-0"
            onMouseDown={startResizing}
          />
        )}

        {/* AI Chat Panel - Right Side Push-out */}
        {showAIChat && (
          <div
            className="bg-[var(--bg-primary)] border-l border-[var(--border-color)] shadow-2xl transition-all duration-300 ease-in-out flex-shrink-0"
            style={{ width: `${aiPanelWidth}%` }}
          >
            <AIChatPanel
              isOpen={showAIChat}
              onClose={() => setShowAIChat(false)}
              onDocumentSelect={handleDocumentSelect}
              selectedDocumentId={selectedDocumentId || undefined}
              smsMessage={smsMessage ? `SMS from ${smsMessage?.from}: ${smsMessage?.message}` : undefined}
              onSmsMessageProcessed={handleSmsMessageProcessed}
              selectedFileIds={selectedFileIds}
              showMcpPanel={showMcpPanel}
              onToggleMcpPanel={() => setShowMcpPanel(!showMcpPanel)}
              pendingQuickPrompt={pendingQuickPrompt}
              onQuickPromptConsumed={() => setPendingQuickPrompt(undefined)}
              variant="minimal"
            />
          </div>
        )}
      </div>
      {/* Central Settings Modal */}
      {showSettingsModal && (
        <SettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          initialTab={settingsInitialTab}
        />
      )}
    </div>
  );
}

