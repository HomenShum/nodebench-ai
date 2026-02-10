// src/components/FastAgentPanel/FastAgentPanel.ThreadList.tsx
// Thread list sidebar with time-based grouping, pagination, and clean design

import React, { useState, useMemo, useCallback } from 'react';
import { MessageSquare, Pin, Trash2, Search, X, Download, Wrench, MoreHorizontal, Clock, ChevronDown, Loader2, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Thread } from './types';

// Default page size for pagination
const PAGE_SIZE = 10;

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

interface FastAgentThreadListProps {
  activeThreadId: string | null;
  onSelectThread: (threadId: string) => void;
  onDeleteThread: (threadId: string) => void;
  onPinThread?: (threadId: string) => void;
  className?: string;
  /** Threads to display */
  threads?: Thread[];
  /** Whether more threads are available to load */
  hasMore?: boolean;
  /** Callback to load more threads */
  onLoadMore?: () => void;
  /** Whether we're currently loading more */
  isLoadingMore?: boolean;
  /** Initial page size (defaults to 10) */
  pageSize?: number;
}

// Helper to group threads by date
function groupThreadsByDate(threads: Thread[]) {
  const groups: { [key: string]: Thread[] } = {
    'Pinned': [],
    'Today': [],
    'Yesterday': [],
    'Previous 7 Days': [],
    'Older': []
  };

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);

  threads.forEach(thread => {
    if (thread.pinned) {
      groups['Pinned'].push(thread);
      return;
    }

    const date = new Date(thread.updatedAt || thread._creationTime);

    if (date >= today) {
      groups['Today'].push(thread);
    } else if (date >= yesterday) {
      groups['Yesterday'].push(thread);
    } else if (date >= lastWeek) {
      groups['Previous 7 Days'].push(thread);
    } else {
      groups['Older'].push(thread);
    }
  });

  return groups;
}

/**
 * FastAgentThreadList - Sidebar showing conversation threads grouped by time
 * Now with pagination support for large thread lists
 */
