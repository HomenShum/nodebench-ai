/**
 * LibraryHome — Canonical "Library" surface.
 *
 * Notion-style file grid. Reports and documents are the same visual object.
 * Two tabs: Files (unified grid) and Changes (timeline).
 */

import { lazy, Suspense, useCallback, useState } from "react";
import {
  FileText,
  AlertTriangle,
  Download,
  Link2,
  Copy,
  MoreHorizontal,
  Clock,
  FileBarChart,
  StickyNote,
  Table2,
  Bot,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { useConvexApi } from "@/lib/convexApi";
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

// ─── Demo files (until Convex wired) ─────────────────────────────

function useLibraryFiles(): LibraryFile[] {
  const api = useConvexApi();
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

  // Always show the latest generated report at the top
  const reportCard: LibraryFile = {
    id: "active-report",
    title: "Weekly Reset",
    type: "report",
    updatedAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    preview: "Your latest operating packet — company truth, contradictions, and next moves",
    badge: "Latest",
  };

  return [reportCard, ...convexFiles];
}

// ─── File card ───────────────────────────────────────────────────

function FileCard({ file }: { file: LibraryFile }) {
  const [hovered, setHovered] = useState(false);
  const Icon = TYPE_ICON[file.type];

  return (
    <div
      className={cn(
        "group relative flex flex-col gap-3 rounded-xl border p-4 transition-all",
        "border-white/[0.06] bg-white/[0.02]",
        "hover:border-white/[0.12] hover:bg-white/[0.04]",
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Top row: icon + type + date */}
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.04]">
          <Icon className="h-4 w-4 text-content-muted" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium uppercase tracking-wider text-content-muted">
              {TYPE_LABEL[file.type]}
            </span>
            {file.badge && (
              <span className="rounded-full bg-accent-primary/15 px-1.5 py-0.5 text-[9px] font-semibold text-accent-primary">
                {file.badge}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-content-muted">
          <Clock className="h-3 w-3" />
          {file.updatedAt}
        </div>
      </div>

      {/* Title */}
      <div className="text-sm font-medium text-content">{file.title}</div>

      {/* Preview */}
      {file.preview && (
        <div className="line-clamp-2 text-xs leading-relaxed text-content-muted">
          {file.preview}
        </div>
      )}

      {/* Hover actions */}
      <div
        className={cn(
          "absolute right-3 top-3 flex gap-1 transition-opacity",
          hovered ? "opacity-100" : "opacity-0",
        )}
      >
        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded-md bg-white/[0.08] text-content-muted transition-colors hover:bg-white/[0.15] hover:text-content"
          aria-label="Download"
        >
          <Download className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded-md bg-white/[0.08] text-content-muted transition-colors hover:bg-white/[0.15] hover:text-content"
          aria-label="Copy link"
        >
          <Link2 className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded-md bg-white/[0.08] text-content-muted transition-colors hover:bg-white/[0.15] hover:text-content"
          aria-label="More actions"
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
      </div>
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

  return (
    <div className="flex h-full flex-col items-center overflow-auto px-4 pb-24 pt-12">
      {/* Headline */}
      <h1 className="text-center text-3xl font-bold text-content sm:text-4xl">
        Your <span className="text-accent-primary">library</span>
      </h1>
      <p className="mt-3 max-w-lg text-center text-sm text-content-muted">
        Everything NodeBench has produced. Click to open, hover to export or share.
      </p>

      {/* Tab bar */}
      <div className="mt-8 flex w-full max-w-4xl gap-1 border-b border-white/[0.06]" role="tablist">
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

      {/* Tab content */}
      <div className="mt-6 w-full max-w-4xl">
        {activeTab === "files" && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {files.map((file) => (
              <FileCard key={file.id} file={file} />
            ))}
            {files.length === 0 && (
              <div className="col-span-full py-16 text-center text-sm text-content-muted">
                No files yet. Search for a company or run a workflow to create your first report.
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
