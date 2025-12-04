/**
 * CalendarDatePopover - Enhanced "mini-dossier" popover for calendar dates
 * 
 * Features:
 * - Header with date + day of week
 * - "Why it Matters" section with prioritized high-impact events
 * - "Linked Assets" section with documents tagged to this date
 * - Quick Actions footer (Draft Brief, Set Deadline, Add Event/Note)
 * - Glassmorphism styling
 */

import React from "react";
import { 
  Calendar, 
  FileText, 
  Plus, 
  Sparkles, 
  Clock, 
  AlertCircle,
  StickyNote,
  ExternalLink,
  Loader2
} from "lucide-react";
import type { Id } from "../../../../convex/_generated/dataModel";

// Event type icons mapping
const EVENT_TYPE_ICONS: Record<string, string> = {
  earnings: "🔴",
  deadline: "🔴",
  sec: "⚖️",
  holiday: "🎉",
  meeting: "📅",
  task: "✅",
  note: "📝",
  default: "📌",
};

// Priority colors for different event types
const PRIORITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  high: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  medium: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  low: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  default: { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200" },
};

// File type icons
const FILE_TYPE_ICONS: Record<string, React.ReactNode> = {
  pdf: <FileText className="w-3 h-3 text-red-500" />,
  csv: <FileText className="w-3 h-3 text-green-500" />,
  doc: <FileText className="w-3 h-3 text-blue-500" />,
  xlsx: <FileText className="w-3 h-3 text-green-600" />,
  default: <FileText className="w-3 h-3 text-gray-500" />,
};

export interface CalendarEvent {
  _id: string;
  title: string;
  startTime?: number;
  endTime?: number;
  type?: string;
  priority?: "high" | "medium" | "low";
  status?: string;
  allDay?: boolean;
}

export interface CalendarTask {
  _id: string;
  title?: string;
  name?: string;
  dueDate?: number;
  priority?: number;
  completed?: boolean;
}

export interface CalendarNote {
  _id: string;
  title?: string;
  agendaDate?: number;
  fileType?: string;
}

export interface CalendarHoliday {
  _id: string;
  name: string;
  dateMs: number;
}

export interface LinkedDocument {
  _id: string;
  title?: string;
  fileType?: string;
  type?: "event" | "task" | "document" | "note";
}

export interface FileMarker {
  _id: string;
  documentId: string;
  fileName: string;
  documentTitle?: string;
  fileType?: string;
  confidence: string;
  pattern: string;
}

export interface CalendarDatePopoverProps {
  date: Date;
  events?: CalendarEvent[];
  tasks?: CalendarTask[];
  notes?: CalendarNote[];
  holidays?: CalendarHoliday[];
  linkedDocuments?: LinkedDocument[];
  fileMarkers?: FileMarker[];
  isLoading?: boolean;
  onClose?: () => void;
  onDraftBrief?: (dateMs: number) => void;
  onSetDeadline?: (dateMs: number) => void;
  onAddEvent?: (dateMs: number) => void;
  onAddNote?: (dateMs: number) => void;
  onOpenDocument?: (docId: Id<"documents">) => void;
  onOpenEvent?: (eventId: string) => void;
  onOpenTask?: (taskId: string) => void;
  className?: string;
}

function formatTime(ms: number): string {
  const d = new Date(ms);
  let hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  if (minutes === 0) return `${hours} ${ampm}`;
  return `${hours}:${String(minutes).padStart(2, "0")} ${ampm}`;
}

function getEventIcon(type?: string): string {
  if (!type) return EVENT_TYPE_ICONS.default;
  const lower = type.toLowerCase();
  if (lower.includes("earnings")) return EVENT_TYPE_ICONS.earnings;
  if (lower.includes("deadline") || lower.includes("due")) return EVENT_TYPE_ICONS.deadline;
  if (lower.includes("sec") || lower.includes("filing")) return EVENT_TYPE_ICONS.sec;
  if (lower.includes("holiday")) return EVENT_TYPE_ICONS.holiday;
  if (lower.includes("meeting")) return EVENT_TYPE_ICONS.meeting;
  return EVENT_TYPE_ICONS.default;
}

