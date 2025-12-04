/**
 * FastAgentContext - Global context for controlling Fast Agent panel
 * 
 * Allows any component to open/close the Fast Agent panel and 
 * inject content for analysis.
 */

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';

interface FastAgentContextValue {
  /** Whether the Fast Agent panel should be open */
  isOpen: boolean;
  /** Open the Fast Agent panel */
  open: () => void;
  /** Close the Fast Agent panel */
  close: () => void;
  /** Toggle the Fast Agent panel */
  toggle: () => void;
  /** Set the open state directly */
  setIsOpen: (open: boolean) => void;
  /** Register an external state setter (from MainLayout) */
  registerExternalState: (setter: (open: boolean) => void, getter: () => boolean) => void;
}

const FastAgentContext = createContext<FastAgentContextValue | null>(null);

export function FastAgentProvider({ children }: { children: ReactNode }) {
  // Internal state as fallback
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  
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

  const setIsOpen = useCallback((open: boolean) => {
    if (externalSetter) {
      externalSetter(open);
    } else {
      setInternalIsOpen(open);
    }
  }, [externalSetter]);

  const open = useCallback(() => setIsOpen(true), [setIsOpen]);
  const close = useCallback(() => setIsOpen(false), [setIsOpen]);
  const toggle = useCallback(() => setIsOpen(!isOpen), [setIsOpen, isOpen]);

  const value: FastAgentContextValue = {
    isOpen,
    open,
    close,
    toggle,
    setIsOpen,
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
      open: () => console.warn('FastAgentProvider not found'),
      close: () => {},
      toggle: () => {},
      setIsOpen: () => {},
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

