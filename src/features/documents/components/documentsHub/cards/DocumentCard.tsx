/**
 * DocumentCard Component - "Pro" Clean Design
 *
 * A refined, content-first card for research assets:
 * - Clean hierarchy: Icon + Bold Title, Subtle Visual Glimpse, Minimalist Footer
 * - Interactive "Magic" layer: Glass-morphism hover overlay with "Ask AI" button
 * - Visual polish: Softer borders, refined shadows, status dot indicator
 */

import { useRef, memo, useMemo, useState } from "react";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import {
  Edit3, Star, Trash2, Link2, Sparkles, GripVertical, Table2, FileText, Clock, Play, Eye, Code2
} from "lucide-react";
import { FileTypeIcon } from "@/shared/components/FileTypeIcon";
import { inferFileType, type FileType } from "@/lib/fileTypes";
import { getThemeForFileType } from "@/lib/documentThemes";
import { getAIStatus, type DocumentCardData } from "../utils/documentHelpers";
import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { formatDistanceToNow } from "date-fns";
import {
  SpreadsheetPreview,
  CodePreview,
  MarkdownPreview,
  NotePreview,
  EmptyStateOverlay,
  ImageFallback,
} from "../../RichPreviews";

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
  /** Handler for opening media in cinema viewer (for images/videos) */
  onOpenMedia?: (doc: DocumentCardData) => void;
}

