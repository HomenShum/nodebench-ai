/**
 * TombstoneModal — shown when the block the user was actively editing
 * was deleted by another collaborator or an agent mid-edit.
 *
 * UX contract (per user-case matrix #14):
 *   - Preserve the user's unsynced local content. Never silently discard.
 *   - Offer three actions:
 *       (a) Keep editing (restore block from the soft-delete snapshot
 *           if the access chain allows; noop otherwise)
 *       (b) Save my edits as a new block (the common "merge my work into
 *           the stream" action — never loses typing)
 *       (c) Discard my edits and move on
 *   - Always visible title + quote of the last local content length so the
 *     user knows this dialog represents their bytes, not a random warning.
 */

import { Trash2 } from "lucide-react";

type Props = {
  open: boolean;
  blockLabel: string;           // human-readable "Block in SoftBank" etc.
  deletedBy?: string;           // display name or "an agent"
  localCharCount: number;       // so the user knows what's at stake
  onKeepEditing: () => void;
  onSaveAsNewBlock: () => void;
  onDiscard: () => void;
};

export function TombstoneModal({
  open,
  blockLabel,
  deletedBy,
  localCharCount,
  onKeepEditing,
  onSaveAsNewBlock,
  onDiscard,
}: Props) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Block deleted while editing"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-5 shadow-xl dark:border-white/10 dark:bg-[#1a1918]">
        <div className="flex items-start gap-3">
          <Trash2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-gray-500 dark:text-gray-400" aria-hidden="true" />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              This block was deleted {deletedBy ? `by ${deletedBy}` : "by someone else"}
            </h2>
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
              You have <strong>{localCharCount.toLocaleString()} unsynced characters</strong> in
              &ldquo;{blockLabel}&rdquo;. Your work is safe — pick what to do:
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={onKeepEditing}
            className="rounded border border-gray-200 px-3 py-2 text-left text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/10 dark:text-gray-200 dark:hover:bg-white/[0.05]"
          >
            Keep editing — restore the block
          </button>
          <button
            type="button"
            onClick={onSaveAsNewBlock}
            className="rounded bg-[var(--accent-primary)] px-3 py-2 text-left text-xs font-medium text-white transition-colors hover:opacity-90"
          >
            Save my edits as a new block
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="rounded px-3 py-2 text-left text-xs font-medium text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Discard my edits and move on
          </button>
        </div>
      </div>
    </div>
  );
}

export default TombstoneModal;
