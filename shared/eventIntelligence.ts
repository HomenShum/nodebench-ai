export type EventActorType =
  | "anonymous"
  | "event_guest"
  | "member"
  | "admin"
  | "research_lead"
  | "agent";

export type EventScenario =
  | "at_event_capture"
  | "person_lookup"
  | "company_diligence"
  | "interview_prep"
  | "customer_discovery"
  | "market_research"
  | "investment_grade_diligence"
  | "agent_runtime";

export type EventFreshness =
  | "cached_ok"
  | "recent"
  | "live_required";

export interface EventCorpus {
  eventId: string;
  title: string;
  publicSourceIds: string[];
  companyEntityIds: string[];
  personEntityIds: string[];
  productEntityIds: string[];
  topicEntityIds: string[];
  lastRefreshedAt?: number;
}

export interface EventSession {
  eventSessionId: string;
  eventId?: string;
  workspaceId?: string;
  userId: string;
  title: string;
  active: boolean;
  confidence: number;
  startedAt: number;
  endedAt?: number;
}

export interface EventCapture {
  captureId: string;
  eventSessionId?: string;
  kind: "text" | "voice" | "image" | "screenshot" | "file";
  rawText?: string;
  transcript?: string;
  artifactId?: string;
  extractedEntityIds: string[];
  extractedClaimIds: string[];
  confidence: number;
  status: "captured" | "attached" | "needs_confirmation" | "unassigned";
  createdAt: number;
}

export interface EventWorkspace {
  workspaceId: string;
  eventSessionId: string;
  reportId?: string;
  defaultTabs: Array<"brief" | "cards" | "notebook" | "sources" | "chat" | "map">;
  createdAt: number;
  updatedAt: number;
}

export interface EventSearchPolicy {
  actorType: EventActorType;
  scenario: EventScenario;
  freshness: EventFreshness;
  maxCostCents: number;
  allowPaidSearch: boolean;
  requiresApproval: boolean;
  persist: boolean;
  persistenceScope: "none" | "private" | "team" | "tenant";
  preferredOrder: Array<
    | "event_corpus"
    | "tenant_memory"
    | "source_cache"
    | "free_public_search"
    | "paid_search"
  >;
}

export interface EventServingStatus {
  label: string;
  detail?: string;
  paidCallsUsed: number;
  requiresApproval: boolean;
  persisted: boolean;
}

export interface EventServingCacheState {
  eventCorpusHit?: boolean;
  tenantMemoryHit?: boolean;
  sourceCacheHit?: boolean;
}

export interface EventCaptureAckResult {
  targetLabel: string;
  status: EventCapture["status"];
  personCount?: number;
  companyCount?: number;
  claimCount?: number;
  followUpCount?: number;
  servingStatus: EventServingStatus;
}

export function getDefaultEventSearchPolicy(
  actorType: EventActorType,
  scenario: EventScenario,
): EventSearchPolicy {
  if (scenario === "at_event_capture") {
    return {
      actorType,
      scenario,
      freshness: "cached_ok",
      maxCostCents: 0,
      allowPaidSearch: false,
      requiresApproval: false,
      persist: true,
      persistenceScope: "private",
      preferredOrder: ["event_corpus", "tenant_memory", "source_cache"],
    };
  }

  if (actorType === "anonymous" || actorType === "event_guest") {
    return {
      actorType,
      scenario,
      freshness: "cached_ok",
      maxCostCents: 0,
      allowPaidSearch: false,
      requiresApproval: false,
      persist: actorType === "event_guest",
      persistenceScope: actorType === "event_guest" ? "private" : "none",
      preferredOrder: ["event_corpus", "source_cache"],
    };
  }

  if (scenario === "investment_grade_diligence") {
    const canApprovePaidSearch = actorType === "admin" || actorType === "research_lead";
    return {
      actorType,
      scenario,
      freshness: "live_required",
      maxCostCents: canApprovePaidSearch ? 500 : 0,
      allowPaidSearch: canApprovePaidSearch,
      requiresApproval: true,
      persist: true,
      persistenceScope: "team",
      preferredOrder: [
        "tenant_memory",
        "event_corpus",
        "source_cache",
        "free_public_search",
        "paid_search",
      ],
    };
  }

  return {
    actorType,
    scenario,
    freshness: "recent",
    maxCostCents: 25,
    allowPaidSearch: false,
    requiresApproval: false,
    persist: true,
    persistenceScope: actorType === "agent" ? "team" : "private",
    preferredOrder: [
      "tenant_memory",
      "event_corpus",
      "source_cache",
      "free_public_search",
    ],
  };
}

export function buildEventServingStatus(
  policy: EventSearchPolicy,
  cacheState: EventServingCacheState = {},
): EventServingStatus {
  if (cacheState.eventCorpusHit) {
    return {
      label: "Using event corpus",
      detail: "No paid search used",
      paidCallsUsed: 0,
      requiresApproval: false,
      persisted: policy.persist,
    };
  }

  if (cacheState.tenantMemoryHit) {
    return {
      label: "Using team memory",
      detail: "Found reusable context",
      paidCallsUsed: 0,
      requiresApproval: false,
      persisted: policy.persist,
    };
  }

  if (cacheState.sourceCacheHit) {
    return {
      label: "Using source cache",
      detail: "No paid search used",
      paidCallsUsed: 0,
      requiresApproval: false,
      persisted: policy.persist,
    };
  }

  if (policy.requiresApproval) {
    return {
      label: "Deep refresh requires approval",
      detail: "Live paid search is gated by workspace policy",
      paidCallsUsed: 0,
      requiresApproval: true,
      persisted: policy.persist,
    };
  }

  return {
    label: "Checking public sources",
    detail: "Free refresh only",
    paidCallsUsed: 0,
    requiresApproval: false,
    persisted: policy.persist,
  };
}

export function formatEventCaptureAck(result: EventCaptureAckResult): string {
  const targetLine = result.status === "attached" || result.status === "captured"
    ? `Saved to ${result.targetLabel}`
    : result.status === "needs_confirmation"
      ? `Needs confirmation for ${result.targetLabel}`
      : "Saved to unassigned";
  const detected = [
    countLabel(result.personCount ?? 0, "person", "people"),
    countLabel(result.companyCount ?? 0, "company", "companies"),
    countLabel(result.claimCount ?? 0, "claim", "claims"),
    countLabel(result.followUpCount ?? 0, "follow-up", "follow-ups"),
  ].filter(Boolean);
  const statusDetail = result.servingStatus.detail
    ? `${result.servingStatus.label} | ${result.servingStatus.detail}`
    : result.servingStatus.label;

  return [
    targetLine,
    detected.length > 0 ? `Detected ${detected.join(" | ")}` : "Detected no structured items",
    `${statusDetail} | ${result.servingStatus.paidCallsUsed} paid calls`,
  ].join("\n");
}

function countLabel(count: number, singular: string, plural: string): string | null {
  if (count <= 0) return null;
  return `${count} ${count === 1 ? singular : plural}`;
}
