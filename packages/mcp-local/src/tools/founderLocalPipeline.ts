/**
 * founderLocalPipeline.ts — Local intelligence pipeline that executes the
 * founder_deep_context_gather protocol end-to-end WITHOUT Convex.
 *
 * This is the P0 bridge: takes protocol → produces finished packet using
 * only local sources (git log, filesystem, SQLite session memory).
 *
 * Three tools:
 *   1. founder_local_gather   — Reads all local sources, returns structured context
 *   2. founder_local_synthesize — Takes gathered context, produces a FounderPacket
 *   3. founder_local_weekly_reset — Convenience: gather + synthesize in one call
 */

import { execSync } from "child_process";
import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";
import type { McpTool } from "../types.js";
import { getDb, genId } from "../db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function safeRead(filePath: string): string | null {
  try {
    if (!existsSync(filePath)) return null;
    return readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }
}

function safeExec(cmd: string, cwd?: string): string {
  try {
    return execSync(cmd, { cwd, encoding: "utf-8", timeout: 10_000, stdio: ["pipe", "pipe", "pipe"] }).trim();
  } catch {
    return "";
  }
}

function findProjectRoot(): string {
  // Walk up from packages/mcp-local to find the monorepo root (has CLAUDE.md)
  let dir = resolve(__dirname, "..", "..");
  for (let i = 0; i < 5; i++) {
    if (existsSync(join(dir, "CLAUDE.md"))) return dir;
    dir = resolve(dir, "..");
  }
  return process.cwd();
}

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface GatheredContext {
  identity: {
    projectRoot: string;
    claudeMdSnippet: string | null;
    packageName: string | null;
    packageVersion: string | null;
  };
  recentChanges: {
    gitLogOneline: string[];
    gitDiffStat: string;
    modifiedFiles: string[];
    daysBack: number;
  };
  publicSurfaces: {
    indexHtmlTitle: string | null;
    indexHtmlOgDescription: string | null;
    serverJsonDescription: string | null;
    readmeTagline: string | null;
  };
  sessionMemory: {
    recentActions: Array<{ action: string; category: string; impact: string; timestamp: string }>;
    recentMilestones: Array<{ title: string; category: string; timestamp: string }>;
    totalActions7d: number;
    totalMilestones7d: number;
  };
  dogfoodFindings: {
    latestFile: string | null;
    verdict: string | null;
    p0Count: number;
    p1Count: number;
    findings: string[];
  };
  docs: {
    prdSnippet: string | null;
    dogfoodRunbookSnippet: string | null;
    architectureDocs: string[];
  };
}

interface FounderPacket {
  packetId: string;
  packetType: "weekly_reset" | "pre_delegation" | "important_change" | "competitor_brief" | "role_switch";
  generatedAt: string;
  generatedBy: "founder_local_pipeline";
  canonicalEntity: {
    name: string;
    canonicalMission: string;
    wedge: string;
    companyState: string;
    identityConfidence: number;
  };
  whatChanged: Array<{ description: string; date: string; source: string }>;
  contradictions: Array<{ claim: string; evidence: string; severity: "high" | "medium" | "low" }>;
  nextActions: Array<{ action: string; priority: number; reasoning: string }>;
  signals: Array<{ name: string; direction: "up" | "down" | "neutral"; impact: "high" | "medium" | "low" }>;
  publicNarrativeCheck: {
    aligned: boolean;
    mismatches: string[];
  };
  sessionStats: {
    actionsTracked7d: number;
    milestonesTracked7d: number;
    dogfoodVerdict: string | null;
  };
  memo: string;
}

/* ─── Tool 1: founder_local_gather ───────────────────────────────────────── */

