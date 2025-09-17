import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom";
import type { Id } from "../../../convex/_generated/dataModel";
import DualCreateMiniPanel from "../editors/mini/DualCreateMiniPanel";
import DualEditMiniPanel from "../editors/mini/DualEditMiniPanel";
import PopoverMiniEditor from "../editors/mini/PopoverMiniEditor";

type Props = {
  isOpen: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  kind: "event" | "task" | "create" | "createBoth";
  eventId?: Id<"events">;
  taskId?: Id<"tasks">;
  dateMs?: number;
  defaultKind?: "task" | "event";
  defaultTitle?: string;
  defaultAllDay?: boolean;
  documentIdForAssociation?: Id<"documents"> | null;
};

const portalRootId = "agenda-editor-portal-root";

function ensurePortalRoot(): HTMLElement {
  let root = document.getElementById(portalRootId);
  if (!root) {
    root = document.createElement("div");
    root.id = portalRootId;
    document.body.appendChild(root);
  }
  return root;
}

function useAnchoredPosition(anchorEl: HTMLElement | null, deps: React.DependencyList = []) {
  const [pos, setPos] = useState<{ top: number; left: number; placement: "bottom" | "top" } | null>(null);

  const recompute = React.useCallback(() => {
    if (!anchorEl) return;
    // Prefer anchoring to the inner agenda mini row when present
    const inner = anchorEl.querySelector<HTMLElement>('[data-agenda-mini-row]');
    const target: HTMLElement = inner ?? anchorEl;
    const rect = target.getBoundingClientRect();
    const margin = 8;
    const width = Math.min(560, Math.max(360, rect.width));
    const height = 500; // approximate outer height

    // Default: open to the right of the anchor (east placement)
    // Note: popover is fixed-position; use viewport coordinates directly (no scroll offsets).
    let top = rect.top;
    // Clamp vertically within viewport
    if (top + height > window.innerHeight - margin) {
      top = Math.max(margin, window.innerHeight - margin - height);
    }

    // Prefer opening to the RIGHT of the anchor
    let left = rect.right + margin;
    const viewportRight = window.innerWidth - margin;
    // If not enough space on the right, open to the LEFT of the anchor instead of overlapping
    if (left + width > viewportRight) {
      left = rect.left - width - margin;
    }
    // Clamp within viewport bounds
    const viewportLeft = margin;
    if (left < viewportLeft) left = viewportLeft;
    if (left + width > viewportRight) {
      left = Math.max(viewportLeft, viewportRight - width);
    }

    setPos({ top, left, placement: "bottom" });
  }, [anchorEl]);

  useLayoutEffect(() => {
    recompute();
    const onResize = () => recompute();
    const onScroll = () => recompute();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorEl, ...deps]);

  return pos;
}

export default function AgendaEditorPopover({ isOpen, anchorEl, onClose, kind, eventId, taskId, dateMs, defaultKind: _defaultKind, defaultTitle, defaultAllDay, documentIdForAssociation }: Props) {
  const portalRoot = useMemo(() => (typeof window !== "undefined" ? ensurePortalRoot() : null), []);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pos = useAnchoredPosition(anchorEl, [isOpen, eventId, taskId, dateMs]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const onDocClick = (e: MouseEvent) => {
      const el = containerRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [isOpen, onClose]);

  // Do not render until we have a computed position to avoid flashing at (0,0)
  if (!isOpen || !anchorEl || !portalRoot || !pos) return null;

  const content = (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="false"
      aria-label="Agenda editor"
      className="fixed z-[9999] w-[min(560px,calc(100vw-24px))] shadow-2xl rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]"
      style={{ top: pos.top, left: pos.left }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div className="p-2">
        {kind === "event" && eventId && (
          <PopoverMiniEditor kind="event" eventId={eventId} onClose={onClose} documentIdForAssociation={documentIdForAssociation} />
        )}
        {kind === "task" && taskId && (
          <PopoverMiniEditor kind="task" taskId={taskId} onClose={onClose} />
        )}
        {kind === "create" && typeof dateMs === "number" && (
          <DualCreateMiniPanel
            dateMs={dateMs}
            onClose={onClose}
            defaultTitle={defaultTitle}
            defaultAllDay={defaultAllDay}
            documentIdForAssociation={documentIdForAssociation}
          />
        )}
        {kind === "createBoth" && typeof dateMs === "number" && (
          <DualEditMiniPanel
            dateMs={dateMs}
            onClose={onClose}
            defaultTitle={defaultTitle}
            defaultAllDay={defaultAllDay}
            documentIdForAssociation={documentIdForAssociation}
          />
        )}
      </div>
    </div>
  );

  return ReactDOM.createPortal(content, portalRoot);
}
