import type { McpTool } from "../types.js";
import { genId, getDb } from "../db.js";
import { entityLookupTools } from "./entityLookupTools.js";
import { webTools } from "./webTools.js";
import { reconTools } from "./reconTools.js";
import { sessionMemoryTools } from "./sessionMemoryTools.js";
import { createDeltaTools } from "./deltaTools.js";
import {
  upsertDurableObject,
  recordLocalArtifact,
  registerSharedContextPeer,
  publishSharedContextPacket,
  pullSharedContextPackets,
  enqueueSyncOperation,
  getActiveAccountBinding,
} from "../sync/store.js";

type WorkflowCost = {
  measured: boolean;
  amountUsd: number | null;
  currency: "USD";
  reason: string;
};

type WorkflowEnvelope = {
  workflow: string;
  artifactId: string;
  artifactHandle: string;
  markdown: string;
  structuredData: Record<string, unknown>;
  sourcesUsed: string[];
  latencyMs: number;
  actualCost: WorkflowCost;
};

type SearchResult = {
  title: string;
  url: string;
  snippet: string;
  source?: string;
};

function findTool(tools: McpTool[], name: string): McpTool {
  const tool = tools.find((entry) => entry.name === name);
  if (!tool) {
    throw new Error(`Required tool "${name}" is not available.`);
  }
  return tool;
}

async function callTool(tools: McpTool[], name: string, args: Record<string, unknown>): Promise<any> {
  return findTool(tools, name).handler(args);
}

function unwrapToolResult(result: unknown): Record<string, any> {
  if (result && typeof result === "object" && Array.isArray((result as any).content)) {
    const firstText = (result as any).content.find((entry: any) => entry?.type === "text")?.text;
    if (typeof firstText === "string") {
      try {
        return JSON.parse(firstText) as Record<string, any>;
      } catch {
        return { rawText: firstText };
      }
    }
  }
  if (result && typeof result === "object") {
    return result as Record<string, any>;
  }
  return { value: result };
}

function toStringArray(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => typeof value === "string" && value.trim().length > 0))];
}

function formatBulletList(values: string[], fallback: string, limit = 6): string {
  if (values.length === 0) return `- ${fallback}`;
  return values.slice(0, limit).map((value) => `- ${value}`).join("\n");
}

function unmeteredCost(reason: string): WorkflowCost {
  return {
    measured: false,
    amountUsd: null,
    currency: "USD",
    reason,
  };
}

function createEnvelope(
  workflow: string,
  artifactId: string,
  markdown: string,
  structuredData: Record<string, unknown>,
  sourcesUsed: string[],
  latencyMs: number,
  actualCost = unmeteredCost("Real provider billing is not wired into the v3 core workflow facade yet."),
): WorkflowEnvelope {
  return {
    workflow,
    artifactId,
    artifactHandle: `${workflow}:${artifactId}`,
    markdown,
    structuredData,
    sourcesUsed: toStringArray(sourcesUsed),
    latencyMs,
    actualCost,
  };
}

function extractSearchSources(results: SearchResult[] | undefined): string[] {
  if (!Array.isArray(results)) return [];
  return toStringArray(results.map((entry) => entry.url));
}

