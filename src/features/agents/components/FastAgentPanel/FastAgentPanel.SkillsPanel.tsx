// src/features/agents/components/FastAgentPanel/FastAgentPanel.SkillsPanel.tsx
// Skills discovery and browsing panel for FastAgentPanel

import React, { useState, useCallback } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { 
  X, 
  Search, 
  BookOpen, 
  Briefcase, 
  FileText, 
  Video, 
  DollarSign, 
  Workflow,
  ChevronRight,
  Loader2,
  Sparkles,
  Clock
} from 'lucide-react';

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

// Category icons mapping
const categoryIcons: Record<string, React.ReactNode> = {
  research: <Briefcase className="h-4 w-4" />,
  document: <FileText className="h-4 w-4" />,
  media: <Video className="h-4 w-4" />,
  financial: <DollarSign className="h-4 w-4" />,
  workflow: <Workflow className="h-4 w-4" />,
};

// Category colors
const categoryColors: Record<string, string> = {
  research: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  document: 'bg-green-500/20 text-green-400 border-green-500/30',
  media: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  financial: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  workflow: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
};

/**
 * SkillsPanel - Browse and search available skills
 */
export function SkillsPanel({ onClose, onSelectSkill }: SkillsPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Fetch all skills
  const skills = useQuery(api.tools.meta.skillDiscoveryQueries.listAllSkills, {
    category: selectedCategory ?? undefined,
    limit: 50,
  });
  
  // Filter skills by search query
  const filteredSkills = skills?.filter((skill: SkillSummary) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      skill.name.toLowerCase().includes(query) ||
      skill.description.toLowerCase().includes(query) ||
      skill.keywords.some((k: string) => k.toLowerCase().includes(query))
    );
  });
  
  // Get unique categories from skills
  const categories = skills ? Array.from(new Set(skills.map((s: SkillSummary) => s.category))) : [];
  
  const handleSkillClick = useCallback((skill: SkillSummary) => {
    onSelectSkill(skill.name, skill.description);
    onClose();
  }, [onSelectSkill, onClose]);
  
  return (
    <div className="skills-overlay" onClick={onClose}>
      <div 
        className="skills-panel bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 rounded-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-700/50">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-indigo-400" />
            <h3 className="text-lg font-semibold text-white">Skills Library</h3>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-lg hover:bg-zinc-700/50 transition-colors"
          >
            <X className="h-4 w-4 text-zinc-400" />
          </button>
        </div>
        
        {/* Search */}
        <div className="p-4 border-b border-zinc-700/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search skills..."
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50"
            />
          </div>
          
          {/* Category filters */}
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                selectedCategory === null
                  ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
                  : 'bg-zinc-800/50 text-zinc-400 border-zinc-700/50 hover:bg-zinc-700/50'
              }`}
            >
              All
            </button>
            {categories.map((cat: string) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors flex items-center gap-1.5 ${
                  selectedCategory === cat
                    ? categoryColors[cat] || 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
                    : 'bg-zinc-800/50 text-zinc-400 border-zinc-700/50 hover:bg-zinc-700/50'
                }`}
              >
                {categoryIcons[cat]}
                {cat}
              </button>
            ))}
          </div>
        </div>
        
        {/* Skills list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[400px]">
          {!skills ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 text-indigo-400 animate-spin" />
            </div>
          ) : filteredSkills?.length === 0 ? (
            <div className="text-center py-8">
              <Sparkles className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
              <p className="text-sm text-zinc-500">No skills found</p>
              <p className="text-xs text-zinc-600 mt-1">Try a different search term</p>
            </div>
          ) : (
            filteredSkills?.map((skill: SkillSummary) => (
              <button
                key={skill.name}
                onClick={() => handleSkillClick(skill)}
                className="w-full text-left p-4 bg-zinc-800/30 hover:bg-zinc-800/50 border border-zinc-700/30 hover:border-zinc-600/50 rounded-xl transition-all group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${categoryColors[skill.category] || 'bg-zinc-500/20 text-zinc-400'}`}>
                        {categoryIcons[skill.category]}
                        {skill.categoryName}
                      </span>
                      {skill.usageCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
                          <Clock className="h-3 w-3" />
                          {skill.usageCount}x
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-medium text-white group-hover:text-indigo-300 transition-colors">
                      {skill.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </h4>
                    <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                      {skill.description}
                    </p>
                    {skill.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {skill.keywords.slice(0, 4).map((keyword: string) => (
                          <span 
                            key={keyword}
                            className="px-1.5 py-0.5 text-[10px] bg-zinc-700/50 text-zinc-400 rounded"
                          >
                            {keyword}
                          </span>
                        ))}
                        {skill.keywords.length > 4 && (
                          <span className="text-[10px] text-zinc-500">
                            +{skill.keywords.length - 4} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-indigo-400 transition-colors flex-shrink-0 mt-1" />
                </div>
              </button>
            ))
          )}
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-zinc-700/50 bg-zinc-800/30">
          <p className="text-xs text-zinc-500 text-center">
            Skills are pre-defined workflows. Select one to use it in your conversation.
          </p>
        </div>
      </div>
    </div>
  );
}

// CSS styles (add to FastAgentPanel.animations.css)
const styles = `
.skills-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.skills-panel {
  width: 100%;
  max-width: 480px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}
`;

export default SkillsPanel;

