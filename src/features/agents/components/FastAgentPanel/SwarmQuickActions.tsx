/**
 * SwarmQuickActions.tsx
 *
 * Quick action cards shown in empty state to help users discover
 * and quickly launch parallel agent swarms.
 */

import React, { useState, memo } from "react";
import {
  Zap,
  Search,
  TrendingUp,
  Video,
  Building,
  FileText,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types & Constants
// ============================================================================

interface SwarmPreset {
  id: string;
  name: string;
  description: string;
  placeholder: string;
  agents: string[];
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

const SWARM_PRESETS: SwarmPreset[] = [
  {
    id: "research",
    name: "Deep Research",
    description: "Search documents, media, and SEC filings in parallel",
    placeholder: "e.g., Tesla competitors and market position",
    agents: ["DocumentAgent", "MediaAgent", "SECAgent"],
    icon: Search,
    color: "text-blue-600",
    bgColor: "bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/20",
  },
  {
    id: "financial",
    name: "Financial Analysis",
    description: "Analyze SEC filings, market data, and documents",
    placeholder: "e.g., AAPL Q4 earnings analysis",
    agents: ["SECAgent", "OpenBBAgent", "DocumentAgent"],
    icon: TrendingUp,
    color: "text-emerald-600",
    bgColor: "bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20",
  },
  {
    id: "media",
    name: "Media Intelligence",
    description: "Search videos, news, and related documents",
    placeholder: "e.g., Latest AI announcements from Google",
    agents: ["MediaAgent", "DocumentAgent"],
    icon: Video,
    color: "text-purple-600",
    bgColor: "bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/20",
  },
  {
    id: "entity",
    name: "Entity Deep Dive",
    description: "Profile companies, people, and relationships",
    placeholder: "e.g., Who are the key executives at Anthropic?",
    agents: ["EntityResearchAgent", "DocumentAgent", "SECAgent"],
    icon: Building,
    color: "text-amber-600",
    bgColor: "bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20",
  },
];

// ============================================================================
// Quick Action Card Component
// ============================================================================

interface QuickActionCardProps {
  preset: SwarmPreset;
  onSpawn: (query: string, agents: string[]) => void;
}

const QuickActionCard = memo(function QuickActionCard({
  preset,
  onSpawn,
}: QuickActionCardProps) {
  const [query, setQuery] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const Icon = preset.icon;

  const handleSubmit = () => {
    if (!query.trim()) return;
    onSpawn(query.trim(), preset.agents);
    setQuery("");
    setIsExpanded(false);
  };

  return (
    <div
      className={cn(
        "group relative rounded-xl border transition-all duration-150 cursor-pointer overflow-hidden will-change-transform",
        preset.bgColor,
        isExpanded ? "ring-2 ring-offset-1 ring-blue-500/40" : "hover:translate-y-[-2px] hover:shadow-md"
      )}
      onClick={() => !isExpanded && setIsExpanded(true)}
    >
      {/* Card Header */}
      <div className="p-3.5">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-150 group-hover:scale-[1.03] will-change-transform",
              preset.bgColor.replace("hover:", "")
            )}
          >
            <Icon className={cn("w-5 h-5", preset.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[13px] font-bold text-[var(--text-primary)] flex items-center gap-2">
              {preset.name}
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--bg-secondary)] text-[var(--text-muted)] border border-[var(--border-color)]">
                {preset.agents.length} agents
              </span>
            </h3>
            <p className="text-[11px] text-[var(--text-secondary)] mt-1 line-clamp-2 leading-relaxed">
              {preset.description}
            </p>
          </div>
          {!isExpanded && (
            <ArrowRight
              className={cn(
                "w-4 h-4 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-200 flex-shrink-0",
                preset.color
              )}
            />
          )}
        </div>
      </div>

      {/* Expanded Input Area */}
      {isExpanded && (
        <div className="px-3.5 pb-3.5 pt-1">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={preset.placeholder}
              className="w-full px-3.5 py-2.5 pr-11 text-[13px] bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-300 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-all duration-200"
              autoFocus
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter" && query.trim()) {
                  handleSubmit();
                }
                if (e.key === "Escape") {
                  setIsExpanded(false);
                }
              }}
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSubmit();
              }}
              disabled={!query.trim()}
              className={cn(
                "absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all duration-200",
                query.trim()
                  ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 shadow-sm"
                  : "bg-[var(--bg-secondary)] text-[var(--text-muted)] cursor-not-allowed"
              )}
            >
              <Zap className="w-3.5 h-3.5" />
            </button>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(false);
            }}
            className="mt-2 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
});

// ============================================================================
// Main Component
// ============================================================================

interface SwarmQuickActionsProps {
  onSpawn: (query: string, agents: string[]) => void;
  className?: string;
}

export function SwarmQuickActions({
  onSpawn,
  className,
}: SwarmQuickActionsProps) {
  return (
    <div className={cn("px-4 pb-4", className)}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
          <Sparkles className="w-4.5 h-4.5 text-white" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-[var(--text-primary)]">
            Parallel Research
          </h2>
          <p className="text-[11px] text-[var(--text-muted)]">
            Run multiple AI agents simultaneously
          </p>
        </div>
      </div>

      {/* Quick Action Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {SWARM_PRESETS.map((preset) => (
          <QuickActionCard key={preset.id} preset={preset} onSpawn={onSpawn} />
        ))}
      </div>

      {/* Tip */}
      <p className="mt-4 text-[11px] text-[var(--text-muted)] text-center">
        <span className="font-semibold text-[var(--text-secondary)]">Pro tip:</span>{" "}
        Type{" "}
        <code className="px-1.5 py-0.5 bg-[var(--bg-secondary)] rounded-md text-[10px] font-mono border border-[var(--border-color)]">
          /spawn
        </code>{" "}
        in the chat to customize which agents to use
      </p>
    </div>
  );
}

export default SwarmQuickActions;
