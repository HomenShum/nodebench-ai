import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { SignInForm } from "./SignInForm";
import { api } from "../convex/_generated/api";
import { MainLayout } from "./components/MainLayout";
import { WelcomePage } from "./components/WelcomePage";
import { useState, useEffect } from "react";
import { Id } from "../convex/_generated/dataModel";
import { ContextPillsProvider } from "./hooks/contextPills";

function App() {
  const [showWelcome, setShowWelcome] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<Id<"documents"> | null>(null);
  
  const user = useQuery(api.auth.loggedInUser);
  const documents = useQuery(api.documents.getSidebar);

  // Show welcome page for new users (no documents) or when explicitly requested
  useEffect(() => {
    if (user && documents !== undefined) {
      // Check if user has no documents (new user)
      const hasDocuments = documents && documents.length > 0;
      if (!hasDocuments) {
        setShowWelcome(true);
      }
    }
  }, [user, documents]);

  const handleGetStarted = () => {
    setShowWelcome(false);
  };

  const handleDocumentSelect = (documentId: string) => {
    setSelectedDocumentId(documentId as Id<"documents">);
    setShowWelcome(false);
  };

  const handleShowWelcome = () => {
    setShowWelcome(true);
  };

  return (
    <main className="h-screen">
      <Unauthenticated>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                AI Document Workspace
              </h1>
              <p className="text-gray-600">
                Create, organize, and collaborate on documents with AI assistance
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <SignInForm />
            </div>
          </div>
        </div>
      </Unauthenticated>
      <Authenticated>
        <ContextPillsProvider>
          {showWelcome ? (
            <WelcomePage 
              onGetStarted={handleGetStarted}
              onDocumentSelect={handleDocumentSelect}
            />
          ) : (
            <MainLayout 
              selectedDocumentId={selectedDocumentId}
              onDocumentSelect={setSelectedDocumentId}
              onShowWelcome={handleShowWelcome}
            />
          )}
        </ContextPillsProvider>
      </Authenticated>
    </main>
  );
}

export default App;
