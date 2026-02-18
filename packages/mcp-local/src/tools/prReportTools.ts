/**
 * PR Report tools — visual PR creation from UI Dive sessions.
 *
 * - generate_pr_report: Rich markdown PR body with screenshots, timeline, bug fixes, past sessions
 * - export_pr_screenshots: Export before/after screenshot pairs to a directory for git commit
 * - create_visual_pr: End-to-end PR creation via `gh pr create`
 *
 * Bridges the UI Dive visual QA system with GitHub PR workflows.
 */

import { mkdirSync, writeFileSync, existsSync, copyFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { getDb, genId } from "../db.js";
import { getDashboardUrl } from "../dashboard/server.js";
import type { McpTool } from "../types.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function gitExecOptions(repoPath?: string): {
  cwd: string;
  encoding: "utf8";
  timeout: number;
  stdio: ["pipe", "pipe", "pipe"];
} {
  return {
    cwd: repoPath || process.cwd(),
    encoding: "utf8" as const,
    timeout: 15000,
    stdio: ["pipe", "pipe", "pipe"] as ["pipe", "pipe", "pipe"],
  };
}

function runGit(command: string, repoPath?: string): string {
  return execSync(command, gitExecOptions(repoPath)).toString().trim();
}

function runGh(command: string, repoPath?: string): string {
  return execSync(command, { ...gitExecOptions(repoPath), timeout: 30000 })
    .toString()
    .trim();
}

function resolveSessionId(rawId?: string): string | null {
  const db = getDb();
  if (!rawId || rawId === "latest") {
    const latest = db
      .prepare(
        "SELECT id FROM ui_dive_sessions ORDER BY created_at DESC LIMIT 1"
      )
      .get() as { id: string } | undefined;
    return latest?.id ?? null;
  }
  return rawId;
}

/** Export a single screenshot to disk. Prefers file_path (full image), falls back to base64. */
function exportScreenshot(
  screenshotId: string | null,
  outputPath: string,
  db: ReturnType<typeof getDb>
): { success: boolean; path: string | null; warning?: string } {
  if (!screenshotId)
    return { success: false, path: null, warning: "No screenshot ID" };

  const row = db
    .prepare(
      "SELECT base64_thumbnail, file_path FROM ui_dive_screenshots WHERE id = ?"
    )
    .get(screenshotId) as
    | { base64_thumbnail?: string; file_path?: string }
    | undefined;

  if (!row)
    return {
      success: false,
      path: null,
      warning: `Screenshot ${screenshotId} not found in DB`,
    };

  // Prefer file_path (always full image)
  if (row.file_path && existsSync(row.file_path)) {
    copyFileSync(row.file_path, outputPath);
    return { success: true, path: outputPath };
  }

  // Fall back to base64_thumbnail — skip if truncated (<1KB likely means 500-char truncation)
  if (row.base64_thumbnail && row.base64_thumbnail.length > 1000) {
    const buf = Buffer.from(row.base64_thumbnail, "base64");
    writeFileSync(outputPath, buf);
    return { success: true, path: outputPath };
  }

  return {
    success: false,
    path: null,
    warning: `No usable image data for screenshot ${screenshotId}${row.base64_thumbnail ? " (base64 truncated)" : ""}`,
  };
}

function severityBadge(severity: string): string {
  const badges: Record<string, string> = {
    critical:
      "![critical](https://img.shields.io/badge/-CRITICAL-red?style=flat-square)",
    high: "![high](https://img.shields.io/badge/-HIGH-orange?style=flat-square)",
    medium:
      "![medium](https://img.shields.io/badge/-MEDIUM-yellow?style=flat-square)",
    low: "![low](https://img.shields.io/badge/-LOW-blue?style=flat-square)",
  };
  return badges[severity] ?? `\`${severity}\``;
}

function changeTypeBadge(changeType: string): string {
  const badges: Record<string, string> = {
    bugfix:
      "![bugfix](https://img.shields.io/badge/-BUGFIX-brightgreen?style=flat-square)",
    design_fix:
      "![design](https://img.shields.io/badge/-DESIGN-blueviolet?style=flat-square)",
    feature:
      "![feature](https://img.shields.io/badge/-FEATURE-blue?style=flat-square)",
    refactor:
      "![refactor](https://img.shields.io/badge/-REFACTOR-lightgrey?style=flat-square)",
    accessibility:
      "![a11y](https://img.shields.io/badge/-A11Y-purple?style=flat-square)",
    performance:
      "![perf](https://img.shields.io/badge/-PERF-ff69b4?style=flat-square)",
    content:
      "![content](https://img.shields.io/badge/-CONTENT-teal?style=flat-square)",
    responsive:
      "![responsive](https://img.shields.io/badge/-RESPONSIVE-cyan?style=flat-square)",
  };
  return badges[changeType] ?? `\`${changeType}\``;
}

