#!/usr/bin/env npx tsx
/**
 * Gemini-Powered Behavioral Dogfood Audit
 *
 * Takes screenshots of each NodeBench surface and uses Gemini
 * for structural, dimensional, root-cause product behavior analysis
 * against 6 competitor-derived principles.
 *
 * Usage:
 *   npx tsx scripts/dogfood-behavioral-audit.ts [--surface home|chat|reports|nudges|me|all]
 *   npx tsx scripts/dogfood-behavioral-audit.ts --screenshots path/to/screenshots/
 *   npx tsx scripts/dogfood-behavioral-audit.ts image1.png image2.png
 *
 * Screenshots are grouped by surface using filename conventions:
 *   home-*.png, chat-*.png, reports-*.png, nudges-*.png, me-*.png
 *
 * Env: GEMINI_API_KEY (from .env.local or environment)
 */

import { GoogleGenAI, Type } from "@google/genai";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ─── Config ──────────────────────────────────────────────────────────────────

const __filename_esm = fileURLToPath(import.meta.url);
const __dirname_esm = path.dirname(__filename_esm);
const PROJECT_ROOT = path.resolve(__dirname_esm, "..");

const DEFAULT_SCREENSHOTS_DIR = path.resolve(PROJECT_ROOT, "docs/dogfood/screenshots");
const OUTPUT_DIR = path.resolve(PROJECT_ROOT, "docs/dogfood");

// Model fallback chain: prefer 2.5 Flash for vision, fall back to older Flash
const MODEL_CANDIDATES = [
  "gemini-3.1-pro-preview",
  "gemini-2.5-pro",
  "gemini-2.5-flash",
];

const GENERATE_TIMEOUT_MS = 300_000; // 5 min — multi-image prompts can be slow

const SURFACES = ["home", "chat", "reports", "nudges", "me"] as const;
type Surface = (typeof SURFACES)[number];

// ─── Types ───────────────────────────────────────────────────────────────────

interface DimensionScore {
  score: number;
  /** Full-text disclosure: what specific UI elements were observed */
  evidence: string;
  /** What competitor (Linear/ChatGPT/Perplexity/Notion/Vercel) does differently and how */
  competitorReference: string;
  /** The reasoning chain: evidence → principle violation → score justification */
  reasoning: string;
}

interface DominantJobDimension extends DimensionScore {
  violations: string[];
}

interface VisibleReasoningDimension extends DimensionScore {
  trustSignals: string[];
}

interface SpeedBehaviorDimension extends DimensionScore {
  latencyIssues: string[];
}

interface QualityDisciplineDimension extends DimensionScore {
  papercuts: string[];
}

interface ContextCompoundingDimension extends DimensionScore {
  compoundingSignals: string[];
}

interface ChromeCollapseDimension extends DimensionScore {
  excessChrome: string[];
}

interface ComponentAnalysis {
  name: string;
  role: "primary" | "supporting" | "decorative" | "competing";
  beforeInteraction: string;
  duringInteraction: string;
  afterInteraction: string;
  verdict: "keep" | "simplify" | "remove" | "elevate";
  reasoning: string;
}

interface InteractionBudgets {
  firstInputVisible: boolean;
  estimatedTimeToFirstAction: string;
  estimatedTimeToFirstValue: string;
  layoutStability: "stable" | "minor-shifts" | "major-shifts";
}

interface BehavioralAudit {
  surface: Surface;
  timestamp: string;
  model: string;
  screenshotCount: number;

  dimensions: {
    dominantJob: DominantJobDimension;
    visibleReasoning: VisibleReasoningDimension;
    speedBehavior: SpeedBehaviorDimension;
    qualityDiscipline: QualityDisciplineDimension;
    contextCompounding: ContextCompoundingDimension;
    chromeCollapse: ChromeCollapseDimension;
  };

  components: ComponentAnalysis[];

  interactionBudgets: InteractionBudgets;

  overallScore: number;
  competitorComparison: string;
  topIssues: string[];
  recommendations: string[];
}

// ─── Gemini Response Schema (Type builder) ───────────────────────────────────

