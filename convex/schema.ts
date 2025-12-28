// convex/schema.ts --------------------------------------------------------
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

// Domain schema imports
import {
  dossierFocusState,
  dossierAnnotations,
  dossierEnrichment,
} from "./domains/dossier/schema";

/* ------------------------------------------------------------------ */
/* 1.  DOCUMENTS  –  page/board/post level metadata                    */
/* ------------------------------------------------------------------ */
const documents = defineTable({
  title: v.string(),
  parentId: v.optional(v.id("documents")),  // hierarchy
  isPublic: v.boolean(),
  // When true, public viewers may also edit (used by ProseMirror + UI to toggle read-only)
  allowPublicEdit: v.optional(v.boolean()),
  createdBy: v.id("users"),
  lastEditedBy: v.optional(v.id("users")),    // who last edited this document
  coverImage: v.optional(v.id("_storage")),
  // LEGACY: holds ProseMirror JSON blob; retained temporarily for migration
  content: v.optional(v.string()),
  summary: v.optional(v.string()),

  icon: v.optional(v.string()),
  isArchived: v.optional(v.boolean()),
  isFavorite: v.optional(v.boolean()),
  publishedAt: v.optional(v.number()),        // ms since epoch
  /** points at the top GraphNode that owns the editor view */
  rootNodeId: v.optional(v.id("nodes")),
  lastModified: v.optional(v.number()),       // ms since epoch - when document was last updated
  // Optional: associate a document with a calendar day (local midnight ms)
  agendaDate: v.optional(v.number()),
  // Rolling count of snapshots for this document (maintained on insert/delete)
  snapshotCount: v.optional(v.number()),

  // Lazy indexing marker for RAG
  ragIndexedAt: v.optional(v.number()),
  // Gemini File Search indexing marker
  fileSearchIndexedAt: v.optional(v.number()),

  // FILE & SPECIAL DOCUMENT SUPPORT
  documentType: v.optional(
    v.union(
      v.literal("text"),
      v.literal("file"),
      v.literal("timeline"),
      v.literal("dossier")
    )
  ), // "text" (default) | "file" | "timeline" | "dossier"
  fileId: v.optional(v.id("files")),     // reference to files table for file documents
  fileType: v.optional(v.string()),        // "csv", "pdf", "image", etc. for file documents
  mimeType: v.optional(v.string()),        // MIME type for file documents

  // RESEARCH DOSSIER SUPPORT
  dossierType: v.optional(
    v.union(
      v.literal("primary"),      // The main chat transcript/dossier
      v.literal("media-asset"),  // Linked media (video/image/document)
      v.literal("quick-notes")   // Quick notes linked to a dossier
    )
  ),
  parentDossierId: v.optional(v.id("documents")),  // Links media assets to primary dossier
  chatThreadId: v.optional(v.string()),         // Source chat thread (Agent component uses string IDs)
  assetMetadata: v.optional(v.object({
    assetType: v.union(
      v.literal("image"),
      v.literal("video"),
      v.literal("youtube"),
      v.literal("sec-document"),
      v.literal("pdf"),
      v.literal("news"),
      v.literal("file")
    ),
    sourceUrl: v.string(),                     // Original URL of the asset
    thumbnailUrl: v.optional(v.string()),         // Thumbnail/preview URL
    extractedAt: v.number(),                     // Timestamp when found in chat
    toolName: v.optional(v.string()),         // Which tool found this asset
    metadata: v.optional(v.any()),            // Additional metadata (title, description, etc.)
  })),
  // Idempotency key for creation (threadId + title + content hash)
  creationKey: v.optional(v.string()),

  // ═══════════════════════════════════════════════════════════════════
  // GAM: THEME MEMORY (for hashtag dossiers)
  // ═══════════════════════════════════════════════════════════════════
  themeMemory: v.optional(v.object({
    topicId: v.string(),               // e.g., "theme:agent-memory"
    summary: v.string(),
    keyFacts: v.array(v.object({
      id: v.string(),
      text: v.string(),
      isHighConfidence: v.boolean(),   // Boolean: passes threshold or not
      sourceDocIds: v.array(v.string()),
    })),
    narratives: v.array(v.object({
      label: v.string(),
      description: v.string(),
      supportingDocIds: v.array(v.string()),
    })),
    heuristics: v.array(v.string()),
    lastRefreshed: v.number(),
    // Boolean quality flags (not arbitrary scores)
    quality: v.object({
      hasSufficientFacts: v.boolean(),
      hasRecentResearch: v.boolean(),
      hasVerifiedSources: v.boolean(),
    }),
    staleDays: v.number(),             // Default: 30 days
    researchDepth: v.union(
      v.literal("shallow"),
      v.literal("standard"),
      v.literal("deep")
    ),
  })),

})
  .index("by_user", ["createdBy"])
  .index("by_user_archived", ["createdBy", "isArchived"])
  .index("by_parent", ["parentId"])
  .index("by_public", ["isPublic"])
  // For calendar integration: query notes by day per-user
  .index("by_user_agendaDate", ["createdBy", "agendaDate"])
  // Fast idempotency lookup
  .index("by_creation_key", ["creationKey"])
  // For dossier pattern: query linked assets by parent dossier
  .index("by_parent_dossier", ["parentDossierId"])
  // For dossier pattern: query all documents from a chat thread
  .index("by_chat_thread", ["chatThreadId"])

  .searchIndex("search_title", {
    searchField: "title",
    filterFields: ["isPublic", "createdBy", "isArchived"],
  });

/* ------------------------------------------------------------------ */
/* 2.  NODES  –  one row per ProseMirror block (GraphNode)             */
/* ------------------------------------------------------------------ */
const nodes = defineTable({
  documentId: v.id("documents"),           // which doc/board it belongs to
  parentId: v.optional(v.id("nodes")),   // null ⇒ root
  order: v.number(),                  // sibling ordering
  type: v.string(),                  // "paragraph" | "heading" | …
  text: v.optional(v.string()),      // plain text (for search)
  json: v.optional(v.any()),         // full PM node as JSON
  authorId: v.id("users"),               // who created this node
  lastEditedBy: v.optional(v.id("users")),   // who last edited this node
  createdAt: v.number(),
  updatedAt: v.number(),
  isUserNode: v.optional(v.boolean()),     // flags for mention logic
})
  .index("by_document", ["documentId", "order"])
  .index("by_parent", ["parentId", "order"])
  .index("by_updated", ["updatedAt"])
  .searchIndex("search_text", {
    searchField: "text",
    filterFields: ["documentId", "authorId"],
  });

/* ------------------------------------------------------------------ */
/* 3.  RELATIONS  –  arbitrary graph edges (“child”, “relatedTo”… )    */
/* ------------------------------------------------------------------ */
const relations = defineTable({
  from: v.id("nodes"),
  to: v.id("nodes"),
  relationTypeId: v.string(),                 // store the string id, faster than join
  order: v.optional(v.number()),     // for ordered children
  createdBy: v.id("users"),
  createdAt: v.number(),
})
  .index("by_from", ["from"])
  .index("by_to", ["to"])
  .index("by_type", ["relationTypeId"]);

/* ------------------------------------------------------------------ */
/* 4.  RELATION TYPES  –  mostly static, but editable in UI            */
/* ------------------------------------------------------------------ */
const relationTypes = defineTable({
  id: v.string(),                           // "child", "relatedTo", "hashtag"…
  name: v.string(),
  icon: v.optional(v.string()),
})
  // Quick look-up by primary string id (e.g. "child")
  .index("by_relationId", ["id"]);

/* ------------------------------------------------------------------ */
/* 5.  TAGS  –  domain/entity/topic keywords                           */
/* ------------------------------------------------------------------ */
export const tags = defineTable({
  name: v.string(),                 // canonical tag text (lower-cased)
  kind: v.optional(v.string()),     // "domain" | "entity" | "topic" etc
  importance: v.optional(v.float64()),    // 0–1 weighting when ranking context
  createdBy: v.id("users"),
  createdAt: v.number(),
})
  .index("by_name", ["name"])
  .index("by_kind", ["kind"])
  .searchIndex("search_name", {
    searchField: "name",
    filterFields: ["kind"],
  });

/* ------------------------------------------------------------------ */
/* 6.  TAG REFERENCES  –  many-to-many tag ↔ page/node                 */
/* ------------------------------------------------------------------ */
export const tagRefs = defineTable({
  tagId: v.id("tags"),
  targetId: v.string(),                 // generic Id in string form
  targetType: v.string(),                 // "documents" | "nodes"
  createdBy: v.id("users"),
  createdAt: v.number(),
})
  .index("by_tag", ["tagId"])
  .index("by_target", ["targetId", "targetType"]);

/* ------------------------------------------------------------------ */
/* 7.  SMS LOGS                                                        */
/* ------------------------------------------------------------------ */
export const smsLogs = defineTable({
  to: v.string(),
  body: v.string(),
  status: v.string(),       // "sent" | "failed" | "delivered" | "undelivered"
  createdAt: v.number(),
  // Enhanced tracking for cost analytics
  userId: v.optional(v.id("users")),
  messageSid: v.optional(v.string()),  // Twilio message SID
  eventType: v.optional(v.string()),   // "meeting_created" | "meeting_reminder" | "morning_digest"
  eventId: v.optional(v.id("events")),
  segments: v.optional(v.number()),    // Number of SMS segments (160 chars = 1 segment)
  estimatedCostCents: v.optional(v.number()), // Estimated cost in cents
})
  .index("by_to", ["to"])
  .index("by_user", ["userId"])
  .index("by_user_date", ["userId", "createdAt"])
  .index("by_status", ["status"]);

/* ------------------------------------------------------------------ */
/* 7a. SMS USAGE DAILY - Aggregated usage per user per day            */
/* ------------------------------------------------------------------ */
export const smsUsageDaily = defineTable({
  userId: v.id("users"),
  date: v.string(),                    // YYYY-MM-DD
  totalMessages: v.number(),
  successfulMessages: v.number(),
  failedMessages: v.number(),
  totalSegments: v.number(),
  estimatedCostCents: v.number(),      // Total estimated cost in cents
  // Breakdown by event type
  meetingCreatedCount: v.optional(v.number()),
  meetingReminderCount: v.optional(v.number()),
  morningDigestCount: v.optional(v.number()),
})
  .index("by_user", ["userId"])
  .index("by_user_date", ["userId", "date"])
  .index("by_date", ["date"]);

/* ------------------------------------------------------------------ */
/* 8.  VECTOR CACHE  (optional)                                        */
/* ------------------------------------------------------------------ */
// If you want to persist your `SimpleVectorStore` so the index survives reloads
// keep a compact cache here; leave it out if you’re only embedding client-side.
const embeddings = defineTable({
  chunkHash: v.string(),               // sha256(text)
  vector: v.array(v.float64()),     // normalised
});

/* ------------------------------------------------------------------ */
/* 6.  Bring it all together                                           */
/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/* 9.  GRID PROJECTS  –  saved multi-document grid configurations     */
/* ------------------------------------------------------------------ */
const gridProjects = defineTable({
  name: v.string(),                    // user-defined name for the grid project
  description: v.optional(v.string()),       // optional description
  createdBy: v.id("users"),               // owner of the grid project
  documentIds: v.array(v.id("documents")),   // array of document IDs in the grid
  layout: v.object({                    // grid layout configuration
    cols: v.number(),
    rows: v.number(),
    gridClass: v.string(),
    name: v.string(),
  }),
  createdAt: v.number(),                   // ms since epoch
  updatedAt: v.number(),                   // ms since epoch
  isArchived: v.optional(v.boolean()),      // soft delete
})
  .index("by_user", ["createdBy"])
  .index("by_user_archived", ["createdBy", "isArchived"]);

/* ------------------------------------------------------------------ */
/* 7.  FILES  –  uploaded files for analysis                           */
/* ------------------------------------------------------------------ */
const files = defineTable({
  userId: v.string(),                     // user ID from auth
  storageId: v.string(),                     // Convex storage ID
  fileName: v.string(),                     // original filename
  fileType: v.string(),                     // "video", "image", "audio", "document"
  mimeType: v.string(),                     // MIME type
  fileSize: v.number(),                     // file size in bytes

  // Analysis results
  analysis: v.optional(v.string()),      // analysis text result
  structuredData: v.optional(v.any()),         // structured analysis data
  analysisType: v.optional(v.string()),      // type of analysis performed
  processingTime: v.optional(v.number()),      // time taken for analysis in ms
  analyzedAt: v.optional(v.number()),      // ms since epoch when analyzed

  // Metadata
  isPublic: v.optional(v.boolean()),       // whether file is publicly accessible
  tags: v.optional(v.array(v.string())), // user-defined tags
  description: v.optional(v.string()),        // user description

  // Modification tracking for CSV editing
  lastModified: v.optional(v.number()),    // ms since epoch when last modified
  modificationCount: v.optional(v.number()),   // number of times file has been modified
  parentFileId: v.optional(v.id("files")), // reference to original file if this is a copy/export

  // GenAI cache & extracted metadata (optional)
  genaiFileName: v.optional(v.string()),
  genaiFileUri: v.optional(v.string()),
  cacheName: v.optional(v.string()),
  cacheExpiresAt: v.optional(v.number()),
  metadata: v.optional(v.any()),
  contentSummary: v.optional(v.string()),
  textPreview: v.optional(v.string()),
})
  .index("by_user", ["userId"])
  .index("by_user_and_type", ["userId", "fileType"])
  .searchIndex("search_files", {
    searchField: "fileName",
    filterFields: ["userId", "fileType"],
  });

/* ------------------------------------------------------------------ */
/* 8.  URL ANALYSES  –  URL content analysis results                   */
/* ------------------------------------------------------------------ */
const urlAnalyses = defineTable({
  userId: v.string(),                     // user ID from auth
  url: v.string(),                     // analyzed URL
  analysis: v.optional(v.string()),        // analysis text result
  structuredData: v.optional(v.any()),         // structured analysis data
  analyzedAt: v.number(),                     // ms since epoch when analyzed
  contentType: v.optional(v.string()),        // detected content type
})
  .index("by_user", ["userId"])
  .index("by_url", ["url"]);

/* ------------------------------------------------------------------ */
/* 8b. FILE CHUNKS  –  extracted chunks + embeddings per file          */
/* ------------------------------------------------------------------ */
const chunks = defineTable({
  fileId: v.id("files"),
  text: v.string(),
  meta: v.optional(v.any()), // { page?, startTimeSec?, endTimeSec? }
  embedding: v.array(v.number()),
})
  .index("by_file", ["fileId"]);

