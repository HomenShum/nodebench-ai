// src/components/FastAgentPanel/FastAgentPanel.MessageStream.tsx
// Scrollable message container with auto-scroll

import React, { useEffect, useRef } from 'react';
import { MessageBubble } from './FastAgentPanel.MessageBubble';
import type { Message, ThinkingStep, ToolCall, Source } from './types';

interface MessageStreamProps {
  messages: Message[];
  isStreaming?: boolean;
  streamingMessageId?: string;
  liveThinking?: ThinkingStep[];
  liveToolCalls?: ToolCall[];
  liveSources?: Source[];
  liveTokens?: string;
  autoScroll?: boolean;
}

/**
 * MessageStream - Scrollable container for messages with auto-scroll
 */
export function MessageStream({
  messages,
  isStreaming = false,
  streamingMessageId,
  liveThinking = [],
  liveToolCalls = [],
  liveSources = [],
  liveTokens = "",
  autoScroll = true,
}: MessageStreamProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const userHasScrolledRef = useRef(false);
  
  // Auto-scroll to bottom when new messages arrive or streaming updates
  useEffect(() => {
    if (!autoScroll || userHasScrolledRef.current) return;
    
    if (lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages.length, isStreaming, liveThinking, liveToolCalls, liveSources, autoScroll]);
  
  // Detect user scroll
  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;
    
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 100;
      userHasScrolledRef.current = !isAtBottom;
    };
    
    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Reset scroll detection when streaming starts
  useEffect(() => {
    if (isStreaming) {
      userHasScrolledRef.current = false;
    }
  }, [isStreaming]);
  
  if (messages.length === 0) {
    return (
      <div className="message-stream-empty">
        <div className="empty-state">
          <div className="empty-icon">Chat</div>
          <h3 className="empty-title">Start a conversation</h3>
          <p className="empty-description">
            Ask me anything! I can help with research, writing, coding, and more.
          </p>
        </div>
        
        <style>{`
          .message-stream-empty {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
          }
          
          .empty-state {
            text-align: center;
            max-width: 400px;
          }
          
          .empty-icon {
            font-size: 2.5rem;
            margin-bottom: 1rem;
          }
          
          .empty-title {
            font-size: 1.5rem;
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: 0.5rem;
          }
          
          .empty-description {
            font-size: 0.9375rem;
            color: var(--text-secondary);
            line-height: 1.6;
          }
        `}</style>
      </div>
    );
  }
  
  return (
    <div ref={scrollRef} className="message-stream">
      <div className="message-stream-content">
        {messages.map((message, index) => {
          const isLastMessage = index === messages.length - 1; // Last message is newest (at bottom)
          const isStreamingThisMessage = isStreaming && message.id === streamingMessageId;
          
          return (
            <div
              key={message.id}
              ref={isLastMessage ? lastMessageRef : undefined}
            >
              <MessageBubble
                message={{ ...message, content: isStreamingThisMessage ? `${message.content || ''}${liveTokens}` : message.content }}
                isStreaming={isStreamingThisMessage}
                liveThinking={isStreamingThisMessage ? liveThinking : message.thinkingSteps}
                liveToolCalls={isStreamingThisMessage ? liveToolCalls : message.toolCalls}
                liveSources={isStreamingThisMessage ? liveSources : message.sources}
              />
            </div>
          );
        })}
      </div>
      
        <style>{`
          .message-stream {
            flex: 1;
            overflow-y: auto;
            overflow-x: hidden;
            scroll-behavior: smooth;
        }
        
        .message-stream-content {
          padding: 1.5rem;
          max-width: 900px;
          margin: 0 auto;
        }
        
        /* Custom scrollbar */
        .message-stream::-webkit-scrollbar {
          width: 8px;
        }
        
        .message-stream::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .message-stream::-webkit-scrollbar-thumb {
          background: var(--border-color);
          border-radius: 4px;
        }
        
        .message-stream::-webkit-scrollbar-thumb:hover {
          background: var(--text-secondary);
        }
      `}</style>
    </div>
  );
}
