import { Authenticated, Unauthenticated, useConvexAuth } from "convex/react";
import { useLocation, useNavigate } from "react-router-dom";
import { MainLayout } from "./components/MainLayout";
import { CockpitLayout } from "./layouts/CockpitLayout";
import { TutorialPage } from "@/features/onboarding/views/TutorialPage";
import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { Id } from "../convex/_generated/dataModel";
import { ContextPillsProvider } from "./hooks/contextPills";
import { FastAgentProvider, useFastAgent } from "@/features/agents/context/FastAgentContext";
import { SelectionProvider } from "@/features/agents/context/SelectionContext";
import { FeedbackListener } from "@/shared/hooks/FeedbackListener";
import { ThemeProvider, useThemeSafe } from "./contexts/ThemeContext";
import { OracleSessionProvider } from "./contexts/OracleSessionContext";
import { SkipLinks } from "./components/SkipLinks";
import { EvidenceProvider } from "@/features/research/contexts/EvidenceContext";
import { ErrorBoundary } from "@/shared/components/ErrorBoundary";
import { ViewSkeleton } from "@/components/skeletons/ViewSkeleton";
import { useWebMcpProvider } from "./hooks/useWebMcpProvider";
import type { MainView } from "./hooks/useMainLayoutRouting";
import { VIEW_PATH_MAP } from "./layouts/cockpitModes";

const FastAgentPanel = lazy(() =>
  import("@/features/agents/components/FastAgentPanel/FastAgentPanel").then((mod) => ({
    default: mod.FastAgentPanel,
  })),
);

/**
 * GlobalFastAgentPanel - Renders FastAgentPanel connected to FastAgentContext
 * This allows the FloatingAgentButton to open the panel from anywhere.
 * 
 * NOTE: When MainLayout is mounted, it registers its own panel handler via
 * registerExternalState, so we skip rendering here to avoid duplicates.
 */
function GlobalFastAgentPanel() {
  const { isOpen, close, options, clearOptions, hasExternalHandler } = useFastAgent();

  // Skip if MainLayout is handling the panel
  if (hasExternalHandler) return null;

  const handleClose = () => {
    close();
    clearOptions();
  };

  return (
    <Suspense fallback={isOpen ? <div className="fixed inset-y-0 right-0 w-96 bg-background border-l border-border/60 flex items-center justify-center text-sm text-muted-foreground">Loading assistant...</div> : null}>
      <FastAgentPanel
        isOpen={isOpen}
        onClose={handleClose}
        variant="overlay"
        openOptions={options}
        onOptionsConsumed={clearOptions}
      />
    </Suspense>
  );
}

/** Renders CockpitLayout or MainLayout based on theme.layout preference */
function LayoutSwitch({
  selectedDocumentId,
  onDocumentSelect,
  onShowWelcome,
  onShowResearchHub,
}: {
  selectedDocumentId: Id<"documents"> | null;
  onDocumentSelect: (id: Id<"documents"> | null) => void;
  onShowWelcome?: () => void;
  onShowResearchHub?: () => void;
}) {
  const { theme } = useThemeSafe();
  if (theme.layout === "cockpit") {
    return (
      <CockpitLayout
        selectedDocumentId={selectedDocumentId}
        onDocumentSelect={onDocumentSelect}
      />
    );
  }
  return (
    <MainLayout
      selectedDocumentId={selectedDocumentId}
      onDocumentSelect={onDocumentSelect}
      onShowWelcome={onShowWelcome}
      onShowResearchHub={onShowResearchHub}
    />
  );
}

function App() {
  const location = useLocation();
  const [showTutorial, setShowTutorial] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<Id<"documents"> | null>(null);

  // WebMCP provider — expose NodeBench tools to browser agents via navigator.modelContext
  const [webmcpEnabled] = useState(() => localStorage.getItem("nodebench_webmcp_provider_enabled") === "true");
  const { isAuthenticated: webmcpIsAuth } = useConvexAuth();
  const nav = useNavigate();
  const handleWebMcpNavigate = useCallback((view: MainView) => {
    const path = VIEW_PATH_MAP[view] ?? `/${view}`;
    nav(path);
  }, [nav]);
  useWebMcpProvider({
    enabled: webmcpEnabled,
    currentPath: location.pathname,
    isAuthenticated: webmcpIsAuth,
    onNavigate: handleWebMcpNavigate,
  });

  // Deep link: ?doc=ID auto-opens a shared document
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const docId = params.get('doc');
    if (docId) {
      setSelectedDocumentId(docId as Id<"documents">);
      setShowTutorial(false);
    }
  }, [location.search]);

  // Any navigation away from /onboarding dismisses the tutorial
  useEffect(() => {
    if (location.pathname.toLowerCase().startsWith("/onboarding")) {
      setShowTutorial(true);
    } else {
      setShowTutorial(false);
    }
  }, [location.pathname]);

  const handleGetStarted = () => {
    setShowTutorial(false);
  };

  const handleDocumentSelect = (documentId: string) => {
    setSelectedDocumentId(documentId as Id<"documents">);
    setShowTutorial(false);
  };

  const handleShowTutorial = () => {
    setShowTutorial(true);
  };

  const handleShowResearchHub = () => {
    setShowTutorial(false);
  };

  return (
    <ThemeProvider>
      <EvidenceProvider>
        <SkipLinks />
        <main id="main-content" className="h-screen bg-surface text-content">
          <Unauthenticated>
            <FastAgentProvider>
              <SelectionProvider>
                <OracleSessionProvider>
                <ContextPillsProvider>
                  {/* Use LayoutSwitch for visual consistency - limited features for guests */}
                  <ErrorBoundary title="Something went wrong">
                    <Suspense fallback={<ViewSkeleton />}>
                      <LayoutSwitch
                        selectedDocumentId={null}
                        onDocumentSelect={() => { }}
                        onShowWelcome={() => { }}
                        onShowResearchHub={() => { }}
                      />
                    </Suspense>
                  </ErrorBoundary>
                  {/* Global Fast Agent Panel for guests */}
                  <GlobalFastAgentPanel />
                </ContextPillsProvider>
                </OracleSessionProvider>
              </SelectionProvider>
            </FastAgentProvider>
          </Unauthenticated>
          <Authenticated>
            <FastAgentProvider>
              <SelectionProvider>
                <OracleSessionProvider>
                <ContextPillsProvider>
                  <ErrorBoundary title="Something went wrong">
                    <Suspense fallback={<ViewSkeleton />}>
                      {showTutorial ? (
                        <TutorialPage
                          onGetStarted={handleGetStarted}
                          onDocumentSelect={handleDocumentSelect}
                        />
                      ) : (
                        /* LayoutSwitch picks cockpit or classic based on theme.layout */
                        <LayoutSwitch
                          selectedDocumentId={selectedDocumentId}
                          onDocumentSelect={setSelectedDocumentId}
                          onShowWelcome={handleShowTutorial}
                          onShowResearchHub={handleShowResearchHub}
                        />
                      )}
                    </Suspense>
                  </ErrorBoundary>
                  {/* Global Fast Agent Panel - controlled via context */}
                  <GlobalFastAgentPanel />
                  {/* Global Feedback Listener for audio/visual cues */}
                  <FeedbackListener />
                </ContextPillsProvider>
                </OracleSessionProvider>
              </SelectionProvider>
            </FastAgentProvider>
          </Authenticated>
        </main>
      </EvidenceProvider>
    </ThemeProvider>
  );
}

export default App;
