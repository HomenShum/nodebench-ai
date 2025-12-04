/**
 * SidebarGlobalNav - Unified Top Navigation Component
 * 
 * This is the "Source of Truth" for app-level navigation.
 * Used by both WelcomeLanding (Research view) and CleanSidebar (Workspace view).
 * 
 * Ensures consistent navigation mental model:
 * - Home (Research) - Always goes to WelcomeLanding/Research view
 * - My Workspace - Always goes to MainLayout/Workspace view  
 * - Saved Dossiers - Library of saved research
 */

import React from 'react';
import { Home, LayoutGrid, Bookmark } from 'lucide-react';

export type ActivePage = 'research' | 'workspace' | 'saved';

interface SidebarGlobalNavProps {
  activePage: ActivePage;
  onNavigate: (page: ActivePage) => void;
}

const navItems = [
  { 
    id: 'research' as const, 
    label: 'Home', 
    icon: Home, 
    desc: 'Research & Live Dossiers' 
  },
  { 
    id: 'workspace' as const, 
    label: 'My Workspace', 
    icon: LayoutGrid, 
    desc: 'Files & Analysis' 
  },
  { 
    id: 'saved' as const, 
    label: 'Saved Dossiers', 
    icon: Bookmark, 
    desc: 'Library' 
  }
];

export const SidebarGlobalNav: React.FC<SidebarGlobalNavProps> = ({ activePage, onNavigate }) => {
  return (
    <div className="space-y-1 mb-6">
      <div className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
        Menu
      </div>
      {navItems.map((item) => {
        const isActive = activePage === item.id;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group ${
              isActive 
                ? 'bg-gray-100 text-gray-900' 
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
              <div className="flex flex-col items-start">
                <span>{item.label}</span>
                {isActive && (
                  <span className="text-[10px] text-gray-400 font-normal">{item.desc}</span>
                )}
              </div>
            </div>
            {isActive && <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
          </button>
        );
      })}
    </div>
  );
};

export default SidebarGlobalNav;

