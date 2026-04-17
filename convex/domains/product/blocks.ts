/**
 * blocks.ts — Notebook view data derivation
 *
 * This module does NOT introduce new Convex tables yet. Instead it provides a
 * single query that reads existing product tables and derives a Roam/Mew-style
 * notebook snapshot:
 *
 *   - "virtual blocks" derived from productReports.sections + productEntityNotes
 *     + productEvidenceItems (author attribution + inline citation refs)
 *   - routing metadata from productReports.routing + operatorContext
 *   - execution plan trace from productToolEvents (grouped by session + step)
 *   - sources with confidence from productSourceEvents + productReports.sources
 *
 * Once the UI is validated, Phase B of the ultraplan migrates the persisted
 * source of truth to dedicated productBlocks + productBlockRelations tables.
 * Until then this derivation keeps the UI fed without double-writing.
 */

import { v } from "convex/values";
import type { Doc, Id } from "../../_generated/dataModel";
import { mutation, query } from "../../_generated/server";
import { resolveProductReadOwnerKeys, requireProductIdentity } from "./helpers";
import {
  comparePositions,
  initialPosition,
  positionBetween,
  positionsBetween,
} from "./blockOrdering";
import {
  productBlockAccessValidator,
  productBlockAuthorKindValidator,
  productBlockChipValidator,
  productBlockKindValidator,
  productBlockRelationKindValidator,
} from "./schema";

// ────────────────────────────────────────────────────────────────────────────
// Types shared with the frontend
// ────────────────────────────────────────────────────────────────────────────

export type NotebookAuthor = "user" | "agent" | "anonymous";

export type NotebookBlockKind =
  | "heading-1"
  | "heading-2"
  | "heading-3"
  | "text"
  | "bullet"
  | "todo"
  | "callout"
  | "evidence";

export type NotebookBlock = {
  id: string;
  kind: NotebookBlockKind;
  author: NotebookAuthor;
  authorLabel: string; // e.g. "gemini-3.1-flash (synthesize)", "You · 14h ago"
  body: string;
  sourceRefIds?: string[];
  modelUsed?: string;
  costUsd?: number;
  confidence?: number;
  step?: number;
  revisionLabel?: string;
  href?: string;
  evidenceDomain?: string;
  parentBlockId?: string;
  editedFromAgent?: boolean;
  updatedAt?: number;
};

export type NotebookRouting = {
  mode?: "executive" | "advisor";
  reason?: string;
  source?: "automatic" | "user_forced";
  plannerModel?: string;
  executionModel?: string;
  reasoningEffort?: "medium" | "high";
  operatorLabel?: string;
  operatorHint?: string;
};

export type NotebookPlanStep = {
  step: number;
  tool: string;
  provider?: string;
  model?: string;
  reason?: string;
  status: "running" | "done" | "error";
  durationMs?: number;
  tokensIn?: number;
  tokensOut?: number;
  preview?: string;
  costUsd?: number;
  parallel?: boolean;
  parallelGroupSize?: number;
};

export type NotebookPlanTrace = {
  steps: NotebookPlanStep[];
  totalDurationMs?: number;
  totalCostUsd?: number;
  adaptationCount: number;
  milestones: {
    firstStageAt?: number;
    firstSourceAt?: number;
    firstPartialAnswerAt?: number;
  };
};

export type NotebookSource = {
  id: string;
  label: string;
  href?: string;
  domain?: string;
  siteName?: string;
  title?: string;
  publishedAt?: string;
  excerpt?: string;
  confidence?: number;
  faviconUrl?: string;
  thumbnailUrl?: string;
  imageCandidates?: string[];
  supportCount?: number;
};

export type NotebookSourceSummary = {
  averageConfidence?: number;
  corroboratedCount: number;
  unverifiedCount: number;
  highConfidenceCount: number;
};

export type NotebookEntityLink = {
  slug: string;
  name: string;
  entityType: string;
  relation?: string;
  reason?: string;
};

export type NotebookSnapshot = {
  entitySlug: string;
  entityName: string;
  entityType: string;
  firstSeenAt?: number;
  sessionStartedAt?: number;
  reportCount: number;
  noteCount: number;
  routing: NotebookRouting;
  planTrace: NotebookPlanTrace;
  sources: NotebookSource[];
  sourceSummary: NotebookSourceSummary;
  blocks: NotebookBlock[];
  revision?: number;
  reportUpdatedAt?: number;
  lastError?: string;
  linkedFrom: NotebookEntityLink[];
  relatedEntities: NotebookEntityLink[];
};

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

// Per-tool cost estimate for plan trace display (matches TOOL_COST in server/routes/search.ts).
// TODO: move this into a shared constant both sides read once we wire Phase B.
const TOOL_COST_USD: Record<string, number> = {
  web_search: 0.002,
  linkup_search: 0.002,
  run_recon: 0.003,
  founder_local_gather: 0.0003,
  founder_local_weekly_reset: 0.0003,
  founder_local_synthesize: 0.0003,
  synthesize_packet: 0.003,
  classify_query: 0.0001,
  enrich_entity: 0.001,
};

function costForTool(tool: string, fallback = 0.003): number {
  return TOOL_COST_USD[tool] ?? fallback;
}

function estimatedCost(
  tool: string,
  durationMs?: number,
  tokensIn?: number,
  tokensOut?: number,
): number {
  // If we have token counts, approximate by Gemini Flash pricing
  // ($0.30/M input, $2.50/M output). Otherwise fall back to per-tool constant.
  if (typeof tokensIn === "number" && typeof tokensOut === "number") {
    return (tokensIn * 0.3 + tokensOut * 2.5) / 1_000_000;
  }
  return costForTool(tool);
}

function mapStatus(raw: string | undefined): NotebookPlanStep["status"] {
  if (raw === "error") return "error";
  if (raw === "running") return "running";
  return "done";
}