function timeEmoji(eventType: string): string {
  const emojis: Record<string, string> = {
    bug: "Bug",
    fix: "Fix Verified",
    changelog: "Change",
    design_issue: "Design Issue",
    interaction_error: "Error",
    test: "Test",
  };
  return emojis[eventType] ?? eventType;
}

function fmtTime(isoDate: string): string {
  try {
    return new Date(isoDate).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoDate;
  }
}

function fmtDate(isoDate: string): string {
  try {
    return new Date(isoDate).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return isoDate;
  }
}

/** Normalize Windows backslashes to forward slashes for markdown image paths */
function mdPath(p: string): string {
  return p.replace(/\\/g, "/");
}

interface TimelineEvent {
  time: string;
  type: string;
  summary: string;
  severity?: string;
}

function buildTimeline(
  sessionId: string,
  db: ReturnType<typeof getDb>
): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  // Bugs
  const bugs = db
    .prepare(
      "SELECT severity, title, created_at FROM ui_dive_bugs WHERE session_id = ? ORDER BY created_at"
    )
    .all(sessionId) as any[];
  for (const b of bugs) {
    events.push({
      time: b.created_at,
      type: "bug",
      summary: b.title,
      severity: b.severity,
    });
  }

  // Fix verifications
  const fixes = db
    .prepare(
      `SELECT f.fix_description, f.verified, f.created_at, b.title as bug_title
       FROM ui_dive_fix_verifications f
       LEFT JOIN ui_dive_bugs b ON f.bug_id = b.id
       WHERE f.session_id = ? ORDER BY f.created_at`
    )
    .all(sessionId) as any[];
  for (const f of fixes) {
    events.push({
      time: f.created_at,
      type: "fix",
      summary: `${f.bug_title ?? "Bug"}: ${f.fix_description}${f.verified ? " (verified)" : ""}`,
    });
  }

  // Changelogs
  const changelogs = db
    .prepare(
      "SELECT change_type, description, created_at FROM ui_dive_changelogs WHERE session_id = ? ORDER BY created_at"
    )
    .all(sessionId) as any[];
  for (const c of changelogs) {
    events.push({
      time: c.created_at,
      type: "changelog",
      summary: `[${c.change_type}] ${c.description}`,
    });
  }

  // Design issues
  const designIssues = db
    .prepare(
      "SELECT severity, title, created_at FROM ui_dive_design_issues WHERE session_id = ? ORDER BY created_at"
    )
    .all(sessionId) as any[];
  for (const d of designIssues) {
    events.push({
      time: d.created_at,
      type: "design_issue",
      summary: d.title,
      severity: d.severity,
    });
  }

  // Interaction errors only (to keep timeline focused)
  const errors = db
    .prepare(
      `SELECT i.action, i.target, i.observation, i.created_at
       FROM ui_dive_interactions i
       WHERE i.session_id = ? AND i.result != 'success'
       ORDER BY i.created_at`
    )
    .all(sessionId) as any[];
  for (const e of errors) {
    events.push({
      time: e.created_at,
      type: "interaction_error",
      summary: `${e.action} on ${e.target ?? "unknown"}: ${e.observation ?? "error"}`,
    });
  }

  // Tests
  const tests = db
    .prepare(
      "SELECT test_name, status, created_at FROM ui_dive_interaction_tests WHERE session_id = ? ORDER BY created_at"
    )
    .all(sessionId) as any[];
  for (const t of tests) {
    events.push({
      time: t.created_at,
      type: "test",
      summary: `${t.test_name}: ${t.status}`,
    });
  }

  // Sort by time
  events.sort(
    (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
  );
  return events;
}

// ─── Core markdown generation ─────────────────────────────────────────────────

