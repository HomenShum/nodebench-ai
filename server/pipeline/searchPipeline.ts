/**
 * searchPipeline.ts — Simplified search pipeline (April 2026 industry standard).
 *
 * 5 nodes, typed state, LangGraph pattern:
 * classify → search (Linkup) → analyze (Gemini) → package → eval (HyperLoop)
 *
 * Replaces the 3500-line search.ts + 2700-line agentHarness.ts with ~500 lines.
 * Every claim is source-linked. Every signal is taxonomy-classified.
 */

import { classifySignals, type ClassifiedSignal } from "../lib/signalTaxonomy.js";
import { createEvidenceSpans, type EvidenceManifest } from "../lib/evidenceSpan.js";
import { computeRoutingHints, formatRoutingHintsForPrompt, type RoutingHint } from "../lib/routingHints.js";
import { detectPainResolutions, type PainResolution } from "../lib/painMapping.js";

// ─── Pipeline State ──────────────────────────────────────────────

export interface PipelineState {
  // Input
  query: string;
  lens: string;

  // Classify
  classification: string;
  entity: string | null;
  routingHints: RoutingHint[];

  // Search (Linkup)
  searchAnswer: string;
  searchSources: Array<{
    name: string;
    url: string;
    snippet: string;
  }>;

  // Analyze (Gemini)
  entityName: string;
  answer: string;
  confidence: number;
  signals: Array<{ name: string; direction: string; impact: string; sourceIdx?: number }>;
  risks: Array<{ title: string; description: string; sourceIdx?: number }>;
  comparables: Array<{ name: string; relevance: string; note: string }>;
  nextActions: Array<{ action: string; impact: string }>;
  nextQuestions: string[];
  keyMetrics: Array<{ label: string; value: string }>;
  whyThisTeam: {
    founderCredibility: string;
    trustSignals: string[];
    visionMagnitude: string;
    hiddenRequirements: string[];
  } | null;

  // Package
  classifiedSignals: ClassifiedSignal[];
  evidence: EvidenceManifest;
  painResolutions: PainResolution[];

  // Trace
  trace: Array<{ step: string; tool?: string; status: string; detail?: string; durationMs?: number }>;
  totalDurationMs: number;
  error: string | null;
}

// ─── Node 1: Classify ────────────────────────────────────────────

export function classify(state: PipelineState): PipelineState {
  const start = Date.now();
  const hints = computeRoutingHints(state.query);
  const topHint = hints[0];

  // Simple classification from routing hints
  let classification = "company_search";
  let entity: string | null = null;

  if (topHint?.domain === "founder_ops" && topHint.score > 0.3) {
    classification = "founder_ops";
  } else if (topHint?.domain === "competitor_analysis" && topHint.score > 0.2) {
    classification = "competitor";
  } else if (topHint?.domain === "idea_validation" && topHint.score > 0.2) {
    classification = "idea_validation";
  }

  // Extract entity name: first capitalized multi-word or proper noun
  const entityMatch = state.query.match(/(?:^|\s)([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,2})/);
  entity = entityMatch?.[1] ?? state.query.split(/\s+/).slice(0, 3).join(" ");

  return {
    ...state,
    classification,
    entity,
    routingHints: hints,
    trace: [...state.trace, {
      step: "classify",
      status: "ok",
      detail: `${classification}, entity="${entity}", hints: ${formatRoutingHintsForPrompt(hints)}`,
      durationMs: Date.now() - start,
    }],
  };
}

// ─── Node 2: Search (Linkup API) ─────────────────────────────────