function domainFromHref(href: string | undefined | null): string | undefined {
  if (!href) return undefined;
  try {
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

// Simple, deterministic mapping of report-section title to block kind.
function headingKindForSection(title: string): NotebookBlockKind {
  const normalized = title.trim().toLowerCase();
  if (!normalized) return "heading-3";
  // Keep every section heading at H3 inside the synthetic H2 "Prep brief" parent.
  return "heading-3";
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

const PARALLEL_CANDIDATE_TOOLS = new Set([
  "web_search",
  "linkup_search",
  "founder_local_gather",
  "founder_local_weekly_reset",
  "founder_local_synthesize",
  "search_all_knowledge",
]);

function buildSourceSupportCounts(
  sections: Array<{ sourceRefIds?: string[] }>,
  sources: NotebookSource[],
): Map<string, number> {
  const counts = new Map<string, number>();
  const sourceByLabel = new Map(
    sources
      .map((source) => [source.label.toLowerCase(), source.id] as const)
      .filter((entry) => Boolean(entry[0])),
  );
  for (const section of sections) {
    for (const refId of section.sourceRefIds ?? []) {
      const normalized = refId.trim().toLowerCase();
      const canonical = counts.has(refId)
        ? refId
        : sourceByLabel.get(normalized) ?? refId;
      counts.set(canonical, (counts.get(canonical) ?? 0) + 1);
    }
  }
  return counts;
}

function buildSourceSummary(sources: NotebookSource[]): NotebookSourceSummary {
  const withConfidence = sources.filter((source) => typeof source.confidence === "number");
  const averageConfidence =
    withConfidence.length > 0
      ? Number(
          (
            withConfidence.reduce((sum, source) => sum + (source.confidence ?? 0), 0) /
            withConfidence.length
          ).toFixed(2),
        )
      : undefined;
  return {
    averageConfidence,
    corroboratedCount: sources.filter((source) => (source.supportCount ?? 0) > 1).length,
    unverifiedCount: sources.filter(
      (source) => !source.href || source.confidence == null || source.confidence < 0.6,
    ).length,
    highConfidenceCount: sources.filter((source) => (source.confidence ?? 0) >= 0.85).length,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Main query
// ────────────────────────────────────────────────────────────────────────────

export const getEntityNotebook = query({
  args: {
    anonymousSessionId: v.optional(v.string()),
    entitySlug: v.string(),
  },
  handler: async (ctx, args): Promise<NotebookSnapshot | null> => {
    const ownerKeys = await resolveProductReadOwnerKeys(ctx, args.anonymousSessionId);
    if (ownerKeys.length === 0) return null;

    // 1. Resolve the entity
    let entity: Doc<"productEntities"> | null = null;
    for (const ownerKey of ownerKeys) {
      entity = await ctx.db
        .query("productEntities")
        .withIndex("by_owner_slug", (q) => q.eq("ownerKey", ownerKey).eq("slug", args.entitySlug))
        .first();
      if (entity) break;
    }
    if (!entity) return null;
    const dataOwnerKey = entity.ownerKey;

    // 2. Latest report (most recent by updatedAt)
    const latestReport = await ctx.db
      .query("productReports")
      .withIndex("by_owner_entity_updated", (q) =>
        q.eq("ownerKey", dataOwnerKey).eq("entitySlug", args.entitySlug),
      )
      .order("desc")
      .first();

    // 3. User notes
    const note = await ctx.db
      .query("productEntityNotes")
      .withIndex("by_entity", (q) => q.eq("entityId", entity._id))
      .first();
    const noteBlockCount = note?.content
      ? splitNoteIntoBlocks(note.content, note.updatedAt, `note-${note._id}`).length
      : 0;

    // 4. Evidence for this entity (dedupe with reports later)
    const entityEvidence = await ctx.db
      .query("productEvidenceItems")
      .withIndex("by_owner_entity", (q) => q.eq("ownerKey", dataOwnerKey).eq("entityId", entity._id))
      .collect();

    // 5. Tool events + source events scoped to the latest session (if we have one)
    const sessionId = latestReport?.sessionId ?? null;
    const toolEvents = sessionId
      ? await ctx.db
          .query("productToolEvents")
          .withIndex("by_session_step", (q) => q.eq("sessionId", sessionId as Id<"productChatSessions">))
          .collect()
      : [];
    const sourceEvents = sessionId
      ? await ctx.db
          .query("productSourceEvents")
          .withIndex("by_session_created", (q) => q.eq("sessionId", sessionId as Id<"productChatSessions">))
          .collect()
      : [];
    const session = sessionId
      ? await ctx.db.get(sessionId as Id<"productChatSessions">)
      : null;
    const [outgoingRelations, incomingRelations] = await Promise.all([
      ctx.db
        .query("productEntityRelations")
        .withIndex("by_owner_from", (q) => q.eq("ownerKey", dataOwnerKey).eq("fromEntitySlug", entity!.slug))
        .collect(),
      ctx.db
        .query("productEntityRelations")
        .withIndex("by_owner_to", (q) => q.eq("ownerKey", dataOwnerKey).eq("toEntitySlug", entity!.slug))
        .collect(),
    ]);

    // ──────────────────────────────────────────────────────────────────────
    // Build routing block
    // ──────────────────────────────────────────────────────────────────────
    const routing: NotebookRouting = {
      mode: latestReport?.routing?.routingMode,
      reason: latestReport?.routing?.routingReason,
      source: latestReport?.routing?.routingSource,
      plannerModel: latestReport?.routing?.plannerModel,
      executionModel: latestReport?.routing?.executionModel,
      reasoningEffort: latestReport?.routing?.reasoningEffort,
      operatorLabel:
        latestReport?.operatorContext?.label ?? session?.operatorContext?.label,
      operatorHint:
        latestReport?.operatorContext?.hint ?? session?.operatorContext?.hint,
    };

    // ──────────────────────────────────────────────────────────────────────
    // Build plan trace
    // ──────────────────────────────────────────────────────────────────────
    const sortedToolEvents = toolEvents.slice().sort((a, b) => a.step - b.step);
    const parallelGroupSize = sortedToolEvents.filter((event) => PARALLEL_CANDIDATE_TOOLS.has(event.tool)).length;
    const firstStageAt = sortedToolEvents[0]?.startedAt ?? session?.createdAt;
    const firstSourceAt = sourceEvents.slice().sort((a, b) => a.createdAt - b.createdAt)[0]?.createdAt;
    const firstPartialAnswerAt =
      sortedToolEvents.find((event) => event.tool === "synthesize_packet")?.updatedAt ??
      latestReport?.updatedAt ??
      session?.updatedAt;

    const planSteps: NotebookPlanStep[] = sortedToolEvents.map((event) => {
      const costUsd = Number(
        estimatedCost(event.tool, event.durationMs, event.tokensIn, event.tokensOut).toFixed(4),
      );
      const parallel = PARALLEL_CANDIDATE_TOOLS.has(event.tool) && parallelGroupSize > 1;
      return {
        step: event.step,
        tool: event.tool,
        provider: event.provider,
        model: event.model,
        reason: event.reason,
        status: mapStatus(event.status),
        durationMs: event.durationMs,
        tokensIn: event.tokensIn,
        tokensOut: event.tokensOut,
        preview: event.preview ? truncate(event.preview, 140) : undefined,
        costUsd,
        parallel,
        parallelGroupSize: parallel ? parallelGroupSize : undefined,
      };
    });

    const totalCostUsd = planSteps.reduce(
      (acc, step) => acc + estimatedCost(step.tool, step.durationMs, step.tokensIn, step.tokensOut),
      0,
    );

    const planTrace: NotebookPlanTrace = {
      steps: planSteps,
      totalDurationMs: session?.totalDurationMs,
      totalCostUsd: planSteps.length > 0 ? Number(totalCostUsd.toFixed(4)) : undefined,
      adaptationCount: 0, // Not persisted yet — placeholder, comes from harness execution.adaptations
      milestones: {
        firstStageAt,
        firstSourceAt,
        firstPartialAnswerAt,
      },
    };

    // ──────────────────────────────────────────────────────────────────────
    // Build sources list
    // ──────────────────────────────────────────────────────────────────────
    // Prefer sourceEvents (richer, with confidence) and fall back to the
    // sources embedded in the report.
    const sourceMap = new Map<string, NotebookSource>();
    for (const reportSource of latestReport?.sources ?? []) {
      sourceMap.set(reportSource.id, {
        id: reportSource.id,
        label: reportSource.label,
        href: reportSource.href,
        domain: reportSource.domain ?? domainFromHref(reportSource.href),
        siteName: reportSource.siteName,
        title: reportSource.title ?? reportSource.label,
        publishedAt: reportSource.publishedAt,
        excerpt: reportSource.excerpt,
        confidence: reportSource.confidence,
        faviconUrl: reportSource.faviconUrl,
        thumbnailUrl: reportSource.thumbnailUrl,
        imageCandidates: reportSource.imageCandidates,
      });
    }
    for (const sourceEvent of sourceEvents) {
      // If we've already got a richer entry from the report sources, only
      // upgrade confidence/excerpt if the report omitted them.
      const existing = sourceMap.get(sourceEvent.sourceKey);
      if (existing) {
        if (existing.confidence == null && sourceEvent.confidence != null) {
          existing.confidence = sourceEvent.confidence;
        }
        if (!existing.excerpt && sourceEvent.excerpt) {
          existing.excerpt = sourceEvent.excerpt;
        }
        if (!existing.title && sourceEvent.title) {
          existing.title = sourceEvent.title;
        }
        if (!existing.thumbnailUrl && sourceEvent.thumbnailUrl) {
          existing.thumbnailUrl = sourceEvent.thumbnailUrl;
        }
        if ((!existing.imageCandidates || existing.imageCandidates.length === 0) && sourceEvent.imageCandidates) {
          existing.imageCandidates = sourceEvent.imageCandidates.slice(0, 4);
        }
        continue;
      }
      sourceMap.set(sourceEvent.sourceKey, {
        id: sourceEvent.sourceKey,
        label: sourceEvent.label,
        href: sourceEvent.href,
        domain: sourceEvent.domain ?? domainFromHref(sourceEvent.href),
        siteName: sourceEvent.siteName,
        title: sourceEvent.title ?? sourceEvent.label,
        publishedAt: sourceEvent.publishedAt,
        excerpt: sourceEvent.excerpt,
        confidence: sourceEvent.confidence,
        faviconUrl: sourceEvent.faviconUrl,
        thumbnailUrl: sourceEvent.thumbnailUrl,
        imageCandidates: sourceEvent.imageCandidates?.slice(0, 4),
      });
    }
    const sourceSupportCounts = buildSourceSupportCounts(latestReport?.sections ?? [], Array.from(sourceMap.values()));
    const sources = Array.from(sourceMap.values()).map((source) => ({
      ...source,
      supportCount: sourceSupportCounts.get(source.id) ?? sourceSupportCounts.get(source.label) ?? 0,
    }));
    const sourceSummary = buildSourceSummary(sources);

    // ──────────────────────────────────────────────────────────────────────
    // Build the derived block list
    // ──────────────────────────────────────────────────────────────────────
    const blocks: NotebookBlock[] = [];

    // (a) Synthetic "Prep brief" H2 block that parents the report sections.
    const finalSynthesizeStep =
      [...planSteps].reverse().find((step) => step.tool === "synthesize_packet") ??
      planSteps[planSteps.length - 1];

    if (latestReport) {
      blocks.push({
        id: `brief-heading-${latestReport._id}`,
        kind: "heading-2",
        author: "agent",
        authorLabel: routing.executionModel
          ? `${routing.executionModel} · synthesize`
          : "agent · synthesize",
        body: latestReport.title || "Prep brief",
        modelUsed: routing.executionModel,
        step: finalSynthesizeStep?.step,
        updatedAt: latestReport.updatedAt,
      });

      // (b) Each report section becomes a heading block + a body block.
      for (const section of latestReport.sections ?? []) {
        blocks.push({
          id: `section-h-${latestReport._id}-${section.id}`,
          kind: headingKindForSection(section.title),
          author: "agent",
          authorLabel: routing.executionModel ?? "agent",
          body: section.title,
          parentBlockId: `brief-heading-${latestReport._id}`,
          step: finalSynthesizeStep?.step,
          updatedAt: latestReport.updatedAt,
        });
        blocks.push({
          id: `section-b-${latestReport._id}-${section.id}`,
          kind: "text",
          author: "agent",
          authorLabel: routing.executionModel
            ? `${routing.executionModel} · ${latestReport.updatedAt ? "rev " + (latestReport.revision ?? 1) : "synthesize"}`
            : "agent",
          body: section.body,
          sourceRefIds: section.sourceRefIds,
          modelUsed: routing.executionModel,
          costUsd: planSteps.length > 0 ? Number((totalCostUsd / Math.max(1, (latestReport.sections ?? []).length)).toFixed(4)) : undefined,
          confidence: computeSectionConfidence(section.sourceRefIds, sources),
          step: finalSynthesizeStep?.step,
          revisionLabel:
            (latestReport.revision ?? 1) > 1
              ? `rev ${latestReport.revision ?? 1}${latestReport.previousReportId ? " (was AI)" : ""}`
              : undefined,
          parentBlockId: `section-h-${latestReport._id}-${section.id}`,
          updatedAt: latestReport.updatedAt,
        });
      }
    }

    // (c) Evidence blocks — indented after the brief
    for (const item of entityEvidence) {
      if (!item.sourceUrl && !item.label) continue;
      blocks.push({
        id: `evidence-${item._id}`,
        kind: "evidence",
        author: "agent",
        authorLabel: "harness · evidence",
        body: item.label,
        href: item.sourceUrl,
        evidenceDomain: domainFromHref(item.sourceUrl),
        confidence: confidenceFromEvidence(item, sources),
        updatedAt: item.updatedAt,
      });
    }

    // (d) User's working notes — split on blank lines into text blocks,
    // keep bullets as bullet blocks. Simple rules good enough for derivation.
    if (note?.content) {
      const noteBlocks = splitNoteIntoBlocks(note.content, note.updatedAt, `note-${note._id}`);
      blocks.push({
        id: `note-heading-${note._id}`,
        kind: "heading-2",
        author: "user",
        authorLabel: "You",
        body: "My working notes",
        updatedAt: note.updatedAt,
      });
      blocks.push(...noteBlocks);
    }

    const relatedEntityLookups = new Map<string, Doc<"productEntities"> | null>();
    const relationTargets = Array.from(
      new Set(
        [...outgoingRelations.map((relation) => relation.toEntitySlug), ...incomingRelations.map((relation) => relation.fromEntitySlug)].filter(
          (slug) => slug && slug !== entity.slug,
        ),
      ),
    );
    await Promise.all(
      relationTargets.map(async (slug) => {
        const related = await ctx.db
          .query("productEntities")
          .withIndex("by_owner_slug", (q) => q.eq("ownerKey", dataOwnerKey).eq("slug", slug))
          .first();
        relatedEntityLookups.set(slug, related);
      }),
    );

    const relatedEntities = outgoingRelations.reduce<NotebookEntityLink[]>((acc, relation) => {
      const related = relatedEntityLookups.get(relation.toEntitySlug);
      if (!related) return acc;
      acc.push({
        slug: related.slug,
        name: related.name,
        entityType: related.entityType,
        relation: relation.relation,
        reason: relation.summary,
      });
      return acc;
    }, []);

    const linkedFrom = incomingRelations.reduce<NotebookEntityLink[]>((acc, relation) => {
      const related = relatedEntityLookups.get(relation.fromEntitySlug);
      if (!related) return acc;
      acc.push({
        slug: related.slug,
        name: related.name,
        entityType: related.entityType,
        relation: relation.relation,
        reason: relation.summary,
      });
      return acc;
    }, []);

    return {
      entitySlug: entity.slug,
      entityName: entity.name,
      entityType: entity.entityType,
      firstSeenAt: entity.createdAt,
      sessionStartedAt: session?.createdAt,
      reportCount: entity.reportCount ?? (latestReport ? 1 : 0),
      noteCount: noteBlockCount,
      routing,
      planTrace,
      sources,
      sourceSummary,
      blocks,
      revision: latestReport?.revision ?? undefined,
      reportUpdatedAt: latestReport?.updatedAt,
      lastError: session?.lastError,
      linkedFrom,
      relatedEntities,
    };
  },
});

// Weighted confidence across the sources cited by a section.
function computeSectionConfidence(
  sourceRefIds: string[] | undefined,
  sources: NotebookSource[],
): number | undefined {
  if (!sourceRefIds || sourceRefIds.length === 0) return undefined;
  const lookup = new Map(sources.map((source) => [source.id, source]));
  let sum = 0;
  let count = 0;
  for (const refId of sourceRefIds) {
    const source = lookup.get(refId);
    if (source?.confidence != null) {
      sum += source.confidence;
      count += 1;
    }
  }
  return count === 0 ? undefined : Number((sum / count).toFixed(2));
}

// When the evidence item's sourceUrl matches one of our source events,
// we can pull the confidence. Otherwise it stays undefined.
function confidenceFromEvidence(
  item: Doc<"productEvidenceItems">,
  sources: NotebookSource[],
): number | undefined {
  if (!item.sourceUrl) return undefined;
  const match = sources.find((source) => source.href === item.sourceUrl);
  return match?.confidence;
}

// ────────────────────────────────────────────────────────────────────────────
// Persisted block queries + mutations (Phase 1-4 of the ultraplan)
// These operate on the productBlocks table directly; once migration from
// productReports is complete, getEntityNotebook above will delegate here.
// ────────────────────────────────────────────────────────────────────────────

/**
 * List persisted blocks for an entity (ordered by positionInt, positionFrac).
 * Returns [] if no blocks exist yet (caller falls back to the derivation path).
 */
export const listEntityBlocks = query({
  args: {
    anonymousSessionId: v.optional(v.string()),
    entitySlug: v.string(),
  },
  handler: async (ctx, args): Promise<Doc<"productBlocks">[]> => {
    const ownerKeys = await resolveProductReadOwnerKeys(ctx, args.anonymousSessionId);
    if (ownerKeys.length === 0) return [];

    let entity: Doc<"productEntities"> | null = null;
    for (const ownerKey of ownerKeys) {
      entity = await ctx.db
        .query("productEntities")
        .withIndex("by_owner_slug", (q) => q.eq("ownerKey", ownerKey).eq("slug", args.entitySlug))
        .first();
      if (entity) break;
    }
    if (!entity) return [];

    const rows = await ctx.db
      .query("productBlocks")
      .withIndex("by_owner_entity", (q) => q.eq("ownerKey", entity.ownerKey).eq("entityId", entity._id))
      .collect();

    return rows
      .filter((row) => !row.deletedAt)
      .sort((a, b) =>
        comparePositions(
          { int: a.positionInt, frac: a.positionFrac },
          { int: b.positionInt, frac: b.positionFrac },
        ),
      );
  },
});

/**
 * Append a new block at the end of the current block list (or at the end of a
 * specific parent's children). Used by slash commands + user "add block" action.
 */
export const appendBlock = mutation({
  args: {
    anonymousSessionId: v.optional(v.string()),
    entitySlug: v.string(),
    parentBlockId: v.optional(v.id("productBlocks")),
    kind: productBlockKindValidator,
    content: v.array(productBlockChipValidator),
    authorKind: productBlockAuthorKindValidator,
    authorId: v.optional(v.string()),
    sourceSessionId: v.optional(v.id("productChatSessions")),
    sourceToolStep: v.optional(v.number()),
    sourceRefIds: v.optional(v.array(v.string())),
    accessMode: v.optional(productBlockAccessValidator),
  },
  handler: async (ctx, args): Promise<Id<"productBlocks">> => {
    const identity = await requireProductIdentity(ctx, args.anonymousSessionId);
    const entity = await ctx.db
      .query("productEntities")
      .withIndex("by_owner_slug", (q) => q.eq("ownerKey", identity.ownerKey).eq("slug", args.entitySlug))
      .first();
    if (!entity) throw new Error(`Entity not found: ${args.entitySlug}`);

    // Find the last block at the same parent level so we can position after it.
    const existing = await ctx.db
      .query("productBlocks")
      .withIndex("by_owner_entity", (q) => q.eq("ownerKey", identity.ownerKey).eq("entityId", entity._id))
      .collect();
    const siblings = existing
      .filter((b) => !b.deletedAt && (b.parentBlockId ?? null) === (args.parentBlockId ?? null))
      .sort((a, b) =>
        comparePositions(
          { int: a.positionInt, frac: a.positionFrac },
          { int: b.positionInt, frac: b.positionFrac },
        ),
      );
    const last = siblings[siblings.length - 1] ?? null;
    const nextPos = last
      ? positionBetween({ int: last.positionInt, frac: last.positionFrac }, null)
      : initialPosition();

    const now = Date.now();
    const id = await ctx.db.insert("productBlocks", {
      ownerKey: identity.ownerKey,
      entityId: entity._id,
      parentBlockId: args.parentBlockId,
      kind: args.kind,
      authorKind: args.authorKind,
      authorId: args.authorId,
      content: args.content,
      positionInt: nextPos.int,
      positionFrac: nextPos.frac,
      accessMode: args.accessMode ?? "edit",
      isPublic: false,
      sourceSessionId: args.sourceSessionId,
      sourceToolStep: args.sourceToolStep,
      sourceRefIds: args.sourceRefIds,
      revision: 1,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

/**
 * Insert a block strictly between two siblings. Used when the user presses
 * Enter mid-list or the agent inserts a thought in a specific position.
 */
export const insertBlockBetween = mutation({
  args: {
    anonymousSessionId: v.optional(v.string()),
    entitySlug: v.string(),
    beforeBlockId: v.optional(v.id("productBlocks")),
    afterBlockId: v.optional(v.id("productBlocks")),
    parentBlockId: v.optional(v.id("productBlocks")),
    kind: productBlockKindValidator,
    content: v.array(productBlockChipValidator),
    authorKind: productBlockAuthorKindValidator,
    authorId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"productBlocks">> => {
    const identity = await requireProductIdentity(ctx, args.anonymousSessionId);
    const entity = await ctx.db
      .query("productEntities")
      .withIndex("by_owner_slug", (q) => q.eq("ownerKey", identity.ownerKey).eq("slug", args.entitySlug))
      .first();
    if (!entity) throw new Error(`Entity not found: ${args.entitySlug}`);

    const before = args.beforeBlockId ? await ctx.db.get(args.beforeBlockId) : null;
    const after = args.afterBlockId ? await ctx.db.get(args.afterBlockId) : null;
    const beforePos = before ? { int: before.positionInt, frac: before.positionFrac } : null;
    const afterPos = after ? { int: after.positionInt, frac: after.positionFrac } : null;
    const nextPos = positionBetween(beforePos, afterPos);

    const now = Date.now();
    return ctx.db.insert("productBlocks", {
      ownerKey: identity.ownerKey,
      entityId: entity._id,
      parentBlockId: args.parentBlockId,
      kind: args.kind,
      authorKind: args.authorKind,
      authorId: args.authorId,
      content: args.content,
      positionInt: nextPos.int,
      positionFrac: nextPos.frac,
      accessMode: "edit",
      isPublic: false,
      revision: 1,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Update a block's content (or a subset of fields). Creates a previousBlockId
 * chain so the agent-generated version isn't lost when the user rewrites.
 */
export const updateBlock = mutation({
  args: {
    anonymousSessionId: v.optional(v.string()),
    blockId: v.id("productBlocks"),
    content: v.optional(v.array(productBlockChipValidator)),
    kind: v.optional(productBlockKindValidator),
    isChecked: v.optional(v.boolean()),
    sourceRefIds: v.optional(v.array(v.string())),
    // When true, we fork the prior version into previousBlockId so we don't lose
    // the original content (Google Docs-style per-block history).
    forkHistory: v.optional(v.boolean()),
    editedByAuthorKind: v.optional(productBlockAuthorKindValidator),
    editedByAuthorId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"productBlocks">> => {
    const identity = await requireProductIdentity(ctx, args.anonymousSessionId);
    const existing = await ctx.db.get(args.blockId);
    if (!existing || existing.ownerKey !== identity.ownerKey) {
      throw new Error("Block not found");
    }

    const now = Date.now();
    let previousBlockId: Id<"productBlocks"> | undefined;
    if (args.forkHistory) {
      // Snapshot the current state as a previous-revision row and mark it deleted
      // so it drops out of the live list but is still reachable via by_previous.
      previousBlockId = await ctx.db.insert("productBlocks", {
        ownerKey: existing.ownerKey,
        entityId: existing.entityId,
        parentBlockId: existing.parentBlockId,
        kind: existing.kind,
        authorKind: existing.authorKind,
        authorId: existing.authorId,
        content: existing.content,
        positionInt: existing.positionInt,
        positionFrac: existing.positionFrac,
        isChecked: existing.isChecked,
        accessMode: existing.accessMode,
        isPublic: existing.isPublic,
        sourceSessionId: existing.sourceSessionId,
        sourceToolStep: existing.sourceToolStep,
        sourceRefIds: existing.sourceRefIds,
        attributes: existing.attributes,
        previousBlockId: existing.previousBlockId,
        revision: existing.revision,
        deletedAt: now,
        createdAt: existing.createdAt,
        updatedAt: existing.updatedAt,
      });
    }

    await ctx.db.patch(args.blockId, {
      content: args.content ?? existing.content,
      kind: args.kind ?? existing.kind,
      isChecked: args.isChecked ?? existing.isChecked,
      sourceRefIds: args.sourceRefIds ?? existing.sourceRefIds,
      previousBlockId: previousBlockId ?? existing.previousBlockId,
      revision: existing.revision + 1,
      authorKind: args.editedByAuthorKind ?? existing.authorKind,
      authorId: args.editedByAuthorId ?? existing.authorId,
      updatedAt: now,
    });
    return args.blockId;
  },
});

/**
 * Soft-delete a block. Keeps the row around so revision chains and `by_previous`
 * lookups still work (Google Docs-style).
 */
export const deleteBlock = mutation({
  args: {
    anonymousSessionId: v.optional(v.string()),
    blockId: v.id("productBlocks"),
  },
  handler: async (ctx, args) => {
    const identity = await requireProductIdentity(ctx, args.anonymousSessionId);
    const existing = await ctx.db.get(args.blockId);
    if (!existing || existing.ownerKey !== identity.ownerKey) return;
    await ctx.db.patch(args.blockId, { deletedAt: Date.now(), updatedAt: Date.now() });
  },
});

/**
 * Move a block to a new position (between two other blocks). Does NOT re-index
 * any siblings — that's the whole point of fractional indexing.
 */
export const moveBlock = mutation({
  args: {
    anonymousSessionId: v.optional(v.string()),
    blockId: v.id("productBlocks"),
    beforeBlockId: v.optional(v.id("productBlocks")),
    afterBlockId: v.optional(v.id("productBlocks")),
    parentBlockId: v.optional(v.id("productBlocks")),
  },
  handler: async (ctx, args) => {
    const identity = await requireProductIdentity(ctx, args.anonymousSessionId);
    const existing = await ctx.db.get(args.blockId);
    if (!existing || existing.ownerKey !== identity.ownerKey) {
      throw new Error("Block not found");
    }
    const before = args.beforeBlockId ? await ctx.db.get(args.beforeBlockId) : null;
    const after = args.afterBlockId ? await ctx.db.get(args.afterBlockId) : null;
    const beforePos = before ? { int: before.positionInt, frac: before.positionFrac } : null;
    const afterPos = after ? { int: after.positionInt, frac: after.positionFrac } : null;
    const nextPos = positionBetween(beforePos, afterPos);

    await ctx.db.patch(args.blockId, {
      positionInt: nextPos.int,
      positionFrac: nextPos.frac,
      parentBlockId: args.parentBlockId ?? existing.parentBlockId,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Create a relation from a block to an entity/block/url. Used when the user
 * types `@`, `#`, or `<>` triggers and picks a target.
 */
export const createBlockRelation = mutation({
  args: {
    anonymousSessionId: v.optional(v.string()),
    fromBlockId: v.id("productBlocks"),
    toEntityId: v.optional(v.id("productEntities")),
    toBlockId: v.optional(v.id("productBlocks")),
    toUrl: v.optional(v.string()),
    relationKind: productBlockRelationKindValidator,
    relationLabel: v.optional(v.string()),
    authorKind: productBlockAuthorKindValidator,
    authorId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"productBlockRelations">> => {
    const identity = await requireProductIdentity(ctx, args.anonymousSessionId);
    return ctx.db.insert("productBlockRelations", {
      ownerKey: identity.ownerKey,
      fromBlockId: args.fromBlockId,
      toEntityId: args.toEntityId,
      toBlockId: args.toBlockId,
      toUrl: args.toUrl,
      relationKind: args.relationKind,
      relationLabel: args.relationLabel,
      authorKind: args.authorKind,
      authorId: args.authorId,
      createdAt: Date.now(),
    });
  },
});

/**
 * List backlinks — all blocks that mention a given entity.
 * Powers the "Linked from · N places" section at the bottom of entity pages.
 */
export const listBacklinksForEntity = query({
  args: {
    anonymousSessionId: v.optional(v.string()),
    entitySlug: v.string(),
  },
  handler: async (ctx, args) => {
    const ownerKeys = await resolveProductReadOwnerKeys(ctx, args.anonymousSessionId);
    if (ownerKeys.length === 0) return [];

    let entity: Doc<"productEntities"> | null = null;
    for (const ownerKey of ownerKeys) {
      entity = await ctx.db
        .query("productEntities")
        .withIndex("by_owner_slug", (q) => q.eq("ownerKey", ownerKey).eq("slug", args.entitySlug))
        .first();
      if (entity) break;
    }
    if (!entity) return [];

    const relations = await ctx.db
      .query("productBlockRelations")
      .withIndex("by_owner_entity", (q) =>
        q.eq("ownerKey", entity!.ownerKey).eq("toEntityId", entity!._id),
      )
      .collect();

    // Fetch the from-blocks so we can surface their snippet + parent entity.
    const results = await Promise.all(
      relations.map(async (rel) => {
        const block = await ctx.db.get(rel.fromBlockId);
        if (!block || block.deletedAt) return null;
        const parentEntity = await ctx.db.get(block.entityId);
        if (!parentEntity) return null;
        return {
          relationId: rel._id,
          relationKind: rel.relationKind,
          blockId: block._id,
          blockKind: block.kind,
          snippet: block.content
            .filter((c) => c.type === "text" || c.type === "mention")
            .map((c) => c.value)
            .join(" ")
            .slice(0, 180),
          fromEntityId: parentEntity._id,
          fromEntitySlug: parentEntity.slug,
          fromEntityName: parentEntity.name,
          createdAt: rel.createdAt,
        };
      }),
    );
    return results.filter((r): r is NonNullable<typeof r> => r !== null);
  },
});

/**
 * List revision history for a block (walks the previousBlockId chain).
 * Returns oldest-first. Powers the per-block "show history" disclosure.
 */
export const listBlockRevisions = query({
  args: {
    anonymousSessionId: v.optional(v.string()),
    blockId: v.id("productBlocks"),
  },
  handler: async (ctx, args): Promise<Doc<"productBlocks">[]> => {
    const ownerKeys = await resolveProductReadOwnerKeys(ctx, args.anonymousSessionId);
    if (ownerKeys.length === 0) return [];
    const chain: Doc<"productBlocks">[] = [];
    let cursor: Id<"productBlocks"> | undefined = args.blockId;
    const seen = new Set<string>();
    let depth = 0;
    while (cursor && !seen.has(cursor) && depth < 50) {
      seen.add(cursor);
      const row = await ctx.db.get(cursor);
      if (!row || !ownerKeys.includes(row.ownerKey)) break;
      chain.push(row);
      cursor = row.previousBlockId;
      depth += 1;
    }
    return chain.reverse();
  },
});

/**
 * Set a block's accessMode (Phase 10 — collaborator access).
 */
export const setBlockAccessMode = mutation({
  args: {
    anonymousSessionId: v.optional(v.string()),
    blockId: v.id("productBlocks"),
    accessMode: productBlockAccessValidator,
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await requireProductIdentity(ctx, args.anonymousSessionId);
    const row = await ctx.db.get(args.blockId);
    if (!row || row.ownerKey !== identity.ownerKey) throw new Error("Block not found");
    await ctx.db.patch(args.blockId, {
      accessMode: args.accessMode,
      isPublic: args.isPublic ?? row.isPublic,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Promote an inline link into a standalone evidence block attached as a child
 * of its citing block. The link chip stays in the parent text, but a child
 * evidence block is added + a block relation "evidence" is recorded.
 */
export const promoteLinkToEvidence = mutation({
  args: {
    anonymousSessionId: v.optional(v.string()),
    fromBlockId: v.id("productBlocks"),
    url: v.string(),
    label: v.string(),
  },
  handler: async (ctx, args): Promise<Id<"productBlocks">> => {
    const identity = await requireProductIdentity(ctx, args.anonymousSessionId);
    const citing = await ctx.db.get(args.fromBlockId);
    if (!citing || citing.ownerKey !== identity.ownerKey) {
      throw new Error("Citing block not found");
    }
    const siblings = await ctx.db
      .query("productBlocks")
      .withIndex("by_owner_entity", (q) => q.eq("ownerKey", citing.ownerKey).eq("entityId", citing.entityId))
      .collect();
    const sorted = siblings
      .filter((b) => !b.deletedAt && (b.parentBlockId ?? null) === (citing.parentBlockId ?? null))
      .sort((a, b) =>
        comparePositions(
          { int: a.positionInt, frac: a.positionFrac },
          { int: b.positionInt, frac: b.positionFrac },
        ),
      );
    const citingIdx = sorted.findIndex((b) => b._id === citing._id);
    const before = citingIdx >= 0 ? sorted[citingIdx] : null;
    const after = citingIdx >= 0 ? sorted[citingIdx + 1] : null;
    const beforePos = before ? { int: before.positionInt, frac: before.positionFrac } : null;
    const afterPos = after ? { int: after.positionInt, frac: after.positionFrac } : null;
    const pos = positionBetween(beforePos, afterPos);

    const now = Date.now();
    const evidenceBlockId = await ctx.db.insert("productBlocks", {
      ownerKey: identity.ownerKey,
      entityId: citing.entityId,
      parentBlockId: citing._id,
      kind: "evidence",
      authorKind: "user",
      authorId: "user:promote",
      content: [{ type: "link", value: args.label, url: args.url }],
      positionInt: pos.int,
      positionFrac: pos.frac,
      accessMode: "edit",
      isPublic: false,
      revision: 1,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("productBlockRelations", {
      ownerKey: identity.ownerKey,
      fromBlockId: citing._id,
      toBlockId: evidenceBlockId,
      toUrl: args.url,
      relationKind: "evidence",
      authorKind: "user",
      createdAt: now,
    });
    return evidenceBlockId;
  },
});

/**
 * Search entities for @mention autocomplete.
 * Simple substring match by name or slug (case-insensitive). Returns top 10.
 */
export const searchEntitiesForMention = query({
  args: {
    anonymousSessionId: v.optional(v.string()),
    prefix: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<Array<{ slug: string; name: string; entityType: string }>> => {
    const ownerKeys = await resolveProductReadOwnerKeys(ctx, args.anonymousSessionId);
    if (ownerKeys.length === 0) return [];
    const needle = args.prefix.trim().toLowerCase();
    if (!needle) return [];
    const results: Array<{ slug: string; name: string; entityType: string }> = [];
    for (const ownerKey of ownerKeys) {
      const rows = await ctx.db
        .query("productEntities")
        .withIndex("by_owner_updated", (q) => q.eq("ownerKey", ownerKey))
        .order("desc")
        .take(200);
      for (const row of rows) {
        if (row.name.toLowerCase().includes(needle) || row.slug.toLowerCase().includes(needle)) {
          results.push({ slug: row.slug, name: row.name, entityType: row.entityType });
          if (results.length >= 10) return results;
        }
      }
    }
    return results;
  },
});

/**
 * Migration: backfill productBlocks for an entity from its current
 * productReports.sections + productEntityNotes + productEvidenceItems.
 * Idempotent — clears any existing agent-authored blocks for the entity
 * before inserting fresh ones. User-authored blocks are preserved.
 */
export const backfillEntityBlocks = mutation({
  args: {
    anonymousSessionId: v.optional(v.string()),
    entitySlug: v.string(),
  },
  handler: async (ctx, args): Promise<{ inserted: number; cleared: number }> => {
    const identity = await requireProductIdentity(ctx, args.anonymousSessionId);
    const entity = await ctx.db
      .query("productEntities")
      .withIndex("by_owner_slug", (q) => q.eq("ownerKey", identity.ownerKey).eq("slug", args.entitySlug))
      .first();
    if (!entity) throw new Error(`Entity not found: ${args.entitySlug}`);

    // Clear agent-authored blocks so we don't accumulate duplicates across runs.
    const existing = await ctx.db
      .query("productBlocks")
      .withIndex("by_owner_entity", (q) => q.eq("ownerKey", identity.ownerKey).eq("entityId", entity._id))
      .collect();
    let cleared = 0;
    for (const block of existing) {
      if (block.authorKind === "agent" && !block.deletedAt) {
        await ctx.db.patch(block._id, { deletedAt: Date.now(), updatedAt: Date.now() });
        cleared += 1;
      }
    }

    // Grab the latest report to seed agent-authored blocks.
    const latestReport = await ctx.db
      .query("productReports")
      .withIndex("by_owner_entity_updated", (q) =>
        q.eq("ownerKey", identity.ownerKey).eq("entitySlug", args.entitySlug),
      )
      .order("desc")
      .first();

    const now = Date.now();
    let inserted = 0;

    if (latestReport) {
      const sectionCount = (latestReport.sections ?? []).length;
      // One heading block for the report itself + heading + body per section.
      const positions = positionsBetween(null, null, 1 + sectionCount * 2);
      let posIdx = 0;

      const briefHeadingId = await ctx.db.insert("productBlocks", {
        ownerKey: identity.ownerKey,
        entityId: entity._id,
        parentBlockId: undefined,
        kind: "heading_2",
        authorKind: "agent",
        authorId: latestReport.routing?.executionModel ?? "agent",
        content: [{ type: "text", value: latestReport.title || "Prep brief" }],
        positionInt: positions[posIdx].int,
        positionFrac: positions[posIdx].frac,
        accessMode: "edit",
        isPublic: false,
        sourceSessionId: latestReport.sessionId,
        revision: 1,
        createdAt: now,
        updatedAt: now,
      });
      posIdx += 1;
      inserted += 1;

      for (const section of latestReport.sections ?? []) {
        const headingId = await ctx.db.insert("productBlocks", {
          ownerKey: identity.ownerKey,
          entityId: entity._id,
          parentBlockId: briefHeadingId,
          kind: "heading_3",
          authorKind: "agent",
          authorId: latestReport.routing?.executionModel ?? "agent",
          content: [{ type: "text", value: section.title }],
          positionInt: positions[posIdx].int,
          positionFrac: positions[posIdx].frac,
          accessMode: "edit",
          isPublic: false,
          sourceSessionId: latestReport.sessionId,
          revision: 1,
          createdAt: now,
          updatedAt: now,
        });
        posIdx += 1;
        inserted += 1;

        await ctx.db.insert("productBlocks", {
          ownerKey: identity.ownerKey,
          entityId: entity._id,
          parentBlockId: headingId,
          kind: "text",
          authorKind: "agent",
          authorId: latestReport.routing?.executionModel ?? "agent",
          content: [{ type: "text", value: section.body }],
          positionInt: positions[posIdx].int,
          positionFrac: positions[posIdx].frac,
          accessMode: "edit",
          isPublic: false,
          sourceSessionId: latestReport.sessionId,
          sourceRefIds: section.sourceRefIds,
          revision: 1,
          createdAt: now,
          updatedAt: now,
        });
        posIdx += 1;
        inserted += 1;
      }
    }

    // Evidence blocks (attached to this entity)
    const evidenceItems = await ctx.db
      .query("productEvidenceItems")
      .withIndex("by_owner_entity", (q) => q.eq("ownerKey", identity.ownerKey).eq("entityId", entity._id))
      .collect();
    if (evidenceItems.length > 0) {
      const positions = positionsBetween(null, null, evidenceItems.length);
      for (let i = 0; i < evidenceItems.length; i++) {
        const item = evidenceItems[i];
        await ctx.db.insert("productBlocks", {
          ownerKey: identity.ownerKey,
          entityId: entity._id,
          kind: "evidence",
          authorKind: "agent",
          authorId: "harness:evidence",
          content: [
            {
              type: "link",
              value: item.label,
              url: item.sourceUrl,
            },
          ],
          positionInt: positions[i].int,
          positionFrac: positions[i].frac,
          accessMode: "edit",
          isPublic: false,
          revision: 1,
          createdAt: now,
          updatedAt: now,
        });
        inserted += 1;
      }
    }

    return { inserted, cleared };
  },
});

// Super-light markdown → block splitter. Splits on blank lines, keeps bullets
// as bullet blocks, and preserves order. The real impl (Phase B) will persist
// Lexical-aware block state.
function splitNoteIntoBlocks(
  content: string,
  updatedAt: number,
  idPrefix: string,
): NotebookBlock[] {
  const lines = content.split(/\r?\n/);
  const result: NotebookBlock[] = [];
  let paragraph: string[] = [];
  let paragraphIdx = 0;

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    result.push({
      id: `${idPrefix}-p${paragraphIdx++}`,
      kind: "text",
      author: "user",
      authorLabel: "You",
      body: paragraph.join(" ").trim(),
      updatedAt,
    });
    paragraph = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      continue;
    }
    if (/^[-*•]\s+/.test(line)) {
      flushParagraph();
      result.push({
        id: `${idPrefix}-b${result.length}`,
        kind: "bullet",
        author: "user",
        authorLabel: "You",
        body: line.replace(/^[-*•]\s+/, ""),
        updatedAt,
      });
      continue;
    }
    if (/^(\s*)\[[ x]\]\s+/i.test(line)) {
      flushParagraph();
      result.push({
        id: `${idPrefix}-t${result.length}`,
        kind: "todo",
        author: "user",
        authorLabel: "You",
        body: line.replace(/^(\s*)\[[ x]\]\s+/i, ""),
        updatedAt,
      });
      continue;
    }
    if (/^#{1,3}\s+/.test(line)) {
      flushParagraph();
      const depth = (line.match(/^#+/)?.[0].length ?? 1) as 1 | 2 | 3;
      const kind: NotebookBlockKind = depth === 1 ? "heading-1" : depth === 2 ? "heading-2" : "heading-3";
      result.push({
        id: `${idPrefix}-h${result.length}`,
        kind,
        author: "user",
        authorLabel: "You",
        body: line.replace(/^#{1,3}\s+/, ""),
        updatedAt,
      });
      continue;
    }
    paragraph.push(line);
  }
  flushParagraph();
  return result;
}
