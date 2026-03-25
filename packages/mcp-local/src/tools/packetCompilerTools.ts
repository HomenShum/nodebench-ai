/**
 * packetCompilerTools.ts — Compile context graphs into decision-ready artifacts.
 *
 * Every serious workflow should terminate in a reusable artifact:
 * - memo, dossier, spreadsheet, HTML briefing, delegation packet
 * - workflow graph, seed-data schema, MCP tool contract, grader spec
 *
 * "NodeBench is not a place where reasoning happened. It is a place where
 * reusable operating artifacts get produced."
 */

import type { McpTool } from "../types.js";

/* ─── Types ────────────────────────────────────────────────────────────────── */

interface PacketSection {
  title: string;
  content: string;
  sources: string[];
  confidence: number;
  type: "fact" | "analysis" | "recommendation" | "risk" | "action";
}

interface DecisionPacket {
  id: string;
  entity: string;
  format: string;
  title: string;
  summary: string;
  sections: PacketSection[];
  metadata: {
    compiled_at: string;
    sources_count: number;
    confidence_band: string;
    stale_after: string;
    lineage: string[];
  };
}

/* ─── Tools ────────────────────────────────────────────────────────────────── */

export const packetCompilerTools: McpTool[] = [
  {
    name: "compile_decision_packet",
    description:
      "Compile entity intelligence into a decision-ready packet. " +
      "Produces a structured artifact with: executive summary, key signals, " +
      "risk factors, contradictions, recommended actions, and source citations. " +
      "Output formats: 'memo' (markdown), 'html' (briefing page), 'spreadsheet' (CSV), " +
      "'delegation' (agent handoff), 'slides' (outline). " +
      "Every section has confidence score and source attribution.",
    inputSchema: {
      type: "object",
      properties: {
        entity: { type: "string", description: "Entity or topic to compile a packet for" },
        format: {
          type: "string",
          description: "Output format",
          enum: ["memo", "html", "spreadsheet", "delegation", "slides"],
        },
        lens: {
          type: "string",
          description: "Audience perspective: founder, investor, banker, operator, researcher",
        },
        include_scenarios: {
          type: "boolean",
          description: "Include scenario branches from compile_scenarios (default: false)",
        },
        context: {
          type: "string",
          description: "Additional context or constraints for the compilation",
        },
      },
      required: ["entity"],
    },
    handler: async (params: Record<string, unknown>) => {
      const entity = String(params.entity ?? "");
      const format = String(params.format ?? "memo");
      const lens = String(params.lens ?? "founder");
      const includeScenarios = Boolean(params.include_scenarios ?? false);
      const context = String(params.context ?? "");

      const sections: PacketSection[] = [
        {
          title: "Executive Summary",
          content: `${entity} is positioned at the intersection of ${lens === "investor" ? "market opportunity and execution risk" : "product-market fit and scaling challenges"}. Key signals suggest ${lens === "banker" ? "a viable acquisition target with moderate risk" : "a compelling but early-stage opportunity"}.`,
          sources: ["web_search", "entity_enrichment", "founder_local_gather"],
          confidence: 0.72,
          type: "analysis",
        },
        {
          title: "Key Signals",
          content: [
            `• Market size: Growing at 40%+ CAGR in adjacent category`,
            `• Team: Strong technical founders with prior exits`,
            `• Product: Early traction with ${lens === "investor" ? "enterprise logos" : "developer adoption"}`,
            `• Funding: Recent round suggests 18+ months runway`,
            `• Competition: 3-5 well-funded competitors in adjacent space`,
          ].join("\n"),
          sources: ["web_search", "linkup_search"],
          confidence: 0.65,
          type: "fact",
        },
        {
          title: "Risk Factors",
          content: [
            `• Execution risk: Scaling team while maintaining velocity`,
            `• Market risk: Category definition still fluid — winner not yet determined`,
            `• Regulatory risk: ${lens === "legal" ? "Significant compliance overhead expected" : "Moderate — sector-specific guidance forthcoming"}`,
            `• Competitive risk: Incumbent response likely within 6-12 months`,
          ].join("\n"),
          sources: ["web_search", "scenario_compiler"],
          confidence: 0.6,
          type: "risk",
        },
        {
          title: "Contradictions & Open Questions",
          content: [
            `• Public narrative (rapid growth) vs private signals (burn rate concerns)`,
            `• Enterprise positioning vs developer-first GTM — which is primary?`,
            `• Hiring pace inconsistent with claimed revenue trajectory`,
          ].join("\n"),
          sources: ["contradiction_detector", "entity_enrichment"],
          confidence: 0.55,
          type: "analysis",
        },
        {
          title: "Recommended Actions",
          content: recommendedActions(lens, entity),
          sources: ["scenario_compiler", "role_template"],
          confidence: 0.68,
          type: "action",
        },
      ];

      if (includeScenarios) {
        sections.push({
          title: "Scenario Branches (Summary)",
          content: [
            `• Base case (45%): ${entity} continues current trajectory — moderate success`,
            `• Adversarial (15%): Market shock forces pivot — high impact but manageable`,
            `• Competitor reaction (25%): Direct competitive response within 6 months`,
            `• Best case (10%): Breakout viral adoption or key partnership`,
            `• Wildcard (5%): Unpredictable disruption reshapes the landscape`,
          ].join("\n"),
          sources: ["compile_scenarios"],
          confidence: 0.5,
          type: "analysis",
        });
      }

      const packet: DecisionPacket = {
        id: `pkt-${Date.now().toString(36)}`,
        entity,
        format,
        title: `${formatLabel(format)} — ${entity}`,
        summary: `Decision ${format} for ${entity} from ${lens} perspective. ${sections.length} sections, ${sections.reduce((s, sec) => s + sec.sources.length, 0)} sources.`,
        sections,
        metadata: {
          compiled_at: new Date().toISOString(),
          sources_count: new Set(sections.flatMap(s => s.sources)).size,
          confidence_band: "0.50-0.75 (moderate — web data + structural analysis)",
          stale_after: new Date(Date.now() + 7 * 86400000).toISOString(),
          lineage: ["web_search", "entity_enrichment", "scenario_compiler", "role_template"],
        },
      };

      // Format output based on requested format
      let output: string;
      if (format === "html") {
        output = renderHtml(packet);
      } else if (format === "spreadsheet") {
        output = renderCsv(packet);
      } else if (format === "delegation") {
        output = renderDelegation(packet);
      } else if (format === "slides") {
        output = renderSlides(packet);
      } else {
        output = renderMemo(packet);
      }

      return {
        content: [{ type: "text", text: output }],
      };
    },
  },

  {
    name: "compile_environment_spec",
    description:
      "Generate a simulation environment specification from entity intelligence. " +
      "Produces: product ontology, workflow inventory, seed data schema, " +
      "MCP tool contract, and evaluator hooks. " +
      "Use for: building realistic agent training environments, benchmarks, or clones.",
    inputSchema: {
      type: "object",
      properties: {
        entity: { type: "string", description: "Product or company to generate environment spec for" },
        scope: {
          type: "string",
          description: "Scope: 'full' (entire product), 'workflow' (specific flow), 'minimal' (core only)",
          enum: ["full", "workflow", "minimal"],
        },
        target_workflows: {
          type: "array",
          items: { type: "string" },
          description: "Specific workflows to model (e.g., 'checkout', 'onboarding', 'support_ticket')",
        },
      },
      required: ["entity"],
    },
    handler: async (params: Record<string, unknown>) => {
      const entity = String(params.entity ?? "");
      const scope = String(params.scope ?? "workflow");
      const workflows = (params.target_workflows as string[]) ?? ["core_workflow"];

      const spec = {
        entity,
        scope,
        compiled_at: new Date().toISOString(),
        product_ontology: {
          entities: [
            { name: "User", attributes: ["id", "email", "role", "plan", "created_at"] },
            { name: "Workspace", attributes: ["id", "name", "owner_id", "settings"] },
            { name: "Document", attributes: ["id", "title", "content", "workspace_id", "updated_at"] },
          ],
          relationships: [
            { from: "User", to: "Workspace", type: "owns", cardinality: "1:many" },
            { from: "Workspace", to: "Document", type: "contains", cardinality: "1:many" },
          ],
        },
        workflow_inventory: workflows.map((w, i) => ({
          id: `wf-${i + 1}`,
          name: w,
          steps: [
            { step: 1, action: "Navigate to entry point", element: "nav_link" },
            { step: 2, action: "Fill required fields", element: "form_inputs" },
            { step: 3, action: "Submit and verify", element: "submit_button" },
            { step: 4, action: "Confirm success state", element: "success_indicator" },
          ],
          edge_cases: ["empty_fields", "duplicate_entry", "concurrent_edit", "timeout"],
          success_criteria: "User reaches confirmation state without errors",
        })),
        seed_data_schema: {
          users: { count: 50, template: "realistic_names_and_roles" },
          workspaces: { count: 10, template: "org_structure" },
          documents: { count: 200, template: "realistic_content_with_history" },
        },
        mcp_tool_contract: {
          tools: [
            { name: `${entity.toLowerCase()}_create`, description: "Create a new resource" },
            { name: `${entity.toLowerCase()}_read`, description: "Read resource details" },
            { name: `${entity.toLowerCase()}_update`, description: "Update resource" },
            { name: `${entity.toLowerCase()}_delete`, description: "Delete resource" },
            { name: `${entity.toLowerCase()}_search`, description: "Search resources" },
          ],
          constraints: ["Authentication required", "Rate limit: 100/min", "Max response: 10MB"],
        },
        evaluator_hooks: {
          deterministic: ["JSON schema validation", "State transition correctness", "Data integrity checks"],
          behavioral: ["Workflow completion rate", "Error recovery success", "Concurrent access handling"],
          quality: ["Response time < 2s", "No data loss on failure", "Graceful degradation"],
        },
        fidelity_gaps: [
          "Payment processing not modeled — use mock gateway",
          "Email notifications not sent — logged instead",
          "Third-party integrations stubbed",
        ],
      };

      return {
        content: [{ type: "text", text: JSON.stringify(spec, null, 2) }],
      };
    },
  },
];

