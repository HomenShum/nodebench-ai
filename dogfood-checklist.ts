/**
 * Dogfood: dry-run the new evidence checklist rendering in LinkedIn posts.
 * Run: npx tsx dogfood-checklist.ts
 */

// ─── Helpers (copied from dailyLinkedInPost.ts) ─────────────────────────────

function truncateAtSentenceBoundary(text: string, maxChars: number): string {
  const raw = (text || "").trim();
  if (raw.length <= maxChars) return raw;
  const head = raw.slice(0, maxChars);
  const lastStop = Math.max(head.lastIndexOf("."), head.lastIndexOf("!"), head.lastIndexOf("?"));
  if (lastStop >= 60) return head.slice(0, lastStop + 1).trimEnd();
  return head.trimEnd() + "...";
}

function renderEvidenceLine(e: {
  title: string;
  evidenceLevel: string;
  evidenceChecklist?: {
    hasPrimarySource: boolean;
    hasCorroboration: boolean;
    hasFalsifiableClaim: boolean;
    hasQuantitativeData: boolean;
    hasNamedAttribution: boolean;
    isReproducible: boolean;
  };
  checksPassing?: number;
  checksTotal?: number;
}): string {
  const cl = e.evidenceChecklist;
  if (!cl || e.checksPassing == null || e.checksTotal == null) {
    const label = e.evidenceLevel === "grounded" ? "backed by primary sources"
      : e.evidenceLevel === "mixed" ? "partly supported"
      : "still interpretive";
    return `- ${truncateAtSentenceBoundary(e.title, 40)}: ${label}`;
  }

  const passing: string[] = [];
  const gaps: string[] = [];
  if (cl.hasPrimarySource) passing.push("gov/primary source"); else gaps.push("primary source");
  if (cl.hasCorroboration) passing.push("corroborated"); else gaps.push("corroboration");
  if (cl.hasQuantitativeData) passing.push("hard numbers"); else gaps.push("hard numbers");
  if (cl.hasNamedAttribution) passing.push("named attribution"); else gaps.push("named attribution");
  if (cl.isReproducible) passing.push("verifiable links"); else gaps.push("verifiable links");
  if (cl.hasFalsifiableClaim) passing.push("falsifiable"); else gaps.push("falsifiability");

  const score = `${e.checksPassing}/${e.checksTotal}`;
  if (e.evidenceLevel === "grounded") {
    return `- ${truncateAtSentenceBoundary(e.title, 40)} [${score}]: ${passing.join(", ")}`;
  }
  return `- ${truncateAtSentenceBoundary(e.title, 40)} [${score}]: needs ${gaps.join(", ")}`;
}

// ─── Mock Data (realistic digest with checklist) ────────────────────────────

const explanations = [
  {
    title: "FDA Fast-Track Regulatory Shift",
    explanation: "The FDA's new accelerated pathway for AI-powered diagnostics signals a fundamental change in how health-tech products reach market.",
    evidenceLevel: "grounded" as const,
    evidenceChecklist: {
      hasPrimarySource: true,     // fda.gov source
      hasCorroboration: true,     // reuters + fda.gov
      hasFalsifiableClaim: true,  // LLM returned falsification
      hasQuantitativeData: true,  // "47% faster approval timeline"
      hasNamedAttribution: true,  // Named FDA commissioner
      isReproducible: true,       // Both URLs follow
    },
    checksPassing: 6,
    checksTotal: 6,
    measurementApproach: "Track FDA approval timeline data for AI diagnostics submissions before and after the policy change.",
    falsificationCriteria: "This weakens if FDA approval timelines for AI diagnostics don't decrease within 12 months of the policy announcement.",
  },
  {
    title: "Big Tech Talent Reshuffling",
    explanation: "Mass layoffs at major tech companies aren't contraction -- they're reallocation toward AI infrastructure roles, with net hiring still positive.",
    evidenceLevel: "mixed" as const,
    evidenceChecklist: {
      hasPrimarySource: false,    // No gov/tier-1 source
      hasCorroboration: true,     // Multiple news sources
      hasFalsifiableClaim: true,  // LLM returned falsification
      hasQuantitativeData: false, // No hard numbers in signals
      hasNamedAttribution: true,  // Named entities (Google, Meta)
      isReproducible: true,       // URLs exist
    },
    checksPassing: 4,
    checksTotal: 6,
    measurementApproach: "Compare net headcount changes at FAANG companies, broken out by AI vs non-AI roles.",
    falsificationCriteria: "This weakens if net hiring across major tech companies turns negative for two consecutive quarters.",
  },
  {
    title: "VC Herd Behavior in AI Infra",
    explanation: "The surge in AI infrastructure funding isn't rational market signal -- it's FOMO-driven capital concentration that will correct sharply.",
    evidenceLevel: "speculative" as const,
    evidenceChecklist: {
      hasPrimarySource: false,    // No gov source
      hasCorroboration: false,    // Single blog post
      hasFalsifiableClaim: true,  // LLM returned falsification
      hasQuantitativeData: false, // No hard numbers
      hasNamedAttribution: false, // "Sources say" only
      isReproducible: false,      // No verifiable URLs
    },
    checksPassing: 1,
    checksTotal: 6,
    measurementApproach: "Track AI infra deal concentration (Herfindahl index) and compare with historical VC cycle corrections.",
    falsificationCriteria: "This weakens if AI infrastructure companies show sustained revenue growth matching or exceeding their valuations within 18 months.",
  },
];

