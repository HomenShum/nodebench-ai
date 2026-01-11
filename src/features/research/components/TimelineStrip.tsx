"use client";

import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Clock, History, Zap, Telescope, ChevronLeft, ChevronRight } from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type TemporalPhase = "past" | "present" | "future";

export interface TimelineEvent {
  /** Unique event ID */
  id: string;
  /** Event label */
  label: string;
  /** ISO timestamp or relative date string */
  date: string;
  /** Temporal phase */
  phase: TemporalPhase;
  /** Optional description */
  description?: string;
  /** Whether this is the current focus */
  isCurrent?: boolean;
  /** Optional link to section or document */
  linkTo?: string;
}

export interface TimelineStripProps {
  /** Timeline events to display */
  events: TimelineEvent[];
  /** Currently active event ID */
  activeEventId?: string;
  /** Callback when an event is clicked */
  onEventClick?: (event: TimelineEvent) => void;
  /** Optional external phase filter */
  phaseFilter?: TemporalPhase | "all";
  /** Callback when phase filter changes */
  onPhaseChange?: (phase: TemporalPhase | "all") => void;
  /** Whether the strip is sticky */
  sticky?: boolean;
  /** Custom class name */
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

const getPhaseIcon = (phase: TemporalPhase) => {
  switch (phase) {
    case "past":
      return History;
    case "present":
      return Zap;
    case "future":
      return Telescope;
  }
};

const getPhaseColors = (phase: TemporalPhase, isActive: boolean) => {
  const baseColors = {
    past: {
      bg: isActive ? "bg-slate-700" : "bg-slate-100 hover:bg-slate-200",
      text: isActive ? "text-white" : "text-slate-600",
      border: isActive ? "border-slate-700" : "border-slate-200",
      dot: "bg-slate-400",
    },
    present: {
      bg: isActive ? "bg-blue-600" : "bg-blue-50 hover:bg-blue-100",
      text: isActive ? "text-white" : "text-blue-700",
      border: isActive ? "border-blue-600" : "border-blue-200",
      dot: "bg-blue-500",
    },
    future: {
      bg: isActive ? "bg-purple-600" : "bg-purple-50 hover:bg-purple-100",
      text: isActive ? "text-white" : "text-purple-700",
      border: isActive ? "border-purple-600" : "border-purple-200",
      dot: "bg-purple-400",
    },
  };
  return baseColors[phase];
};

const formatDate = (dateStr: string): string => {
  // Handle relative dates
  if (dateStr.toLowerCase().includes("today")) return "Today";
  if (dateStr.toLowerCase().includes("yesterday")) return "Yesterday";
  if (dateStr.toLowerCase().includes("tomorrow")) return "Tomorrow";

  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * TimelineStrip - AI-2027.com-inspired temporal context visualization
 *
 * Shows Past→Present→Future timeline with:
 * - Phase-colored event markers
 * - Active event highlighting
 * - Smooth scroll navigation
 * - Sticky positioning option
 * - Progress bar showing current position
 */
export const TimelineStrip: React.FC<TimelineStripProps> = ({
  events,
  activeEventId,
  onEventClick,
  phaseFilter,
  onPhaseChange,
  sticky = false,
  className = "",
}) => {
  const [internalPhaseFilter, setInternalPhaseFilter] = useState<TemporalPhase | "all">("all");
  const activePhaseFilter = phaseFilter ?? internalPhaseFilter;
  const setPhaseFilter = (next: TemporalPhase | "all") => {
    if (onPhaseChange) {
      onPhaseChange(next);
      return;
    }
    setInternalPhaseFilter(next);
  };

  const visibleEvents = useMemo(() => {
    if (activePhaseFilter === "all") return events;
    return events.filter((event) => event.phase === activePhaseFilter);
  }, [events, activePhaseFilter]);

  // Group events by phase
  const groupedEvents = useMemo(() => {
    const groups: Record<TemporalPhase, TimelineEvent[]> = {
      past: [],
      present: [],
      future: [],
    };
    visibleEvents.forEach((event) => {
      groups[event.phase].push(event);
    });
    return groups;
  }, [visibleEvents]);

  // Calculate progress based on active event position
  const progressInfo = useMemo(() => {
    if (visibleEvents.length === 0) return { percentage: 0, phasePercentages: { past: 0, present: 0, future: 0 } };

    const activeIndex = activeEventId
      ? visibleEvents.findIndex(e => e.id === activeEventId)
      : visibleEvents.findIndex(e => e.phase === "present") || 0;

    const percentage = visibleEvents.length > 1
      ? ((activeIndex + 1) / visibleEvents.length) * 100
      : 50;

    // Calculate phase segment widths
    const total = visibleEvents.length;
    const phasePercentages = {
      past: (groupedEvents.past.length / total) * 100,
      present: (groupedEvents.present.length / total) * 100,
      future: (groupedEvents.future.length / total) * 100,
    };

    return { percentage, phasePercentages };
  }, [visibleEvents, activeEventId, groupedEvents]);

  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = 200;
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  if (visibleEvents.length === 0) {
    return null;
  }

  return (
    <div
      className={`
        ${sticky ? "sticky top-0 z-40" : ""}
        bg-[color:var(--bg-primary)]/95 backdrop-blur-sm border-b border-[color:var(--border-color)] shadow-sm
        ${className}
      `}
    >
      <div className="max-w-7xl mx-auto px-4 py-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-[color:var(--text-secondary)]" />
            <span className="text-xs font-semibold text-[color:var(--text-secondary)] uppercase tracking-wider">
              Temporal Context
            </span>
            <span className="text-[10px] text-[color:var(--text-secondary)] uppercase tracking-wider hidden sm:inline">
              {activePhaseFilter === "all" ? "Showing all phases" : `Filtered: ${activePhaseFilter}`}
            </span>
          </div>
          {/* Phase legend */}
          <div className="flex items-center gap-2 text-[10px]">
            {(["past", "present", "future"] as TemporalPhase[]).map((phase) => {
              const Icon = getPhaseIcon(phase);
              const colors = getPhaseColors(phase, false);
              const isActiveFilter = activePhaseFilter === phase;
              return (
                <button
                  key={phase}
                  type="button"
                  onClick={() => setPhaseFilter((prev) => (prev === phase ? "all" : phase))}
                  aria-pressed={isActiveFilter}
                  title={`Filter to ${phase} events`}
                  className={`flex items-center gap-1 px-2 py-1 rounded-full border transition-colors ${
                    isActiveFilter ? "border-[color:var(--border-color)] bg-[color:var(--bg-secondary)]" : "border-transparent hover:border-[color:var(--border-color)]"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
                  <Icon className={`w-3 h-3 ${colors.text}`} />
                  <span className={`capitalize ${colors.text}`}>{phase}</span>
                </button>
              );
            })}
            {activePhaseFilter !== "all" && (
              <button
                type="button"
                onClick={() => setPhaseFilter("all")}
                className="text-[10px] text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] uppercase tracking-wider"
                title="Show all phases"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative h-1.5 bg-[color:var(--bg-secondary)] rounded-full mb-3 overflow-hidden">
          {/* Phase segments */}
          <div className="absolute inset-0 flex">
            <div
              className="h-full bg-slate-200"
              style={{ width: `${progressInfo.phasePercentages.past}%` }}
            />
            <div
              className="h-full bg-blue-200"
              style={{ width: `${progressInfo.phasePercentages.present}%` }}
            />
            <div
              className="h-full bg-purple-200"
              style={{ width: `${progressInfo.phasePercentages.future}%` }}
            />
          </div>
          {/* Progress indicator */}
          <motion.div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-slate-500 via-blue-500 to-blue-600 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressInfo.percentage}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
          {/* Current position marker */}
          <motion.div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-blue-600 rounded-full shadow-sm"
            initial={{ left: 0 }}
            animate={{ left: `calc(${progressInfo.percentage}% - 6px)` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>

        {/* Timeline */}
        <div className="relative flex items-center">
          {/* Left scroll button */}
          <button
            type="button"
            onClick={() => scroll("left")}
            className="flex-shrink-0 p-1 rounded-full hover:bg-[color:var(--bg-hover)] text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] transition-colors"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Scrollable timeline */}
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-x-auto scrollbar-hide [scrollbar-width:none] [-ms-overflow-style:none]"
          >
            <div className="flex items-center gap-1 min-w-max px-2">
              {/* Past section */}
              {groupedEvents.past.length > 0 && (
                <div className="flex items-center gap-1">
                  {groupedEvents.past.map((event) => (
                    <TimelineEventChip
                      key={event.id}
                      event={event}
                      isActive={event.id === activeEventId}
                      onClick={onEventClick}
                    />
                  ))}
                  <div className="w-px h-6 bg-[color:var(--bg-tertiary)] mx-2" />
                </div>
              )}

              {/* Present section */}
              {groupedEvents.present.length > 0 && (
                <div className="flex items-center gap-1">
                  {groupedEvents.present.map((event) => (
                    <TimelineEventChip
                      key={event.id}
                      event={event}
                      isActive={event.id === activeEventId}
                      onClick={onEventClick}
                    />
                  ))}
                  <div className="w-px h-6 bg-[color:var(--bg-tertiary)] mx-2" />
                </div>
              )}

              {/* Future section */}
              {groupedEvents.future.length > 0 && (
                <div className="flex items-center gap-1">
                  {groupedEvents.future.map((event) => (
                    <TimelineEventChip
                      key={event.id}
                      event={event}
                      isActive={event.id === activeEventId}
                      onClick={onEventClick}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right scroll button */}
          <button
            type="button"
            onClick={() => scroll("right")}
            className="flex-shrink-0 p-1 rounded-full hover:bg-[color:var(--bg-hover)] text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] transition-colors"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

interface TimelineEventChipProps {
  event: TimelineEvent;
  isActive: boolean;
  onClick?: (event: TimelineEvent) => void;
}

const TimelineEventChip: React.FC<TimelineEventChipProps> = ({
  event,
  isActive,
  onClick,
}) => {
  const colors = getPhaseColors(event.phase, isActive);
  const Icon = getPhaseIcon(event.phase);

  return (
    <motion.button
      onClick={() => onClick?.(event)}
      className={`
        flex items-center gap-1.5 px-2.5 py-1.5 rounded-full
        border transition-all duration-200
        ${colors.bg} ${colors.text} ${colors.border}
        focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500
      `}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      title={event.description}
    >
      <Icon className="w-3 h-3" />
      <span className="text-xs font-medium whitespace-nowrap max-w-[120px] truncate">
        {event.label}
      </span>
      <span className="text-[10px] opacity-70 whitespace-nowrap">
        {formatDate(event.date)}
      </span>
      {event.isCurrent && (
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
      )}
    </motion.button>
  );
};

export default TimelineStrip;
