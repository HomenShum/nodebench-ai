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
      // STEP 5c: Send morning digest emails and SMS with meeting reminders
      // ========================================================================
      console.log("[dailyMorningBrief] 📧 Step 5c: Sending meeting reminder emails and SMS...");

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
                  ? `Today we're tracking ${sourceSummary.totalItems} items across ${Object.keys(sourceSummary.sources || {}).length} sources.`
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
