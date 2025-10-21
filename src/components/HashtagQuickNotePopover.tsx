import React, { useEffect, useMemo, useRef } from "react";
import ReactDOM from "react-dom";
import { Id } from "../../convex/_generated/dataModel";
import { X, ExternalLink } from "lucide-react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "react-hot-toast";

interface HashtagQuickNotePopoverProps {
  isOpen: boolean;
  dossierId: Id<"documents"> | null;
  hashtag: string | null;
  anchorEl: HTMLElement | null;
  onClose: () => void;
}

function ensurePortalRoot(): HTMLElement {
  let root = document.getElementById("hashtag-popover-root");
  if (!root) {
    root = document.createElement("div");
    root.id = "hashtag-popover-root";
    document.body.appendChild(root);
  }
  return root;
}

function useAnchoredPosition(anchorEl: HTMLElement | null, deps: any[]) {
  const [pos, setPos] = React.useState({ top: 0, left: 0 });

  const recompute = React.useCallback(() => {
    if (!anchorEl) return;
    const rect = anchorEl.getBoundingClientRect();
    const margin = 8;
    const width = Math.min(640, Math.max(360, rect.width));
    const height = 420;

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

    setPos({ top, left });
  }, [anchorEl]);

  React.useLayoutEffect(() => {
    recompute();
    window.addEventListener("resize", recompute);
    window.addEventListener("scroll", recompute, true);
    return () => {
      window.removeEventListener("resize", recompute);
      window.removeEventListener("scroll", recompute, true);
    };
  }, [recompute, ...deps]);

  return pos;
}

export default function HashtagQuickNotePopover({
  isOpen,
  dossierId,
  hashtag,
  anchorEl,
  onClose,
}: HashtagQuickNotePopoverProps) {
  const portalRoot = useMemo(() => (typeof window !== "undefined" ? ensurePortalRoot() : null), []);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const { top, left } = useAnchoredPosition(anchorEl, [isOpen, dossierId]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [isOpen, onClose]);

  if (!isOpen || !dossierId || !portalRoot) return null;

  return ReactDOM.createPortal(
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        top: `${top}px`,
        left: `${left}px`,
        width: "640px",
        maxHeight: "420px",
        zIndex: 9999,
      }}
      className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg shadow-2xl overflow-hidden"
    >
      <HashtagContent dossierId={dossierId} hashtag={hashtag || ""} onClose={onClose} />
    </div>,
    portalRoot
  );
}

