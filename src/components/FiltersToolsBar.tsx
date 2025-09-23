import React from "react";
import { Lightbulb, Wrench, Sprout, Star, Trash2, X, Plus, Loader2, CalendarDays } from "lucide-react";

export type DocumentType = {
  id: string;
  label: string;
  icon: React.ReactNode;
};

type Props = {
  // Filters row
  documentTypes: Array<DocumentType>;
  filter: string;
  setFilter: (id: string) => void;
  countsByFilter: Record<string, number>;
  filterButtonRefs: React.MutableRefObject<Array<HTMLButtonElement | null>>;
  onFilterKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;

  // Tools row: view menu
  viewButtonRef: React.RefObject<HTMLButtonElement | null>;
  viewMenuRef: React.RefObject<HTMLDivElement | null>;
  viewMenuOpen: boolean;
  setViewMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onChangeDensity: (density: "comfortable" | "compact") => void;
  density: "comfortable" | "compact";
  showWeekInAgenda: boolean;
  onToggleShowWeek: (e: React.ChangeEvent<HTMLInputElement>) => void;

  // Tools row: actions
  loggedInUser: unknown;
  isCompiling: boolean;
  handleCompileAaplModel: () => Promise<void> | void;
  isSeedingOnboarding: boolean;
  handleSeedOnboarding: () => Promise<void> | void;
  isSeedingTimeline: boolean;
  handleSeedTimeline: () => Promise<void> | void;

  // New: quick view buttons
  onOpenCalendarPage?: () => void;
  onOpenTimelinePage?: () => void;

  // Upload action
  onUploadClick: () => void;
  isUploading: boolean;
  uploadProgress?: string;

  // Multi-select actions shown inline when one or more docs are selected
  selectedCount: number;
  onBulkToggleFavorite: () => void;
  onBulkArchive: () => void;
  onClearSelection: () => void;
};

