import type { TraceStep } from "./SearchTrace";
import type {
  LensId,
  ProofStatus,
  ResultAnswerBlock,
  ResultClaimRef,
  ResultExplorationMemory,
  ResultGraphEdge,
  ResultGraphNode,
  ResultGraphSummary,
  ResultPacket,
  ResultSourceRef,
} from "./searchTypes";
import { PUBLIC_LENS_PERSONA_MAP } from "./searchTypes";

export interface ProofReadyResultPacket extends ResultPacket {
  packetId: string;
  packetType: string;
  canonicalEntity: string;
  sourceRefs: ResultSourceRef[];
  claimRefs: ResultClaimRef[];
  answerBlocks: ResultAnswerBlock[];
  explorationMemory: ResultExplorationMemory;
  graphSummary: ResultGraphSummary;
  proofStatus: ProofStatus;
  uncertaintyBoundary: string;
  recommendedNextAction: string;
  graphNodes: ResultGraphNode[];
  graphEdges: ResultGraphEdge[];
}

export interface ProgressStage {
  id:
    | "intent"
    | "context"
    | "sources"
    | "entities"
    | "claims"
    | "contradictions"
    | "answer";
  label: string;
  countLabel: string;
  status: "pending" | "running" | "completed" | "error";
}

export interface LiveProgressModel {
  personaId: string;
  proofStatus: ProofStatus;
  stages: ProgressStage[];
  counts: ResultExplorationMemory;
  graphSummary: ResultGraphSummary;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function hashString(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36);
}

function buildPacketId(packet: ResultPacket): string {
  return (
    packet.packetId ??
    `pkt-${slugify(packet.entityName || "nodebench")}-${hashString(
      `${packet.query}|${packet.answer}|${packet.sourceCount}`,
    )}`
  );
}