const signals = [
  {
    title: "FDA announces accelerated AI diagnostics pathway",
    summary: "New regulatory framework cuts approval timeline by 47% for AI-powered medical devices meeting safety benchmarks.",
    hardNumbers: "47% faster approval, 12 devices already in pipeline",
    url: "https://www.fda.gov/news-events/press-announcements/ai-diagnostics-2026",
  },
  {
    title: "Google restructures 12,000 roles toward AI infrastructure",
    summary: "Internal memo reveals net headcount stays flat as cloud and AI teams absorb displaced workers.",
    url: "https://www.reuters.com/technology/google-restructure-ai-2026",
  },
  {
    title: "Sequoia leads $2.1B AI infra mega-round for CoreWeave competitor",
    summary: "Largest single AI infrastructure round in 2026, valuation at 40x revenue.",
    hardNumbers: "$2.1B round, 40x revenue multiple",
  },
  {
    title: "OpenAI open-sources reasoning model weights",
    summary: "o3-mini weights released under Apache 2.0, enabling local deployment for enterprise.",
    url: "https://github.com/openai/o3-mini-weights",
  },
];

const findings = [
  {
    claim: "FDA approval times for AI diagnostics dropped 47% under new pathway",
    status: "verified",
    source: "FDA Press Release",
    sourceUrl: "https://www.fda.gov/news-events/press-announcements/ai-diagnostics-2026",
    explanation: "Confirmed via FDA's official announcement. Timeline reduction applies to devices meeting pre-specified safety benchmarks.",
  },
  {
    claim: "Google's net headcount remains flat despite 12,000 role changes",
    status: "partially_verified",
    source: "Reuters, internal sources",
    explanation: "Reuters confirmed restructuring scope. Net headcount claim based on unnamed internal sources, not official filing.",
  },
  {
    claim: "AI infrastructure VC funding up 340% year-over-year",
    status: "unverified",
    explanation: "Figure cited in several blogs but no primary dataset identified. PitchBook data shows ~280% increase.",
  },
];

const entities = [
  { name: "CoreWeave", keyInsight: "GPU cloud competitor now valued at $35B after latest round", fundingStage: "Series C" },
  { name: "FDA", keyInsight: "Accelerated AI pathway could reshape health-tech go-to-market timelines" },
];

const framing = {
  dominantStory: "Google layoffs and AI job displacement fears",
  attentionShare: "75%",
  underReportedAngle: "the FDA regulatory shift will have a bigger long-term impact on AI adoption than any single company's hiring decisions",
};

const actions = [
  { action: "If you're in health-tech: review the new FDA accelerated pathway requirements now -- first-mover advantage is real here." },
  { action: "Track which 'laid off' roles are actually being absorbed into AI teams at the same companies before drawing conclusions." },
  { action: "For AI infra investments: compare revenue multiples against the 2021 SaaS correction -- the pattern rhymes." },
];

// ─── Format Posts ───────────────────────────────────────────────────────────

const maxPerPost = 1450;
const specificTags = "#CoreWeave #FDA #AI #StartupFunding";
const domain = "AI";
const totalPosts = 3;

function capPost(text: string): string {
  if (text.length <= maxPerPost) return text;
  return text.slice(0, maxPerPost - 3).trimEnd() + "...";
}

// ── Post 1: WHAT'S HAPPENING ──
const p1: string[] = [];

p1.push(truncateAtSentenceBoundary(
  `While ${framing.dominantStory} dominates ${framing.attentionShare} of social feeds this week, ${framing.underReportedAngle}.`,
  280
));
p1.push("");

for (let i = 0; i < Math.min(signals.length, 4); i++) {
  const s = signals[i];
  let line = `${i + 1}. ${s.title}`;
  if (s.hardNumbers) line += ` -- ${s.hardNumbers}`;
  p1.push(truncateAtSentenceBoundary(line, 200));
  if (s.summary && i < 2) {
    p1.push(`   ${truncateAtSentenceBoundary(s.summary, 150)}`);
  }
  if (s.url && i < 2) p1.push(`   ${s.url}`);
}
p1.push("");

for (const entity of entities.slice(0, 2)) {
  const stage = (entity as any).fundingStage ? ` [${(entity as any).fundingStage}]` : "";
  p1.push(`${entity.name}${stage}: ${truncateAtSentenceBoundary(entity.keyInsight, 120)}`);
}
p1.push("");

