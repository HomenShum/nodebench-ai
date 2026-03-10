/**
 * CleanSidebar - Modern Linear-style sidebar with collapse support
 *
 * Features:
 * - Collapsible to icon-only mode (56px)
 * - Monochrome active states
 * - Clean section headers
 * - Smooth transitions
 */

import { memo, useMemo, useState } from "react";
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
  FlaskConical,
  Terminal,
  HeartPulse,
  Orbit,
} from "lucide-react";
import { SidebarGlobalNav, type ActivePage, type RecentDossier } from "./SidebarGlobalNav";
import { SidebarButton } from "./ui";
import { Tooltip } from "../shared/ui/Tooltip";
import { sanitizeDocumentTitle } from "@/lib/displayText";

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
  | 'spreadsheets'
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
  | 'dogfood'
  | 'engine-demo'
  | 'observability'
  | 'oracle';
  onViewChange?: (view:
    | 'documents'
    | 'spreadsheets'
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
    | 'dogfood'
    | 'engine-demo'
    | 'observability'
    | 'oracle') => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

// Dashboard items
// NOTE for Codex: Workbench is NOT dev-only — it's a core product surface.
// Keep FlaskConical here alongside Activity Log + Usage & Costs.
const dashboardItems = [
  { icon: FlaskConical, label: 'Run benchmarks', view: 'benchmarks' as const, subtitle: 'Compare models on real tasks' },
  { icon: HeartPulse, label: 'System health', view: 'observability' as const, subtitle: 'Observability and self-healing' },
  { icon: Activity, label: 'Tool activity', view: 'mcp-ledger' as const, subtitle: 'Requests, audits, and traces' },
  { icon: TrendingUp, label: 'Market watch', view: 'industry-updates' as const, subtitle: 'Industry and company movement' },
  { icon: DollarSign, label: 'Spend', view: 'cost-dashboard' as const, subtitle: 'Usage and cost trends' },
  { icon: Terminal, label: 'Engine API', view: 'engine-demo' as const, subtitle: 'Headless engine demo' },
  { icon: Orbit, label: 'The Oracle', view: 'oracle' as const, subtitle: 'Career trajectory & quests' },
];

// Dev-only items — hidden in production builds
const devItems = [
  { icon: CheckSquare, label: 'Review evidence', view: 'dogfood' as const, subtitle: 'QA captures and verification' },
];

// Discovery items
const discoveryItems = [
  { icon: Sparkles, label: 'Suggested signals', view: 'for-you-feed' as const, subtitle: 'Personalized feed' },
  { icon: BookOpen, label: 'Recommended docs', view: 'document-recommendations' as const, subtitle: 'Suggested reading' },
  { icon: Zap, label: 'Ready workflows', view: 'agent-marketplace' as const, subtitle: 'Prebuilt agent flows' },
  { icon: Github, label: 'Repo tracking', view: 'github-explorer' as const, subtitle: 'Repositories and trends' },
  { icon: GitPullRequest, label: 'Review pull requests', view: 'pr-suggestions' as const, subtitle: 'Suggested code reviews' },
  { icon: Linkedin, label: 'Social archive', view: 'linkedin-posts' as const, subtitle: 'LinkedIn post history' },
];

const moreSectionViews = new Set<string>([
  ...dashboardItems.map((i) => i.view),
  ...devItems.map((i) => i.view),
  ...discoveryItems.map((i) => i.view),
]);

const researchViews = new Set<string>([
  'research',
  'oracle',
  'signals',
  'benchmarks',
  'funding',
  'footnotes',
  'showcase',
  'cost-dashboard',
  'industry-updates',
  'for-you-feed',
  'document-recommendations',
  'agent-marketplace',
  'github-explorer',
  'pr-suggestions',
  'linkedin-posts',
  'mcp-ledger',
  'dogfood',
  'engine-demo',
  'observability',
]);

const workspaceViews = new Set<string>([
  'documents',
  'spreadsheets',
  'calendar',
  'roadmap',
  'timeline',
  'public',
  'agents',
  'activity',
  'entity',
]);

