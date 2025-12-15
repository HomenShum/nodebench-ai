"use node";

/**
 * Executive Brief Generator (Structured Outputs)
 *
 * Produces a strict DailyBriefPayload (3-Act story with evidence + viz artifact)
 * and stores it inside dailyBriefMemories.context.executiveBrief.
 *
 * Key guarantees:
 * - Uses OpenAI Structured Outputs (json_schema, strict: true)
 * - Runs anti-log lint (validateBriefPayload)
 * - Retries once with "rewrite synthesis only" instruction
 * - Falls back deterministically if generation fails
 */

import { v } from "convex/values";
import { action, internalAction } from "../../_generated/server";
import { api, internal } from "../../_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

import OpenAI from "openai";
import { getLlmModel } from "../../../shared/llm/modelCatalog";

import {
  DailyBriefJSONSchema,
  type DailyBriefPayload,
  type Evidence,
  type Signal,
  type Action as BriefAction,
  type VizArtifact,
} from "../../../src/features/research/types/dailyBriefSchema";
import {
  BRIEF_SYSTEM_PROMPT,
  BRIEF_OUTPUT_CONSTRAINTS,
  BRIEF_EXAMPLE_PROMPT,
} from "../../../src/features/research/prompts/briefConstraints";
import {
  parseAndValidateBrief,
  buildRetryPrompt,
} from "../../../src/features/research/utils/briefGenerator";

type FeedItem = {
  sourceId?: string;
  title?: string;
  summary?: string;
  url?: string;
  source?: string;
  type?: string;
  category?: string;
  tags?: string[];
  score?: number;
  publishedAt?: string;
  metrics?: Array<{ label: string; value: string; trend?: "up" | "down" }>;
};

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function safeDateString(dateString: string): string {
  // Expect YYYY-MM-DD; fall back to today in UTC if invalid.
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString;
  return new Date().toISOString().split("T")[0];
}

function safeIso(dateString: string, fallbackHour = 12): string {
  const day = safeDateString(dateString);
  return `${day}T${String(fallbackHour).padStart(2, "0")}:00:00.000Z`;
}

function toEvidence(item: FeedItem, idx: number, dateString: string): Evidence {
  const source = (item.source ?? "Other") as string;
  const title = (item.title ?? `Evidence ${idx + 1}`).slice(0, 240);
  const url = (item.url ?? "").trim();
  const publishedAt =
    typeof item.publishedAt === "string" && item.publishedAt
      ? item.publishedAt
      : safeIso(dateString, 9);
  const score = typeof item.score === "number" ? item.score : undefined;

  return {
    id: `ev-${slugify(source)}-${idx + 1}`,
    source,
    title,
    url: url || `https://example.com/unknown/${slugify(title)}`,
    publishedAt,
    relevance:
      (typeof item.summary === "string" && item.summary.trim().slice(0, 220)) ||
      "Primary source supporting this signal.",
    score,
  };
}

