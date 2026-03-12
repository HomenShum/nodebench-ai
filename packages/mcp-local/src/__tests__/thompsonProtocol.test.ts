/**
 * Thompson Protocol — Scenario-Based Tests
 *
 * Personas:
 *   - Content Creator: wants to make complex AI topics into YouTube scripts
 *   - Educator: needs to simplify quantum computing for high schoolers
 *   - Marketing Lead: converting technical whitepapers into accessible blog posts
 *
 * Axes: happy path, rejection loop, deterministic linter, quality gate, edge cases
 */

import { describe, it, expect } from "vitest";
import {
  createThompsonProtocolTools,
  deriveThompsonGrade,
  _testExports,
  THOMPSON_SYSTEM_PROMPTS,
  type ThompsonQualityChecklist,
} from "../tools/thompsonProtocolTools.js";

const { lintBannedPhrases, computeReadabilityMetrics, countSyllables, BANNED_PHRASES, computeAnalogyDensity } = _testExports;

// ── Scenario 1: Content Creator — Happy Path Pipeline ─────────────────────

describe("Scenario: Content Creator runs full Thompson pipeline", () => {
  const tools = createThompsonProtocolTools();

  it("should expose exactly 6 tools", () => {
    expect(tools).toHaveLength(6);
    const names = tools.map((t) => t.name);
    expect(names).toContain("thompson_write");
    expect(names).toContain("thompson_feynman_edit");
    expect(names).toContain("thompson_visual_map");
    expect(names).toContain("thompson_anti_elitism_lint");
    expect(names).toContain("thompson_quality_gate");
    expect(names).toContain("thompson_pipeline");
  });

  it("thompson_pipeline returns execution plan with all agent prompts", async () => {
    const pipeline = tools.find((t) => t.name === "thompson_pipeline")!;
    const result = await pipeline.handler({ topic: "Transformer attention mechanisms", target_audience: "curious non-technical adult" });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.status).toBe("execution_plan_ready");
    expect(parsed.topic).toBe("Transformer attention mechanisms");
    expect(parsed.pipeline.agents).toContain("Thompson Writer");
    expect(parsed.pipeline.agents).toContain("Feynman Editor");
    expect(parsed.pipeline.agents).toContain("Visual Metaphor Mapper");
    expect(parsed.pipeline.agents).toContain("Anti-Elitism Linter");
    expect(parsed.pipeline.agents).toContain("Quality Gate");
    expect(parsed.system_prompts).toBeDefined();
    expect(parsed.system_prompts.writer).toContain("Thompson Writer");
    expect(parsed.pipeline.steps.length).toBeGreaterThanOrEqual(5);
  });

  it("thompson_pipeline with skip_visuals removes Visual Metaphor Mapper", async () => {
    const pipeline = tools.find((t) => t.name === "thompson_pipeline")!;
    const result = await pipeline.handler({ topic: "API design", skip_visuals: true });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.pipeline.agents).not.toContain("Visual Metaphor Mapper");
    expect(parsed.pipeline.steps.length).toBeLessThan(6);
  });

  it("thompson_write returns system prompt + structured task", async () => {
    const writer = tools.find((t) => t.name === "thompson_write")!;
    const result = await writer.handler({
      topic: "Quantum entanglement",
      target_audience: "high school student",
      output_format: "explainer",
      max_sections: 3,
    });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.system_prompt).toContain("PLAIN ENGLISH MANDATE");
    expect(parsed.system_prompt).toContain("INTUITION BEFORE MECHANICS");
    expect(parsed.task.topic).toBe("Quantum entanglement");
    expect(parsed.task.target_audience).toBe("high school student");
    expect(parsed.task.max_sections).toBe(3);
    expect(parsed.task.output_format).toBe("explainer");
    expect(parsed.next_step).toContain("thompson_feynman_edit");
  });

  it("thompson_visual_map enforces consistent style and accessibility", async () => {
    const mapper = tools.find((t) => t.name === "thompson_visual_map")!;
    const result = await mapper.handler({
      sections: JSON.stringify([{ section_id: "1", analogy: "like a librarian sorting books" }]),
      visual_style: "watercolor",
      aspect_ratio: "9:16",
      image_generator: "dall_e_3",
    });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.task.visual_constraints.style).toBe("watercolor");
    expect(parsed.task.visual_constraints.aspect_ratio).toBe("9:16");
    expect(parsed.task.visual_constraints.target_generator).toBe("dall_e_3");
    expect(parsed.task.visual_constraints.rules).toContain("Include alt_text for every visual (accessibility)");
  });
});

