/**
 * useBottomSheet — manages a 3-state mobile bottom sheet (peek / half / full).
 *
 * Touch-drag handling:
 * - Swipe up → expand (peek→half→full)
 * - Swipe down → collapse (full→half→peek)
 * - Fast fling (velocity > threshold) snaps to next state in fling direction
 * - Slow drag snaps to nearest state based on current translateY position
 */

import { useState, useRef, useCallback, useEffect } from 'react';

export type BottomSheetState = 'closed' | 'peek' | 'half' | 'full';

/** Pixel offsets from the TOP of the 95vh container for each state.
 *  These correspond to the CSS translateY values. */
const SHEET_HEIGHT_VH = 95;
const PEEK_HEIGHT_PX = 80;
const HALF_VH = 60;

function getTranslateYForState(state: BottomSheetState, viewportHeight: number): number {
  const sheetHeight = viewportHeight * (SHEET_HEIGHT_VH / 100);
  switch (state) {
    case 'closed': return sheetHeight;
    case 'peek': return sheetHeight - PEEK_HEIGHT_PX;
    case 'half': return sheetHeight - viewportHeight * (HALF_VH / 100);
    case 'full': return 0;
  }
}

const VELOCITY_THRESHOLD = 0.5; // px/ms — above this = fling

interface UseBottomSheetOptions {
  /** Called when the sheet reaches 'closed' state (via swipe-down past peek). */
  onClose?: () => void;
  /** Initial state when opened. Default: 'half' */
  initialState?: BottomSheetState;
}

export function useBottomSheet(isOpen: boolean, options: UseBottomSheetOptions = {}) {
  const { onClose, initialState = 'half' } = options;
  const [sheetState, setSheetState] = useState<BottomSheetState>(isOpen ? initialState : 'closed');
  const [isDragging, setIsDragging] = useState(false);

  // Track the live translateY during drag (CSS inline style override)
  const [dragTranslateY, setDragTranslateY] = useState<number | null>(null);

  const touchStartY = useRef(0);
  const touchStartTime = useRef(0);
  const touchStartTranslateY = useRef(0);

  // Sync open/close
  useEffect(() => {
    if (isOpen && sheetState === 'closed') {
      setSheetState(initialState);
    } else if (!isOpen && sheetState !== 'closed') {
      setSheetState('closed');
    }
  }, [isOpen, initialState]); // eslint-disable-line react-hooks/exhaustive-deps

  const snapToState = useCallback((nextState: BottomSheetState) => {
    setDragTranslateY(null);
    setIsDragging(false);
    setSheetState(nextState);
    if (nextState === 'closed') {
      onClose?.();
    }
  }, [onClose]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    const vh = window.innerHeight;
    touchStartY.current = touch.clientY;
    touchStartTime.current = Date.now();
    touchStartTranslateY.current = getTranslateYForState(sheetState, vh);
    setIsDragging(true);
  }, [sheetState]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    const deltaY = touch.clientY - touchStartY.current;
    const newTranslateY = Math.max(0, touchStartTranslateY.current + deltaY);
    setDragTranslateY(newTranslateY);
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    const touch = e.changedTouches[0];
    if (!touch) {
      setIsDragging(false);
      setDragTranslateY(null);
      return;
    }

    const deltaY = touch.clientY - touchStartY.current;
    const elapsed = Date.now() - touchStartTime.current;
    const velocity = elapsed > 0 ? deltaY / elapsed : 0; // positive = downward

    const vh = window.innerHeight;
    const currentTranslateY = Math.max(0, touchStartTranslateY.current + deltaY);

    // Determine snap target
    const states: BottomSheetState[] = ['full', 'half', 'peek', 'closed'];
    const stateYs = states.map(s => getTranslateYForState(s, vh));

    // If velocity is above threshold, snap in the fling direction
    if (Math.abs(velocity) > VELOCITY_THRESHOLD) {
      const currentIdx = states.indexOf(sheetState);
      if (velocity > 0) {
        // Fling down → next smaller state
        const nextIdx = Math.min(currentIdx + 1, states.length - 1);
        snapToState(states[nextIdx]);
      } else {
        // Fling up → next larger state
        const nextIdx = Math.max(currentIdx - 1, 0);
        snapToState(states[nextIdx]);
      }
    } else {
      // Snap to nearest state by translateY distance
      let closest = states[0];
      let minDist = Infinity;
      for (let i = 0; i < states.length; i++) {
        const dist = Math.abs(currentTranslateY - stateYs[i]);
        if (dist < minDist) {
          minDist = dist;
          closest = states[i];
        }
      }
      snapToState(closest);
    }
  }, [sheetState, snapToState]);

  /** Dismiss to peek when backdrop is tapped */
  const onBackdropTap = useCallback(() => {
    if (sheetState === 'full' || sheetState === 'half') {
      snapToState('peek');
    }
  }, [sheetState, snapToState]);

  /** Expand to half if in peek (tap on the handle area) */
  const onHandleTap = useCallback(() => {
    if (sheetState === 'peek') {
      snapToState('half');
    } else if (sheetState === 'half') {
      snapToState('full');
    }
  }, [sheetState, snapToState]);

  // Compute CSS class name for the state
  const sheetClassName =
    sheetState === 'closed' ? 'sheet-closed' :
    sheetState === 'peek' ? 'sheet-peek' :
    sheetState === 'half' ? 'sheet-half' : 'sheet-full';

  // Inline style override during drag
  const dragStyle: React.CSSProperties | undefined =
    isDragging && dragTranslateY !== null
      ? { transform: `translateY(${dragTranslateY}px)` }
      : undefined;

  return {
    sheetState,
    setSheetState: snapToState,
    isDragging,
    sheetClassName,
    dragStyle,
    handleProps: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    },
    onBackdropTap,
    onHandleTap,
  };
}
