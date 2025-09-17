import { useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import PopoverMiniEditor from "./editors/mini/PopoverMiniEditor";

interface TagHoverPreviewProps {
  editorContainer: HTMLElement | null;
}

interface HoverState {
  name: string;
  position: { x: number; y: number };
  label?: string;
}

function iconForKind(kind?: string) {
  const k = (kind || "").toLowerCase();
  if (k === "keyword") return "🏷️";
  if (k === "entity") return "🏢";
  if (k === "topic") return "📚";
  if (k === "community") return "👥";
  if (k === "relationship") return "🔗";
  return "#";
}

export function TagHoverPreview({ editorContainer }: TagHoverPreviewProps) {
  const [hover, setHover] = useState<HoverState | null>(null);
  const delayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [quickEditDocId, setQuickEditDocId] = useState<Id<"documents"> | null>(null);

  const preview = useQuery(
    api.tags.getPreviewByName,
    hover ? { name: hover.name, limit: 5 } : "skip"
  );

  useEffect(() => {
    if (!editorContainer) return;

    const onPointerOver = (e: Event) => {
      const target = e.target as HTMLElement;
      const tagEl = target.closest('.mention.hashtag');
      if (!tagEl) return;

      const name = tagEl.getAttribute('data-tag-name');
      if (!name) return;

      if (delayRef.current) clearTimeout(delayRef.current);
      delayRef.current = setTimeout(() => {
        const rect = tagEl.getBoundingClientRect();
        setHover({
          name,
          position: { x: rect.left + rect.width / 2, y: rect.top },
          label: tagEl.textContent || undefined,
        });
      }, 300);
    };

    const onPointerOut = (e: Event) => {
      const target = e.target as HTMLElement;
      const tagEl = target?.closest('.mention.hashtag');
      if (!tagEl) return;
      if (delayRef.current) {
        clearTimeout(delayRef.current);
        delayRef.current = null;
      }
      setHover(null);
    };

    editorContainer.addEventListener('pointerover', onPointerOver, true);
    editorContainer.addEventListener('pointerout', onPointerOut, true);

    return () => {
      if (delayRef.current) clearTimeout(delayRef.current);
      editorContainer.removeEventListener('pointerover', onPointerOver, true);
      editorContainer.removeEventListener('pointerout', onPointerOut, true);
    };
  }, [editorContainer]);

  if (!hover) return null;

  const kind = preview?.kind;
  const count = preview?.count ?? 0;
  const topDocs = preview?.topDocuments ?? [];

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
        hideDelayRef.current = setTimeout(() => { setHover(null); setQuickEditDocId(null); }, 150);
      }}
    >
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span className="text-base">{iconForKind(kind)}</span>
          <div className="text-xs font-medium text-[var(--text-primary)] truncate">
            {`#${preview?.name || hover.name}`}
          </div>
          {kind && (
            <span className={`px-1.5 py-0.5 text-[10px] rounded-full border border-[var(--border-color)] text-[var(--text-secondary)]`}>
              {kind}
            </span>
          )}
        </div>
        <div className="text-[11px] text-[var(--text-muted)]">
          {count} linked document{count === 1 ? '' : 's'}
        </div>
        {topDocs.length > 0 && (
          <ul className="mt-1 space-y-0.5">
            {topDocs.map((d) => (
              <li key={d._id} className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-[var(--text-secondary)] truncate" title={d.title}>{d.title}</span>
                <button
                  type="button"
                  className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--border-color)] bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setQuickEditDocId(d._id as unknown as Id<"documents">); }}
                  title="Quick Edit"
                >
                  Edit
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {quickEditDocId && (
        <div className="mt-2">
          <PopoverMiniEditor kind="document" documentId={quickEditDocId} onClose={() => setQuickEditDocId(null)} />
        </div>
      )}
      <div 
        className="absolute left-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[var(--border-color)]"
        style={{ transform: 'translateX(-50%)' }}
      />
    </div>
  );
}
