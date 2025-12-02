// src/components/FastAgentPanel/FastAgentPanel.UIMessageStream.tsx
// Scrollable message container for UIMessages from Agent component
// Supports hierarchical rendering for coordinator/specialized agent delegation

import React, { useEffect, useRef, useMemo, useTransition, useDeferredValue } from 'react';
import { UIMessageBubble } from './FastAgentPanel.UIMessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { useSmartAutoScroll } from './hooks/useSmartAutoScroll';
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
  onDeleteMessage?: (messageId: string) => void;
  onCompanySelect?: (company: CompanyOption) => void;
  onPersonSelect?: (person: PersonOption) => void;
  onEventSelect?: (event: EventOption) => void;
  onNewsSelect?: (article: NewsArticleOption) => void;
  onDocumentSelect?: (documentId: string) => void;
}

// Extended UIMessage type with hierarchical metadata
interface ExtendedUIMessage extends UIMessage {
  id?: string;
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
  onDocumentSelect,
}: UIMessageStreamProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [_isPending, startTransition] = useTransition();

  // Use smart auto-scroll that respects user scroll position
  const { autoScroll: smartAutoScroll, reset: resetScroll } = useSmartAutoScroll(
    scrollRef as React.RefObject<HTMLDivElement>,
    { nearBottomThreshold: 80, enableLogging: false }
  );

  // Defer heavy message filtering/grouping to prevent blocking UI
  const deferredMessages = useDeferredValue(messages);

  // Smart auto-scroll when new messages arrive
  useEffect(() => {
    if (!autoScroll) return;
    smartAutoScroll();
  }, [messages.length, autoScroll, smartAutoScroll]);

  // Reset scroll state when starting new conversation
  useEffect(() => {
    resetScroll();
  }, [resetScroll]);

  // Filter out empty messages and agent-generated sub-query messages before processing
  // Use deferredMessages to prevent blocking UI during heavy filtering
  const filteredMessages = useMemo(() => {
    console.log('[UIMessageStream] 📥 Input messages:', deferredMessages.length);

    // First pass: identify delegation patterns
    const delegationIndices = new Set<number>();

    deferredMessages.forEach((msg, idx) => {
      // Check if this message has delegation tool calls
      const hasDelegationTools = msg.parts?.some((p: any) =>
        p.type === 'tool-call' && p.toolName?.startsWith('delegateTo')
      );

      if (hasDelegationTools) {
        // Mark the next user messages as agent-generated sub-queries
        // These are created by specialized agents when they call generateText()
        for (let i = idx + 1; i < deferredMessages.length; i++) {
          const nextMsg = deferredMessages[i];

          // Stop when we hit an assistant message (the response to the delegation)
          if (nextMsg.role === 'assistant') break;

          // Mark user messages between delegation and response as agent-generated
          if (nextMsg.role === 'user') {
            delegationIndices.add(i);
          }
        }
      }
    });

    const result = deferredMessages.filter((msg, idx) => {
      // Filter out ONLY agent-generated sub-query messages (between delegation and response)
      if (delegationIndices.has(idx)) {
        console.log('[UIMessageStream] ❌ Filtering agent-generated sub-query:', msg.text?.substring(0, 50));
        return false;
      }

      // CRITICAL: Always keep real user messages (actual user input)
      if (msg.role === 'user') {
        console.log('[UIMessageStream] ✅ Keeping user message:', msg.text?.substring(0, 50));
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
          console.log('[UIMessageStream] ❌ Filtering empty assistant message');
        } else {
          console.log('[UIMessageStream] ✅ Keeping assistant message (hasText:', hasText, 'hasParts:', hasParts, 'hasToolCalls:', hasToolCalls, ')');
        }
        return keep;
      }

      // Keep all other message types (system, etc.)
      console.log('[UIMessageStream] ✅ Keeping other message type:', msg.role);
      return true;
    });

    console.log('[UIMessageStream] 📤 Filtered messages:', result.length);
    return result;
  }, [deferredMessages]);

  // Infer hierarchy from tool calls (Option 3 approach)
  // When a coordinator message has delegation tool calls, the next N messages are likely children
  const groupedMessages = useMemo(() => {
    console.log('[UIMessageStream] 🔄 Grouping', filteredMessages.length, 'filtered messages');
    const extendedMessages = filteredMessages as ExtendedUIMessage[];
    const groups: MessageGroup[] = [];
    const processedIndices = new Set<number>();
    const seenMessageIds = new Set<string>(); // Track message IDs to prevent duplicates

    extendedMessages.forEach((msg, idx) => {
      // Skip if already processed as a child
      if (processedIndices.has(idx)) return;

      // Skip if we've already seen this message ID
      const messageId = msg._id || msg.key;
      if (messageId && seenMessageIds.has(messageId)) {
        console.log('[UIMessageStream] ⚠️ DUPLICATE DETECTED - Skipping duplicate message:', messageId, 'role:', msg.role, 'text:', msg.text?.substring(0, 50));
        return;
      }
      if (messageId) {
        console.log('[UIMessageStream] ✅ Adding message to seen set:', messageId, 'role:', msg.role, 'text:', msg.text?.substring(0, 50));
        seenMessageIds.add(messageId);
      } else {
        console.log('[UIMessageStream] ⚠️ Message has no ID:', 'role:', msg.role, 'text:', msg.text?.substring(0, 50));
      }

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
            // Skip if we've already seen this child message
            const childId = nextMsg._id || nextMsg.key;
            if (childId && seenMessageIds.has(childId)) {
              console.log('[UIMessageStream] ⚠️ Skipping duplicate child message:', childId, nextMsg.text?.substring(0, 50));
              processedIndices.add(i);
              childrenFound++;
              continue;
            }
            if (childId) {
              seenMessageIds.add(childId);
            }

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

    console.log('[UIMessageStream] 📊 Grouped messages:', groups.length, 'groups');
    return groups;
  }, [filteredMessages]);

  // Debug: Log grouped messages
  console.log('[UIMessageStream] 📊 Pipeline summary:', {
    total: messages.length,
    filtered: filteredMessages.length,
    grouped: groupedMessages.length,
  });

  // Deduplication: Check if a message appears in a previous group
  const isDuplicate = (message: ExtendedUIMessage, currentGroupIndex: number): boolean => {
    // Check if this message appears in a previous group
    const messageId = message._id || message.key;
    if (!messageId) return false;

    // Check if this message ID appears in any earlier group
    for (let i = 0; i < currentGroupIndex; i++) {
      const group = groupedMessages[i];
      const parentId = group.parent._id || group.parent.key;
      if (parentId === messageId) {
        console.log('[UIMessageStream] ⚠️ Duplicate parent message detected:', messageId, message.text?.substring(0, 50));
        return true;
      }

      const childMatch = group.children.some(child => {
        const childId = child._id || child.key;
        return childId === messageId;
      });
      if (childMatch) {
        console.log('[UIMessageStream] ⚠️ Duplicate child message detected:', messageId, message.text?.substring(0, 50));
        return true;
      }
    }

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
      ) : groupedMessages.length === 0 ? (
        <div className="text-gray-500 text-center p-4">
          <p>No messages to display. Check console for filtering details.</p>
          <p className="text-xs mt-2">Raw messages: {messages.length}, Filtered: {filteredMessages.length}, Grouped: {groupedMessages.length}</p>
          <details className="text-xs mt-4 text-left">
            <summary>Debug Info</summary>
            <pre className="bg-gray-100 p-2 rounded mt-2 overflow-auto max-h-40 text-xs">
              {JSON.stringify({
                messagesCount: messages.length,
                filteredCount: filteredMessages.length,
                groupedCount: groupedMessages.length,
                firstMessage: messages[0] ? { role: messages[0].role, text: messages[0].text?.substring(0, 50) } : null,
              }, null, 2)}
            </pre>
          </details>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {groupedMessages.map((group, groupIdx) => {
            const isParent = group.children.length > 0;
            const parentDuplicate = isDuplicate(group.parent, groupIdx);

            return (
              <div key={group.parent.key || group.parent._id} className="message-group">
                {/* Render parent message (user or coordinator) */}
                {!parentDuplicate && (
                  <UIMessageBubble
                    message={group.parent}
                    onMermaidRetry={onMermaidRetry}
                    onRegenerateMessage={onRegenerateMessage ? () => onRegenerateMessage(group.parent.key) : undefined}
                    onDeleteMessage={
                      onDeleteMessage && group.parent.id
                        ? () => onDeleteMessage(group.parent.id)
                        : undefined
                    }
                    onCompanySelect={onCompanySelect}
                    onPersonSelect={onPersonSelect}
                    onEventSelect={onEventSelect}
                    onNewsSelect={onNewsSelect}
                    onDocumentSelect={onDocumentSelect}
                    isParent={isParent}
                    agentRole={group.parent.metadata?.agentRole}
                  />
                )}

                {/* Render child messages (specialized agents) with indentation */}
                {group.children.length > 0 && (
                  <div className="ml-8 border-l-2 border-purple-200 pl-4 space-y-3 mt-2">
                    {group.children.map((child) => {
                      const childDuplicate = isDuplicate(child, groupIdx);
                      if (childDuplicate) return null;

                      return (
                        <UIMessageBubble
                          key={child.key || child._id}
                          message={child}
                          onMermaidRetry={onMermaidRetry}
                          onRegenerateMessage={onRegenerateMessage ? () => onRegenerateMessage(child.key) : undefined}
                          onDeleteMessage={
                            onDeleteMessage && child.id
                              ? () => onDeleteMessage(child.id)
                              : undefined
                          }
                          onCompanySelect={onCompanySelect}
                          onPersonSelect={onPersonSelect}
                          onEventSelect={onEventSelect}
                          onNewsSelect={onNewsSelect}
                          onDocumentSelect={onDocumentSelect}
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

          {/* Scroll anchor for smooth scroll anchoring */}
          <div ref={messagesEndRef} className="h-0" />

          {/* Show typing indicator ONLY when:
              1. Last message is user and no assistant response yet (agent intercepting)
              2. Last message is streaming assistant with NO parts/tools yet (truly empty)

              NOTE: If streaming message has ANY parts (tool calls, reasoning), render the message bubble
              so user can see agent progress in real-time
          */}
          {(() => {
            const lastMessage = filteredMessages[filteredMessages.length - 1];

            // Helper function to extract intent from user query
            const extractIntent = (query: string): string => {
              const lowerQuery = query.toLowerCase().trim();

              // Multi-entity research patterns
              if (lowerQuery.includes('compile information') || lowerQuery.includes('research')) {
                // Extract entities mentioned
                const entities: string[] = [];

                // Company/product patterns
                const companyMatch = lowerQuery.match(/(?:about|on|for)\s+([a-z0-9.-]+(?:\.[a-z]{2,})?)/i);
                if (companyMatch) entities.push(companyMatch[1]);

                // Person patterns
                const personMatch = lowerQuery.match(/([A-Z][a-z]+\s+[A-Z][a-z]+)(?:\s+(?:the\s+)?founder)?/);
                if (personMatch) entities.push(personMatch[1]);

                if (entities.length > 0) {
                  return `researching ${entities.join(', ')}`;
                }
                return 'compiling research';
              }

              // Search patterns
              if (lowerQuery.startsWith('search') || lowerQuery.startsWith('find')) {
                const searchMatch = lowerQuery.match(/(?:search|find)\s+(?:for\s+)?(?:me\s+)?(.+)/i);
                if (searchMatch) {
                  const subject = searchMatch[1].substring(0, 40);
                  return `searching for ${subject}`;
                }
                return 'searching';
              }

              // Image/video patterns
              if (lowerQuery.includes('images') || lowerQuery.includes('pictures') || lowerQuery.includes('photos')) {
                return 'finding images';
              }
              if (lowerQuery.includes('videos')) {
                return 'finding videos';
              }

              // Document patterns
              if (lowerQuery.includes('document') || lowerQuery.includes('file')) {
                return 'finding documents';
              }

              // SEC filing patterns
              if (lowerQuery.includes('10-k') || lowerQuery.includes('10-q') || lowerQuery.includes('sec filing')) {
                return 'finding SEC filings';
              }

              // News patterns
              if (lowerQuery.includes('news')) {
                return 'finding news';
              }

              // Default: use first few words
              const words = query.split(' ').slice(0, 5).join(' ');
              return words.length > 40 ? words.substring(0, 40) + '...' : words;
            };

            // Case 1: User message with no assistant response yet (agent intercepting)
            if (lastMessage && lastMessage.role === 'user') {
              // Check if there's an assistant message after this user message
              const hasResponse = filteredMessages.some((msg, idx) => {
                const lastIdx = filteredMessages.findIndex(m =>
                  m.key === lastMessage.key || (m as ExtendedUIMessage)._id === (lastMessage as ExtendedUIMessage)._id
                );
                return idx > lastIdx && msg.role === 'assistant';
              });

              if (!hasResponse) {
                const intent = lastMessage.text ? extractIntent(lastMessage.text) : 'your request';
                return <TypingIndicator message={`Helping you with ${intent}...`} />;
              }
            }

            // Case 2: Streaming assistant message with NO parts/tools yet (truly empty)
            // If it has parts (tool calls, reasoning), the message bubble will show them
            if (lastMessage &&
                lastMessage.role === 'assistant' &&
                lastMessage.status === 'streaming' &&
                (!lastMessage.text || lastMessage.text.trim().length === 0) &&
                (!lastMessage.parts || lastMessage.parts.length === 0)) {

              // Find the most recent user message to extract intent
              const recentUserMessage = [...filteredMessages].reverse().find(msg => msg.role === 'user');
              const intent = recentUserMessage?.text ? extractIntent(recentUserMessage.text) : 'your request';

              return <TypingIndicator message={`Helping you with ${intent}...`} />;
            }

            return null;
          })()}

          <div ref={messagesEndRef} />
        </div>
      )}
    </div>
  );
}
