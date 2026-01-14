import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// NOTE: ProseMirror snapshot cleanup cron removed because the referenced
// internal function does not exist (cleanupSnapshotsCron). This avoids
// deployment errors about scheduling a missing function.

// Refresh US holidays daily (cache current and next year)
crons.interval(
  "refresh US holidays",
  { hours: 24 },
  internal.domains.calendar.holidaysActions.refreshUSCron,
  {}
);

// ═══════════════════════════════════════════════════════════════════════════
// GAM: Memory maintenance crons
// ═══════════════════════════════════════════════════════════════════════════

// Mark stale entity contexts daily (entities not refreshed in 7+ days)
crons.daily(
  "mark stale entity contexts",
  { hourUTC: 3, minuteUTC: 0 },
  internal.domains.knowledge.entityContexts.markStaleContexts,
  {}
);

// Run memory GC weekly (archive old, trim oversized)
// Disabled until memoryGC module is implemented
// crons.weekly(
//   "memory GC",
//   { dayOfWeek: "sunday", hourUTC: 4, minuteUTC: 0 },
//   internal.domains.agents.memoryGC.runWeeklyGC,
//   {}
// );

// ═══════════════════════════════════════════════════════════════════════════
// Artifact persistence cleanup crons
// ═══════════════════════════════════════════════════════════════════════════

// Cleanup old persist jobs daily (done: 7 days, failed: 14 days)
crons.daily(
  "cleanup artifact persist jobs",
  { hourUTC: 4, minuteUTC: 30 },
  internal.lib.artifactPersistence.cleanupArtifactJobs,
  {}
);

// Cleanup old dead-letters daily (keep 30 days)
crons.daily(
  "cleanup artifact dead-letters",
  { hourUTC: 4, minuteUTC: 45 },
  internal.lib.artifactPersistence.cleanupDeadLetters,
  {}
);

// ═══════════════════════════════════════════════════════════════════════════
// Global Research Ledger: Compaction and maintenance crons
// ═══════════════════════════════════════════════════════════════════════════

// Compact raw mentions to aggregates daily (process 24h window per run)
crons.daily(
  "compact global mentions",
  { hourUTC: 2, minuteUTC: 0 },
  internal.globalResearch.compaction.compactMentions,
  {}
);

// Purge old raw mentions beyond 30-day retention
crons.daily(
  "purge old global mentions",
  { hourUTC: 2, minuteUTC: 30 },
  internal.globalResearch.compaction.purgeMentions,
  {}
);

// ═══════════════════════════════════════════════════════════════════════════
// Calendar ingestion (Gmail/GCal) reconciliation
// ═══════════════════════════════════════════════════════════════════════════

crons.interval(
  "gmail ingest recent messages",
  { hours: 1 },
  internal.domains.integrations.gmail.ingestMessagesCron,
  {}
);

crons.interval(
  "email intelligence sweep",
  { minutes: 15 },
  internal.crons.emailIntelligenceCron.runEmailIntelligenceSweep,
  { maxEmails: 10 }
);

// ═══════════════════════════════════════════════════════════════════════════
// Email Management System - Full thread management, categorization & reports
// ═══════════════════════════════════════════════════════════════════════════

// Sync and process new emails every 30 minutes
// Fetches threads from Gmail, analyzes & categorizes using AI agent
crons.interval(
  "email sync and process",
  { minutes: 30 },
  internal.domains.agents.emailAgent.processNewEmailsCron,
  {}
);

// Generate and deliver daily email reports at 10:00 PM UTC (end of business day)
// Creates nested groupings by category, sends via email and/or ntfy
crons.daily(
  "daily email report",
  { hourUTC: 22, minuteUTC: 0 },
  internal.domains.integrations.email.dailyEmailReport.runDailyEmailReportCron,
  {}
);

// Detect urgent emails and send alerts every 15 minutes
// Identifies emails needing immediate attention based on AI priority or keywords
crons.interval(
  "urgent email alerts",
  { minutes: 15 },
  internal.domains.agents.emailAgent.urgentEmailAlertsCron,
  {}
);

// Renew Gmail push notification watches daily (watches expire after ~7 days)
crons.daily(
  "renew Gmail watches",
  { hourUTC: 1, minuteUTC: 0 },
  internal.domains.integrations.email.emailWebhook.renewGmailWatchesCron,
  {}
);

crons.interval(
  "gcal sync primary calendar",
  { hours: 1 },
  internal.domains.integrations.gcal.syncPrimaryCalendar,
  {}
);

// ═══════════════════════════════════════════════════════════════════════════
// SMS Meeting Reminders
// ═══════════════════════════════════════════════════════════════════════════