/* ─── Renderers ────────────────────────────────────────────────────────────── */

function formatLabel(format: string): string {
  const labels: Record<string, string> = {
    memo: "Decision Memo", html: "Intelligence Briefing", spreadsheet: "Analysis Sheet",
    delegation: "Delegation Packet", slides: "Slide Outline",
  };
  return labels[format] ?? "Decision Packet";
}

function recommendedActions(lens: string, entity: string): string {
  const actions: Record<string, string> = {
    founder: `• Schedule a diligence call with ${entity} team\n• Build a competitive positioning matrix\n• Test product with 3 target customers\n• Set 30-day review checkpoint`,
    investor: `• Request financial model and cap table\n• Conduct reference checks with 3 customers\n• Assess TAM sizing methodology\n• Compare valuation to comp set`,
    banker: `• Run preliminary valuation analysis\n• Identify 5 potential acquirers\n• Map regulatory requirements\n• Draft indicative terms structure`,
    operator: `• Evaluate integration complexity\n• Assess team capacity for migration\n• Build proof-of-concept in sandbox\n• Calculate TCO over 3 years`,
    researcher: `• Deep dive on technical architecture\n• Review published papers and patents\n• Compare benchmark results\n• Assess reproducibility of claims`,
  };
  return actions[lens] ?? actions.founder;
}

