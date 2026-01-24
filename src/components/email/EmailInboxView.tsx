import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  Inbox,
  Star,
  Archive,
  Trash2,
  CheckCircle,
  Circle,
  RefreshCw,
  Search,
  Filter,
  ChevronRight,
  AlertTriangle,
  Clock,
  Tag,
} from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

interface EmailInboxViewProps {
  onSelectThread?: (threadId: Id<"emailThreads">) => void;
  selectedThreadId?: Id<"emailThreads"> | null;
}

export function EmailInboxView({ onSelectThread, selectedThreadId }: EmailInboxViewProps) {
  const [filter, setFilter] = useState<'all' | 'unread' | 'starred' | 'action_required'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Get inbox threads
  const threads = useQuery(api.domains.integrations.email.emailQueries.getInboxThreads, {
    filter: filter === 'all' ? undefined : filter,
    category: selectedCategory || undefined,
    limit: 50,
  });

  // Get email stats for category filters
  const stats = useQuery(api.domains.integrations.email.emailQueries.getEmailStats);

  const isLoading = threads === undefined;

  // Filter threads by search query
  const filteredThreads = threads?.filter((thread) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      thread.subject.toLowerCase().includes(query) ||
      thread.latestFrom?.toLowerCase().includes(query) ||
      thread.aiCategory?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="flex flex-col h-full bg-stone-900">
      {/* Header */}
      <div className="p-4 border-b border-stone-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Inbox className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Email Inbox</h1>
              <p className="text-sm text-stone-400">
                {stats?.unreadCount || 0} unread • {stats?.totalThreads || 0} total
              </p>
            </div>
          </div>
          <button className="p-2 text-stone-400 hover:text-white hover:bg-stone-800 rounded-lg transition-colors">
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            type="text"
            placeholder="Search emails..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-stone-800 border border-stone-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[
            { key: 'all', label: 'All', icon: Mail },
            { key: 'unread', label: 'Unread', icon: Circle },
            { key: 'starred', label: 'Starred', icon: Star },
            { key: 'action_required', label: 'Action Required', icon: AlertTriangle },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setFilter(key as typeof filter)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
                filter === key
                  ? 'bg-blue-600 text-white'
                  : 'bg-stone-800 text-stone-400 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Category Filter */}
        {stats?.categories && stats.categories.length > 0 && (
          <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition-colors ${
                !selectedCategory
                  ? 'bg-stone-600 text-white'
                  : 'bg-stone-800 text-stone-400 hover:text-white'
              }`}
            >
              All Categories
            </button>
            {stats.categories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => setSelectedCategory(cat.name)}
                className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition-colors ${
                  selectedCategory === cat.name
                    ? 'bg-stone-600 text-white'
                    : 'bg-stone-800 text-stone-400 hover:text-white'
                }`}
              >
                {cat.name} ({cat.count})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Email List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-4 bg-stone-800/50 rounded-lg animate-pulse">
                <div className="h-4 bg-stone-700 rounded w-3/4 mb-2" />
                <div className="h-3 bg-stone-700 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredThreads && filteredThreads.length > 0 ? (
          <AnimatePresence>
            {filteredThreads.map((thread, index) => (
              <EmailThreadRow
                key={thread._id}
                thread={thread}
                isSelected={selectedThreadId === thread._id}
                onClick={() => onSelectThread?.(thread._id)}
                index={index}
              />
            ))}
          </AnimatePresence>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-stone-400">
            <Mail className="h-12 w-12 mb-4 opacity-50" />
            <p>No emails found</p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-2 text-blue-400 hover:text-blue-300 text-sm"
              >
                Clear search
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Email Thread Row Component
interface ThreadData {
  _id: Id<"emailThreads">;
  subject: string;
  latestFrom?: string;
  snippet?: string;
  isRead: boolean;
  isStarred: boolean;
  aiCategory?: string;
  aiPriority?: 'urgent' | 'high' | 'normal' | 'low';
  aiActionRequired?: boolean;
  aiSummary?: string;
  messageCount: number;
  lastMessageAt?: number;
}

function EmailThreadRow({
  thread,
  isSelected,
  onClick,
  index,
}: {
  thread: ThreadData;
  isSelected: boolean;
  onClick: () => void;
  index: number;
}) {
  const priorityColors = {
    urgent: 'bg-red-500',
    high: 'bg-orange-500',
    normal: 'bg-blue-500',
    low: 'bg-stone-500',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      onClick={onClick}
      className={`p-4 border-b border-stone-800 cursor-pointer transition-colors ${
        isSelected
          ? 'bg-blue-900/30 border-l-2 border-l-blue-500'
          : thread.isRead
            ? 'hover:bg-stone-800/50'
            : 'bg-stone-800/30 hover:bg-stone-800/50'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Unread Indicator */}
        <div className="mt-1">
          {!thread.isRead ? (
            <div className="h-2 w-2 bg-blue-500 rounded-full" />
          ) : (
            <div className="h-2 w-2" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className={`text-sm truncate ${!thread.isRead ? 'font-semibold text-white' : 'text-stone-300'}`}>
              {thread.latestFrom || 'Unknown'}
            </span>
            <div className="flex items-center gap-2 ml-2">
              {thread.isStarred && <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />}
              {thread.lastMessageAt && (
                <span className="text-xs text-stone-500 whitespace-nowrap">
                  {formatDate(thread.lastMessageAt)}
                </span>
              )}
            </div>
          </div>

          <p className={`text-sm truncate mb-1 ${!thread.isRead ? 'text-white' : 'text-stone-400'}`}>
            {thread.subject}
          </p>

          {thread.snippet && (
            <p className="text-xs text-stone-500 truncate mb-2">
              {thread.snippet}
            </p>
          )}

          {/* Tags */}
          <div className="flex items-center gap-2 flex-wrap">
            {thread.aiPriority && thread.aiPriority !== 'normal' && (
              <span className={`px-2 py-0.5 ${priorityColors[thread.aiPriority]} text-white text-xs rounded uppercase`}>
                {thread.aiPriority}
              </span>
            )}
            {thread.aiActionRequired && (
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Action Required
              </span>
            )}
            {thread.aiCategory && (
              <span className="px-2 py-0.5 bg-stone-700 text-stone-300 text-xs rounded flex items-center gap-1">
                <Tag className="h-3 w-3" />
                {thread.aiCategory}
              </span>
            )}
            {thread.messageCount > 1 && (
              <span className="text-xs text-stone-500">
                {thread.messageCount} messages
              </span>
            )}
          </div>
        </div>

        <ChevronRight className="h-5 w-5 text-stone-600 mt-1" />
      </div>
    </motion.div>
  );
}

// Format date helper
function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
}
