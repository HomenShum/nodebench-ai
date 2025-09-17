import React, { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { X, Trash2, Save, CalendarDays, MapPin, Palette, Tag } from "lucide-react";
import { toast } from "sonner";
import InlineRichEditor from "./common/InlineRichEditor";

type Props = {
  eventId: Id<"events">;
  onClose: () => void;
  documentIdForAssociation?: Id<"documents"> | null;
  /**
   * When true, renders inline within the parent (no full-screen overlay/backdrop).
   * Defaults to false (overlay panel behavior).
   */
  embedded?: boolean;
};

export default function EventEditorPanel({ eventId, onClose, documentIdForAssociation, embedded = false }: Props) {
  const event = useQuery(api.events.getEvent, { eventId });
  const updateEvent = useMutation(api.events.updateEvent);
  const deleteEvent = useMutation(api.events.deleteEvent);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState<"confirmed" | "tentative" | "cancelled">("confirmed");
  const [color, setColor] = useState<string>("");
  const [tags, setTags] = useState<string[]>([]);
  const [allDay, setAllDay] = useState<boolean>(false);
  const [startStr, setStartStr] = useState<string>("");
  const [endStr, setEndStr] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const getEditorJsonRef = useRef<null | (() => Promise<any>)>(null);
  const [showLocation, setShowLocation] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showTagsEditor, setShowTagsEditor] = useState(false);

  // Initialize form from event
  useEffect(() => {
    if (!event) return;
    setTitle(event.title ?? "");
    setDescription(event.description ?? "");
    setLocation(event.location ?? "");
    setStatus((event.status as any) ?? "confirmed");
    setColor(event.color ?? "");
    setTags(Array.isArray(event.tags) ? event.tags : []);
    setAllDay(!!event.allDay);
    setStartStr(event.startTime ? toInputDateTimeLocal(event.startTime) : "");
    setEndStr(event.endTime ? toInputDateTimeLocal(event.endTime) : "");
  }, [event]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleSave = useCallback(async () => {
    if (!event) return;
    setIsSaving(true);
    try {
      // Convert dates back to ms; for all-day, keep existing times if inputs empty
      const startMs = startStr ? fromInputDateTimeLocal(startStr) : undefined;
      const endMs = endStr ? fromInputDateTimeLocal(endStr) : undefined;
      // Extract Editor.js JSON for canonical storage
      let descriptionJson: string | undefined = undefined;
      try {
        const getter = getEditorJsonRef.current;
        if (getter) {
          const json = await getter();
          if (json) descriptionJson = JSON.stringify(json);
        }
      } catch { /* ignore */ }
      await updateEvent({
        eventId,
        title: title.trim() || event.title,
        description: description.trim(),
        descriptionJson,
        location: location.trim(),
        status,
        color: color || undefined,
        tags,
        allDay,
        startTime: startMs,
        endTime: endMs,
        // Ensure association with selected document when provided
        documentId: documentIdForAssociation ?? undefined,
      });
      toast.success("Event saved");
      onClose();
    } catch (e) {
      console.error(e);
      toast.error("Failed to save event");
    } finally {
      setIsSaving(false);
    }
  }, [event, updateEvent, eventId, title, description, location, status, color, tags, allDay, startStr, endStr, onClose, documentIdForAssociation]);

  const handleDelete = useCallback(async () => {
    if (!event) return;
    const ok = window.confirm("Delete this event?");
    if (!ok) return;
    try {
      await deleteEvent({ eventId });
      toast.success("Event deleted");
      onClose();
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete event");
    }
  }, [deleteEvent, event, eventId, onClose]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void handleSave();
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleSave, handleClose]);

  if (event === undefined) {
    return embedded ? (
      <div className="h-full w-full bg-[var(--bg-secondary)] border-l border-[var(--border-color)] p-4">
        <div className="animate-pulse h-6 w-40 bg-[var(--bg-primary)] rounded mb-4" />
        <div className="space-y-2">
          <div className="h-4 bg-[var(--bg-primary)] rounded" />
          <div className="h-4 bg-[var(--bg-primary)] rounded w-5/6" />
          <div className="h-4 bg-[var(--bg-primary)] rounded w-2/3" />
        </div>
      </div>
    ) : (
      <div className="fixed inset-0 z-50">
        <div className="absolute inset-0 bg-black/30" onClick={handleClose} />
        <div className="absolute right-0 top-0 h-full w-[min(520px,100%)] bg-[var(--bg-secondary)] border-l border-[var(--border-color)] shadow-2xl p-4">
          <div className="animate-pulse h-6 w-40 bg-[var(--bg-primary)] rounded mb-4" />
          <div className="space-y-2">
            <div className="h-4 bg-[var(--bg-primary)] rounded" />
            <div className="h-4 bg-[var(--bg-primary)] rounded w-5/6" />
            <div className="h-4 bg-[var(--bg-primary)] rounded w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return embedded ? (
      <div className="h-full w-full bg-[var(--bg-secondary)] border-l border-[var(--border-color)] p-4 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Event not found</h3>
          <button className="w-8 h-8 rounded-md flex items-center justify-center bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)]" onClick={onClose}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[var(--text-secondary)] text-sm">This event may have been deleted.</p>
      </div>
    ) : (
      <div className="fixed inset-0 z-50">
        <div className="absolute inset-0 bg-black/30" onClick={onClose} />
        <div className="absolute right-0 top-0 h-full w-[min(520px,100%)] bg-[var(--bg-secondary)] border-l border-[var(--border-color)] shadow-2xl p-4 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Event not found</h3>
            <button className="w-8 h-8 rounded-md flex items-center justify-center bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)]" onClick={onClose}>
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[var(--text-secondary)] text-sm">This event may have been deleted.</p>
        </div>
      </div>
    );
  }

  return embedded ? (
    <div className="h-full w-full bg-[var(--bg-secondary)] border-l border-[var(--border-color)] flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-[var(--border-color)] flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate inline-flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-amber-500" /> Edit Event
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void handleDelete()}
            className="w-8 h-8 rounded-md flex items-center justify-center bg-[var(--bg-primary)] hover:bg-red-500 text-[var(--text-secondary)] hover:text-white border border-[var(--border-color)] hover:border-red-500"
            title="Delete event"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-md flex items-center justify-center bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] border border-[var(--border-color)]"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-3 flex-1 overflow-auto space-y-3">
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-sm bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md p-2 text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
            placeholder="Event title"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Description</label>
          <div className="w-full border border-[var(--border-color)]/60 rounded-md bg-[var(--bg-secondary)]">
            <InlineRichEditor value={description} onChange={setDescription} placeholder="Write details…" initialJson={(event as any)?.descriptionJson ?? null} registerSaveExtractor={(fn) => { getEditorJsonRef.current = fn; }} />
          </div>
        </div>

        {/* Chips row: All‑day, Status, Start, End, Location, Color, Tags */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setAllDay((v) => !v)}
            className="pill pill--time inline-flex items-center gap-1 text-[11px]"
            title="Toggle all‑day"
          >
            <CalendarDays className="w-3 h-3 opacity-70" /> {allDay ? "All‑day" : "Timed"}
          </button>
          {/* Status pills */}
          <div className="inline-flex items-center gap-1 ml-2">
            {(["confirmed", "tentative", "cancelled"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`pill inline-flex items-center gap-1 text-[11px] ${status === s ? "bg-[var(--accent-primary)] text-white border-[var(--accent-primary)]" : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)]"}`}
                title={`Set status: ${s}`}
              >
                {s === "confirmed" ? "Confirmed" : s === "tentative" ? "Tentative" : "Cancelled"}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowStartPicker((v) => !v)}
            className="pill pill--time inline-flex items-center gap-1 text-[11px]"
            title="Set start"
            aria-expanded={showStartPicker}
          >
            <CalendarDays className="w-3 h-3 opacity-70" /> {startStr ? `Start: ${startStr}` : "Start"}
          </button>
          <button
            type="button"
            onClick={() => setShowEndPicker((v) => !v)}
            className="pill pill--time inline-flex items-center gap-1 text-[11px]"
            title="Set end"
            aria-expanded={showEndPicker}
          >
            <CalendarDays className="w-3 h-3 opacity-70" /> {endStr ? `End: ${endStr}` : "End"}
          </button>

          <button
            type="button"
            onClick={() => setShowLocation((v) => !v)}
            className="pill pill--time inline-flex items-center gap-1 text-[11px]"
            title="Set location"
            aria-expanded={showLocation}
          >
            <MapPin className="w-3 h-3 opacity-70" /> {location ? (location.length > 24 ? `${location.slice(0, 24)}…` : location) : "Location"}
          </button>

          {/* Color chip */}
          <button
            type="button"
            onClick={() => setShowColorPicker((v) => !v)}
            className="pill pill--time inline-flex items-center gap-1 text-[11px]"
            title="Set color"
            aria-expanded={showColorPicker}
          >
            <Palette className="w-3 h-3 opacity-70" /> {color ? color : "Color"}
          </button>

          {/* Tags chip */}
          <button
            type="button"
            onClick={() => setShowTagsEditor((v) => !v)}
            className="pill pill--time inline-flex items-center gap-1 text-[11px]"
            title="Edit tags"
            aria-expanded={showTagsEditor}
          >
            <Tag className="w-3 h-3 opacity-70" /> {tags.length > 0 ? `${tags.length} tag${tags.length > 1 ? "s" : ""}` : "Tags"}
          </button>
        </div>

        {(showStartPicker || showEndPicker) && (
          <div className="flex flex-wrap gap-3">
            {showStartPicker && (
              <input
                type="datetime-local"
                value={startStr}
                onChange={(e) => setStartStr(e.target.value)}
                disabled={allDay}
                className="text-sm bg-transparent border border-transparent rounded-md px-0 py-1 text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
              />
            )}
            {showEndPicker && (
              <input
                type="datetime-local"
                value={endStr}
                onChange={(e) => setEndStr(e.target.value)}
                disabled={allDay}
                className="text-sm bg-transparent border border-transparent rounded-md px-0 py-1 text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
              />
            )}
          </div>
        )}

        {showLocation && (
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Where is this event?"
              className="text-sm bg-transparent border border-transparent rounded-md px-0 py-1 text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
            />
          </div>
        )}

        {showColorPicker && (
          <div className="flex flex-wrap items-center gap-1 mt-1.5">
            {(["blue","green","amber","red","purple","gray"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`h-5 w-5 rounded-full border border-[var(--border-color)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] ${
                  c === "blue" ? "bg-blue-500" : c === "green" ? "bg-emerald-500" : c === "amber" ? "bg-amber-500" : c === "red" ? "bg-red-500" : c === "purple" ? "bg-purple-500" : "bg-gray-400"
                } ${color === c ? "ring-2 ring-offset-1 ring-[var(--accent-primary)]" : ""}`}
                title={c}
              />
            ))}
            <button
              type="button"
              onClick={() => setColor("")}
              className="text-[11px] px-2 py-0.5 rounded border border-[var(--border-color)] text-[var(--text-secondary)] bg-[var(--bg-secondary)]"
              title="Clear color"
            >
              Clear
            </button>
          </div>
        )}

        {showTagsEditor && (
          <div className="flex flex-wrap items-center gap-1 mt-1.5">
            {tags.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)]">
                {t}
                <button
                  type="button"
                  onClick={() => setTags((prev) => prev.filter((x) => x !== t))}
                  className="text-[10px] opacity-70 hover:opacity-100"
                  title="Remove tag"
                >
                  ×
                </button>
              </span>
            ))}
            <input
              type="text"
              placeholder="Add tag…"
              className="text-[11px] bg-transparent border border-transparent rounded-md px-1.5 py-0.5 text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
              onKeyDown={(e) => {
                const el = e.currentTarget;
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

        {/* Location moved to chip with inline input */}

        <div className="text-[10px] text-[var(--text-muted)]">Created {event.createdAt ? timeAgo(event.createdAt) : "—"} · Updated {event.updatedAt ? timeAgo(event.updatedAt) : "—"}</div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-[var(--border-color)] flex items-center justify-end gap-2">
        <button
          onClick={handleClose}
          className="text-[11px] px-2.5 py-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]"
        >
          Close
        </button>
        <button
          onClick={() => void handleSave()}
          disabled={isSaving}
          className={`text-[11px] px-3 py-1.5 rounded-md transition-colors ${isSaving ? 'bg-[var(--bg-secondary)] text-[var(--text-muted)] border border-[var(--border-color)] cursor-not-allowed' : 'bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary-hover)]'}`}
        >
          <span className="inline-flex items-center gap-1"><Save className="w-3.5 h-3.5" /> Save</span>
        </button>
      </div>
    </div>
  ) : (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={handleClose} />
      <div className="absolute right-0 top-0 h-full w-[min(520px,100%)] bg-[var(--bg-secondary)] border-l border-[var(--border-color)] shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate inline-flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-amber-500" /> Edit Event
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void handleDelete()}
              className="w-8 h-8 rounded-md flex items-center justify-center bg-[var(--bg-primary)] hover:bg-red-500 text-[var(--text-secondary)] hover:text-white border border-[var(--border-color)] hover:border-red-500"
              title="Delete event"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-md flex items-center justify-center bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] border border-[var(--border-color)]"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 flex-1 overflow-auto space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-sm bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md p-2 text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
              placeholder="Event title"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Description</label>
            <div className="w-full border border-[var(--border-color)]/60 rounded-md bg-[var(--bg-secondary)]">
              <InlineRichEditor value={description} onChange={setDescription} placeholder="Write details…" initialJson={(event as any)?.descriptionJson ?? null} registerSaveExtractor={(fn) => { getEditorJsonRef.current = fn; }} />
            </div>
          </div>

          {/* Chips row: All‑day, Status, Start, End, Location, Color, Tags (overlay) */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setAllDay((v) => !v)}
              className="pill pill--time inline-flex items-center gap-1 text-[11px]"
              title="Toggle all‑day"
            >
              <CalendarDays className="w-3 h-3 opacity-70" /> {allDay ? "All‑day" : "Timed"}
            </button>
            {/* Status pills */}
            <div className="inline-flex items-center gap-1 ml-2">
              {(["confirmed", "tentative", "cancelled"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`pill inline-flex items-center gap-1 text-[11px] ${status === s ? "bg-[var(--accent-primary)] text-white border-[var(--accent-primary)]" : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)]"}`}
                  title={`Set status: ${s}`}
                >
                  {s === "confirmed" ? "Confirmed" : s === "tentative" ? "Tentative" : "Cancelled"}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowStartPicker((v) => !v)}
              className="pill pill--time inline-flex items-center gap-1 text-[11px]"
              title="Set start"
              aria-expanded={showStartPicker}
            >
              <CalendarDays className="w-3 h-3 opacity-70" /> {startStr ? `Start: ${startStr}` : "Start"}
            </button>
            <button
              type="button"
              onClick={() => setShowEndPicker((v) => !v)}
              className="pill pill--time inline-flex items-center gap-1 text-[11px]"
              title="Set end"
              aria-expanded={showEndPicker}
            >
              <CalendarDays className="w-3 h-3 opacity-70" /> {endStr ? `End: ${endStr}` : "End"}
            </button>

            <button
              type="button"
              onClick={() => setShowLocation((v) => !v)}
              className="pill pill--time inline-flex items-center gap-1 text-[11px]"
              title="Set location"
              aria-expanded={showLocation}
            >
              <MapPin className="w-3 h-3 opacity-70" /> {location ? (location.length > 24 ? `${location.slice(0, 24)}…` : location) : "Location"}
            </button>

            {/* Color chip */}
            <button
              type="button"
              onClick={() => setShowColorPicker((v) => !v)}
              className="pill pill--time inline-flex items-center gap-1 text-[11px]"
              title="Set color"
              aria-expanded={showColorPicker}
            >
              <Palette className="w-3 h-3 opacity-70" /> {color ? color : "Color"}
            </button>

            {/* Tags chip */}
            <button
              type="button"
              onClick={() => setShowTagsEditor((v) => !v)}
              className="pill pill--time inline-flex items-center gap-1 text-[11px]"
              title="Edit tags"
              aria-expanded={showTagsEditor}
            >
              <Tag className="w-3 h-3 opacity-70" /> {tags.length > 0 ? `${tags.length} tag${tags.length > 1 ? "s" : ""}` : "Tags"}
            </button>
          </div>

          {(showStartPicker || showEndPicker) && (
            <div className="flex flex-wrap gap-3">
              {showStartPicker && (
                <input
                  type="datetime-local"
                  value={startStr}
                  onChange={(e) => setStartStr(e.target.value)}
                  disabled={allDay}
                  className="text-sm bg-transparent border border-transparent rounded-md px-0 py-1 text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
                />
              )}
              {showEndPicker && (
                <input
                  type="datetime-local"
                  value={endStr}
                  onChange={(e) => setEndStr(e.target.value)}
                  disabled={allDay}
                  className="text-sm bg-transparent border border-transparent rounded-md px-0 py-1 text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
                />
              )}
            </div>
          )}

          {showLocation && (
            <div className="flex flex-wrap gap-3">
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Where is this event?"
                className="text-sm bg-transparent border border-transparent rounded-md px-0 py-1 text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
              />
            </div>
          )}

          {showColorPicker && (
            <div className="flex flex-wrap items-center gap-1 mt-1.5">
              {(["blue","green","amber","red","purple","gray"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-5 w-5 rounded-full border border-[var(--border-color)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] ${
                    c === "blue" ? "bg-blue-500" : c === "green" ? "bg-emerald-500" : c === "amber" ? "bg-amber-500" : c === "red" ? "bg-red-500" : c === "purple" ? "bg-purple-500" : "bg-gray-400"
                  } ${color === c ? "ring-2 ring-offset-1 ring-[var(--accent-primary)]" : ""}`}
                  title={c}
                />
              ))}
              <button
                type="button"
                onClick={() => setColor("")}
                className="text-[11px] px-2 py-0.5 rounded border border-[var(--border-color)] text-[var(--text-secondary)] bg-[var(--bg-secondary)]"
                title="Clear color"
              >
                Clear
              </button>
            </div>
          )}

          {showTagsEditor && (
            <div className="flex flex-wrap items-center gap-1 mt-1.5">
              {tags.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)]">
                  {t}
                  <button
                    type="button"
                    onClick={() => setTags((prev) => prev.filter((x) => x !== t))}
                    className="text-[10px] opacity-70 hover:opacity-100"
                    title="Remove tag"
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                type="text"
                placeholder="Add tag…"
                className="text-[11px] bg-transparent border border-transparent rounded-md px-1.5 py-0.5 text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
                onKeyDown={(e) => {
                  const el = e.currentTarget;
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

          {/* Location moved to chip with inline input */}

          <div className="text-[10px] text-[var(--text-muted)]">Created {event.createdAt ? timeAgo(event.createdAt) : "—"} · Updated {event.updatedAt ? timeAgo(event.updatedAt) : "—"}</div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border-color)] flex items-center justify-end gap-2">
          <button
            onClick={handleClose}
            className="text-[11px] px-2.5 py-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]"
          >
            Close
          </button>
          <button
            onClick={() => void handleSave()}
            disabled={isSaving}
            className={`text-[11px] px-3 py-1.5 rounded-md transition-colors ${isSaving ? 'bg-[var(--bg-secondary)] text-[var(--text-muted)] border border-[var(--border-color)] cursor-not-allowed' : 'bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary-hover)]'}`}
          >
            <span className="inline-flex items-center gap-1"><Save className="w-3.5 h-3.5" /> Save</span>
          </button>
        </div>
      </div>
    </div>
  );
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
  const dt = new Date(y, m - 1, d, hh, mm, 0, 0);
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
