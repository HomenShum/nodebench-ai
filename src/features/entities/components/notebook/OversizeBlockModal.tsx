/**
 * OversizeBlockModal — preflight guard when a user pastes content that
 * would exceed the server's MAX_BLOCK_CONTENT_BYTES (50 KB).
 *
 * UX contract (per user-case matrix #13):
 *   - Do NOT auto-truncate or discard. Show the user what happened and
 *     offer two choices:
 *       (a) Split into smaller blocks (default action)
 *       (b) Cancel — keep the oversized content in the editor so they can
 *           trim it down manually.
 *   - Never block the entire editor. Modal is dismissable; the offending
 *     save is the only thing that's held back.
 */

import { AlertTriangle } from "lucide-react";

type Props = {
  open: boolean;
  approxBytes: number;
  maxBytes: number;
  onCancel: () => void;
  onSplit: () => void;
};

export function OversizeBlockModal({
  open,
  approxBytes,
  maxBytes,
  onCancel,
  onSplit,
}: Props) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Notebook block too large"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-5 shadow-xl dark:border-white/10 dark:bg-[#1a1918]">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" aria-hidden="true" />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              This block is too large to save
            </h2>
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
              {Math.round(approxBytes / 1024)} KB exceeds the{" "}
              {Math.round(maxBytes / 1024)} KB per-block limit. Split it into smaller
              blocks to preserve everything, or cancel and trim it yourself.
            </p>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/10 dark:text-gray-200 dark:hover:bg-white/[0.05]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSplit}
            className="rounded bg-[var(--accent-primary)] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-90"
          >
            Split into smaller blocks
          </button>
        </div>
      </div>
    </div>
  );
}

export default OversizeBlockModal;
