/**
 * MessageHandlersContext
 * Provides stable callback references for message handlers to prevent re-renders
 *
 * Problem: Passing callback props like onCompanySelect creates new function refs on every render,
 * breaking React.memo optimization on child components.
 *
 * Solution: Use context with memoized callbacks to provide stable references.
 */

import React, { createContext, useContext, useMemo, useRef, useCallback } from 'react';
import type { CompanyOption } from './CompanySelectionCard';
import type { PersonOption } from './PeopleSelectionCard';
import type { EventOption } from './EventSelectionCard';
import type { NewsArticleOption } from './NewsSelectionCard';

export interface MessageHandlers {
  onCompanySelect: (company: CompanyOption) => void;
  onPersonSelect: (person: PersonOption) => void;
  onEventSelect: (event: EventOption) => void;
  onNewsSelect: (article: NewsArticleOption) => void;
  onDocumentSelect: (documentId: string) => void;
  onRegenerateMessage: (messageKey: string) => void;
  onDeleteMessage: (messageId: string) => void;
}

// Default no-op handlers
const defaultHandlers: MessageHandlers = {
  onCompanySelect: () => {},
  onPersonSelect: () => {},
  onEventSelect: () => {},
  onNewsSelect: () => {},
  onDocumentSelect: () => {},
  onRegenerateMessage: () => {},
  onDeleteMessage: () => {},
};

const MessageHandlersContext = createContext<MessageHandlers>(defaultHandlers);

export function useMessageHandlers(): MessageHandlers {
  return useContext(MessageHandlersContext);
}

interface MessageHandlersProviderProps {
  children: React.ReactNode;
  handlers: {
    onCompanySelect?: (company: CompanyOption) => void;
    onPersonSelect?: (person: PersonOption) => void;
    onEventSelect?: (event: EventOption) => void;
    onNewsSelect?: (article: NewsArticleOption) => void;
    onDocumentSelect?: (documentId: string) => void;
    onRegenerateMessage?: (messageKey: string) => void;
    onDeleteMessage?: (messageId: string) => void;
  };
}

/**
 * Provider component that creates stable callback references using refs
 * Handlers can change without causing re-renders of consumers
 */
export function MessageHandlersProvider({ children, handlers }: MessageHandlersProviderProps) {
  // Store latest handlers in refs to avoid dependency changes
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  // Create stable callbacks that use refs internally
  const stableHandlers = useMemo<MessageHandlers>(() => ({
    onCompanySelect: (company: CompanyOption) => {
      handlersRef.current.onCompanySelect?.(company);
    },
    onPersonSelect: (person: PersonOption) => {
      handlersRef.current.onPersonSelect?.(person);
    },
    onEventSelect: (event: EventOption) => {
      handlersRef.current.onEventSelect?.(event);
    },
    onNewsSelect: (article: NewsArticleOption) => {
      handlersRef.current.onNewsSelect?.(article);
    },
    onDocumentSelect: (documentId: string) => {
      handlersRef.current.onDocumentSelect?.(documentId);
    },
    onRegenerateMessage: (messageKey: string) => {
      handlersRef.current.onRegenerateMessage?.(messageKey);
    },
    onDeleteMessage: (messageId: string) => {
      handlersRef.current.onDeleteMessage?.(messageId);
    },
  }), []); // Empty deps = stable references

  return (
    <MessageHandlersContext.Provider value={stableHandlers}>
      {children}
    </MessageHandlersContext.Provider>
  );
}

export default MessageHandlersContext;
