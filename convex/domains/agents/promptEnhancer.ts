"use node";

/**
 * Prompt Enhancer Service
 *
 * Enhances user prompts with contextual information before sending to the agent.
 * Based on patterns from Augment Code and Convex Chef.
 *
 * Features:
 * - Memory context injection
 * - Entity extraction and expansion
 * - Persona inference from keywords
 * - Temporal context extraction
 * - Tool suggestion
 * - File context injection
 */

import { action } from "../../_generated/server";
import { v } from "convex/values";
import { api } from "../../_generated/api";
import {
  extractTemporalContext,
  type TemporalContext,
} from "./core/delegation/temporalContext";

// ============================================================================
// TYPES
// ============================================================================

export interface EntityContext {
  name: string;
  type: "ground_truth" | "inferred";
  confidence: number;
}

export interface MemorySummary {
  entityName: string;
  qualityTier: "excellent" | "good" | "fair" | "poor";
  ageInDays: number;
  factCount: number;
  isStale: boolean;
}

export interface DossierContext {
  actIndex: number;
  sectionType: string;
  chartId?: string;
  entityName?: string;
}

export interface PromptDiff {
  type: "added" | "context";
  content: string;
  source: string; // e.g., "memory:DISCO", "temporal", "persona"
}

export interface EnhancedPrompt {
  original: string;
  enhanced: string;
  diff: PromptDiff[];
  injectedContext: {
    entities: EntityContext[];
    memory: MemorySummary[];
    temporalRange?: TemporalContext;
    dossierContext?: DossierContext;
    suggestedTools: string[];
    personaHint?: string;
  };
}

// ============================================================================
// GROUND TRUTH ENTITIES
// ============================================================================

const GROUND_TRUTH_ENTITIES = [
  "DISCO",
  "Ambros",
  "ClearSpace",
  "OpenAutoGLM",
  "NeuralForge",
  "VaultPay",
  "GenomiQ",
  "QuickJS",
  "MicroQuickJS",
  "SoundCloud",
  "Salesforce",
  "Agentforce",
  "Gemini",
  "Tesla",
  "Rivian",
  "Lucid",
  "SpaceX",
  "Apple",
  "Google",
  "Microsoft",
  "Amazon",
  "Meta",
  "Nvidia",
];

// ============================================================================
// PERSONA KEYWORDS
// ============================================================================

const PERSONA_KEYWORDS: Record<string, string[]> = {
  EARLY_STAGE_VC: ["wedge", "thesis", "comps", "market fit", "tam", "moat defense"],
  QUANT_ANALYST: [
    "signal",
    "metrics",
    "track",
    "time-series",
    "forecast",
    "variables",
  ],
  PRODUCT_DESIGNER: ["schema", "ui", "card", "rendering", "json fields", "layout"],
  SALES_ENGINEER: [
    "share-ready",
    "one-screen",
    "objections",
    "cta",
    "customer story",
  ],
  CTO_TECH_LEAD: ["cve", "security", "patch", "upgrade", "dependency", "vulnerability"],
  ECOSYSTEM_PARTNER: [
    "partnerships",
    "ecosystem",
    "second-order",
    "integration partners",
  ],
  FOUNDER_STRATEGY: ["positioning", "strategy", "pivot", "moat", "defensibility"],
  ENTERPRISE_EXEC: ["pricing", "vendor", "cost", "procurement", "p&l", "roi"],
  ACADEMIC_RD: ["papers", "methodology", "literature", "citations", "peer-reviewed"],
  JPM_STARTUP_BANKER: [
    "outreach",
    "pipeline",
    "this week",
    "contact",
    "target",
    "banker",
    "weekly target list",
  ],
};

// ============================================================================
// ENTITY EXTRACTION
// ============================================================================

/**
 * Extract entity mentions from a prompt
 */
