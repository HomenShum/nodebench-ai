import React, { useEffect, useCallback, useState } from 'react';

interface KeyboardNavigationOptions {
  items: { id: string }[];
  onSelect?: (id: string) => void;
  onOpen?: (id: string) => void;
  onAnalyze?: (id: string) => void;
  onBookmark?: (id: string) => void;
  enabled?: boolean;
}

interface KeyboardNavigationResult {
  selectedIndex: number;
  selectedId: string | null;
  setSelectedIndex: (index: number) => void;
  isKeyboardMode: boolean;
}

export function useKeyboardNavigation({
  items,
  onSelect,
  onOpen,
  onAnalyze,
  onBookmark,
  enabled = true,
}: KeyboardNavigationOptions): KeyboardNavigationResult {
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isKeyboardMode, setIsKeyboardMode] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled || items.length === 0) return;

    // Don't capture if user is typing in an input
    const activeElement = document.activeElement;
    if (
      activeElement?.tagName === 'INPUT' ||
      activeElement?.tagName === 'TEXTAREA' ||
      (activeElement as HTMLElement)?.isContentEditable
    ) {
      return;
    }

    switch (e.key) {
      case 'j':
      case 'ArrowDown':
        e.preventDefault();
        setIsKeyboardMode(true);
        setSelectedIndex(prev => {
          const next = prev < items.length - 1 ? prev + 1 : prev;
          onSelect?.(items[next]?.id);
          return next;
        });
        break;

      case 'k':
      case 'ArrowUp':
        e.preventDefault();
        setIsKeyboardMode(true);
        setSelectedIndex(prev => {
          const next = prev > 0 ? prev - 1 : 0;
          onSelect?.(items[next]?.id);
          return next;
        });
        break;

      case 'Enter':
      case 'o':
        e.preventDefault();
        if (selectedIndex >= 0 && items[selectedIndex]) {
          onOpen?.(items[selectedIndex].id);
        }
        break;

      case 'a':
        e.preventDefault();
        if (selectedIndex >= 0 && items[selectedIndex]) {
          onAnalyze?.(items[selectedIndex].id);
        }
        break;

      case 's':
      case 'b':
        e.preventDefault();
        if (selectedIndex >= 0 && items[selectedIndex]) {
          onBookmark?.(items[selectedIndex].id);
        }
        break;

      case 'Escape':
        setSelectedIndex(-1);
        setIsKeyboardMode(false);
        break;

      case 'g':
        // Go to top
        if (e.shiftKey) {
          e.preventDefault();
          setSelectedIndex(items.length - 1);
          onSelect?.(items[items.length - 1]?.id);
        } else {
          e.preventDefault();
          setSelectedIndex(0);
          onSelect?.(items[0]?.id);
        }
        break;
    }
  }, [enabled, items, selectedIndex, onSelect, onOpen, onAnalyze, onBookmark]);

  // Reset keyboard mode on mouse move
  useEffect(() => {
    const handleMouseMove = () => {
      if (isKeyboardMode) {
        setIsKeyboardMode(false);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isKeyboardMode]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Reset selection when items change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [items.length]);

  return {
    selectedIndex,
    selectedId: selectedIndex >= 0 ? items[selectedIndex]?.id ?? null : null,
    setSelectedIndex,
    isKeyboardMode,
  };
}

// Keyboard shortcut hint component
export function KeyboardShortcutsHint({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-4 px-4 py-2.5 bg-gray-900/95 backdrop-blur-sm rounded-full shadow-lg">
        <span className="text-[11px] text-gray-400">Navigate:</span>
        <div className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 text-[10px] bg-gray-800 text-gray-300 rounded font-mono">j</kbd>
          <kbd className="px-1.5 py-0.5 text-[10px] bg-gray-800 text-gray-300 rounded font-mono">k</kbd>
        </div>
        <span className="text-gray-600">|</span>
        <span className="text-[11px] text-gray-400">Open:</span>
        <kbd className="px-1.5 py-0.5 text-[10px] bg-gray-800 text-gray-300 rounded font-mono">o</kbd>
        <span className="text-gray-600">|</span>
        <span className="text-[11px] text-gray-400">Analyze:</span>
        <kbd className="px-1.5 py-0.5 text-[10px] bg-gray-800 text-gray-300 rounded font-mono">a</kbd>
        <span className="text-gray-600">|</span>
        <span className="text-[11px] text-gray-400">Save:</span>
        <kbd className="px-1.5 py-0.5 text-[10px] bg-gray-800 text-gray-300 rounded font-mono">s</kbd>
      </div>
    </div>
  );
}
