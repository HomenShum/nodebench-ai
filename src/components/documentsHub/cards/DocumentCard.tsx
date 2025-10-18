/**
 * DocumentCard Component
 * 
 * A card component for displaying individual documents with:
 * - Visual theming based on document type
 * - Quick actions (edit, favorite, delete)
 * - Selection support (checkbox)
 * - Single/double click handling
 * - Metadata pills display
 */

import { useRef, memo } from "react";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Calendar, Edit3, Star, Trash2, Link2 } from "lucide-react";
import { FileTypeIcon } from "../../FileTypeIcon";
import MetaPills from "../../MetaPills";
import { docToPills } from "../../../lib/metaPillMappers";
import { inferFileType, type FileType } from "../../../lib/fileTypes";
import { getThemeForFileType } from "../../../lib/documentThemes";
import type { DocumentCardData } from "../utils/documentHelpers";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export interface DocumentCardProps {
  doc: DocumentCardData;
  onSelect: (documentId: Id<"documents">) => void;
  onDelete?: (documentId: Id<"documents">) => void;
  onToggleFavorite?: (documentId: Id<"documents">) => void;
  hybrid?: boolean;
  isDragging?: boolean;
  onOpenMiniEditor?: (documentId: Id<"documents">, anchorEl: HTMLElement) => void;
  openOnSingleClick?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (documentId: Id<"documents">) => void;
  onCardMouseClick?: (documentId: Id<"documents">, e: React.MouseEvent) => boolean | void;
  onAnalyzeFile?: (doc: DocumentCardData) => void;
  analyzeRunning?: boolean;
}

/**
 * Get the appropriate icon for a document type
 */
const getDocumentTypeIcon = (doc: DocumentCardData) => {
  let t: FileType;

  if (doc.documentType === "file") {
    const ft = String(doc.fileType || "").toLowerCase();

    if (
      [
        "video",
        "audio",
        "image",
        "csv",
        "pdf",
        "excel",
        "json",
        "text",
        "code",
        "web",
        "document",
      ].includes(ft)
    ) {
      t = ft as FileType;
    } else {
      const nameGuess = doc.fileName || doc.title;
      t = inferFileType({ name: nameGuess });
    }
  } else {
    const lower = String(doc.title || "").toLowerCase();
    const looksLikeFile =
      /\.(csv|xlsx|xls|pdf|mp4|mov|webm|avi|mkv|jpg|jpeg|png|webp|gif|json|txt|md|markdown|js|ts|tsx|jsx|py|rb|go|rs|html|css|scss|sh)$/.test(
        lower,
      );

    t = looksLikeFile
      ? inferFileType({ name: doc.title })
      : inferFileType({ name: doc.title, isNodebenchDoc: true });
  }

  return <FileTypeIcon type={t} className="h-5 w-5" />;
};

