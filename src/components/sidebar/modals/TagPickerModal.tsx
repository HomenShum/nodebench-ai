import { X } from "lucide-react";
import { Id } from "../../../../convex/_generated/dataModel";

interface TagPickerModalProps {
    isOpen: boolean;
    selectedDocuments: Set<Id<"documents">>;
    tagInput: string;
    onTagInputChange: (value: string) => void;
    onClose: () => void;
    onAddTags: () => void;
}

/**
 * Tag Picker Modal Component
 * Modal for adding comma-separated tags to selected documents
 */
export function TagPickerModal({
    isOpen,
    selectedDocuments,
    tagInput,
    onTagInputChange,
    onClose,
    onAddTags
}: TagPickerModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-4 shadow-xl">
                <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-semibold text-[var(--text-primary)]">Add tags</div>
                    <button onClick={onClose} className="p-1 rounded hover:bg-[var(--bg-hover)]">
                        <X className="h-4 w-4 text-[var(--text-secondary)]" />
                    </button>
                </div>
                <input
                    value={tagInput}
                    onChange={(e) => onTagInputChange(e.target.value)}
                    placeholder="tag1, tag2"
                    className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)]"
                />
                <div className="mt-3 flex justify-end gap-2 text-xs">
                    <button
                        onClick={onClose}
                        className="px-3 py-1 rounded-md border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onAddTags}
                        className="px-3 py-1 rounded-md bg-[var(--accent-primary)] text-white hover:opacity-90"
                    >
                        Add tags
                    </button>
                </div>
            </div>
        </div>
    );
}
