"use client";

/**
 * ThreadLane - Individual Thread Row in NarrativeRoadmap
 *
 * Displays a single narrative thread as a horizontal lane with:
 * - Thread info (name, phase, quality indicators)
 * - Event markers for each week
 * - Expandable detail view
 *
 * @module features/narrative/components/NarrativeRoadmap/ThreadLane
 */

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  CheckCircle,
  AlertCircle,
  Clock,
  ExternalLink,
  TrendingUp,
} from "lucide-react";
import type { NarrativeThread, NarrativeEvent, WeekColumn, ThreadPhase } from "../../types";
import { PHASE_COLORS } from "../../types";
import EventMarker from "./EventMarker";

interface ThreadLaneProps {
  thread: NarrativeThread;
  weekColumns: WeekColumn[];
  eventsByWeek: Map<string, NarrativeEvent[]>;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onThreadClick?: (thread: NarrativeThread) => void;
  onEventClick?: (event: NarrativeEvent) => void;
  index: number;
}

/**
 * Get phase indicator style
 */
function getPhaseIndicator(phase: ThreadPhase): { label: string; icon: React.ReactNode } {
  switch (phase) {
    case "emerging":
      return { label: "Emerging", icon: <TrendingUp className="w-3 h-3" /> };
    case "escalating":
      return { label: "Escalating", icon: <TrendingUp className="w-3 h-3" /> };
    case "climax":
      return { label: "Climax", icon: <AlertCircle className="w-3 h-3" /> };
    case "resolution":
      return { label: "Resolution", icon: <CheckCircle className="w-3 h-3" /> };
    case "dormant":
      return { label: "Dormant", icon: <Clock className="w-3 h-3" /> };
  }
}

/**
 * ThreadLane Component
 */
export function ThreadLane({
  thread,
  weekColumns,
  eventsByWeek,
  isExpanded,
  onToggleExpand,
  onThreadClick,
  onEventClick,
  index,
}: ThreadLaneProps) {
  const phaseColors = PHASE_COLORS[thread.currentPhase];
  const phaseInfo = getPhaseIndicator(thread.currentPhase);

  // Calculate total events across all weeks
  let totalEvents = 0;
  eventsByWeek.forEach((events) => {
    totalEvents += events.length;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`border-b border-gray-100 ${index % 2 === 0 ? "bg-white" : "bg-gray-50/30"}`}
    >
      {/* Main Lane Row */}
      <div className="flex">
        {/* Thread Info Column */}
        <div
          className={`w-48 flex-shrink-0 px-4 py-3 border-r border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors ${phaseColors.bg}`}
          onClick={() => onThreadClick?.(thread)}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              {/* Thread Name */}
              <h3 className="text-sm font-semibold text-gray-900 truncate">
                {thread.name}
              </h3>

              {/* Phase Badge */}
              <div className={`inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${phaseColors.text} ${phaseColors.border} border`}>
                {phaseInfo.icon}
                {phaseInfo.label}
              </div>

              {/* Quality Indicators */}
              <div className="flex items-center gap-1 mt-1.5">
                {thread.quality.hasMultipleSources && (
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-indigo-400"
                    title="Multiple sources"
                  />
                )}
                {thread.quality.hasVerifiedClaims && (
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-blue-400"
                    title="Verified claims"
                  />
                )}
                {thread.quality.hasCounterNarrative && (
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-amber-400"
                    title="Counter-narrative"
                  />
                )}
                {thread.plotTwistCount > 0 && (
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-red-400"
                    title={`${thread.plotTwistCount} plot twist(s)`}
                  />
                )}
              </div>

              {/* Event Count */}
              <div className="text-[10px] text-gray-400 mt-1">
                {thread.eventCount} events · {thread.plotTwistCount} twists
              </div>
            </div>

            {/* Expand Toggle */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand();
              }}
              className="p-1 rounded hover:bg-white/50 transition-colors"
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>
          </div>
        </div>

        {/* Week Cells with Event Markers */}
        {weekColumns.map((week) => {
          const weekEvents = eventsByWeek.get(week.weekNumber) || [];

          return (
            <div
              key={week.weekNumber}
              className={`w-24 flex-shrink-0 px-1 py-2 border-r border-gray-100 ${
                week.isCurrent ? "bg-blue-50/30" : ""
              }`}
            >
              <div className="flex flex-wrap items-center justify-center gap-1 min-h-[2rem]">
                {weekEvents.length > 0 ? (
                  weekEvents.slice(0, 3).map((event) => (
                    <EventMarker
                      key={event._id}
                      event={event}
                      onClick={() => onEventClick?.(event)}
                    />
                  ))
                ) : (
                  <div className="w-full h-0.5 bg-gray-100 rounded" />
                )}
                {weekEvents.length > 3 && (
                  <span className="text-[10px] text-gray-400">+{weekEvents.length - 3}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Expanded Detail View */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 py-4 bg-gray-50/50 border-t border-gray-100">
              {/* Thesis */}
              <div className="mb-3">
                <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                  Current Thesis
                </h4>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {thread.thesis}
                </p>
              </div>

              {/* Counter-thesis if present */}
              {thread.counterThesis && (
                <div className="mb-3 pl-3 border-l-2 border-amber-300">
                  <h4 className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1">
                    Counter-Narrative
                  </h4>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {thread.counterThesis}
                  </p>
                </div>
              )}

              {/* Entity Tags */}
              <div className="flex flex-wrap gap-2 mb-3">
                {thread.entityKeys.map((key) => (
                  <span
                    key={key}
                    className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-md"
                  >
                    {key.split(":")[1] || key}
                  </span>
                ))}
                {thread.topicTags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-md"
                  >
                    #{tag}
                  </span>
                ))}
              </div>

              {/* Timeline Stats */}
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>
                  First event:{" "}
                  {new Date(thread.firstEventAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
                <span>
                  Latest:{" "}
                  {new Date(thread.latestEventAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
                <button
                  type="button"
                  onClick={() => onThreadClick?.(thread)}
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
                >
                  View Full Thread <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default ThreadLane;
