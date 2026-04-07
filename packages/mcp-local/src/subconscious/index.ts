/**
 * NodeBench Subconscious — background intelligence agent.
 *
 * Watches founder/coding sessions, maintains company truth memory blocks,
 * builds a knowledge graph of entities + relationships, and whispers
 * packet-aware guidance back into Claude Code and NodeBench surfaces.
 *
 * Architecture:
 * - 12 typed memory blocks (blocks.ts)
 * - Prompt classifier (classifier.ts)
 * - Knowledge graph on existing object_nodes + object_edges (graphEngine.ts)
 * - Whisper policy with suppression rules (whisperPolicy.ts)
 * - 10 MCP tools (tools.ts)
 */

export { subconsciousTools } from "./tools.js";

export {
  type BlockType,
  type SubconsciousBlock,
  ALL_BLOCK_TYPES,
  getBlock,
  getAllBlocks,
  updateBlock,
  getStaleBlocks,
  getBlockSummary,
  ensureBlocksExist,
} from "./blocks.js";

export {
  type PromptClassification,
  type ClassificationResult,
  classifyPrompt,
  extractEntities,
  isTrivialPrompt,
} from "./classifier.js";

export {
  type EntityType,
  type RelationType,
  type GraphEntity,
  type GraphEdge,
  type TraversalResult,
  upsertEntity,
  findEntity,
  searchEntities,
  resolveEntity,
  addEdge,
  traverseGraph,
  findContradictions,
  traceLineage,
  getGraphSummary,
} from "./graphEngine.js";

export {
  type SubconsciousMode,
  type WhisperResult,
  generateWhisper,
} from "./whisperPolicy.js";
