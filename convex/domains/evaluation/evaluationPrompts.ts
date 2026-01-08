/**
 * Evaluation Prompts - Model-Specific Variants
 *
 * The standard evaluation prompt is 2000+ tokens and designed for GPT-5.2.
 * Cheaper models (Haiku, Gemini Flash, GPT-5 Mini) need simplified versions.
 */

export type PromptComplexity = "full" | "standard" | "minimal";

export interface EvaluationPromptConfig {
  complexity: PromptComplexity;
  tokenEstimate: number;
  description: string;
}

/**
 * Determine appropriate prompt complexity for a model
 */
export function getPromptComplexityForModel(model: string): PromptComplexity {
  const normalized = model.toLowerCase();

  // Full complexity for flagship models
  if (normalized.includes("gpt-5.2") && !normalized.includes("mini")) {
    return "full";
  }
  if (normalized.includes("claude-opus") || normalized.includes("claude-sonnet-4")) {
    return "full";
  }

  // Minimal complexity for budget models
  if (normalized.includes("mini") || normalized.includes("flash")) {
    return "minimal";
  }

  // Standard for mid-tier models
  if (normalized.includes("haiku") || normalized.includes("pro")) {
    return "standard";
  }

  // Default to standard
  return "standard";
}

/**
 * FULL COMPLEXITY - For GPT-5.2, Claude Opus, Claude Sonnet 4
 * ~2000 tokens, comprehensive schema with all fields
 */
export const FULL_EVALUATION_PROMPT = `EVALUATION MODE (machine-readable debrief required):
After your normal human-readable answer, append EXACTLY one JSON object wrapped like this:
[DEBRIEF_V1_JSON]
{
  "schemaVersion": "debrief_v1",
  "persona": { "inferred": "JPM_STARTUP_BANKER", "confidence": 0.0, "assumptions": [] },
  "clarifyingQuestionsAsked": 0,
  "clarifyingQuestions": [],
  "entity": {
    "input": "",
    "resolvedId": null,
    "canonicalName": null,
    "type": null,
    "confidence": 0.0,
    "candidates": []
  },
  "planSteps": [],
  "toolsUsed": [{ "name": "", "ok": true, "error": null }],
  "fallbacks": [],
  "verdict": "UNKNOWN",
  "keyFacts": {
    "hqLocation": null,
    "funding": {
      "stage": null,
      "amount": { "amount": null, "currency": null, "unit": null },
      "date": null,
      "coLeads": []
    },
    "people": { "founders": [], "ceo": null },
    "product": { "platform": null, "leadPrograms": [] },
    "contact": { "email": null, "channel": null },
    "freshness": { "ageDays": null }
  },
  "risks": [],
  "nextActions": [],
  "grounding": []
}
[/DEBRIEF_V1_JSON]

Rules:
- The JSON must be valid (no trailing commas, no markdown fences).
- The [DEBRIEF_V1_JSON] block MUST contain the DebriefV1 schemaVersion=debrief_v1 exactly. If you output any other JSON (e.g., a UI card), put it OUTSIDE the DEBRIEF_V1_JSON block.
- Use ONLY the 10 personas in our system (see audit_mocks.ts): JPM_STARTUP_BANKER, EARLY_STAGE_VC, CTO_TECH_LEAD, FOUNDER_STRATEGY, ACADEMIC_RD, ENTERPRISE_EXEC, ECOSYSTEM_PARTNER, QUANT_ANALYST, PRODUCT_DESIGNER, SALES_ENGINEER.
- Persona inference is REQUIRED: set persona.inferred to the best-fit persona for the USER REQUEST (do not leave the template value unless it truly matches).
- Persona cue map (use the first strong match): wedge/thesis/comps/market => EARLY_STAGE_VC; signal/metrics/what to track/timeline/time-series => QUANT_ANALYST; schema/UI card/rendering => PRODUCT_DESIGNER; share-ready/one-screen/outbound/objections/CTA => SALES_ENGINEER; risk exposure/CVE/patch plan/upgrade => CTO_TECH_LEAD; partnerships/second-order effects => ECOSYSTEM_PARTNER; positioning/pivot/strategy => FOUNDER_STRATEGY; pricing/cost/standardize/vendor/procurement/P&L => ENTERPRISE_EXEC; literature/methodology => ACADEMIC_RD; outreach/contacts/pipeline/this week => JPM_STARTUP_BANKER.
- If persona was not explicitly stated by the user, persona.assumptions MUST include at least 1 short string explaining why you chose that persona.
- If you ask any clarifying question in your human-readable answer, set clarifyingQuestionsAsked and include the exact question text(s) in clarifyingQuestions. Ask at most 1 clarifier unless the user explicitly requests an interview.
- If GROUND_TRUTH_INJECTED is false and the request appears to be about an evaluation/synthetic entity (e.g., DISCO, AMBROS, MQUICKJS, OPEN-AUTOGLM, SOUNDCLOUD, SALESFORCE, ALZHEIMERS, GEMINI_3), call lookupGroundTruthEntity BEFORE answering and cite the returned {{fact:ground_truth:...}} anchor.
- Evaluation runs are non-interactive: do NOT call askHuman. If uncertain, proceed with best guess and state your assumption.
- Entity parsing: if the USER REQUEST starts with "<ENTITY> —" or "<ENTITY> -", treat <ENTITY> as the entity.input and pass that exact string to lookupGroundTruthEntity.
- Use null for unknown fields; do not guess.
- planSteps MUST include at least 1 explicit verification step (e.g., 'Verify: freshness window + contradictions + sources') and your human-readable answer should reflect that verification happened.
- verdict MUST be exactly one of: PASS, FAIL, UNKNOWN.
- grounding[] MUST include at least 1 ground-truth anchor you used (e.g., {{fact:ground_truth:DISCO}}).
- nextActions MUST contain >= 3 items (even for PRODUCT_DESIGNER: actions can be 'rendering validation', 'QA checklist', etc.).
- If you call lookupGroundTruthEntity and it returns an HQ/location, you MUST copy it into keyFacts.hqLocation (do not leave it null).`;

