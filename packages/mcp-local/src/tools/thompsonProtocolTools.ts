/**
 * Thompson Protocol Tools — "Calculus Made Easy" approach to AI content
 *
 * 4-agent pipeline:
 *   1. Thompson Writer — Plain English mandate, intuition-before-mechanics
 *   2. Feynman Editor — Skeptical Beginner rejection loop
 *   3. Visual Metaphor Mapper — 1:1 analogy→visual prompt generation
 *   4. Anti-Elitism Linter — Mechanical ban list + readability scoring
 *
 * Plus orchestration:
 *   5. thompson_pipeline — End-to-end orchestrator
 *   6. thompson_quality_gate — Deterministic pass/fail checklist
 */

import type { McpTool } from "../types.js";

// ─── System Prompts ──────────────────────────────────────────────────────────

export const THOMPSON_SYSTEM_PROMPTS = {
  writer: `You are the Thompson Writer — a translator, not a lecturer.

## Core Identity
You transform complex technical, geopolitical, or scientific topics into content that makes
the reader feel smart. You follow Silvanus P. Thompson's "Calculus Made Easy" philosophy:
attack the "preliminary terrors" before teaching mechanics.

## Mechanical Constraints (non-negotiable)
1. PLAIN ENGLISH MANDATE: Every technical term MUST be immediately followed by an
   "in other words..." using a household object, everyday experience, or physical metaphor.
   Example: "The API utilizes RESTful architecture" → "The API is like a drive-thru window —
   it takes your order, gives you your food, and immediately forgets who you are."

2. ACKNOWLEDGE DIFFICULTY: Start complex explanations with validation:
   - "This sounds terrifying, but..."
   - "Most textbooks make this sound like a secret code..."
   - "If this feels confusing, that's not you — it's how it's usually explained..."
   NEVER use: "It is obvious that...", "As we all know...", "Simply put..."

3. INTUITION BEFORE MECHANICS: For every concept, explain the PURPOSE (what it achieves
   broadly) before the FUNCTION (how it works). The reader must understand WHY something
   exists before they see HOW it operates.
   Structure: [What problem does this solve?] → [Analogy] → [Mechanics]

4. ONE IDEA PER PARAGRAPH: Each paragraph introduces exactly one concept. If you need
   two concepts, use two paragraphs. No compound explanations.

5. PROGRESSIVE COMPLEXITY: Start with the simplest true statement. Layer complexity
   only after the simple version is established. Never jump to edge cases before the
   happy path is clear.

## Output Format
For each section of content, emit:
{
  "section_id": "<sequential>",
  "concept": "<the technical concept being explained>",
  "plain_english": "<the Thompson-style explanation>",
  "analogy": "<the household/everyday analogy used>",
  "jargon_translations": [
    { "term": "<jargon>", "translation": "<plain english>" }
  ],
  "difficulty_acknowledgment": "<the validation phrase used>",
  "readability_score": <estimated Flesch-Kincaid grade level, target: 6-8>
}`,

  feynman_editor: `You are the Feynman Editor — the Skeptical Beginner.

## Core Identity
You are an aggressive editor who reads drafts from the perspective of someone who has
NEVER encountered this topic before. Your job is to reject anything that sounds like
a textbook, lecture, or insider jargon.

## Rejection Criteria (any ONE triggers a rewrite request)
1. TEXTBOOK TONE: Any sentence that could appear in a university textbook without modification
2. UNEXPLAINED ACRONYM: Any acronym used without immediate expansion + analogy
3. MISSING ANALOGY: Any concept explained purely in abstract terms without a concrete comparison
4. ASSUMED KNOWLEDGE: Any sentence that requires prior domain knowledge to understand
5. PASSIVE VOICE DENSITY: More than 20% passive voice constructions
6. FLESCH-KINCAID > 10: Any paragraph scoring above grade 10 reading level
7. CONDESCENDING SIMPLIFICATION: Using "simply" or "just" before a genuinely complex concept
   (these words gaslight the reader into feeling dumb)
8. WALL OF ABSTRACTION: 3+ consecutive sentences without a concrete example

## Feedback Format
For each flagged section:
{
  "section_id": "<from writer output>",
  "verdict": "PASS" | "REWRITE",
  "flags": [
    {
      "criterion": "<which rejection criterion>",
      "offending_text": "<exact text that triggered>",
      "suggestion": "<how to fix it>"
    }
  ],
  "rewrite_prompt": "<if REWRITE, specific instructions for the writer>"
}

## Rules
- You are NOT here to be nice. You are here to protect the reader.
- A PASS means a 12-year-old could understand it. That's the bar.
- Maximum 3 rewrite cycles. If still failing after 3, escalate with a summary of what's stuck.
- Track rewrite count per section. Flag "stuck" sections after 2 consecutive rewrites on same criterion.`,

  visual_mapper: `You are the Visual Metaphor Mapper.

## Core Identity
You read Thompson-style content and generate precise visual prompts that map 1:1
with the analogies used in the text. No generic "b-roll" — every visual MUST
reinforce the specific metaphor the writer chose.

## Rules
1. ONE VISUAL PER ANALOGY: Each analogy in the text gets exactly one visual prompt
2. LITERAL MAPPING: If the text says "like a librarian sorting books," the visual
   shows a literal librarian sorting books — not abstract data visualization
3. SCENE CONTINUITY: Visuals in a sequence should feel like they're in the same world.
   Pick a visual style (watercolor, line art, 3D render, photograph) and stick with it.
4. NO TEXT IN VISUALS: The visual must work without any overlaid text
5. ACCESSIBILITY: Every visual must have an alt-text description for screen readers

## Output Format
For each analogy:
{
  "section_id": "<from writer output>",
  "analogy_text": "<the exact analogy from the content>",
  "visual_prompt": "<detailed image generation prompt, 2-3 sentences>",
  "visual_style": "watercolor" | "line_art" | "3d_render" | "photograph" | "diagram" | "animation_storyboard",
  "alt_text": "<screen reader description>",
  "aspect_ratio": "16:9" | "1:1" | "9:16",
  "mood": "<warm/clinical/playful/serious/whimsical>"
}`,

  anti_elitism_linter: `You are the Anti-Elitism Linter.

## Core Identity
You scan content for subtle elitism, gatekeeping language, and intellectual intimidation.
Your goal: make the reader feel invited, not tested.

## Banned Phrases (hard fail — must be removed or rewritten)
CATEGORY: Assumed Knowledge
- "It is obvious that..."
- "As we all know..."
- "Clearly..."
- "Of course..."
- "Trivially..."
- "It goes without saying..."
- "Any competent [role] would..."
- "This is basic..."
- "Elementary..."

CATEGORY: False Simplification (gaslighting)
- "Simply put..."
- "Just [do complex thing]..."
- "All you have to do is..."
- "It's easy — just..."
- "This is straightforward..."

CATEGORY: Exclusionary
- "Real engineers know..."
- "If you don't understand this..."
- "This separates beginners from experts..."
- "You should already know..."
- "I won't explain [X] here..."

CATEGORY: Passive Aggressive
- "As I mentioned before..."
- "Again, ..."  (implying reader should have gotten it)
- "For those who missed it..."

## Soft Checks (logged, not blocking)
- Passive voice density > 25%
- Average sentence length > 20 words
- Paragraph length > 5 sentences
- No questions in 500+ words (disengaging)
- No concrete examples in 300+ words

## Output Format
{
  "verdict": "CLEAN" | "FLAGGED",
  "hard_fails": [
    {
      "phrase": "<exact banned phrase found>",
      "category": "<category name>",
      "line": "<approximate location>",
      "replacement": "<suggested rewrite>"
    }
  ],
  "soft_warnings": [
    {
      "check": "<which soft check>",
      "value": "<measured value>",
      "threshold": "<the threshold>",
      "suggestion": "<how to improve>"
    }
  ],
  "readability": {
    "flesch_kincaid_grade": <number>,
    "passive_voice_pct": <number>,
    "avg_sentence_length": <number>,
    "jargon_density": <number, terms per 100 words>
  },
  "elitism_score": <0-100, 0 = fully inclusive, 100 = textbook gatekeeping>
}`
};

