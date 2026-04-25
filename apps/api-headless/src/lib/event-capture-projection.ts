export type EventCaptureKind = "text" | "voice" | "image" | "screenshot" | "file";

export type EventCaptureProjectionInput = {
  text: string;
  workspaceId?: string;
  eventId?: string;
  eventSessionId?: string;
  anonymousSessionId?: string;
  title?: string;
  kind?: EventCaptureKind;
  now?: number;
};

type EntityInput = {
  id: string;
  uri: string;
  type: "event" | "person" | "company" | "market" | "job" | "customer_segment" | "claim" | "source";
  name: string;
  layer: "event_corpus" | "private_capture" | "team_memory" | "source_cache" | "workspace_memory";
  confidence: number;
};

type ClaimInput = {
  id: string;
  subjectId: string;
  claim: string;
  status: "field_note" | "needs_evidence" | "provisional" | "verified";
  visibility: "private" | "team" | "tenant" | "public";
  evidenceIds: string[];
  promotionGate: "none" | "needs_public_source" | "needs_human_review" | "approval_required";
};

type FollowUpInput = {
  id: string;
  owner: string;
  action: string;
  linkedEntityIds: string[];
  due: "today" | "this_week" | "later";
  priority: "low" | "medium" | "high";
  status?: "open" | "done" | "dismissed";
};

const COMPANY_SUFFIX =
  /\b(Inc|Labs|AI|Systems|Technologies|Tech|Health|Bio|Robotics|Capital|Ventures|Partners|Bank|University)\b/;

export function slugifyEventCaptureValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "capture";
}

export function titleizeEventWorkspace(workspaceId: string, explicitTitle?: string) {
  if (explicitTitle?.trim()) return explicitTitle.trim();
  if (workspaceId === "ship-demo-day") return "Ship Demo Day";
  return workspaceId
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Event Workspace";
}

export function buildEventCaptureMutationArgs(input: EventCaptureProjectionInput) {
  const text = input.text.trim();
  if (!text) throw new Error("text is required for event capture");

  const now = input.now ?? Date.now();
  const workspaceId = input.workspaceId?.trim() || "ship-demo-day";
  const eventId = input.eventId?.trim() || workspaceId;
  const title = titleizeEventWorkspace(workspaceId, input.title);
  const eventSessionId = input.eventSessionId?.trim() || `session.${workspaceId}`;
  const captureId = `capture.${workspaceId}.${now}`;
  const eventEntityId = `event.${slugifyEventCaptureValue(workspaceId)}`;
  const evidenceId = `e.${slugifyEventCaptureValue(captureId)}`;
  const routeEntities = extractEventCaptureEntities(text);
  const entities: EntityInput[] = [
    {
      id: eventEntityId,
      uri: `nodebench://event/${slugifyEventCaptureValue(workspaceId)}`,
      type: "event",
      name: title,
      layer: "event_corpus",
      confidence: 0.88,
    },
    ...routeEntities,
  ];
  const subjectId =
    routeEntities.find((entity) => entity.type === "company")?.id ??
    routeEntities.find((entity) => entity.type === "person")?.id ??
    eventEntityId;
  const claims = extractEventCaptureClaims(text, subjectId, evidenceId);
  const followUps = extractEventCaptureFollowUps(text, routeEntities);

  return {
    anonymousSessionId: input.anonymousSessionId,
    workspaceId,
    eventId,
    title,
    eventSessionId,
    runId: `run.${workspaceId}.${now}`,
    entities,
    evidence: [
      {
        id: evidenceId,
        sourceId: now,
        layer: "private_capture" as const,
        title: `Private capture - ${text.replace(/\s+/g, " ").slice(0, 72)}`,
        visibility: "private" as const,
        reusable: true,
      },
    ],
    claims,
    followUps,
    capture: {
      captureId,
      eventSessionId,
      kind: input.kind ?? "text",
      rawText: text,
      extractedEntityIds: entities.map((entity) => entity.id),
      extractedClaimIds: claims.map((claim) => claim.id),
      confidence: routeEntities.length > 0 ? 0.82 : 0.68,
      status: "attached" as const,
      createdAt: now,
    },
    budgetDecisions: [
      {
        scenario: "At-event capture",
        actorType: "agent" as const,
        route: ["event_corpus", "tenant_memory", "source_cache"],
        paidCallsUsed: 0,
        requiresApproval: false,
        persistedLayer: "private_capture" as const,
      },
    ],
  };
}

