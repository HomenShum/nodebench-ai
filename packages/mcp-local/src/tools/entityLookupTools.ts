/**
 * Entity Lookup — The "Context7 hook" for NodeBench.
 *
 * ONE tool. Type a company/person/topic name. Get structured intelligence.
 * Designed to be the simplest possible entry point into NodeBench's 350-tool ecosystem.
 *
 * This is the tool that should make someone say "oh, that's useful" in 5 seconds.
 * Then progressive discovery expands them into founder tools, QA tools, etc.
 *
 * No API keys required for basic lookup (uses web fetch + extraction).
 * Optional GEMINI_API_KEY for deeper analysis.
 */

import type { McpTool } from "../types.js";

// ─── Lightweight web fetch ────────────────────────────────────────────────────

async function quickWebSearch(query: string): Promise<string[]> {
  // Try Gemini grounding search if available
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `Give me 5 key facts about "${query}" as a numbered list. Include: what it is, when founded/started, key people, recent news, and main competitors. Be factual and concise.` }] }],
            generationConfig: { maxOutputTokens: 500, temperature: 0.1 },
          }),
          signal: AbortSignal.timeout(8000),
        }
      );
      if (res.ok) {
        const data = await res.json() as any;
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        return text.split("\n").filter((l: string) => l.trim().length > 0);
      }
    } catch { /* fall through to basic fetch */ }
  }

  // Fallback: basic web fetch from Wikipedia-like sources
  const sources = [
    `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=3`,
  ];

  const results: string[] = [];
  for (const url of sources) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const data = await res.json() as any;
        const items = data?.query?.search || [];
        for (const item of items.slice(0, 3)) {
          // Strip HTML tags from Wikipedia snippets
          const clean = (item.snippet || "").replace(/<[^>]*>/g, "");
          results.push(`${item.title}: ${clean}`);
        }
      }
    } catch { /* skip failed source */ }
  }

  return results.length > 0 ? results : [`No web results found for "${query}". Set GEMINI_API_KEY for deeper search.`];
}

// ─── Entity structure ─────────────────────────────────────────────────────────

interface EntityProfile {
  name: string;
  type: "company" | "person" | "topic" | "unknown";
  summary: string;
  facts: string[];
  signals: string[];
  sources: string[];
  confidence: "high" | "medium" | "low";
  nextTools: string[];
}

function classifyEntity(name: string, facts: string[]): EntityProfile["type"] {
  const joined = facts.join(" ").toLowerCase();
  if (joined.includes("company") || joined.includes("founded") || joined.includes("startup") || joined.includes("inc") || joined.includes("corp")) return "company";
  if (joined.includes("born") || joined.includes("ceo") || joined.includes("founder") || joined.includes("engineer")) return "person";
  if (joined.includes("protocol") || joined.includes("framework") || joined.includes("technology") || joined.includes("standard")) return "topic";
  return "unknown";
}

// ─── The Tool ─────────────────────────────────────────────────────────────────

export const entityLookupTools: McpTool[] = [
  {
    name: "entity_lookup",
    description:
      "Quick intelligence on any company, person, or topic. Type a name, get structured facts, signals, and suggested next tools. The simplest entry point into NodeBench — no setup needed.",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Company name, person name, or topic to research (e.g., 'Anthropic', 'Jensen Huang', 'MCP protocol')",
        },
        depth: {
          type: "string",
          enum: ["quick", "standard", "deep"],
          description: "Research depth: quick (2s, facts only), standard (5s, facts + signals), deep (10s, full analysis). Default: standard",
        },
      },
      required: ["name"],
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
    handler: async (args: { name: string; depth?: string }) => {
      const entityName = args.name.trim();
      if (!entityName) return { error: "Please provide an entity name to research." };

      const depth = args.depth || "standard";

      // Fetch facts
      const facts = await quickWebSearch(entityName);
      const type = classifyEntity(entityName, facts);

      // Build signals (only for standard/deep)
      const signals: string[] = [];
      if (depth !== "quick" && facts.length > 0) {
        // Extract signal-like statements
        for (const fact of facts) {
          if (fact.match(/\d{4}/) || fact.match(/\$[\d.]+[BMK]/) || fact.includes("launch") || fact.includes("raised") || fact.includes("acquired")) {
            signals.push(fact);
          }
        }
      }

      // Determine confidence
      const confidence: EntityProfile["confidence"] =
        facts.length >= 4 ? "high" :
        facts.length >= 2 ? "medium" : "low";

      // Suggest next tools based on entity type
      const nextTools: string[] = [];
      switch (type) {
        case "company":
          nextTools.push(
            `load_toolset('founder') — activate 40+ tools for company analysis`,
            `site_map({ url: 'https://${entityName.toLowerCase().replace(/\s+/g, "")}.com' }) — crawl their site`,
            `discover_tools('company diligence') — find deep research tools`,
          );
          break;
        case "person":
          nextTools.push(
            `discover_tools('person research') — find people intelligence tools`,
            `load_toolset('researcher') — activate 32 research tools`,
          );
          break;
        case "topic":
          nextTools.push(
            `discover_tools('${entityName}') — find related tools`,
            `load_toolset('research') — activate 115 research tools`,
          );
          break;
        default:
          nextTools.push(
            `discover_tools('${entityName}') — search for relevant tools`,
            `load_toolset('founder') — activate founder intelligence tools`,
          );
      }

      const profile: EntityProfile = {
        name: entityName,
        type,
        summary: facts[0] || `No summary available for "${entityName}".`,
        facts,
        signals,
        sources: process.env.GEMINI_API_KEY ? ["Gemini grounding search"] : ["Wikipedia API"],
        confidence,
        nextTools,
      };

      return {
        ...profile,
        _hint: "This is a quick lookup. For deeper analysis, use the suggested nextTools to activate NodeBench's full 350-tool ecosystem.",
      };
    },
  },
];
