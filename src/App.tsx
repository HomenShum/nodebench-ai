import { Authenticated, Unauthenticated, useQuery, useMutation } from "convex/react";
import { toast } from "sonner";
// SignInForm intentionally not used on the landing anymore.
import { api } from "../convex/_generated/api";
import { MainLayout } from "./components/MainLayout";
import { TutorialPage } from "@/features/onboarding/views/TutorialPage";
import WelcomeLanding from "@/features/research/views/WelcomeLanding";
import { useState, useEffect, useRef } from "react";
import { Id } from "../convex/_generated/dataModel";
import { ContextPillsProvider } from "./hooks/contextPills";
import { FastAgentProvider, useFastAgent } from "@/features/agents/context/FastAgentContext";
import { SelectionProvider } from "@/features/agents/context/SelectionContext";
import { FastAgentPanel } from "@/features/agents";

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
    <FastAgentPanel
      isOpen={isOpen}
      onClose={handleClose}
      variant="overlay"
    />
  );
}

function App() {
  const [showTutorial, setShowTutorial] = useState(false);
  // Check if URL hash indicates a specific workspace view
  const initialHash = typeof window !== 'undefined' ? window.location.hash.toLowerCase() : '';
  const hashIndicatesWorkspace = initialHash.startsWith('#agents') ||
    initialHash.startsWith('#calendar') ||
    initialHash.startsWith('#documents') ||
    initialHash.startsWith('#roadmap');
  const [showWelcomeLanding, setShowWelcomeLanding] = useState(!hashIndicatesWorkspace);
  const [selectedDocumentId, setSelectedDocumentId] = useState<Id<"documents"> | null>(null);

  const user = useQuery(api.domains.auth.auth.loggedInUser);
  const documents = useQuery(api.domains.documents.documents.getSidebar);
  const ensureSeedOnLogin = useMutation(api.domains.auth.onboarding.ensureSeedOnLogin);
  const didEnsureRef = useRef(false);

  // Listen for hash changes to switch between WelcomeLanding and MainLayout
  useEffect(() => {
    const handleHashChange = () => {
      const h = window.location.hash.toLowerCase();
      if (h.startsWith('#agents') || h.startsWith('#calendar') || h.startsWith('#documents') || h.startsWith('#roadmap')) {
        setShowWelcomeLanding(false);
        setShowTutorial(false);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Note: We no longer auto-show tutorial for new users
  // Users stay on WelcomeLanding and can access tutorial manually if needed

  const handleGetStarted = () => {
    setShowTutorial(false);
    setShowWelcomeLanding(false);
  };

  const handleDocumentSelect = (documentId: string) => {
    setSelectedDocumentId(documentId as Id<"documents">);
    setShowTutorial(false);
    setShowWelcomeLanding(false);
  };

  const handleShowTutorial = () => {
    setShowTutorial(true);
    setShowWelcomeLanding(false);
  };

  const handleShowWelcomeLanding = () => {
    setShowWelcomeLanding(true);
    setShowTutorial(false);
  };

  const handleEnterWorkspace = () => {
    setShowWelcomeLanding(false);
    setShowTutorial(false);
  };

  return (
    <main className="h-screen">
      <Unauthenticated>
        <FastAgentProvider>
          <SelectionProvider>
            <ContextPillsProvider>
              {/* Use MainLayout for visual consistency - limited features for guests */}
              <MainLayout
                selectedDocumentId={null}
                onDocumentSelect={() => {}}
                onShowWelcome={() => {}}
                onShowWelcomeLanding={() => {}}
              />
              {/* Global Fast Agent Panel for guests */}
              <GlobalFastAgentPanel />
            </ContextPillsProvider>
          </SelectionProvider>
        </FastAgentProvider>
      </Unauthenticated>
      <Authenticated>
        <FastAgentProvider>
          <SelectionProvider>
            <ContextPillsProvider>
              {showTutorial ? (
                <TutorialPage
                  onGetStarted={handleGetStarted}
                  onDocumentSelect={handleDocumentSelect}
                />
              ) : (
                /* Always use MainLayout - it handles research/workspace views internally */
                <MainLayout
                  selectedDocumentId={selectedDocumentId}
                  onDocumentSelect={setSelectedDocumentId}
                  onShowWelcome={handleShowTutorial}
                  onShowWelcomeLanding={handleShowWelcomeLanding}
                />
              )}
              {/* Global Fast Agent Panel - controlled via context */}
              <GlobalFastAgentPanel />
            </ContextPillsProvider>
          </SelectionProvider>
        </FastAgentProvider>
      </Authenticated>
    </main>
  );
}

export default App;
