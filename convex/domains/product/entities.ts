import { mutation, query } from "../../_generated/server";
import type { Doc, Id } from "../../_generated/dataModel";
import { v } from "convex/values";
import { requireProductIdentity, resolveProductIdentitySafely, summarizeText } from "./helpers";
import { productNoteBlockValidator } from "./schema";
import { getEntityMemoryDocumentWorkspace } from "./documents";

const TOKEN_STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "what",
  "why",
  "how",
  "into",
  "over",
  "your",
  "about",
  "does",
  "recently",
  "changed",
  "company",
  "person",
  "market",
  "report",
  "entity",
]);

function slugifySegment(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['".,()[\]{}]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function slugifyProductEntityName(value: string) {
  const slug = slugifySegment(value);
  return slug || "untitled-entity";
}

export function pickProductEntityName({
  primaryEntity,
  title,
  query,
}: {
  primaryEntity?: string | null;
  title: string;
  query: string;
}) {
  const candidate = primaryEntity?.trim() || title.trim() || query.trim();
  return summarizeText(candidate, "Untitled entity");
}

export function inferProductEntityType(type?: string | null, title?: string | null) {
  const normalized = `${type ?? ""} ${title ?? ""}`.toLowerCase();
  if (normalized.includes("person") || normalized.includes("founder")) return "person";
  if (normalized.includes("job") || normalized.includes("role")) return "job";
  if (normalized.includes("market")) return "market";
  if (normalized.includes("note")) return "note";
  return "company";
}

function toContextType(entityType: string): "company" | "person" | "role" | "note" {
  if (entityType === "person") return "person";
  if (entityType === "job") return "role";
  if (entityType === "note") return "note";
  return "company";
}

function tokenizeText(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter((token) => token.length > 2 && !TOKEN_STOPWORDS.has(token));
}

function collectReportDomains(report: Doc<"productReports"> | null | undefined) {
  const domains = new Set<string>();
  for (const source of report?.sources ?? []) {
    if (typeof source?.domain === "string" && source.domain.trim()) {
      domains.add(source.domain.trim().toLowerCase());
    }
  }
  return domains;
}

function collectReportTokens(report: Doc<"productReports"> | null | undefined) {
  const tokens = new Set<string>();
  for (const token of tokenizeText(`${report?.title ?? ""} ${report?.summary ?? ""} ${report?.query ?? ""}`)) {
    tokens.add(token);
  }
  return tokens;
}

export async function upsertEntityContextItem(
  ctx: any,
  args: {
    ownerKey: string;
    entitySlug: string;
    entityName: string;
    entityType: string;
    summary: string;
    linkedReportId?: Id<"productReports">;
    now: number;
  },
) {
  const existing = await ctx.db
    .query("productContextItems")
    .withIndex("by_owner_entity", (q: any) => q.eq("ownerKey", args.ownerKey).eq("entity", args.entitySlug))
    .collect();

  const match =
    existing.find((item: Doc<"productContextItems">) => item.type === toContextType(args.entityType)) ??
    existing[0] ??
    null;

  const patch = {
    type: toContextType(args.entityType),
    title: args.entityName,
    summary: summarizeText(args.summary, `${args.entityName} memory workspace`),
    tags: [args.entityType, "entity-memory"],
    entity: args.entitySlug,
    linkedReportId: args.linkedReportId,
    permissions: {
      chat: true,
      reports: true,
      nudges: true,
    },
    updatedAt: args.now,
  };

  if (match) {
    await ctx.db.patch(match._id, patch);
    return match._id;
  }

  return await ctx.db.insert("productContextItems", {
    ownerKey: args.ownerKey,
    createdAt: args.now,
    ...patch,
  });
}

export async function ensureEntityForReport(
  ctx: any,
  args: {
    ownerKey: string;
    primaryEntity?: string | null;
    title: string;
    query: string;
    type?: string | null;
    summary: string;
    now: number;
  },
): Promise<{
  entityId: Id<"productEntities">;
  entitySlug: string;
  entityName: string;
  entityType: string;
  revision: number;
  previousReportId: Id<"productReports"> | null;
  previousReport: Doc<"productReports"> | null;
  reportCount: number;
}> {
  const entityName = pickProductEntityName({
    primaryEntity: args.primaryEntity,
    title: args.title,
    query: args.query,
  });
  const entitySlug = slugifyProductEntityName(entityName);
  const entityType = inferProductEntityType(args.type, entityName);

  let entity = await ctx.db
    .query("productEntities")
    .withIndex("by_owner_slug", (q: any) => q.eq("ownerKey", args.ownerKey).eq("slug", entitySlug))
    .first();

  if (!entity) {
    const entityId = await ctx.db.insert("productEntities", {
      ownerKey: args.ownerKey,
      slug: entitySlug,
      name: entityName,
      entityType,
      summary: summarizeText(args.summary, `${entityName} memory workspace`),
      latestRevision: 0,
      reportCount: 0,
      createdAt: args.now,
      updatedAt: args.now,
    });
    entity = await ctx.db.get(entityId);
  }

  if (!entity) {
    throw new Error("Could not create entity");
  }

  const previousReport =
    entity.latestReportId ? await ctx.db.get(entity.latestReportId) : null;
  const revision = (entity.latestRevision ?? 0) + 1;

  return {
    entityId: entity._id,
    entitySlug,
    entityName,
    entityType,
    revision,
    previousReportId: previousReport?._id ?? null,
    previousReport,
    reportCount: Math.max(entity.reportCount ?? 0, revision),
  };
}

function matchesFilter(entity: {
  entityType?: string;
  name: string;
  latestReportType?: string;
  reportCount?: number;
}, filter?: string) {
  const active = filter ?? "All";
  if (active === "All" || active === "Recent") return true;
  if (active === "Pinned") return false;

  const haystack = `${entity.entityType ?? ""} ${entity.latestReportType ?? ""} ${entity.name}`.toLowerCase();
  if (active === "Companies") return haystack.includes("company");
  if (active === "People") return haystack.includes("person") || haystack.includes("founder");
  if (active === "Jobs") return haystack.includes("job") || haystack.includes("role");
  if (active === "Markets") return haystack.includes("market");
  if (active === "Notes") return haystack.includes("note");
  return true;
}

function buildSectionDiffs(
  currentSections: Array<{ id: string; title: string; body: string }>,
  previousSections: Array<{ id: string; title: string; body: string }> = [],
) {
  const previousMap = new Map(
    previousSections.map((section) => [section.id || section.title.toLowerCase(), section]),
  );

  return currentSections
    .map((section) => {
      const key = section.id || section.title.toLowerCase();
      const previous = previousMap.get(key);
      if (!previous) {
        return {
          id: section.id,
          title: section.title,
          status: "new" as const,
          previousBody: "",
          currentBody: section.body,
        };
      }
      if (previous.body === section.body) return null;
      return {
        id: section.id,
        title: section.title,
        status: "changed" as const,
        previousBody: previous.body,
        currentBody: section.body,
      };
    })
    .filter(Boolean);
}

function normalizeNoteBlocks(
  note:
    | {
        content?: string | null;
        blocks?: Array<{
          id: string;
          kind: "observation" | "insight" | "question" | "action";
          title: string;
          body: string;
        }> | null;
      }
    | null
    | undefined,
) {
  const normalizedBlocks = Array.isArray(note?.blocks)
    ? note!.blocks
        .map((block) => ({
          id: String(block.id || "").trim(),
          kind: block.kind,
          title: String(block.title || "").trim(),
          body: String(block.body || "").trim(),
        }))
        .filter((block) => block.title || block.body)
    : [];

  if (normalizedBlocks.length > 0) {
    return normalizedBlocks;
  }

  const legacyContent = String(note?.content || "").trim();
  if (!legacyContent) return [];

  return [
    {
      id: "legacy-note",
      kind: "observation" as const,
      title: "Working note",
      body: legacyContent,
    },
  ];
}

function stringifyNoteBlocks(
  blocks: Array<{
    id: string;
    kind: "observation" | "insight" | "question" | "action";
    title: string;
    body: string;
  }>,
) {
  return blocks
    .map((block) => {
      const title = block.title?.trim();
      const body = block.body?.trim();
      if (title && body) return `${title}: ${body}`;
      return title || body || "";
    })
    .filter(Boolean)
    .join("\n\n");
}

async function buildRelatedEntities(
  ctx: any,
  args: {
    ownerKey: string;
    entity: Doc<"productEntities">;
    latestReport: Doc<"productReports"> | null;
  },
) {
  const candidates = await ctx.db
    .query("productEntities")
    .withIndex("by_owner_updated", (q: any) => q.eq("ownerKey", args.ownerKey))
    .order("desc")
    .take(40);

  const currentDomains = collectReportDomains(args.latestReport);
  const currentTokens = collectReportTokens(args.latestReport);
  const related = await Promise.all(
    candidates
      .filter((candidate: Doc<"productEntities">) => candidate._id !== args.entity._id)
      .map(async (candidate: Doc<"productEntities">) => {
        const latestReport = candidate.latestReportId ? await ctx.db.get(candidate.latestReportId) : null;
        const candidateDomains = collectReportDomains(latestReport);
        const candidateTokens = collectReportTokens(latestReport);

        let score = 0;
        const reasons: string[] = [];

        const sharedDomains = [...candidateDomains].filter((domain) => currentDomains.has(domain));
        if (sharedDomains.length > 0) {
          score += sharedDomains.length * 5;
          reasons.push(`shared sources: ${sharedDomains.slice(0, 2).join(", ")}`);
        }

        const sharedTokens = [...candidateTokens].filter((token) => currentTokens.has(token));
        if (sharedTokens.length > 0) {
          score += Math.min(sharedTokens.length, 4);
          reasons.push(`overlapping themes: ${sharedTokens.slice(0, 3).join(", ")}`);
        }

        if (candidate.entityType === args.entity.entityType) {
          score += 1;
        }

        if (score <= 0) return null;

        return {
          slug: candidate.slug,
          name: candidate.name,
          entityType: candidate.entityType,
          summary: candidate.summary,
          latestRevision: candidate.latestRevision,
          reportCount: candidate.reportCount,
          reason: reasons.join(" • "),
          score,
        };
      }),
  );

  return related
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((left, right) => right.score - left.score)
    .slice(0, 6);
}

export const listEntities = query({
  args: {
    anonymousSessionId: v.optional(v.string()),
    search: v.optional(v.string()),
    filter: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await resolveProductIdentitySafely(ctx, args.anonymousSessionId);
    if (!identity.ownerKey) return [];

    const entities = await ctx.db
      .query("productEntities")
      .withIndex("by_owner_updated", (q) => q.eq("ownerKey", identity.ownerKey!))
      .order("desc")
      .take(80);

    const search = args.search?.trim().toLowerCase() ?? "";

    return entities
      .filter((entity) => {
        const matchesSearch =
          !search ||
          entity.name.toLowerCase().includes(search) ||
          entity.summary.toLowerCase().includes(search);
        return matchesSearch && matchesFilter(entity, args.filter);
      });
  },
});

export const getEntityWorkspace = query({
  args: {
    anonymousSessionId: v.optional(v.string()),
    entitySlug: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await resolveProductIdentitySafely(ctx, args.anonymousSessionId);
    if (!identity.ownerKey) return null;

    const entity = await ctx.db
      .query("productEntities")
      .withIndex("by_owner_slug", (q) => q.eq("ownerKey", identity.ownerKey!).eq("slug", args.entitySlug))
      .first();
    if (!entity) return null;

    const timeline = await ctx.db
      .query("productReports")
      .withIndex("by_owner_entity_updated", (q) =>
        q.eq("ownerKey", identity.ownerKey!).eq("entitySlug", args.entitySlug),
      )
      .order("desc")
      .take(12);

    const note = await ctx.db
      .query("productEntityNotes")
      .withIndex("by_entity", (q) => q.eq("entityId", entity._id))
      .first();
    const noteDocument = await getEntityMemoryDocumentWorkspace(ctx, identity.ownerKey!, args.entitySlug);

    const entityEvidence = await ctx.db
      .query("productEvidenceItems")
      .withIndex("by_owner_entity", (q: any) => q.eq("ownerKey", identity.ownerKey!).eq("entityId", entity._id))
      .collect();

    const reportEvidenceLists = await Promise.all(
      timeline.slice(0, 5).map((report) =>
        ctx.db
          .query("productEvidenceItems")
          .withIndex("by_owner_report", (q: any) => q.eq("ownerKey", identity.ownerKey!).eq("reportId", report._id))
          .collect(),
      ),
    );

    const evidence = [...entityEvidence, ...reportEvidenceLists.flat()]
      .filter((item, index, list) => list.findIndex((candidate) => candidate.label === item.label) === index)
      .slice(0, 10);

    const timelineWithDiffs = timeline.map((report, index) => {
      const previous = timeline[index + 1] ?? null;
      return {
        ...report,
        diffs: buildSectionDiffs(report.sections ?? [], previous?.sections ?? []),
        isLatest: index === 0,
      };
    });

    const latest = timelineWithDiffs[0] ?? null;
    const relatedEntities = await buildRelatedEntities(ctx, {
      ownerKey: identity.ownerKey!,
      entity,
      latestReport: latest,
    });
    const contextItems = await ctx.db
      .query("productContextItems")
      .withIndex("by_owner_entity", (q) => q.eq("ownerKey", identity.ownerKey!).eq("entity", args.entitySlug))
      .collect();
    const normalizedNoteBlocks = normalizeNoteBlocks(note);

    return {
      entity,
      note: note
        ? {
            ...note,
            blocks: normalizedNoteBlocks,
          }
        : noteDocument
          ? {
              _id: noteDocument._id,
              content: noteDocument.plainText,
              createdAt: noteDocument.createdAt,
              updatedAt: noteDocument.updatedAt,
            }
          : null,
      noteDocument,
      latest,
      timeline: timelineWithDiffs,
      evidence,
      contextItems,
      relatedEntities,
    };
  },
});

export const saveEntityNotes = mutation({
  args: {
    anonymousSessionId: v.optional(v.string()),
    entityId: v.id("productEntities"),
    content: v.optional(v.string()),
    blocks: v.optional(v.array(productNoteBlockValidator)),
  },
  handler: async (ctx, args) => {
    const identity = await requireProductIdentity(ctx, args.anonymousSessionId);
    const entity = await ctx.db.get(args.entityId);
    if (!entity || entity.ownerKey !== identity.ownerKey) {
      throw new Error("Entity not found");
    }

    const now = Date.now();
    const existing = await ctx.db
      .query("productEntityNotes")
      .withIndex("by_entity", (q) => q.eq("entityId", args.entityId))
      .first();

    const normalizedBlocks = normalizeNoteBlocks({
      content: args.content,
      blocks: args.blocks as any,
    });
    const normalizedContent = String(args.content || "").trim() || stringifyNoteBlocks(normalizedBlocks);

    if (existing) {
      await ctx.db.patch(existing._id, {
        content: normalizedContent,
        blocks: normalizedBlocks,
        updatedAt: now,
      });
      await upsertEntityContextItem(ctx, {
        ownerKey: entity.ownerKey,
        entitySlug: entity.slug,
        entityName: entity.name,
        entityType: entity.entityType,
        summary: normalizedContent || `${entity.name} working notes`,
        now,
      });
      return existing._id;
    }

    const noteId = await ctx.db.insert("productEntityNotes", {
      ownerKey: entity.ownerKey,
      entityId: args.entityId,
      content: normalizedContent,
      blocks: normalizedBlocks,
      createdAt: now,
      updatedAt: now,
    });
    await upsertEntityContextItem(ctx, {
      ownerKey: entity.ownerKey,
      entitySlug: entity.slug,
      entityName: entity.name,
      entityType: entity.entityType,
      summary: normalizedContent || `${entity.name} working notes`,
      now,
    });
    return noteId;
  },
});

export const listAttachableEvidence = query({
  args: {
    anonymousSessionId: v.optional(v.string()),
    entitySlug: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await resolveProductIdentitySafely(ctx, args.anonymousSessionId);
    if (!identity.ownerKey) return [];

    const entity = await ctx.db
      .query("productEntities")
      .withIndex("by_owner_slug", (q) => q.eq("ownerKey", identity.ownerKey!).eq("slug", args.entitySlug))
      .first();
    if (!entity) return [];

    const evidence = await ctx.db
      .query("productEvidenceItems")
      .withIndex("by_owner_updated", (q) => q.eq("ownerKey", identity.ownerKey!))
      .order("desc")
      .take(30);

    return evidence
      .filter((item) => !item.entityId || item.entityId === entity._id)
      .map((item) => ({
        _id: item._id,
        label: item.label,
        type: item.type,
        entityId: item.entityId ?? null,
        updatedAt: item.updatedAt,
      }));
  },
});

export const attachEvidenceToEntity = mutation({
  args: {
    anonymousSessionId: v.optional(v.string()),
    entityId: v.id("productEntities"),
    evidenceId: v.id("productEvidenceItems"),
  },
  handler: async (ctx, args) => {
    const identity = await requireProductIdentity(ctx, args.anonymousSessionId);
    const [entity, evidence] = await Promise.all([ctx.db.get(args.entityId), ctx.db.get(args.evidenceId)]);
    if (!entity || entity.ownerKey !== identity.ownerKey) {
      throw new Error("Entity not found");
    }
    if (!evidence || evidence.ownerKey !== identity.ownerKey) {
      throw new Error("Evidence not found");
    }

    const now = Date.now();
    await ctx.db.patch(args.evidenceId, {
      entityId: entity._id,
      status: "linked",
      updatedAt: now,
    });

    const existingContext = await ctx.db
      .query("productContextItems")
      .withIndex("by_owner_updated", (q) => q.eq("ownerKey", identity.ownerKey))
      .order("desc")
      .take(30);
    const matchingFileContext =
      existingContext.find(
        (item: Doc<"productContextItems">) =>
          item.type === "file" &&
          item.title === evidence.label,
      ) ?? null;

    if (matchingFileContext) {
      await ctx.db.patch(matchingFileContext._id, {
        entity: entity.slug,
        summary: evidence.description ?? matchingFileContext.summary,
        updatedAt: now,
      });
    }

    return { ok: true };
  },
});

export const ensureEntityBackfill = mutation({
  args: {
    anonymousSessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireProductIdentity(ctx, args.anonymousSessionId);
    const ownerKey = identity.ownerKey!;
    const reports = await ctx.db
      .query("productReports")
      .withIndex("by_owner_updated", (q) => q.eq("ownerKey", ownerKey))
      .collect();

    const ordered = [...reports].sort((left, right) => (left.createdAt ?? left.updatedAt) - (right.createdAt ?? right.updatedAt));
    let linked = 0;

    for (const report of ordered) {
      if (report.entityId && report.entitySlug && report.revision) continue;
      const entityMeta = await ensureEntityForReport(ctx, {
        ownerKey,
        primaryEntity: report.primaryEntity,
        title: report.title,
        query: report.query,
        type: report.type,
        summary: report.summary,
        now: report.updatedAt,
      });

      await ctx.db.patch(report._id, {
        entityId: entityMeta.entityId,
        entitySlug: entityMeta.entitySlug,
        revision: entityMeta.revision,
        previousReportId: entityMeta.previousReportId ?? undefined,
      });

      await ctx.db.patch(entityMeta.entityId, {
        name: entityMeta.entityName,
        entityType: entityMeta.entityType,
        summary: summarizeText(report.summary, entityMeta.entityName),
        latestReportId: report._id,
        latestReportUpdatedAt: report.updatedAt,
        latestRevision: entityMeta.revision,
        reportCount: entityMeta.revision,
        updatedAt: report.updatedAt,
      });
      await upsertEntityContextItem(ctx, {
        ownerKey,
        entitySlug: entityMeta.entitySlug,
        entityName: entityMeta.entityName,
        entityType: entityMeta.entityType,
        summary: report.summary,
        linkedReportId: report._id,
        now: report.updatedAt,
      });
      for (const evidenceId of report.evidenceItemIds ?? []) {
        await ctx.db.patch(evidenceId, {
          entityId: entityMeta.entityId,
          status: "linked",
          updatedAt: report.updatedAt,
        });
      }
      linked += 1;
    }

    return { linked };
  },
});
