/**
 * Subconscious MCP Tools — 10 tools for querying subconscious state + graph.
 */

import type { McpTool } from "../types.js";
import {
  getAllBlocks, getBlock, updateBlock, getStaleBlocks,
  getBlockSummary, getRecentWhispers, type BlockType, ALL_BLOCK_TYPES,
} from "./blocks.js";
import { classifyPrompt } from "./classifier.js";
import { generateWhisper, type SubconsciousMode } from "./whisperPolicy.js";
import {
  traverseGraph, findContradictions, traceLineage,
  resolveEntity, searchEntities, getGraphSummary, upsertEntity, addEdge,
  type EntityType, type RelationType,
} from "./graphEngine.js";

export const subconsciousTools: McpTool[] = [
  // ── Block Tools ────────────────────────────────────────────────────────

  {
    name: "get_company_truth",
    description:
      "Get current canonical company truth from subconscious memory blocks. " +
      "Returns all populated blocks or specific ones by ID. " +
      "Block types: founder_identity, company_identity, current_wedge, top_priorities, " +
      "open_contradictions, readiness_gaps, validated_workflows, recent_important_changes, " +
      "entity_watchlist, agent_preferences, artifact_preferences, packet_lineage.",
    inputSchema: {
      type: "object",
      properties: {
        blocks: {
          type: "array",
          items: { type: "string" },
          description: "Specific block IDs to retrieve. Omit for all blocks.",
        },
      },
    },
    handler: async (args: { blocks?: string[] }) => {
      if (args.blocks && args.blocks.length > 0) {
        const validIds = args.blocks.filter((b) =>
          ALL_BLOCK_TYPES.includes(b as BlockType)
        ) as BlockType[];
        const blocks = validIds.map(getBlock);
        return { blocks };
      }
      return { blocks: getAllBlocks().filter((b) => b.value.length > 0) };
    },
  },

  {
    name: "update_company_truth",
    description:
      "Update a subconscious memory block with new information. " +
      "Use when the user states company facts, changes direction, or corrects assumptions.",
    inputSchema: {
      type: "object",
      properties: {
        block_id: {
          type: "string",
          description: "Block ID to update (e.g. 'current_wedge', 'company_identity')",
        },
        value: { type: "string", description: "New block content (markdown)" },
        confidence: {
          type: "string",
          enum: ["high", "medium", "low"],
          description: "Confidence level. Default: medium.",
        },
      },
      required: ["block_id", "value"],
    },
    handler: async (args: { block_id: string; value: string; confidence?: string }) => {
      if (!ALL_BLOCK_TYPES.includes(args.block_id as BlockType)) {
        return { error: `Invalid block_id. Valid: ${ALL_BLOCK_TYPES.join(", ")}` };
      }
      const updated = updateBlock(args.block_id as BlockType, {
        value: args.value,
        confidence: (args.confidence as "high" | "medium" | "low") ?? "medium",
        sourceEvent: `manual_update_${Date.now()}`,
      });
      return { updated };
    },
  },

  {
    name: "get_subconscious_hint",
    description:
      "Get the subconscious's current guidance for a task. " +
      "Classifies the prompt, selects relevant memory blocks, checks for " +
      "contradictions and stale packets, and generates a whisper.",
    inputSchema: {
      type: "object",
      properties: {
        task: { type: "string", description: "Description of the current task" },
        mode: {
          type: "string",
          enum: ["whisper", "packet", "full"],
          description: "Injection verbosity. Default: whisper.",
        },
        session_id: {
          type: "string",
          description: "Session ID for dedup tracking. Default: anonymous.",
        },
      },
      required: ["task"],
    },
    handler: async (args: { task: string; mode?: string; session_id?: string }) => {
      const result = generateWhisper(
        args.task,
        args.session_id ?? "anonymous",
        (args.mode as SubconsciousMode) ?? "whisper"
      );
      return {
        classification: result.classification.classification,
        confidence: result.classification.confidence,
        entities: result.classification.entities,
        whisper: result.whisperText,
        suppressed: result.suppressed,
        suppressionReason: result.suppressionReason,
        contradictions: result.contradictions,
        stalePackets: result.stalePackets,
        blocksUsed: result.blockIdsUsed,
      };
    },
  },

  {
    name: "list_contradictions",
    description: "List all open contradictions between memory blocks and graph entities.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => {
      const block = getBlock("open_contradictions");
      return {
        blockContent: block.value || "(no contradictions recorded)",
        version: block.version,
        confidence: block.confidence,
        updatedAt: block.updatedAt,
      };
    },
  },

  {
    name: "list_stale_packets",
    description: "List memory blocks and packets that need refresh.",
    inputSchema: {
      type: "object",
      properties: {
        max_age_days: {
          type: "number",
          description: "Max age in days before a block is considered stale. Default: 7.",
        },
      },
    },
    handler: async (args: { max_age_days?: number }) => {
      const stale = getStaleBlocks(args.max_age_days ?? 7);
      return {
        staleCount: stale.length,
        staleBlocks: stale.map((b) => ({
          id: b.id,
          label: b.label,
          lastUpdated: b.updatedAt,
          version: b.version,
        })),
      };
    },
  },

  {
    name: "refresh_subconscious",
    description: "Get a summary of all subconscious memory blocks and their status.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => {
      return {
        summary: getBlockSummary(),
        staleCount: getStaleBlocks(7).length,
        totalBlocks: ALL_BLOCK_TYPES.length,
        populatedBlocks: getAllBlocks().filter((b) => b.value.length > 0).length,
      };
    },
  },

  // ── Graph Tools ────────────────────────────────────────────────────────

  {
    name: "traverse_entity_graph",
    description:
      "Find all entities and relationships connected to a starting entity within N hops. " +
      "Uses BFS traversal on the knowledge graph.",
    inputSchema: {
      type: "object",
      properties: {
        entity: { type: "string", description: "Entity name or ID to start from" },
        max_depth: {
          type: "number",
          description: "Max traversal depth (1-3). Default: 2.",
        },
        relation_filter: {
          type: "array",
          items: { type: "string" },
          description: "Filter by relation type (e.g. ['contradicts', 'supports']). Omit for all.",
        },
      },
      required: ["entity"],
    },
    handler: async (args: {
      entity: string;
      max_depth?: number;
      relation_filter?: string[];
    }) => {
      const resolved = resolveEntity(args.entity);
      if (!resolved) return { error: `Entity not found: ${args.entity}` };
      const results = traverseGraph(
        resolved.id,
        Math.min(args.max_depth ?? 2, 3),
        args.relation_filter as RelationType[] | undefined
      );
      return {
        startEntity: { id: resolved.id, label: resolved.label, kind: resolved.kind },
        connected: results.map((r) => ({
          entity: { id: r.entity.id, label: r.entity.label, kind: r.entity.kind },
          hopDistance: r.hopDistance,
          reachedVia: r.reachedVia,
          confidence: r.confidence,
          pathLength: r.path.length,
        })),
        totalResults: results.length,
      };
    },
  },

  {
    name: "find_contradictions_for",
    description: "Find all entities that contradict a given entity or concept.",
    inputSchema: {
      type: "object",
      properties: {
        entity: { type: "string", description: "Entity name or ID" },
      },
      required: ["entity"],
    },
    handler: async (args: { entity: string }) => {
      const resolved = resolveEntity(args.entity);
      if (!resolved) return { error: `Entity not found: ${args.entity}` };
      const contradictions = findContradictions(resolved.id, 2);
      return {
        entity: { id: resolved.id, label: resolved.label, kind: resolved.kind },
        contradictions: contradictions.map((c) => ({
          entity: { id: c.entity.id, label: c.entity.label, kind: c.entity.kind },
          confidence: c.confidence,
          hopDistance: c.hopDistance,
        })),
      };
    },
  },

  {
    name: "get_packet_lineage",
    description: "Trace the full derivation chain for a packet or entity.",
    inputSchema: {
      type: "object",
      properties: {
        entity: { type: "string", description: "Packet or entity name/ID" },
        max_depth: { type: "number", description: "Max chain depth. Default: 5." },
      },
      required: ["entity"],
    },
    handler: async (args: { entity: string; max_depth?: number }) => {
      const resolved = resolveEntity(args.entity);
      if (!resolved) return { error: `Entity not found: ${args.entity}` };
      const lineage = traceLineage(resolved.id, args.max_depth ?? 5);
      return {
        entity: { id: resolved.id, label: resolved.label, kind: resolved.kind },
        lineage: lineage.map((l) => ({
          entity: { id: l.entity.id, label: l.entity.label, kind: l.entity.kind },
          relation: l.reachedVia,
          hopDistance: l.hopDistance,
          confidence: l.confidence,
        })),
      };
    },
  },

  {
    name: "get_entity_graph_summary",
    description:
      "Get a summary of the knowledge graph: entity counts by type, edge counts by relation, recent additions.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => {
      return getGraphSummary();
    },
  },
];