function buildDimensionSchema(
  extraFields: Record<string, ReturnType<typeof Type.ARRAY>>,
) {
  return {
    type: Type.OBJECT,
    properties: {
      score: { type: Type.NUMBER },
      evidence: { type: Type.STRING },
      competitorReference: { type: Type.STRING },
      reasoning: { type: Type.STRING },
      ...extraFields,
    },
    required: ["score", "evidence", "competitorReference", "reasoning", ...Object.keys(extraFields)],
  };
}

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    dimensions: {
      type: Type.OBJECT,
      properties: {
        dominantJob: buildDimensionSchema({
          violations: { type: Type.ARRAY, items: { type: Type.STRING } },
        }),
        visibleReasoning: buildDimensionSchema({
          trustSignals: { type: Type.ARRAY, items: { type: Type.STRING } },
        }),
        speedBehavior: buildDimensionSchema({
          latencyIssues: { type: Type.ARRAY, items: { type: Type.STRING } },
        }),
        qualityDiscipline: buildDimensionSchema({
          papercuts: { type: Type.ARRAY, items: { type: Type.STRING } },
        }),
        contextCompounding: buildDimensionSchema({
          compoundingSignals: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        }),
        chromeCollapse: buildDimensionSchema({
          excessChrome: { type: Type.ARRAY, items: { type: Type.STRING } },
        }),
      },
      required: [
        "dominantJob",
        "visibleReasoning",
        "speedBehavior",
        "qualityDiscipline",
        "contextCompounding",
        "chromeCollapse",
      ],
    },

    components: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          role: { type: Type.STRING },
          beforeInteraction: { type: Type.STRING },
          duringInteraction: { type: Type.STRING },
          afterInteraction: { type: Type.STRING },
          verdict: { type: Type.STRING },
          reasoning: { type: Type.STRING },
        },
        required: [
          "name",
          "role",
          "beforeInteraction",
          "duringInteraction",
          "afterInteraction",
          "verdict",
          "reasoning",
        ],
      },
    },

    interactionBudgets: {
      type: Type.OBJECT,
      properties: {
        firstInputVisible: { type: Type.BOOLEAN },
        estimatedTimeToFirstAction: { type: Type.STRING },
        estimatedTimeToFirstValue: { type: Type.STRING },
        layoutStability: { type: Type.STRING },
      },
      required: [
        "firstInputVisible",
        "estimatedTimeToFirstAction",
        "estimatedTimeToFirstValue",
        "layoutStability",
      ],
    },

    overallScore: { type: Type.NUMBER },
    competitorComparison: { type: Type.STRING },
    topIssues: { type: Type.ARRAY, items: { type: Type.STRING } },
    recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: [
    "dimensions",
    "components",
    "interactionBudgets",
    "overallScore",
    "competitorComparison",
    "topIssues",
    "recommendations",
  ],
};

// ─── Analysis Prompt ─────────────────────────────────────────────────────────