p1.push(`There are ${explanations.length} ways to read the dominant story right now:`);
for (const e of explanations.slice(0, 3)) {
  p1.push(`- ${truncateAtSentenceBoundary(e.explanation, 160)}`);
}
p1.push("");
p1.push(`Each leads to a different conclusion about what you should pay attention to.`);
p1.push("");
p1.push(`Which of these are you tracking?`);
p1.push("");
p1.push(`[1/${totalPosts}] ${specificTags}`);

// ── Post 2: WHAT IT MEANS ──
const p2: string[] = [];

p2.push(`Verification and context on today's ${domain} developments:`);
p2.push("");

for (const finding of findings.slice(0, 4)) {
  const badge = finding.status === "verified" ? "VERIFIED"
    : finding.status === "false" ? "FALSE"
    : finding.status === "partially_verified" ? "PARTIAL"
    : "UNVERIFIED";
  p2.push(`[${badge}] ${truncateAtSentenceBoundary(finding.claim, 150)}`);
  if (finding.explanation) {
    p2.push(`  ${truncateAtSentenceBoundary(finding.explanation, 140)}`);
  }
  const srcParts: string[] = [];
  if (finding.source) srcParts.push(`Source: ${finding.source}`);
  if (finding.sourceUrl) srcParts.push(finding.sourceUrl);
  if (srcParts.length > 0) p2.push(`  ${srcParts.join(" | ")}`);
  p2.push("");
}

// NEW: Evidence breakdown with per-explanation checklist
p2.push(`Evidence breakdown:`);
for (const e of explanations.slice(0, 3)) {
  p2.push(renderEvidenceLine(e));
}
p2.push("");

p2.push(`High-volume news cycles often bury the developments that affect your career and decisions the most. This is the context that matters.`);
p2.push("");
p2.push(`What's one claim you've seen this week that you'd want fact-checked?`);
p2.push("");
p2.push(`[2/${totalPosts}] ${specificTags}`);

// ── Post 3: PRACTICAL GUIDE ──
const p3: string[] = [];

p3.push(`Based on today's research -- here's a practical guide on what to focus on:`);
p3.push("");

for (let i = 0; i < Math.min(actions.length, 4); i++) {
  p3.push(`${i + 1}. ${truncateAtSentenceBoundary(actions[i].action, 180)}`);
}
p3.push("");

// NEW: Falsification with score badge
p3.push(`How to stress-test each explanation:`);
for (const e of explanations.slice(0, 3)) {
  const badge = e.checksPassing != null && e.checksTotal != null
    ? ` [${e.checksPassing}/${e.checksTotal}]`
    : "";
  p3.push(`- ${truncateAtSentenceBoundary(e.title, 40)}${badge}: ${truncateAtSentenceBoundary(e.falsificationCriteria, 130)}`);
}
p3.push("");

p3.push(`Focus on what you can control: the skills you develop, the projects you ship, the information you verify before acting on.`);
p3.push("");
p3.push(`What are you working on or learning this week?`);
p3.push("");
p3.push(`[3/3] ${specificTags}`);

// ─── Output ─────────────────────────────────────────────────────────────────

const posts = [capPost(p1.join("\n")), capPost(p2.join("\n")), capPost(p3.join("\n"))];

console.log("=".repeat(80));
console.log("DOGFOOD: Evidence Checklist LinkedIn Post Dry Run");
console.log("=".repeat(80));

for (let i = 0; i < posts.length; i++) {
  console.log(`\n${"─".repeat(80)}`);
  console.log(`POST ${i + 1}/${posts.length} (${posts[i].length} chars)`);
  console.log("─".repeat(80));
  console.log(posts[i]);
}

console.log(`\n${"═".repeat(80)}`);
console.log("SUMMARY");
console.log("═".repeat(80));
console.log(`Posts: ${posts.length}`);
console.log(`Chars: ${posts.map((p, i) => `Post ${i+1}: ${p.length}`).join(", ")}`);
console.log(`All under 1450: ${posts.every(p => p.length <= 1450) ? "YES" : "NO -- OVER LIMIT"}`);

// Also show a LEGACY comparison (no checklist)
console.log(`\n${"═".repeat(80)}`);
console.log("LEGACY COMPARISON (what Post 2 evidence section looked like before)");
console.log("═".repeat(80));
const grounded = explanations.filter(e => e.evidenceLevel === "grounded").length;
const mixed = explanations.filter(e => e.evidenceLevel === "mixed").length;
const speculative = explanations.filter(e => e.evidenceLevel === "speculative").length;
const parts: string[] = [];
if (grounded > 0) parts.push(`${grounded} backed by primary sources`);
if (mixed > 0) parts.push(`${mixed} partly supported`);
if (speculative > 0) parts.push(`${speculative} still interpretive`);
console.log(`Of the competing explanations: ${parts.join(", ")}.`);
console.log("\nvs NEW:");
console.log(`Evidence breakdown:`);
for (const e of explanations) {
  console.log(renderEvidenceLine(e));
}
