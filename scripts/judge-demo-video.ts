#!/usr/bin/env npx tsx
/**
 * Gemini-Powered Demo Video Judge
 *
 * Evaluates NodeBench demo videos on two axes:
 *   1. Video Production Quality (8 boolean metrics)
 *   2. Demo Effectiveness for Viral Adoption (12 boolean metrics)
 *
 * Usage:
 *   npx tsx scripts/judge-demo-video.ts [path-to-video]
 *
 * Defaults to docs/demo-video/nodebench-demo.mp4
 * Requires GEMINI_API_KEY in environment or Convex env.
 */

import { GoogleGenAI, createPartFromUri, Type } from "@google/genai";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

// ─── Config ──────────────────────────────────────────────────────────────────

const __filename_esm = fileURLToPath(import.meta.url);
const __dirname_esm = path.dirname(__filename_esm);

const DEFAULT_VIDEO_PATH = path.resolve(__dirname_esm, "../docs/demo-video/nodebench-demo.mp4");
const OUTPUT_PATH = path.resolve(__dirname_esm, "../docs/demo-video/judge-results.json");

// Model fallback chain: prefer Flash for speed + cost, fall back to older Flash
const MODEL_CANDIDATES = [
  "gemini-2.5-flash-preview-05-20",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
];

const UPLOAD_TIMEOUT_MS = 180_000;
const GENERATE_TIMEOUT_MS = 300_000;
const POLL_INTERVAL_MS = 2_000;
const MAX_POLL_ATTEMPTS = 90;

// ─── Types ───────────────────────────────────────────────────────────────────

interface ProductionQuality {
  smoothTransitions: boolean;
  audioVideoSync: boolean;
  paceFeelsNatural: boolean;
  visualClarity: boolean;
  audioClarity: boolean;
  noDeadAir: boolean;
  consistentBranding: boolean;
  professionalGrade: boolean;
}

interface DemoEffectiveness {
  hookIn5Seconds: boolean;
  problemClear: boolean;
  valueImmediate: boolean;
  showDontTell: boolean;
  realNotCanned: boolean;
  actionableCTA: boolean;
  memorableHook: boolean;
  shareWorthy: boolean;
  solvesPainPoint: boolean;
  betterThanAlternatives: boolean;
  trustBuilding: boolean;
  mobileReady: boolean;
}

interface JudgeResult {
  timestamp: string;
  videoPath: string;
  videoSizeMB: number;
  model: string;
  production: ProductionQuality;
  effectiveness: DemoEffectiveness;
  productionScore: number;
  effectivenessScore: number;
  viralPotentialScore: number;
  overallVerdict: "PASS" | "NEEDS_WORK" | "FAIL";
  topIssues: string[];
  recommendations: string[];
  reasoning: {
    productionNotes: string;
    effectivenessNotes: string;
    viralNotes: string;
  };
}

// ─── Gemini Response Schema ──────────────────────────────────────────────────

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    production: {
      type: Type.OBJECT,
      properties: {
        smoothTransitions: { type: Type.BOOLEAN },
        audioVideoSync: { type: Type.BOOLEAN },
        paceFeelsNatural: { type: Type.BOOLEAN },
        visualClarity: { type: Type.BOOLEAN },
        audioClarity: { type: Type.BOOLEAN },
        noDeadAir: { type: Type.BOOLEAN },
        consistentBranding: { type: Type.BOOLEAN },
        professionalGrade: { type: Type.BOOLEAN },
      },
      required: [
        "smoothTransitions", "audioVideoSync", "paceFeelsNatural",
        "visualClarity", "audioClarity", "noDeadAir",
        "consistentBranding", "professionalGrade",
      ],
    },
    effectiveness: {
      type: Type.OBJECT,
      properties: {
        hookIn5Seconds: { type: Type.BOOLEAN },
        problemClear: { type: Type.BOOLEAN },
        valueImmediate: { type: Type.BOOLEAN },
        showDontTell: { type: Type.BOOLEAN },
        realNotCanned: { type: Type.BOOLEAN },
        actionableCTA: { type: Type.BOOLEAN },
        memorableHook: { type: Type.BOOLEAN },
        shareWorthy: { type: Type.BOOLEAN },
        solvesPainPoint: { type: Type.BOOLEAN },
        betterThanAlternatives: { type: Type.BOOLEAN },
        trustBuilding: { type: Type.BOOLEAN },
        mobileReady: { type: Type.BOOLEAN },
      },
      required: [
        "hookIn5Seconds", "problemClear", "valueImmediate", "showDontTell",
        "realNotCanned", "actionableCTA", "memorableHook", "shareWorthy",
        "solvesPainPoint", "betterThanAlternatives", "trustBuilding", "mobileReady",
      ],
    },
    productionScore: { type: Type.NUMBER },
    effectivenessScore: { type: Type.NUMBER },
    viralPotentialScore: { type: Type.NUMBER },
    overallVerdict: { type: Type.STRING },
    topIssues: { type: Type.ARRAY, items: { type: Type.STRING } },
    recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
    reasoning: {
      type: Type.OBJECT,
      properties: {
        productionNotes: { type: Type.STRING },
        effectivenessNotes: { type: Type.STRING },
        viralNotes: { type: Type.STRING },
      },
      required: ["productionNotes", "effectivenessNotes", "viralNotes"],
    },
  },
  required: [
    "production", "effectiveness", "productionScore", "effectivenessScore",
    "viralPotentialScore", "overallVerdict", "topIssues", "recommendations", "reasoning",
  ],
} as const;