function inferDomain(href?: string): string | undefined {
  if (!href) return undefined;
  try {
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

function normalizeSource(
  source: ResultSourceRef,
  index: number,
  packet: ResultPacket,
): ResultSourceRef {
  const id =
    source.id ||
    `source:${slugify(packet.entityName || "entity")}:${hashString(
      `${source.label}|${source.href}|${index}`,
    )}`;
  return {
    id,
    label: source.label || `Source ${index + 1}`,
    href: source.href,
    type: source.type ?? (source.href ? "web" : "doc"),
    status: source.status ?? "cited",
    title: source.title ?? source.label ?? `Source ${index + 1}`,
    domain: source.domain ?? inferDomain(source.href) ?? "local memory",
    publishedAt: source.publishedAt,
    thumbnailUrl: source.thumbnailUrl,
    excerpt:
      source.excerpt ??
      `${packet.entityName} evidence item ${index + 1} retained during the final answer assembly.`,
    confidence: source.confidence ?? Math.max(55, packet.confidence - index * 4),
  };
}

function buildSyntheticSources(packet: ResultPacket): ResultSourceRef[] {
  const sources: ResultSourceRef[] = [];
  const pushSource = (label: string, excerpt: string, status: ResultSourceRef["status"] = "cited") => {
    sources.push({
      id: `source:${slugify(packet.entityName || "entity")}:${hashString(
        `${label}|${excerpt}|${sources.length}`,
      )}`,
      label,
      title: label,
      type: "doc",
      status,
      domain: "nodebench memory",
      excerpt,
      confidence: Math.max(55, packet.confidence - sources.length * 3),
    });
  };

  if (packet.changes?.length) {
    packet.changes.forEach((change, index) => {
      pushSource(
        `${packet.entityName} change ${index + 1}`,
        change.description,
      );
    });
  }
  if (packet.risks?.length) {
    packet.risks.forEach((risk, index) => {
      pushSource(
        `${packet.entityName} contradiction ${index + 1}`,
        risk.description,
      );
    });
  }
  if (packet.comparables?.length) {
    packet.comparables.forEach((comparable) => {
      pushSource(
        comparable.name,
        comparable.note,
      );
    });
  }
  if (!sources.length) {
    for (let index = 0; index < Math.max(1, Math.min(packet.sourceCount || 1, 4)); index += 1) {
      pushSource(
        `${packet.entityName} source ${index + 1}`,
        packet.answer,
      );
    }
  }
  return sources.slice(0, Math.max(1, Math.min(packet.sourceCount || sources.length, 8)));
}

function normalizeSources(packet: ResultPacket): ResultSourceRef[] {
  const sources = packet.sourceRefs?.length ? packet.sourceRefs : buildSyntheticSources(packet);
  return sources.map((source, index) => normalizeSource(source, index, packet));
}

function buildClaimRefs(
  packet: ResultPacket,
  sources: ResultSourceRef[],
): ResultClaimRef[] {
  if (packet.claimRefs?.length) {
    return packet.claimRefs.map((claim, index) => ({
      ...claim,
      id: claim.id || `claim:${hashString(`${claim.text}|${index}`)}`,
      sourceRefIds:
        claim.sourceRefIds?.length
          ? claim.sourceRefIds
          : sources.slice(0, 1).map((source) => source.id),
      answerBlockIds: claim.answerBlockIds ?? [],
      status: claim.status ?? "retained",
    }));
  }

  const claims: ResultClaimRef[] = [];
  packet.variables.forEach((variable, index) => {
    claims.push({
      id: `claim:${slugify(variable.name)}:${index}`,
      text: variable.name,
      sourceRefIds: sources.slice(index % Math.max(sources.length, 1), (index % Math.max(sources.length, 1)) + 1).map((source) => source.id),
      answerBlockIds: [],
      status: "retained",
    });
  });
  packet.risks?.forEach((risk, index) => {
    claims.push({
      id: `claim:risk:${slugify(risk.title)}:${index}`,
      text: risk.title,
      sourceRefIds: sources.slice(index % Math.max(sources.length, 1), (index % Math.max(sources.length, 1)) + 1).map((source) => source.id),
      answerBlockIds: [],
      status: "contradicted",
    });
  });
  packet.changes?.forEach((change, index) => {
    claims.push({
      id: `claim:change:${index}`,
      text: change.description,
      sourceRefIds: sources.slice(index % Math.max(sources.length, 1), (index % Math.max(sources.length, 1)) + 1).map((source) => source.id),
      answerBlockIds: [],
      status: "retained",
    });
  });
  return claims;
}

function blockSourcesByIndex(
  sources: ResultSourceRef[],
  start: number,
  size = 2,
): string[] {
  if (!sources.length) return [];
  const refs: string[] = [];
  for (let offset = 0; offset < size; offset += 1) {
    refs.push(sources[(start + offset) % sources.length].id);
  }
  return Array.from(new Set(refs));
}

function buildAnswerBlocks(
  packet: ResultPacket,
  sources: ResultSourceRef[],
  claims: ResultClaimRef[],
): ResultAnswerBlock[] {
  if (packet.answerBlocks?.length) {
    return packet.answerBlocks.map((block, index) => ({
      ...block,
      id: block.id || `answer_block:${index}`,
      sourceRefIds: block.sourceRefIds?.length ? block.sourceRefIds : blockSourcesByIndex(sources, index),
      claimIds:
        block.claimIds?.length
          ? block.claimIds
          : claims.slice(index, index + 2).map((claim) => claim.id),
      status: block.status ?? "cited",
    }));
  }

  const blocks: ResultAnswerBlock[] = [
    {
      id: "answer_block:summary",
      title: "Executive Summary",
      text: packet.answer,
      sourceRefIds: blockSourcesByIndex(sources, 0, 2),
      claimIds: claims.slice(0, 2).map((claim) => claim.id),
      status: "cited",
    },
  ];
  if (packet.changes?.length) {
    blocks.push({
      id: "answer_block:changes",
      title: "What Changed",
      text: packet.changes.map((change) => change.description).join(" "),
      sourceRefIds: blockSourcesByIndex(sources, 1, 2),
      claimIds: claims
        .filter((claim) => packet.changes?.some((change) => change.description === claim.text))
        .map((claim) => claim.id),
      status: "cited",
    });
  }
  if (packet.risks?.length) {
    blocks.push({
      id: "answer_block:risks",
      title: "Contradictions",
      text: packet.risks.map((risk) => `${risk.title}: ${risk.description}`).join(" "),
      sourceRefIds: blockSourcesByIndex(sources, 2, 2),
      claimIds: claims
        .filter((claim) => packet.risks?.some((risk) => risk.title === claim.text))
        .map((claim) => claim.id),
      status: "cited",
    });
  }
  if (packet.interventions?.length || packet.recommendedNextAction) {
    blocks.push({
      id: "answer_block:actions",
      title: "Recommended Next Move",
      text:
        packet.recommendedNextAction ??
        packet.interventions?.map((intervention) => intervention.action).join(" ") ??
        "",
      sourceRefIds: blockSourcesByIndex(sources, 0, 1),
      claimIds: claims.slice(-2).map((claim) => claim.id),
      status: sources.length ? "cited" : "uncertain",
    });
  }
  return blocks;
}

function buildExplorationMemory(
  packet: ResultPacket,
  sources: ResultSourceRef[],
  claims: ResultClaimRef[],
  answerBlocks: ResultAnswerBlock[],
): ResultExplorationMemory {
  if (packet.explorationMemory) return packet.explorationMemory;
  const citedSourceCount = sources.filter((source) => source.status === "cited").length;
  const discardedSourceCount = sources.filter((source) => source.status === "discarded").length;
  return {
    exploredSourceCount: Math.max(packet.sourceCount || sources.length, sources.length),
    citedSourceCount,
    discardedSourceCount,
    entityCount: Math.max(1, packet.comparables?.length ?? 1),
    claimCount: claims.length || answerBlocks.length,
    contradictionCount: packet.risks?.length ?? 0,
  };
}

function buildGraphNodes(
  packet: ResultPacket,
  lens: LensId,
  sources: ResultSourceRef[],
  claims: ResultClaimRef[],
  answerBlocks: ResultAnswerBlock[],
  proofStatus: ProofStatus,
): ResultGraphNode[] {
  const personaId = PUBLIC_LENS_PERSONA_MAP[lens];
  const nodes: ResultGraphNode[] = [
    { id: "node:query", kind: "query", label: packet.query, status: proofStatus },
    { id: "node:lens", kind: "lens", label: lens, status: proofStatus },
    { id: "node:persona", kind: "persona", label: personaId, status: proofStatus },
    { id: "node:entity", kind: "entity", label: packet.canonicalEntity || packet.entityName, status: proofStatus },
  ];
  sources.forEach((source) => {
    nodes.push({
      id: source.id,
      kind: "source",
      label: source.label,
      status:
        source.status === "discarded"
          ? "incomplete"
          : source.status === "cited"
            ? "verified"
            : "provisional",
      confidence: source.confidence,
    });
  });
  claims.forEach((claim) => {
    nodes.push({
      id: claim.id,
      kind: claim.status === "contradicted" ? "contradiction" : "claim",
      label: claim.text,
      status: claim.status === "discarded" ? "incomplete" : "verified",
    });
  });
  answerBlocks.forEach((block) => {
    nodes.push({
      id: block.id,
      kind: "answer_block",
      label: block.title,
      status: block.status === "cited" ? "verified" : "provisional",
    });
  });
  if (packet.recommendedNextAction || packet.nextQuestions?.length) {
    nodes.push({
      id: "node:follow_up",
      kind: "follow_up",
      label: packet.recommendedNextAction ?? packet.nextQuestions?.[0] ?? "Follow up",
      status: proofStatus,
    });
  }
  return nodes;
}

function buildGraphEdges(
  sources: ResultSourceRef[],
  claims: ResultClaimRef[],
  answerBlocks: ResultAnswerBlock[],
  hasFollowUp: boolean,
): ResultGraphEdge[] {
  const edges: ResultGraphEdge[] = [
    { fromId: "node:query", toId: "node:lens", kind: "selected" },
    { fromId: "node:lens", toId: "node:persona", kind: "selected" },
    { fromId: "node:persona", toId: "node:entity", kind: "about" },
  ];
  sources.forEach((source) => {
    edges.push({ fromId: "node:query", toId: source.id, kind: "explored" });
  });
  claims.forEach((claim) => {
    claim.sourceRefIds.forEach((sourceRefId) => {
      edges.push({
        fromId: sourceRefId,
        toId: claim.id,
        kind: claim.status === "contradicted" ? "conflicts_with" : "supports",
      });
    });
  });
  answerBlocks.forEach((block) => {
    block.claimIds.forEach((claimId) => {
      edges.push({ fromId: claimId, toId: block.id, kind: "used_in" });
    });
  });
  if (hasFollowUp) {
    answerBlocks.forEach((block) => {
      edges.push({ fromId: block.id, toId: "node:follow_up", kind: "suggests" });
    });
  }
  return edges;
}

function inferProofStatus(
  packet: ResultPacket,
  sources: ResultSourceRef[],
  answerBlocks: ResultAnswerBlock[],
): ProofStatus {
  if (!sources.length) return "incomplete";
  const allCited = answerBlocks.every(
    (block) => block.status !== "cited" || block.sourceRefIds.length > 0,
  );
  if (!allCited) return "incomplete";
  if (packet.risks?.length) return "drifting";
  if (sources.some((source) => source.status === "cited")) return "verified";
  return "provisional";
}

function buildGraphSummary(
  packet: ResultPacket,
  memory: ResultExplorationMemory,
  nodeCount: number,
  edgeCount: number,
): ResultGraphSummary {
  return (
    packet.graphSummary ?? {
      nodeCount,
      edgeCount,
      clusterCount: Math.max(1, Math.min(4, memory.entityCount + (memory.contradictionCount ? 1 : 0))),
      primaryPath: [
        "Query received",
        `${memory.exploredSourceCount} sources explored`,
        `${memory.claimCount} claims retained`,
        `${memory.contradictionCount} contradictions tracked`,
        `${memory.citedSourceCount} cited sources`,
      ],
    }
  );
}

export function ensureProofPacket(
  packet: ResultPacket,
  lens: LensId = "founder",
): ProofReadyResultPacket {
  const sources = normalizeSources(packet);
  const claims = buildClaimRefs(packet, sources);
  const answerBlocks = buildAnswerBlocks(packet, sources, claims);
  const memory = buildExplorationMemory(packet, sources, claims, answerBlocks);
  const proofStatus = packet.proofStatus ?? inferProofStatus(packet, sources, answerBlocks);
  const graphNodes =
    packet.graphNodes ??
    buildGraphNodes(packet, lens, sources, claims, answerBlocks, proofStatus);
  const graphEdges =
    packet.graphEdges ??
    buildGraphEdges(
      sources,
      claims,
      answerBlocks,
      Boolean(packet.recommendedNextAction || packet.nextQuestions?.length),
    );
  const graphSummary = buildGraphSummary(packet, memory, graphNodes.length, graphEdges.length);

  const enriched: ProofReadyResultPacket = {
    ...packet,
    packetId: buildPacketId(packet),
    packetType: packet.packetType ?? "founder_packet",
    canonicalEntity: packet.canonicalEntity ?? packet.entityName,
    sourceRefs: sources,
    claimRefs: claims,
    answerBlocks,
    explorationMemory: memory,
    graphSummary,
    proofStatus,
    uncertaintyBoundary:
      packet.uncertaintyBoundary ??
      "This answer is grounded in currently retained evidence and may omit unresolved or unavailable private context.",
    recommendedNextAction:
      packet.recommendedNextAction ??
      packet.interventions?.[0]?.action ??
      packet.nextQuestions?.[0] ??
      "Review the strongest contradiction and decide what to verify next.",
    graphNodes,
    graphEdges,
  };

  const answerBlockIds = new Set(enriched.answerBlocks.map((block) => block.id));
  enriched.claimRefs = enriched.claimRefs.map((claim) => ({
    ...claim,
    answerBlockIds: claim.answerBlockIds.filter((id) => answerBlockIds.has(id)),
  }));
  return enriched;
}

function stageStatusFromTrace(trace: TraceStep[], matcher: (step: TraceStep) => boolean): ProgressStage["status"] {
  const matching = trace.filter(matcher);
  if (!matching.length) return "pending";
  if (matching.some((step) => step.status === "error")) return "error";
  if (matching.some((step) => step.isRunning)) return "running";
  return "completed";
}

export function buildLiveProgressModel(args: {
  query: string;
  lens: LensId;
  trace: TraceStep[];
  packet?: ResultPacket | null;
}): LiveProgressModel {
  const packet = args.packet ? ensureProofPacket(args.packet, args.lens) : null;
  const counts =
    packet?.explorationMemory ?? {
      exploredSourceCount: Math.max(
        0,
        args.trace.filter(
          (step) =>
            step.step === "tool_call" &&
            Boolean(step.tool?.includes("search") || step.tool?.includes("recon")),
        ).length,
      ),
      citedSourceCount: 0,
      discardedSourceCount: 0,
      entityCount: stageStatusFromTrace(args.trace, (step) => step.step === "llm_extract") !== "pending" ? 1 : 0,
      claimCount: stageStatusFromTrace(args.trace, (step) => step.step === "judge" || step.step === "assemble_response") === "completed" ? 1 : 0,
      contradictionCount: 0,
    };

  const stages: ProgressStage[] = [
    {
      id: "intent",
      label: "Intent parsed",
      countLabel: args.query ? "1 query" : "Waiting",
      status: stageStatusFromTrace(args.trace, (step) => step.step === "classify_query"),
    },
    {
      id: "context",
      label: "Context loaded",
      countLabel: stageStatusFromTrace(args.trace, (step) => step.step === "build_context_bundle") === "pending" ? "Pending" : "1 bundle",
      status: stageStatusFromTrace(args.trace, (step) => step.step === "build_context_bundle"),
    },
    {
      id: "sources",
      label: "Sources explored",
      countLabel: `${counts.exploredSourceCount} explored`,
      status: stageStatusFromTrace(
        args.trace,
        (step) =>
          step.step === "tool_call" &&
          Boolean(step.tool?.includes("search") || step.tool?.includes("recon")),
      ),
    },
    {
      id: "entities",
      label: "Entities extracted",
      countLabel: `${counts.entityCount} retained`,
      status: stageStatusFromTrace(
        args.trace,
        (step) => step.step === "llm_extract" || step.step === "tool_call",
      ),
    },
    {
      id: "claims",
      label: "Claims retained",
      countLabel: `${counts.claimCount} claims`,
      status: stageStatusFromTrace(
        args.trace,
        (step) => step.step === "judge" || step.step === "assemble_response",
      ),
    },
    {
      id: "contradictions",
      label: "Contradictions",
      countLabel: `${counts.contradictionCount} tracked`,
      status:
        counts.contradictionCount > 0
          ? "completed"
          : stageStatusFromTrace(args.trace, (step) => step.step === "judge"),
    },
    {
      id: "answer",
      label: "Answer assembling",
      countLabel: packet ? `${packet.answerBlocks.length} blocks` : "In progress",
      status:
        packet ||
        stageStatusFromTrace(args.trace, (step) => step.step === "assemble_response") ===
          "completed"
          ? "completed"
          : stageStatusFromTrace(args.trace, (step) => step.step === "assemble_response"),
    },
  ];

  return {
    personaId: PUBLIC_LENS_PERSONA_MAP[args.lens],
    proofStatus: packet?.proofStatus ?? "loading",
    stages,
    counts,
    graphSummary:
      packet?.graphSummary ?? {
        nodeCount: 2 + counts.exploredSourceCount + counts.claimCount,
        edgeCount: 1 + counts.exploredSourceCount + counts.claimCount,
        clusterCount: Math.max(1, counts.entityCount),
        primaryPath: [
          "Query received",
          counts.exploredSourceCount
            ? `${counts.exploredSourceCount} live sources`
            : "Searching",
          counts.claimCount ? `${counts.claimCount} retained claims` : "Drafting claims",
        ],
      },
  };
}
