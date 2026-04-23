#!/usr/bin/env node
/**
 * Comparative UI/UX QA: upload the Manus iOS walkthrough video + a real
 * NodeBench chat session video to Gemini 3 Pro Preview and ask for a
 * button-by-button + motion + typography comparison.
 *
 * NO FALLBACK MODELS — if gemini-3-pro-preview is unavailable, we fail.
 * The user explicitly asked for the most capable video-reasoning model.
 *
 * Inputs:
 *   argv[2] — path to Manus mp4 (defaults to the downloads path)
 *   argv[3] — path to NodeBench recording (defaults to .tmp/manus-compare/nodebench-chat.webm)
 *
 * Outputs:
 *   docs/chat-logs-unified/MANUS_VS_NODEBENCH_COMPARISON.md
 *   docs/chat-logs-unified/MANUS_VS_NODEBENCH_COMPARISON.json
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { statSync, existsSync, readFileSync } from "node:fs";
import { dirname, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenAI, createUserContent, createPartFromUri } from "@google/genai";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");

const DEFAULT_MANUS = resolve(
  "C:/Users/hshum/Downloads/manus_UI_screenshots_reference_for_nodebench/AQOGKLEIeeHeIWWqHQr2v9QL0SfBA_ACqzP0aoM7Ap2BbscrAs7Pp5PchWu2xLOtLHnmiEPdCpw5vdYfX4SQxFG7lwH1GJdc734Sf8DocA.mp4",
);
const DEFAULT_NODEBENCH = resolve(repoRoot, ".tmp", "manus-compare", "nodebench-chat.webm");

const OUT_MD = resolve(repoRoot, "docs/chat-logs-unified/MANUS_VS_NODEBENCH_COMPARISON.md");
const OUT_JSON = resolve(repoRoot, "docs/chat-logs-unified/MANUS_VS_NODEBENCH_COMPARISON.json");

// NO FALLBACK — explicit user directive. If this model errors, we surface it.
const MODEL_ID = "gemini-3.1-pro-preview";

const COMPARISON_PROMPT = `You are a senior staff product designer + interaction
engineer reviewing two mobile UI videos side by side.

VIDEO A = Manus iOS app (1.6). Use this as the target quality bar.
VIDEO B = NodeBench (the app being audited). This should match or exceed VIDEO A.

Your job: produce a rigorous, honest, concrete comparative audit. Do NOT be
polite. The engineer auditing needs a prioritized punch list, not a pep talk.

Important comparison rule:
- Compare matched interaction phases only.
- If one video has extra lead-in or trailing frames that the other does not
  (for example a landing shell before the active thread appears), do not anchor
  your audit on those unmatched frames.
- Align on overlapping phases such as: active thread view, streaming/progress,
  top chrome, 3-dot menu, steps tab, conversation return, and composer state.
- If you mention an unmatched intro or outro frame, explicitly label it as
  "unmatched context" and do not use it for the overall grade.

Return a SINGLE valid JSON object (no markdown fences, no prose outside JSON)
with this shape:

{
  "summary": {
    "manus_feel": "<3-5 adjectives describing the overall Manus feel>",
    "nodebench_feel": "<3-5 adjectives describing the overall NodeBench feel>",
    "overall_gap_rating": "<A+ / A / B+ / B / C+ / C / D / F — how close is NodeBench to Manus>",
    "top_3_gaps": ["most important gap", "...", "..."],
    "top_3_wins": ["where NodeBench already matches or beats Manus", "...", "..."]
  },
  "layout": {
    "top_chrome": { "manus": "...", "nodebench": "...", "delta": "...", "severity": "P0|P1|P2" },
    "composer_pinning": { "manus": "...", "nodebench": "...", "delta": "...", "severity": "..." },
    "bottom_nav": { "manus": "...", "nodebench": "...", "delta": "...", "severity": "..." },
    "safe_area_handling": { "manus": "...", "nodebench": "...", "delta": "...", "severity": "..." }
  },
  "typography": {
    "header_treatment": { "manus": "...", "nodebench": "...", "delta": "...", "severity": "..." },
    "body_readability": { "manus": "...", "nodebench": "...", "delta": "...", "severity": "..." },
    "weight_hierarchy": { "manus": "...", "nodebench": "...", "delta": "...", "severity": "..." }
  },
  "motion": {
    "transitions": { "manus": "...", "nodebench": "...", "delta": "...", "severity": "..." },
    "loading_states": { "manus": "...", "nodebench": "...", "delta": "...", "severity": "..." },
    "menu_open_close": { "manus": "...", "nodebench": "...", "delta": "...", "severity": "..." },
    "feel_rating": "<instant / snappy / acceptable / laggy / janky> for each app"
  },
  "color_and_contrast": {
    "palette": { "manus": "hex palette", "nodebench": "hex palette", "delta": "..." },
    "text_contrast": { "manus": "...", "nodebench": "...", "delta": "...", "severity": "..." },
    "accent_usage": { "manus": "...", "nodebench": "...", "delta": "...", "severity": "..." }
  },
  "interaction_surfaces": {
    "three_dot_menu": { "manus_items": ["Favorite","Rename","View all files","Task details","Delete"], "nodebench_items": [], "missing_in_nodebench": [], "extra_in_nodebench": [], "severity": "..." },
    "composer": { "manus_affordances": [], "nodebench_affordances": [], "delta": "...", "severity": "..." },
    "artifact_rail": { "manus_presence": "...", "nodebench_presence": "...", "delta": "...", "severity": "..." }
  },
  "information_architecture": {
    "clarity_of_entry_point": { "manus": "...", "nodebench": "...", "delta": "...", "severity": "..." },
    "visual_hierarchy": { "manus": "...", "nodebench": "...", "delta": "...", "severity": "..." },
    "cognitive_load": { "manus": "...", "nodebench": "...", "delta": "...", "severity": "..." }
  },
  "accessibility": {
    "tap_target_sizes": { "manus": "...", "nodebench": "...", "delta": "...", "severity": "..." },
    "focus_states": { "manus": "...", "nodebench": "...", "delta": "...", "severity": "..." },
    "reduced_motion_support": { "manus": "...", "nodebench": "...", "delta": "...", "severity": "..." }
  },
  "prioritized_punch_list": [
    { "priority": "P0", "area": "...", "problem": "...", "fix": "concrete actionable change", "estimated_effort": "S|M|L" }
  ],
  "honest_assessment": {
    "can_nodebench_demo_tomorrow": "yes/no with reasoning",
    "biggest_risk_in_demo": "...",
    "quick_wins_before_demo": ["fix #1", "fix #2", "fix #3"]
  }
}

Rules:
- Be BLUNT. If NodeBench feels like a web app and Manus feels like a native
  iOS app, say so plainly with timestamps.
- Cite timestamps from either video when making claims ("at 0:14 in NodeBench, ...").
- For severity: P0 = embarrassing in a demo; P1 = obvious polish gap; P2 = nitpick.
- Return ONLY the JSON object. No prose before or after.`;

function loadEnv() {
  const envPath = resolve(repoRoot, ".env.local");
  if (!existsSync(envPath)) return {};
  const raw = readFileSync(envPath, "utf-8");
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    let value = m[2].trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    out[m[1]] = value;
  }
  return out;
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function mimeForPath(p) {
  const lower = p.toLowerCase();
  if (lower.endsWith(".mp4")) return "video/mp4";
  if (lower.endsWith(".webm")) return "video/webm";
  if (lower.endsWith(".mov")) return "video/quicktime";
  return "video/mp4";
}

async function uploadAndWait(ai, videoPath, displayName) {
  const stats = statSync(videoPath);
  console.error(`[upload:${displayName}] ${videoPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
  const file = await ai.files.upload({
    file: videoPath,
    config: { mimeType: mimeForPath(videoPath), displayName },
  });
  console.error(`[upload:${displayName}] uploaded name=${file.name} state=${file.state}`);

  let current = file;
  const deadline = Date.now() + 5 * 60_000;
  while (current.state === "PROCESSING" && Date.now() < deadline) {
    await sleep(5_000);
    current = await ai.files.get({ name: current.name });
    console.error(`[upload:${displayName}] polling state=${current.state}`);
  }
  if (current.state !== "ACTIVE") {
    throw new Error(`${displayName} never reached ACTIVE state; last=${current.state}`);
  }
  return current;
}

function tryParseJson(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    const stripped = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();
    return JSON.parse(stripped);
  }
}

function renderMarkdown(report, manusFile, nodebenchFile) {
  const lines = [];
  lines.push(`# Manus vs NodeBench — Gemini 3.1 Pro Preview comparative QA`);
  lines.push(``);
  lines.push(`- **Model:** ${MODEL_ID}`);
  lines.push(`- **Video A (target):** ${basename(manusFile)}`);
  lines.push(`- **Video B (ours):** ${basename(nodebenchFile)}`);
  lines.push(`- **Generated:** ${new Date().toISOString()}`);
  lines.push(``);

  const s = report.summary ?? {};
  lines.push(`## Summary`);
  lines.push(``);
  lines.push(`- **Overall gap rating:** ${s.overall_gap_rating ?? "?"}`);
  lines.push(`- **Manus feel:** ${s.manus_feel ?? ""}`);
  lines.push(`- **NodeBench feel:** ${s.nodebench_feel ?? ""}`);
  lines.push(``);
  lines.push(`### Top 3 gaps`);
  for (const g of s.top_3_gaps ?? []) lines.push(`- ${g}`);
  lines.push(``);
  lines.push(`### Top 3 wins`);
  for (const w of s.top_3_wins ?? []) lines.push(`- ${w}`);
  lines.push(``);

  const renderSection = (title, obj) => {
    lines.push(`## ${title}`);
    lines.push(``);
    lines.push(`| dimension | Manus | NodeBench | delta | severity |`);
    lines.push(`|---|---|---|---|---|`);
    for (const [k, v] of Object.entries(obj ?? {})) {
      if (v && typeof v === "object" && "manus" in v) {
        lines.push(`| ${k} | ${v.manus ?? ""} | ${v.nodebench ?? ""} | ${v.delta ?? ""} | ${v.severity ?? ""} |`);
      }
    }
    lines.push(``);
  };

  renderSection("Layout", report.layout);
  renderSection("Typography", report.typography);
  renderSection("Motion", report.motion);
  renderSection("Color & contrast", report.color_and_contrast);
  renderSection("Information architecture", report.information_architecture);
  renderSection("Accessibility", report.accessibility);

  const surfaces = report.interaction_surfaces ?? {};
  const tdm = surfaces.three_dot_menu ?? {};
  lines.push(`## 3-dot menu comparison`);
  lines.push(``);
  lines.push(`- **Manus items:** ${(tdm.manus_items ?? []).join(", ")}`);
  lines.push(`- **NodeBench items:** ${(tdm.nodebench_items ?? []).join(", ")}`);
  lines.push(`- **Missing in NodeBench:** ${(tdm.missing_in_nodebench ?? []).join(", ") || "none"}`);
  lines.push(`- **Extra in NodeBench:** ${(tdm.extra_in_nodebench ?? []).join(", ") || "none"}`);
  lines.push(``);

  lines.push(`## Prioritized punch list`);
  lines.push(``);
  lines.push(`| priority | area | problem | fix | effort |`);
  lines.push(`|---|---|---|---|---|`);
  for (const row of report.prioritized_punch_list ?? []) {
    lines.push(
      `| ${row.priority ?? ""} | ${row.area ?? ""} | ${row.problem ?? ""} | ${row.fix ?? ""} | ${row.estimated_effort ?? ""} |`,
    );
  }
  lines.push(``);

  const honest = report.honest_assessment ?? {};
  lines.push(`## Honest assessment`);
  lines.push(``);
  lines.push(`- **Can NodeBench demo tomorrow?** ${honest.can_nodebench_demo_tomorrow ?? "?"}`);
  lines.push(`- **Biggest risk:** ${honest.biggest_risk_in_demo ?? "?"}`);
  lines.push(`- **Quick wins:**`);
  for (const q of honest.quick_wins_before_demo ?? []) lines.push(`  - ${q}`);
  lines.push(``);

  return lines.join("\n");
}

async function main() {
  const env = loadEnv();
  const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("ERROR: GEMINI_API_KEY not set in .env.local or process env");
    process.exit(1);
  }

  const manusPath = process.argv[2] || DEFAULT_MANUS;
  const nodebenchPath = process.argv[3] || DEFAULT_NODEBENCH;
  if (!existsSync(manusPath)) {
    console.error(`ERROR: Manus video not found at ${manusPath}`);
    process.exit(1);
  }
  if (!existsSync(nodebenchPath)) {
    console.error(`ERROR: NodeBench video not found at ${nodebenchPath}`);
    console.error(`       Run: node scripts/manus/record-nodebench-chat.mjs first`);
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey });

  const [manusFile, nodebenchFile] = await Promise.all([
    uploadAndWait(ai, manusPath, "manus-walkthrough.mp4"),
    uploadAndWait(ai, nodebenchPath, "nodebench-chat.webm"),
  ]);

  console.error(`[gemini] calling model=${MODEL_ID} (NO fallback)`);
  const response = await ai.models.generateContent({
    model: MODEL_ID,
    contents: createUserContent([
      "VIDEO A — Manus iOS (target):",
      createPartFromUri(manusFile.uri, manusFile.mimeType),
      "VIDEO B — NodeBench (ours):",
      createPartFromUri(nodebenchFile.uri, nodebenchFile.mimeType),
      COMPARISON_PROMPT,
    ]),
    config: {
      temperature: 0.2,
      responseMimeType: "application/json",
    },
  });

  const raw = response.text;
  if (!raw) throw new Error("Empty response text from Gemini");
  console.error(`[gemini] raw length = ${raw.length} chars`);

  let parsed;
  try {
    parsed = tryParseJson(raw);
  } catch (err) {
    console.error(`[gemini] JSON parse failed, writing raw debug file`);
    await mkdir(dirname(OUT_JSON), { recursive: true });
    await writeFile(OUT_JSON + ".raw.txt", raw, "utf-8");
    throw err;
  }

  await mkdir(dirname(OUT_JSON), { recursive: true });
  await writeFile(
    OUT_JSON,
    JSON.stringify(
      { ...parsed, _meta: { model: MODEL_ID, manusPath, nodebenchPath, generatedAt: new Date().toISOString() } },
      null,
      2,
    ),
    "utf-8",
  );

  const md = renderMarkdown(parsed, manusPath, nodebenchPath);
  await writeFile(OUT_MD, md, "utf-8");

  console.error(`[done] markdown=${OUT_MD}`);
  console.error(`[done] json=${OUT_JSON}`);
  console.error(`[done] model=${MODEL_ID}`);
}

main().catch((err) => {
  console.error("FAILED:", err?.stack || err?.message || err);
  process.exit(1);
});