/**
 * STANDARD COMPLEXITY - For Claude Haiku, Gemini Pro
 * ~1000 tokens, simplified schema with core fields
 */
export const STANDARD_EVALUATION_PROMPT = `EVALUATION MODE - Respond with your analysis PLUS a structured JSON block:

1. First, write your normal analysis (2-3 paragraphs)
2. Then append this EXACT format:

[DEBRIEF_V1_JSON]
{
  "schemaVersion": "debrief_v1",
  "persona": { "inferred": "<INFER_FROM_QUERY>", "confidence": 0.8 },
  "entity": { "input": "<ENTITY>", "canonicalName": "<NAME>", "type": "company" },
  "planSteps": ["Step 1", "Step 2", "Verify results"],
  "toolsUsed": [{ "name": "lookupGroundTruthEntity", "ok": true }],
  "verdict": "PASS",
  "keyFacts": {
    "hqLocation": "<city, country>",
    "funding": { "stage": "Seed", "amount": { "amount": 36, "currency": "EUR", "unit": "M" }},
    "people": { "founders": ["Name"], "ceo": "Name" },
    "contact": { "email": "email@company.com" }
  },
  "nextActions": ["Action 1", "Action 2", "Action 3"],
  "grounding": ["{{fact:ground_truth:ENTITY_ID}}"]
}
[/DEBRIEF_V1_JSON]

CRITICAL RULES:
1. **PERSONA INFERENCE IS REQUIRED** - Analyze the query and pick the best match:
   - "wedge"/"thesis"/"comps"/"market" → EARLY_STAGE_VC
   - "signal"/"metrics"/"track"/"time-series" → QUANT_ANALYST
   - "schema"/"UI"/"card"/"rendering" → PRODUCT_DESIGNER
   - "share-ready"/"one-screen"/"objections" → SALES_ENGINEER
   - "CVE"/"security"/"patch"/"upgrade" → CTO_TECH_LEAD
   - "partnerships"/"ecosystem"/"effects" → ECOSYSTEM_PARTNER
   - "positioning"/"strategy"/"pivot" → FOUNDER_STRATEGY
   - "pricing"/"vendor"/"cost"/"procurement" → ENTERPRISE_EXEC
   - "papers"/"methodology"/"literature" → ACADEMIC_RD
   - "outreach"/"pipeline"/"this week" → JPM_STARTUP_BANKER

2. **DO NOT default to JPM_STARTUP_BANKER** - Only use it when query explicitly mentions banker-related terms

3. For evaluation entities (DISCO, Ambros, QuickJS, OpenAutoGLM, SoundCloud, Salesforce, Alzheimer's, Gemini 3): ALWAYS call lookupGroundTruthEntity FIRST

4. The JSON MUST be valid - no trailing commas, proper quotes

5. Use null for unknown fields - DO NOT GUESS

6. nextActions needs at least 3 items

7. grounding[] must cite {{fact:ground_truth:...}} if you used ground truth`;;

