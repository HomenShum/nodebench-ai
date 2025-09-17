import React from "react";
import type { Id } from "../../convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import PopoverMiniEditor from "./editors/mini/PopoverMiniEditor";

export type MiniAgendaEditorPanelProps =
  | { kind: "task"; taskId: Id<"tasks">; onClose: () => void }
  | { kind: "event"; eventId: Id<"events">; onClose: () => void; documentIdForAssociation?: Id<"documents"> | null }
  | { kind: "create"; dateMs: number; onClose: () => void; defaultKind?: "task" | "event"; defaultTitle?: string; defaultAllDay?: boolean; documentIdForAssociation?: Id<"documents"> | null };

export default function MiniAgendaEditorPanel(props: MiniAgendaEditorPanelProps) {
  const createTask = useMutation(api.tasks.createTask);
  const createEvent = useMutation(api.events.createEvent);

  const [createdTaskId, setCreatedTaskId] = React.useState<Id<"tasks"> | null>(null);
  const [createdEventId, setCreatedEventId] = React.useState<Id<"events"> | null>(null);

  // If an item was created, render its mini editor
  if (createdTaskId) {
    return <PopoverMiniEditor kind="task" taskId={createdTaskId} onClose={props.onClose} />;
  }
  if (createdEventId) {
    return (
      <PopoverMiniEditor
        kind="event"
        eventId={createdEventId}
        onClose={props.onClose}
        documentIdForAssociation={(props as any).documentIdForAssociation}
      />
    );
  }

  if (props.kind === "task") {
    return <PopoverMiniEditor kind="task" taskId={props.taskId} onClose={props.onClose} />;
  }
  if (props.kind === "event") {
    return (
      <PopoverMiniEditor
        kind="event"
        eventId={props.eventId}
        onClose={props.onClose}
        documentIdForAssociation={props.documentIdForAssociation}
      />
    );
  }

  // Create mode UI
  const { dateMs, defaultKind, defaultTitle, defaultAllDay } = props;

  const handleCreateTask = async () => {
    try {
      const title = (defaultTitle ?? "New task").trim();
      const id = await createTask({ title, status: "todo", dueDate: dateMs });
      setCreatedTaskId(id as Id<"tasks">);
      toast.success("Task created");
    } catch (e) {
      console.error(e);
      toast.error("Failed to create task");
    }
  };

  const handleCreateEvent = async () => {
    try {
      const title = (defaultTitle ?? "New event").trim();
      const allDay = !!defaultAllDay;
      const start = allDay ? dateMs : (dateMs + 9 * 60 * 60 * 1000);
      const end = allDay ? undefined : (dateMs + 10 * 60 * 60 * 1000);
      const id = await createEvent({ title, startTime: start, endTime: end, allDay, status: "confirmed" });
      setCreatedEventId(id as Id<"events">);
      toast.success("Event created");
    } catch (e) {
      console.error(e);
      toast.error("Failed to create event");
    }
  };

  // Initial create choice UI
  return (
    <div
      className="mt-2 rounded-lg p-2 bg-[var(--bg-primary)] border border-[var(--border-color)]/60 pointer-events-auto"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div className="text-[11px] text-[var(--text-muted)] mb-2">Create on {new Date(dateMs).toLocaleDateString()}</div>
      <div className="grid grid-cols-1 gap-1.5">
        <button
          type="button"
          className="relative overflow-visible pl-2 py-1 pr-1 rounded-sm border border-[var(--border-color)] bg-[var(--bg-secondary)] cursor-pointer text-left"
          onClick={() => { void handleCreateTask(); }}
          autoFocus={defaultKind !== "event"}
        >
          <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-emerald-500/60" aria-hidden />
          <div className="min-w-0 flex flex-col gap-0.5">
            <div className="flex items-center gap-2 min-w-0">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="truncate text-[var(--text-primary)] text-xs">Add Task</span>
            </div>
          </div>
        </button>
        <button
          type="button"
          className="relative overflow-visible pl-2 py-1 pr-1 rounded-sm border border-[var(--border-color)] bg-[var(--bg-secondary)] cursor-pointer text-left"
          onClick={() => { void handleCreateEvent(); }}
          autoFocus={defaultKind === "event"}
        >
          <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500/70" aria-hidden />
          <div className="min-w-0 flex flex-col gap-0.5">
            <div className="flex items-center gap-2 min-w-0">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span className="truncate text-[var(--text-primary)] text-xs">Create Event</span>
            </div>
          </div>
        </button>
        <div className="flex items-center justify-end mt-1">
          <button
            type="button"
            className="text-[11px] px-2 py-1 rounded-md border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)]"
            onClick={props.onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
