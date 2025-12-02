import { useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { toast } from "sonner";

/**
 * Custom hook for document CRUD operations and handlers
 * Centralizes all document-related mutations and action handlers
 */
export function useDocumentActions() {
    // Mutations
    const createDocument = useMutation(api.domains.documents.documents.create);
    const createWithSnapshot = useMutation(api.domains.documents.prosemirror.createDocumentWithInitialSnapshot);
    const updateDocument = useMutation(api.domains.documents.documents.update);
    const archiveDocument = useMutation(api.domains.documents.documents.archive);
    const restoreDocument = useMutation(api.domains.documents.documents.restore);
    const removeDocument = useMutation(api.domains.documents.documents.remove);
    const clearTrash = useMutation(api.domains.documents.documents.clearTrash);
    const toggleFavorite = useMutation(api.domains.documents.documents.toggleFavorite);
    const addTagsToDocument = useMutation(api.domains.documents.documents.addTags);
    const addDocumentToFolder = useMutation(api.domains.documents.documents.addToFolder);

    // Archive Handler
    const handleArchive = useCallback((id: Id<"documents">) => {
        toast.promise(archiveDocument({ id }), {
            loading: 'Moving to trash...',
            success: 'Moved to trash',
            error: 'Failed to archive document',
        });
    }, [archiveDocument]);

    // Restore Handler
    const handleRestore = useCallback((id: Id<"documents">) => {
        toast.promise(restoreDocument({ id }), {
            loading: 'Restoring...',
            success: 'Document restored',
            error: 'Failed to restore document',
        });
    }, [restoreDocument]);

    // Delete Permanently Handler
    const handleDelete = useCallback((id: Id<"documents">) => {
        toast.promise(removeDocument({ id }), {
            loading: 'Deleting permanently...',
            success: 'Document deleted',
            error: 'Failed to delete document',
        });
    }, [removeDocument]);

    // Clear All Trash Handler
    const handleClearTrash = useCallback(() => {
        toast.promise(clearTrash({}), {
            loading: 'Emptying trash...',
            success: 'Trash emptied',
            error: 'Failed to empty trash',
        });
    }, [clearTrash]);

    // Toggle Favorite Handler
    const handleToggleFavorite = useCallback((id: Id<"documents">) => {
        toggleFavorite({ id }).catch((err: any) => {
            console.error('Failed to toggle favorite:', err);
            toast.error('Failed to update favorite status');
        });
    }, [toggleFavorite]);

    // Bulk Add Tags Handler
    const handleBulkAddTags = useCallback(async (
        documentIds: Id<"documents">[],
        tagInput: string,
        onSuccess?: () => void
    ) => {
        const raw = tagInput.split(',').map(t => t.trim()).filter(Boolean);
        const uniq = Array.from(new Set(raw));

        if (uniq.length === 0) {
            toast.error('Enter at least one tag');
            return;
        }

        const tags = uniq.map((name) => ({ name }));
        const promise = Promise.all(
            documentIds.map((id) => addTagsToDocument({ documentId: id, tags }))
        );

        toast.promise(promise, {
            loading: 'Adding tags…',
            success: () => {
                onSuccess?.();
                return `Tagged ${documentIds.length} document${documentIds.length > 1 ? 's' : ''}`;
            },
            error: 'Failed to add tags',
        });
    }, [addTagsToDocument]);

    // Bulk Move to Folder Handler
    const handleBulkMove = useCallback(async (
        documentIds: Id<"documents">[],
        folderId: Id<"folders">,
        onSuccess?: () => void
    ) => {
        if (!folderId || documentIds.length === 0) {
            toast.error("Select a folder and documents first");
            return;
        }

        const promise = Promise.all(
            documentIds.map((id) => addDocumentToFolder({ documentId: id, folderId }))
        );

        toast.promise(promise, {
            loading: 'Moving…',
            success: () => {
                onSuccess?.();
                return `Moved ${documentIds.length} document${documentIds.length > 1 ? 's' : ''}`;
            },
            error: 'Failed to move documents',
        });
    }, [addDocumentToFolder]);

    // Bulk Update Sharing Handler
    const handleBulkShare = useCallback(async (
        documentIds: Id<"documents">[],
        isPublic: boolean,
        onSuccess?: () => void
    ) => {
        if (documentIds.length === 0) {
            toast.error("Select at least one document");
            return;
        }

        const promise = Promise.all(
            documentIds.map((id) => updateDocument({ id, isPublic }))
        );

        toast.promise(promise, {
            loading: isPublic ? 'Making public…' : 'Making private…',
            success: () => {
                onSuccess?.();
                return `Updated ${documentIds.length} document${documentIds.length > 1 ? 's' : ''}`;
            },
            error: 'Failed to update sharing',
        });
    }, [updateDocument]);

    return {
        // Mutations
        createDocument,
        createWithSnapshot,
        updateDocument,
        archiveDocument,
        restoreDocument,
        removeDocument,
        clearTrash,
        toggleFavorite,
        addTagsToDocument,
        addDocumentToFolder,

        // Handlers
        handleArchive,
        handleRestore,
        handleDelete,
        handleClearTrash,
        handleToggleFavorite,
        handleBulkAddTags,
        handleBulkMove,
        handleBulkShare,
    };
}