export function DocumentCard({
  doc,
  onSelect,
  onDelete,
  onToggleFavorite,
  hybrid = true,
  isDragging = false,
  onOpenMiniEditor,
  openOnSingleClick = false,
  isSelected = false,
  onToggleSelect,
  onCardMouseClick,
  onAnalyzeFile,
  analyzeRunning,
}: DocumentCardProps) {
  const clickTimerRef = useRef<number | null>(null);
  const clickDelay = 250; // ms to distinguish single vs double click

  // Check if this is a linked asset and get parent dossier info
  const parentDossier = useQuery(
    api.documents.getById,
    (doc as any).parentDossierId ? { documentId: (doc as any).parentDossierId } : "skip"
  );

  const isLinkedAsset = !!(doc as any).dossierType && (doc as any).dossierType === "media-asset";
  const isDossier = !!(doc as any).dossierType && (doc as any).dossierType === "primary";

  const handlePinClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite?.(doc._id);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(doc._id);
  };

  // Subtle styling for calendar documents to improve visual hierarchy
  const isCalendarDoc =
    (!doc.documentType || doc.documentType === "text") &&
    (doc.title.toLowerCase().includes("calendar") ||
      doc.title.toLowerCase().includes("schedule"));

  // Theme by document type for consistent visuals across cards
  const typeGuess: FileType =
    doc.documentType === "file"
      ? (() => {
          const ft = String(doc.fileType || "").toLowerCase();

          if (
            [
              "video",
              "audio",
              "image",
              "csv",
              "pdf",
              "excel",
              "json",
              "text",
              "code",
              "web",
              "document",
            ].includes(ft)
          )
            return ft as FileType;

          return inferFileType({ name: doc.fileName || doc.title });
        })()
      : (() => {
          const lower = String(doc.title || "").toLowerCase();

          const looksLikeFile =
            /\.(csv|xlsx|xls|pdf|mp4|mov|webm|avi|mkv|jpg|jpeg|png|webp|gif|json|txt|md|markdown|js|ts|tsx|jsx|py|rb|go|rs|html|css|scss|sh)$/.test(
              lower,
            );

          return looksLikeFile
            ? inferFileType({ name: doc.title })
            : inferFileType({ name: doc.title, isNodebenchDoc: true });
        })();

  const theme = getThemeForFileType(typeGuess);

  return (
    <div className="group relative">
      <div
        onClick={(e) => {
          // Let parent handle modifier-key selection first
          if (onCardMouseClick) {
            const handled = onCardMouseClick(doc._id, e);
            if (handled) return;
          }

          // If configured, open the document immediately on single click
          if (openOnSingleClick) {
            onSelect(doc._id);
            return;
          }

          // Defer single-click to allow dblclick to cancel it
          if (clickTimerRef.current) {
            window.clearTimeout(clickTimerRef.current);
            clickTimerRef.current = null;
          }

          const anchor = e.currentTarget as HTMLElement;

          clickTimerRef.current = window.setTimeout(() => {
            clickTimerRef.current = null;
            onOpenMiniEditor?.(doc._id, anchor);
          }, clickDelay) as unknown as number;
        }}
        onDoubleClick={(_e) => {
          if (clickTimerRef.current) {
            window.clearTimeout(clickTimerRef.current);
            clickTimerRef.current = null;
          }
          onSelect(doc._id);
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect(doc._id);
          }
        }}
        aria-selected={isSelected || undefined}
        className={`${
          hybrid
            ? "document-card--hybrid"
            : "bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] p-6 h-52 flex flex-col transition-all duration-200 cursor-pointer relative overflow-hidden backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] hover:ring-2 hover:shadow-md hover:bg-[var(--bg-hover)] hover:scale-[1.02]"
        } ${isCalendarDoc ? "ring-1 ring-amber-400/30 bg-gradient-to-br from-amber-50/10 to-transparent" : `${theme.ring} ${theme.gradient}`} ${isDragging ? "is-dragging" : ""} ${isSelected ? "is-selected ring-2 ring-[var(--accent-primary)] ring-offset-2 ring-offset-[var(--background)] bg-[var(--accent-primary-bg)]/40 shadow-md" : ""}`}
      >
        {/* Selection checkbox (top-left) */}
        <div
          className={`absolute top-2 left-2 z-10 transition-opacity ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
        >
          <input
            type="checkbox"
            aria-label={isSelected ? "Deselect" : "Select"}
            checked={!!isSelected}
            onChange={(e) => {
              e.stopPropagation();
              onToggleSelect?.(doc._id);
            }}
            onClick={(e) => e.stopPropagation()}
            className="h-4 w-4 rounded border-[var(--border-color)] text-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary)]/50 bg-white"
          />
        </div>

        {/* Linked Asset Badge (top-right) */}
        {isLinkedAsset && (
          <div
            className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-1 rounded-md bg-purple-500/10 border border-purple-500/30 backdrop-blur-sm"
            title={parentDossier ? `Linked to ${parentDossier.title}` : "Linked to dossier"}
          >
            <Link2 className="h-3 w-3 text-purple-600 dark:text-purple-400" />
            <span className="text-[10px] font-medium text-purple-700 dark:text-purple-300">
              Linked
            </span>
          </div>
        )}

        {/* Decorative background watermark */}
        {isCalendarDoc ? (
          <Calendar className="document-card__bg document-row__bg h-14 w-14 text-amber-400 rotate-12" />
        ) : (
          <span
            className={`document-card__bg document-row__bg ${theme.watermarkText}`}
          >
            <FileTypeIcon type={typeGuess} className="h-14 w-14 rotate-12" />
          </span>
        )}

        {/* Content */}
        <div className="flex-1 flex flex-col">
          {/* Header: Big Icon + Actions */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-sm ${isCalendarDoc ? "bg-amber-500" : theme.iconBg}`}
              >
                {isCalendarDoc ? (
                  <Calendar className="h-5 w-5 text-white" />
                ) : (doc as any).icon ? (
                  <span className="text-lg">{(doc as any).icon}</span>
                ) : (
                  <div className="text-white">{getDocumentTypeIcon(doc)}</div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1 transition-opacity duration-200 opacity-0 group-hover:opacity-100">
              {/* Quick Edit Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenMiniEditor?.(doc._id, e.currentTarget as HTMLElement);
                }}
                className="w-7 h-7 rounded-md flex items-center justify-center bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)] border border-[var(--border-color)] transition-all duration-200 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
                title="Quick edit"
              >
                <Edit3 className="h-3.5 w-3.5" />
              </button>

              {/* Pin/Favorite Button */}
              <button
                onClick={handlePinClick}
                className={`w-7 h-7 rounded-md flex items-center justify-center transition-all duration-200 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] ${
                  (doc as any).isFavorite
                    ? "bg-yellow-500 text-yellow-100 shadow-sm"
                    : "bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)] border border-[var(--border-color)]"
                }`}
                title={(doc as any).isFavorite ? "Unpin document" : "Pin document"}
              >
                <Star
                  className={`h-3.5 w-3.5 ${(doc as any).isFavorite ? "fill-current" : ""}`}
                />
              </button>

              {/* Delete Button */}
              <button
                onClick={handleDeleteClick}
                className="w-7 h-7 rounded-md flex items-center justify-center bg-[var(--bg-primary)] hover:bg-red-500 text-[var(--text-secondary)] hover:text-white border border-[var(--border-color)] hover:border-red-500 transition-all duration-200 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
                title="Delete document"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Title */}
          <h3 className="font-semibold text-[var(--text-primary)] text-base line-clamp-2 leading-snug">
            {doc.title}
          </h3>

          {/* Pills Metadata Container */}
          <div className="mt-auto pt-2 border-t border-[var(--border-color)] flex items-center justify-between gap-2">
            {(() => {
              const pills = docToPills({
                ...doc,
                meta: { ...((doc as any).meta ?? {}), type: typeGuess },
                typeGuess,
              } as any);

              return (
                <MetaPills
                  pills={pills}
                  typePillClassName={
                    isCalendarDoc
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-700"
                      : theme.label
                  }
                />
              );
            })()}

            {doc.documentType === "timeline" && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 text-[11px] rounded-md border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
                Timeline
              </span>
            )}

            {isDossier && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 text-[11px] rounded-md border border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300">
                Dossier
              </span>
            )}

            {isLinkedAsset && parentDossier && (
              <span
                className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-md border border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300 truncate max-w-[120px]"
                title={`Linked to ${parentDossier.title}`}
              >
                <Link2 className="h-2.5 w-2.5 flex-shrink-0" />
                <span className="truncate">{parentDossier.title}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Memoized wrapper to prevent unnecessary re-renders
export const DocumentCardMemo = memo(DocumentCard);

