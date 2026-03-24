// src/features/agents/components/FastAgentPanel/demoConversation.ts
// Pre-scripted demo conversations for guest/unauthenticated users.
// When no backend is connected, clicking a suggestion chip plays one of these.

/** Format a relative date label like "today" or "yesterday" for demo sources. */
function relativeDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  if (daysAgo === 0) return "today";
  if (daysAgo === 1) return "yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Format a short date for use in source citations (e.g. "Mar 20, 2026"). */
function shortDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export interface DemoSource {
  label: string;
  type: 'code' | 'docs' | 'data';
}

export interface DemoConversation {
  question: string;
  response: string;
  sources: DemoSource[];
  thinkingDuration: number;
  keyInsight: string;
}

export const DEMO_CONVERSATIONS: DemoConversation[] = [
  {
    question:
      'Show me the agent actions that were denied or approval-gated today, and explain why.',
    response: [
      `Here are the agent actions that were **denied or approval-gated** ${relativeDate(0)}:`,
      '',
      '**1. Arbitrage Scanner** (9:42 AM) — Execute FTT sell order ($2,400)',
      '- Gate: Passport scope',
      '- Reason: Financial transactions require human approval. Agent holds research role, not trade.',
      '',
      '**2. Deep Research** (10:15 AM) — Expand competitor analysis to 8 new entities',
      '- Gate: Budget gate',
      '- Reason: Would exceed $0.12 per-mission cap ($0.09 spent, $0.07 requested).',
      '',
      '**3. LinkedIn Publisher** (11:03 AM) — Publish thread mentioning unreleased product',
      '- Gate: Safety gate',
      '- Reason: Content references confidential internal data flagged by PII screen.',
      '',
      '**4. Code Reviewer** (1:28 PM) — Push hotfix directly to main branch',
      '- Gate: Scope gate',
      '- Reason: Agent authorized for review only, not direct commits to protected branches.',
      '',
      '### Why these were blocked',
      '',
      'All 4 denials trace back to the **judgment layer\'s boolean gate system**. Each action must pass 5 gates (budget, scope, safety, quality, passport) before execution. Unlike numerical confidence scores, these gates are strictly pass/fail -- an agent cannot "almost" pass a gate.',
      '',
      'The FTT sell order is the most consequential: the Arbitrage Scanner correctly identified a trading opportunity, but its passport only grants `research` and `analysis` scopes. Financial execution requires explicit human approval through the delegation surface, which prevents autonomous agents from making irreversible financial decisions.',
    ].join('\n'),
    sources: [
      { label: 'convex/domains/missions/preExecutionGate.ts', type: 'code' },
      { label: `Action Receipt Feed (${relativeDate(0)})`, type: 'data' },
      { label: 'Agent Passport Registry', type: 'data' },
    ],
    thinkingDuration: 900,
    keyInsight:
      'All 4 denials used boolean gates (pass/fail), not numerical scores -- agents cannot game soft thresholds to bypass safety checks.',
  },
  {
    question:
      'Open the FTX investigation and separate observed facts, hypotheses, and later-confirmation evidence.',
    response: [
      'Here is the FTX investigation broken into **evidence categories**:',
      '',
      '### Observed Facts (verified, sourced)',
      '1. **$8B customer fund gap** -- FTX held $900M liquid vs $8.9B in liabilities (SEC filing, Nov 2022)',
      '2. **Alameda backdoor** -- Software exemption allowed Alameda to withdraw without triggering margin checks (bankruptcy examiner report)',
      '3. **FTT token concentration** -- 92% of FTT supply held by FTX/Alameda entities (on-chain analysis)',
      '4. **CZ liquidation trigger** -- Binance announced FTT position sale on Nov 6, 2022 (public tweet)',
      '',
      '### Hypotheses (analytical, ranked by evidence weight)',
      '1. **Deliberate fraud** -- Evidence score: 87% -- Backdoor exemption + fund gap suggests intentional misappropriation',
      '2. **Risk mismanagement** -- Evidence score: 34% -- Possible but contradicted by the deliberate software exemption',
      '',
      '### Later-confirmation evidence (emerged post-collapse)',
      '- SBF conviction on 7 counts (March 2024) confirmed deliberate fraud hypothesis',
      '- Alameda CEO testimony revealed explicit instructions to use customer funds',
      '',
      'The investigation traced **4 verified facts** across 3 primary sources with a **96% severity signal**, triggering automatic escalation to the review queue.',
    ].join('\n'),
    sources: [
      { label: 'FTX Investigation Trace', type: 'data' },
      { label: 'SEC Filings (Nov 2022)', type: 'docs' },
      { label: 'Bankruptcy Examiner Report', type: 'docs' },
    ],
    thinkingDuration: 1000,
    keyInsight:
      'The deliberate fraud hypothesis scored 87% on evidence weight -- the software backdoor exemption is the strongest signal.',
  },
  {
    question:
      'Explain what this agent is allowed to do, what requires approval, and what would be blocked.',
    response: [
      'Here is the **permission breakdown** for the current agent (Research Sentinel):',
      '',
      '### Autonomous (no approval needed)',
      '- Web search and content fetching',
      '- Entity enrichment and profile building',
      '- Evidence verification and source grading',
      '- Session note saving and knowledge persistence',
      '- Research brief generation and signal processing',
      '',
      '### Requires human approval',
      '- **Publishing** -- LinkedIn posts, public documents, external communications',
      '- **Financial actions** -- Any transaction, trade execution, or fund movement',
      '- **Scope expansion** -- Adding new entities or research domains beyond the declared mission',
      '- **Budget overruns** -- Any action that would exceed the per-mission cost cap',
      '',
      '### Blocked (no override possible)',
      '- Direct database mutations outside the agent\'s schema namespace',
      '- Access to other agents\' session memory or private notes',
      '- Modification of gate thresholds or passport scopes',
      '- PII exposure or unauthorized external API calls',
      '',
      'The passport system enforces these boundaries through the **5-gate pre-execution check**. Even if an agent constructs a valid tool call, the gate layer will reject it before execution if the passport scope doesn\'t match.',
    ].join('\n'),
    sources: [
      { label: 'convex/domains/agents/orchestrator/passportEnforcement.ts', type: 'code' },
      { label: 'Delegation Showcase', type: 'data' },
    ],
    thinkingDuration: 800,
    keyInsight:
      'The passport scope is enforced at the gate layer, not the tool layer -- even valid tool calls get rejected if the scope doesn\'t match.',
  },
  {
    question: 'How does trajectory scoring work?',
    response: [
      'NodeBench scores every agent trajectory across **8 dimensions**: task completion rate, time-to-first-draft, human edit distance, wall-clock efficiency, source attribution accuracy, hallucination rate, tool-call precision, and reasoning depth.',
      '',
      'Each dimension is scored on a 0-1 scale, then combined via a **trust-adjusted compounding formula** that weighs recent performance more heavily while discounting externally amplified wins (e.g., a viral post that inflated engagement metrics).',
      '',
      'Scores are persisted in an 11-table trajectory schema with full provenance, so you can trace any final score back to the raw evidence that produced it. The trust graph ensures that agents who consistently deliver accurate results earn compounding credibility, while a single fabricated source can cascade into a score penalty across related dimensions.',
    ].join('\n'),
    sources: [
      { label: 'convex/domains/trajectory/lib.ts', type: 'code' },
      { label: 'Trajectory Intelligence docs', type: 'docs' },
    ],
    thinkingDuration: 900,
    keyInsight:
      'The trust-adjusted compounding score discounts externally amplified wins, so genuine research quality always outweighs viral luck.',
  },
  {
    question: 'Explain the judgment layer gates',
    response: [
      'Every agent action passes through **5 required gates** before execution:',
      '',
      '1. **Budget gate** -- checks remaining token/cost budget for the mission',
      '2. **Scope gate** -- verifies the action stays within the declared mission boundaries',
      '3. **Safety gate** -- screens for disallowed operations (PII exposure, unauthorized external calls)',
      '4. **Quality gate** -- ensures minimum evidence thresholds are met before publishing',
      '5. **Passport gate** -- validates the agent holds the correct role and permissions',
      '',
      'Additionally, **6 boolean disqualifiers** can instantly abort an action: fabricated sources, hallucinated citations, unauthorized data access, scope drift beyond threshold, budget overrun, and unverified external claims.',
      '',
      'Gates are strictly **boolean** -- pass or fail with a reason string. There are no numerical scores or "soft" thresholds. This eliminates the failure mode where an LLM inflates its own confidence score to bypass safety checks.',
    ].join('\n'),
    sources: [
      { label: 'convex/domains/missions/preExecutionGate.ts', type: 'code' },
      { label: 'OpenClaw Architecture', type: 'docs' },
    ],
    thinkingDuration: 800,
    keyInsight:
      'Gates are boolean (true/false with reason), never numerical scores -- this prevents agents from gaming soft thresholds.',
  },
  {
    question: 'What MCP tools handle research?',
    response: [
      'The **research preset** exposes 115 tools organized across several domains:',
      '',
      '- **Signal processing** -- `web_search`, `fetch_url`, `extract_structured_data`, `summarize_content` for ingesting raw sources',
      '- **Entity profiling** -- `entity_lookup`, `enrich_company`, `get_funding_rounds` for building structured profiles',
      '- **Verification** -- `start_verification_cycle`, `log_test_result`, `check_contract_compliance` for evidence grading',
      '- **Knowledge management** -- `save_session_note`, `search_all_knowledge`, `refresh_task_context` for persistent memory',
      '- **Eval & flywheel** -- `run_eval_harness`, `log_eval_result`, `compare_approaches` for measuring quality',
      '',
      'You can explore available tools interactively using `discover_tools` with `category="research"`, which supports pagination and result expansion to surface related tools you might not have considered.',
    ].join('\n'),
    sources: [
      { label: 'packages/mcp-local/src/toolsetRegistry.ts', type: 'code' },
      { label: 'Tool Registry (304 entries)', type: 'docs' },
    ],
    thinkingDuration: 1000,
    keyInsight:
      'Use discover_tools with category="research" to find relevant tools -- it supports pagination and auto-expands related neighbors.',
  },
  {
    question: 'Show recent agent activity',
    response: [
      `Here is a summary of recent agent actions (${relativeDate(0)}):`,
      '',
      '| Time | Agent | Action | Status |',
      '|------|-------|--------|--------|',
      '| 2 min ago | **Research Sentinel** | Verified 4 claims in FTX investigation brief | Completed |',
      '| 8 min ago | **Daily Digest** | Generated morning research briefing (12 signals) | Completed |',
      '| 15 min ago | **Scope Guardian** | Denied budget overrun on competitor deep-dive | Blocked |',
      `| ${relativeDate(1)} | **LinkedIn Publisher** | Published 3-post thread on agentic reliability | Completed |`,
      '| 41 min ago | **Code Reviewer** | Flagged unbounded Map in streaming handler | Alert |',
      '',
      'The FTX investigation traced **4 verified facts** across 3 sources with a **96% severity signal**, triggering an automatic escalation to the review queue. The scope guardian correctly blocked a research expansion that would have exceeded the $0.12 per-mission budget cap.',
    ].join('\n'),
    sources: [
      { label: `Action Receipts (${relativeDate(0)})`, type: 'data' },
      { label: `Agent Activity Dashboard (${shortDate(0)})`, type: 'data' },
    ],
    thinkingDuration: 800,
    keyInsight:
      'The FTX investigation traced 4 verified facts with 96% severity signals -- scope guardian correctly blocked a budget overrun.',
  },
  {
    question: 'Should we raise a Series A now or wait 6 months?',
    response: [
      'I ran a **decision simulation** across 3 scenarios with live market data:',
      '',
      '### Scenario A: Raise now (March 2026)',
      '| Factor | Value | Confidence |',
      '|--------|-------|------------|',
      '| Market timing | AI funding up 34% YoY, window open | **92%** |',
      '| Dilution at $18M pre | ~22% | Verified (3 comparable term sheets) |',
      '| Runway extension | 14 months at current burn | Calculated |',
      '| Risk | Window could close if macro shifts in Q3 | Medium |',
      '',
      '### Scenario B: Wait 6 months (September 2026)',
      '| Factor | Value | Confidence |',
      '|--------|-------|------------|',
      '| Projected ARR by then | $1.2M (from $680K today) | **74%** — assumes 12% MoM holds |',
      '| Likely valuation | $28-35M pre (1.8x multiple improvement) | **68%** |',
      '| Risk | 3 competitors closing rounds now; enterprise pipeline may stall | High |',
      '',
      '### Scenario C: Bridge + wait (hybrid)',
      '| Factor | Value | Confidence |',
      '|--------|-------|------------|',
      '| Bridge size | $2M SAFE at $20M cap | Feasible (2 angels confirmed interest) |',
      '| Buys time to | Hit $1M ARR milestone | 4-5 months |',
      '| Risk | Cap may anchor future round pricing | Low-Medium |',
      '',
      '### Recommendation: **Raise now** (Scenario A)',
      '',
      'The evidence tilts toward raising now for 3 reasons:',
      '1. **Competitive moat risk** — 3 direct competitors are actively fundraising. Waiting 6 months means competing for attention in a crowded market.',
      '2. **Macro uncertainty** — The 34% YoY funding increase may not persist through Q3-Q4. Fed rate decisions in June could cool late-stage appetite, which cascades to early-stage within 2 quarters.',
      '3. **ARR growth projection has wide error bars** — The 74% confidence on $1.2M ARR means a 26% chance you arrive at September with $900K and a weaker hand.',
      '',
      'The bridge (Scenario C) is a reasonable fallback if your top 2 target leads pass, but I would not start there — it signals uncertainty to the market.',
      '',
      '> **Falsification check**: This recommendation flips if (a) you have a signed LOI for a $500K+ enterprise contract closing in 60 days, or (b) your current runway extends past 10 months without the raise. Neither condition is met based on current data.',
    ].join('\n'),
    sources: [
      { label: `Market Analysis — AI Funding Q1 2026 (${shortDate(2)})`, type: 'data' },
      { label: 'convex/domains/missions/preExecutionGate.ts', type: 'code' },
      { label: `Comparable Term Sheet Analysis (${relativeDate(1)})`, type: 'data' },
      { label: 'PitchBook AI Sector Report', type: 'docs' },
    ],
    thinkingDuration: 1200,
    keyInsight:
      'Raise now — 34% YoY funding increase may not hold through Q3, and 3 competitors are actively closing rounds.',
  },
];

