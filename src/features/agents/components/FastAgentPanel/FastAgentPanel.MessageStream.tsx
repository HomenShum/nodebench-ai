// src/components/FastAgentPanel/FastAgentPanel.MessageStream.tsx
// Scrollable message container with auto-scroll and follow-up suggestions

import React, { useEffect, useRef, useMemo } from 'react';
import { MessageBubble } from './FastAgentPanel.MessageBubble';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
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
  onSendFollowUp?: (text: string) => void;
}

// ============================================================================
// Follow-up suggestion generation (deterministic, keyword-based)
// ============================================================================

function generateFollowUps(lastAssistantContent: string, lastUserContent: string): string[] {
  const suggestions: string[] = [];
  const content = (lastAssistantContent || '').toLowerCase();
  const query = (lastUserContent || '').toLowerCase();

  // Topic-based suggestions
  if (content.includes('revenue') || content.includes('earnings') || content.includes('financial')) {
    suggestions.push('Compare this with competitors');
    suggestions.push('Show quarterly trend');
  } else if (content.includes('market cap') || content.includes('stock') || content.includes('valuation')) {
    suggestions.push('What drives this valuation?');
    suggestions.push('Historical price comparison');
  } else if (content.includes('fda') || content.includes('clinical') || content.includes('trial')) {
    suggestions.push('What are the next milestones?');
    suggestions.push('Compare with similar approvals');
  } else if (content.includes('agent') || content.includes('tool') || content.includes('search')) {
    suggestions.push('Run a deeper analysis');
    suggestions.push('Summarize the key findings');
  }

  // Generic follow-ups if we don't have enough
  if (suggestions.length < 2) {
    suggestions.push('Tell me more');
    suggestions.push('Summarize the key points');
  }

  // Always offer "explain" if the response is long
  if (content.length > 1500 && suggestions.length < 3) {
    suggestions.push('Explain in simpler terms');
  }

  return suggestions.slice(0, 3);
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
  onSendFollowUp,
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

  // Generate follow-up suggestions based on the last exchange
  const followUps = useMemo(() => {
    if (isStreaming || messages.length < 2) return [];
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.role !== 'assistant' || !lastMsg.content) return [];
    // Find the last user message
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    return generateFollowUps(
      String(lastMsg.content || ''),
      String(lastUserMsg?.content || '')
    );
  }, [messages, isStreaming]);
  
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1.5">Start a conversation</h3>
          <p className="text-sm text-[var(--text-muted)] leading-relaxed">
            Ask me anything! I can help with research, writing, coding, and more.
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[var(--border-color)] [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[var(--text-muted)]"
    >
      <div className="px-4 py-5 max-w-[900px] mx-auto">
        {messages.map((message, index) => {
          const isLastMessage = index === messages.length - 1;
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

        {/* Follow-up suggestions (ChatGPT pattern) */}
        {followUps.length > 0 && onSendFollowUp && (
          <div className="flex flex-wrap gap-2 mt-1 mb-4 pl-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {followUps.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => onSendFollowUp(suggestion)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full",
                  "text-xs font-medium text-[var(--text-secondary)]",
                  "bg-[var(--bg-secondary)] border border-[var(--border-color)]",
                  "hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)]",
                  "transition-all duration-150 cursor-pointer"
                )}
              >
                {suggestion}
                <ArrowRight className="w-3 h-3" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