// Send SMS reminders for upcoming meetings (runs every 5 minutes)
crons.interval(
  "send meeting reminder SMS",
  { minutes: 5 },
  internal.domains.integrations.sms.sendMeetingRemindersCron,
  {}
);

// Deduplicate global artifacts (merge race-condition duplicates)
crons.daily(
  "dedupe global artifacts",
  { hourUTC: 3, minuteUTC: 30 },
  internal.globalResearch.compaction.dedupeArtifacts,
  {}
);

// Cleanup stale locks hourly (locks stuck in "running" > 1 hour)
crons.interval(
  "cleanup stale global locks",
  { hours: 1 },
  internal.globalResearch.compaction.cleanupStaleLocks,
  { maxAgeMs: 60 * 60 * 1000 }
);

// Purge old research events weekly (keep 90 days)
crons.weekly(
  "purge old research events",
  { dayOfWeek: "sunday", hourUTC: 3, minuteUTC: 0 },
  internal.globalResearch.compaction.purgeOldEvents,
  { retentionDays: 90 }
);

// ═══════════════════════════════════════════════════════════════════════════
// Meta-Tool Discovery: Cache maintenance crons
// ═══════════════════════════════════════════════════════════════════════════

// Cleanup expired tool search cache entries hourly (TTL: 1 hour)
crons.interval(
  "cleanup tool search cache",
  { hours: 1 },
  internal.tools.meta.hybridSearchQueries.invalidateExpiredCache,
  {}
);

// ═══════════════════════════════════════════════════════════════════════════
// Search Fusion: Benchmark evaluation retention cleanup
// ═══════════════════════════════════════════════════════════════════════════

// Cleanup old search evaluations weekly (90-day retention policy)
// Runs Sunday at 5:00 AM UTC to avoid peak usage hours
crons.weekly(
  "cleanup search evaluations",
  { dayOfWeek: "sunday", hourUTC: 5, minuteUTC: 0 },
  internal.domains.search.fusion.benchmark.cleanupOldEvaluations,
  {}
);

// ═══════════════════════════════════════════════════════════════════════════
// Feed Ingestion Crons
// ═══════════════════════════════════════════════════════════════════════════

// Ingest Hacker News hourly (top stories)
crons.interval("ingest Hacker News feed", { hours: 1 }, internal.feed.ingestHackerNewsInternal, {});

// Ingest ArXiv CS.AI papers every 6 hours (new papers published at ~8pm ET)
crons.interval("ingest ArXiv AI papers", { hours: 6 }, internal.feed.ingestArXivInternal, {});

// Ingest Reddit /r/MachineLearning every 4 hours
crons.interval("ingest Reddit ML feed", { hours: 4 }, internal.feed.ingestRedditInternal, {});

// Ingest RSS feeds every 2 hours (TechCrunch, etc.)
crons.interval("ingest RSS tech feeds", { hours: 2 }, internal.feed.ingestRSSInternal, {});

// ═══════════════════════════════════════════════════════════════════════════
// Funding Detection Pipeline - Auto-detect funding from feeds, enrich, dedupe
// ═══════════════════════════════════════════════════════════════════════════

// Scan feed items for funding announcements every 30 minutes
// Runs after feed ingestion to detect new funding events
crons.interval(
  "detect funding from feeds",
  { minutes: 30 },
  internal.domains.enrichment.fundingDetection.detectFundingCandidates,
  { lookbackHours: 6, minConfidence: 0.3, limit: 50 }
);

// Process enrichment queue every 5 minutes
// Handles funding_detection, entity_promotion, verification jobs
crons.interval(
  "process enrichment queue",
  { minutes: 5 },
  internal.domains.enrichment.enrichmentWorker.startBatchProcessing,
  { limit: 10 }
);

// ═══════════════════════════════════════════════════════════════════════════
// Daily Morning Brief - Automated dashboard metrics and digest generation
// ═══════════════════════════════════════════════════════════════════════════

// Run daily morning brief at 6:00 AM UTC
// Orchestrates: feed ingestion → dashboard metrics → digest generation → storage
crons.daily(
  "generate daily morning brief",
  { hourUTC: 6, minuteUTC: 0 },
  internal.workflows.dailyMorningBrief.runDailyMorningBrief,
  {}
);

// Post daily digest to LinkedIn at 6:15 AM UTC (15 min after digest generation)
// Uses fact-checked findings + digest summary, formatted for professional audience
crons.daily(
  "post daily digest to LinkedIn",
  { hourUTC: 6, minuteUTC: 15 },
  internal.workflows.dailyLinkedInPost.postDailyDigestToLinkedIn,
  { persona: "GENERAL", model: "mimo-v2-flash-free" }
);

