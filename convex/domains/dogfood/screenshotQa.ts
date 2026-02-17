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
    `You are reviewing a set of UI screenshots from a web app (dark theme).\n\n` +
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
    `Be specific and avoid generic design advice.`
  );
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
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const maxImages = Math.min(Math.max(args.maxImages ?? 8, 1), 12);
    const selected = args.screenshots.slice(0, maxImages);

    const prompt = buildPrompt(args.prompt);
    const model = getLlmModel("vision", "gemini", args.model ?? "gemini-3-flash");

    const inputSha256 = sha256Hex(
      JSON.stringify({
        model,
        prompt,
        screenshots: selected.map((s) => ({ url: s.url, label: s.label, route: s.route ?? "" })),
      }),
    );

    if (!args.force) {
      const existing = await ctx.runQuery(internal.domains.dogfood.videoQaQueries.findMyDogfoodQaRunByInputSha256, {
        inputSha256,
      });
      if (existing) return existing;
    }

    const apiKey = getGeminiKey();
    const ai = new GoogleGenAI({ apiKey });

    const parts: any[] = [];
    for (let i = 0; i < selected.length; i++) {
      const s = selected[i];
      const title = `Screenshot ${i + 1}/${selected.length}: ${s.label}${s.route ? ` (${s.route})` : ""}`;
      parts.push({ text: title });

      const res = await fetch(s.url);
      if (!res.ok) throw new Error(`Failed to fetch screenshot: HTTP ${res.status} (${s.url})`);
      const contentType = res.headers.get("content-type") || "image/png";
      const buf = Buffer.from(await res.arrayBuffer());
      parts.push({
        inlineData: { mimeType: contentType, data: buf.toString("base64") },
      });
    }
    parts.push({ text: prompt });

    let response: any;
    try {
      response = await ai.models.generateContent({
        model,
        contents: [{ role: "user", parts }],
        config: {
          responseMimeType: "application/json",
          responseSchema,
          maxOutputTokens: 3500,
          temperature: 0.1,
        },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("response_schema") || msg.includes("INVALID_ARGUMENT")) {
        response = await ai.models.generateContent({
          model,
          contents: [{ role: "user", parts }],
          config: {
            responseMimeType: "application/json",
            maxOutputTokens: 3500,
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
  },
});

