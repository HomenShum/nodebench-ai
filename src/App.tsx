import { Authenticated, Unauthenticated, useConvexAuth } from "convex/react";
import { useLocation, useNavigate } from "react-router-dom";
import { CockpitLayout } from "./layouts/CockpitLayout";
import { TutorialPage } from "@/features/onboarding/views/TutorialPage";
import { useState, useEffect, useCallback, lazy, Suspense, useRef } from "react";
import { Id } from "../convex/_generated/dataModel";
import { ContextPillsProvider } from "./hooks/contextPills";
import { FastAgentProvider, useFastAgent } from "@/features/agents/context/FastAgentContext";
import { SelectionProvider } from "@/features/agents/context/SelectionContext";
import { FeedbackListener } from "@/shared/hooks/FeedbackListener";
import { ThemeProvider } from "./contexts/ThemeContext";
import { OracleSessionProvider } from "./contexts/OracleSessionContext";
import { SkipLinks } from "./shared/components/SkipLinks";
import { EvidenceProvider } from "@/features/research/contexts/EvidenceContext";
import { ErrorBoundary } from "@/shared/components/ErrorBoundary";
import { ViewSkeleton } from "@/components/skeletons/ViewSkeleton";
import { useWebMcpProvider } from "./hooks/useWebMcpProvider";
import type { MainView } from "@/lib/registry/viewRegistry";
import { buildCockpitPathForView } from "@/lib/registry/viewRegistry";
import { initErrorReporting } from "@/lib/errorReporting";

const ShareableMemoView = lazy(() => import("@/features/founder/views/ShareableMemoView"));
const PublicEntityShareView = lazy(() => import("@/features/share/views/PublicEntityShareView"));
const PublicCompanyProfileView = lazy(() => import("@/features/founder/views/PublicCompanyProfileView"));
const EmbedView = lazy(() => import("@/features/founder/views/EmbedView"));
const FounderRouteResolver = lazy(() => import("@/features/founder/views/FounderRouteResolver"));

const FastAgentPanel = lazy(() =>
  import("@/features/agents/components/FastAgentPanel/FastAgentPanel").then((mod) => ({
    default: mod.FastAgentPanel,
  })),
);

/**
 * GlobalFastAgentPanel - Renders FastAgentPanel connected to FastAgentContext.
 *
 * The cockpit shell owns the in-layout agent panel, so this global overlay only
 * appears when no external handler is registered.
 */
function GlobalFastAgentPanel() {
  const { isOpen, close, options, clearOptions, hasExternalHandler } = useFastAgent();

  // Skip when the active shell is handling the panel directly.
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

function App() {
  const location = useLocation();
  const [showTutorial, setShowTutorial] = useState(false);

  // Initialize global error tracking once on mount
  const errorInitRef = useRef(false);
  useEffect(() => {
    if (!errorInitRef.current) {
      errorInitRef.current = true;
      initErrorReporting();
    }
  }, []);
  const [selectedDocumentId, setSelectedDocumentId] = useState<Id<"documents"> | null>(null);

  // WebMCP provider — expose NodeBench tools to browser agents via navigator.modelContext
  const [webmcpEnabled] = useState(() => localStorage.getItem("nodebench_webmcp_provider_enabled") === "true");
  const { isAuthenticated: webmcpIsAuth } = useConvexAuth();
  const nav = useNavigate();
  const handleWebMcpNavigate = useCallback((view: MainView) => {
    nav(buildCockpitPathForView({ view }));
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

  // Standalone route: /memo/:id renders without cockpit chrome or auth wrapper
  const isMemoRoute = location.pathname.startsWith("/memo/");
  if (isMemoRoute) {
    return (
      <ThemeProvider>
        <ErrorBoundary title="Something went wrong">
          <Suspense fallback={<ViewSkeleton />}>
            {/* route-fade-in: 220ms fade + translate on mount so
                navigations INTO this surface feel continuous. Safe
                on standalone routes because they always remount. */}
            <div key={location.pathname} className="route-fade-in">
              <ShareableMemoView />
            </div>
          </Suspense>
        </ErrorBoundary>
      </ThemeProvider>
    );
  }

  // Standalone route: /share/{token} renders anonymous read-only diligence
  // brief. Token IS the auth credential — no sign-in required.
  const isShareRoute = location.pathname.startsWith("/share/");
  if (isShareRoute) {
    return (
      <ThemeProvider>
        <ErrorBoundary title="Something went wrong">
          <Suspense fallback={<ViewSkeleton />}>
            <div key={location.pathname} className="route-fade-in">
              <PublicEntityShareView />
            </div>
          </Suspense>
        </ErrorBoundary>
      </ThemeProvider>
    );
  }

  // Standalone route: /company/:slug renders public company intelligence profile
  const isCompanyRoute = location.pathname.startsWith("/company/");
  if (isCompanyRoute) {
    return (
      <ThemeProvider>
        <ErrorBoundary title="Something went wrong">
          <Suspense fallback={<ViewSkeleton />}>
            <div key={location.pathname} className="route-fade-in">
              <PublicCompanyProfileView />
            </div>
          </Suspense>
        </ErrorBoundary>
      </ThemeProvider>
    );
  }

  // Standalone route: /embed/:type/:id renders minimal iframe-friendly widget
  const isEmbedRoute = location.pathname.startsWith("/embed/");
  if (isEmbedRoute) {
    return (
      <ThemeProvider>
        <ErrorBoundary title="Something went wrong">
          <Suspense fallback={<ViewSkeleton />}>
            <div key={location.pathname} className="route-fade-in">
              <EmbedView />
            </div>
          </Suspense>
        </ErrorBoundary>
      </ThemeProvider>
    );
  }

  // Smart /founder route — promised in agent-setup.txt + pitch copy.
  // Resolves to a useful destination based on session state.
  // See: src/features/founder/views/FounderRouteResolver.tsx
  //      docs/architecture/FOUNDER_FEATURE.md
  const isFounderRoute =
    location.pathname === "/founder" || location.pathname.startsWith("/founder/");
  if (isFounderRoute) {
    return (
      <ThemeProvider>
        <ErrorBoundary title="Something went wrong">
          <Suspense fallback={<ViewSkeleton />}>
            <div key={location.pathname} className="route-fade-in">
              <FounderRouteResolver />
            </div>
          </Suspense>
        </ErrorBoundary>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <EvidenceProvider>
        <SkipLinks />
        <main
          id="main-content"
          className="h-screen bg-surface text-content"
          data-app-id="nodebench-ai"
          data-app-shell="main"
          data-agent-surface="app"
          data-mcp-compat="webmcp chrome-devtools-mcp"
          data-webmcp-enabled={webmcpEnabled ? "true" : "false"}
        >
          <Unauthenticated>
            <FastAgentProvider>
              <SelectionProvider>
                <OracleSessionProvider>
                <ContextPillsProvider>
                  <ErrorBoundary title="Something went wrong">
                    <Suspense fallback={<ViewSkeleton />}>
                      <CockpitLayout
                        selectedDocumentId={null}
                        onDocumentSelect={() => { }}
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
                        <CockpitLayout
                          selectedDocumentId={selectedDocumentId}
                          onDocumentSelect={setSelectedDocumentId}
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