export const CleanSidebar = memo(function CleanSidebar({
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
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isAllToolsOpen, setIsAllToolsOpen] = useState(false);
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

  const recentDocs = useMemo(() => {
    const byTitle = new Map<string, any>();
    for (const doc of documents ?? []) {
      const id = String(doc?._id ?? "");
      if (!id) continue;

      const title = sanitizeDocumentTitle(doc?.title);
      const key = title.toLowerCase();
      const existing = byTitle.get(key);
      if (!existing) {
        byTitle.set(key, doc);
        continue;
      }

      const existingUpdated = Number(existing?.updatedAt ?? 0);
      const candidateUpdated = Number(doc?.updatedAt ?? 0);
      if (candidateUpdated > existingUpdated) {
        byTitle.set(key, doc);
      }
    }
    return Array.from(byTitle.values()).slice(0, 8);
  }, [documents]);

  const recentDossiers: RecentDossier[] = useMemo(() => {
    return (documents ?? [])
      .filter((doc: any) => doc.type === 'dossier')
      .slice(0, 5)
      .map((doc: any) => ({
        id: doc._id,
        title: sanitizeDocumentTitle(doc.title, 'Untitled Report'),
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
    if (currentView === 'research' || researchViews.has(currentView)) return 'research';
    if (workspaceViews.has(currentView)) return 'workspace';
    if (appMode === 'dossier') return 'saved';
    return 'workspace';
  };

  const handleDossierSelect = (dossierIdStr: string) => {
    const dossierId = dossierIdStr as Id<"documents">;
    onDocumentSelect?.(dossierId);
    onModeChange('dossier');
  };

  const featuredMoreItems = useMemo(
    () => [
      dashboardItems.find((item) => item.view === 'benchmarks'),
      dashboardItems.find((item) => item.view === 'observability'),
      discoveryItems.find((item) => item.view === 'for-you-feed'),
      discoveryItems.find((item) => item.view === 'agent-marketplace'),
    ].filter(Boolean) as Array<(typeof dashboardItems)[number]>,
    [],
  );

  const secondaryMoreItems = useMemo(() => {
    const featuredViews = new Set(featuredMoreItems.map((item) => item.view));
    return [
      ...dashboardItems,
      ...(import.meta.env.DEV ? devItems : []),
      ...discoveryItems,
    ].filter((item) => !featuredViews.has(item.view));
  }, [featuredMoreItems]);

  // Collapsed icon-only button helper
  const CollapsedButton = ({ icon: Icon, label, view }: { icon: any; label: string; view: string }) => (
    <Tooltip content={label} side="right" wrapperClassName="block">
      <button
        type="button"
        aria-label={label}
        data-agent-id={`sidebar:nav:${view}`}
        data-agent-action="navigate"
        data-agent-label={label}
        data-agent-target={view}
        onClick={() => onViewChange?.(view as any)}
        className={`w-10 h-10 mx-auto rounded-md flex items-center justify-center transition-colors duration-150 border-l-2 ${currentView === view
            ? 'border-l-primary bg-[var(--accent-primary-bg)] text-content'
            : 'border-l-transparent text-content-muted hover:bg-surface-hover hover:text-content-secondary'
          }`}
      >
        <Icon className="w-4 h-4" />
      </button>
    </Tooltip>
  );

  return (
    <aside
      aria-label="Sidebar navigation"
      data-sidebar
      data-agent-id="chrome:sidebar"
      data-agent-label="Sidebar navigation"
      className="h-full flex flex-col bg-surface"
    >
      {/* Logo */}
      <div className={`h-14 flex items-center ${isCollapsed ? 'justify-center' : 'px-3'} border-b border-edge`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <Tooltip content={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} side="right">
            <button
              type="button"
              onClick={onToggleCollapse}
              className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 hover:brightness-110 hover:shadow-sm active:scale-[0.95] transition-all duration-200"
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              data-agent-id="sidebar:action:toggle-collapse"
              data-agent-action="toggle"
              data-agent-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <span className="font-bold text-sm">N</span>
            </button>
          </Tooltip>
          {!isCollapsed && (
            <span className="text-sm font-semibold text-content tracking-tight truncate">
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

      {/* Explore - Dashboards & Discovery collapsed by default */}
      <div className={`${isCollapsed ? 'px-1' : 'px-3'} mt-4 mb-2`}>
        {!isCollapsed ? (
          <>
            <button
              type="button"
              onClick={() => setIsMoreOpen(!isMoreOpen)}
              className="w-full flex items-center justify-between px-2 mb-2 text-[10px] font-semibold uppercase tracking-wider text-content-muted/80 hover:text-content-secondary transition-colors"
              data-agent-id="sidebar:section:more"
              data-agent-action="toggle"
              data-agent-label={isMoreOpen ? 'Collapse Explore section' : 'Expand Explore section'}
            >
              <span>Explore</span>
              <span className="inline-flex items-center gap-2">
                {!isMoreOpen && moreSectionViews.has(currentView) && (
                  <span
                    aria-hidden="true"
                    className="inline-flex rounded-full border border-primary/25 bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary"
                  >
                    Viewing
                  </span>
                )}
                {isMoreOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </span>
            </button>
            {isMoreOpen && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <div className="px-2 text-[10px] uppercase tracking-wide text-content-muted/70 font-semibold">
                    Featured
                  </div>
                  {featuredMoreItems.map((item) => (
                    <SidebarButton
                      key={item.view}
                      icon={<item.icon />}
                      label={item.label}
                      subtitle={item.subtitle}
                      onClick={() => onViewChange?.(item.view)}
                      isActive={currentView === item.view}
                      data-agent-id={`sidebar:nav:${item.view}`}
                      data-agent-action="navigate"
                      data-agent-label={item.label}
                      data-agent-target={item.view}
                    />
                  ))}
                </div>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setIsAllToolsOpen((open) => !open)}
                    className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-[11px] font-medium text-content-secondary hover:bg-surface-hover hover:text-content"
                    data-agent-id="sidebar:section:all-tools"
                    data-agent-action="toggle"
                    data-agent-label={isAllToolsOpen ? 'Collapse all tools' : 'Expand all tools'}
                  >
                    <span>Browse more tools</span>
                    {isAllToolsOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  </button>
                  {isAllToolsOpen && (
                    <div className="space-y-1.5">
                      {secondaryMoreItems.map((item) => (
                        <SidebarButton
                          key={item.view}
                          icon={<item.icon />}
                          label={item.label}
                          subtitle={item.subtitle}
                          onClick={() => onViewChange?.(item.view)}
                          isActive={currentView === item.view}
                          data-agent-id={`sidebar:nav:${item.view}`}
                          data-agent-action="navigate"
                          data-agent-label={item.label}
                          data-agent-target={item.view}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          /* Collapsed: keep the icon rail intentionally short */
          <div className="space-y-0.5">
            {featuredMoreItems.map((item) => (
              <CollapsedButton key={item.view} icon={item.icon} label={item.label} view={item.view} />
            ))}
            {(import.meta.env.DEV ? devItems : []).map((item) => (
              <CollapsedButton key={item.view} icon={item.icon} label={item.label} view={item.view} />
            ))}
          </div>
        )}
      </div>

      {/* Divider */}
      {!isCollapsed && (
        <div className="h-px bg-edge opacity-60 mx-4 my-3" />
      )}

      {/* File Explorer — hidden when collapsed */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto">
          <div className="px-5 mb-2 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-content-muted/80">
              Files
            </span>
            <FolderOpen className="w-3.5 h-3.5 text-content-muted/60" />
          </div>

          {recentDocs.length > 0 && (
            <div className="px-3 py-2">
              <button
                type="button"
                onClick={() => setIsDocsOpen(!isDocsOpen)}
                className="flex items-center justify-between w-full text-[10px] font-semibold text-content-muted/80 uppercase tracking-wider mb-2 hover:text-content px-2"
                data-agent-id="sidebar:section:docs"
                data-agent-action="toggle"
                data-agent-label={isDocsOpen ? 'Collapse documents' : 'Expand documents'}
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
                        title={sanitizeDocumentTitle(doc.title)}
                        data-agent-id={`sidebar:doc:${doc._id}`}
                        data-agent-action="navigate"
                        data-agent-label={sanitizeDocumentTitle(doc.title)}
                        data-agent-target="document"
                      >
                        <FileText className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-content-secondary' : 'text-content-muted group-hover:text-content-secondary dark:group-hover:text-content-muted'
                          }`} />
                        <span className="truncate text-left">
                          {sanitizeDocumentTitle(doc.title)}
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
                  {isAnonymous ? "Preview mode" : "Pro Account"}
                </div>
              </div>
              {!isAnonymous && (
                <Tooltip content="Settings" side="top">
                  <button
                    type="button"
                    onClick={() => onOpenSettings?.('profile')}
                    className="p-1.5 text-content-muted hover:text-content-secondary rounded-md hover:bg-surface-hover transition-colors"
                    aria-label="Open settings"
                    data-agent-id="sidebar:action:settings"
                    data-agent-action="navigate"
                    data-agent-label="Open settings"
                    data-agent-target="settings"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </Tooltip>
              )}
            </>
          )}
        </div>

        {!isCollapsed && isAnonymous && (
          <div className="space-y-2">
            <div className="rounded-lg border border-edge bg-surface-secondary px-3 py-2 text-[11px] leading-relaxed text-content-secondary">
              Preview includes the Oracle, research, and benchmark proof. Sign in to save work, connect apps, and run personalized flows.
            </div>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-edge bg-transparent text-content hover:bg-surface-hover transition-all active:scale-[0.98]"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>
          </div>
        )}
      </div>
    </aside>
  );
});

export default CleanSidebar;
