/**
 * Task Manager Types
 * 
 * TypeScript types for task sessions, traces, and spans.
 * Aligned with the Convex schema definitions.
 */

import type { Id } from '../../../../../convex/_generated/dataModel';

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// SESSION TYPES
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export type TaskSessionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type TaskSessionType = 'manual' | 'cron' | 'scheduled' | 'agent' | 'swarm';
export type TaskVisibility = 'public' | 'private';

export interface TaskSession {
  _id: Id<"agentTaskSessions">;
  title: string;
  description?: string;
  type: TaskSessionType;
  visibility: TaskVisibility;
  userId?: Id<"users">;
  status: TaskSessionStatus;
  startedAt: number;
  completedAt?: number;
  totalDurationMs?: number;
  totalTokens?: number;
  inputTokens?: number;
  outputTokens?: number;
  toolsUsed?: string[];
  agentsInvolved?: string[];
  cronJobName?: string;
  errorMessage?: string;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// TRACE TYPES
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export type TraceStatus = 'running' | 'completed' | 'error';

export interface TaskTrace {
  _id: Id<"agentTaskTraces">;
  sessionId: Id<"agentTaskSessions">;
  traceId: string;
  workflowName: string;
  groupId?: string;
  status: TraceStatus;
  startedAt: number;
  endedAt?: number;
  totalDurationMs?: number;
  model?: string;
  tokenUsage?: {
    input: number;
    output: number;
    total: number;
  };
  metadata?: unknown;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// SPAN TYPES
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export type SpanStatus = 'running' | 'completed' | 'error';
export type SpanType = 
  | 'agent' 
  | 'generation' 
  | 'tool' 
  | 'guardrail' 
  | 'handoff' 
  | 'retrieval' 
  | 'delegation' 
  | 'custom';

export interface TaskSpan {
  _id: Id<"agentTaskSpans">;
  traceId: Id<"agentTaskTraces">;
  parentSpanId?: Id<"agentTaskSpans">;
  seq: number;
  depth: number;
  spanType: SpanType;
  name: string;
  status: SpanStatus;
  startedAt: number;
  endedAt?: number;
  durationMs?: number;
  data?: unknown;
  metadata?: unknown;
  error?: {
    message: string;
    code?: string;
    stack?: string;
  };
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// UI CONFIGURATION TYPES
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export interface StatusConfig {
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  label: string;
}

export interface SpanTypeConfig {
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  label: string;
}

export interface TaskTypeConfig {
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  label: string;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// FILTER & NAVIGATION TYPES
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export interface TaskFilters {
  status?: TaskSessionStatus;
  type?: TaskSessionType;
  dateFrom?: number;
  dateTo?: number;
}

export interface DateRange {
  from: Date | null;
  to: Date | null;
}