function buildPrompt(surface: Surface, screenshotCount: number): string {
  return `You are a senior product designer who has studied how Linear, ChatGPT, Perplexity, Notion, and Vercel achieved premium product quality. You are analyzing ${screenshotCount} screenshot(s) of the "${surface}" surface of NodeBench AI, a decision intelligence platform for founders.

NodeBench has 5 surfaces: Home (landing/hero), Chat (AI search + conversation), Reports (intelligence memos), Nudges (proactive alerts), and Me (profile/settings/context). The screenshots show the "${surface}" surface.

Evaluate each screenshot against these 6 structural principles that made those products great:

1. ONE DOMINANT JOB PER SCREEN (dominantJob)
Notion consolidates, not sprawls. Linear keeps one clear action per view.
- Is there ONE clear primary action on each screen?
- Or are multiple jobs competing for attention?
- List every element that competes with the primary action as a "violation"

2. TRUST FROM VISIBLE REASONING (visibleReasoning)
Linear keeps AI reasoning transparent. Perplexity shows sources inline with synthesis. ChatGPT shows step-by-step thinking.
- Are trust signals visible and attached to content? (sources, confidence, evidence, stages)
- Or does the user have to "just trust" the output?
- List every visible trust signal

3. SPEED AS PRODUCT BEHAVIOR (speedBehavior)
Linear targets sub-200ms interactions. Vercel optimizes the hot path. ChatGPT streams tokens progressively.
- Does the layout feel stable? Or would content pop in causing layout shifts?
- Are there progressive reveals (streaming, skeleton loading)?
- Or does everything appear at once after a loading spinner?
- List any visible latency issues or anti-patterns

4. QUALITY AS A SYSTEM (qualityDiscipline)
Linear's "Quality Wednesdays." Zero-bugs policy. Consistent design tokens across every surface.
- Is spacing consistent? Are typography tokens uniform?
- Are hover/focus states present on interactive elements?
- Are there visible "papercuts" (misaligned text, inconsistent padding, broken borders)?
- List every papercut you can identify

5. CONTEXT COMPOUNDING (contextCompounding)
Notion AI fits into blocks users already created. ChatGPT memory improves later sessions. Linear learns from issue patterns.
- Does the product visibly get better with use?
- Are there signals of personalization, learning, or accumulated context?
- Or is every session a blank slate?
- List every visible compounding signal

6. CHROME COLLAPSE (chromeCollapse)
Fewer bordered boxes. Hierarchy from spacing and typography weight, not outlines. One primary action per screen. ChatGPT is just a text box. Linear uses whitespace as structure.
- Is chrome (borders, boxes, outlines, separators) minimal or excessive?
- Is hierarchy achieved through spacing and type, or through visual containers?
- List every instance of excess chrome (unnecessary borders, boxes, dividers)

SCORING PROTOCOL — FULL TEXT DISCLOSURE REQUIRED:

For each dimension, you MUST provide ALL THREE fields before scoring:

1. "evidence" field (REQUIRED, will be validated) — Write 2-4 sentences listing every specific UI element you observed that relates to this principle. Name exact components by their visible label or position: "the search input labeled 'Search a company...' at top center", "the 4 cards labeled PENDING in the answer grid", "the bordered sidebar with header CONTEXT containing 3 pills". You MUST fill this field with concrete observations. Do NOT leave it empty or repeat the reasoning here.

2. "competitorReference" field (REQUIRED, will be validated) — Write 1-2 sentences naming ONE specific competitor surface and what they do differently. Example: "ChatGPT's main chat view shows only a text input at bottom center with zero bordered containers above it, establishing hierarchy purely through whitespace." You MUST fill this field. Do NOT leave it empty.

3. "reasoning" field — Connect evidence to principle to score. Format: "Because [specific elements from evidence field], which violates [principle aspect] — compared to [what competitor does from competitorReference field] — this scores [N]/10." The score MUST follow from the reasoning chain, not precede it. Do NOT repeat the evidence or competitor reference here — refer to them.

Score 0-10 where:
- 0-3: Major structural violations with specific evidence cited
- 4-6: Partial adherence with specific gaps identified
- 7-8: Good adherence with minor issues named
- 9-10: Best-in-class with specific competitive parity evidence

ARBITRARY SCORES WITHOUT FULL EVIDENCE CHAINS ARE NOT ACCEPTABLE. Every score must be traceable to named UI elements and a specific competitor comparison.

COMPONENT ANALYSIS: For each visible UI component (search input, answer card, nav item, button, card, header, etc.):
- What is its role? (primary = the main action, supporting = helps the primary, decorative = visual only, competing = fights with primary for attention)
- Describe what it looks like before interaction, during interaction (loading/streaming), and after interaction (result state)
- Verdict: keep (essential), simplify (too complex), remove (unnecessary), elevate (should be more prominent)

INTERACTION BUDGETS:
- Is the main input/action visible above the fold (assume 812px viewport height)?
- How long before a user can take their first meaningful action? (estimate in seconds)
- How long before they get first value/result? (estimate in seconds)
- Is the layout stable, or would it shift during loading?

OVERALL SCORE: Weight the 6 dimensions equally. Convert to 0-100 scale.
Formula: (sum of 6 dimension scores / 60) * 100, rounded to nearest integer.

COMPETITOR COMPARISON: In 2-3 sentences, compare this surface to the equivalent surface in Linear, ChatGPT, Perplexity, or Notion. Be specific about what those products do better AND what NodeBench does well.

TOP ISSUES: List the 5 most impactful issues, ranked by severity. Be specific (reference exact UI elements).

RECOMMENDATIONS: List the 5 highest-ROI fixes, ranked by effort/impact ratio. Each should be actionable (not "improve quality" but "remove the secondary CTA from the hero section to reduce competing actions").

Respond with STRICT JSON matching the schema.`;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getApiKey(): string {
  // Try .env.local first
  const envLocalPath = path.resolve(PROJECT_ROOT, ".env.local");
  if (fs.existsSync(envLocalPath)) {
    const envContent = fs.readFileSync(envLocalPath, "utf-8");
    const match = envContent.match(
      /^GEMINI_API_KEY=(.+)$/m,
    );
    if (match) {
      const key = match[1].trim();
      if (key) return key;
    }
  }

  // Fall back to environment variables
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!key) {
    console.error(
      "ERROR: GEMINI_API_KEY not found in .env.local or environment.",
    );
    console.error("Set it via .env.local or: export GEMINI_API_KEY=your-key");
    process.exit(1);
  }
  return key;
}

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () =>
          reject(
            new Error(`${label} timed out after ${Math.round(ms / 1000)}s`),
          ),
        ms,
      ),
    ),
  ]);
}

function looksLikeModelNotFound(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /not found|model.*not|404|does not exist/i.test(msg);
}

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeMap: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".bmp": "image/bmp",
  };
  return mimeMap[ext] || "image/png";
}

