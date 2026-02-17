"use node";

import { v } from "convex/values";
import { action } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { GoogleGenAI, createPartFromUri, Type } from "@google/genai";
import { getLlmModel } from "../../../shared/llm/modelCatalog";
import crypto from "node:crypto";

function getGeminiKey(): string {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!key) throw new Error("Gemini API key not configured (set GEMINI_API_KEY or GOOGLE_AI_API_KEY)");
  return key;
}

function sha256Hex(buf: Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

async function waitForGeminiFileActive(ai: GoogleGenAI, name: string): Promise<{ uri: string; mimeType: string }> {
  let fileInfo = await ai.files.get({ name });
  let attempts = 0;
  while (String((fileInfo as any).state) === "PROCESSING" && attempts < 90) {
    await new Promise((r) => setTimeout(r, 2000));
    fileInfo = await ai.files.get({ name });
    attempts++;
  }
  const uri = (fileInfo as any).uri as string | undefined;
  const mimeType = (fileInfo as any).mimeType as string | undefined;
  if (String((fileInfo as any).state) !== "ACTIVE" || !uri || !mimeType) {
    throw new Error("Gemini file processing failed");
  }
  return { uri, mimeType };
}

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    issues: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          severity: { type: Type.STRING },
          title: { type: Type.STRING },
          details: { type: Type.STRING },
          suggestedFix: { type: Type.STRING },
          route: { type: Type.STRING },
          startSec: { type: Type.NUMBER },
          endSec: { type: Type.NUMBER },
          evidence: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["severity", "title", "details"],
      },
    },
  },
  required: ["summary", "issues"],
} as const;

function buildPrompt(args: { walkthrough?: any; customPrompt?: string | null }): string {
  const chapters = args.walkthrough?.chapters;
  const chapterBlock =
    Array.isArray(chapters) && chapters.length
      ? `\n\nChapters (timestamps):\n${chapters
          .map((c: any) => `- ${Number(c?.startSec ?? 0).toFixed(1)}s: ${c?.name ?? "Unknown"} (${c?.path ?? ""})`)
          .join("\n")}`
      : "";

  const base = (args.customPrompt ?? "").trim();
  if (base) return `${base}${chapterBlock}`;

  return (
    `You are doing a product design and performance QA review of a web app walkthrough video.\n\n` +
    `Goals:\n` +
    `- Identify UI/UX issues that matter (legibility, hierarchy, alignment, spacing, contrast, consistency).\n` +
    `- Identify interaction issues (focus rings, keyboard nav, hover/press states, scroll containment, modals).\n` +
    `- Identify performance issues visible in the video (jank, delayed content, flicker, layout shifts, long spinners).\n` +
    `- For each issue, estimate the root cause category: layout/CSS, state/data loading, routing, rendering, animation, network, caching.\n\n` +
    `Output STRICT JSON with:\n` +
    `- summary: short paragraph.\n` +
    `- issues: array of issues with fields:\n` +
    `  - severity: one of p0|p1|p2|p3 (p0 = blocks use; p1 = major polish; p2 = minor polish; p3 = nit).\n` +
    `  - title: short label.\n` +
    `  - details: what you see + why it matters.\n` +
    `  - suggestedFix (optional): specific, actionable fix suggestion.\n` +
    `  - route (optional): best-guess route/screen name.\n` +
    `  - startSec/endSec (optional): timestamp range in seconds.\n` +
    `  - evidence (optional): short strings like "blurry small text", "button misaligned", etc.\n\n` +
    `Be decisive, avoid generic advice, and anchor issues to timestamps where possible.` +
    chapterBlock
  );
}

