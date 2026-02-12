"use node";

/**
 * Agentic Competing Explanations Generator (Phase 7)
 *
 * Fully agentic action that takes digest data (signals, fact-checks, entities)
 * and generates 3 competing explanations with:
 *   - Boolean evidence checklist (deterministic confidence)
 *   - Falsification criteria (what would disprove each)
 *   - Narrative framing (what's dominating attention vs what matters)
 *
 * Called by the daily LinkedIn post workflow AFTER digest generation.
 * Returns structured data injected into AgentDigestOutput.competingExplanations.
 *
 * @module domains/narrative/actions/competingExplanations
 */

import { v } from "convex/values";
import { generateText } from "ai";
import { internalAction } from "../../../_generated/server";
import { getLanguageModelSafe } from "../../agents/mcp_tools/models";
import { executeWithModelFallback } from "../../agents/mcp_tools/models/modelResolver";
import type { ApprovedModel } from "../../agents/mcp_tools/models/modelResolver";
import type { EvidenceChecklist } from "../validators";
import {
  deriveEvidenceLevel,
  countPassingChecks,
} from "../validators";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CompetingExplanation {
  title: string;
  explanation: string;
  evidenceLevel: "grounded" | "mixed" | "speculative";
  evidenceChecklist: EvidenceChecklist;
  checksPassing: number;
  checksTotal: number;
  measurementApproach: string;
  falsificationCriteria: string;
}

export interface NarrativeFraming {
  dominantStory: string;
  attentionShare: string;
  underReportedAngle: string;
}

export interface CompetingExplanationsResult {
  explanations: CompetingExplanation[];
  framing: NarrativeFraming | null;
}

// ─── Prompt Builder ──────────────────────────────────────────────────────────

function buildPrompt(input: {
  signals: Array<{ title: string; summary?: string; hardNumbers?: string; url?: string }>;
  factChecks: Array<{ claim: string; status: string; source?: string }>;
  entities: Array<{ name: string; keyInsight: string }>;
  narrativeThesis?: string;
}): string {
  const signalBlock = input.signals
    .slice(0, 6)
    .map((s, i) => {
      let line = `${i + 1}. ${s.title}`;
      if (s.hardNumbers) line += ` (${s.hardNumbers})`;
      if (s.summary) line += `\n   ${s.summary}`;
      if (s.url) line += `\n   Source: ${s.url}`;
      return line;
    })
    .join("\n");

  const factCheckBlock = input.factChecks.length > 0
    ? input.factChecks
        .slice(0, 4)
        .map((f) => `- [${f.status.toUpperCase()}] ${f.claim}${f.source ? ` (${f.source})` : ""}`)
        .join("\n")
    : "No fact-checks available.";

  const entityBlock = input.entities.length > 0
    ? input.entities
        .slice(0, 3)
        .map((e) => `- ${e.name}: ${e.keyInsight}`)
        .join("\n")
    : "";

  return `You are a narrative intelligence analyst. Your job is to identify COMPETING EXPLANATIONS for what's happening in the news right now.

Given today's signals and fact-checks, produce exactly 3 competing explanations. Each explanation is a different way to read the same set of facts. They should genuinely compete -- a reader who believes explanation 1 would draw different conclusions than one who believes explanation 2.

TODAY'S SIGNALS:
${signalBlock}

FACT-CHECK RESULTS:
${factCheckBlock}
${entityBlock ? `\nKEY ENTITIES:\n${entityBlock}` : ""}
${input.narrativeThesis ? `\nNARRATIVE THESIS: ${input.narrativeThesis}` : ""}

For each explanation, evaluate these 6 boolean evidence checks:
- hasPrimarySource: Is there a tier-1 or tier-2 source? (government filing, court document, SEC, wire service like Reuters/AP/Bloomberg, peer-reviewed research)
- hasCorroboration: Do 2 or more independent sources agree on the core claim?
- hasFalsifiableClaim: Is there a specific, defined way to disprove this explanation?
- hasQuantitativeData: Are there hard numbers backing this? (not just qualitative assertions)
- hasNamedAttribution: Is there a named expert, official, or organization? (not "sources say" or "experts believe")
- isReproducible: Could someone independently verify this by following the cited sources?

Also identify the DOMINANT STORY in social media right now (the one getting the most attention) and what's being UNDER-REPORTED.

Respond ONLY with valid JSON:
{
  "explanations": [
    {
      "title": "short name for this explanation (3-6 words)",
      "explanation": "1-2 sentence explanation a LinkedIn reader would understand without jargon. No H1/H2/H3 labels.",
      "evidenceChecklist": {
        "hasPrimarySource": true/false,
        "hasCorroboration": true/false,
        "hasFalsifiableClaim": true/false,
        "hasQuantitativeData": true/false,
        "hasNamedAttribution": true/false,
        "isReproducible": true/false
      },
      "measurementApproach": "How would you measure whether this explanation is correct? Be specific.",
      "falsificationCriteria": "What specific evidence would disprove this explanation? Write as: 'This weakens if [specific observable condition]'"
    }
  ],
  "framing": {
    "dominantStory": "what topic is dominating social feeds right now (brief description)",
    "attentionShare": "rough percentage like '80%' or '90%'",
    "underReportedAngle": "what's actually important but getting buried (brief, connects to the signals above)"
  }
}`;
}

// ─── Response Parser ────────────────────────────────────────────────────────

