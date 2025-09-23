import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Id } from "../../convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Lightbulb, CalendarDays, Plus, StickyNote } from "lucide-react";
import AgendaMiniRow from "./agenda/AgendaMiniRow";
import MiniAgendaEditorPanel from "./agenda/MiniAgendaEditorPanel";
import DualCreateMiniPanel from "./editors/mini/DualCreateMiniPanel";
import DualEditMiniPanel from "./editors/mini/DualEditMiniPanel";
import PopoverMiniEditor from "./editors/mini/PopoverMiniEditor";
import PopoverMiniDocEditor from "./common/PopoverMiniDocEditor";
import DocumentMiniEditor from "./editors/mini/DocumentMiniEditor";
import { toast } from "sonner";
type DayInfo = {
  date: Date;
  inMonth: boolean;
  isToday: boolean;
  key: string; // yyyy-mm-dd local
};

function fmtKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfLocalMonth(base: Date, offsetMs: number): number {
  // Compute local month start using local calendar fields, then convert
  // to the internal ms convention (actual UTC ms minus offsetMs).
  const d = new Date(base.getFullYear(), base.getMonth(), 1, 0, 0, 0, 0);
  return d.getTime() - offsetMs;
}

function nextMonthStartMs(base: Date, offsetMs: number): number {
  const d = new Date(base.getFullYear(), base.getMonth() + 1, 1, 0, 0, 0, 0);
  return d.getTime() - offsetMs;
}

// (removed addDays; not needed with per-day loop approach)

function toLocalDate(ms: number, offsetMs: number): Date {
  // Interpret ms as UTC, convert to local by adding offset
  return new Date(ms + offsetMs);
}

// Compute a YYYY-MM-DD key for a given timestamp in a specific IANA time zone.
// Falls back to system local if the zone is unavailable.
function getDateKeyForZone(timeZone: string | undefined, dateMs: number): string {
  try {
    if (!timeZone) return fmtKey(new Date(dateMs));
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const parts = dtf.formatToParts(new Date(dateMs));
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    const y = get("year");
    const m = get("month");
    const d = get("day");
    return `${y}-${m}-${d}`;
  } catch {
    return fmtKey(new Date(dateMs));
  }
}

// Top-level helpers so hooks don't complain about function dependencies
// Compute minutes east of UTC for a given IANA time zone at a specific date.
function tzOffsetMinutesAt(timeZone: string | undefined, date: Date): number {
  if (!timeZone) {
    return -date.getTimezoneOffset();
  }
  try {
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const parts = dtf.formatToParts(date);
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
    const y = get("year");
    const m = (get("month") || 1) - 1;
    const d = get("day") || 1;
    const h = get("hour") || 0;
    const min = get("minute") || 0;
    const s = get("second") || 0;
    const asUTC = Date.UTC(y, m, d, h, min, s);
    // Positive when zone is ahead of UTC (east), negative when behind.
    return (asUTC - date.getTime()) / 60000;
  } catch {
    return -date.getTimezoneOffset();
  }
}

// Convert a UTC ms timestamp to a Date in the given IANA time zone, DST-safe.
function toLocalDateInZone(ms: number, timeZone: string | undefined): Date {
  const offMin = tzOffsetMinutesAt(timeZone, new Date(ms));
  return new Date(ms + offMin * 60 * 1000);
}

export interface MiniMonthCalendarProps {
  tzOffsetMinutes?: number; // default derived from browser
  onSelectDate?: (dateMs: number) => void; // UTC ms of selected local day start
  onViewDay?: (dateMs: number) => void; // Optional: explicit day view handler
  onViewWeek?: (dateMs: number) => void; // Optional: explicit week view handler
  onWeeklyReview?: (weekAnchorMs: number) => void; // Optional: trigger weekly review
  onAddTask?: (dateMs: number) => void; // Optional: open New Task modal for this date
  onAddEvent?: (dateMs: number) => void; // Optional: open New Event dialog for this date
  constrainToSidebar?: boolean; // If true, keep previews within sidebar width
}