function buildDeterministicBrief(args: {
  dateString: string;
  version?: number;
  sourceSummary?: any;
  feedItems: FeedItem[];
  features?: any[];
}): DailyBriefPayload {
  const dateString = safeDateString(args.dateString);

  const bySource: Record<string, number> =
    args.sourceSummary?.bySource && typeof args.sourceSummary.bySource === "object"
      ? args.sourceSummary.bySource
      : {};
  const topSources = Object.entries(bySource)
    .filter(([, c]) => typeof c === "number" && c > 0)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 6)
    .map(([source, count]) => ({ source, count: count as number }));

  const totalItems =
    typeof args.sourceSummary?.totalItems === "number"
      ? args.sourceSummary.totalItems
      : args.feedItems.length;

  const signalsSource = [...args.feedItems]
    .filter((i) => i && typeof i.title === "string")
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 3);

  const signals: Signal[] = signalsSource.map((item, idx) => {
    const headline = (item.title ?? `Signal ${idx + 1}`).slice(0, 120);
    return {
      id: `sig-${slugify(headline)}-${idx + 1}`,
      headline,
      synthesis:
        (item.summary && item.summary.trim().replace(/https?:\/\/\S+/g, "")) ||
        "This signal appears repeatedly across sources and warrants follow-up to understand second-order effects.",
      evidence: [toEvidence(item, idx, dateString)],
    };
  });

  const actionSeed = Array.isArray(args.features) ? args.features : [];
  const proposedActions: BriefAction[] = actionSeed.slice(0, 4).map((f: any, idx: number) => {
    const label = (f?.name ?? f?.id ?? `Action ${idx + 1}`).toString().slice(0, 80);
    const status =
      f?.status === "passing"
        ? "completed"
        : f?.status === "failing"
          ? "insufficient_data"
          : "proposed";
    const linked = signals[0]?.id ? [signals[0].id] : [];
    const content =
      status === "insufficient_data"
        ? "Not enough validated output is available yet. Rerun this deep dive with additional context."
        : "Investigate this item and summarize implications, risks, and suggested next actions in plain prose.";
    return {
      id: `act-${slugify(label)}-${idx + 1}`,
      label,
      status,
      content,
      linkedSignalIds: linked,
      priority: idx + 1,
    };
  });

  const vizData = topSources.length
    ? topSources.map((s) => ({ source: s.source, count: s.count }))
    : Object.entries(bySource).map(([source, count]) => ({ source, count }));

  const vizArtifact: VizArtifact = {
    intent: "category_compare",
    rationale: "Source volume provides a quick read on where attention is concentrated today.",
    data: vizData as Array<Record<string, unknown>>,
    spec: {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      width: "container",
      height: 160,
      mark: "bar",
      encoding: {
        y: { field: "source", type: "nominal", sort: "-x", axis: { title: null } },
        x: { field: "count", type: "quantitative", axis: { title: "Items" } },
        color: { field: "source", legend: null },
        tooltip: [
          { field: "source", type: "nominal" },
          { field: "count", type: "quantitative" },
        ],
      },
    },
  };

  const trendingTags: string[] = Array.isArray(args.sourceSummary?.topTrending)
    ? (args.sourceSummary.topTrending as string[])
    : [];

  return {
    meta: {
      date: dateString,
      headline: "The Morning Dossier — Executive Brief",
      summary:
        "Today’s intelligence brief distills the most salient signals into evidence-backed narratives and actionable follow-ups.",
      confidence: 55,
      version: args.version,
    },
    actI: {
      title: "Act I: Setup — Coverage & Freshness",
      synthesis: `Coverage spans ${totalItems} items across ${topSources.length || Object.keys(bySource).length || 0} sources. The mix indicates where attention and publishing velocity are concentrated right now.`,
      topSources,
      totalItems,
      sourcesCount: topSources.length || Object.keys(bySource).length || 0,
      latestItemAt: args.feedItems[0]?.publishedAt,
    },
    actII: {
      title: "Act II: Rising Action — Signals",
      synthesis:
        "The feed clusters around a handful of high-signal stories. The signals below are selected for breadth of impact and evidence strength, not just raw engagement.",
      signals,
    },
    actIII: {
      title: "Act III: Deep Dives — Actions",
      synthesis:
        "The follow-ups below convert today’s signals into concrete investigations. Prioritize the items with highest leverage on near-term decisions.",
      actions: proposedActions.length
        ? proposedActions
        : [
            {
              id: "act-generate-followups",
              label: "Generate follow-ups",
              status: "proposed",
              content:
                "Create a short list of deep dives tied to the strongest signals, then execute the top one to produce an executive-ready artifact.",
              linkedSignalIds: signals[0]?.id ? [signals[0].id] : [],
              priority: 1,
            },
          ],
    },
    dashboard: {
      vizArtifact,
      sourceBreakdown: bySource,
      trendingTags,
    },
  };
}

async function callOpenAIStructured(
  args: {
    model: string;
    system: string;
    user: string;
    maxTokens?: number;
    temperature?: number;
  },
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY || process.env.CONVEX_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  const openai = new OpenAI({ apiKey });
  const completion = await openai.chat.completions.create({
    model: args.model,
    messages: [
      { role: "system", content: args.system },
      { role: "user", content: args.user },
    ],
    response_format: { type: "json_schema", json_schema: DailyBriefJSONSchema as any },
    temperature: args.temperature ?? 0.2,
    max_completion_tokens: args.maxTokens ?? 2200,
  });

  return completion.choices[0]?.message?.content ?? "";
}

