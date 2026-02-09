/**
 * Critter Tools — The accountability partner that wants to know everything.
 *
 * Convex-flavored version: "Why are you making this schema change? Who needs this function?"
 * The friction is the feature — slowing down to think prevents Convex-specific pitfalls
 * like unnecessary indexes, over-normalized schemas, and functions nobody calls.
 *
 * 1 tool:
 * - convex_critter_check: Pre-action intentionality check for Convex work
 */

import { getDb } from "../db.js";
import type { McpTool } from "../types.js";

// ── DB setup ────────────────────────────────────────────────────────────────

function ensureCritterTable(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS critter_checks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task TEXT NOT NULL,
      why TEXT NOT NULL,
      who TEXT NOT NULL,
      success_looks_like TEXT,
      score INTEGER NOT NULL,
      verdict TEXT NOT NULL,
      feedback TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
}

// ── Scoring logic ───────────────────────────────────────────────────────────

interface CritterInput {
  task: string;
  why: string;
  who: string;
  success_looks_like?: string;
}

function scoreCritterCheck(input: CritterInput): {
  score: number;
  verdict: "proceed" | "reconsider" | "stop";
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 100;
  const taskLower = input.task.toLowerCase().trim();
  const whyLower = input.why.toLowerCase().trim();
  const whoLower = input.who.toLowerCase().trim();

  // Check 1: Circular reasoning (threshold 0.5)
  const taskWords = new Set(taskLower.split(/\s+/).filter((w) => w.length > 3));
  const whyWords = whyLower.split(/\s+/).filter((w) => w.length > 3);
  const overlap = whyWords.filter((w) => taskWords.has(w));
  if (whyWords.length > 0 && overlap.length / whyWords.length > 0.5) {
    score -= 30;
    feedback.push("Circular: your 'why' mostly restates the task. What user outcome does this enable?");
  }

  // Check 2: Vague audience
  const vagueAudiences = ["users", "everyone", "people", "the team", "stakeholders", "clients", "customers", "developers"];
  if (vagueAudiences.includes(whoLower)) {
    score -= 20;
    feedback.push(`"${input.who}" is too broad. Which user role or API consumer specifically?`);
  }

  // Check 3: Empty or too short
  if (whyLower.length === 0) {
    score -= 40;
    feedback.push("Empty 'why': you haven't stated any purpose at all.");
  } else if (whyLower.length < 10) {
    score -= 25;
    feedback.push("The 'why' is too short. What problem does this solve?");
  }
  if (whoLower.length < 3) {
    score -= 25;
    feedback.push("The 'who' is too short. Specify who benefits.");
  }

  // Check 4: Deference over understanding
  const deferPatterns = ["was told", "asked to", "ticket says", "was asked", "jira", "they said"];
  if (deferPatterns.some((p) => whyLower.includes(p))) {
    score -= 15;
    feedback.push("Citing authority instead of understanding purpose. Why does this matter to the product?");
  }

  // Check 5: Non-answer patterns (count matches, -20 each, cap -40)
  const nonAnswerPatterns = [
    "just because", "don't know", "not sure", "why not", "might need it",
    "no reason", "no idea", "whatever", "idk", "tbd",
  ];
  const nonAnswerHits = nonAnswerPatterns.filter((p) => whyLower.includes(p)).length;
  if (nonAnswerHits > 0) {
    const nonAnswerPenalty = Math.min(nonAnswerHits * 20, 40);
    score -= nonAnswerPenalty;
    feedback.push("Non-answer: your 'why' signals unclear purpose. What specific problem does this solve?");
  }

  // Check 6: Repetitive padding (why + who)
  const whyAllWords = whyLower.split(/\s+/).filter((w) => w.length > 2);
  if (whyAllWords.length >= 5) {
    const whyUniqueWords = new Set(whyAllWords);
    if (whyUniqueWords.size / whyAllWords.length < 0.4) {
      score -= 25;
      feedback.push("Repetitive: your 'why' repeats the same words. Articulate distinct reasoning.");
    }
  }
  const whoAllWords = whoLower.split(/\s+/).filter((w) => w.length > 2);
  if (whoAllWords.length >= 5) {
    const whoUniqueWords = new Set(whoAllWords);
    if (whoUniqueWords.size / whoAllWords.length < 0.4) {
      score -= 25;
      feedback.push("Repetitive: your 'who' repeats the same words. Name a real audience.");
    }
  }

  // Check 7: Buzzword-heavy corporate-speak (scans why + who)
  const buzzwords = [
    "leverage", "synergies", "synergy", "paradigm", "holistic", "alignment",
    "transformation", "innovative", "disruptive", "best practices",
    "streamline", "ecosystem", "actionable", "circle back",
  ];
  const allText = `${whyLower} ${whoLower}`;
  const buzzCount = buzzwords.filter((b) => allText.includes(b)).length;
  if (buzzCount >= 4) {
    score -= 35;
    feedback.push("Buzzword-heavy: corporate-speak without concrete meaning. What specific problem does this solve?");
  } else if (buzzCount >= 3) {
    score -= 30;
    feedback.push("Buzzword-heavy: corporate-speak without concrete meaning. What specific problem does this solve?");
  } else if (buzzCount >= 2) {
    score -= 20;
    feedback.push("Buzzword-heavy: corporate-speak without concrete meaning. What specific problem does this solve?");
  }

  // Check 8: Hedging language
  const hedgeWords = ["could", "potentially", "maybe", "possibly", "might", "perhaps", "hopefully"];
  const hedgeCount = hedgeWords.filter((h) => {
    const regex = new RegExp(`\\b${h}\\b`, "i");
    return regex.test(whyLower);
  }).length;
  if (hedgeCount >= 2) {
    score -= 15;
    feedback.push("Hedging: too many 'could/maybe/potentially' signals uncertain value. Be definitive.");
  }

  // Check 9: Task-word echo — same word from task repeated 3+ times in why
  for (const tw of taskWords) {
    const twCount = whyWords.filter((w) => w === tw).length;
    if (twCount >= 3) {
      score -= 20;
      feedback.push(`Echo: "${tw}" appears ${twCount} times in your 'why' — this is filler, not reasoning.`);
      break;
    }
  }

  // Bonus for specificity
  if (input.success_looks_like && input.success_looks_like.length > 20) {
    score += 10;
    feedback.push("Good: success criteria defined — this makes the deploy gate concrete.");
  }

  score = Math.max(0, Math.min(100, score));

  let verdict: "proceed" | "reconsider" | "stop";
  if (score >= 70) {
    verdict = "proceed";
    if (feedback.length === 0) {
      feedback.push("Clear intent. Proceed with confidence.");
    }
  } else if (score >= 40) {
    verdict = "reconsider";
    feedback.push("Pause. Sharpen your answers before writing Convex code.");
  } else {
    verdict = "stop";
    feedback.push("Stop: purpose unclear. Do not proceed.");
  }

  return { score, verdict, feedback };
}