function extractEntities(prompt: string): EntityContext[] {
  const entities: EntityContext[] = [];
  const lowerPrompt = prompt.toLowerCase();

  // Check against ground truth entities first
  for (const name of GROUND_TRUTH_ENTITIES) {
    if (lowerPrompt.includes(name.toLowerCase())) {
      entities.push({ name, type: "ground_truth", confidence: 1.0 });
    }
  }

  // If no ground truth entities found, try regex patterns for company-like mentions
  if (entities.length === 0) {
    // Pattern for capitalized company names
    const companyPattern =
      /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:Inc|Corp|Ltd|LLC|AI|Labs|Bio|Tech|Pharma))?)\b/g;
    const matches = prompt.match(companyPattern) ?? [];

    // Filter out common words that match the pattern
    const commonWords = new Set([
      "The",
      "This",
      "That",
      "What",
      "When",
      "Where",
      "How",
      "Why",
      "Who",
      "Research",
      "Analysis",
      "Summary",
      "Report",
      "Series",
    ]);

    for (const match of matches.slice(0, 3)) {
      // Limit to 3 inferred entities
      if (!commonWords.has(match) && match.length > 2) {
        entities.push({ name: match, type: "inferred", confidence: 0.7 });
      }
    }
  }

  return entities;
}

// ============================================================================
// PERSONA INFERENCE
// ============================================================================

/**
 * Infer persona from query keywords
 */
function inferPersonaFromQuery(
  prompt: string
): { persona: string; keywords: string[] } | null {
  const lowerPrompt = prompt.toLowerCase();

  for (const [persona, keywords] of Object.entries(PERSONA_KEYWORDS)) {
    const matched = keywords.filter((k) => lowerPrompt.includes(k.toLowerCase()));
    if (matched.length >= 1) {
      return { persona, keywords: matched };
    }
  }

  return null;
}

// ============================================================================
// TOOL SUGGESTION
// ============================================================================

/**
 * Suggest relevant tools based on query intent
 */
function suggestTools(
  prompt: string,
  entities: EntityContext[],
  personaHint: { persona: string } | null
): string[] {
  const tools: string[] = [];
  const lowerPrompt = prompt.toLowerCase();

  // Memory-first is always suggested for entity queries
  if (entities.length > 0) {
    tools.push("queryMemory");
  }

  // Research triggers
  if (
    lowerPrompt.includes("research") ||
    lowerPrompt.includes("deep dive") ||
    lowerPrompt.includes("dossier") ||
    lowerPrompt.includes("comprehensive")
  ) {
    tools.push("getBankerGradeEntityInsights", "enrichCompanyDossier");
  }

  // Web search triggers
  if (
    lowerPrompt.includes("news") ||
    lowerPrompt.includes("latest") ||
    lowerPrompt.includes("recent") ||
    lowerPrompt.includes("update")
  ) {
    tools.push("linkupSearch", "getLiveFeed");
  }

  // SEC triggers
  if (
    lowerPrompt.includes("sec") ||
    lowerPrompt.includes("10-k") ||
    lowerPrompt.includes("10-q") ||
    lowerPrompt.includes("filing") ||
    lowerPrompt.includes("annual report")
  ) {
    tools.push("delegateToSECAgent");
  }

  // Calendar/scheduling triggers
  if (
    lowerPrompt.includes("schedule") ||
    lowerPrompt.includes("meeting") ||
    lowerPrompt.includes("calendar") ||
    lowerPrompt.includes("appointment")
  ) {
    tools.push("createEvent", "listEvents");
  }

  // Comparison triggers
  if (
    lowerPrompt.includes("compare") ||
    lowerPrompt.includes("versus") ||
    lowerPrompt.includes(" vs ") ||
    entities.length > 1
  ) {
    tools.push("decomposeQuery");
  }

  // Persona-specific tool suggestions
  if (personaHint) {
    switch (personaHint.persona) {
      case "JPM_STARTUP_BANKER":
        if (!tools.includes("enrichCompanyDossier")) {
          tools.push("enrichCompanyDossier");
        }
        break;
      case "CTO_TECH_LEAD":
        tools.push("searchCVE");
        break;
      case "ACADEMIC_RD":
        tools.push("searchPapers");
        break;
    }
  }

  return [...new Set(tools)]; // Dedupe
}