export function FastAgentThreadList({
  activeThreadId,
  onSelectThread,
  onDeleteThread,
  onPinThread,
  className,
  threads = [],
  hasMore = false,
  onLoadMore,
  isLoadingMore = false,
  pageSize = PAGE_SIZE,
}: FastAgentThreadListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingThreadId, setDeletingThreadId] = useState<string | null>(null);
  // Local pagination state for client-side slicing when server pagination not available
  const [displayCount, setDisplayCount] = useState(pageSize);

  // Keyboard navigation
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const flatThreads = useMemo(() => {
    let filtered = threads;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(t => t.title.toLowerCase().includes(q) || t.lastMessage?.toLowerCase().includes(q));
    }
    return filtered.sort((a, b) => (b.updatedAt || b._creationTime) - (a.updatedAt || a._creationTime)).slice(0, displayCount);
  }, [threads, searchQuery, displayCount]);

  const handleKeyNav = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(prev => Math.min(prev + 1, flatThreads.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && focusedIndex >= 0 && focusedIndex < flatThreads.length) {
      e.preventDefault();
      onSelectThread(flatThreads[focusedIndex]._id);
    }
  }, [focusedIndex, flatThreads, onSelectThread]);

  // Handle load more - either call parent handler or expand local display
  const handleLoadMore = useCallback(() => {
    if (onLoadMore) {
      onLoadMore();
    } else {
      // Client-side pagination fallback
      setDisplayCount(prev => prev + pageSize);
    }
  }, [onLoadMore, pageSize]);

  // Calculate if there are more items to show locally
  const hasMoreLocal = !onLoadMore && threads.length > displayCount;

  // Filter, paginate, and group threads
  const { groupedThreads, totalFiltered } = useMemo(() => {
    let filtered = threads;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(thread =>
        thread.title.toLowerCase().includes(query) ||
        thread.lastMessage?.toLowerCase().includes(query)
      );
    }

    // Sort by date desc before grouping
    filtered.sort((a, b) => (b.updatedAt || b._creationTime) - (a.updatedAt || a._creationTime));

    const totalFiltered = filtered.length;

    // Apply client-side pagination if no server pagination
    if (!onLoadMore) {
      filtered = filtered.slice(0, displayCount);
    }

    return { groupedThreads: groupThreadsByDate(filtered), totalFiltered };
  }, [threads, searchQuery, displayCount, onLoadMore]);

  const handleDelete = (threadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingThreadId(threadId);
  };

  const confirmDelete = () => {
    if (deletingThreadId) {
      onDeleteThread(deletingThreadId);
      setDeletingThreadId(null);
    }
  };

  return (
    <div className={cn("flex flex-col h-full bg-[var(--bg-secondary)]", className)}>
      {/* Search Bar */}
      <div className="p-3 border-b border-[var(--border-color)]/50">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setFocusedIndex(-1); }}
            onKeyDown={handleKeyNav}
            className="w-full pl-8 pr-8 py-1.5 bg-[var(--bg-primary)] border border-[var(--border-color)]/60 rounded-lg text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/20 focus:border-[var(--accent-primary)]/50 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Thread List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-4 scrollbar-thin scrollbar-thumb-[var(--border-color)]">
        {Object.entries(groupedThreads).map(([group, groupThreads]) => {
          if (groupThreads.length === 0) return null;

          return (
            <div key={group}>
              <h3 className="px-2 mb-1 text-[10px] font-semibold font-mono text-[var(--text-muted)] uppercase tracking-wider">
                {group}
              </h3>
              <div className="space-y-0.5">
                {groupThreads.map(thread => (
                  <div
                    key={thread._id}
                    onClick={() => onSelectThread(thread._id)}
                    className={cn(
                      "group relative px-2.5 py-2 rounded-lg cursor-pointer transition-all duration-150 message-enter thread-item",
                      activeThreadId === thread._id
                        ? "bg-[var(--bg-primary)] shadow-sm ring-1 ring-[var(--border-color)]"
                        : "hover:bg-[var(--bg-hover)]"
                    )}
                  >
                    {/* Active indicator bar */}
                    {activeThreadId === thread._id && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-[var(--accent-primary)]" />
                    )}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <MessageCircle className={cn(
                            "w-3 h-3 flex-shrink-0",
                            activeThreadId === thread._id ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"
                          )} />
                          <h4 className={cn(
                            "text-xs font-medium truncate tracking-[-0.01em]",
                            activeThreadId === thread._id ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
                          )}>
                            {thread.title || "New Chat"}
                          </h4>
                        </div>
                        <p className="text-[10px] text-[var(--text-muted)] truncate pl-[18px]">
                          {thread.lastMessage || "No messages yet"}
                        </p>
                      </div>

                      {/* Timestamp + Hover Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className="text-[9px] text-[var(--text-muted)] tabular-nums thread-time">
                          {formatRelativeTime(thread.updatedAt || thread._creationTime)}
                        </span>
                        <div className="flex items-center gap-1 thread-actions">
                          {onPinThread && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onPinThread(thread._id); }}
                              className={cn(
                                "p-1 rounded transition-colors",
                                thread.pinned
                                  ? "text-amber-500 hover:text-amber-600"
                                  : "text-[var(--text-muted)] hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                              )}
                              title={thread.pinned ? "Unpin" : "Pin to top"}
                            >
                              <Pin className={cn("w-3 h-3", thread.pinned && "fill-current")} />
                            </button>
                          )}
                          <button
                            onClick={(e) => handleDelete(thread._id, e)}
                            className="p-1 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Empty State */}
        {Object.values(groupedThreads).every(g => g.length === 0) && (
          <div className="flex flex-col items-center justify-center h-40 text-[var(--text-muted)] text-xs px-4">
            <div className="w-12 h-12 bg-[var(--bg-primary)] rounded-xl flex items-center justify-center mb-3 border border-[var(--border-color)]">
              <MessageSquare className="w-5 h-5 opacity-40" />
            </div>
            <p className="font-medium text-[var(--text-secondary)] mb-1">No conversations yet</p>
            <p className="text-[10px] text-center opacity-70">Start a new chat to begin</p>
          </div>
        )}

        {/* Load More Button */}
        {(hasMore || hasMoreLocal) && (
          <div className="px-2 py-3">
            <button
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className={cn(
                "w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-lg transition-colors",
                "bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-secondary)]",
                "hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]",
                isLoadingMore && "opacity-50 cursor-not-allowed"
              )}
            >
              {isLoadingMore ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Loading threads…
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  Load more
                  {hasMoreLocal && (
                    <span className="text-[var(--text-muted)]">
                      ({totalFiltered - displayCount} remaining)
                    </span>
                  )}
                </>
              )}
            </button>
          </div>
        )}

        {/* Thread count */}
        {threads.length > 0 && (
          <div className="px-2 py-2 text-center border-t border-[var(--border-color)]/50">
            <p className="text-[10px] text-[var(--text-muted)]">
              {onLoadMore
                ? `Showing ${threads.length} threads`
                : `Showing ${Math.min(displayCount, totalFiltered)} of ${totalFiltered} threads`}
            </p>
          </div>
        )}
      </div>

      {/* Delete Modal */}
      {deletingThreadId && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] shadow-xl rounded-xl p-4 w-full max-w-[240px]">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Delete chat?</h3>
            <p className="text-xs text-[var(--text-secondary)] mb-3">This cannot be undone.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeletingThreadId(null)}
                className="flex-1 px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
