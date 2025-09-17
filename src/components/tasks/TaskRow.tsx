import { useMemo } from "react";
import MetaPills from "../MetaPills";
import { taskToPills } from "../../lib/metaPillMappers";
import { shapeTaskForPills, reorderTaskPillsForTightRows } from "../../lib/tasks";
import { ListTodo } from "lucide-react";

export function TaskRow({ t }: { t: any }) {
  const shaped = shapeTaskForPills(t);
  const { title, dueAt, project, link, updatedAt, priority, details } = shaped;
  const pills = useMemo(
    () => reorderTaskPillsForTightRows(taskToPills({ title, dueAt, project, link, updatedAt, priority, details })),
    [title, dueAt, project, link, updatedAt, priority, details]
  );
  return (
    <li className="task-row relative overflow-hidden flex items-start justify-between gap-3 p-2 rounded-lg hover:bg-muted/40">
      {/* Watermark: consistent row positioning (top-right) */}
      <span className="document-card__bg document-row__bg text-[var(--accent-primary)]" aria-hidden>
        <ListTodo className="h-10 w-10 rotate-12" />
      </span>
      <div className="min-w-0">
        <div className="text-sm font-medium truncate">{title}</div>
        <MetaPills pills={pills} max={4} typePillClassName="border-sky-300 text-sky-700 bg-sky-100 dark:border-sky-800 dark:text-sky-200 dark:bg-sky-900/40" />
      </div>
      <div className="shrink-0 text-xs text-muted-foreground">{/* right-side bits */}</div>
    </li>
  );
}
