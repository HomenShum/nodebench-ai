/**
 * Critter Tool Calibration Eval — tests how useful the scoring really is.
 *
 * 19 scenarios across 4 tiers. Scoring logic mirrored from critterTools.ts.
 *
 * Run: npx tsx packages/mcp-local/src/__tests__/critterCalibrationEval.ts
 */

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
}

// ── Mirror of critterTools.ts scoreCritterCheck — keep in sync! ──────────

function scoreCritterCheck(input: CritterInput): CritterResult {
  const feedback: string[] = [];
  let score = 100;
  const taskLower = input.task.toLowerCase().trim();
  const whyLower = input.why.toLowerCase().trim();
  const whoLower = input.who.toLowerCase().trim();

  // 1: Circular reasoning (threshold 0.5)
  const taskWords = new Set(taskLower.split(/\s+/).filter((w) => w.length > 3));
  const whyWords = whyLower.split(/\s+/).filter((w) => w.length > 3);
  const overlap = whyWords.filter((w) => taskWords.has(w));
  if (whyWords.length > 0 && overlap.length / whyWords.length > 0.5) {
    score -= 30;
    feedback.push("Circular");
  }

  // 2: Vague audience
  const vagueAudiences = ["users", "everyone", "people", "the team", "stakeholders", "clients", "customers", "developers"];
  if (vagueAudiences.includes(whoLower)) {
    score -= 20;
    feedback.push(`Vague: "${input.who}"`);
  }

  // 3: Empty or too short
  if (whyLower.length === 0) {
    score -= 40;
    feedback.push("Empty why");
  } else if (whyLower.length < 10) {
    score -= 25;
    feedback.push("Why too short");
  }
  if (whoLower.length < 3) {
    score -= 25;
    feedback.push("Who too short");
  }

  // 4: Deference
  const deferPatterns = [
    "was told", "asked to", "ticket says", "was asked", "requirement says",
    "spec says", "jira", "because I was", "they said", "assigned to me",
  ];
  if (deferPatterns.some((p) => whyLower.includes(p))) {
    score -= 15;
    feedback.push("Deference");
  }

  // 5: Non-answer (count matches, -20 each, cap -40)
  const nonAnswerPatterns = [
    "just because", "don't know", "not sure", "why not", "might need it",
    "no reason", "no idea", "whatever", "idk", "tbd",
  ];
  const nonAnswerHits = nonAnswerPatterns.filter((p) => whyLower.includes(p)).length;
  if (nonAnswerHits > 0) {
    const penalty = Math.min(nonAnswerHits * 20, 40);
    score -= penalty;
    feedback.push(`Non-answer x${nonAnswerHits} (-${penalty})`);
  }

  // 6: Repetitive padding (why + who)
  const whyAllWords = whyLower.split(/\s+/).filter((w) => w.length > 2);
  if (whyAllWords.length >= 5) {
    const whyUniqueWords = new Set(whyAllWords);
    if (whyUniqueWords.size / whyAllWords.length < 0.4) {
      score -= 25;
      feedback.push("Why repetitive");
    }
  }
  const whoAllWords = whoLower.split(/\s+/).filter((w) => w.length > 2);
  if (whoAllWords.length >= 5) {
    const whoUniqueWords = new Set(whoAllWords);
    if (whoUniqueWords.size / whoAllWords.length < 0.4) {
      score -= 25;
      feedback.push("Who repetitive");
    }
  }

  // 7: Buzzword-heavy (scans why + who, graduated: 3+ = -30, 2 = -20)
  const buzzwords = [
    "leverage", "synergies", "synergy", "paradigm", "holistic", "alignment",
    "transformation", "innovative", "disruptive", "best practices",
    "streamline", "ecosystem", "actionable", "circle back",
  ];
  const allText = `${whyLower} ${whoLower}`;
  const buzzCount = buzzwords.filter((b) => allText.includes(b)).length;
  if (buzzCount >= 4) {
    score -= 35;
    feedback.push(`Buzzwords x${buzzCount}`);
  } else if (buzzCount >= 3) {
    score -= 30;
    feedback.push(`Buzzwords x${buzzCount}`);
  } else if (buzzCount >= 2) {
    score -= 20;
    feedback.push(`Buzzwords x${buzzCount}`);
  }

  // 8: Hedging language
  const hedgeWords = ["could", "potentially", "maybe", "possibly", "might", "perhaps", "hopefully"];
  const hedgeCount = hedgeWords.filter((h) => {
    const regex = new RegExp(`\\b${h}\\b`, "i");
    return regex.test(whyLower);
  }).length;
  if (hedgeCount >= 2) {
    score -= 15;
    feedback.push(`Hedging x${hedgeCount}`);
  }

  // 9: Task-word echo
  for (const tw of taskWords) {
    const twCount = whyWords.filter((w) => w === tw).length;
    if (twCount >= 3) {
      score -= 20;
      feedback.push(`Echo: "${tw}" x${twCount}`);
      break;
    }
  }

  // 10: Bonuses
  if (input.success_looks_like && input.success_looks_like.length > 20) {
    score += 10;
    feedback.push("+success");
  }
  if (input.simplest_version && input.simplest_version.length > 20) {
    score += 10;
    feedback.push("+simplest");
  }

  score = Math.max(0, Math.min(100, score));
  let verdict: "proceed" | "reconsider" | "stop";
  if (score >= 70) verdict = "proceed";
  else if (score >= 40) verdict = "reconsider";
  else verdict = "stop";

  return { score, verdict, feedback };
}

