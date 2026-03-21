/**
 * CockpitLayout — 5-region cockpit shell.
 *
 * +--------------------------------------+
 * | StatusStrip                          |
 * +--------+------------------+----------+
 * | Work-  |  ActiveSurface   |  Agent   |
 * | space  |      Host        | Presence |
 * | Rail   |                  |  Rail    |
 * +--------+------------------+----------+
 * | TraceStrip                           |
 * +--------------------------------------+
 *
 * CSS Grid: status / left center right / trace
 * CommandBar floats via Cmd+K. FastAgent panel overlays.
 */

import { useState, useEffect, useCallback, useRef, useMemo, startTransition, Suspense, lazy } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useConvexAuth } from "convex/react";
import { Id } from "../../convex/_generated/dataModel";
import { useFastAgent } from "@/features/agents/context/FastAgentContext";
import { useCommandPalette } from "../hooks/useCommandPalette";
import { useGlobalEventListeners } from "../hooks/useGlobalEventListeners";
import { useViewWebMcpTools } from "../hooks/useViewWebMcpTools";
import { ErrorBoundary } from "@/shared/components/ErrorBoundary";
import { ViewSkeleton } from "@/components/skeletons";
import {
  AgentMetadata,
  CommandPalette,
  QuickCaptureWidget,
  type ExecutedCommand,
  HashtagQuickNotePopover,
} from "@/layouts/chrome";
import MiniEditorPopover from "@/shared/components/MiniEditorPopover";
import { useTheme } from "../contexts/ThemeContext";
import { parseVoiceIntent, useVoiceIntentRouter } from "../hooks/useVoiceIntentRouter";
import { useIntentTelemetry } from "@/lib/hooks/useIntentTelemetry";
import {
  buildCockpitPath,
  buildCockpitPathForView,
  getSurfaceForView,
  SURFACE_TITLES,
  VIEW_MAP,
  type CockpitSurfaceId,
} from "@/lib/registry/viewRegistry";

import { useCockpitMode } from "./useCockpitMode";
import { type CockpitMode, MODES } from "./cockpitModes";
import type { CommandAction } from "@/layouts/chrome";
import { StatusStrip } from "./StatusStrip";
import { CommandBar } from "./CommandBar";
import { ActiveSurfaceHost } from "./ActiveSurfaceHost";
import { WorkspaceRail } from "./WorkspaceRail";
import { AgentPresenceRail } from "./AgentPresenceRail";
import "./hud.css";

const isMac = typeof navigator !== "undefined" && /mac/i.test(navigator.userAgent);

