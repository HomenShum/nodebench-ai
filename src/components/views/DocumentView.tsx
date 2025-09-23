import { useQuery } from "convex/react";
import { useEffect, useRef, useState, useCallback } from "react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { DocumentHeader } from "@/components/DocumentHeader";
// Use the richer Editor wrapper (InlineRichEditor) so proposals/mentions work
import { Editor } from "@/components/Editor/Editor";
import UnifiedEditor from "@/components/UnifiedEditor";
import { FileViewer } from "@/components/views/FileViewer";
import { SpreadsheetView } from "@/components/views/SpreadsheetView";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { isValidConvexId } from "@/lib/ids";

interface DocumentViewProps {
  documentId: Id<"documents">;
  isGridMode?: boolean;
  isFullscreen?: boolean;
}

// tiny, local pointer gate (matches Editor's logic)
function usePointerGate() {
  const downRef = useRef(false);

  useEffect(() => {
    const onDown = () => (downRef.current = true);
    const onUp = () => (downRef.current = false);
    window.addEventListener("pointerdown", onDown, true);
    window.addEventListener("pointerup", onUp, true);
    return () => {
      window.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("pointerup", onUp, true);
    };
  }, []);

  const waitForPointerUp = useCallback(() => {
    if (!downRef.current) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const done = () => {
        window.removeEventListener("pointerup", done, true);
        resolve();
      };
      window.addEventListener("pointerup", done, true);
    });
  }, []);

  // blocks the one stale mouseup that PM registered before we unmount
  const blockNextMouseUpIfNeeded = useCallback(() => {
    if (!downRef.current) return;
    const blockOnce = (e: Event) => {
      try { (e as any).stopImmediatePropagation?.(); } catch { /* noop */ }
      window.removeEventListener("mouseup", blockOnce, true);
    };
    window.addEventListener("mouseup", blockOnce, true);
  }, []);

  return { isPointerDown: () => downRef.current, waitForPointerUp, blockNextMouseUpIfNeeded } as const;
}

