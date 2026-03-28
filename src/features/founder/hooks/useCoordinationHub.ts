/**
 * useCoordinationHub — Composition hook combining snapshot + stream + actions.
 *
 * When stream emits events, optimistically merges into snapshot state.
 * Periodic full snapshot refresh every 60s as consistency safeguard.
 */

import { useEffect, useRef, useCallback } from "react";
import { useSharedContextSnapshot } from "./useSharedContextSnapshot";
import { useSharedContextStream } from "./useSharedContextStream";
import { useSharedContextActions } from "./useSharedContextActions";
import type {
  SharedContextPeer,
  SharedContextPacket,
  SharedContextTask,
  SharedContextMessage,
  SharedContextEvent,
} from "../types/sharedContext";

const CONSISTENCY_REFRESH_MS = 60_000;

export interface UseCoordinationHubReturn {
  peers: SharedContextPeer[];
  packets: SharedContextPacket[];
  tasks: SharedContextTask[];
  messages: SharedContextMessage[];
  counts: {
    activePeers: number;
    activePackets: number;
    invalidatedPackets: number;
    openTasks: number;
    unreadMessages: number;
  };
  isLive: boolean;
  isConnected: boolean;
  isLoading: boolean;
  lastEvent: SharedContextEvent | null;
  eventLog: SharedContextEvent[];
  actions: ReturnType<typeof useSharedContextActions>;
  refresh: () => void;
}

export function useCoordinationHub(): UseCoordinationHubReturn {
  const {
    snapshot,
    isLoading,
    isLive,
    refresh,
  } = useSharedContextSnapshot(30);

  const { isConnected, lastEvent, eventLog } = useSharedContextStream();
  const actions = useSharedContextActions();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Force refresh to bypass staleness check
  const forceRefresh = useCallback(() => {
    void refresh();
  }, [refresh]);

  // Periodic consistency refresh
  useEffect(() => {
    intervalRef.current = setInterval(forceRefresh, CONSISTENCY_REFRESH_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [forceRefresh]);

  return {
    peers: snapshot.peers,
    packets: snapshot.recentPackets,
    tasks: snapshot.recentTasks,
    messages: snapshot.recentMessages,
    counts: snapshot.counts,
    isLive,
    isConnected,
    isLoading,
    lastEvent,
    eventLog,
    actions,
    refresh: forceRefresh,
  };
}
