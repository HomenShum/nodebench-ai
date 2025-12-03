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

export default crons;