function gatherLocalContext(daysBack: number = 7): GatheredContext {
  const root = findProjectRoot();

  // ── Identity ──────────────────────────────────────────────────
  const claudeMd = safeRead(join(root, "CLAUDE.md"));
  const claudeMdSnippet = claudeMd
    ? claudeMd.split("\n").slice(0, 8).join("\n")
    : null;

  const pkgJson = safeRead(join(root, "packages", "mcp-local", "package.json"));
  let packageName: string | null = null;
  let packageVersion: string | null = null;
  if (pkgJson) {
    try {
      const pkg = JSON.parse(pkgJson);
      packageName = pkg.name ?? null;
      packageVersion = pkg.version ?? null;
    } catch { /* ignore */ }
  }

  // ── Recent changes (git) ──────────────────────────────────────
  // Fix P0 #12: Sanitize daysBack to prevent command injection
  const safeDays = Math.max(1, Math.min(365, Math.floor(Number(daysBack) || 7)));
  const gitLog = safeExec(`git log --oneline --since="${safeDays} days ago" -30`, root);
  const gitDiffStat = safeExec(`git diff --stat HEAD~10 HEAD 2>/dev/null || echo "no diff"`, root);
  const modifiedFiles = safeExec(`git diff --name-only HEAD~10 HEAD 2>/dev/null || echo ""`, root)
    .split("\n")
    .filter(Boolean)
    .slice(0, 30);

  // ── Public surfaces ───────────────────────────────────────────
  const indexHtml = safeRead(join(root, "index.html"));
  let indexHtmlTitle: string | null = null;
  let indexHtmlOgDescription: string | null = null;
  if (indexHtml) {
    const titleMatch = indexHtml.match(/<title>([^<]+)<\/title>/);
    indexHtmlTitle = titleMatch?.[1] ?? null;
    const ogDescMatch = indexHtml.match(/og:description[^>]+content="([^"]+)"/);
    indexHtmlOgDescription = ogDescMatch?.[1] ?? null;
  }

  const serverJson = safeRead(join(root, "packages", "mcp-local", "server.json"));
  let serverJsonDescription: string | null = null;
  if (serverJson) {
    try {
      serverJsonDescription = JSON.parse(serverJson).description ?? null;
    } catch { /* ignore */ }
  }

  const readme = safeRead(join(root, "packages", "mcp-local", "README.md"));
  const readmeTagline = readme
    ? (readme.match(/\*\*([^*]+)\*\*/)?.[1] ?? null)
    : null;

  // ── Session memory (SQLite) ───────────────────────────────────
  let recentActions: GatheredContext["sessionMemory"]["recentActions"] = [];
  let recentMilestones: GatheredContext["sessionMemory"]["recentMilestones"] = [];
  let totalActions7d = 0;
  let totalMilestones7d = 0;

  try {
    const db = getDb();
    const sevenDaysAgo = new Date(Date.now() - daysBack * 86_400_000).toISOString().slice(0, 10);

    const actions = db.prepare(
      `SELECT action, category, impactLevel, timestamp FROM tracking_actions
       WHERE date(timestamp) >= ? ORDER BY timestamp DESC LIMIT 20`,
    ).all(sevenDaysAgo) as any[];
    recentActions = actions.map((a: any) => ({
      action: a.action, category: a.category, impact: a.impactLevel, timestamp: a.timestamp,
    }));

    const milestones = db.prepare(
      `SELECT title, category, timestamp FROM tracking_milestones
       WHERE date(timestamp) >= ? ORDER BY timestamp DESC LIMIT 10`,
    ).all(sevenDaysAgo) as any[];
    recentMilestones = milestones.map((m: any) => ({
      title: m.title, category: m.category, timestamp: m.timestamp,
    }));

    totalActions7d = (db.prepare(
      `SELECT COUNT(*) as c FROM tracking_actions WHERE date(timestamp) >= ?`,
    ).get(sevenDaysAgo) as any)?.c ?? 0;

    totalMilestones7d = (db.prepare(
      `SELECT COUNT(*) as c FROM tracking_milestones WHERE date(timestamp) >= ?`,
    ).get(sevenDaysAgo) as any)?.c ?? 0;
  } catch {
    // SQLite tables may not exist yet — that's fine
  }

  // ── Dogfood findings ──────────────────────────────────────────
  const docsDir = join(root, "docs");
  let latestDogfoodFile: string | null = null;
  let dogfoodVerdict: string | null = null;
  let p0Count = 0;
  let p1Count = 0;
  const dogfoodFindings: string[] = [];

  try {
    // Fix P2 #11: Windows-safe file listing (no Unix `ls`)
    const dogfoodFiles = existsSync(docsDir)
      ? readdirSync(docsDir)
          .filter((f: string) => f.startsWith("dogfood-findings-") && f.endsWith(".json"))
          .map((f: string) => join(docsDir, f))
          .sort((a: string, b: string) => (statSync(b).mtimeMs ?? 0) - (statSync(a).mtimeMs ?? 0))
      : [];
    if (dogfoodFiles.length > 0) {
      latestDogfoodFile = dogfoodFiles[0];
      const content = safeRead(dogfoodFiles[0]);
      if (content) {
        const parsed = JSON.parse(content);
        dogfoodVerdict = parsed.verdict ?? null;
        const allFindings = parsed.runs?.flatMap((r: any) => r.findings ?? []) ?? parsed.global_findings ?? [];
        for (const f of allFindings) {
          if (f.severity === "P0") p0Count++;
          if (f.severity === "P1") p1Count++;
          dogfoodFindings.push(`[${f.severity}] ${f.description?.slice(0, 120) ?? f.title?.slice(0, 120) ?? "unknown"}`);
        }
      }
    }
  } catch { /* ignore */ }

  // ── Architecture docs ─────────────────────────────────────────
  const archDir = join(root, "docs", "architecture");
  const architectureDocs: string[] = [];
  try {
    // Fix P2 #11: Windows-safe file listing (no Unix `ls`)
    const archFiles = existsSync(archDir)
      ? readdirSync(archDir)
          .filter((f: string) => f.endsWith(".md"))
          .map((f: string) => join(archDir, f))
          .sort((a: string, b: string) => (statSync(b).mtimeMs ?? 0) - (statSync(a).mtimeMs ?? 0))
          .slice(0, 10)
      : [];
    for (const f of archFiles) {
      const name = f.split(/[/\\]/).pop() ?? f;
      architectureDocs.push(name);
    }
  } catch { /* ignore */ }

  const prd = safeRead(join(archDir, "NODEBENCH_AI_APP_PRD_V1.md"));
  const prdSnippet = prd ? prd.split("\n").slice(0, 12).join("\n") : null;

  const runbook = safeRead(join(archDir, "DOGFOOD_RUNBOOK_V1.md"));
  const dogfoodRunbookSnippet = runbook ? runbook.split("\n").slice(0, 12).join("\n") : null;

  return {
    identity: { projectRoot: root, claudeMdSnippet, packageName, packageVersion },
    recentChanges: { gitLogOneline: gitLog.split("\n").filter(Boolean), gitDiffStat, modifiedFiles, daysBack },
    publicSurfaces: { indexHtmlTitle, indexHtmlOgDescription, serverJsonDescription, readmeTagline },
    sessionMemory: { recentActions, recentMilestones, totalActions7d, totalMilestones7d },
    dogfoodFindings: { latestFile: latestDogfoodFile, verdict: dogfoodVerdict, p0Count, p1Count, findings: dogfoodFindings },
    docs: { prdSnippet, dogfoodRunbookSnippet, architectureDocs },
  };
}

