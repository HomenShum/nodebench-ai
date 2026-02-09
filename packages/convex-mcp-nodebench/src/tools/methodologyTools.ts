import { findToolsWithEmbedding, REGISTRY } from "./toolRegistry.js";
import { getQuickRef } from "./toolRegistry.js";
import type { McpTool } from "../types.js";

// ── Methodology Content ─────────────────────────────────────────────

const METHODOLOGY_CONTENT: Record<string, { title: string; description: string; steps: string[]; tools: string[] }> = {
  overview: {
    title: "convex-mcp-nodebench Methodology Overview",
    description: "All available methodologies for Convex development with self-instruct guidance.",
    steps: [
      "1. convex_schema_audit — Audit schema.ts for anti-patterns before any schema change",
      "2. convex_function_compliance — Ensure all functions have validators and correct registration",
      "3. convex_deploy_verification — Pre-deploy quality gate with comprehensive checks",
      "4. convex_knowledge_management — Record and search gotchas to prevent repeat mistakes",
      "5. convex_index_optimization — Analyze query patterns and suggest optimal indexes",
    ],
    tools: ["convex_discover_tools", "convex_get_methodology"],
  },
  convex_schema_audit: {
    title: "Schema Audit Methodology",
    description: "Systematically verify your Convex schema.ts for correctness, performance, and best practices.",
    steps: [
      "1. Run convex_audit_schema to scan schema.ts for anti-patterns (deprecated validators, reserved field names, missing indexes)",
      "2. Review each issue by severity: fix CRITICAL first, then WARNING, then INFO",
      "3. Run convex_suggest_indexes to find query patterns that need index support",
      "4. Add suggested indexes to schema.ts with proper naming (by_field1_and_field2)",
      "5. Run convex_check_validator_coverage to ensure all functions have arg + return validators",
      "6. Run convex_audit_schema again to verify all issues are resolved",
      "7. Run convex_pre_deploy_gate before deploying",
    ],
    tools: ["convex_audit_schema", "convex_suggest_indexes", "convex_check_validator_coverage", "convex_pre_deploy_gate"],
  },
  convex_function_compliance: {
    title: "Function Compliance Methodology",
    description: "Ensure all Convex functions follow best practices for registration, validators, and access control.",
    steps: [
      "1. Run convex_audit_functions to scan all exported functions for issues",
      "2. Fix critical issues: add missing args/returns validators, switch to new syntax",
      "3. Review public vs internal: sensitive functions (admin, delete, purge, migrate) should be internal",
      "4. Run convex_check_function_refs to validate all api.x.y and internal.x.y references",
      "5. Fix any direct function passing (use api.x.y references instead)",
      "6. Check for action-from-action anti-patterns (extract to helper functions)",
      "7. Re-run convex_audit_functions to verify compliance",
    ],
    tools: ["convex_audit_functions", "convex_check_function_refs", "convex_check_validator_coverage"],
  },
  convex_deploy_verification: {
    title: "Deploy Verification Methodology",
    description: "Comprehensive pre-deployment checklist ensuring your Convex project is ready to ship.",
    steps: [
      "1. Run convex_audit_schema — fix all critical schema issues",
      "2. Run convex_audit_functions — fix all critical function issues",
      "3. Run convex_check_env_vars — ensure all required env vars are set",
      "4. Run convex_pre_deploy_gate — this runs the full gate check",
      "5. Fix all blockers reported by the gate",
      "6. Run npx convex deploy only after the gate passes",
      "7. Record any new gotchas discovered during deploy with convex_record_gotcha",
    ],
    tools: ["convex_audit_schema", "convex_audit_functions", "convex_check_env_vars", "convex_pre_deploy_gate", "convex_record_gotcha"],
  },
  convex_knowledge_management: {
    title: "Knowledge Management Methodology",
    description: "Build and leverage a persistent knowledge base of Convex gotchas, edge cases, and patterns.",
    steps: [
      "1. BEFORE implementing: run convex_search_gotchas with your task description",
      "2. Apply any relevant gotchas to your implementation plan",
      "3. During development: if you hit a non-obvious issue, record it with convex_record_gotcha",
      "4. After fixing bugs: record the root cause and fix as a gotcha",
      "5. Categories: validator, schema, function, deployment, auth, performance, general",
      "6. Use severity levels: critical (will break), warning (may cause issues), info (best practice)",
    ],
    tools: ["convex_search_gotchas", "convex_record_gotcha"],
  },
  convex_index_optimization: {
    title: "Index Optimization Methodology",
    description: "Optimize query performance by analyzing access patterns and adding appropriate indexes.",
    steps: [
      "1. Run convex_suggest_indexes to scan all query patterns",
      "2. Review each suggestion: does the query pattern warrant an index?",
      "3. For composite queries, ensure index field order matches query filter order",
      "4. Add indexes to schema.ts following naming convention: by_field1_and_field2",
      "5. Remember: index fields must be queried in the SAME ORDER they are defined",
      "6. If you need different query orders, create separate indexes",
      "7. Run convex_audit_schema to verify index naming conventions",
    ],
    tools: ["convex_suggest_indexes", "convex_audit_schema"],
  },
};

// ── Tool Definitions ────────────────────────────────────────────────

export const methodologyTools: McpTool[] = [
  {
    name: "convex_get_methodology",
    description:
      "Get step-by-step guidance for Convex development workflows. Topics: overview, convex_schema_audit, convex_function_compliance, convex_deploy_verification, convex_knowledge_management, convex_index_optimization. Call with 'overview' to see all available methodologies.",
    inputSchema: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          enum: [
            "overview",
            "convex_schema_audit",
            "convex_function_compliance",
            "convex_deploy_verification",
            "convex_knowledge_management",
            "convex_index_optimization",
          ],
          description: "Which methodology to explain",
        },
      },
      required: ["topic"],
    },
    handler: async (args: { topic: string }) => {
      const content = METHODOLOGY_CONTENT[args.topic];
      if (!content) {
        return {
          error: `Unknown topic: ${args.topic}`,
          availableTopics: Object.keys(METHODOLOGY_CONTENT),
        };
      }
      return {
        ...content,
        quickRef: getQuickRef("convex_get_methodology"),
      };
    },
  },
  {
    name: "convex_discover_tools",
    description:
      "Search for available convex-mcp-nodebench tools by keyword, category, or task description. Returns matching tools with descriptions and quickRefs to guide your next action.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "What you want to do (e.g., 'check schema', 'deploy', 'find gotchas', 'audit functions')",
        },
        category: {
          type: "string",
          enum: ["schema", "function", "deployment", "learning", "methodology", "integration"],
          description: "Optional: filter by tool category",
        },
      },
      required: ["query"],
    },
    handler: async (args: { query: string; category?: string }) => {
      let results = await findToolsWithEmbedding(args.query);

      if (args.category) {
        results = results.filter((r) => r.category === args.category);
      }

      return {
        totalTools: REGISTRY.length,
        matchingTools: results.length,
        tools: results.map((r) => ({
          name: r.name,
          category: r.category,
          phase: r.phase,
          complexity: r.complexity,
          tags: r.tags,
          quickRef: r.quickRef,
        })),
        quickRef: getQuickRef("convex_discover_tools"),
      };
    },
  },
];
