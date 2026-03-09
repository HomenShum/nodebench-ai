/**
 * SidebarGlobalNav - Unified Top Navigation Component
 *
 * Linear-style monochrome active states with subtle background highlights.
 */

import React, { useState } from 'react';
import { Home, LayoutGrid, Bookmark, ChevronRight, FileText, Loader2, Bot } from 'lucide-react';
import { Tooltip } from '../shared/ui/Tooltip';
import { sanitizeDocumentTitle } from '@/lib/displayText';

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
    label: 'Research',
    icon: Home,
    desc: 'Signals, briefs, and reports',
    expandable: false
  },
  {
    id: 'workspace' as const,
    label: 'Workspace',
    icon: LayoutGrid,
    desc: 'Documents, tasks, and analysis',
    expandable: false
  },
  {
    id: 'saved' as const,
    label: 'Saved Reports',
    icon: Bookmark,
    desc: 'Saved reports and dossiers',
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
    <nav aria-label="Main navigation" className="space-y-0.5 mb-6">
      {!isCollapsed && (
        <div className="px-2 mb-2 text-xs font-medium uppercase tracking-wider text-content-muted">
          Menu
        </div>
      )}
      {navItems.map((item) => {
        const isActive = activePage === item.id;
        const isExpanded = expandedId === item.id;
        const Icon = item.icon;

        if (isCollapsed) {
          return (
            <Tooltip key={item.id} content={item.label} side="right" wrapperClassName="block">
              <button
                type="button"
                onClick={() => {
                  if (!item.expandable) onNavigate(item.id);
                }}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                className={`w-10 h-10 mx-auto rounded-md flex items-center justify-center transition-all duration-200 border-l-2 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${isActive
                    ? 'border-l-[rgb(79,70,229)] bg-indigo-500/12 text-content shadow-[inset_0_0_0_1px_rgba(99,102,241,0.18)]'
                    : 'border-l-transparent text-content-muted hover:bg-surface-hover hover:text-content-secondary'
                  }`}
              >
                <Icon className="w-4 h-4" />
              </button>
            </Tooltip>
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
              aria-current={isActive ? 'page' : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium transition-all duration-200 active:scale-[0.98] border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${isActive
                  ? 'bg-indigo-500/8 border-indigo-500/20 text-content shadow-[inset_0_0_0_1px_rgba(99,102,241,0.12)]'
                  : 'text-content-secondary hover:bg-surface-hover hover:text-content'
                }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
                  isActive
                    ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                    : 'text-content-muted group-hover:text-content-secondary dark:group-hover:text-gray-300'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-semibold">{item.label}</span>
                  {isActive && (
                    <span className="text-xs text-content-secondary font-medium">{item.desc}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {item.expandable && recentDossiers.length > 0 && (
                  <span className="text-xs bg-surface-secondary text-content-secondary px-1.5 py-0.5 rounded-full font-semibold">
                    {recentDossiers.length}
                  </span>
                )}
                {item.expandable ? (
                  <ChevronRight className={`w-3.5 h-3.5 text-content-muted transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                ) : null}
              </div>
            </button>

            {/* Expandable Dossier Submenu */}
            {item.expandable && isExpanded && (
              <div className="mt-1 ml-5 pl-3 border-l border-edge space-y-0.5">
                {recentDossiers.length > 0 ? (
                  <>
                    {recentDossiers.slice(0, 5).map((dossier) => (
                      <button
                        key={dossier.id}
                        type="button"
                        onClick={() => onDossierSelect?.(dossier.id)}
                        className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-[12px] text-content-secondary hover:text-content hover:bg-surface-hover rounded-md transition-all duration-200 group active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <FileText className="w-3.5 h-3.5 text-content-muted group-hover:text-content-secondary dark:group-hover:text-gray-300 shrink-0 transition-colors" />
                        <span className="truncate flex-1 text-left font-medium">{sanitizeDocumentTitle(dossier.title)}</span>
                        {dossier.isAgentUpdating && (
                          <span className="flex items-center gap-1 text-xs bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-full">
                            <Bot className="w-2.5 h-2.5" />
                            <Loader2 className="w-2 h-2 motion-safe:animate-spin" />
                          </span>
                        )}
                      </button>
                    ))}
                    {recentDossiers.length > 5 && (
                      <button
                        type="button"
                        onClick={() => onNavigate('saved')}
                        className="w-full px-2.5 py-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:opacity-85 font-semibold text-left transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                      >
                        View all {recentDossiers.length} reports {"->"}
                      </button>
                    )}
                  </>
                ) : (
                  <div className="px-2.5 py-3 text-xs text-content-muted italic">
                    No saved reports yet
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
};

export default SidebarGlobalNav;
