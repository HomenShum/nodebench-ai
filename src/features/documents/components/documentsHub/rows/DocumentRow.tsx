/**
 * DocumentRow Component
 * 
 * A high-density row optimized for document scanning with:
 * - Name & Format with file icon
 * - AI Tags (colorful pills)
 * - Intelligence Status indicator
 * - Meta (Date Modified and Size)
 * - Hover-only actions
 */

import { useMemo } from "react";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { Sparkles, Calendar, Star, Trash2, MessageCircle, Loader2 } from "lucide-react";
import { FileTypeIcon } from "@/shared/components/FileTypeIcon";
import { inferFileType, type FileType } from "@/lib/fileTypes";
import { getThemeForFileType } from "@/lib/documentThemes";
import type { DocumentCardData } from "../utils/documentHelpers";

// ============================================================================
// Types
// ============================================================================

export interface DocumentRowProps {
  doc: DocumentCardData;
  isSelected?: boolean;
  onSelect: (documentId: Id<"documents">) => void;
  onToggleSelect?: (documentId: Id<"documents">) => void;
  onToggleFavorite?: (documentId: Id<"documents">) => void;
  onDelete?: (documentId: Id<"documents">) => void;
  onChat?: (documentId: Id<"documents">) => void;
  density?: "compact" | "comfortable"; // Kept for compatibility, though unused in new design
}

// ============================================================================
// Helpers
// ============================================================================

function getIntelligenceStatus(doc: DocumentCardData): {
  label: string;
  variant: "ready" | "analyzing" | "raw";
} {
  // Check for AI indicators on the document
  const hasEmbeddings = !!(doc as any).embeddingId || !!(doc as any).vectorStoreFileId;
  const isProcessing = (doc as any).processingStatus === "processing";

  if (hasEmbeddings) {
    return { label: "AI Ready", variant: "ready" };
  }
  if (isProcessing) {
    return { label: "Analyzing...", variant: "analyzing" };
  }
  return { label: "Raw", variant: "raw" };
}

function formatRelativeTime(timestamp: number | undefined): string {
  if (!timestamp) return "—";

  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return new Date(timestamp).toLocaleDateString();
}

function formatFileSize(bytes: number | undefined): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

// ============================================================================
// Component
// ============================================================================

