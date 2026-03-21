import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { useConvexAuth, useQuery } from "convex/react";
import {
  Bot,
  ChevronLeft,
  ChevronRight,
  FileText,
  MessageSquare,
  Radar,
  User,
  Settings,
  Orbit,
  FolderKanban,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { CockpitSurfaceId } from "@/lib/registry/viewRegistry";
import { buildCockpitPath } from "@/lib/registry/viewRegistry";
import { cn } from "@/lib/utils";

interface SurfaceShortcut {
  id: CockpitSurfaceId;
  label: string;
  icon: LucideIcon;
  color: string;
}

const SURFACE_SHORTCUTS: SurfaceShortcut[] = [
  { id: "ask", label: "Ask", icon: MessageSquare, color: "currentColor" },
  { id: "memo", label: "Memo", icon: Orbit, color: "currentColor" },
  { id: "research", label: "Research", icon: Radar, color: "currentColor" },
  { id: "editor", label: "Workspace", icon: FileText, color: "currentColor" },
  { id: "telemetry", label: "System", icon: Bot, color: "currentColor" },
];

interface WorkspaceRailProps {
  activeSurface: CockpitSurfaceId;
  onSurfaceChange: (surface: CockpitSurfaceId) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenSettings?: () => void;
}

export const WorkspaceRail = memo(function WorkspaceRail({
  activeSurface,
  onSurfaceChange,
  isCollapsed,
  onToggleCollapse,
  onOpenSettings,
}: WorkspaceRailProps) {
  const navigate = useNavigate();
  const { isAuthenticated } = useConvexAuth();
  const recentSessions = useQuery(
    api.domains.operations.taskManager.queries.getUserTaskSessions,
    isAuthenticated ? { limit: 5 } : "skip",
  );
  const recentDocuments = useQuery(
    api.domains.documents.documents.getSidebar,
    isAuthenticated ? {} : "skip",
  );
  const watchlistDigest = useQuery(
    api.domains.monitoring.worldMonitor.getWatchlistDigest,
    {},
  );

  const sessionItems = Array.isArray(recentSessions?.sessions) ? recentSessions.sessions.slice(0, 4) : [];
  const documentItems = Array.isArray(recentDocuments) ? recentDocuments.slice(0, 4) : [];
  const watchlists = Array.isArray(watchlistDigest?.watchlists) ? watchlistDigest.watchlists.slice(0, 3) : [];

  return (
    <nav
      className={cn(
        "hidden lg:flex shrink-0 flex-col border-r border-white/[0.06] bg-white/[0.02] backdrop-blur-xl transition-[width] duration-200 ease-in-out",
        isCollapsed ? "w-12" : "w-[240px]",
      )}
      id="main-navigation"
      role="navigation"
      aria-label="Workspace rail"
      data-agent-id="cockpit:workspace-rail"
    >
      <div
        className={cn(
          "flex items-center gap-2 border-b border-white/[0.06] px-3 py-3",
          isCollapsed && "justify-center px-0",
        )}
      >
        <button
          type="button"
          onClick={() => onSurfaceChange("ask")}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.08] text-sm font-bold text-content transition-colors hover:bg-white/[0.12]"
          aria-label="Open workspace"
        >
          N
        </button>
        {!isCollapsed ? (
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-content">NodeBench</div>
            <div className="truncate text-[11px] uppercase tracking-[0.16em] text-content-muted">Agent control plane</div>
          </div>
        ) : null}
      </div>

      <div className={cn("flex flex-col gap-1 px-2 py-2", isCollapsed && "items-center px-0")}>
        {SURFACE_SHORTCUTS.map((shortcut) => {
          const Icon = shortcut.icon;
          const isActive = activeSurface === shortcut.id;
          return (
            <button
              key={shortcut.id}
              type="button"
              onClick={() => onSurfaceChange(shortcut.id)}
              aria-label={shortcut.label}
              aria-current={isActive ? "page" : undefined}
              data-agent-id={`cockpit:surface:${shortcut.id}`}
              data-agent-action="navigate"
              className={cn(
                "flex items-center gap-2.5 rounded-md text-[13px] font-medium transition-all duration-150",
                isCollapsed ? "mx-auto h-9 w-9 justify-center" : "px-2.5 py-1.5",
                isActive
                  ? "bg-white/[0.08] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
                  : "text-content-muted hover:bg-white/[0.04] hover:text-content",
              )}
              style={isActive ? { color: shortcut.color } : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!isCollapsed ? <span>{shortcut.label}</span> : null}
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {sessionItems.length > 0 && (
          <RailSection
            collapsed={isCollapsed}
            title="Recent runs"
            items={sessionItems.map((session) => ({
              id: session._id,
              label: session.title ?? session.type ?? "Untitled run",
              detail: session.status,
              icon: Bot,
              onClick: () => navigate(buildCockpitPath({ surfaceId: "trace", run: String(session._id) })),
            }))}
          />
        )}

        {documentItems.length > 0 && (
          <RailSection
            collapsed={isCollapsed}
            title="Documents"
            items={documentItems.map((document) => ({
              id: String(document._id),
              label: document.title ?? "Untitled document",
              detail: document.documentType ?? document.fileType ?? "document",
              icon: FileText,
              onClick: () => navigate(buildCockpitPath({ surfaceId: "editor", doc: String(document._id) })),
            }))}
          />
        )}

        {watchlists.length > 0 && (
          <RailSection
            collapsed={isCollapsed}
            title="Watchlists"
            items={watchlists.map((watchlist) => ({
              id: String(watchlist._id),
              label: watchlist.title ?? watchlist.watchlistKey ?? "Watchlist",
              detail: `${watchlist.alertEventCount ?? 0} alerts`,
              icon: FolderKanban,
              onClick: () => navigate(buildCockpitPath({ surfaceId: "research", tab: "overview" })),
            }))}
          />
        )}
      </div>

      <div
        className={cn(
          "flex items-center border-t border-white/[0.06] px-2 py-2",
          isCollapsed ? "flex-col gap-1" : "gap-2",
        )}
      >
        {isAuthenticated && (
          <>
            <button
              type="button"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.06] transition-colors hover:bg-white/[0.1]"
              aria-label="Operator profile"
            >
              <User className="h-4 w-4 text-content-muted" />
            </button>

            {!isCollapsed ? (
              <span className="flex-1 truncate text-[12px] text-content-secondary">Operator</span>
            ) : null}
          </>
        )}

        {!isCollapsed && onOpenSettings ? (
          <button
            type="button"
            onClick={onOpenSettings}
            data-testid="open-settings"
            className="flex h-7 w-7 items-center justify-center rounded-md text-content-muted transition-colors hover:bg-white/[0.06] hover:text-content"
            aria-label="Settings"
          >
            <Settings className="h-3.5 w-3.5" />
          </button>
        ) : null}

        <button
          type="button"
          onClick={onToggleCollapse}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-md text-content-muted transition-colors hover:bg-white/[0.06] hover:text-content",
            isCollapsed && "mx-auto",
          )}
          aria-label={isCollapsed ? "Expand workspace rail" : "Collapse workspace rail"}
        >
          {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>
      </div>
    </nav>
  );
});

function RailSection({
  collapsed,
  title,
  items,
}: {
  collapsed: boolean;
  title: string;
  items: Array<{ id: string; label: string; detail: string; icon: LucideIcon; onClick: () => void }>;
}) {
  return (
    <section className="px-2 pb-3">
      {!collapsed ? (
        <div className="px-1 pb-1 pt-3 text-[11px] font-medium uppercase tracking-wider text-content-muted">
          {title}
        </div>
      ) : null}
      <div className={cn("flex flex-col gap-0.5", collapsed && "items-center")}>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              className={cn(
                "flex items-center gap-2 rounded-md text-left text-[12px] text-content-secondary transition-colors hover:bg-white/[0.04] hover:text-content",
                collapsed ? "mx-auto h-9 w-9 justify-center" : "px-2.5 py-1.5",
              )}
              aria-label={collapsed ? item.label : undefined}
              title={item.label}
            >
              <Icon className="h-3.5 w-3.5 shrink-0 text-content-muted" />
              {!collapsed ? (
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{item.label}</span>
                  <span className="block truncate text-[11px] text-content-muted">{item.detail}</span>
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default WorkspaceRail;
