import React from "react";
import { createPortal } from "react-dom";
import type { Id } from "../../../convex/_generated/dataModel";

export type AgendaMiniKind = "task" | "event" | "holiday" | "note";

export interface AgendaMiniRowProps {
  item: any;
  kind: AgendaMiniKind;
  onSelect?: (id: Id<"tasks"> | Id<"events"> | string) => void;
  // When provided for kind === 'task', show a checkbox and call handler on toggle
  showCheckbox?: boolean;
  onToggleComplete?: (id: Id<"tasks">, completed: boolean) => void;
}

function stripeClass(kind: AgendaMiniKind, status?: string): string {
  if (kind === "event") {
    switch (status) {
      case "cancelled":
        return "bg-rose-500/60";
      case "tentative":
        return "bg-amber-500/60";
      default:
        return "bg-slate-400/70";
    }
  }
  if (kind === "holiday") {
    return "bg-purple-500/70";
  }
  if (kind === "note") {
    return "bg-amber-500/70";
  }
  switch (status) {
    case "blocked":
      return "bg-rose-500/80";
    case "in_progress":
      return "bg-blue-400/70";
    case "done":
      return "bg-emerald-500/80";
    default:
      return "bg-slate-400/70";
  }
}

function eventContainerClasses(color?: string): string {
  switch (color) {
    case "green":
      return "border-emerald-200 bg-emerald-50";
    case "amber":
      return "border-amber-200 bg-amber-50";
    case "red":
      return "border-rose-200 bg-rose-50";
    case "purple":
      return "border-purple-200 bg-purple-50";
    case "gray":
      return "border-slate-200 bg-slate-50";
    case "blue":
    default:
      return "border-blue-200 bg-blue-50";
  }
}

// Container styling for notes
function noteContainerClasses(): string {
  return "border-amber-200 bg-amber-50";
}

function eventBadgeClasses(color?: string): string {
  switch (color) {
    case "green":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "amber":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "red":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "purple":
      return "border-purple-200 bg-purple-50 text-purple-700";
    case "gray":
      return "border-slate-200 bg-slate-50 text-slate-700";
    case "blue":
    default:
      return "border-blue-200 bg-blue-50 text-blue-700";
  }
}

function formatTimeShort(d: Date): string {
  let hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  if (minutes === 0) return `${hours} ${ampm}`;
  const mm = String(minutes).padStart(2, "0");
  return `${hours}:${mm} ${ampm}`;
}

function eventTime(item: any): string | undefined {
  if (typeof item?.startTime !== "number") return undefined;
  const s = new Date(item.startTime);
  const e = new Date(typeof item?.endTime === "number" ? item.endTime : item.startTime);
  return `${formatTimeShort(s)} – ${formatTimeShort(e)}`;
}

function holidayDate(item: any): string | undefined {
  // Prefer canonical dateKey (YYYY-MM-DD), which represents the wall date
  // independent of timezone. Render it as a local Date to avoid UTC shift.
  if (typeof item?.dateKey === "string") {
    const parts = String(item.dateKey).split("-");
    if (parts.length === 3) {
      const y = Number(parts[0]);
      const m = Number(parts[1]);
      const d = Number(parts[2]);
      if (!Number.isNaN(y) && !Number.isNaN(m) && !Number.isNaN(d)) {
        const dt = new Date(y, m - 1, d, 0, 0, 0, 0);
        return dt.toLocaleDateString();
      }
    }
  }
  // Fallback: use dateMs if provided
  const ms = typeof item?.dateMs === "number" ? item.dateMs : undefined;
  if (ms) {
    const d = new Date(ms);
    return d.toLocaleDateString();
  }
  return undefined;
}

