import { mutation, query, internalMutation, internalAction, internalQuery } from "../../_generated/server";
import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { resolveProductIdentitySafely, requireProductIdentity } from "./helpers";

export const getNudgesSnapshot = query({
  args: {
    anonymousSessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await resolveProductIdentitySafely(ctx, args.anonymousSessionId);
    const publicSnapshot = {
      nudges: [],
      channels: [
        { label: "Slack", status: "Not connected" },
        { label: "Gmail", status: "Not connected" },
        { label: "Notion", status: "Not connected" },
        { label: "Linear", status: "Not connected" },
        { label: "Discord", status: "Not connected" },
        { label: "Telegram", status: "Not connected" },
      ],
      suggestedActions: ["Reply draft ready", "Refresh report", "Follow up"],
    };

    if (!identity.ownerKey) {
      return publicSnapshot;
    }

    let nudges: any[] = [];
    try {
      nudges = await ctx.db
        .query("productNudges")
        .withIndex("by_owner_status_updated", (q) =>
          q.eq("ownerKey", identity.ownerKey!).eq("status", "open"),
        )
        .order("desc")
        .take(12);
    } catch (error) {
      console.error("[product] getNudgesSnapshot nudges failed", {
        ownerKey: identity.ownerKey,
        error,
      });
      return publicSnapshot;
    }

    const userId = identity.rawUserId as any;
    const [google, slack, notion] = identity.rawUserId
      ? await Promise.all([
          ctx.db
            .query("googleAccounts")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .first()
            .catch(() => null),
          ctx.db
            .query("slackAccounts")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .first()
            .catch(() => null),
          ctx.db
            .query("notionAccounts")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .first()
            .catch(() => null),
        ])
      : [null, null, null];

    return {
      nudges,
      channels: [
        { label: "Slack", status: slack ? "Connected" : "Not connected" },
        { label: "Gmail", status: google ? "Connected" : "Not connected" },
        { label: "Notion", status: notion ? "Connected" : "Not connected" },
        { label: "Linear", status: "Not connected" },
        { label: "Discord", status: "Not connected" },
        { label: "Telegram", status: "Not connected" },
      ],
      suggestedActions: ["Reply draft ready", "Refresh report", "Follow up"],
    };
  },
});

export const snoozeNudge = mutation({
  args: {
    anonymousSessionId: v.optional(v.string()),
    nudgeId: v.id("productNudges"),
  },
  handler: async (ctx, args) => {
    const identity = await requireProductIdentity(ctx, args.anonymousSessionId);
    const nudge = await ctx.db.get(args.nudgeId);
    if (!nudge || nudge.ownerKey !== identity.ownerKey) {
      throw new Error("Nudge not found");
    }
    await ctx.db.patch(args.nudgeId, {
      status: "snoozed",
      dueAt: Date.now() + 24 * 60 * 60 * 1000,
      updatedAt: Date.now(),
    });
    return { ok: true };
  },
});

export const completeNudge = mutation({
  args: {
    anonymousSessionId: v.optional(v.string()),
    nudgeId: v.id("productNudges"),
  },
  handler: async (ctx, args) => {
    const identity = await requireProductIdentity(ctx, args.anonymousSessionId);
    const nudge = await ctx.db.get(args.nudgeId);
    if (!nudge || nudge.ownerKey !== identity.ownerKey) {
      throw new Error("Nudge not found");
    }
    await ctx.db.patch(args.nudgeId, {
      status: "done",
      updatedAt: Date.now(),
    });
    return { ok: true };
  },
});

// ---------------------------------------------------------------------------
// Internal: create a nudge (called by cron or other internal actions)
// ---------------------------------------------------------------------------
export const createNudge = internalMutation({
  args: {
    ownerKey: v.string(),
    type: v.union(
      v.literal("follow_up_due"),
      v.literal("new_source_found"),
      v.literal("report_changed"),
      v.literal("saved_watch_item_changed"),
      v.literal("connector_message_detected"),
      v.literal("cron_summary"),
      v.literal("reply_draft_ready"),
      v.literal("refresh_recommended"),
    ),
    title: v.string(),
    summary: v.string(),
    linkedReportId: v.optional(v.id("productReports")),
    actionLabel: v.optional(v.string()),
    actionTargetSurface: v.optional(v.string()),
    actionTargetId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("productNudges", {
      ownerKey: args.ownerKey,
      type: args.type,
      title: args.title,
      summary: args.summary,
      linkedReportId: args.linkedReportId,
      status: "open",
      priority: "medium",
      actionLabel: args.actionLabel ?? "Open in Chat",
      actionTargetSurface: args.actionTargetSurface ?? "chat",
      actionTargetId: args.actionTargetId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// ---------------------------------------------------------------------------
// Cron action: scan saved reports and create nudges for stale ones
// ---------------------------------------------------------------------------
export const checkReportsForNudges = internalAction({
  args: {},
  handler: async (ctx) => {
    const reports = await ctx.runQuery(
      internal.domains.product.reports.listAllReportsInternal,
      {},
    );

    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    let created = 0;

    for (const report of reports) {
      // Skip reports updated in the last 24 hours
      if (report.updatedAt > oneDayAgo) continue;

      // Check for an existing open nudge for this report to avoid duplicates
      const existingNudge = await ctx.runQuery(
        internal.domains.product.nudges.getOpenNudgeForReport,
        { ownerKey: report.ownerKey, reportId: report._id },
      );
      if (existingNudge) continue;

      const daysSinceUpdate = Math.floor(
        (Date.now() - report.updatedAt) / (24 * 60 * 60 * 1000),
      );

      await ctx.runMutation(internal.domains.product.nudges.createNudge, {
        ownerKey: report.ownerKey,
        type: "refresh_recommended",
        title: `"${report.title}" may have new information`,
        summary: `This report was last updated ${daysSinceUpdate} day${daysSinceUpdate === 1 ? "" : "s"} ago. Reopen in Chat to pull fresh sources.`,
        linkedReportId: report._id,
        actionLabel: "Open in Chat",
        actionTargetSurface: "chat",
        actionTargetId: String(report._id),
      });
      created++;
    }

    console.log(
      `[nudges] checkReportsForNudges: scanned ${reports.length} reports, created ${created} nudges`,
    );
  },
});

// ---------------------------------------------------------------------------
// Internal: check if a report already has an open nudge (dedup guard)
// ---------------------------------------------------------------------------
export const getOpenNudgeForReport = internalQuery({
  args: {
    ownerKey: v.string(),
    reportId: v.id("productReports"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("productNudges")
      .withIndex("by_owner_report", (q) =>
        q.eq("ownerKey", args.ownerKey).eq("linkedReportId", args.reportId),
      )
      .filter((q) => q.eq(q.field("status"), "open"))
      .first();
  },
});
