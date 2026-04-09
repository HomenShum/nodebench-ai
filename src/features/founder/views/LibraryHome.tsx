/**
 * LibraryHome — Canonical "Library" surface.
 *
 * Notion-style file grid. Reports and documents are the same visual object.
 * Two tabs: Files (unified grid) and Changes (timeline).
 */

import { lazy, Suspense, useCallback, useRef, useState } from "react";
import {
  FileText,
  AlertTriangle,
  Download,
  Link2,
  Copy,
  Ellipsis,
  Clock,
  FileBarChart,
  StickyNote,
  Table2,
  Bot,
  ExternalLink,
  Upload,
  CalendarPlus,
  PenLine,
  Plus,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { useConvexApi } from "@/lib/convexApi";
import { useDataSource } from "@/lib/hooks/useDataSource";
import { DataSourceBanner } from "@/shared/components/DataSourceBanner";
import { ViewSkeleton } from "@/components/skeletons";
import { cn } from "@/lib/utils";
import type { Id } from "../../../../convex/_generated/dataModel";

const ChangeDetectorView = lazy(() =>
  import("@/features/founder/views/ChangeDetectorView").then((mod) => ({
    default: mod.default,
  })),
);

// ─── File card types ─────────────────────────────────────────────

interface LibraryFile {
  id: string;
  title: string;
  type: "report" | "document" | "memo" | "spreadsheet" | "brief";
  updatedAt: string;
  preview?: string;
  badge?: string;
}

const TYPE_ICON: Record<LibraryFile["type"], typeof FileText> = {
  report: FileBarChart,
  document: FileText,
  memo: StickyNote,
  spreadsheet: Table2,
  brief: Bot,
};

const TYPE_LABEL: Record<LibraryFile["type"], string> = {
  report: "Report",
  document: "Document",
  memo: "Memo",
  spreadsheet: "Spreadsheet",
  brief: "Agent Brief",
};

// ─── Real data with honest empty state ───────────────────────────

function useLibraryFiles(): LibraryFile[] {
  const api = useConvexApi();
  const { mode } = useDataSource();

  const docs = useQuery(
    api?.domains.documents.documents.getSidebar
      ? api.domains.documents.documents.getSidebar
      : "skip",
    api?.domains.documents.documents.getSidebar ? {} : "skip",
  );

  const convexFiles: LibraryFile[] = Array.isArray(docs)
    ? docs.map((d: any) => ({
        id: String(d._id),
        title: d.title ?? "Untitled",
        type: (d.documentType === "spreadsheet" ? "spreadsheet" : "document") as LibraryFile["type"],
        updatedAt: d._creationTime
          ? new Date(d._creationTime).toLocaleDateString("en-US", { month: "short", day: "numeric" })
          : "Recently",
        preview: d.excerpt ?? undefined,
      }))
    : [];

  return convexFiles;
}

// ─── File card ───────────────────────────────────────────────────

const CARD_ACTIONS = [
  { id: "open", label: "Open", icon: ExternalLink },
  { id: "download", label: "Download", icon: Download },
  { id: "copy-link", label: "Copy link", icon: Link2 },
  { id: "copy", label: "Copy to clipboard", icon: Copy },
] as const;

function FileCard({ file }: { file: LibraryFile }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const Icon = TYPE_ICON[file.type];

  return (
    <div
      className={cn(
        "group relative flex cursor-pointer flex-col rounded-xl border transition-all",
        "border-white/[0.06] bg-white/[0.02]",
        "hover:border-white/[0.12] hover:bg-white/[0.04]",
        "active:scale-[0.98] active:bg-white/[0.05]",
      )}
    >
      {/* Clickable card body */}
      <div className="flex flex-col gap-2 p-4 pb-3">
        {/* Icon row */}
        <div className="flex items-start justify-between">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-primary/8">
            <Icon className="h-4.5 w-4.5 text-accent-primary/70" />
          </div>

          {/* Always-visible menu button (Notion/Linear pattern) */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
              "text-content-muted/50 hover:bg-white/[0.08] hover:text-content-muted",
              menuOpen && "bg-white/[0.08] text-content-muted",
            )}
            aria-label="Actions"
            aria-expanded={menuOpen}
          >
            <Ellipsis className="h-4 w-4" />
          </button>
        </div>

        {/* Title + badge */}
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-content">{file.title}</span>
          {file.badge && (
            <span className="rounded-full bg-accent-primary/12 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-accent-primary">
              {file.badge}
            </span>
          )}
        </div>

        {/* Preview */}
        {file.preview && (
          <p className="line-clamp-2 text-[12px] leading-relaxed text-content-muted">
            {file.preview}
          </p>
        )}
      </div>

      {/* Footer: type + date */}
      <div className="flex items-center gap-2 border-t border-white/[0.04] px-4 py-2.5">
        <span className="text-[10px] font-medium uppercase tracking-wider text-content-muted/60">
          {TYPE_LABEL[file.type]}
        </span>
        <span className="text-content-muted/30">·</span>
        <span className="text-[10px] text-content-muted/60">{file.updatedAt}</span>
      </div>

      {/* Dropdown menu (always accessible, not hover-dependent) */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-0 top-12 z-20 w-44 rounded-lg border border-white/[0.08] bg-[#1e1d1c] py-1 shadow-xl">
            {CARD_ACTIONS.map((action) => {
              const ActionIcon = action.icon;
              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] text-content-muted transition-colors hover:bg-white/[0.06] hover:text-content"
                >
                  <ActionIcon className="h-3.5 w-3.5" />
                  {action.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Tabs ────────────────────────────────────────────────────────

const LIBRARY_TABS = [
  { id: "files", label: "Files", icon: FileText },
  { id: "changes", label: "Changes", icon: AlertTriangle },
] as const;

type LibraryTabId = (typeof LIBRARY_TABS)[number]["id"];

// ─── Main ────────────────────────────────────────────────────────

export function LibraryHome({
  selectedDocumentId,
  onDocumentSelect,
  isGridMode,
  setIsGridMode,
  selectedTaskId,
  selectedTaskSource,
  onSelectTask,
  onClearTaskSelection,
}: {
  selectedDocumentId?: Id<"documents"> | null;
  onDocumentSelect?: (id: Id<"documents"> | null) => void;
  isGridMode?: boolean;
  setIsGridMode?: React.Dispatch<React.SetStateAction<boolean>>;
  selectedTaskId?: Id<"tasks"> | null;
  selectedTaskSource?: "today" | "upcoming" | "week" | "other" | null;
  onSelectTask?: (id: Id<"tasks">, source: "today" | "upcoming" | "week" | "other") => void;
  onClearTaskSelection?: () => void;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get("tab");
  const activeTab: LibraryTabId =
    LIBRARY_TABS.some((t) => t.id === rawTab) ? (rawTab as LibraryTabId) : "files";

  const setTab = useCallback(
    (tab: LibraryTabId) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("tab", tab);
        return next;
      }, { replace: true });
    },
    [setSearchParams],
  );

  const files = useLibraryFiles();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showQuickNote, setShowQuickNote] = useState(false);

  const handleFileUpload = useCallback((fileList: FileList) => {
    // TODO: wire to Convex upload or local MCP ingest
    const names = Array.from(fileList).map((f) => f.name);
    console.log("[Library] Files selected for upload:", names);
  }, []);

  return (
    <div className="flex h-full flex-col items-center overflow-auto px-4 pb-24 pt-12">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".txt,.md,.csv,.json,.pdf,.docx,.xlsx,.png,.jpg,.jpeg"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleFileUpload(e.target.files);
          e.target.value = "";
        }}
      />

      {/* Headline */}
      <h1 className="text-center text-3xl font-bold text-content sm:text-4xl">
        Your <span className="text-accent-primary">library</span>
      </h1>
      <p className="mt-3 max-w-lg text-center text-sm text-content-muted">
        Everything NodeBench has produced. Click to open, hover to export or share.
      </p>
      <DataSourceBanner className="mt-3" />

      {/* Tab bar + action buttons */}
      <div className="mt-8 flex w-full max-w-4xl items-end justify-between border-b border-white/[0.06]">
        <div className="flex gap-1" role="tablist">
        {LIBRARY_TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "border-b-2 border-accent-primary text-content"
                  : "text-content-muted hover:text-content-secondary",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
        </div>

        {/* Action buttons — right side of tab bar */}
        <div className="flex items-center gap-1 pb-1">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-content-muted transition-colors hover:bg-white/[0.06] hover:text-content"
            aria-label="Upload file"
          >
            <Upload className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Upload</span>
          </button>
          <button
            type="button"
            onClick={() => setShowQuickNote(true)}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-content-muted transition-colors hover:bg-white/[0.06] hover:text-content"
            aria-label="Quick note"
          >
            <PenLine className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Note</span>
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-content-muted transition-colors hover:bg-white/[0.06] hover:text-content"
            aria-label="Add calendar event"
          >
            <CalendarPlus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Event</span>
          </button>
        </div>
      </div>

      {/* Quick note inline input */}
      {showQuickNote && (
        <div className="mt-4 w-full max-w-4xl">
          <div className="flex gap-2 rounded-xl border border-white/[0.08] bg-[#1a1918] p-3">
            <textarea
              autoFocus
              rows={2}
              placeholder="Quick note — paste context, links, or thoughts..."
              className="flex-1 resize-none bg-transparent text-[13px] text-content placeholder:text-content-muted/50 focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === "Escape") setShowQuickNote(false);
              }}
            />
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => setShowQuickNote(false)}
                className="rounded-lg bg-accent-primary/80 px-3 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-accent-primary"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setShowQuickNote(false)}
                className="rounded-lg px-3 py-1.5 text-[11px] text-content-muted transition-colors hover:text-content"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab content */}
      <div className="mt-6 w-full max-w-4xl">
        {activeTab === "files" && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {files.map((file) => (
              <FileCard key={file.id} file={file} />
            ))}
            {files.length === 0 && (
              <div className="col-span-full space-y-4">
                {/* Visible aha: show what a populated library looks like */}
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 opacity-60">
                  <div className="flex items-start justify-between">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-primary/8">
                      <FileBarChart className="h-4 w-4 text-accent-primary/70" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[13px] font-medium text-content">Anthropic AI — Investor Brief</span>
                    <span className="rounded-full bg-accent-primary/12 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-accent-primary">Example</span>
                  </div>
                  <p className="mt-1 text-[12px] text-content-muted">95% confidence · 20 sources · 3 signals · 2 contradictions</p>
                  <div className="mt-2 border-t border-white/[0.04] pt-2 text-[10px] text-content-muted/60">REPORT · Apr 9</div>
                </div>
                <p className="text-center text-xs text-content-muted">
                  Search for a company on the Ask page to create your first report.
                </p>
              </div>
            )}
          </div>
        )}
        {activeTab === "changes" && (
          <Suspense fallback={<ViewSkeleton variant="default" />}>
            <ChangeDetectorView />
          </Suspense>
        )}
      </div>
    </div>
  );
}

export default LibraryHome;
