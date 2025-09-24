// convex/schema.ts --------------------------------------------------------
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

/* ------------------------------------------------------------------ */
/* 1.  DOCUMENTS  –  page/board/post level metadata                    */
/* ------------------------------------------------------------------ */
const documents = defineTable({
  title:       v.string(),
  parentId:   v.optional(v.id("documents")),  // hierarchy
  isPublic:    v.boolean(),
  // When true, public viewers may also edit (used by ProseMirror + UI to toggle read-only)
  allowPublicEdit: v.optional(v.boolean()),
  createdBy:   v.id("users"),
  lastEditedBy: v.optional(v.id("users")),    // who last edited this document
  coverImage:  v.optional(v.id("_storage")),
  // LEGACY: holds ProseMirror JSON blob; retained temporarily for migration
  content:     v.optional(v.string()),
  icon:        v.optional(v.string()),
  isArchived:  v.optional(v.boolean()),
  isFavorite:  v.optional(v.boolean()),
  publishedAt: v.optional(v.number()),        // ms since epoch
  /** points at the top GraphNode that owns the editor view */
  rootNodeId:  v.optional(v.id("nodes")),
  lastModified: v.optional(v.number()),       // ms since epoch - when document was last updated
  // Optional: associate a document with a calendar day (local midnight ms)
  agendaDate: v.optional(v.number()),
  // Rolling count of snapshots for this document (maintained on insert/delete)
  snapshotCount: v.optional(v.number()),

  // FILE & SPECIAL DOCUMENT SUPPORT
  documentType: v.optional(
    v.union(
      v.literal("text"),
      v.literal("file"),
      v.literal("timeline")
    )
  ), // "text" (default) | "file" | "timeline"
  fileId:      v.optional(v.id("files")),     // reference to files table for file documents
  fileType:    v.optional(v.string()),        // "csv", "pdf", "image", etc. for file documents
  mimeType:    v.optional(v.string()),        // MIME type for file documents
})
  .index("by_user",           ["createdBy"])
  .index("by_user_archived",  ["createdBy", "isArchived"])
  .index("by_parent",         ["parentId"])
  .index("by_public",         ["isPublic"])
  // For calendar integration: query notes by day per-user
  .index("by_user_agendaDate", ["createdBy", "agendaDate"])
  .searchIndex("search_title", {
    searchField:  "title",
    filterFields: ["isPublic", "createdBy", "isArchived"],
  });

/* ------------------------------------------------------------------ */
/* 2.  NODES  –  one row per ProseMirror block (GraphNode)             */
/* ------------------------------------------------------------------ */
const nodes = defineTable({
  documentId:    v.id("documents"),           // which doc/board it belongs to
  parentId:      v.optional(v.id("nodes")),   // null ⇒ root
  order:         v.number(),                  // sibling ordering
  type:          v.string(),                  // "paragraph" | "heading" | …
  text:          v.optional(v.string()),      // plain text (for search)
  json:          v.optional(v.any()),         // full PM node as JSON
  authorId:      v.id("users"),               // who created this node
  lastEditedBy:  v.optional(v.id("users")),   // who last edited this node
  createdAt:     v.number(),
  updatedAt:     v.number(),
  isUserNode:    v.optional(v.boolean()),     // flags for mention logic
})
  .index("by_document", ["documentId", "order"])
  .index("by_parent",   ["parentId",  "order"])
  .index("by_updated",  ["updatedAt"])
  .searchIndex("search_text", {
    searchField:  "text",
    filterFields: ["documentId", "authorId"],
  });

/* ------------------------------------------------------------------ */
/* 3.  RELATIONS  –  arbitrary graph edges (“child”, “relatedTo”… )    */
/* ------------------------------------------------------------------ */
const relations = defineTable({
  from:           v.id("nodes"),
  to:             v.id("nodes"),
  relationTypeId: v.string(),                 // store the string id, faster than join
  order:          v.optional(v.number()),     // for ordered children
  createdBy:      v.id("users"),
  createdAt:      v.number(),
})
  .index("by_from", ["from"])
  .index("by_to",   ["to"])
  .index("by_type", ["relationTypeId"]);

/* ------------------------------------------------------------------ */
/* 4.  RELATION TYPES  –  mostly static, but editable in UI            */
/* ------------------------------------------------------------------ */
const relationTypes = defineTable({
  id:   v.string(),                           // "child", "relatedTo", "hashtag"…
  name: v.string(),
  icon: v.optional(v.string()),
})
  // Quick look-up by primary string id (e.g. "child")
  .index("by_relationId", ["id"]);

