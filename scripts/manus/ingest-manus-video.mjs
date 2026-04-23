#!/usr/bin/env node
/**
 * Ingest Manus UI walkthrough video via Gemini 3 Pro and emit an
 * interaction map suitable for NodeBench button-by-button audit.
 *
 * Output: docs/chat-logs-unified/MANUS_INTERACTION_MAP.md (markdown)
 *       + docs/chat-logs-unified/MANUS_INTERACTION_MAP.json (raw)
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { statSync, existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenAI, createUserContent, createPartFromUri } from "@google/genai";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");

const DEFAULT_VIDEO = resolve(
  "C:/Users/hshum/Downloads/manus_UI_screenshots_reference_for_nodebench/AQOGKLEIeeHeIWWqHQr2v9QL0SfBA_ACqzP0aoM7Ap2BbscrAs7Pp5PchWu2xLOtLHnmiEPdCpw5vdYfX4SQxFG7lwH1GJdc734Sf8DocA.mp4",
);

const OUT_MD = resolve(repoRoot, "docs/chat-logs-unified/MANUS_INTERACTION_MAP.md");
const OUT_JSON = resolve(repoRoot, "docs/chat-logs-unified/MANUS_INTERACTION_MAP.json");

// Gemini 3 Pro — best for long-form video reasoning.
// No fallback: the user explicitly requested the official Pro preview model.
const MODEL_CANDIDATES = ["gemini-3.1-pro-preview"];

const INTERACTION_SCHEMA_PROMPT = `You are a senior staff UX researcher + interaction designer.

You are watching a screen recording of the Manus iOS app (Manus 1.6). The user
on-screen has just finished analyzing an Excel scorecard with Manus and is
tapping through different parts of the app to show its surfaces, modals,
menus, and settings screens.

Your job: produce a COMPLETE interaction map usable by a frontend engineer
to audit their competing app button-by-button. Be exact, concrete, and
exhaustive. When in doubt, err on the side of listing MORE buttons, tabs,
chips, and affordances rather than fewer.

Return a SINGLE valid JSON object (no markdown fences, no prose outside the
JSON) with EXACTLY this shape:

{
  "video": {
    "durationSeconds": <number>,
    "platform": "iOS",
    "app": "Manus 1.6",
    "opener": "<1-sentence description of opening frame>"
  },
  "screens": [
    {
      "id": "chat_1_6",
      "label": "Chat (Manus 1.6)",
      "purpose": "<1-sentence>",
      "firstAppearanceSeconds": <number>,
      "lastAppearanceSeconds": <number>,
      "entryPoints": ["home_hub", "task_row_tap", ...],
      "exitPoints": ["home_hub via back", "document_view via artifact tap", ...],
      "chrome": {
        "topBar": {
          "left": "back button (circular)",
          "center": "Manus 1.6 pill dropdown",
          "right": ["add user icon", "share icon", "3-dot menu"]
        },
        "bottomBar": null
      },
      "regions": [
        { "name": "header", "description": "..." },
        { "name": "conversation", "description": "..." },
        { "name": "composer", "description": "..." }
      ]
    }
  ],
  "buttons": [
    {
      "buttonId": "chat.topBar.back",
      "screen": "chat_1_6",
      "label": "Back",
      "iconDescription": "left-facing chevron inside circular pill, ~28px",
      "location": "top-left of screen, 16px from edge",
      "action": "navigate_back",
      "destination": "home_hub",
      "sideEffects": ["dismisses any keyboard", "..."],
      "seenInVideoAtSeconds": [<number>, ...],
      "confidence": "high|medium|low",
      "notes": "..."
    }
  ],
  "chips": [
    {
      "chipId": "...",
      "screen": "...",
      "label": "...",
      "kind": "filter|tab|status|connector",
      "activeStyle": "white fill, dark text",
      "inactiveStyle": "transparent, gray text",
      "action": "..."
    }
  ],
  "menus": [
    {
      "menuId": "chat.threeDotActions",
      "triggeredBy": "chat.topBar.threeDot",
      "style": "bottom sheet|popover|full-screen modal",
      "items": [
        { "label": "Favorite",   "icon": "star",   "destructive": false, "destination": "inline_toggle" },
        { "label": "Rename",     "icon": "pencil", "destructive": false, "destination": "rename_modal" },
        { "label": "View all files", "icon": "folder", "destructive": false, "destination": "files_screen" },
        { "label": "Task details",   "icon": "info",   "destructive": false, "destination": "task_details_screen" },
        { "label": "Delete",         "icon": "trash",  "destructive": true,  "destination": "confirm_delete_modal" }
      ]
    }
  ],
  "timeline": [
    {
      "tSeconds": 0.5,
      "screen": "chat_1_6",
      "userAction": "tap on artifact chip 'GenAI Engineer Interview Scorecar...'",
      "result": "navigate to document_view; Modified tab active"
    }
  ],
  "transitions": [
    {
      "from": "chat_1_6",
      "to": "document_view",
      "trigger": "tap artifact chip",
      "animationDescription": "push from right, ~280ms ease-out",
      "loadingState": "none|skeleton|spinner",
      "approxLatencyMs": 0
    }
  ],
  "designTokens": {
    "colors": {
      "pageBackground": "pure black or near-black hex",
      "cardBackground": "...",
      "primaryText": "...",
      "mutedText": "...",
      "accent": "any brand accent used or 'none'",
      "destructiveRed": "..."
    },
    "shapes": {
      "cardRadius": "<px>",
      "chipRadius": "full|<px>",
      "buttonRadius": "full|<px>"
    },
    "typography": {
      "headerFamily": "SF Pro|...",
      "bodyFamily": "..."
    },
    "motion": {
      "modalSheetStyle": "slide-up from bottom, rubber-band dismiss",
      "tabSwitchStyle": "instant|crossfade",
      "typicalTransitionMs": <number>
    }
  },
  "observations": {
    "globalPatterns": [
      "top bar always has circular back + centered pill title",
      "..."
    ],
    "accessibility": [
      "tap targets appear >=44px",
      "..."
    ],
    "surprisingPatterns": [
      "..."
    ]
  }
}

Rules:
- NAME EVERY VISIBLE BUTTON. Do not skip buttons even if their action is
  unclear. Use confidence: "low" when unsure.
- For the 3-dot menu on chat messages, include ALL menu items observed.
- For the Files screen, include every visible file and every tab pill.
- For the Manus Pro subscription screen, include the Upgrade CTA plus every
  credit subcategory displayed (Free / Monthly / Daily refresh).
- For the Notifications screen, include ALL tabs and at least 2 notification
  rows per tab observed.
- Seconds can be approximate but must be monotonically consistent with the
  video duration.
- If a tap LEAVES a screen, fill destination. If a tap triggers an INLINE
  state change, use destination: "inline_<what>".
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
  return new Promise((res) => setTimeout(res, ms));
}

async function uploadAndWait(ai, videoPath) {
  const stats = statSync(videoPath);
  console.error(`[upload] ${videoPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
  const file = await ai.files.upload({
    file: videoPath,
    config: { mimeType: "video/mp4", displayName: "manus-walkthrough.mp4" },
  });
  console.error(`[upload] uploaded name=${file.name} state=${file.state}`);

  // Wait for ACTIVE. Videos typically need ~10–60s to process.
  let current = file;
  const deadline = Date.now() + 5 * 60_000;
  while (current.state === "PROCESSING" && Date.now() < deadline) {
    await sleep(5_000);
    current = await ai.files.get({ name: current.name });
    console.error(`[upload] polling state=${current.state}`);
  }
  if (current.state !== "ACTIVE") {
    throw new Error(`File never reached ACTIVE state; last state=${current.state}`);
  }
  return current;
}

async function askWithModel(ai, modelName, file) {
  console.error(`[gemini] calling model=${modelName}`);
  const response = await ai.models.generateContent({
    model: modelName,
    contents: createUserContent([
      createPartFromUri(file.uri, file.mimeType),
      INTERACTION_SCHEMA_PROMPT,
    ]),
    config: {
      temperature: 0.2,
      responseMimeType: "application/json",
    },
  });
  const text = response.text;
  if (!text) {
    throw new Error("Empty response text");
  }
  return text;
}

function tryParseJson(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    // Strip markdown fences if Gemini ignored responseMimeType.
    const stripped = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();
    return JSON.parse(stripped);
  }
}

function renderMarkdown(map) {
  const lines = [];
  lines.push(`# Manus Interaction Map`);
  lines.push(``);
  lines.push(`Ingested from user-provided phone recording via Gemini 3 Pro.`);
  lines.push(``);
  lines.push(`- **App:** ${map.video?.app ?? "Manus"}`);
  lines.push(`- **Platform:** ${map.video?.platform ?? "iOS"}`);
  lines.push(`- **Duration:** ${map.video?.durationSeconds ?? "?"} s`);
  lines.push(`- **Opener:** ${map.video?.opener ?? ""}`);
  lines.push(``);

  lines.push(`## Screen inventory`);
  lines.push(``);
  lines.push(`| id | label | purpose | first @ s | entry points |`);
  lines.push(`|---|---|---|---|---|`);
  for (const s of map.screens ?? []) {
    lines.push(
      `| \`${s.id}\` | ${s.label} | ${s.purpose} | ${s.firstAppearanceSeconds ?? "?"} | ${(s.entryPoints ?? []).join(", ")} |`,
    );
  }
  lines.push(``);

  lines.push(`## Button catalog`);
  lines.push(``);
  lines.push(`| screen | button | location | action → destination | confidence |`);
  lines.push(`|---|---|---|---|---|`);
  for (const b of map.buttons ?? []) {
    lines.push(
      `| \`${b.screen}\` | ${b.label} (${b.iconDescription ?? "no icon"}) | ${b.location ?? ""} | ${b.action} → ${b.destination ?? "?"} | ${b.confidence ?? "?"} |`,
    );
  }
  lines.push(``);

  lines.push(`## Chips / tabs`);
  lines.push(``);
  for (const c of map.chips ?? []) {
    lines.push(`- **${c.screen}** — \`${c.label}\` (${c.kind}) → ${c.action ?? "no-op"}`);
  }
  lines.push(``);

  lines.push(`## Menus`);
  lines.push(``);
  for (const m of map.menus ?? []) {
    lines.push(`### ${m.menuId} — triggered by \`${m.triggeredBy}\` (${m.style})`);
    lines.push(``);
    lines.push(`| item | icon | destination | destructive |`);
    lines.push(`|---|---|---|---|`);
    for (const it of m.items ?? []) {
      lines.push(`| ${it.label} | ${it.icon ?? ""} | \`${it.destination ?? "?"}\` | ${it.destructive ? "yes" : "no"} |`);
    }
    lines.push(``);
  }

  lines.push(`## Timeline`);
  lines.push(``);
  for (const t of map.timeline ?? []) {
    lines.push(`- **${t.tSeconds}s** [${t.screen}] ${t.userAction} → ${t.result}`);
  }
  lines.push(``);

  lines.push(`## Transitions`);
  lines.push(``);
  lines.push(`| from → to | trigger | animation | latency |`);
  lines.push(`|---|---|---|---|`);
  for (const t of map.transitions ?? []) {
    lines.push(
      `| \`${t.from}\` → \`${t.to}\` | ${t.trigger} | ${t.animationDescription ?? ""} | ${t.approxLatencyMs ?? "?"}ms |`,
    );
  }
  lines.push(``);

  lines.push(`## Design tokens`);
  lines.push(``);
  lines.push("```json");
  lines.push(JSON.stringify(map.designTokens ?? {}, null, 2));
  lines.push("```");
  lines.push(``);

  lines.push(`## Observations`);
  lines.push(``);
  for (const o of map.observations?.globalPatterns ?? []) lines.push(`- ${o}`);
  lines.push(``);
  if ((map.observations?.accessibility ?? []).length) {
    lines.push(`### Accessibility`);
    for (const o of map.observations.accessibility) lines.push(`- ${o}`);
    lines.push(``);
  }
  if ((map.observations?.surprisingPatterns ?? []).length) {
    lines.push(`### Surprising patterns`);
    for (const o of map.observations.surprisingPatterns) lines.push(`- ${o}`);
    lines.push(``);
  }

  return lines.join("\n");
}

async function main() {
  const env = loadEnv();
  const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("ERROR: GEMINI_API_KEY not set in .env.local or process env");
    process.exit(1);
  }

  const videoPath = process.argv[2] || DEFAULT_VIDEO;
  if (!existsSync(videoPath)) {
    console.error(`ERROR: video not found at ${videoPath}`);
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey });
  const file = await uploadAndWait(ai, videoPath);

  let raw = null;
  let usedModel = null;
  let lastErr = null;
  for (const model of MODEL_CANDIDATES) {
    try {
      raw = await askWithModel(ai, model, file);
      usedModel = model;
      break;
    } catch (err) {
      lastErr = err;
      console.error(`[gemini] model ${model} failed: ${err?.message ?? err}`);
    }
  }
  if (!raw) {
    throw lastErr || new Error("All model candidates failed");
  }

  console.error(`[gemini] raw length = ${raw.length} chars (model=${usedModel})`);

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
  await writeFile(OUT_JSON, JSON.stringify({ ...parsed, _meta: { model: usedModel, videoPath, generatedAt: new Date().toISOString() } }, null, 2), "utf-8");

  const md = renderMarkdown(parsed);
  await writeFile(OUT_MD, md, "utf-8");

  console.error(`[done] markdown=${OUT_MD}`);
  console.error(`[done] json=${OUT_JSON}`);
  console.error(`[done] model=${usedModel}`);
}

main().catch((err) => {
  console.error("FAILED:", err?.stack || err?.message || err);
  process.exit(1);
});
