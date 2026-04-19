import { defineTable } from "convex/server";
import { v } from "convex/values";

export const productLensValidator = v.union(
  v.literal("founder"),
  v.literal("investor"),
  v.literal("banker"),
  v.literal("ceo"),
  v.literal("legal"),
  v.literal("student"),
);

export const productEvidenceTypeValidator = v.union(
  v.literal("file"),
  v.literal("document"),
  v.literal("link"),
  v.literal("voice"),
  v.literal("camera"),
  v.literal("image"),
  v.literal("text"),
);

export const productSectionStatusValidator = v.union(
  v.literal("pending"),
  v.literal("building"),
  v.literal("complete"),
);

export const productReportSectionValidator = v.object({
  id: v.string(),
  title: v.string(),
  body: v.string(),
  status: productSectionStatusValidator,
  sourceRefIds: v.optional(v.array(v.string())),
});

export const productRoutingModeValidator = v.union(
  v.literal("executive"),
  v.literal("advisor"),
);

export const productRoutingDecisionValidator = v.object({
  routingMode: productRoutingModeValidator,
  routingReason: v.optional(v.string()),
  routingSource: v.optional(v.union(v.literal("automatic"), v.literal("user_forced"))),
  plannerModel: v.optional(v.string()),
  executionModel: v.optional(v.string()),
  reasoningEffort: v.optional(v.union(v.literal("medium"), v.literal("high"))),
});

export const productOperatorContextSnapshotValidator = v.object({
  label: v.optional(v.string()),
  hint: v.optional(v.string()),
});

export const productNoteBlockKindValidator = v.union(
  v.literal("observation"),
  v.literal("insight"),
  v.literal("question"),
  v.literal("action"),
);

export const productNoteBlockValidator = v.object({
  id: v.string(),
  kind: productNoteBlockKindValidator,
  title: v.string(),
  body: v.string(),
});

export const productDocumentKindValidator = v.union(
  v.literal("entity_memory"),
  v.literal("report_memory"),
);

export const productDocumentBlockTypeValidator = v.union(
  v.literal("paragraph"),
  v.literal("heading"),
  v.literal("bullet"),
  v.literal("quote"),
  v.literal("check"),
  v.literal("code"),
);

export const productDocumentBlockValidator = v.object({
  blockId: v.string(),
  parentBlockId: v.optional(v.string()),
  order: v.number(),
  type: productDocumentBlockTypeValidator,
  depth: v.optional(v.number()),
  text: v.string(),
  markdown: v.optional(v.string()),
  lexical: v.optional(v.any()),
  entityRefs: v.optional(v.array(v.string())),
  sourceRefs: v.optional(v.array(v.string())),
});

export const productSourceValidator = v.object({
  id: v.string(),
  label: v.string(),
  href: v.optional(v.string()),
  type: v.optional(v.string()),
  status: v.optional(v.string()),
  title: v.optional(v.string()),
  domain: v.optional(v.string()),
  siteName: v.optional(v.string()),
  faviconUrl: v.optional(v.string()),
  publishedAt: v.optional(v.string()),
  thumbnailUrl: v.optional(v.string()),
  imageCandidates: v.optional(v.array(v.string())),
  excerpt: v.optional(v.string()),
  confidence: v.optional(v.number()),
});

