import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { Id } from "../../convex/_generated/dataModel";
import { X } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import UnifiedEditor from "./UnifiedEditor";
import SpreadsheetMiniEditor from "./editors/mini/SpreadsheetMiniEditor";

interface MiniEditorPopoverProps {
  isOpen: boolean;
  documentId: Id<"documents"> | null;
  anchorEl: HTMLElement | null;
  onClose: () => void;
}

const portalRootId = "mini-editor-portal-root";

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
  const [pos, setPos] = useState<{ top: number; left: number; placement: "bottom" | "top" }>({ top: 0, left: 0, placement: "bottom" });

  const recompute = React.useCallback(() => {
    if (!anchorEl) return;
    const rect = anchorEl.getBoundingClientRect();
    const margin = 8;
    const width = Math.min(640, Math.max(360, rect.width));
    const height = 420; // outer container height

    // Default place below
    let top = rect.bottom + margin + window.scrollY;
    let placement: "bottom" | "top" = "bottom";
    // If overflow bottom, place above
    if (top + height > window.scrollY + window.innerHeight) {
      top = rect.top - margin - height + window.scrollY;
      placement = "top";
    }

    let left = rect.left + window.scrollX;
    // If overflow right, shift left
    if (left + width > window.scrollX + window.innerWidth - margin) {
      left = Math.max(margin, window.scrollX + window.innerWidth - margin - width);
    }

    setPos({ top, left, placement });
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

export default function MiniEditorPopover({ isOpen, documentId, anchorEl, onClose }: MiniEditorPopoverProps) {
  const portalRoot = useMemo(() => (typeof window !== "undefined" ? ensurePortalRoot() : null), []);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const { top, left } = useAnchoredPosition(anchorEl, [isOpen, documentId]);

  // Close on Escape
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

  if (!isOpen || !documentId || !anchorEl || !portalRoot) return null;

  const content = (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="false"
      aria-label="Mini editor"
      className="fixed z-[70] w-[min(640px,calc(100vw-24px))] shadow-2xl rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]"
      style={{ top, left }}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-color)] bg-[var(--bg-primary)] rounded-t-xl">
        <div className="text-xs text-[var(--text-secondary)]">Quick Edit</div>
        <button
          aria-label="Close mini editor"
          className="w-7 h-7 p-1.5 rounded-md flex items-center justify-center bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-[var(--text-secondary)]"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-3 max-h-[360px] overflow-auto">
        <MiniContent documentId={documentId} onClose={onClose} />
      </div>
    </div>
  );

  return ReactDOM.createPortal(content, portalRoot);
}

function MiniContent({ documentId, onClose }: { documentId: Id<"documents">; onClose: () => void }) {
  const fileDoc = useQuery(api.fileDocuments.getFileDocument, { documentId });
  if (fileDoc === undefined) {
    return (
      <div className="space-y-2">
        <div className="animate-pulse h-4 w-24 bg-[var(--bg-primary)] rounded" />
        <div className="animate-pulse h-8 w-full bg-[var(--bg-primary)] rounded" />
      </div>
    );
  }
  if (!fileDoc) {
    // Not a file document or no access: fall back to unified document quick editor
    return (
      <div className="min-h-[240px]">
        <UnifiedEditor documentId={documentId} mode="quickNote" />
      </div>
    );
  }
  // Open spreadsheet mini editor for CSV or Excel (by stored type OR filename extension)
  {
    const name = String(fileDoc?.file?.fileName || '').toLowerCase();
    const ft = String(fileDoc?.document?.fileType || '').toLowerCase();
    const isSpreadsheet = ft === 'csv' || ft === 'excel' || /\.(xlsx?)$/.test(name) || /\.csv$/.test(name);
    if (isSpreadsheet) {
      return (
        <div className="min-h-[240px]">
          <SpreadsheetMiniEditor documentId={documentId} onClose={onClose} />
        </div>
      );
    }
  }
  return (
    <div className="min-h-[240px]">
      <UnifiedEditor documentId={documentId} mode="quickNote" />
    </div>
  );
}
