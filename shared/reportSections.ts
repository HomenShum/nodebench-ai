import { getArtifactSectionTitles, type ReportArtifactMode } from "./reportArtifacts";

type AnswerBlockLike = {
  id?: unknown;
  title?: unknown;
  text?: unknown;
  sourceRefIds?: unknown;
};

type PacketSourceRefLike = {
  id?: unknown;
};

type PacketVariableLike = {
  name?: unknown;
  sourceIdx?: unknown;
  sourceRefIds?: unknown;
};

type PacketChangeLike = {
  description?: unknown;
  sourceIdx?: unknown;
  sourceRefIds?: unknown;
};

type PacketRiskLike = {
  title?: unknown;
  description?: unknown;
  sourceIdx?: unknown;
  sourceRefIds?: unknown;
};

type PacketInterventionLike = {
  action?: unknown;
  sourceRefIds?: unknown;
};

export type PacketLike = {
  answer?: unknown;
  answerBlocks?: unknown;
  sourceRefs?: unknown;
  variables?: unknown;
  changes?: unknown;
  risks?: unknown;
  interventions?: unknown;
  nextQuestions?: unknown;
  uncertaintyBoundary?: unknown;
  recommendedNextAction?: unknown;
};

export type CanonicalSectionDraft = {
  id: "what-it-is" | "why-it-matters" | "what-is-missing" | "what-to-do-next";
  title: string;
  body?: string;
  sourceRefIds?: string[];
};

function normalizeText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeSourceRefIds(value: unknown): string[] {
  return Array.isArray(value)
    ? value
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter((item): item is string => item.length > 0)
    : [];
}

function unique(values: Array<string | undefined | null>): string[] {
  return Array.from(new Set(values.filter((value): value is string => typeof value === "string" && value.trim().length > 0)));
}

function normalizeBlocks(value: unknown): AnswerBlockLike[] {
  return Array.isArray(value) ? value.filter((item): item is AnswerBlockLike => Boolean(item && typeof item === "object")) : [];
}

function normalizeSourceRefs(value: unknown): PacketSourceRefLike[] {
  return Array.isArray(value) ? value.filter((item): item is PacketSourceRefLike => Boolean(item && typeof item === "object")) : [];
}

function normalizeVariables(value: unknown): PacketVariableLike[] {
  return Array.isArray(value) ? value.filter((item): item is PacketVariableLike => Boolean(item && typeof item === "object")) : [];
}

function normalizeChanges(value: unknown): PacketChangeLike[] {
  return Array.isArray(value) ? value.filter((item): item is PacketChangeLike => Boolean(item && typeof item === "object")) : [];
}

function normalizeRisks(value: unknown): PacketRiskLike[] {
  return Array.isArray(value) ? value.filter((item): item is PacketRiskLike => Boolean(item && typeof item === "object")) : [];
}

function normalizeInterventions(value: unknown): PacketInterventionLike[] {
  return Array.isArray(value) ? value.filter((item): item is PacketInterventionLike => Boolean(item && typeof item === "object")) : [];
}

function sourceIdFromIndex(sourceRefs: PacketSourceRefLike[], sourceIdx: unknown): string | undefined {
  if (typeof sourceIdx !== "number" || !Number.isFinite(sourceIdx)) return undefined;
  const resolved = sourceRefs[sourceIdx];
  return typeof resolved?.id === "string" && resolved.id.trim().length > 0 ? resolved.id.trim() : undefined;
}

function blockKey(block: AnswerBlockLike) {
  return `${normalizeText(block.id)?.toLowerCase() ?? ""} ${normalizeText(block.title)?.toLowerCase() ?? ""}`;
}

function findMatchingBlock(blocks: AnswerBlockLike[], patterns: string[]) {
  return blocks.find((block) => {
    const key = blockKey(block);
    return patterns.some((pattern) => key.includes(pattern));
  });
}

