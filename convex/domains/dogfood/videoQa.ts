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

function sha256HexText(text: string): string {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return await Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`)), ms),
    ),
  ]);
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
    `- Flag any flashing / high-contrast screen transitions that could be uncomfortable or seizure-triggering; recommend reduced-motion-safe alternatives.\n` +
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
    frames: v.optional(
      v.array(
        v.object({
          url: v.string(),
          label: v.optional(v.string()),
          route: v.optional(v.string()),
          startSec: v.optional(v.number()),
        }),
      ),
    ),
    walkthrough: v.optional(v.any()),
    prompt: v.optional(v.string()),
    model: v.optional(v.string()),
    force: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    try {
      const userId = await getAuthUserId(ctx);
      if (!userId) throw new Error("Not authenticated");

      const prompt = buildPrompt({ walkthrough: args.walkthrough, customPrompt: args.prompt });
      // Gemini API (v1beta) model IDs: prefer stable public IDs.
      // "gemini-3-flash" was an internal alias that isn't available in all Gemini API accounts.
      const model = getLlmModel("vision", "gemini", args.model ?? "gemini-2.0-flash");

      const maxFrames = 12;
      const selectedFrames = Array.isArray(args.frames) ? args.frames.slice(0, maxFrames) : null;

      if (selectedFrames && selectedFrames.length > 0) {
        const apiKey = getGeminiKey();
        const ai = new GoogleGenAI({ apiKey });

        const parts: any[] = [];
        const frameHashes: { label: string; route: string; startSec: number; sha256: string }[] = [];
        for (let i = 0; i < selectedFrames.length; i++) {
          const f = selectedFrames[i];
          const label = String(f.label ?? `Frame ${i + 1}`);
          const route = String(f.route ?? "");
          const startSec = typeof f.startSec === "number" ? f.startSec : 0;
          parts.push({
            text: `Frame ${i + 1}/${selectedFrames.length} @ ${startSec.toFixed(1)}s: ${label}${route ? ` (${route})` : ""}`,
          });

          const res = await fetch(f.url);
          if (!res.ok) throw new Error(`Failed to fetch frame: HTTP ${res.status} (${f.url})`);
          const contentType = res.headers.get("content-type") || "image/jpeg";
          const buf = Buffer.from(await res.arrayBuffer());
          const sha = sha256Hex(buf);
          frameHashes.push({ label, route, startSec, sha256: sha });
          parts.push({ inlineData: { mimeType: contentType, data: buf.toString("base64") } });
        }
        parts.push({ text: prompt });

        const inputSha256 = sha256HexText(JSON.stringify({ model, prompt, frames: frameHashes }));
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
                maxOutputTokens: 3500,
                temperature: 0.1,
              },
            }),
            180_000,
            "Gemini generateContent (frames)",
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
              "Gemini generateContent (frames fallback)",
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
          source: "frames",
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
        return (
          row ?? { _id: id, createdAt, provider: "gemini", model, source: "frames", videoUrl: args.videoUrl, inputSha256, prompt, summary, issues, rawText }
        );
      }

      const res = await fetch(args.videoUrl);
      if (!res.ok) {
        throw new Error(`Failed to fetch video: HTTP ${res.status}`);
      }

      const contentType = res.headers.get("content-type") || "video/mp4";
      const buf = Buffer.from(await res.arrayBuffer());
      const videoSha = sha256Hex(buf);
      const inputSha256 = sha256HexText(JSON.stringify({ model, prompt, videoSha }));

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
        let upload: any;
        try {
          // eslint-disable-next-line no-undef
          const blob = new Blob([buf], { type: contentType });
          upload = await withTimeout(
            ai.files.upload({
              file: blob,
              config: { mimeType: contentType, displayName: "nodebench-dogfood-walkthrough" },
            }),
            180_000,
            "Gemini files.upload",
          );
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          throw new Error(`Gemini video upload failed: ${msg}`);
        }

        uploadedName = (upload as any).name as string;
        const processed = await waitForGeminiFileActive(ai, uploadedName);
        const part = createPartFromUri(processed.uri, processed.mimeType);

        let response: any;
        try {
          response = await withTimeout(
            ai.models.generateContent({
              model,
              contents: [{ role: "user", parts: [part, { text: prompt }] }],
              config: {
                responseMimeType: "application/json",
                maxOutputTokens: 4000,
                temperature: 0.1,
              },
            }),
            240_000,
            "Gemini generateContent (video)",
          );
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          if (msg.includes("response_schema") || msg.includes("INVALID_ARGUMENT")) {
            response = await withTimeout(
              ai.models.generateContent({
                model,
                contents: [{ role: "user", parts: [part, { text: prompt }] }],
                config: {
                  responseMimeType: "application/json",
                  maxOutputTokens: 4000,
                  temperature: 0.1,
                },
              }),
              240_000,
              "Gemini generateContent (video fallback)",
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
        return (
          row ?? { _id: id, createdAt, provider: "gemini", model, source: "video", videoUrl: args.videoUrl, inputSha256, prompt, summary, issues, rawText }
        );
      } finally {
        if (uploadedName) {
          try {
            await ai.files.delete({ name: uploadedName });
          } catch {
            // Best-effort cleanup only.
          }
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[dogfood.videoQa] failed", msg);

      const userId = await getAuthUserId(ctx);
      if (!userId) throw new Error("Not authenticated");

      const prompt = buildPrompt({ walkthrough: args.walkthrough, customPrompt: args.prompt });
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
          suggestedFix: "Check GEMINI_API_KEY in Convex env, Gemini model availability, and file/frames payload size; rerun QA.",
        },
      ];

      const id = await ctx.runMutation(internal.domains.dogfood.videoQaMutations.insertDogfoodQaRun, {
        createdAt,
        provider: "gemini",
        model,
        source: Array.isArray(args.frames) && args.frames.length ? "frames" : "video",
        videoUrl: args.videoUrl,
        inputSha256: undefined,
        prompt,
        summary,
        issues,
        rawText: msg.slice(0, 8000),
      });
      return { _id: id, createdAt, provider: "gemini", model, source: Array.isArray(args.frames) && args.frames.length ? "frames" : "video", videoUrl: args.videoUrl, inputSha256: undefined, prompt, summary, issues, rawText: msg.slice(0, 8000) } as any;
    }
  },
});
