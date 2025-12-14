/**
 * FastAgentContext - Global context for controlling Fast Agent panel
 *
 * Allows any component to open/close the Fast Agent panel and
 * inject content for analysis. Supports contextual opening with:
 * - Initial message (pre-filled prompt)
 * - Context document IDs (documents to analyze)
 * - Context web URLs (external articles to analyze)
 */

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';

/** Options for opening the agent with context */
export interface AgentOpenOptions {
  /** Unique identifier for this open request (used to prevent duplicate auto-sends) */
  requestId?: string;
  /** Pre-filled initial message/prompt */
  initialMessage?: string;
  /** Document IDs to load as context */
  contextDocumentIds?: string[];
  /** External URLs to analyze (for news feed items) */
  contextWebUrls?: string[];
  /** Title of the content being analyzed (for display) */
  contextTitle?: string;
}

interface FastAgentContextValue {
  /** Whether the Fast Agent panel should be open */
  isOpen: boolean;
  /** Current context options (if opened with context) */
  options: AgentOpenOptions | null;
  /** Whether an external panel handler is registered (e.g., MainLayout) */
  hasExternalHandler: boolean;
  /** Open the Fast Agent panel (optionally with context) */
  open: (opts?: AgentOpenOptions) => void;
  /** Open with specific context (convenience method) */
  openWithContext: (opts: AgentOpenOptions) => void;
  /** Close the Fast Agent panel */
  close: () => void;
  /** Toggle the Fast Agent panel */
  toggle: () => void;
  /** Set the open state directly */
  setIsOpen: (open: boolean) => void;
  /** Clear the current context options */
  clearOptions: () => void;
  /** Register an external state setter (from MainLayout) */
  registerExternalState: (setter: (open: boolean) => void, getter: () => boolean) => void;
}

const FastAgentContext = createContext<FastAgentContextValue | null>(null);

export function FastAgentProvider({ children }: { children: ReactNode }) {
  // Internal state as fallback
  const [internalIsOpen, setInternalIsOpen] = useState(false);

  // Context options for the agent
  const [options, setOptions] = useState<AgentOpenOptions | null>(null);

  // External state from MainLayout (when registered)
  const [externalSetter, setExternalSetter] = useState<((open: boolean) => void) | null>(null);
  const [externalGetter, setExternalGetter] = useState<(() => boolean) | null>(null);

  const registerExternalState = useCallback((
    setter: (open: boolean) => void,
    getter: () => boolean
  ) => {
    setExternalSetter(() => setter);
    setExternalGetter(() => getter);
  }, []);

  const isOpen = externalGetter ? externalGetter() : internalIsOpen;

  const withRequestId = useCallback((opts: AgentOpenOptions): AgentOpenOptions => {
    if (opts.requestId) return opts;
    const requestId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    return { ...opts, requestId };
  }, []);

  const setIsOpen = useCallback((open: boolean) => {
    if (externalSetter) {
      externalSetter(open);
    } else {
      setInternalIsOpen(open);
    }
  }, [externalSetter]);

  const open = useCallback((opts?: AgentOpenOptions) => {
    if (opts) {
      setOptions(withRequestId(opts));
    }
    setIsOpen(true);
  }, [setIsOpen, withRequestId]);

  const openWithContext = useCallback((opts: AgentOpenOptions) => {
    setOptions(withRequestId(opts));
    setIsOpen(true);
  }, [setIsOpen, withRequestId]);

  const close = useCallback(() => setIsOpen(false), [setIsOpen]);
  const toggle = useCallback(() => setIsOpen(!isOpen), [setIsOpen, isOpen]);
  const clearOptions = useCallback(() => setOptions(null), []);

  const value: FastAgentContextValue = {
    isOpen,
    options,
    hasExternalHandler: !!externalSetter,
    open,
    openWithContext,
    close,
    toggle,
    setIsOpen,
    clearOptions,
    registerExternalState,
  };

  return (
    <FastAgentContext.Provider value={value}>
      {children}
    </FastAgentContext.Provider>
  );
}

export function useFastAgent() {
  const context = useContext(FastAgentContext);
  if (!context) {
    // Return a no-op version if not within provider (for safety)
    return {
      isOpen: false,
      options: null,
      hasExternalHandler: false,
      open: () => console.warn('FastAgentProvider not found'),
      openWithContext: () => console.warn('FastAgentProvider not found'),
      close: () => {},
      toggle: () => {},
      setIsOpen: () => {},
      clearOptions: () => {},
      registerExternalState: () => {},
    };
  }
  return context;
}

/**
 * Hook to sync MainLayout's showFastAgent state with FastAgentContext
 */
export function useFastAgentSync(
  showFastAgent: boolean,
  setShowFastAgent: (open: boolean) => void
) {
  const { registerExternalState } = useFastAgent();

  useEffect(() => {
    registerExternalState(setShowFastAgent, () => showFastAgent);
  }, [registerExternalState, setShowFastAgent, showFastAgent]);
}

export default FastAgentContext;
