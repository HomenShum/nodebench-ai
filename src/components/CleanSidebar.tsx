/**
 * CleanSidebar - Modern Linear-style sidebar with collapse support
 *
 * Features:
 * - Collapsible to icon-only mode (56px)
 * - Monochrome active states
 * - Clean section headers
 * - Smooth transitions
 */

import { useEffect, useMemo, useState } from "react";
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
  Activity,
  CheckSquare,
} from "lucide-react";
import { SidebarGlobalNav, type ActivePage, type RecentDossier } from "./SidebarGlobalNav";
import { SidebarButton } from "./ui";
import { Tooltip } from "../shared/ui/Tooltip";

type AppMode = 'workspace' | 'fast-agent' | 'deep-agent' | 'dossier';

interface CleanSidebarProps {
  appMode: AppMode;
  onModeChange: (mode: AppMode) => void;
  activeSources: string[];
  onToggleSource: (sourceId: string) => void;
  onOpenSettings?: (
    tab?: 'profile' | 'account' | 'usage' | 'integrations'
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
    | 'mcp-ledger'
    | 'dogfood';
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
    | 'mcp-ledger'
    | 'dogfood') => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

// Dashboard items
const dashboardItems = [
  { icon: DollarSign, label: 'Usage & Costs', view: 'cost-dashboard' as const, subtitle: 'Spending trends' },
  { icon: TrendingUp, label: 'Industry News', view: 'industry-updates' as const, subtitle: 'Latest updates' },
  { icon: Activity, label: 'Activity Log', view: 'mcp-ledger' as const, subtitle: 'Request history' },
];

// Dev-only items — hidden in production builds
const devItems = [
  { icon: CheckSquare, label: 'Quality Review', view: 'dogfood' as const, subtitle: 'Design review evidence' },
];

// Discovery items
const discoveryItems = [
  { icon: Sparkles, label: 'For You', view: 'for-you-feed' as const, subtitle: 'Personalized feed' },
  { icon: BookOpen, label: 'Recommendations', view: 'document-recommendations' as const, subtitle: 'Suggested reads' },
  { icon: Zap, label: 'Agent Templates', view: 'agent-marketplace' as const, subtitle: 'Ready-made workflows' },
  { icon: Github, label: 'GitHub Explorer', view: 'github-explorer' as const, subtitle: 'Repos & trends' },
  { icon: GitPullRequest, label: 'PR Suggestions', view: 'pr-suggestions' as const, subtitle: 'Code reviews' },
  { icon: Linkedin, label: 'LinkedIn Posts', view: 'linkedin-posts' as const, subtitle: 'Post archive' },
];

const moreSectionViews = new Set<string>([
  ...dashboardItems.map((i) => i.view),
  ...devItems.map((i) => i.view),
  ...discoveryItems.map((i) => i.view),
]);

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
  const [isMoreOpen, setIsMoreOpen] = useState(() => moreSectionViews.has(currentView));
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

  useEffect(() => {
    // If the user navigates to a destination inside "More", ensure the section is expanded
    // so the active state is visible and navigation stays self-evident.
    if (moreSectionViews.has(currentView)) {
      setIsMoreOpen(true);
    }
  }, [currentView]);

