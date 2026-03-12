/**
 * DeepTrace ClawHub Skills — publishable agent trust primitives.
 *
 * Each skill is a McpTool[] array that can be registered independently
 * or bundled into the openclaw-mcp-nodebench server.
 */

export { receiptAuditSkill } from "./receiptAuditSkill.js";
export { evidencePackSkill } from "./evidencePackSkill.js";
export { delegationCheckSkill } from "./delegationCheckSkill.js";

import { receiptAuditSkill } from "./receiptAuditSkill.js";
import { evidencePackSkill } from "./evidencePackSkill.js";
import { delegationCheckSkill } from "./delegationCheckSkill.js";
import type { McpTool } from "../types.js";

/** All DeepTrace skills combined */
export const deeptraceSkills: McpTool[] = [
  ...receiptAuditSkill,
  ...evidencePackSkill,
  ...delegationCheckSkill,
];

/** Skill manifest for ClawHub publishing */
export const SKILL_MANIFEST = [
  {
    name: "deeptrace-receipt-audit",
    version: "0.1.0",
    description: "Tamper-evident action receipts — log, list, verify, and audit what agents did.",
    tools: receiptAuditSkill.map((t) => t.name),
    category: "trust",
  },
  {
    name: "deeptrace-evidence-pack",
    version: "0.1.0",
    description: "Evidence bundles with content-addressed hashing for investigation and provenance.",
    tools: evidencePackSkill.map((t) => t.name),
    category: "trust",
  },
  {
    name: "deeptrace-delegation-check",
    version: "0.1.0",
    description: "Agent passports with scoped permissions — pre-flight tool authorization checks.",
    tools: delegationCheckSkill.map((t) => t.name),
    category: "trust",
  },
] as const;