/** AI Status badge colors */
const AI_STATUS_CONFIG = {
  indexed: {
    dot: 'bg-indigo-500',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    text: 'text-gray-700',
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
    dot: 'bg-[var(--text-muted)]',
    bg: 'bg-[var(--bg-secondary)]',
    border: 'border-[var(--border-color)]',
    text: 'text-[var(--text-secondary)]',
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

/** Code file extensions for smart detection */
const CODE_EXTENSIONS = new Set([
  'html', 'htm', 'js', 'jsx', 'ts', 'tsx', 'py', 'rb', 'go', 'rs', 'java',
  'cpp', 'c', 'h', 'hpp', 'cs', 'swift', 'kt', 'scala', 'php', 'vue', 'svelte',
  'css', 'scss', 'sass', 'less', 'json', 'xml', 'yaml', 'yml', 'toml', 'ini',
  'sh', 'bash', 'zsh', 'ps1', 'bat', 'sql', 'graphql', 'prisma'
]);

/** Smart type detection - ensures code files are detected even if labeled as "text" */
function getSmartFileType(doc: DocumentCardData, baseType: FileType): FileType {
  const title = String(doc.title || doc.fileName || "").toLowerCase();
  const ext = title.split('.').pop() || "";

  // Force-detect code files even if system labeled them as "text"
  if (CODE_EXTENSIONS.has(ext)) {
    return 'code';
  }

  // Detect Quick Notes (nbdoc type or title pattern)
  if (doc.documentType === 'document' && !doc.fileSize) {
    // NodeBench documents without file size are likely Quick Notes
    if (title.includes('quick note') || title.startsWith('note ')) {
      return 'nbdoc';
    }
  }

  return baseType;
}

/** Infer FileType for theming */
function inferDocFileType(doc: DocumentCardData): FileType {
  let baseType: FileType;

  if (doc.documentType === "file") {
    const ft = String(doc.fileType || "").toLowerCase();
    if (["video", "audio", "image", "csv", "pdf", "excel", "json", "text", "code", "web", "document"].includes(ft)) {
      baseType = ft as FileType;
    } else {
      baseType = inferFileType({ name: doc.fileName || doc.title });
    }
  } else {
    const lower = String(doc.title || "").toLowerCase();
    const looksLikeFile = /\.(csv|xlsx|xls|pdf|mp4|mov|webm|avi|mkv|jpg|jpeg|png|webp|gif|json|txt|md|markdown|js|ts|tsx|jsx|py|rb|go|rs|html|css|scss|sh)$/.test(lower);
    baseType = looksLikeFile ? inferFileType({ name: doc.title }) : inferFileType({ name: doc.title, isNodebenchDoc: true });
  }

  // Apply smart type detection to catch code files labeled as "text"
  return getSmartFileType(doc, baseType);
}

/**
 * Visual Glimpse Component - High-fidelity "Miniature Twin" previews
 * Images: Actual thumbnails with zoom on hover + error fallback
 * Videos: Thumbnail/preview with play overlay, loops on hover
 * Spreadsheets: CSS Grid table with cells
 * Code/HTML: Mini-IDE with syntax coloring
 * Docs: Typography layout with headings
 * Empty files: Warning overlay
 */
function VisualGlimpse({
  doc,
  typeGuess,
  isEmpty = false,
  onImageError,
  hasImageError = false,
}: {
  doc: DocumentCardData;
  typeGuess: FileType;
  isEmpty?: boolean;
  onImageError?: () => void;
  hasImageError?: boolean;
}) {
  const theme = getThemeForFileType(typeGuess);

  // Wrapper with empty state overlay
  const renderWithEmptyState = (content: React.ReactNode) => (
    <div className="w-full h-full relative">
      {content}
      {isEmpty && <EmptyStateOverlay variant="empty" />}
    </div>
  );

  // IMAGE: Show actual thumbnail with hover zoom effect
  if (typeGuess === 'image') {
    const imageUrl = doc.thumbnailUrl || doc.mediaUrl || doc.coverImage;
    if (hasImageError || !imageUrl) {
      return renderWithEmptyState(<ImageFallback />);
    }
    return renderWithEmptyState(
      <div className="w-full h-full bg-[var(--bg-hover)] rounded-lg overflow-hidden group/img">
        <img
          src={imageUrl}
          alt={doc.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-110"
          loading="lazy"
          onError={onImageError}
        />
      </div>
    );
  }

  // VIDEO: Show thumbnail with play overlay, loops on hover
  if (typeGuess === 'video') {
    const videoUrl = doc.mediaUrl;
    return renderWithEmptyState(
      <div className="w-full h-full bg-[var(--bg-primary)] rounded-lg overflow-hidden relative group/vid">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-10 pointer-events-none" />

        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 transition-all duration-300 group-hover/vid:scale-110 group-hover/vid:bg-white/30 shadow-lg">
            <Play className="w-5 h-5 text-white fill-white ml-0.5" />
          </div>
        </div>

        {videoUrl ? (
          <video
            src={videoUrl}
            className="w-full h-full object-cover opacity-80 group-hover/vid:opacity-100 transition-opacity duration-300"
            muted
            loop
            playsInline
            preload="metadata"
            onMouseOver={(e) => e.currentTarget.play().catch(() => {})}
            onMouseOut={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-900/40 to-purple-800/20 flex items-center justify-center">
            <Play className="w-10 h-10 text-purple-300/50" />
          </div>
        )}
      </div>
    );
  }

  // Cover image for non-media documents
  if (doc.coverImage && !hasImageError) {
    return renderWithEmptyState(
      <div className="w-full h-full bg-[var(--bg-hover)] rounded-lg overflow-hidden">
        <img
          src={doc.coverImage}
          alt=""
          className="w-full h-full object-cover"
          loading="lazy"
          onError={onImageError}
        />
      </div>
    );
  }

  // CSV/Excel: Rich spreadsheet preview with REAL DATA when available
  // Only show spreadsheet preview if we have a csvUrl (actual file with storage)
  if ((typeGuess === 'csv' || typeGuess === 'excel') && doc.csvUrl) {
    return renderWithEmptyState(
      <div className="w-full h-full rounded-lg overflow-hidden border border-[var(--border-color)]">
        <SpreadsheetPreview
          url={doc.csvUrl}
          content={doc.contentPreview}
          fileType={typeGuess}
        />
      </div>
    );
  }

  // CSV/Excel meta-documents (like "Analysis: file.csv") without actual file storage
  // Fall through to text document rendering to show their content with styled preview
  if ((typeGuess === 'csv' || typeGuess === 'excel') && !doc.csvUrl) {
    if (doc.contentPreview) {
      // Show actual content with sticky note style (like Quick Notes)
      return renderWithEmptyState(
        <div className="w-full h-full bg-gradient-to-br from-amber-50/80 via-yellow-50/60 to-orange-50/30 rounded-lg p-2.5 overflow-hidden relative">
          {/* Red margin line */}
          <div className="absolute top-0 bottom-0 left-3 w-[1px] bg-red-200/40" />
          <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed line-clamp-4 ml-4 italic">
            {doc.contentPreview}
          </p>
        </div>
      );
    }
    // If no content preview, show abstract document icon
    return renderWithEmptyState(
      <div className="w-full h-full rounded-lg overflow-hidden">
        <MarkdownPreview hasContent={false} />
      </div>
    );
  }

  // Quick Notes (nbdoc): Sticky note / paper pad look
  if (typeGuess === 'nbdoc') {
    if (doc.contentPreview) {
      // Show actual content with yellow tint
      return renderWithEmptyState(
        <div className="w-full h-full bg-gradient-to-br from-amber-50/80 via-yellow-50/60 to-orange-50/30 rounded-lg p-2.5 overflow-hidden relative">
          {/* Red margin line */}
          <div className="absolute top-0 bottom-0 left-3 w-[1px] bg-red-200/40" />
          <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed line-clamp-4 ml-4 italic">
            {doc.contentPreview}
          </p>
        </div>
      );
    }
    return renderWithEmptyState(
      <div className="w-full h-full rounded-lg overflow-hidden">
        <NotePreview />
      </div>
    );
  }

  // Text/PDF/Docs: Typography layout or actual snippet
  if (['pdf', 'text', 'document'].includes(typeGuess)) {
    if (doc.contentPreview) {
      return renderWithEmptyState(
        <div className="w-full h-full bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-primary)] rounded-lg p-2.5 overflow-hidden">
          <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed line-clamp-4">
            {doc.contentPreview}
          </p>
        </div>
      );
    }
    return renderWithEmptyState(
      <div className="w-full h-full rounded-lg overflow-hidden">
        <MarkdownPreview hasContent={!!doc.contentPreview} />
      </div>
    );
  }

  // Code/Web/HTML: Mini-IDE preview with dark theme
  if (['code', 'web'].includes(typeGuess)) {
    return renderWithEmptyState(
      <div className="w-full h-full rounded-lg overflow-hidden relative group/code">
        <CodePreview />
        {/* Hover: Preview Button */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover/code:opacity-100 transition-opacity backdrop-blur-[1px]">
          <div className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 text-white text-[10px] font-medium rounded-full shadow-lg">
            <Eye className="w-3 h-3" />
            <span>Preview</span>
          </div>
        </div>
      </div>
    );
  }

  // Default: Soft gradient with faint icon
  return renderWithEmptyState(
    <div className={`w-full h-full rounded-lg flex items-center justify-center bg-gradient-to-br ${theme.gradient || 'from-[var(--bg-secondary)] to-[var(--bg-hover)]/50'}`}>
      <FileTypeIcon type={typeGuess} className="h-8 w-8 opacity-20" />
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
  onOpenMedia,
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

  // Image error state for fallback rendering
  const [hasImageError, setHasImageError] = useState(false);
  const handleImageError = () => setHasImageError(true);

  // Empty file detection (size is 0 or no content)
  const isEmpty = useMemo(() => {
    if (doc.fileSize === 0) return true;
    // For NodeBench docs, check if content is empty
    if (doc.documentType === 'document' && !doc.contentPreview) return false; // Assume not empty unless we know
    return false;
  }, [doc.fileSize, doc.documentType, doc.contentPreview]);

  // Fetch tags from database
  const persistedTags = useQuery(api.tags.listForDocument, { documentId: doc._id });

  // Memoized computed values
  const typeGuess = useMemo(() => inferDocFileType(doc), [doc]);
  const theme = useMemo(() => getThemeForFileType(typeGuess), [typeGuess]);
  const aiStatus = useMemo(() => getAIStatus(doc), [doc]);
  const statusConfig = AI_STATUS_CONFIG[aiStatus];
  const isMedia = typeGuess === 'image' || typeGuess === 'video';

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

  // Handle click on the visual glimpse area - opens media viewer for images/videos
  const handleGlimpseClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMedia && onOpenMedia) {
      onOpenMedia(doc);
    }
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
    <div
      className="group relative"
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
    >
      {/* Card Container */}
      <div
        className={`
          bg-[var(--bg-primary)] rounded-xl border p-3 h-52
          flex flex-col transition-all duration-200 ease-out cursor-pointer relative overflow-hidden
          shadow-sm hover:shadow-md hover:-translate-y-0.5
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:ring-offset-2
          ${isDragging ? "opacity-90 scale-[1.02] shadow-lg ring-2 ring-blue-400" : ""}
          ${isSelected
            ? "ring-1 ring-blue-500 shadow-[0_0_0_4px_rgba(59,130,246,0.1)] bg-blue-50/30 border-blue-200"
            : "border-[var(--border-color)] hover:border-[var(--border-color)]"
          }
        `}
      >
        {/* Draggable grip indicator (top-left on hover) */}
        {draggableToAgent && (
          <div className="absolute top-1.5 left-1.5 z-10 opacity-0 group-hover:opacity-50 transition-opacity">
            <GripVertical className="w-3 h-3 text-[var(--text-muted)]" />
          </div>
        )}

        {/* Selection checkbox (top-right on hover or when selected) */}
        <div
          className={`absolute top-2 right-2 z-20 transition-opacity ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
          onClick={(e) => { e.stopPropagation(); onToggleSelect?.(doc._id); }}
        >
          <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors cursor-pointer ${
            isSelected
              ? 'bg-blue-500 border-blue-500'
              : 'bg-[var(--bg-primary)] border-[var(--border-color)] hover:border-blue-400'
          }`}>
            {isSelected && (
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </div>

        {/* 1. HEADER: Small Icon + Bold 2-line Title */}
        <div className="flex items-start gap-2.5 mb-2">
          {/* Compact file type icon */}
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${theme.iconBg}`}>
            {(doc as any).icon ? (
              <span className="text-xs">{(doc as any).icon}</span>
            ) : (
              <div className="text-white">
                <FileTypeIcon type={typeGuess} className="h-3.5 w-3.5" />
              </div>
            )}
          </div>

          {/* Title (2-line max, bold) */}
          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className="font-semibold text-[var(--text-primary)] text-sm leading-snug line-clamp-2 min-h-[2.5rem]" title={doc.title}>
              {doc.title}
            </h3>
          </div>
        </div>

        {/* 2. BODY: Visual Glimpse with Hover Overlay */}
        <div className="flex-1 min-h-0 mb-2 relative">
          <div
            className={`w-full h-full rounded-lg border overflow-hidden bg-[var(--bg-secondary)] ${
              isEmpty ? 'border-dashed border-amber-200' : 'border-[var(--border-color)]'
            } ${isMedia && onOpenMedia ? 'cursor-pointer' : ''}`}
            onClick={isMedia && onOpenMedia ? handleGlimpseClick : undefined}
          >
            <VisualGlimpse
              doc={doc}
              typeGuess={typeGuess}
              isEmpty={isEmpty}
              hasImageError={hasImageError}
              onImageError={handleImageError}
            />
          </div>

          {/* Glass-morphism Hover Overlay - different for media vs non-media */}
          {isMedia && onOpenMedia ? (
            // Media files: Show "View" overlay that opens cinema viewer
            <div
              className="absolute inset-0 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 bg-black/20 backdrop-blur-[1px] cursor-pointer"
              onClick={handleGlimpseClick}
            >
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-primary)]/90 text-[var(--text-primary)] text-xs font-medium rounded-full shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all duration-200">
                <Play className="w-3 h-3" />
                {typeGuess === 'video' ? 'Play' : 'View'}
              </div>
            </div>
          ) : onChatWithFile ? (
            // Non-media files: Show "Ask AI" overlay
            <div className="absolute inset-0 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 bg-[var(--bg-primary)]/50 backdrop-blur-[2px]">
              <button
                type="button"
                onClick={handleChatClick}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--text-primary)] text-[var(--bg-primary)] text-xs font-medium rounded-full shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all duration-200 hover:opacity-90 hover:scale-105"
              >
                <Sparkles className="w-3 h-3 text-purple-300" />
                Ask AI
              </button>
            </div>
          ) : null}
        </div>

        {/* 2.5. TAGS ROW: Micro-pills for semantic tags */}
        {persistedTags && persistedTags.length > 0 && (
          <div className="flex items-center gap-1 mb-1.5 overflow-x-auto no-scrollbar">
            {persistedTags.slice(0, 3).map((tag) => {
              // Semantic color coding by tag kind
              const kindColors: Record<string, string> = {
                entity: 'bg-purple-50 text-purple-600 border-purple-100',
                topic: 'bg-blue-50 text-blue-600 border-blue-100',
                community: 'bg-green-50 text-green-600 border-green-100',
                relationship: 'bg-orange-50 text-orange-600 border-orange-100',
                keyword: 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)]',
              };
              const colorClass = kindColors[tag.kind || 'keyword'] || kindColors.keyword;
              return (
                <span
                  key={tag._id}
                  className={`px-1.5 py-0.5 text-[8px] font-medium rounded border whitespace-nowrap ${colorClass}`}
                  title={tag.kind ? `${tag.kind}: ${tag.name}` : tag.name}
                >
                  #{tag.name}
                </span>
              );
            })}
            {persistedTags.length > 3 && (
              <span className="text-[8px] text-[var(--text-muted)] whitespace-nowrap">+{persistedTags.length - 3}</span>
            )}
          </div>
        )}

        {/* 3. FOOTER: Minimalist Metadata + Status Dot */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--border-color)]">
          {/* Left: Type & Size */}
          <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)] min-w-0">
            <span className="font-semibold uppercase tracking-wider">
              {typeGuess === 'nbdoc' ? 'DOC' : typeGuess}
            </span>
            {formatFileSize(doc.fileSize) && (
              <>
                <span>•</span>
                <span className="text-[var(--text-secondary)] font-medium">{formatFileSize(doc.fileSize)}</span>
              </>
            )}
            {timeAgo && (
              <>
                <span>•</span>
                <span className="truncate">{timeAgo}</span>
              </>
            )}
          </div>

          {/* Right: Status Indicator */}
          <div className="flex items-center">
            {aiStatus === 'indexed' ? (
              <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-full bg-green-50/80 border border-green-100" title="AI Indexed & Ready">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <span className="text-[9px] font-semibold text-green-700">AI Ready</span>
              </div>
            ) : aiStatus === 'processing' ? (
              <div className="flex items-center gap-1.5 opacity-70" title="Processing...">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                <Clock className="w-3 h-3 text-amber-500" />
              </div>
            ) : (
              <div className="flex items-center gap-1" title="Not indexed yet">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)]" />
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons (visible on hover, positioned absolutely) */}
        <div className="absolute bottom-2 right-2 flex items-center gap-0.5 transition-opacity duration-200 opacity-0 group-hover:opacity-100">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenMiniEditor?.(doc._id, e.currentTarget as HTMLElement);
            }}
            className="w-6 h-6 rounded-md flex items-center justify-center bg-[var(--bg-primary)]/90 hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors shadow-sm border border-[var(--border-color)]"
            title="Quick edit"
          >
            <Edit3 className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={handlePinClick}
            className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors shadow-sm border ${
              (doc as any).isFavorite
                ? "bg-amber-50 border-amber-200 text-amber-600"
                : "bg-[var(--bg-primary)]/90 border-[var(--border-color)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-amber-500"
            }`}
            title={(doc as any).isFavorite ? "Unpin" : "Pin"}
          >
            <Star className={`h-3 w-3 ${(doc as any).isFavorite ? "fill-current" : ""}`} />
          </button>
          <button
            type="button"
            onClick={handleDeleteClick}
            className="w-6 h-6 rounded-md flex items-center justify-center bg-[var(--bg-primary)]/90 hover:bg-red-50 text-[var(--text-secondary)] hover:text-red-500 transition-colors shadow-sm border border-[var(--border-color)]"
            title="Delete"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>

        {/* Dossier/Linked indicator (small badge at bottom-left) */}
        {(isDossier || isLinkedAsset) && (
          <div className="absolute bottom-2 left-2">
            {isDossier && (
              <span className="inline-flex items-center px-1.5 py-0.5 text-[9px] font-medium rounded-md bg-purple-50/90 text-purple-600 border border-purple-100">
                Dossier
              </span>
            )}
            {isLinkedAsset && !isDossier && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-medium rounded-md bg-purple-50/90 text-purple-600 border border-purple-100" title={parentDossier ? `Linked to ${parentDossier.title}` : "Linked"}>
                <Link2 className="h-2 w-2" />
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Memoized wrapper to prevent unnecessary re-renders
export const DocumentCardMemo = memo(DocumentCard);

