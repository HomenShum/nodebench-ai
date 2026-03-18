import { X } from "lucide-react";
import { Id } from "../../../../convex/_generated/dataModel";
import { DialogOverlay } from "@/shared/components/DialogOverlay";

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
    return (
        <DialogOverlay isOpen={isOpen} onClose={onClose} ariaLabel="Add tags">
            <div className="w-full max-w-sm rounded-lg border border-edge bg-surface p-4 shadow-xl">
                <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-semibold text-content">Add tags</div>
                    <button onClick={onClose} className="p-1 rounded hover:bg-surface-hover">
                        <X className="h-4 w-4 text-content-secondary" />
                    </button>
                </div>
                <input
                    value={tagInput}
                    onChange={(e) => onTagInputChange(e.target.value)}
                    placeholder="tag1, tag2"
                    className="w-full px-3 py-2 text-sm rounded-md border border-edge bg-surface-secondary text-content"
                />
                <div className="mt-3 flex justify-end gap-2 text-xs">
                    <button
                        onClick={onClose}
                        className="px-3 py-1 rounded-md border border-edge text-content-secondary hover:bg-surface-hover"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onAddTags}
                        className="px-3 py-1 rounded-md bg-indigo-600 text-white hover:opacity-90"
                    >
                        Add tags
                    </button>
                </div>
            </div>
        </DialogOverlay>
    );
}