// ── Scenario 2: Educator — Feynman Editor Rejection Loop ──────────────────

describe("Scenario: Educator encounters Feynman Editor rejection loop", () => {
  const tools = createThompsonProtocolTools();
  const feynmanEdit = tools.find((t) => t.name === "thompson_feynman_edit")!;

  it("cycle 1: detects high Flesch-Kincaid and banned phrases", async () => {
    const badContent = JSON.stringify({
      sections: [{
        section_id: "1",
        concept: "Quantum superposition",
        plain_english: "It is obvious that quantum superposition allows particles to exist in multiple states simultaneously through wave function collapse mechanisms.",
      }],
    });

    const result = await feynmanEdit.handler({ sections: badContent, rewrite_cycle: 1 });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.rewrite_cycle).toBe(1);
    expect(parsed.deterministic_checks.banned_phrases.length).toBeGreaterThan(0);
    expect(parsed.deterministic_checks.banned_phrases[0].phrase).toBe("it is obvious that");
    expect(parsed.escalate_if_stuck).toBe(false);
  });

  it("cycle 3: escalates stuck sections", async () => {
    const stillBadContent = JSON.stringify({ sections: [{ text: "As we all know, this is straightforward." }] });
    const result = await feynmanEdit.handler({ sections: stillBadContent, rewrite_cycle: 3 });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.escalate_if_stuck).toBe(true);
    expect(parsed.rewrite_cycle).toBe(3);
    expect(parsed.next_step).toContain("stuck");
  });

  it("strict_mode lowers FK threshold to 8", async () => {
    const result = await feynmanEdit.handler({
      sections: "Simple clear text here.",
      rewrite_cycle: 1,
      strict_mode: true,
    });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.fk_threshold).toBe(8);
  });
});

// ── Scenario 3: Marketing Lead — Anti-Elitism Linter (Deterministic) ──────

