// src/components/FastAgentPanel/FastAgentPanel.UIMessageStream.tsx
// Scrollable message container for UIMessages from Agent component
// Supports hierarchical rendering for coordinator/specialized agent delegation

import React, { useEffect, useRef, useMemo } from 'react';
import { UIMessageBubble } from './FastAgentPanel.UIMessageBubble';
import { TypingIndicator } from './TypingIndicator';
import type { UIMessage } from '@convex-dev/agent/react';
import type { CompanyOption } from './CompanySelectionCard';
import type { PersonOption } from './PeopleSelectionCard';
import type { EventOption } from './EventSelectionCard';
import type { NewsArticleOption } from './NewsSelectionCard';

interface UIMessageStreamProps {
  messages: UIMessage[];
  autoScroll?: boolean;
  onMermaidRetry?: (error: string, code: string) => void;
  onRegenerateMessage?: (messageKey: string) => void;
  onDeleteMessage?: (messageKey: string) => void;
  onCompanySelect?: (company: CompanyOption) => void;
  onPersonSelect?: (person: PersonOption) => void;
  onEventSelect?: (event: EventOption) => void;
  onNewsSelect?: (article: NewsArticleOption) => void;
}

// Extended UIMessage type with hierarchical metadata
interface ExtendedUIMessage extends UIMessage {
  metadata?: {
    agentRole?: 'coordinator' | 'documentAgent' | 'mediaAgent' | 'secAgent' | 'webAgent';
    parentMessageId?: string;
    [key: string]: any;
  };
}

// Message group structure for hierarchical rendering
interface MessageGroup {
  parent: ExtendedUIMessage;
  children: ExtendedUIMessage[];
}

/**
 * UIMessageStream - Scrollable container for UIMessages with auto-scroll
 * Optimized for the Agent component's UIMessage format
 * Supports hierarchical rendering for coordinator agent delegation
 */