// Post daily funding tracker to LinkedIn at 12:00 PM UTC (separate from main digest)
// Dedicated post for startup funding news, ranked by amount
crons.daily(
  "post daily funding to LinkedIn",
  { hourUTC: 12, minuteUTC: 0 },
  internal.workflows.dailyLinkedInPost.postDailyFundingToLinkedIn,
  { hoursBack: 24 }
);

// Post VC Deal Flow Memo to LinkedIn at 9:00 AM UTC
// Investment-focused content for VCs and investors
crons.daily(
  "post VC deal flow memo to LinkedIn",
  { hourUTC: 9, minuteUTC: 0 },
  internal.workflows.dailyLinkedInPost.postDailyDigestToLinkedIn,
  { persona: "VC_INVESTOR", model: "mimo-v2-flash-free" }
);

// Post Tech Radar to LinkedIn at 3:00 PM UTC
// Engineering intelligence for CTOs and developers
crons.daily(
  "post tech radar to LinkedIn",
  { hourUTC: 15, minuteUTC: 0 },
  internal.workflows.dailyLinkedInPost.postDailyDigestToLinkedIn,
  { persona: "TECH_BUILDER", model: "mimo-v2-flash-free" }
);

// Post Startup Funding Brief to LinkedIn at 10:00 AM UTC
// Detailed company profiles with founders, products, investors
crons.daily(
  "post startup funding brief to LinkedIn",
  { hourUTC: 10, minuteUTC: 0 },
  internal.workflows.dailyLinkedInPost.postStartupFundingBrief,
  { hoursBack: 48, maxProfiles: 5 }
);

// Advance Daily Brief domain memory tasks every 15 minutes
crons.interval(
  "advance daily brief tasks",
  { minutes: 15 },
  internal.domains.research.dailyBriefWorker.runNextTaskInternal,
  {}
);

// Agent run orchestration: reclaim expired leases frequently so work can be picked up by other workers.
crons.interval(
  "reclaim expired agent run leases",
  { minutes: 1 },
  internal.domains.agents.orchestrator.queueProtocol.reclaimExpiredLeases,
  {}
);

// ═══════════════════════════════════════════════════════════════════════════
// AUTONOMOUS AGENT ECOSYSTEM - Deep Agents 3.0
// Zero-Human-Input Continuous Intelligence Platform
// ═══════════════════════════════════════════════════════════════════════════

// --- Signal Ingestion ---
// Ingest signals from all configured sources (RSS feeds, etc.) every 5 minutes
crons.interval(
  "autonomous signal ingestion",
  { minutes: 5 },
  internal.domains.signals.signalIngester.tickSignalIngestion,
  {}
);

// Process pending signals every minute
crons.interval(
  "autonomous signal processing",
  { minutes: 1 },
  internal.domains.signals.signalProcessor.tickSignalProcessing,
  {}
);

// --- Research Queue ---
// Run autonomous research loop every minute
// Dequeues highest priority tasks and executes research swarms
crons.interval(
  "autonomous research loop",
  { minutes: 1 },
  internal.domains.research.autonomousResearcher.tickAutonomousResearch,
  {}
);

// --- Publishing Pipeline ---
// Process publishing tasks (format and deliver to channels)
crons.interval(
  "autonomous publishing",
  { minutes: 1 },
  internal.domains.publishing.publishingOrchestrator.tickPublishing,
  {}
);

// Process delivery queue (retry failed deliveries)
crons.interval(
  "autonomous delivery queue",
  { minutes: 1 },
  internal.domains.publishing.deliveryQueue.tickDeliveryQueue,
  {}
);

// --- Entity Lifecycle ---
// Update entity decay scores hourly
crons.interval(
  "entity decay hourly update",
  { hours: 1 },
  internal.domains.entities.decayManager.tickDecayUpdate,
  {}
);

// Daily decay check and stale entity re-research queuing
// Runs at midnight UTC to identify and queue stale entities
crons.daily(
  "entity decay daily check",
  { hourUTC: 0, minuteUTC: 0 },
  internal.domains.entities.decayManager.checkAndQueueStale,
  {}
);

// --- Cleanup Jobs ---
// Cleanup old research tasks weekly (completed/failed > 7 days)
crons.weekly(
  "cleanup old research tasks",
  { dayOfWeek: "sunday", hourUTC: 4, minuteUTC: 0 },
  internal.domains.research.researchQueue.cleanupOldTasks,
  {}
);

