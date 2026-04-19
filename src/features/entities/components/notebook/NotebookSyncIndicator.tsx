/**
 * NotebookSyncIndicator — a small, always-present save/sync status chip.
 *
 * Pattern: calm-by-default sync indicator (PR2 from the refactor checklist).
 *          The notebook should feel trustworthy: the user can always see
 *          whether their work is saved, without having to look for it.
 *
 * Prior art:
 *   - Linear — persistent sync indicator top-right of editor
 *   - Notion — "Saving…" / "Saved" lightweight chip
 *   - Cursor — inline save confirmation
 *   - Google Docs — "All changes saved" status bar
 *
 * See: .claude/rules/reexamine_polish.md  (micro-interactions, calm states)
 *      .claude/rules/reexamine_a11y.md  (aria-live polite for state changes)
 *      .claude/rules/reference_attribution.md
 *      src/features/entities/components/notebook/useNotebookSyncStatus.ts
 *
 * Copy bias: never alarming. "Offline · changes queued" reassures; "Error!"
 * would not. Matches the broader design-reduction rule of quiet confidence.
 */

import { memo } from "react";
import { Check, Cloud, CloudOff, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  describeSyncState,
  type NotebookSyncStatusSubscription,
} from "./useNotebookSyncStatus";

export type NotebookSyncIndicatorProps = {
  status: NotebookSyncStatusSubscription;
  /** Additional classes for positioning. */
  className?: string;
};

/**
 * Icon for each sync state. Color-blind safe because each state has a
 * different shape + a different text label.
 */
function stateIcon(state: NotebookSyncStatusSubscription["state"]) {
  switch (state) {
    case "synced":
      return <Check className="h-3.5 w-3.5" aria-hidden="true" />;
    case "pending":
      return <Cloud className="h-3.5 w-3.5" aria-hidden="true" />;
    case "saving":
      return (
        <Loader2
          className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none"
          aria-hidden="true"
        />
      );
    case "retrying":
      return (
        <RefreshCw
          className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none"
          aria-hidden="true"
        />
      );
    case "offline":
      return <CloudOff className="h-3.5 w-3.5" aria-hidden="true" />;
  }
}

function stateTone(state: NotebookSyncStatusSubscription["state"]): string {
  switch (state) {
    case "synced":
      return "text-emerald-700 dark:text-emerald-400";
    case "pending":
      return "text-gray-500 dark:text-gray-400";
    case "saving":
      return "text-sky-700 dark:text-sky-400";
    case "retrying":
      return "text-amber-700 dark:text-amber-400";
    case "offline":
      return "text-amber-800 dark:text-amber-300";
  }
}

function NotebookSyncIndicatorBase({ status, className }: NotebookSyncIndicatorProps) {
  const label = describeSyncState(status);
  const tone = stateTone(status.state);

  // Extended description for the title tooltip + polite live region.
  const describe = (() => {
    if (status.state === "synced" && status.lastSavedAgoMs != null) {
      const seconds = Math.round(status.lastSavedAgoMs / 1_000);
      if (seconds < 60) return "All changes saved";
      const minutes = Math.round(seconds / 60);
      if (minutes < 60) return `All changes saved · ${minutes}m ago`;
      const hours = Math.round(minutes / 60);
      return `All changes saved · ${hours}h ago`;
    }
    if (status.state === "pending" && status.pendingPatchCount > 0) {
      return `${status.pendingPatchCount} change${status.pendingPatchCount === 1 ? "" : "s"} queued to save`;
    }
    if (status.state === "saving") return "Saving your changes now";
    if (status.state === "retrying")
      return `Retrying save · attempt ${status.retryAttempt}`;
    if (status.state === "offline")
      return "You're offline. Changes are queued locally and will sync when you reconnect.";
    return label;
  })();

  return (
    <span
      role="status"
      aria-live="polite"
      aria-atomic="true"
      title={describe}
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] font-medium",
        tone,
        className,
      )}
    >
      {stateIcon(status.state)}
      <span>{label}</span>
    </span>
  );
}

export const NotebookSyncIndicator = memo(NotebookSyncIndicatorBase);
NotebookSyncIndicator.displayName = "NotebookSyncIndicator";

export default NotebookSyncIndicator;