// ─── Prompt ──────────────────────────────────────────────────────────────────

const JUDGE_PROMPT = `You are an expert video judge evaluating a product demo video for a developer tool called NodeBench — a decision intelligence platform with 304 MCP tools. Your job is to score this video on two axes: production quality and demo effectiveness for viral adoption.

Watch the entire video carefully. Then evaluate each boolean metric honestly. A metric is TRUE only if it clearly passes — when in doubt, mark FALSE.

## Branch 1: Video Production Quality

Evaluate each boolean:
- smoothTransitions: Are transitions between scenes smooth, not jarring? (cuts, fades, zooms)
- audioVideoSync: Does narration/audio match what is shown on screen at each moment?
- paceFeelsNatural: Is the pacing neither too fast to follow nor too slow and boring?
- visualClarity: Are all UI elements, text, and code clearly readable at 1080p?
- audioClarity: Is the voiceover/audio clear, professional-sounding, not robotic or muffled?
- noDeadAir: No awkward silences or gaps longer than 2 seconds?
- consistentBranding: Same color palette, fonts, design language maintained throughout?
- professionalGrade: Would this video fit on a Y Combinator Demo Day stage?

## Branch 2: Demo Effectiveness for Viral Adoption

Evaluate each boolean:
- hookIn5Seconds: Does the first 5 seconds grab attention and make you want to keep watching?
- problemClear: Is the problem being solved obvious within the first 15 seconds?
- valueImmediate: Do you see real value (not just feature listing) within 30 seconds?
- showDontTell: Does the demo SHOW the product working live, not just describe features?
- realNotCanned: Does the demo feel like a real use case, not an obviously scripted toy example?
- actionableCTA: Is there a clear "try it now" or next-step moment?
- memorableHook: Would you remember this demo 24 hours later? Is there a standout moment?
- shareWorthy: Would you share this video with a colleague unprompted?
- solvesPainPoint: Does it address a real pain that founders/developers actually have?
- betterThanAlternatives: Does it look clearly better than existing tools (ChatGPT, Perplexity, manual research)?
- trustBuilding: Does it build trust through evidence, sources, transparency, or real data?
- mobileReady: Does it show or strongly imply the product works on mobile/phone?

## Scoring Rules

- productionScore (0-100): Weighted average of production booleans. Each TRUE = ~12.5 points, but professionalGrade and visualClarity are worth 1.5x.
- effectivenessScore (0-100): Weighted average of effectiveness booleans. hookIn5Seconds, showDontTell, and shareWorthy are worth 1.5x. mobileReady is worth 0.5x.
- viralPotentialScore (0-100): Your holistic assessment of whether this video would spread organically. Consider: Would someone screenshot this? Would it get engagement on Twitter/LinkedIn? Does it have a "holy shit" moment?
- overallVerdict:
  - "PASS" = productionScore >= 70 AND effectivenessScore >= 70 AND viralPotentialScore >= 60
  - "NEEDS_WORK" = any score between 40-69
  - "FAIL" = any score below 40
- topIssues: Up to 5 issues ranked by impact on viral adoption potential
- recommendations: Up to 5 specific, actionable fixes (not generic advice)

## Reasoning

Provide brief notes explaining your scores:
- productionNotes: What works and what does not in the production quality
- effectivenessNotes: What works and what does not in demo effectiveness
- viralNotes: Why you gave that viral potential score — what is the "holy shit" moment (or lack thereof)?

Respond with STRICT JSON matching the schema.`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!key) {
    console.error("ERROR: GEMINI_API_KEY or GOOGLE_AI_API_KEY not found in environment.");
    console.error("Set it via: export GEMINI_API_KEY=your-key");
    process.exit(1);
  }
  return key;
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`)), ms),
    ),
  ]);
}

async function waitForFileActive(
  ai: GoogleGenAI,
  name: string,
): Promise<{ uri: string; mimeType: string }> {
  let fileInfo = await ai.files.get({ name });
  let attempts = 0;
  while (String((fileInfo as any).state) === "PROCESSING" && attempts < MAX_POLL_ATTEMPTS) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    fileInfo = await ai.files.get({ name });
    attempts++;
  }
  const uri = (fileInfo as any).uri as string | undefined;
  const mimeType = (fileInfo as any).mimeType as string | undefined;
  if (String((fileInfo as any).state) !== "ACTIVE" || !uri || !mimeType) {
    throw new Error(`Gemini file processing failed after ${attempts} polls (state: ${(fileInfo as any).state})`);
  }
  return { uri, mimeType };
}

function looksLikeModelNotFound(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /not found|model.*not|404|does not exist/i.test(msg);
}

// ─── Table Formatting ────────────────────────────────────────────────────────

function printBooleanTable(title: string, metrics: Record<string, boolean>): void {
  console.log(`\n  ${title}`);
  console.log("  " + "-".repeat(52));
  for (const [key, value] of Object.entries(metrics)) {
    const icon = value ? "PASS" : "FAIL";
    const tag = value ? "\x1b[32mPASS\x1b[0m" : "\x1b[31mFAIL\x1b[0m";
    const label = key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
    console.log(`  ${tag}  ${label.padEnd(40)}`);
  }
}

function printScoreBar(label: string, score: number): void {
  const barLen = 30;
  const filled = Math.round((score / 100) * barLen);
  const bar = "\u2588".repeat(filled) + "\u2591".repeat(barLen - filled);
  const color = score >= 70 ? "\x1b[32m" : score >= 40 ? "\x1b[33m" : "\x1b[31m";
  console.log(`  ${label.padEnd(24)} ${color}${bar}\x1b[0m ${score}/100`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const videoPath = process.argv[2] || DEFAULT_VIDEO_PATH;

  console.log("=".repeat(60));
  console.log("  NODEBENCH DEMO VIDEO JUDGE");
  console.log("  Powered by Gemini multimodal analysis");
  console.log("=".repeat(60));

  // 1. Validate video file
  if (!fs.existsSync(videoPath)) {
    console.error(`\nERROR: Video not found: ${videoPath}`);
    console.error("Place your demo video at docs/demo-video/nodebench-demo.mp4");
    process.exit(1);
  }

  const stat = fs.statSync(videoPath);
  const sizeMB = +(stat.size / (1024 * 1024)).toFixed(2);
  console.log(`\n  Video: ${path.basename(videoPath)} (${sizeMB} MB)`);

  // 2. Initialize Gemini
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });

  // 3. Upload video to Gemini File API
  console.log("  Uploading video to Gemini File API...");
  const videoBuffer = fs.readFileSync(videoPath);
  const blob = new Blob([videoBuffer], { type: "video/mp4" });

  const upload: any = await withTimeout(
    ai.files.upload({
      file: blob,
      config: { mimeType: "video/mp4", displayName: "nodebench-demo-judge" },
    }),
    UPLOAD_TIMEOUT_MS,
    "Gemini file upload",
  );

  const uploadedName = upload.name as string;
  console.log(`  Upload complete. File: ${uploadedName}`);

  try {
    // 4. Wait for processing
    console.log("  Waiting for Gemini to process video...");
    const processed = await waitForFileActive(ai, uploadedName);
    console.log("  Video processed. Starting evaluation...");

    const part = createPartFromUri(processed.uri, processed.mimeType);

    // 5. Send evaluation prompt with model fallback
    let rawText = "";
    let usedModel = "";

    for (const candidate of MODEL_CANDIDATES) {
      console.log(`  Trying model: ${candidate}...`);
      try {
        const response = await withTimeout(
          ai.models.generateContent({
            model: candidate,
            contents: [{ role: "user", parts: [part, { text: JUDGE_PROMPT }] }],
            config: {
              responseMimeType: "application/json",
              responseSchema,
              maxOutputTokens: 8192,
              temperature: 0.15,
            },
          }),
          GENERATE_TIMEOUT_MS,
          `Gemini generateContent (${candidate})`,
        );

        rawText = (response?.text ?? "").toString();
        if (rawText.length > 10) {
          usedModel = candidate;
          console.log(`  Model ${candidate} responded (${rawText.length} chars)`);
          break;
        }
      } catch (e) {
        if (looksLikeModelNotFound(e)) {
          console.log(`  Model ${candidate} not available, trying next...`);
          continue;
        }
        throw e;
      }
    }

    if (!rawText || !usedModel) {
      throw new Error(`No Gemini model succeeded. Tried: ${MODEL_CANDIDATES.join(", ")}`);
    }

    // 6. Parse response
    let parsed: any;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      // Try to repair truncated JSON
      let text = rawText.trim();
      const quotes = (text.match(/"/g) ?? []).length;
      if (quotes % 2 !== 0) text += '"';
      let braces = 0, brackets = 0;
      for (const ch of text) {
        if (ch === "{") braces++;
        else if (ch === "}") braces--;
        else if (ch === "[") brackets++;
        else if (ch === "]") brackets--;
      }
      while (brackets > 0) { text += "]"; brackets--; }
      while (braces > 0) { text += "}"; braces--; }
      parsed = JSON.parse(text);
    }

    // Handle array-wrapped response
    if (Array.isArray(parsed)) parsed = parsed[0];

    // 7. Build result
    const result: JudgeResult = {
      timestamp: new Date().toISOString(),
      videoPath: path.relative(path.resolve(__dirname_esm, ".."), videoPath),
      videoSizeMB: sizeMB,
      model: usedModel,
      production: parsed.production,
      effectiveness: parsed.effectiveness,
      productionScore: Math.max(0, Math.min(100, Math.round(parsed.productionScore))),
      effectivenessScore: Math.max(0, Math.min(100, Math.round(parsed.effectivenessScore))),
      viralPotentialScore: Math.max(0, Math.min(100, Math.round(parsed.viralPotentialScore))),
      overallVerdict: ["PASS", "NEEDS_WORK", "FAIL"].includes(parsed.overallVerdict)
        ? parsed.overallVerdict
        : "FAIL",
      topIssues: (parsed.topIssues ?? []).slice(0, 5),
      recommendations: (parsed.recommendations ?? []).slice(0, 5),
      reasoning: parsed.reasoning ?? {
        productionNotes: "",
        effectivenessNotes: "",
        viralNotes: "",
      },
    };

    // 8. Print results
    console.log("\n" + "=".repeat(60));
    console.log("  JUDGE RESULTS");
    console.log("=".repeat(60));

    printBooleanTable("VIDEO PRODUCTION QUALITY", result.production);
    printBooleanTable("DEMO EFFECTIVENESS", result.effectiveness);

    console.log("\n  SCORES");
    console.log("  " + "-".repeat(52));
    printScoreBar("Production", result.productionScore);
    printScoreBar("Effectiveness", result.effectivenessScore);
    printScoreBar("Viral Potential", result.viralPotentialScore);

    const verdictColor =
      result.overallVerdict === "PASS" ? "\x1b[32m" :
      result.overallVerdict === "NEEDS_WORK" ? "\x1b[33m" : "\x1b[31m";
    console.log(`\n  VERDICT: ${verdictColor}${result.overallVerdict}\x1b[0m`);

    if (result.topIssues.length > 0) {
      console.log("\n  TOP ISSUES");
      console.log("  " + "-".repeat(52));
      result.topIssues.forEach((issue, i) => {
        console.log(`  ${i + 1}. ${issue}`);
      });
    }

    if (result.recommendations.length > 0) {
      console.log("\n  RECOMMENDATIONS");
      console.log("  " + "-".repeat(52));
      result.recommendations.forEach((rec, i) => {
        console.log(`  ${i + 1}. ${rec}`);
      });
    }

    if (result.reasoning) {
      console.log("\n  REASONING");
      console.log("  " + "-".repeat(52));
      if (result.reasoning.productionNotes) {
        console.log(`  Production: ${result.reasoning.productionNotes}`);
      }
      if (result.reasoning.effectivenessNotes) {
        console.log(`  Effectiveness: ${result.reasoning.effectivenessNotes}`);
      }
      if (result.reasoning.viralNotes) {
        console.log(`  Viral: ${result.reasoning.viralNotes}`);
      }
    }

    // 9. Save results to JSON
    const outputDir = path.dirname(OUTPUT_PATH);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2) + "\n");
    console.log(`\n  Results saved to: ${path.relative(path.resolve(__dirname_esm, ".."), OUTPUT_PATH)}`);
    console.log("=".repeat(60));

    // 10. Exit code based on verdict
    process.exit(result.overallVerdict === "PASS" ? 0 : 1);
  } finally {
    // Clean up uploaded file
    try {
      await ai.files.delete({ name: uploadedName });
    } catch {
      // Best-effort cleanup
    }
  }
}

main().catch((err) => {
  console.error("\nFATAL:", err instanceof Error ? err.message : String(err));
  if (err instanceof Error && err.stack) {
    console.error(err.stack);
  }
  process.exit(1);
});
