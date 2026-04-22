export type ReportArtifactMode = "report" | "prep_brief";

export const PREP_BRIEF_TYPE = "prep_brief";
const PLACEHOLDER_PREP_ENTITY_TOKENS = new Set([
  "prep",
  "conversation",
  "this conversation",
  "meeting",
  "call",
]);

const PREP_BRIEF_PATTERNS = [
  /\bprep me\b/i,
  /\bprepare me\b/i,
  /\bprep brief\b/i,
  /\bbrief me for\b/i,
  /\bhelp me prepare\b/i,
  /\b(?:tomorrow'?s|next)\s+(?:call|meeting|interview|conversation)\b/i,
  /\btalk track\b/i,
  /\blikely questions\b/i,
  /\bobjections?\b/i,
];

const QUESTION_ENTITY_PATTERNS = [
  /^(?:what|why|how|who|where|when|which)\s+/i,
  /^(?:tell|show|explain|compare|summarize|analyse|analyze)\s+(?:me\s+)?/i,
];

const PREP_VERB_ENTITY_PATTERNS = [
  /^(?:create|draft|write|build|make|prep|prepare)\b/i,
];

const INSTRUCTION_TAIL_PATTERN = /\.(?:\s+|\n+)(?:Include|Need|Show|Summarize|Compare|Draft|Explain|Keep|Focus|Prepare|Translate|Verify)\b.*$/i;
const COMPANY_ALIAS_SUFFIX_TOKENS = new Set([
  "co",
  "company",
  "corp",
  "corporation",
  "group",
  "holding",
  "holdings",
  "inc",
  "limited",
  "ltd",
  "llc",
  "lp",
  "plc",
  "pte",
]);

function normalizeText(value: string | null | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

function stripArtifactPrefixes(value: string | null | undefined) {
  return normalizeText(value).replace(/^prep brief\s+(?:â€”|—|-)\s+/i, "").trim();
}

function stripInstructionTail(value: string | null | undefined) {
  return stripArtifactPrefixes(value).replace(INSTRUCTION_TAIL_PATTERN, "").trim();
}

function normalizeAliasTokens(value: string | null | undefined) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/g)
    .filter(Boolean);
}

function aliasKeyFromText(value: string | null | undefined) {
  return normalizeAliasTokens(value).join("-");
}

function hasCompanyAliasSuffix(value: string | null | undefined) {
  return normalizeAliasTokens(value).some((token) => COMPANY_ALIAS_SUFFIX_TOKENS.has(token));
}

function isLowercaseSlugLike(value: string | null | undefined) {
  const normalized = normalizeText(value);
  return Boolean(normalized) && normalized === normalized.toLowerCase() && /[a-z]/.test(normalized);
}

export function isPrepBriefType(value: string | null | undefined): boolean {
  return normalizeText(value).toLowerCase() === PREP_BRIEF_TYPE;
}

export function deriveReportArtifactMode(query: string | null | undefined): ReportArtifactMode {
  const normalized = normalizeText(query);
  if (!normalized) return "report";
  return PREP_BRIEF_PATTERNS.some((pattern) => pattern.test(normalized)) ? "prep_brief" : "report";
}

export function getReportArtifactLabel(type: string | null | undefined): string {
  return isPrepBriefType(type) ? "Prep brief" : "Report";
}

export function extractEntitySubjectFromQuery(query: string | null | undefined): string | undefined {
  const normalized = normalizeText(query);
  if (!normalized) return undefined;

  const patterns = [
    /\b(?:about|with|for)\s+([A-Z][A-Za-z0-9&.\-]+(?:\s+[A-Z][A-Za-z0-9&.\-]+){0,3})(?=[,.;:!?]|$)/i,
    /\b(?:call|meeting|interview|conversation)\s+with\s+([A-Z][A-Za-z0-9&.\-]+(?:\s+[A-Z][A-Za-z0-9&.\-]+){0,3})(?=[,.;:!?]|$)/i,
    /^(?:what|who|why|how|where|when|which)\s+(?:is|are|does|did|can|should|would|could|has|have)?\s*([A-Z][A-Za-z0-9&.\-]+(?:\s+[A-Z][A-Za-z0-9&.\-]+){0,3})(?=\s+and\b|[,.;:!?]|$)/i,
    /^(?:what|who|why|how|where|when|which)\s+(?:is|are|does|did|can|should|would|could|has|have)?\s*([A-Z][A-Za-z0-9&.\-]+(?:\s+[A-Z][A-Za-z0-9&.\-]+){0,3})(?=[,.;:!?]|$)/i,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    const subject = stripInstructionTail(match?.[1]).replace(/[?.!,;:]+$/g, "");
    if (subject && subject.length > 1) return subject;
  }

  return undefined;
}

