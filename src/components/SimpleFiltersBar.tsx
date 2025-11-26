/**
 * SimpleFiltersBar - Single Row Filter Bar
 * 
 * Implements the simplified approach:
 * - Single row with type filters (All, Documents, Spreadsheets, Images, Videos)
 * - Grid/List view toggle
 * - New/Upload actions
 * 
 * Removed: Multiple rows, Tips badges, Tools section, Presets
 */

import React from "react";
import { Plus, Upload, Grid3X3, List, Star, FileText, Table2, Image, Video } from "lucide-react";

export type FilterType = 'all' | 'favorites' | 'documents' | 'spreadsheets' | 'images' | 'videos';

interface SimpleFiltersBarProps {
  filter: FilterType;
  setFilter: (filter: FilterType) => void;
  countsByFilter: Record<FilterType, number>;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  onNewDocument: () => void;
  onUpload: () => void;
  isUploading?: boolean;
}

const FILTER_OPTIONS: Array<{ id: FilterType; label: string; icon: React.ReactNode }> = [
  { id: 'all', label: 'All', icon: null },
  { id: 'documents', label: 'Documents', icon: <FileText className="h-3.5 w-3.5" /> },
  { id: 'spreadsheets', label: 'Spreadsheets', icon: <Table2 className="h-3.5 w-3.5" /> },
  { id: 'images', label: 'Images', icon: <Image className="h-3.5 w-3.5" /> },
  { id: 'videos', label: 'Videos', icon: <Video className="h-3.5 w-3.5" /> },
];

export function SimpleFiltersBar({
  filter,
  setFilter,
  countsByFilter,
  viewMode,
  onViewModeChange,
  onNewDocument,
  onUpload,
  isUploading,
}: SimpleFiltersBarProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-[var(--border-color)]">
      {/* Left: Filter tabs */}
      <div className="flex items-center gap-1">
        {FILTER_OPTIONS.map((opt) => {
          const isActive = filter === opt.id;
          const count = countsByFilter[opt.id] ?? 0;
          
          return (
            <button
              key={opt.id}
              onClick={() => setFilter(opt.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              {opt.icon}
              <span>{opt.label}</span>
              {count > 0 && (
                <span className={`text-xs ${isActive ? 'text-white/80' : 'text-[var(--text-muted)]'}`}>
                  ({count})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* View Toggle */}
        <div className="flex items-center border border-[var(--border-color)] rounded-md overflow-hidden">
          <button
            onClick={() => onViewModeChange('grid')}
            className={`p-1.5 transition-colors ${
              viewMode === 'grid'
                ? 'bg-[var(--bg-hover)] text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
            title="Grid view"
            aria-label="Grid view"
          >
            <Grid3X3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            className={`p-1.5 transition-colors ${
              viewMode === 'list'
                ? 'bg-[var(--bg-hover)] text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
            title="List view"
            aria-label="List view"
          >
            <List className="h-4 w-4" />
          </button>
        </div>

        {/* New Document */}
        <button
          onClick={onNewDocument}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-[var(--accent-primary)] text-white hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" />
          <span>New</span>
        </button>

        {/* Upload */}
        <button
          onClick={onUpload}
          disabled={isUploading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-50"
        >
          <Upload className="h-4 w-4" />
          <span>{isUploading ? 'Uploading...' : 'Upload'}</span>
        </button>
      </div>
    </div>
  );
}

export default SimpleFiltersBar;
