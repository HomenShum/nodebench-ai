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
  (internal as any).holidays_actions.refreshUSCron,
  {}
);

// ═══════════════════════════════════════════════════════════════════════════
// GAM: Memory maintenance crons
// ═══════════════════════════════════════════════════════════════════════════

// Mark stale entity contexts daily (entities not refreshed in 7+ days)
crons.daily(
  "mark stale entity contexts",
  { hourUTC: 3, minuteUTC: 0 },
  internal.entityContexts.markStaleContexts,
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

export default crons;
