/**
 * contentSynthesis.ts — LLM content generation layer for NodeBench.
 *
 * Takes web search results + local context and produces REAL domain-specific
 * analysis, not just structured data dumps. Uses Gemini 3.1 Flash Lite for
 * fast, cheap synthesis (~$0.01 per call).
 *
 * This is the layer that makes "Analyze Anthropic for a banker lens" produce
 * actual banker-quality analysis instead of NodeBench git commits.
 */

export interface WebResult {
  title: string;
  url: string;
  snippet: string;
}

export interface SynthesisRequest {
  query: string;
  scenario: "company_search" | "competitor_brief" | "important_change" | "delegation" | "memo_export" | "weekly_reset" | "packet_diff" | "role_switch";
  lens: string; // founder, banker, ceo, investor, student, legal, researcher, operator
  webResults: WebResult[];
  localContext: {
    mission?: string;
    recentChanges?: string[];
    contradictions?: string[];
    signals?: string[];
  };
}

export interface SynthesisResult {
  content: string;
  entityNames: string[];
  keyFacts: string[];
  risks: string[];
  nextQuestions: string[];
  sources: string[];
  tokensUsed: number;
  latencyMs: number;
}

const SCENARIO_PROMPTS: Record<string, string> = {
  company_search: `You are a {lens} analyzing a company. Produce a structured intelligence brief:
1. **Company Snapshot** — what they do, market position, recent momentum
2. **What Changed Recently** — latest news, product moves, funding, partnerships
3. **Key Metrics** — revenue, valuation, growth rate, market share (cite sources)
4. **Strategic Position** — moats, advantages, vulnerabilities
5. **Risks** — what could go wrong, red flags, dependencies
6. **Next Questions** — 3 questions a {lens} would ask next`,

  competitor_brief: `You are a {lens} comparing competitors. Produce a competitive intelligence brief.

CRITICAL: Name every competitor explicitly by company name. Never say "Competitor A" — use real names.

1. **Competitive Landscape** — name each key player, their market category, and what they own
2. **Moats & Differentiators** — for each named competitor, what they do uniquely well
3. **Distribution Advantages** — how each named competitor goes to market (plugin ecosystem, enterprise sales, developer community, etc.)
4. **Vulnerabilities** — where each named competitor is weak. Be specific about technical, market, or strategic gaps.
5. **What to Absorb** — specific practices from named competitors worth adopting
6. **What to Avoid** — specific strategies from named competitors that are traps
7. **Strategic Recommendation** — clear positioning advice relative to the named competitors

For a banker: focus on financial moats, market share, revenue quality, credit implications.
For an investor: focus on growth trajectory, TAM, competitive dynamics, deal implications.
For a researcher: focus on methodology differences, benchmark results, technical approaches.`,

  important_change: `You are a {lens} monitoring for important changes. Produce a detailed change digest.

ALWAYS include these sections:
1. **Timeline of Changes** — dated list with specific dates from sources. Reference deployments, releases, incidents, regulatory updates, or market shifts as relevant.
2. **Impact Assessment** — which changes matter and why. Include severity ratings. For operators: correlate deployments with incidents, flag rollback candidates. For legal: flag regulatory changes. For investors: flag valuation-affecting changes.
3. **Contradictions & Alerts** — any inconsistencies, stale alerts, unacknowledged issues. Include age/duration of each alert if applicable. Flag anything unresolved for >24 hours.
4. **Trigger Analysis** — root causes. What caused these changes? Reference specific commits, PRs, announcements, or filings.
5. **Action Required** — specific escalation paths, workarounds, remediation steps. Suggest who should be notified and what the next diagnostic step is.

You MUST be specific to the {lens} role. An operator cares about deployments, uptime, incidents, rollbacks. A banker cares about credit events, covenant breaches, risk rating shifts. A legal analyst cares about regulatory changes, compliance gaps, contractual deadlines. A researcher cares about methodology shifts, retractions, consensus changes.`,

  delegation: `You are a {lens} creating a delegation brief. Produce a scoped handoff packet:
1. **Objective** — what the delegate should accomplish
2. **Context** — background the delegate needs
3. **Constraints** — boundaries and requirements
4. **Success Criteria** — how to know it's done well
5. **Files/Surfaces Affected** — what to touch
6. **Agent-Ready Instructions** — step-by-step for an AI or human delegate`,

  memo_export: `You are a {lens} producing an exportable memo. Produce a shareable document:
1. **Executive Summary** — 2-3 sentence overview
2. **Key Findings** — numbered list of important points
3. **Evidence** — supporting data with source citations
4. **Recommendations** — what to do next
5. **Open Questions** — what still needs resolution`,

  weekly_reset: `You are a {lens} producing a weekly briefing. Produce a reset digest:
1. **This Week's Summary** — what happened that matters
2. **Key Decisions Made** — and their rationale
3. **Metrics Update** — quantitative changes
4. **Risks & Blockers** — what's in the way
5. **Next Week's Priorities** — 3-5 specific actions`,

  packet_diff: `You are a {lens} comparing two time periods. Produce a change comparison:
1. **Before State** — what was true previously
2. **After State** — what's true now
3. **Key Deltas** — specific changes with dates
4. **Trend Direction** — improving, degrading, or stable
5. **Action Items** — what the changes imply`,

  role_switch: `You are switching to a {lens} perspective. Reframe the analysis:
1. **New Lens** — what matters from this perspective
2. **Different Priorities** — what shifts in importance
3. **New Questions** — what this lens would ask
4. **Reframed Risks** — risks from this perspective
5. **Recommended Actions** — next steps for this role`,
};