export function UIMessageStream({
  messages,
  autoScroll = true,
  onMermaidRetry,
  onRegenerateMessage,
  onDeleteMessage,
  onCompanySelect,
  onPersonSelect,
  onEventSelect,
  onNewsSelect,
}: UIMessageStreamProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive or content updates
  useEffect(() => {
    if (!autoScroll) return;

    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, autoScroll]);

  // Filter out empty messages before processing
  const filteredMessages = useMemo(() => {
    return messages.filter(msg => {
      // Keep user messages always
      if (msg.role === 'user') return true;

      // For assistant messages, check if they have meaningful content
      const hasText = msg.text && msg.text.trim().length > 0;
      const hasParts = msg.parts && msg.parts.length > 0;

      // Keep if has text or parts (tool calls, reasoning, etc.)
      return hasText || hasParts;
    });
  }, [messages]);

  // Infer hierarchy from tool calls (Option 3 approach)
  // When a coordinator message has delegation tool calls, the next N messages are likely children
  const groupedMessages = useMemo(() => {
    const extendedMessages = filteredMessages as ExtendedUIMessage[];
    const groups: MessageGroup[] = [];
    const processedIndices = new Set<number>();

    extendedMessages.forEach((msg, idx) => {
      // Skip if already processed as a child
      if (processedIndices.has(idx)) return;

      // Check if this message has delegation tool calls
      const delegationToolCalls = msg.parts?.filter((p: any) =>
        p.type === 'tool-call' &&
        p.toolName?.startsWith('delegateTo')
      ) || [];

      if (delegationToolCalls.length > 0) {
        // This is a coordinator message with delegations
        const children: ExtendedUIMessage[] = [];

        // Collect the next N assistant messages as children (where N = number of delegation calls)
        let childrenFound = 0;
        for (let i = idx + 1; i < extendedMessages.length && childrenFound < delegationToolCalls.length; i++) {
          const nextMsg = extendedMessages[i];

          // Only include assistant messages (not user messages)
          if (nextMsg.role === 'assistant') {
            // Infer agent role from the corresponding delegation tool call
            const delegationTool = delegationToolCalls[childrenFound];
            const toolName = (delegationTool as any).toolName || '';

            // Map delegation tool name to agent role
            let agentRole: ExtendedUIMessage['metadata']['agentRole'] = undefined;
            if (toolName === 'delegateToDocumentAgent') agentRole = 'documentAgent';
            else if (toolName === 'delegateToMediaAgent') agentRole = 'mediaAgent';
            else if (toolName === 'delegateToSECAgent') agentRole = 'secAgent';
            else if (toolName === 'delegateToWebAgent') agentRole = 'webAgent';

            // Add inferred metadata to the child message
            const childWithMetadata: ExtendedUIMessage = {
              ...nextMsg,
              metadata: {
                ...nextMsg.metadata,
                agentRole,
                parentMessageId: msg._id,
              },
            };

            children.push(childWithMetadata);
            processedIndices.add(i);
            childrenFound++;
          }
        }

        // Mark the parent message as coordinator
        const parentWithMetadata: ExtendedUIMessage = {
          ...msg,
          metadata: {
            ...msg.metadata,
            agentRole: 'coordinator',
          },
        };

        groups.push({ parent: parentWithMetadata, children });
      } else {
        // Regular message without delegations
        groups.push({ parent: msg, children: [] });
      }
    });

    return groups;
  }, [messages]);

  // Deduplication: Track seen content to avoid rendering duplicates
  const seenContent = useMemo(() => new Set<string>(), [messages]);

  const isDuplicate = (message: ExtendedUIMessage): boolean => {
    // Create content hash from tool calls and text
    const toolNames = message.parts
      .filter(p => p.type.startsWith('tool-'))
      .map((p: any) => p.toolName)
      .join(',');
    const textPreview = message.text.slice(0, 100);
    const contentHash = `${toolNames}-${textPreview}`;

    if (seenContent.has(contentHash) && contentHash.length > 5) {
      return true;
    }
    seenContent.add(contentHash);
    return false;
  };

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
          {groupedMessages.map((group, groupIdx) => {
            const isParent = group.children.length > 0;
            const parentDuplicate = isDuplicate(group.parent);

            return (
              <div key={group.parent.key || group.parent._id} className="message-group">
                {/* Render parent message (user or coordinator) */}
                {!parentDuplicate && (
                  <UIMessageBubble
                    message={group.parent}
                    onMermaidRetry={onMermaidRetry}
                    onRegenerateMessage={onRegenerateMessage ? () => onRegenerateMessage(group.parent.key) : undefined}
                    onDeleteMessage={onDeleteMessage ? () => onDeleteMessage(group.parent.key) : undefined}
                    onCompanySelect={onCompanySelect}
                    onPersonSelect={onPersonSelect}
                    onEventSelect={onEventSelect}
                    onNewsSelect={onNewsSelect}
                    isParent={isParent}
                    agentRole={group.parent.metadata?.agentRole}
                  />
                )}

                {/* Render child messages (specialized agents) with indentation */}
                {group.children.length > 0 && (
                  <div className="ml-8 border-l-2 border-purple-200 pl-4 space-y-3 mt-2">
                    {group.children.map((child) => {
                      const childDuplicate = isDuplicate(child);
                      if (childDuplicate) return null;

                      return (
                        <UIMessageBubble
                          key={child.key || child._id}
                          message={child}
                          onMermaidRetry={onMermaidRetry}
                          onRegenerateMessage={onRegenerateMessage ? () => onRegenerateMessage(child.key) : undefined}
                          onDeleteMessage={onDeleteMessage ? () => onDeleteMessage(child.key) : undefined}
                          onCompanySelect={onCompanySelect}
                          onPersonSelect={onPersonSelect}
                          onEventSelect={onEventSelect}
                          onNewsSelect={onNewsSelect}
                          isChild={true}
                          agentRole={child.metadata?.agentRole}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Show typing indicator if last message is streaming and has no text yet */}
          {(() => {
            const lastMessage = filteredMessages[filteredMessages.length - 1];
            if (lastMessage &&
                lastMessage.role === 'assistant' &&
                lastMessage.status === 'streaming' &&
                (!lastMessage.text || lastMessage.text.trim().length === 0) &&
                (!lastMessage.parts || lastMessage.parts.length === 0)) {
              return <TypingIndicator message="Thinking..." />;
            }
            return null;
          })()}

          <div ref={messagesEndRef} />
        </div>
      )}
    </div>
  );
}