/* ------------------------------------------------------------------ */
/* 5.  TAGS  –  domain/entity/topic keywords                           */
/* ------------------------------------------------------------------ */
export const tags = defineTable({
  name:        v.string(),                 // canonical tag text (lower-cased)
  kind:        v.optional(v.string()),     // "domain" | "entity" | "topic" etc
  importance:  v.optional(v.float64()),    // 0–1 weighting when ranking context
  createdBy:   v.id("users"),
  createdAt:   v.number(),
})
  .index("by_name", ["name"])
  .index("by_kind", ["kind"])
  .searchIndex("search_name", {
    searchField:  "name",
    filterFields: ["kind"],
  });

/* ------------------------------------------------------------------ */
/* 6.  TAG REFERENCES  –  many-to-many tag ↔ page/node                 */
/* ------------------------------------------------------------------ */
export const tagRefs = defineTable({
  tagId:      v.id("tags"),
  targetId:   v.string(),                 // generic Id in string form
  targetType: v.string(),                 // "documents" | "nodes"
  createdBy:  v.id("users"),
  createdAt:  v.number(),
})
  .index("by_tag",    ["tagId"])
  .index("by_target", ["targetId", "targetType"]);

/* ------------------------------------------------------------------ */
/* 7.  SMS LOGS                                                        */
/* ------------------------------------------------------------------ */
export const smsLogs = defineTable({
  to:        v.string(),
  body:      v.string(),
  status:    v.string(),       // "sent" | "failed"
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
  vector:    v.array(v.float64()),     // normalised
});

/* ------------------------------------------------------------------ */
/* 6.  Bring it all together                                           */
/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/* 9.  GRID PROJECTS  –  saved multi-document grid configurations     */
/* ------------------------------------------------------------------ */
const gridProjects = defineTable({
  name:        v.string(),                    // user-defined name for the grid project
  description: v.optional(v.string()),       // optional description
  createdBy:   v.id("users"),               // owner of the grid project
  documentIds: v.array(v.id("documents")),   // array of document IDs in the grid
  layout:      v.object({                    // grid layout configuration
    cols: v.number(),
    rows: v.number(),
    gridClass: v.string(),
    name: v.string(),
  }),
  createdAt:   v.number(),                   // ms since epoch
  updatedAt:   v.number(),                   // ms since epoch
  isArchived:  v.optional(v.boolean()),      // soft delete
})
  .index("by_user", ["createdBy"])
  .index("by_user_archived", ["createdBy", "isArchived"]);

/* ------------------------------------------------------------------ */
/* 7.  FILES  –  uploaded files for analysis                           */
/* ------------------------------------------------------------------ */
const files = defineTable({
  userId:       v.string(),                     // user ID from auth
  storageId:    v.string(),                     // Convex storage ID
  fileName:     v.string(),                     // original filename
  fileType:     v.string(),                     // "video", "image", "audio", "document"
  mimeType:     v.string(),                     // MIME type
  fileSize:     v.number(),                     // file size in bytes

  // Analysis results
  analysis:       v.optional(v.string()),      // analysis text result
  structuredData: v.optional(v.any()),         // structured analysis data
  analysisType:   v.optional(v.string()),      // type of analysis performed
  processingTime: v.optional(v.number()),      // time taken for analysis in ms
  analyzedAt:     v.optional(v.number()),      // ms since epoch when analyzed

  // Metadata
  isPublic:     v.optional(v.boolean()),       // whether file is publicly accessible
  tags:         v.optional(v.array(v.string())), // user-defined tags
  description:  v.optional(v.string()),        // user description

  // Modification tracking for CSV editing
  lastModified:     v.optional(v.number()),    // ms since epoch when last modified
  modificationCount: v.optional(v.number()),   // number of times file has been modified
  parentFileId:     v.optional(v.id("files")), // reference to original file if this is a copy/export

  // GenAI cache & extracted metadata (optional)
  genaiFileName:   v.optional(v.string()),
  genaiFileUri:    v.optional(v.string()),
  cacheName:       v.optional(v.string()),
  cacheExpiresAt:  v.optional(v.number()),
  metadata:        v.optional(v.any()),
  contentSummary:  v.optional(v.string()),
  textPreview:     v.optional(v.string()),
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
  userId:       v.string(),                     // user ID from auth
  url:          v.string(),                     // analyzed URL
  analysis:     v.optional(v.string()),        // analysis text result
  structuredData: v.optional(v.any()),         // structured analysis data
  analyzedAt:   v.number(),                     // ms since epoch when analyzed
  contentType:  v.optional(v.string()),        // detected content type
})
  .index("by_user", ["userId"])
  .index("by_url", ["url"]);

/* ------------------------------------------------------------------ */
/* 8b. FILE CHUNKS  –  extracted chunks + embeddings per file          */
/* ------------------------------------------------------------------ */
const chunks = defineTable({
  fileId:   v.id("files"),
  text:     v.string(),
  meta:     v.optional(v.any()), // { page?, startTimeSec?, endTimeSec? }
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
  .index("by_name", ["name"]);

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
  .index("by_createdAt", ["createdAt"]);

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
  .index("by_name", ["name"]);

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
  agentRuns,
  agentRunEvents,
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

});