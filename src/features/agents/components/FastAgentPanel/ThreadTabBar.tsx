/**
 * ThreadTabBar.tsx
 *
 * Fast horizontal tab navigation for thread switching.
 * Shows thread tabs with swarm status indicators.
 * Supports keyboard shortcuts (Cmd/Ctrl+1-9).
 */

import React, { useEffect, useRef, useCallback, memo, useState } from "react";
import {
  Plus,
  MessageSquare,
  Loader2,
  CheckCircle,
  XCircle,
  Zap,
  ChevronDown,
  FileText,
  Video,
  Building,
  TrendingUp,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useThreadsWithSwarmInfo, SwarmStatus } from "@/hooks/useSwarm";
import type { Id } from "../../../../../convex/_generated/dataModel";

// ============================================================================
// Types
// ============================================================================

interface ThreadWithSwarm {
  _id: Id<"chatThreadsStream">;
  title: string;
  updatedAt: number;
  swarmId?: string;
  swarmInfo?: {
    swarmId: string;
    status: SwarmStatus;
    agentCount: number;
    completedCount: number;
    isActive: boolean;
  } | null;
}

interface ThreadTabBarProps {
  activeThreadId: Id<"chatThreadsStream"> | null;
  onSelectThread: (threadId: Id<"chatThreadsStream"> | null) => void;
  onNewThread: () => void;
  onSpawnSwarm?: (query: string, agents: string[]) => void;
  className?: string;
}

// Agent presets for quick spawn
const AGENT_PRESETS = [
  {
    id: "research",
    name: "Full Research",
    description: "Doc + Media + SEC",
    agents: ["DocumentAgent", "MediaAgent", "SECAgent"],
    icon: Search,
  },
  {
    id: "financial",
    name: "Financial Analysis",
    description: "SEC + Finance + Doc",
    agents: ["SECAgent", "OpenBBAgent", "DocumentAgent"],
    icon: TrendingUp,
  },
  {
    id: "media",
    name: "Media Focus",
    description: "Media + Doc",
    agents: ["MediaAgent", "DocumentAgent"],
    icon: Video,
  },
  {
    id: "entity",
    name: "Entity Deep Dive",
    description: "Entity + Doc + SEC",
    agents: ["EntityResearchAgent", "DocumentAgent", "SECAgent"],
    icon: Building,
  },
];

// ============================================================================
// Swarm Status Icon Component
// ============================================================================

const SwarmStatusIcon = memo(function SwarmStatusIcon({
  status,
  agentCount,
  completedCount,
}: {
  status: SwarmStatus;
  agentCount: number;
  completedCount: number;
}) {
  if (status === "completed") {
    return <CheckCircle className="w-3 h-3 text-green-500" />;
  }

  if (status === "failed" || status === "cancelled") {
    return <XCircle className="w-3 h-3 text-red-500" />;
  }

  // Active states
  if (["pending", "spawning", "executing", "gathering", "synthesizing"].includes(status)) {
    return (
      <div className="relative flex items-center">
        <Loader2 className="w-3 h-3 text-indigo-600 dark:text-indigo-400 motion-safe:animate-spin" />
        <span className="ml-0.5 text-xs text-indigo-600 dark:text-indigo-400 font-medium">
          {completedCount}/{agentCount}
        </span>
      </div>
    );
  }

  return null;
});

// ============================================================================
// Thread Tab Component
// ============================================================================

