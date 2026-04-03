/**
 * search.ts — Search API route for the NodeBench AI App.
 *
 * POST /search
 *   Body: { query: string, lens?: string, daysBack?: number }
 *   Returns: ResultPacket-compatible JSON
 *
 * Routes queries to the appropriate MCP tool:
 *   - "weekly reset" / "founder reset" → founder_local_weekly_reset
 *   - "important change" → founder_local_synthesize (important_change)
 *   - "pre-delegation" → founder_local_synthesize (pre_delegation)
 *   - Company name detected → run_recon + local synthesis
 *   - Fallback → founder_local_gather context dump
 *
 * This is the bridge between the browser search canvas and the MCP tool layer.
 */

import { Request, Response, Router } from "express";
import { getDb, genId } from "../../packages/mcp-local/src/db.js";
import { initBehaviorTables, logSession, logQuery, logToolCall, findSimilarPriorQuery } from "../../packages/mcp-local/src/profiler/behaviorStore.js";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import { generatePlan, executeHarness, synthesizeResults } from "../agentHarness.js";
import type { McpTool } from "../../packages/mcp-local/src/types.js";
import {
  detectFounderCompanyMode,
  getFounderRolePacketDefault,
} from "../../packages/mcp-local/src/tools/founderOperatingModel.js";
import {
  getSyncBridgeStatus,
  linkDurableObjects,
  recordExecutionReceipt,
  recordLocalArtifact,
  recordLocalOutcome,
  upsertDurableObject,
} from "../../packages/mcp-local/src/sync/store.js";
import { buildContextBundle } from "../../packages/mcp-local/src/tools/contextInjection.js";

const SEARCH_SOURCE = "search_api";
const CONTROL_PLANE_VIEW_ID = "view:control-plane";
const LENS_PERSONA_MAP: Record<string, string> = {
  founder: "FOUNDER_STRATEGY",
  investor: "EARLY_STAGE_VC",
  banker: "JPM_STARTUP_BANKER",
  ceo: "CORP_DEV",
  legal: "LEGAL_COMPLIANCE",
  student: "SIMPLIFIED_RESEARCH",
};

const GENERIC_WORKSPACE_LABELS = new Set(["your workspace", "workspace"]);

