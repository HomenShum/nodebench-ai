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
  url?: string;
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
  // Dedupe by headline to avoid repetition
  const seen = new Set<string>();
  const uniqueSignals = signals.filter((signal: any) => {
    const headline = (signal.headline ?? "").toLowerCase().trim();
    if (seen.has(headline)) return false;
    seen.add(headline);
    return true;
  });
  return uniqueSignals.slice(0, 3).map((signal: any) => {
    const url = signal.evidence?.[0]?.url ?? "";
    const source = signal.evidence?.[0]?.source ?? "n/a";
    const headline = clipText(signal.headline ?? "Signal update", 100);
    return url ? `${headline} (${source})\n   ${url}` : `${headline} (${source})`;
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

type NormalizedFeedItem = FeedItemLite & { text: string };

function buildPersonaHighlights(feedItems: FeedItemLite[]): string[] {
  // Dedupe feed items by URL first
  const urlMap = new Map<string, FeedItemLite>();
  for (const item of feedItems) {
    const url = (item.url ?? "").trim();
    const existing = url ? urlMap.get(url) : undefined;
    if (!existing || (item.score ?? 0) > (existing.score ?? 0)) {
      urlMap.set(url || `no-url-${urlMap.size}`, item);
    }
  }
  const dedupedItems = Array.from(urlMap.values());

  const configs = [
    {
      label: "VCs",
      keywords: ["funding", "raise", "series", "seed", "round", "valuation", "investment", "acquisition", "nvidia", "billion"],
      categories: ["startups", "finance"],
      types: ["news", "product", "signal"],
    },
    {
      label: "Tech Leaders",
      keywords: ["benchmark", "model", "agent", "architecture", "paper", "arxiv", "release", "ai", "llm", "gpu"],
      categories: ["ai_ml", "research"],
      types: ["news", "signal"],
    },
    {
      label: "Developers",
      keywords: ["github", "repo", "release", "package", "library", "sdk", "cve", "vulnerability", "open source"],
      categories: ["opensource"],
      types: ["repo", "news"],
    },
    {
      label: "Startup Founders",
      keywords: ["launch", "product", "users", "growth", "pricing", "market", "yc", "ycombinator"],
      categories: ["products", "startups"],
      types: ["product", "news", "signal"],
    },
    {
      label: "Research",
      keywords: ["paper", "arxiv", "study", "research", "analysis", "findings"],
      categories: ["research", "ai_ml"],
      types: ["news"],
    },
  ];

  const normalized: NormalizedFeedItem[] = dedupedItems.map((item) => ({
    ...item,
    text: normalizeText(`${item.title} ${item.summary ?? ""} ${(item.tags ?? []).join(" ")}`).toLowerCase(),
  }));

  // Track used URLs to avoid showing same story for multiple personas
  const usedUrls = new Set<string>();

  return configs.map((config) => {
    const matches = normalized.filter((item) => {
      const url = (item.url ?? "").trim();
      if (url && usedUrls.has(url)) return false;
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
    const url = (top.url ?? "").trim();
    if (url) usedUrls.add(url);
    return `${config.label}: ${clipText(top.title, 90)} (${top.source ?? "source"})`;
  });
}

type TopStory = {
  title: string;
  url: string;
  source: string;
  score: number;
  summary?: string;
  category?: string;
};

function getTopStories(feedItems: FeedItemLite[], limit: number = 5): TopStory[] {
  // Dedupe by URL, keep highest scored
  const urlMap = new Map<string, FeedItemLite>();
  for (const item of feedItems) {
    const url = (item.url ?? "").trim();
    if (!url) continue;
    const existing = urlMap.get(url);
    if (!existing || (item.score ?? 0) > (existing.score ?? 0)) {
      urlMap.set(url, item);
    }
  }
  return Array.from(urlMap.values())
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, limit)
    .map((item) => ({
      title: item.title,
      url: item.url ?? "",
      source: item.source ?? "Unknown",
      score: item.score ?? 0,
      summary: item.summary,
      category: item.category,
    }));
}

function extractShortName(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.split("/").filter(Boolean);
    if (u.hostname.includes("github.com") && path.length >= 2) {
      return `${path[0]}/${path[1]}`;
    }
    if (u.hostname.includes("arxiv.org")) {
      return path[path.length - 1] || "paper";
    }
    return u.hostname.replace(/^www\./, "").split(".")[0];
  } catch {
    return "link";
  }
}

function generateNarrativeThesis(topStories: TopStory[], feedItems: FeedItemLite[]): string {
  if (topStories.length === 0) return "Light signal day. Check back tomorrow for fresh intelligence.";

  // Analyze all text for themes
  const allText = feedItems
    .slice(0, 25)
    .map((i) => `${i.title} ${i.summary ?? ""}`.toLowerCase())
    .join(" ");

  // Detect dominant themes with weights
  const themeSignals: Array<{ theme: string; weight: number; verb: string }> = [];

  if (allText.includes("acqui") || allText.includes("billion") || allText.includes("buy") || allText.includes("merger")) {
    const count = (allText.match(/acqui|billion|buy|merger/g) || []).length;
    themeSignals.push({ theme: "M&A", weight: count * 3, verb: "consolidates" });
  }
  if (allText.includes("nvidia") || allText.includes("gpu") || allText.includes("chip")) {
    const count = (allText.match(/nvidia|gpu|chip/g) || []).length;
    themeSignals.push({ theme: "Hardware/Chips", weight: count * 2, verb: "dominates" });
  }
  if (allText.includes("biotech") || allText.includes("clinical") || allText.includes("pharma")) {
    const count = (allText.match(/biotech|clinical|pharma/g) || []).length;
    themeSignals.push({ theme: "BioTech", weight: count * 2, verb: "advances" });
  }
  if (allText.includes("open source") || allText.includes("github")) {
    const count = (allText.match(/open.?source|github/g) || []).length;
    themeSignals.push({ theme: "Open Source", weight: count, verb: "gains momentum" });
  }
  if (allText.includes("ai") || allText.includes("llm") || allText.includes("model")) {
    const count = (allText.match(/\bai\b|llm|model/g) || []).length;
    themeSignals.push({ theme: "AI/ML", weight: count, verb: "evolves" });
  }
  if (allText.includes("security") || allText.includes("vulnerability") || allText.includes("cve")) {
    const count = (allText.match(/security|vulnerability|cve/g) || []).length;
    themeSignals.push({ theme: "Security", weight: count * 2, verb: "alerts" });
  }
  if (allText.includes("startup") || allText.includes("funding") || allText.includes("seed") || allText.includes("series")) {
    const count = (allText.match(/startup|funding|seed|series/g) || []).length;
    themeSignals.push({ theme: "Startups", weight: count, verb: "raises" });
  }

  // Sort by weight
  themeSignals.sort((a, b) => b.weight - a.weight);
  const topThemes = themeSignals.slice(0, 2);

  // Build thesis based on lead story + themes
  const lead = topStories[0];
  const leadLower = lead.title.toLowerCase();

  let thesis = "";

  // Smart lead based on content type
  if (leadLower.includes("nvidia") && (leadLower.includes("buy") || leadLower.includes("acqui"))) {
    thesis = `Capital moves big: ${clipText(lead.title, 55)}.`;
  } else if (leadLower.includes("billion")) {
    thesis = `Major deal alert: ${clipText(lead.title, 55)}.`;
  } else if (lead.source === "GitHub") {
    const repoName = extractShortName(lead.url);
    thesis = `Developer spotlight on **${repoName}** as it trends across the community.`;
  } else if (lead.source === "ArXiv") {
    thesis = `Research focus: ${clipText(lead.title, 50)}.`;
  } else if (lead.source === "YCombinator" || lead.source === "HackerNews") {
    thesis = `Community attention: ${clipText(lead.title, 50)}.`;
  } else {
    thesis = `Lead signal: ${clipText(lead.title, 50)}.`;
  }

  // Add theme context
  if (topThemes.length >= 2) {
    thesis += ` Today's cycle: **${topThemes[0].theme}** ${topThemes[0].verb}, **${topThemes[1].theme}** ${topThemes[1].verb}.`;
  } else if (topThemes.length === 1) {
    thesis += ` Primary theme: **${topThemes[0].theme}** ${topThemes[0].verb}.`;
  }

  return thesis;
}

function formatTrendIndicator(stat: any): string {
  const value = stat.value ?? "";
  const trend = stat.trend;
  const label = stat.label ?? "";
  const labelLower = label.toLowerCase();

  // Determine if metric should be inverted (lower = better)
  const invertedMetrics = ["fail", "latency", "error", "bug"];
  const isInverted = invertedMetrics.some((m) => labelLower.includes(m));

  // Get indicator and context
  let indicator = "";
  let context = "";

  if (labelLower.includes("fail") && value.includes("0")) {
    indicator = "✔";
    context = "Stable";
  } else if (trend === "up") {
    indicator = isInverted ? "▲" : "▲";
    context = isInverted ? "Watch" : "Rising";
  } else if (trend === "down") {
    indicator = isInverted ? "▼" : "▼";
    context = isInverted ? "Improving" : "Falling";
  } else {
    indicator = "─";
    context = "Flat";
  }

  return `${label} ${value} ${indicator}`;
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

  const keyStats = args.dashboardMetrics?.keyStats ?? [];
  const topStories = getTopStories(feedItems, 5);

  // Generate narrative thesis from actual content (not metadata)
  const llmSynthesis = args.executiveBrief?.actII?.synthesis;
  const isBoilerplate = !llmSynthesis || llmSynthesis.includes("feed clusters around");
  const narrativeThesis = generateNarrativeThesis(topStories, feedItems);
  const synthesis = isBoilerplate ? narrativeThesis : llmSynthesis;

  // Build the 3-Act narrative
  const lines: string[] = [];

    // === HEADER ===
    lines.push(`**Morning Dossier** ${dateLabel}`);
    lines.push(`Summary: ${clipText(narrativeThesis, 160)}`);
    lines.push(`[Open Full Dashboard](https://nodebench-ai.vercel.app/)`);
    lines.push("");

  // === ACT I: THE SETUP (Narrative thesis, not metadata) ===
  lines.push("**ACT I: The Setup**");
  // Lead with the thesis - what this day MEANS, not how many items
  lines.push(clipText(narrativeThesis, 200));
  // Compact pulse with trend indicators
  if (keyStats.length > 0) {
    const pulseFormatted = keyStats
      .slice(0, 3)
      .map(formatTrendIndicator)
      .join(" | ");
    lines.push(`_Pulse: ${pulseFormatted}_`);
  }

  // === ACT II: THE SIGNAL ===
  lines.push("");
  lines.push("**ACT II: The Signal**");

  // Top signals with markdown links and summaries
  const signals = args.executiveBrief?.actII?.signals ?? [];
  const seenHeadlines = new Set<string>();
  const uniqueSignals = signals.filter((s: any) => {
    const h = (s.headline ?? "").toLowerCase().trim();
    if (seenHeadlines.has(h)) return false;
    seenHeadlines.add(h);
    return true;
  }).slice(0, 3);

  if (uniqueSignals.length > 0) {
    uniqueSignals.forEach((signal: any, idx: number) => {
      const url = signal.evidence?.[0]?.url ?? "";
      const headline = clipText(signal.headline ?? "Signal", 65);
      const signalSynthesis = signal.synthesis && !signal.synthesis.includes("Article from")
        ? clipText(signal.synthesis, 70)
        : "";

      if (url) {
        lines.push(`${idx + 1}. [${headline}](${url})`);
        if (signalSynthesis) {
          lines.push(`   _${signalSynthesis}_`);
        }
      } else {
        lines.push(`${idx + 1}. ${headline}`);
      }
    });
  } else if (topStories.length > 0) {
    // Fallback to top stories if no signals
    topStories.slice(0, 3).forEach((story, idx) => {
      const shortSummary = story.summary && !story.summary.includes("Trending on")
        ? clipText(story.summary, 55)
        : "";
      lines.push(`${idx + 1}. [${clipText(story.title, 65)}](${story.url})`);
      if (shortSummary) {
        lines.push(`   _${shortSummary}_`);
      }
    });
  }

  // === ACT III: THE MOVE ===
  lines.push("");
  lines.push("**ACT III: The Move**");

  // Action-oriented persona recommendations
  const personaActions = buildPersonaActions(feedItems);
  personaActions.forEach((action) => lines.push(`• ${action}`));

  // === FOOTER ===
  lines.push("");
  lines.push("---");
  lines.push("[Open Full Dashboard](https://nodebench-ai.vercel.app/)");

  return {
    title: `Morning Dossier ${dateLabel}`,
    body: sanitizeText(lines.join("\n")),
  };
}

function buildPersonaActions(feedItems: FeedItemLite[]): string[] {
  // Dedupe feed items by URL first
  const urlMap = new Map<string, FeedItemLite>();
  for (const item of feedItems) {
    const url = (item.url ?? "").trim();
    const existing = url ? urlMap.get(url) : undefined;
    if (!existing || (item.score ?? 0) > (existing.score ?? 0)) {
      urlMap.set(url || `no-url-${urlMap.size}`, item);
    }
  }
  const dedupedItems = Array.from(urlMap.values());

  const configs = [
    {
      label: "Investors",
      keywords: ["funding", "raise", "series", "acquisition", "nvidia", "billion", "ipo", "valuation", "deal"],
      action: (item: FeedItemLite) => {
        const shortName = extractShortName(item.url ?? "");
        // Avoid name:name echo - use summary or a smart fallback
        const context = item.summary && !item.summary.includes("Trending")
          ? clipText(item.summary, 45)
          : clipText(item.title, 45);
        // Don't repeat shortName if it's already in context
        if (context.toLowerCase().includes(shortName.toLowerCase())) {
          return `Track: ${context}`;
        }
        return `Track **${shortName}**: ${context}`;
      },
    },
    {
      label: "Engineers",
      keywords: ["github", "repo", "release", "library", "sdk", "runtime", "benchmark", "tool"],
      action: (item: FeedItemLite) => {
        const shortName = extractShortName(item.url ?? "");
        // Provide actionable context
        const desc = item.summary && !item.summary.includes("Trending")
          ? clipText(item.summary, 40)
          : null;
        if (desc) {
          return `Evaluate **${shortName}** - ${desc}`;
        }
        return `Evaluate **${shortName}** for your stack`;
      },
    },
    {
      label: "Researchers",
      keywords: ["paper", "arxiv", "study", "model", "architecture", "benchmark", "research"],
      action: (item: FeedItemLite) => {
        return `Review: ${clipText(item.title, 55)}`;
      },
    },
  ];

  const normalized = dedupedItems.map((item) => ({
    ...item,
    text: normalizeText(`${item.title} ${item.summary ?? ""} ${(item.tags ?? []).join(" ")}`).toLowerCase(),
  }));

  const usedUrls = new Set<string>();
  const actions: string[] = [];

  for (const config of configs) {
    const matches = normalized.filter((item) => {
      const url = (item.url ?? "").trim();
      if (url && usedUrls.has(url)) return false;
      return config.keywords.some((kw) => item.text.includes(kw));
    });

    const top = matches.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];
    if (top) {
      const url = (top.url ?? "").trim();
      if (url) usedUrls.add(url);
      actions.push(`${config.label}: ${config.action(top)}`);
    }
  }

  // Always include a default action
  if (actions.length === 0) {
    actions.push("Review the dashboard for today's highlights");
  }

  return actions;
}