export function DocumentView({ documentId, isGridMode = false, isFullscreen = false }: DocumentViewProps) {
  // Validate id before issuing any Convex query. When invalid, skip the query entirely.
  const isValidId = isValidConvexId(documentId);
  const document = useQuery(api.documents.getById, isValidId ? { documentId } : "skip");
  // Gate editor swap on pointer-up to avoid ProseMirror mouseup-after-destroy race
  const [mountedDocId, setMountedDocId] = useState<Id<"documents">>(documentId);
  const prevDocIdRef = useRef<Id<"documents">>(documentId);
  const { waitForPointerUp, blockNextMouseUpIfNeeded } = usePointerGate();

  // When documentId changes, delay swapping the Editor until after pointer-up (unconditional hook)
  useEffect(() => {
    if (documentId === prevDocIdRef.current) return;
    let cancelled = false;
    void (async () => {
      blockNextMouseUpIfNeeded();
      await waitForPointerUp();
      // next frame to let native handlers unwind
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      if (!cancelled) {
        setMountedDocId(documentId);
        prevDocIdRef.current = documentId;
      }
    })();
    return () => { cancelled = true; };
  }, [documentId, waitForPointerUp, blockNextMouseUpIfNeeded]);

  // Render branch only in JSX (no early hook returns)
  const isSpreadsheetDocument = !!document && document.documentType === "file" && document.fileType === "csv";
  const shouldShowHeader = !isGridMode || isFullscreen;
  const shouldShowCoverImage = shouldShowHeader && !!document && !isSpreadsheetDocument;

  // Feature flag: allow testing UnifiedEditor in place of legacy Editor via URL or localStorage
  const useUnifiedEditorFlag = (() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const q = sp.get("ue");
      if (q === "1" || q === "true") return true;
      const ls = window.localStorage.getItem("useUnifiedEditor");
      return ls === "1" || ls === "true";
    } catch {
      return false;
    }
  })();

  // Determine if this viewer can edit: owner or public+allowPublicEdit
  const userId = useQuery(api.presence.getUserId);
  const isOwner = !!userId && !!document && userId === (document as any).createdBy;

	  // Timeline Gantt: check if this doc has an associated agent timeline
	  const timelineBundle = useQuery(api.agentTimelines.getByDocumentId, isValidId ? { documentId } : "skip");

  const editable = !!isOwner || (!!document?.isPublic && !!(document as any).allowPublicEdit);

  return (
    <ErrorBoundary title="Document Error">
      <div className="flex flex-col h-full bg-[var(--bg-primary)]">
        {(!isValidId) ? (
          <div className="flex items-center justify-center h-full bg-[var(--bg-primary)]">
            <div className="text-center max-w-md mx-4">
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Invalid document</h2>
              <p className="text-[var(--text-secondary)] mb-2">The provided document id is invalid or missing.</p>
              {isGridMode ? (
                <p className="text-[var(--text-tertiary)] text-sm">Close this tab or select another document from the sidebar.</p>
              ) : (
                <p className="text-[var(--text-tertiary)] text-sm">Please select another document from the sidebar.</p>
              )}
            </div>
          </div>
        ) : (document === undefined) ? (
          <div className="flex items-center justify-center h-full bg-[var(--bg-primary)]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-primary)]"></div>
          </div>
        ) : (document === null) ? (
          <div className="flex items-center justify-center h-full bg-[var(--bg-primary)]">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Document not found</h2>
              <p className="text-[var(--text-secondary)]">This document may have been deleted or you don't have permission to view it.</p>
            </div>
          </div>
        ) : (
          <>
            {shouldShowHeader && !isSpreadsheetDocument && <DocumentHeader document={document} />}
            <div className="flex-1 flex flex-col overflow-hidden">
              {document.coverImage && shouldShowCoverImage && (
                <div className="h-48 bg-[var(--bg-secondary)] border-b border-[var(--border-color)]">
                  <CoverImage storageId={document.coverImage} />
                </div>
              )}
              <div className={`flex-1 ${isSpreadsheetDocument ? '' : 'overflow-y-auto'} bg-[var(--bg-primary)]`}>
                {(document.documentType === "timeline") || (timelineBundle !== undefined && timelineBundle !== null) ? (
                  <div className="h-full w-full flex items-center justify-center">
                    <div className="text-[var(--text-secondary)] text-sm">Timeline view is not available.</div>
                  </div>
                ) : document.documentType === "file" ? (
                  document.fileType === "csv" ? (
                    <SpreadsheetView documentId={documentId} isGridMode={isGridMode} isFullscreen={isFullscreen} />
                  ) : (
                    <FileViewer documentId={documentId} />
                  )
                ) : (
                  <div className={isGridMode && !isFullscreen ? 'w-full h-full px-2 py-2' : 'max-w-4xl mx-auto px-6 py-8'}>
                    {useUnifiedEditorFlag ? (
                      <UnifiedEditor
                        documentId={mountedDocId}
                        mode={isGridMode && !isFullscreen ? 'quickEdit' : 'full'}
                        isGridMode={isGridMode}
                        isFullscreen={isFullscreen}
                        editable={editable}
                      />
                    ) : (
                      // Legacy editor remains default until we flip the flag
                      <Editor documentId={mountedDocId} isGridMode={isGridMode} isFullscreen={isFullscreen} editable={editable} />
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </ErrorBoundary>
  );
}

function CoverImage({ storageId }: { storageId: Id<"_storage"> }) {
  const imageUrl = useQuery(api.files.getUrl, { storageId });

  if (!imageUrl) {
    return <div className="h-full bg-[var(--bg-secondary)] animate-pulse" />;
  }

  return (
    <img
      src={imageUrl}
      alt="Cover"
      className="w-full h-full object-cover"
    />
  );
}
