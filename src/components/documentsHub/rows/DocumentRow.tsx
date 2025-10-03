/**
 * DocumentRow Component
 * 
 * A row component for displaying documents in list view with:
 * - Themed icon and watermark
 * - Title and metadata pills
 * - Quick actions (favorite, delete)
 * - Compact/comfortable density options
 */

import type { Id } from "../../../../convex/_generated/dataModel";
import { Calendar, Star, Trash2 } from "lucide-react";
import { FileTypeIcon } from "../../FileTypeIcon";
import MetaPills from "../../MetaPills";
import { docToPills } from "../../../lib/metaPillMappers";
import { inferFileType, type FileType } from "../../../lib/fileTypes";
import { getThemeForFileType } from "../../../lib/documentThemes";
import type { DocumentCardData } from "../utils/documentHelpers";

export interface DocumentRowProps {
  doc: DocumentCardData;
  onSelect: (documentId: Id<"documents">) => void;
  density?: "compact" | "comfortable";
  onToggleFavorite?: (documentId: Id<"documents">) => void;
  onDelete?: (documentId: Id<"documents">) => void;
}

export const DocumentRow = ({
  doc,
  onSelect,
  density = "comfortable",
  onToggleFavorite,
  onDelete,
}: DocumentRowProps) => {
  const isCalendarDoc =
    (!doc.documentType || doc.documentType === "text") &&
    (doc.title.toLowerCase().includes("calendar") ||
      doc.title.toLowerCase().includes("schedule"));

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

  const rowPadding = density === "compact" ? "p-4" : "p-6";

  return (
    <div
      className={`group relative bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl overflow-hidden ${rowPadding} hover:bg-[var(--bg-hover)] transition-all duration-200 flex items-center justify-between focus-within:outline-none focus-within:ring-2 focus-within:ring-[var(--accent-primary)] hover:ring-2 ring-1 ring-[var(--accent-primary)]/10`}
      role="button"
      tabIndex={0}
      onClick={() => onSelect(doc._id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(doc._id);
        }
      }}
    >
      {/* Watermark background icon (smaller) */}
      {isCalendarDoc ? (
        <Calendar
          className="document-card__bg document-row__bg h-10 w-10 text-amber-400 rotate-12"
          aria-hidden
        />
      ) : (
        <span
          className={`document-card__bg document-row__bg ${theme.watermarkText}`}
          aria-hidden
        >
          <FileTypeIcon type={typeGuess} className="h-10 w-10 rotate-12" />
        </span>
      )}

      <div className="flex items-center gap-4 min-w-0">
        <div
          className={`w-8 h-8 rounded-md ${isCalendarDoc ? "bg-amber-500" : theme.iconBg} text-white flex items-center justify-center shrink-0`}
        >
          {isCalendarDoc ? (
            <Calendar className="h-4 w-4" />
          ) : (doc as any).icon ? (
            <span className="text-base">{(doc as any).icon}</span>
          ) : (
            <div className="text-white">
              <FileTypeIcon type={typeGuess} className="h-4 w-4" />
            </div>
          )}
        </div>

        <div className="min-w-0">
          <div className="text-[15px] font-semibold text-[var(--text-primary)] truncate">
            {doc.title}
          </div>

          <div className="mt-2">
            <MetaPills
              pills={docToPills({
                ...doc,
                meta: { ...((doc as any).meta ?? {}), type: typeGuess },
                typeGuess,
              } as any)}
              typePillClassName={
                isCalendarDoc
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-700"
                  : theme.label
              }
            />

            {doc.documentType === "timeline" && (
              <div className="mt-1">
                <span className="inline-flex items-center px-2 py-0.5 text-[11px] rounded-md border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
                  Timeline
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions: star + delete, revealed on hover/focus */}
      <div className="flex items-center gap-1 transition-opacity duration-200 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite?.(doc._id);
          }}
          aria-label={(doc as any).isFavorite ? "Unpin document" : "Pin document"}
          title={(doc as any).isFavorite ? "Unpin document" : "Pin document"}
          className={`w-7 h-7 rounded-md flex items-center justify-center transition-all duration-200 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] ${
            (doc as any).isFavorite
              ? "bg-yellow-500 text-yellow-100 shadow-sm"
              : "bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)] border border-[var(--border-color)]"
          }`}
        >
          <Star
            className={`h-3.5 w-3.5 ${(doc as any).isFavorite ? "fill-current" : ""}`}
          />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.(doc._id);
          }}
          aria-label="Delete document"
          title="Delete document"
          className="w-7 h-7 rounded-md flex items-center justify-center bg-[var(--bg-primary)] hover:bg-red-500 text-[var(--text-secondary)] hover:text-white border border-[var(--border-color)] hover:border-red-500 transition-all duration-200 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