function extractBrandPrefix(value?: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim().replace(/^#\s*/, "");
  if (!trimmed) return undefined;
  return trimmed.split(/\s+[—–-]\s+/)[0]?.trim() || undefined;
}

function normalizeDisplayName(value?: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const lower = trimmed.toLowerCase();
  if (GENERIC_WORKSPACE_LABELS.has(lower)) return undefined;
  if (["nodebench", "nodebench ai", "nodebench-ai", "nodebench mcp", "nodebench-mcp", "nodebench_mcp"].includes(lower)) {
    return "NodeBench";
  }
  return trimmed;
}

function toFounderRole(lens: string): "founder" | "banker" | "ceo" | "investor" | "student" | "legal" {
  if (lens === "banker" || lens === "ceo" || lens === "investor" || lens === "student" || lens === "legal") {
    return lens;
  }
  return "founder";
}

function normalizeWorkspaceName(value?: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  return normalizeDisplayName(value);
}

function inferOwnCompanyName(result: any): string | undefined {
  return normalizeWorkspaceName(result?.identity?.projectName)
    ?? normalizeWorkspaceName(result?.publicSurfaces?.indexHtmlSiteName)
    ?? normalizeWorkspaceName(extractBrandPrefix(result?.publicSurfaces?.indexHtmlTitle))
    ?? normalizeWorkspaceName(result?.canonicalEntity?.name)
    ?? normalizeWorkspaceName(result?.companyReadinessPacket?.identity?.companyName)
    ?? normalizeWorkspaceName(result?.companyNamingPack?.recommendedName)
    ?? normalizeWorkspaceName(result?.rawPacket?.company?.name)
    ?? normalizeWorkspaceName(result?.localContext?.company?.name)
    ?? normalizeWorkspaceName(result?.identity?.packageName);
}

function resolveCompanyMode(args: {
  query: string;
  lens: string;
  classification: string;
  result: any;
}): "own_company" | "external_company" | "mixed_comparison" {
  const hasPrivateContext = args.lens === "founder"
    && ["weekly_reset", "pre_delegation", "important_change", "founder_progression", "general"].includes(args.classification);
  return detectFounderCompanyMode({
    query: args.query,
    canonicalEntity: inferOwnCompanyName(args.result) ?? args.result?.canonicalEntity?.name,
    hasPrivateContext,
  });
}

function resolveEffectiveClassification(args: {
  query: string;
  lens: string;
  classification: string;
  result: any;
}): string {
  if (args.classification !== "general") return args.classification;
  const companyMode = resolveCompanyMode(args);
  if (args.lens === "founder" && args.classification === "general") {
    if (companyMode === "own_company") return "founder_progression";
    if (companyMode === "mixed_comparison") return "mixed_comparison";
  }
  return args.classification;
}

function resolveEffectivePacketType(args: {
  lens: string;
  classification: string;
  result: any;
}): string {
  const explicitPacketType = typeof args.result?.packetType === "string" ? args.result.packetType : "";
  if (explicitPacketType && explicitPacketType !== "general_packet") return explicitPacketType;
  if (args.classification !== "general") return `${args.classification}_packet`;
  const routedPacketType = args.result?.operatingModel?.packetRouter?.packetType;
  if (typeof routedPacketType === "string" && routedPacketType.length > 0) return routedPacketType;
  return getFounderRolePacketDefault(toFounderRole(args.lens)).defaultPacketType;
}

function normalizeFounderIdentity(args: {
  query: string;
  lens: string;
  classification: string;
  result: any;
}): { classification: string; packetType: string; entityName?: string } {
  const classification = resolveEffectiveClassification(args);
  const packetType = resolveEffectivePacketType({
    lens: args.lens,
    classification,
    result: args.result,
  });
  const companyMode = resolveCompanyMode({ ...args, classification });
  const entityName = companyMode === "own_company"
    ? inferOwnCompanyName(args.result) ?? "Your Company"
    : inferOwnCompanyName(args.result);
  return { classification, packetType, entityName };
}

function normalizeOwnCompanyFounderPayload(args: {
  query: string;
  lens: string;
  classification: string;
  result: any;
}): any {
  const normalizedIdentity = normalizeFounderIdentity(args);
  const companyMode = resolveCompanyMode({
    query: args.query,
    lens: args.lens,
    classification: normalizedIdentity.classification,
    result: args.result,
  });
  const entityName = normalizedIdentity.entityName;
  if (companyMode !== "own_company" || !entityName) return args.result;

  const namingPack = typeof args.result?.companyNamingPack === "object" ? args.result.companyNamingPack : undefined;
  const companyReadinessPacket = typeof args.result?.companyReadinessPacket === "object" ? args.result.companyReadinessPacket : undefined;
  const shareableArtifacts = Array.isArray(args.result?.shareableArtifacts)
    ? args.result.shareableArtifacts.map((artifact: any) => ({
        ...artifact,
        payload:
          artifact?.payload && typeof artifact.payload === "object"
            ? { ...artifact.payload, company: entityName }
            : artifact?.payload,
      }))
    : args.result?.shareableArtifacts;

  return {
    ...args.result,
    canonicalEntity: {
      ...(typeof args.result?.canonicalEntity === "object" ? args.result.canonicalEntity : {}),
      name: entityName,
    },
    companyNamingPack: namingPack
      ? {
          ...namingPack,
          recommendedName: entityName,
          suggestedNames: Array.from(new Set([entityName, ...(Array.isArray(namingPack.suggestedNames) ? namingPack.suggestedNames : [])])),
          starterProfile:
            namingPack.starterProfile && typeof namingPack.starterProfile === "object"
              ? { ...namingPack.starterProfile, companyName: entityName }
              : namingPack.starterProfile,
        }
      : namingPack,
    companyReadinessPacket: companyReadinessPacket
      ? {
          ...companyReadinessPacket,
          identity:
            companyReadinessPacket.identity && typeof companyReadinessPacket.identity === "object"
              ? { ...companyReadinessPacket.identity, companyName: entityName }
              : companyReadinessPacket.identity,
        }
      : companyReadinessPacket,
    shareableArtifacts,
  };
}

type SearchTraceEntry = {
  step: string;
  tool?: string;
  startMs: number;
  endMs?: number;
  status: "ok" | "error" | "skip";
  detail?: string;
};

type SearchHistoryItem = {
  runId: string;
  traceId: string;
  packetId: string;
  outcomeId: string;
  query: string;
  lens: string;
  persona: string;
  classification: string;
  entityName: string;
  packet: Record<string, unknown>;
  trace: Array<Record<string, unknown>>;
  latencyMs: number;
  proofStatus: string;
  sourceCount: number;
  updatedAt: string;
};

function parseJsonValue<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function trimText(value: unknown, max = 220): string {
  if (typeof value !== "string") return "";
  return value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;
}

function toDomain(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

function dedupeBy<T>(items: T[], keyFn: (item: T) => string): T[] {
  const seen = new Set<string>();
  const deduped: T[] = [];
  for (const item of items) {
    const key = keyFn(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }
  return deduped;
}

function normalizeSourceRefs(result: any): any[] {
  if (Array.isArray(result?.sourceRefs) && result.sourceRefs.length > 0) {
    return dedupeBy(result.sourceRefs, (source: any) => String(source.id ?? source.href ?? source.label ?? ""));
  }

  const rawSources = [
    ...(Array.isArray(result?.sourcesUsed) ? result.sourcesUsed : []),
    ...(Array.isArray(result?.webSources) ? result.webSources : []),
  ];

  const mapped = rawSources.map((source: any, index: number) => {
    const href = source.url ?? source.href ?? undefined;
    const title = source.title ?? source.label ?? source.name ?? href ?? `Source ${index + 1}`;
    return {
      id: source.id ?? `source:${index + 1}`,
      label: title,
      href,
      type: source.type ?? "web",
      status: source.status ?? "cited",
      title,
      domain: source.domain ?? toDomain(href),
      publishedAt: source.publishedAtIso ?? source.publishedAt ?? null,
      thumbnailUrl: source.thumbnailUrl,
      excerpt: trimText(source.excerpt ?? source.snippet ?? source.summary ?? source.content, 260),
      confidence: typeof source.confidence === "number" ? source.confidence : undefined,
    };
  });

  return dedupeBy(mapped, (source) => String(source.href ?? source.label ?? source.id));
}

function normalizeClaimRefs(result: any, sourceRefs: any[]): any[] {
  if (Array.isArray(result?.claimRefs) && result.claimRefs.length > 0) {
    return result.claimRefs;
  }

  const defaultSourceIds = sourceRefs.slice(0, 3).map((source) => source.id);
  const claims: any[] = [];

  for (const signal of Array.isArray(result?.signals) ? result.signals : []) {
    claims.push({
      id: `claim:signal:${claims.length + 1}`,
      text: signal.name ?? signal.title ?? String(signal),
      sourceRefIds: defaultSourceIds,
      answerBlockIds: ["answer:block:summary"],
      status: "retained",
    });
  }

  for (const change of Array.isArray(result?.whatChanged) ? result.whatChanged : []) {
    claims.push({
      id: `claim:change:${claims.length + 1}`,
      text: change.description ?? String(change),
      sourceRefIds: defaultSourceIds,
      answerBlockIds: ["answer:block:changes"],
      status: "retained",
    });
  }

  for (const contradiction of Array.isArray(result?.contradictions) ? result.contradictions : []) {
    claims.push({
      id: `claim:risk:${claims.length + 1}`,
      text: contradiction.claim ?? contradiction.title ?? String(contradiction),
      sourceRefIds: defaultSourceIds,
      answerBlockIds: ["answer:block:risks"],
      status: "contradicted",
    });
  }

  return claims.slice(0, 12);
}

function blockStatus(sourceRefIds: string[], explicitUncertainty?: boolean): "cited" | "uncertain" | "draft" {
  if (sourceRefIds.length > 0) return "cited";
  if (explicitUncertainty) return "uncertain";
  return "draft";
}

function normalizeAnswerBlocks(result: any, sourceRefs: any[], claimRefs: any[]): any[] {
  if (Array.isArray(result?.answerBlocks) && result.answerBlocks.length > 0) {
    return result.answerBlocks;
  }

  const citedSourceIds = sourceRefs.slice(0, 4).map((source) => source.id);
  const sourceBacked = citedSourceIds.length > 0;
  const blocks: any[] = [];

  const summaryText = trimText(result?.canonicalEntity?.canonicalMission ?? result?.summary ?? "", 420);
  if (summaryText) {
    blocks.push({
      id: "answer:block:summary",
      title: "Bottom line",
      text: summaryText,
      sourceRefIds: citedSourceIds,
      claimIds: claimRefs.filter((claim) => claim.answerBlockIds.includes("answer:block:summary")).map((claim) => claim.id),
      status: blockStatus(citedSourceIds, !sourceBacked),
    });
  }

  const changesText = (Array.isArray(result?.whatChanged) ? result.whatChanged : [])
    .slice(0, 3)
    .map((change: any) => `• ${change.description ?? String(change)}`)
    .join("\n");
  if (changesText) {
    blocks.push({
      id: "answer:block:changes",
      title: "What changed",
      text: changesText,
      sourceRefIds: citedSourceIds,
      claimIds: claimRefs.filter((claim) => claim.answerBlockIds.includes("answer:block:changes")).map((claim) => claim.id),
      status: blockStatus(citedSourceIds, !sourceBacked),
    });
  }

  const risksText = (Array.isArray(result?.contradictions) ? result.contradictions : [])
    .slice(0, 3)
    .map((item: any) => `• ${item.claim ?? item.title ?? String(item)}${item.evidence ? `: ${item.evidence}` : ""}`)
    .join("\n");
  if (risksText) {
    blocks.push({
      id: "answer:block:risks",
      title: "Risks and contradictions",
      text: risksText,
      sourceRefIds: citedSourceIds,
      claimIds: claimRefs.filter((claim) => claim.answerBlockIds.includes("answer:block:risks")).map((claim) => claim.id),
      status: blockStatus(citedSourceIds, true),
    });
  }

  const nextAction = (Array.isArray(result?.nextActions) ? result.nextActions : [])[0];
  if (nextAction) {
    blocks.push({
      id: "answer:block:next",
      title: "Recommended next move",
      text: nextAction.action ?? String(nextAction),
      sourceRefIds: citedSourceIds,
      claimIds: [],
      status: blockStatus(citedSourceIds, true),
    });
  }

  return blocks;
}

function buildExplorationMemory(result: any, sourceRefs: any[], claimRefs: any[]): Record<string, number> {
  if (result?.explorationMemory) return result.explorationMemory;
  const contradictionCount = Array.isArray(result?.contradictions) ? result.contradictions.length : 0;
  const exploredSourceCount = Math.max(sourceRefs.length, contradictionCount > 0 ? 3 : sourceRefs.length);
  const citedSourceCount = sourceRefs.filter((source) => source.status !== "discarded").length;
  return {
    exploredSourceCount,
    citedSourceCount,
    discardedSourceCount: Math.max(0, exploredSourceCount - citedSourceCount),
    entityCount: result?.canonicalEntity?.name ? 1 : 0,
    claimCount: claimRefs.length,
    contradictionCount,
  };
}

function includesAny(value: string, terms: string[]): boolean {
  const normalized = value.toLowerCase();
  return terms.some((term) => normalized.includes(term));
}

function buildStrategicAngles(args: {
  query: string;
  lens: string;
  result: any;
  sourceRefs: any[];
}): Array<Record<string, unknown>> {
  if (Array.isArray(args.result?.strategicAngles) && args.result.strategicAngles.length > 0) {
    return args.result.strategicAngles;
  }

  const queryText = `${args.query} ${args.result?.canonicalEntity?.canonicalMission ?? ""}`.toLowerCase();
  const signalText = (args.result?.signals ?? []).map((signal: any) => signal.name ?? signal.title ?? String(signal)).join(" ").toLowerCase();
  const evidenceRefIds = args.sourceRefs.slice(0, 2).map((source) => source.id);
  const sourceRich = args.sourceRefs.filter((source) => source.status !== "discarded").length >= 2;
  const confidence = Number(args.result?.canonicalEntity?.identityConfidence ?? 0);
  const integrationHeavy = includesAny(queryText, ["mcp", "api", "plugin", "integration", "claude code", "cursor", "workflow", "agent"]);
  const installFriendly = includesAny(queryText, ["install", "local", "cli", "dashboard", "subscription", "service", "retention.sh"]);
  const maintenanceHeavy = includesAny(queryText, ["maintenance", "maintain", "update", "support", "ops", "dashboard service", "subscription service"]);
  const regulated = includesAny(queryText, ["legal", "regulatory", "healthcare", "fda", "bank", "compliance"]);
  const aiSkeptic = includesAny(queryText, ["no ai", "without ai", "anti ai", "environment", "peace", "altruistic"]);
  const constrainedTeam = includesAny(queryText, ["specific skillset", "narrow skillset", "solo founder", "limited team", "small team"]);
  const exposureRisk = args.lens === "founder" || includesAny(queryText, ["stealth", "moat", "launch", "posting", "post publicly", "announce", "go public", "marketing", "reveal"]);
  const marketAligned = includesAny(queryText, ["claude code", "developer", "team", "workflow", "founder", "agent", "dashboard"])
    || includesAny(signalText, ["distribution", "workflow", "developer", "adoption"]);
  const evidenceStrong = sourceRich && confidence >= 80;

  const angles: Array<Record<string, unknown>> = [
    {
      id: "stealth-moat",
      title: "Stealth, moat, and public exposure timing",
      status: exposureRisk ? "watch" : "unknown",
      summary: exposureRisk
        ? "Before posting broadly, assume the idea is easier to copy than it feels. Stay relatively stealthy until the moat and market diligence are clearer."
        : "The packet does not yet establish whether public exposure helps more than it harms before the moat is proven.",
      whyItMatters: "Premature public posting can hand the market your playbook before you have a hard-to-duplicate advantage.",
      evidenceRefIds,
      nextQuestion: "What are competitors actually doing today, how copyable is this, and what moat would justify posting now instead of staying quieter longer?",
    },
    {
      id: "team-shape",
      title: "Team shape and complementary gaps",
      status: constrainedTeam ? "watch" : "unknown",
      summary: constrainedTeam
        ? "The direction appears to lean on a narrow or founder-heavy skillset, which can sharpen the wedge but also exposes obvious complementary gaps."
        : "The packet does not yet explain whether the team shape is a true edge or an unaddressed bottleneck.",
      whyItMatters: "Specific skillsets help when they map directly to the wedge, but they slow progress when GTM, support, or adjacent execution gaps remain implicit.",
      evidenceRefIds,
      nextQuestion: "Which complementary capability would most reduce risk for this direction right now?",
    },
    {
      id: "founder-fit",
      title: "Founder-skill and credibility fit",
      status: evidenceStrong ? "watch" : "unknown",
      summary: evidenceStrong
        ? "The opportunity is legible, but the packet still needs explicit proof that the team background makes this wedge believable to users and investors."
        : "The current run does not yet establish why this team is the credible builder for the idea.",
      whyItMatters: "A strong direction still fails if the founder narrative and real execution edge do not match the promise.",
      evidenceRefIds,
      nextQuestion: "What founder background, customer access, or technical edge makes us the believable team for this direction?",
    },
    {
      id: "build-speed",
      title: "Build speed and maintenance burden",
      status: regulated ? "watch" : integrationHeavy || installFriendly ? "strong" : "watch",
      summary: regulated
        ? "The opportunity touches regulated or high-trust surfaces, so build speed may be slower and more operationally expensive than it first appears."
        : integrationHeavy || installFriendly
          ? "The direction appears to fit existing install surfaces and workflows, which improves time-to-value and maintenance leverage."
          : "The packet still needs proof that this can be shipped and maintained quickly with the current team and stack.",
      whyItMatters: "Founders need a wedge that ships fast, installs cleanly, and does not immediately create support debt.",
      evidenceRefIds,
      nextQuestion: "What is the smallest installable wedge we can ship in 2-4 weeks without creating long-term maintenance drag?",
    },
    {
      id: "installability",
      title: "Installability and update path",
      status: installFriendly ? "strong" : "watch",
      summary: installFriendly
        ? "The direction appears to fit real install surfaces such as local CLI, MCP, or a hosted dashboard, which improves onboarding and update reliability."
        : "The packet still needs proof that users can install, maintain, and update this without high-touch support.",
      whyItMatters: "Products that are easy to install and keep current spread faster and generate less early support drag.",
      evidenceRefIds,
      nextQuestion: "Is the first wedge easiest to adopt as a local MCP tool, a browser workflow, or a hosted team dashboard?",
    },
    {
      id: "maintainability",
      title: "Maintainability and service burden",
      status: maintenanceHeavy || regulated ? "watch" : installFriendly ? "strong" : "watch",
      summary: maintenanceHeavy || regulated
        ? "The direction likely creates ongoing update, support, or compliance work, so the team needs a clearer owner model and service boundary."
        : "The current architecture suggests the product can stay relatively lean to operate if the first wedge remains narrow.",
      whyItMatters: "Founders lose momentum when the first product creates more support and maintenance load than compounding leverage.",
      evidenceRefIds,
      nextQuestion: "What parts of this should be productized, automated, or intentionally left out so maintenance load stays bounded?",
    },
    {
      id: "adoption",
      title: "Workflow adoption and distribution fit",
      status: marketAligned ? "strong" : "watch",
      summary: marketAligned
        ? "The packet points to a workflow users already run today, including current developer loops like Claude Code and adjacent agent tooling."
        : "The product story still needs proof that it rides a current user workflow instead of requiring a new habit.",
      whyItMatters: "The fastest product adoption comes from plugging into high-frequency workflows people already trust.",
      evidenceRefIds,
      nextQuestion: "Which current workflow does this replace, accelerate, or become unavoidable inside?",
    },
    {
      id: "commercial",
      title: "Commercialization and saleability",
      status: installFriendly ? "strong" : "watch",
      summary: installFriendly
        ? "The direction can plausibly expand from a tool into a dashboard, team workflow, or subscription service."
        : "The packet does not yet prove how the tool becomes a repeatable product, subscription, or saleable operating layer.",
      whyItMatters: "A useful prototype is not enough. The business has to be easy to buy, maintain, and grow.",
      evidenceRefIds,
      nextQuestion: "Does this become a paid dashboard, an agent workflow subscription, or a service layer teams will renew every month?",
    },
    {
      id: "conviction",
      title: "User and investor conviction",
      status: evidenceStrong ? "strong" : "watch",
      summary: evidenceStrong
        ? "The run has enough proof to start a conviction story, but the timing and upside narrative can still be tighter."
        : "The idea needs sharper proof, comparables, and timing signals before it will survive diligence.",
      whyItMatters: "Conviction compounds when users and investors can repeat the story without you in the room.",
      evidenceRefIds,
      nextQuestion: "What proof points, comparables, or traction signals would make this direction legible to users and investors?",
    },
  ];

  if (args.lens === "founder" || aiSkeptic) {
    angles.push({
      id: "ai-tradeoffs",
      title: "AI stance and mission tradeoffs",
      status: aiSkeptic ? "watch" : "unknown",
      summary: aiSkeptic
        ? "The query raises discomfort with AI usage, so the product needs a clearer point of view on where AI helps and where it should stay optional."
        : "The packet does not yet resolve whether AI is essential to the product or simply a convenience layer that could alienate some users or teammates.",
      whyItMatters: "Founders need a deliberate answer for people who resist AI on ethical, environmental, or mission grounds.",
      evidenceRefIds,
      nextQuestion: "Where is AI actually necessary here, and where should we offer a non-AI or low-AI path so the product stays aligned with the mission?",
    });
  }

  return angles;
}

function shouldRunFounderDirectionAssessment(args: {
  query: string;
  lens: string;
  classification: string;
}): boolean {
  if (args.lens === "founder") return true;
  if (["weekly_reset", "important_change", "pre_delegation", "general"].includes(args.classification)) {
    return true;
  }
  return includesAny(args.query, [
    "pressure-test",
    "team fit",
    "founder fit",
    "claude code",
    "install",
    "maintain",
    "subscription",
    "dashboard",
    "investor",
    "credibility",
    "adoption",
    "ai",
    "environment",
    "stealth",
    "moat",
    "post publicly",
    "announce",
    "sell",
  ]);
}

function mergeFounderDirectionAssessment(result: any, assessment: any): any {
  if (!assessment || typeof assessment !== "object") return result;
  const mergedSourceRefs = dedupeBy(
    [
      ...(Array.isArray(result?.sourceRefs) ? result.sourceRefs : []),
      ...(Array.isArray(assessment.sourceRefs) ? assessment.sourceRefs : []),
    ],
    (source: any) => String(source.id ?? source.href ?? source.label ?? ""),
  );

  return {
    ...result,
    canonicalEntity: {
      ...result?.canonicalEntity,
      ...assessment?.canonicalEntity,
      name: inferOwnCompanyName({
        ...result,
        ...assessment,
        canonicalEntity: {
          ...result?.canonicalEntity,
          ...assessment?.canonicalEntity,
        },
      }) ?? result?.canonicalEntity?.name ?? assessment?.canonicalEntity?.name,
    },
    sourceRefs: mergedSourceRefs.length > 0 ? mergedSourceRefs : result?.sourceRefs,
    strategicAngles: Array.isArray(assessment.strategicAngles) && assessment.strategicAngles.length > 0
      ? assessment.strategicAngles
      : result?.strategicAngles,
    packetType:
      assessment?.operatingModel?.packetRouter?.packetType
      ?? result?.operatingModel?.packetRouter?.packetType
      ?? result?.packetType,
    recommendedNextAction: assessment.recommendedNextAction ?? result?.recommendedNextAction,
    nextQuestions: Array.from(
      new Set([
        ...(Array.isArray(result?.nextQuestions) ? result.nextQuestions : []),
        ...(Array.isArray(assessment.nextQuestions) ? assessment.nextQuestions : []),
      ]),
    ).slice(0, 10),
    uncertaintyBoundary:
      result?.uncertaintyBoundary ??
      "The strategic pressure test mixes live search output with local project evidence. Treat it as directional until the next live refresh.",
    progressionProfile: assessment.progressionProfile ?? result?.progressionProfile,
    progressionTiers: assessment.progressionTiers ?? result?.progressionTiers,
    diligencePack: assessment.diligencePack ?? result?.diligencePack,
    readinessScore: assessment.readinessScore ?? result?.readinessScore,
    unlocks: assessment.unlocks ?? result?.unlocks,
    materialsChecklist: assessment.materialsChecklist ?? result?.materialsChecklist,
    scorecards: assessment.scorecards ?? result?.scorecards,
    shareableArtifacts: assessment.shareableArtifacts ?? result?.shareableArtifacts,
    visibility: assessment.visibility ?? result?.visibility,
    benchmarkEvidence: assessment.benchmarkEvidence ?? result?.benchmarkEvidence,
    workflowComparison: assessment.workflowComparison ?? result?.workflowComparison,
    operatingModel: assessment.operatingModel ?? result?.operatingModel,
    distributionSurfaceStatus: assessment.distributionSurfaceStatus ?? result?.distributionSurfaceStatus,
    companyReadinessPacket: assessment.companyReadinessPacket ?? result?.companyReadinessPacket,
    companyNamingPack: assessment.companyNamingPack ?? result?.companyNamingPack,
    founderDirectionAssessment: assessment,
  };
}

function buildGraphArtifacts(args: {
  query: string;
  lens: string;
  persona: string;
  packetId: string;
  sourceRefs: any[];
  claimRefs: any[];
  answerBlocks: any[];
  recommendedNextAction?: string;
}): { graphNodes: any[]; graphEdges: any[]; graphSummary: Record<string, unknown> } {
  const graphNodes: any[] = [
    { id: "query:current", kind: "query", label: trimText(args.query, 80), status: "verified" },
    { id: `lens:${args.lens}`, kind: "lens", label: args.lens, status: "verified" },
    { id: `persona:${args.persona}`, kind: "persona", label: args.persona, status: "verified" },
    { id: "context:bundle", kind: "context_bundle", label: "Context bundle", status: "verified" },
  ];
  const graphEdges: any[] = [
    { fromId: "query:current", toId: `lens:${args.lens}`, kind: "selected" },
    { fromId: `lens:${args.lens}`, toId: `persona:${args.persona}`, kind: "selected" },
    { fromId: `persona:${args.persona}`, toId: "context:bundle", kind: "selected" },
  ];

  for (const source of args.sourceRefs) {
    graphNodes.push({
      id: source.id,
      kind: "source",
      label: trimText(source.label ?? source.title ?? "Source", 60),
      status: source.status === "discarded" ? "incomplete" : "verified",
      confidence: source.confidence,
    });
    graphEdges.push({ fromId: "context:bundle", toId: source.id, kind: "explored" });
  }

  for (const claim of args.claimRefs) {
    graphNodes.push({
      id: claim.id,
      kind: claim.status === "contradicted" ? "contradiction" : "claim",
      label: trimText(claim.text, 70),
      status: claim.status === "retained" ? "verified" : "provisional",
    });
    for (const sourceId of claim.sourceRefIds ?? []) {
      graphEdges.push({
        fromId: sourceId,
        toId: claim.id,
        kind: claim.status === "contradicted" ? "conflicts_with" : "supports",
      });
    }
  }

  for (const block of args.answerBlocks) {
    graphNodes.push({
      id: block.id,
      kind: "answer_block",
      label: trimText(block.title, 50),
      status: block.status === "cited" ? "verified" : "provisional",
    });
    for (const claimId of block.claimIds ?? []) {
      graphEdges.push({ fromId: claimId, toId: block.id, kind: "used_in" });
    }
    for (const sourceId of block.sourceRefIds ?? []) {
      graphEdges.push({ fromId: sourceId, toId: block.id, kind: "about" });
    }
  }

  graphNodes.push({
    id: args.packetId,
    kind: "artifact",
    label: "Founder packet",
    status: "verified",
  });
  for (const block of args.answerBlocks) {
    graphEdges.push({ fromId: block.id, toId: args.packetId, kind: "used_in" });
  }

  if (args.recommendedNextAction) {
    graphNodes.push({
      id: "follow_up:next_action",
      kind: "follow_up",
      label: trimText(args.recommendedNextAction, 70),
      status: "provisional",
    });
    graphEdges.push({ fromId: args.packetId, toId: "follow_up:next_action", kind: "suggests" });
  }

  return {
    graphNodes,
    graphEdges,
    graphSummary: {
      nodeCount: graphNodes.length,
      edgeCount: graphEdges.length,
      clusterCount: Math.max(1, Math.min(4, 1 + args.sourceRefs.length)),
      primaryPath: ["query", "lens", "persona", "source", "claim", "answer_block", "artifact"],
    },
  };
}

function toProofStatus(sourceRefs: any[], answerBlocks: any[], judgeVerdict: any): string {
  if (sourceRefs.length === 0) return "incomplete";
  const hasOrphanedCitedBlock = answerBlocks.some(
    (block) => block.status === "cited" && (!Array.isArray(block.sourceRefIds) || block.sourceRefIds.length === 0),
  );
  if (hasOrphanedCitedBlock) return "incomplete";
  if (judgeVerdict?.verdict === "pass") return "verified";
  if (judgeVerdict?.verdict === "fail") return "drifting";
  return "provisional";
}

function buildResultPacket(args: {
  query: string;
  lens: string;
  result: any;
  classification: string;
  entityFallback?: string | null;
}): Record<string, unknown> {
  const result = normalizeOwnCompanyFounderPayload({
    query: args.query,
    lens: args.lens,
    classification: args.classification,
    result: args.result ?? {},
  });
  const sourceRefs = Array.isArray(result.sourceRefs) ? result.sourceRefs : [];
  const normalizedIdentity = normalizeFounderIdentity({
    query: args.query,
    lens: args.lens,
    classification: args.classification,
    result,
  });
  const entityName =
    normalizedIdentity.entityName
    ?? result.canonicalEntity?.name
    ?? args.entityFallback
    ?? "NodeBench";
  return {
    query: args.query,
    entityName,
    answer: result.canonicalEntity?.canonicalMission ?? "",
    confidence: result.canonicalEntity?.identityConfidence ?? 70,
    sourceCount: sourceRefs.length,
    variables: (result.signals ?? []).slice(0, 5).map((signal: any, index: number) => ({
      rank: index + 1,
      name: signal.name ?? String(signal),
      direction: signal.direction ?? "neutral",
      impact: signal.impact ?? "medium",
    })),
    keyMetrics: [
      { label: "Confidence", value: `${result.canonicalEntity?.identityConfidence ?? 0}%` },
      { label: "Sources", value: String(sourceRefs.length) },
      { label: "Claims", value: String(result.claimRefs?.length ?? 0) },
      { label: "Next actions", value: String(result.nextActions?.length ?? 0) },
    ],
    changes: result.whatChanged?.map((change: any) => ({
      description: change.description ?? String(change),
      date: change.date,
    })),
    risks: result.contradictions?.map((contradiction: any) => ({
      title: contradiction.claim ?? contradiction.title ?? "Contradiction",
      description: contradiction.evidence ?? contradiction.description ?? "",
      falsification: contradiction.falsification,
    })),
    comparables: result.comparables?.map((comparable: any) => ({
      name: comparable.name ?? String(comparable),
      relevance: comparable.relevance ?? "medium",
      note: comparable.note ?? "",
    })),
    whyThisTeam: result.whyThisTeam ?? null,
    packetId: result.packetId,
    packetType: normalizedIdentity.packetType,
    canonicalEntity: entityName,
    sourceRefs: result.sourceRefs,
    claimRefs: result.claimRefs,
    answerBlocks: result.answerBlocks,
    explorationMemory: result.explorationMemory,
    graphSummary: result.graphSummary,
    proofStatus: result.proofStatus,
    uncertaintyBoundary: result.uncertaintyBoundary,
    recommendedNextAction: result.recommendedNextAction,
    graphNodes: result.graphNodes,
    graphEdges: result.graphEdges,
    strategicAngles: result.strategicAngles,
    progressionProfile: result.progressionProfile,
    progressionTiers: result.progressionTiers,
    diligencePack: result.diligencePack,
    readinessScore: result.readinessScore,
    unlocks: result.unlocks,
    materialsChecklist: result.materialsChecklist,
    scorecards: result.scorecards,
    shareableArtifacts: result.shareableArtifacts,
    visibility: result.visibility,
    benchmarkEvidence: result.benchmarkEvidence,
    workflowComparison: result.workflowComparison,
    operatingModel: result.operatingModel,
    distributionSurfaceStatus: result.distributionSurfaceStatus,
    companyReadinessPacket: result.companyReadinessPacket,
    companyNamingPack: result.companyNamingPack,
    interventions: result.nextActions?.slice(0, 4).map((action: any) => ({
      action: action.action ?? String(action),
      impact: action.impact ?? "medium",
    })),
    nextQuestions: result.nextQuestions ?? result.nextActions?.map((action: any) => action.action) ?? [],
  };
}

function decorateResultWithProof(args: {
  query: string;
  lens: string;
  classification: string;
  result: any;
  judgeVerdict: any;
  packetId: string;
}): { result: any; packet: Record<string, unknown>; persona: string } {
  const persona = LENS_PERSONA_MAP[args.lens] ?? "FOUNDER_STRATEGY";
  const baseResult = normalizeOwnCompanyFounderPayload({
    query: args.query,
    lens: args.lens,
    classification: args.classification,
    result: args.result,
  });
  const sourceRefs = normalizeSourceRefs(baseResult);
  const claimRefs = normalizeClaimRefs(baseResult, sourceRefs);
  const answerBlocks = normalizeAnswerBlocks(baseResult, sourceRefs, claimRefs);
  const recommendedNextAction =
    baseResult?.recommendedNextAction ??
    (Array.isArray(baseResult?.nextActions) ? baseResult.nextActions[0]?.action : undefined);
  const { graphNodes, graphEdges, graphSummary } = buildGraphArtifacts({
    query: args.query,
    lens: args.lens,
    persona,
    packetId: args.packetId,
    sourceRefs,
    claimRefs,
    answerBlocks,
    recommendedNextAction,
  });
  const explorationMemory = buildExplorationMemory(args.result, sourceRefs, claimRefs);
  const proofStatus = toProofStatus(sourceRefs, answerBlocks, args.judgeVerdict);
  const strategicAngles = buildStrategicAngles({
    query: args.query,
    lens: args.lens,
    result: baseResult,
    sourceRefs,
  });
  const strategicQuestions = strategicAngles
    .map((angle) => (typeof angle.nextQuestion === "string" ? angle.nextQuestion : ""))
    .filter(Boolean);
  const uncertaintyBoundary =
    baseResult?.uncertaintyBoundary ??
    (sourceRefs.length > 0
      ? "Citations reflect the sources explored in this run. Treat the packet as directional until the next live refresh."
      : "This answer is missing durable citations. Treat it as provisional until more source coverage is available.");
  const normalizedIdentity = normalizeFounderIdentity({
    query: args.query,
    lens: args.lens,
    classification: args.classification,
    result: baseResult,
  });
  const canonicalEntityName =
    normalizedIdentity.entityName
    ?? baseResult?.canonicalEntity?.name
    ?? baseResult?.companyReadinessPacket?.identity?.companyName;

  const decoratedResult = {
    ...baseResult,
    packetId: args.packetId,
    packetType: normalizedIdentity.packetType,
    canonicalEntity: {
      ...(typeof baseResult?.canonicalEntity === "object" ? baseResult.canonicalEntity : {}),
      name: canonicalEntityName ?? baseResult?.canonicalEntity?.name,
    },
    sourceRefs,
    claimRefs,
    answerBlocks,
    explorationMemory,
    graphSummary,
    proofStatus,
    uncertaintyBoundary,
    recommendedNextAction,
    nextQuestions: Array.from(
      new Set([...(Array.isArray(baseResult?.nextQuestions) ? baseResult.nextQuestions : []), ...strategicQuestions]),
    ).slice(0, 8),
    graphNodes,
    graphEdges,
    strategicAngles,
  };

  return {
    result: decoratedResult,
    packet: buildResultPacket({
      query: args.query,
      lens: args.lens,
      result: decoratedResult,
      classification: normalizedIdentity.classification,
      entityFallback: canonicalEntityName ?? baseResult?.canonicalEntity?.name,
    }),
    persona,
  };
}

function persistSearchRun(args: {
  query: string;
  lens: string;
  persona: string;
  classification: string;
  result: any;
  packet: Record<string, unknown>;
  trace: SearchTraceEntry[];
  judgeVerdict: any;
  contextBundle: any;
  latencyMs: number;
  sessionKey: string;
}): { runId: string; traceId: string; packetId: string; outcomeId: string } {
  const runId = genId("run");
  const traceId = genId("trace");
  const packetId = String(args.result?.packetId ?? genId("artifact"));
  const outcomeId = genId("outcome");
  const now = new Date().toISOString();
  const entityName = args.result?.canonicalEntity?.name ?? "NodeBench";

  upsertDurableObject({
    id: CONTROL_PLANE_VIEW_ID,
    kind: "view",
    label: "Control plane founder search",
    source: SEARCH_SOURCE,
    status: "active",
    metadata: {
      path: "/",
      surface: "public_website",
      workflow: "founder_first_query",
    },
  });

  upsertDurableObject({
    id: runId,
    kind: "run",
    label: `${args.lens} search: ${trimText(args.query, 72)}`,
    source: SEARCH_SOURCE,
    status: "completed",
    metadata: {
      query: args.query,
      lens: args.lens,
      persona: args.persona,
      classification: args.classification,
      entityName,
      sessionKey: args.sessionKey,
      traceId,
      packetId,
      outcomeId,
      packet: args.packet,
      result: args.result,
      trace: args.trace,
      judge: args.judgeVerdict,
      proofStatus: args.result?.proofStatus,
      latencyMs: args.latencyMs,
      context: {
        tokenBudget: args.contextBundle?.totalEstimatedTokens,
        pinned: args.contextBundle?.pinned,
        injected: args.contextBundle?.injected,
        archival: args.contextBundle?.archival,
      },
      completedAt: now,
    },
  });

  upsertDurableObject({
    id: traceId,
    kind: "trace",
    label: `${args.classification} trace`,
    source: SEARCH_SOURCE,
    status: args.trace.some((step) => step.status === "error") ? "needs_review" : "completed",
    metadata: {
      runId,
      trace: args.trace,
    },
  });

  upsertDurableObject({
    id: packetId,
    kind: "artifact",
    label: `${entityName} founder packet`,
    source: SEARCH_SOURCE,
    status: args.result?.proofStatus ?? "provisional",
    metadata: {
      runId,
      packet: args.packet,
      result: args.result,
    },
  });

  upsertDurableObject({
    id: outcomeId,
    kind: "outcome",
    label: `${entityName} recommendation`,
    source: SEARCH_SOURCE,
    status: args.judgeVerdict?.verdict === "pass" ? "verified" : "draft",
    metadata: {
      runId,
      packetId,
      headline: args.result?.recommendedNextAction ?? args.packet.answer ?? entityName,
      judge: args.judgeVerdict,
    },
  });

  linkDurableObjects({ fromId: CONTROL_PLANE_VIEW_ID, toId: runId, edgeType: "opened" });
  linkDurableObjects({ fromId: runId, toId: traceId, edgeType: "generated_trace" });
  linkDurableObjects({ fromId: runId, toId: packetId, edgeType: "produced" });
  linkDurableObjects({ fromId: packetId, toId: outcomeId, edgeType: "resolved_to" });

  recordExecutionReceipt({
    runId,
    traceId,
    objectId: runId,
    actionType: "query_received",
    summary: trimText(args.query, 160),
    input: { query: args.query, lens: args.lens, classification: args.classification },
    output: { entityName, packetId },
    status: "recorded",
    metadata: { persona: args.persona },
  });

  for (const [index, step] of args.trace.entries()) {
    recordExecutionReceipt({
      runId,
      traceId,
      stepId: `${traceId}:step:${index + 1}`,
      objectId: traceId,
      toolName: step.tool ?? null,
      actionType: step.step,
      summary: step.detail ?? step.step,
      input: { step: step.step, tool: step.tool },
      output: { status: step.status, durationMs: step.endMs ? step.endMs - step.startMs : 0 },
      status: step.status,
      metadata: {
        startedAt: step.startMs,
        endedAt: step.endMs,
      },
    });
  }

  recordLocalArtifact({
    id: packetId,
    runId,
    objectId: packetId,
    kind: "founder_packet",
    summary: trimText(String(args.packet.answer ?? entityName), 280),
    verificationStatus: args.result?.proofStatus ?? "provisional",
    content: JSON.stringify(args.packet),
    metadata: {
      query: args.query,
      lens: args.lens,
      persona: args.persona,
      sourceCount: args.result?.sourceRefs?.length ?? 0,
    },
  });

  recordLocalOutcome({
    id: outcomeId,
    runId,
    objectId: outcomeId,
    outcomeType: `${args.classification}_answer`,
    headline: args.result?.recommendedNextAction ?? trimText(String(args.packet.answer ?? entityName), 120),
    userValue: `Founder-first answer for ${entityName}`,
    stakeholderValue: "Durable packet with proof, trace, and sync-ready lineage",
    status: args.judgeVerdict?.verdict === "pass" ? "verified" : "draft",
    evidence: (args.result?.sourceRefs ?? []).slice(0, 5),
    metadata: {
      packetId,
      proofStatus: args.result?.proofStatus,
      latencyMs: args.latencyMs,
    },
  });

  return { runId, traceId, packetId, outcomeId };
}

function listRecentSearchHistory(limit = 8): SearchHistoryItem[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT id, metadata_json, updated_at
    FROM object_nodes
    WHERE kind = 'run' AND source = ?
    ORDER BY updated_at DESC
    LIMIT ?
  `).all(SEARCH_SOURCE, limit) as Array<{ id: string; metadata_json: string; updated_at: string }>;

  return rows
    .map((row) => {
      const metadata = parseJsonValue<Record<string, any>>(row.metadata_json, {});
      const packet = metadata.packet;
      if (!packet?.query) return null;
      return {
        runId: row.id,
        traceId: metadata.traceId ?? "",
        packetId: metadata.packetId ?? "",
        outcomeId: metadata.outcomeId ?? "",
        query: String(packet.query),
        lens: String(metadata.lens ?? "founder"),
        persona: String(metadata.persona ?? "FOUNDER_STRATEGY"),
        classification: String(metadata.classification ?? "general"),
        entityName: String(packet.entityName ?? metadata.entityName ?? "NodeBench"),
        packet,
        trace: Array.isArray(metadata.trace)
          ? metadata.trace.map((step: SearchTraceEntry, index: number) => ({
              step: step.step,
              tool: step.tool,
              durationMs: step.endMs ? step.endMs - step.startMs : 0,
              status: step.status,
              detail: step.detail,
              traceId: `${metadata.traceId ?? row.id}:step:${index + 1}`,
            }))
          : [],
        latencyMs: Number(metadata.latencyMs ?? 0),
        proofStatus: String(packet.proofStatus ?? metadata.proofStatus ?? "provisional"),
        sourceCount: Number(packet.sourceCount ?? packet.sourceRefs?.length ?? 0),
        updatedAt: row.updated_at,
      } satisfies SearchHistoryItem;
    })
    .filter((item): item is SearchHistoryItem => Boolean(item));
}

// Lazy-load judge to avoid circular deps and keep startup fast
let _judgeToolOutput: ((args: any) => Promise<any>) | null = null;
async function getJudge() {
  if (!_judgeToolOutput) {
    try {
      const { llmJudgeLoopTools } = await import("../../packages/mcp-local/src/tools/llmJudgeLoop.js");
      const tool = llmJudgeLoopTools.find(t => t.name === "judge_tool_output");
      if (tool) _judgeToolOutput = tool.handler;
    } catch { /* judge not available */ }
  }
  return _judgeToolOutput;
}

/** Direct Linkup API call — richer than Gemini grounding, returns answer + sources */
async function linkupSearch(query: string, maxResults = 5): Promise<{ answer: string; sources: Array<{ name: string; url: string; snippet: string }> } | null> {
  const apiKey = process.env.LINKUP_API_KEY;
  if (!apiKey) return null;
  try {
    const resp = await fetch("https://api.linkup.so/v1/search", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        q: query,
        depth: "standard",
        outputType: "sourcedAnswer",
        includeInlineCitations: true,
        includeSources: true,
        maxResults,
      }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!resp.ok) return null;
    const data = await resp.json() as any;
    const sources = (data.results ?? data.sources ?? []).slice(0, maxResults).map((r: any) => ({
      name: r.name ?? r.title ?? "",
      url: r.url ?? "",
      snippet: r.content ?? r.snippet ?? "",
    }));
    return { answer: data.answer ?? "", sources };
  } catch { return null; }
}

export function createSearchRouter(tools: McpTool[]) {
  const router = Router();

  // ── Initialize behavioral profiling tables ──
  try { initBehaviorTables(); } catch { /* tables may already exist */ }

  // ── Convex client for durable profiler persistence ──
  const convexUrl = process.env.CONVEX_URL || process.env.VITE_CONVEX_URL;
  let convex: ConvexHttpClient | null = null;
  try {
    if (convexUrl) convex = new ConvexHttpClient(convexUrl);
  } catch { /* Convex optional — profiler degrades gracefully */ }

  /** Fire-and-forget: forward profiler event to Convex for durable storage */
  function forwardToConvex(data: {
    sessionId: string; surface: string; integrationPath: string;
    toolName: string; toolInputSummary?: string; latencyMs: number;
    estimatedCostUsd: number; success: boolean; isDuplicate: boolean;
    modelUsed?: string; classification?: string; query?: string;
    fingerprint?: string;
  }) {
    if (!convex) return;
    convex.mutation(anyApi.domains.profiler.mutations.logProfilerEvent, data).catch(() => {});
  }

  /** Fire-and-forget: forward session summary to Convex */
  function forwardSessionToConvex(data: {
    sessionId: string; surface: string; roleInferred: string;
    totalCalls: number; totalCostUsd: number; totalLatencyMs: number;
    redundantCalls: number; uniqueTools: string[];
    classification?: string; query?: string;
  }) {
    if (!convex) return;
    convex.mutation(anyApi.domains.profiler.mutations.logSessionSummary, data).catch(() => {});
  }

  // ── Multi-turn session state ──
  // Remembers last entity + result per session so follow-up queries
  // like "Go deeper on the risks" or "Now compare that to Google" resolve context.
  // Keyed by sessionId (from request body) or IP as fallback. TTL 30min.
  const sessionCache = new Map<string, { entity: string; classification: string; result: any; ts: number }>();
  const SESSION_TTL = 30 * 60 * 1000; // 30 minutes
  const MAX_SESSIONS = 500;

  function getSessionKey(req: any): string {
    return req.body?.sessionId ?? req.ip ?? "default";
  }

  function getSessionContext(key: string): { entity: string; classification: string; result: any } | null {
    const entry = sessionCache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.ts > SESSION_TTL) { sessionCache.delete(key); return null; }
    return entry;
  }

  function setSessionContext(key: string, entity: string, classification: string, result: any) {
    // Evict oldest if at capacity
    if (sessionCache.size >= MAX_SESSIONS) {
      const oldest = [...sessionCache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
      if (oldest) sessionCache.delete(oldest[0]);
    }
    sessionCache.set(key, { entity, classification, result, ts: Date.now() });
  }

  // Find a tool by name from the loaded tool set
  function findTool(name: string): McpTool | undefined {
    return tools.find((t) => t.name === name);
  }

  // Execute a tool and return its result
  // Active session ID for profiling — set per-request in handleSearch
  let activeProfileSessionId: string | undefined;

  async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    // Virtual tools — functions that aren't MCP tools but the harness can call
    if (name === "linkup_search") {
      const q = String(args.query ?? "");
      const max = Number(args.maxResults ?? 5);
      return linkupSearch(q, max);
    }
    const tool = findTool(name);
    if (!tool) return { error: true, message: `Tool not found: ${name}` };
    const startMs = Date.now();
    let success = true;
    try {
      const result = await tool.handler(args);
      return result;
    } catch (err: any) {
      success = false;
      return { error: true, message: err?.message ?? String(err) };
    } finally {
      // Auto-profile every tool call — dual write: local SQLite + Convex
      const durationMs = Date.now() - startMs;
      const cost = TOOL_COST[name] ?? 0.003;
      if (activeProfileSessionId) {
        try {
          logToolCall({
            sessionId: activeProfileSessionId,
            toolName: name,
            inputSummary: JSON.stringify(args).slice(0, 200),
            latencyMs: durationMs,
            costEstimateUsd: cost,
            success,
          });
        } catch { /* profiling is non-blocking */ }
        // Forward to Convex for durable persistence
        forwardToConvex({
          sessionId: activeProfileSessionId,
          surface: "ai_app",
          integrationPath: "direct",
          toolName: name,
          toolInputSummary: JSON.stringify(args).slice(0, 200),
          latencyMs: durationMs,
          estimatedCostUsd: cost,
          success,
          isDuplicate: false,
        });
      }
    }
  }

  // Cost lookup for profiling (matches eventCollector rates)
  const TOOL_COST: Record<string, number> = {
    web_search: 0.008, fetch_url: 0.002, enrich_entity: 0.015,
    run_deep_sim: 0.05, build_claim_graph: 0.03, render_decision_memo: 0.01,
    founder_local_weekly_reset: 0.005, founder_local_synthesize: 0.01,
    founder_local_gather: 0.003, run_recon: 0.02, synthesize_feature_plan: 0.03,
  };

  // Classify query intent
  /** Split multi-entity queries like "Anthropic, OpenAI, and Google" into individual names.
   *  Only activates when there's clear multi-entity syntax (commas + and, or vs). */
  function extractMultipleEntities(query: string): string[] {
    const genericPhrasePattern = /^(what|why|how|when|where|who|should|could|would|do|does|did|is|are|was|were|can|will)\b/i;
    const genericEntityStopwords = new Set([
      "a", "an", "and", "as", "at", "for", "from", "founder", "general", "i", "in", "last", "matters",
      "market", "my", "next", "now", "of", "our", "question", "risk", "shift", "should", "strategy",
      "the", "this", "to", "update", "week", "what", "which", "why", "you", "your",
    ]);
    const lq = query.toLowerCase();
    // Require explicit multi-entity syntax: comma, "and" with comma, "vs"
    const hasMultiSyntax = /,\s*(?:and\s+)?\w/.test(lq) || /\bvs\.?\s/i.test(lq) || /\bversus\b/i.test(lq);
    if (!hasMultiSyntax) return [];
    // Don't split personal/upload queries
    if (/\b(my |uploaded|transcript|meeting|document|file|research file)/i.test(lq)) return [];

    const cleaned = query
      .replace(/(?:compare|analyze|research|tell me about|search|profile|diligence on)\s+/gi, "")
      .replace(/(?:in\s+(?:the\s+)?|the\s+|an?\s+)(?:AI|tech|fintech|payments?|commerce|market|race|landscape|space|industry|sector|category|segment|vertical)\b.*/gi, "")
      .replace(/(?:top \d+ risks across|risks across|what changed.*?for)\s*/gi, "")
      .replace(/(?:competitive landscape|competitive position|strategy|overview).*$/gi, "")
      .trim();
    // Split on comma, "and", "vs", "&"
    const parts = cleaned.split(/\s*(?:,\s*(?:and\s+)?|,?\s+and\s+|\s+vs\.?\s+|\s+versus\s+|\s*&\s*)\s*/i)
      .map((part) => part.trim().replace(/^['"]|['"]$/g, "").replace(/'s$/g, "").replace(/[?!.,]+$/g, ""))
      .filter((part) => {
        if (!(part.length > 1 && part.length < 40 && /^[a-zA-Z]/.test(part))) return false;
        if (genericPhrasePattern.test(part)) return false;
        const words = part.split(/\s+/).filter(Boolean);
        if (words.length === 0 || words.length > 4) return false;
        const genericWordCount = words.filter((word) => genericEntityStopwords.has(word.toLowerCase())).length;
        if (genericWordCount >= Math.max(1, words.length - 1)) return false;
        if (words.length > 2 && genericWordCount > 0) return false;
        return true;
      });  // Must look like entity names, not question fragments
    // Need at least 2 valid entity names
    return parts.length >= 2 ? parts : [];
  }

  function classifyQuery(query: string): {
    type: "weekly_reset" | "pre_delegation" | "important_change" | "plan_proposal" | "company_search" | "competitor" | "multi_entity" | "general";
    entity?: string;
    entities?: string[];
    lens: string;
  } {
    function extractPrimaryEntity(queryText: string): string | undefined {
      const entityPatterns = [
        /(?:analyze|research|search|evaluate|assess|profile|diligence on)\s+([A-Z][a-zA-Z0-9.&-]+(?:\s+[A-Z][a-zA-Z0-9.&-]+){0,2})/i,
        /(?:for|about|on)\s+([A-Z][a-zA-Z0-9.&-]+(?:\s+[A-Z][a-zA-Z0-9.&-]+){0,2})/i,
      ];
      for (const pattern of entityPatterns) {
        const match = queryText.match(pattern);
        if (match?.[1]) {
          const entity = match[1]
            .trim()
            .replace(/\b(for|about|on|into|with|against|versus|vs)\b\s*$/i, "")
            .replace(/[?.!,]+$/g, "");
          const normalizedEntity = entity.trim();
          if (normalizedEntity.length > 1 && normalizedEntity.length < 50) return normalizedEntity;
        }
      }
      return undefined;
    }

    const lq = query.toLowerCase();

    if (lq.includes("weekly reset") || lq.includes("founder reset") || lq.includes("founder weekly")
        || lq.includes("weekly summary") || lq.includes("week in review") || lq.match(/weekly\b.*\b(next moves|recap|update)/)) {
      return { type: "weekly_reset", lens: "founder" };
    }
    if (lq.includes("pre-delegation") || lq.includes("delegation packet") || lq.includes("agent-ready")
        || lq.includes("handoff brief") || lq.includes("handoff packet") || lq.includes("agent delegation")
        || (lq.includes("delegation") && lq.includes("agent"))) {
      return { type: "pre_delegation", lens: "founder" };
    }
    if (lq.includes("important change") || lq.includes("what changed") || lq.includes("since my last")
        || lq.includes("what's different") || lq.includes("what is different") || lq.includes("since yesterday")
        || lq.includes("biggest contradictions") || lq.includes("recent changes")) {
      // Check if this is a multi-entity change query like "What changed for Shopify, Amazon, and Google?"
      const changeEntities = extractMultipleEntities(query);
      if (changeEntities.length >= 2) {
        return { type: "multi_entity", entities: changeEntities, lens: "investor" };
      }
      return { type: "important_change", lens: "founder", entity: extractPrimaryEntity(query) };
    }

    // Plan/proposal synthesis — "plan a notification system", "should we build X", "propose integration with Y"
    if (lq.match(/\b(plan|propose|integrate|extend|should we build|feature plan|implementation plan|integration proposal|extension plan)\b/)
        && !lq.includes("weekly") && !lq.includes("delegation") && !lq.includes("what changed")) {
      return { type: "plan_proposal", lens: "founder", entity: extractPrimaryEntity(query) };
    }

    // Multi-entity detection — check BEFORE single-entity competitor/company
    // Also check competitor-style queries that mention multiple entities
    const isCompetitorQuery = lq.includes("competitor") || lq.includes("versus") || lq.includes(" vs ")
        || lq.includes("compare ") || lq.includes("competitive landscape") || lq.includes("compete with")
        || lq.includes("supermemory");
    const multiEntities = extractMultipleEntities(query);
    if (multiEntities.length >= 2) {
      return { type: "multi_entity", entities: multiEntities, lens: "investor" };
    }
    // For competitor queries with "and" or "vs" that extractMultipleEntities missed,
    // try extracting from the competitor clause specifically
    if (isCompetitorQuery) {
      const compClause = query.match(/(?:compete with|against|vs\.?|versus|compare)\s+(.+?)(?:\?|$)/i)?.[1]
        ?? query.match(/(?:competitive landscape)[:\s]+(.+?)(?:\?|$)/i)?.[1]
        ?? query.match(/(?:competitor.*?(?:against|with))\s+(.+?)(?:\?|$)/i)?.[1];
      if (compClause) {
        const parts = compClause.split(/\s*(?:,\s*(?:and\s+)?|,?\s+and\s+|\s+vs\.?\s+|\s+versus\s+|\s*&\s*|\s+or\s+)\s*/i)
          .map(p => p.trim().replace(/[?'"]/g, "").replace(/['\u2019]s$/g, ""))
          .filter(p => p.length > 1 && /^[a-zA-Z]/.test(p));
        if (parts.length >= 2) {
          return { type: "multi_entity", entities: parts, lens: "investor" };
        }
      }
      // Try to extract BOTH entities from "How does X compare to Y" patterns
      const compareToMatch = query.match(/(?:how does)\s+(\w+)\s+(?:compete|compare|stack up)\s+(?:to|with|against)\s+(\w+)/i);
      if (compareToMatch && compareToMatch[1] && compareToMatch[2]) {
        return { type: "multi_entity", entities: [compareToMatch[1], compareToMatch[2]], lens: "investor" };
      }
      // Single competitor — extract the primary entity being compared
      const singleEntity = query.match(/(?:how does)\s+(\w+)\s+(?:compete|compare|stack up)/i)?.[1]
        ?? query.match(/(\w+)\s+competitor/i)?.[1];
      return { type: "competitor", entity: singleEntity, lens: "researcher" };
    }

    // Skip company search if the query is about user's own entity, documents/uploads, or general strategic question
    const isOwnEntity = lq.match(/\b(my company|my startup|my business|my current company|my team|my organization|my firm|our company|our startup|our business|investor update for my|current company state)\b/);
    const isUploadContext = lq.match(/\b(meeting transcript|meeting notes|uploaded|my documents|my files|research files|my research)\b/);
    const isGeneralStrategic = lq.match(/\b(should i track|should i build|should i present|for my thesis|as a legal|as a banker|as an investor|what deals|portfolio companies)\b/);
    // Scenario planning: "what if", "what happens if", "simulate", "model a scenario"
    // Scenarios with named entities → company_search (gets web enrichment + Gemini extraction)
    const isScenario = lq.match(/\b(what happens if|what if|simulate|model a scenario|second.order effects|what would happen|how would)\b/);
    if (isScenario) {
      // Multi-entity scenarios first: "How would a TikTok ban affect Meta and Snap?"
      const scenarioEntities = extractMultipleEntities(query);
      if (scenarioEntities && scenarioEntities.length >= 2) {
        return { type: "multi_entity", entities: scenarioEntities, lens: "investor" };
      }
      // Try standard entity extraction
      const scenarioEntity = extractPrimaryEntity(query);
      if (scenarioEntity) {
        return { type: "company_search", entity: scenarioEntity, lens: "investor" };
      }
      // Scenario-specific: extract capitalized proper nouns after "what if" / "what happens if"
      const scenarioNameMatch = query.match(/(?:what (?:if|happens if)|how would)\s+(?:a\s+)?([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+){0,2})/);
      if (scenarioNameMatch?.[1]) {
        const name = scenarioNameMatch[1].replace(/\b(open|merge|raise|ban|regulate|launch|acquire|shut|close)\b.*$/i, "").trim();
        if (name.length > 1 && name.length < 40) {
          return { type: "company_search", entity: name, lens: "investor" };
        }
      }
      // Scenarios with "affect X" or "impact X"
      const affectMatch = query.match(/(?:affect|impact|disrupt)\s+([A-Z][a-zA-Z0-9]+(?:\s+(?:and|&)\s+[A-Z][a-zA-Z0-9]+)*)/);
      if (affectMatch?.[1]) {
        const affected = affectMatch[1].split(/\s+(?:and|&)\s+/).map(s => s.trim()).filter(Boolean);
        if (affected.length >= 2) return { type: "multi_entity", entities: affected, lens: "investor" };
        if (affected.length === 1) return { type: "company_search", entity: affected[0], lens: "investor" };
      }
    }
    if (isOwnEntity || isUploadContext || isGeneralStrategic || isScenario) {
      return { type: "general", lens: "founder" };
    }

    // Company search — detect entity names
    const companyPatterns = [
      /(?:company profile|profile)\s+(?:for|of|on)\s+(.+?)(?:\s+—|$)/i,  // "Company profile for Mistral AI"
      /(?:full diligence|deep dive|diligence)\s+(?:on|into)\s+(.+?)(?:\s+—|$)/i,  // "Full diligence on Cohere"
      /(?:evaluate|assess)\s+(.+?)(?:\s+moat|\s+after|\s+for|\s+—|$)/i,  // "Evaluate Figma's moat"
      /(?:what (?:does|is|are))\s+(.+?)\s+(?:do|doing|building)\b/i,  // "What does Replit do"
      /(?:what is)\s+(.+?)\s+doing\b/i,  // "What is Modal doing"
      /(?:analyze|search|tell me about|diligence on|research)\s+(.+?)(?:\s+for\b|\s+from\b|\s+—|$)/i,
      /^(.+?)\s+(?:competitive position|strategy|valuation|revenue|risk|overview|product launches)/i,
      /^search\s+(.+?)(?:\s+—|\s+–|\s+-|$)/i,
      /(?:top \d+ risks (?:for|across)|risks across|landscape for|investing in)\s+(.+?)$/i,
      /^(.+?)\s+(?:AI chips|AI strategy|enterprise strategy)\b/i,  // "Groq AI chips"
    ];
    for (const pattern of companyPatterns) {
      const match = query.match(pattern);
      if (match?.[1]) {
        // Clean entity name: strip possessives FIRST (before removing quotes), then descriptors
        const entity = match[1].trim()
          .replace(/['\u2018\u2019\u0027]s(\s|$)/g, "$1")  // possessive: "Anthropic's" → "Anthropic" BEFORE quote strip
          .replace(/['"]/g, "")
          .replace(/\s+(latest|recent|current|today'?s|funding|revenue|valuation|pricing|market cap|stock|risks?|overview|news|analysis|competitive|position|strategy|market|enterprise|positioning|infrastructure|moat|product|data|lakehouse|developer|platform|payments|AI|search|commerce|product launches).*$/i, "")
          .trim();
        if (entity.length > 1 && entity.length < 50) {
          return { type: "company_search", entity, lens: "investor" };
        }
      }
    }

    // Fallback: 1-3 capitalized words (likely a company name like "Apple", "Mercury", "Linear")
    const capitalizedMatch = query.trim().match(/^([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,2})$/);
    if (capitalizedMatch && capitalizedMatch[1].length > 2 && capitalizedMatch[1].length < 40) {
      return { type: "company_search", entity: capitalizedMatch[1], lens: "investor" };
    }

    return { type: "general", lens: "founder" };
  }

  // ── LLM-based classifier (Gemini Flash Lite) ─────────────────────────
  // Replaces regex heuristics with a single LLM call for intent + entity extraction.
  // Falls back to regex classifyQuery if GEMINI_API_KEY is missing or call fails.
  type ClassifyResult = {
    type: "weekly_reset" | "pre_delegation" | "important_change" | "plan_proposal" | "company_search" | "competitor" | "multi_entity" | "general";
    entity?: string;
    entities?: string[];
    lens: string;
  };

  async function classifyQueryWithLLM(query: string, sessionContext?: string): Promise<ClassifyResult> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return classifyQuery(query); // Fallback to regex

    try {
      const fullPrompt = sessionContext
        ? `${sessionContext}\n\nNow classify this query:\n${query}`
        : query;
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `Classify this user query for a startup intelligence platform.
${sessionContext ? `\nContext: ${sessionContext}` : ""}
Query: "${query}"

Classification rules:
- "weekly_reset": user wants a weekly summary, founder reset, or "what changed this week"
- "pre_delegation": user wants to hand off work to an agent or prepare a delegation packet
- "important_change": user asks what changed recently, what's different, biggest contradictions
- "plan_proposal": user wants to plan a feature, integration, or asks "should we build X"
- "company_search": user asks about ONE specific company or wants intelligence on one entity
- "competitor": user asks about competitors, competitive landscape, or "who competes with X"
- "multi_entity": user compares 2+ companies ("X vs Y", "compare X and Y", "X, Y, and Z")
- "general": anything else — general questions, idea validation, pitch readiness, strategic questions

Entity extraction rules:
- Extract ONLY proper company/product names that appear VERBATIM in the query
- Do NOT invent entities — if no company name is explicitly in the query, entity must be null
- "Compare Stripe vs Square" → entities: ["Stripe", "Square"], type: "multi_entity"
- "What would Y Combinator look for" → entity: "Y Combinator", type: "company_search"
- "I'm building an AI tutoring app" → entity: null, type: "general"
- "Am I ready to pitch Sequoia?" → entity: "Sequoia", type: "company_search"
- "What changed this week?" → entity: null, type: "weekly_reset"
- "Anthropic" → entity: "Anthropic", type: "company_search"
- "OpenAI risks and challenges" → entity: "OpenAI", type: "company_search"
- "How does Notion compare to Coda" → entities: ["Notion", "Coda"], type: "multi_entity"` }] }],
            generationConfig: {
              temperature: 0,
              maxOutputTokens: 200,
              responseMimeType: "application/json",
              responseSchema: {
                type: "object",
                properties: {
                  type: { type: "string", enum: ["weekly_reset", "pre_delegation", "important_change", "plan_proposal", "company_search", "competitor", "multi_entity", "general"] },
                  entity: { type: "string", nullable: true, description: "Primary company/entity name from the query, or null if none" },
                  entities: { type: "array", items: { type: "string" }, nullable: true, description: "All company names if comparing multiple" },
                  lens: { type: "string", enum: ["founder", "investor", "banker", "ceo", "legal", "student"] },
                },
                required: ["type", "lens"],
              },
            },
          }),
          signal: AbortSignal.timeout(3000), // 3s budget — classification must be fast
        }
      );

      if (!resp.ok) return classifyQuery(query);

      const data = await resp.json() as any;
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      // Extract JSON from response (may be wrapped in ```json...```)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return classifyQuery(query);

      const parsed = JSON.parse(jsonMatch[0]);
      const validTypes = ["weekly_reset", "pre_delegation", "important_change", "plan_proposal", "company_search", "competitor", "multi_entity", "general"];
      const type = validTypes.includes(parsed.type) ? parsed.type : "general";
      const validLenses = ["founder", "investor", "banker", "ceo", "legal", "student"];
      const lens = validLenses.includes(parsed.lens) ? parsed.lens : "founder";

      let entities = Array.isArray(parsed.entities) && parsed.entities.length >= 2
        ? parsed.entities.filter((e: any) => typeof e === "string" && e.length > 0)
        : undefined;

      // Defensive: if LLM classified as multi_entity or competitor but returned <2 entities,
      // try regex split on "vs", "versus", "compared to", "and" to extract them from the query
      if (!entities || entities.length < 2) {
        const vsMatch = query.match(/^(?:compare\s+)?(.+?)\s+(?:vs\.?|versus|compared?\s+to|against)\s+(.+?)(?:\?|$)/i);
        if (vsMatch) {
          entities = [vsMatch[1].trim(), vsMatch[2].trim()].filter(e => e.length > 0);
          if (entities.length >= 2) {
            return { type: "multi_entity", entity: entities[0], entities, lens };
          }
        }
      }

      // Post-extraction entity verification: reject hallucinated entities.
      // Defense 1: entity must appear verbatim in the query text.
      // Defense 2: entity must be a proper noun (starts with uppercase in original query).
      // Defense 3: entity must not be a common phrase fragment.
      // Based on PARSE (arxiv:2510.08623) and few-shot NER best practices.
      let entity = typeof parsed.entity === "string" && parsed.entity.length > 0 ? parsed.entity : undefined;
      if (entity) {
        const entityLower = entity.toLowerCase();
        const inQuery = query.toLowerCase().includes(entityLower);
        // Check if entity starts with uppercase in the original query (proper noun)
        const entityIdx = query.toLowerCase().indexOf(entityLower);
        const startsUppercase = entityIdx >= 0 && /^[A-Z]/.test(query.charAt(entityIdx));
        // Reject common phrase fragments that aren't company names
        const isPhrase = /^(what|how|when|where|why|who|which|the|this|that|my|your|changed|built|building|doing|risks?|challenges?)\b/i.test(entity);
        if (!inQuery || !startsUppercase || isPhrase) {
          entity = undefined;
        }
      }
      if (entities) {
        entities = entities.filter((e: string) => query.toLowerCase().includes(e.toLowerCase()));
        if (entities.length < 2) entities = undefined;
      }

      return { type, entity, entities, lens };
    } catch {
      return classifyQuery(query); // Fallback to regex on any failure
    }
  }

  /** Detect follow-up queries that reference prior session context.
   *  Returns enriched classification with prior entity injected. */
  async function classifyWithSession(
    query: string,
    sessionCtx: { entity: string; classification: string; result: any } | null,
  ): Promise<ClassifyResult> {
    // LLM-only classification — no regex patterns.
    // Session context is injected into the prompt so the LLM understands
    // follow-ups like "go deeper", "compare that to Google", "summarize it".
    // Pass session context as a separate system-level hint, NOT appended to the query.
    // Appending "compare that to X" to the query caused the LLM to extract "that to X" as an entity.
    const sessionSystem = sessionCtx
      ? `Prior session context: user was discussing "${sessionCtx.entity}". If this query references that entity, include it.`
      : undefined;

    return classifyQueryWithLLM(query, sessionSystem);
  }

  // ── POST /search ──────────────────────────────────────────────────
  const parseSearchInput = (req: Request): { query?: string; lens?: string; daysBack?: number } => {
    if (req.method === "GET") {
      const query = typeof req.query.query === "string" ? req.query.query : undefined;
      const lens = typeof req.query.lens === "string" ? req.query.lens : undefined;
      const parsedDaysBack =
        typeof req.query.daysBack === "string" ? Number.parseInt(req.query.daysBack, 10) : undefined;

      return {
        query,
        lens,
        daysBack: Number.isFinite(parsedDaysBack) ? parsedDaysBack : undefined,
      };
    }

    const { query, lens, daysBack } = req.body as {
      query?: string;
      lens?: string;
      daysBack?: number;
    };

    return { query, lens, daysBack };
  };

  const handleSearch = async (req: Request, res: Response) => {
    const startMs = Date.now();
    const { query, lens, daysBack } = parseSearchInput(req);

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return res.status(400).json({ error: true, message: "Query is required" });
    }

    // Use session-aware classifier for multi-turn follow-ups
    const sessionKey = getSessionKey(req);
    const sessionCtx = getSessionContext(sessionKey);
    const classification = await classifyWithSession(query.trim(), sessionCtx);
    const resolvedLens = lens ?? classification.lens;

    const isStream = req.query.stream === "true";
    if (isStream) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();
    }

    // Execution trace — records every step for trajectory visualization
    const trace: Array<{ step: string; tool?: string; startMs: number; endMs?: number; status: "ok" | "error" | "skip"; detail?: string }> = [];
    function traceStep(step: string, tool?: string) {
      const entry = { step, tool, startMs: Date.now(), status: "ok" as const, detail: undefined as string | undefined };
      trace.push(entry);
      if (isStream) {
        res.write(`data: ${JSON.stringify({ type: "trace", entry })}\n\n`);
      }
      return {
        ok(detail?: string) { 
          entry.endMs = Date.now(); entry.status = "ok"; entry.detail = detail; 
          if (isStream) res.write(`data: ${JSON.stringify({ type: "trace", entry })}\n\n`);
        },
        error(detail?: string) { 
          entry.endMs = Date.now(); entry.status = "error"; entry.detail = detail; 
          if (isStream) res.write(`data: ${JSON.stringify({ type: "trace", entry })}\n\n`);
        },
        skip(detail?: string) { 
          entry.endMs = Date.now(); entry.status = "skip"; entry.detail = detail; 
          if (isStream) res.write(`data: ${JSON.stringify({ type: "trace", entry })}\n\n`);
        },
      };
    }

    const classifyTrace = traceStep("classify_query");
    classifyTrace.ok(`type=${classification.type}, entity=${classification.entity ?? "none"}`);

    // ── Behavioral profiling: log session + query ──
    let behaviorSessionId: string | undefined;
    let behaviorQueryId: string | undefined;
    try {
      behaviorSessionId = logSession({
        interfaceSurface: "ai_app",
        roleInferred: resolvedLens,
        mainObjective: classification.type,
      });
      activeProfileSessionId = behaviorSessionId;
      const priorQuery = findSimilarPriorQuery(query.trim(), behaviorSessionId);
      behaviorQueryId = logQuery({
        sessionId: behaviorSessionId,
        rawQuery: query.trim(),
        classification: classification.type,
        normalizedIntent: classification.type,
        entityTargets: classification.entities ?? (classification.entity ? [classification.entity] : []),
        ownCompanyMode: classification.type === "weekly_reset" || classification.type === "founder_progression",
        confidenceScore: priorQuery.found ? 0.95 : undefined,
        latencyMs: Date.now() - startMs,
      });
    } catch { /* profiling is non-blocking */ }

    // Helper to log tool calls to behavioral store
    const profileToolCall = (toolName: string, latencyMs: number, success: boolean, costUsd: number, modelUsed?: string) => {
      if (!behaviorSessionId) return;
      try {
        logToolCall({
          sessionId: behaviorSessionId,
          queryId: behaviorQueryId,
          toolName,
          latencyMs,
          costEstimateUsd: costUsd,
          success,
          modelUsed,
        });
      } catch { /* non-blocking */ }
    };

    // Fix P2 #10: Compute context bundle BEFORE tool dispatch so tools can use it
    const ctxTrace = traceStep("build_context_bundle");
    const contextBundle = buildContextBundle(query.trim());
    ctxTrace.ok(`tokens=${contextBundle.totalEstimatedTokens}`);

    try {
      let result: any;
      let usedHarness = false;

      // ── Agent Harness: LLM-orchestrated tool chain ──────────────
      // The harness replaces the flat switch with an LLM-planned execution.
      // Falls through to the legacy switch if harness fails or no API key.
      // Agent harness uses call_llm provider bus (Gemini → OpenAI → Anthropic)
      // No API key check needed — call_llm handles provider detection
      {
        try {
          const planTrace = traceStep("agent_plan", "gemini-3.1-flash-lite");
          const plan = await generatePlan(
            query.trim(),
            classification.type,
            classification.entities ?? (classification.entity ? [classification.entity] : []),
            resolvedLens,
            callTool,
          );
          planTrace.ok(`${plan.steps.length} steps planned`);

          const execTrace = traceStep("agent_execute");
          const execution = await executeHarness(plan, callTool, (step) => {
            // Stream each harness step to the frontend trace
            const entry = { step: step.step, tool: step.tool, startMs: Date.now(), status: step.status as "ok", detail: step.detail };
            trace.push(entry);
            if (isStream) {
              res.write(`data: ${JSON.stringify({ type: "trace", entry: { ...entry, endMs: Date.now(), durationMs: 0 } })}\n\n`);
            }
          });
          execTrace.ok(`${execution.stepResults.length} steps, ${execution.totalDurationMs}ms`);

          // Synthesize results into a structured packet
          const synthTrace = traceStep("agent_synthesize", "gemini-3.1-flash-lite");
          const synthesized = await synthesizeResults(execution, query.trim(), resolvedLens, callTool);
          synthTrace.ok(`${synthesized.confidence}% confidence`);

          // ── Parallel enrichment: Monte Carlo + Why This Team credibility ──
          // Both run concurrently after synthesis to stay within Vercel timeout.
          const enrichmentPromises: Promise<void>[] = [];

          // Why This Team — credibility layer via direct Gemini call
          // For self-search (NodeBench, founder), inject local context (CLAUDE.md, memory, git)
          if (process.env.GEMINI_API_KEY && !synthesized.whyThisTeam) {
            enrichmentPromises.push((async () => {
              try {
                // Detect self-search: query about NodeBench or the founder
                const isSelfSearch = /nodebench|homen|shum|my company|our company|my startup/i.test(query);
                let localContext = "";
                if (isSelfSearch) {
                  try {
                    const fs = await import("node:fs/promises");
                    const os = await import("node:os");
                    const path = await import("node:path");
                    // Read founder identity from CLAUDE.md
                    const claudeMdPaths = [
                      path.join(os.homedir(), ".claude", "CLAUDE.md"),
                      path.join(process.cwd(), "CLAUDE.md"),
                    ];
                    for (const p of claudeMdPaths) {
                      try {
                        const content = await fs.readFile(p, "utf-8");
                        // Extract identity section (first 600 chars)
                        localContext += `\nFOUNDER IDENTITY (from CLAUDE.md):\n${content.slice(0, 600)}`;
                        break;
                      } catch { continue; }
                    }
                    // Read memory index
                    const memPath = path.join(os.homedir(), ".claude", "projects");
                    try {
                      const dirs = await fs.readdir(memPath);
                      for (const d of dirs.slice(0, 1)) {
                        const memFile = path.join(memPath, d, "memory", "MEMORY.md");
                        try {
                          const mem = await fs.readFile(memFile, "utf-8");
                          localContext += `\nPROJECT MEMORY:\n${mem.slice(0, 400)}`;
                        } catch { /* no memory file */ }
                      }
                    } catch { /* no projects dir */ }
                    // Git stats
                    try {
                      const { execSync } = await import("node:child_process");
                      const commitCount = execSync("git log --oneline --since='2026-01-01' | wc -l", { cwd: process.cwd(), timeout: 3000 }).toString().trim();
                      const firstCommit = execSync("git log --oneline --reverse | head -1", { cwd: process.cwd(), timeout: 3000 }).toString().trim();
                      localContext += `\nGIT HISTORY: ${commitCount} commits since Jan 2026. First: ${firstCommit}`;
                    } catch { /* git not available */ }
                  } catch { /* local context is best-effort */ }
                }

                const credResp = await fetch(
                  `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${process.env.GEMINI_API_KEY}`,
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      contents: [{ parts: [{ text: `Assess founder/team credibility of "${synthesized.entityName}" for a ${resolvedLens} audience.\n\nWeb context: ${(synthesized.answer ?? "").slice(0, 400)}${localContext ? `\n\nLocal founder context (private, high-trust):\n${localContext}` : ""}\n\nReturn ONLY JSON:\n{"founderCredibility":"why credible","trustSignals":["fact1","fact2"],"visionMagnitude":"scale assessment","reinventionCapacity":"pivot ability","hiddenRequirements":["req1","req2"]}` }] }],
                      generationConfig: { temperature: 0, maxOutputTokens: 600, responseMimeType: "application/json" },
                    }),
                    signal: AbortSignal.timeout(8000),
                  }
                );
                if (credResp.ok) {
                  const credData = await credResp.json() as any;
                  const credText = credData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
                  const credMatch = credText.match(/\{[\s\S]*\}/);
                  if (credMatch) synthesized.whyThisTeam = JSON.parse(credMatch[0]);
                }
              } catch { /* credibility is non-blocking */ }
            })());
          }

          // Monte Carlo enrichment (runs in parallel with credibility)
          if (classification.type === "company_search" || classification.type === "competitor" || classification.type === "multi_entity") {
            enrichmentPromises.push((async () => {
            try {
              const mcTrace = traceStep("tool_call", "simulate_decision_paths");
              // Extract financial data from the synthesized answer
              const answerText = synthesized.answer ?? "";
              const revMatch = answerText.match(/\$(\d+(?:\.\d+)?)\s*(B|billion|M|million)/i);
              const shareMatch = answerText.match(/(\d+(?:\.\d+)?)\s*%\s*(?:market|share)/i);
              const seedRevenue = revMatch
                ? parseFloat(revMatch[1]) * (revMatch[2].toLowerCase().startsWith("b") ? 1_000_000_000 : 1_000_000) / 12
                : 5_000_000; // Default $5M/mo if no data
              const seedShare = shareMatch ? parseFloat(shareMatch[1]) / 100 : 0.05;

              const mcResult = await callTool("simulate_decision_paths", {
                entity: synthesized.entityName,
                revenue: Math.round(seedRevenue),
                marketShare: seedShare,
                runway: 24,
                numPaths: 100,
                timeHorizonMonths: 12,
              }) as any;
              if (mcResult?.summary) {
                const sim = mcResult.summary;
                // Cap MC to 2 signals at medium impact — supplementary, not primary
                synthesized.signals.push(
                  { name: `Monte Carlo (${sim.paths} paths): ${sim.successRate} success, base ${sim.medianPayoff}`, direction: "neutral", impact: "medium" },
                );
                if (mcResult.bestPath && mcResult.worstPath) {
                  synthesized.signals.push({ name: `3-case: Bull ${mcResult.bestPath.payoff} | Bear ${mcResult.worstPath.payoff} (${sim.confidenceInterval})`, direction: "neutral", impact: "medium" });
                }
                for (const d of (mcResult.decisionSensitivity ?? []).slice(0, 2)) {
                  synthesized.risks.push({ title: `Key decision: ${d.decision}`, description: `Best path: "${d.bestChoice}" (${d.impact} vs average). This decision materially affects outcomes.` });
                }
                // NOTE: Don't append raw simulation text to the answer body — it leaks internal pipeline output.
                // MC data is already surfaced in signals.
                synthesized.sources.push({ label: `Monte Carlo (${sim.paths})`, type: "local" });
              }
              mcTrace.ok(`${mcResult?.summary?.successRate ?? "?"} success rate`);
            } catch { /* MC enrichment is non-blocking */ }
            })());
          }

          // Wait for all parallel enrichments (credibility + MC)
          if (enrichmentPromises.length > 0) {
            await Promise.all(enrichmentPromises);
          }

          // Build result in the format the rest of the route expects
          result = {
            canonicalEntity: {
              name: synthesized.entityName,
              canonicalMission: synthesized.answer,
              identityConfidence: synthesized.confidence,
            },
            signals: synthesized.signals.map((s, i) => ({
              name: s.name, direction: s.direction, impact: s.impact,
            })),
            whatChanged: synthesized.changes,
            contradictions: synthesized.risks.map(r => ({
              claim: r.title, evidence: r.description,
            })),
            comparables: synthesized.comparables,
            whyThisTeam: synthesized.whyThisTeam,
            nextActions: synthesized.nextActions,
            nextQuestions: synthesized.nextQuestions,
            sourceRefs: synthesized.sources.map((s, i) => ({
              id: `src:${i}`, label: s.label, href: s.href, type: s.type, status: "cited",
            })),
            keyMetrics: [
              { label: "Confidence", value: `${synthesized.confidence}%` },
              { label: "Steps", value: String(execution.stepResults.length) },
              { label: "Sources", value: String(synthesized.sources.length) },
              { label: "Actions", value: String(synthesized.nextActions.length) },
            ],
            harnessExecution: {
              objective: plan.objective,
              stepsPlanned: plan.steps.length,
              stepsCompleted: execution.stepResults.filter(r => r.success).length,
              totalDurationMs: execution.totalDurationMs,
              adaptations: execution.adaptations,
            },
          };
          usedHarness = true;
        } catch (harnessErr: any) {
          // Harness failed — fall through to legacy switch
          const fallbackTrace = traceStep("agent_fallback");
          fallbackTrace.ok(`harness failed: ${harnessErr?.message ?? "unknown"}, using legacy dispatch`);
        }
      }

      // ── Legacy switch (fallback if harness didn't produce a result) ──
      if (!usedHarness) switch (classification.type) {
        case "weekly_reset": {
          const t = traceStep("tool_call", "founder_local_weekly_reset");
          const raw = await callTool("founder_local_weekly_reset", { daysBack: daysBack ?? 7 }) as any;
          t.ok();
          // Map raw tool output → ResultPacket structure
          const wr = raw ?? {};
          result = {
            canonicalEntity: {
              name: "Weekly Reset",
              canonicalMission: wr.summary ?? wr.weeklyResetPacket?.summary ?? "Weekly founder reset",
              identityConfidence: (wr.confidence ?? 0.75) > 1 ? wr.confidence : Math.round((wr.confidence ?? 0.75) * 100),
            },
            signals: (wr.keyFindings ?? wr.metrics ?? []).slice(0, 5).map((f: any, i: number) => ({
              name: typeof f === "string" ? f : f.finding ?? f.title ?? f.label ?? String(f),
              direction: "neutral", impact: i < 2 ? "high" : "medium",
            })),
            whatChanged: (wr.keyFindings ?? []).slice(0, 5).map((f: any) => ({
              description: typeof f === "string" ? f : f.finding ?? f.description ?? String(f),
              date: new Date().toISOString().slice(0, 10),
            })),
            contradictions: (wr.risks ?? []).slice(0, 3).map((r: any) => ({
              claim: typeof r === "string" ? r : r.title ?? r.risk ?? String(r),
              evidence: typeof r === "string" ? "" : r.description ?? r.mitigation ?? "",
            })),
            nextActions: (wr.nextSteps ?? []).slice(0, 4).map((s: any) => ({
              action: typeof s === "string" ? s : s.step ?? s.action ?? String(s),
            })),
            nextQuestions: [
              "What should I prioritize this week?",
              "What risks need immediate attention?",
              "What changed that I should know about?",
            ],
            rawPacket: wr,
          };
          break;
        }

        case "pre_delegation":
        case "important_change": {
          const t = traceStep("tool_call", "founder_local_synthesize");
          const raw = await callTool("founder_local_synthesize", {
            query: query.trim(),
            packetType: classification.type,
            daysBack: daysBack ?? 7,
          }) as any;
          if (raw?.error) t.error(raw.message); else t.ok();
          const sp = raw?.error ? {} : (raw ?? {});
          let liveSources: Array<{ title: string; url: string; snippet: string }> = [];
          if (classification.entity) {
            const liveTrace = traceStep("tool_call", "linkup_search");
            const liveSearch = await linkupSearch(
              `${classification.entity} company updates last ${daysBack ?? 7} days ${new Date().getFullYear()}`,
              5,
            );
            if (liveSearch && liveSearch.sources.length > 0) {
              liveSources = liveSearch.sources.map((source) => ({
                title: source.name || classification.entity || "Source",
                url: source.url,
                snippet: source.snippet,
              }));
              liveTrace.ok(`${liveSources.length} live sources`);
            } else {
              liveTrace.skip("no live sources");
              const webTrace = traceStep("tool_call", "web_search");
              const webSearch = await callTool("web_search", {
                query: `${classification.entity} company updates last ${daysBack ?? 7} days ${new Date().getFullYear()}`,
                maxResults: 5,
              }) as any;
              const webResults = (webSearch?.results ?? [])
                .map((item: any) => ({
                  title: item.title ?? item.name ?? classification.entity ?? "Source",
                  url: item.url ?? "",
                  snippet: item.snippet ?? item.description ?? "",
                }))
                .filter((item: { url: string }) => Boolean(item.url));
              if (webResults.length > 0) {
                liveSources = webResults;
                webTrace.ok(`${webResults.length} fallback sources`);
              } else {
                webTrace.skip("no fallback sources");
              }
            }
          }
          const spLabel = classification.type === "pre_delegation" ? "Delegation Packet" : "Recent Changes";
          const spMission = sp.summary ?? sp.overview ?? `${spLabel} — ${query.trim().slice(0, 100)}`;
          // Map all possible field names from the synthesize tool
          const spFindings = sp.keyFindings ?? sp.signals ?? sp.metrics ?? sp.key_findings ?? [];
          const spChanges = sp.keyFindings ?? sp.changes ?? sp.whatChanged ?? sp.key_findings ?? [];
          const spRisks = sp.risks ?? sp.contradictions ?? [];
          const spNext = sp.nextSteps ?? sp.actions ?? sp.next_steps ?? [];

          result = {
            canonicalEntity: {
              name: classification.entity ?? spLabel,
              canonicalMission: spMission.length > 20 ? spMission : `${spLabel}: synthesized from local context for the last ${daysBack ?? 7} days. Ask follow-up questions to drill deeper.`,
              identityConfidence: (sp.confidence ?? 0.70) > 1 ? sp.confidence : Math.round((sp.confidence ?? 0.70) * 100),
            },
            signals: spFindings.length > 0
              ? spFindings.slice(0, 5).map((f: any, i: number) => ({
                  name: typeof f === "string" ? f : f.finding ?? f.title ?? f.label ?? String(f),
                  direction: "neutral", impact: i < 2 ? "high" : "medium",
                }))
              : [
                  { name: `${spLabel} generated from local context`, direction: "neutral", impact: "high" },
                  { name: `${daysBack ?? 7}-day analysis window`, direction: "neutral", impact: "medium" },
                ],
            whatChanged: spChanges.length > 0
              ? spChanges.slice(0, 5).map((f: any) => ({
                  description: typeof f === "string" ? f : f.finding ?? f.description ?? String(f),
                  date: new Date().toISOString().slice(0, 10),
                }))
              : [{ description: `${spLabel} synthesized for the last ${daysBack ?? 7} days`, date: new Date().toISOString().slice(0, 10) }],
            contradictions: spRisks.length > 0
              ? spRisks.slice(0, 3).map((r: any) => ({
                  claim: typeof r === "string" ? r : r.title ?? r.risk ?? String(r),
                  evidence: typeof r === "string" ? "" : r.description ?? r.mitigation ?? "",
                }))
              : [{ claim: "No contradictions detected in this period", evidence: "Upload more context or extend the analysis window for deeper risk detection." }],
            nextActions: spNext.length > 0
              ? spNext.slice(0, 4).map((s: any) => ({ action: typeof s === "string" ? s : s.step ?? s.action ?? String(s) }))
              : [{ action: "Review the synthesized packet and identify action items" }, { action: "Upload additional context for richer analysis" }],
            nextQuestions: classification.type === "pre_delegation"
              ? ["What should the agent prioritize?", "What context does the agent need?", "What are the success criteria?"]
              : ["What changed that matters most?", "What contradictions surfaced?", "What should I act on first?"],
            ...(liveSources.length > 0
              ? {
                  sourcesUsed: liveSources.map((source, index) => ({
                    id: `source:${index + 1}`,
                    title: source.title,
                    url: source.url,
                    excerpt: source.snippet,
                    type: "web",
                    status: "cited",
                  })),
                }
              : {}),
            rawPacket: sp,
          };
          break;
        }

        case "plan_proposal": {
          const planTrace = traceStep("tool_call", "synthesize_feature_plan");
          const planRaw = await callTool("synthesize_feature_plan", {
            feature: query.trim(),
            entity: classification.entity,
          }) as any;
          if (planRaw?.error) planTrace.error(planRaw.error); else planTrace.ok();
          const plan = planRaw?.plan ?? planRaw ?? {};
          result = {
            canonicalEntity: {
              name: plan.title ?? "Plan Proposal",
              canonicalMission: plan.summary ?? `Plan synthesis for: ${query.trim()}`,
              identityConfidence: Math.round((plan.strategicFit?.wedgeAlignment ?? 0.5) * 100),
            },
            signals: (plan.phases ?? []).slice(0, 5).map((p: any, i: number) => ({
              name: `Phase ${p.id ?? i + 1}: ${p.title ?? "Untitled"}`,
              direction: "neutral",
              impact: i === 0 ? "high" : "medium",
            })),
            whatChanged: (plan.codebaseReadiness ?? []).slice(0, 5).map((r: any) => ({
              description: `${r.capability}: ${r.status}${r.notes ? ` — ${r.notes}` : ""}`,
              date: new Date().toISOString().slice(0, 10),
            })),
            contradictions: (plan.risks ?? []).slice(0, 5).map((r: any) => ({
              claim: r.title ?? "Risk",
              evidence: r.mitigation ?? "",
              severity: r.severity ?? "medium",
            })),
            nextActions: [
              { action: "Review strategic fit and phase sequencing" },
              { action: "Generate a proposal memo for stakeholder review" },
              { action: "Delegate phase 1 to an agent for implementation" },
            ],
            nextQuestions: [
              "What constraints should the plan respect?",
              "Which phase should we start with?",
              "Should we delegate this to an agent?",
              "What competitors are building something similar?",
            ],
            rawPacket: plan,
            packetType: "plan_proposal",
          };
          break;
        }

        case "multi_entity": {
          const entities = classification.entities ?? [];
          const entityNames = entities.slice(0, 4); // Cap at 4 entities

          // Run Linkup search for each entity in parallel (primary), web_search as fallback
          const multiLinkupTrace = traceStep("tool_call", `linkup_search x${entityNames.length}`);
          const entityResults = await Promise.all(
            entityNames.map(async (eName) => {
              try {
                // Try Linkup first
                const linkup = await linkupSearch(`${eName} company overview strategy ${new Date().getFullYear()}`, 3);
                if (linkup && (linkup.answer.length > 20 || linkup.sources.length > 0)) {
                  return {
                    name: eName,
                    answer: linkup.answer,
                    snippets: linkup.sources.map(s => s.snippet).filter(Boolean),
                    sources: linkup.sources.map(s => s.url).filter(Boolean),
                    resultCount: linkup.sources.length,
                  };
                }
                // Fallback to web_search
                const webRes = await Promise.race([
                  callTool("web_search", { query: `${eName} company overview strategy ${new Date().getFullYear()}`, maxResults: 3 }),
                  new Promise(resolve => setTimeout(() => resolve(null), 6_000)),
                ]) as any;
                const snippets = (webRes?.results ?? []).map((r: any) => r.snippet ?? r.description ?? "").filter(Boolean);
                return { name: eName, answer: "", snippets, sources: (webRes?.results ?? []).map((r: any) => r.url).filter(Boolean), resultCount: webRes?.resultCount ?? 0 };
              } catch { return { name: eName, answer: "", snippets: [], sources: [], resultCount: 0 }; }
            })
          );
          multiLinkupTrace.ok(`${entityResults.reduce((s, e) => s + e.resultCount, 0)} total results`);

          // Use Gemini to produce a comparative analysis
          let comparison: any = null;
          if (process.env.GEMINI_API_KEY) {
            const extractTrace = traceStep("llm_extract", "gemini-3.1-flash-lite-preview");
            try {
              const entityContext = entityResults.map(e => `## ${e.name}\n${e.answer ? e.answer.slice(0, 400) + "\n" : ""}${e.snippets.slice(0, 2).join("\n")}`).join("\n\n");
              const geminiResp = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${process.env.GEMINI_API_KEY}`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    contents: [{ parts: [{ text: `Compare these ${entityNames.length} entities for a ${resolvedLens} audience. Original query: "${query}"

${entityContext}

Return ONLY valid JSON:
{
  "summary": "2-3 sentence comparative overview",
  "entities": [{"name": "entity name", "description": "1-sentence description", "strengths": ["str1"], "risks": ["risk1"]}],
  "signals": [{"name": "comparative signal", "direction": "up|down|neutral", "impact": "high|medium|low"}],
  "changes": [{"description": "recent change affecting these entities", "date": null}],
  "risks": [{"title": "comparative risk", "description": "description"}],
  "keyDifferences": ["difference 1", "difference 2"]
}` }] }],
                    generationConfig: { temperature: 0.1, maxOutputTokens: 2000, responseMimeType: "application/json" },
                  }),
                  signal: AbortSignal.timeout(10_000),
                },
              );
              if (geminiResp.ok) {
                const gJson = await geminiResp.json() as any;
                const gText = gJson?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (gText) {
                  const cleaned = gText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
                  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
                  if (jsonMatch) comparison = JSON.parse(jsonMatch[0].replace(/,\s*([\]}])/g, "$1"));
                }
              }
              extractTrace.ok(`extracted ${comparison ? "ok" : "empty"}`);
            } catch { extractTrace.error("gemini comparison failed"); }
          }

          const cmp = comparison ?? {};
          const allSources = entityResults.flatMap(e => e.sources).slice(0, 8);
          const totalResults = entityResults.reduce((s, e) => s + e.resultCount, 0);

          result = {
            canonicalEntity: {
              name: entityNames.join(" vs "),
              canonicalMission: cmp.summary ?? `Comparative analysis of ${entityNames.join(", ")}. ${(cmp.keyDifferences ?? []).slice(0, 2).join(". ")}`,
              identityConfidence: Math.min(90, 40 + totalResults * 2 + (comparison ? 25 : 0)),
            },
            memo: true,
            whatChanged: (cmp.changes ?? []).slice(0, 5).map((c: any) => ({
              description: c.description ?? String(c),
              date: c.date ?? new Date().toISOString().slice(0, 10),
            })),
            signals: (cmp.signals ?? []).slice(0, 6).map((s: any, i: number) => ({
              name: s.name ?? `Signal ${i + 1}`,
              direction: s.direction ?? "neutral",
              impact: s.impact ?? (i < 2 ? "high" : "medium"),
            })),
            contradictions: (cmp.risks ?? []).slice(0, 4).map((r: any) => ({
              claim: r.title ?? String(r),
              evidence: r.description ?? "",
            })),
            comparables: (cmp.entities ?? entityResults).slice(0, 4).map((e: any) => ({
              name: e.name,
              relevance: "high",
              note: e.description ?? (e.strengths ?? []).join(", "),
            })),
            keyMetrics: (cmp.keyDifferences ?? []).slice(0, 4).map((d: any, i: number) => ({
              label: `Difference ${i + 1}`,
              value: typeof d === "string" ? d : String(d),
            })),
            nextActions: [
              { action: `Deep-dive into ${entityNames[0]} vs ${entityNames[1] ?? entityNames[0]} head-to-head` },
              { action: `Map the competitive dynamics between ${entityNames.join(", ")}` },
              { action: `Monitor all ${entityNames.length} entities for material changes` },
              { action: `Build a decision memo choosing between these options` },
            ],
            nextQuestions: entityNames.slice(0, 3).map(n => `What are ${n}'s key competitive advantages?`).concat(
              [`How do these ${entityNames.length} entities compare on risk?`]
            ),
            webSources: allSources,
          };
          break;
        }

        case "company_search":
        case "competitor": {
          const entityName = classification.entity ?? query.trim().split(/\s+/).slice(0, 3).join(" ");

          // Run Linkup (primary) + web_search (fallback) + recon + local context in parallel
          const linkupTrace = traceStep("tool_call", "linkup_search");
          const webTrace = traceStep("tool_call", "web_search");
          const reconTrace = traceStep("tool_call", "run_recon");
          const gatherTrace = traceStep("tool_call", "founder_local_gather");
          const [linkupResult, webResult, reconResult, localCtx] = await Promise.all([
            linkupSearch(`${entityName} company overview strategy funding competitive position ${new Date().getFullYear()}`, 5)
              .then(r => { linkupTrace.ok(`${r ? r.sources.length + " sources" : "null"}`); return r; })
              .catch(() => { linkupTrace.error("linkup failed"); return null; }),
            Promise.race([
              callTool("web_search", {
                query: `${entityName} company overview strategy funding ${new Date().getFullYear()}`,
                maxResults: 5,
              }),
              new Promise(resolve => setTimeout(() => resolve(null), 8_000)),
            ]).then(r => { webTrace.ok(`${(r as any)?.resultCount ?? 0} results`); return r; }).catch(() => { webTrace.error("web_search failed"); return null; }),
            callTool("run_recon", {
              target: entityName,
              focus: query.trim(),
            }).then(r => { reconTrace.ok(); return r; }).catch(() => { reconTrace.error("recon failed"); return null; }),
            callTool("founder_local_gather", { daysBack: daysBack ?? 7 }).then(r => { gatherTrace.ok(); return r; }).catch(() => { gatherTrace.error("gather failed"); return null; }),
          ]);

          const web = webResult as any;
          const recon = reconResult as any;
          const local = localCtx as any;

          // Extract data from Linkup (primary) and web search (fallback)
          const linkupAnswer = linkupResult?.answer ?? "";
          const linkupSources = (linkupResult?.sources ?? []).map(s => s.url).filter(Boolean);
          const linkupSnippets = (linkupResult?.sources ?? []).map(s => s.snippet).filter(Boolean);

          const webResults = web?.results ?? [];
          const webSnippets = webResults.map((r: any) => r.snippet ?? r.description ?? "").filter(Boolean);
          const webSources = webResults.map((r: any) => r.url ?? r.link).filter(Boolean);

          // Merge sources: Linkup first (richer), then web_search
          const allSnippets = [...linkupSnippets, ...webSnippets].slice(0, 8);
          const allSrcUrls = [...new Set([...linkupSources, ...webSources])].slice(0, 8);
          const bestSummary = linkupAnswer || allSnippets.slice(0, 3).join(" ").slice(0, 800);

          // Extract data from recon
          const reconSources = recon?.plan?.sources ?? recon?.sources ?? [];
          const reconFindings = recon?.findings ?? [];
          const competitors = recon?.competitors ?? recon?.comparables ?? [];

          // Use Gemini to extract structured entity intelligence from Linkup + web results
          let geminiExtracted: any = null;
          const hasSearchData = linkupAnswer.length > 20 || allSnippets.length > 0;
          if (hasSearchData && process.env.GEMINI_API_KEY) {
            const extractTrace = traceStep("llm_extract", "gemini-3.1-flash-lite-preview");
            try {
              const geminiResp = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${process.env.GEMINI_API_KEY}`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    contents: [{ parts: [{ text: `You are an entity intelligence analyst. Extract SPECIFIC, FACTUAL intelligence about "${entityName}" from these web search results. The user is a ${resolvedLens}. Original query: "${query}"

${resolvedLens === "investor" ? "Focus on: valuation, funding rounds, revenue, growth metrics, competitive moat, market size, team quality." :
  resolvedLens === "banker" ? "Focus on: deal relevance, financial metrics, M&A activity, capital structure, regulatory exposure." :
  resolvedLens === "legal" ? "Focus on: regulatory risks, compliance, litigation, IP, governance issues." :
  resolvedLens === "founder" ? "Focus on: product strategy, competitive positioning, go-to-market, hiring signals, technology stack." :
  resolvedLens === "student" ? "Focus on: company overview, industry context, key products, career relevance." :
  "Focus on: competitive positioning, market strategy, key metrics, risks."}

RESEARCH CONTEXT:
${linkupAnswer ? `LINKUP ANSWER:\n${linkupAnswer.slice(0, 1200)}\n\n` : ""}WEB RESULTS:
${allSnippets.slice(0, 5).join("\n\n")}

RULES:
- ONLY include facts that appear in the web results above. Do NOT invent numbers, dates, or claims.
- Every signal should reference something from the web results. If the web results lack data, include fewer signals rather than inventing them.
- Every risk MUST be specific to ${entityName} (not generic industry risks)
- Summary MUST describe what ${entityName} actually does based on the web results
- If the web results are thin, return fewer items rather than hallucinating

Return ONLY valid JSON:
{
  "summary": "2-3 sentence factual description of ${entityName} — what they do, key metrics, current position",
  "signals": [{"name": "signal grounded in web results above", "direction": "up|down|neutral", "impact": "high|medium|low"}],
  "changes": [{"description": "recent event from web results", "date": "YYYY-MM-DD or null"}],
  "risks": [{"title": "risk specific to ${entityName}", "description": "evidence from web results"}],
  "comparables": [{"name": "competitor name", "relevance": "high|medium|low", "note": "why relevant"}],
  "metrics": [{"label": "metric name", "value": "specific value from web results"}]
}` }] }],
                    generationConfig: { temperature: 0.1, maxOutputTokens: 1500, responseMimeType: "application/json" },
                  }),
                  signal: AbortSignal.timeout(10_000),
                },
              );
              if (geminiResp.ok) {
                const gJson = await geminiResp.json() as any;
                const gText = gJson?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (gText) {
                  const cleaned = gText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
                  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
                  if (jsonMatch) {
                    geminiExtracted = JSON.parse(jsonMatch[0].replace(/,\s*([\]}])/g, "$1"));
                  }
                }
              }
              extractTrace.ok(`extracted ${geminiExtracted ? "ok" : "empty"}`);
            } catch { extractTrace.error("gemini extraction failed"); }
          }

          // ── Layer 1: Retrieval confidence threshold ──
          // If we have <3 snippets, the data is too thin for reliable extraction
          const retrievalConfidence = allSnippets.length >= 3 ? "high" : allSnippets.length >= 1 ? "medium" : "low";

          // Merge all sources: gemini extracted > recon > web > defaults
          const ge = geminiExtracted ?? {};

          // ── Layer 2: Claim-level grounding verification ──
          // Check each extracted signal/risk against source snippets
          const sourceText = allSnippets.join(" ").toLowerCase();
          function isGrounded(claim: string): boolean {
            if (!claim || sourceText.length < 50) return true; // skip if no sources to check against
            const words = claim.toLowerCase().split(/\s+/).filter(w => w.length > 4);
            if (words.length === 0) return true;
            const matched = words.filter(w => sourceText.includes(w));
            // Lenient: only reject claims with ZERO word overlap (truly invented)
            // The Gemini judge handles nuanced verification — this is just a coarse filter
            return matched.length >= 1;
          }

          // Filter signals — only keep grounded ones, then fill with source-derived fallbacks
          const rawSignals = (ge.signals ?? []).slice(0, 8);
          const groundedSignals = rawSignals.filter((s: any) => isGrounded(s.name ?? ""));
          const ungroundedCount = rawSignals.length - groundedSignals.length;

          const mergedSignals = groundedSignals.slice(0, 5).map((s: any, i: number) => ({
            name: s.name ?? `${entityName} signal ${i + 1}`,
            direction: s.direction ?? "neutral",
            impact: s.impact ?? (i < 2 ? "high" : "medium"),
            // ── Layer 4: Citation chain — attach source index ──
            sourceIdx: allSnippets.findIndex(sn => {
              const words = (s.name ?? "").toLowerCase().split(/\s+/).filter((w: string) => w.length > 4);
              return words.some((w: string) => sn.toLowerCase().includes(w));
            }),
          }));

          const mergedChanges = (ge.changes ?? []).slice(0, 5)
            .filter((c: any) => isGrounded(c.description ?? String(c)))
            .map((c: any) => ({
              description: c.description ?? String(c),
              date: c.date ?? new Date().toISOString().slice(0, 10),
              sourceIdx: allSnippets.findIndex(sn => {
                const words = (c.description ?? "").toLowerCase().split(/\s+/).filter((w: string) => w.length > 4);
                return words.some((w: string) => sn.toLowerCase().includes(w));
              }),
            }));

          const mergedRisks = (ge.risks ?? []).slice(0, 3)
            .filter((r: any) => isGrounded(r.title ?? r.description ?? String(r)))
            .map((r: any) => ({
              claim: r.title ?? r.claim ?? String(r),
              evidence: r.description ?? r.evidence ?? "",
              sourceIdx: allSnippets.findIndex(sn => {
                const words = (r.title ?? r.description ?? "").toLowerCase().split(/\s+/).filter((w: string) => w.length > 4);
                return words.some((w: string) => sn.toLowerCase().includes(w));
              }),
            }));

          const mergedComparables = (ge.comparables ?? competitors).slice(0, 4).map((c: any) => ({
            name: typeof c === "string" ? c : c.name ?? String(c),
            relevance: c.relevance ?? "medium",
            note: typeof c === "string" ? "" : c.note ?? c.description ?? "",
          }));

          const mergedMetrics = (ge.metrics ?? []).slice(0, 6)
            .filter((m: any) => isGrounded(`${m.label} ${m.value}`))
            .map((m: any) => ({
              label: m.label ?? "Metric",
              value: String(m.value ?? "N/A"),
            }));

          // Fallback signals only if gemini + recon both empty
          const finalSignals = mergedSignals.length > 0 ? mergedSignals
            : reconSources.slice(0, 4).map((s: any, i: number) => ({
                name: typeof s === "string" ? s : s.name ?? String(s),
                direction: "neutral", impact: i < 2 ? "high" : "medium",
              }));
          const finalChanges = mergedChanges.length > 0 ? mergedChanges
            : reconFindings.slice(0, 5).map((f: any) => ({
                description: typeof f === "string" ? f : f.summary ?? String(f),
                date: new Date().toISOString().slice(0, 10),
              }));
          const finalRisks = mergedRisks.length > 0 ? mergedRisks
            : [{ claim: `${entityName} data is limited — ${retrievalConfidence === "low" ? "no web sources found" : "web sources were thin"}`, evidence: `Retrieved ${allSnippets.length} source snippets. Upload ${entityName}-related documents or run deeper research for risk analysis.` }];

          // Use retrieval confidence for summary quality
          const entitySummary = ge.summary ?? recon?.summary ?? recon?.overview
            ?? (bestSummary ? `${entityName}: ${bestSummary.slice(0, 400)}` : `${entityName} entity profile. ${retrievalConfidence === "low" ? "No web sources available — upload documents or connect agents." : ""}`);

          const confidence = Math.min(95, 40 + (linkupAnswer ? 15 : 0) + allSrcUrls.length * 2 + (geminiExtracted ? 20 : 0) + reconFindings.length * 5
            - (ungroundedCount * 3)); // Penalize ungrounded claims

          result = {
            canonicalEntity: {
              name: entityName,
              canonicalMission: entitySummary,
              identityConfidence: confidence,
            },
            memo: true,
            whatChanged: finalChanges.length > 0 ? finalChanges : [{ description: `${entityName} profile created from ${allSrcUrls.length} web sources${linkupAnswer ? " (Linkup enriched)" : ""}`, date: new Date().toISOString().slice(0, 10) }],
            signals: finalSignals.length > 0 ? finalSignals : [{ name: `${entityName} analysis in progress`, direction: "neutral", impact: "high" }],
            contradictions: finalRisks,
            comparables: mergedComparables,
            keyMetrics: mergedMetrics,
            nextActions: [
              { action: `Deep-dive ${entityName}'s financials and unit economics` },
              { action: `Map ${entityName}'s competitive landscape` },
              { action: `Monitor ${entityName} for material changes` },
              { action: `Compare ${entityName} to closest competitors` },
            ],
            nextQuestions: [
              `What are ${entityName}'s key competitive advantages?`,
              `How does ${entityName} compare to its closest competitors?`,
              `What are the main risks facing ${entityName}?`,
              `What changed for ${entityName} in the last quarter?`,
            ],
            webSources: allSrcUrls.slice(0, 8),
            // ── Grounding metadata for judge + user verification ──
            grounding: {
              retrievalConfidence,
              snippetCount: allSnippets.length,
              sourceCount: allSrcUrls.length,
              groundedSignals: mergedSignals.length,
              ungroundedFiltered: ungroundedCount,
              sourceSnippets: allSnippets.slice(0, 5).map((s, i) => ({ idx: i, text: s.slice(0, 200), url: allSrcUrls[i] ?? "" })),
            },
            localContext: local,
          };
          break;
        }

        default: {
          // General query — gather local context + optional web enrichment for
          // scenario/temporal/cross-domain queries that need external data
          const lqGeneral = query.trim().toLowerCase();
          const companyMode = detectFounderCompanyMode({
            query: query.trim(),
            hasPrivateContext: resolvedLens === "founder",
          });
          const needsWebEnrichment = /\b(what happens|what if|simulate|scenario|regulatory|funding rounds|defense|banks|healthcare|fintech|climate|supply chain|industry|sector|market|last week|this quarter|since january|past year|next \d|Q[1-4]|20\d{2})\b/i.test(lqGeneral);

          const gt = traceStep("tool_call", "founder_local_gather");
          const [gather, webEnrich] = await Promise.all([
            callTool("founder_local_gather", { daysBack: daysBack ?? 7 }).then(r => { gt.ok(); return r; }).catch(() => { gt.error(); return null; }),
            needsWebEnrichment ? (async () => {
              const wt = traceStep("tool_call", "web_search");
              try {
                const r = await Promise.race([
                  callTool("web_search", { query: query.trim().slice(0, 200), maxResults: 5 }),
                  new Promise(resolve => setTimeout(() => resolve(null), 8_000)),
                ]) as any;
                wt.ok(`${r?.resultCount ?? 0} results`);
                return r;
              } catch { wt.error(); return null; }
            })() : Promise.resolve(null),
          ]);
          const g = (gather ?? {}) as any;
          const webGen = webEnrich as any;

          // Extract web snippets for enrichment
          const genWebSnippets = (webGen?.results ?? []).map((r: any) => r.snippet ?? "").filter(Boolean);
          const genWebSources = (webGen?.results ?? []).map((r: any) => r.url ?? "").filter(Boolean);

          // If we have web data, use Gemini to extract structured analysis
          let genGemini: any = null;
          if (genWebSnippets.length >= 2 && process.env.GEMINI_API_KEY) {
            const ext = traceStep("llm_extract", "gemini-3.1-flash-lite-preview");
            try {
              const resp = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${process.env.GEMINI_API_KEY}`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    contents: [{ parts: [{ text: `Analyze this query and web data. User is a ${resolvedLens}. Query: "${query.trim()}"

WEB DATA:
${genWebSnippets.slice(0, 4).join("\n\n")}

Return ONLY valid JSON with:
{
  "summary": "2-3 sentence analysis addressing the query directly",
  "signals": [{"name": "key insight from web data", "direction": "up|down|neutral", "impact": "high|medium|low"}],
  "changes": [{"description": "relevant recent development", "date": "YYYY-MM-DD or null"}],
  "risks": [{"title": "risk or concern", "description": "evidence"}],
  "nextActions": [{"action": "recommended next step"}]
}

RULES: Only include facts grounded in the web data. If data is thin, return fewer items.` }] }],
                    generationConfig: { temperature: 0.1, maxOutputTokens: 1200, responseMimeType: "application/json" },
                  }),
                  signal: AbortSignal.timeout(10_000),
                },
              );
              if (resp.ok) {
                const j = await resp.json() as any;
                const t = j?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (t) {
                  const c = t.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
                  const m = c.match(/\{[\s\S]*\}/);
                  if (m) genGemini = JSON.parse(m[0].replace(/,\s*([\]}])/g, "$1"));
                }
              }
              ext.ok(genGemini ? "ok" : "empty");
            } catch { ext.error("extraction failed"); }
          }

          // Merge: Gemini web analysis > local context > defaults
          const gg = genGemini ?? {};
          const gChanges = (gg.changes ?? g.recentActions ?? g.changes ?? []).slice(0, 5).map((a: any) => ({
            description: typeof a === "string" ? a : a.description ?? a.action ?? String(a),
            date: a.date ?? a.timestamp ?? new Date().toISOString().slice(0, 10),
          }));
          const gSignals = (gg.signals ?? g.signals ?? g.milestones ?? []).slice(0, 5).map((s: any, i: number) => ({
            name: typeof s === "string" ? s : s.name ?? s.title ?? String(s),
            direction: s.direction ?? "neutral",
            impact: s.impact ?? (i < 2 ? "high" : "medium"),
          }));
          const gContradictions = (gg.risks ?? g.contradictions ?? []).slice(0, 3).map((c: any) => ({
            claim: typeof c === "string" ? c : c.claim ?? c.title ?? String(c),
            evidence: typeof c === "string" ? "" : c.evidence ?? c.description ?? "",
          }));
          const gActions = (gg.nextActions ?? g.nextActions ?? g.pendingActions ?? []).slice(0, 4).map((a: any) => ({
            action: typeof a === "string" ? a : a.action ?? a.title ?? String(a),
          }));

          const genSummary = gg.summary ?? g.company?.canonicalMission ?? g.summary
            ?? (genWebSnippets.length > 0 ? genWebSnippets.slice(0, 2).join(" ").slice(0, 400) : `Workspace intelligence for: "${query.trim()}". Upload documents, connect agents, or search specific entities for deeper results.`);
          const companyName =
            normalizeWorkspaceName(g.company?.name)
            ?? normalizeWorkspaceName(g.companyReadinessPacket?.identity?.companyName)
            ?? normalizeWorkspaceName(g.identity?.projectName)
            ?? normalizeWorkspaceName(g.publicSurfaces?.indexHtmlSiteName)
            ?? normalizeWorkspaceName(extractBrandPrefix(g.publicSurfaces?.indexHtmlTitle))
            ?? normalizeWorkspaceName(g.identity?.packageName)
            ?? (companyMode === "own_company" ? "Your Company" : "Your Workspace");
          const founderSummary = companyMode === "own_company"
            ? (gg.summary
              ?? g.company?.canonicalMission
              ?? g.summary
              ?? `Founder operating view for ${companyName}. This run should end in the next three moves, the main contradiction, and what still needs evidence before wider sharing.`)
            : genSummary;

          result = {
            canonicalEntity: {
              name: companyName,
              canonicalMission: founderSummary,
              identityConfidence: g.company?.identityConfidence ?? (genGemini ? 65 : 50),
            },
            memo: true,
            whatChanged: gChanges.length > 0 ? gChanges : [
              { description: `Query received: "${query.trim().slice(0, 60)}"`, date: new Date().toISOString().slice(0, 10) },
            ],
            signals: gSignals.length > 0 ? gSignals : [
              { name: companyMode === "own_company" ? "Current founder/company context" : "Current workspace context", direction: "neutral", impact: "high" },
              { name: "Agent connection status", direction: "neutral", impact: "medium" },
            ],
            contradictions: gContradictions.length > 0 ? gContradictions : [
              {
                claim: companyMode === "own_company" ? "Founder packet still needs more private evidence" : "Limited context available",
                evidence: companyMode === "own_company"
                  ? "This own-company run should gather stronger local context, current contradictions, and one reusable packet before broad sharing."
                  : "General queries work best with local context. Try a founder weekly reset or search a specific entity for richer results.",
              },
            ],
            nextActions: gActions.length > 0 ? gActions : [
              ...(companyMode === "own_company"
                ? [
                    { action: "Generate one founder progression packet and use it in a real decision this week" },
                    { action: "Resolve the main contradiction before widening sharing or delegation" },
                    { action: "Export the Slack one-page report only after the moat and evidence story are clearer" },
                  ]
                : [
                    { action: "Generate a founder weekly reset for structured insights" },
                    { action: "Search a specific company for entity intelligence" },
                    { action: "Upload documents to build your knowledge base" },
                  ]),
            ],
            nextQuestions: [
              "Generate my founder weekly reset — what changed, main contradiction, next 3 moves",
              "What are the most important changes in the last 7 days?",
              "Build a pre-delegation packet for my agent",
            ],
            ...(genWebSources.length > 0 ? { webSources: genWebSources.slice(0, 5) } : {}),
          };
        }
      }

      // Track the search as an action
      await callTool("track_action", {
        action: `Search: ${query.trim().slice(0, 80)}`,
        category: "research",
        impact: "moderate",
      }).catch(() => {}); // Non-fatal

      // Auto-judge every search result (non-blocking — runs async, result included if fast enough)
      const founderDirectionTool = findTool("founder_direction_assessment");
      if (founderDirectionTool && shouldRunFounderDirectionAssessment({
        query: query.trim(),
        lens: resolvedLens,
        classification: classification.type,
      })) {
        const directionTrace = traceStep("tool_call", "founder_direction_assessment");
        try {
          const directionAssessment = await callTool("founder_direction_assessment", {
            query: query.trim(),
            lens: resolvedLens,
            daysBack: daysBack ?? 14,
            marketWorkflow: ["Claude Code", "NodeBench MCP", "team dashboard"],
          }) as any;
          result = mergeFounderDirectionAssessment(result, directionAssessment);
          directionTrace.ok(`angles=${directionAssessment?.strategicAngles?.length ?? 0}`);
        } catch (error: any) {
          directionTrace.error(error?.message ?? "direction assessment failed");
        }
      }

      // Auto-judge every search result (non-blocking — runs async, result included if fast enough)
      let judgeVerdict: any = null;
      try {
        const judge = await getJudge();
        if (judge) {
          const toolName = classification.type === "weekly_reset" ? "founder_local_weekly_reset"
            : classification.type === "pre_delegation" || classification.type === "important_change" ? "founder_local_synthesize"
            : classification.type === "plan_proposal" ? "synthesize_feature_plan"
            : classification.type === "company_search" || classification.type === "competitor" ? "run_recon"
            : "founder_local_gather";

          const verdict = await judge({
            scenarioId: `app_${classification.type}`,
            prompt: query.trim(),
            toolName,
            result,
          });
          judgeVerdict = {
            verdict: verdict.verdict,
            score: verdict.score,
            failingCriteria: verdict.criteria?.filter((c: any) => !c.pass).map((c: any) => c.criterion) ?? [],
            fixSuggestions: verdict.fixSuggestions ?? [],
          };
        }
      } catch { /* judge failure is non-fatal */ }

      const latencyMs = Date.now() - startMs;

      const packetId = genId("artifact");
      const proof = decorateResultWithProof({
        query: query.trim(),
        lens: resolvedLens,
        classification: classification.type,
        result,
        judgeVerdict,
        packetId,
      });
      result = proof.result;
      const normalizedIdentity = normalizeFounderIdentity({
        query: query.trim(),
        lens: resolvedLens,
        classification: classification.type,
        result,
      });
      const effectiveClassification = normalizedIdentity.classification;
      if (normalizedIdentity.entityName) {
        result = {
          ...result,
          canonicalEntity: {
            ...(typeof result?.canonicalEntity === "object" ? result.canonicalEntity : {}),
            name: normalizedIdentity.entityName,
          },
        };
      }
      result.packetType = normalizedIdentity.packetType;

      // Finalize trace
      const assembleTrace = traceStep("assemble_response");
      assembleTrace.ok(`latency=${latencyMs}ms`);

      // ── Save session context for multi-turn follow-ups ──
      const entityName = result?.canonicalEntity?.name ?? normalizedIdentity.entityName ?? classification.entity ?? "";
      if (entityName) {
        setSessionContext(sessionKey, entityName, effectiveClassification, result);
      }

      // ── Ambient intelligence feedback loop ──
      // Feed search results back into local knowledge for compounding.
      // Non-blocking — fire and forget so it doesn't slow the response.
      if (entityName && (classification.type === "company_search" || classification.type === "multi_entity" || classification.type === "competitor")) {
        const enrichTool = findTool("enrich_entity");
        if (enrichTool) {
          const signals = (result?.signals ?? []).map((s: any) => s.name).join("; ");
          const risks = (result?.contradictions ?? []).map((r: any) => r.claim).join("; ");
          enrichTool.handler({
            entityName,
            entityType: "company",
            data: JSON.stringify({
              summary: result?.canonicalEntity?.canonicalMission?.slice(0, 500) ?? "",
              signals: signals.slice(0, 300),
              risks: risks.slice(0, 300),
              sourceCount: result?.webSources?.length ?? 0,
              searchedAt: new Date().toISOString(),
              lens: resolvedLens,
            }),
          }).catch(() => {}); // non-blocking
        }
      }

      let persistedIds: { runId: string; traceId: string; packetId: string; outcomeId: string } | null = null;
      try {
        persistedIds = persistSearchRun({
          query: query.trim(),
          lens: resolvedLens,
          persona: proof.persona,
          classification: effectiveClassification,
          result,
          packet: proof.packet,
          trace,
          judgeVerdict,
          contextBundle,
          latencyMs,
          sessionKey,
        });
      } catch (persistError) {
        console.error("[search] failed to persist founder-first run", persistError);
      }

      // Use the pre-computed contextBundle (computed before dispatch)
      const payload = {
        success: true,
        classification: effectiveClassification,
        lens: resolvedLens,
        entity: classification.entity ?? null,
        latencyMs,
        result,
        resultPacket: proof.packet,
        runId: persistedIds?.runId ?? null,
        traceId: persistedIds?.traceId ?? null,
        packetId: persistedIds?.packetId ?? result.packetId ?? null,
        outcomeId: persistedIds?.outcomeId ?? null,
        judge: judgeVerdict,
        // Execution trace — every step timestamped for trajectory visualization
        trace: trace.map(t => ({
          step: t.step,
          tool: t.tool,
          durationMs: t.endMs ? t.endMs - t.startMs : 0,
          status: t.status,
          detail: t.detail,
        })),
        context: {
          pinned: {
            mission: contextBundle.pinned.canonicalMission,
            wedge: contextBundle.pinned.wedge,
            confidence: contextBundle.pinned.identityConfidence,
            contradictions: contextBundle.pinned.activeContradictions.length,
            sessionActions: contextBundle.pinned.sessionActionCount,
            lastPacket: contextBundle.pinned.lastPacketSummary,
          },
          injected: {
            weeklyReset: contextBundle.injected.weeklyResetSummary,
            milestones: contextBundle.injected.recentMilestones.length,
            dogfood: contextBundle.injected.dogfoodVerdict,
          },
          archival: {
            totalActions: contextBundle.archival.totalActions,
            totalMilestones: contextBundle.archival.totalMilestones,
          },
          tokenBudget: contextBundle.totalEstimatedTokens,
        },
      };

      // Forward session summary to Convex for durable persistence
      if (behaviorSessionId) {
        forwardSessionToConvex({
          sessionId: behaviorSessionId,
          surface: "ai_app",
          roleInferred: resolvedLens,
          totalCalls: trace.length,
          totalCostUsd: Math.round(trace.reduce((s, t) => s + (TOOL_COST[t.tool ?? ""] ?? 0.003), 0) * 1000) / 1000,
          totalLatencyMs: latencyMs,
          redundantCalls: 0,
          uniqueTools: [...new Set(trace.map(t => t.tool).filter(Boolean) as string[])],
          classification: classification.type,
          query: query.trim().slice(0, 200),
        });
      }

      if (isStream) {
        res.write(`data: ${JSON.stringify({ type: "result", payload })}\n\n`);
        return res.end();
      } else {
        return res.json(payload);
      }
    } catch (err: any) {
      const errorPayload = {
        error: true,
        message: err?.message ?? "Search failed",
        classification: classification.type,
      };
      if (isStream) {
        res.write(`data: ${JSON.stringify({ type: "error", error: errorPayload })}\n\n`);
        return res.end();
      } else {
        return res.status(500).json(errorPayload);
      }
    }
  };

  router.get("/", handleSearch);
  router.post("/", handleSearch);

  // ── POST /search/upload — Ingest uploaded file content ────────────
  router.post("/upload", async (req, res) => {
    const { content, fileName, fileType } = req.body as {
      content?: string;
      fileName?: string;
      fileType?: string;
    };

    if (!content || typeof content !== "string") {
      return res.status(400).json({ error: true, message: "Content is required" });
    }

    try {
      const result = await callTool("ingest_upload", {
        content,
        fileName: fileName ?? "upload",
        fileType: fileType ?? "text/plain",
        sourceProvider: "user_upload",
      });
      return res.json({ success: true, result });
    } catch (err: any) {
      return res.status(500).json({ error: true, message: err?.message ?? "Upload ingestion failed" });
    }
  });

  router.get("/history", (req, res) => {
    try {
      const limit = Math.max(1, Math.min(20, Number(req.query.limit ?? 8) || 8));
      return res.json({
        success: true,
        sync: getSyncBridgeStatus(),
        items: listRecentSearchHistory(limit),
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: err?.message ?? "Failed to load search history",
        items: [],
      });
    }
  });

  router.get("/sync-status", (_req, res) => {
    return res.json({
      success: true,
      sync: getSyncBridgeStatus(),
    });
  });

  // ── GET /search/eval-history — Eval run results for trajectory visualization ──
  router.get("/eval-history", (_req, res) => {
    try {
      const db = getDb();
      const runs = db.prepare(
        `SELECT run_id, timestamp, total_queries, passed, failed, pass_rate, avg_latency_ms, judge_model, structural_pass_rate, gemini_pass_rate, created_at
         FROM eval_runs ORDER BY created_at DESC LIMIT 20`
      ).all() as any[];

      // For the latest run, include per-query results
      let latestResults: any[] = [];
      if (runs.length > 0) {
        const latest = db.prepare(
          `SELECT results_json FROM eval_runs WHERE run_id = ?`
        ).get(runs[0].run_id) as any;
        if (latest?.results_json) {
          latestResults = JSON.parse(latest.results_json);
        }
      }

      return res.json({
        success: true,
        totalRuns: runs.length,
        runs: runs.map(r => ({
          runId: r.run_id,
          timestamp: r.timestamp,
          totalQueries: r.total_queries,
          passed: r.passed,
          failed: r.failed,
          passRate: r.pass_rate,
          avgLatencyMs: r.avg_latency_ms,
          judgeModel: r.judge_model,
          structuralPassRate: r.structural_pass_rate,
          geminiPassRate: r.gemini_pass_rate,
        })),
        latestResults: latestResults.map((r: any) => ({
          queryId: r.queryId,
          query: r.query,
          lens: r.lens,
          expectedType: r.expectedType,
          actualType: r.actualType,
          latencyMs: r.latencyMs,
          structuralPass: r.structuralPass,
          structuralScore: r.structuralScore,
          geminiVerdict: r.geminiVerdict,
          geminiScore: r.geminiScore,
          combinedPass: r.combinedPass,
        })),
      });
    } catch {
      return res.json({ success: true, totalRuns: 0, runs: [], latestResults: [] });
    }
  });

  // ── GET /search/health ────────────────────────────────────────────
  router.get("/health", (_req, res) => {
    const availableTools = [
      "founder_local_weekly_reset",
      "founder_local_synthesize",
      "founder_local_gather",
      "founder_direction_assessment",
      "run_recon",
      "enrich_entity",
      "detect_contradictions",
      "ingest_upload",
    ];
    const found = availableTools.filter((name) => findTool(name));
    res.json({
      status: "ok",
      toolsAvailable: found.length,
      toolsExpected: availableTools.length,
      tools: found,
    });
  });

  // ── Behavioral profiling insights API ──────────────────────────────
  // Dual read: try local SQLite first, fall back to Convex for durable data
  router.get("/insights", async (_req, res) => {
    // Try local SQLite first (has current-session data)
    try {
      const { getAggregateInsights } = require("../../packages/mcp-local/src/profiler/behaviorStore.js");
      const insights = getAggregateInsights(7);
      if (insights && insights.totalToolCalls > 0) {
        return res.json({ success: true, source: "local", ...insights });
      }
    } catch { /* local may be empty on serverless */ }

    // Fall back to Convex (durable across cold starts)
    if (convex) {
      try {
        const insights = await convex.query(anyApi.domains.profiler.queries.getInsights, { daysBack: 7 });
        if (insights) {
          return res.json({ ...insights, source: "convex" });
        }
      } catch { /* Convex may not be deployed yet */ }
    }

    // No data from either source
    res.json({
      success: true, source: "none",
      totalSessions: 0, totalQueries: 0, totalToolCalls: 0,
      totalCostUsd: 0, redundantCallRate: 0, topTools: [],
      repeatedQueries: [], reuseRate: 0,
      message: "Profiling data will appear after your first few searches.",
    });
  });

  return router;
}