function HashtagContent({
  dossierId,
  hashtag,
  onClose,
}: {
  dossierId: Id<"documents">;
  hashtag: string;
  onClose: () => void;
}) {
  const reindexMyDocuments = useAction(api.ragEnhancedBatchIndex.reindexMyDocuments);
  const [isReindexing, setIsReindexing] = React.useState(false);

  const handleReindex = async () => {
    try {
      setIsReindexing(true);
      const res: any = await reindexMyDocuments({});
      toast.success(`Re-indexed ${res?.totalSuccess ?? 0}/${res?.totalProcessed ?? 0} documents`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Re-index failed: ${msg}`);
    } finally {
      setIsReindexing(false);
    }
  };

  const document = useQuery(api.documents.getById, { documentId: dossierId });

  const handleOpenFullDossier = () => {
    window.dispatchEvent(
      new CustomEvent("nodebench:openDocument", {
        detail: { documentId: dossierId },
      })
    );
    onClose();
  };

  if (document === undefined) {
    return (
      <div className="p-6 space-y-4">
        <div className="animate-pulse h-6 w-32 bg-[var(--bg-secondary)] rounded" />
        <div className="animate-pulse h-4 w-full bg-[var(--bg-secondary)] rounded" />
        <div className="animate-pulse h-4 w-3/4 bg-[var(--bg-secondary)] rounded" />
      </div>
    );
  }

  if (!document) {
    return (
      <div className="p-6">
        <p className="text-sm text-[var(--text-muted)]">Hashtag dossier not found</p>
      </div>
    );
  }

  // Parse TipTap content to extract context
  let contextItems: Array<{ title: string; snippet?: string; matchType: string; documentId?: string }> = [];
  try {
    const content = JSON.parse(document.content || "{}");
    if (content.content && Array.isArray(content.content)) {
      // Extract paragraphs that contain document references
      // New format: { type: "paragraph", content: [{ type: "text", text: "🎯 " }, { type: "text", text: "@", }, { type: "text", text: "Title", marks: [{ type: "link", attrs: { href: "/documents/id" } }] }, { type: "text", text: " (95%)" }] }

      let currentSnippet: string | undefined;

      content.content.forEach((node: any, idx: number) => {
        if (node.type === "paragraph" && node.content) {
          // Check if this paragraph has a link (document reference)
          const hasLink = node.content.some((c: any) =>
            c.marks?.some((m: any) => m.type === "link" && m.attrs?.href?.startsWith("/documents/"))
          );

          if (hasLink) {
            // Extract badge emoji to determine match type
            const badgeText = node.content.find((c: any) => c.type === "text" && /[🎯📍📄🔍]/.test(c.text))?.text || "";
            const matchType =
              badgeText.includes("🎯") ? "hybrid" :
              badgeText.includes("📍") ? "exact" :
              badgeText.includes("📄") ? "exact-content" :
              "semantic";

            // Extract title from link text
            const linkNode = node.content.find((c: any) =>
              c.marks?.some((m: any) => m.type === "link")
            );
            const title = linkNode?.text || "";

            // Extract document ID from link href
            const linkMark = linkNode?.marks?.find((m: any) => m.type === "link");
            const href = linkMark?.attrs?.href || "";
            const documentId = href.split("/documents/")[1] || undefined;

            if (title) {
              contextItems.push({
                title,
                matchType,
                documentId,
                snippet: currentSnippet,
              });
              currentSnippet = undefined; // Reset snippet after using it
            }
          } else {
            // Check if this is a snippet paragraph (italic text)
            const isSnippet = node.content.some((c: any) =>
              c.marks?.some((m: any) => m.type === "italic")
            );

            if (isSnippet) {
              // Store snippet for next document reference
              currentSnippet = node.content
                .map((c: any) => c.text || "")
                .join("")
                .trim();
            }
          }
        }

    });
    }
  } catch (error) {
    console.error("[HashtagQuickNotePopover] Error parsing content:", error);
  }

  return (
    <div className="flex flex-col h-full max-h-[420px]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">#{hashtag}</h3>
          <span className="text-xs text-[var(--text-muted)] bg-[var(--bg-primary)] px-2 py-1 rounded">
            {contextItems.length} related {contextItems.length === 1 ? "document" : "documents"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReindex}
            disabled={isReindexing}
            className="px-2 py-1 text-xs border rounded-md hover:bg-[var(--bg-hover)] disabled:opacity-60"
            title="Re-index your documents into Enhanced RAG so hashtag search uses LLM validation"
          >
            {isReindexing ? "Re-indexing…" : "Re-index RAG"}
          </button>
          <button
            onClick={handleOpenFullDossier}
            className="p-2 hover:bg-[var(--bg-hover)] rounded-md transition-colors"
            title="Open full dossier"
          >
            <ExternalLink className="w-4 h-4 text-[var(--text-muted)]" />
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--bg-hover)] rounded-md transition-colors"
            title="Close"
          >
            <X className="w-4 h-4 text-[var(--text-muted)]" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {contextItems.length === 0 ? (
          <div className="text-center py-8 px-6">
            <p className="text-sm text-[var(--text-muted)] italic">
              No related documents found yet. Context is being gathered...
            </p>
            <button
              onClick={handleOpenFullDossier}
              className="mt-4 text-sm text-[var(--accent-primary)] hover:underline"
            >
              Open full dossier to see details
            </button>
          </div>
        ) : (
          <div className="space-y-2 p-3">
            {contextItems.map((item, idx) => (
              <div key={idx}>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (item.documentId) {
                      // Open the specific document
                      window.dispatchEvent(
                        new CustomEvent("nodebench:openDocument", {
                          detail: { documentId: item.documentId },
                        })
                      );
                      onClose();
                    } else {
                      // Fallback: open the dossier
                      handleOpenFullDossier();
                    }
                  }}
                  className="block p-3 rounded-lg border border-[var(--border-color)] hover:border-[var(--accent-primary)] hover:shadow-sm transition-all group cursor-pointer"
                >
                  <div className="flex gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-[var(--text-primary)] line-clamp-2 group-hover:text-[var(--accent-primary)] transition-colors">
                        {item.matchType === "hybrid" ? "🎯" :
                         item.matchType === "exact" || item.matchType === "exact-title" || item.matchType === "exact-hybrid" ? "📍" :
                         item.matchType === "exact-content" ? "📄" :
                         "🔍"}{" "}
                        {item.title}
                      </h4>
                      {item.snippet && (
                        <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">
                          {item.snippet}
                        </p>
                      )}
                    </div>
                  </div>
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-[var(--border-color)] bg-[var(--bg-secondary)]">
        <p className="text-xs text-[var(--text-muted)]">
          💡 <strong>Tip:</strong> Double-click the hashtag to open the full dossier view
        </p>
      </div>
    </div>
  );
}

