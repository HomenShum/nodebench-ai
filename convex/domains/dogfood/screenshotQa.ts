"use node";

import { v } from "convex/values";
import { action } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { GoogleGenAI, Type } from "@google/genai";
import { getLlmModel } from "../../../shared/llm/modelCatalog";
import crypto from "node:crypto";

function getGeminiKey(): string {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!key) throw new Error("Gemini API key not configured (set GEMINI_API_KEY or GOOGLE_AI_API_KEY)");
  return key;
}

function sha256Hex(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function sha256HexBuffer(buf: Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return await Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`)), ms),
    ),
  ]);
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
          evidence: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["severity", "title", "details"],
      },
    },
  },
  required: ["summary", "issues"],
} as const;

function buildPrompt(customPrompt?: string | null): string {
  const base = (customPrompt ?? "").trim();
  if (base) return base;

  return (
    `You are reviewing a set of UI screenshots from a web app (mixed dark/light surfaces).\n\n` +
    `Goals:\n` +
    `- Identify high-impact UI/UX issues (legibility, hierarchy, spacing, alignment, contrast, consistency).\n` +
    `- Identify interaction affordance problems visible in stills (missing focus styling, unclear primary action, cramped controls).\n` +
    `- Suggest root-cause categories (CSS/layout, component composition, empty states, data wiring).\n\n` +
    `Output STRICT JSON with:\n` +
    `- summary: short paragraph.\n` +
    `- issues: array of issues with fields:\n` +
    `  - severity: one of p0|p1|p2|p3.\n` +
    `  - title, details.\n` +
    `  - suggestedFix (optional).\n` +
    `  - route (optional): best-guess route/screen.\n` +
    `  - evidence (optional): short strings.\n\n` +
    `Constraints:\n` +
    `- Be specific and avoid generic design advice.\n` +
    `- Return at least 8 issues if possible; anchor each issue to a specific screenshot label/route.\n`
  );
}

function sampleEvenly<T>(items: T[], count: number): T[] {
  if (count <= 0 || items.length === 0) return [];
  if (count >= items.length) return items;
  if (count === 1) return [items[0]];

  const indices = Array.from({ length: count }, (_, i) => Math.round((i * (items.length - 1)) / (count - 1)));
  const uniq = Array.from(new Set(indices));
  return uniq.map((idx) => items[idx]).filter(Boolean);
}

export const runDogfoodScreenshotQa = action({
  args: {
    screenshots: v.array(
      v.object({
        url: v.string(),
        label: v.string(),
        route: v.optional(v.string()),
      }),
    ),
    prompt: v.optional(v.string()),
    model: v.optional(v.string()),
    maxImages: v.optional(v.number()),
    force: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    try {
      const userId = await getAuthUserId(ctx);
      if (!userId) throw new Error("Not authenticated");

      type ScreenshotInput = { url: string; label: string; route?: string };
      const screenshots = args.screenshots as ScreenshotInput[];

      const maxImages = Math.min(Math.max(args.maxImages ?? 8, 1), 12);
      const selected = sampleEvenly(screenshots, maxImages);

      const prompt = buildPrompt(args.prompt);
      // Gemini API (v1beta) model IDs: prefer stable public IDs.
      // "gemini-3-flash" was an internal alias that isn't available in all Gemini API accounts.
      const model = getLlmModel("vision", "gemini", args.model ?? "gemini-2.0-flash");

      const apiKey = getGeminiKey();
      const ai = new GoogleGenAI({ apiKey });

      const parts: any[] = [];
      const hashImages: { label: string; route: string; sha256: string }[] = [];
      for (let i = 0; i < selected.length; i++) {
        const s = selected[i];
        const title = `Screenshot ${i + 1}/${selected.length}: ${s.label}${s.route ? ` (${s.route})` : ""}`;
        parts.push({ text: title });

        const res = await fetch(s.url);
        if (!res.ok) throw new Error(`Failed to fetch screenshot: HTTP ${res.status} (${s.url})`);
        const contentType = res.headers.get("content-type") || "image/png";
        const buf = Buffer.from(await res.arrayBuffer());

        hashImages.push({
          label: s.label,
          route: s.route ?? "",
          sha256: sha256HexBuffer(buf),
        });

        parts.push({
          inlineData: { mimeType: contentType, data: buf.toString("base64") },
        });
      }
      parts.push({ text: prompt });

      const inputSha256 = sha256Hex(
        JSON.stringify({
          model,
          prompt,
          images: hashImages,
        }),
      );

      if (!args.force) {
        const existing = await ctx.runQuery(internal.domains.dogfood.videoQaQueries.findMyDogfoodQaRunByInputSha256, {
          inputSha256,
        });
        if (existing) return existing;
      }

      let response: any;
      try {
        response = await withTimeout(
          ai.models.generateContent({
            model,
            contents: [{ role: "user", parts }],
            config: {
              responseMimeType: "application/json",
              responseSchema,
              maxOutputTokens: 3500,
              temperature: 0.1,
            },
          }),
          180_000,
          "Gemini generateContent (screenshots)",
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("response_schema") || msg.includes("INVALID_ARGUMENT")) {
          response = await withTimeout(
            ai.models.generateContent({
              model,
              contents: [{ role: "user", parts }],
              config: {
                responseMimeType: "application/json",
                maxOutputTokens: 3500,
                temperature: 0.1,
              },
            }),
            180_000,
            "Gemini generateContent (screenshots fallback)",
          );
        } else {
          throw e;
        }
      }

      const rawText = (response?.text ?? "").toString();
      let parsed: any = null;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        parsed = {
          summary: rawText.slice(0, 1200),
          issues: [{ severity: "p1", title: "Gemini QA (unstructured)", details: rawText }],
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
        source: "screenshots",
        videoUrl: undefined,
        inputSha256,
        prompt,
        summary,
        issues,
        rawText,
      });

      return (
        (await ctx.runQuery(internal.domains.dogfood.videoQaQueries.findMyDogfoodQaRunByInputSha256, { inputSha256 })) ??
        { _id: id, createdAt, provider: "gemini", model, source: "screenshots", inputSha256, prompt, summary, issues, rawText }
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[dogfood.screenshotQa] failed", msg);

      const userId = await getAuthUserId(ctx);
      if (!userId) throw new Error("Not authenticated");

      const prompt = buildPrompt(args.prompt);
      // Gemini API (v1beta) model IDs: prefer stable public IDs.
      // "gemini-3-flash" was an internal alias that isn't available in all Gemini API accounts.
      const model = getLlmModel("vision", "gemini", args.model ?? "gemini-2.0-flash");

      const createdAt = Date.now();
      const summary = "Gemini QA failed (see issue details)";
      const issues = [
        {
          severity: "p0" as const,
          title: "Gemini QA failed",
          details: msg.slice(0, 4000),
          suggestedFix: "Check GEMINI_API_KEY in Convex env, Gemini model availability, and screenshot payload size; rerun QA.",
        },
      ];

      const id = await ctx.runMutation(internal.domains.dogfood.videoQaMutations.insertDogfoodQaRun, {
        createdAt,
        provider: "gemini",
        model,
        source: "screenshots",
        videoUrl: undefined,
        inputSha256: undefined,
        prompt,
        summary,
        issues,
        rawText: msg.slice(0, 8000),
      });

      return { _id: id, createdAt, provider: "gemini", model, source: "screenshots", inputSha256: undefined, prompt, summary, issues, rawText: msg.slice(0, 8000) } as any;
    }
  },
});