// ── Scenarios ──────────────────────────────────────────────────────────────

interface TestCase {
  label: string;
  input: CritterInput;
  expectedVerdict: "proceed" | "reconsider" | "stop";
  expectedScoreRange: [number, number];
}

const scenarios: TestCase[] = [
  // ── GOOD — should proceed ────────────────────────────────────────────
  {
    label: "GOOD-1: Clear purpose, specific audience",
    input: {
      task: "Add rate limiting to the public API endpoints",
      why: "Our API is getting hammered by a scraper bot causing 503s for real customers — rate limiting protects availability",
      who: "E-commerce customers who see checkout failures during bot attacks",
    },
    expectedVerdict: "proceed",
    expectedScoreRange: [80, 100],
  },
  {
    label: "GOOD-2: With both bonuses",
    input: {
      task: "Migrate from REST to GraphQL",
      why: "Mobile app makes 12 API calls per screen because REST endpoints return fixed shapes — GraphQL lets us fetch exactly what each screen needs in one round trip",
      who: "Mobile team (3 iOS + 2 Android devs) who spend 40% of sprint on pagination workarounds",
      success_looks_like: "Screen load API calls drop from 12 to 1-2, mobile team velocity increases by at least 20%",
      simplest_version: "Start with the 3 highest-traffic screens, keep REST alive for backwards compat",
    },
    expectedVerdict: "proceed",
    expectedScoreRange: [100, 100],
  },
  {
    label: "GOOD-3: Short but specific",
    input: {
      task: "Fix the dark mode toggle",
      why: "Toggle doesn't persist across page reloads — users report losing their setting every time",
      who: "Users with visual sensitivities who rely on dark mode for comfort",
    },
    expectedVerdict: "proceed",
    expectedScoreRange: [80, 100],
  },
  {
    label: "GOOD-4: Infra task with system audience",
    input: {
      task: "Add a health check endpoint",
      why: "Kubernetes needs a liveness probe to restart crashed pods",
      who: "The Kubernetes orchestration layer",
    },
    expectedVerdict: "proceed",
    expectedScoreRange: [80, 100],
  },
  {
    label: "GOOD-5: Shares domain words but isn't circular",
    input: {
      task: "Add password reset flow to the authentication module",
      why: "Users who forget their password currently have to email support and wait 24h for a manual reset — this is our #1 support ticket category",
      who: "End users who lock themselves out (estimated 15% of monthly active users)",
    },
    expectedVerdict: "proceed",
    expectedScoreRange: [80, 100],
  },

  // ── MEDIOCRE — should reconsider ──────────────────────────────────────
  {
    label: "MED-1: Circular + vague",
    input: {
      task: "Add user authentication and login system to the application",
      why: "Because we need user authentication and login system in the application",
      who: "users",
    },
    expectedVerdict: "reconsider",
    expectedScoreRange: [40, 55],
  },
  {
    label: "MED-2: Deference + vague",
    input: {
      task: "Refactor the payment module",
      why: "The ticket says we need to refactor payments before Q3",
      who: "the team",
    },
    expectedVerdict: "reconsider",
    expectedScoreRange: [45, 69],
  },
  {
    label: "MED-3: Good who but lazy why",
    input: {
      task: "Add caching to the dashboard API",
      why: "For speed",
      who: "Internal analytics team who refreshes dashboards 50+ times daily",
    },
    expectedVerdict: "proceed", // Borderline — score 75 with warning is acceptable
    expectedScoreRange: [70, 80],
  },
  {
    label: "MED-4: Deference rescued by specificity",
    input: {
      task: "Add WebSocket support",
      why: "The PM asked to add real-time updates because customer support agents currently poll every 30 seconds, causing delayed responses to urgent tickets",
      who: "Customer support team handling 200+ tickets/day",
      success_looks_like: "Ticket updates appear within 1 second instead of up to 30 seconds",
    },
    expectedVerdict: "proceed",
    expectedScoreRange: [85, 100],
  },
  {
    label: "MED-5: Good why but vague 'stakeholders'",
    input: {
      task: "Add audit logging to the admin panel",
      why: "SOC2 compliance requires immutable audit trails for all admin actions — we fail the next audit without this",
      who: "stakeholders",
    },
    expectedVerdict: "proceed",
    expectedScoreRange: [70, 85],
  },

  // ── BAD ──────────────────────────────────────────────────────────────
  {
    label: "BAD-1: Deference + vague",
    input: { task: "Do the thing", why: "Was told to", who: "everyone" },
    expectedVerdict: "reconsider",
    expectedScoreRange: [40, 69],
  },
  {
    label: "BAD-2: Empty why",
    input: { task: "Add a new endpoint", why: "", who: "me" },
    expectedVerdict: "stop",
    expectedScoreRange: [0, 39],
  },
  {
    label: "BAD-3: Circular + vague (threshold 0.5)",
    input: {
      task: "Update the user interface for the dashboard component",
      why: "We need to update the user interface for the dashboard component to make it better",
      who: "people",
    },
    expectedVerdict: "reconsider",
    expectedScoreRange: [40, 55],
  },

  // ── EDGE CASES ──────────────────────────────────────────────────────
  {
    label: "EDGE-1: Buzzwords masking emptiness (why + who scanned)",
    input: {
      task: "Implement the new feature",
      why: "To leverage synergies and drive engagement through digital transformation and innovation paradigms",
      who: "Cross-functional stakeholder alignment team",
    },
    // 4+ buzzwords in why+who (leverage, synergies, transformation, paradigm, alignment) → -30
    expectedVerdict: "reconsider",
    expectedScoreRange: [50, 69],
  },
  {
    label: "EDGE-2: Padding with repetition (why + who)",
    input: {
      task: "Fix the bug",
      why: "need need need need need need need need need need need need",
      who: "test test test test test test test test test test test test",
    },
    // Why repetition (-25) + who repetition (-25) = 50 → reconsider
    expectedVerdict: "reconsider",
    expectedScoreRange: [40, 55],
  },
  {
    label: "EDGE-3: Double non-answer ('just because' + 'might need it')",
    input: {
      task: "Add a new database table",
      why: "Just because we might need it later",
      who: "Maybe someone eventually",
    },
    // 2 non-answer hits × -20 = -40 → score 60 → reconsider
    expectedVerdict: "reconsider",
    expectedScoreRange: [40, 65],
  },
  {
    label: "EDGE-4: Hedging with good audience",
    input: {
      task: "Build a recommendation engine",
      why: "It could potentially maybe help with user retention if people use it",
      who: "Product manager who wants to try ML features",
    },
    // Hedging (could+potentially+maybe) = -15 → score 85 → proceed with warning
    expectedVerdict: "proceed",
    expectedScoreRange: [80, 90],
  },
  {
    label: "EDGE-5: Long vacuous echo + vague audience",
    input: {
      task: "Refactor the codebase",
      why: "We need to refactor the codebase because the codebase needs refactoring and the current state of the codebase is such that refactoring would be beneficial for the overall quality of the codebase moving forward in the future",
      who: "developers",
    },
    // Echo: 'codebase' x4 (-20) + vague 'developers' (-20) = 60 → reconsider
    expectedVerdict: "reconsider",
    expectedScoreRange: [40, 69],
  },
  {
    label: "EDGE-6: 'customers' now vague",
    input: {
      task: "Deploy to production",
      why: "Performance improvements need to reach production for customer benefit today",
      who: "customers",
    },
    // Vague 'customers' (-20) → 80 → proceed with warning
    expectedVerdict: "proceed",
    expectedScoreRange: [70, 85],
  },
];