// ── Tool definition ─────────────────────────────────────────────────────────

export const critterTools: McpTool[] = [
  {
    name: "convex_critter_check",
    description:
      "The accountability partner that wants to know everything — answer 'Why are you doing this? Who is it for?' before starting Convex work. " +
      "Scores for circular reasoning, vague audiences, and deference-over-understanding. " +
      "The friction is the feature: slowing down prevents unnecessary schema changes, unneeded indexes, and functions nobody calls.",
    inputSchema: {
      type: "object",
      properties: {
        task: {
          type: "string",
          description: "What you are about to do (e.g. 'Add a new table for user preferences')",
        },
        why: {
          type: "string",
          description: "Why are you doing this? What user problem does it solve?",
        },
        who: {
          type: "string",
          description: "Who is this for? Name a specific role, persona, or API consumer.",
        },
        success_looks_like: {
          type: "string",
          description: "Optional: What does success look like? How will you verify this worked?",
        },
      },
      required: ["task", "why", "who"],
    },
    handler: async (args: CritterInput) => {
      ensureCritterTable();
      const result = scoreCritterCheck(args);

      const db = getDb();
      db.prepare(
        `INSERT INTO critter_checks (task, why, who, success_looks_like, score, verdict, feedback)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(
        args.task,
        args.why,
        args.who,
        args.success_looks_like ?? null,
        result.score,
        result.verdict,
        JSON.stringify(result.feedback),
      );

      return {
        score: result.score,
        verdict: result.verdict,
        feedback: result.feedback,
        tip: result.verdict === "proceed"
          ? "Critter check passed. Proceed with clear intent."
          : "Sharpen your answers and re-run convex_critter_check.",
      };
    },
  },
];