describe("Scenario: Marketing Lead runs anti-elitism lint on whitepaper conversion", () => {
  it("detects all banned phrase categories", () => {
    const elitistText = [
      "It is obvious that our platform excels.",
      "As we all know, microservices are the future.",
      "Simply put, you just need to deploy the container.",
      "Real engineers know this is straightforward.",
      "As I mentioned before, the API is elementary.",
    ].join(" ");

    const hits = lintBannedPhrases(elitistText);

    const categories = new Set(hits.map((h) => h.category));
    expect(categories).toContain("assumed_knowledge");
    expect(categories).toContain("false_simplification");
    expect(categories).toContain("exclusionary");
    expect(categories).toContain("passive_aggressive");
    expect(hits.length).toBeGreaterThanOrEqual(7);
  });

  it("returns CLEAN for inclusive, jargon-free content", async () => {
    const tools = createThompsonProtocolTools();
    const linter = tools.find((t) => t.name === "thompson_anti_elitism_lint")!;

    const goodContent = [
      "Think of an API like a waiter at a restaurant.",
      "You tell the waiter what you want, and they bring it back from the kitchen.",
      "The waiter doesn't need to know how the food is made.",
      "They just need to know how to take your order and deliver the result.",
      "Does that make sense? Let's build on this idea.",
    ].join(" ");

    const result = await linter.handler({ content: goodContent });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.verdict).toBe("CLEAN");
    expect(parsed.hard_fails).toHaveLength(0);
    expect(parsed.elitism_score).toBeLessThan(20);
    expect(parsed.question_count).toBeGreaterThan(0);
  });

  it("flags content with no questions and no examples in 500+ words", async () => {
    const tools = createThompsonProtocolTools();
    const linter = tools.find((t) => t.name === "thompson_anti_elitism_lint")!;

    // Generate 500+ words of statement-only text
    const dryContent = Array(60).fill("The system processes data through multiple layers of abstraction and transformation.").join(" ");

    const result = await linter.handler({ content: dryContent });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.soft_warnings.length).toBeGreaterThan(0);
    const checks = parsed.soft_warnings.map((w: { check: string }) => w.check);
    expect(checks).toContain("no_questions");
    expect(checks).toContain("no_concrete_examples");
  });

  it("computes elitism score — 0 for clean, high for gatekeeping", async () => {
    const tools = createThompsonProtocolTools();
    const linter = tools.find((t) => t.name === "thompson_anti_elitism_lint")!;

    const cleanResult = await linter.handler({ content: "Think of it this way: a database is like a filing cabinet. You put things in labeled folders." });
    const cleanParsed = JSON.parse(cleanResult.content[0].text);

    const elitistResult = await linter.handler({
      content: "It is obvious that any competent engineer would know this is basic. As we all know, the architecture is elementary and straightforward.",
    });
    const elitistParsed = JSON.parse(elitistResult.content[0].text);

    expect(cleanParsed.elitism_score).toBeLessThan(elitistParsed.elitism_score);
    expect(elitistParsed.elitism_score).toBeGreaterThanOrEqual(30);
  });
});

// ── Scenario 4: Quality Gate — Deterministic Grading ──────────────────────

describe("Scenario: Quality gate grades Thompson content", () => {
  it("deriveThompsonGrade: exemplary (9-10 checks)", () => {
    const perfect: ThompsonQualityChecklist = {
      hasPlainEnglishTranslations: true,
      hasAnalogyPerConcept: true,
      hasDifficultyAcknowledgment: true,
      hasIntuitionBeforeMechanics: true,
      passesFeynmanEdit: true,
      passesAntiElitismLint: true,
      hasVisualMetaphors: true,
      fleschKincaidUnder10: true,
      noBannedPhrases: true,
      hasProgressiveComplexity: true,
    };
    expect(deriveThompsonGrade(perfect)).toBe("exemplary");
  });

  it("deriveThompsonGrade: passing (7-8 checks)", () => {
    const good: ThompsonQualityChecklist = {
      hasPlainEnglishTranslations: true,
      hasAnalogyPerConcept: true,
      hasDifficultyAcknowledgment: true,
      hasIntuitionBeforeMechanics: true,
      passesFeynmanEdit: true,
      passesAntiElitismLint: true,
      hasVisualMetaphors: false,  // skipped visuals
      fleschKincaidUnder10: true,
      noBannedPhrases: true,
      hasProgressiveComplexity: false,
    };
    expect(deriveThompsonGrade(good)).toBe("passing");
  });

  it("deriveThompsonGrade: needs_work (5-6 checks)", () => {
    const mediocre: ThompsonQualityChecklist = {
      hasPlainEnglishTranslations: true,
      hasAnalogyPerConcept: true,
      hasDifficultyAcknowledgment: false,
      hasIntuitionBeforeMechanics: false,
      passesFeynmanEdit: false,
      passesAntiElitismLint: true,
      hasVisualMetaphors: false,
      fleschKincaidUnder10: true,
      noBannedPhrases: true,
      hasProgressiveComplexity: false,
    };
    expect(deriveThompsonGrade(mediocre)).toBe("needs_work");
  });

  it("deriveThompsonGrade: failing (0-4 checks)", () => {
    const bad: ThompsonQualityChecklist = {
      hasPlainEnglishTranslations: false,
      hasAnalogyPerConcept: false,
      hasDifficultyAcknowledgment: false,
      hasIntuitionBeforeMechanics: false,
      passesFeynmanEdit: false,
      passesAntiElitismLint: false,
      hasVisualMetaphors: false,
      fleschKincaidUnder10: true,
      noBannedPhrases: true,
      hasProgressiveComplexity: false,
    };
    expect(deriveThompsonGrade(bad)).toBe("failing");
  });

  it("thompson_quality_gate tool produces correct grade from pipeline outputs", async () => {
    const tools = createThompsonProtocolTools();
    const gate = tools.find((t) => t.name === "thompson_quality_gate")!;

    const writerOutput = JSON.stringify({
      task: {
        jargon_translations: [{ term: "API", translation: "waiter" }],
        analogy: "like a restaurant",
        difficulty_acknowledgment: "This sounds terrifying, but...",
        purpose: "explain how systems talk to each other",
      },
    });

    const feynmanVerdict = JSON.stringify({ sections: [{ verdict: "PASS" }] });
    const lintResult = JSON.stringify({ verdict: "CLEAN", hard_fails: [], readability: { flesch_kincaid_grade: 7.2 } });

    const result = await gate.handler({
      writer_output: writerOutput,
      feynman_verdict: feynmanVerdict,
      lint_result: lintResult,
      visual_map: JSON.stringify({ visuals: [{ prompt: "a waiter carrying plates" }] }),
    });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.pass).toBe(true);
    expect(["exemplary", "passing"]).toContain(parsed.grade);
    expect(parsed.checklist.passesAntiElitismLint).toBe(true);
    expect(parsed.checklist.noBannedPhrases).toBe(true);
    expect(parsed.checklist.fleschKincaidUnder10).toBe(true);
  });
});

