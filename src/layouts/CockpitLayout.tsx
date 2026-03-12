/**
 * CockpitLayout — Jarvis-style 4-zone HUD layout.
 *
 * ┌─────────────────────────────────────┐
 * │ StatusStrip                         │
 * ├──────┬──────────────────────┬───────┤
 * │ Mode │     Focal Area       │ Agent │
 * │ Rail │                      │ Panel │
 * ├──────┴──────────────────────┴───────┤
 * │ CommandBar                          │
 * └─────────────────────────────────────┘
 *
 * Uses react-resizable-panels for agent panel resize.
 * All 28 view components render unchanged via FocalArea.
 */

import { useState, useEffect, useCallback, useRef, useMemo, startTransition, Suspense, lazy } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import type { ImperativePanelHandle } from "react-resizable-panels";
import { Id } from "../../convex/_generated/dataModel";
import { useFastAgent } from "@/features/agents/context/FastAgentContext";
import { useCommandPalette } from "../hooks/useCommandPalette";
import { useGlobalEventListeners } from "../hooks/useGlobalEventListeners";
import { useViewWebMcpTools } from "../hooks/useViewWebMcpTools";
import { ErrorBoundary } from "@/shared/components/ErrorBoundary";
import { ViewSkeleton } from "@/components/skeletons";
import { AgentMetadata } from "@/components/AgentMetadata";
import { CommandPalette, type ExecutedCommand } from "@/components/CommandPalette";
import HashtagQuickNotePopover from "@/components/HashtagQuickNotePopover";
import MiniEditorPopover from "@/shared/components/MiniEditorPopover";
import { QuickCaptureWidget } from "@/components/QuickCapture";
import { useTheme } from "../contexts/ThemeContext";
import { parseVoiceIntent, useVoiceIntentRouter } from "../hooks/useVoiceIntentRouter";
import { useIntentTelemetry } from "@/lib/hooks/useIntentTelemetry";

import { HUDProvider } from "./HUDContext";
import { useCockpitMode } from "./useCockpitMode";
import { type CockpitMode, MODES, VIEW_PATH_MAP } from "./cockpitModes";
import type { CommandAction } from "@/components/CommandPalette";
import { ModeRail } from "./ModeRail";
import { StatusStrip } from "./StatusStrip";
import { CommandBar } from "./CommandBar";
import { FocalArea } from "./FocalArea";
import { CockpitIntelRail } from "./CockpitIntelRail";
import "./hud.css";

const isMac = typeof navigator !== "undefined" && /mac/i.test(navigator.userAgent);

const FastAgentPanel = lazy(() =>
  import("@features/agents/components/FastAgentPanel/FastAgentPanel").then((mod) => ({
    default: mod.FastAgentPanel,
  })),
);
const SettingsModal = lazy(() => import("@/components/SettingsModal"));
// ConvexJarvisHUD bridges Convex reactive streaming to the headless JarvisHUDLayout.
// See src/features/agents/components/ConvexJarvisHUD.tsx for architecture notes.
const ConvexJarvisHUD = lazy(() =>
  import("@/features/agents/components/ConvexJarvisHUD").then((mod) => ({ default: mod.ConvexJarvisHUD })),
);

const viewFallback = <ViewSkeleton variant="default" />;

interface CockpitLayoutProps {
  selectedDocumentId: Id<"documents"> | null;
  onDocumentSelect: (documentId: Id<"documents"> | null) => void;
}

