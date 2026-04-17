/**
 * BlockStatusBar.tsx — lightweight status footer for the live notebook.
 *
 * Covers production-UX scenarios from the user-case matrix without a full
 * presence/cursors implementation:
 *   - "3 editing" presence chip (from @convex-dev/presence, room-level)
 *   - "last synced N sec ago" indicator
 *   - offline banner with "N edits queued"
 *   - rate-limit hint when the server pushes back
 *   - read-only lock when the current block has accessMode === "read"
 *
 * No animations, no blocking UI. Meant to sit above/below the notebook
 * content as an ambient status surface.
 */

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Lock, WifiOff, Users } from "lucide-react";

type PresenceEntry = { userId: string; online: boolean; lastDisconnected: number };

type Props = {
  presence: PresenceEntry[];
  selfUserId: string | null;
  // ISO or ms timestamp of last successful snapshot upload. null while unknown.
  lastSyncedAt: number | null;
  // Count of edits in the offline queue for the current entity.
  offlineQueueLength: number;
  // True when navigator.onLine is false or a recent save failed with
  // transient (non-permanent) error.
  isOffline: boolean;
  // True when the last save was rejected by the rate limiter.
  rateLimited: boolean;
  // When true, render a read-only lock regardless of per-block access.
  readOnly: boolean;
};

function formatRelative(ms: number | null): string {
  if (!ms) return "—";
  const diff = Date.now() - ms;
  if (diff < 0) return "now";
  if (diff < 2_000) return "just now";
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return `${Math.floor(diff / 3_600_000)}h ago`;
}

export function BlockStatusBar({
  presence,
  selfUserId,
  lastSyncedAt,
  offlineQueueLength,
  isOffline,
  rateLimited,
  readOnly,
}: Props) {
  // Re-render once a second so the "N sec ago" stays fresh.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const others = presence.filter((p) => p.online && p.userId !== selfUserId);

  return (
    <div
      className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-2 text-[11px] text-gray-500 dark:border-white/[0.06] dark:text-gray-400"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        {others.length > 0 ? (
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-3 w-3" aria-hidden="true" />
            <span>
              {others.length + 1} editing
            </span>
          </span>
        ) : null}
        {lastSyncedAt ? (
          <span className="inline-flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" aria-hidden="true" />
            <span>synced {formatRelative(lastSyncedAt)}</span>
          </span>
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        {readOnly ? (
          <span className="inline-flex items-center gap-1 text-gray-500">
            <Lock className="h-3 w-3" aria-hidden="true" />
            <span>Read-only</span>
          </span>
        ) : null}
        {rateLimited ? (
          <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
            <span>Slow down — rate limit</span>
          </span>
        ) : null}
        {isOffline ? (
          <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
            <WifiOff className="h-3 w-3" aria-hidden="true" />
            <span>
              Offline
              {offlineQueueLength > 0 ? ` — ${offlineQueueLength} edits queued` : ""}
            </span>
          </span>
        ) : null}
      </div>
    </div>
  );
}

export default BlockStatusBar;
