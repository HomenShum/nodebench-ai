/**
 * useSharedContextStream — Subscribes to SSE stream at /api/shared-context/events.
 *
 * Auto-reconnects with exponential backoff (2s → 4s → 8s, max 30s).
 * Event log bounded to MAX_EVENTS (100) entries.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { getSharedContextEventsUrl } from "@/lib/syncBridgeApi";
import type { SharedContextEvent } from "../types/sharedContext";

const MAX_EVENTS = 100;
const INITIAL_BACKOFF_MS = 2_000;
const MAX_BACKOFF_MS = 30_000;

export interface UseSharedContextStreamReturn {
  isConnected: boolean;
  lastEvent: SharedContextEvent | null;
  eventLog: SharedContextEvent[];
  clearLog: () => void;
}

export function useSharedContextStream(): UseSharedContextStreamReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<SharedContextEvent | null>(null);
  const [eventLog, setEventLog] = useState<SharedContextEvent[]>([]);
  const backoffRef = useRef(INITIAL_BACKOFF_MS);
  const esRef = useRef<EventSource | null>(null);
  const mountedRef = useRef(true);

  const clearLog = useCallback(() => setEventLog([]), []);

  useEffect(() => {
    mountedRef.current = true;

    if (typeof EventSource === "undefined") return;

    function connect() {
      if (!mountedRef.current) return;

      const url = getSharedContextEventsUrl({ limit: 50 });
      const es = new EventSource(url);
      esRef.current = es;

      es.onopen = () => {
        if (!mountedRef.current) return;
        setIsConnected(true);
        backoffRef.current = INITIAL_BACKOFF_MS;
      };

      es.addEventListener("shared_context", (e: MessageEvent) => {
        if (!mountedRef.current) return;
        try {
          const event: SharedContextEvent = JSON.parse(e.data);
          setLastEvent(event);
          setEventLog((prev) => {
            const next = [event, ...prev];
            return next.length > MAX_EVENTS ? next.slice(0, MAX_EVENTS) : next;
          });
        } catch {
          // Malformed SSE data — skip
        }
      });

      es.onerror = () => {
        if (!mountedRef.current) return;
        setIsConnected(false);
        es.close();
        esRef.current = null;

        // Exponential backoff reconnect
        const delay = backoffRef.current;
        backoffRef.current = Math.min(delay * 2, MAX_BACKOFF_MS);
        setTimeout(connect, delay);
      };
    }

    connect();

    return () => {
      mountedRef.current = false;
      esRef.current?.close();
      esRef.current = null;
    };
  }, []);

  return { isConnected, lastEvent, eventLog, clearLog };
}