export function deriveCanonicalReportSections(
  packet: PacketLike,
  options?: { mode?: ReportArtifactMode },
): CanonicalSectionDraft[] {
  const mode = options?.mode ?? "report";
  const titles = getArtifactSectionTitles(mode);
  const blocks = normalizeBlocks(packet.answerBlocks);
  const sourceRefs = normalizeSourceRefs(packet.sourceRefs);
  const variables = normalizeVariables(packet.variables);
  const changes = normalizeChanges(packet.changes);
  const risks = normalizeRisks(packet.risks);
  const interventions = normalizeInterventions(packet.interventions);
  const nextQuestions = Array.isArray(packet.nextQuestions)
    ? packet.nextQuestions.map((item) => normalizeText(item)).filter((item): item is string => Boolean(item))
    : [];
  const topSourceIds = sourceRefs
    .map((source) => (typeof source.id === "string" ? source.id.trim() : ""))
    .filter((item): item is string => item.length > 0)
    .slice(0, 2);

  const summaryBlock =
    findMatchingBlock(blocks, ["what it is", "bottom line", "executive summary", "answer:block:summary", "answer_summary"]) ??
    blocks[0];
  const whyBlock = findMatchingBlock(blocks, [
    "why it matters",
    "key facts",
    "signal readout",
    "competitive frame",
    "why this team matters",
    "answer:block:why",
    "answer:block:signals",
    "answer:block:key_facts",
  ]);
  const missingBlock = findMatchingBlock(blocks, [
    "what is missing",
    "risks",
    "diligence flags",
    "diligence questions",
    "answer:block:gaps",
    "answer:block:risks",
    "answer:block:diligence_questions",
  ]);
  const nextBlock = findMatchingBlock(blocks, [
    "what to do next",
    "recommended next move",
    "answer:block:next",
  ]);

  const firstVariable = variables[0];
  const firstChange = changes[0];
  const firstRisk = risks[0];
  const firstIntervention = interventions[0];

  return [
    {
      id: "what-it-is",
      title: titles["what-it-is"],
      body: normalizeText(summaryBlock?.text) ?? normalizeText(packet.answer),
      sourceRefIds: unique([
        ...normalizeSourceRefIds(summaryBlock?.sourceRefIds),
        ...topSourceIds,
      ]),
    },
    {
      id: "why-it-matters",
      title: titles["why-it-matters"],
      body:
        normalizeText(whyBlock?.text) ??
        normalizeText(firstChange?.description) ??
        normalizeText(firstVariable?.name),
      sourceRefIds: unique([
        ...normalizeSourceRefIds(whyBlock?.sourceRefIds),
        ...normalizeSourceRefIds(firstChange?.sourceRefIds),
        ...normalizeSourceRefIds(firstVariable?.sourceRefIds),
        sourceIdFromIndex(sourceRefs, firstChange?.sourceIdx),
        sourceIdFromIndex(sourceRefs, firstVariable?.sourceIdx),
      ]),
    },
    {
      id: "what-is-missing",
      title: titles["what-is-missing"],
      body:
        normalizeText(missingBlock?.text) ??
        normalizeText(firstRisk?.description) ??
        normalizeText(firstRisk?.title) ??
        nextQuestions[0] ??
        normalizeText(packet.uncertaintyBoundary),
      sourceRefIds: unique([
        ...normalizeSourceRefIds(missingBlock?.sourceRefIds),
        ...normalizeSourceRefIds(firstRisk?.sourceRefIds),
        sourceIdFromIndex(sourceRefs, firstRisk?.sourceIdx),
      ]),
    },
    {
      id: "what-to-do-next",
      title: titles["what-to-do-next"],
      body:
        normalizeText(nextBlock?.text) ??
        normalizeText(packet.recommendedNextAction) ??
        normalizeText(firstIntervention?.action) ??
        nextQuestions[0],
      sourceRefIds: unique([
        ...normalizeSourceRefIds(nextBlock?.sourceRefIds),
        ...normalizeSourceRefIds(firstIntervention?.sourceRefIds),
        ...topSourceIds,
      ]),
    },
  ];
}
