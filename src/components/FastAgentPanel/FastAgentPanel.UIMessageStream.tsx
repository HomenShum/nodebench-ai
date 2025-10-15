// src/components/FastAgentPanel/FastAgentPanel.UIMessageStream.tsx
// Scrollable message container for UIMessages from Agent component

import React, { useEffect, useRef } from 'react';
import { UIMessageBubble } from './FastAgentPanel.UIMessageBubble';
import type { UIMessage } from '@convex-dev/agent/react';

interface UIMessageStreamProps {
  messages: UIMessage[];
  autoScroll?: boolean;
}

/**
 * UIMessageStream - Scrollable container for UIMessages with auto-scroll
 * Optimized for the Agent component's UIMessage format
 */
export function UIMessageStream({
  messages,
  autoScroll = true,
}: UIMessageStreamProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom when new messages arrive or content updates
  useEffect(() => {
    if (!autoScroll) return;
    
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, autoScroll]);
  
  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto p-6"
      style={{ maxHeight: '100%' }}
    >
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full text-gray-500">
          <p>No messages yet. Start a conversation!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {messages.map((message) => (
            <UIMessageBubble
              key={message.key || message._id}
              message={message}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>
      )}
    </div>
  );
}

