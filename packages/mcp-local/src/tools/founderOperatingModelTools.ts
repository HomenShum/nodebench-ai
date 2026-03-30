import type { McpTool } from "../types.js";
import {
  buildFounderOperatingModel,
  detectFounderCompanyMode,
  getFounderBenchmarkOracles,
  getFounderExecutionOrder,
  getFounderProgressionRubric,
  getFounderQueueTopology,
  getFounderRolePacketDefault,
  getFounderSourcePolicies,
  routeFounderPacket,
  type FounderOperatingRole,
} from "./founderOperatingModel.js";

function normalizeRole(value?: string): FounderOperatingRole {
  switch ((value ?? "founder").toLowerCase()) {
    case "banker":
      return "banker";
    case "ceo":
      return "ceo";
    case "investor":
      return "investor";
    case "student":
      return "student";
    case "legal":
      return "legal";
    default:
      return "founder";
  }
}

export const founderOperatingModelTools: McpTool[] = [
  {
    name: "route_founder_packet",
    description: "Route a founder/company request into the canonical company mode, packet type, artifact type, and next action policy.",
    inputSchema: {
      type: "object",
      properties: {
        role: { type: "string" },
        query: { type: "string" },
        canonicalEntity: { type: "string" },
        hasPrivateContext: { type: "boolean" },
        readinessScore: { type: "number" },
        hiddenRiskCount: { type: "number" },
        visibility: { type: "string", enum: ["internal", "workspace", "public"] },
        hasShareableArtifact: { type: "boolean" },
        hasBenchmarkProof: { type: "boolean" },
        vertical: { type: "string" },
      },
      required: ["query"],
    },
    annotations: { readOnlyHint: true },
    handler: async (rawArgs) => {
      const args = rawArgs as Record<string, unknown>;
      const role = normalizeRole(typeof args.role === "string" ? args.role : undefined);
      const companyMode = detectFounderCompanyMode({
        query: String(args.query ?? ""),
        canonicalEntity: typeof args.canonicalEntity === "string" ? args.canonicalEntity : undefined,
        hasPrivateContext: Boolean(args.hasPrivateContext),
      });
      return routeFounderPacket({
        role,
        companyMode,
        readinessScore: typeof args.readinessScore === "number" ? args.readinessScore : 50,
        hiddenRiskCount: typeof args.hiddenRiskCount === "number" ? args.hiddenRiskCount : 0,
        visibility: (typeof args.visibility === "string" ? args.visibility : "workspace") as "internal" | "workspace" | "public",
        hasShareableArtifact: Boolean(args.hasShareableArtifact),
        hasBenchmarkProof: Boolean(args.hasBenchmarkProof),
        vertical: typeof args.vertical === "string" ? args.vertical : "AI/software",
      });
    },
  },
  {
    name: "get_founder_execution_order",
    description: "Return the canonical founder/company packet execution order so all surfaces follow the same run sequence.",
    inputSchema: { type: "object", properties: {} },
    annotations: { readOnlyHint: true },
    handler: async () => ({ executionOrder: getFounderExecutionOrder() }),
  },
  {
    name: "get_founder_job_topology",
    description: "Return the queue and job topology for founder ingestion, sweeps, deltas, packet refresh, exports, delegation, and benchmarks.",
    inputSchema: { type: "object", properties: {} },
    annotations: { readOnlyHint: true },
    handler: async () => ({ queueTopology: getFounderQueueTopology() }),
  },
  {
    name: "get_source_trust_policy",
    description: "Return the source-level permission and trust policy for storage, summarization, and export across private and public source types.",
    inputSchema: { type: "object", properties: {} },
    annotations: { readOnlyHint: true },
    handler: async () => ({ sourcePolicies: getFounderSourcePolicies() }),
  },
  {
    name: "get_role_packet_defaults",
    description: "Return the default packet, artifact, monitor, and delegation policy for a specific public role lens.",
    inputSchema: {
      type: "object",
      properties: {
        role: { type: "string" },
      },
    },
    annotations: { readOnlyHint: true },
    handler: async (rawArgs) => {
      const args = rawArgs as { role?: string };
      return getFounderRolePacketDefault(normalizeRole(args.role));
    },
  },
  {
    name: "detect_company_mode",
    description: "Classify a request as own-company, external-company, or mixed-comparison mode before packet routing.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        canonicalEntity: { type: "string" },
        hasPrivateContext: { type: "boolean" },
      },
      required: ["query"],
    },
    annotations: { readOnlyHint: true },
    handler: async (rawArgs) => detectFounderCompanyMode(rawArgs as any),
  },
  {
    name: "get_founder_progression_rubric",
    description: "Return the explicit founder progression rubric, including mandatory and optional signals for each stage.",
    inputSchema: { type: "object", properties: {} },
    annotations: { readOnlyHint: true },
    handler: async () => ({ rubric: getFounderProgressionRubric() }),
  },
  {
    name: "get_benchmark_oracles",
    description: "Return the oracle definitions for founder autonomy and workflow optimization benchmark lanes.",
    inputSchema: { type: "object", properties: {} },
    annotations: { readOnlyHint: true },
    handler: async () => ({ benchmarkOracles: getFounderBenchmarkOracles() }),
  },
  {
    name: "build_founder_operating_model",
    description: "Build the complete founder operating model: execution order, queue topology, packet routing, source trust policy, progression rubric, and benchmark oracles.",
    inputSchema: {
      type: "object",
      properties: {
        role: { type: "string" },
        query: { type: "string" },
        canonicalEntity: { type: "string" },
        hasPrivateContext: { type: "boolean" },
        readinessScore: { type: "number" },
        hiddenRiskCount: { type: "number" },
        visibility: { type: "string", enum: ["internal", "workspace", "public"] },
        hasShareableArtifact: { type: "boolean" },
        hasBenchmarkProof: { type: "boolean" },
        hasDelegatedTask: { type: "boolean" },
        hasDiligencePack: { type: "boolean" },
        hasAmbientMonitoring: { type: "boolean" },
        hasRepeatedReuse: { type: "boolean" },
        vertical: { type: "string" },
      },
      required: ["query"],
    },
    annotations: { readOnlyHint: true },
    handler: async (rawArgs) => {
      const args = rawArgs as Record<string, unknown>;
      return buildFounderOperatingModel({
        role: normalizeRole(typeof args.role === "string" ? args.role : undefined),
        query: String(args.query ?? ""),
        canonicalEntity: typeof args.canonicalEntity === "string" ? args.canonicalEntity : undefined,
        hasPrivateContext: Boolean(args.hasPrivateContext),
        readinessScore: typeof args.readinessScore === "number" ? args.readinessScore : 50,
        hiddenRiskCount: typeof args.hiddenRiskCount === "number" ? args.hiddenRiskCount : 0,
        visibility: (typeof args.visibility === "string" ? args.visibility : "workspace") as "internal" | "workspace" | "public",
        hasShareableArtifact: Boolean(args.hasShareableArtifact),
        hasBenchmarkProof: Boolean(args.hasBenchmarkProof),
        hasDelegatedTask: Boolean(args.hasDelegatedTask),
        hasDiligencePack: Boolean(args.hasDiligencePack),
        hasAmbientMonitoring: Boolean(args.hasAmbientMonitoring),
        hasRepeatedReuse: Boolean(args.hasRepeatedReuse),
        vertical: typeof args.vertical === "string" ? args.vertical : "AI/software",
      });
    },
  },
];