const ThreadTab = memo(function ThreadTab({
  thread,
  isActive,
  index,
  onSelect,
}: {
  thread: ThreadWithSwarm;
  isActive: boolean;
  index: number;
  onSelect: () => void;
}) {
  const hasSwarm = !!thread.swarmInfo;
  const isSwarmActive = thread.swarmInfo?.isActive;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0",
        "hover:bg-surface-secondary focus:outline-none focus:ring-2 focus:ring-indigo-500/40",
        isActive
          ? "bg-surface-secondary text-content shadow-sm border border-edge"
          : "text-content-secondary hover:text-content border border-transparent",
        isSwarmActive && "ring-1 ring-indigo-500/40 bg-indigo-500/10"
      )}
    >
      {/* Icon */}
      {hasSwarm ? (
        <div className={cn(
          "w-5 h-5 rounded-md flex items-center justify-center",
          isSwarmActive ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" : "bg-surface-secondary text-content-muted"
        )}>
          <Zap className="w-3 h-3" />
        </div>
      ) : (
        <div className="w-5 h-5 rounded-md bg-surface-secondary flex items-center justify-center">
          <MessageSquare className="w-3 h-3 text-content-muted" />
        </div>
      )}

      {/* Title */}
      <span className="truncate max-w-[100px] font-semibold">
        {thread.title || "Untitled"}
      </span>

      {/* Swarm status indicator */}
      {thread.swarmInfo && (
        <SwarmStatusIcon
          status={thread.swarmInfo.status}
          agentCount={thread.swarmInfo.agentCount}
          completedCount={thread.swarmInfo.completedCount}
        />
      )}

      {/* Keyboard shortcut hint */}
      {index < 9 && (
        <span className="hidden group-hover:inline text-xs text-content-muted ml-0.5 opacity-60">
          âŒ˜{index + 1}
        </span>
      )}
    </button>
  );
});

// ============================================================================
// Main Component
// ============================================================================