export const productPublicCards = defineTable({
  key: v.string(),
  title: v.string(),
  summary: v.string(),
  prompt: v.string(),
  lens: productLensValidator,
  visibility: v.union(v.literal("public"), v.literal("internal")),
  sourceLabel: v.optional(v.string()),
  sourceUrl: v.optional(v.string()),
  rank: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_key", ["key"])
  .index("by_visibility_rank", ["visibility", "rank"]);

export const productMigrationState = defineTable({
  ownerKey: v.string(),
  schemaVersion: v.string(),
  bootstrappedAt: v.number(),
  claimedAnonymousRows: v.optional(v.number()),
  migratedFiles: v.number(),
  migratedDocuments: v.number(),
  migratedReports: v.number(),
  updatedAt: v.number(),
})
  .index("by_owner", ["ownerKey"]);

export const productInputBundles = defineTable({
  ownerKey: v.string(),
  query: v.string(),
  lens: productLensValidator,
  entrySurface: v.union(
    v.literal("home"),
    v.literal("chat"),
    v.literal("reports"),
    v.literal("nudges"),
    v.literal("me"),
  ),
  status: v.union(
    v.literal("draft"),
    v.literal("queued"),
    v.literal("processing"),
    v.literal("complete"),
    v.literal("error"),
  ),
  rawText: v.optional(v.string()),
  links: v.optional(v.array(v.string())),
  uploadedFiles: v.optional(
    v.array(
      v.object({
        evidenceId: v.optional(v.id("productEvidenceItems")),
        name: v.string(),
        type: v.string(),
        size: v.optional(v.number()),
      }),
    ),
  ),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_owner_updated", ["ownerKey", "updatedAt"]);

export const productEvidenceItems = defineTable({
  ownerKey: v.string(),
  bundleId: v.optional(v.id("productInputBundles")),
  reportId: v.optional(v.id("productReports")),
  sessionId: v.optional(v.id("productChatSessions")),
  entityId: v.optional(v.id("productEntities")),
  type: productEvidenceTypeValidator,
  label: v.string(),
  description: v.optional(v.string()),
  status: v.union(
    v.literal("ready"),
    v.literal("processing"),
    v.literal("linked"),
  ),
  sourceUrl: v.optional(v.string()),
  mimeType: v.optional(v.string()),
  textPreview: v.optional(v.string()),
  legacyFileId: v.optional(v.id("files")),
  legacyDocumentId: v.optional(v.id("documents")),
  metadata: v.optional(v.any()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_owner_updated", ["ownerKey", "updatedAt"])
  .index("by_owner_bundle", ["ownerKey", "bundleId"])
  .index("by_owner_report", ["ownerKey", "reportId"])
  .index("by_owner_session", ["ownerKey", "sessionId"])
  .index("by_owner_entity", ["ownerKey", "entityId"])
  .index("by_owner_legacy_file", ["ownerKey", "legacyFileId"])
  .index("by_owner_legacy_document", ["ownerKey", "legacyDocumentId"]);

export const productChatSessions = defineTable({
  ownerKey: v.string(),
  bundleId: v.optional(v.id("productInputBundles")),
  linkedReportId: v.optional(v.id("productReports")),
  query: v.string(),
  lens: productLensValidator,
  title: v.string(),
  status: v.union(
    v.literal("queued"),
    v.literal("streaming"),
    v.literal("complete"),
    v.literal("error"),
  ),
  latestSummary: v.optional(v.string()),
  lastError: v.optional(v.string()),
  totalDurationMs: v.optional(v.number()),
  routing: v.optional(productRoutingDecisionValidator),
  operatorContext: v.optional(productOperatorContextSnapshotValidator),
  autoSavedReportId: v.optional(v.id("productReports")),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_owner_updated", ["ownerKey", "updatedAt"])
  .index("by_owner_report", ["ownerKey", "linkedReportId"]);

export const productChatEvents = defineTable({
  ownerKey: v.string(),
  sessionId: v.id("productChatSessions"),
  type: v.union(
    v.literal("message"),
    v.literal("system"),
    v.literal("milestone"),
    v.literal("error"),
  ),
  label: v.string(),
  body: v.string(),
  payload: v.optional(v.any()),
  createdAt: v.number(),
})
  .index("by_session_created", ["sessionId", "createdAt"])
  .index("by_owner_created", ["ownerKey", "createdAt"]);

export const productToolEvents = defineTable({
  ownerKey: v.string(),
  sessionId: v.id("productChatSessions"),
  tool: v.string(),
  provider: v.optional(v.string()),
  model: v.optional(v.string()),
  step: v.number(),
  totalPlanned: v.number(),
  reason: v.optional(v.string()),
  status: v.union(
    v.literal("running"),
    v.literal("done"),
    v.literal("error"),
  ),
  durationMs: v.optional(v.number()),
  tokensIn: v.optional(v.number()),
  tokensOut: v.optional(v.number()),
  preview: v.optional(v.string()),
  startedAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_session_step", ["sessionId", "step"])
  .index("by_owner_updated", ["ownerKey", "updatedAt"]);

export const productSourceEvents = defineTable({
  ownerKey: v.string(),
  sessionId: v.id("productChatSessions"),
  sourceKey: v.string(),
  label: v.string(),
  href: v.optional(v.string()),
  type: v.optional(v.string()),
  status: v.optional(v.string()),
  title: v.optional(v.string()),
  domain: v.optional(v.string()),
  siteName: v.optional(v.string()),
  faviconUrl: v.optional(v.string()),
  publishedAt: v.optional(v.string()),
  thumbnailUrl: v.optional(v.string()),
  imageCandidates: v.optional(v.array(v.string())),
  excerpt: v.optional(v.string()),
  confidence: v.optional(v.number()),
  createdAt: v.number(),
})
  .index("by_session_created", ["sessionId", "createdAt"])
  .index("by_owner_created", ["ownerKey", "createdAt"]);

export const productReportDrafts = defineTable({
  ownerKey: v.string(),
  sessionId: v.id("productChatSessions"),
  title: v.string(),
  status: v.union(
    v.literal("pending"),
    v.literal("building"),
    v.literal("complete"),
  ),
  sections: v.array(productReportSectionValidator),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_session", ["sessionId"])
  .index("by_owner_updated", ["ownerKey", "updatedAt"]);

export const productEntities = defineTable({
  ownerKey: v.string(),
  slug: v.string(),
  name: v.string(),
  entityType: v.string(),
  summary: v.string(),
  savedBecause: v.optional(v.string()),
  latestReportId: v.optional(v.id("productReports")),
  latestReportUpdatedAt: v.optional(v.number()),
  latestRevision: v.number(),
  reportCount: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_owner_updated", ["ownerKey", "updatedAt"])
  .index("by_owner_slug", ["ownerKey", "slug"])
  .index("by_owner_name", ["ownerKey", "name"]);

export const productEntityNotes = defineTable({
  ownerKey: v.string(),
  entityId: v.id("productEntities"),
  content: v.string(),
  blocks: v.optional(v.array(productNoteBlockValidator)),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_entity", ["entityId"])
  .index("by_owner_updated", ["ownerKey", "updatedAt"]);

export const productWorkspaceShareAccessValidator = v.union(
  v.literal("view"),
  v.literal("edit"),
);

export const productWorkspaceShareResourceValidator = v.literal("entity_workspace");

export const productWorkspaceInviteStatusValidator = v.union(
  v.literal("pending"),
  v.literal("accepted"),
);

export const productWorkspaceShares = defineTable({
  ownerKey: v.string(),
  resourceType: productWorkspaceShareResourceValidator,
  entityId: v.id("productEntities"),
  entitySlug: v.string(),
  token: v.string(),
  access: productWorkspaceShareAccessValidator,
  revokedAt: v.optional(v.number()),
  expiresAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_token", ["token"])
  .index("by_owner_entity", ["ownerKey", "entityId", "updatedAt"])
  .index("by_owner_entity_access", ["ownerKey", "entityId", "access", "updatedAt"])
  .index("by_owner_updated", ["ownerKey", "updatedAt"]);

export const productEntityWorkspaceMembers = defineTable({
  ownerKey: v.string(),
  entityId: v.id("productEntities"),
  entitySlug: v.string(),
  userId: v.id("users"),
  userEmail: v.string(),
  userName: v.optional(v.string()),
  userImage: v.optional(v.string()),
  token: v.string(),
  access: productWorkspaceShareAccessValidator,
  invitedByUserId: v.optional(v.id("users")),
  revokedAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_token", ["token"])
  .index("by_owner_entity_user", ["ownerKey", "entityId", "userId"])
  .index("by_owner_entity_updated", ["ownerKey", "entityId", "updatedAt"])
  .index("by_user_updated", ["userId", "updatedAt"]);

export const productEntityWorkspaceInvites = defineTable({
  ownerKey: v.string(),
  entityId: v.id("productEntities"),
  entitySlug: v.string(),
  email: v.string(),
  normalizedEmail: v.string(),
  token: v.string(),
  access: productWorkspaceShareAccessValidator,
  status: productWorkspaceInviteStatusValidator,
  invitedByUserId: v.optional(v.id("users")),
  acceptedByUserId: v.optional(v.id("users")),
  revokedAt: v.optional(v.number()),
  expiresAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
  acceptedAt: v.optional(v.number()),
})
  .index("by_token", ["token"])
  .index("by_owner_entity_email", ["ownerKey", "entityId", "normalizedEmail", "updatedAt"])
  .index("by_owner_entity_updated", ["ownerKey", "entityId", "updatedAt"]);

export const productEntityRelations = defineTable({
  ownerKey: v.string(),
  fromEntitySlug: v.string(),
  toEntitySlug: v.string(),
  relation: v.string(),
  summary: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_owner_from", ["ownerKey", "fromEntitySlug"])
  .index("by_owner_to", ["ownerKey", "toEntitySlug"])
  .index("by_owner_pair", ["ownerKey", "fromEntitySlug", "toEntitySlug"]);

export const productDocuments = defineTable({
  ownerKey: v.string(),
  kind: productDocumentKindValidator,
  title: v.string(),
  entityId: v.optional(v.id("productEntities")),
  entitySlug: v.optional(v.string()),
  linkedReportId: v.optional(v.id("productReports")),
  markdown: v.string(),
  plainText: v.string(),
  lexicalState: v.optional(v.any()),
  latestRevision: v.number(),
  latestSnapshotId: v.optional(v.id("productDocumentSnapshots")),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_owner_updated", ["ownerKey", "updatedAt"])
  .index("by_owner_entity_kind", ["ownerKey", "entitySlug", "kind"])
  .index("by_owner_report_kind", ["ownerKey", "linkedReportId", "kind"]);

export const productDocumentBlocks = defineTable({
  ownerKey: v.string(),
  documentId: v.id("productDocuments"),
  blockId: v.string(),
  parentBlockId: v.optional(v.string()),
  order: v.number(),
  type: productDocumentBlockTypeValidator,
  depth: v.optional(v.number()),
  text: v.string(),
  markdown: v.optional(v.string()),
  lexical: v.optional(v.any()),
  entityRefs: v.optional(v.array(v.string())),
  sourceRefs: v.optional(v.array(v.string())),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_document_order", ["documentId", "order"])
  .index("by_owner_document", ["ownerKey", "documentId"]);

export const productDocumentEntityLinks = defineTable({
  ownerKey: v.string(),
  documentId: v.id("productDocuments"),
  blockId: v.optional(v.string()),
  entitySlug: v.string(),
  relation: v.union(v.literal("primary"), v.literal("mention")),
  createdAt: v.number(),
})
  .index("by_document", ["documentId"])
  .index("by_entity_slug", ["entitySlug"]);

export const productDocumentSourceLinks = defineTable({
  ownerKey: v.string(),
  documentId: v.id("productDocuments"),
  blockId: v.optional(v.string()),
  evidenceId: v.id("productEvidenceItems"),
  createdAt: v.number(),
})
  .index("by_document", ["documentId"])
  .index("by_evidence", ["evidenceId"]);

export const productDocumentEvents = defineTable({
  ownerKey: v.string(),
  documentId: v.id("productDocuments"),
  type: v.union(
    v.literal("created"),
    v.literal("edited"),
    v.literal("snapshot"),
    v.literal("imported"),
    v.literal("exported"),
  ),
  label: v.string(),
  summary: v.optional(v.string()),
  metadata: v.optional(v.any()),
  createdAt: v.number(),
})
  .index("by_document_created", ["documentId", "createdAt"])
  .index("by_owner_created", ["ownerKey", "createdAt"]);

export const productDocumentSnapshots = defineTable({
  ownerKey: v.string(),
  documentId: v.id("productDocuments"),
  revision: v.number(),
  markdown: v.string(),
  plainText: v.string(),
  lexicalState: v.optional(v.any()),
  blockCount: v.number(),
  summary: v.string(),
  createdAt: v.number(),
})
  .index("by_document_revision", ["documentId", "revision"])
  .index("by_owner_created", ["ownerKey", "createdAt"]);

export const productReports = defineTable({
  ownerKey: v.string(),
  sessionId: v.optional(v.id("productChatSessions")),
  bundleId: v.optional(v.id("productInputBundles")),
  legacyDocumentId: v.optional(v.id("documents")),
  entityId: v.optional(v.id("productEntities")),
  entitySlug: v.optional(v.string()),
  title: v.string(),
  type: v.string(),
  summary: v.string(),
  status: v.union(
    v.literal("draft"),
    v.literal("saved"),
    v.literal("archived"),
  ),
  primaryEntity: v.optional(v.string()),
  lens: productLensValidator,
  query: v.string(),
  routing: v.optional(productRoutingDecisionValidator),
  operatorContext: v.optional(productOperatorContextSnapshotValidator),
  sections: v.array(productReportSectionValidator),
  sources: v.array(productSourceValidator),
  evidenceItemIds: v.array(v.id("productEvidenceItems")),
  revision: v.optional(v.number()),
  previousReportId: v.optional(v.id("productReports")),
  pinned: v.boolean(),
  visibility: v.union(
    v.literal("private"),
    v.literal("workspace"),
    v.literal("public"),
  ),
  lastRefreshAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_owner_updated", ["ownerKey", "updatedAt"])
  .index("by_owner_pinned", ["ownerKey", "pinned"])
  .index("by_owner_legacy_document", ["ownerKey", "legacyDocumentId"])
  .index("by_owner_session", ["ownerKey", "sessionId"])
  .index("by_owner_entity_updated", ["ownerKey", "entitySlug", "updatedAt"]);

export const productReportRefreshes = defineTable({
  ownerKey: v.string(),
  reportId: v.id("productReports"),
  status: v.union(
    v.literal("queued"),
    v.literal("running"),
    v.literal("complete"),
    v.literal("error"),
  ),
  triggeredBy: v.union(
    v.literal("user"),
    v.literal("nudge"),
    v.literal("system"),
  ),
  summary: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_report_created", ["reportId", "createdAt"])
  .index("by_owner_created", ["ownerKey", "createdAt"]);

export const productNudgeTypeValidator = v.union(
  v.literal("follow_up_due"),
  v.literal("new_source_found"),
  v.literal("report_changed"),
  v.literal("saved_watch_item_changed"),
  v.literal("connector_message_detected"),
  v.literal("cron_summary"),
  v.literal("reply_draft_ready"),
  v.literal("refresh_recommended"),
);

export const productNudges = defineTable({
  ownerKey: v.string(),
  type: productNudgeTypeValidator,
  title: v.string(),
  summary: v.string(),
  linkedReportId: v.optional(v.id("productReports")),
  linkedChatSessionId: v.optional(v.id("productChatSessions")),
  linkedChannel: v.optional(v.string()),
  status: v.union(
    v.literal("open"),
    v.literal("snoozed"),
    v.literal("done"),
  ),
  priority: v.union(
    v.literal("low"),
    v.literal("medium"),
    v.literal("high"),
  ),
  dueAt: v.optional(v.number()),
  actionLabel: v.string(),
  actionTargetSurface: v.optional(v.string()),
  actionTargetId: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_owner_status_updated", ["ownerKey", "status", "updatedAt"])
  .index("by_owner_due", ["ownerKey", "dueAt"])
  .index("by_owner_report", ["ownerKey", "linkedReportId"]);

export const productProfileSummaries = defineTable({
  ownerKey: v.string(),
  backgroundSummary: v.string(),
  preferredLens: productLensValidator,
  rolesOfInterest: v.array(v.string()),
  location: v.optional(v.string()),
  preferences: v.optional(v.any()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_owner", ["ownerKey"]);

export const productContextItems = defineTable({
  ownerKey: v.string(),
  type: v.union(
    v.literal("company"),
    v.literal("person"),
    v.literal("role"),
    v.literal("note"),
    v.literal("report"),
    v.literal("file"),
    v.literal("preference"),
    v.literal("observation"),
    v.literal("question"),
    v.literal("action"),
  ),
  title: v.string(),
  summary: v.string(),
  tags: v.array(v.string()),
  entity: v.optional(v.string()),
  linkedReportId: v.optional(v.id("productReports")),
  legacyFileId: v.optional(v.id("files")),
  legacyDocumentId: v.optional(v.id("documents")),
  permissions: v.object({
    chat: v.boolean(),
    reports: v.boolean(),
    nudges: v.boolean(),
  }),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_owner_updated", ["ownerKey", "updatedAt"])
  .index("by_owner_type", ["ownerKey", "type"])
  .index("by_owner_entity", ["ownerKey", "entity"])
  .index("by_owner_legacy_file", ["ownerKey", "legacyFileId"])
  .index("by_owner_legacy_document", ["ownerKey", "legacyDocumentId"])
  .index("by_owner_linked_report", ["ownerKey", "linkedReportId"]);

// ──────────────────────────────────────────────────────────────────────────
// Block model (Phase 1 of Ideaflow/Mew-inspired notebook)
// Inspired by Mew's graph_node + relation_lists with fractional indexing.
// See docs/architecture/IDEAFLOW_BLOCK_NOTEBOOK_ULTRAPLAN.md
// ──────────────────────────────────────────────────────────────────────────

export const productBlockKindValidator = v.union(
  v.literal("text"),
  v.literal("heading_1"),
  v.literal("heading_2"),
  v.literal("heading_3"),
  v.literal("bullet"),
  v.literal("todo"),
  v.literal("quote"),
  v.literal("callout"),
  v.literal("code"),
  v.literal("image"),
  v.literal("evidence"),
  v.literal("mention"),
  v.literal("generated_marker"),
);

export const productBlockChipValidator = v.object({
  type: v.union(
    v.literal("text"),
    v.literal("mention"),
    v.literal("link"),
    v.literal("linebreak"),
    v.literal("image"),
  ),
  value: v.string(),
  url: v.optional(v.string()),
  // Bitmap: 1=bold, 2=italic, 4=underline, 8=strike, 16=code. Combinable.
  styles: v.optional(v.number()),
  mentionTrigger: v.optional(v.string()), // "@", "#", "<>", "/ai", etc.
  mentionTarget: v.optional(v.string()),
});

export const productBlockAuthorKindValidator = v.union(
  v.literal("user"),
  v.literal("agent"),
  v.literal("anonymous"),
);

export const productBlockAccessValidator = v.union(
  v.literal("read"),
  v.literal("append"),
  v.literal("edit"),
);

export const productBlocks = defineTable({
  ownerKey: v.string(),
  entityId: v.id("productEntities"),
  parentBlockId: v.optional(v.id("productBlocks")),
  kind: productBlockKindValidator,
  authorKind: productBlockAuthorKindValidator,
  authorId: v.optional(v.string()),
  content: v.array(productBlockChipValidator),
  // Fractional indexing — never re-indexed; inserts use generateKeyBetween.
  positionInt: v.number(),
  positionFrac: v.string(),
  isChecked: v.optional(v.boolean()),
  accessMode: productBlockAccessValidator,
  isPublic: v.boolean(),
  // Link back to the agent run that produced this block (if agent-authored).
  sourceSessionId: v.optional(v.id("productChatSessions")),
  sourceToolStep: v.optional(v.number()),
  sourceRefIds: v.optional(v.array(v.string())),
  attributes: v.optional(v.any()),
  // Google Docs-style revision chain — previous incarnation if this block was rewritten.
  previousBlockId: v.optional(v.id("productBlocks")),
  revision: v.number(),
  deletedAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_entity_position", ["entityId", "parentBlockId", "positionInt", "positionFrac"])
  .index("by_owner_entity", ["ownerKey", "entityId"])
  .index("by_owner_entity_position", ["ownerKey", "entityId", "positionInt", "positionFrac"])
  .index("by_owner_entity_parent_position", ["ownerKey", "entityId", "parentBlockId", "positionInt", "positionFrac"])
  .index("by_entity_author_updated", ["entityId", "authorKind", "updatedAt"])
  .index("by_session_step", ["sourceSessionId", "sourceToolStep"])
  .index("by_previous", ["previousBlockId"]);

export const productBlockRelationKindValidator = v.union(
  v.literal("mention"),
  v.literal("tag"),
  v.literal("evidence"),
  v.literal("derived_from"),
  v.literal("response_to"),
  v.literal("custom"),
);

export const productBlockRelations = defineTable({
  ownerKey: v.string(),
  fromBlockId: v.id("productBlocks"),
  toEntityId: v.optional(v.id("productEntities")),
  toBlockId: v.optional(v.id("productBlocks")),
  toUrl: v.optional(v.string()),
  relationKind: productBlockRelationKindValidator,
  relationLabel: v.optional(v.string()),
  authorKind: productBlockAuthorKindValidator,
  authorId: v.optional(v.string()),
  createdAt: v.number(),
})
  .index("by_owner_from", ["ownerKey", "fromBlockId"])
  .index("by_owner_entity", ["ownerKey", "toEntityId"])
  .index("by_owner_block", ["ownerKey", "toBlockId"])
  .index("by_owner_url", ["ownerKey", "toUrl"]);

export const productBlockWriteWindows = defineTable({
  ownerKey: v.string(),
  sessionKey: v.string(),
  actorKey: v.optional(v.string()),
  bucketStartMs: v.number(),
  shard: v.optional(v.number()),
  writeCount: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_owner_session_bucket", ["ownerKey", "sessionKey", "bucketStartMs"])
  .index("by_owner_session_actor_bucket", ["ownerKey", "sessionKey", "actorKey", "bucketStartMs"]);

/**
 * productNudgeSubscriptions — "track this entity" subscriptions.
 *
 * Closes framework audit violation #5 (TRANSITION Report → Nudge).
 * One row per (ownerKey, entityId) subscription. A Convex cron scans
 * subscriptions every N minutes, diffs the entity's most-recent block
 * updatedAt against `lastNotifiedAt`, and when newer agent-authored
 * content exists, dispatches a single ntfy message and updates the
 * timestamp. No duplicate dispatch without new content.
 *
 * Per-user rate limit lives on the subscription row (minIntervalMs)
 * so an aggressive writer never storms a subscriber.
 */
export const productNudgeSubscriptions = defineTable({
  ownerKey: v.string(),
  entityId: v.id("productEntities"),
  entitySlug: v.string(),
  entityName: v.string(),
  // "ntfy" today; extensible to email / slack / webhook later. Dispatch
  // path resolves the destination from productProfileSummaries.
  channel: v.union(v.literal("ntfy"), v.literal("email"), v.literal("slack")),
  // When the user last reset their subscription (used for "since when").
  createdAt: v.number(),
  updatedAt: v.number(),
  // Last time the dispatcher fired for this subscription. Initialized to
  // createdAt so the first run doesn't replay every pre-subscription edit.
  lastNotifiedAt: v.number(),
  // Minimum gap between dispatches for THIS subscription. Prevents a
  // prolific agent from paging the subscriber more than once per window.
  minIntervalMs: v.optional(v.number()),
  // Optional dispatch target override (e.g. a per-user ntfy topic).
  // When null, dispatcher falls back to the system OPS_NTFY_URL env.
  ntfyUrl: v.optional(v.string()),
})
  // Primary lookup: "is this user subscribed to this entity?"
  .index("by_owner_entity", ["ownerKey", "entityId"])
  // Secondary lookup: "list all my subscriptions" — sorted by updatedAt.
  .index("by_owner_updated", ["ownerKey", "updatedAt"])
  // Dispatcher lookup: "which subscriptions haven't been checked recently?"
  .index("by_last_notified", ["lastNotifiedAt"]);
