/**
 * CleanSidebar - Simplified Dashboard Sidebar
 *
 * Uses SidebarGlobalNav for consistent navigation across the app.
 * Top Section: Global navigation (Home, My Workspace, Saved Dossiers)
 * Bottom Section: Contextual content (Recent Documents, File Explorer)
 *
 * Removed: Integration panel (12 icons), Docs/Messages/Reports tabs,
 * Source category buttons, Live Sources (moved to Welcome Landing)
 */

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import {
  FileText,
  ChevronDown,
  ChevronRight,
  Settings,
  Trash2,
  FolderOpen,
  DollarSign,
  TrendingUp,
  Sparkles,
  BookOpen,
  Zap,
  Github,
  GitPullRequest,
  Linkedin,
} from "lucide-react";
import { SidebarGlobalNav, type ActivePage, type RecentDossier } from "./SidebarGlobalNav";
import { SidebarButton } from "./ui";

type AppMode = 'workspace' | 'fast-agent' | 'deep-agent' | 'dossier';

interface CleanSidebarProps {
  appMode: AppMode;
  onModeChange: (mode: AppMode) => void;
  activeSources: string[];
  onToggleSource: (sourceId: string) => void;
  onOpenSettings?: (
    tab?: 'profile' | 'account' | 'usage' | 'integrations' | 'billing' | 'reminders'
  ) => void;
  onGoHome?: () => void;
  onEnterResearchHub?: () => void;
  selectedDocumentId?: Id<"documents"> | null;
  onDocumentSelect?: (docId: Id<"documents">) => void;
  /** Current view from MainLayout - used to highlight correct nav item */
  currentView?:
    | 'documents'
    | 'calendar'
    | 'roadmap'
    | 'timeline'
    | 'public'
    | 'agents'
    | 'research'
    | 'signals'
    | 'benchmarks'
    | 'funding'
    | 'activity'
    | 'entity'
    | 'footnotes'
    | 'showcase'
    | 'cost-dashboard'
    | 'industry-updates'
    | 'for-you-feed'
    | 'document-recommendations'
    | 'agent-marketplace'
    | 'github-explorer'
    | 'pr-suggestions'
    | 'linkedin-posts';
  /** Callback when view changes */
  onViewChange?: (view:
    | 'documents'
    | 'calendar'
    | 'roadmap'
    | 'timeline'
    | 'public'
    | 'agents'
    | 'research'
    | 'signals'
    | 'benchmarks'
    | 'funding'
    | 'activity'
    | 'entity'
    | 'footnotes'
    | 'showcase'
    | 'cost-dashboard'
    | 'industry-updates'
    | 'for-you-feed'
    | 'document-recommendations'
    | 'agent-marketplace'
    | 'github-explorer'
    | 'pr-suggestions'
    | 'linkedin-posts') => void;
}

