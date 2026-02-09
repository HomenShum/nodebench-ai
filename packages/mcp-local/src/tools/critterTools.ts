/**
 * Critter Tools — The accountability partner that wants to know everything.
 *
 * Like a girlfriend who asks "so why are you doing this? who is it for?" —
 * annoying in the moment, but actually a great productivity enhancer.
 * The friction is the feature: making agents slow down to articulate purpose
 * and audience prevents scope creep, cargo-cult coding, and aimless exploration.
 *
 * What critter catches:
 * - Circular reasoning ("I'm adding auth because we need auth")
 * - Vague audiences ("it's for users" — which users? doing what?)
 * - Deference over understanding ("because the ticket says so")
 * - Missing success criteria (how will you know it worked?)
 *
 * Inspired by daily intentionality questions that surface clarity from chaos.
 *
 * 1 tool:
 * - critter_check: Submit a task + why + who for intentionality scoring
 */

import { getDb, genId } from "../db.js";
import type { McpTool } from "../types.js";

// ── DB setup ────────────────────────────────────────────────────────────────

function ensureCritterTable(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS critter_checks (
      id TEXT PRIMARY KEY,
      task TEXT NOT NULL,
      why TEXT NOT NULL,
      who TEXT NOT NULL,
      success_looks_like TEXT,
      simplest_version TEXT,
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
  simplest_version?: string;
}

interface CritterResult {
  score: number;
  verdict: "proceed" | "reconsider" | "stop";
  feedback: string[];
  id: string;
}

function scoreCritterCheck(input: CritterInput): CritterResult {
  const feedback: string[] = [];
  let score = 100;
  const taskLower = input.task.toLowerCase().trim();
  const whyLower = input.why.toLowerCase().trim();
  const whoLower = input.who.toLowerCase().trim();

  // ── Check 1: Circular reasoning — "why" just restates the task ────────
  const taskWords = new Set(taskLower.split(/\s+/).filter((w) => w.length > 3));
  const whyWords = whyLower.split(/\s+/).filter((w) => w.length > 3);
  const overlap = whyWords.filter((w) => taskWords.has(w));
  if (whyWords.length > 0 && overlap.length / whyWords.length > 0.5) {
    score -= 30;
    feedback.push("Circular: your 'why' mostly restates the task. Dig deeper — what outcome does this enable?");
  }

  // ── Check 2: Vague audience ───────────────────────────────────────────
  const vagueAudiences = ["users", "everyone", "people", "the team", "stakeholders", "clients", "customers", "developers"];
  if (vagueAudiences.includes(whoLower)) {
    score -= 20;
    feedback.push(`Vague audience: "${input.who}" is too broad. Who specifically benefits? Name a role, persona, or individual.`);
  }

  // ── Check 3: Empty or trivially short responses ───────────────────────
  if (whyLower.length === 0) {
    score -= 40;
    feedback.push("Empty 'why': you haven't stated any purpose at all. Why does this work matter?");
  } else if (whyLower.length < 10) {
    score -= 25;
    feedback.push("The 'why' is too short. A clear purpose needs at least a full sentence.");
  }
  if (whoLower.length < 3) {
    score -= 25;
    feedback.push("The 'who' is too short. Specify who benefits from this work.");
  }

  // ── Check 4: "Because I was told to" or "it's in the ticket" ─────────
  const deferPatterns = [
    "was told", "asked to", "ticket says", "was asked", "requirement says",
    "spec says", "jira", "because I was", "they said", "assigned to me",
  ];
  if (deferPatterns.some((p) => whyLower.includes(p))) {
    score -= 15;
    feedback.push("Deference detected: you're citing authority rather than understanding purpose. Why does this matter beyond the ticket?");
  }

  // ── Check 5: Non-answer patterns — explicit "I don't know" ───────────
  const nonAnswerPatterns = [
    "just because", "don't know", "not sure", "why not", "might need it",
    "no reason", "no idea", "whatever", "idk", "tbd",
  ];
  const nonAnswerHits = nonAnswerPatterns.filter((p) => whyLower.includes(p)).length;
  if (nonAnswerHits > 0) {
    const nonAnswerPenalty = Math.min(nonAnswerHits * 20, 40); // -20 per match, cap -40
    score -= nonAnswerPenalty;
    feedback.push("Non-answer: your 'why' signals you haven't figured out the purpose yet. What specific problem does this solve?");
  }

  // ── Check 6: Repetitive padding — same words repeated to fake length ──
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

  // ── Check 7: Buzzword-heavy corporate-speak ──────────────────────────
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

  // ── Check 8: Hedging language — signals unclear value ─────────────────
  const hedgeWords = ["could", "potentially", "maybe", "possibly", "might", "perhaps", "hopefully"];
  const hedgeCount = hedgeWords.filter((h) => {
    const regex = new RegExp(`\\b${h}\\b`, "i");
    return regex.test(whyLower);
  }).length;
  if (hedgeCount >= 2) {
    score -= 15;
    feedback.push("Hedging: too many 'could/maybe/potentially' signals uncertain value. What WILL this achieve?");
  }

  // ── Check 9: Task-word echo — same word from task repeated 3+ times in why
  for (const tw of taskWords) {
    const twCount = whyWords.filter((w) => w === tw).length;
    if (twCount >= 3) {
      score -= 20;
      feedback.push(`Echo: "${tw}" appears ${twCount} times in your 'why' — this is filler, not reasoning.`);
      break; // one echo penalty max
    }
  }

  // ── Check 10: Bonus for specificity ───────────────────────────────────
  if (input.success_looks_like && input.success_looks_like.length > 20) {
    score += 10;
    feedback.push("Good: you defined what success looks like — this makes verification concrete.");
  }
  if (input.simplest_version && input.simplest_version.length > 20) {
    score += 10;
    feedback.push("Good: you identified the simplest version — this guards against over-engineering.");
  }

  // Clamp
  score = Math.max(0, Math.min(100, score));

  // Verdict
  let verdict: "proceed" | "reconsider" | "stop";
  if (score >= 70) {
    verdict = "proceed";
    if (feedback.length === 0) {
      feedback.push("Strong intentionality. Purpose and audience are clear — proceed with confidence.");
    }
  } else if (score >= 40) {
    verdict = "reconsider";
    feedback.push("Pause and sharpen your thinking before writing code. Re-run critter_check once you have clearer answers.");
  } else {
    verdict = "stop";
    feedback.push("Stop: the purpose is unclear. Do not proceed until you can articulate WHY and WHO clearly.");
  }

  return { score, verdict, feedback, id: genId("crit") };
}

// ── Tool definition ─────────────────────────────────────────────────────────

export const critterTools: McpTool[] = [
  {
    name: "critter_check",
    description:
      "The accountability partner that wants to know everything — answer 'Why are you doing this? Who is it for?' before starting work. " +
      "Scores your answers for circular reasoning, vague audiences, and deference-over-understanding. " +
      "Returns a go/no-go verdict. The friction is the feature: slowing down to think prevents scope creep and aimless work. " +
      "Call this at the start of any non-trivial task.",
    inputSchema: {
      type: "object",
      properties: {
        task: {
          type: "string",
          description: "What you are about to do (the action, not the goal)",
        },
        why: {
          type: "string",
          description:
            "Why are you doing this? Explain the purpose, not just the instruction. Avoid restating the task.",
        },
        who: {
          type: "string",
          description:
            "Who is this for? Name a specific role, persona, or person — not 'users' or 'everyone'.",
        },
        success_looks_like: {
          type: "string",
          description:
            "Optional: What does success look like? How will you know this worked?",
        },
        simplest_version: {
          type: "string",
          description:
            "Optional: What is the simplest version that still delivers value?",
        },
      },
      required: ["task", "why", "who"],
    },
    handler: async (args: CritterInput) => {
      ensureCritterTable();
      const result = scoreCritterCheck(args);

      // Persist for accountability
      const db = getDb();
      db.prepare(
        `INSERT INTO critter_checks (id, task, why, who, success_looks_like, simplest_version, score, verdict, feedback)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        result.id,
        args.task,
        args.why,
        args.who,
        args.success_looks_like ?? null,
        args.simplest_version ?? null,
        result.score,
        result.verdict,
        JSON.stringify(result.feedback),
      );

      return {
        id: result.id,
        score: result.score,
        verdict: result.verdict,
        feedback: result.feedback,
        tip: result.verdict === "proceed"
          ? "You've passed the critter check. Proceed with clear intent."
          : "Sharpen your answers and re-run critter_check before proceeding.",
      };
    },
  },
];
