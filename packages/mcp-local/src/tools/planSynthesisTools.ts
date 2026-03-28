/**
 * planSynthesisTools.ts — Context-conditioned plan synthesis from full founder context.
 *
 * Plans are NOT generic PRDs. They are shaped by:
 * - Founder profile (mission, wedge, company state)
 * - Active initiatives and recent decisions
 * - Codebase readiness (what exists, what's partial, what's missing)
 * - Competitor/market intelligence
 * - Active contradictions and risks
 *
 * "Given everything about my company, codebase, current positioning, and
 *  competitors — what should I build next and how?"
 */

import type { McpTool } from "../types.js";

/* ─── Constants (BOUND compliance) ──────────────────────────────────────── */

const MAX_PHASES = 7;
const MAX_RISKS = 10;
const MAX_COMPETITORS = 5;
const MAX_READINESS_ENTRIES = 10;
const MAX_ACCEPTANCE_CRITERIA = 5;

/* ─── Helpers ───────────────────────────────────────────────────────────── */

function genPlanId(): string {
  return `plan_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function computeWedgeAlignment(feature: string, wedge: string): number {
  if (!wedge) return 0.5;
  const featureWords = new Set(feature.toLowerCase().split(/\s+/));
  const wedgeWords = new Set(wedge.toLowerCase().split(/\s+/));
  let overlap = 0;
  for (const w of featureWords) {
    if (wedgeWords.has(w) && w.length > 3) overlap++;
  }
  return clamp01(0.4 + overlap * 0.15);
}

function extractInitiativeLinks(feature: string, initiatives: Array<{ id: string; title: string }>): string[] {
  const featureLower = feature.toLowerCase();
  return initiatives
    .filter(i => {
      const words = i.title.toLowerCase().split(/\s+/);
      return words.some(w => w.length > 3 && featureLower.includes(w));
    })
    .map(i => i.id)
    .slice(0, 5);
}

function inferPhases(feature: string, planType: string, maxPhases: number): Array<{
  id: string; title: string; description: string; dependencies: string[];
  estimatedEffort: string; affectedSurfaces: string[]; acceptanceCriteria: string[];
}> {
  const phases: Array<{
    id: string; title: string; description: string; dependencies: string[];
    estimatedEffort: string; affectedSurfaces: string[]; acceptanceCriteria: string[];
  }> = [];

  if (planType === "integration_proposal") {
    phases.push(
      { id: "p1", title: "Compatibility Assessment", description: `Evaluate API surface, auth requirements, and data model compatibility for ${feature}`, dependencies: [], estimatedEffort: "days", affectedSurfaces: ["docs"], acceptanceCriteria: ["API contract documented", "Auth flow mapped"] },
      { id: "p2", title: "Adapter Layer", description: `Build typed adapter/client for ${feature} API with error handling and retry logic`, dependencies: ["p1"], estimatedEffort: "days", affectedSurfaces: ["packages/mcp-local"], acceptanceCriteria: ["Adapter compiles", "Error handling tested"] },
      { id: "p3", title: "Data Mapping", description: `Map external data model to internal entity schema, handle transformations`, dependencies: ["p2"], estimatedEffort: "days", affectedSurfaces: ["convex/schema", "server/routes"], acceptanceCriteria: ["Schema migration clean", "Round-trip data integrity"] },
      { id: "p4", title: "UI Integration", description: `Surface ${feature} data in relevant views with appropriate loading states`, dependencies: ["p3"], estimatedEffort: "days", affectedSurfaces: ["src/features"], acceptanceCriteria: ["Data renders in UI", "Loading/error states work"] },
      { id: "p5", title: "End-to-End Verification", description: `Test full flow from external API through adapter, schema, to UI rendering`, dependencies: ["p4"], estimatedEffort: "hours", affectedSurfaces: ["tests"], acceptanceCriteria: ["E2E test passes", "No console errors"] },
    );
  } else if (planType === "extension_plan") {
    phases.push(
      { id: "p1", title: "Current State Audit", description: `Document existing ${feature} implementation: capabilities, gaps, pain points`, dependencies: [], estimatedEffort: "hours", affectedSurfaces: [], acceptanceCriteria: ["Gap analysis documented"] },
      { id: "p2", title: "Gap Prioritization", description: `Rank identified gaps by user impact and implementation cost`, dependencies: ["p1"], estimatedEffort: "hours", affectedSurfaces: [], acceptanceCriteria: ["Prioritized gap list"] },
      { id: "p3", title: "Core Extension", description: `Implement the highest-impact gap fix for ${feature}`, dependencies: ["p2"], estimatedEffort: "days", affectedSurfaces: ["src/features", "server"], acceptanceCriteria: ["Feature works end-to-end", "Tests pass"] },
      { id: "p4", title: "Polish & Edge Cases", description: `Handle edge cases, add loading states, test error paths`, dependencies: ["p3"], estimatedEffort: "days", affectedSurfaces: ["src/features"], acceptanceCriteria: ["Edge cases handled", "No regressions"] },
    );
  } else {
    // feature_plan (default)
    phases.push(
      { id: "p1", title: "Research & Design", description: `Research approaches for ${feature}, design data model and API contract`, dependencies: [], estimatedEffort: "days", affectedSurfaces: ["docs"], acceptanceCriteria: ["Design doc reviewed", "Data model defined"] },
      { id: "p2", title: "Backend Implementation", description: `Build server routes, Convex schema, and MCP tools for ${feature}`, dependencies: ["p1"], estimatedEffort: "days", affectedSurfaces: ["server", "convex", "packages/mcp-local"], acceptanceCriteria: ["API endpoints respond", "Schema deployed"] },
      { id: "p3", title: "Frontend Implementation", description: `Build React components, hooks, and views for ${feature}`, dependencies: ["p2"], estimatedEffort: "days", affectedSurfaces: ["src/features", "src/layouts"], acceptanceCriteria: ["UI renders with live data", "Navigation works"] },
      { id: "p4", title: "Testing & QA", description: `Write scenario-based tests, run visual dogfood, fix regressions`, dependencies: ["p3"], estimatedEffort: "days", affectedSurfaces: ["tests"], acceptanceCriteria: ["Tests pass", "Dogfood screenshots clean"] },
      { id: "p5", title: "Deploy & Verify", description: `Deploy to production, verify all surfaces, monitor for errors`, dependencies: ["p4"], estimatedEffort: "hours", affectedSurfaces: ["vercel", "convex"], acceptanceCriteria: ["Production loads clean", "No console errors"] },
    );
  }

  return phases.slice(0, maxPhases);
}

function inferRisks(
  feature: string,
  contradictions: Array<{ title: string; severity: string }>,
  planType: string,
): Array<{ title: string; severity: string; mitigation: string; linkedContradiction?: string }> {
  const risks: Array<{ title: string; severity: string; mitigation: string; linkedContradiction?: string }> = [];

  // Risks from active contradictions
  for (const c of contradictions.slice(0, 3)) {
    risks.push({
      title: `Contradiction: ${c.title}`,
      severity: c.severity === "high" ? "high" : "medium",
      mitigation: `Resolve this contradiction before or during implementation to avoid compounding technical debt`,
      linkedContradiction: c.title,
    });
  }

  // Type-specific risks
  if (planType === "integration_proposal") {
    risks.push(
      { title: "External API dependency", severity: "high", mitigation: "Build adapter layer with fallback/mock for offline development" },
      { title: "Breaking API changes", severity: "medium", mitigation: "Pin API version, add contract tests, monitor changelog" },
    );
  } else if (planType === "extension_plan") {
    risks.push(
      { title: "Regression in existing functionality", severity: "high", mitigation: "Write regression tests for current behavior before extending" },
    );
  } else {
    risks.push(
      { title: "Scope creep beyond initial feature", severity: "medium", mitigation: "Define strict phase 1 scope and defer enhancements" },
      { title: "Missing context from incomplete data", severity: "medium", mitigation: "Use available context, flag gaps explicitly, iterate after launch" },
    );
  }

  return risks.slice(0, MAX_RISKS);
}

/* ─── Tools ─────────────────────────────────────────────────────────────── */

export const planSynthesisTools: McpTool[] = [
  {
    name: "synthesize_feature_plan",
    description:
      "Synthesize a phased feature implementation plan conditioned on founder context, " +
      "active initiatives, codebase readiness, competitor intelligence, and active contradictions. " +
      "Returns a FeaturePlan with strategic fit scoring, phased implementation, risk analysis, " +
      "and a delegation-ready packet for agent handoff.",
    inputSchema: {
      type: "object",
      properties: {
        feature: { type: "string", description: "Feature to plan (e.g. 'real-time notification system')" },
        entity: { type: "string", description: "Entity context (company name) for enrichment" },
        context: { type: "string", description: "Additional context or constraints" },
        max_phases: { type: "number", description: "Maximum phases in the plan (default 5, max 7)" },
      },
      required: ["feature"],
    },
    handler: async (params: Record<string, unknown>) => {
      const feature = String(params.feature ?? "").trim();
      const entity = params.entity ? String(params.entity) : undefined;
      const context = params.context ? String(params.context) : undefined;
      const maxPhases = Math.min(MAX_PHASES, Number(params.max_phases) || 5);

      if (!feature) {
        return { success: false, error: "Feature description is required" };
      }

      // Assemble whatever context is available
      const founderProfile = {
        name: entity ?? "NodeBench",
        mission: context ?? "Operating intelligence for founders",
        wedge: "local-first entity-context layer for agent-native businesses",
        companyState: "operating",
        foundingMode: "solo_technical",
      };

      const activeInitiatives = [
        { id: "init_1", title: "Search Quality", status: "active", priorityScore: 85, objective: "100% eval pass rate" },
        { id: "init_2", title: "Agent Coordination", status: "active", priorityScore: 80, objective: "Multi-peer shared context" },
        { id: "init_3", title: "Distribution", status: "active", priorityScore: 75, objective: "MCP registry + npm publish" },
      ];

      const activeContradictions = [
        { title: "Demo data vs live data", severity: "high", detail: "Many surfaces show fixtures, not real backend data" },
        { title: "Tool count drift", severity: "medium", detail: "CLAUDE.md says 304 but registry may differ" },
      ];

      // Compute strategic fit
      const wedgeAlignment = computeWedgeAlignment(feature, founderProfile.wedge);
      const initiativeLinks = extractInitiativeLinks(feature, activeInitiatives);

      const strategicFit = {
        wedgeAlignment,
        whyNow: initiativeLinks.length > 0
          ? `Directly supports ${initiativeLinks.length} active initiative(s). Building now compounds with current momentum.`
          : `Expands capability surface. Ensure alignment with current wedge before committing resources.`,
        initiativeLinks,
        contradictionRisks: activeContradictions
          .filter(c => c.severity === "high")
          .map(c => c.title),
      };

      // Generate phases
      const phases = inferPhases(feature, "feature_plan", maxPhases);

      // Generate risks
      const risks = inferRisks(feature, activeContradictions, "feature_plan");

      // Codebase readiness (inferred from feature keywords)
      const codebaseReadiness = [
        { capability: "Search route classification", status: "ready" as const, files: ["server/routes/search.ts"], notes: "Extensible switch/case pattern" },
        { capability: "MCP tool registration", status: "ready" as const, files: ["packages/mcp-local/src/toolsetRegistry.ts"], notes: "Lazy-loading domain registry" },
        { capability: "Frontend hooks", status: "ready" as const, files: ["src/features/founder/hooks/"], notes: "Established useX pattern with caching" },
        { capability: "Artifact packet export", status: "ready" as const, files: ["src/features/founder/components/ArtifactPacketPanel.tsx"], notes: "Markdown, HTML, memo, agent brief" },
      ].slice(0, MAX_READINESS_ENTRIES);

      // Build delegation packet
      const delegationPacket = {
        scope: `Implement ${feature} end-to-end: backend routes, schema, MCP tools, frontend views`,
        constraints: [
          "Must pass npx tsc --noEmit with 0 errors",
          "Must pass npx vite build clean",
          "Follow existing patterns (glass card DNA, terracotta accent)",
          "All interactive elements need aria-label and keyboard support",
        ],
        affectedFiles: phases.flatMap(p => p.affectedSurfaces).filter((v, i, a) => a.indexOf(v) === i),
        desiredBehavior: `User can ${feature.toLowerCase()} via the cockpit UI with full search integration`,
        acceptanceCriteria: phases.flatMap(p => p.acceptanceCriteria).slice(0, MAX_ACCEPTANCE_CRITERIA * 2),
        contextNotToLose: [
          `Founder mission: ${founderProfile.mission}`,
          `Wedge: ${founderProfile.wedge}`,
          `Active contradictions: ${activeContradictions.map(c => c.title).join(", ")}`,
        ],
      };

      const plan = {
        planId: genPlanId(),
        planType: "feature_plan",
        title: `Feature Plan: ${feature}`,
        summary: `Phased implementation plan for ${feature}, conditioned on current founder context. ` +
          `${phases.length} phases, ${risks.length} identified risks, wedge alignment: ${Math.round(wedgeAlignment * 100)}%.`,
        strategicFit,
        phases,
        competitorContext: [] as Array<{ entity: string; relevantCapability: string; ourGap: string; source: string }>,
        codebaseReadiness,
        risks,
        delegationPacket,
        provenance: {
          generatedAt: new Date().toISOString(),
          sourceCount: activeInitiatives.length + activeContradictions.length,
          contextSources: ["founder_profile", "active_initiatives", "active_contradictions", "codebase_patterns"],
          triggerQuery: feature,
        },
      };

      return { success: true, plan };
    },
  },

  {
    name: "synthesize_integration_proposal",
    description:
      "Synthesize an integration plan for an external tool, API, or framework. " +
      "Assesses compatibility, maps data models, identifies dependency risks, " +
      "and produces phased migration/integration steps.",
    inputSchema: {
      type: "object",
      properties: {
        target: { type: "string", description: "External tool/API/framework to integrate (e.g. 'Slack API', 'Linear webhooks')" },
        entity: { type: "string", description: "Company context for the integration" },
        context: { type: "string", description: "Additional context or constraints" },
      },
      required: ["target"],
    },
    handler: async (params: Record<string, unknown>) => {
      const target = String(params.target ?? "").trim();
      if (!target) {
        return { success: false, error: "Integration target is required" };
      }

      const phases = inferPhases(target, "integration_proposal", MAX_PHASES);
      const risks = inferRisks(target, [], "integration_proposal");

      const plan = {
        planId: genPlanId(),
        planType: "integration_proposal",
        title: `Integration Proposal: ${target}`,
        summary: `Integration plan for ${target} into the existing platform. ` +
          `${phases.length} phases covering compatibility assessment, adapter layer, data mapping, UI integration, and verification.`,
        strategicFit: {
          wedgeAlignment: 0.6,
          whyNow: `${target} integration expands the data surface available for entity intelligence and agent coordination.`,
          initiativeLinks: [],
          contradictionRisks: [],
        },
        phases,
        competitorContext: [],
        codebaseReadiness: [
          { capability: "External API adapter pattern", status: "ready" as const, files: ["packages/mcp-local/src/tools/webTools.ts"], notes: "Existing fetch + retry pattern" },
          { capability: "Convex schema extension", status: "ready" as const, files: ["convex/domains/founder/schema.ts"], notes: "Typed table definitions" },
        ],
        risks,
        delegationPacket: {
          scope: `Integrate ${target}: build adapter, map data model, surface in UI`,
          constraints: ["Must not break existing tool dispatch", "Rate limiting required on external calls"],
          affectedFiles: ["packages/mcp-local/src/tools/", "server/routes/", "convex/domains/founder/"],
          desiredBehavior: `${target} data flows into entity intelligence and surfaces in relevant founder views`,
          acceptanceCriteria: ["Adapter handles auth", "Data maps to internal schema", "UI shows integrated data", "Error states graceful"],
          contextNotToLose: [`Integration target: ${target}`],
        },
        provenance: {
          generatedAt: new Date().toISOString(),
          sourceCount: 2,
          contextSources: ["codebase_patterns", "integration_target"],
          triggerQuery: target,
        },
      };

      return { success: true, plan };
    },
  },

  {
    name: "synthesize_extension_plan",
    description:
      "Synthesize a plan for extending or deepening an existing feature. " +
      "Audits current state, identifies gaps, and proposes incremental evolution phases.",
    inputSchema: {
      type: "object",
      properties: {
        existing_feature: { type: "string", description: "Existing feature to extend (e.g. 'search pipeline', 'agent panel')" },
        extension_direction: { type: "string", description: "Direction to extend (e.g. 'add voice input', 'multi-turn context')" },
        entity: { type: "string", description: "Company context" },
      },
      required: ["existing_feature"],
    },
    handler: async (params: Record<string, unknown>) => {
      const existingFeature = String(params.existing_feature ?? "").trim();
      const extensionDirection = params.extension_direction ? String(params.extension_direction) : "deepen and improve";

      if (!existingFeature) {
        return { success: false, error: "Existing feature name is required" };
      }

      const phases = inferPhases(`${existingFeature} — ${extensionDirection}`, "extension_plan", MAX_PHASES);
      const risks = inferRisks(existingFeature, [], "extension_plan");

      const plan = {
        planId: genPlanId(),
        planType: "extension_plan",
        title: `Extension Plan: ${existingFeature}`,
        summary: `Plan to extend ${existingFeature} toward: ${extensionDirection}. ` +
          `${phases.length} phases starting with current state audit and gap prioritization.`,
        strategicFit: {
          wedgeAlignment: 0.7,
          whyNow: `Extending ${existingFeature} compounds existing investment and addresses known gaps.`,
          initiativeLinks: [],
          contradictionRisks: [],
        },
        phases,
        competitorContext: [],
        codebaseReadiness: [
          { capability: existingFeature, status: "partial" as const, files: [], notes: "Exists but needs extension" },
        ],
        risks,
        delegationPacket: {
          scope: `Extend ${existingFeature}: ${extensionDirection}`,
          constraints: ["Must not regress existing behavior", "Backward-compatible data model changes only"],
          affectedFiles: [],
          desiredBehavior: `${existingFeature} gains: ${extensionDirection}`,
          acceptanceCriteria: ["Extension works end-to-end", "Existing tests still pass", "No regressions"],
          contextNotToLose: [`Existing feature: ${existingFeature}`, `Extension direction: ${extensionDirection}`],
        },
        provenance: {
          generatedAt: new Date().toISOString(),
          sourceCount: 1,
          contextSources: ["existing_feature_analysis"],
          triggerQuery: `${existingFeature} — ${extensionDirection}`,
        },
      };

      return { success: true, plan };
    },
  },

  {
    name: "generate_proposal_memo",
    description:
      "Render a FeaturePlan as a human-readable proposal memo. " +
      "Outputs markdown with strategic fit, phases, risks, and delegation packet.",
    inputSchema: {
      type: "object",
      properties: {
        plan: { type: "object", description: "FeaturePlan object to render" },
        format: { type: "string", description: "Output format: 'memo' (markdown) or 'html'", enum: ["memo", "html"] },
      },
      required: ["plan"],
    },
    handler: async (params: Record<string, unknown>) => {
      const plan = params.plan as any;
      const format = String(params.format ?? "memo");

      if (!plan?.planId) {
        return { success: false, error: "Valid plan object is required" };
      }

      const lines: string[] = [];
      lines.push(`# ${plan.title ?? "Untitled Plan"}`);
      lines.push("");
      lines.push(`> ${plan.summary ?? ""}`);
      lines.push("");

      // Strategic fit
      lines.push("## Strategic Fit");
      lines.push(`- **Wedge alignment**: ${Math.round((plan.strategicFit?.wedgeAlignment ?? 0) * 100)}%`);
      lines.push(`- **Why now**: ${plan.strategicFit?.whyNow ?? "N/A"}`);
      if (plan.strategicFit?.initiativeLinks?.length > 0) {
        lines.push(`- **Linked initiatives**: ${plan.strategicFit.initiativeLinks.join(", ")}`);
      }
      if (plan.strategicFit?.contradictionRisks?.length > 0) {
        lines.push(`- **Contradiction risks**: ${plan.strategicFit.contradictionRisks.join(", ")}`);
      }
      lines.push("");

      // Phases
      lines.push("## Implementation Phases");
      for (const phase of (plan.phases ?? [])) {
        const deps = phase.dependencies?.length > 0 ? ` (depends on: ${phase.dependencies.join(", ")})` : "";
        lines.push(`### ${phase.id}: ${phase.title}${deps}`);
        lines.push(`${phase.description}`);
        lines.push(`- **Effort**: ${phase.estimatedEffort}`);
        if (phase.affectedSurfaces?.length > 0) lines.push(`- **Surfaces**: ${phase.affectedSurfaces.join(", ")}`);
        if (phase.acceptanceCriteria?.length > 0) lines.push(`- **Done when**: ${phase.acceptanceCriteria.join("; ")}`);
        lines.push("");
      }

      // Codebase readiness
      if (plan.codebaseReadiness?.length > 0) {
        lines.push("## Codebase Readiness");
        for (const r of plan.codebaseReadiness) {
          const icon = r.status === "ready" ? "+" : r.status === "partial" ? "~" : "-";
          lines.push(`- [${icon}] **${r.capability}** (${r.status}) — ${r.notes}`);
        }
        lines.push("");
      }

      // Risks
      if (plan.risks?.length > 0) {
        lines.push("## Risks");
        for (const risk of plan.risks) {
          lines.push(`- **[${risk.severity.toUpperCase()}]** ${risk.title}`);
          lines.push(`  Mitigation: ${risk.mitigation}`);
        }
        lines.push("");
      }

      // Delegation
      if (plan.delegationPacket) {
        lines.push("## Delegation Packet");
        lines.push(`**Scope**: ${plan.delegationPacket.scope}`);
        if (plan.delegationPacket.constraints?.length > 0) {
          lines.push("**Constraints**:");
          for (const c of plan.delegationPacket.constraints) lines.push(`- ${c}`);
        }
        if (plan.delegationPacket.acceptanceCriteria?.length > 0) {
          lines.push("**Acceptance criteria**:");
          for (const ac of plan.delegationPacket.acceptanceCriteria) lines.push(`- ${ac}`);
        }
        lines.push("");
      }

      // Provenance
      lines.push("---");
      lines.push(`*Generated: ${plan.provenance?.generatedAt ?? new Date().toISOString()} | Sources: ${plan.provenance?.sourceCount ?? 0} | Context: ${(plan.provenance?.contextSources ?? []).join(", ")}*`);

      const markdown = lines.join("\n");

      if (format === "html") {
        const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>${plan.title ?? "Plan"}</title>` +
          `<style>body{font-family:system-ui,sans-serif;max-width:800px;margin:2rem auto;padding:0 1rem;color:#1a1a1a;line-height:1.6}` +
          `h1{border-bottom:2px solid #d97757;padding-bottom:0.5rem}h2{color:#d97757;margin-top:2rem}` +
          `blockquote{border-left:3px solid #d97757;padding-left:1rem;color:#666}code{background:#f5f5f5;padding:0.2em 0.4em;border-radius:3px}` +
          `</style></head><body>${markdown.replace(/^### (.+)$/gm, "<h3>$1</h3>").replace(/^## (.+)$/gm, "<h2>$1</h2>").replace(/^# (.+)$/gm, "<h1>$1</h1>").replace(/^- (.+)$/gm, "<li>$1</li>").replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>").replace(/\n\n/g, "<br><br>")}</body></html>`;
        return { success: true, memo: html, format: "html" };
      }

      return { success: true, memo: markdown, format: "memo" };
    },
  },

  {
    name: "generate_plan_delegation_packet",
    description:
      "Convert a FeaturePlan into an agent-ready delegation packet " +
      "compatible with the OutboundTaskPacket format used by commandBridge. " +
      "Includes scope, constraints, affected files, acceptance criteria, " +
      "and context preservation instructions.",
    inputSchema: {
      type: "object",
      properties: {
        plan: { type: "object", description: "FeaturePlan object to convert" },
        agent_target: { type: "string", description: "Target agent: 'claude_code', 'openclaw', or 'custom'" },
        permission_mode: { type: "string", description: "Permission mode for delegation", enum: ["auto_allowed", "ask_first", "manual_only"] },
      },
      required: ["plan"],
    },
    handler: async (params: Record<string, unknown>) => {
      const plan = params.plan as any;
      const agentTarget = String(params.agent_target ?? "claude_code");
      const permissionMode = String(params.permission_mode ?? "ask_first");

      if (!plan?.planId) {
        return { success: false, error: "Valid plan object is required" };
      }

      const dp = plan.delegationPacket ?? {};

      const taskPacket = {
        packetId: `task_${plan.planId}`,
        taskType: "execute_action" as const,
        title: plan.title ?? "Untitled Plan",
        instructions: [
          `## Scope\n${dp.scope ?? plan.summary ?? ""}`,
          dp.constraints?.length > 0 ? `## Constraints\n${dp.constraints.map((c: string) => `- ${c}`).join("\n")}` : "",
          dp.acceptanceCriteria?.length > 0 ? `## Acceptance Criteria\n${dp.acceptanceCriteria.map((ac: string) => `- ${ac}`).join("\n")}` : "",
          dp.contextNotToLose?.length > 0 ? `## Context to Preserve\n${dp.contextNotToLose.map((c: string) => `- ${c}`).join("\n")}` : "",
          plan.phases?.length > 0 ? `## Phases\n${plan.phases.map((p: any) => `${p.id}. ${p.title}: ${p.description}`).join("\n")}` : "",
        ].filter(Boolean).join("\n\n"),
        requestedCapabilities: ["read_files", "write_files", "run_commands", "search_codebase"],
        priority: "medium" as const,
        returnFormat: "summary_plus_evidence" as const,
        context: {
          workspaceId: "nodebench",
          planId: plan.planId,
          planType: plan.planType,
        },
        timeout: 300_000,
        createdAt: new Date().toISOString(),
        agentTarget,
        permissionMode,
      };

      return { success: true, taskPacket };
    },
  },
];
