import { Authenticated, Unauthenticated, useQuery, useMutation } from "convex/react";
import { toast } from "sonner";
// SignInForm intentionally not used on the landing anymore.
import { api } from "../convex/_generated/api";
import { MainLayout } from "./components/MainLayout";
import { TutorialPage } from "@/components/views/TutorialPage";
import WelcomeLanding from "@/components/views/WelcomeLanding";
import { useState, useEffect, useRef } from "react";
import { Id } from "../convex/_generated/dataModel";
import { ContextPillsProvider } from "./hooks/contextPills";

function App() {
  const [showTutorial, setShowTutorial] = useState(false);
  const [showWelcomeLanding, setShowWelcomeLanding] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<Id<"documents"> | null>(null);

  const user = useQuery(api.auth.loggedInUser);
  const documents = useQuery(api.documents.getSidebar);
  const ensureSeedOnLogin = useMutation(api.onboarding.ensureSeedOnLogin);
  const didEnsureRef = useRef(false);

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

  return (
    <main className="h-screen">
      <Unauthenticated>
        {/* Marketing/landing welcome with Mini Note Agent and animations */}
        <WelcomeLanding />
      </Unauthenticated>
      <Authenticated>
        <ContextPillsProvider>
          {showTutorial ? (
            <TutorialPage
              onGetStarted={handleGetStarted}
              onDocumentSelect={handleDocumentSelect}
            />
          ) : showWelcomeLanding ? (
            /* Authenticated users can navigate back to WelcomeLanding */
            <WelcomeLanding onDocumentSelect={handleDocumentSelect} />
          ) : documents && documents.length > 0 ? (
            <MainLayout
              selectedDocumentId={selectedDocumentId}
              onDocumentSelect={setSelectedDocumentId}
              onShowWelcome={handleShowTutorial}
              onShowWelcomeLanding={handleShowWelcomeLanding}
            />
          ) : (
            /* Authenticated users with no documents stay on WelcomeLanding */
            <WelcomeLanding onDocumentSelect={handleDocumentSelect} />
          )}
        </ContextPillsProvider>
      </Authenticated>
    </main>
  );
}

export default App;