// ── Scenario 5: Readability Metrics — Deterministic Computation ───────────

describe("Scenario: Deterministic readability metrics computation", () => {
  it("countSyllables: common words", () => {
    expect(countSyllables("the")).toBe(1);
    expect(countSyllables("hello")).toBe(2);
    expect(countSyllables("beautiful")).toBe(3);
    expect(countSyllables("understanding")).toBe(4);
  });

  it("computeReadabilityMetrics: simple text scores low FK", () => {
    const simple = "The cat sat on the mat. It was a good day. The sun was warm.";
    const metrics = computeReadabilityMetrics(simple);

    expect(metrics.fleschKincaidGrade).toBeLessThan(5);
    expect(metrics.avgSentenceLength).toBeLessThan(10);
  });

  it("computeReadabilityMetrics: academic text scores high FK", () => {
    const academic = "The implementation of distributed consensus algorithms necessitates sophisticated Byzantine fault tolerance mechanisms. Furthermore, asynchronous replication introduces complexities in causal ordering and eventual consistency guarantees.";
    const metrics = computeReadabilityMetrics(academic);

    expect(metrics.fleschKincaidGrade).toBeGreaterThan(12);
    expect(metrics.jargonDensity).toBeGreaterThan(5);
  });

  it("computeReadabilityMetrics: detects passive voice", () => {
    const passive = "The data was processed. The results were analyzed. The report was generated. The findings were published.";
    const metrics = computeReadabilityMetrics(passive);

    expect(metrics.passiveVoicePct).toBeGreaterThan(0);
  });
});

// ── Scenario 6: Banned Phrases — Exhaustive Coverage ──────────────────────

