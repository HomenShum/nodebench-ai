// src/components/FastAgentPanel/FastAgentPanel.ThreadList.tsx
// Thread list sidebar with time-based grouping and clean design

import React, { useState, useMemo } from 'react';
import { MessageSquare, Pin, Trash2, Search, X, Download, Wrench, MoreHorizontal, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Thread } from './types';

interface FastAgentThreadListProps {
  activeThreadId: string | null;
  onSelectThread: (threadId: string) => void;
  onDeleteThread: (threadId: string) => void;
  className?: string;
  // Optional props that might be passed but not strictly required for the core list
  threads?: Thread[]; // If passed from parent, otherwise we might need to fetch or use context
  // Note: In the current FastAgentPanel implementation, threads are fetched in the parent and passed down?
  // Let's check FastAgentPanel.tsx again. It passes: activeThreadId, onSelectThread, onDeleteThread, className.
  // It DOES NOT pass 'threads' in the usage I wrote!
  // Wait, FastAgentPanel.tsx has:
  // <FastAgentThreadList
  //   activeThreadId={activeThreadId}
  //   onSelectThread={setActiveThreadId}
  //   onDeleteThread={handleDeleteThread}
  //   className="h-full"
  // />
  // It seems I missed passing 'threads' in FastAgentPanel.tsx!
  // I need to fix FastAgentPanel.tsx to pass 'threads' OR fetch them here.
  // Fetching here would duplicate logic. Passing them is better.
  // I will update this component to accept 'threads' and then I will need to update FastAgentPanel.tsx to pass them.
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
 */
export function FastAgentThreadList({
  activeThreadId,
  onSelectThread,
  onDeleteThread,
  className,
  // We need threads to be passed in. If not, we can't render anything.
  // I will assume for now that I will fix the parent to pass them, or use a context if available.
  // But wait, I can't easily change the parent's data fetching without re-reading it.
  // Actually, I just wrote FastAgentPanel.tsx and I know I have 'displayThreads' there.
  // I just forgot to pass it to FastAgentThreadList in the JSX.
  // So I will add 'threads' to the props here, and then I MUST update FastAgentPanel.tsx.
  threads = [],
}: FastAgentThreadListProps & { threads?: Thread[] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingThreadId, setDeletingThreadId] = useState<string | null>(null);

  // Filter and group threads
  const groupedThreads = useMemo(() => {
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

    return groupThreadsByDate(filtered);
  }, [threads, searchQuery]);

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
      <div className="p-3 border-b border-[var(--border-color)]">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-8 py-1.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/20 focus:border-[var(--accent-primary)]/50 transition-all"
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
              <h3 className="px-2 mb-1 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                {group}
              </h3>
              <div className="space-y-0.5">
                {groupThreads.map(thread => (
                  <div
                    key={thread._id}
                    onClick={() => onSelectThread(thread._id)}
                    className={cn(
                      "group relative px-2.5 py-2 rounded-lg cursor-pointer transition-all duration-200 border border-transparent",
                      activeThreadId === thread._id
                        ? "bg-[var(--bg-primary)] border-[var(--border-color)] shadow-sm"
                        : "hover:bg-[var(--bg-hover)] hover:border-[var(--border-color)]/50"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className={cn(
                          "text-xs font-medium truncate mb-0.5",
                          activeThreadId === thread._id ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
                        )}>
                          {thread.title || "New Chat"}
                        </h4>
                        <p className="text-[10px] text-[var(--text-muted)] truncate opacity-80">
                          {thread.lastMessage || "No messages yet"}
                        </p>
                      </div>

                      {/* Hover Actions */}
                      <div className={cn(
                        "flex items-center gap-1 opacity-0 transition-opacity",
                        "group-hover:opacity-100",
                        activeThreadId === thread._id && "opacity-100" // Always show actions for active thread? Maybe too cluttered. Let's keep hover.
                      )}>
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
                ))}
              </div>
            </div>
          );
        })}

        {/* Empty State */}
        {Object.values(groupedThreads).every(g => g.length === 0) && (
          <div className="flex flex-col items-center justify-center h-32 text-[var(--text-muted)] text-xs">
            <MessageSquare className="w-6 h-6 mb-2 opacity-20" />
            <p>No conversations found</p>
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