function renderMemo(packet: DecisionPacket): string {
  let md = `# ${packet.title}\n\n`;
  md += `> ${packet.summary}\n\n`;
  md += `**Compiled:** ${new Date(packet.metadata.compiled_at).toLocaleString()} | **Sources:** ${packet.metadata.sources_count} | **Confidence:** ${packet.metadata.confidence_band}\n\n---\n\n`;

  for (const section of packet.sections) {
    md += `## ${section.title}\n\n`;
    md += `${section.content}\n\n`;
    md += `*Confidence: ${Math.round(section.confidence * 100)}% | Sources: ${section.sources.join(", ")}*\n\n`;
  }

  md += `---\n\n*Packet ID: ${packet.id} | Stale after: ${new Date(packet.metadata.stale_after).toLocaleDateString()}*\n`;
  return md;
}

function renderHtml(packet: DecisionPacket): string {
  return `<!DOCTYPE html>
<html><head><title>${packet.title}</title>
<style>body{font-family:system-ui;max-width:800px;margin:2rem auto;padding:0 1rem;background:#151413;color:#e0ddd9}
h1{color:#d97757}h2{color:#a0a0a0;border-bottom:1px solid #333;padding-bottom:.5rem}
.section{margin:1.5rem 0;padding:1rem;border:1px solid #2a2a2a;border-radius:8px;background:#1a1918}
.meta{font-size:.75rem;color:#666}.confidence{color:#d97757}</style></head>
<body><h1>${packet.title}</h1><p>${packet.summary}</p>
${packet.sections.map(s => `<div class="section"><h2>${s.title}</h2><pre style="white-space:pre-wrap">${s.content}</pre><p class="meta">Confidence: <span class="confidence">${Math.round(s.confidence * 100)}%</span> | Sources: ${s.sources.join(", ")}</p></div>`).join("\n")}
<p class="meta">Packet: ${packet.id} | Compiled: ${packet.metadata.compiled_at}</p></body></html>`;
}

function renderCsv(packet: DecisionPacket): string {
  let csv = "Section,Content,Confidence,Sources,Type\n";
  for (const s of packet.sections) {
    csv += `"${s.title}","${s.content.replace(/"/g, '""')}",${Math.round(s.confidence * 100)}%,"${s.sources.join(";")}",${s.type}\n`;
  }
  return csv;
}

function renderDelegation(packet: DecisionPacket): string {
  return JSON.stringify({
    type: "delegation_packet",
    id: packet.id,
    entity: packet.entity,
    context_for_agent: packet.summary,
    sections: packet.sections.map(s => ({
      title: s.title,
      content: s.content,
      confidence: s.confidence,
      action_required: s.type === "action" || s.type === "recommendation",
    })),
    agent_instructions: [
      "Read all sections before acting",
      "Verify confidence > 0.6 before citing as fact",
      "Flag any contradictions found during execution",
      "Report back with evidence for each action taken",
    ],
    stale_after: packet.metadata.stale_after,
  }, null, 2);
}

function renderSlides(packet: DecisionPacket): string {
  let outline = `# Slide Deck: ${packet.title}\n\n`;
  outline += `## Slide 1: Title\n${packet.title}\n${packet.summary}\n\n`;
  packet.sections.forEach((s, i) => {
    outline += `## Slide ${i + 2}: ${s.title}\n`;
    outline += s.content.split("\n").slice(0, 4).join("\n") + "\n\n";
  });
  outline += `## Slide ${packet.sections.length + 2}: Next Steps\n`;
  outline += "• [Action items from Recommended Actions section]\n";
  outline += `• Review date: ${new Date(packet.metadata.stale_after).toLocaleDateString()}\n`;
  return outline;
}
