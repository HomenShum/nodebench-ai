/**
 * CleanSidebar - Simplified Dashboard Sidebar
 * 
 * Implements the "ruthless simplification" approach:
 * - Workspace navigation (My Workspace, Recent Research, Saved Dossiers)
 * - Recent Documents for quick navigation
 * - User profile with Settings at bottom
 * 
 * Removed: Integration panel (12 icons), Docs/Messages/Reports tabs,
 * Source category buttons, Live Sources (moved to Welcome Landing)
 */

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import {
  Home,
  Briefcase,
  Clock,
  FileText,
  ChevronDown,
  ChevronRight,
  Settings,
  Trash2,
} from "lucide-react";

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

  return (
    <div className="h-full flex flex-col bg-[#FBFBFB]">
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center shadow-lg shadow-black/10">
            <span className="text-white font-bold text-sm">N</span>
          </div>
          <span className="text-lg font-bold text-gray-900 tracking-tight">Nodebench AI</span>
        </div>
      </div>

      {/* Home Button - Returns to Welcome Landing */}
      {onGoHome && (
        <div className="px-3 pt-4">
          <button
            onClick={onGoHome}
            className="group w-full flex items-center gap-3 py-2.5 px-3 rounded-lg cursor-pointer transition-colors hover:bg-gray-50 border border-gray-200 hover:border-gray-300"
          >
            <Home className="w-4 h-4 shrink-0 text-gray-500 group-hover:text-gray-700" />
            <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900">
              Home
            </span>
          </button>
        </div>
      )}

      {/* Workspace Navigation */}
      <div className="pt-5 pb-4 px-3 space-y-1">
        <div className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Workspace
        </div>

        <button
          onClick={() => onModeChange('workspace')}
          className={`group relative w-full flex items-center gap-3 py-2 px-2.5 rounded-lg cursor-pointer transition-colors ${
            appMode === 'workspace' ? 'bg-gray-100' : 'hover:bg-gray-50'
          }`}
        >
          <Briefcase className={`w-4 h-4 shrink-0 transition-opacity ${
            appMode === 'workspace' ? 'opacity-100' : 'opacity-80 group-hover:opacity-100'
          }`} />
          <span className={`text-sm font-medium truncate transition-colors ${
            appMode === 'workspace' ? 'text-gray-900' : 'text-gray-600 group-hover:text-gray-900'
          }`}>
            My Workspace
          </span>
        </button>

        <button
          onClick={() => onModeChange('fast-agent')}
          className={`group relative w-full flex items-center gap-3 py-2 px-2.5 rounded-lg cursor-pointer transition-colors ${
            appMode === 'fast-agent' ? 'bg-gray-100' : 'hover:bg-gray-50'
          }`}
        >
          <Clock className={`w-4 h-4 shrink-0 transition-opacity ${
            appMode === 'fast-agent' ? 'opacity-100' : 'opacity-80 group-hover:opacity-100'
          }`} />
          <span className={`text-sm font-medium truncate transition-colors ${
            appMode === 'fast-agent' ? 'text-gray-900' : 'text-gray-600 group-hover:text-gray-900'
          }`}>
            Recent Research
          </span>
        </button>

        <button
          onClick={() => onModeChange('dossier')}
          className={`group relative w-full flex items-center gap-3 py-2 px-2.5 rounded-lg cursor-pointer transition-colors ${
            appMode === 'dossier' ? 'bg-gray-100' : 'hover:bg-gray-50'
          }`}
        >
          <FileText className={`w-4 h-4 shrink-0 transition-opacity ${
            appMode === 'dossier' ? 'opacity-100' : 'opacity-80 group-hover:opacity-100'
          }`} />
          <span className={`text-sm font-medium truncate transition-colors ${
            appMode === 'dossier' ? 'text-gray-900' : 'text-gray-600 group-hover:text-gray-900'
          }`}>
            Saved Dossiers
          </span>
        </button>
      </div>

      {/* Recent Documents */}
      {recentDocs.length > 0 && (
        <div className="px-3 py-2">
          <button
            onClick={() => setIsDocsOpen(!isDocsOpen)}
            className="flex items-center justify-between w-full text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 hover:text-gray-600"
          >
            <span>Recent Documents</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-400 font-normal normal-case">
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
                    key={doc._id}
                    onClick={() => onDocumentSelect?.(doc._id)}
                    className={`group w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                      isSelected
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                    title={doc.title || 'Untitled'}
                  >
                    <FileText className={`w-3.5 h-3.5 shrink-0 ${
                      isSelected ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
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

      {/* Flex spacer to push trash and profile to bottom */}
      <div className="flex-1" />

      {/* Trash button */}
      {trash && trash.length > 0 && (
        <div className="px-3 pb-2">
          <button
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
            onClick={() => onOpenSettings?.('profile')}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default CleanSidebar;
