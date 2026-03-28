/**
 * useSharedContextSnapshot — Fetches shared context snapshot from backend.
 *
 * Data sources (in priority order):
 *   1. GET /api/shared-context/snapshot (requires backend running on :3100)
 *   2. DEMO_SHARED_CONTEXT_SNAPSHOT fixture (fallback when offline)
 *
 * Caches in useRef with 30s staleness TTL. Manual refresh via `refresh()`.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { getSharedContextSnapshotUrl } from "@/lib/syncBridgeApi";
import { DEMO_SHARED_CONTEXT_SNAPSHOT } from "../views/founderFixtures";
import type { SharedContextSnapshot } from "../types/sharedContext";

const STALE_TTL_MS = 30_000;

export interface UseSharedContextSnapshotReturn {
  snapshot: SharedContextSnapshot;
  isLoading: boolean;
  isLive: boolean;
  error: string | null;
  refresh: () => void;
}

export function useSharedContextSnapshot(
  limit = 20,
): UseSharedContextSnapshotReturn {
  const [snapshot, setSnapshot] = useState<SharedContextSnapshot>(DEMO_SHARED_CONTEXT_SNAPSHOT);
  const [isLoading, setIsLoading] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastFetchRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    // Skip if fetched recently (within TTL)
    if (Date.now() - lastFetchRef.current < STALE_TTL_MS) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsLoading(true);
    setError(null);

    try {
      const url = getSharedContextSnapshotUrl({ limit });
      const resp = await fetch(url, { signal: controller.signal });
      if (controller.signal.aborted) return;

      if (!resp.ok) {
        throw new Error(`Snapshot fetch failed: ${resp.status}`);
      }

      const data = await resp.json();
      if (controller.signal.aborted) return;

      // Normalize server shape to our types
      const live: SharedContextSnapshot = {
        peers: data.peers ?? [],
        recentPackets: data.recentPackets ?? [],
        recentTasks: data.recentTasks ?? [],
        recentMessages: data.recentMessages ?? [],
        counts: data.counts ?? {
          activePeers: 0,
          activePackets: 0,
          invalidatedPackets: 0,
          openTasks: 0,
          unreadMessages: 0,
        },
      };

      setSnapshot(live);
      setIsLive(true);
      lastFetchRef.current = Date.now();
    } catch (err) {
      if (controller.signal.aborted) return;
      setIsLive(false);
      setError(err instanceof Error ? err.message : "Unknown error");
      // Keep showing last good snapshot (or demo fixtures)
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [limit]);

  useEffect(() => {
    void refresh();
    return () => abortRef.current?.abort();
  }, [refresh]);

  return { snapshot, isLoading, isLive, error, refresh };
}
