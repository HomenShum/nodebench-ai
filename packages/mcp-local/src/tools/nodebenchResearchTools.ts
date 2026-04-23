/**
 * Nodebench Research MCP tools (v1)
 *
 * Minimal external-agent surface for the canonical entity graph:
 *
 *   - nodebench.research_run       → start a research run
 *   - nodebench.expand_resource    → expand a Nodebench URI by one ring
 *
 * Shares the resource URI scheme with the Nodebench HTTP API
 * (see shared/research/resourceCards.ts).
 *
 * Wiring to the active toolset registry is deliberately deferred so this
 * module is net-additive. Import the export into toolsetRegistry.ts when
 * ready to expose to live MCP clients.
 */

import type { McpTool } from "../types.js";

const NODEBENCH_API_URL = process.env.NODEBENCH_API_URL ?? "";

function ensureApi(): string | null {
  if (!NODEBENCH_API_URL) {
    return "NODEBENCH_API_URL not configured. Set it to the Nodebench api-headless base URL (e.g. https://api.nodebench.ai).";
  }
  return null;
}

interface ResearchRunArgs {
  objective: string;
  subjects: Array<{
    type:
      | "email"
      | "person"
      | "company"
      | "event"
      | "topic"
      | "repo"
      | "document"
      | "url"
      | "text";
    name?: string;
    url?: string;
    text?: string;
  }>;
  lens_id?: "company_dossier";
  depth?: "quick" | "standard";
}

interface ExpandResourceArgs {
  uri: string;
  lens_id?: "company_dossier";
  depth?: "quick" | "standard";
  expand_mode?: "ring_plus_one" | "ring_two" | "single_card";
}

async function postJson(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(`${NODEBENCH_API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Nodebench ${path} ${res.status}: ${text.slice(0, 400)}`);
  }
  return res.json();
}

export const nodebenchResearchTools: McpTool[] = [
  {
    name: "nodebench.research_run",
    description:
      "Start an adaptive, evidence-backed research run on one or more subjects (companies, people, events, topics). Reuses precomputed angles when available. Returns a runId the client can poll or stream. v1 ships the company_dossier lens only.",
    inputSchema: {
      type: "object",
      properties: {
        objective: {
          type: "string",
          description:
            "What the user is trying to decide or learn (e.g., 'understand Acme AI before a meeting').",
        },
        subjects: {
          type: "array",
          description: "1–10 research subjects.",
          items: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: [
                  "email",
                  "person",
                  "company",
                  "event",
                  "topic",
                  "repo",
                  "document",
                  "url",
                  "text",
                ],
              },
              name: { type: "string" },
              url: { type: "string" },
              text: { type: "string" },
            },
            required: ["type"],
          },
          minItems: 1,
          maxItems: 10,
        },
        lens_id: { type: "string", enum: ["company_dossier"] },
        depth: { type: "string", enum: ["quick", "standard"] },
      },
      required: ["objective", "subjects"],
    },
    annotations: { readOnlyHint: false, openWorldHint: true },
    handler: async (args: ResearchRunArgs) => {
      const apiErr = ensureApi();
      if (apiErr) return { error: apiErr };
      try {
        const body = {
          goal: { objective: args.objective, mode: "analyze" as const },
          subjects: args.subjects.map((s) => ({
            type: s.type,
            name: s.name,
            url: s.url,
            raw: s.text ? { text: s.text } : undefined,
          })),
          lens_id: args.lens_id ?? "company_dossier",
          depth: args.depth ?? "standard",
        };
        return await postJson("/v1/research/runs", body);
      } catch (err) {
        const message = err instanceof Error ? err.message : "unknown error";
        return { error: message };
      }
    },
  },
  {
    name: "nodebench.expand_resource",
    description:
      "Expand a Nodebench resource URI (nodebench://org/{key}) by one ring using the requested lens + depth. Returns cards, evidence refs, and next-hop URIs shaped for recursive exploration.",
    inputSchema: {
      type: "object",
      properties: {
        uri: {
          type: "string",
          description:
            "Nodebench URI. v1 supports nodebench://org/{entityKey} only.",
        },
        lens_id: { type: "string", enum: ["company_dossier"] },
        depth: { type: "string", enum: ["quick", "standard"] },
        expand_mode: {
          type: "string",
          enum: ["ring_plus_one", "ring_two", "single_card"],
        },
      },
      required: ["uri"],
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
    handler: async (args: ExpandResourceArgs) => {
      const apiErr = ensureApi();
      if (apiErr) return { error: apiErr };
      try {
        return await postJson("/v1/resources/expand", {
          uri: args.uri,
          lens_id: args.lens_id ?? "company_dossier",
          depth: args.depth ?? "standard",
          expand_mode: args.expand_mode ?? "ring_plus_one",
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "unknown error";
        return { error: message };
      }
    },
  },
];