export function DocumentRow({
  doc,
  isSelected = false,
  onSelect,
  onToggleSelect,
  onToggleFavorite,
  onDelete,
  onChat,
}: DocumentRowProps) {
  // Infer file type for theming
  const typeGuess: FileType = useMemo(() => {
    if (doc.documentType === "file") {
      const ft = String(doc.fileType || "").toLowerCase();
      if (["video", "audio", "image", "csv", "pdf", "excel", "json", "text", "code", "web", "document"].includes(ft)) {
        return ft as FileType;
      }
      return inferFileType({ name: doc.fileName || doc.title });
    }
    return inferFileType({ name: doc.title, isNodebenchDoc: true });
  }, [doc.documentType, doc.fileType, doc.fileName, doc.title]);

  const theme = getThemeForFileType(typeGuess);
  const status = getIntelligenceStatus(doc);

  // Get context-aware tags based on file type and document metadata
  const tags: string[] = useMemo(() => {
    const docTags: string[] = [];

    // Check for AI-derived tags first (highest priority)
    if ((doc as any).tags && Array.isArray((doc as any).tags)) {
      docTags.push(...(doc as any).tags);
    }

    // Generate context-aware tags based on file type
    if (doc.documentType === "file") {
      switch (typeGuess) {
        case "excel":
        case "csv":
          docTags.push("Finance", "Data");
          break;
        case "pdf":
          docTags.push("Research", "Report");
          break;
        case "image":
          docTags.push("Media", "Asset");
          break;
        case "video":
          docTags.push("Content", "Video");
          break;
        case "audio":
          docTags.push("Media", "Audio");
          break;
        case "code":
        case "web":
          docTags.push("Code", "Dev");
          break;
        case "json":
          docTags.push("Data", "Config");
          break;
        case "text":
          docTags.push("Notes", "Text");
          break;
        default:
          docTags.push(typeGuess.charAt(0).toUpperCase() + typeGuess.slice(1));
      }
    } else if (doc.documentType === "timeline") {
      docTags.push("Timeline", "Agent");
    } else {
      // NodeBench documents - infer from title
      const title = doc.title.toLowerCase();
      if (title.includes("calendar") || title.includes("📅")) {
        docTags.push("Calendar", "Schedule");
      } else if (title.includes("note") || title.includes("📝")) {
        docTags.push("Notes", "Daily");
      } else if (title.includes("chat")) {
        docTags.push("Chat", "Conversation");
      } else if (title.includes("analysis")) {
        docTags.push("Analysis", "AI");
      } else if (title.includes("dossier") || title.includes("example:")) {
        docTags.push("Dossier", "Research");
      } else if (title.includes("agent")) {
        docTags.push("Agent", "Timeline");
      } else {
        docTags.push("Document");
      }
    }

    // Deduplicate and limit to 3 tags
    return [...new Set(docTags)].slice(0, 3);
  }, [doc, typeGuess]);

  const isFavorite = !!(doc as any).isFavorite;
  const modifiedAt = (doc as any).updatedAt || (doc as any)._creationTime;
  const fileSize = (doc as any).size || (doc as any).fileSize;

  return (
    <div
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey) {
          onToggleSelect?.(doc._id);
        } else {
          onSelect(doc._id);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(doc._id);
        }
      }}
      role="button"
      tabIndex={0}
      className={`
        group flex items-center gap-4 px-4 py-3 
        border-b border-[var(--border-color)] 
        hover:bg-[var(--bg-hover)] cursor-pointer 
        transition-colors duration-150
        ${isSelected ? "bg-[var(--accent-primary)]/10" : ""}
      `}
    >
      {/* 1. Selection Checkbox */}
      <div className="w-6 flex justify-center shrink-0">
        <div
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect?.(doc._id);
          }}
          className={`
            w-4 h-4 rounded border transition-all duration-150 flex items-center justify-center
            ${isSelected
              ? "bg-[var(--accent-primary)] border-[var(--accent-primary)]"
              : "border-[var(--border-color)] bg-[var(--bg-primary)] opacity-0 group-hover:opacity-100"
            }
          `}
        >
          {isSelected && (
            <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>
      </div>

      {/* 2. Name & Icon */}
      <div className="flex-1 flex items-center gap-3 min-w-0">
        <div className={`p-2 rounded-lg shrink-0 ${theme.iconBg}`}>
          <FileTypeIcon type={typeGuess} className="w-4 h-4 text-white" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-medium text-[var(--text-primary)] truncate">
            {doc.title}
          </span>
          <span className="text-[11px] text-[var(--text-muted)] truncate">
            {typeGuess.toUpperCase()} {fileSize ? `• ${formatFileSize(fileSize)}` : ""}
          </span>
        </div>
      </div>

      {/* 3. Tags Column */}
      <div className="w-48 hidden md:flex items-center gap-1.5">
        {tags.slice(0, 2).map((tag, i) => (
          <span
            key={i}
            className={`
              px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap
              ${i === 0 ? theme.label : "bg-[var(--bg-hover)] text-[var(--text-secondary)] border border-[var(--border-color)]"}
            `}
          >
            #{tag}
          </span>
        ))}
        {tags.length > 2 && (
          <span className="text-[10px] text-[var(--text-muted)]">+{tags.length - 2}</span>
        )}
      </div>

      {/* 4. AI Status */}
      <div className="w-28 hidden lg:flex items-center">
        {status.variant === "ready" ? (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-medium border border-emerald-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {status.label}
          </div>
        ) : status.variant === "analyzing" ? (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-[10px] font-medium border border-amber-500/20">
            <Loader2 className="w-3 h-3 animate-spin" />
            {status.label}
          </div>
        ) : (
          <span className="text-[10px] text-[var(--text-muted)]">{status.label}</span>
        )}
      </div>

      {/* 5. Date Modified */}
      <div className="w-24 hidden sm:flex items-center gap-2 text-xs text-[var(--text-secondary)]">
        <Calendar className="w-3 h-3 text-[var(--text-muted)]" />
        <span>{formatRelativeTime(modifiedAt)}</span>
      </div>

      {/* 6. Actions (Hover only) */}
      <div className="w-20 flex justify-end items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        {onChat && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChat(doc._id);
            }}
            title="Chat with AI"
            className="p-1.5 hover:bg-[var(--bg-primary)] rounded text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
          </button>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite?.(doc._id);
          }}
          title={isFavorite ? "Unpin" : "Pin"}
          className={`p-1.5 rounded transition-colors ${isFavorite
            ? "text-yellow-500 hover:bg-yellow-500/10"
            : "text-[var(--text-muted)] hover:text-yellow-500 hover:bg-[var(--bg-primary)]"
            }`}
        >
          <Star className={`w-4 h-4 ${isFavorite ? "fill-current" : ""}`} />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.(doc._id);
          }}
          title="Delete"
          className="p-1.5 hover:bg-red-500/10 rounded text-[var(--text-muted)] hover:text-red-500 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