describe("Scenario: Banned phrase detection covers all 22 patterns", () => {
  it("detects every banned phrase in the list", () => {
    for (const entry of BANNED_PHRASES) {
      const hits = lintBannedPhrases(`Some text ${entry.phrase} more text.`);
      expect(hits.length, `Expected to detect "${entry.phrase}"`).toBeGreaterThanOrEqual(1);
      expect(hits[0].category).toBe(entry.category);
      expect(hits[0].replacement.length).toBeGreaterThan(0);
    }
  });

  it("handles multiple occurrences of same phrase", () => {
    const text = "It is obvious that X. And it is obvious that Y.";
    const hits = lintBannedPhrases(text);
    expect(hits.filter((h) => h.phrase === "it is obvious that")).toHaveLength(2);
  });

  it("is case insensitive", () => {
    const hits = lintBannedPhrases("IT IS OBVIOUS THAT this works. As We All Know.");
    expect(hits.length).toBeGreaterThanOrEqual(2);
  });

  it("returns empty for clean text", () => {
    const hits = lintBannedPhrases("Think of it this way: a database is like a filing cabinet.");
    expect(hits).toHaveLength(0);
  });
});

// ── Scenario 7: System Prompts — Contract Integrity ───────────────────────

describe("Scenario: System prompts contain all required constraints", () => {
  it("writer prompt has all 5 mechanical constraints", () => {
    const p = THOMPSON_SYSTEM_PROMPTS.writer;
    expect(p).toContain("PLAIN ENGLISH MANDATE");
    expect(p).toContain("ACKNOWLEDGE DIFFICULTY");
    expect(p).toContain("INTUITION BEFORE MECHANICS");
    expect(p).toContain("ONE IDEA PER PARAGRAPH");
    expect(p).toContain("PROGRESSIVE COMPLEXITY");
  });

  it("feynman editor has all 8 rejection criteria", () => {
    const p = THOMPSON_SYSTEM_PROMPTS.feynman_editor;
    expect(p).toContain("TEXTBOOK TONE");
    expect(p).toContain("UNEXPLAINED ACRONYM");
    expect(p).toContain("MISSING ANALOGY");
    expect(p).toContain("ASSUMED KNOWLEDGE");
    expect(p).toContain("PASSIVE VOICE DENSITY");
    expect(p).toContain("FLESCH-KINCAID");
    expect(p).toContain("CONDESCENDING SIMPLIFICATION");
    expect(p).toContain("WALL OF ABSTRACTION");
  });

  it("visual mapper has accessibility requirements", () => {
    const p = THOMPSON_SYSTEM_PROMPTS.visual_mapper;
    expect(p).toContain("alt-text");
    expect(p).toContain("NO TEXT IN VISUALS");
    expect(p).toContain("SCENE CONTINUITY");
    expect(p).toContain("LITERAL MAPPING");
  });

  it("anti-elitism linter has all 4 banned categories", () => {
    const p = THOMPSON_SYSTEM_PROMPTS.anti_elitism_linter;
    expect(p).toContain("Assumed Knowledge");
    expect(p).toContain("False Simplification");
    expect(p).toContain("Exclusionary");
    expect(p).toContain("Passive Aggressive");
  });
});

// ── Scenario 8: Edge Cases — Adversarial Inputs ───────────────────────────

