/**
 * FiltersToolsBar - Premium SaaS Style
 * 
 * Modern, clean filter bar with:
 * - Elegant pill-style filter chips
 * - Compact upload action
 * - Subtle bulk selection actions
 */

import React from "react";
import { Star, Trash2, X, Plus, Loader2, Sparkles } from "lucide-react";

export type DocumentType = {
  id: string;
  label: string;
  icon: React.ReactNode;
};

type ViewMode = "cards" | "list" | "segmented";

type Props = {
  // Filters
  documentTypes: Array<DocumentType>;
  filter: string;
  setFilter: (id: string) => void;
  countsByFilter: Record<string, number>;
  filterButtonRefs: React.MutableRefObject<Array<HTMLButtonElement | null>>;
  onFilterKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;

  // View mode
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;

  // Upload action
  onUploadClick: () => void;
  isUploading: boolean;
  uploadProgress?: string;
  loggedInUser: unknown;

  // Multi-select actions
  selectedCount: number;
  onBulkToggleFavorite: () => void;
  onBulkArchive: () => void;
  onClearSelection: () => void;

  // Clean up empty files
  emptyFileCount?: number;
  onCleanupEmptyFiles?: () => void;
};

export default function FiltersToolsBar(props: Props) {
  const {
    documentTypes,
    filter,
    setFilter,
    countsByFilter,
    filterButtonRefs,
    onFilterKeyDown,
    viewMode,
    setViewMode,
    loggedInUser,
    onUploadClick,
    isUploading,
    uploadProgress,
    selectedCount,
    onBulkToggleFavorite,
    onBulkArchive,
    onClearSelection,
    emptyFileCount = 0,
    onCleanupEmptyFiles,
  } = props;

  return (
    <div className="flex items-center justify-between gap-4 py-4">
      {/* Left: Filter pills */}
      <div
        className="flex flex-wrap items-center gap-2"
        role="tablist"
        aria-label="Document filters"
        onKeyDown={onFilterKeyDown}
      >
        {documentTypes.map((t, idx) => {
          const isActive = filter === t.id;
          const count = countsByFilter[t.id] ?? 0;
          return (
            <button
              key={t.id}
              ref={(el) => {
                filterButtonRefs.current[idx] = el;
              }}
              onClick={() => setFilter(t.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium border transition-all duration-200 ${
                isActive
                  ? "bg-gray-900 text-white border-gray-900 shadow-sm"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:text-gray-900"
              }`}
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
            >
              <span className={isActive ? "opacity-90" : "opacity-70"}>{t.icon}</span>
              <span>{t.label}</span>
              {count > 0 && (
                <span className={`ml-0.5 tabular-nums ${isActive ? 'text-white/70' : 'text-gray-400'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Right: View toggle + Actions */}
      <div className="flex items-center gap-3">
        {/* View mode toggle */}
        <div className="flex gap-0.5 bg-gray-100/80 backdrop-blur-sm p-1 rounded-xl border border-gray-200/50 shadow-sm">
          <button
            onClick={() => setViewMode("cards")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${viewMode === "cards" ? "text-gray-900 bg-white shadow-sm" : "text-gray-500 hover:text-gray-700 hover:bg-white/60"}`}
          >
            Cards
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${viewMode === "list" ? "text-gray-900 bg-white shadow-sm" : "text-gray-500 hover:text-gray-700 hover:bg-white/60"}`}
          >
            List
          </button>
          <button
            onClick={() => setViewMode("segmented")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${viewMode === "segmented" ? "text-gray-900 bg-white shadow-sm" : "text-gray-500 hover:text-gray-700 hover:bg-white/60"}`}
            title="Show grouped sections"
          >
            Segmented
          </button>
        </div>

        {/* Upload */}
        <button
          onClick={onUploadClick}
          disabled={!loggedInUser || isUploading}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-gray-900 text-white hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>{isUploading ? 'Uploading...' : 'Upload'}</span>
        </button>

        {/* Upload progress */}
        {isUploading && uploadProgress && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span className="truncate max-w-[120px]">{uploadProgress}</span>
          </div>
        )}

        {/* Clean up empty files */}
        {emptyFileCount > 0 && onCleanupEmptyFiles && selectedCount === 0 && (
          <button
            type="button"
            onClick={onCleanupEmptyFiles}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 transition-colors"
            title={`Remove ${emptyFileCount} empty file${emptyFileCount > 1 ? 's' : ''}`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Clean {emptyFileCount} Empty</span>
          </button>
        )}

        {/* Bulk selection actions */}
        {selectedCount > 0 && (
          <div className="flex items-center gap-1 ml-1 pl-3 border-l border-gray-200">
            <span className="text-xs font-medium text-gray-500 mr-2">{selectedCount} selected</span>
            <button
              type="button"
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              onClick={onBulkToggleFavorite}
              title="Toggle favorite"
            >
              <Star className="h-4 w-4 text-amber-500" />
            </button>
            <button
              type="button"
              className="p-2 rounded-lg hover:bg-red-50 transition-colors"
              onClick={onBulkArchive}
              title="Move to trash"
            >
              <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-500" />
            </button>
            <button
              type="button"
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              onClick={onClearSelection}
              title="Clear selection"
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
