/**
 * SidebarGlobalNav - Unified Top Navigation Component
 *
 * This is the "Source of Truth" for app-level navigation.
 * Used by both WelcomeLanding (Research view) and CleanSidebar (Workspace view).
 *
 * Features:
 * - Home (Research) - Always goes to WelcomeLanding/Research view
 * - My Workspace - Always goes to MainLayout/Workspace view
 * - Saved Dossiers - Expandable library with recent dossiers
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
  onDossierSelect
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-1 mb-6">
      <div className="px-3 mb-3 text-[10px] font-bold text-stone-400/80 uppercase tracking-[0.12em]">
        Menu
      </div>
      {navItems.map((item) => {
        const isActive = activePage === item.id;
        const isExpanded = expandedId === item.id;
        const Icon = item.icon;

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
              className={`w-full flex items-center justify-between px-3 py-2.5 text-[13px] font-medium rounded-xl transition-all duration-200 group ${
                isActive
                  ? 'bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-900 shadow-sm border border-emerald-100/50'
                  : 'text-stone-600 hover:bg-stone-50 hover:text-stone-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                  isActive 
                    ? 'bg-emerald-100 text-emerald-600' 
                    : 'bg-stone-100 text-stone-400 group-hover:bg-stone-200 group-hover:text-stone-600'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-semibold">{item.label}</span>
                  {isActive && (
                    <span className="text-[10px] text-emerald-600/70 font-medium">{item.desc}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {item.expandable && recentDossiers.length > 0 && (
                  <span className="text-[10px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded-full font-semibold">
                    {recentDossiers.length}
                  </span>
                )}
                {item.expandable ? (
                  <ChevronRight className={`w-3.5 h-3.5 text-stone-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                ) : isActive ? (
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                ) : null}
              </div>
            </button>

            {/* Expandable Dossier Submenu */}
            {item.expandable && isExpanded && (
              <div className="mt-2 ml-5 pl-3 border-l-2 border-stone-200/60 space-y-1">
                {recentDossiers.length > 0 ? (
                  <>
                    {recentDossiers.slice(0, 5).map((dossier) => (
                      <button
                        key={dossier.id}
                        type="button"
                        onClick={() => onDossierSelect?.(dossier.id)}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 text-[12px] text-stone-600 hover:text-stone-900 hover:bg-stone-50 rounded-lg transition-all duration-150 group"
                      >
                        <FileText className="w-3.5 h-3.5 text-stone-400 group-hover:text-emerald-500 shrink-0 transition-colors" />
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
                        className="w-full px-2.5 py-1.5 text-[11px] text-emerald-600 hover:text-emerald-700 font-semibold text-left transition-colors"
                      >
                        View all {recentDossiers.length} dossiers →
                      </button>
                    )}
                  </>
                ) : (
                  <div className="px-2.5 py-3 text-[11px] text-stone-400 italic">
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