describe("Scenario: Adversarial and edge case inputs", () => {
  const tools = createThompsonProtocolTools();

  it("handles empty content gracefully in linter", async () => {
    const linter = tools.find((t) => t.name === "thompson_anti_elitism_lint")!;
    const result = await linter.handler({ content: "" });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.verdict).toBe("CLEAN");
    expect(parsed.word_count).toBeLessThanOrEqual(1); // empty string split produces [""]
    expect(parsed.elitism_score).toBe(0);
  });

  it("handles malformed JSON in quality gate", async () => {
    const gate = tools.find((t) => t.name === "thompson_quality_gate")!;
    const result = await gate.handler({
      writer_output: "not json at all",
      feynman_verdict: "{broken",
      lint_result: "{}",
    });
    const parsed = JSON.parse(result.content[0].text);

    // Should not crash — produces a grade (likely failing)
    expect(parsed.grade).toBeDefined();
    expect(parsed.checklist).toBeDefined();
  });

  it("handles unicode and special characters in linter", async () => {
    const linter = tools.find((t) => t.name === "thompson_anti_elitism_lint")!;
    const result = await linter.handler({
      content: "Die Quantenverschränkung ist faszinierend. 量子纠缠很有趣。 Think of it as two coins that always land the same way.",
    });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.verdict).toBe("CLEAN");
    expect(parsed.readability).toBeDefined();
  });

  it("writer handles raw_content transformation mode", async () => {
    const writer = tools.find((t) => t.name === "thompson_write")!;
    const result = await writer.handler({
      topic: "Neural networks",
      raw_content: "A neural network is a computational model inspired by biological neural networks that processes information using connectionist approaches.",
    });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.task.raw_content).toContain("neural network");
    expect(parsed.task.instructions).toContainEqual(expect.stringContaining("Transform the provided raw_content"));
  });
});

// ── Scenario 9: Analogy Density Detection ──────────────────────────────────

describe("Scenario: Analogy density scoring for positive Thompson signals", () => {
  it("detects analogies in Thompson-style content", () => {
    const text = "Think of a database like a filing cabinet. Each drawer is similar to a table, and the folders inside work like rows.";
    const result = computeAnalogyDensity(text);
    expect(result.analogyCount).toBeGreaterThanOrEqual(2);
    expect(result.score).toBeGreaterThan(0);
    expect(result.details.some(d => d.includes("analogy"))).toBe(true);
  });

  it("detects difficulty acknowledgments", () => {
    const text = "This sounds complicated, but it is actually quite manageable once you see the pattern. Most textbooks make this harder than it needs to be.";
    const result = computeAnalogyDensity(text);
    expect(result.difficultyAckCount).toBeGreaterThanOrEqual(1);
    expect(result.details.some(d => d.includes("difficulty"))).toBe(true);
  });

  it("detects plain-language translations", () => {
    const text = "The API handles authentication. In other words, it checks your ID at the door. That means you need a valid key to get in.";
    const result = computeAnalogyDensity(text);
    expect(result.translationCount).toBeGreaterThanOrEqual(1);
    expect(result.details.some(d => d.includes("translation"))).toBe(true);
  });

  it("flags content with zero analogies in 200+ words", () => {
    const filler = "The system processes data through the pipeline. ".repeat(15); // ~105 words × 2
    const longText = filler + filler;
    const result = computeAnalogyDensity(longText);
    expect(result.analogyCount).toBe(0);
    expect(result.wordCount).toBeGreaterThan(200);
    expect(result.details.some(d => d.includes("missing: no analogies"))).toBe(true);
  });

  it("scores high for Thompson-exemplary content", () => {
    const text = `This sounds complicated, but think of machine learning like a filing cabinet that organizes itself.
    In other words, the computer learns patterns from examples — similar to how you learned to recognize dogs by seeing lots of dogs.
    Imagine you had to sort a million photos. That is what the model does, but faster. Does that make sense?`;
    const result = computeAnalogyDensity(text);
    expect(result.score).toBeGreaterThan(30);
    expect(result.analogyCount).toBeGreaterThanOrEqual(2);
    expect(result.questionCount).toBeGreaterThanOrEqual(1);
    expect(result.difficultyAckCount).toBeGreaterThanOrEqual(1);
  });

  it("returns zero score for empty text", () => {
    const result = computeAnalogyDensity("");
    expect(result.score).toBe(0);
    expect(result.analogyCount).toBe(0);
    expect(result.wordCount).toBe(0);
  });

  it("counts questions as engagement markers", () => {
    const text = "What happens when the server goes down? How do you recover? Think of it like a backup generator.";
    const result = computeAnalogyDensity(text);
    expect(result.questionCount).toBe(2);
    expect(result.analogyCount).toBeGreaterThanOrEqual(1);
  });
});
