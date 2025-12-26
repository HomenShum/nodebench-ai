import React, { useEffect, useState, useCallback } from 'react';

interface LiveRegionProps {
  /** The message to announce */
  message?: string;
  /** Priority level for the announcement */
  priority?: 'polite' | 'assertive';
  /** Whether to clear the message after announcing */
  clearAfter?: number;
}

/**
 * LiveRegion Component
 * Provides a screen reader announcement region
 * Use this for dynamic content updates that should be announced
 */
export function LiveRegion({
  message,
  priority = 'polite',
  clearAfter = 5000,
}: LiveRegionProps) {
  const [currentMessage, setCurrentMessage] = useState(message);

  useEffect(() => {
    if (message) {
      setCurrentMessage(message);
      
      if (clearAfter > 0) {
        const timeoutId = setTimeout(() => {
          setCurrentMessage('');
        }, clearAfter);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [message, clearAfter]);

  return (
    <div
      role="status"
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
    >
      {currentMessage}
    </div>
  );
}

/**
 * Hook for programmatic announcements
 */
export function useAnnounce() {
  const [announcement, setAnnouncement] = useState<{
    message: string;
    priority: 'polite' | 'assertive';
    key: number;
  } | null>(null);

  const announce = useCallback((
    message: string,
    priority: 'polite' | 'assertive' = 'polite'
  ) => {
    setAnnouncement({
      message,
      priority,
      key: Date.now(),
    });
  }, []);

  const AnnouncerComponent = useCallback(() => {
    if (!announcement) return null;
    return (
      <LiveRegion
        key={announcement.key}
        message={announcement.message}
        priority={announcement.priority}
      />
    );
  }, [announcement]);

  return {
    announce,
    Announcer: AnnouncerComponent,
  };
}

export default LiveRegion;

