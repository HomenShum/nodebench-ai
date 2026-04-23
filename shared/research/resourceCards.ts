/**
 * Resource URIs + Card contract (v1)
 *
 * Shared between:
 *   - Frontend (report detail Cards workspace)
 *   - Nodebench API (/v1/resources/expand, SSE stream)
 *   - MCP server (nodebench.expand_resource)
 *
 * One URI scheme, one card schema. Everything else is view-layer.
 */

import type { LensId, DepthId } from "./lensIds";
import type { AngleId } from "./angleIds";

// ---------------------------------------------------------------------------
// Resource URIs
// ---------------------------------------------------------------------------

export const RESOURCE_KINDS = [
  "thread",
  "run",
  "brief",
  "event",
  "org",
  "person",
  "product",
  "topic",
  "artifact",
  "angle",
  "card",
] as const;

export type ResourceKind = (typeof RESOURCE_KINDS)[number];

/**
 * Canonical URI shape: `nodebench://{kind}/{id...}`
 * Angles use two-path-segment form: `nodebench://angle/{angleId}/{subjectId}`.
 */
export type ResourceUri = `nodebench://${ResourceKind}/${string}`;

export function makeEntityUri(
  kind: "org" | "person" | "product" | "event" | "topic" | "artifact",
  id: string,
): ResourceUri {
  return `nodebench://${kind}/${id}` as ResourceUri;
}

export function makeAngleUri(angleId: AngleId, subjectId: string): ResourceUri {
  return `nodebench://angle/${angleId}/${subjectId}` as ResourceUri;
}

export function parseResourceUri(
  uri: string,
): { kind: ResourceKind; path: string } | null {
  const m = uri.match(/^nodebench:\/\/([^/]+)\/(.+)$/);
  if (!m) return null;
  const kind = m[1] as ResourceKind;
  if (!RESOURCE_KINDS.includes(kind)) return null;
  return { kind, path: m[2] };
}

// ---------------------------------------------------------------------------
// Card contract
// ---------------------------------------------------------------------------

export type CardKind =
  | "org_summary"
  | "person_summary"
  | "product_summary"
  | "event_summary"
  | "topic_summary"
  | "signal_summary"
  | "evidence_ref";

export interface CardChip {
  label: string;
  tone?: "default" | "accent" | "warn" | "positive";
}

export interface HighlightedEntity {
  /** Display text as it appears inside the summary / key facts. */
  text: string;
  /** URI to expand when the user clicks this phrase. */
  uri: ResourceUri;
}

export interface ResourceCard {
  cardId: string;
  /** Canonical URI this card represents. */
  uri: ResourceUri;
  kind: CardKind;
  title: string;
  subtitle?: string;
  summary: string;
  chips?: ReadonlyArray<CardChip>;
  keyFacts?: ReadonlyArray<string>;
  /** Entity mentions inside summary/keyFacts that are themselves expandable. */
  highlightedEntities?: ReadonlyArray<HighlightedEntity>;
  /** Evidence URIs that ground this card's claims. */
  evidenceRefs?: ReadonlyArray<ResourceUri>;
  /** One-hop neighbours surfaced as "next hop" chips. */
  nextHops?: ReadonlyArray<ResourceUri>;
  /** Confidence in [0, 1]. Never hardcoded — must be computed. */
  confidence: number;
}

// ---------------------------------------------------------------------------
// Expand request/response
// ---------------------------------------------------------------------------

export type ExpandMode = "ring_plus_one" | "ring_two" | "single_card";

export interface ExpandRequest {
  uri: string;
  expandMode?: ExpandMode;
  lensId?: LensId;
  depth?: DepthId;
  constraints?: {
    preferCache?: boolean;
    latencyBudgetMs?: number;
  };
}

export interface ExpandResponse {
  rootUri: ResourceUri;
  lensId: LensId;
  depth: DepthId;
  cards: ReadonlyArray<ResourceCard>;
  evidence: ReadonlyArray<{
    claim: string;
    uri: ResourceUri;
    confidence: number;
  }>;
  nextHops: ReadonlyArray<ResourceUri>;
  /** Time the response was built, used by the UI for freshness chips. */
  builtAt: number;
  /** Whether any card was served from cache — drives UI indicators. */
  fromCache: boolean;
}

// ---------------------------------------------------------------------------
// SSE event envelope (shared with Nodebench API)
// ---------------------------------------------------------------------------

export type StreamEventType =
  | "run.started"
  | "checkpoint.roots_resolved"
  | "checkpoint.lens_selected"
  | "cards.append"
  | "cards.patch"
  | "evidence.append"
  | "answer.delta"
  | "checkpoint.angle_started"
  | "checkpoint.angle_completed"
  | "resources.emitted"
  | "run.completed"
  | "run.failed";

export interface StreamEventBase {
  type: StreamEventType;
  threadId: string;
  runId: string;
  /** Per-stream monotonic — used by client to de-duplicate on reconnect. */
  seq: number;
  /** Epoch ms. */
  ts: number;
  checkpointId?: string;
}

export interface RunStartedEvent extends StreamEventBase {
  type: "run.started";
  lensHint?: LensId;
  depth: DepthId;
}

export interface RootsResolvedEvent extends StreamEventBase {
  type: "checkpoint.roots_resolved";
  roots: ReadonlyArray<{ uri: ResourceUri; label: string; confidence: number }>;
}

export interface LensSelectedEvent extends StreamEventBase {
  type: "checkpoint.lens_selected";
  lensId: LensId;
  reason: string;
}

export interface CardsAppendEvent extends StreamEventBase {
  type: "cards.append";
  cards: ReadonlyArray<ResourceCard>;
}

export interface CardsPatchEvent extends StreamEventBase {
  type: "cards.patch";
  cardId: string;
  patch: Partial<ResourceCard>;
}

export interface EvidenceAppendEvent extends StreamEventBase {
  type: "evidence.append";
  items: ReadonlyArray<{
    cardId: string;
    claim: string;
    uri: ResourceUri;
    confidence: number;
  }>;
}

export interface AnswerDeltaEvent extends StreamEventBase {
  type: "answer.delta";
  textDelta: string;
}

export interface AngleStartedEvent extends StreamEventBase {
  type: "checkpoint.angle_started";
  angleId: AngleId;
  subjectUri: ResourceUri;
}

export interface AngleCompletedEvent extends StreamEventBase {
  type: "checkpoint.angle_completed";
  angleId: AngleId;
  subjectUri: ResourceUri;
  durationMs: number;
  status: "ok" | "degraded" | "failed";
}

export interface RunCompletedEvent extends StreamEventBase {
  type: "run.completed";
  cacheHitRatio: number;
  timeToFirstCardMs?: number;
  timeToFirstCitationMs?: number;
  timeToFirstAnswerMs?: number;
}

export interface RunFailedEvent extends StreamEventBase {
  type: "run.failed";
  errorCode: string;
  errorMessage: string;
}

export type StreamEvent =
  | RunStartedEvent
  | RootsResolvedEvent
  | LensSelectedEvent
  | CardsAppendEvent
  | CardsPatchEvent
  | EvidenceAppendEvent
  | AnswerDeltaEvent
  | AngleStartedEvent
  | AngleCompletedEvent
  | RunCompletedEvent
  | RunFailedEvent;
