import React, { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState, Component, type ReactNode, type ErrorInfo } from "react";
import ReactDOM from "react-dom";
import { Id } from "../../../convex/_generated/dataModel";
import { X } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

// Lazy-load heavy editors so they don't bloat the main bundle.
const UnifiedEditor = React.lazy(() => import("@features/editor/components/UnifiedEditor"));
const SpreadsheetMiniEditor = React.lazy(() => import("@/features/documents/editors/SpreadsheetMiniEditor"));
const DossierMiniEditor = React.lazy(() => import("@/features/documents/editors/DossierMiniEditor"));

// Error boundary to gracefully handle editor initialization failures
class EditorErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[EditorErrorBoundary] Editor failed to load:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="p-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded">
          Failed to load editor. The document may have invalid content.
        </div>
      );
    }
    return this.props.children;
  }
}

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
      className="fixed z-[70] w-[min(640px,calc(100vw-24px))] shadow-2xl rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
      style={{ top, left }}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-t-xl">
        <div className="text-xs text-gray-600 dark:text-gray-400">Quick Edit</div>
        <button
          type="button"
          aria-label="Close mini editor"
          className="w-7 h-7 p-1.5 rounded-md flex items-center justify-center bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-3 max-h-[360px] overflow-auto bg-white dark:bg-gray-900 rounded-b-xl">
        <MiniContent documentId={documentId} onClose={onClose} />
      </div>
    </div>
  );

  return ReactDOM.createPortal(content, portalRoot);
}

function MiniContent({ documentId, onClose }: { documentId: Id<"documents">; onClose: () => void }) {
  const document = useQuery(api.domains.documents.documents.getById, { documentId });
  const fileDoc = useQuery(api.domains.documents.fileDocuments.getFileDocument, { documentId });

  if (document === undefined || fileDoc === undefined) {
    return (
      <div className="space-y-2">
        <div className="animate-pulse h-4 w-24 bg-[var(--bg-primary)] rounded" />
        <div className="animate-pulse h-8 w-full bg-[var(--bg-primary)] rounded" />
      </div>
    );
  }

  // Check if this is a dossier document
  if (document?.dossierType === "primary") {
    return (
      <div className="min-h-[240px]">
        <Suspense fallback={<div className="text-xs text-[var(--text-secondary)]">Loading editor…</div>}>
          <DossierMiniEditor documentId={documentId} onClose={onClose} />
        </Suspense>
      </div>
    );
  }

  if (!fileDoc) {
    // Not a file document or no access: fall back to unified document quick editor
    return (
      <div className="min-h-[240px]">
        <EditorErrorBoundary>
          <Suspense fallback={<div className="text-xs text-[var(--text-secondary)]">Loading editor…</div>}>
            <UnifiedEditor documentId={documentId} mode="quickNote" />
          </Suspense>
        </EditorErrorBoundary>
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
          <Suspense fallback={<div className="text-xs text-[var(--text-secondary)]">Loading spreadsheet…</div>}>
            <SpreadsheetMiniEditor documentId={documentId} onClose={onClose} />
          </Suspense>
        </div>
      );
    }
  }
  return (
    <div className="min-h-[240px]">
      <EditorErrorBoundary>
        <Suspense fallback={<div className="text-xs text-[var(--text-secondary)]">Loading editor…</div>}>
          <UnifiedEditor documentId={documentId} mode="quickNote" />
        </Suspense>
      </EditorErrorBoundary>
    </div>
  );
}