/**
 * Synthesize real content using Gemini Flash Lite.
 * Falls back to structured template if Gemini unavailable.
 */
export async function synthesizeContent(req: SynthesisRequest): Promise<SynthesisResult> {
  const start = Date.now();
  const apiKey = process.env.GEMINI_API_KEY || "";

  // Build the prompt
  const scenarioPrompt = (SCENARIO_PROMPTS[req.scenario] ?? SCENARIO_PROMPTS.company_search)
    .replace(/\{lens\}/g, req.lens);

  const webContext = req.webResults.length > 0
    ? `\n\nWEB SEARCH RESULTS:\n${req.webResults.map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet}\nSource: ${r.url}`).join("\n\n")}`
    : "";

  const localCtx = [
    req.localContext.mission ? `Our company: ${req.localContext.mission}` : "",
    req.localContext.recentChanges?.length ? `Recent changes: ${req.localContext.recentChanges.slice(0, 5).join("; ")}` : "",
    req.localContext.contradictions?.length ? `Known contradictions: ${req.localContext.contradictions.join("; ")}` : "",
    req.localContext.signals?.length ? `Signals: ${req.localContext.signals.join("; ")}` : "",
  ].filter(Boolean).join("\n");

  const fullPrompt = `${scenarioPrompt}

USER QUERY: ${req.query}

${localCtx ? `LOCAL CONTEXT:\n${localCtx}\n` : ""}${webContext}

IMPORTANT:
- Use specific facts, numbers, and dates from the web results
- Name specific entities, people, and companies
- Include source URLs as citations
- Be concise but substantive — every section should have real content
- Write for a ${req.lens} audience — use appropriate terminology and focus`;

  // Try Gemini synthesis
  if (apiKey) {
    try {
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey });

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: [{ role: "user" as const, parts: [{ text: fullPrompt }] }],
        config: {
          tools: [{ googleSearch: {} }],
          maxOutputTokens: 2048,
          temperature: 0.3,
        },
      });

      const text = response?.candidates?.[0]?.content?.parts
        ?.map((p: any) => p.text)
        .filter(Boolean)
        .join("") ?? "";

      if (text.length > 50) {
        // Extract entities, facts, risks from the generated content
        const entityNames = [...new Set(
          (text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) ?? [])
            .filter(n => n.length > 2 && !["The", "This", "What", "How", "Why"].includes(n))
        )].slice(0, 10);

        const keyFacts = (text.match(/\$[\d.]+[BMK]|\d+%|\d+\.\d+[BMK]?/g) ?? []).slice(0, 5);
        const sources = req.webResults.map(r => r.url);

        return {
          content: text,
          entityNames,
          keyFacts,
          risks: [],
          nextQuestions: [],
          sources,
          tokensUsed: Math.round(text.length / 4),
          latencyMs: Date.now() - start,
        };
      }
    } catch (err: any) {
      // Fall through to template
    }
  }

  // Fallback: structured template with web snippets
  const sections: string[] = [`# ${req.scenario.replace(/_/g, " ").toUpperCase()}: ${req.query}\n`];
  sections.push(`**Lens:** ${req.lens}`);
  sections.push(`**Generated:** ${new Date().toISOString().slice(0, 19)}\n`);

  if (req.webResults.length > 0) {
    sections.push(`## Key Findings from Web Research`);
    req.webResults.forEach((r, i) => {
      sections.push(`${i + 1}. **${r.title}**`);
      sections.push(`   ${r.snippet}`);
      sections.push(`   Source: ${r.url}\n`);
    });
  }

  if (req.localContext.mission) {
    sections.push(`## Local Context`);
    sections.push(`Identity: ${req.localContext.mission}`);
  }

  if (req.localContext.recentChanges?.length) {
    sections.push(`\n## Recent Changes`);
    req.localContext.recentChanges.slice(0, 5).forEach((c, i) => sections.push(`${i + 1}. ${c}`));
  }

  if (req.localContext.contradictions?.length) {
    sections.push(`\n## Contradictions`);
    req.localContext.contradictions.forEach(c => sections.push(`- ${c}`));
  }

  return {
    content: sections.join("\n"),
    entityNames: req.webResults.map(r => r.title.split(/\s+/).slice(0, 2).join(" ")),
    keyFacts: [],
    risks: [],
    nextQuestions: [],
    sources: req.webResults.map(r => r.url),
    tokensUsed: Math.round(sections.join("\n").length / 4),
    latencyMs: Date.now() - start,
  };
}
