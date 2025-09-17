import { useState } from "react";
import { Star, FileText, MoreHorizontal, Edit3, Share2, Trash2 } from "lucide-react";
import type { UnifiedItem } from "@/types/unified";

export function UnifiedRow({
  item,
  isSelected,
  onOpen,
  onToggleFavorite,
  onToggleDone,
  formatTimeAgo,
  formatDue,
  onRename,
  onArchive,
  onShare,
  ariaSelected,
}: {
  item: UnifiedItem;
  isSelected: boolean;
  onOpen: (item: UnifiedItem, event?: any) => void;
  onToggleFavorite: (item: UnifiedItem) => void;
  onToggleDone: (item: UnifiedItem) => void; // no-op for docs
  formatTimeAgo: (ts: number) => string;
  formatDue: (ts: number) => string;
  onRename?: (item: UnifiedItem) => void;
  onArchive?: (item: UnifiedItem) => void;
  onShare?: (item: UnifiedItem) => void;
  ariaSelected?: boolean;
}) {
  const isTask = item.type === "task";
  const overdue = isTask && item.dueDate && item.status !== "done" && item.dueDate < Date.now();

  return (
    <div
      className={`sidebar-item group relative flex items-center gap-1.5 px-2 py-1 text-xs rounded-md cursor-pointer transition-colors duration-150 border border-transparent
        ${isSelected
          ? 'bg-[var(--bg-tertiary)] border-[var(--border-color)] text-[var(--text-primary)]'
          : 'hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}
      `}
      onClick={(e) => onOpen(item, e)}
      role="option"
      aria-selected={ariaSelected ?? isSelected}
    >
      {isSelected && (
        <span
          className="absolute left-0 inset-y-0 h-full w-px bg-[var(--accent-primary)] rounded-l"
          aria-hidden="true"
        />
      )}
      {isTask ? (
        <input
          type="checkbox"
          checked={item.status === "done"}
          onChange={(e) => { e.stopPropagation(); onToggleDone(item); }}
          className="h-4 w-4 accent-[var(--accent-primary)] cursor-pointer"
          title={item.status === 'done' ? 'Mark as todo' : 'Mark as done'}
        />
      ) : (
        <FileText className="h-4 w-4 flex-shrink-0" />
      )}

      {overdue && <span className="ml-2 inline-block w-1.5 h-1.5 rounded-full bg-red-500" title="Overdue" />}

      <span className="ml-2 flex-1 truncate">{item.title}</span>

      {/* Right-side pills */}
      {isTask && item.dueDate && (
        <span className="mr-2 text-[10px] text-[var(--text-secondary)]">{formatDue(item.dueDate)}</span>
      )}
      <span className="mr-2 text-[10px] text-[var(--text-secondary)]">
        {formatTimeAgo(item.updatedAt)}
      </span>

      <button
        onClick={(e) => { e.stopPropagation(); onToggleFavorite(item); }}
        className={`p-1 flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity duration-150 ${item.isFavorite ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
        title={item.isFavorite ? 'Unpin' : 'Pin'}
        aria-label={item.isFavorite ? 'Unpin' : 'Pin'}
      >
        <Star className={`h-3.5 w-3.5 ${item.isFavorite ? 'fill-current' : ''}`} />
      </button>

      {/* Kebab menu for documents */}
      {!isTask && (
        <div className="relative">
          <MenuButton item={item} onRename={onRename} onArchive={onArchive} onShare={onShare} />
        </div>
      )}
    </div>
  );
}

function MenuButton({
  item,
  onRename,
  onArchive,
  onShare,
}: {
  item: UnifiedItem;
  onRename?: (item: UnifiedItem) => void;
  onArchive?: (item: UnifiedItem) => void;
  onShare?: (item: UnifiedItem) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const close = () => setIsOpen(false);

  return (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setIsOpen((v) => !v); }}
        className="p-1 flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity duration-150 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        title="More"
        aria-label="More"
      >
        <MoreHorizontal className="h-3.5 w-3.5" />
      </button>
      {isOpen && (
        <div
          className="absolute right-0 mt-1 bg-[var(--bg-primary)] rounded-md shadow-lg border border-[var(--border-color)] z-20 p-1"
          onClick={(e) => e.stopPropagation()}
          onMouseLeave={close}
        >
          <div className="flex items-center gap-1">
            <button
              className="p-1 rounded text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
              title="Rename"
              aria-label="Rename"
              onClick={() => { onRename?.(item); close(); }}
            >
              <Edit3 className="h-3.5 w-3.5" />
            </button>
            <button
              className="p-1 rounded text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
              title="Delete"
              aria-label="Delete"
              onClick={() => { onArchive?.(item); close(); }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            <button
              className="p-1 rounded text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
              title="Share"
              aria-label="Share"
              onClick={() => { onShare?.(item); close(); }}
            >
              <Share2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