/* ------------------------------------------------------------------ */
/* FOLDERS - Document organization system                              */
/* ------------------------------------------------------------------ */
const folders = defineTable({
  name: v.string(),
  color: v.string(),                    // CSS color class for folder display
  userId: v.id("users"),               // folder owner
  isExpanded: v.optional(v.boolean()),  // UI state for expand/collapse
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_user_name", ["userId", "name"]);

/* Document-to-Folder relationships */
const documentFolders = defineTable({
  documentId: v.id("documents"),
  folderId: v.id("folders"),
  userId: v.id("users"),               // for access control
  addedAt: v.number(),                  // when document was added to folder
})
  .index("by_document", ["documentId"])
  .index("by_folder", ["folderId"])
  .index("by_user", ["userId"])
  .index("by_document_folder", ["documentId", "folderId"]);

/* ------------------------------------------------------------------ */
/* GEMINI FILE SEARCH STORES                                          */
/* ------------------------------------------------------------------ */
const fileSearchStores = defineTable({
  userId: v.id("users"),
  storeName: v.string(),                   // full resource name from Gemini
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"]);

/* ------------------------------------------------------------------ */
/* MCP SERVERS - Model Context Protocol server configurations         */
/* ------------------------------------------------------------------ */
const mcpServers = defineTable({
  name: v.string(),                        // user-friendly name
  url: v.optional(v.string()),            // URL for HTTP tool calls
  apiKey: v.optional(v.string()),         // encrypted API key if needed
  userId: v.id("users"),                 // server owner
  createdAt: v.number(),
  updatedAt: v.number(),
  // Additional fields found in existing data
  connectionStatus: v.optional(v.string()), // "connected", "error", "disconnected"
  description: v.optional(v.string()),      // server description
  isEnabled: v.optional(v.boolean()),       // whether server is enabled
  lastConnected: v.optional(v.number()),    // timestamp of last connection
  transport: v.optional(v.string()),        // transport type ("sse", "http", etc.)
})
  .index("by_user", ["userId"])
  .index("by_name", ["name"])
  .index("by_user_name", ["userId", "name"]);

const mcpPlans = defineTable({
  planId: v.string(),
  goal: v.string(),
  steps: v.any(),
  createdAt: v.number(),
  updatedAt: v.number(),
}).index("by_planId", ["planId"]);

const mcpMemoryEntries = defineTable({
  key: v.string(),
  content: v.string(),
  metadata: v.optional(v.any()),
  createdAt: v.number(),
  updatedAt: v.number(),
}).index("by_key", ["key"]);

/* ------------------------------------------------------------------ */
/* AGENT RUNS - streaming progress for AI chat                        */
/* ------------------------------------------------------------------ */
const agentRuns = defineTable({
  userId: v.id("users"),
  threadId: v.optional(v.string()),
  documentId: v.optional(v.id("documents")),
  mcpServerId: v.optional(v.id("mcpServers")),
  model: v.optional(v.string()),
  openaiVariant: v.optional(v.string()),
  status: v.union(
    v.literal("pending"),
    v.literal("running"),
    v.literal("completed"),
    v.literal("error"),
  ),
  intent: v.optional(v.string()),
  planExplain: v.optional(v.string()),
  plan: v.optional(v.any()),
  finalResponse: v.optional(v.string()),
  errorMessage: v.optional(v.string()),
  nextSeq: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_thread", ["threadId"])
  .index("by_createdAt", ["createdAt"])
  .index("by_user_createdAt", ["userId", "createdAt"]);

const agentRunEvents = defineTable({
  runId: v.id("agentRuns"),
  seq: v.number(), // monotonically increasing per run
  kind: v.string(), // "thinking" | "plan" | "intent" | "group.start" | "step.start" | ...
  message: v.optional(v.string()),
  data: v.optional(v.any()),
  createdAt: v.number(),
})
  .index("by_run", ["runId", "seq"]);

/* ------------------------------------------------------------------ */
/* AGENT DELEGATIONS - Tracking parallel subagent execution           */
/* ------------------------------------------------------------------ */
const agentDelegations = defineTable({
  // Identity & isolation
  runId: v.string(),                      // coordinatorThreadId (for UI scoping)
  delegationId: v.string(),               // UUID, stable ID for this delegation
  userId: v.id("users"),                  // Multi-user isolation
  
  // Agent info
  agentName: v.union(
    v.literal("DocumentAgent"),
    v.literal("MediaAgent"),
    v.literal("SECAgent"),
    v.literal("OpenBBAgent"),
    v.literal("EntityResearchAgent"),
  ),
  query: v.string(),                      // Original task description
  
  // Lifecycle
  status: v.union(
    v.literal("scheduled"),               // Scheduler accepted
    v.literal("running"),                 // generateText started
    v.literal("completed"),               // Finished successfully
    v.literal("failed"),                  // Error
    v.literal("cancelled"),               // User cancelled
  ),
  
  // Timing
  scheduledAt: v.number(),
  startedAt: v.optional(v.number()),
  finishedAt: v.optional(v.number()),
  
  // Results (refs, not inline - avoids OCC on streaming)
  subagentThreadId: v.optional(v.string()),
  finalPatchRef: v.optional(v.string()),  // Pointer to patch document
  errorMessage: v.optional(v.string()),
  
  // Merge tracking
  mergeStatus: v.optional(v.union(
    v.literal("pending"),
    v.literal("merged"),
    v.literal("rejected"),
  )),
})
  .index("by_run", ["runId"])
  .index("by_run_status", ["runId", "status"])
  .index("by_user_run", ["userId", "runId"])
  .index("by_delegation", ["delegationId"]);

/* ------------------------------------------------------------------ */
/* AGENT WRITE EVENTS - Append-only streaming chunks (OCC-safe)       */
/* Mirrors agentRunEvents pattern: seq owned by action, not mutated   */
/* ------------------------------------------------------------------ */
const agentWriteEvents = defineTable({
  delegationId: v.string(),               // FK to agentDelegations
  seq: v.number(),                        // Monotonic per delegation (action-owned)
  kind: v.union(
    v.literal("delta"),                   // Streaming text chunk
    v.literal("tool_start"),              // Tool invocation started
    v.literal("tool_end"),                // Tool completed
    v.literal("note"),                    // Status update
    v.literal("final"),                   // Final output chunk
  ),
  textChunk: v.optional(v.string()),      // For delta/final
  toolName: v.optional(v.string()),       // For tool_start/tool_end
  metadata: v.optional(v.any()),          // Extra data (citations, artifactIds)
  createdAt: v.number(),
})
  .index("by_delegation", ["delegationId", "seq"]);  // Compound for range queries

/* ------------------------------------------------------------------ */
/* CHAT - Now using @convex-dev/agent component                       */
/* Legacy chatThreads and chatMessages tables removed                 */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* STREAMING CHAT - Persistent Text Streaming for FastAgentPanel     */
/* ------------------------------------------------------------------ */
const chatThreadsStream = defineTable({
  userId: v.id("users"),
  title: v.string(),
  model: v.optional(v.string()),
  agentThreadId: v.optional(v.string()), // Links to agent component thread for memory management
  pinned: v.optional(v.boolean()),
  cancelRequested: v.optional(v.boolean()),
  cancelRequestedAt: v.optional(v.number()),
  workflowProgress: v.optional(v.any()), // Stores Deep Agent steps: { steps: [...], status: "running"|"completed" }
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_user_pinned", ["userId", "pinned"])
  .index("by_updatedAt", ["updatedAt"])
  .index("by_user_updatedAt", ["userId", "updatedAt"])
  .index("by_agentThreadId", ["agentThreadId"]);

const chatMessagesStream = defineTable({
  threadId: v.id("chatThreadsStream"),
  userId: v.id("users"),
  role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
  content: v.string(),
  streamId: v.optional(v.string()), // For persistent-text-streaming (legacy)
  agentMessageId: v.optional(v.string()), // Links to agent component message for stream deltas
  status: v.union(
    v.literal("pending"),
    v.literal("streaming"),
    v.literal("complete"),
    v.literal("error")
  ),
  model: v.optional(v.string()),
  tokensUsed: v.optional(v.object({
    input: v.number(),
    output: v.number(),
  })),
  elapsedMs: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_thread", ["threadId", "createdAt"])
  .index("by_streamId", ["streamId"])
  .index("by_agentMessageId", ["agentMessageId"])
  .index("by_user", ["userId"]);

/* ------------------------------------------------------------------ */
/* SEARCH CACHE - Global search result caching with versioning       */
/* ------------------------------------------------------------------ */
const searchCache = defineTable({
  prompt: v.string(),                      // Normalized search query (lowercase, trimmed)
  threadId: v.string(),                    // Current/latest thread ID with full content
  lastUpdated: v.number(),                 // Timestamp of last update
  searchCount: v.number(),                 // Popularity metric (how many times searched)
  versions: v.array(v.object({             // History of updates
    date: v.string(),                      // YYYY-MM-DD when this version was created
    threadId: v.string(),                  // Thread ID for this version
    summary: v.string(),                   // What changed in this update
    timestamp: v.number()                  // When this version was created
  })),
  isPublic: v.boolean(),                   // Whether this cache entry is publicly visible
  createdAt: v.number(),                   // Initial creation timestamp
})
  .index("by_prompt", ["prompt"])          // Fast lookup by query
  .index("by_popularity", ["searchCount"]) // For trending queries
  .index("by_updated", ["lastUpdated"])    // Recent updates
  .index("by_public", ["isPublic", "searchCount"]); // Public trending queries

/* ------------------------------------------------------------------ */
/* MCP TOOLS - Available tools from connected MCP servers             */
/* ------------------------------------------------------------------ */
const mcpTools = defineTable({
  serverId: v.id("mcpServers"),           // which server provides this tool
  name: v.string(),                       // tool name
  description: v.optional(v.string()),    // tool description
  schema: v.optional(v.any()),            // tool parameter schema
  isAvailable: v.boolean(),               // whether tool is currently available
  isEnabled: v.optional(v.boolean()),     // whether tool is enabled for use (user-controlled)
  lastUsed: v.optional(v.number()),       // last time tool was used
  usageCount: v.optional(v.number()),     // how many times tool has been used
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_server", ["serverId"])
  .index("by_server_available", ["serverId", "isAvailable"])
  .index("by_name", ["name"])
  .index("by_server_name", ["serverId", "name"]);

/* ------------------------------------------------------------------ */
/* MCP SESSIONS - Active MCP client sessions                          */
/* ------------------------------------------------------------------ */
const mcpSessions = defineTable({
  serverId: v.id("mcpServers"),           // which server this session connects to
  userId: v.id("users"),                 // session owner
  sessionId: v.string(),                  // unique session identifier
  status: v.union(v.literal("connecting"), v.literal("connected"), v.literal("disconnected"), v.literal("error")),
  connectedAt: v.optional(v.number()),    // when session was established
  disconnectedAt: v.optional(v.number()), // when session ended
  errorMessage: v.optional(v.string()),   // error details if status is error
  toolsAvailable: v.optional(v.array(v.string())), // available tool names
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_server", ["serverId"])
  .index("by_user", ["userId"])
  .index("by_session_id", ["sessionId"])
  .index("by_status", ["status"]);

/* ------------------------------------------------------------------ */
/* USER PREFERENCES - UI settings and customizations                  */
/* ------------------------------------------------------------------ */
const userPreferences = defineTable({
  userId: v.id("users"),
  // Sidebar preferences
  ungroupedSectionName: v.optional(v.string()),     // custom name for ungrouped documents section
  isUngroupedExpanded: v.optional(v.boolean()),     // expand/collapse state for ungrouped section
  organizationMode: v.optional(v.string()),         // 'flat' | 'folders' | 'smart' | 'filetype'
  iconOrder: v.optional(v.array(v.string())),       // persisted order of Integrate section icons
  docOrderByGroup: v.optional(
    v.record(v.string(), v.array(v.id("documents")))
  ), // persisted per-group document order for Sidebar
  // Documents grid ordering (server-side persistence)
  docOrderByFilter: v.optional(
    v.record(v.string(), v.array(v.id("documents")))
  ), // persisted per-filter document order for Documents grid (list/cards)
  docOrderBySegmented: v.optional(
    v.record(v.string(), v.array(v.id("documents")))
  ), // persisted per-group document order for Documents grid segmented view
  // Account reminders/preferences
  linkReminderOptOut: v.optional(v.boolean()),      // true => do not show anonymous link reminders
  // Calendar & planner UI preferences
  calendarHubSizePct: v.optional(v.number()),       // preferred % height for Calendar panel (20-80)
  plannerMode: v.optional(
    v.union(
      v.literal("list"),
      v.literal("calendar"),
      v.literal("kanban"),
      v.literal("weekly"),
    ),
  ),
  // Timezone preference (IANA name, e.g. "America/Los_Angeles")
  timeZone: v.optional(v.string()),
  // Planner view preferences
  plannerDensity: v.optional(
    v.union(
      v.literal("comfortable"),
      v.literal("compact"),
    ),
  ),
  showWeekInAgenda: v.optional(v.boolean()),
  agendaMode: v.optional(
    v.union(
      v.literal("list"),
      v.literal("kanban"),
      v.literal("weekly"),
      v.literal("mini"),
    ),
  ),
  // Persisted selected day for Agenda (UTC ms of local day start)
  agendaSelectedDateMs: v.optional(v.number()),
  // Upcoming list-specific view preference
  upcomingMode: v.optional(
    v.union(
      v.literal("list"),
      v.literal("mini"),
    ),
  ),
  // Per-user Kanban lane titles (display labels for status lanes)
  kanbanLaneTitles: v.optional(
    v.object({
      todo: v.string(),
      in_progress: v.string(),
      done: v.string(),
      blocked: v.string(),
    }),
  ),
  // Persisted ordering for Today's Agenda (list) and Upcoming lists
  agendaListOrder: v.optional(v.array(v.string())),
  upcomingListOrder: v.optional(v.array(v.string())),
  // Agents module preferences (generic key/value store)
  agentsPrefs: v.optional(v.record(v.string(), v.string())),
  // Tracked hashtags/topics for daily dossier/newsletter
  trackedHashtags: v.optional(v.array(v.string())),
  // Tech stack profile for dependency impact mapping
  techStack: v.optional(v.array(v.string())),
  // Calendar ingestion preferences
  gmailIngestEnabled: v.optional(v.boolean()),
  gcalSyncEnabled: v.optional(v.boolean()),
  calendarAutoAddMode: v.optional(v.union(v.literal("auto"), v.literal("propose"))),
  // Onboarding status
  onboardingSeededAt: v.optional(v.number()),
  // SMS notification preferences
  phoneNumber: v.optional(v.string()),           // E.164 format (e.g., "+14083335386")
  smsNotificationsEnabled: v.optional(v.boolean()), // Master toggle for SMS notifications
  smsMeetingCreated: v.optional(v.boolean()),    // Notify when meeting is created
  smsMeetingReminder: v.optional(v.boolean()),   // Notify before meeting starts
  smsMorningDigest: v.optional(v.boolean()),     // Include in morning digest SMS
  smsReminderMinutes: v.optional(v.number()),    // Minutes before meeting to send reminder (default: 15)
  // Theme customization preferences
  themeMode: v.optional(v.union(v.literal("light"), v.literal("dark"), v.literal("system"))),
  themeAccentColor: v.optional(v.string()),      // Hex color or preset name (e.g., "blue", "#3B82F6")
  themeDensity: v.optional(v.union(v.literal("comfortable"), v.literal("compact"), v.literal("spacious"))),
  themeFontFamily: v.optional(v.string()),       // Font family name (e.g., "Inter", "System")
  themeBackgroundPattern: v.optional(v.string()), // Background pattern name (e.g., "none", "dots", "grid")
  themeReducedMotion: v.optional(v.boolean()),   // Reduce animations for accessibility
  // Future: more UI preferences can be added here
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"]);

/* ------------------------------------------------------------------ */
/* QUICK CAPTURES - Instant capture of thoughts, voice memos, screenshots */
/* ------------------------------------------------------------------ */
const quickCaptures = defineTable({
  userId: v.id("users"),
  type: v.union(
    v.literal("note"),
    v.literal("task"),
    v.literal("voice"),
    v.literal("screenshot")
  ),
  content: v.string(),
  title: v.optional(v.string()),
  audioUrl: v.optional(v.string()),      // For voice memos (storage URL)
  audioStorageId: v.optional(v.id("_storage")), // For voice memos (storage ID)
  screenshotUrl: v.optional(v.string()), // For screenshots (storage URL)
  screenshotStorageId: v.optional(v.id("_storage")), // For screenshots (storage ID)
  annotations: v.optional(v.any()),      // Screenshot annotations
  transcription: v.optional(v.string()), // Voice memo transcription
  processed: v.boolean(),                // Has AI processed it?
  linkedDocumentId: v.optional(v.id("documents")),
  tags: v.optional(v.array(v.string())),
  metadata: v.optional(v.any()),
  createdAt: v.number(),
  updatedAt: v.optional(v.number()),
})
  .index("by_user", ["userId"])
  .index("by_user_type", ["userId", "type"])
  .index("by_user_created", ["userId", "createdAt"])
  .index("by_processed", ["userId", "processed"]);

/* ------------------------------------------------------------------ */
/* USER BEHAVIOR EVENTS - Track user actions for pattern recognition  */
/* ------------------------------------------------------------------ */
const userBehaviorEvents = defineTable({
  userId: v.id("users"),
  eventType: v.union(
    v.literal("document_created"),
    v.literal("document_viewed"),
    v.literal("document_edited"),
    v.literal("task_completed"),
    v.literal("task_created"),
    v.literal("agent_interaction"),
    v.literal("search_performed"),
    v.literal("calendar_event_ended"),
    v.literal("quick_capture")
  ),
  entityId: v.optional(v.string()),
  metadata: v.optional(v.any()),
  timestamp: v.number(),
  timeOfDay: v.string(),         // "morning" | "afternoon" | "evening" | "night"
  dayOfWeek: v.string(),         // "monday" | "tuesday" | etc.
})
  .index("by_user_time", ["userId", "timestamp"])
  .index("by_user_type", ["userId", "eventType"])
  .index("by_entity", ["entityId"]);

/* ------------------------------------------------------------------ */
/* RECOMMENDATIONS - AI-powered suggestions for users                  */
/* ------------------------------------------------------------------ */
const recommendations = defineTable({
  userId: v.id("users"),
  type: v.union(
    v.literal("pattern"),          // "You usually create notes after meetings"
    v.literal("idle_content"),     // "Document X hasn't been updated"
    v.literal("collaboration"),    // "3 people viewed this doc"
    v.literal("external_trigger"), // "New article about [topic]"
    v.literal("smart_suggestion")  // AI-generated recommendation
  ),
  priority: v.union(
    v.literal("high"),
    v.literal("medium"),
    v.literal("low")
  ),
  message: v.string(),
  actionLabel: v.string(),
  actionType: v.optional(v.string()),  // "open_document" | "create_note" | etc.
  actionData: v.optional(v.any()),
  icon: v.optional(v.string()),
  dismissed: v.boolean(),
  clicked: v.optional(v.boolean()),
  createdAt: v.number(),
  expiresAt: v.number(),
})
  .index("by_user_active", ["userId", "dismissed", "expiresAt"])
  .index("by_user_created", ["userId", "createdAt"]);

/* ------------------------------------------------------------------ */
/* USER TEACHINGS - Long-term teachability memory (facts/prefs/skills) */
/* ------------------------------------------------------------------ */
const userTeachings = defineTable({
  userId: v.id("users"),
  type: v.union(
    v.literal("fact"),
    v.literal("preference"),
    v.literal("skill"),
  ),
  category: v.optional(v.string()),           // Stable bucket for conflict resolution
  key: v.optional(v.string()),                // Short label for the teaching
  content: v.string(),                        // Normalized teaching text
  embedding: v.optional(v.array(v.float64())),// Vector embedding for semantic retrieval
  status: v.union(v.literal("active"), v.literal("archived")),
  source: v.optional(v.union(v.literal("explicit"), v.literal("inferred"))),
  steps: v.optional(v.array(v.string())),     // For skills: ordered steps
  triggerPhrases: v.optional(v.array(v.string())), // For skills: trigger phrases
  confidence: v.optional(v.float64()),        // Analyzer confidence (0-1)
  usageCount: v.optional(v.number()),
  lastUsedAt: v.optional(v.number()),
  createdAt: v.number(),
  archivedAt: v.optional(v.number()),
  threadId: v.optional(v.string()),           // Source thread for provenance
})
  .index("by_user", ["userId"])
  .index("by_user_type", ["userId", "type"])
  .index("by_user_category", ["userId", "category"])
  .index("by_user_status", ["userId", "status"])
  .vectorIndex("by_embedding", { vectorField: "embedding", dimensions: 1536 });

/* ------------------------------------------------------------------ */
/* GOOGLE ACCOUNTS - OAuth tokens for Gmail integration               */
/* ------------------------------------------------------------------ */
const googleAccounts = defineTable({
  userId: v.id("users"),
  provider: v.literal("google"),
  email: v.optional(v.string()),
  accessToken: v.string(),
  refreshToken: v.optional(v.string()),
  scope: v.optional(v.string()),
  expiryDate: v.optional(v.number()), // ms since epoch
  tokenType: v.optional(v.string()),
  historyId: v.optional(v.string()),      // Gmail history cursor for watch
  gcalSyncToken: v.optional(v.string()),   // Google Calendar sync token
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_user_provider", ["userId", "provider"]);

/* ------------------------------------------------------------------ */
/* INTEGRATIONS - Slack, GitHub, Notion OAuth tokens                   */
/* ------------------------------------------------------------------ */
const slackAccounts = defineTable({
  userId: v.id("users"),
  provider: v.literal("slack"),
  teamId: v.optional(v.string()),
  teamName: v.optional(v.string()),
  botUserId: v.optional(v.string()),
  authedUserId: v.optional(v.string()),
  accessToken: v.string(),             // bot token
  userAccessToken: v.optional(v.string()), // authed_user.access_token if granted
  scope: v.optional(v.string()),
  tokenType: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_user_provider", ["userId", "provider"]);

const githubAccounts = defineTable({
  userId: v.id("users"),
  provider: v.literal("github"),
  username: v.optional(v.string()),
  accessToken: v.string(),
  scope: v.optional(v.string()),
  tokenType: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_user_provider", ["userId", "provider"]);

const notionAccounts = defineTable({
  userId: v.id("users"),
  provider: v.literal("notion"),
  workspaceId: v.optional(v.string()),
  workspaceName: v.optional(v.string()),
  botId: v.optional(v.string()),
  accessToken: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_user_provider", ["userId", "provider"]);

/* ------------------------------------------------------------------ */
/* API KEYS - Per-user API keys for providers                        */
/* ------------------------------------------------------------------ */
const userApiKeys = defineTable({
  userId: v.id("users"),
  provider: v.string(),
  encryptedApiKey: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user_provider", ["userId", "provider"]);

/* ------------------------------------------------------------------ */
/* DAILY USAGE - Per-user, per-provider daily counts                  */
/* ------------------------------------------------------------------ */
const dailyUsage = defineTable({
  userId: v.optional(v.id("users")),
  provider: v.string(),
  date: v.string(), // YYYY-MM-DD
  count: v.optional(v.number()),
  limit: v.optional(v.number()),
  updatedAt: v.optional(v.number()),
})
  .index("by_provider_date", ["provider", "date"])
  .index("by_user_provider_date", ["userId", "provider", "date"]);

/* ------------------------------------------------------------------ */
/* SUBSCRIPTIONS - simple $1 supporter unlock                          */
/* ------------------------------------------------------------------ */
const subscriptions = defineTable({
  userId: v.id("users"),
  plan: v.union(v.literal("free"), v.literal("supporter")),
  status: v.union(v.literal("active"), v.literal("canceled")),
  createdAt: v.number(),
  updatedAt: v.number(),
  stripeSessionId: v.optional(v.string()),
  stripePaymentIntentId: v.optional(v.string()),
})
  .index("by_user", ["userId"])
  .index("by_user_status", ["userId", "status"]);

/* ------------------------------------------------------------------ */
/* MCP TOOL LEARNING - AI learning data for adaptive guidance          */
/* ------------------------------------------------------------------ */
const mcpToolLearning = defineTable({
  toolId: v.id("mcpTools"),              // which tool this learning data is for
  serverId: v.id("mcpServers"),          // which server provides the tool
  naturalLanguageQuery: v.string(),      // the natural language input
  convertedParameters: v.any(),           // the AI-converted parameters
  executionSuccess: v.boolean(),          // whether the execution succeeded
  executionResult: v.optional(v.any()),   // the execution result (if successful)
  errorMessage: v.optional(v.string()),   // error details (if failed)
  learningType: v.union(
    v.literal("auto_discovery"),         // automatic learning during tool discovery
    v.literal("user_interaction"),       // learning from real user interactions
    v.literal("manual_training")          // manually triggered learning
  ),
  qualityScore: v.optional(v.number()),   // 0-1 score of how good this example is
  timingMs: v.optional(v.number()),       // execution time in milliseconds
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_tool", ["toolId"])
  .index("by_server", ["serverId"])
  .index("by_success", ["executionSuccess"])
  .index("by_learning_type", ["learningType"])
  .index("by_quality", ["qualityScore"]);

/* ------------------------------------------------------------------ */
/* MCP GUIDANCE EXAMPLES - Curated examples for user guidance          */
/* ------------------------------------------------------------------ */
const mcpGuidanceExamples = defineTable({
  toolId: v.id("mcpTools"),              // which tool these examples are for
  serverId: v.id("mcpServers"),          // which server provides the tool
  examples: v.array(v.object({
    query: v.string(),                   // example natural language query
    parameters: v.any(),                 // the converted parameters
    description: v.string(),             // human-readable description
    successRate: v.optional(v.number()), // success rate for this type of query
  })),
  generatedAt: v.number(),               // when these examples were generated
  lastUpdated: v.number(),               // when examples were last refreshed
  version: v.number(),                   // version number for cache invalidation
  isActive: v.boolean(),                 // whether these examples are currently active
})
  .index("by_tool", ["toolId"])
  .index("by_server", ["serverId"])
  .index("by_active", ["isActive"]);

/* ------------------------------------------------------------------ */
/* MCP TOOL HISTORY - Per-user usage history for MCP tools             */
/* ------------------------------------------------------------------ */
const mcpToolHistory = defineTable({
  userId: v.id("users"),
  toolId: v.id("mcpTools"),
  serverId: v.id("mcpServers"),
  naturalLanguageQuery: v.string(),
  parameters: v.any(),
  executionSuccess: v.boolean(),
  resultPreview: v.optional(v.string()),
  errorMessage: v.optional(v.string()),
  createdAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_user_tool", ["userId", "toolId"])
  .index("by_user_createdAt", ["userId", "createdAt"])
  .index("by_user_tool_createdAt", ["userId", "toolId", "createdAt"]);

/* ------------------------------------------------------------------ */
/* DOCUMENT SNAPSHOTS – periodic snapshots to prevent step accumulation */
/* ------------------------------------------------------------------ */
const documentSnapshots = defineTable({
  documentId: v.id("documents"),
  content: v.string(),
  version: v.number(),
  createdBy: v.id("users"),
  createdAt: v.number(),
  stepCount: v.number(),

  // NEW FIELDS for enhanced management
  contentSize: v.optional(v.number()),        // Track content size in bytes
  isEmergency: v.optional(v.boolean()),       // Flag emergency snapshots
  isManual: v.optional(v.boolean()),          // Flag manually triggered snapshots
  compressionRatio: v.optional(v.number()),   // Track compression effectiveness
  triggerReason: v.optional(v.string()),      // Why this snapshot was created
})
  .index("by_document", ["documentId"])
  .index("by_document_version", ["documentId", "version"])
  .index("by_created_at", ["createdAt"])
  .index("by_size", ["contentSize"])           // NEW: Index by content size
  .index("by_emergency", ["isEmergency"])      // NEW: Quick access to emergency snapshots

/* ------------------------------------------------------------------ */
/* SPREADSHEETS – sheet metadata and individual cells                  */
/* ------------------------------------------------------------------ */
const spreadsheets = defineTable({
  name: v.string(),
  userId: v.id("users"),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_name", ["name"]);

const sheetCells = defineTable({
  sheetId: v.id("spreadsheets"),
  row: v.number(),
  col: v.number(),
  value: v.optional(v.string()),
  type: v.optional(v.string()),      // e.g. "text", "number", "formula"
  comment: v.optional(v.string()),
  updatedAt: v.number(),
  updatedBy: v.optional(v.id("users")),
})
  .index("by_sheet", ["sheetId"]) // broad queries
  .index("by_sheet_row_col", ["sheetId", "row", "col"]); // precise cell lookup

/* ------------------------------------------------------------------ */
/* TASKS – personal task management                                   */
/* ------------------------------------------------------------------ */
const events = defineTable({
  userId: v.id("users"),
  title: v.string(),
  description: v.optional(v.string()),
  // Canonical Editor.js JSON (stringified) for event description
  descriptionJson: v.optional(v.string()),
  startTime: v.number(),                 // ms since epoch
  endTime: v.optional(v.number()),       // ms since epoch
  allDay: v.optional(v.boolean()),
  location: v.optional(v.string()),
  status: v.optional(
    v.union(
      v.literal("confirmed"),
      v.literal("tentative"),
      v.literal("cancelled"),
    ),
  ),
  color: v.optional(v.string()),
  documentId: v.optional(v.id("documents")),
  tags: v.optional(v.array(v.string())),
  recurrence: v.optional(v.string()),    // simple RRULE or custom text for now
  sourceType: v.optional(v.union(
    v.literal("gmail"),
    v.literal("gcal"),
    v.literal("doc"),
  )),
  sourceId: v.optional(v.string()),       // external id (messageId/eventId/etc.)
  ingestionConfidence: v.optional(v.union(
    v.literal("low"),
    v.literal("med"),
    v.literal("high"),
  )),
  proposed: v.optional(v.boolean()),      // requires user accept before "confirmed"
  rawSummary: v.optional(v.string()),     // short extracted summary from source
  meta: v.optional(v.any()),              // misc ingestion metadata (e.g., hash, origin headers)
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_user_status", ["userId", "status"]) // status filtering
  .index("by_user_start", ["userId", "startTime"]) // for range queries
  .index("by_document", ["documentId"])
  .index("by_user_source", ["userId", "sourceType", "sourceId"]); // for gmail/gcal dedup


/* ------------------------------------------------------------------ */
/* HOLIDAYS – cached public holidays by country                        */
/* ------------------------------------------------------------------ */
const holidays = defineTable({
  country: v.string(),                 // e.g. "US"
  name: v.string(),                    // Holiday display name
  dateMs: v.number(),                  // UTC ms for the holiday date (00:00Z of that date)
  dateKey: v.string(),                 // "YYYY-MM-DD" (as provided by API)
  types: v.optional(v.array(v.string())),
  year: v.number(),
  raw: v.optional(v.any()),            // Raw provider payload
  updatedAt: v.number(),
})
  .index("by_country_date", ["country", "dateMs"])
  .index("by_country_year", ["country", "year"])
  .index("by_date", ["dateMs"]);

/* ------------------------------------------------------------------ */
/* FINANCIAL EVENTS – macro releases and earnings (cached)             */
/* ------------------------------------------------------------------ */
const financialEvents = defineTable({
  market: v.string(),                  // e.g. "US"
  category: v.string(),                // e.g. "CPI" | "FOMC" | "NFP" | "GDP" | "PCE" | "EARNINGS"
  title: v.string(),                   // Display title
  dateMs: v.number(),                  // UTC ms of the calendar day (00:00Z)
  dateKey: v.string(),                 // "YYYY-MM-DD"
  time: v.optional(v.string()),        // e.g. "08:30 ET"
  symbol: v.optional(v.string()),      // For earnings: ticker
  raw: v.optional(v.any()),            // Raw provider payload
  updatedAt: v.number(),
})
  .index("by_market_date", ["market", "dateMs"])
  .index("by_category_date", ["category", "dateMs"]);

/* ------------------------------------------------------------------ */
/* USER EVENTS – personal event/task management (renamed from tasks)  */
/* ------------------------------------------------------------------ */
const userEvents = defineTable({
  userId: v.id("users"),
  title: v.string(),
  description: v.optional(v.string()),
  // New: canonical Editor.js JSON (stringified); plain description kept for search/snippets
  descriptionJson: v.optional(v.string()),
  status: v.union(
    v.literal("todo"),
    v.literal("in_progress"),
    v.literal("done"),
    v.literal("blocked"),
  ),
  priority: v.optional(
    v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("urgent"),
    ),
  ),
  dueDate: v.optional(v.number()),       // ms since epoch
  startDate: v.optional(v.number()),     // ms since epoch
  documentId: v.optional(v.id("documents")),
  eventId: v.optional(v.id("events")),  // optional link to a scheduled event
  assigneeId: v.optional(v.id("users")), // optional assignee separate from owner
  refs: v.optional(
    v.array(
      v.union(
        v.object({ kind: v.literal("document"), id: v.id("documents") }),
        v.object({ kind: v.literal("userEvent"), id: v.id("userEvents") }),
        v.object({ kind: v.literal("event"), id: v.id("events") }),
      ),
    ),
  ),
  tags: v.optional(v.array(v.string())),
  color: v.optional(v.string()),
  isFavorite: v.optional(v.boolean()),
  order: v.optional(v.number()),         // for Kanban ordering
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_user_status", ["userId", "status"]) // Kanban, filters
  .index("by_user_dueDate", ["userId", "dueDate"]) // Today/Week queries
  .index("by_user_priority", ["userId", "priority"]) // prioritization
  .index("by_user_updatedAt", ["userId", "updatedAt"]) // recent activity
  .index("by_user_assignee", ["userId", "assigneeId"]) // filtering by assignee
  .index("by_document", ["documentId"]);



/* ------------------------------------------------------------------ */
/* AGENT TIMELINES – timeline docs + tasks + links                     */
/* ------------------------------------------------------------------ */
const agentTimelines = defineTable({
  // Associate a timeline with a document so it can render in DocumentView
  documentId: v.optional(v.id("documents")),
  agentThreadId: v.optional(v.string()),
  name: v.string(),
  // Base start used to compute absolute times: absoluteStart = baseStartMs + startOffsetMs
  baseStartMs: v.optional(v.number()),
  createdBy: v.id("users"),
  createdAt: v.number(),
  updatedAt: v.number(),
  // Latest run result (persisted for UI readout)
  latestRunInput: v.optional(v.string()),
  latestRunOutput: v.optional(v.string()),
  latestRunAt: v.optional(v.number()),
}).index("by_document", ["documentId"])
  .index("by_user", ["createdBy"])
  .index("by_agent_thread", ["agentThreadId"]);

const agentTasks = defineTable({
  timelineId: v.id("agentTimelines"),
  agentThreadId: v.optional(v.string()),
  parentId: v.optional(v.id("agentTasks")),
  name: v.string(),
  // Offsets, not absolute times (backward-compatible with legacy startMs)
  startOffsetMs: v.optional(v.number()),
  startMs: v.optional(v.number()),
  durationMs: v.number(),
  progress: v.optional(v.number()), // 0..1
  status: v.optional(v.union(
    v.literal("pending"),
    v.literal("running"),
    v.literal("complete"),
    v.literal("paused"),
    v.literal("error"),
  )),
  agentType: v.optional(v.union(
    v.literal("orchestrator"),
    v.literal("main"),
    v.literal("leaf")
  )),
  assigneeId: v.optional(v.id("users")),
  // Visual metadata and runtime stats for richer timeline rendering
  icon: v.optional(v.string()),
  color: v.optional(v.string()),
  sequence: v.optional(v.union(v.literal("parallel"), v.literal("sequential"))),
  description: v.optional(v.string()),
  inputTokens: v.optional(v.number()),
  outputTokens: v.optional(v.number()),
  outputSizeBytes: v.optional(v.number()),
  elapsedMs: v.optional(v.number()),
  startedAtMs: v.optional(v.number()),
  completedAtMs: v.optional(v.number()),
  // New: per-phase and retry/error markers
  phaseBoundariesMs: v.optional(v.array(v.number())),
  retryOffsetsMs: v.optional(v.array(v.number())),
  failureOffsetMs: v.optional(v.number()),
  order: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
}).index("by_timeline", ["timelineId"])
  .index("by_agent_thread", ["agentThreadId"])
  .index("by_parent", ["parentId"]);

const agentLinks = defineTable({
  timelineId: v.id("agentTimelines"),
  sourceTaskId: v.id("agentTasks"),
  targetTaskId: v.id("agentTasks"),
  type: v.optional(v.union(
    v.literal("e2e"),
    v.literal("s2s"),
    v.literal("s2e"),
    v.literal("e2s")
  )),
  createdAt: v.number(),
}).index("by_timeline", ["timelineId"]);


/* ------------------------------------------------------------------ */
/* AGENT TIMELINE RUNS – per-run history                               */
/* ------------------------------------------------------------------ */
const agentTimelineRuns = defineTable({
  timelineId: v.id("agentTimelines"),
  input: v.string(),
  output: v.string(),
  retryCount: v.optional(v.number()),
  modelUsed: v.optional(v.string()),
  createdAt: v.number(),
  meta: v.optional(v.any()),
})
  .index("by_timeline", ["timelineId"])
  .index("by_timeline_createdAt", ["timelineId", "createdAt"]);

/* ------------------------------------------------------------------ */
/* AGENT IMAGE RESULTS – images found during agent execution          */
/* ------------------------------------------------------------------ */
const agentImageResults = defineTable({
  timelineId: v.id("agentTimelines"),
  taskId: v.optional(v.id("agentTasks")),
  imageUrl: v.string(),
  sourceUrl: v.optional(v.string()),        // Source page URL
  title: v.optional(v.string()),            // Image title/description
  thumbnailUrl: v.optional(v.string()),     // Thumbnail URL
  width: v.optional(v.number()),            // Image width
  height: v.optional(v.number()),           // Image height
  format: v.optional(v.string()),           // Image format (jpg, png, etc.)
  classification: v.optional(v.string()),   // Classification result
  classificationConfidence: v.optional(v.number()), // Confidence score
  classificationDetails: v.optional(v.any()), // Detailed classification data
  metadata: v.optional(v.any()),            // Additional metadata
  createdAt: v.number(),
})
  .index("by_timeline", ["timelineId"])
  .index("by_task", ["taskId"])
  .index("by_timeline_createdAt", ["timelineId", "createdAt"]);

/* ------------------------------------------------------------------ */
/* VOICE SESSIONS - Real-time voice agent sessions (RTVI/Daily Bots) */
/* ------------------------------------------------------------------ */
const voiceSessions = defineTable({
  sessionId: v.string(),           // Unique session identifier
  userId: v.id("users"),           // User who owns this session
  threadId: v.string(),            // Agent thread ID for conversation continuity
  createdAt: v.number(),           // Session creation timestamp
  lastActivityAt: v.number(),      // Last interaction timestamp
  metadata: v.optional(v.object({  // Optional session metadata
    clientType: v.optional(v.string()),    // "daily-bots", "rtvi", etc.
    deviceInfo: v.optional(v.string()),    // Device/browser info
    model: v.optional(v.string()),         // AI model used
  })),
})
  .index("by_user", ["userId"])
  .index("by_session_id", ["sessionId"])
  .index("by_thread_id", ["threadId"])
  .index("by_last_activity", ["lastActivityAt"]);

/* ------------------------------------------------------------------ */
/* FEED ITEMS - Central Newsstand for live intelligence feed          */
/* Shared public feed sourced from HackerNews, ArXiv, RSS, etc.       */
/* "Write Once, Read Many" - one hourly ingest, all users read free   */
/* ------------------------------------------------------------------ */
const feedItems = defineTable({
  sourceId: v.string(),                    // e.g., "hn-12345" (deduplication key)
  type: v.union(
    v.literal("news"),
    v.literal("signal"),
    v.literal("dossier"),
    v.literal("repo"),                     // GitHub repos
    v.literal("product")                   // Product launches
  ),
  category: v.optional(v.union(            // For segmented views
    v.literal("tech"),                     // General tech news
    v.literal("ai_ml"),                    // AI/ML research & news
    v.literal("startups"),                 // Startup/funding news
    v.literal("products"),                 // Product launches (Product Hunt, etc.)
    v.literal("opensource"),               // Open source / GitHub
    v.literal("finance"),                  // Finance/markets
    v.literal("research")                  // Academic research (ArXiv, etc.)
  )),
  title: v.string(),
  summary: v.string(),                     // The "Newsletter" style blurb
  url: v.string(),                         // Link to original content
  source: v.string(),                      // "YCombinator", "ArXiv", "GitHub", "ProductHunt"
  tags: v.array(v.string()),               // ["Trending", "AI", "Funding"]
  metrics: v.optional(v.array(v.object({
    label: v.string(),
    value: v.string(),
    trend: v.optional(v.union(v.literal("up"), v.literal("down")))
  }))),
  publishedAt: v.string(),                 // ISO date string
  score: v.number(),                       // For sorting by "Heat"
  createdAt: v.optional(v.number()),       // When we ingested this
})
  .index("by_published", ["publishedAt"])
  .index("by_score", ["score"])
  .index("by_source", ["source"])
  .index("by_type", ["type"])
  .index("by_category", ["category"])      // Segmented view filtering
  .index("by_source_id", ["sourceId"]);    // Fast deduplication lookup

/* ------------------------------------------------------------------ */
/* REPO STATS CACHE - GitHub repo stats + velocity snapshots           */
/* ------------------------------------------------------------------ */
const repoStatsCache = defineTable({
  repoFullName: v.string(),               // owner/name
  repoUrl: v.string(),
  description: v.optional(v.string()),
  stars: v.number(),
  forks: v.number(),
  watchers: v.optional(v.number()),
  openIssues: v.optional(v.number()),
  createdAt: v.string(),
  pushedAt: v.string(),
  starHistory: v.array(v.object({
    date: v.string(),                     // YYYY-MM-DD
    stars: v.number(),                    // total or daily count
    delta: v.optional(v.number()),        // optional daily delta
  })),
  commitHistory: v.array(v.object({
    weekStart: v.string(),                // YYYY-MM-DD
    commits: v.number(),
  })),
  languages: v.optional(v.array(v.object({
    name: v.string(),
    pct: v.number(),
  }))),
  fetchedAt: v.number(),
})
  .index("by_repo", ["repoFullName"])
  .index("by_repo_url", ["repoUrl"]);

/* ------------------------------------------------------------------ */
/* PAPER DETAILS CACHE - ArXiv metadata + methodology extraction       */
/* ------------------------------------------------------------------ */
  const paperDetailsCache = defineTable({
    paperId: v.string(),                    // arXiv ID
    url: v.string(),
    title: v.optional(v.string()),
    abstract: v.optional(v.string()),
    methodology: v.optional(v.string()),
    keyFindings: v.array(v.string()),
    authors: v.optional(v.array(v.string())),
    citationCount: v.optional(v.number()),
    doi: v.optional(v.string()),
    pdfUrl: v.optional(v.string()),
    publishedAt: v.optional(v.string()),
    sourceUrls: v.optional(v.array(v.string())),
    fetchedAt: v.number(),
  })
  .index("by_paper_id", ["paperId"])
  .index("by_url", ["url"]);

/* ------------------------------------------------------------------ */
/* STACK IMPACT CACHE - CVE impact mapping vs user tech stack          */
/* ------------------------------------------------------------------ */
  const stackImpactCache = defineTable({
    signalKey: v.string(),                  // hash of signal + stack
    signalTitle: v.optional(v.string()),
    signalUrl: v.optional(v.string()),
    techStack: v.array(v.string()),
    summary: v.string(),
    riskLevel: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    cveId: v.optional(v.string()),
    cveUrl: v.optional(v.string()),
    sourceUrls: v.optional(v.array(v.string())),
    graph: v.object({
      focusNodeId: v.optional(v.string()),
      nodes: v.array(v.object({
        id: v.string(),
        label: v.string(),
      type: v.optional(v.string()),
      importance: v.optional(v.number()),
      tier: v.optional(v.number()),       // 1 = direct, 2 = second-order
    })),
    edges: v.array(v.object({
      source: v.string(),
      target: v.string(),
      relationship: v.optional(v.string()),
      context: v.optional(v.string()),
      impact: v.optional(v.string()),
      order: v.optional(v.union(v.literal("primary"), v.literal("secondary"))),
    })),
  }),
  fetchedAt: v.number(),
})
  .index("by_signal_key", ["signalKey"])
  .index("by_signal_url", ["signalUrl"]);

/* ------------------------------------------------------------------ */
/* MODEL COMPARISON CACHE - Token cost + perf trade-offs               */
/* ------------------------------------------------------------------ */
const modelComparisonCache = defineTable({
    modelKey: v.string(),
    context: v.optional(v.string()),
    summary: v.optional(v.string()),
    recommendation: v.optional(v.string()),
    rows: v.array(v.object({
      model: v.string(),
      inputCostPer1M: v.number(),
      outputCostPer1M: v.number(),
      contextWindow: v.number(),
      reliabilityScore: v.optional(v.number()),
      performance: v.optional(v.string()),
      notes: v.optional(v.string()),
    })),
    sourceUrls: v.optional(v.array(v.string())),
    fetchedAt: v.number(),
  })
    .index("by_model_key", ["modelKey"]);

  /* ------------------------------------------------------------------ */
  /* DEAL FLOW CACHE - AI-curated startup deal flow snapshots           */
  /* ------------------------------------------------------------------ */
  const dealFlowCache = defineTable({
    dateString: v.string(),
    focusSectors: v.optional(v.array(v.string())),
    deals: v.array(v.object({
      id: v.string(),
      company: v.string(),
      sector: v.string(),
      stage: v.string(),
      amount: v.string(),
      date: v.string(),
      location: v.string(),
      foundingYear: v.optional(v.string()),
      foundersBackground: v.optional(v.string()),
      leads: v.array(v.string()),
      coInvestors: v.optional(v.array(v.string())),
      summary: v.string(),
      traction: v.optional(v.string()),
      sentiment: v.optional(v.union(v.literal("hot"), v.literal("watch"))),
      spark: v.optional(v.array(v.number())),
      people: v.array(v.object({
        name: v.string(),
        role: v.string(),
        past: v.string(),
      })),
      timeline: v.array(v.object({
        label: v.string(),
        detail: v.string(),
      })),
      regulatory: v.optional(v.object({
        fdaStatus: v.optional(v.string()),
        patents: v.optional(v.array(v.string())),
        papers: v.optional(v.array(v.string())),
      })),
      sources: v.optional(v.array(v.object({
        name: v.string(),
        url: v.string(),
      }))),
    })),
    fetchedAt: v.number(),
  })
    .index("by_date", ["dateString"])
    .index("by_fetched_at", ["fetchedAt"]);

  /* ------------------------------------------------------------------ */
  /* REPO SCOUT CACHE - open-source alternatives for signals            */
  /* ------------------------------------------------------------------ */
  const repoScoutCache = defineTable({
    signalKey: v.string(),
    signalTitle: v.string(),
    signalSummary: v.optional(v.string()),
    repos: v.array(v.object({
      name: v.string(),
      url: v.string(),
      description: v.optional(v.string()),
      stars: v.number(),
      starVelocity: v.number(),
      commitsPerWeek: v.number(),
      lastPush: v.optional(v.string()),
      languages: v.optional(v.array(v.object({
        name: v.string(),
        pct: v.number(),
      }))),
    })),
    moatSummary: v.optional(v.string()),
    moatRisks: v.optional(v.array(v.string())),
    fetchedAt: v.number(),
  })
    .index("by_signal_key", ["signalKey"]);

  /* ------------------------------------------------------------------ */
  /* STRATEGY METRICS CACHE - pivot KPI extractions                     */
  /* ------------------------------------------------------------------ */
  const strategyMetricsCache = defineTable({
    signalKey: v.string(),
    signalTitle: v.string(),
    signalSummary: v.optional(v.string()),
    metrics: v.array(v.object({
      label: v.string(),
      value: v.string(),
      unit: v.optional(v.string()),
      context: v.optional(v.string()),
      source: v.optional(v.string()),
    })),
    narrative: v.optional(v.string()),
    risks: v.optional(v.array(v.string())),
    sources: v.optional(v.array(v.object({
      title: v.string(),
      url: v.string(),
    }))),
    fetchedAt: v.number(),
  })
    .index("by_signal_key", ["signalKey"]);

/* ------------------------------------------------------------------ */
/* SEARCH EVALUATIONS - LLM-as-judge benchmark results                 */
/* ------------------------------------------------------------------ */
/**
 * Stores search quality evaluation results from LLM-as-judge.
 *
 * Retention Policy:
 * - Evaluations are retained for 90 days by default
 * - No PII is stored (queries may contain user intent but not personal data)
 * - judgeInput/judgeResult are JSON strings for flexibility
 *
 * Indexes:
 * - by_evaluation_id: Unique lookup
 * - by_pass: Filter by pass/fail status
 * - by_created: Time-based queries and cleanup
 * - by_query_hash: Deduplicate evaluations for same query (future)
 * - by_judge_model: Analyze performance by model
 */
const searchEvaluations = defineTable({
  evaluationId: v.string(),                 // Unique evaluation ID
  query: v.string(),                        // Search query evaluated
  mode: v.string(),                         // Search mode (fast/balanced/comprehensive)
  judgeModel: v.optional(v.string()),       // Approved model alias used for evaluation
  judgePromptVersion: v.optional(v.string()), // Version of judge prompt for reproducibility
  rawResponse: v.optional(v.string()),      // Raw LLM response for replay/debugging
  judgeInput: v.string(),                   // JSON-serialized JudgeInput
  judgeResult: v.string(),                  // JSON-serialized JudgeResult
  pass: v.boolean(),                        // Overall pass/fail
  overallScore: v.number(),                 // Weighted score (0-1)
  createdAt: v.number(),                    // Timestamp
})
  .index("by_evaluation_id", ["evaluationId"])
  .index("by_pass", ["pass"])
  .index("by_created", ["createdAt"])
  .index("by_judge_model", ["judgeModel"]);

export default defineSchema({
  ...authTables,       // `users`, `sessions`
  documents,
  nodes,
  relations,
  relationTypes,
  tags,
  tagRefs,
  smsLogs,
  smsUsageDaily,
  embeddings,
  gridProjects,
  files,
  urlAnalyses,
  chunks,
  folders,
  documentFolders,
  userPreferences,
  quickCaptures,
  userBehaviorEvents,
  recommendations,
  userTeachings,
  events,
  userEvents,
  holidays,
  financialEvents,
  mcpServers,
  mcpTools,
  mcpSessions,
  mcpPlans,
  mcpMemoryEntries,
  agentRuns,
  agentRunEvents,
  agentDelegations,
  agentWriteEvents,
  fileSearchStores,
  // chatThreads and chatMessages removed - using @convex-dev/agent component
  chatThreadsStream,
  chatMessagesStream,
  searchCache,
  mcpToolLearning,
  mcpGuidanceExamples,
  mcpToolHistory,
  documentSnapshots,
  spreadsheets,
  sheetCells,
  googleAccounts,
  slackAccounts,
  githubAccounts,
  notionAccounts,
  userApiKeys,
  dailyUsage,
  subscriptions,
  agentTimelines,
  agentTasks,
  agentLinks,
  agentTimelineRuns,
  agentImageResults,
  voiceSessions,
  feedItems,
  repoStatsCache,
  paperDetailsCache,
  stackImpactCache,
  modelComparisonCache,
  dealFlowCache,
  repoScoutCache,
  strategyMetricsCache,
  searchEvaluations,

  /* ------------------------------------------------------------------ */
  /* DOSSIER DOMAIN - Bidirectional focus sync for agent↔chart views    */
  /* ------------------------------------------------------------------ */
  dossierFocusState,
  dossierAnnotations,
  dossierEnrichment,

  /* ------------------------------------------------------------------ */
  /* EMAIL EVENTS - Audit log for all email sends via agent tools       */
  /* ------------------------------------------------------------------ */
  emailEvents: defineTable({
    userId: v.id("users"),
    threadId: v.optional(v.string()),           // Agent thread that triggered send
    runId: v.optional(v.string()),              // Agent run ID for provenance
    messageId: v.optional(v.string()),          // Resend message ID (on success)
    to: v.string(),                             // Recipient email
    cc: v.optional(v.array(v.string())),        // CC recipients
    bcc: v.optional(v.array(v.string())),       // BCC recipients
    subject: v.string(),
    bodyPreview: v.optional(v.string()),        // First 200 chars of body
    status: v.union(
      v.literal("queued"),
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("failed"),
      v.literal("bounced"),
    ),
    providerResponse: v.optional(v.any()),      // Raw response from Resend
    errorMessage: v.optional(v.string()),
    createdAt: v.number(),
    sentAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_thread", ["threadId"])
    .index("by_status", ["status"])
    .index("by_user_createdAt", ["userId", "createdAt"]),

  /* ------------------------------------------------------------------ */
  /* SPREADSHEET EVENTS - Patch/diff log for spreadsheet edits          */
  /* ------------------------------------------------------------------ */
  spreadsheetEvents: defineTable({
    userId: v.id("users"),
    spreadsheetId: v.id("spreadsheets"),
    threadId: v.optional(v.string()),           // Agent thread that triggered edit
    runId: v.optional(v.string()),              // Agent run ID for provenance
    operation: v.union(
      v.literal("set_cell"),
      v.literal("insert_row"),
      v.literal("delete_row"),
      v.literal("add_column"),
      v.literal("delete_column"),
      v.literal("apply_formula"),
      v.literal("add_sheet"),
      v.literal("rename_sheet"),
    ),
    targetRange: v.optional(v.string()),        // A1 notation (e.g., "A1:B5")
    payload: v.any(),                           // Operation-specific data (before/after)
    previousArtifactId: v.optional(v.string()), // Link to previous versioned artifact
    newArtifactId: v.optional(v.string()),      // Link to new versioned artifact
    validationErrors: v.optional(v.array(v.string())), // Formula/type validation errors
    status: v.union(
      v.literal("applied"),
      v.literal("reverted"),
      v.literal("failed"),
    ),
    createdAt: v.number(),
  })
    .index("by_spreadsheet", ["spreadsheetId"])
    .index("by_user", ["userId"])
    .index("by_thread", ["threadId"])
    .index("by_spreadsheet_createdAt", ["spreadsheetId", "createdAt"]),

  /* ------------------------------------------------------------------ */
  /* CALENDAR ARTIFACTS - ICS VEVENT artifacts for calendar operations  */
  /* ------------------------------------------------------------------ */
  calendarArtifacts: defineTable({
    userId: v.id("users"),
    threadId: v.optional(v.string()),           // Agent thread that created artifact
    runId: v.optional(v.string()),
    eventUid: v.string(),                       // VEVENT UID (stable across updates)
    operation: v.union(
      v.literal("create"),
      v.literal("update"),
      v.literal("cancel"),
    ),
    icsContent: v.string(),                     // Full ICS VEVENT string
    summary: v.string(),                        // Event title
    dtStart: v.number(),                        // Start timestamp (ms)
    dtEnd: v.optional(v.number()),              // End timestamp (ms)
    location: v.optional(v.string()),
    description: v.optional(v.string()),
    attendees: v.optional(v.array(v.string())), // Attendee emails
    sequence: v.number(),                       // SEQUENCE number for updates
    version: v.number(),                        // Internal version counter
    linkedEventId: v.optional(v.id("events")),  // Link to actual calendar event if synced
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_eventUid", ["eventUid"])
    .index("by_user_dtStart", ["userId", "dtStart"])
    .index("by_thread", ["threadId"]),

  /* ------------------------------------------------------------------ */
  /* DOCUMENT PATCHES - Edit history for patch-based document editing   */
  /* ------------------------------------------------------------------ */
  documentPatches: defineTable({
    documentId: v.string(),
    operations: v.any(),                        // Array of patch operations
    description: v.optional(v.string()),
    originalContentPreview: v.optional(v.string()),
    newContentPreview: v.optional(v.string()),
    appliedCount: v.number(),
    failedCount: v.number(),
    threadId: v.optional(v.string()),
    runId: v.optional(v.string()),
    userId: v.optional(v.id("users")),
    createdAt: v.number(),
  })
    .index("by_document", ["documentId"])
    .index("by_document_createdAt", ["documentId", "createdAt"])
    .index("by_thread", ["threadId"]),

  /* ------------------------------------------------------------------ */
  /* CONTEXT PACKS - Cached multi-document context bundles              */
  /* ------------------------------------------------------------------ */
  contextPacks: defineTable({
    packId: v.string(),
    threadId: v.string(),
    docSetHash: v.string(),                     // Hash of sorted docIds for cache key
    documents: v.array(v.object({
      docId: v.string(),
      title: v.string(),
      excerpts: v.array(v.object({
        text: v.string(),
        section: v.optional(v.string()),
        relevanceScore: v.optional(v.number()),
      })),
      totalTokensEstimate: v.number(),
    })),
    totalTokens: v.number(),
    createdAt: v.number(),
    expiresAt: v.number(),
    metadata: v.object({
      docCount: v.number(),
      truncatedDocs: v.number(),
      maxTokensUsed: v.number(),
    }),
  })
    .index("by_thread", ["threadId"])
    .index("by_thread_hash", ["threadId", "docSetHash"])
    .index("by_expiresAt", ["expiresAt"]),

  /* ------------------------------------------------------------------ */
  /* EVAL RUNS - Benchmark evaluation runs for agent testing            */
  /* ------------------------------------------------------------------ */
  evalRuns: defineTable({
    suiteId: v.string(),                        // Test suite identifier
    model: v.string(),                          // Model used for evaluation
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    totalCases: v.number(),
    passedCases: v.number(),
    failedCases: v.number(),
    passRate: v.number(),                       // 0-1
    avgLatencyMs: v.number(),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    metadata: v.optional(v.any()),              // Extra run configuration
  })
    .index("by_suite", ["suiteId"])
    .index("by_status", ["status"])
    .index("by_startedAt", ["startedAt"]),

  /* ------------------------------------------------------------------ */
  /* EVAL RESULTS - Individual test case results within an eval run     */
  /* ------------------------------------------------------------------ */
  evalResults: defineTable({
    runId: v.id("evalRuns"),
    testId: v.string(),                         // Test case ID
    passed: v.boolean(),
    latencyMs: v.number(),
    toolsCalled: v.array(v.string()),
    response: v.string(),
    reasoning: v.string(),                      // Judge's reasoning
    failureCategory: v.optional(v.string()),    // For failure analysis
    suggestedFix: v.optional(v.string()),       // Judge's suggestion
    artifacts: v.optional(v.array(v.string())), // Artifact IDs produced
    createdAt: v.number(),
  })
    .index("by_run", ["runId"])
    .index("by_testId", ["testId"])
    .index("by_run_passed", ["runId", "passed"]),

  // Human-in-the-Loop (HITL) Interrupts for agent approval workflow
  agentInterrupts: defineTable({
    threadId: v.string(),
    toolName: v.string(),
    arguments: v.any(),
    description: v.string(),
    allowedDecisions: v.array(v.string()), // ["approve", "edit", "reject"]
    status: v.string(), // "pending" | "approve" | "edit" | "reject" | "cancelled"
    decision: v.optional(v.object({
      type: v.string(),
      editedAction: v.optional(v.object({
        name: v.string(),
        args: v.any(),
      })),
      message: v.optional(v.string()),
    })),
    createdAt: v.number(),
    resolvedAt: v.optional(v.number()),
  })
    .index("by_thread", ["threadId"])
    .index("by_thread_and_status", ["threadId", "status"]),

  // API Usage Tracking
  apiUsage: defineTable({
    userId: v.id("users"),
    apiName: v.string(),
    operation: v.string(),
    timestamp: v.number(),
    unitsUsed: v.optional(v.number()),
    estimatedCost: v.optional(v.number()),
    requestMetadata: v.optional(v.any()),
    success: v.boolean(),
    errorMessage: v.optional(v.string()),
    responseTime: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_api", ["userId", "apiName"])
    .index("by_user_and_timestamp", ["userId", "timestamp"]),

  apiUsageDaily: defineTable({
    userId: v.id("users"),
    apiName: v.string(),
    date: v.string(),
    totalCalls: v.number(),
    successfulCalls: v.number(),
    failedCalls: v.number(),
    totalUnitsUsed: v.number(),
    totalCost: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_date", ["userId", "date"])
    .index("by_user_api_date", ["userId", "apiName", "date"]),

  /* ------------------------------------------------------------------ */
  /* CONFIRMED COMPANIES - User-confirmed company selections for SEC    */
  /* ------------------------------------------------------------------ */
  confirmedCompanies: defineTable({
    threadId: v.string(),                    // Links to conversation thread
    companyName: v.string(),                 // User's original query term (e.g., "Dasher")
    confirmedCik: v.string(),                // The CIK of the confirmed company
    confirmedName: v.string(),               // Full legal name of the confirmed company
    confirmedTicker: v.optional(v.string()), // Ticker symbol if available
    createdAt: v.number(),                   // Timestamp of confirmation
  })
    .index("by_thread_and_name", ["threadId", "companyName"])
    .index("by_thread", ["threadId"]),

  /* ------------------------------------------------------------------ */
  /* PENDING DOCUMENT EDITS - Deep Agent edit instructions for client   */
  /* ------------------------------------------------------------------ */
  pendingDocumentEdits: defineTable({
    documentId: v.id("documents"),              // Target document
    userId: v.id("users"),                      // User who initiated the edit
    agentThreadId: v.string(),                  // Agent thread for correlation
    documentVersion: v.number(),                // Document version at time of read (OCC)
    operation: v.object({
      type: v.literal("anchoredReplace"),       // Edit operation type
      anchor: v.string(),                       // Text anchor to find position
      search: v.string(),                       // Text to search for and replace
      replace: v.string(),                      // Replacement text
      sectionHint: v.optional(v.string()),      // Human-readable section name
    }),
    status: v.union(
      v.literal("pending"),                     // Awaiting client application
      v.literal("applied"),                     // Successfully applied
      v.literal("failed"),                      // Client failed to apply
      v.literal("cancelled"),                   // User cancelled
      v.literal("stale"),                       // Document changed since planning
    ),
    errorMessage: v.optional(v.string()),       // Error details if failed
    retryCount: v.number(),                     // Number of retry attempts
    createdAt: v.number(),                      // When edit was created
    appliedAt: v.optional(v.number()),          // When edit was applied
  })
    .index("by_document", ["documentId"])
    .index("by_document_status", ["documentId", "status"])
    .index("by_thread", ["agentThreadId"])
    .index("by_user", ["userId"])
    .index("by_document_version", ["documentId", "documentVersion"]),

  /* ------------------------------------------------------------------ */
  /* CALENDAR DATE MARKERS - Auto-detected dates from files            */
  /* ------------------------------------------------------------------ */
  calendarDateMarkers: defineTable({
    userId: v.id("users"),                        // User who owns this marker
    documentId: v.id("documents"),                // Document that triggered the marker
    fileName: v.string(),                         // Original filename
    detectedDate: v.number(),                     // Detected date timestamp
    confidence: v.string(),                       // 'high', 'medium', 'low'
    pattern: v.string(),                          // Pattern used to detect (ISO, US, MonthDay, etc.)
    createdAt: v.number(),                        // When marker was created
    updatedAt: v.number(),                        // When marker was last updated
  })
    .index("by_user", ["userId"])
    .index("by_document", ["documentId"])
    .index("by_user_and_date", ["userId", "detectedDate"]),

  /* ------------------------------------------------------------------ */
  /* HUMAN-IN-THE-LOOP - Agent requests for human input                */
  /* ------------------------------------------------------------------ */
  humanRequests: defineTable({
    userId: v.id("users"),                       // User who owns this request (for security)
    threadId: v.string(),                        // Agent thread ID
    messageId: v.string(),                       // Message ID where request was made
    toolCallId: v.string(),                      // Tool call ID for askHuman
    question: v.string(),                        // Question to ask human
    context: v.optional(v.string()),             // Context about why asking
    options: v.optional(v.array(v.string())),    // Suggested options
    status: v.union(
      v.literal("pending"),
      v.literal("answered"),
      v.literal("cancelled")
    ),
    response: v.optional(v.string()),            // Human's response
    respondedAt: v.optional(v.number()),         // When human responded
  })
    .index("by_user", ["userId"])
    .index("by_thread", ["threadId"])
    .index("by_status", ["status"])
    .index("by_thread_and_status", ["threadId", "status"]),

  /* ------------------------------------------------------------------ */
  /* CONFIRMED PEOPLE - User-confirmed person selections                */
  /* ------------------------------------------------------------------ */
  confirmedPeople: defineTable({
    threadId: v.string(),                    // Links to conversation thread
    personName: v.string(),                  // User's original query term (e.g., "Michael Jordan")
    confirmedId: v.string(),                 // Unique identifier for the person
    confirmedName: v.string(),               // Full name of the confirmed person
    confirmedProfession: v.optional(v.string()), // Profession/occupation
    confirmedOrganization: v.optional(v.string()), // Organization/company
    confirmedLocation: v.optional(v.string()), // Location
    createdAt: v.number(),                   // Timestamp of confirmation
  })
    .index("by_thread_and_name", ["threadId", "personName"])
    .index("by_thread", ["threadId"]),

  /* ------------------------------------------------------------------ */
  /* CONFIRMED EVENTS - User-confirmed event selections                 */
  /* ------------------------------------------------------------------ */
  confirmedEvents: defineTable({
    threadId: v.string(),                    // Links to conversation thread
    eventQuery: v.string(),                  // User's original query term (e.g., "Apple Event")
    confirmedId: v.string(),                 // Unique identifier for the event
    confirmedName: v.string(),               // Full name of the confirmed event
    confirmedDate: v.optional(v.string()),   // Event date
    confirmedLocation: v.optional(v.string()), // Event location
    confirmedDescription: v.optional(v.string()), // Event description
    createdAt: v.number(),                   // Timestamp of confirmation
  })
    .index("by_thread_and_query", ["threadId", "eventQuery"])
    .index("by_thread", ["threadId"]),

  /* ------------------------------------------------------------------ */
  /* CONFIRMED NEWS TOPICS - User-confirmed news article selections     */
  /* ------------------------------------------------------------------ */
  confirmedNewsTopics: defineTable({
    threadId: v.string(),                    // Links to conversation thread
    newsQuery: v.string(),                   // User's original query term (e.g., "Tesla news")
    confirmedId: v.string(),                 // Unique identifier for the article
    confirmedHeadline: v.string(),           // Article headline
    confirmedSource: v.optional(v.string()), // News source
    confirmedDate: v.optional(v.string()),   // Publication date
    confirmedUrl: v.optional(v.string()),    // Article URL
    createdAt: v.number(),                   // Timestamp of confirmation
  })
    .index("by_thread_and_query", ["threadId", "newsQuery"])
    .index("by_thread", ["threadId"]),

  /* ------------------------------------------------------------------ */
  /* ENTITY CONTEXTS - Cached entity research data (companies, people)  */
  /* ------------------------------------------------------------------ */
  entityContexts: defineTable({
    entityName: v.string(),                  // Name of the entity (company/person)
    entityType: v.union(
      v.literal("company"),
      v.literal("person")
    ),
    linkupData: v.optional(v.any()),         // Raw LinkUp API response
    summary: v.string(),                     // Brief summary of the entity
    keyFacts: v.array(v.string()),           // Array of key facts/highlights
    sources: v.array(v.object({
      name: v.string(),
      url: v.string(),
      snippet: v.optional(v.string()),
    })),
    // CRM Fields (NEW)
    crmFields: v.optional(v.object({
      companyName: v.string(),
      description: v.string(),
      headline: v.string(),
      hqLocation: v.string(),
      city: v.string(),
      state: v.string(),
      country: v.string(),
      website: v.string(),
      email: v.string(),
      phone: v.string(),
      founders: v.array(v.string()),
      foundersBackground: v.string(),
      keyPeople: v.array(v.object({
        name: v.string(),
        title: v.string(),
      })),
      industry: v.string(),
      companyType: v.string(),
      foundingYear: v.optional(v.number()),
      product: v.string(),
      targetMarket: v.string(),
      businessModel: v.string(),
      fundingStage: v.string(),
      totalFunding: v.string(),
      lastFundingDate: v.string(),
      investors: v.array(v.string()),
      investorBackground: v.string(),
      competitors: v.array(v.string()),
      competitorAnalysis: v.string(),
      fdaApprovalStatus: v.string(),
      fdaTimeline: v.string(),
      newsTimeline: v.array(v.object({
        date: v.string(),
        headline: v.string(),
        source: v.string(),
      })),
      recentNews: v.string(),
      keyEntities: v.array(v.string()),
      researchPapers: v.array(v.string()),
      partnerships: v.array(v.string()),
      completenessScore: v.number(),
      dataQuality: v.union(
        v.literal("verified"),
        v.literal("partial"),
        v.literal("incomplete")
      ),
    })),
    // 
    // BANKER-GRADE ENRICHMENT FIELDS (AUDIT_MOCKS aligned)
    // 

    /** Structured funding data */
    funding: v.optional(v.any()),

    /** People data (founders, executives, board) */
    people: v.optional(v.any()),

    /** Product pipeline data */
    productPipeline: v.optional(v.any()),

    /** Recent news items (structured) */
    recentNewsItems: v.optional(v.any()),

    /** Contact points for outreach */
    contactPoints: v.optional(v.any()),

    /** Freshness metadata */
    freshness: v.optional(v.any()),

    /** Persona hooks for 10-persona audit */
    personaHooks: v.optional(v.any()),

    spreadsheetId: v.optional(v.id("documents")), // Optional link to source spreadsheet
    rowIndex: v.optional(v.number()),        // Optional row index in spreadsheet
    researchedAt: v.number(),                // Timestamp when researched
    researchedBy: v.id("users"),            // User who triggered the research
    lastAccessedAt: v.number(),              // Last time this context was accessed
    accessCount: v.number(),                 // Number of times accessed (cache hits)
    version: v.number(),                     // Version number for cache invalidation
    isStale: v.optional(v.boolean()),        // Flag for stale data (> 7 days)

    // ═══════════════════════════════════════════════════════════════════
    // GAM: STRUCTURED MEMORY FIELDS
    // ═══════════════════════════════════════════════════════════════════

    /** Canonical key for disambiguation (e.g., "company:TSLA") */
    canonicalKey: v.optional(v.string()),

    /** Structured facts with boolean confidence flags */
    structuredFacts: v.optional(v.array(v.object({
      id: v.string(),
      subject: v.string(),
      predicate: v.string(),
      object: v.string(),
      /** Boolean: does this fact meet confidence threshold? */
      isHighConfidence: v.boolean(),
      sourceIds: v.array(v.string()),
      timestamp: v.string(),
      isOutdated: v.optional(v.boolean()),
    }))),

    /** Narrative interpretations (growth story, bear case, etc.) */
    narratives: v.optional(v.array(v.object({
      label: v.string(),
      description: v.string(),
      supportingFactIds: v.array(v.string()),
      /** Boolean: is this narrative well-supported? */
      isWellSupported: v.boolean(),
      lastUpdated: v.string(),
    }))),

    /** Actionable heuristics for agents */
    heuristics: v.optional(v.array(v.string())),

    /** Conflict tracking */
    conflicts: v.optional(v.array(v.object({
      factIds: v.array(v.string()),
      description: v.string(),
      status: v.union(v.literal("unresolved"), v.literal("resolved")),
      detectedAt: v.string(),
    }))),

    /** Boolean quality flags (not arbitrary scores) */
    quality: v.optional(v.object({
      hasSufficientFacts: v.boolean(),
      hasRecentResearch: v.boolean(),
      hasNoConflicts: v.boolean(),
      hasVerifiedSources: v.boolean(),
      hasHighConfidenceFacts: v.boolean(),
      hasNarratives: v.boolean(),
      hasHeuristics: v.boolean(),
    })),

    /** Quality tier derived from flags */
    qualityTier: v.optional(v.union(
      v.literal("excellent"),
      v.literal("good"),
      v.literal("fair"),
      v.literal("poor")
    )),

    /** Fact count for quick checks */
    factCount: v.optional(v.number()),

    /** Cross-references */
    relatedEntityNames: v.optional(v.array(v.string())),
    linkedDocIds: v.optional(v.array(v.id("documents"))),

    /** Research job tracking */
    lastResearchJobId: v.optional(v.string()),
    researchDepth: v.optional(v.union(
      v.literal("shallow"),
      v.literal("standard"),
      v.literal("deep")
    )),

    // ═══════════════════════════════════════════════════════════════════
    // KNOWLEDGE GRAPH INTEGRATION
    // ═══════════════════════════════════════════════════════════════════

    /** Link to the entity's knowledge graph */
    knowledgeGraphId: v.optional(v.id("knowledgeGraphs")),

    /** Cluster assignment from HDBSCAN (null = noise/odd-one-out) */
    clusterId: v.optional(v.string()),

    /** Boolean: is this entity an outlier? (HDBSCAN noise label) */
    isOddOneOut: v.optional(v.boolean()),

    /** Boolean: is this entity within cluster support region? (One-Class SVM) */
    isInClusterSupport: v.optional(v.boolean()),

    // ═══════════════════════════════════════════════════════════════════
    // ARBITRAGE AGENT FIELDS (Receipts-first research)
    // ═══════════════════════════════════════════════════════════════════

    /** Arbitrage-specific metrics */
    arbitrageMetadata: v.optional(v.object({
      lastArbitrageCheckAt: v.number(),
      contradictionCount: v.number(),
      sourceQualityScore: v.number(), // 0-100 composite score
      verificationStatus: v.union(
        v.literal("verified"),
        v.literal("partial"),
        v.literal("unverified")
      ),
      deltasSinceLastCheck: v.number(),
      hiddenSourcesCount: v.number(),
    })),

    /** Source health tracking (URL availability + content changes) */
    sourceHealth: v.optional(v.array(v.object({
      url: v.string(),
      lastChecked: v.number(),
      status: v.union(
        v.literal("ok"),
        v.literal("404"),
        v.literal("content_changed")
      ),
      contentHash: v.string(),
      firstSeenHash: v.string(),
    }))),

    /** Delta changelog (what changed since last arbitrage check) */
    deltas: v.optional(v.array(v.object({
      type: v.union(
        v.literal("fact_added"),
        v.literal("fact_removed"),
        v.literal("fact_modified"),
        v.literal("conflict_detected"),
        v.literal("conflict_resolved"),
        v.literal("source_404"),
        v.literal("source_changed")
      ),
      factId: v.optional(v.string()),
      timestamp: v.number(),
      description: v.string(),
      severity: v.union(
        v.literal("high"),
        v.literal("medium"),
        v.literal("low")
      ),
    }))),
  })
    .index("by_entity", ["entityName", "entityType"])
    .index("by_spreadsheet", ["spreadsheetId", "rowIndex"])
    .index("by_user", ["researchedBy"])
    .index("by_researched_at", ["researchedAt"])
    .index("by_canonicalKey", ["canonicalKey"])
    .index("by_user_accessedAt", ["researchedBy", "lastAccessedAt"])
    .index("by_qualityTier", ["qualityTier"])
    .searchIndex("search_entity", {
      searchField: "entityName",
      filterFields: ["entityType", "researchedBy"],
    }),

  // Visitor tracking for analytics
  visitors: defineTable({
    userId: v.optional(v.id("users")),
    sessionId: v.string(),
    page: v.string(),
    lastSeen: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_user", ["userId"]),

  // Email tracking
  emailsSent: defineTable({
    email: v.string(),
    userId: v.optional(v.id("users")),
    subject: v.string(),
    success: v.boolean(),
    sentAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_user", ["userId"])
    .index("by_sent_at", ["sentAt"]),

  /* ------------------------------------------------------------------ */
  /* AGENT PLANS - Task plans created by Deep Agents                    */
  /* ------------------------------------------------------------------ */
  agentPlans: defineTable({
    userId: v.id("users"),
    agentThreadId: v.optional(v.string()),
    goal: v.string(),
    steps: v.array(v.object({
      description: v.string(),
      status: v.union(
        v.literal("pending"),
        v.literal("in_progress"),
        v.literal("completed")
      ),
    })),
    features: v.optional(v.array(v.object({
      name: v.string(),
      status: v.union(
        v.literal("pending"),
        v.literal("failing"),
        v.literal("passing")
      ),
      testCriteria: v.string(),
      notes: v.optional(v.string()),
    }))),
    progressLog: v.optional(v.array(v.object({
      ts: v.number(),
      status: v.union(
        v.literal("info"),
        v.literal("pending"),
        v.literal("working"),
        v.literal("passing"),
        v.literal("failing"),
        v.literal("error")
      ),
      message: v.string(),
      meta: v.optional(v.any()),
    }))),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_updated", ["userId", "updatedAt"])
    .index("by_agent_thread", ["agentThreadId", "updatedAt"]),

  /* ------------------------------------------------------------------ */
  /* AGENT MEMORY - Persistent memory for Deep Agents                   */
  /* ------------------------------------------------------------------ */
  agentMemory: defineTable({
    userId: v.id("users"),
    key: v.string(),
    content: v.string(),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_key", ["userId", "key"]),

  /* ------------------------------------------------------------------ */
  /* AGENT SCRATCHPADS - Persistent scratchpad per agent thread         */
  /* ------------------------------------------------------------------ */
  agentScratchpads: defineTable({
    agentThreadId: v.string(),
    userId: v.id("users"),
    scratchpad: v.any(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_agent_thread", ["agentThreadId"])
    .index("by_user", ["userId"]),

  /* ------------------------------------------------------------------ */
  /* AGENT EPISODIC MEMORY - Per-run chronological memory               */
  /* ------------------------------------------------------------------ */
  agentEpisodicMemory: defineTable({
    runId: v.string(),
    userId: v.id("users"),
    ts: v.number(),
    tags: v.optional(v.array(v.string())),
    data: v.any(),
  })
    .index("by_run", ["runId", "ts"])
    .index("by_user", ["userId", "ts"]),

  /* ------------------------------------------------------------------ */
  /* GAM: RESEARCH JOBS - Background research job queue                 */
  /* ------------------------------------------------------------------ */
  researchJobs: defineTable({
    userId: v.id("users"),
    targetType: v.union(v.literal("entity"), v.literal("theme")),
    /** Canonical key (e.g., "company:TSLA" or "theme:agent-memory") */
    targetId: v.string(),
    /** Human-readable name for display */
    targetDisplayName: v.string(),
    jobType: v.union(
      v.literal("initial"),
      v.literal("refresh"),
      v.literal("merge_review"),
      v.literal("deep_upgrade")
    ),
    researchDepth: v.optional(v.union(
      v.literal("shallow"),
      v.literal("standard"),
      v.literal("deep")
    )),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed")
    ),
    priority: v.number(),
    triggerSource: v.optional(v.string()),
    error: v.optional(v.string()),
    /** Job duration tracking */
    durationMs: v.optional(v.number()),
    createdAt: v.number(),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  })
    .index("by_user_status", ["userId", "status"])
    .index("by_target", ["targetType", "targetId"])
    .index("by_createdAt", ["createdAt"]),

  /* ------------------------------------------------------------------ */
  /* GAM: MEMORY METRICS - Usage and quality tracking                   */
  /* ------------------------------------------------------------------ */
  memoryMetrics: defineTable({
    date: v.string(),                       // YYYY-MM-DD
    userId: v.optional(v.id("users")),      // null for global metrics

    // Query metrics (boolean outcomes)
    queryMemoryCalls: v.number(),
    queryMemoryHits: v.number(),            // found=true
    queryMemoryMisses: v.number(),          // found=false
    queryMemoryStaleHits: v.number(),       // found but stale

    // Job metrics
    researchJobsCreated: v.number(),
    researchJobsCompleted: v.number(),
    researchJobsFailed: v.number(),

    // Memory state counts
    totalEntityMemories: v.number(),
    totalThemeMemories: v.number(),

    // Write metrics
    factsAdded: v.number(),
    factsRejected: v.number(),
    conflictsDetected: v.number(),
  })
    .index("by_date", ["date"])
    .index("by_user_date", ["userId", "date"]),

  /* ------------------------------------------------------------------ */
  /* KNOWLEDGE GRAPHS - Claim-based graphs for entity/theme research     */
  /* ------------------------------------------------------------------ */
  knowledgeGraphs: defineTable({
    // Identity
    name: v.string(),
    sourceType: v.union(
      v.literal("entity"),      // from entityContexts
      v.literal("theme"),       // from themeMemory
      v.literal("artifact"),    // from document/file
      v.literal("session")      // from chat session research
    ),
    sourceId: v.string(),       // canonicalKey or documentId
    userId: v.id("users"),

    // Graph-level embeddings (fingerprints)
    semanticFingerprint: v.optional(v.array(v.float64())),
    wlSignature: v.optional(v.string()),        // Weisfeiler-Lehman hash

    // Clustering results (boolean outputs)
    clusterId: v.optional(v.string()),          // null = noise/odd-one-out
    isOddOneOut: v.boolean(),                   // HDBSCAN noise label
    isInClusterSupport: v.optional(v.boolean()), // One-Class SVM inlier

    // Provenance
    claimCount: v.number(),
    edgeCount: v.number(),
    lastBuilt: v.number(),
    lastClustered: v.optional(v.number()),
    lastFingerprinted: v.optional(v.number()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_source", ["sourceType", "sourceId"])
    .index("by_cluster", ["clusterId"])
    .index("by_oddOneOut", ["isOddOneOut"])
    .index("by_user_source", ["userId", "sourceType"]),

  /* ------------------------------------------------------------------ */
  /* GRAPH CLAIMS - Individual claims (SPO triples) within a graph       */
  /* ------------------------------------------------------------------ */
  graphClaims: defineTable({
    graphId: v.id("knowledgeGraphs"),

    // Claim content (SPO triple)
    subject: v.string(),
    predicate: v.string(),
    object: v.string(),
    claimText: v.string(),                      // Full sentence form

    // Provenance
    sourceDocIds: v.array(v.string()),
    sourceSnippets: v.optional(v.array(v.string())),
    extractedAt: v.number(),

    // Boolean quality flags (no arbitrary scores)
    isHighConfidence: v.boolean(),
    isVerified: v.optional(v.boolean()),
    isOutdated: v.optional(v.boolean()),

    // Embedding for semantic similarity
    embedding: v.optional(v.array(v.float64())),

    createdAt: v.number(),
  })
    .index("by_graph", ["graphId"])
    .index("by_graph_subject", ["graphId", "subject"])
    .index("by_graph_predicate", ["graphId", "predicate"])
    .index("by_confidence", ["isHighConfidence"])
    .searchIndex("search_claims", {
      searchField: "claimText",
      filterFields: ["graphId", "isHighConfidence"],
    }),

  /* ------------------------------------------------------------------ */
  /* GRAPH EDGES - Relations between claims                              */
  /* ------------------------------------------------------------------ */
  graphEdges: defineTable({
    graphId: v.id("knowledgeGraphs"),
    fromClaimId: v.id("graphClaims"),
    toClaimId: v.id("graphClaims"),

    // Edge type
    edgeType: v.union(
      v.literal("supports"),
      v.literal("contradicts"),
      v.literal("mentions"),
      v.literal("causes"),
      v.literal("relatedTo"),
      v.literal("partOf"),
      v.literal("precedes")
    ),

    // Strength (boolean, not score)
    isStrong: v.boolean(),

    // Provenance
    sourceDocId: v.optional(v.string()),

    createdAt: v.number(),
  })
    .index("by_graph", ["graphId"])
    .index("by_from", ["fromClaimId"])
    .index("by_to", ["toClaimId"])
    .index("by_type", ["edgeType"]),

  /* ------------------------------------------------------------------ */
  /* GRAPH CLUSTERS - HDBSCAN clustering results                         */
  /* ------------------------------------------------------------------ */
  graphClusters: defineTable({
    clusterId: v.string(),                      // UUID
    userId: v.id("users"),
    name: v.optional(v.string()),               // Auto-generated or user label
    description: v.optional(v.string()),

    // Members
    memberGraphIds: v.array(v.id("knowledgeGraphs")),
    memberCount: v.number(),

    // Cluster fingerprint (centroid)
    centroidVector: v.optional(v.array(v.float64())),

    // One-Class SVM "soft hull" model reference
    svmModelRef: v.optional(v.string()),

    // Shared characteristics (for explainability)
    sharedPredicates: v.optional(v.array(v.string())),
    sharedSubjects: v.optional(v.array(v.string())),
    dominantSourceType: v.optional(v.string()),

    // Metadata
    algorithmUsed: v.optional(v.string()),      // "hdbscan", "kmeans", etc.
    minClusterSize: v.optional(v.number()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_clusterId", ["clusterId"])
    .index("by_memberCount", ["memberCount"]),

  /* ------------------------------------------------------------------ */
  /* ARTIFACT RUN META - Sharded write mutex for artifact upserts       */
  /* Touched before every artifact write to serialize concurrent ops    */
  /* Sharded by artifactId hash to reduce contention (K=8 shards)       */
  /* ------------------------------------------------------------------ */
  artifactRunMeta: defineTable({
    runId: v.string(),
    shardId: v.optional(v.number()),  // 0..K-1, where K=8 shards (optional for migration)
    bump: v.number(),                  // Incremented on every artifact write
    updatedAt: v.number(),
  })
    .index("by_run_shard", ["runId", "shardId"])
    .index("by_run", ["runId"]), // For maintenance scans

  /* ------------------------------------------------------------------ */
  /* ARTIFACT DEAD LETTERS - Failed persistence jobs for visibility     */
  /* ------------------------------------------------------------------ */
  artifactDeadLetters: defineTable({
    runId: v.string(),
    toolName: v.optional(v.string()),
    attempt: v.number(),
    errorType: v.union(
      v.literal("OCC"),
      v.literal("VALIDATION"),
      v.literal("EXTRACTOR"),
      v.literal("SCHEDULER"),
      v.literal("UNKNOWN")
    ),
    errorMessage: v.string(),         // Truncated to ~2KB
    artifactCount: v.number(),
    sampleUrls: v.array(v.string()),  // Cap 3-5 URLs for debugging
    createdAt: v.number(),
  })
    .index("by_run", ["runId"])
    .index("by_run_createdAt", ["runId", "createdAt"]),

  /* ------------------------------------------------------------------ */
  /* ARTIFACT PERSIST JOBS - Idempotency tracking for scheduled jobs    */
  /* ------------------------------------------------------------------ */
  artifactPersistJobs: defineTable({
    runId: v.string(),
    idempotencyKey: v.string(),
    status: v.union(
      v.literal("started"),
      v.literal("done"),
      v.literal("failed")
    ),
    attempts: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_run_key", ["runId", "idempotencyKey"])
    .index("by_status_createdAt", ["status", "createdAt"]),

  /* ------------------------------------------------------------------ */
  /* ARTIFACT RUN STATS (SHARDED) - Observability counters per run      */
  /* Sharded to match mutex shards (K=8), avoiding new contention       */
  /* ------------------------------------------------------------------ */
  artifactRunStatsShards: defineTable({
    runId: v.string(),
    shardId: v.number(),             // 0..K-1, matches mutex shards
    jobsScheduled: v.number(),
    jobsDeduped: v.number(),
    deadLetters: v.number(),
    occRetries: v.number(),
    noopsSkipped: v.number(),
    artifactsInserted: v.number(),
    artifactsPatched: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_run_shard", ["runId", "shardId"])
    .index("by_run", ["runId"]),

  /* ------------------------------------------------------------------ */
  /* ARTIFACTS - First-class streaming artifacts for dossiers            */
  /* ------------------------------------------------------------------ */
  artifacts: defineTable({
    runId: v.string(),              // agentThreadId - stable for whole dossier
    artifactId: v.string(),         // Stable hash: art_<sha256_prefix>
    userId: v.id("users"),

    // Core (immutable after creation)
    kind: v.union(
      v.literal("url"),
      v.literal("file"),
      v.literal("video"),
      v.literal("image"),
      v.literal("document")
    ),
    provider: v.optional(v.union(
      v.literal("youtube"),
      v.literal("sec"),
      v.literal("arxiv"),
      v.literal("news"),
      v.literal("web"),
      v.literal("local")
    )),
    canonicalUrl: v.string(),

    // Display (mutable via enrich)
    title: v.string(),
    host: v.optional(v.string()),
    snippet: v.optional(v.string()),
    thumbnail: v.optional(v.string()),

    // Enrichment data (arrives later)
    transcript: v.optional(v.string()),
    pageRefs: v.optional(v.array(v.string())),

    // Metadata
    discoveredAt: v.number(),
    toolName: v.optional(v.string()),
    rev: v.number(),                // Monotonic version for safe merges

    // Boolean flags (GAM philosophy)
    flags: v.object({
      hasThumbnail: v.boolean(),
      hasTranscript: v.boolean(),
      hasPageRefs: v.boolean(),
      isPinned: v.boolean(),
      isCited: v.boolean(),
      isEnriched: v.boolean(),
    }),
    
    // Verification health (light indicator, claim-specific verdicts in claimVerifications)
    verificationHealth: v.optional(v.union(
      v.literal("unknown"),
      v.literal("has_supported"),   // At least one claim was supported
      v.literal("has_not_found"),   // No claims found in source
      v.literal("has_contradicted") // At least one claim was contradicted
    )),
    lastVerificationAt: v.optional(v.number()),

    // ═══════════════════════════════════════════════════════════════════
    // GLOBAL RESEARCH LEDGER: Sync fields for write-through
    // ═══════════════════════════════════════════════════════════════════

    /** Monotonic sequence number within run (for sync cursor) */
    seq: v.optional(v.number()),

    /** Query fingerprint if from a cached query */
    queryKey: v.optional(v.string()),

    /** Entity scope ("" if unscoped) */
    entityKey: v.optional(v.string()),

    /** Section this artifact was discovered in */
    sectionId: v.optional(v.string()),

    /** Provenance: only "tool" sources are eligible for global store */
    sourceType: v.optional(v.union(
      v.literal("tool"),   // From GLOBAL_ARTIFACT_PRODUCERS (Linkup, SEC, etc.)
      v.literal("agent"),  // Agent-generated (may be hallucinated)
      v.literal("user")    // User-provided
    )),

    /** Reference to global artifact (set after write-through) */
    globalArtifactKey: v.optional(v.string()),
  })
    .index("by_run", ["runId"])
    .index("by_run_artifact", ["runId", "artifactId"])
    .index("by_user_run", ["userId", "runId"])
    .index("by_user", ["userId"])
    .index("by_runId_seq", ["runId", "seq"])        // For write-through sync
    .index("by_createdAt", ["discoveredAt"]),       // For diagnostics

  /* ------------------------------------------------------------------ */
  /* ARTIFACT LINKS - Artifact-to-section assignments                    */
  /* ------------------------------------------------------------------ */
  artifactLinks: defineTable({
    runId: v.string(),
    artifactId: v.string(),
    sectionId: v.string(),
    createdAt: v.number(),
  })
    .index("by_run_section", ["runId", "sectionId"])
    .index("by_run_artifact", ["runId", "artifactId"])
    .index("by_run", ["runId"]),

  /* ------------------------------------------------------------------ */
  /* EVIDENCE LINKS - Fact-to-artifact citations                         */
  /* ------------------------------------------------------------------ */
  evidenceLinks: defineTable({
    runId: v.string(),
    factId: v.string(),
    artifactIds: v.array(v.string()),
    createdAt: v.number(),
  })
    .index("by_run_fact", ["runId", "factId"])
    .index("by_run", ["runId"]),

  /* ------------------------------------------------------------------ */
  /* FACTS - Claim text from {{fact:...}} anchors                        */
  /* Stores the exact claim text for verification                        */
  /* ------------------------------------------------------------------ */
  facts: defineTable({
    runId: v.string(),
    factId: v.string(),           // e.g., "funding_signals:etched_series_c"
    sectionKey: v.string(),       // e.g., "funding_signals"
    claimText: v.string(),        // The exact claim text to verify
    artifactIds: v.array(v.string()), // Linked evidence (from evidenceLinks)
    createdAt: v.number(),
  })
    .index("by_run", ["runId"])
    .index("by_run_fact", ["runId", "factId"])
    .index("by_run_section", ["runId", "sectionKey"]),

  /* ------------------------------------------------------------------ */
  /* CLAIM VERIFICATIONS - LLM-as-a-judge verdicts per claim+artifact    */
  /* Keyed by (runId, factId, artifactId) for claim-specific verdicts    */
  /* ------------------------------------------------------------------ */
  claimVerifications: defineTable({
    runId: v.string(),
    factId: v.string(),           // Links to facts table
    artifactId: v.string(),       // Which artifact was checked
    
    // Verdict from LLM-as-a-judge
    verdict: v.union(
      v.literal("supported"),     // Source explicitly states the claim
      v.literal("not_found"),     // Source doesn't mention the claim
      v.literal("contradicted"),  // Source contradicts the claim
      v.literal("inaccessible")   // Source is error page, paywall, blocked
    ),
    confidence: v.number(),       // 0-1 confidence score
    explanation: v.optional(v.string()), // Short explanation (max 60 words)
    snippet: v.optional(v.string()),     // Cached source excerpt for display
    
    createdAt: v.number(),
  })
    .index("by_run", ["runId"])
    .index("by_run_fact", ["runId", "factId"])
    .index("by_artifact", ["artifactId"])
    .index("by_run_fact_artifact", ["runId", "factId", "artifactId"]),

  /* ══════════════════════════════════════════════════════════════════════
   * GLOBAL RESEARCH LEDGER
   * Shared research cache with append-only progression tracking.
   * See: convex/globalResearch/ for mutations/queries.
   * ══════════════════════════════════════════════════════════════════════ */

  /* ------------------------------------------------------------------ */
  /* GLOBAL ARTIFACTS - URL-deduplicated source store                    */
  /* One row per unique canonicalUrl across all users/runs               */
  /* ------------------------------------------------------------------ */
  globalArtifacts: defineTable({
    /** Deterministic key: "ga_" + sha256(canonicalUrl) */
    artifactKey: v.string(),
    canonicalUrl: v.string(),
    domain: v.string(),                // Extracted host
    title: v.optional(v.string()),
    snippet: v.optional(v.string()),
    thumbnail: v.optional(v.string()),
    /** Hash of title+snippet for change detection */
    contentHash: v.optional(v.string()),
    firstSeenAt: v.number(),
    lastSeenAt: v.number(),
    seenCount: v.number(),
  })
    .index("by_artifactKey", ["artifactKey"])
    .index("by_canonicalUrl", ["canonicalUrl"]) // For dedupe cron
    .index("by_domain_lastSeenAt", ["domain", "lastSeenAt"])
    .index("by_lastSeenAt", ["lastSeenAt"]),

  /* ------------------------------------------------------------------ */
  /* GLOBAL QUERY CACHE - Simple TTL cache for search results            */
  /* MVP: Caches full response string; deduplication comes later         */
  /* ------------------------------------------------------------------ */
  globalQueryCache: defineTable({
    /** Deterministic: hash(query + toolName + params) */
    queryKey: v.string(),
    /** Full formatted response (ready to return) */
    cachedResponse: v.string(),
    /** Tool that produced this result */
    toolName: v.string(),
    /** When the cache was populated */
    completedAt: v.number(),
    /** TTL in ms (varies by query type) */
    ttlMs: v.number(),
  })
    .index("by_queryKey", ["queryKey"])
    .index("by_completedAt", ["completedAt"]), // For cleanup

  /* ------------------------------------------------------------------ */
  /* GLOBAL QUERIES - Query fingerprints for cache lookup                */
  /* ------------------------------------------------------------------ */
  globalQueries: defineTable({
    /** Deterministic key: "qk_" + hash(query + config + versions) */
    queryKey: v.string(),
    normalizedQuery: v.string(),
    toolName: v.string(),
    /** Frozen tool args (for debugging) */
    toolConfig: v.any(),
    /** Hash of toolConfig for reliable comparisons */
    toolConfigHash: v.string(),
    /** Tool version (e.g., "linkup-v2") */
    toolVersion: v.string(),
    /** Fingerprint algorithm version (bump when algo changes) */
    fingerprintVersion: v.number(),
    /**
     * Entity scope. Use "" for unscoped queries.
     * WARNING: Never query by_entityKey when entityKey === "" (hot partition).
     */
    entityKey: v.string(),
    /** Chosen TTL for this query type */
    ttlMs: v.number(),
    createdAt: v.number(),
  })
    .index("by_queryKey", ["queryKey"])
    // WARNING: Only use by_entityKey when entityKey !== ""
    .index("by_entityKey", ["entityKey"]),

  /* ------------------------------------------------------------------ */
  /* GLOBAL ARTIFACT MENTIONS - Append-only ledger of sightings          */
  /* Raw mentions kept 30 days, then compacted to globalMentionAgg       */
  /* ------------------------------------------------------------------ */
  globalArtifactMentions: defineTable({
    artifactKey: v.string(),
    queryKey: v.string(),
    /**
     * Entity scope. Use "" for unscoped.
     * WARNING: Never query by_entityKey_seenAt when entityKey === "".
     */
    entityKey: v.string(),
    seenAt: v.number(),
    toolName: v.string(),
    /** globalResearchRunId, "" if backfill */
    runId: v.string(),
    /** Section context, "" if none */
    sectionId: v.string(),
    rank: v.optional(v.number()),
    score: v.optional(v.number()),
  })
    .index("by_artifactKey_seenAt", ["artifactKey", "seenAt"])
    .index("by_queryKey_seenAt", ["queryKey", "seenAt"])
    // WARNING: Only use when entityKey !== ""
    .index("by_entityKey_seenAt", ["entityKey", "seenAt"])
    .index("by_seenAt", ["seenAt"]), // Retention cleanup

  /* ------------------------------------------------------------------ */
  /* GLOBAL MENTION AGGREGATES - Compacted daily summaries               */
  /* Prevents unbounded growth of raw mentions                           */
  /* ------------------------------------------------------------------ */
  globalMentionAgg: defineTable({
    /** Deterministic: hash(artifactKey + queryKey + dayBucket) */
    aggKey: v.string(),
    artifactKey: v.string(),
    queryKey: v.string(),
    /** Use "" for unscoped */
    entityKey: v.string(),
    /** Date bucket: "2024-01-15" */
    dayBucket: v.string(),
    mentionCount: v.number(),
    bestRank: v.optional(v.number()),
    firstSeenAt: v.number(),
    lastSeenAt: v.number(),
  })
    .index("by_aggKey", ["aggKey"])           // Upsert lookup
    .index("by_queryKey_day", ["queryKey", "dayBucket"])
    // WARNING: Only use when entityKey !== ""
    .index("by_entityKey_day", ["entityKey", "dayBucket"])
    .index("by_artifactKey_day", ["artifactKey", "dayBucket"])
    .index("by_dayBucket", ["dayBucket"]),    // "Top today" queries

  /* ------------------------------------------------------------------ */
  /* GLOBAL RESEARCH RUNS - Research job snapshots                       */
  /* Each run = one attempt to refresh a query's results                 */
  /* ------------------------------------------------------------------ */
  globalResearchRuns: defineTable({
    /** Unique run ID: "grr_" + uuid */
    researchRunId: v.string(),
    queryKey: v.string(),
    /**
     * Entity scope. Use "" for unscoped.
     * WARNING: Never query by_entityKey_* when entityKey === "".
     */
    entityKey: v.string(),
    status: v.union(
      v.literal("scheduled"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed")
    ),
    /** Monotonic version per queryKey */
    version: v.number(),
    ttlMs: v.number(),
    /** startedAt + ttlMs (for cache expiry checks) */
    expiresAt: v.number(),
    /**
     * Always set (= scheduledAt initially, overwritten on start).
     * Used for reliable sorting since startedAt can be optional.
     */
    sortTs: v.number(),
    scheduledAt: v.number(),
    startedAt: v.optional(v.number()),
    finishedAt: v.optional(v.number()),
    artifactCount: v.optional(v.number()),
    error: v.optional(v.string()),
  })
    .index("by_researchRunId", ["researchRunId"])
    .index("by_queryKey_sortTs", ["queryKey", "sortTs"])
    .index("by_queryKey_status_sortTs", ["queryKey", "status", "sortTs"])
    // WARNING: Only use when entityKey !== ""
    .index("by_entityKey_sortTs", ["entityKey", "sortTs"])
    .index("by_status", ["status"])
    .index("by_expiresAt", ["expiresAt"]),

  /* ------------------------------------------------------------------ */
  /* GLOBAL RESEARCH EVENTS - Append-only changelog                      */
  /* Only the run-owner action writes events (prevents race conditions)  */
  /* ------------------------------------------------------------------ */
  globalResearchEvents: defineTable({
    researchRunId: v.string(),
    /** For dedup on read: hash(kind + artifactKey + version) */
    eventKey: v.string(),
    /** Monotonic within run */
    seq: v.number(),
    kind: v.union(
      v.literal("artifact_added"),
      v.literal("artifact_updated"),
      v.literal("artifact_removed"),
      v.literal("fact_extracted"),
      v.literal("run_started"),
      v.literal("run_completed"),
      v.literal("run_failed")
    ),
    payload: v.any(),
    createdAt: v.number(),
  })
    .index("by_runId_seq", ["researchRunId", "seq"])
    .index("by_createdAt", ["createdAt"]), // Retention

  /* ------------------------------------------------------------------ */
  /* GLOBAL QUERY LOCKS - Nonce-owned single-flight cache                */
  /* Prevents N concurrent users from running the same query N times     */
  /* ------------------------------------------------------------------ */
  globalQueryLocks: defineTable({
    queryKey: v.string(),
    status: v.union(
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed")
    ),
    runId: v.string(),
    /** Random UUID for ownership verification */
    lockNonce: v.string(),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    failedAt: v.optional(v.number()),
    error: v.optional(v.string()),
    /** Default 10 minutes */
    staleAfterMs: v.number(),
  })
    .index("by_queryKey", ["queryKey"]),

  /* ------------------------------------------------------------------ */
  /* RESEARCH SUBSCRIPTIONS - User subscriptions for email digests       */
  /* ------------------------------------------------------------------ */
  researchSubscriptions: defineTable({
    userId: v.id("users"),
    subscriptionType: v.union(
      v.literal("entity"),
      v.literal("query"),
      v.literal("hashtag")
    ),
    /** entityKey, queryKey, or hashtag */
    targetKey: v.string(),
    displayName: v.string(),
    frequency: v.union(
      v.literal("daily"),
      v.literal("weekly"),
      v.literal("monthly")
    ),
    deliveryMethod: v.union(v.literal("email"), v.literal("in_app")),
    /** Timezone for delivery (default "UTC") */
    timezone: v.string(),
    /** Hour of day for delivery (0-23, default 8) */
    deliveryHourLocal: v.number(),
    /** Max artifacts per digest (default 20) */
    maxItems: v.number(),
    /** Precomputed next send time (for efficient cron query) */
    nextDueAt: v.number(),
    lastSentAt: v.optional(v.number()),
    lastSeenVersion: v.optional(v.number()),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_active", ["userId", "isActive"])
    .index("by_nextDueAt_active", ["nextDueAt", "isActive"]),

  /* ------------------------------------------------------------------ */
  /* GLOBAL COMPACTION STATE - Singleton for incremental compaction      */
  /* ------------------------------------------------------------------ */
  globalCompactionState: defineTable({
    /** Singleton key: "mentions" | "artifacts" */
    compactionType: v.string(),
    /** Last processed seenAt timestamp */
    lastProcessedAt: v.number(),
    /** Stats for monitoring */
    lastRunAt: v.number(),
    mentionsCompacted: v.optional(v.number()),
    mentionsPurged: v.optional(v.number()),
    duplicatesMerged: v.optional(v.number()),
  })
    .index("by_type", ["compactionType"]),

  /* ------------------------------------------------------------------ */
  /* GLOBAL BACKFILL STATE - Resumable migration state                   */
  /* ------------------------------------------------------------------ */
  globalBackfillState: defineTable({
    backfillRunId: v.string(),
    status: v.union(
      v.literal("running"),
      v.literal("paused"),
      v.literal("completed")
    ),
    /** Last processed run ID */
    lastRunId: v.optional(v.string()),
    /** Last processed seq within that run */
    lastSeq: v.optional(v.number()),
    processedCount: v.number(),
    eligibleCount: v.number(),
    startedAt: v.number(),
    lastUpdatedAt: v.number(),
  })
    .index("by_backfillRunId", ["backfillRunId"])
    .index("by_status", ["status"]),

  /* ------------------------------------------------------------------ */
  /* TOOL REGISTRY - Hybrid Search for Meta-Tool Discovery              */
  /* ------------------------------------------------------------------ */

  /* ------------------------------------------------------------------ */
  /* SKILLS REGISTRY - Multi-step workflow definitions (Anthropic spec)  */
  /* ------------------------------------------------------------------ */
  /**
   * Skills are pre-defined multi-step workflows that combine tools for common tasks.
   * Based on Anthropic's Skills specification (v1.0, October 2025).
   *
   * Skills follow the progressive disclosure pattern:
   * - searchAvailableSkills: Returns name + description (low tokens)
   * - describeSkill: Loads full instructions on-demand (high tokens)
   *
   * Format follows SKILL.md spec:
   * - name: hyphen-case unique identifier
   * - description: When to use this skill
   * - fullInstructions: Markdown workflow steps (loaded on-demand)
   */
  skills: defineTable({
    // Identity (Anthropic spec)
    name: v.string(),              // Unique identifier (hyphen-case, e.g., "company-research")
    description: v.string(),       // Brief description (shown in search results)

    // Content (loaded on-demand)
    fullInstructions: v.string(),  // Full markdown body with workflow steps

    // Classification
    category: v.string(),          // "research", "document", "media", "financial", "workflow"
    categoryName: v.string(),      // Human-readable category name

    // Search support
    keywords: v.array(v.string()), // Keywords for keyword matching
    keywordsText: v.string(),      // Joined keywords for BM25 search index

    // Vector embedding for semantic search (1536-dim OpenAI text-embedding-3-small)
    embedding: v.optional(v.array(v.float64())),

    // Anthropic spec optional fields
    license: v.optional(v.string()),           // e.g., "Apache-2.0"
    allowedTools: v.optional(v.array(v.string())), // Pre-approved tools this skill uses
    metadata: v.optional(v.any()),             // Custom metadata

    // Usage tracking
    usageCount: v.number(),        // Times this skill was used
    lastUsedAt: v.optional(v.number()), // Last usage timestamp

    // Status
    isEnabled: v.boolean(),        // Whether skill is available

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_name", ["name"])
    .index("by_category", ["category"])
    .index("by_usage", ["usageCount"])
    .index("by_enabled", ["isEnabled"])
    .index("by_enabled_category", ["isEnabled", "category"])
    .searchIndex("search_description", {
      searchField: "description",
      filterFields: ["category", "isEnabled"],
    })
    .searchIndex("search_keywords", {
      searchField: "keywordsText",
      filterFields: ["category", "isEnabled"],
    })
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["category", "isEnabled"],
    }),

  /**
   * Tracks individual skill usages for analytics
   */
  skillUsage: defineTable({
    skillName: v.string(),         // Skill that was used
    queryText: v.string(),         // Original search query
    wasSuccessful: v.boolean(),    // Whether execution succeeded
    executionTimeMs: v.optional(v.number()),
    toolsInvoked: v.optional(v.array(v.string())), // Tools used during skill execution
    userId: v.optional(v.id("users")),
  })
    .index("by_skill", ["skillName"])
    .index("by_skill_success", ["skillName", "wasSuccessful"]),

  /**
   * Caches skill search results to reduce latency
   */
  skillSearchCache: defineTable({
    queryHash: v.string(),         // Hash of normalized query
    queryText: v.string(),         // Original query text
    category: v.optional(v.string()),
    results: v.array(v.object({
      skillName: v.string(),
      score: v.number(),
      matchType: v.string(),
    })),
    expiresAt: v.number(),         // Unix timestamp for expiration
  })
    .index("by_hash", ["queryHash"])
    .index("by_expiry", ["expiresAt"]),

  /* ------------------------------------------------------------------ */
  /* TOOL REGISTRY - Atomic tool definitions                             */
  /* ------------------------------------------------------------------ */

  /**
   * Central catalog of all tools with BM25 + vector search capabilities
   */
  toolRegistry: defineTable({
    // Core identity
    toolName: v.string(),           // Unique tool identifier (e.g., "createDocument")

    // Searchable content
    description: v.string(),        // Full description for BM25 search
    keywords: v.array(v.string()),  // Keywords for keyword matching
    keywordsText: v.string(),       // Joined keywords for searchIndex

    // Classification
    category: v.string(),           // Category key (e.g., "document", "media")
    categoryName: v.string(),       // Human-readable category name

    // Module location
    module: v.string(),             // Import path (e.g., "document/documentTools")

    // Optional enhancements
    examples: v.optional(v.array(v.string())),  // Usage examples

    // Vector embedding for semantic search (1536-dim OpenAI text-embedding-3-small)
    embedding: v.optional(v.array(v.float64())),

    // Usage & ranking
    usageCount: v.number(),         // Times this tool was invoked
    successRate: v.optional(v.number()), // Success rate 0-1
    avgExecutionMs: v.optional(v.number()), // Average execution time

    // Status
    isEnabled: v.boolean(),         // Whether tool is available

    // Metadata
    metadata: v.optional(v.any()),
  })
    .index("by_toolName", ["toolName"])
    .index("by_category", ["category"])
    .index("by_usage", ["usageCount"])
    .index("by_enabled", ["isEnabled"])
    .index("by_enabled_category", ["isEnabled", "category"])
    .searchIndex("search_description", {
      searchField: "description",
      filterFields: ["category", "isEnabled"],
    })
    .searchIndex("search_keywords", {
      searchField: "keywordsText",
      filterFields: ["category", "isEnabled"],
    })
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["category", "isEnabled"],
    }),

  /**
   * Tracks individual tool invocations for analytics and popularity ranking
   */
  toolUsage: defineTable({
    toolName: v.string(),           // Tool that was invoked
    queryText: v.string(),          // Original search query
    wasSuccessful: v.boolean(),     // Whether execution succeeded
    executionTimeMs: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    userId: v.optional(v.id("users")),
  })
    .index("by_tool", ["toolName"])
    .index("by_tool_success", ["toolName", "wasSuccessful"]),

  /**
   * Caches hybrid search results to reduce latency
   */
  toolSearchCache: defineTable({
    queryHash: v.string(),          // SHA-256 hash of normalized query
    queryText: v.string(),          // Original query text
    category: v.optional(v.string()),
    results: v.array(v.object({
      toolName: v.string(),
      score: v.number(),
      matchType: v.string(),
    })),
    expiresAt: v.number(),          // Unix timestamp for expiration
  })
    .index("by_hash", ["queryHash"])
    .index("by_expiry", ["expiresAt"]),

  /* ------------------------------------------------------------------ */
  /* PUBLIC DOSSIERS - Daily AI-generated intelligence briefings        */
  /* No auth required - free for all users                              */
  /* ------------------------------------------------------------------ */
  publicDossiers: defineTable({
    sections: v.array(v.any()),     // ScrollySection[] - JSON structure for scrollytelling
    topic: v.string(),              // Topic/focus of the dossier (e.g., "AI Infrastructure")
    generatedAt: v.number(),        // Unix timestamp when generated
    dateString: v.string(),         // YYYY-MM-DD for easy querying
    version: v.number(),            // Version number for same-day updates
  })
    .index("by_date", ["generatedAt"])
    .index("by_date_string", ["dateString"]),

  /* ------------------------------------------------------------------ */
  /* DAILY BRIEF SNAPSHOTS - Automated morning dashboard metrics        */
  /* Generated daily at 6:00 AM UTC from aggregated feed data           */
  /* ------------------------------------------------------------------ */
  dailyBriefSnapshots: defineTable({
    dateString: v.string(),         // YYYY-MM-DD for easy querying
    generatedAt: v.number(),        // Unix timestamp when generated

    // Dashboard metrics for StickyDashboard component
    dashboardMetrics: v.object({
      meta: v.object({
        currentDate: v.string(),
        timelineProgress: v.number(),
      }),
      charts: v.object({
        trendLine: v.any(),         // TrendLineConfig
        marketShare: v.array(v.any()), // MarketShareSegment[]
      }),
      techReadiness: v.object({
        existing: v.number(),
        emerging: v.number(),
        sciFi: v.number(),
      }),
      keyStats: v.array(v.any()),   // KeyStat[]
      capabilities: v.array(v.any()), // CapabilityEntry[]
      annotations: v.optional(v.array(v.any())),
      agentCount: v.optional(v.object({
        count: v.number(),
        label: v.string(),
        speed: v.number(),
      })),
      entityGraph: v.optional(v.object({
        focusNodeId: v.optional(v.string()),
        nodes: v.array(v.object({
          id: v.string(),
          label: v.string(),
          type: v.optional(v.string()),
          importance: v.optional(v.number()),
          tier: v.optional(v.number()),
        })),
        edges: v.array(v.object({
          source: v.string(),
          target: v.string(),
          relationship: v.optional(v.string()),
          context: v.optional(v.string()),
          impact: v.optional(v.string()),
          order: v.optional(v.union(v.literal("primary"), v.literal("secondary"))),
        })),
      })),
    }),

    // Source data summary
    sourceSummary: v.object({
      totalItems: v.number(),
      bySource: v.any(),            // { "HackerNews": 15, "GitHub": 20, ... }
      byCategory: v.any(),          // { "ai_ml": 25, "tech": 10, ... }
      topTrending: v.array(v.string()), // Top 5 trending topics
    }),

    // Generation metadata
    version: v.number(),            // Version number for same-day updates
    processingTimeMs: v.optional(v.number()),
    errors: v.optional(v.array(v.string())),
  })
    .index("by_date_string", ["dateString"])
    .index("by_generated_at", ["generatedAt"]),

  /* ------------------------------------------------------------------ */
  /* DAILY BRIEF DOMAIN MEMORY - Two-agent persistent backlog/state     */
  /* Derived from dailyBriefSnapshots and advanced by worker agent      */
  /* ------------------------------------------------------------------ */
  dailyBriefMemories: defineTable({
    snapshotId: v.id("dailyBriefSnapshots"),
    dateString: v.string(),         // YYYY-MM-DD
    generatedAt: v.number(),        // Mirrors snapshot.generatedAt
    version: v.number(),            // Mirrors snapshot.version

    goal: v.string(),               // High-level daily objective

    features: v.array(v.object({
      id: v.string(),
      type: v.string(),             // e.g. "repo_analysis", "paper_summary"
      name: v.string(),
      status: v.union(
        v.literal("pending"),
        v.literal("failing"),
        v.literal("passing"),
      ),
      priority: v.optional(v.number()),
      testCriteria: v.string(),
      sourceRefs: v.optional(v.any()), // Links to feed items/repos/papers/docs/charts
      notes: v.optional(v.string()),
      resultId: v.optional(v.id("dailyBriefTaskResults")),
      updatedAt: v.number(),
    })),

    progressLog: v.array(v.object({
      ts: v.number(),
      status: v.union(
        v.literal("info"),
        v.literal("pending"),
        v.literal("working"),
        v.literal("passing"),
        v.literal("failing"),
        v.literal("error"),
      ),
      message: v.string(),
      meta: v.optional(v.any()),
    })),

    context: v.any(),               // Compacted machine-readable context bundle

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_snapshot", ["snapshotId"])
    .index("by_date_string", ["dateString"])
    .index("by_generated_at", ["generatedAt"]),

  /* ------------------------------------------------------------------ */
  /* DAILY BRIEF TASK RESULTS - Artifacts produced by worker tasks      */
  /* ------------------------------------------------------------------ */
  dailyBriefTaskResults: defineTable({
    memoryId: v.id("dailyBriefMemories"),
    taskId: v.string(),
    resultMarkdown: v.string(),
    citations: v.optional(v.any()),
    artifacts: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_memory", ["memoryId"])
    .index("by_task", ["taskId"]),

  /* ------------------------------------------------------------------ */
  /* DAILY BRIEF PERSONAL OVERLAYS - Per-user derived tasks/state        */
  /* Built from tracked hashtags, docs, teachings                        */
  /* ------------------------------------------------------------------ */
  dailyBriefPersonalOverlays: defineTable({
    userId: v.id("users"),
    memoryId: v.id("dailyBriefMemories"),
    dateString: v.string(),

    features: v.array(v.object({
      id: v.string(),
      type: v.string(),
      name: v.string(),
      status: v.union(
        v.literal("pending"),
        v.literal("failing"),
        v.literal("passing"),
      ),
      priority: v.optional(v.number()),
      testCriteria: v.string(),
      sourceRefs: v.optional(v.any()),
      notes: v.optional(v.string()),
      resultMarkdown: v.optional(v.string()),
      updatedAt: v.number(),
    })),

    progressLog: v.array(v.object({
      ts: v.number(),
      status: v.union(
        v.literal("info"),
        v.literal("pending"),
        v.literal("working"),
        v.literal("passing"),
        v.literal("failing"),
        v.literal("error"),
      ),
      message: v.string(),
      meta: v.optional(v.any()),
    })),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_memory", ["userId", "memoryId"])
    .index("by_user_date", ["userId", "dateString"]),

  /* ------------------------------------------------------------------ */
  /* LLM USAGE TRACKING - Daily aggregates for rate limiting            */
  /* ------------------------------------------------------------------ */
  llmUsageDaily: defineTable({
    userId: v.id("users"),
    date: v.string(),               // YYYY-MM-DD
    requests: v.number(),           // Total requests today
    totalTokens: v.number(),        // Total tokens (input + output)
    inputTokens: v.number(),        // Total input tokens
    outputTokens: v.number(),       // Total output tokens
    cachedTokens: v.number(),       // Cached input tokens (discounted)
    totalCost: v.number(),          // Total cost in USD
    successCount: v.number(),       // Successful requests
    errorCount: v.number(),         // Failed requests
    providers: v.optional(v.any()), // { openai: 5, anthropic: 3 }
    models: v.optional(v.any()),    // { "gpt-5.2": 3, "claude-sonnet-4.5": 2 }
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "date"])
    .index("by_date", ["date"]),

  /* ------------------------------------------------------------------ */
  /* LLM USAGE LOG - Detailed per-request log for analytics             */
  /* ------------------------------------------------------------------ */
  llmUsageLog: defineTable({
    userId: v.id("users"),
    timestamp: v.number(),
    model: v.string(),              // e.g., "gpt-5.2", "claude-sonnet-4.5"
    provider: v.string(),           // "openai", "anthropic", "gemini"
    inputTokens: v.number(),
    outputTokens: v.number(),
    cachedTokens: v.number(),
    cost: v.number(),               // Cost in USD
    latencyMs: v.optional(v.number()),
    success: v.boolean(),
    errorMessage: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_timestamp", ["userId", "timestamp"])
    .index("by_model", ["model"])
    .index("by_provider", ["provider"]),

  /* ------------------------------------------------------------------ */
  /* SEARCH RUNS - Observability for multi-source search fusion          */
  /* ------------------------------------------------------------------ */
  searchRuns: defineTable({
    userId: v.optional(v.id("users")),
    threadId: v.optional(v.string()),      // Agent thread ID if from agent
    query: v.string(),                      // The search query
    mode: v.string(),                       // "fast" | "balanced" | "comprehensive"
    sourcesRequested: v.array(v.string()),  // Sources requested
    sourcesQueried: v.array(v.string()),    // Sources actually queried
    totalResults: v.number(),               // Total results after fusion
    totalBeforeFusion: v.number(),          // Total results before fusion
    reranked: v.boolean(),                  // Whether LLM reranking was applied
    totalTimeMs: v.number(),                // Total execution time
    cacheHit: v.optional(v.boolean()),      // Whether cache was hit
    timestamp: v.number(),                  // When search was executed
    fusedResultIds: v.optional(v.array(v.string())), // IDs of fused results
  })
    .index("by_user", ["userId"])
    .index("by_user_timestamp", ["userId", "timestamp"])
    .index("by_timestamp", ["timestamp"])
    .index("by_mode", ["mode"])
    .index("by_thread", ["threadId"]),

  /* ------------------------------------------------------------------ */
  /* SEARCH RUN RESULTS - Per-source results for each search run         */
  /* ------------------------------------------------------------------ */
  searchRunResults: defineTable({
    searchRunId: v.id("searchRuns"),        // Reference to parent search run
    source: v.string(),                      // "linkup" | "youtube" | "arxiv" etc.
    latencyMs: v.number(),                   // Time taken for this source
    resultCount: v.number(),                 // Number of results from this source
    success: v.boolean(),                    // Whether source search succeeded
    errorMessage: v.optional(v.string()),    // Error message if failed
    resultIds: v.optional(v.array(v.string())), // IDs of results from this source
  })
    .index("by_search_run", ["searchRunId"])
    .index("by_source", ["source"])
    .index("by_source_success", ["source", "success"]),

  /* ------------------------------------------------------------------ */
  /* SEARCH FUSION CACHE - TTL-based cache for fusion search results     */
  /* ------------------------------------------------------------------ */
  searchFusionCache: defineTable({
    cacheKey: v.string(),                   // hash(query + sources + mode + userId)
    query: v.string(),                      // Original query
    mode: v.string(),                       // Search mode
    sources: v.array(v.string()),           // Sources queried
    results: v.string(),                    // JSON-stringified results
    resultCount: v.number(),                // Number of results
    createdAt: v.number(),                  // When cache entry was created
    expiresAt: v.number(),                  // When cache expires
    hitCount: v.optional(v.number()),       // Number of times cache was hit
  })
    .index("by_cache_key", ["cacheKey"])
    .index("by_expires_at", ["expiresAt"])
    .index("by_query", ["query"]),

  /* ------------------------------------------------------------------ */
  /* DIGEST SUMMARY CACHE - Cached AI-generated digest summaries        */
  /* Avoids regenerating LLM summary on every component mount           */
  /* ------------------------------------------------------------------ */
  digestSummaryCache: defineTable({
    dateString: v.string(),                 // YYYY-MM-DD
    userId: v.optional(v.id("users")),      // Optional: per-user personalization
    summary: v.string(),                    // AI-generated summary text
    dataHash: v.string(),                   // Hash of input data (for invalidation)
    generatedAt: v.number(),                // When summary was generated
    expiresAt: v.number(),                  // TTL expiration (4 hours from generation)
    hitCount: v.optional(v.number()),       // Cache hit counter
  })
    .index("by_date", ["dateString"])
    .index("by_date_user", ["dateString", "userId"])
    .index("by_expires_at", ["expiresAt"]),

});