// Cleanup expired signals weekly
crons.weekly(
  "cleanup expired signals",
  { dayOfWeek: "sunday", hourUTC: 4, minuteUTC: 15 },
  internal.domains.signals.signalIngester.cleanupExpiredSignals,
  {}
);

// Cleanup old delivery jobs weekly
crons.weekly(
  "cleanup old delivery jobs",
  { dayOfWeek: "sunday", hourUTC: 4, minuteUTC: 30 },
  internal.domains.publishing.deliveryQueue.cleanupOldJobs,
  {}
);

// --- Self-Questioning & Validation (Phase 3) ---
// Auto-resolve low-severity contradictions daily
crons.daily(
  "auto-resolve contradictions",
  { hourUTC: 5, minuteUTC: 0 },
  internal.domains.validation.contradictionDetector.autoResolveContradictions,
  { limit: 100 }
);

// --- Persona-Driven Autonomy (Phase 6) ---
// Run all-persona autonomous research every 30 minutes
crons.interval(
  "persona autonomous research",
  { minutes: 30 },
  internal.domains.personas.personaAutonomousAgent.tickAllPersonas,
  {}
);

// Reset persona budgets daily at midnight UTC
crons.daily(
  "reset persona budgets",
  { hourUTC: 0, minuteUTC: 5 },
  internal.domains.personas.personaAutonomousAgent.initializeAllBudgets,
  {}
);

// --- Self-Healing & Observability (Phase 7) ---
// Run health checks every 5 minutes
crons.interval(
  "system health check",
  { minutes: 5 },
  internal.domains.observability.healthMonitor.tickHealthCheck,
  {}
);

// Run self-healing every 15 minutes
crons.interval(
  "autonomous self-healing",
  { minutes: 15 },
  internal.domains.observability.selfHealer.tickSelfHealing,
  {}
);

// Generate health report daily
crons.daily(
  "generate health report",
  { hourUTC: 7, minuteUTC: 0 },
  internal.domains.observability.healthMonitor.generateHealthReport,
  { hours: 24 }
);

// Cleanup old health checks weekly (keep 7 days)
crons.weekly(
  "cleanup old health checks",
  { dayOfWeek: "sunday", hourUTC: 4, minuteUTC: 45 },
  internal.domains.observability.healthMonitor.cleanupOldHealthChecks,
  {}
);

// Cleanup old healing actions weekly (keep 30 days)
crons.weekly(
  "cleanup old healing actions",
  { dayOfWeek: "sunday", hourUTC: 5, minuteUTC: 0 },
  internal.domains.observability.selfHealer.cleanupOldHealingActions,
  {}
);

// ═══════════════════════════════════════════════════════════════════════════
// FREE MODEL DISCOVERY & EVALUATION - Zero-cost autonomous operations
// ═══════════════════════════════════════════════════════════════════════════

// Discover and evaluate free models hourly
crons.interval(
  "free model discovery and evaluation",
  { hours: 1 },
  internal.domains.models.freeModelDiscovery.tickModelDiscovery,
  {}
);

// Cleanup old autonomous model usage weekly (keep 7 days)
crons.weekly(
  "cleanup autonomous model usage",
  { dayOfWeek: "sunday", hourUTC: 5, minuteUTC: 15 },
  internal.domains.models.autonomousModelResolver.cleanupOldUsageRecords,
  {}
);

// ═══════════════════════════════════════════════════════════════════════════
// SCHEDULED PDF REPORTS - Automated funding report generation
// ═══════════════════════════════════════════════════════════════════════════

// Weekly funding report - Every Monday at 8:00 AM UTC
// Generates PDF with AI insights and distributes to Discord/ntfy
crons.weekly(
  "generate weekly funding PDF report",
  { dayOfWeek: "monday", hourUTC: 8, minuteUTC: 0 },
  internal.workflows.scheduledPDFReports.runWeeklyReportCron,
  {}
);

// Monthly funding report - 1st of each month at 9:00 AM UTC
// Full distribution including LinkedIn
crons.monthly(
  "generate monthly funding PDF report",
  { day: 1, hourUTC: 9, minuteUTC: 0 },
  internal.workflows.scheduledPDFReports.runMonthlyReportCron,
  {}
);

// Quarterly funding report - 1st of quarter (Jan, Apr, Jul, Oct) at 10:00 AM UTC
// Comprehensive JPMorgan-style executive summary
// Note: Using monthly cron with day filter since Convex doesn't have quarterly cron
crons.monthly(
  "generate quarterly funding PDF report",
  { day: 1, hourUTC: 10, minuteUTC: 0 },
  internal.workflows.scheduledPDFReports.runQuarterlyReportCron,
  {}
);

export default crons;
