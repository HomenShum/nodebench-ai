import { mutation, query, internalQuery } from "../../_generated/server";
import { v } from "convex/values";
import { resolveProductIdentitySafely, requireProductIdentity } from "./helpers";

export const listReports = query({
  args: {
    anonymousSessionId: v.optional(v.string()),
    search: v.optional(v.string()),
    filter: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await resolveProductIdentitySafely(ctx, args.anonymousSessionId);
    if (!identity.ownerKey) {
      return [];
    }

    let reports;
    try {
      reports = await ctx.db
        .query("productReports")
        .withIndex("by_owner_updated", (q) => q.eq("ownerKey", identity.ownerKey!))
        .order("desc")
        .take(60);
    } catch (error) {
      console.error("[product] listReports failed", {
        ownerKey: identity.ownerKey,
        error,
      });
      return [];
    }

    const search = args.search?.trim().toLowerCase() ?? "";
    const filter = args.filter ?? "All";

    return reports.filter((report) => {
      const matchesSearch =
        !search ||
        report.title.toLowerCase().includes(search) ||
        report.summary.toLowerCase().includes(search);

      if (!matchesSearch) return false;

      if (filter === "Pinned") return report.pinned;
      if (filter === "Recent" || filter === "All") return true;

      const type = report.type.toLowerCase();
      const title = report.title.toLowerCase();
      if (filter === "Companies") return type.includes("company") || title.includes("company");
      if (filter === "People") return type.includes("person") || title.includes("person");
      if (filter === "Jobs") return type.includes("job") || title.includes("role");
      if (filter === "Markets") return type.includes("market") || title.includes("market");
      if (filter === "Notes") return type.includes("note") || type.includes("document");
      return true;
    });
  },
});

export const getReport = query({
  args: {
    anonymousSessionId: v.optional(v.string()),
    reportId: v.id("productReports"),
  },
  handler: async (ctx, args) => {
    const identity = await resolveProductIdentitySafely(ctx, args.anonymousSessionId);
    if (!identity.ownerKey) return null;
    let report: any = null;
    try {
      report = await ctx.db.get(args.reportId);
    } catch (error) {
      console.error("[product] getReport failed", {
        ownerKey: identity.ownerKey,
        reportId: args.reportId,
        error,
      });
      return null;
    }
    if (!report || report.ownerKey !== identity.ownerKey) {
      return null;
    }
    return report;
  },
});

export const setPinned = mutation({
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

export const requestRefresh = mutation({
  args: {
    anonymousSessionId: v.optional(v.string()),
    reportId: v.id("productReports"),
    triggeredBy: v.optional(v.union(v.literal("user"), v.literal("nudge"), v.literal("system"))),
  },
  handler: async (ctx, args) => {
    const identity = await requireProductIdentity(ctx, args.anonymousSessionId);
    const report = await ctx.db.get(args.reportId);
    if (!report || report.ownerKey !== identity.ownerKey) {
      throw new Error("Report not found");
    }

    const now = Date.now();
    const refreshId = await ctx.db.insert("productReportRefreshes", {
      ownerKey: identity.ownerKey,
      reportId: args.reportId,
      status: "queued",
      triggeredBy: args.triggeredBy ?? "user",
      summary: "Refresh queued from Reports.",
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("productNudges", {
      ownerKey: identity.ownerKey,
      type: "report_changed",
      title: `${report.title} needs a refresh`,
      summary: "A refresh was queued from Reports. Open Chat to run it live.",
      linkedReportId: report._id,
      status: "open",
      priority: "medium",
      actionLabel: "Open in Chat",
      actionTargetSurface: "chat",
      actionTargetId: report.entitySlug ?? String(report._id),
      createdAt: now,
      updatedAt: now,
    });

    return {
      refreshId,
      query: report.query,
      lens: report.lens,
    };
  },
});

// ---------------------------------------------------------------------------
// Internal: list all saved reports across all owners (for cron nudge scan)
// Bounded to 100 to avoid unbounded reads in cron context.
// ---------------------------------------------------------------------------
export const listAllReportsInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    const reports = await ctx.db
      .query("productReports")
      .filter((q) => q.eq(q.field("status"), "saved"))
      .order("desc")
      .take(100);

    return reports.map((r) => ({
      _id: r._id,
      ownerKey: r.ownerKey,
      title: r.title,
      query: r.query,
      lens: r.lens,
      updatedAt: r.updatedAt,
    }));
  },
});