export default function FiltersToolsBar(props: Props) {
  const {
    documentTypes,
    filter,
    setFilter,
    countsByFilter,
    filterButtonRefs,
    onFilterKeyDown,
    viewButtonRef: _viewButtonRef,
    viewMenuRef: _viewMenuRef,
    viewMenuOpen: _viewMenuOpen,
    setViewMenuOpen: _setViewMenuOpen,
    onChangeDensity: _onChangeDensity,
    density: _density,
    showWeekInAgenda: _showWeekInAgenda,
    onToggleShowWeek: _onToggleShowWeek,
    loggedInUser,
    isCompiling,
    handleCompileAaplModel,
    isSeedingOnboarding,
    handleSeedOnboarding,
    isSeedingTimeline: _isSeedingTimeline,
    handleSeedTimeline: _handleSeedTimeline,
    onUploadClick,
    isUploading,
    uploadProgress,
    selectedCount,
    onBulkToggleFavorite,
    onBulkArchive,
    onClearSelection,
  } = props;

  return (
    <div className="mt-2 mb-4 flex flex-col gap-2 py-2 border-b border-[var(--border-color)]">
      {/* Row 1: Filters */}
      <div className="flex items-center gap-2">
        <span
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-[11px] bg-amber-50 text-amber-700 border-amber-200"
          title="Filter by type. Try Favorites, Calendar, Documents, or Files."
          aria-label="Filters help narrow the document list"
        >
          <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
          Filters
        </span>
        <div
          className="flex flex-wrap items-center gap-1"
          role="tablist"
          aria-label="Document filters"
          aria-orientation="horizontal"
          onKeyDown={onFilterKeyDown}
        >
          {documentTypes.map((t, idx) => {
            const isActive = filter === t.id;
            const count = countsByFilter[t.id] ?? 0;
            const isFavorites = t.id === "favorites";
            return (
              <button
                key={t.id}
                ref={(el) => {
                  filterButtonRefs.current[idx] = el;
                }}
                onClick={() => setFilter(t.id)}
                className={`px-3 py-1.5 rounded-md text-xs border transition-colors ${
                  isActive
                    ? "bg-[var(--accent-primary)] text-white border-transparent"
                    : "bg-[var(--bg-primary)] text-[var(--text-secondary)] border-[var(--border-color)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                }`}
                role="tab"
                id={`filter-tab-${t.id}`}
                aria-selected={isActive}
                aria-controls="filter-panel"
                tabIndex={isActive ? 0 : -1}
                aria-keyshortcuts={isFavorites ? "F" : undefined}
                title={`${t.label}${isFavorites ? " (Shortcut: F)" : ""}`}
              >
                <span className="inline-flex items-center gap-1.5">
                  {t.icon}
                  <span>{t.label}</span>
                  <span className="text-[var(--text-muted)]">({count})</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Row 2: Tools */}
      <div className="flex items-center gap-2">
        <span
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-[11px] bg-amber-50 text-amber-700 border-amber-200"
          title="Always-visible tools: compile model, seed onboarding"
          aria-label="Tools section"
        >
          <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
          Tools
        </span>
        {/* View button removed as per request */}
        <button
          onClick={() => void handleCompileAaplModel()}
          disabled={!loggedInUser || isCompiling}
          className={`inline-flex items-center text-xs px-3 py-1.5 rounded-md transition-colors ${
            !loggedInUser || isCompiling
              ? "bg-[var(--bg-secondary)] text-[var(--text-muted)] border border-[var(--border-color)] cursor-not-allowed"
              : "bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-color)] hover:bg-[var(--bg-hover)]"
          }`}
          aria-label="Compile AAPL Model"
          title={!loggedInUser ? "Please sign in to compile the AAPL model" : "Compile AAPL Model"}
        >
          <span className="inline-flex items-center gap-1">
            <Wrench className="h-4 w-4" />
            {isCompiling ? "Compiling…" : "Compile AAPL Model"}
          </span>
        </button>
        <button
          onClick={() => void handleSeedOnboarding()}
          className={`inline-flex items-center text-xs px-3 py-1.5 rounded-md transition-colors ${
            !loggedInUser || isSeedingOnboarding
              ? "bg-[var(--bg-secondary)] text-[var(--text-muted)] border border-[var(--border-color)] cursor-not-allowed"
              : "bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-color)] hover:bg-[var(--bg-hover)]"
          }`}
          disabled={!loggedInUser || isSeedingOnboarding}
          aria-label="Seed Onboarding"
          title={!loggedInUser ? "Please sign in to seed onboarding content" : "Seed starter docs & tasks"}
        >
          <span className="inline-flex items-center gap-1">
            <Sprout className="h-4 w-4" />
            {isSeedingOnboarding ? "Seeding…" : "Seed Onboarding"}
          </span>
        </button>
        {/* Quick view buttons */}
        <button
          onClick={() => props.onOpenCalendarPage?.()}
          className="inline-flex items-center text-xs px-3 py-1.5 rounded-md border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
          aria-label="Open Calendar"
          title="Open Calendar"
        >
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-4 w-4" />
            Calendar
          </span>
        </button>
      </div>
      {/* Row 3: Upload (its own row) */}
      <div className="flex items-center gap-2">
        <button
          onClick={onUploadClick}
          disabled={!loggedInUser || isUploading}
          className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-md border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] disabled:opacity-60"
          aria-label="Upload files"
          title={loggedInUser ? "Upload files" : "Please sign in to upload files"}
        >
          <Plus className="h-3.5 w-3.5" />
          {isUploading ? "Uploading…" : "Upload"}
        </button>
      </div>
      {isUploading && (
        <div className="-mt-1 mb-2 text-xs text-[var(--text-secondary)] flex items-center gap-2" aria-live="polite" aria-atomic="true">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span className="truncate">{uploadProgress || "Uploading..."}</span>
        </div>
      )}

      {/* Row 4: Multi-select actions (visible when items are selected) */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-[11px] bg-amber-50 text-amber-700 border-amber-200"
            aria-label="Selection actions"
          >
            <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
            Selection
          </span>
          <span className="text-xs text-[var(--text-secondary)] mr-1">{selectedCount} selected</span>
          <button
            className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-[var(--border-color)] bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)]"
            onClick={onBulkToggleFavorite}
            title="Toggle favorite for selected"
            aria-label="Toggle favorite for selected"
          >
            <Star className="h-3.5 w-3.5 text-yellow-500" />
            Favorite
          </button>
          <button
            className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-[var(--border-color)] bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)]"
            onClick={onBulkArchive}
            title="Move selected to trash"
            aria-label="Move selected to trash"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Move to Trash
          </button>
          <button
            className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-[var(--border-color)] bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)]"
            onClick={onClearSelection}
            title="Clear selection"
            aria-label="Clear selection"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
