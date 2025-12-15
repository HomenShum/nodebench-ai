/**
 * Research Feature Types
 *
 * Exports all type definitions for the research feature including:
 * - Daily Brief canonical schema (3-Act structure)
 * - Dashboard state types
 * - Validation utilities
 */

// Re-export existing types from types.ts
export type {
  TooltipPayload,
  ChartPoint,
  ChartSeries,
  TrendLineConfig,
  Annotation,
  DeltaValue,
  KeyStat,
  CapabilityEntry,
  MarketShareSegment,
  SkillToggle,
  StatusBanner,
  MilestoneLabel,
  DashboardState,
  AgentDashboardUpdate,
  StorySection
} from "../types";

// Export Daily Brief canonical schema
export type {
  EvidenceSource,
  Evidence,
  Signal,
  ActionStatus,
  Action,
  VizIntent,
  VizArtifact,
  DailyBriefMeta,
  ActII,
  ActIII,
  DailyBriefDashboard,
  DailyBriefPayload
} from "./dailyBriefSchema";

export { DailyBriefJSONSchema } from "./dailyBriefSchema";
