import { mutation, query } from "../../_generated/server";
import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { buildPreviewText, deriveDomainFromUrl, requireProductIdentity, summarizeText } from "./helpers";
import { ensureEntityForReport, upsertEntityContextItem, upsertExplicitRelatedEntitiesForReport } from "./entities";
import { productRoutingDecisionValidator } from "./schema";
import { deriveCanonicalReportSections } from "../../../shared/reportSections";
import { buildPrepBriefTitle, deriveReportArtifactMode, type ReportArtifactMode } from "../../../shared/reportArtifacts";
import { upsertOpenProductNudge } from "./nudgeHelpers";
import { syncGenericDiligenceProjectionDrafts, buildGenericDiligenceProjectionDrafts } from "./diligenceProjectionRuntime";

const draftSections = [
  {
    id: "what-it-is",
    title: "What it is",
    body: "The agent is classifying the request and gathering the first useful sources.",
    status: "building" as const,
  },
  {
    id: "why-it-matters",
    title: "Why it matters",
    body: "This section fills in once the first evidence arrives.",
    status: "pending" as const,
  },
  {
    id: "what-is-missing",
    title: "What is missing",
    body: "Missing evidence and open questions will appear after the source sweep.",
    status: "pending" as const,
  },
  {
    id: "what-to-do-next",
    title: "What to do next",
    body: "A concrete next move will appear when packaging finishes.",
    status: "pending" as const,
  },
];

function deriveSectionsFromPacket(packet: any, mode: ReportArtifactMode) {
  return deriveCanonicalReportSections(packet, { mode }).map((section) => ({
    id: section.id,
    title: section.title,
    body: summarizeText(
      section.body,
      section.id === "what-it-is"
        ? "No clear summary was returned."
        : section.id === "why-it-matters"
          ? "The agent did not return a distinct why-this-matters section."
          : section.id === "what-is-missing"
            ? "No explicit gap was returned."
            : "No next action was returned.",
    ),
    status: "complete" as const,
    sourceRefIds: section.sourceRefIds,
  }));
}

function normalizeSources(packet: any) {
  const sourceRefs = Array.isArray(packet?.sourceRefs) ? packet.sourceRefs : [];
  return sourceRefs.map((source: any, index: number) => ({
    id: String(source?.id ?? `source:${index + 1}`),
    label: String(source?.label ?? source?.title ?? `Source ${index + 1}`),
    href: typeof source?.href === "string" ? source.href : undefined,
    type: typeof source?.type === "string" ? source.type : undefined,
    status: typeof source?.status === "string" ? source.status : undefined,
    title: typeof source?.title === "string" ? source.title : undefined,
    domain: deriveDomainFromUrl(source?.href),
    siteName: typeof source?.siteName === "string" ? source.siteName : undefined,
    faviconUrl: typeof source?.faviconUrl === "string" ? source.faviconUrl : undefined,
    publishedAt: typeof source?.publishedAt === "string" ? source.publishedAt : undefined,
    thumbnailUrl: typeof source?.thumbnailUrl === "string" ? source.thumbnailUrl : undefined,
    imageCandidates: Array.isArray(source?.imageCandidates)
      ? source.imageCandidates.filter((candidate: unknown): candidate is string => typeof candidate === "string" && candidate.trim().length > 0).slice(0, 4)
      : undefined,
    excerpt: typeof source?.excerpt === "string" ? source.excerpt : undefined,
    confidence: typeof source?.confidence === "number" ? source.confidence : undefined,
  }));
}

