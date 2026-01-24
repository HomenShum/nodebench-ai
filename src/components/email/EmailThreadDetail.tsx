import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Star,
  Archive,
  Trash2,
  Reply,
  Forward,
  MoreHorizontal,
  CheckCircle,
  Circle,
  Clock,
  Tag,
  AlertTriangle,
  Paperclip,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

interface EmailThreadDetailProps {
  threadId: Id<"emailThreads">;
  onBack?: () => void;
}

export function EmailThreadDetail({ threadId, onBack }: EmailThreadDetailProps) {
  const thread = useQuery(api.domains.integrations.email.emailQueries.getThreadDetail, {
    threadId,
  });

  const isLoading = thread === undefined;

  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-stone-900 animate-pulse">
        <div className="p-4 border-b border-stone-700">
          <div className="h-8 bg-stone-700 rounded w-3/4 mb-2" />
          <div className="h-4 bg-stone-700 rounded w-1/2" />
        </div>
        <div className="p-4 space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-40 bg-stone-800 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-stone-900 text-stone-400">
        <p>Thread not found</p>
        <button
          onClick={onBack}
          className="mt-4 text-blue-400 hover:text-blue-300"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-stone-900">
      {/* Header */}
      <div className="p-4 border-b border-stone-700">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={onBack}
            className="p-2 text-stone-400 hover:text-white hover:bg-stone-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold text-white flex-1 truncate">
            {thread.subject}
          </h1>
          <div className="flex items-center gap-2">
            <ActionButton icon={Star} filled={thread.isStarred} fillColor="text-yellow-400" />
            <ActionButton icon={Archive} />
            <ActionButton icon={Trash2} />
            <ActionButton icon={MoreHorizontal} />
          </div>
        </div>

        {/* AI Insights */}
        {(thread.aiCategory || thread.aiPriority || thread.aiSummary) && (
          <div className="p-3 bg-stone-800/50 rounded-lg border border-stone-700">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-stone-400 uppercase tracking-wide">AI Insights</span>
            </div>
            <div className="flex flex-wrap gap-2 mb-2">
              {thread.aiCategory && (
                <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  {thread.aiCategory}
                </span>
              )}
              {thread.aiPriority && thread.aiPriority !== 'normal' && (
                <span className={`px-2 py-1 text-xs rounded ${getPriorityStyle(thread.aiPriority)}`}>
                  {thread.aiPriority.toUpperCase()}
                </span>
              )}
              {thread.aiActionRequired && (
                <span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Action Required
                </span>
              )}
            </div>
            {thread.aiSummary && (
              <p className="text-sm text-stone-300">{thread.aiSummary}</p>
            )}
            {thread.aiActionSuggestion && (
              <p className="text-sm text-amber-300 mt-2">
                → {thread.aiActionSuggestion}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {thread.messages && thread.messages.length > 0 ? (
          thread.messages.map((message, index) => (
            <EmailMessage
              key={message._id}
              message={message}
              isFirst={index === 0}
              isLast={index === thread.messages.length - 1}
            />
          ))
        ) : (
          <div className="text-center text-stone-400 py-8">
            <p>No messages in this thread</p>
          </div>
        )}
      </div>

      {/* Reply Bar */}
      <div className="p-4 border-t border-stone-700">
        <div className="flex gap-2">
          <button className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center justify-center gap-2 transition-colors">
            <Reply className="h-4 w-4" />
            Reply
          </button>
          <button className="py-2 px-4 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg flex items-center justify-center gap-2 transition-colors">
            <Forward className="h-4 w-4" />
            Forward
          </button>
        </div>
      </div>
    </div>
  );
}

// Action Button Component
function ActionButton({
  icon: Icon,
  filled = false,
  fillColor = '',
}: {
  icon: React.ComponentType<{ className?: string }>;
  filled?: boolean;
  fillColor?: string;
}) {
  return (
    <button className="p-2 text-stone-400 hover:text-white hover:bg-stone-800 rounded-lg transition-colors">
      <Icon className={`h-5 w-5 ${filled ? `${fillColor} fill-current` : ''}`} />
    </button>
  );
}

// Email Message Component
interface MessageData {
  _id: Id<"emailMessages">;
  from: string;
  to?: string[];
  cc?: string[];
  date?: number;
  bodyHtml?: string;
  bodyText?: string;
  hasAttachments?: boolean;
  attachments?: Array<{ filename: string; mimeType: string; size?: number }>;
}

function EmailMessage({
  message,
  isFirst,
  isLast,
}: {
  message: MessageData;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(isLast);
  const [showRaw, setShowRaw] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-stone-800/50 rounded-lg border border-stone-700 overflow-hidden"
    >
      {/* Message Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-start gap-3 hover:bg-stone-800/80 transition-colors text-left"
      >
        {/* Avatar */}
        <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
          {getInitials(message.from)}
        </div>

        {/* Header Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="font-medium text-white truncate">{extractName(message.from)}</span>
            {message.date && (
              <span className="text-xs text-stone-500 ml-2 whitespace-nowrap">
                {formatDateTime(message.date)}
              </span>
            )}
          </div>
          <p className="text-xs text-stone-400 truncate">{message.from}</p>
          {message.to && message.to.length > 0 && (
            <p className="text-xs text-stone-500 truncate">
              To: {message.to.join(', ')}
            </p>
          )}
        </div>

        {/* Expand/Collapse */}
        <div className="mt-1">
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-stone-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-stone-400" />
          )}
        </div>
      </button>

      {/* Message Body */}
      {isExpanded && (
        <div className="px-4 pb-4">
          <div className="border-t border-stone-700 pt-4">
            {/* Body Content */}
            {message.bodyHtml && !showRaw ? (
              <div
                className="prose prose-invert prose-sm max-w-none text-stone-300"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(message.bodyHtml) }}
              />
            ) : (
              <pre className="text-sm text-stone-300 whitespace-pre-wrap font-mono bg-stone-900 p-3 rounded-lg overflow-x-auto">
                {message.bodyText || 'No content'}
              </pre>
            )}

            {/* Toggle Raw/HTML */}
            {message.bodyHtml && message.bodyText && (
              <button
                onClick={() => setShowRaw(!showRaw)}
                className="mt-3 text-xs text-stone-500 hover:text-stone-400"
              >
                {showRaw ? 'Show HTML' : 'Show Plain Text'}
              </button>
            )}

            {/* Attachments */}
            {message.hasAttachments && message.attachments && message.attachments.length > 0 && (
              <div className="mt-4 pt-4 border-t border-stone-700">
                <div className="flex items-center gap-2 mb-2">
                  <Paperclip className="h-4 w-4 text-stone-400" />
                  <span className="text-sm text-stone-400">
                    {message.attachments.length} attachment{message.attachments.length > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {message.attachments.map((att, i) => (
                    <div
                      key={i}
                      className="px-3 py-2 bg-stone-900 rounded-lg flex items-center gap-2 text-sm text-stone-300"
                    >
                      <Paperclip className="h-4 w-4 text-stone-500" />
                      <span className="truncate max-w-[200px]">{att.filename}</span>
                      {att.size && (
                        <span className="text-xs text-stone-500">
                          ({formatFileSize(att.size)})
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// Helper functions
function getPriorityStyle(priority: string): string {
  switch (priority) {
    case 'urgent':
      return 'bg-red-500/20 text-red-400';
    case 'high':
      return 'bg-orange-500/20 text-orange-400';
    case 'low':
      return 'bg-stone-500/20 text-stone-400';
    default:
      return 'bg-blue-500/20 text-blue-400';
  }
}

function getInitials(email: string): string {
  const name = extractName(email);
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function extractName(email: string): string {
  const match = email.match(/^"?([^"<]+)"?\s*</);
  if (match) return match[1].trim();
  return email.split('@')[0];
}

function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function sanitizeHtml(html: string): string {
  // Basic sanitization - in production use a proper library like DOMPurify
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '');
}
