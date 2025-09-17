import React, { useLayoutEffect, useState } from "react";

export default function AgendaHoverPreview({
  anchorEl,
  open,
  kind,
  item,
  onMouseEnterPopover,
  onMouseLeavePopover,
}: {
  anchorEl: HTMLElement | null;
  open: boolean;
  kind: "task" | "event" | "holiday";
  item: any;
  onMouseEnterPopover?: () => void;
  onMouseLeavePopover?: () => void;
}) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const width = 280; // px, compact
  const margin = 8;

  const formatTimeShort = (d: Date): string => {
    let hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    if (hours === 0) hours = 12;
    if (minutes === 0) return `${hours} ${ampm}`;
    const mm = String(minutes).padStart(2, "0");
    return `${hours}:${mm} ${ampm}`;
  };

  const eventTime = (evt: any): string | undefined => {
    if (typeof evt?.startTime !== "number") return undefined;
    const s = new Date(evt.startTime);
    const e = new Date(typeof evt?.endTime === "number" ? evt.endTime : evt.startTime);
    return `${formatTimeShort(s)} – ${formatTimeShort(e)}`;
  };

  // Derive a display date for holidays. Prefer canonical dateKey (YYYY-MM-DD) to avoid TZ shifts.
  const holidayDate = (val: any): string | undefined => {
    if (typeof val?.dateKey === "string") {
      const parts = String(val.dateKey).split("-");
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
    const ms = typeof val?.dateMs === "number" ? val.dateMs : undefined;
    if (ms) return new Date(ms).toLocaleDateString();
    return undefined;
  };

  const recompute = React.useCallback(() => {
    if (!anchorEl) return;
    const rect = anchorEl.getBoundingClientRect();
    let left = rect.left + window.scrollX;
    if (left + width > window.scrollX + window.innerWidth - margin) {
      left = Math.max(margin, window.scrollX + window.innerWidth - margin - width);
    }
    const top = rect.bottom + 4 + window.scrollY;
    setPos({ top, left });
  }, [anchorEl]);

  useLayoutEffect(() => {
    if (!open) return;
    recompute();
    const onResize = () => recompute();
    const onScroll = () => recompute();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open, recompute]);

  if (!open || !anchorEl || !pos) return null;

  return (
    <div
      className="fixed z-[75] w-[280px] max-w-[80vw] rounded-md border border-[var(--border-color)] bg-[var(--bg-primary)] shadow-lg p-2 text-[var(--text-primary)]"
      style={{ top: pos.top, left: pos.left }}
      onMouseEnter={onMouseEnterPopover}
      onMouseLeave={onMouseLeavePopover}
      role="dialog"
      aria-label={kind === "event" ? "Event preview" : "Task preview"}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="truncate text-xs font-semibold" title={String(item?.title ?? item?.name ?? "")}>{String(item?.title ?? item?.name ?? "")}</div>
        {kind === "event" ? (
          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
            item?.status === 'cancelled' ? 'bg-rose-50 text-rose-700 border-rose-200' :
            item?.status === 'tentative' ? 'bg-amber-50 text-amber-700 border-amber-200' :
            'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}>
            {String(item?.status ?? 'confirmed')}
          </span>
        ) : kind === "task" ? (
          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
            item?.status === 'blocked' ? 'bg-rose-50 text-rose-700 border-rose-200' :
            item?.status === 'in_progress' ? 'bg-blue-50 text-blue-700 border-blue-200' :
            item?.status === 'done' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
            'bg-slate-50 text-slate-700 border-slate-200'
          }`}>
            {String(item?.status ?? 'todo')}
          </span>
        ) : (
          <span className="text-[10px] px-1.5 py-0.5 rounded border bg-purple-50 text-purple-700 border-purple-200">Holiday</span>
        )}
      </div>

      {/* Meta */}
      <div className="mt-1 space-y-1">
        {kind === 'event' ? (
          <>
            {eventTime(item) && (
              <div className="text-[10px] text-[var(--text-secondary)]">{eventTime(item)}</div>
            )}
            {item?.location && (
              <div className="text-[10px] text-[var(--text-secondary)]">📍 {String(item.location)}</div>
            )}
            {Array.isArray(item?.attendees) && item.attendees.length > 0 && (
              <div className="text-[10px] text-[var(--text-secondary)]">👥 {item.attendees.length} attendee{item.attendees.length > 1 ? 's' : ''}</div>
            )}
            {item?.description && (
              <div className="text-[10px] text-[var(--text-secondary)]">
                {String(item.description).slice(0, 140)}{String(item.description).length > 140 ? '…' : ''}
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
                {String(item.description).slice(0, 140)}{String(item.description).length > 140 ? '…' : ''}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="text-[10px] text-[var(--text-secondary)]">Date: {holidayDate(item) ?? ''}</div>
            {item?.country && (
              <div className="text-[10px] text-[var(--text-secondary)]">Country: {String(item.country)}</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
