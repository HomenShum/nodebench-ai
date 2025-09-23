import { useState, useEffect, useMemo, useRef, useCallback, memo } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useQuery, useMutation, useAction } from "convex/react";

/*

  UI Editing Guidelines (DocumentsHomeHub)

  ---------------------------------------

  Task Editing:

  - List mode (Today, This Week): Use InlineTaskEditor inline under the clicked TaskRowGlobal.

    No multi-field popover editors. Enter=save/apply, Esc=close, keep focus inside inline editor.

    Quick chips (status/priority/dates) may open single-purpose anchored popovers; dismiss on pick/Esc.

    Left status stripe: full height, no left-edge rounding; click cycles todo → in_progress → done → blocked; don't start drag on stripe click.

  - Kanban mode: Use TaskEditorPanel for full editing (no large inline expansion).

    Allow tiny popovers for quick actions (priority menu, date picker) and keep card visuals standardized (rounded-xl, focus ring, no hover motion).


  Document Editing:

  - Full content editing opens in the main Editor view (not inline here).

  - Minimal metadata edits allowed: prefer inline rename (Enter=commit, Esc=cancel),

    or a compact anchored popover with a single input. No multi-field popovers for documents.

    Tags/favorite can be inline toggles or small, single-purpose popovers.

*/

import { api } from "../../convex/_generated/api";
import { Id, Doc } from "../../convex/_generated/dataModel";

import {
  FileText,
  Calendar,
  File,
  Plus,
  Sparkles,
  Lightbulb,
  Grid3X3,
  Archive,
  Edit3,
  Star,
  CalendarDays,
  GitBranch,
  ListTodo,
  KanbanSquare,
  Send,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  X,
  Trash2,
  Loader2,
  ArrowRightLeft,
} from "lucide-react";

import { FileTypeIcon } from "./FileTypeIcon";
import AgendaMiniRow from "./agenda/AgendaMiniRow";
import { inferFileType, type FileType } from "../lib/fileTypes";
import { getThemeForFileType } from "../lib/documentThemes";
import MetaPills from "./MetaPills";
import { docToPills, taskToPills } from "../lib/metaPillMappers";
import { shapeTaskForPills, reorderTaskPillsForTightRows } from "../lib/tasks";
import { CalendarView } from "@/components/views/CalendarView";
import { MiniMonthCalendar } from "./MiniMonthCalendar";
import { usePlannerState } from "@/hooks/usePlannerState";
import { SidebarMiniCalendar } from "@/components/shared/SidebarMiniCalendar";
import { SidebarUpcoming } from "@/components/shared/SidebarUpcoming";
import { TopDividerBar } from "@/components/shared/TopDividerBar";
import { UnifiedHubPills } from "@/components/shared/UnifiedHubPills";
import { PageHeroHeader } from "@/components/shared/PageHeroHeader";
import { PresetChip } from "@/components/shared/PresetChip";

// Migrated list DnD to dnd-kit; removed @hello-pangea/dnd

import MiniEditorPopover from "./MiniEditorPopover.tsx";
import AgendaEditorPopover from "./agenda/AgendaEditorPopover";
import AgendaHoverPreview from "./agenda/AgendaHoverPreview";

// Stable UI shape for document cards/rows

type DocumentCardData = {
  _id: Id<"documents">;
  title: string;
  contentPreview: string | null;
  documentType: "file" | "text" | "timeline";
  fileType?: string;
  fileName?: string;
  fileId?: Id<"files">;
  lastModified?: number;
  createdAt: number;
  createdBy: Id<"users">;
  isArchived: boolean;
  isFavorite: boolean;
  coverImage?: Id<"_storage">;
  icon?: string;
};

const statusChipClasses = (s?: string) => {
  switch (s) {
    case "in_progress":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "done":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "blocked":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "todo":
    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
};
const statusLabel = (s?: string) => {
  switch (s) {
    case "in_progress":
      return "IN PROGRESS";
    case "done":
      return "DONE";
    case "blocked":
      return "BLOCKED";
    case "todo":
    default:
      return "TODO";
  }
};

function normalizeDocument(d: any): DocumentCardData {
  const title = (d?.title ?? "Untitled") as string;
  const contentPreview = (d?.contentPreview ?? null) as string | null;
  const rawType = d?.documentType as "file" | "text" | "timeline" | undefined;
  const isFile = rawType === "file" || !!d?.fileId;
  const documentType: "file" | "text" | "timeline" =
    rawType === "timeline" ? "timeline" : isFile ? "file" : "text";
  return {
    _id: d._id as Id<"documents">,
    title,
    contentPreview,
    documentType,
    fileType: typeof d?.fileType === "string" ? d.fileType : undefined,
    fileName: typeof d?.fileName === "string" ? d.fileName : undefined,
    fileId: d?.fileId as Id<"files"> | undefined,
    lastModified: d?.lastModified as number | undefined,
    createdAt: Number(d?._creationTime ?? 0),
    createdBy: d.createdBy as Id<"users">,
    isArchived: !!d?.isArchived,
    isFavorite: !!d?.isFavorite,
    coverImage: d?.coverImage as Id<"_storage"> | undefined,
    icon: typeof d?.icon === "string" ? d.icon : undefined,
  };
}

// dnd-kit for Kanban migration

import {
  DndContext,
  DragStartEvent,
  DragEndEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
  DragOverlay,
  closestCenter,
} from "@dnd-kit/core";

import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

import { restrictToWindowEdges } from "@dnd-kit/modifiers";

import { toast } from "sonner";

import TaskEditorPanel from "./TaskEditorPanel";

import MiniAgendaEditorPanel from "./MiniAgendaEditorPanel";

import FiltersToolsBar from "./FiltersToolsBar";

import { DocumentsGridSortable } from "./DocumentsGridSortable";

import { SortableList } from "./SortableList";

import { useDropzone } from "react-dropzone";

import { AgendaSortableItem } from "./agenda/AgendaSortableItem";

// Local task type aliases to tighten status/priority typing across this component

type TaskStatus = "todo" | "in_progress" | "done" | "blocked";

type Status = TaskStatus;

// Narrow a droppableId string into our TaskStatus union

const isTaskStatus = (v: string): v is TaskStatus =>
  v === "todo" || v === "in_progress" || v === "done" || v === "blocked";

// Unified helpers for events in Agenda rows

const eventStatusBar = (s?: string) => {
  switch (s) {
    case "confirmed":
      return "bg-emerald-500/60";

    case "tentative":
      return "bg-amber-500/60";

    case "cancelled":
      return "bg-rose-500/60";

    default:
      return "bg-[var(--border-color)]";
  }
};

const isAllDayEvent = (ev: any) => {
  if (ev?.allDay === true) return true;

  const s = ev?.startTime ? new Date(ev.startTime) : null;

  const en = ev?.endTime ? new Date(ev.endTime) : null;

  if (!s || !en) return false;

  return (
    s.getHours() === 0 &&
    s.getMinutes() === 0 &&
    en.getHours() === 23 &&
    en.getMinutes() >= 59
  );
};

const renderEventTime = (e: any) => {
  if (isAllDayEvent(e)) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] bg-amber-50 border-amber-200 text-amber-700">
        All-day
      </span>
    );
  }

  const start = e?.startTime ? new Date(e.startTime) : null;

  const end = e?.endTime ? new Date(e.endTime) : null;

  if (start && end) {
    return (
      <span
        className="text-[10px] px-1.5 py-0.5 rounded-md border bg-[var(--bg-primary)] text-[var(--text-secondary)] border-[var(--border-color)]"
        title={`${start.toLocaleString()} – ${end.toLocaleString()}`}
      >
        {start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} –{" "}
        {end.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
      </span>
    );
  }

  if (start) {
    return (
      <span
        className="text-[10px] px-1.5 py-0.5 rounded-md border bg-[var(--bg-primary)] text-[var(--text-secondary)] border-[var(--border-color)]"
        title={start.toLocaleString()}
      >
        {start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
      </span>
    );
  }

  return <span className="text-[var(--text-secondary)]">No time</span>;
};

// Shared status stripe color helper for tasks (module scope so all sections can use it)

const kanbanStatusBar = (s?: string) => {
  switch (s) {
    case "todo":
      return "bg-slate-400/70";

    case "in_progress":
      return "bg-blue-400/70";

    case "done":
      return "bg-emerald-500/80";

    case "blocked":
      return "bg-rose-500/80";

    default:
      return "bg-[var(--border-color)]";
  }
};

// Shared priority badge styling helper (used across multiple renderers)

const priorityClasses = (p?: string) => {
  switch ((p || "").toLowerCase()) {
    case "low":
      return "bg-green-500/10 text-green-700 border-green-400/30";

    case "medium":
      return "bg-yellow-500/10 text-yellow-700 border-yellow-400/30";

    case "high":
      return "bg-orange-500/10 text-orange-700 border-orange-400/30";

    case "urgent":
      return "bg-red-500/10 text-red-700 border-red-400/30";

    default:
      return "bg-[var(--bg-primary)] text-[var(--text-secondary)] border-[var(--border-color)]";
  }
};

// Shared section header classes for consistent typography across h2/h3

const sectionHeader = "text-base font-semibold text-gray-500";

const tipBadge =
  "inline-flex items-center gap-1 px-1.5 py-0 rounded-full border text-[10px] bg-amber-50 text-amber-700 border-amber-200";

// Shared dnd-kit sortable item wrapper for Kanban lists (module scope)

function KanbanSortableItem({
  id,

  rowStyle,

  children,
}: {
  id: Id<"tasks"> | Id<"events"> | string; // supports both task and event ids

  rowStyle: CSSProperties;

  children: (isDragging: boolean) => ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const baseTransform = CSS.Transform.toString(transform);

  const composedTransform =
    isDragging && baseTransform
      ? `${baseTransform} scale(1.03)`
      : baseTransform;

  const style: CSSProperties = {
    ...rowStyle,

    transform: composedTransform,

    transition: transition ?? "transform 180ms cubic-bezier(0.2, 0, 0, 1)",

    willChange: transform ? "transform" : undefined,

    zIndex: isDragging ? 50 : undefined,

    backfaceVisibility: "hidden",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      tabIndex={0}
      aria-grabbed={isDragging}
      className={isDragging ? undefined : undefined}
    >
      {children(isDragging)}
    </div>
  );
}

// Shared dnd-kit droppable lane wrapper for Kanban lanes (module scope)

function KanbanLane({
  laneId,

  density,

  children,
}: {
  laneId: string; // supports task status lanes and an "events" lane

  density: "compact" | "comfortable";

  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: laneId });

  return (
    <div
      ref={setNodeRef}
      className={`document-card--hybrid relative overflow-hidden ${density === "compact" ? "p-0" : "p-0.5"} min-h-[260px] flex flex-col gap-1 rounded-none border-0 transition-none hover:shadow-none hover:ring-0 hover:scale-100 hover:bg-transparent ${
        // status-tinted background per lane

        laneId === "in_progress"
          ? "bg-blue-500/5"
          : laneId === "done"
            ? "bg-emerald-500/5"
            : laneId === "blocked"
              ? "bg-rose-500/5"
              : laneId === "events"
                ? "bg-amber-500/5"
                : "bg-slate-500/5"
      } ${isOver ? "ring-1 ring-[var(--accent-primary)]/40" : ""}`}
    >
      {children}
    </div>
  );
}

// Small helper to render reference pills for tasks

const RefsPills = ({
  refs,

  onOpenRef,
}: {
  refs?: Array<{ kind: "document" | "task" | "event"; id: string }> | null;

  onOpenRef?: (kind: "document" | "task" | "event", id: string) => void;
}) => {
  const list = Array.isArray(refs) ? refs : [];

  const docIds = useMemo(
    () => list.filter((r) => r.kind === "document").map((r) => r.id),
    [list],
  );

  const taskIds = useMemo(
    () => list.filter((r) => r.kind === "task").map((r) => r.id),
    [list],
  );

  const eventIds = useMemo(
    () => list.filter((r) => r.kind === "event").map((r) => r.id),
    [list],
  );

  const docIdsTyped = docIds as unknown as Array<Id<"documents">>;

  const taskIdsTyped = taskIds as unknown as Array<Id<"tasks">>;

  const eventIdsTyped = eventIds as unknown as Array<Id<"events">>;

  const docTitles = useQuery(
    api.documents.getTitles,
    docIdsTyped.length ? { ids: docIdsTyped } : "skip",
  ) as Array<{ _id: Id<"documents">; title: string }> | undefined;

  const taskTitles = useQuery(
    api.tasks.getTitles,
    taskIdsTyped.length ? { ids: taskIdsTyped } : "skip",
  ) as Array<{ _id: Id<"tasks">; title: string }> | undefined;

  const eventTitles = useQuery(
    api.events.getTitles,
    eventIdsTyped.length ? { ids: eventIdsTyped } : "skip",
  ) as Array<{ _id: Id<"events">; title: string }> | undefined;

  const titleById = useMemo(() => {
    const m: Record<string, string> = {};

    for (const a of docTitles ?? []) if (a?._id) m[String(a._id)] = a.title;

    for (const a of taskTitles ?? []) if (a?._id) m[String(a._id)] = a.title;

    for (const a of eventTitles ?? []) if (a?._id) m[String(a._id)] = a.title;

    return m;
  }, [docTitles, taskTitles, eventTitles]);

  if (!list.length) return null;

  return (
    <>
      {list.slice(0, 3).map((r, idx) => (
        <button
          key={`${r.kind}:${r.id}:${idx}`}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenRef?.(r.kind, r.id);
          }}
          className="text-[10px] px-1.5 py-0.5 rounded-md border bg-[var(--bg-primary)] text-[var(--text-secondary)] border-[var(--border-color)] hover:bg-[var(--bg-hover)]"
          title={`${r.kind.toUpperCase()}: ${titleById[r.id] ?? r.id}`}
        >
          <span className="uppercase mr-1">{r.kind[0]}</span>

          <span className="truncate inline-block max-w-[120px] align-top">
            {titleById[r.id] ?? r.id}
          </span>
        </button>
      ))}

      {list.length > 3 && (
        <span
          className="text-[10px] px-1.5 py-0.5 rounded-md border bg-[var(--bg-primary)] text-[var(--text-muted)] border-[var(--border-color)]"
          title={`${list.length - 3} more references`}
        >
          +{list.length - 3}
        </span>
      )}
    </>
  );
};

// Globally scoped TaskRow for reuse across sections (Activity, Agenda, etc.)

const TaskRowGlobal = ({
  t,

  kind = "task",

  onSelect,

  onChangeStatus: _onChangeStatus,

  density: _density = "comfortable",

  onOpenRef,
}: {
  t: any;

  kind?: "task" | "event";

  onSelect?: (id: Id<"tasks"> | Id<"events">) => void;

  onChangeStatus?: (
    id: Id<"tasks"> | Id<"events">,

    status: TaskStatus | "confirmed" | "tentative" | "cancelled",
  ) => void;

  density?: "compact" | "comfortable";

  onOpenRef?: (kind: "document" | "task" | "event", id: string) => void;
}) => {
  // Use module-level priorityClasses

  const me = useQuery(api.auth.loggedInUser);

  const taskStatusBar = (s?: string) => {
    switch (s) {
      case "todo":
        return "bg-slate-400/70";

      case "in_progress":
        return "bg-blue-400/70";

      case "done":
        return "bg-emerald-500/80";

      case "blocked":
        return "bg-rose-500/80";

      default:
        return "bg-[var(--border-color)]";
    }
  };

  // (status theme removed in compact variant)

  // Local mutations for favorite and delete actions

  const toggleTaskFavorite = useMutation(api.tasks.toggleFavorite);

  const deleteTaskLocal = useMutation(api.tasks.deleteTask);

  const updateTaskStatus = useMutation(api.tasks.updateTask);

  // Event-side actions

  const deleteEventLocal = useMutation(api.events.deleteEvent);

  const createEventLocal = useMutation(api.events.createEvent);

  const createTaskLocal = useMutation(api.tasks.createTask);

  const handleStarClick = (e: any) => {
    e.stopPropagation();

    toggleTaskFavorite({ taskId: t._id }).catch(console.error);
  };

  const handleDeleteTask = (e: any) => {
    e.stopPropagation();

    if (window.confirm("Delete this task? This cannot be undone.")) {
      deleteTaskLocal({ taskId: t._id }).catch(console.error);
    }
  };

  // Convert helpers scoped to this row

  const convertEventToTask = async () => {
    try {
      const ev: any = t;

      const title = String(ev?.title ?? "Untitled");

      const baseDesc =
        typeof ev?.description === "string" ? ev.description : "";

      const hasAllDay = !!ev?.allDay;

      const sMs = typeof ev?.startTime === "number" ? ev.startTime : undefined;

      const eMs = typeof ev?.endTime === "number" ? ev.endTime : sMs;

      const parts: string[] = [];

      if (typeof sMs === "number") {
        const s = new Date(sMs);

        const e = new Date(typeof eMs === "number" ? eMs : sMs);

        if (hasAllDay) {
          parts.push(`Event time: ${s.toLocaleDateString()}`);
        } else {
          const sd = s.toLocaleDateString();

          const st = s.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });

          const et = e.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });

          parts.push(`Event time: ${sd} ${st} - ${et}`);
        }
      }

      if (typeof ev?.location === "string" && ev.location.trim()) {
        parts.push(`Location: ${ev.location.trim()}`);
      }

      const metaBlock = parts.length ? `\n\n---\n${parts.join("\n")}` : "";

      const description = `${baseDesc}${metaBlock}`.trim();

      const descriptionJson =
        typeof ev?.descriptionJson === "string"
          ? ev.descriptionJson
          : undefined;

      const due = typeof ev?.startTime === "number" ? ev.startTime : undefined;

      const docId = ev?.documentId as Id<"documents"> | undefined;

      const tagsArr: string[] = Array.isArray(ev?.tags)
        ? ((ev.tags as any[]).filter((x) => typeof x === "string") as string[])
        : [];

      const colorVal =
        typeof ev?.color === "string" && ev.color.trim()
          ? ev.color.trim()
          : undefined;

      await createTaskLocal({
        title,

        description: description || undefined,

        descriptionJson,

        dueDate: due,

        documentId: docId,

        refs: [{ kind: "event", id: ev._id as Id<"events"> }],

        tags: tagsArr.length ? tagsArr : undefined,

        color: colorVal,
      });

      await deleteEventLocal({ eventId: ev._id as Id<"events"> });

      toast.success("Converted event to task");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to convert event");
    }
  };

  const convertTaskToEvent = async () => {
    try {
      const task: any = t;

      const title = String(task?.title ?? "Untitled");

      const description =
        typeof task?.description === "string" ? task.description : "";

      const descriptionJson =
        typeof task?.descriptionJson === "string"
          ? task.descriptionJson
          : undefined;

      const start =
        typeof task?.startDate === "number"
          ? task.startDate
          : typeof task?.dueDate === "number"
            ? task.dueDate
            : Date.now();

      const end = start + 60 * 60 * 1000;

      const colorVal =
        typeof task?.color === "string" && task.color.trim()
          ? task.color.trim()
          : undefined;

      const docId = task?.documentId as Id<"documents"> | undefined;

      const tagsArr: string[] = Array.isArray(task?.tags)
        ? ((task.tags as any[]).filter(
            (x) => typeof x === "string",
          ) as string[])
        : [];

      await createEventLocal({
        title,

        description: description || undefined,

        descriptionJson,

        startTime: start,

        endTime: end,

        allDay: false,

        color: colorVal,

        documentId: docId,

        tags: tagsArr.length ? tagsArr : undefined,

        status: "confirmed",
      });

      await deleteTaskLocal({ taskId: task._id as Id<"tasks"> });

      toast.success("Converted task to event");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to convert task");
    }
  };

  const handleStripeToggle = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();

    if (kind === "task") {
      const next = cycleStatus(t.status as TaskStatus);

      if (_onChangeStatus) {
        _onChangeStatus(t._id, next);
      } else {
        updateTaskStatus({ taskId: t._id, status: next }).catch(console.error);
      }
    } else {
      const next = cycleEventStatus(t.status as string);

      _onChangeStatus?.(t._id, next);
    }
  };

  return (
    <div className="group relative">
      <div
        className={
          // Compact row style for unified task/event row

          "document-item group/doc relative px-3 py-2 rounded-sm overflow-hidden cursor-pointer text-sm " +
          "bg-[var(--bg-secondary)] border border-[var(--border-color)] " +
          "transition-all duration-200 hover:bg-[var(--bg-hover)] " +
          "flex items-center justify-between " +
          "focus-within:outline-none focus-within:ring-2 focus-within:ring-[var(--accent-primary)] hover:ring-2 ring-1 ring-[var(--accent-primary)]/10"
        }
        role="button"
        tabIndex={0}
        onClick={() => onSelect?.(t._id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();

            onSelect?.(t._id);
          }
        }}
      >
        {/* Watermark: consistent with DocumentCards via shared class */}

        <span
          className="document-card__bg document-row__bg text-[var(--accent-primary)]"
          aria-hidden
        >
          {kind === "event" ? (
            <CalendarDays className="h-10 w-10 rotate-12" />
          ) : (
            <ListTodo className="h-10 w-10 rotate-12" />
          )}
        </span>

        {/* Left status bar: full-height clickable stripe to cycle status */}

        <span
          className={`absolute left-0 top-0 bottom-0 w-1 ${kind === "event" ? eventStatusBar(t.status) : taskStatusBar(t.status)} cursor-pointer`}
          role="button"
          tabIndex={0}
          title={
            kind === "event"
              ? "Cycle status"
              : "Cycle status (todo → in_progress → done → blocked)"
          }
          aria-label={kind === "event" ? "Cycle status" : "Cycle task status"}
          onClick={handleStripeToggle}
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();

              handleStripeToggle(e);
            }
          }}
        />

        {/* Content row */}

        <div className="flex items-center gap-3 min-w-0">
          {/* Completion / All-day checkbox */}

          {kind === "task" ? (
            <input
              type="checkbox"
              checked={t.status === "done"}
              onChange={(e) => {
                e.stopPropagation();

                const next: TaskStatus = t.status === "done" ? "todo" : "done";

                _onChangeStatus?.(t._id, next);
              }}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              aria-label={
                t.status === "done"
                  ? "Mark as not completed"
                  : "Mark as completed"
              }
              className="h-4 w-4 rounded border-[var(--border-color)] text-emerald-600 focus:ring-2 focus:ring-emerald-500/50 bg-white"
            />
          ) : isAllDayEvent(t) ? (
            <input
              type="checkbox"
              checked={t.status !== "cancelled"}
              onChange={(e) => {
                e.stopPropagation();

                _onChangeStatus?.(
                  t._id,
                  e.target.checked ? "confirmed" : "cancelled",
                );
              }}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              aria-label={
                t.status !== "cancelled"
                  ? "Mark event unchecked"
                  : "Mark event checked"
              }
              className="h-4 w-4 rounded border-[var(--border-color)] text-emerald-600 focus:ring-2 focus:ring-emerald-500/50 bg-white"
            />
          ) : (
            <div className="w-4 h-4" />
          )}

          {/* Small neutral icon tile */}

          <div className="w-7 h-7 rounded-md bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-secondary)] flex items-center justify-center shrink-0">
            {kind === "event" ? (
              <CalendarDays className="h-4 w-4 group-hover/doc:text-[var(--text-primary)]" />
            ) : (
              <ListTodo className="h-4 w-4 group-hover/doc:text-[var(--text-primary)]" />
            )}
          </div>

          <div className="min-w-0">
            <div
              className={`text-sm font-medium truncate ${kind === "task" && t.status === "done" ? "text-[var(--text-secondary)] line-through" : "text-[var(--text-primary)]"}`}
            >
              {t.title}
            </div>

            <div className="mt-1 flex items-center gap-2 flex-nowrap overflow-hidden">
              {kind === "task" ? (
                <>
                  {t.status && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-md border ${statusChipClasses(t.status)}`}
                      title={`Status: ${t.status}`}
                    >
                      {statusLabel(t.status)}
                    </span>
                  )}

                  {t.priority && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-md border ${priorityClasses(t.priority)}`}
                      title={`Priority: ${t.priority}`}
                    >
                      {String(t.priority).toUpperCase()}
                    </span>
                  )}

                  {t.dueDate && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-md border bg-[var(--bg-primary)] text-[var(--text-secondary)] border-[var(--border-color)]"
                      title={`Due ${new Date(t.dueDate).toLocaleString()}`}
                    >
                      Due {new Date(t.dueDate).toLocaleDateString()}
                    </span>
                  )}

                  {/* References */}

                  <RefsPills
                    refs={(() => {
                      const o: unknown = t;

                      if (
                        o &&
                        typeof o === "object" &&
                        "refs" in (o as Record<string, unknown>)
                      ) {
                        const r = (o as Record<string, unknown>)
                          .refs as unknown;

                        return Array.isArray(r)
                          ? (r as Array<{
                              kind: "document" | "task" | "event";
                              id: string;
                            }>)
                          : undefined;
                      }

                      return undefined;
                    })()}
                    onOpenRef={onOpenRef}
                  />
                </>
              ) : (
                <>
                  {renderEventTime(t)}

                  {isAllDayEvent(t) && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-md border bg-[var(--bg-primary)] text-[var(--text-secondary)] border-[var(--border-color)]"
                      title={`Date ${new Date(t.startTime).toLocaleDateString()}`}
                    >
                      {new Date(t.startTime).toLocaleDateString()}
                    </span>
                  )}

                  {/* Optional event references (for future) */}

                  <RefsPills
                    refs={(() => {
                      const o: unknown = t;

                      if (
                        o &&
                        typeof o === "object" &&
                        "refs" in (o as Record<string, unknown>)
                      ) {
                        const r = (o as Record<string, unknown>)
                          .refs as unknown;

                        return Array.isArray(r)
                          ? (r as Array<{
                              kind: "document" | "task" | "event";
                              id: string;
                            }>)
                          : undefined;
                      }

                      return undefined;
                    })()}
                    onOpenRef={onOpenRef}
                  />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right-side meta */}

        <div className="ml-2 mr-1 flex items-center">
          <div className="w-5 h-5" />
        </div>

        {/* Actions */}

        <div className="flex items-center gap-1 transition-opacity duration-200 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100">
          {kind === "task" ? (
            <>
              {/* Favorite */}

              <button
                onClick={handleStarClick}
                aria-label={t.isFavorite ? "Unfavorite task" : "Favorite task"}
                title={t.isFavorite ? "Unfavorite" : "Favorite"}
                className={`w-6 h-6 rounded-md flex items-center justify-center transition-all duration-200 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] ${
                  t.isFavorite
                    ? "bg-yellow-500 text-yellow-100 shadow-sm"
                    : "bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)] border border-[var(--border-color)]"
                }`}
              >
                <Star
                  className={`h-3.5 w-3.5 ${t.isFavorite ? "fill-current" : ""}`}
                />
              </button>

              {/* Delete */}

              <button
                onClick={handleDeleteTask}
                aria-label="Delete task"
                title="Delete"
                className="w-6 h-6 rounded-md flex items-center justify-center bg-[var(--bg-primary)] hover:bg-red-500 text-[var(--text-secondary)] hover:text-white border border-[var(--border-color)] hover:border-red-500 transition-all duration-200 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>

              {/* Open */}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect?.(t._id);
                }}
                aria-label="Open"
                title="Open"
                className="w-6 h-6 rounded-md flex items-center justify-center bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)] border border-[var(--border-color)] hover:border-[var(--accent-primary)]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
              >
                <Edit3 className="h-3.5 w-3.5" />
              </button>

              {/* Convert to Event */}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  void convertTaskToEvent();
                }}
                aria-label="Convert to event"
                title="Convert to event"
                className="w-6 h-6 rounded-md flex items-center justify-center bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)] border border-[var(--border-color)] hover:border-[var(--accent-primary)]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
              >
                <ArrowRightLeft className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <>
              {/* Delete event */}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (
                    window.confirm("Delete this event? This cannot be undone.")
                  ) {
                    deleteEventLocal({ eventId: t._id }).catch(console.error);
                  }
                }}
                aria-label="Delete event"
                title="Delete"
                className="w-6 h-6 rounded-md flex items-center justify-center bg-[var(--bg-primary)] hover:bg-red-500 text-[var(--text-secondary)] hover:text-white border border-[var(--border-color)] hover:border-red-500 transition-all duration-200 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>

              {/* Open event */}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect?.(t._id);
                }}
                aria-label="Open"
                title="Open"
                className="w-6 h-6 rounded-md flex items-center justify-center bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)] border border-[var(--border-color)] hover:border-[var(--accent-primary)]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
              >
                <Edit3 className="h-3.5 w-3.5" />
              </button>

              {/* Convert to Task */}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  void convertEventToTask();
                }}
                aria-label="Convert to task"
                title="Convert to task"
                className="w-6 h-6 rounded-md flex items-center justify-center bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)] border border-[var(--border-color)] hover:border-[var(--accent-primary)]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
              >
                <ArrowRightLeft className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Holiday row styled like TaskRowGlobal for consistency in list mode

const HolidayRowGlobal = ({ h }: { h: any }) => {
  const title = String(h?.name ?? h?.title ?? "Holiday");

  const toLocalDate = (): string | null => {
    if (typeof h?.dateKey === "string") {
      const parts = String(h.dateKey).split("-");

      if (parts.length === 3) {
        const y = Number(parts[0]);

        const m = Number(parts[1]);

        const d = Number(parts[2]);

        if (!Number.isNaN(y) && !Number.isNaN(m) && !Number.isNaN(d)) {
          return new Date(y, m - 1, d, 0, 0, 0, 0).toLocaleDateString();
        }
      }
    }

    if (typeof h?.dateMs === "number")
      return new Date(h.dateMs).toLocaleDateString();

    return null;
  };

  const dateStr = toLocalDate();

  return (
    <div className="group relative">
      <div
        className={
          "document-item group/doc relative px-3 py-2 rounded-sm overflow-hidden cursor-pointer text-sm " +
          "bg-[var(--bg-secondary)] border border-[var(--border-color)] " +
          "transition-all duration-200 hover:bg-[var(--bg-hover)] " +
          "flex items-center justify-between " +
          "focus-within:outline-none focus-within:ring-2 focus-within:ring-[var(--accent-primary)] hover:ring-2 ring-1 ring-[var(--accent-primary)]/10"
        }
        role="button"
        tabIndex={0}
      >
        {/* Watermark */}

        <span
          className="document-card__bg document-row__bg text-[var(--accent-primary)]"
          aria-hidden
        >
          <CalendarDays className="h-10 w-10 rotate-12" />
        </span>

        {/* Left status bar: purple for holidays */}

        <span
          className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500/70"
          aria-hidden
        />

        <div className="flex items-center gap-3 min-w-0">
          {/* Checkbox placeholder to align */}

          <input
            type="checkbox"
            checked
            readOnly
            aria-label="All-day"
            className="h-4 w-4 rounded border-[var(--border-color)] text-emerald-600 bg-white"
          />

          <div className="w-7 h-7 rounded-md bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-secondary)] flex items-center justify-center shrink-0">
            <CalendarDays className="h-4 w-4 group-hover/doc:text-[var(--text-primary)]" />
          </div>

          <div className="min-w-0">
            <div className="text-sm font-medium truncate text-[var(--text-primary)]">
              {title}
            </div>

            <div className="mt-1 flex items-center gap-2 flex-nowrap overflow-hidden">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md border text-[10px] bg-amber-50 border-amber-200 text-amber-700">
                All-day
              </span>

              {dateStr && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-md border bg-[var(--bg-primary)] text-[var(--text-secondary)] border-[var(--border-color)]"
                  title={`Date ${dateStr}`}
                >
                  {dateStr}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="ml-2 mr-1 flex items-center">
          <div className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};

interface DocumentsHomeHubProps {
  onDocumentSelect: (documentId: Id<"documents">) => void;

  onGridModeToggle?: () => void;

  hideCalendarCard?: boolean;

  // Header controls centralized in Top Bar (no header props here)

  // Lifted task selection state & handlers from MainLayout

  selectedTaskId?: Id<"tasks"> | null;

  selectedTaskSource?: "today" | "upcoming" | "week" | "other" | null;

  onSelectTask?: (
    id: Id<"tasks">,

    source: "today" | "upcoming" | "week" | "other",
  ) => void;

  onClearTaskSelection?: () => void;
}

// (old inline DocumentCardData interface removed; using module-scope type instead)

const getDocumentTypeIcon = (doc: DocumentCardData) => {
  let t: FileType;

  if (doc.documentType === "file") {
    const ft = String(doc.fileType || "").toLowerCase();

    // If backend set a category like "video", honor it directly.

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
    ) {
      t = ft as FileType;
    } else {
      // Fall back to inferring from fileName (preferred) or title

      const nameGuess = doc.fileName || doc.title;

      t = inferFileType({ name: nameGuess });
    }
  } else {
    // For non-file docs: if the title clearly looks like a file (e.g., ends with .xlsx), infer from title; otherwise treat as nbdoc

    const lower = String(doc.title || "").toLowerCase();

    const looksLikeFile =
      /\.(csv|xlsx|xls|pdf|mp4|mov|webm|avi|mkv|jpg|jpeg|png|webp|gif|json|txt|md|markdown|js|ts|tsx|jsx|py|rb|go|rs|html|css|scss|sh)$/.test(
        lower,
      );

    t = looksLikeFile
      ? inferFileType({ name: doc.title })
      : inferFileType({ name: doc.title, isNodebenchDoc: true });
  }

  return <FileTypeIcon type={t} className="h-5 w-5" />;
};

// DocumentCard component for individual document cards

interface DocumentCardProps {
  doc: DocumentCardData;

  onSelect: (documentId: Id<"documents">) => void;

  onDelete?: (documentId: Id<"documents">) => void;

  onToggleFavorite?: (documentId: Id<"documents">) => void;

  hybrid?: boolean;

  isDragging?: boolean;

  onOpenMiniEditor?: (
    documentId: Id<"documents">,
    anchorEl: HTMLElement,
  ) => void;

  openOnSingleClick?: boolean;

  // Multi-select support

  isSelected?: boolean;

  onToggleSelect?: (documentId: Id<"documents">) => void;

  // Return true if handled (e.g., Ctrl/Cmd/Shift selection), to prevent default open

  onCardMouseClick?: (
    documentId: Id<"documents">,
    e: React.MouseEvent,
  ) => boolean | void;

  // Analyze support

  onAnalyzeFile?: (doc: DocumentCardData) => void;

  analyzeRunning?: boolean;
}

//

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
}: DocumentCardProps & {
  onAnalyzeFile?: (doc: DocumentCardData) => void;
  analyzeRunning?: boolean;
}) {
  const clickTimerRef = useRef<number | null>(null);

  const clickDelay = 250; // ms to distinguish single vs double click

  const handlePinClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    onToggleFavorite?.(doc._id);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    onDelete?.(doc._id);
  };

  // Subtle styling for calendar documents to improve visual hierarchy

  const isCalendarDoc =
    (!doc.documentType || doc.documentType === "text") &&
    (doc.title.toLowerCase().includes("calendar") ||
      doc.title.toLowerCase().includes("schedule"));

  // Theme by document type for consistent visuals across cards

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

  return (
    <div className="group relative">
      <div
        onClick={(e) => {
          // Let parent handle modifier-key selection first

          if (onCardMouseClick) {
            const handled = onCardMouseClick(doc._id, e);

            if (handled) return;
          }

          // If configured, open the document immediately on single click

          if (openOnSingleClick) {
            onSelect(doc._id);

            return;
          }

          // Defer single-click to allow dblclick to cancel it

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
        onDoubleClick={(_e) => {
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

            // Keyboard: go to full editor view

            onSelect(doc._id);
          }
        }}
        aria-selected={isSelected || undefined}
        className={`${
          hybrid
            ? "document-card--hybrid"
            : "bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] p-6 h-52 flex flex-col transition-all duration-200 cursor-pointer relative overflow-hidden backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] hover:ring-2 hover:shadow-md hover:bg-[var(--bg-hover)] hover:scale-[1.02]"
        } ${isCalendarDoc ? "ring-1 ring-amber-400/30 bg-gradient-to-br from-amber-50/10 to-transparent" : `${theme.ring} ${theme.gradient}`} ${isDragging ? "is-dragging" : ""} ${isSelected ? "is-selected ring-2 ring-[var(--accent-primary)] ring-offset-2 ring-offset-[var(--background)] bg-[var(--accent-primary-bg)]/40 shadow-md" : ""}`}
      >
        {/* Selection checkbox (top-left) */}

        <div
          className={`absolute top-2 left-2 z-10 transition-opacity ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
        >
          <input
            type="checkbox"
            aria-label={isSelected ? "Deselect" : "Select"}
            checked={!!isSelected}
            onChange={(e) => {
              e.stopPropagation();

              onToggleSelect?.(doc._id);
            }}
            onClick={(e) => e.stopPropagation()}
            className="h-4 w-4 rounded border-[var(--border-color)] text-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary)]/50 bg-white"
          />
        </div>

        {/* Decorative background watermark */}

        {isCalendarDoc ? (
          <Calendar className="document-card__bg document-row__bg h-14 w-14 text-amber-400 rotate-12" />
        ) : (
          <span
            className={`document-card__bg document-row__bg ${theme.watermarkText}`}
          >
            <FileTypeIcon type={typeGuess} className="h-14 w-14 rotate-12" />
          </span>
        )}

        {/* Content */}

        <div className="flex-1 flex flex-col">
          {/* Header: Big Icon + Actions */}

          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-sm ${isCalendarDoc ? "bg-amber-500" : theme.iconBg}`}
              >
                {isCalendarDoc ? (
                  <Calendar className="h-5 w-5 text-white" />
                ) : doc.icon ? (
                  <span className="text-lg">{doc.icon}</span>
                ) : (
                  <div className="text-white">{getDocumentTypeIcon(doc)}</div>
                )}
              </div>

              {/* Week selector removed from DocumentCard; lives under Today's Agenda header */}
            </div>

            {/* Action Buttons */}

            <div className="flex items-center gap-1 transition-opacity duration-200 opacity-0 group-hover:opacity-100">
              {/* Quick Edit Button */}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenMiniEditor?.(doc._id, e.currentTarget as HTMLElement);
                }}
                className="w-7 h-7 rounded-md flex items-center justify-center bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)] border border-[var(--border-color)] transition-all duration-200 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
                title="Quick edit"
              >
                <Edit3 className="h-3.5 w-3.5" />
              </button>

              {/* Pin/Favorite Button */}

              <button
                onClick={handlePinClick}
                className={`w-7 h-7 rounded-md flex items-center justify-center transition-all duration-200 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] ${
                  doc.isFavorite
                    ? "bg-yellow-500 text-yellow-100 shadow-sm"
                    : "bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)] border border-[var(--border-color)]"
                }`}
                title={doc.isFavorite ? "Unpin document" : "Pin document"}
              >
                <Star
                  className={`h-3.5 w-3.5 ${doc.isFavorite ? "fill-current" : ""}`}
                />
              </button>

              {/* Delete Button */}

              <button
                onClick={handleDeleteClick}
                className="w-7 h-7 rounded-md flex items-center justify-center bg-[var(--bg-primary)] hover:bg-red-500 text-[var(--text-secondary)] hover:text-white border border-[var(--border-color)] hover:border-red-500 transition-all duration-200 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
                title="Delete document"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Title */}

          <h3 className="font-semibold text-[var(--text-primary)] text-base line-clamp-2 leading-snug">
            {doc.title}
          </h3>

          {/* Pills Metadata Container + persistent Analyze button for files */}

          <div className="mt-auto pt-2 border-t border-[var(--border-color)] flex items-center justify-between gap-2">
            {(() => {
              const pills = docToPills({
                ...doc,
                meta: { ...((doc as any).meta ?? {}), type: typeGuess },
                typeGuess,
              } as any);

              return (
                <MetaPills
                  pills={pills}
                  typePillClassName={
                    isCalendarDoc
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-700"
                      : theme.label
                  }
                />
              );
            })()}

            {doc.documentType === "timeline" && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 text-[11px] rounded-md border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
                Timeline
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Memoized wrapper to prevent unnecessary re-renders

export const DocumentCardMemo = memo(DocumentCard);

// DocumentRow: list-form row for documents, aligned with TaskRowGlobal styling

const DocumentRow = ({
  doc,

  onSelect,

  density = "comfortable",

  onToggleFavorite,

  onDelete,
}: {
  doc: DocumentCardData;

  onSelect: (documentId: Id<"documents">) => void;

  density?: "compact" | "comfortable";

  onToggleFavorite?: (documentId: Id<"documents">) => void;

  onDelete?: (documentId: Id<"documents">) => void;
}) => {
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
          ) : doc.icon ? (
            <span className="text-base">{doc.icon}</span>
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
          aria-label={doc.isFavorite ? "Unpin document" : "Pin document"}
          title={doc.isFavorite ? "Unpin document" : "Pin document"}
          className={`w-7 h-7 rounded-md flex items-center justify-center transition-all duration-200 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] ${
            doc.isFavorite
              ? "bg-yellow-500 text-yellow-100 shadow-sm"
              : "bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)] border border-[var(--border-color)]"
          }`}
        >
          <Star
            className={`h-3.5 w-3.5 ${doc.isFavorite ? "fill-current" : ""}`}
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

// Lightweight loading skeleton for document cards while documents are fetching

function DocumentCardSkeleton() {
  return (
    <div className="group relative">
      <div className="document-card--hybrid animate-pulse">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--bg-primary)]" />

            <div className="w-24 h-5 rounded bg-[var(--bg-primary)]" />
          </div>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-[var(--bg-primary)]" />

            <div className="w-7 h-7 rounded-md bg-[var(--bg-primary)]" />
          </div>
        </div>

        <div className="flex-1 min-h-0 mb-2">
          <div className="h-4 bg-[var(--bg-primary)] rounded w-3/4 mb-2" />

          <div className="h-4 bg-[var(--bg-primary)] rounded w-2/3" />
        </div>

        <div className="flex-shrink-0 pt-2 border-t border-[var(--border-color)]">
          <div className="h-3 bg-[var(--bg-primary)] rounded w-1/3" />
        </div>
      </div>
    </div>
  );
}

export function DocumentsHomeHub({
  onDocumentSelect,

  onGridModeToggle,

  hideCalendarCard: _hideCalendarCard,

  selectedTaskId,

  onSelectTask,

  onClearTaskSelection,
}: DocumentsHomeHubProps) {
  const documents = useQuery(api.documents.getSidebarWithPreviews);

  // Ensure onboarding seed on first visit to DocumentsHomeHub

  const ensureSeedOnLogin = useMutation(api.onboarding.ensureSeedOnLogin);

  const didEnsureOnHubRef = useRef(false);

  useEffect(() => {
    if (didEnsureOnHubRef.current) return;

    let cancelled = false;

    const run = async () => {
      didEnsureOnHubRef.current = true;

      const maxRetries = 3;

      for (let attempt = 0; attempt < maxRetries && !cancelled; attempt++) {
        try {
          const res = await ensureSeedOnLogin({});

          if (res?.seeded) {
            toast.success(
              `Onboarding ready: docs +${res.createdDocuments}, tasks +${res.createdTasks}`,
            );
          }

          break; // success or already seeded
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);

          const isAuthRace = msg.toLowerCase().includes("not authenticated");

          if (isAuthRace && attempt < maxRetries - 1) {
            await new Promise((r) => setTimeout(r, 700));

            continue; // retry after a short delay
          }

          break;
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [ensureSeedOnLogin]);
  // Unified sidebar open/collapsed state (shared key with CalendarHomeHub)
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    try {
      return JSON.parse(localStorage.getItem("unifiedSidebar.open") || "true");
    } catch {
      return true;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("unifiedSidebar.open", JSON.stringify(sidebarOpen));
    } catch {
      // noop
    }
  }, [sidebarOpen]);


  const isDocsLoading = documents === undefined;

  const documentsNorm: Array<DocumentCardData> = useMemo(
    () => (documents ?? []).map(normalizeDocument),

    [documents],
  );

  // Dashboard (merged) state and data

  // Use the same selected IANA timezone (from userPreferences) that MiniMonthCalendar uses

  // so the grid markers, previews, and parent calculations stay in sync.

  const tzPrefs = useQuery(api.userPreferences.getCalendarUiPrefs);

  const tzOffsetMinutes = useMemo(() => {
    const timeZone: string | undefined = tzPrefs?.timeZone as
      | string
      | undefined;

    // Helper: compute minutes east of UTC for a given IANA time zone at a specific date

    function offsetMinutesForZone(
      timeZoneInner: string | undefined,
      date: Date,
    ): number {
      if (!timeZoneInner) {
        return -date.getTimezoneOffset();
      }

      try {
        const dtf = new Intl.DateTimeFormat("en-US", {
          timeZone: timeZoneInner,

          year: "numeric",

          month: "2-digit",

          day: "2-digit",

          hour: "2-digit",

          minute: "2-digit",

          second: "2-digit",

          hour12: false,
        });

        const parts = dtf.formatToParts(date);

        const get = (t: string) =>
          Number(parts.find((p) => p.type === t)?.value);

        const y = get("year");

        const m = (get("month") || 1) - 1;

        const d = get("day") || 1;

        const h = get("hour") || 0;

        const min = get("minute") || 0;

        const s = get("second") || 0;

        const asUTC = Date.UTC(y, m, d, h, min, s);

        const diffMin = (asUTC - date.getTime()) / 60000;

        return diffMin;
      } catch {
        return -date.getTimezoneOffset();
      }
    }

    if (timeZone && timeZone.length > 0) {
      return offsetMinutesForZone(timeZone, new Date());
    }

    return -new Date().getTimezoneOffset();
  }, [tzPrefs]);

  const loggedInUser = useQuery(api.auth.loggedInUser);

  // Must be initialized before any callbacks that reference it (avoids TDZ errors)

  const setPlannerViewPrefs = useMutation(
    api.userPreferences.setPlannerViewPrefs,
  );

  // Agenda view/scope state must be available before callbacks that reference them

  const [agendaMode, setAgendaMode] = useState<
    "list" | "kanban" | "weekly" | "mini"
  >("mini");

  const [lastNonWeeklyAgendaMode, setLastNonWeeklyAgendaMode] = useState<
    "list" | "kanban" | "mini"
  >("list");

  const [agendaScope, setAgendaScope] = useState<"day" | "week">("week");

  // Tasks by status (Kanban)

  const todoTasks =
    useQuery(
      api.tasks.listTasksByStatus,

      loggedInUser ? { status: "todo" } : "skip",
    ) ?? [];

  const inProgressTasks =
    useQuery(
      api.tasks.listTasksByStatus,

      loggedInUser ? { status: "in_progress" } : "skip",
    ) ?? [];

  const doneTasks =
    useQuery(
      api.tasks.listTasksByStatus,

      loggedInUser ? { status: "done" } : "skip",
    ) ?? [];

  const blockedTasks =
    useQuery(
      api.tasks.listTasksByStatus,

      loggedInUser ? { status: "blocked" } : "skip",
    ) ?? [];

  // Shared planner state: consume centralized data & handlers

  const {
    focusedDateMs,
    setFocusedDateMs,
    handleViewWeek,
    handleViewDay,
    upcoming,
  } = usePlannerState();

  // Week selector popovers (split for Upcoming and Agenda)

  const [showUpcomingWeekPicker, setShowUpcomingWeekPicker] =
    useState<boolean>(false);

  const [showAgendaWeekPicker, setShowAgendaWeekPicker] =
    useState<boolean>(false);

  // Holidays: compute local day/week bounds and fetch once per render

  const offsetMs = tzOffsetMinutes * 60 * 1000;

  const _nowLocal = new Date(Date.now() + offsetMs);

  _nowLocal.setUTCHours(0, 0, 0, 0);

  const todayStartUtc = _nowLocal.getTime() - offsetMs;

  const _todayEndUtc = todayStartUtc + (24 * 60 * 60 * 1000 - 1);

  // Allow selecting a different day for the Agenda (persisted in user preferences)

  const [agendaSelectedDateMs, setAgendaSelectedDateMs] = useState<
    number | null
  >(null);

  // Effective agenda range is either today or the selected day

  const agendaStartUtc = agendaSelectedDateMs ?? todayStartUtc;

  const agendaEndUtc = agendaStartUtc + (24 * 60 * 60 * 1000 - 1);

  // Anchor the Upcoming week to the selected week if available; otherwise use current week.

  const anchorLocal = new Date((focusedDateMs ?? todayStartUtc) + offsetMs);

  anchorLocal.setUTCHours(0, 0, 0, 0);

  const _dow = anchorLocal.getUTCDay();

  const _diffToMonday = (_dow + 6) % 7;

  const _mondayLocal = new Date(
    anchorLocal.getTime() - _diffToMonday * 24 * 60 * 60 * 1000,
  );

  const weekStartUtc = _mondayLocal.getTime() - offsetMs;

  const weekEndUtc = weekStartUtc + 7 * 24 * 60 * 60 * 1000 - 1;

  // Stabilize arrays derived from the aggregator

  // Source agenda arrays from shared hook to avoid duplicate fetching

  const tasksToday = upcoming.today.tasks;

  const eventsToday = upcoming.today.events;

  const holidaysToday = upcoming.today.holidays;

  const tasksThisWeek = upcoming.sevenDays.tasks;

  const eventsThisWeek = upcoming.sevenDays.events;

  const holidaysThisWeek = upcoming.sevenDays.holidays;

  const archiveDocument = useMutation(api.documents.archive);

  const toggleFavorite = useMutation(api.documents.toggleFavorite);

  const seedOnboarding = useMutation(api.onboarding.seedOnboardingContent);

  // These are Convex actions, not mutations

  const compileAaplModel = useAction(api.aiAgents.compileAaplModel);

  const analyzeFileWithGenAI = useAction(api.fileAnalysis.analyzeFileWithGenAI);

  const createDocumentWithContent = useMutation(
    api.documents.createWithContent,
  );

  const [selectedFrequentDoc, setSelectedFrequentDoc] =
    useState<Id<"documents"> | null>(null);

  const [filter, setFilter] = useState<string>("all");

  const [docViewMode, setDocViewMode] = useState<
    "cards" | "list" | "segmented"
  >("cards");

  const [isCompiling, setIsCompiling] = useState<boolean>(false);

  const [analyzeRunningDocId, setAnalyzeRunningDocId] =
    useState<Id<"documents"> | null>(null);

  const [isSeedingOnboarding, setIsSeedingOnboarding] =
    useState<boolean>(false);

  const [isSeedingTimeline, setIsSeedingTimeline] = useState<boolean>(false);

  const [mode, setMode] = useState<"list" | "kanban" | "weekly">("list");

  // Inline editor is embedded within this component; no parent notification needed

  // Helpers to compute week boundaries (Monday-Sunday) in local time

  const startOfWeekMs = useCallback((ms: number): number => {
    const d = new Date(ms);

    d.setHours(0, 0, 0, 0);

    // JS getDay(): 0=Sun..6=Sat. Convert to 0=Mon..6=Sun

    const delta = (d.getDay() + 6) % 7;

    d.setDate(d.getDate() - delta);

    return d.getTime();
  }, []);

  const formatWeekRange = useCallback((weekStartMs: number): string => {
    const start = new Date(weekStartMs);

    const end = new Date(weekStartMs);

    end.setDate(start.getDate() + 6);

    const sameMonth =
      start.getMonth() === end.getMonth() &&
      start.getFullYear() === end.getFullYear();

    if (sameMonth) {
      const month = start.toLocaleString(undefined, { month: "long" });

      return `${month} ${start.getDate()} - ${end.getDate()}, ${start.getFullYear()}`;
    }

    const startStr = start.toLocaleString(undefined, {
      month: "long",
      day: "numeric",
    });

    const endStr = end.toLocaleString(undefined, {
      month: "long",
      day: "numeric",
    });

    const yearSame = start.getFullYear() === end.getFullYear();

    return `${startStr} - ${endStr}${yearSame ? `, ${start.getFullYear()}` : ` ${end.getFullYear()}`}`;
  }, []);

  const weekRangeLabel = useMemo(() => {
    const anchor = focusedDateMs ?? Date.now();

    const wStart = startOfWeekMs(anchor);

    return formatWeekRange(wStart);
  }, [focusedDateMs, startOfWeekMs, formatWeekRange]);

  // Agenda-selected week (align with planner's focused week)

  const agendaWeekStartUtc = weekStartUtc;

  const agendaWeekEndUtc = weekEndUtc;

  const agendaWeekHolidayRange = useMemo(
    () => ({
      startUtc: agendaWeekStartUtc + offsetMs,
      endUtc: agendaWeekEndUtc + offsetMs,
    }),
    [agendaWeekStartUtc, agendaWeekEndUtc, offsetMs],
  );

  const agendaSelectedWeekRaw = useQuery(
    (api as any).calendar.listAgendaInRange,

    loggedInUser
      ? {
          start: agendaWeekStartUtc,

          end: agendaWeekEndUtc,

          country: "US",

          holidaysStartUtc: agendaWeekHolidayRange.startUtc,

          holidaysEndUtc: agendaWeekHolidayRange.endUtc,
        }
      : "skip",
  );

  const agendaWeekTasks = useMemo(
    () => agendaSelectedWeekRaw?.tasks ?? [],
    [agendaSelectedWeekRaw],
  );

  const agendaWeekEvents = useMemo(
    () => agendaSelectedWeekRaw?.events ?? [],
    [agendaSelectedWeekRaw],
  );

  const agendaWeekHolidays = useMemo(
    () => agendaSelectedWeekRaw?.holidays ?? [],
    [agendaSelectedWeekRaw],
  );

  // Notes scheduled in the selected agenda week

  const agendaWeekNotesRaw = useQuery(
    api.documents.listNotesInRange as any,

    loggedInUser
      ? { start: agendaWeekStartUtc, end: agendaWeekEndUtc }
      : "skip",
  );

  const agendaWeekNotes = useMemo(
    () => agendaWeekNotesRaw ?? [],
    [agendaWeekNotesRaw],
  );

  // Merge week data from calendar query and upcoming.sevenDays to ensure parity with "This Week" section

  const dedupById = useCallback((arr: any[]) => {
    const m = new Map<string, any>();

    for (const it of arr || []) {
      const id = String((it && (it._id ?? it.id ?? "")) || Math.random());

      m.set(id, it);
    }

    return Array.from(m.values());
  }, []);

  const weekEventsMerged = useMemo(
    () => dedupById([...(agendaWeekEvents || []), ...(eventsThisWeek || [])]),
    [agendaWeekEvents, eventsThisWeek, dedupById],
  );

  const weekTasksMerged = useMemo(
    () => dedupById([...(agendaWeekTasks || []), ...(tasksThisWeek || [])]),
    [agendaWeekTasks, tasksThisWeek, dedupById],
  );

  const weekHolidaysMerged = useMemo(
    () =>
      dedupById([...(agendaWeekHolidays || []), ...(holidaysThisWeek || [])]),
    [agendaWeekHolidays, holidaysThisWeek, dedupById],
  );

  // Navigate weeks with chevrons

  const onPrevWeek = useCallback(() => {
    const anchor = focusedDateMs ?? Date.now();

    const start = startOfWeekMs(anchor);

    handleViewWeek(start - 7 * 24 * 60 * 60 * 1000);
  }, [focusedDateMs, startOfWeekMs, handleViewWeek]);

  const onNextWeek = useCallback(() => {
    const anchor = focusedDateMs ?? Date.now();

    const start = startOfWeekMs(anchor);

    handleViewWeek(start + 7 * 24 * 60 * 60 * 1000);
  }, [focusedDateMs, startOfWeekMs, handleViewWeek]);

  const onTodayWeek = useCallback(() => {
    handleViewWeek(startOfWeekMs(Date.now()));
  }, [startOfWeekMs, handleViewWeek]);

  // Agenda (Today's section) week label and handlers

  const agendaWeekLabel = weekRangeLabel;

  const onPrevAgendaWeek = useCallback(() => {
    const wStartLocal = startOfWeekMs(agendaStartUtc + offsetMs);

    const newLocal = wStartLocal - 7 * 24 * 60 * 60 * 1000;

    const canonical = newLocal - offsetMs;

    setAgendaSelectedDateMs(canonical);

    if (loggedInUser) {
      void setPlannerViewPrefs({ agendaSelectedDateMs: canonical }).catch(
        () => {},
      );
    } else {
      try {
        localStorage.setItem(
          "nodebench:agendaSelectedDateMs",
          String(canonical),
        );
      } catch {}
    }
  }, [agendaStartUtc, offsetMs, startOfWeekMs, loggedInUser]);

  const onNextAgendaWeek = useCallback(() => {
    const wStartLocal = startOfWeekMs(agendaStartUtc + offsetMs);

    const newLocal = wStartLocal + 7 * 24 * 60 * 60 * 1000;

    const canonical = newLocal - offsetMs;

    setAgendaSelectedDateMs(canonical);

    if (loggedInUser) {
      void setPlannerViewPrefs({ agendaSelectedDateMs: canonical }).catch(
        () => {},
      );
    } else {
      try {
        localStorage.setItem(
          "nodebench:agendaSelectedDateMs",
          String(canonical),
        );
      } catch {}
    }
  }, [agendaStartUtc, offsetMs, startOfWeekMs, loggedInUser]);

  const onAgendaToday = useCallback(() => {
    setAgendaSelectedDateMs(null);

    if (loggedInUser) {
      void setPlannerViewPrefs({}).catch(() => {});
    } else {
      try {
        localStorage.removeItem("nodebench:agendaSelectedDateMs");
      } catch {}
    }
  }, [loggedInUser]);

  // Helpers to nudge agenda day forward/back while preserving local-day canonical

  const applyAgendaCanonical = useCallback(
    (canonical: number) => {
      setAgendaSelectedDateMs(canonical);

      if (loggedInUser) {
        void setPlannerViewPrefs({ agendaSelectedDateMs: canonical }).catch(
          () => {},
        );
      } else {
        try {
          localStorage.setItem(
            "nodebench:agendaSelectedDateMs",
            String(canonical),
          );
        } catch {}
      }
    },
    [loggedInUser, setPlannerViewPrefs],
  );

  // Keep Agenda Mini view anchored to the same day/week as the global focused date

  // so the sidebar mini calendar and full calendar stay in sync with Agenda (mini mode).

  useEffect(() => {
    if (agendaMode !== "mini") return; // Only auto-sync when using the mini agenda view

    if (typeof focusedDateMs !== "number" || !Number.isFinite(focusedDateMs))
      return;

    // Convert focusedDateMs (canonical UTC of local day start) into agenda's canonical based on scope

    const localAnchor = focusedDateMs + offsetMs;

    let canonical: number;

    if (agendaScope === "week") {
      const wStartLocal = startOfWeekMs(localAnchor);

      canonical = wStartLocal - offsetMs;
    } else {
      const d = new Date(localAnchor);
      d.setUTCHours(0, 0, 0, 0);

      canonical = d.getTime() - offsetMs;
    }

    if (agendaSelectedDateMs !== canonical) {
      applyAgendaCanonical(canonical);
    }
  }, [
    agendaMode,
    agendaScope,
    focusedDateMs,
    offsetMs,
    startOfWeekMs,
    agendaSelectedDateMs,
    applyAgendaCanonical,
  ]);

  const changeAgendaByDays = useCallback(
    (delta: number) => {
      const d = new Date(agendaStartUtc + offsetMs);

      d.setUTCHours(0, 0, 0, 0);

      d.setUTCDate(d.getUTCDate() + delta);

      const canonical = d.getTime() - offsetMs;

      applyAgendaCanonical(canonical);
    },
    [agendaStartUtc, offsetMs, applyAgendaCanonical],
  );

  const onPrevAgendaDay = useCallback(
    () => changeAgendaByDays(-1),
    [changeAgendaByDays],
  );

  const onNextAgendaDay = useCallback(
    () => changeAgendaByDays(1),
    [changeAgendaByDays],
  );

  const onPrevAgenda = useCallback(() => {
    if (agendaScope === "week") onPrevAgendaWeek();
    else onPrevAgendaDay();
  }, [agendaScope, onPrevAgendaDay, onPrevAgendaWeek]);

  const onNextAgenda = useCallback(() => {
    if (agendaScope === "week") onNextAgendaWeek();
    else onNextAgendaDay();
  }, [agendaScope, onNextAgendaDay, onNextAgendaWeek]);

  const onSetAgendaScope = useCallback((scope: "day" | "week") => {
    setAgendaScope(scope);

    // Do not auto-switch agendaMode; keep current mode (e.g., 'mini') and just change scope.
  }, []);

  // Keyboard shortcuts for week navigation (←/→) and closing pickers with Esc

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();

      const isTyping =
        tag === "input" ||
        tag === "textarea" ||
        (e.target as HTMLElement | null)?.isContentEditable;

      if (isTyping) return;

      if (
        e.key === "Escape" &&
        (showUpcomingWeekPicker || showAgendaWeekPicker)
      ) {
        setShowUpcomingWeekPicker(false);

        setShowAgendaWeekPicker(false);

        return;
      }

      if (e.key === "ArrowLeft" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();

        onPrevWeek();
      } else if (
        e.key === "ArrowRight" &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey
      ) {
        e.preventDefault();

        onNextWeek();
      }
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [onPrevWeek, onNextWeek, showUpcomingWeekPicker, showAgendaWeekPicker]);

  // Click-away to close Upcoming week picker

  const upcomingWeekPickerAnchorRef = useRef<HTMLDivElement | null>(null);

  const upcomingWeekPickerPanelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!showUpcomingWeekPicker) return;

    const onDocMouseDown = (e: MouseEvent) => {
      const t = e.target as Node;

      if (
        upcomingWeekPickerAnchorRef.current &&
        (upcomingWeekPickerAnchorRef.current.contains(t) ||
          (upcomingWeekPickerPanelRef.current?.contains(t) ?? false))
      ) {
        return; // click inside
      }

      setShowUpcomingWeekPicker(false);
    };

    document.addEventListener("mousedown", onDocMouseDown);

    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [showUpcomingWeekPicker]);

  // Click-away to close Agenda week picker

  const agendaWeekPickerAnchorRef = useRef<HTMLDivElement | null>(null);

  const agendaWeekPickerPanelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!showAgendaWeekPicker) return;

    const onDocMouseDown = (e: MouseEvent) => {
      const t = e.target as Node;

      if (
        agendaWeekPickerAnchorRef.current &&
        (agendaWeekPickerAnchorRef.current.contains(t) ||
          (agendaWeekPickerPanelRef.current?.contains(t) ?? false))
      ) {
        return; // click inside
      }

      setShowAgendaWeekPicker(false);
    };

    document.addEventListener("mousedown", onDocMouseDown);

    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [showAgendaWeekPicker]);

  // Toolbar inline event dialog state (Calendar/Kanban)

  const [showToolbarEventDialog, setShowToolbarEventDialog] = useState(false);

  const [toolbarEventTitle, setToolbarEventTitle] = useState("");

  const [toolbarEventStart, setToolbarEventStart] = useState<string>("");

  const [toolbarEventEnd, setToolbarEventEnd] = useState<string>("");

  const [toolbarAllDay, setToolbarAllDay] = useState<boolean>(false);

  const toolbarTitleRef = useRef<HTMLInputElement | null>(null);

  // Mini editor popover state

  const [miniEditorDocId, setMiniEditorDocId] =
    useState<Id<"documents"> | null>(null);

  const [miniEditorAnchor, setMiniEditorAnchor] = useState<HTMLElement | null>(
    null,
  );

  const openMiniEditor = useCallback(
    (docId: Id<"documents">, anchorEl: HTMLElement) => {
      if (_hideCalendarCard) return; // In Timeline view, disable quick note editor
      setMiniEditorDocId(docId);
      setMiniEditorAnchor(anchorEl);
    },
    [_hideCalendarCard],
  );

  const closeMiniEditor = useCallback(() => {
    setMiniEditorDocId(null);

    setMiniEditorAnchor(null);
  }, []);

  // --- Multi-select state ---

  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());

  // Shift-range anchor per context (e.g., cards:filterKey or segmented:groupKey)

  const [selectAnchorByContext, setSelectAnchorByContext] = useState<
    Record<string, string | null>
  >({});

  const toggleSelected = useCallback((id: string) => {
    setSelectedDocIds((prev) => {
      const next = new Set(prev);

      if (next.has(id)) next.delete(id);
      else next.add(id);

      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedDocIds(new Set()), []);

  // Bulk actions

  const handleBulkToggleFavorite = useCallback(async () => {
    const ids = Array.from(selectedDocIds) as Array<Id<"documents">>;

    if (ids.length === 0) return;

    await Promise.all(ids.map((id) => toggleFavorite({ id }).catch(() => {})));

    clearSelection();
  }, [selectedDocIds, toggleFavorite, clearSelection]);

  const handleBulkArchive = useCallback(async () => {
    const ids = Array.from(selectedDocIds) as Array<Id<"documents">>;

    if (ids.length === 0) return;

    await Promise.all(ids.map((id) => archiveDocument({ id }).catch(() => {})));

    clearSelection();
  }, [selectedDocIds, archiveDocument, clearSelection]);

  // Keyboard shortcuts useEffect moved below after orderedDocuments declaration

  // Helpers for modifier-click selection on cards

  const handleCardClickWithModifiers = useCallback(
    (
      docId: Id<"documents">,

      e: React.MouseEvent,

      contextKey: string,

      orderedIds: Array<Id<"documents">>,
    ): boolean => {
      if (e.metaKey || e.ctrlKey) {
        e.preventDefault();

        e.stopPropagation();

        toggleSelected(String(docId));

        setSelectAnchorByContext((prev) => ({
          ...prev,
          [contextKey]: String(docId),
        }));

        return true;
      }

      if (e.shiftKey) {
        e.preventDefault();

        e.stopPropagation();

        const anchor = selectAnchorByContext[contextKey] ?? String(docId);

        const a = orderedIds.findIndex((id) => String(id) === String(anchor));

        const b = orderedIds.findIndex((id) => String(id) === String(docId));

        if (a !== -1 && b !== -1) {
          const [start, end] = a <= b ? [a, b] : [b, a];

          const range = orderedIds
            .slice(start, end + 1)
            .map((id) => String(id));

          setSelectedDocIds((prev) => {
            const next = new Set(prev);

            for (const id of range) next.add(id);

            return next;
          });

          setSelectAnchorByContext((prev) => ({
            ...prev,
            [contextKey]: String(docId),
          }));

          return true;
        }

        // Fallback to toggle

        toggleSelected(String(docId));

        setSelectAnchorByContext((prev) => ({
          ...prev,
          [contextKey]: String(docId),
        }));

        return true;
      }

      return false;
    },
    [selectAnchorByContext, toggleSelected],
  );

  // Autofocus toolbar dialog title input when shown (placed after state definitions)

  useEffect(() => {
    if (showToolbarEventDialog && mode !== "list") {
      // delay to ensure mount

      setTimeout(() => toolbarTitleRef.current?.focus(), 0);
    }
  }, [showToolbarEventDialog, mode]);

  // --- dnd-kit Kanban setup (shared sensors) ---

  // Sensors used by both the main Kanban view and Today's Agenda Kanban section

  const kanbanSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),

    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const userTimelines = useQuery(api.agentTimelines.listForUser, {});

  // File uploads (react-dropzone + Convex storage)

  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  const createFileRecord = useMutation(api.files.createFile);

  const createDocument = useMutation(api.documents.create);

  const setDocumentType = useMutation(api.documents.setDocumentType);

  const createTimelineForDoc = useMutation(
    api.agentTimelines.createForDocument,
  );

  const applyPlanTimeline = useMutation(api.agentTimelines.applyPlan);

  const [isUploading, setIsUploading] = useState(false);

  const [uploadProgress, setUploadProgress] = useState<string>("");

  // Guard against duplicate onDrop when both window and dropzone fire

  const lastWindowDropAtRef = useRef<number>(0);

  // Mirror Sidebar helpers

  const ensureMimeType = useCallback((file: File): string => {
    if (file.type && file.type !== "application/octet-stream") return file.type;

    const ext = file.name.toLowerCase().split(".").pop() || "";

    const byExt: Record<string, string> = {
      pdf: "application/pdf",

      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

      pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",

      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

      csv: "text/csv",

      txt: "text/plain",

      md: "text/markdown",

      json: "application/json",

      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      gif: "image/gif",

      mp4: "video/mp4",
      mov: "video/quicktime",
      webm: "video/webm",

      mp3: "audio/mpeg",
      wav: "audio/wav",
      aac: "audio/aac",
      ogg: "audio/ogg",
    };

    return byExt[ext] || "application/octet-stream";
  }, []);

  const getFileType = useCallback((file: File): string => {
    const type = (file.type || "").toLowerCase();

    if (type.startsWith("video/")) return "video";

    if (type.startsWith("image/")) return "image";

    if (type.startsWith("audio/")) return "audio";

    if (file.name.toLowerCase().endsWith(".csv")) return "csv";

    if (file.name.toLowerCase().endsWith(".pdf")) return "pdf";

    return "file";
  }, []);

  const getAnalysisType = useCallback(
    (file: File): string => {
      const t = getFileType(file);

      if (t === "video") return "highlights";

      if (t === "image") return "object-detection";

      if (file.name.toLowerCase().endsWith(".csv")) return "csv";

      return "general";
    },
    [getFileType],
  );

  const handleFileUpload = useCallback(
    async (file: File) => {
      setIsUploading(true);

      try {
        setUploadProgress(`Uploading 1/1: ${file.name}`);

        const uploadUrl = await generateUploadUrl();

        const mime = ensureMimeType(file);

        const res = await fetch(uploadUrl, {
          method: "POST",

          headers: { "Content-Type": mime },

          body: file,
        });

        if (!res.ok) throw new Error(`Upload failed: ${res.status}`);

        const { storageId } = (await res.json()) as { storageId: string };

        const fileId = await createFileRecord({
          storageId,

          fileName: file.name,

          fileType: getFileType(file),

          mimeType: mime,

          fileSize: file.size,
        });

        // Do NOT auto-analyze. Offer an action button to analyze on demand.

        toast.success(`Uploaded ${file.name}`, {
          // @ts-ignore sonner supports action for interactive toasts

          action: {
            label: "Analyze now",

            onClick: async () => {
              try {
                setUploadProgress(`Analyzing ${file.name}...`);

                const result = await analyzeFileWithGenAI({
                  fileId,

                  analysisPrompt:
                    "Provide a comprehensive analysis of this file, including key insights and summary.",

                  analysisType: getAnalysisType(file),
                });

                if ((result as any)?.success) {
                  toast.success(`Analysis complete for ${file.name}`);

                  const docId = await createDocument({
                    title: `Analysis: ${file.name}`,

                    content: [
                      {
                        type: "paragraph",
                        content: [
                          { type: "text", text: (result as any).analysis },
                        ],
                      },
                    ],
                  });

                  onDocumentSelect(docId);
                } else {
                  toast.error(`Analysis failed for ${file.name}`);
                }
              } catch (err: any) {
                console.error(err);

                toast.error(err?.message || `Analysis failed for ${file.name}`);
              } finally {
                setUploadProgress("");
              }
            },
          },
        });
      } catch (e: any) {
        console.error(e);

        toast.error(e?.message || `Failed to upload ${file.name}`);
      } finally {
        setIsUploading(false);

        setUploadProgress("");
      }
    },
    [
      generateUploadUrl,
      createFileRecord,
      getFileType,
      ensureMimeType,
      getAnalysisType,
      analyzeFileWithGenAI,
      createDocument,
      onDocumentSelect,
    ],
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      // If a window-level drop just fired, ignore the dropzone drop

      if (Date.now() - lastWindowDropAtRef.current < 250) {
        return;
      }

      if (!acceptedFiles?.length) return;

      void (async () => {
        for (const f of acceptedFiles) {
          await handleFileUpload(f);
        }
      })();
    },
    [handleFileUpload],
  );

  // Track global file drag to improve reliability over complex children (sortable grids, etc.)

  const [isFileDragActive, setIsFileDragActive] = useState(false);

  const fileDragCounterRef = useRef(0);

  useEffect(() => {
    const hasFiles = (e: DragEvent) =>
      !!e.dataTransfer &&
      Array.from(e.dataTransfer.types || []).includes("Files");

    const isLeavingWindow = (e: DragEvent) => {
      // relatedTarget is often null when leaving the window; position is outside viewport

      const x = (e as any).clientX ?? 0;

      const y = (e as any).clientY ?? 0;

      return (
        (e.relatedTarget === null || (e as any).fromElement === null) &&
        (x <= 0 || y <= 0 || x >= window.innerWidth || y >= window.innerHeight)
      );
    };

    const onEnter = (e: DragEvent) => {
      if (hasFiles(e)) {
        setIsFileDragActive(true);
      }
    };

    const onOver = (e: DragEvent) => {
      if (hasFiles(e)) {
        // Allow dropping anywhere by preventing default navigation

        e.preventDefault();
      }
    };

    const onLeave = (e: DragEvent) => {
      if (hasFiles(e) && isLeavingWindow(e)) {
        setIsFileDragActive(false);
      }
    };

    const onDropWin = (e: DragEvent) => {
      // If files were dropped anywhere on the window, prevent default navigation

      // and let embedded dropzones handle the drop (avoid stopping propagation or manual forwarding).

      if (
        e &&
        e.dataTransfer &&
        e.dataTransfer.files &&
        e.dataTransfer.files.length > 0
      ) {
        e.preventDefault();

        // Do not call stopPropagation(); allow React Dropzone roots to receive the drop event.
      }

      fileDragCounterRef.current = 0;

      setIsFileDragActive(false);
    };

    // Use stable function references so removeEventListener works correctly

    const handleDragEnter = (e: Event) => onEnter(e as DragEvent);

    const handleDragOver = (e: Event) => onOver(e as DragEvent);

    const handleDragLeave = (e: Event) => onLeave(e as DragEvent);

    const handleDrop = (e: Event) => onDropWin(e as DragEvent);

    window.addEventListener("dragenter", handleDragEnter, {
      capture: true,
    } as any);

    window.addEventListener("dragover", handleDragOver, {
      capture: true,
    } as any);

    window.addEventListener("dragleave", handleDragLeave, {
      capture: true,
    } as any);

    window.addEventListener("drop", handleDrop, { capture: true } as any);

    return () => {
      window.removeEventListener("dragenter", handleDragEnter, {
        capture: true,
      } as any);

      window.removeEventListener("dragover", handleDragOver, {
        capture: true,
      } as any);

      window.removeEventListener("dragleave", handleDragLeave, {
        capture: true,
      } as any);

      window.removeEventListener("drop", handleDrop, { capture: true } as any);
    };
  }, [onDrop]);

  const { getRootProps, getInputProps, open, isDragActive } = useDropzone({
    onDrop,

    noClick: true,

    noKeyboard: true,

    multiple: true,
  });

  // Event editor selection and Agenda quick add

  const [selectedEventId, setSelectedEventId] = useState<Id<"events"> | null>(
    null,
  );

  const [quickAgendaText, setQuickAgendaText] = useState<string>("");

  // Centralized agenda editor popover state (weekly editing should be popover, not inline)

  const [agendaPopover, setAgendaPopover] = useState<
    | {
        kind: "event";
        anchor: HTMLElement | null;
        eventId: Id<"events">;
        documentIdForAssociation?: Id<"documents"> | null;
      }
    | { kind: "task"; anchor: HTMLElement | null; taskId: Id<"tasks"> }
    | {
        kind: "create";
        anchor: HTMLElement | null;
        dateMs: number;
        defaultKind?: "task" | "event";
        defaultTitle?: string;
        defaultAllDay?: boolean;
      }
    | {
        kind: "createBoth";
        anchor: HTMLElement | null;
        dateMs: number;
        defaultKind?: "task" | "event";
        defaultTitle?: string;
        defaultAllDay?: boolean;
        documentIdForAssociation?: Id<"documents"> | null;
      }
    | null
  >(null);

  // Agenda overlay state (separate from KanbanView’s state): track active task while dragging

  const [activeAgenda, setActiveAgenda] = useState<{
    type: "task" | "event";
    id: string;
  } | null>(null);

  // Lightweight hover preview for Agenda list rows (tasks/events/holidays)

  const [hoverPreview, setHoverPreview] = useState<{
    kind: "task" | "event" | "holiday";
    item: any;
    anchorEl: HTMLElement | null;
  } | null>(null);

  const hoverTimerRef = useRef<number | null>(null);

  const [hoverLock, setHoverLock] = useState(false);

  // When an event is selected/created, scroll it into view and briefly highlight

  useEffect(() => {
    if (!selectedEventId) return;

    const idStr = String(selectedEventId);

    const tryScroll = () => {
      const el = document.getElementById(`event-${idStr}`);

      if (!el) return false;

      el.scrollIntoView({ behavior: "smooth", block: "center" });

      // transient highlight

      el.classList.add(
        "ring-2",
        "ring-[var(--accent-primary)]",
        "ring-offset-1",
        "ring-offset-[var(--bg-secondary)]",
      );

      setTimeout(() => {
        el.classList.remove(
          "ring-2",
          "ring-[var(--accent-primary)]",
          "ring-offset-1",
          "ring-offset-[var(--bg-secondary)]",
        );
      }, 1200);

      return true;
    };

    // Try now and once more shortly after in case list hasn't rendered yet

    if (!tryScroll()) {
      const t = setTimeout(() => {
        tryScroll();
      }, 250);

      return () => clearTimeout(t);
    }
  }, [selectedEventId]);

  // Helpers for toolbar dialog date-time handling

  const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);

  const formatLocalDateTime = (d: Date) => {
    const yyyy = d.getFullYear();

    const mm = pad2(d.getMonth() + 1);

    const dd = pad2(d.getDate());

    const hh = pad2(d.getHours());

    const mi = pad2(d.getMinutes());

    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  };

  const roundUpToNext15 = (d: Date) => {
    const minutes = d.getMinutes();

    let add = 15 - (minutes % 15);

    if (add === 0) add = 15; // always move to the next slot for "next rounded"

    d.setMinutes(minutes + add, 0, 0);

    return d;
  };

  const defaultEventTimesForToolbar = (allDay = false) => {
    const baseDate = new Date(focusedDateMs ?? Date.now());

    if (allDay) {
      const start = new Date(baseDate);

      start.setHours(0, 0, 0, 0);

      const end = new Date(baseDate);

      end.setHours(23, 59, 0, 0);

      return {
        startStr: formatLocalDateTime(start),
        endStr: formatLocalDateTime(end),
      };
    }

    const start = roundUpToNext15(new Date(baseDate));

    const end = new Date(start.getTime() + 60 * 60 * 1000);

    return {
      startStr: formatLocalDateTime(start),
      endStr: formatLocalDateTime(end),
    };
  };

  const [prompt, setPrompt] = useState<string>("");

  // View & agenda settings

  const [viewMenuOpen, setViewMenuOpen] = useState<boolean>(false);

  const [density, setDensity] = useState<"comfortable" | "compact">(
    "comfortable",
  );

  // Kanban orientation: 'columns' (default) or 'rows'

  const [kanbanOrientation, setKanbanOrientation] = useState<
    "columns" | "rows"
  >(() => {
    try {
      const v =
        typeof window !== "undefined"
          ? localStorage.getItem("nodebench:kanbanOrientation")
          : null;

      return v === "rows" ? "rows" : "columns";
    } catch {
      return "columns";
    }
  });

  useEffect(() => {
    try {
      if (typeof window !== "undefined")
        localStorage.setItem("nodebench:kanbanOrientation", kanbanOrientation);
    } catch {}
  }, [kanbanOrientation]);

  const [showWeekInAgenda, setShowWeekInAgenda] = useState<boolean>(true);

  // Upcoming list view mode: list (TaskRowGlobal) vs mini (AgendaMiniRow)

  const [upcomingMode, setUpcomingMode] = useState<"list" | "mini">("mini");

  const viewMenuRef = useRef<HTMLDivElement | null>(null);

  const viewButtonRef = useRef<HTMLButtonElement | null>(null);

  // Local drag order state for Agenda lists (immediate UI responsiveness)

  const [agendaOrder, setAgendaOrder] = useState<string[]>([]);

  const [upcomingOrder, setUpcomingOrder] = useState<string[]>([]);

  // New Task modal state

  const [showNewTaskModal, setShowNewTaskModal] = useState<boolean>(false);

  const [newTaskModalTitle, setNewTaskModalTitle] = useState<string>("");

  const [newTaskModalDue, setNewTaskModalDue] = useState<string>("");

  const [newTaskModalPriority, setNewTaskModalPriority] = useState<string>("");

  const [newTaskModalDescription, setNewTaskModalDescription] =
    useState<string>("");

  const [isSubmittingTask, setIsSubmittingTask] = useState<boolean>(false);

  const newTaskTitleRef = useRef<HTMLInputElement | null>(null);

  const modalRef = useRef<HTMLDivElement | null>(null);

  // Centralized agenda create popover state

  const [inlineCreate, setInlineCreate] = useState<{
    dateMs: number;

    defaultKind?: "task" | "event";

    defaultTitle?: string;

    defaultAllDay?: boolean;
  } | null>(null);

  const prevFocusRef = useRef<HTMLElement | null>(null);

  // Server-backed planner mode prefs

  const prefs = useQuery(api.userPreferences.getCalendarUiPrefs);

  const setPlannerModeMutation = useMutation(
    api.userPreferences.setPlannerMode,
  );

  // Cast to any until codegen picks up new function

  const setUpcomingViewPrefs = useMutation(
    (api as any).userPreferences.setUpcomingViewPrefs,
  );

  const setKanbanLaneTitles = useMutation(
    api.userPreferences.setKanbanLaneTitles,
  );

  // List order persistence (Convex + fallback)

  const listOrders = useQuery(
    // Use skip when logged out to avoid unnecessary calls

    api.userPreferences.getAgendaUpcomingOrders,

    loggedInUser ? {} : "skip",
  ) as { agendaListOrder?: string[]; upcomingListOrder?: string[] } | undefined;

  const setListOrders = useMutation(
    api.userPreferences.setAgendaUpcomingOrders,
  );

  // Documents order persistence (Convex + fallback)

  const docOrders = useQuery(
    api.userPreferences.getDocOrders,

    loggedInUser ? {} : "skip",
  ) as
    | {
        docOrderByFilter?: Record<string, string[]>;
        docOrderBySegmented?: Record<string, string[]>;
      }
    | undefined;

  const saveOrderForFilter = useMutation(
    api.userPreferences.setDocOrderForFilter,
  );

  const saveOrderForSegmented = useMutation(
    api.userPreferences.setDocOrderForSegmented,
  );

  // Type guard for planner mode values (weekly supported; calendar deprecated here)

  const isPlannerMode = (v: string): v is "list" | "kanban" | "weekly" =>
    v === "list" || v === "kanban" || v === "weekly";

  const isEventStatus = (
    v: string,
  ): v is "confirmed" | "tentative" | "cancelled" =>
    v === "confirmed" || v === "tentative" || v === "cancelled";

  const isListRange = (v: string): v is "today" | "week" | "month" | "custom" =>
    v === "today" || v === "week" || v === "month" || v === "custom";

  const toTaskStatus = (s: string): TaskStatus =>
    s === "todo" || s === "in_progress" || s === "done" || s === "blocked"
      ? s
      : "todo";

  const toTaskPriority = (
    p?: string,
  ): "low" | "medium" | "high" | "urgent" | undefined =>
    p === "low" || p === "medium" || p === "high" || p === "urgent"
      ? p
      : undefined;

  const hasUserId = (u: unknown): u is { _id: Id<"users"> } => {
    if (!u || typeof u !== "object") return false;

    return Object.prototype.hasOwnProperty.call(
      u as Record<string, unknown>,
      "_id",
    );
  };

  // Initialize mode from server preferences

  useEffect(() => {
    if (!prefs) return;

    const serverModeRaw = prefs.plannerMode ?? "list";

    let serverMode: "list" | "kanban" | "weekly" = "list";

    if (
      serverModeRaw === "list" ||
      serverModeRaw === "kanban" ||
      serverModeRaw === "weekly"
    ) {
      serverMode = serverModeRaw;
    }

    setMode(serverMode);
  }, [prefs, loggedInUser, setPlannerModeMutation]);

  // Persist planner mode to server when it changes (only if logged in)

  useEffect(() => {
    if (!loggedInUser) return;

    setPlannerModeMutation({ mode }).catch(() => {});
  }, [mode, loggedInUser, setPlannerModeMutation]);

  // Initialize density and showWeekInAgenda from server preferences

  useEffect(() => {
    // Populate from server prefs when available

    const d = prefs?.plannerDensity as "comfortable" | "compact" | undefined;

    if (d === "comfortable" || d === "compact") setDensity(d);

    const s = prefs?.showWeekInAgenda as boolean | undefined;

    if (typeof s === "boolean") setShowWeekInAgenda(s);

    const am = prefs?.agendaMode as
      | "list"
      | "kanban"
      | "weekly"
      | "mini"
      | undefined;

    if (am === "list" || am === "kanban" || am === "weekly" || am === "mini")
      setAgendaMode(am);

    // Initialize agenda selected date from server if present

    const sel = prefs?.agendaSelectedDateMs as number | undefined;

    if (typeof sel === "number" && Number.isFinite(sel)) {
      setAgendaSelectedDateMs(sel);
    }

    const um = prefs?.upcomingMode as "list" | "mini" | undefined;

    if (um === "list" || um === "mini") setUpcomingMode(um);

    // Fallback to localStorage for upcoming mode even when logged in (no server persistence yet)

    try {
      const umLS =
        typeof window !== "undefined"
          ? localStorage.getItem("nodebench:upcomingMode")
          : null;

      if (umLS === "list" || umLS === "mini") setUpcomingMode(umLS);
    } catch {}
  }, [prefs]);

  // Agenda scope persistence (local only)

  useEffect(() => {
    try {
      const s =
        typeof window !== "undefined"
          ? localStorage.getItem("nodebench:agendaScope")
          : null;

      if (s === "day" || s === "week") setAgendaScope(s);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      if (typeof window !== "undefined")
        localStorage.setItem("nodebench:agendaScope", agendaScope);
    } catch {}
  }, [agendaScope]);

  // Labels for agenda navigation

  const agendaDayLabel = useMemo(() => {
    const d = new Date(agendaStartUtc + offsetMs);

    return d.toLocaleDateString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  }, [agendaStartUtc, offsetMs]);

  const agendaRangeLabel = useMemo(
    () => (agendaScope === "week" ? agendaWeekLabel : agendaDayLabel),
    [agendaScope, agendaWeekLabel, agendaDayLabel],
  );

  // When not logged in, fall back to localStorage for view prefs

  useEffect(() => {
    if (loggedInUser) return;

    try {
      const d =
        typeof window !== "undefined"
          ? localStorage.getItem("nodebench:plannerDensity")
          : null;

      if (d === "comfortable" || d === "compact") setDensity(d);

      const s =
        typeof window !== "undefined"
          ? localStorage.getItem("nodebench:showWeekInAgenda")
          : null;

      if (s === "true" || s === "false") setShowWeekInAgenda(s === "true");

      const am =
        typeof window !== "undefined"
          ? localStorage.getItem("nodebench:agendaMode")
          : null;

      if (am === "list" || am === "kanban" || am === "weekly" || am === "mini")
        setAgendaMode(am);

      const um =
        typeof window !== "undefined"
          ? localStorage.getItem("nodebench:upcomingMode")
          : null;

      if (um === "list" || um === "mini") setUpcomingMode(um);
    } catch {
      // no-op
    }
  }, [loggedInUser]);

  // Initialize agendaSelectedDateMs from localStorage if logged out

  useEffect(() => {
    if (loggedInUser) return;

    try {
      const v =
        typeof window !== "undefined"
          ? localStorage.getItem("nodebench:agendaSelectedDateMs")
          : null;

      if (v) {
        const n = Number(v);

        if (Number.isFinite(n)) setAgendaSelectedDateMs(n);
      }
    } catch {}
  }, [loggedInUser]);

  // Removed toolbar style persistence (ghost style is always used)

  // View menu outside click / escape to close

  useEffect(() => {
    if (!viewMenuOpen) return;

    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node;

      if (
        viewMenuRef.current &&
        !viewMenuRef.current.contains(t) &&
        viewButtonRef.current &&
        !viewButtonRef.current.contains(t)
      ) {
        setViewMenuOpen(false);
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setViewMenuOpen(false);
    };

    document.addEventListener("mousedown", onDocClick);

    window.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("mousedown", onDocClick);

      window.removeEventListener("keydown", onKey);
    };
  }, [viewMenuOpen]);

  // Autofocus title when task modal opens

  useEffect(() => {
    if (showNewTaskModal) {
      setTimeout(() => newTaskTitleRef.current?.focus(), 0);
    }
  }, [showNewTaskModal]);

  // Remember previously focused element when opening; restore it when closing

  useEffect(() => {
    if (typeof document === "undefined") return;

    if (showNewTaskModal) {
      prevFocusRef.current = (document.activeElement as HTMLElement) ?? null;
    } else {
      prevFocusRef.current?.focus?.();
    }
  }, [showNewTaskModal]);

  // On open: suggest default due date (today) if none set yet

  useEffect(() => {
    if (!showNewTaskModal) return;

    setNewTaskModalDue((prev) => {
      if (prev) return prev;

      const d = new Date();

      const y = d.getFullYear();

      const m = String(d.getMonth() + 1).padStart(2, "0");

      const day = String(d.getDate()).padStart(2, "0");

      return `${y}-${m}-${day}`;
    });
  }, [showNewTaskModal]);

  // No runtime auto-reset needed now that Weekly replaces Calendar in this view.

  // Fallback: use localStorage only when not logged in

  useEffect(() => {
    if (loggedInUser) return;

    try {
      const saved =
        typeof window !== "undefined"
          ? localStorage.getItem("nodebench:plannerMode")
          : null;

      if (saved) {
        const mapped = saved === "calendar" ? "list" : saved;

        if (isPlannerMode(mapped)) setMode(mapped);
      }
    } catch {
      /* no-op */
    }
  }, [loggedInUser]);

  useEffect(() => {
    if (loggedInUser) return;

    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("nodebench:plannerMode", mode);
      }
    } catch {
      // no-op
    }
  }, [mode, loggedInUser]);

  // Global keyboard shortcuts for mode switching, grid toggle, and favorites

  useEffect(() => {
    const onGlobalKey = (e: KeyboardEvent) => {
      if (
        e.target &&
        (e.target as HTMLElement).tagName &&
        ["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)
      )
        return;

      if (e.key === "1") {
        setMode("list");
      } else if (e.key === "2") {
        setMode("kanban");
      } else if (e.key === "3") {
        setMode("weekly");
      } else if (e.key.toLowerCase() === "f") {
        setFilter((prev) => (prev === "favorites" ? "all" : "favorites"));
      }
    };

    window.addEventListener("keydown", onGlobalKey);

    return () => window.removeEventListener("keydown", onGlobalKey);
  }, []);

  // Task selection is now lifted to MainLayout via props

  // Sidebar: recent documents for quick access

  const recentDocuments =
    useQuery(
      api.documents.getRecentForMentions,

      loggedInUser ? { limit: 5 } : "skip",
    ) ?? [];

  // Sidebar: recent tasks ordered by last update

  const recentTasks =
    useQuery(
      api.tasks.listTasksByUpdatedDesc,

      loggedInUser ? { limit: 6 } : "skip",
    ) ?? [];

  const handleSelectTask = useCallback(
    (
      id: Id<"tasks"> | Id<"events">,

      source: "today" | "upcoming" | "week" | "other" = "other",
    ) => {
      const taskId = id as Id<"tasks">;

      // Toggle behavior: if selecting the same task in list mode, clear; else select

      if (mode === "list" && selectedTaskId === taskId) {
        onClearTaskSelection?.();
      } else {
        onSelectTask?.(taskId, source);
      }
    },

    [mode, selectedTaskId, setMode, onSelectTask],
  );

  const handleAddTask = () => {
    const d = new Date();

    d.setHours(0, 0, 0, 0);

    setInlineCreate({ dateMs: d.getTime(), defaultKind: "task" });
  };

  // Open New Task modal prefilled to a specific local date (from Mini calendar)

  const handleAddTaskForDate = (dateMs: number) => {
    if (!loggedInUser) {
      toast.error("Please sign in to create tasks.");
      return;
    }

    // dateMs is UTC ms corresponding to local day start; format to YYYY-MM-DD in local time

    const d = new Date(dateMs);

    const dayStart = new Date(
      d.getFullYear(),
      d.getMonth(),
      d.getDate(),
      0,
      0,
      0,
      0,
    );

    setFocusedDateMs(dateMs);

    setInlineCreate({ dateMs: dayStart.getTime(), defaultKind: "task" });
  };

  const handleDeleteDocument = useCallback(
    (documentId: Id<"documents">) => {
      archiveDocument({ id: documentId }).catch(console.error);
    },
    [archiveDocument],
  );

  const handleToggleFavorite = useCallback(
    (documentId: Id<"documents">) => {
      toggleFavorite({ id: documentId }).catch(console.error);
    },
    [toggleFavorite],
  );

  const handleCompileAaplModel = async () => {
    if (isCompiling) return;

    setIsCompiling(true);

    try {
      await compileAaplModel({});

      // Show files tab so the new CSV & memo appear immediately

      setFilter("files");
    } catch (e) {
      console.error("Compile AAPL model failed", e);
    } finally {
      setIsCompiling(false);
    }
  };

  const handleSeedOnboarding = async () => {
    if (!loggedInUser) {
      toast.error("Please sign in to seed onboarding content.");

      return;
    }

    if (isSeedingOnboarding) return;

    setIsSeedingOnboarding(true);

    try {
      const res = await seedOnboarding({});

      const r = (res ?? {}) as {
        createdDocuments?: number;
        existingDocuments?: number;
        createdTasks?: number;
        existingTasks?: number;
      };

      const {
        createdDocuments,
        existingDocuments,
        createdTasks,
        existingTasks,
      } = r;

      toast.success(
        `Onboarding ready: docs +${createdDocuments ?? 0} (existing ${existingDocuments ?? 0}), tasks +${createdTasks ?? 0} (existing ${existingTasks ?? 0})`,
      );
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to seed onboarding content");
    } finally {
      setIsSeedingOnboarding(false);
    }
  };

  const handleSeedTimeline = async () => {
    if (!loggedInUser) {
      toast.error("Please sign in to seed a timeline.");

      return;
    }

    if (isSeedingTimeline) return;

    setIsSeedingTimeline(true);

    try {
      let targetDocId: Id<"documents">;

      const selected = Array.from(selectedDocIds) as Array<Id<"documents">>;

      if (selected.length === 1) {
        targetDocId = selected[0];
      } else {
        targetDocId = await createDocument({ title: "Timeline Gantt" });
      }

      let timelineId: Id<"agentTimelines"> | null = null;

      try {
        timelineId = await createTimelineForDoc({
          documentId: targetDocId,
          name: "Timeline",
        });
      } catch (e) {
        console.warn("Failed to create agent timeline for document", e);
      }

      // If we couldn't create a timeline (e.g., not the owner), immediately fall back to a new doc

      if (!timelineId) {
        try {
          toast?.error?.(
            "Couldn't create a timeline on the selected document. Creating a new Timeline doc you own.",
          );
        } catch {}

        const newDoc = await createDocument({ title: "Timeline Gantt" });

        targetDocId = newDoc;

        try {
          timelineId = await createTimelineForDoc({
            documentId: targetDocId,
            name: "Timeline",
          });
        } catch (e2) {
          console.warn(
            "Failed to create agent timeline for fallback document",
            e2,
          );
        }

        try {
          await setDocumentType({ id: targetDocId, documentType: "timeline" });
        } catch (e3) {
          console.warn("Fallback setDocumentType also failed", e3);
        }
      }

      // Ensure this doc renders the timeline view immediately; if not allowed, fall back to a new doc

      try {
        await setDocumentType({ id: targetDocId, documentType: "timeline" });
      } catch (err) {
        console.warn(
          "setDocumentType failed; creating a new Timeline doc",
          err,
        );

        toast.message?.(
          "Created a new Timeline document because you don't own the selected doc.",
        );

        const newDoc = await createDocument({ title: "Timeline Gantt" });

        targetDocId = newDoc;

        try {
          timelineId = await createTimelineForDoc({
            documentId: targetDocId,
            name: "Timeline",
          });
        } catch (e2) {
          console.warn(
            "Failed to create agent timeline for fallback document",
            e2,
          );
        }

        try {
          await setDocumentType({ id: targetDocId, documentType: "timeline" });
        } catch (e3) {
          console.warn("Fallback setDocumentType also failed", e3);
        }
      }

      // Seed a simple demo plan

      const baseStartMs = Date.now();

      const tasks: Array<{
        id: string;
        parentId: string | null;
        name: string;
        startOffsetMs?: number;
        durationMs: number;
        agentType?: "orchestrator" | "main" | "leaf";
        status?: "pending" | "running" | "complete" | "paused";
      }> = [
        {
          id: "orc",
          parentId: null,
          name: "Orchestrate",
          startOffsetMs: 0,
          durationMs: 5 * 60 * 1000,
          agentType: "orchestrator",
        },

        {
          id: "main",
          parentId: "orc",
          name: "Main Research",
          startOffsetMs: 0,
          durationMs: 30 * 60 * 1000,
          agentType: "main",
        },

        {
          id: "leaf1",
          parentId: "main",
          name: "Collect Sources",
          startOffsetMs: 0,
          durationMs: 10 * 60 * 1000,
          agentType: "leaf",
        },

        {
          id: "leaf2",
          parentId: "main",
          name: "Summarize",
          startOffsetMs: 10 * 60 * 1000,
          durationMs: 15 * 60 * 1000,
          agentType: "leaf",
        },
      ];

      const links = [{ sourceId: "leaf1", targetId: "leaf2", type: "e2e" }];

      if (timelineId) {
        await applyPlanTimeline({ timelineId, baseStartMs, tasks, links });
      }

      handleSelectDocument(targetDocId);

      try {
        window.dispatchEvent(
          new CustomEvent("navigate:timeline", {
            detail: { docId: targetDocId },
          }),
        );
      } catch {}

      toast.success("Timeline seeded!");
    } catch (e: any) {
      console.error("Seed timeline failed", e);

      toast.error(e?.message ?? "Failed to seed timeline");
    } finally {
      setIsSeedingTimeline(false);
    }
  };

  // Build EditorJS data from analysis result for createWithContentString

  const buildEditorJsDataFromAnalysis = useCallback(
    (args: {
      title: string;
      analysis: string;
      structuredData?: any;
      analysisType?: string;
    }): any => {
      const blocks: any[] = [];

      const safeText = (s?: string) => (typeof s === "string" ? s : "");

      // Title as header

      blocks.push({ type: "header", data: { text: args.title, level: 2 } });

      const t = (args.analysisType || "").toLowerCase();

      const sd = args.structuredData || {};

      const pushList = (style: "unordered" | "ordered", items: string[]) => {
        if (!items || items.length === 0) return;

        blocks.push({ type: "list", data: { style, items } });
      };

      const pushChecklist = (
        items: Array<{ text: string; checked?: boolean }>,
      ) => {
        if (!items || items.length === 0) return;

        blocks.push({
          type: "checklist",
          data: {
            items: items.map((i) => ({
              text: safeText(i.text),
              checked: !!i.checked,
            })),
          },
        });
      };

      const addParagraph = (text?: string) => {
        if (!text) return;
        blocks.push({ type: "paragraph", data: { text } });
      };

      // Summary

      const summary =
        safeText(sd.summary) || args.analysis.split(/\n\n+/)[0] || "";

      addParagraph(summary);

      if (t === "highlights" || t === "video") {
        const highlights: any[] = Array.isArray(sd.highlights)
          ? sd.highlights
          : [];

        if (highlights.length > 0) {
          blocks.push({
            type: "header",
            data: { text: "Key Highlights", level: 3 },
          });

          pushList(
            "unordered",
            highlights.map(
              (h) =>
                `[${safeText(h.timestamp)}] ${safeText(h.description)}${h.importance === "high" ? " ⭐" : ""}`,
            ),
          );
        }

        const topics: string[] = Array.isArray(sd.topics) ? sd.topics : [];

        if (topics.length > 0) {
          blocks.push({
            type: "header",
            data: { text: "Topics Covered", level: 3 },
          });

          pushList("unordered", topics.map(safeText));
        }
      } else if (t === "object-detection" || t === "image") {
        if (sd.scene) addParagraph(`Scene: ${safeText(sd.scene)}`);

        const objs: any[] = Array.isArray(sd.objects) ? sd.objects : [];

        if (objs.length > 0) {
          blocks.push({
            type: "header",
            data: { text: "Objects Detected", level: 3 },
          });

          pushList(
            "unordered",
            objs.map((o) => {
              let line = safeText(o.name);

              if (typeof o.confidence === "number")
                line += ` (${Math.round(o.confidence * 100)}% confidence)`;

              if (o.location) line += ` - ${safeText(o.location)}`;

              return line;
            }),
          );
        }

        if (Array.isArray(sd.colors) && sd.colors.length > 0)
          addParagraph(`Colors: ${sd.colors.join(", ")}`);
      } else if (t === "document") {
        const keyPoints: string[] = Array.isArray(sd.keyPoints)
          ? sd.keyPoints
          : [];

        if (keyPoints.length > 0) {
          blocks.push({
            type: "header",
            data: { text: "Key Points", level: 3 },
          });

          pushList("unordered", keyPoints.map(safeText));
        }

        const st = sd.structure || {};

        const details: string[] = [];

        if (typeof st.sections === "number")
          details.push(`Sections: ${st.sections}`);

        if (typeof st.pageCount === "number")
          details.push(`Pages: ${st.pageCount}`);

        if (typeof st.hasImages === "boolean")
          details.push(`Contains Images: ${st.hasImages ? "Yes" : "No"}`);

        if (typeof st.hasTables === "boolean")
          details.push(`Contains Tables: ${st.hasTables ? "Yes" : "No"}`);

        if (details.length > 0) {
          blocks.push({
            type: "header",
            data: { text: "Structure", level: 3 },
          });

          pushList("unordered", details);
        }
      } else if (t === "csv") {
        if (typeof sd.rowCount === "number")
          addParagraph(`Rows: ${sd.rowCount}`);

        const cols: any[] = Array.isArray(sd.columnAnalysis)
          ? sd.columnAnalysis
          : [];

        if (cols.length > 0) {
          blocks.push({ type: "header", data: { text: "Columns", level: 3 } });

          pushList(
            "unordered",
            cols.map(
              (c: any) =>
                `${safeText(c.columnName)} (${safeText(c.dataType)}): ${safeText(c.description)}`,
            ),
          );
        }

        const patterns: string[] = Array.isArray(sd.dataPatterns)
          ? sd.dataPatterns
          : [];

        if (patterns.length > 0) {
          blocks.push({
            type: "header",
            data: { text: "Data Patterns", level: 3 },
          });

          pushList("unordered", patterns.map(safeText));
        }

        const viz: string[] = Array.isArray(sd.potentialVisualizations)
          ? sd.potentialVisualizations
          : [];

        if (viz.length > 0) {
          blocks.push({
            type: "header",
            data: { text: "Suggested Visualizations", level: 3 },
          });

          pushList("unordered", viz.map(safeText));
        }
      } else if (t === "audio") {
        if (sd.transcription) {
          blocks.push({
            type: "header",
            data: { text: "Transcription", level: 3 },
          });

          addParagraph(safeText(sd.transcription));
        }

        const speakers: string[] = Array.isArray(sd.speakers)
          ? sd.speakers
          : [];

        if (speakers.length > 0)
          pushChecklist(speakers.map((s) => ({ text: s, checked: false })));

        const keyMoments: any[] = Array.isArray(sd.keyMoments)
          ? sd.keyMoments
          : [];

        if (keyMoments.length > 0) {
          blocks.push({
            type: "header",
            data: { text: "Key Moments", level: 3 },
          });

          pushList(
            "unordered",
            keyMoments.map(
              (m: any) =>
                `[${safeText(m.timestamp)}] ${safeText(m.description)}`,
            ),
          );
        }
      }

      if (args.analysis) {
        blocks.push({ type: "header", data: { text: "Details", level: 3 } });

        const paras = args.analysis
          .split(/\n\n+/)
          .map((p) => p.trim())
          .filter(Boolean);

        for (const p of paras) addParagraph(p);
      }

      return { time: Date.now(), blocks, version: "2.31.0" };
    },
    [],
  );

  const handleAnalyzeFile = useCallback(
    async (doc: DocumentCardData) => {
      if (analyzeRunningDocId) return;

      if (!(doc.documentType === "file") || !doc.fileId) {
        console.error("Analyze is only available for uploaded files.");

        return;
      }

      if (!loggedInUser) {
        toast.error("Please sign in to analyze files.");
        return;
      }

      setAnalyzeRunningDocId(doc._id);

      try {
        const analysisType = (() => {
          const ft = (doc.fileType || "").toLowerCase();

          if (ft === "csv") return "csv";

          if (["mp4", "mov", "webm", "avi", "mpeg"].includes(ft))
            return "highlights";

          if (["jpg", "jpeg", "png", "webp", "gif"].includes(ft))
            return "object-detection";

          if (
            ft === "pdf" ||
            ft === "docx" ||
            ft === "pptx" ||
            ft === "xlsx" ||
            ft === "txt" ||
            ft === "md" ||
            ft === "json"
          )
            return "document";

          return "general";
        })();

        const result = await analyzeFileWithGenAI({
          fileId: doc.fileId,

          analysisPrompt:
            "Provide a comprehensive analysis of this file, including key insights and summary.",

          analysisType,
        });

        if ((result as any)?.success) {
          const title = `Analysis: ${doc.title}`;

          const editorJsData = buildEditorJsDataFromAnalysis({
            title,
            analysis: (result as any).analysis,
            structuredData: (result as any).structuredData,
            analysisType,
          });

          const contentString = JSON.stringify(editorJsData);

          const newDocId = await createDocumentWithContent({
            title,
            content: contentString,
          });

          onDocumentSelect(newDocId);

          toast.success("Analysis complete");
        } else {
          toast.error("Analysis failed");
        }
      } catch (err: any) {
        console.error("Analyze failed", err);

        toast.error(err?.message || "Analyze failed");
      } finally {
        setAnalyzeRunningDocId(null);
      }
    },
    [
      analyzeRunningDocId,
      analyzeFileWithGenAI,
      loggedInUser,
      buildEditorJsDataFromAnalysis,
      createDocumentWithContent,
      onDocumentSelect,
    ],
  );

  const runAnalyzeVoid = useCallback(
    (doc: DocumentCardData): void => {
      void handleAnalyzeFile(doc);
    },
    [handleAnalyzeFile],
  );

  // Ensure we track the last-selected document so AI prompts can target it

  const handleSelectDocument = useCallback(
    (documentId: Id<"documents">) => {
      setSelectedFrequentDoc(documentId);

      onDocumentSelect(documentId);
    },
    [onDocumentSelect],
  );

  // Dashboard (merged) mutations

  const createTask = useMutation(api.tasks.createTask);

  const updateTask = useMutation(api.tasks.updateTask);

  const moveTaskMutation = useMutation(api.tasks.moveTask);

  const deleteTaskMutation = useMutation(api.tasks.deleteTask);

  const rebalanceOrders = useMutation(api.tasks.rebalanceOrders);

  const createEventMutation = useMutation(api.events.createEvent);

  const updateEventMutation = useMutation(api.events.updateEvent);

  const deleteEventMutation = useMutation(api.events.deleteEvent);

  const toggleTaskFavoriteAgg = useMutation(api.tasks.toggleFavorite);

  // Toolbar: open inline event dialog (Calendar/Kanban)

  const handleAddAllDayEventFromToolbar = async () => {
    if (!loggedInUser) {
      toast.error("Please sign in to create events.");
      return;
    }

    const { startStr, endStr } = defaultEventTimesForToolbar();

    setToolbarEventTitle("");

    setToolbarEventStart(startStr);

    setToolbarEventEnd(endStr);

    setToolbarAllDay(false);

    setShowToolbarEventDialog(true);
  };

  // Open inline Event dialog prefilled to 09:00–10:00 on the selected date (from Mini calendar)

  const handleAddEventForDate = (dateMs: number) => {
    if (!loggedInUser) {
      toast.error("Please sign in to create events.");
      return;
    }

    const d = new Date(dateMs);

    const dayStart = new Date(
      d.getFullYear(),
      d.getMonth(),
      d.getDate(),
      0,
      0,
      0,
      0,
    );

    setFocusedDateMs(dateMs);

    setInlineCreate({ dateMs: dayStart.getTime(), defaultKind: "event" });
  };

  const submitToolbarEvent = async () => {
    if (!loggedInUser) {
      toast.error("Please sign in to create events.");
      return;
    }

    const title = toolbarEventTitle.trim();

    if (!title || !toolbarEventStart) return;

    try {
      const startMs = new Date(toolbarEventStart).getTime();

      const endMs = toolbarEventEnd
        ? new Date(toolbarEventEnd).getTime()
        : startMs + 60 * 60 * 1000;

      if (!Number.isFinite(startMs)) {
        toast.error("Invalid start time");
        return;
      }

      if (!Number.isFinite(endMs)) {
        toast.error("Invalid end time");
        return;
      }

      if (endMs < startMs) {
        toast.error("End time cannot be earlier than start time");
        return;
      }

      const id = await createEventMutation({
        title,
        startTime: startMs,
        endTime: endMs,
        allDay: toolbarAllDay,
        documentId: selectedFrequentDoc ?? undefined,
      });

      if (id) {
        setSelectedEventId(id);
      }

      toast.success("Event created");

      setShowToolbarEventDialog(false);

      // Reset for next time

      const { startStr, endStr } = defaultEventTimesForToolbar();

      setToolbarEventTitle("");

      setToolbarEventStart(startStr);

      setToolbarEventEnd(endStr);

      setToolbarAllDay(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to create event");
    }
  };

  const [eventEditorInline, setEventEditorInline] = useState(true);

  const handleSelectEvent = (id: Id<"events">) => {
    // Toggle behavior in Today list: clicking the same event closes the inline editor

    if (selectedEventId === id && eventEditorInline) {
      setSelectedEventId(null);

      setEventEditorInline(false);

      return;
    }

    setSelectedEventId(id);

    setEventEditorInline(true);
  };

  // Open a referenced entity from pills (document, task, event)

  const openReference = useCallback(
    (kind: "document" | "task" | "event", id: string) => {
      if (kind === "document") {
        handleSelectDocument(id as Id<"documents">);

        return;
      }

      if (kind === "task") {
        handleSelectTask(id as Id<"tasks">, "other");

        return;
      }

      if (kind === "event") {
        handleSelectEvent(id as Id<"events">);

        return;
      }
    },
    [handleSelectDocument, handleSelectTask, handleSelectEvent],
  );

  const handleQuickAgendaCreate = async () => {
    const title = quickAgendaText.trim();

    if (!title) return;

    if (!loggedInUser) {
      toast.error("Please sign in to create agenda items.");
      return;
    }

    try {
      // Create a task due today (task-only quick add)

      const base = new Date(focusedDateMs ?? Date.now());

      base.setHours(17, 0, 0, 0); // default due 5pm local

      await createTask({
        title,

        status: "todo",

        dueDate: base.getTime(),

        assigneeId: hasUserId(loggedInUser) ? loggedInUser._id : undefined,

        documentId: selectedFrequentDoc ?? undefined,
      });

      toast.success("Task created");

      setQuickAgendaText("");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to create agenda item");
    }
  };

  // Convert an event to a task: creates a task linked to the event and cancels the event

  const handleConvertEventToTask = useCallback(
    async (ev: any) => {
      if (!loggedInUser) {
        toast.error("Please sign in to convert events.");
        return;
      }

      try {
        const taskTitle = String(ev?.title ?? "Untitled");

        const baseDesc =
          typeof ev?.description === "string" ? ev.description : "";

        const hasAllDay = ev?.allDay === true;

        const sMs =
          typeof ev?.startTime === "number" ? ev.startTime : undefined;

        const eMs = typeof ev?.endTime === "number" ? ev.endTime : sMs;

        const parts: string[] = [];

        if (typeof sMs === "number") {
          const s = new Date(sMs);

          const e = new Date(typeof eMs === "number" ? eMs : sMs!);

          if (hasAllDay) {
            parts.push(`Event time: ${s.toLocaleDateString()}`);
          } else {
            const sd = s.toLocaleDateString();

            const st = s.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });

            const et = e.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });

            parts.push(`Event time: ${sd} ${st} - ${et}`);
          }
        }

        if (typeof ev?.location === "string" && ev.location.trim()) {
          parts.push(`Location: ${ev.location.trim()}`);
        }

        const metaBlock = parts.length ? `\n\n---\n${parts.join("\n")}` : "";

        const description = `${baseDesc}${metaBlock}`.trim();

        const descriptionJson =
          typeof ev?.descriptionJson === "string"
            ? ev.descriptionJson
            : undefined;

        const due =
          typeof ev?.startTime === "number" ? ev.startTime : undefined;

        const docId = ev?.documentId as Id<"documents"> | undefined;

        const tagsArr: string[] = Array.isArray(ev?.tags)
          ? ((ev.tags as any[]).filter(
              (x) => typeof x === "string",
            ) as string[])
          : [];

        const colorVal =
          typeof ev?.color === "string" && ev.color.trim()
            ? ev.color.trim()
            : undefined;

        await createTask({
          title: taskTitle,

          description: description || undefined,

          descriptionJson,

          dueDate: due,

          documentId: docId,

          refs: [{ kind: "event", id: ev._id as Id<"events"> }],

          tags: tagsArr.length ? tagsArr : undefined,

          color: colorVal,
        });

        // Delete the source event after creating the task

        await deleteEventMutation({ eventId: ev._id as Id<"events"> });

        toast.success("Converted event to task");
      } catch (err: any) {
        toast.error(err?.message ?? "Failed to convert event");
      }
    },
    [loggedInUser, createTask, deleteEventMutation],
  );

  // AI Bar helpers

  const emitQuickPrompt = (text: string, docIdOverride?: Id<"documents">) => {
    const trimmed = text.trim();

    if (!trimmed) return;

    try {
      const targetDoc = docIdOverride ?? selectedFrequentDoc;

      const detail = targetDoc
        ? { prompt: trimmed, documentId: targetDoc }
        : { prompt: trimmed };

      window.dispatchEvent(new CustomEvent("ai:quickPrompt", { detail }));
    } catch {
      // no-op
    }
  };

  const handleSend = () => {
    if (!prompt.trim()) return;

    emitQuickPrompt(prompt);

    setPrompt("");
  };

  const quickActions: Array<{ label: string; text: string }> = [
    {
      label: "Plan my day",
      text: "Plan my day. Suggest a prioritized task list for today with time blocks.",
    },

    {
      label: "Weekly review",
      text: "Run a weekly review. Summarize last week and propose focus tasks for this week.",
    },

    {
      label: "Time block",
      text: "Create a time-blocked schedule for today from 9am-6pm, include breaks.",
    },

    {
      label: "Brain dump → tasks",
      text: "Turn my braindump into actionable tasks with due dates and priorities.",
    },
  ];

  // Handlers: view prefs

  const onChangeDensity = (d: "comfortable" | "compact") => {
    setDensity(d);

    if (loggedInUser) {
      setPlannerViewPrefs({ density: d }).catch(() => {});
    } else {
      try {
        localStorage.setItem("nodebench:plannerDensity", d);
      } catch {
        /* no-op */
      }
    }
  };

  const onToggleShowWeek = () => {
    const next = !showWeekInAgenda;

    setShowWeekInAgenda(next);

    if (loggedInUser) {
      setPlannerViewPrefs({ showWeekInAgenda: next }).catch(() => {});
    } else {
      try {
        localStorage.setItem("nodebench:showWeekInAgenda", String(next));
      } catch {
        /* no-op */
      }
    }
  };

  // Handlers: agenda view mode for Today's Agenda

  const onChangeAgendaMode = (m: "list" | "kanban" | "weekly" | "mini") => {
    setAgendaMode(m);

    if (m !== "weekly") setLastNonWeeklyAgendaMode(m);

    if (loggedInUser) {
      setPlannerViewPrefs({ agendaMode: m }).catch(() => {});
    } else {
      try {
        localStorage.setItem("nodebench:agendaMode", m);
      } catch {
        /* no-op */
      }
    }
  };

  // Handler: Upcoming view mode (persist locally only)

  const onChangeUpcomingMode = (m: "list" | "mini") => {
    setUpcomingMode(m);

    if (loggedInUser) {
      // Prefer server persistence when authenticated

      (
        setUpcomingViewPrefs as unknown as (args: {
          upcomingMode: "list" | "mini";
        }) => Promise<any>
      )({ upcomingMode: m }).catch(() => {
        /* ignore */
      });
    }

    try {
      localStorage.setItem("nodebench:upcomingMode", m);
    } catch {
      /* no-op */
    }
  };

  // Handlers: new task modal submit

  const handleSubmitNewTask = useCallback(async () => {
    if (isSubmittingTask) return;

    const title = newTaskModalTitle.trim();

    if (!title) {
      toast.error("Title is required");

      return;
    }

    // Convert chosen date (YYYY-MM-DD) to end-of-day LOCAL time to avoid UTC parsing shifts

    const due = newTaskModalDue
      ? (() => {
          const [yy, mm, dd] = newTaskModalDue
            .split("-")
            .map((x) => parseInt(x, 10));

          if (!yy || !mm || !dd) return undefined as unknown as number;

          const dt = new Date(yy, mm - 1, dd, 23, 59, 59, 999);

          return dt.getTime();
        })()
      : undefined;

    const priority = toTaskPriority(newTaskModalPriority || undefined);

    try {
      setIsSubmittingTask(true);

      await createTask({
        title,

        description: newTaskModalDescription || undefined,

        dueDate: due,

        priority,

        documentId: selectedFrequentDoc ?? undefined,
      });

      toast.success("Task created");

      setShowNewTaskModal(false);

      setNewTaskModalTitle("");

      setNewTaskModalDue("");

      setNewTaskModalPriority("");

      setNewTaskModalDescription("");
    } catch (err) {
      console.error(err);

      toast.error("Failed to create task");
    } finally {
      setIsSubmittingTask(false);
    }
  }, [
    createTask,
    isSubmittingTask,
    newTaskModalTitle,
    newTaskModalDue,
    newTaskModalPriority,
    newTaskModalDescription,
    selectedFrequentDoc,
  ]);

  // Focus trap within modal dialog

  const handleModalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab") return;

    const container = modalRef.current;

    if (!container) return;

    const focusable = container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );

    if (focusable.length === 0) {
      e.preventDefault();

      return;
    }

    const first = focusable[0];

    const last = focusable[focusable.length - 1];

    const active = document.activeElement as HTMLElement | null;

    if (e.shiftKey) {
      if (active === first || !container.contains(active)) {
        e.preventDefault();

        last.focus();
      }
    } else {
      if (active === last) {
        e.preventDefault();

        first.focus();
      }
    }
  };

  // Modal keyboard shortcuts: ESC to close, Ctrl/Cmd + Enter to submit

  useEffect(() => {
    if (!showNewTaskModal) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isSubmittingTask) return;

        e.preventDefault();

        setShowNewTaskModal(false);
      } else if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        if (isSubmittingTask) return;

        e.preventDefault();

        void handleSubmitNewTask();
      }
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [showNewTaskModal, isSubmittingTask, handleSubmitNewTask]);

  const allDocuments = useMemo(
    () => documentsNorm.filter((doc) => !doc.isArchived),

    [documentsNorm],
  );

  // Group documents by type

  const groupedDocuments = {
    calendar: allDocuments.filter(
      (doc) =>
        doc.title.toLowerCase().includes("calendar") ||
        doc.title.toLowerCase().includes("schedule"),
    ),

    files: allDocuments.filter((doc) => doc.documentType === "file"),

    text: allDocuments.filter(
      (doc) =>
        (!doc.documentType || doc.documentType === "text") &&
        !doc.title.toLowerCase().includes("calendar") &&
        !doc.title.toLowerCase().includes("schedule"),
    ),

    favorites: allDocuments.filter((doc) => doc.isFavorite),
  };

  const countsByFilter = useMemo(
    () => ({
      all: allDocuments.length,

      calendar: groupedDocuments.calendar.length,

      text: groupedDocuments.text.length,

      files: groupedDocuments.files.length,

      favorites: groupedDocuments.favorites.length,
    }),
    [
      allDocuments.length,

      groupedDocuments.calendar.length,

      groupedDocuments.text.length,

      groupedDocuments.files.length,

      groupedDocuments.favorites.length,
    ],
  );

  // Filter documents based on selected filter

  const getFilteredDocuments = () => {
    if (filter === "all") return allDocuments;

    if (filter === "calendar") return groupedDocuments.calendar;

    if (filter === "files") return groupedDocuments.files;

    if (filter === "text") return groupedDocuments.text;

    if (filter === "favorites") return groupedDocuments.favorites;

    return [];
  };

  const filteredDocuments = getFilteredDocuments();

  // Local drag-and-drop ordering for Documents grid (per filter)

  const [docOrderByFilter, setDocOrderByFilter] = useState<
    Record<string, Array<string>>
  >({});

  // Load/save ordering from localStorage

  useEffect(() => {
    try {
      const raw = localStorage.getItem("nodebench:docOrderByFilter");

      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, Array<string>>;

        if (parsed && typeof parsed === "object") setDocOrderByFilter(parsed);
      }
    } catch {
      // no-op
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        "nodebench:docOrderByFilter",
        JSON.stringify(docOrderByFilter),
      );
    } catch {
      // no-op
    }
  }, [docOrderByFilter]);

  // Hydrate from server when available (overrides local) for per-filter orders

  useEffect(() => {
    if (!loggedInUser || !docOrders) return;

    if (docOrders.docOrderByFilter) {
      setDocOrderByFilter(docOrders.docOrderByFilter);
    }
  }, [loggedInUser, docOrders]);

  const orderedDocuments = useMemo(() => {
    // Order current filtered documents by the saved order for the current filter

    const order = docOrderByFilter[filter] ?? [];

    if (order.length === 0) return filteredDocuments;

    const byId: Record<string, (typeof filteredDocuments)[number]> = {};

    for (const d of filteredDocuments) byId[d._id] = d;

    const inOrder: Array<(typeof filteredDocuments)[number]> = [];

    for (const id of order) {
      const doc = byId[id];

      if (doc) inOrder.push(doc);
    }

    // Append any docs not yet in the saved order

    for (const d of filteredDocuments) {
      if (!order.includes(d._id)) inOrder.push(d);
    }

    return inOrder;
  }, [filteredDocuments, filter, docOrderByFilter]);

  // Fast lookup by id for rendering in sortable grid

  const docsById = useMemo(() => {
    const m: Record<string, (typeof orderedDocuments)[number]> = {};

    for (const d of orderedDocuments) m[d._id] = d;

    return m;
  }, [orderedDocuments]);

  // Note: segmented grids now use dnd-kit via DocumentsGridSortable with onReorder; no pangea DnD here

  // Segmented view: per-group order state and persistence

  const [segmentedOrderByGroup, setSegmentedOrderByGroup] = useState<
    Record<string, Array<string>>
  >({});

  // Load from localStorage

  useEffect(() => {
    try {
      const raw = localStorage.getItem("nodebench:docOrderBySegmented");

      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, Array<string>>;

        if (parsed && typeof parsed === "object")
          setSegmentedOrderByGroup(parsed);
      }
    } catch {
      /* no-op */
    }
  }, []);

  // Save to localStorage

  useEffect(() => {
    try {
      localStorage.setItem(
        "nodebench:docOrderBySegmented",
        JSON.stringify(segmentedOrderByGroup),
      );
    } catch {
      /* no-op */
    }
  }, [segmentedOrderByGroup]);

  // Hydrate from server when available

  useEffect(() => {
    if (!loggedInUser || !docOrders) return;

    if (docOrders.docOrderBySegmented) {
      setSegmentedOrderByGroup(docOrders.docOrderBySegmented);
    }
  }, [loggedInUser, docOrders]);

  const orderDocsBy = useCallback(
    (ids: string[] | undefined, docs: typeof filteredDocuments) => {
      if (!ids || ids.length === 0) return docs;

      const byId: Record<string, (typeof filteredDocuments)[number]> = {};

      for (const d of docs) byId[d._id] = d;

      const ordered: typeof filteredDocuments = [];

      const seen = new Set<string>();

      for (const id of ids) {
        const found = byId[id];

        if (found) {
          ordered.push(found);

          seen.add(id);
        }
      }

      for (const d of docs) {
        if (!seen.has(d._id)) ordered.push(d);
      }

      return ordered;
    },
    [],
  );

  // Initialize the most frequent document (first calendar document as default)

  useEffect(() => {
    if (documents && !selectedFrequentDoc) {
      const calendarDoc = documents.find(
        (doc) =>
          !doc.isArchived &&
          (doc.title.toLowerCase().includes("calendar") ||
            doc.title.toLowerCase().includes("schedule")),
      );

      if (calendarDoc) {
        setSelectedFrequentDoc(calendarDoc._id);
      } else if (documents.length > 0) {
        // Fallback to first non-archived document

        const firstDoc = documents.find((doc) => !doc.isArchived);

        if (firstDoc) {
          setSelectedFrequentDoc(firstDoc._id);
        }
      }
    }
  }, [documents, selectedFrequentDoc]);

  // Calendar doc targeting for AI quick prompts (prefer selected calendar doc, fallback to first calendar doc)

  const calendarDocId = useMemo(() => {
    const selectedCal = groupedDocuments.calendar.find(
      (d) => d._id === selectedFrequentDoc,
    );

    return selectedCal?._id ?? groupedDocuments.calendar[0]?._id ?? null;
  }, [groupedDocuments.calendar, selectedFrequentDoc]);

  // MiniMonthCalendar callback handlers

  const handleViewDayLocal = (dateMs: number) => {
    handleViewDay(dateMs);

    setMode("weekly");
  };

  const handleViewWeekLocal = (dateMs: number) => {
    handleViewWeek(dateMs);

    setMode("weekly");
  };

  const handleWeeklyReview = (weekAnchorMs: number) => {
    setFocusedDateMs(weekAnchorMs);

    setMode("weekly");

    emitQuickPrompt(
      "Run a weekly review. Summarize last week and propose focus tasks for this week.",

      calendarDocId ?? undefined,
    );
  };

  const handleCreateDocument = async (type: "text" | "calendar") => {
    const title = type === "calendar" ? "New Calendar" : "Untitled Document";

    const newDoc = await createDocument({ title });

    handleSelectDocument(newDoc);
  };

  const documentTypes = [
    { id: "all", label: "All", icon: <Sparkles className="h-4 w-4" /> },

    {
      id: "calendar",
      label: "Calendar",
      icon: <Calendar className="h-4 w-4" />,
    },

    { id: "text", label: "Documents", icon: <FileText className="h-4 w-4" /> },

    { id: "files", label: "Files", icon: <File className="h-4 w-4" /> },

    { id: "favorites", label: "Favorites", icon: <Star className="h-4 w-4" /> },
  ];

  const handleCreateTimelineDoc = async () => {
    const newDoc = await createDocument({ title: "Timeline Gantt" });

    try {
      await createTimelineForDoc({ documentId: newDoc, name: "Timeline" });

      await setDocumentType({ id: newDoc, documentType: "timeline" });
    } catch (e) {
      console.warn("Failed to create agent timeline for document", e);
    }

    handleSelectDocument(newDoc);
  };

  // Roving tab index + arrow key navigation for filter toolbar

  const filterIds: Array<string> = documentTypes.map((t) => t.id);

  const filterButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const focusFilterByIndex = (i: number) => {
    filterButtonRefs.current[i]?.focus();
  };

  const onFilterKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const idx = filterIds.indexOf(filter);

    let nextIdx = idx;

    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();

      nextIdx = (idx + 1) % filterIds.length;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();

      nextIdx = (idx - 1 + filterIds.length) % filterIds.length;
    } else if (e.key === "Home") {
      e.preventDefault();

      nextIdx = 0;
    } else if (e.key === "End") {
      e.preventDefault();

      nextIdx = filterIds.length - 1;
    }

    if (nextIdx !== idx) {
      const nextId = filterIds[nextIdx];

      setFilter(nextId);

      focusFilterByIndex(nextIdx);
    }
  };

  // Merged Dashboard UI pieces

  const listTabRef = useRef<HTMLButtonElement>(null);

  const kanbanTabRef = useRef<HTMLButtonElement>(null);

  const weeklyTabRef = useRef<HTMLButtonElement>(null);

  const focusMode = (m: "list" | "kanban" | "weekly") => {
    if (m === "list") {
      listTabRef.current?.focus();
    } else {
      (m === "kanban" ? kanbanTabRef : weeklyTabRef).current?.focus();
    }
  };

  const onTabsKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const order: Array<"list" | "kanban" | "weekly"> = [
      "list",
      "kanban",
      "weekly",
    ];

    const idx = order.indexOf(mode);

    let next = mode;

    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();

      next = order[(idx + 1) % order.length];

      setMode(next);

      focusMode(next);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();

      next = order[(idx - 1 + order.length) % order.length];

      setMode(next);

      focusMode(next);
    } else if (e.key === "Home") {
      e.preventDefault();

      next = "list";

      setMode(next);

      focusMode(next);
    } else if (e.key === "End") {
      e.preventDefault();

      next = "weekly";

      setMode(next);

      focusMode(next);
    }
  };

  const ModeToggle = () => (
    <div
      className="inline-flex rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] overflow-hidden"
      role="tablist"
      aria-label="Planner view selector"
      onKeyDown={onTabsKeyDown}
    >
      <button
        ref={listTabRef}
        className={`flex items-center gap-2 px-3 py-2 text-sm ${
          mode === "list"
            ? "bg-[var(--accent-primary)] text-white"
            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
        }`}
        onClick={() => setMode("list")}
        title="Tasks View"
        role="tab"
        aria-selected={mode === "list"}
        tabIndex={mode === "list" ? 0 : -1}
        aria-keyshortcuts="1"
        id="planner-tab-list"
      >
        <ListTodo className="h-4 w-4" />

        <span className="hidden sm:inline">Tasks View</span>
      </button>

      <button
        ref={kanbanTabRef}
        className={`flex items-center gap-2 px-3 py-2 text-sm ${
          mode === "kanban"
            ? "bg-[var(--accent-primary)] text-white"
            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
        }`}
        onClick={() => setMode("kanban")}
        title="Kanban view"
        role="tab"
        aria-selected={mode === "kanban"}
        tabIndex={mode === "kanban" ? 0 : -1}
        aria-keyshortcuts="2"
        id="planner-tab-kanban"
      >
        <KanbanSquare className="h-4 w-4" />

        <span className="hidden sm:inline">Kanban</span>
      </button>

      <button
        ref={weeklyTabRef}
        className={`flex items-center gap-2 px-3 py-2 text-sm ${
          mode === "weekly"
            ? "bg-[var(--accent-primary)] text-white"
            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
        }`}
        onClick={() => setMode("weekly")}
        title="Weekly view"
        role="tab"
        aria-selected={mode === "weekly"}
        tabIndex={mode === "weekly" ? 0 : -1}
        aria-keyshortcuts="3"
        id="planner-tab-weekly"
      >
        <CalendarDays className="h-4 w-4" />

        <span className="hidden sm:inline">Weekly</span>
      </button>
    </div>
  );

  const AiBar = () => (
    <div className="w-full flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-md border border-[var(--border-color)] bg-[var(--bg-primary)] flex-1">
          <Sparkles className="h-4 w-4 text-[var(--accent-primary)]" />

          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();

                handleSend();
              }
            }}
            placeholder="Ask the agent… (e.g., ‘Plan my week’)"
            className="w-full bg-transparent outline-none text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)]"
          />
        </div>

        <button
          onClick={handleSend}
          className="px-3 py-2 bg-[var(--accent-primary)] text-white rounded-md hover:bg-[var(--accent-primary-hover)] text-sm flex items-center gap-2"
          title="Send"
        >
          <Send className="h-4 w-4" />

          <span className="hidden sm:inline">Ask</span>
        </button>

        <button
          onClick={() => {
            try {
              window.dispatchEvent(new CustomEvent("ai:openPanel"));
            } catch {
              // no-op
            }
          }}
          className="px-3 py-2 text-sm rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)]"
          title="Open AI Chat"
        >
          Open Chat
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {quickActions.map((qa) => (
          <button
            key={qa.label}
            onClick={() => emitQuickPrompt(qa.text)}
            className="px-2.5 py-1.5 rounded-full text-xs border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
            title={qa.text}
          >
            {qa.label}
          </button>
        ))}
      </div>
    </div>
  );

  // ListView, KanbanView, CalendarCard from Dashboard

  const ListView = () => {
    const [newTaskTitle, setNewTaskTitle] = useState("");

    const [listRange, setListRange] = useState<
      "today" | "week" | "month" | "custom"
    >("today");

    const [customStart, setCustomStart] = useState<string>("");

    const [customEnd, setCustomEnd] = useState<string>("");

    // Helpers for datetime-local formatting and rounding

    const formatDateTimeLocal = (d: Date): string => {
      const y = d.getFullYear();

      const m = String(d.getMonth() + 1).padStart(2, "0");

      const day = String(d.getDate()).padStart(2, "0");

      const hh = String(d.getHours()).padStart(2, "0");

      const mm = String(d.getMinutes()).padStart(2, "0");

      return `${y}-${m}-${day}T${hh}:${mm}`;
    };

    const roundedNow15 = (): string => {
      const d = new Date();

      d.setSeconds(0, 0);

      const mins = d.getMinutes();

      const rounded = Math.ceil(mins / 15) * 15;

      d.setMinutes(rounded >= 60 ? 0 : rounded, 0, 0);

      if (rounded >= 60) {
        d.setHours(d.getHours() + 1);
      }

      return formatDateTimeLocal(d);
    };

    const [newEventTitle, setNewEventTitle] = useState("");

    const [newEventStart, setNewEventStart] = useState<string>(() =>
      roundedNow15(),
    );

    const [newEventEnd, setNewEventEnd] = useState("");

    const handleCreateQuickTask = async () => {
      const title = newTaskTitle.trim();

      if (!title) return;

      if (!loggedInUser) {
        toast.error("Please sign in to create tasks.");

        return;
      }

      const now = new Date();

      const endOfDay = new Date(now);

      endOfDay.setHours(23, 59, 59, 999);

      try {
        await createTask({
          title,
          status: "todo",
          dueDate: endOfDay.getTime(),
        });

        setNewTaskTitle("");
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);

        const authError =
          msg.includes("Not authenticated") || msg.includes("User not found");

        toast.error(
          authError
            ? "You're not signed in. Please sign in and try again."
            : `Failed to create task: ${msg}`,
        );
      }
    };

    const _handleCreateQuickEvent = async () => {
      const title = newEventTitle.trim();

      if (!title || !newEventStart) return;

      if (!loggedInUser) {
        toast.error("Please sign in to create events.");

        return;
      }

      try {
        const startMs = new Date(newEventStart).getTime();

        const endMs = newEventEnd
          ? new Date(newEventEnd).getTime()
          : startMs + 60 * 60 * 1000;

        if (!Number.isFinite(startMs)) {
          toast.error("Invalid start time");

          return;
        }

        if (!Number.isFinite(endMs)) {
          toast.error("Invalid end time");

          return;
        }

        if (endMs < startMs) {
          toast.error("End time cannot be earlier than start time");

          return;
        }

        const id = await createEventMutation({
          title,
          startTime: startMs,
          endTime: endMs,
          documentId: selectedFrequentDoc ?? undefined,
        });

        if (id) {
          setSelectedEventId(id);
        }

        toast.success("Event created");

        setNewEventTitle("");

        setNewEventStart(roundedNow15());

        setNewEventEnd("");
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);

        const authError =
          msg.includes("Not authenticated") || msg.includes("User not found");

        toast.error(
          authError
            ? "You're not signed in. Please sign in and try again."
            : `Failed to create event: ${msg}`,
        );
      }
    };

    const SectionCard = ({
      title,

      subtitle,

      children,
    }: {
      title: string;
      subtitle?: string;
      children?: React.ReactNode;
    }) => (
      <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            {title}
          </h3>

          {subtitle && (
            <span className="text-xs text-[var(--text-muted)]">{subtitle}</span>
          )}
        </div>

        {children}
      </div>
    );

    const tasksTodayList = tasksToday ?? [];

    const eventsTodayList = eventsToday ?? [];

    // Month and custom range queries for list view range filter

    const monthBounds = useMemo(() => {
      const offsetMs = tzOffsetMinutes * 60 * 1000;

      const now = Date.now();

      const local = now + offsetMs;

      const d = new Date(local);

      d.setUTCDate(1);
      d.setUTCHours(0, 0, 0, 0);

      const start = d.getTime() - offsetMs;

      const end =
        new Date(d.getUTCFullYear(), d.getUTCMonth() + 1, 0).getTime() -
        offsetMs +
        (24 * 60 * 60 * 1000 - 1);

      return { start, end };
    }, [tzOffsetMinutes]);

    const tasksThisMonthRaw = useQuery(
      api.tasks.listTasksDueInRange,

      loggedInUser && listRange === "month" ? monthBounds : "skip",
    );

    const tasksThisMonth = tasksThisMonthRaw ?? [];

    const customBounds = useMemo(() => {
      if (!customStart || !customEnd) return null;

      const s = new Date(customStart).getTime();

      const e = new Date(customEnd).getTime();

      if (!Number.isFinite(s) || !Number.isFinite(e) || e < s) return null;

      return { start: s, end: e };
    }, [customStart, customEnd]);

    const tasksCustomRaw = useQuery(
      api.tasks.listTasksDueInRange,

      loggedInUser && listRange === "custom" && customBounds
        ? customBounds
        : "skip",
    );

    const tasksCustom = tasksCustomRaw ?? [];

    // Build unified, chronologically sorted agenda for Today and This Week

    const toAgendaItem = (item: any, kind: "task" | "event" | "note") => {
      return {
        kind,

        time:
          kind === "event"
            ? (item.startTime as number)
            : kind === "task"
              ? ((item.dueDate as number | undefined) ??
                Number.POSITIVE_INFINITY)
              : ((item.agendaDate as number | undefined) ??
                (item._creationTime as number | undefined) ??
                0),

        item,
      } as const;
    };

    const todayAgenda = [
      ...eventsTodayList.map((e: any) => toAgendaItem(e, "event")),

      ...tasksTodayList.map((t: any) => toAgendaItem(t, "task")),

      ...notesTodayList.map((n: any) => toAgendaItem(n, "note")),
    ].sort((a, b) => a.time - b.time);

    const weekAgenda = [
      ...eventsWeekList.map((e: any) => toAgendaItem(e, "event")),

      ...tasksWeekList.map((t: any) => toAgendaItem(t, "task")),

      ...agendaWeekNotes.map((n: any) => toAgendaItem(n, "note")),
    ].sort((a, b) => a.time - b.time);

    // Helpers: keys and normalization for persisted order arrays

    const keyForEntry = (entry: { kind: "task" | "event"; item: any }) =>
      `${entry.kind === "event" ? "e" : "t"}_${entry.item._id}`;

    const normalizeOrder = (
      allKeys: string[],
      orderFromPrefs?: string[],
      localOverride?: string[],
    ) => {
      const base =
        localOverride && localOverride.length > 0
          ? localOverride
          : orderFromPrefs && orderFromPrefs.length > 0
            ? orderFromPrefs
            : allKeys;

      // Filter to only keys we have, then append any new ones

      const filtered = base.filter((k) => allKeys.includes(k));

      const missing = allKeys.filter((k) => !filtered.includes(k));

      return [...filtered, ...missing];
    };

    // Read localStorage if logged out

    const readLocalOrder = (key: string): string[] | undefined => {
      try {
        const s =
          typeof window !== "undefined" ? localStorage.getItem(key) : null;

        if (!s) return undefined;

        const arr = JSON.parse(s);

        return Array.isArray(arr) ? (arr as string[]) : undefined;
      } catch {
        return undefined;
      }
    };

    const todayKeys = todayAgenda.map((e) => keyForEntry(e));

    const weekKeys = weekAgenda.map((e) => keyForEntry(e));

    const prefToday = loggedInUser
      ? listOrders?.agendaListOrder
      : readLocalOrder("nodebench:agendaListOrder");

    const prefWeek = loggedInUser
      ? listOrders?.upcomingListOrder
      : readLocalOrder("nodebench:upcomingListOrder");

    const todayOrderEffective = normalizeOrder(
      todayKeys,
      prefToday,
      agendaOrder,
    );

    const weekOrderEffective = normalizeOrder(
      weekKeys,
      prefWeek,
      upcomingOrder,
    );

    const todayByKey = new Map<string, (typeof todayAgenda)[number]>();

    for (const e of todayAgenda) todayByKey.set(keyForEntry(e), e);

    const weekByKey = new Map<string, (typeof weekAgenda)[number]>();

    for (const e of weekAgenda) weekByKey.set(keyForEntry(e), e);

    const orderedTodayAgenda = todayOrderEffective
      .map((k) => todayByKey.get(k))
      .filter(Boolean) as typeof todayAgenda;

    const orderedWeekAgenda = weekOrderEffective
      .map((k) => weekByKey.get(k))
      .filter(Boolean) as typeof weekAgenda;

    return (
      <div className="space-y-4">
        <SectionCard
          title="Agenda"
          subtitle={
            listRange === "today"
              ? "Today"
              : listRange === "week"
                ? "This Week"
                : listRange === "month"
                  ? "This Month"
                  : "Custom Range"
          }
        >
          {/* Range selector */}

          <div className="mb-2 flex items-center gap-2">
            <label className="text-xs text-[var(--text-secondary)]">
              Range:
            </label>

            <select
              className="text-xs border border-[var(--border-color)] rounded-md bg-[var(--bg-primary)] px-1.5 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
              value={listRange}
              onChange={(e) => {
                const v = e.target.value;
                if (isListRange(v)) setListRange(v);
              }}
            >
              <option value="today">Today</option>

              <option value="week">This Week</option>

              <option value="month">This Month</option>

              <option value="custom">Custom…</option>
            </select>

            {listRange === "custom" && (
              <>
                <input
                  type="datetime-local"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="text-xs border border-[var(--border-color)] rounded-md bg-[var(--bg-primary)] px-1.5 py-1"
                />

                <input
                  type="datetime-local"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="text-xs border border-[var(--border-color)] rounded-md bg-[var(--bg-primary)] px-1.5 py-1"
                />
              </>
            )}
          </div>

          {/* Quick task input */}

          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-md border border-[var(--border-color)] bg-[var(--bg-primary)] flex-1 focus-within:ring-2 focus-within:ring-[var(--accent-primary)]">
              <Plus className="h-4 w-4 text-[var(--accent-primary)]" />

              <input
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();

                    void handleCreateQuickTask();
                  }
                }}
                placeholder="Quick add a task…"
                className="w-full bg-transparent outline-none text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)]"
              />
            </div>

            <button
              onClick={() => void handleCreateQuickTask()}
              className="px-3 py-2 bg-[var(--accent-primary)] text-white rounded-md hover:bg-[var(--accent-primary-hover)] text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
              title="Add task"
              disabled={!loggedInUser}
            >
              Add
            </button>
          </div>

          {/* Quick event input */}

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-3">
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-md border border-[var(--border-color)] bg-[var(--bg-primary)] flex-1 min-w-0">
              <Calendar className="h-4 w-4 text-[var(--accent-primary)]" />

              <input
                value={newEventTitle}
                onChange={(e) => setNewEventTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void _handleCreateQuickEvent();
                  }
                }}
                placeholder="Quick add an event (title)…"
                className="w-full bg-transparent outline-none text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)]"
              />
            </div>

            <input
              type="datetime-local"
              value={newEventStart}
              onChange={(e) => {
                const v = e.target.value;

                setNewEventStart(v);

                if (!newEventEnd) {
                  const t = new Date(v);

                  if (!Number.isNaN(t.getTime())) {
                    const end = new Date(t.getTime() + 60 * 60 * 1000);

                    setNewEventEnd(formatDateTimeLocal(end));
                  }
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void _handleCreateQuickEvent();
                }
              }}
              className="px-2 py-1.5 rounded-md border border-[var(--border-color)] bg-[var(--bg-primary)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)]"
              aria-label="Event start"
              required
            />

            <input
              type="datetime-local"
              value={newEventEnd}
              onChange={(e) => setNewEventEnd(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void _handleCreateQuickEvent();
                }
              }}
              className="px-2 py-1.5 rounded-md border border-[var(--border-color)] bg-[var(--bg-primary)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)]"
              aria-label="Event end"
            />

            <button
              onClick={() => void _handleCreateQuickEvent()}
              className="px-3 py-2 bg-[var(--accent-primary)] text-white rounded-md hover:bg-[var(--accent-primary-hover)] text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
              title="Add event"
              disabled={
                !loggedInUser ||
                !newEventTitle.trim() ||
                !newEventStart ||
                (!!newEventEnd &&
                  new Date(newEventEnd).getTime() <
                    new Date(newEventStart).getTime())
              }
            >
              Add Event
            </button>
          </div>

          {/* Render according to selected range */}

          {listRange === "today" && (
            <div className="mt-2">
              {isUploading && (
                <div
                  className="mb-2 text-xs text-[var(--text-secondary)] flex items-center gap-2"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  <Loader2 className="h-3 w-3 animate-spin" />

                  <span className="truncate">
                    {uploadProgress || "Uploading..."}
                  </span>
                </div>
              )}

              <div className="text-[11px] uppercase tracking-wide text-[var(--text-muted)] mb-1">
                Today
              </div>

              {orderedTodayAgenda.length === 0 ? (
                <div className="text-sm text-[var(--text-secondary)]">
                  Nothing scheduled for today.
                </div>
              ) : (
                <SortableList
                  items={todayOrderEffective}
                  orientation="vertical"
                  containerClassName="flex flex-col gap-2"
                  onReorder={(newKeys) => {
                    // Prune any stale keys not present in today's map

                    const pruned = newKeys.filter((k) => todayByKey.has(k));

                    setAgendaOrder(pruned);

                    if (loggedInUser) {
                      void setListOrders({ agendaListOrder: pruned }).catch(
                        () => {},
                      );
                    } else {
                      try {
                        localStorage.setItem(
                          "nodebench:agendaListOrder",
                          JSON.stringify(pruned),
                        );
                      } catch {
                        /* no-op */
                      }
                    }
                  }}
                  renderItem={(key) => {
                    const entry = todayByKey.get(key);

                    if (!entry) return null;

                    return entry.kind === "event" ? (
                      <div
                        key={`e_${entry.item._id}`}
                        className="flex flex-col gap-1"
                      >
                        <TaskRowGlobal
                          t={entry.item}
                          kind="event"
                          density={density}
                          onSelect={(id) =>
                            handleSelectEvent(id as Id<"events">)
                          }
                          onChangeStatus={(id, status) =>
                            void updateEventMutation({
                              eventId: id as Id<"events">,
                              status: status as
                                | "confirmed"
                                | "tentative"
                                | "cancelled",
                            })
                          }
                          onOpenRef={openReference}
                        />

                        {selectedEventId === entry.item._id &&
                          eventEditorInline && (
                            <MiniAgendaEditorPanel
                              kind="event"
                              eventId={entry.item._id}
                              onClose={() => {
                                setSelectedEventId(null);
                                setEventEditorInline(false);
                              }}
                              documentIdForAssociation={
                                selectedFrequentDoc ?? null
                              }
                            />
                          )}
                      </div>
                    ) : (
                      <div
                        key={`t_${entry.item._id}`}
                        className="flex flex-col gap-1"
                      >
                        <TaskRowGlobal
                          t={entry.item}
                          density={density}
                          onSelect={(id) =>
                            handleSelectTask(id as Id<"tasks">, "today")
                          }
                          onChangeStatus={(id, status) =>
                            void updateTask({
                              taskId: id as Id<"tasks">,
                              status: status as
                                | "todo"
                                | "in_progress"
                                | "done"
                                | "blocked",
                            })
                          }
                          onOpenRef={openReference}
                        />

                        {selectedTaskId === entry.item._id && (
                          <MiniAgendaEditorPanel
                            kind="task"
                            taskId={entry.item._id}
                            onClose={onClearTaskSelection ?? (() => {})}
                          />
                        )}
                      </div>
                    );
                  }}
                />
              )}
            </div>
          )}

          {listRange === "week" && (
            <div className="mt-4">
              <div className="text-[11px] uppercase tracking-wide text-[var(--text-muted)] mb-1">
                This Week
              </div>

              {orderedWeekAgenda.length === 0 ? (
                <div className="text-sm text-[var(--text-secondary)]">
                  No upcoming items this week.
                </div>
              ) : (
                <SortableList
                  items={weekOrderEffective}
                  orientation="vertical"
                  containerClassName="flex flex-col gap-2"
                  onReorder={(newKeys) => {
                    // Prune any stale keys not present in this week's map

                    const pruned = newKeys.filter((k) => weekByKey.has(k));

                    setUpcomingOrder(pruned);

                    if (loggedInUser) {
                      void setListOrders({ upcomingListOrder: pruned }).catch(
                        () => {},
                      );
                    } else {
                      try {
                        localStorage.setItem(
                          "nodebench:upcomingListOrder",
                          JSON.stringify(pruned),
                        );
                      } catch {
                        /* no-op */
                      }
                    }
                  }}
                  renderItem={(key) => {
                    const entry = weekByKey.get(key);

                    if (!entry) return null;

                    return entry.kind === "event" ? (
                      <div
                        key={`we_${entry.item._id}`}
                        className="flex flex-col gap-1"
                      >
                        <AgendaMiniRow
                          item={entry.item}
                          kind="event"
                          onSelect={(id) =>
                            handleSelectEvent(id as Id<"events">)
                          }
                        />

                        {selectedEventId === entry.item._id &&
                          eventEditorInline && (
                            <MiniAgendaEditorPanel
                              kind="event"
                              eventId={entry.item._id}
                              onClose={() => {
                                setSelectedEventId(null);
                                setEventEditorInline(false);
                              }}
                              documentIdForAssociation={
                                selectedFrequentDoc ?? null
                              }
                            />
                          )}
                      </div>
                    ) : (
                      <div
                        key={`wt_${entry.item._id}`}
                        className="flex flex-col gap-1"
                        onPointerUp={(e) => {
                          try {
                            if (
                              document.documentElement.classList.contains(
                                "dnd-dragging",
                              )
                            )
                              return;
                          } catch {}

                          onSelectTask?.(entry.item._id as Id<"tasks">, "week");

                          setAgendaPopover({
                            kind: "task",
                            anchor: e.currentTarget as HTMLElement,
                            taskId: entry.item._id as Id<"tasks">,
                          });
                        }}
                        onMouseUp={(e) => {
                          onSelectTask?.(entry.item._id as Id<"tasks">, "week");

                          setAgendaPopover({
                            kind: "task",
                            anchor: e.currentTarget as HTMLElement,
                            taskId: entry.item._id as Id<"tasks">,
                          });
                        }}
                        onClick={(e) => {
                          onSelectTask?.(entry.item._id as Id<"tasks">, "week");

                          setAgendaPopover({
                            kind: "task",
                            anchor: e.currentTarget as HTMLElement,
                            taskId: entry.item._id as Id<"tasks">,
                          });
                        }}
                      >
                        <AgendaMiniRow
                          item={entry.item}
                          kind="task"
                          showCheckbox
                          onToggleComplete={(tid, completed) =>
                            void updateTask({
                              taskId: tid as Id<"tasks">,

                              status: (completed ? "done" : "todo") as
                                | "todo"
                                | "in_progress"
                                | "done"
                                | "blocked",
                            })
                          }
                        />

                        {weekPillsById[entry.item._id]?.pills?.length ? (
                          <div className="mt-1">
                            <MetaPills
                              pills={weekPillsById[entry.item._id].pills}
                            />
                          </div>
                        ) : null}
                      </div>
                    );
                  }}
                />
              )}
            </div>
          )}

          {listRange === "month" && (
            <div className="mt-4">
              <div className="text-[11px] uppercase tracking-wide text-[var(--text-muted)] mb-1">
                This Month
              </div>

              {tasksThisMonth.length === 0 ? (
                <div className="text-sm text-[var(--text-secondary)]">
                  No tasks due this month.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {tasksThisMonth
                    .sort(
                      (a: any, b: any) => (a.dueDate ?? 0) - (b.dueDate ?? 0),
                    )
                    .map((t: any) => (
                      <div
                        key={`m_${t._id}`}
                        className="flex flex-col gap-1"
                        onPointerUp={(e) => {
                          try {
                            if (
                              document.documentElement.classList.contains(
                                "dnd-dragging",
                              )
                            )
                              return;
                          } catch {}

                          onSelectTask?.(t._id as Id<"tasks">, "other");

                          setAgendaPopover({
                            kind: "task",
                            anchor: e.currentTarget as HTMLElement,
                            taskId: t._id as Id<"tasks">,
                          });
                        }}
                        onMouseUp={(e) => {
                          onSelectTask?.(t._id as Id<"tasks">, "other");

                          setAgendaPopover({
                            kind: "task",
                            anchor: e.currentTarget as HTMLElement,
                            taskId: t._id as Id<"tasks">,
                          });
                        }}
                        onClick={(e) => {
                          onSelectTask?.(t._id as Id<"tasks">, "other");

                          setAgendaPopover({
                            kind: "task",
                            anchor: e.currentTarget as HTMLElement,
                            taskId: t._id as Id<"tasks">,
                          });
                        }}
                      >
                        <TaskRowGlobal
                          t={t}
                          density={density}
                          onChangeStatus={(id, status) =>
                            void updateTask({
                              taskId: id as Id<"tasks">,
                              status: status as
                                | "todo"
                                | "in_progress"
                                | "done"
                                | "blocked",
                            })
                          }
                        />
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {listRange === "custom" && customBounds && (
            <div className="mt-4">
              <div className="text-[11px] uppercase tracking-wide text-[var(--text-muted)] mb-1">
                Custom Range
              </div>

              {tasksCustom.length === 0 ? (
                <div className="text-sm text-[var(--text-secondary)]">
                  No tasks in this range.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {tasksCustom
                    .sort(
                      (a: any, b: any) => (a.dueDate ?? 0) - (b.dueDate ?? 0),
                    )
                    .map((t: any) => (
                      <div key={`c_${t._id}`} className="flex flex-col gap-1">
                        <TaskRowGlobal
                          t={t}
                          density={density}
                          onSelect={(id) => handleSelectTask(id, "week")}
                          onChangeStatus={(id, status) =>
                            void updateTask({
                              taskId: id as Id<"tasks">,
                              status: status as
                                | "todo"
                                | "in_progress"
                                | "done"
                                | "blocked",
                            })
                          }
                        />
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </SectionCard>
      </div>
    );
  };

  // VibrantTaskCard replaced by AgendaMiniRow for compact Kanban parity

  const KanbanView = () => {
    type Status = TaskStatus;

    const [kanbanQuickTitle, setKanbanQuickTitle] = useState("");

    const [kanbanQuickStatus, setKanbanQuickStatus] = useState<Status>("todo");

    const [kanbanQuickDue, setKanbanQuickDue] = useState("");

    const [kanbanQuickPriority, setKanbanQuickPriority] = useState<string>("");

    // Lane title editing state and helpers

    const laneTitles = useMemo(() => {
      const defaults: Record<Status, string> = {
        todo: "To Do",

        in_progress: "In Progress",

        done: "Done",

        blocked: "Blocked",
      } as const;

      const p =
        prefs && typeof prefs === "object"
          ? (prefs as Record<string, unknown>)
          : undefined;

      const t =
        p && typeof p.kanbanLaneTitles === "object"
          ? (p.kanbanLaneTitles as Partial<Record<Status, string>>)
          : undefined;

      return {
        todo: t?.todo || defaults.todo,

        in_progress: t?.in_progress || defaults.in_progress,

        done: t?.done || defaults.done,

        blocked: t?.blocked || defaults.blocked,
      } as Record<Status, string>;
    }, [prefs]);

    const [editingLane, setEditingLane] = useState<Status | null>(null);

    const [laneDraft, setLaneDraft] = useState<string>("");

    const startEditLane = (s: Status) => {
      setEditingLane(s);

      setLaneDraft(laneTitles[s] ?? "");
    };

    const cancelEditLane = () => {
      setEditingLane(null);

      setLaneDraft("");
    };

    const commitEditLane = async () => {
      if (!editingLane) return;

      const updated: Record<Status, string> = {
        ...laneTitles,
        [editingLane]: laneDraft.trim() || laneTitles[editingLane],
      };

      try {
        await setKanbanLaneTitles({ titles: updated });
      } finally {
        cancelEditLane();
      }
    };

    const handleCreateQuickTaskKanban = async () => {
      const title = kanbanQuickTitle.trim();

      if (!title) return;

      if (!loggedInUser) {
        toast.error("Please sign in to create tasks.");

        return;
      }

      const dueMs = kanbanQuickDue
        ? new Date(kanbanQuickDue).getTime()
        : undefined;

      try {
        await createTask({
          title,

          status: toTaskStatus(kanbanQuickStatus),

          dueDate: dueMs,

          priority: toTaskPriority(kanbanQuickPriority || undefined),
        });

        setKanbanQuickTitle("");

        setKanbanQuickDue("");

        setKanbanQuickPriority("");
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);

        const authError =
          msg.includes("Not authenticated") || msg.includes("User not found");

        toast.error(
          authError
            ? "You're not signed in. Please sign in and try again."
            : `Failed to create task: ${msg}`,
        );
      }
    };

    const addMockTasks = async (preset: "sprint" | "bugbash" | "personal") => {
      if (!loggedInUser) {
        toast.error("Please sign in to add mock tasks.");

        return;
      }

      // Compute start of this week (Mon) to align with backend weekly queries

      const now = new Date();

      const weekStart = new Date(now);

      const day = weekStart.getDay(); // 0=Sun..6=Sat

      const diffToMonday = (day + 6) % 7; // days since Monday

      weekStart.setDate(weekStart.getDate() - diffToMonday);

      weekStart.setHours(0, 0, 0, 0);

      const due = (offsetDays: number, hour: number = 17) => {
        const d = new Date(weekStart);

        d.setDate(d.getDate() + offsetDays);

        d.setHours(hour, 0, 0, 0);

        return d.getTime();
      };

      const plans: Record<
        string,
        Array<{
          title: string;
          status: "todo" | "in_progress" | "done" | "blocked";
          order: number;
          priority?: "low" | "medium" | "high" | "urgent";
          dueDate: number;
        }>
      > = {
        sprint: [
          {
            title: "Sprint Planning",
            status: "todo",
            order: 1,
            priority: "high",
            dueDate: due(1, 11),
          },

          {
            title: "Implement Feature A",
            status: "in_progress",
            order: 2,
            priority: "high",
            dueDate: due(2, 17),
          },

          {
            title: "Code Review",
            status: "in_progress",
            order: 3,
            priority: "medium",
            dueDate: due(3, 16),
          },

          {
            title: "QA Testing",
            status: "todo",
            order: 4,
            priority: "medium",
            dueDate: due(4, 15),
          },

          {
            title: "Sprint Demo",
            status: "todo",
            order: 5,
            priority: "high",
            dueDate: due(5, 15),
          },
        ],

        bugbash: [
          {
            title: "Triage Critical Bugs",
            status: "todo",
            order: 1,
            priority: "urgent",
            dueDate: due(0, 10),
          },

          {
            title: "Fix P0 Login Crash",
            status: "in_progress",
            order: 2,
            priority: "urgent",
            dueDate: due(0, 14),
          },

          {
            title: "Add Regression Tests",
            status: "todo",
            order: 3,
            priority: "high",
            dueDate: due(1, 12),
          },

          {
            title: "Verify Fixes in Staging",
            status: "todo",
            order: 4,
            priority: "high",
            dueDate: due(1, 16),
          },

          {
            title: "Bug Bash Retrospective",
            status: "todo",
            order: 5,
            priority: "medium",
            dueDate: due(2, 11),
          },
        ],

        personal: [
          {
            title: "Morning Workout",
            status: "todo",
            order: 1,
            priority: "medium",
            dueDate: due(1, 7),
          },

          {
            title: "Plan The Week",
            status: "todo",
            order: 2,
            priority: "high",
            dueDate: due(1, 9),
          },

          {
            title: "Grocery Run",
            status: "todo",
            order: 3,
            priority: "low",
            dueDate: due(2, 18),
          },

          {
            title: "Clean Inbox to Zero",
            status: "in_progress",
            order: 4,
            priority: "medium",
            dueDate: due(3, 12),
          },

          {
            title: "Read Industry Article",
            status: "todo",
            order: 5,
            priority: "low",
            dueDate: due(3, 20),
          },
        ],
      };

      const items = plans[preset] ?? [];

      try {
        for (const it of items) {
          await createTask({
            title: it.title,

            status: toTaskStatus(String(it.status)),

            order: it.order,

            priority: toTaskPriority(it.priority),

            dueDate: it.dueDate,
          });
        }

        toast.success("Mock tasks added");
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);

        toast.error(`Failed to add mock tasks: ${msg}`);
      }
    };

    const handleRebalanceAll = async () => {
      try {
        const n = await rebalanceOrders({});

        toast.success(`Rebalanced ${n} tasks`);
      } catch (e: any) {
        toast.error(e?.message ?? "Failed to rebalance");
      }
    };

    const handleRebalanceLane = async (status: Status) => {
      try {
        const n = await rebalanceOrders({ status });

        toast.success(`Rebalanced ${n} tasks in ${status.replace("_", " ")}`);
      } catch (e: any) {
        toast.error(e?.message ?? "Failed to rebalance lane");
      }
    };

    const sortTasks = (arr?: Array<Doc<"tasks">>) =>
      (arr ?? [])

        .slice()

        .sort((a, b) => {
          const ao = a.order ?? Number.POSITIVE_INFINITY;

          const bo = b.order ?? Number.POSITIVE_INFINITY;

          if (ao !== bo) return ao - bo;

          return (a.createdAt ?? 0) - (b.createdAt ?? 0);
        });

    const getItemsByStatus = (status: Status): Array<Doc<"tasks">> => {
      switch (status) {
        case "todo":
          return sortTasks(todoTasks);

        case "in_progress":
          return sortTasks(inProgressTasks);

        case "done":
          return sortTasks(doneTasks);

        case "blocked":
          return sortTasks(blockedTasks);

        default:
          return [];
      }
    };

    const computeNewOrder = (
      destStatus: Status,

      destIndex: number,

      draggedId?: Id<"tasks">,

      sameColumn?: boolean,

      sourceIndex?: number,
    ): number => {
      let items = getItemsByStatus(destStatus);

      if (sameColumn && draggedId) {
        const idx = items.findIndex((it) => it._id === draggedId);

        if (idx !== -1) {
          items = items.filter((_, i) => i !== idx);
        } else if (
          sourceIndex !== undefined &&
          sourceIndex >= 0 &&
          sourceIndex < items.length
        ) {
          items = items
            .slice(0, sourceIndex)
            .concat(items.slice(sourceIndex + 1));
        }
      }

      const before = items[destIndex - 1]?.order;

      const after = items[destIndex]?.order;

      if (before !== undefined && after !== undefined)
        return (before + after) / 2;

      if (before !== undefined) return before + 1;

      if (after !== undefined) return after - 1;

      return 0;
    };

    // Helper to fetch a task by id across all lanes

    const getTaskById = (id: Id<"tasks">): Doc<"tasks"> | null => {
      const all = [
        ...(todoTasks ?? []),

        ...(inProgressTasks ?? []),

        ...(doneTasks ?? []),

        ...(blockedTasks ?? []),
      ];

      return all.find((t) => t._id === id) ?? null;
    };

    // --- dnd-kit Kanban setup ---

    // Use shared kanbanSensors from the outer DocumentsHomeHub scope

    // Track dragging item for overlay

    const [activeKanbanId, setActiveKanbanId] = useState<Id<"tasks"> | null>(
      null,
    );

    // Fast lookup of a task's current status (compute directly; small cost, avoids hook deps warnings)

    const taskIdToStatus = (() => {
      const m = new Map<string, Status>();

      for (const t of todoTasks ?? []) m.set(t._id, "todo");

      for (const t of inProgressTasks ?? []) m.set(t._id, "in_progress");

      for (const t of doneTasks ?? []) m.set(t._id, "done");

      for (const t of blockedTasks ?? []) m.set(t._id, "blocked");

      return m;
    })();

    const handleKanbanDragStart = (e: DragStartEvent) => {
      try {
        document.documentElement.classList.add("dnd-dragging");
      } catch {
        /* no-op */
      }

      setActiveKanbanId(e.active.id as Id<"tasks">);
    };

    const handleKanbanDragEnd = (e: DragEndEvent) => {
      try {
        document.documentElement.classList.remove("dnd-dragging");
      } catch {
        /* no-op */
      }

      const { active, over } = e;

      setActiveKanbanId(null);

      if (!over) return;

      if (!loggedInUser) {
        toast.error("Please sign in to move tasks.");
        return;
      }

      const activeId = active.id as string;

      const overId = over.id as string;

      // Determine source & destination statuses

      const sourceStatus = taskIdToStatus.get(activeId);

      let destStatus: Status | undefined;

      if (isTaskStatus(overId)) {
        destStatus = overId;
      } else {
        destStatus = taskIdToStatus.get(overId);
      }

      if (!sourceStatus || !destStatus) return;

      // Determine destination index within dest lane

      const destItems = getItemsByStatus(destStatus);

      let destIndex = destItems.length; // default to end of list

      if (!isTaskStatus(overId)) {
        const idx = destItems.findIndex((it) => it._id === overId);

        destIndex = idx >= 0 ? idx : destItems.length;
      }

      // Compute source index if intra-lane

      let sourceIndex: number | undefined = undefined;

      if (sourceStatus === destStatus) {
        const srcItems = getItemsByStatus(sourceStatus);

        sourceIndex = srcItems.findIndex((it) => it._id === activeId);
      }

      const newOrder = computeNewOrder(
        destStatus,

        destIndex,

        active.id as Id<"tasks">,

        sourceStatus === destStatus,

        sourceIndex,
      );

      void moveTaskMutation({
        taskId: active.id as Id<"tasks">,
        status: destStatus,
        order: newOrder,
      }).catch((err: any) =>
        toast.error(err?.message ?? "Failed to move task"),
      );
    };

    const handleKanbanDragCancel = () => {
      try {
        document.documentElement.classList.remove("dnd-dragging");
      } catch {
        /* no-op */
      }

      setActiveKanbanId(null);
    };

    // --- end dnd-kit Kanban setup ---

    return (
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-md border border-[var(--border-color)] bg-[var(--bg-primary)] focus-within:ring-2 focus-within:ring-[var(--accent-primary)]">
              <Plus className="h-4 w-4 text-[var(--accent-primary)]" />

              <input
                value={kanbanQuickTitle}
                onChange={(e) => setKanbanQuickTitle(e.target.value)}
                placeholder="Quick task title…"
                className="w-48 bg-transparent outline-none text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)]"
              />
            </div>

            <select
              className="text-xs border border-[var(--border-color)] rounded-md bg-[var(--bg-primary)] px-1.5 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
              value={kanbanQuickStatus}
              onChange={(e) => setKanbanQuickStatus(e.target.value as Status)}
            >
              <option value="todo">Todo</option>

              <option value="in_progress">In Progress</option>

              <option value="done">Done</option>

              <option value="blocked">Blocked</option>
            </select>

            <input
              type="datetime-local"
              value={kanbanQuickDue}
              onChange={(e) => setKanbanQuickDue(e.target.value)}
              className="text-xs border border-[var(--border-color)] rounded-md bg-[var(--bg-primary)] px-1.5 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
              aria-label="Due date"
            />

            <select
              className="text-xs border border-[var(--border-color)] rounded-md bg-[var(--bg-primary)] px-1.5 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
              value={kanbanQuickPriority}
              onChange={(e) => setKanbanQuickPriority(e.target.value)}
            >
              <option value="">Priority</option>

              <option value="low">Low</option>

              <option value="medium">Medium</option>

              <option value="high">High</option>

              <option value="urgent">Urgent</option>
            </select>

            <button
              onClick={() => void handleCreateQuickTaskKanban()}
              className="px-3 py-2 bg-[var(--accent-primary)] text-white rounded-md hover:bg-[var(--accent-primary-hover)] text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
              title="Add task"
              disabled={!loggedInUser}
            >
              Add Task
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-muted)]">Presets:</span>

            <button
              onClick={() => void addMockTasks("sprint")}
              className="px-2 py-1 text-xs border border-[var(--border-color)] rounded-md hover:bg-[var(--bg-hover)]"
              title="Generate sprint task presets"
              disabled={!loggedInUser}
            >
              Sprint Tasks
            </button>

            <button
              onClick={() => void addMockTasks("bugbash")}
              className="px-2 py-1 text-xs border border-[var(--border-color)] rounded-md hover:bg-[var(--bg-hover)]"
              title="Generate bug bash presets"
              disabled={!loggedInUser}
            >
              Bug Bash
            </button>

            <button
              onClick={() => void addMockTasks("personal")}
              className="px-2 py-1 text-xs border border-[var(--border-color)] rounded-md hover:bg-[var(--bg-hover)]"
              title="Generate personal task presets"
              disabled={!loggedInUser}
            >
              Personal
            </button>

            <div className="mx-1 h-5 w-px bg-[var(--border-color)]" />

            <button
              onClick={() => void handleRebalanceAll()}
              className="px-2 py-1 text-xs border border-[var(--border-color)] rounded-md hover:bg-[var(--bg-hover)]"
              title="Re-assign compact, spaced order values across all lanes"
              disabled={!loggedInUser}
            >
              Rebalance All
            </button>
          </div>
        </div>

        <DndContext
          sensors={kanbanSensors}
          onDragStart={handleKanbanDragStart}
          onDragCancel={handleKanbanDragCancel}
          onDragEnd={handleKanbanDragEnd}
          collisionDetection={closestCenter}
          modifiers={[restrictToWindowEdges]}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {(["todo", "in_progress", "done", "blocked"] as Status[]).map(
              (key) => {
                const sorted = getItemsByStatus(key);

                return (
                  <KanbanLane key={key} laneId={key} density={density}>
                    {/* Lane watermark */}

                    <span
                      className={`document-card__bg document-row__bg ${key === "in_progress" ? "text-blue-400" : key === "done" ? "text-emerald-400" : key === "blocked" ? "text-rose-400" : "text-slate-400"}`}
                    >
                      <ListTodo className="h-14 w-14 rotate-12" />
                    </span>

                    {/* Per-lane upload status */}

                    {isUploading && (
                      <div
                        className="mb-2 text-[10px] text-[var(--text-secondary)] inline-flex items-center gap-1"
                        aria-live="polite"
                        aria-atomic="true"
                      >
                        <Loader2 className="h-3 w-3 animate-spin" />

                        <span className="truncate">
                          {uploadProgress || "Uploading..."}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between mb-2">
                      {editingLane === key ? (
                        <input
                          className={`text-sm font-semibold bg-transparent border-b border-[var(--border-color)] focus:outline-none focus:ring-0 ${key === "in_progress" ? "text-blue-700" : key === "done" ? "text-emerald-700" : key === "blocked" ? "text-rose-700" : "text-slate-700"}`}
                          autoFocus
                          value={laneDraft}
                          onChange={(e) => setLaneDraft(e.target.value)}
                          onBlur={() => void commitEditLane()}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              void commitEditLane();
                            }

                            if (e.key === "Escape") {
                              e.preventDefault();
                              cancelEditLane();
                            }
                          }}
                          aria-label="Edit lane title"
                        />
                      ) : (
                        <h3
                          className={`text-sm font-semibold cursor-text ${key === "in_progress" ? "text-blue-700" : key === "done" ? "text-emerald-700" : key === "blocked" ? "text-rose-700" : "text-slate-700"}`}
                          title="Click to rename lane"
                          onClick={() => startEditLane(key)}
                        >
                          {laneTitles[key]}
                        </h3>
                      )}

                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs border ${key === "in_progress" ? "bg-blue-50 border-blue-200 text-blue-700" : key === "done" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : key === "blocked" ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-slate-50 border-slate-200 text-slate-700"}`}
                        >
                          {sorted.length}
                        </span>

                        <button
                          onClick={() => {
                            const d = new Date();

                            d.setHours(0, 0, 0, 0);

                            setInlineCreate({
                              dateMs: d.getTime(),
                              defaultKind: "task",
                            });
                          }}
                          className="px-2 py-0.5 text-xs border border-[var(--border-color)] rounded-md hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]"
                          title="Add task"
                          aria-label="Add task"
                          disabled={!loggedInUser}
                        >
                          + Task
                        </button>

                        <button
                          onClick={() => void handleRebalanceLane(key)}
                          className="px-2 py-0.5 text-xs border border-[var(--border-color)] rounded-md hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]"
                          title="Reassign compact, spaced order values for this lane"
                          aria-label="Rebalance lane"
                          disabled={!loggedInUser}
                        >
                          Rebalance
                        </button>
                      </div>
                    </div>

                    {sorted.length === 0 ? (
                      <div className="text-sm text-[var(--text-secondary)]">
                        No tasks.
                      </div>
                    ) : (
                      <SortableContext
                        items={sorted.map((t) => t._id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="flex flex-col gap-4 pr-1 min-h-[300px]">
                          {sorted.map((t) => (
                            <KanbanSortableItem
                              key={t._id}
                              id={t._id}
                              rowStyle={{}}
                            >
                              {(isDragging) => (
                                <div
                                  className={
                                    isDragging ? "opacity-50" : undefined
                                  }
                                  onMouseUp={(e) => {
                                    setAgendaPopover({
                                      kind: "task",
                                      anchor: e.currentTarget as HTMLElement,
                                      taskId: t._id as Id<"tasks">,
                                    });
                                  }}
                                >
                                  <AgendaMiniRow item={t} kind="task" />
                                </div>
                              )}
                            </KanbanSortableItem>
                          ))}
                        </div>
                      </SortableContext>
                    )}
                  </KanbanLane>
                );
              },
            )}
          </div>

          {/* Drag overlay clone */}

          <DragOverlay dropAnimation={null}>
            {(() => {
              if (!activeKanbanId) return null;

              const activeTask = getTaskById(activeKanbanId);

              if (!activeTask) return null;

              return <AgendaMiniRow item={activeTask} kind="task" />;
            })()}
          </DragOverlay>
        </DndContext>
      </div>
    );
  };

  // Weekly Tasks view: 7-day lanes, drag tasks between days to change dueDate

  // ADD: New MinimalWeeklyItem for Weekly View cards

  // MinimalWeeklyItem replaced by AgendaMiniRow for consistency

  // Weekly day cell as a droppable + sortable list

  const WeeklyDayCell = ({
    date,
    items,
    holidays,
    isToday,
    onAddTask,
  }: {
    date: Date;
    items: any[];
    holidays?: any[];
    isToday: boolean;
    onAddTask: () => void;
  }) => {
    const droppableId = `weekly:${date.getTime()}`;

    const { setNodeRef, isOver } = useDroppable({ id: droppableId });

    const sortableIds = items.map(
      (entry: any) => `${entry.kind}:${entry.item._id}`,
    );

    return (
      <div
        ref={setNodeRef}
        className={`relative group border-b border-r border-gray-200 p-2 min-h-[160px] ${isOver ? "bg-blue-50/40" : ""}`}
      >
        <div className="flex items-center justify-between">
          {isToday ? (
            <div className="inline-flex items-center gap-2">
              <span className="text-xs inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Today
              </span>

              <span className="text-sm font-semibold text-emerald-700">
                {date.getDate()}
              </span>
            </div>
          ) : (
            <span className="text-sm font-medium text-gray-800">
              {date.getDate()}
            </span>
          )}

          <button
            onClick={onAddTask}
            title="Add item"
            className="w-6 h-6 flex items-center justify-center rounded-md bg-gray-100 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 focus:outline-none focus:ring-2 ring-[var(--accent-primary)]"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-2 space-y-1">
          {/* Holidays first */}

          {(holidays ?? []).map((h: any, idx: number) => (
            <div
              key={`w_h_${date.getTime()}_${idx}`}
              onMouseUp={(e) => {
                setAgendaPopover({
                  kind: "createBoth",

                  anchor: e.currentTarget as HTMLElement,

                  // Use the visible day's local midnight, not the holiday's UTC dateMs

                  dateMs: new Date(
                    date.getFullYear(),
                    date.getMonth(),
                    date.getDate(),
                    0,
                    0,
                    0,
                    0,
                  ).getTime(),

                  defaultKind: "event",

                  defaultAllDay: true,

                  defaultTitle: String(h?.name ?? "Holiday"),
                });
              }}
            >
              <AgendaMiniRow
                item={h}
                kind="holiday"
                onSelect={() => {
                  /* handled via anchor above */
                }}
              />
            </div>
          ))}

          <SortableContext
            items={sortableIds}
            strategy={verticalListSortingStrategy}
          >
            {items.map((entry: any) => {
              const sid = `${entry.kind}:${entry.item._id}`;

              return (
                <AgendaSortableItem key={sid} id={sid}>
                  <div
                    className="relative group"
                    onPointerUp={(e) => {
                      try {
                        if (
                          document.documentElement.classList.contains(
                            "dnd-dragging",
                          )
                        )
                          return;
                      } catch {}

                      const container = e.currentTarget as HTMLElement;

                      const anchor =
                        (container.querySelector(
                          "[data-agenda-mini-row]",
                        ) as HTMLElement | null) ?? container;

                      if (entry.kind === "event") {
                        setSelectedEventId(entry.item._id as Id<"events">);

                        setAgendaPopover({
                          kind: "event",
                          anchor,
                          eventId: entry.item._id as Id<"events">,
                          documentIdForAssociation: selectedFrequentDoc ?? null,
                        });
                      } else if (entry.kind === "task") {
                        setAgendaPopover({
                          kind: "task",
                          anchor,
                          taskId: entry.item._id as Id<"tasks">,
                        });
                      }
                    }}
                    onMouseUp={(e) => {
                      const container = e.currentTarget as HTMLElement;

                      const anchor =
                        (container.querySelector(
                          "[data-agenda-mini-row]",
                        ) as HTMLElement | null) ?? container;

                      if (entry.kind === "event") {
                        setSelectedEventId(entry.item._id as Id<"events">);

                        setAgendaPopover({
                          kind: "event",
                          anchor,
                          eventId: entry.item._id as Id<"events">,
                          documentIdForAssociation: selectedFrequentDoc ?? null,
                        });
                      } else if (entry.kind === "task") {
                        setAgendaPopover({
                          kind: "task",
                          anchor,
                          taskId: entry.item._id as Id<"tasks">,
                        });
                      }
                    }}
                    onClick={(e) => {
                      const container = e.currentTarget as HTMLElement;

                      const anchor =
                        (container.querySelector(
                          "[data-agenda-mini-row]",
                        ) as HTMLElement | null) ?? container;

                      if (entry.kind === "event") {
                        setSelectedEventId(entry.item._id as Id<"events">);

                        setAgendaPopover({
                          kind: "event",
                          anchor,
                          eventId: entry.item._id as Id<"events">,
                          documentIdForAssociation: selectedFrequentDoc ?? null,
                        });
                      } else if (entry.kind === "task") {
                        setAgendaPopover({
                          kind: "task",
                          anchor,
                          taskId: entry.item._id as Id<"tasks">,
                        });
                      }
                    }}
                  >
                    <AgendaMiniRow
                      item={entry.item}
                      kind={entry.kind}
                      onSelect={(id) => {
                        if (entry.kind === "event") {
                          // fall back to container onMouseUp for anchor; still set selected id for context

                          setSelectedEventId(id as Id<"events">);
                        }
                      }}
                    />

                    {/* Weekly inline overlays */}

                    <div className="absolute top-1 right-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {entry.kind === "task" ? (
                        <>
                          {/* Favorite */}

                          <button
                            className={`w-5 h-5 rounded border ${entry.item.isFavorite ? "bg-yellow-500 text-yellow-100 border-yellow-500" : "bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)]"}`}
                            title={
                              entry.item.isFavorite ? "Unfavorite" : "Favorite"
                            }
                            aria-label={
                              entry.item.isFavorite ? "Unfavorite" : "Favorite"
                            }
                            onClick={(btnEv) => {
                              btnEv.stopPropagation();
                              void toggleTaskFavoriteAgg({
                                taskId: entry.item._id as Id<"tasks">,
                              });
                            }}
                          >
                            <Star
                              className={`w-3 h-3 mx-auto ${entry.item.isFavorite ? "fill-current" : ""}`}
                            />
                          </button>

                          {/* Open */}

                          <button
                            className="w-5 h-5 rounded bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)]"
                            title="Open"
                            aria-label="Open"
                            onClick={(btnEv) => {
                              btnEv.stopPropagation();
                              const anchor = btnEv.currentTarget as HTMLElement;
                              setAgendaPopover({
                                kind: "task",
                                anchor,
                                taskId: entry.item._id as Id<"tasks">,
                              });
                            }}
                          >
                            <Edit3 className="w-3 h-3 mx-auto" />
                          </button>

                          {/* Delete */}

                          <button
                            className="w-5 h-5 rounded bg-[var(--bg-primary)] hover:bg-red-500 border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-white"
                            title="Delete"
                            aria-label="Delete"
                            onClick={(btnEv) => {
                              btnEv.stopPropagation();
                              if (window.confirm("Delete this task?")) {
                                void deleteTaskMutation({
                                  taskId: entry.item._id as Id<"tasks">,
                                });
                              }
                            }}
                          >
                            <Trash2 className="w-3 h-3 mx-auto" />
                          </button>

                          {/* Convert to event with undo */}

                          <button
                            className="w-5 h-5 rounded bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)]"
                            title="Convert to event"
                            aria-label="Convert to event"
                            onClick={async (btnEv) => {
                              btnEv.stopPropagation();

                              try {
                                const t = entry.item;

                                const title = String(t?.title ?? "Untitled");

                                const description =
                                  typeof t?.description === "string"
                                    ? t.description
                                    : "";

                                const descriptionJson =
                                  typeof t?.descriptionJson === "string"
                                    ? t.descriptionJson
                                    : undefined;

                                const start =
                                  typeof t?.startDate === "number"
                                    ? t.startDate
                                    : typeof t?.dueDate === "number"
                                      ? t.dueDate
                                      : Date.now();

                                const end = start + 60 * 60 * 1000;

                                const colorVal =
                                  typeof t?.color === "string" && t.color.trim()
                                    ? t.color.trim()
                                    : undefined;

                                const docId = t?.documentId as
                                  | Id<"documents">
                                  | undefined;

                                const tagsArr: string[] = Array.isArray(t?.tags)
                                  ? ((t.tags as any[]).filter(
                                      (x) => typeof x === "string",
                                    ) as string[])
                                  : [];

                                const newEventId = await createEventMutation({
                                  title,
                                  description: description || undefined,
                                  descriptionJson,
                                  startTime: start,
                                  endTime: end,
                                  allDay: false,
                                  color: colorVal,
                                  documentId: docId,
                                  tags: tagsArr.length ? tagsArr : undefined,
                                  status: "confirmed",
                                });

                                await deleteTaskMutation({
                                  taskId: t._id as Id<"tasks">,
                                });

                                toast.success("Converted task to event", {
                                  action: {
                                    label: "Undo",

                                    onClick: async () => {
                                      try {
                                        await createTask({
                                          title,

                                          description: description || undefined,

                                          descriptionJson,

                                          dueDate:
                                            typeof t?.dueDate === "number"
                                              ? t.dueDate
                                              : undefined,

                                          startDate:
                                            typeof t?.startDate === "number"
                                              ? t.startDate
                                              : undefined,

                                          documentId: docId,

                                          tags: tagsArr.length
                                            ? tagsArr
                                            : undefined,

                                          color: colorVal,

                                          status:
                                            (t?.status as any) || undefined,

                                          priority:
                                            (t?.priority as any) || undefined,
                                        });

                                        await deleteEventMutation({
                                          eventId: newEventId as Id<"events">,
                                        });
                                      } catch {}
                                    },
                                  },
                                });
                              } catch (err: any) {
                                toast.error(
                                  err?.message ?? "Failed to convert task",
                                );
                              }
                            }}
                          >
                            <ArrowRightLeft className="w-3 h-3 mx-auto" />
                          </button>
                        </>
                      ) : (
                        <>
                          {/* Open */}

                          <button
                            className="w-5 h-5 rounded bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)]"
                            title="Open"
                            aria-label="Open"
                            onClick={(evBtn) => {
                              evBtn.stopPropagation();
                              setSelectedEventId(
                                entry.item._id as Id<"events">,
                              );
                              setAgendaPopover({
                                kind: "event",
                                anchor: evBtn.currentTarget as HTMLElement,
                                eventId: entry.item._id as Id<"events">,
                                documentIdForAssociation:
                                  selectedFrequentDoc ?? null,
                              });
                            }}
                          >
                            <Edit3 className="w-3 h-3 mx-auto" />
                          </button>

                          {/* Delete */}

                          <button
                            className="w-5 h-5 rounded bg-[var(--bg-primary)] hover:bg-red-500 border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-white"
                            title="Delete"
                            aria-label="Delete"
                            onClick={(evBtn) => {
                              evBtn.stopPropagation();
                              if (window.confirm("Delete this event?")) {
                                void deleteEventMutation({
                                  eventId: entry.item._id as Id<"events">,
                                });
                              }
                            }}
                          >
                            <Trash2 className="w-3 h-3 mx-auto" />
                          </button>

                          {/* Convert to task with undo */}

                          <button
                            className="w-5 h-5 rounded bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)]"
                            title="Convert to task"
                            aria-label="Convert to task"
                            onClick={async (evBtn) => {
                              evBtn.stopPropagation();

                              try {
                                const ev = entry.item;

                                const title = String(ev?.title ?? "Untitled");

                                const baseDesc =
                                  typeof ev?.description === "string"
                                    ? ev.description
                                    : "";

                                const hasAllDay = !!ev?.allDay;

                                const sMs =
                                  typeof ev?.startTime === "number"
                                    ? ev.startTime
                                    : undefined;

                                const eMs =
                                  typeof ev?.endTime === "number"
                                    ? ev.endTime
                                    : sMs;

                                const parts: string[] = [];

                                if (typeof sMs === "number") {
                                  const s = new Date(sMs);

                                  const e = new Date(
                                    typeof eMs === "number" ? eMs : sMs,
                                  );

                                  if (hasAllDay) {
                                    parts.push(
                                      `Event time: ${s.toLocaleDateString()}`,
                                    );
                                  } else {
                                    const sd = s.toLocaleDateString();

                                    const st = s.toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    });

                                    const et = e.toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    });

                                    parts.push(
                                      `Event time: ${sd} ${st} - ${et}`,
                                    );
                                  }
                                }

                                if (
                                  typeof ev?.location === "string" &&
                                  ev.location.trim()
                                ) {
                                  parts.push(`Location: ${ev.location.trim()}`);
                                }

                                const metaBlock = parts.length
                                  ? `\n\n---\n${parts.join("\n")}`
                                  : "";

                                const description =
                                  `${baseDesc}${metaBlock}`.trim();

                                const descriptionJson =
                                  typeof ev?.descriptionJson === "string"
                                    ? ev.descriptionJson
                                    : undefined;

                                const due =
                                  typeof ev?.startTime === "number"
                                    ? ev.startTime
                                    : undefined;

                                const docId = ev?.documentId as
                                  | Id<"documents">
                                  | undefined;

                                const tagsArr: string[] = Array.isArray(
                                  ev?.tags,
                                )
                                  ? ((ev.tags as any[]).filter(
                                      (x) => typeof x === "string",
                                    ) as string[])
                                  : [];

                                const colorVal =
                                  typeof ev?.color === "string" &&
                                  ev.color.trim()
                                    ? ev.color.trim()
                                    : undefined;

                                const newTaskId = await createTask({
                                  title,

                                  description: description || undefined,

                                  descriptionJson,

                                  dueDate: due,

                                  documentId: docId,

                                  refs: [
                                    {
                                      kind: "event",
                                      id: ev._id as Id<"events">,
                                    },
                                  ],

                                  tags: tagsArr.length ? tagsArr : undefined,

                                  color: colorVal,
                                });

                                await deleteEventMutation({
                                  eventId: ev._id as Id<"events">,
                                });

                                toast.success("Converted event to task", {
                                  action: {
                                    label: "Undo",

                                    onClick: async () => {
                                      try {
                                        await createEventMutation({
                                          title: String(
                                            ev?.title ?? "Untitled",
                                          ),

                                          description:
                                            typeof ev?.description === "string"
                                              ? ev.description
                                              : undefined,

                                          descriptionJson:
                                            typeof ev?.descriptionJson ===
                                            "string"
                                              ? ev.descriptionJson
                                              : undefined,

                                          startTime: Number(
                                            ev?.startTime ?? Date.now(),
                                          ),

                                          endTime:
                                            typeof ev?.endTime === "number"
                                              ? ev.endTime
                                              : undefined,

                                          allDay: !!ev?.allDay,

                                          location:
                                            typeof ev?.location === "string"
                                              ? ev.location
                                              : undefined,

                                          status:
                                            (ev?.status as any) || "confirmed",

                                          color: colorVal,

                                          documentId: docId,

                                          tags: tagsArr.length
                                            ? tagsArr
                                            : undefined,
                                        });

                                        await deleteTaskMutation({
                                          taskId: newTaskId as Id<"tasks">,
                                        });
                                      } catch {}
                                    },
                                  },
                                });
                              } catch (err: any) {
                                toast.error(
                                  err?.message ?? "Failed to convert event",
                                );
                              }
                            }}
                          >
                            <ArrowRightLeft className="w-3 h-3 mx-auto" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </AgendaSortableItem>
              );
            })}
          </SortableContext>
        </div>
      </div>
    );
  };

  // REPLACE: WeeklyView with a modern minimal grid-based layout

  const WeeklyView = () => {
    const offsetMs = tzOffsetMinutes * 60 * 1000;

    // Compute today's start using the same internal convention (UTC ms minus offsetMs)

    const _todayLocal = new Date(Date.now() + offsetMs);

    _todayLocal.setUTCHours(0, 0, 0, 0);

    const todayTimestamp = _todayLocal.getTime() - offsetMs;

    const { dayStarts } = useMemo(() => {
      // Anchor to the currently selected agenda day/week

      const localAnchor = new Date(agendaStartUtc + offsetMs);

      localAnchor.setUTCHours(0, 0, 0, 0);

      const day = localAnchor.getUTCDay();

      const diffToMonday = (day + 6) % 7;

      const monday = new Date(
        localAnchor.getTime() - diffToMonday * 24 * 60 * 60 * 1000,
      );

      monday.setUTCHours(0, 0, 0, 0);

      const starts = Array.from(
        { length: 7 },
        (_, i) => monday.getTime() - offsetMs + i * 24 * 60 * 60 * 1000,
      );

      return { dayStarts: starts };
    }, [agendaStartUtc, offsetMs]);

    // Compute the anchored week [start, end] range in the internal convention

    const weekRange = useMemo(() => {
      if (!dayStarts || dayStarts.length === 0) return null;

      const start = dayStarts[0];

      const end = dayStarts[6] + (24 * 60 * 60 * 1000 - 1);

      return { start, end };
    }, [dayStarts]);

    // Build an absolute UTC range for holidays (table stores 00:00Z per date).

    // This avoids off-by-one spillovers at week edges.

    const weekUtcRange = useMemo(() => {
      if (!dayStarts || dayStarts.length === 0) return null;

      const startUtc = dayStarts[0] + offsetMs; // UTC midnight of Monday (local)

      const endUtc = dayStarts[6] + offsetMs + (24 * 60 * 60 * 1000 - 1); // end of Sunday (local)

      return { startUtc, endUtc };
    }, [dayStarts, offsetMs]);

    // Canonical aggregated query for the anchored week

    const agendaWeekRaw = useQuery(
      api.calendar.listAgendaInRange as any,

      loggedInUser && weekRange && weekUtcRange
        ? {
            start: weekRange.start,

            end: weekRange.end,

            country: "US",

            holidaysStartUtc: weekUtcRange.startUtc,

            holidaysEndUtc: weekUtcRange.endUtc,
          }
        : "skip",
    );

    const tasksWeekAnchored = useMemo(
      () => agendaWeekRaw?.tasks ?? [],
      [agendaWeekRaw],
    );

    const eventsWeekAnchored = useMemo(
      () => agendaWeekRaw?.events ?? [],
      [agendaWeekRaw],
    );

    const holidaysAnchored = useMemo(
      () => agendaWeekRaw?.holidays ?? [],
      [agendaWeekRaw],
    );

    // eslint-disable-next-line react-hooks/exhaustive-deps

    const allWeekItems = useMemo(() => {
      const tasks = (tasksWeekAnchored ?? []).map((t) => ({
        kind: "task",
        item: t,
        time: t.dueDate ?? 0,
      }));

      const events = (eventsWeekAnchored ?? []).map((e) => ({
        kind: "event",
        item: e,
        time: e.startTime ?? 0,
      }));

      return [...tasks, ...events];
    }, [tasksWeekAnchored, eventsWeekAnchored]);

    const byDay = useMemo(() => {
      const map = new Map<number, any[]>();

      for (const start of dayStarts) map.set(start, []);

      for (const entry of allWeekItems) {
        if (entry.time === 0) continue;

        const local = entry.time + offsetMs;

        const d = new Date(local);

        d.setUTCHours(0, 0, 0, 0);

        const bucket = d.getTime() - offsetMs;

        if (map.has(bucket)) map.get(bucket)!.push(entry);
      }

      for (const start of dayStarts) {
        map.get(start)!.sort((a: any, b: any) => a.time - b.time);
      }

      return map;
    }, [allWeekItems, dayStarts, offsetMs]);

    const holidaysByDayStart = useMemo(() => {
      const map = new Map<number, any[]>();

      if (!dayStarts || dayStarts.length === 0) return map;

      for (const start of dayStarts) map.set(start, []);

      // Precompute a lookup from local dayStarts to their YYYY-MM-DD keys

      const startKeyLookup = new Map<string, number>();

      for (const start of dayStarts) {
        const key = new Date(start + offsetMs).toISOString().slice(0, 10);

        startKeyLookup.set(key, start);
      }

      for (const h of holidaysAnchored ?? []) {
        const key = String((h as any).dateKey);

        const bucketStart = startKeyLookup.get(key);

        if (bucketStart !== undefined) {
          map.get(bucketStart)!.push(h);
        }
      }

      return map;
    }, [holidaysAnchored, dayStarts, offsetMs]);

    const handleAddTaskForDay = (dateMs: number) => {
      const d = new Date(dateMs);

      const y = d.getFullYear();

      const m = String(d.getMonth() + 1).padStart(2, "0");

      const day = String(d.getDate()).padStart(2, "0");

      setNewTaskModalDue(`${y}-${m}-${day}`);

      setShowNewTaskModal(true);
    };

    // Navigation handled by the global header; no local navigator here.

    // Track active item for drag overlay

    const [activeWeeklyItem, setActiveWeeklyItem] = useState<{
      kind: "task" | "event";
      item: any;
    } | null>(null);

    // Helpers to find item/day by sortable id

    const findItemBySortableId = (
      sid: string,
    ): { kind: "task" | "event"; item: any; dayStart: number } | null => {
      for (const start of dayStarts) {
        const arr = byDay.get(start) ?? [];

        for (const entry of arr) {
          const cur = `${entry.kind}:${entry.item._id}`;

          if (cur === sid)
            return { kind: entry.kind, item: entry.item, dayStart: start };
        }
      }

      return null;
    };

    const handleWeeklyDragStart = (e: DragStartEvent) => {
      try {
        document.documentElement.classList.add("dnd-dragging");
      } catch {
        /* no-op */
      }

      const id = String(e.active.id);

      const found = findItemBySortableId(id);

      setActiveWeeklyItem(
        found ? { kind: found.kind, item: found.item } : null,
      );
    };

    const handleWeeklyDragCancel = () => {
      try {
        document.documentElement.classList.remove("dnd-dragging");
      } catch {
        /* no-op */
      }

      setActiveWeeklyItem(null);
    };

    const handleWeeklyDragEnd = async (e: DragEndEvent) => {
      handleWeeklyDragCancel();

      const activeId = String(e.active.id);

      const overId = e.over?.id ? String(e.over.id) : null;

      if (!overId) return;

      // Determine target day: either a droppable cell id weekly:<ms> or infer from hovered item

      let targetDay: number | null = null;

      if (overId.startsWith("weekly:")) {
        targetDay = Number(overId.slice("weekly:".length));
      } else if (overId.startsWith("task:") || overId.startsWith("event:")) {
        const found = findItemBySortableId(overId);

        targetDay = found ? found.dayStart : null;
      }

      if (targetDay == null) return;

      const src = findItemBySortableId(activeId);

      if (!src) return;

      try {
        if (src.kind === "task") {
          const prevDue: number | null =
            typeof src.item.dueDate === "number" ? src.item.dueDate : null;

          await updateTask({
            taskId: src.item._id as Id<"tasks">,
            dueDate: targetDay,
          });

          toast.success("Task rescheduled", {
            description: new Date(targetDay).toLocaleDateString(),

            action: {
              label: "Undo",

              onClick: async () => {
                await updateTask({
                  taskId: src.item._id as Id<"tasks">,
                  dueDate: prevDue ?? undefined,
                });
              },
            },
          });
        } else {
          const prevStart: number = Number(src.item.startTime ?? targetDay);

          const prevEnd: number = Number(
            src.item.endTime ?? src.item.startTime ?? targetDay,
          );

          const duration = Math.max(0, prevEnd - prevStart);

          // Preserve hour-of-day: compute local day start for prevStart using offsetMs

          const localPrev = prevStart + offsetMs;

          const d0 = new Date(localPrev);

          d0.setUTCHours(0, 0, 0, 0);

          const prevDayStartInternal = d0.getTime() - offsetMs;

          const offsetInDay = prevStart - prevDayStartInternal;

          const newStart = targetDay + offsetInDay;

          const newEnd = newStart + duration;

          await updateEventMutation({
            eventId: src.item._id as Id<"events">,
            startTime: newStart,
            endTime: newEnd,
          });

          toast.success("Event moved", {
            description: `${new Date(newStart).toLocaleDateString()} ${new Date(newStart).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,

            action: {
              label: "Undo",

              onClick: async () => {
                await updateEventMutation({
                  eventId: src.item._id as Id<"events">,
                  startTime: prevStart,
                  endTime: prevEnd,
                });
              },
            },
          });
        }
      } catch (err) {
        console.error("Weekly move failed", err);

        toast.error("Failed to move item");
      }
    };

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <DndContext
          sensors={kanbanSensors}
          onDragStart={handleWeeklyDragStart}
          onDragCancel={handleWeeklyDragCancel}
          onDragEnd={handleWeeklyDragEnd}
          collisionDetection={closestCenter}
          modifiers={[restrictToWindowEdges]}
        >
          <div className="grid grid-cols-7 border-t border-l border-gray-200">
            {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((day) => (
              <div
                key={day}
                className="text-center font-semibold text-xs text-gray-500 py-2 border-b border-r border-gray-200 bg-gray-50"
              >
                {day}
              </div>
            ))}

            {dayStarts.map((start) => {
              const date = new Date(start);

              const items = byDay.get(start) ?? [];

              const holidays = holidaysByDayStart.get(start) ?? [];

              return (
                <WeeklyDayCell
                  key={start}
                  date={date}
                  items={items}
                  holidays={holidays}
                  isToday={start === todayTimestamp}
                  onAddTask={() => handleAddTaskForDay(start)}
                />
              );
            })}
          </div>

          <DragOverlay>
            {activeWeeklyItem ? (
              <AgendaMiniRow
                item={activeWeeklyItem.item}
                kind={activeWeeklyItem.kind}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    );
  };

  // CalendarCard removed (unused in new layout)

  // Minimal dashboard data prep

  // Notes scheduled on the selected agenda day

  const notesTodayRaw = useQuery(
    api.documents.listNotesInRange as any,

    loggedInUser
      ? { start: agendaStartUtc, end: agendaStartUtc + 24 * 60 * 60 * 1000 - 1 }
      : "skip",
  );

  const notesTodayList = useMemo(() => notesTodayRaw ?? [], [notesTodayRaw]);

  const tasksTodayList = useMemo(() => tasksToday ?? [], [tasksToday]);

  const eventsTodayList = useMemo(() => eventsToday ?? [], [eventsToday]);

  const tasksWeekList = useMemo(() => tasksThisWeek ?? [], [tasksThisWeek]);

  const eventsWeekList = useMemo(() => eventsThisWeek ?? [], [eventsThisWeek]);

  // Memoize pills for upcoming tasks to avoid recomputation on re-renders

  // Local UI-only ordering for Agenda (list) and Upcoming lists

  const [agendaListOrder, setAgendaListOrder] = useState<string[] | null>(null);

  const [upcomingListOrder, setUpcomingListOrder] = useState<string[] | null>(
    null,
  );

  const keyOfAgendaEntry = useCallback((entry: AgendaEntry) => {
    const baseId = entry.item?._id ?? "";

    return `${entry.kind}_${baseId}`;
  }, []);

  // Initialize list orders from server (if logged in) or localStorage (if logged out)

  useEffect(() => {
    if (loggedInUser) {
      if (!listOrders) return;

      if (Array.isArray(listOrders.agendaListOrder)) {
        setAgendaListOrder(listOrders.agendaListOrder);
      }

      if (Array.isArray(listOrders.upcomingListOrder)) {
        setUpcomingListOrder(listOrders.upcomingListOrder);
      }
    } else {
      try {
        const a =
          typeof window !== "undefined"
            ? localStorage.getItem("nodebench:agendaListOrder")
            : null;

        const u =
          typeof window !== "undefined"
            ? localStorage.getItem("nodebench:upcomingListOrder")
            : null;

        if (a) setAgendaListOrder(JSON.parse(a));

        if (u) setUpcomingListOrder(JSON.parse(u));
      } catch {
        // no-op
      }
    }
  }, [loggedInUser, listOrders]);

  const weekPillsById = useMemo(() => {
    const map: Record<string, { title: string; pills: any[] }> = {};

    for (const t of tasksWeekList) {
      const s = shapeTaskForPills(t);

      const { title, dueAt, project, link, updatedAt, priority, details } = s;

      map[t._id] = {
        title: title ?? t.title,

        pills: reorderTaskPillsForTightRows(
          taskToPills({
            title,
            dueAt,
            project,
            link,
            updatedAt,
            priority,
            details,
          }),
        ),
      };
    }

    return map;
  }, [tasksWeekList]);

  type AgendaEntry = {
    kind: "task" | "event" | "note";
    time: number;
    item: any;
  };

  const toAgendaItem = (
    item: any,
    kind: "task" | "event" | "note",
  ): AgendaEntry => ({
    kind,

    time:
      kind === "event"
        ? (item.startTime as number)
        : kind === "task"
          ? ((item.dueDate as number | undefined) ?? Number.POSITIVE_INFINITY)
          : ((item.agendaDate as number | undefined) ??
            (item._creationTime as number | undefined) ??
            0),

    item,
  });

  const todayAgenda: AgendaEntry[] = [
    ...eventsTodayList.map((e: any) => toAgendaItem(e, "event")),

    ...tasksTodayList.map((t: any) => toAgendaItem(t, "task")),

    ...notesTodayList.map((n: any) => toAgendaItem(n, "note")),
  ].sort((a, b) => a.time - b.time);

  // Display list for Today's Agenda, honoring any UI reordering

  const todayAgendaDisplay: AgendaEntry[] = useMemo(() => {
    if (!agendaListOrder) return todayAgenda;

    const entryByKey = new Map<string, AgendaEntry>(
      todayAgenda.map((e) => [keyOfAgendaEntry(e), e]),
    );

    const ordered: AgendaEntry[] = [];

    for (const k of agendaListOrder) {
      const v = entryByKey.get(k);

      if (v) {
        ordered.push(v);

        entryByKey.delete(k);
      }
    }

    // Append any new items not in the stored order at the end by time

    if (entryByKey.size > 0) {
      const rest = Array.from(entryByKey.values()).sort(
        (a, b) => a.time - b.time,
      );

      ordered.push(...rest);
    }

    return ordered;
  }, [todayAgenda, agendaListOrder, keyOfAgendaEntry]);

  // Exclude tasks that are already part of "Today" from the Upcoming list to avoid duplicates across sections

  const todayTaskIds = new Set((tasksTodayList ?? []).map((t: any) => t._id));

  const upcomingWeek: AgendaEntry[] = [
    ...eventsWeekList.map((e: any) => toAgendaItem(e, "event")),

    ...tasksWeekList

      .filter((t: any) => !todayTaskIds.has(t._id))

      .map((t: any) => toAgendaItem(t, "task")),
  ].sort((a, b) => a.time - b.time);

  // Display list for Upcoming (sidebar), honoring any UI reordering

  const upcomingWeekDisplay: AgendaEntry[] = useMemo(() => {
    if (!upcomingListOrder) return upcomingWeek;

    const entryByKey = new Map<string, AgendaEntry>(
      upcomingWeek.map((e) => [keyOfAgendaEntry(e), e]),
    );

    const ordered: AgendaEntry[] = [];

    for (const k of upcomingListOrder) {
      const v = entryByKey.get(k);

      if (v) {
        ordered.push(v);

        entryByKey.delete(k);
      }
    }

    if (entryByKey.size > 0) {
      const rest = Array.from(entryByKey.values()).sort(
        (a, b) => a.time - b.time,
      );

      ordered.push(...rest);
    }

    return ordered;
  }, [upcomingWeek, upcomingListOrder, keyOfAgendaEntry]);

  // Right dock now uses MiniMonthCalendar; no separate weekly strip helpers needed

  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      <div className="h-full w-full bg-[var(--bg-primary)] overflow-y-auto relative">
        {/* Removed metallic overlay for cleaner look */}

        {/* Minimal two-column dashboard with floating docks */}

        <div className="flex-1 p-8 relative z-10">
          <div className="dashboard-container max-w-7xl mx-auto flex gap-8">
            {/* Main column */}

            <div className="flex-1 min-w-0 space-y-6">
              {/* Floating main dock: simplified nav + header + AI bar */}

              <div id="floating-main-dock" className="">
                <TopDividerBar
                  left={
                    <UnifiedHubPills active="documents" showRoadmap roadmapDisabled={false} />
                  }
                />

                <PageHeroHeader
                  icon={"📄"}
                  title={"Documents Hub"}
                  date={todayLabel}
                  subtitle={
                    "Your productivity command center. Track tasks, plan your week, and stay organized."
                  }
                  presets={
                    <>
                      <span className="text-xs text-gray-500 mr-2">
                        Presets:
                      </span>

                      <PresetChip>Sprint Week</PresetChip>

                      <PresetChip>Meetings Day</PresetChip>

                      <PresetChip>Personal</PresetChip>
                    </>
                  }
                />

                {/* Moved Filters/Tools into Documents & Files section below */}

                <div className="mt-4 flex items-center gap-2 p-2 border border-[var(--border-color)] rounded-xl shadow-sm bg-[var(--bg-primary)]">
                  <input
                    placeholder="Ask AI to plan your week, find documents, etc..."
                    className="flex-grow bg-transparent outline-none text-base px-2 text-[var(--text-primary)] placeholder-[var(--text-secondary)]"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                  />

                  <button
                    className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-[#007AFF] hover:bg-[#0056b3] text-white rounded-lg"
                    title="Send"
                    onClick={handleSend}
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>

                {/* Compact document filters moved to the Tools/Filters bar */}
              </div>

              {/* Collapsible Tools section removed in favor of always-visible tools row */}

              {/* Agenda */}

              <section aria-label="Agenda">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <h2 className={sectionHeader}>Agenda</h2>

                    <span
                      className="inline-flex items-center gap-1 px-1.5 py-0 rounded-full border text-[10px] bg-amber-50 text-amber-700 border-amber-200"
                      title="Drag to reorder. Use Kanban to organize by status."
                      aria-label="Agenda tips"
                    >
                      <Lightbulb className="h-3 w-3 text-amber-500" />
                      Tips
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div
                      className="flex gap-1 bg-gray-100 p-1 rounded-lg"
                      role="tablist"
                      aria-label="Agenda view mode"
                    >
                      <button
                        onClick={() => onChangeAgendaMode("list")}
                        className={`px-3 py-1 text-xs font-semibold rounded-md ${agendaMode === "list" ? "text-gray-800 bg-white shadow" : "text-gray-500 hover:bg-white/50"}`}
                        role="tab"
                        aria-selected={agendaMode === "list"}
                        aria-controls="agenda-panel-list"
                        id="agenda-tab-list"
                      >
                        List
                      </button>

                      <button
                        onClick={() => onChangeAgendaMode("kanban")}
                        className={`px-3 py-1 text-xs font-semibold rounded-md ${agendaMode === "kanban" ? "text-gray-800 bg-white shadow" : "text-gray-500 hover:bg-white/50"}`}
                        role="tab"
                        aria-selected={agendaMode === "kanban"}
                        aria-controls="agenda-panel-kanban"
                        id="agenda-tab-kanban"
                      >
                        Kanban
                      </button>

                      <button
                        onClick={() => onChangeAgendaMode("weekly")}
                        className={`px-3 py-1 text-xs font-semibold rounded-md ${agendaMode === "weekly" ? "text-gray-800 bg-white shadow" : "text-gray-500 hover:bg-white/50"}`}
                        role="tab"
                        aria-selected={agendaMode === "weekly"}
                        aria-controls="agenda-panel-weekly"
                        id="agenda-tab-weekly"
                      >
                        Weekly
                      </button>

                      <button
                        onClick={() => onChangeAgendaMode("mini")}
                        className={`px-3 py-1 text-xs font-semibold rounded-md ${agendaMode === "mini" ? "text-gray-800 bg-white shadow" : "text-gray-500 hover:bg-white/50"}`}
                        role="tab"
                        aria-selected={agendaMode === "mini"}
                        aria-controls="agenda-panel-mini"
                        id="agenda-tab-mini"
                      >
                        Mini
                      </button>
                    </div>
                  </div>

                  {/* Removed standalone Create… button to unify with quick add row */}
                </div>

                {/* Day/Week navigator row (just under divider, consistent across views) */}

                <div className="flex items-center gap-2 mb-2">
                  <button
                    className="w-7 h-7 rounded-md flex items-center justify-center bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)]"
                    onClick={onPrevAgenda}
                    aria-label="Previous"
                    title={
                      agendaScope === "week"
                        ? "Previous week (←)"
                        : "Previous day (←)"
                    }
                  >
                    <ChevronLeft className="w-4 h-4 text-[var(--text-secondary)]" />
                  </button>

                  <button
                    className="text-xs px-2 py-1 rounded-md border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)]"
                    onClick={onAgendaToday}
                    aria-label="Go to today"
                    title="Go to today"
                  >
                    Today
                  </button>

                  <div
                    className="flex items-center bg-gray-100 rounded-md p-1"
                    role="tablist"
                    aria-label="Agenda scope"
                  >
                    <button
                      type="button"
                      onClick={() => onSetAgendaScope("day")}
                      className={`px-2 py-1 text-[11px] rounded ${agendaScope === "day" ? "bg-white shadow text-gray-800" : "text-gray-600 hover:bg-white/50"}`}
                      aria-pressed={agendaScope === "day"}
                    >
                      Day
                    </button>

                    <button
                      type="button"
                      onClick={() => onSetAgendaScope("week")}
                      className={`px-2 py-1 text-[11px] rounded ${agendaScope === "week" ? "bg-white shadow text-gray-800" : "text-gray-600 hover:bg-white/50"}`}
                      aria-pressed={agendaScope === "week"}
                    >
                      Week
                    </button>
                  </div>

                  <div className="relative" ref={agendaWeekPickerAnchorRef}>
                    <button
                      className="text-xs text-[var(--text-secondary)] font-medium hover:text-[var(--text-primary)] underline-offset-2 hover:underline"
                      onClick={() => setShowAgendaWeekPicker((v) => !v)}
                      aria-haspopup="dialog"
                      aria-expanded={showAgendaWeekPicker}
                    >
                      {agendaRangeLabel}
                    </button>

                    {showAgendaWeekPicker && (
                      <div
                        className="absolute z-40 top-full left-0 mt-2"
                        onMouseDown={(e) => e.stopPropagation()}
                        ref={agendaWeekPickerPanelRef}
                      >
                        <MiniMonthCalendar
                          onSelectDate={(dateMs) => {
                            if (agendaScope === "week") {
                              const wStart = startOfWeekMs(dateMs);

                              applyAgendaCanonical(wStart);
                            } else {
                              applyAgendaCanonical(dateMs);
                            }

                            setShowAgendaWeekPicker(false);
                          }}
                        />
                      </div>
                    )}
                  </div>

                  <button
                    className="w-7 h-7 rounded-md flex items-center justify-center bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)]"
                    onClick={onNextAgenda}
                    aria-label="Next"
                    title={
                      agendaScope === "week" ? "Next week (→)" : "Next day (→)"
                    }
                  >
                    <ChevronRight className="w-4 h-4 text-[var(--text-secondary)]" />
                  </button>
                </div>

                {/* Mini panel: shown immediately after the toggle when selected */}

                {agendaMode === "mini" && (
                  <div
                    role="tabpanel"
                    id="agenda-panel-mini"
                    aria-labelledby="agenda-tab-mini"
                    className="space-y-1"
                  >
                    {/* Quick add task (mini view) */}

                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        value={quickAgendaText}
                        onChange={(e) => setQuickAgendaText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();

                            void handleQuickAgendaCreate();
                          }
                        }}
                        placeholder={(() => {
                          const isToday = agendaStartUtc === todayStartUtc;

                          const d = new Date(agendaStartUtc + offsetMs);

                          const pretty = d.toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          });

                          const suffix = isToday ? "today" : pretty;

                          return `Quick add task for ${suffix}…`;
                        })()}
                        className="flex-1 text-sm bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md p-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
                      />

                      <button
                        onClick={() => {
                          void handleQuickAgendaCreate();
                        }}
                        disabled={!loggedInUser || !quickAgendaText.trim()}
                        className={`text-[11px] px-2.5 py-1 rounded-md border ${!loggedInUser || !quickAgendaText.trim() ? "bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border-color)] cursor-not-allowed" : "bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary-hover)] border-transparent"}`}
                        title={
                          !loggedInUser
                            ? "Please sign in to create items"
                            : undefined
                        }
                      >
                        Add
                      </button>
                    </div>

                    {/* Mini view content: group by day when agendaScope === 'week', otherwise show selected day with header */}

                    {agendaScope === "day" ? (
                      <>
                        <div className="px-2 py-1 text-sm font-semibold text-[var(--text-primary)] bg-[var(--bg-secondary)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--bg-secondary)]/80 border-b border-[var(--border-color)]">
                          {(() => {
                            const d = new Date(agendaStartUtc + offsetMs);

                            const wd = d.toLocaleDateString(undefined, {
                              weekday: "long",
                            });

                            const shortDate = d.toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            });

                            return `${wd} (${shortDate})`;
                          })()}
                        </div>

                        {/* Holidays for the selected day */}

                        {holidaysToday.map((h: any, idx: number) => (
                          <div
                            key={`mini_h_${idx}`}
                            onMouseUp={(e) => {
                              setAgendaPopover({
                                kind: "createBoth",

                                anchor: e.currentTarget as HTMLElement,

                                dateMs: agendaStartUtc,

                                defaultKind: "event",

                                defaultAllDay: true,

                                defaultTitle: String(h?.name ?? "Holiday"),
                              });
                            }}
                          >
                            <AgendaMiniRow item={h} kind="holiday" />
                          </div>
                        ))}

                        {/* Events then tasks in chronological order */}

                        {todayAgendaDisplay.length === 0 &&
                        holidaysToday.length === 0 ? (
                          <div className="text-sm text-[var(--text-secondary)]">
                            Nothing scheduled.
                          </div>
                        ) : (
                          todayAgendaDisplay.map((entry) => (
                            <div
                              key={keyOfAgendaEntry(entry)}
                              className="relative group"
                              onMouseUp={(e) => {
                                const anchor =
                                  (e.currentTarget.querySelector(
                                    "[data-agenda-mini-row]",
                                  ) as HTMLElement | null) ??
                                  (e.currentTarget as HTMLElement);

                                if (entry.kind === "event") {
                                  setSelectedEventId(
                                    entry.item._id as Id<"events">,
                                  );

                                  setAgendaPopover({
                                    kind: "event",
                                    anchor,
                                    eventId: entry.item._id as Id<"events">,
                                    documentIdForAssociation:
                                      selectedFrequentDoc ?? null,
                                  });
                                } else if (entry.kind === "task") {
                                  setAgendaPopover({
                                    kind: "task",
                                    anchor,
                                    taskId: entry.item._id as Id<"tasks">,
                                  });
                                } else if (entry.kind === "note") {
                                  openMiniEditor(
                                    (entry.item as any)._id as Id<"documents">,
                                    anchor,
                                  );
                                }
                              }}
                            >
                              <AgendaMiniRow
                                item={entry.item}
                                kind={entry.kind}
                                showCheckbox={entry.kind === "task"}
                                onToggleComplete={(id, completed) => {
                                  if (entry.kind === "task") {
                                    void updateTask({
                                      taskId: id as Id<"tasks">,
                                      status: completed ? "done" : "todo",
                                    });
                                  }
                                }}
                              />

                              <div className="absolute top-1 right-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {entry.kind === "task" ? (
                                  <>
                                    <button
                                      className={`w-5 h-5 rounded border ${entry.item.isFavorite ? "bg-yellow-500 text-yellow-100 border-yellow-500" : "bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)]"}`}
                                      title={
                                        entry.item.isFavorite
                                          ? "Unfavorite"
                                          : "Favorite"
                                      }
                                      aria-label={
                                        entry.item.isFavorite
                                          ? "Unfavorite"
                                          : "Favorite"
                                      }
                                      onClick={(btnEv) => {
                                        btnEv.stopPropagation();
                                        void toggleTaskFavoriteAgg({
                                          taskId: entry.item._id as Id<"tasks">,
                                        });
                                      }}
                                    >
                                      <Star
                                        className={`w-3 h-3 mx-auto ${entry.item.isFavorite ? "fill-current" : ""}`}
                                      />
                                    </button>

                                    <button
                                      className="w-5 h-5 rounded bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)]"
                                      title="Open"
                                      aria-label="Open"
                                      onClick={(btnEv) => {
                                        btnEv.stopPropagation();
                                        const anchor =
                                          btnEv.currentTarget as HTMLElement;
                                        setAgendaPopover({
                                          kind: "task",
                                          anchor,
                                          taskId: entry.item._id as Id<"tasks">,
                                        });
                                      }}
                                    >
                                      <Edit3 className="w-3 h-3 mx-auto" />
                                    </button>

                                    <button
                                      className="w-5 h-5 rounded bg-[var(--bg-primary)] hover:bg-red-500 border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-white"
                                      title="Delete"
                                      aria-label="Delete"
                                      onClick={(btnEv) => {
                                        btnEv.stopPropagation();
                                        if (
                                          window.confirm("Delete this task?")
                                        ) {
                                          void deleteTaskMutation({
                                            taskId: entry.item
                                              ._id as Id<"tasks">,
                                          });
                                        }
                                      }}
                                    >
                                      <Trash2 className="w-3 h-3 mx-auto" />
                                    </button>

                                    <button
                                      className="w-5 h-5 rounded bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)]"
                                      title="Convert to event"
                                      aria-label="Convert to event"
                                      onClick={async (btnEv) => {
                                        btnEv.stopPropagation();

                                        try {
                                          const t = entry.item;

                                          const title = String(
                                            t?.title ?? "Untitled",
                                          );

                                          const description =
                                            typeof t?.description === "string"
                                              ? t.description
                                              : "";

                                          const descriptionJson =
                                            typeof t?.descriptionJson ===
                                            "string"
                                              ? t.descriptionJson
                                              : undefined;

                                          const start =
                                            typeof t?.startDate === "number"
                                              ? t.startDate
                                              : typeof t?.dueDate === "number"
                                                ? t.dueDate
                                                : Date.now();

                                          const end = start + 60 * 60 * 1000;

                                          const colorVal =
                                            typeof t?.color === "string" &&
                                            t.color.trim()
                                              ? t.color.trim()
                                              : undefined;

                                          const docId = t?.documentId as
                                            | Id<"documents">
                                            | undefined;

                                          const tagsArr: string[] =
                                            Array.isArray(t?.tags)
                                              ? ((t.tags as any[]).filter(
                                                  (x) => typeof x === "string",
                                                ) as string[])
                                              : [];

                                          await createEventMutation({
                                            title,
                                            description:
                                              description || undefined,
                                            descriptionJson,
                                            startTime: start,
                                            endTime: end,
                                            allDay: false,
                                            color: colorVal,
                                            documentId: docId,
                                            tags: tagsArr.length
                                              ? tagsArr
                                              : undefined,
                                            status: "confirmed",
                                          });

                                          await deleteTaskMutation({
                                            taskId: t._id as Id<"tasks">,
                                          });

                                          toast.success(
                                            "Converted task to event",
                                          );
                                        } catch (err: any) {
                                          toast.error(
                                            err?.message ??
                                              "Failed to convert task",
                                          );
                                        }
                                      }}
                                    >
                                      <ArrowRightLeft className="w-3 h-3 mx-auto" />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      className="w-5 h-5 rounded bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)]"
                                      title="Open"
                                      aria-label="Open"
                                      onClick={(evBtn) => {
                                        evBtn.stopPropagation();
                                        setSelectedEventId(
                                          entry.item._id as Id<"events">,
                                        );
                                        setAgendaPopover({
                                          kind: "event",
                                          anchor:
                                            evBtn.currentTarget as HTMLElement,
                                          eventId: entry.item
                                            ._id as Id<"events">,
                                          documentIdForAssociation:
                                            selectedFrequentDoc ?? null,
                                        });
                                      }}
                                    >
                                      <Edit3 className="w-3 h-3 mx-auto" />
                                    </button>

                                    <button
                                      className="w-5 h-5 rounded bg-[var(--bg-primary)] hover:bg-red-500 border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-white"
                                      title="Delete"
                                      aria-label="Delete"
                                      onClick={(evBtn) => {
                                        evBtn.stopPropagation();
                                        if (
                                          window.confirm("Delete this event?")
                                        ) {
                                          void deleteEventMutation({
                                            eventId: entry.item
                                              ._id as Id<"events">,
                                          });
                                        }
                                      }}
                                    >
                                      <Trash2 className="w-3 h-3 mx-auto" />
                                    </button>

                                    <button
                                      className="w-5 h-5 rounded bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)]"
                                      title="Convert to task"
                                      aria-label="Convert to task"
                                      onClick={(evBtn) => {
                                        evBtn.stopPropagation();
                                        void handleConvertEventToTask(
                                          entry.item,
                                        );
                                      }}
                                    >
                                      <ArrowRightLeft className="w-3 h-3 mx-auto" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </>
                    ) : (
                      (() => {
                        // Build 7-day groups for the selected agenda week

                        const days: Array<{
                          key: number;
                          label: string;
                          holidays: any[];
                          entries: AgendaEntry[];
                        }> = [];

                        for (let i = 0; i < 7; i++) {
                          const dayStart =
                            agendaWeekStartUtc + i * 24 * 60 * 60 * 1000;

                          const d = new Date(dayStart + offsetMs);
                          d.setUTCHours(0, 0, 0, 0);

                          const wd = d.toLocaleDateString(undefined, {
                            weekday: "long",
                          });

                          const shortDate = d.toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          });

                          days.push({
                            key: dayStart,
                            label: `${wd} (${shortDate})`,
                            holidays: [],
                            entries: [],
                          });
                        }

                        const dayKeyOf = (
                          ts?: number | null,
                        ): number | null => {
                          if (typeof ts !== "number" || !Number.isFinite(ts))
                            return null;

                          const d = new Date(ts + offsetMs);
                          d.setUTCHours(0, 0, 0, 0);

                          return d.getTime() - offsetMs;
                        };

                        for (const e of weekEventsMerged) {
                          const key = dayKeyOf(
                            e?.startTime as number | undefined,
                          );

                          if (key == null) continue;

                          const day = days.find((d) => d.key === key);

                          if (!day) continue;

                          day.entries.push(toAgendaItem(e, "event"));
                        }

                        for (const t of weekTasksMerged) {
                          const key = dayKeyOf(
                            typeof t?.dueDate === "number"
                              ? t.dueDate
                              : (t?.createdAt as number | undefined),
                          );

                          if (key == null) continue;

                          const day = days.find((d) => d.key === key);

                          if (!day) continue;

                          day.entries.push(toAgendaItem(t, "task"));
                        }

                        // Notes within the selected week

                        for (const n of agendaWeekNotes) {
                          const key = dayKeyOf(
                            typeof n?.agendaDate === "number"
                              ? n.agendaDate
                              : (n?._creationTime as number | undefined),
                          );

                          if (key == null) continue;

                          const day = days.find((d) => d.key === key);

                          if (!day) continue;

                          day.entries.push(toAgendaItem(n, "note"));
                        }

                        for (const h of weekHolidaysMerged) {
                          let key: number | null = null;

                          if (typeof h?.dateKey === "string") {
                            const parts = String(h.dateKey).split("-");

                            if (parts.length === 3) {
                              const y = Number(parts[0]);
                              const m = Number(parts[1]);
                              const dd = Number(parts[2]);

                              if (
                                !Number.isNaN(y) &&
                                !Number.isNaN(m) &&
                                !Number.isNaN(dd)
                              ) {
                                const local = new Date(
                                  y,
                                  m - 1,
                                  dd,
                                  0,
                                  0,
                                  0,
                                  0,
                                );

                                key = local.getTime() - offsetMs;
                              }
                            }
                          } else if (typeof h?.dateMs === "number") {
                            key = dayKeyOf(h.dateMs);
                          }

                          if (key != null) {
                            const day = days.find((d) => d.key === key);

                            if (day) day.holidays.push(h);
                          }
                        }

                        for (const d of days)
                          d.entries.sort((a, b) => a.time - b.time);

                        const visible = days.filter(
                          (d) => d.entries.length > 0 || d.holidays.length > 0,
                        );

                        if (visible.length === 0)
                          return (
                            <div className="text-sm text-[var(--text-secondary)]">
                              Nothing scheduled.
                            </div>
                          );

                        return (
                          <div className="space-y-2">
                            {visible.map((d) => (
                              <div key={String(d.key)} className="space-y-1">
                                <div
                                  className={
                                    (d.key === todayStartUtc
                                      ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] "
                                      : "text-[var(--text-primary)] ") +
                                    "px-2 py-1 text-sm font-semibold border-b border-[var(--border-color)]"
                                  }
                                >
                                  {d.label}
                                </div>

                                {d.holidays.map((h, idx) => (
                                  <div
                                    key={`mini_h_${d.key}_${idx}`}
                                    onMouseUp={(e) => {
                                      setAgendaPopover({
                                        kind: "createBoth",

                                        anchor: e.currentTarget as HTMLElement,

                                        dateMs: d.key,

                                        defaultKind: "event",

                                        defaultAllDay: true,

                                        defaultTitle: String(
                                          h?.name ?? "Holiday",
                                        ),
                                      });
                                    }}
                                  >
                                    <AgendaMiniRow item={h} kind="holiday" />
                                  </div>
                                ))}

                                {d.entries.map((entry) => (
                                  <div
                                    key={keyOfAgendaEntry(entry)}
                                    className="relative group"
                                    onMouseUp={(e) => {
                                      const anchor =
                                        (e.currentTarget.querySelector(
                                          "[data-agenda-mini-row]",
                                        ) as HTMLElement | null) ??
                                        (e.currentTarget as HTMLElement);

                                      if (entry.kind === "event") {
                                        setSelectedEventId(
                                          entry.item._id as Id<"events">,
                                        );

                                        setAgendaPopover({
                                          kind: "event",
                                          anchor,
                                          eventId: entry.item
                                            ._id as Id<"events">,
                                          documentIdForAssociation:
                                            selectedFrequentDoc ?? null,
                                        });
                                      } else if (entry.kind === "task") {
                                        setAgendaPopover({
                                          kind: "task",
                                          anchor,
                                          taskId: entry.item._id as Id<"tasks">,
                                        });
                                      }
                                    }}
                                  >
                                    <AgendaMiniRow
                                      item={entry.item}
                                      kind={entry.kind}
                                      showCheckbox={entry.kind === "task"}
                                      onToggleComplete={(id, completed) => {
                                        if (entry.kind === "task") {
                                          void updateTask({
                                            taskId: id as Id<"tasks">,
                                            status: completed ? "done" : "todo",
                                          });
                                        }
                                      }}
                                    />

                                    <div className="absolute top-1 right-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      {entry.kind === "task" ? (
                                        <>
                                          <button
                                            className={`w-5 h-5 rounded border ${entry.item.isFavorite ? "bg-yellow-500 text-yellow-100 border-yellow-500" : "bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)]"}`}
                                            title={
                                              entry.item.isFavorite
                                                ? "Unfavorite"
                                                : "Favorite"
                                            }
                                            aria-label={
                                              entry.item.isFavorite
                                                ? "Unfavorite"
                                                : "Favorite"
                                            }
                                            onClick={(btnEv) => {
                                              btnEv.stopPropagation();
                                              void toggleTaskFavoriteAgg({
                                                taskId: entry.item
                                                  ._id as Id<"tasks">,
                                              });
                                            }}
                                          >
                                            <Star
                                              className={`w-3 h-3 mx-auto ${entry.item.isFavorite ? "fill-current" : ""}`}
                                            />
                                          </button>

                                          <button
                                            className="w-5 h-5 rounded bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)]"
                                            title="Open"
                                            aria-label="Open"
                                            onClick={(btnEv) => {
                                              btnEv.stopPropagation();
                                              const anchor =
                                                btnEv.currentTarget as HTMLElement;
                                              setAgendaPopover({
                                                kind: "task",
                                                anchor,
                                                taskId: entry.item
                                                  ._id as Id<"tasks">,
                                              });
                                            }}
                                          >
                                            <Edit3 className="w-3 h-3 mx-auto" />
                                          </button>

                                          <button
                                            className="w-5 h-5 rounded bg-[var(--bg-primary)] hover:bg-red-500 border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-white"
                                            title="Delete"
                                            aria-label="Delete"
                                            onClick={(btnEv) => {
                                              btnEv.stopPropagation();
                                              if (
                                                window.confirm(
                                                  "Delete this task?",
                                                )
                                              ) {
                                                void deleteTaskMutation({
                                                  taskId: entry.item
                                                    ._id as Id<"tasks">,
                                                });
                                              }
                                            }}
                                          >
                                            <Trash2 className="w-3 h-3 mx-auto" />
                                          </button>

                                          <button
                                            className="w-5 h-5 rounded bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)]"
                                            title="Convert to event"
                                            aria-label="Convert to event"
                                            onClick={async (btnEv) => {
                                              btnEv.stopPropagation();

                                              try {
                                                const t = entry.item;

                                                const title = String(
                                                  t?.title ?? "Untitled",
                                                );

                                                const description =
                                                  typeof t?.description ===
                                                  "string"
                                                    ? t.description
                                                    : "";

                                                const descriptionJson =
                                                  typeof t?.descriptionJson ===
                                                  "string"
                                                    ? t.descriptionJson
                                                    : undefined;

                                                const start =
                                                  typeof t?.startDate ===
                                                  "number"
                                                    ? t.startDate
                                                    : typeof t?.dueDate ===
                                                        "number"
                                                      ? t.dueDate
                                                      : Date.now();

                                                const end =
                                                  start + 60 * 60 * 1000;

                                                const colorVal =
                                                  typeof t?.color ===
                                                    "string" && t.color.trim()
                                                    ? t.color.trim()
                                                    : undefined;

                                                const docId = t?.documentId as
                                                  | Id<"documents">
                                                  | undefined;

                                                const tagsArr: string[] =
                                                  Array.isArray(t?.tags)
                                                    ? ((t.tags as any[]).filter(
                                                        (x) =>
                                                          typeof x === "string",
                                                      ) as string[])
                                                    : [];

                                                await createEventMutation({
                                                  title,
                                                  description:
                                                    description || undefined,
                                                  descriptionJson,
                                                  startTime: start,
                                                  endTime: end,
                                                  allDay: false,
                                                  color: colorVal,
                                                  documentId: docId,
                                                  tags: tagsArr.length
                                                    ? tagsArr
                                                    : undefined,
                                                  status: "confirmed",
                                                });

                                                await deleteTaskMutation({
                                                  taskId: t._id as Id<"tasks">,
                                                });

                                                toast.success(
                                                  "Converted task to event",
                                                );
                                              } catch (err: any) {
                                                toast.error(
                                                  err?.message ??
                                                    "Failed to convert task",
                                                );
                                              }
                                            }}
                                          >
                                            <ArrowRightLeft className="w-3 h-3 mx-auto" />
                                          </button>
                                        </>
                                      ) : (
                                        <>
                                          <button
                                            className="w-5 h-5 rounded bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)]"
                                            title="Open"
                                            aria-label="Open"
                                            onClick={(evBtn) => {
                                              evBtn.stopPropagation();
                                              setSelectedEventId(
                                                entry.item._id as Id<"events">,
                                              );
                                              setAgendaPopover({
                                                kind: "event",
                                                anchor:
                                                  evBtn.currentTarget as HTMLElement,
                                                eventId: entry.item
                                                  ._id as Id<"events">,
                                                documentIdForAssociation:
                                                  selectedFrequentDoc ?? null,
                                              });
                                            }}
                                          >
                                            <Edit3 className="w-3 h-3 mx-auto" />
                                          </button>

                                          <button
                                            className="w-5 h-5 rounded bg-[var(--bg-primary)] hover:bg-red-500 border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-white"
                                            title="Delete"
                                            aria-label="Delete"
                                            onClick={(evBtn) => {
                                              evBtn.stopPropagation();
                                              if (
                                                window.confirm(
                                                  "Delete this event?",
                                                )
                                              ) {
                                                void deleteEventMutation({
                                                  eventId: entry.item
                                                    ._id as Id<"events">,
                                                });
                                              }
                                            }}
                                          >
                                            <Trash2 className="w-3 h-3 mx-auto" />
                                          </button>

                                          <button
                                            className="w-5 h-5 rounded bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)]"
                                            title="Convert to task"
                                            aria-label="Convert to task"
                                            onClick={(evBtn) => {
                                              evBtn.stopPropagation();
                                              void handleConvertEventToTask(
                                                entry.item,
                                              );
                                            }}
                                          >
                                            <ArrowRightLeft className="w-3 h-3 mx-auto" />
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        );
                      })()
                    )}
                  </div>
                )}

                {/* Kanban for Today's Agenda is rendered within the tabpanel below */}

                {agendaMode === "list" && (
                  <div
                    className="space-y-2"
                    role="tabpanel"
                    id="agenda-panel-list"
                    aria-labelledby="agenda-tab-list"
                  >
                    {/* Agenda quick add: simple task-only input */}

                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        value={quickAgendaText}
                        onChange={(e) => setQuickAgendaText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void handleQuickAgendaCreate();
                          }
                        }}
                        placeholder={(() => {
                          const isToday = agendaStartUtc === todayStartUtc;

                          const d = new Date(agendaStartUtc + offsetMs);

                          const pretty = d.toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          });

                          const suffix = isToday ? "today" : pretty;

                          return `Quick add task for ${suffix}…`;
                        })()}
                        className="flex-1 text-sm bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md p-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
                      />

                      <button
                        onClick={() => {
                          void handleQuickAgendaCreate();
                        }}
                        disabled={!loggedInUser || !quickAgendaText.trim()}
                        className={`text-[11px] px-2.5 py-1 rounded-md border ${!loggedInUser || !quickAgendaText.trim() ? "bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border-color)] cursor-not-allowed" : "bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary-hover)] border-transparent"}`}
                        title={
                          !loggedInUser
                            ? "Please sign in to create items"
                            : undefined
                        }
                      >
                        Add
                      </button>
                    </div>

                    {agendaScope === "day" && (
                      <>
                        {/* Day header (list mode) */}

                        <div className="px-2 py-1 text-sm font-semibold text-[var(--text-primary)] bg-[var(--bg-secondary)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--bg-secondary)]/80 border-b border-[var(--border-color)]">
                          {(() => {
                            const d = new Date(agendaStartUtc + offsetMs);

                            const wd = d.toLocaleDateString(undefined, {
                              weekday: "long",
                            });

                            const shortDate = d.toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            });

                            return `${wd} (${shortDate})`;
                          })()}
                        </div>

                        {todayAgenda.length === 0 &&
                        holidaysToday.length === 0 ? (
                          <div className="text-sm text-[var(--text-secondary)]">
                            Nothing scheduled.
                          </div>
                        ) : (
                          (() => {
                            const items = todayAgendaDisplay.map((entry) =>
                              keyOfAgendaEntry(entry),
                            );

                            return (
                              <div className="space-y-2">
                                {/* Holidays first (rendered with TaskRowGlobal style via HolidayRowGlobal) */}

                                {holidaysToday.map((h: any, idx: number) => (
                                  <div
                                    key={`today_h_${idx}`}
                                    className="flex flex-col gap-1"
                                    onMouseUp={(e) => {
                                      setAgendaPopover({
                                        kind: "createBoth",

                                        anchor: e.currentTarget as HTMLElement,

                                        // Use computed local midnight for selected agenda day

                                        dateMs: agendaStartUtc,

                                        defaultKind: "event",

                                        defaultAllDay: true,

                                        defaultTitle: String(
                                          h?.name ?? "Holiday",
                                        ),
                                      });
                                    }}
                                  >
                                    <HolidayRowGlobal h={h} />
                                  </div>
                                ))}

                                <SortableList
                                  items={items}
                                  containerClassName="space-y-2"
                                  onReorder={(newOrder) => {
                                    // Prune to keys currently visible in Today list

                                    const valid = new Set(items);

                                    const pruned = newOrder.filter((k) =>
                                      valid.has(k),
                                    );

                                    setAgendaListOrder(pruned);

                                    if (loggedInUser) {
                                      void setListOrders({
                                        agendaListOrder: pruned,
                                      });
                                    } else {
                                      try {
                                        localStorage.setItem(
                                          "nodebench:agendaListOrder",
                                          JSON.stringify(pruned),
                                        );
                                      } catch {
                                        /* no-op */
                                      }
                                    }
                                  }}
                                  renderItem={(id, index) => {
                                    const entry =
                                      todayAgendaDisplay[index] ??
                                      todayAgendaDisplay.find(
                                        (e) => keyOfAgendaEntry(e) === id,
                                      );

                                    if (!entry) return null;

                                    if (entry.kind === "task") {
                                      return (
                                        <div className="flex flex-col gap-1">
                                          <TaskRowGlobal
                                            t={entry.item}
                                            density={density}
                                            onSelect={(id) =>
                                              handleSelectTask(
                                                id as Id<"tasks">,
                                                "today",
                                              )
                                            }
                                            onChangeStatus={(id, status) =>
                                              void updateTask({
                                                taskId: id as Id<"tasks">,
                                                status: status as
                                                  | "todo"
                                                  | "in_progress"
                                                  | "done"
                                                  | "blocked",
                                              })
                                            }
                                          />

                                          {selectedTaskId ===
                                            entry.item._id && (
                                            <MiniAgendaEditorPanel
                                              kind="task"
                                              taskId={entry.item._id}
                                              onClose={
                                                onClearTaskSelection ??
                                                (() => {})
                                              }
                                            />
                                          )}
                                        </div>
                                      );
                                    } else if (entry.kind === "event") {
                                      return (
                                        <div className="relative flex flex-col gap-1 group">
                                          <TaskRowGlobal
                                            t={entry.item}
                                            kind="event"
                                            density={density}
                                            onSelect={(id) =>
                                              handleSelectEvent(
                                                id as Id<"events">,
                                              )
                                            }
                                            onChangeStatus={(id, status) =>
                                              void updateEventMutation({
                                                eventId: id as Id<"events">,
                                                status: status as
                                                  | "confirmed"
                                                  | "tentative"
                                                  | "cancelled",
                                              })
                                            }
                                            onOpenRef={openReference}
                                          />

                                          {/* Inline actions overlay for event row */}

                                          <div className="absolute top-1 right-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                              className="w-5 h-5 rounded bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)]"
                                              title="Open"
                                              aria-label="Open"
                                              onClick={(evBtn) => {
                                                evBtn.stopPropagation();
                                                setSelectedEventId(
                                                  (entry.item as any)
                                                    ._id as Id<"events">,
                                                );
                                                setAgendaPopover({
                                                  kind: "event",
                                                  anchor:
                                                    evBtn.currentTarget as HTMLElement,
                                                  eventId: (entry.item as any)
                                                    ._id as Id<"events">,
                                                  documentIdForAssociation:
                                                    selectedFrequentDoc ?? null,
                                                });
                                              }}
                                            >
                                              <Edit3 className="w-3 h-3 mx-auto" />
                                            </button>

                                            <button
                                              className="w-5 h-5 rounded bg-[var(--bg-primary)] hover:bg-red-500 border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-white"
                                              title="Delete"
                                              aria-label="Delete"
                                              onClick={(evBtn) => {
                                                evBtn.stopPropagation();
                                                if (
                                                  window.confirm(
                                                    "Delete this event?",
                                                  )
                                                ) {
                                                  void deleteEventMutation({
                                                    eventId: (entry.item as any)
                                                      ._id as Id<"events">,
                                                  });
                                                }
                                              }}
                                            >
                                              <Trash2 className="w-3 h-3 mx-auto" />
                                            </button>

                                            <button
                                              className="w-5 h-5 rounded bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)]"
                                              title="Convert to task"
                                              aria-label="Convert to task"
                                              onClick={(evBtn) => {
                                                evBtn.stopPropagation();
                                                void handleConvertEventToTask(
                                                  entry.item,
                                                );
                                              }}
                                            >
                                              <ArrowRightLeft className="w-3 h-3 mx-auto" />
                                            </button>
                                          </div>

                                          {selectedEventId ===
                                            (entry.item as any)._id &&
                                            eventEditorInline && (
                                              <MiniAgendaEditorPanel
                                                kind="event"
                                                eventId={
                                                  (entry.item as any)._id
                                                }
                                                onClose={() => {
                                                  setSelectedEventId(null);
                                                  setEventEditorInline(false);
                                                }}
                                                documentIdForAssociation={
                                                  selectedFrequentDoc ?? null
                                                }
                                              />
                                            )}
                                        </div>
                                      );
                                    }

                                    // Note

                                    return (
                                      <div className="relative flex flex-col gap-1 group">
                                        <AgendaMiniRow
                                          item={entry.item}
                                          kind="note"
                                        />
                                      </div>
                                    );
                                  }}
                                />
                              </div>
                            );
                          })()
                        )}

                        {/* Unfinished Tasks (today) */}

                        {(() => {
                          const unfinished = (tasksTodayList || []).filter(
                            (t: any) => String(t?.status ?? "todo") !== "done",
                          );

                          if (unfinished.length === 0) return null;

                          return (
                            <div className="mt-4 space-y-2">
                              <div className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                                Unfinished tasks ({unfinished.length})
                              </div>

                              <div className="space-y-1">
                                {unfinished.map((t: any) => (
                                  <div
                                    key={String(t?._id)}
                                    className="flex flex-col gap-1"
                                  >
                                    <TaskRowGlobal
                                      t={t}
                                      density={density}
                                      onSelect={(id) =>
                                        handleSelectTask(
                                          id as Id<"tasks">,
                                          "today",
                                        )
                                      }
                                      onChangeStatus={(id, status) =>
                                        void updateTask({
                                          taskId: id as Id<"tasks">,
                                          status: status as
                                            | "todo"
                                            | "in_progress"
                                            | "done"
                                            | "blocked",
                                        })
                                      }
                                    />

                                    {selectedTaskId === t._id && (
                                      <MiniAgendaEditorPanel
                                        kind="task"
                                        taskId={t._id}
                                        onClose={
                                          onClearTaskSelection ?? (() => {})
                                        }
                                      />
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      </>
                    )}

                    {agendaScope === "week" &&
                      (() => {
                        const days: Array<{
                          key: number;
                          label: string;
                          holidays: any[];
                          entries: AgendaEntry[];
                        }> = [];

                        for (let i = 0; i < 7; i++) {
                          const dayStart =
                            agendaWeekStartUtc + i * 24 * 60 * 60 * 1000;

                          const d = new Date(dayStart + offsetMs);
                          d.setUTCHours(0, 0, 0, 0);

                          const wd = d.toLocaleDateString(undefined, {
                            weekday: "long",
                          });

                          const shortDate = d.toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          });

                          days.push({
                            key: dayStart,
                            label: `${wd} (${shortDate})`,
                            holidays: [],
                            entries: [],
                          });
                        }

                        const dayKeyOf = (
                          ts?: number | null,
                        ): number | null => {
                          if (typeof ts !== "number" || !Number.isFinite(ts))
                            return null;

                          const d = new Date(ts + offsetMs);
                          d.setUTCHours(0, 0, 0, 0);

                          return d.getTime() - offsetMs;
                        };

                        for (const e of weekEventsMerged) {
                          const key = dayKeyOf(
                            e?.startTime as number | undefined,
                          );

                          if (key == null) continue;

                          const day = days.find((d) => d.key === key);

                          if (!day) continue;

                          day.entries.push(toAgendaItem(e, "event"));
                        }

                        for (const t of weekTasksMerged) {
                          const key = dayKeyOf(
                            typeof t?.dueDate === "number"
                              ? t.dueDate
                              : (t?.createdAt as number | undefined),
                          );

                          if (key == null) continue;

                          const day = days.find((d) => d.key === key);

                          if (!day) continue;

                          day.entries.push(toAgendaItem(t, "task"));
                        }

                        // Notes within the selected week (list view)

                        for (const n of agendaWeekNotes) {
                          const key = dayKeyOf(
                            typeof n?.agendaDate === "number"
                              ? n.agendaDate
                              : (n?._creationTime as number | undefined),
                          );

                          if (key == null) continue;

                          const day = days.find((d) => d.key === key);

                          if (!day) continue;

                          day.entries.push(toAgendaItem(n, "note"));
                        }

                        for (const h of weekHolidaysMerged) {
                          let key: number | null = null;

                          if (typeof h?.dateKey === "string") {
                            const parts = String(h.dateKey).split("-");

                            if (parts.length === 3) {
                              const y = Number(parts[0]);
                              const m = Number(parts[1]);
                              const dd = Number(parts[2]);

                              if (
                                !Number.isNaN(y) &&
                                !Number.isNaN(m) &&
                                !Number.isNaN(dd)
                              ) {
                                const local = new Date(
                                  y,
                                  m - 1,
                                  dd,
                                  0,
                                  0,
                                  0,
                                  0,
                                );

                                key = local.getTime() - offsetMs;
                              }
                            }
                          } else if (typeof h?.dateMs === "number") {
                            key = dayKeyOf(h.dateMs);
                          }

                          if (key != null) {
                            const day = days.find((d) => d.key === key);

                            if (day) day.holidays.push(h);
                          }
                        }

                        for (const d of days)
                          d.entries.sort((a, b) => a.time - b.time);

                        const visible = days.filter(
                          (d) => d.entries.length > 0 || d.holidays.length > 0,
                        );

                        if (visible.length === 0)
                          return (
                            <div className="text-sm text-[var(--text-secondary)]">
                              Nothing scheduled.
                            </div>
                          );

                        return (
                          <div className="space-y-3">
                            <div className="px-2 py-1 text-sm font-semibold text-[var(--text-primary)] bg-[var(--bg-secondary)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--bg-secondary)]/80 border-b border-[var(--border-color)]">
                              {agendaWeekLabel}
                            </div>

                            {visible.map((d) => (
                              <div key={String(d.key)} className="space-y-1">
                                <div
                                  className={
                                    (d.key === todayStartUtc
                                      ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] "
                                      : "text-[var(--text-primary)] ") +
                                    "px-2 py-1 text-sm font-semibold border-b border-[var(--border-color)]"
                                  }
                                >
                                  {d.label}
                                </div>

                                {d.holidays.map((h, idx) => (
                                  <div
                                    key={`list_week_h_${d.key}_${idx}`}
                                    onMouseUp={(e) => {
                                      setAgendaPopover({
                                        kind: "createBoth",

                                        anchor: e.currentTarget as HTMLElement,

                                        dateMs: d.key,

                                        defaultKind: "event",

                                        defaultAllDay: true,

                                        defaultTitle: String(
                                          h?.name ?? "Holiday",
                                        ),
                                      });
                                    }}
                                  >
                                    <HolidayRowGlobal h={h} />
                                  </div>
                                ))}

                                {d.entries.map((entry) => (
                                  <div
                                    key={keyOfAgendaEntry(entry)}
                                    className="relative group"
                                    onMouseUp={(e) => {
                                      const anchor =
                                        (e.currentTarget.querySelector(
                                          "[data-agenda-mini-row]",
                                        ) as HTMLElement | null) ??
                                        (e.currentTarget as HTMLElement);

                                      if (entry.kind === "event") {
                                        setSelectedEventId(
                                          entry.item._id as Id<"events">,
                                        );

                                        setAgendaPopover({
                                          kind: "event",
                                          anchor,
                                          eventId: entry.item
                                            ._id as Id<"events">,
                                          documentIdForAssociation:
                                            selectedFrequentDoc ?? null,
                                        });
                                      } else if (entry.kind === "task") {
                                        setAgendaPopover({
                                          kind: "task",
                                          anchor,
                                          taskId: entry.item._id as Id<"tasks">,
                                        });
                                      } else if (entry.kind === "note") {
                                        openMiniEditor(
                                          (entry.item as any)
                                            ._id as Id<"documents">,
                                          anchor,
                                        );
                                      }
                                    }}
                                  >
                                    <AgendaMiniRow
                                      item={entry.item}
                                      kind={entry.kind}
                                      showCheckbox={entry.kind === "task"}
                                      onToggleComplete={(id, completed) => {
                                        if (entry.kind === "task") {
                                          void updateTask({
                                            taskId: id as Id<"tasks">,
                                            status: completed ? "done" : "todo",
                                          });
                                        }
                                      }}
                                    />
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                  </div>
                )}

                {agendaMode === "kanban" && (
                  <div
                    role="tabpanel"
                    id="agenda-panel-kanban"
                    aria-labelledby="agenda-tab-kanban"
                    className="space-y-3"
                  >
                    {/* Agenda quick add: simple task-only input */}

                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        value={quickAgendaText}
                        onChange={(e) => setQuickAgendaText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void handleQuickAgendaCreate();
                          }
                        }}
                        placeholder={(() => {
                          const isToday = agendaStartUtc === todayStartUtc;

                          const d = new Date(agendaStartUtc + offsetMs);

                          const pretty = d.toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          });

                          const suffix = isToday ? "today" : pretty;

                          return `Quick add task for ${suffix}…`;
                        })()}
                        className="flex-1 text-sm bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md p-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
                      />

                      <button
                        onClick={() => {
                          void handleQuickAgendaCreate();
                        }}
                        disabled={!loggedInUser || !quickAgendaText.trim()}
                        className={`text-[11px] px-2.5 py-1 rounded-md border ${!loggedInUser || !quickAgendaText.trim() ? "bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border-color)] cursor-not-allowed" : "bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary-hover)] border-transparent"}`}
                        title={
                          !loggedInUser
                            ? "Please sign in to create items"
                            : undefined
                        }
                      >
                        Add
                      </button>
                    </div>

                    {/* Scope header (kanban mode) */}

                    <div className="px-2 py-1 text-sm font-semibold text-[var(--text-primary)] bg-[var(--bg-secondary)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--bg-secondary)]/80 border-b border-[var(--border-color)]">
                      {agendaScope === "week"
                        ? agendaWeekLabel
                        : (() => {
                            const d = new Date(agendaStartUtc + offsetMs);

                            const wd = d.toLocaleDateString(undefined, {
                              weekday: "long",
                            });

                            const shortDate = d.toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            });

                            return `${wd} (${shortDate})`;
                          })()}
                    </div>

                    {/* DnD Kanban for today's tasks with full TaskCard style (dnd-kit). Always render columns. */}

                    {(() => {
                      // Helpers for agenda Kanban (day or week)

                      const scopeTasks: Doc<"tasks">[] = (
                        agendaScope === "week"
                          ? (agendaWeekTasks as any[])
                          : (tasksTodayList as any[])
                      ) as Doc<"tasks">[];

                      const scopeEvents: any[] =
                        agendaScope === "week"
                          ? (agendaWeekEvents as any[])
                          : (eventsTodayList as any[]);

                      const scopeHolidays: any[] =
                        agendaScope === "week"
                          ? (agendaWeekHolidays as any[])
                          : (holidaysToday as any[]);

                      const todaySortedByStatus = (
                        status: Status,
                      ): Doc<"tasks">[] =>
                        scopeTasks

                          .filter((t) => (t.status || "todo") === status)

                          .slice()

                          .sort((a, b) => {
                            const ao =
                              typeof a?.order === "number"
                                ? a.order
                                : Number.MAX_SAFE_INTEGER;

                            const bo =
                              typeof b?.order === "number"
                                ? b.order
                                : Number.MAX_SAFE_INTEGER;

                            if (ao !== bo) return ao - bo;

                            const ac =
                              typeof a?.createdAt === "number"
                                ? a.createdAt
                                : 0;

                            const bc =
                              typeof b?.createdAt === "number"
                                ? b.createdAt
                                : 0;

                            return ac - bc;
                          });

                      const handleAgendaDragStart = (e: DragStartEvent) => {
                        try {
                          document.documentElement.classList.add(
                            "dnd-dragging",
                          );
                        } catch {
                          /* no-op */
                        }

                        const activeId = String(e.active.id);

                        if (tasksTodayList.find((t) => t._id === activeId)) {
                          setActiveAgenda({ type: "task", id: activeId });
                        } else {
                          setActiveAgenda(null);
                        }
                      };

                      const handleAgendaDragCancel = () => {
                        try {
                          document.documentElement.classList.remove(
                            "dnd-dragging",
                          );
                        } catch {
                          /* no-op */
                        }

                        setActiveAgenda(null);
                      };

                      const handleAgendaDragEnd = (e: DragEndEvent) => {
                        try {
                          document.documentElement.classList.remove(
                            "dnd-dragging",
                          );
                        } catch {
                          /* no-op */
                        }

                        const { active, over } = e;

                        setActiveAgenda(null);

                        if (!over) return;

                        if (!loggedInUser) {
                          toast.error("Please sign in to move tasks.");
                          return;
                        }

                        const activeId = active.id as string;

                        const overId = over.id as string;

                        // Only tasks are draggable in Kanban

                        if (tasksTodayList.some((t) => t._id === activeId)) {
                          // Determine source & destination statuses (based on today's list)

                          const sourceStatus = (tasksTodayList.find(
                            (t) => t._id === activeId,
                          )?.status ?? "todo") as Status;

                          let destStatus: Status | undefined;

                          if (isTaskStatus(overId)) {
                            destStatus = overId;
                          } else {
                            destStatus = (tasksTodayList.find(
                              (t) => t._id === overId,
                            )?.status ?? undefined) as Status | undefined;
                          }

                          if (!sourceStatus || !destStatus) return;

                          // Destination index within today's destination lane

                          const destItems = todaySortedByStatus(destStatus);

                          let destIndex = destItems.length;

                          if (!isTaskStatus(overId)) {
                            const idx = destItems.findIndex(
                              (it) => it._id === overId,
                            );

                            destIndex = idx >= 0 ? idx : destItems.length;
                          }

                          // Compute source index if intra-lane (today subset)

                          let sourceIndex: number | undefined = undefined;

                          if (sourceStatus === destStatus) {
                            const srcItems = todaySortedByStatus(sourceStatus);

                            sourceIndex = srcItems.findIndex(
                              (it) => it._id === activeId,
                            );
                          }

                          // Compute new order using today's lane subset (preserve original behavior)

                          const items = todaySortedByStatus(destStatus);

                          if (sourceStatus === destStatus) {
                            const idx = items.findIndex(
                              (it) => it._id === activeId,
                            );

                            if (idx !== -1) items.splice(idx, 1);
                            else if (
                              sourceIndex !== undefined &&
                              sourceIndex >= 0 &&
                              sourceIndex < items.length
                            )
                              items.splice(sourceIndex, 1);
                          }

                          const before = items[destIndex - 1]?.order;

                          const after = items[destIndex]?.order;

                          let newOrder: number;

                          if (before !== undefined && after !== undefined)
                            newOrder = (before + after) / 2;
                          else if (before !== undefined) newOrder = before + 1;
                          else if (after !== undefined) newOrder = after - 1;
                          else newOrder = 0;

                          void moveTaskMutation({
                            taskId: active.id as Id<"tasks">,
                            status: destStatus,
                            order: newOrder,
                          }).catch((err: any) =>
                            toast.error(err?.message ?? "Failed to move task"),
                          );
                        }
                      };

                      const titleMap: Record<Status, string> = {
                        todo: "To Do",

                        in_progress: "In Progress",

                        done: "Done",

                        blocked: "Blocked",
                      };

                      return (
                        <>
                          {/* Kanban layout toggle */}

                          <div className="flex items-center justify-end mb-2">
                            <div
                              className="flex gap-1 bg-gray-100 p-1 rounded-lg"
                              role="group"
                              aria-label="Kanban orientation"
                            >
                              <button
                                onClick={() => setKanbanOrientation("columns")}
                                className={`px-2.5 py-0.5 text-xs font-semibold rounded-md ${kanbanOrientation === "columns" ? "text-gray-800 bg-white shadow" : "text-gray-500 hover:bg-white/50"}`}
                                type="button"
                              >
                                Grid
                              </button>

                              <button
                                onClick={() => setKanbanOrientation("rows")}
                                className={`px-2.5 py-0.5 text-xs font-semibold rounded-md ${kanbanOrientation === "rows" ? "text-gray-800 bg-white shadow" : "text-gray-500 hover:bg-white/50"}`}
                                type="button"
                              >
                                Rows
                              </button>
                            </div>
                          </div>

                          <DndContext
                            sensors={kanbanSensors}
                            onDragStart={handleAgendaDragStart}
                            onDragCancel={handleAgendaDragCancel}
                            onDragEnd={handleAgendaDragEnd}
                            collisionDetection={closestCenter}
                            modifiers={[restrictToWindowEdges]}
                          >
                            {kanbanOrientation === "columns" && (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-2 gap-y-1 gap-x-1">
                                {(
                                  [
                                    "todo",
                                    "in_progress",
                                    "done",
                                    "blocked",
                                  ] as Status[]
                                ).map((statusKey) => {
                                  const sorted = todaySortedByStatus(statusKey);

                                  return (
                                    <KanbanLane
                                      key={statusKey}
                                      laneId={statusKey}
                                      density={density}
                                    >
                                      <div className="flex-1 overflow-y-auto h-[40vh]">
                                        <div className="sticky top-0 z-10 flex items-center justify-between mb-0.5 bg-[var(--bg-secondary)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--bg-secondary)]/80 border-b border-[var(--border-color)] px-2 py-1">
                                          <h3
                                            className={`text-sm font-semibold ${statusKey === "in_progress" ? "text-blue-700" : statusKey === "done" ? "text-emerald-700" : statusKey === "blocked" ? "text-rose-700" : "text-slate-700"}`}
                                          >
                                            {titleMap[statusKey]}
                                          </h3>

                                          <div className="flex items-center gap-2">
                                            <span className="px-2 py-0.5 rounded-full text-xs border bg-[var(--bg-primary)] text-[var(--text-secondary)] border-[var(--border-color)]">
                                              {statusKey === "todo"
                                                ? sorted.length +
                                                  scopeEvents.length +
                                                  scopeHolidays.length
                                                : sorted.length}
                                            </span>
                                          </div>
                                        </div>

                                        {(statusKey !== "todo" &&
                                          sorted.length === 0) ||
                                        (statusKey === "todo" &&
                                          sorted.length === 0 &&
                                          scopeEvents.length === 0 &&
                                          scopeHolidays.length === 0) ? (
                                          <div className="text-sm text-[var(--text-secondary)]">
                                            No items.
                                          </div>
                                        ) : (
                                          <SortableContext
                                            items={sorted.map((t) => t._id)}
                                            strategy={
                                              verticalListSortingStrategy
                                            }
                                          >
                                            <div className="flex flex-col gap-0.5 pr-0 min-h-[260px] pb-2">
                                              {(() => {
                                                // Build merged list for To Do lane; tasks only for other lanes

                                                const merged =
                                                  statusKey === "todo"
                                                    ? [
                                                        // Holidays first

                                                        ...scopeHolidays.map(
                                                          (h: any) => ({
                                                            kind: "holiday" as const,
                                                            time: 0,
                                                            item: h,
                                                          }),
                                                        ),

                                                        ...scopeEvents.map(
                                                          (e: any) => ({
                                                            kind: "event" as const,
                                                            time:
                                                              Number(
                                                                e.startTime,
                                                              ) || 0,
                                                            item: e,
                                                          }),
                                                        ),

                                                        ...sorted.map((t) => ({
                                                          kind: "task" as const,
                                                          time: Number(
                                                            (t as any)
                                                              .dueDate ??
                                                              (t as any)
                                                                .createdAt ??
                                                              0,
                                                          ),
                                                          item: t,
                                                        })),
                                                      ].sort(
                                                        (a, b) =>
                                                          a.time - b.time,
                                                      )
                                                    : sorted.map((t) => ({
                                                        kind: "task" as const,
                                                        time: 0,
                                                        item: t,
                                                      }));

                                                return merged.map((node) => {
                                                  if (
                                                    (node as any).kind ===
                                                    "holiday"
                                                  ) {
                                                    const h: any = node.item;

                                                    return (
                                                      <div
                                                        key={`hol_${String(h._id)}`}
                                                        onMouseUp={(ev) => {
                                                          setAgendaPopover({
                                                            kind: "createBoth",

                                                            anchor:
                                                              ev.currentTarget as HTMLElement,

                                                            // Use local midnight for today, not UTC holiday date

                                                            dateMs:
                                                              todayStartUtc,

                                                            defaultKind:
                                                              "event",

                                                            defaultAllDay: true,

                                                            defaultTitle:
                                                              String(
                                                                h?.name ??
                                                                  "Holiday",
                                                              ),
                                                          });
                                                        }}
                                                      >
                                                        <AgendaMiniRow
                                                          item={h}
                                                          kind="holiday"
                                                          onSelect={() => {}}
                                                        />
                                                      </div>
                                                    );
                                                  }

                                                  if (node.kind === "event") {
                                                    const e: any = node.item;

                                                    return (
                                                      <div
                                                        key={`ev_${e._id}`}
                                                        id={`event-${String(e._id)}`}
                                                        className="group"
                                                        onMouseUp={(ev) => {
                                                          setSelectedEventId(
                                                            e._id as Id<"events">,
                                                          );

                                                          setAgendaPopover({
                                                            kind: "event",
                                                            anchor:
                                                              ev.currentTarget as HTMLElement,
                                                            eventId:
                                                              e._id as Id<"events">,
                                                            documentIdForAssociation:
                                                              selectedFrequentDoc ??
                                                              null,
                                                          });
                                                        }}
                                                      >
                                                        <AgendaMiniRow
                                                          item={e}
                                                          kind="event"
                                                          onSelect={(id) =>
                                                            setSelectedEventId(
                                                              id as Id<"events">,
                                                            )
                                                          }
                                                        />
                                                      </div>
                                                    );
                                                  }

                                                  const t =
                                                    node.item as (typeof sorted)[number];

                                                  return (
                                                    <KanbanSortableItem
                                                      key={t._id}
                                                      id={t._id}
                                                      rowStyle={{}}
                                                    >
                                                      {(isDragging) => (
                                                        <div
                                                          className={
                                                            (isDragging
                                                              ? "opacity-50 "
                                                              : "") +
                                                            "relative group"
                                                          }
                                                          onPointerUp={(ev) => {
                                                            try {
                                                              if (
                                                                document.documentElement.classList.contains(
                                                                  "dnd-dragging",
                                                                )
                                                              )
                                                                return;
                                                            } catch {}

                                                            const container =
                                                              ev.currentTarget as HTMLElement;

                                                            const anchor =
                                                              (container.querySelector(
                                                                "[data-agenda-mini-row]",
                                                              ) as HTMLElement | null) ??
                                                              container;

                                                            setAgendaPopover({
                                                              kind: "task",
                                                              anchor,
                                                              taskId:
                                                                t._id as Id<"tasks">,
                                                            });
                                                          }}
                                                          onMouseUp={(ev) => {
                                                            const container =
                                                              ev.currentTarget as HTMLElement;

                                                            const anchor =
                                                              (container.querySelector(
                                                                "[data-agenda-mini-row]",
                                                              ) as HTMLElement | null) ??
                                                              container;

                                                            setAgendaPopover({
                                                              kind: "task",
                                                              anchor,
                                                              taskId:
                                                                t._id as Id<"tasks">,
                                                            });
                                                          }}
                                                          onClick={(ev) => {
                                                            const container =
                                                              ev.currentTarget as HTMLElement;

                                                            const anchor =
                                                              (container.querySelector(
                                                                "[data-agenda-mini-row]",
                                                              ) as HTMLElement | null) ??
                                                              container;

                                                            setAgendaPopover({
                                                              kind: "task",
                                                              anchor,
                                                              taskId:
                                                                t._id as Id<"tasks">,
                                                            });
                                                          }}
                                                        >
                                                          <AgendaMiniRow
                                                            item={t}
                                                            kind="task"
                                                          />

                                                          {/* Inline actions overlay for task mini row */}

                                                          <div className="absolute top-1 right-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            {/* Favorite */}

                                                            <button
                                                              className={`w-5 h-5 rounded border ${t.isFavorite ? "bg-yellow-500 text-yellow-100 border-yellow-500" : "bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)]"}`}
                                                              title={
                                                                t.isFavorite
                                                                  ? "Unfavorite"
                                                                  : "Favorite"
                                                              }
                                                              aria-label={
                                                                t.isFavorite
                                                                  ? "Unfavorite"
                                                                  : "Favorite"
                                                              }
                                                              onClick={(
                                                                btnEv,
                                                              ) => {
                                                                btnEv.stopPropagation();
                                                                void toggleTaskFavoriteAgg(
                                                                  {
                                                                    taskId:
                                                                      t._id as Id<"tasks">,
                                                                  },
                                                                );
                                                              }}
                                                            >
                                                              <Star
                                                                className={`w-3 h-3 mx-auto ${t.isFavorite ? "fill-current" : ""}`}
                                                              />
                                                            </button>

                                                            {/* Open */}

                                                            <button
                                                              className="w-5 h-5 rounded bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)]"
                                                              title="Open"
                                                              aria-label="Open"
                                                              onClick={(
                                                                btnEv,
                                                              ) => {
                                                                btnEv.stopPropagation();
                                                                const anchor =
                                                                  btnEv.currentTarget as HTMLElement;
                                                                setAgendaPopover(
                                                                  {
                                                                    kind: "task",
                                                                    anchor,
                                                                    taskId:
                                                                      t._id as Id<"tasks">,
                                                                  },
                                                                );
                                                              }}
                                                            >
                                                              <Edit3 className="w-3 h-3 mx-auto" />
                                                            </button>

                                                            {/* Delete */}

                                                            <button
                                                              className="w-5 h-5 rounded bg-[var(--bg-primary)] hover:bg-red-500 border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-white"
                                                              title="Delete"
                                                              aria-label="Delete"
                                                              onClick={(
                                                                btnEv,
                                                              ) => {
                                                                btnEv.stopPropagation();
                                                                if (
                                                                  window.confirm(
                                                                    "Delete this task?",
                                                                  )
                                                                ) {
                                                                  void deleteTaskMutation(
                                                                    {
                                                                      taskId:
                                                                        t._id as Id<"tasks">,
                                                                    },
                                                                  );
                                                                }
                                                              }}
                                                            >
                                                              <Trash2 className="w-3 h-3 mx-auto" />
                                                            </button>

                                                            {/* Convert to event */}

                                                            <button
                                                              className="w-5 h-5 rounded bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)]"
                                                              title="Convert to event"
                                                              aria-label="Convert to event"
                                                              onClick={async (
                                                                btnEv,
                                                              ) => {
                                                                btnEv.stopPropagation();

                                                                try {
                                                                  const title =
                                                                    String(
                                                                      t?.title ??
                                                                        "Untitled",
                                                                    );

                                                                  const description =
                                                                    typeof t?.description ===
                                                                    "string"
                                                                      ? t.description
                                                                      : "";

                                                                  const descriptionJson =
                                                                    typeof t?.descriptionJson ===
                                                                    "string"
                                                                      ? t.descriptionJson
                                                                      : undefined;

                                                                  const start =
                                                                    typeof t?.startDate ===
                                                                    "number"
                                                                      ? t.startDate
                                                                      : typeof t?.dueDate ===
                                                                          "number"
                                                                        ? t.dueDate
                                                                        : Date.now();

                                                                  const end =
                                                                    start +
                                                                    60 *
                                                                      60 *
                                                                      1000;

                                                                  const colorVal =
                                                                    typeof t?.color ===
                                                                      "string" &&
                                                                    t.color.trim()
                                                                      ? t.color.trim()
                                                                      : undefined;

                                                                  const docId =
                                                                    t?.documentId as
                                                                      | Id<"documents">
                                                                      | undefined;

                                                                  const tagsArr: string[] =
                                                                    Array.isArray(
                                                                      t?.tags,
                                                                    )
                                                                      ? ((
                                                                          t.tags as any[]
                                                                        ).filter(
                                                                          (x) =>
                                                                            typeof x ===
                                                                            "string",
                                                                        ) as string[])
                                                                      : [];

                                                                  await createEventMutation(
                                                                    {
                                                                      title,
                                                                      description:
                                                                        description ||
                                                                        undefined,
                                                                      descriptionJson,
                                                                      startTime:
                                                                        start,
                                                                      endTime:
                                                                        end,
                                                                      allDay:
                                                                        false,
                                                                      color:
                                                                        colorVal,
                                                                      documentId:
                                                                        docId,
                                                                      tags: tagsArr.length
                                                                        ? tagsArr
                                                                        : undefined,
                                                                      status:
                                                                        "confirmed",
                                                                    },
                                                                  );

                                                                  await deleteTaskMutation(
                                                                    {
                                                                      taskId:
                                                                        t._id as Id<"tasks">,
                                                                    },
                                                                  );

                                                                  toast.success(
                                                                    "Converted task to event",
                                                                  );
                                                                } catch (err: any) {
                                                                  toast.error(
                                                                    err?.message ??
                                                                      "Failed to convert task",
                                                                  );
                                                                }
                                                              }}
                                                            >
                                                              <ArrowRightLeft className="w-3 h-3 mx-auto" />
                                                            </button>
                                                          </div>
                                                        </div>
                                                      )}
                                                    </KanbanSortableItem>
                                                  );
                                                });
                                              })()}
                                            </div>
                                          </SortableContext>
                                        )}
                                      </div>
                                    </KanbanLane>
                                  );
                                })}
                              </div>
                            )}

                            {kanbanOrientation === "rows" && (
                              <div className="space-y-1">
                                {(
                                  [
                                    "todo",
                                    "in_progress",
                                    "done",
                                    "blocked",
                                  ] as Status[]
                                ).map((statusKey) => {
                                  const sorted = todaySortedByStatus(statusKey);

                                  return (
                                    <KanbanLane
                                      key={statusKey}
                                      laneId={statusKey}
                                      density={density}
                                    >
                                      <div className="flex-1 overflow-y-auto max-h-[40vh]">
                                        <div className="sticky top-0 z-10 flex items-center justify-between mb-0.5 bg-[var(--bg-secondary)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--bg-secondary)]/80 border-b border-[var(--border-color)] px-2 py-1">
                                          <h3
                                            className={`text-sm font-semibold ${statusKey === "in_progress" ? "text-blue-700" : statusKey === "done" ? "text-emerald-700" : statusKey === "blocked" ? "text-rose-700" : "text-slate-700"}`}
                                          >
                                            {titleMap[statusKey]}
                                          </h3>

                                          <span className="px-2 py-0.5 rounded-full text-xs border bg-[var(--bg-primary)] text-[var(--text-secondary)] border-[var(--border-color)]">
                                            {statusKey === "todo"
                                              ? sorted.length +
                                                scopeEvents.length +
                                                scopeHolidays.length
                                              : sorted.length}
                                          </span>
                                        </div>

                                        {(statusKey !== "todo" &&
                                          sorted.length === 0) ||
                                        (statusKey === "todo" &&
                                          sorted.length === 0 &&
                                          scopeEvents.length === 0 &&
                                          scopeHolidays.length === 0) ? (
                                          <div className="text-sm text-[var(--text-secondary)] px-2 py-1">
                                            No items.
                                          </div>
                                        ) : (
                                          <SortableContext
                                            items={sorted.map((t) => t._id)}
                                            strategy={
                                              verticalListSortingStrategy
                                            }
                                          >
                                            <div className="flex flex-col gap-1 pr-2 pb-2">
                                              {(() => {
                                                const merged =
                                                  statusKey === "todo"
                                                    ? [
                                                        ...scopeHolidays.map(
                                                          (h: any) => ({
                                                            kind: "holiday" as const,
                                                            time: 0,
                                                            item: h,
                                                          }),
                                                        ),

                                                        ...scopeEvents.map(
                                                          (e: any) => ({
                                                            kind: "event" as const,
                                                            time:
                                                              Number(
                                                                e.startTime,
                                                              ) || 0,
                                                            item: e,
                                                          }),
                                                        ),

                                                        ...sorted.map((t) => ({
                                                          kind: "task" as const,
                                                          time: Number(
                                                            (t as any)
                                                              .dueDate ??
                                                              (t as any)
                                                                .createdAt ??
                                                              0,
                                                          ),
                                                          item: t,
                                                        })),
                                                      ].sort(
                                                        (a, b) =>
                                                          a.time - b.time,
                                                      )
                                                    : sorted.map((t) => ({
                                                        kind: "task" as const,
                                                        time: 0,
                                                        item: t,
                                                      }));

                                                return merged.map((node) => {
                                                  if (
                                                    (node as any).kind ===
                                                    "holiday"
                                                  ) {
                                                    const h: any = node.item;

                                                    return (
                                                      <div
                                                        key={`hol_${String(h._id)}`}
                                                        onMouseUp={(ev) => {
                                                          setAgendaPopover({
                                                            kind: "createBoth",

                                                            anchor:
                                                              ev.currentTarget as HTMLElement,

                                                            dateMs:
                                                              todayStartUtc,

                                                            defaultKind:
                                                              "event",

                                                            defaultAllDay: true,

                                                            defaultTitle:
                                                              String(
                                                                h?.name ??
                                                                  "Holiday",
                                                              ),
                                                          });
                                                        }}
                                                      >
                                                        <AgendaMiniRow
                                                          item={h}
                                                          kind="holiday"
                                                          onSelect={() => {}}
                                                        />
                                                      </div>
                                                    );
                                                  }

                                                  if (node.kind === "event") {
                                                    const e: any = node.item;

                                                    return (
                                                      <div
                                                        key={`ev_${e._id}`}
                                                        id={`event-${String(e._id)}`}
                                                        className="group"
                                                        onMouseUp={(ev) => {
                                                          setSelectedEventId(
                                                            e._id as Id<"events">,
                                                          );

                                                          setAgendaPopover({
                                                            kind: "event",
                                                            anchor:
                                                              ev.currentTarget as HTMLElement,
                                                            eventId:
                                                              e._id as Id<"events">,
                                                            documentIdForAssociation:
                                                              selectedFrequentDoc ??
                                                              null,
                                                          });
                                                        }}
                                                      >
                                                        <AgendaMiniRow
                                                          item={e}
                                                          kind="event"
                                                          onSelect={(id) =>
                                                            setSelectedEventId(
                                                              id as Id<"events">,
                                                            )
                                                          }
                                                        />
                                                      </div>
                                                    );
                                                  }

                                                  const t =
                                                    node.item as (typeof sorted)[number];

                                                  return (
                                                    <KanbanSortableItem
                                                      key={t._id}
                                                      id={t._id}
                                                      rowStyle={{}}
                                                    >
                                                      {(isDragging) => (
                                                        <div
                                                          className={
                                                            (isDragging
                                                              ? "opacity-50 "
                                                              : "") +
                                                            "relative group"
                                                          }
                                                          onPointerUp={(ev) => {
                                                            try {
                                                              if (
                                                                document.documentElement.classList.contains(
                                                                  "dnd-dragging",
                                                                )
                                                              )
                                                                return;
                                                            } catch {}

                                                            const container =
                                                              ev.currentTarget as HTMLElement;

                                                            const anchor =
                                                              (container.querySelector(
                                                                "[data-agenda-mini-row]",
                                                              ) as HTMLElement | null) ??
                                                              container;

                                                            setAgendaPopover({
                                                              kind: "task",
                                                              anchor,
                                                              taskId:
                                                                t._id as Id<"tasks">,
                                                            });
                                                          }}
                                                          onMouseUp={(ev) => {
                                                            const container =
                                                              ev.currentTarget as HTMLElement;

                                                            const anchor =
                                                              (container.querySelector(
                                                                "[data-agenda-mini-row]",
                                                              ) as HTMLElement | null) ??
                                                              container;

                                                            setAgendaPopover({
                                                              kind: "task",
                                                              anchor,
                                                              taskId:
                                                                t._id as Id<"tasks">,
                                                            });
                                                          }}
                                                          onClick={(ev) => {
                                                            const container =
                                                              ev.currentTarget as HTMLElement;

                                                            const anchor =
                                                              (container.querySelector(
                                                                "[data-agenda-mini-row]",
                                                              ) as HTMLElement | null) ??
                                                              container;

                                                            setAgendaPopover({
                                                              kind: "task",
                                                              anchor,
                                                              taskId:
                                                                t._id as Id<"tasks">,
                                                            });
                                                          }}
                                                        >
                                                          <AgendaMiniRow
                                                            item={t}
                                                            kind="task"
                                                          />
                                                        </div>
                                                      )}
                                                    </KanbanSortableItem>
                                                  );
                                                });
                                              })()}
                                            </div>
                                          </SortableContext>
                                        )}
                                      </div>
                                    </KanbanLane>
                                  );
                                })}
                              </div>
                            )}

                            <DragOverlay dropAnimation={null}>
                              {(() => {
                                if (
                                  !activeAgenda ||
                                  activeAgenda.type !== "task"
                                )
                                  return null;

                                const t = tasksTodayList.find(
                                  (it: any) =>
                                    String(it._id) === activeAgenda.id,
                                );

                                return t ? (
                                  <AgendaMiniRow item={t} kind="task" />
                                ) : null;
                              })()}
                            </DragOverlay>
                          </DndContext>
                        </>
                      );
                    })()}
                  </div>
                )}

                {agendaMode === "weekly" && (
                  <div
                    role="tabpanel"
                    id="agenda-panel-weekly"
                    aria-labelledby="agenda-tab-weekly"
                    className="relative space-y-3"
                  >
                    {/* Singular watermark for weekly agenda */}

                    <span
                      className="document-card__bg document-row__bg text-[var(--accent-primary)]"
                      aria-hidden
                    >
                      <CalendarDays className="h-10 w-10 rotate-12" />
                    </span>

                    {/* Unified navigator is shown above; no weekly-only selector here */}

                    {/* Agenda quick add: simple task-only input (weekly) */}

                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        value={quickAgendaText}
                        onChange={(e) => setQuickAgendaText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void handleQuickAgendaCreate();
                          }
                        }}
                        placeholder={(() => {
                          const isToday = agendaStartUtc === todayStartUtc;

                          const d = new Date(agendaStartUtc + offsetMs);

                          const pretty = d.toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          });

                          const suffix = isToday ? "today" : pretty;

                          return `Quick add task for ${suffix}…`;
                        })()}
                        className="flex-1 text-sm bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md p-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
                      />

                      <button
                        onClick={() => {
                          void handleQuickAgendaCreate();
                        }}
                        disabled={!loggedInUser || !quickAgendaText.trim()}
                        className={`text-[11px] px-2.5 py-1 rounded-md border ${!loggedInUser || !quickAgendaText.trim() ? "bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border-color)] cursor-not-allowed" : "bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary-hover)] border-transparent"}`}
                        title={
                          !loggedInUser
                            ? "Please sign in to create items"
                            : undefined
                        }
                      >
                        Add
                      </button>
                    </div>

                    {/* Weekly unfinished tasks list removed; weekly grid below is sufficient */}

                    {/* Weekly planner for Agenda: reuse WeeklyView */}

                    <WeeklyView />
                  </div>
                )}
              </section>

              {/* Documents grid */}

              <section
                id="documents-grid"
                aria-label="Documents grid"
                className="pt-6 mt-6 border-t-2 border-gray-200"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h2 className={sectionHeader}>Documents & Files</h2>

                    <span
                      className="inline-flex items-center gap-1 px-1.5 py-0 rounded-full border text-[10px] bg-amber-50 text-amber-700 border-amber-200"
                      title="Switch Cards/List/Segmented. Use filters below and star favorites."
                      aria-label="Documents tips"
                    >
                      <Lightbulb className="h-3 w-3 text-amber-500" />
                      Tips
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                      <button
                        onClick={() => setDocViewMode("cards")}
                        className={`px-3 py-1 text-xs font-semibold rounded-md ${docViewMode === "cards" ? "text-gray-800 bg-white shadow" : "text-gray-500 hover:bg-white/50"}`}
                      >
                        Cards
                      </button>

                      <button
                        onClick={() => setDocViewMode("list")}
                        className={`px-3 py-1 text-xs font-semibold rounded-md ${docViewMode === "list" ? "text-gray-800 bg-white shadow" : "text-gray-500 hover:bg-white/50"}`}
                      >
                        List
                      </button>

                      <button
                        onClick={() => setDocViewMode("segmented")}
                        className={`px-3 py-1 text-xs font-semibold rounded-md ${docViewMode === "segmented" ? "text-gray-800 bg-white shadow" : "text-gray-500 hover:bg-white/50"}`}
                        title="Show grouped sections: Calendar, Documents, Files"
                      >
                        Segmented
                      </button>
                    </div>
                  </div>
                </div>

                {/* Dropzone root wrapping filters + grid */}

                <div
                  {...getRootProps({
                    className: "relative",
                    onDragOver: (e: any) => e.preventDefault(),
                  })}
                >
                  <input {...getInputProps()} />

                  {isDragActive && (
                    <div className="absolute inset-0 z-20 rounded-none border-2 border-dashed border-[var(--accent-primary)]/60 bg-[var(--bg-primary)]/80 backdrop-blur-sm flex items-center justify-center">
                      <div className="text-center text-[var(--text-secondary)]">
                        <p className="font-semibold text-[var(--text-primary)]">
                          Drop files to upload
                        </p>

                        <p className="text-xs mt-1">
                          They will be uploaded and analyzed automatically
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Filters / Tools relocated here */}

                  {/* Header controls removed here to avoid duplication; Top Bar owns these controls */}

                  <FiltersToolsBar
                    documentTypes={documentTypes}
                    filter={filter}
                    setFilter={setFilter}
                    countsByFilter={countsByFilter as Record<string, number>}
                    filterButtonRefs={filterButtonRefs}
                    onFilterKeyDown={onFilterKeyDown}
                    viewButtonRef={viewButtonRef}
                    viewMenuRef={viewMenuRef}
                    viewMenuOpen={viewMenuOpen}
                    setViewMenuOpen={setViewMenuOpen}
                    onChangeDensity={onChangeDensity}
                    density={density}
                    showWeekInAgenda={showWeekInAgenda}
                    onToggleShowWeek={onToggleShowWeek}
                    loggedInUser={loggedInUser}
                    isCompiling={isCompiling}
                    handleCompileAaplModel={handleCompileAaplModel}
                    isSeedingOnboarding={isSeedingOnboarding}
                    handleSeedOnboarding={handleSeedOnboarding}
                    isSeedingTimeline={isSeedingTimeline}
                    handleSeedTimeline={handleSeedTimeline}
                    onOpenCalendarPage={() => {
                      try {
                        window.dispatchEvent(
                          new CustomEvent("navigate:calendar"),
                        );
                      } catch {
                        /* no-op */
                      }
                    }}
                    onOpenTimelinePage={() => {
                      try {
                        window.dispatchEvent(
                          new CustomEvent("navigate:timeline"),
                        );
                      } catch {}
                    }}
                    onUploadClick={() => open()}
                    isUploading={isUploading}
                    uploadProgress={uploadProgress}
                    selectedCount={selectedDocIds.size}
                    onBulkToggleFavorite={() => void handleBulkToggleFavorite()}
                    onBulkArchive={() => void handleBulkArchive()}
                    onClearSelection={() => clearSelection()}
                  />

                  {(docViewMode === "list" || docViewMode === "cards") &&
                    filteredDocuments.length === 0 && (
                      <div className="text-sm text-[var(--text-secondary)]">
                        No documents found.
                      </div>
                    )}

                  {docViewMode === "list" ? (
                    <SortableList
                      items={orderedDocuments.map((d) => d._id)}
                      onReorder={(newOrderIds) => {
                        // Prune to currently visible/filtered documents only

                        const valid = new Set(
                          filteredDocuments.map((d) => d._id),
                        );

                        const pruned = newOrderIds.filter((id) =>
                          valid.has(id),
                        );

                        setDocOrderByFilter((prev) => ({
                          ...prev,
                          [filter]: pruned.map((id) => id as string),
                        }));

                        if (loggedInUser) {
                          void saveOrderForFilter({
                            filterKey: filter,
                            order: pruned,
                          }).catch(() => {});
                        } else {
                          try {
                            localStorage.setItem(
                              "nodebench:docOrderByFilter",
                              JSON.stringify({
                                ...docOrderByFilter,
                                [filter]: pruned.map((id) => id as string),
                              }),
                            );
                          } catch {
                            /* no-op */
                          }
                        }
                      }}
                      renderItem={(id, _index, _isDragging) => {
                        const doc = docsById[String(id)];

                        if (!doc) return null;

                        return (
                          <DocumentRow
                            doc={doc}
                            onSelect={handleSelectDocument}
                            onToggleFavorite={handleToggleFavorite}
                            onDelete={handleDeleteDocument}
                            density={density}
                          />
                        );
                      }}
                    />
                  ) : docViewMode === "cards" ? (
                    <DocumentsGridSortable
                      items={orderedDocuments.map((d) => d._id)}
                      onReorder={(newOrderIds) => {
                        // Prune to currently visible/filtered documents only

                        const valid = new Set(
                          filteredDocuments.map((d) => d._id),
                        );

                        const pruned = newOrderIds.filter((id) =>
                          valid.has(id),
                        );

                        setDocOrderByFilter((prev) => ({
                          ...prev,
                          [filter]: pruned.map((id) => String(id)),
                        }));

                        if (loggedInUser) {
                          void saveOrderForFilter({
                            filterKey: filter,
                            order: pruned,
                          }).catch(() => {});
                        } else {
                          try {
                            localStorage.setItem(
                              "nodebench:docOrderByFilter",
                              JSON.stringify({
                                ...docOrderByFilter,
                                [filter]: pruned.map((id) => String(id)),
                              }),
                            );
                          } catch {
                            /* no-op */
                          }
                        }
                      }}
                      renderItem={(id, _index, isDragging) => {
                        const doc = docsById[String(id)];

                        if (!doc) return null;

                        return (
                          <DocumentCardMemo
                            key={doc._id}
                            doc={doc}
                            onSelect={handleSelectDocument}
                            onDelete={handleDeleteDocument}
                            onToggleFavorite={handleToggleFavorite}
                            onOpenMiniEditor={openMiniEditor}
                            hybrid={true}
                            isDragging={isDragging}
                            isSelected={selectedDocIds.has(String(doc._id))}
                            onToggleSelect={(docId) =>
                              toggleSelected(String(docId))
                            }
                            onCardMouseClick={(docId, e) =>
                              handleCardClickWithModifiers(
                                docId,

                                e,

                                `cards:${filter}`,

                                orderedDocuments.map((d) => d._id),
                              )
                            }
                          />
                        );
                      }}
                      gridClassName="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-6"
                    />
                  ) : (
                    <div>
                      {(filter === "all" || filter === "favorites") &&
                        groupedDocuments.favorites.length > 0 && (
                          <div>
                            <h3
                              className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"
                              title="Starred documents you favorited"
                            >
                              <Star className="h-4 w-4 text-yellow-500" />
                              Favorites{" "}
                              <span className="text-[var(--text-secondary)] font-normal">
                                ({groupedDocuments.favorites.length})
                              </span>
                            </h3>

                            <DocumentsGridSortable
                              items={orderDocsBy(
                                segmentedOrderByGroup["favorites"],
                                groupedDocuments.favorites,
                              ).map((d) => d._id)}
                              onReorder={(newOrderIds) => {
                                const groupKey = "favorites";

                                const valid = new Set(
                                  groupedDocuments.favorites.map((d) => d._id),
                                );

                                const pruned = newOrderIds.filter((id) =>
                                  valid.has(id),
                                );

                                setSegmentedOrderByGroup((prev) => ({
                                  ...prev,
                                  [groupKey]: pruned.map((id) => String(id)),
                                }));

                                if (loggedInUser) {
                                  void saveOrderForSegmented({
                                    groupKey,
                                    order: pruned,
                                  }).catch(() => {});
                                } else {
                                  try {
                                    localStorage.setItem(
                                      "nodebench:docOrderBySegmented",
                                      JSON.stringify({
                                        ...segmentedOrderByGroup,
                                        [groupKey]: pruned.map((id) =>
                                          String(id),
                                        ),
                                      }),
                                    );
                                  } catch {
                                    /* no-op */
                                  }
                                }
                              }}
                              renderItem={(id, _index, isDragging) => {
                                const doc =
                                  groupedDocuments.favorites.find(
                                    (d) => d._id === id,
                                  ) ?? docsById[String(id)];

                                if (!doc) return null;

                                return (
                                  <DocumentCardMemo
                                    key={doc._id}
                                    doc={doc}
                                    onSelect={handleSelectDocument}
                                    onDelete={handleDeleteDocument}
                                    onToggleFavorite={handleToggleFavorite}
                                    onOpenMiniEditor={openMiniEditor}
                                    hybrid={true}
                                    isDragging={isDragging}
                                    isSelected={selectedDocIds.has(
                                      String(doc._id),
                                    )}
                                    onToggleSelect={(docId) =>
                                      toggleSelected(String(docId))
                                    }
                                    onCardMouseClick={(docId, e) =>
                                      handleCardClickWithModifiers(
                                        docId,

                                        e,

                                        `segmented:favorites`,

                                        orderDocsBy(
                                          segmentedOrderByGroup["favorites"],
                                          groupedDocuments.favorites,
                                        ).map((d) => d._id),
                                      )
                                    }
                                  />
                                );
                              }}
                              gridClassName="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-6"
                            />
                          </div>
                        )}

                      {(filter === "all" || filter === "calendar") &&
                        groupedDocuments.calendar.length > 0 && (
                          <div>
                            <h3
                              className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"
                              title="Calendar-related items like schedules and events"
                            >
                              <Calendar className="h-4 w-4 text-[var(--accent-primary)]" />
                              Calendar{" "}
                              <span className="text-[var(--text-secondary)] font-normal">
                                ({groupedDocuments.calendar.length})
                              </span>
                            </h3>

                            <DocumentsGridSortable
                              items={orderDocsBy(
                                segmentedOrderByGroup["calendar"],
                                groupedDocuments.calendar,
                              ).map((d) => d._id)}
                              onReorder={(newOrderIds) => {
                                const groupKey = "calendar";

                                const valid = new Set(
                                  groupedDocuments.calendar.map((d) => d._id),
                                );

                                const pruned = newOrderIds.filter((id) =>
                                  valid.has(id),
                                );

                                setSegmentedOrderByGroup((prev) => ({
                                  ...prev,
                                  [groupKey]: pruned.map((id) => String(id)),
                                }));

                                if (loggedInUser) {
                                  void saveOrderForSegmented({
                                    groupKey,
                                    order: pruned,
                                  }).catch(() => {});
                                } else {
                                  try {
                                    localStorage.setItem(
                                      "nodebench:docOrderBySegmented",
                                      JSON.stringify({
                                        ...segmentedOrderByGroup,
                                        [groupKey]: pruned.map((id) =>
                                          String(id),
                                        ),
                                      }),
                                    );
                                  } catch {
                                    /* no-op */
                                  }
                                }
                              }}
                              renderItem={(id, _index, isDragging) => {
                                const doc =
                                  groupedDocuments.calendar.find(
                                    (d) => d._id === id,
                                  ) ?? docsById[String(id)];

                                if (!doc) return null;

                                return (
                                  <DocumentCardMemo
                                    key={doc._id}
                                    doc={doc}
                                    onSelect={handleSelectDocument}
                                    onDelete={handleDeleteDocument}
                                    onToggleFavorite={handleToggleFavorite}
                                    onOpenMiniEditor={openMiniEditor}
                                    hybrid={true}
                                    isDragging={isDragging}
                                    isSelected={selectedDocIds.has(
                                      String(doc._id),
                                    )}
                                    onToggleSelect={(docId) =>
                                      toggleSelected(String(docId))
                                    }
                                    onCardMouseClick={(docId, e) =>
                                      handleCardClickWithModifiers(
                                        docId,

                                        e,

                                        `segmented:calendar`,

                                        orderDocsBy(
                                          segmentedOrderByGroup["calendar"],
                                          groupedDocuments.calendar,
                                        ).map((d) => d._id),
                                      )
                                    }
                                  />
                                );
                              }}
                              gridClassName="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-6"
                            />
                          </div>
                        )}

                      {(filter === "all" || filter === "text") &&
                        groupedDocuments.text.length > 0 && (
                          <div>
                            <h3
                              className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"
                              title="Text documents you created or imported"
                            >
                              <FileText className="h-4 w-4 text-[var(--accent-primary)]" />
                              Documents{" "}
                              <span className="text-[var(--text-secondary)] font-normal">
                                ({groupedDocuments.text.length})
                              </span>
                            </h3>

                            <DocumentsGridSortable
                              items={orderDocsBy(
                                segmentedOrderByGroup["text"],
                                groupedDocuments.text,
                              ).map((d) => d._id)}
                              onReorder={(newOrderIds) => {
                                const groupKey = "text";

                                const valid = new Set(
                                  groupedDocuments.text.map((d) => d._id),
                                );

                                const pruned = newOrderIds.filter((id) =>
                                  valid.has(id),
                                );

                                setSegmentedOrderByGroup((prev) => ({
                                  ...prev,
                                  [groupKey]: pruned.map((id) => String(id)),
                                }));

                                if (loggedInUser) {
                                  void saveOrderForSegmented({
                                    groupKey,
                                    order: pruned,
                                  }).catch(() => {});
                                } else {
                                  try {
                                    localStorage.setItem(
                                      "nodebench:docOrderBySegmented",
                                      JSON.stringify({
                                        ...segmentedOrderByGroup,
                                        [groupKey]: pruned.map((id) =>
                                          String(id),
                                        ),
                                      }),
                                    );
                                  } catch {
                                    /* no-op */
                                  }
                                }
                              }}
                              renderItem={(id, _index, isDragging) => {
                                const doc =
                                  groupedDocuments.text.find(
                                    (d) => d._id === id,
                                  ) ?? docsById[String(id)];

                                if (!doc) return null;

                                return (
                                  <DocumentCardMemo
                                    key={doc._id}
                                    doc={doc}
                                    onSelect={handleSelectDocument}
                                    onDelete={handleDeleteDocument}
                                    onToggleFavorite={handleToggleFavorite}
                                    onOpenMiniEditor={openMiniEditor}
                                    hybrid={true}
                                    isDragging={isDragging}
                                    isSelected={selectedDocIds.has(
                                      String(doc._id),
                                    )}
                                    onToggleSelect={(docId) =>
                                      toggleSelected(String(docId))
                                    }
                                    onCardMouseClick={(docId, e) =>
                                      handleCardClickWithModifiers(
                                        docId,

                                        e,

                                        `segmented:text`,

                                        orderDocsBy(
                                          segmentedOrderByGroup["text"],
                                          groupedDocuments.text,
                                        ).map((d) => d._id),
                                      )
                                    }
                                  />
                                );
                              }}
                              gridClassName="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-6"
                            />
                          </div>
                        )}

                      {(filter === "all" || filter === "files") &&
                        groupedDocuments.files.length > 0 && (
                          <div>
                            <h3
                              className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"
                              title="Uploaded files (PDFs, images, spreadsheets, etc.)"
                            >
                              <File className="h-4 w-4 text-[var(--accent-primary)]" />
                              Files{" "}
                              <span className="text-[var(--text-secondary)] font-normal">
                                ({groupedDocuments.files.length})
                              </span>
                            </h3>

                            <DocumentsGridSortable
                              items={orderDocsBy(
                                segmentedOrderByGroup["files"],
                                groupedDocuments.files,
                              ).map((d) => d._id)}
                              onReorder={(newOrderIds) => {
                                const groupKey = "files";

                                const valid = new Set(
                                  groupedDocuments.files.map((d) => d._id),
                                );

                                const pruned = newOrderIds.filter((id) =>
                                  valid.has(id),
                                );

                                setSegmentedOrderByGroup((prev) => ({
                                  ...prev,
                                  [groupKey]: pruned.map((id) => String(id)),
                                }));

                                if (loggedInUser) {
                                  void saveOrderForSegmented({
                                    groupKey,
                                    order: pruned,
                                  }).catch(() => {});
                                } else {
                                  try {
                                    localStorage.setItem(
                                      "nodebench:docOrderBySegmented",
                                      JSON.stringify({
                                        ...segmentedOrderByGroup,
                                        [groupKey]: pruned.map((id) =>
                                          String(id),
                                        ),
                                      }),
                                    );
                                  } catch {
                                    /* no-op */
                                  }
                                }
                              }}
                              renderItem={(id, _index, isDragging) => {
                                const doc =
                                  groupedDocuments.files.find(
                                    (d) => d._id === id,
                                  ) ?? docsById[String(id)];

                                if (!doc) return null;

                                return (
                                  <DocumentCardMemo
                                    key={doc._id}
                                    doc={doc}
                                    onSelect={handleSelectDocument}
                                    onDelete={handleDeleteDocument}
                                    onToggleFavorite={handleToggleFavorite}
                                    onOpenMiniEditor={openMiniEditor}
                                    hybrid={true}
                                    isDragging={isDragging}
                                    isSelected={selectedDocIds.has(
                                      String(doc._id),
                                    )}
                                    onToggleSelect={(docId) =>
                                      toggleSelected(String(docId))
                                    }
                                    onCardMouseClick={(docId, e) =>
                                      handleCardClickWithModifiers(
                                        docId,

                                        e,

                                        `segmented:files`,

                                        orderDocsBy(
                                          segmentedOrderByGroup["files"],
                                          groupedDocuments.files,
                                        ).map((d) => d._id),
                                      )
                                    }
                                  />
                                );
                              }}
                              gridClassName="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-6"
                            />
                          </div>
                        )}

                      {filter === "all" &&
                        groupedDocuments.calendar.length === 0 &&
                        groupedDocuments.text.length === 0 &&
                        groupedDocuments.files.length === 0 &&
                        groupedDocuments.favorites.length === 0 && (
                          <div className="text-sm text-[var(--text-secondary)]">
                            No documents found.
                          </div>
                        )}

                      {filter !== "all" &&
                        ((filter === "calendar" &&
                          groupedDocuments.calendar.length === 0) ||
                          (filter === "text" &&
                            groupedDocuments.text.length === 0) ||
                          (filter === "files" &&
                            groupedDocuments.files.length === 0) ||
                          (filter === "favorites" &&
                            groupedDocuments.favorites.length === 0)) && (
                          <div className="text-sm text-[var(--text-secondary)]">
                            No documents found.
                          </div>
                        )}
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* Bulk actions moved inline into FiltersToolsBar */}

            {/* Sidebar column */}

            <aside className={`${sidebarOpen ? "w-[320px] md:w-[360px] p-3" : "w-[18px] p-0"} shrink-0 border-l border-[var(--border-color)] bg-[var(--bg-primary)] relative`}>
              <button
                type="button"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                className="absolute -left-2 top-3 w-4 h-6 rounded-sm border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] flex items-center justify-center shadow-sm"
              >
                {sidebarOpen ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
              </button>
              {sidebarOpen && (
                <div className="space-y-4">
                  {/* Widget 1: Mini Month Calendar */}

                  {!_hideCalendarCard && (
                    <SidebarMiniCalendar
                      onSelectDate={(ms) => handleViewWeekLocal(ms)}
                      onViewDay={handleViewDayLocal}
                      onViewWeek={handleViewWeekLocal}
                      showViewFullCalendarLink
                    />
                  )}

                  {/* Widget 2: Upcoming (Tasks & Events) */}

                  <SidebarUpcoming upcoming={upcoming} />
                </div>
              )}
            </aside>
          </div>
        </div>
      </div>

      {/* New Task Modal */}

      {showNewTaskModal && (
        <div
          className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[1px] flex items-center justify-center p-4"
          onClick={() => {
            if (!isSubmittingTask) setShowNewTaskModal(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-task-modal-title"
            className="w-full max-w-md rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            ref={modalRef}
            onKeyDown={handleModalKeyDown}
            aria-busy={isSubmittingTask}
          >
            <div className="px-4 py-3 border-b border-[var(--border-color)] flex items-center justify-between">
              <h3
                id="new-task-modal-title"
                className="text-sm font-semibold text-[var(--text-primary)]"
              >
                New Task
              </h3>

              <button
                aria-label="Close"
                className="w-7 h-7 p-1.5 rounded-md flex items-center justify-center bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-[var(--text-secondary)]"
                onClick={() => !isSubmittingTask && setShowNewTaskModal(false)}
                disabled={isSubmittingTask}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              className="p-4 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (!isSubmittingTask) void handleSubmitNewTask();
              }}
            >
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">
                  Title
                </label>

                <input
                  ref={newTaskTitleRef}
                  type="text"
                  value={newTaskModalTitle}
                  onChange={(e) => setNewTaskModalTitle(e.target.value)}
                  placeholder="e.g., Follow up with design team"
                  className="w-full text-sm bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md p-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
                />
              </div>

              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">
                  Description (optional)
                </label>

                <textarea
                  value={newTaskModalDescription}
                  onChange={(e) => setNewTaskModalDescription(e.target.value)}
                  placeholder="Add a few details to provide context..."
                  rows={3}
                  className="w-full text-sm bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md p-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] resize-y"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-1">
                    Due date
                  </label>

                  <input
                    type="date"
                    value={newTaskModalDue}
                    onChange={(e) => setNewTaskModalDue(e.target.value)}
                    className="w-full text-sm bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md p-2 text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
                  />
                </div>

                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-1">
                    Priority
                  </label>

                  <select
                    value={newTaskModalPriority}
                    onChange={(e) => setNewTaskModalPriority(e.target.value)}
                    className="w-full text-sm bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md p-2 text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
                  >
                    <option value="">None</option>

                    <option value="low">Low</option>

                    <option value="medium">Medium</option>

                    <option value="high">High</option>

                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() =>
                    !isSubmittingTask && setShowNewTaskModal(false)
                  }
                  disabled={isSubmittingTask}
                  className="text-[11px] px-3 py-1.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    !newTaskModalTitle.trim() ||
                    !loggedInUser ||
                    isSubmittingTask
                  }
                  className={`text-[11px] px-3 py-1.5 rounded-md transition-colors ${!newTaskModalTitle.trim() || !loggedInUser || isSubmittingTask ? "bg-[var(--bg-secondary)] text-[var(--text-muted)] border border-[var(--border-color)] cursor-not-allowed" : "bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary-hover)]"}`}
                  title={
                    !loggedInUser ? "Please sign in to create tasks" : undefined
                  }
                >
                  {isSubmittingTask ? "Creating…" : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hide legacy dashboard UI below to achieve minimal layout */}

      <div className="h-full flex flex-col hidden">
        {/* Header */}

        <div className="px-8 py-6 border-b border-[var(--border-color)] bg-[var(--bg-primary)]/80 backdrop-blur-sm">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
              Your Workspace
            </h1>

            <p className="text-[var(--text-secondary)]">
              Choose a document to continue or create something new
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-8 relative z-10">
          {/* Document filter tabs */}

          <div className="max-w-7xl mx-auto mb-4">
            <div
              className="flex flex-wrap items-center gap-2"
              role="tablist"
              aria-label="Document filters"
              aria-orientation="horizontal"
              onKeyDown={onFilterKeyDown}
            >
              {documentTypes.map((t, idx) => {
                const isActive = filter === t.id;

                const count =
                  (countsByFilter as Record<string, number>)[t.id] ?? 0;

                const isFavorites = t.id === "favorites";

                return (
                  <button
                    key={t.id}
                    ref={(el) => {
                      filterButtonRefs.current[idx] = el;
                    }}
                    onClick={() => setFilter(t.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
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
                    <span className="inline-flex items-center gap-2">
                      {t.icon}

                      <span>{t.label}</span>

                      <span className="text-[var(--text-muted)]">
                        ({count})
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div
            role="tabpanel"
            id="filter-panel"
            aria-labelledby={`filter-tab-${filter}`}
          >
            {filter === "all" ? (
              <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main column */}

                <div className="lg:col-span-2 space-y-8">
                  {/* Planner */}

                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-base sm:text-lg font-semibold text-[var(--text-primary)]">
                      Planner
                    </h2>

                    <div className="flex items-center gap-2">
                      <ModeToggle />

                      <div className="relative">
                        <button
                          ref={viewButtonRef}
                          onClick={() => setViewMenuOpen((o) => !o)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                          aria-haspopup="menu"
                          aria-expanded={viewMenuOpen}
                        >
                          <SlidersHorizontal className="h-4 w-4" />

                          <span className="hidden sm:inline">View</span>
                        </button>

                        {viewMenuOpen && (
                          <div
                            ref={viewMenuRef}
                            role="menu"
                            className="absolute right-0 mt-2 w-64 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-xl z-20"
                          >
                            <div className="px-3 py-2 border-b border-[var(--border-color)] text-[var(--text-secondary)] text-xs uppercase tracking-wide">
                              View Options
                            </div>

                            <div className="p-3 space-y-2">
                              <div>
                                <div className="text-xs text-[var(--text-muted)] mb-1">
                                  Density
                                </div>

                                <div className="inline-flex rounded-md overflow-hidden border border-[var(--border-color)]">
                                  <button
                                    onClick={() =>
                                      onChangeDensity("comfortable")
                                    }
                                    className={`px-3 py-1.5 text-sm ${density === "comfortable" ? "bg-[var(--accent-primary)] text-white" : "bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"}`}
                                    aria-pressed={density === "comfortable"}
                                  >
                                    Comfortable
                                  </button>

                                  <button
                                    onClick={() => onChangeDensity("compact")}
                                    className={`px-3 py-1.5 text-sm ${density === "compact" ? "bg-[var(--accent-primary)] text-white" : "bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"}`}
                                    aria-pressed={density === "compact"}
                                  >
                                    Compact
                                  </button>
                                </div>
                              </div>

                              <label className="flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={showWeekInAgenda}
                                  onChange={onToggleShowWeek}
                                />

                                <span>Show "This Week" in agenda</span>
                              </label>
                            </div>
                          </div>
                        )}

                        {mode !== "list" && (
                          <button
                            onClick={() =>
                              void handleAddAllDayEventFromToolbar()
                            }
                            className="flex items-center gap-2 px-3 py-1.5 bg-[var(--accent-primary)] text-white rounded-md hover:bg-[var(--accent-primary-hover)] transition-colors text-sm"
                            disabled={!loggedInUser}
                            title={
                              !loggedInUser
                                ? "Please sign in to create events"
                                : undefined
                            }
                          >
                            <Calendar className="h-4 w-4" /> Add Event
                          </button>
                        )}

                        <button
                          onClick={() => setShowNewTaskModal(true)}
                          className="flex items-center gap-2 px-3 py-1.5 bg-[var(--accent-primary)] text-white rounded-md hover:bg-[var(--accent-primary-hover)] transition-colors text-sm"
                          disabled={!loggedInUser}
                        >
                          <Plus className="h-4 w-4" /> New Task
                        </button>
                      </div>
                    </div>

                    {showToolbarEventDialog && mode !== "list" && (
                      <div className="mt-2">
                        <form
                          className="p-3 border border-[var(--border-color)] rounded-lg bg-[var(--bg-secondary)] flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
                          onSubmit={(e) => {
                            e.preventDefault();
                            void submitToolbarEvent();
                          }}
                        >
                          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md border border-[var(--border-color)] bg-[var(--bg-primary)] flex-1 min-w-0">
                            <Calendar className="h-4 w-4 text-[var(--accent-primary)]" />

                            <input
                              ref={toolbarTitleRef}
                              value={toolbarEventTitle}
                              onChange={(e) =>
                                setToolbarEventTitle(e.target.value)
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  void submitToolbarEvent();
                                }
                              }}
                              placeholder="Event title…"
                              className="w-full bg-transparent outline-none text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)]"
                            />
                          </div>

                          <label className="inline-flex items-center gap-2 text-sm px-2 py-1.5 rounded-md border border-[var(--border-color)] bg-[var(--bg-primary)] select-none">
                            <input
                              type="checkbox"
                              checked={toolbarAllDay}
                              onChange={(e) => {
                                const allDay = e.target.checked;

                                setToolbarAllDay(allDay);

                                const { startStr, endStr } =
                                  defaultEventTimesForToolbar(allDay);

                                setToolbarEventStart(startStr);

                                setToolbarEventEnd(endStr);
                              }}
                            />

                            <span className="text-[var(--text-secondary)]">
                              All-day
                            </span>
                          </label>

                          <input
                            type="datetime-local"
                            value={toolbarEventStart}
                            onChange={(e) => {
                              const v = e.target.value;

                              setToolbarEventStart(v);

                              if (!toolbarEventEnd) {
                                const t = new Date(v);

                                if (!Number.isNaN(t.getTime())) {
                                  const end = new Date(
                                    t.getTime() + 60 * 60 * 1000,
                                  );

                                  setToolbarEventEnd(formatLocalDateTime(end));
                                }
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                void submitToolbarEvent();
                              }
                            }}
                            className="px-2 py-1.5 rounded-md border border-[var(--border-color)] bg-[var(--bg-primary)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)]"
                            aria-label="Event start"
                            disabled={toolbarAllDay}
                            required
                          />

                          <input
                            type="datetime-local"
                            value={toolbarEventEnd}
                            onChange={(e) => setToolbarEventEnd(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                void submitToolbarEvent();
                              }
                            }}
                            className="px-2 py-1.5 rounded-md border border-[var(--border-color)] bg-[var(--bg-primary)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)]"
                            aria-label="Event end"
                            disabled={toolbarAllDay}
                          />

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setShowToolbarEventDialog(false)}
                              className="px-3 py-2 rounded-md border border-[var(--border-color)] bg-[var(--bg-primary)] text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                            >
                              Cancel
                            </button>

                            <button
                              type="submit"
                              className="px-3 py-2 bg-[var(--accent-primary)] text-white rounded-md hover:bg-[var(--accent-primary-hover)] text-sm"
                              disabled={
                                !loggedInUser || !toolbarEventTitle.trim()
                              }
                              title={
                                !loggedInUser
                                  ? "Please sign in to create events"
                                  : undefined
                              }
                            >
                              Create Event
                            </button>
                          </div>
                        </form>
                      </div>
                    )}

                    <div className="mt-2">
                      <AiBar />
                    </div>

                    <div
                      className="mt-4"
                      role="tabpanel"
                      aria-labelledby={
                        mode === "list"
                          ? "planner-tab-list"
                          : mode === "weekly"
                            ? "planner-tab-weekly"
                            : "planner-tab-kanban"
                      }
                      id={
                        mode === "list"
                          ? "planner-panel-list"
                          : mode === "weekly"
                            ? "planner-panel-weekly"
                            : "planner-panel-kanban"
                      }
                    >
                      {mode === "weekly" ? (
                        <WeeklyView />
                      ) : mode === "kanban" ? (
                        <KanbanView />
                      ) : (
                        <ListView />
                      )}
                    </div>
                  </div>

                  {/* Calendar Documents */}

                  {groupedDocuments.calendar.length > 0 && (
                    <div>
                      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-[var(--accent-primary)]" />
                        Calendar Documents
                        <span className="text-sm text-[var(--text-secondary)] font-normal">
                          ({groupedDocuments.calendar.length})
                        </span>
                      </h2>

                      <div className="h-px bg-gradient-to-r from-transparent via-[var(--border-color)] to-transparent mb-6"></div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                        {groupedDocuments.calendar.map((doc) => (
                          <DocumentCardMemo
                            key={doc._id}
                            doc={doc}
                            onSelect={handleSelectDocument}
                            onDelete={handleDeleteDocument}
                            onToggleFavorite={handleToggleFavorite}
                            onAnalyzeFile={runAnalyzeVoid}
                            analyzeRunning={analyzeRunningDocId === doc._id}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Text Documents */}

                  {groupedDocuments.text.length > 0 && (
                    <div>
                      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-[var(--accent-primary)]" />
                        Documents
                        <span className="text-sm text-[var(--text-secondary)] font-normal">
                          ({groupedDocuments.text.length})
                        </span>
                      </h2>

                      <div className="h-px bg-gradient-to-r from-transparent via-[var(--border-color)] to-transparent mb-6"></div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                        {groupedDocuments.text.map((doc) => (
                          <DocumentCardMemo
                            key={doc._id}
                            doc={doc}
                            onSelect={handleSelectDocument}
                            onDelete={handleDeleteDocument}
                            onToggleFavorite={handleToggleFavorite}
                            onAnalyzeFile={runAnalyzeVoid}
                            analyzeRunning={analyzeRunningDocId === doc._id}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* File Documents */}

                  {groupedDocuments.files.length > 0 && (
                    <div>
                      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                        <File className="h-5 w-5 text-[var(--accent-primary)]" />
                        Files
                        <span className="text-sm text-[var(--text-secondary)] font-normal">
                          ({groupedDocuments.files.length})
                        </span>
                      </h2>

                      <div className="h-px bg-gradient-to-r from-transparent via-[var(--border-color)] to-transparent mb-6"></div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                        {groupedDocuments.files.map((doc) => (
                          <DocumentCardMemo
                            key={doc._id}
                            doc={doc}
                            onSelect={handleSelectDocument}
                            onDelete={handleDeleteDocument}
                            onToggleFavorite={handleToggleFavorite}
                            onAnalyzeFile={runAnalyzeVoid}
                            analyzeRunning={analyzeRunningDocId === doc._id}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Loading skeletons while documents fetch */}

                  {isDocsLoading && (
                    <div>
                      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-[var(--accent-primary)]" />
                        Documents
                      </h2>

                      <div className="h-px bg-gradient-to-r from-transparent via-[var(--border-color)] to-transparent mb-6"></div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <DocumentCardSkeleton key={`doc-skeleton-${i}`} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Empty state when no documents exist after loading */}

                  {!isDocsLoading &&
                    groupedDocuments.calendar.length === 0 &&
                    groupedDocuments.text.length === 0 &&
                    groupedDocuments.files.length === 0 && (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-[var(--bg-secondary)] rounded-full flex items-center justify-center mx-auto mb-4 opacity-50">
                          <Archive className="h-8 w-8 text-[var(--text-muted)]" />
                        </div>

                        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                          No documents found
                        </h3>

                        <p className="text-[var(--text-secondary)] mb-4">
                          Create your first document to get started
                        </p>
                      </div>
                    )}
                </div>

                {/* Sidebar */}

                <div className="lg:col-span-1 space-y-8">
                  {/* Activity (Task Updates) */}

                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
                        <Edit3 className="h-5 w-5 text-[var(--accent-primary)]" />
                        Activity
                      </h2>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleAddTask}
                          className="flex items-center gap-2 px-3 py-1.5 bg-[var(--accent-primary)] text-white rounded-md hover:bg-[var(--accent-primary-hover)] transition-colors text-sm"
                          disabled={!loggedInUser}
                          title={
                            !loggedInUser
                              ? "Please sign in to create tasks"
                              : undefined
                          }
                        >
                          <Plus className="h-4 w-4" /> New Task
                        </button>
                      </div>
                    </div>

                    <div className="h-px bg-gradient-to-r from-transparent via-[var(--border-color)] to-transparent mb-6"></div>

                    <div className="space-y-3">
                      {(recentTasks?.length ?? 0) === 0 ? (
                        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-6 text-center">
                          <p className="text-[var(--text-secondary)] mb-3">
                            No recent tasks
                          </p>

                          <button
                            onClick={handleAddTask}
                            className="text-xs px-3 py-1.5 bg-[var(--accent-primary)] text-white rounded-md hover:bg-[var(--accent-primary-hover)] transition-colors"
                            disabled={!loggedInUser}
                          >
                            Create your first task
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {recentTasks.map((t: any) => (
                            <TaskRowGlobal
                              key={t._id}
                              t={t}
                              density={density}
                              onSelect={handleSelectTask}
                              onChangeStatus={(id, status) =>
                                void updateTask({
                                  taskId: id as Id<"tasks">,
                                  status: status as
                                    | "todo"
                                    | "in_progress"
                                    | "done"
                                    | "blocked",
                                })
                              }
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Highlights */}

                  <div>
                    <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-[var(--accent-primary)]" />
                      Highlights
                    </h2>

                    <div className="h-px bg-gradient-to-r from-transparent via-[var(--border-color)] to-transparent mb-4"></div>

                    <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
                      <li>• Review today and plan next actions.</li>

                      <li>• Check Calendar for this week's schedule.</li>

                      <li>• Use Kanban to organize tasks by status.</li>
                    </ul>
                  </div>

                  {/* Recent Documents */}

                  <div>
                    <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                      <FileText className="h-5 w-5 text-[var(--accent-primary)]" />
                      Recent Documents
                    </h2>

                    <div className="h-px bg-gradient-to-r from-transparent via-[var(--border-color)] to-transparent mb-4"></div>

                    {(recentDocuments?.length ?? 0) === 0 ? (
                      <p className="text-sm text-[var(--text-secondary)]">
                        No recent documents
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {recentDocuments.slice(0, 5).map((doc: any) => (
                          <li key={doc._id}>
                            <button
                              type="button"
                              className="w-full text-left text-sm px-3 py-2 rounded-md border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] transition-colors"
                              onClick={() => handleSelectDocument(doc._id)}
                              title={doc.title ?? "Untitled"}
                            >
                              <span className="line-clamp-1">
                                {doc.title ?? "Untitled"}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Tools */}

                  <div>
                    <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                      <Grid3X3 className="h-5 w-5 text-[var(--accent-primary)]" />
                      Tools
                    </h2>

                    <div className="h-px bg-gradient-to-r from-transparent via-[var(--border-color)] to-transparent mb-4"></div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => void handleCreateDocument("text")}
                        className="text-xs px-3 py-2 bg-[var(--accent-primary)] text-white rounded-md hover:bg-[var(--accent-primary-hover)] transition-colors"
                      >
                        New Doc
                      </button>

                      <button
                        onClick={() => void handleCreateDocument("calendar")}
                        className="text-xs px-3 py-2 bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-md hover:bg-[var(--bg-hover)] transition-colors"
                      >
                        Calendar
                      </button>

                      <button
                        onClick={() => {
                          void handleCompileAaplModel();
                        }}
                        disabled={isCompiling}
                        className={`text-xs px-3 py-2 rounded-md transition-colors col-span-2 ${isCompiling ? "bg-[var(--bg-secondary)] text-[var(--text-muted)] border border-[var(--border-color)] cursor-not-allowed" : "bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-color)] hover:bg-[var(--bg-hover)]"}`}
                      >
                        {isCompiling ? "Compiling…" : "Compile AAPL Model"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="max-w-7xl mx-auto space-y-12">
                {/* Quick Actions Section */}

                <div>
                  <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-[var(--accent-primary)]" />
                    Quick Actions
                  </h2>

                  <div className="h-px bg-gradient-to-r from-transparent via-[var(--border-color)] to-transparent mb-6"></div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                    {/* Create New Card */}

                    <div className="group relative">
                      <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] p-6 h-52 flex flex-col items-center justify-center transition-all duration-200 hover:shadow-lg hover:bg-[var(--bg-hover)] cursor-pointer backdrop-blur-sm">
                        <div className="w-12 h-12 bg-[var(--accent-primary)] rounded-full flex items-center justify-center mb-4 shadow-sm group-hover:scale-105 transition-transform duration-200">
                          <Plus className="h-6 w-6 text-white" />
                        </div>

                        <h3 className="font-medium text-[var(--text-primary)] mb-3 text-center">
                          Create New
                        </h3>

                        <div className="flex gap-2">
                          <button
                            onClick={() => void handleCreateDocument("text")}
                            className="text-xs px-3 py-1.5 bg-[var(--accent-primary)] text-white rounded-lg hover:bg-[var(--accent-primary-hover)] transition-colors font-medium"
                          >
                            Document
                          </button>

                          <button
                            onClick={() =>
                              void handleCreateDocument("calendar")
                            }
                            className="text-xs px-3 py-1.5 bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-hover)] transition-colors font-medium"
                          >
                            Calendar
                          </button>

                          <button
                            onClick={() => void handleCreateTimelineDoc()}
                            className="text-xs px-3 py-1.5 bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-hover)] transition-colors font-medium"
                          >
                            Timeline Gantt
                          </button>
                        </div>

                        {/* Agent Hierarchy Card */}

                        <div className="group relative col-span-1 lg:col-span-2">
                          <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] p-6 h-52 flex flex-col transition-all duration-200 hover:shadow-lg hover:bg-[var(--bg-hover)] cursor-default backdrop-blur-sm">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-10 h-10 bg-[var(--accent-primary)] rounded-full flex items-center justify-center shadow-sm">
                                <span className="text-white text-lg">🤖</span>
                              </div>

                              <h3 className="font-medium text-[var(--text-primary)]">
                                Agent Hierarchy
                              </h3>
                            </div>

                            <div className="flex-1 overflow-auto custom-scrollbar pr-1">
                              {userTimelines && userTimelines.length > 0 ? (
                                <ul className="space-y-2">
                                  {userTimelines.slice(0, 6).map((t) => (
                                    <li key={t.timelineId}>
                                      <button
                                        onClick={() =>
                                          handleSelectDocument(t.documentId)
                                        }
                                        className="w-full text-left px-3 py-2 rounded-md border border-[var(--border-color)] bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] flex items-center justify-between gap-2"
                                      >
                                        <span className="truncate">
                                          {t.title}
                                        </span>

                                        <span className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)]">
                                          <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-[var(--border-color)]">
                                            {t.taskCount} tasks
                                          </span>

                                          <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-[var(--border-color)]">
                                            {t.linkCount} links
                                          </span>
                                        </span>
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <div className="text-[var(--text-secondary)] text-sm">
                                  No timelines yet. Create one with the Timeline
                                  Gantt button.
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Compile AAPL Model Card */}

                    <div className="group relative">
                      <div
                        onClick={() => {
                          void handleCompileAaplModel();
                        }}
                        className={`bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] p-6 h-52 flex flex-col items-center justify-center transition-all duration-200 hover:shadow-lg hover:bg-[var(--bg-hover)] cursor-pointer backdrop-blur-sm ${isCompiling ? "opacity-70 pointer-events-none" : ""}`}
                      >
                        <div className="w-12 h-12 bg-[var(--accent-primary)] rounded-full flex items-center justify-center mb-4 shadow-sm group-hover:scale-105 transition-transform duration-200">
                          <Sparkles className="h-6 w-6 text-white" />
                        </div>

                        <h3 className="font-medium text-[var(--text-primary)] mb-2 text-center">
                          {isCompiling ? "Compiling…" : "Compile AAPL Model"}
                        </h3>

                        <p className="text-xs text-[var(--text-secondary)] text-center">
                          {isCompiling
                            ? "Generating CSV + memo"
                            : "Generate 5-year model (CSV) and memo"}
                        </p>
                      </div>
                    </div>

                    {/* Grid Mode Card */}

                    {onGridModeToggle && (
                      <div className="group relative">
                        <div
                          onClick={onGridModeToggle}
                          className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] p-6 h-52 flex flex-col items-center justify-center transition-all duration-200 hover:shadow-lg hover:bg-[var(--bg-hover)] cursor-pointer backdrop-blur-sm"
                        >
                          <div className="w-12 h-12 bg-[var(--accent-secondary)] rounded-full flex items-center justify-center mb-4 shadow-sm group-hover:scale-105 transition-transform duration-200">
                            <Grid3X3 className="h-6 w-6 text-white" />
                          </div>

                          <h3 className="font-medium text-[var(--text-primary)] mb-2 text-center">
                            Grid View
                          </h3>

                          <p className="text-xs text-[var(--text-secondary)] text-center">
                            Multiple documents
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Documents Section */}

                <div>
                  <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                    {filter === "calendar" ? (
                      <>
                        <Calendar className="h-5 w-5 text-[var(--accent-primary)]" />
                        Calendar Documents
                        <span className="text-sm text-[var(--text-secondary)] font-normal">
                          ({filteredDocuments.length})
                        </span>
                      </>
                    ) : filter === "files" ? (
                      <>
                        <File className="h-5 w-5 text-[var(--accent-primary)]" />
                        Files
                        <span className="text-sm text-[var(--text-secondary)] font-normal">
                          ({filteredDocuments.length})
                        </span>
                      </>
                    ) : filter === "favorites" ? (
                      <>
                        <Star className="h-5 w-5 text-[var(--accent-primary)]" />
                        Favorites
                        <span className="text-sm text-[var(--text-secondary)] font-normal">
                          ({filteredDocuments.length})
                        </span>
                      </>
                    ) : (
                      <>
                        <FileText className="h-5 w-5 text-[var(--accent-primary)]" />
                        Documents
                        <span className="text-sm text-[var(--text-secondary)] font-normal">
                          ({filteredDocuments.length})
                        </span>
                      </>
                    )}
                  </h2>

                  <div className="h-px bg-gradient-to-r from-transparent via-[var(--border-color)] to-transparent mb-6"></div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                    {filteredDocuments.map((doc) => (
                      <DocumentCardMemo
                        key={doc._id}
                        doc={doc}
                        onSelect={handleSelectDocument}
                        onDelete={handleDeleteDocument}
                        onToggleFavorite={handleToggleFavorite}
                        onOpenMiniEditor={openMiniEditor}
                      />
                    ))}
                  </div>

                  {/* Empty State */}

                  {filteredDocuments.length === 0 && (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-[var(--bg-secondary)] rounded-full flex items-center justify-center mx-auto mb-4 opacity-50">
                        <Archive className="h-8 w-8 text-[var(--text-muted)]" />
                      </div>

                      <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                        No documents found
                      </h3>

                      <p className="text-[var(--text-secondary)] mb-4">
                        {filter === "all"
                          ? "Create your first document to get started"
                          : `No ${filter} documents found. Try a different filter or create a new document.`}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* New Task Modal */}

            {showNewTaskModal && (
              <div
                className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[1px] flex items-center justify-center p-4"
                onClick={() => {
                  if (!isSubmittingTask) setShowNewTaskModal(false);
                }}
              >
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="new-task-modal-title"
                  className="w-full max-w-md rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                  ref={modalRef}
                  onKeyDown={handleModalKeyDown}
                  aria-busy={isSubmittingTask}
                >
                  <div className="px-4 py-3 border-b border-[var(--border-color)] flex items-center justify-between">
                    <h3
                      id="new-task-modal-title"
                      className="text-sm font-semibold text-[var(--text-primary)]"
                    >
                      New Task
                    </h3>

                    <button
                      aria-label="Close"
                      className="w-7 h-7 p-1.5 rounded-md flex items-center justify-center bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-[var(--text-secondary)]"
                      onClick={() =>
                        !isSubmittingTask && setShowNewTaskModal(false)
                      }
                      disabled={isSubmittingTask}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <form
                    className="p-4 space-y-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!isSubmittingTask) void handleSubmitNewTask();
                    }}
                  >
                    <div>
                      <label className="block text-xs text-[var(--text-muted)] mb-1">
                        Title
                      </label>

                      <input
                        ref={newTaskTitleRef}
                        type="text"
                        value={newTaskModalTitle}
                        onChange={(e) => setNewTaskModalTitle(e.target.value)}
                        placeholder="e.g., Follow up with design team"
                        className="w-full text-sm bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md p-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-[var(--text-muted)] mb-1">
                        Description (optional)
                      </label>

                      <textarea
                        value={newTaskModalDescription}
                        onChange={(e) =>
                          setNewTaskModalDescription(e.target.value)
                        }
                        placeholder="Add a few details to provide context..."
                        rows={3}
                        className="w-full text-sm bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md p-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] resize-y"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-[var(--text-muted)] mb-1">
                          Due date
                        </label>

                        <input
                          type="date"
                          value={newTaskModalDue}
                          onChange={(e) => setNewTaskModalDue(e.target.value)}
                          className="w-full text-sm bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md p-2 text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-[var(--text-muted)] mb-1">
                          Priority
                        </label>

                        <select
                          value={newTaskModalPriority}
                          onChange={(e) =>
                            setNewTaskModalPriority(e.target.value)
                          }
                          className="w-full text-sm bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md p-2 text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
                        >
                          <option value="">None</option>

                          <option value="low">Low</option>

                          <option value="medium">Medium</option>

                          <option value="high">High</option>

                          <option value="urgent">Urgent</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() =>
                          !isSubmittingTask && setShowNewTaskModal(false)
                        }
                        disabled={isSubmittingTask}
                        className="text-[11px] px-3 py-1.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]"
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        disabled={
                          !newTaskModalTitle.trim() ||
                          !loggedInUser ||
                          isSubmittingTask
                        }
                        className={`text-[11px] px-3 py-1.5 rounded-md transition-colors ${!newTaskModalTitle.trim() || !loggedInUser || isSubmittingTask ? "bg-[var(--bg-secondary)] text-[var(--text-muted)] border border-[var(--border-color)] cursor-not-allowed" : "bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary-hover)]"}`}
                        title={
                          !loggedInUser
                            ? "Please sign in to create tasks"
                            : undefined
                        }
                      >
                        {isSubmittingTask ? "Creating…" : "Create Task"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Unified Task Editor Panel (overlay only outside list mode) */}

            {selectedTaskId && mode !== "list" && (
              <TaskEditorPanel
                taskId={selectedTaskId}
                onClose={() => onClearTaskSelection?.()}
              />
            )}

            {/* Centralized Agenda Create (floating popover) */}

            {inlineCreate && (
              <div
                className="fixed z-[70]"
                style={{ right: 24, bottom: 24 }}
                role="dialog"
                aria-label="Create agenda item"
              >
                <div className="w-[min(520px,calc(100vw-32px))] rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-2xl">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-color)] bg-[var(--bg-primary)] rounded-t-xl">
                    <div className="text-xs text-[var(--text-secondary)]">
                      Create on{" "}
                      {new Date(inlineCreate.dateMs).toLocaleDateString()}
                    </div>

                    <button
                      aria-label="Close create panel"
                      className="w-7 h-7 p-1.5 rounded-md flex items-center justify-center bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-[var(--text-secondary)]"
                      onClick={() => setInlineCreate(null)}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="p-3">
                    <MiniAgendaEditorPanel
                      kind="create"
                      dateMs={inlineCreate.dateMs}
                      defaultKind={inlineCreate.defaultKind}
                      defaultTitle={inlineCreate.defaultTitle}
                      defaultAllDay={inlineCreate.defaultAllDay}
                      onClose={() => setInlineCreate(null)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Event popovers are global via MiniAgendaEditorPanel; overlay removed */}

            {/* Mini Editor Popover */}

            {!_hideCalendarCard && (
              <MiniEditorPopover
                isOpen={!!miniEditorDocId}
                documentId={miniEditorDocId}
                anchorEl={miniEditorAnchor}
                onClose={closeMiniEditor}
              />
            )}

            {/* Agenda Editor Popover for weekly editing (events) */}

            {agendaPopover && (
              <AgendaEditorPopover
                isOpen={true}
                anchorEl={agendaPopover.anchor}
                onClose={() => setAgendaPopover(null)}
                kind={agendaPopover.kind}
                eventId={
                  agendaPopover.kind === "event"
                    ? agendaPopover.eventId
                    : undefined
                }
                taskId={
                  agendaPopover.kind === "task"
                    ? agendaPopover.taskId
                    : undefined
                }
                dateMs={
                  agendaPopover.kind === "create" ||
                  agendaPopover.kind === "createBoth"
                    ? agendaPopover.dateMs
                    : undefined
                }
                defaultKind={
                  agendaPopover.kind === "create" ||
                  agendaPopover.kind === "createBoth"
                    ? agendaPopover.defaultKind
                    : undefined
                }
                defaultTitle={
                  agendaPopover.kind === "create" ||
                  agendaPopover.kind === "createBoth"
                    ? agendaPopover.defaultTitle
                    : undefined
                }
                defaultAllDay={
                  agendaPopover.kind === "create" ||
                  agendaPopover.kind === "createBoth"
                    ? agendaPopover.defaultAllDay
                    : undefined
                }
                documentIdForAssociation={
                  agendaPopover.kind === "event" ||
                  agendaPopover.kind === "createBoth"
                    ? agendaPopover.documentIdForAssociation
                    : undefined
                }
              />
            )}

            {/* Global lightweight hover preview (tasks/events) */}

            {hoverPreview && (
              <AgendaHoverPreview
                anchorEl={hoverPreview.anchorEl}
                open={true}
                kind={hoverPreview.kind}
                item={hoverPreview.item}
                onMouseEnterPopover={() => {
                  if (hoverTimerRef.current) {
                    window.clearTimeout(hoverTimerRef.current);
                    hoverTimerRef.current = null;
                  }

                  setHoverLock(true);
                }}
                onMouseLeavePopover={() => {
                  setHoverLock(false);

                  setHoverPreview(null);
                }}
              />
            )}

            {/* Global overlay removed: overlay is handled by the local dropzone root above to mirror Sidebar */}
          </div>
        </div>
      </div>
    </>
  );
}
