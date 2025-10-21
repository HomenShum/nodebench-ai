// src/components/FastAgentPanel/FastAgentPanel.ThreadList.tsx
// Thread list sidebar with search, pin, and delete functionality

import React, { useState, useMemo } from 'react';
import { MessageSquare, Pin, Trash2, Search, X, Download, Wrench, Cpu, PanelLeftClose, PanelLeft } from 'lucide-react';
import type { Thread } from './types';

interface ThreadListProps {
  threads: Thread[];
  activeThreadId: string | null; // Agent component uses string threadIds
  onSelectThread: (threadId: string) => void;
  onPinThread: (threadId: string) => void;
  onDeleteThread: (threadId: string) => void;
  onExportThread?: (threadId: string) => void;
  isCollapsed?: boolean;
}

/**
 * ThreadList - Sidebar showing all conversation threads
 */
export function ThreadList({
  threads,
  activeThreadId,
  onSelectThread,
  onPinThread,
  onDeleteThread,
  onExportThread,
  isCollapsed = false,
}: ThreadListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingThreadId, setDeletingThreadId] = useState<string | null>(null);
  
  // Filter and sort threads
  const filteredThreads = useMemo(() => {
    let filtered = threads;
    
    // Debug: Log received threads
    if (threads.length > 0) {
      console.log('[ThreadList] Received threads:', threads.length);
      console.log('[ThreadList] First thread:', {
        title: threads[0].title,
        messageCount: threads[0].messageCount,
        toolsUsed: threads[0].toolsUsed,
        modelsUsed: threads[0].modelsUsed,
      });
    }
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(thread => 
        thread.title.toLowerCase().includes(query) ||
        thread.lastMessage?.toLowerCase().includes(query)
      );
    }
    
    // Sort: pinned first, then by updatedAt
    return filtered.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.updatedAt - a.updatedAt;
    });
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
  
  const cancelDelete = () => {
    setDeletingThreadId(null);
  };
  
  if (isCollapsed) {
    return null;
  }

  return (
    <div className={`thread-list ${isCollapsed ? 'collapsed' : ''}`}>
      {!isCollapsed && (
        <>
          {/* Search bar */}
          <div className="thread-search">
            <Search className="search-icon" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="search-clear"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Thread list */}
          <div className="thread-list-scroll">
            {filteredThreads.length === 0 ? (
              <div className="thread-list-empty">
                <MessageSquare className="h-8 w-8 text-gray-400" />
                <p className="text-sm text-gray-500">
                  {searchQuery ? 'No conversations found' : 'No conversations yet'}
                </p>
              </div>
            ) : (
              filteredThreads.map((thread) => (
                <div
                  key={thread._id}
                  className={`thread-item ${activeThreadId === thread._id ? 'active' : ''}`}
                  onClick={() => onSelectThread(thread._id)}
                >
                  <div className="thread-item-content">
                    <div className="thread-item-header">
                      <h3 className="thread-title">{thread.title}</h3>
                      <div className="thread-actions">
                        {onExportThread && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onExportThread(thread._id);
                            }}
                            className="thread-action-btn"
                            title="Export"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onPinThread(thread._id);
                          }}
                          className={`thread-action-btn ${thread.pinned ? 'pinned' : ''}`}
                          title={thread.pinned ? 'Unpin' : 'Pin'}
                        >
                          <Pin className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(thread._id, e)}
                          className="thread-action-btn delete"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {thread.lastMessage && (
                      <p className="thread-preview">
                        {thread.lastMessage}
                      </p>
                    )}

                    {/* Tools and Models Used */}
                    {(thread.toolsUsed && thread.toolsUsed.length > 0) && (
                      <div className="thread-badges">
                        <div className="thread-badge-group">
                          <Wrench className="badge-icon" />
                          <span className="badge-count">{thread.toolsUsed.length} {thread.toolsUsed.length === 1 ? 'tool' : 'tools'}</span>
                        </div>
                      </div>
                    )}

                    <div className="thread-meta">
                      <span className="thread-message-count">
                        {thread.messageCount || 0} messages
                      </span>
                      <span className="thread-time">
                        {formatRelativeTime(thread.lastMessageAt || thread.updatedAt)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
      
      {/* Delete confirmation modal */}
      {deletingThreadId && (
        <div className="delete-modal-overlay" onClick={cancelDelete}>
          <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="delete-modal-title">Delete Conversation?</h3>
            <p className="delete-modal-text">
              This will permanently delete this conversation and all its messages.
            </p>
            <div className="delete-modal-actions">
              <button onClick={cancelDelete} className="btn-cancel">
                Cancel
              </button>
              <button onClick={confirmDelete} className="btn-delete">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      
      <style>{`
        .thread-list {
          width: 280px;
          height: 100%;
          border-right: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          background: var(--bg-primary);
          position: relative;
          transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1), border-right 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          overflow: hidden;
        }

        .thread-list.collapsed {
          width: 0;
          min-width: 0;
          border-right: none;
        }


        .thread-search {
          padding: 1rem;
          border-bottom: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          gap: 0.5rem;
          position: relative;
        }
        
        .search-icon {
          position: absolute;
          left: 1.5rem;
          width: 1rem;
          height: 1rem;
          color: var(--text-secondary);
          pointer-events: none;
        }
        
        .search-input {
          flex: 1;
          padding: 0.5rem 0.75rem 0.5rem 2rem;
          border: 1px solid var(--border-color);
          border-radius: 0.5rem;
          background: var(--bg-secondary);
          color: var(--text-primary);
          font-size: 0.875rem;
        }
        
        .search-input:focus {
          outline: none;
          border-color: #3b82f6;
        }
        
        .search-clear {
          position: absolute;
          right: 1.5rem;
          padding: 0.25rem;
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          border-radius: 0.25rem;
        }
        
        .search-clear:hover {
          background: var(--bg-tertiary);
        }
        
        .thread-list-scroll {
          flex: 1;
          overflow-y: auto;
        }
        
        .thread-list-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          padding: 2rem;
          text-align: center;
        }
        
        .thread-item {
          padding: 0.75rem 1rem;
          border-bottom: 1px solid var(--border-color);
          cursor: pointer;
          transition: background 0.15s;
        }
        
        .thread-item:hover {
          background: var(--bg-secondary);
        }
        
        .thread-item.active {
          background: var(--bg-tertiary);
          border-left: 3px solid #3b82f6;
        }
        
        .thread-item-content {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        
        .thread-item-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 0.5rem;
        }
        
        .thread-title {
          flex: 1;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        .thread-actions {
          display: flex;
          gap: 0.25rem;
          opacity: 0;
          transition: opacity 0.15s;
        }
        
        .thread-item:hover .thread-actions {
          opacity: 1;
        }
        
        .thread-action-btn {
          padding: 0.25rem;
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          border-radius: 0.25rem;
          transition: all 0.15s;
        }
        
        .thread-action-btn:hover {
          background: var(--bg-primary);
          color: var(--text-primary);
        }
        
        .thread-action-btn.pinned {
          color: #f59e0b;
        }
        
        .thread-action-btn.delete:hover {
          color: #ef4444;
        }
        
        .thread-preview {
          font-size: 0.8125rem;
          color: var(--text-secondary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        .thread-badges {
          display: flex;
          gap: 0.5rem;
          margin-top: 0.5rem;
          flex-wrap: wrap;
        }
        
        .thread-badge-group {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.5rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 0.375rem;
          font-size: 0.75rem;
          color: var(--text-secondary);
        }
        
        .badge-icon {
          width: 0.875rem;
          height: 0.875rem;
          color: #8b5cf6;
        }
        
        .badge-count {
          font-weight: 500;
        }
        
        .thread-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.75rem;
          color: var(--text-secondary);
        }
        
        .delete-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1001;
        }
        
        .delete-modal {
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: 0.75rem;
          padding: 1.5rem;
          max-width: 400px;
          width: 90%;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }
        
        .delete-modal-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 0.5rem;
        }
        
        .delete-modal-text {
          font-size: 0.875rem;
          color: var(--text-secondary);
          margin-bottom: 1.5rem;
        }
        
        .delete-modal-actions {
          display: flex;
          gap: 0.75rem;
          justify-content: flex-end;
        }
        
        .btn-cancel,
        .btn-delete {
          padding: 0.5rem 1rem;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
        }
        
        .btn-cancel {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          color: var(--text-primary);
        }
        
        .btn-cancel:hover {
          background: var(--bg-tertiary);
        }
        
        .btn-delete {
          background: #ef4444;
          border: none;
          color: white;
        }
        
        .btn-delete:hover {
          background: #dc2626;
        }
      `}</style>
    </div>
  );
}

// Helper function to format relative time
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return new Date(timestamp).toLocaleDateString();
}
