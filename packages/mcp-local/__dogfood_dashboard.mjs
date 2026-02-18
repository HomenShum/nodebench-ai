/**
 * Dogfood script: Seeds agent monitor test data + starts dashboard.
 * Run: node __dogfood_dashboard.mjs
 */
import { startDashboardServer } from "./dist/dashboard/server.js";
import { getDb } from "./dist/db.js";
import crypto from "node:crypto";

const db = getDb();

// ── Seed test agent data ─────────────────────────────────────────
const agents = [
  { id: "agent_design_01", role: "implementer", focus: "FastAgentPanel a11y fixes", instructions: "Fix accessibility across 19 FastAgentPanel files" },
  { id: "agent_design_02", role: "code_quality_critic", focus: "Research components de-jargon", instructions: "Remove jargon from research views" },
  { id: "agent_design_03", role: "test_writer", focus: "Documents + Calendar audit", instructions: "Add type=button, aria-labels to Documents/Calendar" },
];

const tools = [
  "read_file", "edit_file", "web_search", "run_tests", "git_diff", "write_file",
  "glob_files", "grep_content", "save_session_note", "claim_agent_task",
];

console.log("Seeding agent data...");

// Insert agent roles
for (const ag of agents) {
  db.prepare(`INSERT OR REPLACE INTO agent_roles (id, session_id, role, instructions, focus_area) VALUES (?, ?, ?, ?, ?)`)
    .run(crypto.randomUUID(), ag.id, ag.role, ag.instructions, ag.focus);
}

// Insert claimed tasks
const tasks = [
  { key: "fix_fastpanel_a11y", session: "agent_design_01", desc: "Add aria-label to all icon-only buttons in FastAgentPanel" },
  { key: "dejargon_research", session: "agent_design_02", desc: "Replace 'intelligence brief' with 'research brief' across 15 files" },
  { key: "audit_calendar_buttons", session: "agent_design_03", desc: "Add type=button to EventEditorPanel close/save/delete" },
];

for (const t of tasks) {
  db.prepare(`INSERT OR REPLACE INTO agent_tasks (id, task_key, session_id, status, description, claimed_at) VALUES (?, ?, ?, 'claimed', ?, datetime('now', '-' || ? || ' minutes'))`)
    .run(crypto.randomUUID(), t.key, t.session, t.desc, Math.floor(Math.random() * 20 + 2));
}

// Insert completed tasks
db.prepare(`INSERT OR IGNORE INTO agent_tasks (id, task_key, session_id, status, description, progress_note, claimed_at, released_at) VALUES (?, ?, ?, 'released', ?, ?, datetime('now', '-45 minutes'), datetime('now', '-5 minutes'))`)
  .run(crypto.randomUUID(), "setup_design_rules", "agent_design_01", "Create reexamine_design_reduction rule files", "Created .claude/, .cursor/, .windsurf/ rules");

// Insert tool call log entries (simulating 30 min of activity)
for (let i = 0; i < 40; i++) {
  const ag = agents[Math.floor(Math.random() * agents.length)];
  const tool = tools[Math.floor(Math.random() * tools.length)];
  const dur = Math.floor(Math.random() * 3000 + 50);
  const status = Math.random() > 0.05 ? "success" : "error";
  const minsAgo = Math.floor(Math.random() * 25);
  db.prepare(`INSERT INTO tool_call_log (id, session_id, tool_name, result_status, duration_ms, created_at) VALUES (?, ?, ?, ?, ?, datetime('now', '-' || ? || ' minutes'))`)
    .run(crypto.randomUUID(), ag.id, tool, status, dur, minsAgo);
}

// Insert token budget entries
for (const ag of agents) {
  const used = Math.floor(Math.random() * 120000 + 30000);
  db.prepare(`INSERT INTO context_budget_log (id, session_id, event_type, tokens_used, tokens_limit) VALUES (?, ?, 'checkpoint', ?, 200000)`)
    .run(crypto.randomUUID(), ag.id, used);
}

// Insert mailbox messages
db.prepare(`INSERT INTO agent_mailbox (id, sender_id, recipient_role, category, priority, subject, body) VALUES (?, ?, ?, ?, ?, ?, ?)`)
  .run(crypto.randomUUID(), "agent_design_02", "implementer", "blocker", "high",
    "TimelineStrip missing aria-pressed", "Phase filter buttons in TimelineStrip.tsx don't have aria-pressed attribute. The buttons toggle active state but screen readers can't detect this. Needs fixing before commit.");

db.prepare(`INSERT INTO agent_mailbox (id, sender_id, recipient_role, category, priority, subject, body) VALUES (?, ?, ?, ?, ?, ?, ?)`)
  .run(crypto.randomUUID(), "agent_design_03", "code_quality_critic", "status_report", "normal",
    "Calendar audit 60% complete", "Finished CalendarView.tsx and EventEditorPanel.tsx. Still need CalendarDatePopover.tsx and 3 smaller components.");

console.log("Seeded: 3 agents, 3 active tasks, 1 completed task, 40 tool calls, 3 budgets, 2 messages");

// ── Start dashboard ──────────────────────────────────────────────
const port = await startDashboardServer(db, 6274);
console.log(`\nDashboard live at http://127.0.0.1:${port}`);
console.log("Press Ctrl+C to stop.\n");

// Keep alive
await new Promise(() => {});
