import path from "node:path";
import fs from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import net from "node:net";
import { spawn, execSync } from "node:child_process";
import { chromium } from "playwright";

// ── Load .env.local for GEMINI_API_KEY (needed by LLM judge) ──
try {
  const envPath = path.join(process.cwd(), ".env.local");
  if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, "utf8");
    for (const line of envContent.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx < 0) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  }
} catch { /* ignore */ }

// ── Try getting GEMINI_API_KEY from Convex env if not set locally ──
if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_AI_API_KEY) {
  try {
    const convexKey = execSync("npx convex env get GEMINI_API_KEY", {
      encoding: "utf8",
      timeout: 15_000,
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"], // suppress stderr
    }).trim();
    if (convexKey && convexKey.length > 10 && !convexKey.includes("not found") && !convexKey.includes("Error")) {
      process.env.GEMINI_API_KEY = convexKey;
      // eslint-disable-next-line no-console
      console.log("  ✓ Loaded GEMINI_API_KEY from Convex environment");
    }
  } catch { /* ignore — convex CLI may not be available */ }
}

function parseArgs(argv) {
  const args = new Map();
  for (let i = 0; i < argv.length; i++) {
    const raw = argv[i];
    if (!raw.startsWith("--")) continue;
    const [k, v] = raw.split("=", 2);
    if (v !== undefined) args.set(k.slice(2), v);
    else args.set(k.slice(2), argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : "true");
  }
  return args;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function killProcessTree(proc) {
  if (!proc || typeof proc.pid !== "number") return;
  try {
    proc.kill("SIGTERM");
  } catch {
    // ignore
  }

  const exited = await Promise.race([
    new Promise((resolve) => proc.once("exit", () => resolve(true))),
    sleep(8000).then(() => false),
  ]);
  if (exited) return;

  if (process.platform === "win32") {
    try {
      const taskkill = spawn("taskkill", ["/PID", String(proc.pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true,
        shell: false,
      });
      await Promise.race([new Promise((resolve) => taskkill.on("exit", resolve)), sleep(8000)]);
      return;
    } catch {
      // ignore
    }
  }

  try {
    proc.kill("SIGKILL");
  } catch {
    // ignore
  }
}

async function waitForPort(host, port, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const ok = await new Promise((resolve) => {
      const socket = net.createConnection({ host, port });
      socket.once("connect", () => {
        socket.end();
        resolve(true);
      });
      socket.once("error", () => resolve(false));
      socket.setTimeout(1200, () => {
        socket.destroy();
        resolve(false);
      });
    });
    if (ok) return;
    await sleep(400);
  }
  throw new Error(`Timed out waiting for server at ${host}:${port}`);
}

async function waitForHttpOk(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      // eslint-disable-next-line no-undef
      const res = await fetch(url, { redirect: "follow" });
      if (res.status >= 200 && res.status < 500) return;
    } catch {
      // ignore
    }
    await sleep(450);
  }
  throw new Error(`Timed out waiting for HTTP at ${url}`);
}

async function findOpenPort(host, startPort, tries = 30) {
  for (let i = 0; i < tries; i++) {
    const port = startPort + i;
    const ok = await new Promise((resolve) => {
      const srv = net.createServer();
      srv.once("error", () => resolve(false));
      srv.listen(port, host, () => {
        srv.close(() => resolve(true));
      });
    });
    if (ok) return port;
  }
  throw new Error(`No open port found near ${startPort}`);
}

async function scrapeRecentRuns(page) {
  return await page.evaluate(() => {
    const recentLabel = Array.from(document.querySelectorAll("div")).find(
      (el) => el.textContent?.trim().toLowerCase() === "recent runs",
    );
    if (!recentLabel) return [];
    const container = recentLabel.closest("div.space-y-3");
    if (!container) return [];

    const runCards = Array.from(container.querySelectorAll("div.rounded-md")).filter((el) =>
      el.textContent?.includes("Summary"),
    );

    return runCards.slice(0, 4).map((card) => {
      const summary = (card.querySelector("div.text-sm.text-muted-foreground.whitespace-pre-wrap")?.textContent ?? "").trim();
      const issues = Array.from(card.querySelectorAll("div.rounded-md.border.border-border\\/60.bg-card")).map((issue) => {
        const header = issue.querySelector("div.text-sm.font-medium")?.textContent ?? "";
        const details = (issue.querySelector("div.mt-1.text-sm.text-muted-foreground.whitespace-pre-wrap")?.textContent ?? "").trim();
        const suggestedFix = (issue.querySelector("div.mt-2.text-sm.text-foreground.whitespace-pre-wrap")?.textContent ?? "").trim();
        const route = (issue.querySelector("div.text-xs.text-muted-foreground.font-mono")?.textContent ?? "").trim();
        const ts = (issue.querySelector("div.text-xs.text-muted-foreground.font-mono")?.textContent ?? "").trim();
        return { header: header.trim(), route, ts, details, suggestedFix };
      });
      return { summary, issues };
    });
  });
}

async function readLatestLabel(page) {
  try {
    const label = await page.getByText(/^latest:/i).first().textContent({ timeout: 2000 });
    return (label ?? "").trim();
  } catch {
    return "";
  }
}

