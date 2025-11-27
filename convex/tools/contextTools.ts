// convex/tools/contextTools.ts
// Context management tools for Coordinator scratchpad and context compaction
// These tools enable stateful multi-step reasoning without context bloat
// INVARIANTS A/B/C enforced in code - not just prompts

import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { GoogleGenAI, createUserContent, Type } from "@google/genai";

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Generate unique messageId (browser-safe, no Node crypto)
// ═══════════════════════════════════════════════════════════════════════════

function newMessageId(): string {
  // Use Math.random for browser compatibility (no Node crypto needed)
  const randomPart = Math.random().toString(36).substring(2, 14);
  return `msg_${Date.now()}_${randomPart}`;
}

// Helper: Add unique item to array (no duplicates)
function addUnique(arr: string[], item: string): string[] {
  if (!arr.includes(item)) arr.push(item);
  return arr;
}

// ═══════════════════════════════════════════════════════════════════════════
// SCRATCHPAD SCHEMA
// Persistent state structure for Coordinator between steps
// INVARIANT A: messageId enforces per-message isolation
// INVARIANT C: memoryUpdatedEntities tracks memory dedupe
// ═══════════════════════════════════════════════════════════════════════════

export const scratchpadSchema = z.object({
  // INVARIANT A: Message isolation
  messageId: z.string().describe("Unique ID for current user message - hard isolation"),
  
  // INVARIANT C: Memory dedupe tracking
  memoryUpdatedEntities: z.array(z.string()).default([]).describe("Canonical keys already updated this message"),
  
  // INVARIANT D: Capability version tracking
  capabilitiesVersion: z.string().nullable().default(null).describe("Version of cached capabilities"),
  
  // Existing fields
  activeEntities: z.array(z.string()).default([]),
  activeTheme: z.string().nullable().default(null),
  lastPlan: z.any().nullable().default(null),
  lastCapabilities: z.any().nullable().default(null),
  compactContext: z.any().nullable().default(null),
  lastToolOutput: z.any().nullable().default(null),
  pendingTasks: z.array(z.any()).default([]),
  completedTasks: z.array(z.any()).default([]),
  currentIntent: z.string().nullable().default(null),
  
  // Safety limits tracking
  stepCount: z.number().default(0),
  toolCallCount: z.number().default(0),
  planningCallCount: z.number().default(0),
  
  // Timestamps
  createdAt: z.number().default(Date.now()),
  updatedAt: z.number().default(Date.now()),
});

export type Scratchpad = z.infer<typeof scratchpadSchema>;

// ═══════════════════════════════════════════════════════════════════════════
// COMPACT CONTEXT SCHEMA
// Strict output schema for deterministic context compression
// ═══════════════════════════════════════════════════════════════════════════

export const compactContextSchema = z.object({
  facts: z.array(z.string()).describe("Key facts extracted from tool output"),
  constraints: z.array(z.string()).describe("Constraints or limitations discovered"),
  missing: z.array(z.string()).describe("Information still missing"),
  derivedEntities: z.array(z.string()).describe("New entities discovered"),
  openQuestions: z.array(z.string()).describe("Questions that remain unanswered"),
  nextSteps: z.array(z.string()).describe("Suggested next actions"),
  summary: z.string().describe("One-paragraph summary of the tool output"),
});

export type CompactContext = z.infer<typeof compactContextSchema>;

// ═══════════════════════════════════════════════════════════════════════════
// TOOL #1: initScratchpad
// Initialize a fresh scratchpad for a new conversation/task
// INVARIANT A: Always generates new messageId for hard isolation
// ═══════════════════════════════════════════════════════════════════════════

