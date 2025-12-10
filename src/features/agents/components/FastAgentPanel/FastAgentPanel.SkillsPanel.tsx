// src/features/agents/components/FastAgentPanel/FastAgentPanel.SkillsPanel.tsx
// Skills discovery and browsing panel for FastAgentPanel - compact modern popover

import React, { useState, useCallback } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { Search, Loader2, Sparkles, Zap } from 'lucide-react';

interface SkillsPanelProps {
  onClose: () => void;
  onSelectSkill: (skillName: string, description: string) => void;
}

interface SkillSummary {
  name: string;
  description: string;
  category: string;
  categoryName: string;
  usageCount: number;
  keywords: string[];
}

// Minimal category dot colors
const categoryDots: Record<string, string> = {
  research: 'bg-blue-500',
  document: 'bg-emerald-500',
  media: 'bg-violet-500',
  financial: 'bg-amber-500',
  workflow: 'bg-cyan-500',
};

export function SkillsPanel({ onClose, onSelectSkill }: SkillsPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  
  const userSkills = useQuery(api.domains.teachability.index.listUserTeachings, {
    type: "skill",
    limit: 4,
  });

  const skills = useQuery(api.tools.meta.skillDiscoveryQueries.listAllSkills, {
    limit: 20,
  });
  
  const filteredSkills = skills?.filter((skill: SkillSummary) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return skill.name.toLowerCase().includes(q) || skill.description.toLowerCase().includes(q);
  });
  
  const handleSkillClick = useCallback((name: string, desc: string) => {
    onSelectSkill(name, desc);
    onClose();
  }, [onSelectSkill, onClose]);
  
  return (
    <div 
      className="absolute top-full right-0 mt-1.5 w-72 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Search - compact */}
      <div className="p-2.5 border-b border-gray-100">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search skills..."
            autoFocus
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border-0 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>
      
      {/* Skills list - compact */}
      <div className="max-h-64 overflow-y-auto">
        {/* User custom skills */}
        {userSkills && userSkills.length > 0 && (
          <div className="px-2.5 pt-2 pb-1">
            <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Your Skills
            </div>
            {userSkills.slice(0, 3).map((skill: any) => (
              <button
                key={skill._id}
                onClick={() => handleSkillClick(skill.key || 'custom', skill.content)}
                className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-blue-50 transition-colors mb-1 group"
              >
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <span className="text-xs font-medium text-gray-800 group-hover:text-blue-600 truncate">
                    {skill.key || skill.category || 'Custom skill'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Built-in skills */}
        <div className="px-2.5 py-2">
          {userSkills && userSkills.length > 0 && (
            <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Zap className="h-3 w-3" />
              Built-in
            </div>
          )}
          
          {!skills ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
            </div>
          ) : filteredSkills?.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-xs text-gray-400">No skills found</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {filteredSkills?.slice(0, 8).map((skill: SkillSummary) => (
                <button
                  key={skill.name}
                  onClick={() => handleSkillClick(skill.name, skill.description)}
                  className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-start gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${categoryDots[skill.category] || 'bg-gray-400'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-gray-800 group-hover:text-blue-600 transition-colors truncate">
                        {skill.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </div>
                      <div className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">
                        {skill.description}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Hint footer - minimal */}
      <div className="px-3 py-2 bg-gray-50 border-t border-gray-100">
        <p className="text-[10px] text-gray-400 text-center">
          Tip: Say "when I say X, do Y" to teach new skills
        </p>
      </div>
    </div>
  );
}

export default SkillsPanel;