export const runDogfoodVideoQa = action({
  args: {
    videoUrl: v.string(),
    walkthrough: v.optional(v.any()),
    prompt: v.optional(v.string()),
    model: v.optional(v.string()),
    force: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const res = await fetch(args.videoUrl);
    if (!res.ok) {
      throw new Error(`Failed to fetch video: HTTP ${res.status}`);
    }

    const contentType = res.headers.get("content-type") || "video/mp4";
    const buf = Buffer.from(await res.arrayBuffer());
    const inputSha256 = sha256Hex(buf);

    if (!args.force) {
      const existing = await ctx.runQuery(internal.domains.dogfood.videoQaQueries.findMyDogfoodQaRunByInputSha256, {
        inputSha256,
      });
      if (existing) return existing;
    }

    const apiKey = getGeminiKey();
    const ai = new GoogleGenAI({ apiKey });

    let uploadedName: string | null = null;
    try {
      // Upload video to Gemini Files API so the model can reference it by URI.
      const blob = new Blob([buf], { type: contentType });
      const upload = await ai.files.upload({
        file: blob,
        config: { mimeType: contentType, displayName: "nodebench-dogfood-walkthrough" },
      });

      uploadedName = (upload as any).name as string;
      const processed = await waitForGeminiFileActive(ai, uploadedName);
      const part = createPartFromUri(processed.uri, processed.mimeType);

      const prompt = buildPrompt({ walkthrough: args.walkthrough, customPrompt: args.prompt });

      const model = getLlmModel("vision", "gemini", args.model ?? "gemini-3-flash");
      let response: any;
      try {
        response = await ai.models.generateContent({
          model,
          contents: [{ role: "user", parts: [part, { text: prompt }] }],
          config: {
            responseMimeType: "application/json",
            responseSchema,
            maxOutputTokens: 4000,
            temperature: 0.1,
          },
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("response_schema") || msg.includes("INVALID_ARGUMENT")) {
          response = await ai.models.generateContent({
            model,
            contents: [{ role: "user", parts: [part, { text: prompt }] }],
            config: {
              responseMimeType: "application/json",
              maxOutputTokens: 4000,
              temperature: 0.1,
            },
          });
        } else {
          throw e;
        }
      }

      const rawText = (response?.text ?? "").toString();
      let parsed: any = null;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        // Fall back to a single issue with the raw text, so the UI still shows something.
        parsed = {
          summary: rawText.slice(0, 1200),
          issues: [
            {
              severity: "p1",
              title: "Gemini QA (unstructured)",
              details: rawText,
            },
          ],
        };
      }

      const createdAt = Date.now();
      const summary = typeof parsed?.summary === "string" ? parsed.summary : "No summary";
      const issuesRaw = Array.isArray(parsed?.issues) ? parsed.issues : [];

      const issues = issuesRaw
        .map((it: any) => ({
          severity: (it?.severity ?? "p2").toString().toLowerCase(),
          title: (it?.title ?? "Issue").toString(),
          details: (it?.details ?? "").toString(),
          suggestedFix: it?.suggestedFix ? String(it.suggestedFix) : undefined,
          route: it?.route ? String(it.route) : undefined,
          startSec: typeof it?.startSec === "number" ? it.startSec : undefined,
          endSec: typeof it?.endSec === "number" ? it.endSec : undefined,
          evidence: Array.isArray(it?.evidence) ? it.evidence.map((e: any) => String(e)) : undefined,
        }))
        .map((it: any) => ({
          ...it,
          severity: ["p0", "p1", "p2", "p3"].includes(it.severity) ? it.severity : "p2",
        }));

      const id = await ctx.runMutation(internal.domains.dogfood.videoQaMutations.insertDogfoodQaRun, {
        createdAt,
        provider: "gemini",
        model,
        source: "video",
        videoUrl: args.videoUrl,
        inputSha256,
        prompt,
        summary,
        issues,
        rawText,
      });

      const row = await ctx.runQuery(internal.domains.dogfood.videoQaQueries.findMyDogfoodQaRunByInputSha256, {
        inputSha256,
      });
      return row ?? { _id: id, createdAt, provider: "gemini", model, source: "video", videoUrl: args.videoUrl, inputSha256, prompt, summary, issues, rawText };
    } finally {
      if (uploadedName) {
        try {
          await ai.files.delete({ name: uploadedName });
        } catch {
          // Best-effort cleanup only.
        }
      }
    }
  },
});