function classifySurface(filename: string): Surface | null {
  const lower = filename.toLowerCase();
  for (const surface of SURFACES) {
    if (lower.startsWith(surface) || lower.includes(`-${surface}-`) || lower.includes(`_${surface}_`) || lower.includes(`/${surface}`)) {
      return surface;
    }
  }
  // Fallback: check for surface aliases
  if (lower.includes("landing") || lower.includes("hero")) return "home";
  if (lower.includes("ask") || lower.includes("search") || lower.includes("conversation")) return "chat";
  if (lower.includes("memo") || lower.includes("report") || lower.includes("brief")) return "reports";
  if (lower.includes("nudge") || lower.includes("alert") || lower.includes("notification")) return "nudges";
  if (lower.includes("profile") || lower.includes("settings") || lower.includes("context")) return "me";
  return null;
}

function discoverScreenshots(dir: string): Map<Surface, string[]> {
  const grouped = new Map<Surface, string[]>();
  for (const s of SURFACES) grouped.set(s, []);

  if (!fs.existsSync(dir)) return grouped;

  const files = fs.readdirSync(dir).filter((f) => {
    const ext = path.extname(f).toLowerCase();
    return [".png", ".jpg", ".jpeg", ".webp"].includes(ext);
  });

  for (const file of files) {
    const surface = classifySurface(file);
    if (surface) {
      grouped.get(surface)!.push(path.join(dir, file));
    } else {
      // Unclassified screenshots go to "home" as default
      grouped.get("home")!.push(path.join(dir, file));
    }
  }

  return grouped;
}

// ─── Formatting ──────────────────────────────────────────────────────────────

function printScoreBar(label: string, score: number, max: number = 10): void {
  const barLen = 20;
  const filled = Math.round((score / max) * barLen);
  const bar = "\u2588".repeat(filled) + "\u2591".repeat(barLen - filled);
  const color =
    score / max >= 0.7
      ? "\x1b[32m"
      : score / max >= 0.4
        ? "\x1b[33m"
        : "\x1b[31m";
  console.log(
    `  ${label.padEnd(26)} ${color}${bar}\x1b[0m ${score}/${max}`,
  );
}

function printDimensionDisclosure(label: string, dim: DimensionScore & Record<string, unknown>): void {
  printScoreBar(label, dim.score);
  // Full-text reasoning (primary disclosure — Gemini puts most detail here)
  console.log(`    ${dim.reasoning}`);
  // Supplementary structured fields (violations, trustSignals, papercuts, etc.)
  for (const [key, val] of Object.entries(dim)) {
    if (Array.isArray(val) && val.length > 0) {
      console.log(`    ${key}: ${val.join(" | ")}`);
    }
  }
  // Show evidence and competitor if Gemini populated them separately
  if (dim.evidence && dim.evidence !== dim.reasoning) {
    console.log(`    [evidence] ${dim.evidence}`);
  }
  if (dim.competitorReference && dim.competitorReference !== dim.reasoning) {
    console.log(`    [vs] ${dim.competitorReference}`);
  }
  console.log("");
}

function printDimensionSummary(audit: BehavioralAudit): void {
  const d = audit.dimensions;
  console.log(`\n  Surface: ${audit.surface.toUpperCase()}`);
  console.log("  " + "=".repeat(80));
  printDimensionDisclosure("Dominant Job", d.dominantJob as DimensionScore & Record<string, unknown>);
  printDimensionDisclosure("Visible Reasoning", d.visibleReasoning as DimensionScore & Record<string, unknown>);
  printDimensionDisclosure("Speed Behavior", d.speedBehavior as DimensionScore & Record<string, unknown>);
  printDimensionDisclosure("Quality Discipline", d.qualityDiscipline as DimensionScore & Record<string, unknown>);
  printDimensionDisclosure("Context Compounding", d.contextCompounding as DimensionScore & Record<string, unknown>);
  printDimensionDisclosure("Chrome Collapse", d.chromeCollapse as DimensionScore & Record<string, unknown>);
  console.log("  " + "=".repeat(80));
  printScoreBar("OVERALL", audit.overallScore, 100);
}

function printTopIssues(audit: BehavioralAudit): void {
  if (audit.topIssues.length === 0) return;
  console.log(`\n  Top Issues:`);
  for (let i = 0; i < audit.topIssues.length; i++) {
    console.log(`    ${i + 1}. ${audit.topIssues[i]}`);
  }
}

function printRecommendations(audit: BehavioralAudit): void {
  if (audit.recommendations.length === 0) return;
  console.log(`\n  Recommendations:`);
  for (let i = 0; i < audit.recommendations.length; i++) {
    console.log(`    ${i + 1}. ${audit.recommendations[i]}`);
  }
}