export function ThreadTabBar({
  activeThreadId,
  onSelectThread,
  onNewThread,
  onSpawnSwarm,
  className,
}: ThreadTabBarProps) {
  const { threads, isLoading } = useThreadsWithSwarmInfo(15);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showSwarmMenu, setShowSwarmMenu] = useState(false);
  const [swarmQuery, setSwarmQuery] = useState("");
  const swarmMenuRef = useRef<HTMLDivElement>(null);

  // Handle spawn with preset
  const handleSpawnPreset = useCallback(
    (preset: typeof AGENT_PRESETS[0]) => {
      if (!swarmQuery.trim()) return;
      onSpawnSwarm?.(swarmQuery.trim(), preset.agents);
      setSwarmQuery("");
      setShowSwarmMenu(false);
    },
    [swarmQuery, onSpawnSwarm]
  );

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (swarmMenuRef.current && !swarmMenuRef.current.contains(e.target as Node)) {
        setShowSwarmMenu(false);
      }
    };
    if (showSwarmMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showSwarmMenu]);

  // Keyboard shortcuts: Cmd/Ctrl + 1-9
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key >= "1" && e.key <= "9") {
        e.preventDefault();
        const index = parseInt(e.key) - 1;

        if (index === 0) {
          // Cmd+1 = New thread
          onNewThread();
        } else if (threads && threads[index - 1]) {
          // Cmd+2-9 = Select thread at index
          onSelectThread(threads[index - 1]._id);
        }
      }
    },
    [threads, onSelectThread, onNewThread]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Scroll active thread into view
  useEffect(() => {
    if (activeThreadId && scrollRef.current) {
      const activeElement = scrollRef.current.querySelector(
        `[data-thread-id="${activeThreadId}"]`
      );
      if (activeElement) {
        activeElement.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      }
    }
  }, [activeThreadId]);

  return (
    <div
      className={cn(
        "flex items-center gap-1 px-2 py-1.5 border-b border-edge bg-surface",
        className
      )}
    >
      {/* New Thread Button */}
      <button
        type="button"
        onClick={onNewThread}
        className={cn(
          "flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold transition-all duration-200 flex-shrink-0",
          "hover:bg-surface-hover text-content-secondary hover:text-content",
          "focus:outline-none focus:ring-2 focus:ring-indigo-500/40",
          !activeThreadId && "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20"
        )}
        title="New chat (âŒ˜1)"
      >
        <Plus className="w-4 h-4" />
        <span className="hidden sm:inline">New</span>
      </button>

      {/* New Swarm Button with Dropdown */}
      {onSpawnSwarm && (
        <div className="relative" ref={swarmMenuRef}>
          <button
            type="button"
            onClick={() => setShowSwarmMenu(!showSwarmMenu)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold transition-all duration-200 flex-shrink-0",
              "hover:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:text-indigo-300",
              "focus:outline-none focus:ring-2 focus:ring-indigo-500/40",
              showSwarmMenu && "bg-indigo-500/10 border border-indigo-500/20"
            )}
            title="Spawn parallel agents"
          >
            <Zap className="w-4 h-4" />
            <span className="hidden sm:inline">Swarm</span>
            <ChevronDown className={cn("w-3 h-3 transition-transform duration-200", showSwarmMenu && "rotate-180")} />
          </button>

          {/* Swarm Menu Dropdown */}
          {showSwarmMenu && (
            <div className="absolute top-full left-0 mt-1 w-72 bg-surface rounded-lg border border-edge shadow-xl z-50 overflow-hidden">
              {/* Query Input */}
              <div className="p-3 border-b border-edge">
                <label className="block text-xs font-medium text-content-muted mb-1.5">
                  Research Query
                </label>
                <input
                  type="text"
                  value={swarmQuery}
                  onChange={(e) => setSwarmQuery(e.target.value)}
                  placeholder="e.g., Tesla competitors analysis"
                  className="w-full px-3 py-2 text-sm bg-surface-secondary border border-edge rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50/50 text-content placeholder:text-content-muted"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && swarmQuery.trim()) {
                      handleSpawnPreset(AGENT_PRESETS[0]);
                    }
                    if (e.key === "Escape") {
                      setShowSwarmMenu(false);
                    }
                  }}
                />
              </div>

              {/* Preset Options */}
              <div className="p-2">
                <div className="text-xs font-medium text-content-muted px-2 mb-1.5">
                  Agent Presets
                </div>
                {AGENT_PRESETS.map((preset) => {
                  const Icon = preset.icon;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSpawnPreset(preset)}
                      disabled={!swarmQuery.trim()}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                        swarmQuery.trim()
                          ? "hover:bg-surface-secondary cursor-pointer"
                          : "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-content">
                          {preset.name}
                        </div>
                        <div className="text-xs text-content-muted">
                          {preset.description}
                        </div>
                      </div>
                      <div className="text-xs text-content-muted flex-shrink-0">
                        {preset.agents.length} agents
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Quick tip */}
              <div className="px-3 py-2 border-t border-edge bg-surface-secondary">
                <div className="text-xs text-content-muted">
                  ðŸ’¡ Or type <code className="px-1 py-0.5 bg-surface rounded">/spawn "query"</code> in chat
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Divider */}
      <div className="w-px h-4 bg-[var(--border-color)] flex-shrink-0" />

      {/* Scrollable Thread Tabs */}
      <div
        ref={scrollRef}
        className="flex items-center gap-1 overflow-x-auto scrollbar-hide flex-1 min-w-0"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {isLoading ? (
          <div className="flex items-center gap-2 px-2 py-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-6 rounded-md bg-surface-hover motion-safe:animate-pulse"
                style={{ width: `${60 + i * 16}px` }}
              />
            ))}
          </div>
        ) : threads.length === 0 ? (
          <div className="px-2 py-1 text-xs text-content-muted">
            No recent threads
          </div>
        ) : (
          threads.map((thread, index) => (
            <div key={thread._id} data-thread-id={thread._id}>
              <ThreadTab
                thread={thread as ThreadWithSwarm}
                isActive={thread._id === activeThreadId}
                index={index + 1} // +1 because 0 is "New Thread"
                onSelect={() => onSelectThread(thread._id)}
              />
            </div>
          ))
        )}
      </div>

      {/* Keyboard hint */}
      <div className="hidden lg:flex items-center gap-1 px-2 text-xs text-content-muted flex-shrink-0">
        <kbd className="px-1 py-0.5 bg-surface-secondary rounded text-[8px]">âŒ˜1-9</kbd>
        <span>switch</span>
      </div>
    </div>
  );
}

export default ThreadTabBar;

