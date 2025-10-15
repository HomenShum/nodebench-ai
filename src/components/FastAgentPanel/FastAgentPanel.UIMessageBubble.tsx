// src/components/FastAgentPanel/FastAgentPanel.UIMessageBubble.tsx
// Message bubble component optimized for UIMessage format from Agent component

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { User, Bot } from 'lucide-react';
import { useSmoothText, type UIMessage } from '@convex-dev/agent/react';
import { cn } from '@/lib/utils';

interface UIMessageBubbleProps {
  message: UIMessage;
}

/**
 * UIMessageBubble - Renders a UIMessage with smooth streaming animation
 * This component is optimized for the Agent component's UIMessage format
 */
export function UIMessageBubble({ message }: UIMessageBubbleProps) {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  
  // Use smooth text streaming - this is the key to smooth animation!
  const [visibleText] = useSmoothText(message.text, {
    // Only start streaming if the message status is "streaming"
    // This prevents completed messages from re-streaming
    startStreaming: message.status === 'streaming',
  });

  // For streaming messages, use the smoothed text
  // For completed messages, use the full text immediately
  const displayText = message.status === 'streaming' ? visibleText : message.text;

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
            {new Date(message._creationTime).toLocaleTimeString()}
          </span>
          {message.status === 'streaming' && (
            <span className="streaming-indicator">
              <span className="streaming-dot"></span>
              Streaming...
            </span>
          )}
        </div>

        {/* Message body with markdown */}
        <div className={cn(
          "message-body",
          message.status === 'streaming' && "streaming-message",
          message.status === 'failed' && "failed-message"
        )}>
          <ReactMarkdown
            components={{
              code({ node, inline, className, children, ...props }: any) {
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
            {displayText || '...'}
          </ReactMarkdown>
        </div>

        {/* Tool calls if any */}
        {message.parts && message.parts.length > 0 && (
          <div className="message-tools">
            {message.parts
              .filter((p) => p.type.startsWith('tool-'))
              .map((part: any, idx: number) => (
                <div key={idx} className="tool-call">
                  <span className="tool-name">{part.type.replace('tool-', '')}</span>
                  {part.output && (
                    <span className="tool-output">
                      {typeof part.output === 'string' 
                        ? part.output 
                        : JSON.stringify(part.output)}
                    </span>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

