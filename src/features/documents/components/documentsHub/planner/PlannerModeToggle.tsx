import { useRef, type KeyboardEvent } from "react";
import { ListTodo, KanbanSquare, CalendarDays } from "lucide-react";

export type PlannerMode = "list" | "kanban" | "weekly";

export interface PlannerModeToggleProps {
  mode: PlannerMode;
  onChange: (mode: PlannerMode) => void;
}

export function PlannerModeToggle({ mode, onChange }: PlannerModeToggleProps) {
  const listTabRef = useRef<HTMLButtonElement>(null);
  const kanbanTabRef = useRef<HTMLButtonElement>(null);
  const weeklyTabRef = useRef<HTMLButtonElement>(null);

  const focusMode = (value: PlannerMode) => {
    if (value === "list") {
      listTabRef.current?.focus();
    } else if (value === "kanban") {
      kanbanTabRef.current?.focus();
    } else {
      weeklyTabRef.current?.focus();
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const order: PlannerMode[] = ["list", "kanban", "weekly"];
    const currentIndex = order.indexOf(mode);
    let next = mode;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      next = order[(currentIndex + 1) % order.length];
      onChange(next);
      focusMode(next);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      next = order[(currentIndex - 1 + order.length) % order.length];
      onChange(next);
      focusMode(next);
    } else if (event.key === "Home") {
      event.preventDefault();
      next = "list";
      onChange(next);
      focusMode(next);
    } else if (event.key === "End") {
      event.preventDefault();
      next = "weekly";
      onChange(next);
      focusMode(next);
    }
  };

  const baseClasses = "flex items-center gap-2 px-3 py-2 text-sm ";
  const activeClasses = "bg-[var(--accent-primary)] text-white";
  const inactiveClasses = "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]";

  const listClasses = baseClasses + (mode === "list" ? activeClasses : inactiveClasses);
  const kanbanClasses = baseClasses + (mode === "kanban" ? activeClasses : inactiveClasses);
  const weeklyClasses = baseClasses + (mode === "weekly" ? activeClasses : inactiveClasses);

  return (
    <div
      className="inline-flex rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] overflow-hidden"
      role="tablist"
      aria-label="Planner view selector"
      onKeyDown={handleKeyDown}
    >
      <button
        ref={listTabRef}
        className={listClasses}
        onClick={() => onChange("list")}
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
        className={kanbanClasses}
        onClick={() => onChange("kanban")}
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
        className={weeklyClasses}
        onClick={() => onChange("weekly")}
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
}