function printComponentTable(audit: BehavioralAudit): void {
  if (audit.components.length === 0) return;
  console.log(`\n  Component Analysis (${audit.components.length} components):`);
  console.log("  " + "-".repeat(70));
  for (const c of audit.components) {
    const roleColor =
      c.role === "primary"
        ? "\x1b[32m"
        : c.role === "competing"
          ? "\x1b[31m"
          : c.role === "decorative"
            ? "\x1b[33m"
            : "\x1b[36m";
    const verdictColor =
      c.verdict === "remove"
        ? "\x1b[31m"
        : c.verdict === "simplify"
          ? "\x1b[33m"
          : c.verdict === "elevate"
            ? "\x1b[36m"
            : "\x1b[32m";
    console.log(
      `  ${c.name.padEnd(30)} ${roleColor}${c.role.padEnd(12)}\x1b[0m ${verdictColor}${c.verdict}\x1b[0m`,
    );
  }
}

// ─── Core: Analyze a single surface ──────────────────────────────────────────

async function analyzeSurface(
  ai: GoogleGenAI,
  surface: Surface,
  screenshotPaths: string[],
): Promise<BehavioralAudit> {
  console.log(
    `\n  Analyzing "${surface}" surface (${screenshotPaths.length} screenshots)...`,
  );

  // Build multi-image parts: inline base64 data (no upload needed for images)
  const imageParts: Array<{ inlineData: { mimeType: string; data: string } }> =
    [];
  for (const imgPath of screenshotPaths) {
    const buffer = fs.readFileSync(imgPath);
    const base64 = buffer.toString("base64");
    const mimeType = getMimeType(imgPath);
    imageParts.push({
      inlineData: { mimeType, data: base64 },
    });
    console.log(
      `    Added: ${path.basename(imgPath)} (${(buffer.length / 1024).toFixed(0)} KB)`,
    );
  }

  const prompt = buildPrompt(surface, screenshotPaths.length);

  // Model fallback chain
  let rawText = "";
  let usedModel = "unknown";

  for (const candidate of MODEL_CANDIDATES) {
    console.log(`    Trying model: ${candidate}...`);
    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model: candidate,
          contents: [
            {
              role: "user",
              parts: [...imageParts, { text: prompt }],
            },
          ],
          config: {
            responseMimeType: "application/json",
            responseSchema: responseSchema as any,
            maxOutputTokens: 16384,
            temperature: 0.15,
          },
        }),
        GENERATE_TIMEOUT_MS,
        `Gemini generateContent (${candidate})`,
      );

      rawText = (response?.text ?? "").toString();
      if (rawText.length > 10) {
        usedModel = candidate;
        console.log(
          `    Model ${candidate} responded (${rawText.length} chars)`,
        );
        break;
      }
    } catch (e) {
      if (looksLikeModelNotFound(e)) {
        console.log(`    Model ${candidate} not available, trying next...`);
        continue;
      }
      throw e;
    }
  }

  if (!rawText || rawText.length <= 10) {
    throw new Error(
      `No Gemini model succeeded for surface "${surface}". Tried: ${MODEL_CANDIDATES.join(", ")}`,
    );
  }

  // Parse JSON (with repair for truncated responses)
  let parsed: any;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    // Attempt repair: balance quotes, braces, brackets
    let text = rawText.trim();
    const quotes = (text.match(/"/g) || []).length;
    if (quotes % 2 !== 0) text += '"';
    let braces = 0,
      brackets = 0;
    for (const ch of text) {
      if (ch === "{") braces++;
      else if (ch === "}") braces--;
      else if (ch === "[") brackets++;
      else if (ch === "]") brackets--;
    }
    while (brackets > 0) {
      text += "]";
      brackets--;
    }
    while (braces > 0) {
      text += "}";
      braces--;
    }
    parsed = JSON.parse(text);
  }

  if (Array.isArray(parsed)) parsed = parsed[0];

  // Assemble typed result
  const dims = parsed.dimensions ?? {};
  const clampScore = (v: unknown): number =>
    Math.max(0, Math.min(10, Math.round(Number(v) || 0)));
  const clampOverall = (v: unknown): number =>
    Math.max(0, Math.min(100, Math.round(Number(v) || 0)));

  const result: BehavioralAudit = {
    surface,
    timestamp: new Date().toISOString(),
    model: usedModel,
    screenshotCount: screenshotPaths.length,

    dimensions: {
      dominantJob: {
        score: clampScore(dims.dominantJob?.score),
        reasoning: String(dims.dominantJob?.reasoning ?? ""),
        violations: (dims.dominantJob?.violations ?? []).slice(0, 10),
      },
      visibleReasoning: {
        score: clampScore(dims.visibleReasoning?.score),
        reasoning: String(dims.visibleReasoning?.reasoning ?? ""),
        trustSignals: (dims.visibleReasoning?.trustSignals ?? []).slice(0, 10),
      },
      speedBehavior: {
        score: clampScore(dims.speedBehavior?.score),
        reasoning: String(dims.speedBehavior?.reasoning ?? ""),
        latencyIssues: (dims.speedBehavior?.latencyIssues ?? []).slice(0, 10),
      },
      qualityDiscipline: {
        score: clampScore(dims.qualityDiscipline?.score),
        reasoning: String(dims.qualityDiscipline?.reasoning ?? ""),
        papercuts: (dims.qualityDiscipline?.papercuts ?? []).slice(0, 10),
      },
      contextCompounding: {
        score: clampScore(dims.contextCompounding?.score),
        reasoning: String(dims.contextCompounding?.reasoning ?? ""),
        compoundingSignals: (
          dims.contextCompounding?.compoundingSignals ?? []
        ).slice(0, 10),
      },
      chromeCollapse: {
        score: clampScore(dims.chromeCollapse?.score),
        reasoning: String(dims.chromeCollapse?.reasoning ?? ""),
        excessChrome: (dims.chromeCollapse?.excessChrome ?? []).slice(0, 10),
      },
    },

    components: (parsed.components ?? []).slice(0, 30).map((c: any) => ({
      name: String(c.name ?? "unknown"),
      role: (["primary", "supporting", "decorative", "competing"].includes(
        c.role,
      )
        ? c.role
        : "supporting") as ComponentAnalysis["role"],
      beforeInteraction: String(c.beforeInteraction ?? ""),
      duringInteraction: String(c.duringInteraction ?? ""),
      afterInteraction: String(c.afterInteraction ?? ""),
      verdict: (["keep", "simplify", "remove", "elevate"].includes(c.verdict)
        ? c.verdict
        : "keep") as ComponentAnalysis["verdict"],
      reasoning: String(c.reasoning ?? ""),
    })),

    interactionBudgets: {
      firstInputVisible: Boolean(
        parsed.interactionBudgets?.firstInputVisible ?? false,
      ),
      estimatedTimeToFirstAction: String(
        parsed.interactionBudgets?.estimatedTimeToFirstAction ?? "unknown",
      ),
      estimatedTimeToFirstValue: String(
        parsed.interactionBudgets?.estimatedTimeToFirstValue ?? "unknown",
      ),
      layoutStability: (
        ["stable", "minor-shifts", "major-shifts"].includes(
          parsed.interactionBudgets?.layoutStability,
        )
          ? parsed.interactionBudgets.layoutStability
          : "stable"
      ) as InteractionBudgets["layoutStability"],
    },

    overallScore: clampOverall(parsed.overallScore),
    competitorComparison: String(parsed.competitorComparison ?? ""),
    topIssues: (parsed.topIssues ?? []).slice(0, 5).map(String),
    recommendations: (parsed.recommendations ?? []).slice(0, 5).map(String),
  };

  return result;
}

