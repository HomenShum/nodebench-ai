#!/usr/bin/env node
/**
 * extractDevTimeline.mjs — Extracts git history into a structured JSON
 * for the Dev Dashboard timeline view.
 *
 * Usage: node scripts/extractDevTimeline.mjs > src/features/devDashboard/data/timeline.json
 */

import { execSync } from "node:child_process";

// Parse conventional commit subject
function parseSubject(subject) {
  const match = subject.match(
    /^(feat|fix|chore|refactor|docs|test|perf|ci|build|style|revert)(?:\(([^)]+)\))?:\s*(.+)$/i
  );
  if (match) {
    return { type: match[1].toLowerCase(), scope: match[2] || null, message: match[3] };
  }
  return { type: "other", scope: null, message: subject };
}

// Classify commit into a domain
function classifyDomain(subject, filesChanged) {
  const s = subject.toLowerCase();
  const files = (filesChanged || []).join(" ").toLowerCase();

  if (s.includes("mcp") || files.includes("mcp-local") || files.includes("convex-mcp"))
    return "mcp";
  if (s.includes("ui") || s.includes("design") || s.includes("polish") || s.includes("dark mode"))
    return "ui";
  if (s.includes("eval") || s.includes("benchmark") || s.includes("qa"))
    return "eval";
  if (s.includes("agent") || s.includes("swarm") || files.includes("agents/"))
    return "agents";
  if (s.includes("oracle") || s.includes("temporal"))
    return "oracle";
  if (s.includes("narrative") || s.includes("linkedin") || s.includes("feed"))
    return "narrative";
  if (s.includes("financial") || s.includes("dcf") || s.includes("funding"))
    return "financial";
  if (s.includes("dogfood") || s.includes("screenshot"))
    return "dogfood";
  if (s.includes("calendar") || s.includes("document") || s.includes("spreadsheet"))
    return "workspace";
  if (s.includes("security") || s.includes("ssrf") || s.includes("sandbox"))
    return "security";
  if (s.includes("cron") || s.includes("observability") || s.includes("slo"))
    return "ops";
  if (s.includes("onboarding") || s.includes("landing"))
    return "onboarding";
  if (files.includes("convex/") && !files.includes("mcp"))
    return "backend";
  if (files.includes("src/"))
    return "frontend";
  return "other";
}

// Get tag info
function getTags() {
  try {
    // Get tag list first, then date for each
    const tagList = execSync("git tag -l", { encoding: "utf-8" }).trim().split("\n").filter(Boolean);
    return tagList.map((tag) => {
      try {
        const date = execSync(`git log -1 --format=%aI ${tag}`, { encoding: "utf-8" }).trim();
        return { tag, date };
      } catch {
        return { tag, date: new Date().toISOString() };
      }
    });
  } catch {
    return [];
  }
}

// Extract commit data
function extractCommits() {
  const raw = execSync(
    'git log --first-parent --format="COMMIT_START|%h|%aI|%s" --stat --no-merges',
    { encoding: "utf-8", maxBuffer: 50 * 1024 * 1024 }
  );

  const commits = [];
  let current = null;

  for (const line of raw.split("\n")) {
    if (line.startsWith("COMMIT_START|")) {
      if (current) commits.push(current);
      const parts = line.split("|");
      const hash = parts[1];
      const date = parts[2];
      const subject = parts.slice(3).join("|");
      const parsed = parseSubject(subject);
      current = {
        hash,
        date,
        subject,
        ...parsed,
        files: [],
        insertions: 0,
        deletions: 0,
      };
    } else if (current && line.match(/^\s*\d+ files? changed/)) {
      const ins = line.match(/(\d+) insertions?/);
      const del = line.match(/(\d+) deletions?/);
      current.insertions = ins ? parseInt(ins[1]) : 0;
      current.deletions = del ? parseInt(del[1]) : 0;
    } else if (current && line.match(/^\s+\S+/)) {
      const fileMatch = line.match(/^\s+([^\s|]+)/);
      if (fileMatch) current.files.push(fileMatch[1]);
    }
  }
  if (current) commits.push(current);

  // Add domain classification
  for (const c of commits) {
    c.domain = classifyDomain(c.subject, c.files);
    c.fileCount = c.files.length;
    // Don't include full file list in output (too large)
    delete c.files;
  }

  return commits;
}

// Build epochs (group by week)
function buildEpochs(commits) {
  const weeks = new Map();
  for (const c of commits) {
    const d = new Date(c.date);
    // Get Monday of the week
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    const weekKey = monday.toISOString().slice(0, 10);

    if (!weeks.has(weekKey)) {
      weeks.set(weekKey, {
        weekOf: weekKey,
        commits: [],
        stats: { total: 0, feats: 0, fixes: 0, refactors: 0, insertions: 0, deletions: 0 },
        domains: {},
      });
    }
    const week = weeks.get(weekKey);
    week.commits.push(c);
    week.stats.total++;
    if (c.type === "feat") week.stats.feats++;
    if (c.type === "fix") week.stats.fixes++;
    if (c.type === "refactor") week.stats.refactors++;
    week.stats.insertions += c.insertions;
    week.stats.deletions += c.deletions;
    week.domains[c.domain] = (week.domains[c.domain] || 0) + 1;
  }

  return Array.from(weeks.values()).sort((a, b) => a.weekOf.localeCompare(b.weekOf));
}

// Build milestones from tags and big feature commits
function buildMilestones(commits, tags) {
  const milestones = [];

  // Tags as milestones
  for (const t of tags) {
    milestones.push({
      type: "release",
      label: t.tag,
      date: t.date,
    });
  }

  // Big feature commits as milestones (>200 insertions)
  for (const c of commits) {
    if (c.type === "feat" && c.insertions > 200) {
      milestones.push({
        type: "feature",
        label: c.message,
        date: c.date,
        hash: c.hash,
        scope: c.scope,
        domain: c.domain,
        linesAdded: c.insertions,
      });
    }
  }

  return milestones.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

// Domain stats
function buildDomainStats(commits) {
  const domains = {};
  for (const c of commits) {
    if (!domains[c.domain]) {
      domains[c.domain] = { commits: 0, insertions: 0, deletions: 0, firstSeen: c.date, lastSeen: c.date };
    }
    const d = domains[c.domain];
    d.commits++;
    d.insertions += c.insertions;
    d.deletions += c.deletions;
    if (c.date < d.firstSeen) d.firstSeen = c.date;
    if (c.date > d.lastSeen) d.lastSeen = c.date;
  }
  return domains;
}

// Main
const commits = extractCommits();
const tags = getTags();
const epochs = buildEpochs(commits);
const milestones = buildMilestones(commits, tags);
const domainStats = buildDomainStats(commits);

const timeline = {
  generatedAt: new Date().toISOString(),
  totalCommits: commits.length,
  dateRange: {
    start: commits[commits.length - 1]?.date,
    end: commits[0]?.date,
  },
  epochs,
  milestones,
  domainStats,
  commits: commits.slice(0, 100), // Latest 100 for detail view
};

process.stdout.write(JSON.stringify(timeline, null, 2));