export function CockpitLayout({
  selectedDocumentId,
  onDocumentSelect,
}: CockpitLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useConvexAuth();

  // Badge counts — driven by live Convex queries
  const agentStatsBadge = useQuery(
    api.domains.agents.agentHubQueries.getAgentStats,
    isAuthenticated ? {} : "skip",
  );
  const pendingHITL = useQuery(
    api.domains.hitl.adjudicationWorkflow.getPendingAdjudicationRequests,
    isAuthenticated ? {} : "skip",
  );
  const { setLayout, setMode: setThemeMode, resolvedMode, theme } = useTheme();

  // Cockpit mode routing
  const cockpit = useCockpitMode();
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
    mode,
    setMode,
    modeConfig,
  } = cockpit;

  const [refreshNonce, setRefreshNonce] = useState(0);
  // Only include fields that truly require a full view remount (ErrorBoundary reset).
  // entityName, researchHubInitialTab, and refreshNonce are handled by props/state
  // inside the view — they should NOT force unmount/remount of the entire view tree.
  const viewResetKey = `${currentView}:${String(selectedSpreadsheetId ?? "")}:${showResearchDossier ? "dossier" : "home"}`;

  const badgeCounts = useMemo(() => {
    const counts: Partial<Record<CockpitMode, number>> = {};
    const activeAgents = agentStatsBadge?.activeNow ?? 0;
    if (activeAgents > 0) counts.agents = activeAgents;
    const pendingCount = Array.isArray(pendingHITL) ? pendingHITL.length : 0;
    if (pendingCount > 0) counts.system = pendingCount;
    return counts;
  }, [agentStatsBadge, pendingHITL]);
  const trackIntentEvent = useIntentTelemetry();
  const lastTrackedViewRef = useRef<string | null>(null);

  // Per-view WebMCP tools
  const webmcpViewEnabled = typeof navigator !== "undefined" && !!navigator.modelContext;
  useViewWebMcpTools(currentView, webmcpViewEnabled);

  // ── Jarvis HUD overlay ────────────────────────────────────────────────────
  // For other coding agents:
  // showJarvisHUD is intentionally ALWAYS true. The HUD is a floating overlay
  // that coexists with ALL cockpit views (home, research, workspace, etc.).
  // It does NOT replace the cockpit — it sits at z-40 on top of it.
  // Users can "dismiss" it by clicking X in the AgentWindow (which returns
  // the HUD to its compact prompt-bar state, not a full unmount).
  // Do NOT add view-based conditions here — that was the original bug.
  const [showJarvisHUD] = useState(true);

  // Agent panel state
  const [showFastAgent, setShowFastAgent] = useState(false);
  const [fastAgentHasMounted, setFastAgentHasMounted] = useState(false);
  const focalPanelRef = useRef<ImperativePanelHandle>(null);

  // Imperatively resize focal panel when agent panel opens/closes
  useEffect(() => {
    focalPanelRef.current?.resize(showFastAgent ? 70 : 100);
  }, [showFastAgent]); // focalPanelRef is a ref — stable identity, safe to omit
  const [selectedDocumentIdsForAgent, setSelectedDocumentIdsForAgent] = useState<Id<"documents">[]>([]);
  const [fastAgentThreadId, setFastAgentThreadId] = useState<string | null>(null);

  const {
    registerExternalState,
    openWithContext,
    options: fastAgentOpenOptions,
    clearOptions: clearFastAgentOptions,
  } = useFastAgent();
  const showFastAgentRef = useRef(showFastAgent);
  showFastAgentRef.current = showFastAgent;

  useEffect(() => {
    registerExternalState(setShowFastAgent, () => showFastAgentRef.current);
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

  // Document / task state
  const [isGridMode, setIsGridMode] = useState(false);
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

  // Sources
  const [activeSources, setActiveSources] = useState<string[]>(["ycombinator", "techcrunch", "reddit", "twitter", "github", "arxiv"]);

  // Popovers
  const [hashtagPopover, setHashtagPopover] = useState<{ dossierId: Id<"documents">; hashtag: string; anchorEl: HTMLElement } | null>(null);
  const [mentionPopover, setMentionPopover] = useState<{ documentId: Id<"documents">; anchorEl: HTMLElement } | null>(null);

  // Settings
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsInitialTab, setSettingsTab] = useState<string>("usage");
  const openSettings = useCallback((tab?: string) => {
    if (tab) setSettingsTab(tab);
    setShowSettingsModal(true);
  }, []);

  // Command palette
  const commandPalette = useCommandPalette();
  const paletteWasOpenRef = useRef(false);

  // Previous view tracking for "go back" voice command + scroll restoration
  const previousViewRef = useRef<typeof currentView | null>(null);
  const currentViewRef = useRef(currentView);
  const scrollPositions = useRef<Map<string, number>>(new Map());
  const MAX_SCROLL_ENTRIES = 20;
  useEffect(() => {
    if (currentViewRef.current !== currentView) {
      // Save scroll position of the outgoing view
      const focalEl = document.querySelector<HTMLElement>(".hud-focal-area");
      const scrollChild = focalEl?.querySelector<HTMLElement>(".nb-lazy-view") ?? focalEl;
      if (scrollChild) {
        scrollPositions.current.set(currentViewRef.current, scrollChild.scrollTop);
        // LRU eviction: cap at MAX_SCROLL_ENTRIES to prevent unbounded memory growth
        if (scrollPositions.current.size > MAX_SCROLL_ENTRIES) {
          const firstKey = scrollPositions.current.keys().next().value;
          if (firstKey !== undefined) scrollPositions.current.delete(firstKey);
        }
      }
      previousViewRef.current = currentViewRef.current;
      currentViewRef.current = currentView;
      // Restore scroll position of the incoming view (next frame so DOM is ready)
      requestAnimationFrame(() => {
        const el = document.querySelector<HTMLElement>(".hud-focal-area");
        const target = el?.querySelector<HTMLElement>(".nb-lazy-view") ?? el;
        const saved = scrollPositions.current.get(currentView);
        if (target && saved) {
          target.scrollTop = saved;
        }
      });
    }
  }, [currentView]);

  useEffect(() => {
    if (commandPalette.isOpen && !paletteWasOpenRef.current) {
      trackIntentEvent({
        source: "system",
        intentKey: "system.openCommandPalette",
        action: "openCommandPalette",
        status: "handled",
        route: location.pathname,
        targetView: currentView,
        metadata: {
          cockpitMode: mode,
        },
      });
    }
    paletteWasOpenRef.current = commandPalette.isOpen;
  }, [commandPalette.isOpen, currentView, location.pathname, mode, trackIntentEvent]);

  useEffect(() => {
    const trackingKey = `${location.pathname}:${currentView}:${mode}:${theme.layout}`;
    if (lastTrackedViewRef.current === trackingKey) return;
    lastTrackedViewRef.current = trackingKey;
    trackIntentEvent({
      source: "navigation",
      intentKey: `view.${currentView}`,
      action: "navigateToView",
      status: "handled",
      route: location.pathname,
      targetView: currentView,
      metadata: {
        cockpitMode: mode,
        layout: theme.layout,
      },
    });
  }, [currentView, location.pathname, mode, theme.layout, trackIntentEvent]);

  const navigateToView = useCallback((view: typeof currentView) => {
    const path = VIEW_PATH_MAP[view] ?? `/${view}`;
    // Use View Transitions API when available (Chrome 111+) for native cross-fade,
    // wrapped in startTransition so React can prepare the new tree without blocking.
    const apply = () => {
      startTransition(() => {
        setCurrentView(view);
        navigate(path);
      });
    };
    if (typeof document !== "undefined" && "startViewTransition" in document) {
      (document as any).startViewTransition(apply);
    } else {
      apply();
    }
  }, [navigate, setCurrentView]);

  const dispatchDeferred = useCallback((eventName: string, detail?: Record<string, unknown>) => {
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent(eventName, detail ? { detail } : undefined));
    }, 0);
  }, []);

  const triggerVoiceSearch = useCallback((query: string) => {
    const populateVisibleSearchInput = () => {
      const selectors = [
        'input[type="search"]',
        'input[placeholder*="search" i]',
        'input[aria-label*="search" i]',
        'textarea[placeholder*="search" i]',
      ].join(", ");
      const candidates = Array.from(
        document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(selectors),
      ).filter((element) => {
        const htmlElement = element as HTMLElement;
        return !element.disabled && htmlElement.offsetParent !== null;
      });
      const target = candidates[0];
      if (!target) return false;
      target.focus();
      const prototype = target instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
      setter?.call(target, query);
      target.dispatchEvent(new Event("input", { bubbles: true }));
      target.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    };

    window.dispatchEvent(new CustomEvent("voice:search", { detail: { query } }));
    if (populateVisibleSearchInput()) return;
    window.requestAnimationFrame(() => {
      if (populateVisibleSearchInput()) return;
      window.setTimeout(() => {
        populateVisibleSearchInput();
      }, 150);
    });
  }, []);

  // Voice intent router — connects deterministic command parsing to all UI actions
  const voiceIntentActions = useMemo(() => ({
    navigateToView: (viewId: string) => {
      const v = viewId as typeof currentView;
      navigateToView(v);
    },
    openSettings: () => openSettings(),
    openCommandPalette: () => commandPalette.open(),
    createDocument: () => {
      navigateToView("documents");
      onDocumentSelect(null);
      dispatchDeferred("document:create");
    },
    createTask: () => {
      navigateToView("documents");
      onDocumentSelect(null);
      dispatchDeferred("voice:create-task");
    },
    createEvent: () => {
      navigateToView("documents");
      onDocumentSelect(null);
      dispatchDeferred("voice:create-event");
    },
    setCockpitMode: (m: string) => setMode(m as CockpitMode),
    setLayout: (l: 'cockpit' | 'classic') => setLayout(l),
    setThemeMode: (m: 'light' | 'dark') => setThemeMode(m),
    toggleTheme: () => setThemeMode(resolvedMode === "dark" ? "light" : "dark"),
    toggleLayout: () => setLayout(theme.layout === "cockpit" ? "classic" : "cockpit"),
    selectThread: (_index: number) => {
      setShowFastAgent(true);
      setFastAgentHasMounted(true);
      dispatchDeferred("voice:select-thread", { index: _index });
    },
    triggerSearch: (query: string) => triggerVoiceSearch(query),
    scrollTo: (position: 'top' | 'bottom') => {
      window.scrollTo({ top: position === 'top' ? 0 : document.body.scrollHeight, behavior: 'smooth' });
    },
    goBack: () => {
      if (previousViewRef.current) {
        const v = previousViewRef.current;
        setCurrentView(v);
        navigate(VIEW_PATH_MAP[v] ?? `/${v}`);
      }
    },
    refresh: () => setRefreshNonce((value) => value + 1),
  }), [commandPalette.open, dispatchDeferred, navigate, navigateToView, onDocumentSelect, openSettings, resolvedMode, setCurrentView, setFastAgentHasMounted, setLayout, setMode, setShowFastAgent, setThemeMode, theme.layout, triggerVoiceSearch]);

  const { handleIntent: routeVoiceIntent } = useVoiceIntentRouter(voiceIntentActions);
  const handleVoiceIntent = useCallback(
    (text: string, source: "voice" | "text" = "voice") => {
      const parsed = parseVoiceIntent(text);
      const handled = routeVoiceIntent(text);
      trackIntentEvent({
        source,
        intentKey: parsed ? `${parsed.intent}.${parsed.action}` : "agent.fallthrough",
        action: parsed?.action ?? "fallthrough",
        status: handled ? "handled" : parsed ? "failed" : "fallback",
        inputText: text,
        route: location.pathname,
        targetView: typeof parsed?.params.view === "string" ? parsed.params.view : undefined,
        metadata: {
          cockpitMode: mode,
          currentView,
        },
      });
      return handled;
    },
    [currentView, location.pathname, mode, routeVoiceIntent, trackIntentEvent],
  );

  // Global event listeners
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

  // Deep link: ?doc=<id> navigates to documents view and opens that document
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const docId = params.get("doc");
    if (docId) {
      navigate(VIEW_PATH_MAP["documents"] ?? "/documents");
      setCurrentView("documents");
      onDocumentSelect(docId as Id<"documents">);
    }
  }, [location.search, setCurrentView, onDocumentSelect, navigate]);

  const handleToggleLayout = useCallback(() => {
    setLayout("classic");
  }, [setLayout]);

  // Stable reference — commandPalette.close is a useCallback with no deps
  const { close: closePalette } = commandPalette;

  const trackCommandPaletteExecution = useCallback((command: ExecutedCommand) => {
    const targetView =
      command.id.startsWith("nav-")
        ? command.id.replace("nav-", "")
        : command.id === "create-document" || command.id === "create-task"
          ? "documents"
          : currentView;
    const action =
      command.section === "navigation"
        ? "navigateToView"
        : command.section === "mode"
          ? "setCockpitMode"
        : command.section === "settings"
            ? command.id === "layout-toggle"
              ? "toggleLayout"
              : "openSettings"
            : command.section === "create"
              ? command.id === "create-task"
                ? "createTask"
                : command.id === "create-event"
                  ? "navigateToView"
                  : "createDocument"
              : "commandAction";
    trackIntentEvent({
      source: "system",
      intentKey: `palette.${command.id}`,
      action,
      status: "handled",
      route: location.pathname,
      targetView,
      metadata: {
        label: command.label,
        section: command.section,
        cockpitMode: mode,
      },
    });
  }, [currentView, location.pathname, mode, trackIntentEvent]);

  // Mode-switch actions for CommandPalette
  const modeSwitchActions: CommandAction[] = useMemo(
    () =>
      MODES.map((m, idx) => ({
        id: `mode-${m.id}`,
        label: `Switch to ${m.label} Mode`,
        description: m.description,
        icon: <span style={{ color: m.color, fontWeight: 700 }}>◆</span>,
        keywords: [m.id, m.label.toLowerCase(), ...m.views],
        section: "mode" as const,
        shortcut: `${isMac ? "⌥" : "Alt+"}${idx + 1}`,
        action: () => {
          setMode(m.id);
          closePalette();
        },
      })),
    [closePalette, setMode],
  );

  // ARIA live region: announce mode changes to screen readers
  const [modeAnnouncement, setModeAnnouncement] = useState("");
  const modeAnnouncedRef = useRef(false);
  useEffect(() => {
    // Skip the first render — don't announce on mount
    if (!modeAnnouncedRef.current) {
      modeAnnouncedRef.current = true;
      return;
    }
    setModeAnnouncement(`${modeConfig.label} mode — ${modeConfig.views.length} views`);
    const timer = setTimeout(() => setModeAnnouncement(""), 3000);
    return () => clearTimeout(timer);
  }, [mode, modeConfig]);

  // Pause infinite HUD animations when tab is hidden (saves CPU/GPU)
  useEffect(() => {
    const handler = () => {
      document.documentElement.classList.toggle("hud-tab-hidden", document.hidden);
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  // Alt+1-5 keyboard shortcuts to switch cockpit modes
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.altKey) return;
      // Don't intercept Alt+N when focus is inside an editable field
      const target = e.target as HTMLElement;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target.isContentEditable
      ) return;
      const idx = parseInt(e.key, 10) - 1;
      if (idx >= 0 && idx < MODES.length) {
        e.preventDefault();
        setMode(MODES[idx].id);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setMode]);

  return (
    <HUDProvider>
      <div className="h-[100dvh] flex flex-col bg-surface overflow-hidden">
      {/* Screen reader: announce mode changes */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {modeAnnouncement}
      </div>

      {/* JSON-LD metadata for agent crawlers */}
      <AgentMetadata currentView={currentView} currentPath={location.pathname} />

      {/* Top: Status Strip */}
      <StatusStrip
        currentView={currentView}
        modeLabel={modeConfig.label}
        modeColor={modeConfig.color}
        modeDescription={modeConfig.description}
        entityName={entityName}
      />
      <CockpitIntelRail currentView={currentView} compact />

      {/* Middle: ModeRail + FocalArea + AgentPanel */}
      <div className="flex-1 flex overflow-hidden min-h-0" role="main" aria-label="Main content">
        {/* Mode Rail (desktop only) */}
        <ModeRail
          mode={mode}
          onModeChange={setMode}
          onOpenSettings={() => openSettings("usage")}
          badgeCounts={badgeCounts}
        />

        {/* Focal Area + Agent Panel (resizable) + persistent intel rail */}
        <div className="flex flex-1 min-w-0">
        <PanelGroup direction="horizontal" className="flex-1 min-w-0" autoSaveId="cockpit-panels">
          <Panel ref={focalPanelRef} defaultSize={100} minSize={40}>
            <FocalArea
              currentView={currentView}
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
          </Panel>

          {/* Agent Panel — desktop only, resizable */}
          {showFastAgent && (
            <>
              <PanelResizeHandle
                className="hidden lg:block w-px hover:w-1 bg-[var(--hud-border)] hud-resize-handle transition-all duration-150 cursor-col-resize"
                style={{ "--hud-mode-color": modeConfig.color } as React.CSSProperties}
              />
              <Panel defaultSize={30} minSize={15} maxSize={45} className="hidden lg:block">
                <ErrorBoundary title="Agent Panel Error">
                  <Suspense fallback={viewFallback}>
                    <FastAgentPanel
                      isOpen={true}
                      onClose={() => setShowFastAgent(false)}
                      selectedDocumentIds={selectedDocumentIdsForAgent}
                      initialThreadId={fastAgentThreadId}
                      variant="sidebar"
                      openOptions={fastAgentOpenOptions}
                      onOptionsConsumed={clearFastAgentOptions}
                      onVoiceIntent={handleVoiceIntent}
                    />
                  </Suspense>
                </ErrorBoundary>
              </Panel>
            </>
          )}
        </PanelGroup>
        <CockpitIntelRail currentView={currentView} agentOpen={showFastAgent} />
        </div>
      </div>

      {/* Bottom: Command Bar */}
      <CommandBar
        mode={mode}
        currentView={currentView}
        onViewChange={setCurrentView}
        onOpenPalette={commandPalette.toggle}
        onToggleAgent={() => setShowFastAgent((v) => !v)}
        onToggleLayout={handleToggleLayout}
        agentOpen={showFastAgent}
        badgeCounts={badgeCounts}
      />

      {/* Mobile Agent Panel overlay */}
      <div className="lg:hidden" role="complementary" aria-label="Assistant panel">
        {fastAgentHasMounted && (
          <ErrorBoundary title="Agent Panel Error">
            <Suspense
              fallback={
                showFastAgent ? (
                  <div className="fixed inset-0 z-50 bg-surface flex items-center justify-center text-sm text-muted-foreground">
                    Loading assistant...
                  </div>
                ) : null
              }
            >
              <FastAgentPanel
                isOpen={showFastAgent}
                onClose={() => setShowFastAgent(false)}
                selectedDocumentIds={selectedDocumentIdsForAgent}
                initialThreadId={fastAgentThreadId}
                variant="overlay"
                openOptions={fastAgentOpenOptions}
                onOptionsConsumed={clearFastAgentOptions}
                onVoiceIntent={handleVoiceIntent}
              />
            </Suspense>
          </ErrorBoundary>
        )}
      </div>

      {/* Command Palette */}
      <CommandPalette
        isOpen={commandPalette.isOpen}
        onClose={commandPalette.close}
        onCommandExecuted={trackCommandPaletteExecution}
        onNavigate={navigateToView}
        onCreateDocument={() => {
          navigate(VIEW_PATH_MAP["documents"] ?? "/workspace");
          setCurrentView("documents");
          onDocumentSelect(null);
          window.dispatchEvent(new CustomEvent("document:create"));
        }}
        onCreateTask={() => {
          navigate(VIEW_PATH_MAP["documents"] ?? "/workspace");
          setCurrentView("documents");
          onDocumentSelect(null);
          dispatchDeferred("voice:create-task");
        }}
        onOpenSettings={() => openSettings("usage")}
        additionalActions={modeSwitchActions}
      />

      {/* Popovers */}
      <MiniEditorPopover
        isOpen={!!mentionPopover}
        documentId={mentionPopover?.documentId || null}
        anchorEl={mentionPopover?.anchorEl || null}
        onClose={() => setMentionPopover(null)}
      />
      <HashtagQuickNotePopover
        isOpen={!!hashtagPopover}
        dossierId={hashtagPopover?.dossierId || null}
        hashtag={hashtagPopover?.hashtag || null}
        anchorEl={hashtagPopover?.anchorEl || null}
        onClose={() => setHashtagPopover(null)}
      />

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

      {/* Jarvis HUD Overlay — cinematic conversation interface backed by Convex streaming.
          ConvexJarvisHUD wraps the headless JarvisHUDLayout with real agent streaming.
          Supports both authenticated and anonymous users (rate-limited to 5 msg/day). */}
      {showJarvisHUD && (
        <ErrorBoundary title="Jarvis HUD failed to load">
          <Suspense fallback={null}>
            <ConvexJarvisHUD
              autoMinimizeDelay={2500}
              voiceMode="streaming"
              onNavigate={(targetView) => {
                // Agent-triggered navigation: map view name to route and switch
                const v = targetView as typeof currentView;
                setCurrentView(v);
                navigate(VIEW_PATH_MAP[v] ?? `/${v}`);
              }}
              onVoiceIntent={handleVoiceIntent}
            />
          </Suspense>
        </ErrorBoundary>
      )}
      </div>
    </HUDProvider>
  );
}