export const initScratchpad = createTool({
  description: `Initialize a FRESH scratchpad for the current user message.
MANDATORY: Call this at the START of EVERY new user message.
Generates a unique messageId that all subsequent tools must match.`,

  args: z.object({
    currentIntent: z.string().optional().describe("Classified intent: greeting|comparison|deep-research|etc"),
    activeEntities: z.array(z.string()).optional().describe("Initial entities to track"),
    activeTheme: z.string().optional().describe("Theme if applicable"),
  }),

  handler: async (_ctx, args) => {
    // INVARIANT A: New messageId for every user message
    const messageId = newMessageId();
    
    const scratchpad: Scratchpad = {
      // INVARIANT A: Message isolation
      messageId,
      
      // INVARIANT C: Memory dedupe tracking (fresh)
      memoryUpdatedEntities: [],
      
      // INVARIANT D: Capability version (will be set when discoverCapabilities runs)
      capabilitiesVersion: null,
      
      // Existing fields
      activeEntities: args.activeEntities || [],
      activeTheme: args.activeTheme || null,
      lastPlan: null,
      lastCapabilities: null,
      compactContext: null,
      lastToolOutput: null,
      pendingTasks: [],
      completedTasks: [],
      currentIntent: args.currentIntent || null,
      
      // Safety limits (fresh counters)
      stepCount: 0,
      toolCallCount: 0,
      planningCallCount: 0,
      
      // Timestamps
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    return scratchpad;
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// TOOL #2: updateScratchpad
// Update scratchpad state after a tool call
// INVARIANT A: Guards messageId - refuses to mutate on mismatch
// ═══════════════════════════════════════════════════════════════════════════

export const updateScratchpad = createTool({
  description: `Update the scratchpad after completing a tool call.
REQUIRES messageId match - refuses to mutate if messageId doesn't match.
Call this AFTER each tool to maintain state continuity.`,

  args: z.object({
    messageId: z.string().describe("REQUIRED: Must match scratchpad.messageId"),
    currentScratchpad: scratchpadSchema.describe("Current scratchpad state"),
    updates: z.object({
      activeEntities: z.array(z.string()).optional(),
      activeTheme: z.string().nullable().optional(),
      lastPlan: z.any().optional(),
      lastCapabilities: z.any().optional(),
      capabilitiesVersion: z.string().optional(),
      compactContext: z.any().optional(),
      lastToolOutput: z.any().optional(),
      completedTask: z.any().optional(),
      newPendingTasks: z.array(z.any()).optional(),
      incrementToolCall: z.boolean().optional(),
      incrementPlanningCall: z.boolean().optional(),
    }).describe("Fields to update"),
  }),

  handler: async (_ctx, args) => {
    // INVARIANT A: Guard messageId
    if (args.currentScratchpad.messageId !== args.messageId) {
      console.error(`[updateScratchpad] messageId MISMATCH: expected ${args.currentScratchpad.messageId}, got ${args.messageId}`);
      return {
        ok: false,
        reason: "messageId_mismatch",
        scratchpad: null,
      };
    }
    
    const updated: Scratchpad = {
      ...args.currentScratchpad,
      updatedAt: Date.now(),
      stepCount: args.currentScratchpad.stepCount + 1,
      toolCallCount: args.updates.incrementToolCall 
        ? args.currentScratchpad.toolCallCount + 1 
        : args.currentScratchpad.toolCallCount,
      planningCallCount: args.updates.incrementPlanningCall 
        ? args.currentScratchpad.planningCallCount + 1 
        : args.currentScratchpad.planningCallCount,
    };

    // Apply updates
    if (args.updates.activeEntities) {
      updated.activeEntities = [
        ...new Set([...updated.activeEntities, ...args.updates.activeEntities])
      ];
    }
    if (args.updates.activeTheme !== undefined) {
      updated.activeTheme = args.updates.activeTheme;
    }
    if (args.updates.lastPlan !== undefined) {
      updated.lastPlan = args.updates.lastPlan;
    }
    if (args.updates.lastCapabilities !== undefined) {
      updated.lastCapabilities = args.updates.lastCapabilities;
    }
    if (args.updates.capabilitiesVersion !== undefined) {
      updated.capabilitiesVersion = args.updates.capabilitiesVersion;
    }
    if (args.updates.compactContext !== undefined) {
      // INVARIANT B: Only accept compactContext if it has matching messageId
      const ctx = args.updates.compactContext;
      if (ctx && ctx.messageId && ctx.messageId !== args.messageId) {
        console.warn("[updateScratchpad] Rejecting compactContext with wrong messageId");
      } else {
        updated.compactContext = ctx;
      }
    }
    if (args.updates.lastToolOutput !== undefined) {
      updated.lastToolOutput = args.updates.lastToolOutput;
    }
    if (args.updates.completedTask) {
      updated.completedTasks = [...updated.completedTasks, args.updates.completedTask];
      updated.pendingTasks = updated.pendingTasks.filter(
        t => JSON.stringify(t) !== JSON.stringify(args.updates.completedTask)
      );
    }
    if (args.updates.newPendingTasks) {
      updated.pendingTasks = [...updated.pendingTasks, ...args.updates.newPendingTasks];
    }

    return { ok: true, scratchpad: updated };
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// TOOL #3: compactContext
// Compress tool output into structured, deterministic format
// INVARIANT B: Only fallback to previousContext if SAME messageId
// ═══════════════════════════════════════════════════════════════════════════

// Empty context schema (safe fallback)
const EMPTY_CONTEXT: CompactContext & { messageId?: string } = {
  facts: [],
  constraints: [],
  missing: ["Unable to extract - proceeding with raw output"],
  derivedEntities: [],
  openQuestions: [],
  nextSteps: ["Continue with available information"],
  summary: "",
};

export const compactContext = createTool({
  description: `Compress verbose tool output into a compact, structured format.
REQUIRES messageId - only falls back to previousContext if SAME messageId.
Call this AFTER any non-trivial tool to prevent context bloat.

Returns a strict schema with: facts, constraints, missing, derivedEntities, openQuestions, nextSteps, summary, messageId.`,

  args: z.object({
    messageId: z.string().describe("REQUIRED: Current message ID for isolation"),
    toolName: z.string().describe("Name of the tool that produced the output"),
    toolOutput: z.any().describe("Raw output from the tool"),
    currentGoal: z.string().describe("What you're trying to achieve"),
    previousContext: z.any().optional().describe("Previous compactContext if any"),
  }),

  handler: async (_ctx, args) => {
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
    
    // INVARIANT B: Check if previousContext belongs to same message
    const previousMessageId = args.previousContext?.messageId;
    const canUsePrevious = previousMessageId === args.messageId;
    
    // Fallback structure - stamped with current messageId
    const fallback: CompactContext & { messageId: string } = {
      ...EMPTY_CONTEXT,
      messageId: args.messageId,
      summary: typeof args.toolOutput === 'string' 
        ? args.toolOutput.slice(0, 500) 
        : JSON.stringify(args.toolOutput).slice(0, 500),
    };

    if (!geminiKey) {
      console.warn("[compactContext] No Gemini API key - returning fallback");
      return fallback;
    }

    const ai = new GoogleGenAI({ apiKey: geminiKey });

    const prompt = `Extract ONLY essential information from this tool output.

TOOL: ${args.toolName}
GOAL: ${args.currentGoal}

TOOL OUTPUT:
${typeof args.toolOutput === 'string' ? args.toolOutput : JSON.stringify(args.toolOutput, null, 2)}

${args.previousContext ? `PREVIOUS CONTEXT:\n${JSON.stringify(args.previousContext, null, 2)}` : ''}

Return a JSON object with EXACTLY these keys:
- facts: array of key facts (strings)
- constraints: array of limitations discovered (strings)
- missing: array of information still needed (strings)
- derivedEntities: array of new entities discovered (strings)
- openQuestions: array of unanswered questions (strings)
- nextSteps: array of suggested next actions (strings)
- summary: one-paragraph summary (string)

BE CONCISE. Remove all verbose explanations and redundant details.`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        facts: { type: Type.ARRAY, items: { type: Type.STRING } },
        constraints: { type: Type.ARRAY, items: { type: Type.STRING } },
        missing: { type: Type.ARRAY, items: { type: Type.STRING } },
        derivedEntities: { type: Type.ARRAY, items: { type: Type.STRING } },
        openQuestions: { type: Type.ARRAY, items: { type: Type.STRING } },
        nextSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
        summary: { type: Type.STRING },
      },
      required: ["facts", "constraints", "missing", "derivedEntities", "openQuestions", "nextSteps", "summary"],
    } as const;

    // Helper to check if result is "empty" (all arrays empty)
    const isResultEmpty = (result: CompactContext): boolean => {
      return (
        result.facts.length === 0 &&
        result.constraints.length === 0 &&
        result.missing.length === 0 &&
        result.derivedEntities.length === 0 &&
        result.openQuestions.length === 0 &&
        result.nextSteps.length === 0 &&
        (!result.summary || result.summary.trim().length === 0)
      );
    };

    // Helper to check if previous context has meaningful data
    const previousHasData = (prev: any): boolean => {
      if (!prev) return false;
      const p = prev as CompactContext;
      const hasFacts = Array.isArray(p.facts) && p.facts.length > 0;
      const hasConstraints = Array.isArray(p.constraints) && p.constraints.length > 0;
      const hasEntities = Array.isArray(p.derivedEntities) && p.derivedEntities.length > 0;
      const hasSummary = typeof p.summary === 'string' && p.summary.trim().length > 0;
      return hasFacts || hasConstraints || hasEntities || hasSummary;
    };

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: createUserContent([{ text: prompt }]),
        config: {
          responseMimeType: "application/json",
          responseSchema,
        },
      });

      const json = JSON.parse(response.text ?? "{}");
      
      // Validate against schema
      const parsed = compactContextSchema.safeParse(json);
      if (!parsed.success) {
        console.warn("[compactContext] Schema validation failed");
        // INVARIANT B: Only use previous if SAME messageId
        if (canUsePrevious && previousHasData(args.previousContext)) {
          console.warn("[compactContext] Preserving previous context (same messageId)");
          return { ...args.previousContext, messageId: args.messageId };
        }
        return fallback;
      }
      
      // INVARIANT B + MICRO-GAP 1: Check if result is empty but previous had data (same messageId only)
      if (isResultEmpty(parsed.data) && canUsePrevious && previousHasData(args.previousContext)) {
        console.warn("[compactContext] Result empty but previous had data - preserving previous (same messageId)");
        return { ...args.previousContext, messageId: args.messageId };
      }
      
      // Stamp output with messageId for future invariant checks
      return { ...parsed.data, messageId: args.messageId };
    } catch (err) {
      console.error("[compactContext] Error:", err);
      // INVARIANT B: Only use previous if SAME messageId
      if (canUsePrevious && previousHasData(args.previousContext)) {
        console.warn("[compactContext] Error occurred - preserving previous context (same messageId)");
        return { ...args.previousContext, messageId: args.messageId };
      }
      return fallback;
    }
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// TOOL #4: getScratchpadSummary
// Get a brief summary of current scratchpad state for context
// ═══════════════════════════════════════════════════════════════════════════

export const getScratchpadSummary = createTool({
  description: `Get a brief summary of current scratchpad state.
Useful for understanding where you are in a multi-step task and checking limits.`,

  args: z.object({
    scratchpad: scratchpadSchema,
  }),

  handler: async (_ctx, args) => {
    const s = args.scratchpad;
    return {
      // Identification
      messageId: s.messageId,
      
      // Counters & limits
      stepCount: s.stepCount,
      toolCallCount: s.toolCallCount,
      planningCallCount: s.planningCallCount,
      
      // Safety limit status
      stepsRemaining: 8 - s.stepCount,
      toolCallsRemaining: 12 - s.toolCallCount,
      planningCallsRemaining: 2 - s.planningCallCount,
      
      // State
      activeEntities: s.activeEntities,
      activeTheme: s.activeTheme,
      currentIntent: s.currentIntent,
      pendingTaskCount: s.pendingTasks.length,
      completedTaskCount: s.completedTasks.length,
      
      // Capabilities
      capabilitiesVersion: s.capabilitiesVersion,
      hasCapabilities: s.lastCapabilities !== null,
      
      // Context
      hasCompactContext: s.compactContext !== null,
      hasPlan: s.lastPlan !== null,
      
      // Memory dedupe tracking (Invariant C)
      memoryUpdatedEntities: s.memoryUpdatedEntities,
      memoryUpdatedCount: s.memoryUpdatedEntities.length,
      
      // Timing
      ageMs: Date.now() - s.createdAt,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// TOOL #5: markMemoryUpdated
// Track that entity memory was updated (Invariant C: Memory Dedupe)
// ═══════════════════════════════════════════════════════════════════════════

export const markMemoryUpdated = createTool({
  description: `Mark that entity memory was updated for this messageId.
INVARIANT C: Prevents double-writes by tracking which entities have been updated.
Call this after ANY tool that writes to entityContexts.`,

  args: z.object({
    messageId: z.string().describe("REQUIRED: Must match scratchpad.messageId"),
    canonicalKey: z.string().describe("Entity key, e.g., 'company:TSLA' or 'person:sam-altman'"),
    currentScratchpad: scratchpadSchema.describe("Current scratchpad state"),
  }),

  handler: async (_ctx, args) => {
    // INVARIANT A: Guard messageId
    if (args.currentScratchpad.messageId !== args.messageId) {
      console.error(`[markMemoryUpdated] messageId MISMATCH`);
      return {
        ok: false,
        reason: "messageId_mismatch",
        scratchpad: null,
      };
    }
    
    // Check if already marked
    if (args.currentScratchpad.memoryUpdatedEntities.includes(args.canonicalKey)) {
      return {
        ok: true,
        alreadyMarked: true,
        scratchpad: args.currentScratchpad,
      };
    }
    
    // Add to tracking array
    const updated: Scratchpad = {
      ...args.currentScratchpad,
      memoryUpdatedEntities: addUnique(
        [...args.currentScratchpad.memoryUpdatedEntities],
        args.canonicalKey
      ),
      updatedAt: Date.now(),
    };
    
    return {
      ok: true,
      alreadyMarked: false,
      scratchpad: updated,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// TOOL #6: isMemoryUpdated
// Check if entity was already updated this message (Invariant C: Memory Dedupe)
// ═══════════════════════════════════════════════════════════════════════════

export const isMemoryUpdated = createTool({
  description: `Check if entity memory was already updated for this messageId.
INVARIANT C: Use this BEFORE calling updateMemoryFromReview to prevent double-writes.`,

  args: z.object({
    canonicalKey: z.string().describe("Entity key to check"),
    scratchpad: scratchpadSchema.describe("Current scratchpad state"),
  }),

  handler: async (_ctx, args) => {
    const wasUpdated = args.scratchpad.memoryUpdatedEntities.includes(args.canonicalKey);
    return {
      canonicalKey: args.canonicalKey,
      wasUpdated,
      memoryUpdatedEntities: args.scratchpad.memoryUpdatedEntities,
    };
  },
});