/* ─── Tool 2: founder_local_synthesize ───────────────────────────────────── */

function synthesizePacket(
  ctx: GatheredContext,
  packetType: "weekly_reset" | "pre_delegation" | "important_change" | "competitor_brief" | "role_switch",
  originalQuery?: string,
): FounderPacket {
  const packetId = genId("pkt");

  // ── Extract identity from CLAUDE.md ───────────────────────────
  const claudeMd = ctx.identity.claudeMdSnippet ?? "";
  let canonicalMission = "Unknown";
  let wedge = "Unknown";

  // Parse the overview line from CLAUDE.md
  const overviewMatch = claudeMd.match(/NodeBench\s*[—–-]\s*(.+?)(?:\.\s|$)/m);
  if (overviewMatch) {
    canonicalMission = overviewMatch[1].trim();
  }
  const toolCountMatch = claudeMd.match(/(\d+)-tool/);
  if (toolCountMatch) {
    wedge = `${toolCountMatch[1]}-tool MCP server with entity intelligence`;
  }

  // ── Detect what changed from git ──────────────────────────────
  const whatChanged = ctx.recentChanges.gitLogOneline.slice(0, 8).map((line) => {
    const hash = line.slice(0, 8);
    const msg = line.slice(9);
    return { description: msg, date: "this week", source: `git:${hash}` };
  });

  // ── Detect contradictions ─────────────────────────────────────
  const contradictions: FounderPacket["contradictions"] = [];

  // Check: CLAUDE.md mission vs index.html title
  if (ctx.publicSurfaces.indexHtmlTitle && canonicalMission) {
    const titleLower = ctx.publicSurfaces.indexHtmlTitle.toLowerCase();
    const missionLower = canonicalMission.toLowerCase();
    // Simple word overlap check
    const missionWords = new Set(missionLower.split(/\s+/).filter(w => w.length > 3));
    const titleWords = new Set(titleLower.split(/\s+/).filter(w => w.length > 3));
    const overlap = [...missionWords].filter(w => titleWords.has(w)).length;
    if (overlap < 2) {
      contradictions.push({
        claim: `CLAUDE.md says: "${canonicalMission}"`,
        evidence: `index.html title says: "${ctx.publicSurfaces.indexHtmlTitle}"`,
        severity: "medium",
      });
    }
  }

  // Check: server.json vs README tagline alignment
  if (ctx.publicSurfaces.serverJsonDescription && ctx.publicSurfaces.readmeTagline) {
    const sjLower = ctx.publicSurfaces.serverJsonDescription.toLowerCase();
    const rdLower = ctx.publicSurfaces.readmeTagline.toLowerCase();
    if (!sjLower.includes("entity") && rdLower.includes("entity")) {
      contradictions.push({
        claim: "README positions as entity intelligence",
        evidence: `server.json description doesn't mention 'entity': "${ctx.publicSurfaces.serverJsonDescription.slice(0, 80)}..."`,
        severity: "low",
      });
    }
  }

  // Check: dogfood findings indicate unresolved P0s
  if (ctx.dogfoodFindings.p0Count > 0) {
    contradictions.push({
      claim: `${ctx.dogfoodFindings.p0Count} P0 dogfood findings unresolved`,
      evidence: ctx.dogfoodFindings.findings.filter(f => f.startsWith("[P0]")).join("; "),
      severity: "high",
    });
  }

  // Check: many surfaces but few tracked actions (building without proving)
  if (ctx.recentChanges.modifiedFiles.length > 20 && ctx.sessionMemory.totalActions7d < 5) {
    contradictions.push({
      claim: `${ctx.recentChanges.modifiedFiles.length} files modified this week but only ${ctx.sessionMemory.totalActions7d} tracked actions`,
      evidence: "Building is outpacing tracking — habits may not be proven yet",
      severity: "medium",
    });
  }

  // ── Rank next actions from dogfood + changes ──────────────────
  const nextActions: FounderPacket["nextActions"] = [];
  let priority = 1;

  // P0 dogfood findings become top actions
  for (const finding of ctx.dogfoodFindings.findings.filter(f => f.startsWith("[P0]"))) {
    nextActions.push({
      action: `Fix: ${finding.replace("[P0] ", "").slice(0, 100)}`,
      priority: priority++,
      reasoning: "P0 dogfood finding — blocks core habit loop",
    });
  }

  // P1 dogfood findings next
  for (const finding of ctx.dogfoodFindings.findings.filter(f => f.startsWith("[P1]")).slice(0, 3)) {
    nextActions.push({
      action: `Fix: ${finding.replace("[P1] ", "").slice(0, 100)}`,
      priority: priority++,
      reasoning: "P1 dogfood finding — degrades tool reliability",
    });
  }

  // If few actions, add defaults
  if (nextActions.length < 3) {
    if (contradictions.length > 0) {
      nextActions.push({
        action: "Resolve top contradiction: " + contradictions[0].claim.slice(0, 80),
        priority: priority++,
        reasoning: "Unresolved contradiction weakens canonical truth",
      });
    }
    nextActions.push({
      action: "Run full dogfood cycle (13 scenarios) and log pass/fail",
      priority: priority++,
      reasoning: "Proves the three core habits work end-to-end",
    });
    nextActions.push({
      action: "Publish updated package with fixed tracking tools and local pipeline",
      priority: priority++,
      reasoning: "Public package should match internal capabilities",
    });
  }

  // ── Signals from git activity ─────────────────────────────────
  const signals: FounderPacket["signals"] = [];
  const commitCount = ctx.recentChanges.gitLogOneline.length;
  signals.push({
    name: `${commitCount} commits in last ${ctx.recentChanges.daysBack} days`,
    direction: commitCount > 5 ? "up" : commitCount > 0 ? "neutral" : "down",
    impact: "medium",
  });
  signals.push({
    name: `${ctx.recentChanges.modifiedFiles.length} files modified`,
    direction: ctx.recentChanges.modifiedFiles.length > 10 ? "up" : "neutral",
    impact: "medium",
  });
  signals.push({
    name: `${ctx.sessionMemory.totalActions7d} tracked actions / ${ctx.sessionMemory.totalMilestones7d} milestones`,
    direction: ctx.sessionMemory.totalActions7d > 5 ? "up" : "neutral",
    impact: "high",
  });
  if (ctx.dogfoodFindings.verdict) {
    signals.push({
      name: `Dogfood verdict: ${ctx.dogfoodFindings.verdict.slice(0, 60)}`,
      direction: ctx.dogfoodFindings.verdict.toLowerCase().includes("pass") ? "up" : "down",
      impact: "high",
    });
  }

  // ── Public narrative check ────────────────────────────────────
  const publicMismatches: string[] = [];
  if (ctx.publicSurfaces.indexHtmlTitle && !ctx.publicSurfaces.indexHtmlTitle.toLowerCase().includes("entity")) {
    publicMismatches.push(`index.html title doesn't mention 'entity intelligence': "${ctx.publicSurfaces.indexHtmlTitle}"`);
  }
  if (ctx.publicSurfaces.serverJsonDescription && ctx.publicSurfaces.serverJsonDescription.includes("304")) {
    publicMismatches.push("server.json still references '304' tools");
  }
  if (ctx.publicSurfaces.readmeTagline && ctx.publicSurfaces.readmeTagline.includes("Operating intelligence")) {
    publicMismatches.push("README still uses 'Operating intelligence' instead of 'Entity intelligence'");
  }

  // ── Generate memo (adapted to packetType) ────────────────────
  const memoTitle: Record<string, string> = {
    weekly_reset: "Founder Weekly Reset",
    pre_delegation: "Pre-Delegation Packet",
    important_change: "Important Change Review",
    competitor_brief: "Competitor Intelligence Brief",
    role_switch: "Role-Adapted Analysis",
  };

  const memoLines: string[] = [
    `# NodeBench ${memoTitle[packetType] ?? packetType}`,
    `**Generated:** ${new Date().toISOString().slice(0, 10)} by founder_local_pipeline`,
    `**Package:** ${ctx.identity.packageName}@${ctx.identity.packageVersion}`,
    `**Packet type:** ${packetType}`,
    ...(originalQuery ? [`**Query:** ${originalQuery}`] : []),
    ``,
  ];

  if (packetType === "competitor_brief") {
    memoLines.push(
      `## Query Context`,
      originalQuery ? `Analyzing: ${originalQuery}` : `General competitive analysis`,
      ``,
      `## Competitive Position`,
      `NodeBench is: ${canonicalMission}`,
      `Wedge: ${wedge}`,
      ``,
      `## What Changed Competitively`,
      ...whatChanged.slice(0, 5).map((c, i) => `${i + 1}. ${c.description}`),
      ``,
      `## Competitor Moats and Differentiators`,
      `When comparing competitors, key dimensions to evaluate:`,
      `- Distribution advantage (plugin ecosystem, MCP-native onboarding)`,
      `- Technical moat (proprietary data, infrastructure lock-in, network effects)`,
      `- Market positioning (category creation vs category capture)`,
      `- Benchmark rigor and provider abstraction depth`,
      ``,
      `## Strategic Contradictions (${contradictions.length})`,
      ...contradictions.map((c) => `- **[${c.severity}]** ${c.claim}\n  Evidence: ${c.evidence}`),
      ``,
      `## Recommended Competitive Moves`,
      ...nextActions.slice(0, 3).map((a) => `${a.priority}. **${a.action}**\n   ${a.reasoning}`),
      ``,
      `## Market Signals`,
      ...signals.map((s) => `- ${s.direction === "up" ? "+" : s.direction === "down" ? "-" : "="} ${s.name} (${s.impact})`),
      ``,
      `## Strategic Recommendation`,
      `Absorb: plugin-led distribution, MCP-native onboarding, benchmark rigor, provider abstraction`,
      `Own: causal memory, before/after state, packets/artifacts, role overlays, trajectory`,
      `Avoid: competing directly on raw memory API or universal connector layer`,
    );
  } else if (packetType === "role_switch") {
    memoLines.push(
      `## Current Identity`,
      canonicalMission,
      ``,
      `## Available Lenses`,
      `- **Founder:** weekly reset, packet management, delegation, contradiction detection`,
      `- **Banker:** credit analysis, risk assessment, due diligence, regulatory monitoring`,
      `- **CEO:** executive summary, OKR tracking, board updates, leadership attention`,
      `- **Researcher:** literature review, research digest, methodology comparison`,
      `- **Student:** accessible explanations, study plans, beginner resources`,
      `- **Operator:** system health, incident review, deployment monitoring`,
      `- **Investor:** pitch evaluation, market sizing, competitive moats, deal assessment`,
      `- **Legal:** regulatory exposure, compliance signals, governance review`,
      ``,
      `## Active Context`,
      `- ${ctx.sessionMemory.totalActions7d} actions / ${ctx.sessionMemory.totalMilestones7d} milestones (7d)`,
      `- Dogfood: ${ctx.dogfoodFindings.verdict ?? "no runs yet"}`,
      `- Contradictions: ${contradictions.length}`,
      ``,
      `## Signals for Current Role`,
      ...signals.map((s) => `- ${s.direction === "up" ? "+" : s.direction === "down" ? "-" : "="} ${s.name} (${s.impact})`),
    );
  } else if (packetType === "pre_delegation") {
    memoLines.push(
      `## Delegation Objective`,
      originalQuery ? `Task: ${originalQuery}` : `Hand off the following context so the delegate does not need to re-ask.`,
      `Scope: Hand off context so the delegate does not need to re-ask.`,
      ``,
      `## Current State`,
      `- Identity: ${canonicalMission}`,
      `- Package: ${ctx.identity.packageName}@${ctx.identity.packageVersion}`,
      `- Recent commits: ${whatChanged.length}`,
      `- Active contradictions: ${contradictions.length}`,
      ``,
      `## What Changed (Context for Delegate)`,
      ...whatChanged.slice(0, 5).map((c, i) => `${i + 1}. ${c.description}`),
      ``,
      `## Constraints`,
      `- Do not expand generic shell behavior`,
      `- Do not drift from entity intelligence positioning`,
      `- Do not add surfaces without proving the first 3 habits`,
      ``,
      `## Success Criteria`,
      ...nextActions.slice(0, 3).map((a) => `- ${a.action}`),
      ``,
      `## Files Likely Affected`,
      ...ctx.recentChanges.modifiedFiles.slice(0, 10).map((f) => `- ${f}`),
    );
  } else if (packetType === "important_change") {
    memoLines.push(
      `## Important Changes Since Last Session`,
      `Showing only strategy, positioning, architecture, and competitive changes that matter.`,
      ``,
      `## Changes Detected`,
      ...whatChanged.slice(0, 8).map((c, i) => `${i + 1}. **${c.description}** (${c.source})`),
      ``,
      `## Impact Assessment`,
      contradictions.length > 0
        ? `**${contradictions.length} active contradiction(s):**\n` + contradictions.map((c) => `- [${c.severity}] ${c.claim}`).join("\n")
        : `No active contradictions — positioning is consistent.`,
      ``,
      `## Packet Refresh Needed?`,
      whatChanged.length > 3 || contradictions.length > 0
        ? `Yes — ${whatChanged.length} changes and ${contradictions.length} contradictions warrant a packet refresh.`
        : `No — changes are incremental. Current packet remains valid.`,
      ``,
      `## Signals`,
      ...signals.map((s) => `- ${s.direction === "up" ? "+" : s.direction === "down" ? "-" : "="} ${s.name} (${s.impact})`),
    );
  } else {
    // weekly_reset (default)
    memoLines.push(
      `## What We Are Building`,
      canonicalMission,
      ``,
      `## What Changed This Week`,
      ...whatChanged.slice(0, 5).map((c, i) => `${i + 1}. ${c.description}`),
      ``,
      `## Contradictions (${contradictions.length})`,
      ...contradictions.map((c) => `- **[${c.severity}]** ${c.claim}\n  Evidence: ${c.evidence}`),
      ``,
      `## Next 3 Moves`,
      ...nextActions.slice(0, 3).map((a) => `${a.priority}. **${a.action}**\n   ${a.reasoning}`),
      ``,
      `## Signals`,
      ...signals.map((s) => `- ${s.direction === "up" ? "+" : s.direction === "down" ? "-" : "="} ${s.name} (${s.impact})`),
      ``,
      `## Public Narrative`,
      publicMismatches.length === 0
        ? "All public surfaces aligned with internal thesis."
        : publicMismatches.map((m) => `- MISMATCH: ${m}`).join("\n"),
      ``,
      `## Session Memory`,
      `- ${ctx.sessionMemory.totalActions7d} actions tracked / ${ctx.sessionMemory.totalMilestones7d} milestones in last 7 days`,
      `- Dogfood: ${ctx.dogfoodFindings.verdict ?? "no runs yet"}`,
    );
  }

  return {
    packetId,
    packetType,
    generatedAt: new Date().toISOString(),
    generatedBy: "founder_local_pipeline",
    canonicalEntity: {
      name: "NodeBench",
      canonicalMission,
      wedge,
      companyState: "building",
      identityConfidence: contradictions.length === 0 ? 85 : Math.max(50, 85 - contradictions.length * 10),
    },
    whatChanged,
    contradictions,
    nextActions,
    signals,
    publicNarrativeCheck: {
      aligned: publicMismatches.length === 0,
      mismatches: publicMismatches,
    },
    sessionStats: {
      actionsTracked7d: ctx.sessionMemory.totalActions7d,
      milestonesTracked7d: ctx.sessionMemory.totalMilestones7d,
      dogfoodVerdict: ctx.dogfoodFindings.verdict,
    },
    memo: memoLines.join("\n"),
  };
}

