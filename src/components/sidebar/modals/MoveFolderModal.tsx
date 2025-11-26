import { X } from "lucide-react";
import { Id } from "../../../../convex/_generated/dataModel";

interface MoveFolderModalProps {
    isOpen: boolean;
    selectedDocuments: Set<Id<"documents">>;
    targetFolderId: Id<"folders"> | null;
    userFolders: any[] | undefined;
    onTargetFolderChange: (folderId: Id<"folders">) => void;
    onClose: () => void;
    onMove: () => void;
}

/**
 * Move to Folder Modal Component
 * Modal for moving selected documents to a folder
 */
export function MoveFolderModal({
    isOpen,
    selectedDocuments,
    targetFolderId,
    userFolders,
    onTargetFolderChange,
    onClose,
    onMove
}: MoveFolderModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-4 shadow-xl">
                <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-semibold text-[var(--text-primary)]">Move to folder</div>
                    <button onClick={onClose} className="p-1 rounded hover:bg-[var(--bg-hover)]">
                        <X className="h-4 w-4 text-[var(--text-secondary)]" />
                    </button>
                </div>
                <select
                    value={targetFolderId ?? ""}
                    onChange={(e) => onTargetFolderChange(e.target.value as Id<"folders">)}
                    className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)]"
                >
                    <option value="">Select a folder</option>
                    {userFolders?.map((f: any) => (
                        <option key={f._id} value={String(f._id)}>{f.name}</option>
                    ))}
                </select>
                <div className="mt-3 flex justify-end gap-2 text-xs">
                    <button
                        onClick={onClose}
                        className="px-3 py-1 rounded-md border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onMove}
                        className="px-3 py-1 rounded-md bg-[var(--accent-primary)] text-white hover:opacity-90"
                    >
                        Move
                    </button>
                </div>
            </div>
        </div>
    );
}