function generateMarkdown(
  sessionId: string,
  includeScreenshots: boolean,
  assetDir: string | null,
  exportedPairs: Array<{
    beforePath: string | null;
    afterPath: string | null;
    description: string;
    changeType: string;
  }>
): {
  markdown: string;
  title: string;
  filesChanged: string[];
} {
  const db = getDb();
  const dashUrl = getDashboardUrl();

  // Session info
  const session = db
    .prepare("SELECT * FROM ui_dive_sessions WHERE id = ?")
    .get(sessionId) as any;

  // Stats
  const count = (table: string, where = "session_id = ?") =>
    (
      db
        .prepare(`SELECT COUNT(*) as c FROM ${table} WHERE ${where}`)
        .get(sessionId) as any
    )?.c ?? 0;

  const componentCount = count("ui_dive_components");
  const bugCount = count("ui_dive_bugs");
  const bugsResolved = count(
    "ui_dive_bugs",
    "session_id = ? AND status = 'resolved'"
  );
  const screenshotCount = count("ui_dive_screenshots");
  const testCount = count("ui_dive_interaction_tests");
  const testsPassed = count(
    "ui_dive_interaction_tests",
    "session_id = ? AND status = 'passed'"
  );
  const testsFailed = count(
    "ui_dive_interaction_tests",
    "session_id = ? AND status = 'failed'"
  );
  const designIssueCount = count("ui_dive_design_issues");
  const fixCount = count("ui_dive_fix_verifications");
  const fixesVerified = count(
    "ui_dive_fix_verifications",
    "session_id = ? AND verified = 1"
  );
  const changelogCount = count("ui_dive_changelogs");

  // Latest code review
  const review = db
    .prepare(
      "SELECT score, summary, severity_counts FROM ui_dive_code_reviews WHERE session_id = ? ORDER BY created_at DESC LIMIT 1"
    )
    .get(sessionId) as any;

  // Aggregate files changed from changelogs
  const allFilesChanged = new Set<string>();
  const changelogs = db
    .prepare(
      "SELECT files_changed FROM ui_dive_changelogs WHERE session_id = ?"
    )
    .all(sessionId) as any[];
  for (const cl of changelogs) {
    if (cl.files_changed) {
      try {
        const files = JSON.parse(cl.files_changed);
        if (Array.isArray(files)) files.forEach((f: string) => allFilesChanged.add(f));
      } catch { /* ignore parse errors */ }
    }
  }
  const fixFiles = db
    .prepare(
      "SELECT files_changed FROM ui_dive_fix_verifications WHERE session_id = ?"
    )
    .all(sessionId) as any[];
  for (const fv of fixFiles) {
    if (fv.files_changed) {
      try {
        const files = JSON.parse(fv.files_changed);
        if (Array.isArray(files)) files.forEach((f: string) => allFilesChanged.add(f));
      } catch { /* ignore */ }
    }
  }

  // Bug details
  const bugs = db
    .prepare(
      `SELECT b.severity, b.title, b.status, b.category, c.name as component_name
       FROM ui_dive_bugs b
       LEFT JOIN ui_dive_components c ON b.component_id = c.id
       WHERE b.session_id = ?
       ORDER BY CASE b.severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END`
    )
    .all(sessionId) as any[];

  // Fix verifications with bug context
  const fixDetails = db
    .prepare(
      `SELECT f.fix_description, f.verified, f.git_commit, b.title as bug_title, b.severity as bug_severity
       FROM ui_dive_fix_verifications f
       LEFT JOIN ui_dive_bugs b ON f.bug_id = b.id
       WHERE f.session_id = ?
       ORDER BY f.created_at`
    )
    .all(sessionId) as any[];

  // Design issues
  const designIssues = db
    .prepare(
      `SELECT d.issue_type, d.severity, d.title, d.expected_value, d.actual_value, c.name as component_name
       FROM ui_dive_design_issues d
       LEFT JOIN ui_dive_components c ON d.component_id = c.id
       WHERE d.session_id = ?
       ORDER BY CASE d.severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END`
    )
    .all(sessionId) as any[];

  // Test results
  const testResults = db
    .prepare(
      `SELECT t.test_name, t.status, t.steps_total, t.steps_passed, t.steps_failed, c.name as component_name
       FROM ui_dive_interaction_tests t
       LEFT JOIN ui_dive_components c ON t.component_id = c.id
       WHERE t.session_id = ?
       ORDER BY t.created_at`
    )
    .all(sessionId) as any[];

  // Past sessions (same app_url)
  const pastSessions = session?.app_url
    ? (db
        .prepare(
          `SELECT id, app_name, status, created_at,
             (SELECT COUNT(*) FROM ui_dive_bugs WHERE session_id = s.id) as bug_count,
             (SELECT COUNT(*) FROM ui_dive_bugs WHERE session_id = s.id AND status = 'resolved') as bugs_resolved
           FROM ui_dive_sessions s
           WHERE app_url = ? AND id != ?
           ORDER BY created_at DESC LIMIT 5`
        )
        .all(session.app_url, sessionId) as any[])
    : [];

  // Timeline
  const timeline = buildTimeline(sessionId, db);

  // Auto-generate title
  const changeTypes = [
    ...new Set(
      changelogs.map((cl: any) => {
        try {
          return JSON.parse(JSON.stringify(cl)).change_type;
        } catch {
          return null;
        }
      })
    ),
  ].filter(Boolean);

  // Re-query changelogs for change_type
  const clTypes = db
    .prepare(
      "SELECT DISTINCT change_type FROM ui_dive_changelogs WHERE session_id = ?"
    )
    .all(sessionId) as any[];
  const types = clTypes.map((c: any) => c.change_type);
  const primaryType =
    types.includes("bugfix") || types.includes("design_fix")
      ? "fix"
      : types.includes("feature")
        ? "feat"
        : types.includes("refactor")
          ? "refactor"
          : "fix";
  const scope = session?.app_name ?? "ui";
  const titleSummary =
    bugCount > 0
      ? `visual QA: ${bugsResolved}/${bugCount} bugs fixed`
      : `visual QA session for ${session?.app_name ?? "app"}`;
  const suggestedTitle = `${primaryType}(${scope}): ${titleSummary}`;

  // Health score (from code review or calculated)
  let healthScore = review?.score ?? null;
  let healthGrade = "";
  if (healthScore !== null) {
    healthGrade =
      healthScore >= 90
        ? "A"
        : healthScore >= 80
          ? "B"
          : healthScore >= 70
            ? "C"
            : healthScore >= 60
              ? "D"
              : "F";
  }

  // ── Build markdown ────────────────────────────────────────────────
  const md: string[] = [];

  md.push("## UI Dive QA Report\n");
  md.push(
    `**App:** ${session?.app_name ?? "Unknown"} (${session?.app_url ?? "N/A"})`
  );
  if (dashUrl) {
    md.push(`**Dashboard:** [${dashUrl}](${dashUrl})`);
  }
  if (healthScore !== null) {
    md.push(`**Health Score:** ${healthScore}/100 (${healthGrade})`);
  }
  md.push("");

  // Summary table
  md.push("### Summary\n");
  md.push("| Metric | Count |");
  md.push("|--------|-------|");
  md.push(`| Components Tested | ${componentCount} |`);
  md.push(
    `| Bugs Found | ${bugCount}${bugs.length > 0 ? ` (${bugs.filter((b: any) => b.severity === "critical").length} critical, ${bugs.filter((b: any) => b.severity === "high").length} high)` : ""} |`
  );
  md.push(`| Bugs Fixed | ${bugsResolved} |`);
  md.push(
    `| Fixes Verified | ${fixesVerified}/${fixCount} |`
  );
  md.push(`| Design Issues | ${designIssueCount} |`);
  md.push(
    `| Tests | ${testCount} (${testsPassed} passed, ${testsFailed} failed) |`
  );
  md.push(`| Screenshots | ${screenshotCount} |`);
  md.push(`| Changelogs | ${changelogCount} |`);
  md.push("");

  // Visual Changes
  if (includeScreenshots && exportedPairs.length > 0) {
    md.push("### Visual Changes\n");
    for (let i = 0; i < exportedPairs.length; i++) {
      const pair = exportedPairs[i];
      md.push(
        `#### ${i + 1}. ${changeTypeBadge(pair.changeType)} ${pair.description}\n`
      );
      if (pair.beforePath || pair.afterPath) {
        md.push("| Before | After |");
        md.push("|--------|-------|");
        const beforeImg = pair.beforePath
          ? `![Before](${mdPath(pair.beforePath)})`
          : "_No before screenshot_";
        const afterImg = pair.afterPath
          ? `![After](${mdPath(pair.afterPath)})`
          : "_No after screenshot_";
        md.push(`| ${beforeImg} | ${afterImg} |`);
        md.push("");
      }
    }
  } else if (includeScreenshots && changelogCount > 0) {
    // No exported pairs, but changelogs exist — show text-only
    md.push("### Changes\n");
    const cls = db
      .prepare(
        "SELECT change_type, description, files_changed, git_commit, created_at FROM ui_dive_changelogs WHERE session_id = ? ORDER BY created_at"
      )
      .all(sessionId) as any[];
    for (const cl of cls) {
      md.push(
        `- ${changeTypeBadge(cl.change_type)} ${cl.description}`
      );
      if (cl.git_commit) md.push(`  Commit: \`${cl.git_commit}\``);
      if (cl.files_changed) {
        try {
          const files = JSON.parse(cl.files_changed);
          if (Array.isArray(files) && files.length > 0) {
            md.push(`  Files: ${files.map((f: string) => `\`${f}\``).join(", ")}`);
          }
        } catch { /* skip */ }
      }
    }
    md.push("");
  }

  // Bug Fixes
  if (fixDetails.length > 0) {
    md.push("### Bug Fixes\n");
    for (const f of fixDetails) {
      const verified = f.verified ? " **Verified**" : " _Pending_";
      md.push(
        `- ${severityBadge(f.bug_severity ?? "medium")} **${f.bug_title ?? "Bug"}** — ${f.fix_description}${verified}`
      );
    }
    md.push("");
  }

  // Timeline (collapsible)
  if (timeline.length > 0) {
    md.push(
      `<details>\n<summary>Timeline (${timeline.length} events)</summary>\n`
    );
    md.push("| Time | Type | Details |");
    md.push("|------|------|---------|");
    for (const ev of timeline) {
      const sev = ev.severity ? ` ${severityBadge(ev.severity)}` : "";
      md.push(
        `| ${fmtTime(ev.time)} | ${timeEmoji(ev.type)} | ${ev.summary}${sev} |`
      );
    }
    md.push("\n</details>\n");
  }

  // Design Improvements (collapsible)
  if (designIssues.length > 0) {
    md.push(
      `<details>\n<summary>Design Improvements (${designIssues.length})</summary>\n`
    );
    for (const d of designIssues) {
      const vals =
        d.expected_value || d.actual_value
          ? `: expected \`${d.expected_value ?? "?"}\`, got \`${d.actual_value ?? "?"}\``
          : "";
      md.push(
        `- ${severityBadge(d.severity)} **${d.title}** (${d.issue_type}${d.component_name ? `, ${d.component_name}` : ""})${vals}`
      );
    }
    md.push("\n</details>\n");
  }

  // Test Results (collapsible)
  if (testResults.length > 0) {
    md.push(
      `<details>\n<summary>Test Results (${testsPassed}/${testCount} passed)</summary>\n`
    );
    md.push(
      "| Test | Component | Status | Steps Passed | Steps Failed |"
    );
    md.push("|------|-----------|--------|--------------|--------------|");
    for (const t of testResults) {
      const statusIcon =
        t.status === "passed" ? "Pass" : t.status === "failed" ? "Fail" : t.status;
      md.push(
        `| ${t.test_name} | ${t.component_name ?? "—"} | ${statusIcon} | ${t.steps_passed ?? 0} | ${t.steps_failed ?? 0} |`
      );
    }
    md.push("\n</details>\n");
  }

  // Code Review Score
  if (review) {
    md.push("### Code Review Score\n");
    md.push(`**Score:** ${review.score}/100 (${healthGrade})`);
    if (review.summary) md.push(`\n${review.summary}`);
    md.push("");
  }

  // Past Sessions
  if (pastSessions.length > 0) {
    md.push("### Past Sessions\n");
    md.push("| Session | Date | Status | Bugs Found/Fixed |");
    md.push("|---------|------|--------|-------------------|");
    for (const ps of pastSessions) {
      const sessionLink = dashUrl
        ? `[${ps.id.slice(0, 8)}](${dashUrl}?session=${ps.id})`
        : `\`${ps.id.slice(0, 8)}\``;
      md.push(
        `| ${sessionLink} | ${fmtDate(ps.created_at)} | ${ps.status} | ${ps.bugs_resolved}/${ps.bug_count} |`
      );
    }
    md.push("");
  }

  // Files changed
  if (allFilesChanged.size > 0) {
    md.push("### Files Changed\n");
    for (const f of allFilesChanged) {
      md.push(`- \`${f}\``);
    }
    md.push("");
  }

  // Footer
  md.push("---");
  if (dashUrl) {
    md.push(
      `> Interactive dashboard: [${dashUrl}](${dashUrl})`
    );
  }
  md.push("> Generated by NodeBench MCP `generate_pr_report`");

  let markdown = md.join("\n");

  // Safety: GitHub PR body limit ~65,535 chars
  if (markdown.length > 60000) {
    markdown =
      markdown.slice(0, 59900) +
      "\n\n---\n_Report truncated (exceeded 60,000 character limit). View full report on the dashboard._\n";
  }

  return {
    markdown,
    title: suggestedTitle,
    filesChanged: [...allFilesChanged],
  };
}

// ─── Tools ────────────────────────────────────────────────────────────────────

export const prReportTools: McpTool[] = [
  // ─── Tool 1: generate_pr_report ──────────────────────────────────────────
  {
    name: "generate_pr_report",
    description:
      "Generate a rich markdown PR body from a UI Dive session. Compiles visual changes (before/after screenshot comparisons), a unified timeline of all change events, bug fixes with severity badges, design improvements, interaction test results, code review score, links to past sessions, and a dashboard URL. Does NOT create the PR — returns the markdown and metadata for use with `gh pr create` or create_visual_pr. If asset_dir is provided, also exports screenshot PNGs for committing.",
    inputSchema: {
      type: "object",
      properties: {
        session_id: {
          type: "string",
          description:
            "UI Dive session ID. Omit or pass 'latest' to use the most recent session.",
        },
        include_screenshots: {
          type: "boolean",
          description:
            "Include before/after screenshot image references in the markdown (default: true). Set false for text-only.",
        },
        asset_dir: {
          type: "string",
          description:
            "Directory to export screenshot PNGs for git commit (e.g. '.nodebench/pr-assets/'). Paths in the markdown will be relative to this. If omitted, no files are exported.",
        },
      },
    },
    handler: async (args: {
      session_id?: string;
      include_screenshots?: boolean;
      asset_dir?: string;
    }) => {
      const sessionId = resolveSessionId(args.session_id);
      if (!sessionId) {
        return {
          error: true,
          message:
            "No UI Dive sessions found. Start a dive first with start_ui_dive.",
        };
      }

      const db = getDb();
      const session = db
        .prepare("SELECT * FROM ui_dive_sessions WHERE id = ?")
        .get(sessionId);
      if (!session) {
        return { error: true, message: `Session not found: ${sessionId}` };
      }

      const includeScreenshots = args.include_screenshots !== false;
      const assetDir = args.asset_dir ?? null;
      let exportedPairs: Array<{
        beforePath: string | null;
        afterPath: string | null;
        description: string;
        changeType: string;
      }> = [];

      // Export screenshots if asset_dir provided
      if (assetDir && includeScreenshots) {
        mkdirSync(assetDir, { recursive: true });

        const changelogsWithSS = db
          .prepare(
            `SELECT id, change_type, description, before_screenshot_id, after_screenshot_id
             FROM ui_dive_changelogs WHERE session_id = ? ORDER BY created_at`
          )
          .all(sessionId) as any[];

        const fixesWithSS = db
          .prepare(
            `SELECT f.id, f.before_screenshot_id, f.after_screenshot_id, f.fix_description, b.title as bug_title
             FROM ui_dive_fix_verifications f
             LEFT JOIN ui_dive_bugs b ON f.bug_id = b.id
             WHERE f.session_id = ? ORDER BY f.created_at`
          )
          .all(sessionId) as any[];

        let idx = 1;
        for (const cl of changelogsWithSS) {
          if (!cl.before_screenshot_id && !cl.after_screenshot_id) continue;
          const beforeResult = exportScreenshot(
            cl.before_screenshot_id,
            join(assetDir, `${idx}-${cl.change_type}-before.png`),
            db
          );
          const afterResult = exportScreenshot(
            cl.after_screenshot_id,
            join(assetDir, `${idx}-${cl.change_type}-after.png`),
            db
          );
          if (beforeResult.success || afterResult.success) {
            exportedPairs.push({
              beforePath: beforeResult.path,
              afterPath: afterResult.path,
              description: cl.description,
              changeType: cl.change_type,
            });
            idx++;
          }
        }

        for (const fx of fixesWithSS) {
          if (!fx.before_screenshot_id && !fx.after_screenshot_id) continue;
          const beforeResult = exportScreenshot(
            fx.before_screenshot_id,
            join(assetDir, `${idx}-fix-before.png`),
            db
          );
          const afterResult = exportScreenshot(
            fx.after_screenshot_id,
            join(assetDir, `${idx}-fix-after.png`),
            db
          );
          if (beforeResult.success || afterResult.success) {
            exportedPairs.push({
              beforePath: beforeResult.path,
              afterPath: afterResult.path,
              description: fx.fix_description ?? fx.bug_title ?? "Fix",
              changeType: "fix",
            });
            idx++;
          }
        }
      }

      const { markdown, title, filesChanged } = generateMarkdown(
        sessionId,
        includeScreenshots,
        assetDir,
        exportedPairs
      );

      return {
        markdown,
        title,
        filesChanged,
        screenshotPaths: exportedPairs.flatMap((p) =>
          [p.beforePath, p.afterPath].filter(Boolean)
        ),
        sessionId,
        dashboardUrl: getDashboardUrl(),
      };
    },
  },

  // ─── Tool 2: export_pr_screenshots ───────────────────────────────────────
  {
    name: "export_pr_screenshots",
    description:
      "Export before/after screenshot pairs from changelogs and fix verifications to a local directory. Screenshots are written as PNG files with naming convention `{index}-{type}-before.png` / `{index}-{type}-after.png` so they can be committed to the repo and referenced in PR markdown. Prefers file_path (full image) over base64_thumbnail (may be truncated).",
    inputSchema: {
      type: "object",
      properties: {
        session_id: {
          type: "string",
          description:
            "UI Dive session ID. Use 'latest' for the most recent session.",
        },
        output_dir: {
          type: "string",
          description:
            "Output directory for PNG files (default: '.nodebench/pr-assets/'). Created if it does not exist.",
        },
      },
      required: ["session_id"],
    },
    handler: async (args: { session_id: string; output_dir?: string }) => {
      const sessionId = resolveSessionId(args.session_id);
      if (!sessionId) {
        return {
          error: true,
          message:
            "No UI Dive sessions found. Start a dive first with start_ui_dive.",
        };
      }

      const db = getDb();
      const session = db
        .prepare("SELECT * FROM ui_dive_sessions WHERE id = ?")
        .get(sessionId);
      if (!session) {
        return { error: true, message: `Session not found: ${sessionId}` };
      }

      const outDir = args.output_dir || ".nodebench/pr-assets";
      mkdirSync(outDir, { recursive: true });

      const warnings: string[] = [];
      const exported: Array<{
        beforePath: string | null;
        afterPath: string | null;
        description: string;
        changeType: string;
        sourceTable: "changelog" | "fix_verification";
      }> = [];

      // Changelogs with screenshots
      const changelogs = db
        .prepare(
          `SELECT id, change_type, description, before_screenshot_id, after_screenshot_id
           FROM ui_dive_changelogs WHERE session_id = ? ORDER BY created_at`
        )
        .all(sessionId) as any[];

      let idx = 1;
      for (const cl of changelogs) {
        if (!cl.before_screenshot_id && !cl.after_screenshot_id) continue;

        const beforeResult = exportScreenshot(
          cl.before_screenshot_id,
          join(outDir, `${idx}-${cl.change_type}-before.png`),
          db
        );
        const afterResult = exportScreenshot(
          cl.after_screenshot_id,
          join(outDir, `${idx}-${cl.change_type}-after.png`),
          db
        );

        if (beforeResult.warning) warnings.push(beforeResult.warning);
        if (afterResult.warning) warnings.push(afterResult.warning);

        if (beforeResult.success || afterResult.success) {
          exported.push({
            beforePath: beforeResult.path,
            afterPath: afterResult.path,
            description: cl.description,
            changeType: cl.change_type,
            sourceTable: "changelog",
          });
          idx++;
        }
      }

      // Fix verifications with screenshots
      const fixes = db
        .prepare(
          `SELECT f.id, f.before_screenshot_id, f.after_screenshot_id, f.fix_description, b.title as bug_title
           FROM ui_dive_fix_verifications f
           LEFT JOIN ui_dive_bugs b ON f.bug_id = b.id
           WHERE f.session_id = ? ORDER BY f.created_at`
        )
        .all(sessionId) as any[];

      for (const fx of fixes) {
        if (!fx.before_screenshot_id && !fx.after_screenshot_id) continue;

        const beforeResult = exportScreenshot(
          fx.before_screenshot_id,
          join(outDir, `${idx}-fix-before.png`),
          db
        );
        const afterResult = exportScreenshot(
          fx.after_screenshot_id,
          join(outDir, `${idx}-fix-after.png`),
          db
        );

        if (beforeResult.warning) warnings.push(beforeResult.warning);
        if (afterResult.warning) warnings.push(afterResult.warning);

        if (beforeResult.success || afterResult.success) {
          exported.push({
            beforePath: beforeResult.path,
            afterPath: afterResult.path,
            description: fx.fix_description ?? fx.bug_title ?? "Fix",
            changeType: "fix",
            sourceTable: "fix_verification",
          });
          idx++;
        }
      }

      const totalFiles = exported.reduce(
        (sum, e) => sum + (e.beforePath ? 1 : 0) + (e.afterPath ? 1 : 0),
        0
      );

      return {
        sessionId,
        outputDir: outDir,
        exported,
        totalFiles,
        warnings: warnings.length > 0 ? warnings : undefined,
        _hint:
          "Screenshots exported. Stage and commit them with your branch, then use generate_pr_report to reference them in the PR body.",
      };
    },
  },

  // ─── Tool 3: create_visual_pr ────────────────────────────────────────────
  {
    name: "create_visual_pr",
    description:
      "End-to-end PR creation: exports screenshots, generates a rich markdown PR body with visual evidence (before/after comparisons, timeline, bug fixes, past sessions), checks git state, pushes, and creates a GitHub PR via `gh pr create`. Requires the GitHub CLI (gh) installed and authenticated. Returns the PR URL.",
    inputSchema: {
      type: "object",
      properties: {
        session_id: {
          type: "string",
          description:
            "UI Dive session ID. Omit or pass 'latest' for the most recent session.",
        },
        pr_title: {
          type: "string",
          description:
            "PR title. If omitted, auto-generates from session data in conventional commit format.",
        },
        base_branch: {
          type: "string",
          description: "Base branch to merge into (default: 'main').",
        },
        asset_dir: {
          type: "string",
          description:
            "Directory for exported screenshot PNGs (default: '.nodebench/pr-assets/').",
        },
        repo_path: {
          type: "string",
          description:
            "Repository root path (default: current working directory).",
        },
        push: {
          type: "boolean",
          description:
            "Push the current branch to remote before creating PR (default: true).",
        },
        draft: {
          type: "boolean",
          description: "Create as a draft PR (default: false).",
        },
      },
    },
    handler: async (args: {
      session_id?: string;
      pr_title?: string;
      base_branch?: string;
      asset_dir?: string;
      repo_path?: string;
      push?: boolean;
      draft?: boolean;
    }) => {
      const cwd = args.repo_path || process.cwd();
      const baseBranch = args.base_branch || "main";
      const assetDir = args.asset_dir || ".nodebench/pr-assets";
      const shouldPush = args.push !== false;
      const isDraft = args.draft === true;

      // Check gh availability
      try {
        runGh("gh --version", cwd);
      } catch {
        return {
          error: true,
          message:
            "GitHub CLI (gh) not found. Install from https://cli.github.com/ and authenticate with `gh auth login`.",
        };
      }

      // Check gh auth
      try {
        runGh("gh auth status", cwd);
      } catch (err: any) {
        return {
          error: true,
          message: `GitHub CLI not authenticated: ${err.message ?? "Run `gh auth login` first."}`,
        };
      }

      // Resolve session
      const sessionId = resolveSessionId(args.session_id);
      if (!sessionId) {
        return {
          error: true,
          message:
            "No UI Dive sessions found. Start a dive first with start_ui_dive.",
        };
      }

      const db = getDb();
      const session = db
        .prepare("SELECT * FROM ui_dive_sessions WHERE id = ?")
        .get(sessionId);
      if (!session) {
        return { error: true, message: `Session not found: ${sessionId}` };
      }

      // Get current branch
      let currentBranch: string;
      try {
        currentBranch = runGit("git branch --show-current", cwd);
      } catch (err: any) {
        return {
          error: true,
          message: `Git error: ${err.message ?? "not a git repository"}`,
        };
      }

      if (currentBranch === baseBranch) {
        return {
          error: true,
          message: `Cannot create PR from '${baseBranch}' to '${baseBranch}'. Switch to a feature branch first.`,
        };
      }

      // Export screenshots
      mkdirSync(assetDir, { recursive: true });
      const exportedPairs: Array<{
        beforePath: string | null;
        afterPath: string | null;
        description: string;
        changeType: string;
      }> = [];

      const changelogsWithSS = db
        .prepare(
          `SELECT id, change_type, description, before_screenshot_id, after_screenshot_id
           FROM ui_dive_changelogs WHERE session_id = ? ORDER BY created_at`
        )
        .all(sessionId) as any[];

      const fixesWithSS = db
        .prepare(
          `SELECT f.id, f.before_screenshot_id, f.after_screenshot_id, f.fix_description, b.title as bug_title
           FROM ui_dive_fix_verifications f
           LEFT JOIN ui_dive_bugs b ON f.bug_id = b.id
           WHERE f.session_id = ? ORDER BY f.created_at`
        )
        .all(sessionId) as any[];

      let idx = 1;
      for (const cl of changelogsWithSS) {
        if (!cl.before_screenshot_id && !cl.after_screenshot_id) continue;
        const beforeResult = exportScreenshot(
          cl.before_screenshot_id,
          join(assetDir, `${idx}-${cl.change_type}-before.png`),
          db
        );
        const afterResult = exportScreenshot(
          cl.after_screenshot_id,
          join(assetDir, `${idx}-${cl.change_type}-after.png`),
          db
        );
        if (beforeResult.success || afterResult.success) {
          exportedPairs.push({
            beforePath: beforeResult.path,
            afterPath: afterResult.path,
            description: cl.description,
            changeType: cl.change_type,
          });
          idx++;
        }
      }

      for (const fx of fixesWithSS) {
        if (!fx.before_screenshot_id && !fx.after_screenshot_id) continue;
        const beforeResult = exportScreenshot(
          fx.before_screenshot_id,
          join(assetDir, `${idx}-fix-before.png`),
          db
        );
        const afterResult = exportScreenshot(
          fx.after_screenshot_id,
          join(assetDir, `${idx}-fix-after.png`),
          db
        );
        if (beforeResult.success || afterResult.success) {
          exportedPairs.push({
            beforePath: beforeResult.path,
            afterPath: afterResult.path,
            description: fx.fix_description ?? fx.bug_title ?? "Fix",
            changeType: "fix",
          });
          idx++;
        }
      }

      // Generate markdown
      const { markdown, title, filesChanged } = generateMarkdown(
        sessionId,
        true,
        assetDir,
        exportedPairs
      );

      const prTitle = args.pr_title || title;

      // Stage screenshot assets if any were exported
      const screenshotCount = exportedPairs.reduce(
        (sum, e) => sum + (e.beforePath ? 1 : 0) + (e.afterPath ? 1 : 0),
        0
      );
      if (screenshotCount > 0) {
        try {
          runGit(`git add "${assetDir}"`, cwd);
          runGit(
            `git commit -m "chore: add PR screenshot assets from UI Dive"`,
            cwd
          );
        } catch {
          // Might already be committed or nothing to add — proceed anyway
        }
      }

      // Push if requested
      if (shouldPush) {
        try {
          runGit(`git push -u origin ${currentBranch}`, cwd);
        } catch (err: any) {
          return {
            error: true,
            message: `Push failed: ${err.message ?? "unknown error"}. Push manually and retry with push:false.`,
          };
        }
      }

      // Create PR
      try {
        const draftFlag = isDraft ? " --draft" : "";
        // Write body to a temp file to avoid shell escaping issues
        const tempBody = join(
          assetDir,
          `_pr_body_${Date.now()}.md`
        );
        writeFileSync(tempBody, markdown, "utf8");

        const result = runGh(
          `gh pr create --title "${prTitle.replace(/"/g, '\\"')}" --base "${baseBranch}" --body-file "${tempBody}"${draftFlag}`,
          cwd
        );

        // Clean up temp body file
        try {
          require("node:fs").unlinkSync(tempBody);
        } catch { /* best effort cleanup */ }

        // Parse PR URL from gh output
        const prUrl = result.trim();
        const prNumberMatch = prUrl.match(/\/pull\/(\d+)/);
        const prNumber = prNumberMatch ? parseInt(prNumberMatch[1], 10) : 0;

        return {
          prUrl,
          prNumber,
          title: prTitle,
          markdown,
          screenshotCount,
          branch: currentBranch,
          baseBranch,
        };
      } catch (err: any) {
        return {
          error: true,
          message: `Failed to create PR: ${err.message ?? "unknown error"}. You can use the markdown manually with \`gh pr create --body-file\`.`,
          markdown,
          title: prTitle,
        };
      }
    },
  },
];
