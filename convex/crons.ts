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

export default crons;