function getFileIcon(fileType?: string): React.ReactNode {
  if (!fileType) return FILE_TYPE_ICONS.default;
  const lower = fileType.toLowerCase();
  if (lower.includes("pdf")) return FILE_TYPE_ICONS.pdf;
  if (lower.includes("csv")) return FILE_TYPE_ICONS.csv;
  if (lower.includes("doc")) return FILE_TYPE_ICONS.doc;
  if (lower.includes("xls")) return FILE_TYPE_ICONS.xlsx;
  return FILE_TYPE_ICONS.default;
}

export function CalendarDatePopover({
  date,
  events = [],
  tasks = [],
  notes = [],
  holidays = [],
  linkedDocuments = [],
  fileMarkers = [],
  isLoading = false,
  onClose,
  onDraftBrief,
  onSetDeadline,
  onAddEvent,
  onAddNote,
  onOpenDocument,
  onOpenEvent,
  onOpenTask,
  className = "",
}: CalendarDatePopoverProps) {
  const dateMs = date.getTime();
  const dayOfWeek = date.toLocaleDateString(undefined, { weekday: "long" });
  const formattedDate = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });

  // Check if date has any content
  const hasContent = events.length > 0 || tasks.length > 0 || notes.length > 0 || holidays.length > 0 || fileMarkers.length > 0;
  const hasLinkedAssets = linkedDocuments.length > 0 || notes.length > 0 || fileMarkers.length > 0;
  
  // Sort events by priority and time
  const sortedEvents = [...events].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const aPriority = priorityOrder[a.priority || "low"] ?? 2;
    const bPriority = priorityOrder[b.priority || "low"] ?? 2;
    if (aPriority !== bPriority) return aPriority - bPriority;
    return (a.startTime || 0) - (b.startTime || 0);
  });

  return (
    <div
      className={`w-80 rounded-xl border border-gray-200/80 bg-white/95 backdrop-blur-md shadow-2xl overflow-hidden ${className}`}
      role="dialog"
      aria-label={`Calendar popover for ${formattedDate}`}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="font-semibold text-gray-900">{formattedDate}</span>
            <span className="text-gray-500">–</span>
            <span className="text-gray-600">{dayOfWeek}</span>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="px-4 py-8 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          <span className="ml-2 text-sm text-gray-500">Loading...</span>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !hasContent && (
        <div className="px-4 py-6 text-center">
          <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-sm text-gray-500 mb-4">No events or notes for this day</p>
          <div className="flex items-center justify-center gap-2">
            {onAddEvent && (
              <button
                type="button"
                onClick={() => onAddEvent(dateMs)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add Event
              </button>
            )}
            {onAddNote && (
              <button
                type="button"
                onClick={() => onAddNote(dateMs)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              >
                <StickyNote className="w-3 h-3" />
                Add Note
              </button>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      {!isLoading && hasContent && (
        <div className="max-h-80 overflow-y-auto">
          {/* Why it Matters Section */}
          {(sortedEvents.length > 0 || holidays.length > 0) && (
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-1.5 mb-2">
                <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Why it Matters
                </span>
              </div>
              <div className="space-y-1.5">
                {/* Holidays first */}
                {holidays.slice(0, 2).map((h) => (
                  <div
                    key={h._id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-purple-50 border border-purple-100"
                  >
                    <span className="text-sm">{EVENT_TYPE_ICONS.holiday}</span>
                    <span className="text-xs font-medium text-purple-700 truncate flex-1">
                      {h.name}
                    </span>
                  </div>
                ))}
                {/* High-impact events */}
                {sortedEvents.slice(0, 3).map((ev) => {
                  const colors = PRIORITY_COLORS[ev.priority || "default"] || PRIORITY_COLORS.default;
                  return (
                    <div
                      key={ev._id}
                      onClick={() => onOpenEvent?.(ev._id)}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer hover:ring-1 hover:ring-gray-300 transition-all ${colors.bg} border ${colors.border}`}
                    >
                      <span className="text-sm">{getEventIcon(ev.type)}</span>
                      <div className="flex-1 min-w-0">
                        <span className={`text-xs font-medium ${colors.text} truncate block`}>
                          {ev.title}
                        </span>
                      </div>
                      {ev.startTime && !ev.allDay && (
                        <span className="text-[10px] text-gray-500 shrink-0">
                          {formatTime(ev.startTime)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tasks Section */}
          {tasks.length > 0 && (
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-1.5 mb-2">
                <Clock className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Tasks Due
                </span>
                <span className="text-[10px] text-gray-400 ml-auto">{tasks.length}</span>
              </div>
              <div className="space-y-1">
                {tasks.slice(0, 3).map((t) => (
                  <div
                    key={t._id}
                    onClick={() => onOpenTask?.(t._id)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100 cursor-pointer hover:ring-1 hover:ring-emerald-300 transition-all"
                  >
                    <span className="text-sm">✅</span>
                    <span className={`text-xs font-medium text-emerald-700 truncate flex-1 ${t.completed ? "line-through opacity-60" : ""}`}>
                      {t.title || t.name || "Untitled Task"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Linked Assets Section */}
          {hasLinkedAssets && (
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-1.5 mb-2">
                <FileText className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Linked Assets
                </span>
              </div>
              <div className="space-y-1">
                {/* File markers from smart date extraction (green) */}
                {fileMarkers.slice(0, 3).map((fm) => (
                  <div
                    key={fm._id}
                    onClick={() => onOpenDocument?.(fm.documentId as Id<"documents">)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100 cursor-pointer hover:ring-1 hover:ring-emerald-300 transition-all group"
                  >
                    {getFileIcon(fm.fileType)}
                    <span className="text-xs font-medium text-emerald-700 truncate flex-1">
                      {fm.documentTitle || fm.fileName}
                    </span>
                    <span className="text-[9px] text-emerald-500 bg-emerald-100 px-1 rounded">
                      {fm.confidence === 'high' ? '📅' : '📆'}
                    </span>
                    <ExternalLink className="w-3 h-3 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))}
                {notes.slice(0, 3).map((n) => (
                  <div
                    key={n._id}
                    onClick={() => onOpenDocument?.(n._id as Id<"documents">)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-amber-50 border border-amber-100 cursor-pointer hover:ring-1 hover:ring-amber-300 transition-all group"
                  >
                    {getFileIcon(n.fileType)}
                    <span className="text-xs font-medium text-amber-700 truncate flex-1">
                      {n.title || "Untitled Note"}
                    </span>
                    <ExternalLink className="w-3 h-3 text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))}
                {linkedDocuments.slice(0, 3).map((d) => (
                  <div
                    key={d._id}
                    onClick={() => onOpenDocument?.(d._id as Id<"documents">)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-gray-50 border border-gray-100 cursor-pointer hover:ring-1 hover:ring-gray-300 transition-all group"
                  >
                    {getFileIcon(d.fileType)}
                    <span className="text-xs font-medium text-gray-700 truncate flex-1">
                      {d.title || "Untitled"}
                    </span>
                    <ExternalLink className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Actions Footer */}
      {!isLoading && (
        <div className="px-4 py-3 bg-gray-50/80 border-t border-gray-100">
          <div className="flex items-center gap-2">
            {onDraftBrief && (
              <button
                type="button"
                onClick={() => onDraftBrief(dateMs)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600 transition-all shadow-sm"
              >
                <Sparkles className="w-3 h-3" />
                Draft Brief
              </button>
            )}
            {onSetDeadline && (
              <button
                type="button"
                onClick={() => onSetDeadline(dateMs)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Clock className="w-3 h-3" />
                Set Deadline
              </button>
            )}
            {hasContent && onAddEvent && (
              <button
                type="button"
                onClick={() => onAddEvent(dateMs)}
                className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors ml-auto"
                title="Add Event"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default CalendarDatePopover;

