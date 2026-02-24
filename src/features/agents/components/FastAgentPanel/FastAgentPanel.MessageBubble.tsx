// src/components/FastAgentPanel/FastAgentPanel.MessageBubble.tsx
// Message bubble component with markdown rendering and metadata

import React, { useMemo, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { LazySyntaxHighlighter } from './LazySyntaxHighlighter';
import { User, Bot, Zap, Clock, Loader2, Copy, Check, RefreshCw, ThumbsUp, ThumbsDown, Share2 } from 'lucide-react';
import { useSmoothText } from '@convex-dev/agent/react';
import { LiveThinking } from './FastAgentPanel.LiveThinking';
import { MemoryPreview } from './FastAgentPanel.Memory';
import { StreamingMessage } from './FastAgentPanel.StreamingMessage';
import { cn } from '@/lib/utils';
import type { Message, ThinkingStep, ToolCall, Source } from './types';

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
  liveThinking?: ThinkingStep[];
  liveToolCalls?: ToolCall[];
  liveSources?: Source[];
  onRetry?: (message: Message) => void;
}

/**
 * MessageBubble - Renders a single message with markdown, code highlighting, and live updates
 */
export const MessageBubble = React.memo(function MessageBubble({
  message,
  isStreaming = false,
  liveThinking = [],
  liveToolCalls = [],
  liveSources = [],
  onRetry,
}: MessageBubbleProps) {
  const [showMetadata, setShowMetadata] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);

  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const hasLiveData = liveThinking.length > 0 || liveToolCalls.length > 0 || liveSources.length > 0;

  // Defensive: if assistant content looks like JSON, extract finalResponse/response/message
  const contentToRender = useMemo(() => {
    const raw = message.content ?? '';
    if (!isAssistant || typeof raw !== 'string') return raw as string;
    const trimmed = raw.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed: any = JSON.parse(trimmed);
        const extracted = parsed?.finalResponse ?? parsed?.response ?? parsed?.message;
        if (typeof extracted === 'string' && extracted.trim().length > 0) return extracted;
      } catch (err) {
        void err;
        return raw as string;
      }
    }
    return raw as string;
  }, [isAssistant, message.content]);

  // Use smooth text streaming for assistant messages
  const [smoothText] = useSmoothText(contentToRender, {
    startStreaming: isStreaming && isAssistant,
  });

  // Use smooth text for streaming, otherwise use the raw content
  const displayText = isStreaming && isAssistant ? smoothText : contentToRender;

  const handleCopy = useCallback(() => {
    const text = contentToRender || '';
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [contentToRender]);

  const handleShare = useCallback(() => {
    const text = contentToRender || '';
    const shareText = `${text}\n\n— Shared from AI Assistant`;
    navigator.clipboard.writeText(shareText).then(() => {
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    });
  }, [contentToRender]);

  const handleFeedback = useCallback((type: 'up' | 'down') => {
    setFeedback((prev) => (prev === type ? null : type));
  }, []);

  return (
    <div
      className={cn(
        "group flex gap-3 mb-5 animate-in fade-in slide-in-from-bottom-1 duration-200",
        isUser && "flex-row-reverse"
      )}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        {isUser ? (
          <div className="w-7 h-7 rounded-full bg-surface-secondary border border-edge flex items-center justify-center">
            <User className="h-3.5 w-3.5 text-content-secondary" />
          </div>
        ) : (
          <div className="w-7 h-7 rounded-full bg-violet-100 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800/40 flex items-center justify-center">
            <Bot className="h-3.5 w-3.5 text-violet-700 dark:text-violet-400" />
          </div>
        )}
      </div>
      
      {/* Message Content */}
      <div className="flex-1 min-w-0">
        {/* Header with role and timestamp */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold text-content">
            {isUser ? 'You' : 'Assistant'}
          </span>
          <span className="text-xs text-content-muted">
            {new Date(message.timestamp).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </span>
        </div>
        
        {/* Main content */}
        <div className={cn(
          "text-[15px] leading-relaxed",
          isUser
            ? "px-3.5 py-2.5 rounded-lg rounded-tr-sm bg-surface-secondary border border-edge text-content"
            : "px-3.5 py-2.5 rounded-lg rounded-tl-sm bg-surface-secondary/40 border-l-2 border-l-[rgb(79, 70, 229)]/20 text-content"
        )}>
          {/* Use StreamingMessage for messages with streamId */}
          {isAssistant && message.streamId ? (
            <StreamingMessage message={message} />
          ) : message.content && typeof message.content === 'string' ? (
            <>
              <ReactMarkdown
                components={{
                  code({ inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    return !inline && match ? (
                      <LazySyntaxHighlighter
                        language={match[1]}
                        PreTag="div"
                      >
                        {String(children).replace(/\n$/, '')}
                      </LazySyntaxHighlighter>
                    ) : (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {displayText}
              </ReactMarkdown>
              {isStreaming && (
                <span className="inline-block w-0.5 h-[1em] bg-current ml-0.5 align-middle motion-safe:animate-pulse" />
              )}
            </>
          ) : typeof message.content === 'object' ? (
            <p className="text-red-500 dark:text-red-400 text-sm">
              Error: Invalid message content (object received)
            </p>
          ) : message.content ? (
            <p>{String(message.content)}</p>
          ) : (
            <div className="skeleton-shimmer">
              <div className="skeleton-line"></div>
              <div className="skeleton-line"></div>
              <div className="skeleton-line"></div>
            </div>
          )}
        </div>

        {/* Hover actions (Claude/ChatGPT pattern) */}
        {isAssistant && !isStreaming && contentToRender && (
          <div className="flex items-center gap-0.5 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            <button
              type="button"
              onClick={handleCopy}
              className="action-btn p-1 rounded-md hover:bg-surface-secondary text-content-muted hover:text-content-secondary transition-colors"
              title="Copy message"
              aria-label="Copy message"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
            {onRetry && (
              <button
                type="button"
                onClick={() => onRetry(message)}
                className="action-btn p-1 rounded-md hover:bg-surface-secondary text-content-muted hover:text-content-secondary transition-colors"
                title="Retry"
                aria-label="Retry this message"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => handleFeedback('up')}
              className={cn(
                "action-btn p-1 rounded-md transition-colors",
                feedback === 'up'
                  ? "bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400"
                  : "hover:bg-surface-secondary text-content-muted hover:text-content-secondary"
              )}
              title="Good response"
              aria-label="Good response"
            >
              <ThumbsUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleFeedback('down')}
              className={cn(
                "action-btn p-1 rounded-md transition-colors",
                feedback === 'down'
                  ? "bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                  : "hover:bg-surface-secondary text-content-muted hover:text-content-secondary"
              )}
              title="Poor response"
              aria-label="Poor response"
            >
              <ThumbsDown className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-3 bg-[var(--border-color)] mx-0.5" />
            <button
              type="button"
              onClick={handleShare}
              className={cn(
                "action-btn p-1 rounded-md transition-colors",
                shared
                  ? "bg-indigo-100 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400"
                  : "hover:bg-surface-secondary text-content-muted hover:text-content-secondary"
              )}
              title="Share"
              aria-label="Share this response"
            >
              {shared ? (
                <Check className="w-3.5 h-3.5 text-indigo-500" />
              ) : (
                <Share2 className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        )}
        
        {/* Live thinking/tools/sources */}
        {isAssistant && (hasLiveData || isStreaming) && (
          <div className="mt-3 message-live-data">
            <LiveThinking
              thinkingSteps={liveThinking}
              toolCalls={liveToolCalls}
              sources={liveSources}
              isStreaming={isStreaming}
              defaultExpanded={isStreaming}
            />
          </div>
        )}

        {/* Memory preview for this run */}
        {isAssistant && message.runId && (
          <MemoryPreview runId={String(message.runId)} />
        )}

        {/* Metadata footer — show only elapsed time; model + tokens behind click */}
        {isAssistant && !isStreaming && message.elapsedMs && (
          <div className="mt-1.5">
            <button
              type="button"
              onClick={() => setShowMetadata(!showMetadata)}
              className="flex items-center gap-1.5 py-0.5 bg-transparent border-none cursor-pointer text-xs"
              aria-label={showMetadata ? "Hide message details" : "Show message details"}
            >
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-surface-secondary text-content-muted text-xs font-medium">
                <Clock className="h-2.5 w-2.5" />
                {(message.elapsedMs / 1000).toFixed(1)}s
              </span>
            </button>

            {/* Expanded metadata — model + tokens shown on click */}
            {showMetadata && (
              <div className="mt-1.5 px-2.5 py-2 bg-surface-secondary rounded-md text-xs space-y-0.5">
                {message.model && (
                  <div className="flex justify-between">
                    <span className="text-content-muted">Model:</span>
                    <span className="text-content font-medium">{message.model}</span>
                  </div>
                )}
                {message.fastMode && (
                  <div className="flex justify-between">
                    <span className="text-content-muted">Mode:</span>
                    <span className="text-amber-600 dark:text-amber-400 font-medium">Fast</span>
                  </div>
                )}
                {message.tokensUsed && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-content-muted">Input tokens:</span>
                      <span className="text-content font-medium tabular-nums">{message.tokensUsed.input.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-content-muted">Output tokens:</span>
                      <span className="text-content font-medium tabular-nums">{message.tokensUsed.output.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t border-edge pt-1 mt-1">
                      <span className="text-content-muted">Total:</span>
                      <span className="text-content font-medium tabular-nums">
                        {(message.tokensUsed.input + message.tokensUsed.output).toLocaleString()}
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