function summarizeContext(text: string): { summary: string; keyPoints: string[] } {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return {
      summary: "No context supplied.",
      keyPoints: [],
    };
  }

  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const bulletLike = lines
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);
  const sentences = normalized
    .split(/(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const summary = sentences[0] ?? bulletLike[0] ?? normalized.slice(0, 240);
  const keyPoints = [...new Set((bulletLike.length > 0 ? bulletLike : sentences).slice(0, 5))];

  return { summary, keyPoints };
}

async function runInvestigation(args: {
  subject: string;
  depth?: string;
  persona?: string;
  focus?: string;
}): Promise<{
  artifactId: string;
  markdown: string;
  structuredData: Record<string, unknown>;
  sourcesUsed: string[];
}> {
  const deltaTools = createDeltaTools();

  const [lookupRaw, knowledgeRaw, diligenceRaw] = await Promise.all([
    callTool(entityLookupTools, "entity_lookup", {
      name: args.subject,
      depth: args.depth === "deep" ? "deep" : args.depth === "quick" ? "quick" : "standard",
    }),
    callTool(reconTools, "search_all_knowledge", {
      query: args.subject,
      limit: 5,
    }),
    callTool(deltaTools, "delta_diligence", {
      entity: args.subject,
      depth: args.depth === "deep" ? "deep" : "quick",
      persona: args.persona ?? "founder",
      focus: args.focus,
    }),
  ]);

  const lookup = unwrapToolResult(lookupRaw);
  const knowledge = unwrapToolResult(knowledgeRaw);
  const diligence = unwrapToolResult(diligenceRaw);
  const packet = diligence.packet as Record<string, any> | undefined;

  const facts = Array.isArray(lookup.facts) ? lookup.facts as string[] : [];
  const signals = Array.isArray(lookup.signals) ? lookup.signals as string[] : [];
  const learnings = Array.isArray(knowledge.learnings) ? knowledge.learnings as Array<Record<string, any>> : [];
  const reconFindings = Array.isArray(knowledge.reconFindings) ? knowledge.reconFindings as Array<Record<string, any>> : [];
  const gaps = Array.isArray(knowledge.gaps) ? knowledge.gaps as Array<Record<string, any>> : [];
  const sourcesUsed = toStringArray([
    ...(Array.isArray(lookup.sources) ? lookup.sources : []),
    ...reconFindings.map((entry) => entry.sourceUrl as string | undefined),
  ]);

  const markdown = [
    `# Investigate: ${args.subject}`,
    "",
    "## Summary",
    lookup.summary ?? packet?.summary ?? `Investigation packet created for ${args.subject}.`,
    "",
    "## Key Facts",
    formatBulletList(facts, "No immediate external facts were available."),
    "",
    "## Signals",
    formatBulletList(signals, "No high-confidence live signals surfaced in the quick pass."),
    "",
    "## Stored Context",
    `- Learnings: ${learnings.length}`,
    `- Recon findings: ${reconFindings.length}`,
    `- Resolved gaps: ${gaps.length}`,
    packet?.id ? `- Packet: ${packet.id}` : "- Packet: not created",
  ].join("\n");

  return {
    artifactId: String(packet?.id ?? genId("investigate")),
    markdown,
    structuredData: {
      lookup,
      knowledge,
      packet,
    },
    sourcesUsed,
  };
}

export const coreWorkflowTools: McpTool[] = [
  {
    name: "investigate",
    description:
      "Investigate a company, person, or topic and return a concise sourced artifact. This is the default v3 entry point: one ask in, one report-shaped output out.",
    inputSchema: {
      type: "object",
      properties: {
        subject: { type: "string", description: "Company, person, or topic to investigate." },
        depth: { type: "string", enum: ["quick", "standard", "deep"] },
        persona: { type: "string", enum: ["founder", "banker", "researcher", "operator", "ceo"] },
        focus: { type: "string", description: "Optional angle such as pricing, product, or market position." },
      },
      required: ["subject"],
    },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    handler: async (args: { subject: string; depth?: string; persona?: string; focus?: string }) => {
      const startedAt = Date.now();
      const result = await runInvestigation(args);
      return createEnvelope(
        "investigate",
        result.artifactId,
        result.markdown,
        result.structuredData,
        result.sourcesUsed,
        Date.now() - startedAt,
      );
    },
  },
  {
    name: "compare",
    description:
      "Compare 2-4 entities using the same report-shaped output. The tool backfills quick diligence packets first so the comparison result is usable immediately.",
    inputSchema: {
      type: "object",
      properties: {
        entities: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 4 },
        metrics: { type: "array", items: { type: "string" } },
        persona: { type: "string", enum: ["founder", "banker", "researcher", "operator", "ceo"] },
      },
      required: ["entities"],
    },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    handler: async (args: { entities: string[]; metrics?: string[]; persona?: string }) => {
      const startedAt = Date.now();
      const deltaTools = createDeltaTools();
      const entities = args.entities ?? [];

      const diligencePackets = await Promise.all(
        entities.map(async (entity) => {
          const result = unwrapToolResult(
            await callTool(deltaTools, "delta_diligence", {
              entity,
              depth: "quick",
              persona: args.persona ?? "founder",
            }),
          );
          return result.packet as Record<string, unknown> | undefined;
        }),
      );

      const compareResult = unwrapToolResult(
        await callTool(deltaTools, "delta_compare", {
          entities,
          metrics: args.metrics,
          persona: args.persona ?? "founder",
        }),
      );

      const packet = compareResult.packet as Record<string, any> | undefined;
      const comparisonGrid = Array.isArray(compareResult.comparisonGrid)
        ? compareResult.comparisonGrid as Array<Record<string, any>>
        : [];
      const markdown = [
        `# Compare: ${entities.join(" vs ")}`,
        "",
        "## Metrics",
        formatBulletList(args.metrics ?? ["market position", "strengths", "weaknesses", "recent changes"], "No metrics supplied."),
        "",
        "## Coverage",
        ...comparisonGrid.map((entry) => `- ${entry.entity}: ${Array.isArray(entry.metrics) ? entry.metrics.length : 0} comparison rows`),
        "",
        "## Artifacts",
        ...diligencePackets.map((entry, index) => `- ${entities[index]} diligence packet: ${String(entry?.id ?? "not created")}`),
        `- Comparison packet: ${String(packet?.id ?? "not created")}`,
      ].join("\n");

      return createEnvelope(
        "compare",
        String(packet?.id ?? genId("compare")),
        markdown,
        {
          compare: compareResult,
          diligencePackets,
        },
        toStringArray(diligencePackets.map((entry) => entry?.id as string | undefined)),
        Date.now() - startedAt,
      );
    },
  },
  {
    name: "track",
    description:
      "Add, check, remove, or list tracked entities with one workflow tool. The default path optimizes for watched entities that can feed future nudges and brief artifacts.",
    inputSchema: {
      type: "object",
      properties: {
        entity: { type: "string", description: "Entity to track." },
        action: { type: "string", enum: ["add", "check", "remove", "list"], description: "Tracking action. Defaults to add." },
        alertOn: { type: "array", items: { type: "string" } },
        note: { type: "string", description: "Optional note saved alongside the tracking change." },
      },
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    handler: async (args: { entity?: string; action?: string; alertOn?: string[]; note?: string }) => {
      const startedAt = Date.now();
      const deltaTools = createDeltaTools();
      const action = args.action ?? "add";
      const watchResult = unwrapToolResult(
        await callTool(deltaTools, "delta_watch", {
          action,
          entity: args.entity,
          alert_on: args.alertOn,
        }),
      );

      let searchResult: Record<string, any> | null = null;
      if (action === "check" && args.entity) {
        searchResult = unwrapToolResult(
          await callTool(webTools, "web_search", {
            query: `${args.entity} latest news`,
            maxResults: 5,
            provider: "auto",
          }),
        );
      }

      let noteResult: Record<string, any> | null = null;
      if (args.note && args.entity) {
        noteResult = unwrapToolResult(
          await callTool(sessionMemoryTools, "save_session_note", {
            title: `Tracking ${args.entity}`,
            content: args.note,
            category: "progress",
            tags: ["track", args.entity],
          }),
        );
      }

      const searchSources = extractSearchSources(searchResult?.results as SearchResult[] | undefined);
      const artifactId =
        (noteResult?.filename as string | undefined) ??
        (typeof args.entity === "string" ? `watch:${args.entity}` : genId("track"));
      const markdown = [
        `# Track${args.entity ? `: ${args.entity}` : ""}`,
        "",
        `- Action: ${action}`,
        args.entity ? `- Entity: ${args.entity}` : "- Entity: watchlist overview",
        watchResult?.status ? `- Status: ${watchResult.status}` : null,
        Array.isArray(watchResult?.watchlist) ? `- Watchlist count: ${watchResult.watchlist.length}` : null,
        noteResult?.filePath ? `- Note saved: ${noteResult.filePath}` : null,
        "",
        "## Latest Signals",
        ...(Array.isArray(searchResult?.results) && searchResult.results.length > 0
          ? (searchResult.results as SearchResult[]).slice(0, 5).map((entry) => `- ${entry.title} (${entry.url})`)
          : ["- No live search results were fetched for this action."]),
      ]
        .filter((line): line is string => typeof line === "string")
        .join("\n");

      return createEnvelope(
        "track",
        artifactId,
        markdown,
        {
          watch: watchResult,
          search: searchResult,
          note: noteResult,
        },
        searchSources,
        Date.now() - startedAt,
      );
    },
  },
  {
    name: "summarize",
    description:
      "Turn raw context into a compact brief with key points and optional persistence. This is the fast human-readable artifact when you do not need a full diligence packet.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Artifact title. Defaults to Summary." },
        context: { type: "string", description: "Text to summarize." },
        save: { type: "boolean", description: "Persist the summary into session memory. Defaults to true." },
      },
      required: ["context"],
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    handler: async (args: { title?: string; context: string; save?: boolean }) => {
      const startedAt = Date.now();
      const title = args.title ?? "Summary";
      const summary = summarizeContext(args.context);
      let noteResult: Record<string, any> | null = null;

      if (args.save !== false) {
        noteResult = unwrapToolResult(
          await callTool(sessionMemoryTools, "save_session_note", {
            title,
            content: [summary.summary, "", ...summary.keyPoints.map((point) => `- ${point}`)].join("\n"),
            category: "progress",
            tags: ["summary"],
          }),
        );
      }

      const markdown = [
        `# ${title}`,
        "",
        "## Summary",
        summary.summary,
        "",
        "## Key Points",
        formatBulletList(summary.keyPoints, "No additional key points extracted."),
        noteResult?.filePath ? `\n## Saved\n- ${noteResult.filePath}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      return createEnvelope(
        "summarize",
        String(noteResult?.filename ?? genId("summary")),
        markdown,
        {
          summary,
          note: noteResult,
        },
        [],
        Date.now() - startedAt,
      );
    },
  },
  {
    name: "search",
    description:
      "Search across live web results and stored NodeBench knowledge in one call. Use this instead of deciding between external search and internal memory first.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        maxResults: { type: "number" },
        provider: { type: "string", enum: ["auto", "gemini", "openai", "perplexity"] },
      },
      required: ["query"],
    },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    handler: async (args: { query: string; maxResults?: number; provider?: string }) => {
      const startedAt = Date.now();
      const [webRaw, knowledgeRaw] = await Promise.all([
        callTool(webTools, "web_search", {
          query: args.query,
          maxResults: args.maxResults ?? 5,
          provider: args.provider ?? "auto",
        }),
        callTool(reconTools, "search_all_knowledge", {
          query: args.query,
          limit: Math.min(args.maxResults ?? 5, 10),
        }),
      ]);

      const web = unwrapToolResult(webRaw);
      const knowledge = unwrapToolResult(knowledgeRaw);
      const results = Array.isArray(web.results) ? web.results as SearchResult[] : [];
      const learnings = Array.isArray(knowledge.learnings) ? knowledge.learnings as Array<Record<string, any>> : [];
      const reconFindings = Array.isArray(knowledge.reconFindings) ? knowledge.reconFindings as Array<Record<string, any>> : [];

      const markdown = [
        `# Search: ${args.query}`,
        "",
        "## Live Results",
        ...(results.length > 0
          ? results.slice(0, 5).map((entry) => `- [${entry.title}](${entry.url})${entry.snippet ? ` — ${entry.snippet}` : ""}`)
          : ["- No live provider results."]),
        "",
        "## Stored Context",
        `- Learnings: ${learnings.length}`,
        `- Recon findings: ${reconFindings.length}`,
      ].join("\n");

      return createEnvelope(
        "search",
        genId("search"),
        markdown,
        { web, knowledge },
        toStringArray([
          ...extractSearchSources(results),
          ...reconFindings.map((entry) => entry.sourceUrl as string | undefined),
        ]),
        Date.now() - startedAt,
      );
    },
  },
  {
    name: "report",
    description:
      "Produce a human-readable artifact for either a research topic or a decision. If recommendation inputs are provided, this emits a memo. Otherwise it emits a diligence-style report.",
    inputSchema: {
      type: "object",
      properties: {
        topic: { type: "string", description: "Topic or entity to report on." },
        decision: { type: "string", description: "Decision question for memo mode." },
        recommendation: { type: "string" },
        evidence: { type: "array", items: { type: "string" } },
        risks: { type: "array", items: { type: "string" } },
        alternatives: { type: "array", items: { type: "string" } },
        persona: { type: "string", enum: ["founder", "banker", "researcher", "operator", "ceo"] },
        focus: { type: "string" },
      },
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    handler: async (args: {
      topic?: string;
      decision?: string;
      recommendation?: string;
      evidence?: string[];
      risks?: string[];
      alternatives?: string[];
      persona?: string;
      focus?: string;
    }) => {
      const startedAt = Date.now();
      const deltaTools = createDeltaTools();
      const isMemoMode = Boolean(args.decision || args.recommendation || (args.evidence && args.evidence.length > 0));

      if (isMemoMode) {
        const memo = unwrapToolResult(
          await callTool(deltaTools, "delta_memo", {
            decision: args.decision ?? args.topic ?? "Decision memo",
            recommendation: args.recommendation,
            evidence: args.evidence,
            risks: args.risks,
            alternatives: args.alternatives,
            persona: args.persona ?? "founder",
          }),
        );
        const packet = memo.packet as Record<string, any> | undefined;
        const markdown = [
          `# Memo: ${args.decision ?? args.topic ?? "Decision memo"}`,
          "",
          "## Recommendation",
          args.recommendation ?? "Pending recommendation.",
          "",
          "## Evidence",
          formatBulletList(args.evidence ?? [], "No explicit evidence provided."),
          "",
          "## Risks",
          formatBulletList(args.risks ?? [], "No explicit risks provided."),
          packet?.id ? `\n## Artifact\n- Packet: ${packet.id}` : "",
        ]
          .filter(Boolean)
          .join("\n");

        return createEnvelope(
          "report",
          String(packet?.id ?? genId("report")),
          markdown,
          { memo, packet },
          args.evidence ?? [],
          Date.now() - startedAt,
        );
      }

      const subject = args.topic ?? "Untitled report";
      const investigation = await runInvestigation({
        subject,
        depth: "deep",
        persona: args.persona,
        focus: args.focus,
      });

      return createEnvelope(
        "report",
        investigation.artifactId,
        investigation.markdown.replace("# Investigate:", "# Report:"),
        investigation.structuredData,
        investigation.sourcesUsed,
        Date.now() - startedAt,
      );
    },
  },
  {
    name: "ask_context",
    description:
      "Ask against saved NodeBench context first. This searches session memory and the accumulated knowledge base so repeated setup and rediscovery costs stop compounding.",
    inputSchema: {
      type: "object",
      properties: {
        question: { type: "string", description: "Question to ask against saved context." },
        limit: { type: "number", description: "Maximum note/knowledge matches to return." },
      },
      required: ["question"],
    },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    handler: async (args: { question: string; limit?: number }) => {
      const startedAt = Date.now();
      const limit = args.limit ?? 5;
      const [notesRaw, knowledgeRaw] = await Promise.all([
        callTool(sessionMemoryTools, "load_session_notes", {
          date: "all",
          keyword: args.question,
          limit,
          includeArchived: true,
        }),
        callTool(reconTools, "search_all_knowledge", {
          query: args.question,
          limit,
        }),
      ]);

      const notes = unwrapToolResult(notesRaw);
      const knowledge = unwrapToolResult(knowledgeRaw);
      const noteEntries = Array.isArray(notes.notes) ? notes.notes as Array<Record<string, any>> : [];
      const learnings = Array.isArray(knowledge.learnings) ? knowledge.learnings as Array<Record<string, any>> : [];
      const reconFindings = Array.isArray(knowledge.reconFindings) ? knowledge.reconFindings as Array<Record<string, any>> : [];
      const markdown = [
        `# Ask Context: ${args.question}`,
        "",
        "## Session Notes",
        ...(noteEntries.length > 0
          ? noteEntries.slice(0, limit).map((entry) => `- ${entry.title ?? entry.filename} (${entry.date ?? "unknown date"})`)
          : ["- No matching session notes."]),
        "",
        "## Knowledge Base",
        `- Learnings: ${learnings.length}`,
        `- Recon findings: ${reconFindings.length}`,
      ].join("\n");

      return createEnvelope(
        "ask_context",
        genId("context"),
        markdown,
        { notes, knowledge },
        toStringArray(reconFindings.map((entry) => entry.sourceUrl as string | undefined)),
        Date.now() - startedAt,
      );
    },
  },
];

