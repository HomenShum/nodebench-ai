import { useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import PopoverMiniEditor from "./editors/mini/PopoverMiniEditor";

interface MentionHoverPreviewProps {
  editorContainer: HTMLElement | null;
  sourceDocumentId?: Id<"documents">;
}

interface HoverState {
  documentId: Id<"documents">;
  position: { x: number; y: number };
  label?: string;
}

export function MentionHoverPreview({ editorContainer, sourceDocumentId }: MentionHoverPreviewProps) {
  const [hover, setHover] = useState<HoverState | null>(null);
  const delayRef = useRef<NodeJS.Timeout | null>(null);
  const hideDelayRef = useRef<NodeJS.Timeout | null>(null);
  const [showQuickEdit, setShowQuickEdit] = useState(false);

  // Fetch preview when we have a documentId
  const preview = useQuery(
    api.documents.getPreviewById,
    hover ? { documentId: hover.documentId, maxLen: 200 } : "skip"
  );

  useEffect(() => {
    if (!editorContainer) return;

    const onPointerOver = (e: Event) => {
      const target = e.target as HTMLElement;
      const mentionEl = target?.closest('.mention');
      if (!mentionEl) return;

      // Try multiple attribute names used by Tiptap Mention
      const rawId =
        mentionEl.getAttribute('data-mention-id') ||
        mentionEl.getAttribute('data-id') ||
        mentionEl.getAttribute('data-document-id') ||
        undefined;
      if (!rawId) return;

      // Debounce/Delay before showing
      if (delayRef.current) clearTimeout(delayRef.current);
      delayRef.current = setTimeout(() => {
        const rect = mentionEl.getBoundingClientRect();
        setHover({
          documentId: rawId as unknown as Id<"documents">,
          position: { x: rect.left + rect.width / 2, y: rect.top },
          label: mentionEl.textContent || undefined,
        });
      }, 350);
    };

    const onPointerOut = (e: Event) => {
      const target = e.target as HTMLElement;
      const mentionEl = target?.closest('.mention');
      if (!mentionEl) return;
      if (delayRef.current) {
        clearTimeout(delayRef.current);
        delayRef.current = null;
      }
      // Delay hide to allow pointer to enter the popover region
      if (hideDelayRef.current) clearTimeout(hideDelayRef.current);
      hideDelayRef.current = setTimeout(() => {
        setHover(null);
        setShowQuickEdit(false);
      }, 200);
    };

    // Use capture to catch events from mention spans inside the editor
    editorContainer.addEventListener('pointerover', onPointerOver, true);
    editorContainer.addEventListener('pointerout', onPointerOut, true);

    return () => {
      if (delayRef.current) clearTimeout(delayRef.current);
      editorContainer.removeEventListener('pointerover', onPointerOver, true);
      editorContainer.removeEventListener('pointerout', onPointerOut, true);
    };
  }, [editorContainer]);

  // Navigate to the mentioned document when clicking an @mention
  useEffect(() => {
    if (!editorContainer) return;

    const onClick = (e: Event) => {
      const target = e.target as HTMLElement;
      const mentionEl = target?.closest('.mention');
      if (!mentionEl) return;

      const rawId =
        mentionEl.getAttribute('data-mention-id') ||
        mentionEl.getAttribute('data-id') ||
        mentionEl.getAttribute('data-document-id') ||
        undefined;
      if (!rawId) return;

      const me = e as MouseEvent;
      const openInGrid = Boolean(me.metaKey || me.ctrlKey || me.button === 1);

      // If the mention contains a link, avoid default navigation
      const link = (target.closest('a') || mentionEl.querySelector('a'));
      if (link) {
        me.preventDefault?.();
        me.stopPropagation?.();
      }

      try {
        // Let the app-level layout decide how to open/select the document
        window.dispatchEvent(
          new CustomEvent('nodebench:openDocument', {
            detail: { documentId: rawId, openInGrid, sourceDocumentId },
          })
        );
      } catch {
        // no-op
      }
    };

    // Use capture to ensure we catch clicks on nested nodes within the mention
    editorContainer.addEventListener('click', onClick, true);
    return () => {
      editorContainer.removeEventListener('click', onClick, true);
    };
  }, [editorContainer, sourceDocumentId]);

  if (!hover) return null;

  return (
    <div
      className="fixed z-50 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg shadow-lg p-3 max-w-sm pointer-events-auto"
      style={{
        left: hover.position.x,
        top: hover.position.y - 10,
        transform: 'translate(-50%, -100%)',
      }}
      onMouseEnter={() => { if (hideDelayRef.current) { clearTimeout(hideDelayRef.current); hideDelayRef.current = null; } }}
      onMouseLeave={() => {
        if (hideDelayRef.current) clearTimeout(hideDelayRef.current);
        hideDelayRef.current = setTimeout(() => { setHover(null); setShowQuickEdit(false); }, 150);
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="text-xs font-medium text-[var(--text-primary)] truncate" title={hover.label || preview?.title || 'Document'}>
            {preview?.title || hover.label || 'Document'}{preview?.isArchived ? ' (Archived)' : ''}
          </div>
        </div>
        <button
          type="button"
          className="text-[10px] px-2 py-0.5 rounded border border-[var(--border-color)] bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowQuickEdit((v) => !v); }}
          title={showQuickEdit ? "Hide Quick Edit" : "Quick Edit"}
        >
          {showQuickEdit ? "Hide" : "Quick Edit"}
        </button>
      </div>
      <div className="mt-1 text-[11px] text-[var(--text-muted)] whitespace-pre-wrap">
        {preview?.contentPreview || 'No preview available.'}
      </div>
      {showQuickEdit && (
        <div className="mt-2">
          <PopoverMiniEditor kind="document" documentId={hover.documentId} onClose={() => setShowQuickEdit(false)} />
        </div>
      )}
      <div 
        className="absolute left-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[var(--border-color)]"
        style={{ transform: 'translateX(-50%)' }}
      />
    </div>
  );
}