/* ─── Exported Tools ─────────────────────────────────────────────────────── */

export const founderLocalPipelineTools: McpTool[] = [
  {
    name: "founder_local_gather",
    description:
      "Gathers all locally-available context for a founder packet: git log, " +
      "CLAUDE.md identity, public surface state (index.html, server.json, README), " +
      "SQLite session memory (tracked actions + milestones), dogfood findings, and " +
      "architecture docs. Returns structured GatheredContext. No Convex or external " +
      "APIs required. Use this as the first step of a local intelligence pipeline.",
    inputSchema: {
      type: "object",
      properties: {
        daysBack: {
          type: "number",
          description: "How many days of history to gather (default: 7)",
        },
      },
    },
    annotations: { readOnlyHint: true },
    handler: async (args: { daysBack?: number }) => {
      const ctx = gatherLocalContext(args.daysBack ?? 7);
      return {
        gathered: true,
        identity: ctx.identity,
        recentChanges: {
          commitCount: ctx.recentChanges.gitLogOneline.length,
          modifiedFileCount: ctx.recentChanges.modifiedFiles.length,
          daysBack: ctx.recentChanges.daysBack,
          topCommits: ctx.recentChanges.gitLogOneline.slice(0, 5),
        },
        publicSurfaces: ctx.publicSurfaces,
        sessionMemory: {
          actions7d: ctx.sessionMemory.totalActions7d,
          milestones7d: ctx.sessionMemory.totalMilestones7d,
          recentActions: ctx.sessionMemory.recentActions.slice(0, 5),
        },
        dogfoodFindings: {
          verdict: ctx.dogfoodFindings.verdict,
          p0: ctx.dogfoodFindings.p0Count,
          p1: ctx.dogfoodFindings.p1Count,
          topFindings: ctx.dogfoodFindings.findings.slice(0, 5),
        },
        architectureDocs: ctx.docs.architectureDocs.slice(0, 8),
      };
    },
  },

  {
    name: "founder_local_synthesize",
    description:
      "Takes gathered local context and synthesizes a complete Founder Artifact Packet. " +
      "Detects contradictions between CLAUDE.md identity, public surfaces, and dogfood " +
      "findings. Ranks next actions by dogfood severity. Generates a readable memo. " +
      "No Convex or external APIs required. Call founder_local_gather first, or use " +
      "founder_local_weekly_reset for the full pipeline in one call.",
    inputSchema: {
      type: "object",
      properties: {
        packetType: {
          type: "string",
          enum: ["weekly_reset", "pre_delegation", "important_change", "competitor_brief", "role_switch"],
          description: "Type of artifact packet to produce",
        },
        daysBack: {
          type: "number",
          description: "How many days of history to include (default: 7)",
        },
        query: {
          type: "string",
          description: "Original user query — incorporated into the memo for context-specific output",
        },
      },
      required: ["packetType"],
    },
    handler: async (args: { packetType: string; daysBack?: number; query?: string }) => {
      const packetType = args.packetType as FounderPacket["packetType"];
      const ctx = gatherLocalContext(args.daysBack ?? 7);
      const packet = synthesizePacket(ctx, packetType, args.query);
      return packet;
    },
  },

  {
    name: "founder_local_weekly_reset",
    description:
      "One-call convenience: gathers all local context and produces a complete " +
      "weekly founder reset packet with: canonical truth, what changed (from git), " +
      "contradictions (comparing CLAUDE.md vs public surfaces vs dogfood findings), " +
      "ranked next actions, signals, public narrative alignment check, and a " +
      "human-readable memo. No Convex, no external APIs, no agent loop needed. " +
      "This is the first habit: messy context → canonical truth → change/contradiction " +
      "→ ranked interpretation → Artifact Packet.",
    inputSchema: {
      type: "object",
      properties: {
        daysBack: {
          type: "number",
          description: "How many days of history to include (default: 7)",
        },
      },
    },
    handler: async (args: { daysBack?: number }) => {
      const ctx = gatherLocalContext(args.daysBack ?? 7);
      const packet = synthesizePacket(ctx, "weekly_reset");

      // Also track this as a milestone
      try {
        const db = getDb();
        const now = new Date();
        const m = now.getMonth() + 1;
        const y = now.getFullYear();
        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        db.prepare(
          `INSERT OR IGNORE INTO tracking_milestones
            (milestoneId, sessionId, timestamp, title, description, category, evidence, metrics, dayOfWeek, weekNumber, month, quarter, year)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).run(
          packet.packetId,
          `pipeline_${Date.now()}`,
          now.toISOString(),
          "Weekly founder reset generated",
          `Contradictions: ${packet.contradictions.length}, Next actions: ${packet.nextActions.length}, Signals: ${packet.signals.length}`,
          "dogfood",
          null,
          JSON.stringify({ contradictions: packet.contradictions.length, nextActions: packet.nextActions.length }),
          dayNames[now.getDay()],
          Math.ceil((now.getTime() - new Date(y, 0, 1).getTime()) / 604800000),
          `${y}-${String(m).padStart(2, "0")}`,
          `${y}-Q${Math.ceil(m / 3)}`,
          y,
        );
      } catch {
        // Non-fatal — packet is the primary output
      }

      return packet;
    },
  },
];
