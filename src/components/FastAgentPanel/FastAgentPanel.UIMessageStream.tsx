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
  _id?: string;
  metadata?: {
    agentRole?: 'coordinator' | 'documentAgent' | 'mediaAgent' | 'secAgent' | 'webAgent';
    parentMessageId?: string;
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

  // Filter out empty messages and agent-generated sub-query messages before processing
  const filteredMessages = useMemo(() => {
    // First pass: identify delegation patterns
    const delegationIndices = new Set<number>();

    messages.forEach((msg, idx) => {
      // Check if this message has delegation tool calls
      const hasDelegationTools = msg.parts?.some((p: any) =>
        p.type === 'tool-call' && p.toolName?.startsWith('delegateTo')
      );

      if (hasDelegationTools) {
        // Mark the next user messages as agent-generated sub-queries
        // These are created by specialized agents when they call generateText()
        for (let i = idx + 1; i < messages.length; i++) {
          const nextMsg = messages[i];

          // Stop when we hit an assistant message (the response to the delegation)
          if (nextMsg.role === 'assistant') break;

          // Mark user messages between delegation and response as agent-generated
          if (nextMsg.role === 'user') {
            delegationIndices.add(i);
          }
        }
      }
    });

    return messages.filter((msg, idx) => {
      // Filter out ONLY agent-generated sub-query messages (between delegation and response)
      if (delegationIndices.has(idx)) {
        console.log('[UIMessageStream] Filtering agent-generated sub-query:', msg.text?.substring(0, 50));
        return false;
      }

      // CRITICAL: Always keep real user messages (actual user input)
      if (msg.role === 'user') {
        console.log('[UIMessageStream] Keeping user message:', msg.text?.substring(0, 50));
        return true;
      }

      // For assistant messages, be lenient - keep if has ANY content
      if (msg.role === 'assistant') {
        const hasText = msg.text && msg.text.trim().length > 0;
        const hasParts = msg.parts && msg.parts.length > 0;
        const hasToolCalls = msg.parts?.some(p => p.type.startsWith('tool-'));
        
        // Keep if has text, parts, or tool calls
        const keep = hasText || hasParts || hasToolCalls;
        if (!keep) {
          console.log('[UIMessageStream] Filtering empty assistant message');
        }
        return keep;
      }

      // Keep all other message types (system, etc.)
      return true;
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
            let agentRole: 'coordinator' | 'documentAgent' | 'mediaAgent' | 'secAgent' | 'webAgent' | undefined = undefined;
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
  }, [filteredMessages]);

  // Debug: Log grouped messages
  console.log('[UIMessageStream] Grouped messages:', {
    total: messages.length,
    filtered: filteredMessages.length,
    grouped: groupedMessages.length,
  });

  // Deduplication: Track seen content to avoid rendering duplicates
  const seenContent = useMemo(() => new Set<string>(), []);

  const isDuplicate = (message: ExtendedUIMessage): boolean => {
    // DISABLED: Deduplication was too aggressive and causing messages to disappear
    // TODO: Implement smarter deduplication based on message IDs
    return false;
    
    /*
    // Create content hash from tool calls and text
    const toolNames = message.parts
      .filter(p => p.type.startsWith('tool-'))
      .map((p: any) => p.toolName)
      .join(',');
    const textPreview = (message.text || '').slice(0, 100);
    const contentHash = `${toolNames}-${textPreview}`;

    if (seenContent.has(contentHash) && contentHash.length > 5) {
      console.log('[UIMessageStream] Duplicate detected:', contentHash);
      return true;
    }
    seenContent.add(contentHash);
    return false;
    */
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
          {groupedMessages.length === 0 && (
            <div className="text-gray-500 text-center p-4">
              No messages to display. Check console for filtering details.
            </div>
          )}
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

