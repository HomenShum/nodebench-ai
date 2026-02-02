/**
 * Narrative Hooks - Barrel Export
 *
 * @module features/narrative/hooks
 */

export {
  useNarrativeThreads,
  useNarrativeThread,
  type UseNarrativeThreadsOptions,
  type UseNarrativeThreadsResult,
} from "./useNarrativeThreads";

export {
  useNarrativeEvents,
  useTimelineEvents,
  generateWeekColumns,
  type UseNarrativeEventsOptions,
  type UseNarrativeEventsResult,
} from "./useNarrativeEvents";

export {
  useCorrelations,
  useTemporalFacts,
  type Correlation,
  type CorrelationType,
  type UseCorrelationsOptions,
  type UseCorrelationsResult,
  type TemporalFact,
  type UseTemporalFactsOptions,
  type UseTemporalFactsResult,
} from "./useCorrelations";
