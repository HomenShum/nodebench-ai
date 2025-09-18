"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { z } from "zod";

// Return type validator for tags we expose to the client
const TagDocValidator = v.object({
  _id: v.id("tags"),
  name: v.string(),
  kind: v.optional(v.string()),
  importance: v.optional(v.number()),
});

type TagReturn = Array<{ _id: Id<"tags">; name: string; kind?: string; importance?: number }>;

// Zod schemas for validating model output
const TagItemSchema = z.object({
  name: z.string(),
  // Allow arbitrary string/null here; backend canonicalizes. We'll coerce to undefined later if invalid.
  kind: z.string().optional().nullable(),
  importance: z.number().min(0).max(1).optional(),
});

const TagsResponseSchema = z.object({
  tags: z.array(TagItemSchema),
});

export const generateForDocument = action({
  args: { documentId: v.id("documents"), maxTags: v.optional(v.number()) },
  returns: v.array(TagDocValidator),
  handler: async (ctx, { documentId, maxTags = 20 }): Promise<TagReturn> => {
    // Import function references lazily to avoid TypeScript circularity
    const { api, internal } = await import("./_generated/api");
    // Fetch document text context (from V8 query)
    const text: string = await ctx.runQuery(internal.tags.getDocumentText, {
      documentId,
      maxChars: 8000,
    });
    if (!text || text.trim().length === 0) {
      // No content — return empty and do not write
      return [];
    }

    // AI-based tag generation only (no heuristic fallback)
    const OpenAI = (await import("openai")).default;
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("Missing CONVEX_OPENAI_API_KEY/OPENAI_API_KEY");
    const client = new OpenAI({ apiKey });

    const system =
      "You are a tagging assistant. Extract concise, human-meaningful tags from content. You must respond with a single compact JSON object only (no markdown).";
    const prompt = [
      `Extract up to ${maxTags} tags from the following content.`,
      "Return strictly a JSON object of the form { \"tags\": [ { name, kind?, importance? } ] } where:",
      "- name: string",
      "- kind (optional): one of 'keyword' | 'entity' | 'topic' | 'community' | 'relationship'",
      "- importance (optional): float between 0 and 1",
      "Definitions: keyword = salient single words; entity = proper nouns like products, orgs, people; topic = multi-word themes; community = communities or platforms (e.g., discord, reddit, stack overflow); relationship = interaction types like integration, dependency, partnership, competition, collaboration.",
      "Prefer diverse kinds (not all keywords). Use lowercase names and keep them concise (1-3 words).",
      "Content:\n\n" + text.slice(0, 6000),
    ].join("\n\n");

    const resp = await client.chat.completions.create({
      model: "gpt-5-nano",
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    });

    const raw = resp.choices?.[0]?.message?.content?.trim();
    if (!raw) throw new Error("AI returned empty response");

    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      throw new Error("AI did not return valid JSON");
    }

    // Support both the requested { tags: [...] } and legacy top-level arrays
    const candidate = Array.isArray(json) ? { tags: json } : json;
    const validated = TagsResponseSchema.safeParse(candidate);
    if (!validated.success) {
      throw new Error("AI returned JSON that did not match the expected schema");
    }

    const items = validated.data.tags;
    const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
    const suggested = items
      .map((t, i: number) => {
        const name = typeof t.name === "string" ? t.name : String((t as any).name ?? "");
        const kind = typeof t.kind === "string" ? t.kind : undefined; // backend will canonicalize
        const importance =
          typeof t.importance === "number" ? clamp01(t.importance) : clamp01(1 - i / Math.max(1, maxTags));
        return { name, kind, importance };
      })
      .filter((t) => t.name && t.name.trim().length > 0)
      .slice(0, maxTags);

    // Persist via mutation (V8) and return updated tags
    const finalTags: TagReturn = await ctx.runMutation(api.tags.addTagsToDocument, {
      documentId,
      tags: suggested,
    });
    return finalTags;
  },
});
