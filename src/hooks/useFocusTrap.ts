import { useEffect, useRef, useCallback } from 'react';
import { getFocusableElements, getFirstFocusable } from '../utils/a11y';

interface UseFocusTrapOptions {
  /** Whether the focus trap is active */
  enabled?: boolean;
  /** Element to return focus to when trap is deactivated */
  returnFocusTo?: HTMLElement | null;
  /** Whether to auto-focus the first focusable element */
  autoFocus?: boolean;
  /** Callback when escape is pressed */
  onEscape?: () => void;
}

/**
 * Hook to trap focus within a container element
 * Useful for modals, dialogs, and other overlay components
 */
export function useFocusTrap<T extends HTMLElement = HTMLDivElement>(
  options: UseFocusTrapOptions = {}
) {
  const {
    enabled = true,
    returnFocusTo,
    autoFocus = true,
    onEscape,
  } = options;

  const containerRef = useRef<T>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Store the previously focused element when trap activates
  useEffect(() => {
    if (enabled) {
      previousActiveElement.current = document.activeElement as HTMLElement;
    }
  }, [enabled]);

  // Auto-focus first element when trap activates
  useEffect(() => {
    if (!enabled || !autoFocus || !containerRef.current) return;

    // Small delay to ensure the container is rendered
    const timeoutId = setTimeout(() => {
      const firstFocusable = getFirstFocusable(containerRef.current!);
      if (firstFocusable) {
        firstFocusable.focus();
      } else {
        // If no focusable elements, focus the container itself
        containerRef.current?.focus();
      }
    }, 10);

    return () => clearTimeout(timeoutId);
  }, [enabled, autoFocus]);

  // Return focus when trap deactivates
  useEffect(() => {
    return () => {
      if (!enabled) return;
      
      const elementToFocus = returnFocusTo || previousActiveElement.current;
      if (elementToFocus && typeof elementToFocus.focus === 'function') {
        // Small delay to ensure the trap container is unmounted
        setTimeout(() => {
          elementToFocus.focus();
        }, 10);
      }
    };
  }, [enabled, returnFocusTo]);

  // Handle keyboard events for focus trapping
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled || !containerRef.current) return;

    // Handle Escape key
    if (event.key === 'Escape' && onEscape) {
      event.preventDefault();
      onEscape();
      return;
    }

    // Handle Tab key for focus trapping
    if (event.key !== 'Tab') return;

    const focusableElements = getFocusableElements(containerRef.current);
    if (focusableElements.length === 0) {
      event.preventDefault();
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey) {
      // Shift + Tab: if on first element, go to last
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab: if on last element, go to first
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  }, [enabled, onEscape]);

  // Attach keyboard listener
  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);

  return {
    containerRef,
    /** Props to spread on the container element */
    containerProps: {
      ref: containerRef,
      tabIndex: -1, // Make container focusable but not in tab order
      role: 'dialog' as const,
      'aria-modal': true as const,
    },
  };
}

export default useFocusTrap;