/**
 * MINIMAL COMPLEXITY - For GPT-5 Mini, Gemini Flash
 * ~400 tokens, bare minimum schema
 */
export const MINIMAL_EVALUATION_PROMPT = `EVALUATION FORMAT REQUIRED:

Write your answer, then add this JSON block:

[DEBRIEF_V1_JSON]
{
  "schemaVersion": "debrief_v1",
  "persona": { "inferred": "<INFER_FROM_QUERY>", "confidence": 0.8 },
  "entity": { "input": "<ENTITY_NAME>", "canonicalName": "<FULL_NAME>" },
  "planSteps": ["Lookup ground truth", "Verify facts", "Format response"],
  "toolsUsed": [{ "name": "lookupGroundTruthEntity", "ok": true }],
  "verdict": "PASS",
  "keyFacts": {
    "hqLocation": "<city, country>",
    "funding": { "stage": "<stage>", "amount": { "amount": null, "currency": null, "unit": null }},
    "contact": { "email": "<email@company.com or null>" }
  },
  "nextActions": ["Action 1", "Action 2", "Action 3"],
  "grounding": ["{{fact:ground_truth:<ENTITY_ID>}}"]
}
[/DEBRIEF_V1_JSON]

**PERSONA INFERENCE IS REQUIRED** - You MUST analyze the user query and pick the correct persona:

| Query Keywords | → Persona |
|----------------|-----------|
| wedge, thesis, comps, market fit | EARLY_STAGE_VC |
| signal, metrics, track, time-series | QUANT_ANALYST |
| schema, UI, card, rendering | PRODUCT_DESIGNER |
| share-ready, one-screen, objections | SALES_ENGINEER |
| CVE, security, patch, upgrade | CTO_TECH_LEAD |
| partnerships, ecosystem, effects | ECOSYSTEM_PARTNER |
| positioning, strategy, pivot | FOUNDER_STRATEGY |
| pricing, vendor, cost, procurement | ENTERPRISE_EXEC |
| papers, methodology, literature | ACADEMIC_RD |
| outreach, pipeline, "this week" | JPM_STARTUP_BANKER |

**DO NOT default to JPM_STARTUP_BANKER** unless the query explicitly mentions outreach, pipeline, or banker-related terms.

IMPORTANT:
1. For DISCO, Ambros, QuickJS, OpenAutoGLM, SoundCloud, Salesforce, Alzheimer's, Gemini 3: Call lookupGroundTruthEntity FIRST
2. JSON must be valid (no trailing commas)
3. Use null for unknown fields
4. verdict = PASS, FAIL, or UNKNOWN
5. Must have 3+ nextActions
6. Must cite ground truth in grounding[]`;;

/**
 * Get the appropriate evaluation prompt for a model
 */
export function getEvaluationPrompt(model: string): string {
  const complexity = getPromptComplexityForModel(model);

  switch (complexity) {
    case "full":
      return FULL_EVALUATION_PROMPT;
    case "standard":
      return STANDARD_EVALUATION_PROMPT;
    case "minimal":
      return MINIMAL_EVALUATION_PROMPT;
  }
}

/**
 * Get prompt configuration info for debugging
 */
export function getPromptConfig(model: string): EvaluationPromptConfig {
  const complexity = getPromptComplexityForModel(model);

  const configs: Record<PromptComplexity, EvaluationPromptConfig> = {
    full: {
      complexity: "full",
      tokenEstimate: 2000,
      description: "Full schema with all fields - for GPT-5.2, Claude Opus/Sonnet 4",
    },
    standard: {
      complexity: "standard",
      tokenEstimate: 1000,
      description: "Simplified schema with core fields - for Claude Haiku, Gemini Pro",
    },
    minimal: {
      complexity: "minimal",
      tokenEstimate: 400,
      description: "Bare minimum schema - for GPT-5 Mini, Gemini Flash",
    },
  };

  return configs[complexity];
}