export function isPromptShapedEntityName(value: string | null | undefined): boolean {
  const normalized = stripArtifactPrefixes(value);
  if (!normalized) return false;
  if (normalized.includes("?")) return true;
  return QUESTION_ENTITY_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function isLegacyPrepVerbEntityName(value: string | null | undefined): boolean {
  const normalized = stripArtifactPrefixes(value);
  if (!normalized) return false;
  return PREP_VERB_ENTITY_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function deriveCanonicalEntityName(args: {
  primaryEntity?: string | null;
  title?: string | null;
  query?: string | null;
  type?: string | null;
}): string | undefined {
  const primaryEntity = stripInstructionTail(args.primaryEntity);
  const titleEntity = stripInstructionTail(args.title);
  const query = normalizeText(args.query);
  const querySubject = extractEntitySubjectFromQuery(query);

  const candidate = primaryEntity || titleEntity || query;
  if (!candidate && querySubject) return querySubject;
  if (!candidate) return undefined;

  if (querySubject) {
    const needsCanonicalReplacement =
      isPromptShapedEntityName(candidate) ||
      candidate.toLowerCase() === query.toLowerCase() ||
      (isPrepBriefType(args.type) && isLegacyPrepVerbEntityName(candidate));
    if (needsCanonicalReplacement) return querySubject;
  }

  return candidate;
}

export function buildEntityAliasKey(args: {
  primaryEntity?: string | null;
  title?: string | null;
  query?: string | null;
  type?: string | null;
  entityType?: string | null;
  slug?: string | null;
}): string | undefined {
  const canonical =
    deriveCanonicalEntityName(args) ||
    stripInstructionTail(args.primaryEntity) ||
    stripInstructionTail(args.title) ||
    normalizeText(args.query);
  const entityType = normalizeText(args.entityType).toLowerCase();

  if (!canonical) {
    return aliasKeyFromText(args.slug);
  }

  const tokens = normalizeAliasTokens(canonical);
  if (tokens.length === 0) {
    return aliasKeyFromText(args.slug);
  }

  if (entityType === "company") {
    const filteredTokens = tokens.filter((token) => !COMPANY_ALIAS_SUFFIX_TOKENS.has(token));
    const stableTokens = filteredTokens.length > 0 ? filteredTokens : tokens;
    return stableTokens.join("-");
  }

  if (entityType === "person") {
    return tokens.join("-");
  }

  const filteredTokens = tokens.filter((token) => !COMPANY_ALIAS_SUFFIX_TOKENS.has(token));
  const stableTokens = filteredTokens.length > 0 ? filteredTokens : tokens;
  return stableTokens.join("-");
}

export function chooseEntityDisplayName(
  candidates: Array<string | null | undefined>,
  entityType?: string | null,
): string | undefined {
  const uniqueCandidates = [...new Set(
    candidates
      .map((candidate) => stripInstructionTail(candidate))
      .filter((candidate): candidate is string => Boolean(candidate)),
  )];
  if (uniqueCandidates.length === 0) return undefined;

  const normalizedEntityType = normalizeText(entityType).toLowerCase();
  if (normalizedEntityType === "company") {
    return [...uniqueCandidates].sort((left, right) => {
      const suffixPenalty = Number(hasCompanyAliasSuffix(left)) - Number(hasCompanyAliasSuffix(right));
      if (suffixPenalty !== 0) return suffixPenalty;
      const casingPenalty = Number(isLowercaseSlugLike(left)) - Number(isLowercaseSlugLike(right));
      if (casingPenalty !== 0) return casingPenalty;
      const wordPenalty =
        normalizeAliasTokens(left).length - normalizeAliasTokens(right).length;
      if (wordPenalty !== 0) return wordPenalty;
      return left.length - right.length;
    })[0];
  }

  return [...uniqueCandidates].sort((left, right) => {
    const casingPenalty = Number(isLowercaseSlugLike(left)) - Number(isLowercaseSlugLike(right));
    if (casingPenalty !== 0) return casingPenalty;
    return left.length - right.length;
  })[0];
}

export function isLegacyPromptArtifact(args: {
  type?: string | null;
  entitySlug?: string | null;
  primaryEntity?: string | null;
  title?: string | null;
  query?: string | null;
}): boolean {
  const currentEntity =
    stripInstructionTail(args.primaryEntity) ||
    stripInstructionTail(args.title) ||
    normalizeText(args.entitySlug);

  if (!currentEntity) return false;
  if (isPromptShapedEntityName(currentEntity)) return true;
  if (isPrepBriefType(args.type) && isLegacyPrepVerbEntityName(currentEntity)) return true;
  if (INSTRUCTION_TAIL_PATTERN.test(stripArtifactPrefixes(args.primaryEntity) || stripArtifactPrefixes(args.title))) {
    return true;
  }

  const canonical = deriveCanonicalEntityName(args);
  if (!canonical) return false;

  return currentEntity.toLowerCase() !== canonical.toLowerCase() && (
    isPromptShapedEntityName(currentEntity) ||
    (isPrepBriefType(args.type) && isLegacyPrepVerbEntityName(currentEntity))
  );
}

export function buildPrepBriefTitle(args: {
  entityName?: string | null;
  fallbackQuery?: string | null;
}): string {
  const subject =
    normalizeText(args.entityName) ||
    extractEntitySubjectFromQuery(args.fallbackQuery) ||
    "";
  return subject ? `Prep brief — ${subject}` : "Prep brief";
}

export function buildPrepBriefPrompt(args: {
  entityName?: string | null;
  fallbackQuery?: string | null;
}): string {
  const subject =
    normalizeText(args.entityName) ||
    extractEntitySubjectFromQuery(args.fallbackQuery) ||
    "this conversation";

  return `${subject} prep brief. Include the most important facts, likely questions, likely objections or risks, and the opening I should use.`;
}

export function getArtifactSectionTitles(
  mode: ReportArtifactMode,
): Record<"what-it-is" | "why-it-matters" | "what-is-missing" | "what-to-do-next", string> {
  if (mode === "prep_brief") {
    return {
      "what-it-is": "What to walk in knowing",
      "why-it-matters": "Why they'll care",
      "what-is-missing": "Likely questions or objections",
      "what-to-do-next": "Talk track and next move",
    };
  }

  return {
    "what-it-is": "What it is",
    "why-it-matters": "Why it matters",
    "what-is-missing": "What is missing",
    "what-to-do-next": "What to do next",
  };
}

export function isPlaceholderPrepEntity(value: string | null | undefined): boolean {
  const normalized = normalizeText(value).toLowerCase();
  return Boolean(normalized) && PLACEHOLDER_PREP_ENTITY_TOKENS.has(normalized);
}
