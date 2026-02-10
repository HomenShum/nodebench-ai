/**
 * CleanSidebar - Modern Linear-style sidebar with collapse support
 *
 * Features:
 * - Collapsible to icon-only mode (56px)
 * - Monochrome active states
 * - Clean section headers
 * - Smooth transitions
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
  Shield,
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
    | 'linkedin-posts'
    | 'mcp-ledger';
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
    | 'linkedin-posts'
    | 'mcp-ledger') => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

// Dashboard items
const dashboardItems = [
  { icon: DollarSign, label: 'Cost Dashboard', view: 'cost-dashboard' as const },
  { icon: TrendingUp, label: 'Industry Updates', view: 'industry-updates' as const },
  { icon: Shield, label: 'MCP Ledger', view: 'mcp-ledger' as const },
];

// Discovery items
const discoveryItems = [
  { icon: Sparkles, label: 'For You', view: 'for-you-feed' as const },
  { icon: BookOpen, label: 'Recommendations', view: 'document-recommendations' as const },
  { icon: Zap, label: 'Agent Marketplace', view: 'agent-marketplace' as const },
  { icon: Github, label: 'GitHub Explorer', view: 'github-explorer' as const },
  { icon: GitPullRequest, label: 'PR Suggestions', view: 'pr-suggestions' as const },
  { icon: Linkedin, label: 'LinkedIn Posts', view: 'linkedin-posts' as const },
];

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
  isCollapsed = false,
  onToggleCollapse,
}: CleanSidebarProps) {
  const [isDocsOpen, setIsDocsOpen] = useState(true);
  const user = useQuery(api.domains.auth.auth.loggedInUser);
  const { signIn } = useAuthActions();
  const trash = useQuery(api.domains.documents.documents.getTrash);
  const documents = useQuery(api.domains.documents.documents.getSidebar);

  const isAnonymous = !user?.email;

  const handleGoogleSignIn = () => {
    void signIn("google", {
      redirectTo: typeof window !== "undefined" ? window.location.href : "/",
    });
  };

  const recentDocs = (documents ?? []).slice(0, 8);

  const recentDossiers: RecentDossier[] = useMemo(() => {
    return (documents ?? [])
      .filter((doc: any) => doc.type === 'dossier')
      .slice(0, 5)
      .map((doc: any) => ({
        id: doc._id,
        title: doc.title || 'Untitled Dossier',
        updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : undefined,
        isAgentUpdating: false,
      }));
  }, [documents]);

  const handleNavigate = (page: ActivePage) => {
    if (page === 'research') {
      onViewChange?.('research');
      onGoHome?.();
    } else if (page === 'workspace') {
      onViewChange?.('documents');
      onModeChange('workspace');
    } else if (page === 'saved') {
      onModeChange('dossier');
    }
  };

  const getActivePage = (): ActivePage => {
    if (currentView === 'research') return 'research';
    if (appMode === 'dossier') return 'saved';
    return 'workspace';
  };

  const handleDossierSelect = (dossierIdStr: string) => {
    const dossierId = dossierIdStr as Id<"documents">;
    onDocumentSelect?.(dossierId);
    onModeChange('dossier');
  };

  // Collapsed icon-only button helper
  const CollapsedButton = ({ icon: Icon, label, view }: { icon: any; label: string; view: string }) => (
    <button
      type="button"
      title={label}
      onClick={() => onViewChange?.(view as any)}
      className={`w-10 h-10 mx-auto rounded-md flex items-center justify-center transition-colors duration-150 ${
        currentView === view
          ? 'bg-black/[0.06] dark:bg-white/[0.08] text-gray-900 dark:text-gray-100'
          : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-600 dark:hover:text-gray-300'
      }`}
    >
      <Icon className="w-[18px] h-[18px]" />
    </button>
  );

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-[#18181B]">
      {/* Logo */}
      <div className={`h-14 flex items-center ${isCollapsed ? 'justify-center' : 'px-3'} border-b border-gray-200/60 dark:border-white/[0.06]`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center flex-shrink-0 hover:bg-gray-800 transition-colors"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <span className="text-white font-bold text-sm">N</span>
          </button>
          {!isCollapsed && (
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 tracking-tight truncate">
              Nodebench AI
            </span>
          )}
        </div>
      </div>

      {/* Global Navigation */}
      <div className={`${isCollapsed ? 'px-1' : 'px-3'} pt-4`}>
        <SidebarGlobalNav
          activePage={getActivePage()}
          onNavigate={handleNavigate}
          recentDossiers={recentDossiers}
          onDossierSelect={handleDossierSelect}
          isCollapsed={isCollapsed}
        />
      </div>

      {/* Dashboard Links */}
      <div className={`${isCollapsed ? 'px-1' : 'px-3'} mt-4 mb-2`}>
        {!isCollapsed && (
          <div className="px-2 mb-2 text-[11px] font-medium uppercase tracking-wider text-gray-400">
            Dashboards
          </div>
        )}
        <div className="space-y-0.5">
          {dashboardItems.map((item) =>
            isCollapsed ? (
              <CollapsedButton key={item.view} icon={item.icon} label={item.label} view={item.view} />
            ) : (
              <SidebarButton
                key={item.view}
                icon={<item.icon />}
                label={item.label}
                onClick={() => onViewChange?.(item.view)}
                isActive={currentView === item.view}
              />
            )
          )}
        </div>
      </div>

      {/* Discovery Links */}
      <div className={`${isCollapsed ? 'px-1' : 'px-3'} mt-4 mb-2`}>
        {!isCollapsed && (
          <div className="px-2 mb-2 text-[11px] font-medium uppercase tracking-wider text-gray-400">
            Discovery
          </div>
        )}
        <div className="space-y-0.5">
          {discoveryItems.map((item) =>
            isCollapsed ? (
              <CollapsedButton key={item.view} icon={item.icon} label={item.label} view={item.view} />
            ) : (
              <SidebarButton
                key={item.view}
                icon={<item.icon />}
                label={item.label}
                onClick={() => onViewChange?.(item.view)}
                isActive={currentView === item.view}
              />
            )
          )}
        </div>
      </div>

      {/* Divider */}
      {!isCollapsed && (
        <div className="h-px bg-gray-200/60 dark:bg-white/[0.06] mx-4 my-3" />
      )}

      {/* File Explorer — hidden when collapsed */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto">
          <div className="px-5 mb-2 flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
              File Explorer
            </span>
            <FolderOpen className="w-3.5 h-3.5 text-gray-300" />
          </div>

          {recentDocs.length > 0 && (
            <div className="px-3 py-2">
              <button
                type="button"
                onClick={() => setIsDocsOpen(!isDocsOpen)}
                className="flex items-center justify-between w-full text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 hover:text-gray-700 dark:hover:text-gray-300 px-2"
              >
                <span>Recent Documents</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-gray-100 dark:bg-white/[0.06] text-gray-500 px-1.5 py-0.5 rounded font-medium normal-case">
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
                        className={`group w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors duration-150 ${isSelected
                          ? 'bg-black/[0.06] dark:bg-white/[0.08] text-gray-900 dark:text-gray-100'
                          : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-white/[0.04] hover:text-gray-900 dark:hover:text-gray-100'
                          }`}
                        title={doc.title || 'Untitled'}
                      >
                        <FileText className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-400'
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
      )}

      {/* Spacer when collapsed */}
      {isCollapsed && <div className="flex-1" />}

      {/* Trash button — hidden when collapsed */}
      {!isCollapsed && trash && trash.length > 0 && (
        <div className="px-3 pb-2">
          <button
            type="button"
            className="w-full flex items-center gap-2 px-2.5 py-2 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-700 dark:hover:text-gray-300 rounded-lg transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            <span>Trash</span>
            <span className="ml-auto text-xs bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded">
              {trash.length}
            </span>
          </button>
        </div>
      )}

      {/* User Profile - Bottom */}
      <div className={`${isCollapsed ? 'p-2' : 'p-4'} border-t border-gray-200/60 dark:border-white/[0.06] space-y-3`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
          {(() => {
            const displayName = isAnonymous ? "Guest" : (user?.name ?? user?.email ?? "Guest");
            const initial = (displayName || "U").trim().charAt(0).toUpperCase();
            const rawImage = (user as any)?.image;
            const imgSrc = typeof rawImage === "string" ? rawImage : undefined;

            return imgSrc ? (
              <img
                src={imgSrc}
                alt={displayName + " avatar"}
                className="h-8 w-8 rounded-full object-cover border border-gray-200/60 dark:border-white/[0.06]"
                title={isCollapsed ? displayName : undefined}
              />
            ) : (
              <div
                className="h-8 w-8 rounded-full bg-gray-100 dark:bg-white/[0.08] flex items-center justify-center text-gray-500 dark:text-gray-400 text-xs font-semibold border border-gray-200 dark:border-white/[0.06]"
                title={isCollapsed ? displayName : undefined}
              >
                {initial}
              </div>
            );
          })()}
          {!isCollapsed && (
            <>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {isAnonymous ? "Guest User" : (user?.name ?? "User")}
                </div>
                <div className="text-[11px] text-gray-500 font-medium">
                  {isAnonymous ? "Limited preview" : "Pro Account"}
                </div>
              </div>
              {!isAnonymous && (
                <button
                  type="button"
                  onClick={() => onOpenSettings?.('profile')}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
                  title="Settings"
                  aria-label="Open settings"
                >
                  <Settings className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>

        {!isCollapsed && isAnonymous && (
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-all shadow-sm active:scale-[0.98]"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>
        )}
      </div>
    </div>
  );
}

export default CleanSidebar;