/** Find a demo conversation matching a question (fuzzy prefix + keyword match). */
export function findDemoConversation(
  question: string
): DemoConversation | null {
  const q = question.toLowerCase().trim();

  // Exact match
  const exact = DEMO_CONVERSATIONS.find(
    (dc) => q === dc.question.toLowerCase(),
  );
  if (exact) return exact;

  // Prefix match (first 30 chars for longer prompts)
  const prefix = DEMO_CONVERSATIONS.find(
    (dc) =>
      q.startsWith(dc.question.toLowerCase().slice(0, 30)) ||
      dc.question.toLowerCase().startsWith(q.slice(0, 30)),
  );
  if (prefix) return prefix;

  // Keyword overlap — pick the conversation with the most shared words
  const qWords = new Set(q.split(/\s+/).filter((w) => w.length > 3));
  let best: DemoConversation | null = null;
  let bestScore = 0;
  for (const dc of DEMO_CONVERSATIONS) {
    const dcWords = dc.question.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    const overlap = dcWords.filter((w) => qWords.has(w)).length;
    if (overlap > bestScore) {
      bestScore = overlap;
      best = dc;
    }
  }
  return bestScore >= 2 ? best : null;
}

/** Generic fallback response for custom questions in guest mode. */
export const GUEST_FALLBACK_RESPONSE: DemoConversation = {
  question: '',
  response: [
    'Sign in to ask custom questions and get live answers from NodeBench.',
    '',
    'In the meantime, try one of the **suggestion chips** above to see NodeBench in action -- each one plays a real example of how the system analyzes agent trajectories, enforces judgment gates, and orchestrates research workflows.',
  ].join('\n'),
  sources: [],
  thinkingDuration: 800,
  keyInsight: '',
};
