"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal, api } from "../_generated/api";
import { generateMorningDigestEmail, type MeetingReminder } from "../domains/integrations/email/morningDigestEmailTemplate";

/**
 * Daily Morning Brief Workflow
 *
 * Orchestrates the automated daily morning brief generation:
 * 1. Ingest fresh data from all free sources (HN, GitHub, Dev.to, ArXiv, etc.)
 * 2. Calculate dashboard metrics for StickyDashboard
 * 3. Generate AI summary for Morning Digest
 * 4. Store results in database
 * 5. Send meeting reminder emails to users with events today
 *
 * Runs daily at 6:00 AM UTC via cron job
 */
export const runDailyMorningBrief = internalAction({
  args: {},
  handler: async (ctx): Promise<any> => {
    const startTime = Date.now();
    console.log("[dailyMorningBrief] dYO. Starting daily morning brief workflow...");

    const errors: string[] = [];
    let ntfySent = false;
    let ntfySkipped = false;

    try {
      // ========================================================================
      // STEP 1: Ingest fresh data from all free sources
      // ========================================================================
      console.log("[dailyMorningBrief] dY\" Step 1: Ingesting data from all sources...");

      const ingestResult: any = await ctx.runAction(api.feed.ingestAll, {});

      console.log("[dailyMorningBrief] ƒo. Ingestion complete:", {
        hackerNews: ingestResult.hackerNews,
        github: ingestResult.github,
        devTo: ingestResult.devTo,
        arxiv: ingestResult.arxiv,
        reddit: ingestResult.reddit,
      });

      // Track any ingestion errors
      if (ingestResult.hackerNews?.status === "error") {
        errors.push(`HackerNews: ${ingestResult.hackerNews.message}`);
      }
      if (ingestResult.github?.status === "error") {
        errors.push(`GitHub: ${ingestResult.github.message}`);
      }
      if (ingestResult.devTo?.status === "error") {
        errors.push(`Dev.to: ${ingestResult.devTo.message}`);
      }

      // ========================================================================
      // STEP 2: Calculate dashboard metrics
      // ========================================================================
      console.log("[dailyMorningBrief] dY\"S Step 2: Calculating dashboard metrics...");

      const {
        dashboardMetrics,
        sourceSummary,
      }: any = await ctx.runAction(
        internal.domains.research.dashboardMetrics.calculateDashboardMetrics,
        {},
      );

      console.log("[dailyMorningBrief] ƒo. Dashboard metrics calculated");

      // ========================================================================
      // STEP 3: Source summary (derived from feed items)
      // ========================================================================
      console.log("[dailyMorningBrief] dY\"? Step 3: Generating source summary...");

      // ========================================================================
      // STEP 4: Store dashboard metrics
      // ========================================================================
      console.log("[dailyMorningBrief] dY\"'_ Step 4: Storing dashboard metrics...");

      const processingTime = Date.now() - startTime;

      const storeResult: any = await ctx.runMutation(
        internal.domains.research.dashboardMutations.storeDashboardMetrics,
        {
          dashboardMetrics,
          sourceSummary,
          processingTimeMs: processingTime,
        },
      );

      console.log("[dailyMorningBrief] ƒo. Metrics stored:", storeResult);

      // ========================================================================
      // STEP 5: Initialize daily brief domain memory (two-agent pattern)
      // ========================================================================
      try {
        await ctx.runAction(
          internal.domains.research.dailyBriefInitializer.initializeForSnapshot,
          { snapshotId: storeResult.snapshotId },
        );
        console.log("[dailyMorningBrief] ƒo. Domain memory initialized");
      } catch (initErr) {
        console.warn("[dailyMorningBrief] Domain memory init failed:", initErr);
      }

      // STEP 5b: Generate executive narrative brief (Structured Outputs + lint gate)
      // Best-effort: fetch the latest memory (should be the one we just initialized).
      try {
        const memory: any = await ctx.runQuery(
          internal.domains.research.dailyBriefMemoryQueries.getLatestMemoryInternal,
          {},
        );
        if (memory?._id && memory.dateString === storeResult.dateString) {
          await ctx.runAction(
            internal.domains.research.executiveBrief.generateExecutiveBriefForMemoryInternal,
            { memoryId: memory._id },
          );
          console.log("[dailyMorningBrief] ’'o. Executive brief generated");
        }
      } catch (briefErr) {
        console.warn("[dailyMorningBrief] Executive brief generation failed:", briefErr);
      }

      // ========================================================================
      // STEP 5c: Send global ntfy morning digest (dense, verified)
      // ========================================================================
      console.log("[dailyMorningBrief] Step 5c: Sending ntfy morning digest...");

      try {
        const feedItems = await ctx.runQuery(
          internal.domains.research.dashboardQueries.getFeedItemsForMetrics,
          {},
        );

        const memoriesForDate: any[] = await ctx.runQuery(
          internal.domains.research.dailyBriefMemoryQueries.listMemoriesByDateStringInternal,
          { dateString: storeResult.dateString, limit: 15 },
        );
        const memoryForDate = memoriesForDate[0] ?? null;
        const latestMemory: any = await ctx.runQuery(
          internal.domains.research.dailyBriefMemoryQueries.getLatestMemoryInternal,
          {},
        );
        const digestMemory = memoryForDate ?? latestMemory;
        const digestContext = (digestMemory?.context ?? {}) as any;
        const alreadySent = memoriesForDate.some(
          (memory) => memory?.context?.ntfyDigestDate === storeResult.dateString,
        );

        if (alreadySent) {
          ntfySkipped = true;
          console.log("[dailyMorningBrief] ntfy digest already sent; skipping");
        } else {
          const briefRecord = (digestContext as any)?.executiveBriefRecord;
          const executiveBrief =
            briefRecord?.brief ||
            digestContext.executiveBrief ||
            digestContext.generatedBrief ||
            null;

          const digestPayload = buildNtfyDigestPayload({
            dateString: storeResult.dateString,
            sourceSummary,
            dashboardMetrics,
            feedItems,
            executiveBrief,
            briefRecordStatus: briefRecord?.status,
            evidence: briefRecord?.evidence,
          });

          await ctx.runAction(api.domains.integrations.ntfy.sendNotification, {
            title: digestPayload.title,
            body: digestPayload.body,
            priority: 3,
            tags: ["newspaper", "bar_chart", "briefcase"],
            eventType: "morning_digest",
          });

          ntfySent = true;
          console.log("[dailyMorningBrief] ntfy digest sent");

          if (digestMemory?._id) {
            await ctx.runMutation(
              internal.domains.research.dailyBriefMemoryMutations.updateMemoryContext,
              {
                memoryId: digestMemory._id,
                contextPatch: {
                  ntfyDigestDate: storeResult.dateString,
                  ntfyDigestSentAt: Date.now(),
                },
              },
            );
          }
        }
      } catch (ntfyErr: any) {
        console.warn("[dailyMorningBrief] ntfy digest failed:", ntfyErr?.message);
        errors.push(`ntfy digest: ${ntfyErr?.message}`);
      }

      // ========================================================================
      // STEP 5d: Send morning digest emails and SMS with meeting reminders
      // ========================================================================
      console.log("[dailyMorningBrief] Step 5d: Sending meeting reminder emails and SMS...");

      let emailsSent = 0;
      let smsSent = 0;
      try {
        // Get all users with events today
        const usersWithEvents: any[] = await ctx.runQuery(
          internal.domains.calendar.events.getUsersWithEventsToday,
          {},
        );

        console.log(`[dailyMorningBrief] Found ${usersWithEvents.length} users with events today`);

        // Format today's date for the email
        const today = new Date();
        const dateString = today.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });

        // Send email and SMS to each user with events
        for (const userWithEvents of usersWithEvents) {
          // Format meetings for the templates
          const meetings: MeetingReminder[] = userWithEvents.events.map((event: any) => ({
            title: event.title || event.rawSummary || 'Untitled Event',
            startTime: event.startTime,
            endTime: event.endTime,
            location: event.location,
            description: event.description,
            allDay: event.allDay,
          }));

          // Send email if user has email
          if (userWithEvents.email) {
            try {
              // Generate the email HTML
              const emailHtml = generateMorningDigestEmail({
                recipientName: userWithEvents.name?.split(' ')[0], // First name only
                dateString,
                meetings,
                topInsight: sourceSummary.totalItems > 0
                  ? `Today we're tracking ${sourceSummary.totalItems} items across ${Object.keys(sourceSummary.bySource || {}).length} sources.`
                  : undefined,
              });

              // Send the email
              await ctx.runAction(api.domains.integrations.email.sendEmail, {
                to: userWithEvents.email,
                subject: `☀️ Morning Dossier - ${meetings.length} meeting${meetings.length !== 1 ? 's' : ''} today`,
                body: emailHtml,
              });

              emailsSent++;
              console.log(`[dailyMorningBrief] ✉️ Email sent to ${userWithEvents.email}`);
            } catch (emailErr: any) {
              console.warn(`[dailyMorningBrief] Failed to send email to ${userWithEvents.email}:`, emailErr?.message);
              errors.push(`Email to ${userWithEvents.email}: ${emailErr?.message}`);
            }
          }

          // Send SMS if user has SMS enabled
          try {
            const smsResult: any = await ctx.runAction(
              internal.domains.integrations.sms.sendMorningDigestSms,
              {
                userId: userWithEvents.userId,
                meetings: meetings.map((m: MeetingReminder) => ({
                  title: m.title,
                  startTime: m.startTime,
                  endTime: m.endTime,
                  location: m.location,
                })),
                dateString,
              },
            );
            if (smsResult.sent) {
              smsSent++;
              console.log(`[dailyMorningBrief] 📱 SMS sent to user ${userWithEvents.userId}`);
            }
          } catch (smsErr: any) {
            console.warn(`[dailyMorningBrief] Failed to send SMS to user ${userWithEvents.userId}:`, smsErr?.message);
            // Don't add to errors array - SMS is optional
          }
        }

        console.log(`[dailyMorningBrief] ✅ Sent ${emailsSent} emails and ${smsSent} SMS messages`);
      } catch (emailStepErr: any) {
        console.warn("[dailyMorningBrief] Meeting reminder emails/SMS step failed:", emailStepErr);
        errors.push(`Meeting reminders: ${emailStepErr?.message}`);
      }

      // ========================================================================
      // STEP 6: Summary and completion
      // ========================================================================
      const totalTime = Date.now() - startTime;

      console.log("[dailyMorningBrief] dYZ% Daily morning brief complete!", {
        totalTimeMs: totalTime,
        totalItems: sourceSummary.totalItems,
        ntfySent,
        ntfySkipped,
        emailsSent,
        errors: errors.length > 0 ? errors : "none",
        snapshotId: storeResult.snapshotId,
        dateString: storeResult.dateString,
        version: storeResult.version,
      });

      return {
        success: true,
        totalTimeMs: totalTime,
        sourceSummary,
        dashboardMetrics,
        ntfySent,
        ntfySkipped,
        emailsSent,
        errors: errors.length > 0 ? errors : undefined,
        snapshotId: storeResult.snapshotId,
        dateString: storeResult.dateString,
        version: storeResult.version,
      };
    } catch (error: any) {
      console.error("[dailyMorningBrief] ƒ?O Workflow failed:", error);

      return {
        success: false,
        error: error.message,
        errors,
        totalTimeMs: Date.now() - startTime,
      };
    }
  },
});

