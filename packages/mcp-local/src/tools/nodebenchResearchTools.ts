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

function getNodebenchApiUrl(): string {
  return process.env.NODEBENCH_API_URL ?? "";
}

function ensureApi(): string | null {
  if (!getNodebenchApiUrl()) {
    return "NODEBENCH_API_URL not configured. Set it to the Nodebench api-headless base URL (e.g. https://api.nodebench.ai).";
  }
  return null;
}

interface ResearchRunArgs {
  objective: string;
  mode?: "auto" | "analyze" | "prepare" | "monitor" | "compare" | "decision_support" | "summarize";
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
    hints?: string[];
    raw?: Record<string, unknown>;
  }>;
  lens_id?: "company_dossier";
  depth?: "quick" | "standard";
  angles?: string[];
  constraints?: {
    freshness_days?: number;
    latency_budget_ms?: number;
    prefer_cache?: boolean;
    max_external_calls?: number;
    evidence_min_sources_per_major_claim?: number;
  };
  deliverables?: Array<
    | "json_full"
    | "compact_alert"
    | "ntfy_brief"
    | "notion_markdown"
    | "executive_brief"
    | "dossier_markdown"
    | "email_digest"
    | "ui_card_bundle"
  >;
}

interface ExpandResourceArgs {
  uri: string;
  lens_id?: "company_dossier";
  depth?: "quick" | "standard";
  expand_mode?: "ring_plus_one" | "ring_two" | "single_card";
}

interface EventCaptureArgs {
  text: string;
  workspaceId?: string;
  eventId?: string;
  eventSessionId?: string;
  anonymousSessionId?: string;
  title?: string;
  kind?: "text" | "voice" | "image" | "screenshot" | "file";
}

interface NotebookAppendArgs {
  reportId: string;
  text: string;
  anonymousSessionId?: string;
}

interface ReportExportPreviewArgs {
  reportId: string;
  format?: "crm_csv" | "csv" | "hubspot_csv" | "salesforce_csv" | "attio_csv" | "affinity_csv" | "notion_csv" | "json" | "markdown";
  anonymousSessionId?: string;
}

interface ReportExportCompleteArgs {
  reportId: string;
  exportKey: string;
  anonymousSessionId?: string;
}

interface ActivityTimelineArgs {
  reportId: string;
  anonymousSessionId?: string;
}

async function postJson(path: string, body: unknown): Promise<unknown> {
  const apiKey = process.env.NODEBENCH_API_KEY ?? process.env.NODEBENCH_API_TOKEN ?? "";
  const res = await fetch(`${getNodebenchApiUrl()}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Nodebench ${path} ${res.status}: ${text.slice(0, 400)}`);
  }
  return res.json();
}