export function CleanSidebar({
  appMode,
  onModeChange,
  activeSources: _activeSources,
  onToggleSource: _onToggleSource,
  onOpenSettings,
  onGoHome,
  onEnterResearchHub,
  selectedDocumentId,
  onDocumentSelect,
  currentView = 'documents',
  onViewChange,
}: CleanSidebarProps) {
  const [isDocsOpen, setIsDocsOpen] = useState(true);
  const user = useQuery(api.domains.auth.auth.loggedInUser);
  const { signIn } = useAuthActions();
  const trash = useQuery(api.domains.documents.documents.getTrash);
  const documents = useQuery(api.domains.documents.documents.getSidebar);

  // Detect if user is anonymous (no email = anonymous login)
  const isAnonymous = !user?.email;

  const handleGoogleSignIn = () => {
    void signIn("google", {
      redirectTo: typeof window !== "undefined" ? window.location.href : "/",
    });
  };

  // Get recent documents (limit to 8)
  const recentDocs = (documents ?? []).slice(0, 8);

  // Get recent dossiers for the expandable menu
  const recentDossiers: RecentDossier[] = useMemo(() => {
    return (documents ?? [])
      .filter((doc: any) => doc.type === 'dossier')
      .slice(0, 5)
      .map((doc: any) => ({
        id: doc._id,
        title: doc.title || 'Untitled Dossier',
        updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : undefined,
        isAgentUpdating: false, // TODO: Check if agent is actively updating this dossier
      }));
  }, [documents]);

  // Handle global navigation
  const handleNavigate = (page: ActivePage) => {
    if (page === 'research') {
      // Navigate to the Home gateway. The deep Research Hub is reachable via
      // the top-bar CTA, so Home should be stable and predictable.
      onViewChange?.('research');
      onGoHome?.();
    } else if (page === 'workspace') {
      onViewChange?.('documents');
      onModeChange('workspace');
    } else if (page === 'saved') {
      onModeChange('dossier');
    }
  };

  // Map currentView to ActivePage for highlighting
  const getActivePage = (): ActivePage => {
    if (currentView === 'research') return 'research';
    if (appMode === 'dossier') return 'saved';
    return 'workspace'; // documents, calendar, roadmap, etc. all show as workspace
  };

  // Handle dossier selection from expandable menu
  const handleDossierSelect = (dossierIdStr: string) => {
    const dossierId = dossierIdStr as Id<"documents">;
    onDocumentSelect?.(dossierId);
    onModeChange('dossier');
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center shadow-lg shadow-black/10">
            <span className="text-white font-bold text-sm">N</span>
          </div>
          <span className="text-lg font-bold text-stone-900 tracking-tight">Nodebench AI</span>
        </div>
      </div>

      {/* Unified Global Navigation */}
      <div className="px-3 pt-4">
        <SidebarGlobalNav
          activePage={getActivePage()}
          onNavigate={handleNavigate}
          recentDossiers={recentDossiers}
          onDossierSelect={handleDossierSelect}
        />
      </div>

      {/* Dashboard Links */}
      <div className="px-3 mt-6 mb-2">
        <div className="px-3 mb-3 text-[10px] font-bold text-stone-400/80 uppercase tracking-[0.12em]">
          Dashboards
        </div>
        <div className="space-y-0.5">
          <SidebarButton
            icon={<DollarSign />}
            label="Cost Dashboard"
            onClick={() => onViewChange?.('cost-dashboard')}
            isActive={currentView === 'cost-dashboard'}
            activeColor="emerald"
          />
          <SidebarButton
            icon={<TrendingUp />}
            label="Industry Updates"
            onClick={() => onViewChange?.('industry-updates')}
            isActive={currentView === 'industry-updates'}
            activeColor="blue"
          />
        </div>
      </div>

      {/* X Algorithm Features */}
      <div className="px-3 mt-6 mb-2">
        <div className="px-3 mb-3 text-[10px] font-bold text-stone-400/80 uppercase tracking-[0.12em]">
          Discovery
        </div>
        <div className="space-y-0.5">
          <SidebarButton
            icon={<Sparkles />}
            label="For You"
            onClick={() => onViewChange?.('for-you-feed')}
            isActive={currentView === 'for-you-feed'}
            activeColor="purple"
          />
          <SidebarButton
            icon={<BookOpen />}
            label="Recommendations"
            onClick={() => onViewChange?.('document-recommendations')}
            isActive={currentView === 'document-recommendations'}
            activeColor="indigo"
          />
          <SidebarButton
            icon={<Zap />}
            label="Agent Marketplace"
            onClick={() => onViewChange?.('agent-marketplace')}
            isActive={currentView === 'agent-marketplace'}
            activeColor="amber"
          />
          <SidebarButton
            icon={<Github />}
            label="GitHub Explorer"
            onClick={() => onViewChange?.('github-explorer')}
            isActive={currentView === 'github-explorer'}
            activeColor="emerald"
          />
          <SidebarButton
            icon={<GitPullRequest />}
            label="PR Suggestions"
            onClick={() => onViewChange?.('pr-suggestions')}
            isActive={currentView === 'pr-suggestions'}
            activeColor="emerald"
          />
          <SidebarButton
            icon={<Linkedin />}
            label="LinkedIn Posts"
            onClick={() => onViewChange?.('linkedin-posts')}
            isActive={currentView === 'linkedin-posts'}
            activeColor="blue"
          />
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-stone-200 to-transparent mx-4 my-4" />

      {/* Context Area: File Explorer */}
      <div className="flex-1 overflow-y-auto">
        {/* Context Header */}
        <div className="px-5 mb-3 flex items-center justify-between">
          <span className="text-[10px] font-bold text-stone-400/80 uppercase tracking-[0.12em]">
            File Explorer
          </span>
          <FolderOpen className="w-3.5 h-3.5 text-stone-300" />
        </div>

        {/* Recent Documents */}
        {recentDocs.length > 0 && (
          <div className="px-3 py-2">
            <button
              type="button"
              onClick={() => setIsDocsOpen(!isDocsOpen)}
              className="flex items-center justify-between w-full text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2 hover:text-stone-700 px-2"
            >
              <span>Recent Documents</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded font-medium normal-case">
                  {recentDocs.length}
                </span>
                {isDocsOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </div>
            </button>

            {isDocsOpen && (
              <div className="space-y-0.5">
                {recentDocs.map((doc) => {
                  const isSelected = selectedDocumentId === doc._id;
                  return (
                    <button
                      type="button"
                      key={doc._id}
                      onClick={() => onDocumentSelect?.(doc._id)}
                      className={`group w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${isSelected
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                        }`}
                      title={doc.title || 'Untitled'}
                    >
                      <FileText className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-blue-500' : 'text-stone-400 group-hover:text-stone-500'
                        }`} />
                      <span className="truncate text-left">
                        {doc.title || 'Untitled'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Trash button */}
      {trash && trash.length > 0 && (
        <div className="px-3 pb-2">
          <button
            type="button"
            className="w-full flex items-center gap-2 px-2.5 py-2 text-sm text-stone-500 hover:bg-stone-100 hover:text-stone-700 rounded-lg transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            <span>Trash</span>
            <span className="ml-auto text-xs bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded">
              {trash.length}
            </span>
          </button>
        </div>
      )}

      {/* User Profile - Bottom */}
      <div className="p-4 border-t border-stone-100 bg-white space-y-3">
        <div className="flex items-center gap-3">
          {(() => {
            const displayName = isAnonymous ? "Guest" : (user?.name ?? user?.email ?? "Guest");
            const initial = (displayName || "U").trim().charAt(0).toUpperCase();
            const rawImage = (user as any)?.image;
            const imgSrc = typeof rawImage === "string" ? rawImage : undefined;

            return imgSrc ? (
              <img
                src={imgSrc}
                alt={displayName + " avatar"}
                className="h-9 w-9 rounded-full object-cover border border-stone-100"
              />
            ) : (
              <div className="h-9 w-9 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 text-xs font-semibold border border-stone-200">
                {initial}
              </div>
            );
          })()}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-stone-900 truncate">
              {isAnonymous ? "Guest User" : (user?.name ?? "User")}
            </div>
            <div className="text-[11px] text-stone-500 font-medium">
              {isAnonymous ? "Limited preview" : "Pro Account"}
            </div>
          </div>
          {!isAnonymous && (
            <button
              type="button"
              onClick={() => onOpenSettings?.('profile')}
              className="p-1.5 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-100 transition-colors"
              title="Settings"
              aria-label="Open settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
        </div>

        {isAnonymous && (
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-stone-900 text-white hover:bg-stone-800 transition-all shadow-sm active:scale-[0.98]"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>
        )}
      </div>
    </div>
  );
}

export default CleanSidebar;
