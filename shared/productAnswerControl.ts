import { extractEntitySubjectFromQuery } from "./reportArtifacts";

export const PRODUCT_RESOLUTION_STATES = [
  "exact",
  "probable",
  "ambiguous",
  "unresolved",
] as const;

export type ProductResolutionState = (typeof PRODUCT_RESOLUTION_STATES)[number];

export const PRODUCT_ARTIFACT_STATES = [
  "none",
  "draft",
  "saved",
  "published",
] as const;

export type ProductArtifactState = (typeof PRODUCT_ARTIFACT_STATES)[number];

export const PRODUCT_SAVE_ELIGIBILITIES = [
  "blocked",
  "draft_only",
  "save_ready",
  "publish_ready",
] as const;

export type ProductSaveEligibility = (typeof PRODUCT_SAVE_ELIGIBILITIES)[number];

export const PRODUCT_REQUEST_KINDS = [
  "conversational_follow_up",
  "entity_lookup",
  "compound_research",
  "artifact_resume",
] as const;

export type ProductRequestKind = (typeof PRODUCT_REQUEST_KINDS)[number];

export const PRODUCT_CLAIM_TYPES = [
  "entity_name",
  "headquarters",
  "funding_round",
  "funding_amount",
  "funding_date",
  "founder_identity",
  "founder_role",
  "product_capability",
  "pricing",
  "customer",
  "hiring_signal",
  "job_salary",
  "job_location",
  "timeline_event",
  "summary_other",
] as const;

export type ProductClaimType = (typeof PRODUCT_CLAIM_TYPES)[number];

export const PRODUCT_CLAIM_SUPPORT_TYPES = [
  "direct",
  "inferred",
  "weak",
] as const;

export type ProductClaimSupportType = (typeof PRODUCT_CLAIM_SUPPORT_TYPES)[number];

export const PRODUCT_CLAIM_SUPPORT_STRENGTHS = [
  "verified",
  "corroborated",
  "single_source",
  "weak",
] as const;

export type ProductClaimSupportStrength =
  (typeof PRODUCT_CLAIM_SUPPORT_STRENGTHS)[number];

export const PRODUCT_FRESHNESS_STATUSES = [
  "fresh",
  "stale",
  "unknown",
] as const;

export type ProductFreshnessStatus =
  (typeof PRODUCT_FRESHNESS_STATUSES)[number];

export type ProductResolutionCandidate = {
  candidateKey: string;
  label: string;
  slug: string;
  confidence: number;
  reason: string;
};

export type ProductResolvedTarget = {
  intentKind: ProductRequestKind;
  state: ProductResolutionState;
  entityName: string | null;
  entitySlug: string | null;
  confidence: number;
  reason: string;
  candidates: ProductResolutionCandidate[];
};

export type ProductAnswerControlSource = {
  id: string;
  label: string;
  href?: string;
  domain?: string;
  excerpt?: string;
  publishedAt?: string;
};

export type ProductAnswerControlSection = {
  id: string;
  title: string;
  body?: string;
  sourceRefIds?: string[];
};

export type ProductClaimSupportDraft = {
  sourceRefId: string;
  spanText: string;
  spanHash: string;
  supportType: ProductClaimSupportType;
  freshnessStatus: ProductFreshnessStatus;
};

export type ProductClaimDraft = {
  claimKey: string;
  claimText: string;
  claimType: ProductClaimType;
  slotKey: string;
  sectionId: string;
  sourceRefIds: string[];
  supports: ProductClaimSupportDraft[];
  supportStrength: ProductClaimSupportStrength;
  freshnessStatus: ProductFreshnessStatus;
  contradictionFlag: boolean;
  conflictingClaimKeys: string[];
  publishable: boolean;
  rejectionReasons: string[];
};

export type ProductCompiledSentence = {
  sentenceId: string;
  text: string;
  claimKeys: string[];
  sourceRefIds: string[];
};

export type ProductCompiledSection = {
  id: string;
  title: string;
  sentences: ProductCompiledSentence[];
};

export type ProductActionItem = {
  type: string;
  label: string;
  rationale: string;
  enabled: boolean;
  blockedReason?: string;
};