function parseResponse(text: string): CompetingExplanationsResult | null {
  try {
    let jsonStr = text;
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenced) jsonStr = fenced[1].trim();
    const arrMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (arrMatch) jsonStr = arrMatch[0];

    const parsed = JSON.parse(jsonStr);

    if (!parsed.explanations || !Array.isArray(parsed.explanations)) return null;

    const explanations: CompetingExplanation[] = parsed.explanations
      .slice(0, 3)
      .map((e: any) => {
        const checklist: EvidenceChecklist = {
          hasPrimarySource: !!e.evidenceChecklist?.hasPrimarySource,
          hasCorroboration: !!e.evidenceChecklist?.hasCorroboration,
          hasFalsifiableClaim: !!e.evidenceChecklist?.hasFalsifiableClaim,
          hasQuantitativeData: !!e.evidenceChecklist?.hasQuantitativeData,
          hasNamedAttribution: !!e.evidenceChecklist?.hasNamedAttribution,
          isReproducible: !!e.evidenceChecklist?.isReproducible,
        };

        return {
          title: String(e.title || "Unnamed explanation").slice(0, 60),
          explanation: String(e.explanation || "").slice(0, 200),
          evidenceLevel: deriveEvidenceLevel(checklist),
          evidenceChecklist: checklist,
          checksPassing: countPassingChecks(checklist),
          checksTotal: 6,
          measurementApproach: String(e.measurementApproach || "").slice(0, 200),
          falsificationCriteria: String(e.falsificationCriteria || "No falsification criteria defined").slice(0, 200),
        };
      });

    let framing: NarrativeFraming | null = null;
    if (parsed.framing && parsed.framing.dominantStory) {
      framing = {
        dominantStory: String(parsed.framing.dominantStory).slice(0, 100),
        attentionShare: String(parsed.framing.attentionShare || "80%").slice(0, 10),
        underReportedAngle: String(parsed.framing.underReportedAngle || "").slice(0, 200),
      };
    }

    return { explanations, framing };
  } catch (e) {
    console.error("[CompetingExplanations] Failed to parse LLM response:", e);
    return null;
  }
}

// ─── Public Action ───────────────────────────────────────────────────────────

/**
 * Generate competing explanations from digest data.
 *
 * Fully agentic: takes raw digest signals + fact-checks, produces structured
 * competing explanations with deterministic boolean evidence grading.
 */
export const generateCompetingExplanations = internalAction({
  args: {
    signals: v.array(v.object({
      title: v.string(),
      summary: v.optional(v.string()),
      hardNumbers: v.optional(v.string()),
      url: v.optional(v.string()),
    })),
    factChecks: v.array(v.object({
      claim: v.string(),
      status: v.string(),
      source: v.optional(v.string()),
    })),
    entities: v.array(v.object({
      name: v.string(),
      keyInsight: v.string(),
    })),
    narrativeThesis: v.optional(v.string()),
    model: v.optional(v.string()),
  },
  returns: v.object({
    explanations: v.array(v.object({
      title: v.string(),
      explanation: v.string(),
      evidenceLevel: v.union(v.literal("grounded"), v.literal("mixed"), v.literal("speculative")),
      evidenceChecklist: v.object({
        hasPrimarySource: v.boolean(),
        hasCorroboration: v.boolean(),
        hasFalsifiableClaim: v.boolean(),
        hasQuantitativeData: v.boolean(),
        hasNamedAttribution: v.boolean(),
        isReproducible: v.boolean(),
      }),
      checksPassing: v.number(),
      checksTotal: v.number(),
      measurementApproach: v.string(),
      falsificationCriteria: v.string(),
    })),
    framing: v.union(
      v.object({
        dominantStory: v.string(),
        attentionShare: v.string(),
        underReportedAngle: v.string(),
      }),
      v.null(),
    ),
    error: v.optional(v.string()),
  }),
  handler: async (_ctx, args) => {
    const modelId = args.model || "qwen3-coder-free";

    if (args.signals.length === 0) {
      console.log("[CompetingExplanations] No signals provided, skipping");
      return { explanations: [], framing: null, error: "No signals" };
    }

    console.log(`[CompetingExplanations] Generating from ${args.signals.length} signals, ${args.factChecks.length} fact-checks, startModel=${modelId}`);

    const prompt = buildPrompt({
      signals: args.signals,
      factChecks: args.factChecks,
      entities: args.entities,
      narrativeThesis: args.narrativeThesis,
    });

    try {
      const { result: text, modelUsed, isFree, fallbacksUsed } = await executeWithModelFallback(
        async (model) => {
          const r = await generateText({ model, prompt, temperature: 0.3 });
          return r.text;
        },
        {
          startModel: modelId as ApprovedModel,
          onFallback: (from, to, err) => {
            console.warn(`[CompetingExplanations] Model ${from} failed (${err.message}), falling back to ${to}`);
          },
        }
      );

      console.log(`[CompetingExplanations] LLM responded (model=${modelUsed}, free=${isFree}, fallbacks=${fallbacksUsed})`);

      const parsed = parseResponse(text);
      if (!parsed || parsed.explanations.length === 0) {
        console.warn("[CompetingExplanations] LLM returned no valid explanations");
        return { explanations: [], framing: null, error: "Parse failure" };
      }

      // Log evidence grades
      for (const e of parsed.explanations) {
        console.log(`[CompetingExplanations] "${e.title}" -> ${e.evidenceLevel} (${e.checksPassing}/${e.checksTotal} checks)`);
      }

      return {
        explanations: parsed.explanations,
        framing: parsed.framing,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[CompetingExplanations] All models failed:", msg);
      return { explanations: [], framing: null, error: msg };
    }
  },
});