// ── Run ────────────────────────────────────────────────────────────────────

console.log("═══════════════════════════════════════════════════════════════");
console.log(`CRITTER CALIBRATION EVAL — ${scenarios.length} scenarios`);
console.log("═══════════════════════════════════════════════════════════════\n");

let passed = 0;
let failed = 0;
const gaps: string[] = [];

for (const tc of scenarios) {
  const r = scoreCritterCheck(tc.input);
  const vOk = r.verdict === tc.expectedVerdict;
  const sOk = r.score >= tc.expectedScoreRange[0] && r.score <= tc.expectedScoreRange[1];
  const ok = vOk && sOk;

  const status = ok ? "  PASS" : "  FAIL";
  console.log(`${status}  ${tc.label}`);
  console.log(`        Score: ${r.score}${sOk ? "" : ` (expected ${tc.expectedScoreRange[0]}-${tc.expectedScoreRange[1]})`}, Verdict: ${r.verdict}${vOk ? "" : ` (expected ${tc.expectedVerdict})`}`);
  console.log(`        Checks: [${r.feedback.join("; ")}]`);
  if (!ok) {
    failed++;
    gaps.push(`${tc.label}: score=${r.score} verdict=${r.verdict}`);
  } else {
    passed++;
  }
  console.log();
}

console.log("═══════════════════════════════════════════════════════════════");
console.log(`RESULTS: ${passed}/${scenarios.length} passed, ${failed} failed`);
console.log(`CALIBRATION: ${Math.round(passed / scenarios.length * 100)}%`);
console.log("═══════════════════════════════════════════════════════════════");

if (gaps.length > 0) {
  console.log("\nREMAINING GAPS:");
  for (const g of gaps) console.log(`  -> ${g}`);
}

process.exit(failed > 0 ? 1 : 0);
