/**
 * Event Helper Functions
 * 
 * Utility functions for handling calendar events
 */

/**
 * Check if an event is an all-day event
 */
export const isAllDayEvent = (ev: any) => {
  if (ev?.allDay === true) return true;

  const start = ev?.start;
  const end = ev?.end;
  if (!start || !end) return false;

  const s = new Date(start);
  const e = new Date(end);
  const diff = e.getTime() - s.getTime();
  const hours = diff / (1000 * 60 * 60);

  return hours >= 23;
};

/**
 * Render event time display
 */
export const renderEventTime = (e: any) => {
  if (isAllDayEvent(e)) {
    return (
      <span className="text-xs text-[var(--text-secondary)]">All day</span>
    );
  }

  const start = e?.start ? new Date(e.start) : null;
  const end = e?.end ? new Date(e.end) : null;

  if (!start) {
    return (
      <span className="text-xs text-[var(--text-secondary)]">No time</span>
    );
  }

  const formatTime = (d: Date) => {
    const h = d.getHours();
    const m = d.getMinutes();
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    const mm = m < 10 ? `0${m}` : m;
    return `${h12}:${mm} ${ampm}`;
  };

  const startStr = formatTime(start);
  const endStr = end ? formatTime(end) : "";

  return (
    <span className="text-xs text-[var(--text-secondary)]">
      {startStr}
      {endStr && ` - ${endStr}`}
    </span>
  );
};