// ============================================================================
// DOSSIER CONTEXT
// ============================================================================

/**
 * Build dossier context prefix for dossier-mode queries
 */
function buildDossierContextPrefix(dossierContext: DossierContext): string {
  const parts: string[] = [];

  parts.push(`[Dossier Context]`);
  parts.push(`- Current Act: ${dossierContext.actIndex + 1}`);
  parts.push(`- Section Type: ${dossierContext.sectionType}`);

  if (dossierContext.chartId) {
    parts.push(`- Chart ID: ${dossierContext.chartId}`);
  }

  if (dossierContext.entityName) {
    parts.push(`- Entity: ${dossierContext.entityName}`);
  }

  return parts.join("\n");
}

// ============================================================================
// MAIN ENHANCEMENT ACTION
// ============================================================================

/**
 * Enhance a user prompt with contextual information
 */
export const enhancePrompt = action({
  args: {
    prompt: v.string(),
    threadId: v.optional(v.string()),
    dossierContext: v.optional(
      v.object({
        actIndex: v.number(),
        sectionType: v.string(),
        chartId: v.optional(v.string()),
        entityName: v.optional(v.string()),
      })
    ),
    attachedFileIds: v.optional(v.array(v.string())),
  },
  returns: v.any(),
  handler: async (ctx, args): Promise<EnhancedPrompt> => {
    const original = args.prompt;
    const parts: string[] = [];
    const diff: PromptDiff[] = [];
    const injectedContext: EnhancedPrompt["injectedContext"] = {
      entities: [],
      memory: [],
      suggestedTools: [],
    };

    // 1. Extract entities from prompt
    const entities = extractEntities(original);
    injectedContext.entities = entities;

    // 2. Query memory for each entity
    for (const entity of entities) {
      try {
        // Try to query memory - this may fail if not set up
        const memoryResult = await ctx.runQuery(
          api.tools.knowledge.unifiedMemoryTools.queryMemory,
          { query: entity.name }
        );

        if (memoryResult.found && memoryResult.memories.length > 0) {
          const best = memoryResult.memories[0];
          const memorySummary: MemorySummary = {
            entityName: entity.name,
            qualityTier: (best.qualityTier as MemorySummary["qualityTier"]) || "fair",
            ageInDays: best.ageInDays || 0,
            factCount: best.keyFacts?.length ?? 0,
            isStale: best.isStale || false,
          };
          injectedContext.memory.push(memorySummary);

          // Add memory context to prompt
          const memoryHint = `[Memory: ${entity.name} - ${memorySummary.qualityTier} quality, ${memorySummary.ageInDays}d old, ${memorySummary.factCount} facts${memorySummary.isStale ? " (STALE)" : ""}]`;
          parts.push(memoryHint);
          diff.push({
            type: "added",
            content: memoryHint,
            source: `memory:${entity.name}`,
          });
        }
      } catch (error) {
        // Memory query failed - log and continue
        console.log(`Memory query failed for ${entity.name}:`, error);
      }
    }

    // 3. Extract and inject temporal context
    const temporal = extractTemporalContext(original);
    if (temporal) {
      injectedContext.temporalRange = temporal;
      const temporalHint = `[Timeframe: ${temporal.label} (${temporal.startDate.split("T")[0]} to ${temporal.endDate.split("T")[0]})]`;
      parts.push(temporalHint);
      diff.push({ type: "added", content: temporalHint, source: "temporal" });
    }

    // 4. Add dossier context if present
    if (args.dossierContext) {
      injectedContext.dossierContext = args.dossierContext;
      const dossierHint = buildDossierContextPrefix(args.dossierContext);
      if (dossierHint) {
        parts.push(dossierHint);
        diff.push({ type: "added", content: dossierHint, source: "dossier" });
      }
    }

    // 5. Infer persona and add hint
    const personaInference = inferPersonaFromQuery(original);
    if (personaInference) {
      injectedContext.personaHint = personaInference.persona;
      const hint = `[Persona hint: ${personaInference.persona} - detected keywords: ${personaInference.keywords.join(", ")}]`;
      parts.push(hint);
      diff.push({ type: "added", content: hint, source: "persona" });
    }

    // 6. Suggest relevant tools based on intent
    const suggestedTools = suggestTools(original, entities, personaInference);
    injectedContext.suggestedTools = suggestedTools;

    // 7. Add file context if attached
    if (args.attachedFileIds?.length) {
      const fileHint = `[Attached files: ${args.attachedFileIds.length} file(s) - will analyze with analyzeMediaFile]`;
      parts.push(fileHint);
      diff.push({ type: "added", content: fileHint, source: "files" });
      if (!injectedContext.suggestedTools.includes("analyzeMediaFile")) {
        injectedContext.suggestedTools.push("analyzeMediaFile");
      }
    }

    // 8. Build enhanced prompt
    const contextBlock =
      parts.length > 0 ? `${parts.join("\n")}\n\n---\n\n` : "";
    const enhanced = `${contextBlock}${original}`;

    return { original, enhanced, diff, injectedContext };
  },
});

