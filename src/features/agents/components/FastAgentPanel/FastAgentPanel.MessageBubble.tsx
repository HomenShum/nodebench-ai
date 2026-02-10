// src/components/FastAgentPanel/FastAgentPanel.MessageBubble.tsx
// Message bubble component with markdown rendering and metadata

import React, { useMemo, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { LazySyntaxHighlighter } from './LazySyntaxHighlighter';
import { User, Bot, Zap, Clock, Loader2, Copy, Check, RefreshCw, ThumbsUp, ThumbsDown } from 'lucide-react';
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
          <div className="w-7 h-7 rounded-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] flex items-center justify-center">
            <User className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
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
          <span className="text-sm font-semibold text-[var(--text-primary)]">
            {isUser ? 'You' : 'Nodebench'}
          </span>
          <span className="text-[11px] text-[var(--text-muted)]">
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
            ? "px-3.5 py-2.5 rounded-xl rounded-tr-sm bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)]"
            : "px-3.5 py-2.5 rounded-xl rounded-tl-sm bg-[var(--bg-secondary)]/40 border-l-2 border-l-[var(--accent-primary)]/20 text-[var(--text-primary)]"
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
                <span className="inline-block w-0.5 h-[1em] bg-current ml-0.5 align-middle animate-pulse" />
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
              onClick={handleCopy}
              className="action-btn p-1 rounded-md hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
              title="Copy message"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
            {onRetry && (
              <button
                onClick={() => onRetry(message)}
                className="action-btn p-1 rounded-md hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                title="Retry"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => handleFeedback('up')}
              className={cn(
                "action-btn p-1 rounded-md transition-colors",
                feedback === 'up'
                  ? "bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400"
                  : "hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              )}
              title="Good response"
            >
              <ThumbsUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleFeedback('down')}
              className={cn(
                "action-btn p-1 rounded-md transition-colors",
                feedback === 'down'
                  ? "bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                  : "hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              )}
              title="Poor response"
            >
              <ThumbsDown className="w-3.5 h-3.5" />
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

        {/* Metadata footer */}
        {isAssistant && !isStreaming && (message.model || message.fastMode || message.elapsedMs) && (
          <div className="mt-1.5">
            <button
              onClick={() => setShowMetadata(!showMetadata)}
              className="flex items-center gap-1.5 py-0.5 bg-transparent border-none cursor-pointer text-xs"
            >
              {message.fastMode && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 text-[10px] font-medium">
                  <Zap className="h-2.5 w-2.5" />
                  Fast
                </span>
              )}
              {message.model && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-muted)] text-[10px] font-medium">
                  {message.model}
                </span>
              )}
              {message.elapsedMs && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-muted)] text-[10px] font-medium">
                  <Clock className="h-2.5 w-2.5" />
                  {(message.elapsedMs / 1000).toFixed(1)}s
                </span>
              )}
            </button>
            
            {/* Expanded metadata */}
            {showMetadata && message.tokensUsed && (
              <div className="mt-1.5 px-2.5 py-2 bg-[var(--bg-tertiary)] rounded-md text-[11px] space-y-0.5">
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Input tokens:</span>
                  <span className="text-[var(--text-primary)] font-medium tabular-nums">{message.tokensUsed.input.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Output tokens:</span>
                  <span className="text-[var(--text-primary)] font-medium tabular-nums">{message.tokensUsed.output.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t border-[var(--border-color)] pt-1 mt-1">
                  <span className="text-[var(--text-muted)]">Total:</span>
                  <span className="text-[var(--text-primary)] font-medium tabular-nums">
                    {(message.tokensUsed.input + message.tokensUsed.output).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
