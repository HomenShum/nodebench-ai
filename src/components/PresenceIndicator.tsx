import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import usePresence from "@convex-dev/presence/react";
import FacePile from "@convex-dev/presence/facepile";
import { useAuthToken } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { useEffect, useRef, useMemo, useState } from "react";

// Toggle presence debug logs in the browser console by setting VITE_DEBUG_PRESENCE=true
// e.g., in .env.local: VITE_DEBUG_PRESENCE=true
const DEBUG_PRESENCE: boolean = (import.meta as any)?.env?.VITE_DEBUG_PRESENCE === "true";
// NEW: configurable heartbeat and idle thresholds via env (with safe fallbacks)
const DEFAULT_HEARTBEAT_MS: number = Number((import.meta as any)?.env?.VITE_PRESENCE_HEARTBEAT_MS) || 30000; // NEW
const DEFAULT_IDLE_MS: number = Number((import.meta as any)?.env?.VITE_PRESENCE_IDLE_MS) || 120000; // NEW

interface PresenceIndicatorProps {
  documentId: Id<"documents">;
  userId: string;
  // NEW: optional overrides for tuning presence behavior without code changes
  intervalMs?: number; // heartbeat interval override
  idleMs?: number; // idle timeout before pausing presence
}

function PresenceCore({ documentId, userId, intervalMs }: PresenceIndicatorProps) {
  // NEW: pass interval to presence hook to reduce heartbeat frequency when desired
  const presenceState = usePresence(api.presence, documentId, userId, intervalMs ?? DEFAULT_HEARTBEAT_MS);
  // Normalize to avoid conditional hooks later and stabilize reference
  const validPresenceState = useMemo(
    () => (Array.isArray(presenceState) ? presenceState : []),
    [presenceState],
  );

  // Debug: heartbeat active
  useEffect(() => {
    if (DEBUG_PRESENCE) {
      console.debug("PresenceCore: heartbeat active", { documentId, userId });
    }
  }, [documentId, userId]);

  // Debug: presence state changes (logs only when length changes)
  const prevLenRef = useRef<number>(validPresenceState.length);
  useEffect(() => {
    if (!DEBUG_PRESENCE) return;
    const len = validPresenceState.length;
    if (prevLenRef.current !== len) {
      console.debug("PresenceCore: state update", {
        count: len,
        users: validPresenceState.map((u: any) => ({ userId: u.userId, online: u.online })),
      });
      prevLenRef.current = len;
    }
  }, [validPresenceState]);

  // Add better error handling and loading states
  if (!presenceState) {
    return null;
  }

  if (validPresenceState.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600">
        {validPresenceState.length === 1 ? "1 person" : `${validPresenceState.length} people`} editing
      </span>
      <FacePile presenceState={validPresenceState} />
    </div>
  );
}

export function PresenceIndicator({ documentId, userId, intervalMs, idleMs: idleMsProp }: PresenceIndicatorProps) {
  // 1) Ensure we have a client-side auth token
  const token = useAuthToken();
  // 2) Ensure the server sees the authenticated user before starting heartbeats
  const serverUserId = useQuery(api.presence.getUserId, token ? {} : "skip");

  // NEW: Idle gating to reduce network traffic when the page is visible but the user is inactive
  const [enabled, setEnabled] = useState<boolean>(true); // NEW
  const idleMs = idleMsProp ?? DEFAULT_IDLE_MS; // NEW
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null); // NEW

  // NEW: reset idle timer on user activity
  useEffect(() => {
    const resetIdle = () => {
      if (!enabled && DEBUG_PRESENCE) {
        console.debug("PresenceIndicator: re-enabling due to activity");
      }
      setEnabled(true);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        if (DEBUG_PRESENCE) {
          console.debug("PresenceIndicator: disabling due to idle");
        }
        setEnabled(false);
      }, idleMs);
    };

    // Start/refresh timer immediately on mount/changes
    resetIdle();

    // Common activity signals with stable handler
    const events = ["pointermove", "keydown", "focusin"]; // NEW
    const handleActivity = () => resetIdle();
    events.forEach((e) => window.addEventListener(e, handleActivity, { passive: true }));

    // Pause immediately when tab is hidden; resume timer when visible
    const onVisibility = () => {
      if (document.hidden) {
        if (DEBUG_PRESENCE) console.debug("PresenceIndicator: page hidden -> disabling");
        setEnabled(false);
        if (idleTimerRef.current) {
          clearTimeout(idleTimerRef.current);
          idleTimerRef.current = null;
        }
      } else {
        resetIdle();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      events.forEach((e) => window.removeEventListener(e, handleActivity));
      document.removeEventListener("visibilitychange", onVisibility);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [idleMs, enabled]);

  // Guard: must have a userId prop, a token, and the server must confirm the same user
  if (!userId || !token || !serverUserId || serverUserId !== userId) {
    if (DEBUG_PRESENCE) {
      console.debug("PresenceIndicator: gated", {
        hasUserId: !!userId,
        hasToken: !!token,
        serverUserId,
        userId,
      });
    }
    return null;
  }

  if (DEBUG_PRESENCE) {
    console.debug("PresenceIndicator: starting presence", {
      documentId,
      userId,
    });
  }

  return enabled ? (
    <PresenceCore
      documentId={documentId}
      userId={userId}
      intervalMs={intervalMs ?? DEFAULT_HEARTBEAT_MS} // NEW: provide configurable heartbeat interval
    />
  ) : null;
}