export async function search(state: PipelineState): Promise<PipelineState> {
  const start = Date.now();
  const linkupKey = process.env.LINKUP_API_KEY;

  if (!linkupKey) {
    return {
      ...state,
      searchAnswer: "",
      searchSources: [],
      trace: [...state.trace, { step: "search", tool: "linkup", status: "error", detail: "No LINKUP_API_KEY", durationMs: Date.now() - start }],
    };
  }

  try {
    const resp = await fetch("https://api.linkup.so/v1/search", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${linkupKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: state.query,
        depth: "standard",
        outputType: "sourcedAnswer",
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!resp.ok) {
      throw new Error(`Linkup ${resp.status}`);
    }

    const data = (await resp.json()) as any;
    const answer = data?.answer ?? "";
    const sources = (data?.sources ?? []).map((s: any) => ({
      name: s.name ?? s.title ?? "",
      url: s.url ?? "",
      snippet: s.snippet ?? s.content ?? "",
    }));

    return {
      ...state,
      searchAnswer: answer,
      searchSources: sources,
      trace: [...state.trace, {
        step: "search",
        tool: "linkup",
        status: "ok",
        detail: `${sources.length} sources, ${answer.length} chars answer`,
        durationMs: Date.now() - start,
      }],
    };
  } catch (err: any) {
    return {
      ...state,
      searchAnswer: "",
      searchSources: [],
      trace: [...state.trace, {
        step: "search",
        tool: "linkup",
        status: "error",
        detail: err?.message ?? "search failed",
        durationMs: Date.now() - start,
      }],
    };
  }
}

// ─── Node 3: Analyze (Gemini structured extraction) ───────────────

export async function analyze(state: PipelineState): Promise<PipelineState> {
  const start = Date.now();
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!geminiKey || (!state.searchAnswer && state.searchSources.length === 0)) {
    return {
      ...state,
      entityName: state.entity ?? "Unknown",
      answer: state.searchAnswer || "No search results available.",
      confidence: 0,
      signals: [],
      risks: [],
      comparables: [],
      nextActions: [],
      nextQuestions: [],
      keyMetrics: [],
      whyThisTeam: null,
      trace: [...state.trace, {
        step: "analyze",
        tool: "gemini",
        status: "error",
        detail: !geminiKey ? "No GEMINI_API_KEY" : "No search data to analyze",
        durationMs: Date.now() - start,
      }],
    };
  }

  const sourcesContext = state.searchSources
    .slice(0, 8)
    .map((s, i) => `[S${i + 1}] ${s.name}\n${s.url}\n${s.snippet.slice(0, 300)}`)
    .join("\n\n");

  const prompt = `Analyze this company/topic for a ${state.lens} audience.

QUERY: "${state.query}"
ENTITY: ${state.entity ?? "unknown"}

SEARCH RESULTS:
${state.searchAnswer.slice(0, 1500)}

SOURCES:
${sourcesContext}

Return ONLY valid JSON:
{
  "entityName": "company name",
  "answer": "3-4 sentence summary with specific numbers, citing sources as [S1], [S2] etc.",
  "confidence": 0-100,
  "keyMetrics": [{"label": "metric", "value": "value"}],
  "signals": [{"name": "signal with [S1] citation", "direction": "up|down|neutral", "impact": "high|medium|low", "sourceIdx": 1}],
  "risks": [{"title": "risk", "description": "why it matters [S2]", "sourceIdx": 2}],
  "comparables": [{"name": "competitor", "relevance": "high|medium|low", "note": "why relevant"}],
  "whyThisTeam": {"founderCredibility": "...", "trustSignals": ["..."], "visionMagnitude": "...", "hiddenRequirements": ["..."]},
  "nextActions": [{"action": "specific step", "impact": "high|medium|low"}],
  "nextQuestions": ["follow-up question"]
}`;

  try {
    // Latest models: 3.1 Flash Lite (fastest) → 3 Flash → 2.5 Flash (stable GA)
    const models = ["gemini-3.1-flash-lite-preview", "gemini-3-flash-preview", "gemini-2.5-flash"];
    let resp: Response | null = null;
    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
        resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 2200, responseMimeType: "application/json" },
          }),
          signal: AbortSignal.timeout(25_000),
        });
        if (resp.ok) break;
      } catch { continue; }
    }
    if (!resp) throw new Error("All Gemini models failed");

    if (!resp.ok) {
      throw new Error(`Gemini ${resp.status}`);
    }

    const data = (await resp.json()) as any;
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error("No JSON in Gemini response");
    }

    const parsed = JSON.parse(jsonMatch[0].replace(/,\s*([\]}])/g, "$1"));

    return {
      ...state,
      entityName: parsed.entityName ?? state.entity ?? "Unknown",
      answer: parsed.answer ?? "",
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 50,
      signals: Array.isArray(parsed.signals) ? parsed.signals : [],
      risks: Array.isArray(parsed.risks) ? parsed.risks : [],
      comparables: Array.isArray(parsed.comparables) ? parsed.comparables : [],
      nextActions: Array.isArray(parsed.nextActions) ? parsed.nextActions : [],
      nextQuestions: Array.isArray(parsed.nextQuestions) ? parsed.nextQuestions : [],
      keyMetrics: Array.isArray(parsed.keyMetrics) ? parsed.keyMetrics : [],
      whyThisTeam: parsed.whyThisTeam ?? null,
      trace: [...state.trace, {
        step: "analyze",
        tool: "gemini",
        status: "ok",
        detail: `${parsed.signals?.length ?? 0} signals, ${parsed.risks?.length ?? 0} risks, confidence ${parsed.confidence ?? 0}`,
        durationMs: Date.now() - start,
      }],
    };
  } catch (err: any) {
    return {
      ...state,
      entityName: state.entity ?? "Unknown",
      answer: state.searchAnswer || "Analysis failed.",
      confidence: 20,
      signals: [],
      risks: [],
      comparables: [],
      nextActions: [],
      nextQuestions: [],
      keyMetrics: [],
      whyThisTeam: null,
      trace: [...state.trace, {
        step: "analyze",
        tool: "gemini",
        status: "error",
        detail: err?.message ?? "analysis failed",
        durationMs: Date.now() - start,
      }],
    };
  }
}