type FeedItemLite = {
  title: string;
  summary?: string;
  source?: string;
  tags?: string[];
  category?: string;
  score?: number;
  publishedAt?: string;
  type?: string;
};

function sanitizeText(input: string): string {
  return input.replace(/[^\x00-\x7F]/g, "");
}

function normalizeText(input?: string): string {
  return sanitizeText(input ?? "").replace(/\s+/g, " ").trim();
}

function clipText(input: string, maxLen: number): string {
  const cleaned = normalizeText(input);
  if (cleaned.length <= maxLen) return cleaned;
  return `${cleaned.slice(0, Math.max(0, maxLen - 3))}...`;
}

function formatTopList(entries: Array<[string, number]>, limit: number): string {
  const top = entries
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => `${name} ${count}`);
  return top.join(", ");
}

function getTopTags(feedItems: FeedItemLite[], fallback: string[] = []): string[] {
  if (fallback.length > 0) return fallback.slice(0, 6);
  const counts = new Map<string, number>();
  feedItems.forEach((item) => {
    (item.tags ?? []).forEach((tag) => {
      const normalized = normalizeText(tag.replace(/^#/, "").toLowerCase());
      if (!normalized) return;
      counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
    });
  });
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([tag]) => `#${tag}`);
}

function buildSignalLines(executiveBrief: any): string[] {
  const signals = executiveBrief?.actII?.signals ?? [];
  return signals.slice(0, 3).map((signal: any) => {
    const evidenceCount = Array.isArray(signal.evidence) ? signal.evidence.length : 0;
    const source = signal.evidence?.[0]?.source ?? "n/a";
    const label = signal.label ? `${signal.label}: ` : "";
    return `${label}${clipText(signal.headline ?? "Signal update", 120)} (source ${source}, evidence ${evidenceCount})`;
  });
}

function buildActionLines(executiveBrief: any): string[] {
  const actions = executiveBrief?.actIII?.actions ?? [];
  return actions.slice(0, 3).map((action: any) => {
    const label = action.label || action.title || action.headline || "Action";
    const priority = action.priority || action.status;
    const deliverable = action.deliverable ? `deliverable ${action.deliverable}` : "";
    const suffix = [priority && `priority ${priority}`, deliverable].filter(Boolean).join(", ");
    return `${clipText(label, 120)}${suffix ? ` (${suffix})` : ""}`;
  });
}

function buildPersonaHighlights(feedItems: FeedItemLite[]): string[] {
  const configs = [
    {
      label: "VCs",
      keywords: ["funding", "raise", "series", "seed", "round", "valuation", "investment", "acquisition"],
      categories: ["startups", "finance"],
      types: ["news", "product"],
    },
    {
      label: "JPM Banking",
      keywords: ["ipo", "m&a", "merger", "acquisition", "sec", "fda", "clinical", "regulatory"],
      categories: ["finance", "research"],
      types: ["news"],
    },
    {
      label: "Mercury Banking",
      keywords: ["yc", "ycombinator", "batch", "seed", "startup"],
      categories: ["startups"],
      types: ["news", "product"],
    },
    {
      label: "Investment Bankers",
      keywords: ["m&a", "acquisition", "deal", "ipo", "valuation", "buyout"],
      categories: ["finance"],
      types: ["news"],
    },
    {
      label: "Tech Leaders",
      keywords: ["benchmark", "model", "agent", "architecture", "paper", "arxiv", "release"],
      categories: ["ai_ml", "research"],
      types: ["news"],
    },
    {
      label: "Startup Founders",
      keywords: ["launch", "product", "users", "growth", "pricing", "market"],
      categories: ["products", "startups"],
      types: ["product", "news"],
    },
    {
      label: "Developers",
      keywords: ["github", "repo", "release", "package", "library", "sdk", "cve", "vulnerability"],
      categories: ["opensource"],
      types: ["repo", "news"],
    },
    {
      label: "Biotech",
      keywords: ["biotech", "clinical", "fda", "trial", "pharma", "medrxiv", "biorxiv"],
      categories: ["research"],
      types: ["news"],
    },
    {
      label: "Fintech",
      keywords: ["fintech", "payments", "bank", "regulation", "cfpb", "occ", "fed"],
      categories: ["finance"],
      types: ["news"],
    },
    {
      label: "Industry Analysts",
      keywords: ["market", "industry", "report", "trend", "survey"],
      categories: ["finance", "research"],
      types: ["news"],
    },
  ];

  const normalized = feedItems.map((item) => ({
    ...item,
    text: normalizeText(`${item.title} ${item.summary ?? ""} ${(item.tags ?? []).join(" ")}`).toLowerCase(),
  }));

  return configs.map((config) => {
    const matches = normalized.filter((item) => {
      const keywordHit = config.keywords.some((keyword) => item.text.includes(keyword));
      const categoryHit = item.category ? config.categories.includes(item.category) : false;
      const typeHit = item.type ? config.types.includes(item.type) : false;
      return keywordHit || categoryHit || typeHit;
    });
    const top = matches
      .slice()
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];
    if (!top) {
      return `${config.label}: No direct signal in last 24h.`;
    }
    return `${config.label}: ${clipText(top.title, 110)} (${top.source ?? top.category ?? "source"}, ${matches.length} hits)`;
  });
}

