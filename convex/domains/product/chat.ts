import { mutation, query } from "../../_generated/server";
import { v } from "convex/values";
import { buildPreviewText, deriveDomainFromUrl, requireProductIdentity, summarizeText } from "./helpers";
import { ensureEntityForReport, upsertEntityContextItem } from "./entities";

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

function deriveSectionsFromPacket(packet: any) {
  return [
    {
      id: "what-it-is",
      title: "What it is",
      body: summarizeText(packet?.answer, "No clear summary was returned."),
      status: "complete" as const,
    },
    {
      id: "why-it-matters",
      title: "Why it matters",
      body: summarizeText(
        packet?.changes?.[0]?.description ?? packet?.variables?.[0]?.name,
        "The agent did not return a distinct why-this-matters section.",
      ),
      status: "complete" as const,
    },
    {
      id: "what-is-missing",
      title: "What is missing",
      body: summarizeText(
        packet?.risks?.[0]?.description ?? packet?.nextQuestions?.[0] ?? packet?.uncertaintyBoundary,
        "No explicit gap was returned.",
      ),
      status: "complete" as const,
    },
    {
      id: "what-to-do-next",
      title: "What to do next",
      body: summarizeText(
        packet?.recommendedNextAction ?? packet?.interventions?.[0]?.action ?? packet?.nextQuestions?.[0],
        "No next action was returned.",
      ),
      status: "complete" as const,
    },
  ];
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
    publishedAt: typeof source?.publishedAt === "string" ? source.publishedAt : undefined,
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
    const sections = deriveSectionsFromPacket(args.packet);
    const sources = normalizeSources(args.packet);
    const reportTitle = summarizeText(args.packet?.entityName ?? session.query, session.query);
    const reportSummary = summarizeText(args.packet?.answer, "No clear summary was returned.");
    const entityMeta = await ensureEntityForReport(ctx, {
      ownerKey,
      primaryEntity: typeof args.packet?.entityName === "string" ? args.packet.entityName : undefined,
      title: reportTitle,
      query: session.query,
      type: "report",
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
          publishedAt: source.publishedAt,
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
      type: "report",
      summary: reportSummary,
      status: "saved",
      primaryEntity: typeof args.packet?.entityName === "string" ? args.packet.entityName : undefined,
      lens: session.lens,
      query: session.query,
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

    await ctx.db.patch(args.sessionId, {
      status: args.error ? "error" : "complete",
      autoSavedReportId: reportId,
      latestSummary: reportSummary,
      lastError: args.error,
      totalDurationMs: args.totalDurationMs,
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
      },
      createdAt: now,
    });

    const existingNudge = await ctx.db
      .query("productNudges")
      .withIndex("by_owner_report", (q) =>
        q.eq("ownerKey", ownerKey).eq("linkedReportId", reportId),
      )
      .first();

    if (!existingNudge) {
      await ctx.db.insert("productNudges", {
        ownerKey,
        type: "refresh_recommended",
        title: `Revisit ${entityMeta.entityName}`,
        summary: "This report was saved automatically and can be refreshed later if the underlying facts change.",
        linkedReportId: reportId,
        linkedChatSessionId: args.sessionId,
        status: "open",
        priority: "medium",
        dueAt: now + 24 * 60 * 60 * 1000,
        actionLabel: "Open report",
        actionTargetSurface: "reports",
        actionTargetId: entityMeta.entitySlug,
        createdAt: now,
        updatedAt: now,
      });
    }

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
