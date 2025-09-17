import React, { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { X, Trash2, Calendar, Flag, ChevronDown, Tag, User, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import EditorJS from "@editorjs/editorjs";
import Header from "@editorjs/header";
import List from "@editorjs/list";
import Checklist from "@editorjs/checklist";
import Delimiter from "@editorjs/delimiter";
import Quote from "@editorjs/quote";
import CodeTool from "@editorjs/code";

type RefItem = { kind: "document" | "task" | "event"; id: string };

export default function InlineTaskEditor({ taskId, onClose }: { taskId: Id<"tasks">; onClose: () => void }) {
  const task = useQuery(api.tasks.getTask, { taskId });
  const updateTask = useMutation(api.tasks.updateTask);
  const deleteTask = useMutation(api.tasks.deleteTask);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"todo" | "in_progress" | "done" | "blocked">("todo");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent" | undefined>(undefined);

  // Dates: date-only and optional time-of-day variants
  const [startDateStr, setStartDateStr] = useState<string>("");
  const [dueDateStr, setDueDateStr] = useState<string>("");
  const [useStartTime, setUseStartTime] = useState<boolean>(false);
  const [useDueTime, setUseDueTime] = useState<boolean>(false);
  const [startDateTimeStr, setStartDateTimeStr] = useState<string>("");
  const [dueDateTimeStr, setDueDateTimeStr] = useState<string>("");

  // New: tags, assignee, references
  const [tags, setTags] = useState<string[]>([]);
  const [showTagsEditor, setShowTagsEditor] = useState(false);

  const [assigneeId, setAssigneeId] = useState<Id<"users"> | undefined>(undefined);
  const [showAssigneeEditor, setShowAssigneeEditor] = useState(false);
  const [assigneeQuery, setAssigneeQuery] = useState("");
  const userCandidates = useQuery(api.users.list, { query: assigneeQuery, limit: 8 });

  const [refs, setRefs] = useState<Array<RefItem>>([]);
  const [showRefsEditor, setShowRefsEditor] = useState(false);
  const [newRefKind, setNewRefKind] = useState<RefItem["kind"]>("document");
  const [newRefId, setNewRefId] = useState("");

  const [_isSaving, setIsSaving] = useState(false);
  const [saveHint, setSaveHint] = useState<"idle" | "saving" | "saved" | "unsaved">("idle");
  const titleRef = useRef<HTMLInputElement | null>(null);
  const lastSavedRef = useRef<string>("");
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showDuePicker, setShowDuePicker] = useState(false);
  // Hook provided by TaskRichEditor to get Editor.js JSON output on demand
  const getEditorJsonRef = useRef<null | (() => Promise<any>)>(null);

  useEffect(() => {
    if (!task) return;
    setTitle(task.title ?? "");
    setDescription(task.description ?? "");
    setStatus((task.status as any) ?? "todo");
    setPriority(task.priority as any);

    setStartDateStr(task.startDate ? toInputDate(task.startDate) : "");
    setDueDateStr(task.dueDate ? toInputDate(task.dueDate) : "");
    // Seed datetime strings from existing values; toggles default to false
    setStartDateTimeStr(task.startDate ? toInputDateTimeLocal(task.startDate) : "");
    setDueDateTimeStr(task.dueDate ? toInputDateTimeLocal(task.dueDate) : "");
    setUseStartTime(false);
    setUseDueTime(false);

    setTags(Array.isArray(task.tags) ? task.tags : []);
    setAssigneeId(task.assigneeId as any);
    setRefs(Array.isArray(task.refs) ? (task.refs as any[]).map((r) => ({ kind: r.kind, id: String(r.id) })) : []);

    // Record baseline snapshot for autosave comparisons
    lastSavedRef.current = JSON.stringify({
      title: task.title ?? "",
      description: task.description ?? "",
      status: (task.status as any) ?? "todo",
      priority: task.priority ?? undefined,
      startDateStr: task.startDate ? toInputDate(task.startDate) : "",
      dueDateStr: task.dueDate ? toInputDate(task.dueDate) : "",
      useStartTime: false,
      useDueTime: false,
      startDateTimeStr: task.startDate ? toInputDateTimeLocal(task.startDate) : "",
      dueDateTimeStr: task.dueDate ? toInputDateTimeLocal(task.dueDate) : "",
      tags: Array.isArray(task.tags) ? task.tags : [],
      assigneeId: task.assigneeId ?? null,
      refs: Array.isArray(task.refs) ? (task.refs as any[]).map((r) => ({ kind: r.kind, id: String(r.id) })) : [],
    });
    // Focus title like Notion
    requestAnimationFrame(() => {
      if (titleRef.current) {
        const el = titleRef.current;
        el.focus();
        const len = el.value.length;
        try { el.setSelectionRange(len, len); } catch { void 0; }
      }
    });
  }, [task]);

  const saveTask = useCallback(async () => {
    if (!task) return;
    setIsSaving(true);
    setSaveHint("saving");
    try {
      let descriptionJson: string | undefined = undefined;
      try {
        const getter = getEditorJsonRef.current;
        if (getter) {
          const json = await getter();
          if (json) descriptionJson = JSON.stringify(json);
        }
      } catch { /* ignore */ }

      // Compute timestamps respecting optional time-of-day
      const startTs = useStartTime
        ? (startDateTimeStr ? fromInputDateTimeLocal(startDateTimeStr) : undefined)
        : (startDateStr ? fromInputDate(startDateStr) : undefined);
      const dueTs = useDueTime
        ? (dueDateTimeStr ? fromInputDateTimeLocal(dueDateTimeStr) : undefined)
        : (dueDateStr ? fromInputDate(dueDateStr) : undefined);

      // Build refs in schema shape (best-effort casting)
      const refsOut = refs.map((r) => (
        r.kind === "document"
          ? ({ kind: "document" as const, id: r.id as Id<"documents"> })
          : r.kind === "task"
          ? ({ kind: "task" as const, id: r.id as Id<"tasks"> })
          : ({ kind: "event" as const, id: r.id as Id<"events"> })
      ));

      await updateTask({
        taskId,
        title: title.trim() || task.title,
        description: description.trim(),
        descriptionJson,
        status,
        priority,
        startDate: startTs,
        dueDate: dueTs,
        tags,
        assigneeId,
        refs: refsOut as any,
      });
      // snapshot after successful save
      lastSavedRef.current = JSON.stringify({
        title: title.trim() || task.title,
        description: description.trim(),
        status,
        priority,
        startDateStr,
        dueDateStr,
        useStartTime,
        useDueTime,
        startDateTimeStr,
        dueDateTimeStr,
        tags,
        assigneeId: assigneeId ?? null,
        refs,
      });
      setSaveHint("saved");
      setTimeout(() => setSaveHint("idle"), 1200);
    } catch (e) {
      console.error(e);
      toast.error("Failed to save task");
    } finally {
      setIsSaving(false);
    }
  }, [task, taskId, title, description, status, priority, startDateStr, dueDateStr, useStartTime, useDueTime, startDateTimeStr, dueDateTimeStr, tags, assigneeId, refs, updateTask]);

  // Manual save via keyboard (doesn't close, Notion-like)
  const handleSave = useCallback(async () => {
    await saveTask();
  }, [saveTask]);

  // Intercept Esc and Ctrl/Cmd+S. Prompt on discard if there are unsaved changes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (saveHint === "unsaved") {
          const discard = window.confirm("Discard unsaved changes?");
          if (!discard) return;
        }
        onClose();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void handleSave();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, handleSave, saveHint]);

  // Track dirty state (unsaved changes) without autosaving.
  useEffect(() => {
    if (!task) return;
    const current = JSON.stringify({
      title, description, status, priority,
      startDateStr, dueDateStr,
      useStartTime, useDueTime,
      startDateTimeStr, dueDateTimeStr,
      tags, assigneeId: assigneeId ?? null, refs,
    });
    if (current === lastSavedRef.current) {
      setSaveHint((prev) => (prev === "saved" ? "saved" : "idle"));
    } else {
      setSaveHint("unsaved");
    }
  }, [title, description, status, priority, startDateStr, dueDateStr, useStartTime, useDueTime, startDateTimeStr, dueDateTimeStr, tags, assigneeId, refs, task]);

  // Warn on tab close/reload if unsaved changes exist
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveHint === "unsaved") {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [saveHint]);

  const handleDelete = async () => {
    if (!task) return;
    const ok = window.confirm("Delete this task?");
    if (!ok) return;
    try {
      await deleteTask({ taskId });
      toast.success("Task deleted");
      onClose();
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete task");
    }
  };

  if (task === undefined) {
    return (
      <div className="mt-2 border border-[var(--border-color)] rounded-xl p-4 bg-[var(--bg-secondary)]">
        <div className="animate-pulse h-5 w-36 bg-[var(--bg-primary)] rounded mb-3" />
        <div className="space-y-2">
          <div className="h-4 bg-[var(--bg-primary)] rounded" />
          <div className="h-4 bg-[var(--bg-primary)] rounded w-5/6" />
          <div className="h-4 bg-[var(--bg-primary)] rounded w-2/3" />
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="mt-2 border border-[var(--border-color)] rounded-xl p-4 bg-[var(--bg-secondary)] flex items-center justify-between">
        <div className="text-sm text-[var(--text-secondary)]">Task not found</div>
        <button
          className="w-8 h-8 rounded-md flex items-center justify-center bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)]"
          onClick={onClose}
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  const assigneeDisplay = (() => {
    const hit = (userCandidates ?? []).find((u: any) => String(u?._id) === String(assigneeId));
    return hit?.name || (assigneeId ? String(assigneeId).slice(0, 6) : "");
  })();

  return (
    <div
      className="mt-2 rounded-lg p-3 bg-[var(--bg-primary)] border border-[var(--border-color)]/60 transition-all relative z-10 pointer-events-auto"
      data-inline-editor="true"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {/* Top bar: actions and save hint */}
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[11px] text-[var(--text-muted)]">Press Esc to close · Ctrl/Cmd+S to save</div>
        <div className="flex items-center gap-2">
          <div className="text-[11px] text-[var(--text-muted)]">
            {saveHint === "saving" ? "Saving…" : saveHint === "saved" ? "Saved" : saveHint === "unsaved" ? "Unsaved changes" : ""}
          </div>
          <button
            onClick={() => { void handleSave(); }}
            disabled={saveHint !== "unsaved" || _isSaving}
            className={`h-7 px-3 rounded-md flex items-center justify-center border text-[12px] ${
              saveHint === "unsaved" && !_isSaving
                ? "bg-[var(--accent-primary)] text-white border-[var(--accent-primary)] hover:opacity-90"
                : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)] opacity-70 cursor-not-allowed"
            }`}
            title="Save changes"
          >
            Save
          </button>
          <button
            onClick={() => { void handleDelete(); }}
            className="w-7 h-7 rounded-md flex items-center justify-center bg-[var(--bg-secondary)] hover:bg-red-500 text-[var(--text-secondary)] hover:text-white border border-[var(--border-color)] hover:border-red-500"
            title="Delete task"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              if (saveHint === "unsaved") {
                const discard = window.confirm("Discard unsaved changes?");
                if (!discard) return;
              }
              onClose();
            }}
            className="w-7 h-7 rounded-md flex items-center justify-center bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] border border-[var(--border-color)]"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="space-y-3">
        {/* Title - flat input, border only on focus */}
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          ref={titleRef}
          className="w-full text-sm bg-transparent border border-transparent rounded-md px-0 py-1 text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
          placeholder="Untitled"
        />

        {/* Chips under title */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Status chip */}
          <button
            type="button"
            onClick={() => {
              const order: Array<typeof status> = ["todo", "in_progress", "done", "blocked"];
              const i = order.indexOf(status);
              setStatus(order[(i + 1) % order.length]);
            }}
            className={`pill pill--type inline-flex items-center gap-1 text-[11px] ${
              status === "done"
                ? "bg-green-100 text-green-700 border-green-200 dark:bg-[var(--bg-primary)] dark:text-green-400 dark:border-[var(--border-color)]"
                : status === "in_progress"
                ? "bg-blue-100 text-blue-700 border-blue-200 dark:bg-[var(--bg-primary)] dark:text-blue-400 dark:border-[var(--border-color)]"
                : status === "blocked"
                ? "bg-red-100 text-red-700 border-red-200 dark:bg-[var(--bg-primary)] dark:text-red-400 dark:border-[var(--border-color)]"
                : "bg-gray-100 text-gray-700 border-gray-200 dark:bg-[var(--bg-primary)] dark:text-[var(--text-secondary)] dark:border-[var(--border-color)]"
            }`}
            title="Click to cycle status"
          >
            <ChevronDown className="w-3 h-3 opacity-70" />
            {status === "todo" ? "Todo" : status === "in_progress" ? "In Progress" : status === "done" ? "Done" : "Blocked"}
          </button>

          {/* Priority chip */}
          <button
            type="button"
            onClick={() => {
              const order: Array<typeof priority> = [undefined, "low", "medium", "high", "urgent"];
              const i = order.indexOf(priority);
              setPriority(order[(i + 1) % order.length]);
            }}
            className={`pill pill--type inline-flex items-center gap-1 text-[11px] ${
              priority === "urgent"
                ? "bg-red-100 text-red-700 border-red-200 dark:bg-[var(--bg-primary)] dark:text-red-400 dark:border-[var(--border-color)]"
                : priority === "high"
                ? "bg-orange-100 text-orange-700 border-orange-200 dark:bg-[var(--bg-primary)] dark:text-orange-400 dark:border-[var(--border-color)]"
                : priority === "medium"
                ? "bg-amber-100 text-amber-700 border-amber-200 dark:bg-[var(--bg-primary)] dark:text-amber-300 dark:border-[var(--border-color)]"
                : priority === "low"
                ? "bg-gray-100 text-gray-700 border-gray-200 dark:bg-[var(--bg-primary)] dark:text-[var(--text-secondary)] dark:border-[var(--border-color)]"
                : "bg-gray-100 text-gray-700 border-gray-200 dark:bg-[var(--bg-primary)] dark:text-[var(--text-secondary)] dark:border-[var(--border-color)]"
            }`}
            title="Click to cycle priority"
          >
            <Flag className="w-3 h-3 opacity-70" />
            {priority ? `Priority: ${priority}` : "Priority"}
          </button>

          {/* Start date chip */}
          <button
            type="button"
            onClick={() => setShowStartPicker((v) => !v)}
            className="pill pill--time inline-flex items-center gap-1 text-[11px]"
            title="Set start date/time"
            aria-expanded={showStartPicker}
            aria-controls={`start-picker-${String(taskId)}`}
          >
            <Calendar className="w-3 h-3 opacity-70" />
            {useStartTime
              ? (startDateTimeStr ? `Start: ${startDateTimeStr}` : "Start time")
              : (startDateStr ? `Start: ${startDateStr}` : "Start date")}
          </button>

          {/* Due date chip */}
          <button
            type="button"
            onClick={() => setShowDuePicker((v) => !v)}
            className="pill pill--time inline-flex items-center gap-1 text-[11px]"
            title="Set due date/time"
            aria-expanded={showDuePicker}
            aria-controls={`due-picker-${String(taskId)}`}
          >
            <Calendar className="w-3 h-3 opacity-70" />
            {useDueTime
              ? (dueDateTimeStr ? `Due: ${dueDateTimeStr}` : "Due time")
              : (dueDateStr ? `Due: ${dueDateStr}` : "Due date")}
          </button>

          {/* Tags pill */}
          <button
            type="button"
            onClick={() => setShowTagsEditor((v) => !v)}
            className="pill pill--time inline-flex items-center gap-1 text-[11px]"
            title="Edit tags"
            aria-expanded={showTagsEditor}
          >
            <Tag className="w-3 h-3 opacity-70" /> {tags.length > 0 ? `${tags.length} tag${tags.length > 1 ? "s" : ""}` : "Tags"}
          </button>

          {/* Assignee pill */}
          <button
            type="button"
            onClick={() => setShowAssigneeEditor((v) => !v)}
            className="pill pill--time inline-flex items-center gap-1 text-[11px]"
            title="Set assignee"
            aria-expanded={showAssigneeEditor}
          >
            <User className="w-3 h-3 opacity-70" /> {assigneeDisplay ? assigneeDisplay : "Assignee"}
          </button>

          {/* References pill */}
          <button
            type="button"
            onClick={() => setShowRefsEditor((v) => !v)}
            className="pill pill--time inline-flex items-center gap-1 text-[11px]"
            title="Add references"
            aria-expanded={showRefsEditor}
          >
            <LinkIcon className="w-3 h-3 opacity-70" /> {refs.length > 0 ? `${refs.length} link${refs.length > 1 ? "s" : ""}` : "Links"}
          </button>
        </div>

        {/* Inline date/time pickers (toggled) */}
        {(showStartPicker || showDuePicker) && (
          <div className="flex flex-col gap-2">
            {showStartPicker && (
              <div className="flex items-center gap-3 flex-wrap">
                <label className="text-[11px] text-[var(--text-secondary)] inline-flex items-center gap-1">
                  <input type="checkbox" checked={useStartTime} onChange={(e) => setUseStartTime(e.target.checked)} /> Include time
                </label>
                {useStartTime ? (
                  <input
                    type="datetime-local"
                    value={startDateTimeStr}
                    onChange={(e) => setStartDateTimeStr(e.target.value)}
                    id={`start-picker-${String(taskId)}`}
                    className="text-sm bg-transparent border border-transparent rounded-md px-0 py-1 text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
                  />
                ) : (
                  <input
                    type="date"
                    value={startDateStr}
                    onChange={(e) => setStartDateStr(e.target.value)}
                    id={`start-picker-${String(taskId)}`}
                    className="text-sm bg-transparent border border-transparent rounded-md px-0 py-1 text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
                  />
                )}
              </div>
            )}
            {showDuePicker && (
              <div className="flex items-center gap-3 flex-wrap">
                <label className="text-[11px] text-[var(--text-secondary)] inline-flex items-center gap-1">
                  <input type="checkbox" checked={useDueTime} onChange={(e) => setUseDueTime(e.target.checked)} /> Include time
                </label>
                {useDueTime ? (
                  <input
                    type="datetime-local"
                    value={dueDateTimeStr}
                    onChange={(e) => setDueDateTimeStr(e.target.value)}
                    id={`due-picker-${String(taskId)}`}
                    className="text-sm bg-transparent border border-transparent rounded-md px-0 py-1 text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
                  />
                ) : (
                  <input
                    type="date"
                    value={dueDateStr}
                    onChange={(e) => setDueDateStr(e.target.value)}
                    id={`due-picker-${String(taskId)}`}
                    className="text-sm bg-transparent border border-transparent rounded-md px-0 py-1 text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* Tags editor */}
        {showTagsEditor && (
          <div className="flex flex-wrap items-center gap-1 mt-1.5">
            {tags.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)]">
                {t}
                <button type="button" onClick={() => setTags((prev) => prev.filter((x) => x !== t))} className="text-[10px] opacity-70 hover:opacity-100" title="Remove tag">×</button>
              </span>
            ))}
            <input
              type="text"
              placeholder="Add tag…"
              className="text-[11px] bg-transparent border border-transparent rounded-md px-1.5 py-0.5 text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
              onKeyDown={(e) => {
                const el = e.currentTarget as HTMLInputElement;
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  const val = el.value.trim();
                  if (val && !tags.includes(val)) setTags((prev) => [...prev, val]);
                  el.value = "";
                }
              }}
            />
          </div>
        )}

        {/* Assignee editor */}
        {showAssigneeEditor && (
          <div className="flex flex-col gap-2 mt-1.5">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={assigneeQuery}
                onChange={(e) => setAssigneeQuery(e.target.value)}
                placeholder="Search users…"
                className="text-[11px] bg-transparent border border-[var(--border-color)] rounded-md px-2 py-1 text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
              />
              <button
                type="button"
                className="text-[11px] px-2 py-0.5 rounded border border-[var(--border-color)] text-[var(--text-secondary)] bg-[var(--bg-secondary)]"
                onClick={() => setAssigneeId(undefined)}
                title="Clear assignee"
              >
                Clear
              </button>
            </div>
            <div className="max-h-40 overflow-auto border border-[var(--border-color)] rounded-md">
              {(userCandidates ?? []).map((u: any) => (
                <button
                  key={String(u._id)}
                  type="button"
                  onClick={() => setAssigneeId(u._id)}
                  className={`w-full text-left px-2 py-1 text-[12px] hover:bg-[var(--bg-hover)] ${String(u._id) === String(assigneeId) ? "bg-[var(--bg-secondary)]" : ""}`}
                >
                  {u.name || String(u._id)}
                </button>
              ))}
              {(userCandidates ?? []).length === 0 && (
                <div className="px-2 py-1 text-[12px] text-[var(--text-muted)]">No results</div>
              )}
            </div>
          </div>
        )}

        {/* References editor */}
        {showRefsEditor && (
          <div className="flex flex-col gap-2 mt-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              {refs.map((r, idx) => (
                <span key={`${r.kind}:${r.id}:${idx}`} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)]">
                  {r.kind}:{String(r.id).slice(0, 8)}
                  <button type="button" className="text-[10px] opacity-70 hover:opacity-100" onClick={() => setRefs((prev) => prev.filter((_, i) => i !== idx))} title="Remove">×</button>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={newRefKind}
                onChange={(e) => setNewRefKind(e.target.value as RefItem["kind"]) }
                className="text-[11px] bg-transparent border border-[var(--border-color)] rounded-md px-2 py-1 text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
              >
                <option value="document">Document</option>
                <option value="task">Task</option>
                <option value="event">Event</option>
              </select>
              <input
                type="text"
                value={newRefId}
                onChange={(e) => setNewRefId(e.target.value)}
                placeholder="Paste ID…"
                className="text-[11px] bg-transparent border border-[var(--border-color)] rounded-md px-2 py-1 text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
              />
              <button
                type="button"
                className="text-[11px] px-2 py-0.5 rounded border border-[var(--border-color)] text-[var(--text-secondary)] bg-[var(--bg-secondary)]"
                onClick={() => {
                  const id = newRefId.trim();
                  if (!id) return;
                  setRefs((prev) => [...prev, { kind: newRefKind, id }]);
                  setNewRefId("");
                }}
              >
                Add
              </button>
            </div>
          </div>
        )}

        {/* Description - rich editor (Editor.js adapter) */}
        <div className="w-full border border-[var(--border-color)]/60 rounded-md bg-[var(--bg-secondary)]">
          <TaskRichEditor
            value={description}
            onChange={setDescription}
            placeholder="Write details…"
            initialJson={(task as any)?.descriptionJson}
            registerSaveExtractor={(fn) => { getEditorJsonRef.current = fn; }}
            onSetStatus={(s) => setStatus(s)}
            onSetPriority={(p) => setPriority(p)}
            onStartPreset={(preset) => {
              switch (preset) {
                case "today": {
                  const d = new Date();
                  setStartDateStr(toInputDate(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())));
                  break;
                }
                case "tomorrow": {
                  const d = new Date();
                  d.setDate(d.getDate() + 1);
                  setStartDateStr(toInputDate(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())));
                  break;
                }
                case "next_week": {
                  const d = new Date();
                  d.setDate(d.getDate() + 7);
                  setStartDateStr(toInputDate(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())));
                  break;
                }
                case "clear":
                  setStartDateStr("");
                  break;
              }
            }}
            onDuePreset={(preset) => {
              switch (preset) {
                case "today": {
                  const d = new Date();
                  setDueDateStr(toInputDate(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())));
                  break;
                }
                case "tomorrow": {
                  const d = new Date();
                  d.setDate(d.getDate() + 1);
                  setDueDateStr(toInputDate(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())));
                  break;
                }
                case "next_week": {
                  const d = new Date();
                  d.setDate(d.getDate() + 7);
                  setDueDateStr(toInputDate(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())));
                  break;
                }
                case "clear":
                  setDueDateStr("");
                  break;
              }
            }}
            onSetStartDate={(iso) => setStartDateStr(iso ?? "")}
            onSetDueDate={(iso) => setDueDateStr(iso ?? "")}
          />
        </div>

        <div className="text-[10px] text-[var(--text-muted)]">Last updated {task.updatedAt ? timeAgo(task.updatedAt) : "—"}</div>
      </div>
    </div>
  );
}