export type ProductClaimLedgerSummary = {
  totalClaims: number;
  publishableClaims: number;
  rejectedClaims: number;
  contradictedClaims: number;
  corroboratedClaims: number;
  verifiedClaims: number;
  weakClaims: number;
  rejectionReasons: string[];
};

export type ProductPersistenceDecision = {
  artifactState: ProductArtifactState;
  saveEligibility: ProductSaveEligibility;
  reason: string;
};

const GENERIC_ENTITY_TOKENS = new Set([
  "a",
  "an",
  "and",
  "company",
  "detail",
  "details",
  "entity",
  "explain",
  "help",
  "it",
  "job",
  "me",
  "more",
  "role",
  "someone",
  "something",
  "tell",
  "that",
  "the",
  "them",
  "they",
  "this",
  "what",
  "who",
]);

const FOLLOW_UP_PATTERNS = [
  /\btell me more\b/i,
  /\bwhat about\b/i,
  /\bhow about\b/i,
  /\bmore about\b/i,
  /\bexplain that\b/i,
  /\bgo deeper\b/i,
];

const RESUME_PATTERNS = [
  /\bcontinue\b/i,
  /\bresume\b/i,
  /\bpick up\b/i,
  /\breopen\b/i,
  /\bopen (the )?(report|artifact|thread)\b/i,
];

const COMPOUND_PATTERNS = [
  /\bcompare\b/i,
  /\bversus\b/i,
  /\bvs\.?\b/i,
  /\bjob and company\b/i,
  /\bcompany and founders\b/i,
  /\bcompany and product\b/i,
];

const CLAIM_TYPE_PATTERNS: Array<{
  type: ProductClaimType;
  slotKey: string;
  test: RegExp;
}> = [
  { type: "headquarters", slotKey: "headquarters", test: /\bheadquartered\b|\bbased in\b/i },
  { type: "funding_amount", slotKey: "funding_amount", test: /\$\s?\d|\bvaluation\b/i },
  { type: "funding_round", slotKey: "funding_round", test: /\bseries [a-z]\b|\bseed\b|\bround\b/i },
  { type: "funding_date", slotKey: "funding_date", test: /\b(19|20)\d{2}\b|\bthis year\b|\blast year\b/i },
  { type: "founder_identity", slotKey: "founder_identity", test: /\bfounded by\b|\bfounder\b/i },
  { type: "founder_role", slotKey: "founder_role", test: /\bceo\b|\bcto\b|\bcoo\b/i },
  { type: "pricing", slotKey: "pricing", test: /\bpricing\b|\bprice\b|\bcost\b/i },
  { type: "customer", slotKey: "customer", test: /\bcustomer\b|\bclient\b|\busers?\b/i },
  { type: "hiring_signal", slotKey: "hiring_signal", test: /\bhiring\b|\bopen role\b|\bjob post\b/i },
  { type: "job_salary", slotKey: "job_salary", test: /\bsalary\b|\bcompensation\b|\bpay\b/i },
  { type: "job_location", slotKey: "job_location", test: /\blocation\b|\bremote\b|\bonsite\b|\bhybrid\b/i },
  { type: "timeline_event", slotKey: "timeline_event", test: /\blaunched\b|\breleased\b|\bannounced\b|\bshipped\b/i },
  { type: "product_capability", slotKey: "product_capability", test: /\bplatform\b|\bproduct\b|\bsoftware\b|\btool\b|\bservice\b/i },
];

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0).toString(16);
}