export const startSession = mutation({
  args: {
    anonymousSessionId: v.optional(v.string()),
    query: v.string(),
    lens: v.union(
      v.literal("founder"),
      v.literal("investor"),
      v.literal("banker"),
      v.literal("ceo"),
      v.literal("legal"),
      v.literal("student"),
    ),
    files: v.optional(
      v.array(
        v.object({
          evidenceId: v.optional(v.id("productEvidenceItems")),
          name: v.string(),
          type: v.string(),
          size: v.optional(v.number()),
        }),
      ),
    ),
    contextHint: v.optional(v.string()),
    contextLabel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireProductIdentity(ctx, args.anonymousSessionId);
    const now = Date.now();

    const bundleId = await ctx.db.insert("productInputBundles", {
      ownerKey: identity.ownerKey,
      query: args.query,
      lens: args.lens,
      entrySurface: "chat",
      status: "processing",
      uploadedFiles: args.files ?? [],
      createdAt: now,
      updatedAt: now,
    });

    const sessionId = await ctx.db.insert("productChatSessions", {
      ownerKey: identity.ownerKey,
      bundleId,
      query: args.query,
      lens: args.lens,
      title: args.query,
      status: "streaming",
      operatorContext: args.contextHint?.trim()
        ? {
            hint: args.contextHint.trim(),
            label: args.contextLabel?.trim() || undefined,
          }
        : undefined,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("productChatEvents", {
      ownerKey: identity.ownerKey,
      sessionId,
      type: "message",
      label: "User query",
      body: args.query,
      createdAt: now,
    });

    if (args.contextHint?.trim()) {
      await ctx.db.insert("productChatEvents", {
        ownerKey: identity.ownerKey,
        sessionId,
        type: "system",
        label: "Operator context applied",
        body: args.contextLabel?.trim()
          ? `Applied saved context: ${args.contextLabel.trim()}`
          : "Applied saved operator context from Me.",
        payload: {
          contextHint: args.contextHint.trim(),
          contextLabel: args.contextLabel?.trim() || null,
        },
        createdAt: now,
      });
    }

    await ctx.db.insert("productReportDrafts", {
      ownerKey: identity.ownerKey,
      sessionId,
      title: args.query,
      status: "building",
      sections: draftSections,
      createdAt: now,
      updatedAt: now,
    });

    for (const file of args.files ?? []) {
      if (file.evidenceId) {
        const existingEvidence = await ctx.db.get(file.evidenceId);
        if (existingEvidence && existingEvidence.ownerKey === identity.ownerKey) {
          await ctx.db.patch(file.evidenceId, {
            bundleId,
            sessionId,
            status: "processing",
            updatedAt: now,
          });
          continue;
        }
      }

      await ctx.db.insert("productEvidenceItems", {
        ownerKey: identity.ownerKey,
        bundleId,
        sessionId,
        type: "file",
        label: file.name,
        status: "processing",
        mimeType: file.type,
        metadata: {
          size: file.size,
        },
        createdAt: now,
        updatedAt: now,
      });
    }

    return { bundleId, sessionId };
  },
});

export const recordToolStart = mutation({
  args: {
    anonymousSessionId: v.optional(v.string()),
    sessionId: v.id("productChatSessions"),
    tool: v.string(),
    provider: v.optional(v.string()),
    model: v.optional(v.string()),
    step: v.number(),
    totalPlanned: v.number(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireProductIdentity(ctx, args.anonymousSessionId);
    const ownerKey = identity.ownerKey!;
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.ownerKey !== ownerKey) {
      throw new Error("Session not found");
    }

    const now = Date.now();
    await ctx.db.insert("productToolEvents", {
      ownerKey: identity.ownerKey,
      sessionId: args.sessionId,
      tool: args.tool,
      provider: args.provider,
      model: args.model,
      step: args.step,
      totalPlanned: args.totalPlanned,
      reason: args.reason,
      status: "running",
      startedAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(args.sessionId, { updatedAt: now });
    return { ok: true };
  },
});

export const recordToolDone = mutation({
  args: {
    anonymousSessionId: v.optional(v.string()),
    sessionId: v.id("productChatSessions"),
    tool: v.string(),
    step: v.number(),
    durationMs: v.optional(v.number()),
    tokensIn: v.optional(v.number()),
    tokensOut: v.optional(v.number()),
    preview: v.optional(v.any()),
    isError: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await requireProductIdentity(ctx, args.anonymousSessionId);
    const ownerKey = identity.ownerKey!;
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.ownerKey !== ownerKey) {
      throw new Error("Session not found");
    }

    const existing = await ctx.db
      .query("productToolEvents")
      .withIndex("by_session_step", (q) => q.eq("sessionId", args.sessionId).eq("step", args.step))
      .collect();

    const matching = existing.find((event) => event.tool === args.tool) ?? existing[0] ?? null;
    const now = Date.now();
    if (matching) {
      await ctx.db.patch(matching._id, {
        status: args.isError ? "error" : "done",
        durationMs: args.durationMs,
        tokensIn: args.tokensIn,
        tokensOut: args.tokensOut,
        preview: buildPreviewText(args.preview),
        updatedAt: now,
      });
    }

    await ctx.db.patch(args.sessionId, { updatedAt: now });
    return { ok: true };
  },
});

export const completeSession = mutation({
  args: {
    anonymousSessionId: v.optional(v.string()),
    sessionId: v.id("productChatSessions"),
    packet: v.any(),
    entitySlugHint: v.optional(v.string()),
    routing: v.optional(productRoutingDecisionValidator),
    totalDurationMs: v.optional(v.number()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireProductIdentity(ctx, args.anonymousSessionId);
    const ownerKey = identity.ownerKey!;
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.ownerKey !== ownerKey) {
      throw new Error("Session not found");
    }

    const now = Date.now();
    const artifactMode = deriveReportArtifactMode(session.query);
    const sections = deriveSectionsFromPacket(args.packet, artifactMode);
    const sources = normalizeSources(args.packet);
    const routing = args.routing ?? undefined;
    const reportTitle =
      artifactMode === "prep_brief"
        ? buildPrepBriefTitle({
            entityName: typeof args.packet?.entityName === "string" ? args.packet.entityName : undefined,
            fallbackQuery: session.query,
          })
        : summarizeText(args.packet?.entityName ?? session.query, session.query);
    const reportSummary = summarizeText(args.packet?.answer, "No clear summary was returned.");
    const entityMeta = await ensureEntityForReport(ctx, {
      ownerKey,
      primaryEntity: typeof args.packet?.entityName === "string" ? args.packet.entityName : undefined,
      entitySlugHint: args.entitySlugHint,
      title: reportTitle,
      query: session.query,
      type: typeof args.packet?.classification === "string" ? args.packet.classification : artifactMode,
      sourceUrls: sources.map((source) => source.href),
      lens: session.lens,
      summary: reportSummary,
      now,
    });

    const draft = await ctx.db
      .query("productReportDrafts")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (draft) {
      await ctx.db.patch(draft._id, {
        title: args.packet?.entityName ?? session.query,
        status: args.error ? "pending" : "complete",
        sections,
        updatedAt: now,
      });
    }

    const existingEvidence = await ctx.db
      .query("productEvidenceItems")
      .withIndex("by_owner_session", (q) =>
        q.eq("ownerKey", ownerKey).eq("sessionId", args.sessionId),
      )
      .collect();

    const toolEvents = await ctx.db
      .query("productToolEvents")
      .withIndex("by_session_step", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    for (const event of toolEvents) {
      if (event.status !== "running") continue;
      await ctx.db.patch(event._id, {
        status: args.error ? "error" : "done",
        durationMs: event.durationMs ?? Math.max(0, now - event.startedAt),
        updatedAt: now,
      });
    }

    for (const source of sources) {
      const alreadyStored = await ctx.db
        .query("productSourceEvents")
        .withIndex("by_session_created", (q) => q.eq("sessionId", args.sessionId))
        .collect();
      const duplicate = alreadyStored.some(
        (stored) => stored.sourceKey === source.id || (!!stored.href && stored.href === source.href),
      );
      if (!duplicate) {
        await ctx.db.insert("productSourceEvents", {
          ownerKey,
          sessionId: args.sessionId,
          sourceKey: source.id,
          label: source.label,
          href: source.href,
          type: source.type,
          status: source.status,
          title: source.title,
          domain: source.domain,
          siteName: source.siteName,
          faviconUrl: source.faviconUrl,
          publishedAt: source.publishedAt,
          thumbnailUrl: source.thumbnailUrl,
          imageCandidates: source.imageCandidates,
          excerpt: source.excerpt,
          confidence: source.confidence,
          createdAt: now,
        });
      }
    }

    const reportId = await ctx.db.insert("productReports", {
      ownerKey,
      sessionId: args.sessionId,
      bundleId: session.bundleId,
      entityId: entityMeta.entityId,
      entitySlug: entityMeta.entitySlug,
      title: reportTitle,
      type: artifactMode,
      summary: reportSummary,
      status: "saved",
      primaryEntity: typeof args.packet?.entityName === "string" ? args.packet.entityName : undefined,
      lens: session.lens,
      query: session.query,
      routing,
      operatorContext: session.operatorContext ?? undefined,
      sections,
      sources,
      evidenceItemIds: existingEvidence.map((item) => item._id),
      revision: entityMeta.revision,
      previousReportId: entityMeta.previousReportId ?? undefined,
      pinned: false,
      visibility: "private",
      lastRefreshAt: now,
      createdAt: now,
      updatedAt: now,
    });

    await syncGenericDiligenceProjectionDrafts(ctx, {
      entitySlug: entityMeta.entitySlug,
      drafts: buildGenericDiligenceProjectionDrafts({
        entitySlug: entityMeta.entitySlug,
        title: reportTitle,
        primaryEntity:
          typeof args.packet?.entityName === "string" ? args.packet.entityName : entityMeta.entityName,
        sections,
        sources,
        updatedAt: now,
        revision: entityMeta.revision,
      }),
    });

    await ctx.scheduler.runAfter(
      0,
      internal.domains.product.diligenceProjections.runScratchpadProjectionPass,
      {
        workflowId: `scratchpad:${entityMeta.entitySlug}:${now}:session_complete:all`,
        reason: "session_complete",
        userId: identity.rawUserId ?? undefined,
        idempotencyKey: `overlay:${entityMeta.entitySlug}:${now}:all`,
        report: {
          entitySlug: entityMeta.entitySlug,
          title: reportTitle,
          primaryEntity:
            typeof args.packet?.entityName === "string"
              ? args.packet.entityName
              : entityMeta.entityName,
          sections,
          sources,
          updatedAt: now,
          revision: entityMeta.revision,
        },
      },
    );

    for (const evidence of existingEvidence) {
      await ctx.db.patch(evidence._id, {
        entityId: entityMeta.entityId,
        reportId,
        status: "linked",
        updatedAt: now,
      });
    }

    await ctx.db.patch(entityMeta.entityId, {
      name: entityMeta.entityName,
      entityType: entityMeta.entityType,
      summary: reportSummary,
      latestReportId: reportId,
      latestReportUpdatedAt: now,
      latestRevision: entityMeta.revision,
      reportCount: entityMeta.reportCount,
      updatedAt: now,
    });

    await upsertEntityContextItem(ctx, {
      ownerKey,
      entitySlug: entityMeta.entitySlug,
      entityName: entityMeta.entityName,
      entityType: entityMeta.entityType,
      summary: reportSummary,
      linkedReportId: reportId,
      now,
    });

    await upsertExplicitRelatedEntitiesForReport(ctx, {
      ownerKey,
      primaryEntitySlug: entityMeta.entitySlug,
      query: session.query,
      sources,
      now,
    });

    await ctx.db.patch(args.sessionId, {
      status: args.error ? "error" : "complete",
      autoSavedReportId: reportId,
      latestSummary: reportSummary,
      lastError: args.error,
      totalDurationMs: args.totalDurationMs,
      routing,
      updatedAt: now,
    });

    if (session.bundleId) {
      await ctx.db.patch(session.bundleId, {
        status: args.error ? "error" : "complete",
        updatedAt: now,
      });
    }

    await ctx.db.insert("productChatEvents", {
      ownerKey,
      sessionId: args.sessionId,
      type: args.error ? "error" : "milestone",
      label: args.error ? "Run failed" : "Report saved",
      body: args.error ?? "The report was saved to Reports automatically.",
      payload: {
        reportId,
        routingMode: routing?.routingMode,
      },
      createdAt: now,
    });

    await upsertOpenProductNudge(ctx, {
      ownerKey,
      type: "refresh_recommended",
      title: `Revisit ${entityMeta.entityName}`,
      summary: "This report was saved automatically and can be refreshed later if the underlying facts change.",
      linkedReportId: reportId,
      linkedChatSessionId: args.sessionId,
      priority: "medium",
      dueAt: now + 24 * 60 * 60 * 1000,
      actionLabel: "Open report",
      actionTargetSurface: "reports",
      actionTargetId: entityMeta.entitySlug,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.scheduler.runAfter(
      0,
      internal.domains.product.reports.hydrateReportSourceMediaInternal,
      { reportId },
    );

    return {
      reportId,
      entitySlug: entityMeta.entitySlug,
    };
  },
});

export const pinReport = mutation({
  args: {
    anonymousSessionId: v.optional(v.string()),
    reportId: v.id("productReports"),
    pinned: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await requireProductIdentity(ctx, args.anonymousSessionId);
    const report = await ctx.db.get(args.reportId);
    if (!report || report.ownerKey !== identity.ownerKey) {
      throw new Error("Report not found");
    }
    await ctx.db.patch(args.reportId, {
      pinned: args.pinned,
      updatedAt: Date.now(),
    });
    return { ok: true };
  },
});

export const getSession = query({
  args: {
    anonymousSessionId: v.optional(v.string()),
    sessionId: v.id("productChatSessions"),
  },
  handler: async (ctx, args) => {
    const identity = await requireProductIdentity(ctx, args.anonymousSessionId);
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.ownerKey !== identity.ownerKey) {
      return null;
    }

    const [events, toolEvents, sourceEvents, draft, report] = await Promise.all([
      ctx.db
        .query("productChatEvents")
        .withIndex("by_session_created", (q) => q.eq("sessionId", args.sessionId))
        .collect(),
      ctx.db
        .query("productToolEvents")
        .withIndex("by_session_step", (q) => q.eq("sessionId", args.sessionId))
        .collect(),
      ctx.db
        .query("productSourceEvents")
        .withIndex("by_session_created", (q) => q.eq("sessionId", args.sessionId))
        .collect(),
      ctx.db
        .query("productReportDrafts")
        .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
        .first(),
      session.autoSavedReportId ? ctx.db.get(session.autoSavedReportId) : null,
    ]);

    return {
      session,
      events,
      toolEvents,
      sourceEvents,
      draft,
      report,
    };
  },
});