  const recentDossiers: RecentDossier[] = useMemo(() => {
    return (documents ?? [])
      .filter((doc: any) => doc.type === 'dossier')
      .slice(0, 5)
      .map((doc: any) => ({
        id: doc._id,
        title: doc.title || 'Untitled Report',
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
    <Tooltip content={label} side="right" wrapperClassName="block">
      <button
        type="button"
        aria-label={label}
        onClick={() => onViewChange?.(view as any)}
        className={`w-10 h-10 mx-auto rounded-md flex items-center justify-center transition-colors duration-150 border-l-2 ${
          currentView === view
            ? 'border-l-[var(--accent-primary,#5E6AD2)] bg-black/[0.06] dark:bg-white/[0.08] text-content'
            : 'border-l-transparent text-content-muted hover:bg-surface-hover hover:text-content-secondary'
        }`}
      >
        <Icon className="w-4 h-4" />
      </button>
    </Tooltip>
  );

  return (
    <aside aria-label="Sidebar navigation" className="h-full flex flex-col bg-surface dark:bg-[#18181B]">
      {/* Logo */}
      <div className={`h-14 flex items-center ${isCollapsed ? 'justify-center' : 'px-3'} border-b border-edge`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <Tooltip content={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} side="right">
            <button
              type="button"
              onClick={onToggleCollapse}
              className="w-8 h-8 bg-gray-900 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0 hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors"
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <span className="text-white font-bold text-sm">N</span>
            </button>
          </Tooltip>
          {!isCollapsed && (
            <span className="text-sm font-semibold text-content dark:text-gray-100 tracking-tight truncate">
              NodeBench AI
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

      {/* More — Dashboards & Discovery collapsed by default */}
      <div className={`${isCollapsed ? 'px-1' : 'px-3'} mt-4 mb-2`}>
        {!isCollapsed ? (
          <>
            <button
              type="button"
              onClick={() => setIsMoreOpen(!isMoreOpen)}
              className="w-full flex items-center justify-between px-2 mb-2 text-xs font-medium uppercase tracking-wider text-content-muted hover:text-content-secondary dark:hover:text-gray-300 transition-colors"
            >
              <span>More</span>
              {isMoreOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>
            {isMoreOpen && (
              <div className="space-y-3">
                <div className="space-y-0.5">
                  {dashboardItems.map((item) => (
                    <SidebarButton
                      key={item.view}
                      icon={<item.icon />}
                      label={item.label}
                      subtitle={item.subtitle}
                      onClick={() => onViewChange?.(item.view)}
                      isActive={currentView === item.view}
                    />
                  ))}
                  {import.meta.env.DEV && devItems.map((item) => (
                    <SidebarButton
                      key={item.view}
                      icon={<item.icon />}
                      label={item.label}
                      subtitle={item.subtitle}
                      onClick={() => onViewChange?.(item.view)}
                      isActive={currentView === item.view}
                    />
                  ))}
                </div>
                <div className="space-y-0.5">
                  {discoveryItems.map((item) => (
                    <SidebarButton
                      key={item.view}
                      icon={<item.icon />}
                      label={item.label}
                      subtitle={item.subtitle}
                      onClick={() => onViewChange?.(item.view)}
                      isActive={currentView === item.view}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          /* Collapsed: show just icons for dashboards + discovery */
          <div className="space-y-0.5">
            {[...dashboardItems, ...(import.meta.env.DEV ? devItems : [])].map((item) => (
              <CollapsedButton key={item.view} icon={item.icon} label={item.label} view={item.view} />
            ))}
            <div className="h-px bg-gray-200/60 dark:bg-white/[0.06] mx-2 my-2" />
            {discoveryItems.map((item) => (
              <CollapsedButton key={item.view} icon={item.icon} label={item.label} view={item.view} />
            ))}
          </div>
        )}
      </div>

      {/* Divider */}
      {!isCollapsed && (
        <div className="h-px bg-gray-200/60 dark:bg-white/[0.06] mx-4 my-3" />
      )}

      {/* File Explorer — hidden when collapsed */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto">
          <div className="px-5 mb-2 flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-content-muted">
              Files
            </span>
            <FolderOpen className="w-3.5 h-3.5 text-gray-300" />
          </div>

          {recentDocs.length > 0 && (
            <div className="px-3 py-2">
              <button
                type="button"
                onClick={() => setIsDocsOpen(!isDocsOpen)}
                className="flex items-center justify-between w-full text-xs font-medium text-content-secondary uppercase tracking-wider mb-2 hover:text-content px-2"
              >
                <span>Recent Documents</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-surface-secondary text-content-secondary px-1.5 py-0.5 rounded font-medium normal-case">
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
                          ? 'bg-black/[0.06] dark:bg-white/[0.08] text-content'
                          : 'text-content-secondary hover:bg-surface-hover hover:text-content'
                          }`}
                        title={doc.title || 'Untitled'}
                      >
                        <FileText className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-content-secondary' : 'text-content-muted group-hover:text-content-secondary dark:group-hover:text-content-muted'
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
            className="w-full flex items-center gap-2 px-2.5 py-2 text-sm text-content-secondary hover:bg-surface-hover hover:text-content rounded-lg transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            <span>Trash</span>
            <span className="ml-auto text-xs bg-surface-secondary text-content-secondary px-1.5 py-0.5 rounded">
              {trash.length}
            </span>
          </button>
        </div>
      )}

      {/* User Profile - Bottom */}
      <div className={`${isCollapsed ? 'p-2' : 'p-4'} border-t border-edge space-y-3`}>
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
                width={32}
                height={32}
                className="h-8 w-8 rounded-full object-cover border border-edge"
                title={isCollapsed ? displayName : undefined}
              />
            ) : (
              <div
                className="h-8 w-8 rounded-full bg-surface-secondary dark:bg-white/[0.08] flex items-center justify-center text-content-secondary text-xs font-semibold border border-edge"
                title={isCollapsed ? displayName : undefined}
              >
                {initial}
              </div>
            );
          })()}
          {!isCollapsed && (
            <>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-content truncate">
                  {isAnonymous ? "Guest User" : (user?.name ?? "User")}
                </div>
                <div className="text-xs text-content-muted font-medium">
                  {isAnonymous ? "Limited preview" : "Pro Account"}
                </div>
              </div>
              {!isAnonymous && (
                <Tooltip content="Settings" side="top">
                  <button
                    type="button"
                    onClick={() => onOpenSettings?.('profile')}
                    className="p-1.5 text-content-muted hover:text-content-secondary rounded-md hover:bg-surface-hover transition-colors"
                    aria-label="Open settings"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </Tooltip>
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
    </aside>
  );
}

export default CleanSidebar;