function normalizeWhitespace(value: string | null | undefined) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function slugifyCandidate(value: string | null | undefined) {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/['".,()[\]{}]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function isGenericEntityCandidate(value: string | null | undefined) {
  const normalized = slugifyCandidate(value);
  if (!normalized) return true;
  const parts = normalized.split("-").filter(Boolean);
  if (parts.length === 0) return true;
  if (parts.every((part) => GENERIC_ENTITY_TOKENS.has(part))) return true;
  return false;
}

function splitSentences(text: string | null | undefined) {
  const normalized = normalizeWhitespace(text);
  if (!normalized) return [];
  return normalized
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
}

function dedupeCandidates(
  candidates: ProductResolutionCandidate[],
): ProductResolutionCandidate[] {
  const seen = new Set<string>();
  const next: ProductResolutionCandidate[] = [];
  for (const candidate of candidates) {
    const key = candidate.slug || candidate.candidateKey;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    next.push(candidate);
  }
  return next.sort((left, right) => right.confidence - left.confidence);
}

function inferFreshnessStatus(publishedAt?: string): ProductFreshnessStatus {
  if (!publishedAt) return "unknown";
  const timestamp = Date.parse(publishedAt);
  if (!Number.isFinite(timestamp)) return "unknown";
  const ageMs = Date.now() - timestamp;
  if (ageMs < 0) return "fresh";
  return ageMs <= 365 * 24 * 60 * 60 * 1000 ? "fresh" : "stale";
}

function mergeFreshness(values: ProductFreshnessStatus[]): ProductFreshnessStatus {
  if (values.includes("fresh")) return "fresh";
  if (values.includes("stale")) return "stale";
  return "unknown";
}

function inferClaimType(sectionId: string, sentence: string): {
  claimType: ProductClaimType;
  slotKey: string;
} {
  for (const pattern of CLAIM_TYPE_PATTERNS) {
    if (pattern.test.test(sentence)) {
      return { claimType: pattern.type, slotKey: pattern.slotKey };
    }
  }

  if (sectionId === "what-it-is") {
    return { claimType: "product_capability", slotKey: "product_capability" };
  }
  if (sectionId === "why-it-matters") {
    return { claimType: "timeline_event", slotKey: "timeline_event" };
  }

  return { claimType: "summary_other", slotKey: "summary_other" };
}

export function classifyProductRequest(query: string): ProductRequestKind {
  const normalized = normalizeWhitespace(query).toLowerCase();
  if (!normalized) return "entity_lookup";
  if (RESUME_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return "artifact_resume";
  }
  if (COMPOUND_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return "compound_research";
  }
  if (FOLLOW_UP_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return "conversational_follow_up";
  }

  const subject = extractEntitySubjectFromQuery(query);
  if (!subject || isGenericEntityCandidate(subject)) {
    return "conversational_follow_up";
  }

  return "entity_lookup";
}

export function resolveProductTarget(args: {
  query: string;
  entitySlugHint?: string | null;
  packetEntityName?: string | null;
  sources?: ProductAnswerControlSource[];
}): ProductResolvedTarget {
  const intentKind = classifyProductRequest(args.query);
  const candidates: ProductResolutionCandidate[] = [];
  const querySubject = extractEntitySubjectFromQuery(args.query);
  const normalizedQuerySubject = normalizeWhitespace(querySubject);
  const normalizedPacketEntity = normalizeWhitespace(args.packetEntityName);

  if (args.entitySlugHint && normalizeWhitespace(args.entitySlugHint)) {
    const label =
      args.entitySlugHint
        .split(/[-_]+/g)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ") || normalizeWhitespace(args.entitySlugHint);
    candidates.push({
      candidateKey: `hint:${slugifyCandidate(args.entitySlugHint)}`,
      label,
      slug: slugifyCandidate(args.entitySlugHint),
      confidence: 0.99,
      reason: "Explicit entity hint from the current thread.",
    });
  }

  if (normalizedPacketEntity && !isGenericEntityCandidate(normalizedPacketEntity)) {
    candidates.push({
      candidateKey: `packet:${slugifyCandidate(normalizedPacketEntity)}`,
      label: normalizedPacketEntity,
      slug: slugifyCandidate(normalizedPacketEntity),
      confidence: args.entitySlugHint ? 0.96 : 0.84,
      reason: "The retrieval packet named a primary entity.",
    });
  }

  if (normalizedQuerySubject && !isGenericEntityCandidate(normalizedQuerySubject)) {
    candidates.push({
      candidateKey: `query:${slugifyCandidate(normalizedQuerySubject)}`,
      label: normalizedQuerySubject,
      slug: slugifyCandidate(normalizedQuerySubject),
      confidence: 0.72,
      reason: "Derived from the user query.",
    });
  }

  const dedupedCandidates = dedupeCandidates(candidates);
  const sourceDomainCount = new Set(
    (args.sources ?? [])
      .map((source) => normalizeWhitespace(source.domain))
      .filter(Boolean),
  ).size;

  if (
    dedupedCandidates.length >= 2 &&
    dedupedCandidates[0]?.slug !== dedupedCandidates[1]?.slug
  ) {
    return {
      intentKind,
      state: "ambiguous",
      entityName: null,
      entitySlug: null,
      confidence: Math.min(0.55, dedupedCandidates[0]?.confidence ?? 0.5),
      reason: "Multiple candidate entities survived resolution and need clarification.",
      candidates: dedupedCandidates,
    };
  }

  const primary = dedupedCandidates[0] ?? null;
  if (!primary) {
    return {
      intentKind,
      state: "unresolved",
      entityName: null,
      entitySlug: null,
      confidence: 0.2,
      reason:
        intentKind === "conversational_follow_up"
          ? "The request reads like a conversational follow-up without a stable entity target."
          : "NodeBench could not resolve a stable entity target from the request.",
      candidates: [],
    };
  }

  if (args.entitySlugHint) {
    return {
      intentKind,
      state: "exact",
      entityName: primary.label,
      entitySlug: primary.slug,
      confidence: primary.confidence,
      reason: primary.reason,
      candidates: dedupedCandidates,
    };
  }

  if (
    normalizedPacketEntity &&
    normalizedQuerySubject &&
    slugifyCandidate(normalizedPacketEntity) === slugifyCandidate(normalizedQuerySubject)
  ) {
    if (sourceDomainCount < 2) {
      return {
        intentKind,
        state: "probable",
        entityName: primary.label,
        entitySlug: primary.slug,
        confidence: Math.max(primary.confidence, 0.78),
        reason:
          "The query subject and packet entity align, but the run still needs broader support before exact resolution.",
        candidates: dedupedCandidates,
      };
    }

    return {
      intentKind,
      state: "exact",
      entityName: primary.label,
      entitySlug: primary.slug,
      confidence: Math.max(primary.confidence, 0.9),
      reason: "The query subject and packet entity agree on the same target.",
      candidates: dedupedCandidates,
    };
  }

  if (normalizedPacketEntity && sourceDomainCount > 0) {
    return {
      intentKind,
      state: "probable",
      entityName: primary.label,
      entitySlug: primary.slug,
      confidence: Math.max(primary.confidence, 0.76),
      reason: "The packet identified a likely target, but the thread still needs support before save-ready state.",
      candidates: dedupedCandidates,
    };
  }

  return {
    intentKind,
    state: "probable",
    entityName: primary.label,
    entitySlug: primary.slug,
    confidence: primary.confidence,
    reason: primary.reason,
    candidates: dedupedCandidates,
  };
}

export function extractClaimsFromSections(args: {
  sections: ProductAnswerControlSection[];
  sources: ProductAnswerControlSource[];
  resolution: ProductResolvedTarget;
}): ProductClaimDraft[] {
  const sourceMap = new Map(args.sources.map((source) => [source.id, source]));
  const claims: ProductClaimDraft[] = [];

  for (const section of args.sections) {
    const sectionBody = normalizeWhitespace(section.body);
    if (!sectionBody) continue;

    const sourceRefIds = Array.from(new Set(section.sourceRefIds ?? []));
    const sentences = splitSentences(sectionBody);
    if (sentences.length === 0) continue;

    for (let sentenceIndex = 0; sentenceIndex < sentences.length; sentenceIndex += 1) {
      const sentence = sentences[sentenceIndex];
      const { claimType, slotKey } = inferClaimType(section.id, sentence);
      const supports = sourceRefIds.map((sourceRefId) => {
        const source = sourceMap.get(sourceRefId);
        const spanText = normalizeWhitespace(source?.excerpt) || sentence;
        return {
          sourceRefId,
          spanText,
          spanHash: stableHash(`${sourceRefId}:${spanText}`),
          supportType: source?.excerpt ? "direct" : "inferred",
          freshnessStatus: inferFreshnessStatus(source?.publishedAt),
        } satisfies ProductClaimSupportDraft;
      });

      let supportStrength: ProductClaimSupportStrength = "weak";
      if (supports.length >= 2) {
        supportStrength = "corroborated";
      } else if (supports.length === 1 && supports[0]?.supportType === "direct") {
        supportStrength = "verified";
      } else if (supports.length === 1) {
        supportStrength = "single_source";
      }

      const rejectionReasons: string[] = [];
      if (args.resolution.state === "unresolved") {
        rejectionReasons.push("unresolved_target");
      }
      if (args.resolution.state === "ambiguous") {
        rejectionReasons.push("ambiguous_target");
      }
      if (supportStrength === "weak") {
        rejectionReasons.push("insufficient_support");
      }
      if (section.id === "what-to-do-next") {
        rejectionReasons.push("action_claim");
      }
      if (section.id === "what-is-missing" && supports.length === 0) {
        rejectionReasons.push("uncertainty_only");
      }

      const freshnessStatus = mergeFreshness(
        supports.map((support) => support.freshnessStatus),
      );
      const claimKey = `${section.id}:${sentenceIndex}:${stableHash(sentence)}`;
      claims.push({
        claimKey,
        claimText: sentence,
        claimType,
        slotKey,
        sectionId: section.id,
        sourceRefIds,
        supports,
        supportStrength,
        freshnessStatus,
        contradictionFlag: false,
        conflictingClaimKeys: [],
        publishable: rejectionReasons.length === 0,
        rejectionReasons,
      });
    }
  }

  const bySlot = new Map<string, ProductClaimDraft[]>();
  for (const claim of claims) {
    const bucket = bySlot.get(claim.slotKey) ?? [];
    bucket.push(claim);
    bySlot.set(claim.slotKey, bucket);
  }

  for (const [slotKey, bucket] of bySlot) {
    if (slotKey === "summary_other" || bucket.length < 2) continue;
    const distinctClaims = Array.from(
      new Set(bucket.map((claim) => normalizeWhitespace(claim.claimText).toLowerCase())),
    );
    if (distinctClaims.length < 2) continue;
    const claimKeys = bucket.map((claim) => claim.claimKey);
    for (const claim of bucket) {
      claim.contradictionFlag = true;
      claim.conflictingClaimKeys = claimKeys.filter((key) => key !== claim.claimKey);
      if (!claim.rejectionReasons.includes("slot_conflict")) {
        claim.rejectionReasons.push("slot_conflict");
      }
      claim.publishable = false;
    }
  }

  return claims;
}

export function summarizeClaimLedger(
  claims: ProductClaimDraft[],
): ProductClaimLedgerSummary {
  const rejectionReasons = Array.from(
    new Set(claims.flatMap((claim) => claim.rejectionReasons)),
  ).sort();
  return {
    totalClaims: claims.length,
    publishableClaims: claims.filter((claim) => claim.publishable).length,
    rejectedClaims: claims.filter((claim) => !claim.publishable).length,
    contradictedClaims: claims.filter((claim) => claim.contradictionFlag).length,
    corroboratedClaims: claims.filter((claim) => claim.supportStrength === "corroborated").length,
    verifiedClaims: claims.filter((claim) => claim.supportStrength === "verified").length,
    weakClaims: claims.filter((claim) => claim.supportStrength === "weak").length,
    rejectionReasons,
  };
}

export function decidePersistence(args: {
  resolution: ProductResolvedTarget;
  claimSummary: ProductClaimLedgerSummary;
  sourceCount: number;
}): ProductPersistenceDecision {
  if (args.resolution.state === "unresolved") {
    return {
      artifactState: "none",
      saveEligibility: "blocked",
      reason: "NodeBench could not resolve a stable target yet.",
    };
  }

  if (args.resolution.state === "ambiguous") {
    return {
      artifactState: "none",
      saveEligibility: "blocked",
      reason: "Multiple candidate entities need clarification before any report is saved.",
    };
  }

  if (args.resolution.state === "probable") {
    return {
      artifactState: "draft",
      saveEligibility: "draft_only",
      reason: "The target is probable, but the run is not strong enough for a saved report.",
    };
  }

  if (
    args.claimSummary.publishableClaims < 2 ||
    args.claimSummary.corroboratedClaims < 1 ||
    args.sourceCount < 2
  ) {
    return {
      artifactState: "draft",
      saveEligibility: "draft_only",
      reason: "The run resolved the target, but grounded coverage is still too thin for save-ready state.",
    };
  }

  return {
    artifactState: "saved",
    saveEligibility: "save_ready",
    reason: "The run resolved the target and met the minimum support threshold for a saved artifact.",
  };
}

export function compileTruthSections(args: {
  claims: ProductClaimDraft[];
}): ProductCompiledSection[] {
  const sectionLabels: Record<string, string> = {
    "what-it-is": "What it is",
    "why-it-matters": "Why it matters",
    "what-is-missing": "What I'm less sure about",
  };
  const publishable = args.claims.filter(
    (claim) =>
      claim.publishable &&
      (claim.sectionId === "what-it-is" || claim.sectionId === "why-it-matters"),
  );
  const uncertain = args.claims.filter(
    (claim) =>
      claim.sectionId === "what-is-missing" ||
      claim.rejectionReasons.includes("slot_conflict") ||
      claim.rejectionReasons.includes("uncertainty_only"),
  );

  const buckets = new Map<string, ProductCompiledSentence[]>();
  const pushSentence = (
    sectionId: string,
    sentence: ProductCompiledSentence,
  ) => {
    const existing = buckets.get(sectionId) ?? [];
    existing.push(sentence);
    buckets.set(sectionId, existing);
  };

  for (const claim of publishable) {
    pushSentence(claim.sectionId, {
      sentenceId: `truth:${claim.claimKey}`,
      text: claim.claimText,
      claimKeys: [claim.claimKey],
      sourceRefIds: claim.sourceRefIds,
    });
  }

  for (const claim of uncertain) {
    pushSentence("what-is-missing", {
      sentenceId: `uncertainty:${claim.claimKey}`,
      text: claim.claimText,
      claimKeys: [claim.claimKey],
      sourceRefIds: claim.sourceRefIds,
    });
  }

  return [
    "what-it-is",
    "why-it-matters",
    "what-is-missing",
  ].map((sectionId) => ({
    id: sectionId,
    title: sectionLabels[sectionId] ?? sectionId,
    sentences: buckets.get(sectionId) ?? [],
  }));
}

export function compileActionItems(args: {
  resolution: ProductResolvedTarget;
  artifactState: ProductArtifactState;
  saveEligibility: ProductSaveEligibility;
}): ProductActionItem[] {
  if (args.resolution.state === "ambiguous") {
    return [
      {
        type: "clarify_target",
        label: "Clarify target",
        rationale: "Multiple entities match this request.",
        enabled: true,
      },
      {
        type: "choose_candidate",
        label: "Choose candidate",
        rationale: "Pick the right company before NodeBench saves anything.",
        enabled: true,
      },
      {
        type: "paste_source_url",
        label: "Paste source URL",
        rationale: "A direct company or job link will collapse the ambiguity quickly.",
        enabled: true,
      },
    ];
  }

  if (args.resolution.state === "unresolved") {
    return [
      {
        type: "ask_follow_up",
        label: "Ask follow-up",
        rationale: "Keep this in chat until the target is clear.",
        enabled: true,
      },
      {
        type: "paste_source_url",
        label: "Paste source URL",
        rationale: "A concrete URL gives the run a stable target.",
        enabled: true,
      },
    ];
  }

  if (args.saveEligibility === "draft_only") {
    return [
      {
        type: "save_draft",
        label: "Save draft",
        rationale: "Persist the work without treating it as canonical yet.",
        enabled: args.artifactState === "draft",
        blockedReason:
          args.artifactState === "draft"
            ? undefined
            : "Draft creation is disabled for this run.",
      },
      {
        type: "continue_research",
        label: "Continue research",
        rationale: "Add more evidence before promoting this to a saved report.",
        enabled: true,
      },
      {
        type: "inspect_sources",
        label: "Inspect sources",
        rationale: "Review the evidence before trusting the synthesis.",
        enabled: true,
      },
    ];
  }

  return [
    {
      type: "open_report",
      label: "Open report",
      rationale: "The run is save-ready and can move into the durable artifact.",
      enabled: args.artifactState === "saved" || args.artifactState === "published",
      blockedReason:
        args.artifactState === "saved" || args.artifactState === "published"
          ? undefined
          : "The report is not durable yet.",
    },
    {
      type: "share",
      label: "Share",
      rationale: "Saved reports are stable enough to pass around.",
      enabled: args.artifactState === "saved" || args.artifactState === "published",
      blockedReason:
        args.artifactState === "saved" || args.artifactState === "published"
          ? undefined
          : "Sharing is blocked until the artifact is saved.",
    },
    {
      type: "continue_research",
      label: "Continue research",
      rationale: "Saved does not mean finished; deepen the artifact when needed.",
      enabled: true,
    },
  ];
}
