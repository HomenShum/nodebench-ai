// convex/schema.ts --------------------------------------------------------
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

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
  status: v.string(),       // "sent" | "failed"
  createdAt: v.number(),
})
  .index("by_to", ["to"]);

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
    // Onboarding status
    onboardingSeededAt: v.optional(v.number()),
    // Future: more UI preferences can be added here
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"]);

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
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"]) // status filtering
    .index("by_user_start", ["userId", "startTime"]) // for range queries
    .index("by_document", ["documentId"]);


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
  /* TASKS – personal task management                                   */
  /* ------------------------------------------------------------------ */
  const tasks = defineTable({
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
          v.object({ kind: v.literal("task"), id: v.id("tasks") }),
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
    documentId: v.id("documents"),
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
    .index("by_user", ["createdBy"]);

  const agentTasks = defineTable({
    timelineId: v.id("agentTimelines"),
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
  }).index("by_timeline", ["timelineId"]).index("by_parent", ["parentId"]);

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

  export default defineSchema({
    ...authTables,       // `users`, `sessions`
    documents,
    nodes,
    relations,
    relationTypes,
    tags,
    tagRefs,
    smsLogs,
    embeddings,
    gridProjects,
    files,
    urlAnalyses,
    chunks,
    folders,
    documentFolders,
    userPreferences,
    events,
    tasks,
    holidays,
    financialEvents,
    mcpServers,
    mcpTools,
    mcpSessions,
    mcpPlans,
    mcpMemoryEntries,
    agentRuns,
    agentRunEvents,
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
      goal: v.string(),
      steps: v.array(v.object({
        description: v.string(),
        status: v.union(
          v.literal("pending"),
          v.literal("in_progress"),
          v.literal("completed")
        ),
      })),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_user_updated", ["userId", "updatedAt"]),

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

  });