function buildNtfyDigestPayload(args: {
  dateString?: string;
  sourceSummary?: any;
  dashboardMetrics?: any;
  feedItems?: FeedItemLite[];
  executiveBrief?: any;
  briefRecordStatus?: string;
  evidence?: Array<{ source?: string }>;
}): { title: string; body: string } {
  const dateLabel = args.dateString ?? new Date().toISOString().slice(0, 10);
  const feedItems = args.feedItems ?? [];
  const sourceSummary = args.sourceSummary ?? {};

  const totalItems = args.executiveBrief?.actI?.totalItems ?? sourceSummary.totalItems ?? feedItems.length;
  const sourcesCount = args.executiveBrief?.actI?.sourcesCount ?? Object.keys(sourceSummary.bySource ?? {}).length;
  const topSources = formatTopList(Object.entries(sourceSummary.bySource ?? {}) as Array<[string, number]>, 4) || "n/a";
  const topTags = getTopTags(feedItems, sourceSummary.topTrending ?? []);

  const evidenceList =
    args.evidence ??
    args.executiveBrief?.actII?.signals?.flatMap((signal: any) => signal.evidence ?? []) ??
    [];
  const evidenceCount = evidenceList.length;
  const confidence =
    args.executiveBrief?.quality?.confidence?.score ??
    args.executiveBrief?.meta?.confidence ??
    null;
  const status = args.briefRecordStatus === "valid" ? "verified" : "pending";

  const keyStats = args.dashboardMetrics?.keyStats ?? [];
  const pulseLine = keyStats.length
    ? keyStats.slice(0, 3).map((stat: any) => `${stat.label} ${stat.value}`).join(" | ")
    : "n/a";

  const executiveSummary = args.executiveBrief?.meta?.summary || args.executiveBrief?.actI?.synthesis || "";
  const signalLines = buildSignalLines(args.executiveBrief);
  const actionLines = buildActionLines(args.executiveBrief);
  const personaLines = buildPersonaHighlights(feedItems);

  const lines: string[] = [];
  lines.push(`NodeBench Morning Digest | ${dateLabel}`);
  lines.push(`Coverage: ${totalItems} items | Sources: ${sourcesCount} | Evidence: ${evidenceCount} | Confidence: ${confidence ?? "N/A"} | Status: ${status}`);
  lines.push(`Top sources: ${topSources}`);
  if (topTags.length > 0) {
    lines.push(`Top tags: ${topTags.join(", ")}`);
  }
  lines.push(`Pulse: ${pulseLine}`);
  if (executiveSummary) {
    lines.push(`Executive synthesis: ${clipText(executiveSummary, 280)}`);
  }
  if (signalLines.length > 0) {
    lines.push("Top signals:");
    signalLines.forEach((line) => lines.push(`- ${line}`));
  }
  if (actionLines.length > 0) {
    lines.push("Top actions:");
    actionLines.forEach((line) => lines.push(`- ${line}`));
  }
  lines.push("Persona coverage:");
  personaLines.forEach((line) => lines.push(`- ${line}`));
  lines.push("Open: https://nodebench-ai.vercel.app/");

  return {
    title: `NodeBench Morning Digest ${dateLabel}`,
    body: sanitizeText(lines.join("\n")),
  };
}