// --- Lightweight rich editor adapter for markdown string fields ---
function TaskRichEditor({
  value,
  onChange,
  placeholder,
  initialJson,
  registerSaveExtractor,
  onSetStatus: _onSetStatus,
  onSetPriority: _onSetPriority,
  onStartPreset: _onStartPreset,
  onDuePreset: _onDuePreset,
  onSetStartDate: _onSetStartDate,
  onSetDueDate: _onSetDueDate,
}: {
  value: string;
  onChange: (md: string) => void;
  placeholder?: string;
  initialJson?: string | null;
  registerSaveExtractor?: (fn: () => Promise<any>) => void;
  onSetStatus?: (s: "todo" | "in_progress" | "done" | "blocked") => void;
  onSetPriority?: (p: "low" | "medium" | "high" | "urgent" | undefined) => void;
  onStartPreset?: (preset: "today" | "tomorrow" | "next_week" | "clear") => void;
  onDuePreset?: (preset: "today" | "tomorrow" | "next_week" | "clear") => void;
  onSetStartDate?: (iso: string | null) => void;
  onSetDueDate?: (iso: string | null) => void;
}) {
  const holderRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<EditorJS | null>(null);
  const lastAppliedTextRef = useRef<string>("");
  const changeTimer = useRef<number | null>(null);

  const parseInitialData = useCallback((raw: string): any => {
    // Try to parse Editor.js JSON, else convert plain text/markdown-ish to paragraphs
    try {
      const data: any = JSON.parse(raw);
      if (data && Array.isArray(data?.blocks)) return data;
    } catch {
      // not JSON
    }
    const text = (raw ?? "").trim();
    if (!text) {
      return { time: Date.now(), blocks: [{ type: "paragraph", data: { text: "" } }], version: "2.31.0" };
    }
    const paras = text.split(/\n\n+/).map((p) => p.replace(/\n/g, "<br>"));
    return {
      time: Date.now(),
      blocks: paras.map((p) => ({ type: "paragraph", data: { text: p } })),
      version: "2.31.0",
    };
  }, []);

  const blocksToPlainText = useCallback((data: any): string => {
    try {
      const blocks: any[] = Array.isArray(data?.blocks) ? data.blocks : [];
      const lines: string[] = [];
      for (const b of blocks) {
        switch (b.type) {
          case "header":
            lines.push("# ".repeat(Math.min(6, b.data?.level || 1)) + (b.data?.text || ""));
            break;
          case "list": {
            const style = (b.data?.style || "unordered") as string;
            const items: string[] = Array.isArray(b.data?.items) ? b.data.items : [];
            for (let i = 0; i < items.length; i++) {
              const prefix = style === "ordered" ? `${i + 1}. ` : "- ";
              lines.push(prefix + items[i]);
            }
            break;
          }
          case "quote":
            lines.push("> " + (b.data?.text || ""));
            break;
          case "delimiter":
            lines.push("---");
            break;
          case "code":
            lines.push("```\n" + (b.data?.code || "") + "\n```");
            break;
          case "paragraph":
          default:
            lines.push(String(b.data?.text || "").replace(/<br\s*\/?>(?=.)/g, "\n"));
        }
      }
      return lines.join("\n\n").trimEnd();
    } catch {
      return "";
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      if (!holderRef.current) return;
      try {
        const data = parseInitialData((initialJson ?? undefined) || (value ?? ""));
        lastAppliedTextRef.current = blocksToPlainText(data);
        const ed = new EditorJS({
          holder: holderRef.current,
          minHeight: 120,
          autofocus: true,
          placeholder: placeholder || "Write details…",
          data,
          tools: {
            header: {
              class: Header,
              inlineToolbar: true,
              config: { levels: [2,3,4], defaultLevel: 2 },
            },
            list: { class: List, inlineToolbar: true },
            checklist: { class: Checklist, inlineToolbar: true },
            delimiter: Delimiter,
            quote: { class: Quote, inlineToolbar: true },
            code: CodeTool,
          },
          inlineToolbar: true,
          onChange: () => {
            if (changeTimer.current) window.clearTimeout(changeTimer.current);
            changeTimer.current = window.setTimeout(() => {
              ed
                .save()
                .then((output) => {
                  const plain = blocksToPlainText(output);
                  if (plain !== lastAppliedTextRef.current) {
                    lastAppliedTextRef.current = plain;
                    onChange(plain);
                  }
                })
                .catch(() => { /* ignore */ });
            }, 200);
          },
        });
        editorRef.current = ed;
        // Provide a getter for JSON output to parent on save
        if (registerSaveExtractor) {
          registerSaveExtractor(() => ed.save());
        }
      } catch (err) {
        console.error("Failed to init Editor.js", err);
      }
    };
    void init();
    return () => {
      if (changeTimer.current) window.clearTimeout(changeTimer.current);
      try { editorRef.current?.destroy?.(); } catch { /* no-op */ }
      editorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If external value changes (e.g., programmatic update), update editor
  useEffect(() => {
    const ed = editorRef.current;
    if (!ed) return;
    const data = parseInitialData(value ?? "");
    const nextText = blocksToPlainText(data);
    if (nextText === lastAppliedTextRef.current) return;
    lastAppliedTextRef.current = nextText;
    // Render new data
    try {
      ed.render(data).catch(() => { /* ignore */ });
    } catch {
      // ignore
    }
  }, [value, parseInitialData, blocksToPlainText]);

  return (
    <div className="min-h-[120px]">
      <div ref={holderRef} className="min-h-[120px] px-3 py-2 text-sm" />
      {!editorRef.current && (
        <div className="text-[12px] text-[var(--text-muted)] px-3 py-2">{placeholder || "Loading editor…"}</div>
      )}
    </div>
  );
}

// Helpers
function toInputDate(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fromInputDate(s: string): number {
  const [y, m, d] = s.split("-").map((x) => parseInt(x, 10));
  // Noon UTC to avoid timezone edge cases for date-only
  const dt = new Date(Date.UTC(y, (m - 1), d, 12, 0, 0, 0));
  return dt.getTime();
}

function pad2(n: number) { return String(n).padStart(2, "0"); }
function toInputDateTimeLocal(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  const hh = pad2(d.getHours());
  const mm = pad2(d.getMinutes());
  return `${y}-${m}-${day}T${hh}:${mm}`;
}
function fromInputDateTimeLocal(s: string): number {
  const [date, time] = s.split("T");
  const [y, m, d] = date.split("-").map((x) => parseInt(x, 10));
  const [hh, mm] = time.split(":").map((x) => parseInt(x, 10));
  const dt = new Date(y, m - 1, d, hh, mm, 0, 0); // local time -> ms
  return dt.getTime();
}

function timeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (weeks < 4) return `${weeks}w ago`;
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(months / 12);
  return `${years}y ago`;
}