const FastAgentPanel = lazy(() =>
  import("@features/agents/components/FastAgentPanel/FastAgentPanel").then((mod) => ({
    default: mod.FastAgentPanel,
  })),
);
const SettingsModal = lazy(() => import("@/layouts/settings/SettingsModal"));

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

  const { setLayout, setMode: setThemeMode, resolvedMode, theme } = useTheme();

  // Cockpit mode routing (wraps useMainLayoutRouting + mode derivation)
  const cockpit = useCockpitMode();
  const {
    currentView,
    setCurrentView,
    currentSurface,
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
    panel,
    runId,
    documentParam,
    workspaceParam,
    canonicalPath,
    isLegacyRedirect,
  } = cockpit;

  // ── Surface collapse state ─────────────────────────────────────────────────
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  const [refreshNonce, setRefreshNonce] = useState(0);
  const [lastVoiceInstruction, setLastVoiceInstruction] = useState<string | null>(null);

  const trackIntentEvent = useIntentTelemetry();
  const lastTrackedViewRef = useRef<string | null>(null);

  // Per-view WebMCP tools
  const webmcpViewEnabled = typeof navigator !== "undefined" && !!navigator.modelContext;
  useViewWebMcpTools(currentView, webmcpViewEnabled);

  // Agent panel state
  const [showFastAgent, setShowFastAgent] = useState(false);
  const [fastAgentHasMounted, setFastAgentHasMounted] = useState(false);
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
      const focalEl = document.querySelector<HTMLElement>("[data-cockpit-area='center']");
      const scrollChild = focalEl?.querySelector<HTMLElement>(".nb-lazy-view") ?? focalEl;
      if (scrollChild) {
        scrollPositions.current.set(currentViewRef.current, scrollChild.scrollTop);
        if (scrollPositions.current.size > MAX_SCROLL_ENTRIES) {
          const firstKey = scrollPositions.current.keys().next().value;
          if (firstKey !== undefined) scrollPositions.current.delete(firstKey);
        }
      }
      previousViewRef.current = currentViewRef.current;
      currentViewRef.current = currentView;
      requestAnimationFrame(() => {
        const el = document.querySelector<HTMLElement>("[data-cockpit-area='center']");
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
    if (theme.layout !== "cockpit") {
      setLayout("cockpit");
    }
  }, [setLayout, theme.layout]);

  useEffect(() => {
    if (!canonicalPath || !isLegacyRedirect) return;
    const currentFullPath = `${location.pathname}${location.search}`;
    if (currentFullPath === canonicalPath) return;
    navigate(canonicalPath, { replace: true });
  }, [canonicalPath, isLegacyRedirect, location.pathname, location.search, navigate]);

  const navigateToView = useCallback((view: typeof currentView) => {
    const nextSurface = getSurfaceForView(view);
    // NOTE: runId is intentionally omitted — reading it from stale React state
    // causes the previous trace run to pollute non-trace surface URLs.
    // The trace surface picks up runId from the URL via useCockpitRouting.
    const path = buildCockpitPathForView({
      view,
      entity: nextSurface === "graph" ? entityName : null,
      run: null,
      doc:
        nextSurface === "editor"
          ? documentParam ?? (selectedDocumentId ? String(selectedDocumentId) : null)
          : null,
      workspace: nextSurface === "editor" ? workspaceParam : null,
      panel: view === "delegation" ? "permissions" : nextSurface === "trace" ? panel : null,
      tab: nextSurface === "research" && view === "research" ? researchHubInitialTab : null,
    });
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
  }, [documentParam, entityName, navigate, panel, researchHubInitialTab, selectedDocumentId, setCurrentView, workspaceParam]);

  const navigateToSurface = useCallback((surfaceId: CockpitSurfaceId) => {
    // NOTE: runId intentionally omitted — same stale-closure fix as navigateToView.
    navigate(
      buildCockpitPath({
        surfaceId,
        view: currentSurface === surfaceId ? currentView : null,
        entity: surfaceId === "graph" ? entityName : null,
        run: null,
        doc:
          surfaceId === "editor"
            ? documentParam ?? (selectedDocumentId ? String(selectedDocumentId) : null)
            : null,
        workspace: surfaceId === "editor" ? workspaceParam : null,
        panel: surfaceId === "trace" ? panel : null,
        tab:
          surfaceId === "research" && currentSurface === surfaceId && currentView === "research"
            ? researchHubInitialTab
            : null,
      }),
    );
  }, [currentSurface, currentView, documentParam, entityName, navigate, panel, researchHubInitialTab, selectedDocumentId, workspaceParam]);

  const dispatchDeferred = useCallback((eventName: string, detail?: Record<string, unknown>) => {
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent(eventName, detail ? { detail } : undefined));
    }, 0);
  }, []);

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
    setLayout: () => setLayout("cockpit"),
    setThemeMode: (m: 'light' | 'dark') => setThemeMode(m),
    toggleTheme: () => setThemeMode(resolvedMode === "dark" ? "light" : "dark"),
    toggleLayout: () => setLayout("cockpit"),
    selectThread: (_index: number) => {
      setShowFastAgent(true);
      setFastAgentHasMounted(true);
      dispatchDeferred("voice:select-thread", { index: _index });
    },
    triggerSearch: (query: string) => {
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
    },
    scrollTo: (position: 'top' | 'bottom') => {
      window.scrollTo({ top: position === 'top' ? 0 : document.body.scrollHeight, behavior: 'smooth' });
    },
    goBack: () => {
      if (previousViewRef.current) {
        navigateToView(previousViewRef.current);
      }
    },
    refresh: () => setRefreshNonce((value) => value + 1),
  }), [commandPalette.open, dispatchDeferred, navigateToView, onDocumentSelect, openSettings, resolvedMode, setFastAgentHasMounted, setLayout, setMode, setShowFastAgent, setThemeMode]);

  const { handleIntent: routeVoiceIntent } = useVoiceIntentRouter(voiceIntentActions);
  const handleVoiceIntent = useCallback(
    (text: string, source: "voice" | "text" = "voice") => {
      if (source === "voice" && text.trim()) {
        setLastVoiceInstruction(text.trim());
      }
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
    if (documentParam) {
      onDocumentSelect(documentParam as Id<"documents">);
    }
  }, [documentParam, onDocumentSelect]);

  const { close: closePalette } = commandPalette;

  const currentObjective = useMemo(() => {
    const viewTitle = VIEW_MAP[currentView]?.title ?? SURFACE_TITLES[currentSurface];
    if (entityName) return `${viewTitle}: ${entityName}`;
    if (runId && currentSurface === "trace") return `${viewTitle}: run ${runId}`;
    return viewTitle;
  }, [currentSurface, currentView, entityName, runId]);

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
            ? "openSettings"
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
        icon: <span style={{ color: m.color, fontWeight: 700 }}>&#9670;</span>,
        keywords: [m.id, m.label.toLowerCase(), ...m.views],
        section: "mode" as const,
        shortcut: `${isMac ? "\u2325" : "Alt+"}${idx + 1}`,
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
    if (!modeAnnouncedRef.current) {
      modeAnnouncedRef.current = true;
      return;
    }
    setModeAnnouncement(`${modeConfig.label} mode \u2014 ${modeConfig.views.length} views`);
    const timer = setTimeout(() => setModeAnnouncement(""), 3000);
    return () => clearTimeout(timer);
  }, [mode, modeConfig]);

  // Pause infinite HUD animations when tab is hidden
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

  // ── Suppress unused var warnings for values kept for downstream compatibility ──
  void refreshNonce;

  return (
    <div
      className="h-[100dvh] overflow-hidden bg-surface cockpit-grid"
      data-left-collapsed={leftCollapsed ? "" : undefined}
      data-right-collapsed={rightCollapsed || showFastAgent ? "" : undefined}
    >
      {/* Screen reader: announce mode changes */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {modeAnnouncement}
      </div>

      {/* JSON-LD metadata for agent crawlers */}
      <AgentMetadata currentView={currentView} currentPath={location.pathname} />

      {/* ── Top: Status Strip ─────────────────────────────────────────── */}
      <div style={{ gridArea: "status" }}>
        <StatusStrip
          currentView={currentView}
          entityName={entityName}
        />
      </div>

      {/* ── Left: WorkspaceRail (replaces ModeRail + CleanSidebar) ──── */}
      <div style={{ gridArea: "left" }}>
        <WorkspaceRail
          activeSurface={currentSurface}
          onSurfaceChange={navigateToSurface}
          isCollapsed={leftCollapsed}
          onToggleCollapse={() => setLeftCollapsed((v) => !v)}
          onOpenSettings={() => openSettings("usage")}
        />
      </div>

      {/* ── Center: ActiveSurfaceHost + Agent Panel (resizable) ──────── */}
      <div
        style={{ gridArea: "center" }}
        className="relative min-w-0 min-h-0 overflow-hidden flex"
        role="main"
        aria-label="Main content"
        data-cockpit-area="center"
      >
        <div className="flex-1 min-w-0">
          <ActiveSurfaceHost
            currentSurface={currentSurface}
            currentView={currentView}
            panel={panel}
            entityName={entityName}
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
            showResearchDossier={showResearchDossier}
            setShowResearchDossier={setShowResearchDossier}
            researchHubInitialTab={researchHubInitialTab}
            setResearchHubInitialTab={setResearchHubInitialTab}
            activeSources={activeSources}
            setActiveSources={setActiveSources}
            setCurrentView={setCurrentView}
            setEntityName={setEntityName}
            onNavigateToView={navigateToView}
            onOpenFastAgent={() => setShowFastAgent(true)}
            onOpenFastAgentWithPrompt={handleOpenFastAgentWithPrompt}
          />
        </div>

      </div>

        {/* ── Right: AgentPresenceRail — hidden when FastAgent panel is open */}
        <div style={{ gridArea: "right" }} className={showFastAgent ? "hidden" : "hidden lg:block"}>
          <AgentPresenceRail
            currentSurface={currentSurface}
            currentView={currentView}
            currentObjective={currentObjective}
            isCollapsed={rightCollapsed}
            onToggleCollapse={() => setRightCollapsed((v) => !v)}
            onOpenAgent={() => setShowFastAgent(true)}
            lastVoiceInstruction={lastVoiceInstruction}
          />
        </div>

        {/* ── Bottom: Trace bar — live status (Datadog pattern) ──────── */}
        {showFastAgent && (
          <div
            style={{ gridColumn: "2 / 4", gridRow: "2 / 3" }}
            className="pointer-events-none z-20 hidden xl:flex justify-end p-2 pl-0"
            role="complementary"
            aria-label="Assistant panel"
          >
            <div className="pointer-events-auto flex h-full w-[min(400px,34vw)] max-w-[440px] overflow-hidden rounded-2xl border border-white/[0.08] bg-[rgba(10,12,18,0.92)] backdrop-blur-2xl">
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
            </div>
          </div>
        )}

        <div
          style={{ gridArea: "trace" }}
          className="flex items-center gap-4 border-t border-white/[0.06] bg-white/[0.02] px-4 py-1.5 text-[11px] text-content-muted"
        >
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/60" />
            Ready
          </span>
          <span className="text-content-muted/60">·</span>
          <span>All actions logged with evidence</span>
          <span className="ml-auto tabular-nums">{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        </div>

        {/* ── Command Bar — mobile only, desktop uses Cmd+K ──────────── */}
        <div className="lg:hidden">
        <CommandBar
          mode={mode}
          currentView={currentView}
          onViewChange={navigateToView}
          onOpenPalette={commandPalette.toggle}
          onToggleAgent={() => setShowFastAgent((v) => !v)}
          agentOpen={showFastAgent}
        />
        </div>

        {/* Mobile Agent Panel — full-screen takeover (primary interface on < lg) */}
        {showFastAgent && (
          <div
            className="fixed inset-0 z-50 bg-[var(--bg-primary)] lg:hidden"
            role="complementary"
            aria-label="Assistant panel"
          >
            <ErrorBoundary title="Agent Panel Error">
              <Suspense
                fallback={
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Loading assistant...
                  </div>
                }
              >
                <FastAgentPanel
                  isOpen={true}
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
          </div>
        )}

        {/* Command Palette */}
        <CommandPalette
          isOpen={commandPalette.isOpen}
          onClose={commandPalette.close}
          onCommandExecuted={trackCommandPaletteExecution}
          onNavigate={navigateToView}
          onCreateDocument={() => {
            navigateToView("documents");
            onDocumentSelect(null);
            window.dispatchEvent(new CustomEvent("document:create"));
          }}
          onCreateTask={() => {
            navigateToView("documents");
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

        {/* Jarvis HUD — disabled, agent panel handles chat */}
      </div>
  );
}