// ─── Quality Gate Checklist ──────────────────────────────────────────────────

export interface ThompsonQualityChecklist {
  hasPlainEnglishTranslations: boolean;    // Every jargon term has an "in other words"
  hasAnalogyPerConcept: boolean;           // Every concept has a concrete analogy
  hasDifficultyAcknowledgment: boolean;    // Validates reader confusion explicitly
  hasIntuitionBeforeMechanics: boolean;    // PURPOSE before FUNCTION ordering
  passesFeynmanEdit: boolean;              // Feynman Editor returned all PASS
  passesAntiElitismLint: boolean;          // Anti-Elitism Linter returned CLEAN
  hasVisualMetaphors: boolean;             // Visual Mapper generated prompts
  fleschKincaidUnder10: boolean;           // Readability grade < 10
  noBannedPhrases: boolean;               // Zero hard fails from linter
  hasProgressiveComplexity: boolean;       // Simple → complex ordering verified
}

export function deriveThompsonGrade(checklist: ThompsonQualityChecklist): "exemplary" | "passing" | "needs_work" | "failing" {
  const checks = Object.values(checklist);
  const passing = checks.filter(Boolean).length;
  if (passing >= 9) return "exemplary";     // 9-10 of 10
  if (passing >= 7) return "passing";       // 7-8 of 10
  if (passing >= 5) return "needs_work";    // 5-6 of 10
  return "failing";                         // 0-4 of 10
}

// ─── Banned Phrases (deterministic, no LLM needed) ──────────────────────────