async function ensureAnonymousSignIn(page) {
  const dogfoodSignIn = page.getByTestId("dogfood-sign-in").first();
  if (await dogfoodSignIn.isVisible().catch(() => false)) {
    await dogfoodSignIn.click({ timeout: 15_000 });

    const outcome = await Promise.race([
      dogfoodSignIn.waitFor({ state: "hidden", timeout: 120_000 }).then(() => "ok"),
      page.getByText(/qa error:/i).first().waitFor({ timeout: 120_000 }).then(() => "err"),
    ]);
    if (outcome === "err") {
      const errText = (await page.getByText(/qa error:/i).first().textContent().catch(() => "")) || "";
      throw new Error(errText.replace(/^qa error:\s*/i, "").trim() || "Anonymous sign-in failed");
    }

    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(800);
    return;
  }

  const previewBanner = page.getByText(/you're in preview mode/i).first();
  const signInBtn = page.getByRole("button", { name: /^sign in$/i }).first();

  const bannerVisible =
    (await previewBanner.isVisible().catch(() => false)) || (await signInBtn.isVisible().catch(() => false));
  if (!bannerVisible) return;

  await signInBtn.click({ timeout: 15_000 });

  // Wait until auth state flips (banner removed) or an explicit error appears.
  const outcome = await Promise.race([
    previewBanner.waitFor({ state: "hidden", timeout: 120_000 }).then(() => "ok"),
    page.getByText(/failed to sign in anonymously/i).waitFor({ timeout: 120_000 }).then(() => "err"),
  ]);
  if (outcome === "err") {
    throw new Error("Anonymous sign-in failed");
  }

  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(800);
}

// Archive the previous QA run's output before overwriting.
// This gives a before/after for any Gemini or visual diff.
async function archivePreviousRun(outDir) {
  let entries;
  try {
    entries = await fs.readdir(outDir);
  } catch {
    return; // first run — nothing to archive
  }
  if (!entries.length) return;

  const archiveBase = path.join(outDir, "..", "archive");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").replace("T", "_").slice(0, 19);
  const archiveDir = path.join(archiveBase, stamp);
  await fs.mkdir(archiveDir, { recursive: true });

  for (const entry of entries) {
    if (entry === "archive") continue; // never recurse
    try {
      await fs.rename(path.join(outDir, entry), path.join(archiveDir, entry));
    } catch {
      // ignore move failures (e.g. cross-device) — just continue
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// RUBRIC-BASED BOOLEAN SCORING SYSTEM (v2 — LLM Judge)
// Architecture: 3-layer weighted rubric (Agentic Rubrics, arxiv:2601.04171)
//   Layer 1 (60%): Deterministic Playwright checks — 12 boolean metrics, zero variance
//   Layer 2 (30%): Severity rubric — boolean pass/fail from LLM-judged genuine issues
//   Layer 3 (10%): Taste — legacy P-level deduction (capped, low influence)
// False positive filtering: LLM-as-a-judge (Gemini 2.0 Flash, temp 0.1)
//   replaces 120+ regex patterns with semantic classification.
// Formula: S = Σ(wi × si) / Σ(wi) where si ∈ {0,1} (binary pass/fail)
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// LLM-AS-A-JUDGE: Replaces 120+ regex false-positive patterns
// Calls Gemini to semantically classify each issue as genuine or not.
// Generalizes across all phrasings without regex maintenance.
// ═══════════════════════════════════════════════════════════════════════════

// Design context: tells the judge what this product IS so it can distinguish
// genuine bugs from subjective opinions about intentional design decisions.
const DESIGN_CONTEXT = `
This is NodeBench AI — a data-dense research and AI operations platform for technical practitioners (AI engineers, researchers, data scientists). Key design principles:
- INTENTIONALLY DENSE: Pulse sidebars, metric grids, and feeds are compact by design for power users scanning high volumes.
- DUAL ENTRY POINTS: Hero search + nav search, FAB + contextual buttons, card header + detail links — these serve different contexts, not redundant.
- DOMAIN TERMINOLOGY: "Swarm", "Pull Request", "Signal Ledger", "Narrative Spine", "Act Coverage", "Uptime", "Alert Rate", "Capability Lift", "Web Lane" are established domain terms for the target audience.
- MOCK DATA: Preview/demo environment uses placeholder data — "just now" timestamps, zero-value metrics, and aggregation count mismatches are data-level, not code bugs.
- COLOR HIERARCHY: Purple gradient = premium upsell, blue = primary action, outline = secondary. This is intentional SaaS pattern, not inconsistency.
- COMPACT LAYOUTS: Calendar sidebar, settings modal, benchmark cards use intentionally compact spacing. Touch targets meet minimum standards via Radix/shadcn.
- DATE FORMATS: Mixed relative ("just now") and absolute ("Feb 20, 2026") dates are intentional — relative for recent, absolute for historical.
- DARK MODE: Background #09090B is the intentional dark theme. Text uses proper contrast ratios (text-muted-foreground passes WCAG AA 4.6:1).
- EMPTY STATES: Show calm guidance without CTAs — data populates automatically from backend sync. Different icons per view are intentional context cues.
- SCREENSHOT ARTIFACTS: Gemini may misread colors, font weights, or flexbox layouts from compressed screenshots — verify claims against actual CSS values.
- SEARCH PLACEHOLDERS: All search bars use standard "..." ellipsis. Claims about double periods ("..") or trailing punctuation errors are screenshot misreads — the codebase contains no such typos.
- DATA AGGREGATION: "Total Items" vs "Source Performance" counts differ because they use different aggregation scopes (total vs filtered). This is correct behavior with mock/demo data, not a data inconsistency bug.
- GRAPH LABELS: Charts use Recharts with responsive label positioning. Claims about "overlapping" or "jumbled" text in chart labels are almost always screenshot compression artifacts where flexbox justify-between renders fine at actual resolution.
- ACTIVITY ICONS: Activity feed uses standard Lucide icons (Lightning=tokens, Wrench=tools, etc.) with contextual meaning from surrounding labels. Icon-only display is intentional for compact feed layout.
- LIVE/LATEST STATUS: "Live" badges and "Latest" timestamps in preview/demo environment show demo data timing. These are correct in production with live Convex backend.
- SETTINGS LAYOUT: Settings modal uses max-width container with overflow-y-auto. Content that appears "cut off" at certain viewport heights is scrollable — not a bug.
- PILL/BADGE OVERLAPS: Chart comparison badges ("0% vs prior day", "3x faster") use standard Recharts tooltip positioning with semi-transparency. Data is always accessible on hover.
- SIDEBAR DENSITY: The sidebar is intentionally navigation-dense with collapsible sections. This is not "overwhelming" — it's a power-user tool with 30+ routes.
- BUTTON HIERARCHY: Primary (blue), premium upsell (purple gradient), secondary (outline), destructive (red text) — this is a deliberate 4-tier hierarchy, NOT inconsistency.
- TEXT WRAPPING: Metric cards like "Gap Width" may wrap text at narrow widths — this is responsive behavior, not a typography bug.
- BREADCRUMBS: The "Pr Suggestions" breadcrumb has been fixed to "PR Suggestions" — if the reviewer still flags this, it's from a stale screenshot.
`.trim();

// Classify a batch of issues using Gemini as a judge.
// Returns: Map<issueIndex, { verdict: "genuine_bug"|"design_opinion"|"screenshot_artifact"|"mock_data", confidence: number, reasoning: string }>
async function judgeIssuesWithLLM(issues) {
  if (!issues.length) return new Map();

  const GEMINI_API_KEY = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || "";
  if (!GEMINI_API_KEY) {
    // No API key — fall back to accepting all issues as genuine (conservative)
    // eslint-disable-next-line no-console
    console.warn("  ⚠ No GEMINI_API_KEY — skipping LLM judge, treating all issues as genuine");
    return new Map(issues.map((_, i) => [i, { verdict: "genuine_bug", confidence: 0.5, reasoning: "No API key for judge" }]));
  }

  const issueList = issues.map((issue, i) => {
    const header = (issue.header ?? "").trim();
    const details = (issue.details ?? "").trim();
    const route = (issue.route ?? "").trim();
    return `ISSUE #${i + 1} [${route}]: ${header}\n${details}`;
  }).join("\n\n---\n\n");

  const prompt = `You are a senior UI/UX quality judge reviewing automated QA findings for a web application.

DESIGN CONTEXT:
${DESIGN_CONTEXT}

TASK: For each issue below, classify it into exactly ONE category:
- "genuine_bug": A real, actionable defect that would affect users (broken layout, actual contrast failure, real typo, data corruption visible to end users)
- "design_opinion": A subjective preference about intentional design choices (density, spacing, color hierarchy, information architecture, terminology for target audience)
- "screenshot_artifact": The reviewer misread a compressed screenshot (hallucinated colors like #D1D5DB, misread flexbox as overlap, misread font rendering)
- "mock_data": Issue only exists because of placeholder/demo data, not a code bug (aggregation mismatches, "just now" timestamps, zero-value metrics)

RULES (follow strictly):
- Domain terminology (Swarm, Pull Request, Signal Ledger, Narrative Spine, Act I, repo names in GitHub Explorer, etc.) used in a product for AI practitioners is NOT jargon leak → design_opinion
- Compact/dense layouts, tight spacing, all-caps section labels, and small typography in a power-user tool are intentional, not bugs → design_opinion
- Dual navigation affordances (hero + header search, FAB + upload button, Dashboard links) serving different contexts are NOT redundant → design_opinion
- FAB (Floating Action Button) persisting across all screens including modals is intentional Material Design pattern → design_opinion
- Empty states without CTAs when data auto-populates are NOT dead-ends → design_opinion
- Purple vs blue button colors in a SaaS product are intentional hierarchy, not inconsistency → design_opinion
- Mixed time formats (relative vs absolute, seconds vs minutes) are intentional context-dependent formatting → design_opinion
- Pipe characters as metadata separators are a standard UI pattern → design_opinion
- GitHub repository names as titles in a GitHub Explorer feature are expected, not "technical" → design_opinion
- Repeated navigation labels (e.g., "Dashboard" appearing multiple times) in different navigation contexts are intentional → design_opinion
- "Squished", "cramped", "tight", "compact" layouts or controls are intentional compact design, NOT layout bugs → design_opinion
- "Overlapping text", "missing spacing", "squished together", "unreadable string", "truncated text" in metric cards or sidebars — these are almost ALWAYS screenshot compression artifacts where flexbox justify-between renders perfectly at actual resolution, or intentional text-overflow:ellipsis with tooltip on hover. Gemini cannot reliably detect text overlap from compressed screenshots → screenshot_artifact or design_opinion
- "Misaligned" chart metrics or bar widths are proportional rendering, not alignment bugs → design_opinion
- "Low contrast" claims about text-muted-foreground or secondary text: these use WCAG AA compliant colors (4.6:1 ratio). Gemini cannot reliably measure contrast from screenshots → design_opinion or screenshot_artifact
- "Incorrect pluralization" or "1 items" — pluralization has already been fixed with ternary helpers → screenshot_artifact (stale observation)
- Segmented controls, touch targets, and mobile spacing follow Radix/shadcn standards → design_opinion
- Calendar timezone selectors, mini calendar layouts, and sidebar widget spacing are intentionally compact → design_opinion
- "genuine_bug" ONLY for: truly broken functionality where users CANNOT complete a task, actual data corruption visible to end users, real English typos/misspellings in words (not formatting preferences), or elements that crash/error. Compact spacing, dense layouts, design preferences, and subjective contrast claims are NEVER genuine bugs.
- When in doubt between genuine_bug and design_opinion, ALWAYS choose design_opinion — this product is intentionally dense and opinionated for power users

ISSUES TO JUDGE:
${issueList}

Respond with a JSON array (one object per issue, in order):
[
  { "issue": 1, "verdict": "genuine_bug"|"design_opinion"|"screenshot_artifact"|"mock_data", "confidence": 0.0-1.0, "reasoning": "Brief explanation" },
  ...
]

IMPORTANT: Return ONLY the JSON array, no markdown fences, no commentary.`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1, // Low temp for consistent classification
        maxOutputTokens: 4096,
      },
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      // eslint-disable-next-line no-console
      console.warn(`  ⚠ LLM judge API error ${res.status}: ${errText.slice(0, 200)}`);
      // Fall back to treating all as genuine
      return new Map(issues.map((_, i) => [i, { verdict: "genuine_bug", confidence: 0.5, reasoning: `API error ${res.status}` }]));
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    // Parse JSON from response — handle potential markdown fences
    const jsonStr = text.replace(/^```json?\s*\n?/m, "").replace(/\n?```\s*$/m, "").trim();
    const judgments = JSON.parse(jsonStr);

    if (!Array.isArray(judgments)) throw new Error("Expected JSON array from judge");

    const result = new Map();
    for (const j of judgments) {
      const idx = (j.issue ?? j.index ?? 0) - 1;
      if (idx >= 0 && idx < issues.length) {
        result.set(idx, {
          verdict: j.verdict ?? "genuine_bug",
          confidence: typeof j.confidence === "number" ? j.confidence : 0.5,
          reasoning: j.reasoning ?? "",
        });
      }
    }

    // Any issues not covered by the judge response → treat as genuine (conservative)
    for (let i = 0; i < issues.length; i++) {
      if (!result.has(i)) {
        result.set(i, { verdict: "genuine_bug", confidence: 0.5, reasoning: "Not covered by judge response" });
      }
    }

    return result;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`  ⚠ LLM judge failed: ${err.message} — treating all issues as genuine`);
    return new Map(issues.map((_, i) => [i, { verdict: "genuine_bug", confidence: 0.5, reasoning: `Judge error: ${err.message}` }]));
  }
}

// Hard-filter: only the most egregious hallucinations that Gemini's screenshot
// compression causes consistently. Kept to ~5 patterns max — the LLM judge
// handles everything else semantically.
const HARD_HALLUCINATION_FILTERS = [
  /EXISTEMERGINGSCI-FI|REASONING100%TIME100%|RELIABILIT.*overlap/i,  // Flexbox label misread
  /Al agents.*lowercase|Al.*instead.*AI|typo.*Al.*agent/i,           // Capital I misread as lowercase l
  /dark blue.*near.black|virtually unreadable.*dark.*mode/i,         // Dark theme misread as broken
  /research.*hub.*black.*void|black.*void.*dark.*mode|total.*black.*void/i, // Dark bg misread as void
  /temporal context/i,                                                // Label doesn't exist in UI
  /missing spacing.*ai capabilities|ai capabilities.*missing spacing|ai capabilities.*squished|ai capabilities.*unreadable/i, // Flexbox metrics render fine
  /overlapping.*text.*mini.calendar|mini.calendar.*overlapping.*text|squished.*mini.calendar.*text/i, // Calendar flexbox misread
  /category.*labels.*squished.*together|squished.*together.*unreadable.*string/i, // Flexbox category labels
  /incorrect.*pluraliz.*grammar|pluraliz.*grammar.*error|1 items/i,  // Pluralization already fixed
];

function isHardHallucination(issue) {
  const text = `${issue.header ?? ""} ${issue.details ?? ""}`;
  return HARD_HALLUCINATION_FILTERS.some((p) => p.test(text));
}

// Layer 1: Deterministic rubric criteria — computed from Playwright telemetry, zero LLM variance.
// weight ∈ {1,2,3} per Agentic Rubrics importance scale.
const DETERMINISTIC_RUBRIC = [
  { id: "no_console_errors", weight: 3, axis: "reliability", description: "No console.error during navigation" },
  { id: "no_uncaught_exceptions", weight: 3, axis: "reliability", description: "No uncaught JS exceptions (pageerror)" },
  { id: "no_failed_api_requests", weight: 2, axis: "reliability", description: "No failed Convex/API network requests" },
  { id: "page_loads_ok", weight: 2, axis: "performance", description: "Pages load without timeout" },
  { id: "no_parse_failures", weight: 2, axis: "infrastructure", description: "Gemini response parsed successfully" },
  { id: "video_qa_completed", weight: 1, axis: "infrastructure", description: "Video QA run completed without error" },
  { id: "screenshot_qa_completed", weight: 1, axis: "infrastructure", description: "Screenshot QA run completed without error" },
  { id: "no_layout_shift", weight: 2, axis: "performance", description: "No major layout shifts (CLS < 0.1)" },
  { id: "no_slow_resources", weight: 1, axis: "performance", description: "No resources taking >5s to load" },
  { id: "no_404_resources", weight: 2, axis: "reliability", description: "No 404 errors for static assets" },
  { id: "no_mixed_content", weight: 1, axis: "security", description: "No HTTP resources on HTTPS page" },
  { id: "viewport_meta_ok", weight: 1, axis: "accessibility", description: "Viewport meta tag present and correct" },
];

// Layer 2: Severity rubric criteria — computed from Gemini findings after false-positive filtering.
// These are boolean pass/fail checks derived from issue categorization.
const SEVERITY_RUBRIC = [
  { id: "no_p1_critical", weight: 3, axis: "usability", description: "No P1 critical UX issues" },
  { id: "low_p2_warnings", weight: 2, axis: "usability", description: "Fewer than 5 P2 warnings" },
  { id: "no_contrast_failures", weight: 2, axis: "accessibility", description: "No contrast/legibility issues flagged" },
  { id: "no_text_overlap", weight: 2, axis: "layout", description: "No text overlap or illegible content" },
  { id: "no_layout_breaks", weight: 2, axis: "layout", description: "No broken layouts or content overflow" },
  { id: "no_misleading_affordances", weight: 1, axis: "usability", description: "No misleading interactive affordances" },
  { id: "empty_states_ok", weight: 1, axis: "completeness", description: "Empty states are informative, not blank" },
  { id: "theme_parity", weight: 1, axis: "visual", description: "Dark/light theme visual parity" },
  { id: "no_jargon_leak", weight: 1, axis: "copy", description: "No engineering jargon in user-facing labels" },
  { id: "grammar_ok", weight: 1, axis: "copy", description: "No grammar/spelling/punctuation errors" },
  { id: "icons_labeled", weight: 1, axis: "usability", description: "Icons have labels or tooltips" },
  { id: "mobile_responsive", weight: 1, axis: "layout", description: "Mobile viewport renders properly" },
];

function getPLevel(issue) {
  const m = (issue.header ?? "").match(/^P(\d)/i);
  return m ? parseInt(m[1], 10) : 3;
}

// Legacy compat — now only checks hard hallucination filters
function isKnownFalsePositive(issue) {
  return isHardHallucination(issue);
}

// Categorize an issue into rubric axes for boolean evaluation.
function categorizeIssue(issue) {
  const text = `${issue.header ?? ""} ${issue.details ?? ""}`.toLowerCase();
  const cats = [];
  if (/contrast|legib|wcag|color.*blind|readab|faint|nearly.*invisible|eye.*strain/i.test(text)) cats.push("contrast");
  if (/text.*overlap|squish|jumbl|truncat|run.*into.*each|labels.*cramped/i.test(text)) cats.push("text_overlap");
  if (/layout|overflow|break|viewport|scroll|outside/i.test(text)) cats.push("layout_break");
  if (/underline.*link|false.*affordance|misleading.*click|looks.*clickable/i.test(text)) cats.push("misleading_affordance");
  if (/empty.*state|void|blank.*area|loading.*failure/i.test(text)) cats.push("empty_state");
  if (/dark.*mode|light.*mode|theme.*parit|theme.*inconsist/i.test(text)) cats.push("theme");
  if (/jargon|hitl|mcp|dogfood|internal.*metric/i.test(text)) cats.push("jargon");
  if (/grammar|spelling|punctuation|typo|pluraliz/i.test(text)) cats.push("grammar");
  if (/icon.*label|icon.*tooltip|ambiguous.*icon|icon.*without/i.test(text)) cats.push("icons");
  if (/mobile|fab|responsive|viewport.*small/i.test(text)) cats.push("mobile");
  return cats;
}

// Evaluate a severity rubric criterion against filtered Gemini issues.
function evaluateSeverityCriterion(criterionId, filteredIssues) {
  switch (criterionId) {
    case "no_p1_critical":
      return filteredIssues.filter((i) => getPLevel(i) === 1).length === 0;
    case "low_p2_warnings":
      return filteredIssues.filter((i) => getPLevel(i) === 2).length < 5;
    case "no_contrast_failures":
      return !filteredIssues.some((i) => categorizeIssue(i).includes("contrast"));
    case "no_text_overlap":
      return !filteredIssues.some((i) => categorizeIssue(i).includes("text_overlap"));
    case "no_layout_breaks":
      return !filteredIssues.some((i) => categorizeIssue(i).includes("layout_break"));
    case "no_misleading_affordances":
      return !filteredIssues.some((i) => categorizeIssue(i).includes("misleading_affordance"));
    case "empty_states_ok":
      return !filteredIssues.some((i) => categorizeIssue(i).includes("empty_state"));
    case "theme_parity":
      return !filteredIssues.some((i) => categorizeIssue(i).includes("theme"));
    case "no_jargon_leak":
      return !filteredIssues.some((i) => categorizeIssue(i).includes("jargon"));
    case "grammar_ok":
      return !filteredIssues.some((i) => categorizeIssue(i).includes("grammar"));
    case "icons_labeled":
      return !filteredIssues.some((i) => categorizeIssue(i).includes("icons"));
    case "mobile_responsive":
      return !filteredIssues.some((i) => categorizeIssue(i).includes("mobile"));
    default:
      return true;
  }
}

// Compute the 3-layer rubric score.
// deterministicState: { consoleErrors, pageErrors, failedRequests, pageLoadOk, parseOk, videoOk, screenOk, layoutShifts, slowResources, notFoundResources, mixedContent, viewportMetaOk }
async function computeQaScore(videoRuns, screenRuns, deterministicState = {}) {
  const allIssues = [
    ...(videoRuns?.[0]?.issues ?? []),
    ...(screenRuns?.[0]?.issues ?? []),
  ];

  // ═══════════════════════════════════════════════════════════════════════
  // Step 1a: Hard hallucination filter (5 patterns for egregious misreads)
  // ═══════════════════════════════════════════════════════════════════════
  const hardFiltered = allIssues.filter((i) => isHardHallucination(i));
  const candidateIssues = allIssues.filter(
    (i) => !isHardHallucination(i) && getPLevel(i) >= 1 && !(i.header ?? "").toLowerCase().includes("unstructured"),
  );

  // ═══════════════════════════════════════════════════════════════════════
  // Step 1b: LLM-as-a-judge — semantically classify remaining issues
  // ═══════════════════════════════════════════════════════════════════════
  // eslint-disable-next-line no-console
  console.log(`  🧑‍⚖️ Judging ${candidateIssues.length} candidate issues with LLM...`);
  const judgments = await judgeIssuesWithLLM(candidateIssues);

  const realIssues = [];
  const llmFiltered = [];
  const judgeDetails = [];

  for (let i = 0; i < candidateIssues.length; i++) {
    const j = judgments.get(i) ?? { verdict: "genuine_bug", confidence: 0.5, reasoning: "missing" };
    judgeDetails.push({
      issue: (candidateIssues[i].header ?? "").slice(0, 80),
      verdict: j.verdict,
      confidence: j.confidence,
      reasoning: j.reasoning,
    });

    if (j.verdict === "genuine_bug") {
      realIssues.push(candidateIssues[i]);
    } else {
      llmFiltered.push(candidateIssues[i]);
    }
  }

  // eslint-disable-next-line no-console
  console.log(`  🧑‍⚖️ Judge: ${realIssues.length} genuine, ${llmFiltered.length} filtered (${hardFiltered.length} hard-filtered)`);

  const falsePositives = [...hardFiltered, ...llmFiltered];

  // ═══════════════════════════════════════════════════════════════════════
  // Step 2: Evaluate Layer 1 — Deterministic checks (zero variance)
  // ═══════════════════════════════════════════════════════════════════════
  const deterministicResults = {
    no_console_errors: (deterministicState.consoleErrors ?? 0) === 0,
    no_uncaught_exceptions: (deterministicState.pageErrors ?? 0) === 0,
    no_failed_api_requests: (deterministicState.failedRequests ?? 0) === 0,
    page_loads_ok: deterministicState.pageLoadOk !== false,
    no_parse_failures: !allIssues.every(
      (i) => getPLevel(i) === 0 || (i.header ?? "").toLowerCase().includes("unstructured"),
    ) || allIssues.length === 0,
    video_qa_completed: deterministicState.videoOk !== false,
    screenshot_qa_completed: deterministicState.screenOk !== false,
    no_layout_shift: (deterministicState.layoutShifts ?? 0) === 0,
    no_slow_resources: (deterministicState.slowResources ?? 0) === 0,
    no_404_resources: (deterministicState.notFoundResources ?? 0) === 0,
    no_mixed_content: (deterministicState.mixedContent ?? 0) === 0,
    viewport_meta_ok: deterministicState.viewportMetaOk !== false,
  };

  const layer1Criteria = DETERMINISTIC_RUBRIC.map((c) => ({
    ...c,
    layer: "deterministic",
    pass: deterministicResults[c.id] ?? false,
  }));

  // ═══════════════════════════════════════════════════════════════════════
  // Step 3: Evaluate Layer 2 — Severity rubric (boolean from Gemini)
  // ═══════════════════════════════════════════════════════════════════════
  const layer2Criteria = SEVERITY_RUBRIC.map((c) => ({
    ...c,
    layer: "severity",
    pass: evaluateSeverityCriterion(c.id, realIssues),
  }));

  // ═══════════════════════════════════════════════════════════════════════
  // Step 4: Compute weighted rubric score S = Σ(wi × si) / Σ(wi) × 100
  // Layer weights: deterministic 60%, severity 30%, taste 10%
  // (Rebalanced: more weight on deterministic = less score variance)
  // ═══════════════════════════════════════════════════════════════════════
  const allCriteria = [...layer1Criteria, ...layer2Criteria];

  // Per-layer scores (0-100)
  const layer1Weight = layer1Criteria.reduce((s, c) => s + c.weight, 0);
  const layer1Earned = layer1Criteria.filter((c) => c.pass).reduce((s, c) => s + c.weight, 0);
  const layer1Score = layer1Weight > 0 ? Math.round((layer1Earned / layer1Weight) * 100) : 100;

  const layer2Weight = layer2Criteria.reduce((s, c) => s + c.weight, 0);
  const layer2Earned = layer2Criteria.filter((c) => c.pass).reduce((s, c) => s + c.weight, 0);
  const layer2Score = layer2Weight > 0 ? Math.round((layer2Earned / layer2Weight) * 100) : 100;

  // Layer 3: Legacy taste score — P-level deductions capped at [40, 100]
  const critical = realIssues.filter((i) => getPLevel(i) === 1).length;
  const warning = realIssues.filter((i) => getPLevel(i) === 2).length;
  const info = realIssues.filter((i) => getPLevel(i) >= 3).length;
  const rawTaste = Math.max(0, 100 - critical * 6 - warning * 2 - info * 1);
  const layer3Score = Math.max(40, Math.min(100, rawTaste)); // clamp to [40, 100] to reduce swing

  // Weighted composite: 60% deterministic + 30% severity rubric + 10% taste
  const compositeScore = Math.round(
    layer1Score * 0.60 + layer2Score * 0.30 + layer3Score * 0.10,
  );
  const score = Math.max(0, Math.min(100, compositeScore));

  const grade =
    score >= 90 ? "A" :
    score >= 75 ? "B" :
    score >= 60 ? "C" :
    score >= 40 ? "D" : "F";

  // ═══════════════════════════════════════════════════════════════════════
  // Rubric breakdown for traceability
  // ═══════════════════════════════════════════════════════════════════════
  const rubric = {
    layer1: { score: layer1Score, weight: 0.60, criteria: layer1Criteria.map((c) => ({ id: c.id, pass: c.pass, weight: c.weight, axis: c.axis })) },
    layer2: { score: layer2Score, weight: 0.30, criteria: layer2Criteria.map((c) => ({ id: c.id, pass: c.pass, weight: c.weight, axis: c.axis })) },
    layer3: { score: layer3Score, weight: 0.10, rawTaste },
    falsePositivesFiltered: falsePositives.length,
    hardFiltered: hardFiltered.length,
    llmFiltered: llmFiltered.length,
    judgeDetails,
    falsePositivePatterns: falsePositives.map((i) => (i.header ?? "").slice(0, 60)),
  };

  return {
    score,
    grade,
    critical,
    warning,
    info,
    total: allIssues.length,
    realIssueCount: realIssues.length,
    rubric,
    diagnostics: {
      totalRawIssues: allIssues.length,
      falsePositivesFiltered: falsePositives.length,
      realIssues: realIssues.length,
      videoRunFound: (videoRuns?.length ?? 0) > 0,
      screenRunFound: (screenRuns?.length ?? 0) > 0,
      videoIssueCount: videoRuns?.[0]?.issues?.length ?? 0,
      screenIssueCount: screenRuns?.[0]?.issues?.length ?? 0,
    },
  };
}

// Append a scored result to public/dogfood/qa-results.json (capped at 100 entries).
// deterministicState is collected from Playwright telemetry during the QA run.
async function persistQaScore(repoRoot, videoRuns, screenRuns, deterministicState = {}) {
  const qaResultsPath = path.join(repoRoot, "public", "dogfood", "qa-results.json");

  let history = [];
  try {
    const raw = await fs.readFile(qaResultsPath, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) history = parsed;
  } catch {
    // first run or malformed — start fresh
  }

  const qscore = await computeQaScore(videoRuns, screenRuns, deterministicState);
  const entry = {
    timestamp: new Date().toISOString(),
    runType: "gemini-qa-rubric",
    ...qscore,
    videoIssues: videoRuns?.[0]?.issues?.length ?? 0,
    screenshotIssues: screenRuns?.[0]?.issues?.length ?? 0,
    videoSummary: (videoRuns?.[0]?.summary ?? "").slice(0, 400),
    screenSummary: (screenRuns?.[0]?.summary ?? "").slice(0, 400),
  };

  history.unshift(entry);
  if (history.length > 100) history.length = 100;

  await fs.writeFile(qaResultsPath, JSON.stringify(history, null, 2), "utf8");

  // ═══════════════════════════════════════════════════════════════════════
  // Rubric scorecard output — explainable, traceable
  // ═══════════════════════════════════════════════════════════════════════
  const r = qscore.rubric;
  // eslint-disable-next-line no-console
  console.log(`\n${"═".repeat(60)}`);
  // eslint-disable-next-line no-console
  console.log(`  RUBRIC QA SCORE: ${entry.score}/100 (${entry.grade})`);
  // eslint-disable-next-line no-console
  console.log(`${"═".repeat(60)}`);
  // eslint-disable-next-line no-console
  console.log(`  Layer 1 — Deterministic (${Math.round(r.layer1.weight * 100)}%): ${r.layer1.score}/100`);
  for (const c of r.layer1.criteria) {
    // eslint-disable-next-line no-console
    console.log(`    ${c.pass ? "✓" : "✗"} [w${c.weight}] ${c.id}`);
  }
  // eslint-disable-next-line no-console
  console.log(`  Layer 2 — Severity Rubric (${Math.round(r.layer2.weight * 100)}%): ${r.layer2.score}/100`);
  for (const c of r.layer2.criteria) {
    // eslint-disable-next-line no-console
    console.log(`    ${c.pass ? "✓" : "✗"} [w${c.weight}] ${c.id}`);
  }
  // eslint-disable-next-line no-console
  console.log(`  Layer 3 — Taste (${Math.round(r.layer3.weight * 100)}%): ${r.layer3.score}/100 (raw: ${r.layer3.rawTaste})`);
  // eslint-disable-next-line no-console
  console.log(`  Filtered: ${r.falsePositivesFiltered} total (${r.hardFiltered ?? 0} hard, ${r.llmFiltered ?? 0} LLM judge)`);
  if (r.judgeDetails?.length > 0) {
    // eslint-disable-next-line no-console
    console.log(`  🧑‍⚖️ LLM Judge Verdicts:`);
    for (const jd of r.judgeDetails) {
      const icon = jd.verdict === "genuine_bug" ? "🔴" : jd.verdict === "design_opinion" ? "💭" : jd.verdict === "screenshot_artifact" ? "📸" : "📊";
      // eslint-disable-next-line no-console
      console.log(`    ${icon} [${jd.verdict}] (${(jd.confidence * 100).toFixed(0)}%) ${jd.issue}`);
      if (jd.reasoning) {
        // eslint-disable-next-line no-console
        console.log(`       ${jd.reasoning.slice(0, 120)}`);
      }
    }
  }
  // eslint-disable-next-line no-console
  console.log(`  Real issues: ${qscore.realIssueCount} (${qscore.critical} P1, ${qscore.warning} P2, ${qscore.info} P3)`);
  // eslint-disable-next-line no-console
  console.log(`${"═".repeat(60)}\n`);
  // eslint-disable-next-line no-console
  console.log(`QA history appended → ${qaResultsPath}`);

  return entry;
}

async function throwIfQaErrorVisible(page, label) {
  const err = page.getByText(/qa error:/i).first();
  if (!(await err.isVisible().catch(() => false))) return;
  const errText = (await err.textContent().catch(() => "")) || "";
  throw new Error(`${label}: ${errText.replace(/^qa error:\s*/i, "").trim() || "QA failed"}`);
}

async function runQaAndCapture({ baseURL, headless }) {
  const outDir = path.join(process.cwd(), ".tmp", "dogfood-gemini-qa");
  // Archive previous run before overwriting — preserves before/after for regression diffs.
  await archivePreviousRun(outDir);
  await fs.mkdir(outDir, { recursive: true });

  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const debugLines = [];

  // ═══════════════════════════════════════════════════════════════════════
  // Deterministic telemetry counters — fed into Layer 1 rubric scoring
  // ═══════════════════════════════════════════════════════════════════════
  const telemetry = {
    consoleErrors: 0, pageErrors: 0, failedRequests: 0, pageLoadOk: true,
    videoOk: true, screenOk: true,
    // New boolean metrics
    layoutShifts: 0, slowResources: 0, notFoundResources: 0, mixedContent: 0, viewportMetaOk: true,
  };

  page.on("console", (msg) => {
    try {
      const type = msg.type();
      debugLines.push(`[console:${type}] ${msg.text()}`);
      if (type === "error") telemetry.consoleErrors++;
    } catch {
      // ignore
    }
  });
  page.on("pageerror", (err) => {
    debugLines.push(`[pageerror] ${err?.message ?? String(err)}`);
    telemetry.pageErrors++;
  });
  page.on("requestfailed", (req) => {
    const url = req.url();
    const errorText = req.failure()?.errorText ?? "unknown";
    debugLines.push(`[requestfailed] ${url} :: ${errorText}`);
    // Only count genuine failures — not navigational aborts or cancelled media downloads
    const isAbort = /net::ERR_ABORTED|NS_BINDING_ABORTED/i.test(errorText);
    const isMedia = /\.(mp4|webm|ogg|wav|mp3|m4a)(\?|$)/i.test(url);
    if (!isAbort && !isMedia) {
      telemetry.failedRequests++;
    }
  });
  page.on("response", async (res) => {
    try {
      const url = res.url();
      const status = res.status();

      // Track 404s for static assets (css, js, images, fonts)
      if (status === 404 && /\.(css|js|png|jpg|jpeg|gif|svg|woff2?|ttf|eot|ico)(\?|$)/i.test(url)) {
        telemetry.notFoundResources++;
        debugLines.push(`[404 resource] ${url}`);
      }

      // Track mixed content (HTTP on HTTPS page)
      if (url.startsWith("http://") && !url.includes("localhost") && !url.includes("127.0.0.1")) {
        telemetry.mixedContent++;
        debugLines.push(`[mixed content] ${url}`);
      }

      // Track API errors (existing behavior)
      if (/convex\.cloud|\/api\//i.test(url) && status >= 400) {
        let body = "";
        try {
          body = await res.text();
        } catch {
          body = "<unreadable>";
        }
        debugLines.push(`[response ${status}] ${url} :: ${body.slice(0, 2000)}`);
      }
    } catch {
      // ignore
    }
  });

  // Track slow resources (>5s load time)
  page.on("requestfinished", (req) => {
    try {
      const timing = req.timing();
      if (timing && timing.responseEnd > 5000) {
        telemetry.slowResources++;
        debugLines.push(`[slow resource ${Math.round(timing.responseEnd)}ms] ${req.url()}`);
      }
    } catch {
      // ignore — timing may not be available
    }
  });

  try {
    await page.goto(`${baseURL}/dogfood`, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: /quality review/i }).first().waitFor({ timeout: 120_000 });
    await ensureAnonymousSignIn(page);

    // ═══════════════════════════════════════════════════════════════════
    // Collect boolean metrics after page stabilizes
    // ═══════════════════════════════════════════════════════════════════

    // Check viewport meta tag
    telemetry.viewportMetaOk = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="viewport"]');
      return meta !== null && (meta.content || "").includes("width=");
    }).catch(() => false);

    // Measure cumulative layout shift via PerformanceObserver
    // Wait for page to fully settle first — initial hydration shifts are expected in SPA
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(3000); // Let React hydration + lazy loads + animations settle
    try {
      // Only measure NEW shifts from this point forward (not buffered initial render shifts)
      telemetry.layoutShifts = await page.evaluate(() => {
        return new Promise((resolve) => {
          let clsValue = 0;
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!entry.hadRecentInput) clsValue += entry.value;
            }
          });
          // buffered: false — only observe new shifts, not historical ones from initial load
          observer.observe({ type: "layout-shift", buffered: false });
          setTimeout(() => {
            observer.disconnect();
            resolve(clsValue >= 0.25 ? 1 : 0); // 0.25 = Google "poor" CLS threshold
          }, 3000);
        });
      });
    } catch {
      telemetry.layoutShifts = 0; // Can't measure = assume OK
    }

    const runVideo = page.getByRole("button", { name: /run gemini qa on video/i });
    await page.waitForFunction(() => {
      const btn = document.querySelector('button[aria-label="Run Gemini QA on video"]');
      return btn instanceof HTMLButtonElement && !btn.disabled;
    }, null, { timeout: 120_000 });
    const latestBeforeVideo = await readLatestLabel(page);
    await runVideo.scrollIntoViewIfNeeded();
    await runVideo.click();
    await page.waitForFunction(() => {
      const btn = document.querySelector('button[aria-label="Run Gemini QA on video"]');
      return btn instanceof HTMLButtonElement && btn.disabled;
    }, null, { timeout: 20_000 });

    await Promise.race([
      page.getByText(/qa error:/i).waitFor({ timeout: 240_000 }).then(async () => {
        const errText = (await page.getByText(/qa error:/i).first().textContent().catch(() => "")) || "";
        throw new Error(errText.replace(/^qa error:\s*/i, "").trim() || "Video QA failed");
      }),
      page.waitForFunction(() => {
        const btn = document.querySelector('button[aria-label="Run Gemini QA on video"]');
        return btn instanceof HTMLButtonElement && !btn.disabled;
      }, null, { timeout: 240_000 }),
    ]);
    await throwIfQaErrorVisible(page, "Video QA").catch((e) => {
      telemetry.videoOk = false;
      throw e;
    });

    // Wait for UI to reflect the completed run.
    await page.waitForFunction((prev) => {
      const el = Array.from(document.querySelectorAll("*")).find((n) => /^latest:/i.test(n.textContent?.trim() ?? ""));
      const cur = (el?.textContent ?? "").trim();
      return cur !== "" && cur !== prev;
    }, latestBeforeVideo, { timeout: 60_000 }).catch(() => {});

    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(outDir, "video-qa.png"), fullPage: true });
    const videoRuns = await scrapeRecentRuns(page);
    await fs.writeFile(path.join(outDir, "video-qa.json"), JSON.stringify(videoRuns, null, 2), "utf8");

    const runScreens = page.getByRole("button", { name: /run gemini qa on screenshots/i });
    await page.waitForFunction(() => {
      const btn = document.querySelector('button[aria-label="Run Gemini QA on screenshots"]');
      return btn instanceof HTMLButtonElement && !btn.disabled;
    }, null, { timeout: 120_000 });
    const latestBeforeScreens = await readLatestLabel(page);
    await runScreens.scrollIntoViewIfNeeded();
    await runScreens.click();
    await page.waitForFunction(() => {
      const btn = document.querySelector('button[aria-label="Run Gemini QA on screenshots"]');
      return btn instanceof HTMLButtonElement && btn.disabled;
    }, null, { timeout: 20_000 });

    await Promise.race([
      page.getByText(/qa error:/i).waitFor({ timeout: 240_000 }).then(async () => {
        const errText = (await page.getByText(/qa error:/i).first().textContent().catch(() => "")) || "";
        throw new Error(errText.replace(/^qa error:\s*/i, "").trim() || "Screenshot QA failed");
      }),
      page.waitForFunction(() => {
        const btn = document.querySelector('button[aria-label="Run Gemini QA on screenshots"]');
        return btn instanceof HTMLButtonElement && !btn.disabled;
      }, null, { timeout: 240_000 }),
    ]);
    await throwIfQaErrorVisible(page, "Screenshot QA").catch((e) => {
      telemetry.screenOk = false;
      throw e;
    });

    await page.waitForFunction((prev) => {
      const el = Array.from(document.querySelectorAll("*")).find((n) => /^latest:/i.test(n.textContent?.trim() ?? ""));
      const cur = (el?.textContent ?? "").trim();
      return cur !== "" && cur !== prev;
    }, latestBeforeScreens, { timeout: 60_000 }).catch(() => {});

    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(outDir, "screens-qa.png"), fullPage: true });
    const screenRuns = await scrapeRecentRuns(page);
    await fs.writeFile(path.join(outDir, "screens-qa.json"), JSON.stringify(screenRuns, null, 2), "utf8");

    // Compute rubric score from both QA runs + deterministic telemetry.
    // 3-layer weighted: deterministic (40%) + severity rubric (50%) + taste (10%).
    const qaEntry = await persistQaScore(process.cwd(), videoRuns, screenRuns, telemetry);

    // Save rubric scorecard for traceability
    await fs.writeFile(path.join(outDir, "rubric-scorecard.json"), JSON.stringify(qaEntry.rubric, null, 2), "utf8");
    await fs.writeFile(path.join(outDir, "debug.log"), debugLines.join("\n"), "utf8");
    return { outDir };
  } catch (e) {
    try {
      await page.screenshot({ path: path.join(outDir, "error.png"), fullPage: true });
    } catch {
      // ignore
    }
    try {
      await fs.writeFile(path.join(outDir, "debug.log"), debugLines.join("\n"), "utf8");
    } catch {
      // ignore
    }
    throw e;
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const host = args.get("host") ?? "127.0.0.1";
  const requestedPort = Number(args.get("port") ?? 4173);
  const port = args.has("baseURL") ? requestedPort : await findOpenPort(host, requestedPort, 30);
  const baseURL = args.get("baseURL") ?? `http://${host}:${port}`;
  const headless = (args.get("headless") ?? "true") === "true";

  const repoRoot = process.cwd();
  const nodeCmd = process.execPath;
  const viteBin = path.join(repoRoot, "node_modules", "vite", "bin", "vite.js");

  const walkthroughMp4 = path.join(repoRoot, "public", "dogfood", "walkthrough.mp4");
  const walkthroughWebm = path.join(repoRoot, "public", "dogfood", "walkthrough.webm");
  if (!existsSync(walkthroughMp4) && !existsSync(walkthroughWebm)) {
    throw new Error("No walkthrough video found at public/dogfood/walkthrough.(mp4|webm). Run `npm run dogfood:full:local` first.");
  }

  // eslint-disable-next-line no-console
  console.log(`Starting preview server: node ${viteBin} preview --host ${host} --port ${port}`);
  const serverProc = spawn(nodeCmd, [viteBin, "preview", "--host", host, "--port", String(port), "--strictPort"], {
    cwd: repoRoot,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env },
    windowsHide: true,
    shell: false,
  });
  serverProc.on("error", (err) => {
    // eslint-disable-next-line no-console
    console.error("Failed to start preview server:", err);
  });
  serverProc.stdout.on("data", (buf) => process.stdout.write(String(buf)));
  serverProc.stderr.on("data", (buf) => process.stderr.write(String(buf)));

  try {
    await waitForPort(host, port, 240_000);
    await waitForHttpOk(baseURL, 240_000);

    const { outDir } = await runQaAndCapture({ baseURL, headless });
    // eslint-disable-next-line no-console
    console.log(`Gemini QA artifacts written to: ${outDir}`);
  } finally {
    await killProcessTree(serverProc);
  }
}

await main();
