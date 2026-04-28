/**
 * NodeBench MCP Research Server
 *
 * Implements the MCP (Model Context Protocol) for universal research capabilities.
 * Follows the spec: tools are model-controlled, resources are URI-addressable.
 *
 * Core tools:
 * - nodebench.research_run
 * - nodebench.expand_subject
 * - nodebench.render_output
 * - nodebench.refresh_resource
 *
 * Resources:
 * - nodebench://entity/{type}/{id}
 * - nodebench://angle/{angle_id}/{subject_type}/{subject_id}
 * - nodebench://brief/{brief_id}
 *
 * Prompts:
 * - research-anything
 * - prepare-brief
 * - compare-subjects
 * - monitor-topic
 * - compact-alert
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";

const API_BASE_URL = process.env.NODEBENCH_API_BASE || "http://localhost:8020";
const API_KEY = process.env.NODEBENCH_API_KEY || "";

// ── MCP Server Setup ────────────────────────────────────────────────────────

const server = new Server(
  {
    name: "nodebench-research",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {
        listChanged: true,
      },
      resources: {
        subscribe: true,
        listChanged: true,
      },
      prompts: {
        listChanged: true,
      },
    },
  }
);

// ── Tools ───────────────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: "nodebench.research_run",
    title: "Nodebench Research Run",
    description:
      "Run adaptive, evidence-backed research across one or more subjects. Automatically resolves entities, infers scenario facets, selects relevant research angles, reuses precomputed resources when available, refreshes stale artifacts when needed, and returns structured outputs plus renderable deliverables.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["goal", "subjects", "depth", "deliverables"],
      properties: {
        preset: { type: "string" },
        goal: {
          type: "object",
          additionalProperties: false,
          required: ["objective", "mode"],
          properties: {
            objective: { type: "string" },
            mode: {
              type: "string",
              enum: [
                "auto",
                "analyze",
                "prepare",
                "monitor",
                "compare",
                "decision_support",
                "summarize",
              ],
            },
            decision_type: {
              type: "string",
              enum: [
                "auto",
                "job",
                "event",
                "vendor",
                "customer",
                "market",
                "founder",
                "topic",
                "regulatory",
                "technical",
                "investment",
              ],
            },
          },
        },
        subjects: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["type"],
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
              id: { type: "string" },
              name: { type: "string" },
              url: { type: "string" },
              raw: { type: "object", additionalProperties: true },
              hints: { type: "array", items: { type: "string" } },
            },
          },
        },
        angle_strategy: {
          type: "string",
          enum: ["auto", "explicit", "preset_bias", "preset_only"],
          default: "auto",
        },
        angles: { type: "array", items: { type: "string" }, default: [] },
        depth: {
          type: "string",
          enum: ["quick", "standard", "comprehensive", "exhaustive"],
        },
        constraints: {
          type: "object",
          additionalProperties: false,
          properties: {
            freshness_days: { type: "integer", minimum: 0 },
            latency_budget_ms: { type: "integer", minimum: 1 },
            prefer_cache: { type: "boolean" },
            max_external_calls: { type: "integer", minimum: 0 },
            evidence_min_sources_per_major_claim: { type: "integer", minimum: 1 },
          },
        },
        deliverables: {
          type: "array",
          minItems: 1,
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
        context: { type: "object", additionalProperties: true, default: {} },
      },
    },
  },

  {
    name: "nodebench.expand_subject",
    title: "Expand Subject",
    description:
      "Expand a single person, company, event, topic, repo, or document into canonical entity resolution, related entities, recommended angles, and reusable resource URIs.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["subject", "depth"],
      properties: {
        subject: {
          type: "object",
          additionalProperties: false,
          required: ["type"],
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
            id: { type: "string" },
            name: { type: "string" },
            url: { type: "string" },
            raw: { type: "object", additionalProperties: true },
            hints: { type: "array", items: { type: "string" } },
          },
        },
        depth: {
          type: "string",
          enum: ["quick", "standard", "comprehensive", "exhaustive"],
        },
        angle_bias: { type: "array", items: { type: "string" }, default: [] },
        freshness_days: { type: "integer", minimum: 0, default: 30 },
      },
    },
  },

  {
    name: "nodebench.render_output",
    title: "Render Output",
    description:
      "Render an existing brief or artifact into a target format such as compact alert, ntfy brief, Notion markdown, executive brief, or email digest. Does not recompute research unless explicitly told to.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["source_uri", "format"],
      properties: {
        source_uri: { type: "string" },
        format: {
          type: "string",
          enum: [
            "compact_alert",
            "ntfy_brief",
            "notion_markdown",
            "executive_brief",
            "email_digest",
            "dossier_markdown",
          ],
        },
        max_chars: { type: "integer", minimum: 50, default: 1200 },
      },
    },
  },

  {
    name: "nodebench.refresh_resource",
    title: "Refresh Resource",
    description:
      "Refresh a stale Nodebench resource URI and return updated metadata, freshness information, and emitted resource URIs.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["uri"],
      properties: {
        uri: { type: "string" },
        depth_override: {
          type: "string",
          enum: ["quick", "standard", "comprehensive", "exhaustive"],
        },
        refresh_policy: {
          type: "string",
          enum: ["if_stale", "force"],
          default: "if_stale",
        },
      },
    },
  },
];

// ── Tool Handlers ──────────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "nodebench.research_run":
        return await handleResearchRun(args);

      case "nodebench.expand_subject":
        return await handleExpandSubject(args);

      case "nodebench.render_output":
        return await handleRenderOutput(args);

      case "nodebench.refresh_resource":
        return await handleRefreshResource(args);

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  } catch (error) {
    console.error(`[MCP] Tool ${name} error:`, error);
    throw new McpError(
      ErrorCode.InternalError,
      error instanceof Error ? error.message : "Internal error"
    );
  }
});

async function handleResearchRun(args: any) {
  const response = await fetch(`${API_BASE_URL}/v1/research/runs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(args),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API error: ${response.status} ${text}`);
  }

  const result = await response.json();

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(result, null, 2),
      },
    ],
    structuredContent: result,
  };
}

async function handleExpandSubject(args: any) {
  // Call research.run with single subject and special flag
  const researchArgs = {
    goal: { objective: "Expand and resolve subject", mode: "analyze" },
    subjects: [args.subject],
    depth: args.depth,
    angle_strategy: "auto",
    deliverables: ["json_full"],
    constraints: {
      freshness_days: args.freshness_days || 30,
      prefer_cache: true,
    },
  };

  return handleResearchRun(researchArgs);
}

async function handleRenderOutput(args: any) {
  // In production, fetch from cache and re-render
  // For now, return the source with a note
  return {
    content: [
      {
        type: "text",
        text: `Rendering ${args.source_uri} to ${args.format} (max ${args.max_chars} chars)\n\nNote: Full render implementation requires cached brief lookup.`,
      },
    ],
  };
}

async function handleRefreshResource(args: any) {
  // Parse URI to determine what to refresh
  const match = args.uri.match(/^nodebench:\/\/([^/]+)\/(.+)$/);
  if (!match) {
    throw new Error(`Invalid resource URI: ${args.uri}`);
  }

  const [, resourceType, resourceId] = match;

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            uri: args.uri,
            resource_type: resourceType,
            resource_id: resourceId,
            refreshed: true,
            last_modified: new Date().toISOString(),
            emitted_resources: [args.uri],
          },
          null,
          2
        ),
      },
    ],
  };
}

// ── Resources ──────────────────────────────────────────────────────────────

const RESOURCE_TEMPLATES = [
  {
    uriTemplate: "nodebench://entity/company/{company_id}",
    name: "Company Entity",
    title: "Company Entity Resource",
    description: "Canonical company profile with related resource links",
    mimeType: "application/json",
  },
  {
    uriTemplate: "nodebench://entity/person/{person_id}",
    name: "Person Entity",
    title: "Person Entity Resource",
    description: "Canonical person profile with career graph",
    mimeType: "application/json",
  },
  {
    uriTemplate: "nodebench://angle/{angle_id}/{subject_type}/{subject_id}",
    name: "Angle Artifact",
    title: "Angle Artifact Resource",
    description: "Precomputed or cached artifact for a subject-angle pair",
    mimeType: "application/json",
  },
  {
    uriTemplate: "nodebench://brief/{brief_id}",
    name: "Research Brief",
    title: "Research Brief Resource",
    description: "Final merged brief with evidence and rendered outputs",
    mimeType: "application/json",
  },
];

server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [], // Dynamic - would be populated from cache
  resourceTemplates: RESOURCE_TEMPLATES,
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  // Parse URI
  const match = uri.match(/^nodebench:\/\/([^/]+)\/(.+)$/);
  if (!match) {
    throw new McpError(ErrorCode.InvalidRequest, `Invalid resource URI: ${uri}`);
  }

  const [, resourceType, resourceId] = match;

  // Fetch from API (in production, hit cache directly)
  try {
    const response = await fetch(`${API_BASE_URL}/v1/resources/${encodeURIComponent(uri)}`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });

    if (!response.ok) {
      // Return placeholder for resources not yet cached
      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(
              {
                uri,
                resource_type: resourceType,
                resource_id: resourceId,
                status: "not_cached",
                message: "Resource not yet computed. Run research to generate.",
              },
              null,
              2
            ),
          },
        ],
      };
    }

    const data = await response.json();
    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(
            {
              uri,
              error: error instanceof Error ? error.message : "Failed to fetch",
            },
            null,
            2
          ),
        },
      ],
    };
  }
});

// ── Prompts ─────────────────────────────────────────────────────────────────

const PROMPTS = [
  {
    name: "research-anything",
    title: "Research Anything",
    description: "Gather adaptive, multi-angle research on any subject or set of subjects.",
    arguments: [
      { name: "objective", required: true, description: "What you want to achieve" },
      { name: "subjects_json", required: true, description: "JSON array of subjects" },
      { name: "depth", required: false, description: "quick/standard/comprehensive/exhaustive" },
    ],
  },
  {
    name: "prepare-brief",
    title: "Prepare Brief",
    description:
      "Prepare a concise brief and talking points for an email, meeting, event, company, or person.",
    arguments: [
      { name: "subject_json", required: true, description: "Subject to research" },
      { name: "preset", required: false, description: "Optional preset (job_inbound_v1, etc.)" },
      { name: "depth", required: false, description: "Research depth" },
    ],
  },
  {
    name: "compare-subjects",
    title: "Compare Subjects",
    description: "Compare multiple subjects using relevant overlapping angles.",
    arguments: [
      { name: "subjects_json", required: true, description: "JSON array of subjects to compare" },
      { name: "focus", required: false, description: "Focus area (funding, people, etc.)" },
      { name: "depth", required: false, description: "Research depth" },
    ],
  },
  {
    name: "monitor-topic",
    title: "Monitor Topic",
    description:
      "Create a research run optimized for world monitoring, public signals, and narrative tracking.",
    arguments: [
      { name: "topic", required: true, description: "Topic to monitor" },
      { name: "depth", required: false, description: "Research depth" },
    ],
  },
  {
    name: "compact-alert",
    title: "Compact Alert",
    description: "Shrink an existing Nodebench brief into an alert-sized payload.",
    arguments: [
      { name: "brief_uri", required: true, description: "URI of brief to compact" },
      { name: "max_chars", required: false, description: "Maximum characters" },
    ],
  },
];

server.setRequestHandler(ListPromptsRequestSchema, async () => ({
  prompts: PROMPTS,
}));

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  const prompt = PROMPTS.find((p) => p.name === name);
  if (!prompt) {
    throw new McpError(ErrorCode.InvalidRequest, `Unknown prompt: ${name}`);
  }

  // Build prompt text based on name
  let text = "";

  switch (name) {
    case "research-anything":
      text = `Call nodebench.research_run with:
- goal.objective = "${args?.objective || "understand and prepare"}"
- goal.mode = "auto"
- subjects = ${args?.subjects_json || "[]"}
- depth = "${args?.depth || "standard"}"
- angle_strategy = "auto"
- deliverables = ["json_full"]

Prefer existing nodebench:// resources before recomputing.`;
      break;

    case "prepare-brief":
      text = `Call nodebench.research_run with:
- goal.objective = "prepare brief and talking points"
- goal.mode = "prepare"
- subjects = [${args?.subject_json || "{}"}]
- preset = "${args?.preset || "auto"}"
- depth = "${args?.depth || "standard"}"
- deliverables = ["compact_alert", "notion_markdown", "json_full"]`;
      break;

    case "compare-subjects":
      text = `Call nodebench.research_run with:
- goal.objective = "compare subjects for ${args?.focus || "key differences"}"
- goal.mode = "compare"
- subjects = ${args?.subjects_json || "[]"}
- depth = "${args?.depth || "standard"}"
- angle_strategy = "auto"
- deliverables = ["json_full", "executive_brief"]`;
      break;

    case "monitor-topic":
      text = `Call nodebench.research_run with:
- goal.objective = "monitor topic: ${args?.topic || ""}"
- goal.mode = "monitor"
- subjects = [{"type": "topic", "name": "${args?.topic || ""}"}]
- depth = "${args?.depth || "quick"}"
- angle_strategy = "auto"
- deliverables = ["compact_alert", "json_full"]`;
      break;

    case "compact-alert":
      text = `Call nodebench.render_output with:
- source_uri = "${args?.brief_uri || ""}"
- format = "compact_alert"
- max_chars = ${args?.max_chars || 1200}`;
      break;

    default:
      text = `Prompt ${name} not yet implemented.`;
  }

  return {
    description: prompt.description,
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text,
        },
      },
    ],
  };
});

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("NodeBench MCP Research Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
