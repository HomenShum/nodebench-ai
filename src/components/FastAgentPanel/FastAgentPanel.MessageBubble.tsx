// src/components/FastAgentPanel/FastAgentPanel.MessageBubble.tsx
// Message bubble component with markdown rendering and metadata

import React, { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { User, Bot, Zap, Clock, Loader2 } from 'lucide-react';
import { useSmoothText } from '@convex-dev/agent/react';
import { LiveThinking } from './FastAgentPanel.LiveThinking';
import { MemoryPreview } from './FastAgentPanel.Memory';
import { StreamingMessage } from './FastAgentPanel.StreamingMessage';
import type { Message, ThinkingStep, ToolCall, Source } from './types';

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
  liveThinking?: ThinkingStep[];
  liveToolCalls?: ToolCall[];
  liveSources?: Source[];
}

/**
 * MessageBubble - Renders a single message with markdown, code highlighting, and live updates
 */
export function MessageBubble({
  message,
  isStreaming = false,
  liveThinking = [],
  liveToolCalls = [],
  liveSources = [],
}: MessageBubbleProps) {
  const [showMetadata, setShowMetadata] = useState(false);

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
      } catch {}
    }
    return raw as string;
  }, [isAssistant, message.content]);

  // Use smooth text streaming for assistant messages
  const [smoothText] = useSmoothText(contentToRender, {
    startStreaming: isStreaming && isAssistant,
  });

  // Use smooth text for streaming, otherwise use the raw content
  const displayText = isStreaming && isAssistant ? smoothText : contentToRender;

  return (
    <div className={`message-bubble-container ${isUser ? 'user' : 'assistant'}`}>
      {/* Avatar */}
      <div className="message-avatar">
        {isUser ? (
          <div className="avatar-icon user-avatar">
            <User className="h-4 w-4" />
          </div>
        ) : (
          <div className="avatar-icon assistant-avatar">
            <Bot className="h-4 w-4" />
          </div>
        )}
      </div>
      
      {/* Message Content */}
      <div className="message-content-wrapper">
        {/* Header with role and timestamp */}
        <div className="message-header">
          <span className="message-role">
            {isUser ? 'You' : 'Assistant'}
          </span>
          <span className="message-timestamp">
            {new Date(message.timestamp).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </span>
        </div>
        
        {/* Main content */}
        <div className={`message-content ${isUser ? 'user-content' : 'assistant-content'}`}>
          {/* Use StreamingMessage for messages with streamId */}
          {isAssistant && message.streamId ? (
            <StreamingMessage message={message} />
          ) : message.content && typeof message.content === 'string' ? (
            <>
              <ReactMarkdown
                components={{
                  code({ node, inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    return !inline && match ? (
                      <SyntaxHighlighter
                        style={vscDarkPlus}
                        language={match[1]}
                        PreTag="div"
                        {...props}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
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
                <span
                  className="typing-cursor"
                  style={{
                    display: 'inline-block',
                    width: '2px',
                    height: '1em',
                    backgroundColor: 'currentColor',
                    marginLeft: '2px',
                    animation: 'blink 1s infinite',
                    verticalAlign: 'middle'
                  }}
                />
              )}
            </>
          ) : typeof message.content === 'object' ? (
            <p className="text-red-500">
              Error: Invalid message content (object received)
            </p>
          ) : message.content ? (
            <p>{String(message.content)}</p>
          ) : (
            <p className="streaming-placeholder">
              <Loader2 className="h-4 w-4 animate-spin" />
              Thinking...
            </p>
          )}
        </div>
        
        {/* Live thinking/tools/sources */}
        {isAssistant && (hasLiveData || isStreaming) && (
          <div className="message-live-data">
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
        {isAssistant && (message.model || message.fastMode || message.elapsedMs) && (
          <div className="message-footer">
            <button
              onClick={() => setShowMetadata(!showMetadata)}
              className="metadata-toggle"
            >
              {message.fastMode && (
                <span className="metadata-badge fast-mode">
                  <Zap className="h-3 w-3" />
                  Fast
                </span>
              )}
              {message.model && (
                <span className="metadata-badge model">
                  {message.model}
                </span>
              )}
              {message.elapsedMs && (
                <span className="metadata-badge elapsed">
                  <Clock className="h-3 w-3" />
                  {(message.elapsedMs / 1000).toFixed(1)}s
                </span>
              )}
            </button>
            
            {/* Expanded metadata */}
            {showMetadata && message.tokensUsed && (
              <div className="metadata-expanded">
                <div className="metadata-row">
                  <span className="metadata-label">Input tokens:</span>
                  <span className="metadata-value">{message.tokensUsed.input.toLocaleString()}</span>
                </div>
                <div className="metadata-row">
                  <span className="metadata-label">Output tokens:</span>
                  <span className="metadata-value">{message.tokensUsed.output.toLocaleString()}</span>
                </div>
                <div className="metadata-row">
                  <span className="metadata-label">Total:</span>
                  <span className="metadata-value">
                    {(message.tokensUsed.input + message.tokensUsed.output).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      <style>{`
        .message-bubble-container {
          display: flex;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
          animation: fadeIn 0.2s ease-out;
        }
        
        .message-bubble-container.user {
          flex-direction: row-reverse;
        }
        
        .message-avatar {
          flex-shrink: 0;
        }
        
        .avatar-icon {
          width: 2rem;
          height: 2rem;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .user-avatar {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        
        .assistant-avatar {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          color: white;
        }
        
        .message-content-wrapper {
          flex: 1;
          min-width: 0;
        }
        
        .message-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }
        
        .message-role {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-primary);
        }
        
        .message-timestamp {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }
        
        .message-content {
          padding: 0.75rem 1rem;
          border-radius: 0.75rem;
          font-size: 0.9375rem;
          line-height: 1.6;
        }
        
        .user-content {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          color: var(--text-primary);
        }
        
        .assistant-content {
          background: transparent;
          color: var(--text-primary);
        }
        
        .streaming-placeholder {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--text-secondary);
          font-style: italic;
        }
        
        .streaming-cursor {
          display: inline-block;
          margin-left: 2px;
          animation: blink 1s infinite;
          color: var(--text-primary);
        }
        
        .message-live-data {
          margin-top: 0.75rem;
        }
        
        .message-footer {
          margin-top: 0.5rem;
        }
        
        .metadata-toggle {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.25rem 0;
          background: transparent;
          border: none;
          cursor: pointer;
          font-size: 0.75rem;
        }
        
        .metadata-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.125rem 0.5rem;
          border-radius: 0.375rem;
          font-size: 0.75rem;
          font-weight: 500;
        }
        
        .metadata-badge.fast-mode {
          background: #fef3c7;
          color: #92400e;
        }
        
        .metadata-badge.model {
          background: var(--bg-tertiary);
          color: var(--text-secondary);
        }
        
        .metadata-badge.elapsed {
          background: var(--bg-tertiary);
          color: var(--text-secondary);
        }
        
        .metadata-expanded {
          margin-top: 0.5rem;
          padding: 0.5rem;
          background: var(--bg-tertiary);
          border-radius: 0.375rem;
          font-size: 0.75rem;
        }
        
        .metadata-row {
          display: flex;
          justify-content: space-between;
          padding: 0.25rem 0;
        }
        
        .metadata-label {
          color: var(--text-secondary);
        }
        
        .metadata-value {
          color: var(--text-primary);
          font-weight: 500;
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
