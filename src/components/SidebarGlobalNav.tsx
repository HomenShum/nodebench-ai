/**
 * SidebarGlobalNav - Unified Top Navigation Component
 *
 * Linear-style monochrome active states with subtle background highlights.
 */

import React, { useState } from 'react';
import { Home, LayoutGrid, Bookmark, ChevronRight, FileText, Loader2, Bot } from 'lucide-react';

export type ActivePage = 'research' | 'workspace' | 'saved';

export interface RecentDossier {
  id: string;
  title: string;
  updatedAt?: Date;
  isAgentUpdating?: boolean;
}

interface SidebarGlobalNavProps {
  activePage: ActivePage;
  onNavigate: (page: ActivePage) => void;
  recentDossiers?: RecentDossier[];
  onDossierSelect?: (id: string) => void;
  isCollapsed?: boolean;
}

const navItems = [
  {
    id: 'research' as const,
    label: 'Home',
    icon: Home,
    desc: 'Research & Live Dossiers',
    expandable: false
  },
  {
    id: 'workspace' as const,
    label: 'My Workspace',
    icon: LayoutGrid,
    desc: 'Files & Analysis',
    expandable: false
  },
  {
    id: 'saved' as const,
    label: 'Saved Dossiers',
    icon: Bookmark,
    desc: 'Library',
    expandable: true
  }
];

export const SidebarGlobalNav: React.FC<SidebarGlobalNavProps> = ({
  activePage,
  onNavigate,
  recentDossiers = [],
  onDossierSelect,
  isCollapsed = false,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-0.5 mb-6">
      {!isCollapsed && (
        <div className="px-2 mb-2 text-[11px] font-medium uppercase tracking-wider text-gray-400">
          Menu
        </div>
      )}
      {navItems.map((item) => {
        const isActive = activePage === item.id;
        const isExpanded = expandedId === item.id;
        const Icon = item.icon;

        if (isCollapsed) {
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                if (!item.expandable) onNavigate(item.id);
              }}
              title={item.label}
              className={`w-10 h-10 mx-auto rounded-md flex items-center justify-center transition-colors duration-150 ${
                isActive
                  ? 'bg-black/[0.06] dark:bg-white/[0.08] text-gray-900 dark:text-gray-100'
                  : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              <Icon className="w-[18px] h-[18px]" />
            </button>
          );
        }

        return (
          <div key={item.id}>
            <button
              type="button"
              onClick={() => {
                if (item.expandable) {
                  setExpandedId(isExpanded ? null : item.id);
                } else {
                  onNavigate(item.id);
                }
              }}
              className={`w-full flex items-center justify-between px-2.5 py-2 text-[13px] font-medium rounded-md transition-all duration-150 group ${
                isActive
                  ? 'bg-black/[0.06] dark:bg-white/[0.08] text-gray-900 dark:text-gray-100'
                  : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
                  isActive
                    ? 'bg-gray-200/80 dark:bg-white/[0.08] text-gray-900 dark:text-gray-100'
                    : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-semibold">{item.label}</span>
                  {isActive && (
                    <span className="text-[10px] text-gray-500 font-medium">{item.desc}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {item.expandable && recentDossiers.length > 0 && (
                  <span className="text-[10px] bg-gray-100 dark:bg-white/[0.06] text-gray-500 px-1.5 py-0.5 rounded-full font-semibold">
                    {recentDossiers.length}
                  </span>
                )}
                {item.expandable ? (
                  <ChevronRight className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                ) : null}
              </div>
            </button>

            {/* Expandable Dossier Submenu */}
            {item.expandable && isExpanded && (
              <div className="mt-1 ml-5 pl-3 border-l border-gray-200/60 dark:border-white/[0.06] space-y-0.5">
                {recentDossiers.length > 0 ? (
                  <>
                    {recentDossiers.slice(0, 5).map((dossier) => (
                      <button
                        key={dossier.id}
                        type="button"
                        onClick={() => onDossierSelect?.(dossier.id)}
                        className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-[12px] text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-white/[0.04] rounded-md transition-all duration-150 group"
                      >
                        <FileText className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 shrink-0 transition-colors" />
                        <span className="truncate flex-1 text-left font-medium">{dossier.title || 'Untitled'}</span>
                        {dossier.isAgentUpdating && (
                          <span className="flex items-center gap-1 text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full">
                            <Bot className="w-2.5 h-2.5" />
                            <Loader2 className="w-2 h-2 animate-spin" />
                          </span>
                        )}
                      </button>
                    ))}
                    {recentDossiers.length > 5 && (
                      <button
                        type="button"
                        onClick={() => onNavigate('saved')}
                        className="w-full px-2.5 py-1.5 text-[11px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-semibold text-left transition-colors"
                      >
                        View all {recentDossiers.length} dossiers →
                      </button>
                    )}
                  </>
                ) : (
                  <div className="px-2.5 py-3 text-[11px] text-gray-400 italic">
                    No saved dossiers yet
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default SidebarGlobalNav;
