/**
 * Narrative Feature - Main Export
 *
 * Deep Research Agentic Narrative Engine (DRANE) frontend components.
 *
 * @module features/narrative
 */

// Components
export {
  NarrativeRoadmap,
  ThreadLane,
  EventMarker,
  SentimentBar,
  CorrelationLine,
  CorrelationLegend,
  CorrelationTooltip,
} from "./components/NarrativeRoadmap";
export { NarrativeCard } from "./components/NarrativeCard";

// NarrativeFeed - Social Substrate UI
export {
  NarrativeFeed,
  PostCard,
  ReplyThread,
  EvidenceDrawer,
  type PostData,
  type PostType,
  type PostStatus,
  type ReplyData,
  type EvidenceArtifact,
} from "./components/NarrativeFeed";

// Hooks
export {
  useNarrativeThreads,
  useNarrativeThread,
  useNarrativeEvents,
  useTimelineEvents,
  generateWeekColumns,
  useCorrelations,
  useTemporalFacts,
} from "./hooks";

// Types
export type {
  NarrativeThread,
  NarrativeEvent,
  NarrativeRoadmapProps,
  WeekColumn,
  ThreadPhase,
  EventSignificance,
  SentimentLevel,
  SentimentDataPoint,
  ThreadQuality,
} from "./types";

export {
  PHASE_COLORS,
  SIGNIFICANCE_COLORS,
  SENTIMENT_COLORS,
} from "./types";