/**
 * Preview enhancement without full memory query (faster, for UI)
 */
export const previewEnhancement = action({
  args: {
    prompt: v.string(),
    dossierContext: v.optional(
      v.object({
        actIndex: v.number(),
        sectionType: v.string(),
        chartId: v.optional(v.string()),
        entityName: v.optional(v.string()),
      })
    ),
    attachedFileIds: v.optional(v.array(v.string())),
  },
  returns: v.any(),
  handler: async (ctx, args): Promise<{
    entities: EntityContext[];
    personaHint: string | null;
    temporalRange: TemporalContext | null;
    suggestedTools: string[];
    hasDossierContext: boolean;
    hasFiles: boolean;
  }> => {
    const entities = extractEntities(args.prompt);
    const personaInference = inferPersonaFromQuery(args.prompt);
    const temporal = extractTemporalContext(args.prompt);
    const suggestedTools = suggestTools(
      args.prompt,
      entities,
      personaInference
    );

    return {
      entities,
      personaHint: personaInference?.persona ?? null,
      temporalRange: temporal,
      suggestedTools,
      hasDossierContext: !!args.dossierContext,
      hasFiles: (args.attachedFileIds?.length ?? 0) > 0,
    };
  },
});

/**
 * Get memory preview for an entity (for UI display)
 */
export const getMemoryPreview = action({
  args: {
    entityName: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args): Promise<{
    found: boolean;
    summary?: MemorySummary;
    keyFacts?: string[];
  }> => {
    try {
      const memoryResult = await ctx.runQuery(
        api.tools.knowledge.unifiedMemoryTools.queryMemory,
        { query: args.entityName }
      );

      if (memoryResult.found && memoryResult.memories.length > 0) {
        const best = memoryResult.memories[0];
        return {
          found: true,
          summary: {
            entityName: args.entityName,
            qualityTier: (best.qualityTier as MemorySummary["qualityTier"]) || "fair",
            ageInDays: best.ageInDays || 0,
            factCount: best.keyFacts?.length ?? 0,
            isStale: best.isStale || false,
          },
          keyFacts: best.keyFacts?.slice(0, 5), // Top 5 facts
        };
      }

      return { found: false };
    } catch (error) {
      console.log(`Memory preview failed for ${args.entityName}:`, error);
      return { found: false };
    }
  },
});
