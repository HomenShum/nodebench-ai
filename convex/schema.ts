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

// Email schema imports
import {
  emailLabels,
  emailThreads,
  emailMessages,
  emailDailyReports,
  emailProcessingQueue,
  emailSyncState,
} from "./schema/emailSchema";

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

  // ═══════════════════════════════════════════════════════════════════
  // LINKED ARTIFACTS (for citation tracking)
  // ═══════════════════════════════════════════════════════════════════
  linkedArtifacts: v.optional(v.array(v.object({
    artifactId: v.id("sourceArtifacts"),
    citationKey: v.string(),      // e.g., "[1]"
    addedAt: v.number(),
    addedBy: v.id("users"),
  }))),

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
/* 7b. TELEGRAM USERS - Telegram bot user preferences                 */
/* ------------------------------------------------------------------ */
export const telegramUsers = defineTable({
  telegramChatId: v.string(),           // Telegram chat ID (unique per user)
  telegramUsername: v.optional(v.string()),
  firstName: v.optional(v.string()),
  notificationsEnabled: v.boolean(),
  createdAt: v.number(),
  lastActiveAt: v.number(),
})
  .index("by_chat_id", ["telegramChatId"])
  .index("by_last_active", ["lastActiveAt"]);

/* ------------------------------------------------------------------ */
/* 7c. TELEGRAM MESSAGES - Message log for audit/context              */
/* ------------------------------------------------------------------ */
export const telegramMessages = defineTable({
  telegramChatId: v.string(),
  messageText: v.string(),
  messageType: v.string(),              // "incoming" | "outgoing"
  messageId: v.optional(v.number()),    // Telegram message ID
  agentResponse: v.optional(v.string()),
  timestamp: v.number(),
})
  .index("by_chat_id", ["telegramChatId"])
  .index("by_timestamp", ["timestamp"])
  .index("by_chat_timestamp", ["telegramChatId", "timestamp"]);

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
  userId: v.optional(v.id("users")),
  threadId: v.optional(v.string()),
  documentId: v.optional(v.id("documents")),
  mcpServerId: v.optional(v.id("mcpServers")),
  model: v.optional(v.string()),
  workflow: v.optional(v.string()),
  args: v.optional(v.any()),
  openaiVariant: v.optional(v.string()),
  status: v.union(
    v.literal("pending"),
    v.literal("queued"),
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

  // Distributed work leasing (optional / backwards compatible)
  leaseOwner: v.optional(v.string()),
  leaseExpiresAt: v.optional(v.number()),
  priority: v.optional(v.number()),
  availableAt: v.optional(v.number()),

  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_threadId", ["threadId"])
  .index("by_createdAt", ["createdAt"])
  .index("by_user_createdAt", ["userId", "createdAt"])
  .index("by_status_availableAt", ["status", "availableAt"])
  .index("by_leaseExpiresAt", ["leaseExpiresAt"]);

/* ------------------------------------------------------------------ */
/* SOURCE ARTIFACTS - unified durable snapshots of external sources    */
/* ------------------------------------------------------------------ */
const sourceArtifacts = defineTable({
  runId: v.optional(v.id("agentRuns")),
  sourceType: v.union(
    v.literal("url_fetch"),
    v.literal("api_response"),
    v.literal("file_upload"),
    v.literal("extracted_text"),
    v.literal("video_transcript"),
  ),
  sourceUrl: v.optional(v.string()),
  contentHash: v.string(),
  rawContent: v.optional(v.string()),
  extractedData: v.optional(v.any()),
  fetchedAt: v.number(),
  expiresAt: v.optional(v.number()),
})
  .index("by_run", ["runId", "fetchedAt"])
  .index("by_hash", ["contentHash"])
  .index("by_sourceUrl_hash", ["sourceUrl", "contentHash"])
  .index("by_sourceUrl", ["sourceUrl", "fetchedAt"]);

/* ------------------------------------------------------------------ */
/* TOOL HEALTH - adaptive routing telemetry + circuit breaker          */
/* ------------------------------------------------------------------ */
const toolHealth = defineTable({
  toolName: v.string(),
  successCount: v.number(),
  failureCount: v.number(),
  avgLatencyMs: v.number(),
  lastSuccessAt: v.optional(v.number()),
  lastFailureAt: v.optional(v.number()),
  lastError: v.optional(v.string()),
  consecutiveFailures: v.optional(v.number()),
  circuitOpen: v.boolean(),
  circuitOpenedAt: v.optional(v.number()),
})
  .index("by_toolName", ["toolName"])
  .index("by_circuitOpen", ["circuitOpen", "toolName"]);

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
/* INSTAGRAM POSTS - Social media content ingestion                    */
/* ------------------------------------------------------------------ */
const instagramPosts = defineTable({
  userId: v.id("users"),
  postUrl: v.string(),
  shortcode: v.optional(v.string()),              // Instagram post ID
  mediaType: v.union(
    v.literal("image"),
    v.literal("video"),
    v.literal("carousel")
  ),
  caption: v.optional(v.string()),
  transcript: v.optional(v.string()),              // Gemini video transcription
  extractedClaims: v.optional(v.array(v.object({
    claim: v.string(),
    confidence: v.number(),                        // 0-1
    sourceTimestamp: v.optional(v.number()),       // seconds into video
    category: v.optional(v.string()),              // "financial", "product", "opinion"
  }))),
  mediaStorageId: v.optional(v.id("_storage")),    // Downloaded media
  thumbnailUrl: v.optional(v.string()),
  authorUsername: v.optional(v.string()),
  authorFullName: v.optional(v.string()),
  likeCount: v.optional(v.number()),
  commentCount: v.optional(v.number()),
  postedAt: v.optional(v.number()),                // Original post timestamp
  fetchedAt: v.number(),
  status: v.union(
    v.literal("pending"),
    v.literal("transcribing"),
    v.literal("analyzing"),
    v.literal("completed"),
    v.literal("error")
  ),
  errorMessage: v.optional(v.string()),
  // Fact-check verification results
  verificationResults: v.optional(v.array(v.object({
    claim: v.string(),
    status: v.string(),                             // "verified", "partially_verified", "unverified", "false"
    explanation: v.string(),
    sources: v.array(v.object({
      name: v.string(),
      url: v.optional(v.string()),
      credibility: v.string(),                      // "high", "medium", "low"
    })),
    confidence: v.number(),                         // 0-1
  }))),
  verifiedAt: v.optional(v.number()),               // When verification completed
})
  .index("by_user", ["userId"])
  .index("by_url", ["postUrl"])
  .index("by_shortcode", ["shortcode"])
  .index("by_status", ["status"])
  .index("by_verified", ["verifiedAt"]);


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
  userId: v.optional(v.id("users")),    // Optional for anonymous users
  anonymousSessionId: v.optional(v.string()), // Session ID for anonymous users
  title: v.string(),
  model: v.optional(v.string()),
  agentThreadId: v.optional(v.string()), // Links to agent component thread for memory management
  pinned: v.optional(v.boolean()),
  cancelRequested: v.optional(v.boolean()),
  cancelRequestedAt: v.optional(v.number()),
  workflowProgress: v.optional(v.any()), // Stores Deep Agent steps: { steps: [...], status: "running"|"completed" }
  // Swarm support - links thread to parallel agent swarm
  swarmId: v.optional(v.string()),       // Links to agentSwarms table
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_user_pinned", ["userId", "pinned"])
  .index("by_updatedAt", ["updatedAt"])
  .index("by_user_updatedAt", ["userId", "updatedAt"])
  .index("by_agentThreadId", ["agentThreadId"])
  .index("by_anonymous_session", ["anonymousSessionId"])
  .index("by_swarmId", ["swarmId"]);

const chatMessagesStream = defineTable({
  threadId: v.id("chatThreadsStream"),
  userId: v.optional(v.id("users")),    // Optional for anonymous users
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
  // Default channel for digest/notification delivery
  defaultChannelId: v.optional(v.string()),
  defaultChannelName: v.optional(v.string()),
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

const linkedinAccounts = defineTable({
  userId: v.id("users"),
  provider: v.literal("linkedin"),
  personUrn: v.optional(v.string()),         // urn:li:person:{id}
  displayName: v.optional(v.string()),
  email: v.optional(v.string()),
  profilePictureUrl: v.optional(v.string()),
  accessToken: v.string(),
  refreshToken: v.optional(v.string()),
  scope: v.optional(v.string()),             // e.g., "w_member_social openid email"
  expiresAt: v.optional(v.number()),         // ms since epoch
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_user_provider", ["userId", "provider"]);

/* ------------------------------------------------------------------ */
/* LINKEDIN FUNDING POSTS - Track posted companies for deduplication  */
/* Enables referencing previous posts and progression tracking        */
/* ------------------------------------------------------------------ */
const linkedinFundingPosts = defineTable({
  // Company identification (normalized to lowercase for dedup)
  companyNameNormalized: v.string(),         // Lowercase, trimmed company name
  companyName: v.string(),                   // Original display name

  // Funding round info (at time of posting)
  roundType: v.string(),                     // "seed", "series-a", etc.
  amountRaw: v.string(),                     // "$50M"
  amountUsd: v.optional(v.number()),         // Normalized USD

  // Sector categorization for filtering
  sector: v.optional(v.string()),            // "HealthTech", "AI/ML", etc.
  sectorCategory: v.optional(v.string()),    // "healthcare", "technology", etc.

  // Post details
  postUrn: v.string(),                       // LinkedIn post URN
  postUrl: v.string(),                       // Full URL to post
  postPart: v.optional(v.number()),          // Which part of multi-part post (1, 2, 3)
  totalParts: v.optional(v.number()),        // Total parts in series

  // Reference to previous posts for same company (progression tracking)
  previousPostId: v.optional(v.id("linkedinFundingPosts")),
  progressionType: v.optional(v.union(
    v.literal("new"),                        // First mention
    v.literal("update"),                     // Same round, updated info
    v.literal("next-round")                  // Company raised new round
  )),

  // Timestamps
  postedAt: v.number(),
  fundingEventId: v.optional(v.id("fundingEvents")),
})
  .index("by_company", ["companyNameNormalized"])
  .index("by_company_round", ["companyNameNormalized", "roundType"])
  .index("by_postedAt", ["postedAt"])
  .index("by_sector", ["sectorCategory", "postedAt"])
  .index("by_roundType", ["roundType", "postedAt"])
  .searchIndex("search_company", {
    searchField: "companyName",
    filterFields: ["roundType", "sectorCategory"],
  });

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

  // ─── Encounter Capture (Slack/Email Distribution) ───────────────────────
  sourceType: v.optional(v.union(
    v.literal("manual"),         // User created in UI
    v.literal("slack"),          // Captured from Slack
    v.literal("email_forward"),  // Forwarded email ingest
  )),
  sourceId: v.optional(v.string()),           // Slack message ts, email ID
  sourceChannelId: v.optional(v.string()),    // Slack channel ID

  // Encounter-specific nested object for professional networking capture
  encounter: v.optional(v.object({
    participants: v.array(v.object({
      name: v.string(),
      role: v.optional(v.string()),
      company: v.optional(v.string()),
      email: v.optional(v.string()),
      linkedEntityId: v.optional(v.id("entityContexts")),
    })),
    companies: v.array(v.object({
      name: v.string(),
      linkedEntityId: v.optional(v.id("entityContexts")),
    })),
    context: v.optional(v.string()),          // Meeting context/topic
    followUpRequested: v.optional(v.boolean()),
    rawText: v.optional(v.string()),          // Original message/email content
    researchStatus: v.optional(v.union(
      v.literal("none"),
      v.literal("fast_pass"),
      v.literal("deep_dive"),
      v.literal("complete"),
    )),
  })),
})
  .index("by_user", ["userId"])
  .index("by_user_status", ["userId", "status"]) // Kanban, filters
  .index("by_user_dueDate", ["userId", "dueDate"]) // Today/Week queries
  .index("by_user_priority", ["userId", "priority"]) // prioritization
  .index("by_user_updatedAt", ["userId", "updatedAt"]) // recent activity
  .index("by_user_assignee", ["userId", "assigneeId"]) // filtering by assignee
  .index("by_document", ["documentId"])
  .index("by_user_sourceType", ["userId", "sourceType"]); // Encounter queries



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
/* LANDING PAGE LOG - Public, append-only "signals" style feed         */
/* Used by #signals route + system crons (morning brief)               */
/* ------------------------------------------------------------------ */
const landingPageLog = defineTable({
  day: v.string(), // YYYY-MM-DD (UTC)
  kind: v.union(
    v.literal("signal"),
    v.literal("funding"),
    v.literal("brief"),
    v.literal("note"),
    v.literal("system"),
  ),
  title: v.string(),
  markdown: v.string(),
  source: v.optional(v.string()),
  url: v.optional(v.string()),
  tags: v.optional(v.array(v.string())),
  userId: v.optional(v.id("users")),
  anonymousSessionId: v.optional(v.string()),
  agentThreadId: v.optional(v.string()),
  meta: v.optional(v.any()),
  createdAt: v.number(),
})
  .index("by_createdAt", ["createdAt"])
  .index("by_day_createdAt", ["day", "createdAt"])
  .index("by_anon_day_createdAt", ["anonymousSessionId", "day", "createdAt"])
  .index("by_agent_thread", ["agentThreadId", "createdAt"]);

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

/* ------------------------------------------------------------------ */
/* CROSS-PROVIDER SEARCH EVALUATION - Consistency across providers     */
/* ------------------------------------------------------------------ */
/**
 * Individual query evaluation results across multiple providers.
 * Measures consistency, overlap, and score normalization.
 */
const searchCrossProviderEvals = defineTable({
  evalId: v.string(),                       // Unique evaluation ID
  evalVersion: v.string(),                  // Evaluation harness version
  query: v.string(),                        // Search query
  category: v.string(),                     // Category (funding, tech_news, company, etc.)
  timestamp: v.number(),                    // When evaluated
  providerResults: v.string(),              // JSON: per-provider results
  metrics: v.string(),                      // JSON: cross-provider metrics
})
  .index("by_eval_id", ["evalId"])
  .index("by_category", ["category"])
  .index("by_timestamp", ["timestamp"]);

/**
 * Baseline snapshots for A/B comparison of search refinements.
 * Aggregates metrics across multiple query evaluations.
 */
const searchBaselineSnapshots = defineTable({
  snapshotId: v.string(),                   // Unique snapshot ID
  snapshotVersion: v.string(),              // Evaluation harness version
  createdAt: v.number(),                    // When created
  queryCount: v.number(),                   // Number of queries evaluated
  aggregateMetrics: v.string(),             // JSON: aggregate metrics
  evaluationIds: v.array(v.string()),       // Individual evaluation IDs
})
  .index("by_snapshot_id", ["snapshotId"])
  .index("by_created", ["createdAt"]);

/* ------------------------------------------------------------------ */
/* AGENT EVALUATION RUNS - Boolean-based agent response evaluation     */
/* ------------------------------------------------------------------ */
/**
 * Tracks evaluation runs against ground truth test queries.
 * Supports both anonymous (sessionId) and authenticated (userId) modes.
 *
 * Used for continuous testing of agent response quality.
 */
const evaluationRuns = defineTable({
  sessionId: v.string(),                    // Session ID (for anonymous) or derived from userId
  userId: v.optional(v.id("users")),        // Optional user ID (for authenticated)
  mode: v.union(
    v.literal("anonymous"),
    v.literal("authenticated"),
    v.literal("batch"),
  ),
  status: v.union(
    v.literal("running"),
    v.literal("completed"),
    v.literal("failed"),
  ),
  // Query tracking
  queryIds: v.array(v.string()),            // List of test query IDs to run
  completedQueries: v.number(),
  passedQueries: v.number(),
  failedQueries: v.number(),
  // Individual results
  results: v.array(v.object({
    queryId: v.string(),
    query: v.string(),
    persona: v.string(),
    expectedOutcome: v.string(),
    actualOutcome: v.string(),
    passed: v.boolean(),
    containsRequired: v.boolean(),
    noForbidden: v.boolean(),
    failureReasons: v.array(v.string()),
    responseLength: v.number(),
    responseSnippet: v.optional(v.string()),
    executedAt: v.number(),
  })),
  // Summary
  summary: v.optional(v.object({
    total: v.number(),
    passed: v.number(),
    failed: v.number(),
    passRate: v.number(),
    isPassing: v.boolean(),
    threshold: v.number(),
  })),
  // Timestamps
  startedAt: v.number(),
  updatedAt: v.optional(v.number()),
  completedAt: v.optional(v.number()),
  // Error tracking
  error: v.optional(v.string()),
})
  .index("by_session", ["sessionId"])

/**
 * Persona Episode Evaluation Scenarios
 *
 * Stores the 100 test scenarios for persona episode evaluation.
 * Loaded from persona-episode-eval-pack-v2.json during migration.
 */
const evaluation_scenarios = defineTable({
  scenarioId: v.string(),                   // Unique scenario ID (e.g., "banker_vague_disco")
  name: v.string(),                         // Human-readable name
  query: v.string(),                        // The test query/prompt
  expectedPersona: v.string(),              // Expected persona (e.g., "JPM_STARTUP_BANKER")
  expectedEntityId: v.string(),             // Expected entity ground truth ID
  allowedPersonas: v.optional(v.array(v.string())),  // Optional: multiple allowed personas
  domain: v.optional(v.string()),           // Domain category (e.g., "finance", "tech", "medical")
  // Behavioral requirements
  requirements: v.optional(v.object({
    minToolCalls: v.optional(v.number()),
    maxToolCalls: v.optional(v.number()),
    maxCostUsd: v.optional(v.number()),
    maxClarifyingQuestions: v.optional(v.number()),
    requireVerificationStep: v.optional(v.boolean()),
    requireProviderUsage: v.optional(v.boolean()),
    requireTools: v.optional(v.array(v.string())),
  })),
  // Metadata
  createdAt: v.number(),
  version: v.optional(v.string()),          // Pack version (e.g., "v2")
})
  .index("by_scenario_id", ["scenarioId"])
  .index("by_domain", ["domain"]);

/* ------------------------------------------------------------------ */
/* DIGEST CACHE - Agent-generated digest storage                       */
/* ------------------------------------------------------------------ */
const digestCache = defineTable({
  dateString: v.string(),                    // YYYY-MM-DD
  persona: v.string(),                       // GENERAL, JPM_STARTUP_BANKER, etc.
  model: v.string(),                         // claude-haiku-4.5, etc.
  // Raw agent output
  rawText: v.string(),                       // Full LLM response
  // Parsed digest
  digest: v.object({
    dateString: v.string(),
    narrativeThesis: v.string(),
    leadStory: v.optional(v.object({
      title: v.string(),
      url: v.optional(v.string()),
      whyItMatters: v.string(),
      reflection: v.optional(v.object({
        what: v.string(),
        soWhat: v.string(),
        nowWhat: v.string(),
      })),
    })),
    signals: v.array(v.object({
      title: v.string(),
      url: v.optional(v.string()),
      summary: v.string(),
      hardNumbers: v.optional(v.string()),
      directQuote: v.optional(v.string()),
      reflection: v.optional(v.object({
        what: v.string(),
        soWhat: v.string(),
        nowWhat: v.string(),
      })),
    })),
    actionItems: v.array(v.object({
      persona: v.string(),
      action: v.string(),
    })),
    entitySpotlight: v.optional(v.array(v.object({
      name: v.string(),
      type: v.string(),
      keyInsight: v.string(),
      fundingStage: v.optional(v.string()),
    }))),
    storyCount: v.number(),
    topSources: v.array(v.string()),
    topCategories: v.array(v.string()),
    processingTimeMs: v.number(),
  }),
  // Formatted outputs (for different channels)
  ntfyPayload: v.optional(v.object({
    title: v.string(),
    body: v.string(),
  })),
  slackPayload: v.optional(v.string()),
  emailPayload: v.optional(v.string()),
  // Usage tracking
  usage: v.object({
    inputTokens: v.number(),
    outputTokens: v.number(),
    model: v.optional(v.string()),
  }),
  feedItemCount: v.number(),
  // Metadata
  createdAt: v.number(),
  expiresAt: v.number(),                     // TTL for cache invalidation
  sentToNtfy: v.optional(v.boolean()),
  sentToSlack: v.optional(v.boolean()),
  sentToEmail: v.optional(v.boolean()),
})
  .index("by_date_persona", ["dateString", "persona"])
  .index("by_date", ["dateString"])
  .index("by_expires", ["expiresAt"]);

/* ------------------------------------------------------------------ */
/* SCHEDULED REPORTS - Automated PDF report generation                 */
/* ------------------------------------------------------------------ */
const scheduledReports = defineTable({
  storageId: v.string(),                     // Convex storage ID for the PDF file
  fileName: v.string(),                      // Human-readable filename
  fileSize: v.number(),                      // File size in bytes
  reportType: v.string(),                    // "weekly-digest", "monthly-summary", "quarterly-funding-summary"
  title: v.string(),                         // Report title
  description: v.string(),                   // Report description
  quarterLabel: v.string(),                  // Period label (e.g., "Q4 2025", "Week of Jan 14")
  totalDeals: v.number(),                    // Number of deals in report
  totalAmountUsd: v.number(),                // Total funding amount
  generatedAt: v.number(),                   // Timestamp when generated
  status: v.string(),                        // "pending", "generating", "completed", "failed"
  distributedTo: v.optional(v.array(v.string())), // Channels distributed to
  error: v.optional(v.string()),             // Error message if failed
})
  .index("by_report_type", ["reportType"])
  .index("by_generated_at", ["generatedAt"])
  .index("by_status", ["status"]);

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
  sourceArtifacts,
  toolHealth,
  agentRunEvents,
  instagramPosts,
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
  linkedinAccounts,
  linkedinFundingPosts,
  userApiKeys,
  dailyUsage,
  subscriptions,
  agentTimelines,
  agentTasks,
  agentLinks,
  agentTimelineRuns,
  agentImageResults,
  voiceSessions,
  landingPageLog,
  feedItems,
  repoStatsCache,
  paperDetailsCache,
  stackImpactCache,
  modelComparisonCache,
  dealFlowCache,
  repoScoutCache,
  strategyMetricsCache,
  searchEvaluations,
  searchCrossProviderEvals,
  searchBaselineSnapshots,
  evaluationRuns,
  evaluation_scenarios,
  digestCache,

  /* ------------------------------------------------------------------ */
  /* AGENT SWARMS - Parallel SubAgent Orchestration                     */
  /* Implements Fan-Out/Gather pattern for parallel agent execution     */
  /* ------------------------------------------------------------------ */

  /**
   * Swarm definitions - groups of parallel agents working together.
   * Each swarm is linked to a thread for UI display.
   */
  agentSwarms: defineTable({
    swarmId: v.string(),                   // UUID for this swarm
    userId: v.id("users"),                 // Owner
    threadId: v.string(),                  // Associated chatThreadsStream._id

    // Swarm definition
    name: v.optional(v.string()),          // User-defined name (e.g., "Research Team")
    query: v.string(),                     // Original user query
    pattern: v.union(
      v.literal("fan_out_gather"),         // Parallel then merge (default)
      v.literal("pipeline"),               // Sequential handoff
      v.literal("swarm"),                  // Autonomous collaboration
    ),

    // Status
    status: v.union(
      v.literal("pending"),
      v.literal("spawning"),
      v.literal("executing"),
      v.literal("gathering"),
      v.literal("synthesizing"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled"),
    ),

    // Agent configurations
    agentConfigs: v.array(v.object({
      agentName: v.string(),               // DocumentAgent, MediaAgent, etc.
      role: v.string(),                    // Role description
      query: v.string(),                   // Task for this agent
      stateKeyPrefix: v.string(),          // Unique namespace: "agent_name:key"
    })),

    // Results
    mergedResult: v.optional(v.string()),
    confidence: v.optional(v.number()),    // 0-1 confidence score

    // Timing
    createdAt: v.number(),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    elapsedMs: v.optional(v.number()),
  })
    .index("by_swarm", ["swarmId"])
    .index("by_thread", ["threadId"])
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"]),

  /**
   * Individual agent tasks within a swarm.
   * Each task represents one agent's work.
   */
  swarmAgentTasks: defineTable({
    swarmId: v.string(),
    taskId: v.string(),                    // UUID
    delegationId: v.optional(v.string()),  // Links to agentDelegations

    // Agent assignment
    agentName: v.string(),
    query: v.string(),
    role: v.string(),

    // State isolation
    stateKeyPrefix: v.string(),            // e.g., "DocumentAgent:research"

    // Status
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled"),
    ),

    // Results
    result: v.optional(v.string()),
    resultSummary: v.optional(v.string()),

    // Timing
    createdAt: v.number(),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    elapsedMs: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
  })
    .index("by_swarm", ["swarmId"])
    .index("by_task", ["taskId"])
    .index("by_swarm_status", ["swarmId", "status"]),

  /**
   * Cross-agent context sharing with unique key isolation.
   * Prevents race conditions via namespaced keys.
   */
  swarmContextSharing: defineTable({
    swarmId: v.string(),

    // Namespaced key: "{agentName}:{type}:{specificKey}"
    key: v.string(),

    // Context data
    value: v.any(),
    valueType: v.union(
      v.literal("discovery"),              // New fact discovered
      v.literal("artifact"),               // File/URL reference
      v.literal("question"),               // Follow-up question
      v.literal("synthesis"),              // Partial synthesis
    ),

    // Provenance
    sourceAgentName: v.string(),
    sourceTaskId: v.string(),

    createdAt: v.number(),
  })
    .index("by_swarm", ["swarmId"])
    .index("by_key", ["key"])
    .index("by_swarm_type", ["swarmId", "valueType"]),

  /* ------------------------------------------------------------------ */
  /* PARALLEL TASK TREE - Deep Agent 2.0 Decision Tree Execution        */
  /* Implements A -> B1, B2, B3 -> verify -> cross-check -> merge       */
  /* ------------------------------------------------------------------ */

  /**
   * Root task tree for a given agent thread/run.
   * One tree per user query, tracks overall status and final merged result.
   */
  parallelTaskTrees: defineTable({
    userId: v.id("users"),
    agentThreadId: v.string(),           // Links to agent conversation
    rootTaskId: v.optional(v.string()),  // ID of root task node
    query: v.string(),                   // Original user query
    status: v.union(
      v.literal("decomposing"),          // Breaking into subtasks
      v.literal("executing"),            // Running parallel branches
      v.literal("verifying"),            // Verification phase
      v.literal("cross_checking"),       // Cross-checking results
      v.literal("merging"),              // Merging surviving paths
      v.literal("completed"),            // Done
      v.literal("failed"),               // Terminal failure
    ),
    phase: v.optional(v.string()),       // Current phase description
    phaseProgress: v.optional(v.number()), // 0-100 progress within phase

    // Execution stats
    totalBranches: v.optional(v.number()),
    activeBranches: v.optional(v.number()),
    completedBranches: v.optional(v.number()),
    prunedBranches: v.optional(v.number()),

    // Final result
    mergedResult: v.optional(v.string()),
    confidence: v.optional(v.number()),   // 0-1 final confidence

    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),

    // Performance metrics
    elapsedMs: v.optional(v.number()),
    tokenUsage: v.optional(v.object({
      input: v.number(),
      output: v.number(),
    })),
  })
    .index("by_user", ["userId"])
    .index("by_agent_thread", ["agentThreadId"])
    .index("by_status", ["status"])
    .index("by_user_createdAt", ["userId", "createdAt"]),

  /**
   * Individual task nodes in the parallel execution tree.
   * Forms a DAG with parent-child relationships.
   */
  parallelTaskNodes: defineTable({
    treeId: v.id("parallelTaskTrees"),
    taskId: v.string(),                  // Stable unique ID (uuid)
    parentTaskId: v.optional(v.string()), // Null for root

    // Task info
    title: v.string(),
    description: v.optional(v.string()),
    taskType: v.union(
      v.literal("root"),                 // Root decomposition task
      v.literal("branch"),               // Parallel exploration branch
      v.literal("verification"),         // Verifier task
      v.literal("critique"),             // Critique/cross-check task
      v.literal("merge"),                // Merge surviving paths
      v.literal("refinement"),           // Post-merge refinement
    ),

    // Execution state
    status: v.union(
      v.literal("pending"),              // Waiting to execute
      v.literal("running"),              // Currently executing
      v.literal("awaiting_children"),    // Waiting for child tasks
      v.literal("verifying"),            // In verification
      v.literal("completed"),            // Done successfully
      v.literal("pruned"),               // Pruned (didn't survive verification)
      v.literal("failed"),               // Execution error
      v.literal("backtracked"),          // Rolled back due to downstream failure
    ),

    // Parallel execution metadata
    branchIndex: v.optional(v.number()), // Position in parallel set (0, 1, 2...)
    siblingCount: v.optional(v.number()), // Total siblings in parallel set
    depth: v.number(),                   // Tree depth (0 = root)

    // Agent assignment
    agentName: v.optional(v.string()),   // Which agent handles this
    subagentThreadId: v.optional(v.string()), // Thread for subagent

    // Result
    result: v.optional(v.string()),      // Task output
    resultSummary: v.optional(v.string()), // Brief summary for UI
    confidence: v.optional(v.number()),  // 0-1 confidence

    // Verification
    verificationScore: v.optional(v.number()), // 0-1 from verifier
    verificationNotes: v.optional(v.string()), // Verifier feedback
    critiques: v.optional(v.array(v.object({
      source: v.string(),                // Which sibling critiqued
      verdict: v.union(v.literal("agree"), v.literal("disagree"), v.literal("partial")),
      reason: v.string(),
    }))),
    survivedVerification: v.optional(v.boolean()), // Did it pass?

    // Timing
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    elapsedMs: v.optional(v.number()),

    // Token usage
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),

    // Error handling
    errorMessage: v.optional(v.string()),
    retryCount: v.optional(v.number()),
    canBacktrack: v.optional(v.boolean()), // Can we backtrack from here?

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tree", ["treeId"])
    .index("by_tree_status", ["treeId", "status"])
    .index("by_tree_parent", ["treeId", "parentTaskId"])
    .index("by_tree_depth", ["treeId", "depth"])
    .index("by_taskId", ["taskId"]),

  /**
   * Real-time streaming events for task nodes.
   * Enables live UI updates during execution.
   */
  parallelTaskEvents: defineTable({
    treeId: v.id("parallelTaskTrees"),
    taskId: v.string(),
    seq: v.number(),                     // Monotonic within task

    eventType: v.union(
      v.literal("started"),              // Task began
      v.literal("progress"),             // Progress update
      v.literal("thinking"),             // Reasoning step
      v.literal("tool_call"),            // Tool invocation
      v.literal("result_partial"),       // Partial result
      v.literal("result_final"),         // Final result
      v.literal("verification_started"), // Verification began
      v.literal("verification_result"),  // Verification outcome
      v.literal("critique_received"),    // Critique from sibling
      v.literal("pruned"),               // Task was pruned
      v.literal("completed"),            // Task completed
      v.literal("failed"),               // Task failed
      v.literal("backtracked"),          // Task rolled back
    ),

    message: v.optional(v.string()),
    data: v.optional(v.any()),           // Event-specific payload

    createdAt: v.number(),
  })
    .index("by_tree", ["treeId", "createdAt"])
    .index("by_task", ["taskId", "seq"])
    .index("by_tree_task", ["treeId", "taskId", "seq"]),

  /**
   * Cross-check matrix tracking which branches have critiqued each other.
   * Used to ensure thorough cross-validation.
   */
  parallelTaskCrossChecks: defineTable({
    treeId: v.id("parallelTaskTrees"),
    sourceTaskId: v.string(),            // Task doing the critique
    targetTaskId: v.string(),            // Task being critiqued

    verdict: v.union(
      v.literal("agree"),                // Full agreement
      v.literal("disagree"),             // Contradiction found
      v.literal("partial"),              // Partial agreement
      v.literal("abstain"),              // Cannot evaluate
    ),

    agreementPoints: v.optional(v.array(v.string())),
    disagreementPoints: v.optional(v.array(v.string())),
    confidence: v.number(),              // 0-1 confidence in verdict
    reasoning: v.optional(v.string()),

    createdAt: v.number(),
  })
    .index("by_tree", ["treeId"])
    .index("by_source", ["sourceTaskId"])
    .index("by_target", ["targetTaskId"])
    .index("by_tree_source_target", ["treeId", "sourceTaskId", "targetTaskId"]),

  /* ------------------------------------------------------------------ */
  /* DOSSIER DOMAIN - Bidirectional focus sync for agent↔chart views    */
  /* ------------------------------------------------------------------ */
  dossierFocusState,
  dossierAnnotations,
  dossierEnrichment,

  /* ------------------------------------------------------------------ */
  /* EMAIL MANAGEMENT - Full email thread/message management system     */
  /* ------------------------------------------------------------------ */
  emailLabels,
  emailThreads,
  emailMessages,
  emailDailyReports,
  emailProcessingQueue,
  emailSyncState,

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
    researchedBy: v.optional(v.id("users")), // User who triggered the research (optional for anonymous)
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

    // Deep Agent enrichment tracking (fixes publishedAt hack)
    ingestedAt: v.optional(v.number()),          // When entity was first discovered
    lastEnrichedAt: v.optional(v.number()),      // Last enrichment job completion
    enrichmentJobId: v.optional(v.id("enrichmentJobs")), // Current/last enrichment job
  })
    .index("by_entity", ["entityName", "entityType"])
    .index("by_ingestedAt", ["ingestedAt"])
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

  /* ------------------------------------------------------------------ */
  /* ADAPTIVE ENTITY PROFILES - LLM-discovered entity structure          */
  /* Dynamic timeline, relationships, and sections (not hardcoded)       */
  /* ------------------------------------------------------------------ */
  adaptiveEntityProfiles: defineTable({
    entityName: v.string(),                  // Name of the entity
    entityType: v.string(),                  // LLM-inferred type (founder, investor, company, etc.)

    // The full adaptive profile (stored as flexible JSON)
    profile: v.any(),                        // AdaptiveEntityProfile object

    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
    version: v.number(),                     // Version for cache invalidation

    // Quality tracking
    completeness: v.optional(v.number()),    // 0-100 score
    confidence: v.optional(v.number()),      // 0-100 score

    // Research state
    lastResearchedAt: v.optional(v.number()),
    researchDepth: v.optional(v.union(
      v.literal("quick"),
      v.literal("standard"),
      v.literal("deep")
    )),

    // Link to base entity context
    entityContextId: v.optional(v.id("entityContexts")),
  })
    .index("by_name", ["entityName"])
    .index("by_type", ["entityType"])
    .index("by_updated", ["updatedAt"])
    .searchIndex("search_name", {
      searchField: "entityName",
      filterFields: ["entityType"],
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

    // Enhanced fields for Deep Agent intelligence layer
    confidence: v.optional(v.number()),        // 0-1 scale based on source quality
    ttlDays: v.optional(v.number()),           // Cache expiry in days
    snippetSpan: v.optional(v.object({         // Where in source this was extracted
      startChar: v.number(),
      endChar: v.number(),
    })),
    sourceUrl: v.optional(v.string()),         // Primary source URL
    retrievedAt: v.optional(v.number()),       // When source was fetched
    contradictionFlag: v.optional(v.boolean()), // True if conflicts with other facts
    contradictingFactIds: v.optional(v.array(v.string())), // IDs of conflicting facts
  })
    .index("by_run", ["runId"])
    .index("by_run_fact", ["runId", "factId"])
    .index("by_run_section", ["runId", "sectionKey"])
    .index("by_confidence", ["confidence"])
    .index("by_contradiction", ["contradictionFlag"]),

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

    // L3 Nested Resources (Progressive Disclosure Level 3)
    // Resources are loaded on-demand when referenced in fullInstructions
    nestedResources: v.optional(v.array(v.object({
      name: v.string(),                        // Resource identifier (e.g., "examples", "keyword-table")
      type: v.union(v.literal("markdown"), v.literal("json"), v.literal("template")),
      uri: v.string(),                         // Resource URI (e.g., "./persona-inference-examples.md")
      tokensEstimate: v.optional(v.number()),  // Estimated tokens when loaded
    }))),

    // Skill Caching (avoid re-expanding unchanged skills)
    contentHash: v.optional(v.string()),       // SHA-256 hash of fullInstructions
    version: v.optional(v.number()),           // Monotonic version number

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
    .index("by_content_hash", ["contentHash"])  // For skill caching
    .index("by_version", ["version"])           // For version tracking
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
  /* ANONYMOUS USAGE - Daily limits for unauthenticated users (5/day)   */
  /* ------------------------------------------------------------------ */
  anonymousUsageDaily: defineTable({
    sessionId: v.string(),            // Browser fingerprint/session ID
    ipHash: v.optional(v.string()),   // Hashed IP for additional tracking
    date: v.string(),                 // YYYY-MM-DD
    requests: v.number(),             // Requests made today (max 5)
    totalTokens: v.number(),          // Tokens used
    totalCost: v.number(),            // Cost incurred
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_session_date", ["sessionId", "date"])
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
  /* SEARCH QUOTA USAGE - FREE-FIRST tracking per provider               */
  /* ------------------------------------------------------------------ */
  searchQuotaUsage: defineTable({
    provider: v.string(),           // "brave" | "serper" | "tavily" | "exa" | "linkup"
    monthKey: v.string(),           // "2026-01" format for monthly reset
    usedQueries: v.number(),        // Count of queries used this month
    successfulQueries: v.optional(v.number()),
    failedQueries: v.optional(v.number()),
    lastUsedAt: v.optional(v.number()),
    totalResponseTimeMs: v.optional(v.number()),
  })
    .index("by_provider", ["provider"])
    .index("by_provider_month", ["provider", "monthKey"])
    .index("by_month", ["monthKey"]),

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

  /* ══════════════════════════════════════════════════════════════════════
   * FUNDING INTELLIGENCE LAYER
   * Deep Agent + Linkup API integration for banker-grade entity enrichment
   * ══════════════════════════════════════════════════════════════════════ */

  /* ------------------------------------------------------------------ */
  /* FUNDING EVENTS - First-class funding round records with evidence    */
  /* Supports Seed/Series A separation and persona-aware digest          */
  /* ------------------------------------------------------------------ */
  fundingEvents: defineTable({
    // Core identifiers
    companyName: v.string(),
    companyId: v.optional(v.id("entityContexts")), // Link to enriched entity

    // Funding details
    roundType: v.union(
      v.literal("pre-seed"),
      v.literal("seed"),
      v.literal("series-a"),
      v.literal("series-b"),
      v.literal("series-c"),
      v.literal("series-d-plus"),
      v.literal("growth"),
      v.literal("debt"),
      v.literal("unknown")
    ),
    amountUsd: v.optional(v.number()),        // Normalized to USD cents
    amountRaw: v.string(),                     // Original "$50M" string
    announcedAt: v.number(),                   // Unix timestamp of announcement

    // Investors
    leadInvestors: v.array(v.string()),
    coInvestors: v.optional(v.array(v.string())),

    // Sources & confidence (evidence-backed)
    sourceUrls: v.array(v.string()),
    sourceNames: v.array(v.string()),
    confidence: v.number(),                    // 0-1 scale
    verificationStatus: v.union(
      v.literal("unverified"),
      v.literal("single-source"),
      v.literal("multi-source"),
      v.literal("verified")
    ),

    // Additional context
    sector: v.optional(v.string()),
    location: v.optional(v.string()),
    description: v.optional(v.string()),
    valuation: v.optional(v.string()),
    useOfProceeds: v.optional(v.string()),

    // Lifecycle
    ttlDays: v.number(),                       // Cache expiry in days
    createdAt: v.number(),
    updatedAt: v.number(),

    // Linking to other tables
    feedItemIds: v.optional(v.array(v.id("feedItems"))),
    factIds: v.optional(v.array(v.string())),  // Links to facts table
  })
    .index("by_company", ["companyName", "roundType"])
    .index("by_companyId", ["companyId"])
    .index("by_announcedAt", ["announcedAt"])
    .index("by_roundType_announcedAt", ["roundType", "announcedAt"])
    .index("by_confidence", ["confidence"])
    .index("by_verificationStatus", ["verificationStatus"])
    .index("by_createdAt", ["createdAt"])
    .searchIndex("search_company", {
      searchField: "companyName",
      filterFields: ["roundType", "verificationStatus"],
    }),

  /* ------------------------------------------------------------------ */
  /* ENRICHMENT JOBS - Durable job tracking for workpool-based enrichment*/
  /* Supports high-priority (digest) and backfill pools                  */
  /* ------------------------------------------------------------------ */
  enrichmentJobs: defineTable({
    // Job identification
    jobId: v.string(),                         // UUID for deduplication
    jobType: v.union(
      v.literal("funding_detection"),
      v.literal("entity_promotion"),
      v.literal("full_article_fetch"),
      v.literal("structured_search"),
      v.literal("verification"),
      v.literal("persona_evaluation")
    ),

    // Status tracking
    status: v.union(
      v.literal("pending"),
      v.literal("queued"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("retrying")
    ),

    // Priority (higher = more urgent, 100 = digest-critical, 50 = backfill)
    priority: v.number(),

    // Retry handling
    attempts: v.number(),
    maxAttempts: v.number(),
    lastError: v.optional(v.string()),
    nextRetryAt: v.optional(v.number()),

    // Payload
    inputPayload: v.any(),                     // Job-specific input
    outputPayload: v.optional(v.any()),        // Job-specific output

    // Relationships
    targetEntityId: v.optional(v.id("entityContexts")),
    targetFeedItemId: v.optional(v.id("feedItems")),
    sourceFundingEventId: v.optional(v.id("fundingEvents")),

    // Timing
    createdAt: v.number(),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),

    // Workpool tracking
    poolName: v.optional(v.string()),          // "highPriority" | "backfill"
    workpoolJobId: v.optional(v.string()),
  })
    .index("by_status", ["status", "priority"])
    .index("by_type_status", ["jobType", "status"])
    .index("by_targetEntity", ["targetEntityId"])
    .index("by_targetFeedItem", ["targetFeedItemId"])
    .index("by_createdAt", ["createdAt"])
    .index("by_jobId", ["jobId"]),

  /* ------------------------------------------------------------------ */
  /* BENCHMARK HARNESS - Deterministic evaluation & regression testing  */
  /* ------------------------------------------------------------------ */

  /**
   * Benchmark task definitions - the golden dataset of test cases.
   * Each task represents a deterministic, reproducible test scenario.
   */
  benchmarkTasks: defineTable({
    taskId: v.string(),                          // Unique task identifier (e.g., "sec_10k_retrieval_01")
    suite: v.string(),                           // Suite name: "banking_memo", "social_factcheck", "mcp_smoke"
    name: v.string(),                            // Human-readable name
    description: v.optional(v.string()),

    // Task configuration
    taskType: v.union(
      v.literal("sec_retrieval"),                // SEC filing retrieval
      v.literal("memo_generation"),              // Banking memo workflow
      v.literal("instagram_ingestion"),          // Instagram post ingestion
      v.literal("claim_extraction"),             // Claim extraction from content
      v.literal("citation_validation"),          // Citation integrity check
      v.literal("tool_health"),                  // Tool availability check
      v.literal("artifact_replay"),              // Artifact idempotency check
    ),
    inputPayload: v.any(),                       // Task-specific input parameters

    // Expected outcomes (for validation)
    expectations: v.object({
      minArtifacts: v.optional(v.number()),      // Minimum artifact count
      requiredFields: v.optional(v.array(v.string())),
      maxLatencyMs: v.optional(v.number()),      // Performance threshold
      successRequired: v.boolean(),              // Must succeed to pass
      idempotent: v.optional(v.boolean()),       // Should produce same result on re-run
    }),

    // Metadata
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
    isActive: v.boolean(),
    priority: v.optional(v.number()),            // Execution order priority
  })
    .index("by_taskId", ["taskId"])
    .index("by_suite", ["suite"])
    .index("by_type", ["taskType"])
    .index("by_active", ["isActive"]),

  /**
   * Benchmark runs - execution of a suite of tasks.
   */
  benchmarkRuns: defineTable({
    runId: v.string(),                           // Unique run identifier
    suite: v.string(),                           // Suite being run
    triggeredBy: v.optional(v.string()),         // "manual" | "ci" | "scheduled"
    gitCommit: v.optional(v.string()),           // Git commit hash for traceability

    // Status tracking
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
    ),

    // Task tracking
    totalTasks: v.number(),
    completedTasks: v.number(),
    passedTasks: v.number(),
    failedTasks: v.number(),

    // Aggregate metrics
    totalLatencyMs: v.optional(v.number()),
    avgLatencyMs: v.optional(v.number()),

    // Timestamps
    startedAt: v.number(),
    completedAt: v.optional(v.number()),

    // Error summary
    errors: v.optional(v.array(v.object({
      taskId: v.string(),
      error: v.string(),
    }))),
  })
    .index("by_runId", ["runId"])
    .index("by_suite", ["suite"])
    .index("by_status", ["status"])
    .index("by_started", ["startedAt"]),

  /**
   * Benchmark scores - individual task results within a run.
   */
  benchmarkScores: defineTable({
    runId: v.string(),                           // Parent benchmark run
    taskId: v.string(),                          // Task that was executed
    suite: v.string(),                           // Suite for filtering

    // Execution result
    passed: v.boolean(),
    latencyMs: v.number(),

    // Validation details
    validationResults: v.object({
      artifactCountValid: v.optional(v.boolean()),
      requiredFieldsPresent: v.optional(v.boolean()),
      latencyWithinThreshold: v.optional(v.boolean()),
      idempotencyVerified: v.optional(v.boolean()),
      customChecks: v.optional(v.array(v.object({
        name: v.string(),
        passed: v.boolean(),
        message: v.optional(v.string()),
      }))),
    }),

    // Artifacts produced (for traceability)
    artifactIds: v.optional(v.array(v.id("sourceArtifacts"))),

    // Raw output (for debugging)
    outputPreview: v.optional(v.string()),       // First 500 chars of output
    error: v.optional(v.string()),

    // Timestamps
    executedAt: v.number(),
  })
    .index("by_run", ["runId"])
    .index("by_task", ["taskId"])
    .index("by_suite_passed", ["suite", "passed"])
    .index("by_executed", ["executedAt"]),

  /* ------------------------------------------------------------------ */
  /* ACTION DRAFTS - Write operation confirmation flow (P2 enforcement)  */
  /* Enables risk tier gating for write/destructive tool calls           */
  /* ------------------------------------------------------------------ */
  actionDrafts: defineTable({
    // Identity
    sessionId: v.string(),           // Conversation/batch session
    userId: v.optional(v.id("users")),

    // Action details
    toolName: v.string(),            // Tool that would be invoked
    args: v.string(),                // JSON-stringified arguments
    riskTier: v.union(
      v.literal("write"),
      v.literal("destructive")
    ),
    actionSummary: v.string(),       // Human-readable summary

    // Status
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("denied"),
      v.literal("expired")
    ),

    // Timestamps
    createdAt: v.number(),
    expiresAt: v.number(),           // 5 minute default
    confirmedAt: v.optional(v.number()),
    deniedAt: v.optional(v.number()),
    expiredAt: v.optional(v.number()),

    // Denial reason
    denyReason: v.optional(v.string()),

    // Execution result (after confirmation)
    executedAt: v.optional(v.number()),
    result: v.optional(v.string()),  // JSON-stringified result
    error: v.optional(v.string()),
  })
    .index("by_session", ["sessionId", "createdAt"])
    .index("by_user", ["userId", "createdAt"])
    .index("by_status", ["status", "createdAt"])
    .index("by_expiry", ["expiresAt"]),

  /* ================================================================== */
  /* AUTONOMOUS AGENT ECOSYSTEM - Deep Agents 3.0                       */
  /* Implements zero-human-input continuous intelligence platform        */
  /* ================================================================== */

  /* ------------------------------------------------------------------ */
  /* SIGNALS - Ingested signals from feeds, webhooks, mentions          */
  /* ------------------------------------------------------------------ */
  signals: defineTable({
    // Signal source metadata
    source: v.string(),                          // "cron" | "rss" | "webhook" | "event" | "mention"
    sourceType: v.string(),                      // Specific source identifier (e.g., "hackernews", "arxiv")
    sourceUrl: v.optional(v.string()),           // URL if applicable (RSS feed, webhook endpoint)

    // Content
    rawContent: v.string(),                      // Raw signal content
    title: v.optional(v.string()),               // Signal title if available
    contentHash: v.string(),                     // SHA-256 hash for deduplication

    // Processing status
    processedAt: v.optional(v.number()),         // When signal was processed
    processingStatus: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("processed"),
      v.literal("failed"),
      v.literal("skipped"),                      // Skipped due to deduplication
    ),

    // Extracted information
    extractedEntities: v.optional(v.array(v.string())), // NER extracted entities
    suggestedPersonas: v.optional(v.array(v.string())), // Persona IDs relevant to this signal

    // Urgency classification
    urgency: v.optional(v.union(
      v.literal("critical"),                     // Immediate action required
      v.literal("high"),                         // Same-day attention
      v.literal("medium"),                       // This week
      v.literal("low"),                          // When convenient
    )),

    // Research depth estimation
    estimatedResearchDepth: v.optional(v.union(
      v.literal("shallow"),                      // Quick lookup
      v.literal("standard"),                     // Normal research
      v.literal("deep"),                         // Comprehensive analysis
    )),

    // Error tracking
    errorMessage: v.optional(v.string()),
    retryCount: v.optional(v.number()),

    // Timestamps
    createdAt: v.number(),
    expiresAt: v.optional(v.number()),           // TTL for cleanup
  })
    .index("by_processed", ["processedAt"])
    .index("by_status", ["processingStatus"])
    .index("by_source", ["source", "createdAt"])
    .index("by_contentHash", ["contentHash"])
    .index("by_urgency", ["urgency", "createdAt"])
    .index("by_expires", ["expiresAt"]),

  /* ------------------------------------------------------------------ */
  /* RESEARCH TASKS - Priority queue for autonomous research            */
  /* ------------------------------------------------------------------ */
  researchTasks: defineTable({
    // Entity identification
    entityId: v.string(),                        // Entity to research
    entityType: v.optional(v.string()),          // "company" | "person" | "topic" | "product" | "event"
    entityName: v.optional(v.string()),          // Human-readable name

    // Persona configuration
    personas: v.array(v.string()),               // Persona IDs to apply
    primaryPersona: v.optional(v.string()),      // Lead persona for this research

    // Priority calculation
    priority: v.number(),                        // 0-100, higher = more urgent
    priorityFactors: v.optional(v.object({
      urgencyBoost: v.optional(v.number()),      // From signal urgency
      stalenessBoost: v.optional(v.number()),    // From entity decay
      watchlistBoost: v.optional(v.number()),    // From user watchlists
      trendingBoost: v.optional(v.number()),     // From engagement spike
    })),

    // Status tracking
    status: v.union(
      v.literal("queued"),                       // Waiting for execution
      v.literal("researching"),                  // Active research underway
      v.literal("validating"),                   // Self-question validation
      v.literal("publishing"),                   // Queued for delivery
      v.literal("completed"),                    // Successfully finished
      v.literal("failed"),                       // Terminal failure
      v.literal("cancelled"),                    // User/system cancelled
    ),

    // Execution tracking
    swarmId: v.optional(v.string()),             // Associated swarm if running
    qualityScore: v.optional(v.number()),        // 0-100 from validation
    validationPassed: v.optional(v.boolean()),   // Did it pass self-question?
    validationIssues: v.optional(v.array(v.object({
      type: v.string(),                          // "factual" | "freshness" | "completeness" | "grounding" | "contradiction"
      severity: v.string(),                      // "blocker" | "warning" | "info"
      description: v.string(),
    }))),

    // Source tracking
    signalId: v.optional(v.id("signals")),       // Signal that triggered this task
    triggeredBy: v.optional(v.union(
      v.literal("signal"),                       // From signal ingestion
      v.literal("decay"),                        // From staleness detection
      v.literal("watchlist"),                    // From user watchlist
      v.literal("enrichment"),                   // From enrichment prioritizer
      v.literal("manual"),                       // Manual trigger
    )),

    // Retry handling
    retryCount: v.number(),
    maxRetries: v.optional(v.number()),          // Default: 3
    lastError: v.optional(v.string()),

    // Cost tracking
    tokensUsed: v.optional(v.number()),
    costUsd: v.optional(v.number()),

    // Timestamps
    createdAt: v.number(),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    elapsedMs: v.optional(v.number()),
  })
    .index("by_status_priority", ["status", "priority"])
    .index("by_entity", ["entityId"])
    .index("by_status", ["status"])
    .index("by_signal", ["signalId"])
    .index("by_created", ["createdAt"])
    .index("by_persona", ["primaryPersona", "status"]),

  /* ------------------------------------------------------------------ */
  /* PUBLISHING TASKS - Multi-channel delivery workflow                 */
  /* ------------------------------------------------------------------ */
  publishingTasks: defineTable({
    // Source reference
    researchTaskId: v.id("researchTasks"),
    entityId: v.string(),
    entityName: v.optional(v.string()),

    // Content
    content: v.object({
      raw: v.string(),                           // Full research output
      summary: v.string(),                       // Executive summary
      keyFacts: v.array(v.object({
        label: v.string(),
        value: v.string(),
        category: v.optional(v.string()),        // "funding" | "contact" | "news" | "metric"
        confidence: v.optional(v.number()),
      })),
      nextActions: v.array(v.string()),          // Recommended actions
      persona: v.string(),                       // Persona that generated this
    }),

    // Channel configuration
    channels: v.array(v.object({
      channel: v.string(),                       // "ui" | "ntfy" | "email" | "sms" | "slack" | "rss"
      enabled: v.boolean(),
      format: v.string(),                        // "full" | "summary" | "alert" | "digest"
      urgency: v.optional(v.string()),
      recipients: v.optional(v.array(v.string())), // For targeted channels
      scheduledFor: v.optional(v.number()),      // Scheduled delivery time
    })),

    // Status
    status: v.union(
      v.literal("pending"),                      // Awaiting formatting
      v.literal("formatting"),                   // Generating channel-specific formats
      v.literal("delivering"),                   // Sending to channels
      v.literal("completed"),                    // All deliveries done
      v.literal("partial"),                      // Some channels failed
      v.literal("failed"),                       // All channels failed
    ),

    // Delivery results
    deliveryResults: v.optional(v.array(v.object({
      channel: v.string(),
      success: v.boolean(),
      deliveredAt: v.optional(v.number()),
      messageId: v.optional(v.string()),         // External message ID
      error: v.optional(v.string()),
      retryCount: v.optional(v.number()),
    }))),

    // Timestamps
    createdAt: v.number(),
    formattedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_research_task", ["researchTaskId"])
    .index("by_entity", ["entityId"])
    .index("by_created", ["createdAt"]),

  /* ------------------------------------------------------------------ */
  /* ENTITY STATES - Comprehensive entity lifecycle tracking            */
  /* ------------------------------------------------------------------ */
  entityStates: defineTable({
    // Identity
    entityId: v.string(),                        // Canonical entity identifier
    canonicalName: v.string(),                   // Primary display name
    aliases: v.optional(v.array(v.string())),    // Alternative names
    entityType: v.string(),                      // "company" | "person" | "topic" | "product" | "event"

    // Freshness tracking
    freshness: v.object({
      lastUpdated: v.number(),                   // Last successful research
      lastChecked: v.optional(v.number()),       // Last staleness check
      staleDays: v.number(),                     // Days since last update
      decayScore: v.number(),                    // 0-1, lower = more stale
      decayHalfLifeDays: v.optional(v.number()), // Entity-specific half-life
    }),

    // Completeness tracking
    completeness: v.object({
      score: v.number(),                         // 0-100
      missingFields: v.array(v.string()),        // Fields still needed
      enrichmentOpportunities: v.array(v.string()), // Suggested enrichments
      lastAssessed: v.number(),
    }),

    // Quality tracking
    quality: v.object({
      overallScore: v.number(),                  // 0-100
      personaScores: v.optional(v.any()),        // Record<PersonaId, number>
      sourceCount: v.number(),                   // Number of unique sources
      contradictionCount: v.number(),            // Unresolved contradictions
      lastValidated: v.number(),
    }),

    // Engagement tracking
    engagement: v.object({
      viewCount: v.number(),
      watchlistCount: v.number(),
      lastViewed: v.optional(v.number()),
      trendingScore: v.optional(v.number()),     // Engagement velocity
    }),

    // Research history
    researchHistory: v.optional(v.array(v.object({
      taskId: v.id("researchTasks"),
      completedAt: v.number(),
      qualityScore: v.number(),
      personas: v.array(v.string()),
    }))),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_entity", ["entityId"])
    .index("by_decay", ["freshness.decayScore"])
    .index("by_completeness", ["completeness.score"])
    .index("by_quality", ["quality.overallScore"])
    .index("by_type", ["entityType"])
    .index("by_updated", ["updatedAt"]),

  /* ------------------------------------------------------------------ */
  /* ENGAGEMENT EVENTS - User interaction tracking for optimization     */
  /* ------------------------------------------------------------------ */
  engagementEvents: defineTable({
    // User identification
    userId: v.id("users"),

    // Event context
    channel: v.string(),                         // "ui" | "ntfy" | "email" | "sms" | "slack"
    eventType: v.string(),                       // "delivered" | "opened" | "clicked" | "dismissed" | "shared"

    // Content reference
    entityId: v.optional(v.string()),
    publishingTaskId: v.optional(v.id("publishingTasks")),
    contentType: v.optional(v.string()),         // "research" | "digest" | "alert"

    // Event metadata
    metadata: v.optional(v.object({
      clickTarget: v.optional(v.string()),       // What was clicked
      timeToOpen: v.optional(v.number()),        // Ms from delivery to open
      deviceType: v.optional(v.string()),        // "mobile" | "desktop"
      source: v.optional(v.string()),            // Tracking source
    })),

    // Timestamps
    timestamp: v.number(),
  })
    .index("by_user_time", ["userId", "timestamp"])
    .index("by_channel", ["channel", "timestamp"])
    .index("by_entity", ["entityId", "timestamp"])
    .index("by_type", ["eventType", "timestamp"]),

  /* ------------------------------------------------------------------ */
  /* CONTRADICTIONS - Cross-source conflict tracking and resolution     */
  /* ------------------------------------------------------------------ */
  contradictions: defineTable({
    // Entity context
    entityId: v.string(),

    // Conflicting facts
    factA: v.object({
      claim: v.string(),
      source: v.string(),
      sourceUrl: v.optional(v.string()),
      confidence: v.number(),                    // 0-1
      timestamp: v.optional(v.number()),         // When fact was discovered
    }),
    factB: v.object({
      claim: v.string(),
      source: v.string(),
      sourceUrl: v.optional(v.string()),
      confidence: v.number(),
      timestamp: v.optional(v.number()),
    }),

    // Classification
    nature: v.union(
      v.literal("direct"),                       // Direct logical contradiction
      v.literal("temporal"),                     // Time-based conflict (old vs new)
      v.literal("numerical"),                    // Conflicting numbers
      v.literal("semantic"),                     // Meaning-based conflict
    ),
    severity: v.union(
      v.literal("critical"),                     // Major data integrity issue
      v.literal("high"),                         // Important to resolve
      v.literal("medium"),                       // Should be resolved
      v.literal("low"),                          // Minor discrepancy
    ),

    // Resolution
    resolution: v.optional(v.object({
      winner: v.string(),                        // "A" | "B" | "neither" | "merged"
      reason: v.string(),
      resolvedBy: v.optional(v.string()),        // "auto" | "human" | persona ID
      resolvedAt: v.number(),
      mergedClaim: v.optional(v.string()),       // If merged into new claim
    })),

    // Tracking
    detectedAt: v.number(),
    detectedBy: v.optional(v.string()),          // Which agent/process detected
  })
    .index("by_entity", ["entityId"])
    .index("by_unresolved", ["entityId", "resolution"])
    .index("by_severity", ["severity", "detectedAt"])
    .index("by_detected", ["detectedAt"]),

  /* ------------------------------------------------------------------ */
  /* HEALTH CHECKS - System component monitoring                        */
  /* ------------------------------------------------------------------ */
  healthChecks: defineTable({
    // Component identification
    component: v.string(),                       // "signalIngester" | "researchQueue" | etc.

    // Health status
    status: v.union(
      v.literal("healthy"),
      v.literal("degraded"),
      v.literal("down"),
    ),

    // Metrics
    latencyP50: v.number(),                      // 50th percentile latency (ms)
    latencyP99: v.number(),                      // 99th percentile latency (ms)
    errorRate: v.number(),                       // 0-1
    throughput: v.optional(v.number()),          // Operations per minute

    // Queue metrics (if applicable)
    queueDepth: v.optional(v.number()),
    oldestItemAge: v.optional(v.number()),       // Age in ms of oldest queued item

    // Resource metrics
    memoryUsage: v.optional(v.number()),         // MB
    cpuUsage: v.optional(v.number()),            // 0-1

    // Error details
    recentErrors: v.optional(v.array(v.object({
      timestamp: v.number(),
      message: v.string(),
      count: v.number(),
    }))),

    // Check metadata
    checkedAt: v.number(),
    windowMinutes: v.number(),                   // Time window for metrics
  })
    .index("by_component", ["component", "checkedAt"])
    .index("by_status", ["status", "checkedAt"])
    .index("by_checked", ["checkedAt"]),

  /* ------------------------------------------------------------------ */
  /* HEALING ACTIONS - Self-healing execution log                       */
  /* ------------------------------------------------------------------ */
  healingActions: defineTable({
    // Target component
    component: v.string(),
    issue: v.string(),                           // Issue identifier

    // Action taken
    action: v.string(),                          // "restart" | "scale" | "fallback" | "isolate" | "alert"
    reason: v.string(),
    automated: v.boolean(),                      // Was this automatic or manual?

    // Execution
    status: v.union(
      v.literal("pending"),
      v.literal("executing"),
      v.literal("success"),
      v.literal("failed"),
      v.literal("skipped"),
    ),
    executedAt: v.optional(v.number()),
    errorMessage: v.optional(v.string()),

    // Impact tracking
    impactMetrics: v.optional(v.object({
      preActionHealth: v.string(),
      postActionHealth: v.optional(v.string()),
      recoveryTimeMs: v.optional(v.number()),
    })),

    // Timestamps
    createdAt: v.number(),
  })
    .index("by_component", ["component", "createdAt"])
    .index("by_status", ["status", "createdAt"])
    .index("by_action", ["action", "createdAt"]),

  /* ------------------------------------------------------------------ */
  /* PERSONA BUDGETS - Per-persona resource consumption tracking        */
  /* ------------------------------------------------------------------ */
  personaBudgets: defineTable({
    // Persona identification
    personaId: v.string(),

    // Time period
    period: v.string(),                          // "daily" | "weekly" | "monthly"
    periodStart: v.number(),                     // Start of period
    periodEnd: v.number(),                       // End of period

    // Usage tracking
    tokensUsed: v.number(),
    costUsd: v.number(),
    researchCount: v.number(),                   // Number of research tasks
    publishCount: v.number(),                    // Number of publications

    // Budget limits
    tokenLimit: v.number(),
    costLimit: v.number(),

    // Status
    exhausted: v.boolean(),                      // Has budget been exhausted?
    exhaustedAt: v.optional(v.number()),         // When budget was exhausted

    // Timestamps
    updatedAt: v.number(),
  })
    .index("by_persona_period", ["personaId", "period", "periodStart"])
    .index("by_exhausted", ["exhausted", "periodEnd"]),

  /* ------------------------------------------------------------------ */
  /* DELIVERY QUEUE - Low-level delivery job tracking                   */
  /* ------------------------------------------------------------------ */
  deliveryJobs: defineTable({
    // Channel targeting
    channel: v.string(),                         // "ntfy" | "email" | "sms" | "slack" | "rss"
    recipient: v.optional(v.string()),           // Target recipient

    // Payload
    payload: v.any(),                            // Channel-specific payload

    // Status
    status: v.union(
      v.literal("pending"),
      v.literal("sending"),
      v.literal("delivered"),
      v.literal("failed"),
      v.literal("retrying"),
    ),

    // Retry handling
    attempts: v.number(),
    maxAttempts: v.number(),                     // Default: 5
    lastError: v.optional(v.string()),
    nextRetryAt: v.optional(v.number()),

    // External references
    publishingTaskId: v.optional(v.id("publishingTasks")),
    externalMessageId: v.optional(v.string()),   // ID from delivery provider

    // Timestamps
    createdAt: v.number(),
    deliveredAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_retry", ["status", "nextRetryAt"])
    .index("by_channel", ["channel", "status"])
    .index("by_publishing_task", ["publishingTaskId"]),

  /* ══════════════════════════════════════════════════════════════════════
   * FREE MODEL DISCOVERY & EVALUATION
   * Deep Agents 3.0 - Autonomous model selection for zero-cost operations
   * ══════════════════════════════════════════════════════════════════════ */

  /* ------------------------------------------------------------------ */
  /* FREE MODELS - Discovered free models from OpenRouter               */
  /* ------------------------------------------------------------------ */
  freeModels: defineTable({
    // Identity
    openRouterId: v.string(),                    // e.g., "xiaomi/mimo-v2-flash:free"
    name: v.string(),                            // Human-readable name
    contextLength: v.number(),                   // Max context window

    // Capabilities (refined by evaluation)
    capabilities: v.object({
      toolUse: v.boolean(),
      streaming: v.boolean(),
      structuredOutputs: v.boolean(),
      vision: v.boolean(),
    }),

    // Performance metrics (rolling averages)
    performanceScore: v.number(),                // 0-100 composite score
    reliabilityScore: v.number(),                // 0-100 based on success rate
    latencyAvgMs: v.number(),                    // Average response time

    // Evaluation tracking
    lastEvaluated: v.number(),                   // Last evaluation timestamp
    evaluationCount: v.number(),                 // Total evaluations run
    successCount: v.number(),                    // Successful evaluations
    failureCount: v.number(),                    // Failed evaluations

    // Status
    isActive: v.boolean(),                       // Meets reliability threshold
    rank: v.number(),                            // 1 = best, higher = worse
  })
    .index("by_openRouterId", ["openRouterId"])
    .index("by_rank", ["rank"])
    .index("by_active_rank", ["isActive", "rank"])
    .index("by_performance", ["performanceScore"]),

  /* ------------------------------------------------------------------ */
  /* FREE MODEL EVALUATIONS - Evaluation history for each model         */
  /* ------------------------------------------------------------------ */
  freeModelEvaluations: defineTable({
    modelId: v.id("freeModels"),
    success: v.boolean(),
    latencyMs: v.number(),
    responseQuality: v.optional(v.number()),     // 0-100
    toolCallSuccess: v.optional(v.boolean()),
    error: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_model", ["modelId", "timestamp"])
    .index("by_timestamp", ["timestamp"]),

  /* ------------------------------------------------------------------ */
  /* FREE MODEL METADATA - System-level discovery tracking              */
  /* ------------------------------------------------------------------ */
  freeModelMeta: defineTable({
    key: v.string(),                             // "lastDiscovery" | "lastRankingUpdate"
    value: v.number(),                           // Timestamp value
  }),

  /* ------------------------------------------------------------------ */
  /* AUTONOMOUS MODEL USAGE - Usage tracking for autonomous operations  */
  /* ------------------------------------------------------------------ */
  autonomousModelUsage: defineTable({
    modelId: v.string(),                         // Model identifier used
    taskType: v.string(),                        // "research" | "synthesis" | "publishing" etc.
    success: v.boolean(),
    latencyMs: v.number(),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    cost: v.number(),                            // Cost in USD (0 for free models)
    error: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_model", ["modelId", "timestamp"])
    .index("by_taskType", ["taskType", "timestamp"])
    .index("by_timestamp", ["timestamp"])
    .index("by_success", ["success", "timestamp"]),

  /* ══════════════════════════════════════════════════════════════════════
   * DISCORD INTEGRATION
   * Bot-based messaging for slash commands and notifications
   * ══════════════════════════════════════════════════════════════════════ */

  /* ------------------------------------------------------------------ */
  /* DISCORD USERS - Registered Discord users for notifications         */
  /* ------------------------------------------------------------------ */
  discordUsers: defineTable({
    discordUserId: v.string(),              // Discord user ID (snowflake)
    discordUsername: v.string(),
    discordGuildId: v.optional(v.string()), // Server/guild ID
    discordChannelId: v.optional(v.string()), // Preferred channel
    notificationsEnabled: v.boolean(),
    createdAt: v.number(),
    lastActiveAt: v.number(),
  })
    .index("by_user_id", ["discordUserId"])
    .index("by_guild", ["discordGuildId"])
    .index("by_last_active", ["lastActiveAt"]),

  /* ------------------------------------------------------------------ */
  /* DISCORD INTERACTIONS - Interaction log for audit/context           */
  /* ------------------------------------------------------------------ */
  discordInteractions: defineTable({
    discordUserId: v.string(),
    discordUsername: v.string(),
    guildId: v.optional(v.string()),
    channelId: v.optional(v.string()),
    interactionType: v.string(),            // "slash_command" | "button_click" | "modal_submit"
    commandName: v.optional(v.string()),
    commandOptions: v.optional(v.any()),
    agentResponse: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_user_id", ["discordUserId"])
    .index("by_timestamp", ["timestamp"])
    .index("by_guild_timestamp", ["guildId", "timestamp"]),

  /* ------------------------------------------------------------------ */
  /* SLACK INTERACTIONS - Interaction log for encounter capture/audit   */
  /* ------------------------------------------------------------------ */
  slackInteractions: defineTable({
    slackUserId: v.string(),
    slackUsername: v.string(),
    slackTeamId: v.string(),
    channelId: v.optional(v.string()),
    channelName: v.optional(v.string()),
    interactionType: v.string(),            // "slash_command" | "message" | "button_click" | "modal_submit"
    commandName: v.optional(v.string()),
    commandOptions: v.optional(v.any()),
    messageText: v.optional(v.string()),
    nodebenchUserId: v.optional(v.id("users")), // Linked NodeBench user if mapped
    encounterId: v.optional(v.id("userEvents")), // Linked encounter if created
    agentResponse: v.optional(v.string()),
    processingTimeMs: v.optional(v.number()),
    timestamp: v.number(),
  })
    .index("by_slack_user", ["slackUserId"])
    .index("by_nodebench_user", ["nodebenchUserId"])
    .index("by_team", ["slackTeamId"])
    .index("by_timestamp", ["timestamp"])
    .index("by_team_timestamp", ["slackTeamId", "timestamp"]),

  // Scheduled PDF Reports
  scheduledReports,

  /* ══════════════════════════════════════════════════════════════════════
   * DUE DILIGENCE FRAMEWORK
   * Parallelized multi-front research with traditional IC memo output
   * ══════════════════════════════════════════════════════════════════════ */

  /* ------------------------------------------------------------------ */
  /* DUE DILIGENCE JOBS - Orchestration layer for DD research            */
  /* ------------------------------------------------------------------ */
  dueDiligenceJobs: defineTable({
    jobId: v.string(),                        // UUID for deduplication
    userId: v.id("users"),
    entityId: v.optional(v.id("entityContexts")),
    entityName: v.string(),
    entityType: v.union(
      v.literal("company"),
      v.literal("fund"),
      v.literal("person")
    ),

    // Trigger source
    triggerSource: v.union(
      v.literal("funding_detection"),         // Auto-triggered from funding events
      v.literal("deals_feed"),                // From deals/opportunities feed
      v.literal("manual"),                    // User-initiated
      v.literal("scheduled_refresh"),         // Periodic refresh of stale DD
      v.literal("encounter")                  // Triggered from encounter capture
    ),
    triggerEventId: v.optional(v.string()),   // Link to fundingEvent or feedItem
    triggerEncounterId: v.optional(v.id("encounterEvents")), // Link to encounter if triggered from one

    // Status workflow
    status: v.union(
      v.literal("pending"),                   // Queued
      v.literal("analyzing"),                 // Complexity signal analysis
      v.literal("executing"),                 // Parallel branch execution
      v.literal("cross_checking"),            // Cross-check phase
      v.literal("synthesizing"),              // Memo generation
      v.literal("completed"),
      v.literal("failed")
    ),

    // Branch tracking
    activeBranches: v.array(v.string()),      // Currently executing branch types
    conditionalBranchesSpawned: v.optional(v.array(v.string())), // Dynamically added

    // Complexity signals (determines conditional branches)
    complexitySignals: v.optional(v.object({
      fundingSize: v.optional(v.number()),    // USD amount
      teamSize: v.optional(v.number()),       // Key people count
      hasPatentMentions: v.optional(v.boolean()),
      hasRegulatoryMentions: v.optional(v.boolean()),
      hasPublicSecurities: v.optional(v.boolean()),
      hasSerialFounders: v.optional(v.boolean()),
      hasVCBackedFounders: v.optional(v.boolean()),
      industryRisk: v.optional(v.union(
        v.literal("low"),
        v.literal("medium"),
        v.literal("high")
      )),
      sectors: v.optional(v.array(v.string())),
    })),

    // Results
    ddMemoId: v.optional(v.id("dueDiligenceMemos")),
    overallConfidence: v.optional(v.number()),  // 0-1 final confidence

    // Contradiction tracking
    contradictions: v.optional(v.array(v.object({
      field: v.string(),                      // Which field has conflict
      sourceA: v.string(),                    // Branch or source A
      valueA: v.string(),
      sourceB: v.string(),                    // Branch or source B
      valueB: v.string(),
      resolution: v.optional(v.union(
        v.literal("resolved_to_a"),
        v.literal("resolved_to_b"),
        v.literal("unresolved"),
        v.literal("both_valid")
      )),
      resolutionReason: v.optional(v.string()),
    }))),

    // Task tree integration
    parallelTreeId: v.optional(v.id("parallelTaskTrees")),

    // Timing
    createdAt: v.number(),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    elapsedMs: v.optional(v.number()),

    // Error tracking
    error: v.optional(v.string()),
    retryCount: v.optional(v.number()),
  })
    .index("by_jobId", ["jobId"])
    .index("by_user", ["userId"])
    .index("by_entity", ["entityName", "entityType"])
    .index("by_entityId", ["entityId"])
    .index("by_status", ["status"])
    .index("by_user_status", ["userId", "status"])
    .index("by_trigger", ["triggerSource", "createdAt"])
    .index("by_createdAt", ["createdAt"])
    .searchIndex("search_entity", {
      searchField: "entityName",
      filterFields: ["entityType", "status"],
    }),

  /* ------------------------------------------------------------------ */
  /* DD RESEARCH BRANCHES - Individual research angles                   */
  /* ------------------------------------------------------------------ */
  ddResearchBranches: defineTable({
    jobId: v.string(),                        // Links to dueDiligenceJobs
    branchId: v.string(),                     // UUID
    branchType: v.union(
      // Core branches (always run)
      v.literal("company_profile"),           // Basic company data
      v.literal("team_founders"),             // Deep team/founder research
      v.literal("market_competitive"),        // Market size, competitors
      // Conditional branches (spawned based on complexity)
      v.literal("technical_dd"),              // Tech stack, architecture
      v.literal("ip_patents"),                // Patent portfolio, IP
      v.literal("regulatory"),                // SEC, FDA, compliance
      v.literal("financial_deep"),            // Deep financial analysis
      v.literal("network_mapping")            // Network graph, relationships
    ),

    // Status
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("awaiting_verification"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("skipped")                    // Conditional branch not needed
    ),

    // Integration with parallel task tree
    taskTreeId: v.optional(v.id("parallelTaskTrees")),
    taskNodeId: v.optional(v.string()),       // parallelTaskNodes.taskId

    // Findings (branch-specific structured data)
    findings: v.optional(v.any()),            // Varies by branchType
    findingsSummary: v.optional(v.string()),  // Human-readable summary

    // Confidence & verification
    confidence: v.optional(v.number()),       // 0-1 confidence in findings
    verificationScore: v.optional(v.number()), // From verifier agent

    // Sources used
    sourcesUsed: v.optional(v.array(v.object({
      sourceType: v.union(
        v.literal("sec_filing"),
        v.literal("news_article"),
        v.literal("company_website"),
        v.literal("linkedin"),
        v.literal("patent_db"),
        v.literal("crunchbase"),
        v.literal("pitchbook"),
        v.literal("llm_inference")
      ),
      url: v.optional(v.string()),
      title: v.optional(v.string()),
      accessedAt: v.number(),
      reliability: v.union(
        v.literal("authoritative"),           // SEC, USPTO, official
        v.literal("reliable"),                // Major news, LinkedIn
        v.literal("secondary"),               // Blog, press release
        v.literal("inferred")                 // LLM synthesis
      ),
      // Optional section tracking
      section: v.optional(v.string()),        // Which memo section this supports
      branchType: v.optional(v.string()),     // Which branch produced this source
    }))),

    // Timing
    createdAt: v.number(),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    elapsedMs: v.optional(v.number()),

    // Error
    error: v.optional(v.string()),
  })
    .index("by_job", ["jobId"])
    .index("by_branchId", ["branchId"])
    .index("by_job_type", ["jobId", "branchType"])
    .index("by_job_status", ["jobId", "status"])
    .index("by_status", ["status"]),

  /* ------------------------------------------------------------------ */
  /* DUE DILIGENCE MEMOS - Traditional IC/VC memo structure              */
  /* ------------------------------------------------------------------ */
  dueDiligenceMemos: defineTable({
    jobId: v.string(),                        // Links to dueDiligenceJobs
    entityName: v.string(),
    entityType: v.union(
      v.literal("company"),
      v.literal("fund"),
      v.literal("person")
    ),

    // ═══════════════════════════════════════════════════════════════════
    // I. EXECUTIVE SUMMARY
    // ═══════════════════════════════════════════════════════════════════
    executiveSummary: v.string(),
    verdict: v.union(
      v.literal("STRONG_BUY"),
      v.literal("BUY"),
      v.literal("HOLD"),
      v.literal("PASS"),
      v.literal("INSUFFICIENT_DATA")
    ),
    verdictRationale: v.optional(v.string()),

    // ═══════════════════════════════════════════════════════════════════
    // II. COMPANY OVERVIEW
    // ═══════════════════════════════════════════════════════════════════
    companyOverview: v.object({
      description: v.string(),
      hqLocation: v.optional(v.string()),
      foundedYear: v.optional(v.number()),
      employeeCount: v.optional(v.number()),
      employeeGrowth: v.optional(v.string()), // e.g., "+50% YoY"
      sectors: v.array(v.string()),
      stage: v.optional(v.string()),          // Seed, Series A, etc.
      businessModel: v.optional(v.string()),
      keyProducts: v.optional(v.array(v.string())),
    }),

    // ═══════════════════════════════════════════════════════════════════
    // III. MARKET ANALYSIS
    // ═══════════════════════════════════════════════════════════════════
    marketAnalysis: v.object({
      marketSize: v.optional(v.string()),     // TAM/SAM/SOM
      marketGrowth: v.optional(v.string()),   // CAGR
      competitors: v.array(v.object({
        name: v.string(),
        description: v.optional(v.string()),
        fundingStage: v.optional(v.string()),
        differentiator: v.optional(v.string()),
        threat: v.optional(v.union(
          v.literal("low"),
          v.literal("medium"),
          v.literal("high")
        )),                                    // Competitive threat level
      })),
      differentiators: v.array(v.string()),   // Company's competitive advantages
      whyNow: v.optional(v.string()),         // Market timing thesis
      tailwinds: v.optional(v.array(v.string())),
      headwinds: v.optional(v.array(v.string())),
    }),

    // ═══════════════════════════════════════════════════════════════════
    // IV. TEAM ASSESSMENT
    // ═══════════════════════════════════════════════════════════════════
    teamAnalysis: v.object({
      founders: v.array(v.any()),             // TeamMemberProfile[]
      executives: v.array(v.any()),           // TeamMemberProfile[]
      boardMembers: v.array(v.any()),         // TeamMemberProfile[]
      advisors: v.optional(v.array(v.any())),
      networkGraph: v.optional(v.any()),      // Network visualization data
      trackRecordSummary: v.optional(v.string()),
      teamStrengths: v.optional(v.array(v.string())),
      teamGaps: v.optional(v.array(v.string())),
      founderMarketFit: v.optional(v.string()),
    }),

    // ═══════════════════════════════════════════════════════════════════
    // V. FINANCIALS / FUNDING HISTORY
    // ═══════════════════════════════════════════════════════════════════
    fundingHistory: v.object({
      totalRaised: v.optional(v.object({
        amount: v.number(),
        currency: v.string(),
        unit: v.string(),                     // M, B, K
      })),
      rounds: v.array(v.object({
        roundType: v.string(),
        date: v.optional(v.string()),
        amount: v.optional(v.string()),
        leadInvestors: v.optional(v.array(v.string())),
        valuation: v.optional(v.string()),
        verified: v.optional(v.boolean()),
        source: v.optional(v.string()),
      })),
      valuationComps: v.optional(v.object({
        currentValuation: v.optional(v.string()),
        revenueMultiple: v.optional(v.number()),
        comparables: v.optional(v.array(v.object({
          company: v.string(),
          valuation: v.string(),
          multiple: v.optional(v.number()),
        }))),
      })),
      burnRate: v.optional(v.string()),
      runway: v.optional(v.string()),
    }),

    // ═══════════════════════════════════════════════════════════════════
    // VI. RISKS
    // ═══════════════════════════════════════════════════════════════════
    risks: v.array(v.object({
      category: v.union(
        v.literal("Market"),
        v.literal("Execution"),
        v.literal("Regulatory"),
        v.literal("Team"),
        v.literal("Technical"),
        v.literal("Financial"),
        v.literal("Competitive"),
        v.literal("Legal")
      ),
      description: v.string(),
      severity: v.union(
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
        v.literal("critical")
      ),
      likelihood: v.optional(v.union(
        v.literal("low"),
        v.literal("medium"),
        v.literal("high")
      )),
      mitigation: v.optional(v.string()),
      timeframe: v.optional(v.string()),      // Near-term, medium-term, long-term
    })),

    // ═══════════════════════════════════════════════════════════════════
    // VII. INVESTMENT THESIS
    // ═══════════════════════════════════════════════════════════════════
    investmentThesis: v.object({
      thesisSummary: v.string(),
      keyDrivers: v.array(v.string()),        // Why this will work
      keyMilestones: v.optional(v.array(v.object({
        milestone: v.string(),
        timeframe: v.optional(v.string()),
        importance: v.optional(v.string()),
      }))),
      exitScenarios: v.optional(v.array(v.object({
        scenario: v.string(),
        probability: v.optional(v.string()),  // Low/Medium/High
        potentialReturn: v.optional(v.string()),
        acquirers: v.optional(v.array(v.string())),
      }))),
      comparableExits: v.optional(v.array(v.object({
        company: v.string(),
        exitType: v.string(),
        exitValue: v.string(),
        year: v.optional(v.number()),
      }))),
    }),

    // ═══════════════════════════════════════════════════════════════════
    // VERIFICATION & SOURCES
    // ═══════════════════════════════════════════════════════════════════
    verificationSummary: v.object({
      contradictionsFound: v.number(),
      contradictionsResolved: v.number(),
      overallConfidence: v.number(),          // 0-1
      dataCompleteness: v.number(),           // 0-1 how complete is the data
      sourceQuality: v.union(
        v.literal("high"),                    // Multiple authoritative sources
        v.literal("medium"),                  // Mix of sources
        v.literal("low")                      // Mostly inferred
      ),
    }),

    // All sources used across all branches
    sources: v.array(v.object({
      sourceType: v.string(),
      url: v.optional(v.string()),
      title: v.optional(v.string()),
      reliability: v.string(),
      section: v.optional(v.string()),        // Which memo section uses this
    })),

    // ═══════════════════════════════════════════════════════════════════
    // PERSONA READINESS
    // ═══════════════════════════════════════════════════════════════════
    personaReadiness: v.optional(v.record(v.string(), v.object({
      ready: v.boolean(),
      missingFields: v.optional(v.array(v.string())),
      relevanceScore: v.optional(v.number()), // 0-1 how relevant for this persona
    }))),

    // Timing
    createdAt: v.number(),
    updatedAt: v.number(),

    // Version control
    version: v.number(),
    previousVersionId: v.optional(v.id("dueDiligenceMemos")),
  })
    .index("by_jobId", ["jobId"])
    .index("by_entity", ["entityName", "entityType"])
    .index("by_verdict", ["verdict"])
    .index("by_createdAt", ["createdAt"])
    .searchIndex("search_entity", {
      searchField: "entityName",
      filterFields: ["entityType", "verdict"],
    }),

  /* ------------------------------------------------------------------ */
  /* INVESTOR PLAYBOOK - Verification jobs and cache tables              */
  /* ------------------------------------------------------------------ */

  // Investor protection verification jobs
  investorPlaybookJobs: defineTable({
    jobId: v.string(),                        // UUID for deduplication
    userId: v.id("users"),

    // Input - the offering being verified
    offeringName: v.string(),
    offeringUrl: v.optional(v.string()),
    fundingPortal: v.optional(v.string()),
    pitchDocumentId: v.optional(v.id("documents")),
    pitchText: v.optional(v.string()),

    // Extracted claims from pitch
    extractedClaims: v.optional(v.object({
      companyName: v.string(),
      companyNameVariants: v.optional(v.array(v.string())),
      incorporationState: v.optional(v.string()),
      incorporationDate: v.optional(v.string()),
      secFilingType: v.optional(v.string()),
      fundingPortal: v.optional(v.string()),
      fdaClaims: v.array(v.object({
        description: v.string(),
        claimedType: v.string(),
        clearanceNumber: v.optional(v.string()),
        productName: v.optional(v.string()),
      })),
      patentClaims: v.array(v.object({
        description: v.string(),
        patentNumber: v.optional(v.string()),
        status: v.string(),
        inventorNames: v.optional(v.array(v.string())),
      })),
      fundingClaims: v.optional(v.object({
        targetRaise: v.optional(v.string()),
        previousRaises: v.optional(v.array(v.string())),
        valuation: v.optional(v.string()),
      })),
      otherClaims: v.array(v.object({
        category: v.string(),
        claim: v.string(),
        evidence: v.optional(v.string()),
      })),
      extractedAt: v.number(),
      confidence: v.number(),
    })),

    // Status
    status: v.union(
      v.literal("pending"),
      v.literal("extracting_claims"),
      v.literal("verifying_entity"),
      v.literal("verifying_securities"),
      v.literal("validating_claims"),
      v.literal("checking_money_flow"),
      v.literal("synthesizing"),
      v.literal("completed"),
      v.literal("failed")
    ),

    // Phase results
    entityVerification: v.optional(v.object({
      verified: v.boolean(),
      stateRegistry: v.optional(v.string()),
      record: v.optional(v.object({
        state: v.string(),
        entityName: v.string(),
        fileNumber: v.string(),
        formationDate: v.optional(v.string()),
        registeredAgent: v.optional(v.string()),
        registeredAgentAddress: v.optional(v.string()),
        status: v.string(),
        entityType: v.optional(v.string()),
      })),
      discrepancies: v.array(v.string()),
      redFlags: v.array(v.string()),
      verifiedAt: v.number(),
    })),

    securitiesVerification: v.optional(v.object({
      verified: v.boolean(),
      filingType: v.optional(v.string()),
      filing: v.optional(v.object({
        formType: v.string(),
        filingDate: v.string(),
        cik: v.string(),
        accessionNumber: v.string(),
        issuerName: v.string(),
        offeringAmount: v.optional(v.string()),
        url: v.string(),
      })),
      filingFound: v.boolean(),
      fundingPortal: v.optional(v.object({
        portalName: v.string(),
        finraId: v.optional(v.string()),
        registrationDate: v.optional(v.string()),
        isRegistered: v.boolean(),
      })),
      portalVerified: v.boolean(),
      discrepancies: v.array(v.string()),
      redFlags: v.array(v.string()),
      verifiedAt: v.number(),
    })),

    claimsValidation: v.optional(v.object({
      fdaVerifications: v.array(v.object({
        claimDescription: v.string(),
        verified: v.boolean(),
        kNumber: v.optional(v.string()),
        deviceName: v.optional(v.string()),
        applicant: v.optional(v.string()),
        discrepancy: v.optional(v.string()),
      })),
      patentVerifications: v.array(v.object({
        claimDescription: v.string(),
        verified: v.boolean(),
        patentNumber: v.optional(v.string()),
        assignee: v.optional(v.string()),
        assigneeMatches: v.boolean(),
        discrepancy: v.optional(v.string()),
      })),
      allFDAClaimed: v.number(),
      allFDAVerified: v.number(),
      allPatentsClaimed: v.number(),
      allPatentsVerified: v.number(),
      verifiedAt: v.number(),
    })),

    moneyFlowVerification: v.optional(v.object({
      verified: v.boolean(),
      expectedFlow: v.string(),
      escrowAgent: v.optional(v.string()),
      escrowVerified: v.boolean(),
      redFlags: v.array(v.string()),
      verifiedAt: v.number(),
    })),

    // Final result link
    resultId: v.optional(v.id("investorPlaybookResults")),

    // Timing
    createdAt: v.number(),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    elapsedMs: v.optional(v.number()),

    // Error
    error: v.optional(v.string()),
  })
    .index("by_jobId", ["jobId"])
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_offering", ["offeringName"])
    .index("by_createdAt", ["createdAt"])
    .searchIndex("search_offering", {
      searchField: "offeringName",
      filterFields: ["status"],
    }),

  // State registry verification cache
  investorPlaybookEntityCache: defineTable({
    entityName: v.string(),
    state: v.string(),
    fileNumber: v.optional(v.string()),
    formationDate: v.optional(v.string()),
    entityType: v.optional(v.string()),
    status: v.union(
      v.literal("Active"),
      v.literal("Inactive"),
      v.literal("Dissolved"),
      v.literal("Merged"),
      v.literal("Suspended"),
      v.literal("Unknown")
    ),
    registeredAgent: v.optional(v.object({
      name: v.string(),
      address: v.string(),
    })),
    goodStanding: v.optional(v.boolean()),
    verifiedAt: v.number(),
    sourceUrl: v.optional(v.string()),
  })
    .index("by_entity_state", ["entityName", "state"])
    .index("by_verifiedAt", ["verifiedAt"]),

  // SEC EDGAR filings cache
  investorPlaybookSecCache: defineTable({
    entityName: v.string(),
    cik: v.optional(v.string()),
    formType: v.string(),                    // "C", "D", "10-K", etc.
    accessionNumber: v.string(),
    filingDate: v.string(),
    filingUrl: v.string(),
    offeringAmount: v.optional(v.number()),
    intermediaryName: v.optional(v.string()),
    parsedData: v.optional(v.any()),
    cachedAt: v.number(),
  })
    .index("by_entity", ["entityName"])
    .index("by_cik", ["cik"])
    .index("by_form", ["formType"])
    .index("by_cachedAt", ["cachedAt"]),

  // FDA verification cache
  investorPlaybookFdaCache: defineTable({
    entityName: v.string(),
    deviceName: v.optional(v.string()),
    verificationType: v.union(
      v.literal("510k"),
      v.literal("pma"),
      v.literal("registration"),
      v.literal("listing"),
      v.literal("recall"),
      v.literal("adverse_event")
    ),
    referenceNumber: v.string(),             // K-number, PMA number, etc.
    status: v.string(),
    decisionDate: v.optional(v.string()),
    productCode: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
    cachedAt: v.number(),
  })
    .index("by_entity", ["entityName"])
    .index("by_type", ["verificationType"])
    .index("by_reference", ["referenceNumber"])
    .index("by_cachedAt", ["cachedAt"]),

  // USPTO patent cache
  investorPlaybookPatentCache: defineTable({
    entityName: v.string(),
    patentNumber: v.string(),
    title: v.string(),
    inventors: v.array(v.string()),
    assignee: v.string(),
    currentAssignee: v.optional(v.string()),
    filingDate: v.optional(v.string()),
    issueDate: v.optional(v.string()),
    expirationDate: v.optional(v.string()),
    patentType: v.optional(v.string()),
    status: v.union(
      v.literal("Active"),
      v.literal("Expired"),
      v.literal("Lapsed")
    ),
    usptoUrl: v.string(),
    cachedAt: v.number(),
  })
    .index("by_entity", ["entityName"])
    .index("by_patent", ["patentNumber"])
    .index("by_assignee", ["assignee"])
    .index("by_cachedAt", ["cachedAt"]),

  // FINRA portal verification cache
  investorPlaybookFinraCache: defineTable({
    portalName: v.string(),
    crd: v.string(),
    secFileNumber: v.optional(v.string()),
    status: v.union(
      v.literal("Active"),
      v.literal("Inactive"),
      v.literal("Suspended"),
      v.literal("Withdrawn")
    ),
    registrationDate: v.optional(v.string()),
    website: v.optional(v.string()),
    disclosureCount: v.optional(v.number()),
    verifiedAt: v.number(),
  })
    .index("by_portal", ["portalName"])
    .index("by_crd", ["crd"])
    .index("by_verifiedAt", ["verifiedAt"]),

  // Investor playbook synthesis results
  investorPlaybookResults: defineTable({
    jobId: v.optional(v.string()),           // Links to DD job if part of full DD
    entityName: v.string(),
    entityType: v.union(
      v.literal("company"),
      v.literal("fund"),
      v.literal("person")
    ),

    // Overall assessment
    overallRisk: v.union(
      v.literal("low"),
      v.literal("moderate"),
      v.literal("elevated"),
      v.literal("high"),
      v.literal("critical")
    ),
    recommendation: v.union(
      v.literal("proceed"),
      v.literal("proceed_with_conditions"),
      v.literal("require_resolution"),
      v.literal("pass")
    ),
    shouldDisengage: v.boolean(),

    // Verification scores
    verificationScores: v.object({
      entity: v.number(),
      securities: v.number(),
      finra: v.number(),
      fda: v.number(),
      patents: v.number(),
      moneyFlow: v.number(),
      overall: v.number(),
    }),

    // Discrepancies
    discrepancyCount: v.number(),
    criticalDiscrepancies: v.number(),

    // Stop rules
    stopRulesTriggered: v.array(v.string()),

    // Conditions/resolutions
    conditions: v.optional(v.array(v.string())),
    requiredResolutions: v.optional(v.array(v.string())),

    // Branch execution
    branchesExecuted: v.array(v.string()),
    executionTimeMs: v.number(),

    // Full synthesis (stored as JSON)
    fullSynthesis: v.optional(v.any()),

    // Metadata
    createdAt: v.number(),
    userId: v.optional(v.id("users")),
  })
    .index("by_entity", ["entityName", "entityType"])
    .index("by_risk", ["overallRisk"])
    .index("by_recommendation", ["recommendation"])
    .index("by_createdAt", ["createdAt"])
    .index("by_jobId", ["jobId"]),

  /* ------------------------------------------------------------------ */
  /* DEEP RESEARCH - Multi-agent research system                         */
  /* ------------------------------------------------------------------ */

  // Deep research jobs
  deepResearchJobs: defineTable({
    jobId: v.string(),
    userId: v.id("users"),
    query: v.string(),
    depth: v.union(
      v.literal("quick"),
      v.literal("standard"),
      v.literal("comprehensive"),
      v.literal("exhaustive")
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("decomposing_query"),
      v.literal("spawning_agents"),
      v.literal("executing_research"),
      v.literal("cross_verifying"),
      v.literal("evaluating_hypotheses"),
      v.literal("synthesizing"),
      v.literal("completed"),
      v.literal("failed")
    ),

    // Query decomposition
    decomposedQuery: v.optional(v.any()), // DecomposedQuery

    // Sub-agent tracking
    subAgentTasks: v.optional(v.array(v.object({
      taskId: v.string(),
      type: v.string(),
      target: v.string(),
      status: v.string(),
      startedAt: v.optional(v.number()),
      completedAt: v.optional(v.number()),
    }))),

    // Results
    reportId: v.optional(v.id("deepResearchReports")),

    // Timing
    createdAt: v.number(),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    elapsedMs: v.optional(v.number()),
    error: v.optional(v.string()),
  })
    .index("by_jobId", ["jobId"])
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_createdAt", ["createdAt"]),

  // Deep research reports
  deepResearchReports: defineTable({
    jobId: v.string(),
    originalQuery: v.string(),

    // Summary
    executiveSummary: v.string(),
    keyFindings: v.array(v.string()),
    confidence: v.number(),

    // Verdict
    overallVerdict: v.union(
      v.literal("VERIFIED"),
      v.literal("PARTIALLY_SUPPORTED"),
      v.literal("UNVERIFIED"),
      v.literal("CONTRADICTED"),
      v.literal("FALSIFIED")
    ),
    verdictReasoning: v.string(),

    // Findings (stored as JSON)
    personProfiles: v.optional(v.any()),
    companyProfiles: v.optional(v.any()),
    newsEvents: v.optional(v.any()),
    relationships: v.optional(v.any()),
    hypothesesEvaluated: v.optional(v.any()),

    // Verified claims
    verifiedClaimsCount: v.number(),
    unverifiedClaimsCount: v.number(),
    contradictionsCount: v.number(),

    // Sources
    sourcesCount: v.number(),

    // Sub-agent summary
    subAgentsSummary: v.optional(v.any()),

    // Timing
    executionTimeMs: v.number(),
    createdAt: v.number(),
    userId: v.optional(v.id("users")),
  })
    .index("by_jobId", ["jobId"])
    .index("by_verdict", ["overallVerdict"])
    .index("by_createdAt", ["createdAt"]),

  /* ------------------------------------------------------------------ */
  /* DD GROUND TRUTH - Golden dataset for DD evaluation                  */
  /* ------------------------------------------------------------------ */
  ddGroundTruth: defineTable({
    entityName: v.string(),
    entityType: v.union(
      v.literal("company"),
      v.literal("fund"),
      v.literal("person")
    ),

    // Verified facts with sources
    verifiedFacts: v.object({
      // Company facts
      foundedYear: v.optional(v.object({
        value: v.number(),
        source: v.string(),
        verifiedAt: v.number(),
      })),
      hqLocation: v.optional(v.object({
        value: v.string(),
        source: v.string(),
        verifiedAt: v.number(),
      })),
      employeeCount: v.optional(v.object({
        value: v.number(),
        asOf: v.string(),
        source: v.string(),
        verifiedAt: v.number(),
      })),

      // Funding facts (SEC Form D verified)
      fundingRounds: v.optional(v.array(v.object({
        roundType: v.string(),
        amount: v.number(),
        date: v.string(),
        secFormDUrl: v.optional(v.string()),
        verified: v.boolean(),
      }))),

      // Team facts (LinkedIn verified)
      keyPeople: v.optional(v.array(v.object({
        name: v.string(),
        role: v.string(),
        linkedinUrl: v.optional(v.string()),
        verified: v.boolean(),
      }))),

      // Patent facts (USPTO verified)
      patents: v.optional(v.array(v.object({
        patentId: v.string(),
        title: v.string(),
        inventors: v.array(v.string()),
        usptoUrl: v.optional(v.string()),
        verified: v.boolean(),
      }))),

      // Regulatory facts
      regulatoryStatus: v.optional(v.object({
        type: v.string(),                     // FDA, SEC, etc.
        status: v.string(),
        source: v.string(),
        verifiedAt: v.number(),
      })),
    }),

    // Expected memo content for evaluation
    expectedMemo: v.optional(v.object({
      expectedVerdict: v.optional(v.string()),
      expectedRiskCategories: v.optional(v.array(v.string())),
      expectedCompetitors: v.optional(v.array(v.string())),
    })),

    // Curation status
    curatorId: v.optional(v.id("users")),
    curationStatus: v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("verified"),
      v.literal("contested")
    ),
    curatorNotes: v.optional(v.string()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_entity", ["entityName", "entityType"])
    .index("by_curation_status", ["curationStatus"]),

  /* ================================================================== */
  /* ENCOUNTER EVENTS - Fast pipeline capture for side-events           */
  /* ================================================================== */
  encounterEvents: defineTable({
    userId: v.id("users"),

    // Source tracking
    sourceType: v.union(
      v.literal("slack"),
      v.literal("web_ui"),
      v.literal("email_forward"),
      v.literal("calendar_sync")
    ),
    sourceId: v.optional(v.string()),
    sourceChannelId: v.optional(v.string()),

    // Core encounter data
    rawText: v.string(),
    title: v.string(),
    context: v.optional(v.string()),

    // Extracted entities (from NER pass)
    participants: v.array(v.object({
      name: v.string(),
      role: v.optional(v.string()),
      company: v.optional(v.string()),
      email: v.optional(v.string()),
      linkedEntityId: v.optional(v.id("entityContexts")),
      confidence: v.number(),
    })),
    companies: v.array(v.object({
      name: v.string(),
      linkedEntityId: v.optional(v.id("entityContexts")),
      confidence: v.number(),
    })),

    // Research status
    researchStatus: v.union(
      v.literal("none"),
      v.literal("fast_pass_queued"),
      v.literal("fast_pass_complete"),
      v.literal("deep_dive_queued"),
      v.literal("deep_dive_running"),
      v.literal("complete")
    ),

    // Fast-pass results (inline for <10s display)
    fastPassResults: v.optional(v.object({
      entitySummaries: v.array(v.object({
        entityName: v.string(),
        summary: v.string(),
        keyFacts: v.array(v.string()),
        fundingStage: v.optional(v.string()),
        lastFundingAmount: v.optional(v.string()),
        sector: v.optional(v.string()),
      })),
      generatedAt: v.number(),
      elapsedMs: v.number(),
    })),

    // Deep dive reference
    ddJobId: v.optional(v.string()),
    ddMemoId: v.optional(v.id("dueDiligenceMemos")),

    // Follow-up tracking
    followUpRequested: v.boolean(),
    followUpDate: v.optional(v.number()),
    followUpTaskId: v.optional(v.id("userEvents")),
    suggestedNextAction: v.optional(v.string()),

    // Timestamps
    capturedAt: v.number(),
    enrichedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "researchStatus"])
    .index("by_source", ["sourceType", "sourceId"])
    .index("by_user_captured", ["userId", "capturedAt"])
    .index("by_dd_job", ["ddJobId"])
    .searchIndex("search_encounter", {
      searchField: "rawText",
      filterFields: ["userId", "researchStatus"],
    }),

  /* ================================================================== */
  /* NEWS ITEMS - Ingested content from feed sources for blip pipeline  */
  /* ================================================================== */
  newsItems: defineTable({
    // Unique identification
    sourceId: v.string(),
    contentHash: v.string(),

    // Source metadata
    source: v.union(
      v.literal("hacker_news"),
      v.literal("arxiv"),
      v.literal("reddit"),
      v.literal("rss"),
      v.literal("github"),
      v.literal("product_hunt"),
      v.literal("dev_to"),
      v.literal("twitter"),
      v.literal("manual")
    ),
    sourceUrl: v.string(),

    // Content
    title: v.string(),
    fullContent: v.optional(v.string()),
    summary: v.optional(v.string()),

    // Classification
    category: v.union(
      v.literal("tech"),
      v.literal("ai_ml"),
      v.literal("funding"),
      v.literal("research"),
      v.literal("security"),
      v.literal("startup"),
      v.literal("product"),
      v.literal("regulatory"),
      v.literal("markets"),
      v.literal("general")
    ),
    tags: v.array(v.string()),

    // Engagement metrics (for ranking)
    engagementScore: v.number(),
    rawMetrics: v.optional(v.object({
      upvotes: v.optional(v.number()),
      comments: v.optional(v.number()),
      shares: v.optional(v.number()),
      stars: v.optional(v.number()),
    })),

    // Processing status
    processingStatus: v.union(
      v.literal("ingested"),
      v.literal("claim_extraction"),
      v.literal("blips_generated"),
      v.literal("verification_queued"),
      v.literal("complete")
    ),

    // Timestamps
    publishedAt: v.number(),
    ingestedAt: v.number(),
    processedAt: v.optional(v.number()),
  })
    .index("by_source_id", ["sourceId"])
    .index("by_content_hash", ["contentHash"])
    .index("by_source", ["source", "publishedAt"])
    .index("by_category", ["category", "publishedAt"])
    .index("by_status", ["processingStatus"])
    .index("by_engagement", ["engagementScore"])
    .index("by_published", ["publishedAt"]),

  /* ================================================================== */
  /* CLAIM SPANS - Extracted atomic claims from news items              */
  /* ================================================================== */
  claimSpans: defineTable({
    newsItemId: v.id("newsItems"),

    // Claim content
    claimText: v.string(),
    originalSpan: v.string(),
    spanStartIdx: v.number(),
    spanEndIdx: v.number(),

    // Classification
    claimType: v.union(
      v.literal("factual"),
      v.literal("quantitative"),
      v.literal("attribution"),
      v.literal("temporal"),
      v.literal("causal"),
      v.literal("comparative"),
      v.literal("predictive"),
      v.literal("opinion")
    ),

    // Entities mentioned
    entities: v.array(v.object({
      name: v.string(),
      type: v.union(
        v.literal("company"),
        v.literal("person"),
        v.literal("product"),
        v.literal("technology"),
        v.literal("organization"),
        v.literal("location")
      ),
      linkedEntityId: v.optional(v.id("entityContexts")),
    })),

    // Verification status
    verificationStatus: v.union(
      v.literal("unverified"),
      v.literal("pending"),
      v.literal("verified"),
      v.literal("partially_verified"),
      v.literal("contradicted"),
      v.literal("unverifiable")
    ),
    verificationId: v.optional(v.id("blipClaimVerifications")),

    // Confidence
    extractionConfidence: v.number(),

    createdAt: v.number(),
  })
    .index("by_news_item", ["newsItemId"])
    .index("by_verification", ["verificationStatus"])
    .index("by_type", ["claimType"]),

  /* ================================================================== */
  /* MEANING BLIPS - Universal blips with persona lens at render time   */
  /* ================================================================== */
  meaningBlips: defineTable({
    // Source linkage
    newsItemId: v.id("newsItems"),
    claimSpanId: v.optional(v.id("claimSpans")),

    // Core blip content (UNIVERSAL - no persona baked in)
    headline: v.string(),     // 5-word version
    summary: v.string(),      // 10-word version
    context: v.string(),      // 20-word version

    // Key facts for hover popover
    keyFacts: v.array(v.object({
      fact: v.string(),
      source: v.optional(v.string()),
      date: v.optional(v.string()),
      confidence: v.number(),
    })),

    // Entity spotlight
    primaryEntity: v.optional(v.object({
      name: v.string(),
      type: v.string(),
      linkedEntityId: v.optional(v.id("entityContexts")),
    })),

    // Verification summary
    verificationSummary: v.object({
      totalClaims: v.number(),
      verifiedClaims: v.number(),
      contradictedClaims: v.number(),
      overallConfidence: v.number(),
    }),

    // Source attribution
    sources: v.array(v.object({
      name: v.string(),
      url: v.optional(v.string()),
      publishedAt: v.optional(v.number()),
      reliability: v.union(
        v.literal("authoritative"),
        v.literal("reliable"),
        v.literal("secondary"),
        v.literal("inferred")
      ),
    })),

    // Ranking signals
    relevanceScore: v.number(),
    engagementScore: v.number(),
    freshnessScore: v.number(),

    // Category for filtering
    category: v.string(),
    tags: v.array(v.string()),

    // Timestamps
    publishedAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_news_item", ["newsItemId"])
    .index("by_category", ["category", "publishedAt"])
    .index("by_relevance", ["relevanceScore"])
    .index("by_published", ["publishedAt"]),

  /* ================================================================== */
  /* PERSONA LENSES - Pre-computed persona-specific view hints          */
  /* ================================================================== */
  personaLenses: defineTable({
    blipId: v.id("meaningBlips"),
    personaId: v.string(),   // "JPM_STARTUP_BANKER", "EARLY_STAGE_VC", etc.

    // Persona-specific framing
    framingHook: v.string(),
    actionPrompt: v.optional(v.string()),
    relevanceScore: v.number(),

    // Why it matters for this persona
    whyItMatters: v.optional(v.string()),

    createdAt: v.number(),
  })
    .index("by_blip", ["blipId"])
    .index("by_persona", ["personaId", "relevanceScore"])
    .index("by_blip_persona", ["blipId", "personaId"]),

  /* ================================================================== */
  /* BLIP CLAIM VERIFICATIONS - LLM-as-judge verification results       */
  /* ================================================================== */
  blipClaimVerifications: defineTable({
    claimSpanId: v.id("claimSpans"),

    // Verification result
    verdict: v.union(
      v.literal("verified"),
      v.literal("partially_verified"),
      v.literal("contradicted"),
      v.literal("unverifiable"),
      v.literal("insufficient_evidence")
    ),
    confidence: v.number(),

    // Evidence
    supportingEvidence: v.array(v.object({
      sourceUrl: v.optional(v.string()),
      sourceName: v.string(),
      snippet: v.string(),
      publishedAt: v.optional(v.number()),
      alignment: v.union(
        v.literal("supports"),
        v.literal("contradicts"),
        v.literal("neutral")
      ),
    })),

    // Contradictions found
    contradictions: v.optional(v.array(v.object({
      contradictingClaim: v.string(),
      sourceUrl: v.optional(v.string()),
      sourceName: v.string(),
    }))),

    // LLM judge metadata
    judgeModel: v.string(),
    judgeReasoning: v.string(),

    // Timing
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_claim", ["claimSpanId"])
    .index("by_verdict", ["verdict"])
    .index("by_confidence", ["confidence"]),
});