export function MiniMonthCalendar({ tzOffsetMinutes, onSelectDate: _onSelectDate, onViewDay: _onViewDay, onViewWeek: _onViewWeek, onWeeklyReview: _onWeeklyReview, onAddTask: _onAddTask, onAddEvent: _onAddEvent, constrainToSidebar = false }: MiniMonthCalendarProps) {
  // Clock state (ticks every second)
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Load and persist preferred time zone
  const prefs = useQuery(api.userPreferences.getCalendarUiPrefs, {});
  const setTimeZonePref = useMutation(api.userPreferences.setTimeZonePreference);
  const browserTz = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone as string | undefined;
    } catch {
      return undefined;
    }
  }, []);
  const [selectedTz, setSelectedTz] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (prefs === undefined) return;
    const prefTz = prefs?.timeZone ?? browserTz;
    if (prefTz && prefTz !== selectedTz) {
      setSelectedTz(prefTz);
    }
  }, [prefs, browserTz, selectedTz]);

  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const effectiveOffsetMinutes = useMemo(() => {
    // Prefer the explicitly selected IANA timezone for ALL calculations.
    if (selectedTz && selectedTz.length > 0) {
      return tzOffsetMinutesAt(selectedTz, anchor);
    }
    // Fallback to numeric offset provided by parent, then browser/system.
    if (typeof tzOffsetMinutes === "number") return tzOffsetMinutes;
    return -new Date(anchor).getTimezoneOffset();
  }, [selectedTz, tzOffsetMinutes, anchor]);
  const offsetMs = effectiveOffsetMinutes * 60 * 1000;
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [pinnedKey, setPinnedKey] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [editTarget, setEditTarget] = useState<
    | { kind: "task"; id: string }
    | { kind: "event"; id: string }
    | { kind: "holiday"; name: string }
    | { kind: "note"; id: string }
    | { kind: "create"; dateMs: number; defaultKind?: "task" | "event"; defaultTitle?: string; defaultAllDay?: boolean }
    | { kind: "createBoth"; dateMs: number; defaultTitle?: string; defaultAllDay?: boolean }
    | null
  >(null);

  // Today key in the selected timezone. Changes only when the calendar date changes
  // in that zone (not every second), thanks to memoization.
  const todayKey = useMemo(() => {
    // Prefer explicit IANA zone when available; otherwise use numeric offset path
    if (selectedTz && selectedTz.length > 0) return getDateKeyForZone(selectedTz, now);
    // When only an offset is available, shift the instant by the offset and
    // read UTC fields to get the wall date in that offset-based zone.
    const d = new Date(now + offsetMs);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }, [selectedTz, now, offsetMs]);

  // Compute month range [start, end]
  const monthStart = useMemo(() => startOfLocalMonth(anchor, offsetMs), [anchor, offsetMs]);
  const _monthEnd = useMemo(() => nextMonthStartMs(anchor, offsetMs) - 1, [anchor, offsetMs]);
  // For holidays (stored at 00:00:00Z for dateKey), build a UTC range
  // covering the entire visible 6x7 grid (not just the current month).
  // This ensures days shown from the adjacent months are accurate too.
  const gridHolidayRange = useMemo(() => {
    const firstLocal = toLocalDate(monthStart, offsetMs); // local 1st of month
    const dayOfWeek = (firstLocal.getDay() + 6) % 7; // 0=Mon..6=Sun
    // Start of the grid (Monday of the first row)
    const gridStartLocal = new Date(
      firstLocal.getFullYear(),
      firstLocal.getMonth(),
      firstLocal.getDate() - dayOfWeek,
      0,
      0,
      0,
      0,
    );
    // End of the grid (6 weeks * 7 days = 42 days, zero-indexed => +41)
    const gridEndLocal = new Date(
      gridStartLocal.getFullYear(),
      gridStartLocal.getMonth(),
      gridStartLocal.getDate() + 41,
      0,
      0,
      0,
      0,
    );
    const startKey = fmtKey(gridStartLocal);
    const endKey = fmtKey(gridEndLocal);
    const startUtc = Date.parse(`${startKey}T00:00:00Z`);
    const endUtc = Date.parse(`${endKey}T23:59:59Z`);
    return { startUtc, endUtc };
  }, [monthStart, offsetMs]);

  // Compute the UTC range for the entire visible 6x7 grid using the same
  // timezone-aware midday trick used for single-day calculations. This makes
  // event/task queries consistent with the hover preview counts.
  const gridRangeUtc = useMemo(() => {
    const firstLocal = toLocalDate(monthStart, offsetMs);
    const dayOfWeek = (firstLocal.getDay() + 6) % 7; // 0=Mon..6=Sun
    const gridStartLocal = new Date(
      firstLocal.getFullYear(),
      firstLocal.getMonth(),
      firstLocal.getDate() - dayOfWeek,
      0, 0, 0, 0,
    );
    const gridEndLocal = new Date(
      gridStartLocal.getFullYear(),
      gridStartLocal.getMonth(),
      gridStartLocal.getDate() + 41,
      0, 0, 0, 0,
    );

    // Start of first grid day in the selected zone -> UTC
    const startKey = fmtKey(gridStartLocal);
    const startOffMin = tzOffsetMinutesAt(selectedTz, gridStartLocal);
    const startMiddayUtc = Date.parse(`${startKey}T12:00:00Z`);
    const startLocalNoon = startMiddayUtc + startOffMin * 60 * 1000;
    const s = new Date(startLocalNoon);
    s.setUTCHours(0, 0, 0, 0);
    const startUtc = s.getTime() - startOffMin * 60 * 1000;

    // End of last grid day in the selected zone -> UTC
    const endKey = fmtKey(gridEndLocal);
    const endOffMin = tzOffsetMinutesAt(selectedTz, gridEndLocal);
    const endMiddayUtc = Date.parse(`${endKey}T12:00:00Z`);
    const endLocalNoon = endMiddayUtc + endOffMin * 60 * 1000;
    const e = new Date(endLocalNoon);
    e.setUTCHours(0, 0, 0, 0);
    const endStartUtc = e.getTime() - endOffMin * 60 * 1000;
    const endUtc = endStartUtc + 24 * 60 * 60 * 1000 - 1;

    return { startUtc, endUtc };
  }, [monthStart, offsetMs, selectedTz]);

  // Canonical agenda for the entire visible grid range (not just the month)
  const agendaMonth = useQuery((api as any).calendar.listAgendaInRange, {
    start: gridRangeUtc.startUtc,
    end: gridRangeUtc.endUtc,
    country: "US",
    holidaysStartUtc: gridHolidayRange.startUtc,
    holidaysEndUtc: gridHolidayRange.endUtc,
  } as any);

  // Build calendar grid starting Monday before the 1st, ending Sunday after last day, 6 rows x 7 cols
  const gridDays: DayInfo[] = useMemo(() => {
    const firstLocal = toLocalDate(monthStart, offsetMs); // local timezone Date at 1st 00:00
    const dayOfWeek = (firstLocal.getDay() + 6) % 7; // 0=Mon..6=Sun
    // Start from the Monday of the first grid row using local calendar arithmetic to avoid DST issues
    const gridStartLocal = new Date(
      firstLocal.getFullYear(),
      firstLocal.getMonth(),
      firstLocal.getDate() - dayOfWeek,
      0,
      0,
      0,
      0,
    );

    const days: DayInfo[] = [];
    for (let i = 0; i < 42; i++) {
      const dLocal = new Date(gridStartLocal);
      dLocal.setDate(gridStartLocal.getDate() + i); // DST-safe day increment
      const inMonth = dLocal.getMonth() === firstLocal.getMonth();
      const key = fmtKey(dLocal);
      days.push({ date: dLocal, inMonth, isToday: key === todayKey, key });
    }
    return days;
  }, [monthStart, offsetMs, todayKey]);

  // Precompute markers per day
  // Stable arrays for memo deps
  const monthEvents = useMemo(() => (agendaMonth?.events ?? []) as any[], [agendaMonth]);
  const monthTasks = useMemo(() => (agendaMonth?.tasks ?? []) as any[], [agendaMonth]);
  const monthHolidays = useMemo(() => (agendaMonth?.holidays ?? []) as any[], [agendaMonth]);
  const monthNotes = useMemo(() => (agendaMonth?.notes ?? []) as any[], [agendaMonth]);

  const markers = useMemo(() => {
    // Count per grid day using the SAME UTC bounds the preview uses.
    const m: Record<string, { events: number; tasks: number; holidays: number; notes: number; maxPriority: number }> = {};
    const events = monthEvents;
    const tasks = monthTasks;
    const holidays = monthHolidays as Array<{ dateKey: string }>;
    const notes = monthNotes as Array<{ agendaDate?: number }>;

    const priVal = (p?: "low" | "medium" | "high" | "urgent"): number =>
      p === "urgent" ? 4 : p === "high" ? 3 : p === "medium" ? 2 : p === "low" ? 1 : 0;

    const overlaps = (sa: number, ea: number | undefined, sb: number, eb: number) => {
      const aEnd = typeof ea === "number" ? ea : sa;
      return sa <= eb && aEnd >= sb;
    };

    for (const day of gridDays) {
      const key = day.key;
      // Compute UTC [start,end] for this day in the selected timezone using noon trick.
      const offsetAtDateMin = tzOffsetMinutesAt(selectedTz, day.date);
      const offsetAtDateMs = offsetAtDateMin * 60 * 1000;
      const middayUtc = Date.parse(`${key}T12:00:00Z`);
      const localNoon = middayUtc + offsetAtDateMs;
      const d0 = new Date(localNoon);
      d0.setUTCHours(0, 0, 0, 0);
      const startUtc = d0.getTime() - offsetAtDateMs;
      const endUtc = startUtc + 24 * 60 * 60 * 1000 - 1;

      // Initialize bucket
      if (!m[key]) m[key] = { events: 0, tasks: 0, holidays: 0, notes: 0, maxPriority: 0 };

      // Holidays: match by canonical key
      m[key].holidays += holidays.filter((h) => h.dateKey === key).length;

      // Tasks: dueDate within [startUtc, endUtc]
      for (const t of tasks) {
        const dueRaw = (t as any).dueDate;
        const due = typeof dueRaw === "number" ? dueRaw : undefined;
        if (typeof due === "number" && due >= startUtc && due <= endUtc) {
          m[key].tasks += 1;
          const pv = priVal((t as any).priority);
          if (pv > m[key].maxPriority) m[key].maxPriority = pv;
        }
      }

      // Events: overlap with [startUtc, endUtc]
      for (const e of events) {
        const sRaw = (e as any).startTime;
        if (typeof sRaw !== "number") continue;
        const enRaw = (e as any).endTime;
        const en = typeof enRaw === "number" ? enRaw : undefined;
        if (overlaps(sRaw, en, startUtc, endUtc)) {
          m[key].events += 1;
        }
      }

      // Notes: agendaDate within [startUtc, endUtc]
      for (const n of notes) {
        const a = (n as any).agendaDate;
        if (typeof a === "number" && a >= startUtc && a <= endUtc) {
          m[key].notes += 1;
        }
      }
    }

    return m;
  }, [monthEvents, monthTasks, monthHolidays, monthNotes, gridDays, selectedTz]);

  // Active preview day: either pinned or hovered
  const activeKey = pinnedKey ?? hoveredKey;
  const activeInfo = useMemo(() => {
    return activeKey ? gridDays.find((d) => d.key === activeKey) ?? null : null;
  }, [gridDays, activeKey]);
  const activeStartUtc = useMemo(() => {
    if (!activeInfo) return null;
    // Compute start of day for the hovered/pinned date in the SELECTED time zone,
    // not the system zone. We do this by:
    // 1) Building a YYYY-MM-DD key for the visible date (already aligned to the selected zone).
    // 2) Taking noon UTC of that key to avoid DST edge cases.
    // 3) Converting that instant into the selected zone by adding the zone offset for that date.
    // 4) Zeroing out the day at UTC fields, then converting back by subtracting the same offset.
    const key = fmtKey(activeInfo.date);
    const offsetAtDateMin = tzOffsetMinutesAt(selectedTz, activeInfo.date);
    const offsetAtDateMs = offsetAtDateMin * 60 * 1000;
    const middayUtc = Date.parse(`${key}T12:00:00Z`);
    const localNoon = middayUtc + offsetAtDateMs; // noon in the selected zone
    const d = new Date(localNoon);
    d.setUTCHours(0, 0, 0, 0); // start of local day in selected zone
    return d.getTime() - offsetAtDateMs; // convert back to UTC for backend queries
  }, [activeInfo, selectedTz]);
  const [showQuickNote, setShowQuickNote] = useState(false);
  const createDocument = useMutation(api.documents.create);
  const activeEndUtc = useMemo(() => (activeStartUtc !== null ? (activeStartUtc + 24 * 60 * 60 * 1000 - 1) : null), [activeStartUtc]);
  // Use dateKey for holiday range to hit 00:00:00Z on that local day
  const previewHolidayRange = useMemo(() => {
    if (!activeInfo) return null;
    const key = fmtKey(activeInfo.date);
    return {
      startUtc: Date.parse(`${key}T00:00:00Z`),
      endUtc: Date.parse(`${key}T23:59:59Z`),
    };
    // Depend on activeInfo.date so key updates correctly
  }, [activeInfo]);
  // Create an event from a holiday preview
  const handleCreateHolidayEvent = (name: string) => {
    if (!activeInfo) return;
    const localMidnightMs = new Date(
      activeInfo.date.getFullYear(),
      activeInfo.date.getMonth(),
      activeInfo.date.getDate(),
      0, 0, 0, 0,
    ).getTime();
    setEditTarget({ kind: "createBoth", dateMs: localMidnightMs, defaultAllDay: true, defaultTitle: name });
  };
  const previewAgenda = useQuery(
    (api as any).calendar.listAgendaInRange,
    activeStartUtc !== null && activeEndUtc !== null && previewHolidayRange !== null
      ? {
          start: activeStartUtc,
          end: activeEndUtc,
          country: "US",
          holidaysStartUtc: previewHolidayRange.startUtc,
          holidaysEndUtc: previewHolidayRange.endUtc,
        }
      : "skip",
  );

  const monthLabel = useMemo(() => {
    const d = toLocalDateInZone(monthStart, selectedTz);
    return d.toLocaleString(undefined, { month: "long", year: "numeric" });
  }, [monthStart, selectedTz]);

  const dayLabels = ["M", "T", "W", "T", "F", "S", "S"] as const;

  // Clock formatting in the selected timezone
  const effectiveTz = selectedTz;
  const clockText = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(undefined, {
        timeZone: effectiveTz,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(new Date(now));
    } catch {
      return new Date(now).toLocaleTimeString();
    }
  }, [now, effectiveTz]);

  const tzOptions: Array<{ value: string; label: string }> = useMemo(() => {
    const common: Array<{ value: string; label: string }> = [
      { value: browserTz || "", label: browserTz ? `System (${browserTz})` : "System" },
      { value: "UTC", label: "UTC" },
      { value: "America/Los_Angeles", label: "America/Los_Angeles" },
      { value: "America/Denver", label: "America/Denver" },
      { value: "America/Chicago", label: "America/Chicago" },
      { value: "America/New_York", label: "America/New_York" },
      { value: "Europe/London", label: "Europe/London" },
      { value: "Europe/Paris", label: "Europe/Paris" },
      { value: "Europe/Berlin", label: "Europe/Berlin" },
      { value: "Asia/Tokyo", label: "Asia/Tokyo" },
      { value: "Asia/Shanghai", label: "Asia/Shanghai" },
      { value: "Asia/Kolkata", label: "Asia/Kolkata" },
      { value: "Australia/Sydney", label: "Australia/Sydney" },
    ];
    // Deduplicate if browserTz equals one of the listed
    const seen = new Set<string>();
    const result: Array<{ value: string; label: string }> = [];
    for (const o of common) {
      if (!o.value) continue;
      if (seen.has(o.value)) continue;
      seen.add(o.value);
      result.push(o);
    }
    return result;
  }, [browserTz]);

  // Small formatter for tile badge counts to keep layout compact
  const fmtSmall = (n: number): string => (n > 9 ? "9+" : String(n));

  const onChangeTimeZone = async (value: string) => {
    const newTz = value || browserTz;
    setSelectedTz(newTz);
    try {
      if (newTz) await setTimeZonePref({ timeZone: newTz });
    } catch (e) {
      // no-op; UI already updated
      console.error("Failed to save timezone preference", e);
    }
  };

  const goPrev = () => {
    setAnchor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  const goNext = () => {
    setAnchor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // onClickDay removed; click now toggles a pinned preview. Use action buttons to view day/week.

  return (
    <div className="relative bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl overflow-visible">
      {/* Singular watermark for mini calendar */}
      <span className="document-card__bg document-row__bg text-[var(--accent-primary)]" aria-hidden>
        <CalendarDays className="h-10 w-10 rotate-12" />
      </span>
      {/* Clock + Timezone selector */}
      <div className="px-3 py-1.5 border-b border-[var(--border-color)] flex items-center justify-between">
        <div className="font-mono text-[11px] text-[var(--text-primary)]" aria-live="polite" aria-label="Current time">
          {clockText}
        </div>
        <div className="flex items-center gap-1.5">
          <label className="text-[11px] text-[var(--text-muted)]" htmlFor="tz-select">Time zone</label>
          <select
            id="tz-select"
            className="h-6 text-[10px] leading-[1rem] bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-md px-1 py-0"
            value={effectiveTz || browserTz || "UTC"}
            onChange={(e) => { void onChangeTimeZone(e.target.value); }}
          >
            {tzOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="px-3 py-2 border-b border-[var(--border-color)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-sm font-semibold text-[var(--text-primary)]">{monthLabel}</div>
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0 rounded-full border text-[10px] bg-amber-50 text-amber-700 border-amber-200"
            title="Click a date to preview. Use actions to view day/week."
            aria-label="Mini calendar tips"
          >
            <Lightbulb className="h-3 w-3 text-amber-500" />
            Tips
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            className="w-7 h-7 rounded-md flex items-center justify-center bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)]"
            onClick={goPrev}
            aria-label="Previous month"
            title="Previous month"
          >
            <span className="text-[var(--text-secondary)]">‹</span>
          </button>
          <button
            className="w-7 h-7 rounded-md flex items-center justify-center bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)]"
            onClick={goNext}
            aria-label="Next month"
            title="Next month"
          >
            <span className="text-[var(--text-secondary)]">›</span>
          </button>
        </div>
      </div>
      <div className="p-2">
        <div className="grid grid-cols-7 text-center text-[11px] text-[var(--text-muted)] mb-1">
          {dayLabels.map((lbl, i) => (
            <div key={`lbl_${lbl}_${i}`} className="font-medium">{lbl}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {gridDays.map((d, idx) => {
            const m = markers[d.key] ?? { events: 0, tasks: 0, holidays: 0, notes: 0, maxPriority: 0 };
            const _hasMarkers = m.events > 0 || m.tasks > 0 || m.holidays > 0 || m.notes > 0;
            const pr = m.maxPriority ?? 0;
            const priorityRing = pr >= 4
              ? "ring-2 ring-red-500"
              : pr === 3
              ? "ring-2 ring-amber-500"
              : pr === 2
              ? "ring-2 ring-yellow-500"
              : pr === 1
              ? "ring-2 ring-emerald-500"
              : "";
            return (
              <div
                key={d.key}
                role="button"
                tabIndex={0}
                aria-pressed={pinnedKey === d.key}
                aria-current={d.isToday ? "date" : undefined}
                aria-label={`Select ${d.date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`}
                onClick={(e) => {
                  e.preventDefault();
                  // Toggle pin on click; keep hover state consistent
                  setPinnedKey((cur) => (cur === d.key ? null : d.key));
                  setHoveredKey(d.key);
                  // Notify parent of selected date (UTC ms of local day start)
                  try {
                    const localMidnightMs = new Date(
                      d.date.getFullYear(), d.date.getMonth(), d.date.getDate(),
                      0, 0, 0, 0,
                    ).getTime();
                    _onSelectDate?.(localMidnightMs);
                  } catch {}
                }}
                onDoubleClick={(e) => {
                  e.preventDefault();
                  try {
                    const localMidnightMs = new Date(
                      d.date.getFullYear(), d.date.getMonth(), d.date.getDate(),
                      0, 0, 0, 0,
                    ).getTime();
                    _onViewDay?.(localMidnightMs);
                  } catch {}
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setPinnedKey((cur) => (cur === d.key ? null : d.key));
                    setHoveredKey(d.key);
                    try {
                      const localMidnightMs = new Date(
                        d.date.getFullYear(), d.date.getMonth(), d.date.getDate(),
                        0, 0, 0, 0,
                      ).getTime();
                      _onSelectDate?.(localMidnightMs);
                    } catch {}
                  }
                }}
                onMouseEnter={() => setHoveredKey(d.key)}
                onMouseLeave={() => setHoveredKey((cur) => (cur === d.key ? null : cur))}
                className={`relative aspect-square rounded-lg p-1 text-left border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF] ${
                  d.isToday
                    ? "border-[#007AFF] bg-[#007AFF]/10"
                    : "border-[var(--border-color)] hover:bg-[var(--bg-hover)]"
                  } ${d.inMonth ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]/60"}`}
                title={d.date.toDateString()}
              >
                <div className="text-[11px] font-medium">
                  <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full ${priorityRing}`}>
                    {d.date.getDate()}
                  </span>
                </div>
                {/* Markers (fixed positions; always rendered, zero counts muted) */}
                <div className="absolute bottom-0.5 left-0.5 right-0.5 space-y-0.5">
                    {/* Top row: events (left), holidays (right) */}
                    <div className="flex items-center justify-between">
                      <span className="relative inline-flex items-center">
                        <span className={`inline-block w-1 h-1 rounded-full ${m.events > 0 ? "bg-blue-500" : "opacity-0"}`} />
                        <span className={`ml-0.5 text-[8px] leading-none font-medium w-3 text-center ${m.events > 0 ? "text-blue-700" : "text-[var(--text-muted)]/60"}`}>{m.events > 0 ? fmtSmall(m.events) : ""}</span>
                      </span>
                      <span className="relative inline-flex items-center">
                        <span className={`inline-block w-1 h-1 rounded-full ${m.holidays > 0 ? "bg-purple-500" : "opacity-0"}`} />
                        <span className={`ml-0.5 text-[8px] leading-none font-medium w-3 text-center ${m.holidays > 0 ? "text-purple-700" : "text-[var(--text-muted)]/60"}`}>{m.holidays > 0 ? fmtSmall(m.holidays) : ""}</span>
                      </span>
                    </div>
                    {/* Bottom row: tasks (left), notes (right) */}
                    <div className="flex items-center justify-between">
                      <span className="relative inline-flex items-center">
                        <span className={`inline-block w-1 h-1 rounded-full ${m.tasks > 0 ? "bg-emerald-500" : "opacity-0"}`} />
                        <span className={`ml-0.5 text-[8px] leading-none font-medium w-3 text-center ${m.tasks > 0 ? "text-emerald-700" : "text-[var(--text-muted)]/60"}`}>{m.tasks > 0 ? fmtSmall(m.tasks) : ""}</span>
                      </span>
                      <span className="relative inline-flex items-center">
                        <span className={`inline-block w-1 h-1 rounded-full ${m.notes > 0 ? "bg-amber-500" : "opacity-0"}`} />
                        <span className={`ml-0.5 text-[8px] leading-none font-medium w-3 text-center ${m.notes > 0 ? "text-amber-700" : "text-[var(--text-muted)]/60"}`}>{m.notes > 0 ? fmtSmall(m.notes) : ""}</span>
                      </span>
                    </div>
                  </div>

                {/* Hover/Pinned Preview */}
                {(activeKey === d.key) && (
                  <div
                    className={`absolute z-30 top-1 ${editTarget ? "w-72 max-w-[18rem]" : "w-64 max-w-[18rem]"} rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-xl p-2 text-[11px] ${
                      // In sidebar, keep previews inside; otherwise flip near right edge
                      constrainToSidebar ? "right-2" : ( (idx % 7) >= 4 ? "right-full mr-2" : "left-full ml-2" )
                    }`}
                    role="dialog"
                    aria-label={`Preview for ${d.date.toDateString()}`}
                    ref={pinnedKey === d.key ? previewRef : undefined}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-[10px] text-[var(--text-muted)]">
                        {d.date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                      </div>
                      {pinnedKey === d.key && (
                        <button
                          className="w-5 h-5 inline-flex items-center justify-center rounded hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]"
                          aria-label="Close preview"
                          title="Close"
                          onClick={(e) => { e.stopPropagation(); setPinnedKey(null); setHoveredKey(null); setEditTarget(null); }}
                        >
                          ×
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mb-1">
                      <div className="inline-flex items-center gap-1 text-blue-700">
                        <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                        {m.events} events
                      </div>
                      <div className="inline-flex items-center gap-1 text-purple-700">
                        <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />
                        {m.holidays} holidays
                      </div>
                      <div className="inline-flex items-center gap-1 text-emerald-700">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                        {m.tasks} tasks
                      </div>
                      <div className="inline-flex items-center gap-1 text-amber-700">
                        <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                        {m.notes} notes
                      </div>
                    </div>
                    {/* Content lists or editor */}
                    {editTarget ? (
                      <div className="mt-2">
                        {editTarget.kind === "task" && (
                          <PopoverMiniEditor kind="task" taskId={editTarget.id as Id<"tasks">} onClose={() => setEditTarget(null)} />
                        )}
                        {editTarget.kind === "event" && (
                          <PopoverMiniEditor kind="event" eventId={editTarget.id as Id<"events">} onClose={() => setEditTarget(null)} />
                        )}
                        {editTarget.kind === "create" && (
                          <DualCreateMiniPanel
                            dateMs={editTarget.dateMs}
                            defaultTitle={editTarget.defaultTitle}
                            defaultAllDay={editTarget.defaultAllDay}
                            onClose={() => setEditTarget(null)}
                          />
                        )}
                        {editTarget.kind === "createBoth" && (
                          <DualEditMiniPanel
                            dateMs={editTarget.dateMs}
                            defaultTitle={editTarget.defaultTitle}
                            defaultAllDay={editTarget.defaultAllDay}
                            onClose={() => setEditTarget(null)}
                          />
                        )}
                        {editTarget.kind === "note" && (
                          <DocumentMiniEditor documentId={editTarget.id as Id<"documents">} onClose={() => setEditTarget(null)} />
                        )}
                        {editTarget.kind === "holiday" && (
                          <div className="p-2 border border-[var(--border-color)] rounded-md bg-[var(--bg-primary)]">
                            <div className="text-sm font-semibold text-[var(--text-primary)] mb-1">{editTarget.name}</div>
                            <div className="text-[11px] text-[var(--text-secondary)]">Official holiday. Details may be read-only.</div>
                            <div className="mt-2 flex items-center justify-end gap-2">
                              <button
                                className="text-[11px] px-2 py-1 rounded-md border border-[var(--border-color)] bg-blue-50 text-blue-700 hover:bg-blue-100"
                                onClick={(e) => { e.stopPropagation(); void handleCreateHolidayEvent(editTarget.name); }}
                                aria-label="Create event from holiday"
                              >
                                Create event
                              </button>
                              <button
                                className="text-[11px] px-2 py-1 rounded-md border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)]"
                                onClick={(e) => { e.stopPropagation(); setEditTarget(null); }}
                              >
                                Close
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        {previewAgenda === undefined ? (
                          <div className="text-[var(--text-muted)]">Loading…</div>
                        ) : (
                          <div className="space-y-1.5">
                            {(previewAgenda?.holidays ?? []).slice(0, 3).map((h: any, idx: number) => (
                              <div
                                key={`ph_${idx}`}
                                className="relative overflow-visible pl-2 py-1 pr-1 rounded-sm cursor-pointer border border-purple-200 bg-purple-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (activeInfo) {
                                    const localMidnightMs = new Date(
                                      activeInfo.date.getFullYear(),
                                      activeInfo.date.getMonth(),
                                      activeInfo.date.getDate(),
                                      0, 0, 0, 0,
                                    ).getTime();
                                    setEditTarget({ kind: "createBoth", dateMs: localMidnightMs, defaultAllDay: true, defaultTitle: String(h?.name ?? "Holiday") });
                                  }
                                }}
                              >
                                <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-purple-500/70" aria-hidden />
                                <div className="min-w-0 flex items-center gap-2">
                                  <span className="text-[10px] px-1 rounded border border-purple-200 bg-purple-50 text-purple-700">Holiday</span>
                                  <span className="truncate text-[var(--text-primary)] text-xs">{h.name}</span>
                                </div>
                              </div>
                            ))}
                            {(previewAgenda?.events ?? []).slice(0, 3).map((ev: any, idx: number) => (
                              <AgendaMiniRow key={`pev_${idx}`} item={ev} kind="event" onSelect={(id) => setEditTarget({ kind: "event", id: String(id) })} />
                            ))}
                            {(previewAgenda?.tasks ?? []).slice(0, 3).map((t: any, idx: number) => (
                              <AgendaMiniRow key={`pt_${idx}`} item={t} kind="task" onSelect={(id) => setEditTarget({ kind: "task", id: String(id) })} />
                            ))}
                            {(previewAgenda?.notes ?? []).slice(0, 3).map((n: any, idx: number) => (
                              <AgendaMiniRow key={`pn_${idx}`} item={n} kind="note" onSelect={(id) => setEditTarget({ kind: "note", id: String(id) })} />
                            ))}
                            {/* Add agenda + Quick Note buttons */}
                            {activeInfo && (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] text-[11px]"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const localMidnightMs = new Date(
                                      activeInfo.date.getFullYear(),
                                      activeInfo.date.getMonth(),
                                      activeInfo.date.getDate(),
                                      0, 0, 0, 0,
                                    ).getTime();
                                    setEditTarget({ kind: "create", dateMs: localMidnightMs });
                                  }}
                                  aria-label="Add agenda item"
                                  title="Add agenda item"
                                >
                                  <Plus className="w-3 h-3 text-[var(--text-secondary)]" />
                                  Add
                                </button>
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] text-[11px]"
                                  onClick={(e) => { e.stopPropagation(); setShowQuickNote((v) => !v); }}
                                  aria-label="Quick note"
                                  title="Quick note"
                                >
                                  <StickyNote className="w-3 h-3 text-[var(--text-secondary)]" />
                                  Quick Note
                                </button>
                                {/* View actions to sync hubs */}
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-[var(--border-color)] bg-blue-50 text-blue-700 hover:bg-blue-100 text-[11px]"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    try {
                                      const localMidnightMs = new Date(
                                        activeInfo.date.getFullYear(),
                                        activeInfo.date.getMonth(),
                                        activeInfo.date.getDate(),
                                        0, 0, 0, 0,
                                      ).getTime();
                                      _onViewDay?.(localMidnightMs);
                                    } catch {}
                                  }}
                                  aria-label="View day"
                                  title="View day"
                                >
                                  Day
                                </button>
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-[var(--border-color)] bg-blue-50 text-blue-700 hover:bg-blue-100 text-[11px]"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    try {
                                      const localMidnightMs = new Date(
                                        activeInfo.date.getFullYear(),
                                        activeInfo.date.getMonth(),
                                        activeInfo.date.getDate(),
                                        0, 0, 0, 0,
                                      ).getTime();
                                      _onViewWeek?.(localMidnightMs);
                                    } catch {}
                                  }}
                                  aria-label="View week"
                                  title="View week"
                                >
                                  Week
                                </button>
                              </div>
                            )}

                            {showQuickNote && activeInfo && (
                              <div className="mt-2">
                                <PopoverMiniDocEditor
                                  initialValue=""
                                  initialJson={null}
                                  title={`Quick note for ${activeInfo.date.toLocaleDateString()}`}
                                  saveLabel="Create note"
                                  cancelLabel="Close"
                                  onCancel={() => setShowQuickNote(false)}
                                  onSave={async ({ text }) => {
                                    const title = `Note ${activeInfo.date.toLocaleDateString()}`;
                                    const content = [{ type: "paragraph", text }];
                                    try {
                                      await createDocument({ title, content, agendaDate: activeStartUtc ?? undefined } as any);
                                      toast.success("Note created");
                                      setShowQuickNote(false);
                                    } catch (e) {
                                      console.error(e);
                                      toast.error("Failed to create note");
                                    }
                                  }}
                                />
                              </div>
                            )}
                            {(!previewAgenda || ((previewAgenda.events ?? []).length === 0 && (previewAgenda.tasks ?? []).length === 0 && (previewAgenda.holidays ?? []).length === 0 && (previewAgenda.notes ?? []).length === 0)) && (
                              <div className="text-[var(--text-muted)]">No items</div>
                            )}
                            {/* Summary footer only */}
                            <div className="mt-2 pt-2 border-t border-[var(--border-color)]">
                              <div className="text-[10px] text-[var(--text-muted)]">Summary</div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
