/**
 * DocumentCard Component - "Rich Context + AI-Ready" Design
 *
 * A modern card component for displaying documents as "Research Assets":
 * - Content-first design with visual "Glimpse" previews
 * - AI indexing status indicators (Indexed/Processing/Raw)
 * - "Chat with File" hover action for agent integration
 * - Draggable affordance for agent workflows
 * - Glass aesthetic with subtle shadows
 */

import { useRef, memo, useMemo } from "react";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import {
  Calendar, Edit3, Star, Trash2, Link2,
  Sparkles, GripVertical, MessageCircle, Zap, Table2, FileText
} from "lucide-react";
import { FileTypeIcon } from "@/shared/components/FileTypeIcon";
import { inferFileType, type FileType } from "@/lib/fileTypes";
import { getThemeForFileType } from "@/lib/documentThemes";
import { getAIStatus, type DocumentCardData } from "../utils/documentHelpers";
import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { formatDistanceToNow } from "date-fns";

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
  /** Handler for "Chat with this file" action */
  onChatWithFile?: (doc: DocumentCardData) => void;
  /** Enable drag-and-drop to agent */
  draggableToAgent?: boolean;
}

/** AI Status badge colors */
const AI_STATUS_CONFIG = {
  indexed: {
    dot: 'bg-emerald-500',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    label: 'AI Indexed',
  },
  processing: {
    dot: 'bg-amber-500 animate-pulse',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    label: 'Processing',
  },
  raw: {
    dot: 'bg-gray-300',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    text: 'text-gray-500',
    label: 'Raw',
  },
} as const;