function validateEvidenceUrlsAgainstFeed(
  brief: DailyBriefPayload,
  allowedUrls: Set<string>,
): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();

  brief.actII?.signals?.forEach((signal, sIdx) => {
    signal?.evidence?.forEach((ev, eIdx) => {
      const url = typeof ev?.url === "string" ? ev.url.trim() : "";
      if (!url) {
        errors.push(`actII.signals[${sIdx}].evidence[${eIdx}].url: Missing`);
        return;
      }
      if (!allowedUrls.has(url)) {
        errors.push(
          `actII.signals[${sIdx}].evidence[${eIdx}].url: Not present in feed context (must reference provided feed items)`,
        );
      }
      if (seen.has(url)) {
        errors.push(
          `actII.signals[${sIdx}].evidence[${eIdx}].url: Duplicate evidence URL (dedupe across signals)`,
        );
      }
      seen.add(url);
    });
  });

  return errors;
}

export const generateExecutiveBriefForMemoryInternal = internalAction({
  args: {
    memoryId: v.id("dailyBriefMemories"),
    forceRefresh: v.optional(v.boolean()),
    model: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<any> => {
    const memory: any = await ctx.runQuery(
      internal.domains.research.dailyBriefMemoryQueries.getMemoryByIdInternal,
      { memoryId: args.memoryId },
    );
    if (!memory) throw new Error("Daily brief memory not found");

    const existing = (memory.context as any)?.executiveBrief as DailyBriefPayload | undefined;
    if (!args.forceRefresh && existing?.meta?.date === memory.dateString) {
      return { ok: true, cached: true, brief: existing };
    }

    const dayStart = `${memory.dateString}T00:00:00.000Z`;
    const dayEnd = `${memory.dateString}T23:59:59.999Z`;

    let feedItems: FeedItem[] = await ctx.runQuery(api.feed.getRecent, {
      limit: 80,
      from: dayStart,
      to: dayEnd,
    });

    if (feedItems.length < 12) {
      const fromMs = new Date(dayStart).getTime() - 3 * 24 * 60 * 60 * 1000;
      const from = new Date(fromMs).toISOString();
      feedItems = await ctx.runQuery(api.feed.getRecent, {
        limit: 120,
        from,
        to: dayEnd,
      });
    }

    const taskResults: any[] = await ctx.runQuery(
      api.domains.research.dailyBriefMemoryQueries.listTaskResultsByMemory,
      { memoryId: memory._id },
    );
    const resultsByTaskId = new Map<string, any>();
    taskResults.forEach((r) => {
      if (r?.taskId && !resultsByTaskId.has(r.taskId)) resultsByTaskId.set(r.taskId, r);
    });

    const features: any[] = Array.isArray(memory.features) ? memory.features : [];
    const featuresWithResults = features.map((f) => {
      const result = f?.id ? resultsByTaskId.get(f.id) : null;
      const resultMarkdown =
        typeof result?.resultMarkdown === "string" ? result.resultMarkdown.trim() : "";
      return {
        id: f?.id,
        type: f?.type,
        name: f?.name,
        status: f?.status,
        priority: f?.priority,
        testCriteria: f?.testCriteria,
        notes: f?.notes,
        sourceRefs: f?.sourceRefs,
        resultMarkdown,
      };
    });

    const sourceSummary = (memory.context as any)?.snapshotSummary ?? null;
    const dashboardMetrics = (memory.context as any)?.dashboardMetrics ?? null;

    const context = {
      date: memory.dateString,
      version: memory.version,
      sourceSummary,
      dashboardMetrics,
      feedItems: feedItems
        .slice(0, 30)
        .map((i) => ({
          sourceId: i.sourceId,
          source: i.source,
          type: i.type,
          category: i.category,
          title: i.title,
          summary: i.summary,
          url: i.url,
          score: i.score,
          publishedAt: i.publishedAt,
          tags: i.tags,
          metrics: i.metrics,
        })),
      tasks: featuresWithResults.slice(0, 20),
    };

    const allowedEvidenceUrls = new Set<string>(
      (context.feedItems || [])
        .map((i: any) => (typeof i?.url === "string" ? i.url.trim() : ""))
        .filter(Boolean),
    );

    const system = [BRIEF_SYSTEM_PROMPT, BRIEF_OUTPUT_CONSTRAINTS, BRIEF_EXAMPLE_PROMPT].join("\n\n");
    const model = args.model ?? getLlmModel("analysis", "openai");

    const baseUser = [
      `Generate an executive Daily Brief for ${memory.dateString}.`,
      "",
      "Use ONLY the provided feed items as evidence. Do not invent URLs or sources.",
      "All synthesis fields must be editorial prose (no bullets, no log lines, no timestamps, no URLs).",
      "Act II signals must each include 1-5 evidence objects from the feed items (evidence.url must match).",
      "Act III actions must NEVER include failure strings; use status=\"insufficient_data\" with an explanation instead.",
      "",
      "CONTEXT JSON:",
      JSON.stringify(context, null, 2),
    ].join("\n");

    let json = "";
    let parsed: DailyBriefPayload | null = null;
    let validation: any = null;

    try {
      json = await callOpenAIStructured({
        model,
        system,
        user: baseUser,
        maxTokens: 2600,
        temperature: 0.2,
      });
      const first = parseAndValidateBrief(json);
      parsed = first.payload;
      validation = first.validation;

      if (parsed) {
        const evidenceUrlErrors = validateEvidenceUrlsAgainstFeed(parsed, allowedEvidenceUrls);
        if (evidenceUrlErrors.length > 0) {
          parsed = null;
          validation = {
            valid: false,
            errors: [...(first.validation?.errors ?? []), ...evidenceUrlErrors],
            warnings: first.validation?.warnings ?? [],
          };
        }
      }

      if (!parsed) {
        const retryPrompt = [
          buildRetryPrompt(validation ?? first.validation),
          "",
          "Rewrite ONLY the synthesis fields and action contents. Keep evidence objects and IDs unchanged unless required by schema.",
          "",
          "PREVIOUS JSON:",
          json,
          "",
          "CONTEXT JSON:",
          JSON.stringify(context, null, 2),
        ].join("\n");

        json = await callOpenAIStructured({
          model,
          system,
          user: retryPrompt,
          maxTokens: 2600,
          temperature: 0.15,
        });
        const second = parseAndValidateBrief(json);
        parsed = second.payload;
        validation = second.validation;

        if (parsed) {
          const evidenceUrlErrors = validateEvidenceUrlsAgainstFeed(parsed, allowedEvidenceUrls);
          if (evidenceUrlErrors.length > 0) {
            parsed = null;
            validation = {
              valid: false,
              errors: [...(second.validation?.errors ?? []), ...evidenceUrlErrors],
              warnings: second.validation?.warnings ?? [],
            };
          }
        }
      }
    } catch (err: any) {
      console.warn("[executiveBrief] generation failed", err?.message || err);
      validation = { valid: false, errors: [String(err?.message || err)], warnings: [] };
    }

    if (!parsed) {
      parsed = buildDeterministicBrief({
        dateString: memory.dateString,
        version: memory.version,
        sourceSummary: sourceSummary ?? (memory.context as any)?.snapshotSummary,
        feedItems,
        features,
      });
    }

    const generatedAt = Date.now();
    await ctx.runMutation(
      internal.domains.research.dailyBriefMemoryMutations.setExecutiveBrief,
      { memoryId: memory._id, payload: parsed, generatedAt, validation },
    );

    return { ok: true, cached: false, brief: parsed, validation };
  },
});

// Optional public wrapper: requires auth to avoid anonymous LLM spend.
export const generateExecutiveBriefForMemory = action({
  args: {
    memoryId: v.id("dailyBriefMemories"),
    forceRefresh: v.optional(v.boolean()),
    model: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<any> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.runAction(
      internal.domains.research.executiveBrief.generateExecutiveBriefForMemoryInternal,
      args,
    );
  },
});