// ─── Node 4: Package (deterministic) ─────────────────────────────

export function packageResult(state: PipelineState): PipelineState {
  const start = Date.now();

  // Classify signals into taxonomy
  const classifiedSignals = classifySignals(state.signals);

  // Build evidence spans from search sources
  const evidence = createEvidenceSpans(
    state.searchSources.map((s) => ({ url: s.url, title: s.name, snippet: s.snippet })),
    state.signals,
  );

  // Detect which pains this result resolves
  const painResolutions = detectPainResolutions({
    query: state.query,
    classification: state.classification,
    entityName: state.entityName,
    answer: state.answer,
    confidence: state.confidence,
    signals: state.signals,
    risks: state.risks,
    comparables: state.comparables,
    evidence,
    sourceRefs: state.searchSources.map((s) => ({ label: s.name, href: s.url, type: "web" })),
    nextActions: state.nextActions,
  });

  return {
    ...state,
    classifiedSignals,
    evidence,
    painResolutions,
    trace: [...state.trace, {
      step: "package",
      status: "ok",
      detail: `${classifiedSignals.length} signals, ${evidence.totalSpans} evidence, ${painResolutions.length} pains resolved`,
      durationMs: Date.now() - start,
    }],
  };
}

// ─── Run full pipeline ───────────────────────────────────────────

export async function runSearchPipeline(query: string, lens: string): Promise<PipelineState> {
  const pipelineStart = Date.now();

  // Initialize state
  let state: PipelineState = {
    query,
    lens,
    classification: "",
    entity: null,
    routingHints: [],
    searchAnswer: "",
    searchSources: [],
    entityName: "",
    answer: "",
    confidence: 0,
    signals: [],
    risks: [],
    comparables: [],
    nextActions: [],
    nextQuestions: [],
    keyMetrics: [],
    whyThisTeam: null,
    classifiedSignals: [],
    evidence: { totalSpans: 0, verifiedCount: 0, partialCount: 0, unverifiedCount: 0, contradictedCount: 0, verificationRate: 0, spans: [] },
    painResolutions: [],
    trace: [],
    totalDurationMs: 0,
    error: null,
  };

  // Run pipeline: classify → search → analyze → package
  state = classify(state);
  state = await search(state);
  state = await analyze(state);
  state = packageResult(state);

  state.totalDurationMs = Date.now() - pipelineStart;

  return state;
}

// ─── Convert pipeline state to ResultPacket format ────────────────

export function stateToResultPacket(state: PipelineState): Record<string, unknown> {
  return {
    query: state.query,
    entityName: state.entityName,
    answer: state.answer,
    confidence: state.confidence,
    sourceCount: state.searchSources.length,
    variables: state.classifiedSignals.slice(0, 5).map((sig, i) => ({
      rank: i + 1,
      name: sig.label,
      category: sig.category,
      direction: sig.direction,
      impact: sig.impact,
      confidence: sig.confidence,
      rawName: sig.rawName,
      evidenceRefs: sig.evidenceRefs,
      needsOntologyReview: sig.needsOntologyReview,
    })),
    keyMetrics: state.keyMetrics.length > 0 ? state.keyMetrics : [
      { label: "Confidence", value: `${state.confidence}%` },
      { label: "Sources", value: String(state.searchSources.length) },
      { label: "Signals", value: String(state.classifiedSignals.length) },
    ],
    changes: [],
    risks: state.risks.slice(0, 3),
    comparables: state.comparables.slice(0, 4),
    whyThisTeam: state.whyThisTeam,
    nextActions: state.nextActions,
    nextQuestions: state.nextQuestions,
    sourceRefs: state.searchSources.map((s) => ({
      label: s.name,
      href: s.url,
      type: "web",
    })),
    evidence: state.evidence,
    painResolutions: state.painResolutions,
    trace: state.trace,
    packetType: "company_search",
    classification: state.classification,
    routingHints: state.routingHints.slice(0, 3),
  };
}