async function getJson(path: string): Promise<unknown> {
  const apiKey = process.env.NODEBENCH_API_KEY ?? process.env.NODEBENCH_API_TOKEN ?? "";
  const res = await fetch(`${getNodebenchApiUrl()}${path}`, {
    method: "GET",
    headers: {
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
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
              hints: { type: "array", items: { type: "string" } },
              raw: { type: "object", additionalProperties: true },
            },
            required: ["type"],
          },
          minItems: 1,
          maxItems: 10,
        },
        lens_id: { type: "string", enum: ["company_dossier"] },
        depth: { type: "string", enum: ["quick", "standard"] },
        mode: {
          type: "string",
          enum: ["auto", "analyze", "prepare", "monitor", "compare", "decision_support", "summarize"],
        },
        angles: {
          type: "array",
          items: { type: "string" },
          description: "Optional explicit NodeBench angle IDs to run.",
        },
        constraints: {
          type: "object",
          additionalProperties: true,
          description: "Optional runtime constraints passed through to NodeBench research runs.",
        },
        deliverables: {
          type: "array",
          items: {
            type: "string",
            enum: [
              "json_full",
              "compact_alert",
              "ntfy_brief",
              "notion_markdown",
              "executive_brief",
              "dossier_markdown",
              "email_digest",
              "ui_card_bundle",
            ],
          },
        },
      },
      required: ["objective", "subjects"],
    },
    annotations: { readOnlyHint: false, openWorldHint: true },
    handler: async (args: ResearchRunArgs) => {
      const apiErr = ensureApi();
      if (apiErr) return { error: apiErr };
      try {
        const angles = args.angles?.filter(Boolean) ?? [];
        const body = {
          goal: { objective: args.objective, mode: args.mode ?? ("analyze" as const) },
          subjects: args.subjects.map((s) => ({
            type: s.type,
            name: s.name,
            url: s.url,
            hints: s.hints,
            raw: { ...(s.raw ?? {}), ...(s.text ? { text: s.text } : {}) },
          })),
          angle_strategy: angles.length > 0 ? ("explicit" as const) : ("auto" as const),
          ...(angles.length > 0 ? { angles } : {}),
          depth: args.depth ?? "standard",
          constraints: args.constraints ?? {
            freshness_days: 365,
            latency_budget_ms: 8_000,
            prefer_cache: true,
            max_external_calls: 4,
            evidence_min_sources_per_major_claim: 1,
          },
          deliverables: args.deliverables ?? ["json_full", "ui_card_bundle"],
          context: {
            lens_id: args.lens_id ?? "company_dossier",
            surface: "mcp",
          },
        };
        return await postJson("/v1/research/runs", body);
      } catch (err) {
        const message = err instanceof Error ? err.message : "unknown error";
        return { error: message };
      }
    },
  },
  {
    name: "nodebench.capture",
    description:
      "Persist a messy event capture into the active NodeBench event workspace without live paid search. Uses event corpus / memory-first policy and returns budget-aware status copy.",
    inputSchema: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description: "Raw field note, transcript, screenshot OCR text, or follow-up captured at the event.",
        },
        workspaceId: {
          type: "string",
          description: "Event workspace slug. Defaults to ship-demo-day for local/demo runs.",
        },
        eventId: { type: "string" },
        eventSessionId: { type: "string" },
        anonymousSessionId: {
          type: "string",
          description: "Optional anonymous/session owner key so captures can be read by the matching browser session.",
        },
        title: { type: "string" },
        kind: {
          type: "string",
          enum: ["text", "voice", "image", "screenshot", "file"],
        },
      },
      required: ["text"],
    },
    annotations: { readOnlyHint: false, openWorldHint: false },
    handler: async (args: EventCaptureArgs) => {
      const apiErr = ensureApi();
      if (apiErr) return { error: apiErr };
      try {
        return await postJson("/v1/event-captures", {
          text: args.text,
          workspaceId: args.workspaceId ?? "ship-demo-day",
          eventId: args.eventId,
          eventSessionId: args.eventSessionId,
          anonymousSessionId: args.anonymousSessionId,
          title: args.title,
          kind: args.kind ?? "text",
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "unknown error";
        return { error: message };
      }
    },
  },
  {
    name: "nodebench.notebook_append",
    description:
      "Append reviewed text into a NodeBench report notebook through the same Convex-backed report notebook persistence used by the web UI.",
    inputSchema: {
      type: "object",
      properties: {
        reportId: { type: "string" },
        text: { type: "string" },
        anonymousSessionId: {
          type: "string",
          description: "Optional anonymous/session owner key matching the report owner.",
        },
      },
      required: ["reportId", "text"],
    },
    annotations: { readOnlyHint: false, openWorldHint: false },
    handler: async (args: NotebookAppendArgs) => {
      const apiErr = ensureApi();
      if (apiErr) return { error: apiErr };
      try {
        return await postJson(`/v1/reports/${encodeURIComponent(args.reportId)}/notebook/append`, {
          text: args.text,
          anonymousSessionId: args.anonymousSessionId,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "unknown error";
        return { error: message };
      }
    },
  },
  {
    name: "nodebench.report_export_preview",
    description:
      "Prepare a reviewable NodeBench report export. Returns mapped contacts, companies, interactions, follow-ups, claims, and sources before any completed export.",
    inputSchema: {
      type: "object",
      properties: {
        reportId: { type: "string" },
        format: {
          type: "string",
          enum: ["crm_csv", "csv", "hubspot_csv", "salesforce_csv", "attio_csv", "affinity_csv", "notion_csv", "json", "markdown"],
        },
        anonymousSessionId: { type: "string" },
      },
      required: ["reportId"],
    },
    annotations: { readOnlyHint: false, openWorldHint: false },
    handler: async (args: ReportExportPreviewArgs) => {
      const apiErr = ensureApi();
      if (apiErr) return { error: apiErr };
      try {
        return await postJson(`/v1/reports/${encodeURIComponent(args.reportId)}/exports/preview`, {
          format: args.format ?? "crm_csv",
          anonymousSessionId: args.anonymousSessionId,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "unknown error";
        return { error: message };
      }
    },
  },
  {
    name: "nodebench.report_export_complete",
    description:
      "Complete a previously previewed NodeBench report export after review. Writes the export completion event to the activity ledger.",
    inputSchema: {
      type: "object",
      properties: {
        reportId: { type: "string" },
        exportKey: { type: "string" },
        anonymousSessionId: { type: "string" },
      },
      required: ["reportId", "exportKey"],
    },
    annotations: { readOnlyHint: false, openWorldHint: false },
    handler: async (args: ReportExportCompleteArgs) => {
      const apiErr = ensureApi();
      if (apiErr) return { error: apiErr };
      try {
        return await postJson(`/v1/reports/${encodeURIComponent(args.reportId)}/exports/complete`, {
          exportKey: args.exportKey,
          anonymousSessionId: args.anonymousSessionId,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "unknown error";
        return { error: message };
      }
    },
  },
  {
    name: "nodebench.activity_timeline",
    description:
      "Read the canonical activity ledger for a NodeBench report, including captures, notebook patches, graph clicks, export events, and search/cache decisions.",
    inputSchema: {
      type: "object",
      properties: {
        reportId: { type: "string" },
        anonymousSessionId: { type: "string" },
      },
      required: ["reportId"],
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
    handler: async (args: ActivityTimelineArgs) => {
      const apiErr = ensureApi();
      if (apiErr) return { error: apiErr };
      try {
        const query = args.anonymousSessionId
          ? `?anonymousSessionId=${encodeURIComponent(args.anonymousSessionId)}`
          : "";
        return await getJson(`/v1/reports/${encodeURIComponent(args.reportId)}/timeline${query}`);
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