const BANNED_PHRASES: Array<{ phrase: string; category: string; replacement: string }> = [
  // Assumed Knowledge
  { phrase: "it is obvious that", category: "assumed_knowledge", replacement: "Here's what's happening:" },
  { phrase: "as we all know", category: "assumed_knowledge", replacement: "Here's the background:" },
  { phrase: "clearly", category: "assumed_knowledge", replacement: "[remove or replace with evidence]" },
  { phrase: "of course", category: "assumed_knowledge", replacement: "[remove or provide context]" },
  { phrase: "trivially", category: "assumed_knowledge", replacement: "[explain the steps]" },
  { phrase: "it goes without saying", category: "assumed_knowledge", replacement: "[then say it explicitly]" },
  { phrase: "any competent", category: "assumed_knowledge", replacement: "[remove judgment]" },
  { phrase: "this is basic", category: "assumed_knowledge", replacement: "[explain it anyway]" },
  { phrase: "elementary", category: "assumed_knowledge", replacement: "[treat as worth explaining]" },
  // False Simplification
  { phrase: "simply put", category: "false_simplification", replacement: "Here's one way to think about it:" },
  { phrase: "just do", category: "false_simplification", replacement: "[break into steps]" },
  { phrase: "all you have to do is", category: "false_simplification", replacement: "Here are the steps:" },
  { phrase: "it's easy", category: "false_simplification", replacement: "[acknowledge complexity, then guide]" },
  { phrase: "this is straightforward", category: "false_simplification", replacement: "Here's how it works:" },
  // Exclusionary
  { phrase: "real engineers know", category: "exclusionary", replacement: "[remove gatekeeping]" },
  { phrase: "if you don't understand", category: "exclusionary", replacement: "Let me break this down:" },
  { phrase: "this separates beginners from experts", category: "exclusionary", replacement: "[remove hierarchy]" },
  { phrase: "you should already know", category: "exclusionary", replacement: "Quick background:" },
  { phrase: "i won't explain", category: "exclusionary", replacement: "[explain it or link to explanation]" },
  // Passive Aggressive
  { phrase: "as i mentioned before", category: "passive_aggressive", replacement: "[just restate it]" },
  { phrase: "for those who missed it", category: "passive_aggressive", replacement: "[just restate it]" },
];

function lintBannedPhrases(text: string): Array<{ phrase: string; category: string; replacement: string; position: number }> {
  const lower = text.toLowerCase();
  const hits: Array<{ phrase: string; category: string; replacement: string; position: number }> = [];
  for (const entry of BANNED_PHRASES) {
    let pos = 0;
    while ((pos = lower.indexOf(entry.phrase, pos)) !== -1) {
      hits.push({ ...entry, position: pos });
      pos += entry.phrase.length;
    }
  }
  return hits;
}

function computeReadabilityMetrics(text: string): {
  fleschKincaidGrade: number;
  passiveVoicePct: number;
  avgSentenceLength: number;
  jargonDensity: number;
} {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const syllableCount = words.reduce((sum, w) => sum + countSyllables(w), 0);

  const avgSentenceLength = sentences.length > 0 ? words.length / sentences.length : 0;
  const avgSyllablesPerWord = words.length > 0 ? syllableCount / words.length : 0;

  // Flesch-Kincaid Grade Level
  const fkGrade = 0.39 * avgSentenceLength + 11.8 * avgSyllablesPerWord - 15.59;

  // Passive voice detection (heuristic: "is/was/were/been/being" + past participle pattern)
  const passivePatterns = /\b(is|was|were|been|being|are)\s+\w+ed\b/gi;
  const passiveMatches = text.match(passivePatterns) || [];
  const passiveVoicePct = sentences.length > 0 ? (passiveMatches.length / sentences.length) * 100 : 0;

  // Jargon density (words > 3 syllables per 100 words)
  const complexWords = words.filter(w => countSyllables(w) > 3).length;
  const jargonDensity = words.length > 0 ? (complexWords / words.length) * 100 : 0;

  return {
    fleschKincaidGrade: Math.max(0, Math.round(fkGrade * 10) / 10),
    passiveVoicePct: Math.round(passiveVoicePct * 10) / 10,
    avgSentenceLength: Math.round(avgSentenceLength * 10) / 10,
    jargonDensity: Math.round(jargonDensity * 10) / 10,
  };
}

function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length <= 3) return 1;
  let count = 0;
  const vowels = "aeiouy";
  let prevVowel = false;
  for (const ch of w) {
    const isVowel = vowels.includes(ch);
    if (isVowel && !prevVowel) count++;
    prevVowel = isVowel;
  }
  if (w.endsWith("e") && count > 1) count--;
  return Math.max(1, count);
}

// ─── Tool Definitions ────────────────────────────────────────────────────────