export const AgendaMiniRow: React.FC<AgendaMiniRowProps> = ({ item, kind, onSelect, showCheckbox, onToggleComplete }) => {
  const title: string = String(
    item?.title || (
      kind === "event"
        ? "(Untitled event)"
        : kind === "holiday"
          ? String(item?.name ?? "Holiday")
          : kind === "note"
            ? "(Untitled note)"
            : "(Untitled task)"
    )
  );
  const time = kind === "event" ? eventTime(item) : undefined;
  const id = String(item?._id ?? "");
  const [hovered, setHovered] = React.useState(false);
  const anchorRef = React.useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(null);

  const updatePosition = React.useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = 256; // w-64
    const margin = 8;
    let left = rect.right - width; // align right edges
    if (left < margin) left = margin;
    if (left + width > window.innerWidth - margin) left = window.innerWidth - margin - width;
    const top = rect.bottom + 4; // mt-1
    setPos({ top, left });
  }, []);

  React.useEffect(() => {
    if (!hovered) return;
    updatePosition();
    const onScroll = () => updatePosition();
    const onResize = () => updatePosition();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [hovered, updatePosition]);

  return (
    <div
      ref={anchorRef}
      data-agenda-mini-row
      className={`relative overflow-visible pl-2 py-1 pr-1 rounded-sm cursor-pointer border ${
        kind === 'event'
          ? eventContainerClasses(item?.color)
          : kind === 'holiday'
            ? 'border-purple-200 bg-purple-50'
            : kind === 'note'
              ? noteContainerClasses()
              : 'border-emerald-200 bg-emerald-50'
      }`}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : -1}
      onClick={() => onSelect?.(id)}
      onKeyDown={(e) => { if (onSelect && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onSelect(id); } }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
    >
      <span className={`absolute left-0 top-0 bottom-0 w-0.5 ${stripeClass(kind, item?.status)}`} aria-hidden />
      <div className="min-w-0 flex flex-col gap-0.5">
        <div className="flex items-center gap-2 min-w-0">
          {kind === 'task' && showCheckbox ? (
            <input
              type="checkbox"
              checked={String(item?.status ?? 'todo') === 'done'}
              onChange={(e) => {
                e.stopPropagation();
                const tid = (item?._id ?? "") as Id<'tasks'>;
                onToggleComplete?.(tid, e.target.checked);
              }}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              aria-label={String(item?.status ?? 'todo') === 'done' ? 'Mark task as not done' : 'Mark task as done'}
              className="h-3.5 w-3.5 rounded border-[var(--border-color)] text-emerald-600 focus:ring-1 focus:ring-emerald-500/50 bg-white"
            />
          ) : null}
          <span
            className={`text-[10px] px-1 rounded border ${
              kind === 'event'
                ? eventBadgeClasses(item?.color)
                : kind === 'holiday'
                  ? 'border-purple-200 bg-purple-50 text-purple-700'
                  : kind === 'note'
                    ? 'border-amber-200 bg-amber-50 text-amber-700'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700'
            }`}
          >
            {kind === 'event' ? 'Event' : kind === 'holiday' ? 'Holiday' : kind === 'note' ? 'Note' : 'Task'}
          </span>
          <span className={`truncate text-xs ${kind === 'task' && String(item?.status ?? 'todo') === 'done' ? 'text-[var(--text-secondary)] line-through' : 'text-[var(--text-primary)]'}`}>{title}</span>
        </div>
      </div>
      {hovered && pos && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed z-[9999] w-64 max-w-[80vw] rounded-md border border-[var(--border-color)] bg-[var(--bg-primary)] shadow-lg p-2 text-[var(--text-primary)]"
          style={{ top: pos.top, left: pos.left }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="truncate text-xs font-semibold" title={title}>{title}</div>
            {kind === 'event' ? (
              <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                item?.status === 'cancelled' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                item?.status === 'tentative' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                {String(item?.status ?? 'confirmed')}
              </span>
            ) : kind === 'task' ? (
              <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                item?.status === 'blocked' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                item?.status === 'in_progress' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                item?.status === 'done' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                'bg-slate-50 text-slate-700 border-slate-200'
              }`}>
                {String(item?.status ?? 'todo')}
              </span>
            ) : kind === 'holiday' ? (
              <span className="text-[10px] px-1.5 py-0.5 rounded border bg-purple-50 text-purple-700 border-purple-200">Holiday</span>
            ) : (
              <span className="text-[10px] px-1.5 py-0.5 rounded border bg-amber-50 text-amber-700 border-amber-200">Note</span>
            )}
          </div>
          {/* Meta */}
          <div className="mt-1 space-y-1">
            {kind === 'event' ? (
              <>
                {time && (
                  <div className="text-[10px] text-[var(--text-secondary)]">{time}</div>
                )}
                {item?.location && (
                  <div className="text-[10px] text-[var(--text-secondary)]">📍 {String(item.location)}</div>
                )}
                {Array.isArray(item?.attendees) && item.attendees.length > 0 && (
                  <div className="text-[10px] text-[var(--text-secondary)]">👥 {item.attendees.length} attendee{item.attendees.length > 1 ? 's' : ''}</div>
                )}
                {item?.description && (
                  <div className="text-[10px] text-[var(--text-secondary)]">
                    {String(item.description).slice(0, 120)}{String(item.description).length > 120 ? '…' : ''}
                  </div>
                )}
              </>
            ) : kind === 'task' ? (
              <>
                {typeof item?.dueDate === 'number' && (
                  <div className="text-[10px] text-[var(--text-secondary)]">Due: {new Date(item.dueDate).toLocaleString()}</div>
                )}
                {item?.priority && (
                  <div className="text-[10px] text-[var(--text-secondary)]">Priority: {String(item.priority)}</div>
                )}
                {item?.description && (
                  <div className="text-[10px] text-[var(--text-secondary)]">
                    {String(item.description).slice(0, 120)}{String(item.description).length > 120 ? '…' : ''}
                  </div>
                )}
              </>
            ) : kind === 'holiday' ? (
              <>
                <div className="text-[10px] text-[var(--text-secondary)]">Date: {holidayDate(item) ?? ''}</div>
                {item?.country && (
                  <div className="text-[10px] text-[var(--text-secondary)]">Country: {String(item.country)}</div>
                )}
              </>
            ) : (
              <>
                {typeof item?.agendaDate === 'number' && (
                  <div className="text-[10px] text-[var(--text-secondary)]">Date: {new Date(item.agendaDate).toLocaleDateString()}</div>
                )}
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AgendaMiniRow;