// ─── CLI Argument Parsing ────────────────────────────────────────────────────

interface CliArgs {
  surfaces: Surface[];
  screenshotsDir: string;
  explicitFiles: string[];
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  let surfaces: Surface[] = [...SURFACES];
  let screenshotsDir = DEFAULT_SCREENSHOTS_DIR;
  const explicitFiles: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--surface" && i + 1 < args.length) {
      const val = args[++i].toLowerCase();
      if (val === "all") {
        surfaces = [...SURFACES];
      } else if (SURFACES.includes(val as Surface)) {
        surfaces = [val as Surface];
      } else {
        console.error(`Unknown surface: ${val}. Valid: ${SURFACES.join(", ")}, all`);
        process.exit(1);
      }
    } else if (arg === "--screenshots" && i + 1 < args.length) {
      screenshotsDir = path.resolve(args[++i]);
    } else if (arg === "--help" || arg === "-h") {
      console.log(`
Usage:
  npx tsx scripts/dogfood-behavioral-audit.ts [options] [image files...]

Options:
  --surface <name>      Analyze specific surface (home|chat|reports|nudges|me|all)
  --screenshots <dir>   Directory containing screenshots (default: docs/dogfood/screenshots/)
  --help, -h            Show this help

Screenshots are classified by filename:
  home-hero.png         -> home surface
  chat-search.png       -> chat surface
  reports-memo.png      -> reports surface
  nudges-alerts.png     -> nudges surface
  me-profile.png        -> me surface

Or pass image files directly:
  npx tsx scripts/dogfood-behavioral-audit.ts home-1.png home-2.png chat-1.png
`);
      process.exit(0);
    } else if (fs.existsSync(arg)) {
      explicitFiles.push(path.resolve(arg));
    } else {
      console.error(`Unknown argument or file not found: ${arg}`);
      process.exit(1);
    }
  }

  return { surfaces, screenshotsDir, explicitFiles };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("=".repeat(60));
  console.log("  NODEBENCH BEHAVIORAL DOGFOOD AUDIT");
  console.log("  Powered by Gemini multimodal analysis");
  console.log("  6 structural dimensions from competitor research");
  console.log("=".repeat(60));

  const { surfaces, screenshotsDir, explicitFiles } = parseArgs();

  // Discover or group screenshots
  let surfaceScreenshots: Map<Surface, string[]>;

  if (explicitFiles.length > 0) {
    // Group explicit files by surface
    surfaceScreenshots = new Map<Surface, string[]>();
    for (const s of SURFACES) surfaceScreenshots.set(s, []);
    for (const file of explicitFiles) {
      const surface = classifySurface(path.basename(file));
      const target = surface ?? "home";
      surfaceScreenshots.get(target)!.push(file);
    }
  } else {
    surfaceScreenshots = discoverScreenshots(screenshotsDir);
  }

  // Filter to requested surfaces that have screenshots
  const activeSurfaces: Array<{ surface: Surface; files: string[] }> = [];
  for (const surface of surfaces) {
    const files = surfaceScreenshots.get(surface) ?? [];
    if (files.length > 0) {
      activeSurfaces.push({ surface, files });
    }
  }

  if (activeSurfaces.length === 0) {
    console.error(`\n  No screenshots found.`);
    console.error(`  Place screenshots in: ${screenshotsDir}`);
    console.error(`  Name them with surface prefix: home-*.png, chat-*.png, etc.`);
    console.error(`  Or pass files directly: npx tsx scripts/dogfood-behavioral-audit.ts image1.png image2.png`);
    process.exit(1);
  }

  const totalScreenshots = activeSurfaces.reduce(
    (sum, s) => sum + s.files.length,
    0,
  );
  console.log(
    `\n  Found ${totalScreenshots} screenshots across ${activeSurfaces.length} surface(s)`,
  );
  for (const { surface, files } of activeSurfaces) {
    console.log(`    ${surface}: ${files.length} screenshot(s)`);
  }

  // Initialize Gemini
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  console.log(`\n  Gemini initialized. Model candidates: ${MODEL_CANDIDATES.join(", ")}`);

  // Analyze each surface
  const results: BehavioralAudit[] = [];

  for (const { surface, files } of activeSurfaces) {
    try {
      const audit = await analyzeSurface(ai, surface, files);
      results.push(audit);

      // Print summary immediately after each surface
      printDimensionSummary(audit);
      printTopIssues(audit);
      printRecommendations(audit);
      printComponentTable(audit);
    } catch (err) {
      console.error(
        `\n  ERROR analyzing "${surface}": ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  if (results.length === 0) {
    console.error("\n  All surface analyses failed.");
    process.exit(1);
  }

  // Cross-surface summary
  if (results.length > 1) {
    console.log("\n" + "=".repeat(60));
    console.log("  CROSS-SURFACE SUMMARY");
    console.log("=".repeat(60));

    const avgScore =
      Math.round(
        results.reduce((s, r) => s + r.overallScore, 0) / results.length,
      );
    printScoreBar("Average Overall", avgScore, 100);

    // Per-dimension averages
    const dimNames = [
      "dominantJob",
      "visibleReasoning",
      "speedBehavior",
      "qualityDiscipline",
      "contextCompounding",
      "chromeCollapse",
    ] as const;
    const dimLabels: Record<string, string> = {
      dominantJob: "Dominant Job",
      visibleReasoning: "Visible Reasoning",
      speedBehavior: "Speed Behavior",
      qualityDiscipline: "Quality Discipline",
      contextCompounding: "Context Compounding",
      chromeCollapse: "Chrome Collapse",
    };

    console.log("\n  Dimension Averages:");
    console.log("  " + "-".repeat(56));
    for (const dim of dimNames) {
      const avg =
        Math.round(
          (results.reduce((s, r) => s + r.dimensions[dim].score, 0) /
            results.length) *
            10,
        ) / 10;
      printScoreBar(dimLabels[dim], avg);
    }

    // Aggregate top issues across surfaces
    console.log("\n  All Issues (across surfaces):");
    for (const r of results) {
      if (r.topIssues.length > 0) {
        console.log(`    [${r.surface}]`);
        for (const issue of r.topIssues) {
          console.log(`      - ${issue}`);
        }
      }
    }
  }

  // Save results
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  for (const result of results) {
    const outputPath = path.resolve(
      OUTPUT_DIR,
      `behavioral-audit-${result.surface}-${timestamp}.json`,
    );
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2) + "\n");
    console.log(
      `\n  Saved: ${path.relative(PROJECT_ROOT, outputPath)}`,
    );
  }

  // Save combined summary
  if (results.length > 1) {
    const summaryPath = path.resolve(
      OUTPUT_DIR,
      `behavioral-audit-all-${timestamp}.json`,
    );
    const summary = {
      timestamp: new Date().toISOString(),
      surfaceCount: results.length,
      averageScore: Math.round(
        results.reduce((s, r) => s + r.overallScore, 0) / results.length,
      ),
      surfaces: results.map((r) => ({
        surface: r.surface,
        overallScore: r.overallScore,
        model: r.model,
        screenshotCount: r.screenshotCount,
        dimensionScores: {
          dominantJob: r.dimensions.dominantJob.score,
          visibleReasoning: r.dimensions.visibleReasoning.score,
          speedBehavior: r.dimensions.speedBehavior.score,
          qualityDiscipline: r.dimensions.qualityDiscipline.score,
          contextCompounding: r.dimensions.contextCompounding.score,
          chromeCollapse: r.dimensions.chromeCollapse.score,
        },
        dimensionDisclosure: {
          dominantJob: { evidence: r.dimensions.dominantJob.evidence, competitorReference: r.dimensions.dominantJob.competitorReference, reasoning: r.dimensions.dominantJob.reasoning, violations: r.dimensions.dominantJob.violations },
          visibleReasoning: { evidence: r.dimensions.visibleReasoning.evidence, competitorReference: r.dimensions.visibleReasoning.competitorReference, reasoning: r.dimensions.visibleReasoning.reasoning, trustSignals: r.dimensions.visibleReasoning.trustSignals },
          speedBehavior: { evidence: r.dimensions.speedBehavior.evidence, competitorReference: r.dimensions.speedBehavior.competitorReference, reasoning: r.dimensions.speedBehavior.reasoning, latencyIssues: r.dimensions.speedBehavior.latencyIssues },
          qualityDiscipline: { evidence: r.dimensions.qualityDiscipline.evidence, competitorReference: r.dimensions.qualityDiscipline.competitorReference, reasoning: r.dimensions.qualityDiscipline.reasoning, papercuts: r.dimensions.qualityDiscipline.papercuts },
          contextCompounding: { evidence: r.dimensions.contextCompounding.evidence, competitorReference: r.dimensions.contextCompounding.competitorReference, reasoning: r.dimensions.contextCompounding.reasoning, compoundingSignals: r.dimensions.contextCompounding.compoundingSignals },
          chromeCollapse: { evidence: r.dimensions.chromeCollapse.evidence, competitorReference: r.dimensions.chromeCollapse.competitorReference, reasoning: r.dimensions.chromeCollapse.reasoning, excessChrome: r.dimensions.chromeCollapse.excessChrome },
        },
        topIssues: r.topIssues,
        recommendations: r.recommendations,
      })),
    };
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2) + "\n");
    console.log(
      `  Saved: ${path.relative(PROJECT_ROOT, summaryPath)}`,
    );
  }

  // Final verdict
  const avgOverall =
    Math.round(
      results.reduce((s, r) => s + r.overallScore, 0) / results.length,
    );
  const grade =
    avgOverall >= 90
      ? "S"
      : avgOverall >= 75
        ? "A"
        : avgOverall >= 60
          ? "B"
          : avgOverall >= 45
            ? "C"
            : avgOverall >= 30
              ? "D"
              : "F";
  const gradeColor =
    avgOverall >= 75
      ? "\x1b[32m"
      : avgOverall >= 45
        ? "\x1b[33m"
        : "\x1b[31m";

  console.log("\n" + "=".repeat(60));
  console.log(
    `  VERDICT: ${gradeColor}Grade ${grade} (${avgOverall}/100)\x1b[0m`,
  );
  console.log("=".repeat(60));

  process.exit(avgOverall >= 60 ? 0 : 1);
}

main().catch((err) => {
  console.error(
    "\nFATAL:",
    err instanceof Error ? err.message : String(err),
  );
  if (err instanceof Error && err.stack) {
    console.error(err.stack);
  }
  process.exit(2);
});