function extractEventCaptureEntities(text: string): EntityInput[] {
  const entities: EntityInput[] = [];
  const seen = new Set<string>();
  const add = (name: string, type: EntityInput["type"], confidence: number) => {
    const cleaned = name.replace(/[.,:;!?]+$/g, "").trim();
    if (!cleaned || cleaned.length < 2) return;
    const slug = slugifyEventCaptureValue(cleaned);
    const id = `${type}.${slug}`;
    if (seen.has(id)) return;
    seen.add(id);
    entities.push({
      id,
      uri: entityUri(type, slug),
      type,
      name: cleaned,
      layer: "private_capture",
      confidence,
    });
  };

  const fromMatch = text.match(/\bfrom\s+([A-Z][A-Za-z0-9&-]*(?:\s+[A-Z][A-Za-z0-9&-]*){0,3})/);
  if (fromMatch) add(fromMatch[1], "company", 0.86);

  const metMatch = text.match(/\b(?:met|talked to|spoke with|coffee with)\s+([A-Z][A-Za-z.-]*(?:\s+(?!from\b)[A-Z][A-Za-z.-]*)?)/i);
  if (metMatch) add(metMatch[1], "person", 0.82);

  for (const phrase of text.match(/\b[A-Z][A-Za-z0-9&-]*(?:\s+[A-Z][A-Za-z0-9&-]*){0,3}\b/g) ?? []) {
    if (COMPANY_SUFFIX.test(phrase)) add(phrase, "company", 0.72);
  }

  const normalized = text.toLowerCase();
  if (/\b(healthcare|hospital|payer|clinic|pharma)\b/.test(normalized)) {
    add("Healthcare Ops", "market", 0.7);
  }
  if (/\b(design partner|pilot|workflow)\b/.test(normalized)) {
    add("Design partner workflow", "customer_segment", 0.66);
  }

  return entities.slice(0, 8);
}

function extractEventCaptureClaims(
  text: string,
  subjectId: string,
  evidenceId: string,
): ClaimInput[] {
  return text
    .split(/(?<=[.!?])\s+|;\s+|\n+/)
    .map((part) => part.trim())
    .filter((part) =>
      /\b(builds?|building|uses|wants|looking for|raised|seed|series|ARR|NRR|claims?|needs?|launched|ships?|competitor|risk|budget|hiring|pilot|design partner)\b/i.test(part),
    )
    .slice(0, 4)
    .map((part, index) => ({
      id: `claim.${slugifyEventCaptureValue(part).slice(0, 64) || index}`,
      subjectId,
      claim: part.replace(/^[-*]\s*/, ""),
      status: "field_note",
      visibility: "private",
      evidenceIds: [evidenceId],
      promotionGate: "needs_human_review",
    }));
}

function extractEventCaptureFollowUps(
  text: string,
  entities: EntityInput[],
): FollowUpInput[] {
  const normalized = text.toLowerCase();
  const linkedEntityIds = entities.slice(0, 3).map((entity) => entity.id);
  const followUps: FollowUpInput[] = [];
  if (/\b(follow up|follow-up|todo|next step|ask them|reply|schedule)\b/i.test(text)) {
    followUps.push({
      id: `fu.${slugifyEventCaptureValue(text).slice(0, 64)}`,
      owner: "agent",
      action: text.slice(0, 160),
      linkedEntityIds,
      due: normalized.includes("tomorrow") ? "today" : "this_week",
      priority: normalized.includes("urgent") || normalized.includes("tomorrow") ? "high" : "medium",
    });
  }
  if (/\b(design partner|pilot)\b/.test(normalized)) {
    followUps.push({
      id: "fu.ask-about-pilot-criteria-and-design-partner-timeline",
      owner: "agent",
      action: "Ask about pilot criteria and design-partner timeline",
      linkedEntityIds,
      due: "today",
      priority: "high",
    });
  }
  return followUps;
}

function entityUri(type: EntityInput["type"], slug: string) {
  if (type === "company") return `nodebench://org/${slug}`;
  if (type === "person") return `nodebench://person/${slug}`;
  if (type === "event") return `nodebench://event/${slug}`;
  if (type === "customer_segment") return `nodebench://segment/${slug}`;
  return `nodebench://${type}/${slug}`;
}
