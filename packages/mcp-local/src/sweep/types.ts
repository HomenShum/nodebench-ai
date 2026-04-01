/**
 * Sweep Engine Types — following Crucix's pattern of self-contained
 * source modules with standardized output shapes.
 *
 * Each source module exports collect() → Promise<SweepSignal[]>
 * The sweep engine runs all sources in parallel and feeds the delta engine.
 */

export interface SweepSignal {
  id: string;
  source: string;           // "hackernews" | "github_trending" | "producthunt" | "yahoo_finance" | "web_search"
  entity: string;           // Company or topic name
  headline: string;         // Short description
  url?: string;             // Link to source
  score?: number;           // Relevance score 0-100
  category: "company" | "product" | "market" | "funding" | "launch" | "trend" | "risk" | "regulatory";
  severity: "flash" | "priority" | "routine";
  metadata?: Record<string, unknown>;
  collectedAt: string;      // ISO timestamp
}

export interface SweepResult {
  signals: SweepSignal[];
  sources: Array<{ name: string; status: "ok" | "error" | "timeout"; count: number; durationMs: number }>;
  totalDurationMs: number;
  sweepId: string;
  timestamp: string;
}

export interface DeltaResult {
  newSignals: SweepSignal[];
  escalations: Array<{ signal: SweepSignal; from: string; to: string }>;
  deescalations: Array<{ signal: SweepSignal; from: string; to: string }>;
  topEntity: string | null;
  topEntityQuery: string | null;
  topEntitySeverity: "flash" | "priority" | "routine" | null;
  sweepId: string;
  previousSweepId: string | null;
}

export type SourceCollector = () => Promise<SweepSignal[]>;
