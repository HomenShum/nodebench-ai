import { Trash2 } from "lucide-react";
import type { Doc } from "../../../../convex/_generated/dataModel";

interface TrashButtonProps {
    trash: Doc<"documents">[] | undefined;
    onOpenTrash: () => void;
}

/**
 * Trash Button Footer Component
 * Displays trash button with document count badge
 */
export function TrashButton({ trash, onOpenTrash }: TrashButtonProps) {
    return (
        <div className="border-t border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
            <button
                onClick={onOpenTrash}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
            >
                <Trash2 className="h-4 w-4" />
                <span>Trash</span>
                {trash && trash.length > 0 && (
                    <span className="ml-auto text-xs bg-[var(--bg-hover)] text-[var(--text-secondary)] px-1.5 py-0.5 rounded">
                        {trash.length}
                    </span>
                )}
            </button>
        </div>
    );
}