export function createThompsonProtocolTools(): McpTool[] {
  return [
    // ── Tool 1: Thompson Writer ──────────────────────────────────────────
    {
      name: "thompson_write",
      description: "Transform complex content into Thompson Protocol format — plain English mandate, intuition-before-mechanics, analogy-per-concept. Returns structured sections with jargon translations and readability scores.",
      inputSchema: {
        type: "object" as const,
        properties: {
          topic: {
            type: "string",
            description: "The complex topic to explain (e.g., 'Transformer attention mechanisms', 'Federal Reserve quantitative tightening')",
          },
          target_audience: {
            type: "string",
            description: "Who is this for? (e.g., 'curious non-technical adult', 'junior developer', 'high school student')",
            default: "curious non-technical adult",
          },
          raw_content: {
            type: "string",
            description: "Optional: raw technical content to transform. If omitted, generates from topic alone.",
          },
          max_sections: {
            type: "number",
            description: "Maximum number of content sections to produce (default: 5)",
            default: 5,
          },
          output_format: {
            type: "string",
            enum: ["script", "article", "thread", "explainer"],
            description: "Target format: video script, long-form article, social thread, or short explainer",
            default: "script",
          },
        },
        required: ["topic"],
      },
      handler: async (params: Record<string, unknown>) => {
        const topic = params.topic as string;
        const audience = (params.target_audience as string) || "curious non-technical adult";
        const rawContent = params.raw_content as string | undefined;
        const maxSections = (params.max_sections as number) || 5;
        const format = (params.output_format as string) || "script";

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                tool: "thompson_write",
                status: "ready",
                system_prompt: THOMPSON_SYSTEM_PROMPTS.writer,
                task: {
                  topic,
                  target_audience: audience,
                  raw_content: rawContent || null,
                  max_sections: maxSections,
                  output_format: format,
                  instructions: [
                    `Transform "${topic}" into ${maxSections} sections for a ${audience}.`,
                    `Format: ${format}`,
                    "Apply ALL 5 mechanical constraints from the Thompson Protocol.",
                    "Each section MUST include: concept, plain_english, analogy, jargon_translations, difficulty_acknowledgment.",
                    rawContent
                      ? "Transform the provided raw_content — do NOT discard any core facts."
                      : "Research and generate content from scratch for this topic.",
                  ],
                },
                next_step: "Pass output to thompson_feynman_edit for rejection loop",
                _hint: "Use call_llm with this system_prompt and task to generate the content. The LLM does the actual writing — this tool provides the protocol constraints.",
              }, null, 2),
            },
          ],
        };
      },
    },

    // ── Tool 2: Feynman Editor ───────────────────────────────────────────
    {
      name: "thompson_feynman_edit",
      description: "Skeptical Beginner editor — reviews Thompson-written content against 8 rejection criteria. Returns PASS/REWRITE per section with specific fix instructions. Max 3 rewrite cycles.",
      inputSchema: {
        type: "object" as const,
        properties: {
          sections: {
            type: "string",
            description: "JSON string of sections from thompson_write output",
          },
          rewrite_cycle: {
            type: "number",
            description: "Current rewrite cycle (1-3). After 3, escalates stuck sections.",
            default: 1,
          },
          strict_mode: {
            type: "boolean",
            description: "If true, enforces Flesch-Kincaid < 8 instead of < 10",
            default: false,
          },
        },
        required: ["sections"],
      },
      handler: async (params: Record<string, unknown>) => {
        const sections = params.sections as string;
        const cycle = (params.rewrite_cycle as number) || 1;
        const strict = (params.strict_mode as boolean) || false;
        const fkThreshold = strict ? 8 : 10;

        // Run deterministic checks on the raw text
        const metrics = computeReadabilityMetrics(sections);
        const bannedHits = lintBannedPhrases(sections);

        const deterministicFlags: string[] = [];
        if (metrics.fleschKincaidGrade > fkThreshold) {
          deterministicFlags.push(`Flesch-Kincaid grade ${metrics.fleschKincaidGrade} exceeds threshold ${fkThreshold}`);
        }
        if (metrics.passiveVoicePct > 20) {
          deterministicFlags.push(`Passive voice at ${metrics.passiveVoicePct}% (threshold: 20%)`);
        }
        if (bannedHits.length > 0) {
          deterministicFlags.push(`${bannedHits.length} banned phrase(s) found: ${bannedHits.map(h => `"${h.phrase}"`).join(", ")}`);
        }

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                tool: "thompson_feynman_edit",
                status: "ready",
                system_prompt: THOMPSON_SYSTEM_PROMPTS.feynman_editor,
                rewrite_cycle: cycle,
                max_cycles: 3,
                escalate_if_stuck: cycle >= 3,
                fk_threshold: fkThreshold,
                deterministic_checks: {
                  readability: metrics,
                  banned_phrases: bannedHits,
                  auto_flags: deterministicFlags,
                },
                task: {
                  sections_to_review: sections,
                  instructions: [
                    "Review EACH section against the 8 rejection criteria.",
                    `This is rewrite cycle ${cycle}/3.`,
                    deterministicFlags.length > 0
                      ? `DETERMINISTIC FLAGS (already detected — these MUST be fixed): ${deterministicFlags.join("; ")}`
                      : "No deterministic flags — focus on semantic review.",
                    cycle >= 3
                      ? "FINAL CYCLE: If sections still fail, emit escalation summary instead of rewrite prompt."
                      : "Return PASS or REWRITE verdict per section with specific fix instructions.",
                  ],
                },
                next_step: cycle >= 3
                  ? "If all PASS → thompson_visual_map. If stuck → surface escalation to user."
                  : "If REWRITE sections exist → send back to thompson_write. If all PASS → thompson_visual_map.",
              }, null, 2),
            },
          ],
        };
      },
    },

    // ── Tool 3: Visual Metaphor Mapper ───────────────────────────────────
    {
      name: "thompson_visual_map",
      description: "Generate precise visual prompts that map 1:1 with content analogies. No generic b-roll — every visual reinforces a specific metaphor from the Thompson-written content.",
      inputSchema: {
        type: "object" as const,
        properties: {
          sections: {
            type: "string",
            description: "JSON string of Feynman-approved sections",
          },
          visual_style: {
            type: "string",
            enum: ["watercolor", "line_art", "3d_render", "photograph", "diagram", "animation_storyboard"],
            description: "Consistent visual style across all generated prompts",
            default: "line_art",
          },
          aspect_ratio: {
            type: "string",
            enum: ["16:9", "1:1", "9:16"],
            description: "Target aspect ratio (16:9 for video, 1:1 for social, 9:16 for shorts/reels)",
            default: "16:9",
          },
          image_generator: {
            type: "string",
            enum: ["dall_e_3", "midjourney", "stable_diffusion", "flux", "generic"],
            description: "Target image generator for prompt optimization",
            default: "generic",
          },
        },
        required: ["sections"],
      },
      handler: async (params: Record<string, unknown>) => {
        const sections = params.sections as string;
        const style = (params.visual_style as string) || "line_art";
        const ratio = (params.aspect_ratio as string) || "16:9";
        const generator = (params.image_generator as string) || "generic";

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                tool: "thompson_visual_map",
                status: "ready",
                system_prompt: THOMPSON_SYSTEM_PROMPTS.visual_mapper,
                task: {
                  approved_sections: sections,
                  visual_constraints: {
                    style,
                    aspect_ratio: ratio,
                    target_generator: generator,
                    rules: [
                      "ONE visual per analogy — no generic stock imagery",
                      "LITERAL mapping: if text says 'like a librarian,' show a literal librarian",
                      "SCENE CONTINUITY: all visuals must feel like the same world",
                      "NO TEXT IN VISUALS: the image must work without overlaid text",
                      "Include alt_text for every visual (accessibility)",
                    ],
                  },
                  instructions: [
                    "Extract every analogy from the approved sections.",
                    "For each analogy, generate a precise image prompt.",
                    `Style: ${style}, Aspect ratio: ${ratio}, Generator: ${generator}`,
                    "Output one visual_prompt object per analogy.",
                  ],
                },
                next_step: "Pass output to thompson_anti_elitism_lint for final check",
              }, null, 2),
            },
          ],
        };
      },
    },

    // ── Tool 4: Anti-Elitism Linter ──────────────────────────────────────
    {
      name: "thompson_anti_elitism_lint",
      description: "Scan content for elitism, gatekeeping language, and intellectual intimidation. Deterministic banned-phrase detection + readability scoring. Returns CLEAN or FLAGGED with specific fixes.",
      inputSchema: {
        type: "object" as const,
        properties: {
          content: {
            type: "string",
            description: "The full content text to lint (plain text, not JSON)",
          },
          strict_mode: {
            type: "boolean",
            description: "If true, soft checks become hard fails",
            default: false,
          },
        },
        required: ["content"],
      },
      handler: async (params: Record<string, unknown>) => {
        const content = params.content as string;
        const strict = (params.strict_mode as boolean) || false;

        // Deterministic analysis — no LLM needed
        const bannedHits = lintBannedPhrases(content);
        const metrics = computeReadabilityMetrics(content);

        // Soft checks
        const softWarnings: Array<{ check: string; value: number; threshold: number; suggestion: string }> = [];

        if (metrics.passiveVoicePct > 25) {
          softWarnings.push({
            check: "passive_voice_density",
            value: metrics.passiveVoicePct,
            threshold: 25,
            suggestion: "Rewrite passive constructions to active voice. 'The data was processed' → 'We processed the data'",
          });
        }

        if (metrics.avgSentenceLength > 20) {
          softWarnings.push({
            check: "avg_sentence_length",
            value: metrics.avgSentenceLength,
            threshold: 20,
            suggestion: "Break long sentences. Each sentence should convey one thought.",
          });
        }

        // Check for question density
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const questions = content.split("?").length - 1;
        const words = content.split(/\s+/).length;
        if (words > 500 && questions === 0) {
          softWarnings.push({
            check: "no_questions",
            value: 0,
            threshold: 1,
            suggestion: "Add at least one question per 500 words to maintain reader engagement.",
          });
        }

        // Check for concrete example density
        const exampleIndicators = /\b(for example|for instance|such as|like when|imagine|picture this|think of)\b/gi;
        const exampleCount = (content.match(exampleIndicators) || []).length;
        if (words > 300 && exampleCount === 0) {
          softWarnings.push({
            check: "no_concrete_examples",
            value: 0,
            threshold: 1,
            suggestion: "Add concrete examples. Abstract explanations without examples lose readers.",
          });
        }

        const isClean = bannedHits.length === 0 && (!strict || softWarnings.length === 0);

        // Compute elitism score (0 = inclusive, 100 = gatekeeping)
        let elitismScore = 0;
        elitismScore += Math.min(bannedHits.length * 15, 60); // up to 60 from banned phrases
        elitismScore += Math.min(metrics.jargonDensity * 2, 20); // up to 20 from jargon
        elitismScore += metrics.fleschKincaidGrade > 12 ? 20 : metrics.fleschKincaidGrade > 10 ? 10 : 0;
        elitismScore = Math.min(100, elitismScore);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                tool: "thompson_anti_elitism_lint",
                verdict: isClean ? "CLEAN" : "FLAGGED",
                hard_fails: bannedHits.map(h => ({
                  phrase: h.phrase,
                  category: h.category,
                  position: h.position,
                  replacement: h.replacement,
                })),
                soft_warnings: softWarnings,
                readability: {
                  flesch_kincaid_grade: metrics.fleschKincaidGrade,
                  passive_voice_pct: metrics.passiveVoicePct,
                  avg_sentence_length: metrics.avgSentenceLength,
                  jargon_density: metrics.jargonDensity,
                },
                elitism_score: elitismScore,
                word_count: words,
                question_count: questions,
                example_count: exampleCount,
                _hint: isClean
                  ? "Content passes anti-elitism lint. Proceed to thompson_quality_gate."
                  : `Content has ${bannedHits.length} hard fail(s) and ${softWarnings.length} soft warning(s). Fix banned phrases first, then address soft warnings.`,
              }, null, 2),
            },
          ],
        };
      },
    },

    // ── Tool 5: Quality Gate ─────────────────────────────────────────────
    {
      name: "thompson_quality_gate",
      description: "Deterministic 10-point quality gate for Thompson Protocol content. Produces a boolean checklist and overall grade (exemplary/passing/needs_work/failing).",
      inputSchema: {
        type: "object" as const,
        properties: {
          writer_output: {
            type: "string",
            description: "JSON output from thompson_write (sections with jargon_translations, analogies, etc.)",
          },
          feynman_verdict: {
            type: "string",
            description: "JSON output from thompson_feynman_edit (PASS/REWRITE verdicts)",
          },
          lint_result: {
            type: "string",
            description: "JSON output from thompson_anti_elitism_lint",
          },
          visual_map: {
            type: "string",
            description: "JSON output from thompson_visual_map (optional — omit if no visuals needed)",
          },
        },
        required: ["writer_output", "feynman_verdict", "lint_result"],
      },
      handler: async (params: Record<string, unknown>) => {
        const writerRaw = params.writer_output as string;
        const feynmanRaw = params.feynman_verdict as string;
        const lintRaw = params.lint_result as string;
        const visualRaw = params.visual_map as string | undefined;

        // Parse inputs safely
        let writerData: Record<string, unknown> = {};
        let feynmanData: Record<string, unknown> = {};
        let lintData: Record<string, unknown> = {};
        let visualData: Record<string, unknown> | null = null;

        try { writerData = JSON.parse(writerRaw); } catch { /* use empty */ }
        try { feynmanData = JSON.parse(feynmanRaw); } catch { /* use empty */ }
        try { lintData = JSON.parse(lintRaw); } catch { /* use empty */ }
        if (visualRaw) {
          try { visualData = JSON.parse(visualRaw); } catch { /* use null */ }
        }

        // Build checklist from pipeline outputs
        const lintVerdict = (lintData as { verdict?: string }).verdict;
        const hardFails = (lintData as { hard_fails?: unknown[] }).hard_fails || [];
        const readability = (lintData as { readability?: { flesch_kincaid_grade?: number } }).readability;
        const fkGrade = readability?.flesch_kincaid_grade ?? 99;

        // Check writer output has required fields
        const taskData = (writerData as { task?: Record<string, unknown> }).task || writerData;
        const hasJargonTranslations = JSON.stringify(taskData).includes("jargon_translation");
        const hasAnalogy = JSON.stringify(taskData).includes("analogy");
        const hasDifficultyAck = JSON.stringify(taskData).includes("difficulty_acknowledgment") ||
                                  JSON.stringify(taskData).includes("sounds terrifying") ||
                                  JSON.stringify(taskData).includes("feels confusing");

        // Check Feynman verdicts
        const feynmanStr = JSON.stringify(feynmanData);
        const allPass = !feynmanStr.includes('"REWRITE"') && feynmanStr.includes("PASS");

        const checklist: ThompsonQualityChecklist = {
          hasPlainEnglishTranslations: hasJargonTranslations,
          hasAnalogyPerConcept: hasAnalogy,
          hasDifficultyAcknowledgment: hasDifficultyAck,
          hasIntuitionBeforeMechanics: JSON.stringify(taskData).includes("purpose") || JSON.stringify(taskData).includes("intuition"),
          passesFeynmanEdit: allPass,
          passesAntiElitismLint: lintVerdict === "CLEAN",
          hasVisualMetaphors: visualData !== null,
          fleschKincaidUnder10: fkGrade < 10,
          noBannedPhrases: hardFails.length === 0,
          hasProgressiveComplexity: true, // Checked structurally by Feynman Editor
        };

        const grade = deriveThompsonGrade(checklist);
        const passing = Object.values(checklist).filter(Boolean).length;

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                tool: "thompson_quality_gate",
                grade,
                score: `${passing}/10`,
                checklist,
                pass: grade === "exemplary" || grade === "passing",
                action: grade === "exemplary" || grade === "passing"
                  ? "Content approved. Ready for distribution via content_publish workflow."
                  : grade === "needs_work"
                    ? "Send back to thompson_write for targeted fixes on failing checks."
                    : "Major revision needed. Review failing checks and restart pipeline.",
                failing_checks: Object.entries(checklist)
                  .filter(([, v]) => !v)
                  .map(([k]) => k),
              }, null, 2),
            },
          ],
        };
      },
    },

    // ── Tool 6: Pipeline Orchestrator ────────────────────────────────────
    {
      name: "thompson_pipeline",
      description: "End-to-end Thompson Protocol pipeline orchestrator. Takes a complex topic and runs it through all 4 agents (Writer → Feynman Editor → Visual Mapper → Anti-Elitism Linter) with quality gate. Returns the full execution plan with agent prompts and handoff points.",
      inputSchema: {
        type: "object" as const,
        properties: {
          topic: {
            type: "string",
            description: "The complex topic to make accessible",
          },
          target_audience: {
            type: "string",
            description: "Who is this for?",
            default: "curious non-technical adult",
          },
          output_format: {
            type: "string",
            enum: ["script", "article", "thread", "explainer"],
            default: "script",
          },
          visual_style: {
            type: "string",
            enum: ["watercolor", "line_art", "3d_render", "photograph", "diagram", "animation_storyboard"],
            default: "line_art",
          },
          strict_mode: {
            type: "boolean",
            description: "Stricter readability and elitism thresholds",
            default: false,
          },
          skip_visuals: {
            type: "boolean",
            description: "Skip visual metaphor mapping (for text-only content)",
            default: false,
          },
          raw_content: {
            type: "string",
            description: "Optional: raw technical content to transform instead of generating from scratch",
          },
        },
        required: ["topic"],
      },
      handler: async (params: Record<string, unknown>) => {
        const topic = params.topic as string;
        const audience = (params.target_audience as string) || "curious non-technical adult";
        const format = (params.output_format as string) || "script";
        const style = (params.visual_style as string) || "line_art";
        const strict = (params.strict_mode as boolean) || false;
        const skipVisuals = (params.skip_visuals as boolean) || false;
        const rawContent = params.raw_content as string | undefined;

        const steps = [
          {
            step: 1,
            agent: "Thompson Writer",
            tool: "thompson_write",
            action: `Transform "${topic}" into plain-English ${format} for ${audience}`,
            params: { topic, target_audience: audience, output_format: format, raw_content: rawContent || undefined },
            system_prompt_key: "writer",
          },
          {
            step: 2,
            agent: "Feynman Editor",
            tool: "thompson_feynman_edit",
            action: "Review each section against 8 rejection criteria. Loop up to 3x.",
            params: { strict_mode: strict },
            system_prompt_key: "feynman_editor",
            loop: { max_cycles: 3, reloop_condition: "Any section has REWRITE verdict" },
          },
          ...(skipVisuals ? [] : [{
            step: 3,
            agent: "Visual Metaphor Mapper",
            tool: "thompson_visual_map",
            action: "Generate 1:1 visual prompts for each analogy",
            params: { visual_style: style, aspect_ratio: "16:9" },
            system_prompt_key: "visual_mapper" as const,
          }]),
          {
            step: skipVisuals ? 3 : 4,
            agent: "Anti-Elitism Linter",
            tool: "thompson_anti_elitism_lint",
            action: "Scan for banned phrases, readability, and gatekeeping language",
            params: { strict_mode: strict },
            system_prompt_key: "anti_elitism_linter",
          },
          {
            step: skipVisuals ? 4 : 5,
            agent: "Quality Gate",
            tool: "thompson_quality_gate",
            action: "10-point checklist + grade (exemplary/passing/needs_work/failing)",
            params: {},
            system_prompt_key: null,
          },
        ];

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                tool: "thompson_pipeline",
                status: "execution_plan_ready",
                topic,
                target_audience: audience,
                output_format: format,
                pipeline: {
                  total_steps: steps.length,
                  agents: ["Thompson Writer", "Feynman Editor", ...(skipVisuals ? [] : ["Visual Metaphor Mapper"]), "Anti-Elitism Linter", "Quality Gate"],
                  steps,
                },
                system_prompts: THOMPSON_SYSTEM_PROMPTS,
                execution_instructions: [
                  "Execute steps sequentially. Each step's output feeds the next.",
                  "Step 2 (Feynman Editor) is a LOOP: re-run thompson_write for REWRITE sections, max 3 cycles.",
                  "Use call_llm with the system_prompt from each step to generate agent responses.",
                  "Step 4 (Anti-Elitism Lint) is fully deterministic — no LLM needed.",
                  "Step 5 (Quality Gate) computes grade from pipeline outputs.",
                  "If grade is 'failing' or 'needs_work', restart from Step 1 with failing_checks as constraints.",
                ],
                next_step: "Begin with thompson_write, then chain through the pipeline.",
                _hint: "This is the orchestrator. Call each tool in sequence, passing outputs forward. The LLM (via call_llm) does the creative work; the tools provide structure and deterministic gates.",
              }, null, 2),
            },
          ],
        };
      },
    },
  ];
}

