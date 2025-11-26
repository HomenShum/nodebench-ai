import { X } from "lucide-react";
import { Id } from "../../../../convex/_generated/dataModel";

interface ShareModalProps {
    isOpen: boolean;
    selectedDocuments: Set<Id<"documents">>;
    sharePublic: boolean;
    onSharePublicChange: (value: boolean) => void;
    onClose: () => void;
    onApply: () => void;
}

/**
 * Share Modal Component
 * Modal for changing document sharing settings (public/private)
 */
export function ShareModal({
    isOpen,
    selectedDocuments,
    sharePublic,
    onSharePublicChange,
    onClose,
    onApply
}: ShareModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-4 shadow-xl">
                <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-semibold text-[var(--text-primary)]">Share settings</div>
                    <button onClick={onClose} className="p-1 rounded hover:bg-[var(--bg-hover)]">
                        <X className="h-4 w-4 text-[var(--text-secondary)]" />
                    </button>
                </div>
                <label className="inline-flex items-center gap-2 text-sm text-[var(--text-primary)]">
                    <input
                        type="checkbox"
                        checked={sharePublic}
                        onChange={(e) => onSharePublicChange(e.target.checked)}
                    />
                    <span>Make selected document(s) public</span>
                </label>
                <div className="mt-3 flex justify-end gap-2 text-xs">
                    <button
                        onClick={onClose}
                        className="px-3 py-1 rounded-md border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onApply}
                        className="px-3 py-1 rounded-md bg-[var(--accent-primary)] text-white hover:opacity-90"
                    >
                        Apply
                    </button>
                </div>
            </div>
        </div>
    );
}
