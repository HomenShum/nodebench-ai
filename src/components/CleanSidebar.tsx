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
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import {
  FileText,
  ChevronDown,
  ChevronRight,
  Settings,
  Trash2,
  FolderOpen,
} from "lucide-react";
import { SidebarGlobalNav, type ActivePage, type RecentDossier } from "./SidebarGlobalNav";

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
  selectedDocumentId?: Id<"documents"> | null;
  onDocumentSelect?: (docId: Id<"documents">) => void;
}

export function CleanSidebar({
  appMode,
  onModeChange,
  activeSources: _activeSources,
  onToggleSource: _onToggleSource,
  onOpenSettings,
  onGoHome,
  selectedDocumentId,
  onDocumentSelect,
}: CleanSidebarProps) {
  const [isDocsOpen, setIsDocsOpen] = useState(true);
  const user = useQuery(api.domains.auth.auth.loggedInUser);
  const trash = useQuery(api.domains.documents.documents.getTrash);
  const documents = useQuery(api.domains.documents.documents.getSidebar);

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
      // Go back to WelcomeLanding/Research view
      onGoHome?.();
    } else if (page === 'workspace') {
      onModeChange('workspace');
    } else if (page === 'saved') {
      onModeChange('dossier');
    }
  };

  // Map appMode to ActivePage for highlighting
  const getActivePage = (): ActivePage => {
    if (appMode === 'dossier') return 'saved';
    return 'workspace'; // workspace, fast-agent, deep-agent all show as workspace
  };

  // Handle dossier selection from expandable menu
  const handleDossierSelect = (dossierIdStr: string) => {
    const dossierId = dossierIdStr as Id<"documents">;
    onDocumentSelect?.(dossierId);
    onModeChange('dossier');
  };

  return (
    <div className="h-full flex flex-col bg-[#fbfaf2]">
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center shadow-lg shadow-black/10">
            <span className="text-white font-bold text-sm">N</span>
          </div>
          <span className="text-lg font-bold text-gray-900 tracking-tight">Nodebench AI</span>
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

      {/* Divider */}
      <div className="h-px bg-gray-200 mx-5 my-2" />

      {/* Context Area: File Explorer */}
      <div className="flex-1 overflow-y-auto">
        {/* Context Header */}
        <div className="px-5 mb-3 flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            File Explorer
          </span>
          <FolderOpen className="w-3.5 h-3.5 text-gray-400" />
        </div>

        {/* Recent Documents */}
        {recentDocs.length > 0 && (
          <div className="px-3 py-2">
            <button
              type="button"
              onClick={() => setIsDocsOpen(!isDocsOpen)}
              className="flex items-center justify-between w-full text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 hover:text-gray-700 px-2"
            >
              <span>Recent Documents</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium normal-case">
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
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      title={doc.title || 'Untitled'}
                    >
                      <FileText className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
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
            className="w-full flex items-center gap-2 px-2.5 py-2 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700 rounded-lg transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            <span>Trash</span>
            <span className="ml-auto text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
              {trash.length}
            </span>
          </button>
        </div>
      )}

      {/* User Profile - Bottom */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          {(() => {
            const displayName = user?.name ?? user?.email ?? "Guest";
            const initial = (displayName || "U").trim().charAt(0).toUpperCase();
            const rawImage = (user as any)?.image;
            const imgSrc = typeof rawImage === "string" ? rawImage : undefined;

            return imgSrc ? (
              <img
                src={imgSrc}
                alt={displayName + " avatar"}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold">
                {initial}
              </div>
            );
          })()}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">
              {user?.name ?? "User"}
            </div>
            <div className="text-xs text-gray-500">
              Pro Plan
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenSettings?.('profile')}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            title="Settings"
            aria-label="Open settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default CleanSidebar;