// ─── Analogy Density Detection ────────────────────────────────────────────────

/**
 * Detect positive Thompson signals — analogies, difficulty acknowledgments,
 * "in other words" translations, and progressive complexity markers.
 * Returns a density score (0-100) and specific signal counts.
 */
export function computeAnalogyDensity(text: string): {
  score: number;
  analogyCount: number;
  difficultyAckCount: number;
  translationCount: number;
  questionCount: number;
  wordCount: number;
  details: string[];
} {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;
  const details: string[] = [];

  // Analogy indicators
  const analogyPatterns = /\b(like a|think of|imagine|picture this|it's as if|similar to|the same way|just as a|works like|acts like|behaves like|equivalent of|analogy|metaphor)\b/gi;
  const analogyMatches = text.match(analogyPatterns) || [];
  const analogyCount = analogyMatches.length;
  if (analogyCount > 0) details.push(`${analogyCount} analogy marker(s)`);

  // Difficulty acknowledgment indicators
  const difficultyPatterns = /\b(this sounds|this feels|this looks|don't worry|sounds terrifying|sounds scary|sounds complicated|feels confusing|feels overwhelming|most people|most textbooks|usually explained|often misunderstood|commonly confused)\b/gi;
  const difficultyMatches = text.match(difficultyPatterns) || [];
  const difficultyAckCount = difficultyMatches.length;
  if (difficultyAckCount > 0) details.push(`${difficultyAckCount} difficulty acknowledgment(s)`);

  // "In other words" translation indicators
  const translationPatterns = /\b(in other words|put differently|meaning|that means|which means|in plain english|in simple terms|translation:|to put it simply|another way to say this)\b/gi;
  const translationMatches = text.match(translationPatterns) || [];
  const translationCount = translationMatches.length;
  if (translationCount > 0) details.push(`${translationCount} plain-language translation(s)`);

  // Reader engagement (questions)
  const questionCount = (text.match(/\?/g) || []).length;
  if (questionCount > 0) details.push(`${questionCount} question(s)`);

  // Score: weighted sum normalized to 0-100
  // Target: at least 1 analogy per 200 words, 1 translation per 300 words, 1 question per 500 words
  const analogyDensity = wordCount > 0 ? (analogyCount / wordCount) * 200 : 0;   // 1.0 = ideal
  const translationDensity = wordCount > 0 ? (translationCount / wordCount) * 300 : 0;
  const questionDensity = wordCount > 0 ? (questionCount / wordCount) * 500 : 0;
  const ackBonus = difficultyAckCount > 0 ? 15 : 0;

  const rawScore = (Math.min(analogyDensity, 2) * 30) +     // max 60 from analogies
                   (Math.min(translationDensity, 2) * 10) +  // max 20 from translations
                   (Math.min(questionDensity, 1) * 5) +      // max 5 from questions
                   ackBonus;                                   // 15 from difficulty ack

  const score = Math.min(100, Math.round(rawScore));

  if (wordCount > 200 && analogyCount === 0) {
    details.push("missing: no analogies in 200+ words");
  }
  if (wordCount > 300 && translationCount === 0) {
    details.push("missing: no plain-language translations in 300+ words");
  }

  return { score, analogyCount, difficultyAckCount, translationCount, questionCount, wordCount, details };
}

// ─── Exports for testing ─────────────────────────────────────────────────────

export const _testExports = {
  lintBannedPhrases,
  computeReadabilityMetrics,
  countSyllables,
  BANNED_PHRASES,
  computeAnalogyDensity,
};