/** Format file size for display */
function formatFileSize(bytes?: number): string | null {
  if (!bytes) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Infer FileType for theming */
function inferDocFileType(doc: DocumentCardData): FileType {
  if (doc.documentType === "file") {
    const ft = String(doc.fileType || "").toLowerCase();
    if (["video", "audio", "image", "csv", "pdf", "excel", "json", "text", "code", "web", "document"].includes(ft)) {
      return ft as FileType;
    }
    return inferFileType({ name: doc.fileName || doc.title });
  }
  const lower = String(doc.title || "").toLowerCase();
  const looksLikeFile = /\.(csv|xlsx|xls|pdf|mp4|mov|webm|avi|mkv|jpg|jpeg|png|webp|gif|json|txt|md|markdown|js|ts|tsx|jsx|py|rb|go|rs|html|css|scss|sh)$/.test(lower);
  return looksLikeFile ? inferFileType({ name: doc.title }) : inferFileType({ name: doc.title, isNodebenchDoc: true });
}

/** Content Glimpse Component - type-specific preview */
function ContentGlimpse({ doc, typeGuess }: { doc: DocumentCardData; typeGuess: FileType }) {
  // For images with cover, show actual thumbnail
  if (doc.coverImage) {
    return (
      <div className="w-full h-full bg-gray-50 rounded-lg overflow-hidden">
        <img src={doc.coverImage} alt="" className="w-full h-full object-cover" />
      </div>
    );
  }

  // CSV/Excel: Mini grid pattern
  if (typeGuess === 'csv' || typeGuess === 'excel') {
    return (
      <div className="w-full h-full bg-gradient-to-br from-emerald-50 to-white rounded-lg p-2 flex flex-col gap-1">
        <div className="flex items-center gap-1 text-[9px] text-emerald-600 font-medium mb-1">
          <Table2 className="w-3 h-3" />
          {doc.rowCount ? `${doc.rowCount.toLocaleString()} rows` : 'Spreadsheet'}
        </div>
        {/* Mini grid visualization */}
        <div className="flex-1 grid grid-cols-4 gap-0.5">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="bg-emerald-100/60 rounded-[2px]" />
          ))}
        </div>
      </div>
    );
  }

  // Text/PDF/Docs: Show content snippet
  if (doc.contentPreview && ['pdf', 'text', 'document', 'nbdoc'].includes(typeGuess)) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-gray-50 to-white rounded-lg p-2 flex flex-col">
        <div className="flex items-center gap-1 text-[9px] text-gray-500 font-medium mb-1">
          <FileText className="w-3 h-3" />
          Preview
        </div>
        <p className="text-[10px] text-gray-600 leading-relaxed line-clamp-3 flex-1">
          {doc.contentPreview}
        </p>
      </div>
    );
  }

  // Default: Abstract pattern with file type
  const theme = getThemeForFileType(typeGuess);
  return (
    <div className={`w-full h-full rounded-lg flex items-center justify-center ${theme.gradient} bg-gray-50/50`}>
      <FileTypeIcon type={typeGuess} className="h-8 w-8 opacity-30" />
    </div>
  );
}

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
  onChatWithFile,
  draggableToAgent = true,
}: DocumentCardProps) {
  const clickTimerRef = useRef<number | null>(null);
  const clickDelay = 250;

  // Check if this is a linked asset and get parent dossier info
  const parentDossier = useQuery(
    api.domains.documents.documents.getById,
    (doc as any).parentDossierId ? { documentId: (doc as any).parentDossierId } : "skip"
  );

  const isLinkedAsset = !!(doc as any).dossierType && (doc as any).dossierType === "media-asset";
  const isDossier = !!(doc as any).dossierType && (doc as any).dossierType === "primary";

  // Memoized computed values
  const typeGuess = useMemo(() => inferDocFileType(doc), [doc]);
  const theme = useMemo(() => getThemeForFileType(typeGuess), [typeGuess]);
  const aiStatus = useMemo(() => getAIStatus(doc), [doc]);
  const statusConfig = AI_STATUS_CONFIG[aiStatus];

  // Format time ago
  const timeAgo = useMemo(() => {
    const timestamp = doc.updatedAt || doc.createdAt;
    if (!timestamp) return null;
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: false });
    } catch {
      return null;
    }
  }, [doc.updatedAt, doc.createdAt]);

  const handlePinClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite?.(doc._id);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(doc._id);
  };

  const handleChatClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChatWithFile?.(doc);
  };

  // Drag handlers for agent integration
  const handleDragStart = (e: React.DragEvent) => {
    if (!draggableToAgent) return;
    e.dataTransfer.setData('application/x-document-node', JSON.stringify({
      id: doc._id,
      title: doc.title,
      type: typeGuess,
    }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="group relative">
      <div
        draggable={draggableToAgent}
        onDragStart={handleDragStart}
        onClick={(e) => {
          if (onCardMouseClick) {
            const handled = onCardMouseClick(doc._id, e);
            if (handled) return;
          }
          if (openOnSingleClick) {
            onSelect(doc._id);
            return;
          }
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
        onDoubleClick={() => {
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
        className={`
          bg-white/90 backdrop-blur-sm rounded-xl border p-3 h-52
          flex flex-col transition-all duration-200 ease-out cursor-pointer relative overflow-hidden
          shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:ring-offset-2
          ${isDragging ? "opacity-90 scale-[1.02] shadow-lg ring-2 ring-blue-400" : ""}
          ${isSelected
            ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-white bg-blue-50/50 border-blue-200"
            : "border-gray-200/80 hover:border-gray-300"
          }
          ${theme.ring}
        `}
      >
        {/* Draggable grip indicator (top-left on hover) */}
        {draggableToAgent && (
          <div className="absolute top-1.5 left-1.5 z-10 opacity-0 group-hover:opacity-60 transition-opacity">
            <GripVertical className="w-3.5 h-3.5 text-gray-400" />
          </div>
        )}

        {/* Selection checkbox */}
        <div className={`absolute top-2 left-6 z-10 transition-opacity ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
          <input
            type="checkbox"
            aria-label={isSelected ? "Deselect" : "Select"}
            checked={!!isSelected}
            onChange={(e) => {
              e.stopPropagation();
              onToggleSelect?.(doc._id);
            }}
            onClick={(e) => e.stopPropagation()}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500/50 bg-white"
          />
        </div>

        {/* Header Row: Icon + Title + Actions */}
        <div className="flex items-start gap-2.5 mb-2">
          {/* Compact file type icon */}
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${theme.iconBg}`}>
            {(doc as any).icon ? (
              <span className="text-sm">{(doc as any).icon}</span>
            ) : (
              <div className="text-white">
                <FileTypeIcon type={typeGuess} className="h-4 w-4" />
              </div>
            )}
          </div>

          {/* Title & badges */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-sm line-clamp-1 leading-snug">
              {doc.title}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              {/* AI Status Badge */}
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded-md border ${statusConfig.bg} ${statusConfig.border} ${statusConfig.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
                {statusConfig.label}
              </span>
              {/* Dossier/Linked badges */}
              {isDossier && (
                <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-md border border-purple-200 bg-purple-50 text-purple-700">
                  Dossier
                </span>
              )}
              {isLinkedAsset && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium rounded-md border border-purple-200 bg-purple-50 text-purple-700" title={parentDossier ? `Linked to ${parentDossier.title}` : "Linked"}>
                  <Link2 className="h-2.5 w-2.5" />
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons (visible on hover) */}
          <div className="flex items-center gap-0.5 transition-opacity duration-200 opacity-0 group-hover:opacity-100">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenMiniEditor?.(doc._id, e.currentTarget as HTMLElement);
              }}
              className="w-6 h-6 rounded-md flex items-center justify-center bg-gray-100/80 hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
              title="Quick edit"
            >
              <Edit3 className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={handlePinClick}
              className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${
                (doc as any).isFavorite
                  ? "bg-amber-100 text-amber-600"
                  : "bg-gray-100/80 hover:bg-gray-200 text-gray-500 hover:text-amber-500"
              }`}
              title={(doc as any).isFavorite ? "Unpin" : "Pin"}
            >
              <Star className={`h-3 w-3 ${(doc as any).isFavorite ? "fill-current" : ""}`} />
            </button>
            <button
              type="button"
              onClick={handleDeleteClick}
              className="w-6 h-6 rounded-md flex items-center justify-center bg-gray-100/80 hover:bg-red-100 text-gray-500 hover:text-red-500 transition-colors"
              title="Delete"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Content Glimpse Area */}
        <div className="flex-1 min-h-0 mb-2">
          <ContentGlimpse doc={doc} typeGuess={typeGuess} />
        </div>

        {/* Footer: Meta + Chat Action */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100/80">
          {/* Left: Metadata pills */}
          <div className="flex items-center gap-1.5 text-[10px] text-gray-500 min-w-0">
            {/* File size or type indicator */}
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md ${theme.label} text-[10px] font-medium`}>
              {typeGuess.toUpperCase()}
            </span>
            {formatFileSize(doc.fileSize) && (
              <span className="text-gray-400">•</span>
            )}
            {formatFileSize(doc.fileSize) && (
              <span>{formatFileSize(doc.fileSize)}</span>
            )}
            {timeAgo && (
              <>
                <span className="text-gray-400">•</span>
                <span className="truncate">{timeAgo}</span>
              </>
            )}
          </div>

          {/* Right: Chat with file button (visible on hover) */}
          {onChatWithFile && (
            <button
              type="button"
              onClick={handleChatClick}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-all hover:shadow-md hover:scale-105"
              title="Chat with this file"
            >
              <Sparkles className="h-3 w-3" />
              <span>Chat</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Memoized wrapper to prevent unnecessary re-renders
export const DocumentCardMemo = memo(DocumentCard);

