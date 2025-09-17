import React from "react";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { toast } from "sonner";
import PopoverMiniEditor from "./PopoverMiniEditor";

export default function DualEditMiniPanel({
  dateMs,
  onClose,
  defaultTitle,
  defaultAllDay = true,
  documentIdForAssociation,
}: {
  dateMs: number;
  onClose: () => void;
  defaultTitle?: string;
  defaultAllDay?: boolean;
  documentIdForAssociation?: Id<"documents"> | null;
}) {
  const createTask = useMutation(api.tasks.createTask);
  const createEvent = useMutation(api.events.createEvent);

  const [mode, setMode] = React.useState<"confirm" | "edit">("confirm");
  const [taskTitle, setTaskTitle] = React.useState<string>((defaultTitle ?? "New task").trim());
  const [eventTitle, setEventTitle] = React.useState<string>((defaultTitle ?? "New event").trim());
  const [allDay, setAllDay] = React.useState<boolean>(!!defaultAllDay);
  const [creating, setCreating] = React.useState<boolean>(false);

  const [taskId, setTaskId] = React.useState<Id<"tasks"> | null>(null);
  const [eventId, setEventId] = React.useState<Id<"events"> | null>(null);

  const createBoth = async () => {
    try {
      setCreating(true);
      const p1 = createTask({ title: taskTitle.trim() || "New task", status: "todo", dueDate: dateMs }) as Promise<Id<"tasks">>;
      const start = allDay ? dateMs : dateMs + 9 * 60 * 60 * 1000;
      const end = allDay ? undefined : dateMs + 10 * 60 * 60 * 1000;
      const p2 = createEvent({ title: eventTitle.trim() || "New event", startTime: start, endTime: end, allDay, status: "confirmed" }) as Promise<Id<"events">>;
      const [tid, eid] = await Promise.all([p1, p2]);
      setTaskId(tid);
      setEventId(eid);
      setMode("edit");
      toast.success("Created task and event");
    } catch (e) {
      console.error(e);
      toast.error("Failed to create task and event");
    } finally {
      setCreating(false);
    }
  };

  const createTaskOnly = async () => {
    try {
      setCreating(true);
      const tid = (await createTask({ title: taskTitle.trim() || "New task", status: "todo", dueDate: dateMs })) as Id<"tasks">;
      setTaskId(tid);
      setMode("edit");
      toast.success("Task created");
    } catch (e) {
      console.error(e);
      toast.error("Failed to create task");
    } finally {
      setCreating(false);
    }
  };

  const createEventOnly = async () => {
    try {
      setCreating(true);
      const start = allDay ? dateMs : dateMs + 9 * 60 * 60 * 1000;
      const end = allDay ? undefined : dateMs + 10 * 60 * 60 * 1000;
      const eid = (await createEvent({ title: eventTitle.trim() || "New event", startTime: start, endTime: end, allDay, status: "confirmed" })) as Id<"events">;
      setEventId(eid);
      setMode("edit");
      toast.success("Event created");
    } catch (e) {
      console.error(e);
      toast.error("Failed to create event");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      className="mt-2 rounded-lg p-2 bg-[var(--bg-primary)] border border-[var(--border-color)]/60 pointer-events-auto"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      role="dialog"
      aria-label={mode === "confirm" ? "Confirm create task and event" : "Edit created task and event"}
    >
      <div className="text-[11px] text-[var(--text-muted)] mb-2">Create on {new Date(dateMs).toLocaleDateString()}</div>

      {mode === "confirm" ? (
        <div className="space-y-2">
          {/* Task row */}
          <div className="flex items-center gap-2">
            <div className="shrink-0 inline-flex items-center gap-1 text-[11px] text-[var(--text-secondary)] min-w-[58px]">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Task</span>
            </div>
            <input
              type="text"
              className="flex-1 text-xs px-2 py-1 rounded border border-[var(--border-color)] bg-white"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="Task title"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void createBoth(); } }}
            />
          </div>
          {/* Event row */}
          <div className="flex items-center gap-2">
            <div className="shrink-0 inline-flex items-center gap-1 text-[11px] text-[var(--text-secondary)] min-w-[58px]">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span>Event</span>
            </div>
            <input
              type="text"
              className="flex-1 text-xs px-2 py-1 rounded border border-[var(--border-color)] bg-white"
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
              placeholder="Event title"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void createBoth(); } }}
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="inline-flex items-center gap-2 text-[11px] text-[var(--text-secondary)]">
              <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
              All-day event
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className={`text-[11px] px-2 py-1 rounded-md border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] ${creating ? 'opacity-60 cursor-not-allowed' : ''}`}
                disabled={creating}
                onClick={() => void createTaskOnly()}
                title="Create only a task"
              >
                Create task only
              </button>
              <button
                type="button"
                className={`text-[11px] px-2 py-1 rounded-md border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] ${creating ? 'opacity-60 cursor-not-allowed' : ''}`}
                disabled={creating}
                onClick={() => void createEventOnly()}
                title="Create only an event"
              >
                Create event only
              </button>
              <button
                type="button"
                className="text-[11px] px-2 py-1 rounded-md border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)]"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`text-[11px] px-2.5 py-1 rounded-md ${creating ? 'opacity-60 cursor-not-allowed' : ''} border ${creating ? 'border-[var(--border-color)] bg-[var(--bg-secondary)]' : 'bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary-hover)] border-transparent'}`}
                disabled={creating}
                onClick={() => void createBoth()}
              >
                Create both
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className={`grid ${taskId && eventId ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'} gap-2`}>
          {taskId && (
            <div className="rounded border border-[var(--border-color)] bg-[var(--bg-secondary)] p-1">
              <PopoverMiniEditor kind="task" taskId={taskId} onClose={onClose} />
            </div>
          )}
          {eventId && (
            <div className="rounded border border-[var(--border-color)] bg-[var(--bg-secondary)] p-1">
              <PopoverMiniEditor kind="event" eventId={eventId} onClose={onClose} documentIdForAssociation={documentIdForAssociation} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