// ── Bidirectional Sync Tools ───────────────────────────────────────────────
// These connect Claude Code <-> nodebench-mcp <-> NodeBench AI.
// They use the existing sync bridge and shared-context infrastructure.

const MCP_PEER_ID = "peer:local:mcp_core_workflow";

function ensurePeer(): string {
  try {
    registerSharedContextPeer({
      peerId: MCP_PEER_ID,
      product: "nodebench",
      surface: "local_runtime" as any,
      role: "researcher" as any,
      capabilities: ["sync_company", "pull_profile", "sync_report", "pull_report"],
      contextScopes: ["company", "profile", "report"],
    });
  } catch { /* peer may already exist — idempotent */ }
  return MCP_PEER_ID;
}

function getBinding(): { userId: string; workspaceId?: string } | null {
  const binding = getActiveAccountBinding();
  if (!binding) return null;
  return { userId: binding.userId, workspaceId: binding.workspaceId ?? undefined };
}

export const coreSyncTools: McpTool[] = [
  {
    name: "sync_company",
    description:
      "Push a company profile into NodeBench AI from Claude Code. Extracts company truth from a summary you provide (codebase analysis, docs, notes) and publishes it as a shared-context packet that NodeBench AI can consume.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Company name." },
        summary: { type: "string", description: "Company summary or profile text to sync." },
        products: { type: "array", items: { type: "string" }, description: "Products or features." },
        capabilities: { type: "array", items: { type: "string" }, description: "Technical capabilities." },
        signals: { type: "array", items: { type: "string" }, description: "Recent signals or changes." },
        contradictions: { type: "array", items: { type: "string" }, description: "Internal inconsistencies found." },
        sources: { type: "array", items: { type: "string" }, description: "Source file paths or URLs." },
      },
      required: ["name", "summary"],
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    handler: async (args: {
      name: string;
      summary: string;
      products?: string[];
      capabilities?: string[];
      signals?: string[];
      contradictions?: string[];
      sources?: string[];
    }) => {
      const startedAt = Date.now();
      const peerId = ensurePeer();
      const slug = args.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

      // 1. Upsert durable object in local spine
      const { objectId } = upsertDurableObject({
        kind: "company",
        label: args.name,
        source: "mcp_sync",
        status: "active",
        metadata: {
          slug,
          products: args.products ?? [],
          capabilities: args.capabilities ?? [],
          signals: args.signals ?? [],
          contradictions: args.contradictions ?? [],
        },
      });

      // 2. Record as local artifact
      const profileData = {
        name: args.name,
        slug,
        summary: args.summary,
        products: args.products ?? [],
        capabilities: args.capabilities ?? [],
        signals: args.signals ?? [],
        contradictions: args.contradictions ?? [],
        sources: args.sources ?? [],
        syncedAt: new Date().toISOString(),
      };

      const { artifactId } = recordLocalArtifact({
        kind: "company_profile",
        objectId,
        summary: `Company profile: ${args.name}`,
        verificationStatus: "pending_manual_review",
        content: JSON.stringify(profileData),
        queueForSync: true,
      });

      // 3. Publish as shared-context packet for web app consumption
      const { contextId } = publishSharedContextPacket({
        contextType: "entity_packet",
        producerPeerId: peerId,
        subject: args.name,
        summary: args.summary,
        claims: [
          ...(args.products ?? []).map(p => `Product: ${p}`),
          ...(args.capabilities ?? []).map(c => `Capability: ${c}`),
          ...(args.signals ?? []).map(s => `Signal: ${s}`),
        ],
        evidenceRefs: args.sources ?? [],
        confidence: args.contradictions && args.contradictions.length > 0 ? 0.7 : 0.85,
        nextActions: ["review_profile", "run_investigation"],
        queueForSync: true,
      });

      const markdown = [
        `# Sync Company: ${args.name}`,
        "",
        "## Summary",
        args.summary,
        "",
        args.products && args.products.length > 0 ? `## Products\n${args.products.map(p => `- ${p}`).join("\n")}` : "",
        args.capabilities && args.capabilities.length > 0 ? `## Capabilities\n${args.capabilities.map(c => `- ${c}`).join("\n")}` : "",
        args.signals && args.signals.length > 0 ? `## Signals\n${args.signals.map(s => `- ${s}`).join("\n")}` : "",
        args.contradictions && args.contradictions.length > 0 ? `## Contradictions\n${args.contradictions.map(c => `- ${c}`).join("\n")}` : "",
        "",
        "## Sync Status",
        `- Object ID: ${objectId}`,
        `- Artifact ID: ${artifactId}`,
        `- Context ID: ${contextId}`,
        `- Queued for sync: yes`,
      ].filter(Boolean).join("\n");

      return createEnvelope(
        "sync_company",
        objectId,
        markdown,
        { objectId, artifactId, contextId, profile: profileData },
        args.sources ?? [],
        Date.now() - startedAt,
      );
    },
  },
  {
    name: "pull_profile",
    description:
      "Pull the current company profile and saved context from NodeBench AI into Claude Code. Returns the latest shared-context packets, saved reports, and entity data for a company.",
    inputSchema: {
      type: "object",
      properties: {
        entity: { type: "string", description: "Company or entity name to pull." },
        includeReports: { type: "boolean", description: "Include saved reports. Defaults to true." },
        limit: { type: "number", description: "Max items to return. Defaults to 10." },
      },
      required: ["entity"],
    },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    handler: async (args: { entity: string; includeReports?: boolean; limit?: number }) => {
      const startedAt = Date.now();
      const limit = args.limit ?? 10;

      // 1. Pull shared-context packets for this entity
      const packets = pullSharedContextPackets({
        contextType: "entity_packet",
        subjectIncludes: args.entity,
        limit,
      });

      // 2. Pull from local knowledge base
      const knowledgeRaw = await callTool(reconTools, "search_all_knowledge", {
        query: args.entity,
        limit,
      });
      const knowledge = unwrapToolResult(knowledgeRaw);

      // 3. Pull saved reports if requested
      // Pull report-type packets from shared-context (bidirectional bridge)
      const reportPackets = args.includeReports !== false
        ? pullSharedContextPackets({ contextType: "workflow_packet", subjectIncludes: args.entity, limit })
        : [];
      const reports = reportPackets.map((p: any) => ({
        reportId: p.contextId,
        title: p.subject,
        summary: p.summary,
        status: "synced",
        updatedAt: p.updatedAt ?? p.createdAt,
      }));

      const learnings = Array.isArray(knowledge.learnings) ? knowledge.learnings as Array<Record<string, any>> : [];
      const reconFindings = Array.isArray(knowledge.reconFindings) ? knowledge.reconFindings as Array<Record<string, any>> : [];

      const latestPacket = packets.length > 0 ? packets[0] : null;
      const markdown = [
        `# Pull Profile: ${args.entity}`,
        "",
        "## Latest Sync",
        latestPacket
          ? `- Subject: ${latestPacket.subject}\n- Summary: ${latestPacket.summary}\n- Confidence: ${latestPacket.confidence}\n- Version: ${latestPacket.version}`
          : "- No synced company profile found.",
        "",
        "## Saved Reports",
        reports.length > 0
          ? reports.map(r => `- [${r.reportId}] ${r.title} (${r.status})`).join("\n")
          : "- No saved reports for this entity.",
        "",
        "## Knowledge Base",
        `- Learnings: ${learnings.length}`,
        `- Recon findings: ${reconFindings.length}`,
        "",
        "## Shared Context Packets",
        `- Total packets: ${packets.length}`,
      ].join("\n");

      return createEnvelope(
        "pull_profile",
        genId("profile"),
        markdown,
        {
          packets,
          reports,
          knowledge,
          binding: getBinding(),
        },
        toStringArray(reconFindings.map((e: Record<string, any>) => e.sourceUrl as string | undefined)),
        Date.now() - startedAt,
      );
    },
  },
  {
    name: "sync_report",
    description:
      "Push a report artifact from Claude Code into NodeBench AI. The report is saved locally and published as a shared-context packet for the web app to consume.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Report title." },
        entity: { type: "string", description: "Primary entity the report covers." },
        summary: { type: "string", description: "Report summary." },
        sections: {
          type: "array",
          items: {
            type: "object",
            properties: {
              heading: { type: "string" },
              content: { type: "string" },
              confidence: { type: "string", enum: ["high", "medium", "low"] },
            },
            required: ["heading", "content"],
          },
        },
        sources: { type: "array", items: { type: "string" } },
        nextActions: { type: "array", items: { type: "string" } },
        risks: { type: "array", items: { type: "string" } },
        lens: { type: "string", enum: ["founder", "investor", "banker", "operator", "researcher", "ceo"] },
      },
      required: ["title", "summary"],
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    handler: async (args: {
      title: string;
      entity?: string;
      summary: string;
      sections?: Array<{ heading: string; content: string; confidence?: string }>;
      sources?: string[];
      nextActions?: string[];
      risks?: string[];
      lens?: string;
    }) => {
      const startedAt = Date.now();
      const peerId = ensurePeer();
      const reportId = genId("report");

      // 1. Record as sync artifact (canonical models are in the server package, not reachable here)
      const { artifactId } = recordLocalArtifact({
        kind: "report",
        summary: `Report: ${args.title}`,
        verificationStatus: "pending_manual_review",
        content: JSON.stringify({
          reportId,
          title: args.title,
          entity: args.entity,
          summary: args.summary,
          sections: args.sections ?? [],
          sources: args.sources ?? [],
          nextActions: args.nextActions ?? [],
          risks: args.risks ?? [],
          lens: args.lens ?? "founder",
        }),
        queueForSync: true,
      });

      // 3. Publish as shared-context packet
      const { contextId } = publishSharedContextPacket({
        contextType: "workflow_packet",
        producerPeerId: peerId,
        subject: args.title,
        summary: args.summary,
        claims: args.sections?.map(s => `${s.heading}: ${s.content.slice(0, 100)}`) ?? [],
        evidenceRefs: args.sources ?? [],
        nextActions: args.nextActions ?? [],
        confidence: 0.8,
        queueForSync: true,
      });

      const markdown = [
        `# Sync Report: ${args.title}`,
        args.entity ? `Entity: ${args.entity}` : "",
        "",
        "## Summary",
        args.summary,
        "",
        ...(args.sections ?? []).map(s => `## ${s.heading}\n${s.content}`),
        "",
        args.nextActions && args.nextActions.length > 0 ? `## Next Actions\n${args.nextActions.map(a => `- ${a}`).join("\n")}` : "",
        args.risks && args.risks.length > 0 ? `## Risks\n${args.risks.map(r => `- ${r}`).join("\n")}` : "",
        "",
        "## Sync Status",
        `- Report ID: ${reportId}`,
        `- Artifact ID: ${artifactId}`,
        `- Context ID: ${contextId}`,
        `- Queued for sync: yes`,
      ].filter(Boolean).join("\n");

      return createEnvelope(
        "sync_report",
        reportId,
        markdown,
        { reportId, artifactId, contextId },
        args.sources ?? [],
        Date.now() - startedAt,
      );
    },
  },
  {
    name: "pull_report",
    description:
      "Pull a saved report from NodeBench AI into Claude Code. Returns the full report with sections, sources, and next actions.",
    inputSchema: {
      type: "object",
      properties: {
        reportId: { type: "string", description: "Report ID to pull. Omit to list recent reports." },
        entity: { type: "string", description: "Filter reports by entity name." },
        limit: { type: "number", description: "Max reports to return when listing. Defaults to 5." },
      },
    },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    handler: async (args: { reportId?: string; entity?: string; limit?: number }) => {
      const startedAt = Date.now();
      const limit = args.limit ?? 5;

      // Pull from shared-context packets (bidirectional bridge)
      const packets = pullSharedContextPackets({
        contextType: "workflow_packet",
        subjectIncludes: args.entity,
        limit,
      });

      // Match specific packet if reportId provided
      let matchedPacket: any = null;
      if (args.reportId) {
        matchedPacket = packets.find((p: any) => p.contextId === args.reportId) ?? null;
      }

      let markdown: string;

      if (matchedPacket) {
        markdown = [
          `# Report: ${matchedPacket.subject}`,
          `Confidence: ${matchedPacket.confidence}`,
          "",
          "## Summary",
          matchedPacket.summary,
          "",
          matchedPacket.claims?.length > 0 ? `## Sections\n${matchedPacket.claims.map((c: string) => `- ${c}`).join("\n")}` : "",
          matchedPacket.nextActions?.length > 0 ? `## Next Actions\n${matchedPacket.nextActions.map((a: string) => `- ${a}`).join("\n")}` : "",
        ].filter(Boolean).join("\n");
      } else if (packets.length > 0) {
        markdown = [
          `# Reports${args.entity ? ` for ${args.entity}` : ""}`,
          "",
          ...packets.map((p: any) => `- **${p.subject}** [${p.contextId}] — ${p.summary?.slice(0, 80)}...`),
        ].join("\n");
      } else {
        markdown = `# No Reports Found\n\nNo saved reports${args.entity ? ` for "${args.entity}"` : ""}. Use \`investigate\` or \`report\` to create one, then \`sync_report\` to save it.`;
      }

      return createEnvelope(
        "pull_report",
        args.reportId ?? genId("pull"),
        markdown,
        { matchedPacket, packets, binding: getBinding() },
        [],
        Date.now() - startedAt,
      );
    },
  },
];
